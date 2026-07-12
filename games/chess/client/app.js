/**
 * app.js — Chess: position state, board rendering, interactive tap-select
 * input (with a promotion picker), a minimax AI opponent, same-device
 * pass-and-play, and LAN multiplayer over OGHNet.
 *
 * The rules (rules.js) and AI (ai.js) are pure and DOM/network-free; this file
 * is only orchestration + presentation, the same split as games/checkers.
 *
 * Modes share one `state.pos` and one move primitive (doMove):
 *   'ai'    — human is White (moves first, bottom), AI is Black.
 *   'local' — pass-and-play; whichever color's turn it is may move.
 *   'lan'   — OGHNet room; first joiner is White, second is Black, later
 *             joiners spectate. Each move relays as {action:'move',
 *             payload:{from,to,promo}}. The receiver re-validates the move
 *             against its OWN position (only a currently-legal move for the
 *             side to move is accepted) before applying, so a stale/duplicate/
 *             out-of-turn relayed move can never desync or corrupt the boards.
 *   If OGHNet can't reach a host, 'lan' degrades to local pass-and-play.
 *
 * Board orientation is fixed White-at-bottom for every mode (the board is never
 * mirrored — a1-h8 is a universal convention), matching games/checkers.
 */
import { OGHNet } from '../../_shared/js/ogh-net.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import {
  initialPosition, parseFEN, toFEN, makeMove, legalMoves, movesForSquare,
  pseudoLegal, inCheck, attacksSquare, findKing, gameStatus, insufficientMaterial,
  positionKey, sqName, other, row, col, CELLS, WHITE, BLACK,
} from './rules.js';
import { pickMove, evaluate, DIFFICULTY } from './ai.js';
import { LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings } from './i18n.js';

const GAME_ID = 'chess';
const AI_MOVE_DELAY_MS = 380;
const sfx = createOghSfx();

// solid Unicode chess glyphs; both colors use the same silhouettes, tinted by
// the .cs-piece.w / .cs-piece.b CSS rules (cyan vs pink), so the sides read
// clearly without any bitmap assets.
const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

function qs(name) {
  try { return new URLSearchParams(location.search).get(name); } catch { return null; }
}

// ---- DOM refs -------------------------------------------------------------
const boardEl = document.getElementById('board');
const stage = document.querySelector('.cs-stage');
const netPill = document.getElementById('netPill');
const turnPill = document.getElementById('turnPill');
const checkPill = document.getElementById('checkPill');
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

const promoOverlay = document.getElementById('promoOverlay');
const promoBtns = Array.from(document.querySelectorAll('.cs-promo-btn'));

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
  pos: initialPosition(),
  selected: null, // selected cell index
  legalSel: [], // legal moves from the selected cell
  lastMove: null, // { from, to } for highlight
  pendingPromo: null, // { from, to } awaiting a piece choice
  status: 'ongoing', // 'ongoing'|'check'|'checkmate'|'stalemate'|'draw'
  check: false,
  winner: null, // 'w' | 'b' | 'draw' | null
  reason: null, // 'checkmate'|'stalemate'|'repetition'|'fifty'|'material'
  humanColor: 'w', // 'ai' mode: human is White
  myColor: 'w', // 'lan' mode: 'w' | 'b' | null(spectator)
  wins: { w: 0, b: 0 },
  repetition: new Map(), // positionKey -> occurrence count (threefold repetition)
};

let net = null;
let aiTimer = null;
let aiThinking = false;
let currentLang = detectLang();

const inRound = () => state.mode !== 'menu';
const lanIsOnline = () => state.mode === 'lan' && net && net.mode === 'online';

// ---- scale-to-fit (no scrolling, ever) — games/checkers fitBoard() --------
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
    sq.className = 'cs-sq';
    sq.dataset.i = String(i);
    sq.addEventListener('click', () => onSquareTap(i));
    boardEl.appendChild(sq);
    sqEls[i] = sq;
  }
}

// ---- LAN helpers ----------------------------------------------------------
function computeMyColor() {
  if (!net || net.mode !== 'online') return WHITE;
  const i = (net.players || []).findIndex((p) => p.id === net.playerId);
  if (i === 0) return WHITE;
  if (i === 1) return BLACK;
  return null; // 3rd+ joiner spectates
}

