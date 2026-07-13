/**
 * Cart Corral — top-down parking-lot cart collection.
 *
 * `physics.js` owns all rules and runs at a fixed 120 Hz. This module only
 * connects input, local profile progress, translated DOM chrome, sound, and
 * the Canvas renderer.
 */

import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import { makeParkingLayout } from './parking.js';
import {
  createSimulation, stepSimulation, interact, nearestFreeCart, speedForLoad,
} from './physics.js';
import {
  CANVAS_W, CANVAS_H, createRenderState, updateRenderState, addEventEffect, drawFrame,
} from './render.js';

const GAME_ID = 'cart-corral';
const FIXED_DT = 1 / 120;
const MAX_FRAME_DT = 0.05;
const $ = (id) => document.getElementById(id);

const canvas = $('game');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');
ctx.direction = 'ltr';

const sfx = createOghSfx();
const overlay = $('overlay');
const startCard = $('startCard');
const endCard = $('endCard');
const pausedBanner = $('pausedBanner');

let lang = detectLang();
let layout = makeParkingLayout();
let sim = createSimulation(layout);
let view = createRenderState(sim.player);
let accumulator = 0;
let lastNow = performance.now();
let suspended = document.hidden;
let endReveal = 0;
let toastExpires = 0;
let latestScore = 0;
let latestNewBest = false;

const input = {
  stickX: 0,
  stickY: 0,
  debugX: null,
  debugY: null,
  keys: new Set(),
};

function savedProgress() {
  const data = OGHProfile.getProgress(GAME_ID);
  return data && typeof data === 'object' ? data : {};
}

function bestScore() {
  const n = Number(savedProgress().bestScore);
  return Number.isFinite(n) ? n : 0;
}

function formatClock(seconds, tenths = false) {
  const safe = Math.max(0, Number(seconds) || 0);
  if (tenths) {
    const mins = Math.floor(safe / 60);
    const secs = (safe % 60).toFixed(1).padStart(4, '0');
    return `${mins}:${secs}`;
  }
  const rounded = Math.ceil(safe);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}

function calculateScore() {
  if (sim.mode !== 'won') return 0;
  return Math.max(0, Math.round(1200 + sim.timeLeft * 12 - sim.strikes * 225));
}

function persistWin(score) {
  const old = savedProgress();
  const previousBest = Number(old.bestScore) || 0;
  const elapsed = Number(sim.elapsed) || (layout.duration - sim.timeLeft);
  const previousTime = Number(old.bestTime);
  const bestTime = Number.isFinite(previousTime) ? Math.min(previousTime, elapsed) : elapsed;
  latestNewBest = score > previousBest || !Number.isFinite(previousTime) || elapsed < previousTime;
  OGHProfile.saveProgress(
    GAME_ID,
    {
      bestScore: Math.max(previousBest, score),
      bestTime,
      wins: (Number(old.wins) || 0) + 1,
      lastScore: score,
      lastStrikes: sim.strikes,
    },
    {
      label: 'Cart Corral',
      summary: `Best ${Math.max(previousBest, score)} · ${formatClock(bestTime, true)}`,
    },
  );
}

function renderBestLines() {
  const data = savedProgress();
  const score = Number(data.bestScore) || 0;
  const seconds = Number(data.bestTime);
  const time = Number.isFinite(seconds) ? formatClock(seconds, true) : '—';
  const line = t(lang, 'bestLine', { score, time });
  $('bestLineStart').textContent = line;
  $('bestLineEnd').textContent = line;
}

function buildLangSwitch() {
  const wrap = $('langSwitch');
  wrap.innerHTML = '';
  for (const code of LANGS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `lang-btn${code === lang ? ' is-on' : ''}`;
    button.textContent = LANG_LABELS[code];
    button.setAttribute('aria-label', LANG_LABELS[code]);
    button.addEventListener('click', () => applyLang(code));
    wrap.appendChild(button);
  }
}

function applyLang(code) {
  lang = code;
  applyStaticStrings(lang);
  document.title = `${t(lang, 'title')} — OGH`;
  buildLangSwitch();
  renderBestLines();
  updateHud();
  if (sim.mode === 'won' || sim.mode === 'lost') renderEndText();
  rememberLang(lang);
}

function combinedInput() {
  if (input.debugX != null && input.debugY != null) {
    return { x: input.debugX, y: input.debugY };
  }
  let x = input.stickX;
  let y = input.stickY;
  if (input.keys.has('arrowleft') || input.keys.has('a')) x -= 1;
  if (input.keys.has('arrowright') || input.keys.has('d')) x += 1;
  if (input.keys.has('arrowup') || input.keys.has('w')) y -= 1;
  if (input.keys.has('arrowdown') || input.keys.has('s')) y += 1;
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  return { x, y };
}

function resetInput() {
  input.stickX = 0;
  input.stickY = 0;
  input.keys.clear();
  $('stickKnob').style.transform = 'translate(-50%, -50%)';
}

