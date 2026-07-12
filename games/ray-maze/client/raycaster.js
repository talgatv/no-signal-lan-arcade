/**
 * raycaster.js — a from-scratch DDA (Digital Differential Analysis) raycasting
 * renderer, plus the sprite-billboard projection, hitscan/line-of-sight ray,
 * and top-down minimap. This is the technical core of Ray Maze.
 *
 * ── The algorithm (per screen column) ──────────────────────────────────────
 * The player has a position (px,py) in grid units, a unit facing vector
 * (dirX,dirY), and a camera plane (planeX,planeY) perpendicular to the facing
 * whose half-length = tan(FOV/2). For column x we form a ray:
 *     cameraX = 2*x/W - 1            // -1 = left edge .. +1 = right edge
 *     rayDir  = dir + plane*cameraX  // deliberately NOT normalised
 * then walk the grid one cell boundary at a time (DDA), always advancing to the
 * nearer of the next vertical/horizontal grid line, until the ray enters a
 * solid cell. Because the ray is left un-normalised, the accumulated
 * `sideDist - deltaDist` at the hit is the PERPENDICULAR distance to the wall
 * (its projection onto the camera direction), which is exactly the
 * fisheye-corrected distance — using the raw Euclidean ray length here is the
 * classic bug that bows straight walls outward. Wall slice height = H / dist,
 * so nearer walls are taller. This is the standard, well-documented technique
 * (Lode Vandevenne's tutorial is the canonical reference for the exact math).
 *
 * When the SAME castRay is given a normalised direction (the center ray, or an
 * A->B direction), `dist` comes back as the true Euclidean distance to the
 * first wall — reused directly for hitscan fire and enemy line-of-sight.
 */

/** Field of view. plane half-length = tan(FOV/2). */
export const FOV = (66 * Math.PI) / 180;
export const PLANE_LEN = Math.tan(FOV / 2); // ~0.649 for 66°

/** How far (grid units) walls fade toward the fog color before going dark. */
const VIEW_FADE = 12.5;

/** Wall base colors by cell type (neon-vector palette). */
const WALL_COLORS = {
  1: [64, 214, 255], // cyan structural (--ogh-accent family)
  2: [255, 96, 200], // magenta accent (--ogh-accent-2 family)
  3: [255, 184, 92], // amber tech (--ogh-warn family)
};
/** Distant fog color walls fade into — a hair above pure bg for depth. */
const FOG = [10, 13, 28];

/**
 * Build a per-frame camera basis from the player. Kept as its own function so
 * the sprite pass and the fire/LOS rays share exactly the player's numbers.
 */
export function cameraBasis(player) {
  const dirX = Math.cos(player.dir);
  const dirY = Math.sin(player.dir);
  return {
    dirX,
    dirY,
    planeX: -dirY * PLANE_LEN,
    planeY: dirX * PLANE_LEN,
  };
}

/**
 * Cast a single ray from (px,py) in direction (rdx,rdy) through the grid.
 * Returns the hit cell, which axis-face was hit (side 0 = x/EW, 1 = y/NS),
 * the perpendicular/Euclidean distance, and the fractional wall-x of the hit.
 * `isWall(col,row) -> bool` decides solidity (out-of-bounds should be solid).
 */
export function castRay(px, py, rdx, rdy, isWall, maxSteps = 128) {
  let mapX = Math.floor(px);
  let mapY = Math.floor(py);

  // Distance the ray travels to cross one full cell in x / in y.
  const deltaDistX = rdx === 0 ? Infinity : Math.abs(1 / rdx);
  const deltaDistY = rdy === 0 ? Infinity : Math.abs(1 / rdy);

  let stepX;
  let stepY;
  let sideDistX;
  let sideDistY;
  if (rdx < 0) {
    stepX = -1;
    sideDistX = (px - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1 - px) * deltaDistX;
  }
  if (rdy < 0) {
    stepY = -1;
    sideDistY = (py - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1 - py) * deltaDistY;
  }

  let side = 0;
  let steps = 0;
  while (steps++ < maxSteps) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }
    if (isWall(mapX, mapY)) break;
  }

  // Perpendicular distance (fisheye-corrected for render rays; Euclidean when
  // the input direction is a unit vector, as for fire/LOS).
  const dist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;

  // Fractional position along the hit wall (0..1) — kept for decoration/aim.
  let wallX = side === 0 ? py + dist * rdy : px + dist * rdx;
  wallX -= Math.floor(wallX);

  return { mapX, mapY, side, dist, wallX };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Render the first-person view into `ctx` at the canvas's internal WxH, and
 * fill `zbuffer` (length W) with the per-column perpendicular wall distance for
 * the subsequent sprite-occlusion pass. `pitch` shifts the horizon in pixels
 * for look-up/down. `wallTypeAt(col,row)` returns the cell type integer.
 */
