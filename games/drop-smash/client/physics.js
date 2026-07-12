/**
 * Drop Smash — physics engine (pure, DOM-free, canvas-free).
 *
 * Same discipline as games/siege-break/client/physics.js and
 * games/billiards/client/physics.js: nothing here touches the DOM or a
 * canvas, everything works directly in the pixel units game.js draws with
 * (no camera/scroll), so the whole simulation is directly steppable and
 * inspectable from a headless harness (see window.OGH_DROP_SMASH in
 * game.js) instead of only observable through the rendered scene.
 *
 * Bodies are simple: balls are circles with mass, platforms are static
 * axis-aligned rectangles with hit points. No rotation/torque anywhere (the
 * spec explicitly doesn't need siege-break's oriented-box rigid-body
 * solver) — three things happen instead:
 *
 *  1. Ball vs. platform: closest-point circle-vs-AABB test (the axis-aligned
 *     specialization of siege-break's collideCircleBox). An unresolved hit's
 *     approach speed times the ball's mass is its "impact momentum" — the
 *     single number that drives BOTH whether a platform cracks/breaks AND
 *     how hard the ball bounces. A heavier or faster ball has proportionally
 *     higher impact momentum, so it damages/breaks more per hit — see
 *     DAMAGE_MIN_IMPACT/DAMAGE_SCALE below and games/drop-smash/tower.js's
 *     module doc comment for how material hp tiers are calibrated against
 *     this number. A platform that doesn't break reflects the ball (normal
 *     component reversed and scaled by LAYER_RESTITUTION, tangential
 *     component lightly damped) instead of stopping it dead. A platform that
 *     breaks lets the ball keep falling through it (a small flat velocity
 *     retention — BREAKTHROUGH_RETAIN — models the energy spent shattering
 *     it, so a ball that breaks through many layers in one drop does
 *     gradually slow down).
 *  2. Ball vs. ball: textbook unequal-mass elastic-ish impulse (the general
 *     form games/billiards/client/physics.js's equal-mass swap is a special
 *     case of — see resolveBallCollision's doc comment for the derivation),
 *     restitution < 1 so it isn't a perfect swap. Positional correction
 *     splits by inverse mass so a heavy ball shoves a light one aside rather
 *     than the two of them symmetrically un-overlapping.
 *  3. Ball vs. side walls: simple axis-flip bounce (this play field is a
 *     rectangle, so the wall normal is always purely horizontal) — keeps
 *     every ball on-screen; the only way out of the simulation is straight
 *     down through EXIT_Y (tower.js), matching the spec's "come to rest or
 *     exit the bottom".
 *
 * Fixed sub-stepping (SUBSTEPS) avoids tunneling through a PLATFORM_H-thick
 * slab at the highest reachable ball speeds — same tunneling-safety rationale
 * as games/billiards/client/physics.js's module doc comment.
 */

import { PLAY_LEFT, PLAY_RIGHT, EXIT_Y } from './tower.js';

// --- World constants ---------------------------------------------------

/** Downward acceleration, px/s^2 (y is DOWN, matching every other canvas
 * game in this hub). Tuned so a ball crosses one row's empty gap in a
 * fraction of a second — a readable, punchy fall, not a slow drift. */
export const GRAVITY = 1700;

/** Ball-vs-platform bounce: a real "some energy lost every bounce" value,
 * not near-1 (which would look like it never loses energy) or near-0 (which
 * would look like it just stops dead — explicitly disallowed by the spec). */
export const LAYER_RESTITUTION = 0.42;
/** Sideways (tangential) velocity is lightly damped on every layer bounce
 * too, so a ball skidding along a platform edge settles instead of sliding
 * forever. */
export const TANGENT_DAMP = 0.86;
/** Ball-vs-ball restitution: < 1 ("elastic-ish", the spec's own phrase) —
 * see games/billiards/client/physics.js for the e=1 exact-swap special case
 * this generalizes from. */
export const BALL_RESTITUTION = 0.78;
/** Side-wall bounce. */
export const WALL_RESTITUTION = 0.55;
/** Flat velocity-retention fraction applied when a ball breaks through a
 * platform — models the energy spent shattering it, so a ball that chains
 * several breaks in one drop measurably slows down (deep penetration has a
 * real cost) without needing a separate energy-accounting system. */
export const BREAKTHROUGH_RETAIN = 0.88;

