/**
 * Comet — gravity-well arcade (OGH experimental)
 * Solo · touch/mouse · ultra-light
 */
import { OGHShaderBg } from '../../_shared/js/ogh-shader-bg.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sfx = createOghSfx();
const bg = OGHShaderBg.mount(document.getElementById('bg'), { palette: 0 });
bg.start();

const W = canvas.width;
const H = canvas.height;

const $ = (id) => document.getElementById(id);
const overlay = $('overlay');
const btnStart = $('btnStart');
const btnNext = $('btnNext');
const titleEl = $('title');
const blurbEl = $('blurb');
const hintEl = $('hint');
const diffBlock = $('diffBlock');
const diffPreview = $('diffPreview');

/** @typedef {{ x: number, y: number, r: number }} Circle */
/** @typedef {{ x: number, y: number, r: number, life: number, maxLife: number }} Well */
/** @typedef {{ x: number, y: number, r: number, taken: boolean }} Star */

/**
 * Difficulty scales:
 *  - gravity well charges (more on Easy)
 *  - comet start speed + max speed (faster on Hard)
 *  - well life / pull strength / hazard size
 */
const DIFFICULTIES = {
  easy: {
    id: 'easy',
    label: 'Easy',
    wellBonus: 5,
    wellMult: 1.35,
    wellLife: 4.6,
    strength: 1.28,
    hazardScale: 0.85,
    speedMult: 0.72,
    maxSpeed: 320,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    wellBonus: 2,
    wellMult: 1.15,
    wellLife: 3.6,
    strength: 1.05,
    hazardScale: 1,
    speedMult: 1,
    maxSpeed: 420,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    wellBonus: 0,
    wellMult: 1,
    wellLife: 2.9,
    strength: 0.92,
    hazardScale: 1.08,
    speedMult: 1.28,
    maxSpeed: 520,
  },
};

/** base wells = designed for Hard; Easy/Normal get more */
const LEVELS = [
  {
    name: 'First burn',
    wells: 4,
    comet: { x: 0.5, y: 0.82, vx: 0, vy: -90 },
    portal: { x: 0.5, y: 0.14, r: 30 },
    stars: [
      { x: 0.5, y: 0.5, r: 10 },
      { x: 0.35, y: 0.38, r: 10 },
    ],
    hazards: [],
    walls: [],
  },
  {
    // Rebalanced: smaller hazard, clearer slingshot arc bottom-left → top-right
    name: 'Slingshot',
    wells: 6,
    comet: { x: 0.16, y: 0.8, vx: 28, vy: -58 },
    portal: { x: 0.84, y: 0.16, r: 32 },
    stars: [
      { x: 0.28, y: 0.62, r: 10 },
      { x: 0.45, y: 0.48, r: 10 },
      { x: 0.68, y: 0.32, r: 10 },
    ],
    hazards: [{ x: 0.58, y: 0.52, r: 15 }],
    walls: [],
  },
  {
    name: 'Needle',
    wells: 6,
    comet: { x: 0.5, y: 0.88, vx: 0, vy: -55 },
    portal: { x: 0.5, y: 0.1, r: 28 },
    stars: [
      { x: 0.22, y: 0.55, r: 10 },
      { x: 0.78, y: 0.55, r: 10 },
      { x: 0.5, y: 0.35, r: 10 },
    ],
    hazards: [
      { x: 0.35, y: 0.45, r: 16 },
      { x: 0.65, y: 0.45, r: 16 },
    ],
    walls: [
      { x: 0.2, y: 0.28, w: 0.25, h: 0.04 },
      { x: 0.55, y: 0.28, w: 0.25, h: 0.04 },
    ],
  },
  {
    name: 'Twin suns',
    wells: 7,
    comet: { x: 0.12, y: 0.5, vx: 80, vy: 0 },
    portal: { x: 0.88, y: 0.5, r: 30 },
    stars: [
      { x: 0.5, y: 0.22, r: 10 },
      { x: 0.5, y: 0.78, r: 10 },
      { x: 0.35, y: 0.5, r: 10 },
      { x: 0.65, y: 0.5, r: 10 },
    ],
    hazards: [
      { x: 0.42, y: 0.35, r: 22 },
      { x: 0.58, y: 0.65, r: 22 },
    ],
    walls: [],
  },
  {
    name: 'Gauntlet',
    wells: 8,
    comet: { x: 0.5, y: 0.9, vx: 24, vy: -46 },
    portal: { x: 0.5, y: 0.08, r: 26 },
    stars: [
      { x: 0.2, y: 0.7, r: 9 },
      { x: 0.8, y: 0.7, r: 9 },
      { x: 0.2, y: 0.4, r: 9 },
      { x: 0.8, y: 0.4, r: 9 },
      { x: 0.5, y: 0.25, r: 9 },
    ],
    hazards: [
      { x: 0.5, y: 0.55, r: 18 },
      { x: 0.28, y: 0.35, r: 14 },
      { x: 0.72, y: 0.35, r: 14 },
    ],
    walls: [
      { x: 0.1, y: 0.62, w: 0.28, h: 0.035 },
      { x: 0.62, y: 0.62, w: 0.28, h: 0.035 },
    ],
  },
];

