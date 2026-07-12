/**
 * Hill Rider — vehicle physics module.
 *
 * The only player inputs are gas and brake — no steering. Everything about
 * the vehicle's orientation is *derived*, never directly set by input:
 *
 * - While grounded, the chassis angle chases the line through the terrain
 *   height sampled under the front and rear wheel positions (the same
 *   front/rear sampling shape as terrain.js's slopeAt), so the body visibly
 *   tilts to match the slope under it, not just translated in a straight
 *   line. A small additive "tilt offset" (eased toward a target based on
 *   gas/brake) rides on top of that terrain angle — gas noses the body up a
 *   touch, brake noses it down, the authentic weight-transfer cue this
 *   genre always has.
 * - While airborne (both wheels off the ground), the chassis angle is no
 *   longer slaved to any terrain sample — it integrates its own angular
 *   velocity, which gas/brake accelerate in the very same direction as the
 *   grounded tilt-offset (gas = nose up, brake = nose down). That's the
 *   genre's core air-control skill: rotate to land level.
 *
 * Grounded vs. airborne is resolved every frame by comparing two
 * candidates computed at the *same* tentative next-x (never the stale
 * pre-move x, or sharp local slope changes would read a frame late):
 *   - `candidateY`: where gravity alone would put the chassis this frame
 *     (a free-fall/ballistic integration from the current vy).
 *   - `targetY`: where the terrain-contact line actually is at that x.
 * If the ballistic candidate has reached or passed the contact line
 * (candidateY >= targetY, remembering +Y is down), the ground catches it:
 * snap to the terrain line, resolve forward speed from the slope tangent.
 * Otherwise it's still above the line: let it fall freely. This one
 * comparison naturally covers ordinary rolling-hill driving, launching off
 * a crest that falls away faster than gravity can follow, and landing —
 * no separate "am I taking off" special case needed.
 *
 * Crash detection is intentionally gated to grounded frames only (see the
 * bottom of stepVehicle): an extreme tilt is only a crash once the vehicle
 * is actually resting on/touching the terrain that way (a hard nose/tail
 * landing, or having toppled past recovery on the ground). Rotating
 * through any angle purely in mid-air, however extreme, is always safe —
 * that freedom is the entire point of the air-tilt control above; crashing
 * mid-flip before ever landing would make it useless.
 */
import { heightAt } from './terrain.js';

export const CONFIG = {
  WHEEL_OFFSET: 26, // half wheelbase, world units — front/rear sample points
  GRAVITY: 1500, // world units/s^2, vertical, applied while airborne
  // SLOPE_GRAVITY vs THROTTLE_ACCEL sets the full-throttle equilibrium climb
  // angle (asin(THROTTLE_ACCEL/SLOPE_GRAVITY), ~44deg at these values): any
  // sustained slope steeper than that cannot be climbed from a standing
  // start at all, only carried through on momentum from an earlier
  // downhill -- that's intentional genre tension, but it has to leave
  // headroom above ordinary terrain's typical slope (see terrain.js) or the
  // vehicle can get trapped rocking in place on perfectly normal ground.
  SLOPE_GRAVITY: 430,
  THROTTLE_ACCEL: 320,
  BRAKE_ACCEL: 340,
  MAX_SPEED: 380,
  MAX_REVERSE_SPEED: 150,
  ROLL_RESISTANCE: 0.35, // per-second speed decay coefficient (coasting drag)

  GROUND_ANGLE_CHASE_RATE: 16, // 1/s exponential chase toward terrain angle
  ACCEL_TILT_MAX: 0.16, // rad (~9deg) cosmetic nose-up under gas while grounded
  BRAKE_TILT_MAX: 0.12, // rad (~7deg) cosmetic nose-down under brake while grounded
  TILT_EASE_RATE: 6, // 1/s ease for the cosmetic tilt offset

  AIR_TILT_ACCEL: 5.5, // rad/s^2 angular accel from gas/brake while airborne
  MAX_AIR_ANGVEL: 3.2, // rad/s clamp
  AIR_ANGULAR_DAMP: 0.6, // per-second decay so held input reaches a terminal rate

  CRASH_ANGLE_DEG: 95, // grounded |angle| past this = crash

  FUEL_MAX: 100,
  FUEL_DRAIN_BASE: 0.25, // %/s idle trickle
  FUEL_DRAIN_SPEED_COEF: 2.2, // %/s extra at full speed (a distance proxy)
  FUEL_REFILL: 45, // % restored per canister

  STOP_EPSILON: 6, // |speed| below this counts as "coasted to a stop"
};

