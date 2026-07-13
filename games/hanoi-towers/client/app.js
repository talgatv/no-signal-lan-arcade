/**
 * app.js — Towers of Hanoi, OGH.
 *
 * Board model: `pegs` is an array of 3 stacks (arrays of disk sizes,
 * largest number = biggest disk). Each stack is stored bottom-to-top, so
 * `pegs[i][pegs[i].length - 1]` is always the top (only movable) disk.
 * Peg 0 starts with the full stack, peg 1 is the spare, peg 2 is the fixed
 * goal peg — the classic "move everything from A to C" framing, made
 * visible in the UI via a distinct rod color + a "Goal" label under peg 2.
 * Disk count (3-10) IS the difficulty, chosen on the setup screen; the
 * setup screen also shows the theoretical minimum move count (2^n - 1)
 * live as the count changes.
 *
 * Legality: canPlace() forbids stacking a bigger disk on a smaller one at
 * *every* move, so the invariant "each peg is strictly descending bottom-to-
 * top" holds throughout a game, not just at the end — which is exactly why
 * a simple `pegs[TARGET_PEG].length === numDisks` check is a correct and
 * complete win condition (there is no way to legally land every disk on one
 * peg out of order).
 *
 * Rendering: one persistent DOM element per disk *size* (not per stack
 * slot), positioned with `transform: translate()` — the same "state drives
 * position, the browser interpolates" architecture as games/gem-swap's gems
 * and games/sliding-puzzle's tiles. Each peg is one large transparent
 * hit-target <button> spanning its whole column; disks themselves are
 * pointer-events:none decoration, so a tap anywhere in a peg's column
 * (empty rod space or right on a disk) reads as "tap peg i".
 */
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings } from './i18n.js';

const GAME_ID = 'hanoi-towers';
const sfx = createOghSfx();

/* ------------------------------------------------------------------------ *
 * Tunables
 * ------------------------------------------------------------------------ */
const MIN_DISKS = 3;
const MAX_DISKS = 10;
const DEFAULT_DISKS = 4;

const PEG_COUNT = 3;
const SOURCE_PEG = 0;
const TARGET_PEG = 2;

const DISK_H = 26;
const DISK_GAP = 6;
const LIFT_PX = 30; // how far a "held" disk floats above its stack
const DISK_W_BASE = 44;
const DISK_W_STEP = 15;
const PEG_PAD = 30; // horizontal padding either side of a peg's widest disk
const ROD_W = 8;
const BASE_H = 14;
const TOP_MARGIN = 14;

// A 10-color neon rotation covers the maximum disk count (10) without
// repeats, cycling if a future tweak ever raised MAX_DISKS further.
const DISK_COLORS = [
  '#5ce1ff', '#ff6bcb', '#ffd166', '#5cffb0', '#b98bff',
  '#ff5c7a', '#7dd3fc', '#f4f0ff', '#fca5f1', '#a3e635',
];

/* ------------------------------------------------------------------------ *
 * Pure board logic — no DOM references, exercised live via
 * window.OGH_HANOI_TOWERS (see debug hook at the bottom of this file).
 * ------------------------------------------------------------------------ */
function initPegs(n) {
  const pegsArr = [[], [], []];
  for (let size = n; size >= 1; size--) pegsArr[SOURCE_PEG].push(size);
  return pegsArr;
}

function topOf(pegsArr, i) { return pegsArr[i][pegsArr[i].length - 1]; }

function canPlace(pegsArr, i, disk) {
  const top = topOf(pegsArr, i);
  return top === undefined || disk < top;
}

function isWin(pegsArr, n) { return pegsArr[TARGET_PEG].length === n; }

/** 2^n - 1, the well-known theoretical minimum move count for n disks. */
function optimalMoves(n) { return (1 << n) - 1; }

function diskWidth(size) { return DISK_W_BASE + size * DISK_W_STEP; }

function computeLayout(n) {
  const maxDiskW = diskWidth(n);
  const colW = maxDiskW + PEG_PAD * 2;
  const boardW = colW * PEG_COUNT;
  const stackH = n * DISK_H + (n - 1) * DISK_GAP;
  const rodH = stackH + LIFT_PX + 16;
  const baseY = TOP_MARGIN + rodH;
  const boardH = baseY + BASE_H + 26; // + room for the target-peg label below
  return { colW, boardW, rodH, baseY, boardH };
}

