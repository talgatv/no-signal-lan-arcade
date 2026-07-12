/**
 * track.js — pure data/model layer for Dash Runner: the speed ramp, lane and
 * vertical geometry, obstacle/coin/power-up generation, and all collision
 * math. No canvas/DOM code lives here (see render.js for drawing, game.js
 * for orchestration) so the whole simulation can be driven and inspected
 * headlessly — exactly what the debug hook (window.OGH_DASH_RUNNER in
 * game.js) leans on for automated testing of fairness and the difficulty
 * ramp, mirroring games/cross-the-road/client/road.js's approach.
 *
 * World model
 * -----------
 * The track is an endless line along a single "distance" axis `z` (world
 * units). The player's `state.distance` only ever increases while running;
 * everything else (obstacles, coins, power-ups) sits at a fixed world `z`
 * and is approached as distance grows — `depth = z - distance` is what
 * render.js projects. There are exactly LANES=3 discrete lanes (0=left,
 * 1=mid, 2=right, a fixed physical mapping that never mirrors under RTL —
 * see i18n.js's header comment) and a continuous vertical axis (world
 * height units, 0 = ground).
 *
 * Collision uses one unified interval-overlap test on three independent
 * axes — lane (exact integer match, since both player and obstacles sit on
 * discrete lanes), depth (an interval-vs-interval test using
 * [prevDistance, distance] rather than a single instant, so a thin obstacle
 * can never be tunnelled through between two frames at high speed), and
 * vertical (each obstacle type occupies a fixed [bottom, top] world-height
 * band; the player's own vertical interval changes with state — standing,
 * jumping with real gravity, or ducking). A single `intervalsOverlap` used
 * for both the depth and vertical axes keeps the whole model in one small,
 * directly testable vocabulary (same idiom as road.js's playerBounds /
 * vehicleBounds / intervalsOverlap).
 */

/* ------------------------------------------------------------------------ *
 * Lanes
 * ------------------------------------------------------------------------ */
export const LANES = 3;

/** Discrete lane index -> depth-independent colNorm position in [-1, 1] (render.js only). */
export function laneNorm(lane) {
  return (lane - (LANES - 1) / 2) / ((LANES - 1) / 2);
}

/* ------------------------------------------------------------------------ *
 * Vertical geometry (world height units, ground = 0). Obstacle hitboxes are
 * intentionally a little smaller/tighter than what render.js draws (an
 * arcade-fairness trick, same rationale as cross-the-road's
 * PLAYER_HALF < PLAYER_VISUAL_HALF): a near-clear should look a little
 * closer than it actually was, never the reverse.
 * ------------------------------------------------------------------------ */
export const STAND_BODY_H = 1.6; // standing/jumping player occupies [airY, airY + this]
export const DUCK_TOP = 0.62; // ducking player occupies [0, this]
export const LOW_TOP = 0.55; // 'low' obstacle occupies [0, this] — jump so airY clears this
export const HIGH_BOTTOM = 0.85; // 'high' obstacle occupies [this, HIGH_TOP] — duck (top 0.62) slips under
export const HIGH_TOP = 6.0; // effectively unbounded (well above any reachable jump apex)
export const FULL_TOP = 6.0; // 'full' obstacle occupies [0, this] — spans the whole reachable band

/* ------------------------------------------------------------------------ *
 * Physics / timing tunables
 * ------------------------------------------------------------------------ */
export const GRAVITY = 15; // world units / s^2
export const JUMP_VELOCITY = 6.4; // world units / s — apex = V^2/(2G) ≈ 1.37, flight ≈ 0.85s
export const DUCK_DURATION = 0.75; // seconds — a fixed-length slide/crouch, not a hold
export const LANE_CHANGE_DURATION = 0.16; // seconds — cosmetic tween length AND the input debounce window

