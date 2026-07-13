/**
 * Leap Quest — level data + the compiler that turns a compact, numeric level
 * definition into a runtime level (a solid-tile grid plus pixel-space entity
 * lists).
 *
 * Levels are authored as rectangles and tile coordinates, NOT hand-aligned
 * ASCII art. Every platform height, gap width and enemy position is an exact
 * integer here, so a jump that "should" be reachable provably is: a running
 * full jump clears ~3 tiles up and ~4 tiles across (see player.js's tuned
 * constants), so ground gaps are kept <= 3 tiles and required platforms
 * <= 3 tiles above their launch surface. compileLevel() also runs a cheap
 * reachability lint (see lintLevel) that logs a console warning for any pit
 * wider than the jumpable budget — a guard against a typo making a level
 * unwinnable.
 *
 * Coordinate model: tile = TILE px. A level of `rows` rows is `rows*TILE` px
 * tall; its solid floor is the bottom `GROUND_ROWS` rows over each `ground`
 * span (the gaps between spans are pits — falling into one drops the player
 * past the bottom of the level, below killY). Nothing here mirrors under RTL:
 * a level's left edge is always world-x 0 (see i18n.js / game.js notes).
 */

export const TILE = 40;
const GROUND_ROWS = 2; // bottom N rows are solid floor over each `ground` span

/* ------------------------------------------------------------------------ *
 * Level definitions — see the module header for the coordinate model.
 * Fields (all in TILE units unless noted):
 *   name, cols, rows
 *   ground:   [[startCol, endColInclusive], ...]  solid floor spans (gaps=pits)
 *   blocks:   [{c, r, w, h}, ...]                 solid rectangles (platforms/walls)
 *   spikes:   [{c, r, w}, ...]                    hazard beds sitting on row r
 *   coins:    [[c, r], ...]                       collectible, centered in the tile
 *   stars:    [[c, r], ...]                       star-shell power-up (one extra hit)
 *   crawlers: [[c, r], ...]                       back-and-forth patrol enemy
 *   stalkers: [[c, r], ...]                       charges toward the player when near
 *   movers:   [{c, r, w, axis:'x'|'y', dist, speed, phase?}, ...]  moving platforms
 *   spawn:    [c, r]   player start (feet rest on top of row r+1's surface)
 *   goal:     [c, r]   flag base cell
 * ------------------------------------------------------------------------ */
