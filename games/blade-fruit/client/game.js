/**
 * Blade Fruit — solo swipe-slicing arcade. Fruit (and the occasional bomb)
 * launch up from random spots near the bottom on a real gravity arc; drag a
 * continuous swipe across them to slice. Chain several fruit in one
 * unbroken stroke for a rising combo bonus; never slice the bomb (instant
 * game over); miss too many fruit falling back down unsliced and you're
 * out of lives.
 *
 * Architecture: a single perpetual requestAnimationFrame loop (same
 * philosophy as games/dash-runner and games/comet) drives everything —
 * spawn scheduling, physics, hit-testing, particles, and even the brief
 * post-death beat before the results overlay appears (state.endDelay,
 * counted down inside tick() rather than a setTimeout — nothing to leak
 * or double-fire across a resetGame()). fruits.js owns entity physics/
 * shapes/difficulty (pure, DOM-free beyond the passed-in ctx); slicing.js
 * owns the swipe-segment-vs-circle geometry (pure); this file owns state,
 * scheduling, scoring/combo, input wiring, rendering composition, sfx,
 * i18n, and OGHProfile persistence.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import * as Fruits from './fruits.js';
import * as Slicing from './slicing.js';

const $ = (id) => document.getElementById(id);
const GAME_ID = 'blade-fruit';

const canvas = $('game');
const ctx = canvas.getContext('2d');
// Canvas2D text `direction` defaults to inheriting the element's CSS
// direction — with <html dir="rtl"> (Arabic) that would silently mirror any
// canvas-drawn text/paths even though the play field must never mirror. No
// canvas text is drawn today, but this is cheap, harmless, and matches the
// precedent set in games/dash-runner/client/game.js for exactly this risk.
ctx.direction = 'ltr';

const sfx = createOghSfx();

const overlay = $('overlay');
const startCard = $('startCard');
const overCard = $('overCard');
const stageEl = document.querySelector('.ogh-stage');
const comboPopEl = $('comboPop');
const comboValEl = $('comboVal');

let lang = detectLang();

/* ------------------------------------------------------------------------ *
 * Tunables — feel, not fairness (the difficulty ramp itself lives in
 * fruits.js's difficultyForElapsed()).
 * ------------------------------------------------------------------------ */
const MAX_LIVES = 3;
const END_BEAT_S = 0.6;       // pause between the fatal hit/miss and the results overlay
const TRAIL_MAX_AGE_S = 0.24; // how long a swipe-trail segment stays visible after being drawn
const COMBO_POPUP_MIN = 2;    // show the combo banner starting at the 2nd fruit in one swipe
const COMBO_POPUP_S = 0.7;

/* ------------------------------------------------------------------------ *
 * Mutable state
 * ------------------------------------------------------------------------ */
const state = {
  mode: 'title', // title | play | over
  elapsed: 0,
  spawnTimer: 0,
  pendingSpawns: [], // [{delay, isBomb}]
  entities: [],       // active fruits/bombs in flight
  halves: [],         // sliced-fruit debris
  particles: [],
  score: 0,
  best: 0,
  isNewBest: false,
  lives: MAX_LIVES,
  swipeCombo: 0,
  bestComboThisRun: 0,
  slicedCount: 0,
  swipeActive: false,
  swipePointerId: null,
  swipePath: [], // [{x,y,t}] canvas-space, for trail rendering
  comboPopupTimer: 0,
  endCause: null, // 'bomb' | 'lives'
  endDelay: 0,
  shake: 0,
};

function canSlice() { return state.mode === 'play'; }

/* ------------------------------------------------------------------------ *
 * Run lifecycle
 * ------------------------------------------------------------------------ */
function resetGame() {
  state.elapsed = 0;
  state.spawnTimer = 0.6; // a brief calm beat before the first toss
  state.pendingSpawns = [];
  state.entities = [];
  state.halves = [];
  state.particles = [];
  state.score = 0;
  state.isNewBest = false;
  state.lives = MAX_LIVES;
  state.swipeCombo = 0;
  state.bestComboThisRun = 0;
  state.slicedCount = 0;
  state.swipeActive = false;
  state.swipePointerId = null;
  state.swipePath = [];
  state.endCause = null;
  state.endDelay = 0;
  state.shake = 0;
  hideComboPopup();
}

