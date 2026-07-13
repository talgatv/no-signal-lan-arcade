/**
 * fruits.js — everything that can launch from the bottom of the screen in
 * Blade Fruit: the 5 fruit types, the bomb, real gravity-arc physics (plain
 * per-frame Euler integration — velocity/position updated each tick, same
 * discipline as games/comet and games/dash-runner rather than a closed-form
 * position(t)), the difficulty ramp, and every canvas draw function. No DOM
 * beyond the passed-in 2D context, no pointer/input/game-state — kept pure
 * and directly steppable/inspectable, the same split games/dash-runner's
 * track.js and games/drop-smash's physics.js use.
 *
 * Original vector fruit designs (own shapes/palette/code) in the general
 * "fruit launches on a gravity arc, get sliced" arcade genre — nothing
 * copied from any specific existing game's art or content.
 *
 * Coordinate space: a fixed 720x1000 internal canvas (matches the shared
 * portrait 0.72-aspect convention every other OGH canvas game uses), y-down
 * (canvas convention), so "up" is negative vy.
 */

export const CANVAS_W = 720;
export const CANVAS_H = 1000;
export const GRAVITY = 1900; // px/s^2

/* ------------------------------------------------------------------------ *
 * Difficulty ramp — a pure function of elapsed play time, directly
 * inspectable/comparable at any two points in time (see window.OGH_BLADE_
 * FRUIT.getDifficulty in game.js), same "speedForDistance()" precedent as
 * games/dash-runner/client/track.js. Ramps over RAMP_DURATION seconds then
 * holds at the plateau — an endless session doesn't become literally
 * impossible the longer it runs.
 * ------------------------------------------------------------------------ */
const RAMP_DURATION = 45; // seconds to reach max difficulty

function lerp(a, b, f) { return a + (b - a) * f; }

/**
 * @param {number} elapsedSec seconds since the current run started
 * @returns {{elapsedSec:number, f:number, spawnInterval:number, waveMin:number,
 *   waveMax:number, bombChance:number, speedMult:number}}
 */
export function difficultyForElapsed(elapsedSec) {
  const t = Math.max(0, elapsedSec);
  const f = Math.min(1, t / RAMP_DURATION);
  return {
    elapsedSec: t,
    f,
    spawnInterval: lerp(1.30, 0.55, f), // seconds between spawn waves
    waveMin: 1,
    waveMax: 1 + Math.floor(f * 2.999), // 1 early -> 2 mid -> 3 late (simultaneous items per wave)
    bombChance: lerp(0.10, 0.30, f),    // chance a wave includes exactly one bomb
    speedMult: lerp(1.0, 1.18, f),      // launch-velocity multiplier
  };
}

/* ------------------------------------------------------------------------ *
 * Fruit shapes. Every draw(ctx, R, t) call assumes the context is already
 * translated to the entity's (x,y) and rotated to its current tumble angle
 * — it just draws the whole shape centered at the local origin with
 * characteristic radius R. Keeping every shape a single self-contained
 * "whole fruit" draw (not separate whole/half art) lets createHalves()/
 * drawHalf() below reuse this exact same call for sliced debris via canvas
 * clipping instead of authoring a second half-shape per fruit.
 * ------------------------------------------------------------------------ */

