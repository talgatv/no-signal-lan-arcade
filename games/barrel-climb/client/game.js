/**
 * Barrel Climb — solo climbing platformer. Original "Scrap Tower" setting:
 * climb a scrapyard signal tower via tilted girders and ladders, dodging
 * fuel drums rolled down by the antagonist robot Warden-9 and a patrolling
 * Spark Drone hazard, to reach Mira at the top of each stage.
 *
 * Architecture (same split as games/fight-arena's combat.js/game.js and
 * games/cross-the-road's road.js/game.js): stages.js (level geometry +
 * difficulty curve) and entities.js (player/barrel/hazard physics,
 * collision) are pure, DOM-free, fixed-60Hz-step modules — directly
 * driveable and inspectable from window.OGH_BARREL_CLIMB below, or from a
 * plain Node script. This file owns everything else: canvas rendering glue,
 * touch/keyboard input, sfx, i18n wiring, OGHProfile high score, scoring
 * policy, and the fixed-timestep accumulator loop.
 *
 * A life lost respawns the player at the CURRENT stage's start (classic
 * genre behavior — losing a life restarts the board, not the run); reaching
 * the goal advances to the next stage layout with higher barrel
 * speed/frequency (see stages.js's stageParams). Game over only when lives
 * reach zero.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import * as STAGES from './stages.js';
import * as ENT from './entities.js';
import { drawFrame } from './render.js';

const $ = (id) => document.getElementById(id);
const GAME_ID = 'barrel-climb';

const canvas = $('game');
const ctx = canvas.getContext('2d');
// Belt-and-suspenders: the tower never mirrors under RTL (see i18n.js header
// and index.html's dir="ltr"); no canvas text is drawn today, but this
// matches the precedent set by games/fight-arena and games/cross-the-road
// for exactly this risk.
ctx.direction = 'ltr';

const sfx = createOghSfx();
const overlay = $('overlay');
const startCard = $('startCard');
const overCard = $('overCard');
const stageBanner = $('stageBanner');
const hammerBadge = $('hammerBadge');

let lang = detectLang();

/* ------------------------------------------------------------------------ *
 * Scoring policy (game.js owns "why points happen"; entities.js only
 * reports physical state/events).
 * ------------------------------------------------------------------------ */
const SCORE_PER_LEVEL = 15;
const SCORE_GEM = 50;
const SCORE_HAMMER_PICKUP = 20;
const SCORE_SMASH = 100;
const SCORE_JUMP_OVER = 30;
const STAGE_CLEAR_BASE = 200;
const STAGE_CLEAR_PER_STAGE = 40;
const STAGE_CLEAR_BANNER_MS = 2200;
const FIRST_BARREL_DELAY_MS = 900;
const JUMP_OVER_Y_TOLERANCE = 90;
const ITEM_HITBOX_Y_OFFSET = ENT.PLAYER_H * 0.55;

/* ------------------------------------------------------------------------ *
 * Mutable state
 * ------------------------------------------------------------------------ */
const state = {
  mode: 'title', // 'title' | 'play' | 'stageClear' | 'over'
  stageNum: 1,
  stage: null,
  params: null,
  player: null,
  barrels: [],
  hazard: null,
  stageMaxLevel: 0,
  spawnAcc: 0,
  nextSpawnDelay: FIRST_BARREL_DELAY_MS,
  stageClearTimer: 0,
  lives: ENT.LIVES_START,
  score: 0,
  best: 0,
  isNewBest: false,
  gemsCollected: 0,
  timeMs: 0,
};

const held = {
  left: false, right: false, up: false, down: false, jump: false,
};
const events = [];

/* ------------------------------------------------------------------------ *
 * Stage / run lifecycle
 * ------------------------------------------------------------------------ */
function buildStageState(stageNum) {
  const params = STAGES.stageParams(stageNum);
  const stage = STAGES.buildStage(params.layoutIndex);
  state.stage = stage;
  state.params = params;
  state.player = ENT.createPlayer(stage);
  state.barrels = [];
  state.hazard = ENT.createHazard(stage, params);
  state.spawnAcc = 0;
  state.nextSpawnDelay = FIRST_BARREL_DELAY_MS;
  state.stageMaxLevel = 0;
  updateHudStage();
}

