/**
 * levels.js — pure level data + parser for Ember & Tide. No DOM, no canvas.
 *
 * A level is authored as a 24x15 ASCII grid (terrain, hazards, spawns, doors)
 * plus small arrays for the interactive mechanisms (pressure plates, levers and
 * the gates/bridges they drive) whose wiring needs ids the grid can't express.
 *
 * Grid legend:
 *   #  solid stone (walls, floors, platforms, bedrock)
 *   .  empty air
 *   L  lava   — SAFE for Ember (fire), LETHAL for Tide (water)
 *   W  water  — SAFE for Tide (water),  LETHAL for Ember (fire)
 *   X  spikes — LETHAL to BOTH spirits (the neutral hazard)
 *   F  Ember (fire) spawn         f  Ember's (fire-colored) exit door
 *   T  Tide (water) spawn         t  Tide's (water-colored) exit door
 *
 * Hazards (L/W/X) are non-solid: a spirit that is safe in a liquid wades along
 * the floor beneath it; the other spirit must jump the pool or cross a bridge,
 * and falling in is fatal. Doors are non-solid and drawn separately.
 *
 * Coordinates in the mechanism arrays are TILE cells: col 0..23, row 0..14.
 * `barriers` are gates (solid while closed) or bridges (solid while extended).
 * A plate holds its targets open only while a spirit stands on it (momentary);
 * a lever flips/extends its targets on step-on (latching unless mode:'toggle').
 * `char` on a lever ('ember'|'tide') locks it so only that spirit can work it.
 */

export const TILE = 40;
export const WORLD_COLS = 24;
export const WORLD_ROWS = 15;

// Fixed 24x15 world (960x600 at TILE=40).
export const LEVELS = [
  {
    // 1 — Twin Springs. Pure elemental tutorial: one lane, each spirit meets
    // the OTHER element's pool (must jump it) plus a shared spike gap.
    nameKey: 'lvl1',
    grid: [
      '########################',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#.FT..LL..WW..XX...f.t.#',
      '########################',
    ],
    barriers: [],
    plates: [],
    levers: [],
  },
  {
    // 2 — The Sunken Gate. Introduces the pressure plate: Tide must stand on
    // the plate (bottom) to hold the gate open while Ember climbs the stair
    // and crosses the top corridor to the fire door.
    nameKey: 'lvl2',
    grid: [
      '########################',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#..................f...#',
      '#..........#############',
      '#......................#',
      '#........##............#',
      '#......................#',
      '#......##..............#',
      '#......................#',
      '#....##................#',
      '#.FT...........XX....t.#',
      '########################',
    ],
    barriers: [
      { id: 'g1', type: 'gate', col: 14, row: 4, len: 2, dir: 'v', open0: false },
    ],
    plates: [
      { id: 'p1', col: 11, row: 13, targets: ['g1'] },
    ],
    levers: [],
  },
  {
    // 3 — Ember's Bridge. Introduces the lever + bridge. A wide lava channel:
    // Ember wades across (safe) to reach the lever, extending a bridge so Tide
    // (who would boil in the lava) can cross to the doors on the far side.
    nameKey: 'lvl3',
    grid: [
      '########################',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#.FT................tf.#',
      '#########......#########',
      '#########LLLLLL#########',
      '########################',
    ],
    barriers: [
      { id: 'b1', type: 'bridge', col: 9, row: 12, len: 6, dir: 'h', open0: false },
    ],
    plates: [],
    levers: [
      { id: 'lv1', col: 18, row: 11, targets: ['b1'], mode: 'latch', char: 'ember' },
    ],
  },
  {
    // 4 — Give and Take. Mutual cooperation: Ember's lever (left) extends the
    // LAVA bridge Tide needs; Tide's lever (right) extends the WATER bridge
    // Ember needs. Each lever is on the other spirit's far side, so neither can
    // help itself — both must act. Doors meet in the middle.
    nameKey: 'lvl4',
    grid: [
      '########################',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#.F........ft.......T..#',
      '######....####....######',
      '######WWWW####LLLL######',
      '########################',
    ],
    barriers: [
      { id: 'Bw', type: 'bridge', col: 6, row: 12, len: 4, dir: 'h', open0: false },
      { id: 'Bl', type: 'bridge', col: 14, row: 12, len: 4, dir: 'h', open0: false },
    ],
    plates: [],
    levers: [
      { id: 'lvE', col: 4, row: 11, targets: ['Bl'], mode: 'latch', char: 'ember' },
      { id: 'lvT', col: 19, row: 11, targets: ['Bw'], mode: 'latch', char: 'tide' },
    ],
  },
  {
    // 5 — Hold the Line. Plate + lever combined across two heights. Tide holds
    // the bottom plate to open the gate on Ember's upper lane; Ember crosses,
    // throws the lever, which opens the bottom gate so Tide can reach the water
    // door past the spikes. The fire door sits at the end of the upper lane.
    nameKey: 'lvl5',
    grid: [
      '########################',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#..............f.......#',
      '#.....###########......#',
      '#......................#',
      '#...##.................#',
      '#.FT.............XX..t.#',
      '########################',
    ],
    barriers: [
      { id: 'GA', type: 'gate', col: 9, row: 8, len: 2, dir: 'v', open0: false },
      { id: 'GB', type: 'gate', col: 11, row: 12, len: 2, dir: 'v', open0: false },
    ],
    plates: [
      { id: 'PT', col: 7, row: 13, targets: ['GA'] },
    ],
    levers: [
      { id: 'LVE', col: 13, row: 9, targets: ['GB'], mode: 'latch', char: 'ember' },
    ],
  },
  {
    // 6 — The Confluence. Capstone: both mutual bridges AND a vertical climb.
    // Tide throws the blue lever (only Tide can) to bridge the water pool for
    // Ember; Ember crosses, climbs the stair, throws the orange lever up top
    // (only Ember can) to bridge the lava for Tide, who then leaps the spikes
    // to the water door. Two elements, two pools, a spike gap and a climb.
    nameKey: 'lvl6',
    grid: [
      '########################',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#..................f...#',
      '#.............#######..#',
      '#......................#',
      '#...........##.........#',
      '#......................#',
      '#.........##...........#',
      '#.FT.................t.#',
      '#####....#####......####',
      '#####WWWW#####LLLLXX####',
      '########################',
    ],
    barriers: [
      { id: 'Bw', type: 'bridge', col: 5, row: 12, len: 4, dir: 'h', open0: false },
      { id: 'Bl', type: 'bridge', col: 14, row: 12, len: 4, dir: 'h', open0: false },
    ],
    plates: [],
    levers: [
      { id: 'LVa', col: 4, row: 11, targets: ['Bw'], mode: 'latch', char: 'tide' },
      { id: 'LVc', col: 17, row: 5, targets: ['Bl'], mode: 'latch', char: 'ember' },
    ],
  },
];

