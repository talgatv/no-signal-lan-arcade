/**
 * board.js — pure grid/match/gravity logic for Gem Swap. No DOM, no timers,
 * no globals: every function takes the grid (and, where a new gem must be
 * minted, a `nextId()` callback) explicitly and returns plain data, so a
 * test harness (see window.OGH_GEM_SWAP in game.js) can call these directly
 * and inspect results without touching rendering at all.
 *
 * Grid shape: `grid[row][col]` is either `null` (only transiently, mid-
 * resolution) or a gem `{ id, type, special, bombColor? }`:
 *   - `type` is one of TYPES (a color/shape) for normal and row/col-special
 *     gems, or the literal 'bomb' for a color-bomb (bombs have no color of
 *     their own — `bombColor` remembers the color that created them, for
 *     decorative tinting only, never used for match comparisons).
 *   - `special` is `null`, SPECIAL_ROW, SPECIAL_COL or SPECIAL_BOMB.
 */

export const ROWS = 8;
export const COLS = 8;
export const TYPES = ['circle', 'diamond', 'star', 'square', 'triangle', 'hexagon'];

export const SPECIAL_ROW = 'row';
export const SPECIAL_COL = 'col';
export const SPECIAL_BOMB = 'bomb';

export function randomType() {
  return TYPES[(Math.random() * TYPES.length) | 0];
}

export function makeGem(id, type, special = null, bombColor = null) {
  return { id, type, special, bombColor };
}

export function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

export function isAdjacent(a, b) {
  const dr = Math.abs(a.r - b.r);
  const dc = Math.abs(a.c - b.c);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

function key(r, c) { return `${r},${c}`; }

/** Deep-ish clone (grid of plain objects) — used by game.js for undo-free
 * snapshotting in tests; board.js itself never needs to clone internally. */
export function cloneGrid(grid) {
  return grid.map((row) => row.map((g) => (g ? { ...g } : null)));
}

/**
 * Every maximal run of 3+ adjacent same-type gems, scanning rows then
 * columns. A cell with no gem, or a gem whose special is SPECIAL_BOMB
 * (bombs carry no color of their own), breaks a run just like a gap.
 */
export function findRuns(grid) {
  const runs = [];
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const g = grid[r][c];
      if (!g || g.special === SPECIAL_BOMB) { c++; continue; }
      let end = c + 1;
      while (end < COLS) {
        const g2 = grid[r][end];
        if (!g2 || g2.special === SPECIAL_BOMB || g2.type !== g.type) break;
        end++;
      }
      const len = end - c;
      if (len >= 3) {
        const cells = [];
        for (let cc = c; cc < end; cc++) cells.push({ r, c: cc });
        runs.push({ cells, orientation: 'h', type: g.type });
      }
      c = end;
    }
  }
  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const g = grid[r][c];
      if (!g || g.special === SPECIAL_BOMB) { r++; continue; }
      let end = r + 1;
      while (end < ROWS) {
        const g2 = grid[end][c];
        if (!g2 || g2.special === SPECIAL_BOMB || g2.type !== g.type) break;
        end++;
      }
      const len = end - r;
      if (len >= 3) {
        const cells = [];
        for (let rr = r; rr < end; rr++) cells.push({ r: rr, c });
        runs.push({ cells, orientation: 'v', type: g.type });
      }
      r = end;
    }
  }
  return runs;
}

/** Longest run (horizontal or vertical) passing through (r,c) for whatever
 * gem currently occupies it. Used by wouldMatch to check *only* the two
 * cells a candidate swap actually touches — deliberately not a full-board
 * findRuns, which would also pick up any unrelated run elsewhere on the
 * board and report a swap as "matching" even though it changed nothing
 * near it. (Not a concern in normal play, where resolveStep always leaves
 * the board fully settled/run-free before the next swap is even
 * considered — but a real bug waiting to happen for any future caller,
 * e.g. a test harness, that checks a mid-resolution or hand-built grid.) */
function runLengthThrough(grid, r, c) {
  const g = grid[r][c];
  if (!g || g.special === SPECIAL_BOMB) return 1;
  const sameType = (rr, cc) => {
    const g2 = grid[rr][cc];
    return g2 && g2.special !== SPECIAL_BOMB && g2.type === g.type;
  };
  let h = 1;
  for (let cc = c - 1; cc >= 0 && sameType(r, cc); cc--) h++;
  for (let cc = c + 1; cc < COLS && sameType(r, cc); cc++) h++;
  let v = 1;
  for (let rr = r - 1; rr >= 0 && sameType(rr, c); rr--) v++;
  for (let rr = r + 1; rr < ROWS && sameType(rr, c); rr++) v++;
  return Math.max(h, v);
}

/**
 * Would swapping (r1,c1)<->(r2,c2) create at least one match? A gem with
 * special SPECIAL_BOMB always answers true — its whole purpose is to be
 * swapped into place, no ordinary 3-line required (see bombSwapCells below
 * for what actually happens when one is committed).
 */