function canHumanAct() {
  if (!inRound() || state.winner) return false;
  if (aiThinking || state.pendingPromo) return false;
  if (state.mode === 'ai') return state.pos.turn === state.humanColor;
  if (state.mode === 'local') return true;
  if (state.mode === 'lan') {
    if (!net) return false;
    if (net.mode !== 'online') return true; // offline fallback = local pass & play
    if ((net.players || []).length < 2) return false;
    if (!state.myColor) return false; // spectator
    return state.pos.turn === state.myColor;
  }
  return false;
}

// ---- core move primitive --------------------------------------------------
/** Apply one fully-legal move, update status, sounds, broadcast, next turn. */
function doMove(m, opts = {}) {
  const wasCapture = m.capture;
  const wasCastle = !!m.castle;
  const wasPromo = !!m.promo;

  state.pos = makeMove(state.pos, m);
  state.lastMove = { from: m.from, to: m.to };
  state.selected = null;
  state.legalSel = [];

  if (opts.broadcast && lanIsOnline()) {
    net.send('move', { from: m.from, to: m.to, promo: m.promo || null });
  }

  const key = positionKey(state.pos);
  const cnt = (state.repetition.get(key) || 0) + 1;
  state.repetition.set(key, cnt);

  const st = computeStatus(cnt);
  state.status = st.status;
  state.check = st.check;
  state.reason = st.reason;

  if (st.winner) { finishGame(st.winner, st.reason); return; }

  if (st.check) sfx.play('zap');
  else if (wasCastle) sfx.play('pickup');
  else if (wasPromo) sfx.play('chain');
  else if (wasCapture) sfx.play('clack');
  else sfx.play('place');

  render();
  if (state.mode === 'ai' && state.pos.turn !== state.humanColor) scheduleAi();
}

/** Terminal / check / draw status of the current position for the mover. */
function computeStatus(repCount) {
  const pos = state.pos;
  const color = pos.turn;
  const check = inCheck(pos.board, color);
  const moves = legalMoves(pos, color);
  if (moves.length === 0) {
    if (check) return { status: 'checkmate', check: true, winner: other(color), reason: 'checkmate' };
    return { status: 'stalemate', check: false, winner: 'draw', reason: 'stalemate' };
  }
  if (insufficientMaterial(pos.board)) return { status: 'draw', check, winner: 'draw', reason: 'material' };
  if (pos.halfmove >= 100) return { status: 'draw', check, winner: 'draw', reason: 'fifty' };
  if (repCount >= 3) return { status: 'draw', check, winner: 'draw', reason: 'repetition' };
  return { status: check ? 'check' : 'ongoing', check, winner: null, reason: null };
}

function winnerIsHuman(winner) {
  if (state.mode === 'ai') return winner === state.humanColor;
  if (state.mode === 'lan' && state.myColor) return winner === state.myColor;
  return true; // local pass & play: celebratory chime for whoever won
}

function finishGame(winner, reason) {
  state.winner = winner;
  state.reason = reason;
  if (winner === 'draw') sfx.play('tick');
  else sfx.play(winnerIsHuman(winner) ? 'win' : 'die');
  if (winner === WHITE) state.wins.w += 1;
  else if (winner === BLACK) state.wins.b += 1;
  render();
  showResult();
  try {
    OGHProfile.saveProgress(GAME_ID, { wins: state.wins }, {
      summary: `White ${state.wins.w} · Black ${state.wins.b}`,
    });
  } catch { /* best-effort */ }
}

// ---- input ----------------------------------------------------------------
function onSquareTap(i) {
  sfx.unlock();
  if (state.pendingPromo) return; // promotion picker handles input
  if (!canHumanAct()) return;
  const pos = state.pos;
  const color = pos.turn;
  const p = pos.board[i];

  // tap the selected piece again -> deselect
  if (state.selected === i) {
    state.selected = null;
    state.legalSel = [];
    render();
    return;
  }
  // tap one of your own pieces -> (re)select it
  if (p && p.color === color) {
    state.selected = i;
    state.legalSel = movesForSquare(pos, i);
    render();
    return;
  }
  // otherwise try to move the selected piece onto this square
  if (state.selected != null) {
    const cands = state.legalSel.filter((m) => m.to === i);
    if (cands.length === 0) {
      state.selected = null;
      state.legalSel = [];
      render();
      return;
    }
    // a promotion destination yields 4 candidates (q/r/b/n) — ask which
    if (cands.length > 1 && cands.every((m) => m.promo)) {
      state.pendingPromo = { from: state.selected, to: i };
      state.selected = null;
      state.legalSel = [];
      showPromo(color);
      render();
      return;
    }
    doMove(cands[0], { broadcast: true });
  }
}

