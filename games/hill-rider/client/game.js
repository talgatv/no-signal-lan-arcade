/**
 * Hill Rider — side-view physics hill-climbing driving game (OGH, solo).
 *
 * game.js wires the pieces together: terrain (terrain.js), vehicle physics
 * (vehicle.js), sound, i18n, HUD, input and the canvas renderer/camera. It
 * owns run state (mode, coins, fuel gauge display, best distance) and
 * collectible spawn/pickup. The vehicle's only inputs are gas and brake —
 * see vehicle.js's header comment for the full grounded/airborne physics
 * model and why crash detection is deliberately gated to grounded frames
 * only (mid-air rotation, however extreme, never crashes on its own).
 *
 * Camera: a chase camera that translates the world so the vehicle sits at a
 * fixed lead fraction across the screen (more terrain visible ahead than
 * behind, so upcoming hills/jumps are readable) and vertically follows the
 * vehicle with a little lag, same translate-the-world-by-camera-position
 * shape as games/neon-drift's cameraTarget()/draw().
 *
 * RTL note: the canvas view and the touch controls are a fixed spatial
 * simulation with a permanent forward direction and never mirror — only
 * the DOM chrome (header/cards/hint) flips for Arabic (see i18n.js).
 * ctx.direction is forced to 'ltr' as a second guard, same precedent as
 * void-drift/neon-drift.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import {
  heightAt, slopeAt, drawTerrain, drawFarRidge, coinAtSlot, fuelAtSlot, COIN_SLOT, FUEL_SLOT,
} from './terrain.js';
import {
  CONFIG as CAR_CFG, makeVehicle, resetVehicle, stepVehicle, refuel,
} from './vehicle.js';

const $ = (id) => document.getElementById(id);
const GAME_ID = 'hill-rider';

/* ------------------------------------------------------------------------ *
 * Tunables
 * ------------------------------------------------------------------------ */
const START_X = 0;
const DIST_SCALE = 1 / 9; // world units -> displayed meters
const ITEM_LOOKAHEAD = 900; // grow the item frontier this far past the camera
const ITEM_PRUNE_BEHIND = 500; // drop items this far behind the camera
const PICKUP_RADIUS = 34;
const CAMERA_LEAD_FRAC = 0.32; // vehicle sits 32% across the screen, not centered
const CAMERA_Y_CHASE = 5; // 1/s exponential chase rate for vertical camera follow
const BACKDROP_PARALLAX = 0.35;

const TERRAIN_COLORS = { fill: 'rgba(9,12,24,0.94)', edge: '#5ce1ff' };
const FAR_RIDGE_COLOR = 'rgba(92,225,255,0.10)';

/* ------------------------------------------------------------------------ *
 * Canvas — sized dynamically to fill the stage, same approach as
 * games/void-drift's view canvas.
 * ------------------------------------------------------------------------ */
const canvas = $('view');
const ctx = canvas.getContext('2d');
ctx.direction = 'ltr';
let W = 800;
let H = 600;

function resize() {
  const r = canvas.getBoundingClientRect();
  W = Math.max(280, Math.round(r.width));
  H = Math.max(240, Math.round(r.height));
  canvas.width = W;
  canvas.height = H;
}

const sfx = createOghSfx();

/* ------------------------------------------------------------------------ *
 * DOM refs
 * ------------------------------------------------------------------------ */
const overlay = $('overlay');
const startCard = $('startCard');
const resultCard = $('resultCard');

/* ------------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------------ */
let lang = detectLang();

const state = {
  mode: 'title', // title | play | over
  endReason: null, // 'crash' | 'fuel'
  coins: 0,
  best: 0,
  isNewBest: false,
  startX: START_X,
  items: [], // live {id,kind,x,y,taken}
  nextCoinSlot: 0,
  nextFuelSlot: 0,
  floaters: [], // {x,y,life,text,color}
  camera: { x: START_X, y: 0, shake: 0 },
};

const input = { gas: false, brake: false };
let engineSfxTimer = 0; // periodic 'whoosh' while gas is held, same cadence trick as void-drift's thrust sound

/** The vehicle's persistent state object — never reassigned (see
 * vehicle.js's resetVehicle header comment for why: a live reference held
 * by the debug hook must stay valid across restarts). */
