/**
 * Mini Golf — physics module (pure, DOM-free, canvas-free).
 *
 * Unlike games/penguin-fling's physics.js (meters, converted to pixels only
 * in game.js), this module works directly in canvas pixels: mini-golf has
 * no camera/scroll — every hole is authored to fit entirely on the fixed
 * 720x1000 canvas game.js draws, so there is no unit-conversion layer and
 * the numbers here ARE the numbers game.js draws with. Kept in its own
 * file anyway (same split as penguin-fling/neon-drift) so the simulation
 * stays directly steppable/inspectable from a test harness without any DOM.
 *
 * Ball lifecycle (ball.state): 'idle' (resting, aimable) -> 'rolling' (a
 * shot is live, decelerating under rolling friction) -> back to 'idle' once
 * speed drops under STOP_SPEED, or a terminal 'sunk' once captured by the
 * cup. Water is handled as an event returned to the caller (game.js owns
 * the stroke penalty + reset-to-shot-start, since "the shot" and "strokes"
 * are scoring concepts, not physics ones).
 *
 * Walls are modelled uniformly as thick line segments ("capsules": a
 * segment plus a half-thickness) rather than axis-aligned rectangles, so a
 * single collision routine handles straight boundaries, angled dogleg
 * corners, AND round bumper obstacles (a zero-length segment, x1===x2 &&
 * y1===y2, degenerates to a plain circle) with no special-casing. A hole's
 * fairway polygon edges are turned into walls automatically
 * (fairwayWalls()) so the rendered green shape and the collision boundary
 * can never drift out of sync with each other — same "one source of truth"
 * principle as games/penguin-fling's groundHeight().
 */

// --- Tunable constants ------------------------------------------------------

export const BALL_RADIUS = 9;
export const CUP_RADIUS = 15;
export const WALL_HALF_THICKNESS = 7;

/** Shot power -> speed mapping lives here (not game.js) so "how hard a full
 * drag hits the ball" is a physics constant like everything else. game.js
 * only ever supplies power in [0,1] (from drag distance / max drag). */
export const MAX_SHOT_SPEED = 620; // px/s at power = 1
export const MIN_SHOT_SPEED = 40; // px/s at the smallest still-registered putt

/** Rolling friction: frame-rate-independent exponential decay, the same
 * idiom games/neon-drift (drag/brake) and games/penguin-fling (ice slide)
 * use — speed *= factor^dt every second. FRICTION_GREEN is deliberately
 * NOT close to 1: a real rolling ball visibly, continuously loses speed
 * (not a near-frictionless ice slide), so it reads as "rolling to a stop"
 * rather than gliding. FRICTION_SAND is dramatically stronger — a ball
 * entering sand should visibly, almost abruptly, bog down within a few
 * frames. */
export const FRICTION_GREEN = 0.30; // fraction of speed kept after 1s on the green
export const FRICTION_SAND = 0.015; // fraction of speed kept after 1s in sand
export const STOP_SPEED = 4; // px/s; below this the ball is snapped to a full stop

/** Wall bounces: perfect reflection (angle in = angle out around the
 * wall's normal), then scaled by this restitution factor so energy bleeds
 * off every bounce instead of bouncing forever. */
export const WALL_RESTITUTION = 0.74;

/** Sinking the cup requires BOTH proximity and a low-enough speed — a ball
 * roaring across the green at speed should visibly skip over/through the
 * cup rather than magnetically snapping in, same "fast shots can legitimately
 * miss" nuance real mini-golf / good videogame implementations have. */
export const SINK_SPEED_MAX = 150;
export const CUP_CAPTURE_RADIUS = CUP_RADIUS - BALL_RADIUS * 0.35;

// --- Ball ------------------------------------------------------------------

export function createBall(x, y) {
  return { x, y, vx: 0, vy: 0, state: 'idle', inSand: false };
}

export function speedOf(ball) {
  return Math.hypot(ball.vx, ball.vy);
}

/** @param {number} dirX,dirY unnormalized shot direction; @param {number} power 0..1 */
export function applyShot(ball, dirX, dirY, power) {
  const len = Math.hypot(dirX, dirY) || 1;
  const nx = dirX / len;
  const ny = dirY / len;
  const speed = Math.max(MIN_SHOT_SPEED, Math.min(1, power) * MAX_SHOT_SPEED);
  ball.vx = nx * speed;
  ball.vy = ny * speed;
  ball.state = 'rolling';
  ball.inSand = false;
}

// --- Geometry helpers --------------------------------------------------------

function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Closest point on segment (x1,y1)-(x2,y2) to (px,py), plus the parametric
 * t in [0,1] (used to interpolate a moving wall's per-endpoint velocity at
 * the actual contact point). A zero-length segment (x1===x2 && y1===y2)
 * safely degenerates to always returning that single point (t=0). */