export function renderView(ctx, W, H, player, isWall, wallTypeAt, zbuffer, pitch = 0) {
  const { dirX, dirY, planeX, planeY } = cameraBasis(player);
  const horizon = Math.floor(H / 2 + pitch);

  // ── Floor & ceiling as two vertical gradients meeting at the horizon. ──
  // Ceiling: dark at the very top brightening slightly toward the horizon.
  const ceilTop = Math.max(0, Math.min(H, 0));
  if (horizon > 0) {
    const cg = ctx.createLinearGradient(0, ceilTop, 0, horizon);
    cg.addColorStop(0, '#05060d');
    cg.addColorStop(1, '#0a0d1e');
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, W, horizon);
  }
  if (horizon < H) {
    const fg = ctx.createLinearGradient(0, horizon, 0, H);
    fg.addColorStop(0, '#0c1024');
    fg.addColorStop(1, '#05060d');
    ctx.fillStyle = fg;
    ctx.fillRect(0, horizon, W, H - horizon);
  }
  // Faint horizon glow line for a sense of the ground plane.
  ctx.fillStyle = 'rgba(64,214,255,0.06)';
  ctx.fillRect(0, horizon - 1, W, 2);

  // ── Wall columns. ──
  for (let x = 0; x < W; x++) {
    const cameraX = (2 * x) / W - 1;
    const rdx = dirX + planeX * cameraX;
    const rdy = dirY + planeY * cameraX;
    const hit = castRay(player.x, player.y, rdx, rdy, isWall);
    const dist = Math.max(0.0001, hit.dist);
    zbuffer[x] = dist;

    const lineHeight = H / dist;
    let drawStart = -lineHeight / 2 + horizon;
    let drawEnd = lineHeight / 2 + horizon;
    if (drawStart < 0) drawStart = 0;
    if (drawEnd > H) drawEnd = H;

    const base = WALL_COLORS[wallTypeAt(hit.mapX, hit.mapY)] || WALL_COLORS[1];
    // N/S faces (side 1) rendered darker than E/W faces (side 0): a cheap,
    // standard orientation/depth cue.
    const shade = hit.side === 1 ? 0.6 : 1;
    // Fade toward fog with distance (eased) — bright near, dark far.
    let t = dist / VIEW_FADE;
    if (t > 1) t = 1;
    const fade = t * t * 0.92;
    const r = Math.round(lerp(base[0] * shade, FOG[0], fade));
    const g = Math.round(lerp(base[1] * shade, FOG[1], fade));
    const b = Math.round(lerp(base[2] * shade, FOG[2], fade));
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);

    // Neon rim: a brighter 1px cap at the top of near slices makes walls glow.
    if (dist < 6 && drawStart > 0) {
      ctx.fillStyle = `rgba(${Math.min(255, base[0] + 60)},${Math.min(255, base[1] + 60)},${Math.min(255, base[2] + 60)},${0.5 * (1 - t)})`;
      ctx.fillRect(x, drawStart, 1, 1);
    }
  }
}

/**
 * Project a world-space point (sx,sy) into camera space for billboard sprites.
 * Returns { depth, screenX } where depth>0 means in front of the camera and
 * screenX is the horizontal pixel of the sprite center. Multiply H/depth for
 * on-screen size.
 */
export function projectSprite(player, sx, sy, W) {
  const { dirX, dirY, planeX, planeY } = cameraBasis(player);
  const relX = sx - player.x;
  const relY = sy - player.y;
  const invDet = 1 / (planeX * dirY - dirX * planeY);
  const transformX = invDet * (dirY * relX - dirX * relY);
  const depth = invDet * (-planeY * relX + planeX * relY);
  const screenX = (W / 2) * (1 + transformX / depth);
  return { depth, screenX, transformX };
}

/**
 * Draw a billboarded sprite by invoking `drawShape(ctx, cx, cy, size)` clipped
 * to only the vertical screen columns where it is NOT occluded by a nearer
 * wall (per-column check against the zbuffer). Works for arbitrary vector art,
 * not just textured columns. `sizeScale` widens/narrows relative to height,
 * `vShift` nudges the sprite's vertical center (0=centered on horizon).
 * Returns the sprite's on-screen bounds or null if fully hidden/behind camera.
 */
