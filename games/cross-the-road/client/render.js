/**
 * render.js — pseudo-3D canvas rendering for Cross the Road.
 *
 * The camera rides with the player: it is always positioned at the player's
 * (smoothly animated) row, so the player renders at a fixed screen anchor
 * (depth 0, scale 1) while every other row's depth `d = rowIndex - cameraZ`
 * changes as the player advances. Each row is drawn as a trapezoid whose
 * near/far edges are projected with a standard pseudo-3D perspective divide
 * (scale = FOCAL / (FOCAL + depth)), so lanes visibly narrow and rise toward
 * a horizon line instead of being a flat top-down grid — vehicles and the
 * player sprite are scaled by that same per-depth factor.
 *
 * Deliberately LTR/un-mirrored: this module never reads document direction.
 * `left`/`right` and the road's spatial layout stay fixed regardless of UI
 * language (see i18n.js's header comment + index.html's dir="ltr" on the
 * canvas).
 */
import { slotNorm } from './road.js';

export const CANVAS_W = 720;
export const CANVAS_H = 1000;

const HORIZON_Y = CANVAS_H * 0.30;
const CAMERA_Y = CANVAS_H * 0.90;
const ROAD_HALF_W = 300;
const FOCAL = 3.0;
const MARGIN_FACTOR = 0.88; // keeps the outermost dodge slots off the road edge

export const MAX_DEPTH_ROWS = 22; // rows beyond this are not drawn at all
const FADE_BAND = 6; // last N rows before the cutoff fade smoothly to invisible

const HOP_ARC_PX = 46;

/* ------------------------------------------------------------------------ *
 * Perspective projection
 * ------------------------------------------------------------------------ */
function effDepth(d) { return Math.max(-0.5, d); }
export function scaleAt(d) { return Math.min(1.3, FOCAL / (FOCAL + effDepth(d))); }
export function projY(d) { return HORIZON_Y + (CAMERA_Y - HORIZON_Y) * scaleAt(d); }
export function projHalfW(d) { return ROAD_HALF_W * scaleAt(d); }
export function projX(colNorm, d) { return CANVAS_W / 2 + colNorm * projHalfW(d) * MARGIN_FACTOR; }