function diffBandKey(n) {
  if (n <= 4) return 'diffEasyLabel';
  if (n <= 6) return 'diffMediumLabel';
  if (n <= 8) return 'diffHardLabel';
  return 'diffExtremeLabel';
}

/* ------------------------------------------------------------------------ *
 * DOM refs
 * ------------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const stage = document.querySelector('.ht-stage');
const langSwitchEl = $('langSwitch');

const movesVal = $('movesVal');
const optimalVal = $('optimalVal');
const timeVal = $('timeVal');

const btnRestart = $('btnRestart');
const btnChangeSize = $('btnChangeSize');

const setupOverlay = $('setupOverlay');
const diskCountValEl = $('diskCountVal');
const diffPreviewEl = $('diffPreview');
const btnDiskMinus = $('btnDiskMinus');
const btnDiskPlus = $('btnDiskPlus');
const btnStart = $('btnStart');
const bestLineStart = $('bestLineStart');

const resultOverlay = $('resultOverlay');
const resultStatsLine = $('resultStatsLine');
const perfectLine = $('perfectLine');
const newBestLine = $('newBestLine');
const bestLineEnd = $('bestLineEnd');
const btnPlayAgain = $('btnPlayAgain');
const invalidBanner = $('invalidBanner');

/* ------------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------------ */
const state = {
  screen: 'setup', // 'setup' | 'play' | 'over'
  numDisks: DEFAULT_DISKS,
  selectedPeg: null,
  moves: 0,
  startedAt: 0,
  elapsedMs: 0,
};

let pegs = initPegs(DEFAULT_DISKS);
let pendingDisks = DEFAULT_DISKS;
let diskEls = new Map(); // disk size -> element
let pegHitEls = [];
let targetLabelEl = null;
let layout = computeLayout(DEFAULT_DISKS);
let timerHandle = null;

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/* ------------------------------------------------------------------------ *
 * Layout — a fixed logical-pixel board, scaled as a whole to fit any
 * viewport with zero scrolling (games/memory-match's fitBoard() pattern).
 * ------------------------------------------------------------------------ */
let boardW = 0;
let boardH = 0;
function fitBoard() {
  const availW = stage.clientWidth;
  const availH = stage.clientHeight;
  if (!availW || !availH || !boardW || !boardH) return;
  const scale = Math.min(availW / boardW, availH / boardH, 1.6) * 0.94;
  boardEl.style.transform = `scale(${scale})`;
}
if (typeof ResizeObserver === 'function') {
  new ResizeObserver(fitBoard).observe(stage);
}
window.addEventListener('resize', fitBoard);
window.addEventListener('orientationchange', fitBoard);

function pegCenterX(i) { return layout.colW * i + layout.colW / 2; }
function diskY(level) { return layout.baseY - (level + 1) * DISK_H - level * DISK_GAP; }

/* ------------------------------------------------------------------------ *
 * DOM build — a fresh board every round (fresh stacks, fresh elements),
 * same "no leftover state between rounds" convention as games/memory-match.
 * ------------------------------------------------------------------------ */
