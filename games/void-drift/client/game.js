/**
 * Void Drift — Newtonian asteroids-style space shooter (OGH, solo).
 *
 * game.js wires the pieces together: ship/bullet physics (physics.js),
 * asteroid + UFO models (asteroids.js), sound, i18n, HUD, input and the
 * canvas renderer. It owns game state, the wave/lives/score lifecycle, and
 * collision resolution. The one thing every other module bends around: the
 * ship's `angle` (facing) and `vx`/`vy` (momentum) are independent state —
 * see physics.js's header comment for why that's the whole point of the genre.
 *
 * RTL note: the canvas view and the touch controls are a fixed spatial
 * simulation and never mirror — only the DOM chrome (header/cards/hint)
 * flips for Arabic (see i18n.js). ctx.direction is forced to 'ltr' as a
 * second guard, same precedent as ray-maze/neon-drift.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import {
  CONFIG as SHIP_CFG, updateShip, updateBullet, spawnBullet, updateFreeBody,
  circlesHitWrapped, facingX, facingY,
} from './physics.js';
import {
  ASTEROID_DEFS, UFO_DEFS, spawnWaveAsteroids, splitAsteroid,
  spawnUfo, updateUfo, ufoWantsToFire, ufoFire,
} from './asteroids.js';

const $ = (id) => document.getElementById(id);
const GAME_ID = 'void-drift';

/* ------------------------------------------------------------------------ *
 * Tunables
 * ------------------------------------------------------------------------ */
const START_LIVES = 3;
const RESPAWN_INVULN_MS = 2500;
const WAVE_ASTEROID_AVOID_RADIUS = 140; // keep new-wave rocks off the ship's spawn point

const ROCK_COLOR = '#cfd9ff';
const SHIP_COLOR = '#5ce1ff';
const THRUST_COLOR = '#ffd166';
const BULLET_COLOR = '#eaffff';
const UFO_COLOR = '#ff6bcb';
const UFO_BULLET_COLOR = '#ff8fdb';

/**
 * Wave N's large-asteroid count and speed multiplier — a pure function of
 * the wave number so difficulty progression can be inspected directly
 * (window.OGH_VOID_DRIFT.waveConfig) instead of eyeballed. Count ramps from
 * 4 up to a cap of 11; speed multiplier ramps from 1x toward a 2.2x cap;
 * both are still climbing well past wave 5 before the caps bite (count caps
 * at wave 8, speed at wave ~11). UFOs also show up more often on later waves.
 */
function waveConfig(wave) {
  const n = Math.max(1, wave | 0);
  return {
    largeCount: Math.min(4 + (n - 1), 11),
    speedMul: Math.min(1 + (n - 1) * 0.12, 2.2),
    ufoIntervalMs: Math.max(9000, 22000 - (n - 1) * 1500),
  };
}

/* ------------------------------------------------------------------------ *
 * Canvas — sized dynamically to fill the stage (avoids the distortion a
 * fixed-aspect CSS box would cause if the internal resolution didn't match
 * it exactly), same approach as games/ray-maze's view canvas.
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
  buildStarfield();
}

const sfx = createOghSfx();

/* ------------------------------------------------------------------------ *
 * DOM refs
 * ------------------------------------------------------------------------ */
const overlay = $('overlay');
const startCard = $('startCard');
const gameOverCard = $('gameOverCard');
const waveBannerEl = $('waveBanner');

/* ------------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------------ */
let lang = detectLang();

const state = {
  mode: 'title', // title | play | gameover
  score: 0,
  best: 0,
  isNewBest: false,
  lives: START_LIVES,
  wave: 1,
  asteroids: [],
  bullets: [],
  ufoBullets: [],
  ufo: null,
  particles: [],
  ufoSpawnTimer: 0,
  shake: 0,
};

/** The ship's only state: position, facing `angle`, and momentum `vx`/`vy`.
 * Nothing outside physics.js's updateShip ever assigns vx/vy from angle, or
 * angle from vx/vy — see the physics.js header for why that separation is
 * the entire point. */
const ship = {
  x: 0, y: 0, angle: 0, vx: 0, vy: 0,
  fireCd: 0,
  invulnMs: 0,
  thrustSfxTimer: 0,
  thrustParticleAcc: 0,
};

const input = { left: false, right: false, thrust: false, firing: false };

/* ------------------------------------------------------------------------ *
 * Starfield — static dots, purely decorative, no bitmap assets.
 * ------------------------------------------------------------------------ */
