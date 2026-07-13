/**
 * Deterministic, DOM-free simulation for Cart Corral.
 *
 * The caller advances this module with a fixed 1/120 s step. At that rate the
 * fastest body travels less than one quarter of a cart diameter per step, so
 * the simple impulse solver remains stable without a heavyweight physics lib.
 */

export const WORLD = Object.freeze({ width: 1440, height: 1280 });
export const PLAYER_RADIUS = 22;
export const CART_RADIUS = 19;

const PLAYER_BASE_SPEED = 270;
const PLAYER_ACCEL = 980;
const PLAYER_BRAKE = 8.5;
const CART_MAX_SPEED = 470;
const CART_FREE_DRAG = 1.32;
const CART_TRAIN_DRAG = 2.05;
const LINK_LENGTH = 46;
const INPUT_DEADZONE = 0.12;
const STRIKE_SPEED = 76;
const STRIKE_TIME_PENALTY = 4;
const STRIKE_STAMINA_PENALTY = 16;
const MAX_STRIKES = 3;
const DOCK_MAX_SPEED = 112;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const hypot = (x, y) => Math.hypot(x, y);

function moveToward(current, target, amount) {
  if (current < target) return Math.min(target, current + amount);
  return Math.max(target, current - amount);
}

function normalizeInput(input) {
  let x = Number(input?.x) || 0;
  let y = Number(input?.y) || 0;
  const raw = hypot(x, y);
  if (raw <= INPUT_DEADZONE) return { x: 0, y: 0, amount: 0 };
  const amount = clamp((Math.min(1, raw) - INPUT_DEADZONE) / (1 - INPUT_DEADZONE), 0, 1);
  x /= raw || 1;
  y /= raw || 1;
  return { x: x * amount, y: y * amount, amount };
}

/**
 * Maximum walking speed. Both inputs are independently monotonic: adding a
 * cart or losing stamina can never make the player faster. The 50% stamina
 * floor prevents an exhausted player with a long train from soft-locking.
 */
export function speedForLoad(load, stamina) {
  const count = Math.max(0, Number(load) || 0);
  const energy = clamp((Number(stamina) || 0) / 100, 0, 1);
  const loadFactor = 1 / (1 + count * 0.13);
  const staminaFactor = 0.5 + 0.5 * Math.sqrt(energy);
  return PLAYER_BASE_SPEED * loadFactor * staminaFactor;
}

export function createSimulation(layout) {
  if (!layout?.playerStart || !layout?.dropZone || !Array.isArray(layout.carts) || !Array.isArray(layout.cars)) {
    throw new Error('Cart Corral layout requires playerStart, dropZone, carts, and cars');
  }
  const duration = Math.max(1, Number(layout.duration) || 150);
  return {
    mode: 'ready', // ready | play | won | lost
    reason: null,
    duration,
    timeLeft: duration,
    elapsed: 0,
    player: {
      x: layout.playerStart.x,
      y: layout.playerStart.y,
      vx: 0,
      vy: 0,
      facing: -Math.PI / 2,
      stamina: 100,
      radius: PLAYER_RADIUS,
    },
    cars: layout.cars.map((car) => ({ ...car })),
    dropZone: { ...layout.dropZone },
    carts: layout.carts.map((cart, index) => ({
      id: cart.id ?? `cart-${index + 1}`,
      x: cart.x,
      y: cart.y,
      vx: 0,
      vy: 0,
      angle: Number(cart.angle) || 0,
      radius: CART_RADIUS,
      status: 'free', // free | attached | delivered
      dockIndex: -1,
    })),
    attached: [],
    delivered: 0,
    strikes: 0,
    _impactGrace: 0,
    _contactCooldowns: Object.create(null),
  };
}

function bodySpeed(body) { return hypot(body.vx, body.vy); }

function applyStamina(state, control, dt) {
  const player = state.player;
  const moving = bodySpeed(player) > 8;
  if (control.amount > 0.02) {
    const drain = (5.2 + state.attached.length * 0.36) * (0.38 + control.amount * 0.62);
    player.stamina = Math.max(0, player.stamina - drain * dt);
  } else if (!moving) {
    player.stamina = Math.min(100, player.stamina + 23 * dt);
  }
}

function updatePlayerVelocity(state, control, dt) {
  const player = state.player;
  const maxSpeed = speedForLoad(state.attached.length, player.stamina);
  if (control.amount > 0) {
    const targetX = control.x * maxSpeed;
    const targetY = control.y * maxSpeed;
    const loadAccel = PLAYER_ACCEL / (1 + state.attached.length * 0.035);
    player.vx = moveToward(player.vx, targetX, loadAccel * dt);
    player.vy = moveToward(player.vy, targetY, loadAccel * dt);
    if (control.amount > 0.08) player.facing = Math.atan2(control.y, control.x);
  } else {
    const brake = Math.exp(-PLAYER_BRAKE * dt);
    player.vx *= brake;
    player.vy *= brake;
    if (Math.abs(player.vx) < 0.025) player.vx = 0;
    if (Math.abs(player.vy) < 0.025) player.vy = 0;
  }
  applyStamina(state, control, dt);
}

