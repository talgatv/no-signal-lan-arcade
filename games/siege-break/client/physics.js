/**
 * Siege Break — 2D rigid-body physics engine (pure, DOM-free, canvas-free).
 *
 * This is the heart of the game: a genuine (if compact) impulse-based rigid
 * body simulator for oriented rectangles ("blocks") plus one round projectile
 * (the boulder), so a struck structure collapses with real physics — blocks
 * tip over edges, slide off one another, and tumble — rather than a scripted
 * "delete on hit" animation.
 *
 * Approach (a faithful port of Erin Catto's box2d-lite sequential-impulse
 * solver, adapted from y-up/meters to this game's y-DOWN pixel space):
 *
 *  - Each block is a full rigid body: center of mass (x,y), orientation
 *    (angle), linear velocity (vx,vy) AND angular velocity (omega), with a
 *    real mass and moment of inertia. That angular term is what makes
 *    toppling emergent rather than faked.
 *  - Collisions between oriented boxes are found with SAT and turned into a
 *    1-2 point contact manifold by reference/incident-face clipping. Contacts
 *    are solved with accumulated, warm-started normal + friction impulses over
 *    several iterations, with Baumgarte position correction. Because an
 *    impulse is applied AT a contact point offset from the center of mass, it
 *    produces a torque (r x P) automatically — an off-center boulder hit, or
 *    the single remaining support contact under an overhanging block, spins
 *    the body in the physically correct direction with no special-case code.
 *  - Support/stability is therefore emergent, not a scripted check: a block
 *    resting on another has an upward contact impulse each tick that cancels
 *    gravity; destroy the block beneath it and that contact simply stops
 *    existing next tick, so gravity is unopposed and the block falls/topples
 *    on its own. (verified via the test harness — see window.OGH_SIEGE_BREAK.)
 *  - Impulses cascade for free: a boulder displaces block A, whose new
 *    velocity creates a high-approach-speed contact with neighbour B, which
 *    the same solver resolves, and so on down the line.
 *
 * Destruction: blocks carry hit points. Damage is dealt from the *approach
 * speed* of a contact (relative normal velocity before it is resolved), so a
 * hard hit or a long fall onto the ground damages a block while gentle
 * settling contacts (approach speed ~0) never do. hp<=0 -> the block breaks.
 *
 * Kept pure/DOM-free (numbers only, in the pixel units game.js draws with, no
 * camera/scroll) so the whole simulation is directly steppable and inspectable
 * from a headless test harness, the same discipline as games/mini-golf's and
 * games/penguin-fling's physics.js.
 */

// --- World constants --------------------------------------------------------

/** Downward acceleration, px/s^2 (y is DOWN in screen space). Tuned for a
 * punchy-but-readable fall on the fixed 720x1000 arena. */
export const GRAVITY = 1650;

/** Solver iteration count. More = stiffer, more stable stacks; 10 is the
 * box2d-lite default and holds these short structures comfortably. */
export const SOLVER_ITERATIONS = 12;

/** Baumgarte position-correction factor and the penetration slop it ignores
 * (px). Standard box2d-lite values — push overlapping bodies apart gently
 * over several ticks instead of a jarring instant snap. */
const BIAS_FACTOR = 0.2;
const ALLOWED_PENETRATION = 0.5;

/** Below these thresholds a body's residual motion is treated as numerical
 * jitter and zeroed, so a settled structure stays rock-steady instead of
 * slowly creeping. The linear floor is far below one tick of free-fall
 * (GRAVITY/120 ~= 14 px/s), so a block that has genuinely just lost its
 * support is NEVER frozen — it is already moving faster than this the tick
 * after support vanishes. This is the generalisation of games/mini-golf's
 * STOP_SPEED snap-to-rest. */
const REST_LINEAR = 5.5; // px/s
const REST_ANGULAR = 0.05; // rad/s

