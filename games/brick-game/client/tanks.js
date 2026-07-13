/**
 * tanks.js — a Battle City-style tank game for the Brick Game collection.
 *
 * Top-down grid arena on the shared 26x26 LCD dot field. The player tank moves
 * in four grid-aligned directions (no free rotation — the iconic simple
 * control feel), fires a bullet straight ahead that crumbles brick walls (one
 * dot per hit), is stopped by indestructible steel, and destroys enemy tanks.
 * Enemy tanks spawn from the top in escalating waves and have real AI: they
 * roam, converge on the player's base (and sometimes the player), and shoot
 * when lined up. Classic Battle City objective — if an enemy shot reaches the
 * eagle base, the run is lost immediately even with lives to spare.
 *
 * Walls live at DOT resolution so bricks crumble a dot at a time. Two shades
 * keep brick vs steel readable on the monochrome LCD: brick = mid (DIM), steel
 * = dark (ON). The dot field never mirrors under RTL (see lcd.js / i18n.js).
 */
import { ON, DIM } from './lcd.js';

export const TANKS = {
  id: 'brick-tanks',
  nameKey: 'tanksName',
  descKey: 'tanksDesc',
  blurbKey: 'tanksBlurb',
  controlsKey: 'tanksControls',
  hintKey: 'hintTanks',
  // Menu icon — a chunky tank, drawn with the shared dot renderer.
  icon: [
    '....XX....',
    '....XX....',
    '.XXXXXXXX.',
    'XXXXXXXXXX',
    'XX.XXXX.XX',
    'XXXXXXXXXX',
    'X.X.XX.X.X',
  ],
  create,
};

const COLS = 26;
const ROWS = 26;

// Cell types (dot resolution).
const EMPTY = 0;
const BRICK = 1;
const STEEL = 2;
const BASE = 3;

const T = 3; // tank footprint is TxT dots

const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};
const DIR_LIST = ['up', 'down', 'left', 'right'];

// 3x3 tank sprites — barrel dot marks the facing direction.
const PLAYER_SPR = {
  up: ['.X.', 'XXX', 'X.X'],
  down: ['X.X', 'XXX', '.X.'],
  left: ['.XX', 'XX.', '.XX'],
  right: ['XX.', '.XX', 'XX.'],
};
// Enemy tanks — same silhouette, hollow core so they read as "the other side".
const ENEMY_SPR = {
  up: ['.X.', 'X.X', 'X.X'],
  down: ['X.X', 'X.X', '.X.'],
  left: ['.XX', 'X..', '.XX'],
  right: ['XX.', '..X', 'XX.'],
};
const EAGLE_SPR = ['X.X', '.X.', 'XXX'];

// Spawn / layout anchors.
const BASE_X = 12; // base occupies dots 12..14 (x)
const BASE_Y = 22; // rows 22..24
const PLAYER_SPAWN = { x: 6, y: 21 }; // clear bottom lane, left of the base shield
const ENEMY_SPAWNS = [
  { x: 1, y: 1 },
  { x: 11, y: 1 },
  { x: 22, y: 1 },
];

const PLAYER_MOVE_MS = 55; // ms per dot moved
const BULLET_DOTS_PER_S = 46;
const PLAYER_FIRE_CD_MS = 340;
const SPAWN_INVULN_MS = 700;
const RESPAWN_INVULN_MS = 1400;
const START_LIVES = 3;