/* ------------------------------------------------------------------------ *
 * Speed ramp — a pure function of distance, directly inspectable
 * (speedForDistance(d)) instead of eyeballed, same philosophy as
 * road.js's stageParams(). Ramps linearly from SPEED_START to SPEED_CAP
 * over SPEED_RAMP_DISTANCE world units, then holds at the cap forever
 * after — the run itself is endless; distance 5000 is exactly as fast as
 * distance 500.
 * ------------------------------------------------------------------------ */
export const SPEED_START = 5.0;
export const SPEED_CAP = 11.0;
export const SPEED_RAMP_DISTANCE = 260;

export function speedForDistance(distance) {
  const tt = clamp01(distance / SPEED_RAMP_DISTANCE);
  return SPEED_START + (SPEED_CAP - SPEED_START) * tt;
}

/* ------------------------------------------------------------------------ *
 * Obstacle / coin / power-up generation tunables.
 *
 * Fairness invariants (verified empirically via the debug hook during
 * testing, not just asserted here — see README's "Fairness" section):
 *   1. Every generated segment places an obstacle in AT MOST 2 of the 3
 *      lanes (pickObstacleLaneCount() only ever returns 0, 1, or 2) — at
 *      least one lane is always fully clear at every segment, by
 *      construction, not by chance.
 *   2. Consecutive segments are spaced far enough apart in TIME (not just
 *      world-units — the gap is `gapSeconds * speedForDistance(z)`, so the
 *      floor holds however fast the run gets) that a player forced to
 *      flee a lane blocked by a 'full' obstacle always has time to make a
 *      worst-case 2-lane traversal (edge lane to edge lane) before the
 *      next segment arrives: GAP_SEC_FLOOR[0] must stay comfortably above
 *      LANE_CHANGE_SAFETY_MIN_SEC (2 lane-change tweens + a reaction
 *      buffer). See getFairnessReport() for a direct, checkable readout.
 *   3. The minimum possible gap in world units always stays well above
 *      OBSTACLE_THICKNESS, so two consecutive segments' collision windows
 *      can never overlap and combine into a wider, unintended blockage.
 * ------------------------------------------------------------------------ */
export const OBSTACLE_TYPES = ['low', 'high', 'full'];

export const FIRST_OBSTACLE_Z = 10; // clear warm-up zone before any obstacle
export const OBSTACLE_THICKNESS = 1.0; // world units, collision z-extent
export const COIN_THICKNESS = 0.8;

export const GAP_SEC_START = [2.0, 2.8]; // [min,max] seconds between segments early in a run
export const GAP_SEC_FLOOR = [1.3, 1.8]; // [min,max] seconds between segments at/after the speed cap
export const MIN_GAP_UNITS_FLOOR = 4.0; // defensive world-unit floor, independent of speed

// Two chained lane-change tweens (worst case: edge lane to edge lane) plus a
// reaction/decision buffer — the real minimum time a player needs between
// "sees which lane is safe" and "is standing in it".
export const LANE_CHANGE_SAFETY_MIN_SEC = 2 * LANE_CHANGE_DURATION + 0.5;
if (GAP_SEC_FLOOR[0] <= LANE_CHANGE_SAFETY_MIN_SEC) {
  // Defensive: keep this true by construction. If a future tuning pass
  // shrinks GAP_SEC_FLOOR without noticing, fail loudly in dev rather than
  // silently shipping an unfair worst-case gap.
  throw new Error('track.js: GAP_SEC_FLOOR[0] must exceed LANE_CHANGE_SAFETY_MIN_SEC');
}

export const POWERUP_CHANCE = 0.05; // per breather-eligible segment
export const POWERUP_MIN_GAP = 55; // world units between power-ups
export const INVINCIBLE_DURATION = 5.0; // seconds of "blaze" mode from a power-up

export const COIN_SCORE_VALUE = 5;

export const GEN_AHEAD = 32; // keep obstacles generated this far past the current distance
export const BEHIND_KEEP = 3; // drop objects this far behind the player

const COIN_SPACING = 1.4;

/* ------------------------------------------------------------------------ *
 * Small pure helpers
 * ------------------------------------------------------------------------ */
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function lerp(a, b, tt) { return a + (b - a) * tt; }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function easeOutQuad(x) { return 1 - (1 - x) * (1 - x); }