/** Safety clamps so a pathological contact can never explode the sim. */
const MAX_SPEED = 5000; // px/s
const MAX_OMEGA = 40; // rad/s

// --- Destruction tuning -----------------------------------------------------

/** Contact approach speed (px/s) below which a contact deals no damage —
 * above one tick of gravity plus a margin, so resting/settling never chips a
 * block. */
export const DAMAGE_MIN_SPEED = 150;
/** hp removed per (px/s) of approach speed above the threshold. */
export const DAMAGE_SCALE = 0.075;
/** Boulder hits are extra destructive vs. block-on-block knocks. */
export const PROJECTILE_DAMAGE_MULT = 1.5;

/** Per-material defaults: density (mass per px^2), hit points, surface
 * friction, and neon render colour. Heavier stone resists being knocked and
 * takes more punishment; light wood shatters and flies; brittle glass is a
 * one-hit pane. Chosen so a full-power boulder shatters wood/glass outright
 * but only chips stone (so stone walls must be worn down or toppled, not
 * vaporised — which keeps the toppling physics the interesting path). */
export const MATERIALS = {
  stone: { density: 0.0032, hp: 130, friction: 0.62, color: '#7fd6ff' },
  wood: { density: 0.0016, hp: 42, friction: 0.55, color: '#ffb454' },
  glass: { density: 0.0013, hp: 18, friction: 0.28, color: '#b98cff' },
  // A heavy, tough "keystone" for capstones / anchors.
  granite: { density: 0.0044, hp: 220, friction: 0.7, color: '#9fb3d8' },
  // Targets (the enemies) — a body like any other so they can be crushed by
  // debris OR hit directly, both defeating them through the same hp path.
  target: { density: 0.0018, hp: 26, friction: 0.5, color: '#ff5c7a' },
};

// --- Vector / rotation helpers ---------------------------------------------

function axisX(a) { const c = Math.cos(a), s = Math.sin(a); return { x: c, y: s }; }
function axisY(a) { const c = Math.cos(a), s = Math.sin(a); return { x: -s, y: c }; }
function rotate(a, lx, ly) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: c * lx - s * ly, y: s * lx + c * ly };
}
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// Edge feature labels for contact-id persistence (warm starting).
const NO_EDGE = 0, EDGE1 = 1, EDGE2 = 2, EDGE3 = 3, EDGE4 = 4;
function packFeature(a, b, c, d) { return a + b * 5 + c * 25 + d * 125; }

// --- Bodies -----------------------------------------------------------------

let _idCounter = 1;
export function _resetIds() { _idCounter = 1; } // for deterministic test runs

export function makeBox(opts) {
  const {
    x, y, w, h, angle = 0, material = 'stone',
    isStatic = false, isTarget = false, isGround = false, hp = null,
  } = opts;
  const mat = MATERIALS[material] || MATERIALS.stone;
  const body = {
    id: _idCounter++,
    shape: 'box',
    x, y, angle,
    w, h, hw: w / 2, hh: h / 2,
    vx: 0, vy: 0, omega: 0,
    material, color: mat.color, friction: mat.friction,
    isStatic, isTarget, isProjectile: false, isGround,
    dead: false, gone: false,
    restTimer: 0, damageFlash: 0,
    maxHp: hp != null ? hp : mat.hp,
    hp: hp != null ? hp : mat.hp,
  };
  if (isStatic) {
    body.mass = Infinity; body.invMass = 0;
    body.inertia = Infinity; body.invInertia = 0;
  } else {
    const mass = mat.density * w * h;
    const inertia = mass * (w * w + h * h) / 12;
    body.mass = mass; body.invMass = 1 / mass;
    body.inertia = inertia; body.invInertia = 1 / inertia;
  }
  return body;
}

