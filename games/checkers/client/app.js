/**
 * app.js — Checkers: board state, rendering, interactive (multi-jump-aware)
 * input, a minimax AI opponent, same-device pass-and-play, and LAN
 * multiplayer over OGHNet.
 *
 * The rules (rules.js) and AI (ai.js) are pure and DOM/network-free; this
 * file is only orchestration + presentation, the same split as
 * games/tic-tac-toe.
 *
 * Modes share one `state` and one hop primitive (doHop):
 *   'ai'    — human is Cyan (moves first, bottom), AI is Pink.
 *   'local' — pass-and-play; whichever color's turn it is may move.
 *   'lan'   — OGHNet room; first joiner is Cyan, second is Pink, later
 *             joiners spectate. Each individual hop is relayed as
 *             {action:'step', payload:{from,to}}; a multi-jump is several
 *             hops. The receiver re-derives whose turn (and whether a chain
 *             is in progress) from its OWN board before applying, so a
 *             stale/duplicate relayed hop can never desync the two boards.
 *   If OGHNet can't reach a host, 'lan' degrades to local pass-and-play.
 */
import { OGHNet } from '../../_shared/js/ogh-net.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import {
  initialBoard, legalMoves, applyHop, captureStepsFrom, stepTargets,
  hasAnyCapture, winnerAtTurn, countPieces, other, row, col, isDark, CELLS,
} from './rules.js';
import { pickMove, DIFFICULTY } from './ai.js';
import { LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings } from './i18n.js';

const GAME_ID = 'checkers';
const AI_MOVE_DELAY_MS = 480; // pause before the AI starts its move
const AI_HOP_DELAY_MS = 320; // pause between hops of an AI multi-jump
const NO_PROGRESS_DRAW = 80; // plies without a capture/promotion => draw (40-move rule)
const sfx = createOghSfx();

function qs(name) {
  try { return new URLSearchParams(location.search).get(name); } catch { return null; }
}

// ---- DOM refs -------------------------------------------------------------
const boardEl = document.getElementById('board');
const stage = document.querySelector('.ck-stage');
const netPill = document.getElementById('netPill');
const turnPill = document.getElementById('turnPill');
const countPill = document.getElementById('countPill');
const hintEl = document.getElementById('hint');
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

// ---- state ---------------------------------------------------------------
const state = {
  mode: 'menu', // 'menu' | 'ai' | 'local' | 'lan'
  difficulty: 'medium',
  board: initialBoard(),
  turn: 'c', // 'c' moves first
  selected: null, // index of selected piece
  chainFrom: null, // index a multi-jump must continue from (locks the piece)
  winner: null, // 'c' | 'p' | 'draw' | null
  humanColor: 'c', // 'ai' mode: human is always Cyan
  myColor: 'c', // 'lan' mode: 'c' | 'p' | null(spectator)
  wins: { c: 0, p: 0 },
  progress: false, // did the current turn capture/promote?
  movesSinceProgress: 0,
};

let net = null;
let aiTimer = null;
let aiThinking = false;
let currentLang = detectLang();

const inRound = () => state.mode !== 'menu';
const lanIsOnline = () => state.mode === 'lan' && net && net.mode === 'online';

// ---- scale-to-fit (no scrolling, ever) — games/tic-tac-toe fitBoard() -----
const BOARD_PX = 512;
function fitBoard() {
  const availW = stage.clientWidth;
  const availH = stage.clientHeight;
  if (!availW || !availH) return;
  const scale = Math.min(availW / BOARD_PX, availH / BOARD_PX, 1.25) * 0.96;
  boardEl.style.transform = `scale(${scale})`;
}
if (typeof ResizeObserver === 'function') new ResizeObserver(fitBoard).observe(stage);
window.addEventListener('resize', fitBoard);
window.addEventListener('orientationchange', fitBoard);

// ---- board DOM (built once) ----------------------------------------------
const sqEls = [];
function buildBoardDom() {
  boardEl.innerHTML = '';
  for (let i = 0; i < CELLS; i++) {
    const sq = document.createElement('div');
    sq.className = `ck-sq ${isDark(row(i), col(i)) ? 'is-dark' : 'is-light'}`;
    sq.dataset.i = String(i);
    if (isDark(row(i), col(i))) sq.addEventListener('click', () => onSquareTap(i));
    boardEl.appendChild(sq);
    sqEls[i] = sq;
  }
}

