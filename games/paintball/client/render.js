/**
 * render.js — canvas drawing for Paintball: parallax backdrop, the 3
 * depth-lane cover bands (targets visually "pop up from behind" them via
 * clipping), the 4 target silhouettes, paint splats, and the crosshair.
 *
 * Colors are hardcoded here (not read from CSS custom properties) since
 * canvas fill/stroke styles need concrete strings either way — same
 * convention as games/billiards' and games/mini-golf's draw code. Paint
 * splat colors are deliberately a separate bright palette from the target
 * outline colors so a fresh splat always reads clearly against any target.
 *
 * Deliberately LTR/un-mirrored: this module never reads document
 * direction. See i18n.js's header comment + index.html's dir="ltr".
 */
import {
  CANVAS_W, CANVAS_H, LANES, BASE_TARGET_R, targetRadius, slotVisual,
} from './targets.js';

const LANE_HAZE = { far: 0.7, mid: 0.86, near: 1.0 };

export const PAINT_COLORS = ['#ff2e6e', '#ffd400', '#39ff8f', '#2ecbff', '#b968ff', '#ff8a1e'];

/* ------------------------------------------------------------------------ *
 * Small canvas helpers
 * ------------------------------------------------------------------------ */
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function starPath(ctx, cx, cy, spikes, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / spikes - Math.PI / 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/* ------------------------------------------------------------------------ *
 * Background — sky gradient, a glowing marker "sun", a drifting hill
 * silhouette, and a ground plane. Purely decorative parallax atmosphere;
 * no gameplay-meaningful state lives here.
 * ------------------------------------------------------------------------ */
const HORIZON_Y = 170;

function drawBackground(ctx, t) {
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  sky.addColorStop(0, '#0a0f1e');
  sky.addColorStop(1, '#152238');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, HORIZON_Y);

  const gx = 830;
  const gy = 66;
  const glow = ctx.createRadialGradient(gx, gy, 4, gx, gy, 76);
  glow.addColorStop(0, 'rgba(255,209,102,0.55)');
  glow.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(gx, gy, 76, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe9b8';
  ctx.beginPath(); ctx.arc(gx, gy, 21, 0, Math.PI * 2); ctx.fill();

  // distant hill silhouette, slow independent drift for atmosphere
  const drift = Math.sin(t * 0.05) * 10;
  ctx.fillStyle = '#101a2c';
  ctx.beginPath();
  ctx.moveTo(0, HORIZON_Y);
  for (let x = 0; x <= CANVAS_W; x += 40) {
    const y = 138 + Math.sin((x + drift * 12) * 0.006) * 16;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(CANVAS_W, HORIZON_Y);
  ctx.closePath();
  ctx.fill();

  const ground = ctx.createLinearGradient(0, HORIZON_Y, 0, CANVAS_H);
  ground.addColorStop(0, '#16241c');
  ground.addColorStop(1, '#0a120d');
  ctx.fillStyle = ground;
  ctx.fillRect(0, HORIZON_Y, CANVAS_W, CANVAS_H - HORIZON_Y);

  ctx.save();
  ctx.shadowColor = '#5ce1ff';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(92,225,255,0.32)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, HORIZON_Y); ctx.lineTo(CANVAS_W, HORIZON_Y); ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Lane cover bands — targets are clipped to y < baseY so they visually
 * "emerge from behind" this band while rising/falling; the thin rim line
 * drawn after targets sells a lip the target tucks behind.
 * ------------------------------------------------------------------------ */
function drawLaneWall(ctx, lane, haze) {
  const cx = CANVAS_W / 2;
  const w = lane.spreadW + 60 * lane.scale;
  const h = 30 * lane.scale;
  ctx.save();
  ctx.globalAlpha = haze;
  const grad = ctx.createLinearGradient(0, lane.baseY, 0, lane.baseY + h);
  grad.addColorStop(0, '#1c2a20');
  grad.addColorStop(1, '#0d1712');
  ctx.fillStyle = grad;
  roundRectPath(ctx, cx - w / 2, lane.baseY, w, h, 6 * lane.scale);
  ctx.fill();
  ctx.restore();
}

function drawLaneRim(ctx, lane, haze) {
  const cx = CANVAS_W / 2;
  const w = lane.spreadW + 60 * lane.scale;
  ctx.save();
  ctx.globalAlpha = haze;
  ctx.shadowColor = '#5ce1ff';
  ctx.shadowBlur = 8 * lane.scale;
  ctx.strokeStyle = 'rgba(92,225,255,0.5)';
  ctx.lineWidth = Math.max(1, 2 * lane.scale);
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, lane.baseY);
  ctx.lineTo(cx + w / 2, lane.baseY);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Target silhouettes — drawn at a fixed unit scale (BASE_TARGET_R) around
 * (0,0); the caller translates/scales into place. Shape, not just color,
 * distinguishes each type (important for the civilian "don't shoot" cue —
 * readable even without color perception): grunt has a bullseye chest
 * badge, ace leans forward with a star badge, civilian raises both hands
 * and carries a small white flag, crate is a plain box with a paint-drop
 * icon.
 * ------------------------------------------------------------------------ */
function drawGrunt(ctx) {
  ctx.shadowColor = '#5ce1ff';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#141a2c';
  roundRectPath(ctx, -26, -6, 52, 54, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(92,225,255,0.85)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = '#141a2c';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-24, 4); ctx.lineTo(-40, 26);
  ctx.moveTo(24, 4); ctx.lineTo(40, 26);
  ctx.stroke();

  ctx.fillStyle = '#141a2c';
  ctx.beginPath(); ctx.arc(0, -30, 20, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(92,225,255,0.85)';
  ctx.stroke();

  ctx.shadowBlur = 0;
  const rings = [16, 10, 4];
  const cols = ['#ff2e6e', '#fff2f5', '#ff2e6e'];
  for (let i = 0; i < rings.length; i++) {
    ctx.fillStyle = cols[i];
    ctx.beginPath(); ctx.arc(0, 16, rings[i], 0, Math.PI * 2); ctx.fill();
  }
}

function drawAce(ctx) {
  ctx.save();
  ctx.rotate(-0.12);
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#161225';
  roundRectPath(ctx, -24, -8, 48, 50, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,209,102,0.9)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = '#161225';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-22, 2); ctx.lineTo(-36, -14);
  ctx.moveTo(22, 2); ctx.lineTo(38, 20);
  ctx.stroke();

  ctx.fillStyle = '#161225';
  ctx.beginPath(); ctx.arc(2, -30, 18, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,209,102,0.9)';
  ctx.stroke();

  ctx.shadowBlur = 0;
  starPath(ctx, 0, 14, 5, 12, 5.4);
  ctx.fillStyle = '#ffd166';
  ctx.fill();
  ctx.restore();
}

function drawCivilian(ctx) {
  ctx.shadowColor = '#5cffb0';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#132018';
  roundRectPath(ctx, -22, -4, 44, 50, 13);
  ctx.fill();
  ctx.strokeStyle = 'rgba(92,255,176,0.9)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // both arms straight up — a "friendly, hands up" pose that reads as
  // "don't shoot" by silhouette alone, not just by color
  ctx.strokeStyle = '#132018';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-18, 0); ctx.lineTo(-30, -38);
  ctx.moveTo(18, 0); ctx.lineTo(30, -38);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(92,255,176,0.9)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-18, 0); ctx.lineTo(-30, -38);
  ctx.moveTo(18, 0); ctx.lineTo(30, -38);
  ctx.stroke();

  ctx.fillStyle = '#132018';
  ctx.beginPath(); ctx.arc(0, -28, 19, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(92,255,176,0.9)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // small white flag above the raised hand — second, shape-only "safe" cue
  ctx.strokeStyle = 'rgba(230,255,240,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(30, -38); ctx.lineTo(30, -58); ctx.stroke();
  ctx.fillStyle = '#e8fff2';
  ctx.beginPath();
  ctx.moveTo(30, -58); ctx.lineTo(46, -53); ctx.lineTo(30, -47);
  ctx.closePath(); ctx.fill();
}

function drawCrate(ctx) {
  ctx.shadowColor = '#ff9d4d';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#241608';
  roundRectPath(ctx, -30, -26, 60, 56, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,157,77,0.9)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,157,77,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-30, -4); ctx.lineTo(30, -4);
  ctx.moveTo(-14, -26); ctx.lineTo(-14, 30);
  ctx.moveTo(14, -26); ctx.lineTo(14, 30);
  ctx.stroke();

  ctx.fillStyle = '#2ecbff';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.quadraticCurveTo(10, -2, 0, 8);
  ctx.quadraticCurveTo(-10, -2, 0, -18);
  ctx.closePath();
  ctx.fill();
}

