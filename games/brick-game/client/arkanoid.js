/**
 * arkanoid.js — a Breakout / Arkanoid for the Brick Game collection.
 *
 * Paddle at the bottom, a ball that bounces off the walls, the paddle and the
 * brick wall at the top. Clearing every brick advances to the next of three
 * distinct layouts (then they cycle, a touch faster each time). Miss the ball
 * and it costs one of three lives.
 *
 * Paddle physics (the classic feel the brief asks for): the rebound angle
 * depends on WHERE on the paddle the ball lands. `bounceVelocity(off)` is the
 * single source of truth — `off` is the normalised hit offset in [-1, 1];
 * a dead-centre hit (off 0) sends the ball straight up (vx 0), and an edge hit
 * (off ±1) sends it off at a sharp angle (large |vx|), always at the same total
 * speed. It's exposed on the test hook so the difference is inspectable as raw
 * velocity vectors, not eyeballed.
 *
 * Everything renders as chunky 2-dot blocks on the shared 26x26 LCD; the field
 * never mirrors under RTL (see lcd.js / i18n.js).
 */
import { ON, DIM } from './lcd.js';

export const ARKANOID = {
  id: 'brick-arkanoid',
  nameKey: 'arkanoidName',
  descKey: 'arkanoidDesc',
  blurbKey: 'arkanoidBlurb',
  controlsKey: 'arkanoidControls',
  hintKey: 'hintArkanoid',
  icon: [
    'XXX.XXX.X',
    'X.X.X.X.X',
    '.........',
    '...XX....',
    '.........',
    '.XXXXXX..',
  ],
  create,
};

const COLS = 26;
const ROWS = 26;

// Playfield inner bounds (1-dot steel border on left/right/top).
const LEFT = 2; // min ball centre x
const RIGHT = COLS - 2; // max ball centre x
const TOP = 2; // min ball centre y

const PADDLE_Y = 23; // paddle occupies rows 23..24
const PADDLE_W = 6;
const PADDLE_SPEED = 30; // dots/sec

const BRICK_W = 4;
const BRICK_H = 2;
const BRICK_COLS = 5;
const BRICK_X0 = 3; // left dot of the brick field (3 + 5*4 = 23)
const BRICK_Y0 = 4;

const BASE_SPEED = 17; // ball speed (dots/sec) at level 1
const SPEED_PER_LEVEL = 1.6;
const MAX_SIN = 0.85; // edge hit ~ 58° off vertical
const START_LIVES = 3;

