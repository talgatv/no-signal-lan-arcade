/**
 * app.js — Backgammon: board state, canvas rendering, tap-select input, a
 * heuristic AI opponent, same-device pass-and-play, and LAN multiplayer over
 * OGHNet.
 *
 * The rules (rules.js) and AI (ai.js) are pure and DOM/network-free; this file
 * is only orchestration + presentation, the same split as games/chess and
 * games/checkers.
 *
 * Modes share one `state.board` and one move primitive (applyTurnMove):
 *   'ai'    — human is White (bottom-right home, runs 24->1), AI is Black.
 *   'local' — pass-and-play; whoever's turn it is rolls and moves.
 *   'lan'   — OGHNet room; first joiner is White, second is Black, later
 *             joiners spectate. The player whose turn it is rolls locally and
 *             broadcasts {action:'roll', payload:{d1,d2}} — the ONE piece of
 *             information that can't be derived — then relays each single-die
 *             move as {action:'move', payload:{from,to,die}}. The receiver
 *             re-validates every relayed move against its OWN board + remaining
 *             dice before applying, and BOTH sides derive turn changes (and a
 *             no-legal-move pass) from the shared board — no separate
 *             "end turn" message — so a stale/duplicate relay can't desync.
 *   If OGHNet can't reach a host, 'lan' degrades to local pass-and-play.
 *
 * Board orientation is fixed (White home bottom-right, point 1 bottom-right,
 * point 24 top-right) for every mode and never mirrored — the 24-point layout
 * is a universal convention, same precedent as games/chess.
 */
import { OGHNet } from '../../_shared/js/ogh-net.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import {
  WHITE, BLACK, other, initialBoard, cloneBoard, countAt, ownsPoint, allHome,
  canBearOff, singleDieMoves, applyMove, legalTurnMoves, movesFrom, maxDiceUsable,
  winner, pipCount, diceFromRoll, removeOne,
} from './rules.js';
import { pickTurn, evaluate, DIFFICULTY } from './ai.js';
import { LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings } from './i18n.js';

const GAME_ID = 'backgammon';
const AI_ROLL_DELAY_MS = 520;   // pause before the AI rolls
const AI_STEP_DELAY_MS = 620;   // pause between the AI's individual checker moves
const PASS_DELAY_MS = 1500;     // how long "no legal moves" shows before passing
const sfx = createOghSfx();

function qs(name) {
  try { return new URLSearchParams(location.search).get(name); } catch { return null; }
}
const rndDie = () => 1 + ((Math.random() * 6) | 0);

// ---- board geometry (logical pixels; scaled as a whole via CSS transform) ---
const BOARD_W = 760;
const BOARD_H = 600;
const FRAME = 16;
const TRAY_W = 54;
const BAR_W = 46;
const PLAY_W = BOARD_W - FRAME * 2 - TRAY_W;   // width for 12 points + the bar
const HALF_W = (PLAY_W - BAR_W) / 2;           // each half holds 6 point columns
const POINT_W = HALF_W / 6;
const POINT_H = 244;
const CHECKER_R = POINT_W * 0.44;
const MAX_STACK = 5;                            // checkers drawn before a count label
const BAR_X0 = FRAME + HALF_W;                  // left edge of the center bar
const TRAY_X0 = BOARD_W - FRAME - TRAY_W;       // left edge of the bear-off tray
const MID_Y = BOARD_H / 2;

// column center x for columns 0..11 (0..5 left half, 6..11 right half)
function colCenterX(c) {
  return c < 6
    ? FRAME + POINT_W * (c + 0.5)
    : FRAME + HALF_W + BAR_W + POINT_W * ((c - 6) + 0.5);
}
const isTopPoint = (p) => p >= 13;
const pointCol = (p) => (p >= 13 ? p - 13 : 12 - p);   // 13->col0 … 24->col11 ; 12->col0 … 1->col11
const pointCenterX = (p) => colCenterX(pointCol(p));