function startGame() {
  state.lives = ENT.LIVES_START;
  state.score = 0;
  state.gemsCollected = 0;
  state.isNewBest = false;
  state.stageNum = 1;
  buildStageState(1);
  state.mode = 'play';
  overlay.hidden = true;
  stageBanner.hidden = true;
  updateHudLives();
  updateHudScore();
}

function loadBest() {
  const saved = OGHProfile.getProgress(GAME_ID);
  const n = Number(saved?.best);
  return Number.isFinite(n) ? n : 0;
}

function persistBest() {
  OGHProfile.saveProgress(
    GAME_ID,
    { best: state.score },
    { label: 'Barrel Climb', summary: `Best score ${state.score} (stage ${state.stageNum})` },
  );
}

function addScore(n) {
  state.score += n;
  updateHudScore();
}

function hitPlayer() {
  state.lives = Math.max(0, state.lives - 1);
  sfx.play('die');
  updateHudLives();
  if (state.lives <= 0) {
    gameOver();
    return;
  }
  ENT.resetPlayerToStage(state.player, state.stage);
  state.player.invulnMs = ENT.INVULN_MS;
  state.barrels = [];
  state.hazard = ENT.createHazard(state.stage, state.params);
  state.spawnAcc = 0;
  state.nextSpawnDelay = FIRST_BARREL_DELAY_MS;
}

function gameOver() {
  state.mode = 'over';
  state.isNewBest = state.score > state.best;
  if (state.isNewBest) {
    state.best = state.score;
    persistBest();
  }
  showGameOver();
}

function stageClear() {
  state.mode = 'stageClear';
  state.stageClearTimer = STAGE_CLEAR_BANNER_MS;
  addScore(STAGE_CLEAR_BASE + STAGE_CLEAR_PER_STAGE * state.stageNum);
  sfx.play('win');
  $('stageBannerTitle').textContent = t(lang, 'stageClearBanner', { n: state.stageNum });
  stageBanner.hidden = false;
}

/* ------------------------------------------------------------------------ *
 * Per-fixed-step gameplay logic.
 * ------------------------------------------------------------------------ */
function respawnHazard() {
  const h = state.hazard;
  if (!h) return;
  h.x = h.x1;
  h.y = STAGES.surfaceYAt(state.stage.levels[h.levelIndex], h.x1) ?? h.y;
  h.dir = 1;
}

function updateHeightScore() {
  if (state.player.levelIndex > state.stageMaxLevel) {
    const gained = state.player.levelIndex - state.stageMaxLevel;
    state.stageMaxLevel = state.player.levelIndex;
    addScore(gained * SCORE_PER_LEVEL);
  }
}

function checkItemPickups() {
  const pb = ENT.playerHitbox(state.player);
  for (const item of state.stage.items) {
    if (item.collected) continue;
    const circle = { x: item.x, y: item.y - ITEM_HITBOX_Y_OFFSET, r: ENT.ITEM_RADIUS };
    if (ENT.circleRectOverlap(circle, pb)) {
      item.collected = true;
      state.gemsCollected++;
      addScore(SCORE_GEM);
      sfx.play('pickup');
    }
  }
  const h = state.stage.hammerItem;
  if (!h.collected) {
    const circle = { x: h.x, y: h.y - ITEM_HITBOX_Y_OFFSET, r: ENT.ITEM_RADIUS };
    if (ENT.circleRectOverlap(circle, pb)) {
      h.collected = true;
      state.player.hammerMs = ENT.HAMMER_DURATION_MS;
      addScore(SCORE_HAMMER_PICKUP);
      sfx.play('boing');
    }
  }
}

function checkJumpOverBonus() {
  if (state.player.state !== 'airborne') return;
  for (const b of state.barrels) {
    if (b.dead || b.jumpCredited) continue;
    if (Math.abs(b.y - state.player.y) > JUMP_OVER_Y_TOLERANCE) continue;
    if (!ENT.xRangesOverlap(b, state.player)) continue;
    const colliding = ENT.circleRectOverlap(ENT.barrelHitbox(b), ENT.playerHitbox(state.player));
    if (!colliding) {
      b.jumpCredited = true;
      addScore(SCORE_JUMP_OVER);
      sfx.play('tick');
    }
  }
}