const state = {
  mode: 'title', // title | play | win | dead
  difficulty: 'normal',
  levelIndex: 0,
  score: 0,
  wellsLeft: 0,
  wells: /** @type {Well[]} */ ([]),
  stars: /** @type {Star[]} */ ([]),
  hazards: /** @type {Circle[]} */ ([]),
  walls: /** @type {{x:number,y:number,w:number,h:number}[]} */ ([]),
  portal: { x: 0, y: 0, r: 28 },
  comet: { x: 0, y: 0, vx: 0, vy: 0, trail: [] },
  particles: [],
  shake: 0,
  message: '',
};

function diff() {
  return DIFFICULTIES[state.difficulty] || DIFFICULTIES.normal;
}

/** Compute well charges for a level under current difficulty */
function wellsForLevel(levelIndex) {
  const L = LEVELS[levelIndex % LEVELS.length];
  const d = diff();
  return Math.max(1, Math.ceil(L.wells * d.wellMult) + d.wellBonus);
}

function px(n, axis) {
  return n * (axis === 'x' ? W : H);
}

function setDifficulty(id) {
  if (!DIFFICULTIES[id]) return;
  state.difficulty = id;
  document.querySelectorAll('.diff-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.diff === id);
  });
  updateDiffPreview();
  updateHud();
}

function updateDiffPreview() {
  if (!diffPreview) return;
  const d = diff();
  const w1 = wellsForLevel(0);
  const w2 = wellsForLevel(1);
  diffPreview.textContent =
    `${d.label}: wells L1=${w1} L2=${w2} · speed ×${d.speedMult.toFixed(2)} · life ${d.wellLife.toFixed(1)}s`;
}

function loadLevel(i) {
  const L = LEVELS[i % LEVELS.length];
  const d = diff();
  state.levelIndex = i;
  state.wellsLeft = wellsForLevel(i);
  state.wells = [];
  state.particles = [];
  state.shake = 0;
  state.comet = {
    x: px(L.comet.x, 'x'),
    y: px(L.comet.y, 'y'),
    vx: L.comet.vx * d.speedMult,
    vy: L.comet.vy * d.speedMult,
    trail: [],
  };
  state.portal = {
    x: px(L.portal.x, 'x'),
    y: px(L.portal.y, 'y'),
    r: L.portal.r,
  };
  state.stars = L.stars.map((s) => ({
    x: px(s.x, 'x'),
    y: px(s.y, 'y'),
    r: s.r,
    taken: false,
  }));
  state.hazards = L.hazards.map((h) => ({
    x: px(h.x, 'x'),
    y: px(h.y, 'y'),
    r: h.r * d.hazardScale,
  }));
  state.walls = L.walls.map((w) => ({
    x: px(w.x, 'x'),
    y: px(w.y, 'y'),
    w: w.w * W,
    h: w.h * H,
  }));
  updateHud();
  hintEl.textContent =
    `${L.name} · ${d.label} · ◎${state.wellsLeft} · spd×${d.speedMult} · tap wells`;
}

function updateHud() {
  const d = diff();
  $('hudLevel').innerHTML = `Lvl <strong>${state.levelIndex + 1}</strong>/${LEVELS.length}`;
  $('hudDiff').textContent = d.label;
  $('hudScore').innerHTML = `★ <strong>${state.score}</strong>`;
  $('hudWells').innerHTML = `◎ <strong>${state.wellsLeft}</strong>`;
}

function showDiffUI(show) {
  if (!diffBlock) return;
  diffBlock.hidden = !show;
  diffBlock.classList.toggle('is-hidden', !show);
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function spawnBurst(x, y, color, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const sp = 40 + Math.random() * 120;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.4 + Math.random() * 0.4,
      color,
    });
  }
}

function placeWell(x, y) {
  if (state.mode !== 'play' || state.wellsLeft <= 0) return;

  // don't place inside portal / hazards / walls clutter
  for (const h of state.hazards) {
    if (dist({ x, y }, h) < h.r + 20) return;
  }

  const life = diff().wellLife;
  state.wellsLeft -= 1;
  state.wells.push({ x, y, r: 48, life: life, maxLife: life });
  sfx.play('place');
  updateHud();
  spawnBurst(x, y, 'rgba(180,140,255,0.9)', 8);
}

