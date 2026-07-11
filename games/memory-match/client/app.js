/**
 * app.js — Memory Match: a classic flip-two-cards concentration game.
 *
 * Solo only (no networking). Architecture:
 *  - state.cards is rebuilt from scratch every newGame() call (fresh
 *    shuffle, fresh DOM grid) rather than mutated in place, which is what
 *    guarantees "no leftover state" between rounds — there's nothing to
 *    leak because nothing survives a new round except the header/theme
 *    choice.
 *  - Grid size (rows/cols → pair count) and card theme are both
 *    user-selectable from the setup overlay; THEME_SYMBOLS provides 24
 *    symbols per theme, comfortably covering the largest grid (6x6 = 18
 *    pairs). The 'shapes' theme is plain CSS (clip-path/border-radius +
 *    a 3-color rotation) rather than glyphs, for visual variety against
 *    the three glyph-based themes (animals/letters/tiles).
 *  - Board is a fixed logical-pixel grid, scaled as a whole via CSS
 *    transform to fit the viewport with zero scrolling — same pattern as
 *    games/solitaire's fitBoard() / games/tic-tac-toe's fitBoard().
 */
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings } from './i18n.js';

const GAME_ID = 'memory-match';
const sfx = createOghSfx();

const MATCH_DELAY_MS = 260; // pause so a matched pair is visibly registered before it locks in
const MISMATCH_DELAY_MS = 800; // pause before flipping a non-matching pair back down

const CELL = 84;
const GAP = 10;

const GRID_SIZES = {
  easy: { cols: 4, rows: 4 },
  medium: { cols: 6, rows: 4 },
  hard: { cols: 6, rows: 6 },
};

// 24 symbols per theme — comfortably covers the largest grid (18 pairs).
// 'shapes' entries encode "shapeKind:colorIndex"; every other theme is a
// plain glyph string rendered as text (no image assets anywhere).
const THEME_SYMBOLS = {
  shapes: [
    'circle:0', 'square:1', 'triangle:2', 'diamond:0', 'pentagon:1', 'hexagon:2', 'star:0', 'cross:1',
    'circle:2', 'square:0', 'triangle:1', 'diamond:2', 'pentagon:0', 'hexagon:1', 'star:2', 'cross:0',
    'circle:1', 'square:2', 'triangle:0', 'diamond:1', 'pentagon:2', 'hexagon:0', 'star:1', 'cross:2',
  ],
  animals: [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
    '🐧', '🐦', '🐤', '🦉', '🦇', '🐺', '🐗', '🐴',
  ],
  letters: [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
    'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
    'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
  ],
  // Reuses games/mahjong's Unicode Mahjong Tiles glyphs (U+1F000-U+1F017),
  // already confirmed legible in-environment by that game — no image assets.
  tiles: [
    '🀀', '🀁', '🀂', '🀃', '🀄', '🀅', '🀆',
    '🀙', '🀚', '🀛', '🀜', '🀝', '🀞', '🀟', '🀠', '🀡',
    '🀐', '🀑', '🀒', '🀓', '🀔', '🀕', '🀖', '🀗',
  ],
};

function qs(name) {
  try {
    return new URLSearchParams(location.search).get(name);
  } catch {
    return null;
  }
}

// ---- DOM refs -------------------------------------------------------------
const boardEl = document.getElementById('board');
const stage = document.querySelector('.mm-stage');
const langSwitchEl = document.getElementById('langSwitch');

const movesVal = document.getElementById('movesVal');
const timeVal = document.getElementById('timeVal');
const pairsVal = document.getElementById('pairsVal');

const btnNewGame = document.getElementById('btnNewGame');
const btnChangeSetup = document.getElementById('btnChangeSetup');

const setupOverlay = document.getElementById('setupOverlay');
const gridChoices = Array.from(document.querySelectorAll('#gridChoices .choice-btn'));
const themeChoices = Array.from(document.querySelectorAll('#themeChoices .choice-btn'));
const btnStart = document.getElementById('btnStart');

const resultOverlay = document.getElementById('resultOverlay');
const resultStatsLine = document.getElementById('resultStatsLine');
const resultBestLine = document.getElementById('resultBestLine');
const btnPlayAgain = document.getElementById('btnPlayAgain');

// ---- scale-to-fit (no scrolling, ever) ---------------------------------
let boardW = 0;
let boardH = 0;
function fitBoard() {
  const availW = stage.clientWidth;
  const availH = stage.clientHeight;
  if (!availW || !availH || !boardW || !boardH) return;
  const scale = Math.min(availW / boardW, availH / boardH, 1.3) * 0.94;
  boardEl.style.transform = `scale(${scale})`;
}
if (typeof ResizeObserver === 'function') {
  new ResizeObserver(fitBoard).observe(stage);
}
window.addEventListener('resize', fitBoard);
window.addEventListener('orientationchange', fitBoard);

