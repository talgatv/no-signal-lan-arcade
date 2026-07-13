/**
 * Claw Machine — solo pseudo-3D arcade claw machine.
 *
 * prizes.js owns world/claw-space constants, prize stats, the grip/slip
 * probability curves, and pit/falling-prize physics (no canvas/DOM code).
 * render3d.js owns the projection and all drawing (no game state
 * mutation). This file owns state, the claw's phase state machine, input
 * (D-pad hold-buttons + Drop button + arrow/WASD keys), sfx, i18n wiring,
 * and the single RAF loop — same three-way split as games/paintball's
 * targets.js/render.js/game.js.
 *
 * Claw phase state machine (state.claw.phase):
 *   idle -> [Drop pressed] -> dropping -> gripping -> (success) lifting
 *     -> carrying -> releasing -> returning -> idle
 *                  -> (fail)    -> returning -> idle
 *   A slip can fire mid-'lifting' or mid-'carrying' (see maybeTriggerSlip):
 *   it detaches the held prize (which then tumbles via prizes.js physics)
 *   and jumps straight to 'returning'. Movement input (the D-pad) is only
 *   read while phase === 'idle' — exactly like a real cabinet, the joystick
 *   does nothing once a drop is committed.
 *
 * Grip success depends on how centered the claw was over its target when
 * it stopped descending (prizes.js's gripChance(dist, type)); a successful
 * grab still carries independent lift/carry slip risk that ALSO scales
 * with that same centering (prizes.js's slipChance) — so precise play
 * compounds its advantage across both rolls, but even a perfect dead-
 * center grab keeps a small non-zero chance of coming home empty. This is
 * deliberate: seeing games/claw-machine/README.md's "grip mechanic
 * honesty" note for the exact numbers and reasoning.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import {
  PIT_X_MIN, PIT_X_MAX, PIT_Y_NEAR, PIT_Y_FAR, RAIL_Z, PIT_FLOOR_Z, CHUTE,
  CLAW_X_MIN, CLAW_X_MAX, CLAW_Y_MIN, CLAW_Y_MAX, PRIZE_TYPES,
  scatterPrizes, nearestPrizeAt, grabRadiusFor, gripChance, slipChance,
  startFalling, stepFallingPrize, clamp,
} from './prizes.js';
import { drawFrame, project, depthScale } from './render3d.js';

const $ = (id) => document.getElementById(id);
const GAME_ID = 'claw-machine';

const sfx = createOghSfx();
const canvas = $('game');
const ctx = canvas.getContext('2d');
ctx.direction = 'ltr'; // belt-and-suspenders; see index.html's dir="ltr" comment

const overlay = $('overlay');
const startCard = $('startCard');
const resultsCard = $('resultsCard');
const toastEl = $('toast');
const dropBtn = $('btnDrop');
const hudCredits = $('hudCredits');
const hudScore = $('hudScore');
const hudPrizes = $('hudPrizes');

// --- Tunables ----------------------------------------------------------------

const CREDITS_START = 8;
const PRIZE_COUNT = 16;
const CLAW_MOVE_SPEED = 105; // world units/s while a D-pad direction is held
const CLAW_DROP_SPEED = 230; // world z-units/s descending
const CLAW_LIFT_SPEED = 200; // world z-units/s ascending
const CLAW_CARRY_SPEED = 150; // world units/s while carrying to the chute
const GRIP_ANIM_S = 0.38; // fingers closing animation on reaching bottom
const RELEASE_ANIM_S = 0.22; // fingers opening animation at the chute
const PRIZE_HANG_OFFSET = 6; // world z a held prize hangs below the claw hub
const HOME = { x: 0, y: (CLAW_Y_MIN + CLAW_Y_MAX) / 2 };

let lang = detectLang();

const state = {
  mode: 'title', // title | play | results
  credits: CREDITS_START,
  score: 0,
  best: 0,
  isNewBest: false,
  prizesWon: 0,
  dropsUsed: 0,
  prizes: [],
  claw: {
    x: HOME.x,
    y: HOME.y,
    z: RAIL_Z,
    grip: 0, // 0 = open .. 1 = closed
    phase: 'idle',
    heldUid: null,
    stopZ: PIT_FLOOR_Z,
    dropTargetUid: null,
    dropDist: Infinity,
    gripTimer: 0,
    releaseTimer: 0,
    liftStartZ: RAIL_Z,
    carryStart: { x: 0, y: 0 },
    slip: { lift: null, carry: null },
  },
  chuteGlowMs: 0,
};

const input = { left: false, right: false, far: false, near: false };

/** Debug-only overrides (null = real RNG). See window.OGH_CLAW_MACHINE. */
const debugForce = { grip: null, slipLift: null, slipCarry: null };

