/**
 * entities.js — pure simulation: player movement/jump/ladder-climb, barrel
 * roll-and-fall physics, patrol hazard, pickups, collision. No DOM/canvas/
 * audio (same split as games/fight-arena's combat.js) — every entity is
 * advanced in fixed 1/60s steps in plain stages.js world-space, so a test
 * harness (Node or the browser debug hook) can drive and inspect it frame by
 * frame directly, and so the physics is deterministic regardless of display
 * refresh rate.
 *
 * BARREL PHYSICS — the core mechanic:
 *   - While `rolling`, a barrel's y is *derived* from the current platform's
 *     slope at its x (same `lerpY` every other entity uses), so it visibly
 *     follows the girder's tilt, not a scripted path.
 *   - Reaching the edge of its segment (a world wall OR the lip of a gap)
 *     drops it into `falling`: gravity takes over, x is held (see the "no
 *     horizontal drift" note below `startBarrelFalling`), and it lands on
 *     whichever platform is directly below — which may be one level down or,
 *     over a wide gap, several.
 *   - While rolling, crossing the x of a ladder that leads down from its
 *     current level rolls a per-stage chance to divert into `laddering`
 *     (a controlled descent down that exact ladder) instead of continuing to
 *     the segment edge — the "occasional ladder" variety called for by the
 *     genre.
 *   - Landing (from a fall OR a ladder) re-derives the roll direction from
 *     the new platform's own slope sign, so the zigzag is a natural
 *     consequence of alternating girder tilts, not a hardcoded reversal.
 *
 * JUMP-OVER — no invulnerability flag: the player's hitbox and a barrel's
 * hitbox are plain rect/circle shapes checked every frame regardless of
 * state. A well-timed jump avoids a hit because the player's *actual* y is
 * above the barrel's top for the moments their x-ranges overlap — genuinely
 * simulated, not scripted.
 */
import {
  PLAT_LEFT, PLAT_RIGHT, CANVAS_H, TOP_LEVEL,
  clamp, lerpY, findSegmentAt, surfaceYAt, slopeDirOf, findSupportBelow,
} from './stages.js';

export const FIXED_DT = 1 / 60;

export const WALK_SPEED = 140;
export const CLIMB_SPEED = 130;
export const JUMP_VEL = 580;
export const GRAVITY = 1250;
export const AIR_ACCEL = 900;
export const AIR_SPEED_CAP = WALK_SPEED * 1.15;
export const LADDER_HOP_VEL = JUMP_VEL * 0.55;
export const LADDER_HOP_SPEED = WALK_SPEED * 0.7;

export const PLAYER_W = 22;
export const PLAYER_H = 50;
export const BARREL_RADIUS = 13;
export const HAZARD_RADIUS = 14;
export const ITEM_RADIUS = 16;

export const LADDER_GRAB_RANGE = 22;
export const LADDER_FALL_SPEED = 110;
export const CLIMB_RUNG_PX = 24;

export const HAMMER_DURATION_MS = 7000;
export const INVULN_MS = 1300;
export const LIVES_START = 3;

/* ------------------------------------------------------------------------ *
 * Player
 * ------------------------------------------------------------------------ */
export function createPlayer(stage) {
  const x = stage.playerStartX;
  return {
    x,
    y: surfaceYAt(stage.levels[0], x),
    levelIndex: 0,
    fromLevel: 0,
    state: 'grounded', // 'grounded' | 'airborne' | 'climbing'
    facing: 1,
    vx: 0,
    vy: 0,
    onLadder: null,
    climbDistAcc: 0,
    hammerMs: 0,
    invulnMs: 0,
    _prevJumpHeld: false,
    alive: true,
  };
}

export function resetPlayerToStage(player, stage) {
  player.x = stage.playerStartX;
  player.y = surfaceYAt(stage.levels[0], player.x);
  player.levelIndex = 0;
  player.fromLevel = 0;
  player.state = 'grounded';
  player.vx = 0;
  player.vy = 0;
  player.onLadder = null;
  player.climbDistAcc = 0;
  player.invulnMs = 0;
  player._prevJumpHeld = false;
  player.alive = true;
  // hammerMs deliberately preserved across an in-stage respawn is NOT done —
  // a life lost always clears the power-up, same as classic genre behavior.
  player.hammerMs = 0;
}

export function playerHitbox(player) {
  return {
    x: player.x - PLAYER_W / 2, y: player.y - PLAYER_H, w: PLAYER_W, h: PLAYER_H,
  };
}

export function isPlayerVulnerable(player) {
  return player.alive && player.invulnMs <= 0;
}

