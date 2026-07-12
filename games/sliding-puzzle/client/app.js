/**
 * app.js — Sliding Puzzle (the classic 8/15/24-puzzle), OGH.
 *
 * Board model: `state.board` is a flat array of length size*size, row-major,
 * holding tile numbers 1..size*size-1 with 0 marking the blank. Grid size
 * (3/4/5) IS the difficulty, chosen on the setup screen.
 *
 * Shuffle & solvability: shuffledBoard() starts from the solved array and
 * performs a large number of random *legal* blank-slides (never a raw
 * permutation of tile values). Every board reachable from the solved state
 * by a sequence of legal slides is, by definition/construction, solvable —
 * that's the whole point of doing it this way instead of shuffling the
 * array directly, which would produce an unsolvable position about half the
 * time. isSolvable()/countInversions() below are a *second*, independent
 * check (the standard inversion-count + blank-row-parity test) kept purely
 * as a self-verifying belt-and-suspenders: every shuffle is asserted against
 * it (see the console.assert in shuffledBoard), and both are exposed via
 * window.OGH_SLIDING_PUZZLE for a test harness to hammer on directly.
 *
 * Rendering: one persistent DOM <button> per tile *number* (not per board
 * cell), positioned with `transform: translate()` — the same "state drives
 * position, the browser interpolates" architecture as games/gem-swap's gems
 * and games/memory-match's fitBoard() scale-to-fit. A tap on any tile in the
 * blank's row or column slides that whole line one step toward the blank in
 * a single move (a single-tile slide is just the distance-1 case of the
 * same code path) — every shifted tile animates via the CSS transition on
 * .spz-tile, so a multi-tile line-slide reads as one fluid shove.
 */
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings } from './i18n.js';

const GAME_ID = 'sliding-puzzle';
const sfx = createOghSfx();

/* ------------------------------------------------------------------------ *
 * Tunables
 * ------------------------------------------------------------------------ */
const CELL = 100; // logical px per tile
const GAP = 8;
const PAD = 10;

const SIZES = { easy: 3, medium: 4, hard: 5 };

/* ------------------------------------------------------------------------ *
 * Pure board logic — no DOM references anywhere in this section, so it is
 * trivially unit-testable (and is exercised live via window.OGH_SLIDING_PUZZLE
 * in the browser, since importing a DOM-coupled module like this one under
 * plain Node isn't possible — see the debug hook at the bottom of this file).
 * ------------------------------------------------------------------------ */
function solvedBoard(size) {
  const arr = [];
  for (let i = 1; i < size * size; i++) arr.push(i);
  arr.push(0);
  return arr;
}

function isSolved(board) {
  for (let i = 0; i < board.length - 1; i++) if (board[i] !== i + 1) return false;
  return board[board.length - 1] === 0;
}

function neighborsOf(idx, size) {
  const r = Math.floor(idx / size);
  const c = idx % size;
  const out = [];
  if (r > 0) out.push(idx - size);
  if (r < size - 1) out.push(idx + size);
  if (c > 0) out.push(idx - 1);
  if (c < size - 1) out.push(idx + 1);
  return out;
}

/** Standard 15-puzzle solvability test (inversion count + blank-row parity
 * for even-width grids), independent of how the board was produced. Used
 * only as a self-check on shuffledBoard()'s output, never to gate play. */
function countInversions(board) {
  const nums = board.filter((v) => v !== 0);
  let inv = 0;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] > nums[j]) inv++;
    }
  }
  return inv;
}

function isSolvable(board, size) {
  const inversions = countInversions(board);
  if (size % 2 === 1) {
    // Odd grid width: solvable iff the inversion count is even, regardless
    // of which row the blank sits on.
    return inversions % 2 === 0;
  }
  // Even grid width: solvable iff (inversions + blank's row counted from
  // the bottom, 1-indexed) is odd.
  const blankIdx = board.indexOf(0);
  const blankRowFromTop = Math.floor(blankIdx / size);
  const blankRowFromBottom = size - blankRowFromTop;
  return (inversions + blankRowFromBottom) % 2 === 1;
}

/** Shuffle by performing `size*size*60` random legal blank-slides starting
 * from the solved board (excluding the immediately-preceding blank cell so
 * it doesn't just bounce back and forth) — see file header for why this
 * guarantees a solvable result by construction, not by luck. */
