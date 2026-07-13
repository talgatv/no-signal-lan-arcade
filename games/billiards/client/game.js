/**
 * Billiards — top-down 8-ball pool. Solo practice or local pass-and-play
 * 2-player, real multi-ball physics.
 *
 * Drag back from the cue ball like a slingshot (Pointer Events unify mouse
 * and touch), release to shoot — direction from the pull angle, power from
 * pull distance (capped). physics.js owns the whole simulation (rolling
 * friction, cushion bounces, ball-ball elastic collisions, pocketing) in
 * plain canvas-pixel units with no DOM dependency, directly steppable from
 * a test harness (see window.OGH_BILLIARDS below) — same split as
 * games/mini-golf's physics.js. rules.js owns the 8-ball turn/foul/win
 * state machine, consulted only in '8ball' mode. This file owns everything
 * neither of those does: canvas rendering, input, HUD, sfx, and i18n
 * wiring, plus translating physics.js's low-level per-substep events
 * (collision/cushion/pocket) into the small per-shot summary rules.js
 * expects (what got pocketed, did the cue scratch, what did the cue ball
 * touch first).
 *
 * state.phase: 'modeSelect' -> 'aiming' -> 'shooting' (a shot is live) ->
 * back to 'aiming' once every ball has stopped (see resolveCurrentShot),
 * or 'gameOver' (8-ball only, once rules.js reports a win/loss). While
 * 8-ball's match.ballInHand is true, 'aiming' additionally accepts a tap
 * anywhere on the table (away from the cue ball) to instantly relocate the
 * cue ball before grabbing it to aim — see onPointerDown.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, groupLabel, applyStaticStrings,
} from './i18n.js';
import * as Physics from './physics.js';
import * as Rules from './rules.js';

const $ = (id) => document.getElementById(id);

const sfx = createOghSfx();

/* ------------------------------------------------------------------------ *
 * Aim tuning (input mapping, not physics — how a drag gesture in canvas
 * pixels becomes a shot direction + power). Distances are in the same
 * canvas-pixel space physics.js works in (no separate world<->screen
 * conversion needed — this game has no camera).
 * ------------------------------------------------------------------------ */
const MAX_DRAG_PX = 220;
const MIN_DRAG_PX_TO_LAUNCH = 8;
const GRAB_RADIUS_PX = 70;
const TOAST_MS = 2200;
/** Minimum ball-ball impact speed (px/s along the collision normal) before
 * a 'clack' sfx plays — filters out the near-silent contact reshuffling
 * that happens as a cluster of balls settles after a break. */
const CLACK_MIN_SPEED = 25;
const RAIL_W = 26;

/* ------------------------------------------------------------------------ *
 * Neon-vector palette. Hardcoded here (like games/comet and games/mini-golf's
 * draw code) rather than read from CSS custom properties — canvas fill/
 * stroke styles need concrete color strings either way. Ball colors follow
 * the standard pool numbering (1-7 solids, 9-15 the same 7 hues as stripes,
 * 8 black, cue off-white) so solids-vs-stripes-vs-cue is recognizable at a
 * glance the way real pool balls are, layered with the hub's neon glow.
 * ------------------------------------------------------------------------ */
const COLOR_RAIL_FILL = 'rgba(18, 22, 38, 0.94)';
const COLOR_RAIL_GLOW = 'rgba(92, 225, 255, 0.55)';
const COLOR_FELT = '#0b2a20';
const COLOR_FELT_GLOW = 'rgba(92, 255, 176, 0.55)';
const COLOR_POCKET_GLOW = 'rgba(255, 107, 203, 0.65)';
const COLOR_CUE = '#f6f2e6';
const BALL_COLORS = {
  1: '#f2c230', // yellow
  2: '#2f6fe0', // blue
  3: '#e5372f', // red
  4: '#8a3fd6', // purple
  5: '#f2861e', // orange
  6: '#1fa15a', // green
  7: '#8a2f2f', // maroon
  8: '#17181d', // black
};

let lang = detectLang();

