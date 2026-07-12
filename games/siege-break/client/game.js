/**
 * Siege Break — a catapult flings boulders at physics-simulated structures.
 * Drag back from the catapult to aim (power from drag distance, launch angle
 * from drag direction), release to launch. The boulder flies a real
 * gravity-based arc, then the structure it strikes collapses under a genuine
 * rigid-body simulation — see physics.js for the whole engine (kept pure /
 * DOM-free so it is directly steppable from a test harness, the same
 * discipline as games/mini-golf and games/penguin-fling).
 *
 * This file owns everything physics.js doesn't: canvas rendering (Canvas 2D
 * vector shapes with a neon glow — no bitmap assets), pointer-drag input,
 * sfx/HUD/i18n wiring, level progression + scoring, and local best-score
 * persistence via OGHProfile (same convention as games/pop-the-bugs).
 *
 * mode: 'title' -> 'aiming' -> 'firing' -> ('aiming' reload | 'levelClear' |
 * 'levelFail') ... -> 'win'. Physics only advances while mode === 'firing',
 * on a fixed 1/120 s accumulator so the simulation is frame-rate independent.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import { LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings } from './i18n.js';
import * as Physics from './physics.js';
import { LEVELS, LEVEL_COUNT, ARENA_W, ARENA_H, GROUND_Y } from './structures.js';

const $ = (id) => document.getElementById(id);
const GAME_ID = 'siege-break';
const sfx = createOghSfx();

/* ------------------------------------------------------------------------ *
 * Fixed internal resolution (matches the shared .ogh-game-canvas 0.72
 * portrait rule — CSS-scaled to fit, no per-frame resize bookkeeping). All
 * gameplay is authored in these pixels; there is no camera/scroll.
 * ------------------------------------------------------------------------ */
const CANVAS_W = ARENA_W; // 720
const CANVAS_H = ARENA_H; // 1000

// Catapult geometry (left side). The boulder loads in the bucket at LAUNCH_POS
// and flies from there. Fixed spatial convention — never mirrored under RTL.
const PIVOT = { x: 126, y: GROUND_Y - 72 };
const LAUNCH_POS = { x: 152, y: 748 };
const ARM_LEN = Math.hypot(LAUNCH_POS.x - PIVOT.x, LAUNCH_POS.y - PIVOT.y);
const ARM_LOADED = Math.atan2(LAUNCH_POS.y - PIVOT.y, LAUNCH_POS.x - PIVOT.x);
const ARM_RELEASED = ARM_LOADED + 1.15; // swings forward/over on fire
const BOULDER_R = 21;

// Aim tuning (input, not physics — how a drag maps to power/angle).
const MAX_DRAG_PX = 240;
const MIN_DRAG_PX_TO_LAUNCH = 16;
const GRAB_ZONE_RADIUS_PX = 175;
const MIN_LAUNCH_ANGLE_DEG = 4;
const MAX_LAUNCH_ANGLE_DEG = 86;
const MIN_LAUNCH_SPEED = 300; // px/s at the smallest registered pull
const MAX_LAUNCH_SPEED = 1450; // px/s at full pull

// Firing / settle tuning.
const PHYS_DT = 1 / 120;
const SETTLE_LIN = 9; // px/s
const SETTLE_ANG = 0.09; // rad/s
const SETTLE_HOLD = 0.45; // s of calm before a shot is "done"
const MAX_SHOT_TIME = 14; // s hard cap per shot

// Scoring.
const SCORE_TARGET = 1000;
const SCORE_BLOCK = 60;
const SCORE_AMMO_BONUS = 300; // per unused boulder on clear

/* ------------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------------ */
let lang = detectLang();

const state = {
  mode: 'title',
  levelIndex: 0,
  level: null,
  world: null,
  boulder: null,
  targets: [],
  targetsTotal: 0,
  ammo: 0,
  shotsUsed: 0,
  score: 0, // committed total across cleared levels
  levelScore: 0, // provisional this level (added to score on clear, dropped on retry)
  levelStars: 0,
  best: 0,
  isNewBest: false,
  drag: null, // { start, cur, pointerId }
  arm: { t: 1, from: ARM_LOADED, to: ARM_LOADED },
  particles: [],
  trail: [],
  shake: 0,
  settleTimer: 0,
  shotTime: 0,
};