function startGame() {
  resetGame();
  state.mode = 'play';
  overlay.hidden = true;
  updateHud();
}

/** A handful of static, non-physics fruit shown behind the very first start
 * card so the canvas isn't blank before anyone has pressed Start — reuses
 * the real draw code via the real entity shape (spin/velocity 0), same
 * "loop always runs, idle scene isn't a special case" spirit as
 * games/dash-runner's idle preview. Only ever shown once: after the first
 * run, a game-over freezes the actual last frame instead (see triggerGameOver). */
function idleDecoration() {
  const types = Fruits.FRUIT_TYPES;
  const spots = [
    { x: 0.22, y: 0.26 }, { x: 0.76, y: 0.20 },
    { x: 0.28, y: 0.60 }, { x: 0.74, y: 0.56 }, { x: 0.5, y: 0.36 },
  ];
  state.entities = spots.map((s, i) => {
    const type = types[i % types.length];
    return {
      id: -1 - i, kind: 'fruit', typeId: type.id,
      x: s.x * Fruits.CANVAS_W, y: s.y * Fruits.CANVAS_H,
      vx: 0, vy: 0, radius: type.radius, points: type.points,
      rotation: Math.random() * Math.PI * 2, spin: 0, dead: false,
    };
  });
}

function persistBest() {
  OGHProfile.saveProgress(
    GAME_ID,
    { best: state.best },
    { label: 'Blade Fruit', summary: `Best score ${state.best}` },
  );
}

function loadBest() {
  const saved = OGHProfile.getProgress(GAME_ID);
  const n = Number(saved?.best);
  return Number.isFinite(n) ? n : 0;
}

/* ------------------------------------------------------------------------ *
 * Spawn scheduling — tick-driven (no setTimeout), difficulty-ramped via
 * fruits.js's pure difficultyForElapsed(). Each wave stages 1-3 items with
 * a small stagger so a multi-item toss reads as a natural cluster of
 * throws rather than a perfectly synchronized volley.
 * ------------------------------------------------------------------------ */
function queueWave() {
  const d = Fruits.difficultyForElapsed(state.elapsed);
  const count = d.waveMin + Math.floor(Math.random() * (d.waveMax - d.waveMin + 1));
  const bombSlot = Math.random() < d.bombChance ? Math.floor(Math.random() * count) : -1;
  for (let i = 0; i < count; i++) {
    state.pendingSpawns.push({ delay: i * (0.07 + Math.random() * 0.08), isBomb: i === bombSlot });
  }
}

function processPendingSpawns(dt) {
  if (!state.pendingSpawns.length) return;
  const remaining = [];
  for (const p of state.pendingSpawns) {
    p.delay -= dt;
    if (p.delay <= 0) state.entities.push(Fruits.spawnEntity(state.elapsed, p.isBomb ? 'bomb' : 'fruit'));
    else remaining.push(p);
  }
  state.pendingSpawns = remaining;
}

/* ------------------------------------------------------------------------ *
 * Slice / miss / bomb outcomes.
 * ------------------------------------------------------------------------ */
function onFruitSliced(e, dirX, dirY) {
  e.dead = true;
  state.swipeCombo += 1;
  state.bestComboThisRun = Math.max(state.bestComboThisRun, state.swipeCombo);
  state.score += e.points * state.swipeCombo;
  state.slicedCount += 1;
  state.halves.push(...Fruits.createHalves(e, dirX, dirY));
  const type = Fruits.FRUIT_TYPES.find((f) => f.id === e.typeId);
  spawnJuiceParticles(e.x, e.y, type ? type.color : '#ffffff', 10);
  sfx.play(state.swipeCombo >= 2 ? 'chain' : 'slice');
  if (state.swipeCombo >= COMBO_POPUP_MIN) showComboPopup(state.swipeCombo);
  updateHud();
}