export function drawSprite(ctx, W, H, zbuffer, player, sprite, drawShape, opts = {}) {
  const { sizeScale = 1, vScale = 1, vShift = 0, pitch = 0 } = opts;
  const p = projectSprite(player, sprite.x, sprite.y, W);
  if (p.depth <= 0.05) return null; // behind camera / on lens

  const horizon = H / 2 + pitch;
  const spriteH = Math.abs(H / p.depth) * vScale;
  const spriteW = spriteH * sizeScale;
  const cx = p.screenX;
  const cy = horizon + vShift * (H / p.depth);

  const startX = Math.floor(cx - spriteW / 2);
  const endX = Math.ceil(cx + spriteW / 2);

  // Build a clip region from the visible (non-occluded) columns.
  const clip = new Path2D();
  let anyVisible = false;
  for (let x = startX; x < endX; x++) {
    if (x < 0 || x >= W) continue;
    if (p.depth < zbuffer[x]) {
      clip.rect(x, 0, 1, H);
      anyVisible = true;
    }
  }
  if (!anyVisible) return null;

  ctx.save();
  ctx.clip(clip);
  drawShape(ctx, cx, cy, spriteH, p.depth);
  ctx.restore();
  return { cx, cy, spriteH, spriteW, depth: p.depth };
}

/**
 * Line-of-sight test: true if no wall lies between (ax,ay) and (bx,by).
 * Casts a unit ray and compares the wall hit distance to the target distance.
 */
export function hasLineOfSight(ax, ay, bx, by, isWall) {
  const dx = bx - ax;
  const dy = by - ay;
  const target = Math.hypot(dx, dy);
  if (target < 1e-4) return true;
  const hit = castRay(ax, ay, dx / target, dy / target, isWall, 256);
  return hit.dist >= target - 0.02;
}

/**
 * Draw the top-down minimap in SCREEN pixels (never mirrored by RTL). Shows
 * walls, the player as a facing triangle, enemies as dots (alerted = red),
 * pickups, and the exit (dim when locked, bright green when open).
 */
export function drawMinimap(ctx, level, player, enemies, exit, exitOpen, health, layout) {
  const { x: ox, y: oy, size } = layout;
  const cell = size / Math.max(level.w, level.h);
  const mw = level.w * cell;
  const mh = level.h * cell;

  ctx.save();
  // Panel backdrop.
  ctx.fillStyle = 'rgba(6,8,16,0.72)';
  ctx.fillRect(ox - 4, oy - 4, mw + 8, mh + 8);
  ctx.strokeStyle = 'rgba(64,214,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - 4, oy - 4, mw + 8, mh + 8);

  // Walls.
  for (let row = 0; row < level.h; row++) {
    for (let col = 0; col < level.w; col++) {
      if (level.cells[row * level.w + col] !== 0) {
        ctx.fillStyle = 'rgba(72,120,170,0.55)';
        ctx.fillRect(ox + col * cell, oy + row * cell, cell + 0.5, cell + 0.5);
      }
    }
  }

  // Health packs.
  ctx.fillStyle = 'rgba(92,255,176,0.9)';
  for (const h of health) {
    if (h.taken) continue;
    ctx.fillRect(ox + h.x * cell - 1.5, oy + h.y * cell - 1.5, 3, 3);
  }

  // Exit marker.
  ctx.fillStyle = exitOpen ? 'rgba(92,255,120,0.95)' : 'rgba(255,184,92,0.55)';
  ctx.fillRect(ox + exit.col * cell, oy + exit.row * cell, cell, cell);

  // Enemies.
  for (const e of enemies) {
    if (!e.alive) continue;
    ctx.fillStyle = e.alerted ? 'rgba(255,92,122,0.95)' : 'rgba(255,150,90,0.7)';
    ctx.beginPath();
    ctx.arc(ox + e.x * cell, oy + e.y * cell, Math.max(1.6, cell * 0.32), 0, Math.PI * 2);
    ctx.fill();
  }

  // Player as a facing triangle.
  const pxp = ox + player.x * cell;
  const pyp = oy + player.y * cell;
  const a = player.dir;
  const r = Math.max(3, cell * 0.55);
  ctx.fillStyle = '#eaf6ff';
  ctx.beginPath();
  ctx.moveTo(pxp + Math.cos(a) * r, pyp + Math.sin(a) * r);
  ctx.lineTo(pxp + Math.cos(a + 2.5) * r * 0.8, pyp + Math.sin(a + 2.5) * r * 0.8);
  ctx.lineTo(pxp + Math.cos(a - 2.5) * r * 0.8, pyp + Math.sin(a - 2.5) * r * 0.8);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