const now = () => performance.now();
const sfxGate = { boom: 0, crumble: 0, tick: 0 };
function gated(name, gapMs) {
  const t0 = now();
  if (t0 - sfxGate[name] < gapMs) return false;
  sfxGate[name] = t0; return true;
}

/* ------------------------------------------------------------------------ *
 * DOM refs
 * ------------------------------------------------------------------------ */
const canvas = $('game');
const ctx = canvas.getContext('2d');
ctx.direction = 'ltr'; // never inherit page RTL for canvas text

const overlay = $('overlay');
const cards = {
  start: $('startCard'), clear: $('levelClearCard'), fail: $('levelFailCard'), final: $('finalCard'),
};
const hint = $('hint');

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/* ------------------------------------------------------------------------ *
 * Profile (best-score persistence) — same OGHProfile convention as
 * games/pop-the-bugs / games/penguin-fling.
 * ------------------------------------------------------------------------ */
function loadBest() {
  const saved = OGHProfile.getProgress(GAME_ID);
  const n = Number(saved?.best);
  return Number.isFinite(n) ? n : 0;
}
function persistBest() {
  OGHProfile.saveProgress(
    GAME_ID,
    { best: state.best },
    { label: 'Siege Break', summary: `Best ${state.best}` }
  );
}
function maybeNewBest() {
  if (state.score > state.best) {
    state.best = state.score;
    state.isNewBest = true;
    persistBest();
  }
}

/* ------------------------------------------------------------------------ *
 * Level lifecycle
 * ------------------------------------------------------------------------ */
function loadLevel(index) {
  const level = LEVELS[index];
  state.levelIndex = index;
  state.level = level;
  const world = Physics.createWorld({ bounds: { minX: -520, maxX: CANVAS_W + 520, maxY: CANVAS_H + 260 } });
  // Ground — a wide static slab; blocks rest with their base at GROUND_Y.
  Physics.addBody(world, Physics.makeBox({
    x: CANVAS_W / 2, y: GROUND_Y + 320, w: 3200, h: 640, material: 'stone', isStatic: true, isGround: true,
  }));
  state.targets = [];
  for (const spec of level.blocks) {
    const b = Physics.addBody(world, Physics.makeBox({
      x: spec.x, y: spec.y, w: spec.w, h: spec.h, material: spec.material, isTarget: spec.isTarget,
    }));
    if (spec.isTarget) state.targets.push(b);
  }
  // Pre-settle a few ticks so any hair-thin authored contact resolves before
  // the player can act (a stable structure stays put; this only absorbs the
  // sub-pixel initial overlap, it never collapses a well-formed layout).
  for (let i = 0; i < 8; i++) Physics.stepWorld(world, PHYS_DT);

  state.world = world;
  state.targetsTotal = state.targets.length;
  state.ammo = level.ammo;
  state.shotsUsed = 0;
  state.levelScore = 0;
  state.boulder = null;
  state.drag = null;
  state.particles.length = 0;
  state.trail.length = 0;
  state.settleTimer = 0;
  state.shotTime = 0;
  state.arm = { t: 1, from: ARM_LOADED, to: ARM_LOADED };
  state.mode = 'aiming';
  overlay.hidden = true;
  updateHud();
  renderHint();
}

function targetsRemaining() {
  let n = 0;
  for (const b of state.targets) if (!b.dead) n++;
  return n;
}

/* ------------------------------------------------------------------------ *
 * Aiming + launch
 * ------------------------------------------------------------------------ */
function liveAimFromDrag(drag) {
  const dxL = LAUNCH_POS.x - drag.cur.x;
  const dyL = LAUNCH_POS.y - drag.cur.y;
  const dist = Math.hypot(drag.cur.x - LAUNCH_POS.x, drag.cur.y - LAUNCH_POS.y);
  const power = clamp(dist / MAX_DRAG_PX, 0, 1);
  let angleDeg = (Math.atan2(-dyL, dxL) * 180) / Math.PI;
  angleDeg = clamp(angleDeg, MIN_LAUNCH_ANGLE_DEG, MAX_LAUNCH_ANGLE_DEG);
  return { power, angleDeg };
}

function velocityFor(power, angleDeg) {
  const speed = MIN_LAUNCH_SPEED + clamp(power, 0, 1) * (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED);
  const a = (angleDeg * Math.PI) / 180;
  return { vx: Math.cos(a) * speed, vy: -Math.sin(a) * speed }; // screen y-down: up is negative
}

