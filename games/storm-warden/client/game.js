/**
 * Storm Warden — atmospheric precision timing-and-placement game (OGH, solo).
 *
 * A silhouetted village sleeps at the bottom of a rainy night sky. A wild
 * storm periodically threatens a building: a charge flickers to life above
 * its roof and builds toward a peak over a short, fair telegraph window
 * (see lightning.js's difficultyAt/createThreat/advanceThreat — a pure,
 * dt-accumulator charge model, never wall-clock, so it's frame-exact
 * testable). Tap/click that building before the charge peaks to cast a
 * controlled bolt: it arcs safely to the village's grounding spire and the
 * roof stays lit. Closer to peak = higher timing-precision score (Early /
 * Good / Perfect, see lightning.js's scoreForCharge/ratingForCharge) but
 * more risk; tap the wrong building, or let the charge peak untouched, and
 * the wild bolt strikes home — the building goes dark and scorched for the
 * rest of the session. Survive until dawn (a fixed session duration) or
 * lose too many buildings and the storm wins either way, at a results
 * screen with a local high score (OGHProfile, same convention as
 * games/pop-the-bugs and games/void-drift).
 *
 * Module split: lightning.js is the pure "lightning domain" (threat
 * lifecycle, difficulty ramp, scoring curve, the midpoint-displacement bolt
 * geometry + glow renderer); village.js is the pure building/skyline data
 * model (silhouette profiles, windows, the spire, hit-testing by X);
 * rain.js is the pure two-layer raindrop particle system. None of the three
 * touch the DOM or hold game state — this file owns state, the spawner,
 * scoring, input, HUD, i18n and every ctx.* draw call (the render() at the
 * bottom is the only place pixels actually get pushed to the canvas).
 *
 * RTL note: the storm scene is a fixed spatial arrangement (village order,
 * number-key mapping, rain direction), not reading-order text, and never
 * mirrors — only the DOM chrome (header/cards/hint) flips for Arabic (see
 * i18n.js). The stage is dir="ltr" in the markup; ctx.direction is forced
 * to 'ltr' here as a second guard, same precedent as void-drift/ray-maze.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import {
  SESSION_DURATION_MS, LOSS_LIMIT, BUILDING_COUNT,
  difficultyAt, createThreat, advanceThreat, ratingForCharge, scoreForCharge,
  generateBoltPath, generateBranches, strokeBoltPath,
} from './lightning.js';
import {
  buildVillage, layoutVillage, buildingAtX, markStruck,
} from './village.js';
import {
  createRainLayer, rainCountFor, updateRain, drawRain,
} from './rain.js';

const $ = (id) => document.getElementById(id);
const GAME_ID = 'storm-warden';
const SPIRE_INDEX = 3; // which of the 7 village slots is the non-targetable grounding spire

/* ------------------------------------------------------------------------ *
 * Palette — deliberately moodier/more desaturated (deep indigo/near-black)
 * than the hub's usual bright neon, so the bolts and the village's lit
 * windows read as the one bright accent against a dark, rainy backdrop.
 * ------------------------------------------------------------------------ */
const COLOR_SKY_TOP = '#05060d';
const COLOR_SKY_MID = '#0b1030';
const COLOR_SKY_BOTTOM = '#161c3f';
const COLOR_RAIN = 'rgb(176,190,224)';
const COLOR_BUILDING = '#0b0e1c';
const COLOR_BUILDING_RIM_CALM = '#8ca0dc';
const COLOR_BUILDING_RIM_DANGER = '#ff7a59';
const COLOR_WINDOW_LIT = '#ffcf7d';
const COLOR_WINDOW_EMBER = '#ffb27a';
const COLOR_STRUCK_FILL = '#1c130f';
const COLOR_CHARGE_LOW = '#5a6bb0';
const COLOR_CHARGE_HIGH = '#e8fbff';
const COLOR_BOLT_CORE = '#f2fdff';
const COLOR_BOLT_GLOW = '#8fe8ff';
const COLOR_STRIKE_CORE = '#fff3e6';
const COLOR_STRIKE_GLOW = '#ff7a4d';
const COLOR_FIZZLE = '#7b88ab';
const COLOR_SPIRE = '#93a0c9';
const COLOR_SPIRE_TIP = '#bfe9ff';