const DRAW_BY_TYPE = {
  grunt: drawGrunt, ace: drawAce, civilian: drawCivilian, crate: drawCrate,
};

function drawLaneTargets(ctx, lane, laneIdx, slots, nowSec, params, haze) {
  for (const slot of slots) {
    if (slot.laneIdx !== laneIdx || !slot.type) continue;
    const fn = DRAW_BY_TYPE[slot.type];
    if (!fn) continue;
    const visual = slotVisual(slot, nowSec, params);
    const r = targetRadius(slot);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_W, lane.baseY + 2);
    ctx.clip();
    ctx.globalAlpha = haze;
    ctx.translate(visual.x, visual.y);
    const sc = r / BASE_TARGET_R;
    ctx.scale(sc, sc);
    fn(ctx);
    ctx.restore();
  }
}

/* ------------------------------------------------------------------------ *
 * Paint splats — an irregular blob (randomized points smoothed into a
 * blobby polygon via quadratic curves through edge midpoints) plus a few
 * scattered droplets. `age`/`growMs` drive a brief pop-in grow animation
 * (see game.js's advanceSplats); once grown, the caller bakes one final
 * drawSplatShape(..., 1) call onto a persistent offscreen layer so splats
 * accumulate cheaply without an ever-growing per-frame draw list.
 * ------------------------------------------------------------------------ */