export function makeCircle(opts) {
  const { x, y, r, density = 0.006 } = opts;
  const mass = density * Math.PI * r * r;
  const inertia = 0.5 * mass * r * r;
  return {
    id: _idCounter++,
    shape: 'circle',
    x, y, angle: 0, r,
    vx: 0, vy: 0, omega: 0,
    friction: 0.5, color: '#ffd166',
    isStatic: false, isTarget: false, isProjectile: true, isGround: false,
    dead: false, gone: false,
    restTimer: 0, damageFlash: 0,
    maxHp: Infinity, hp: Infinity,
    mass, invMass: 1 / mass, inertia, invInertia: 1 / inertia,
  };
}

/** World-space corners of a box body, for rendering + geometry queries. */
export function boxCorners(b) {
  const ax = axisX(b.angle), ay = axisY(b.angle);
  const hw = b.hw, hh = b.hh;
  return [
    { x: b.x + ax.x * hw + ay.x * hh, y: b.y + ax.y * hw + ay.y * hh },
    { x: b.x - ax.x * hw + ay.x * hh, y: b.y - ax.y * hw + ay.y * hh },
    { x: b.x - ax.x * hw - ay.x * hh, y: b.y - ax.y * hw - ay.y * hh },
    { x: b.x + ax.x * hw - ay.x * hh, y: b.y + ax.y * hw - ay.y * hh },
  ];
}

function boundingRadius(b) {
  return b.shape === 'circle' ? b.r : Math.hypot(b.hw, b.hh);
}

// --- Collision detection ----------------------------------------------------

/** Incident edge of a box most anti-parallel to `normal` (box2d-lite's
 * ComputeIncidentEdge), returned as two world-space clip vertices with edge
 * feature ids attached for warm-start matching. */
function computeIncidentEdge(hw, hh, px, py, angle, nx, ny) {
  const c = Math.cos(angle), s = Math.sin(angle);
  // normal expressed in the box's local frame, then negated.
  const lnx = c * nx + s * ny;
  const lny = -s * nx + c * ny;
  const n0 = -lnx, n1 = -lny;
  const a0 = Math.abs(n0), a1 = Math.abs(n1);
  let v0, v1;
  if (a0 > a1) {
    if (n0 > 0) {
      v0 = { x: hw, y: -hh, inEdge2: EDGE3, outEdge2: EDGE4 };
      v1 = { x: hw, y: hh, inEdge2: EDGE4, outEdge2: EDGE1 };
    } else {
      v0 = { x: -hw, y: hh, inEdge2: EDGE1, outEdge2: EDGE2 };
      v1 = { x: -hw, y: -hh, inEdge2: EDGE2, outEdge2: EDGE3 };
    }
  } else {
    if (n1 > 0) {
      v0 = { x: hw, y: hh, inEdge2: EDGE4, outEdge2: EDGE1 };
      v1 = { x: -hw, y: hh, inEdge2: EDGE1, outEdge2: EDGE2 };
    } else {
      v0 = { x: -hw, y: -hh, inEdge2: EDGE3, outEdge2: EDGE4 };
      v1 = { x: hw, y: -hh, inEdge2: EDGE2, outEdge2: EDGE3 };
    }
  }
  const w0 = rotate(angle, v0.x, v0.y);
  const w1 = rotate(angle, v1.x, v1.y);
  return [
    { vx: px + w0.x, vy: py + w0.y, inEdge1: NO_EDGE, outEdge1: NO_EDGE, inEdge2: v0.inEdge2, outEdge2: v0.outEdge2 },
    { vx: px + w1.x, vy: py + w1.y, inEdge1: NO_EDGE, outEdge1: NO_EDGE, inEdge2: v1.inEdge2, outEdge2: v1.outEdge2 },
  ];
}

