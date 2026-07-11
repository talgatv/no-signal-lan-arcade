/**
 * Penguin Fling — a yeti launches a penguin across the ice. Drag back from
 * the penguin like a slingshot to aim (power from drag distance, angle from
 * drag direction), release to launch. Real projectile motion in flight,
 * then a coefficient-of-restitution bounce phase that hands off into a
 * low-friction slide phase once the vertical energy has died down — see
 * physics.js for the whole simulation (kept pure/DOM-free so it's directly
 * steppable from a test harness, same idea as games/neon-drift's
 * physics.js split). This file owns everything physics.js doesn't: canvas
 * rendering (Canvas 2D paths/gradients only, no bitmap assets), input
 * (pointer-drag aiming), camera follow, sfx/HUD wiring, i18n, and local
 * best-distance persistence via OGHProfile.
 *
 * State machine (state.mode): 'title' -> 'aiming' -> 'active' -> 'results'
 * -> (Throw again) -> 'aiming'. While mode is 'active', state.penguin.phase
 * (from physics.js) is 'flight' or 'slide' until it becomes 'stopped',
 * which is exactly when this file flips mode to 'results'.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import * as Physics from './physics.js';

const $ = (id) => document.getElementById(id);
const GAME_ID = 'penguin-fling';
const BUS_LENGTH_M = 12; // playful distance-comparison unit

const sfx = createOghSfx();

/* ------------------------------------------------------------------------ *
 * World <-> screen mapping. Fixed internal canvas resolution (matches
 * games/comet's convention: a fixed-aspect canvas CSS-scaled to fit the
 * viewport via the shared .ogh-game-canvas rule, so no per-frame resize
 * bookkeeping is needed here). The world is authored in meters; only this
 * file's draw code ever converts to pixels — physics.js never sees a pixel.
 * ------------------------------------------------------------------------ */
const CANVAS_W = 720;
const CANVAS_H = 1000;
const PPM = 20; // pixels per meter
const GROUND_SCREEN_Y = 800; // px: screen Y where world y=0 (baseline ice) sits
const VISIBLE_METERS = CANVAS_W / PPM;

const AIM_CAMERA_X = -8; // meters: camera position while aiming (shows the launch pad with runway)
const CAMERA_LEAD_M = VISIBLE_METERS * 0.32; // keep the penguin ~32% in from the left once flying
const CAMERA_SMOOTH_RATE = 3.4; // 1/s, exponential blend

function worldToScreen(xm, ym) {
  return { x: (xm - camState.x) * PPM, y: GROUND_SCREEN_Y - ym * PPM };
}

/* ------------------------------------------------------------------------ *
 * Aim tuning (input, not physics — how a drag gesture maps to power/angle)
 * ------------------------------------------------------------------------ */
const MAX_DRAG_PX = 260;
const MIN_DRAG_PX_TO_LAUNCH = 14;
const GRAB_ZONE_RADIUS_PX = 130;

// Keyboard-alternative aim tuning (hold Space to charge power to full over
// this many ms; Up/Down nudges angle by this many degrees per press).
const KB_CHARGE_MS_TO_FULL = 1400;
const KB_ANGLE_STEP_DEG = 3;

/* ------------------------------------------------------------------------ *
 * Mutable state
 * ------------------------------------------------------------------------ */
let lang = detectLang();

const state = {
  mode: 'title', // title | aiming | active | results
  attempt: 0,
  best: 0, // meters
  isNewBest: false,
  wind: 0,
  terrain: null,
  penguin: null, // { x, y, vx, vy, spin, rotation, phase, bounceCount, ... } from physics.js
  drag: null, // { startScreen:{x,y}, curScreen:{x,y} } while actively dragging
  lastHitTarget: null,
  particles: [], // snow-puff burst particles
  // Keyboard-alternative aim (touch/mouse drag is primary; this is the
  // "keyboard: optional" path — hold Space to charge power, arrows to set
  // angle, release Space to launch). Kept as a small, honest fallback
  // rather than a second full parallel input scheme.
  kb: { charging: false, chargeStart: 0, angleDeg: 45 },
};

/** Purely-visual transient state kept separate from physics.js's state on
 * purpose, so the physics module's contract stays "only the fields I
 * documented matter" — squash/stretch/shake are rendering flavor, not
 * simulation. */
const visual = {
  squashTimer: 0,
  shake: 0,
  idlePhase: Math.random() * Math.PI * 2,
  flagPulse: 0,
};

const camState = { x: AIM_CAMERA_X };

/* ------------------------------------------------------------------------ *
 * DOM refs
 * ------------------------------------------------------------------------ */
const canvas = $('game');
const ctx = canvas.getContext('2d');
ctx.direction = 'ltr'; // never inherit page RTL for canvas text (see index.html comment)

