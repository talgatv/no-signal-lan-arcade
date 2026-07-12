/**
 * Void Drift — core Newtonian movement + toroidal (screen-wrap) math.
 *
 * The one rule this whole module exists to enforce: ROTATION AND VELOCITY
 * ARE COMPLETELY INDEPENDENT STATE. `angle` (facing) only ever changes from
 * turn input. `vx`/`vy` (momentum) only ever change from thrust input and
 * drag. Turning a drifting ship never re-points its velocity, and thrusting
 * never snaps velocity to the new facing — it *adds* an acceleration vector
 * onto whatever velocity already exists. That's the single defining feel of
 * this genre (see updateShip below); every other file in this game treats
 * ship.vx/vy as the only source of truth for where the ship actually goes.
 *
 * Angle convention: angle = 0 means facing "up" (-Y). Increasing angle
 * rotates clockwise on screen (consistent with a right-turn button turning
 * the ship visually right), via facingX = sin(angle), facingY = -cos(angle).
 */

export const CONFIG = {
  ROT_SPEED: 3.4, // rad/s while turning
  THRUST_ACCEL: 220, // px/s^2 while thrusting
  DRAG_PER_SEC: 0.16, // fraction of speed lost per second (gentle — momentum still carries for seconds); 0 = pure Newtonian no-drag
  MAX_SPEED: 480, // soft clamp so wraparound stays trackable at high wave speeds
  SHIP_RADIUS: 11, // collision radius
  NOSE_OFFSET: 13, // px from center to the nose, where bullets/thrust spawn
  BULLET_SPEED: 480, // px/s, relative to the ship (muzzle velocity is added to ship velocity)
  BULLET_LIFE: 0.95, // s
  BULLET_RADIUS: 2.2,
  FIRE_CD: 0.28, // s between shots — deliberately not full-auto
};

export function facingX(angle) { return Math.sin(angle); }
export function facingY(angle) { return -Math.cos(angle); }

/** Wrap a scalar into [0, size). */
export function wrapValue(v, size) {
  let r = v % size;
  if (r < 0) r += size;
  return r;
}

/** Shortest signed delta a-b on a torus of the given size (range (-size/2, size/2]). */
export function wrapDelta(a, b, size) {
  let d = (a - b) % size;
  if (d < -size / 2) d += size;
  else if (d > size / 2) d -= size;
  return d;
}

/** True Euclidean distance between two points on a W×H wraparound field,
 * i.e. accounting for the shortcut "through the edge" — a bullet a few px
 * from the right edge really is close to an asteroid a few px past the left
 * edge, and collision has to see that or wraparound would feel broken right
 * at the seam. */
export function toroidalDistance(ax, ay, bx, by, W, H) {
  const dx = wrapDelta(ax, bx, W);
  const dy = wrapDelta(ay, by, H);
  return Math.hypot(dx, dy);
}

export function circlesHitWrapped(ax, ay, ar, bx, by, br, W, H) {
  return toroidalDistance(ax, ay, bx, by, W, H) < ar + br;
}

/** Wrap position in place onto a W×H field. */
export function wrapPosition(obj, W, H) {
  obj.x = wrapValue(obj.x, W);
  obj.y = wrapValue(obj.y, H);
}

/**
 * Advance the ship one physics step. `input` is {left, right, thrust}
 * booleans. Turning only ever touches `angle`; thrust only ever touches
 * `vx`/`vy` (by accumulation, never assignment-from-angle); drag only ever
 * scales the existing velocity vector's magnitude, never its direction.
 */
export function updateShip(ship, input, dt, W, H, cfg = CONFIG) {
  if (input.left) ship.angle -= cfg.ROT_SPEED * dt;
  if (input.right) ship.angle += cfg.ROT_SPEED * dt;

  if (input.thrust) {
    const fx = facingX(ship.angle);
    const fy = facingY(ship.angle);
    ship.vx += fx * cfg.THRUST_ACCEL * dt;
    ship.vy += fy * cfg.THRUST_ACCEL * dt;
  }

  if (cfg.DRAG_PER_SEC > 0) {
    const drag = Math.max(0, 1 - cfg.DRAG_PER_SEC * dt);
    ship.vx *= drag;
    ship.vy *= drag;
  }

  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > cfg.MAX_SPEED) {
    const s = cfg.MAX_SPEED / speed;
    ship.vx *= s;
    ship.vy *= s;
  }

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  wrapPosition(ship, W, H);
}

export function updateFreeBody(body, dt, W, H) {
  body.x += body.vx * dt;
  body.y += body.vy * dt;
  if (typeof body.spin === 'number') body.angle += body.spin * dt;
  wrapPosition(body, W, H);
}

export function spawnBullet(ship, cfg = CONFIG) {
  const fx = facingX(ship.angle);
  const fy = facingY(ship.angle);
  return {
    x: ship.x + fx * cfg.NOSE_OFFSET,
    y: ship.y + fy * cfg.NOSE_OFFSET,
    vx: ship.vx + fx * cfg.BULLET_SPEED,
    vy: ship.vy + fy * cfg.BULLET_SPEED,
    life: cfg.BULLET_LIFE,
    r: cfg.BULLET_RADIUS,
    fromUfo: false,
  };
}

export function updateBullet(b, dt, W, H) {
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  wrapPosition(b, W, H);
  b.life -= dt;
  return b.life > 0;
}