const STRUCK_FADE_MS = 500;

const RATING_LABEL_KEY = { early: 'ratingEarly', good: 'ratingGood', perfect: 'ratingPerfect' };
const RATING_COLOR = { early: '#8fa3e0', good: '#8fe8ff', perfect: '#ffcf7d' };

function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function lerp(a, b, tt) { return a + (b - a) * tt; }
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpColor(a, b, tt) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * tt);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * tt);
  const bch = Math.round(ca[2] + (cb[2] - ca[2]) * tt);
  return `rgb(${r},${g},${bch})`;
}

/* ------------------------------------------------------------------------ *
 * Canvas — sized dynamically to fill the stage, same approach as
 * games/void-drift's view canvas.
 * ------------------------------------------------------------------------ */
const canvas = $('view');
const ctx = canvas.getContext('2d');
ctx.direction = 'ltr';
let W = 800;
let H = 600;

let village = null;
let rainBack = [];
let rainFront = [];

function newVillage() {
  village = buildVillage(BUILDING_COUNT, SPIRE_INDEX);
  layoutVillage(village, W, H);
}

function resize() {
  const r = canvas.getBoundingClientRect();
  W = Math.max(280, Math.round(r.width));
  H = Math.max(240, Math.round(r.height));
  canvas.width = W;
  canvas.height = H;
  if (village) layoutVillage(village, W, H);
  rainBack = createRainLayer(W, H, rainCountFor(W, H, 'back'), 'back');
  rainFront = createRainLayer(W, H, rainCountFor(W, H, 'front'), 'front');
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
  mode: 'title', // title | play | results
  score: 0,
  best: 0,
  isNewBest: false,
  buildingsLost: 0,
  successfulCasts: 0,
  elapsedMs: 0,
  spawnAcc: 0,
  threats: [],
  effects: [],
  floaters: [],
  shake: 0,
  flashAlpha: 0,
  pulseCooldownMs: 0,
  ambientFlash: null,
  nextAmbientAt: 5000 + Math.random() * 6000,
  outcome: null, // 'won' | 'lost'
};

/* ------------------------------------------------------------------------ *
 * Threat helpers — anchoring, filament flicker, spawn scheduling
 * ------------------------------------------------------------------------ */
function filamentGapPx() { return Math.min(150, Math.max(55, H * 0.17)); }

function threatAnchorFor(b) {
  return { x: b.apexX, y: b.apexY - filamentGapPx() };
}

function updateThreatFilament(th, dtMs) {
  th.nextFlickerAt = (th.nextFlickerAt || 0) - dtMs;
  if (th.filamentPath && th.nextFlickerAt > 0) return;
  const b = village.buildings[th.buildingIndex];
  if (!b) return;
  const anchor = threatAnchorFor(b);
  const gap = filamentGapPx();
  const tendrilLen = th.charge * (gap - 16);
  th.anchorX = anchor.x;
  th.anchorY = anchor.y;
  th.filamentPath = generateBoltPath(
    anchor.x, anchor.y, anchor.x, anchor.y + tendrilLen,
    { depth: 2 + Math.min(2, Math.floor(th.charge * 3)), roughness: 0.4 },
  );
  th.nextFlickerAt = lerp(150, 45, th.charge);
}

function freeBuildings() {
  return village.buildings.filter(
    (b) => !b.struck && !state.threats.some((th) => th.buildingIndex === b.index),
  );
}

function trySpawnThreat(elapsedSec) {
  const diff = difficultyAt(elapsedSec);
  if (state.threats.length >= diff.maxConcurrent) return;
  const free = freeBuildings();
  if (!free.length) return;
  const b = free[(Math.random() * free.length) | 0];
  const jitter = 0.85 + Math.random() * 0.3;
  const th = createThreat(b.index, Math.max(650, diff.buildDurationMs * jitter));
  th.filamentPath = null;
  th.nextFlickerAt = 0;
  th.phase = Math.random() * Math.PI * 2;
  state.threats.push(th);
}

/* ------------------------------------------------------------------------ *
 * Casting — input resolves to a building index; a hit on the building with
 * an active charging threat is a save, anything else is a harmless waste.
 * ------------------------------------------------------------------------ */
