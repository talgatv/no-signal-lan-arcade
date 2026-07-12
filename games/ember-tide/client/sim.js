/**
 * sim.js — pure fixed-timestep simulation for Ember & Tide. No DOM, no canvas:
 * plain numbers in the same pixel units levels.js/game.js draw with, so the
 * whole thing is directly steppable and inspectable from a test harness (see
 * window.OGH_EMBER_TIDE in game.js) rather than only through the rendered scene.
 * Same pure-sim split as games/fight-arena's combat.js and games/billiards'
 * physics.js.
 *
 * Each logical step is a FIXED 1/60s: input -> per-axis AABB tile collision ->
 * mechanism update (plates momentary, levers latch/toggle on step-on) ->
 * elemental hazard death test -> door/win test. Deterministic and frame-exact
 * regardless of display refresh, so a test can advance one exact step at a time.
 */

import { TILE, hazardLethal } from './levels.js';

export const FIXED_DT = 1 / 60;

// Tuned so a jump clears ~80px (a two-tile climb) with margin but tops out
// below a four-tile horizontal gap, which is why bridge pools are 4 wide: the
// wrong-element spirit physically cannot leap them and must use the bridge.
export const GRAV = 2100;
export const MOVE_SPEED = 205;
export const JUMP_V = 720;
export const MAX_FALL = 900;
const COYOTE = 0.09;
const JUMP_BUFFER = 0.10;

export const CHAR_W = 22;
export const CHAR_H = 30;
const HW = CHAR_W / 2;
const HH = CHAR_H / 2;

const DEATH_CAUSE = { W: 'fire', L: 'water', X: 'spike' };

function makeChar(who) {
  return {
    who, cx: 0, cy: 0, vx: 0, vy: 0,
    hw: HW, hh: HH,
    onGround: false, coyote: 0, jumpBuffer: 0, jumpHeldPrev: false,
    alive: true, atDoor: false, atWrongDoor: false, facing: 1,
    animT: 0,
  };
}

export function createWorld(level) {
  const world = {
    level,
    ember: makeChar('ember'),
    tide: makeChar('tide'),
    status: 'playing',      // 'playing' | 'dead' | 'won'
    deadWho: null,
    deadCause: null,        // 'fire' | 'water' | 'spike' | 'fall'
    time: 0,
    charStand: true,        // whether spirits can stand on each other's heads
  };
  resetWorld(world);
  return world;
}

/** Reset spirits to spawns and all mechanisms to their authored initial state. */
export function resetWorld(world) {
  const L = world.level;
  for (const who of ['ember', 'tide']) {
    const ch = world[who];
    const sp = L.spawns[who];
    ch.cx = sp.cx;
    ch.cy = sp.feetY - ch.hh;
    ch.vx = 0; ch.vy = 0;
    ch.onGround = false; ch.coyote = 0; ch.jumpBuffer = 0; ch.jumpHeldPrev = false;
    ch.alive = true; ch.atDoor = false; ch.atWrongDoor = false; ch.facing = 1;
  }
  for (const b of L.barriers) b.open = b.open0;
  for (const p of L.plates) p.active = false;
  for (const lv of L.levers) { lv.on = false; lv.wasOverlapping = false; }
  world.status = 'playing';
  world.deadWho = null;
  world.deadCause = null;
  world.time = 0;
}

const cellOf = (v) => Math.floor(v / TILE);

function barrierSolid(b) {
  // Gate blocks while closed; bridge is a solid deck only while extended.
  return b.type === 'gate' ? !b.open : b.open;
}

/** Is tile (c,r) solid right now (static stone OR an active barrier cell)? */
export function isSolidCell(world, c, r) {
  const L = world.level;
  if (r < 0 || c < 0 || r >= L.rows || c >= L.cols) return true; // treat OOB as wall
  if (L.solid[r][c]) return true;
  for (const b of L.barriers) {
    if (!barrierSolid(b)) continue;
    for (const cell of b.cells) {
      if (cell[0] === c && cell[1] === r) return true;
    }
  }
  return false;
}