function findLadderUp(stage, levelIndex, x) {
  for (const l of stage.ladders) {
    if (l.levelBottom === levelIndex && Math.abs(l.x - x) <= LADDER_GRAB_RANGE) return l;
  }
  return null;
}

function findLadderDown(stage, levelIndex, x) {
  for (const l of stage.ladders) {
    if (l.levelTop === levelIndex && Math.abs(l.x - x) <= LADDER_GRAB_RANGE) return l;
  }
  return null;
}

function takeoff(player, dir, events) {
  player.state = 'airborne';
  player.fromLevel = player.levelIndex;
  player.vy = -JUMP_VEL;
  player.vx = dir !== 0 ? dir * WALK_SPEED : 0;
  events.push({ type: 'jump' });
}

function hopOffLadder(player, events) {
  const ladder = player.onLadder;
  const nearerTop = (player.y - ladder.yTop) <= (ladder.yBottom - player.y);
  player.state = 'airborne';
  player.fromLevel = nearerTop ? ladder.levelTop : ladder.levelBottom;
  player.vy = -LADDER_HOP_VEL;
  player.vx = player.facing * LADDER_HOP_SPEED;
  player.onLadder = null;
  events.push({ type: 'jump' });
}

function enterClimb(player, ladder, atBottom) {
  player.state = 'climbing';
  player.onLadder = ladder;
  player.x = ladder.x;
  player.y = atBottom ? ladder.yBottom : ladder.yTop;
  player.vx = 0;
  player.vy = 0;
  player.climbDistAcc = 0;
}

function stepGrounded(player, stage, input, events) {
  const level = stage.levels[player.levelIndex];
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) player.facing = dir;

  if (input.up) {
    const ladder = findLadderUp(stage, player.levelIndex, player.x);
    if (ladder) { enterClimb(player, ladder, true); return; }
  }
  if (input.down) {
    const ladder = findLadderDown(stage, player.levelIndex, player.x);
    if (ladder) { enterClimb(player, ladder, false); return; }
  }

  if (input.jumpEdge) { takeoff(player, dir, events); return; }

  player.vx = 0;
  if (dir === 0) return;

  const proposed = clamp(player.x + dir * WALK_SPEED * FIXED_DT, PLAT_LEFT, PLAT_RIGHT);
  const seg = findSegmentAt(level, proposed);
  if (seg) {
    player.x = proposed;
    player.y = lerpY(seg, proposed);
  } else {
    // Walked past the lip of an inner gap (world edges are a hard wall — see
    // the clamp above — so this only fires over a genuine mid-platform gap).
    player.state = 'airborne';
    player.fromLevel = player.levelIndex;
    player.x = proposed;
    player.vx = dir * WALK_SPEED;
    player.vy = 0;
  }
}

function stepClimbing(player, stage, input, events) {
  if (input.jumpEdge) { hopOffLadder(player, events); return; }
  const ladder = player.onLadder;
  let dy = 0;
  if (input.up) dy = -CLIMB_SPEED * FIXED_DT;
  else if (input.down) dy = CLIMB_SPEED * FIXED_DT;
  if (dy === 0) return;

  const newY = clamp(player.y + dy, ladder.yTop, ladder.yBottom);
  player.y = newY;
  player.climbDistAcc += Math.abs(dy);
  if (player.climbDistAcc >= CLIMB_RUNG_PX) {
    player.climbDistAcc = 0;
    events.push({ type: 'climbStep' });
  }

  if (dy < 0 && newY <= ladder.yTop + 0.01) {
    player.state = 'grounded';
    player.levelIndex = ladder.levelTop;
    player.onLadder = null;
  } else if (dy > 0 && newY >= ladder.yBottom - 0.01) {
    player.state = 'grounded';
    player.levelIndex = ladder.levelBottom;
    player.onLadder = null;
  }
}

function stepAirborne(player, stage, input, events) {
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) {
    player.vx = clamp(player.vx + dir * AIR_ACCEL * FIXED_DT, -AIR_SPEED_CAP, AIR_SPEED_CAP);
  }
  player.vy += GRAVITY * FIXED_DT;
  const prevY = player.y;
  player.x = clamp(player.x + player.vx * FIXED_DT, PLAT_LEFT, PLAT_RIGHT);
  player.y += player.vy * FIXED_DT;

  const support = findSupportBelow(stage.levels, player.fromLevel + 1, player.x);
  if (support && player.vy >= 0 && prevY <= support.y + 0.01 && player.y >= support.y) {
    player.y = support.y;
    player.vx = 0;
    player.vy = 0;
    player.levelIndex = support.levelIndex;
    player.state = 'grounded';
    events.push({ type: 'land' });
    return;
  }

  // Defensive safety net only — ground (level 0) is always solid full-width
  // by construction, so a valid stage never actually reaches this branch.
  if (player.y > CANVAS_H + 120) {
    player.levelIndex = 0;
    player.x = clamp(player.x, PLAT_LEFT, PLAT_RIGHT);
    player.y = surfaceYAt(stage.levels[0], player.x);
    player.vx = 0;
    player.vy = 0;
    player.state = 'grounded';
    events.push({ type: 'land' });
  }
}

