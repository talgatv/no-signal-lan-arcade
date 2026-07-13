/**
 * levels.js — maze layouts for Ray Maze.
 *
 * Each level is a rectangular grid of cells. A cell is either empty (floor you
 * can walk on and cast rays through) or a solid wall of some type. The grids
 * are authored as ASCII art for legibility and parsed into a flat structure at
 * load time. Non-wall glyphs (`P`, `d`, `s`, `h`, `E`) mark spawns / pickups /
 * the exit and are treated as floor by the wall grid — they are lifted out into
 * separate lists.
 *
 * IMPORTANT (raycasting safety): the parser forces the entire outer ring of
 * every level to a solid wall. A DDA ray that never hits a wall would march to
 * infinity, so a fully-enclosed border is a hard requirement of the technique,
 * not a stylistic choice. Rows shorter than the widest row are padded with wall
 * so the grid is always a clean rectangle regardless of authoring slips.
 *
 * Glyph legend:
 *   '#'  wall type 1 (cyan structural)
 *   '%'  wall type 2 (magenta accent)
 *   '='  wall type 3 (amber tech)
 *   '.'  or ' '  floor
 *   'P'  player spawn (floor)
 *   'd'  drone spawn — melee construct (floor)
 *   's'  sentry spawn — ranged construct (floor)
 *   'h'  health pack (floor)
 *   'E'  exit pad (floor; activates once all enemies are cleared)
 */

/** Wall glyph -> integer cell type used by the renderer palette. */
export const WALL_TYPES = { '#': 1, '%': 2, '=': 3 };

/**
 * Raw level definitions. `dir` is the player's initial facing in radians using
 * the engine's convention: 0 = +x (east / increasing column), PI/2 = +y
 * (south / increasing row / "deeper down the screen on the minimap").
 */
const RAW_LEVELS = [
  {
    // Grids are perfect-maze-generated (recursive backtracker + a few loop
    // "braid" openings) then verified by flood-fill so the spawn can actually
    // reach the exit and every enemy/pickup — a maze with a walled-off enemy
    // would be unwinnable (its exit never unlocks). Player spawns at (1,1)
    // facing south (dir = PI/2) down the long left-edge corridor. Accent wall
    // glyphs (%, =) are scattered on interior walls only for color variety.
    id: 'cold-start',
    name: { en: 'Cold Start', ru: 'Холодный старт' },
    dir: Math.PI / 2,
    grid: [
      '###############',
      '#P..#.....#.s.#',
      '#.#.###.d.###.#',
      '#.#.....%.h...#',
      '#.%####.###=#.#',
      '#.....#...#...#',
      '#.#%#h#.=.#.###',
      '#.#.#...#.%.#E#',
      '#.#.%.#####.#.#',
      '#.#...#d....=.#',
      '#.=##.#.#####.#',
      '#...#.#.#...%.#',
      '#.#.##%.#.#.#.#',
      '#.#.......#...#',
      '###############',
    ],
  },
  {
    id: 'crossfire',
    name: { en: 'Crossfire', ru: 'Перекрёстный огонь' },
    dir: Math.PI / 2,
    grid: [
      '#################',
      '#P#.#.d.......#.#',
      '#...#.#####.#.%.#',
      '#.#......s#...#.#',
      '#.%######.#.#.#.#',
      '#.....#...#.#...#',
      '#.#%#...=##.#.#.#',
      '#.#...#.#...#.#.#',
      '#.#.%=###.###.#d#',
      '#.#.#.....#E=.#.#',
      '#.=.#%#.###.#.#.#',
      '#...#h..#.h.%.#.#',
      '#.#.#..s#.#.#.#.#',
      '#.#.....#d..#...#',
      '#.#####.#.#.#=#.#',
      '#.......#.......#',
      '#################',
    ],
  },
  {
    id: 'the-vault',
    name: { en: 'The Vault', ru: 'Хранилище' },
    dir: Math.PI / 2,
    grid: [
      '###################',
      '#P#........d#.....#',
      '#.#.####h##..s%##.#',
      '#.#.=.#...#.....#.#',
      '#.%.#.#.#.#=###.#.#',
      '#...#.........#...#',
      '###%#.#.=##.###.%##',
      '#.........%s....#.#',
      '###.%.###.#.#####.#',
      '#...#...#.........#',
      '#.=##.#.#######.#.#',
      '#...#.#....s......#',
      '##..#.%########..##',
      '#..d#...#.........#',
      '#.#.###.###.#.###.#',
      '#.....#.....d.%.#.#',
      '#.######%#=####.#h#',
      '#.h......E........#',
      '###################',
    ],
  },
];

/** Center-of-cell world coordinate for a grid column/row index. */
function cellCenter(col, row) {
  return { x: col + 0.5, y: row + 0.5 };
}

/**
 * Parse one raw level into a runtime structure:
 *   { id, name, dir, w, h, cells: Int8Array (row-major), spawn, exit,
 *     enemies:[{type,x,y}], health:[{x,y}] }
 * Wall cells hold their integer type (>0); floor cells hold 0.
 */
export function parseLevel(raw) {
  const rows = raw.grid.slice();
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const cells = new Int8Array(w * h);
  const enemies = [];
  const health = [];
  let spawn = { x: 1.5, y: 1.5, dir: raw.dir || 0 };
  let exit = null;

  for (let row = 0; row < h; row++) {
    const line = rows[row];
    for (let col = 0; col < w; col++) {
      const ch = line[col] ?? '#'; // pad short rows with wall
      const border = row === 0 || col === 0 || row === h - 1 || col === w - 1;
      if (border) {
        // Force a solid enclosing ring so no ray escapes the grid.
        cells[row * w + col] = WALL_TYPES[ch] || 1;
        continue;
      }
      if (WALL_TYPES[ch]) {
        cells[row * w + col] = WALL_TYPES[ch];
        continue;
      }
      // floor cell — record any entity glyph sitting on it
      cells[row * w + col] = 0;
      const c = cellCenter(col, row);
      switch (ch) {
        case 'P':
          spawn = { x: c.x, y: c.y, dir: raw.dir || 0 };
          break;
        case 'd':
          enemies.push({ type: 'drone', x: c.x, y: c.y });
          break;
        case 's':
          enemies.push({ type: 'sentry', x: c.x, y: c.y });
          break;
        case 'h':
          health.push({ x: c.x, y: c.y });
          break;
        case 'E':
          exit = { x: c.x, y: c.y, col, row };
          break;
        default:
          break; // '.', ' ' -> plain floor
      }
    }
  }

  if (!exit) {
    // Fallback: guarantee an exit exists even if a grid forgot one.
    exit = { x: w - 1.5, y: h - 1.5, col: w - 2, row: h - 2 };
  }

  return { id: raw.id, name: raw.name, dir: raw.dir || 0, w, h, cells, spawn, exit, enemies, health };
}

/** All levels, parsed. */
export const LEVELS = RAW_LEVELS.map(parseLevel);

/** Is the cell at integer (col,row) solid? Out-of-bounds counts as solid. */
export function isWall(level, col, row) {
  if (col < 0 || row < 0 || col >= level.w || row >= level.h) return true;
  return level.cells[row * level.w + col] !== 0;
}

/** Wall type integer at (col,row), or 0 for floor / out-of-bounds-as-1. */
export function wallType(level, col, row) {
  if (col < 0 || row < 0 || col >= level.w || row >= level.h) return 1;
  return level.cells[row * level.w + col];
}
