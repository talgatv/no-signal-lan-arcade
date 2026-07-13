/**
 * Gem Swap — solo match-3 puzzle (OGH).
 *
 * Architecture: the board is a fixed logical-pixel grid of persistent DOM
 * elements (one per gem, plus one static background cell per grid slot),
 * positioned with `transform: translate()`. A CSS transition on that
 * transform (see style.css .gs-gem) means every state-driven move — a
 * swap, a snap-back, a gravity fall, even the very first deal — animates
 * for free, exactly the same "state drives position, the browser
 * interpolates" idea as games/solitaire's card layout. New gems (a mid-
 * game refill, or the initial/reshuffle deal) use the same two-step trick
 * solitaire's initial deal relies on: set the *starting* position, force a
 * synchronous reflow (`void board.offsetHeight`) so the browser commits
 * that as a real rendered frame, *then* set the final position — without
 * the forced reflow, both writes would land in the same task and the
 * element would just appear at its final spot with no animation at all.
 *
 * Game logic (matching, specials, gravity, deadlock detection) lives in
 * board.js as pure functions over a plain `grid` array; this file owns
 * timing, DOM, input, sound and i18n. The full swap -> match -> clear ->
 * fall -> cascade pipeline is one `async` function (resolveLoop) that
 * awaits a `wait(ms)` helper between phases — each `ms` matches (or
 * slightly exceeds) the CSS transition/animation duration actually in
 * flight, so by the time the next phase reads the grid, the previous
 * phase's motion has visually finished.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import {
  ROWS, COLS, TYPES, SPECIAL_BOMB,
  isAdjacent, findRuns, hasAnyValidMove, generateBoard,
  resolveStep, applyGravity, bombSwapCells, makeGem, cloneGrid,
} from './board.js';
import { gemMarkup } from './gems.js';

const $ = (id) => document.getElementById(id);
const GAME_ID = 'gem-swap';

/* ------------------------------------------------------------------------ *
 * Tunables — the "feel" of the game lives here.
 * ------------------------------------------------------------------------ */
const CELL = 56; // logical px per grid cell
const GAP = 4; // visual gap between cells/gems
const BOARD_PAD = 12;
const BOARD_W = COLS * CELL + BOARD_PAD * 2;
const BOARD_H = ROWS * CELL + BOARD_PAD * 2;

const MOVE_LIMIT = 25;

const SWAP_MS = 170;
const INVALID_HOLD_MS = 140;
const CLEAR_MS = 260;
const FALL_MS_BASE = 210;
const FALL_MS_PER_ROW = 55;
const FALL_MS_MAX = 620;

const SCORE_PER_GEM = 10;
const SPECIAL_CREATE_BONUS = 50;
const BOMB_ACTIVATE_BONUS = 100;
const COMBO_MULT_CAP = 10;

const DRAG_THRESHOLD_PX = 10;

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function fallDurationFor(distanceRows) {
  return Math.min(FALL_MS_MAX, FALL_MS_BASE + Math.max(0, distanceRows) * FALL_MS_PER_ROW);
}

const sfx = createOghSfx();

/* ------------------------------------------------------------------------ *
 * DOM refs
 * ------------------------------------------------------------------------ */
const board = $('board');
const stage = document.querySelector('.gs-stage');
const overlay = $('overlay');
const startCard = $('startCard');
const resultCard = $('resultCard');
const legendEl = $('legend');
const comboBannerEl = $('comboBanner');
const reshuffleBannerEl = $('reshuffleBanner');

/* ------------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------------ */
let lang = detectLang();
let idCounter = 1;
function nextId() { return idCounter++; }

/** @type {any[][]} */
let grid = null;
const gemEls = new Map(); // gem id -> element
const cellEls = []; // [row][col] -> background cell element

const state = {
  mode: 'title', // title | play | over
  busy: false,
  score: 0,
  best: 0,
  isNewBest: false,
  movesLeft: MOVE_LIMIT,
  selected: null, // {r,c}
};

/* ------------------------------------------------------------------------ *
 * Layout helpers — logical-px slot for a (row,col), and fit-to-viewport
 * scaling of the whole board (games/solitaire's .sol-board approach).
 * ------------------------------------------------------------------------ */