/**
 * Advance the player one fixed step. `input` = {left,right,up,down,jump}
 * (held booleans); the jump rising-edge is derived internally.
 */
export function stepPlayer(player, stage, input, events) {
  if (!player.alive) return;
  if (player.invulnMs > 0) player.invulnMs = Math.max(0, player.invulnMs - FIXED_DT * 1000);
  if (player.hammerMs > 0) player.hammerMs = Math.max(0, player.hammerMs - FIXED_DT * 1000);

  const jumpEdge = !!input.jump && !player._prevJumpHeld;
  player._prevJumpHeld = !!input.jump;
  const full = { ...input, jumpEdge };

  if (player.state === 'climbing') stepClimbing(player, stage, full, events);
  else if (player.state === 'airborne') stepAirborne(player, stage, full, events);
  else stepGrounded(player, stage, full, events);
}

/* ------------------------------------------------------------------------ *
 * Barrels
 * ------------------------------------------------------------------------ */
let barrelSeq = 1;

export function spawnBarrel(stage, params) {
  return {
    id: barrelSeq++,
    x: stage.antagonist.x,
    y: stage.antagonist.y,
    levelIndex: TOP_LEVEL,
    fromLevel: TOP_LEVEL,
    dir: Math.random() < 0.5 ? -1 : 1,
    vy: 0,
    state: 'falling', // launched off the top deck, drops onto level TOP_LEVEL-1
    ladder: null,
    speed: params.barrelSpeed,
    ladderFallChance: params.ladderFallChance,
    dead: false,
    jumpCredited: false,
    rotation: 0,
  };
}

function startBarrelFalling(barrel, events) {
  barrel.state = 'falling';
  barrel.fromLevel = barrel.levelIndex;
  // Deliberately no horizontal drift while falling: a barrel always leaves a
  // segment exactly at that segment's own edge (a world wall or a gap lip),
  // so it should drop essentially straight down onto whatever is below that
  // same x — carrying roll speed into the fall would occasionally overshoot
  // the platform below right at the world's outer edges. Caught by the Node
  // physics harness before this ever reached the browser.
  barrel.vy = 0;
  events.push({ type: 'barrelDrop', x: barrel.x });
}

function stepBarrelRolling(barrel, stage, events) {
  const level = stage.levels[barrel.levelIndex];
  const seg = findSegmentAt(level, barrel.x);
  if (!seg) { startBarrelFalling(barrel, events); return; }

  for (const ladder of stage.ladders) {
    if (ladder.levelTop !== barrel.levelIndex) continue; // only ladders leading DOWN from here
    const nextX = barrel.x + barrel.dir * barrel.speed * FIXED_DT;
    const crossed = (barrel.x - ladder.x) * (nextX - ladder.x) <= 0;
    if (crossed && Math.random() < barrel.ladderFallChance) {
      barrel.state = 'laddering';
      barrel.ladder = ladder;
      barrel.x = ladder.x;
      barrel.y = ladder.yTop;
      events.push({ type: 'barrelLadder', x: ladder.x });
      return;
    }
  }

  const proposed = barrel.x + barrel.dir * barrel.speed * FIXED_DT;
  const segAtProposed = (proposed >= PLAT_LEFT && proposed <= PLAT_RIGHT) ? findSegmentAt(level, proposed) : null;
  barrel.rotation += (barrel.dir * barrel.speed * FIXED_DT) / BARREL_RADIUS;
  if (segAtProposed) {
    barrel.x = proposed;
    barrel.y = lerpY(segAtProposed, proposed);
  } else {
    barrel.x = clamp(proposed, seg.x1, seg.x2);
    startBarrelFalling(barrel, events);
  }
}