function spawnFloater(x, y, text, color) {
  state.floaters.push({
    x, y, text, color, ageMs: 0, life: 900,
  });
}

function spawnCastEffect(b) {
  const anchor = threatAnchorFor(b);
  const spire = village.spire;
  const opts = { depth: 5, roughness: 0.45 };
  const path1 = generateBoltPath(spire.tipX, spire.tipY, anchor.x, anchor.y, opts);
  const path2 = generateBoltPath(spire.tipX, spire.tipY, anchor.x, anchor.y, opts);
  const branches = generateBranches(path1, { count: 3 });
  state.effects.push({
    type: 'cast', paths: [path1, path2], branches, ageMs: 0, life: 260,
  });
}

function spawnStrikeEffect(b) {
  const anchor = threatAnchorFor(b);
  const opts = { depth: 5, roughness: 0.55 };
  const path1 = generateBoltPath(anchor.x, anchor.y, b.apexX, b.apexY, opts);
  const path2 = generateBoltPath(anchor.x, anchor.y, b.apexX, b.apexY, opts);
  const branches = generateBranches(path1, { count: 4 });
  state.effects.push({
    type: 'strike', paths: [path1, path2], branches, ageMs: 0, life: 340,
  });
}

function spawnFizzleEffect(b) {
  const ex = b.apexX + (Math.random() - 0.5) * 20;
  const ey = b.apexY - 30 - Math.random() * 16;
  const path = generateBoltPath(b.apexX, b.apexY - 6, ex, ey, { depth: 2, roughness: 0.7 });
  state.effects.push({
    type: 'fizzle', paths: [path], branches: [], ageMs: 0, life: 160,
  });
}

function spawnSmoke(b) {
  const n = 6 + ((Math.random() * 4) | 0);
  for (let i = 0; i < n; i++) {
    b.smoke.push({
      x: b.apexX + (Math.random() - 0.5) * b.w * 0.4,
      y: b.apexY,
      vx: (Math.random() - 0.5) * 14,
      vy: -18 - Math.random() * 22,
      life: 1400 + Math.random() * 1200,
      age: 0,
      r: 4 + Math.random() * 5,
    });
  }
}

function updateHudScore() { $('hudScoreVal').textContent = String(state.score); }
function updateHudSaved() {
  const saved = BUILDING_COUNT - state.buildingsLost;
  $('hudSavedVal').textContent = `${saved}/${BUILDING_COUNT}`;
}
function updateHudTime() {
  const remaining = Math.max(0, Math.ceil((SESSION_DURATION_MS - state.elapsedMs) / 1000));
  $('hudTimeVal').textContent = String(remaining);
}

function resolveSuccess(b, th) {
  const rating = ratingForCharge(th.charge);
  const points = scoreForCharge(th.charge);
  state.score += points;
  state.successfulCasts += 1;
  spawnCastEffect(b);
  spawnFloater(b.apexX, b.apexY - 16, `${t(lang, RATING_LABEL_KEY[rating])} +${points}`, RATING_COLOR[rating]);
  sfx.play('zap');
  updateHudScore();
}

function resolveWasted(b) {
  spawnFizzleEffect(b);
  sfx.play('screech');
}

function resolveStrike(th) {
  const b = village.buildings[th.buildingIndex];
  if (!b) return;
  markStruck(b);
  state.buildingsLost += 1;
  spawnStrikeEffect(b);
  spawnSmoke(b);
  spawnFloater(b.apexX, b.apexY - 10, t(lang, 'struckFloater'), '#ff8a5c');
  state.shake = 14;
  state.flashAlpha = 0.5;
  sfx.play('thunder');
  updateHudSaved();
}

/** Resolve a cast attempt at a specific building index — the one function
 * both pointer input and the keyboard fallback (and the test hook) funnel
 * through, so "which building did this tap mean" is decided in exactly one
 * place. */
function attemptCast(buildingIndex) {
  if (state.mode !== 'play') return;
  const b = village.buildings[buildingIndex];
  if (!b) return;
  const idx = state.threats.findIndex((th) => th.buildingIndex === buildingIndex);
  if (idx === -1) {
    resolveWasted(b);
    return;
  }
  const th = state.threats[idx];
  state.threats.splice(idx, 1);
  resolveSuccess(b, th);
}