function integrateBodies(state, dt) {
  const p = state.player;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  for (const cart of state.carts) {
    if (cart.status === 'delivered') continue;
    const drag = cart.status === 'attached' ? CART_TRAIN_DRAG : CART_FREE_DRAG;
    const damp = Math.exp(-drag * dt);
    cart.vx *= damp;
    cart.vy *= damp;
    const speed = bodySpeed(cart);
    if (speed > CART_MAX_SPEED) {
      cart.vx = cart.vx / speed * CART_MAX_SPEED;
      cart.vy = cart.vy / speed * CART_MAX_SPEED;
    }
    if (Math.abs(cart.vx) < 0.018) cart.vx = 0;
    if (Math.abs(cart.vy) < 0.018) cart.vy = 0;
    cart.x += cart.vx * dt;
    cart.y += cart.vy * dt;
    if (bodySpeed(cart) > 4) cart.angle = Math.atan2(cart.vy, cart.vx);
  }
}

/** Keep a circular body inside the authored world rectangle. */
function resolveWorldBounds(body, radius, restitution) {
  if (body.x < radius) {
    body.x = radius;
    if (body.vx < 0) body.vx = -body.vx * restitution;
  } else if (body.x > WORLD.width - radius) {
    body.x = WORLD.width - radius;
    if (body.vx > 0) body.vx = -body.vx * restitution;
  }
  if (body.y < radius) {
    body.y = radius;
    if (body.vy < 0) body.vy = -body.vy * restitution;
  } else if (body.y > WORLD.height - radius) {
    body.y = WORLD.height - radius;
    if (body.vy > 0) body.vy = -body.vy * restitution;
  }
}

/**
 * Resolve one circle against one axis-aligned car. Returns impact data or
 * null. The normal points from the car toward the circle.
 */
export function resolveCircleCar(body, radius, car, restitution = 0.12) {
  const nearX = clamp(body.x, car.x, car.x + car.w);
  const nearY = clamp(body.y, car.y, car.y + car.h);
  let nx = body.x - nearX;
  let ny = body.y - nearY;
  let dist = hypot(nx, ny);
  let penetration;

  if (dist > 0.00001) {
    penetration = radius - dist;
    if (penetration <= 0) return null;
    nx /= dist;
    ny /= dist;
  } else {
    // Centre is inside the rectangle (possible only after an extreme debug
    // warp). Pick the nearest edge and eject in one deterministic step.
    const choices = [
      { d: Math.abs(body.x - car.x), nx: -1, ny: 0 },
      { d: Math.abs(car.x + car.w - body.x), nx: 1, ny: 0 },
      { d: Math.abs(body.y - car.y), nx: 0, ny: -1 },
      { d: Math.abs(car.y + car.h - body.y), nx: 0, ny: 1 },
    ].sort((a, b) => a.d - b.d);
    ({ nx, ny } = choices[0]);
    penetration = radius + choices[0].d;
    dist = 0;
  }

  body.x += nx * penetration;
  body.y += ny * penetration;
  const into = body.vx * nx + body.vy * ny;
  const impact = Math.max(0, -into);
  if (into < 0) {
    body.vx -= (1 + restitution) * into * nx;
    body.vy -= (1 + restitution) * into * ny;
    const tangentX = -ny;
    const tangentY = nx;
    const tangent = body.vx * tangentX + body.vy * tangentY;
    body.vx -= tangent * tangentX * 0.08;
    body.vy -= tangent * tangentY * 0.08;
  }
  return { impact, x: nearX, y: nearY, nx, ny, penetration, dist };
}

