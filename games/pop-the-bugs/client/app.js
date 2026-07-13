/**
 * Pop the Bugs — solo whack-a-mole reaction game.
 * 4x4 grid of holes; bugs pop up at random holes and must be tapped before
 * they scurry away. Good bug = points, red trap bug = penalty, rare golden
 * bug = bonus. 60-second timed round. Difficulty (spawn interval + visible
 * duration) ramps over the round down to a humanly-reactable floor.
 *
 * Architecture: a single perpetual requestAnimationFrame loop drives every
 * bug's lifecycle via a small state machine (idle -> up -> popped/escaped ->
 * idle) ticked by elapsed dt, instead of one setTimeout per bug. That means
 * there is exactly one thing to "stop" between rounds (nothing — the loop
 * always runs; game logic simply no-ops when state.mode !== 'play'), so a
 * "Play again" reset can never leave a stray timer from the previous round
 * still firing.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';

const $ = (id) => document.getElementById(id);
const GAME_ID = 'pop-the-bugs';

const sfx = createOghSfx();

/* ------------------------------------------------------------------------ *
 * Tunables — the "feel" of the game lives here.
 * ------------------------------------------------------------------------ */
const HOLE_COUNT = 16; // 4x4 grid

const ROUND_SECONDS = 60;

// Difficulty ramps from the *_START values down to the *_FLOOR values as the
// round progresses, then holds at the floor for the remainder of the round
// (see rampAt below). The floor is deliberately kept humanly reactable on a
// touchscreen per design brief: never faster than ~400ms spawn interval /
// ~350ms visible duration, even with jitter (rollSpawnDelay/rollVisibleMs
// hard-clamp to these floors no matter what the jitter roll produces).
const SPAWN_INTERVAL_START_MS = 1200;
const SPAWN_INTERVAL_FLOOR_MS = 400;
const VISIBLE_START_MS = 900;
const VISIBLE_FLOOR_MS = 350;

// Ramp curve: reach the floor at RAMP_HOLD_FRACTION of the round (then hold
// it for the rest), using an eased progress so the first stretch stays close
// to the generous starting values and the ramp bites harder near the end.
const RAMP_HOLD_FRACTION = 0.85;
const RAMP_EASE = 1.4;

// Randomize each roll around the ramped base so the cadence doesn't feel
// like a metronome; the floor clamp in rollSpawnDelay/rollVisibleMs still
// wins even on an unlucky "faster" jitter roll.
const SPAWN_JITTER = [0.82, 1.18];
const VISIBLE_JITTER = [0.9, 1.1];

const POP_ANIM_MS = 170; // successful tap: quick burst-and-fade
const ESCAPE_ANIM_MS = 230; // timed out: slow sink-back-down
const HOLE_COOLDOWN_MS = 150; // brief pause before the same hole can respawn

const SCORE_GOOD = 10;
const SCORE_GOLDEN = 30;
const SCORE_BAD = -15;

// Spawn weights (must sum to 1). Bad and golden are both minority cases;
// golden is rarer than bad so a bonus feels earned rather than routine.
const TYPE_WEIGHTS = [
  ['bad', 0.16],
  ['golden', 0.09],
  ['good', 0.75],
];

/* ------------------------------------------------------------------------ *
 * Mutable state
 * ------------------------------------------------------------------------ */
let lang = detectLang();

const state = {
  mode: 'title', // title | play | over
  score: 0,
  best: 0,
  isNewBest: false,
  elapsedMs: 0,
  timeLeftSec: ROUND_SECONDS,
  spawnAcc: 0,
  nextSpawnDelay: SPAWN_INTERVAL_START_MS,
  /** @type {Array<{type: string|null, phase: string, ageMs: number, lifeMs: number, phaseMs: number, cooldownMs: number}>} */
  holes: [],
};

for (let i = 0; i < HOLE_COUNT; i++) {
  state.holes.push({ type: null, phase: 'idle', ageMs: 0, lifeMs: 0, phaseMs: 0, cooldownMs: 0 });
}

/* ------------------------------------------------------------------------ *
 * Difficulty ramp — pure function of elapsed round time, so it can be
 * inspected directly (see window.OGH_POP_BUGS.rampAt in init()) instead of
 * eyeballed.
 * ------------------------------------------------------------------------ */
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function lerp(a, b, tt) { return a + (b - a) * tt; }

