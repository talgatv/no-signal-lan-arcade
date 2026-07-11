/**
 * Neon Drift — top-down neon circuit racer.
 * Real spline circuit (track.js), drift/collision physics (physics.js),
 * chase camera + minimap, apex-biased AI with rubber-banding.
 * Offline: player + AI. Online-ready via OGHNet (when host /ws exists) —
 * same integration shape as games/pulse-race/client/game.js.
 */
import { OGHShaderBg } from '../../_shared/js/ogh-shader-bg.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHNet } from '../../_shared/js/ogh-net.js';
import { TRACK, drawTrack, drawMinimap } from './track.js';
import { makeCar, updateCar, resolveCollisions, CAR_RADIUS, TUNING } from './physics.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
// Canvas2D text `direction` defaults to "inherit" from the element's CSS
// direction — with <html dir="rtl"> (Arabic), that would silently mirror
// textAlign/fillText positioning for anything drawn on canvas (minimap
// labels, countdown text) even though the canvas itself never rotates.
// Force it explicitly so canvas text rendering is never RTL-affected.
ctx.direction = 'ltr';

const sfx = createOghSfx();
const bg = OGHShaderBg.mount(document.getElementById('bg'), { palette: 0 });
bg.start();

const $ = (id) => document.getElementById(id);
const overlay = $('overlay');
const startCard = $('startCard');
const finishCard = $('finishCard');

const W = canvas.width;
const H = canvas.height;

const COLORS = ['#5ce1ff', '#ff6bcb', '#5cffb0', '#ffd166'];
const NAMES = ['AI-1', 'AI-2', 'AI-3'];

// Starting grid: 2 columns x 2 rows, player always front-left (mirrors
// pulse-race always giving the player slots[0]). `t` is a fraction of a lap
// (progress is a nearest-sample spatial measure, not a signed distance, so
// offsets must stay non-negative here — a *negative* "behind the line" t
// wraps to just-under-1.0 progress, which reads as "almost done with lap 0"
// and makes an unmoved back-row car rank ahead of the front row at the
// green light. Non-negative-only avoids that: front row gets the larger t
// (more advanced, at/near the line), back row the smaller t (less advanced,
// physically behind the front row) — same ordering, no wraparound). `lat`
// is a fraction of track half-width to either side of the centerline.
const GRID_SLOTS = [
  { t: 0.018, lat: -0.32 },
  { t: 0.018, lat: 0.32 },
  { t: 0, lat: -0.32 },
  { t: 0, lat: 0.32 },
];

let lang = detectLang();

const input = { left: false, right: false, gas: false, brake: false };

const state = {
  running: false,
  finished: false,
  net: null,
  cars: [],
  totalLaps: 3,
  particles: [],
  skidMarks: [],
  floaters: [],
  countdown: 0,
  placeOrder: [],
  camera: { shake: 0 },
  dt: 1 / 60,
};

/* ------------------------------------------------------------------------ *
 * Race lifecycle
 * ------------------------------------------------------------------------ */
function carOrderKey(c) {
  if (c.finished) return 1000 + (10 - c.place);
  return c.lap + c.progress;
}

function updatePlaces() {
  const sorted = [...state.cars].sort((a, b) => carOrderKey(b) - carOrderKey(a));
  sorted.forEach((c, i) => { if (!c.finished) c.place = i + 1; });
}

function startRace() {
  const aiN = parseInt($('aiCount').value, 10) || 2;
  state.totalLaps = parseInt($('lapCount').value, 10) || 3;
  state.cars = [];
  state.finished = false;
  state.placeOrder = [];
  state.particles = [];
  state.skidMarks = [];
  state.floaters = [];
  state.camera.shake = 0;

  const slot0 = GRID_SLOTS[0];
  state.cars.push(makeCar({
    name: 'YOU',
    color: COLORS[0],
    isPlayer: true,
    t0: slot0.t,
    lateralOffset: slot0.lat * TRACK.halfWidth,
  }));
  for (let i = 0; i < aiN; i++) {
    const slot = GRID_SLOTS[i + 1];
    state.cars.push(makeCar({
      name: NAMES[i],
      color: COLORS[(i + 1) % COLORS.length],
      isPlayer: false,
      t0: slot.t,
      lateralOffset: slot.lat * TRACK.halfWidth,
    }));
  }
  updatePlaces();

  state.countdown = 3.2;
  state.running = true;
  overlay.hidden = true;
  sfx.play('tap');
  updateHud();
}