function shuffledBoard(size) {
  const board = solvedBoard(size);
  let blank = board.length - 1;
  let last = -1;
  const totalSlides = size * size * 60;
  for (let i = 0; i < totalSlides; i++) {
    const options = neighborsOf(blank, size).filter((n) => n !== last);
    const next = options[(Math.random() * options.length) | 0];
    board[blank] = board[next];
    board[next] = 0;
    last = blank;
    blank = next;
  }
  // Astronomically unlikely with 60*size*size slides, but guard against a
  // shuffle that happens to land back on solved so a session never opens
  // already-won.
  if (isSolved(board)) {
    const options = neighborsOf(blank, size);
    const next = options[(Math.random() * options.length) | 0];
    board[blank] = board[next];
    board[next] = 0;
    blank = next;
  }
  console.assert(isSolvable(board, size), '[sliding-puzzle] shuffledBoard produced an unsolvable board', board, size);
  return board;
}

/** Every tile between the blank and `idx` (inclusive of idx), ordered from
 * nearest-the-blank outward — the set of tiles a single tap on `idx` shifts. */
function lineTo(blankIdx, idx, size) {
  const br = Math.floor(blankIdx / size);
  const bc = blankIdx % size;
  const r = Math.floor(idx / size);
  const c = idx % size;
  if (r !== br && c !== bc) return null; // not in line with the blank
  const path = [];
  if (r === br) {
    const step = c > bc ? 1 : -1;
    for (let cc = bc + step; ; cc += step) {
      path.push(r * size + cc);
      if (cc === c) break;
    }
  } else {
    const step = r > br ? 1 : -1;
    for (let rr = br + step; ; rr += step) {
      path.push(rr * size + c);
      if (rr === r) break;
    }
  }
  return path;
}

/* ------------------------------------------------------------------------ *
 * DOM refs
 * ------------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const stage = document.querySelector('.spz-stage');
const langSwitchEl = $('langSwitch');

const movesVal = $('movesVal');
const timeVal = $('timeVal');

const btnShuffle = $('btnShuffle');
const btnChangeSize = $('btnChangeSize');

const setupOverlay = $('setupOverlay');
const sizeChoiceEls = Array.from(document.querySelectorAll('#sizeChoices .choice-btn'));
const btnStart = $('btnStart');
const bestLineStart = $('bestLineStart');

const resultOverlay = $('resultOverlay');
const resultStatsLine = $('resultStatsLine');
const newBestLine = $('newBestLine');
const bestLineEnd = $('bestLineEnd');
const btnPlayAgain = $('btnPlayAgain');

/* ------------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------------ */
const state = {
  screen: 'setup', // 'setup' | 'play' | 'over'
  size: 4,
  board: [],
  blankIndex: 0,
  moves: 0,
  startedAt: 0,
  elapsedMs: 0,
};

let pendingSize = 4;
let tileEls = new Map(); // tile number -> element
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
  const scale = Math.min(availW / boardW, availH / boardH, 1.5) * 0.94;
  boardEl.style.transform = `scale(${scale})`;
}
if (typeof ResizeObserver === 'function') {
  new ResizeObserver(fitBoard).observe(stage);
}
window.addEventListener('resize', fitBoard);
window.addEventListener('orientationchange', fitBoard);

function slotX(col) { return PAD + col * (CELL + GAP); }
function slotY(row) { return PAD + row * (CELL + GAP); }

function applyBoardCss(size) {
  boardW = size * CELL + (size - 1) * GAP + PAD * 2;
  boardH = boardW;
  boardEl.style.width = `${boardW}px`;
  boardEl.style.height = `${boardH}px`;
  fitBoard();
}

/* ------------------------------------------------------------------------ *
 * DOM build — a fresh grid every round (fresh shuffle, fresh elements),
 * same "no leftover state between rounds" convention as games/memory-match.
 * ------------------------------------------------------------------------ */
function renderTilePosition(tileNum, idx) {
  const el = tileEls.get(tileNum);
  if (!el) return;
  const r = Math.floor(idx / state.size);
  const c = idx % state.size;
  el.dataset.idx = String(idx);
  el.style.transform = `translate(${slotX(c)}px, ${slotY(r)}px)`;
  el.classList.toggle('is-correct', tileNum === idx + 1);
}

function renderAllTilePositions() {
  for (let i = 0; i < state.board.length; i++) {
    const v = state.board[i];
    if (v !== 0) renderTilePosition(v, i);
  }
}