function collideX(world, ch) {
  const top = ch.cy - ch.hh + 3;
  const bottom = ch.cy + ch.hh - 3;
  const r0 = cellOf(top); const r1 = cellOf(bottom);
  if (ch.vx > 0) {
    const c = cellOf(ch.cx + ch.hw);
    for (let r = r0; r <= r1; r += 1) {
      if (isSolidCell(world, c, r)) { ch.cx = c * TILE - ch.hw; ch.vx = 0; return; }
    }
  } else if (ch.vx < 0) {
    const c = cellOf(ch.cx - ch.hw);
    for (let r = r0; r <= r1; r += 1) {
      if (isSolidCell(world, c, r)) { ch.cx = (c + 1) * TILE + ch.hw; ch.vx = 0; return; }
    }
  }
}

function collideY(world, ch) {
  const left = ch.cx - ch.hw + 3;
  const right = ch.cx + ch.hw - 3;
  const c0 = cellOf(left); const c1 = cellOf(right);
  ch.onGround = false;
  if (ch.vy > 0) {
    const r = cellOf(ch.cy + ch.hh);
    for (let c = c0; c <= c1; c += 1) {
      if (isSolidCell(world, c, r)) { ch.cy = r * TILE - ch.hh; ch.vy = 0; ch.onGround = true; return; }
    }
  } else if (ch.vy < 0) {
    const r = cellOf(ch.cy - ch.hh);
    for (let c = c0; c <= c1; c += 1) {
      if (isSolidCell(world, c, r)) { ch.cy = (r + 1) * TILE + ch.hh; ch.vy = 0; return; }
    }
  }
}

/** Let a falling spirit land on the other's head — a small co-op boost. */
function collideChar(ch, other) {
  if (!other.alive || ch.vy < 0) return;
  const chL = ch.cx - ch.hw; const chR = ch.cx + ch.hw; const chB = ch.cy + ch.hh;
  const oL = other.cx - other.hw; const oR = other.cx + other.hw; const oT = other.cy - other.hh;
  if (chR > oL + 2 && chL < oR - 2 && ch.cy < other.cy) {
    if (chB > oT && chB < oT + 16) { ch.cy = oT - ch.hh; ch.vy = 0; ch.onGround = true; }
  }
}

function stepChar(world, ch, intent, ev) {
  // Horizontal — crisp, no acceleration ramp (a puzzle platformer wants tight
  // control, not momentum).
  const dir = (intent.right ? 1 : 0) - (intent.left ? 1 : 0);
  ch.vx = dir * MOVE_SPEED;
  if (dir !== 0) ch.facing = dir;

  // Coyote time + a short jump buffer, so a jump pressed a hair early or a
  // step off the ledge still fires — standard forgiving platformer feel.
  ch.coyote = ch.onGround ? COYOTE : Math.max(0, ch.coyote - FIXED_DT);
  const pressed = intent.jump && !ch.jumpHeldPrev;
  ch.jumpBuffer = pressed ? JUMP_BUFFER : Math.max(0, ch.jumpBuffer - FIXED_DT);
  if (ch.jumpBuffer > 0 && ch.coyote > 0) {
    ch.vy = -JUMP_V; ch.coyote = 0; ch.jumpBuffer = 0; ch.onGround = false;
    ev.jumps.push(ch.who);
  }
  ch.jumpHeldPrev = intent.jump;

  ch.vy += GRAV * FIXED_DT;
  if (ch.vy > MAX_FALL) ch.vy = MAX_FALL;

  const wasAir = !ch.onGround;
  const fallV = ch.vy;

  ch.cx += ch.vx * FIXED_DT;
  collideX(world, ch);
  ch.cy += ch.vy * FIXED_DT;
  collideY(world, ch);
  if (world.charStand) collideChar(ch, world[ch.who === 'ember' ? 'tide' : 'ember']);

  if (wasAir && ch.onGround && fallV > 320) ev.land.push(ch.who);
  ch.animT += FIXED_DT;
}

