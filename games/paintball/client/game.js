/**
 * Paintball — solo, wave-based lightgun-style shooting gallery.
 *
 * Fixed camera into a 3-lane pop-up gallery (targets.js's LANES): mouse
 * move / touch drag aims a crosshair (Pointer Events unify both, same
 * convention as games/billiards), a click/tap fires a hitscan shot from a
 * 7-round magazine that auto-reloads when empty (or on demand via the
 * Reload button / R key). Score climbs on 'grunt'/'ace' hits and 'crate'
 * ammo pickups, but hitting a 'civilian' costs points AND a strike —
 * 3 strikes ends the run immediately (the classic lightgun "don't shoot
 * the hostage" rule). 8 waves ramp spawn rate, visible duration, max
 * concurrent targets and the civilian/ace mix (targets.js's waveParams(),
 * a pure function of wave index — same "inspectable curve" convention as
 * games/cross-the-road's stageParams and games/pop-the-bugs' rampAt).
 *
 * targets.js owns the difficulty/lane/type model (no canvas/DOM), render.js
 * owns all drawing (no game state mutation), this file owns state, input,
 * sfx, i18n wiring and the single RAF loop — same three-way split as
 * games/cross-the-road's road.js/render.js/game.js.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import {
  CANVAS_W, CANVAS_H, LANES, TARGET_TYPES, WAVE_COUNT, MAX_STRIKES, MAG_SIZE,
  RELOAD_MS, RISE_MS, FALL_MS, HIT_MS, COOLDOWN_MS,
  waveParams, pickWeightedType, createSlots, resetSlots, slotVisual, targetRadius,
} from './targets.js';
import { drawFrame, makeSplat, drawSplatShape } from './render.js';

const $ = (id) => document.getElementById(id);
const GAME_ID = 'paintball';

const sfx = createOghSfx();

const canvas = $('game');
const ctx = canvas.getContext('2d');
ctx.direction = 'ltr'; // belt-and-suspenders; see index.html's dir="ltr" comment

// Persistent "paint layer": settled splats are baked here once so the
// per-frame draw list never grows unbounded (see advanceSplats below).
const paintCanvas = document.createElement('canvas');
paintCanvas.width = CANVAS_W;
paintCanvas.height = CANVAS_H;
const paintCtx = paintCanvas.getContext('2d');

const overlay = $('overlay');
const startCard = $('startCard');
const waveClearCard = $('waveClearCard');
const resultsCard = $('resultsCard');
const hudWave = $('hudWave');
const hudScore = $('hudScore');
const hudAmmo = $('hudAmmo');
const hudStrikes = $('hudStrikes');
const ammoPipsEl = $('ammoPips');
const reloadLabelEl = $('reloadLabel');
const reloadBarEl = $('reloadBar');
const reloadFillEl = $('reloadFill');

/** Forgiving touch/mouse hitbox beyond a target's drawn radius. */
const HIT_RADIUS_MUL = 1.15;
/** Score popup ("+100"/"-150") lifetime — drawn on canvas, not DOM, so it
 * never needs to be pixel-aligned against the auto-sized/letterboxed
 * canvas box (see render.js's drawPopups). */
const POPUP_TTL_MS = 700;

let lang = detectLang();

const state = {
  mode: 'title', // title | play | waveClear | results
  wave: 0, // 0-based
  waveMs: 0,
  waveScoreStart: 0,
  score: 0,
  best: 0,
  isNewBest: false,
  strikes: 0,
  ammo: MAG_SIZE,
  reloading: false,
  reloadMs: 0,
  shotsFired: 0,
  hitsGood: 0,
  wavesSurvived: 0,
  endReason: null, // 'cleared' | 'strikeout'
  spawnAcc: 0,
  nextSpawnDelay: 0,
  aim: { x: CANVAS_W / 2, y: CANVAS_H / 2 },
  fireFlashMs: 0,
  slots: createSlots(),
  splats: [],
  popups: [],
};

function params() { return waveParams(state.wave); }

/* ------------------------------------------------------------------------ *
 * Spawning
 * ------------------------------------------------------------------------ */
function rollSpawnDelay() {
  const p = params();
  const jitter = 0.78 + Math.random() * 0.44;
  return Math.max(260, p.spawnIntervalMs * jitter);
}

