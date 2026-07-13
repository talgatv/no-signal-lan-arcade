/**
 * Void Drift — asteroid field + UFO bonus enemy.
 *
 * Asteroids are plain data objects tumbling with their own independent
 * velocity/spin (physics.js's updateFreeBody moves them — same wraparound
 * rules as the ship). Each has a fixed jagged outline (an array of local
 * {x,y} points generated once at spawn) so it reads as a genuine irregular
 * rock rather than a circle, while collision still uses a cheap bounding
 * circle (`radius`) sized per tier — bigger tiers get a bigger hitbox, per
 * the genre's risk/reward: large rocks are slow and worth little but hard to
 * dodge, small ones are fast, worth more, and easy to miss.
 */
import { toroidalDistance } from './physics.js';

export const ASTEROID_DEFS = {
  large: { radius: 46, score: 20, speedBase: 46, spin: 0.9, next: 'medium' },
  medium: { radius: 25, score: 50, speedBase: 74, spin: 1.3, next: 'small' },
  small: { radius: 13, score: 100, speedBase: 112, spin: 1.9, next: null },
};

export const UFO_DEFS = {
  score: 200,
  radius: 17,
  speedBase: 85,
  fireIntervalMsRange: [1100, 1900],
  bulletSpeed: 250,
  bulletLife: 1.7,
  bulletRadius: 2.4,
  aimError: 0.22, // radians of random spread added to the UFO's aim
};

let idCounter = 1;
function nextId() { return `a${idCounter++}`; }

function rand(min, max) { return min + Math.random() * (max - min); }
function choice(arr) { return arr[(Math.random() * arr.length) | 0]; }

/** A fixed jagged outline, generated once per asteroid instance so it reads
 * as a real rock (not a perfect circle) but stays cheap to draw every frame. */