// ---- LAN helpers ----------------------------------------------------------
function computeMyColor() {
  if (!net || net.mode !== 'online') return 'c';
  const i = (net.players || []).findIndex((p) => p.id === net.playerId);
  if (i === 0) return 'c';
  if (i === 1) return 'p';
  return null; // 3rd+ joiner spectates
}

function canHumanAct() {
  if (!inRound() || state.winner) return false;
  if (aiThinking) return false;
  if (state.mode === 'ai') return state.turn === state.humanColor;
  if (state.mode === 'local') return true;
  if (state.mode === 'lan') {
    if (!net) return false;
    if (net.mode !== 'online') return true; // offline fallback = local pass & play
    if ((net.players || []).length < 2) return false;
    if (!state.myColor) return false; // spectator
    return state.turn === state.myColor;
  }
  return false;
}

// ---- core move primitive --------------------------------------------------
/** Apply one hop (from->to). Handles capture chains, promotion, turn end. */
function doHop(from, to, opts = {}) {
  const res = applyHop(state.board, from, to);
  if (res.captured != null || res.promote) state.progress = true;
  if (res.promote) sfx.play('pickup');
  else if (res.captured != null) sfx.play('clack');
  else sfx.play('place');

  if (opts.broadcast && lanIsOnline()) net.send('step', { from, to });

  const color = state.board[to].color;
  // A capture that isn't a crowning move and has a further jump must continue.
  if (res.captured != null && !res.promote && captureStepsFrom(state.board, to, color).length) {
    state.chainFrom = to;
    state.selected = to;
    render();
    return;
  }
  state.chainFrom = null;
  state.selected = null;
  endTurn(color);
}

function endTurn(justMoved) {
  if (state.progress) state.movesSinceProgress = 0;
  else state.movesSinceProgress++;
  state.progress = false;
  state.turn = other(justMoved);
  state.selected = null;
  state.chainFrom = null;

  if (state.movesSinceProgress >= NO_PROGRESS_DRAW) { finishGame('draw'); return; }
  const w = winnerAtTurn(state.board, state.turn);
  if (w) { finishGame(w); return; }

  render();
  if (state.mode === 'ai' && state.turn !== state.humanColor) scheduleAi();
}

function finishGame(winner) {
  state.winner = winner;
  if (winner === 'c') state.wins.c++;
  else if (winner === 'p') state.wins.p++;
  sfx.play('win');
  render();
  showResult();
  try {
    OGHProfile.saveProgress(GAME_ID, { wins: state.wins }, {
      summary: `Cyan ${state.wins.c} · Pink ${state.wins.p}`,
    });
  } catch { /* best-effort */ }
}

// ---- input ----------------------------------------------------------------
function onSquareTap(i) {
  sfx.unlock();
  if (!canHumanAct()) return;
  const b = state.board;
  const color = state.turn;

  // Mid multi-jump: only continuation captures of the locked piece are legal.
  if (state.chainFrom !== null) {
    if (captureStepsFrom(b, state.chainFrom, color).some((s) => s.to === i)) {
      doHop(state.chainFrom, i, { broadcast: true });
    }
    return;
  }

  const mustCap = hasAnyCapture(b, color);
  const cell = b[i];

  if (cell && cell.color === color) {
    // (Re)select this piece if it actually has a legal step this turn.
    if (stepTargets(b, i, color, mustCap).length) {
      state.selected = state.selected === i ? null : i;
    } else {
      state.selected = null; // e.g. a non-capturing piece while capture is forced
    }
    render();
    return;
  }

  // Otherwise: try to move the selected piece onto this square.
  if (state.selected !== null) {
    const hit = stepTargets(b, state.selected, color, mustCap).find((s) => s.to === i);
    if (hit) doHop(state.selected, i, { broadcast: true });
  }
}

// ---- AI -------------------------------------------------------------------
function scheduleAi() {
  clearTimeout(aiTimer);
  aiThinking = true;
  render();
  aiTimer = setTimeout(() => {
    if (state.mode !== 'ai' || state.winner) { aiThinking = false; return; }
    const aiColor = other(state.humanColor);
    const move = pickMove(state.board, aiColor, DIFFICULTY[state.difficulty]);
    if (!move) {
      aiThinking = false;
      const w = winnerAtTurn(state.board, aiColor);
      if (w) finishGame(w);
      return;
    }
    playSequence(move);
  }, AI_MOVE_DELAY_MS);
}