function checkHazardAndBarrelCollisions() {
  if (!ENT.isPlayerVulnerable(state.player)) return;
  const pb = ENT.playerHitbox(state.player);
  const hammering = state.player.hammerMs > 0;
  let hit = false;

  for (const b of state.barrels) {
    if (b.dead) continue;
    if (!ENT.circleRectOverlap(ENT.barrelHitbox(b), pb)) continue;
    if (hammering) {
      b.dead = true;
      addScore(SCORE_SMASH);
      sfx.play('thwack');
    } else {
      hit = true;
    }
    break;
  }

  if (!hit && state.hazard && ENT.circleRectOverlap(ENT.hazardHitbox(state.hazard), pb)) {
    if (hammering) {
      addScore(SCORE_SMASH);
      sfx.play('thwack');
      respawnHazard();
    } else {
      hit = true;
    }
  }

  if (hit) hitPlayer();
}

function checkGoal() {
  const p = state.player;
  if (p.levelIndex !== STAGES.TOP_LEVEL || p.state !== 'grounded') return;
  if (Math.abs(p.x - state.stage.goal.x) <= state.stage.goal.radius) stageClear();
}

function handleEvents() {
  for (const ev of events) {
    if (ev.type === 'jump') sfx.play('hop');
    else if (ev.type === 'land') sfx.play('land');
    else if (ev.type === 'climbStep') sfx.play('tick');
  }
  events.length = 0;
}

function stepPlay() {
  ENT.stepPlayer(state.player, state.stage, held, events);

  for (const b of state.barrels) ENT.stepBarrel(b, state.stage, events);
  state.barrels = state.barrels.filter((b) => !b.dead);

  if (state.hazard) ENT.stepHazard(state.hazard, state.stage);

  handleEvents();

  state.spawnAcc += ENT.FIXED_DT * 1000;
  while (state.spawnAcc >= state.nextSpawnDelay) {
    state.spawnAcc -= state.nextSpawnDelay;
    if (state.barrels.length < state.params.maxBarrels) {
      state.barrels.push(ENT.spawnBarrel(state.stage, state.params));
    }
    state.nextSpawnDelay = state.params.barrelIntervalMs * (0.85 + Math.random() * 0.3);
  }

  updateHeightScore();
  checkItemPickups();
  checkJumpOverBonus();
  checkHazardAndBarrelCollisions();
  if (state.mode === 'play') checkGoal(); // hitPlayer() above may have already ended the run
}

function stepStageClearTimer() {
  state.stageClearTimer -= ENT.FIXED_DT * 1000;
  if (state.stageClearTimer <= 0) {
    stageBanner.hidden = true;
    state.stageNum++;
    buildStageState(state.stageNum);
    state.mode = 'play';
  }
}

/** One fixed 1/60s logical step — exposed on the debug hook so a test
 * harness (or the loop below) can drive the sim deterministically. */
function tick() {
  if (state.mode === 'play') stepPlay();
  else if (state.mode === 'stageClear') stepStageClearTimer();
}

/* ------------------------------------------------------------------------ *
 * Rendering + fixed-timestep accumulator loop (same pattern as
 * games/fight-arena's game.js: logic runs in exact 1/60s steps regardless of
 * display refresh rate; rendering happens once per animation frame).
 * ------------------------------------------------------------------------ */
function render(now) {
  state.timeMs = now;
  hammerBadge.hidden = !(state.player && state.player.hammerMs > 0);
  drawFrame(ctx, {
    stage: state.stage,
    player: state.player,
    barrels: state.barrels,
    hazard: state.hazard,
    timeMs: now,
  });
}

