/**
 * Dash Runner — pseudo-3D 3-lane endless runner. "Ember" the glow-fox
 * auto-runs down a neon night trail at an ever-increasing speed; the player
 * only ever controls lane / vertical position (swipe or tap left/right to
 * change lanes, up to jump, down to duck — on-screen buttons and arrow
 * keys/WASD both work too).
 *
 * Architecture: a single perpetual requestAnimationFrame loop (same
 * philosophy as games/cross-the-road/client/game.js) drives everything —
 * distance/speed, the player's gravity-driven jump and timed duck, track
 * generation/pruning, collision, particles, and even the brief post-crash
 * beat before the game-over overlay appears (state.crashDelay, counted down
 * inside tick() rather than a setTimeout). There is exactly one thing to
 * "stop" between runs — nothing, the loop always runs — so resetGame() can
 * never leave a stray timer from the previous run still firing.
 *
 * Collision model: see track.js's header comment. Lane position updates
 * *instantly* on input (collision-relevant immediately; the tween is purely
 * cosmetic, same "logical move now, cosmetic tween after" precedent as
 * cross-the-road's beginMove) — jump/duck are genuine physical simulations
 * (real gravity integration / a fixed timer) so there is no separate
 * logical-vs-visual split needed for them.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import * as TRACK from './track.js';
import {
  drawFrame, playerScreenPos, spawnCrashParticles, spawnCoinParticles, spawnSmashParticles,
  updateParticles, CANVAS_W, CANVAS_H,
} from './render.js';

const $ = (id) => document.getElementById(id);
const GAME_ID = 'dash-runner';

const canvas = $('game');
const ctx = canvas.getContext('2d');
// Canvas2D text `direction` defaults to inheriting the element's CSS
// direction — with <html dir="rtl"> (Arabic) that would silently mirror any
// canvas-drawn text/paths even though this scene must never mirror. No
// canvas text is drawn today, but this is cheap, harmless, and matches the
// precedent set in games/cross-the-road/client/game.js for exactly this risk.
ctx.direction = 'ltr';

const sfx = createOghSfx();

const overlay = $('overlay');
const startCard = $('startCard');
const overCard = $('overCard');
const stageEl = document.querySelector('.dr-stage');

let lang = detectLang();

/* ------------------------------------------------------------------------ *
 * Tunables — feel, not fairness (fairness tunables live in track.js).
 * ------------------------------------------------------------------------ */
const CRASH_BEAT_S = 0.55; // pause between a crash and the game-over overlay
const SWIPE_THRESHOLD = 24; // px

/* ------------------------------------------------------------------------ *
 * Mutable state
 * ------------------------------------------------------------------------ */
const state = {
  mode: 'title', // title | play | over
  distance: 0,
  prevDistance: 0,
  speed: TRACK.SPEED_START,
  coins: 0,
  score: 0,
  best: 0,
  isNewBest: false,
  runPhase: 0, // leg-animation cadence accumulator
  player: TRACK.createPlayer(),
  track: TRACK.createTrackState(),
  particles: [],
  shake: 0,
  crashDelay: 0,
};

function computeScore() {
  return Math.floor(state.distance) + state.coins * TRACK.COIN_SCORE_VALUE;
}

/* ------------------------------------------------------------------------ *
 * Run lifecycle
 * ------------------------------------------------------------------------ */
function resetGame() {
  state.track = TRACK.createTrackState();
  TRACK.generateAhead(state.track, TRACK.GEN_AHEAD);
  state.player = TRACK.createPlayer();
  state.distance = 0;
  state.prevDistance = 0;
  state.speed = TRACK.SPEED_START;
  state.coins = 0;
  state.score = 0;
  state.isNewBest = false;
  state.runPhase = 0;
  state.particles = [];
  state.shake = 0;
  state.crashDelay = 0;
}

function startGame() {
  resetGame();
  state.mode = 'play';
  overlay.hidden = true;
  updateHud();
}

function persistBest() {
  OGHProfile.saveProgress(
    GAME_ID,
    { best: state.best },
    { label: 'Dash Runner', summary: `Best distance ${state.best}m` },
  );
}

function loadBest() {
  const saved = OGHProfile.getProgress(GAME_ID);
  const n = Number(saved?.best);
  return Number.isFinite(n) ? n : 0;
}

/* ------------------------------------------------------------------------ *
 * Input actions
 * ------------------------------------------------------------------------ */
function canAct() { return state.mode === 'play' && state.player.alive; }

function tryLaneChange(dir) {
  if (!canAct()) return;
  if (!TRACK.canChangeLane(state.player)) return; // mid-tween: debounced, matches cross-the-road's canAct() gate
  TRACK.startLaneChange(state.player, dir);
  sfx.play('tick');
}