function drawApple(ctx, R) {
  ctx.beginPath();
  ctx.arc(0, R * 0.04, R * 0.92, 0, Math.PI * 2);
  ctx.fillStyle = '#ff3b5c';
  ctx.shadowColor = '#ff3b5c';
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.shadowBlur = 0;
  // subtle top dimple, the classic apple silhouette cue
  ctx.strokeStyle = 'rgba(122,15,38,0.55)';
  ctx.lineWidth = R * 0.10;
  ctx.beginPath();
  ctx.arc(0, -R * 0.55, R * 0.30, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  // stem
  ctx.strokeStyle = '#5a3a24';
  ctx.lineWidth = R * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -R * 0.86);
  ctx.lineTo(R * 0.14, -R * 1.14);
  ctx.stroke();
  // leaf
  ctx.fillStyle = '#3ddc72';
  ctx.beginPath();
  ctx.ellipse(R * 0.34, -R * 1.06, R * 0.22, R * 0.11, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // glossy highlight
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath();
  ctx.ellipse(-R * 0.32, -R * 0.26, R * 0.20, R * 0.30, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawMelon(ctx, R) {
  // a watermelon-slice wedge (pac-man-style circular segment), not a round
  // fruit — the most distinct silhouette of the five on purpose
  const a0 = -Math.PI / 2 - 0.95;
  const a1 = -Math.PI / 2 + 0.95;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, R * 0.92, a0, a1);
  ctx.closePath();
  ctx.fillStyle = '#ff6f91';
  ctx.shadowColor = '#ff6f91';
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.shadowBlur = 0;
  // dark green rind band
  ctx.strokeStyle = '#2ec26c';
  ctx.lineWidth = R * 0.16;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.90, a0, a1);
  ctx.stroke();
  // pale rind inner line
  ctx.strokeStyle = '#eafff0';
  ctx.lineWidth = R * 0.045;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.80, a0, a1);
  ctx.stroke();
  // seeds
  ctx.fillStyle = '#2c1018';
  const seeds = [[0.35, -0.55], [0.55, -0.18], [0.5, 0.22], [0.68, 0.55], [0.38, 0.02]];
  for (const [fr, ang] of seeds) {
    const rr = R * fr;
    const an = -Math.PI / 2 + ang;
    ctx.beginPath();
    ctx.ellipse(Math.cos(an) * rr, Math.sin(an) * rr, R * 0.06, R * 0.1, an, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBerry(ctx, R) {
  // a cluster of 4 overlapping circles — the only non-single-blob silhouette
  const berries = [
    [0, R * 0.08, R * 0.46],
    [-R * 0.42, -R * 0.26, R * 0.40],
    [R * 0.40, -R * 0.28, R * 0.40],
    [0, -R * 0.62, R * 0.36],
  ];
  ctx.fillStyle = '#a24bff';
  ctx.shadowColor = '#a24bff';
  ctx.shadowBlur = 14;
  for (const [bx, by, br] of berries) {
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  for (const [bx, by, br] of berries) {
    ctx.beginPath();
    ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  // tiny calyx
  ctx.strokeStyle = '#3ddc72';
  ctx.lineWidth = R * 0.06;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-R * 0.1, -R * 0.95); ctx.lineTo(0, -R * 1.08);
  ctx.moveTo(R * 0.1, -R * 0.95); ctx.lineTo(0, -R * 1.08);
  ctx.stroke();
}

function drawCitrus(ctx, R) {
  // a cut citrus cross-section: radiating segment lines read unmistakably
  // "orange", distinct from the plain apple circle
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.92, 0, Math.PI * 2);
  ctx.fillStyle = '#ffdf6b';
  ctx.shadowColor = '#ffb238';
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffb238';
  ctx.lineWidth = R * 0.14;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.86, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,178,56,0.65)';
  ctx.lineWidth = R * 0.035;
  const segs = 8;
  for (let i = 0; i < segs; i++) {
    const an = (i / segs) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(an) * R * 0.80, Math.sin(an) * R * 0.80);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.10, 0, Math.PI * 2);
  ctx.fill();
}

function drawKiwi(ctx, R) {
  // lime-green flesh + white center + a seed ring — distinct from citrus
  // (no radial lines, a ring of dots instead) and from melon (round, not a
  // wedge; brighter, more uniform green)
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.92, 0, Math.PI * 2);
  ctx.fillStyle = '#c9ff5e';
  ctx.shadowColor = '#c9ff5e';
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#6b4a2a';
  ctx.lineWidth = R * 0.08;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.88, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f4ffe4';
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#241608';
  const nSeeds = 12;
  for (let i = 0; i < nSeeds; i++) {
    const an = (i / nSeeds) * Math.PI * 2;
    const rr = R * 0.58;
    ctx.beginPath();
    ctx.ellipse(Math.cos(an) * rr, Math.sin(an) * rr, R * 0.045, R * 0.09, an + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * The bomb — must read as "don't touch" instantly, even mid-swipe: a dark,
 * spiky, near-black sphere (the only desaturated entity on screen — every
 * fruit is bright/saturated) with a pulsing red danger outline/glow and a
 * lit, flickering fuse spark, the brightest single point on the whole shape
 * so the eye catches it first.
 */
function drawBomb(ctx, R, t) {
  const pulse = 0.5 + Math.sin(t * 8) * 0.5;
  ctx.save();
  ctx.shadowColor = 'rgba(255,59,92,0.95)';
  ctx.shadowBlur = 14 + pulse * 12;
  // spikes
  ctx.fillStyle = '#2a2c3c';
  const nSpikes = 8;
  for (let i = 0; i < nSpikes; i++) {
    const an = (i / nSpikes) * Math.PI * 2 + 0.2;
    const bx = Math.cos(an) * R * 0.78;
    const by = Math.sin(an) * R * 0.78;
    const tx = Math.cos(an) * R * 1.18;
    const ty = Math.sin(an) * R * 1.18;
    const perpX = -Math.sin(an) * R * 0.14;
    const perpY = Math.cos(an) * R * 0.14;
    ctx.beginPath();
    ctx.moveTo(bx + perpX, by + perpY);
    ctx.lineTo(bx - perpX, by - perpY);
    ctx.lineTo(tx, ty);
    ctx.closePath();
    ctx.fill();
  }
  // body (dark metallic gradient — the only desaturated entity in the game)
  const grd = ctx.createRadialGradient(-R * 0.25, -R * 0.3, R * 0.1, 0, 0, R * 0.9);
  grd.addColorStop(0, '#3d4156');
  grd.addColorStop(0.6, '#1c1e29');
  grd.addColorStop(1, '#0b0c12');
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.82, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(255,59,92,${0.55 + pulse * 0.45})`;
  ctx.lineWidth = R * 0.06;
  ctx.stroke();
  ctx.restore();
  // sheen
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(-R * 0.28, -R * 0.32, R * 0.20, R * 0.28, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // fuse
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = R * 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(R * 0.12, -R * 0.78);
  ctx.quadraticCurveTo(R * 0.52, -R * 1.16, R * 0.32, -R * 1.36);
  ctx.stroke();
  // flickering spark — brightest point on the shape, unmissable
  const flicker = 0.65 + Math.random() * 0.35;
  ctx.fillStyle = `rgba(255,${180 + Math.floor(Math.random() * 60)},80,${flicker})`;
  ctx.shadowColor = '#ffcf5c';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(R * 0.32, -R * 1.36, R * (0.16 + Math.random() * 0.06), 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

export const FRUIT_TYPES = [
  { id: 'apple', color: '#ff3b5c', points: 10, radius: 34, draw: drawApple },
  { id: 'melon', color: '#ff6f91', points: 10, radius: 40, draw: drawMelon },
  { id: 'berry', color: '#a24bff', points: 15, radius: 26, draw: drawBerry },
  { id: 'citrus', color: '#ffb238', points: 10, radius: 34, draw: drawCitrus },
  { id: 'kiwi', color: '#c9ff5e', points: 12, radius: 30, draw: drawKiwi },
];

export const BOMB_TYPE = { id: 'bomb', color: '#1c1e29', points: 0, radius: 36, draw: drawBomb };

export function randomFruitType() {
  return FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
}

/* ------------------------------------------------------------------------ *
 * Entities — a fruit or a bomb in flight. Hitbox is always a plain circle
 * (radius e.radius) regardless of the drawn shape's visual silhouette, so
 * collision math never depends on which fruit type it is.
 * ------------------------------------------------------------------------ */
let idCounter = 0;
function nextId() { return ++idCounter; }

function launchRiseHeight() {
  return 380 + Math.random() * 370; // px the item should climb, before speedMult
}

function launchVelocity(speedMult) {
  const h = launchRiseHeight();
  return -Math.sqrt(2 * GRAVITY * h) * speedMult; // negative = upward
}

function launchDrift(x0, speedMult) {
  let vx = (Math.random() * 2 - 1) * 140 * speedMult;
  vx += (CANVAS_W / 2 - x0) * 0.22; // gentle centering bias keeps most arcs on-screen
  return vx;
}

/**
 * Spawn one fruit or bomb entity, launched from a random position near the
 * bottom edge with a real gravity-arc initial velocity (up + drift), scaled
 * by the current difficulty's speedMult.
 * @param {number} elapsedSec current run's elapsed play time (drives speedMult)
 * @param {'fruit'|'bomb'} kind
 */
export function spawnEntity(elapsedSec, kind) {
  const d = difficultyForElapsed(elapsedSec);
  const margin = 90;
  const x0 = margin + Math.random() * (CANVAS_W - margin * 2);
  const y0 = CANVAS_H + 30; // launches from just below the visible bottom edge
  const vy = launchVelocity(d.speedMult);
  const vx = launchDrift(x0, d.speedMult);
  const rotation = Math.random() * Math.PI * 2;
  if (kind === 'bomb') {
    return {
      id: nextId(), kind: 'bomb', typeId: 'bomb',
      x: x0, y: y0, vx, vy, radius: BOMB_TYPE.radius, points: 0,
      rotation, spin: (Math.random() * 2 - 1) * 2.0,
      dead: false,
    };
  }
  const type = randomFruitType();
  return {
    id: nextId(), kind: 'fruit', typeId: type.id,
    x: x0, y: y0, vx, vy, radius: type.radius, points: type.points,
    rotation, spin: (Math.random() * 2 - 1) * 3.4,
    dead: false,
  };
}

/** Integrate one physics tick: real gravity (rises, decelerates, falls). */
export function updateEntity(e, dt) {
  e.vy += GRAVITY * dt;
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  e.rotation += e.spin * dt;
  return e;
}

/** True once the item has fallen back past the visible bottom edge for good. */
export function isBelowBottom(e) {
  return e.y - e.radius > CANVAS_H + 40;
}

export function drawEntity(ctx, e, t) {
  const type = e.kind === 'bomb' ? BOMB_TYPE : FRUIT_TYPES.find((f) => f.id === e.typeId);
  if (!type) return;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.rotation);
  type.draw(ctx, e.radius, t);
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * Sliced-fruit debris — two halves flying apart. Reuses the exact same
 * whole-shape draw() the intact fruit used (see drawHalf), clipped to one
 * side, so no fruit type needs a second hand-authored "half" shape.
 * ------------------------------------------------------------------------ */

/**
 * @param {*} e the fruit entity being sliced (not yet mutated)
 * @param {number} dirX swipe direction at the moment of the hit
 * @param {number} dirY
 */
export function createHalves(e, dirX, dirY) {
  const mag = Math.hypot(dirX, dirY) || 1;
  const nx = dirX / mag;
  const ny = dirY / mag;
  // the two pieces separate sideways off the blade's path, not along it
  const px = -ny;
  const py = nx;
  const kick = 140 + Math.random() * 90;
  const halves = [];
  for (const side of [-1, 1]) {
    halves.push({
      typeId: e.typeId,
      side,
      x: e.x, y: e.y,
      vx: e.vx + px * kick * side + nx * 30 * side,
      vy: e.vy + py * kick * side - 60,
      radius: e.radius,
      rotation: e.rotation,
      spin: e.spin + side * (2 + Math.random() * 2),
      life: 0.9, maxLife: 0.9,
    });
  }
  return halves;
}

export function updateHalf(h, dt) {
  h.vy += GRAVITY * dt;
  h.x += h.vx * dt;
  h.y += h.vy * dt;
  h.rotation += h.spin * dt;
  h.life -= dt;
  return h;
}

export function drawHalf(ctx, h) {
  const type = FRUIT_TYPES.find((f) => f.id === h.typeId);
  if (!type) return;
  const alpha = h.life < 0.25 ? Math.max(0, h.life / 0.25) : 1;
  const R = h.radius;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(h.x, h.y);
  ctx.rotate(h.rotation);
  ctx.beginPath();
  if (h.side < 0) ctx.rect(-R * 1.2, -R * 1.4, R * 1.2, R * 2.8);
  else ctx.rect(0, -R * 1.4, R * 1.2, R * 2.8);
  ctx.clip();
  type.draw(ctx, R, 0);
  ctx.restore();
}