/** Reset an existing vehicle object's fields in place (mutates, never
 * reassigns) — so a live reference to `car` held elsewhere (e.g. a debug
 * hook, or a closure captured at module init) stays valid across restarts
 * instead of going stale. Same precedent as void-drift's resetShip(). */
export function resetVehicle(car, startX = 0) {
  car.x = startX;
  car.y = heightAt(startX);
  car.angle = 0;
  car.vx = 0;
  car.vy = 0;
  car.speed = 0;
  car.angularVelocity = 0;
  car.tiltOffset = 0;
  car.grounded = true;
  car.airTime = 0;
  car.fuel = CONFIG.FUEL_MAX;
  car.crashed = false;
  return car;
}

export function makeVehicle(startX = 0) {
  return resetVehicle({}, startX);
}

/** Wrap into (-pi, pi]. */
function normalizeAngle(a) {
  let r = a % (Math.PI * 2);
  if (r > Math.PI) r -= Math.PI * 2;
  if (r < -Math.PI) r += Math.PI * 2;
  return r;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function lerp(a, b, f) {
  return a + (b - a) * f;
}
/** Exponential-chase lerp of an angle toward a target, shortest way round. */
function lerpAngle(a, b, f) {
  return a + normalizeAngle(b - a) * f;
}

/**
 * Advance the vehicle by dt seconds. Mutates `car` in place.
 * @param {object} car vehicle state from makeVehicle()
 * @param {{gas:boolean, brake:boolean}} input
 * @param {number} dt seconds
 * @param {object} [cfg] tuning, defaults to CONFIG
 * @param {{onLand?:Function, onTakeoff?:Function, onCrash?:Function}} [hooks]
 */
export function stepVehicle(car, input, dt, cfg = CONFIG, hooks) {
  if (car.crashed) return;
  const wasGrounded = car.grounded;
  const hasFuel = car.fuel > 0;

  // 1. Candidate horizontal motion first, at the OLD angle/speed — both
  // branches below sample terrain at this same tentative x.
  let candidateVx;
  if (car.grounded) {
    const gravityAlong = cfg.SLOPE_GRAVITY * Math.sin(car.angle);
    const rolling = -cfg.ROLL_RESISTANCE * car.speed;
    let accel = gravityAlong + rolling;
    if (input.gas && hasFuel) accel += cfg.THROTTLE_ACCEL;
    if (input.brake) accel -= cfg.BRAKE_ACCEL;
    car.speed = clamp(car.speed + accel * dt, -cfg.MAX_REVERSE_SPEED, cfg.MAX_SPEED);
    candidateVx = car.speed * Math.cos(car.angle);
    car.vy = car.speed * Math.sin(car.angle); // keep vy consistent with speed for the ballistic candidate below
  } else {
    candidateVx = car.vx; // momentum preserved — no horizontal air control, only rotation
  }
  const candidateX = car.x + candidateVx * dt;

  // 2. Terrain contact line at the candidate x (fixed horizontal wheel
  // offsets — a deliberate simplification; the chassis angle already
  // reflects tilt, re-projecting the offsets by cos(angle) buys little and
  // adds a degenerate case near +-90deg for no real benefit here).
  const frontX = candidateX + cfg.WHEEL_OFFSET;
  const rearX = candidateX - cfg.WHEEL_OFFSET;
  const frontY = heightAt(frontX);
  const rearY = heightAt(rearX);
  const targetAngle = Math.atan2(frontY - rearY, frontX - rearX);
  const targetY = (frontY + rearY) / 2;

  // 3. Ballistic candidate — what gravity alone does to vy/y this frame.
  const candidateVy = car.vy + cfg.GRAVITY * dt;
  const candidateY = car.y + candidateVy * dt;

  // 4. The ground catches the vehicle iff the free-falling candidate has
  // reached or passed the contact line (+Y is down). This single test
  // covers ordinary rolling-hill driving, launching off a crest that falls
  // away faster than gravity can follow, and landing back down.
  const nowGrounded = candidateY >= targetY;

  if (nowGrounded) {
    if (!wasGrounded) {
      // Landing: project the airborne velocity onto the new surface
      // tangent (the perpendicular/impact component is absorbed by
      // "suspension", not bounced), and fold the possibly-large
      // accumulated air-rotation angle back into (-pi,pi] before resuming
      // ground-angle chasing from it.
      const tx = Math.cos(targetAngle);
      const ty = Math.sin(targetAngle);
      car.speed = candidateVx * tx + candidateVy * ty;
      car.angle = normalizeAngle(car.angle);
      hooks?.onLand?.(car, Math.abs(candidateVy));
    }
    car.x = candidateX;
    car.y = targetY;

    const tiltTarget = input.gas && hasFuel ? -cfg.ACCEL_TILT_MAX : input.brake ? cfg.BRAKE_TILT_MAX : 0;
    car.tiltOffset = lerp(car.tiltOffset, tiltTarget, 1 - Math.exp(-cfg.TILT_EASE_RATE * dt));

    const chase = 1 - Math.exp(-cfg.GROUND_ANGLE_CHASE_RATE * dt);
    car.angle = lerpAngle(car.angle, targetAngle + car.tiltOffset, chase);
    car.vx = candidateVx;
    car.vy = car.speed * Math.sin(targetAngle);
    car.angularVelocity = 0;
    car.grounded = true;
    car.airTime = 0;
  } else {
    car.x = candidateX;
    car.y = candidateY;
    car.vx = candidateVx;
    car.vy = candidateVy;

    let torque = 0;
    if (input.gas && hasFuel) torque -= cfg.AIR_TILT_ACCEL;
    if (input.brake) torque += cfg.AIR_TILT_ACCEL;
    car.angularVelocity = clamp(car.angularVelocity + torque * dt, -cfg.MAX_AIR_ANGVEL, cfg.MAX_AIR_ANGVEL);
    car.angularVelocity *= Math.max(0, 1 - cfg.AIR_ANGULAR_DAMP * dt);
    car.angle += car.angularVelocity * dt;
    car.grounded = false;
    car.airTime += dt;
    if (wasGrounded) hooks?.onTakeoff?.(car);
  }

  // 5. Fuel drain — proportional to speed (a distance proxy) plus a small
  // idle trickle; floors at 0.
  const speedFrac = Math.min(1, Math.abs(car.speed) / cfg.MAX_SPEED);
  const drain = cfg.FUEL_DRAIN_BASE + cfg.FUEL_DRAIN_SPEED_COEF * speedFrac;
  car.fuel = Math.max(0, car.fuel - drain * dt);

  // 6. Crash check — grounded frames only (see header comment: mid-air
  // rotation never crashes on its own, only touching/resting down at too
  // steep an angle does).
  if (car.grounded) {
    const deg = (Math.abs(normalizeAngle(car.angle)) * 180) / Math.PI;
    if (deg > cfg.CRASH_ANGLE_DEG) {
      car.crashed = true;
      hooks?.onCrash?.(car);
    }
  }
}

export function refuel(car, amount = CONFIG.FUEL_REFILL, cfg = CONFIG) {
  car.fuel = Math.min(cfg.FUEL_MAX, car.fuel + amount);
}