function doLaunch(power, angleDeg) {
  const { vx, vy } = velocityFor(power, angleDeg);
  const b = Physics.makeCircle({ x: LAUNCH_POS.x, y: LAUNCH_POS.y, r: BOULDER_R, density: 0.0085 });
  b.vx = vx; b.vy = vy;
  b.omega = (vx / BOULDER_R) * 0.5; // roll in the direction of travel
  Physics.addBody(state.world, b);
  state.boulder = b;
  state.ammo -= 1;
  state.shotsUsed += 1;
  state.mode = 'firing';
  state.drag = null;
  state.settleTimer = 0;
  state.shotTime = 0;
  state.trail.length = 0;
  state.arm = { t: 0, from: ARM_LOADED, to: ARM_RELEASED };
  canvas.classList.remove('is-dragging');
  sfx.play('thwack');
  updateHud();
  renderHint();
}

/** Ballistic (gravity-only) preview of the boulder's initial arc — accurate
 * because nothing acts on the boulder but gravity until it first strikes the
 * structure. Stops at the ground, arena edge, or first block it enters. */
function previewPoints(power, angleDeg) {
  const { vx, vy } = velocityFor(power, angleDeg);
  const pts = [];
  let x = LAUNCH_POS.x, y = LAUNCH_POS.y, vX = vx, vY = vy;
  const dt = 0.035;
  for (let i = 0; i < 60; i++) {
    vY += Physics.GRAVITY * dt;
    x += vX * dt; y += vY * dt;
    pts.push({ x, y });
    if (y > GROUND_Y - 1 || x < -20 || x > CANVAS_W + 20) break;
    if (state.world && pointInAnyBlock(x, y)) break;
  }
  return pts;
}
function pointInAnyBlock(x, y) {
  for (const b of state.world.bodies) {
    if (b.isStatic || b.isProjectile) continue;
    const dx = x - b.x, dy = y - b.y;
    const rad = Math.hypot(b.hw, b.hh) + 2;
    if (dx * dx + dy * dy < rad * rad) return true;
  }
  return false;
}

/* ------------------------------------------------------------------------ *
 * Firing — advance physics on a fixed accumulator and react to events.
 * ------------------------------------------------------------------------ */
function physicsStep(h) {
  const evs = Physics.stepWorld(state.world, h);

  // Trail sampling for the flying boulder.
  const b = state.boulder;
  if (b && !b.dead) {
    state.trail.push({ x: b.x, y: b.y });
    if (state.trail.length > 22) state.trail.shift();
  }

  let loudest = 0, lx = 0, ly = 0;
  for (const e of evs) {
    if (e.type === 'impact') {
      if (e.speed > loudest) { loudest = e.speed; lx = e.x; ly = e.y; }
    } else if (e.type === 'break') {
      if (e.body.isTarget) {
        state.levelScore += SCORE_TARGET;
        spawnBurst(e.x, e.y, '#ff8fb0', 16, true);
        sfx.play('pickup');
      } else {
        state.levelScore += SCORE_BLOCK;
        if (!e.offscreen) spawnBurst(e.x, e.y, e.body.color, 9, false);
        if (gated('crumble', 55)) sfx.play('crumble');
      }
    }
  }
  if (loudest > 240) {
    spawnDust(lx, ly, loudest);
    if (loudest > 520 && gated('boom', 70)) { sfx.play('boom'); state.shake = Math.min(18, loudest / 80); }
    else if (gated('tick', 60)) sfx.play('tick');
  }

  if (b && b.dead) state.boulder = null;
  updateHud();

  // Level cleared the instant the last target is gone.
  if (targetsRemaining() === 0) { onLevelClear(); return; }

  const m = Physics.maxMotion(state.world);
  const boulderCalm = !state.boulder || (Math.hypot(state.boulder.vx, state.boulder.vy) < SETTLE_LIN);
  if (m.lin < SETTLE_LIN && m.ang < SETTLE_ANG && boulderCalm) state.settleTimer += h;
  else state.settleTimer = 0;
  state.shotTime += h;

  if (state.settleTimer > SETTLE_HOLD || state.shotTime > MAX_SHOT_TIME) onShotSettled();
}

