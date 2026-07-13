/**
 * Drop Smash — tower layout definitions (plain data, no DOM).
 *
 * A tower is a fixed grid of ROW_COUNT rows, each row holding zero, one or
 * two "platforms" (breakable slabs). A row with two platforms has a gap
 * between them; a row with zero platforms is an open corridor. Splitting a
 * row into independent left/right platforms (rather than one row = one hp
 * pool) means a ball can shatter one side while the other survives, so a
 * later drop can route through the broken half — real layout consequence,
 * not just a cosmetic gap.
 *
 * Same "plain data, authored bottom-up-readable" spirit as
 * games/siege-break/client/structures.js, but simpler: no rotation, no
 * bodies, just static rectangles physics.js treats as immovable.
 *
 * Materials echo games/siege-break's stone/wood/glass/granite vocabulary
 * (own values, not imported — every game here is self-contained) because it
 * reads instantly: glass-weak, wood-normal, stone-tough, granite-reinforced.
 * hp is in the same "impact momentum" units physics.js computes
 * (ball.mass * approachSpeed) — see physics.js's module doc comment for how
 * a hit's force is derived, and DAMAGE_TUNING.md-style reasoning inline
 * there. The four tiers are spaced so a light ball's typical hit (a few
 * hundred units) clears `weak` outright, chips `normal` over 2-3 hits, barely
 * dents `tough`, and can't touch `reinforced` alone — while a heavy ball
 * (~4x the momentum) one-shots `weak`/`normal` and reliably cracks `tough` /
 * `reinforced` in one or two hits. Tune here, not in physics.js, if the feel
 * needs adjusting.
 */

export const CANVAS_W = 720;
export const CANVAS_H = 1000;

// Horizontal play field (side walls live here; balls bounce off them).
export const PLAY_LEFT = 40;
export const PLAY_RIGHT = 680;
export const PLAY_W = PLAY_RIGHT - PLAY_LEFT;

// Vertical layout — fixed for every tower so towers are visually comparable
// and depth/score scale consistently across configurations.
export const SPAWN_TRACK_Y = 85; // the draggable position indicator's line
export const SPAWN_DROP_Y = 118; // where a dropped ball's center starts
export const TOWER_TOP_Y = 186; // top of row 0
export const ROW_COUNT = 14;
export const ROW_H = 54;
export const PLATFORM_H = 34; // < ROW_H, leaving a visible inter-row gap
export const TOWER_BOTTOM_Y = TOWER_TOP_Y + ROW_COUNT * ROW_H; // 942
export const EXIT_Y = 978; // a ball whose top edge passes this has "exited"

/* Calibrated empirically against physics.js's actual per-hit damage output
 * (see the headless probe this batch's other physics games run before any
 * UI exists) at a typical short first-contact fall: a light ball deals
 * ~300hp of damage per hit, medium ~810, heavy ~1770 (these climb further
 * on deeper hits, once a ball has picked up more fall speed). So: `weak`
 * breaks in one light hit with room to spare; `normal` shrugs off one light
 * hit but breaks outright in one medium hit (or two-three light hits, or a
 * simultaneous multi-light combo — 3 light balls landing together clear it
 * where one alone can't); `tough` barely notices a light hit, takes 2
 * medium hits, and breaks in one heavy hit with a modest margin; `reinforced`
 * shrugs off a single hit from anything, including one heavy ball — it wants
 * two heavy-grade hits (a second heavy drop, or a multi-ball heavy combo). */
export const MATERIALS = {
  weak: { hp: 220, color: '#b98cff', label: 'weak' }, // glass-like
  normal: { hp: 650, color: '#ffb454', label: 'normal' }, // wood-like
  tough: { hp: 1550, color: '#7fd6ff', label: 'tough' }, // stone-like
  reinforced: { hp: 3100, color: '#9fb3d8', label: 'reinforced' }, // granite-like
};

function rowY(row) {
  const y0 = TOWER_TOP_Y + row * ROW_H;
  return { y0, y1: y0 + PLATFORM_H };
}

/** One full-width platform for a row. */
function full(row, material) {
  const { y0, y1 } = rowY(row);
  return [{ row, x0: PLAY_LEFT, x1: PLAY_RIGHT, y0, y1, material }];
}

/** Two platforms sharing a row, split by an explicit gap [gapX0, gapX1]. */
function split(row, material, gapX0, gapX1, materialRight = material) {
  const { y0, y1 } = rowY(row);
  const parts = [];
  if (gapX0 > PLAY_LEFT) parts.push({ row, x0: PLAY_LEFT, x1: gapX0, y0, y1, material });
  if (gapX1 < PLAY_RIGHT) parts.push({ row, x0: gapX1, x1: PLAY_RIGHT, y0, y1, material: materialRight });
  return parts;
}

