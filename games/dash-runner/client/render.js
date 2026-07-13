/**
 * render.js — pseudo-3D canvas rendering for Dash Runner.
 *
 * Same projection technique as games/cross-the-road/client/render.js: the
 * camera rides with the player (always at depth 0, screen-anchored), and
 * everything else's depth `d = z - state.distance` shrinks toward 0 as the
 * player advances. Each depth is projected with a standard pseudo-3D
 * perspective divide (scale = FOCAL / (FOCAL + depth)), so the trail
 * visibly narrows toward a horizon instead of being a flat lane strip.
 * Unlike cross-the-road's discrete traffic rows, Dash Runner's world is
 * continuous, so the ground/lane-dividers are drawn as many small stacked
 * depth-bands (not one giant trapezoid) — over a large depth range a single
 * straight-edged trapezoid would visibly deviate from the true (slightly
 * curved) perspective line; stacking small bands keeps the curve accurate,
 * the same fix cross-the-road gets "for free" from its per-row structure.
 *
 * Deliberately LTR/un-mirrored: this module never reads document direction.
 * `left`/`right` and lane 0/1/2's physical position stay fixed regardless of
 * UI language (see i18n.js's header comment + index.html's dir="ltr").
 */
import {
  LANES, laneNorm, STAND_BODY_H, DUCK_TOP, LOW_TOP, HIGH_BOTTOM,
} from './track.js';

export const CANVAS_W = 720;
export const CANVAS_H = 1000;

const HORIZON_Y = CANVAS_H * 0.30;
const CAMERA_Y = CANVAS_H * 0.90;
const ROAD_HALF_W = 300;
const FOCAL = 3.0;
const MARGIN_FACTOR = 0.88; // keeps the outermost lane off the trail edge

export const MAX_DEPTH = 22; // world units beyond this are not drawn at all
const FADE_BAND = 4; // last N units before the cutoff fade smoothly to invisible

const UNIT_PX = 130; // pixels per world height-unit at depth 0 (scale 1)

/* ------------------------------------------------------------------------ *
 * Perspective projection — identical shape to cross-the-road's render.js.
 * ------------------------------------------------------------------------ */
function effDepth(d) { return Math.max(-0.5, d); }
export function scaleAt(d) { return Math.min(1.3, FOCAL / (FOCAL + effDepth(d))); }
export function projY(d) { return HORIZON_Y + (CAMERA_Y - HORIZON_Y) * scaleAt(d); }
export function projHalfW(d) { return ROAD_HALF_W * scaleAt(d); }
export function projX(colNorm, d) { return CANVAS_W / 2 + colNorm * projHalfW(d) * MARGIN_FACTOR; }
/** Screen Y for a point `worldH` height units above the ground at depth `d`. */
export function projYH(d, worldH) { return projY(d) - worldH * UNIT_PX * scaleAt(d); }

function depthFade(dFar) {
  return Math.max(0, Math.min(1, (MAX_DEPTH - dFar) / FADE_BAND));
}

/* ------------------------------------------------------------------------ *
 * Small canvas helpers
 * ------------------------------------------------------------------------ */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/* ------------------------------------------------------------------------ *
 * Sky + horizon + parallax treeline
 * ------------------------------------------------------------------------ */
const SKY_TOP = '#04050b';
const SKY_HORIZON = '#0d1a2a';

function drawSky(ctx, distance) {
  const grad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(1, SKY_HORIZON);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, HORIZON_Y);

  // Faint fixed starfield (cheap: deterministic pseudo-random via a fixed
  // seed pattern, not tied to distance) for a night-trail atmosphere.
  ctx.fillStyle = 'rgba(232,236,255,0.5)';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 137.5) % CANVAS_W;
    const sy = (i * 71.3) % (HORIZON_Y * 0.85);
    ctx.fillRect(sx, sy, 1.6, 1.6);
  }

  // Cheap parallax treeline: a tiled row of dark pine-silhouette triangles
  // drifting with distance, reinforcing forward motion — same "scrolling
  // backdrop" depth cue as cross-the-road's skyline, shaped as trees for
  // this game's forest-trail setting instead of buildings.
  const tileW = 120;
  const offset = ((distance * 9) % tileW + tileW) % tileW;
  ctx.fillStyle = 'rgba(8,16,14,0.9)';
  for (let x = -offset - tileW; x < CANVAS_W + tileW; x += tileW) {
    drawPine(ctx, x + 24, HORIZON_Y, 46, 60);
    drawPine(ctx, x + 78, HORIZON_Y, 34, 42);
  }

  ctx.save();
  ctx.shadowColor = '#5ce1ff';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = 'rgba(92,225,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HORIZON_Y);
  ctx.lineTo(CANVAS_W, HORIZON_Y);
  ctx.stroke();
  ctx.restore();

  // Ground wedge between the horizon and where the first band starts, so
  // there is never a visible seam before the trail begins drawing.
  ctx.fillStyle = SKY_HORIZON;
  ctx.fillRect(0, HORIZON_Y, CANVAS_W, CAMERA_Y - HORIZON_Y + 60);
}