function countActive() {
  let n = 0;
  for (const s of state.slots) if (s.phase === 'up' || s.phase === 'rising') n++;
  return n;
}

function pickEmptySlot() {
  const candidates = state.slots.filter((s) => s.phase === 'idle' && s.cooldownMs <= 0);
  if (!candidates.length) return null;
  return candidates[(Math.random() * candidates.length) | 0];
}

function trySpawnOne() {
  const p = params();
  if (countActive() >= p.maxConcurrent) return;
  const slot = pickEmptySlot();
  if (!slot) return;
  slot.type = pickWeightedType(p.weights);
  slot.phase = 'rising';
  slot.ageMs = 0;
  slot.phaseMs = 0;
  slot.lifeMs = p.visibleMs;
  slot.driftSeed = Math.random() * Math.PI * 2;
}

/* ------------------------------------------------------------------------ *
 * Wave / run lifecycle
 * ------------------------------------------------------------------------ */
function startWave(idx) {
  state.wave = idx;
  state.waveMs = 0;
  state.waveScoreStart = state.score;
  state.ammo = MAG_SIZE;
  state.reloading = false;
  state.reloadMs = 0;
  resetSlots(state.slots);
  paintCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  state.spawnAcc = 0;
  state.nextSpawnDelay = rollSpawnDelay();
  state.mode = 'play';
  updateHud();
  overlay.hidden = true;
}

function resetRun() {
  state.score = 0;
  state.isNewBest = false;
  state.strikes = 0;
  state.shotsFired = 0;
  state.hitsGood = 0;
  state.endReason = null;
  state.splats = [];
  state.popups = [];
  startWave(0);
}

function endWave() {
  // Force-clear any still up/rising targets so the interstitial (or the
  // results screen, on the final wave) shows a clean arena.
  for (const slot of state.slots) {
    if (slot.phase !== 'idle') { slot.phase = 'idle'; slot.type = null; slot.cooldownMs = 0; }
  }
  state.wavesSurvived = state.wave + 1;

  if (state.wave >= WAVE_COUNT - 1) {
    finishRun('cleared');
    return;
  }

  const waveScore = state.score - state.waveScoreStart;
  state.mode = 'waveClear';
  sfx.play('win');
  renderWaveClear(waveScore);
  showCard('waveClear');
  overlay.hidden = false;
}

function finishRun(reason) {
  state.mode = 'results';
  state.endReason = reason;
  state.wavesSurvived = reason === 'strikeout' ? state.wave : WAVE_COUNT;
  for (const slot of state.slots) { slot.phase = 'idle'; slot.type = null; slot.cooldownMs = 0; }
  state.isNewBest = state.score > state.best;
  if (state.isNewBest) {
    state.best = state.score;
    persistBest();
  }
  if (reason === 'cleared') sfx.play('win'); // strikeout already played 'die' at the triggering hit
  renderResults();
  showCard('results');
  overlay.hidden = false;
}

/* ------------------------------------------------------------------------ *
 * Ammo / reload
 * ------------------------------------------------------------------------ */
function startReload() {
  if (state.mode !== 'play' || state.reloading || state.ammo >= MAG_SIZE) return;
  state.reloading = true;
  state.reloadMs = 0;
  sfx.play('whoosh');
  updateHud();
}

/* ------------------------------------------------------------------------ *
 * Splats — active (animating pop-in) list drains into the persistent paint
 * layer once each one finishes growing.
 * ------------------------------------------------------------------------ */
function spawnSplatActive(x, y, big) {
  state.splats.push(makeSplat(x, y, { big }));
}

function advanceSplats(dtMs) {
  for (let i = state.splats.length - 1; i >= 0; i--) {
    const s = state.splats[i];
    s.age += dtMs;
    if (s.age >= s.growMs) {
      drawSplatShape(paintCtx, s, 1);
      state.splats.splice(i, 1);
    }
  }
}

/* ------------------------------------------------------------------------ *
 * Firing / hit testing
 * ------------------------------------------------------------------------ */
function setAim(x, y) {
  state.aim.x = Math.max(0, Math.min(CANVAS_W, x));
  state.aim.y = Math.max(0, Math.min(CANVAS_H, y));
}

