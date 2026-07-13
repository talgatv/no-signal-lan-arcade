/**
 * app.js — Tic-Tac-Toe: board state/rendering, a minimax AI, same-device
 * pass-and-play, and LAN multiplayer over OGHNet.
 *
 * Architecture:
 *  - Pure game logic (checkResult / minimax / pickAiMove) never touches the
 *    DOM or the network — it's plain functions over a 9-cell array, so it
 *    can be driven directly (see window.OGH_TTT below) for exhaustive
 *    testing without going through click events.
 *  - Three modes share one `state` + `placeMark()`:
 *      'ai'    — human is always one mark, AI (minimax) is the other; who
 *                leads alternates each round so the AI's first-move
 *                strength gets exercised too.
 *      'local' — pass-and-play on one device; any tap applies to whichever
 *                mark's turn it currently is.
 *      'lan'   — OGHNet room; the first joiner (index 0 in the roster) is
 *                X, the second is O, anyone after that spectates. Moves are
 *                relayed as {action:'move', payload:{index, mark}}; the
 *                receiving side re-derives whose turn it SHOULD be from its
 *                own local board rather than trusting the sender, so a
 *                stale/duplicate WebSocket delivery (reconnect, etc.) can
 *                never desync the two boards.
 *  - If OGHNet can't reach a host (offline / no pc/host.py running), 'lan'
 *    mode gracefully degrades to local pass-and-play on the one device.
 */
import { OGHNet } from '../../_shared/js/ogh-net.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings } from './i18n.js';

const GAME_ID = 'tic-tac-toe';
const AI_MOVE_DELAY_MS = 480;
const sfx = createOghSfx();

function qs(name) {
  try {
    return new URLSearchParams(location.search).get(name);
  } catch {
    return null;
  }
}

// ---- DOM refs -------------------------------------------------------------
const boardEl = document.getElementById('board');
const stage = document.querySelector('.ttt-stage');
const cellEls = Array.from(document.querySelectorAll('.ttt-cell'));
const netPill = document.getElementById('netPill');
const turnPill = document.getElementById('turnPill');
const scorePill = document.getElementById('scorePill');
const langSwitchEl = document.getElementById('langSwitch');

const modeOverlay = document.getElementById('modeOverlay');
const modeList = document.getElementById('modeList');
const diffList = document.getElementById('diffList');
const btnModeAi = document.getElementById('btnModeAi');
const btnModeLocal = document.getElementById('btnModeLocal');
const btnModeLan = document.getElementById('btnModeLan');
const btnDiffBack = document.getElementById('btnDiffBack');
const diffBtns = Array.from(document.querySelectorAll('.diff-btn'));

const resultOverlay = document.getElementById('resultOverlay');
const resultTitle = document.getElementById('resultTitle');
const resultStatsLine = document.getElementById('resultStatsLine');
const btnPlayAgain = document.getElementById('btnPlayAgain');

const btnMenu = document.getElementById('btnMenu');
const btnNew = document.getElementById('btnNew');

// ---- scale-to-fit (no scrolling, ever) -------------------------------
// .ttt-board is a fixed logical-pixel 3x3 grid; fitBoard() scales it as a
// whole via CSS transform to fit whatever real viewport is available — same
// "virtual viewport" idea as games/solitaire's .sol-board / fitBoard().
const BOARD_W = 3 * 120 + 2 * 12;
const BOARD_H = BOARD_W;
let currentScale = 1;
function fitBoard() {
  const availW = stage.clientWidth;
  const availH = stage.clientHeight;
  if (!availW || !availH) return;
  currentScale = Math.min(availW / BOARD_W, availH / BOARD_H, 1.4) * 0.94;
  boardEl.style.transform = `scale(${currentScale})`;
}
if (typeof ResizeObserver === 'function') {
  new ResizeObserver(fitBoard).observe(stage);
}
window.addEventListener('resize', fitBoard);
window.addEventListener('orientationchange', fitBoard);

// ---- pure game logic --------------------------------------------------
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function otherMark(m) {
  return m === 'X' ? 'O' : 'X';
}

function availableMoves(board) {
  const out = [];
  for (let i = 0; i < 9; i++) if (!board[i]) out.push(i);
  return out;
}

/** @returns {{ winner: 'X'|'O'|'draw'|null, line: number[]|null }} */
function checkResult(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every((c) => c !== null)) return { winner: 'draw', line: null };
  return { winner: null, line: null };
}