function clipSegmentToLine(vOut, vIn, nx, ny, offset, clipEdge) {
  let numOut = 0;
  const d0 = nx * vIn[0].vx + ny * vIn[0].vy - offset;
  const d1 = nx * vIn[1].vx + ny * vIn[1].vy - offset;
  if (d0 <= 0) vOut[numOut++] = { ...vIn[0] };
  if (d1 <= 0) vOut[numOut++] = { ...vIn[1] };
  if (d0 * d1 < 0) {
    const interp = d0 / (d0 - d1);
    const nv = {
      vx: vIn[0].vx + interp * (vIn[1].vx - vIn[0].vx),
      vy: vIn[0].vy + interp * (vIn[1].vy - vIn[0].vy),
    };
    if (d0 > 0) {
      nv.inEdge1 = clipEdge; nv.outEdge1 = vIn[0].outEdge1;
      nv.inEdge2 = NO_EDGE; nv.outEdge2 = vIn[0].outEdge2;
    } else {
      nv.inEdge1 = vIn[1].inEdge1; nv.outEdge1 = clipEdge;
      nv.inEdge2 = vIn[1].inEdge2; nv.outEdge2 = NO_EDGE;
    }
    vOut[numOut++] = nv;
  }
  return numOut;
}

/** Box-vs-box manifold, normal pointing from A to B. Returns up to 2
 * contacts: {px,py, nx,ny, sep(<=0), id}. */
