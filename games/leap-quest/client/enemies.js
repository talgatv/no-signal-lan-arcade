/**
 * Leap Quest — enemies. Two distinct behaviours, both defeated the classic
 * way (a stomp from above) and both harmful on side/below contact:
 *
 *  - CRAWLER: a simple back-and-forth patroller. Reverses at a platform edge
 *    or a wall, so it never walks off its ledge.
 *  - STALKER: patrols slowly like a crawler, but when the player comes within
 *    a detection box at roughly the same height it turns and CHARGES at ~3x
 *    speed. It still respects edges/walls (it won't dive into a pit), so it's
 *    a threat while you share its platform, not a homing missile.
 *
 * Enemies move only horizontally along their spawn platform (their foot Y is
 * fixed and edge-detection keeps them on it), so no per-enemy gravity/tile
 * settling is needed — reversing at edges is the whole containment model.
 */

import { TILE } from './levels.js';

const CRAWLER = { w: 30, h: 26, speed: 58 };
const STALKER = { w: 32, h: 30, patrol: 46, charge: 158, detectX: 230, detectY: 58 };

export function makeEnemy(spawn) {
  const dims = spawn.type === 'stalker' ? STALKER : CRAWLER;
  return {
    type: spawn.type,
    w: dims.w,
    h: dims.h,
    x: spawn.cx - dims.w / 2,
    y: spawn.footY - dims.h,
    footY: spawn.footY,
    dir: Math.random() < 0.5 ? -1 : 1,
    vx: 0,
    alerted: false,
    dead: false,
    deathT: 0,
    wobble: Math.random() * Math.PI * 2,
  };
}

// Is there floor to stand on one step ahead in `dir`, and no wall in the way?
function edgeAhead(e, level, dir) {
  const leadX = dir > 0 ? e.x + e.w : e.x;
  const aheadCol = Math.floor((leadX + dir * 3) / TILE);
  const footRow = Math.floor((e.y + e.h + 3) / TILE);
  const midRow = Math.floor((e.y + e.h / 2) / TILE);
  const groundAhead = level.solid(aheadCol, footRow);
  const wallAhead = level.solid(aheadCol, midRow);
  return { blocked: !groundAhead || wallAhead };
}

export function stepEnemy(e, dt, level, player) {
  if (e.dead) {
    e.deathT += dt;
    return;
  }
  e.wobble += dt * 6;

  let speed;
  if (e.type === 'stalker') {
    const ex = e.x + e.w / 2;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const ey = e.y + e.h / 2;
    const near = Math.abs(px - ex) < STALKER.detectX && Math.abs(py - ey) < STALKER.detectY;
    e.alerted = near;
    if (near) {
      e.dir = Math.sign(px - ex) || e.dir;
      speed = STALKER.charge;
    } else {
      speed = STALKER.patrol;
    }
  } else {
    e.alerted = false;
    speed = CRAWLER.speed;
  }

  // Turn around at an edge or a wall rather than walking off / into it.
  if (edgeAhead(e, level, e.dir).blocked) {
    e.dir = -e.dir;
    e.vx = 0;
    // if the other way is also blocked (1-tile perch), just idle this frame
    if (edgeAhead(e, level, e.dir).blocked) return;
  }

  e.vx = e.dir * speed;
  e.x += e.vx * dt;
}

/**
 * Classify a player↔enemy contact. Returns 'stomp' (player defeats the
 * enemy from above), 'hurt' (player is struck from the side/below), or null
 * (no overlap). A stomp requires the player to be descending and to have
 * their feet in the enemy's upper band — otherwise any overlap is a hit.
 */
export function classifyContact(p, e) {
  if (e.dead) return null;
  const overlap = p.x + p.w > e.x && p.x < e.x + e.w && p.y + p.h > e.y && p.y < e.y + e.h;
  if (!overlap) return null;
  const playerBottom = p.y + p.h;
  const fromAbove = p.vy > 40 && playerBottom < e.y + e.h * 0.6;
  return fromAbove ? 'stomp' : 'hurt';
}

export { CRAWLER, STALKER };