function castAtX(x) {
  const b = buildingAtX(village, W, x);
  if (!b) return; // tapped the spire's own column, or off the edge: a harmless no-op
  attemptCast(b.index);
}

/* ------------------------------------------------------------------------ *
 * Session lifecycle
 * ------------------------------------------------------------------------ */
function startSession() {
  state.score = 0;
  state.buildingsLost = 0;
  state.successfulCasts = 0;
  state.elapsedMs = 0;
  state.spawnAcc = 0;
  state.threats = [];
  state.effects = [];
  state.floaters = [];
  state.isNewBest = false;
  state.outcome = null;
  state.shake = 0;
  state.flashAlpha = 0;
  state.pulseCooldownMs = 0;
  newVillage();
  state.mode = 'play';
  updateHudScore();
  updateHudSaved();
  updateHudTime();
  overlay.hidden = true;
}

function endSession(outcome) {
  state.mode = 'results';
  state.outcome = outcome;
  state.isNewBest = state.score > state.best;
  if (state.isNewBest) {
    state.best = state.score;
    persistBest();
  }
  startCard.hidden = true;
  resultCard.hidden = false;
  overlay.hidden = false;
  renderResult();
  sfx.play(outcome === 'won' ? 'win' : 'die');
}

/* ------------------------------------------------------------------------ *
 * Per-frame update
 * ------------------------------------------------------------------------ */
function updateEffects(dtMs) {
  for (let i = state.effects.length - 1; i >= 0; i--) {
    const ef = state.effects[i];
    ef.ageMs += dtMs;
    if (ef.ageMs >= ef.life) state.effects.splice(i, 1);
  }
}

function updateFloaters(dtMs) {
  for (let i = state.floaters.length - 1; i >= 0; i--) {
    const f = state.floaters[i];
    f.ageMs += dtMs;
    if (f.ageMs >= f.life) state.floaters.splice(i, 1);
  }
}

function updateStruckBuildings(dtMs) {
  if (!village) return;
  for (const b of village.buildings) {
    if (b.struck && b.struckMs < STRUCK_FADE_MS) b.struckMs += dtMs;
    if (b.smoke.length) {
      const dt = dtMs / 1000;
      for (let i = b.smoke.length - 1; i >= 0; i--) {
        const p = b.smoke[i];
        p.age += dtMs;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy -= 6 * dt;
        if (p.age >= p.life) b.smoke.splice(i, 1);
      }
    }
  }
}

function updateAmbientFlicker(dtMs) {
  if (state.ambientFlash) {
    state.ambientFlash.ageMs += dtMs;
    if (state.ambientFlash.ageMs >= state.ambientFlash.life) state.ambientFlash = null;
    return;
  }
  state.nextAmbientAt -= dtMs;
  if (state.nextAmbientAt <= 0) {
    state.ambientFlash = { ageMs: 0, life: 260 + Math.random() * 160 };
    state.nextAmbientAt = 7000 + Math.random() * 9000;
  }
}

function maybeChargePulse(dtMs) {
  if (state.pulseCooldownMs > 0) state.pulseCooldownMs -= dtMs;
  if (!state.threats.length) return;
  let maxC = 0;
  for (const th of state.threats) maxC = Math.max(maxC, th.charge);
  if (maxC < 0.12 || state.pulseCooldownMs > 0) return;
  sfx.play('tick');
  state.pulseCooldownMs = lerp(420, 110, maxC);
}