function create(env) {
  const map = new Int8Array(COLS * ROWS);
  const state = {
    lives: START_LIVES,
    wave: 1,
    score: 0,
    over: false,
    remaining: 0, // enemies still to spawn this wave
    maxAlive: 3,
  };
  /** @type {any} */
  let player = null;
  const enemies = [];
  const bullets = []; // {x,y,dir,friendly, acc}
  let spawnTimer = 0;
  let waveClearTimer = 0;
  const held = { up: false, down: false, left: false, right: false };
  let curDir = null;
  let actionHeld = false;
  let elapsed = 0;

  /* ---- arena construction -------------------------------------------- */
  const cell = (x, y) => (x < 0 || y < 0 || x >= COLS || y >= ROWS ? STEEL : map[y * COLS + x]);
  const setCell = (x, y, v) => {
    if (x >= 0 && y >= 0 && x < COLS && y < ROWS) map[y * COLS + x] = v;
  };
  const stamp = (x, y, w, h, v) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) setCell(x + i, y + j, v);
  };

  function buildArena(waveIdx) {
    map.fill(EMPTY);
    // Steel border ring.
    for (let x = 0; x < COLS; x++) {
      setCell(x, 0, STEEL);
      setCell(x, ROWS - 1, STEEL);
    }
    for (let y = 0; y < ROWS; y++) {
      setCell(0, y, STEEL);
      setCell(COLS - 1, y, STEEL);
    }
    // Interior maze — three cycling layouts.
    const v = waveIdx % 3;
    if (v === 0) {
      stamp(5, 6, 3, 6, BRICK);
      stamp(18, 6, 3, 6, BRICK);
      stamp(11, 9, 4, 3, BRICK);
      setCell(8, 12, STEEL); setCell(9, 12, STEEL);
      setCell(16, 12, STEEL); setCell(17, 12, STEEL);
      stamp(4, 16, 5, 2, BRICK);
      stamp(17, 16, 5, 2, BRICK);
    } else if (v === 1) {
      for (let x = 3; x < 23; x += 4) stamp(x, 8, 2, 2, BRICK);
      for (let x = 5; x < 21; x += 4) stamp(x, 14, 2, 2, STEEL);
      stamp(2, 5, 2, 5, BRICK);
      stamp(22, 5, 2, 5, BRICK);
    } else {
      stamp(6, 5, 14, 2, BRICK);
      setCell(12, 5, EMPTY); setCell(13, 5, EMPTY);
      stamp(6, 5, 2, 8, BRICK);
      stamp(18, 5, 2, 8, BRICK);
      setCell(4, 15, STEEL); setCell(21, 15, STEEL);
      stamp(10, 15, 6, 2, BRICK);
    }
    // Base + brick shield.
    stamp(BASE_X, BASE_Y, 3, 3, BASE);
    // shield ring (brick) around the eagle
    stamp(BASE_X - 1, BASE_Y - 1, 5, 1, BRICK); // top
    stamp(BASE_X - 1, BASE_Y, 1, 3, BRICK); // left
    stamp(BASE_X + 3, BASE_Y, 1, 3, BRICK); // right
  }

  /* ---- collision helpers --------------------------------------------- */
  const solidDot = (x, y) => {
    const c = cell(x, y);
    return c === BRICK || c === STEEL || c === BASE;
  };

  function footprintClear(x, y, ignore) {
    if (x < 0 || y < 0 || x + T > COLS || y + T > ROWS) return false;
    for (let j = 0; j < T; j++) {
      for (let i = 0; i < T; i++) {
        if (solidDot(x + i, y + j)) return false;
      }
    }
    // other tanks
    const all = player ? [player, ...enemies] : enemies;
    for (const tk of all) {
      if (tk === ignore || tk.dead) continue;
      if (x < tk.x + T && x + T > tk.x && y < tk.y + T && y + T > tk.y) return false;
    }
    return true;
  }

  /* ---- spawning ------------------------------------------------------- */
  function makeTank(x, y, kind) {
    return {
      x, y, dir: kind === 'player' ? 'up' : 'down', kind,
      moveAcc: 0, fireCd: 0, retarget: 0, invuln: kind === 'player' ? RESPAWN_INVULN_MS : SPAWN_INVULN_MS,
      dead: false,
    };
  }

  function spawnPlayer() {
    player = makeTank(PLAYER_SPAWN.x, PLAYER_SPAWN.y, 'player');
  }

  function trySpawnEnemy() {
    if (state.remaining <= 0) return;
    const open = ENEMY_SPAWNS.filter((s) => footprintClear(s.x, s.y, null));
    if (!open.length) return;
    const s = open[(Math.random() * open.length) | 0];
    const e = makeTank(s.x, s.y, 'enemy');
    enemies.push(e);
    state.remaining--;
  }

  function startWave() {
    buildArena(state.wave - 1);
    enemies.length = 0;
    bullets.length = 0;
    state.remaining = Math.min(16, 4 + state.wave * 2);
    state.maxAlive = Math.min(4, 2 + Math.floor(state.wave / 2));
    spawnTimer = 300;
    spawnPlayer();
    env.banner(env.t('wavePrefix', { n: state.wave }));
  }

  function start() {
    state.lives = START_LIVES;
    state.wave = 1;
    state.score = 0;
    state.over = false;
    waveClearTimer = 0;
    clearHeld();
    startWave();
  }

  function clearHeld() {
    held.up = held.down = held.left = held.right = false;
    curDir = null;
    actionHeld = false;
  }

  /* ---- firing --------------------------------------------------------- */
  function frontDot(tk) {
    const d = DIRS[tk.dir];
    const cx = tk.x + 1; // tank centre col/row (3-wide => +1)
    const cy = tk.y + 1;
    return { x: cx + d.dx * 2, y: cy + d.dy * 2 };
  }

  function tryFire(tk, friendly) {
    if (tk.fireCd > 0) return false;
    if (friendly && bullets.some((b) => b.friendly)) return false; // one player bullet at a time
    const f = frontDot(tk);
    bullets.push({ x: f.x, y: f.y, dir: tk.dir, friendly, acc: 0 });
    tk.fireCd = friendly ? PLAYER_FIRE_CD_MS : 900;
    env.sfx.play('pop');
    return true;
  }

  function bulletHitTank(b, list) {
    for (const tk of list) {
      if (tk.dead || tk.invuln > 0) continue;
      if (b.x >= tk.x && b.x < tk.x + T && b.y >= tk.y && b.y < tk.y + T) return tk;
    }
    return null;
  }

  function stepBullet(b) {
    const d = DIRS[b.dir];
    b.x += d.dx;
    b.y += d.dy;
    const c = cell(b.x, b.y);
    if (b.x < 0 || b.y < 0 || b.x >= COLS || b.y >= ROWS) return true; // gone
    if (c === BASE) {
      // Eagle destroyed — instant loss regardless of lives.
      loseBase();
      return true;
    }
    if (c === STEEL) {
      env.sfx.play('tick');
      return true;
    }
    if (c === BRICK) {
      setCell(b.x, b.y, EMPTY);
      env.sfx.play('clack');
      return true;
    }
    // tanks
    if (b.friendly) {
      const hit = bulletHitTank(b, enemies);
      if (hit) {
        hit.dead = true;
        state.score += 100;
        env.sfx.play('thwack');
        return true;
      }
    } else if (player && !player.dead && player.invuln <= 0) {
      if (b.x >= player.x && b.x < player.x + T && b.y >= player.y && b.y < player.y + T) {
        killPlayer();
        return true;
      }
    }
    return false;
  }

  /* ---- loss / life handling ------------------------------------------ */
  function loseBase() {
    if (state.over) return;
    setCell(BASE_X + 1, BASE_Y + 1, EMPTY);
    env.sfx.play('die');
    endGame(false, 'baseLost');
  }

  function killPlayer() {
    player.dead = true;
    state.lives--;
    env.sfx.play('splat');
    if (state.lives <= 0) {
      endGame(false, 'tanksOverSub');
    } else {
      setTimeout(() => {
        if (!state.over) spawnPlayer();
      }, 500);
    }
  }

  function endGame(isWin, subKey) {
    if (state.over) return;
    state.over = true;
    env.gameOver({ score: state.score, isWin, subKey });
  }

  /* ---- enemy AI ------------------------------------------------------- */
  function chooseEnemyDir(e) {
    // Target: mostly the base, sometimes the player — classic Battle City
    // seek-the-eagle behaviour with a wandering fraction so they don't clump.
    let tx;
    let ty;
    const r = Math.random();
    if (r < 0.55) { tx = BASE_X + 1; ty = BASE_Y + 1; }
    else if (r < 0.8 && player && !player.dead) { tx = player.x + 1; ty = player.y + 1; }
    else { return DIR_LIST[(Math.random() * 4) | 0]; }
    const dx = tx - (e.x + 1);
    const dy = ty - (e.y + 1);
    const prefs = [];
    if (Math.abs(dx) > Math.abs(dy)) {
      prefs.push(dx > 0 ? 'right' : 'left', dy > 0 ? 'down' : 'up');
    } else {
      prefs.push(dy > 0 ? 'down' : 'up', dx > 0 ? 'right' : 'left');
    }
    for (const dir of prefs) {
      const d = DIRS[dir];
      if (footprintClear(e.x + d.dx, e.y + d.dy, e)) return dir;
    }
    // blocked toward target — pick any open direction
    const open = DIR_LIST.filter((dir) => {
      const d = DIRS[dir];
      return footprintClear(e.x + d.dx, e.y + d.dy, e);
    });
    return open.length ? open[(Math.random() * open.length) | 0] : e.dir;
  }

  function enemyAlignedShot(e) {
    // Fire when roughly lined up (same column/row band) with player or base.
    const targets = [{ x: BASE_X + 1, y: BASE_Y + 1 }];
    if (player && !player.dead) targets.push({ x: player.x + 1, y: player.y + 1 });
    for (const tgt of targets) {
      const ecx = e.x + 1;
      const ecy = e.y + 1;
      if (Math.abs(tgt.x - ecx) <= 1 && ((e.dir === 'down' && tgt.y > ecy) || (e.dir === 'up' && tgt.y < ecy))) return true;
      if (Math.abs(tgt.y - ecy) <= 1 && ((e.dir === 'right' && tgt.x > ecx) || (e.dir === 'left' && tgt.x < ecx))) return true;
    }
    return false;
  }

  function updateEnemy(e, dt) {
    const speed = Math.max(70, 105 - state.wave * 4); // ms per dot, faster with waves
    e.retarget -= dt;
    if (e.retarget <= 0) {
      e.dir = chooseEnemyDir(e);
      e.retarget = 500 + Math.random() * 900;
    }
    e.moveAcc += dt;
    while (e.moveAcc >= speed) {
      e.moveAcc -= speed;
      const d = DIRS[e.dir];
      if (footprintClear(e.x + d.dx, e.y + d.dy, e)) {
        e.x += d.dx;
        e.y += d.dy;
      } else {
        e.dir = chooseEnemyDir(e);
      }
    }
    e.fireCd -= dt;
    const fireBase = Math.max(500, 1300 - state.wave * 60);
    if (e.fireCd <= 0) {
      if (enemyAlignedShot(e) || Math.random() < 0.15) {
        tryFire(e, false);
      }
      e.fireCd = fireBase * (0.6 + Math.random() * 0.7);
    }
  }

  /* ---- main update ---------------------------------------------------- */
  function update(dt) {
    if (state.over) return;
    const dtMs = dt * 1000;
    elapsed += dtMs;

    // Player movement (held direction, grid-aligned 1 dot per step).
    if (player && !player.dead) {
      if (player.invuln > 0) player.invuln -= dtMs;
      if (player.fireCd > 0) player.fireCd -= dtMs;
      if (curDir) {
        player.dir = curDir;
        player.moveAcc += dtMs;
        while (player.moveAcc >= PLAYER_MOVE_MS) {
          player.moveAcc -= PLAYER_MOVE_MS;
          const d = DIRS[curDir];
          if (footprintClear(player.x + d.dx, player.y + d.dy, player)) {
            player.x += d.dx;
            player.y += d.dy;
          }
        }
      } else {
        player.moveAcc = 0;
      }
      if (actionHeld) tryFire(player, true);
    }

    // Enemies.
    for (const e of enemies) {
      if (e.dead) continue;
      if (e.invuln > 0) e.invuln -= dtMs;
      updateEnemy(e, dtMs);
    }

    // Bullets (sub-stepped so fast bullets never tunnel through a wall/tank).
    for (const b of bullets) {
      b.acc += BULLET_DOTS_PER_S * dt;
      while (b.acc >= 1) {
        b.acc -= 1;
        if (stepBullet(b)) { b.done = true; break; }
      }
    }
    for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].done) bullets.splice(i, 1);

    // Reap dead enemies.
    for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) enemies.splice(i, 1);

    if (state.over) return;

    // Spawning.
    if (state.remaining > 0 && enemies.length < state.maxAlive) {
      spawnTimer -= dtMs;
      if (spawnTimer <= 0) {
        trySpawnEnemy();
        spawnTimer = 1600;
      }
    }

    // Wave clear.
    if (state.remaining <= 0 && enemies.length === 0) {
      waveClearTimer += dtMs;
      if (waveClearTimer > 900) {
        waveClearTimer = 0;
        state.wave++;
        state.score += 50 * state.wave;
        env.sfx.play('win');
        startWave();
      }
    }
  }

  /* ---- draw ----------------------------------------------------------- */
  function draw(lcd) {
    // Walls (brick = mid shade, steel = dark).
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = map[y * COLS + x];
        if (c === BRICK) lcd.set(x, y, DIM);
        else if (c === STEEL) lcd.set(x, y, ON);
      }
    }
    // Eagle base sprite (over its region).
    lcd.sprite(BASE_X, BASE_Y, EAGLE_SPR, ON);

    // Tanks — blink while invulnerable (spawn / respawn).
    const blink = (Math.floor(elapsed / 120) % 2) === 0;
    if (player && !player.dead && (player.invuln <= 0 || blink)) {
      lcd.sprite(player.x, player.y, PLAYER_SPR[player.dir], ON);
    }
    for (const e of enemies) {
      if (e.dead) continue;
      if (e.invuln > 0 && !blink) continue;
      lcd.sprite(e.x, e.y, ENEMY_SPR[e.dir], ON);
    }
    // Bullets.
    for (const b of bullets) lcd.set(b.x, b.y, ON);
  }

  /* ---- input ---------------------------------------------------------- */
  function onDir(dir, pressed) {
    if (!(dir in held)) return;
    held[dir] = pressed;
    if (pressed) curDir = dir;
    else if (curDir === dir) {
      curDir = DIR_LIST.find((d) => held[d]) || null;
    }
  }

  function onAction(pressed) {
    actionHeld = pressed;
    if (pressed && player && !player.dead) tryFire(player, true);
  }

  function hud() {
    return [
      { label: env.t('hudScore'), value: state.score },
      { label: env.t('hudWave'), value: state.wave },
      { label: env.t('hudLives'), value: Math.max(0, state.lives) },
      { label: env.t('hudEnemies'), value: state.remaining + enemies.length },
    ];
  }

  return {
    id: TANKS.id,
    cols: COLS,
    rows: ROWS,
    start,
    update,
    draw,
    onDir,
    onAction,
    hud,
    get over() { return state.over; },
    // test-hook surface
    state,
    get player() { return player; },
    enemies,
    bullets,
    map,
  };
}