export const LEVEL_DEFS = [
  {
    name: 'First Steps',
    cols: 46,
    rows: 16,
    ground: [[0, 15], [18, 29], [32, 45]],
    blocks: [
      { c: 6, r: 12, w: 3, h: 1 },
      { c: 12, r: 10, w: 2, h: 1 },
      { c: 24, r: 12, w: 3, h: 1 },
      { c: 40, r: 11, w: 3, h: 1 },
    ],
    spikes: [],
    coins: [
      [3, 13], [4, 13], [6, 11], [7, 11], [8, 11], [12, 9], [13, 9],
      [20, 13], [21, 13], [24, 11], [25, 11], [26, 11],
      [34, 13], [35, 13], [40, 10], [41, 10], [42, 10],
    ],
    stars: [[24, 10]],
    crawlers: [[21, 13], [37, 13]],
    stalkers: [],
    movers: [],
    spawn: [2, 13],
    goal: [44, 13],
  },
  {
    name: 'Gaps & Spikes',
    cols: 56,
    rows: 16,
    ground: [[0, 11], [14, 23], [27, 35], [39, 55]],
    blocks: [
      { c: 7, r: 11, w: 3, h: 1 },
      { c: 18, r: 11, w: 2, h: 1 },
      { c: 30, r: 10, w: 3, h: 1 },
      { c: 44, r: 11, w: 2, h: 1 },
      { c: 49, r: 9, w: 3, h: 1 },
    ],
    spikes: [
      { c: 16, r: 13, w: 2 },
      { c: 33, r: 13, w: 2 },
    ],
    coins: [
      [4, 13], [7, 10], [8, 10], [12, 12], [13, 12],
      [18, 10], [21, 13], [22, 13], [30, 9], [31, 9],
      [40, 13], [44, 10], [49, 8], [50, 8], [51, 8], [53, 13],
    ],
    stars: [[5, 13]],
    crawlers: [[20, 13], [42, 13]],
    stalkers: [[31, 13]],
    movers: [],
    spawn: [2, 13],
    goal: [54, 13],
  },
  {
    name: 'The Chase',
    cols: 60,
    rows: 16,
    ground: [[0, 9], [12, 19], [32, 41], [44, 59]],
    blocks: [
      { c: 5, r: 11, w: 3, h: 1 },
      { c: 15, r: 10, w: 3, h: 1 },
      { c: 36, r: 11, w: 3, h: 1 },
      { c: 50, r: 10, w: 3, h: 1 },
    ],
    spikes: [
      { c: 46, r: 13, w: 2 },
    ],
    coins: [
      [3, 13], [5, 10], [6, 10], [15, 9], [16, 9], [17, 9],
      [22, 10], [25, 10], [28, 10], [36, 10], [37, 10],
      [50, 9], [51, 9], [52, 9], [56, 13], [57, 13],
    ],
    stars: [[45, 13]],
    crawlers: [[6, 13], [54, 13]],
    stalkers: [[36, 13]],
    movers: [
      { c: 20, r: 13, w: 3, axis: 'x', dist: 7, speed: 62 },
      { c: 44, r: 12, w: 2, axis: 'y', dist: 3, speed: 46, phase: 0.5 },
    ],
    spawn: [2, 13],
    goal: [58, 13],
  },
  {
    // Wall-jump level: a tall two-walled shaft is the ONLY route to the exit
    // ledge and flag at the top. See player.js for the wall-slide/wall-jump
    // physics; this level is where that ability is required, not optional.
    name: 'The Ascent',
    cols: 34,
    rows: 20,
    ground: [[0, 33]],
    blocks: [
      // approach step up to the shaft base
      { c: 10, r: 16, w: 3, h: 2 },
      // left shaft wall (tall — rows 4..17)
      { c: 19, r: 4, w: 1, h: 14 },
      // right shaft wall (shorter — rows 7..17, so the shaft opens on the
      // right near the top for the exit)
      { c: 22, r: 7, w: 1, h: 11 },
      // exit ledge at the top-right, reachable only by a wall-jump off the
      // left wall near the top of the shaft
      { c: 22, r: 6, w: 9, h: 1 },
    ],
    spikes: [],
    coins: [
      [3, 13], [4, 13], [11, 15], [12, 15],
      // climb rewards, alternating sides up the shaft
      [20, 15], [21, 13], [20, 11], [21, 9], [20, 7],
      [25, 5], [26, 5], [27, 5],
    ],
    stars: [[6, 18]],
    crawlers: [[6, 18]],
    stalkers: [],
    movers: [],
    spawn: [2, 18],
    goal: [29, 5],
  },
  {
    name: 'Gauntlet',
    cols: 68,
    rows: 18,
    ground: [[0, 7], [10, 15], [19, 24], [40, 47], [50, 57], [61, 67]],
    blocks: [
      { c: 5, r: 13, w: 2, h: 1 },
      { c: 12, r: 12, w: 2, h: 1 },
      { c: 21, r: 11, w: 3, h: 1 },
      // short wall-jump nook to climb out of a deep section
      { c: 28, r: 6, w: 1, h: 10 },
      { c: 31, r: 9, w: 1, h: 7 },
      { c: 31, r: 8, w: 6, h: 1 },
      { c: 52, r: 12, w: 3, h: 1 },
      { c: 58, r: 10, w: 2, h: 1 },
    ],
    spikes: [
      { c: 13, r: 15, w: 2 },
      { c: 42, r: 15, w: 3 },
      { c: 63, r: 15, w: 2 },
    ],
    coins: [
      [3, 15], [5, 12], [12, 11], [21, 10], [22, 10], [23, 10],
      [29, 13], [29, 10], [33, 7], [34, 7], [35, 7],
      [41, 13], [45, 13], [52, 11], [53, 11], [58, 9], [59, 9], [64, 15],
    ],
    stars: [[2, 15], [45, 13]],
    crawlers: [[6, 15], [22, 13], [54, 15]],
    stalkers: [[44, 15], [64, 15]],
    movers: [
      { c: 25, r: 15, w: 3, axis: 'x', dist: 5, speed: 70 },
      { c: 48, r: 13, w: 2, axis: 'y', dist: 4, speed: 52 },
      { c: 34, r: 14, w: 3, axis: 'x', dist: 4, speed: 58, phase: 0.5 },
    ],
    spawn: [2, 15],
    goal: [66, 13],
  },
];

/* ------------------------------------------------------------------------ *
 * Compiler
 * ------------------------------------------------------------------------ */
function makeGrid(cols, rows) {
  const g = [];
  for (let r = 0; r < rows; r++) g.push(new Uint8Array(cols));
  return g;
}

function fillRect(grid, cols, rows, c0, r0, w, h) {
  for (let r = r0; r < r0 + h; r++) {
    if (r < 0 || r >= rows) continue;
    for (let c = c0; c < c0 + w; c++) {
      if (c < 0 || c >= cols) continue;
      grid[r][c] = 1;
    }
  }
}

/**
 * Cheap reachability lint: warn on pits wider than the jumpable budget. A
 * running jump covers ~4 tiles horizontally; landing needs margin, so 4 is
 * the hard ceiling and anything above is almost certainly an authoring typo
 * (unless a mover bridges it, which the caller can verify from the screenshot).
 */