function findTargetAt(x, y) {
  const nowSec = performance.now() / 1000;
  const p = params();
  let best = null;
  let bestDist = Infinity;
  for (const slot of state.slots) {
    if (slot.phase !== 'up' || !slot.type) continue;
    const visual = slotVisual(slot, nowSec, p);
    const r = targetRadius(slot) * HIT_RADIUS_MUL;
    const d = Math.hypot(x - visual.x, y - visual.y);
    if (d <= r && d < bestDist) { best = slot; bestDist = d; }
  }
  return best;
}

function spawnPopup(x, y, delta) {
  state.popups.push({
    x,
    y,
    text: delta >= 0 ? `+${delta}` : String(delta),
    color: delta >= 0 ? '#5cffb0' : '#ff5c7a',
    age: 0,
    ttl: POPUP_TTL_MS,
  });
}

function advancePopups(dtMs) {
  for (let i = state.popups.length - 1; i >= 0; i--) {
    const p = state.popups[i];
    p.age += dtMs;
    if (p.age >= p.ttl) state.popups.splice(i, 1);
  }
}

function retriggerFlash() {
  const stage = document.querySelector('.pb-stage');
  stage.classList.remove('is-flash');
  void stage.offsetWidth; // force reflow so the animation restarts even on rapid repeat hits
  stage.classList.add('is-flash');
}

function resolveHit(slot, x, y) {
  const type = TARGET_TYPES[slot.type];
  const kind = slot.type;
  slot.phase = 'hit';
  slot.phaseMs = 0;
  spawnSplatActive(x, y, true);

  if (kind === 'civilian') {
    state.score = Math.max(0, state.score - type.penalty);
    state.strikes += 1;
    sfx.play('die');
    retriggerFlash();
    spawnPopup(x, y, -type.penalty);
    updateHud();
    if (state.strikes >= MAX_STRIKES) {
      finishRun('strikeout');
      return;
    }
  } else {
    state.score += type.points;
    state.hitsGood += 1;
    sfx.play('splat');
    spawnPopup(x, y, type.points);
    if (type.refill) {
      state.ammo = MAG_SIZE;
      state.reloading = false;
      state.reloadMs = 0;
      sfx.play('pickup');
    }
    updateHud();
  }
}

function resolveMiss(x, y) {
  spawnSplatActive(x, y, false);
}

/** Fires a shot at canvas-space (x,y). Returns false (no shot leaves the
 * magazine, shotsFired is NOT incremented) if not currently playing,
 * mid-reload, or already empty — only an actual fired shot counts toward
 * accuracy's denominator. */
function fire(x, y) {
  setAim(x, y);
  if (state.mode !== 'play') return false;
  if (state.reloading || state.ammo <= 0) return false;

  state.ammo -= 1;
  state.shotsFired += 1;
  state.fireFlashMs = 90;
  sfx.play('pop');
  updateHud();

  const target = findTargetAt(state.aim.x, state.aim.y);
  if (target) resolveHit(target, state.aim.x, state.aim.y);
  else resolveMiss(state.aim.x, state.aim.y);

  if (state.ammo === 0 && !state.reloading) startReload();
  return true;
}

/* ------------------------------------------------------------------------ *
 * Per-frame tick — single source of truth for target lifecycle, spawning,
 * reload, splats, and the wave clock. Always runs (see loop() below);
 * everything here no-ops appropriately outside 'play' mode so a "Play
 * again" reset can never leave a stray timer from a previous run firing.
 * ------------------------------------------------------------------------ */
function tick(dtMs) {
  advanceSplats(dtMs);
  advancePopups(dtMs);
  if (state.fireFlashMs > 0) state.fireFlashMs = Math.max(0, state.fireFlashMs - dtMs);

  if (state.mode !== 'play') return;

  state.waveMs += dtMs;

  if (state.reloading) {
    state.reloadMs += dtMs;
    if (state.reloadMs >= RELOAD_MS) {
      state.reloading = false;
      state.reloadMs = 0;
      state.ammo = MAG_SIZE;
      sfx.play('land');
      updateHud();
    } else {
      updateReloadFill();
    }
  }

  for (const slot of state.slots) {
    if (slot.phase === 'rising') {
      slot.phaseMs += dtMs;
      if (slot.phaseMs >= RISE_MS) { slot.phase = 'up'; slot.phaseMs = 0; slot.ageMs = 0; }
    } else if (slot.phase === 'up') {
      slot.ageMs += dtMs;
      if (slot.ageMs >= slot.lifeMs) { slot.phase = 'falling'; slot.phaseMs = 0; }
    } else if (slot.phase === 'falling' || slot.phase === 'hit') {
      slot.phaseMs += dtMs;
      const dur = slot.phase === 'hit' ? HIT_MS : FALL_MS;
      if (slot.phaseMs >= dur) { slot.phase = 'idle'; slot.type = null; slot.cooldownMs = COOLDOWN_MS; }
    } else if (slot.cooldownMs > 0) {
      slot.cooldownMs = Math.max(0, slot.cooldownMs - dtMs);
    }
  }

  state.spawnAcc += dtMs;
  while (state.spawnAcc >= state.nextSpawnDelay) {
    state.spawnAcc -= state.nextSpawnDelay;
    trySpawnOne();
    state.nextSpawnDelay = rollSpawnDelay();
  }

  if (state.waveMs >= params().durationMs) endWave();
}