let lastNow = performance.now();
let acc = 0;
function loop(now) {
  let dt = (now - lastNow) / 1000;
  lastNow = now;
  dt = Math.min(dt, 0.05); // clamp so a tab-hidden hiccup can't cause a huge catch-up jump
  acc += dt;
  let guard = 0;
  while (acc >= ENT.FIXED_DT && guard < 6) {
    tick();
    acc -= ENT.FIXED_DT;
    guard++;
  }
  render(now);
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------------ *
 * HUD
 * ------------------------------------------------------------------------ */
function updateHudStage() { $('stageVal').textContent = String(state.stageNum); }
function updateHudScore() { $('scoreVal').textContent = String(state.score); }
function updateHudLives() {
  const n = Math.max(0, state.lives);
  $('livesVal').textContent = '●'.repeat(n) + '○'.repeat(Math.max(0, ENT.LIVES_START - n));
}

function renderBestLines() {
  const line = t(lang, 'bestLine', { best: state.best });
  $('bestLineStart').textContent = line;
  $('bestLineEnd').textContent = line;
}

function showGameOver() {
  $('finalStatsLine').textContent = t(lang, 'finalStatsLine', { stage: state.stageNum, score: state.score });
  $('gemsLine').textContent = t(lang, 'gemsLine', { n: state.gemsCollected });
  $('newBestLine').hidden = !state.isNewBest;
  renderBestLines();
  startCard.hidden = true;
  overCard.hidden = false;
  overlay.hidden = false;
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
  if (state.mode === 'over') showGameOver();
  rememberLang(lang);
}

/* ------------------------------------------------------------------------ *
 * Input — on-screen D-pad + jump button, keyboard arrows/WASD + Space.
 * ------------------------------------------------------------------------ */
function bindHold(el, act) {
  const set = (v) => { held[act] = v; el.classList.toggle('is-down', v); };
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); sfx.unlock(); set(true); });
  el.addEventListener('pointerup', () => set(false));
  el.addEventListener('pointerleave', () => set(false));
  el.addEventListener('pointercancel', () => set(false));
}

const KEY_MAP = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ' ': 'jump', Spacebar: 'jump',
};

function onKeyDown(e) {
  const act = KEY_MAP[e.key];
  if (!act) return;
  e.preventDefault();
  sfx.unlock();
  held[act] = true;
}

function onKeyUp(e) {
  const act = KEY_MAP[e.key];
  if (!act) return;
  held[act] = false;
}

/* ------------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------------ */
function init() {
  state.best = loadBest();
  buildStageState(1); // valid stage/player to render behind the title card
  applyLang(lang);
  updateHudLives();
  updateHudScore();

  document.querySelectorAll('.bc-tbtn').forEach((btn) => bindHold(btn, btn.dataset.act));
  bindHold($('btnJump'), 'jump');

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { for (const k of Object.keys(held)) held[k] = false; }
  });

  $('btnStart').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); startGame(); });
  $('btnAgain').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); startGame(); });

  render(performance.now());
  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });

  // Debug/test hook — harmless in normal use (same convention as
  // games/pop-the-bugs' window.OGH_POP_BUGS and games/cross-the-road's
  // window.OGH_CROSS_ROAD): lets a test harness inspect live state and
  // hitboxes directly, drive input without touch/keyboard events, single-step
  // the fixed-timestep sim deterministically, and jump straight to a harder
  // stage without clearing every earlier one in real time.
  window.OGH_BARREL_CLIMB = {
    state,
    STAGES,
    ENT,
    held,
    startGame,
    tick,
    setInput(partial) { Object.assign(held, partial); },
    getInput() { return { ...held }; },
    getPlayerHitbox: () => ENT.playerHitbox(state.player),
    getBarrelHitboxes: () => state.barrels.map((b) => ({
      id: b.id, ...ENT.barrelHitbox(b), state: b.state, dir: b.dir, speed: b.speed, x: b.x, y: b.y,
    })),
    getHazardHitbox: () => (state.hazard ? { ...ENT.hazardHitbox(state.hazard) } : null),
    forceHammer(ms = ENT.HAMMER_DURATION_MS) { if (state.player) state.player.hammerMs = ms; },
    forceInvuln(ms = 0) { if (state.player) state.player.invulnMs = ms; },
    forceGameOver: () => gameOver(),
    /** Test-only: teleport straight to `n`, regenerating that stage's
     * geometry/params, so difficulty deep into the run can be inspected or
     * played without clearing every earlier stage. */
    jumpToStage(n) {
      state.lives = ENT.LIVES_START;
      state.score = state.score || 0;
      state.stageNum = Math.max(1, Math.floor(n));
      buildStageState(state.stageNum);
      state.mode = 'play';
      overlay.hidden = true;
      stageBanner.hidden = true;
      updateHudLives();
      updateHudScore();
      return { stage: state.stageNum, params: state.params, layoutKey: state.stage.key };
    },
  };
}

init();