/**
 * Plain minimax — tic-tac-toe's whole tree is at most a few hundred
 * thousand nodes (9! worst case), trivial to solve exhaustively without
 * alpha-beta. Score is depth-adjusted (10-depth / depth-10) so the AI
 * prefers the fastest win and the slowest loss among equally-good lines,
 * and always takes a draw over any loss.
 */
function minimaxScore(board, mark, aiMark, depth) {
  const { winner } = checkResult(board);
  if (winner === aiMark) return 10 - depth;
  if (winner === 'draw') return 0;
  if (winner) return depth - 10;

  let best = mark === aiMark ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = mark;
    const score = minimaxScore(board, otherMark(mark), aiMark, depth + 1);
    board[i] = null;
    best = mark === aiMark ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

/**
 * Full-strength move: always optimal. Ties are broken at random purely for
 * variety — every tied move is, by construction of minimax, equally good,
 * so random tie-breaking can never turn a winning/drawing move into a
 * losing one.
 */
function bestMoveMinimax(board, aiMark) {
  let best = -Infinity;
  let picks = [];
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = aiMark;
    const score = minimaxScore(board, otherMark(aiMark), aiMark, 1);
    board[i] = null;
    if (score > best) {
      best = score;
      picks = [i];
    } else if (score === best) {
      picks.push(i);
    }
  }
  return picks[(Math.random() * picks.length) | 0];
}

// Chance of playing a random legal move instead of the optimal one, per
// difficulty. 'unbeatable' is NEVER consulted for this — see the explicit
// `difficulty !== 'unbeatable'` guard in pickAiMove below. That guard (not
// this table being zero) is what guarantees "unbeatable" can never lose;
// a future edit to this table alone cannot weaken it.
const AI_RANDOM_CHANCE = { easy: 0.65, medium: 0.25, unbeatable: 0 };

/** @returns {number} a legal cell index, or -1 if the board is full */
function pickAiMove(board, aiMark, difficulty) {
  const legal = availableMoves(board);
  if (!legal.length) return -1;
  if (difficulty !== 'unbeatable') {
    const chance = AI_RANDOM_CHANCE[difficulty] ?? 0;
    if (Math.random() < chance) {
      return legal[(Math.random() * legal.length) | 0];
    }
  }
  return bestMoveMinimax(board, aiMark);
}

// ---- state ---------------------------------------------------------------
function emptyBoard() {
  return Array(9).fill(null);
}

const state = {
  mode: 'menu', // 'menu' | 'ai' | 'local' | 'lan'
  difficulty: 'unbeatable',
  board: emptyBoard(),
  turn: 'X',
  winner: null,
  winLine: null,
  humanMark: 'X', // 'ai' mode only — toggles each round so the AI leads sometimes too
  myMark: 'X', // 'lan' mode only — fixed for the session (first joiner = X)
  score: { X: 0, O: 0, draw: 0 },
};

let net = null;
let aiTimer = null;

function inRound() {
  return state.mode !== 'menu';
}

function computeMyMark() {
  if (!net || net.mode !== 'online') return 'X';
  const idx = (net.players || []).findIndex((p) => p.id === net.playerId);
  if (idx === 0) return 'X';
  if (idx === 1) return 'O';
  return null; // 3rd+ joiner: spectator
}

function isMyClickableTurn() {
  if (state.winner) return false;
  if (state.mode === 'local') return true;
  if (state.mode === 'ai') return state.turn === state.humanMark;
  if (state.mode === 'lan') {
    if (!net) return false;
    if (net.mode !== 'online') return true; // offline fallback: local pass-and-play
    if ((net.players || []).length < 2) return false;
    if (!state.myMark) return false; // spectator
    return state.turn === state.myMark;
  }
  return false;
}

function describeResult() {
  const w = state.winner;
  if (w === 'draw') return { key: 'drawTitle' };
  if (state.mode === 'ai') return { key: w === state.humanMark ? 'youWinTitle' : 'aiWinTitle' };
  if (state.mode === 'lan') return { key: w === state.myMark ? 'youWinTitle' : 'oppWinTitle' };
  return { key: 'markWinTitle', vars: { mark: w } };
}