function onBombSliced(e) {
  e.dead = true;
  spawnExplosionParticles(e.x, e.y, 24);
  state.shake = 16;
  sfx.play('boom');
  triggerGameOver('bomb');
}

function onFruitMissed(e) {
  e.dead = true;
  state.lives = Math.max(0, state.lives - 1);
  sfx.play('screech');
  flashStage();
  updateHud();
  if (state.lives <= 0) triggerGameOver('lives');
}

function triggerGameOver(cause) {
  if (state.mode !== 'play') return; // guard: only ever trigger once per run
  state.mode = 'over';
  state.endCause = cause;
  state.endDelay = END_BEAT_S;
  state.swipeActive = false;
  state.swipePointerId = null;
  state.isNewBest = state.score > state.best;
  if (state.isNewBest) { state.best = state.score; persistBest(); }
  sfx.play('die');
  updateHud();
}

/* ------------------------------------------------------------------------ *
 * Swipe hit-testing — called once per new path segment (see the pointer
 * handlers below), so a fast swipe is tested along its whole path, not just
 * its start/end. Within one segment, fruit are scored before a bomb (if
 * also hit) ends the run, so a stroke that clears fruit and a bomb together
 * doesn't rob the player of points they clearly already earned.
 * ------------------------------------------------------------------------ */
function testSwipeSegment(x0, y0, x1, y1) {
  if (!canSlice()) return;
  const hits = Slicing.findHits(state.entities, x0, y0, x1, y1);
  if (!hits.length) return;
  const dirX = x1 - x0;
  const dirY = y1 - y0;
  const bombHit = hits.find((h) => h.kind === 'bomb');
  for (const h of hits) {
    if (h.kind === 'fruit') onFruitSliced(h, dirX, dirY);
  }
  if (bombHit) onBombSliced(bombHit);
}

/* ------------------------------------------------------------------------ *
 * Particles (juice / explosion) + screen shake.
 * ------------------------------------------------------------------------ */
function spawnJuiceParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 80 + Math.random() * 220;
    state.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
      life: 0.35 + Math.random() * 0.35, maxLife: 0.7,
      r: 2 + Math.random() * 3.2, color,
    });
  }
}
function spawnExplosionParticles(x, y, n) {
  const palette = ['#ffcf5c', '#ff8a3c', '#ff3b5c', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 140 + Math.random() * 340;
    state.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.4 + Math.random() * 0.5, maxLife: 0.9,
      r: 2.5 + Math.random() * 4.5, color: palette[i % palette.length],
    });
  }
}
function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 700 * dt; p.vx *= 0.98;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}
function updateHalves(dt) {
  for (let i = state.halves.length - 1; i >= 0; i--) {
    const h = state.halves[i];
    Fruits.updateHalf(h, dt);
    if (h.life <= 0) state.halves.splice(i, 1);
  }
}
function flashStage() {
  stageEl.classList.remove('is-flash');
  void stageEl.offsetWidth; // restart the CSS animation even on rapid repeats
  stageEl.classList.add('is-flash');
}

/* ------------------------------------------------------------------------ *
 * HUD / combo popup / results text.
 * ------------------------------------------------------------------------ */
