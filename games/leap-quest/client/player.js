/**
 * Leap Quest — player physics.
 *
 * A momentum-based platformer body: gravity-driven jumping with real
 * variable height (a quick tap of JUMP is a short hop, holding it is a full
 * leap), acceleration/deceleration on the ground and reduced control in the
 * air, plus the game's one extra movement ability — the WALL-JUMP.
 *
 * Variable jump: a jump launches at -JUMP_V. If the jump input is released
 * while still rising, the remaining upward velocity is cut to JUMP_CUT of
 * itself (once), so releasing early caps the apex. Tuned so a tap peaks near
 * ~1.1 tiles and a full hold near ~3.0 tiles (constants below).
 *
 * Wall-jump: while airborne and pressed into a wall, the body wall-SLIDES
 * (fall speed clamped to WALL_SLIDE_MAX). Pressing JUMP then kicks off the
 * wall — up and away — with a short WALL_JUMP_LOCK during which player
 * horizontal input is ignored so the push actually clears the wall. Alternate
 * off two close walls to climb a shaft indefinitely (see levels.js "The
 * Ascent", where this is the only way up). Small coyote/buffer/wall-coyote
 * windows make the whole thing forgiving.
 *
 * Collision is classic axis-separated AABB against the level's solid tile
 * grid, plus a one-way (land-on-top-only) test against moving platforms, which
 * also carry a standing rider. The body is < 1 tile in both dimensions, so a
 * simple push-out to the offending tile face is exact.
 */

import { TILE } from './levels.js';

export const CONFIG = {
  W: 26,
  H: 34,
  GRAVITY: 2100,
  MAX_FALL: 980,
  JUMP_V: 720, // apex ~= 720^2 / (2*2100) = 123px ~= 3.08 tiles
  JUMP_CUT: 0.6, // release-early apex ~= (0.6*720)^2/(2*2100) = 44px ~= 1.1 tiles
  RUN_MAX: 250,
  RUN_ACCEL: 1900,
  AIR_ACCEL: 1300,
  GROUND_FRICTION: 2100,
  AIR_FRICTION: 520,
  COYOTE: 0.09,
  JUMP_BUFFER: 0.11,
  WALL_SLIDE_MAX: 130,
  WALL_JUMP_VY: -690,
  WALL_JUMP_VX: 320,
  WALL_JUMP_LOCK: 0.16,
  WALL_COYOTE: 0.09,
  STOMP_BOUNCE: -560,
  RESPAWN_INVULN: 1.4,
  HIT_INVULN: 1.2,
};

export function makePlayer() {
  return {
    x: 0, y: 0,
    w: CONFIG.W, h: CONFIG.H,
    vx: 0, vy: 0,
    grounded: false,
    facing: 1,
    wallDir: 0, // -1 wall on left, +1 wall on right, 0 none
    wallSliding: false,
    coyote: 0,
    wallCoyote: 0,
    wallCoyoteDir: 0,
    jumpBuffer: 0,
    jumpCutAvailable: false,
    wallJumpLock: 0,
    powered: false,
    invuln: 0,
    onMover: null,
    runPhase: 0,
    squash: 0, // visual squash-and-stretch pulse (0..1), decays
  };
}

export function resetPlayer(p, spawn, { keepPower = false } = {}) {
  p.x = spawn.x - p.w / 2;
  p.y = spawn.y - p.h;
  p.vx = 0; p.vy = 0;
  p.grounded = false;
  p.facing = 1;
  p.wallDir = 0;
  p.wallSliding = false;
  p.coyote = 0;
  p.wallCoyote = 0;
  p.wallCoyoteDir = 0;
  p.jumpBuffer = 0;
  p.jumpCutAvailable = false;
  p.wallJumpLock = 0;
  p.invuln = 0; // a fresh spawn has no leftover i-frames; respawnInLevel sets them after
  if (!keepPower) p.powered = false;
  p.onMover = null;
  p.runPhase = 0;
  p.squash = 0;
}

