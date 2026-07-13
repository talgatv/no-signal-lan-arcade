/**
 * patterns.js — small library of famous, well-documented Game of Life
 * patterns the player can drop onto the grid. Pure data (relative [col,row]
 * offsets from each pattern's own top-left origin) plus a DOM-free stamp
 * helper — no `document`/canvas references, same headless-testable
 * convention as simulation.js.
 *
 * Every coordinate list here was checked against the well-known behavior
 * of the real pattern (still lifes stay static, oscillators return to
 * their exact starting cells after their known period, spaceships keep a
 * constant population while translating) with a throwaway Node harness
 * before this shipped — these are standard, widely-published patterns, not
 * original inventions.
 */

import { setCellAlive, recountLive } from './simulation.js';

/** Build the 48-cell pulsar (period-3 oscillator) from its 4-fold symmetry:
 * four horizontal 3-cell "bars" (rows 0, 5, 7, 12 x cols 2-4 and 8-10) and
 * four vertical 3-cell "bars" (cols 0, 5, 7, 12 x rows 2-4 and 8-10). */
function buildPulsar() {
  const cells = [];
  const barRows = [0, 5, 7, 12];
  const barCols = [2, 3, 4, 8, 9, 10];
  const stemCols = [0, 5, 7, 12];
  const stemRows = [2, 3, 4, 8, 9, 10];
  for (const r of barRows) for (const c of barCols) cells.push([c, r]);
  for (const r of stemRows) for (const c of stemCols) cells.push([c, r]);
  return cells;
}

export const PATTERNS = [
  {
    id: 'block',
    category: 'still-life',
    nameKey: 'patternBlock',
    cells: [[0, 0], [1, 0], [0, 1], [1, 1]],
  },
  {
    id: 'beehive',
    category: 'still-life',
    nameKey: 'patternBeehive',
    cells: [[1, 0], [2, 0], [0, 1], [3, 1], [1, 2], [2, 2]],
  },
  {
    id: 'blinker',
    category: 'oscillator',
    nameKey: 'patternBlinker',
    cells: [[0, 0], [1, 0], [2, 0]],
  },
  {
    id: 'toad',
    category: 'oscillator',
    nameKey: 'patternToad',
    cells: [[1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1]],
  },
  {
    id: 'beacon',
    category: 'oscillator',
    nameKey: 'patternBeacon',
    cells: [[0, 0], [1, 0], [0, 1], [1, 1], [2, 2], [3, 2], [2, 3], [3, 3]],
  },
  {
    id: 'pulsar',
    category: 'oscillator',
    nameKey: 'patternPulsar',
    cells: buildPulsar(),
  },
  {
    id: 'glider',
    category: 'spaceship',
    nameKey: 'patternGlider',
    cells: [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]],
  },
  {
    id: 'gosperGun',
    category: 'gun',
    nameKey: 'patternGosperGun',
    cells: [
      [24, 0],
      [22, 1], [24, 1],
      [12, 2], [13, 2], [20, 2], [21, 2], [34, 2], [35, 2],
      [11, 3], [15, 3], [20, 3], [21, 3], [34, 3], [35, 3],
      [0, 4], [1, 4], [10, 4], [16, 4], [20, 4], [21, 4],
      [0, 5], [1, 5], [10, 5], [14, 5], [16, 5], [17, 5], [22, 5], [24, 5],
      [10, 6], [16, 6], [24, 6],
      [11, 7], [15, 7],
      [12, 8], [13, 8],
    ],
  },
];

export function getPattern(id) {
  return PATTERNS.find((p) => p.id === id) || null;
}

/** [width, height] of a pattern's tight bounding box. */
export function patternSize(pattern) {
  let maxC = 0;
  let maxR = 0;
  for (const [c, r] of pattern.cells) {
    if (c > maxC) maxC = c;
    if (r > maxR) maxR = r;
  }
  return [maxC + 1, maxR + 1];
}

/**
 * Stamp `pattern` onto `grid` so its bounding box's top-left lands at
 * (originC, originR): clears every cell in that bounding box first (so the
 * result is exactly the pattern, not a merge with whatever was already
 * there), then sets the pattern's live cells. Coordinates falling outside
 * the grid are silently skipped (no wrap for placement — only the
 * simulation's neighbor counting wraps).
 */
export function stampPattern(grid, pattern, originC, originR) {
  const [w, h] = patternSize(pattern);
  for (let dr = 0; dr < h; dr++) {
    for (let dc = 0; dc < w; dc++) {
      setCellAlive(grid, originC + dc, originR + dr, false);
    }
  }
  for (const [dc, dr] of pattern.cells) {
    setCellAlive(grid, originC + dc, originR + dr, true);
  }
  recountLive(grid);
}

/** Centered stamp — the common case the pattern-library UI uses. */
export function stampPatternCentered(grid, pattern) {
  const [w, h] = patternSize(pattern);
  const originC = Math.max(0, Math.floor((grid.cols - w) / 2));
  const originR = Math.max(0, Math.floor((grid.rows - h) / 2));
  stampPattern(grid, pattern, originC, originR);
  return { originC, originR };
}