// --- Helpers -------------------------------------------------------------

function prizeByUid(uid) {
  return uid ? state.prizes.find((p) => p.uid === uid) || null : null;
}

function removePrizeByUid(uid) {
  const i = state.prizes.findIndex((p) => p.uid === uid);
  if (i >= 0) state.prizes.splice(i, 1);
}

function lerpTowards(v, target, k) {
  return v + (target - v) * Math.min(1, k);
}

/* ------------------------------------------------------------------------ *
 * Toast — a short grip-feedback phrase floated over the scene. Uses the
 * classic "remove class, force reflow, re-add class" retrigger technique
 * (games/paintball's civilian-hit flash, games/cross-the-road's floater) so
 * back-to-back messages each restart the pop-in/fade animation cleanly.
 * ------------------------------------------------------------------------ */
function showToast(msg, kind) {
  toastEl.textContent = msg;
  toastEl.classList.remove('is-on', 'is-good', 'is-bad');
  void toastEl.offsetWidth;
  if (kind === 'good') toastEl.classList.add('is-good');
  if (kind === 'bad') toastEl.classList.add('is-bad');
  toastEl.classList.add('is-on');
}

/* ------------------------------------------------------------------------ *
 * Claw sequence — see header comment for the full phase diagram.
 * ------------------------------------------------------------------------ */
function beginDrop() {
  if (state.mode !== 'play' || state.claw.phase !== 'idle' || state.credits <= 0) {
    if (state.mode === 'play' && state.credits <= 0) showToast(t(lang, 'toastNoCredits'), 'bad');
    return;
  }
  state.credits -= 1;
  state.dropsUsed += 1;
  updateHud();
  const c = state.claw;
  const found = nearestPrizeAt(state.prizes, c.x, c.y);
  c.dropTargetUid = found ? found.prize.uid : null;
  c.dropDist = found ? found.dist : Infinity;
  c.stopZ = found ? found.prize.z : PIT_FLOOR_Z;
  c.phase = 'dropping';
  sfx.play('whoosh');
}

function beginGripAttempt() {
  const c = state.claw;
  c.phase = 'gripping';
  c.gripTimer = GRIP_ANIM_S;
  sfx.play('thwack');
}

function resolveGripAttempt() {
  const c = state.claw;
  const target = prizeByUid(c.dropTargetUid);
  if (!target) { failGrab(); return; }
  const type = PRIZE_TYPES[target.type];
  const chance = gripChance(c.dropDist, type);
  const success = debugForce.grip != null ? debugForce.grip : Math.random() < chance;
  if (!success) { failGrab(); return; }

  target.state = 'held';
  c.heldUid = target.uid;
  c.grip = 1;
  c.liftStartZ = c.z;
  c.slip.lift = scheduleSlip('lift', c.dropDist, type);
  c.slip.carry = scheduleSlip('carry', c.dropDist, type);
  c.phase = 'lifting';
  sfx.play('pickup');
  showToast(t(lang, 'toastGrabbed'), 'good');
}

function failGrab() {
  const c = state.claw;
  c.heldUid = null;
  c.phase = 'returning';
  sfx.play('clack');
  showToast(t(lang, 'toastMissed'), 'bad');
}

/** Decide up-front whether THIS lift/carry phase will end in a slip, and if
 * so at what fraction of the phase's progress (0..1) — so a slip visibly
 * happens "partway through", not the instant the phase begins or only at
 * its very end. */