/** Impact momentum (ball.mass * approachSpeed) below this deals no damage
 * at all — so a ball barely grazing a platform on its way past doesn't chip
 * it; this is what makes a pure "bounce" (as opposed to "crack") event
 * possible. */
export const DAMAGE_MIN_IMPACT = 150;
/** hp removed per unit of impact momentum above the threshold. Kept at 1.0
 * so platform hp (tower.js) and impact momentum live on the same, directly
 * comparable numeric scale — "this platform's hp is roughly what a hit of
 * this momentum deals" is legible by inspection, not a hidden conversion. */
export const DAMAGE_SCALE = 1.0;

/** Below these a ball's residual motion is numerical jitter, not real
 * settling motion — snap it to a hard rest instead of leaving a
 * never-quite-zero micro-bounce. Same snap-to-rest idea as
 * games/siege-break/client/physics.js's REST_LINEAR. */
const REST_LINEAR = 6; // px/s
const REST_HOLD = 0.32; // s of calm before "resting" latches

const MAX_SPEED = 4200; // px/s safety clamp

/** Fixed sub-steps per stepWorld(dt) call. At the fastest ball speed this
 * game can produce (a heavy ball deep in a tall tower, comfortably under
 * ~1800px/s) a substep here moves it well under one platform thickness
 * (34px), so a hard hit is always caught the substep it starts rather than
 * tunneling through — same reasoning as games/billiards/client/physics.js. */
const SUBSTEPS = 6;
/** Resolution passes per substep, over the SAME positions — lets an impulse
 * from a simultaneous ball-ball + ball-platform contact propagate within one
 * substep instead of only one contact "deep" per frame. Cheap: at most 3
 * balls and a couple dozen platforms. */
const COLLISION_ITERATIONS = 3;

// --- Weight tiers --------------------------------------------------------

/** mass: relative units (also the primary damage multiplier, since impact
 * momentum = mass * approachSpeed). r: render/collision radius, px. vy0: the
 * ball's initial downward speed at the moment it's released — a heavier ball
 * is dropped with more initial force, not just released to fall from zero,
 * per the spec's "affects the ball's mass/initial velocity". color: local
 * neon hex (own palette, not a shared token, same convention as
 * games/siege-break's per-material colors). */
export const WEIGHTS = {
  light: { mass: 1.0, r: 15, vy0: 60, color: '#5ce1ff' },
  medium: { mass: 1.8, r: 18, vy0: 150, color: '#ffd166' },
  heavy: { mass: 3.0, r: 22, vy0: 250, color: '#ff6a3d' },
};

// --- Bodies --------------------------------------------------------------

let _idCounter = 1;
export function _resetIds() { _idCounter = 1; } // deterministic test runs

export function createBall(opts) {
  const { x, y, tier = 'medium', vx = 0 } = opts;
  const w = WEIGHTS[tier] || WEIGHTS.medium;
  return {
    id: _idCounter++,
    tier,
    x, y,
    vx,
    vy: w.vy0,
    r: w.r,
    mass: w.mass,
    color: w.color,
    resting: false,
    exited: false,
    restTimer: 0,
    maxYReached: y,
    bounceFlash: 0,
  };
}

export function createWorld(tower) {
  return {
    tower,
    balls: [],
    bounds: { left: PLAY_LEFT, right: PLAY_RIGHT, exitY: EXIT_Y },
  };
}

export function addBall(world, ball) { world.balls.push(ball); return ball; }

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// --- Ball vs. platform -----------------------------------------------------

/** Closest-point circle-vs-AABB manifold. Returns {nx,ny,sep} (nx,ny is the
 * outward normal from the platform surface toward the ball center; sep < 0
 * means penetrating) or null if not overlapping. Axis-aligned specialization
 * of games/siege-break/client/physics.js's collideCircleBox (no rotation to
 * account for here, platforms never turn). */
function collideBallPlatform(ball, plat) {
  const px = clamp(ball.x, plat.x0, plat.x1);
  const py = clamp(ball.y, plat.y0, plat.y1);
  const dx = ball.x - px, dy = ball.y - py;
  const distSq = dx * dx + dy * dy;
  if (distSq > ball.r * ball.r) return null;
  if (distSq > 1e-8) {
    const dist = Math.sqrt(distSq);
    return { nx: dx / dist, ny: dy / dist, sep: dist - ball.r };
  }
  // Degenerate: the ball's center is already inside the rect (a large jump
  // within one substep) — push out toward the nearest face rather than
  // leaving the normal undefined.
  const dLeft = ball.x - plat.x0, dRight = plat.x1 - ball.x;
  const dTop = ball.y - plat.y0, dBottom = plat.y1 - ball.y;
  const m = Math.min(dLeft, dRight, dTop, dBottom);
  let nx = 0, ny = 0;
  if (m === dLeft) nx = -1; else if (m === dRight) nx = 1; else if (m === dTop) ny = -1; else ny = 1;
  return { nx, ny, sep: -(m + ball.r) };
}