/** Center of the k-th (0-based, from the board edge) checker on point p. */
function checkerXY(p, k) {
  const cx = pointCenterX(p);
  const kk = Math.min(k, MAX_STACK - 1);
  const y = isTopPoint(p)
    ? FRAME + CHECKER_R + 3 + kk * 2 * CHECKER_R
    : BOARD_H - FRAME - CHECKER_R - 3 - kk * 2 * CHECKER_R;
  return [cx, y];
}

// ---- DOM refs --------------------------------------------------------------
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const stage = document.querySelector('.bg-stage');
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

const btnRoll = document.getElementById('btnRoll');
const btnMenu = document.getElementById('btnMenu');
const btnNew = document.getElementById('btnNew');

// ---- state -----------------------------------------------------------------
const state = {
  mode: 'menu',             // 'menu' | 'ai' | 'local' | 'lan'
  difficulty: 'medium',
  board: initialBoard(),
  turn: WHITE,              // White moves first
  rolled: false,
  roll: [],                 // the two physical dice, e.g. [5,3]
  remaining: [],            // unplayed die VALUES, e.g. [5,3] or [4,4,4,4]
  selected: null,           // point index | 'bar' | null
  turnMoves: [],            // legalTurnMoves(board, turn, remaining) cache
  lastMove: null,           // { from, to, color } for a subtle trail
  noMoves: false,           // roll produced no legal move (about to pass)
  winner: null,             // 'w' | 'b' | null
  humanColor: WHITE,        // 'ai' mode: human is White
  myColor: WHITE,           // 'lan' mode: 'w' | 'b' | null(spectator)
  wins: { w: 0, b: 0 },
};

let net = null;
let aiTimer = null;
let aiStepTimer = null;
let passTimer = null;
let aiThinking = false;
let currentLang = detectLang();

const inRound = () => state.mode !== 'menu';
const aiColor = () => other(state.humanColor);
const lanIsOnline = () => state.mode === 'lan' && net && net.mode === 'online';
const broadcastMoves = () => lanIsOnline();

// ---- scale-to-fit (no scrolling, ever) — games/chess fitBoard() ------------
function fitBoard() {
  const availW = stage.clientWidth;
  const availH = stage.clientHeight;
  if (!availW || !availH) return;
  const scale = Math.min(availW / BOARD_W, availH / BOARD_H, 1.2) * 0.98;
  canvas.style.transform = `scale(${scale})`;
}
if (typeof ResizeObserver === 'function') new ResizeObserver(fitBoard).observe(stage);
window.addEventListener('resize', fitBoard);
window.addEventListener('orientationchange', fitBoard);

// ---- turn ownership --------------------------------------------------------
/** Is it the local human's turn to act (roll or move) right now? */
function isMyTurn() {
  if (!inRound() || state.winner) return false;
  if (state.mode === 'ai') return state.turn === state.humanColor;
  if (state.mode === 'local') return true;
  if (state.mode === 'lan') {
    if (!net || net.mode !== 'online') return true;   // offline fallback = pass & play
    if ((net.players || []).length < 2) return false;
    if (!state.myColor) return false;                 // spectator
    return state.turn === state.myColor;
  }
  return false;
}
const canRollNow = () => isMyTurn() && !state.rolled && !aiThinking && !state.noMoves && !state.winner;
const canMoveNow = () => isMyTurn() && state.rolled && !aiThinking && !state.noMoves && !state.winner;

// ---- LAN helpers -----------------------------------------------------------
function computeMyColor() {
  if (!net || net.mode !== 'online') return WHITE;
  const i = (net.players || []).findIndex((p) => p.id === net.playerId);
  if (i === 0) return WHITE;
  if (i === 1) return BLACK;
  return null; // 3rd+ joiner spectates
}