function eventWithPosition(event) {
  if (Number.isFinite(event.x) && Number.isFinite(event.y)) return event;
  const id = event.cartId || event.id;
  const cart = id ? sim.carts.find((item) => item.id === id) : null;
  return {
    ...event,
    x: cart?.x ?? sim.player.x,
    y: cart?.y ?? sim.player.y,
  };
}

function toast(text, danger = false) {
  if (!text) return;
  const el = $('toast');
  el.textContent = text;
  el.classList.toggle('is-danger', danger);
  el.classList.add('is-on');
  toastExpires = performance.now() + 1250;
}

function eventText(event) {
  if (event.type === 'grab') return t(lang, 'grabbed', { load: sim.attached.length });
  if (event.type === 'release') return t(lang, 'trainReleased');
  if (event.type === 'hit') return t(lang, 'carHit', { strikes: sim.strikes });
  if (event.type === 'deliver') return t(lang, 'delivered', { delivered: sim.delivered, total: sim.carts.length });
  if (event.type === 'win') return t(lang, 'allDelivered');
  return '';
}

function handleEvents(events) {
  for (const raw of events || []) {
    const event = eventWithPosition(raw);
    const label = eventText(event);
    addEventEffect(view, event, label);
    if (event.type === 'grab') {
      sfx.play('pickup'); toast(label);
    } else if (event.type === 'release') {
      sfx.play('place'); toast(label);
    } else if (event.type === 'hit') {
      sfx.play('clack'); toast(label, true);
    } else if (event.type === 'deliver') {
      sfx.play('pickup'); toast(label);
    } else if (event.type === 'win') {
      sfx.play('win'); toast(label);
      latestScore = calculateScore();
      persistWin(latestScore);
      endReveal = 0.65;
    } else if (event.type === 'lose') {
      sfx.play('die');
      latestScore = 0;
      latestNewBest = false;
      endReveal = 0.55;
    }
  }
  updateHud();
}

function actionLabel() {
  const nearby = sim.mode === 'play' ? nearestFreeCart(sim, 88) : null;
  if (nearby) return t(lang, 'grabBtn');
  if (sim.attached.length) return t(lang, 'releaseBtn');
  return t(lang, 'noCartBtn');
}

function updateHud() {
  const total = sim.carts.length;
  $('hudCartsValue').textContent = `${sim.delivered}/${total}`;
  $('hudLoadValue').textContent = String(sim.attached.length);
  $('hudTimeValue').textContent = formatClock(sim.timeLeft);
  $('hudStrikesValue').textContent = `${sim.strikes}/3`;

  const stamina = Math.max(0, Math.min(100, sim.player.stamina));
  $('staminaFill').style.width = `${stamina}%`;
  $('staminaText').textContent = `${Math.round(stamina)}%`;
  $('staminaMeter').setAttribute('aria-valuenow', String(Math.round(stamina)));
  $('staminaFill').classList.toggle('is-low', stamina < 28);
  $('hudTime').classList.toggle('is-danger', sim.timeLeft <= 20 && sim.mode === 'play');
  $('hudStrikes').classList.toggle('is-danger', sim.strikes >= 2);

  $('actionLabel').textContent = actionLabel();
  $('btnAction').disabled = sim.mode !== 'play' || (!nearestFreeCart(sim, 88) && sim.attached.length === 0);
}

function renderEndText() {
  const won = sim.mode === 'won';
  const reasonKey = sim.reason === 'damage' ? 'damageLostTitle' : 'timeLostTitle';
  $('endTitle').textContent = t(lang, won ? 'winTitle' : reasonKey);
  if (won) {
    $('finalLine').textContent = t(lang, 'finalWin', {
      time: formatClock(sim.elapsed || (layout.duration - sim.timeLeft), true),
      score: latestScore,
      strikes: sim.strikes,
    });
  } else {
    $('finalLine').textContent = t(lang, 'finalLose', {
      carts: sim.delivered,
      score: 0,
    });
  }
  $('newBestLine').hidden = !latestNewBest;
  renderBestLines();
}

function revealEnd() {
  renderEndText();
  startCard.hidden = true;
  endCard.hidden = false;
  overlay.hidden = false;
}

function startGame() {
  layout = makeParkingLayout();
  sim = createSimulation(layout);
  sim.mode = 'play';
  view = createRenderState(sim.player);
  accumulator = 0;
  endReveal = 0;
  latestScore = 0;
  latestNewBest = false;
  resetInput();
  startCard.hidden = false;
  endCard.hidden = true;
  overlay.hidden = true;
  $('newBestLine').hidden = true;
  sfx.unlock();
  sfx.play('tap');
  toast(t(lang, 'shiftReady'));
  updateHud();
}

function performInteract() {
  if (sim.mode !== 'play' || suspended) return;
  sfx.unlock();
  handleEvents(interact(sim));
}

/* ---------------------------------------------------------------------- */
/* Floating stick + keyboard input                                        */
/* ---------------------------------------------------------------------- */

const stickZone = $('stickZone');
const stickBase = $('stickBase');
const stickKnob = $('stickKnob');
let stickPointer = null;
const STICK_RADIUS = 46;

function safeCapture(el, pointerId) {
  try { el.setPointerCapture(pointerId); } catch { /* old WebView */ }
}

