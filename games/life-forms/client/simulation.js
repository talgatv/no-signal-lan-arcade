/**
 * simulation.js — Conway's Game of Life core engine for Life Forms.
 *
 * Deliberately DOM-free (no `document`/`window`/canvas references anywhere
 * in this file) so it can be exercised headlessly — both by a Node
 * pre-flight check during development and by app.js's debug hook
 * (window.OGH_LIFE_FORMS) that the test harness drives via direct state
 * manipulation. Keep it that way: any DOM reference creeping in here would
 * silently break that fast verification path.
 *
 * Grid: flat Uint8Array `alive` (1/0) + Uint16Array `age` (consecutive
 * generations a cell has been continuously alive; 0 while dead), both
 * row-major (`index = row * cols + col`). `age` is pure render/heatmap
 * flavor — it never feeds back into the birth/death rules.
 *
 * Edges: toroidal (wrap-around) — a cell on the last row/column counts
 * neighbors across the edge onto row/column 0, so nothing here is
 * artificially starved by a hard boundary. This makes classic patterns
 * (gliders, the Gosper gun's escaping gliders) eventually wrap and can
 * interact with their own trailing wake on a small grid — expected and
 * part of the toy's charm, not a bug.
 *
 * step() is the one piece of logic that is easy to get subtly wrong: it
 * MUST compute the next generation as a clean snapshot of the previous one
 * — every neighbor count for every cell has to be read from the *same*
 * unmodified generation, never from cells already flipped earlier in the
 * same pass. This implementation reads only from the closed-over `alive`/
 * `age` captured at the top of step() and writes exclusively into fresh
 * `nextAlive`/`nextAge` arrays, swapped in only after the full scan
 * completes — so there is no order-of-iteration dependency at all.
 */

/** The 8 Moore-neighborhood offsets, order doesn't matter for a sum. */
const NEIGHBOR_OFFSETS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], /*      */ [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

export function createGrid(cols, rows) {
  return {
    cols,
    rows,
    alive: new Uint8Array(cols * rows),
    age: new Uint16Array(cols * rows),
    generation: 0,
    liveCount: 0,
  };
}

export function indexOf(grid, c, r) {
  return r * grid.cols + c;
}

export function inBounds(grid, c, r) {
  return c >= 0 && c < grid.cols && r >= 0 && r < grid.rows;
}

export function getCell(grid, c, r) {
  if (!inBounds(grid, c, r)) return 0;
  return grid.alive[r * grid.cols + c];
}

export function getAge(grid, c, r) {
  if (!inBounds(grid, c, r)) return 0;
  return grid.age[r * grid.cols + c];
}

/** Count live neighbors of (c, r) with toroidal wrap-around. */
export function countLiveNeighbors(alive, cols, rows, c, r) {
  let count = 0;
  for (let i = 0; i < NEIGHBOR_OFFSETS.length; i++) {
    const dc = NEIGHBOR_OFFSETS[i][0];
    const dr = NEIGHBOR_OFFSETS[i][1];
    const nc = (c + dc + cols) % cols;
    const nr = (r + dr + rows) % rows;
    count += alive[nr * cols + nc];
  }
  return count;
}

/**
 * Advance `grid` by exactly one generation in place (mutates the grid
 * object's alive/age/generation/liveCount fields, but only after computing
 * the entire next generation into fresh scratch arrays — see file header).
 * Standard Conway rules: a live cell with 2-3 live neighbors survives: a
 * dead cell with exactly 3 live neighbors is born; everything else dies or
 * stays dead.
 */
export function step(grid) {
  const { cols, rows, alive, age } = grid;
  const nextAlive = new Uint8Array(cols * rows);
  const nextAge = new Uint16Array(cols * rows);
  let liveCount = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const n = countLiveNeighbors(alive, cols, rows, c, r);
      const wasAlive = alive[idx] === 1;
      const nowAlive = wasAlive ? (n === 2 || n === 3) : n === 3;
      if (nowAlive) {
        nextAlive[idx] = 1;
        nextAge[idx] = wasAlive ? age[idx] + 1 : 1;
        liveCount++;
      }
    }
  }

  grid.alive = nextAlive;
  grid.age = nextAge;
  grid.generation += 1;
  grid.liveCount = liveCount;
  return grid;
}

/**
 * Set a single cell alive/dead. Returns true if it actually changed
 * (callers use this to skip redundant re-renders/sfx while drag-painting
 * over cells that already match the paint mode).
 */
export function setCellAlive(grid, c, r, aliveFlag) {
  if (!inBounds(grid, c, r)) return false;
  const idx = r * grid.cols + c;
  const was = grid.alive[idx] === 1;
  const now = !!aliveFlag;
  if (was === now) return false;
  grid.alive[idx] = now ? 1 : 0;
  grid.age[idx] = now ? 1 : 0;
  grid.liveCount += now ? 1 : -1;
  return true;
}

export function toggleCell(grid, c, r) {
  return setCellAlive(grid, c, r, !getCell(grid, c, r));
}

/** Reset to an empty grid, generation 0. */
export function clearGrid(grid) {
  grid.alive.fill(0);
  grid.age.fill(0);
  grid.generation = 0;
  grid.liveCount = 0;
}

/**
 * Fill with a random scatter of live cells at `density` (0..1). Starts a
 * fresh generation-0 run, same as Clear, since a randomize is a new
 * scenario rather than a continuation of whatever came before.
 */
export function randomizeGrid(grid, density = 0.32, rng = Math.random) {
  let liveCount = 0;
  for (let i = 0; i < grid.alive.length; i++) {
    const alive = rng() < density;
    grid.alive[i] = alive ? 1 : 0;
    grid.age[i] = alive ? 1 : 0;
    if (alive) liveCount++;
  }
  grid.generation = 0;
  grid.liveCount = liveCount;
}

/** Recompute liveCount from scratch — used after a bulk external edit (e.g. pattern stamp). */
export function recountLive(grid) {
  let liveCount = 0;
  for (let i = 0; i < grid.alive.length; i++) liveCount += grid.alive[i];
  grid.liveCount = liveCount;
  return liveCount;
}

/** The tight bounding box [minC, minR, maxC, maxR] (inclusive) of all live cells, or null if empty. */
export function boundingBox(grid) {
  let minC = Infinity;
  let minR = Infinity;
  let maxC = -Infinity;
  let maxR = -Infinity;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (grid.alive[r * grid.cols + c]) {
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
      }
    }
  }
  if (minC === Infinity) return null;
  return { minC, minR, maxC, maxR };
}
