/**
 * Sled Lines — rider physics (pure, DOM-free, canvas-free).
 *
 * This is the heart of the toy: a small jointed rigid body (a sled + a rider
 * figure) simulated with **Verlet integration and iterative distance
 * constraints** — the same well-documented technique the whole
 * "draw-a-line, physics-ride-it" genre is built on (Line Rider is the
 * classic reference point; the rig and code here are original, not a port of
 * anyone's specific implementation). Kept pure (numbers only, no DOM/canvas)
 * so the whole simulation is directly steppable and inspectable from a
 * headless test harness — see `window.OGH_SLED_LINES` in game.js, same
 * discipline as games/siege-break's physics.js ("validated head-less with
 * Node before any UI existed").
 *
 * --- Verlet integration, in one paragraph -----------------------------------
 * Each point stores only its CURRENT position (x,y) and PREVIOUS position
 * (px,py) — no explicit velocity field. Velocity is implicit: it's just
 * `(x - px)` each tick. To integrate, we carry that implied velocity forward
 * and add gravity: `x' = x + (x - px)*damping`, `y' = y + (y - py)*damping +
 * g*dt*dt`, then `px,py` become the OLD `x,y`. This is unconditionally
 * stable for the tiny fixed timestep used here (no explicit velocity to blow
 * up) and makes collision response trivial: just move a point's position and
 * its next-tick velocity is automatically whatever that move implies — see
 * `resolveCollisions` below.
 *
 * --- Distance constraints ---------------------------------------------------
 * The rider's 7 points are linked by 8 fixed-length "rods" (see REST_POSE /
 * CONSTRAINT_PAIRS). Each tick, every rod is relaxed a few times: measure the
 * live distance between its two points, and move each point half the error
 * back toward the rod's rest length. A handful of these relaxation passes
 * per tick (SOLVER_ITERATIONS) is enough for the whole rig to converge back
 * into a rigid shape even after a hard collision shoves one point — no
 * matrix solve, no explicit rotational/angular state anywhere. This is
 * exactly Thomas Jakobsen's "Advanced Character Physics" technique (the
 * paper this entire genre traces back to), applied to an original 7-point
 * sled+rider rig instead of any specific existing game's skeleton.
 *
 * --- The rig ------------------------------------------------------------
 * nose/tail/hip form a rigid triangle (the sled + seat). shoulder braces to
 * both hip (spine) and nose (chest), so the torso stays locked upright
 * relative to the sled rather than flopping like a pendulum. head, handF and
 * handB each hang off the shoulder with a SINGLE constraint and nothing
 * else — deliberately underbraced, so they swing/flail under gravity and
 * collisions like a loose limb, giving the rider some ragdoll character for
 * free without any extra code (a generic Verlet-ragdoll trick, not content
 * copied from anywhere).
 *
 * --- Track collision ---------------------------------------------------
 * Every drawn line is a polyline; every consecutive pair of points in it is
 * a solid SEGMENT (unless the line is scenery, which every point passes
 * through untouched). Each rider point is tested against every solid
 * segment as a point-vs-capsule test (closest point on the segment, within
 * POINT_RADIUS): if it's overlapping, push the point out along the segment
 * normal (a plain positional correction — Verlet turns that directly into a
 * velocity change next tick, no impulse math needed) and, once per tick,
 * damp the point's along-segment (tangential) implied velocity to model
 * sliding friction while fully zeroing the into-surface (normal) component
 * so contacts don't bounce. This is the standard, simple "collide and
 * slide" approach for point-vs-segment in a Verlet system.
 */