function buildBoardDom() {
  boardEl.innerHTML = '';
  diskEls = new Map();
  pegHitEls = [];
  layout = computeLayout(state.numDisks);
  boardW = layout.boardW;
  boardH = layout.boardH;
  boardEl.style.width = `${boardW}px`;
  boardEl.style.height = `${boardH}px`;

  const base = document.createElement('div');
  base.className = 'ht-base';
  base.style.top = `${layout.baseY}px`;
  base.style.left = '8px';
  base.style.width = `${boardW - 16}px`;
  base.style.height = `${BASE_H}px`;
  boardEl.appendChild(base);

  for (let i = 0; i < PEG_COUNT; i++) {
    const rod = document.createElement('div');
    rod.className = `ht-rod${i === TARGET_PEG ? ' is-target' : ''}`;
    rod.style.left = `${pegCenterX(i) - ROD_W / 2}px`;
    rod.style.top = `${TOP_MARGIN}px`;
    rod.style.width = `${ROD_W}px`;
    rod.style.height = `${layout.rodH}px`;
    boardEl.appendChild(rod);
  }

  targetLabelEl = document.createElement('div');
  targetLabelEl.className = 'ht-target-label';
  targetLabelEl.textContent = t(currentLang, 'targetLabel');
  targetLabelEl.style.left = `${pegCenterX(TARGET_PEG)}px`;
  targetLabelEl.style.top = `${layout.baseY + BASE_H + 6}px`;
  boardEl.appendChild(targetLabelEl);

  for (let i = 0; i < PEG_COUNT; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ht-peg-hit';
    btn.style.left = `${layout.colW * i}px`;
    btn.style.top = '0';
    btn.style.width = `${layout.colW}px`;
    btn.style.height = `${boardH}px`;
    btn.addEventListener('click', () => onTapPeg(i));
    boardEl.appendChild(btn);
    pegHitEls.push(btn);
  }

  for (let size = 1; size <= state.numDisks; size++) {
    const el = document.createElement('div');
    el.className = 'ht-disk';
    el.dataset.size = String(size);
    el.style.setProperty('--disk-color', DISK_COLORS[(size - 1) % DISK_COLORS.length]);
    el.style.width = `${diskWidth(size)}px`;
    boardEl.appendChild(el);
    diskEls.set(size, el);
  }
  renderDisks();
  fitBoard();
}

function positionDisk(el, pegIndex, level, lift) {
  const size = Number(el.dataset.size);
  const x = pegCenterX(pegIndex) - diskWidth(size) / 2;
  const y = diskY(level) - lift;
  el.style.transform = `translate(${x}px, ${y}px)`;
}

function renderDisks() {
  for (let i = 0; i < PEG_COUNT; i++) {
    const stack = pegs[i];
    for (let level = 0; level < stack.length; level++) {
      const size = stack[level];
      const el = diskEls.get(size);
      if (!el) continue;
      const isHeld = state.selectedPeg === i && level === stack.length - 1;
      positionDisk(el, i, level, isHeld ? LIFT_PX : 0);
      el.classList.toggle('is-held', isHeld);
    }
  }
}

function renderSelection() {
  pegHitEls.forEach((el, i) => el.classList.toggle('is-selected', state.selectedPeg === i));
}

/* ------------------------------------------------------------------------ *
 * Invalid-move feedback
 * ------------------------------------------------------------------------ */
function showInvalidBanner() {
  invalidBanner.textContent = t(currentLang, 'invalidMsg');
  invalidBanner.classList.remove('is-showing');
  void invalidBanner.offsetWidth; // restart the animation even on rapid repeat triggers
  invalidBanner.classList.add('is-showing');
}

function shakePeg(i) {
  const el = pegHitEls[i];
  if (!el) return;
  el.classList.remove('is-shake');
  void el.offsetWidth;
  el.classList.add('is-shake');
}

/* ------------------------------------------------------------------------ *
 * Input — tap a peg to pick up its top disk, tap another peg to place it.
 * An invalid placement (bigger disk on smaller) is rejected with sound +
 * banner + shake, and the held disk stays selected so the player can
 * immediately try a different peg without re-selecting the source.
 * ------------------------------------------------------------------------ */
function onTapPeg(i) {
  if (state.screen !== 'play') return;

  if (state.selectedPeg === null) {
    if (pegs[i].length === 0) return; // nothing to pick up
    state.selectedPeg = i;
    sfx.play('pickup');
    renderDisks();
    renderSelection();
    return;
  }

  if (state.selectedPeg === i) {
    state.selectedPeg = null; // tapping the held peg again cancels the pickup
    renderDisks();
    renderSelection();
    return;
  }

  const disk = topOf(pegs, state.selectedPeg);
  if (!canPlace(pegs, i, disk)) {
    sfx.play('screech');
    showInvalidBanner();
    shakePeg(i);
    return; // keep the disk selected so another peg can be tried immediately
  }

  pegs[state.selectedPeg].pop();
  pegs[i].push(disk);
  state.moves++;
  state.selectedPeg = null;
  sfx.play('place');
  renderMoves();
  renderDisks();
  renderSelection();

  if (isWin(pegs, state.numDisks)) finishGame();
}

/* ------------------------------------------------------------------------ *
 * Timer — HUD flavor only; unlike moves, elapsed time is never persisted
 * as a "best" (the task only asks for fewest-moves-per-disk-count as the
 * tracked best), matching games/memory-match's habit of always showing a
 * live clock even where bragging rights center on a different stat.
 * ------------------------------------------------------------------------ */