function rampAt(elapsedSec) {
  const raw = clamp01(elapsedSec / (ROUND_SECONDS * RAMP_HOLD_FRACTION));
  const tt = raw ** RAMP_EASE;
  return {
    interval: lerp(SPAWN_INTERVAL_START_MS, SPAWN_INTERVAL_FLOOR_MS, tt),
    visible: lerp(VISIBLE_START_MS, VISIBLE_FLOOR_MS, tt),
  };
}

function rollSpawnDelay(elapsedSec) {
  const { interval } = rampAt(elapsedSec);
  const [lo, hi] = SPAWN_JITTER;
  const jittered = interval * (lo + Math.random() * (hi - lo));
  return Math.max(SPAWN_INTERVAL_FLOOR_MS, jittered);
}

function rollVisibleMs(elapsedSec) {
  const { visible } = rampAt(elapsedSec);
  const [lo, hi] = VISIBLE_JITTER;
  const jittered = visible * (lo + Math.random() * (hi - lo));
  return Math.max(VISIBLE_FLOOR_MS, jittered);
}

function pickBugType() {
  const r = Math.random();
  let acc = 0;
  for (const [type, w] of TYPE_WEIGHTS) {
    acc += w;
    if (r < acc) return type;
  }
  return 'good';
}

function pickEmptyHoleIndex() {
  const candidates = [];
  for (let i = 0; i < HOLE_COUNT; i++) {
    const h = state.holes[i];
    if (h.phase === 'idle' && h.cooldownMs <= 0) candidates.push(i);
  }
  if (!candidates.length) return -1;
  return candidates[(Math.random() * candidates.length) | 0];
}

/* ------------------------------------------------------------------------ *
 * Bug SVG — one inline template shared by every hole and the legend icons.
 * Two silhouette groups (round/friendly vs spiky/hostile) are toggled by
 * CSS via the [data-type] attribute set on the ancestor (.pb-hole or
 * .pb-legend-item); color comes from the --bug-color custom property.
 * ------------------------------------------------------------------------ */