const state = {
  mode: null, // 'solo' | '8ball'
  phase: 'modeSelect', // modeSelect | aiming | shooting | gameOver
  balls: Physics.createRack(), // populated immediately so the table behind the mode-select card isn't empty
  match: null, // Rules.createMatch() result, 8-ball only
  drag: null, // { pointerId, cur:{x,y} } while an aim-drag is live
  shotTracker: null, // { firstContactNumber, pocketedNumbers:[], scratched } for the shot currently resolving
  toastTimer: null,
};

const canvas = $('game');
const ctx = canvas.getContext('2d');
ctx.direction = 'ltr'; // belt-and-suspenders; see index.html's dir="ltr" comment

const overlay = $('overlay');
const modeCard = $('modeCard');
const gameOverCard = $('gameOverCard');
const hint = $('hint');
const toast = $('toast');
const hudTurn = $('hudTurn');
const hudGroup = $('hudGroup');
const hudRemaining = $('hudRemaining');
const btnNewRack = $('btnNewRack');

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/* ------------------------------------------------------------------------ *
 * Mode / match lifecycle
 * ------------------------------------------------------------------------ */
function startMode(mode) {
  state.mode = mode;
  state.balls = mode === 'solo' ? Physics.createSoloRack() : Physics.createRack();
  state.match = mode === '8ball' ? Rules.createMatch() : null;
  state.phase = 'aiming';
  state.drag = null;
  state.shotTracker = null;
  overlay.hidden = true;
  updateHud();
  renderHint();
}

function showModeSelect() {
  state.phase = 'modeSelect';
  modeCard.hidden = false;
  gameOverCard.hidden = true;
  overlay.hidden = false;
}

function fireShot(dirX, dirY, power) {
  if (state.phase !== 'aiming') return;
  const cue = Physics.findBall(state.balls, 0);
  if (!cue) return;
  Physics.applyShot(cue, dirX, dirY, power);
  state.shotTracker = { firstContactNumber: null, pocketedNumbers: [], scratched: false };
  if (state.match) state.match.ballInHand = false;
  state.phase = 'shooting';
  state.drag = null;
  canvas.classList.remove('is-dragging');
  sfx.play('thwack');
  updateHud();
  renderHint();
}

/** Fold one animation frame's worth of raw physics events into the live
 * shotTracker (first contact, pocketed numbers, scratch) and play sfx — at
 * most one 'clack' and one 'bounce' per frame regardless of how many
 * collisions/cushion hits actually happened (a chaotic break can trigger a
 * dozen in a single frame; layering that many overlapping oscillator
 * tones would just read as noise, not as "many things happened"). Pocket
 * events are rare enough to each get their own sound. */
function processEvents(events) {
  let playedClack = false;
  let playedBounce = false;
  for (const ev of events) {
    if (ev.type === 'collision') {
      if (state.shotTracker && state.shotTracker.firstContactNumber === null && (ev.a === 0 || ev.b === 0)) {
        state.shotTracker.firstContactNumber = ev.a === 0 ? ev.b : ev.a;
      }
      if (!playedClack && ev.speed > CLACK_MIN_SPEED) {
        sfx.play('clack');
        playedClack = true;
      }
    } else if (ev.type === 'cushion') {
      if (!playedBounce) {
        sfx.play('bounce');
        playedBounce = true;
      }
    } else if (ev.type === 'pocket') {
      if (state.shotTracker) {
        if (ev.isCue) state.shotTracker.scratched = true;
        else state.shotTracker.pocketedNumbers.push(ev.number);
      }
      sfx.play('pocket');
    }
  }
}

function resolveCurrentShot() {
  const tracker = state.shotTracker;
  state.shotTracker = null;
  const cue = Physics.findBall(state.balls, 0);

  if (tracker.scratched && cue) {
    Physics.respotCueBall(state.balls, cue);
  }

  if (state.mode === 'solo') {
    state.phase = 'aiming';
    checkSoloClear();
    updateHud();
    renderHint();
    return;
  }

  resolve8BallShot(tracker);
}