function applyGridCss(cols, rows) {
  boardW = cols * CELL + (cols - 1) * GAP;
  boardH = rows * CELL + (rows - 1) * GAP;
  boardEl.style.width = `${boardW}px`;
  boardEl.style.height = `${boardH}px`;
  boardEl.style.gridTemplateColumns = `repeat(${cols}, ${CELL}px)`;
  boardEl.style.gridTemplateRows = `repeat(${rows}, ${CELL}px)`;
  boardEl.style.gap = `${GAP}px`;
  fitBoard();
}

// ---- shuffle (Fisher-Yates) ---------------------------------------------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- state -----------------------------------------------------------
const state = {
  screen: 'setup', // 'setup' | 'play' | 'result'
  gridKey: 'easy',
  theme: 'shapes',
  cards: [], // [{ id, sym, matched, flipped }]
  firstIndex: null,
  secondIndex: null,
  locked: false, // true while a mismatched (or just-matched) pair is settling
  moves: 0,
  pairsFound: 0,
  totalPairs: 0,
  startedAt: 0,
  elapsedMs: 0,
};

let cardEls = [];
let timerHandle = null;
let matchTimer = null;
let flipBackTimer = null;
let pendingGrid = 'easy';
let pendingTheme = 'shapes';

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// ---- card face rendering --------------------------------------------
function paintCardFace(frontEl, theme, sym) {
  frontEl.innerHTML = '';
  frontEl.classList.remove('mm-glyph-letters');
  if (theme === 'shapes') {
    const [kind, color] = sym.split(':');
    const shape = document.createElement('span');
    shape.className = `mm-shape shape-${kind} mm-c${color}`;
    frontEl.appendChild(shape);
  } else {
    frontEl.textContent = sym;
    if (theme === 'letters') frontEl.classList.add('mm-glyph-letters');
  }
}

// ---- DOM grid build (rebuilt fresh every round — see file doc comment) --
function buildGridDom() {
  boardEl.innerHTML = '';
  cardEls = state.cards.map((card, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mm-card';
    btn.dataset.i = String(i);

    const inner = document.createElement('span');
    inner.className = 'mm-card-inner';

    const back = document.createElement('span');
    back.className = 'mm-card-face mm-card-back';

    const front = document.createElement('span');
    front.className = 'mm-card-face mm-card-front';
    paintCardFace(front, state.theme, card.sym);

    inner.appendChild(back);
    inner.appendChild(front);
    btn.appendChild(inner);
    btn.addEventListener('click', () => flipCard(i));
    boardEl.appendChild(btn);
    return btn;
  });
}

// ---- rendering -------------------------------------------------------
function renderCard(i) {
  const el = cardEls[i];
  const card = state.cards[i];
  if (!el || !card) return;
  el.classList.toggle('is-flipped', card.flipped && !card.matched);
  el.classList.toggle('is-matched', card.matched);
  // Disabled whenever already matched, the round isn't live, or a pair is
  // currently settling (state.locked) — including the two just-flipped
  // cards themselves, matching the top-of-flipCard() guard exactly so the
  // visual state never promises a click that would actually no-op.
  el.disabled = card.matched || state.locked || state.screen !== 'play';
}

function renderAll() {
  for (let i = 0; i < state.cards.length; i++) renderCard(i);
  renderMoves();
  renderProgress();
  renderTime();
}

function renderMoves() {
  movesVal.textContent = String(state.moves);
}
function renderProgress() {
  pairsVal.textContent = `${state.pairsFound}/${state.totalPairs}`;
}
function renderTime() {
  timeVal.textContent = formatTime(state.elapsedMs);
}

// ---- timer -------------------------------------------------------------
function startTimer() {
  clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    if (state.screen !== 'play') return;
    state.elapsedMs = Date.now() - state.startedAt;
    renderTime();
  }, 250);
}

// ---- round control ---------------------------------------------------
function newGame(gridKey, theme) {
  clearInterval(timerHandle);
  clearTimeout(matchTimer);
  clearTimeout(flipBackTimer);

  const { cols, rows } = GRID_SIZES[gridKey] || GRID_SIZES.easy;
  const totalPairs = (cols * rows) / 2;
  const symbols = (THEME_SYMBOLS[theme] || THEME_SYMBOLS.shapes).slice(0, totalPairs);
  const deck = shuffle(
    symbols.flatMap((sym, idx) => [
      { id: idx * 2, sym, matched: false, flipped: false },
      { id: idx * 2 + 1, sym, matched: false, flipped: false },
    ])
  );

  state.screen = 'play';
  state.gridKey = gridKey;
  state.theme = theme;
  state.cards = deck;
  state.firstIndex = null;
  state.secondIndex = null;
  state.locked = false;
  state.moves = 0;
  state.pairsFound = 0;
  state.totalPairs = totalPairs;
  state.startedAt = Date.now();
  state.elapsedMs = 0;

  hideResult();
  hideSetup();
  buildGridDom();
  applyGridCss(cols, rows);
  renderAll();
  startTimer();
}