/** An empty row (no platform) — a breathing corridor. */
function empty() { return []; }

/* ---- A. Sheer Tower: mostly full-width rows, escalating toughness with
   depth plus a few open corridors — the intro layout, easy to read. ------- */
function sheerTower() {
  const rows = [
    full(0, 'weak'),
    full(1, 'weak'),
    full(2, 'normal'),
    empty(),
    full(4, 'normal'),
    full(5, 'normal'),
    full(6, 'tough'),
    empty(),
    full(8, 'tough'),
    full(9, 'normal'),
    full(10, 'tough'),
    empty(),
    full(12, 'reinforced'),
    full(13, 'tough'),
  ];
  return rows.flat();
}

/* ---- B. Staggered Ledges: alternating half-width platforms zigzag the
   ball left/right; a couple of full-width rows punctuate the routing. ----- */
function staggeredLedges() {
  const rows = [
    full(0, 'normal'),
    split(1, 'normal', 400, 680), // left slab only [40,400]
    split(2, 'normal', 40, 320), // right slab only [320,680]
    full(3, 'weak'),
    split(4, 'tough', 430, 680),
    split(5, 'tough', 40, 290),
    empty(),
    full(7, 'normal'),
    split(8, 'reinforced', 400, 680),
    split(9, 'reinforced', 40, 320),
    full(10, 'normal'),
    split(11, 'tough', 430, 680),
    split(12, 'tough', 40, 290),
    full(13, 'normal'),
  ];
  return rows.flat();
}

/* ---- C. Fortress Bands: full-width reinforced "walls" gate the descent —
   only heavy balls (or a multi-ball combo) punch through alone — with a
   narrow center-gap band lower down for aimed routing. -------------------- */
function fortressBands() {
  const rows = [
    full(0, 'weak'),
    full(1, 'weak'),
    full(2, 'reinforced'), // wall 1
    empty(),
    full(4, 'normal'),
    full(5, 'normal'),
    full(6, 'reinforced'), // wall 2
    empty(),
    split(8, 'tough', 330, 390), // narrow 60px center gap
    split(9, 'tough', 330, 390),
    full(10, 'normal'),
    full(11, 'reinforced'), // wall 3 (deepest)
    empty(),
    full(13, 'weak'),
  ];
  return rows.flat();
}

/* ---- D. Twin Spire: two columns with a standing center shaft, bridged by
   full-width "landings" every few rows so a ball that survives the shaft
   still meets a real floor; ends in a merged reinforced base. ------------ */
function twinSpire() {
  const rows = [
    full(0, 'normal'),
    split(1, 'normal', 330, 390),
    split(2, 'normal', 330, 390),
    full(3, 'normal'), // landing
    split(4, 'tough', 330, 390),
    split(5, 'weak', 330, 390),
    full(6, 'normal'), // landing
    split(7, 'reinforced', 330, 390),
    split(8, 'tough', 330, 390),
    full(9, 'normal'), // landing
    split(10, 'weak', 330, 390),
    split(11, 'tough', 330, 390),
    full(12, 'reinforced'), // merged toughest base
    full(13, 'normal'),
  ];
  return rows.flat();
}

export const TOWERS = [
  { id: 'sheer', nameKey: 'towerSheer', build: sheerTower },
  { id: 'staggered', nameKey: 'towerStaggered', build: staggeredLedges },
  { id: 'fortress', nameKey: 'towerFortress', build: fortressBands },
  { id: 'twin', nameKey: 'towerTwin', build: twinSpire },
];

export const TOWER_COUNT = TOWERS.length;

/** Build a fresh, fully-intact tower instance by id (defaults to the first).
 * Every drop gets one of these from scratch — see game.js: a tower's damage
 * never carries over between drops, so switching weight/tower or retrying
 * always compares against full hp (matters for testing the light-vs-heavy
 * difference honestly, and keeps the "rotate between attempts" replay-
 * variety promise literal rather than a slow multi-drop grind-down). */
export function buildTower(id) {
  const def = TOWERS.find((t) => t.id === id) || TOWERS[0];
  const platforms = def.build().map((p, i) => ({
    id: i,
    row: p.row,
    x0: p.x0,
    x1: p.x1,
    y0: p.y0,
    y1: p.y1,
    material: p.material,
    maxHp: MATERIALS[p.material].hp,
    hp: MATERIALS[p.material].hp,
    color: MATERIALS[p.material].color,
    broken: false,
    damageFlash: 0,
  }));
  return { id: def.id, nameKey: def.nameKey, platforms, rowCount: ROW_COUNT };
}