// ---- rolling ---------------------------------------------------------------
/** Perform a roll (from a human tap, the AI, or a relayed remote roll). */
function performRoll(values, opts = {}) {
  clearTimeout(passTimer);
  const [d1, d2] = values;
  state.roll = [d1, d2];
  state.remaining = diceFromRoll(d1, d2);
  state.rolled = true;
  state.noMoves = false;
  state.selected = null;
  sfx.play('dice');
  if (opts.broadcast && lanIsOnline()) net.send('roll', { d1, d2 });

  state.turnMoves = legalTurnMoves(state.board, state.turn, state.remaining);
  if (state.turnMoves.length === 0) {
    state.noMoves = true;
    render();
    passTimer = setTimeout(() => {
      if (state.noMoves && !state.winner && inRound()) endTurn();
    }, PASS_DELAY_MS);
    return;
  }
  if (state.board.bar[state.turn] > 0) state.selected = 'bar'; // forced re-entry
  render();
}

// ---- core move primitive ---------------------------------------------------
/** Apply one fully-legal single-die move; advance the turn, sync, detect win. */
function applyTurnMove(m, opts = {}) {
  const res = applyMove(state.board, state.turn, m);
  state.board = res.board;
  state.lastMove = { from: m.from, to: m.to, color: state.turn };
  state.remaining = removeOne(state.remaining, m.die);
  state.selected = null;

  if (res.hit) sfx.play('clack');
  else if (m.to === 'off') sfx.play('pocket');
  else sfx.play('place');

  if (opts.broadcast && lanIsOnline()) net.send('move', { from: m.from, to: m.to, die: m.die });

  const w = winner(state.board);
  if (w) { finishGame(w); return; }

  state.turnMoves = state.remaining.length
    ? legalTurnMoves(state.board, state.turn, state.remaining) : [];
  if (state.remaining.length === 0 || state.turnMoves.length === 0) {
    render();
    endTurn();
    return;
  }
  if (state.board.bar[state.turn] > 0) state.selected = 'bar'; // still on the bar
  render();
}

function endTurn() {
  state.turn = other(state.turn);
  beginTurn();
}

/** Start a fresh turn for state.turn: clear dice, then wait for roll / drive AI. */
function beginTurn() {
  clearTimeout(aiTimer); clearTimeout(aiStepTimer); clearTimeout(passTimer);
  aiThinking = false;
  state.rolled = false;
  state.roll = [];
  state.remaining = [];
  state.turnMoves = [];
  state.selected = null;
  state.noMoves = false;
  if (state.winner) { render(); return; }
  render();
  if (state.mode === 'ai' && state.turn === aiColor()) scheduleAi();
}

// ---- AI --------------------------------------------------------------------
function scheduleAi() {
  clearTimeout(aiTimer);
  aiThinking = true;
  render();
  aiTimer = setTimeout(() => {
    if (state.mode !== 'ai' || state.winner || state.turn !== aiColor()) { aiThinking = false; return; }
    performRoll([rndDie(), rndDie()], { broadcast: false });
    if (state.noMoves) return;              // pass timer will end the turn; keep input locked
    let seq = [];
    try { seq = pickTurn(state.board, aiColor(), state.remaining, DIFFICULTY[state.difficulty]); }
    catch (e) { console.warn('[backgammon] AI error', e); }
    if (!seq.length) { render(); endTurn(); return; }
    playAiSequence(seq);
  }, AI_ROLL_DELAY_MS);
}

/** Play the AI's chosen move sequence one checker at a time, with small delays. */
function playAiSequence(seq) {
  aiThinking = true;
  let k = 0;
  const stepOne = () => {
    if (state.mode !== 'ai' || state.winner || state.turn !== aiColor()) { aiThinking = false; return; }
    if (k >= seq.length) { aiThinking = false; return; }
    const m = seq[k++];
    applyTurnMove(m, { broadcast: false }); // the last move triggers endTurn() itself
    if (k < seq.length && !state.winner && state.turn === aiColor()) {
      aiStepTimer = setTimeout(stepOne, AI_STEP_DELAY_MS);
    } else {
      aiThinking = false;
      render();
    }
  };
  aiStepTimer = setTimeout(stepOne, AI_STEP_DELAY_MS);
}

// ---- win / result ----------------------------------------------------------
function winnerIsHuman(w) {
  if (state.mode === 'ai') return w === state.humanColor;
  if (state.mode === 'lan' && state.myColor) return w === state.myColor;
  return true; // local pass & play: celebrate whoever won
}