function moveStick(e) {
  if (e.pointerId !== stickPointer) return;
  const rect = stickBase.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = e.clientX - cx;
  let dy = e.clientY - cy;
  const len = Math.hypot(dx, dy);
  if (len > STICK_RADIUS) { dx = dx / len * STICK_RADIUS; dy = dy / len * STICK_RADIUS; }
  input.stickX = dx / STICK_RADIUS;
  input.stickY = dy / STICK_RADIUS;
  stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

stickZone.addEventListener('pointerdown', (e) => {
  if (stickPointer != null) return;
  e.preventDefault();
  sfx.unlock();
  stickPointer = e.pointerId;
  safeCapture(stickZone, e.pointerId);
  stickBase.hidden = false;
  stickZone.classList.add('is-down');
  moveStick(e);
});
stickZone.addEventListener('pointermove', (e) => { if (e.pointerId === stickPointer) { e.preventDefault(); moveStick(e); } });

function endStick(e) {
  if (e.pointerId !== stickPointer) return;
  stickPointer = null;
  input.stickX = 0; input.stickY = 0;
  stickKnob.style.transform = 'translate(-50%, -50%)';
  stickZone.classList.remove('is-down');
}
stickZone.addEventListener('pointerup', endStick);
stickZone.addEventListener('pointercancel', endStick);

const actionButton = $('btnAction');
actionButton.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  actionButton.classList.add('is-down');
  performInteract();
});
for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
  actionButton.addEventListener(type, () => actionButton.classList.remove('is-down'));
}

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
    e.preventDefault(); input.keys.add(key); sfx.unlock();
  }
  if ((key === ' ' || key === 'e') && !e.repeat) { e.preventDefault(); performInteract(); }
  if ((key === 'enter') && !e.repeat && sim.mode !== 'play') { e.preventDefault(); startGame(); }
});
window.addEventListener('keyup', (e) => input.keys.delete(e.key.toLowerCase()));

$('btnStart').addEventListener('click', startGame);
$('btnAgain').addEventListener('click', startGame);

function setSuspended(value) {
  suspended = value;
  pausedBanner.hidden = !suspended || sim.mode !== 'play';
  if (suspended) resetInput();
  accumulator = 0;
  lastNow = performance.now();
}
document.addEventListener('visibilitychange', () => setSuspended(document.hidden));
window.addEventListener('blur', () => setSuspended(true));
window.addEventListener('focus', () => setSuspended(false));

/* ---------------------------------------------------------------------- */
/* Fixed simulation loop                                                   */
/* ---------------------------------------------------------------------- */

function loop(now) {
  const dt = Math.min(MAX_FRAME_DT, Math.max(0, (now - lastNow) / 1000));
  lastNow = now;

  if (!suspended && sim.mode === 'play') {
    accumulator = Math.min(0.12, accumulator + dt);
    const liveInput = combinedInput();
    while (accumulator >= FIXED_DT && sim.mode === 'play') {
      const events = stepSimulation(sim, liveInput, FIXED_DT);
      if (events.length) handleEvents(events);
      accumulator -= FIXED_DT;
    }
  } else {
    accumulator = 0;
  }

  if (endReveal > 0) {
    endReveal -= dt;
    if (endReveal <= 0) revealEnd();
  }
  if (toastExpires && now >= toastExpires) {
    toastExpires = 0;
    $('toast').classList.remove('is-on');
  }

  updateRenderState(view, sim, dt);
  drawFrame(ctx, sim, layout, view, { paused: suspended, dropLabel: t(lang, 'dropZoneLabel') });
  updateHud();
  requestAnimationFrame(loop);
}

/* ---------------------------------------------------------------------- */
/* Browser debug hook — simulation can also be imported headlessly.        */
/* ---------------------------------------------------------------------- */

window.OGH_CART_CORRAL = {
  get state() { return sim; },
  get layout() { return layout; },
  speedForLoad,
  nearestFreeCart(maxDistance = Infinity) { return nearestFreeCart(sim, maxDistance); },
  setInput(x, y) { input.debugX = Number(x) || 0; input.debugY = Number(y) || 0; },
  clearInput() { input.debugX = null; input.debugY = null; resetInput(); },
  interact: performInteract,
  step(seconds = FIXED_DT, customInput = combinedInput()) {
    const count = Math.max(1, Math.ceil(seconds / FIXED_DT));
    const dt = seconds / count;
    const events = [];
    for (let i = 0; i < count && sim.mode === 'play'; i += 1) events.push(...stepSimulation(sim, customInput, dt));
    handleEvents(events);
    updateHud();
    return events;
  },
  warpCart(id, x, y, vx = 0, vy = 0) {
    const cart = sim.carts.find((item) => item.id === id);
    if (!cart) return false;
    cart.x = x; cart.y = y; cart.vx = vx; cart.vy = vy;
    return true;
  },
};

applyLang(lang);
renderBestLines();
updateHud();
drawFrame(ctx, sim, layout, view, { dropLabel: t(lang, 'dropZoneLabel') });
requestAnimationFrame(loop);