/** Unequal-mass circle collision used for player/cart and cart/cart pushes. */
export function resolveCirclePair(a, radiusA, invMassA, b, radiusB, invMassB, restitution = 0.25) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let dist = hypot(dx, dy);
  const minDist = radiusA + radiusB;
  if (dist >= minDist) return null;
  if (dist < 0.00001) { dx = 1; dy = 0; dist = 1; }
  const nx = dx / dist;
  const ny = dy / dist;
  const invTotal = invMassA + invMassB || 1;
  const overlap = minDist - dist;
  a.x -= nx * overlap * (invMassA / invTotal);
  a.y -= ny * overlap * (invMassA / invTotal);
  b.x += nx * overlap * (invMassB / invTotal);
  b.y += ny * overlap * (invMassB / invTotal);

  const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (relative < 0) {
    const impulse = -(1 + restitution) * relative / invTotal;
    a.vx -= impulse * nx * invMassA;
    a.vy -= impulse * ny * invMassA;
    b.vx += impulse * nx * invMassB;
    b.vy += impulse * ny * invMassB;
  }
  return { impact: Math.max(0, -relative), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function tickCooldowns(state, dt) {
  state._impactGrace = Math.max(0, state._impactGrace - dt);
  for (const key of Object.keys(state._contactCooldowns)) {
    const next = state._contactCooldowns[key] - dt;
    if (next <= 0) delete state._contactCooldowns[key];
    else state._contactCooldowns[key] = next;
  }
}

function recordCarImpact(state, source, sourceId, car, contact, events) {
  if (!contact || contact.impact < STRIKE_SPEED || state._impactGrace > 0) return;
  const key = `${source}:${sourceId}:${car.id}`;
  if (state._contactCooldowns[key] > 0) return;
  state._contactCooldowns[key] = 0.9;
  state._impactGrace = 0.38;
  state.strikes += 1;
  state.timeLeft = Math.max(0, state.timeLeft - STRIKE_TIME_PENALTY);
  state.player.stamina = Math.max(0, state.player.stamina - STRIKE_STAMINA_PENALTY);
  events.push({
    type: 'hit',
    source,
    id: sourceId,
    cartId: source === 'cart' ? sourceId : null,
    carId: car.id,
    x: contact.x,
    y: contact.y,
    impact: contact.impact,
    strikes: state.strikes,
  });
}

function resolveCarsForBody(state, body, radius, source, sourceId, restitution, events) {
  for (const car of state.cars) {
    const contact = resolveCircleCar(body, radius, car, restitution);
    recordCarImpact(state, source, sourceId, car, contact, events);
  }
}

function resolveDynamicContacts(state, events) {
  const player = state.player;
  // Free carts get a clear push from the heavier player. Attached carts still
  // separate from the player but use a gentler impulse; their rope constraint
  // handles the actual following motion.
  for (const cart of state.carts) {
    if (cart.status === 'delivered') continue;
    resolveCirclePair(
      player, PLAYER_RADIUS, 0.43,
      cart, CART_RADIUS, 1,
      cart.status === 'free' ? 0.34 : 0.08,
    );
  }
  const live = state.carts.filter((cart) => cart.status !== 'delivered');
  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      resolveCirclePair(live[i], CART_RADIUS, 1, live[j], CART_RADIUS, 1, 0.28);
    }
  }

  resolveWorldBounds(player, PLAYER_RADIUS, 0.05);
  resolveCarsForBody(state, player, PLAYER_RADIUS, 'player', 'player', 0.05, events);
  for (const cart of live) {
    resolveWorldBounds(cart, CART_RADIUS, 0.28);
    resolveCarsForBody(state, cart, CART_RADIUS, 'cart', cart.id, 0.22, events);
  }
}

function solveTrain(state, events) {
  if (!state.attached.length) return;
  const byId = new Map(state.carts.map((cart) => [cart.id, cart]));
  // Several inexpensive position iterations make a rope-like train. Only the
  // child is position-corrected; gameplay drag is already expressed by the
  // load-dependent player speed, so the constraint cannot pull the employee
  // through a parked car.
  for (let iteration = 0; iteration < 5; iteration += 1) {
    let parent = state.player;
    for (const id of state.attached) {
      const cart = byId.get(id);
      if (!cart || cart.status !== 'attached') continue;
      let dx = cart.x - parent.x;
      let dy = cart.y - parent.y;
      let dist = hypot(dx, dy);
      if (dist < 0.00001) { dx = -Math.cos(state.player.facing); dy = -Math.sin(state.player.facing); dist = 1; }
      const nx = dx / dist;
      const ny = dy / dist;
      if (dist > LINK_LENGTH) {
        const correction = (dist - LINK_LENGTH) * 0.82;
        cart.x -= nx * correction;
        cart.y -= ny * correction;
        const separating = (cart.vx - parent.vx) * nx + (cart.vy - parent.vy) * ny;
        if (separating > 0) {
          cart.vx -= nx * separating * 0.72;
          cart.vy -= ny * separating * 0.72;
        }
        // A small velocity hand-off keeps the chain visually smooth without
        // making it an infinitely stiff rod.
        cart.vx += (parent.vx - cart.vx) * 0.06;
        cart.vy += (parent.vy - cart.vy) * 0.06;
      }
      resolveWorldBounds(cart, CART_RADIUS, 0.16);
      resolveCarsForBody(state, cart, CART_RADIUS, 'cart', cart.id, 0.12, events);
      parent = cart;
    }
  }
}