/** Play a full AI move (its chosen path) hop-by-hop with small delays. */
function playSequence(move) {
  aiThinking = true;
  const path = move.path;
  let k = 1;
  const stepOne = () => {
    if (state.mode !== 'ai' || state.winner) { aiThinking = false; return; }
    doHop(path[k - 1], path[k], { broadcast: false });
    k += 1;
    if (k < path.length && !state.winner) {
      aiTimer = setTimeout(stepOne, AI_HOP_DELAY_MS);
    } else {
      aiThinking = false;
      render();
    }
  };
  stepOne();
}

// ---- rendering ------------------------------------------------------------
function render() {
  const b = state.board;
  const canAct = canHumanAct();
  const color = state.turn;
  const mustCap = inRound() && !state.winner ? hasAnyCapture(b, color) : false;

  // Targets for the currently active (selected or chain-locked) piece.
  const active = state.chainFrom !== null ? state.chainFrom : state.selected;
  const targets = new Map(); // to -> isCapture
  if (active !== null && canAct) {
    const steps = state.chainFrom !== null
      ? captureStepsFrom(b, state.chainFrom, color)
      : stepTargets(b, state.selected, color, mustCap);
    for (const s of steps) targets.set(s.to, s.captured != null);
  }

  for (let i = 0; i < CELLS; i++) {
    const sq = sqEls[i];
    sq.classList.remove('is-selected', 'is-target', 'is-capture-target', 'is-playable');
    sq.innerHTML = '';
    const p = b[i];
    if (p) {
      const el = document.createElement('div');
      el.className = `ck-piece ${p.color}${p.king ? ' king' : ''}`;
      // Pulse own pieces that can capture when nothing is selected yet, so the
      // mandatory-capture rule is visually obvious.
      if (mustCap && canAct && active === null && p.color === color
          && captureStepsFrom(b, i, color).length) {
        el.classList.add('can-capture');
      }
      sq.appendChild(el);
    }
    if (active === i) sq.classList.add('is-selected');
    if (targets.has(i)) sq.classList.add(targets.get(i) ? 'is-capture-target' : 'is-target');
    if (canAct && isDark(row(i), col(i))) {
      const selfSelectable = p && p.color === color && stepTargets(b, i, color, mustCap).length;
      if (selfSelectable || targets.has(i)) sq.classList.add('is-playable');
    }
  }
  updateHud(mustCap, canAct);
}

function updateHud(mustCap, canAct) {
  netPill.textContent = net
    ? (net.mode === 'online' ? `ONLINE · ${net.room} · ${(net.players || []).length}p` : 'OFFLINE')
    : '…';
  turnPill.textContent = turnText();
  const cc = countPieces(state.board, 'c');
  const pc = countPieces(state.board, 'p');
  countPill.innerHTML = `<span class="ck-dot-c">◆</span> ${cc} · <span class="ck-dot-p">◆</span> ${pc}`;

  let hk = 'hint';
  if (inRound() && !state.winner) {
    if (state.chainFrom !== null && canAct) hk = 'hintChain';
    else if (mustCap && canAct) hk = 'hintCapture';
  }
  hintEl.textContent = t(currentLang, hk);
}

function colorWord(c) {
  return t(currentLang, c === 'c' ? 'colorCyan' : 'colorPink');
}

function turnText() {
  if (!inRound() || state.winner) return '';
  if (state.mode === 'ai') {
    return state.turn === state.humanColor
      ? t(currentLang, 'turnYours')
      : t(currentLang, 'turnAiThinking');
  }
  if (state.mode === 'local') return t(currentLang, 'turnToMove', { color: colorWord(state.turn) });
  if (state.mode === 'lan') {
    if (!net || net.mode !== 'online') return t(currentLang, 'turnToMove', { color: colorWord(state.turn) });
    if ((net.players || []).length < 2) return t(currentLang, 'waitingOpponent', { room: net.room });
    if (!state.myColor) return t(currentLang, 'spectatorNote');
    return state.turn === state.myColor ? t(currentLang, 'turnYours') : t(currentLang, 'turnOpp');
  }
  return '';
}

function describeResult() {
  const w = state.winner;
  if (w === 'draw') return { key: 'drawTitle' };
  if (state.mode === 'ai') return { key: w === state.humanColor ? 'youWinTitle' : 'aiWinTitle' };
  if (state.mode === 'lan' && state.myColor) return { key: w === state.myColor ? 'youWinTitle' : 'oppWinTitle' };
  return { key: 'colorWinsTitle', vars: { color: colorWord(w) } };
}