let stars = [];
function buildStarfield() {
  const count = Math.max(30, Math.round((W * H) / 9000));
  stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      fx: Math.random(), fy: Math.random(),
      r: Math.random() * 1.3 + 0.4,
      ph: Math.random() * Math.PI * 2,
    });
  }
}
function drawStarfield() {
  const tt = performance.now() / 1000;
  ctx.fillStyle = 'rgb(180,200,255)';
  for (const s of stars) {
    ctx.globalAlpha = 0.25 + 0.35 * Math.max(0, Math.sin(tt * 0.6 + s.ph));
    ctx.beginPath();
    ctx.arc(s.fx * W, s.fy * H, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------------ *
 * Round / wave / life lifecycle
 * ------------------------------------------------------------------------ */
function resetShip() {
  ship.x = W / 2;
  ship.y = H / 2;
  ship.angle = 0;
  ship.vx = 0;
  ship.vy = 0;
  ship.fireCd = 0;
  ship.invulnMs = RESPAWN_INVULN_MS;
  ship.thrustSfxTimer = 0;
  ship.thrustParticleAcc = 0;
}

function scheduleNextUfo() {
  const cfg = waveConfig(state.wave);
  state.ufoSpawnTimer = cfg.ufoIntervalMs * (0.6 + Math.random() * 0.7);
}

function spawnWave(n) {
  const cfg = waveConfig(n);
  state.asteroids = spawnWaveAsteroids(
    cfg.largeCount, W, H, cfg.speedMul,
    { x: ship.x, y: ship.y, radius: WAVE_ASTEROID_AVOID_RADIUS },
  );
  scheduleNextUfo();
  showWaveBanner(n);
}

function nextWave() {
  state.wave += 1;
  updateHudWave();
  spawnWave(state.wave);
  sfx.play('win');
}

function startGame() {
  state.score = 0;
  state.lives = START_LIVES;
  state.wave = 1;
  state.bullets = [];
  state.ufoBullets = [];
  state.ufo = null;
  state.particles = [];
  state.isNewBest = false;
  updateHudScore();
  updateHudLives();
  updateHudWave();
  resetShip();
  spawnWave(1);
  state.mode = 'play';
  overlay.hidden = true;
}

function gameOver() {
  state.mode = 'gameover';
  sfx.play('die');
  state.isNewBest = state.score > state.best;
  if (state.isNewBest) {
    state.best = state.score;
    persistBest();
  }
  startCard.hidden = true;
  gameOverCard.hidden = false;
  overlay.hidden = false;
  renderResult();
}

function loseLife() {
  state.lives = Math.max(0, state.lives - 1);
  updateHudLives();
  spawnExplosion(ship.x, ship.y, 'ship');
  state.shake = 12;
  sfx.play('splat');
  if (state.lives <= 0) gameOver();
  else resetShip();
}

function tryFire() {
  if (state.mode !== 'play' || ship.fireCd > 0) return;
  ship.fireCd = SHIP_CFG.FIRE_CD;
  state.bullets.push(spawnBullet(ship, SHIP_CFG));
  sfx.play('pop');
}

/* ------------------------------------------------------------------------ *
 * Collisions — bullets/ship vs asteroids/UFO/UFO-bullets. All distance
 * checks are toroidal (physics.js's circlesHitWrapped) so a bullet near one
 * edge genuinely hits a rock that has wrapped to the opposite edge, matching
 * how wraparound reads visually.
 * ------------------------------------------------------------------------ */
function destroyAsteroid(index, a) {
  state.asteroids.splice(index, 1);
  state.score += a.score;
  updateHudScore();
  spawnExplosion(a.x, a.y, 'rock', a.radius);
  const children = splitAsteroid(a, waveConfig(state.wave).speedMul);
  if (children.length) {
    state.asteroids.push(...children);
    sfx.play('thwack');
  } else {
    sfx.play('pocket');
  }
  if (state.asteroids.length === 0) nextWave();
}

function destroyUfo() {
  spawnExplosion(state.ufo.x, state.ufo.y, 'ufo');
  state.score += UFO_DEFS.score;
  updateHudScore();
  sfx.play('pocket');
  state.ufo = null;
  scheduleNextUfo();
}

function handleCollisions() {
  for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
    const b = state.bullets[bi];
    let hit = false;
    for (let ai = state.asteroids.length - 1; ai >= 0; ai--) {
      const a = state.asteroids[ai];
      if (circlesHitWrapped(b.x, b.y, b.r, a.x, a.y, a.radius, W, H)) {
        hit = true;
        destroyAsteroid(ai, a);
        break;
      }
    }
    if (hit) state.bullets.splice(bi, 1);
  }

  if (state.ufo) {
    for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
      const b = state.bullets[bi];
      if (state.ufo && circlesHitWrapped(b.x, b.y, b.r, state.ufo.x, state.ufo.y, state.ufo.radius, W, H)) {
        state.bullets.splice(bi, 1);
        destroyUfo();
        break;
      }
    }
  }

  if (state.mode !== 'play' || ship.invulnMs > 0) return;

  for (const a of state.asteroids) {
    if (circlesHitWrapped(ship.x, ship.y, SHIP_CFG.SHIP_RADIUS, a.x, a.y, a.radius, W, H)) {
      loseLife();
      return;
    }
  }

  if (state.ufo && circlesHitWrapped(ship.x, ship.y, SHIP_CFG.SHIP_RADIUS, state.ufo.x, state.ufo.y, state.ufo.radius, W, H)) {
    loseLife();
    return;
  }

  for (let i = state.ufoBullets.length - 1; i >= 0; i--) {
    const b = state.ufoBullets[i];
    if (circlesHitWrapped(ship.x, ship.y, SHIP_CFG.SHIP_RADIUS, b.x, b.y, b.r, W, H)) {
      state.ufoBullets.splice(i, 1);
      loseLife();
      return;
    }
  }
}

/* ------------------------------------------------------------------------ *
 * Particles (explosions + thrust sparks) — plain burst system, no assets.
 * ------------------------------------------------------------------------ */
function spawnExplosion(x, y, kind, scale = 20) {
  const n = kind === 'ship' ? 22 : kind === 'ufo' ? 18 : Math.max(6, Math.round(scale / 2.5));
  const color = kind === 'ship' ? 'rgba(92,225,255,0.95)' : kind === 'ufo' ? 'rgba(255,107,203,0.95)' : 'rgba(207,217,255,0.9)';
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 160;
    state.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.35 + Math.random() * 0.5, color,
    });
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.97;
    p.vy *= 0.97;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function maybeSpawnThrustParticle(dt) {
  ship.thrustParticleAcc += dt;
  if (ship.thrustParticleAcc < 0.028) return;
  ship.thrustParticleAcc = 0;
  const fx = facingX(ship.angle);
  const fy = facingY(ship.angle);
  state.particles.push({
    x: ship.x - fx * 12,
    y: ship.y - fy * 12,
    vx: ship.vx - fx * 70 + (Math.random() - 0.5) * 50,
    vy: ship.vy - fy * 70 + (Math.random() - 0.5) * 50,
    life: 0.18 + Math.random() * 0.16,
    color: 'rgba(255,209,102,0.85)',
  });
}