const car = makeVehicle(START_X);

const hooks = {
  onLand(c, impactSpeed) {
    if (state.mode === 'play') sfx.play('land');
  },
  onTakeoff() {},
  onCrash() {
    if (state.mode === 'play') endRun('crash');
  },
};

/* ------------------------------------------------------------------------ *
 * Collectibles — slot-indexed frontier grown ahead of the camera, pruned
 * behind it. See terrain.js's header for why per-slot generation can never
 * duplicate or skip a slot regardless of exactly where a frame's lookahead
 * boundary falls.
 * ------------------------------------------------------------------------ */
function growItems(aheadX) {
  while (state.nextCoinSlot * COIN_SLOT < aheadX) {
    const it = coinAtSlot(state.nextCoinSlot);
    if (it) state.items.push({ ...it, taken: false });
    state.nextCoinSlot++;
  }
  while (state.nextFuelSlot * FUEL_SLOT < aheadX) {
    const it = fuelAtSlot(state.nextFuelSlot);
    if (it) state.items.push({ ...it, taken: false });
    state.nextFuelSlot++;
  }
}

function pruneItems(behindX) {
  if (!state.items.length) return;
  state.items = state.items.filter((it) => !it.taken && it.x > behindX);
}

function spawnFloater(x, y, text, color) {
  state.floaters.push({ x, y, life: 0.9, maxLife: 0.9, text, color });
}

function updateFloaters(dt) {
  for (let i = state.floaters.length - 1; i >= 0; i--) {
    const f = state.floaters[i];
    f.life -= dt;
    f.y -= 22 * dt;
    if (f.life <= 0) state.floaters.splice(i, 1);
  }
}

function checkPickups() {
  for (const it of state.items) {
    if (it.taken) continue;
    const dx = it.x - car.x;
    const dy = it.y - car.y;
    if (dx * dx + dy * dy > PICKUP_RADIUS * PICKUP_RADIUS) continue;
    it.taken = true;
    if (it.kind === 'coin') {
      state.coins++;
      updateHudCoins();
      sfx.play('pickup');
      spawnFloater(it.x, it.y, '+1', '#ffd166');
    } else {
      refuel(car, CAR_CFG.FUEL_REFILL, CAR_CFG);
      sfx.play('refuel');
      spawnFloater(it.x, it.y, `+${CAR_CFG.FUEL_REFILL}`, '#5cffb0');
    }
  }
}

/* ------------------------------------------------------------------------ *
 * Run lifecycle
 * ------------------------------------------------------------------------ */
function currentDistanceM() {
  return Math.max(0, (car.x - state.startX) * DIST_SCALE);
}

function resetRun() {
  resetVehicle(car, START_X);
  state.mode = 'play';
  state.endReason = null;
  state.coins = 0;
  state.isNewBest = false;
  state.items = [];
  state.nextCoinSlot = 0;
  state.nextFuelSlot = 0;
  state.floaters = [];
  state.camera.x = car.x;
  state.camera.y = car.y;
  state.camera.shake = 0;
  growItems(car.x + ITEM_LOOKAHEAD);
  updateHudDistance();
  updateHudCoins();
  updateFuelGauge();
  overlay.hidden = true;
  sfx.play('tap');
}

function endRun(reason) {
  state.mode = 'over';
  state.endReason = reason;
  const distM = currentDistanceM();
  state.isNewBest = distM > state.best;
  if (state.isNewBest) {
    state.best = distM;
    persistBest();
  }
  startCard.hidden = true;
  resultCard.hidden = false;
  overlay.hidden = false;
  state.camera.shake = reason === 'crash' ? 11 : 0;
  renderResult();
  sfx.play(reason === 'crash' ? 'die' : 'tick');
}

/* ------------------------------------------------------------------------ *
 * Per-frame update
 * ------------------------------------------------------------------------ */
function updateCamera(dt) {
  state.camera.x = car.x;
  const chase = 1 - Math.exp(-CAMERA_Y_CHASE * dt);
  state.camera.y += (car.y - state.camera.y) * chase;
}

