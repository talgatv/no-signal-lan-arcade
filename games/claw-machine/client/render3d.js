/**
 * render3d.js — all canvas drawing for Claw Machine, including the
 * pseudo-3D projection itself. prizes.js owns world/claw-space constants
 * and prize stats (no ctx code there); everything that touches a
 * CanvasRenderingContext2D lives here, including the per-prize-type shape
 * functions — same "model owns constants, render owns ALL drawing
 * including per-type shapes" split as games/paintball's targets.js/render.js.
 *
 * --- The projection -----------------------------------------------------
 * A simple oblique ("cabinet-style") projection, looking down and slightly
 * sideways into the machine through the glass, built from 3 world axes:
 *   x — left/right, y — depth (0 near glass .. PIT_Y_FAR back wall),
 *   z — height (0 floor .. RAIL_Z claw rail).
 *
 * project(x, y, z) combines two effects:
 *  1. A per-axis pixel scale (X_PX_PER_UNIT / Z_PX_PER_UNIT) that ALSO
 *     shrinks with depth via depthScale(y) — so farther objects are both
 *     smaller (size) and pulled toward the vanishing area (position). This
 *     deliberately goes a step further than a fixed-scale oblique shear
 *     (position offset by depth, size separately shrunk): tapering the
 *     position term by the same factor as the size term reads as a much
 *     more convincing "box receding into the screen" than a pure shear
 *     does on its own — the same principle games/paintball's lanes use
 *     (their `spreadW` shrinks WITH `lane.scale`, not independently).
 *  2. An additive per-unit-of-depth shear (DEPTH_SHIFT_X sideways,
 *     DEPTH_SHIFT_Y vertical) — farther points shift up and sideways on
 *     screen, nearer points sit lower, the classic simple oblique/
 *     cabinet-style projection cue named in the design brief.
 * DEPTH_SHIFT_Y is negative: increasing y (farther) must DECREASE screenY
 * (move up the canvas, since canvas y grows downward).
 *
 * Draw order is back-to-front via a single scalar depth key
 * (`y - z * DEPTH_SORT_Z_BIAS`, ascending): farther/lower objects first,
 * nearer/taller objects last, so a claw dangling low over a near prize
 * correctly occludes it, and a prize sitting high on the pile correctly
 * occludes one behind/below it.
 */
import {
  CANVAS_W, CANVAS_H, PIT_X_MIN, PIT_X_MAX, PIT_Y_NEAR, PIT_Y_FAR, WALL_TOP_Z,
  RAIL_Z, PIT_FLOOR_Z, CHUTE, PRIZE_TYPES,
} from './prizes.js';

export { CANVAS_W, CANVAS_H };

// --- Projection constants (tuned by eye against a screenshot; see header) --

const ORIGIN_X = CANVAS_W / 2;
const ORIGIN_Y = 726; // screen Y for (x=0, y=PIT_Y_NEAR, z=PIT_FLOOR_Z)
const X_PX_PER_UNIT = 1.72;
const Z_PX_PER_UNIT = 1.9;
const DEPTH_SHIFT_X = 0.48; // px sideways per world-y unit (oblique shear)
const DEPTH_SHIFT_Y = -1.92; // px vertical RISE per world-y unit (negative = up)
const NEAR_SCALE = 1.05; // depthScale at y = PIT_Y_NEAR
const FAR_SCALE = 0.58; // depthScale at y = PIT_Y_FAR
const DEPTH_SORT_Z_BIAS = 0.72;

const PRIZE_PX_PER_UNIT = 1.85;
const CLAW_PX_PER_UNIT = 1.85;

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

function depthT(y) {
  return clamp01((y - PIT_Y_NEAR) / (PIT_Y_FAR - PIT_Y_NEAR));
}

/** Linear shrink factor applied to both position spread and sprite size at
 * a given world depth y — 1 at the glass, FAR_SCALE at the back wall. */
export function depthScale(y) {
  const t = depthT(y);
  return NEAR_SCALE + (FAR_SCALE - NEAR_SCALE) * t;
}

/** World (x,y,z) -> {x, y, scale} screen-space point. `scale` is returned
 * so callers can size sprites consistently with this exact projection. */
export function project(x, y, z) {
  const sc = depthScale(y);
  return {
    x: ORIGIN_X + x * X_PX_PER_UNIT * sc - y * DEPTH_SHIFT_X,
    y: ORIGIN_Y - z * Z_PX_PER_UNIT * sc + y * DEPTH_SHIFT_Y,
    scale: sc,
  };
}

export function depthSortKey(y, z) {
  return y - z * DEPTH_SORT_Z_BIAS;
}

