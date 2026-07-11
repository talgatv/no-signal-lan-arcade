/**
 * Billiards — physics module (pure, DOM-free, canvas-free).
 *
 * Same split as games/mini-golf's physics.js: works directly in canvas-pixel
 * units (no camera/scroll, so no separate world<->screen conversion layer),
 * and is entirely free of DOM/canvas dependencies so the whole simulation
 * can be stepped and inspected directly from a test harness (see
 * window.OGH_BILLIARDS in game.js) instead of only being observable through
 * the rendered scene. Unlike mini-golf (one ball vs. static walls/hazards),
 * this module's central concern is many-body ball-vs-ball collision, so it
 * gets its own careful treatment below.
 *
 * The whole sim is one function, stepWorld(balls, dt), broken into fixed
 * substeps (see SUBSTEPS) so a full-power break shot — cue ball slamming
 * into a tightly-packed rack at MAX_SHOT_SPEED — can't tunnel through a
 * neighboring ball inside a single animation frame; at 60fps a ball moving
 * at MAX_SHOT_SPEED covers roughly 1.3x its own diameter per frame, which is
 * exactly the "tunnels past thin obstacles" danger zone. Each substep is
 * small enough (worst case a small fraction of one ball radius) that
 * ball-ball overlap is always caught the substep it starts, never skipped
 * over.
 *
 * Ball-ball collisions (resolveBallCollisions) implement the textbook 2D
 * equal-mass elastic collision: decompose each ball's velocity into a
 * component along the collision normal (the line through both centers) and
 * a tangential component perpendicular to it, then exchange ONLY the normal
 * components (tangential parts pass through untouched) — physically, an
 * equal-mass head-on exchange transfers all of the closing-speed component
 * and none of the sideways one. BALL_RESTITUTION is deliberately exactly
 * 1.0 (not "close to 1") so this is a literal swap, not an approximation —
 * see the impulse-form derivation in resolveBallCollisions' comment for why
 * total momentum along the normal is conserved for ANY restitution value,
 * while energy conservation specifically requires exactly 1.0. The table
 * still isn't a perpetual-motion machine: rolling friction (integrateBall)
 * and lossy cushion bounces (CUSHION_RESTITUTION < 1, resolveCushions) both
 * continuously bleed energy, so every shot still runs down to a stop.
 *
 * Ball lifecycle: alive (integrated, collidable) -> pocketed (frozen in
 * place with zero velocity, skipped by every subsequent step) once its
 * center comes within a pocket's capture radius at a low enough speed (see
 * resolvePockets — a ball screaming past a pocket mouth can legitimately
 * rattle off the jaws and stay in play, same "fast shots can skip it"
 * nuance as mini-golf's cup capture). The cue ball is a ball like any
 * other in the simulation (number 0) EXCEPT game.js/rules.js never let it
 * stay pocketed: a scratch respots it via respotCueBall/placeCueBall
 * instead of leaving it removed.
 */

// --- Table geometry ----------------------------------------------------
// A rectangular playing surface, landscape (roughly the real ~2:1 ratio of
// a pool table's playing surface), with 6 pockets: 4 corners + 2 side
// middles. TABLE_LEFT/RIGHT/TOP/BOTTOM are the cushion contact lines (where
// a ball's CENTER stops, i.e. already inset by one ball radius from the
// rendered rail) — the single source of truth for both cushion collision
// here and the rail/felt drawing in game.js, so the two can never visually
// disagree.

export const CANVAS_W = 1000;
export const CANVAS_H = 560;

export const TABLE_LEFT = 60;
export const TABLE_RIGHT = 940;
export const TABLE_TOP = 60;
export const TABLE_BOTTOM = 500;

export const BALL_RADIUS = 11;
export const POCKET_RADIUS = 24;

/** 4 corners + 2 side-middles. `corner` flags the 4 that sit at a rail
 * intersection (drawn/angled differently from the 2 side pockets). */
export const POCKETS = [
  { x: TABLE_LEFT, y: TABLE_TOP, r: POCKET_RADIUS, corner: true },
  { x: TABLE_RIGHT, y: TABLE_TOP, r: POCKET_RADIUS, corner: true },
  { x: TABLE_LEFT, y: TABLE_BOTTOM, r: POCKET_RADIUS, corner: true },
  { x: TABLE_RIGHT, y: TABLE_BOTTOM, r: POCKET_RADIUS, corner: true },
  { x: (TABLE_LEFT + TABLE_RIGHT) / 2, y: TABLE_TOP, r: POCKET_RADIUS, corner: false },
  { x: (TABLE_LEFT + TABLE_RIGHT) / 2, y: TABLE_BOTTOM, r: POCKET_RADIUS, corner: false },
];