function eventToCanvas(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: ((clientX - rect.left) / rect.width) * W,
    y: ((clientY - rect.top) / rect.height) * H,
  };
}

function onPointer(e) {
  e.preventDefault();
  sfx.unlock();
  if (state.mode !== 'play') return;
  const p = eventToCanvas(e);
  placeWell(p.x, p.y);
}

canvas.addEventListener('mousedown', onPointer);
canvas.addEventListener('touchstart', onPointer, { passive: false });

document.querySelectorAll('.diff-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    sfx.unlock();
    sfx.play('tap');
    setDifficulty(btn.dataset.diff);
  });
});

btnStart.addEventListener('click', () => {
  sfx.unlock();
  sfx.play('tap');
  if (state.mode === 'title' || state.mode === 'win') {
    if (state.mode === 'title') {
      state.score = 0;
      state.levelIndex = 0;
    }
  }
  loadLevel(state.levelIndex);
  state.mode = 'play';
  overlay.hidden = true;
  showDiffUI(false);
  btnNext.hidden = true;
  btnStart.hidden = false;
  btnStart.textContent = 'Retry';
});

btnNext.addEventListener('click', () => {
  sfx.play('tap');
  const last = state.levelIndex >= LEVELS.length - 1;
  if (last) {
    state.mode = 'title';
    state.levelIndex = 0;
    titleEl.textContent = 'COMET';
    blurbEl.textContent =
      'Place gravity wells to bend the comet’s path. Collect stars, avoid red singularities, reach the portal.';
    btnNext.hidden = true;
    btnStart.hidden = false;
    btnStart.textContent = 'Play again';
    showDiffUI(true);
    updateDiffPreview();
    return;
  }
  state.levelIndex += 1;
  loadLevel(state.levelIndex);
  state.mode = 'play';
  overlay.hidden = true;
  showDiffUI(false);
});

function showOverlay(kind) {
  overlay.hidden = false;
  if (kind === 'win') {
    const last = state.levelIndex >= LEVELS.length - 1;
    titleEl.textContent = last ? 'ORBIT COMPLETE' : 'GATE REACHED';
    blurbEl.textContent = last
      ? `Full run clear · ${diff().label} · score ${state.score}`
      : `Level ${state.levelIndex + 1} clear · score ${state.score} · wells left ${state.wellsLeft}`;
    btnStart.hidden = true;
    btnNext.hidden = false;
    btnNext.textContent = last ? 'Menu' : 'Next level';
    showDiffUI(last);
    sfx.play('win');
  } else if (kind === 'dead') {
    titleEl.textContent = 'LOST IN THE VOID';
    blurbEl.textContent =
      `Hit singularity / wall / void. Retry · ${diff().label} (${wellsForLevel(state.levelIndex)} wells this level). Tip: place wells ahead of the comet, not on it.`;
    btnStart.hidden = false;
    btnStart.textContent = 'Retry';
    btnNext.hidden = true;
    showDiffUI(true);
    updateDiffPreview();
    sfx.play('die');
  }
}

function circleRectHit(cx, cy, cr, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < cr * cr;
}

function die() {
  if (state.mode !== 'play') return;
  state.mode = 'dead';
  state.shake = 10;
  spawnBurst(state.comet.x, state.comet.y, 'rgba(255,92,122,0.95)', 20);
  showOverlay('dead');
}

function win() {
  if (state.mode !== 'play') return;
  state.mode = 'win';
  state.score += 100 + state.wellsLeft * 15;
  updateHud();
  spawnBurst(state.portal.x, state.portal.y, 'rgba(92,225,255,0.95)', 24);
  showOverlay('win');
}

let last = performance.now();