function onShotSettled() {
  // Remove the spent boulder so the catapult can load a fresh one and it
  // never blocks the next shot.
  if (state.boulder) { state.boulder.dead = true; state.boulder = null; }
  state.world.bodies = state.world.bodies.filter((x) => !x.dead);
  if (state.ammo <= 0 && targetsRemaining() > 0) { onLevelFail(); return; }
  // Reload and aim again.
  state.mode = 'aiming';
  state.drag = null;
  state.settleTimer = 0;
  state.shotTime = 0;
  state.arm = { t: 0, from: state.arm.to, to: ARM_LOADED };
  renderHint();
}

function starsFor(shots, par) {
  if (shots <= par) return 3;
  if (shots <= par + 1) return 2;
  return 1;
}

function onLevelClear() {
  state.levelScore += state.ammo * SCORE_AMMO_BONUS;
  state.score += state.levelScore;
  state.levelStars = starsFor(state.shotsUsed, state.level.parShots);
  state.levelScore = 0;
  maybeNewBest();
  updateHud();
  sfx.play('win');
  const isLast = state.levelIndex >= LEVEL_COUNT - 1;
  if (isLast) { showWin(); return; }
  showCard('clear');
  $('clearStars').innerHTML = starMarkup(state.levelStars);
  $('clearLevelLine').textContent = t(lang, 'levelLine', { n: state.levelIndex + 1, name: t(lang, state.level.nameKey) });
  $('clearShotsLine').textContent = `${t(lang, 'shotsUsedLabel')}: ${state.shotsUsed}`;
  $('clearScoreLine').textContent = `${t(lang, 'scoreLabel')}: ${state.score}`;
  state.mode = 'levelClear';
}

function onLevelFail() {
  state.levelScore = 0; // provisional points are dropped on a retry
  updateHud();
  sfx.play('die');
  showCard('fail');
  $('failTargetsLine').textContent = `${t(lang, 'targetsLabel')}: ${targetsRemaining()} / ${state.targetsTotal}`;
  state.mode = 'levelFail';
}

function showWin() {
  showCard('final');
  $('finalScoreLine').textContent = `${t(lang, 'finalScoreLabel')}: ${state.score}`;
  $('finalBestLine').textContent = `${t(lang, 'bestLabel')}: ${state.best}`;
  $('finalNewBest').hidden = !state.isNewBest;
  state.mode = 'win';
}

function showCard(which) {
  overlay.hidden = false;
  for (const k of Object.keys(cards)) cards[k].hidden = k !== which;
}

function starMarkup(n) {
  let s = '';
  for (let i = 0; i < 3; i++) s += i < n ? '★' : '<span class="off">★</span>';
  return s;
}

/* ------------------------------------------------------------------------ *
 * Particles
 * ------------------------------------------------------------------------ */
function spawnBurst(x, y, color, n, upward) {
  for (let i = 0; i < n; i++) {
    const a = upward ? (Math.PI + Math.random() * Math.PI) : (Math.random() * Math.PI * 2);
    const sp = (upward ? 120 : 70) + Math.random() * 190;
    state.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (upward ? 120 : 40),
      life: 0.5 + Math.random() * 0.5, maxLife: 1, r: 2 + Math.random() * 3.5, color, kind: 'shard',
    });
  }
}
function spawnDust(x, y, speed) {
  const n = Math.min(12, 3 + Math.round(speed / 90));
  for (let i = 0; i < n; i++) {
    const a = Math.PI + Math.random() * Math.PI;
    const sp = 30 + Math.random() * 80;
    state.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5,
      life: 0.3 + Math.random() * 0.35, maxLife: 0.65, r: 3 + Math.random() * 4,
      color: 'rgba(200,214,240,0.8)', kind: 'dust',
    });
  }
}
function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'shard') { p.vy += 1500 * dt; p.vx *= 0.99; }
    else { p.vy -= 40 * dt; p.vx *= 0.94; p.r += dt * 6; }
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