function depthFade(dFar) {
  return Math.max(0, Math.min(1, (MAX_DEPTH_ROWS - dFar) / FADE_BAND));
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
 * Sky + horizon
 * ------------------------------------------------------------------------ */
const SKY_TOP = '#05060c';
const SKY_HORIZON = '#122234';

function drawSky(ctx, camZ) {
  const grad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(1, SKY_HORIZON);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, HORIZON_Y);

  // Cheap parallax skyline: a tiled row of dark silhouette blocks that drift
  // slowly with cameraZ, reinforcing forward motion even where the road
  // itself hasn't visibly changed depth (a subtle but effective pseudo-3D
  // depth cue, same idea as classic pseudo-3D racers' scrolling backdrops).
  const tileW = 180;
  const offset = ((camZ * 5) % tileW + tileW) % tileW;
  ctx.fillStyle = 'rgba(9,13,26,0.92)';
  for (let x = -offset - tileW; x < CANVAS_W + tileW; x += tileW) {
    ctx.fillRect(x + 10, HORIZON_Y - 34, 46, 34);
    ctx.fillRect(x + 66, HORIZON_Y - 58, 34, 58);
    ctx.fillRect(x + 112, HORIZON_Y - 26, 50, 26);
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

  // ground wedge between the horizon and where the first row band starts,
  // so there is never a visible seam before rows begin drawing
  ctx.fillStyle = SKY_HORIZON;
  ctx.fillRect(0, HORIZON_Y, CANVAS_W, CAMERA_Y - HORIZON_Y + 40);
}

/* ------------------------------------------------------------------------ *
 * Road row bands (trapezoids) + lane markings
 * ------------------------------------------------------------------------ */
function drawRowBand(ctx, row, dNear, dFar) {
  const alpha = depthFade(dFar);
  if (alpha <= 0.01) return;

  const yNear = projY(dNear);
  const yFar = projY(dFar);
  const xNearL = projX(-1, dNear);
  const xNearR = projX(1, dNear);
  const xFarL = projX(-1, dFar);
  const xFarR = projX(1, dFar);

  const isSafe = row.kind !== 'road';
  const parity = ((row.rowIndex % 2) + 2) % 2;
  const fill = isSafe ? '#123322' : (parity === 0 ? '#12141f' : '#171a2a');
  const edge = isSafe ? '#5cffb0' : '#5ce1ff';
  const sNear = scaleAt(dNear);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(xNearL, yNear);
  ctx.lineTo(xNearR, yNear);
  ctx.lineTo(xFarR, yFar);
  ctx.lineTo(xFarL, yFar);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = edge;
  ctx.shadowBlur = 6 * sNear;
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(1, 2.4 * sNear);
  ctx.beginPath(); ctx.moveTo(xNearL, yNear); ctx.lineTo(xFarL, yFar); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(xNearR, yNear); ctx.lineTo(xFarR, yFar); ctx.stroke();
  ctx.shadowBlur = 0;

  if (row.kind === 'road') {
    const midD = (dNear + dFar) / 2;
    const midY = projY(midD);
    const midHalf = projHalfW(midD);
    const midScale = scaleAt(midD);

    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = '#ffffff';
    for (const c of [-0.55, 0, 0.55]) {
      const mx = CANVAS_W / 2 + c * midHalf * MARGIN_FACTOR;
      const dashW = Math.max(1, 10 * midScale);
      const dashH = Math.max(1, 2.2 * midScale);
      ctx.fillRect(mx - dashW / 2, midY - dashH / 2, dashW, dashH);
    }

    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = edge;
    const chevSize = Math.max(3, 9 * midScale);
    ctx.beginPath();
    if (row.dir >= 0) {
      ctx.moveTo(CANVAS_W / 2 - chevSize, midY - chevSize * 0.7);
      ctx.lineTo(CANVAS_W / 2 + chevSize, midY);
      ctx.lineTo(CANVAS_W / 2 - chevSize, midY + chevSize * 0.7);
    } else {
      ctx.moveTo(CANVAS_W / 2 + chevSize, midY - chevSize * 0.7);
      ctx.lineTo(CANVAS_W / 2 - chevSize, midY);
      ctx.lineTo(CANVAS_W / 2 + chevSize, midY + chevSize * 0.7);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Vehicles
 * ------------------------------------------------------------------------ */
function drawVehicle(ctx, v, dNear, dir, fadeA) {
  const d = dNear + 0.5; // draw mid-row-depth so the sprite sits inside its trapezoid band
  const s = scaleAt(d);
  const cx = projX(v.x, d);
  const cy = projY(d);
  const lenPx = Math.max(2, v.halfW * 2 * projHalfW(d) * MARGIN_FACTOR);
  const baseDepth = v.kind === 'truck' ? 58 : 42;
  const depthPx = Math.max(2, baseDepth * s);

  ctx.save();
  ctx.globalAlpha = fadeA;
  ctx.translate(cx, cy);
  if (dir < 0) ctx.scale(-1, 1); // mirror so the cabin/windshield faces the direction of travel

  ctx.shadowColor = v.color;
  ctx.shadowBlur = Math.max(2, 10 * s);
  ctx.fillStyle = v.color;
  roundRect(ctx, -lenPx / 2, -depthPx / 2, lenPx, depthPx, Math.min(6, depthPx * 0.28));
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(8,10,18,0.6)';
  const cabinW = lenPx * (v.kind === 'truck' ? 0.26 : 0.34);
  roundRect(ctx, lenPx / 2 - cabinW - lenPx * 0.08, -depthPx * 0.32, cabinW, depthPx * 0.64, Math.min(4, depthPx * 0.2));
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Player
 * ------------------------------------------------------------------------ */
function drawPlayer(ctx, state) {
  const p = state.player;
  const cx = projX(slotNorm(p.visualCol), 0);
  const lift = (p.airLift || 0) * HOP_ARC_PX;
  const cy = CAMERA_Y - lift;

  ctx.save();
  ctx.globalAlpha = Math.max(0.15, 0.4 - (p.airLift || 0) * 0.25);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(cx, CAMERA_Y + 8, 22 - (p.airLift || 0) * 6, 8 - (p.airLift || 0) * 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const alive = p.alive !== false;
  const bodyColor = alive ? '#5ce1ff' : '#ff5c7a';
  const trimColor = alive ? '#ff6bcb' : '#ffd166';

  ctx.save();
  ctx.translate(cx, cy);
  const squash = 1 - (p.airLift || 0) * 0.12;
  ctx.scale(1 / squash, squash);
  ctx.shadowColor = bodyColor;
  ctx.shadowBlur = 14;

  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, 20); ctx.lineTo(-10, 33);
  ctx.moveTo(8, 20); ctx.lineTo(10, 33);
  ctx.stroke();

  ctx.fillStyle = bodyColor;
  roundRect(ctx, -14, -6, 28, 30, 9);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, -18, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = trimColor;
  roundRect(ctx, -14, 5, 28, 6, 3);
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Particles (crash sparks)
 * ------------------------------------------------------------------------ */
export function spawnCrashParticles(state, screenX, screenY) {
  for (let i = 0; i < 16; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 70 + Math.random() * 170;
    state.particles.push({
      x: screenX, y: screenY,
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      life: 0.5, maxLife: 0.5,
      color: Math.random() < 0.5 ? '#ff5c7a' : '#ffd166',
    });
  }
}

export function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.86, dt * 60);
    p.vy = p.vy * Math.pow(0.86, dt * 60) + 240 * dt;
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
export function playerScreenPos(state) {
  const p = state.player;
  return { x: projX(slotNorm(p.visualCol), 0), y: CAMERA_Y - (p.airLift || 0) * HOP_ARC_PX };
}

export function drawFrame(ctx, state) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  const camZ = state.player.visualRow;

  ctx.save();
  const shake = state.shake || 0;
  if (shake > 0.05) {
    ctx.translate((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake);
  }

  drawSky(ctx, camZ);

  const fromRow = Math.floor(camZ) - 1;
  const toRow = Math.ceil(camZ) + MAX_DEPTH_ROWS;
  for (let i = toRow; i >= fromRow; i--) {
    const row = state.road.rows.get(i);
    if (!row) continue;
    const dNear = i - camZ;
    const dFar = dNear + 1;
    if (dFar < -0.6) continue;
    const alpha = depthFade(dFar);
    drawRowBand(ctx, row, dNear, dFar);
    if (row.kind === 'road' && alpha > 0.01) {
      for (const v of row.vehicles) drawVehicle(ctx, v, dNear, row.dir, alpha);
    }
  }

  drawPlayer(ctx, state);
  drawParticles(ctx, state);
  ctx.restore();
}