/* ------------------------------------------------------------------------ *
 * Per-frame update
 * ------------------------------------------------------------------------ */
function update(dt) {
  updateParticles(dt);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 24);

  if (state.mode !== 'play') return;

  if (ship.invulnMs > 0) ship.invulnMs = Math.max(0, ship.invulnMs - dt * 1000);
  updateShip(ship, input, dt, W, H, SHIP_CFG);
  if (ship.fireCd > 0) ship.fireCd = Math.max(0, ship.fireCd - dt);

  if (input.thrust) {
    ship.thrustSfxTimer -= dt;
    if (ship.thrustSfxTimer <= 0) {
      sfx.play('whoosh');
      ship.thrustSfxTimer = 0.44;
    }
    maybeSpawnThrustParticle(dt);
  } else {
    ship.thrustSfxTimer = 0;
  }

  if (input.firing) tryFire();

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    if (!updateBullet(state.bullets[i], dt, W, H)) state.bullets.splice(i, 1);
  }
  for (let i = state.ufoBullets.length - 1; i >= 0; i--) {
    if (!updateBullet(state.ufoBullets[i], dt, W, H)) state.ufoBullets.splice(i, 1);
  }
  for (const a of state.asteroids) updateFreeBody(a, dt, W, H);

  if (state.ufo) {
    const stillOnField = updateUfo(state.ufo, dt, W);
    if (!stillOnField) {
      state.ufo = null;
      scheduleNextUfo();
    } else if (ufoWantsToFire(state.ufo)) {
      state.ufoBullets.push(ufoFire(state.ufo, ship));
      sfx.play('screech');
    }
  } else {
    state.ufoSpawnTimer -= dt * 1000;
    if (state.ufoSpawnTimer <= 0) state.ufo = spawnUfo(W, H, state.wave);
  }

  handleCollisions();
}

