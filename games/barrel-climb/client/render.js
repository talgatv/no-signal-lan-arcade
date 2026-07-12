/**
 * render.js — all canvas drawing for Barrel Climb. Pure presentation: reads
 * plain state produced by stages.js/entities.js and draws neon-vector shapes
 * (no bitmap assets), matching the hub's house look (see games/comet and
 * games/fight-arena's style.css for the palette this mirrors). Nothing here
 * feeds back into game logic.
 */
import {
  CANVAS_W, CANVAS_H, PLAT_LEFT, PLAT_RIGHT, findSegmentAt,
} from './stages.js';
import { PLAYER_W, PLAYER_H, BARREL_RADIUS, HAZARD_RADIUS, ITEM_RADIUS } from './entities.js';

const COL_ACCENT = '#5ce1ff';
const COL_ACCENT2 = '#ff6bcb';
const COL_GOOD = '#5cffb0';
const COL_WARN = '#ffd166';
const COL_BAD = '#ff5c7a';
const COL_DIM = '#8b93b8';

function glowPath(ctx, color, blur, draw) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.strokeStyle = color;
  draw();
  ctx.restore();
}

function glowFillPath(ctx, color, blur, draw) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  draw();
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Background
 * ------------------------------------------------------------------------ */
function drawBackground(ctx, timeMs) {
  ctx.fillStyle = '#05060d';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Faint receding tower struts either side of the play area — pure
  // atmosphere, no gameplay meaning.
  ctx.save();
  ctx.strokeStyle = 'rgba(92, 225, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 6; x < PLAT_LEFT; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }
  for (let x = PLAT_RIGHT + 10; x < CANVAS_W; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }
  // Slow ambient drift lines (signal/energy feel).
  const drift = (timeMs / 4000) % 1;
  ctx.strokeStyle = 'rgba(255, 107, 203, 0.05)';
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_H * drift);
  ctx.lineTo(CANVAS_W, CANVAS_H * drift);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Platforms — glowing tilted girders with a rivet strip.
 * ------------------------------------------------------------------------ */