function slotX(col) { return BOARD_PAD + col * CELL + GAP / 2; }
function slotY(row) { return BOARD_PAD + row * CELL + GAP / 2; }

let currentScale = 1;
function fitBoard() {
  const availW = stage.clientWidth;
  const availH = stage.clientHeight;
  if (!availW || !availH) return;
  currentScale = Math.min(availW / BOARD_W, availH / BOARD_H, 1.6) * 0.96;
  board.style.transform = `scale(${currentScale})`;
}

/* ------------------------------------------------------------------------ *
 * Static grid-cell backgrounds — built once, never rebuilt.
 * ------------------------------------------------------------------------ */
function buildCellsDom() {
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'gs-cell';
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      cell.style.width = `${CELL - GAP}px`;
      cell.style.height = `${CELL - GAP}px`;
      cell.style.transform = `translate(${slotX(c)}px, ${slotY(r)}px)`;
      board.appendChild(cell);
      row.push(cell);
    }
    cellEls.push(row);
  }
}

let armedCell = null;
function setArmed(cell) {
  if (armedCell && (!cell || armedCell.r !== cell.r || armedCell.c !== cell.c)) {
    cellEls[armedCell.r][armedCell.c].classList.remove('is-armed');
    armedCell = null;
  }
  if (cell && !armedCell) {
    cellEls[cell.r][cell.c].classList.add('is-armed');
    armedCell = cell;
  }
}
function clearArmed() { setArmed(null); }

/* ------------------------------------------------------------------------ *
 * Gem DOM elements — one persistent element per live gem, keyed by id.
 * ------------------------------------------------------------------------ */
function applyGemVisual(el, gem) {
  const special = gem.special || '';
  if (el.dataset.type === gem.type && el.dataset.special === special) return;
  el.dataset.type = gem.type;
  el.dataset.special = special;
  el.firstChild.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">${gemMarkup(gem.type, gem.special)}</svg>`;
}

function createGemEl(gem) {
  const el = document.createElement('div');
  el.className = 'gs-gem';
  el.style.width = `${CELL - GAP}px`;
  el.style.height = `${CELL - GAP}px`;
  const inner = document.createElement('div');
  inner.className = 'gs-gem-inner';
  el.appendChild(inner);
  board.appendChild(el);
  gemEls.set(gem.id, el);
  applyGemVisual(el, gem);
  return el;
}

function moveGemTo(el, row, col, { falling = false, durationMs = null } = {}) {
  el.dataset.row = String(row);
  el.dataset.col = String(col);
  el.classList.toggle('is-falling', falling);
  el.style.transitionDuration = durationMs != null ? `${durationMs}ms` : '';
  el.style.transform = `translate(${slotX(col)}px, ${slotY(row)}px)`;
}

function removeAllGemEls() {
  for (const el of gemEls.values()) el.remove();
  gemEls.clear();
}

/** Both swapped cells' elements, resolved by id from the (already-swapped)
 * grid, moved to their new slots — reused identically for the initial
 * swap-toward and, if invalid, the swap-back. */
function animateSwap(a, b, durationMs = SWAP_MS) {
  const gemAtA = grid[a.r][a.c];
  const gemAtB = grid[b.r][b.c];
  const elForA = gemEls.get(gemAtA.id);
  const elForB = gemEls.get(gemAtB.id);
  moveGemTo(elForA, a.r, a.c, { durationMs });
  moveGemTo(elForB, b.r, b.c, { durationMs });
}

/** Place every gem in `newGrid` fresh, all starting stacked exactly one
 * board-height above their final slot (see applyGravity's header comment
 * for why a uniform start offset gives every gem the same fall distance
 * and they arrive in lockstep) and animate them dropping in. Returns the
 * fall duration so the caller can await it. */
function waterfallInGrid(newGrid) {
  grid = newGrid;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const el = createGemEl(grid[r][c]);
      moveGemTo(el, r - ROWS, c, {});
    }
  }
  void board.offsetHeight; // commit the off-board start position (see file header)
  const dur = fallDurationFor(ROWS);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      moveGemTo(gemEls.get(grid[r][c].id), r, c, { falling: true, durationMs: dur });
    }
  }
  return dur;
}

