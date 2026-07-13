/**
 * app.js — Mahjong Solitaire: state, rendering, and input.
 *
 * Rendering architecture: all 136 tile <button> elements are built ONCE
 * (buildBoardOnce) at their fixed logical-pixel position (the layered
 * pyramid layout never changes) and kept for the whole session, keyed by
 * a stable slot id. render() never creates/destroys elements — it just
 * recomputes, for every slot, whether its tile is removed/free/selected
 * and updates classes + glyph text. Because slot geometry is fixed, "New
 * game" and "Shuffle" only ever change which TYPE occupies which slot and
 * which slots are currently removed — never position.
 *
 * Input: plain <button> elements + click listeners (fires uniformly for
 * mouse, touch, and keyboard Enter/Space) — no custom Pointer Events state
 * machine needed here, unlike games/solitaire's drag-capable cards, since
 * this genre is pure tap-to-select-then-tap-to-match (see the task's own
 * framing: "simpler than solitaire's drag-and-drop").
 */
import { ALL_SLOTS, BOARD_W, BOARD_H, pixelX, pixelY, isFreeGiven } from './layout.js';
import { TILE_TYPES } from './tiles.js';
import { buildDeal } from './deal.js';
import { LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings } from './i18n.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';

const sfx = createOghSfx();

// ---- DOM refs -------------------------------------------------------------
const board = document.getElementById('board');
const stage = document.querySelector('.mj-stage');
const tilesVal = document.getElementById('tilesVal');
const movesVal = document.getElementById('movesVal');
const timeVal = document.getElementById('timeVal');
const btnHint = document.getElementById('btnHint');
const btnUndo = document.getElementById('btnUndo');
const btnShuffle = document.getElementById('btnShuffle');
const btnNew = document.getElementById('btnNew');
const btnPlayAgain = document.getElementById('btnPlayAgain');
const btnDeadlockShuffle = document.getElementById('btnDeadlockShuffle');
const btnDeadlockRestart = document.getElementById('btnDeadlockRestart');
const btnDeadlockUndo = document.getElementById('btnDeadlockUndo');
const langSwitchEl = document.getElementById('langSwitch');
const winOverlay = document.getElementById('winOverlay');
const winStatsLine = document.getElementById('winStatsLine');
const deadlockOverlay = document.getElementById('deadlockOverlay');

// ---- persistent per-slot DOM elements --------------------------------
const tileEls = new Map(); // slotId -> HTMLButtonElement

function buildBoardOnce() {
  board.style.width = `${BOARD_W}px`;
  board.style.height = `${BOARD_H}px`;
  for (const slot of ALL_SLOTS) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'mj-tile';
    el.style.left = `${pixelX(slot)}px`;
    el.style.top = `${pixelY(slot)}px`;
    el.style.setProperty('--layer', String(slot.layer));
    el.dataset.slotId = slot.id;
    el.addEventListener('click', () => onTileClick(slot.id));
    board.appendChild(el);
    tileEls.set(slot.id, el);
  }
}

// ---- scale-to-fit (no scrolling, ever) --------------------------------
let currentScale = 1;
function fitBoard() {
  const availW = stage.clientWidth;
  const availH = stage.clientHeight;
  if (!availW || !availH) return;
  currentScale = Math.min(availW / BOARD_W, availH / BOARD_H, 1.5) * 0.97;
  board.style.transform = `scale(${currentScale})`;
}
if (typeof ResizeObserver === 'function') {
  new ResizeObserver(fitBoard).observe(stage);
}
// Belt-and-suspenders alongside ResizeObserver, same reasoning as
// games/solitaire's app.js (window resize/orientation covers any
// environment where the stage's own box changes without a notification).
window.addEventListener('resize', fitBoard);
window.addEventListener('orientationchange', fitBoard);

// ---- game state ---------------------------------------------------------
/** @type {Map<string, {id:string, layer:number, x:number, y:number, type:number, removed:boolean}>} */
let tiles = new Map();
let selectedId = null;
let history = []; // [{aId, bId}] — matched pairs, most recent last
let moveCount = 0;
let startedAt = 0;
let wonElapsedSec = 0;
let won = false;
let timerHandle = null;
let hintTimeoutHandle = null;

function newGame() {
  clearSelection();
  clearHintHighlight();
  hideWinOverlay();
  won = false;

  // buildDeal essentially never fails for the full 136-slot board (verified
  // extensively during development — see deal.js's doc comment for why the
  // drain-from-full construction is robust). Retry a couple of times before
  // giving up rather than trust a single call blindly.
  const deal = buildDeal(ALL_SLOTS) || buildDeal(ALL_SLOTS) || buildDeal(ALL_SLOTS);
  if (!deal) {
    // eslint-disable-next-line no-alert
    alert('Could not generate a board — please reload the page.');
    return;
  }

  tiles = new Map(deal.map((d) => [d.id, { ...d, removed: false }]));
  history = [];
  moveCount = 0;
  startedAt = Date.now();

  render();
  restartTimer();
}