function finishGame(w) {
  clearTimeout(aiTimer); clearTimeout(aiStepTimer); clearTimeout(passTimer);
  aiThinking = false;
  state.winner = w;
  state.selected = null;
  if (w === WHITE) state.wins.w += 1; else state.wins.b += 1;
  sfx.play(winnerIsHuman(w) ? 'win' : 'die');
  render();
  showResult();
  try {
    OGHProfile.saveProgress(GAME_ID, { wins: state.wins }, {
      summary: `White ${state.wins.w} · Black ${state.wins.b}`,
    });
  } catch { /* best-effort */ }
}

// ---- input -----------------------------------------------------------------
function zoneAt(x, y) {
  if (x >= TRAY_X0) return 'off';
  if (x >= BAR_X0 && x < BAR_X0 + BAR_W) return 'bar';
  let col;
  if (x < BAR_X0) col = Math.max(0, Math.min(5, Math.floor((x - FRAME) / POINT_W)));
  else col = 6 + Math.max(0, Math.min(5, Math.floor((x - (BAR_X0 + BAR_W)) / POINT_W)));
  const top = y < MID_Y;
  return top ? 13 + col : 12 - col;
}

function onTap(zone) {
  const color = state.turn;
  const bcast = broadcastMoves();

  // Forced re-entry: only bar-entry moves are available while on the bar.
  if (state.board.bar[color] > 0) {
    if (typeof zone === 'number') {
      const m = state.turnMoves.find((mm) => mm.from === 'bar' && mm.to === zone);
      if (m) applyTurnMove(m, { broadcast: bcast });
    }
    return;
  }

  if (zone === 'off') {
    if (state.selected != null && state.selected !== 'bar') {
      const m = state.turnMoves.find((mm) => mm.from === state.selected && mm.to === 'off');
      if (m) applyTurnMove(m, { broadcast: bcast });
    }
    return;
  }

  if (typeof zone !== 'number') return;

  // Tapping a destination of the selected checker => move.
  if (state.selected != null) {
    const m = state.turnMoves.find((mm) => mm.from === state.selected && mm.to === zone);
    if (m) { applyTurnMove(m, { broadcast: bcast }); return; }
  }
  // Otherwise (re)select one of your own checkers that has a legal move.
  if (ownsPoint(state.board, zone, color) && state.turnMoves.some((mm) => mm.from === zone)) {
    state.selected = state.selected === zone ? null : zone;
    render();
    return;
  }
  // Tapped nothing useful: clear any selection.
  if (state.selected != null) { state.selected = null; render(); }
}

canvas.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  e.preventDefault();
  if (!inRound() || state.winner) return;
  if (!state.rolled) { if (canRollNow()) performRoll([rndDie(), rndDie()], { broadcast: broadcastMoves() }); return; }
  if (!canMoveNow()) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * BOARD_W;
  const y = ((e.clientY - rect.top) / rect.height) * BOARD_H;
  onTap(zoneAt(x, y));
});

// ---- rendering -------------------------------------------------------------
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function drawChecker(c, x, y, color, selected) {
  c.save();
  const g = c.createRadialGradient(x - CHECKER_R * 0.3, y - CHECKER_R * 0.35, CHECKER_R * 0.2, x, y, CHECKER_R);
  if (color === WHITE) { g.addColorStop(0, '#dff8ff'); g.addColorStop(1, '#2ba6d8'); }
  else { g.addColorStop(0, '#ffd6f0'); g.addColorStop(1, '#c93b93'); }
  c.beginPath(); c.arc(x, y, CHECKER_R, 0, Math.PI * 2);
  c.shadowColor = color === WHITE ? 'rgba(92,225,255,0.75)' : 'rgba(255,107,203,0.75)';
  c.shadowBlur = 12;
  c.fillStyle = g; c.fill();
  c.shadowBlur = 0;
  c.lineWidth = 2;
  c.strokeStyle = color === WHITE ? 'rgba(234,249,255,0.95)' : 'rgba(255,205,238,0.95)';
  c.stroke();
  c.beginPath(); c.arc(x, y, CHECKER_R * 0.52, 0, Math.PI * 2);
  c.lineWidth = 1.4; c.strokeStyle = 'rgba(6,12,22,0.35)'; c.stroke();
  if (selected) {
    c.beginPath(); c.arc(x, y, CHECKER_R + 3, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(92,255,176,0.95)'; c.lineWidth = 3;
    c.shadowColor = 'rgba(92,255,176,0.9)'; c.shadowBlur = 14; c.stroke();
  }
  c.restore();
}

function drawStack(c, p, count, color, selected) {
  const shown = Math.min(count, MAX_STACK);
  for (let k = 0; k < shown; k++) {
    const [x, y] = checkerXY(p, k);
    drawChecker(c, x, y, color, selected && k === shown - 1);
  }
  if (count > MAX_STACK) {
    const [x, y] = checkerXY(p, MAX_STACK - 1);
    c.save();
    c.fillStyle = '#07131c';
    c.font = `bold ${Math.round(CHECKER_R)}px "JetBrains Mono", monospace`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(count), x, y);
    c.restore();
  }
}