function update(dt) {
  const dtMs = dt * 1000;
  updateRain(rainBack, dt, W, H, 'back');
  updateRain(rainFront, dt, W, H, 'front');
  updateEffects(dtMs);
  updateFloaters(dtMs);
  updateStruckBuildings(dtMs);
  updateAmbientFlicker(dtMs);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
  if (state.flashAlpha > 0) state.flashAlpha = Math.max(0, state.flashAlpha - dt * 3.2);

  if (state.mode !== 'play') return;

  state.elapsedMs += dtMs;
  const elapsedSec = state.elapsedMs / 1000;

  for (let i = state.threats.length - 1; i >= 0; i--) {
    const th = state.threats[i];
    const justPeaked = advanceThreat(th, dtMs);
    updateThreatFilament(th, dtMs);
    if (justPeaked) {
      state.threats.splice(i, 1);
      resolveStrike(th);
    }
  }
  maybeChargePulse(dtMs);

  const diff = difficultyAt(elapsedSec);
  state.spawnAcc += dtMs;
  while (state.spawnAcc >= diff.spawnIntervalMs) {
    state.spawnAcc -= diff.spawnIntervalMs;
    trySpawnThreat(elapsedSec);
  }

  updateHudTime();

  if (state.buildingsLost >= LOSS_LIMIT) {
    endSession('lost');
  } else if (state.elapsedMs >= SESSION_DURATION_MS) {
    endSession('won');
  }
}

/* ------------------------------------------------------------------------ *
 * Rendering — layered back-to-front: sky, ambient flicker, back rain,
 * village, threat glows, bolt effects, smoke, front rain, floating text.
 * The two rain layers straddle the village so the scene reads as looking
 * *through* rain at the storm, not rain floating flatly on top of it.
 * ------------------------------------------------------------------------ */
function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COLOR_SKY_TOP);
  g.addColorStop(0.55, COLOR_SKY_MID);
  g.addColorStop(1, COLOR_SKY_BOTTOM);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawAmbientFlicker() {
  if (!state.ambientFlash) return;
  const p = clamp01(state.ambientFlash.ageMs / state.ambientFlash.life);
  const alpha = Math.sin(p * Math.PI) * 0.09;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#cfe0ff';
  ctx.fillRect(0, 0, W, H * 0.72);
  ctx.restore();
}

function dangerLevelFor(b) {
  let m = 0;
  for (const th of state.threats) if (th.buildingIndex === b.index) m = Math.max(m, th.charge);
  return m;
}