/** New gems from an applyGravity() call start stacked above the board
 * (per-column, staggered by how short that column was); survivors just
 * move from their previous row. Returns the longest fall duration in
 * flight, for the caller to await. */
function animateGravity(events) {
  for (const ev of events) {
    if (ev.isNew) {
      const gem = grid[ev.toRow][ev.col];
      const el = createGemEl(gem);
      moveGemTo(el, ev.fromRow, ev.col, {});
    }
  }
  void board.offsetHeight; // commit new gems' off-board start position (see file header)
  let maxDur = 0;
  for (const ev of events) {
    const el = gemEls.get(ev.id);
    const dur = fallDurationFor(ev.toRow - ev.fromRow);
    maxDur = Math.max(maxDur, dur);
    moveGemTo(el, ev.toRow, ev.col, { falling: true, durationMs: dur });
  }
  return maxDur;
}

/* ------------------------------------------------------------------------ *
 * Clear / special-spawn visuals
 * ------------------------------------------------------------------------ */
function renderClearVisuals(result) {
  for (const cell of result.clearedCells) {
    const el = gemEls.get(cell.id);
    if (el) el.classList.add('is-clearing');
  }
  for (const spawn of result.specialSpawns) {
    const el = gemEls.get(spawn.id);
    if (!el) continue;
    applyGemVisual(el, grid[spawn.r][spawn.c]); // resolveStep already mutated the grid to the special
    el.classList.add('is-spawning-special');
    setTimeout(() => el.classList.remove('is-spawning-special'), 450);
  }
}

function removeClearedEls(clearedCells) {
  for (const cell of clearedCells) {
    const el = gemEls.get(cell.id);
    if (el) { el.remove(); gemEls.delete(cell.id); }
  }
}

/* ------------------------------------------------------------------------ *
 * Floating "+score" popups + combo/reshuffle banners
 * ------------------------------------------------------------------------ */
function spawnScoreFloater(result, pts) {
  if (!result.clearedCells.length || pts <= 0) return;
  let sx = 0;
  let sy = 0;
  for (const cell of result.clearedCells) {
    sx += slotX(cell.c) + (CELL - GAP) / 2;
    sy += slotY(cell.r) + (CELL - GAP) / 2;
  }
  const n = result.clearedCells.length;
  const f = document.createElement('div');
  f.className = 'gs-float';
  f.textContent = `+${pts}`;
  f.style.transform = `translate(${sx / n}px, ${sy / n}px)`;
  board.appendChild(f);
  f.addEventListener('animationend', () => f.remove(), { once: true });
}

function showBanner(el, text) {
  el.textContent = text;
  el.classList.remove('is-showing');
  void el.offsetWidth; // restart the animation even on rapid repeat triggers
  el.classList.add('is-showing');
}

/* ------------------------------------------------------------------------ *
 * HUD
 * ------------------------------------------------------------------------ */
function updateHudScore() { $('hudScoreVal').textContent = String(state.score); }
function updateHudMoves() {
  $('hudMovesVal').textContent = String(state.movesLeft);
  $('hudMoves').classList.toggle('is-low', state.movesLeft > 0 && state.movesLeft <= 5);
}

/* ------------------------------------------------------------------------ *
 * Sound per resolution step. Every category the task asks for gets a
 * distinct cue: swap='tap', invalid='screech' (an abrupt reversal already
 * reads as a "screech" — no need for a dedicated buzz pattern), a plain
 * match='pickup', a cascade step='chain' (new), a row/col sweep='whoosh',
 * a bomb activation='boom' (new), and creating a special layers a quick
 * 'win' shortly after so it doesn't mask the primary cue.
 * ------------------------------------------------------------------------ */
function playStepSfx(result, comboStep) {
  if (result.bombsActivated > 0) sfx.play('boom');
  else if (result.rowColActivated > 0) sfx.play('whoosh');
  else if (comboStep > 1) sfx.play('chain');
  else sfx.play('pickup');
  if (result.specialSpawns.length > 0) setTimeout(() => sfx.play('win'), 90);
}