/* ------------------------------------------------------------------------ *
 * Rendering — thin glowing vector line-art on black, this hub's house
 * "neon-vector" style and this genre's original arcade look at once. Every
 * moving body is drawn through forEachWrapOffset so it visibly appears on
 * both edges while crossing the screen-wrap seam, instead of popping.
 * ------------------------------------------------------------------------ */
function forEachWrapOffset(x, y, radius, fn) {
  fn(x, y);
  const left = x - radius < 0;
  const right = x + radius > W;
  const top = y - radius < 0;
  const bottom = y + radius > H;
  if (left) fn(x + W, y);
  if (right) fn(x - W, y);
  if (top) fn(x, y + H);
  if (bottom) fn(x, y - H);
  if (left && top) fn(x + W, y + H);
  if (right && top) fn(x - W, y + H);
  if (left && bottom) fn(x + W, y - H);
  if (right && bottom) fn(x - W, y - H);
}

function drawShipAt(x, y) {
  if (ship.invulnMs > 0 && Math.floor(performance.now() / 90) % 2 === 0) return; // respawn blink
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ship.angle);
  if (input.thrust && state.mode === 'play') {
    const flameLen = 10 + Math.random() * 10;
    ctx.beginPath();
    ctx.moveTo(-4, 6);
    ctx.lineTo(0, 6 + flameLen);
    ctx.lineTo(4, 6);
    ctx.closePath();
    ctx.fillStyle = THRUST_COLOR;
    ctx.shadowColor = THRUST_COLOR;
    ctx.shadowBlur = 12;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(8, 10);
  ctx.lineTo(0, 5);
  ctx.lineTo(-8, 10);
  ctx.closePath();
  ctx.strokeStyle = SHIP_COLOR;
  ctx.lineWidth = 2;
  ctx.shadowColor = SHIP_COLOR;
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();
}

function drawAsteroidAt(a, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a.angle);
  ctx.beginPath();
  a.shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.strokeStyle = ROCK_COLOR;
  ctx.lineWidth = 2;
  ctx.shadowColor = ROCK_COLOR;
  ctx.shadowBlur = 9;
  ctx.stroke();
  ctx.restore();
}

function drawUfoAt(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = UFO_COLOR;
  ctx.lineWidth = 2;
  ctx.shadowColor = UFO_COLOR;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(-9, -6);
  ctx.lineTo(9, -6);
  ctx.lineTo(18, 0);
  ctx.lineTo(9, 6);
  ctx.lineTo(-9, 6);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-7, -6);
  ctx.quadraticCurveTo(0, -17, 7, -6);
  ctx.stroke();
  ctx.restore();
}

function drawBulletAt(x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fill();
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2.2));
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function render() {
  const shx = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const shy = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.translate(shx, shy);

  drawStarfield();
  drawParticles();
  for (const a of state.asteroids) forEachWrapOffset(a.x, a.y, a.radius, (x, y) => drawAsteroidAt(a, x, y));
  if (state.ufo) forEachWrapOffset(state.ufo.x, state.ufo.y, state.ufo.radius + 4, drawUfoAt);
  for (const b of state.bullets) forEachWrapOffset(b.x, b.y, b.r, (x, y) => drawBulletAt(x, y, b.r, BULLET_COLOR));
  for (const b of state.ufoBullets) forEachWrapOffset(b.x, b.y, b.r, (x, y) => drawBulletAt(x, y, b.r, UFO_BULLET_COLOR));
  forEachWrapOffset(ship.x, ship.y, SHIP_CFG.SHIP_RADIUS + 14, drawShipAt);

  ctx.restore();
}

/* ------------------------------------------------------------------------ *
 * HUD
 * ------------------------------------------------------------------------ */
function updateHudScore() { $('hudScoreVal').textContent = String(state.score); }
function updateHudWave() { $('hudWaveVal').textContent = String(state.wave); }
function updateHudLives() {
  const el = $('hudLivesVal');
  el.innerHTML = '';
  for (let i = 0; i < state.lives; i++) {
    const s = document.createElement('span');
    s.className = 'vd-ship-icon';
    el.appendChild(s);
  }
}