// --- Small canvas helpers (self-contained per-game copy, same convention
// as every sibling render module) -------------------------------------------

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

function starPath(ctx, cx, cy, spikes, outerR, innerR, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / spikes - Math.PI / 2 + rot;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// --- Cabinet chrome (screen-space, not world-projected) ---------------------
// The bezel/marquee/glass-frame/chute-tray are drawn straight in canvas
// pixel space; only the pit interior between them is the projected 3D scene.

export const VIEW = { left: 26, top: 132, right: CANVAS_W - 26, bottom: 846 };

function drawBezel(ctx) {
  ctx.save();
  ctx.fillStyle = '#0a0c18';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Outer cabinet body
  ctx.shadowColor = '#5ce1ff';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = 'rgba(92,225,255,0.45)';
  ctx.lineWidth = 3;
  roundRectPath(ctx, 8, 8, CANVAS_W - 16, CANVAS_H - 16, 26);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Corner bolts
  ctx.fillStyle = 'rgba(139,147,184,0.5)';
  for (const [bx, by] of [[26, 26], [CANVAS_W - 26, 26], [26, CANVAS_H - 26], [CANVAS_W - 26, CANVAS_H - 26]]) {
    ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
  }

  // Marquee strip (top) — decorative glow dots, no text (language-agnostic)
  const marqueeY = 58;
  for (let i = 0; i < 11; i++) {
    const mx = 90 + i * ((CANVAS_W - 180) / 10);
    const on = (i % 2) === 0;
    ctx.beginPath();
    ctx.fillStyle = on ? '#ffd166' : 'rgba(255,209,102,0.25)';
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = on ? 8 : 0;
    ctx.arc(mx, marqueeY, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,107,203,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(56, 84); ctx.lineTo(CANVAS_W - 56, 84); ctx.stroke();
  ctx.restore();
}

function drawGlassFrame(ctx, litT) {
  const { left, top, right, bottom } = VIEW;
  ctx.save();
  ctx.shadowColor = '#5ce1ff';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(92,225,255,0.55)';
  ctx.lineWidth = 4;
  roundRectPath(ctx, left - 10, top - 10, right - left + 20, bottom - top + 20, 18);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Faint diagonal glass sheen across the viewport (purely decorative)
  ctx.save();
  roundRectPath(ctx, left, top, right - left, bottom - top, 10);
  ctx.clip();
  const g = ctx.createLinearGradient(left, top, right, bottom);
  g.addColorStop(0, 'rgba(255,255,255,0.05)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.0)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.03)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(left, top, right - left, bottom - top);
  ctx.restore();

  // Prize-chute tray below the glass
  const trayTop = bottom + 14;
  const trayH = CANVAS_H - 26 - trayTop;
  ctx.fillStyle = '#0d0f1c';
  roundRectPath(ctx, left, trayTop, right - left, trayH, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(92,225,255,0.3)';
  ctx.lineWidth = 2;
  roundRectPath(ctx, left, trayTop, right - left, trayH, 12);
  ctx.stroke();

  // The chute slot itself (a dark inset with a pulsing glow when a prize is
  // mid-delivery — `litT` in [0,1], 0 = idle)
  const slot = project(CHUTE.x, CHUTE.y, 0);
  const slotW = 96;
  const slotH = 16;
  ctx.fillStyle = '#050609';
  roundRectPath(ctx, slot.x - slotW / 2, trayTop + 10, slotW, slotH, 8);
  ctx.fill();
  if (litT > 0) {
    ctx.save();
    ctx.globalAlpha = litT;
    ctx.shadowColor = '#5cffb0';
    ctx.shadowBlur = 18 * litT;
    ctx.strokeStyle = '#5cffb0';
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, slot.x - slotW / 2, trayTop + 10, slotW, slotH, 8);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.strokeStyle = 'rgba(92,225,255,0.35)';
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, slot.x - slotW / 2, trayTop + 10, slotW, slotH, 8);
    ctx.stroke();
  }
  ctx.restore();
}

// --- Pit shell (world-projected: back wall, side walls, floor + grid) -------

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function drawPitShell(ctx) {
  const nl = project(PIT_X_MIN, PIT_Y_NEAR, PIT_FLOOR_Z);
  const nr = project(PIT_X_MAX, PIT_Y_NEAR, PIT_FLOOR_Z);
  const fl = project(PIT_X_MIN, PIT_Y_FAR, PIT_FLOOR_Z);
  const fr = project(PIT_X_MAX, PIT_Y_FAR, PIT_FLOOR_Z);
  const flTop = project(PIT_X_MIN, PIT_Y_FAR, WALL_TOP_Z);
  const frTop = project(PIT_X_MAX, PIT_Y_FAR, WALL_TOP_Z);
  const nlTop = project(PIT_X_MIN, PIT_Y_NEAR, WALL_TOP_Z);
  const nrTop = project(PIT_X_MAX, PIT_Y_NEAR, WALL_TOP_Z);

  ctx.save();
  roundRectPath(ctx, VIEW.left, VIEW.top, VIEW.right - VIEW.left, VIEW.bottom - VIEW.top, 10);
  ctx.clip();

  // Back wall
  const backGrad = ctx.createLinearGradient(0, flTop.y, 0, fl.y);
  backGrad.addColorStop(0, '#141a30');
  backGrad.addColorStop(1, '#1c2440');
  ctx.fillStyle = backGrad;
  poly(ctx, [flTop, frTop, fr, fl]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(92,225,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Side walls (left + right) — a visibly distinct (if darker, "turning
  // away from the light") tone from both the back wall and the outer
  // bezel is what actually sells the box shape; too close to the bezel's
  // near-black and the walls disappear into the background.
  const sideGrad = ctx.createLinearGradient(0, nlTop.y, 0, nl.y);
  sideGrad.addColorStop(0, '#1b2340');
  sideGrad.addColorStop(1, '#121732');
  ctx.fillStyle = sideGrad;
  poly(ctx, [nlTop, flTop, fl, nl]);
  ctx.fill();
  poly(ctx, [nrTop, frTop, fr, nr]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(92,225,255,0.28)';
  ctx.lineWidth = 1.2;
  poly(ctx, [nlTop, flTop, fl, nl]);
  ctx.stroke();
  poly(ctx, [nrTop, frTop, fr, nr]);
  ctx.stroke();

  // Floor
  const floorGrad = ctx.createLinearGradient(0, fl.y, 0, nl.y);
  floorGrad.addColorStop(0, '#171b2c');
  floorGrad.addColorStop(1, '#23283f');
  ctx.fillStyle = floorGrad;
  poly(ctx, [fl, fr, nr, nl]);
  ctx.fill();

  // Floor grid — depth cue: lines of constant y (receding) + constant x
  ctx.strokeStyle = 'rgba(92,225,255,0.14)';
  ctx.lineWidth = 1;
  const GRID_Y_STEPS = 6;
  for (let i = 1; i < GRID_Y_STEPS; i++) {
    const y = PIT_Y_NEAR + ((PIT_Y_FAR - PIT_Y_NEAR) * i) / GRID_Y_STEPS;
    const a = project(PIT_X_MIN, y, PIT_FLOOR_Z);
    const b = project(PIT_X_MAX, y, PIT_FLOOR_Z);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  const GRID_X_STEPS = 8;
  for (let i = 1; i < GRID_X_STEPS; i++) {
    const x = PIT_X_MIN + ((PIT_X_MAX - PIT_X_MIN) * i) / GRID_X_STEPS;
    const a = project(x, PIT_Y_NEAR, PIT_FLOOR_Z);
    const b = project(x, PIT_Y_FAR, PIT_FLOOR_Z);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  // Back-wall rim glow (a "there's a wall here" edge cue)
  ctx.shadowColor = '#ff6bcb';
  ctx.shadowBlur = 6;
  ctx.strokeStyle = 'rgba(255,107,203,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(fl.x, fl.y); ctx.lineTo(fr.x, fr.y); ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore();
}

// --- Claw rig -----------------------------------------------------------------
// Two fixed side (Y-)rails at the pit's far corners plus a movable X-
// crossbar (the trolley) at the claw's current depth — see header comment
// for why this two-rail-plus-trolley shape was chosen over a single bar.

function drawSideRails(ctx) {
  const lNear = project(PIT_X_MIN, PIT_Y_NEAR, RAIL_Z);
  const lFar = project(PIT_X_MIN, PIT_Y_FAR, RAIL_Z);
  const rNear = project(PIT_X_MAX, PIT_Y_NEAR, RAIL_Z);
  const rFar = project(PIT_X_MAX, PIT_Y_FAR, RAIL_Z);
  ctx.save();
  ctx.strokeStyle = 'rgba(139,147,184,0.7)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(lNear.x, lNear.y); ctx.lineTo(lFar.x, lFar.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rNear.x, rNear.y); ctx.lineTo(rFar.x, rFar.y); ctx.stroke();
  ctx.restore();
}

function drawClawRig(ctx, claw) {
  const crossL = project(PIT_X_MIN, claw.y, RAIL_Z);
  const crossR = project(PIT_X_MAX, claw.y, RAIL_Z);
  const top = project(claw.x, claw.y, RAIL_Z);
  const head = project(claw.x, claw.y, claw.z);

  ctx.save();
  // Trolley crossbar
  ctx.strokeStyle = 'rgba(200,210,240,0.85)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(crossL.x, crossL.y); ctx.lineTo(crossR.x, crossR.y); ctx.stroke();
  ctx.fillStyle = 'rgba(200,210,240,0.9)';
  ctx.beginPath(); ctx.arc(top.x, top.y, 6, 0, Math.PI * 2); ctx.fill();

  // Cable
  ctx.strokeStyle = 'rgba(230,235,250,0.8)';
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(head.x, head.y); ctx.stroke();
  ctx.restore();

  drawClawHead(ctx, head, head.scale, claw.grip);
}

/** Claw head: a small hub + 3 curved prongs, at screen point `pt` already
 * scaled by the projection's depth `scale`. `grip` is 0 (fully open) .. 1
 * (fully closed) — game.js tweens this across the drop/grip/lift sequence. */
function drawClawHead(ctx, pt, scale, grip) {
  const s = CLAW_PX_PER_UNIT * scale;
  ctx.save();
  ctx.translate(pt.x, pt.y);
  ctx.scale(s, s);

  ctx.shadowColor = '#5ce1ff';
  ctx.shadowBlur = 8 / s;
  ctx.fillStyle = '#232a44';
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(92,225,255,0.9)';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const openAngle = 0.95 - grip * 0.72; // radians of outward splay
  const prongLen = 24;
  ctx.strokeStyle = '#c7d0ea';
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const base = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const hipX = Math.cos(base) * 6;
    const hipY = Math.sin(base) * 6;
    const tipX = Math.cos(base) * prongLen * Math.sin(openAngle + 0.3);
    const tipY = 10 + prongLen * Math.cos(openAngle * 0.4);
    // Simple curved prong: hip -> control -> tip, splaying outward more as
    // `grip` drops toward 0 (open) and curling inward/down as it rises to 1.
    const ctrlX = hipX + Math.cos(base) * prongLen * 0.55 * (0.4 + openAngle);
    const ctrlY = hipY + 6;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, Math.cos(base) * 3 * (1 - grip) + (i - 1) * (1 - grip), 8 + prongLen * (0.55 + grip * 0.35));
    ctx.stroke();
  }
  ctx.restore();
}

// --- Prize shapes ---------------------------------------------------------
// Each fn draws its prize centered at (0,0) using the type's OWN world-unit
// `radius` directly as the drawing scale (no separate base-unit remap) —
// the caller applies one translate+scale(PRIZE_PX_PER_UNIT * depth) before
// calling in, same "draw at world scale, let the caller project" split as
// games/mini-golf's physics-in-canvas-pixels convention.

function drawBallShape(ctx, type) {
  const r = type.radius;
  ctx.shadowColor = type.glow;
  ctx.shadowBlur = 6;
  ctx.fillStyle = type.fill;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = type.color;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = type.color;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.62, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.32, r * 0.22, 0, Math.PI * 2); ctx.fill();
}

function drawBoxShape(ctx, type) {
  const r = type.radius;
  const w = r * 1.9;
  const h = r * 1.7;
  ctx.shadowColor = type.glow;
  ctx.shadowBlur = 6;
  ctx.fillStyle = type.fill;
  roundRectPath(ctx, -w / 2, -h / 2, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = type.color;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = type.color;
  ctx.lineWidth = r * 0.22;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0);
  ctx.moveTo(0, -h / 2); ctx.lineTo(0, h / 2);
  ctx.stroke();
  ctx.fillStyle = type.color;
  ctx.beginPath(); ctx.arc(-r * 0.32, -h / 2, r * 0.26, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.32, -h / 2, r * 0.26, 0, Math.PI * 2); ctx.fill();
}

function drawBlobBody(ctx, r, squash) {
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.bezierCurveTo(-r, -r * squash, r, -r * squash, r, 0);
  ctx.bezierCurveTo(r, r * squash * 1.2, -r, r * squash * 1.2, -r, 0);
  ctx.closePath();
}

function drawBearShape(ctx, type) {
  const r = type.radius;
  ctx.shadowColor = type.glow;
  ctx.shadowBlur = 6;
  ctx.fillStyle = type.fill;
  ctx.save();
  ctx.translate(0, r * 0.28);
  drawBlobBody(ctx, r * 0.82, 0.95);
  ctx.fill();
  ctx.strokeStyle = type.color;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();
  ctx.shadowBlur = 0;

  // Head
  const headY = -r * 0.48;
  ctx.shadowColor = type.glow;
  ctx.shadowBlur = 5;
  ctx.fillStyle = type.fill;
  ctx.beginPath(); ctx.arc(0, headY, r * 0.56, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = type.color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Ears
  ctx.fillStyle = type.fill;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx * r * 0.46, headY - r * 0.42, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = type.color;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  // Face
  ctx.fillStyle = type.color;
  ctx.beginPath(); ctx.arc(-r * 0.16, headY, r * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.16, headY, r * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, headY + r * 0.16, r * 0.08, 0, Math.PI * 2); ctx.fill();
}

function drawBunnyShape(ctx, type) {
  const r = type.radius;
  ctx.shadowColor = type.glow;
  ctx.shadowBlur = 6;
  ctx.fillStyle = type.fill;
  ctx.save();
  ctx.translate(0, r * 0.3);
  drawBlobBody(ctx, r * 0.74, 0.9);
  ctx.fill();
  ctx.strokeStyle = type.color;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();
  ctx.shadowBlur = 0;

  const headY = -r * 0.36;
  ctx.shadowBlur = 5;
  ctx.fillStyle = type.fill;
  ctx.beginPath(); ctx.arc(0, headY, r * 0.48, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = type.color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Long ears
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate(sx * r * 0.24, headY - r * 0.3);
    ctx.rotate(sx * 0.18);
    ctx.fillStyle = type.fill;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.55, r * 0.16, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = type.color;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = type.color;
  ctx.beginPath(); ctx.arc(-r * 0.14, headY, r * 0.055, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.14, headY, r * 0.055, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, headY + r * 0.14, r * 0.06, 0, Math.PI * 2); ctx.fill();
}

function drawStarShape(ctx, type) {
  const r = type.radius;
  ctx.shadowColor = type.glow;
  ctx.shadowBlur = 9;
  ctx.fillStyle = type.fill;
  starPath(ctx, 0, 0, 5, r, r * 0.42);
  ctx.fill();
  ctx.strokeStyle = type.color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  starPath(ctx, 0, 0, 5, r * 0.42, r * 0.16);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
}

function drawGemShape(ctx, type) {
  const r = type.radius;
  ctx.shadowColor = type.glow;
  ctx.shadowBlur = 9;
  ctx.fillStyle = type.fill;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.82, -r * 0.15);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.82, -r * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = type.color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -r); ctx.lineTo(0, r);
  ctx.moveTo(-r * 0.82, -r * 0.15); ctx.lineTo(r * 0.82, -r * 0.15);
  ctx.stroke();
}

const SHAPE_BY_TYPE = {
  ball: drawBallShape,
  box: drawBoxShape,
  bear: drawBearShape,
  bunny: drawBunnyShape,
  star: drawStarShape,
  gem: drawGemShape,
};

function drawPrizeSprite(ctx, prize) {
  const type = PRIZE_TYPES[prize.type];
  const pt = project(prize.x, prize.y, prize.z);
  const fn = SHAPE_BY_TYPE[prize.type];
  if (!fn) return;
  const s = PRIZE_PX_PER_UNIT * pt.scale;
  ctx.save();
  ctx.translate(pt.x, pt.y);
  ctx.scale(s, s);
  ctx.rotate(prize.rot || 0);
  fn(ctx, type);
  ctx.restore();
}

// --- Frame entry point --------------------------------------------------------

/**
 * @param state.prizes  array of prize objects (prizes.js shape) — ALL of
 *   them (resting/held/falling); a held prize's x/y/z is kept following the
 *   claw by game.js each frame, so no special-casing is needed here.
 * @param state.claw    { x, y, z, grip } — grip in [0,1], 0 = open.
 * @param state.chuteGlow  0..1, drives the chute-slot glow pulse.
 */
export function drawFrame(ctx, state) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawBezel(ctx);
  drawPitShell(ctx);
  drawSideRails(ctx);

  ctx.save();
  roundRectPath(ctx, VIEW.left, VIEW.top, VIEW.right - VIEW.left, VIEW.bottom - VIEW.top, 10);
  ctx.clip();

  const entries = state.prizes.map((p) => ({
    kind: 'prize', prize: p, key: depthSortKey(p.y, p.z),
  }));
  entries.push({ kind: 'claw', key: depthSortKey(state.claw.y, state.claw.z) });
  entries.sort((a, b) => b.key - a.key); // farther (larger y / lower z) first

  for (const e of entries) {
    if (e.kind === 'prize') drawPrizeSprite(ctx, e.prize);
    else drawClawRig(ctx, state.claw);
  }
  ctx.restore();

  drawGlassFrame(ctx, state.chuteGlow || 0);
}