// ---- free/matchable computation -------------------------------------------
function remainingTiles() {
  return [...tiles.values()].filter((tl) => !tl.removed);
}

function computeFreeIds() {
  const remaining = remainingTiles();
  const free = new Set();
  for (const tl of remaining) {
    if (isFreeGiven(tl, remaining.filter((o) => o.id !== tl.id))) free.add(tl.id);
  }
  return free;
}

/** Free tile ids grouped by type, keeping only groups of size >= 2 — i.e.
 * groups that are actually matchable right now. */
function matchableGroups(freeIds) {
  const byType = new Map();
  for (const id of freeIds) {
    const tl = tiles.get(id);
    if (!byType.has(tl.type)) byType.set(tl.type, []);
    byType.get(tl.type).push(id);
  }
  return [...byType.values()].filter((g) => g.length >= 2);
}

// ---- rendering ------------------------------------------------------------
function render() {
  const remaining = remainingTiles();
  const freeIds = computeFreeIds();

  for (const tl of tiles.values()) {
    const el = tileEls.get(tl.id);
    el.classList.toggle('is-removed', tl.removed);
    if (tl.removed) {
      el.tabIndex = -1;
      el.setAttribute('aria-hidden', 'true');
      continue;
    }
    const type = TILE_TYPES[tl.type];
    if (el.textContent !== type.glyph) el.textContent = type.glyph;
    el.tabIndex = 0;
    el.removeAttribute('aria-hidden');
    el.setAttribute('aria-label', type.label);
    el.classList.toggle('is-free', freeIds.has(tl.id));
    el.classList.toggle('is-selected', tl.id === selectedId);
  }

  tilesVal.textContent = String(remaining.length);
  movesVal.textContent = String(moveCount);

  const groups = matchableGroups(freeIds);
  const hasMove = groups.length > 0;

  if (!won && remaining.length === 0) {
    won = true;
    wonElapsedSec = Math.floor((Date.now() - startedAt) / 1000);
    if (timerHandle) clearInterval(timerHandle);
    sfx.play('win');
    showWinOverlay();
  }

  btnHint.disabled = won || !hasMove;
  btnUndo.disabled = won || history.length === 0;
  btnShuffle.disabled = won || remaining.length < 2;
  btnDeadlockUndo.hidden = history.length === 0;

  const deadlocked = !won && remaining.length > 0 && !hasMove;
  deadlockOverlay.hidden = !deadlocked;
}

// ---- selection / matching --------------------------------------------
function clearSelection() {
  selectedId = null;
}

function flashInvalid(id) {
  const el = tileEls.get(id);
  el.classList.remove('is-invalid');
  void el.offsetWidth; // restart the CSS animation even if it just played
  el.classList.add('is-invalid');
}

function onTileClick(id) {
  if (won) return;
  const tl = tiles.get(id);
  if (!tl || tl.removed) return;

  const freeIds = computeFreeIds();
  if (!freeIds.has(id)) {
    flashInvalid(id); // tapped a blocked tile: rejected, no state change
    return;
  }

  clearHintHighlight();

  if (selectedId === id) {
    clearSelection(); // tap the same tile again: deselect
    render();
    return;
  }

  if (selectedId == null) {
    selectedId = id; // first tap: select
    render();
    return;
  }

  const prev = tiles.get(selectedId);
  if (prev.type === tl.type) {
    history.push({ aId: prev.id, bId: tl.id });
    prev.removed = true;
    tl.removed = true;
    selectedId = null;
    moveCount++;
    sfx.play('place');
    render();
  } else {
    selectedId = id; // non-matching free tile: shift selection, don't error
    render();
  }
}

// ---- hint ---------------------------------------------------------------
function showHint() {
  const freeIds = computeFreeIds();
  const groups = matchableGroups(freeIds);
  if (!groups.length) return;
  const group = groups[Math.floor(Math.random() * groups.length)];
  const [aId, bId] = group;
  clearHintHighlight();
  tileEls.get(aId).classList.add('is-hint');
  tileEls.get(bId).classList.add('is-hint');
  sfx.play('tap');
  hintTimeoutHandle = setTimeout(clearHintHighlight, 2200);
}

function clearHintHighlight() {
  if (hintTimeoutHandle) {
    clearTimeout(hintTimeoutHandle);
    hintTimeoutHandle = null;
  }
  document.querySelectorAll('.mj-tile.is-hint').forEach((el) => el.classList.remove('is-hint'));
}

// ---- undo -----------------------------------------------------------------
function undo() {
  if (won || !history.length) return;
  const { aId, bId } = history.pop();
  tiles.get(aId).removed = false;
  tiles.get(bId).removed = false;
  clearSelection();
  clearHintHighlight();
  moveCount = Math.max(0, moveCount - 1);
  render();
}