/* ------------------------------------------------------------------------ *
 * Resolution pipeline — swap -> match -> clear -> fall -> cascade.
 * ------------------------------------------------------------------------ */
function scoreStep(result, comboStep) {
  const mult = Math.min(COMBO_MULT_CAP, comboStep);
  let pts = result.clearedCells.length * SCORE_PER_GEM * mult;
  pts += result.specialSpawns.length * SPECIAL_CREATE_BONUS;
  pts += result.bombsActivated * BOMB_ACTIVATE_BONUS;
  state.score += pts;
  updateHudScore();
  spawnScoreFloater(result, pts);
  return pts;
}

async function resolveLoop(seed, comboStep) {
  const result = resolveStep(grid, seed);
  if (!result.clearedCells.length && !result.specialSpawns.length) return;

  scoreStep(result, comboStep);
  renderClearVisuals(result);
  playStepSfx(result, comboStep);
  if (comboStep > 1) showBanner(comboBannerEl, t(lang, 'comboLabel', { n: comboStep }));

  await wait(CLEAR_MS);
  removeClearedEls(result.clearedCells);

  const events = applyGravity(grid, nextId);
  const fallDur = animateGravity(events);
  await wait(fallDur + 30);

  const nextRuns = findRuns(grid);
  if (nextRuns.length > 0) {
    await resolveLoop({ runs: nextRuns, preferredCells: [] }, comboStep + 1);
  }
}

async function doReshuffle() {
  showBanner(reshuffleBannerEl, t(lang, 'reshuffleMsg'));
  sfx.play('tick');
  for (const el of gemEls.values()) el.classList.add('is-clearing');
  await wait(CLEAR_MS);
  removeAllGemEls();
  const dur = waterfallInGrid(generateBoard(nextId));
  await wait(dur + 40);
}

async function afterResolution() {
  if (!hasAnyValidMove(grid)) await doReshuffle();
  if (state.movesLeft <= 0) {
    endSession();
    return;
  }
  state.busy = false;
}

async function attemptSwap(a, b) {
  if (state.mode !== 'play' || state.busy) return;
  if (!isAdjacent(a, b)) return;
  const gemA = grid[a.r][a.c];
  const gemB = grid[b.r][b.c];
  if (!gemA || !gemB) return;

  state.busy = true;
  clearSelection();
  clearArmed();
  sfx.play('tap');

  grid[a.r][a.c] = gemB;
  grid[b.r][b.c] = gemA;
  animateSwap(a, b);
  await wait(SWAP_MS);

  const bombInvolved = gemA.special === SPECIAL_BOMB || gemB.special === SPECIAL_BOMB;
  const runs = bombInvolved ? [] : findRuns(grid);

  if (!bombInvolved && runs.length === 0) {
    // Data stays in the (invalid) swapped state for the hold — matching
    // what's on screen — and only reverts right as the snap-back animation
    // starts, so grid and DOM are never out of sync with each other even
    // transiently (nothing reads grid mid-hold today since input is
    // blocked by state.busy regardless, but keeping them consistent avoids
    // a footgun for any future code path that does).
    sfx.play('screech');
    await wait(INVALID_HOLD_MS);
    grid[a.r][a.c] = gemA;
    grid[b.r][b.c] = gemB;
    animateSwap(a, b);
    await wait(SWAP_MS);
    state.busy = false;
    return;
  }

  state.movesLeft = Math.max(0, state.movesLeft - 1);
  updateHudMoves();

  if (bombInvolved) {
    // gemA/gemB are pre-swap references; whichever WAS the bomb now sits
    // at the *other* cell post-swap (they were exchanged above).
    const bombCell = gemA.special === SPECIAL_BOMB ? b : a;
    const partnerCell = gemA.special === SPECIAL_BOMB ? a : b;
    const initialCells = bombSwapCells(grid, bombCell, partnerCell);
    await resolveLoop({ initialCells, preferredCells: [a, b] }, 1);
  } else {
    await resolveLoop({ runs, preferredCells: [a, b] }, 1);
  }

  await afterResolution();
}

/* ------------------------------------------------------------------------ *
 * Session lifecycle
 * ------------------------------------------------------------------------ */