const overlay = $('overlay');
const startCard = $('startCard');
const resultCard = $('resultCard');
const hint = $('hint');
const windValEl = $('windVal');
const windArrowEl = $('windArrow');
const bestValEl = $('bestVal');
const finalDistanceLine = $('finalDistanceLine');
const newBestLineEl = $('newBestLine');
const bonusLineEl = $('bonusLine');
const comparisonLineEl = $('comparisonLine');
const bestLineStartEl = $('bestLineStart');
const bestLineEndEl = $('bestLineEnd');

const TARGET_NAME_KEYS = {
  icicle: 'targetIcicleName',
  frost: 'targetFrostName',
  glacier: 'targetGlacierName',
  aurora: 'targetAuroraName',
};
const TARGET_COLORS = {
  icicle: '#3ec6e0',
  frost: '#5b8def',
  glacier: '#9b6bf2',
  aurora: '#ff9a3d',
};

/* ------------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------------ */
function round1(n) { return Math.round(n * 10) / 10; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* ------------------------------------------------------------------------ *
 * Profile (local best-distance persistence) — same OGHProfile convention
 * games/pop-the-bugs uses for its local high score.
 * ------------------------------------------------------------------------ */
function loadBest() {
  const saved = OGHProfile.getProgress(GAME_ID);
  const n = Number(saved?.best);
  return Number.isFinite(n) ? n : 0;
}
function persistBest() {
  OGHProfile.saveProgress(
    GAME_ID,
    { best: round1(state.best) },
    { label: 'Penguin Fling', summary: `Best ${round1(state.best)} m` }
  );
}

/* ------------------------------------------------------------------------ *
 * Attempt lifecycle
 * ------------------------------------------------------------------------ */
function resetAttempt() {
  state.attempt += 1;
  state.terrain = Physics.makeTerrain(Math.random);
  state.wind = Physics.makeWind(Math.random);
  state.penguin = { x: Physics.LAUNCH_X, y: Physics.LAUNCH_Y, rotation: 0, phase: 'aiming' };
  state.mode = 'aiming';
  state.drag = null;
  state.kb.charging = false;
  state.lastHitTarget = null;
  state.isNewBest = false;
  visual.squashTimer = 0;
  visual.shake = 0;
  visual.flagPulse = 0;
  state.particles.length = 0;
  camState.x = AIM_CAMERA_X;
  overlay.hidden = true;
  updateHudWind();
  renderHint();
}

function liveAimFromDrag(drag) {
  const dxLaunch = drag.startScreen.x - drag.curScreen.x;
  const dyLaunch = drag.startScreen.y - drag.curScreen.y; // still screen space (y-down)
  const dragDist = Math.hypot(drag.curScreen.x - drag.startScreen.x, drag.curScreen.y - drag.startScreen.y);
  const power = clamp(dragDist / MAX_DRAG_PX, 0, 1);
  let angleDeg = (Math.atan2(-dyLaunch, dxLaunch) * 180) / Math.PI;
  angleDeg = clamp(angleDeg, Physics.MIN_LAUNCH_ANGLE_DEG, Physics.MAX_LAUNCH_ANGLE_DEG);
  return { power, angleDeg, dxLaunch, dyLaunch };
}

/** Unifies the two aim input sources (pointer drag and the keyboard
 * hold-to-charge fallback) into one {active, power, angleDeg, source} shape
 * for rendering/hint code that doesn't care which one is live. */
function currentAim() {
  if (state.drag) {
    const { power, angleDeg } = liveAimFromDrag(state.drag);
    return { active: true, power, angleDeg, source: 'drag' };
  }
  if (state.kb.charging) {
    const held = performance.now() - state.kb.chargeStart;
    const power = clamp(held / KB_CHARGE_MS_TO_FULL, 0, 1);
    return { active: true, power, angleDeg: state.kb.angleDeg, source: 'keyboard' };
  }
  return { active: false, power: 0, angleDeg: state.kb.angleDeg, source: null };
}

function doLaunch(power, angleDeg) {
  const angleRad = (angleDeg * Math.PI) / 180;
  state.penguin = Physics.createLaunchState({ power, angleRad, rng: Math.random });
  state.mode = 'active';
  state.drag = null;
  state.kb.charging = false;
  canvas.classList.remove('is-dragging');
  sfx.play('thwack');
  renderHint();
}

function handlePhysicsEvent(ev) {
  if (ev.type === 'bounce') {
    spawnSnowBurst(state.penguin.x, 0, Math.min(1.6, ev.impactSpeed / 14));
    visual.squashTimer = 1;
    visual.shake = Math.min(14, ev.impactSpeed * 0.9);
    sfx.play(ev.impactSpeed > 4 ? 'boing' : 'tick');
  } else if (ev.type === 'slide-start') {
    spawnSnowBurst(state.penguin.x, 0, 0.8);
    sfx.play('whoosh');
  } else if (ev.type === 'ramp-launch') {
    spawnSnowBurst(state.penguin.x, 0, 1.2);
    visual.squashTimer = 1;
    sfx.play('boing');
  } else if (ev.type === 'stopped') {
    sfx.play('land');
  }
}

function finishAttempt() {
  state.mode = 'results';
  const distance = Math.max(0, state.penguin.x);
  const hit = Physics.checkTargetHit(distance);
  state.lastHitTarget = hit;
  state.isNewBest = distance > state.best;
  if (state.isNewBest) {
    state.best = distance;
    persistBest();
  }
  updateHudBest();
  renderResults(distance, hit);
  startCard.hidden = true;
  resultCard.hidden = false;
  overlay.hidden = false;
  if (state.isNewBest) {
    setTimeout(() => sfx.play('win'), 160);
  } else if (hit) {
    setTimeout(() => sfx.play('pickup'), 120);
  }
}

/* ------------------------------------------------------------------------ *
 * Particles — small snow-puff bursts on bounce/land/ramp events.
 * ------------------------------------------------------------------------ */
function spawnSnowBurst(xm, ym, intensity) {
  const n = Math.round(6 + intensity * 10);
  const screen = worldToScreen(xm, ym + Physics.groundHeight(xm, state.terrain));
  for (let i = 0; i < n; i++) {
    const a = Math.PI + Math.random() * Math.PI; // upward-ish half circle
    const sp = (30 + Math.random() * 90) * (0.5 + intensity * 0.6);
    state.particles.push({
      x: screen.x, y: screen.y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.35 + Math.random() * 0.35,
      maxLife: 0.35 + Math.random() * 0.35,
      r: 2 + Math.random() * 3,
    });
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 140 * dt; // light gravity on the snow puffs
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  if (visual.shake > 0) visual.shake = Math.max(0, visual.shake - dt * 40);
  if (visual.squashTimer > 0) visual.squashTimer = Math.max(0, visual.squashTimer - dt * 5.5);
  visual.flagPulse = Math.max(0, visual.flagPulse - dt * 1.6);
}

/* ------------------------------------------------------------------------ *
 * Camera
 * ------------------------------------------------------------------------ */
function updateCamera(dt) {
  const following = state.mode === 'active';
  const target = following
    ? Math.max(AIM_CAMERA_X, state.penguin.x - CAMERA_LEAD_M)
    : AIM_CAMERA_X;
  const f = 1 - Math.exp(-CAMERA_SMOOTH_RATE * dt);
  camState.x += (target - camState.x) * f;
}

/* ------------------------------------------------------------------------ *
 * Trajectory preview — reuses the *real* physics step function on a
 * scratch state so the dashed preview line can never drift out of sync
 * with what will actually happen (it is not a separate approximation).
 * Stops at the first ground contact (the "cool physics" bounce/slide is
 * deliberately not previewed — this is just an aiming aid for the initial
 * arc, not a full solve).
 * ------------------------------------------------------------------------ */
function computeTrajectoryPreview(power, angleDeg) {
  const angleRad = (angleDeg * Math.PI) / 180;
  const scratch = Physics.createLaunchState({ power, angleRad, rng: () => 0.5 });
  const pts = [{ x: scratch.x, y: scratch.y }];
  const dt = 0.07;
  for (let i = 0; i < 40; i++) {
    const evs = Physics.stepPhysics(scratch, dt, state.terrain, state.wind);
    pts.push({ x: scratch.x, y: scratch.y });
    if (evs.length) break;
  }
  return pts;
}

/* ------------------------------------------------------------------------ *
 * Drawing — tiled parallax helpers
 * ------------------------------------------------------------------------ */
function drawTiled(seeds, tileWidthM, parallax, drawItem) {
  const camEff = camState.x * parallax;
  const startTile = Math.floor((camEff - tileWidthM) / tileWidthM);
  const endTile = Math.ceil((camEff + VISIBLE_METERS + tileWidthM) / tileWidthM);
  for (let ti = startTile; ti <= endTile; ti++) {
    for (const s of seeds) {
      const worldX = ti * tileWidthM + s.x;
      const screenX = (worldX - camEff) * PPM;
      if (screenX < -160 || screenX > CANVAS_W + 160) continue;
      drawItem(screenX, s);
    }
  }
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 16, 0, 0, Math.PI * 2);
  ctx.ellipse(-24, 6, 22, 13, 0, 0, Math.PI * 2);
  ctx.ellipse(26, 5, 24, 14, 0, 0, Math.PI * 2);
  ctx.ellipse(6, -10, 20, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPine(x, groundY, scale) {
  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#6b8f6f';
  for (let i = 0; i < 3; i++) {
    const w = 30 - i * 7;
    const yy = -14 - i * 16;
    ctx.beginPath();
    ctx.moveTo(0, yy - 22);
    ctx.lineTo(-w, yy + 4);
    ctx.lineTo(w, yy + 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#8a6142';
  ctx.fillRect(-4, -14, 8, 16);
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Drawing — scene
 * ------------------------------------------------------------------------ */
function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_SCREEN_Y + 60);
  grad.addColorStop(0, '#5db3f2');
  grad.addColorStop(0.55, '#a9ddfd');
  grad.addColorStop(1, '#eef9ff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const sx = CANVAS_W * 0.76;
  const sy = 118;
  const glow = ctx.createRadialGradient(sx, sy, 8, sx, sy, 150);
  glow.addColorStop(0, 'rgba(255,250,214,0.85)');
  glow.addColorStop(1, 'rgba(255,250,214,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(sx, sy, 150, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff7d6';
  ctx.beginPath(); ctx.arc(sx, sy, 44, 0, Math.PI * 2); ctx.fill();

  drawTiled(
    [{ x: 4, y: 90, s: 1 }, { x: 24, y: 150, s: 0.7 }, { x: 44, y: 70, s: 0.85 }],
    58, 0.10,
    (sxp, s) => drawCloud(sxp, s.y, s.s)
  );
}

function drawHillLayer(color, baseY, amp, wavelen, parallax, phase) {
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_H);
  const camEff = camState.x * parallax;
  const step = 24;
  for (let sxp = -step; sxp <= CANVAS_W + step; sxp += step) {
    const worldish = (sxp / PPM) + camEff;
    const y = baseY - amp - amp * Math.sin((worldish / wavelen) * Math.PI * 2 + phase);
    ctx.lineTo(sxp, y);
  }
  ctx.lineTo(CANVAS_W, CANVAS_H);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawBackground() {
  drawHillLayer('#cdeeff', GROUND_SCREEN_Y - 40, 46, 70, 0.22, 0.4);
  drawHillLayer('#e3f6ff', GROUND_SCREEN_Y - 10, 30, 46, 0.4, 2.1);
  drawTiled(
    [{ x: 10 }, { x: 27 }, { x: 41 }],
    36, 0.55,
    (sxp) => drawPine(sxp, GROUND_SCREEN_Y - 6, 0.9)
  );
}

function drawGroundAndCourse() {
  const camLeftM = camState.x;
  const camRightM = camState.x + VISIBLE_METERS;

  // Ice sheet path, sampled from the SAME groundHeight() physics.js uses
  // for collision, so what's drawn is always exactly what's collided with.
  ctx.beginPath();
  ctx.moveTo(-4, CANVAS_H + 4);
  const stepM = 6 / PPM;
  for (let xm = camLeftM - stepM; xm <= camRightM + stepM; xm += stepM) {
    const s = worldToScreen(xm, Physics.groundHeight(xm, state.terrain));
    ctx.lineTo(s.x, s.y);
  }
  ctx.lineTo(CANVAS_W + 4, CANVAS_H + 4);
  ctx.closePath();
  const iceGrad = ctx.createLinearGradient(0, GROUND_SCREEN_Y - 120, 0, CANVAS_H);
  iceGrad.addColorStop(0, '#eaf9ff');
  iceGrad.addColorStop(0.35, '#cdecfb');
  iceGrad.addColorStop(1, '#9fcdea');
  ctx.fillStyle = iceGrad;
  ctx.fill();

  // Bright shine along the top surface.
  ctx.beginPath();
  for (let xm = camLeftM - stepM; xm <= camRightM + stepM; xm += stepM) {
    const s = worldToScreen(xm, Physics.groundHeight(xm, state.terrain));
    ctx.lineTo(s.x, s.y);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Ramp deck + kicker wall so the ramp reads as a built structure, not
  // just a hill (a plain height-following ice curve was visually almost
  // indistinguishable from an ordinary terrain bump — found by actually
  // screenshotting the ramp span, not just checking the physics numbers).
  const r = state.terrain.ramp;
  if (r.x1 > camLeftM - 2 && r.x0 < camRightM + 2) {
    // Wood plank "ties" laid across the rising deck, each rotated to the
    // local surface tangent, in the same spirit as a real ski-jump's
    // slatted approach ramp peeking through its snow dusting.
    const treadSpacingM = 0.85;
    const nTreads = Math.max(2, Math.round((r.x1 - r.x0) / treadSpacingM));
    ctx.strokeStyle = 'rgba(150, 104, 53, 0.85)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (let i = 1; i < nTreads; i++) {
      const xm = r.x0 + (r.x1 - r.x0) * (i / nTreads);
      const d = 0.15;
      const s = worldToScreen(xm, Physics.groundHeight(xm, state.terrain));
      const s1 = worldToScreen(xm - d, Physics.groundHeight(xm - d, state.terrain));
      const s2 = worldToScreen(xm + d, Physics.groundHeight(xm + d, state.terrain));
      const tx = s2.x - s1.x, ty = s2.y - s1.y;
      const tlen = Math.hypot(tx, ty) || 1;
      const px = -ty / tlen, py = tx / tlen; // screen-space perpendicular
      const half = 11;
      ctx.beginPath();
      ctx.moveTo(s.x - px * half, s.y - py * half);
      ctx.lineTo(s.x + px * half, s.y + py * half);
      ctx.stroke();
    }

    // Kicker wall: a filled, outlined block (not just a stroke line) at
    // the exit edge, so the launch lip reads as a solid ledge to jump off.
    const wallWidthM = 0.32;
    const topFront = worldToScreen(r.x1, Physics.groundHeight(r.x1, state.terrain));
    const topBack = worldToScreen(r.x1 + wallWidthM, Physics.groundHeight(r.x1, state.terrain));
    const baseFrontY = Math.min(worldToScreen(r.x1, 0).y, GROUND_SCREEN_Y + 40);
    const baseBackY = Math.min(
      worldToScreen(r.x1 + wallWidthM, Math.max(0, Physics.groundHeight(r.x1 + wallWidthM, state.terrain))).y,
      GROUND_SCREEN_Y + 40
    );
    ctx.fillStyle = '#a5672e';
    ctx.beginPath();
    ctx.moveTo(topFront.x, topFront.y);
    ctx.lineTo(topBack.x, topBack.y);
    ctx.lineTo(topBack.x, baseBackY);
    ctx.lineTo(topFront.x, baseFrontY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6e4119';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Plank-seam lines on the wall face for texture.
    ctx.strokeStyle = 'rgba(110, 65, 25, 0.55)';
    ctx.lineWidth = 1.5;
    for (let k = 1; k <= 2; k++) {
      const t = k / 3;
      const y = topFront.y + (baseFrontY - topFront.y) * t;
      ctx.beginPath();
      ctx.moveTo(topFront.x, y);
      ctx.lineTo(topBack.x, y);
      ctx.stroke();
    }
  }

  // Sparkle texture: deterministic pseudo-random dots from x, so they
  // don't jitter frame to frame without needing stored state.
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let xm = Math.floor(camLeftM); xm < camRightM + 1; xm += 1) {
    for (let k = 0; k < 2; k++) {
      const h = Math.abs(Math.sin(xm * 12.9898 + k * 78.233) * 43758.5453);
      const frac = h - Math.floor(h);
      if (frac > 0.72) continue;
      const dx = (frac * 0.9);
      const gy = Physics.groundHeight(xm + dx, state.terrain);
      const s = worldToScreen(xm + dx, gy - 0.05 - frac * 0.25);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.1 + frac * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** A small amber warning-chevron sign at the ramp's peak, so the ramp reads
 * clearly as a launch feature once the chase camera reaches it during
 * flight/bounce/slide (ramps sit past x=46m, outside the aiming camera's
 * view, so this is about in-flight clarity, not pre-throw planning).
 * Deliberately NOT a pennant like the scoring flags below — different
 * silhouette and a wood/amber palette matching the ramp's own deck/wall
 * colors — so it never reads as a fifth distance target. */
function drawRampMarker() {
  const r = state.terrain.ramp;
  if (r.x1 < camState.x - 4 || r.x1 > camState.x + VISIBLE_METERS + 4) return;
  const gy = Physics.groundHeight(r.x1, state.terrain);
  const base = worldToScreen(r.x1, gy);
  const poleH = 54;
  ctx.save();
  ctx.translate(base.x, base.y);
  ctx.strokeStyle = '#6e4119';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -poleH); ctx.stroke();

  ctx.fillStyle = '#e8a23a';
  roundRectPath(-16, -poleH - 26, 32, 26, 5);
  ctx.fill();
  ctx.strokeStyle = '#6e4119';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = '#6e4119';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -poleH - 8);
  ctx.lineTo(0, -poleH - 18);
  ctx.lineTo(8, -poleH - 8);
  ctx.stroke();
  ctx.restore();
}

function drawTargets() {
  for (const tgt of Physics.TARGETS) {
    if (tgt.xMeters < camState.x - 4 || tgt.xMeters > camState.x + VISIBLE_METERS + 4) continue;
    const gy = Physics.groundHeight(tgt.xMeters, state.terrain);
    const base = worldToScreen(tgt.xMeters, gy);
    const color = TARGET_COLORS[tgt.id] || '#5b8def';

    // Landing-zone band on the ice (translucent via globalAlpha, since
    // `color` is a plain hex string here, not an rgba() to reuse).
    const zoneL = worldToScreen(tgt.xMeters - tgt.radius, gy);
    const zoneR = worldToScreen(tgt.xMeters + tgt.radius, gy);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.22;
    ctx.fillRect(zoneL.x, base.y - 4, Math.max(2, zoneR.x - zoneL.x), 8);
    ctx.globalAlpha = 1;

    const isRecent = state.lastHitTarget && state.lastHitTarget.id === tgt.id && visual.flagPulse > 0;
    const bob = isRecent ? Math.sin(performance.now() / 60) * 4 * visual.flagPulse : 0;

    const poleH = 92;
    // Candy-cane pole.
    ctx.save();
    ctx.translate(base.x, base.y + bob);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -poleH); ctx.stroke();
    ctx.strokeStyle = '#e0433a';
    ctx.lineWidth = 7;
    ctx.setLineDash([7, 7]);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -poleH); ctx.stroke();
    ctx.setLineDash([]);

    // Pennant flag.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -poleH);
    ctx.lineTo(30, -poleH + 12);
    ctx.lineTo(0, -poleH + 24);
    ctx.closePath();
    ctx.fill();

    // Distance number (plain ASCII digits — locale-neutral, matches the
    // rest of the hub's HUD number convention regardless of language).
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(tgt.xMeters)}m`, 12, -poleH + 13);
    ctx.restore();
  }
}

function drawYeti() {
  const s = worldToScreen(-0.9, 0);
  const gy = worldToScreen(-0.9, Physics.groundHeight(-0.9, state.terrain)).y;
  if (s.x < -140 || s.x > CANVAS_W + 140) return;
  const bob = Math.sin(performance.now() / 480 + visual.idlePhase) * 3;
  const isWindup = state.mode === 'aiming' && state.drag;
  let lean = 0;
  let leanY = 0;
  if (isWindup) {
    const { dxLaunch, dyLaunch } = liveAimFromDrag(state.drag);
    lean = clamp(-dxLaunch / 220, -0.35, 0.1);
    leanY = clamp(dyLaunch / -260, -0.12, 0.28);
  }

  ctx.save();
  ctx.translate(s.x, gy + bob * (isWindup ? 0.2 : 1));
  ctx.rotate(lean * 0.3);
  ctx.translate(0, leanY * 20);

  // Fuzzy body silhouette via a sine-perturbed circle path.
  ctx.fillStyle = '#eef8ff';
  ctx.beginPath();
  const bodyR = 58;
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const bump = 1 + Math.sin(a * 9 + visual.idlePhase) * 0.035;
    const rx = bodyR * bump;
    const ry = bodyR * 1.12 * bump;
    const px = Math.sin(a) * rx;
    const py = -Math.cos(a) * ry - bodyR * 0.55;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,200,225,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Belly shading.
  ctx.fillStyle = 'rgba(190,222,240,0.55)';
  ctx.beginPath();
  ctx.ellipse(0, -60, 34, 44, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arms (mitten hands) — pulled back while winding up.
  ctx.strokeStyle = '#eef8ff';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  const armPull = isWindup ? 26 : 4;
  ctx.beginPath(); ctx.moveTo(-46, -92); ctx.lineTo(-30 - armPull, -46); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(46, -92); ctx.lineTo(30 + armPull, -46); ctx.stroke();
  ctx.fillStyle = '#eef8ff';
  ctx.beginPath(); ctx.arc(-30 - armPull, -46, 11, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(30 + armPull, -46, 11, 0, Math.PI * 2); ctx.fill();

  // Face: big friendly eyes + rosy cheeks + small smile.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-16, -122, 11, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(16, -122, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#233252';
  ctx.beginPath(); ctx.arc(-13, -120, 4.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(13, -120, 4.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,150,170,0.55)';
  ctx.beginPath(); ctx.ellipse(-30, -104, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(30, -104, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#233252';
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(0, -104, 10, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();

  ctx.restore();
}

function drawPenguinShape() {
  // Centered at (0,0), facing +x (right). Dark navy back/head, white belly,
  // orange beak/feet, small flipper.
  ctx.fillStyle = '#22314c';
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f4f9ff';
  ctx.beginPath();
  ctx.ellipse(2, 6, 13, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Flipper.
  ctx.fillStyle = '#1b2740';
  ctx.beginPath();
  ctx.ellipse(-16, 2, 7, 16, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Feet.
  ctx.fillStyle = '#ff9d3d';
  ctx.beginPath(); ctx.ellipse(-8, 27, 7, 4, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(8, 28, 7, 4, -0.2, 0, Math.PI * 2); ctx.fill();

  // Head + beak + eye.
  ctx.fillStyle = '#22314c';
  ctx.beginPath(); ctx.arc(6, -24, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff9d3d';
  ctx.beginPath();
  ctx.moveTo(16, -24);
  ctx.lineTo(30, -21);
  ctx.lineTo(16, -18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(10, -27, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#12182a';
  ctx.beginPath(); ctx.arc(11, -27, 2.1, 0, Math.PI * 2); ctx.fill();
}

function drawPenguin() {
  const p = state.penguin;
  if (!p) return;

  let screenX, screenY;
  let rotation = p.rotation || 0;
  let stretch = 1;
  let squash = 0;

  if (state.mode === 'aiming' && state.drag) {
    // Visually pulled back with the drag gesture, like nestled in a sling
    // pouch — nose still points along the direction it's about to launch
    // (the live aim angle), not backward toward the drag point.
    screenX = state.drag.curScreen.x;
    screenY = state.drag.curScreen.y;
    const { power, angleDeg } = liveAimFromDrag(state.drag);
    rotation = (angleDeg * Math.PI) / 180;
    stretch = 1 + power * 0.1;
  } else {
    const screen = worldToScreen(p.x, p.y);
    screenX = screen.x;
    screenY = screen.y;
    const speed = Math.hypot(p.vx || 0, p.vy || 0);
    if (p.phase === 'slide') {
      const slope = Physics.groundSlopeAngle(p.x, state.terrain);
      rotation += (-slope - rotation) * 0.25; // ease toward lying flat along the local slope
    }
    if (state.mode === 'aiming' && state.kb.charging) {
      // Keyboard charge-up: penguin stays put but visibly "tenses" —
      // power/angle are read from the meter + trajectory preview instead.
      const aim = currentAim();
      rotation = (aim.angleDeg * Math.PI) / 180;
      stretch = 1 + aim.power * 0.12;
    }
    stretch = p.phase === 'flight' ? 1 + Math.min(0.3, speed / 90) : stretch;
    squash = visual.squashTimer > 0 ? visual.squashTimer * 0.28 : 0;
  }

  ctx.save();
  ctx.translate(screenX + (visual.shake ? (Math.random() - 0.5) * visual.shake : 0), screenY);
  ctx.rotate(-rotation);
  ctx.scale(1 + squash, stretch / (1 + squash * 0.6));
  drawPenguinShape();
  ctx.restore();
}

function drawTrajectoryPreview(power, angleDeg) {
  const pts = computeTrajectoryPreview(power, angleDeg);
  for (let i = 0; i < pts.length; i++) {
    const s = worldToScreen(pts[i].x, pts[i].y);
    const alpha = 0.85 * (1 - i / pts.length);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(47,155,234,${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSlingshotBand() {
  const anchor = worldToScreen(-0.9, 1.05);
  const cur = state.drag.curScreen;
  ctx.strokeStyle = 'rgba(40,60,90,0.55)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(anchor.x - 22, anchor.y - 6);
  ctx.lineTo(cur.x, cur.y);
  ctx.lineTo(anchor.x + 22, anchor.y - 6);
  ctx.stroke();
}

function drawParticles() {
  for (const p of state.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function roundRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Power gauge for the keyboard hold-to-charge fallback — angle is already
 * conveyed by the trajectory preview arc, so this only needs to show
 * power. */
function drawPowerMeter(power) {
  const x = 30, yBase = 760, w = 22, h = 170;
  roundRectPath(x, yBase - h, w, h, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
  const fillH = h * power;
  roundRectPath(x, yBase - fillH, w, fillH, 10);
  ctx.fillStyle = '#2f9bea';
  ctx.fill();
}

function draw() {
  ctx.save();
  if (visual.shake > 0.5) {
    ctx.translate((Math.random() - 0.5) * visual.shake * 0.4, (Math.random() - 0.5) * visual.shake * 0.4);
  }
  drawSky();
  drawBackground();
  drawGroundAndCourse();
  drawRampMarker();
  drawTargets();
  drawYeti();

  if (state.mode === 'aiming') {
    const aim = currentAim();
    if (aim.active) {
      drawTrajectoryPreview(aim.power, aim.angleDeg);
      if (aim.source === 'drag') drawSlingshotBand();
      else if (aim.source === 'keyboard') drawPowerMeter(aim.power);
    }
  }

  if (state.mode !== 'title') drawPenguin();
  drawParticles();
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * HUD + hint text
 * ------------------------------------------------------------------------ */
function updateHudWind() {
  windValEl.textContent = Math.abs(state.wind).toFixed(1);
  windArrowEl.classList.toggle('is-neg', state.wind < 0);
}
function updateHudBest() { bestValEl.textContent = round1(state.best); }

function renderHint() {
  if (state.mode === 'aiming') {
    const aim = currentAim();
    if (aim.active) {
      hint.textContent = t(lang, 'aimReadout', { power: Math.round(aim.power * 100), angle: Math.round(aim.angleDeg) });
    } else {
      hint.textContent = t(lang, 'aimHint');
    }
  } else if (state.mode === 'active') {
    hint.textContent = t(lang, 'liveDistance', { d: round1(Math.max(0, state.penguin.x)) });
  }
}

function renderBestLines() {
  const line = `${t(lang, 'bestLabel')}: ${round1(state.best)} m`;
  bestLineStartEl.textContent = line;
  bestLineEndEl.textContent = line;
}

function renderResults(distance, hit) {
  const d1 = round1(distance);
  finalDistanceLine.textContent = `${t(lang, 'distanceResultLabel')}: ${d1} m`;
  newBestLineEl.hidden = !state.isNewBest;
  if (hit) {
    bonusLineEl.hidden = false;
    bonusLineEl.textContent = t(lang, 'bonusLine', { name: t(lang, TARGET_NAME_KEYS[hit.id]), n: hit.bonus });
    visual.flagPulse = 1;
  } else {
    bonusLineEl.hidden = true;
  }
  const buses = (d1 / BUS_LENGTH_M).toFixed(1);
  comparisonLineEl.textContent = t(lang, 'comparisonLine', { n: buses });
  renderBestLines();
}

function renderAria() {
  $('hudWind').setAttribute('aria-label', t(lang, 'windAria'));
  $('hudBest').setAttribute('aria-label', t(lang, 'bestAria'));
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
  renderAria();
  renderBestLines();
  if (state.mode === 'results') {
    renderResults(Math.max(0, state.penguin.x), state.lastHitTarget);
  }
  rememberLang(lang);
}

/* ------------------------------------------------------------------------ *
 * Input — pointer events unify touch/mouse. A drag can only start within a
 * generous grab zone around the penguin's aiming-rest position (a real
 * slingshot pull, not "drag anywhere"), and setPointerCapture keeps
 * receiving move/up even if the finger leaves the canvas mid-drag.
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
  const anchor = worldToScreen(Physics.LAUNCH_X, Physics.LAUNCH_Y);
  if (Math.hypot(pt.x - anchor.x, pt.y - anchor.y) > GRAB_ZONE_RADIUS_PX) return;
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('is-dragging');
  state.drag = { pointerId: e.pointerId, startScreen: anchor, curScreen: pt };
  renderHint();
}

function onPointerMove(e) {
  if (!state.drag || e.pointerId !== state.drag.pointerId) return;
  e.preventDefault();
  state.drag.curScreen = eventToCanvasPoint(e);
  renderHint();
}

function onPointerUp(e) {
  if (!state.drag || e.pointerId !== state.drag.pointerId) return;
  e.preventDefault();
  const { power, angleDeg, dxLaunch, dyLaunch } = liveAimFromDrag(state.drag);
  const dist = Math.hypot(dxLaunch, dyLaunch);
  canvas.classList.remove('is-dragging');
  if (dist < MIN_DRAG_PX_TO_LAUNCH) {
    state.drag = null;
    renderHint();
    return;
  }
  doLaunch(power, angleDeg);
}

function onStartClick() {
  sfx.unlock();
  sfx.play('tap');
  resetAttempt();
}

/* ------------------------------------------------------------------------ *
 * Keyboard-alternative aim — see the `kb` state comment above. Ignored
 * whenever a pointer drag is already active so the two input paths can
 * never fight each other.
 * ------------------------------------------------------------------------ */
function onKeyDown(e) {
  if (state.mode === 'title' && (e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault();
    onStartClick();
    return;
  }
  if (state.mode === 'results' && (e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault();
    onStartClick();
    return;
  }
  if (state.mode !== 'aiming' || state.drag) return;
  if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
    e.preventDefault();
    const delta = e.code === 'ArrowUp' ? KB_ANGLE_STEP_DEG : -KB_ANGLE_STEP_DEG;
    state.kb.angleDeg = clamp(state.kb.angleDeg + delta, Physics.MIN_LAUNCH_ANGLE_DEG, Physics.MAX_LAUNCH_ANGLE_DEG);
    sfx.unlock();
    renderHint();
  } else if (e.code === 'Space' && !state.kb.charging) {
    e.preventDefault();
    sfx.unlock();
    state.kb.charging = true;
    state.kb.chargeStart = performance.now();
  }
}

function onKeyUp(e) {
  if (e.code === 'Space' && state.kb.charging) {
    e.preventDefault();
    const aim = currentAim();
    state.kb.charging = false;
    doLaunch(aim.power, aim.angleDeg);
  }
}

/* ------------------------------------------------------------------------ *
 * Main loop
 * ------------------------------------------------------------------------ */
function update(dt) {
  updateParticles(dt);
  updateCamera(dt);
  if (state.mode === 'active') {
    const events = Physics.stepPhysics(state.penguin, dt, state.terrain, state.wind);
    for (const ev of events) handlePhysicsEvent(ev);
    renderHint();
    if (state.penguin.phase === 'stopped') finishAttempt();
  } else if (state.mode === 'aiming' && state.kb.charging) {
    renderHint(); // power keeps rising every frame while Space is held
  }
}

let lastNow = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000);
  lastNow = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------------ */
function init() {
  state.best = loadBest();
  updateHudBest();
  resetAttempt();
  state.mode = 'title';
  startCard.hidden = false;
  resultCard.hidden = true;
  overlay.hidden = false;
  applyLang(lang);

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  $('btnStart').addEventListener('click', onStartClick);
  $('btnAgain').addEventListener('click', onStartClick);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });

  // Debug/test hook — mirrors games/pop-the-bugs' window.OGH_POP_BUGS
  // convention: lets a test harness inspect live state and drive the sim
  // directly (exact launch power/angle, manual frame ticks) instead of
  // fighting real pointer-event timing or relying on lucky random throws.
  window.OGH_PENGUIN_FLING = {
    state,
    visual,
    camState,
    Physics,
    lang: () => lang,
    /** Launch immediately (bypasses drag input) with exact power [0,1] and
     * angle in degrees — for deterministic physics testing. */
    launch(power, angleDeg) {
      if (state.mode === 'title') { resetAttempt(); state.mode = 'aiming'; overlay.hidden = true; }
      if (state.mode !== 'aiming') return false;
      doLaunch(power, angleDeg);
      return true;
    },
    /** Advance the sim by dtMs, same code path as the real rAF loop. */
    tick(dtMs) { update(dtMs / 1000); draw(); },
    resetAttempt,
    finishAttempt,
    computeTrajectoryPreview,
  };
}

init();
