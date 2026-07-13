/**
 * Mini Golf — top-down 9-hole course. Solo, no networking.
 *
 * Drag back from the ball like a slingshot (Pointer Events unify mouse and
 * touch), release to putt — direction from the pull angle, power from pull
 * distance (capped). physics.js owns the whole simulation (rolling
 * friction, wall/obstacle reflection, sand/water zones, cup capture,
 * moving obstacles) in plain canvas-pixel units with no DOM dependency, so
 * it's directly steppable from a test harness (see window.OGH_MINI_GOLF
 * below) — same split as games/penguin-fling's physics.js and
 * games/neon-drift's physics.js/track.js. This file owns everything
 * physics.js doesn't: canvas rendering (Canvas 2D paths/gradients only, no
 * bitmap assets), input, HUD/scorecard, sfx, and i18n wiring.
 *
 * Round state machine (state.mode): 'title' -> 'aiming' -> 'rolling' ->
 * back to 'aiming' (ball stopped) or a 'water' bounce-back (still
 * 'aiming', ball reset + penalty) -> ... -> 'holeComplete' (briefly, once
 * sunk) -> next hole's 'aiming', or 'final' scorecard after the last hole
 * -> 'Play again' -> 'aiming' on hole 1.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings, holeName,
} from './i18n.js';
import * as Physics from './physics.js';
import { HOLES } from './courses.js';

const $ = (id) => document.getElementById(id);

const sfx = createOghSfx();

const CANVAS_W = 720;
const CANVAS_H = 1000;

/* ------------------------------------------------------------------------ *
 * Aim tuning (input mapping, not physics — how a drag gesture in canvas
 * pixels becomes a shot direction + power). Distances are in the same
 * canvas-pixel space physics.js works in (no separate world<->screen
 * conversion needed — this game has no camera).
 * ------------------------------------------------------------------------ */
const MAX_DRAG_PX = 170;
const MIN_DRAG_PX_TO_LAUNCH = 8;
const GRAB_RADIUS_PX = 70;
const TOAST_MS = 1700;
const TRAIL_MAX = 18;

/* ------------------------------------------------------------------------ *
 * Neon-vector palette for the course. Hardcoded here (like games/comet and
 * games/penguin-fling's draw code) rather than read from CSS custom
 * properties — canvas fill/stroke styles need concrete color strings
 * either way. Loosely matches the shared --ogh-* tokens (accent cyan,
 * accent-2 pink, good green, warn amber) with a couple of local additions
 * (water blue) that don't have a shared token.
 * ------------------------------------------------------------------------ */
const COLOR_FAIRWAY_FILL = 'rgba(92, 255, 176, 0.10)';
const COLOR_FAIRWAY_STROKE = 'rgba(110, 255, 186, 0.75)';
const COLOR_WALL_STROKE = '#5ce1ff';
const COLOR_WALL_FILL = 'rgba(180, 210, 255, 0.30)';
const COLOR_SAND_FILL = 'rgba(255, 209, 102, 0.38)';
const COLOR_SAND_STROKE = '#ffd166';
const COLOR_WATER_FILL = 'rgba(53, 181, 255, 0.40)';
const COLOR_WATER_STROKE = '#35b5ff';
const COLOR_MOVING_STROKE = '#ff6bcb';
const COLOR_CUP_RING = '#ff6bcb';
const COLOR_BALL = '#f4f8ff';

let lang = detectLang();

const state = {
  mode: 'title', // title | aiming | rolling | holeComplete | final
  holeIndex: 0,
  ball: null, // Physics.createBall() instance
  shotStart: { x: 0, y: 0 }, // ball position when the CURRENT shot began (water-hazard reset target)
  strokes: 0, // this hole
  scores: [], // completed holes: [{ holeIndex, par, strokes }]
  drag: null, // { pointerId, cur:{x,y} } while a pointer drag is live
  elapsed: 0, // seconds, monotonic — never reset, so moving obstacles keep going while aiming
  trail: [], // recent ball positions, for a short fading motion trail
  toastTimer: null,
};