/* ------------------------------------------------------------------------ *
 * Rendering
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

function drawBackdrop() {
  // Faint stars (deterministic — no per-frame jitter).
  ctx.fillStyle = 'rgba(200,220,255,0.5)';
  for (let i = 0; i < 46; i++) {
    const h1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453);
    const h2 = Math.abs(Math.sin(i * 78.233) * 12345.6789);
    const x = (h1 - Math.floor(h1)) * CANVAS_W;
    const y = (h2 - Math.floor(h2)) * (GROUND_Y - 160);
    const r = 0.5 + (h1 - Math.floor(h1)) * 1.3;
    ctx.globalAlpha = 0.3 + (h2 - Math.floor(h2)) * 0.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Moon glow, upper right.
  const mx = CANVAS_W * 0.8, my = 150;
  const glow = ctx.createRadialGradient(mx, my, 6, mx, my, 120);
  glow.addColorStop(0, 'rgba(150,200,255,0.35)');
  glow.addColorStop(1, 'rgba(150,200,255,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(mx, my, 120, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(210,228,255,0.85)';
  ctx.beginPath(); ctx.arc(mx, my, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0a0e1c';
  ctx.beginPath(); ctx.arc(mx + 14, my - 8, 30, 0, Math.PI * 2); ctx.fill();

  // Distant hill silhouettes.
  drawHill(GROUND_Y - 30, 90, 150, 0.4, '#0c1226');
  drawHill(GROUND_Y - 8, 55, 90, 2.3, '#0e1530');
}
function drawHill(baseY, amp, wl, phase, color) {
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_H);
  for (let x = 0; x <= CANVAS_W; x += 18) {
    const y = baseY - amp * (0.5 + 0.5 * Math.sin((x / wl) + phase));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(CANVAS_W, CANVAS_H);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
}

function drawGround() {
  const grad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
  grad.addColorStop(0, '#141d33');
  grad.addColorStop(1, '#0a0f1e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
  // Neon top edge.
  ctx.strokeStyle = 'rgba(92,225,255,0.8)';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(92,225,255,0.7)';
  ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CANVAS_W, GROUND_Y); ctx.stroke();
  ctx.shadowBlur = 0;
  // Sparse surface ticks.
  ctx.strokeStyle = 'rgba(92,225,255,0.14)';
  ctx.lineWidth = 1;
  for (let x = 20; x < CANVAS_W; x += 46) {
    ctx.beginPath(); ctx.moveTo(x, GROUND_Y + 6); ctx.lineTo(x - 10, CANVAS_H); ctx.stroke();
  }
}

function drawBlock(b) {
  const cs = Physics.boxCorners(b);
  const hpFrac = clamp(b.hp / b.maxHp, 0, 1);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cs[0].x, cs[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(cs[i].x, cs[i].y);
  ctx.closePath();
  // Fill — dims as the block loses hp; a fresh block glows brighter.
  ctx.fillStyle = withAlpha(b.color, 0.14 + hpFrac * 0.06);
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = b.damageFlash > 0 ? '#ffffff' : b.color;
  ctx.shadowColor = b.color;
  ctx.shadowBlur = 8 + b.damageFlash * 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Material grain (in the body's local frame).
  ctx.translate(b.x, b.y); ctx.rotate(b.angle);
  ctx.strokeStyle = withAlpha(b.color, 0.28);
  ctx.lineWidth = 1;
  if (b.material === 'wood') {
    for (let gx = -b.hw + 8; gx < b.hw; gx += 12) { ctx.beginPath(); ctx.moveTo(gx, -b.hh + 3); ctx.lineTo(gx, b.hh - 3); ctx.stroke(); }
  } else if (b.material === 'glass') {
    ctx.beginPath(); ctx.moveTo(-b.hw + 4, b.hh - 6); ctx.lineTo(b.hw - 8, -b.hh + 4); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-b.hw + 3, 0); ctx.lineTo(b.hw - 3, 0); ctx.stroke();
  }
  // Damage cracks.
  if (hpFrac < 0.66) {
    ctx.strokeStyle = withAlpha('#ff5c7a', 0.5 + (1 - hpFrac) * 0.4);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-b.hw * 0.4, -b.hh); ctx.lineTo(-b.hw * 0.1, 0); ctx.lineTo(-b.hw * 0.35, b.hh);
    if (hpFrac < 0.4) { ctx.moveTo(b.hw * 0.3, -b.hh); ctx.lineTo(b.hw * 0.05, b.hh * 0.2); ctx.lineTo(b.hw * 0.4, b.hh); }
    ctx.stroke();
  }
  ctx.restore();
}

function drawTarget(b, tms) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);
  const rx = b.hw * 0.86, ry = b.hh * 0.86;
  // Body.
  ctx.fillStyle = 'rgba(255,92,122,0.24)';
  ctx.strokeStyle = '#ff5c7a';
  ctx.lineWidth = 2.4;
  ctx.shadowColor = '#ff5c7a';
  ctx.shadowBlur = 12 + (b.damageFlash > 0 ? 14 : 0);
  roundRectPath(-rx, -ry, rx * 2, ry * 2, Math.min(rx, ry) * 0.55);
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  // Angry brow.
  ctx.strokeStyle = '#ffd0d8';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-rx * 0.55, -ry * 0.25); ctx.lineTo(-rx * 0.12, -ry * 0.05);
  ctx.moveTo(rx * 0.55, -ry * 0.25); ctx.lineTo(rx * 0.12, -ry * 0.05); ctx.stroke();
  // Eyes — blink on a slow cycle.
  const blink = (Math.sin(tms / 900 + b.id) > 0.94);
  ctx.fillStyle = '#fff';
  const eyeY = ry * 0.05, eyeX = rx * 0.34, eyeR = Math.min(rx, ry) * 0.28;
  if (blink) {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-eyeX - eyeR * 0.7, eyeY); ctx.lineTo(-eyeX + eyeR * 0.7, eyeY);
    ctx.moveTo(eyeX - eyeR * 0.7, eyeY); ctx.lineTo(eyeX + eyeR * 0.7, eyeY); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(-eyeX, eyeY, eyeR, 0, Math.PI * 2); ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#20121a';
    ctx.beginPath(); ctx.arc(-eyeX + 1, eyeY + 1, eyeR * 0.5, 0, Math.PI * 2); ctx.arc(eyeX + 1, eyeY + 1, eyeR * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  // Mouth.
  ctx.strokeStyle = '#ffd0d8'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(-rx * 0.4, ry * 0.5); ctx.lineTo(-rx * 0.13, ry * 0.32); ctx.lineTo(rx * 0.13, ry * 0.5); ctx.lineTo(rx * 0.4, ry * 0.32); ctx.stroke();
  ctx.restore();
}

function drawCatapult() {
  const armAng = state.arm.from + (state.arm.to - state.arm.from) * easeOut(state.arm.t);
  const tipX = PIVOT.x + Math.cos(armAng) * ARM_LEN;
  const tipY = PIVOT.y + Math.sin(armAng) * ARM_LEN;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(92,225,255,0.6)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = '#5ce1ff';

  // Base + wheels.
  const baseY = GROUND_Y;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(PIVOT.x - 58, baseY - 6); ctx.lineTo(PIVOT.x + 62, baseY - 6); ctx.stroke();
  ctx.lineWidth = 2.5;
  for (const wx of [PIVOT.x - 42, PIVOT.x + 44]) {
    ctx.beginPath(); ctx.arc(wx, baseY - 6, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(wx, baseY - 6, 4, 0, Math.PI * 2); ctx.stroke();
  }
  // A-frame legs to the pivot.
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(PIVOT.x - 40, baseY - 8); ctx.lineTo(PIVOT.x, PIVOT.y);
  ctx.lineTo(PIVOT.x + 40, baseY - 8); ctx.stroke();
  // Support strut.
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(PIVOT.x, PIVOT.y); ctx.lineTo(PIVOT.x + 30, baseY - 8); ctx.stroke();

  // Throwing arm.
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(PIVOT.x - Math.cos(armAng) * 26, PIVOT.y - Math.sin(armAng) * 26); ctx.lineTo(tipX, tipY); ctx.stroke();
  // Counterweight on the short end.
  ctx.fillStyle = 'rgba(92,225,255,0.18)';
  ctx.beginPath(); ctx.arc(PIVOT.x - Math.cos(armAng) * 30, PIVOT.y - Math.sin(armAng) * 30, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Bucket at the tip.
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(tipX, tipY, 15, Math.PI * 0.15, Math.PI * 0.85, false); ctx.stroke();
  // Pivot hub.
  ctx.fillStyle = '#0a0e1c';
  ctx.beginPath(); ctx.arc(PIVOT.x, PIVOT.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();

  return { tipX, tipY };
}

function drawBoulderShape(x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
  g.addColorStop(0, '#ffe6a3');
  g.addColorStop(0.6, '#e6a34d');
  g.addColorStop(1, '#a86a24');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(255,180,84,0.7)';
  ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(120,70,20,0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Craters rotate with the boulder so spin is visible.
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(120,70,20,0.5)';
  for (const c of [[-r * 0.35, -r * 0.1, r * 0.22], [r * 0.3, r * 0.25, r * 0.16], [r * 0.1, -r * 0.4, r * 0.13]]) {
    ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawTrail() {
  for (let i = 0; i < state.trail.length; i++) {
    const p = state.trail[i];
    const a = (i / state.trail.length) * 0.4;
    ctx.fillStyle = `rgba(255,209,102,${a})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, BOULDER_R * (0.3 + 0.5 * i / state.trail.length), 0, Math.PI * 2); ctx.fill();
  }
}

function drawAim() {
  if (!state.drag) return;
  const { power, angleDeg } = liveAimFromDrag(state.drag);
  // Dashed pull line from the bucket to the drag point.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,107,203,0.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(LAUNCH_POS.x, LAUNCH_POS.y); ctx.lineTo(state.drag.cur.x, state.drag.cur.y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,107,203,0.85)';
  ctx.beginPath(); ctx.arc(state.drag.cur.x, state.drag.cur.y, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Trajectory preview dots.
  const pts = previewPoints(power, angleDeg);
  for (let i = 0; i < pts.length; i += 2) {
    const alpha = 0.8 * (1 - i / pts.length);
    ctx.fillStyle = `rgba(92,225,255,${alpha})`;
    ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    if (p.kind === 'dust') ctx.fillStyle = `rgba(200,214,240,${a * 0.7})`;
    else ctx.fillStyle = withAlpha(p.color, a);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
}

function easeOut(t) { return 1 - (1 - t) * (1 - t); }
function withAlpha(hex, a) {
  if (hex.startsWith('rgba')) return hex;
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function draw() {
  const tms = now();
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.save();
  if (state.shake > 0.5) ctx.translate((Math.random() - 0.5) * state.shake * 0.5, (Math.random() - 0.5) * state.shake * 0.5);

  drawBackdrop();
  drawGround();

  if (state.world) {
    for (const b of state.world.bodies) {
      if (b.isStatic || b.isProjectile) continue;
      if (!b.isTarget) drawBlock(b);
    }
    for (const b of state.world.bodies) {
      if (b.isTarget && !b.dead) drawTarget(b, tms);
    }
  }

  drawTrail();
  drawCatapult();

  // Loaded boulder sits in the bucket while aiming; the live body while firing.
  if (state.mode === 'aiming') drawBoulderShape(LAUNCH_POS.x, LAUNCH_POS.y, BOULDER_R, tms / 400);
  else if (state.boulder && !state.boulder.dead) drawBoulderShape(state.boulder.x, state.boulder.y, BOULDER_R, state.boulder.angle);

  if (state.mode === 'aiming') drawAim();
  drawParticles();
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * HUD + hint
 * ------------------------------------------------------------------------ */