// ---- shuffle (also the deadlock-recovery action) ---------------------
function shuffle() {
  const remaining = remainingTiles();
  if (remaining.length < 2) return;
  // Re-run the SAME solvability-guaranteed generator, restricted to just
  // the currently-remaining slot positions — see deal.js's doc comment for
  // why this is valid even for an irregular mid-game remainder (isFreeGiven
  // only ever looks at the tiles it's handed, never an "original" board).
  const slotsOnly = remaining.map((tl) => ({ id: tl.id, layer: tl.layer, x: tl.x, y: tl.y }));
  const deal = buildDeal(slotsOnly);
  if (!deal) {
    // Only reachable for a contrived remaining shape (see deal.js) — fail
    // closed rather than leave a broken/inconsistent board.
    // eslint-disable-next-line no-alert
    alert(t(currentLang, 'deadlockMsg'));
    return;
  }
  for (const d of deal) tiles.get(d.id).type = d.type;
  clearSelection();
  clearHintHighlight();
  sfx.play('pickup');
  render();
}

// ---- win / deadlock overlays ----------------------------------------------
function showWinOverlay() {
  winStatsLine.textContent = t(currentLang, 'winStats', { moves: moveCount, time: formatTime(wonElapsedSec) });
  winOverlay.hidden = false;
}
function hideWinOverlay() {
  winOverlay.hidden = true;
}

// ---- timer ------------------------------------------------------------
function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}
function updateTimerDisplay() {
  if (!startedAt || won) return;
  timeVal.textContent = formatTime(Math.floor((Date.now() - startedAt) / 1000));
}
function restartTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timeVal.textContent = '00:00';
  timerHandle = setInterval(updateTimerDisplay, 1000);
}

// ---- i18n wiring ------------------------------------------------------
let currentLang = detectLang();

function buildLangSwitch() {
  langSwitchEl.innerHTML = '';
  for (const lang of LANGS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `lang-btn${lang === currentLang ? ' is-on' : ''}`;
    btn.textContent = LANG_LABELS[lang];
    btn.setAttribute('aria-pressed', lang === currentLang ? 'true' : 'false');
    btn.addEventListener('click', () => setLang(lang));
    langSwitchEl.appendChild(btn);
  }
}

function setLang(lang) {
  currentLang = lang;
  rememberLang(lang);
  applyStaticStrings(lang);
  buildLangSwitch();
  render();
  if (won) showWinOverlay(); // refresh the localized stats line text
}

// ---- keyboard shortcuts (bonus alongside touch/mouse/Enter-on-focused-tile,
// not a full input path) -------------------------------------------------
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); return; }
  if (k === 'u') { undo(); return; }
  if (k === 'n') { newGame(); return; }
  if (k === 'h') { showHint(); return; }
  if (k === 's') { shuffle(); }
});

// ---- button wiring ------------------------------------------------------
btnHint.addEventListener('click', showHint);
btnUndo.addEventListener('click', undo);
btnShuffle.addEventListener('click', shuffle);
btnNew.addEventListener('click', newGame);
btnPlayAgain.addEventListener('click', newGame);
btnDeadlockShuffle.addEventListener('click', shuffle);
btnDeadlockRestart.addEventListener('click', newGame);
btnDeadlockUndo.addEventListener('click', undo);

// ---- debug/test hook, same convention as games/solitaire's
// window.OGH_SOLITAIRE / games/pop-the-bugs' window.OGH_POP_BUGS — also
// what the hub's manual test pass uses to reach hard-to-reach states
// (e.g. a genuine deadlock) without playing dozens of moves by hand. ------
window.OGH_MAHJONG = {
  getState: () => ({
    tiles: [...tiles.values()].map((tl) => ({ ...tl })),
    selectedId,
    moveCount,
    won,
    remaining: remainingTiles().length,
  }),
  computeFreeIds: () => [...computeFreeIds()],
  isFreeGiven,
  newGame,
  undo,
  shuffle,
  showHint,
  onTileClick,
  render,
  fitBoard,
  /** Force a genuine deadlock for testing: reassign every CURRENTLY FREE
   * tile a distinct type (no structural/position change) so no two free
   * tiles match — the same "no valid move" state real (unlucky) play can
   * reach, without needing to actually play ~60 correct moves by hand. */
  forceDeadlock() {
    const freeIds = [...computeFreeIds()];
    freeIds.forEach((id, i) => {
      tiles.get(id).type = i % TILE_TYPES.length;
    });
    clearSelection();
    clearHintHighlight();
    render();
  },
};

// ---- kickoff --------------------------------------------------------------
buildBoardOnce();
fitBoard();
applyStaticStrings(currentLang);
buildLangSwitch();
newGame();