function renderStandings() {
  const list = $('standingsList');
  list.innerHTML = '';
  const sorted = [...state.cars].sort((a, b) => (a.place || 99) - (b.place || 99));
  for (const c of sorted) {
    const li = document.createElement('li');
    if (c.isPlayer) li.classList.add('is-player');
    const nameSpan = document.createElement('span');
    nameSpan.textContent = `P${c.place || '-'} ${c.name}`;
    const markSpan = document.createElement('span');
    markSpan.textContent = c.finished ? '✓' : '';
    li.appendChild(nameSpan);
    li.appendChild(markSpan);
    list.appendChild(li);
  }
}

function renderFinishTexts() {
  const you = state.cars.find((c) => c.isPlayer);
  $('finishLine').textContent = you?.finished
    ? t(lang, 'finishedLine', { place: you.place, total: state.cars.length })
    : t(lang, 'finishTitle');
  renderStandings();
  $('finishNetBlurb').textContent = state.net?.mode === 'online'
    ? t(lang, 'netOnlineBlurb') : t(lang, 'netOfflineBlurb');
}

function showFinish() {
  finishCard.hidden = false;
  startCard.hidden = true;
  overlay.hidden = false;
  renderFinishTexts();
  state.running = false;
}

/* ------------------------------------------------------------------------ *
 * Particles / skid marks / floating score text
 * ------------------------------------------------------------------------ */
let lastScreechAt = -10;

function spawnDriftSmoke(c) {
  const a = c.angle;
  const side = (Math.random() < 0.5 ? -1 : 1) * CAR_RADIUS * 0.6;
  const px = c.x - Math.cos(a) * CAR_RADIUS * 1.1 - Math.sin(a) * side;
  const py = c.y - Math.sin(a) * CAR_RADIUS * 1.1 + Math.cos(a) * side;
  state.particles.push({
    type: 'smoke', x: px, y: py,
    vx: (Math.random() - 0.5) * 12 - c.vx * 0.04,
    vy: (Math.random() - 0.5) * 12 - c.vy * 0.04,
    life: 0.55, maxLife: 0.55, size: 3 + Math.random() * 2.4,
  });
}

function spawnSkidTicks(c) {
  const a = Math.hypot(c.vx, c.vy) > 1 ? Math.atan2(c.vy, c.vx) : c.angle;
  const len = 5;
  for (const side of [-1, 1]) {
    const ox = -Math.sin(c.angle) * CAR_RADIUS * 0.55 * side;
    const oy = Math.cos(c.angle) * CAR_RADIUS * 0.55 * side;
    const bx = c.x - Math.cos(c.angle) * CAR_RADIUS * 0.9 + ox;
    const by = c.y - Math.sin(c.angle) * CAR_RADIUS * 0.9 + oy;
    state.skidMarks.push({
      x1: bx - Math.cos(a) * len, y1: by - Math.sin(a) * len,
      x2: bx + Math.cos(a) * len, y2: by + Math.sin(a) * len,
      life: 5.5, maxLife: 5.5,
    });
  }
  if (state.skidMarks.length > 520) state.skidMarks.splice(0, state.skidMarks.length - 520);
}

function spawnSpeedStreak(c) {
  const a = Math.hypot(c.vx, c.vy) > 1 ? Math.atan2(c.vy, c.vx) : c.angle;
  state.particles.push({
    type: 'streak',
    x: c.x - Math.cos(a) * CAR_RADIUS,
    y: c.y - Math.sin(a) * CAR_RADIUS,
    angle: a, life: 0.2, maxLife: 0.2, color: c.color,
  });
}

