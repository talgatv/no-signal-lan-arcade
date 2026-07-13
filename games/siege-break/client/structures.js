/**
 * Siege Break — level & structure definitions (plain data, no DOM).
 *
 * Six hand-authored structures with genuine layout variety, each built from a
 * stack of rectangular blocks plus 2-4 target creatures placed in/on it:
 *   1. Watchtower  — a slim tower; learn the basic knock-down.
 *   2. Twin Gate   — two pillars carrying a heavy lintel; topple the span.
 *   3. The Bunker  — an enclosed chamber; break in to reach a sealed target.
 *   4. Stepped Keep— a stepped pyramid; one shot can cascade down the tiers.
 *   5. Sky Bridge  — a plank spanning two towers; knock a tower and the
 *                    bridge (and the target riding it) loses its support.
 *   6. The Citadel — the finale: flanking towers + a capped inner keep.
 *
 * Geometry is authored bottom-up in the same pixel space physics.js/game.js
 * use (no camera). `slab(cx, baseY, w, h, mat)` places a block by its
 * bottom-centre so "sits on the ground" is just baseY = GROUND_Y and each
 * stacked course is baseY minus the running height — which keeps the authored
 * numbers legible and the initial stack exactly touching (no pre-settle pop).
 *
 * IMPORTANT (RTL): these coordinates are a fixed spatial gameplay convention.
 * The catapult is on the LEFT and the structure on the RIGHT in every
 * language, Arabic included — see i18n.js. Nothing here is ever mirrored.
 */

export const ARENA_W = 720;
export const ARENA_H = 1000;
export const GROUND_Y = 900; // y of the ground surface (blocks rest here)

/** Block placed by bottom-centre: (cx, baseY) is the middle of its base. */
function slab(cx, baseY, w, h, material) {
  return { x: cx, y: baseY - h / 2, w, h, material, isTarget: false };
}
/** A target creature (an enemy) placed by bottom-centre. Defeated by a direct
 * boulder hit OR by being crushed/knocked — both go through the same hp path
 * in physics.js, so no special-case logic is needed here. */
function target(cx, baseY, w = 34, h = 40) {
  return { x: cx, y: baseY - h / 2, w, h, material: 'target', isTarget: true };
}

const G = GROUND_Y;

/* ---- 1. Watchtower: a slim 2-wide stone tower, target perched on top, a
   second target sheltered at the foot behind a flimsy wooden wall. -------- */
function watchtower() {
  const b = [];
  const lx = 524, rx = 568, u = 44;
  for (let i = 0; i < 5; i++) {
    b.push(slab(lx, G - i * u, u, u, 'stone'));
    b.push(slab(rx, G - i * u, u, u, 'stone'));
  }
  const roofBase = G - 5 * u;
  b.push(slab(546, roofBase, 112, 22, 'wood'));
  b.push(target(546, roofBase - 22)); // on the roof
  // sheltered ground target, wall on the catapult-facing (left) side
  b.push(slab(430, G, 36, 64, 'wood'));
  b.push(target(474, G));
  return b;
}

/* ---- 2. Twin Gate: two stout stone pillars carry a heavy granite lintel.
   One target rides the lintel, one waits under the arch. ------------------ */
function twinGate() {
  const b = [];
  const u = 44;
  for (let i = 0; i < 4; i++) {
    b.push(slab(472, G - i * u, 48, u, 'stone'));
    b.push(slab(600, G - i * u, 48, u, 'stone'));
  }
  const top = G - 4 * u;
  b.push(slab(536, top, 188, 30, 'granite')); // the span
  b.push(target(536, top - 30)); // on the span
  b.push(target(536, G)); // under the arch
  return b;
}

/* ---- 3. The Bunker: an enclosed chamber (two walls + a roof) hiding a
   sealed target, plus an exposed target on the roof. Break in to win. ----- */