function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq > 1e-9 ? clamp01(((px - x1) * dx + (py - y1) * dy) / lenSq) : 0;
  return { x: x1 + dx * t, y: y1 + dy * t, t };
}

function pointInCircle(px, py, c) {
  const dx = px - c.cx;
  const dy = py - c.cy;
  return dx * dx + dy * dy <= c.r * c.r;
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/** A "zone" (sand or water patch) is a list of circle/rect shapes unioned
 * together — lets a pond or bunker read as an organic blob (a cluster of
 * overlapping circles) instead of a single sterile primitive. */
export function pointInZone(px, py, zone) {
  if (!zone) return false;
  for (const shape of zone) {
    if (shape.shape === 'circle' && pointInCircle(px, py, shape)) return true;
    if (shape.shape === 'rect' && pointInRect(px, py, shape)) return true;
  }
  return false;
}

/** Fairway polygon edges + explicit obstacle segments, as collidable walls.
 * The SAME hole.fairway polygon drives rendering in game.js, so drawn and
 * collided geometry can never disagree. */
export function fairwayWalls(hole) {
  const segs = [];
  const poly = hole.fairway;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, half: WALL_HALF_THICKNESS });
  }
  for (const o of hole.obstacles || []) {
    segs.push({ x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2, half: o.half || WALL_HALF_THICKNESS });
  }
  return segs;
}

// --- Moving obstacles --------------------------------------------------------
// Two kinds, both reduced to "segment endpoints as a function of time" so
// one collision path handles both:
//  - 'rotate': a windmill — one or two bars (blades=4 -> two perpendicular
//    bars, i.e. 4 blades total) spinning about a pivot.
//  - 'slide': a gate/barrier translating back and forth along one axis.

function movingWallSegmentsAt(mover, t) {
  if (mover.kind === 'rotate') {
    const a = mover.phase + mover.angularSpeed * t;
    const angles = mover.blades === 4 ? [a, a + Math.PI / 2] : [a];
    return angles.map((ang) => ({
      x1: mover.cx + Math.cos(ang) * mover.length,
      y1: mover.cy + Math.sin(ang) * mover.length,
      x2: mover.cx - Math.cos(ang) * mover.length,
      y2: mover.cy - Math.sin(ang) * mover.length,
    }));
  }
  if (mover.kind === 'slide') {
    const off = Math.sin(t * mover.speed + (mover.phase || 0)) * mover.amplitude;
    const ox = mover.axis === 'x' ? off : 0;
    const oy = mover.axis === 'y' ? off : 0;
    return [{ x1: mover.x1 + ox, y1: mover.y1 + oy, x2: mover.x2 + ox, y2: mover.y2 + oy }];
  }
  return [];
}

/** Public: resolved current-instant segments for a moving obstacle, for
 * game.js to draw (no velocity attached — rendering doesn't need it). */
export function movingObstacleShapeAt(mover, t) {
  return movingWallSegmentsAt(mover, t);
}

const VEL_DT = 1 / 120; // finite-difference step for contact-point velocity

/** Current collidable walls for every moving obstacle on a hole, each
 * carrying its endpoints' instantaneous velocity (via a small finite
 * difference — one implementation covers rotate AND slide, no per-kind
 * analytic velocity formula to keep in sync with the position formula).
 * Velocity is linearly interpolated between the two endpoints at the
 * segment's contact parameter t, which is exact for a rigid rotating/
 * sliding bar (its true velocity field is linear along its own length). */
export function movingWallsAt(hole, t) {
  const out = [];
  for (const mover of hole.movingObstacles || []) {
    const now = movingWallSegmentsAt(mover, t);
    const prev = movingWallSegmentsAt(mover, t - VEL_DT);
    for (let i = 0; i < now.length; i++) {
      const n = now[i];
      const p = prev[i];
      out.push({
        x1: n.x1, y1: n.y1, x2: n.x2, y2: n.y2,
        half: mover.half || WALL_HALF_THICKNESS,
        vx1: (n.x1 - p.x1) / VEL_DT, vy1: (n.y1 - p.y1) / VEL_DT,
        vx2: (n.x2 - p.x2) / VEL_DT, vy2: (n.y2 - p.y2) / VEL_DT,
      });
    }
  }
  return out;
}

// --- Collision resolution ----------------------------------------------------