function updateHud() {
  $('scoreVal').textContent = String(state.score);
  $('bestVal').textContent = String(state.best);
  renderLives();
}
function renderLives() {
  const wrap = $('livesVal');
  wrap.innerHTML = '';
  for (let i = 0; i < MAX_LIVES; i++) {
    const s = document.createElement('span');
    s.className = `bf-heart${i < state.lives ? '' : ' is-lost'}`;
    s.textContent = '♥';
    s.setAttribute('aria-hidden', 'true');
    wrap.appendChild(s);
  }
  $('hudLives').setAttribute('aria-label', t(lang, 'livesAria', { n: state.lives }));
}
function showComboPopup(n) {
  comboValEl.textContent = t(lang, 'comboPopup', { combo: n });
  comboPopEl.hidden = false;
  comboPopEl.classList.remove('is-pop');
  void comboPopEl.offsetWidth;
  comboPopEl.classList.add('is-pop');
  state.comboPopupTimer = COMBO_POPUP_S;
}
function hideComboPopup() {
  comboPopEl.hidden = true;
  comboPopEl.classList.remove('is-pop');
  state.comboPopupTimer = 0;
}
function renderBestLines() {
  const line = t(lang, 'bestLine', { best: state.best });
  $('bestLineStart').textContent = line;
  $('bestLineEnd').textContent = line;
}
function showGameOverOverlay() {
  $('overTitle').textContent = t(lang, state.endCause === 'bomb' ? 'gameOverBombTitle' : 'gameOverLivesTitle');
  $('statScoreLine').textContent = t(lang, 'statScore', { score: state.score });
  $('statComboLine').textContent = t(lang, 'statCombo', { combo: state.bestComboThisRun });
  $('statSlicedLine').textContent = t(lang, 'statSliced', { count: state.slicedCount });
  $('newBestLine').hidden = !state.isNewBest;
  renderBestLines();
  startCard.hidden = true;
  overCard.hidden = false;
  overlay.hidden = false;
}

/* ------------------------------------------------------------------------ *
 * Per-frame tick — single source of truth. Always runs (even on the title
 * and game-over screens, so debris/particles already in flight finish
 * playing out); gameplay (spawning, physics, miss detection) freezes the
 * instant the run ends, matching games/dash-runner's onCrash timing (only
 * the *simulation* freezes — small in-flight VFX is allowed to finish).
 * ------------------------------------------------------------------------ */
function tick(dt) {
  const nowMs = performance.now();

  if (state.mode === 'play') {
    state.elapsed += dt;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      queueWave();
      const d = Fruits.difficultyForElapsed(state.elapsed);
      state.spawnTimer = d.spawnInterval * (0.85 + Math.random() * 0.3);
    }
    processPendingSpawns(dt);

    const survivors = [];
    for (const e of state.entities) {
      if (e.dead) continue;
      Fruits.updateEntity(e, dt);
      if (Fruits.isBelowBottom(e)) {
        if (e.kind === 'fruit') onFruitMissed(e);
        // a bomb that falls off-screen unsliced is simply gone — no penalty
        continue;
      }
      survivors.push(e);
    }
    state.entities = survivors;
  }

  updateHalves(dt);
  updateParticles(dt);
  pruneSwipeTrail(nowMs);
  if (state.comboPopupTimer > 0) {
    state.comboPopupTimer -= dt;
    if (state.comboPopupTimer <= 0) hideComboPopup();
  }
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);

  if (state.mode === 'over' && state.endDelay > 0) {
    state.endDelay -= dt;
    if (state.endDelay <= 0) { state.endDelay = 0; showGameOverOverlay(); }
  }

  draw(nowMs / 1000);
}

/* ------------------------------------------------------------------------ *
 * Rendering.
 * ------------------------------------------------------------------------ */