function loadBest() {
  const saved = OGHProfile.getProgress(GAME_ID);
  const n = Number(saved?.best);
  return Number.isFinite(n) ? n : 0;
}
function persistBest() {
  OGHProfile.saveProgress(GAME_ID, { best: state.best }, { label: 'Gem Swap', summary: `Best ${state.best}` });
}

function startSession() {
  removeAllGemEls();
  state.mode = 'play';
  state.busy = true; // released once the opening deal settles
  state.score = 0;
  state.movesLeft = MOVE_LIMIT;
  state.isNewBest = false;
  clearSelection();
  updateHudScore();
  updateHudMoves();
  overlay.hidden = true;
  const dur = waterfallInGrid(generateBoard(nextId));
  setTimeout(() => { state.busy = false; }, dur + 40);
}

function endSession() {
  state.mode = 'over';
  state.busy = false;
  state.isNewBest = state.score > state.best;
  if (state.isNewBest) {
    state.best = state.score;
    persistBest();
  }
  startCard.hidden = true;
  resultCard.hidden = false;
  overlay.hidden = false;
  renderResult();
  sfx.play('win');
}

/* ------------------------------------------------------------------------ *
 * Selection (tap-to-select-then-tap-adjacent)
 * ------------------------------------------------------------------------ */
function selectCell(cell) {
  state.selected = cell;
  const gem = grid[cell.r][cell.c];
  const el = gem && gemEls.get(gem.id);
  if (el) el.classList.add('is-selected');
}

function clearSelection() {
  if (state.selected) {
    const gem = grid[state.selected.r][state.selected.c];
    const el = gem && gemEls.get(gem.id);
    if (el) el.classList.remove('is-selected');
  }
  state.selected = null;
}

function handleTap(cell) {
  if (state.mode !== 'play' || state.busy) return;
  if (state.selected) {
    if (state.selected.r === cell.r && state.selected.c === cell.c) {
      clearSelection();
      return;
    }
    if (isAdjacent(state.selected, cell)) {
      const a = state.selected;
      clearSelection();
      attemptSwap(a, cell);
      return;
    }
    clearSelection();
    selectCell(cell);
    return;
  }
  selectCell(cell);
}

/* ------------------------------------------------------------------------ *
 * Pointer input — one gesture state machine drives both drag-to-swap and
 * tap-to-select-then-tap-adjacent (games/solitaire's precedent: a press
 * under DRAG_THRESHOLD_PX that releases is a tap; past the threshold it
 * becomes a drag). A drag locks onto whichever axis has the larger
 * movement, clamps the dragged gem's visual follow to at most one cell in
 * that direction, and arms the neighbor cell it would land on; release
 * commits attemptSwap() if a direction was armed, else snaps back.
 * ------------------------------------------------------------------------ */
function resolveCellFromPoint(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  const hit = el && el.closest ? el.closest('[data-row]') : null;
  if (!hit || !board.contains(hit)) return null;
  return { r: Number(hit.dataset.row), c: Number(hit.dataset.col) };
}

function neighborCell(origin, dr, dc) {
  const r = origin.r + dr;
  const c = origin.c + dc;
  return r >= 0 && r < ROWS && c >= 0 && c < COLS ? { r, c } : null;
}

let gesture = null;

function cancelGesture() {
  if (gesture && gesture.el) {
    gesture.el.classList.remove('is-dragging');
    if (gesture.moved) moveGemTo(gesture.el, gesture.origin.r, gesture.origin.c, {});
  }
  clearArmed();
  gesture = null;
}

function onPointerDown(e) {
  if (gesture) return;
  if (e.button != null && e.button !== 0) return;
  if (state.mode !== 'play' || state.busy) return;
  const cell = resolveCellFromPoint(e.clientX, e.clientY);
  if (!cell) return;
  const gem = grid[cell.r][cell.c];
  gesture = {
    pointerId: e.pointerId,
    origin: cell,
    startX: e.clientX,
    startY: e.clientY,
    moved: false,
    target: null,
    el: gem ? gemEls.get(gem.id) : null,
  };
}