/* ---- tile-grid collision helpers -------------------------------------- */
function anySolid(level, x, y, w, h) {
  const c0 = Math.floor(x / TILE);
  const c1 = Math.floor((x + w - 0.001) / TILE);
  const r0 = Math.floor(y / TILE);
  const r1 = Math.floor((y + h - 0.001) / TILE);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (level.solid(c, r)) return true;
    }
  }
  return false;
}

function collideX(p, level) {
  if (!anySolid(level, p.x, p.y, p.w, p.h)) return 0;
  if (p.vx > 0) {
    // moving right → snap to the left face of the offending column
    const col = Math.floor((p.x + p.w - 0.001) / TILE);
    p.x = col * TILE - p.w;
    p.vx = 0;
    return 1;
  }
  if (p.vx < 0) {
    const col = Math.floor(p.x / TILE);
    p.x = (col + 1) * TILE;
    p.vx = 0;
    return -1;
  }
  return 0;
}

function collideY(p, level) {
  if (!anySolid(level, p.x, p.y, p.w, p.h)) return 0;
  if (p.vy > 0) {
    const row = Math.floor((p.y + p.h - 0.001) / TILE);
    p.y = row * TILE - p.h;
    p.vy = 0;
    return 1; // landed
  }
  if (p.vy < 0) {
    const row = Math.floor(p.y / TILE);
    p.y = (row + 1) * TILE;
    p.vy = 0;
    return -1; // bonked head
  }
  return 0;
}

// Probe for an adjacent wall (used for wall-slide / wall-jump). Checks the
// column just outside each vertical face, over the player's mid-body height.
function probeWall(p, level) {
  const yTop = p.y + 4;
  const yBot = p.y + p.h - 4;
  const r0 = Math.floor(yTop / TILE);
  const r1 = Math.floor(yBot / TILE);
  const leftCol = Math.floor((p.x - 2) / TILE);
  const rightCol = Math.floor((p.x + p.w + 2) / TILE);
  let left = false;
  let right = false;
  for (let r = r0; r <= r1; r++) {
    if (level.solid(leftCol, r)) left = true;
    if (level.solid(rightCol, r)) right = true;
  }
  if (left && !right) return -1;
  if (right && !left) return 1;
  if (left && right) return 0; // wedged (won't happen in a >=2-wide shaft)
  return 0;
}

// One-way moving platforms: catch the player only when falling onto the top.
function collideMovers(p, prevBottom, movers) {
  for (const m of movers) {
    const top = m.y;
    const overlapX = p.x + p.w > m.x + 2 && p.x < m.x + m.w - 2;
    if (!overlapX) continue;
    const bottom = p.y + p.h;
    if (p.vy >= 0 && prevBottom <= top + 6 && bottom >= top) {
      p.y = top - p.h;
      p.vy = 0;
      return m;
    }
  }
  return null;
}

/**
 * Advance the player one step.
 * @param input {left, right, jump (held), jumpPressed (edge — consumed here)}
 * @param hooks {onJump, onWallJump, onLand}
 */