// --- Tuning -------------------------------------------------------------
export const CONFIG = {
  GRAVITY: 1500, // px/s^2, y-down
  AIR_DAMPING: 0.9995, // tiny per-tick loss so numerical error can't add energy
  SOLVER_ITERATIONS: 6, // constraint+collision relaxation passes per sub-step
  // A fast-falling point can travel further in one 1/120s tick than the
  // collision capture zone is wide (2*POINT_RADIUS), letting it tunnel clean
  // through a line between one integrate() and the next — confirmed
  // empirically (a ~1400px drop, an entirely plausible hand-drawn cliff, hit
  // ~17px/tick against a 12px zone and passed straight through). Verlet
  // integration substeps cleanly (each substep is just a smaller, ordinary
  // step — no separate velocity state to reconcile), so splitting every tick
  // into SUBSTEPS smaller integrate+relax passes catches the crossing
  // without needing full swept/continuous collision detection.
  SUBSTEPS: 4,
  POINT_RADIUS: 6, // collision "thickness" of a rider point, px
  CONTACT_FRICTION: 0.1, // fraction of tangential (along-surface) speed shed per ORIGINAL (1/120s) tick while touching a solid line — see applyFriction, which converts this to an equivalent per-substep rate
  MAX_SPEED: 3000, // px/s safety clamp per point (guards against pathological blow-ups)

  // Crash thresholds — kept modest on purpose (this toy is about drawing and
  // watching, not "winning"): only a genuinely hard hit or a long unbroken
  // fall counts.
  // px/s of into-surface speed on a core point (nose/tail/hip) = a crash.
  // Calibrated empirically (not from idealized sqrt(2*g*h) kinematics, which
  // reads ~10-15% high vs. what the discrete simulation actually measures at
  // first contact): 1200 corresponds to roughly a 580px unbroken vertical
  // fall onto flat ground before crashing — reachable within one drawn
  // screen, comfortably above any ordinary landing or slope-sliding speed.
  HARD_IMPACT_SPEED: 1200,
  FALL_TIMEOUT_S: 2.2, // seconds with no rider point touching any solid line = crash ("fell")
  FALL_DISTANCE_MAX: 4200, // px below spawn = crash regardless of timer (safety backstop)

  // Bonus features (see README) — off unless a game.js line type asks for them.
  ACCEL_BOOST: 620, // px/s added along an accelerator line's direction
  ACCEL_COOLDOWN_S: 0.15, // per rider, min gap between accelerator triggers

  // Bonus "flipped over" crash — see checkFlip(). Requires the triangle to
  // have inverted past a real margin (not just be momentarily thin during a
  // tight turn) for a short sustained time, so ordinary hard cornering never
  // false-triggers it.
  FLIP_AREA_MARGIN: 90, // signed-area units the hip must be past the wrong side of nose-tail
  FLIP_SUSTAIN_S: 0.15,
};

// --- The rig: a sled (nose/tail/hip) + a rider figure hung off the hip -----
// Local offsets (px) from the rider's origin, y-up-negative like canvas
// space, authored so this pose is ALREADY relaxed (every constraint below is
// exactly satisfied at these coordinates) — spawning here means zero pop/
// jitter on the very first frame.
export const REST_POSE = {
  nose: { x: 24, y: 0 }, // front ski tip — direction of travel
  tail: { x: -24, y: 0 }, // back ski tip
  hip: { x: 0, y: -16 }, // seat — also the rider figure's hip
  shoulder: { x: 5, y: -36 },
  head: { x: 8, y: -49 },
  handF: { x: 21, y: -30 }, // front hand/pole — unconstrained past the shoulder (flails)
  handB: { x: -15, y: -27 }, // back hand/pole — unconstrained past the shoulder (flails)
};

export const POINT_KEYS = Object.keys(REST_POSE);

/** Core structural points (the sled + torso) — used for hard-impact crash
 * detection. Limbs/head are deliberately excluded: they're meant to flail
 * and bump without ending the ride. */
export const CORE_KEYS = ['nose', 'tail', 'hip'];

const CONSTRAINT_PAIRS = [
  ['nose', 'tail'], // sled runner
  ['nose', 'hip'], // sled front strut
  ['tail', 'hip'], // sled back strut
  ['hip', 'shoulder'], // spine
  ['nose', 'shoulder'], // chest brace (keeps the torso from pendulum-flopping)
  ['shoulder', 'head'], // neck
  ['shoulder', 'handF'], // front arm
  ['shoulder', 'handB'], // back arm
];

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// --- Rider lifecycle ------------------------------------------------------

/**
 * Build a rider. Rest lengths are DERIVED from REST_POSE so the rig geometry
 * only needs to be authored once, in one place.
 */