function showWaveBanner(n) {
  waveBannerEl.textContent = t(lang, 'waveBanner', { n });
  waveBannerEl.classList.remove('is-showing');
  void waveBannerEl.offsetWidth; // restart the CSS animation even on rapid repeats
  waveBannerEl.classList.add('is-showing');
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
    { best: state.best },
    { label: 'Void Drift', summary: `Best ${state.best} · wave ${state.wave}` },
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
  $('legendLargeTxt').textContent = t(lang, 'legendLarge', { n: ASTEROID_DEFS.large.score });
  $('legendMediumTxt').textContent = t(lang, 'legendMedium', { n: ASTEROID_DEFS.medium.score });
  $('legendSmallTxt').textContent = t(lang, 'legendSmall', { n: ASTEROID_DEFS.small.score });
  $('legendUfoTxt').textContent = t(lang, 'legendUfo', { n: UFO_DEFS.score });
}

function renderBestLines() {
  const line = `${t(lang, 'bestLabel')}: ${state.best}`;
  $('bestLineStart').textContent = line;
  $('bestLineEnd').textContent = line;
}

function renderResult() {
  $('gameOverSub').textContent = t(lang, 'gameOverSub', { wave: state.wave });
  $('finalScoreLine').textContent = `${t(lang, 'finalScoreLabel')}: ${state.score}`;
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
  if (state.mode === 'gameover') renderResult();
  rememberLang(lang);
  // Header height can shift with language (back-link length, whether the
  // HUD/lang row wraps) — re-measure so the canvas keeps filling exactly
  // what's left, on every language.
  resize();
}

/* ------------------------------------------------------------------------ *
 * Input — touch D-pad (rotate-left/rotate-right/thrust/fire) via Pointer
 * Events, plus keyboard arrows/WASD + Space as a desktop bonus. No
 * setPointerCapture on the buttons (deliberate — same as ray-maze's fire/
 * reload buttons): a plain tap target doesn't need drag capture, and
 * pointerleave naturally cancels the held state if a finger slides off.
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

  bindHold($('btnLeft'), () => { input.left = true; }, () => { input.left = false; });
  bindHold($('btnRight'), () => { input.right = true; }, () => { input.right = false; });
  bindHold($('btnThrust'), () => { input.thrust = true; }, () => { input.thrust = false; });
  bindHold($('btnFire'), () => { input.firing = true; tryFire(); }, () => { input.firing = false; });
}

function setupKeyboard() {
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault();
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') input.left = true;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') input.right = true;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') input.thrust = true;
    if (k === ' ') { sfx.unlock(); input.firing = true; tryFire(); }
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') input.left = false;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') input.right = false;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') input.thrust = false;
    if (k === ' ') input.firing = false;
  });
}

function setupButtons() {
  $('btnStart').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); startGame(); });
  $('btnAgain').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); startGame(); });
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
  resetShip();
  ship.invulnMs = 0; // decorative title-screen ship renders solid, not blinking
  state.asteroids = spawnWaveAsteroids(4, W, H, 1, null); // decorative title-screen field

  setupTouch();
  setupKeyboard();
  setupButtons();
  applyLang(lang);
  updateHudScore();
  updateHudLives();
  updateHudWave();

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });
  exposeTestHook();
}

/* ------------------------------------------------------------------------ *
 * Test / debug hook — lets the automation harness (and devtools) inspect and
 * drive the game deterministically. Same convention as games/ray-maze's
 * window.OGH_RAY_MAZE and games/pop-the-bugs's window.OGH_POP_BUGS.
 * ------------------------------------------------------------------------ */
function exposeTestHook() {
  window.OGH_VOID_DRIFT = {
    state,
    ship,
    input,
    get W() { return W; },
    get H() { return H; },
    SHIP_CFG,
    ASTEROID_DEFS,
    UFO_DEFS,
    waveConfig,
    facingX,
    facingY,
    startGame,
    gameOver,
    nextWave,
    tryFire,
    /** Force-spawn a UFO right now (if none is already active) for testing. */
    spawnUfoNow() {
      if (!state.ufo) state.ufo = spawnUfo(W, H, state.wave);
      return state.ufo;
    },
    /** Instantly clear the current wave's asteroids, triggering nextWave()
     * the same way destroying the last one in play would. */
    clearWave() {
      state.asteroids = [];
      if (state.mode === 'play') nextWave();
    },
    setInvulnerable(ms) { ship.invulnMs = ms; },
    /** Manually advance one frame by dtMs — the real loop() also just calls
     * update() every rAF tick, so driving it by hand exercises exactly the
     * same code path (useful when a background/inactive tab never receives
     * rAF callbacks at all, or for frame-exact deterministic testing). */
    tick(dtMs) { update(dtMs / 1000); },
  };
}

init();