/* ------------------------------------------------------------------------ *
 * HUD + overlay text
 * ------------------------------------------------------------------------ */
function buildAmmoPips() {
  ammoPipsEl.innerHTML = '';
  for (let i = 0; i < MAG_SIZE; i++) {
    const pip = document.createElement('i');
    pip.className = 'pb-pip';
    ammoPipsEl.appendChild(pip);
  }
}

function updateReloadFill() {
  const pct = Math.min(100, (state.reloadMs / RELOAD_MS) * 100);
  reloadFillEl.style.width = `${pct}%`;
}

function updateHud() {
  hudWave.querySelector('strong').textContent = `${state.wave + 1}/${WAVE_COUNT}`;
  hudScore.querySelector('strong').textContent = String(state.score);
  hudStrikes.querySelector('strong').textContent = `${state.strikes}/${MAX_STRIKES}`;
  hudStrikes.classList.toggle('is-danger', state.strikes > 0);

  const pips = ammoPipsEl.querySelectorAll('.pb-pip');
  pips.forEach((pip, i) => pip.classList.toggle('is-spent', i >= state.ammo));

  hudAmmo.classList.toggle('is-reloading', state.reloading);
  reloadLabelEl.hidden = !state.reloading;
  reloadBarEl.hidden = !state.reloading;
  ammoPipsEl.hidden = state.reloading;
  if (state.reloading) updateReloadFill(); else reloadFillEl.style.width = '0%';
}

function renderBestLines() {
  const line = state.best > 0 ? t(lang, 'bestLine', { best: state.best }) : '';
  $('bestLineStart').textContent = line;
  $('bestLineEnd').textContent = line;
}

function renderWaveClear(waveScore) {
  $('waveClearTitle').textContent = t(lang, 'waveClearTitle', { n: state.wave + 1 });
  $('waveClearLine').textContent = t(lang, 'waveClearLine', { score: waveScore, total: state.score });
}

function renderResults() {
  const clear = state.endReason === 'cleared';
  $('resultsTitle').textContent = t(lang, clear ? 'resultsTitleClear' : 'resultsTitleStrikeout');
  const accuracy = state.shotsFired > 0 ? Math.round((state.hitsGood / state.shotsFired) * 100) : 0;
  $('resultsScoreLine').textContent = t(lang, 'resultsScoreLine', { score: state.score });
  $('resultsAccuracyLine').textContent = t(lang, 'resultsAccuracyLine', { pct: accuracy });
  $('resultsWavesLine').textContent = t(lang, 'resultsWavesLine', { n: state.wavesSurvived, total: WAVE_COUNT });
  $('newBestLine').hidden = !state.isNewBest;
  renderBestLines();
}

function showCard(which) {
  startCard.hidden = which !== 'start';
  waveClearCard.hidden = which !== 'waveClear';
  resultsCard.hidden = which !== 'results';
}

/* ------------------------------------------------------------------------ *
 * Profile (local best score only)
 * ------------------------------------------------------------------------ */
function loadBest() {
  const saved = OGHProfile.getProgress(GAME_ID);
  const n = Number(saved?.best);
  return Number.isFinite(n) ? n : 0;
}

function persistBest() {
  OGHProfile.saveProgress(
    GAME_ID,
    { best: state.best },
    { label: 'Paintball', summary: `Best ${state.best}` },
  );
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
  updateHud();
  if (state.mode === 'waveClear') renderWaveClear(state.score - state.waveScoreStart);
  if (state.mode === 'results') renderResults();
  rememberLang(lang);
}