function collideBoxBox(A, B) {
  const haX = A.hw, haY = A.hh, hbX = B.hw, hbY = B.hh;
  const aAxX = axisX(A.angle), aAxY = axisY(A.angle);
  const bAxX = axisX(B.angle), bAxY = axisY(B.angle);
  const dx = B.x - A.x, dy = B.y - A.y;

  const dAx = dx * aAxX.x + dy * aAxX.y;
  const dAy = dx * aAxY.x + dy * aAxY.y;
  const dBx = dx * bAxX.x + dy * bAxX.y;
  const dBy = dx * bAxY.x + dy * bAxY.y;

  const c00 = aAxX.x * bAxX.x + aAxX.y * bAxX.y;
  const c01 = aAxX.x * bAxY.x + aAxX.y * bAxY.y;
  const c10 = aAxY.x * bAxX.x + aAxY.y * bAxX.y;
  const c11 = aAxY.x * bAxY.x + aAxY.y * bAxY.y;
  const ac00 = Math.abs(c00) + 1e-9, ac01 = Math.abs(c01) + 1e-9;
  const ac10 = Math.abs(c10) + 1e-9, ac11 = Math.abs(c11) + 1e-9;

  const faceAx = Math.abs(dAx) - haX - (ac00 * hbX + ac01 * hbY);
  const faceAy = Math.abs(dAy) - haY - (ac10 * hbX + ac11 * hbY);
  if (faceAx > 0 || faceAy > 0) return [];
  const faceBx = Math.abs(dBx) - (ac00 * haX + ac10 * haY) - hbX;
  const faceBy = Math.abs(dBy) - (ac01 * haX + ac11 * haY) - hbY;
  if (faceBx > 0 || faceBy > 0) return [];

  const relTol = 0.95, absTol = 0.01;
  let axis = 'AX', sep = faceAx;
  let nx = dAx > 0 ? aAxX.x : -aAxX.x;
  let ny = dAx > 0 ? aAxX.y : -aAxX.y;
  if (faceAy > relTol * sep + absTol * haY) {
    axis = 'AY'; sep = faceAy;
    nx = dAy > 0 ? aAxY.x : -aAxY.x; ny = dAy > 0 ? aAxY.y : -aAxY.y;
  }
  if (faceBx > relTol * sep + absTol * hbX) {
    axis = 'BX'; sep = faceBx;
    nx = dBx > 0 ? bAxX.x : -bAxX.x; ny = dBx > 0 ? bAxX.y : -bAxX.y;
  }
  if (faceBy > relTol * sep + absTol * hbY) {
    axis = 'BY'; sep = faceBy;
    nx = dBy > 0 ? bAxY.x : -bAxY.x; ny = dBy > 0 ? bAxY.y : -bAxY.y;
  }

  let frontNx, frontNy, front, sideNx, sideNy, negSide, posSide, negEdge, posEdge, incident;
  if (axis === 'AX') {
    frontNx = nx; frontNy = ny; front = A.x * frontNx + A.y * frontNy + haX;
    sideNx = aAxY.x; sideNy = aAxY.y;
    const side = A.x * sideNx + A.y * sideNy;
    negSide = -side + haY; posSide = side + haY; negEdge = EDGE3; posEdge = EDGE1;
    incident = computeIncidentEdge(hbX, hbY, B.x, B.y, B.angle, frontNx, frontNy);
  } else if (axis === 'AY') {
    frontNx = nx; frontNy = ny; front = A.x * frontNx + A.y * frontNy + haY;
    sideNx = aAxX.x; sideNy = aAxX.y;
    const side = A.x * sideNx + A.y * sideNy;
    negSide = -side + haX; posSide = side + haX; negEdge = EDGE2; posEdge = EDGE4;
    incident = computeIncidentEdge(hbX, hbY, B.x, B.y, B.angle, frontNx, frontNy);
  } else if (axis === 'BX') {
    frontNx = -nx; frontNy = -ny; front = B.x * frontNx + B.y * frontNy + hbX;
    sideNx = bAxY.x; sideNy = bAxY.y;
    const side = B.x * sideNx + B.y * sideNy;
    negSide = -side + hbY; posSide = side + hbY; negEdge = EDGE3; posEdge = EDGE1;
    incident = computeIncidentEdge(haX, haY, A.x, A.y, A.angle, frontNx, frontNy);
  } else {
    frontNx = -nx; frontNy = -ny; front = B.x * frontNx + B.y * frontNy + hbY;
    sideNx = bAxX.x; sideNy = bAxX.y;
    const side = B.x * sideNx + B.y * sideNy;
    negSide = -side + hbX; posSide = side + hbX; negEdge = EDGE2; posEdge = EDGE4;
    incident = computeIncidentEdge(haX, haY, A.x, A.y, A.angle, frontNx, frontNy);
  }

  const cp1 = [];
  if (clipSegmentToLine(cp1, incident, -sideNx, -sideNy, negSide, negEdge) < 2) return [];
  const cp2 = [];
  if (clipSegmentToLine(cp2, cp1, sideNx, sideNy, posSide, posEdge) < 2) return [];

  const flip = axis === 'BX' || axis === 'BY';
  const contacts = [];
  for (let i = 0; i < 2; i++) {
    const cv = cp2[i];
    const separation = frontNx * cv.vx + frontNy * cv.vy - front;
    if (separation <= 0) {
      const id = flip
        ? packFeature(cv.inEdge2, cv.outEdge2, cv.inEdge1, cv.outEdge1)
        : packFeature(cv.inEdge1, cv.outEdge1, cv.inEdge2, cv.outEdge2);
      contacts.push({
        px: cv.vx - separation * frontNx,
        py: cv.vy - separation * frontNy,
        nx, ny, sep: separation, id,
      });
    }
  }
  return contacts;
}

/** Circle(A)-vs-box(B) manifold, normal from A to B. Single contact. */
function collideCircleBox(circ, box) {
  const dx = circ.x - box.x, dy = circ.y - box.y;
  const bx = axisX(box.angle), by = axisY(box.angle);
  const lx = dx * bx.x + dy * bx.y;
  const ly = dx * by.x + dy * by.y;
  const cx = clamp(lx, -box.hw, box.hw);
  const cy = clamp(ly, -box.hh, box.hh);
  const ddx = lx - cx, ddy = ly - cy;
  const distSq = ddx * ddx + ddy * ddy;
  if (distSq > circ.r * circ.r) return [];
  let nlx, nly, sep;
  if (distSq > 1e-9) {
    const dist = Math.sqrt(distSq);
    nlx = -ddx / dist; nly = -ddy / dist; // circle -> box
    sep = dist - circ.r;
  } else {
    const ox = box.hw - Math.abs(lx);
    const oy = box.hh - Math.abs(ly);
    if (ox < oy) { nlx = lx < 0 ? 1 : -1; nly = 0; sep = -(ox + circ.r); }
    else { nlx = 0; nly = ly < 0 ? 1 : -1; sep = -(oy + circ.r); }
  }
  return [{
    px: box.x + bx.x * cx + by.x * cy,
    py: box.y + bx.y * cx + by.y * cy,
    nx: bx.x * nlx + by.x * nly,
    ny: bx.y * nlx + by.y * nly,
    sep, id: 0,
  }];
}