function turnText() {
  if (!inRound() || state.winner) return '';
  if (state.mode === 'local') return t(currentLang, 'turnMark', { mark: state.turn });
  if (state.mode === 'ai') {
    return state.turn === state.humanMark
      ? t(currentLang, 'turnYours', { mark: state.humanMark })
      : t(currentLang, 'turnAiThinking');
  }
  if (state.mode === 'lan') {
    if (!net) return '';
    if (net.mode !== 'online') return t(currentLang, 'turnMark', { mark: state.turn });
    if ((net.players || []).length < 2) return t(currentLang, 'waitingOpponent', { room: net.room });
    if (!state.myMark) return t(currentLang, 'spectatorNote');
    return state.turn === state.myMark
      ? t(currentLang, 'turnYours', { mark: state.myMark })
      : t(currentLang, 'turnTheirs', { mark: otherMark(state.myMark) });
  }
  return '';
}

// ---- rendering -------------------------------------------------------
function render() {
  const canPlay = inRound() && !state.winner && isMyClickableTurn();
  for (let i = 0; i < 9; i++) {
    const el = cellEls[i];
    const mark = state.board[i];
    el.textContent = mark || '';
    el.classList.toggle('mark-x', mark === 'X');
    el.classList.toggle('mark-o', mark === 'O');
    el.classList.toggle('is-win', !!(state.winLine && state.winLine.includes(i)));
    const clickable = canPlay && !mark;
    el.disabled = !clickable;
    el.classList.toggle('is-playable', clickable);
  }
  updateHud();
}

function updateHud() {
  if (net) {
    netPill.textContent = net.mode === 'online'
      ? `ONLINE · ${net.room} · ${(net.players || []).length}p`
      : 'OFFLINE';
  } else {
    netPill.textContent = '…';
  }
  turnPill.textContent = turnText();
  scorePill.textContent = t(currentLang, 'scoreLine', {
    x: state.score.X,
    o: state.score.O,
    d: state.score.draw,
  });
}

function showResult() {
  const { key, vars } = describeResult();
  resultTitle.textContent = t(currentLang, key, vars);
  resultStatsLine.textContent = t(currentLang, 'resultStats', {
    x: state.score.X,
    o: state.score.O,
    d: state.score.draw,
  });
  resultOverlay.hidden = false;
}
function hideResult() {
  resultOverlay.hidden = true;
}

function showModeOverlay() {
  modeList.hidden = false;
  diffList.hidden = true;
  modeOverlay.hidden = false;
}
function hideModeOverlay() {
  modeOverlay.hidden = true;
}

// ---- round control ---------------------------------------------------
function startRound() {
  clearTimeout(aiTimer);
  state.board = emptyBoard();
  state.turn = 'X';
  state.winner = null;
  state.winLine = null;
  hideResult();
  render();
  if (state.mode === 'ai' && state.humanMark !== 'X') {
    scheduleAiMove();
  }
}

function newRound(opts = {}) {
  const broadcast = opts.broadcast !== false;
  if (state.mode === 'ai') {
    state.humanMark = otherMark(state.humanMark); // alternate who leads
  }
  startRound();
  if (state.mode === 'lan' && broadcast && net && net.mode === 'online') {
    net.send('reset', {});
  }
}

function chooseMode(mode) {
  state.mode = mode;
  state.score = { X: 0, O: 0, draw: 0 };
  state.humanMark = 'X';
  if (mode === 'lan') state.myMark = computeMyMark();
  hideModeOverlay();
  startRound();
}

function finishRound() {
  sfx.play(state.winner === 'draw' ? 'tick' : 'win');
  render();
  showResult();
  try {
    OGHProfile.saveProgress(GAME_ID, { score: state.score }, {
      summary: `X ${state.score.X} · O ${state.score.O} · Draws ${state.score.draw}`,
    });
  } catch { /* best-effort, never block the game on storage failures */ }
}

// ---- input -------------------------------------------------------------
function placeMark(i, mark, opts = {}) {
  const broadcast = !!opts.broadcast;
  state.board[i] = mark;
  sfx.play('tap');
  const { winner, line } = checkResult(state.board);
  if (winner) {
    state.winner = winner;
    state.winLine = line;
    if (winner === 'draw') state.score.draw++;
    else state.score[winner]++;
  } else {
    state.turn = otherMark(mark);
  }
  render();
  if (broadcast && net && net.mode === 'online') {
    net.send('move', { index: i, mark });
  }
  if (winner) {
    finishRound();
  } else if (state.mode === 'ai' && state.turn !== state.humanMark) {
    scheduleAiMove();
  }
}

