/**
 * Drop Smash — configure a drop (ball count, weight, spawn X), release it,
 * and watch real physics smash through the tower below. See physics.js for
 * the whole simulation (kept pure/DOM-free so it is directly steppable from
 * a test harness, the same discipline as games/siege-break and
 * games/billiards) and tower.js for the four layout configurations.
 *
 * This file owns everything physics.js/tower.js don't: canvas rendering
 * (Canvas 2D vector shapes with a neon glow — no bitmap assets), the
 * persistent config strip (ball count / weight / spawn-position drag),
 * sfx/HUD/i18n wiring, scoring, and local best-score persistence via
 * OGHProfile (same convention as games/pop-the-bugs / games/siege-break).
 *
 * mode: 'title' -> 'config' -> 'falling' -> 'settled' -> 'config' (loop).
 * Every transition INTO 'config' rebuilds a fully-intact tower instance from
 * scratch (see tower.js's buildTower doc comment) — a drop never inherits
 * damage from a previous one, so switching weight/tower or simply trying
 * again always compares against full hp. Physics only advances while
 * mode === 'falling', on a fixed 1/120s accumulator so the simulation is
 * frame-rate independent.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import { LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings } from './i18n.js';
import * as Physics from './physics.js';
import * as Tower from './tower.js';

const $ = (id) => document.getElementById(id);
const GAME_ID = 'drop-smash';
const sfx = createOghSfx();

/* ------------------------------------------------------------------------ *
 * Fixed internal resolution (matches the shared .ogh-game-canvas 0.72
 * portrait rule — CSS-scaled to fit, no per-frame resize bookkeeping).
 * ------------------------------------------------------------------------ */
const CANVAS_W = Tower.CANVAS_W; // 720
const CANVAS_H = Tower.CANVAS_H; // 1000

const PHYS_DT = 1 / 120;
const GLOBAL_SETTLE_HOLD = 0.4; // s of calm (on top of each ball's own rest snap) before a drop is "done"
const MAX_DROP_TIME = 10; // s hard cap per drop (safety; snap-to-rest should always beat this)

// Scoring.
const LAYER_POINTS = 80; // per broken platform
const DEPTH_POINTS = 25; // per row of depth reached
const EXIT_BONUS = 120; // any ball reaching all the way through
const CLEAR_BONUS = 250; // every platform in the tower broken this drop

/* ------------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------------ */
let lang = detectLang();

const state = {
  mode: 'title',
  towerIndex: 0,
  tower: null,
  world: null,
  ballCount: 1,
  weightTier: 'medium',
  spawnX: (Tower.PLAY_LEFT + Tower.PLAY_RIGHT) / 2,
  dragging: false,
  score: 0,
  best: 0,
  isNewBest: false,
  lastResult: null,
  settleTimer: 0,
  dropTime: 0,
  particles: [],
  shake: 0,
};

const now = () => performance.now();
const sfxGate = { bounce: 0, crack: 0, wall: 0, ballHit: 0, exit: 0, boom: 0 };
function gated(name, gapMs) {
  const t0 = now();
  if (t0 - sfxGate[name] < gapMs) return false;
  sfxGate[name] = t0; return true;
}
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/* ------------------------------------------------------------------------ *
 * DOM refs
 * ------------------------------------------------------------------------ */
const canvas = $('game');
const ctx = canvas.getContext('2d');
ctx.direction = 'ltr'; // never inherit page RTL for any canvas text

const overlay = $('overlay');
const controls = $('controls');
const hint = $('hint');
const cards = { start: $('startCard'), results: $('resultsCard') };

function showCard(which) {
  overlay.hidden = false;
  for (const k of Object.keys(cards)) cards[k].hidden = k !== which;
}

/* ------------------------------------------------------------------------ *
 * Profile (best-score persistence) — same OGHProfile convention as
 * games/pop-the-bugs / games/siege-break.
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
    { label: 'Drop Smash', summary: `Best ${state.best}` }
  );
}
function maybeNewBest() {
  if (state.score > state.best) {
    state.best = state.score;
    state.isNewBest = true;
    persistBest();
  } else {
    state.isNewBest = false;
  }
}

/* ------------------------------------------------------------------------ *
 * Tower lifecycle — every entry into 'config' gets a fresh, fully-intact
 * tower instance (see tower.js's buildTower doc comment for why).
 * ------------------------------------------------------------------------ */
