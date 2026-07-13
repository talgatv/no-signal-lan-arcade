/**
 * enemies.js — enemy types and their AI for Ray Maze.
 *
 * Two deliberately different threats:
 *
 *   Drone  — low-threat melee construct. Low HP, drifts straight at the player
 *            once it sees them and zaps on contact. Numerous, cheap, closes in.
 *   Sentry — high-threat ranged construct. More HP, hangs back at a standoff
 *            distance and fires slow energy bolts (projectiles) whenever it has
 *            line of sight. Punishes standing in the open.
 *
 * Detection is range + genuine line-of-sight (a grid raycast, from raycaster.js)
 * — an enemy behind a wall stays idle. Being shot also alerts an enemy even if
 * it hadn't seen you yet. Movement uses axis-separated collision so constructs
 * slide along corridor walls instead of tunnelling through them.
 *
 * This module is pure logic: it mutates enemy/player numbers and calls back into
 * the host (sfx, projectile spawning, player damage) through a `world` object,
 * so it has no DOM or rendering knowledge of its own.
 */

export const ENEMY_TYPES = {
  drone: {
    id: 'drone',
    maxHp: 30,
    speed: 1.7, // grid cells / second
    radius: 0.3,
    detectRange: 7.5,
    attackRange: 0.95,
    damage: 11,
    attackCd: 0.85, // seconds between melee zaps
    ranged: false,
    color: [255, 96, 200], // magenta
  },
  sentry: {
    id: 'sentry',
    maxHp: 55,
    speed: 1.0,
    radius: 0.34,
    detectRange: 11,
    attackRange: 7.5, // will open fire from here
    standoff: 3.6, // preferred distance to hold
    damage: 15,
    attackCd: 1.7,
    ranged: true,
    projectileSpeed: 4.3,
    color: [255, 184, 92], // amber
  },
};

/** Create a live enemy instance from a `{type,x,y}` spawn record. */
export function makeEnemy(spawn) {
  const def = ENEMY_TYPES[spawn.type] || ENEMY_TYPES.drone;
  return {
    type: def.id,
    def,
    x: spawn.x,
    y: spawn.y,
    hp: def.maxHp,
    maxHp: def.maxHp,
    alive: true,
    alerted: false,
    attackTimer: 0,
    hitFlash: 0, // seconds of white flash after taking a hit (set by combat)
    bob: Math.random() * Math.PI * 2, // idle animation phase
    deathT: 0, // death animation progress
  };
}

/** Axis-separated circle-vs-grid move: slides along walls, never tunnels. */
function tryMove(e, vx, vy, isWall) {
  const rad = e.def.radius;
  const nx = e.x + vx;
  if (!circleHitsWall(nx, e.y, rad, isWall)) e.x = nx;
  const ny = e.y + vy;
  if (!circleHitsWall(e.x, ny, rad, isWall)) e.y = ny;
}

/** True if a circle of `rad` at (x,y) overlaps any solid cell (4 corners). */
function circleHitsWall(x, y, rad, isWall) {
  return (
    isWall(Math.floor(x - rad), Math.floor(y - rad)) ||
    isWall(Math.floor(x + rad), Math.floor(y - rad)) ||
    isWall(Math.floor(x - rad), Math.floor(y + rad)) ||
    isWall(Math.floor(x + rad), Math.floor(y + rad))
  );
}

/**
 * Step all enemies. `world` provides:
 *   isWall(col,row) -> bool
 *   hasLineOfSight(ax,ay,bx,by) -> bool
 *   damagePlayer(amount)
 *   spawnProjectile(x, y, dirX, dirY, speed, damage)
 *   onAlert()   // fired the frame an enemy first spots the player
 */
export function updateEnemies(enemies, player, dt, world) {
  for (const e of enemies) {
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (!e.alive) {
      if (e.deathT < 1) e.deathT = Math.min(1, e.deathT + dt * 3);
      continue;
    }
    e.bob += dt * 4;

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1e-4;
    const los = world.hasLineOfSight(e.x, e.y, player.x, player.y);

    // ── Detection ──
    if (!e.alerted && dist <= e.def.detectRange && los) {
      e.alerted = true;
      if (world.onAlert) world.onAlert(e);
    }
    if (!e.alerted) continue;

    if (e.attackTimer > 0) e.attackTimer = Math.max(0, e.attackTimer - dt);
    const ux = dx / dist;
    const uy = dy / dist;

    if (!e.def.ranged) {
      // ── Drone: charge and melee ──
      if (dist > e.def.attackRange) {
        const step = e.def.speed * dt;
        tryMove(e, ux * step, uy * step, world.isWall);
      } else if (e.attackTimer === 0 && los) {
        world.damagePlayer(e.def.damage, e);
        e.attackTimer = e.def.attackCd;
      }
    } else {
      // ── Sentry: keep standoff distance, fire on sight ──
      const step = e.def.speed * dt;
      if (dist > e.def.standoff + 0.6) {
        tryMove(e, ux * step, uy * step, world.isWall);
      } else if (dist < e.def.standoff - 0.6) {
        tryMove(e, -ux * step, -uy * step, world.isWall); // back off
      }
      if (los && dist <= e.def.attackRange && e.attackTimer === 0) {
        // Fire a bolt straight at the player's current position.
        world.spawnProjectile(
          e.x + ux * (e.def.radius + 0.15),
          e.y + uy * (e.def.radius + 0.15),
          ux,
          uy,
          e.def.projectileSpeed,
          e.def.damage,
        );
        e.attackTimer = e.def.attackCd;
      }
    }
  }
}

/** Alert every enemy that can see a point — used when the player fires. */
export function alertNearby(enemies, x, y, world, range = 8) {
  for (const e of enemies) {
    if (!e.alive || e.alerted) continue;
    if (Math.hypot(e.x - x, e.y - y) <= range && world.hasLineOfSight(e.x, e.y, x, y)) {
      e.alerted = true;
      if (world.onAlert) world.onAlert(e);
    }
  }
}