function drawLevel(ctx, level, isDeck) {
  for (const seg of level) {
    glowPath(ctx, isDeck ? COL_ACCENT2 : COL_ACCENT, isDeck ? 16 : 10, () => {
      ctx.lineWidth = isDeck ? 10 : 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    });
    // Rivets: small dots along the girder for a "structural" read.
    ctx.save();
    ctx.fillStyle = 'rgba(7, 8, 15, 0.85)';
    const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
    const n = Math.max(2, Math.round(len / 26));
    for (let i = 1; i < n; i++) {
      const tt = i / n;
      const rx = seg.x1 + (seg.x2 - seg.x1) * tt;
      const ry = seg.y1 + (seg.y2 - seg.y1) * tt;
      ctx.beginPath();
      ctx.arc(rx, ry, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawLadder(ctx, ladder) {
  const railOffset = 9;
  glowPath(ctx, '#c9d6ff', 6, () => {
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(ladder.x - railOffset, ladder.yTop);
    ctx.lineTo(ladder.x - railOffset, ladder.yBottom);
    ctx.moveTo(ladder.x + railOffset, ladder.yTop);
    ctx.lineTo(ladder.x + railOffset, ladder.yBottom);
    ctx.stroke();
  });
  ctx.save();
  ctx.strokeStyle = 'rgba(201, 214, 255, 0.65)';
  ctx.lineWidth = 3;
  const span = ladder.yBottom - ladder.yTop;
  const rungs = Math.max(2, Math.round(span / 20));
  for (let i = 0; i <= rungs; i++) {
    const ry = ladder.yTop + (span * i) / rungs;
    ctx.beginPath();
    ctx.moveTo(ladder.x - railOffset, ry);
    ctx.lineTo(ladder.x + railOffset, ry);
    ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Antagonist ("Warden-9") + goal ("Mira") — big idle vector characters.
 * ------------------------------------------------------------------------ */
function drawAntagonist(ctx, stage, timeMs) {
  const { x, y } = stage.antagonist;
  const bob = Math.sin(timeMs / 420) * 4;
  const armSwing = Math.sin(timeMs / 260) * 22;
  ctx.save();
  ctx.translate(x, y + bob);
  glowFillPath(ctx, COL_BAD, 18, () => {
    ctx.beginPath();
    ctx.roundRect(-34, -96, 68, 76, 10);
    ctx.fill();
  });
  glowFillPath(ctx, COL_BAD, 14, () => {
    ctx.beginPath();
    ctx.arc(0, -112, 24, 0, Math.PI * 2);
    ctx.fill();
  });
  // Eye
  glowFillPath(ctx, COL_WARN, 12, () => {
    ctx.beginPath();
    ctx.arc(0, -114, 7, 0, Math.PI * 2);
    ctx.fill();
  });
  // Arm hurling a barrel
  glowPath(ctx, COL_BAD, 10, () => {
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(30, -70);
    ctx.lineTo(30 + armSwing, -40);
    ctx.stroke();
  });
  ctx.restore();
}

function drawGoal(ctx, stage, timeMs) {
  const { x, y } = stage.goal;
  const bob = Math.sin(timeMs / 500) * 5;
  const wave = Math.sin(timeMs / 220) * 18;
  ctx.save();
  ctx.translate(x, y + bob);
  glowFillPath(ctx, COL_ACCENT2, 16, () => {
    ctx.beginPath();
    ctx.roundRect(-11, -48, 22, 40, 8);
    ctx.fill();
  });
  glowFillPath(ctx, COL_ACCENT2, 14, () => {
    ctx.beginPath();
    ctx.arc(0, -58, 13, 0, Math.PI * 2);
    ctx.fill();
  });
  glowPath(ctx, COL_ACCENT2, 8, () => {
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(11, -40);
    ctx.lineTo(20, -55 + wave);
    ctx.stroke();
  });
  ctx.restore();
  // Beacon ring pulsing above the rescue point.
  const pulse = 0.5 + 0.5 * Math.sin(timeMs / 300);
  glowPath(ctx, COL_ACCENT2, 10, () => {
    ctx.globalAlpha = 0.35 + pulse * 0.3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 78, 10 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
  });
}

/* ------------------------------------------------------------------------ *
 * Items
 * ------------------------------------------------------------------------ */
function drawItem(ctx, item, timeMs) {
  if (item.collected) return;
  const bob = Math.sin(timeMs / 260 + item.x) * 5;
  const y = item.y - PLAYER_H * 0.55 + bob;
  if (item.type === 'hammer') {
    ctx.save();
    ctx.translate(item.x, y);
    ctx.rotate(Math.sin(timeMs / 500) * 0.18);
    glowFillPath(ctx, COL_WARN, 16, () => {
      ctx.beginPath();
      ctx.roundRect(-4, -14, 8, 22, 3);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-13, -22, 26, 13, 4);
      ctx.fill();
    });
    ctx.restore();
  } else {
    glowFillPath(ctx, COL_GOOD, 14, () => {
      ctx.save();
      ctx.translate(item.x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-ITEM_RADIUS * 0.72, -ITEM_RADIUS * 0.72, ITEM_RADIUS * 1.44, ITEM_RADIUS * 1.44);
      ctx.restore();
    });
  }
}

/* ------------------------------------------------------------------------ *
 * Barrels — rolling drums with rotating bands so the roll actually reads.
 * ------------------------------------------------------------------------ */
function drawBarrel(ctx, barrel) {
  const cy = barrel.y - BARREL_RADIUS;
  ctx.save();
  ctx.translate(barrel.x, cy);
  ctx.rotate(barrel.rotation);
  glowFillPath(ctx, COL_WARN, 14, () => {
    ctx.beginPath();
    ctx.arc(0, 0, BARREL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.save();
  ctx.strokeStyle = 'rgba(7, 8, 15, 0.8)';
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * BARREL_RADIUS * 0.2, Math.sin(a) * BARREL_RADIUS * 0.2);
    ctx.lineTo(Math.cos(a) * BARREL_RADIUS, Math.sin(a) * BARREL_RADIUS);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, BARREL_RADIUS * 0.45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Hazard — "Spark Drone": a small hovering orb with a flickering core.
 * ------------------------------------------------------------------------ */
function drawHazard(ctx, hazard, timeMs) {
  const flick = 0.7 + 0.3 * Math.sin(timeMs / 70);
  const cy = hazard.y - HAZARD_RADIUS * 1.6;
  glowFillPath(ctx, COL_ACCENT2, 20 * flick, () => {
    ctx.beginPath();
    ctx.arc(hazard.x, cy, HAZARD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  });
  glowFillPath(ctx, '#fff', 8, () => {
    ctx.beginPath();
    ctx.arc(hazard.x, cy, HAZARD_RADIUS * 0.35, 0, Math.PI * 2);
    ctx.fill();
  });
  // Small support tether down to the platform, purely decorative.
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 107, 203, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hazard.x, cy + HAZARD_RADIUS);
  ctx.lineTo(hazard.x, hazard.y);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Player
 * ------------------------------------------------------------------------ */
function drawPlayer(ctx, player, timeMs) {
  const flashing = player.invulnMs > 0 && Math.floor(timeMs / 90) % 2 === 0;
  if (flashing) return; // brief strobe while invulnerable, same convention as a hit-flash
  const armed = player.hammerMs > 0;
  const color = armed ? COL_WARN : COL_ACCENT;

  ctx.save();
  ctx.translate(player.x, player.y);
  const facing = player.facing >= 0 ? 1 : -1;
  ctx.scale(facing, 1);

  const walking = player.state === 'grounded' && Math.abs(player.vx) > 1;
  const climbing = player.state === 'climbing';
  const cyc = timeMs / (climbing ? 140 : 110);
  const legSwing = (walking || climbing) ? Math.sin(cyc) * 12 : 0;

  glowPath(ctx, color, 12, () => {
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    // Legs
    ctx.beginPath();
    ctx.moveTo(-5, -22);
    ctx.lineTo(-5 + legSwing * 0.5, 0);
    ctx.moveTo(5, -22);
    ctx.lineTo(5 - legSwing * 0.5, 0);
    ctx.stroke();
    // Torso
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, -40);
    ctx.stroke();
    // Arms (one raised holding the hammer when armed)
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.lineTo(-11, -22 + (climbing ? Math.sin(cyc + Math.PI) * 10 : 0));
    ctx.moveTo(0, -36);
    if (armed) ctx.lineTo(14, -46);
    else ctx.lineTo(11, -22 + (climbing ? Math.sin(cyc) * 10 : 0));
    ctx.stroke();
  });
  glowFillPath(ctx, color, 14, () => {
    ctx.beginPath();
    ctx.arc(0, -47, 8.5, 0, Math.PI * 2);
    ctx.fill();
  });
  if (armed) {
    ctx.save();
    ctx.translate(16, -50);
    ctx.rotate(-0.5);
    glowFillPath(ctx, COL_WARN, 14, () => {
      ctx.beginPath();
      ctx.roundRect(-3, -10, 6, 16, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-9, -16, 18, 9, 3);
      ctx.fill();
    });
    ctx.restore();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Top-level frame
 * ------------------------------------------------------------------------ */
export function drawFrame(ctx, view) {
  const { stage, timeMs } = view;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawBackground(ctx, timeMs);

  for (let i = 0; i < stage.levels.length; i++) {
    drawLevel(ctx, stage.levels[i], i === stage.levels.length - 1);
  }
  for (const ladder of stage.ladders) drawLadder(ctx, ladder);

  drawAntagonist(ctx, stage, timeMs);
  drawGoal(ctx, stage, timeMs);

  for (const item of stage.items) drawItem(ctx, item, timeMs);
  if (!stage.hammerItem.collected) drawItem(ctx, stage.hammerItem, timeMs);

  if (view.hazard) drawHazard(ctx, view.hazard, timeMs);
  for (const barrel of view.barrels) drawBarrel(ctx, barrel);

  if (view.player.alive) drawPlayer(ctx, view.player, timeMs);
}

export function debugHitboxRect(ctx, rect, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

export function debugHitboxCircle(ctx, circle, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export { CANVAS_W, CANVAS_H, PLAYER_W };