function bunker() {
  const b = [];
  const u = 44;
  for (let i = 0; i < 3; i++) {
    b.push(slab(468, G - i * u, 40, u, 'stone'));
    b.push(slab(596, G - i * u, 40, u, 'stone'));
  }
  const roofBase = G - 3 * u;
  b.push(slab(532, roofBase, 208, 28, 'stone')); // roof seals the chamber
  b.push(target(532, G)); // sealed inside
  b.push(target(532, roofBase - 28)); // on top of the roof
  return b;
}

/* ---- 4. Stepped Keep: a stepped pyramid. The exposed shoulder targets and
   the crowning target all ride tiers a single well-placed shot can topple. */
function steppedKeep() {
  const b = [];
  const u = 44;
  const base = [418, 462, 506, 550, 594];
  for (const x of base) b.push(slab(x, G, u, u, 'stone'));
  const mid = [462, 506, 550];
  for (const x of mid) b.push(slab(x, G - u, u, u, 'stone'));
  b.push(slab(506, G - 2 * u, u, u, 'wood')); // crown block
  b.push(target(506, G - 3 * u)); // on the crown
  b.push(target(418, G - u)); // left shoulder (exposed step)
  b.push(target(594, G - u)); // right shoulder
  return b;
}

/* ---- 5. Sky Bridge: a long plank spans two towers, resting only on their
   tops. A target rides the middle of the span (so knocking either tower out
   drops the span and its rider), and two more shelter on the ground beneath
   the bridge — crushed when the span comes down, or picked off by a flat shot
   threaded under the deck. ------------------------------------------------- */
function skyBridge() {
  const b = [];
  const u = 46;
  for (let i = 0; i < 3; i++) {
    b.push(slab(438, G - i * u, 48, u, 'stone'));
    b.push(slab(622, G - i * u, 48, u, 'stone'));
  }
  const towerTop = G - 3 * u;
  b.push(slab(530, towerTop, 214, 20, 'wood')); // the span across both tops
  b.push(target(530, towerTop - 20)); // riding the span's middle
  b.push(target(490, G)); // sheltering under the bridge
  b.push(target(570, G));
  return b;
}

/* ---- 6. The Citadel: the finale. Two flanking towers (a target on each),
   a small central keep with a capped chamber (a target sealed inside, a
   target crowning the cap). Mixed stone/granite/wood. --------------------- */
function citadel() {
  const b = [];
  const u = 46;
  // flanking towers
  for (let i = 0; i < 3; i++) {
    b.push(slab(410, G - i * u, 46, u, 'stone'));
    b.push(slab(632, G - i * u, 46, u, 'stone'));
  }
  const towerTop = G - 3 * u;
  b.push(target(410, towerTop));
  b.push(target(632, towerTop));
  // central keep chamber walls (interior wide enough to seal a target)
  for (let i = 0; i < 2; i++) {
    b.push(slab(480, G - i * u, 40, u, 'stone'));
    b.push(slab(564, G - i * u, 40, u, 'stone'));
  }
  const capBase = G - 2 * u;
  b.push(slab(522, capBase, 124, 26, 'granite')); // chamber cap over both walls
  b.push(target(522, G)); // sealed in the keep
  b.push(slab(522, capBase - 26, 52, 40, 'wood')); // the crowning block
  b.push(target(522, capBase - 66)); // crowning target
  return b;
}

export const LEVELS = [
  { id: 'watchtower', nameKey: 'lvlWatchtower', parShots: 2, ammo: 4, blocks: watchtower() },
  { id: 'twin-gate', nameKey: 'lvlTwinGate', parShots: 2, ammo: 4, blocks: twinGate() },
  { id: 'bunker', nameKey: 'lvlBunker', parShots: 3, ammo: 5, blocks: bunker() },
  { id: 'stepped-keep', nameKey: 'lvlSteppedKeep', parShots: 3, ammo: 5, blocks: steppedKeep() },
  { id: 'sky-bridge', nameKey: 'lvlSkyBridge', parShots: 3, ammo: 5, blocks: skyBridge() },
  { id: 'citadel', nameKey: 'lvlCitadel', parShots: 4, ammo: 6, blocks: citadel() },
];

export const LEVEL_COUNT = LEVELS.length;