// ---- promotion picker -----------------------------------------------------
function showPromo(color) {
  document.querySelectorAll('.cs-promo-glyph').forEach((el) => {
    el.classList.toggle('is-black', color === BLACK);
    el.textContent = GLYPH[el.dataset.glyph];
  });
  promoOverlay.hidden = false;
}
function hidePromo() { promoOverlay.hidden = true; }
function choosePromo(pieceType) {
  const pend = state.pendingPromo;
  if (!pend) return;
  state.pendingPromo = null;
  hidePromo();
  const m = movesForSquare(state.pos, pend.from).find((mm) => mm.to === pend.to && mm.promo === pieceType);
  if (m) doMove(m, { broadcast: true });
  else render();
}

// ---- AI -------------------------------------------------------------------
function scheduleAi() {
  clearTimeout(aiTimer);
  aiThinking = true;
  render();
  aiTimer = setTimeout(() => {
    if (state.mode !== 'ai' || state.winner) { aiThinking = false; return; }
    const aiColor = other(state.humanColor);
    if (state.pos.turn !== aiColor) { aiThinking = false; render(); return; }
    let move = null;
    try { move = pickMove(state.pos, DIFFICULTY[state.difficulty]); } catch (e) { console.warn('[chess] AI error', e); }
    aiThinking = false;
    if (!move) {
      const st = computeStatus(0);
      if (st.winner) finishGame(st.winner, st.reason);
      else render();
      return;
    }
    doMove(move, { broadcast: false });
  }, AI_MOVE_DELAY_MS);
}

// ---- rendering ------------------------------------------------------------
function render() {
  const pos = state.pos;
  const canAct = canHumanAct();
  const targets = new Map(); // to -> 'move' | 'capture'
  if (state.selected != null && canAct) {
    for (const m of state.legalSel) targets.set(m.to, (m.capture || m.ep) ? 'capture' : 'move');
  }
  const kingCheckSq = state.check ? findKing(pos.board, pos.turn) : -1;
  const last = state.lastMove;

  for (let i = 0; i < CELLS; i++) {
    const sq = sqEls[i];
    sq.className = `cs-sq ${((row(i) + col(i)) & 1) ? 'is-dark' : 'is-light'}`;
    sq.innerHTML = '';
    const p = pos.board[i];
    if (p) {
      const el = document.createElement('span');
      el.className = `cs-piece ${p.color}`;
      el.textContent = GLYPH[p.type];
      sq.appendChild(el);
    }
    if (last && (i === last.from || i === last.to)) sq.classList.add('is-last');
    if (state.selected === i) sq.classList.add('is-selected');
    if (i === kingCheckSq) sq.classList.add('is-check');
    if (targets.has(i)) sq.classList.add(targets.get(i) === 'capture' ? 'is-capture' : 'is-move');
  }
  updateHud();
}

function updateHud() {
  netPill.textContent = net
    ? (net.mode === 'online' ? `ONLINE · ${net.room} · ${(net.players || []).length}p` : 'OFFLINE')
    : '…';
  turnPill.textContent = turnText();
  checkPill.hidden = !(inRound() && !state.winner && state.check);
  checkPill.textContent = t(currentLang, 'checkPill');

  let hint = t(currentLang, 'hint');
  if (inRound() && !state.winner && state.check && canHumanAct()) hint = t(currentLang, 'hintCheck');
  hintEl.textContent = hint;
}

function colorWord(c) {
  return t(currentLang, c === WHITE ? 'colorWhite' : 'colorBlack');
}

function turnText() {
  if (!inRound() || state.winner) return '';
  if (state.mode === 'ai') {
    return state.pos.turn === state.humanColor
      ? t(currentLang, 'turnYours')
      : t(currentLang, 'turnAiThinking');
  }
  if (state.mode === 'local') return t(currentLang, 'turnToMove', { color: colorWord(state.pos.turn) });
  if (state.mode === 'lan') {
    if (!net || net.mode !== 'online') return t(currentLang, 'turnToMove', { color: colorWord(state.pos.turn) });
    if ((net.players || []).length < 2) return t(currentLang, 'waitingOpponent', { room: net.room });
    if (!state.myColor) return t(currentLang, 'spectatorNote');
    return state.pos.turn === state.myColor ? t(currentLang, 'turnYours') : t(currentLang, 'turnOpp');
  }
  return '';
}