// Three distinct layouts (BRICK_COLS wide). '#' = brick.
const LAYOUTS = [
  ['#####', '#####', '#####', '#####'],
  ['#.#.#', '.#.#.', '#.#.#', '.#.#.'],
  ['..#..', '.###.', '#####', '.###.'],
];

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function create(env) {
  const state = {
    level: 1,
    score: 0,
    lives: START_LIVES,
    over: false,
  };
  const paddle = { x: 10, w: PADDLE_W };
  const ball = { cx: 13, cy: PADDLE_Y - 1, vx: 0, vy: 0, stuck: true, lost: false };
  /** @type {Array<{x:number,y:number,w:number,h:number,alive:boolean}>} */
  let bricks = [];
  const held = { left: false, right: false };
  let elapsed = 0;

  const ballSpeed = () => BASE_SPEED + (state.level - 1) * SPEED_PER_LEVEL;

  /** THE paddle-angle rule — pure, single source of truth (also test-hooked). */
  function bounceVelocity(offNorm) {
    const speed = ballSpeed();
    const off = clamp(offNorm, -1, 1);
    const vx = speed * MAX_SIN * off;
    const vy = -Math.sqrt(Math.max(0.0001, speed * speed - vx * vx));
    return { vx, vy };
  }

  function loadLayout(idx) {
    const pat = LAYOUTS[idx % LAYOUTS.length];
    bricks = [];
    for (let r = 0; r < pat.length; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (pat[r][c] === '#') {
          bricks.push({
            x: BRICK_X0 + c * BRICK_W,
            y: BRICK_Y0 + r * BRICK_H,
            w: BRICK_W,
            h: BRICK_H,
            alive: true,
          });
        }
      }
    }
  }

  function resetBallOnPaddle() {
    ball.stuck = true;
    ball.lost = false;
    ball.vx = 0;
    ball.vy = 0;
    ball.cx = paddle.x + paddle.w / 2;
    ball.cy = PADDLE_Y - 1;
  }

  function start() {
    state.level = 1;
    state.score = 0;
    state.lives = START_LIVES;
    state.over = false;
    paddle.x = (COLS - paddle.w) / 2;
    loadLayout(0);
    resetBallOnPaddle();
  }

  function launch() {
    if (state.over) return;
    if (ball.stuck) {
      ball.stuck = false;
      const v = bounceVelocity((Math.random() * 0.5 - 0.25)); // slight random lean
      ball.vx = v.vx;
      ball.vy = v.vy;
      env.sfx.play('boing');
    }
  }

  /* ---- collisions ----------------------------------------------------- */
  function collideWalls() {
    if (ball.cx < LEFT) { ball.cx = LEFT; ball.vx = Math.abs(ball.vx); env.sfx.play('bounce'); }
    else if (ball.cx > RIGHT) { ball.cx = RIGHT; ball.vx = -Math.abs(ball.vx); env.sfx.play('bounce'); }
    if (ball.cy < TOP) { ball.cy = TOP; ball.vy = Math.abs(ball.vy); env.sfx.play('bounce'); }
  }

  function collidePaddle() {
    if (ball.vy <= 0) return;
    const top = PADDLE_Y;
    // ball is ~2 dots; treat centre with radius 1
    if (ball.cy + 1 >= top && ball.cy - 1 <= PADDLE_Y + 1) {
      if (ball.cx + 1 >= paddle.x && ball.cx - 1 <= paddle.x + paddle.w) {
        const off = (ball.cx - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        const v = bounceVelocity(off);
        ball.vx = v.vx;
        ball.vy = v.vy;
        ball.cy = top - 1;
        env.sfx.play('bounce');
      }
    }
  }

  function collideBricks() {
    const r = 1;
    for (const b of bricks) {
      if (!b.alive) continue;
      const bcx = b.x + b.w / 2;
      const bcy = b.y + b.h / 2;
      const ox = (r + b.w / 2) - Math.abs(ball.cx - bcx);
      const oy = (r + b.h / 2) - Math.abs(ball.cy - bcy);
      if (ox > 0 && oy > 0) {
        b.alive = false;
        state.score += 10;
        env.sfx.play('clack');
        // Reflect on the axis of least penetration and push the ball out.
        if (ox < oy) {
          ball.vx = ball.cx < bcx ? -Math.abs(ball.vx) : Math.abs(ball.vx);
          ball.cx += ball.cx < bcx ? -ox : ox;
        } else {
          ball.vy = ball.cy < bcy ? -Math.abs(ball.vy) : Math.abs(ball.vy);
          ball.cy += ball.cy < bcy ? -oy : oy;
        }
        return; // one brick per step
      }
    }
  }

  function loseLife() {
    state.lives--;
    env.sfx.play('splat');
    if (state.lives <= 0) {
      state.over = true;
      env.gameOver({ score: state.score, isWin: false, subKey: 'arkanoidOverSub' });
    } else {
      resetBallOnPaddle();
    }
  }

  function moveBall(dt) {
    if (ball.stuck) {
      ball.cx = paddle.x + paddle.w / 2;
      ball.cy = PADDLE_Y - 1;
      return;
    }
    const speed = Math.hypot(ball.vx, ball.vy) || 1;
    const steps = Math.max(1, Math.ceil((speed * dt) / 0.4));
    const sdt = dt / steps;
    for (let i = 0; i < steps; i++) {
      ball.cx += ball.vx * sdt;
      ball.cy += ball.vy * sdt;
      collideWalls();
      collideBricks();
      collidePaddle();
      if (ball.cy - 1 > ROWS) { loseLife(); return; }
    }
  }

  /* ---- update --------------------------------------------------------- */
  function update(dt) {
    if (state.over) return;
    elapsed += dt * 1000;

    // Paddle (held direction).
    let mv = 0;
    if (held.left) mv -= 1;
    if (held.right) mv += 1;
    if (mv) {
      paddle.x = clamp(paddle.x + mv * PADDLE_SPEED * dt, 1, COLS - 1 - paddle.w);
    }

    moveBall(dt);

    // Level clear -> next layout.
    if (!state.over && bricks.every((b) => !b.alive)) {
      state.level++;
      state.score += 50;
      env.sfx.play('win');
      loadLayout(state.level - 1);
      resetBallOnPaddle();
      env.banner(env.t('levelPrefix', { n: state.level }));
    }
  }

  /* ---- draw ----------------------------------------------------------- */
  function draw(lcd) {
    // Border (left/right/top steel).
    for (let y = 0; y < ROWS; y++) { lcd.set(0, y, ON); lcd.set(COLS - 1, y, ON); }
    for (let x = 0; x < COLS; x++) lcd.set(x, 0, ON);

    // Bricks (mid shade so they read as the softer, breakable material).
    for (const b of bricks) {
      if (b.alive) lcd.block(b.x, b.y, b.w, b.h, DIM);
    }
    // Paddle.
    lcd.block(Math.round(paddle.x), PADDLE_Y, paddle.w, 2, ON);
    // Ball (2x2 chunk), blink faintly while stuck so "press A" reads.
    const bx = Math.round(ball.cx - 1);
    const by = Math.round(ball.cy - 1);
    const shade = ball.stuck && (Math.floor(elapsed / 200) % 2 === 0) ? DIM : ON;
    lcd.block(bx, by, 2, 2, shade);
  }

  /* ---- input ---------------------------------------------------------- */
  function onDir(dir, pressed) {
    if (dir === 'left') held.left = pressed;
    else if (dir === 'right') held.right = pressed;
  }

  function onAction(pressed) {
    if (pressed) launch();
  }

  function onPointer(p) {
    // Drag-to-position the paddle (very natural on touch).
    if (p.phase === 'down' || p.phase === 'move') {
      paddle.x = clamp(p.x - paddle.w / 2, 1, COLS - 1 - paddle.w);
      if (ball.stuck) ball.cx = paddle.x + paddle.w / 2;
    }
    if (p.phase === 'up') launch();
  }

  function hud() {
    return [
      { label: env.t('hudScore'), value: state.score },
      { label: env.t('hudLevel'), value: state.level },
      { label: env.t('hudLives'), value: Math.max(0, state.lives) },
    ];
  }

  return {
    id: ARKANOID.id,
    cols: COLS,
    rows: ROWS,
    start,
    update,
    draw,
    onDir,
    onAction,
    onPointer,
    hud,
    get over() { return state.over; },
    // test-hook surface
    state,
    ball,
    paddle,
    get bricks() { return bricks; },
    bounceVelocity,
    launch,
  };
}