export function wouldMatch(grid, r1, c1, r2, c2) {
  const a = grid[r1][c1];
  const b = grid[r2][c2];
  if (!a || !b) return false;
  if (a.special === SPECIAL_BOMB || b.special === SPECIAL_BOMB) return true;
  grid[r1][c1] = b;
  grid[r2][c2] = a;
  const has = runLengthThrough(grid, r1, c1) >= 3 || runLengthThrough(grid, r2, c2) >= 3;
  grid[r1][c1] = a;
  grid[r2][c2] = b;
  return has;
}

/** Does any adjacent pair on the board have a legal (match-making) swap? */
export function hasAnyValidMove(grid) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const g = grid[r][c];
      if (g && g.special === SPECIAL_BOMB) return true;
      if (c + 1 < COLS && wouldMatch(grid, r, c, r, c + 1)) return true;
      if (r + 1 < ROWS && wouldMatch(grid, r, c, r + 1, c)) return true;
    }
  }
  return false;
}

/** Defensive last-resort patch (see generateBoard) — guarantees a legal
 * move exists by construction rather than by chance. Never disturbs more
 * than 3 cells, and never itself creates a pre-existing run: (0,1) keeps a
 * color distinct from (0,0)/(0,2)/(1,1) so nothing matches until the player
 * actually swaps (0,1) with (1,1). */
function forceOneValidMove(grid, nextId) {
  const other = TYPES.find((t) => t !== TYPES[0]) || TYPES[1];
  grid[0][0] = makeGem(nextId(), TYPES[0]);
  grid[0][2] = makeGem(nextId(), TYPES[0]);
  grid[1][1] = makeGem(nextId(), TYPES[0]);
  grid[0][1] = makeGem(nextId(), other);
}

/**
 * A fresh ROWS x COLS grid with zero pre-existing runs and at least one
 * legal swap. Construction avoids runs cell-by-cell (never picks a type
 * that would complete a run-of-3 immediately to its left or above) so the
 * "no pre-existing match" property holds by construction, not by rejection
 * sampling; only the (much rarer) "at least one legal move exists" property
 * needs a retry loop, bounded generously — and forceOneValidMove is a
 * belt-and-suspenders fallback that should in practice never fire.
 */
export function generateBoard(nextId) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const avoid = new Set();
        if (c >= 2 && row[c - 1].type === row[c - 2].type) avoid.add(row[c - 1].type);
        if (r >= 2 && grid[r - 1][c].type === grid[r - 2][c].type) avoid.add(grid[r - 1][c].type);
        const choices = TYPES.filter((t) => !avoid.has(t));
        const type = choices[(Math.random() * choices.length) | 0];
        row.push(makeGem(nextId(), type));
      }
      grid.push(row);
    }
    if (hasAnyValidMove(grid)) return grid;
  }
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push(makeGem(nextId(), randomType()));
    grid.push(row);
  }
  forceOneValidMove(grid, nextId);
  return grid;
}

/** All board cells currently holding a gem of the given type (bombs never
 * match, so this only ever returns non-bomb cells). */
function cellsOfType(grid, type) {
  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const g = grid[r][c];
      if (g && g.type === type) cells.push({ r, c });
    }
  }
  return cells;
}

/** A random color actually present on the board right now, or null if the
 * (practically impossible) case of an all-bomb board occurs. */
function pickPresentType(grid) {
  const present = new Set();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const g = grid[r][c];
      if (g && g.special !== SPECIAL_BOMB) present.add(g.type);
    }
  }
  const arr = [...present];
  return arr.length ? arr[(Math.random() * arr.length) | 0] : null;
}

/**
 * Resolve one clear step and mutate `grid` in place. Two ways to seed it:
 *   - `runs`: fresh findRuns(grid) output — the normal "a match exists"
 *     path. Runs of length 4 spawn a row/col special at an anchor cell
 *     (preferring a cell in `preferredCells` — the swap that triggered this
 *     — else the run's middle cell); length 5+ spawns a color bomb instead.
 *     When two runs would spawn at the same anchor cell, the longer run
 *     (sorted first) wins; ties are resolved by processing order.
 *   - `initialCells`: an explicit flat cell list with no run/special-spawn
 *     step of its own — used for a direct bomb-swap activation, where
 *     game.js has already computed "every cell of the target color, plus
 *     the bomb's own cell" and just wants it swept (and chained) as-is.
 * Either way, the seed cells are then expanded through a worklist: any
 * *pre-existing* special caught in the sweep (a row/col special being
 * cleared, or a bomb) triggers its own effect too, so specials chain into
 * each other for extra-satisfying big clears. A cell chosen as a new
 * special's anchor always survives, even if some other effect's sweep
 * would otherwise pass through it.
 *
 * Returns { clearedCells, specialSpawns, rowColActivated, bombsActivated }.
 */