function updateMechanisms(world, ev) {
  const L = world.level;
  // Pressure plates: momentary — a target is held open only while a spirit
  // stands on the plate cell.
  for (const p of L.plates) {
    const was = p.active;
    p.active = overlapsCell(world.ember, p.col, p.row) || overlapsCell(world.tide, p.col, p.row);
    if (p.active !== was) ev.plate = true;
    for (const id of p.targets) {
      const b = findBarrier(L, id);
      if (b) b.open = p.active;
    }
  }
  // Levers: fire once on step-on (rising edge). Latch = stays; toggle = flips.
  for (const lv of L.levers) {
    let over = false;
    if ((!lv.char || lv.char === 'ember') && overlapsCell(world.ember, lv.col, lv.row)) over = true;
    if ((!lv.char || lv.char === 'tide') && overlapsCell(world.tide, lv.col, lv.row)) over = true;
    if (over && !lv.wasOverlapping) {
      if (lv.mode === 'latch') lv.on = true;
      else lv.on = !lv.on;
      for (const id of lv.targets) {
        const b = findBarrier(L, id);
        if (b) b.open = lv.mode === 'latch' ? true : !b.open;
      }
      ev.lever = true;
    }
    lv.wasOverlapping = over;
  }
}

function findBarrier(L, id) {
  for (const b of L.barriers) if (b.id === id) return b;
  return null;
}

/** Does a spirit's body overlap tile cell (col,row)? */
export function overlapsCell(ch, col, row) {
  if (!ch.alive) return false;
  const cl = col * TILE; const cr = cl + TILE; const ct = row * TILE; const cb = ct + TILE;
  return ch.cx + ch.hw > cl && ch.cx - ch.hw < cr && ch.cy + ch.hh > ct && ch.cy - ch.hh < cb;
}

function hazardHit(world, ch) {
  const L = world.level;
  const inset = 5;
  const c0 = cellOf(ch.cx - ch.hw + inset);
  const c1 = cellOf(ch.cx + ch.hw - inset);
  const r0 = cellOf(ch.cy - ch.hh + inset);
  const r1 = cellOf(ch.cy + ch.hh - inset);
  for (let r = r0; r <= r1; r += 1) {
    if (r < 0 || r >= L.rows) continue;
    for (let c = c0; c <= c1; c += 1) {
      if (c < 0 || c >= L.cols) continue;
      const k = L.hazard[r][c];
      if (k && hazardLethal(k, ch.who)) return k;
    }
  }
  return '';
}

function atDoor(ch, door) {
  // Centered in the door column, and vertically overlapping its base cell.
  if (Math.abs(ch.cx - door.cx) > TILE * 0.42) return false;
  const baseTop = door.row * TILE;
  const baseBottom = (door.row + 1) * TILE;
  return ch.cy + ch.hh > baseTop + 6 && ch.cy - ch.hh < baseBottom;
}

function killer(world, who, cause) {
  world.status = 'dead';
  world.deadWho = who;
  world.deadCause = cause;
  world[who].alive = false;
}

/**
 * Advance one fixed logical step. `intents` = { ember:{left,right,jump},
 * tide:{...} }. Returns an events object for sound/animation glue.
 */
export function stepWorld(world, intents) {
  const ev = { jumps: [], land: [], lever: false, plate: false, died: null, won: false };
  if (world.status !== 'playing') return ev;
  world.time += FIXED_DT;

  const eInt = intents.ember || NO_INTENT;
  const tInt = intents.tide || NO_INTENT;
  stepChar(world, world.ember, eInt, ev);
  stepChar(world, world.tide, tInt, ev);

  updateMechanisms(world, ev);

  // Elemental + neutral hazard death (checked after movement/mechanisms).
  for (const who of ['ember', 'tide']) {
    const ch = world[who];
    if (!ch.alive) continue;
    if (ch.cy - ch.hh > (world.level.rows + 1) * TILE) { killer(world, who, 'fall'); ev.died = { who, cause: 'fall' }; break; }
    const k = hazardHit(world, ch);
    if (k) { const cause = DEATH_CAUSE[k]; killer(world, who, cause); ev.died = { who, cause }; break; }
  }
  if (world.status === 'dead') return ev;

  // Doors: a spirit only completes at its OWN colored door; both must be home.
  const L = world.level;
  world.ember.atDoor = atDoor(world.ember, L.doors.ember);
  world.tide.atDoor = atDoor(world.tide, L.doors.tide);
  world.ember.atWrongDoor = atDoor(world.ember, L.doors.tide);
  world.tide.atWrongDoor = atDoor(world.tide, L.doors.ember);
  if (world.ember.atDoor && world.tide.atDoor) {
    world.status = 'won';
    ev.won = true;
  }
  return ev;
}

const NO_INTENT = { left: false, right: false, jump: false };
