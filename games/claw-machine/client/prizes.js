/**
 * prizes.js — pure model for Claw Machine: world/claw space constants, the
 * prize type table (stats only — no canvas/ctx code, same "model module
 * owns shared constants, render module imports them" split as
 * games/paintball's targets.js/render.js), pit scatter generation, the
 * grip/slip probability curves, and simple gravity/bounce physics for a
 * prize that tumbles back into the pile after a failed carry.
 *
 * Coordinate space (world units, NOT pixels — render3d.js's project()
 * turns these into screen pixels):
 *   x — left/right, 0 = pit center, negative = left, positive = right.
 *   y — depth into the machine, 0 = nearest the glass, PIT_Y_FAR = the
 *       back wall. "Farther" always means larger y.
 *   z — height, 0 = pit floor, RAIL_Z = the claw's idle/travel height.
 * This file never touches a canvas; render3d.js and game.js do.
 */

// --- World / cabinet space --------------------------------------------------

export const CANVAS_W = 720;
export const CANVAS_H = 1000;

export const PIT_X_MIN = -100;
export const PIT_X_MAX = 100;
export const PIT_Y_NEAR = 0;
export const PIT_Y_FAR = 150;
export const WALL_TOP_Z = 195; // where the pit's glass side/back walls end

export const RAIL_Z = 165; // claw's idle travel height (the gantry rail)
export const PIT_FLOOR_Z = 0;

// Claw travel is inset from the pit walls so the head/cable never clips
// through glass, and inset from the very front edge so the claw (and a
// carried prize) stay inside the glass viewport while carrying.
export const CLAW_X_MIN = PIT_X_MIN + 14;
export const CLAW_X_MAX = PIT_X_MAX - 14;
export const CLAW_Y_MIN = PIT_Y_NEAR + 14;
export const CLAW_Y_MAX = PIT_Y_FAR - 14;

// The chute: a fixed drop point near-front, to one side (front-right), with
// its own little floor slot rendered by render3d.js. Carrying always ends
// here before the claw releases.
export const CHUTE = { x: CLAW_X_MAX - 6, y: CLAW_Y_MIN + 4 };

// --- Prize types -------------------------------------------------------------
// `radius` is a world-unit half-size used for both the grab window
// (grabRadiusFor) and sprite scale. `gripMul` multiplies the base grip
// success curve — round/small/light prizes are forgiving, bulky plush and
// the rare high-value tokens are deliberately less so (the payoff for a
// gem or star is the challenge). Colors are concrete hex strings (canvas
// fill/stroke needs strings either way — same convention as
// games/paintball's and games/mini-golf's draw code), not read from CSS.
export const PRIZE_TYPES = {
  ball: {
    id: 'ball', radius: 15, points: 60, gripMul: 1.25, weight: 26,
    color: '#5ce1ff', fill: '#123246', glow: '#5ce1ff',
  },
  box: {
    id: 'box', radius: 20, points: 140, gripMul: 0.95, weight: 22,
    color: '#ff9d4d', fill: '#3a2410', glow: '#ff9d4d',
  },
  bear: {
    id: 'bear', radius: 26, points: 220, gripMul: 0.80, weight: 18,
    color: '#e8a15c', fill: '#402a12', glow: '#e8a15c',
  },
  bunny: {
    id: 'bunny', radius: 25, points: 240, gripMul: 0.78, weight: 18,
    color: '#ff8fd6', fill: '#3a1730', glow: '#ff8fd6',
  },
  star: {
    id: 'star', radius: 14, points: 320, gripMul: 1.05, weight: 9,
    color: '#ffd166', fill: '#3a2c08', glow: '#ffd166',
  },
  gem: {
    id: 'gem', radius: 13, points: 400, gripMul: 0.90, weight: 7,
    color: '#c68fff', fill: '#2a1640', glow: '#e8d0ff',
  },
};

const SPAWN_TABLE = Object.values(PRIZE_TYPES);
const SPAWN_TOTAL = SPAWN_TABLE.reduce((s, t) => s + t.weight, 0);

function pickWeightedType() {
  let r = Math.random() * SPAWN_TOTAL;
  for (const t of SPAWN_TABLE) {
    r -= t.weight;
    if (r < 0) return t.id;
  }
  return SPAWN_TABLE[0].id;
}

// --- Grab window + grip/slip probability curves -----------------------------
// Grip success depends only on how far the claw's (x,y) is from a prize's
// (x,y) center at the moment it stops descending — closer is always better.
// GRAB_PAD is added to a prize's own radius, so bigger prizes are (a little)
// more forgiving to line up on and small/rare ones (star, gem) genuinely
// need precision, on top of their lower gripMul.
export const GRAB_PAD = 14;
export function grabRadiusFor(type) {
  return type.radius + GRAB_PAD;
}

// Tuned so a dead-center drop and a drop near the edge of the grab window
// are meaningfully different in overall pull-it-off odds, without either
// being a sure thing or a sure loss. Center-of-window (t=0), average-gripMul
// prize: ~0.85 grab chance. Edge-of-window (t=1): ~0.08 grab chance before
// gripMul. See slipChance below for the matching lift/carry risk curve.
export const GRIP_MAX = 0.85;
export const GRIP_MIN = 0.08;
export const GRIP_FALLOFF_POW = 1.4;

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/** dist: world-unit distance from claw (x,y) to the target prize's (x,y). */
export function gripChance(dist, type) {
  const r = grabRadiusFor(type);
  if (dist > r) return 0;
  const t = clamp01(dist / r);
  const base = GRIP_MAX - (GRIP_MAX - GRIP_MIN) * (t ** GRIP_FALLOFF_POW);
  return clamp(base * type.gripMul, 0.01, 0.97);
}