function makeRockShape(radius) {
  const vertCount = 10 + ((Math.random() * 5) | 0); // 10-14 points
  const pts = [];
  for (let i = 0; i < vertCount; i++) {
    const a = (i / vertCount) * Math.PI * 2 + rand(-0.14, 0.14);
    const r = radius * rand(0.7, 1.2);
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return pts;
}

export function createAsteroid(size, x, y, vx, vy) {
  const def = ASTEROID_DEFS[size];
  return {
    id: nextId(),
    kind: 'asteroid',
    size,
    radius: def.radius,
    score: def.score,
    x, y, vx, vy,
    angle: rand(0, Math.PI * 2),
    spin: rand(-def.spin, def.spin) || def.spin * 0.5,
    shape: makeRockShape(def.radius),
  };
}

/** Spawn point along the field border, so wave-start rocks drift inward from
 * the edges rather than popping into open space. */
export function randomEdgePosition(W, H) {
  const side = (Math.random() * 4) | 0;
  if (side === 0) return { x: rand(0, W), y: 0 };
  if (side === 1) return { x: W, y: rand(0, H) };
  if (side === 2) return { x: rand(0, W), y: H };
  return { x: 0, y: rand(0, H) };
}

/**
 * Build the large asteroids for a wave. `avoid` (optional {x,y,radius}) is
 * usually the ship's spawn point — re-rolls a spawn position (bounded tries)
 * so a new wave can't insta-kill the ship at the moment it appears.
 */
export function spawnWaveAsteroids(count, W, H, speedMul, avoid) {
  const list = [];
  for (let i = 0; i < count; i++) {
    let pos;
    let tries = 0;
    do {
      pos = randomEdgePosition(W, H);
      tries++;
    } while (
      avoid &&
      toroidalDistance(pos.x, pos.y, avoid.x, avoid.y, W, H) < avoid.radius &&
      tries < 20
    );
    const speed = ASTEROID_DEFS.large.speedBase * speedMul * rand(0.75, 1.3);
    const dir = rand(0, Math.PI * 2);
    list.push(createAsteroid('large', pos.x, pos.y, Math.cos(dir) * speed, Math.sin(dir) * speed));
  }
  return list;
}

/**
 * Split a hit asteroid into 2-3 smaller ones of the next tier down, each
 * inheriting half the parent's drift plus a fresh randomized kick so they
 * visibly scatter. The smallest tier has no `next` and returns [] — callers
 * treat an empty split as "destroyed outright".
 */
export function splitAsteroid(a, speedMul) {
  const def = ASTEROID_DEFS[a.size];
  if (!def.next) return [];
  const childDef = ASTEROID_DEFS[def.next];
  const count = Math.random() < 0.35 ? 3 : 2;
  const children = [];
  const baseAngle = rand(0, Math.PI * 2);
  for (let i = 0; i < count; i++) {
    const spread = (Math.PI * 2 * i) / count + rand(-0.35, 0.35);
    const speed = childDef.speedBase * speedMul * rand(0.85, 1.45);
    const dirX = Math.cos(baseAngle + spread);
    const dirY = Math.sin(baseAngle + spread);
    children.push(createAsteroid(
      def.next,
      a.x + dirX * a.radius * 0.3,
      a.y + dirY * a.radius * 0.3,
      a.vx * 0.5 + dirX * speed,
      a.vy * 0.5 + dirY * speed,
    ));
  }
  return children;
}

/* ------------------------------------------------------------------------ *
 * UFO — the bonus enemy. Enters from one side, drifts across on a gentle
 * sine path, takes occasional aimed-but-imperfect shots at the ship, and
 * despawns once it has fully crossed to the far side (it does not
 * screen-wrap itself — a saucer that "flies across the screen" per the
 * genre, not one that loiters forever).
 * ------------------------------------------------------------------------ */
export function spawnUfo(W, H, wave) {
  const fromLeft = Math.random() < 0.5;
  const y = rand(H * 0.15, H * 0.85);
  const speedMul = 1 + Math.min(wave - 1, 6) * 0.05;
  const speed = UFO_DEFS.speedBase * speedMul * choice([1, 1]);
  return {
    id: nextId(),
    kind: 'ufo',
    x: fromLeft ? -UFO_DEFS.radius * 3 : W + UFO_DEFS.radius * 3,
    y,
    baseY: y,
    vx: fromLeft ? speed : -speed,
    vy: 0,
    t: 0,
    radius: UFO_DEFS.radius,
    fireCd: rand(UFO_DEFS.fireIntervalMsRange[0], UFO_DEFS.fireIntervalMsRange[1]) / 1000,
  };
}

/** Advance the UFO; returns false once it has fully exited the far side
 * (caller should despawn it — no wraparound for the UFO itself). */
export function updateUfo(ufo, dt, W) {
  ufo.t += dt;
  ufo.x += ufo.vx * dt;
  ufo.y = ufo.baseY + Math.sin(ufo.t * 2.1) * 26;
  ufo.fireCd -= dt;
  const margin = UFO_DEFS.radius * 4;
  return ufo.x > -margin && ufo.x < W + margin;
}

export function ufoWantsToFire(ufo) {
  return ufo.fireCd <= 0;
}

/** Fire an aimed-with-error shot at `target` ({x,y}); resets the UFO's
 * cooldown and returns a bullet-like object. Aim uses raw (non-wrapped)
 * delta to the target — a deliberate simplification: the UFO doesn't
 * wrap itself, and by far the common case is the ship being within normal
 * (non-wrapped) range of an on-screen saucer. */
export function ufoFire(ufo, target) {
  ufo.fireCd = rand(UFO_DEFS.fireIntervalMsRange[0], UFO_DEFS.fireIntervalMsRange[1]) / 1000;
  const dx = target.x - ufo.x;
  const dy = target.y - ufo.y;
  const ang = Math.atan2(dy, dx) + rand(-UFO_DEFS.aimError, UFO_DEFS.aimError);
  return {
    x: ufo.x,
    y: ufo.y,
    vx: Math.cos(ang) * UFO_DEFS.bulletSpeed,
    vy: Math.sin(ang) * UFO_DEFS.bulletSpeed,
    life: UFO_DEFS.bulletLife,
    r: UFO_DEFS.bulletRadius,
    fromUfo: true,
  };
}