function onPointerMove(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  const dx = (e.clientX - gesture.startX) / currentScale;
  const dy = (e.clientY - gesture.startY) / currentScale;

  if (!gesture.moved) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    gesture.moved = true;
    if (gesture.el) gesture.el.classList.add('is-dragging');
  }
  if (!gesture.el) return;

  let target = null;
  let ox = 0;
  let oy = 0;
  if (Math.abs(dx) >= Math.abs(dy)) {
    target = neighborCell(gesture.origin, 0, dx > 0 ? 1 : -1);
    ox = Math.max(-CELL, Math.min(CELL, dx));
  } else {
    target = neighborCell(gesture.origin, dy > 0 ? 1 : -1, 0);
    oy = Math.max(-CELL, Math.min(CELL, dy));
  }
  gesture.target = target;
  gesture.el.style.transform = `translate(${slotX(gesture.origin.c) + ox}px, ${slotY(gesture.origin.r) + oy}px)`;
  setArmed(target);
}

function onPointerUp(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  const g = gesture;
  gesture = null;
  clearArmed();

  if (!g.moved) {
    handleTap(g.origin);
    return;
  }
  if (g.el) g.el.classList.remove('is-dragging');
  if (g.target) attemptSwap(g.origin, g.target);
  else if (g.el) moveGemTo(g.el, g.origin.r, g.origin.c, {});
}

function onPointerCancelEvt(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  cancelGesture();
}

/* ------------------------------------------------------------------------ *
 * Legend (start card) — small live icons via the same gemMarkup as the
 * board, so the legend always matches the real shapes/colors exactly.
 * ------------------------------------------------------------------------ */
function buildLegend() {
  const items = [
    { type: 'circle', special: null, key: 'legendMatch3' },
    { type: 'square', special: 'row', key: 'legendMatch4' },
    { type: 'diamond', special: 'bomb', key: 'legendMatch5' },
    { type: 'star', special: 'bomb', key: 'legendBomb' },
  ];
  legendEl.innerHTML = '';
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'gs-legend-item';
    row.setAttribute('role', 'listitem');
    const icon = document.createElement('span');
    icon.className = 'gs-legend-icon';
    icon.dataset.type = item.special === 'bomb' ? 'bomb' : item.type;
    if (item.special && item.special !== 'bomb') icon.dataset.special = item.special;
    icon.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">${gemMarkup(item.type, item.special)}</svg>`;
    const txt = document.createElement('span');
    txt.textContent = t(lang, item.key);
    row.appendChild(icon);
    row.appendChild(txt);
    legendEl.appendChild(row);
  }
}

/* ------------------------------------------------------------------------ *
 * i18n wiring
 * ------------------------------------------------------------------------ */
function buildLangSwitch() {
  const wrap = $('langSwitch');
  wrap.innerHTML = '';
  LANGS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `lang-btn${l === lang ? ' is-on' : ''}`;
    b.textContent = LANG_LABELS[l];
    b.addEventListener('click', () => applyLang(l));
    wrap.appendChild(b);
  });
}

function renderBestLines() {
  const line = `${t(lang, 'bestLabel')}: ${state.best}`;
  $('bestLineStart').textContent = line;
  $('bestLineEnd').textContent = line;
}

function renderResult() {
  $('finalScoreLine').textContent = `${t(lang, 'finalScoreLabel')}: ${state.score}`;
  $('newBestLine').hidden = !state.isNewBest;
  renderBestLines();
}

function applyLang(l) {
  lang = l;
  applyStaticStrings(lang);
  document.title = `${t(lang, 'title')} — OGH`;
  buildLangSwitch();
  buildLegend();
  renderBestLines();
  if (state.mode === 'over') renderResult();
  rememberLang(lang);
  fitBoard();
}