function drawPoint(c, p, isTarget) {
  const cx = pointCenterX(p);
  const half = POINT_W * 0.46;
  const top = isTopPoint(p);
  const baseY = top ? FRAME : BOARD_H - FRAME;
  const apexY = top ? FRAME + POINT_H : BOARD_H - FRAME - POINT_H;
  c.beginPath();
  c.moveTo(cx - half, baseY); c.lineTo(cx + half, baseY); c.lineTo(cx, apexY); c.closePath();
  const alt = (pointCol(p) + (top ? 0 : 1)) % 2 === 0;
  c.fillStyle = alt ? 'rgba(92,225,255,0.09)' : 'rgba(255,107,203,0.07)';
  c.fill();
  c.lineWidth = 1.4; c.strokeStyle = 'rgba(92,225,255,0.20)'; c.stroke();
  if (isTarget) {
    c.save();
    c.lineWidth = 2.6; c.strokeStyle = 'rgba(92,255,176,0.95)';
    c.shadowColor = 'rgba(92,255,176,0.85)'; c.shadowBlur = 14; c.stroke();
    c.beginPath();
    c.arc(cx, top ? baseY + CHECKER_R * 1.2 : baseY - CHECKER_R * 1.2, CHECKER_R * 0.34, 0, Math.PI * 2);
    c.fillStyle = 'rgba(92,255,176,0.9)'; c.fill();
    c.restore();
  }
}

function pipPositions(v) {
  const a = 0.26, b = 0.5, cc = 0.74; // relative positions within a die face
  const M = {
    1: [[b, b]],
    2: [[a, a], [cc, cc]],
    3: [[a, a], [b, b], [cc, cc]],
    4: [[a, a], [cc, a], [a, cc], [cc, cc]],
    5: [[a, a], [cc, a], [b, b], [a, cc], [cc, cc]],
    6: [[a, a], [cc, a], [a, b], [cc, b], [a, cc], [cc, cc]],
  };
  return M[v] || [];
}