/** "Kitchen" — behind the head string, where the cue ball starts and
 * respots after a scratch. FOOT_SPOT is the rack's apex. Symmetric 25%/75%
 * split along the table's long axis gives a generous, realistic break
 * distance between them. */
export const HEAD_SPOT = { x: TABLE_LEFT + (TABLE_RIGHT - TABLE_LEFT) * 0.25, y: (TABLE_TOP + TABLE_BOTTOM) / 2 };
export const FOOT_SPOT = { x: TABLE_LEFT + (TABLE_RIGHT - TABLE_LEFT) * 0.75, y: (TABLE_TOP + TABLE_BOTTOM) / 2 };

// --- Tuning constants ----------------------------------------------------

/** Shot power -> speed mapping lives here (not game.js), same convention as
 * games/mini-golf/physics.js — game.js only ever supplies power in [0,1]
 * from the drag gesture. */
export const MAX_SHOT_SPEED = 1300; // px/s at power = 1 (a full-power break)
export const MIN_SHOT_SPEED = 90; // px/s at the smallest still-registered tap

/** Rolling friction: CONSTANT deceleration (px/s^2), not exponential decay
 * — real rolling friction is close to a constant force (mu * g), so speed
 * falls off linearly with time and a shot always comes to a full, exact
 * stop in finite time (no asymptotic "never quite zero" tail to snap off,
 * unlike an exponential-decay model). */
export const ROLL_DECEL = 450;

/** Cushion bounce: simple axis-flip (this is a rectangle, so the rail
 * normal is always purely horizontal or vertical — no generalized reflect
 * needed) scaled by this restitution so a rail bounce measurably loses
 * energy instead of bouncing forever. */
export const CUSHION_RESTITUTION = 0.85;

/** Ball-vs-ball restitution: exactly 1.0 — see the module doc comment for
 * why this must be exact (a literal normal-component swap), not merely
 * "close to 1". */
export const BALL_RESTITUTION = 1.0;

/** A ball pocketed below this speed always drops; above it, only a
 * near-dead-center hit (see SINK_TIGHT_FACTOR) still falls — a very hard,
 * glancing hit can rattle the jaws and stay in play, the same "a fast shot
 * can skip the cup" nuance as games/mini-golf's cup capture (there, less
 * central to the genre; here still a nice authentic touch). */
export const SINK_SPEED_MAX = 850;
export const SINK_TIGHT_FACTOR = 0.45;

/** Fixed sub-steps per stepWorld(dt) call — see module doc comment for the
 * tunneling-safety rationale. 8 is comfortably cheap for <=16 balls
 * (O(n^2) pairwise checks, so at most 120 pair tests per substep). */
const SUBSTEPS = 8;

/** Collision-resolution passes run per substep, over the SAME positions
 * (no re-integration between them) — see resolveBallCollisions' doc
 * comment for why one pass isn't enough for a freshly-broken rack. */
const COLLISION_ITERATIONS = 10;

// --- Ball + rack -----------------------------------------------------------

/** number: 0 = cue, 1-15 = object balls (also doubles as a stable unique
 * id — nothing here ever needs a separate id from the pool-ball number). */
function makeBall(number, x, y) {
  return { number, x, y, vx: 0, vy: 0, pocketed: false };
}

export function speedOf(ball) {
  return Math.hypot(ball.vx, ball.vy);
}

export function findBall(balls, number) {
  return balls.find((b) => b.number === number) || null;
}

/** Standard 8-ball triangle: 5 rows (1,2,3,4,5 balls), apex pointing at the
 * cue ball (toward the head, i.e. smallest x), widening toward the foot
 * rail. Row/column spacing (BALL_RADIUS*sqrt(3) between rows, BALL_RADIUS*2
 * within a row) is the exact tight-packing spacing for touching circles, so
 * every ball in a freshly racked triangle touches its neighbors with zero
 * gap and zero overlap — no random jitter needed (or wanted: it would only
 * add avoidable visual noise to the one moment players most expect a
 * perfect triangle).
 *
 * Slot assignment respects the two constraints real racks always keep: the
 * apex ball is a solid (1), the very center of the triangle is the 8-ball,
 * and the two back-row corners are one solid + one stripe. Everything else
 * is a fixed (not randomized) arrangement — plenty of visual variety, fully
 * deterministic so the rack looks the same, and is just as testable, every
 * time. */