const LETHAL = new Set(['L', 'W', 'X']);

/** Cells covered by a barrier span. */
function barrierCells(b) {
  const cells = [];
  for (let i = 0; i < b.len; i += 1) {
    cells.push(b.dir === 'h' ? [b.col + i, b.row] : [b.col, b.row + i]);
  }
  return cells;
}

/**
 * Parse an authored level definition into a runtime level (pixel-unit aware).
 * Throws loudly on a malformed grid so authoring mistakes surface immediately.
 */
export function parseLevel(def) {
  const grid = def.grid;
  if (!Array.isArray(grid) || grid.length !== WORLD_ROWS) {
    throw new Error(`level ${def.nameKey}: grid must have ${WORLD_ROWS} rows, got ${grid && grid.length}`);
  }
  const solid = [];
  const hazard = [];
  const spawns = {};
  const doors = {};

  for (let r = 0; r < WORLD_ROWS; r += 1) {
    const line = grid[r];
    if (typeof line !== 'string' || line.length !== WORLD_COLS) {
      throw new Error(`level ${def.nameKey}: row ${r} must be ${WORLD_COLS} chars, got ${line && line.length}`);
    }
    solid.push(new Uint8Array(WORLD_COLS));
    hazard.push(new Array(WORLD_COLS).fill(''));
    for (let c = 0; c < WORLD_COLS; c += 1) {
      const ch = line[c];
      if (ch === '#') solid[r][c] = 1;
      else if (LETHAL.has(ch)) hazard[r][c] = ch;
      else if (ch === 'F') spawns.ember = cellCenterFeet(c, r);
      else if (ch === 'T') spawns.tide = cellCenterFeet(c, r);
      else if (ch === 'f') doors.ember = doorAt(c, r, 'ember');
      else if (ch === 't') doors.tide = doorAt(c, r, 'tide');
    }
  }

  if (!spawns.ember || !spawns.tide) throw new Error(`level ${def.nameKey}: missing F/T spawn`);
  if (!doors.ember || !doors.tide) throw new Error(`level ${def.nameKey}: missing f/t door`);

  const barriers = (def.barriers || []).map((b) => ({
    id: b.id,
    type: b.type,
    col: b.col, row: b.row, len: b.len, dir: b.dir || 'h',
    open0: !!b.open0,
    open: !!b.open0,
    cells: barrierCells(b),
  }));
  const plates = (def.plates || []).map((p) => ({
    id: p.id, col: p.col, row: p.row, targets: p.targets.slice(), active: false,
  }));
  const levers = (def.levers || []).map((l) => ({
    id: l.id, col: l.col, row: l.row, targets: l.targets.slice(),
    mode: l.mode || 'toggle', char: l.char || null,
    on: false, wasOverlapping: false,
  }));

  return {
    nameKey: def.nameKey,
    cols: WORLD_COLS, rows: WORLD_ROWS, tile: TILE,
    solid, hazard, spawns, doors, barriers, plates, levers,
  };
}

function cellCenterFeet(col, row) {
  // Spirit stands centered in the cell column with its feet on the floor
  // surface just below the marker cell (feet at the next row's top edge).
  return { cx: col * TILE + TILE / 2, feetY: (row + 1) * TILE, col, row };
}

function doorAt(col, row, who) {
  return {
    who, col, row,
    cx: col * TILE + TILE / 2,
    // Door base cell rectangle (the spirit must overlap this, roughly).
    x: col * TILE, y: (row - 1) * TILE, w: TILE, h: TILE * 2,
  };
}

/** True if a hazard char is lethal to the given spirit id. */
export function hazardLethal(kind, who) {
  if (kind === 'X') return true;            // spikes: both
  if (kind === 'W') return who === 'ember'; // water douses fire
  if (kind === 'L') return who === 'tide';  // lava boils water
  return false;
}