function flipCard(i) {
  if (state.screen !== 'play' || state.locked) return;
  const card = state.cards[i];
  if (!card || card.matched || card.flipped) return;

  sfx.unlock();
  card.flipped = true;
  renderCard(i);
  sfx.play('tap');

  if (state.firstIndex === null) {
    state.firstIndex = i;
    return;
  }

  state.secondIndex = i;
  state.moves++;
  renderMoves();
  state.locked = true;
  // Re-render every card so the "not the flipped pair" disabled state
  // (see renderCard's `state.locked && !card.flipped` clause) takes effect
  // immediately instead of only on the next unrelated render.
  renderAll();

  const idxA = state.firstIndex;
  const idxB = state.secondIndex;
  const a = state.cards[idxA];
  const b = state.cards[idxB];

  if (a.sym === b.sym) {
    matchTimer = setTimeout(() => {
      a.matched = true;
      b.matched = true;
      state.pairsFound++;
      state.firstIndex = null;
      state.secondIndex = null;
      state.locked = false;
      renderCard(idxA);
      renderCard(idxB);
      renderProgress();
      sfx.play('pickup');
      if (state.pairsFound === state.totalPairs) {
        finishGame();
      } else {
        renderAll(); // re-enable the rest of the board
      }
    }, MATCH_DELAY_MS);
  } else {
    flipBackTimer = setTimeout(() => {
      a.flipped = false;
      b.flipped = false;
      state.firstIndex = null;
      state.secondIndex = null;
      state.locked = false;
      sfx.play('die');
      renderAll();
    }, MISMATCH_DELAY_MS);
  }
}

function finishGame() {
  clearInterval(timerHandle);
  state.screen = 'result';
  state.elapsedMs = Date.now() - state.startedAt;
  renderTime();
  sfx.play('win');
  const best = saveBest();
  showResult(best);
}

// ---- best score (local-only, per grid size) ----------------------------
function saveBest() {
  let progress = {};
  try {
    progress = OGHProfile.getProgress(GAME_ID) || {};
  } catch { /* ignore */ }
  const key = state.gridKey;
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
      summary: `${key}: ${next[key].bestMoves} moves · ${formatTime(next[key].bestTimeMs)}`,
    });
  } catch { /* best-effort, never block the game on storage failures */ }
  return { isNewBestMoves, isNewBestTime };
}

// ---- overlays ----------------------------------------------------------
function showSetup() {
  setupOverlay.hidden = false;
}
function hideSetup() {
  setupOverlay.hidden = true;
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
  resultBestLine.textContent = bestKey ? t(currentLang, bestKey) : '';
  resultOverlay.hidden = false;
}
function hideResult() {
  resultOverlay.hidden = true;
}

function selectGrid(key) {
  pendingGrid = key;
  gridChoices.forEach((b) => b.classList.toggle('is-on', b.dataset.grid === key));
}
function selectTheme(key) {
  pendingTheme = key;
  themeChoices.forEach((b) => b.classList.toggle('is-on', b.dataset.theme === key));
}

// ---- i18n wiring --------------------------------------------------------
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
  if (state.screen === 'result') showResult({ isNewBestMoves: false, isNewBestTime: false });
}

// ---- button wiring --------------------------------------------------------
gridChoices.forEach((btn) => btn.addEventListener('click', () => selectGrid(btn.dataset.grid)));
themeChoices.forEach((btn) => btn.addEventListener('click', () => selectTheme(btn.dataset.theme)));
btnStart.addEventListener('click', () => newGame(pendingGrid, pendingTheme));
btnNewGame.addEventListener('click', () => newGame(state.gridKey, state.theme));
btnChangeSetup.addEventListener('click', () => {
  selectGrid(state.gridKey);
  selectTheme(state.theme);
  showSetup();
});
btnPlayAgain.addEventListener('click', () => newGame(state.gridKey, state.theme));

// ---- debug/test hook, same convention as sibling games (e.g.
// games/solitaire's window.OGH_SOLITAIRE) — also what the hub's manual
// test pass uses to drive/inspect the game without clicking through the UI.
window.OGH_MEMORY = {
  getState: () => state,
  setState(patch) {
    Object.assign(state, patch);
    renderAll();
  },
  newGame,
  flipCard,
  renderAll,
  fitBoard,
};

// ---- kickoff --------------------------------------------------------------
buildLangSwitch();
applyStaticStrings(currentLang);
selectGrid(pendingGrid);
selectTheme(pendingTheme);
showSetup();