function buildBoardDom() {
  boardEl.innerHTML = '';
  tileEls = new Map();
  applyBoardCss(state.size);

  for (let i = 0; i < state.size * state.size; i++) {
    const r = Math.floor(i / state.size);
    const c = i % state.size;
    const cell = document.createElement('div');
    cell.className = 'spz-cell';
    cell.style.width = `${CELL}px`;
    cell.style.height = `${CELL}px`;
    cell.style.transform = `translate(${slotX(c)}px, ${slotY(r)}px)`;
    boardEl.appendChild(cell);
  }

  for (let i = 0; i < state.board.length; i++) {
    const v = state.board[i];
    if (v === 0) continue;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'spz-tile';
    el.style.width = `${CELL}px`;
    el.style.height = `${CELL}px`;
    el.textContent = String(v);
    el.addEventListener('click', () => attemptMove(Number(el.dataset.idx)));
    boardEl.appendChild(el);
    tileEls.set(v, el);
  }
  renderAllTilePositions();
}

/* ------------------------------------------------------------------------ *
 * Moves
 * ------------------------------------------------------------------------ */
function attemptMove(idx) {
  if (state.screen !== 'play') return;
  if (idx === state.blankIndex) return;
  const path = lineTo(state.blankIndex, idx, state.size);
  if (!path) return; // tapped tile isn't in the blank's row/column — no-op

  let prev = state.blankIndex;
  for (const cell of path) {
    state.board[prev] = state.board[cell];
    renderTilePosition(state.board[prev], prev);
    prev = cell;
  }
  state.board[idx] = 0;
  state.blankIndex = idx;
  state.moves += path.length;
  renderMoves();
  sfx.play(path.length > 1 ? 'whoosh' : 'place');

  if (isSolved(state.board)) finishGame();
}

/* ------------------------------------------------------------------------ *
 * Timer
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
 * Best score (local-only, per grid size) — same convention/shape as
 * games/memory-match's saveBest(): one OGHProfile progress object keyed by
 * grid size, each holding {bestMoves, bestTimeMs}.
 * ------------------------------------------------------------------------ */
function getBestForSize(size) {
  let progress = {};
  try { progress = OGHProfile.getProgress(GAME_ID) || {}; } catch { /* ignore */ }
  return progress[String(size)] || null;
}

function saveBest() {
  let progress = {};
  try { progress = OGHProfile.getProgress(GAME_ID) || {}; } catch { /* ignore */ }
  const key = String(state.size);
  const prev = progress[key] || null;
  const isNewBestMoves = !prev || state.moves < prev.bestMoves;
  const isNewBestTime = !prev || state.elapsedMs < prev.bestTimeMs;
  const next = {
    ...progress,
    [key]: {
      bestMoves: prev ? Math.min(prev.bestMoves, state.moves) : state.moves,
      bestTimeMs: prev ? Math.min(prev.bestTimeMs, state.elapsedMs) : state.elapsedMs,
    },
  };
  try {
    OGHProfile.saveProgress(GAME_ID, next, {
      label: 'Sliding Puzzle',
      summary: `${key}×${key}: ${next[key].bestMoves} moves · ${formatTime(next[key].bestTimeMs)}`,
    });
  } catch { /* best-effort, never block the game on storage failures */ }
  return { isNewBestMoves, isNewBestTime };
}

/* ------------------------------------------------------------------------ *
 * Round lifecycle
 * ------------------------------------------------------------------------ */
function startSession(size) {
  clearInterval(timerHandle);
  state.screen = 'play';
  state.size = size;
  state.board = shuffledBoard(size);
  state.blankIndex = state.board.indexOf(0);
  state.moves = 0;
  state.startedAt = Date.now();
  state.elapsedMs = 0;

  hideResult();
  hideSetup();
  buildBoardDom();
  renderMoves();
  renderTime();
  startTimer();
}

function finishGame() {
  clearInterval(timerHandle);
  state.screen = 'over';
  state.elapsedMs = Date.now() - state.startedAt;
  renderTime();
  sfx.play('win');
  const best = saveBest();
  showResult(best);
}

/* ------------------------------------------------------------------------ *
 * Overlays
 * ------------------------------------------------------------------------ */
function showSetup() { setupOverlay.hidden = false; }
function hideSetup() { setupOverlay.hidden = true; }