/* ------------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------------ */
function init() {
  board.style.width = `${BOARD_W}px`;
  board.style.height = `${BOARD_H}px`;
  buildCellsDom();

  // Decorative idle board behind the start overlay, purely for a populated
  // first impression (title mode ignores all input, see onPointerDown).
  grid = generateBoard(nextId);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) moveGemTo(createGemEl(grid[r][c]), r, c, {});
  }

  state.best = loadBest();

  board.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancelEvt);

  $('btnStart').addEventListener('click', () => { sfx.unlock(); startSession(); });
  $('btnAgain').addEventListener('click', () => { sfx.unlock(); startSession(); });

  applyLang(lang);
  updateHudScore();
  updateHudMoves();

  if (typeof ResizeObserver === 'function') new ResizeObserver(fitBoard).observe(stage);
  window.addEventListener('resize', fitBoard);
  window.addEventListener('orientationchange', fitBoard);
  fitBoard();
  // The header's real height depends on its web fonts (Montserrat/JetBrains
  // Mono/Roboto), which finish loading asynchronously — a fitBoard() call
  // before they swap in measures a taller-than-final stage and can lock in
  // too generous a scale (nothing else re-triggers fitBoard() afterward,
  // since the fonts swapping in reflows the header without firing a resize
  // event or, if the ResizeObserver's own callback races the same swap,
  // reliably re-observing in time). document.fonts.ready resolves once
  // every font actually referenced on the page has loaded, so this always
  // lands on the true final layout — a real bug caught by comparing
  // fitBoard()'s live output against a manual re-check during testing, not
  // a hypothetical.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBoard);

  exposeTestHook();
}

/* ------------------------------------------------------------------------ *
 * Test / debug hook — same convention as games/solitaire's
 * window.OGH_SOLITAIRE and games/pop-the-bugs' window.OGH_POP_BUGS: lets
 * the automation harness (and devtools) inspect and drive the game
 * deterministically instead of hunting for a specific board state by eye.
 * ------------------------------------------------------------------------ */
function exposeTestHook() {
  window.OGH_GEM_SWAP = {
    state,
    ROWS,
    COLS,
    TYPES,
    CONFIG: { MOVE_LIMIT, SCORE_PER_GEM, SPECIAL_CREATE_BONUS, BOMB_ACTIVATE_BONUS },
    getGrid: () => cloneGrid(grid),
    getGridSummary() {
      return grid.map((row) => row.map((g) => (g ? `${g.type}${g.special ? `:${g.special}` : ''}` : '.')));
    },
    findRuns: () => findRuns(grid),
    hasAnyValidMove: () => hasAnyValidMove(grid),
    startSession,
    endSession,
    attemptSwap,
    fitBoard,
    /**
     * Force the live grid to an arbitrary arrangement for deterministic
     * testing (4/5-matches, cascades, deadlocks…). `cells` is a
     * ROWS x COLS array of {type, special?, bombColor?}; ids are minted
     * fresh. Snaps straight into place (no waterfall), switches to play
     * mode, and clears busy/selection state so a swap can be attempted
     * immediately afterward.
     */
    setGrid(cells) {
      cancelGesture();
      removeAllGemEls();
      const g = [];
      for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
          const src = cells[r][c];
          row.push(makeGem(nextId(), src.type, src.special || null, src.bombColor || null));
        }
        g.push(row);
      }
      grid = g;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) moveGemTo(createGemEl(grid[r][c]), r, c, {});
      }
      state.mode = 'play';
      state.busy = false;
      overlay.hidden = true;
      clearSelection();
    },
    /** A diagonal-stripe board (color = TYPES[(r+c)%TYPES.length]) — every
     * length-4 window of consecutive residues mod TYPES.length is
     * pairwise distinct, so no pre-existing run exists AND no single
     * adjacent swap can ever bring 3 alike together in any direction.
     * Provably deadlocked, not just "probably" — see board.js's
     * runLengthThrough for the check this relies on. */
    forceNoValidMoves() {
      const cells = [];
      for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) row.push({ type: TYPES[(r + c) % TYPES.length] });
        cells.push(row);
      }
      this.setGrid(cells);
      const stuck = !hasAnyValidMove(grid);
      if (!stuck) console.warn('[OGH_GEM_SWAP] forceNoValidMoves: board unexpectedly has a move');
      return stuck;
    },
    /** Re-run the post-resolution deadlock/session-end check on demand
     * (normally only reached at the end of attemptSwap). */
    triggerAfterResolutionCheck: () => afterResolution(),
  };
}

init();