function updateHud() {
  $('hudLevelVal').textContent = `${state.levelIndex + 1}/${LEVEL_COUNT}`;
  $('hudTargetsVal').textContent = String(state.mode === 'title' ? 0 : targetsRemaining());
  $('hudAmmoVal').textContent = String(state.ammo);
  $('hudScoreVal').textContent = String(state.score + state.levelScore);
}
function renderHint() {
  if (state.mode === 'aiming') {
    hint.textContent = state.drag
      ? t(lang, 'aimReadout', (() => { const a = liveAimFromDrag(state.drag); return { power: Math.round(a.power * 100), angle: Math.round(a.angleDeg) }; })())
      : t(lang, 'hint');
  } else if (state.mode === 'firing') {
    hint.textContent = state.settleTimer > 0.05 ? t(lang, 'settlingHint') : t(lang, 'flyingHint');
  }
}

/* ------------------------------------------------------------------------ *
 * Input — Pointer Events unify touch/mouse. A pull can only start inside a
 * generous grab zone around the catapult; setPointerCapture keeps move/up
 * flowing even if the finger leaves the canvas mid-drag.
 * ------------------------------------------------------------------------ */
function eventToCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
    y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
  };
}
function onPointerDown(e) {
  sfx.unlock();
  if (state.mode !== 'aiming' || state.drag) return;
  const pt = eventToCanvasPoint(e);
  if (Math.hypot(pt.x - LAUNCH_POS.x, pt.y - LAUNCH_POS.y) > GRAB_ZONE_RADIUS_PX) return;
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
  const dist = Math.hypot(state.drag.cur.x - LAUNCH_POS.x, state.drag.cur.y - LAUNCH_POS.y);
  canvas.classList.remove('is-dragging');
  if (dist < MIN_DRAG_PX_TO_LAUNCH) { state.drag = null; renderHint(); return; }
  const { power, angleDeg } = liveAimFromDrag(state.drag);
  doLaunch(power, angleDeg);
}