/** Dispatch collision, always returning a manifold with normal from A to B. */
function collide(A, B) {
  if (A.shape === 'box' && B.shape === 'box') return collideBoxBox(A, B);
  if (A.shape === 'circle' && B.shape === 'box') return collideCircleBox(A, B);
  if (A.shape === 'box' && B.shape === 'circle') {
    const cs = collideCircleBox(B, A); // normal circle(B) -> box(A)
    for (const c of cs) { c.nx = -c.nx; c.ny = -c.ny; } // -> A -> B
    return cs;
  }
  return [];
}

// --- Arbiter (per body-pair contact solver) --------------------------------

function makeArbiter(A, B, contacts) {
  return {
    a: A, b: B, contacts,
    friction: Math.sqrt(A.friction * B.friction),
    impactSpeed: 0,
  };
}

/** Merge freshly-detected contacts into an existing arbiter, carrying over
 * accumulated impulses for contacts whose feature id survived — this
 * warm-starting is the single biggest reason resting stacks stay stable. */
function updateArbiterContacts(arb, fresh) {
  for (const nc of fresh) {
    const old = arb.contacts.find((c) => c.id === nc.id);
    nc.Pn = old ? old.Pn : 0;
    nc.Pt = old ? old.Pt : 0;
  }
  arb.contacts = fresh;
}

function preStep(arb, invDt) {
  const a = arb.a, b = arb.b;
  let impact = 0;
  for (const c of arb.contacts) {
    if (c.Pn == null) { c.Pn = 0; c.Pt = 0; }
    const r1x = c.px - a.x, r1y = c.py - a.y;
    const r2x = c.px - b.x, r2y = c.py - b.y;

    const rn1 = r1x * c.nx + r1y * c.ny;
    const rn2 = r2x * c.nx + r2y * c.ny;
    let kn = a.invMass + b.invMass;
    kn += a.invInertia * (r1x * r1x + r1y * r1y - rn1 * rn1)
        + b.invInertia * (r2x * r2x + r2y * r2y - rn2 * rn2);
    c.massN = 1 / kn;

    const tx = c.ny, ty = -c.nx;
    const rt1 = r1x * tx + r1y * ty;
    const rt2 = r2x * tx + r2y * ty;
    let kt = a.invMass + b.invMass;
    kt += a.invInertia * (r1x * r1x + r1y * r1y - rt1 * rt1)
        + b.invInertia * (r2x * r2x + r2y * r2y - rt2 * rt2);
    c.massT = 1 / kt;

    c.bias = -BIAS_FACTOR * invDt * Math.min(0, c.sep + ALLOWED_PENETRATION);

    // Approach speed (for destruction) — relative normal velocity at the
    // contact, measured before we resolve it. Resting contacts read ~0.
    const dvx = (b.vx - b.omega * r2y) - (a.vx - a.omega * r1y);
    const dvy = (b.vy + b.omega * r2x) - (a.vy + a.omega * r1x);
    const vn = dvx * c.nx + dvy * c.ny;
    if (-vn > impact) impact = -vn;

    // Warm start: re-apply last frame's accumulated impulse.
    const px = c.Pn * c.nx + c.Pt * tx;
    const py = c.Pn * c.ny + c.Pt * ty;
    a.vx -= a.invMass * px; a.vy -= a.invMass * py;
    a.omega -= a.invInertia * (r1x * py - r1y * px);
    b.vx += b.invMass * px; b.vy += b.invMass * py;
    b.omega += b.invInertia * (r2x * py - r2y * px);
  }
  arb.impactSpeed = impact;
}

