/**
 * Cross the Road — pseudo-3D Frogger-style "cross the road" arcade game.
 * Hop forward lane by lane, dodge left/right within a lane, don't get hit.
 * Each stage is a run of traffic lanes ending in a safe median; clearing it
 * grows the lane count (up to a cap) and, endlessly beyond that, keeps
 * raising vehicle speed/density — see road.js's stageParams().
 *
 * Architecture: a single perpetual requestAnimationFrame loop (same
 * philosophy as games/pop-the-bugs/client/app.js) drives everything —
 * traffic motion, the player's move tween, particles, and even the brief
 * post-crash beat before the game-over overlay appears (state.crashDelay,
 * counted down inside tick() rather than a setTimeout). There is exactly
 * one thing to "stop" between runs — nothing, the loop always runs — so
 * resetGame() can never leave a stray vehicle or timer from the previous
 * run still animating/firing.
 *
 * Collision model: the player's logical row/col update *instantly* on
 * input (checked against current vehicle hitboxes every single frame,
 * including the frame it changes) — simple, deterministic, easy to test.
 * A separate purely-cosmetic tween (visualRow/visualCol/airLift) animates
 * the sprite and the pseudo-3D camera between positions and never gates
 * collision timing, only a short input lock while it plays out.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import * as ROAD from './road.js';
import {
  drawFrame, playerScreenPos, spawnCrashParticles, updateParticles, CANVAS_W, CANVAS_H,
} from './render.js';

const $ = (id) => document.getElementById(id);
const GAME_ID = 'cross-the-road';

const canvas = $('game');
const ctx = canvas.getContext('2d');
// Canvas2D text `direction` defaults to inheriting the element's CSS
// direction — with <html dir="rtl"> (Arabic) that would silently mirror any
// canvas-drawn text/paths even though this scene must never mirror. No
// canvas text is drawn today, but this is cheap, harmless, and matches the
// precedent set in games/neon-drift/client/game.js for exactly this risk.
ctx.direction = 'ltr';

const sfx = createOghSfx();

const overlay = $('overlay');
const startCard = $('startCard');
const overCard = $('overCard');
const stageEl = document.querySelector('.ctr-stage');

let lang = detectLang();

/* ------------------------------------------------------------------------ *
 * Tunables — movement feel.
 * ------------------------------------------------------------------------ */
const MOVE_DUR = 0.15; // seconds: visual tween duration AND input-lock length
const CRASH_BEAT_S = 0.55; // pause between a crash and the game-over overlay

/* ------------------------------------------------------------------------ *
 * Mutable state
 * ------------------------------------------------------------------------ */
const state = {
  mode: 'title', // title | play | over
  road: null, // { rows: Map<rowIndex, Row>, gen }
  player: {
    row: 0, col: 2,
    visualRow: 0, visualCol: 2,
    anim: null, // { fromRow, fromCol, toRow, toCol, t, dur, isHop }
    airLift: 0,
    alive: true,
  },
  distance: 0,
  best: 0,
  isNewBest: false,
  particles: [],
  shake: 0,
  crashDelay: 0,
  honkCooldown: 0,
};

function centerCol() { return (ROAD.SLOTS - 1) >> 1; }

function currentRow() { return state.road ? state.road.rows.get(state.player.row) : null; }
function currentStage() { const row = currentRow(); return row ? row.stage : 1; }

/* ------------------------------------------------------------------------ *
 * Run lifecycle
 * ------------------------------------------------------------------------ */
function resetGame() {
  state.road = ROAD.createRoadState();
  ROAD.growRowsTo(state.road, ROAD.AHEAD_GEN);
  const p = state.player;
  p.row = 0;
  p.col = centerCol();
  p.visualRow = 0;
  p.visualCol = p.col;
  p.anim = null;
  p.airLift = 0;
  p.alive = true;
  state.distance = 0;
  state.isNewBest = false;
  state.particles = [];
  state.shake = 0;
  state.crashDelay = 0;
  state.honkCooldown = 1.5;
}

function startGame() {
  resetGame();
  state.mode = 'play';
  overlay.hidden = true;
  updateHud();
}

function persistBest() {
  const stageNow = currentStage();
  OGHProfile.saveProgress(
    GAME_ID,
    { best: state.best, bestStage: stageNow },
    { label: 'Cross the Road', summary: `Best distance ${state.best} (stage ${stageNow})` }
  );
}

function loadBest() {
  const saved = OGHProfile.getProgress(GAME_ID);
  const n = Number(saved?.best);
  return Number.isFinite(n) ? n : 0;
}

/* ------------------------------------------------------------------------ *
 * Movement
 * ------------------------------------------------------------------------ */