function scheduleSlip(phase, dist, type) {
  const chance = slipChance(dist, type, phase);
  const forced = phase === 'lift' ? debugForce.slipLift : debugForce.slipCarry;
  const willSlip = forced != null ? forced : Math.random() < chance;
  return willSlip ? { atT: 0.2 + Math.random() * 0.6, triggered: false } : null;
}

function maybeTriggerSlip(phase) {
  const c = state.claw;
  const s = c.slip[phase];
  if (!s || s.triggered) return;
  let progress;
  if (phase === 'lift') {
    const total = RAIL_Z - c.liftStartZ;
    progress = total > 1e-6 ? (c.z - c.liftStartZ) / total : 1;
  } else {
    const total = Math.hypot(CHUTE.x - c.carryStart.x, CHUTE.y - c.carryStart.y);
    progress = total > 1e-6 ? Math.hypot(c.x - c.carryStart.x, c.y - c.carryStart.y) / total : 1;
  }
  if (progress >= s.atT) {
    s.triggered = true;
    triggerSlip(phase);
  }
}

function triggerSlip(phase) {
  const c = state.claw;
  const held = prizeByUid(c.heldUid);
  c.heldUid = null;
  c.grip = 0;
  c.phase = 'returning';
  if (held) {
    held.state = 'falling';
    startFalling(held, { vz: 15 + Math.random() * 25 });
  }
  sfx.play('boing');
  showToast(t(lang, phase === 'lift' ? 'toastSlippedLift' : 'toastSlippedCarry'), 'bad');
}

function beginCarry() {
  state.claw.carryStart = { x: state.claw.x, y: state.claw.y };
  state.claw.phase = 'carrying';
}

function beginRelease() {
  state.claw.phase = 'releasing';
  state.claw.releaseTimer = RELEASE_ANIM_S;
}

function finishRelease() {
  const c = state.claw;
  const held = prizeByUid(c.heldUid);
  c.heldUid = null;
  c.grip = 0;
  c.phase = 'returning';
  if (held) deliverPrize(held);
}

function deliverPrize(prize) {
  const type = PRIZE_TYPES[prize.type];
  state.score += type.points;
  state.prizesWon += 1;
  removePrizeByUid(prize.uid);
  state.chuteGlowMs = 900;
  updateHud();
  sfx.play('pocket');
  setTimeout(() => sfx.play('win'), 150);
  showToast(t(lang, 'toastWon', { points: type.points }), 'good');
}

/* ------------------------------------------------------------------------ *
 * Per-frame stepping
 * ------------------------------------------------------------------------ */
function stepClaw(dt) {
  const c = state.claw;
  switch (c.phase) {
    case 'idle': {
      let dx = 0;
      let dy = 0;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;
      if (input.far) dy += 1;
      if (input.near) dy -= 1;
      if (dx || dy) {
        const len = Math.hypot(dx, dy) || 1;
        c.x = clamp(c.x + (dx / len) * CLAW_MOVE_SPEED * dt, CLAW_X_MIN, CLAW_X_MAX);
        c.y = clamp(c.y + (dy / len) * CLAW_MOVE_SPEED * dt, CLAW_Y_MIN, CLAW_Y_MAX);
      }
      c.grip = lerpTowards(c.grip, 0, dt * 6);
      break;
    }
    case 'dropping': {
      c.grip = lerpTowards(c.grip, 0, dt * 6);
      c.z = Math.max(c.stopZ, c.z - CLAW_DROP_SPEED * dt);
      if (c.z <= c.stopZ + 0.05) { c.z = c.stopZ; beginGripAttempt(); }
      break;
    }
    case 'gripping': {
      c.gripTimer -= dt;
      c.grip = clamp(1 - Math.max(0, c.gripTimer) / GRIP_ANIM_S, 0, 1);
      if (c.gripTimer <= 0) resolveGripAttempt();
      break;
    }
    case 'lifting': {
      maybeTriggerSlip('lift');
      if (c.phase !== 'lifting') break; // a slip this tick already moved us to 'returning'
      c.z = Math.min(RAIL_Z, c.z + CLAW_LIFT_SPEED * dt);
      if (c.z >= RAIL_Z) { c.z = RAIL_Z; beginCarry(); }
      break;
    }
    case 'carrying': {
      maybeTriggerSlip('carry');
      if (c.phase !== 'carrying') break;
      { // eslint-friendly block scope for locals
        const dx = CHUTE.x - c.x;
        const dy = CHUTE.y - c.y;
        const dist = Math.hypot(dx, dy);
        const step = CLAW_CARRY_SPEED * dt;
        if (dist <= step || dist < 0.05) { c.x = CHUTE.x; c.y = CHUTE.y; beginRelease(); } else {
          c.x += (dx / dist) * step;
          c.y += (dy / dist) * step;
        }
      }
      break;
    }
    case 'releasing': {
      c.releaseTimer -= dt;
      c.grip = clamp(Math.max(0, c.releaseTimer) / RELEASE_ANIM_S, 0, 1);
      if (c.releaseTimer <= 0) finishRelease();
      break;
    }
    case 'returning': {
      c.z = Math.min(RAIL_Z, c.z + CLAW_LIFT_SPEED * dt);
      c.grip = lerpTowards(c.grip, 0, dt * 6);
      if (c.z >= RAIL_Z) { c.z = RAIL_Z; c.phase = 'idle'; maybeEndRun(); }
      break;
    }
    default: break;
  }

  if (c.heldUid) {
    const held = prizeByUid(c.heldUid);
    if (held) {
      held.x = c.x;
      held.y = c.y;
      held.z = Math.max(0, c.z - PRIZE_HANG_OFFSET);
    }
  }
}