function drawBackdrop() {
  // cheap deterministic starfield (fixed hash, not Math.random(), so it
  // doesn't flicker frame to frame) plus a soft glow near the bottom edge
  // suggesting the launch zone — same "hashed pseudo-random scatter"
  // technique as games/drop-smash's drawBackdrop.
  ctx.fillStyle = 'rgba(180, 200, 255, 0.5)';
  for (let i = 0; i < 40; i++) {
    const h1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453);
    const h2 = Math.abs(Math.sin(i * 78.233) * 12345.6789);
    const x = (h1 - Math.floor(h1)) * Fruits.CANVAS_W;
    const y = (h2 - Math.floor(h2)) * Fruits.CANVAS_H;
    const r = 0.5 + (h1 - Math.floor(h1)) * 1.2;
    ctx.globalAlpha = 0.15 + (h2 - Math.floor(h2)) * 0.3;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawParticles() {
  for (const p of state.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function pruneSwipeTrail(nowMs) {
  if (!state.swipePath.length) return;
  const maxAgeMs = TRAIL_MAX_AGE_S * 1000;
  state.swipePath = state.swipePath.filter((p) => nowMs - p.t <= maxAgeMs);
}

function drawSwipeTrail(nowMs) {
  const pts = state.swipePath;
  if (pts.length < 2) return;
  const maxAgeMs = TRAIL_MAX_AGE_S * 1000;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const alpha = Math.max(0, 1 - (nowMs - p1.t) / maxAgeMs);
    if (alpha <= 0) continue;
    ctx.strokeStyle = `rgba(92,225,255,${alpha * 0.85})`;
    ctx.shadowColor = 'rgba(92,225,255,0.9)';
    ctx.shadowBlur = 12 * alpha;
    ctx.lineWidth = 3 + alpha * 7;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function draw(t) {
  ctx.clearRect(0, 0, Fruits.CANVAS_W, Fruits.CANVAS_H);
  ctx.save();
  if (state.shake > 0.4) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawBackdrop();
  for (const e of state.entities) Fruits.drawEntity(ctx, e, t);
  for (const h of state.halves) Fruits.drawHalf(ctx, h);
  drawParticles();
  drawSwipeTrail(performance.now());
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * i18n wiring.
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
  updateHud();
  if (state.mode === 'over') showGameOverOverlay();
  rememberLang(lang);
}

/* ------------------------------------------------------------------------ *
 * Input — Pointer Events unify touch/mouse. A continuous drag builds a
 * swipe path; every new path segment (pointerdown's degenerate zero-length
 * point, then each pointermove — using getCoalescedEvents() when available
 * so a fast flick's whole path is sampled, not just the events the browser
 * happened to deliver) is hit-tested immediately against every live entity,
 * so a fast swipe is checked along its whole path, not just its endpoints.
 * Only one pointer is tracked at a time (a second concurrent touch is
 * ignored) — this genre's "a swipe" is a single continuous stroke.
 * ------------------------------------------------------------------------ */
function eventToCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * Fruits.CANVAS_W,
    y: ((e.clientY - rect.top) / rect.height) * Fruits.CANVAS_H,
  };
}

function onCanvasPointerDown(e) {
  sfx.unlock();
  if (!canSlice()) return;
  if (state.swipePointerId != null) return; // already tracking a pointer
  e.preventDefault();
  try { canvas.setPointerCapture(e.pointerId); } catch { /* not critical */ }
  state.swipePointerId = e.pointerId;
  state.swipeActive = true;
  state.swipeCombo = 0;
  const p = eventToCanvasPoint(e);
  state.swipePath.push({ x: p.x, y: p.y, t: performance.now() });
  testSwipeSegment(p.x, p.y, p.x, p.y); // the very first contact point counts too
}

function onCanvasPointerMove(e) {
  if (!state.swipeActive || e.pointerId !== state.swipePointerId) return;
  e.preventDefault();
  let events = [e];
  try {
    if (typeof e.getCoalescedEvents === 'function') {
      const coalesced = e.getCoalescedEvents();
      if (coalesced && coalesced.length) events = coalesced;
    }
  } catch { /* unsupported / not a real coalesced batch */ }
  for (const ev of events) {
    const p = eventToCanvasPoint(ev);
    const prev = state.swipePath[state.swipePath.length - 1];
    state.swipePath.push({ x: p.x, y: p.y, t: performance.now() });
    if (prev) testSwipeSegment(prev.x, prev.y, p.x, p.y);
  }
}

function onCanvasPointerUp(e) {
  if (e.pointerId !== state.swipePointerId) return;
  state.swipeActive = false;
  state.swipePointerId = null;
  state.swipeCombo = 0; // a combo lives only within one continuous gesture
}

/* Enter/Space is a minor, honest "optional" keyboard affordance (start /
 * restart) — there's no sensible keyboard equivalent for a swipe gesture
 * itself, so gameplay stays touch/mouse-only. */
function onKeyDown(e) {
  if (e.code !== 'Enter' && e.code !== 'Space') return;
  if (state.mode === 'title' || state.mode === 'over') {
    e.preventDefault();
    onStartClick();
  }
}

function onStartClick() {
  sfx.unlock();
  sfx.play('tap');
  startGame();
}

/* ------------------------------------------------------------------------ *
 * Main loop.
 * ------------------------------------------------------------------------ */
let lastNow = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000); // clamp so a tab-hidden hiccup can't cause a huge catch-up jump
  lastNow = now;
  tick(dt);
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------------ *
 * Init.
 * ------------------------------------------------------------------------ */
function init() {
  state.best = loadBest();
  applyLang(lang);
  idleDecoration();
  updateHud();

  canvas.addEventListener('pointerdown', onCanvasPointerDown);
  canvas.addEventListener('pointermove', onCanvasPointerMove);
  canvas.addEventListener('pointerup', onCanvasPointerUp);
  canvas.addEventListener('pointercancel', onCanvasPointerUp);

  window.addEventListener('keydown', onKeyDown);

  $('btnStart').addEventListener('click', onStartClick);
  $('btnAgain').addEventListener('click', onStartClick);

  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });

  // Debug/test hook — harmless in normal use (same convention as
  // games/dash-runner's window.OGH_DASH_RUNNER / games/drop-smash's
  // window.OGH_DROP_SMASH): lets a test harness inspect live state and the
  // pure Fruits/Slicing modules directly, force a deterministic entity into
  // play for reliable swipe testing, drive a scripted swipe programmatically,
  // and fast-forward the difficulty ramp without playing in real time.
  window.OGH_BLADE_FRUIT = {
    state,
    Fruits,
    Slicing,
    CANVAS_W: Fruits.CANVAS_W,
    CANVAS_H: Fruits.CANVAS_H,
    lang: () => lang,
    startGame,
    resetGame,
    tick,
    getEntities() { return state.entities.map((e) => ({ ...e })); },
    getDifficulty(elapsedSec) { return Fruits.difficultyForElapsed(elapsedSec); },
    jumpElapsed(elapsedSec) { state.elapsed = elapsedSec; },
    /** Test-only: spawn one entity at an exact, known position/velocity —
     * real gameplay spawn positions/timing are randomized, so a scripted
     * swipe test needs a deterministic target to aim at. Auto-starts a run
     * from the title screen if needed. */
    forceSpawn({ kind = 'fruit', typeId, x, y, vx = 0, vy = 0 } = {}) {
      if (state.mode !== 'play') startGame();
      let entity;
      if (kind === 'bomb') {
        entity = {
          id: -Date.now(), kind: 'bomb', typeId: 'bomb', x, y, vx, vy,
          radius: Fruits.BOMB_TYPE.radius, points: 0, rotation: 0, spin: 0, dead: false,
        };
      } else {
        const type = typeId ? Fruits.FRUIT_TYPES.find((f) => f.id === typeId) : Fruits.randomFruitType();
        entity = {
          id: -Date.now(), kind: 'fruit', typeId: type.id, x, y, vx, vy,
          radius: type.radius, points: type.points, rotation: 0, spin: 0, dead: false,
        };
      }
      state.entities.push(entity);
      return entity;
    },
    /** Test-only: run a full down -> move(...) -> up gesture through the
     * exact same combo/scoring logic real input uses (testSwipeSegment),
     * in canvas-space coordinates. Does NOT exercise the DOM pointer-event
     * listeners themselves (eventToCanvasPoint / pointerId tracking /
     * getCoalescedEvents) — use real dispatched PointerEvents against the
     * canvas to test that wiring specifically. */
    simulateSwipe(points) {
      if (!points || points.length < 1) return;
      if (state.mode !== 'play') startGame();
      state.swipePointerId = 'sim';
      state.swipeActive = true;
      state.swipeCombo = 0;
      const first = points[0];
      state.swipePath.push({ x: first.x, y: first.y, t: performance.now() });
      testSwipeSegment(first.x, first.y, first.x, first.y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const p = points[i];
        state.swipePath.push({ x: p.x, y: p.y, t: performance.now() });
        testSwipeSegment(prev.x, prev.y, p.x, p.y);
      }
      state.swipeActive = false;
      state.swipePointerId = null;
      state.swipeCombo = 0;
    },
    setLives(n) { state.lives = n; updateHud(); },
    loseAllLives() { state.lives = 0; triggerGameOver('lives'); },
  };
}

init();