function update(dt) {
  updateFloaters(dt);
  if (state.camera.shake > 0) state.camera.shake = Math.max(0, state.camera.shake - dt * 22);

  if (state.mode !== 'play') {
    updateCamera(dt);
    return;
  }

  stepVehicle(car, input, dt, CAR_CFG, hooks);

  if (input.gas && car.fuel > 0) {
    engineSfxTimer -= dt;
    if (engineSfxTimer <= 0) {
      sfx.play('whoosh');
      engineSfxTimer = 0.5;
    }
  } else {
    engineSfxTimer = 0;
  }

  if (state.mode !== 'play') {
    // onCrash fired synchronously inside stepVehicle and already ended the
    // run above — skip the rest of this frame's play-only bookkeeping.
    updateCamera(dt);
    return;
  }

  growItems(car.x + ITEM_LOOKAHEAD);
  pruneItems(car.x - ITEM_PRUNE_BEHIND);
  checkPickups();

  updateHudDistance();
  updateFuelGauge();

  if (car.fuel <= 0 && car.grounded && Math.abs(car.speed) < CAR_CFG.STOP_EPSILON) {
    endRun('fuel');
  }

  updateCamera(dt);
}

/* ------------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------------ */
function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#05060d');
  grad.addColorStop(1, '#0c1022');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function drawBackdrop() {
  const backCamX = state.camera.x * BACKDROP_PARALLAX;
  const originX = CAMERA_LEAD_FRAC * W - backCamX;
  const originY = H * 0.6;
  ctx.save();
  ctx.translate(originX, originY);
  drawFarRidge(ctx, backCamX - CAMERA_LEAD_FRAC * W - 60, backCamX + (W - CAMERA_LEAD_FRAC * W) + 60, H, FAR_RIDGE_COLOR);
  ctx.restore();
}