function stepFallingPrizes(dt) {
  for (const p of state.prizes) {
    if (p.state === 'falling') stepFallingPrize(p, dt);
  }
}

function tick(dtMs) {
  const dt = Math.min(0.05, dtMs / 1000);
  if (state.chuteGlowMs > 0) state.chuteGlowMs = Math.max(0, state.chuteGlowMs - dtMs);
  if (state.mode === 'play') {
    stepClaw(dt);
    stepFallingPrizes(dt);
  }
  updateDropAvailability();
}

function updateDropAvailability() {
  dropBtn.disabled = !(state.mode === 'play' && state.claw.phase === 'idle' && state.credits > 0);
}

/* ------------------------------------------------------------------------ *
 * Run lifecycle
 * ------------------------------------------------------------------------ */
function resetRun() {
  state.credits = CREDITS_START;
  state.score = 0;
  state.prizesWon = 0;
  state.dropsUsed = 0;
  state.isNewBest = false;
  state.prizes = scatterPrizes(PRIZE_COUNT);
  Object.assign(state.claw, {
    x: HOME.x,
    y: HOME.y,
    z: RAIL_Z,
    grip: 0,
    phase: 'idle',
    heldUid: null,
    dropTargetUid: null,
    dropDist: Infinity,
    slip: { lift: null, carry: null },
  });
  state.chuteGlowMs = 0;
  state.mode = 'play';
  updateHud();
  overlay.hidden = true;
}

function maybeEndRun() {
  if (state.mode === 'play' && state.credits <= 0) finishRun();
}

function finishRun() {
  state.mode = 'results';
  state.isNewBest = state.score > state.best;
  if (state.isNewBest) { state.best = state.score; persistBest(); }
  sfx.play('die');
  renderResults();
  showCard('results');
  overlay.hidden = false;
}

/* ------------------------------------------------------------------------ *
 * HUD + overlay text
 * ------------------------------------------------------------------------ */
function updateHud() {
  hudCredits.querySelector('strong').textContent = String(state.credits);
  hudScore.querySelector('strong').textContent = String(state.score);
  hudPrizes.querySelector('strong').textContent = String(state.prizesWon);
  updateDropAvailability();
}

function renderBestLines() {
  const line = state.best > 0 ? t(lang, 'bestLine', { best: state.best }) : '';
  $('bestLineStart').textContent = line;
  $('bestLineEnd').textContent = line;
}

function renderResults() {
  const won = state.prizesWon > 0;
  $('resultsTitle').textContent = t(lang, won ? 'resultsTitleWon' : 'resultsTitleEmpty');
  $('resultsScoreLine').textContent = t(lang, 'resultsScoreLine', { score: state.score });
  $('resultsPrizesLine').textContent = t(lang, 'resultsPrizesLine', { n: state.prizesWon });
  $('resultsAttemptsLine').textContent = t(lang, 'resultsAttemptsLine', { n: state.dropsUsed });
  $('newBestLine').hidden = !state.isNewBest;
  renderBestLines();
}