function drawDie(c, x, y, size, val, dim, color) {
  c.save();
  roundRect(c, x, y, size, size, size * 0.2);
  c.fillStyle = dim ? 'rgba(20,26,44,0.55)' : '#0e1428';
  if (!dim) { c.shadowColor = color === WHITE ? 'rgba(92,225,255,0.6)' : 'rgba(255,107,203,0.6)'; c.shadowBlur = 12; }
  c.fill(); c.shadowBlur = 0;
  c.lineWidth = 2;
  c.strokeStyle = dim ? 'rgba(120,140,180,0.4)'
    : (color === WHITE ? 'rgba(92,225,255,0.9)' : 'rgba(255,107,203,0.9)');
  c.stroke();
  const pipColor = dim ? 'rgba(150,165,200,0.5)' : (color === WHITE ? '#eaf9ff' : '#ffd6f0');
  c.fillStyle = pipColor;
  for (const [px, py] of pipPositions(val)) {
    c.beginPath(); c.arc(x + px * size, y + py * size, size * 0.08, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

function drawDice(c) {
  if (!state.rolled || !state.roll.length) return;
  const doubles = state.roll[0] === state.roll[1];
  const list = doubles ? [state.roll[0], state.roll[0], state.roll[0], state.roll[0]] : [state.roll[0], state.roll[1]];
  const rem = state.remaining.slice();
  const size = 34, gap = 12;
  const totalW = list.length * size + (list.length - 1) * gap;
  const startX = FRAME + HALF_W + BAR_W + (HALF_W - totalW) / 2;
  const y = MID_Y - size / 2;
  list.forEach((v, i) => {
    let dim = true;
    const j = rem.indexOf(v);
    if (j >= 0) { dim = false; rem.splice(j, 1); }
    drawDie(c, startX + i * (size + gap), y, size, v, dim, state.turn);
  });
}

function drawBar(c, targets) {
  // frame + center bar
  c.save();
  c.strokeStyle = 'rgba(92,225,255,0.22)'; c.lineWidth = 2;
  roundRect(c, FRAME * 0.5, FRAME * 0.5, BOARD_W - FRAME, BOARD_H - FRAME, 10); c.stroke();
  c.fillStyle = 'rgba(6,10,20,0.6)';
  c.fillRect(BAR_X0, FRAME, BAR_W, BOARD_H - FRAME * 2);
  c.strokeStyle = 'rgba(92,225,255,0.18)';
  c.strokeRect(BAR_X0, FRAME, BAR_W, BOARD_H - FRAME * 2);
  // bar label
  c.fillStyle = 'rgba(139,147,184,0.5)';
  c.font = '10px "JetBrains Mono", monospace';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.save(); c.translate(BAR_X0 + BAR_W / 2, MID_Y); c.rotate(-Math.PI / 2);
  c.fillText(t(currentLang, 'barLabel'), 0, 0); c.restore();
  c.restore();

  const barX = BAR_X0 + BAR_W / 2;
  const selBar = state.selected === 'bar';
  for (let k = 0; k < state.board.bar.b; k++) {
    drawChecker(c, barX, MID_Y - CHECKER_R - 4 - k * 2 * CHECKER_R, BLACK, selBar && state.turn === BLACK && k === 0);
  }
  for (let k = 0; k < state.board.bar.w; k++) {
    drawChecker(c, barX, MID_Y + CHECKER_R + 4 + k * 2 * CHECKER_R, WHITE, selBar && state.turn === WHITE && k === 0);
  }
}

function drawTray(c, offTarget) {
  const x = TRAY_X0 + 6;
  const w = TRAY_W - 12;
  c.save();
  c.strokeStyle = offTarget ? 'rgba(92,255,176,0.95)' : 'rgba(92,225,255,0.18)';
  c.lineWidth = offTarget ? 2.6 : 1.4;
  if (offTarget) { c.shadowColor = 'rgba(92,255,176,0.8)'; c.shadowBlur = 14; }
  c.strokeRect(TRAY_X0, FRAME, TRAY_W, BOARD_H - FRAME * 2);
  c.shadowBlur = 0;
  c.fillStyle = 'rgba(139,147,184,0.5)';
  c.font = '10px "JetBrains Mono", monospace';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(t(currentLang, 'offLabel'), TRAY_X0 + TRAY_W / 2, MID_Y);
  // borne-off bars: White stacks up from the bottom, Black down from the top.
  const bh = 9, gap = 3;
  for (let k = 0; k < state.board.off.w; k++) {
    const yy = BOARD_H - FRAME - bh - 4 - k * (bh + gap);
    drawOffBar(c, x, yy, w, bh, WHITE);
  }
  for (let k = 0; k < state.board.off.b; k++) {
    const yy = FRAME + 4 + k * (bh + gap);
    drawOffBar(c, x, yy, w, bh, BLACK);
  }
  c.restore();
}

function drawOffBar(c, x, y, w, h, color) {
  c.save();
  roundRect(c, x, y, w, h, 3);
  c.fillStyle = color === WHITE ? 'rgba(92,225,255,0.65)' : 'rgba(255,107,203,0.6)';
  c.fill();
  c.strokeStyle = color === WHITE ? 'rgba(234,249,255,0.7)' : 'rgba(255,205,238,0.7)';
  c.lineWidth = 1; c.stroke();
  c.restore();
}

function render() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== BOARD_W * dpr) { canvas.width = BOARD_W * dpr; canvas.height = BOARD_H * dpr; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, BOARD_W, BOARD_H);
  ctx.fillStyle = '#0a0d18';
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);

  const canAct = canMoveNow();
  // destination targets for the selected checker (point indices and/or 'off')
  const targets = new Set();
  let offTarget = false;
  if (canAct && state.selected != null) {
    for (const m of state.turnMoves) {
      if (m.from !== state.selected) continue;
      if (m.to === 'off') offTarget = true; else targets.add(m.to);
    }
  }

  drawBar(ctx, targets);
  for (let p = 1; p <= 24; p++) drawPoint(ctx, p, targets.has(p));
  drawTray(ctx, offTarget);

  for (let p = 1; p <= 24; p++) {
    const w = countAt(state.board, p, WHITE);
    const b = countAt(state.board, p, BLACK);
    if (w) drawStack(ctx, p, w, WHITE, state.selected === p);
    else if (b) drawStack(ctx, p, b, BLACK, state.selected === p);
  }

  drawDice(ctx);
  updateHud();
}