function startTimer() {
  clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    if (state.screen !== 'play') return;
    state.elapsedMs = Date.now() - state.startedAt;
    renderTime();
  }, 250);
}

/* ------------------------------------------------------------------------ *
 * Rendering — HUD
 * ------------------------------------------------------------------------ */
function renderMoves() { movesVal.textContent = String(state.moves); }
function renderTime() { timeVal.textContent = formatTime(state.elapsedMs); }

/* ------------------------------------------------------------------------ *
 * Best score (local-only, per disk count) — same OGHProfile convention as
 * games/memory-match/games/sliding-puzzle, but only {bestMoves} is tracked
 * per the task's spec (no time-based best for this game).
 * ------------------------------------------------------------------------ */
function getBestForSize(n) {
  let progress = {};
  try { progress = OGHProfile.getProgress(GAME_ID) || {}; } catch { /* ignore */ }
  return progress[String(n)] || null;
}

function saveBest() {
  let progress = {};
  try { progress = OGHProfile.getProgress(GAME_ID) || {}; } catch { /* ignore */ }
  const key = String(state.numDisks);
  const prev = progress[key] || null;
  const isNewBest = !prev || state.moves < prev.bestMoves;
  const next = {
    ...progress,
    [key]: { bestMoves: prev ? Math.min(prev.bestMoves, state.moves) : state.moves },
  };
  try {
    OGHProfile.saveProgress(GAME_ID, next, {
      label: 'Towers of Hanoi',
      summary: `${key} disks: ${next[key].bestMoves} moves (optimal ${optimalMoves(state.numDisks)})`,
    });
  } catch { /* best-effort, never block the game on storage failures */ }
  return isNewBest;
}

/* ------------------------------------------------------------------------ *
 * Round lifecycle
 * ------------------------------------------------------------------------ */
function startSession(n) {
  clearInterval(timerHandle);
  state.screen = 'play';
  state.numDisks = n;
  pegs = initPegs(n);
  state.selectedPeg = null;
  state.moves = 0;
  state.startedAt = Date.now();
  state.elapsedMs = 0;

  hideResult();
  hideSetup();
  buildBoardDom();
  renderMoves();
  optimalVal.textContent = String(optimalMoves(n));
  renderTime();
  startTimer();
}

function finishGame() {
  clearInterval(timerHandle);
  state.screen = 'over';
  state.elapsedMs = Date.now() - state.startedAt;
  renderTime();
  sfx.play('win');
  const isNewBest = saveBest();
  showResult(isNewBest);
}

/* ------------------------------------------------------------------------ *
 * Overlays
 * ------------------------------------------------------------------------ */
function showSetup() { setupOverlay.hidden = false; }
function hideSetup() { setupOverlay.hidden = true; }

function renderDiffPreview() {
  diffPreviewEl.textContent = `${t(currentLang, diffBandKey(pendingDisks))} · ${t(currentLang, 'optimalPreview', { n: optimalMoves(pendingDisks) })}`;
}

function renderBestPreview() {
  const best = getBestForSize(pendingDisks);
  bestLineStart.textContent = best
    ? t(currentLang, 'bestLine', { n: pendingDisks, moves: best.bestMoves })
    : t(currentLang, 'noBestYet');
}

function showResult(isNewBest) {
  const optimal = optimalMoves(state.numDisks);
  resultStatsLine.textContent = t(currentLang, 'resultStats', { moves: state.moves, optimal });
  perfectLine.hidden = state.moves !== optimal;
  newBestLine.textContent = isNewBest ? t(currentLang, 'newBestLine') : '';
  newBestLine.hidden = !isNewBest;
  const best = getBestForSize(state.numDisks);
  bestLineEnd.textContent = best
    ? t(currentLang, 'bestLine', { n: state.numDisks, moves: best.bestMoves })
    : '';
  resultOverlay.hidden = false;
}
function hideResult() { resultOverlay.hidden = true; }

function setPendingDisks(n) {
  pendingDisks = Math.max(MIN_DISKS, Math.min(MAX_DISKS, n));
  diskCountValEl.textContent = String(pendingDisks);
  renderDiffPreview();
  renderBestPreview();
}

/* ------------------------------------------------------------------------ *
 * i18n wiring
 * ------------------------------------------------------------------------ */