function showCard(which) {
  startCard.hidden = which !== 'start';
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
    { label: 'Claw Machine', summary: `Best ${state.best}` },
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
  if (state.mode === 'results') renderResults();
  rememberLang(lang);
}

/* ------------------------------------------------------------------------ *
 * Input — D-pad + Drop are hold/press buttons (Pointer-ish via touch+mouse,
 * same bindHold idiom as games/pulse-race's steer/gas/brake), plus arrow
 * keys / WASD + Space/Enter. Movement only has an effect while
 * state.claw.phase === 'idle' (see stepClaw) — matching a real cabinet,
 * where the joystick is inert once a drop is committed.
 * ------------------------------------------------------------------------ */
function bindHold(el, key) {
  const down = (e) => {
    e.preventDefault();
    input[key] = true;
    el.classList.add('is-down');
    sfx.unlock();
  };
  const up = (e) => {
    e.preventDefault();
    input[key] = false;
    el.classList.remove('is-down');
  };
  el.addEventListener('touchstart', down, { passive: false });
  el.addEventListener('touchend', up, { passive: false });
  el.addEventListener('touchcancel', up, { passive: false });
  el.addEventListener('mousedown', down);
  el.addEventListener('mouseup', up);
  el.addEventListener('mouseleave', up);
}

function bindPress(el, fn) {
  const handler = (e) => {
    e.preventDefault();
    sfx.unlock();
    fn();
  };
  el.addEventListener('touchstart', handler, { passive: false });
  el.addEventListener('mousedown', handler);
}

const KEY_LEFT = ['ArrowLeft', 'a', 'A'];
const KEY_RIGHT = ['ArrowRight', 'd', 'D'];
const KEY_FAR = ['ArrowUp', 'w', 'W'];
const KEY_NEAR = ['ArrowDown', 's', 'S'];

function onKeyDown(e) {
  if (KEY_LEFT.includes(e.key)) { input.left = true; e.preventDefault(); }
  else if (KEY_RIGHT.includes(e.key)) { input.right = true; e.preventDefault(); }
  else if (KEY_FAR.includes(e.key)) { input.far = true; e.preventDefault(); }
  else if (KEY_NEAR.includes(e.key)) { input.near = true; e.preventDefault(); }
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); sfx.unlock(); beginDrop(); return; }
  else return;
  sfx.unlock();
}

function onKeyUp(e) {
  if (KEY_LEFT.includes(e.key)) input.left = false;
  else if (KEY_RIGHT.includes(e.key)) input.right = false;
  else if (KEY_FAR.includes(e.key)) input.far = false;
  else if (KEY_NEAR.includes(e.key)) input.near = false;
}

/* ------------------------------------------------------------------------ *
 * Main loop
 * ------------------------------------------------------------------------ */