function canAct() {
  return state.mode === 'play' && state.player.alive && !state.player.anim;
}

function beginMove(toRow, toCol, isHop) {
  const p = state.player;
  p.anim = {
    fromRow: p.row, fromCol: p.col, toRow, toCol, t: 0, dur: MOVE_DUR, isHop,
  };
  p.row = toRow;
  p.col = toCol;
  ROAD.growRowsTo(state.road, p.row + ROAD.AHEAD_GEN);
  ROAD.pruneRowsBehind(state.road, p.row - ROAD.REAR_KEEP);

  if (isHop) {
    state.distance = p.row;
    sfx.play('hop');
    updateHud();
  } else {
    sfx.play('tick');
  }

  const rowObj = state.road.rows.get(p.row);
  // A median's `.stage` is the stage it leads INTO (see road.js's
  // growRowsTo doc comment), so the stage that was just *cleared* to reach
  // it is one less.
  if (rowObj && rowObj.kind === 'median') onStageClear(rowObj.stage - 1);
}

function tryHop() {
  if (!canAct()) return;
  beginMove(state.player.row + 1, state.player.col, true);
}

function tryDodge(dir) {
  if (!canAct()) return;
  const col = state.player.col + dir;
  if (col < 0 || col >= ROAD.SLOTS) { sfx.play('tick'); return; }
  beginMove(state.player.row, col, false);
}

function easeOutQuad(x) { return 1 - (1 - x) * (1 - x); }
function lerpN(a, b, tt) { return a + (b - a) * tt; }

function updatePlayerAnim(dt) {
  const p = state.player;
  if (!p.anim) return;
  p.anim.t += dt;
  const f = Math.min(1, p.anim.t / p.anim.dur);
  const fe = easeOutQuad(f);
  p.visualRow = lerpN(p.anim.fromRow, p.anim.toRow, fe);
  p.visualCol = lerpN(p.anim.fromCol, p.anim.toCol, fe);
  p.airLift = p.anim.isHop ? Math.sin(f * Math.PI) : 0;
  if (f >= 1) {
    p.visualRow = p.anim.toRow;
    p.visualCol = p.anim.toCol;
    p.airLift = 0;
    p.anim = null;
  }
}

/* ------------------------------------------------------------------------ *
 * Stage clear / crash
 * ------------------------------------------------------------------------ */
function onStageClear(clearedStage) {
  sfx.play('win');
  showFloater(t(lang, 'stageClear', { n: clearedStage }));
  updateHud();
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
  flashStage();
  state.isNewBest = state.distance > state.best;
  if (state.isNewBest) {
    state.best = state.distance;
    persistBest();
  }
  updateHud();
}

function showGameOver() {
  $('finalStatsLine').textContent = t(lang, 'finalStatsLine', { stage: currentStage(), distance: state.distance });
  $('newBestLine').hidden = !state.isNewBest;
  renderBestLines();
  startCard.hidden = true;
  overCard.hidden = false;
  overlay.hidden = false;
}

/* ------------------------------------------------------------------------ *
 * Ambient traffic honk — pure flavor, not tied to collision. Small
 * per-second chance, boosted a bit when a truck is in an upcoming lane,
 * throttled by a cooldown so it never spams.
 * ------------------------------------------------------------------------ */
function maybeAmbientHonk(dt) {
  if (state.mode !== 'play') return;
  if (state.honkCooldown > 0) { state.honkCooldown -= dt; return; }
  const nearRow = state.road.rows.get(state.player.row + 1) || state.road.rows.get(state.player.row);
  const hasTruck = !!nearRow?.vehicles?.some((v) => v.kind === 'truck');
  const chance = (hasTruck ? 0.35 : 0.08) * dt;
  if (Math.random() < chance) {
    sfx.play('honk');
    state.honkCooldown = 2.6 + Math.random() * 2;
  }
}

/* ------------------------------------------------------------------------ *
 * HUD + floaters
 * ------------------------------------------------------------------------ */
function updateHud() {
  $('stageVal').textContent = String(currentStage());
  $('distanceVal').textContent = String(state.distance);
  $('bestVal').textContent = String(state.best);
}

function renderBestLines() {
  const line = t(lang, 'bestLine', { best: state.best });
  $('bestLineStart').textContent = line;
  $('bestLineEnd').textContent = line;
}

function showFloater(text) {
  const el = $('stageFloater');
  el.textContent = text;
  el.classList.remove('is-on');
  void el.offsetWidth; // restart the CSS animation even on rapid repeat triggers
  el.classList.add('is-on');
}

function flashStage() {
  stageEl.classList.remove('is-flash');
  void stageEl.offsetWidth;
  stageEl.classList.add('is-flash');
}