let currentLang = detectLang();

function buildLangSwitch() {
  langSwitchEl.innerHTML = '';
  for (const l of LANGS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `lang-btn${l === currentLang ? ' is-on' : ''}`;
    btn.textContent = LANG_LABELS[l];
    btn.setAttribute('aria-pressed', l === currentLang ? 'true' : 'false');
    btn.addEventListener('click', () => setLang(l));
    langSwitchEl.appendChild(btn);
  }
}

function setLang(lang) {
  currentLang = lang;
  rememberLang(lang);
  applyStaticStrings(lang);
  document.title = `${t(lang, 'title')} — OGH`;
  buildLangSwitch();
  renderDiffPreview();
  renderBestPreview();
  if (targetLabelEl) targetLabelEl.textContent = t(currentLang, 'targetLabel');
  if (state.screen === 'over') showResult(false);
  // Header height can shift with language (back-link text length, whether
  // the HUD/lang-switch row wraps) — re-measure so the board keeps filling
  // exactly what's left, on every language, not just the one it booted in.
  fitBoard();
}

/* ------------------------------------------------------------------------ *
 * Button wiring
 * ------------------------------------------------------------------------ */
btnDiskMinus.addEventListener('click', () => { sfx.unlock(); setPendingDisks(pendingDisks - 1); });
btnDiskPlus.addEventListener('click', () => { sfx.unlock(); setPendingDisks(pendingDisks + 1); });
btnStart.addEventListener('click', () => { sfx.unlock(); startSession(pendingDisks); });
btnRestart.addEventListener('click', () => { sfx.unlock(); startSession(state.numDisks); });
btnChangeSize.addEventListener('click', () => {
  sfx.unlock();
  setPendingDisks(state.numDisks);
  showSetup();
});
btnPlayAgain.addEventListener('click', () => { sfx.unlock(); startSession(state.numDisks); });

/* ------------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------------ */
buildLangSwitch();
applyStaticStrings(currentLang);
document.title = `${t(currentLang, 'title')} — OGH`;
setPendingDisks(pendingDisks);
showSetup();

/* ------------------------------------------------------------------------ *
 * Debug/test hook — same convention as games/memory-match's
 * window.OGH_MEMORY and games/sliding-puzzle's window.OGH_SLIDING_PUZZLE:
 * lets the automation harness (and devtools) inspect and drive the game
 * deterministically instead of clicking through a full solve by hand.
 * ------------------------------------------------------------------------ */
window.OGH_HANOI_TOWERS = {
  state,
  CONFIG: { MIN_DISKS, MAX_DISKS, SOURCE_PEG, TARGET_PEG, PEG_COUNT },
  getPegs: () => pegs.map((p) => p.slice()),
  optimalMoves,
  canPlace: (i, disk) => canPlace(pegs, i, disk),
  isWin: () => isWin(pegs, state.numDisks),
  initPegs,
  startSession,
  onTapPeg,
  getBestForSize,
  fitBoard,
  /** Force the live stacks to an arbitrary arrangement for deterministic
   * testing. Rebuilds the board for `numDisks` disks first (so DOM elements
   * exist for every size in the new arrangement), then snaps `newPegs` in. */
  setPegs(newPegs, numDisks = state.numDisks) {
    if (state.numDisks !== numDisks || diskEls.size !== numDisks) {
      state.numDisks = numDisks;
      hideResult();
      hideSetup();
      state.screen = 'play';
      buildBoardDom();
      optimalVal.textContent = String(optimalMoves(numDisks));
    }
    pegs = newPegs.map((p) => p.slice());
    state.selectedPeg = null;
    renderDisks();
    renderSelection();
  },
  /** All disks except the smallest already on the goal peg; the smallest
   * sits alone on the source peg — one valid move away from winning, for
   * exercising win detection without solving a full stack by hand. */
  forceOneMoveFromWin(n = state.numDisks || DEFAULT_DISKS) {
    const p = [[], [], []];
    for (let size = n; size >= 2; size--) p[TARGET_PEG].push(size);
    p[SOURCE_PEG].push(1);
    this.setPegs(p, n);
    state.moves = 0;
    state.startedAt = Date.now();
    state.elapsedMs = 0;
    renderMoves();
    startTimer();
  },
};