function shuffledLanes() {
  const a = [0, 1, 2];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * How many of the 3 lanes get an obstacle at this segment: never more than
 * 2 (LANES - 1) — the one genuine fairness guarantee everything else is
 * built on. `tt` is difficulty progress in [0,1] (see speedForDistance).
 */
function pickObstacleLaneCount(tt) {
  const p0 = lerp(0.30, 0.14, tt); // chance of a breather (no obstacle)
  const p2 = lerp(0.16, 0.46, tt); // chance of a 2-lane (hardest) pattern
  const r = Math.random();
  if (r < p0) return 0;
  if (r < p0 + p2) return 2;
  return 1;
}

/* ------------------------------------------------------------------------ *
 * Track state — obstacles/coins/power-ups plus the generation cursor.
 * ------------------------------------------------------------------------ */
export function createTrackState() {
  return {
    genZ: 0,
    obstacles: [], // { id, z, lane, type, hit }
    coins: [], // { id, z, lane, taken }
    powerups: [], // { id, z, lane, taken }
    nextId: 1,
    lastPowerupZ: -Infinity,
  };
}

function gapSecondsFor(tt) {
  const gMin = lerp(GAP_SEC_START[0], GAP_SEC_FLOOR[0], tt);
  const gMax = lerp(GAP_SEC_START[1], GAP_SEC_FLOOR[1], tt);
  return gMin + Math.random() * (gMax - gMin);
}

function placeCoinRun(track, centerZ, lane, count) {
  const startZ = centerZ - ((count - 1) * COIN_SPACING) / 2;
  for (let i = 0; i < count; i++) {
    track.coins.push({ id: track.nextId++, z: startZ + i * COIN_SPACING, lane, taken: false });
  }
}

function maybePlacePowerup(track, z, clearLanes) {
  if (clearLanes.length === 0) return;
  if (z - track.lastPowerupZ < POWERUP_MIN_GAP) return;
  if (Math.random() >= POWERUP_CHANCE) return;
  const lane = pick(clearLanes);
  track.powerups.push({ id: track.nextId++, z, lane, taken: false });
  track.lastPowerupZ = z;
}

/**
 * Materialize segments up to `uptoZ` (no-op once already generated that
 * far). Each segment places an obstacle pattern (0, 1, or 2 lanes — see
 * pickObstacleLaneCount), a rewarding coin run in one of that segment's
 * always-present clear lanes, and occasionally a power-up. The very first
 * stretch [0, FIRST_OBSTACLE_Z) is a guaranteed-clear warm-up with just a
 * friendly coin line down the middle lane, mirroring road.js's always-safe
 * starting platform.
 */
export function generateAhead(track, uptoZ) {
  if (track.genZ === 0 && uptoZ > 0) {
    placeCoinRun(track, FIRST_OBSTACLE_Z * 0.5, 1, 5);
    track.genZ = FIRST_OBSTACLE_Z;
  }
  while (track.genZ < uptoZ) {
    const z = track.genZ;
    const tt = clamp01(z / SPEED_RAMP_DISTANCE);
    const n = pickObstacleLaneCount(tt);
    const lanesAll = shuffledLanes();
    const obstacleLanes = lanesAll.slice(0, n);
    const clearLanes = lanesAll.slice(n);

    for (const lane of obstacleLanes) {
      track.obstacles.push({
        id: track.nextId++, z, lane, type: pick(OBSTACLE_TYPES), hit: false,
      });
    }

    const coinLane = clearLanes.length ? pick(clearLanes) : lanesAll[0];
    placeCoinRun(track, z, coinLane, 3 + ((Math.random() * 3) | 0));
    maybePlacePowerup(track, z, clearLanes);

    const gap = Math.max(MIN_GAP_UNITS_FLOOR, gapSecondsFor(tt) * speedForDistance(z));
    track.genZ = z + gap;
  }
}

/** Drop objects behind the player so an endless run has bounded memory. */
export function pruneBehind(track, distance) {
  const keepFrom = distance - BEHIND_KEEP;
  track.obstacles = track.obstacles.filter((o) => o.z + OBSTACLE_THICKNESS / 2 >= keepFrom);
  track.coins = track.coins.filter((c) => !c.taken && c.z + COIN_THICKNESS / 2 >= keepFrom);
  track.powerups = track.powerups.filter((p) => !p.taken && p.z + COIN_THICKNESS / 2 >= keepFrom);
}

/* ------------------------------------------------------------------------ *
 * Player state
 * ------------------------------------------------------------------------ */
export function createPlayer() {
  return {
    lane: 1,
    visualLane: 1,
    laneFrom: 1,
    laneAnimT: null,
    airY: 0,
    vy: 0,
    isJumping: false,
    isDucking: false,
    duckTimer: 0,
    invincibleTimer: 0,
    alive: true,
  };
}

export function canChangeLane(player) { return player.laneAnimT === null; }

/** Instant logical lane update (collision-relevant immediately, same
 *  "instant logical move + cosmetic tween" precedent as road.js/game.js's
 *  beginMove) — returns false if already at the lane 0/2 edge. */
export function startLaneChange(player, dir) {
  const target = player.lane + dir;
  if (target < 0 || target >= LANES) return false;
  player.laneFrom = player.lane;
  player.lane = target;
  player.laneAnimT = 0;
  return true;
}

export function updateLaneAnim(player, dt) {
  if (player.laneAnimT === null) return;
  player.laneAnimT += dt;
  const f = Math.min(1, player.laneAnimT / LANE_CHANGE_DURATION);
  const fe = easeOutQuad(f);
  player.visualLane = lerp(player.laneFrom, player.lane, fe);
  if (f >= 1) {
    player.visualLane = player.lane;
    player.laneAnimT = null;
  }
}

export function canJump(player) {
  return !player.isJumping && !player.isDucking && player.airY === 0;
}

export function startJump(player) {
  if (!canJump(player)) return false;
  player.isJumping = true;
  player.vy = JUMP_VELOCITY;
  return true;
}

export function canDuck(player) {
  return !player.isJumping && !player.isDucking && player.airY === 0;
}

export function startDuck(player) {
  if (!canDuck(player)) return false;
  player.isDucking = true;
  player.duckTimer = DUCK_DURATION;
  return true;
}

/** Integrate real gravity for a jump-in-progress and count down an
 *  in-progress duck. Returns { landed } so the caller can trigger a
 *  landing cue exactly once. */
export function updatePlayerPhysics(player, dt) {
  let landed = false;
  if (player.isJumping) {
    player.vy -= GRAVITY * dt;
    player.airY += player.vy * dt;
    if (player.airY <= 0) {
      player.airY = 0;
      player.vy = 0;
      player.isJumping = false;
      landed = true;
    }
  }
  if (player.isDucking) {
    player.duckTimer -= dt;
    if (player.duckTimer <= 0) {
      player.duckTimer = 0;
      player.isDucking = false;
    }
  }
  if (player.invincibleTimer > 0) {
    player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);
  }
  return { landed };
}