function renderBestPreview() {
  const best = getBestForSize(pendingSize);
  bestLineStart.textContent = best
    ? t(currentLang, 'bestLine', { moves: best.bestMoves, time: formatTime(best.bestTimeMs) })
    : t(currentLang, 'noBestYet');
}

function showResult({ isNewBestMoves, isNewBestTime } = {}) {
  resultStatsLine.textContent = t(currentLang, 'resultStats', {
    moves: state.moves,
    time: formatTime(state.elapsedMs),
  });
  let bestKey = null;
  if (isNewBestMoves && isNewBestTime) bestKey = 'newBestBoth';
  else if (isNewBestMoves) bestKey = 'newBestMoves';
  else if (isNewBestTime) bestKey = 'newBestTime';
  newBestLine.textContent = bestKey ? t(currentLang, bestKey) : '';
  newBestLine.hidden = !bestKey;
  const best = getBestForSize(state.size);
  bestLineEnd.textContent = best
    ? t(currentLang, 'bestLine', { moves: best.bestMoves, time: formatTime(best.bestTimeMs) })
    : '';
  resultOverlay.hidden = false;
}
function hideResult() { resultOverlay.hidden = true; }

function selectSize(size) {
  pendingSize = size;
  sizeChoiceEls.forEach((b) => b.classList.toggle('is-on', Number(b.dataset.size) === size));
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
  renderBestPreview();
  if (state.screen === 'over') showResult({ isNewBestMoves: false, isNewBestTime: false });
  // Header height can shift with language (back-link text length, whether
  // the HUD/lang-switch row wraps) — re-measure so the board keeps filling
  // exactly what's left, on every language, not just the one it booted in.
  fitBoard();
}

/* ------------------------------------------------------------------------ *
 * Button wiring
 * ------------------------------------------------------------------------ */
sizeChoiceEls.forEach((btn) => btn.addEventListener('click', () => {
  sfx.unlock();
  selectSize(Number(btn.dataset.size));
}));
btnStart.addEventListener('click', () => { sfx.unlock(); startSession(pendingSize); });
btnShuffle.addEventListener('click', () => { sfx.unlock(); startSession(state.size); });
btnChangeSize.addEventListener('click', () => {
  sfx.unlock();
  selectSize(state.size);
  showSetup();
});
btnPlayAgain.addEventListener('click', () => { sfx.unlock(); startSession(state.size); });

/* ------------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------------ */
buildLangSwitch();
applyStaticStrings(currentLang);
document.title = `${t(currentLang, 'title')} — OGH`;
selectSize(pendingSize);
showSetup();

/* ------------------------------------------------------------------------ *
 * Debug/test hook — same convention as games/memory-match's
 * window.OGH_MEMORY and games/gem-swap's window.OGH_GEM_SWAP: lets the
 * automation harness (and devtools) inspect and drive the game
 * deterministically, and independently re-verify the shuffle's solvability
 * guarantee across many trials without eyeballing a board by hand.
 * ------------------------------------------------------------------------ */
window.OGH_SLIDING_PUZZLE = {
  state,
  SIZES,
  solvedBoard,
  isSolved,
  neighborsOf,
  countInversions,
  isSolvable,
  shuffledBoard,
  startSession,
  attemptMove,
  getBestForSize,
  formatTime,
  fitBoard,
  /** Force the live board to an arbitrary arrangement for deterministic
   * testing (e.g. a near-solved state to exercise win detection without
   * solving a full shuffle by hand). Snaps straight into place, switches to
   * play mode. */
  setBoard(board) {
    state.screen = 'play';
    state.board = board.slice();
    state.blankIndex = state.board.indexOf(0);
    hideResult();
    hideSetup();
    buildBoardDom();
    renderMoves();
  },
  /** Solved board with exactly one random legal move undone — one tap away
   * from a win, for exercising win detection directly. */
  forceOneMoveFromSolved(size = state.size) {
    const board = solvedBoard(size);
    const blank = board.length - 1;
    const options = neighborsOf(blank, size);
    const next = options[(Math.random() * options.length) | 0];
    board[blank] = board[next];
    board[next] = 0;
    state.size = size;
    this.setBoard(board);
    state.moves = 0;
    state.startedAt = Date.now();
    state.elapsedMs = 0;
    renderMoves();
    startTimer();
  },
};