function showResult() {
  const { key, vars } = describeResult();
  resultTitle.textContent = t(currentLang, key, vars);
  resultStatsLine.textContent = t(currentLang, 'winsLine', { c: state.wins.c, p: state.wins.p });
  resultOverlay.hidden = false;
}
function hideResult() { resultOverlay.hidden = true; }
function showModeOverlay() { modeList.hidden = false; diffList.hidden = true; modeOverlay.hidden = false; }
function hideModeOverlay() { modeOverlay.hidden = true; }

// ---- round control --------------------------------------------------------
function startGame() {
  clearTimeout(aiTimer);
  aiThinking = false;
  state.board = initialBoard();
  state.turn = 'c';
  state.selected = null;
  state.chainFrom = null;
  state.winner = null;
  state.progress = false;
  state.movesSinceProgress = 0;
  hideResult();
  render();
  // In 'ai' mode the human is Cyan and always moves first, so no AI kickoff.
}

function newGame(opts = {}) {
  const broadcast = opts.broadcast !== false;
  startGame();
  if (state.mode === 'lan' && broadcast && lanIsOnline()) net.send('newgame', {});
}

function chooseMode(mode) {
  state.mode = mode;
  state.wins = { c: 0, p: 0 };
  state.humanColor = 'c';
  if (mode === 'lan') state.myColor = computeMyColor();
  hideModeOverlay();
  startGame();
}

// ---- LAN wiring -----------------------------------------------------------
function onNetChange() {
  if (state.mode === 'lan') state.myColor = computeMyColor();
  render();
}

function onNetAction({ action, payload, from }) {
  if (state.mode !== 'lan') return;
  if (from === net.playerId) return; // host already excludes the sender; defensive
  if (action === 'step') applyRemoteStep(payload);
  else if (action === 'newgame') startGame();
}

/**
 * Apply a hop relayed from the other player. Validates it against our OWN
 * board/turn/chain state and ignores anything that doesn't fit, so a stale or
 * duplicate delivery can't desync the boards.
 */
function applyRemoteStep(payload) {
  if (!payload || state.winner) return;
  const { from, to } = payload;
  if (typeof from !== 'number' || typeof to !== 'number') return;
  const b = state.board;
  const color = state.turn;
  if (state.chainFrom !== null) {
    if (from !== state.chainFrom) return;
    if (!captureStepsFrom(b, state.chainFrom, color).some((s) => s.to === to)) return;
  } else {
    const p = b[from];
    if (!p || p.color !== color) return;
    if (!stepTargets(b, from, color, hasAnyCapture(b, color)).some((s) => s.to === to)) return;
  }
  doHop(from, to, { broadcast: false });
}

// ---- i18n wiring ----------------------------------------------------------
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
btnModeAi.addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); modeList.hidden = true; diffList.hidden = false; });
btnDiffBack.addEventListener('click', () => { diffList.hidden = true; modeList.hidden = false; });
diffBtns.forEach((btn) => btn.addEventListener('click', () => {
  sfx.play('tap');
  state.difficulty = btn.dataset.diff;
  chooseMode('ai');
}));
btnModeLocal.addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); chooseMode('local'); });
btnModeLan.addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); chooseMode('lan'); });
btnMenu.addEventListener('click', showModeOverlay);
btnNew.addEventListener('click', () => newGame());
btnPlayAgain.addEventListener('click', () => newGame());

// ---- test/debug hook (same convention as window.OGH_TTT) ------------------
window.OGH_CHECKERS = {
  getState: () => state,
  setBoard(board, turn = 'c') {
    state.board = board;
    state.turn = turn;
    state.selected = null;
    state.chainFrom = null;
    state.winner = null;
    render();
  },
  getNet: () => net,
  tap: onSquareTap,
  chooseMode,
  newGame,
  render,
  fitBoard,
  // pure re-exports for driving assertions without the DOM
  rules: { legalMoves, hasAnyCapture, winnerAtTurn, captureStepsFrom, stepTargets },
  pickMove,
};

// ---- kickoff --------------------------------------------------------------
boardEl.style.width = `${BOARD_PX}px`;
boardEl.style.height = `${BOARD_PX}px`;
buildBoardDom();
fitBoard();
buildLangSwitch();
applyStaticStrings(currentLang);
render();

(async () => {
  net = await OGHNet.connect({ gameId: GAME_ID, name: qs('name') || OGHProfile.getNickname() });
  net.on('mode', onNetChange);
  net.on('players', onNetChange);
  net.on('hello', onNetChange);
  net.on('action', onNetAction);
  onNetChange();
})();