function spawnSparks(a, b, n = 7) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 60 + Math.random() * 60;
    state.particles.push({
      type: 'spark', x: mx, y: my,
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      life: 0.32, maxLife: 0.32,
      color: Math.random() < 0.5 ? '#ffd166' : '#ff5c7a',
    });
  }
}

function spawnBoostBurst(c) {
  for (let i = 0; i < 10; i++) {
    const ang = c.angle + Math.PI + (Math.random() - 0.5) * 1.1;
    state.particles.push({
      type: 'spark', x: c.x, y: c.y,
      vx: Math.cos(ang) * 130, vy: Math.sin(ang) * 130,
      life: 0.35, maxLife: 0.35, color: '#5ce1ff',
    });
  }
}

function ageAndPrune(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.vx != null) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const damp = Math.pow(0.86, dt * 60);
      p.vx *= damp;
      p.vy *= damp;
    }
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.skidMarks.length - 1; i >= 0; i--) {
    state.skidMarks[i].life -= dt;
    if (state.skidMarks[i].life <= 0) state.skidMarks.splice(i, 1);
  }
  for (let i = state.floaters.length - 1; i >= 0; i--) {
    const f = state.floaters[i];
    f.life -= dt;
    f.y -= 16 * dt;
    if (f.life <= 0) state.floaters.splice(i, 1);
  }
}

/* ------------------------------------------------------------------------ *
 * Physics hooks — wire car dynamics to sfx/particles/camera/race bookkeeping
 * ------------------------------------------------------------------------ */
const hooks = {
  onLap(c) {
    if (c.isPlayer) sfx.play('pickup');
  },
  onFinish(c) {
    c.place = state.placeOrder.length + 1;
    state.placeOrder.push(c.id);
    if (c.isPlayer) {
      sfx.play('win');
      state.finished = true;
      setTimeout(showFinish, 500);
    }
  },
  onDriftStart(c) {
    const now = performance.now() / 1000;
    if (now - lastScreechAt > 0.35) {
      lastScreechAt = now;
      sfx.play('screech');
    }
  },
  onDriftBoost(c, bonus) {
    state.floaters.push({
      x: c.x, y: c.y - 14, life: 0.9,
      text: t(lang, 'driftBoost', { n: bonus }), color: c.isPlayer ? '#5ce1ff' : c.color,
    });
    spawnBoostBurst(c);
    if (c.isPlayer) sfx.play('pickup');
  },
  onWallHit(c) {
    if (c.isPlayer) {
      state.camera.shake = Math.max(state.camera.shake, 3.5);
      sfx.play('tick');
    }
  },
  onCollide(a, b, mag, hard) {
    spawnSparks(a, b, hard ? 10 : 5);
    if (a.isPlayer || b.isPlayer) {
      if (hard) {
        state.camera.shake = Math.max(state.camera.shake, Math.min(9, mag / 14));
        sfx.play('die');
      } else {
        sfx.play('tick');
      }
    }
  },
  onTick(c) {
    const dt = state.dt;
    if (c.driftBlend > 0.45) {
      if (Math.random() < dt * 40) spawnDriftSmoke(c);
      if (Math.random() < dt * 22) spawnSkidTicks(c);
    }
    const speed = Math.hypot(c.vx, c.vy);
    const streakThresh = (c.isPlayer ? TUNING.maxSpeed : TUNING.aiMaxSpeedBase) * 0.72;
    if (speed > streakThresh && Math.random() < dt * 10) spawnSpeedStreak(c);
  },
};

/* ------------------------------------------------------------------------ *
 * Camera
 * ------------------------------------------------------------------------ */
function cameraTarget() {
  const player = state.cars.find((c) => c.isPlayer);
  if (player) {
    const speed = Math.hypot(player.vx, player.vy);
    const frac = Math.min(1, speed / TUNING.maxSpeed);
    return { x: player.x, y: player.y, scale: 1 - frac * 0.1 };
  }
  const b = TRACK.bounds;
  const fitScale = Math.min((W - 40) / (b.maxX - b.minX), (H - 40) / (b.maxY - b.minY));
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, scale: fitScale };
}