const RACK_LAYOUT = [
  [1],
  [9, 2],
  [10, 8, 3],
  [4, 11, 5, 12],
  [6, 14, 7, 15, 13],
];

export function createRack() {
  const balls = [makeBall(0, HEAD_SPOT.x, HEAD_SPOT.y)];
  const dxRow = BALL_RADIUS * Math.sqrt(3);
  const dyBall = BALL_RADIUS * 2;
  RACK_LAYOUT.forEach((row, r) => {
    const n = row.length;
    row.forEach((number, k) => {
      const x = FOOT_SPOT.x + r * dxRow;
      const y = FOOT_SPOT.y + (k - (n - 1) / 2) * dyBall;
      balls.push(makeBall(number, x, y));
    });
  });
  return balls;
}

/** Solo practice: same rack, but callers are free to ignore group/turn
 * semantics entirely (rules.js is never consulted in solo mode). */
export function createSoloRack() {
  return createRack();
}

// --- Shooting ----------------------------------------------------------

/** @param {number} dirX,dirY unnormalized shot direction; @param {number} power 0..1 */
export function applyShot(ball, dirX, dirY, power) {
  const len = Math.hypot(dirX, dirY) || 1;
  const nx = dirX / len;
  const ny = dirY / len;
  const speed = Math.max(MIN_SHOT_SPEED, Math.min(1, power) * MAX_SHOT_SPEED);
  ball.vx = nx * speed;
  ball.vy = ny * speed;
}

// --- Placement helpers (kitchen respot, ball-in-hand) -----------------------

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function inBounds(x, y) {
  return x - BALL_RADIUS >= TABLE_LEFT && x + BALL_RADIUS <= TABLE_RIGHT
    && y - BALL_RADIUS >= TABLE_TOP && y + BALL_RADIUS <= TABLE_BOTTOM;
}

function isFreeSpot(balls, x, y, excludeNumber) {
  if (!inBounds(x, y)) return false;
  for (const b of balls) {
    if (b.pocketed || b.number === excludeNumber) continue;
    if (Math.hypot(b.x - x, b.y - y) < BALL_RADIUS * 2 + 0.5) return false;
  }
  return true;
}

/** Nearest open spot to `near` that doesn't overlap another ball (spiral
 * search in small rings) — used both for the kitchen respot after a scratch
 * and for ball-in-hand placement landing on top of another ball. Falls back
 * to `near` itself if genuinely nothing opens up (shouldn't happen with 16
 * balls on a table this size, but must never throw / get stuck). */
export function findOpenSpot(balls, near, excludeNumber) {
  const nx0 = clamp(near.x, TABLE_LEFT + BALL_RADIUS, TABLE_RIGHT - BALL_RADIUS);
  const ny0 = clamp(near.y, TABLE_TOP + BALL_RADIUS, TABLE_BOTTOM - BALL_RADIUS);
  if (isFreeSpot(balls, nx0, ny0, excludeNumber)) return { x: nx0, y: ny0 };
  for (let ring = 1; ring <= 24; ring++) {
    const radius = ring * (BALL_RADIUS * 0.8);
    const steps = 14;
    for (let i = 0; i < steps; i++) {
      const ang = (i / steps) * Math.PI * 2;
      const x = clamp(nx0 + Math.cos(ang) * radius, TABLE_LEFT + BALL_RADIUS, TABLE_RIGHT - BALL_RADIUS);
      const y = clamp(ny0 + Math.sin(ang) * radius, TABLE_TOP + BALL_RADIUS, TABLE_BOTTOM - BALL_RADIUS);
      if (isFreeSpot(balls, x, y, excludeNumber)) return { x, y };
    }
  }
  return { x: nx0, y: ny0 };
}

/** Scratch recovery: send the cue ball back to the kitchen (or the nearest
 * open spot to it, if something's sitting on the exact head spot). */
export function respotCueBall(balls, cueBall) {
  const spot = findOpenSpot(balls, HEAD_SPOT, cueBall.number);
  cueBall.x = spot.x;
  cueBall.y = spot.y;
  cueBall.vx = 0;
  cueBall.vy = 0;
  cueBall.pocketed = false;
}

