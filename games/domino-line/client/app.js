/**
 * app.js — Dominoes (double-six block game): table state, tile rendering,
 * placement with end-choice, the draw/pass flow, a heuristic AI, same-device
 * pass-and-play (with a privacy hand-off gate), and LAN multiplayer over
 * OGHNet. Rules (rules.js) and AI (ai.js) are pure/DOM-free; this file is
 * orchestration + presentation, the same split as games/tic-tac-toe.
 *
 * LAN privacy (why no hand is ever put on the wire)
 * -------------------------------------------------
 * Hidden hands over a *dumb relay* (the host only forwards messages) can't be
 * made cryptographically secret without mental-poker crypto, which is out of
 * scope here. Instead the dealer (first joiner) broadcasts only a small integer
 * `seed`; both clients run the identical seeded shuffle (rules.shuffledDeck),
 * and each client computes ONLY its own 7-tile slice + the shared boneyard —
 * it never even reads the opponent's slice. During play the only payloads are
 * public events: {place,{tile,end}} (a placed tile is public anyway),
 * {draw} (advances the shared boneyard by one; a count, never a tile),
 * {pass}, and on a blocked game {score,{pips}} (a single summed number). So no
 * hand tile list ever appears in a sent payload — verifiable by inspecting the
 * WebSocket traffic. (A modified client could recompute the deck from the seed;
 * that residual is documented in the README.)
 */
import { OGHNet } from '../../_shared/js/ogh-net.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import {
  shuffledDeck, deal, placeTile, removeTile, playableEnds, hasPlayable,
  handPips, blockedResult,
} from './rules.js';
import { pickPlay } from './ai.js';
import { LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings } from './i18n.js';

const GAME_ID = 'domino-line';
const AI_DELAY_MS = 620;
const sfx = createOghSfx();