function onStart() { sfx.unlock(); sfx.play('tap'); state.score = 0; loadLevel(0); }
function onNextLevel() { sfx.play('tap'); loadLevel(state.levelIndex + 1); }
function onRetry() { sfx.play('tap'); loadLevel(state.levelIndex); }
function onPlayAgain() { sfx.unlock(); sfx.play('tap'); state.score = 0; state.isNewBest = false; loadLevel(0); }

function onKey(e) {
  if ((e.code === 'Enter' || e.code === 'Space')) {
    if (state.mode === 'title') { e.preventDefault(); onStart(); }
    else if (state.mode === 'levelClear') { e.preventDefault(); onNextLevel(); }
    else if (state.mode === 'levelFail') { e.preventDefault(); onRetry(); }
    else if (state.mode === 'win') { e.preventDefault(); onPlayAgain(); }
  }
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
  renderHint();
  updateHud();
  // Re-render whichever overlay card is currently open so its dynamic lines
  // update immediately.
  if (state.mode === 'levelClear') {
    $('clearLevelLine').textContent = t(lang, 'levelLine', { n: state.levelIndex + 1, name: t(lang, state.level.nameKey) });
    $('clearShotsLine').textContent = `${t(lang, 'shotsUsedLabel')}: ${state.shotsUsed}`;
    $('clearScoreLine').textContent = `${t(lang, 'scoreLabel')}: ${state.score}`;
  } else if (state.mode === 'levelFail') {
    $('failTargetsLine').textContent = `${t(lang, 'targetsLabel')}: ${targetsRemaining()} / ${state.targetsTotal}`;
  } else if (state.mode === 'win') {
    $('finalScoreLine').textContent = `${t(lang, 'finalScoreLabel')}: ${state.score}`;
    $('finalBestLine').textContent = `${t(lang, 'bestLabel')}: ${state.best}`;
  }
  rememberLang(lang);
}