function update(dt) {
  // particles always
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 20);

  if (state.mode !== 'play') return;

  const c = state.comet;

  // wells decay + gravity
  for (let i = state.wells.length - 1; i >= 0; i--) {
    const w = state.wells[i];
    w.life -= dt;
    if (w.life <= 0) {
      state.wells.splice(i, 1);
      continue;
    }
    const dx = w.x - c.x;
    const dy = w.y - c.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const strength = 5200 * diff().strength * (w.life / w.maxLife);
    // soften near core so it doesn't nail-gun into center always
    const force = strength / (d * d + 800);
    c.vx += (dx / d) * force * dt;
    c.vy += (dy / d) * force * dt;
  }

  // light drag + speed clamp for readability
  c.vx *= 1 - 0.08 * dt;
  c.vy *= 1 - 0.08 * dt;
  const sp = Math.hypot(c.vx, c.vy);
  const maxSp = diff().maxSpeed;
  if (sp > maxSp) {
    c.vx = (c.vx / sp) * maxSp;
    c.vy = (c.vy / sp) * maxSp;
  }

  c.x += c.vx * dt;
  c.y += c.vy * dt;

  c.trail.push({ x: c.x, y: c.y });
  if (c.trail.length > 28) c.trail.shift();

  // bounds
  const margin = 8;
  if (c.x < -margin || c.x > W + margin || c.y < -margin || c.y > H + margin) {
    die();
    return;
  }

  // hazards
  for (const h of state.hazards) {
    if (dist(c, h) < h.r + 6) {
      die();
      return;
    }
  }

  // walls
  for (const w of state.walls) {
    if (circleRectHit(c.x, c.y, 6, w.x, w.y, w.w, w.h)) {
      die();
      return;
    }
  }

  // stars
  for (const s of state.stars) {
    if (!s.taken && dist(c, s) < s.r + 8) {
      s.taken = true;
      state.score += 25;
      state.wellsLeft += 1;
      updateHud();
      sfx.play('pickup');
      spawnBurst(s.x, s.y, 'rgba(255,209,102,0.95)', 10);
    }
  }

  // portal
  if (dist(c, state.portal) < state.portal.r - 4) {
    win();
  }
}

function draw() {
  const shx = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const shy = state.shake ? (Math.random() - 0.5) * state.shake : 0;

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.translate(shx, shy);

  // subtle playfield grid
  ctx.strokeStyle = 'rgba(92,225,255,0.05)';
  ctx.lineWidth = 1;
  for (let x = 40; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 40; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // walls
  for (const w of state.walls) {
    ctx.fillStyle = 'rgba(140,160,220,0.35)';
    ctx.strokeStyle = 'rgba(200,220,255,0.5)';
    ctx.lineWidth = 2;
    roundRect(ctx, w.x, w.y, w.w, w.h, 6);
    ctx.fill();
    ctx.stroke();
  }

  // hazards
  const t = performance.now() / 1000;
  for (const h of state.hazards) {
    const pulse = 1 + Math.sin(t * 4 + h.x) * 0.06;
    const grd = ctx.createRadialGradient(h.x, h.y, 2, h.x, h.y, h.r * pulse);
    grd.addColorStop(0, 'rgba(40,0,10,0.95)');
    grd.addColorStop(0.5, 'rgba(255,60,100,0.55)');
    grd.addColorStop(1, 'rgba(255,60,100,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r * pulse * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,100,130,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // portal
  {
    const p = state.portal;
    for (let i = 3; i >= 1; i--) {
      ctx.strokeStyle = `rgba(92,225,255,${0.15 * i})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + i * 6 + Math.sin(t * 3) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#5ce1ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(92,225,255,0.12)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r - 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // stars
  for (const s of state.stars) {
    if (s.taken) continue;
    drawStar(ctx, s.x, s.y, 5, s.r, s.r * 0.45, t);
  }

  // wells
  for (const w of state.wells) {
    const a = w.life / w.maxLife;
    const grd = ctx.createRadialGradient(w.x, w.y, 2, w.x, w.y, w.r);
    grd.addColorStop(0, `rgba(200,160,255,${0.35 * a})`);
    grd.addColorStop(0.5, `rgba(120,80,255,${0.15 * a})`);
    grd.addColorStop(1, 'rgba(120,80,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(200,170,255,${0.7 * a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 10 + (1 - a) * 8, 0, Math.PI * 2);
    ctx.stroke();
    // swirl ticks
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = t * 2 + (i / 8) * Math.PI * 2;
      const rr = 14 + a * 20;
      ctx.moveTo(w.x + Math.cos(ang) * 8, w.y + Math.sin(ang) * 8);
      ctx.lineTo(w.x + Math.cos(ang) * rr, w.y + Math.sin(ang) * rr);
    }
    ctx.stroke();
  }

  // comet trail
  const c = state.comet;
  if (c.trail.length > 1) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < c.trail.length; i++) {
      const p0 = c.trail[i - 1];
      const p1 = c.trail[i];
      const alpha = i / c.trail.length;
      ctx.strokeStyle = `rgba(255,180,220,${alpha * 0.55})`;
      ctx.lineWidth = 2 + alpha * 4;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  // comet body
  {
    const grd = ctx.createRadialGradient(c.x - 2, c.y - 2, 1, c.x, c.y, 14);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.35, '#ffe0f0');
    grd.addColorStop(1, 'rgba(255,120,200,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // particles
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStar(ctx, x, y, spikes, outer, inner, t) {
  const rot = t * 1.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / spikes - Math.PI / 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd166';
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// boot
setDifficulty('normal');
loadLevel(0);
showDiffUI(true);
requestAnimationFrame(loop);