function scheduleAiMove() {
  clearTimeout(aiTimer);
  aiTimer = setTimeout(() => {
    if (state.mode !== 'ai' || state.winner) return;
    const aiMark = otherMark(state.humanMark);
    const i = pickAiMove(state.board, aiMark, state.difficulty);
    if (i === -1) return;
    placeMark(i, aiMark, { broadcast: false });
  }, AI_MOVE_DELAY_MS);
}

function onCellClick(i) {
  sfx.unlock();
  if (!inRound() || state.winner || state.board[i]) return;
  if (state.mode === 'local') {
    placeMark(i, state.turn, { broadcast: false });
  } else if (state.mode === 'ai') {
    if (state.turn !== state.humanMark) return;
    placeMark(i, state.humanMark, { broadcast: false });
  } else if (state.mode === 'lan') {
    if (!net) return;
    if (net.mode !== 'online') {
      placeMark(i, state.turn, { broadcast: false }); // offline: local pass-and-play
      return;
    }
    if ((net.players || []).length < 2 || !state.myMark) return;
    if (state.turn !== state.myMark) return;
    placeMark(i, state.myMark, { broadcast: true });
  }
}

// ---- LAN multiplayer wiring --------------------------------------------
function onNetChange() {
  if (state.mode === 'lan') state.myMark = computeMyMark();
  render();
}

function onNetAction({ action, payload, from }) {
  if (state.mode !== 'lan') return;
  if (from === net.playerId) return; // defensive; host already excludes the sender
  if (action === 'move') applyRemoteMove(payload);
  else if (action === 'reset') startRound();
}

/**
 * Apply a move relayed from the other player. Re-derives whose turn it
 * SHOULD be from our own local board instead of trusting the sender, and
 * ignores anything that doesn't fit — protects against a stale/duplicate
 * WebSocket delivery (e.g. a reconnect) permanently desyncing the two
 * boards for the round.
 */
function applyRemoteMove(payload) {
  if (!payload) return;
  const { index, mark } = payload;
  if (state.winner) return;
  if (typeof index !== 'number' || index < 0 || index > 8) return;
  if (mark !== 'X' && mark !== 'O') return;
  if (state.board[index]) return;
  if (mark !== state.turn) return;
  placeMark(index, mark, { broadcast: false });
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
  render();
  if (!resultOverlay.hidden) showResult();
}

// ---- button wiring --------------------------------------------------------
cellEls.forEach((el, i) => el.addEventListener('click', () => onCellClick(i)));

btnModeAi.addEventListener('click', () => {
  sfx.unlock();
  sfx.play('tap');
  modeList.hidden = true;
  diffList.hidden = false;
});
btnDiffBack.addEventListener('click', () => {
  diffList.hidden = true;
  modeList.hidden = false;
});
diffBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    sfx.play('tap');
    state.difficulty = btn.dataset.diff;
    chooseMode('ai');
  });
});
btnModeLocal.addEventListener('click', () => {
  sfx.unlock();
  sfx.play('tap');
  chooseMode('local');
});
btnModeLan.addEventListener('click', () => {
  sfx.unlock();
  sfx.play('tap');
  chooseMode('lan');
});

btnMenu.addEventListener('click', showModeOverlay);
btnNew.addEventListener('click', () => newRound());
btnPlayAgain.addEventListener('click', () => newRound());

// ---- debug/test hook, same convention as sibling games (e.g.
// games/solitaire's window.OGH_SOLITAIRE) — also what the hub's manual
// test pass uses to drive/inspect games without clicking through the UI. --
window.OGH_TTT = {
  getState: () => state,
  setState(patch) {
    Object.assign(state, patch);
    render();
  },
  getNet: () => net,
  /** Pure: does not touch state or the DOM. */
  checkResult,
  /** Pure: does not touch state or the DOM. */
  bestMove: pickAiMove,
  click: onCellClick,
  chooseMode,
  newRound,
  render,
  fitBoard,
};

// ---- kickoff --------------------------------------------------------------
boardEl.style.width = `${BOARD_W}px`;
boardEl.style.height = `${BOARD_H}px`;
fitBoard();
buildLangSwitch();
applyStaticStrings(currentLang);
render();

(async () => {
  net = await OGHNet.connect({
    gameId: GAME_ID,
    name: qs('name') || OGHProfile.getNickname(),
  });
  net.on('mode', onNetChange);
  net.on('players', onNetChange);
  net.on('hello', onNetChange);
  net.on('action', onNetAction);
  onNetChange();
})();