function stepBarrelFalling(barrel, stage, events) {
  barrel.vy += GRAVITY * FIXED_DT;
  const prevY = barrel.y;
  barrel.y += barrel.vy * FIXED_DT;

  // Search STRICTLY below fromLevel (unlike the player's airborne search,
  // which intentionally includes fromLevel — see stepAirborne — to allow
  // landing back on the same level after an upward jump arc). A barrel never
  // arcs upward first: it starts falling with vy=0 sitting exactly on its
  // fromLevel's own surface at that x (the segment edge or gap lip it just
  // left), so an inclusive search would immediately "land" it back on the
  // level it just departed on frame one. Caught by the Node physics harness
  // as a stuck-barrel bug before this ever ran in a browser.
  const support = findSupportBelow(stage.levels, barrel.fromLevel, barrel.x);
  if (support && prevY <= support.y + 0.01 && barrel.y >= support.y) {
    barrel.y = support.y;
    barrel.vy = 0;
    barrel.levelIndex = support.levelIndex;
    const seg = findSegmentAt(stage.levels[support.levelIndex], barrel.x);
    const slope = seg ? slopeDirOf(seg) : 0;
    if (slope !== 0) barrel.dir = slope;
    barrel.state = 'rolling';
  }
}

function stepBarrelLaddering(barrel, stage, events) {
  const ladder = barrel.ladder;
  barrel.y += LADDER_FALL_SPEED * FIXED_DT;
  barrel.rotation += (LADDER_FALL_SPEED * FIXED_DT) / BARREL_RADIUS;
  if (barrel.y >= ladder.yBottom) {
    barrel.y = ladder.yBottom;
    barrel.levelIndex = ladder.levelBottom;
    const seg = findSegmentAt(stage.levels[ladder.levelBottom], barrel.x);
    const slope = seg ? slopeDirOf(seg) : 0;
    if (slope !== 0) barrel.dir = slope;
    barrel.state = 'rolling';
    barrel.ladder = null;
  }
}

export function stepBarrel(barrel, stage, events) {
  if (barrel.dead) return;
  if (barrel.state === 'rolling') stepBarrelRolling(barrel, stage, events);
  else if (barrel.state === 'falling') stepBarrelFalling(barrel, stage, events);
  else if (barrel.state === 'laddering') stepBarrelLaddering(barrel, stage, events);

  if (barrel.x < PLAT_LEFT - 40 || barrel.x > PLAT_RIGHT + 40) barrel.dead = true;
  if (barrel.y > CANVAS_H + 80) barrel.dead = true;
  // A barrel that rolls all the way onto the ground (level 0) despawns
  // shortly after leaving the world's horizontal bounds there — handled by
  // the bounds check above once it rolls off either end of the ground.
}

export function barrelHitbox(barrel) {
  return { x: barrel.x, y: barrel.y - BARREL_RADIUS, r: BARREL_RADIUS };
}

/* ------------------------------------------------------------------------ *
 * Patrol hazard ("Spark Drone")
 * ------------------------------------------------------------------------ */
export function createHazard(stage, params) {
  const level = stage.levels[stage.hazardLevel];
  const seg = level.reduce((a, b) => ((b.x2 - b.x1) > (a.x2 - a.x1) ? b : a), level[0]);
  const x1 = seg.x1 + 14;
  const x2 = seg.x2 - 14;
  return {
    levelIndex: stage.hazardLevel,
    x1,
    x2,
    x: x1,
    y: lerpY(seg, x1),
    dir: 1,
    speed: params.hazardSpeed,
  };
}

export function stepHazard(hazard, stage) {
  const level = stage.levels[hazard.levelIndex];
  let proposed = hazard.x + hazard.dir * hazard.speed * FIXED_DT;
  if (proposed >= hazard.x2) { proposed = hazard.x2; hazard.dir = -1; }
  else if (proposed <= hazard.x1) { proposed = hazard.x1; hazard.dir = 1; }
  const seg = findSegmentAt(level, proposed);
  hazard.x = proposed;
  hazard.y = seg ? lerpY(seg, proposed) : hazard.y;
}

export function hazardHitbox(hazard) {
  return { x: hazard.x, y: hazard.y - HAZARD_RADIUS, r: HAZARD_RADIUS };
}

/* ------------------------------------------------------------------------ *
 * Collision primitives
 * ------------------------------------------------------------------------ */
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Circle {x,y,r} vs axis-aligned rect {x,y,w,h}. */
export function circleRectOverlap(c, rect) {
  const nx = clamp(c.x, rect.x, rect.x + rect.w);
  const ny = clamp(c.y, rect.y, rect.y + rect.h);
  const dx = c.x - nx;
  const dy = c.y - ny;
  return (dx * dx + dy * dy) <= c.r * c.r;
}

/** True if a barrel's x-range crosses a player's x-range (used for the
 * jump-over score bonus, independent of whether they actually collide). */
export function xRangesOverlap(barrel, player) {
  const pb = playerHitbox(player);
  return (barrel.x + BARREL_RADIUS) > pb.x && (barrel.x - BARREL_RADIUS) < pb.x + pb.w;
}