/** Resolve one ball's collision against every still-standing platform.
 * Pushes a 'bounce' | 'crack' | 'break' event for each contact that actually
 * did something (separating contacts are silently skipped). */
function resolveBallPlatforms(ball, platforms, events) {
  if (ball.exited) return;
  for (const plat of platforms) {
    if (plat.broken) continue; // no collision at all — this is "falls through"
    const c = collideBallPlatform(ball, plat);
    if (!c) continue;
    const { nx, ny, sep } = c;
    const approachSpeed = -(ball.vx * nx + ball.vy * ny);
    if (approachSpeed <= 0) continue; // already separating this tick

    // Positional correction: push the ball fully out (platform is static).
    const pen = -sep;
    if (pen > 0) { ball.x += nx * pen; ball.y += ny * pen; }

    const impactMomentum = ball.mass * approachSpeed;
    const damage = Math.max(0, impactMomentum - DAMAGE_MIN_IMPACT) * DAMAGE_SCALE;

    if (damage <= 0) {
      // Too soft to even mark the platform — a plain bounce, full
      // restitution reflection below still applies.
      events.push({ type: 'bounce', x: ball.x, y: plat.y0, plat, speed: approachSpeed });
    } else {
      plat.hp -= damage;
      plat.damageFlash = 1;
      if (plat.hp <= 0) {
        plat.broken = true;
        plat.hp = 0;
        events.push({ type: 'break', x: (plat.x0 + plat.x1) / 2, y: (plat.y0 + plat.y1) / 2, plat, speed: approachSpeed });
        // Passes through: keep going, lightly damped (energy spent breaking
        // it), no bounce reflection.
        ball.vx *= BREAKTHROUGH_RETAIN;
        ball.vy *= BREAKTHROUGH_RETAIN;
        continue;
      }
      events.push({ type: 'crack', x: (plat.x0 + plat.x1) / 2, y: (plat.y0 + plat.y1) / 2, plat, speed: approachSpeed, hpFrac: plat.hp / plat.maxHp });
    }

    // Bounce: reflect the normal component (scaled by restitution, energy
    // lost) and lightly damp the tangential component.
    const vDotN = ball.vx * nx + ball.vy * ny;
    const tx = -ny, ty = nx;
    const vt = ball.vx * tx + ball.vy * ty;
    const newNormalSpeed = -vDotN * LAYER_RESTITUTION; // vDotN<0 (approaching) -> positive (outward)
    ball.vx = tx * vt * TANGENT_DAMP + nx * newNormalSpeed;
    ball.vy = ty * vt * TANGENT_DAMP + ny * newNormalSpeed;
    ball.bounceFlash = 1;
  }
}

// --- Ball vs. ball -----------------------------------------------------------

/**
 * Unequal-mass elastic-ish collision. Derivation (n = unit normal A->B,
 * vRelN = (vB-vA).n before impact, restitution e):
 *   post-impact vRelN must equal -e * vRelN(before)
 *   => impulse J = -(1+e) * vRelN / (invMassA + invMassB)
 *   vA -= J*n*invMassA ; vB += J*n*invMassB
 * At equal masses this reduces exactly to games/billiards/client/physics.js's
 * `impulse = (1+e)*(bn-an)/2` normal-component swap — same formula, this is
 * just its general unequal-mass form. Position correction is split by
 * inverse mass (a heavy ball barely moves to un-overlap a light one it
 * shoved into) rather than billiards' even 50/50 split (which only makes
 * sense because every billiards ball is the same mass).
 */