/* ------------------------------------------------------------------------ *
 * Main loop
 * ------------------------------------------------------------------------ */
let accumulator = 0;
function update(dt) {
  updateParticles(dt);
  if (state.arm.t < 1) state.arm.t = Math.min(1, state.arm.t + dt / 0.26);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);

  if (state.mode === 'firing') {
    accumulator = Math.min(accumulator + dt, 0.1);
    while (accumulator >= PHYS_DT) {
      physicsStep(PHYS_DT);
      accumulator -= PHYS_DT;
      if (state.mode !== 'firing') { accumulator = 0; break; }
    }
    renderHint();
  }
}

let lastNow = now();
function loop(t0) {
  const dt = Math.min(0.05, (t0 - lastNow) / 1000);
  lastNow = t0;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------------ */
function init() {
  state.best = loadBest();
  applyLang(lang);
  showCard('start');
  state.mode = 'title';
  updateHud();

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  $('btnStart').addEventListener('click', onStart);
  $('btnNextLevel').addEventListener('click', onNextLevel);
  $('btnRetry').addEventListener('click', onRetry);
  $('btnPlayAgain').addEventListener('click', onPlayAgain);
  window.addEventListener('keydown', onKey);

  requestAnimationFrame((t0) => { lastNow = t0; requestAnimationFrame(loop); });

  // Debug/test hook — mirrors games/penguin-fling's window.OGH_PENGUIN_FLING:
  // lets a headless harness drive the sim deterministically (exact launch
  // power/angle, manual physics ticks) and inspect live body state instead of
  // fighting real pointer timing.
  window.OGH_SIEGE_BREAK = {
    state, Physics, LEVELS,
    lang: () => lang,
    loadLevel(i) { loadLevel(i); },
    /** Launch immediately with exact power [0,1] and angle in degrees. */
    launch(power, angleDeg) {
      if (state.mode === 'title') loadLevel(0);
      if (state.mode !== 'aiming') return false;
      doLaunch(power, angleDeg);
      return true;
    },
    /** Advance N fixed physics ticks (bypasses the rAF accumulator). */
    step(n = 1) { for (let i = 0; i < n && state.mode === 'firing'; i++) physicsStep(PHYS_DT); },
    /** Advance one rAF-style frame (particles + physics + draw). */
    tick(dtMs) { update(dtMs / 1000); draw(); },
    world: () => state.world,
    boulder: () => state.boulder,
    targetsRemaining,
    PHYS_DT,
    LAUNCH_POS, GROUND_Y,
  };
}

init();