function setControlsLocked(locked) {
  $('btnDrop').disabled = locked;
  $('hudTower').disabled = locked;
  document.querySelectorAll('.ds-opt-btn').forEach((b) => { b.disabled = locked; });
  controls.classList.toggle('is-locked', locked);
}

function buildFreshTower(id) {
  const tower = Tower.buildTower(id);
  state.tower = tower;
  state.towerIndex = Math.max(0, Tower.TOWERS.findIndex((td) => td.id === tower.id));
  state.world = null;
  state.mode = 'config';
  overlay.hidden = true;
  setControlsLocked(false);
  updateHud();
  renderHint();
}

/* ------------------------------------------------------------------------ *
 * Configuration controls.
 * ------------------------------------------------------------------------ */
function clampSpawnX(x) {
  const r = Physics.WEIGHTS[state.weightTier].r;
  return clamp(x, Tower.PLAY_LEFT + r, Tower.PLAY_RIGHT - r);
}
function clampSpawnXForCurrentTier() { state.spawnX = clampSpawnX(state.spawnX); }

function setBallCount(n) {
  state.ballCount = n;
  document.querySelectorAll('#ballGroup .ds-opt-btn').forEach((b) => {
    b.classList.toggle('is-active', Number(b.dataset.count) === n);
  });
}
function setWeightTier(tier) {
  if (!Physics.WEIGHTS[tier]) return;
  state.weightTier = tier;
  document.querySelectorAll('#weightGroup .ds-opt-btn').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.weight === tier);
  });
  clampSpawnXForCurrentTier();
}

/** Symmetric spawn-offset spread for a multi-ball drop, scaled to the
 * current tier's radius so balls never start overlapping regardless of
 * weight (a heavier/bigger ball needs more spacing than a light one). */
function spawnOffsets(count, r) {
  const spacing = r * 2 * 1.15;
  if (count <= 1) return [0];
  if (count === 2) return [-spacing / 2, spacing / 2];
  return [-spacing, 0, spacing];
}

/* ------------------------------------------------------------------------ *
 * Drop lifecycle.
 * ------------------------------------------------------------------------ */
function startDrop() {
  if (state.mode !== 'config') return false;
  const w = Physics.WEIGHTS[state.weightTier];
  const offsets = spawnOffsets(state.ballCount, w.r);
  const world = Physics.createWorld(state.tower);
  for (const off of offsets) {
    const x = clamp(state.spawnX + off, Tower.PLAY_LEFT + w.r, Tower.PLAY_RIGHT - w.r);
    Physics.addBall(world, Physics.createBall({ x, y: Tower.SPAWN_DROP_Y, tier: state.weightTier }));
  }
  state.world = world;
  state.mode = 'falling';
  state.settleTimer = 0;
  state.dropTime = 0;
  setControlsLocked(true);
  sfx.play('whoosh');
  renderHint();
  return true;
}

function physicsStep(dt) {
  const events = Physics.stepWorld(state.world, dt);

  let loudestBreak = 0;
  for (const e of events) {
    if (e.type === 'bounce') {
      if (gated('bounce', 70)) sfx.play('bounce');
    } else if (e.type === 'crack') {
      if (gated('crack', 90)) sfx.play('crack');
      spawnCrackPuff(e.x, e.y);
    } else if (e.type === 'break') {
      sfx.play('crumble');
      const big = e.plat.maxHp >= 1550; // tough/reinforced tiers
      spawnBreakBurst(e.x, e.y, e.plat.color, big ? 16 : 9);
      state.shake = Math.min(16, state.shake + e.plat.maxHp / 300);
      if (e.plat.maxHp > loudestBreak) loudestBreak = e.plat.maxHp;
    } else if (e.type === 'ballHit') {
      if (gated('ballHit', 60)) sfx.play('clack');
    } else if (e.type === 'wall') {
      if (gated('wall', 110)) sfx.play('bounce');
    } else if (e.type === 'exit') {
      if (gated('exit', 150)) sfx.play('land');
      spawnCrackPuff(e.ball.x, Tower.EXIT_Y);
    }
  }
  if (loudestBreak >= 1550 && gated('boom', 120)) sfx.play('boom');

  updateHud();

  if (Physics.allSettled(state.world)) state.settleTimer += dt;
  else state.settleTimer = 0;
  state.dropTime += dt;

  if (state.settleTimer > GLOBAL_SETTLE_HOLD || state.dropTime > MAX_DROP_TIME) finishDrop();
}

