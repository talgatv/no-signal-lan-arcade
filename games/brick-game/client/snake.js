/**
 * snake.js — classic grid Snake for the Brick Game collection.
 *
 * Runs on a 13x13 cell board where every cell is a chunky 2x2 block of LCD
 * dots (so the whole board fills the shared 26x26 field and every segment
 * speaks the same "2-dot block" visual language as Tanks and Breakout). The
 * snake moves continuously in the last valid input direction; eating a blip
 * grows it by one and speeds it up; hitting the outer wall or its own body
 * ends the run. Best length/score is kept via OGHProfile (app.js wires it).
 *
 * D-pad only. The board never mirrors under RTL — up/down/left/right stay
 * spatial (see lcd.js / i18n.js).
 */
import { ON, DIM } from './lcd.js';

export const SNAKE = {
  id: 'brick-snake',
  nameKey: 'snakeName',
  descKey: 'snakeDesc',
  blurbKey: 'snakeBlurb',
  controlsKey: 'snakeControls',
  hintKey: 'hintSnake',
  icon: [
    'XXXXXXX..',
    '......X..',
    '.XXXX.X..',
    '.X..X.X..',
    '.X..XXX..',
    '.X.......',
    '.XXXXXXX.',
  ],
  create,
};

const CELLS = 13; // 13x13 cell board
const D = 2; // dots per cell
const MIN = 1; // first playable cell (0 and CELLS-1 are wall)
const MAX = CELLS - 2;

const STEP_START_MS = 200;
const STEP_FLOOR_MS = 78;
const STEP_DECAY_MS = 6; // faster per food eaten
const SCORE_PER_FOOD = 10;

const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

function create(env) {
  const state = {
    snake: [], // [{x,y}], head first
    dir: 'right',
    nextDir: 'right',
    food: { x: 8, y: 6 },
    score: 0,
    over: false,
    stepMs: STEP_START_MS,
    eaten: 0,
  };
  let acc = 0;
  let elapsed = 0;

  function placeFood() {
    const occupied = new Set(state.snake.map((c) => `${c.x},${c.y}`));
    const free = [];
    for (let y = MIN; y <= MAX; y++) {
      for (let x = MIN; x <= MAX; x++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    state.food = free.length ? free[(Math.random() * free.length) | 0] : { x: -1, y: -1 };
  }

  function start() {
    const cy = (CELLS / 2) | 0;
    state.snake = [
      { x: 6, y: cy },
      { x: 5, y: cy },
      { x: 4, y: cy },
    ];
    state.dir = 'right';
    state.nextDir = 'right';
    state.score = 0;
    state.eaten = 0;
    state.stepMs = STEP_START_MS;
    state.over = false;
    acc = 0;
    placeFood();
  }

  function step() {
    // Commit the queued turn (nextDir), never a 180.
    if (OPP[state.nextDir] !== state.dir) state.dir = state.nextDir;
    const d = DIRS[state.dir];
    const head = state.snake[0];
    const nx = head.x + d.dx;
    const ny = head.y + d.dy;

    // Wall collision.
    if (nx < MIN || ny < MIN || nx > MAX || ny > MAX) return crash();

    const willEat = nx === state.food.x && ny === state.food.y;
    // Self collision — the tail cell vacates unless we grow this step.
    const body = willEat ? state.snake : state.snake.slice(0, -1);
    if (body.some((c) => c.x === nx && c.y === ny)) return crash();

    state.snake.unshift({ x: nx, y: ny });
    if (willEat) {
      state.score += SCORE_PER_FOOD;
      state.eaten++;
      state.stepMs = Math.max(STEP_FLOOR_MS, STEP_START_MS - state.eaten * STEP_DECAY_MS);
      env.sfx.play('pickup');
      placeFood();
    } else {
      state.snake.pop();
    }
    return true;
  }

  function crash() {
    state.over = true;
    env.sfx.play('splat');
    env.sfx.play('die');
    env.gameOver({ score: state.score, isWin: false, subKey: 'snakeOverSub' });
    return false;
  }

  function update(dt) {
    if (state.over) return;
    const dtMs = dt * 1000;
    elapsed += dtMs;
    acc += dtMs;
    // Advance in fixed steps; guard against a huge catch-up after a stall.
    let steps = 0;
    while (acc >= state.stepMs && !state.over && steps < 4) {
      acc -= state.stepMs;
      steps++;
      step();
    }
    if (acc > state.stepMs) acc = 0;
  }

  function draw(lcd) {
    // Wall ring (outer cells) — steel-dark blocks.
    for (let i = 0; i < CELLS; i++) {
      block(lcd, i, 0, ON); block(lcd, i, CELLS - 1, ON);
      block(lcd, 0, i, ON); block(lcd, CELLS - 1, i, ON);
    }
    // Snake — body dark, head mid-shade so the leading end reads clearly.
    for (let i = state.snake.length - 1; i >= 0; i--) {
      block(lcd, state.snake[i].x, state.snake[i].y, i === 0 ? DIM : ON);
    }
    // Food — blinks so it never reads as another snake segment.
    if (state.food.x >= 0 && (Math.floor(elapsed / 260) % 2) === 0) {
      block(lcd, state.food.x, state.food.y, ON);
    }
  }

  function block(lcd, cx, cy, shade) {
    lcd.block(cx * D, cy * D, D, D, shade);
  }

  function onDir(dir, pressed) {
    if (!pressed || state.over) return;
    if (OPP[dir] === state.dir) return; // ignore instant reversal
    state.nextDir = dir;
  }

  function onAction() { /* Snake uses the D-pad only. */ }

  function hud() {
    return [
      { label: env.t('hudScore'), value: state.score },
      { label: env.t('hudLen'), value: state.snake.length },
      { label: env.t('hudBest'), value: env.getBest() },
    ];
  }

  return {
    id: SNAKE.id,
    cols: 26,
    rows: 26,
    start,
    update,
    draw,
    onDir,
    onAction,
    hud,
    get over() { return state.over; },
    state,
  };
}