/** Resolve one circle(ball)-vs-capsule(wall segment) collision in place.
 * Pushes the ball out of penetration, then reflects its velocity around
 * the contact normal (v' = v - 2(v.n)n) scaled by `restitution` for the
 * energy loss — angle of incidence equals angle of reflection about the
 * normal BEFORE the uniform restitution scaling (scaling is linear, so it
 * changes magnitude only, never direction). A moving wall's own velocity
 * (wvx,wvy — zero for a static wall) is folded in via a relative-velocity
 * reflection, so a sweeping windmill blade can genuinely knock a slow/
 * resting ball instead of just shoving it (the position correction alone
 * would do that even with vx=vy=0, but would leave zero residual velocity,
 * i.e. the ball gets "carried" then dropped rather than knocked). Returns
 * true if a bounce (velocity change) occurred. */
function resolveCircleSegment(ball, seg, restitution, events) {
  const cp = closestPointOnSegment(ball.x, ball.y, seg.x1, seg.y1, seg.x2, seg.y2);
  const dx = ball.x - cp.x;
  const dy = ball.y - cp.y;
  const dist = Math.hypot(dx, dy);
  const minDist = BALL_RADIUS + (seg.half != null ? seg.half : WALL_HALF_THICKNESS);
  if (dist >= minDist) return false;

  let nx, ny;
  if (dist > 1e-6) {
    nx = dx / dist;
    ny = dy / dist;
  } else {
    // Degenerate: ball center sits exactly on the wall's line — push out
    // along the segment's perpendicular rather than divide by zero.
    const ex = seg.x2 - seg.x1;
    const ey = seg.y2 - seg.y1;
    const elen = Math.hypot(ex, ey) || 1;
    nx = -ey / elen;
    ny = ex / elen;
  }

  const overlap = minDist - dist;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const wvx = seg.vx1 != null ? seg.vx1 + (seg.vx2 - seg.vx1) * cp.t : 0;
  const wvy = seg.vy1 != null ? seg.vy1 + (seg.vy2 - seg.vy1) * cp.t : 0;

  const relVx = ball.vx - wvx;
  const relVy = ball.vy - wvy;
  const relDotN = relVx * nx + relVy * ny;
  if (relDotN < 0) {
    const rvx2 = relVx - 2 * relDotN * nx;
    const rvy2 = relVy - 2 * relDotN * ny;
    ball.vx = wvx + rvx2 * restitution;
    ball.vy = wvy + rvy2 * restitution;
    events.push({ type: 'wall-bounce', speed: Math.hypot(ball.vx, ball.vy) });
    return true;
  }
  return false;
}

// --- Main step ---------------------------------------------------------------

/**
 * Advance a rolling ball by dt seconds. No-op if ball.state !== 'rolling'
 * (an idle/sunk ball has nothing to integrate). `elapsedTime` (seconds,
 * monotonic, NOT reset per shot) drives moving obstacles so a windmill
 * keeps spinning while the player is still aiming, not just while a shot
 * is live — timing the swing is part of the puzzle.
 *
 * Returns an array of event objects: {type:'wall-bounce', speed},
 * {type:'sand-enter'}, {type:'water'}, {type:'sink'}, {type:'stopped'}.
 * On a 'water' event the ball is left exactly where it crossed the hazard
 * boundary — resetting it to the shot-start position (or a drop zone) and
 * charging the stroke penalty is a scoring concern, so game.js does that,
 * not this module.
 */
export function stepBall(ball, dt, hole, elapsedTime) {
  const events = [];
  if (ball.state !== 'rolling') return events;

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  const wasInSand = ball.inSand;
  ball.inSand = pointInZone(ball.x, ball.y, hole.sand);
  const frictionK = ball.inSand ? FRICTION_SAND : FRICTION_GREEN;
  const decay = Math.pow(frictionK, dt);
  ball.vx *= decay;
  ball.vy *= decay;
  if (ball.inSand && !wasInSand) events.push({ type: 'sand-enter' });

  for (const seg of fairwayWalls(hole)) {
    resolveCircleSegment(ball, seg, WALL_RESTITUTION, events);
  }
  for (const seg of movingWallsAt(hole, elapsedTime)) {
    resolveCircleSegment(ball, seg, WALL_RESTITUTION, events);
  }

  if (pointInZone(ball.x, ball.y, hole.water)) {
    events.push({ type: 'water' });
    return events;
  }

  const speed = speedOf(ball);
  const dCup = Math.hypot(ball.x - hole.cup.x, ball.y - hole.cup.y);
  if (dCup < CUP_CAPTURE_RADIUS && speed < SINK_SPEED_MAX) {
    ball.vx = 0;
    ball.vy = 0;
    ball.state = 'sunk';
    events.push({ type: 'sink' });
    return events;
  }

  if (speed < STOP_SPEED) {
    ball.vx = 0;
    ball.vy = 0;
    ball.state = 'idle';
    events.push({ type: 'stopped' });
  }

  return events;
}