function drawBuilding(b) {
  const struck = b.struck;
  const dangerT = struck ? 0 : dangerLevelFor(b);

  ctx.beginPath();
  b.outline.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = struck ? COLOR_STRUCK_FILL : COLOR_BUILDING;
  ctx.fill();

  let rimColor = COLOR_BUILDING_RIM_CALM;
  if (struck) rimColor = 'rgba(120,70,50,0.4)';
  else if (dangerT > 0) rimColor = lerpColor(COLOR_BUILDING_RIM_CALM, COLOR_BUILDING_RIM_DANGER, dangerT);
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 1.4;
  if (dangerT > 0.15 && !struck) {
    ctx.shadowColor = COLOR_BUILDING_RIM_DANGER;
    ctx.shadowBlur = 4 + dangerT * 16;
  } else {
    ctx.shadowBlur = 0;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  const now = performance.now();
  for (const w of b.windowRects) {
    let alpha = 1;
    let color = COLOR_WINDOW_LIT;
    if (struck) {
      alpha = Math.max(0, 1 - b.struckMs / STRUCK_FADE_MS);
      color = COLOR_WINDOW_EMBER;
      if (alpha <= 0.02) continue;
    }
    const shimmer = 0.82 + 0.18 * Math.sin(now * 0.0025 + w.flicker);
    ctx.globalAlpha = alpha * shimmer;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.fillRect(w.x, w.y, w.w, w.h);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawSpire() {
  const s = village.spire;
  ctx.save();
  ctx.fillStyle = COLOR_SPIRE;
  ctx.strokeStyle = COLOR_SPIRE;
  ctx.lineWidth = 2;
  // The thin rod is the top ~30% of the spire (at least 20px); the tapered
  // base structure fills the rest, so it reads as "a tower topped with a
  // distinct lightning rod" rather than a plain pointed roof.
  const rodBaseY = s.tipY + Math.max(20, s.h * 0.3);
  ctx.beginPath();
  ctx.moveTo(s.x, s.baseY);
  ctx.lineTo(s.x + s.w / 2, rodBaseY);
  ctx.lineTo(s.x + s.w, s.baseY);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s.tipX, rodBaseY);
  ctx.lineTo(s.tipX, s.tipY);
  ctx.stroke();
  const pulse = 0.65 + 0.35 * Math.sin(performance.now() * 0.0032);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = COLOR_SPIRE_TIP;
  ctx.shadowColor = COLOR_SPIRE_TIP;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(s.tipX, s.tipY, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawVillage() {
  for (const b of village.buildings) drawBuilding(b);
  drawSpire();
}

function drawThreat(th) {
  const b = village.buildings[th.buildingIndex];
  if (!b) return;
  const c = th.charge;
  const flicker = 0.55 + 0.45 * Math.sin(performance.now() * (0.006 + c * 0.02) + th.phase);
  const alpha = Math.max(0.4, flicker);
  const core = lerpColor(COLOR_CHARGE_LOW, COLOR_CHARGE_HIGH, c);
  if (th.filamentPath) {
    strokeBoltPath(ctx, th.filamentPath, {
      color: core, glowColor: core, width: 1.3 + c * 1.6, glow: 8 + c * 18, alpha,
    });
  }
  const r = 3 + c * 11;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = core;
  ctx.shadowColor = core;
  ctx.shadowBlur = 10 + c * 22;
  ctx.beginPath();
  ctx.arc(th.anchorX ?? b.apexX, th.anchorY ?? (b.apexY - filamentGapPx()), r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEffects() {
  for (const ef of state.effects) {
    const path = ef.paths[Math.floor(ef.ageMs / 45) % ef.paths.length];
    const p = ef.ageMs / ef.life;
    const alpha = p < 0.2 ? 1 : Math.max(0, 1 - (p - 0.2) / 0.8);
    let color;
    let glow;
    let width;
    let glowSize;
    if (ef.type === 'cast') { color = COLOR_BOLT_CORE; glow = COLOR_BOLT_GLOW; width = 2.6; glowSize = 20; }
    else if (ef.type === 'strike') { color = COLOR_STRIKE_CORE; glow = COLOR_STRIKE_GLOW; width = 3; glowSize = 24; }
    else { color = COLOR_FIZZLE; glow = COLOR_FIZZLE; width = 1.4; glowSize = 8; }
    strokeBoltPath(ctx, path, {
      color, glowColor: glow, width, glow: glowSize, alpha,
    });
    for (const br of ef.branches) {
      strokeBoltPath(ctx, br, {
        color, glowColor: glow, width: width * 0.6, glow: glowSize * 0.6, alpha: alpha * 0.8,
      });
    }
  }
}

function drawSmoke() {
  ctx.save();
  for (const b of village.buildings) {
    for (const p of b.smoke) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life) * 0.28;
      ctx.fillStyle = '#2b2b33';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawFloaters() {
  ctx.save();
  ctx.font = '700 15px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  for (const f of state.floaters) {
    const p = f.ageMs / f.life;
    const alpha = p < 0.15 ? p / 0.15 : Math.max(0, 1 - (p - 0.15) / 0.85);
    const y = f.y - p * 36;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 8;
    ctx.fillText(f.text, f.x, y);
  }
  ctx.restore();
}

function render() {
  if (!village) return;
  const shx = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const shy = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.translate(shx, shy);

  drawSky();
  drawAmbientFlicker();
  drawRain(ctx, rainBack, COLOR_RAIN);
  drawVillage();
  for (const th of state.threats) drawThreat(th);
  drawEffects();
  drawSmoke();
  drawRain(ctx, rainFront, COLOR_RAIN);
  drawFloaters();

  ctx.restore();

  if (state.flashAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.55, state.flashAlpha);
    ctx.fillStyle = '#fff3e6';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

/* ------------------------------------------------------------------------ *
 * High score (local only, via OGHProfile — same convention as pop-the-bugs
 * and void-drift)
 * ------------------------------------------------------------------------ */
function loadBest() {
  const saved = OGHProfile.getProgress(GAME_ID);
  const n = Number(saved?.best);
  return Number.isFinite(n) ? n : 0;
}

function persistBest() {
  const saved = BUILDING_COUNT - state.buildingsLost;
  OGHProfile.saveProgress(
    GAME_ID,
    { best: state.best },
    { label: 'Storm Warden', summary: `Best ${state.best} · ${saved}/${BUILDING_COUNT} saved` },
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
  $('legendEarlyTxt').textContent = t(lang, 'legendEarlyTxt');
  $('legendGoodTxt').textContent = t(lang, 'legendGoodTxt');
  $('legendPerfectTxt').textContent = t(lang, 'legendPerfectTxt');
}

function renderBestLines() {
  const line = `${t(lang, 'bestLabel')}: ${state.best}`;
  $('bestLineStart').textContent = line;
  $('bestLineEnd').textContent = line;
}

function renderResult() {
  const total = BUILDING_COUNT;
  const saved = total - state.buildingsLost;
  const won = state.outcome === 'won';
  $('resultTitle').textContent = t(lang, won ? 'resultWinTitle' : 'resultLoseTitle');
  $('resultSub').textContent = t(lang, won ? 'resultWinSub' : 'resultLoseSub', { saved, total });
  $('finalScoreLine').textContent = `${t(lang, 'finalScoreLabel')}: ${state.score}`;
  $('savedLine').textContent = t(lang, 'savedLine', { saved, total });
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
  updateHudSaved();
  if (state.mode === 'results') renderResult();
  rememberLang(lang);
  // Header height can shift with language (back-link length, whether the
  // HUD/lang row wraps) — re-measure so the canvas keeps filling exactly
  // what's left, on every language.
  resize();
}

/* ------------------------------------------------------------------------ *
 * Input — Pointer Events on the canvas (tap/click resolves to a building by
 * X position via village.js's buildingAtX), plus a keyboard fallback (keys
 * 1-6 cast on the matching building, left to right) for desktop.
 * ------------------------------------------------------------------------ */
function onCanvasPointerDown(e) {
  sfx.unlock();
  if (state.mode !== 'play') return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  castAtX(x);
}

function setupInput() {
  canvas.addEventListener('pointerdown', onCanvasPointerDown);
  window.addEventListener('keydown', (e) => {
    if (state.mode !== 'play') return;
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= BUILDING_COUNT) {
      sfx.unlock();
      attemptCast(n - 1);
    }
  });
}

function setupButtons() {
  $('btnStart').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); startSession(); });
  $('btnAgain').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); startSession(); });
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
  newVillage(); // decorative village for the title screen (resize() ran before this existed, so it couldn't lay this out — newVillage() does its own layoutVillage() call)

  setupInput();
  setupButtons();
  applyLang(lang);
  updateHudScore();
  updateHudSaved();
  updateHudTime();

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });
  exposeTestHook();
}