function applyImpulse(arb) {
  const a = arb.a, b = arb.b;
  for (const c of arb.contacts) {
    const r1x = c.px - a.x, r1y = c.py - a.y;
    const r2x = c.px - b.x, r2y = c.py - b.y;

    // Normal impulse.
    let dvx = (b.vx - b.omega * r2y) - (a.vx - a.omega * r1y);
    let dvy = (b.vy + b.omega * r2x) - (a.vy + a.omega * r1x);
    let vn = dvx * c.nx + dvy * c.ny;
    let dPn = c.massN * (-vn + c.bias);
    const Pn0 = c.Pn;
    c.Pn = Math.max(Pn0 + dPn, 0);
    dPn = c.Pn - Pn0;
    let px = dPn * c.nx, py = dPn * c.ny;
    a.vx -= a.invMass * px; a.vy -= a.invMass * py;
    a.omega -= a.invInertia * (r1x * py - r1y * px);
    b.vx += b.invMass * px; b.vy += b.invMass * py;
    b.omega += b.invInertia * (r2x * py - r2y * px);

    // Friction impulse (clamped to the Coulomb cone of the normal impulse).
    dvx = (b.vx - b.omega * r2y) - (a.vx - a.omega * r1y);
    dvy = (b.vy + b.omega * r2x) - (a.vy + a.omega * r1x);
    const tx = c.ny, ty = -c.nx;
    const vt = dvx * tx + dvy * ty;
    let dPt = c.massT * (-vt);
    const maxPt = arb.friction * c.Pn;
    const Pt0 = c.Pt;
    c.Pt = clamp(Pt0 + dPt, -maxPt, maxPt);
    dPt = c.Pt - Pt0;
    px = dPt * tx; py = dPt * ty;
    a.vx -= a.invMass * px; a.vy -= a.invMass * py;
    a.omega -= a.invInertia * (r1x * py - r1y * px);
    b.vx += b.invMass * px; b.vy += b.invMass * py;
    b.omega += b.invInertia * (r2x * py - r2y * px);
  }
}

// --- World ------------------------------------------------------------------

export function createWorld(opts = {}) {
  return {
    bodies: [],
    arbiters: new Map(),
    bounds: opts.bounds || { minX: -400, maxX: 1120, maxY: 1300 },
  };
}

export function addBody(world, body) { world.bodies.push(body); return body; }

function aabbOverlap(a, b) {
  const ra = boundingRadius(a) + 2;
  const rb = boundingRadius(b) + 2;
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy <= (ra + rb) * (ra + rb);
}

function applyDamage(body, dmg, fromProjectile, events) {
  if (body.isStatic || body.isProjectile || body.dead) return;
  body.hp -= dmg * (fromProjectile ? PROJECTILE_DAMAGE_MULT : 1);
  body.damageFlash = 1;
  if (body.hp <= 0) {
    body.dead = true;
    events.push({ type: 'break', body, x: body.x, y: body.y });
  }
}

/**
 * Advance the whole world by dt seconds (call with a small FIXED dt — game.js
 * runs an accumulator at 1/120s). Returns an array of event objects:
 *   {type:'impact', x,y, speed}   — a hard contact (for sfx/dust)
 *   {type:'break', body, x,y}     — a block/target destroyed or fell away
 * The heavy lifting (toppling, support loss, cascades) is all emergent from
 * the contact solver below; nothing here scripts a collapse.
 */