export function stepPlayer(p, input, dt, level, movers, hooks = {}) {
  const C = CONFIG;

  // Carry by the mover ridden last frame (movers are advanced before this).
  if (p.onMover) {
    p.x += p.onMover.x - p.onMover.prevX;
    p.y += p.onMover.y - p.onMover.prevY;
  }

  // Timers
  p.coyote = Math.max(0, p.coyote - dt);
  p.wallCoyote = Math.max(0, p.wallCoyote - dt);
  p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
  p.wallJumpLock = Math.max(0, p.wallJumpLock - dt);
  if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
  if (p.squash > 0) p.squash = Math.max(0, p.squash - dt * 4);

  if (input.jumpPressed) {
    p.jumpBuffer = C.JUMP_BUFFER;
    input.jumpPressed = false;
  }

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  // Horizontal accel / friction (skipped while the wall-jump push is locked)
  if (p.wallJumpLock <= 0) {
    if (dir !== 0) {
      const accel = p.grounded ? C.RUN_ACCEL : C.AIR_ACCEL;
      p.vx += dir * accel * dt;
      if (Math.abs(p.vx) > C.RUN_MAX && Math.sign(p.vx) === dir) p.vx = dir * C.RUN_MAX;
      p.facing = dir;
    } else {
      const fr = (p.grounded ? C.GROUND_FRICTION : C.AIR_FRICTION) * dt;
      if (Math.abs(p.vx) <= fr) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * fr;
    }
  }

  // Wall slide (uses last frame's wallDir; refreshed after X collision)
  p.wallSliding = false;
  if (!p.grounded && p.wallDir !== 0 && p.vy > 0 && dir === p.wallDir) {
    p.wallSliding = true;
  }

  // Gravity
  p.vy += C.GRAVITY * dt;
  if (p.wallSliding && p.vy > C.WALL_SLIDE_MAX) p.vy = C.WALL_SLIDE_MAX;
  if (p.vy > C.MAX_FALL) p.vy = C.MAX_FALL;

  // Variable-jump cut on release
  if (!input.jump && p.jumpCutAvailable && p.vy < 0) {
    p.vy *= C.JUMP_CUT;
    p.jumpCutAvailable = false;
  }
  if (p.vy >= 0) p.jumpCutAvailable = false;

  // Jump (buffered): prefer a ground jump, else a wall-jump
  if (p.jumpBuffer > 0) {
    const canGround = p.grounded || p.coyote > 0;
    const canWall = !p.grounded && (p.wallDir !== 0 || p.wallCoyote > 0);
    if (canGround) {
      p.vy = -C.JUMP_V;
      p.grounded = false;
      p.onMover = null;
      p.coyote = 0;
      p.jumpBuffer = 0;
      p.jumpCutAvailable = true;
      p.squash = 1;
      if (hooks.onJump) hooks.onJump();
    } else if (canWall) {
      const wd = p.wallDir !== 0 ? p.wallDir : p.wallCoyoteDir;
      const away = -wd;
      p.vy = C.WALL_JUMP_VY;
      p.vx = away * C.WALL_JUMP_VX;
      p.facing = away;
      p.wallJumpLock = C.WALL_JUMP_LOCK;
      p.wallSliding = false;
      p.wallCoyote = 0;
      p.jumpBuffer = 0;
      p.jumpCutAvailable = true;
      p.squash = 1;
      if (hooks.onWallJump) hooks.onWallJump();
    }
  }

  const prevBottom = p.y + p.h;

  // Integrate + collide, axis-separated
  p.x += p.vx * dt;
  collideX(p, level);

  const wasGrounded = p.grounded;
  p.grounded = false;
  p.y += p.vy * dt;
  const landed = collideY(p, level) === 1;
  p.onMover = null;
  if (landed) {
    p.grounded = true;
  } else {
    const m = collideMovers(p, prevBottom, movers);
    if (m) {
      p.grounded = true;
      p.onMover = m;
    }
  }

  if (p.grounded && !wasGrounded && hooks.onLand) hooks.onLand();

  // Refresh wall contact for next frame's slide/jump decision
  p.wallDir = p.grounded ? 0 : probeWall(p, level);

  // Coyote windows
  if (p.grounded) p.coyote = C.COYOTE;
  if (!p.grounded && p.wallDir !== 0) {
    p.wallCoyote = C.WALL_COYOTE;
    p.wallCoyoteDir = p.wallDir;
  }

  // Run animation phase
  if (p.grounded && Math.abs(p.vx) > 12) p.runPhase += Math.abs(p.vx) * dt * 0.05;
  else p.runPhase = 0;
}