/** Ball-in-hand: place the cue ball at (x,y), nudged to the nearest open
 * spot if it lands on/inside another ball or off the table. */
export function placeCueBall(balls, cueBall, x, y) {
  const spot = findOpenSpot(balls, { x, y }, cueBall.number);
  cueBall.x = spot.x;
  cueBall.y = spot.y;
  cueBall.vx = 0;
  cueBall.vy = 0;
  cueBall.pocketed = false;
}

// --- Simulation step ---------------------------------------------------------

function integrateBall(ball, dt) {
  if (ball.pocketed) return;
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > 0) {
    const newSpeed = Math.max(0, speed - ROLL_DECEL * dt);
    const k = newSpeed / speed;
    ball.vx *= k;
    ball.vy *= k;
  }
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
}

/**
 * Resolve every ball-ball overlap in the CURRENT positions (called
 * COLLISION_ITERATIONS times per substep by stepWorld, not just once — a
 * single pass only resolves each pair once using whatever velocity/
 * position its balls happened to already have when THAT pair came up in
 * the i/j loop, so on a densely-packed rack an early pair can "steal" a
 * ball's whole velocity before a later pair in the same pass ever sees it,
 * and an impulse can only ever travel exactly one contact deeper per pass.
 * Repeating the full sweep several times over the same positions (a
 * standard sequential-impulse-solver technique) lets a single substep's
 * impulse correctly propagate — and split across multiple simultaneous
 * neighbors — several contacts deep, which is exactly what a freshly
 * broken rack needs. Confirmed empirically: with only one pass per
 * substep, a dead-center break funneled almost all of its energy into a
 * single back-row ball while 13 others stayed within a fraction of a
 * pixel of their raw position; with COLLISION_ITERATIONS passes, the same
 * shot fans balls out across the table the way a real break does.
 *
 * Two things happen per colliding pair, in order:
 *
 * 1. Position correction: push both balls apart along the collision normal
 *    (the unit vector between centers) by half the overlap each — equal
 *    push because the balls are equal mass/radius — so they never render
 *    visually intersecting.
 * 2. Velocity exchange, but ONLY if the pair is still approaching along the
 *    normal (relative velocity . normal < 0) — a pair caught mid-overlap
 *    but already separating (e.g. resolved by a different pair's push this
 *    same substep) must not get a second impulse.
 *
 * The velocity exchange is derived as an impulse shared equally and
 * oppositely between the two balls: with an/bn the balls' velocity
 * components along the normal before impact,
 *
 *   impulse = (1 + e) * (bn - an) / 2
 *   a.vel += impulse * n
 *   b.vel -= impulse * n
 *
 * This conserves total momentum along the normal for ANY restitution e
 * (the two impulses are exactly equal and opposite, by construction — nudge
 * a by +impulse*n and b by -impulse*n and their sum is unchanged no matter
 * what the impulse magnitude is).
 * At e = BALL_RESTITUTION = 1 it also reduces to an exact swap of the
 * normal components (a's new normal speed becomes b's old one and vice
 * versa) while leaving both balls' tangential components untouched — which
 * is the textbook equal-mass elastic collision the task calls for. Physics
 * events (for sfx + "what did the cue ball hit first" foul tracking) are
 * only pushed on an actual impulse, not on a same-substep overlap that
 * turned out to be separating already.
 */
function resolveBallCollisions(balls, events) {
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    if (a.pocketed) continue;
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      if (b.pocketed) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minDist = BALL_RADIUS * 2;
      if (dist >= minDist) continue;

      let nx, ny;
      if (dist > 1e-6) {
        nx = dx / dist;
        ny = dy / dist;
      } else {
        // Degenerate (exactly coincident centers, practically never
        // happens): push apart along an arbitrary fixed axis.
        nx = 1;
        ny = 0;
      }

      const overlap = minDist - dist;
      a.x -= nx * (overlap / 2);
      a.y -= ny * (overlap / 2);
      b.x += nx * (overlap / 2);
      b.y += ny * (overlap / 2);

      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const velAlongNormal = rvx * nx + rvy * ny;
      if (velAlongNormal >= 0) continue; // already separating, no impulse

      const an = a.vx * nx + a.vy * ny;
      const bn = b.vx * nx + b.vy * ny;
      const impulse = ((1 + BALL_RESTITUTION) * (bn - an)) / 2;
      a.vx += impulse * nx;
      a.vy += impulse * ny;
      b.vx -= impulse * nx;
      b.vy -= impulse * ny;

      events.push({ type: 'collision', a: a.number, b: b.number, speed: Math.abs(velAlongNormal) });
    }
  }
}