export function createRider(spawnX, spawnY) {
  const points = {};
  for (const key of POINT_KEYS) points[key] = { x: 0, y: 0, px: 0, py: 0 };
  const constraints = CONSTRAINT_PAIRS.map(([aKey, bKey]) => {
    const a = REST_POSE[aKey], b = REST_POSE[bKey];
    return { aKey, bKey, a: points[aKey], b: points[bKey], rest: dist(a.x, a.y, b.x, b.y) };
  });
  const rider = {
    points,
    constraints,
    spawn: { x: spawnX, y: spawnY },
    airborneTime: 0,
    crashed: false,
    crashReason: null, // 'impact' | 'fell' | 'flip'
    grounded: false,
    accelCooldown: 0,
    initialFlipSign: 0,
  };
  resetRider(rider, spawnX, spawnY);
  return rider;
}

/** Reset an existing rider IN PLACE (never reassigned) so a reference held
 * elsewhere (game.js, a debug hook) stays valid across replays — same
 * precedent as games/hill-rider's resetVehicle(). */
export function resetRider(rider, spawnX, spawnY) {
  rider.spawn.x = spawnX;
  rider.spawn.y = spawnY;
  for (const key of POINT_KEYS) {
    const off = REST_POSE[key];
    const p = rider.points[key];
    p.x = spawnX + off.x;
    p.y = spawnY + off.y;
    p.px = p.x;
    p.py = p.y;
  }
  rider.airborneTime = 0;
  rider.crashed = false;
  rider.crashReason = null;
  rider.grounded = false;
  rider.accelCooldown = 0;
  rider.initialFlipSign = flipSign(rider);
  return rider;
}

// --- Verlet integration -----------------------------------------------------

function integrate(p, dt, damp, cfg) {
  const vx = (p.x - p.px) * damp;
  const vy = (p.y - p.py) * damp;
  p.px = p.x;
  p.py = p.y;
  p.x += vx;
  p.y += vy + cfg.GRAVITY * dt * dt;
}

// --- Distance constraints ---------------------------------------------------

function satisfyConstraint(c) {
  const a = c.a, b = c.b;
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1e-6;
  const diff = (d - c.rest) / d;
  const offX = dx * 0.5 * diff, offY = dy * 0.5 * diff;
  a.x += offX; a.y += offY;
  b.x -= offX; b.y -= offY;
}

// --- Track collision (point vs. line-segment "collide and slide") ----------

function isSolid(line) { return line.type === 'track'; }
function isBoost(line) { return line.type === 'accel'; }

/** Closest-point-on-segment push-out test. Returns null if the point (at
 * `radius`) doesn't overlap the segment, else {pen, nx, ny}. */
function segmentPush(p, a, b, radius) {
  const abx = b.x - a.x, aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-9) return null; // degenerate zero-length segment
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  t = clamp(t, 0, 1);
  const cx = a.x + abx * t, cy = a.y + aby * t;
  const dx = p.x - cx, dy = p.y - cy;
  const d = Math.hypot(dx, dy);
  if (d >= radius) return null;
  let nx, ny;
  if (d > 1e-6) {
    nx = dx / d; ny = dy / d;
  } else {
    // Point sits essentially ON the line: pick the push-out side from the
    // PREVIOUS position instead of the (undefined) current one, so a point
    // resting exactly on a line doesn't jitter between sides frame to frame.
    const pdx = p.px - cx, pdy = p.py - cy;
    const pd = Math.hypot(pdx, pdy);
    if (pd > 1e-6) { nx = pdx / pd; ny = pdy / pd; }
    else { const l = Math.sqrt(len2); nx = -aby / l; ny = abx / l; }
  }
  return { pen: radius - d, nx, ny };
}

/** One relaxation pass: push every rider point out of every solid segment it
 * overlaps. Returns a map of pointKey -> last contact normal this pass (used
 * for the once-per-tick friction pass and for crash/airborne bookkeeping). */