function resolveBallCollision(a, b, events) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.r + b.r;
  if (dist >= minDist) return;
  let nx, ny;
  if (dist > 1e-6) { nx = dx / dist; ny = dy / dist; } else { nx = 1; ny = 0; }

  const invA = 1 / a.mass, invB = 1 / b.mass;
  const totalInv = invA + invB;
  const overlap = minDist - dist;
  a.x -= nx * overlap * (invA / totalInv);
  a.y -= ny * overlap * (invA / totalInv);
  b.x += nx * overlap * (invB / totalInv);
  b.y += ny * overlap * (invB / totalInv);

  const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
  const velAlongNormal = rvx * nx + rvy * ny;
  if (velAlongNormal >= 0) return; // separating already

  const j = (-(1 + BALL_RESTITUTION) * velAlongNormal) / totalInv;
  a.vx -= j * nx * invA; a.vy -= j * ny * invA;
  b.vx += j * nx * invB; b.vy += j * ny * invB;
  a.bounceFlash = 1; b.bounceFlash = 1;
  events.push({ type: 'ballHit', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, speed: Math.abs(velAlongNormal) });
}

// --- Walls -----------------------------------------------------------------

function resolveWalls(ball, bounds, events) {
  if (ball.x - ball.r < bounds.left) {
    ball.x = bounds.left + ball.r;
    if (ball.vx < 0) { ball.vx = -ball.vx * WALL_RESTITUTION; events.push({ type: 'wall', x: ball.x, y: ball.y }); }
  } else if (ball.x + ball.r > bounds.right) {
    ball.x = bounds.right - ball.r;
    if (ball.vx > 0) { ball.vx = -ball.vx * WALL_RESTITUTION; events.push({ type: 'wall', x: ball.x, y: ball.y }); }
  }
}

// --- Step --------------------------------------------------------------------

/**
 * Advance the world by dt seconds (fixed sub-stepping internally). Returns a
 * flat array of events from every substep:
 *   {type:'bounce'|'crack'|'break', x,y, plat, speed[, hpFrac]}
 *   {type:'ballHit', x,y, speed}   {type:'wall', x,y}   {type:'exit', ball}
 * game.js reacts to these for sfx/particles/screen-shake/HUD; nothing about
 * scoring or rendering happens in here.
 */
export function stepWorld(world, dt) {
  const events = [];
  const subDt = dt / SUBSTEPS;
  const platforms = world.tower.platforms;

  for (let s = 0; s < SUBSTEPS; s++) {
    for (const ball of world.balls) {
      if (ball.exited) continue;
      if (!ball.resting) ball.vy += GRAVITY * subDt;
      const sp = Math.hypot(ball.vx, ball.vy);
      if (sp > MAX_SPEED) { const k = MAX_SPEED / sp; ball.vx *= k; ball.vy *= k; }
      ball.x += ball.vx * subDt;
      ball.y += ball.vy * subDt;
    }

    for (let iter = 0; iter < COLLISION_ITERATIONS; iter++) {
      for (const ball of world.balls) {
        if (ball.exited) continue;
        resolveBallPlatforms(ball, platforms, events);
        resolveWalls(ball, world.bounds, events);
      }
      for (let i = 0; i < world.balls.length; i++) {
        const a = world.balls[i];
        if (a.exited) continue;
        for (let j = i + 1; j < world.balls.length; j++) {
          const b = world.balls[j];
          if (b.exited) continue;
          resolveBallCollision(a, b, events);
        }
      }
    }

    for (const ball of world.balls) {
      if (ball.exited) continue;
      if (ball.y > ball.maxYReached) ball.maxYReached = ball.y;

      if (ball.y - ball.r > world.bounds.exitY) {
        ball.exited = true;
        ball.resting = false;
        events.push({ type: 'exit', ball });
        continue;
      }

      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed < REST_LINEAR) {
        ball.restTimer += subDt;
        if (ball.restTimer > REST_HOLD) { ball.vx = 0; ball.vy = 0; ball.resting = true; }
      } else {
        ball.restTimer = 0;
        ball.resting = false;
      }
    }
  }

  for (const plat of platforms) {
    if (plat.damageFlash > 0) plat.damageFlash = Math.max(0, plat.damageFlash - dt * 3);
  }
  for (const ball of world.balls) {
    if (ball.bounceFlash > 0) ball.bounceFlash = Math.max(0, ball.bounceFlash - dt * 4);
  }

  return events;
}

/** True once every ball is either resting or has exited the bottom — the
 * signal game.js uses to end the drop and show results. */
export function allSettled(world) {
  return world.balls.every((b) => b.exited || b.resting);
}

/** Largest live-ball speed — used for a "hard cap this drop" safety timeout
 * alongside allSettled, same convention as games/siege-break's maxMotion. */
export function maxBallSpeed(world) {
  let m = 0;
  for (const b of world.balls) {
    if (b.exited) continue;
    m = Math.max(m, Math.hypot(b.vx, b.vy));
  }
  return m;
}