export function stepWorld(world, dt) {
  const events = [];
  const invDt = dt > 0 ? 1 / dt : 0;
  const bodies = world.bodies;

  // Broadphase + narrowphase: rebuild the arbiter set for this tick.
  const seen = new Set();
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      let A = bodies[i], B = bodies[j];
      if (A.isStatic && B.isStatic) continue;
      if (A.id > B.id) { const t = A; A = B; B = t; } // stable A<B order
      if (!aabbOverlap(A, B)) continue;
      const cs = collide(A, B);
      const key = A.id + '-' + B.id;
      if (cs.length > 0) {
        const existing = world.arbiters.get(key);
        if (existing) { updateArbiterContacts(existing, cs); }
        else { for (const c of cs) { c.Pn = 0; c.Pt = 0; } world.arbiters.set(key, makeArbiter(A, B, cs)); }
        seen.add(key);
      } else {
        world.arbiters.delete(key);
      }
    }
  }
  for (const key of [...world.arbiters.keys()]) if (!seen.has(key)) world.arbiters.delete(key);

  // Integrate forces (gravity).
  for (const b of bodies) {
    if (b.invMass === 0) continue;
    b.vy += GRAVITY * dt;
  }

  // Solve.
  for (const arb of world.arbiters.values()) preStep(arb, invDt);
  for (let it = 0; it < SOLVER_ITERATIONS; it++) {
    for (const arb of world.arbiters.values()) applyImpulse(arb);
  }

  // Integrate velocities into positions, then snap-to-rest tiny jitter.
  for (const b of bodies) {
    if (b.invMass === 0) continue;
    // Clamp against blow-ups.
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAX_SPEED) { const k = MAX_SPEED / sp; b.vx *= k; b.vy *= k; }
    if (b.omega > MAX_OMEGA) b.omega = MAX_OMEGA;
    else if (b.omega < -MAX_OMEGA) b.omega = -MAX_OMEGA;

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.angle += b.omega * dt;

    if (b.damageFlash > 0) b.damageFlash = Math.max(0, b.damageFlash - dt * 3);

    if (Math.hypot(b.vx, b.vy) < REST_LINEAR && Math.abs(b.omega) < REST_ANGULAR) {
      b.vx = 0; b.vy = 0; b.omega = 0;
      b.restTimer += dt;
    } else {
      b.restTimer = 0;
    }
  }

  // Destruction from hard contacts (approach speed above threshold).
  for (const arb of world.arbiters.values()) {
    if (arb.impactSpeed <= DAMAGE_MIN_SPEED) continue;
    const dmg = (arb.impactSpeed - DAMAGE_MIN_SPEED) * DAMAGE_SCALE;
    const a = arb.a, b = arb.b;
    applyDamage(a, dmg, b.isProjectile, events);
    applyDamage(b, dmg, a.isProjectile, events);
    const c = arb.contacts[0];
    events.push({ type: 'impact', x: c ? c.px : (a.x + b.x) / 2, y: c ? c.py : (a.y + b.y) / 2, speed: arb.impactSpeed });
  }

  // Retire dead / off-arena bodies.
  const bnd = world.bounds;
  for (const b of bodies) {
    if (b.dead) continue;
    if (b.y > bnd.maxY || b.x < bnd.minX || b.x > bnd.maxX) {
      b.dead = true; b.gone = true;
      events.push({ type: 'break', body: b, x: b.x, y: b.y, offscreen: true });
    }
  }
  if (bodies.some((b) => b.dead)) {
    for (const b of bodies) {
      if (!b.dead) continue;
      for (const key of [...world.arbiters.keys()]) {
        if (key.startsWith(b.id + '-') || key.endsWith('-' + b.id)) world.arbiters.delete(key);
      }
    }
    world.bodies = bodies.filter((b) => !b.dead);
  }

  return events;
}

/** Largest kinetic signature across dynamic bodies — game.js uses this to
 * decide when a shot has fully settled. */
export function maxMotion(world) {
  let lin = 0, ang = 0;
  for (const b of world.bodies) {
    if (b.invMass === 0) continue;
    lin = Math.max(lin, Math.hypot(b.vx, b.vy));
    ang = Math.max(ang, Math.abs(b.omega));
  }
  return { lin, ang };
}