/** Simple axis-flip rail bounce: this table is an axis-aligned rectangle,
 * so the cushion normal is always purely horizontal (left/right rails) or
 * vertical (top/bottom rails) — flip the one velocity component that faces
 * the rail, scaled by CUSHION_RESTITUTION for the energy loss. */
function resolveCushions(balls, events) {
  for (const ball of balls) {
    if (ball.pocketed) continue;
    const r = BALL_RADIUS;
    if (ball.x - r < TABLE_LEFT) {
      ball.x = TABLE_LEFT + r;
      if (ball.vx < 0) {
        ball.vx = -ball.vx * CUSHION_RESTITUTION;
        events.push({ type: 'cushion', number: ball.number });
      }
    } else if (ball.x + r > TABLE_RIGHT) {
      ball.x = TABLE_RIGHT - r;
      if (ball.vx > 0) {
        ball.vx = -ball.vx * CUSHION_RESTITUTION;
        events.push({ type: 'cushion', number: ball.number });
      }
    }
    if (ball.y - r < TABLE_TOP) {
      ball.y = TABLE_TOP + r;
      if (ball.vy < 0) {
        ball.vy = -ball.vy * CUSHION_RESTITUTION;
        events.push({ type: 'cushion', number: ball.number });
      }
    } else if (ball.y + r > TABLE_BOTTOM) {
      ball.y = TABLE_BOTTOM - r;
      if (ball.vy > 0) {
        ball.vy = -ball.vy * CUSHION_RESTITUTION;
        events.push({ type: 'cushion', number: ball.number });
      }
    }
  }
}

/** Pocket capture: proximity (center within the pocket's radius) AND a
 * low-enough speed — a ball screaming across the table at high speed can
 * legitimately rattle the jaws and stay in play unless it's a near-dead-
 * center hit (SINK_TIGHT_FACTOR), same "a fast shot can skip it" nuance as
 * games/mini-golf's cup. Checked BEFORE resolveCushions each substep (see
 * stepWorld) so a ball heading into a corner/side pocket gets captured
 * instead of bounced by the rail lines that happen to meet right there. */
function resolvePockets(balls, events) {
  for (const ball of balls) {
    if (ball.pocketed) continue;
    for (const pocket of POCKETS) {
      const d = Math.hypot(ball.x - pocket.x, ball.y - pocket.y);
      if (d > pocket.r) continue;
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed <= SINK_SPEED_MAX || d <= pocket.r * SINK_TIGHT_FACTOR) {
        ball.pocketed = true;
        ball.vx = 0;
        ball.vy = 0;
        events.push({ type: 'pocket', number: ball.number, isCue: ball.number === 0 });
      }
      break; // pockets don't overlap each other; at most one can match
    }
  }
}

/** Advance every ball by dt seconds (fixed sub-stepping — see module doc
 * comment). Returns the merged list of events from every substep:
 * {type:'collision', a, b, speed}, {type:'cushion', number},
 * {type:'pocket', number, isCue}. Safe to call every frame regardless of
 * whether anything is actually moving (a table at rest just does no-op
 * integration very cheaply), but game.js only bothers calling it while at
 * least one ball has nonzero velocity. */
export function stepWorld(balls, dt) {
  const events = [];
  const subDt = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) {
    for (const ball of balls) integrateBall(ball, subDt);
    // Multiple resolution passes over the SAME post-integration positions
    // (see resolveBallCollisions' doc comment) so an impulse can propagate
    // through a whole chain of simultaneous contacts — a freshly-broken
    // rack is exactly this case: the cue ball's impulse needs to reach
    // ball 1, then split across ball 1's two row-1 neighbors, then split
    // again into row 2, and so on. A single pass only lets information
    // travel one contact "deep"; COLLISION_ITERATIONS passes let it settle
    // all the way through a 5-row-deep rack within one substep.
    for (let iter = 0; iter < COLLISION_ITERATIONS; iter++) {
      resolveBallCollisions(balls, events);
      resolveCushions(balls, events);
    }
    resolvePockets(balls, events);
  }
  return events;
}

export function allStopped(balls) {
  return balls.every((b) => b.pocketed || (Math.abs(b.vx) < 0.5 && Math.abs(b.vy) < 0.5));
}