const canvas = $('game');
const ctx = canvas.getContext('2d');
ctx.direction = 'ltr'; // belt-and-suspenders; see index.html's dir="ltr" comment

const overlay = $('overlay');
const startCard = $('startCard');
const holeCompleteCard = $('holeCompleteCard');
const finalCard = $('finalCard');
const hint = $('hint');
const toast = $('toast');

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function currentHole() { return HOLES[state.holeIndex]; }
function formatDiff(diff) { return diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`; }

function scoreTermKey(strokes, par) {
  if (strokes <= 1) return 'termAce';
  const diff = strokes - par;
  if (diff <= -2) return 'termEagle';
  if (diff === -1) return 'termBirdie';
  if (diff === 0) return 'termPar';
  if (diff === 1) return 'termBogey';
  return 'termDouble';
}

/* ------------------------------------------------------------------------ *
 * Round / hole lifecycle
 * ------------------------------------------------------------------------ */
function loadHole(i) {
  const hole = HOLES[i];
  state.holeIndex = i;
  state.ball = Physics.createBall(hole.tee.x, hole.tee.y);
  state.shotStart = { x: hole.tee.x, y: hole.tee.y };
  state.strokes = 0;
  state.drag = null;
  state.trail = [];
  state.mode = 'aiming';
  updateHud();
  renderHint();
}

function startRound() {
  state.scores = [];
  loadHole(0);
  overlay.hidden = true;
}

function fireShot(dirX, dirY, power) {
  if (state.mode !== 'aiming' || !state.ball) return;
  state.strokes += 1;
  state.shotStart = { x: state.ball.x, y: state.ball.y };
  Physics.applyShot(state.ball, dirX, dirY, power);
  state.mode = 'rolling';
  state.drag = null;
  state.trail = [];
  canvas.classList.remove('is-dragging');
  sfx.play('thwack');
  updateHud();
  renderHint();
}

function handlePhysicsEvent(ev) {
  if (ev.type === 'wall-bounce') {
    sfx.play('bounce');
  } else if (ev.type === 'water') {
    handleWaterHazard();
  } else if (ev.type === 'sink') {
    handleSink();
  } else if (ev.type === 'stopped') {
    state.mode = 'aiming';
    renderHint();
  }
  // 'sand-enter' is deliberately silent — it happens on nearly every shot
  // into a bunker and the friction itself already reads clearly; a sound
  // on top would get noisy fast.
}

function handleWaterHazard() {
  const hole = currentHole();
  const drop = hole.dropZone || state.shotStart;
  state.ball.x = drop.x;
  state.ball.y = drop.y;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.state = 'idle';
  state.ball.inSand = false;
  state.strokes += 1; // standard-golf 1-stroke penalty
  state.mode = 'aiming';
  state.trail = [];
  sfx.play('splash');
  showToast(t(lang, 'waterMessage'));
  updateHud();
  renderHint();
}

function handleSink() {
  const hole = currentHole();
  state.scores.push({ holeIndex: state.holeIndex, par: hole.par, strokes: state.strokes });
  sfx.play('win');
  if (state.holeIndex >= HOLES.length - 1) {
    showFinalScorecard();
  } else {
    showHoleComplete();
  }
}

function showHoleComplete() {
  state.mode = 'holeComplete';
  const hole = currentHole();
  const diff = state.strokes - hole.par;
  $('holeCompleteName').textContent = holeName(lang, hole);
  $('holeCompleteLine').textContent = t(lang, 'holeCompleteLine', { par: hole.par, strokes: state.strokes, diff: formatDiff(diff) });
  $('holeCompleteTerm').textContent = t(lang, scoreTermKey(state.strokes, hole.par));
  startCard.hidden = true;
  holeCompleteCard.hidden = false;
  finalCard.hidden = true;
  overlay.hidden = false;
}

function showFinalScorecard() {
  state.mode = 'final';
  renderScorecard();
  startCard.hidden = true;
  holeCompleteCard.hidden = true;
  finalCard.hidden = false;
  overlay.hidden = false;
}

function renderScorecard() {
  const body = $('scorecardBody');
  body.innerHTML = '';
  let totalPar = 0;
  let totalStrokes = 0;
  for (const s of state.scores) {
    const hole = HOLES[s.holeIndex];
    const diff = s.strokes - s.par;
    totalPar += s.par;
    totalStrokes += s.strokes;
    const diffClass = diff < 0 ? 'is-under' : diff > 0 ? 'is-over' : '';
    const tr = document.createElement('tr');
    const tdHole = document.createElement('td');
    tdHole.textContent = `${hole.id}. ${holeName(lang, hole)}`;
    const tdPar = document.createElement('td');
    tdPar.textContent = String(s.par);
    const tdStrokes = document.createElement('td');
    tdStrokes.textContent = String(s.strokes);
    const tdDiff = document.createElement('td');
    tdDiff.textContent = formatDiff(diff);
    if (diffClass) tdDiff.className = diffClass;
    tr.append(tdHole, tdPar, tdStrokes, tdDiff);
    body.appendChild(tr);
  }
  const totalDiff = totalStrokes - totalPar;
  $('finalTotalLine').textContent = t(lang, 'finalTotalLine', { strokes: totalStrokes, diff: formatDiff(totalDiff), par: totalPar });
}

/* ------------------------------------------------------------------------ *
 * HUD + hint + toast
 * ------------------------------------------------------------------------ */
function updateHud() {
  const hole = currentHole();
  if (!hole) return;
  // Total is a running score across COMPLETED holes only (real golf
  // leaderboards work the same way) — the hole currently in progress must
  // not contribute its par to this number before it's been sunk, or the
  // total reads as artificially under par the instant a new hole loads.
  const priorPar = state.scores.reduce((a, s) => a + s.par, 0);
  const priorStrokes = state.scores.reduce((a, s) => a + s.strokes, 0);
  const diff = priorStrokes - priorPar;
  $('hudHole').textContent = t(lang, 'holeLabel', { n: state.holeIndex + 1, total: HOLES.length });
  $('hudPar').textContent = t(lang, 'parLabel', { par: hole.par });
  $('hudStrokes').textContent = t(lang, 'strokesLabel', { n: state.strokes });
  $('hudTotal').textContent = t(lang, 'totalLabel', { v: formatDiff(diff) });
  $('hudTotal').classList.toggle('is-over', diff > 0);
}

function renderHint() {
  if (state.mode === 'aiming') {
    if (state.drag && state.ball) {
      const aim = liveAimFromDrag(state.drag, state.ball);
      hint.textContent = t(lang, 'aimReadout', { power: Math.round(aim.power * 100) });
    } else {
      hint.textContent = t(lang, 'aimHint');
    }
  } else if (state.mode === 'rolling') {
    hint.textContent = t(lang, 'rollingHint');
  }
}

function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('is-on'));
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    toast.classList.remove('is-on');
    setTimeout(() => { toast.hidden = true; }, 240);
  }, TOAST_MS);
}

/* ------------------------------------------------------------------------ *
 * Input — Pointer Events unify mouse + touch. A drag can only start within
 * a generous grab zone around the ball's current resting position (a real
 * slingshot pull, not "drag anywhere"), and setPointerCapture keeps
 * receiving move/up even if the finger leaves the canvas mid-drag. Same
 * shape as games/penguin-fling's onPointerDown/Move/Up.
 * ------------------------------------------------------------------------ */
function eventToCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
    y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
  };
}

/** Pull the pointer back away from where you want to shoot (slingshot):
 * direction is ball-minus-pointer, power from how far it's pulled. */
function liveAimFromDrag(drag, ball) {
  const dirX = ball.x - drag.cur.x;
  const dirY = ball.y - drag.cur.y;
  const dragDist = Math.hypot(dirX, dirY);
  const power = clamp(dragDist / MAX_DRAG_PX, 0, 1);
  return { dirX, dirY, dragDist, power };
}

function onPointerDown(e) {
  sfx.unlock();
  if (state.mode !== 'aiming' || state.drag || !state.ball) return;
  const pt = eventToCanvasPoint(e);
  if (Math.hypot(pt.x - state.ball.x, pt.y - state.ball.y) > GRAB_RADIUS_PX) return;
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
  const aim = liveAimFromDrag(state.drag, state.ball);
  canvas.classList.remove('is-dragging');
  if (aim.dragDist < MIN_DRAG_PX_TO_LAUNCH) {
    state.drag = null;
    renderHint();
    return;
  }
  fireShot(aim.dirX, aim.dirY, aim.power);
}

/** Core aiming stays drag-only (a 2D pull vector has no natural keyboard
 * equivalent) — this is only the light "keyboard: optional" utility
 * shortcut the manifest advertises, same convention as games/mahjong's
 * N=new-game/U=undo or games/solitaire's N=new-game: Enter/Space activates
 * whichever overlay button is currently visible, so a keyboard-only user
 * can still start a round, advance between holes, and replay. */
function onKeyDown(e) {
  if (e.code !== 'Enter' && e.code !== 'Space') return;
  if (overlay.hidden) return;
  e.preventDefault();
  if (!startCard.hidden) $('btnStart').click();
  else if (!holeCompleteCard.hidden) $('btnNextHole').click();
  else if (!finalCard.hidden) $('btnPlayAgain').click();
}

/* ------------------------------------------------------------------------ *
 * Drawing — course
 * ------------------------------------------------------------------------ */
function drawRoughTexture() {
  ctx.strokeStyle = 'rgba(92,255,176,0.035)';
  ctx.lineWidth = 1;
  for (let x = 40; x < CANVAS_W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
  }
  for (let y = 40; y < CANVAS_H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
  }
}

function drawFairway(hole) {
  const poly = hole.fairway;
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fillStyle = COLOR_FAIRWAY_FILL;
  ctx.fill();
  // The fairway's own boundary IS the outer wall (see
  // physics.js#fairwayWalls), so stroking it at wall-thickness width draws
  // the collidable wall and the green's edge as a single glowing shape —
  // they can never visually disagree with what the ball collides against.
  ctx.save();
  ctx.shadowColor = COLOR_FAIRWAY_STROKE;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = COLOR_FAIRWAY_STROKE;
  ctx.lineWidth = Physics.WALL_HALF_THICKNESS * 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawZoneShape(shape, fillStyle, strokeStyle, blur) {
  ctx.beginPath();
  if (shape.shape === 'circle') {
    ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
  } else {
    ctx.rect(shape.x, shape.y, shape.w, shape.h);
  }
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.save();
  ctx.shadowColor = strokeStyle;
  ctx.shadowBlur = blur;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawZones(hole) {
  for (const s of hole.sand) drawZoneShape(s, COLOR_SAND_FILL, COLOR_SAND_STROKE, 10);
  for (const s of hole.water) drawZoneShape(s, COLOR_WATER_FILL, COLOR_WATER_STROKE, 12);
}

/** Two slow concentric rings per circular water shape, cheap animated
 * "ripple" texture so ponds read as water rather than a flat blue blob.
 * Every water zone authored in courses.js happens to be a circle cluster,
 * so the rect case is simply skipped here. */
function drawWaterRipples(hole, elapsed) {
  for (const s of hole.water) {
    if (s.shape !== 'circle') continue;
    for (let i = 0; i < 2; i++) {
      const phase = (elapsed * 0.35 + i * 0.5) % 1;
      const r = s.r * (0.25 + phase * 0.7);
      ctx.beginPath();
      ctx.arc(s.cx, s.cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.24 * (1 - phase)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

function drawDropZone(hole) {
  if (!hole.dropZone) return;
  ctx.save();
  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hole.dropZone.x, hole.dropZone.y, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** A wall segment drawn as a round-capped thick line — a zero-length
 * segment (x1===x2 && y1===y2) renders as a plain glowing dot/circle for
 * free (Canvas 2D's round line cap on a zero-length path is a circle),
 * matching physics.js's capsule-degenerates-to-circle collision model for
 * round bumper obstacles. */
function drawThickSegment(x1, y1, x2, y2, half, strokeStyle, fillGlow, blur) {
  ctx.save();
  ctx.shadowColor = fillGlow;
  ctx.shadowBlur = blur;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = half * 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawObstacles(hole) {
  for (const o of hole.obstacles) {
    const half = o.half || Physics.WALL_HALF_THICKNESS;
    drawThickSegment(o.x1, o.y1, o.x2, o.y2, half, COLOR_WALL_STROKE, COLOR_WALL_STROKE, 10);
  }
}

function drawMovingObstacles(hole, elapsed) {
  for (const mover of hole.movingObstacles) {
    const half = mover.half || Physics.WALL_HALF_THICKNESS;
    const segs = Physics.movingObstacleShapeAt(mover, elapsed);
    for (const seg of segs) {
      drawThickSegment(seg.x1, seg.y1, seg.x2, seg.y2, half, COLOR_MOVING_STROKE, COLOR_MOVING_STROKE, 15);
    }
    if (mover.kind === 'rotate') {
      ctx.beginPath();
      ctx.arc(mover.cx, mover.cy, half + 5, 0, Math.PI * 2);
      ctx.fillStyle = '#1a0e18';
      ctx.fill();
      ctx.strokeStyle = COLOR_MOVING_STROKE;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function drawCup(hole) {
  const { x, y } = hole.cup;
  ctx.save();
  ctx.shadowColor = COLOR_CUP_RING;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = COLOR_CUP_RING;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, Physics.CUP_RADIUS + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(x, y, Physics.CUP_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = '#03040a';
  ctx.fill();

  ctx.strokeStyle = 'rgba(230,236,255,0.8)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y - Physics.CUP_RADIUS * 0.3);
  ctx.lineTo(x, y - 70);
  ctx.stroke();
  ctx.fillStyle = COLOR_CUP_RING;
  ctx.beginPath();
  ctx.moveTo(x, y - 70);
  ctx.lineTo(x + 22, y - 63);
  ctx.lineTo(x, y - 56);
  ctx.closePath();
  ctx.fill();
}

function drawTrail() {
  for (let i = 0; i < state.trail.length; i++) {
    const p = state.trail[i];
    const a = (i / state.trail.length) * 0.32;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(244,248,255,${a})`;
    ctx.fill();
  }
}