function tryJump() {
  if (!canAct()) return;
  if (TRACK.startJump(state.player)) sfx.play('hop');
}

function tryDuck() {
  if (!canAct()) return;
  if (TRACK.startDuck(state.player)) sfx.play('duck');
}

/* ------------------------------------------------------------------------ *
 * Pickups / collision outcomes
 * ------------------------------------------------------------------------ */
function onCoinsCollected(coins) {
  state.coins += coins.length;
  sfx.play('pickup');
  const pos = playerScreenPos(state);
  spawnCoinParticles(state, pos.x, pos.y);
}

function onPowerupCollected() {
  state.player.invincibleTimer = TRACK.INVINCIBLE_DURATION;
  sfx.play('win');
  const pos = playerScreenPos(state);
  spawnSmashParticles(state, pos.x, pos.y);
}

function onSmashThrough(obstacle) {
  obstacle.hit = true;
  sfx.play('boom');
  const pos = playerScreenPos(state);
  spawnSmashParticles(state, pos.x, pos.y);
}

function onCrash() {
  if (!state.player.alive) return; // guard: only ever trigger once per run
  state.player.alive = false;
  state.mode = 'over';
  state.crashDelay = CRASH_BEAT_S;
  sfx.play('die');
  state.shake = 9;
  const pos = playerScreenPos(state);
  spawnCrashParticles(state, pos.x, pos.y);
  state.score = computeScore();
  const distNow = Math.floor(state.distance);
  state.isNewBest = distNow > state.best;
  if (state.isNewBest) {
    state.best = distNow;
    persistBest();
  }
  updateHud();
}

function showGameOver() {
  $('finalStatsLine').textContent = t(lang, 'finalStatsLine', {
    distance: Math.floor(state.distance), coins: state.coins, score: state.score,
  });
  $('newBestLine').hidden = !state.isNewBest;
  renderBestLines();
  startCard.hidden = true;
  overCard.hidden = false;
  overlay.hidden = false;
}

/* ------------------------------------------------------------------------ *
 * HUD
 * ------------------------------------------------------------------------ */
function updateHud() {
  $('distanceVal').textContent = String(Math.floor(state.distance));
  $('coinsVal').textContent = String(state.coins);
  $('bestVal').textContent = String(state.best);
}

function renderBestLines() {
  const line = t(lang, 'bestLine', { best: state.best });
  $('bestLineStart').textContent = line;
  $('bestLineEnd').textContent = line;
}

/* ------------------------------------------------------------------------ *
 * Per-frame tick — single source of truth. Always runs (even on the title
 * and game-over screens, so the idle scene keeps subtly alive); gameplay
 * effects simply no-op outside 'play' mode. Distance/collision are frozen
 * the instant a crash happens (crashDelay only gates when the overlay
 * *appears*, not the simulation), matching cross-the-road's onCrash timing.
 * ------------------------------------------------------------------------ */
function tick(dt) {
  state.runPhase += dt * (0.55 + state.speed * 0.16);

  if (state.mode === 'play' && state.player.alive) {
    state.prevDistance = state.distance;
    state.speed = TRACK.speedForDistance(state.distance);
    state.distance += state.speed * dt;

    TRACK.updateLaneAnim(state.player, dt);
    const { landed } = TRACK.updatePlayerPhysics(state.player, dt);
    if (landed) sfx.play('land');

    TRACK.generateAhead(state.track, state.distance + TRACK.GEN_AHEAD);
    TRACK.pruneBehind(state.track, state.distance);

    const { coins, powerup } = TRACK.collectPickups(state);
    if (coins.length) onCoinsCollected(coins);
    if (powerup) onPowerupCollected();

    const hitObstacle = TRACK.findObstacleHit(state);
    if (hitObstacle) {
      if (state.player.invincibleTimer > 0) onSmashThrough(hitObstacle);
      else onCrash();
    }

    stageEl.classList.toggle('is-invincible', state.player.invincibleTimer > 0);
    state.score = computeScore();
    updateHud();
  }

  updateParticles(state, dt);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);

  if (state.mode === 'over' && state.crashDelay > 0) {
    state.crashDelay -= dt;
    if (state.crashDelay <= 0) { state.crashDelay = 0; showGameOver(); }
  }

  drawFrame(ctx, state, performance.now() / 1000);
}

let lastNow = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000); // clamp so a tab-hidden hiccup can't cause a huge catch-up jump
  lastNow = now;
  tick(dt);
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------------ *
 * i18n wiring
 * ------------------------------------------------------------------------ */
function buildLangSwitch() {
  const wrap = $('langSwitch');
  wrap.innerHTML = '';
  LANGS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `lang-btn${l === lang ? ' is-on' : ''}`;
    b.textContent = LANG_LABELS[l];
    b.addEventListener('click', () => applyLang(l));
    wrap.appendChild(b);
  });
}