/* ------------------------------------------------------------------------ *
 * Per-frame tick — single source of truth. Always runs (even on the title
 * and game-over screens, so traffic keeps flowing behind the overlay);
 * gameplay effects simply no-op outside 'play' mode.
 * ------------------------------------------------------------------------ */
function tick(dt) {
  if (state.mode === 'play' && state.player.alive) {
    const rowObj = currentRow();
    if (rowObj && ROAD.rowHasCollision(rowObj, state.player.col)) onCrash();
  }

  if (state.road) {
    for (const row of state.road.rows.values()) ROAD.updateRow(row, dt);
  }

  updatePlayerAnim(dt);
  updateParticles(state, dt);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);

  if (state.mode === 'over' && state.crashDelay > 0) {
    state.crashDelay -= dt;
    if (state.crashDelay <= 0) { state.crashDelay = 0; showGameOver(); }
  }

  maybeAmbientHonk(dt);

  drawFrame(ctx, state);
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
    $('finalStatsLine').textContent = t(lang, 'finalStatsLine', { stage: currentStage(), distance: state.distance });
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
const SWIPE_THRESHOLD = 22;

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
  if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
    tryDodge(dx > 0 ? 1 : -1);
  } else if (dy < -SWIPE_THRESHOLD) {
    tryHop();
  } else if (Math.abs(dx) <= SWIPE_THRESHOLD && Math.abs(dy) <= SWIPE_THRESHOLD) {
    tryHop(); // a plain tap is the primary/default gesture: hop forward
  }
  // A downward swipe with no clear tap is deliberately ignored — there is
  // no backward move in this game.
}

function onKeyDown(e) {
  if (e.repeat) return;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') tryHop();
  else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') tryDodge(-1);
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') tryDodge(1);
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

  bindTap($('btnLeft'), () => tryDodge(-1));
  bindTap($('btnForward'), () => tryHop());
  bindTap($('btnRight'), () => tryDodge(1));

  canvas.addEventListener('pointerdown', onCanvasPointerDown);
  canvas.addEventListener('pointerup', onCanvasPointerUp);
  canvas.addEventListener('pointercancel', () => { touchStart = null; });

  window.addEventListener('keydown', onKeyDown);

  $('btnStart').addEventListener('click', onStartClick);
  $('btnAgain').addEventListener('click', onStartClick);

  // Idle title-screen scene: a fresh stage-1 road drawn once so the canvas
  // isn't blank behind the start card (traffic keeps animating via the
  // main loop below, same "loop always runs" approach as gameplay).
  resetGame();
  drawFrame(ctx, state);

  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });

  // Debug/test hook — harmless in normal use (same convention as
  // games/pop-the-bugs' window.OGH_POP_BUGS and games/neon-drift's
  // window.OGH_NEON_DRIFT): lets a test harness inspect live state and
  // hitboxes directly, or jump straight to a much harder stage without
  // playing through every earlier one in real time.
  window.OGH_CROSS_ROAD = {
    state,
    ROAD,
    CANVAS_W,
    CANVAS_H,
    currentStage,
    startGame,
    tick,
    tryHop,
    tryDodge,
    /** Player hitbox on the row it currently occupies, directly checkable. */
    getPlayerHitbox() {
      const b = ROAD.playerBounds(state.player.col);
      return {
        row: state.player.row, col: state.player.col, xMin: b.min, xMax: b.max,
      };
    },
    /** Vehicle hitboxes for a given row (defaults to the player's current row). */
    getRowHitboxes(rowIndex = state.player.row) {
      const row = state.road.rows.get(rowIndex);
      if (!row) return null;
      return {
        rowIndex, kind: row.kind, stage: row.stage, dir: row.dir, speed: row.speed,
        vehicles: ROAD.rowHitboxes(row),
      };
    },
    checkCollisionNow() {
      const row = currentRow();
      return row ? ROAD.rowHasCollision(row, state.player.col) : false;
    },
    /**
     * Test-only: teleport to the safe row that begins `stage`, regenerating
     * the row window with that stage's params, so difficulty at a deep
     * stage can be inspected/played without clearing every earlier stage.
     */
    jumpToStage(stage) {
      const startRow = ROAD.jumpRoadToStage(state.road, stage);
      const p = state.player;
      p.row = startRow;
      p.col = centerCol();
      p.visualRow = startRow;
      p.visualCol = p.col;
      p.anim = null;
      p.airLift = 0;
      p.alive = true;
      state.distance = startRow;
      state.mode = 'play';
      state.crashDelay = 0;
      overlay.hidden = true;
      updateHud();
      return { row: startRow, stage: currentStage() };
    },
  };
}

init();