function lintLevel(def) {
  const spans = [...def.ground].sort((a, b) => a[0] - b[0]);
  const warnings = [];
  for (let i = 1; i < spans.length; i++) {
    const gap = spans[i][0] - spans[i - 1][1] - 1;
    if (gap > 4) {
      const hasMover = (def.movers || []).some(
        (m) => m.axis === 'x' && m.c >= spans[i - 1][1] - 1 && m.c <= spans[i][0] + 1,
      );
      if (!hasMover) {
        warnings.push(`pit of ${gap} tiles at col ${spans[i - 1][1] + 1} with no bridging mover`);
      }
    }
  }
  if (warnings.length) {
    console.warn(`[leap-quest] level "${def.name}" lint:`, warnings.join('; '));
  }
}

export function compileLevel(def) {
  const { cols, rows } = def;
  const grid = makeGrid(cols, rows);

  // Floor spans (bottom GROUND_ROWS rows)
  for (const [c0, c1] of def.ground) {
    fillRect(grid, cols, rows, c0, rows - GROUND_ROWS, c1 - c0 + 1, GROUND_ROWS);
  }
  // Solid blocks (platforms, walls)
  for (const b of def.blocks || []) {
    fillRect(grid, cols, rows, b.c, b.r, b.w, b.h);
  }

  lintLevel(def);

  const coins = (def.coins || []).map(([c, r]) => ({
    x: c * TILE + TILE / 2,
    y: r * TILE + TILE / 2,
    r: 11,
    taken: false,
  }));
  const stars = (def.stars || []).map(([c, r]) => ({
    x: c * TILE + TILE / 2,
    y: r * TILE + TILE / 2,
    r: 14,
    taken: false,
  }));
  // Spikes: hazard rect occupying the lower ~60% of the tile row, so the
  // player can graze the tile edge but is hurt on real contact with the teeth.
  const spikes = (def.spikes || []).map((s) => ({
    x: s.c * TILE,
    y: s.r * TILE + TILE * 0.42,
    w: s.w * TILE,
    h: TILE * 0.58,
  }));

  const enemySpawns = [];
  for (const [c, r] of def.crawlers || []) {
    enemySpawns.push({ type: 'crawler', cx: c * TILE + TILE / 2, footY: (r + 1) * TILE });
  }
  for (const [c, r] of def.stalkers || []) {
    enemySpawns.push({ type: 'stalker', cx: c * TILE + TILE / 2, footY: (r + 1) * TILE });
  }

  const movers = (def.movers || []).map((m) => {
    const x0 = m.c * TILE;
    const y0 = m.r * TILE;
    const distPx = m.dist * TILE;
    const t0 = (m.phase || 0) * (distPx / m.speed) * 2;
    return {
      x0, y0,
      w: m.w * TILE,
      h: TILE * 0.5,
      axis: m.axis,
      distPx,
      speed: m.speed,
      phase: m.phase || 0,
      t0,
      // live position (filled by updateMover)
      x: x0, y: y0, prevX: x0, prevY: y0,
      t: t0,
    };
  });

  const spawn = {
    x: def.spawn[0] * TILE + TILE / 2,
    y: (def.spawn[1] + 1) * TILE, // feet on top of the row below the spawn cell
  };
  const goal = {
    c: def.goal[0], r: def.goal[1],
    x: def.goal[0] * TILE + TILE * 0.2,
    y: (def.goal[1] - 1) * TILE, // pole rises two tiles from the base surface
    w: TILE * 0.6,
    h: TILE * 2,
  };

  return {
    name: def.name,
    cols, rows,
    pixelW: cols * TILE,
    pixelH: rows * TILE,
    killY: rows * TILE + TILE, // fall below this = pit death
    grid,
    coins, stars, spikes, enemySpawns, movers,
    spawn, goal,
    solid(c, r) {
      if (c < 0 || c >= cols || r < 0 || r >= rows) return false;
      return grid[r][c] === 1;
    },
  };
}

/** Snap a mover back to its start-of-level position/phase (used on respawn). */
export function resetMover(m) {
  m.t = m.t0;
  m.x = m.x0;
  m.y = m.y0;
  m.prevX = m.x0;
  m.prevY = m.y0;
}

/**
 * Ping-pong a moving platform between its two endpoints and record the delta
 * so a rider can be carried. Called once per frame per mover from game.js.
 */
export function updateMover(m, dt) {
  m.prevX = m.x;
  m.prevY = m.y;
  const period = (m.distPx / m.speed); // seconds for a one-way trip
  m.t += dt;
  // triangle wave 0..1..0 over 2*period
  const phase = (m.t % (2 * period)) / period;
  const tri = phase <= 1 ? phase : 2 - phase;
  if (m.axis === 'x') {
    m.x = m.x0 + tri * m.distPx;
    m.y = m.y0;
  } else {
    m.x = m.x0;
    m.y = m.y0 + tri * m.distPx;
  }
}