function applyLang(l) {
  lang = l;
  applyStaticStrings(lang);
  document.title = `${t(lang, 'title')} — OGH`;
  buildLangSwitch();
  renderBestLines();
  if (state.mode === 'over') {
    $('finalStatsLine').textContent = t(lang, 'finalStatsLine', {
      distance: Math.floor(state.distance), coins: state.coins, score: state.score,
    });
  }
  rememberLang(lang);
}

/* ------------------------------------------------------------------------ *
 * Input — on-screen buttons, swipe/tap on the canvas, keyboard.
 * ------------------------------------------------------------------------ */
function bindTap(el, fn) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sfx.unlock();
    el.classList.add('is-down');
    fn();
  });
  const clear = () => el.classList.remove('is-down');
  el.addEventListener('pointerup', clear);
  el.addEventListener('pointerleave', clear);
  el.addEventListener('pointercancel', clear);
}

let touchStart = null;

function onCanvasPointerDown(e) {
  e.preventDefault();
  sfx.unlock();
  touchStart = { x: e.clientX, y: e.clientY };
}

function onCanvasPointerUp(e) {
  if (!touchStart) return;
  e.preventDefault();
  const dx = e.clientX - touchStart.x;
  const dy = e.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return; // a plain tap does nothing by default — use the on-screen buttons
  if (Math.abs(dx) > Math.abs(dy)) tryLaneChange(dx > 0 ? 1 : -1);
  else if (dy < 0) tryJump();
  else tryDuck();
}

function onKeyDown(e) {
  if (e.repeat) return;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') tryJump();
  else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') tryDuck();
  else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') tryLaneChange(-1);
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') tryLaneChange(1);
}

function onStartClick() {
  sfx.unlock();
  sfx.play('tap');
  startGame();
}

/* ------------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------------ */
function init() {
  state.best = loadBest();
  applyLang(lang);
  updateHud();

  bindTap($('btnLeft'), () => tryLaneChange(-1));
  bindTap($('btnRight'), () => tryLaneChange(1));
  bindTap($('btnJump'), () => tryJump());
  bindTap($('btnDuck'), () => tryDuck());

  canvas.addEventListener('pointerdown', onCanvasPointerDown);
  canvas.addEventListener('pointerup', onCanvasPointerUp);
  canvas.addEventListener('pointercancel', () => { touchStart = null; });

  window.addEventListener('keydown', onKeyDown);

  $('btnStart').addEventListener('click', onStartClick);
  $('btnAgain').addEventListener('click', onStartClick);

  // Idle title-screen scene: a fresh track drawn once so the canvas isn't
  // blank behind the start card (same "loop always runs" approach as
  // gameplay; distance stays at 0 outside 'play' mode so the scene reads
  // as a calm, static preview rather than an already-running attempt).
  resetGame();
  drawFrame(ctx, state, 0);

  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });

  // Debug/test hook — harmless in normal use (same convention as
  // games/cross-the-road's window.OGH_CROSS_ROAD): lets a test harness
  // inspect live state and hitboxes directly, step frames manually with an
  // explicit dt, or jump straight to a much harder distance without
  // playing through the ramp in real time.
  window.OGH_DASH_RUNNER = {
    state,
    TRACK,
    CANVAS_W,
    CANVAS_H,
    startGame,
    resetGame,
    tick,
    tryJump,
    tryDuck,
    tryLaneChange,
    getPlayerHitbox() {
      const [vMin, vMax] = TRACK.playerVerticalInterval(state.player);
      return {
        lane: state.player.lane,
        visualLane: state.player.visualLane,
        airY: state.player.airY,
        isJumping: state.player.isJumping,
        isDucking: state.player.isDucking,
        vMin,
        vMax,
      };
    },
    getObstacles() { return state.track.obstacles.map((o) => ({ ...o })); },
    getCoins() { return state.track.coins.map((c) => ({ ...c })); },
    checkCollisionNow() { return !!TRACK.findObstacleHit(state); },
    /**
     * Test-only: fast-forward to `d` world units of distance without
     * playing in real time, regenerating the track window ahead of it so
     * difficulty far into the ramp can be inspected/played directly.
     */
    jumpToDistance(d) {
      state.distance = d;
      state.prevDistance = d;
      state.speed = TRACK.speedForDistance(d);
      TRACK.generateAhead(state.track, d + TRACK.GEN_AHEAD);
      TRACK.pruneBehind(state.track, d);
      state.mode = 'play';
      state.player.alive = true;
      overlay.hidden = true;
      updateHud();
      return { distance: d, speed: state.speed };
    },
  };
}

init();