/* ------------------------------------------------------------------------ *
 * Collision math — plain interval overlap on three independent axes (lane,
 * depth, vertical), exposed in a directly checkable shape rather than
 * something a test harness has to reverse-engineer.
 * ------------------------------------------------------------------------ */
export function intervalsOverlap(aMin, aMax, bMin, bMax) {
  return aMin < bMax && bMin < aMax;
}

export function playerVerticalInterval(player) {
  if (player.isDucking) return [0, DUCK_TOP];
  const bottom = player.airY || 0;
  return [bottom, bottom + STAND_BODY_H];
}

export function obstacleVerticalInterval(type) {
  if (type === 'low') return [0, LOW_TOP];
  if (type === 'high') return [HIGH_BOTTOM, HIGH_TOP];
  return [0, FULL_TOP]; // 'full'
}

function depthOverlap(prevZ, curZ, objZ, thickness) {
  const half = thickness / 2;
  return intervalsOverlap(prevZ, curZ, objZ - half, objZ + half);
}

/** The first obstacle currently overlapping the player on all three axes,
 *  or null. `state` needs `.distance`, `.prevDistance`, `.player`,
 *  `.track`. */
export function findObstacleHit(state) {
  const p = state.player;
  const [aMin, aMax] = playerVerticalInterval(p);
  for (const ob of state.track.obstacles) {
    if (ob.hit) continue;
    if (ob.lane !== p.lane) continue;
    if (!depthOverlap(state.prevDistance, state.distance, ob.z, OBSTACLE_THICKNESS)) continue;
    const [bMin, bMax] = obstacleVerticalInterval(ob.type);
    if (intervalsOverlap(aMin, aMax, bMin, bMax)) return ob;
  }
  return null;
}