function updateHud() {
  netPill.textContent = net
    ? (net.mode === 'online' ? `ONLINE · ${net.room} · ${(net.players || []).length}p` : 'OFFLINE')
    : '…';
  turnPill.textContent = turnText();
  countPill.innerHTML = `<span class="bg-dot-w">●</span> ${state.board.off.w} · <span class="bg-dot-b">●</span> ${state.board.off.b}`;

  btnRoll.hidden = !canRollNow();

  const acting = canMoveNow();
  let hint = 'hintMove';
  if (!inRound() || state.winner) hint = 'hintRoll';
  else if (state.noMoves) hint = 'hintNoMoves';
  else if (!state.rolled) hint = 'hintRoll';
  else if (acting && state.board.bar[state.turn] > 0) hint = 'hintBar';
  else if (acting && allHome(state.board, state.turn)) hint = 'hintBearOff';
  hintEl.textContent = t(currentLang, hint);
}

function colorWord(c) { return t(currentLang, c === WHITE ? 'colorWhite' : 'colorBlack'); }

function turnText() {
  if (!inRound() || state.winner) return '';
  if (state.mode === 'ai') {
    if (state.turn === aiColor()) return t(currentLang, 'turnAiThinking');
    return t(currentLang, 'turnYours');
  }
  const rollKey = state.rolled ? 'turnToMove' : 'turnToRoll';
  if (state.mode === 'local') return t(currentLang, rollKey, { color: colorWord(state.turn) });
  if (state.mode === 'lan') {
    if (!net || net.mode !== 'online') return t(currentLang, rollKey, { color: colorWord(state.turn) });
    if ((net.players || []).length < 2) return t(currentLang, 'waitingOpponent', { room: net.room });
    if (!state.myColor) return t(currentLang, 'spectatorNote');
    return state.turn === state.myColor ? t(currentLang, 'turnYours') : t(currentLang, 'turnOpp');
  }
  return '';
}