/* ------------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------------ */
function carBodyPath(cx, R) {
  cx.beginPath();
  cx.moveTo(R * 1.3, 0);
  cx.lineTo(R * 0.5, -R * 0.62);
  cx.lineTo(-R * 0.9, -R * 0.62);
  cx.lineTo(-R * 1.25, -R * 0.4);
  cx.lineTo(-R * 1.25, R * 0.4);
  cx.lineTo(-R * 0.9, R * 0.62);
  cx.lineTo(R * 0.5, R * 0.62);
  cx.closePath();
}

function drawCar(c) {
  const R = CAR_RADIUS;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);

  const drifting = c.driftBlend > 0.15;
  ctx.fillStyle = (drifting ? '#ffd166' : c.color) + (drifting ? '77' : '3d');
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 1.9, R * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();

  carBodyPath(ctx, R);
  ctx.fillStyle = c.color;
  ctx.fill();
  if (c.isPlayer) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.fillStyle = '#0a0c14';
  ctx.beginPath();
  ctx.moveTo(R * 0.55, -R * 0.32);
  ctx.lineTo(-R * 0.15, -R * 0.32);
  ctx.lineTo(-R * 0.3, R * 0.32);
  ctx.lineTo(R * 0.55, R * 0.32);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = c.color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-R * 1.25, -R * 0.58);
  ctx.lineTo(-R * 1.25, R * 0.58);
  ctx.stroke();

  ctx.restore();
}

function drawSkidMarks() {
  for (const s of state.skidMarks) {
    ctx.globalAlpha = Math.max(0, Math.min(0.5, (s.life / s.maxLife) * 0.5));
    ctx.strokeStyle = '#0a0a12';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawParticlesWorld() {
  for (const p of state.particles) {
    const lifeFrac = Math.max(0, p.life / p.maxLife);
    if (p.type === 'smoke') {
      ctx.globalAlpha = lifeFrac * 0.45;
      ctx.fillStyle = '#cfd6ee';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.7 - lifeFrac * 0.7), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'streak') {
      ctx.globalAlpha = lifeFrac;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - Math.cos(p.angle) * 11, p.y - Math.sin(p.angle) * 11);
      ctx.stroke();
    } else if (p.type === 'spark') {
      ctx.globalAlpha = lifeFrac;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
  }
  ctx.globalAlpha = 1;
}

function drawFloaters() {
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 0.9));
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawCountdown() {
  const n = Math.ceil(state.countdown);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5ce1ff';
  ctx.font = 'bold 64px Montserrat, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(n > 3 ? t(lang, 'goText') : String(n), W / 2, H / 2);
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(5,6,12,0.55)';
  ctx.fillRect(0, 0, W, H);

  const cam = cameraTarget();
  const shakeX = state.camera.shake > 0 ? (Math.random() * 2 - 1) * state.camera.shake : 0;
  const shakeY = state.camera.shake > 0 ? (Math.random() * 2 - 1) * state.camera.shake : 0;

  ctx.save();
  ctx.translate(W / 2 + shakeX, H / 2 + shakeY);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.x, -cam.y);

  drawTrack(ctx);
  drawSkidMarks();
  drawParticlesWorld();
  for (const c of state.cars) if (!c.isPlayer) drawCar(c);
  for (const c of state.cars) if (c.isPlayer) drawCar(c);
  drawFloaters();

  ctx.restore();

  const player = state.cars.find((c) => c.isPlayer);
  drawMinimap(ctx, { x: W - 124, y: 12, w: 112, h: 88 }, state.cars, player?.id);

  if (state.countdown > 0) drawCountdown();
}

/* ------------------------------------------------------------------------ *
 * HUD
 * ------------------------------------------------------------------------ */