function checkSoloClear() {
  const remaining = state.balls.filter((b) => b.number !== 0 && !b.pocketed).length;
  if (remaining === 0) {
    showToast(t(lang, 'rackClearedToast'), true);
    sfx.play('win');
  }
}

function resolve8BallShot(tracker) {
  const match = state.match;
  const shooterIdx = match.currentPlayer;
  const result = Rules.resolveShot(match, state.balls, {
    pocketedNumbers: tracker.pocketedNumbers,
    scratched: tracker.scratched,
    firstContactNumber: tracker.firstContactNumber,
  });

  if (result.gameOver) {
    sfx.play(result.winner === shooterIdx ? 'win' : 'die');
    state.phase = 'gameOver';
    showGameOver();
  } else {
    state.phase = 'aiming';
    if (result.foul) {
      sfx.play('die');
      const key = result.foulReason === 'scratch' ? 'foulScratch'
        : result.foulReason === 'noContact' ? 'foulNoContact' : 'foulWrongBall';
      showToast(t(lang, key, { n: match.currentPlayer + 1 }), false);
    } else if (result.groupAssigned) {
      showToast(t(lang, 'groupAssignedMessage', {
        n: shooterIdx + 1,
        group: groupLabel(lang, match.players[shooterIdx].group),
      }), true);
    }
  }
  updateHud();
  renderHint();
}

function showGameOver() {
  const match = state.match;
  const winnerIdx = match.winner;
  $('gameOverTitle').textContent = t(lang, 'winTitle', { n: winnerIdx + 1 });
  let line = '';
  if (match.reasonKey === 'winEight') {
    line = t(lang, 'winEightLine', { group: groupLabel(lang, match.players[winnerIdx].group) });
  } else if (match.reasonKey === 'lossEightEarly') {
    line = t(lang, 'lossEightEarlyLine', { n: Rules.otherPlayer(winnerIdx) + 1 });
  } else if (match.reasonKey === 'lossEightScratch') {
    line = t(lang, 'lossEightScratchLine', { n: Rules.otherPlayer(winnerIdx) + 1 });
  }
  $('gameOverLine').textContent = line;
  modeCard.hidden = true;
  gameOverCard.hidden = false;
  overlay.hidden = false;
}

/* ------------------------------------------------------------------------ *
 * HUD + hint + toast
 * ------------------------------------------------------------------------ */
function updateHud() {
  if (state.mode === 'solo') {
    hudTurn.hidden = true;
    hudGroup.hidden = true;
    hudRemaining.hidden = false;
    btnNewRack.hidden = false;
    const remaining = state.balls.filter((b) => b.number !== 0 && !b.pocketed).length;
    hudRemaining.textContent = t(lang, 'soloRemainingLabel', { n: remaining });
    return;
  }
  if (state.mode === '8ball' && state.match) {
    hudTurn.hidden = false;
    hudGroup.hidden = false;
    hudRemaining.hidden = false;
    btnNewRack.hidden = true;
    const cur = state.match.currentPlayer;
    hudTurn.textContent = t(lang, 'turnLabel', { n: cur + 1 });
    const group = state.match.players[cur].group;
    hudGroup.textContent = groupLabel(lang, group);
    const remainingOwn = group
      ? state.balls.filter((b) => Rules.ballGroup(b.number) === group && !b.pocketed).length
      : null;
    if (group && remainingOwn === 0) {
      hudGroup.classList.add('is-eight-next');
      hudRemaining.textContent = t(lang, 'eightBallNext');
    } else {
      hudGroup.classList.remove('is-eight-next');
      hudRemaining.textContent = remainingOwn == null ? '' : t(lang, 'remainingLabel', { n: remainingOwn });
    }
  }
}