function resolveCollisions(rider, lines, cfg, firstPass, impactOut, dt) {
  const hits = {};
  for (const key of POINT_KEYS) {
    const p = rider.points[key];
    for (const line of lines) {
      if (!isSolid(line)) continue;
      const pts = line.pts;
      for (let i = 0; i < pts.length - 1; i++) {
        const hit = segmentPush(p, pts[i], pts[i + 1], cfg.POINT_RADIUS);
        if (!hit) continue;
        // Hard-impact reading: only sampled on the FIRST pass of the tick
        // (freshest "as the collision is first discovered" velocity — later
        // passes have already partly corrected the point, so their reading
        // would understate the true impact speed). `p.x - p.px` is a PER-TICK
        // displacement (dt seconds' worth), so divide by dt to get px/s —
        // comparable to the px/s HARD_IMPACT_SPEED threshold.
        if (firstPass && CORE_KEYS.includes(key)) {
          const vx = p.x - p.px, vy = p.y - p.py;
          const vIntoSurface = -(vx * hit.nx + vy * hit.ny) / dt;
          if (vIntoSurface > impactOut.speed) impactOut.speed = vIntoSurface;
        }
        p.x += hit.nx * hit.pen;
        p.y += hit.ny * hit.pen;
        hits[key] = hit;
      }
    }
  }
  return hits;
}

/** Once per tick: damp tangential (along-surface) implied velocity for every
 * point that ended this tick's relaxation in contact, and fully zero the
 * normal (into-surface) component so contacts never bounce. Applied via
 * `px,py` (Verlet's implicit-velocity trick), not a separate velocity field. */
function applyFriction(rider, hits, cfg) {
  // CONTACT_FRICTION is authored as "fraction shed per original 1/120s
  // tick"; since this now runs once per SUBSTEP, convert to the equivalent
  // per-substep rate so overall sliding deceleration doesn't depend on
  // SUBSTEPS (keep^substeps == keepPerTick).
  const keep = Math.pow(1 - cfg.CONTACT_FRICTION, 1 / cfg.SUBSTEPS);
  for (const key of POINT_KEYS) {
    const hit = hits[key];
    if (!hit) continue;
    const p = rider.points[key];
    const vx = p.x - p.px, vy = p.y - p.py;
    const vn = vx * hit.nx + vy * hit.ny;
    const vtx = vx - vn * hit.nx, vty = vy - vn * hit.ny;
    p.px = p.x - vtx * keep;
    p.py = p.y - vty * keep;
  }
}

/** Non-solid accelerator lines: any point within radius gets a one-off
 * speed boost along the segment's direction, gated by a short per-rider
 * cooldown so lingering near the line doesn't re-trigger every tick. */
function applyAccelerators(rider, lines, dt, cfg) {
  rider.accelCooldown = Math.max(0, rider.accelCooldown - dt);
  if (rider.accelCooldown > 0) return false;
  for (const line of lines) {
    if (!isBoost(line)) continue;
    const pts = line.pts;
    for (const key of POINT_KEYS) {
      const p = rider.points[key];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const hit = segmentPush(p, a, b, cfg.POINT_RADIUS + 3);
        if (!hit) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        // Boost along whichever direction the point is already heading
        // (so an accelerator line drawn "backwards" relative to travel
        // still speeds the rider up rather than reversing them).
        const vx = p.x - p.px, vy = p.y - p.py;
        const dot = vx * (dx / len) + vy * (dy / len);
        const sign = dot < 0 ? -1 : 1;
        const bx = (dx / len) * sign * cfg.ACCEL_BOOST * dt;
        const by = (dy / len) * sign * cfg.ACCEL_BOOST * dt;
        for (const k2 of POINT_KEYS) { rider.points[k2].px -= bx; rider.points[k2].py -= by; }
        rider.accelCooldown = cfg.ACCEL_COOLDOWN_S;
        return true;
      }
    }
  }
  return false;
}

// --- Crash detection ---------------------------------------------------

/** Signed area x2 of triangle (tail-nose, hip-nose) — its SIGN encodes which
 * side of the sled's nose-tail runner the hip (and rider) sits on. Used only
 * by the bonus "flipped over" crash check. */
function flipSign(rider) {
  const nose = rider.points.nose, tail = rider.points.tail, hip = rider.points.hip;
  const cross = (tail.x - nose.x) * (hip.y - nose.y) - (tail.y - nose.y) * (hip.x - nose.x);
  return cross;
}

// --- Main step ---------------------------------------------------------

/**
 * Advance the rider by dt seconds against the given solid/scenery/accel
 * lines. Call with a small FIXED dt (game.js runs a 1/120s accumulator, the
 * same discipline as games/siege-break, so the sim is frame-rate
 * independent). Returns an array of events: {type:'land'} | {type:'crash',
 * reason}. Mutates `rider` in place; a no-op once `rider.crashed`.
 */