/* ------------------------------------------------------------------------ *
 * Input — Pointer Events unify mouse + touch: pointermove aims (hover for
 * mouse, drag for touch), pointerdown fires at wherever the crosshair
 * currently is. Same eventToCanvasPoint scaling as games/billiards.
 * ------------------------------------------------------------------------ */
function eventToCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
    y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
  };
}

function onPointerMove(e) {
  const p = eventToCanvasPoint(e);
  setAim(p.x, p.y);
}

function onPointerDown(e) {
  e.preventDefault();
  sfx.unlock();
  const p = eventToCanvasPoint(e);
  fire(p.x, p.y);
}

function onKeyDown(e) {
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    sfx.unlock();
    startReload();
  } else if ((e.key === ' ' || e.key === 'Enter') && state.mode === 'play') {
    e.preventDefault();
    sfx.unlock();
    fire(state.aim.x, state.aim.y);
  }
}

function onStartClick() {
  sfx.unlock();
  sfx.play('tap');
  resetRun();
}

function onNextWaveClick() {
  sfx.unlock();
  sfx.play('tap');
  startWave(state.wave + 1);
}

function onReloadClick() {
  sfx.unlock();
  startReload();
}

/* ------------------------------------------------------------------------ *
 * Main loop
 * ------------------------------------------------------------------------ */
let lastNow = performance.now();
function loop(now) {
  const dt = Math.min(50, now - lastNow); // clamp so a tab-hidden hiccup can't cause a huge catch-up jump
  lastNow = now;
  tick(dt);
  drawFrame(ctx, paintCanvas, state, now / 1000, params());
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------------ */
function init() {
  buildAmmoPips();
  state.best = loadBest();
  applyLang(lang);
  showCard('start');

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown);

  $('btnStart').addEventListener('click', onStartClick);
  $('btnNextWave').addEventListener('click', onNextWaveClick);
  $('btnPlayAgain').addEventListener('click', onStartClick);
  $('btnReload').addEventListener('click', onReloadClick);

  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });

  // Debug/test hook — harmless in normal use, lets the harness (and
  // devtools) inspect wave difficulty and live state, fast-travel between
  // waves, and drive fire/reload without waiting out real timers. Same
  // convention as games/pop-the-bugs' window.OGH_POP_BUGS and
  // games/cross-the-road's window.OGH_CROSS_ROAD.
  window.OGH_PAINTBALL = {
    state,
    CONFIG: {
      WAVE_COUNT, MAX_STRIKES, MAG_SIZE, RELOAD_MS, RISE_MS, FALL_MS, HIT_MS, COOLDOWN_MS,
    },
    LANES,
    waveParams,
    params,
    eventToCanvasPoint,
    aimAt(x, y) { setAim(x, y); },
    fire(x, y) { return fire(x ?? state.aim.x, y ?? state.aim.y); },
    startReload,
    findTargetAt,
    /** Fast-travel to a given wave (0-based) without playing earlier ones. */
    jumpToWave(n) {
      const idx = Math.max(0, Math.min(WAVE_COUNT - 1, n));
      if (state.mode === 'title') {
        state.score = 0; state.strikes = 0; state.shotsFired = 0; state.hitsGood = 0; state.endReason = null;
      }
      startWave(idx); // sets state.mode = 'play' and hides the overlay
    },
    /** Deterministically force a slot to a fully-up target of the given
     * type (skips the rising animation, huge lifeMs so it won't expire) —
     * for tests that need to click/tap a target at a known screen position
     * via real dispatched pointer events rather than the debug fire() path.
     * Returns the target's current canvas-space center, or null. */
    forceSpawn(slotIndex, type) {
      const slot = state.slots[slotIndex];
      if (!slot || !TARGET_TYPES[type]) return null;
      slot.type = type;
      slot.phase = 'up';
      slot.ageMs = 0;
      slot.phaseMs = 0;
      slot.lifeMs = 999999;
      slot.cooldownMs = 0;
      const lane = LANES[slot.laneIdx];
      return { x: slot.x, y: lane.baseY - lane.rise };
    },
    startRun: resetRun,
    endWave,
    finishRun,
    tick,
  };
}

init();