function describeResult() {
  const w = state.winner;
  if (w === 'draw') {
    const map = {
      stalemate: 'drawStalemate',
      repetition: 'drawRepetition',
      fifty: 'drawFifty',
      material: 'drawMaterial',
    };
    return { key: map[state.reason] || 'drawStalemate' };
  }
  if (state.mode === 'ai') return { key: w === state.humanColor ? 'winCheckmateYou' : 'winCheckmateAi' };
  if (state.mode === 'lan' && state.myColor) return { key: w === state.myColor ? 'winCheckmateYou' : 'winCheckmateOpp' };
  return { key: 'winCheckmateColor', vars: { color: colorWord(w) } };
}

function showResult() {
  const { key, vars } = describeResult();
  resultTitle.textContent = t(currentLang, key, vars);
  resultStatsLine.textContent = t(currentLang, 'winsLine', { w: state.wins.w, b: state.wins.b });
  resultOverlay.hidden = false;
}
function hideResult() { resultOverlay.hidden = true; }
function showModeOverlay() { modeList.hidden = false; diffList.hidden = true; modeOverlay.hidden = false; }
function hideModeOverlay() { modeOverlay.hidden = true; }

// ---- round control --------------------------------------------------------
function startGame() {
  clearTimeout(aiTimer);
  aiThinking = false;
  state.pos = initialPosition();
  state.selected = null;
  state.legalSel = [];
  state.lastMove = null;
  state.pendingPromo = null;
  state.status = 'ongoing';
  state.check = false;
  state.winner = null;
  state.reason = null;
  state.repetition = new Map();
  state.repetition.set(positionKey(state.pos), 1);
  hideResult();
  hidePromo();
  render();
  // In 'ai' mode the human is White and always moves first, so no AI kickoff.
}

function newGame(opts = {}) {
  const broadcast = opts.broadcast !== false;
  startGame();
  if (state.mode === 'lan' && broadcast && lanIsOnline()) net.send('newgame', {});
}

function chooseMode(mode) {
  state.mode = mode;
  state.wins = { w: 0, b: 0 };
  state.humanColor = WHITE;
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
  if (action === 'move') applyRemoteMove(payload);
  else if (action === 'newgame') startGame();
}

/**
 * Apply a move relayed from the other player. It is re-validated against our
 * OWN position (must be a currently-legal move for the side to move), so a
 * stale, duplicate, or out-of-turn relayed move is simply ignored and can't
 * desync the boards.
 */
function applyRemoteMove(payload) {
  if (!payload || state.winner) return;
  const { from, to, promo } = payload;
  if (typeof from !== 'number' || typeof to !== 'number') return;
  const m = legalMoves(state.pos, state.pos.turn)
    .find((mm) => mm.from === from && mm.to === to && (mm.promo || null) === (promo || null));
  if (m) doMove(m, { broadcast: false });
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
promoBtns.forEach((btn) => btn.addEventListener('click', () => { sfx.play('tap'); choosePromo(btn.dataset.piece); }));
btnMenu.addEventListener('click', showModeOverlay);
btnNew.addEventListener('click', () => newGame());
btnPlayAgain.addEventListener('click', () => newGame());

// ---- test/debug hook (same convention as window.OGH_CHECKERS) -------------
window.OGH_CHESS = {
  getState: () => state,
  getNet: () => net,
  tap: onSquareTap,
  chooseMode,
  newGame,
  render,
  fitBoard,
  /** Set an arbitrary position from FEN (drives assertions without clicking). */
  setFEN(fen) {
    state.pos = parseFEN(fen);
    state.selected = null;
    state.legalSel = [];
    state.lastMove = null;
    state.pendingPromo = null;
    state.winner = null;
    state.reason = null;
    state.repetition = new Map();
    state.repetition.set(positionKey(state.pos), 1);
    const st = computeStatus(1);
    state.status = st.status;
    state.check = st.check;
    hideResult();
    render();
    return state.pos;
  },
  /** Make a move by from/to(/promo); runs the full pipeline (status, overlay). */
  move(from, to, promo = null) {
    const m = legalMoves(state.pos, state.pos.turn)
      .find((mm) => mm.from === from && mm.to === to && (mm.promo || null) === (promo || null));
    if (m) { doMove(m, { broadcast: false }); return true; }
    return false;
  },
  computeStatus,
  // pure re-exports for driving assertions without the DOM
  rules: {
    legalMoves, movesForSquare, pseudoLegal, makeMove, inCheck, attacksSquare,
    findKing, gameStatus, insufficientMaterial, parseFEN, toFEN, positionKey,
    sqName, other, row, col,
  },
  ai: { pickMove, evaluate, DIFFICULTY },
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