/* ------------------------------------------------------------------------ *
 * Test / debug hook — lets the automation harness (and devtools) inspect
 * and drive the game deterministically. Same convention as
 * games/void-drift's window.OGH_VOID_DRIFT and games/pop-the-bugs's
 * window.OGH_POP_BUGS.
 * ------------------------------------------------------------------------ */
function exposeTestHook() {
  window.OGH_STORM_WARDEN = {
    state,
    get village() { return village; },
    get W() { return W; },
    get H() { return H; },
    BUILDING_COUNT,
    LOSS_LIMIT,
    SESSION_DURATION_MS,
    difficultyAt,
    scoreForCharge,
    ratingForCharge,
    attemptCast,
    castAtX,
    /** Force-spawn a deterministic threat on a building for testing
     * (bypasses the random spawner/cooldown), replacing any threat already
     * active there. `opts.buildDurationMs` overrides the difficulty-ramped
     * default so a test can pick an exact, predictable charge window. */
    forceThreat(buildingIndex, opts = {}) {
      const b = village.buildings[buildingIndex];
      if (!b || b.struck) return null;
      state.threats = state.threats.filter((th) => th.buildingIndex !== buildingIndex);
      const buildDurationMs = opts.buildDurationMs ?? difficultyAt(state.elapsedMs / 1000).buildDurationMs;
      const th = createThreat(buildingIndex, buildDurationMs);
      th.filamentPath = null;
      th.nextFlickerAt = 0;
      th.phase = Math.random() * Math.PI * 2;
      state.threats.push(th);
      return th;
    },
    startSession,
    endSession,
    /** Manually advance one frame by dtMs — the real loop() also just calls
     * update() every rAF tick, so driving it by hand exercises exactly the
     * same code path (useful when a background/inactive tab never receives
     * rAF callbacks at all, or for frame-exact deterministic testing). */
    tick(dtMs) { update(dtMs / 1000); },
  };
}

init();