function updateHud() {
  const you = state.cars.find((c) => c.isPlayer);
  if (!you) return;
  const lapShow = Math.min(state.totalLaps, you.lap + 1);
  $('hudLap').innerHTML = `${t(lang, 'lapPrefix')} <strong>${lapShow}</strong>/${state.totalLaps}`;
  $('hudPos').innerHTML = `P<strong>${you.place || 1}</strong>`;
  $('hudSpeed').innerHTML = `${t(lang, 'speedLabel')} <strong>${Math.round(Math.hypot(you.vx, you.vy))}</strong>`;
}

function updateHudNet() {
  $('hudNet').textContent = state.net?.mode === 'online' ? t(lang, 'hudOnline') : t(lang, 'hudOffline');
}

function updateNetBlurb() {
  const el = $('netBlurb');
  if (!state.net) { el.textContent = t(lang, 'netChecking'); return; }
  el.textContent = state.net.mode === 'online' ? t(lang, 'netOnlineBlurb') : t(lang, 'netOfflineBlurb');
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
  updateNetBlurb();
  if (state.cars.length) updateHud();
  if (!finishCard.hidden) renderFinishTexts();
  rememberLang(lang);
}

/* ------------------------------------------------------------------------ *
 * Input
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

bindHold($('btnLeft'), 'left');
bindHold($('btnRight'), 'right');
bindHold($('btnGas'), 'gas');
bindHold($('btnBrake'), 'brake');

window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'a', 'A'].includes(e.key)) input.left = true;
  if (['ArrowRight', 'd', 'D'].includes(e.key)) input.right = true;
  if (['ArrowUp', 'w', 'W'].includes(e.key)) input.gas = true;
  if (['ArrowDown', 's', 'S', ' '].includes(e.key)) input.brake = true;
});
window.addEventListener('keyup', (e) => {
  if (['ArrowLeft', 'a', 'A'].includes(e.key)) input.left = false;
  if (['ArrowRight', 'd', 'D'].includes(e.key)) input.right = false;
  if (['ArrowUp', 'w', 'W'].includes(e.key)) input.gas = false;
  if (['ArrowDown', 's', 'S', ' '].includes(e.key)) input.brake = false;
});

function onStartClick() {
  sfx.unlock();
  startRace();
}
$('btnStart').addEventListener('click', onStartClick);
$('btnAgain').addEventListener('click', onStartClick);

/* ------------------------------------------------------------------------ *
 * Main loop
 * ------------------------------------------------------------------------ */
function stepSimulation(dt) {
  state.dt = dt;
  if (state.running) {
    if (state.countdown > 0) {
      const prev = state.countdown;
      state.countdown -= dt;
      if (prev > 1 && state.countdown <= 1) sfx.play('tick');
      if (state.countdown <= 0) sfx.play('tap');
    } else {
      for (const c of state.cars) {
        updateCar(c, dt, { input, cars: state.cars, totalLaps: state.totalLaps, hooks });
      }
      resolveCollisions(state.cars, hooks);
      updatePlaces();
      updateHud();
    }
  }
  ageAndPrune(dt);
  if (state.camera.shake > 0) state.camera.shake = Math.max(0, state.camera.shake - dt * 22);
  draw();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  stepSimulation(dt);
  requestAnimationFrame(loop);
}

// boot net — same OGHNet integration shape as games/pulse-race/client/game.js
(async () => {
  const net = await OGHNet.connect({ gameId: 'neon-drift' });
  state.net = net;
  updateHudNet();
  updateNetBlurb();
  net.on('mode', () => { updateHudNet(); updateNetBlurb(); });
  net.on('state', (snap) => {
    // Future: apply remote car snapshots when host simulates
    if (snap?.cars && state.running) {
      // placeholder for MP interpolation
    }
  });
})();

applyLang(lang);
requestAnimationFrame(loop);

// Debug/test hook — harmless in normal use (same convention as
// games/pop-the-bugs/client/app.js's window.OGH_POP_BUGS): lets a test
// harness fast-forward a full multi-lap race, inspect live car state, or
// force input without waiting out real wall-clock time.
window.OGH_NEON_DRIFT = {
  state, TUNING, TRACK, input, hooks,
  startRace,
  step: stepSimulation,
  setLang: applyLang,
};