export function makeSplat(x, y, opts = {}) {
  const big = opts.big !== false;
  const baseR = big ? 16 + Math.random() * 16 : 6 + Math.random() * 5;
  const color = opts.color || PAINT_COLORS[(Math.random() * PAINT_COLORS.length) | 0];
  const count = 8 + ((Math.random() * 5) | 0);
  const verts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const r = baseR * (0.55 + Math.random() * 0.7);
    verts.push({ a, r });
  }
  const dropletCount = big ? 4 + ((Math.random() * 5) | 0) : 1 + ((Math.random() * 2) | 0);
  const droplets = [];
  for (let i = 0; i < dropletCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const dist = baseR * (0.9 + Math.random() * 1.3);
    droplets.push({ x: Math.cos(a) * dist, y: Math.sin(a) * dist, r: 1.4 + Math.random() * (big ? 3.6 : 1.8) });
  }
  return {
    x, y, color, verts, droplets, age: 0, growMs: big ? 190 : 130,
  };
}

export function drawSplatShape(ctx, splat, scale) {
  const pts = splat.verts.map((v) => ({ x: Math.cos(v.a) * v.r, y: Math.sin(v.a) * v.r }));
  const n = pts.length;
  ctx.save();
  ctx.translate(splat.x, splat.y);
  ctx.scale(scale, scale);
  ctx.fillStyle = splat.color;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo((pts[0].x + pts[n - 1].x) / 2, (pts[0].y + pts[n - 1].y) / 2);
  for (let i = 0; i < n; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % n];
    ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
  }
  ctx.closePath();
  ctx.fill();
  for (const d of splat.droplets) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Score popups ("+100" / "-150") — drawn as plain canvas text that rises
 * and fades over its lifetime (game.js's spawnPopup/advancePopups own the
 * state; this just draws it). Canvas text instead of a DOM overlay
 * sidesteps having to keep a separate element pixel-aligned with the
 * auto-sized, potentially letterboxed canvas box.
 * ------------------------------------------------------------------------ */
function drawPopups(ctx, popups) {
  if (!popups.length) return;
  ctx.save();
  ctx.font = '700 24px "Montserrat", "Roboto", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of popups) {
    const tt = Math.min(1, p.age / p.ttl);
    const rise = tt * 36;
    ctx.globalAlpha = Math.max(0, 1 - tt);
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y - rise);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Crosshair — pulses briefly white on fire (state.fireFlashMs, set by
 * game.js's fire()).
 * ------------------------------------------------------------------------ */
function drawCrosshair(ctx, aim, fireFlashMs) {
  const pulse = fireFlashMs > 0 ? 1 + (fireFlashMs / 90) * 0.35 : 1;
  ctx.save();
  ctx.translate(aim.x, aim.y);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = '#ff6bcb';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = fireFlashMs > 0 ? '#ffffff' : 'rgba(255,107,203,0.92)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-32, 0); ctx.lineTo(-12, 0);
  ctx.moveTo(12, 0); ctx.lineTo(32, 0);
  ctx.moveTo(0, -32); ctx.lineTo(0, -12);
  ctx.moveTo(0, 12); ctx.lineTo(0, 32);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Frame entry point — background, baked paint layer, lanes (wall -> clipped
 * targets -> rim), still-animating splats on top, then the crosshair.
 * ------------------------------------------------------------------------ */
export function drawFrame(ctx, paintCanvas, state, nowSec, params) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawBackground(ctx, nowSec);
  ctx.drawImage(paintCanvas, 0, 0);

  LANES.forEach((lane, laneIdx) => {
    const haze = LANE_HAZE[lane.id] ?? 1;
    drawLaneWall(ctx, lane, haze);
    drawLaneTargets(ctx, lane, laneIdx, state.slots, nowSec, params, haze);
    drawLaneRim(ctx, lane, haze);
  });

  for (const s of state.splats) {
    const growT = Math.min(1, s.age / s.growMs);
    const eased = growT < 1 ? 1 - (1 - growT) ** 3 : 1;
    drawSplatShape(ctx, s, eased * 1.06);
  }

  drawPopups(ctx, state.popups);
  drawCrosshair(ctx, state.aim, state.fireFlashMs);
}