function finishDrop() {
  const platforms = state.tower.platforms;
  const totalPlatforms = platforms.length;
  const layersBroken = platforms.filter((p) => p.broken).length;
  const balls = state.world.balls;
  const deepestY = balls.length ? Math.max(...balls.map((b) => b.maxYReached)) : Tower.TOWER_TOP_Y;
  const depthRows = clamp(Math.floor((deepestY - Tower.TOWER_TOP_Y) / Tower.ROW_H) + 1, 0, Tower.ROW_COUNT);
  const anyExited = balls.some((b) => b.exited);
  const fullyCleared = totalPlatforms > 0 && layersBroken === totalPlatforms;
  const scoreGain = layersBroken * LAYER_POINTS + depthRows * DEPTH_POINTS
    + (anyExited ? EXIT_BONUS : 0) + (fullyCleared ? CLEAR_BONUS : 0);

  state.score += scoreGain;
  maybeNewBest();
  state.lastResult = { layersBroken, totalPlatforms, depthRows, anyExited, fullyCleared, scoreGain };
  state.mode = 'settled';

  renderResults();
  showCard('results');
  if (fullyCleared) sfx.play('win');
  else if (layersBroken > 0) sfx.play('pickup');
  else sfx.play('tick');
  updateHud();
}

function onContinue() {
  sfx.unlock(); sfx.play('tap');
  const r = state.lastResult;
  if (r && r.fullyCleared) {
    const next = (state.towerIndex + 1) % Tower.TOWER_COUNT;
    buildFreshTower(Tower.TOWERS[next].id);
  } else {
    buildFreshTower(state.tower.id);
  }
}

function onStart() {
  sfx.unlock(); sfx.play('tap');
  state.score = 0;
  state.isNewBest = false;
  buildFreshTower(Tower.TOWERS[0].id);
}

function onTowerCycle() {
  if (state.mode !== 'config') return;
  sfx.unlock(); sfx.play('tap');
  const next = (state.towerIndex + 1) % Tower.TOWER_COUNT;
  buildFreshTower(Tower.TOWERS[next].id);
}

/* ------------------------------------------------------------------------ *
 * Particles + screen shake.
 * ------------------------------------------------------------------------ */
function spawnBreakBurst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 220;
    state.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
      life: 0.4 + Math.random() * 0.5, maxLife: 0.9, r: 2 + Math.random() * 3.5, color,
    });
  }
}
function spawnCrackPuff(x, y) {
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 20 + Math.random() * 50;
    state.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.22 + Math.random() * 0.2, maxLife: 0.42, r: 1.4 + Math.random() * 2,
      color: 'rgba(220,230,255,0.85)',
    });
  }
}
function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 900 * dt; p.vx *= 0.98;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

/* ------------------------------------------------------------------------ *
 * Rendering.
 * ------------------------------------------------------------------------ */