function renderHint() {
  if (state.phase === 'modeSelect' || state.phase === 'gameOver') {
    hint.textContent = '';
    return;
  }
  if (state.phase === 'shooting') {
    hint.textContent = t(lang, 'shootingHint');
    return;
  }
  if (state.match && state.match.ballInHand && !state.drag) {
    hint.textContent = t(lang, 'placingHint');
    return;
  }
  if (state.drag) {
    const cue = Physics.findBall(state.balls, 0);
    if (cue) {
      const aim = liveAimFromDrag(state.drag, cue);
      hint.textContent = t(lang, 'aimReadout', { power: Math.round(aim.power * 100) });
      return;
    }
  }
  hint.textContent = t(lang, 'aimHint');
}

function showToast(msg, good) {
  toast.textContent = msg;
  toast.classList.toggle('is-good', !!good);
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('is-on'));
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    toast.classList.remove('is-on');
    setTimeout(() => { toast.hidden = true; }, 240);
  }, TOAST_MS);
}

/* ------------------------------------------------------------------------ *
 * Input — Pointer Events unify mouse + touch. A shot-aim drag can only
 * start within a generous grab zone around the cue ball (a real slingshot
 * pull, not "drag anywhere"); setPointerCapture keeps receiving move/up
 * even if the finger leaves the canvas mid-drag. Same shape as
 * games/mini-golf's onPointerDown/Move/Up. The one addition: while 8-ball's
 * ball-in-hand is active, a pointerdown that DOESN'T land near the cue ball
 * instantly relocates it instead of being ignored — see the module doc
 * comment.
 * ------------------------------------------------------------------------ */
function eventToCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * Physics.CANVAS_W,
    y: ((e.clientY - rect.top) / rect.height) * Physics.CANVAS_H,
  };
}

/** Pull the pointer back away from where you want to shoot (slingshot):
 * direction is ball-minus-pointer, power from how far it's pulled. */
function liveAimFromDrag(drag, cue) {
  const dirX = cue.x - drag.cur.x;
  const dirY = cue.y - drag.cur.y;
  const dragDist = Math.hypot(dirX, dirY);
  const power = clamp(dragDist / MAX_DRAG_PX, 0, 1);
  return { dirX, dirY, dragDist, power };
}

function onPointerDown(e) {
  sfx.unlock();
  if (state.phase !== 'aiming') return;
  const cue = Physics.findBall(state.balls, 0);
  if (!cue) return;
  const pt = eventToCanvasPoint(e);
  const nearCue = Math.hypot(pt.x - cue.x, pt.y - cue.y) <= GRAB_RADIUS_PX;

  if (state.match && state.match.ballInHand && !nearCue) {
    e.preventDefault();
    Physics.placeCueBall(state.balls, cue, pt.x, pt.y);
    renderHint();
    return;
  }
  if (!nearCue) return;

  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('is-dragging');
  state.drag = { pointerId: e.pointerId, cur: pt };
  renderHint();
}

function onPointerMove(e) {
  if (!state.drag || e.pointerId !== state.drag.pointerId) return;
  e.preventDefault();
  state.drag.cur = eventToCanvasPoint(e);
  renderHint();
}

function onPointerUp(e) {
  if (!state.drag || e.pointerId !== state.drag.pointerId) return;
  e.preventDefault();
  const cue = Physics.findBall(state.balls, 0);
  canvas.classList.remove('is-dragging');
  if (!cue) { state.drag = null; return; }
  const aim = liveAimFromDrag(state.drag, cue);
  if (aim.dragDist < MIN_DRAG_PX_TO_LAUNCH) {
    state.drag = null;
    renderHint();
    return;
  }
  fireShot(aim.dirX, aim.dirY, aim.power);
}

/* ------------------------------------------------------------------------ *
 * Drawing — table
 * ------------------------------------------------------------------------ */
function roundRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawRail() {
  const x0 = Physics.TABLE_LEFT - RAIL_W;
  const y0 = Physics.TABLE_TOP - RAIL_W;
  const w = Physics.TABLE_RIGHT - Physics.TABLE_LEFT + RAIL_W * 2;
  const h = Physics.TABLE_BOTTOM - Physics.TABLE_TOP + RAIL_W * 2;
  roundRectPath(x0, y0, w, h, 18);
  ctx.fillStyle = COLOR_RAIL_FILL;
  ctx.fill();
  ctx.save();
  ctx.shadowColor = COLOR_RAIL_GLOW;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = COLOR_RAIL_GLOW;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

/** Small "sighting diamond" dots along each rail — cosmetic only, no
 * gameplay meaning, just the visual detail real tables have. */
function drawDiamonds() {
  const w = Physics.TABLE_RIGHT - Physics.TABLE_LEFT;
  const h = Physics.TABLE_BOTTOM - Physics.TABLE_TOP;
  const marks = [];
  for (const fx of [0.125, 0.375, 0.625, 0.875]) {
    marks.push({ x: Physics.TABLE_LEFT + w * fx, y: Physics.TABLE_TOP - RAIL_W / 2 });
    marks.push({ x: Physics.TABLE_LEFT + w * fx, y: Physics.TABLE_BOTTOM + RAIL_W / 2 });
  }
  marks.push({ x: Physics.TABLE_LEFT - RAIL_W / 2, y: Physics.TABLE_TOP + h * 0.5 });
  marks.push({ x: Physics.TABLE_RIGHT + RAIL_W / 2, y: Physics.TABLE_TOP + h * 0.5 });
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (const m of marks) {
    ctx.beginPath();
    ctx.arc(m.x, m.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The felt fill IS Physics.TABLE_LEFT/RIGHT/TOP/BOTTOM — the exact same
 * rectangle ball centers cushion-bounce against (those constants are
 * already the ball-EDGE contact line, see physics.js), so the drawn cloth
 * and the collision boundary can never visually disagree — same "one
 * source of truth" principle as games/mini-golf's fairway/wall pairing. */
function drawFelt() {
  const x = Physics.TABLE_LEFT;
  const y = Physics.TABLE_TOP;
  const w = Physics.TABLE_RIGHT - Physics.TABLE_LEFT;
  const h = Physics.TABLE_BOTTOM - Physics.TABLE_TOP;
  ctx.fillStyle = COLOR_FELT;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.shadowColor = COLOR_FELT_GLOW;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = COLOR_FELT_GLOW;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}

function drawPockets() {
  for (const p of Physics.POCKETS) {
    ctx.save();
    ctx.shadowColor = COLOR_POCKET_GLOW;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Physics.POCKET_RADIUS * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = '#020203';
    ctx.fill();
    ctx.strokeStyle = COLOR_POCKET_GLOW;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function ballColorKey(number) {
  if (number === 8) return 8;
  if (number > 8) return number - 8;
  return number;
}

function drawBall(ball) {
  if (ball.pocketed) return;
  const { x, y, number } = ball;
  const isCue = number === 0;
  const isStripe = number > 8;
  const color = isCue ? COLOR_CUE : BALL_COLORS[ballColorKey(number)];
  const r = Physics.BALL_RADIUS;

  ctx.beginPath();
  ctx.ellipse(x + 2, y + 3, r * 0.9, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fill();

  ctx.save();
  ctx.shadowColor = isCue ? 'rgba(255,255,255,0.85)' : color;
  ctx.shadowBlur = 9;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = isStripe ? '#f6f2e6' : color;
  ctx.fill();
  ctx.restore();

  if (isStripe) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.fillRect(x - r, y - r * 0.42, r * 2, r * 0.84);
    ctx.restore();
  }

  if (!isCue) {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#f6f2e6';
    ctx.fill();
    ctx.fillStyle = '#161616';
    ctx.font = `bold ${Math.round(r * 0.78)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), x, y + 0.5);
  }

  ctx.beginPath();
  ctx.arc(x - r * 0.32, y - r * 0.32, r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();
}

function drawBalls() {
  for (const ball of state.balls) drawBall(ball);
}

function drawAimUI() {
  if (state.phase !== 'aiming') return;
  const cue = Physics.findBall(state.balls, 0);
  if (!cue || cue.pocketed) return;

  ctx.save();
  ctx.setLineDash([3, 6]);
  ctx.strokeStyle = 'rgba(92,225,255,0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cue.x, cue.y, MAX_DRAG_PX, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (!state.drag) return;
  const aim = liveAimFromDrag(state.drag, cue);
  const dirLen = Math.hypot(aim.dirX, aim.dirY) || 1;
  const nx = aim.dirX / dirLen;
  const ny = aim.dirY / dirLen;
  const previewLen = 60 + aim.power * 500;

  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cue.x, cue.y);
  ctx.lineTo(state.drag.cur.x, state.drag.cur.y);
  ctx.stroke();

  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = `rgba(92,225,255,${0.4 + aim.power * 0.5})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cue.x, cue.y);
  ctx.lineTo(cue.x + nx * previewLen, cue.y + ny * previewLen);
  ctx.stroke();
  ctx.restore();

  const ax = cue.x + nx * previewLen;
  const ay = cue.y + ny * previewLen;
  const ang = Math.atan2(ny, nx);
  ctx.fillStyle = '#5ce1ff';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax - Math.cos(ang - 0.4) * 12, ay - Math.sin(ang - 0.4) * 12);
  ctx.lineTo(ax - Math.cos(ang + 0.4) * 12, ay - Math.sin(ang + 0.4) * 12);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(state.drag.cur.x, state.drag.cur.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, Physics.CANVAS_W, Physics.CANVAS_H);
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, Physics.CANVAS_W, Physics.CANVAS_H);
  drawRail();
  drawDiamonds();
  drawFelt();
  drawPockets();
  drawBalls();
  drawAimUI();
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

function applyLang(l) {
  lang = l;
  applyStaticStrings(lang);
  document.title = `${t(lang, 'title')} — OGH`;
  buildLangSwitch();
  $('langSwitch').setAttribute('aria-label', t(lang, 'langSwitchAria'));
  updateHud();
  renderHint();
  if (state.phase === 'gameOver') showGameOver();
  rememberLang(lang);
}

/* ------------------------------------------------------------------------ *
 * Main loop
 * ------------------------------------------------------------------------ */
function update(dt) {
  if (state.phase === 'shooting') {
    const events = Physics.stepWorld(state.balls, dt);
    processEvents(events);
    if (Physics.allStopped(state.balls)) {
      resolveCurrentShot();
    }
  }
}

let lastNow = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - lastNow) / 1000);
  lastNow = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------------ */
function init() {
  showModeSelect();
  applyLang(lang);
  draw();

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  $('btnSolo').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); startMode('solo'); });
  $('btn8Ball').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); startMode('8ball'); });
  $('btnPlayAgain').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); startMode(state.mode); });
  $('btnChangeMode').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); showModeSelect(); });
  btnNewRack.addEventListener('click', () => {
    sfx.unlock(); sfx.play('tap');
    if (state.mode === 'solo') startMode('solo');
  });

  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });

  // Debug/test hook — mirrors games/mini-golf's window.OGH_MINI_GOLF
  // convention: lets a test harness inspect live state and drive the sim
  // directly (exact shot vector/power, manual frame ticks, direct ball
  // placement) instead of fighting real pointer-event timing or hunting for
  // a naturally-occurring pocket/scratch/foul to happen on its own.
  window.OGH_BILLIARDS = {
    state,
    Physics,
    Rules,
    lang: () => lang,
    start: startMode,
    /** Fire a shot with an exact direction vector + power in [0,1],
     * bypassing pointer-drag input, for deterministic physics testing. */
    shoot(dirX, dirY, power) {
      if (state.phase !== 'aiming') return false;
      fireShot(dirX, dirY, power);
      return true;
    },
    /** Directly place/launch any ball by number (0 = cue) — for testing
     * collisions/pocketing/cushion bounces without a real shot arriving
     * there naturally. */
    warpBall(number, x, y, vx = 0, vy = 0) {
      const b = Physics.findBall(state.balls, number);
      if (!b) return false;
      b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.pocketed = false;
      return true;
    },
    /** Advance the sim by dtMs, same code path as the real rAF loop. */
    tick(dtMs) { update(dtMs / 1000); draw(); },
    setLang: applyLang,
  };
}

init();