let lastNow = performance.now();
function loop(now) {
  const dt = Math.min(50, now - lastNow); // clamp so a tab-hidden hiccup can't cause a huge catch-up jump
  lastNow = now;
  tick(dt);
  drawFrame(ctx, state);
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------------ */
function init() {
  state.best = loadBest();
  state.prizes = scatterPrizes(PRIZE_COUNT); // populate the scene behind the start card
  applyLang(lang);
  updateHud();
  showCard('start');
  drawFrame(ctx, state);

  bindHold($('btnLeft'), 'left');
  bindHold($('btnRight'), 'right');
  bindHold($('btnFar'), 'far');
  bindHold($('btnNear'), 'near');
  bindPress(dropBtn, beginDrop);

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  $('btnStart').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); resetRun(); });
  $('btnPlayAgain').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); resetRun(); });

  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });

  // Debug/test hook — harmless in normal use, lets the harness (and
  // devtools) inspect live state, drive the claw without real-time input,
  // and verify the grip/slip probability curves statistically. Same
  // convention as games/paintball's window.OGH_PAINTBALL.
  window.OGH_CLAW_MACHINE = {
    state,
    input,
    debugForce,
    CONFIG: {
      CREDITS_START, PRIZE_COUNT, CLAW_MOVE_SPEED, CLAW_DROP_SPEED, CLAW_LIFT_SPEED,
      CLAW_CARRY_SPEED, GRIP_ANIM_S, RELEASE_ANIM_S,
    },
    PIT: {
      PIT_X_MIN, PIT_X_MAX, PIT_Y_NEAR, PIT_Y_FAR, RAIL_Z, PIT_FLOOR_Z, CHUTE,
      CLAW_X_MIN, CLAW_X_MAX, CLAW_Y_MIN, CLAW_Y_MAX,
    },
    PRIZE_TYPES,
    project,
    depthScale,
    gripChance,
    slipChance,
    grabRadiusFor,
    moveClawTo(x, y) {
      state.claw.x = clamp(x, CLAW_X_MIN, CLAW_X_MAX);
      state.claw.y = clamp(y, CLAW_Y_MIN, CLAW_Y_MAX);
    },
    beginDrop,
    tick,
    startRun: resetRun,
    finishRun,
    prizeByUid,
    nearestPrizeAt: (x, y) => nearestPrizeAt(state.prizes, x, y),
    rescatterPrizes(n) { state.prizes = scatterPrizes(n ?? PRIZE_COUNT); },
    /** Add a prize at an exact known (x,y,z) — for controlled-distance grip
     * testing without relying on the random scatter. Returns the prize. */
    addTestPrize(typeId, x, y, z = 0) {
      const type = PRIZE_TYPES[typeId] ? typeId : 'ball';
      const p = {
        uid: `test${Math.random().toString(36).slice(2, 9)}`,
        type,
        x,
        y,
        z,
        rot: 0,
        state: 'resting',
        vx: 0,
        vy: 0,
        vz: 0,
        bounces: 0,
      };
      state.prizes.push(p);
      return p;
    },
    /** Run N independent grip rolls at a fixed distance/type through the
     * SAME gripChance() production code used by resolveGripAttempt, tallying
     * empirical success rate — a real statistical trial, not just reading
     * the deterministic curve once. */
    runGripTrials(dist, typeId, n = 400) {
      const type = PRIZE_TYPES[typeId] || PRIZE_TYPES.ball;
      const chance = gripChance(dist, type);
      let successes = 0;
      for (let i = 0; i < n; i++) if (Math.random() < chance) successes++;
      return { successes, n, rate: successes / n, chance };
    },
    /** Fast-forward the claw's current in-progress sequence to completion
     * (phase returns to 'idle') without waiting real animation time. */
    fastForward(maxSteps = 4000) {
      let steps = 0;
      const startScore = state.score;
      const startPrizes = state.prizesWon;
      const startCredits = state.credits;
      while (state.claw.phase !== 'idle' && steps < maxSteps) { tick(16); steps++; }
      return {
        steps,
        phase: state.claw.phase,
        scoreDelta: state.score - startScore,
        prizesDelta: state.prizesWon - startPrizes,
        creditsDelta: state.credits - startCredits,
      };
    },
    /** One full simulated drop at (x,y) run to completion via fastForward
     * (temporarily topping up credits by 1 if needed, refunded after) — for
     * end-to-end verification of the whole grab/lift/carry/deliver pipeline,
     * independent of runGripTrials' isolated probability-curve trials. */
    simulateDrop(x, y) {
      if (state.mode !== 'play') resetRun();
      if (state.claw.phase !== 'idle') this.fastForward();
      let creditBump = 0;
      if (state.credits <= 0) { state.credits = 1; creditBump = 1; }
      this.moveClawTo(x, y);
      const target = nearestPrizeAt(state.prizes, state.claw.x, state.claw.y);
      beginDrop();
      const result = this.fastForward();
      if (creditBump) state.credits += creditBump;
      return {
        targetType: target ? target.prize.type : null,
        targetUid: target ? target.prize.uid : null,
        dist: target ? target.dist : Infinity,
        delivered: result.prizesDelta > 0,
        ...result,
      };
    },
  };
}

init();