function drawPine(ctx, cx, baseY, w, h) {
  ctx.beginPath();
  ctx.moveTo(cx, baseY - h);
  ctx.lineTo(cx - w / 2, baseY);
  ctx.lineTo(cx + w / 2, baseY);
  ctx.closePath();
  ctx.fill();
}

/* ------------------------------------------------------------------------ *
 * Trail bands (stacked small trapezoids) + flowing lane dividers
 * ------------------------------------------------------------------------ */
const BAND_STEP = 1.1;
const DASH_SPACING = 1.6;
const DASH_LEN = 0.5;

function drawTrail(ctx, distance) {
  for (let dNear = -0.6; dNear < MAX_DEPTH; dNear += BAND_STEP) {
    const dFar = dNear + BAND_STEP;
    const alpha = depthFade(dFar);
    if (alpha <= 0.01) continue;

    const yNear = projY(dNear);
    const yFar = projY(dFar);
    const xNearL = projX(-1, dNear);
    const xNearR = projX(1, dNear);
    const xFarL = projX(-1, dFar);
    const xFarR = projX(1, dFar);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#0c1220';
    ctx.beginPath();
    ctx.moveTo(xNearL, yNear);
    ctx.lineTo(xNearR, yNear);
    ctx.lineTo(xFarR, yFar);
    ctx.lineTo(xFarL, yFar);
    ctx.closePath();
    ctx.fill();

    const sNear = scaleAt(dNear);
    ctx.shadowColor = '#5ce1ff';
    ctx.shadowBlur = 6 * sNear;
    ctx.strokeStyle = 'rgba(92,225,255,0.8)';
    ctx.lineWidth = Math.max(1, 2.2 * sNear);
    ctx.beginPath(); ctx.moveTo(xNearL, yNear); ctx.lineTo(xFarL, yFar); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xNearR, yNear); ctx.lineTo(xFarR, yFar); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Lane dividers: dashes anchored to world-z (not screen space) so they
  // flow smoothly toward the camera as `distance` grows, phase-locked to
  // avoid any pop/jitter as new dashes enter at the horizon.
  const phase = ((distance % DASH_SPACING) + DASH_SPACING) % DASH_SPACING;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const laneEdge of [-1 / 3, 1 / 3]) {
    for (let k = -1; k * DASH_SPACING - phase < MAX_DEPTH; k++) {
      const dNear = k * DASH_SPACING - phase;
      const dFar = dNear + DASH_LEN;
      if (dFar < -0.6) continue;
      const alpha = depthFade(dFar);
      if (alpha <= 0.02) continue;
      const yN = projY(dNear);
      const yF = projY(dFar);
      const xN = projX(laneEdge * 2, dNear);
      const xF = projX(laneEdge * 2, dFar);
      const w = Math.max(1, 3.2 * scaleAt((dNear + dFar) / 2));
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.moveTo(xN - w / 2, yN);
      ctx.lineTo(xN + w / 2, yN);
      ctx.lineTo(xF + w / 2, yF);
      ctx.lineTo(xF - w / 2, yF);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------------ *
 * Obstacles — each type gets a distinct shape + color. Visual extents are
 * deliberately a little more generous-looking (taller/lower) than the real
 * hitbox in track.js: a near-clear should look closer than it actually
 * was, never the reverse (same fairness trick as cross-the-road's
 * PLAYER_HALF < PLAYER_VISUAL_HALF).
 * ------------------------------------------------------------------------ */
const OBSTACLE_COLORS = { low: '#ffd166', high: '#c4a0ff', full: '#ff5c7a' };

function drawObstacle(ctx, ob, distance, fadeA) {
  const d = ob.z - distance;
  const s = scaleAt(d);
  const cx = projX(laneNorm(ob.lane), d);
  const groundY = projY(d);
  const color = OBSTACLE_COLORS[ob.type];
  const halfLen = Math.max(3, 46 * s);

  ctx.save();
  ctx.globalAlpha = fadeA;
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.max(2, 12 * s);
  ctx.fillStyle = color;

  if (ob.type === 'low') {
    const visualTop = 0.80; // hitbox LOW_TOP=0.55 — visually taller, generous
    const topY = groundY - visualTop * UNIT_PX * s;
    roundRect(ctx, cx - halfLen, topY, halfLen * 2, groundY - topY, Math.max(3, 10 * s));
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(8,10,18,0.55)';
    for (const fx of [-0.55, 0, 0.55]) {
      roundRect(ctx, cx + fx * halfLen - 2 * s, topY + 3 * s, 4 * s, groundY - topY - 6 * s, 2 * s);
      ctx.fill();
    }
  } else if (ob.type === 'high') {
    const visualBottom = 0.68; // hitbox HIGH_BOTTOM=0.85 — hangs lower, generous
    const barTop = groundY - (visualBottom + 0.5) * UNIT_PX * s;
    const barBot = groundY - visualBottom * UNIT_PX * s;
    roundRect(ctx, cx - halfLen, barTop, halfLen * 2, barBot - barTop, Math.max(3, 8 * s));
    ctx.fill();
    ctx.shadowBlur = Math.max(2, 8 * s);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, 2.4 * s);
    for (const fx of [-0.6, -0.2, 0.2, 0.6]) {
      ctx.globalAlpha = fadeA * 0.75;
      ctx.beginPath();
      ctx.moveTo(cx + fx * halfLen, barBot);
      ctx.lineTo(cx + fx * halfLen, groundY - 0.08 * UNIT_PX * s);
      ctx.stroke();
    }
    ctx.globalAlpha = fadeA;
  } else {
    // full — a tall pillar spanning the whole lane height, unavoidable
    // except by changing lanes.
    const visualTop = 3.1;
    const topY = groundY - visualTop * UNIT_PX * s;
    roundRect(ctx, cx - halfLen * 0.8, topY, halfLen * 1.6, groundY - topY, Math.max(3, 9 * s));
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, cx - halfLen * 0.15, topY + 4 * s, halfLen * 0.3, groundY - topY - 8 * s, 3 * s);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Coins + power-ups
 * ------------------------------------------------------------------------ */
function drawCoin(ctx, c, distance, fadeA, spin) {
  const d = c.z - distance;
  const s = scaleAt(d);
  const cx = projX(laneNorm(c.lane), d);
  const cy = projY(d) - 0.45 * UNIT_PX * s;
  const r = Math.max(2, 11 * s * (0.85 + 0.15 * Math.cos(spin)));

  ctx.save();
  ctx.globalAlpha = fadeA;
  ctx.translate(cx, cy);
  ctx.scale(Math.max(0.15, Math.cos(spin)), 1);
  ctx.shadowColor = '#fff3b0';
  ctx.shadowBlur = Math.max(2, 10 * s);
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPowerup(ctx, pu, distance, fadeA, t) {
  const d = pu.z - distance;
  const s = scaleAt(d);
  const cx = projX(laneNorm(pu.lane), d);
  const cy = projY(d) - (0.55 + 0.08 * Math.sin(t * 6)) * UNIT_PX * s;
  const r = Math.max(3, 15 * s);
  const hue = (Math.sin(t * 3) + 1) / 2;
  const color = hue > 0.5 ? '#5ce1ff' : '#ff6bcb';

  ctx.save();
  ctx.globalAlpha = fadeA;
  ctx.translate(cx, cy);
  ctx.rotate(t * 2.4);
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.max(3, 16 * s);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const a2 = a1 + Math.PI / 5;
    ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
    ctx.lineTo(Math.cos(a2) * r * 0.42, Math.sin(a2) * r * 0.42);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Player — "Ember" the glow-fox: rounded body, triangle ears, tail arc,
 * animated running legs. Jump uses real airY; duck squashes the body.
 * ------------------------------------------------------------------------ */
export function playerScreenPos(state) {
  const p = state.player;
  const cx = projX(laneNorm(p.visualLane), 0);
  const cy = projYH(0, p.isDucking ? 0.3 : p.airY + 0.5);
  return { x: cx, y: cy };
}

function drawPlayer(ctx, state, t) {
  const p = state.player;
  const cx = projX(laneNorm(p.visualLane), 0);
  const groundY = projY(0);

  // Ground shadow — shrinks/fades with jump height, same trick as
  // cross-the-road's drawPlayer.
  const liftFrac = Math.min(1, p.airY / 1.3);
  ctx.save();
  ctx.globalAlpha = Math.max(0.12, 0.38 - liftFrac * 0.24);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(cx, groundY + 6, 24 - liftFrac * 7, 9 - liftFrac * 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const alive = p.alive !== false;
  const invincible = p.invincibleTimer > 0;
  const bodyColor = !alive ? '#ff5c7a' : (invincible ? (Math.sin(t * 18) > 0 ? '#ffd166' : '#5ce1ff') : '#5ce1ff');
  const trimColor = !alive ? '#ffd166' : '#ff6bcb';

  const duckSquash = p.isDucking ? 0.55 : 1;
  const bodyTopWorld = (p.isDucking ? 0.5 : 1.05) * duckSquash + p.airY;
  const cy = groundY - bodyTopWorld * UNIT_PX;

  // Legs: a simple running cycle, phase driven by distance so cadence
  // tracks speed; tucked while airborne, trailing while ducking.
  ctx.save();
  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (p.isJumping) {
    ctx.moveTo(cx - 8, cy + 24); ctx.lineTo(cx - 12, cy + 34);
    ctx.moveTo(cx + 8, cy + 24); ctx.lineTo(cx + 12, cy + 32);
  } else if (p.isDucking) {
    ctx.moveTo(cx - 14, cy + 14); ctx.lineTo(cx - 22, cy + 20);
    ctx.moveTo(cx + 10, cy + 14); ctx.lineTo(cx + 18, cy + 20);
  } else {
    const swing = Math.sin(state.runPhase * Math.PI * 2) * 13;
    ctx.moveTo(cx - 8, cy + 22); ctx.lineTo(cx - 8 + swing, groundY - 2);
    ctx.moveTo(cx + 8, cy + 22); ctx.lineTo(cx + 8 - swing, groundY - 2);
  }
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = bodyColor;
  ctx.shadowBlur = invincible ? 24 : 14;

  // Tail — a glowing arc trailing behind (screen-left, fixed regardless of
  // UI direction: this is a spatial sprite, not text).
  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.quadraticCurveTo(-34, -2 - liftFrac * 6, -30, -22 - liftFrac * 4);
  ctx.stroke();

  // Body
  ctx.fillStyle = bodyColor;
  const bodyH = p.isDucking ? 26 : 34;
  roundRect(ctx, -16, -bodyH * 0.55, 32, bodyH, 11);
  ctx.fill();

  // Head + ears
  const headY = p.isDucking ? -bodyH * 0.55 - 2 : -bodyH * 0.55 - 10;
  ctx.beginPath();
  ctx.arc(6, headY, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-1, headY - 10); ctx.lineTo(4, headY - 22); ctx.lineTo(9, headY - 9);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(9, headY - 11); ctx.lineTo(16, headY - 21); ctx.lineTo(18, headY - 6);
  ctx.closePath(); ctx.fill();

  // Snout + eye
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0a0c16';
  ctx.beginPath(); ctx.arc(9, headY + 2, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(11, headY - 3, 1.8, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Particles — crash sparks, coin sparkle, invincible smash-through.
 * ------------------------------------------------------------------------ */
function spawnParticles(state, x, y, count, colors, speed, life) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = speed[0] + Math.random() * (speed[1] - speed[0]);
    state.particles.push({
      x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      life, maxLife: life, color: colors[(Math.random() * colors.length) | 0],
    });
  }
}

export function spawnCrashParticles(state, x, y) {
  spawnParticles(state, x, y, 18, ['#ff5c7a', '#ffd166'], [70, 240], 0.5);
}

export function spawnCoinParticles(state, x, y) {
  spawnParticles(state, x, y, 6, ['#fff3b0', '#ffd166'], [40, 120], 0.35);
}

export function spawnSmashParticles(state, x, y) {
  spawnParticles(state, x, y, 12, ['#5ce1ff', '#ff6bcb'], [60, 180], 0.4);
}

export function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.86, dt * 60);
    p.vy = p.vy * Math.pow(0.86, dt * 60) + 220 * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    const f = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = f;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
  }
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------------ *
 * Frame entry point
 * ------------------------------------------------------------------------ */
export function drawFrame(ctx, state, t) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.save();
  const shake = state.shake || 0;
  if (shake > 0.05) {
    ctx.translate((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake);
  }

  drawSky(ctx, state.distance);
  drawTrail(ctx, state.distance);

  const spin = (state.distance * 3.2) % (Math.PI * 2);
  for (const c of state.track.coins) {
    const d = c.z - state.distance;
    if (d < -0.6 || d > MAX_DEPTH) continue;
    const alpha = depthFade(d);
    if (alpha > 0.01) drawCoin(ctx, c, state.distance, alpha, spin + c.id);
  }
  for (const pu of state.track.powerups) {
    const d = pu.z - state.distance;
    if (d < -0.6 || d > MAX_DEPTH) continue;
    const alpha = depthFade(d);
    if (alpha > 0.01) drawPowerup(ctx, pu, state.distance, alpha, t);
  }
  // Far obstacles first so nearer ones draw on top.
  const obstaclesByDepth = [...state.track.obstacles].sort((a, b) => b.z - a.z);
  for (const ob of obstaclesByDepth) {
    const d = ob.z - state.distance;
    if (d < -0.6 || d > MAX_DEPTH) continue;
    const alpha = depthFade(d);
    if (alpha > 0.01) drawObstacle(ctx, ob, state.distance, alpha);
  }

  drawPlayer(ctx, state, t);
  drawParticles(ctx, state);
  ctx.restore();
}

export { LANES };