function roundRectPath(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
function withAlpha(hex, a) {
  if (hex.startsWith('rgba') || hex.startsWith('rgb(')) return hex;
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function drawBackdrop() {
  ctx.fillStyle = 'rgba(180,200,255,0.5)';
  for (let i = 0; i < 34; i++) {
    const h1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453);
    const h2 = Math.abs(Math.sin(i * 78.233) * 12345.6789);
    const x = (h1 - Math.floor(h1)) * CANVAS_W;
    const y = (h2 - Math.floor(h2)) * CANVAS_H;
    const r = 0.5 + (h1 - Math.floor(h1)) * 1.2;
    ctx.globalAlpha = 0.18 + (h2 - Math.floor(h2)) * 0.35;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSideWalls() {
  ctx.save();
  ctx.strokeStyle = 'rgba(92,225,255,0.28)';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(92,225,255,0.4)';
  ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(Tower.PLAY_LEFT, Tower.TOWER_TOP_Y - 24); ctx.lineTo(Tower.PLAY_LEFT, Tower.EXIT_Y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(Tower.PLAY_RIGHT, Tower.TOWER_TOP_Y - 24); ctx.lineTo(Tower.PLAY_RIGHT, Tower.EXIT_Y); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,209,102,0.35)';
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(Tower.PLAY_LEFT, Tower.EXIT_Y); ctx.lineTo(Tower.PLAY_RIGHT, Tower.EXIT_Y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawSpawnTrack() {
  ctx.save();
  ctx.strokeStyle = 'rgba(92,225,255,0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 6]);
  ctx.beginPath(); ctx.moveTo(Tower.PLAY_LEFT, Tower.SPAWN_TRACK_Y); ctx.lineTo(Tower.PLAY_RIGHT, Tower.SPAWN_TRACK_Y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(92,225,255,0.9)';
  ctx.shadowColor = 'rgba(92,225,255,0.7)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(state.spawnX - 9, Tower.SPAWN_TRACK_Y - 14);
  ctx.lineTo(state.spawnX + 9, Tower.SPAWN_TRACK_Y - 14);
  ctx.lineTo(state.spawnX, Tower.SPAWN_TRACK_Y - 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPreviewBalls() {
  const w = Physics.WEIGHTS[state.weightTier];
  const offsets = spawnOffsets(state.ballCount, w.r);
  ctx.save();
  ctx.globalAlpha = 0.65;
  for (const off of offsets) {
    const x = clampSpawnX(state.spawnX + off);
    ctx.beginPath(); ctx.arc(x, Tower.SPAWN_DROP_Y, w.r, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(w.color, 0.45);
    ctx.shadowColor = w.color; ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = withAlpha(w.color, 0.9);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlatform(plat) {
  if (plat.broken) return;
  const hpFrac = clamp(plat.hp / plat.maxHp, 0, 1);
  const w = plat.x1 - plat.x0, h = plat.y1 - plat.y0;
  ctx.save();
  roundRectPath(plat.x0, plat.y0, w, h, 6);
  ctx.fillStyle = withAlpha(plat.color, 0.13 + hpFrac * 0.09);
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = plat.damageFlash > 0 ? '#ffffff' : plat.color;
  ctx.shadowColor = plat.color;
  ctx.shadowBlur = 7 + plat.damageFlash * 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (hpFrac < 0.72) {
    const midx = (plat.x0 + plat.x1) / 2, midy = (plat.y0 + plat.y1) / 2;
    ctx.strokeStyle = withAlpha('#ff5c7a', 0.35 + (1 - hpFrac) * 0.45);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(midx - w * 0.26, plat.y0 + 2);
    ctx.lineTo(midx - w * 0.04, midy);
    ctx.lineTo(midx - w * 0.2, plat.y1 - 2);
    if (hpFrac < 0.42) {
      ctx.moveTo(midx + w * 0.16, plat.y0 + 2);
      ctx.lineTo(midx + w * 0.02, midy);
      ctx.lineTo(midx + w * 0.28, plat.y1 - 2);
    }
    if (hpFrac < 0.16) {
      ctx.moveTo(plat.x0 + Math.min(8, w * 0.08), midy - h * 0.18);
      ctx.lineTo(midx, midy + h * 0.22);
      ctx.lineTo(plat.x1 - Math.min(8, w * 0.08), midy - h * 0.14);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawBall(ball) {
  if (ball.exited) return;
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.beginPath(); ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(ball.color, 0.92);
  ctx.shadowColor = ball.color;
  ctx.shadowBlur = 9 + ball.bounceFlash * 10;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.beginPath(); ctx.arc(-ball.r * 0.32, -ball.r * 0.32, ball.r * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  for (const p of state.particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = withAlpha(p.color, a);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.save();
  if (state.shake > 0.5) {
    ctx.translate((Math.random() - 0.5) * state.shake * 0.6, (Math.random() - 0.5) * state.shake * 0.6);
  }
  drawBackdrop();
  drawSideWalls();
  if (state.tower) for (const p of state.tower.platforms) drawPlatform(p);
  if (state.mode === 'config') { drawSpawnTrack(); drawPreviewBalls(); }
  if (state.world) for (const b of state.world.balls) drawBall(b);
  drawParticles();
  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * HUD + hint + results text.
 * ------------------------------------------------------------------------ */
function updateHud() {
  const nameKey = state.tower ? state.tower.nameKey : Tower.TOWERS[0].nameKey;
  $('hudTowerVal').textContent = t(lang, nameKey);
  const total = state.tower ? state.tower.platforms.length : 0;
  const broken = state.tower ? state.tower.platforms.filter((p) => p.broken).length : 0;
  $('hudLayersVal').textContent = `${broken}/${total}`;
  $('hudScoreVal').textContent = String(state.score);
  $('hudBestVal').textContent = String(state.best);
}

function renderHint() {
  if (state.mode === 'config') {
    hint.textContent = t(lang, 'hintConfig');
  } else if (state.mode === 'falling') {
    const maxSpeed = state.world ? Physics.maxBallSpeed(state.world) : 0;
    hint.textContent = (maxSpeed < 45 && state.settleTimer > 0.05) ? t(lang, 'hintSettling') : t(lang, 'hintFalling');
  }
}

function renderResults() {
  const r = state.lastResult;
  if (!r) return;
  $('resultsTitle').textContent = t(lang, r.fullyCleared ? 'towerClearedTitle' : 'dropDoneTitle');
  $('resLayersLine').textContent = `${t(lang, 'layersBrokenLabel')}: ${r.layersBroken}/${r.totalPlatforms}`;
  $('resDepthLine').textContent = `${t(lang, 'depthReachedLabel')}: ${r.anyExited ? t(lang, 'reachedBottomValue') : t(lang, 'depthValue', { rows: r.depthRows, total: Tower.ROW_COUNT })}`;
  $('resScoreLine').textContent = `${t(lang, 'scoreGainLabel')}: +${r.scoreGain}`;
  $('resTotalLine').textContent = `${t(lang, 'totalScoreLabel')}: ${state.score}`;
  $('newBestLine').hidden = !state.isNewBest;
  $('btnContinue').textContent = t(lang, r.fullyCleared ? 'nextTowerBtn' : 'continueBtn');
}

/* ------------------------------------------------------------------------ *
 * Input — Pointer Events unify touch/mouse. A drag can start anywhere on
 * the canvas while configuring (there is no other draggable interaction on
 * it in that mode) and only moves the spawn X, never Y — forgiving, large
 * touch target, matching CONTRIBUTING's "touch or large click targets" rule.
 * ------------------------------------------------------------------------ */
function eventToCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
    y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
  };
}
function onPointerDown(e) {
  if (state.mode !== 'config') return;
  sfx.unlock();
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('is-dragging');
  state.dragging = true;
  state.spawnX = clampSpawnX(eventToCanvasPoint(e).x);
}
function onPointerMove(e) {
  if (!state.dragging) return;
  e.preventDefault();
  state.spawnX = clampSpawnX(eventToCanvasPoint(e).x);
}
function onPointerUp() {
  if (!state.dragging) return;
  state.dragging = false;
  canvas.classList.remove('is-dragging');
}

/* ------------------------------------------------------------------------ *
 * Keyboard (optional): Enter/Space activates the current primary action;
 * arrow keys nudge the spawn position; 1/2/3 pick ball count.
 * ------------------------------------------------------------------------ */
function onKey(e) {
  if (e.code === 'Enter' || e.code === 'Space') {
    if (state.mode === 'title') { e.preventDefault(); onStart(); }
    else if (state.mode === 'settled') { e.preventDefault(); onContinue(); }
    else if (state.mode === 'config') { e.preventDefault(); startDrop(); }
    return;
  }
  if (state.mode !== 'config') return;
  if (e.code === 'ArrowLeft') { e.preventDefault(); state.spawnX = clampSpawnX(state.spawnX - 20); }
  else if (e.code === 'ArrowRight') { e.preventDefault(); state.spawnX = clampSpawnX(state.spawnX + 20); }
  else if (e.code === 'Digit1') setBallCount(1);
  else if (e.code === 'Digit2') setBallCount(2);
  else if (e.code === 'Digit3') setBallCount(3);
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
  updateHud();
  renderHint();
  $('bestLineStart').textContent = `${t(lang, 'bestLabel')}: ${state.best}`;
  if (state.mode === 'settled') renderResults();
  rememberLang(lang);
}

/* ------------------------------------------------------------------------ *
 * Main loop.
 * ------------------------------------------------------------------------ */
let accumulator = 0;
function update(dt) {
  updateParticles(dt);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 32);

  if (state.mode === 'falling') {
    accumulator = Math.min(accumulator + dt, 0.1);
    while (accumulator >= PHYS_DT) {
      physicsStep(PHYS_DT);
      accumulator -= PHYS_DT;
      if (state.mode !== 'falling') { accumulator = 0; break; }
    }
    renderHint();
  }
}

let lastNow = now();
function loop(t0) {
  const dt = Math.min(0.05, (t0 - lastNow) / 1000);
  lastNow = t0;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------------ *
 * Init.
 * ------------------------------------------------------------------------ */
function init() {
  state.best = loadBest();
  buildFreshTower(Tower.TOWERS[0].id);
  state.mode = 'title';
  setControlsLocked(true);
  applyLang(lang);
  showCard('start');
  overlay.hidden = false;

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  $('btnStart').addEventListener('click', onStart);
  $('btnContinue').addEventListener('click', onContinue);
  $('btnDrop').addEventListener('click', startDrop);
  $('hudTower').addEventListener('click', onTowerCycle);
  document.querySelectorAll('#ballGroup .ds-opt-btn').forEach((b) => {
    b.addEventListener('click', () => {
      if (state.mode !== 'config') return;
      sfx.unlock(); sfx.play('tap');
      setBallCount(Number(b.dataset.count));
    });
  });
  document.querySelectorAll('#weightGroup .ds-opt-btn').forEach((b) => {
    b.addEventListener('click', () => {
      if (state.mode !== 'config') return;
      sfx.unlock(); sfx.play('tap');
      setWeightTier(b.dataset.weight);
    });
  });
  window.addEventListener('keydown', onKey);

  setBallCount(state.ballCount);
  setWeightTier(state.weightTier);

  requestAnimationFrame((t0) => { lastNow = t0; requestAnimationFrame(loop); });

  // Debug/test hook — mirrors games/siege-break's window.OGH_SIEGE_BREAK:
  // lets a headless/automated harness drive the sim deterministically
  // (exact ball count/weight/spawn X/tower) and inspect live state (ball
  // velocities, platform hp) instead of fighting real pointer timing.
  window.OGH_DROP_SMASH = {
    state, Physics, Tower,
    lang: () => lang,
    setBallCount, setWeightTier,
    setSpawnX(x) { state.spawnX = clampSpawnX(x); },
    selectTower(id) { if (state.mode === 'config' || state.mode === 'title') buildFreshTower(id); },
    /** Start from the title screen if needed, then attempt a drop with the
     * current configuration. Returns true if the drop actually started. */
    drop() {
      if (state.mode === 'title') onStart();
      return startDrop();
    },
    /** Convenience one-shot: set whatever's provided, then drop. */
    configureAndDrop({ count, weight, x, towerId } = {}) {
      if (state.mode === 'title') onStart();
      if (towerId) buildFreshTower(towerId);
      if (count) setBallCount(count);
      if (weight) setWeightTier(weight);
      if (x != null) state.spawnX = clampSpawnX(x);
      return startDrop();
    },
    /** Advance N fixed physics ticks (bypasses the rAF accumulator). */
    step(n = 1) { for (let i = 0; i < n && state.mode === 'falling'; i++) physicsStep(PHYS_DT); },
    /** Advance one rAF-style frame (particles + physics + draw). */
    tick(dtMs) { update(dtMs / 1000); draw(); },
    world: () => state.world,
    platforms: () => (state.tower ? state.tower.platforms : []),
    PHYS_DT,
  };
}

init();