// Even a successful grab can slip mid-lift or mid-carry — classic claw
// machine frustration. Risk scales with the SAME centering fraction `t` used
// for the grab roll itself, so a marginal-but-successful grab is meaningfully
// more likely to shake loose than a dead-center one: skilled precise play
// compounds its advantage across both rolls, but even a perfect t=0 grab
// keeps a small non-zero slip chance (real claws are never 100% reliable).
export const SLIP_LIFT_BASE = 0.08;
export const SLIP_LIFT_EDGE = 0.42;
export const SLIP_CARRY_BASE = 0.04;
export const SLIP_CARRY_EDGE = 0.20;

export function slipChance(dist, type, phase) {
  const r = grabRadiusFor(type);
  const t = clamp01(dist / r);
  return phase === 'lift'
    ? SLIP_LIFT_BASE + (SLIP_LIFT_EDGE - SLIP_LIFT_BASE) * t
    : SLIP_CARRY_BASE + (SLIP_CARRY_EDGE - SLIP_CARRY_BASE) * t;
}

// --- Pit scatter --------------------------------------------------------------

function randRange(lo, hi) { return lo + Math.random() * (hi - lo); }
let prizeSeq = 0;

/** Fresh pile of prizes scattered across the pit, deliberately allowing
 * overlap in (x,y) (real claw pits are a jumbled pile, not a grid) — a
 * small random `restZ` per prize fakes pile height so overlapping prizes
 * still read as "stacked" once depth-sorted and drawn (see render3d.js's
 * drawScene depth sort). */
export function scatterPrizes(count = 16) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const typeId = pickWeightedType();
    const type = PRIZE_TYPES[typeId];
    const x = randRange(PIT_X_MIN + type.radius * 0.7, PIT_X_MAX - type.radius * 0.7);
    const y = randRange(PIT_Y_NEAR + 16, PIT_Y_FAR - 12);
    list.push({
      uid: `pz${prizeSeq++}`,
      type: typeId,
      x,
      y,
      z: Math.random() * 14,
      rot: Math.random() * Math.PI * 2,
      state: 'resting', // resting | held | falling
      vx: 0, vy: 0, vz: 0,
      bounces: 0,
    });
  }
  return list;
}

// --- Falling-prize physics ----------------------------------------------------
// A slipped (or never-grabbed-but-nudged) prize tumbles: gravity pulls it
// down, it bounces on the pit floor losing energy each time (restitution),
// with horizontal drag, until it's slow enough to settle back into the pile
// — a few visible bounces, not a teleport, per the design brief.

export const GRAVITY = 460; // world z-units/s^2
export const BOUNCE_RESTITUTION = 0.38;
export const AIR_DRAG = 0.997; // per-step horizontal velocity retention while airborne
export const GROUND_DRAG = 0.55; // extra horizontal velocity retention applied at each bounce
export const SETTLE_SPEED_Z = 16;
export const MAX_BOUNCES = 4;

export function startFalling(prize, opts = {}) {
  prize.state = 'falling';
  prize.vx = (Math.random() - 0.5) * (opts.kick ?? 55);
  prize.vy = (Math.random() - 0.5) * (opts.kick ?? 55);
  prize.vz = opts.vz ?? 20 + Math.random() * 30;
  prize.bounces = 0;
}

/** Advance one falling prize by dt seconds. Mutates in place; caller drops
 * the object back into the normal resting-prize list once state flips to
 * 'resting' (it's already the same object, so no re-registration needed if
 * the caller kept a live array reference). */
export function stepFallingPrize(prize, dt) {
  if (prize.state !== 'falling') return;
  prize.vz -= GRAVITY * dt;
  prize.x += prize.vx * dt;
  prize.y += prize.vy * dt;
  prize.z += prize.vz * dt;
  prize.vx *= AIR_DRAG;
  prize.vy *= AIR_DRAG;
  prize.rot += (Math.hypot(prize.vx, prize.vy) * 0.01 + Math.abs(prize.vz) * 0.006) * dt;

  const type = PRIZE_TYPES[prize.type];
  prize.x = clamp(prize.x, PIT_X_MIN + type.radius * 0.5, PIT_X_MAX - type.radius * 0.5);
  prize.y = clamp(prize.y, PIT_Y_NEAR + 6, PIT_Y_FAR - 6);

  if (prize.z <= 0) {
    prize.z = 0;
    prize.vz = -prize.vz * BOUNCE_RESTITUTION;
    prize.vx *= GROUND_DRAG;
    prize.vy *= GROUND_DRAG;
    prize.bounces += 1;
    if (Math.abs(prize.vz) < SETTLE_SPEED_Z || prize.bounces >= MAX_BOUNCES) {
      prize.state = 'resting';
      prize.z = Math.random() * 10;
      prize.vx = 0; prize.vy = 0; prize.vz = 0;
    }
  }
}

/** Nearest resting prize to (x,y) within its own grab window, or null.
 * Used both to decide where the claw's drop stops (the pile "floor" at that
 * x/y) and as the grab-roll target. */
export function nearestPrizeAt(prizes, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const p of prizes) {
    if (p.state !== 'resting') continue;
    const type = PRIZE_TYPES[p.type];
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= grabRadiusFor(type) && d < bestDist) { best = p; bestDist = d; }
  }
  return best ? { prize: best, dist: bestDist } : null;
}