function describeResult() {
  const w = state.winner;
  if (state.mode === 'ai') return { key: w === state.humanColor ? 'winYou' : 'winAi' };
  if (state.mode === 'lan' && state.myColor) return { key: w === state.myColor ? 'winYou' : 'winOpp' };
  return { key: 'winColor', vars: { color: colorWord(w) } };
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

// ---- round control ---------------------------------------------------------
function startGame() {
  clearTimeout(aiTimer); clearTimeout(aiStepTimer); clearTimeout(passTimer);
  aiThinking = false;
  state.board = initialBoard();
  state.turn = WHITE;
  state.winner = null;
  state.lastMove = null;
  hideResult();
  beginTurn();
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

// ---- LAN wiring ------------------------------------------------------------
function onNetChange() {
  if (state.mode === 'lan') state.myColor = computeMyColor();
  render();
}

function onNetAction({ action, payload, from }) {
  if (state.mode !== 'lan') return;
  if (from === net.playerId) return; // host already excludes the sender; defensive
  if (action === 'roll') applyRemoteRoll(payload);
  else if (action === 'move') applyRemoteMove(payload);
  else if (action === 'newgame') startGame();
}

function applyRemoteRoll(payload) {
  if (!payload || state.winner) return;
  if (state.rolled) return;                        // already have this turn's roll
  if (state.myColor && state.turn === state.myColor) return; // not the opponent's roll
  const d1 = payload.d1, d2 = payload.d2;
  if (!(d1 >= 1 && d1 <= 6 && d2 >= 1 && d2 <= 6)) return;
  performRoll([d1, d2], { broadcast: false });
}

/**
 * Apply a move relayed from the other player. Re-validated against our OWN
 * board + remaining dice (must be a currently-legal move for the side to move),
 * so a stale / duplicate / out-of-turn relayed move is simply ignored.
 */
function applyRemoteMove(payload) {
  if (!payload || state.winner || !state.rolled) return;
  const { from, to, die } = payload;
  const m = legalTurnMoves(state.board, state.turn, state.remaining)
    .find((mm) => mm.from === from && mm.to === to && mm.die === die);
  if (m) applyTurnMove(m, { broadcast: false });
}

// ---- i18n wiring -----------------------------------------------------------
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

// ---- button wiring ---------------------------------------------------------
btnModeAi.addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); modeList.hidden = true; diffList.hidden = false; });
btnDiffBack.addEventListener('click', () => { diffList.hidden = true; modeList.hidden = false; });
diffBtns.forEach((btn) => btn.addEventListener('click', () => {
  sfx.play('tap'); state.difficulty = btn.dataset.diff; chooseMode('ai');
}));
btnModeLocal.addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); chooseMode('local'); });
btnModeLan.addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); chooseMode('lan'); });
btnRoll.addEventListener('click', () => { sfx.unlock(); if (canRollNow()) performRoll([rndDie(), rndDie()], { broadcast: broadcastMoves() }); });
btnMenu.addEventListener('click', showModeOverlay);
btnNew.addEventListener('click', () => newGame());
btnPlayAgain.addEventListener('click', () => newGame());

// ---- test/debug hook (same convention as window.OGH_CHESS) -----------------
window.OGH_BACKGAMMON = {
  getState: () => state,
  getNet: () => net,
  chooseMode,
  newGame,
  render,
  fitBoard,
  tap: onTap,
  zoneAt,
  /** Force-set the board (and turn) for scripted assertions; clears the roll. */
  setBoard(board, turn = WHITE) {
    state.board = cloneBoard(board);
    state.turn = turn;
    state.rolled = false; state.roll = []; state.remaining = []; state.turnMoves = [];
    state.selected = null; state.noMoves = false; state.winner = null;
    render();
    return state.board;
  },
  /** Force a specific roll for the current side (bypasses turn gating). */
  forceRoll(d1, d2) { performRoll([d1, d2], { broadcast: false }); return state.turnMoves.slice(); },
  /** Apply a specific legal move by from/to (drives assertions without taps). */
  move(from, to) {
    const m = state.turnMoves.find((mm) => mm.from === from && mm.to === to);
    if (m) { applyTurnMove(m, { broadcast: false }); return true; }
    return false;
  },
  getTurnMoves: () => state.turnMoves.slice(),
  // pure re-exports for driving assertions without the DOM
  rules: {
    initialBoard, cloneBoard, legalTurnMoves, singleDieMoves, movesFrom, applyMove,
    maxDiceUsable, winner, allHome, canBearOff, pipCount, countAt, ownsPoint,
    diceFromRoll, other, WHITE, BLACK,
  },
  ai: { pickTurn, evaluate, DIFFICULTY },
};

// ---- kickoff ---------------------------------------------------------------
canvas.style.width = `${BOARD_W}px`;
canvas.style.height = `${BOARD_H}px`;
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