const PIP_SLOTS = {
  0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

function qs(name) {
  try { return new URLSearchParams(location.search).get(name); } catch { return null; }
}

// ---- DOM refs -------------------------------------------------------------
const netPill = document.getElementById('netPill');
const turnPill = document.getElementById('turnPill');
const oppRow = document.getElementById('oppRow');
const boneyardEl = document.getElementById('boneyard');
const lineEl = document.getElementById('line');
const lineScroll = document.querySelector('.dom-line-scroll');
const endLeft = document.getElementById('endLeft');
const endRight = document.getElementById('endRight');
const handEl = document.getElementById('hand');
const btnDraw = document.getElementById('btnDraw');
const btnPass = document.getElementById('btnPass');
const hintEl = document.getElementById('hint');
const langSwitchEl = document.getElementById('langSwitch');

const modeOverlay = document.getElementById('modeOverlay');
const btnModeAi = document.getElementById('btnModeAi');
const btnModeLocal = document.getElementById('btnModeLocal');
const btnModeLan = document.getElementById('btnModeLan');

const gateOverlay = document.getElementById('gateOverlay');
const gateSub = document.getElementById('gateSub');
const btnGateReady = document.getElementById('btnGateReady');

const resultOverlay = document.getElementById('resultOverlay');
const resultTitle = document.getElementById('resultTitle');
const resultReasonLine = document.getElementById('resultReasonLine');
const resultStatsLine = document.getElementById('resultStatsLine');
const btnPlayAgain = document.getElementById('btnPlayAgain');

const btnMenu = document.getElementById('btnMenu');
const btnNew = document.getElementById('btnNew');

// ---- state ---------------------------------------------------------------
const state = {
  mode: 'menu', // 'menu' | 'ai' | 'local' | 'lan'
  board: [], // the line (placed tiles)
  hands: [[], []], // hands[0], hands[1]; in online-LAN only my slice is filled
  boneyard: [], // ordered draw pile (shared, in-sync across LAN clients)
  turn: 0, // player index to move
  passes: 0, // consecutive passes (2 => blocked)
  selected: null, // tile awaiting an end choice
  needEnd: false, // selected tile matches both ends
  winner: null, // 0 | 1 | 'draw' | null
  reason: null, // 'empty' | 'blocked'
  pips: null, // [p0, p1] on a blocked game
  wins: [0, 0],
  starter: 0, // who opens the current round
  gate: false, // local pass-device hand-off gate is up
  lastEnd: null, // 'left'|'right'|'first' — for auto-scroll
  // LAN
  myIndex: 0,
  oppCount: 0,
  dealt: false,
  awaitingDeal: false,
  seed: null,
  scoreMine: null,
  scoreTheirs: null,
};

let net = null;
let aiTimer = null;
let aiThinking = false;
let currentLang = detectLang();

const inRound = () => state.mode !== 'menu';
const onlineLan = () => state.mode === 'lan' && net && net.mode === 'online';
const localStyle = () => state.mode === 'local' || (state.mode === 'lan' && !onlineLan());

function computeMyIndex() {
  if (!onlineLan()) return 0;
  const i = (net.players || []).findIndex((p) => p.id === net.playerId);
  return i === 0 ? 0 : i === 1 ? 1 : -1; // -1 = spectator
}

/** Index whose hand is shown at the bottom (the local viewer). */
function viewer() {
  if (state.mode === 'ai') return 0;
  if (onlineLan()) return state.myIndex;
  return state.turn; // local / lan-offline: current player holds the device
}
const bottomHand = () => state.hands[viewer()] || [];
const actorIsViewer = () => state.turn === viewer();

function topCount() {
  if (onlineLan()) return state.oppCount;
  return (state.hands[1 - viewer()] || []).length;
}

function canActNow() {
  if (!inRound() || state.winner != null || state.gate) return false;
  if (state.mode === 'ai') return state.turn === 0 && !aiThinking;
  if (state.mode === 'local') return true;
  // lan
  if (!onlineLan()) return true; // offline fallback = local pass & play
  if ((net.players || []).length < 2 || !state.dealt) return false;
  if (state.myIndex < 0) return false; // spectator
  return state.turn === state.myIndex;
}

// ---- round setup ----------------------------------------------------------
function dealLocalRound(starter) {
  const deck = shuffledDeck((Math.random() * 2 ** 31) >>> 0);
  const d = deal(deck);
  state.hands = d.hands;
  state.boneyard = d.boneyard;
  resetRoundFields(starter);
}

function setupOnlineRound(seed, starter) {
  const deck = shuffledDeck(seed);
  const d = deal(deck);
  state.hands = [[], []];
  if (state.myIndex >= 0) state.hands[state.myIndex] = d.hands[state.myIndex]; // ONLY my slice
  state.boneyard = d.boneyard; // shared, identical order on both clients
  state.oppCount = 7;
  state.seed = seed;
  state.dealt = true;
  state.awaitingDeal = false;
  resetRoundFields(starter);
}

function resetRoundFields(starter) {
  state.board = [];
  state.turn = starter;
  state.passes = 0;
  state.selected = null;
  state.needEnd = false;
  state.winner = null;
  state.reason = null;
  state.pips = null;
  state.scoreMine = null;
  state.scoreTheirs = null;
  state.lastEnd = null;
  hideResult();
}

/** Deal a local-style round (ai / local / lan-offline). */
function setupRoundLocalStyle(starter) {
  clearTimeout(aiTimer);
  aiThinking = false;
  dealLocalRound(starter);
  state.gate = localStyle(); // hand-off gate for pass & play; none for vs-AI
  render();
  if (state.mode === 'ai' && starter === 1) scheduleAi(); // AI opens
}

// ---- LAN dealing handshake ------------------------------------------------
function dealAsDealer(alternate) {
  if (alternate) state.starter = 1 - state.starter;
  state.myIndex = computeMyIndex();
  const seed = (Math.random() * 2 ** 31) >>> 0;
  setupOnlineRound(seed, state.starter);
  net.send('deal', { seed, starter: state.starter });
  render();
}

function startLanFlow() {
  state.myIndex = computeMyIndex();
  if (!onlineLan()) { // no host reachable: fall back to local pass & play
    setupRoundLocalStyle(state.starter);
    return;
  }
  if ((net.players || []).length < 2 || state.myIndex < 0) {
    state.dealt = false;
    state.awaitingDeal = true;
    render();
    return;
  }
  if (state.myIndex === 0) dealAsDealer(false);
  else { state.dealt = false; state.awaitingDeal = true; net.send('requestDeal', {}); render(); }
}

// ---- core actions ---------------------------------------------------------
function playTile(tile, end, opts = {}) {
  state.board = placeTile(state.board, tile, end);
  state.lastEnd = end;
  const mine = !(onlineLan()) || state.turn === state.myIndex;
  if (mine) state.hands[state.turn] = removeTile(state.hands[state.turn], tile);
  else state.oppCount = Math.max(0, state.oppCount - 1);
  sfx.play('place');
  state.passes = 0;
  state.selected = null;
  state.needEnd = false;
  if (opts.broadcast && onlineLan()) net.send('place', { tile, end });

  const actorCount = mine ? state.hands[state.turn].length : state.oppCount;
  if (actorCount === 0) { finishGame(state.turn, 'empty'); return; }
  switchTurn();
}

function playerDraw(i, opts = {}) {
  if (!state.boneyard.length) return null;
  const tile = state.boneyard.shift();
  const mine = !(onlineLan()) || i === state.myIndex;
  if (mine) state.hands[i].push(tile);
  else state.oppCount += 1;
  sfx.play('pickup');
  if (opts.broadcast && onlineLan()) net.send('draw', {});
  return tile;
}

function doPass(i, opts = {}) {
  state.passes += 1;
  sfx.play('tick');
  if (opts.broadcast && onlineLan()) net.send('pass', {});
  if (state.passes >= 2) { onBlocked(); return; }
  switchTurn();
}

function onBlocked() {
  state.reason = 'blocked';
  if (onlineLan()) {
    state.scoreMine = handPips(state.hands[state.myIndex] || []);
    net.send('score', { pips: state.scoreMine });
    resolveBlockedLan();
    render();
    return;
  }
  const res = blockedResult([state.hands[0], state.hands[1]]);
  finishGame(res.winner, 'blocked', res.pips);
}

function resolveBlockedLan() {
  if (state.scoreMine == null || state.scoreTheirs == null) return;
  const my = state.scoreMine;
  const opp = state.scoreTheirs;
  let winner;
  if (my < opp) winner = state.myIndex;
  else if (opp < my) winner = 1 - state.myIndex;
  else winner = 'draw';
  const pips = [];
  pips[state.myIndex] = my;
  pips[1 - state.myIndex] = opp;
  finishGame(winner, 'blocked', pips);
}

function switchTurn() {
  state.turn = 1 - state.turn;
  state.selected = null;
  state.needEnd = false;
  if (state.winner != null) return;
  if (localStyle()) state.gate = true; // privacy hand-off for pass & play
  render();
  if (state.mode === 'ai' && state.turn === 1) scheduleAi();
}

function finishGame(winner, reason, pips) {
  state.winner = winner;
  state.reason = reason;
  state.pips = pips || null;
  state.gate = false;
  if (winner === 0 || winner === 1) state.wins[winner] += 1;
  sfx.play('win');
  render();
  showResult();
  try {
    OGHProfile.saveProgress(GAME_ID, { wins: state.wins }, {
      summary: `P1 ${state.wins[0]} · P2 ${state.wins[1]}`,
    });
  } catch { /* best-effort */ }
}

// ---- AI turn --------------------------------------------------------------
function scheduleAi() {
  clearTimeout(aiTimer);
  aiThinking = true;
  render();
  aiTimer = setTimeout(aiTakeTurn, AI_DELAY_MS);
}

function aiTakeTurn() {
  if (state.mode !== 'ai' || state.winner != null) { aiThinking = false; return; }
  const i = 1;
  let mv = pickPlay(state.hands[i], state.board);
  while (!mv && state.boneyard.length) {
    playerDraw(i, { broadcast: false });
    mv = pickPlay(state.hands[i], state.board);
  }
  aiThinking = false;
  if (mv) playTile(mv.tile, mv.end, { broadcast: false });
  else doPass(i, { broadcast: false });
}

// ---- input ----------------------------------------------------------------
function onTileTap(handIndex) {
  sfx.unlock();
  if (!canActNow() || !actorIsViewer()) return;
  const hand = bottomHand();
  const tile = hand[handIndex];
  if (!tile) return;
  const pe = playableEnds(tile, state.board);
  if (pe.first) { playTile(tile, 'first', { broadcast: onlineLan() }); return; }
  if (!pe.left && !pe.right) return; // not playable
  if (pe.left && pe.right) {
    // toggle selection; require an end choice
    if (state.selected && state.selected[0] === tile[0] && state.selected[1] === tile[1] && state.needEnd) {
      state.selected = null; state.needEnd = false;
    } else {
      state.selected = tile; state.needEnd = true;
    }
    render();
    return;
  }
  playTile(tile, pe.left ? 'left' : 'right', { broadcast: onlineLan() });
}

function onEndTap(side) {
  if (!canActNow() || !state.needEnd || !state.selected) return;
  playTile(state.selected, side, { broadcast: onlineLan() });
}

// ---- LAN receive ----------------------------------------------------------
function onNetChange() {
  if (state.mode === 'lan') {
    const prev = state.myIndex;
    state.myIndex = computeMyIndex();
    if (onlineLan() && (net.players || []).length >= 2 && !state.dealt) {
      if (state.myIndex === 0) dealAsDealer(false);
      else if (prev < 0 || state.awaitingDeal) net.send('requestDeal', {});
    }
    if (!onlineLan() && state.mode === 'lan' && !state.dealt) {
      // host dropped before dealing → local fallback
      setupRoundLocalStyle(state.starter);
      return;
    }
  }
  render();
}

function onNetAction({ action, payload, from }) {
  if (state.mode !== 'lan') return;
  if (from === net.playerId) return; // host excludes sender; defensive
  switch (action) {
    case 'deal':
      if (payload && (state.seed !== payload.seed || !state.dealt)) {
        setupOnlineRound(payload.seed, payload.starter | 0);
        render();
      }
      break;
    case 'requestDeal':
      if (state.myIndex === 0) {
        if (state.dealt && state.winner == null) net.send('deal', { seed: state.seed, starter: state.starter });
        else dealAsDealer(state.dealt);
      }
      break;
    case 'newgameRequest':
      if (state.myIndex === 0) dealAsDealer(true);
      break;
    case 'place': applyRemotePlace(payload); break;
    case 'draw': if (state.winner == null) playerDraw(state.turn, { broadcast: false }), render(); break;
    case 'pass': if (state.winner == null) doPass(state.turn, { broadcast: false }); break;
    case 'score':
      if (payload) { state.scoreTheirs = payload.pips | 0; state.reason = 'blocked'; resolveBlockedLan(); }
      break;
    default: break;
  }
}

function applyRemotePlace(payload) {
  if (!payload || state.winner != null) return;
  const { tile, end } = payload;
  if (!Array.isArray(tile) || tile.length !== 2) return;
  const pe = playableEnds(tile, state.board);
  const legal = state.board.length === 0 ? true : (end === 'left' ? pe.left : end === 'right' ? pe.right : false);
  if (!legal) return; // stale / duplicate / illegal → ignore
  playTile(tile, state.board.length === 0 ? 'first' : end, { broadcast: false });
}

// ---- rendering ------------------------------------------------------------
function buildHalf(n) {
  const half = document.createElement('div');
  half.className = 'dom-half';
  const on = new Set(PIP_SLOTS[n] || []);
  for (let s = 0; s < 9; s++) {
    const slot = document.createElement('div');
    slot.className = `dom-slot${on.has(s) ? ' on' : ''}`;
    half.appendChild(slot);
  }
  return half;
}

function buildTileEl(a, b, opts = {}) {
  const el = document.createElement('div');
  el.className = `dom-tile${opts.mini ? ' mini' : ''}${opts.back ? ' back' : ''}`;
  el.appendChild(buildHalf(opts.back ? 0 : a));
  el.appendChild(buildHalf(opts.back ? 0 : b));
  return el;
}

function render() {
  // overlays
  gateOverlay.hidden = !state.gate;
  if (state.gate) gateSub.textContent = t(currentLang, 'passDeviceSub', { n: state.turn + 1 });

  const canAct = canActNow();
  const isViewerTurn = canAct && actorIsViewer();
  const board = state.board;

  // HUD
  netPill.textContent = net
    ? (net.mode === 'online' ? `ONLINE · ${net.room} · ${(net.players || []).length}p` : 'OFFLINE')
    : '…';
  turnPill.textContent = turnText();

  // opponent tiles (face down)
  oppRow.innerHTML = '';
  const tc = Math.max(0, topCount());
  for (let k = 0; k < tc; k++) oppRow.appendChild(buildTileEl(0, 0, { mini: true, back: true }));

  // boneyard
  boneyardEl.innerHTML = '';
  if (state.boneyard.length) {
    boneyardEl.appendChild(buildTileEl(0, 0, { mini: true, back: true }));
    const lbl = document.createElement('span');
    lbl.textContent = `${t(currentLang, 'boneyardLabel')}: ${state.boneyard.length}`;
    boneyardEl.appendChild(lbl);
  }

  // line
  lineEl.innerHTML = '';
  board.forEach((p, i) => {
    const el = buildTileEl(p.l, p.r);
    if (i === 0) el.classList.add('end-left');
    if (i === board.length - 1) el.classList.add('end-right');
    lineEl.appendChild(el);
  });

  // hand
  handEl.innerHTML = '';
  const hand = bottomHand();
  const playableNow = isViewerTurn && (board.length === 0 || hasPlayable(hand, board));
  hand.forEach((tile, i) => {
    const el = buildTileEl(tile[0], tile[1]);
    const pe = playableEnds(tile, board);
    const canPlay = isViewerTurn && (pe.first || pe.left || pe.right);
    const isSel = state.needEnd && state.selected && state.selected[0] === tile[0] && state.selected[1] === tile[1];
    if (isSel) el.classList.add('selected');
    else if (canPlay) el.classList.add('playable');
    else if (isViewerTurn) el.classList.add('dim');
    el.addEventListener('click', () => onTileTap(i));
    handEl.appendChild(el);
  });

  // end zones (active only while choosing an end)
  const zonesActive = isViewerTurn && state.needEnd;
  endLeft.classList.toggle('is-active', zonesActive);
  endRight.classList.toggle('is-active', zonesActive);

  // controls
  const noPlay = isViewerTurn && !playableNow && !state.needEnd;
  btnDraw.hidden = !(noPlay && state.boneyard.length > 0);
  btnPass.hidden = !(noPlay && state.boneyard.length === 0);

  // hint
  hintEl.textContent = hintText(isViewerTurn, playableNow);

  // auto-scroll to the freshly-played end
  requestAnimationFrame(() => {
    if (!lineScroll) return;
    if (state.lastEnd === 'left' || state.lastEnd === 'first') lineScroll.scrollLeft = 0;
    else lineScroll.scrollLeft = lineScroll.scrollWidth;
  });
}

function turnText() {
  if (!inRound() || state.winner != null) return '';
  if (state.mode === 'ai') return state.turn === 0 ? t(currentLang, 'turnYours') : t(currentLang, 'turnAiThinking');
  if (localStyle()) return t(currentLang, 'turnPlayer', { n: state.turn + 1 });
  // online lan
  if ((net.players || []).length < 2) return t(currentLang, 'waitingOpponent', { room: net.room });
  if (state.myIndex < 0) return t(currentLang, 'spectatorNote');
  if (!state.dealt) return t(currentLang, 'dealingNote');
  return state.turn === state.myIndex ? t(currentLang, 'turnYours') : t(currentLang, 'turnOpp');
}

function hintText(isViewerTurn, playableNow) {
  if (!inRound() || state.winner != null || state.gate) return '';
  if (!isViewerTurn) return '';
  if (state.needEnd) return t(currentLang, 'hintChooseEnd');
  if (state.board.length === 0) return t(currentLang, 'hintOpener');
  if (playableNow) return t(currentLang, 'hint');
  if (state.boneyard.length > 0) return t(currentLang, 'hintDraw');
  return t(currentLang, 'hintPass');
}

// ---- result / overlays ----------------------------------------------------
function describeResultTitle() {
  const w = state.winner;
  if (w === 'draw') return { key: 'drawTitle' };
  if (state.mode === 'ai') return { key: w === 0 ? 'youWinTitle' : 'aiWinTitle' };
  if (onlineLan()) return { key: w === state.myIndex ? 'youWinTitle' : 'oppWinTitle' };
  return { key: 'playerWinTitle', vars: { n: w + 1 } };
}

function showResult() {
  const { key, vars } = describeResultTitle();
  resultTitle.textContent = t(currentLang, key, vars);
  resultReasonLine.textContent = t(currentLang, state.reason === 'blocked' ? 'resultBlocked' : 'resultEmptied');

  let stats;
  if (state.reason === 'blocked' && state.pips) {
    if (onlineLan()) {
      stats = t(currentLang, 'resultPips', { you: state.pips[state.myIndex] ?? '?', opp: state.pips[1 - state.myIndex] ?? '?' });
    } else if (state.mode === 'ai') {
      stats = t(currentLang, 'resultPips', { you: state.pips[0], opp: state.pips[1] });
    } else {
      stats = t(currentLang, 'resultPipsPlayers', { a: state.pips[0], b: state.pips[1] });
    }
  } else {
    stats = localStyle()
      ? t(currentLang, 'winsLineLocal', { a: state.wins[0], b: state.wins[1] })
      : t(currentLang, 'winsLineVs', {
        a: state.wins[state.mode === 'ai' ? 0 : state.myIndex],
        b: state.wins[state.mode === 'ai' ? 1 : (1 - state.myIndex)],
      });
  }
  resultStatsLine.textContent = stats;
  resultOverlay.hidden = false;
}
function hideResult() { resultOverlay.hidden = true; }
function showModeOverlay() { modeOverlay.hidden = false; }
function hideModeOverlay() { modeOverlay.hidden = true; }

// ---- round control --------------------------------------------------------
function chooseMode(mode) {
  state.mode = mode;
  state.wins = [0, 0];
  state.starter = 0;
  hideModeOverlay();
  if (mode === 'lan') startLanFlow();
  else setupRoundLocalStyle(0);
}

function newGame() {
  if (onlineLan()) {
    if (state.myIndex === 0) dealAsDealer(true);
    else net.send('newgameRequest', {});
    return;
  }
  state.starter = 1 - state.starter;
  setupRoundLocalStyle(state.starter);
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
btnModeAi.addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); chooseMode('ai'); });
btnModeLocal.addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); chooseMode('local'); });
btnModeLan.addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); chooseMode('lan'); });
btnGateReady.addEventListener('click', () => { sfx.unlock(); state.gate = false; render(); });
btnDraw.addEventListener('click', () => { sfx.unlock(); if (canActNow()) { playerDraw(state.turn, { broadcast: onlineLan() }); render(); } });
btnPass.addEventListener('click', () => { sfx.unlock(); if (canActNow()) doPass(state.turn, { broadcast: onlineLan() }); });
endLeft.addEventListener('click', () => onEndTap('left'));
endRight.addEventListener('click', () => onEndTap('right'));
btnMenu.addEventListener('click', showModeOverlay);
btnNew.addEventListener('click', () => newGame());
btnPlayAgain.addEventListener('click', () => newGame());

// ---- test/debug hook (same convention as window.OGH_TTT) ------------------
window.OGH_DOMINO = {
  getState: () => state,
  setState(patch) { Object.assign(state, patch); render(); },
  getNet: () => net,
  render,
  chooseMode,
  newGame,
  play: (tile, end) => playTile(tile, end, { broadcast: onlineLan() }),
  draw: () => { playerDraw(state.turn, { broadcast: onlineLan() }); render(); },
  pass: () => doPass(state.turn, { broadcast: onlineLan() }),
  rules: { shuffledDeck, deal, placeTile, playableEnds, hasPlayable, handPips, blockedResult },
  pickPlay,
};

// ---- kickoff --------------------------------------------------------------
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