export function isCartFullyInDropZone(cart, zone) {
  const radius = Number(cart.radius) || CART_RADIUS;
  return cart.x - radius >= zone.x
    && cart.x + radius <= zone.x + zone.w
    && cart.y - radius >= zone.y
    && cart.y + radius <= zone.y + zone.h;
}

function dockPosition(zone, index) {
  const cols = 6;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const insetX = 37;
  const insetY = 40;
  return {
    x: zone.x + insetX + col * ((zone.w - insetX * 2) / (cols - 1)),
    y: zone.y + insetY + row * (zone.h - insetY * 2),
  };
}

function captureDeliveredCarts(state, events) {
  for (const cart of state.carts) {
    if (cart.status === 'delivered') continue;
    if (!isCartFullyInDropZone(cart, state.dropZone) || bodySpeed(cart) > DOCK_MAX_SPEED) continue;
    const eventX = cart.x;
    const eventY = cart.y;
    const index = state.delivered;
    state.attached = state.attached.filter((id) => id !== cart.id);
    cart.status = 'delivered';
    cart.dockIndex = index;
    cart.vx = 0;
    cart.vy = 0;
    cart.angle = 0;
    const dock = dockPosition(state.dropZone, index);
    cart.x = dock.x;
    cart.y = dock.y;
    state.delivered += 1;
    events.push({ type: 'deliver', id: cart.id, cartId: cart.id, x: eventX, y: eventY, delivered: state.delivered });
  }
}

function finishIfNeeded(state, events) {
  if (state.strikes >= MAX_STRIKES) {
    state.mode = 'lost';
    state.reason = 'damage';
    events.push({ type: 'lose', reason: state.reason, x: state.player.x, y: state.player.y });
    return;
  }
  if (state.delivered >= state.carts.length) {
    state.mode = 'won';
    state.reason = 'complete';
    events.push({ type: 'win', x: state.player.x, y: state.player.y, elapsed: state.elapsed });
    return;
  }
  if (state.timeLeft <= 0) {
    state.mode = 'lost';
    state.reason = 'time';
    events.push({ type: 'lose', reason: state.reason, x: state.player.x, y: state.player.y });
  }
}

/** Advance one fixed simulation step and return gameplay events. */
export function stepSimulation(state, input, dt) {
  if (state.mode !== 'play') return [];
  const step = clamp(Number(dt) || 0, 0, 1 / 30);
  if (step <= 0) return [];
  const events = [];

  tickCooldowns(state, step);
  state.elapsed += step;
  state.timeLeft = Math.max(0, state.timeLeft - step);
  const control = normalizeInput(input);
  updatePlayerVelocity(state, control, step);
  integrateBodies(state, step);
  resolveDynamicContacts(state, events);
  solveTrain(state, events);
  // Re-run dynamic separation after constraints, otherwise a sharply turning
  // chain can briefly stack two carts into the same spot.
  resolveDynamicContacts(state, events);
  captureDeliveredCarts(state, events);
  finishIfNeeded(state, events);
  return events;
}

export function nearestFreeCart(state, maxDistance = Infinity) {
  let best = null;
  let bestDistance = Number(maxDistance);
  if (!Number.isFinite(bestDistance)) bestDistance = Infinity;
  for (const cart of state.carts) {
    if (cart.status !== 'free') continue;
    const distance = hypot(cart.x - state.player.x, cart.y - state.player.y);
    if (distance <= bestDistance) { best = cart; bestDistance = distance; }
  }
  return best;
}

/** Grab the nearest cart, or release the current train when none is nearby. */
export function interact(state) {
  if (state.mode !== 'play') return [];
  const cart = nearestFreeCart(state, 88);
  if (cart) {
    cart.status = 'attached';
    cart.vx = state.player.vx * 0.55;
    cart.vy = state.player.vy * 0.55;
    // The newly collected cart becomes the first cart behind the employee;
    // the existing train reconnects behind it on the next solver step.
    state.attached.unshift(cart.id);
    return [{ type: 'grab', id: cart.id, cartId: cart.id, x: cart.x, y: cart.y, load: state.attached.length }];
  }
  if (state.attached.length) {
    const released = [...state.attached];
    for (const id of released) {
      const item = state.carts.find((candidate) => candidate.id === id);
      if (item?.status === 'attached') item.status = 'free';
    }
    state.attached = [];
    return [{ type: 'release', ids: released, x: state.player.x, y: state.player.y }];
  }
  return [];
}

export const PHYSICS_CONSTANTS = Object.freeze({
  PLAYER_BASE_SPEED,
  INPUT_DEADZONE,
  LINK_LENGTH,
  STRIKE_SPEED,
  MAX_STRIKES,
  DOCK_MAX_SPEED,
});