export function resolveStep(grid, { runs = null, initialCells = null, preferredCells = [] } = {}) {
  const specialSpawns = new Map(); // key -> {r,c,id,kind,baseType}
  let seedCells = initialCells || [];

  if (runs) {
    const sorted = [...runs].sort((a, b) => b.cells.length - a.cells.length);
    const baseCleared = new Map(); // key -> {r,c}
    for (const run of sorted) {
      for (const cell of run.cells) baseCleared.set(key(cell.r, cell.c), cell);
      if (run.cells.length >= 4) {
        let anchor = run.cells.find((cell) => preferredCells.some((p) => p.r === cell.r && p.c === cell.c));
        if (!anchor) anchor = run.cells[(run.cells.length - 1) >> 1];
        const anchorKey = key(anchor.r, anchor.c);
        if (!specialSpawns.has(anchorKey)) {
          specialSpawns.set(anchorKey, {
            r: anchor.r,
            c: anchor.c,
            id: grid[anchor.r][anchor.c].id,
            kind: run.cells.length >= 5 ? SPECIAL_BOMB : (run.orientation === 'h' ? SPECIAL_ROW : SPECIAL_COL),
            baseType: run.type,
          });
        }
      }
    }
    seedCells = [...baseCleared.values()];
  }

  const survivorKeys = new Set(specialSpawns.keys());
  // key -> {r,c,id,type,special} — captured at the moment each cell is
  // cleared, *before* grid[r][c] is nulled below, so callers (game.js)
  // still know which DOM element (keyed by id) belonged there and what it
  // was, purely from the return value, without re-reading a grid that has
  // since been mutated.
  const cleared = new Map();
  const queue = [...seedCells];
  let rowColActivated = 0;
  let bombsActivated = 0;

  while (queue.length) {
    const cell = queue.pop();
    if (!inBounds(cell.r, cell.c)) continue;
    const k = key(cell.r, cell.c);
    if (cleared.has(k) || survivorKeys.has(k)) continue;
    const gem = grid[cell.r][cell.c];
    if (!gem) continue;
    cleared.set(k, { r: cell.r, c: cell.c, id: gem.id, type: gem.type, special: gem.special });
    if (gem.special === SPECIAL_ROW) {
      rowColActivated++;
      for (let cc = 0; cc < COLS; cc++) queue.push({ r: cell.r, c: cc });
    } else if (gem.special === SPECIAL_COL) {
      rowColActivated++;
      for (let rr = 0; rr < ROWS; rr++) queue.push({ r: rr, c: cell.c });
    } else if (gem.special === SPECIAL_BOMB) {
      bombsActivated++;
      const targetType = pickPresentType(grid);
      if (targetType) for (const tc of cellsOfType(grid, targetType)) queue.push(tc);
    }
  }

  for (const { r, c } of cleared.values()) grid[r][c] = null;
  for (const spawn of specialSpawns.values()) {
    grid[spawn.r][spawn.c] = makeGem(
      spawn.id,
      spawn.kind === SPECIAL_BOMB ? 'bomb' : spawn.baseType,
      spawn.kind,
      spawn.kind === SPECIAL_BOMB ? spawn.baseType : null,
    );
  }

  return {
    clearedCells: [...cleared.values()],
    specialSpawns: [...specialSpawns.values()],
    rowColActivated,
    bombsActivated,
  };
}

/** Every cell of `type`, plus the bomb's own cell — the deterministic
 * "clear this color" seed for a direct bomb<->normal-gem swap. If the
 * partner is itself a bomb, the whole board goes (a rare, deliberate
 * double-bomb mega-combo). */
export function bombSwapCells(grid, bombCell, partnerCell) {
  const partner = grid[partnerCell.r][partnerCell.c];
  if (partner && partner.special === SPECIAL_BOMB) {
    const all = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) all.push({ r, c });
    return all;
  }
  const cells = partner ? cellsOfType(grid, partner.type) : [];
  cells.push({ r: bombCell.r, c: bombCell.c });
  return cells;
}

/**
 * Compact each column (surviving gems fall to fill gaps) and refill the
 * emptied top with fresh random gems, mutating `grid` in place. Returns a
 * per-gem movement log game.js uses to animate: survivors get a `fromRow`
 * (their previous row, purely informational), new gems get a `fromRow`
 * that stacks them consecutively just above the board — a column short by
 * `missing` gems has its new gems start at rows -missing..-1, so every new
 * gem in that column falls the exact same distance and they all arrive in
 * order, like a queue that was already waiting right above the grid.
 */
export function applyGravity(grid, nextId) {
  const events = [];
  for (let c = 0; c < COLS; c++) {
    const survivors = [];
    for (let r = 0; r < ROWS; r++) {
      if (grid[r][c]) survivors.push({ gem: grid[r][c], fromRow: r });
    }
    const missing = ROWS - survivors.length;
    for (let i = 0; i < missing; i++) {
      const gem = makeGem(nextId(), randomType());
      grid[i][c] = gem;
      events.push({ id: gem.id, col: c, fromRow: i - missing, toRow: i, isNew: true });
    }
    for (let i = 0; i < survivors.length; i++) {
      const toRow = missing + i;
      grid[toRow][c] = survivors[i].gem;
      events.push({ id: survivors[i].gem.id, col: c, fromRow: survivors[i].fromRow, toRow, isNew: false });
    }
  }
  return events;
}