function drawItem(it) {
  const tt = performance.now() / 1000;
  ctx.save();
  ctx.translate(it.x, it.y);
  if (it.kind === 'coin') {
    const bob = Math.sin(tt * 3 + it.x) * 3;
    ctx.translate(0, bob);
    const squash = 0.55 + 0.45 * Math.abs(Math.sin(tt * 2 + it.x * 0.1));
    ctx.scale(squash, 1);
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,209,102,0.22)';
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.4;
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 10;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-9, -16, 18, 26, 4) : ctx.rect(-9, -16, 18, 26);
    ctx.fillStyle = 'rgba(92,255,176,0.18)';
    ctx.fill();
    ctx.strokeStyle = '#5cffb0';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#5cffb0';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-9, -6);
    ctx.lineTo(9, -6);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawVehicle() {
  const R = CAR_CFG.WHEEL_OFFSET;
  const wheelR = 15;
  const spin = car.x / wheelR;

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  // exhaust flame while under power
  if (input.gas && car.fuel > 0 && state.mode === 'play') {
    const len = 10 + Math.random() * 10;
    ctx.beginPath();
    ctx.moveTo(-R - 6, -10);
    ctx.lineTo(-R - 6 - len, -4 + Math.random() * 8);
    ctx.lineTo(-R - 6, 2);
    ctx.closePath();
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 12;
    ctx.fill();
  }
  // brake glow
  if (input.brake) {
    ctx.beginPath();
    ctx.arc(-R - 4, -6, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ff5c7a';
    ctx.shadowColor = '#ff5c7a';
    ctx.shadowBlur = 10;
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // wheels
  for (const wx of [-R, R]) {
    ctx.beginPath();
    ctx.arc(wx, 0, wheelR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,10,20,0.9)';
    ctx.fill();
    ctx.strokeStyle = '#5ce1ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#5ce1ff';
    ctx.shadowBlur = 7;
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = spin + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(wx, 0);
      ctx.lineTo(wx + Math.cos(a) * wheelR * 0.85, Math.sin(a) * wheelR * 0.85);
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;

  // chassis wedge body
  ctx.beginPath();
  ctx.moveTo(-R - 6, -3);
  ctx.lineTo(-R - 2, -24);
  ctx.lineTo(-6, -32);
  ctx.lineTo(14, -28);
  ctx.lineTo(R + 8, -12);
  ctx.lineTo(R + 6, 0);
  ctx.lineTo(-R - 6, 0);
  ctx.closePath();
  ctx.fillStyle = 'rgba(92,225,255,0.16)';
  ctx.fill();
  ctx.strokeStyle = '#5ce1ff';
  ctx.lineWidth = 2.4;
  ctx.shadowColor = '#5ce1ff';
  ctx.shadowBlur = 9;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // canopy
  ctx.beginPath();
  ctx.moveTo(-4, -25);
  ctx.lineTo(10, -23);
  ctx.lineTo(6, -13);
  ctx.lineTo(-6, -13);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.strokeStyle = '#eaffff';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // headlamp
  ctx.beginPath();
  ctx.arc(R + 6, -10, 2.6, 0, Math.PI * 2);
  ctx.fillStyle = '#fff6d8';
  ctx.shadowColor = '#fff6d8';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawFloaters() {
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life / f.maxLife));
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function render() {
  drawSky();
  drawBackdrop();

  const shx = state.camera.shake ? (Math.random() - 0.5) * state.camera.shake : 0;
  const shy = state.camera.shake ? (Math.random() - 0.5) * state.camera.shake : 0;
  const originX = CAMERA_LEAD_FRAC * W - state.camera.x + shx;
  const originY = H * 0.5 - state.camera.y + shy;

  ctx.save();
  ctx.translate(originX, originY);

  const xMin = state.camera.x - CAMERA_LEAD_FRAC * W - 40;
  const xMax = state.camera.x + (W - CAMERA_LEAD_FRAC * W) + 40;
  drawTerrain(ctx, xMin, xMax, H + Math.abs(state.camera.y) + 400, TERRAIN_COLORS);

  for (const it of state.items) if (!it.taken) drawItem(it);
  drawVehicle();
  drawFloaters();

  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * HUD
 * ------------------------------------------------------------------------ */
function updateHudDistance() {
  $('hudDistanceVal').textContent = String(Math.floor(currentDistanceM()));
}
function updateHudCoins() {
  $('hudCoinsVal').textContent = String(state.coins);
}
function updateFuelGauge() {
  const frac = Math.max(0, Math.min(1, car.fuel / CAR_CFG.FUEL_MAX));
  $('fuelFill').style.transform = `scaleX(${frac})`;
  $('hudFuel').classList.toggle('is-low', frac <= 0.2);
}

/* ------------------------------------------------------------------------ *
 * High score (local only, via OGHProfile — same convention as pop-the-bugs)
 * ------------------------------------------------------------------------ */
function loadBest() {
  const saved = OGHProfile.getProgress(GAME_ID);
  const n = Number(saved?.best);
  return Number.isFinite(n) ? n : 0;
}

function persistBest() {
  OGHProfile.saveProgress(
    GAME_ID,
    { best: state.best, coins: state.coins },
    { label: 'Hill Rider', summary: `Best ${Math.floor(state.best)} m` },
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

function renderLegendTexts() {
  $('legendCoinTxt').textContent = t(lang, 'legendCoin');
  $('legendFuelTxt').textContent = t(lang, 'legendFuel');
}

function renderBestLines() {
  const line = `${t(lang, 'bestLabel')}: ${Math.floor(state.best)} m`;
  $('bestLineStart').textContent = line;
  $('bestLineEnd').textContent = line;
}

function renderResult() {
  const crashed = state.endReason === 'crash';
  $('resultTitle').textContent = t(lang, crashed ? 'crashTitle' : 'fuelOutTitle');
  $('resultSub').textContent = t(lang, crashed ? 'crashSub' : 'fuelOutSub');
  $('finalDistanceLine').textContent = `${t(lang, 'finalDistanceLabel')}: ${Math.floor(currentDistanceM())} m`;
  $('finalCoinsLine').textContent = `${t(lang, 'finalCoinsLabel')}: ${state.coins}`;
  $('newBestLine').hidden = !state.isNewBest;
  renderBestLines();
}

function applyLang(l) {
  lang = l;
  applyStaticStrings(lang);
  document.title = `${t(lang, 'title')} — OGH`;
  buildLangSwitch();
  renderLegendTexts();
  renderBestLines();
  if (state.mode === 'over') renderResult();
  rememberLang(lang);
  // Header height can shift with language (back-link length, whether the
  // HUD/lang row wraps) — re-measure so the canvas keeps filling exactly
  // what's left, on every language.
  resize();
}

/* ------------------------------------------------------------------------ *
 * Input — two large hold buttons (gas/brake) via Pointer Events, plus
 * keyboard arrows/W/S as a desktop bonus. No setPointerCapture (a plain
 * hold target doesn't need drag capture; pointerleave cancels naturally if
 * a finger slides off), same precedent as void-drift's D-pad.
 * ------------------------------------------------------------------------ */
function setupTouch() {
  function bindHold(el, onDown, onUp) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      sfx.unlock();
      el.classList.add('is-active');
      onDown();
    });
    const end = (e) => {
      e.stopPropagation();
      el.classList.remove('is-active');
      onUp();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', end);
  }

  bindHold($('btnGas'), () => { input.gas = true; }, () => { input.gas = false; });
  bindHold($('btnBrake'), () => { input.brake = true; }, () => { input.brake = false; });
}

function setupKeyboard() {
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'].includes(k)) e.preventDefault();
    if (k === 'ArrowUp' || k === 'w' || k === 'W') input.gas = true;
    if (k === 'ArrowDown' || k === 's' || k === 'S') input.brake = true;
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') input.gas = false;
    if (k === 'ArrowDown' || k === 's' || k === 'S') input.brake = false;
  });
}

function setupButtons() {
  $('btnStart').addEventListener('click', () => { sfx.unlock(); resetRun(); });
  $('btnAgain').addEventListener('click', () => { sfx.unlock(); resetRun(); });
}

/* ------------------------------------------------------------------------ *
 * Main loop
 * ------------------------------------------------------------------------ */
let lastNow = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000); // clamp so a tab-hidden hiccup can't cause a huge catch-up jump
  lastNow = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------------ */
function init() {
  state.best = loadBest();
  resize();
  state.camera.x = car.x;
  state.camera.y = car.y;
  growItems(car.x + ITEM_LOOKAHEAD); // decorative title-screen terrain/items

  setupTouch();
  setupKeyboard();
  setupButtons();
  applyLang(lang);
  updateHudDistance();
  updateHudCoins();
  updateFuelGauge();

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });
  exposeTestHook();
}