export function stepRider(rider, lines, dt, cfg = CONFIG) {
  if (rider.crashed) return [];
  const events = [];
  const wasGrounded = rider.grounded;
  const subDt = dt / cfg.SUBSTEPS;
  // AIR_DAMPING is authored as "per original 1/120s tick"; since integrate()
  // now runs once per SUBSTEP, use the equivalent per-substep factor so the
  // compounded per-second damping (and therefore effective fall speed)
  // doesn't depend on SUBSTEPS — same fix as applyFriction's `keep`. Missing
  // this the first time made a 2-second fall land ~11-15% short of the
  // GRAVITY-implied distance (0.9995 compounded over 4x as many integrate()
  // calls per second), silently softening every fall/slide in the game.
  const dampPerSub = Math.pow(cfg.AIR_DAMPING, 1 / cfg.SUBSTEPS);

  const impact = { speed: 0 };
  let hits = {};
  let touchedAnySubstep = false;
  for (let s = 0; s < cfg.SUBSTEPS; s++) {
    for (const key of POINT_KEYS) integrate(rider.points[key], subDt, dampPerSub, cfg);
    for (let it = 0; it < cfg.SOLVER_ITERATIONS; it++) {
      for (const c of rider.constraints) satisfyConstraint(c);
      hits = resolveCollisions(rider, lines, cfg, it === 0, impact, subDt);
    }
    applyFriction(rider, hits, cfg);
    if (Object.keys(hits).length > 0) touchedAnySubstep = true;

    // Safety clamp against pathological blow-ups (e.g. a near-zero-length
    // segment or a degenerate constraint) — mirrors games/siege-break's
    // MAX_SPEED clamp. Checked every substep so a blow-up can never
    // compound across the remaining substeps of this tick.
    for (const key of POINT_KEYS) {
      const p = rider.points[key];
      const vx = p.x - p.px, vy = p.y - p.py;
      const sp = Math.hypot(vx, vy);
      if (sp > cfg.MAX_SPEED) {
        const k = cfg.MAX_SPEED / sp;
        p.px = p.x - vx * k;
        p.py = p.y - vy * k;
      }
    }
  }
  applyAccelerators(rider, lines, dt, cfg);

  const grounded = touchedAnySubstep;
  rider.grounded = grounded;
  if (grounded) {
    rider.airborneTime = 0;
    if (!wasGrounded) events.push({ type: 'land' });
  } else {
    rider.airborneTime += dt;
  }

  // --- Crash checks --------------------------------------------------
  // 1. Hard impact on a core (sled/torso) point.
  if (impact.speed > cfg.HARD_IMPACT_SPEED) {
    rider.crashed = true;
    rider.crashReason = 'impact';
  }
  // 2. Long unbroken fall (no contact for a while), or a hard distance
  // backstop regardless of timer.
  if (!rider.crashed) {
    const fellFar = rider.points.hip.y - rider.spawn.y > cfg.FALL_DISTANCE_MAX;
    if (rider.airborneTime > cfg.FALL_TIMEOUT_S || fellFar) {
      rider.crashed = true;
      rider.crashReason = 'fell';
    }
  }
  // 3. Bonus: sustained topple/flip past a real margin (see flipSign doc).
  if (!rider.crashed) {
    const sign = flipSign(rider);
    const flipped = rider.initialFlipSign >= 0
      ? sign < -cfg.FLIP_AREA_MARGIN
      : sign > cfg.FLIP_AREA_MARGIN;
    rider.flipTime = flipped ? (rider.flipTime || 0) + dt : 0;
    if (rider.flipTime > cfg.FLIP_SUSTAIN_S) {
      rider.crashed = true;
      rider.crashReason = 'flip';
    }
  }
  if (rider.crashed) events.push({ type: 'crash', reason: rider.crashReason });

  return events;
}

/** Live distance between two rider points, for HUD/test inspection. */
export function pointDistance(rider, keyA, keyB) {
  const a = rider.points[keyA], b = rider.points[keyB];
  return dist(a.x, a.y, b.x, b.y);
}