function drawBall() {
  if (!state.ball) return;
  const { x, y } = state.ball;
  ctx.save();
  ctx.shadowColor = 'rgba(244,248,255,0.9)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(x, y, Physics.BALL_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_BALL;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x - 2.5, y - 2.5, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();
}

function drawAimUI() {
  if (state.mode !== 'aiming' || !state.ball) return;
  const b = state.ball;

  ctx.save();
  ctx.setLineDash([3, 6]);
  ctx.strokeStyle = 'rgba(92,225,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(b.x, b.y, MAX_DRAG_PX, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (!state.drag) return;
  const aim = liveAimFromDrag(state.drag, b);
  const dirLen = Math.hypot(aim.dirX, aim.dirY) || 1;
  const nx = aim.dirX / dirLen;
  const ny = aim.dirY / dirLen;
  const previewLen = 40 + aim.power * 140;

  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(state.drag.cur.x, state.drag.cur.y);
  ctx.stroke();

  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = `rgba(92,225,255,${0.4 + aim.power * 0.5})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x + nx * previewLen, b.y + ny * previewLen);
  ctx.stroke();
  ctx.restore();

  const ax = b.x + nx * previewLen;
  const ay = b.y + ny * previewLen;
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
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#060a08';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawRoughTexture();

  const hole = currentHole();
  if (!hole) return;
  drawFairway(hole);
  drawZones(hole);
  drawWaterRipples(hole, state.elapsed);
  drawDropZone(hole);
  drawObstacles(hole);
  drawMovingObstacles(hole, state.elapsed);
  drawCup(hole);
  drawTrail();
  drawBall();
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
  renderHint();
  if (state.ball) updateHud();
  if (state.mode === 'holeComplete') showHoleComplete();
  if (state.mode === 'final') renderScorecard();
  rememberLang(lang);
}

/* ------------------------------------------------------------------------ *
 * Main loop
 * ------------------------------------------------------------------------ */
function update(dt) {
  // Always advances — a windmill/gate keeps moving while the player is
  // still aiming, so timing a shot around it is part of the puzzle rather
  // than something that only starts once a shot is already live.
  state.elapsed += dt;

  if (state.mode === 'rolling' && state.ball) {
    const events = Physics.stepBall(state.ball, dt, currentHole(), state.elapsed);
    if (state.ball.state === 'rolling') {
      state.trail.push({ x: state.ball.x, y: state.ball.y });
      if (state.trail.length > TRAIL_MAX) state.trail.shift();
    }
    for (const ev of events) handlePhysicsEvent(ev);
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
  loadHole(0);
  state.mode = 'title';
  startCard.hidden = false;
  holeCompleteCard.hidden = true;
  finalCard.hidden = true;
  overlay.hidden = false;
  applyLang(lang);

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('keydown', onKeyDown);
  $('btnStart').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); startRound(); });
  $('btnNextHole').addEventListener('click', () => {
    sfx.unlock(); sfx.play('tap');
    overlay.hidden = true;
    loadHole(state.holeIndex + 1);
  });
  $('btnPlayAgain').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); startRound(); });

  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });

  // Debug/test hook — mirrors games/penguin-fling's window.OGH_PENGUIN_FLING
  // and games/pop-the-bugs' window.OGH_POP_BUGS convention: lets a test
  // harness inspect live state and drive the sim directly (exact shot
  // vector/power, manual frame ticks, direct ball placement, hole jumps)
  // instead of fighting real pointer-event timing or hunting for a
  // naturally-occurring hazard hit.
  window.OGH_MINI_GOLF = {
    state,
    Physics,
    HOLES,
    lang: () => lang,
    currentHole,
    start: startRound,
    /** Jump straight to hole index i (0-based), bypassing normal
     * hole-to-hole progression. */
    jumpToHole(i) {
      overlay.hidden = true;
      loadHole(i);
    },
    /** Fire a shot with an exact direction vector + power in [0,1],
     * bypassing pointer-drag input, for deterministic physics testing. */
    shoot(dirX, dirY, power) {
      if (state.mode !== 'aiming') return false;
      fireShot(dirX, dirY, power);
      return true;
    },
    /** Directly place the ball (and give it velocity) — for testing
     * hazards/cup-capture/wall bounces without a real shot arriving there
     * naturally. */
    warpBall(x, y, vx = 0, vy = 0) {
      if (!state.ball) return;
      state.ball.x = x;
      state.ball.y = y;
      state.ball.vx = vx;
      state.ball.vy = vy;
      state.ball.inSand = false;
      state.ball.state = (vx !== 0 || vy !== 0) ? 'rolling' : 'idle';
      if (state.ball.state === 'rolling') state.mode = 'rolling';
    },
    /** Advance the sim by dtMs, same code path as the real rAF loop. */
    tick(dtMs) { update(dtMs / 1000); draw(); },
    setLang: applyLang,
  };
}

init();