/* ------------------------------------------------------------------------ *
 * Test / debug hook — lets the automation harness (and devtools) inspect
 * and drive the game deterministically. Same convention as
 * games/void-drift's window.OGH_VOID_DRIFT and games/pop-the-bugs's
 * window.OGH_POP_BUGS. `car`/`state`/`input` are exposed live (never
 * reassigned — see vehicle.js's resetVehicle) so direct mutation from a
 * test harness (e.g. `hook.car.angle = 2.0`) always affects the real,
 * currently-running vehicle, even across resetRun() calls. `heightAt`/
 * `slopeAt` are terrain.js's own pure functions, exposed so a harness can
 * independently recompute "what the slope actually is at x" and compare it
 * to the live car.angle instead of eyeballing it.
 * ------------------------------------------------------------------------ */
function exposeTestHook() {
  window.OGH_HILL_RIDER = {
    state,
    car,
    input,
    get W() { return W; },
    get H() { return H; },
    CAR_CFG,
    DIST_SCALE,
    heightAt,
    slopeAt,
    currentDistanceM,
    resetRun,
    endRun,
    /** Directly set fuel (0..FUEL_MAX) for testing the empty-tank path. */
    setFuel(v) { car.fuel = Math.max(0, Math.min(CAR_CFG.FUEL_MAX, v)); },
    /** Snap the vehicle onto the terrain at its current x — clears any fall/
     * launch transient so a slope reading (or a teleport via car.x) is
     * immediately clean instead of settling over several frames. */
    snapToGround() {
      car.y = heightAt(car.x);
      car.grounded = true;
      car.vy = 0;
      car.speed = 0;
      car.angularVelocity = 0;
    },
    /** Manually advance one frame by dtMs — the real loop() also just calls
     * update() every rAF tick, so driving it by hand exercises exactly the
     * same code path (useful when a background/inactive tab never receives
     * rAF callbacks at all, or for frame-exact deterministic testing). */
    tick(dtMs) { update(dtMs / 1000); },
  };
}

init();