function starPoints(cx, cy, spikes, outerR, innerR) {
  const pts = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = i * step - Math.PI / 2;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

const SPIKY_BODY_POINTS = starPoints(50, 56, 9, 33, 20);

function bugSvgInner() {
  return `
    <g class="pb-bug-round">
      <g class="pb-legs">
        <line x1="26" y1="46" x2="10" y2="36" />
        <line x1="22" y1="60" x2="6" y2="60" />
        <line x1="26" y1="74" x2="11" y2="84" />
        <line x1="74" y1="46" x2="90" y2="36" />
        <line x1="78" y1="60" x2="94" y2="60" />
        <line x1="74" y1="74" x2="89" y2="84" />
      </g>
      <path class="pb-antenna" d="M42,24 Q34,10 26,6" />
      <path class="pb-antenna" d="M58,24 Q66,10 74,6" />
      <ellipse class="pb-body" cx="50" cy="60" rx="27" ry="23" />
      <path class="pb-seam" d="M50,39 L50,82" />
      <circle class="pb-spot" cx="37" cy="53" r="4.2" />
      <circle class="pb-spot" cx="63" cy="53" r="4.2" />
      <circle class="pb-spot" cx="38" cy="71" r="4.2" />
      <circle class="pb-spot" cx="62" cy="71" r="4.2" />
      <circle class="pb-head" cx="50" cy="28" r="13" />
      <circle class="pb-eye" cx="45" cy="26" r="2.3" />
      <circle class="pb-eye" cx="55" cy="26" r="2.3" />
      <g class="pb-sparkle">
        <path d="M16,18 L18,24 L24,26 L18,28 L16,34 L14,28 L8,26 L14,24 Z" />
        <path d="M84,64 L85.4,68 L89.4,69.4 L85.4,70.8 L84,74.8 L82.6,70.8 L78.6,69.4 L82.6,68 Z" />
        <path d="M80,16 L81,19 L84,20 L81,21 L80,24 L79,21 L76,20 L79,19 Z" />
      </g>
    </g>
    <g class="pb-bug-spiky">
      <g class="pb-legs-spiky">
        <polyline points="26,46 12,40 4,50" />
        <polyline points="22,60 6,58 2,68" />
        <polyline points="26,74 12,80 6,92" />
        <polyline points="74,46 88,40 96,50" />
        <polyline points="78,60 94,58 98,68" />
        <polyline points="74,74 88,80 94,92" />
      </g>
      <polygon class="pb-body-spiky" points="${SPIKY_BODY_POINTS}" />
      <polyline class="pb-brow" points="38,46 47,51" />
      <polyline class="pb-brow" points="62,46 53,51" />
      <circle class="pb-eye-spiky" cx="43" cy="55" r="2.6" />
      <circle class="pb-eye-spiky" cx="57" cy="55" r="2.6" />
    </g>
  `;
}

/* ------------------------------------------------------------------------ *
 * DOM: grid holes + overlay elements
 * ------------------------------------------------------------------------ */
const grid = $('grid');
const stage = document.querySelector('.pb-stage');
const overlay = $('overlay');
const startCard = $('startCard');
const overCard = $('overCard');
/** @type {HTMLElement[]} */
const holeEls = [];

/**
 * Size the grid from .pb-stage's *actual* measured available box rather
 * than guessing a fixed vw/vh split in CSS. A pure-CSS min(92vw, Xvh) can't
 * know how tall the header ended up (it wraps differently depending on
 * language / how many lang buttons fit) or how tall the hint text is, so on
 * short/narrow viewports a static vh guess can end up taller than what's
 * actually left over, overlapping the hint or crowding the header. Measuring
 * .pb-stage's clientWidth/clientHeight is exact because the hint is a normal
 * (non-fixed) flex sibling of .pb-stage, so .pb-stage's flex-computed height
 * already excludes both the header and the hint by construction.
 */
function sizeGrid() {
  const margin = 10; // small breathing room inside the stage's own padding
  const available = Math.min(stage.clientWidth, stage.clientHeight) - margin;
  // The floor here is only a defensive guard against a transient 0/negative
  // measurement (e.g. a layout read before first paint) — it must stay well
  // below any realistic device's available space, or it defeats the whole
  // point of measuring: on a genuinely very short viewport (a phone in
  // landscape with the address bar showing), forcing a size bigger than
  // what's actually left would re-introduce the exact header/hint overlap
  // this function exists to prevent. Never-overlap outranks a comfort
  // minimum; realistic devices have comfortably more than 200px to work
  // with, so this only bites on genuinely pathological viewports.
  const size = Math.max(120, Math.min(560, available));
  grid.style.width = `${size}px`;
  grid.style.height = `${size}px`;
}

function buildGridDom() {
  const inner = bugSvgInner();
  for (let i = 0; i < HOLE_COUNT; i++) {
    const hole = document.createElement('div');
    hole.className = 'pb-hole';
    hole.dataset.idx = String(i);
    hole.innerHTML = `<svg class="pb-bug" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
    grid.appendChild(hole);
    holeEls.push(hole);
  }
}

function buildLegendDom() {
  document.querySelectorAll('.pb-legend-item .pb-bug').forEach((svg) => {
    svg.innerHTML = bugSvgInner();
  });
}

function renderHoleUp(i) {
  const el = holeEls[i];
  el.dataset.type = state.holes[i].type;
  el.classList.remove('is-popped', 'is-escaped');
  clearFloaters(el);
  el.classList.add('is-up');
}

function renderHoleExit(i, kind) {
  const el = holeEls[i];
  el.classList.remove('is-up');
  el.classList.add(kind === 'escaped' ? 'is-escaped' : 'is-popped');
}

function renderHoleIdle(i) {
  const el = holeEls[i];
  el.classList.remove('is-up', 'is-popped', 'is-escaped');
  delete el.dataset.type;
}

function retriggerShake() {
  grid.classList.remove('is-shake');
  void grid.offsetWidth; // force reflow so the animation restarts even on rapid repeat hits
  grid.classList.add('is-shake');
}

function clearFloaters(el) {
  el.querySelectorAll('.pb-float').forEach((n) => n.remove());
}

function spawnFloater(i, delta) {
  const el = holeEls[i];
  clearFloaters(el);
  const f = document.createElement('span');
  f.className = `pb-float ${delta >= 0 ? 'is-pos' : 'is-neg'}`;
  f.textContent = delta >= 0 ? `+${delta}` : String(delta);
  el.appendChild(f);
  f.addEventListener('animationend', () => f.remove(), { once: true });
}

/* ------------------------------------------------------------------------ *
 * Round lifecycle
 * ------------------------------------------------------------------------ */
function resetHoles() {
  for (let i = 0; i < HOLE_COUNT; i++) {
    state.holes[i] = { type: null, phase: 'idle', ageMs: 0, lifeMs: 0, phaseMs: 0, cooldownMs: 0 };
    renderHoleIdle(i);
    clearFloaters(holeEls[i]);
  }
}

function loadBest() {
  const saved = OGHProfile.getProgress(GAME_ID);
  const n = Number(saved?.best);
  return Number.isFinite(n) ? n : 0;
}

function persistBest() {
  OGHProfile.saveProgress(
    GAME_ID,
    { best: state.best },
    { label: 'Pop the Bugs', summary: `Best ${state.best}` }
  );
}

function startRound() {
  resetHoles();
  state.mode = 'play';
  state.score = 0;
  state.isNewBest = false;
  state.elapsedMs = 0;
  state.timeLeftSec = ROUND_SECONDS;
  state.spawnAcc = 0;
  state.nextSpawnDelay = rollSpawnDelay(0);
  updateHudScore();
  updateHudTime();
  overlay.hidden = true;
}

function endRound() {
  state.mode = 'over';
  state.timeLeftSec = 0;
  updateHudTime();
  state.isNewBest = state.score > state.best;
  if (state.isNewBest) {
    state.best = state.score;
    updateHudBest();
    persistBest();
  }
  startCard.hidden = true;
  overCard.hidden = false;
  overlay.hidden = false;
  renderResult();
  sfx.play('win');
}

/* ------------------------------------------------------------------------ *
 * Per-frame tick — single source of truth for every hole's lifecycle and
 * the round timer. No per-bug setTimeout anywhere; the RAF loop below
 * always runs, this just no-ops outside 'play' mode.
 * ------------------------------------------------------------------------ */
function trySpawnOne(elapsedSec) {
  const i = pickEmptyHoleIndex();
  if (i < 0) return;
  const h = state.holes[i];
  h.type = pickBugType();
  h.phase = 'up';
  h.ageMs = 0;
  h.lifeMs = rollVisibleMs(elapsedSec);
  renderHoleUp(i);
}

function escapeHole(i) {
  const h = state.holes[i];
  const { type } = h;
  h.phase = 'escaped';
  h.phaseMs = 0;
  renderHoleExit(i, 'escaped');
  // A good/golden bug getting away is a (soft) miss — a light click, not the
  // harsh "wrong tap" buzz. A bad bug expiring untouched is the *correct*
  // play, so it stays silent (no cue needed for doing the right thing).
  if (type !== 'bad') sfx.play('tick');
}

function freeHole(i) {
  const h = state.holes[i];
  h.phase = 'idle';
  h.type = null;
  h.cooldownMs = HOLE_COOLDOWN_MS;
  renderHoleIdle(i);
}

function onTapHole(i) {
  const h = state.holes[i];
  if (h.phase !== 'up') return; // empty hole, or already popping/escaping: no-op
  const { type } = h;
  h.phase = 'popped';
  h.phaseMs = 0;
  renderHoleExit(i, 'popped');

  const delta = type === 'good' ? SCORE_GOOD : type === 'golden' ? SCORE_GOLDEN : SCORE_BAD;
  state.score = Math.max(0, state.score + delta);
  updateHudScore();
  spawnFloater(i, delta);

  if (type === 'bad') {
    sfx.play('die');
    retriggerShake();
  } else {
    sfx.play('pickup');
  }
}

function tick(dtMs) {
  if (state.mode !== 'play') return;

  state.elapsedMs += dtMs;
  const elapsedSec = state.elapsedMs / 1000;
  state.timeLeftSec = Math.max(0, ROUND_SECONDS - elapsedSec);
  updateHudTime();

  for (let i = 0; i < HOLE_COUNT; i++) {
    const h = state.holes[i];
    if (h.phase === 'up') {
      h.ageMs += dtMs;
      if (h.ageMs >= h.lifeMs) escapeHole(i);
    } else if (h.phase === 'popped' || h.phase === 'escaped') {
      h.phaseMs += dtMs;
      const dur = h.phase === 'popped' ? POP_ANIM_MS : ESCAPE_ANIM_MS;
      if (h.phaseMs >= dur) freeHole(i);
    } else if (h.cooldownMs > 0) {
      h.cooldownMs = Math.max(0, h.cooldownMs - dtMs);
    }
  }

  state.spawnAcc += dtMs;
  while (state.spawnAcc >= state.nextSpawnDelay) {
    state.spawnAcc -= state.nextSpawnDelay;
    trySpawnOne(elapsedSec);
    state.nextSpawnDelay = rollSpawnDelay(elapsedSec);
  }

  if (state.elapsedMs >= ROUND_SECONDS * 1000) {
    endRound();
  }
}

let lastNow = performance.now();
function loop(now) {
  const dt = Math.min(50, now - lastNow); // clamp so a tab-hidden hiccup can't cause a huge catch-up jump
  lastNow = now;
  tick(dt);
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------------ *
 * HUD + overlay text
 * ------------------------------------------------------------------------ */
function updateHudScore() { $('scoreVal').textContent = String(state.score); }
function updateHudTime() { $('timeVal').textContent = String(Math.ceil(state.timeLeftSec)); }
function updateHudBest() { $('bestVal').textContent = String(state.best); }

function renderLegendTexts() {
  $('legendGoodTxt').textContent = t(lang, 'legendGood', { n: SCORE_GOOD });
  $('legendGoldenTxt').textContent = t(lang, 'legendGolden', { n: SCORE_GOLDEN });
  $('legendBadTxt').textContent = t(lang, 'legendBad', { n: Math.abs(SCORE_BAD) });
}

function renderBestLines() {
  const line = `${t(lang, 'bestLabel')}: ${state.best}`;
  $('bestLineStart').textContent = line;
  $('bestLineEnd').textContent = line;
}

function renderResult() {
  $('finalScoreLine').textContent = `${t(lang, 'finalScoreLabel')}: ${state.score}`;
  $('newBestLine').hidden = !state.isNewBest;
  renderBestLines();
}

function renderHudAria() {
  $('hudTime').setAttribute('aria-label', t(lang, 'timeAria'));
  $('hudScore').setAttribute('aria-label', t(lang, 'scoreAria'));
  $('hudBest').setAttribute('aria-label', t(lang, 'bestAria'));
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
  renderLegendTexts();
  renderBestLines();
  renderHudAria();
  if (state.mode === 'over') renderResult();
  rememberLang(lang);
  // Header height can shift with language (back-link text length, whether
  // the HUD/lang-switch row wraps) — re-measure so the grid keeps filling
  // exactly what's left, on every language, not just the one it booted in.
  sizeGrid();
}

/* ------------------------------------------------------------------------ *
 * Input — pointerdown (not click) for minimum tap latency; a single
 * delegated listener on the grid covers all 16 holes.
 * ------------------------------------------------------------------------ */
function onGridPointerDown(e) {
  const holeEl = e.target.closest('.pb-hole');
  if (!holeEl) return;
  e.preventDefault();
  sfx.unlock();
  if (state.mode !== 'play') return;
  onTapHole(Number(holeEl.dataset.idx));
}

function onStartClick() {
  sfx.unlock();
  sfx.play('tap');
  startRound();
}

/* ------------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------------ */
function init() {
  buildGridDom();
  buildLegendDom();

  state.best = loadBest();
  updateHudBest();
  applyLang(lang); // also runs the first sizeGrid()

  grid.addEventListener('pointerdown', onGridPointerDown);
  $('btnStart').addEventListener('click', onStartClick);
  $('btnAgain').addEventListener('click', onStartClick);

  // Real devices resize (rotation, browser chrome show/hide, on-screen
  // keyboard); keep the grid filling exactly what's actually available.
  window.addEventListener('resize', sizeGrid);
  window.addEventListener('orientationchange', sizeGrid);

  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });

  // Debug/test hook — harmless in normal use, lets the harness (and
  // devtools) inspect the difficulty ramp and live round state without
  // waiting out a full 60s round or trying to eyeball timing.
  window.OGH_POP_BUGS = {
    state,
    CONFIG: {
      ROUND_SECONDS,
      SPAWN_INTERVAL_START_MS,
      SPAWN_INTERVAL_FLOOR_MS,
      VISIBLE_START_MS,
      VISIBLE_FLOOR_MS,
      RAMP_HOLD_FRACTION,
      RAMP_EASE,
      SCORE_GOOD,
      SCORE_GOLDEN,
      SCORE_BAD,
    },
    rampAt,
    /** Fast-forward the live round clock for testing (play mode only). */
    forceElapsedMs(ms) {
      if (state.mode === 'play') state.elapsedMs = Math.max(0, ms);
    },
    startRound,
    endRound,
    /** Manually advance one frame by dtMs — the real loop() also just calls
     * this every rAF tick, so driving it by hand (e.g. in a browser-automation
     * harness where a background/inactive tab never receives rAF callbacks
     * at all) exercises exactly the same code path as normal play. */
    tick,
  };
}

init();