/** Coins/power-ups collected this frame (lane + depth only — generous on
 *  purpose, vertical state never blocks a pickup). Mutates `.taken`. */
export function collectPickups(state) {
  const p = state.player;
  const coins = [];
  for (const c of state.track.coins) {
    if (c.taken) continue;
    if (c.lane !== p.lane) continue;
    if (!depthOverlap(state.prevDistance, state.distance, c.z, COIN_THICKNESS)) continue;
    c.taken = true;
    coins.push(c);
  }
  let powerup = null;
  for (const pu of state.track.powerups) {
    if (pu.taken) continue;
    if (pu.lane !== p.lane) continue;
    if (!depthOverlap(state.prevDistance, state.distance, pu.z, COIN_THICKNESS)) continue;
    pu.taken = true;
    powerup = pu;
    break;
  }
  return { coins, powerup };
}

/**
 * Direct fairness readout for a generated stretch of track: scans
 * `track.obstacles` in z-order and, for every consecutive pair of
 * obstacle-bearing segments, checks whether every lane survivable in the
 * first (clear, or resolvable via jump/duck) can reach a survivable lane
 * in the second within the time available. Used by the debug hook /
 * automated testing — see README's "Fairness" section — not by normal
 * gameplay.
 */
export function getFairnessReport(track) {
  const byZ = new Map();
  for (const o of track.obstacles) {
    if (!byZ.has(o.z)) byZ.set(o.z, []);
    byZ.get(o.z).push(o);
  }
  const zs = [...byZ.keys()].sort((a, b) => a - b);
  const segments = zs.map((z) => {
    const obs = byZ.get(z);
    const blockedLanes = new Set(obs.filter((o) => o.type === 'full').map((o) => o.lane));
    const occupiedLanes = new Set(obs.map((o) => o.lane));
    const fullyClear = [0, 1, 2].filter((l) => !occupiedLanes.has(l));
    // "resolvable" = survivable with the correct action (clear, or has a
    // low/high obstacle that jump/duck defeats without moving).
    const resolvable = [0, 1, 2].filter((l) => !blockedLanes.has(l));
    return { z, obs, blockedLanes, fullyClear, resolvable };
  });

  const problems = [];
  let allLanesBlockedCount = 0;
  for (const seg of segments) {
    if (seg.resolvable.length === 0) allLanesBlockedCount++;
  }
  for (let i = 0; i < segments.length - 1; i++) {
    const a = segments[i];
    const b = segments[i + 1];
    const timeAvail = (b.z - a.z) / speedForDistance(a.z);
    for (const lane of a.resolvable) {
      if (b.resolvable.includes(lane)) continue; // no move needed
      const steps = Math.min(...b.resolvable.map((l) => Math.abs(l - lane)));
      const needed = steps * LANE_CHANGE_DURATION + 0.5;
      if (needed > timeAvail) {
        problems.push({
          fromZ: a.z, toZ: b.z, fromLane: lane, steps, timeAvail, needed,
        });
      }
    }
  }
  return {
    segmentCount: segments.length,
    allLanesBlockedCount, // must always be 0
    unreachableCount: problems.length, // must always be 0
    problems,
  };
}
