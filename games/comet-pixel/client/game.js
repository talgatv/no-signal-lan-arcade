/**
 * Comet Pixel — grid-snapped gravity wells, chunky pixel framebuffer
 * Variation of `comet` (family: comet)
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const sfx = createOghSfx();

/** Internal resolution (scaled up by CSS) */
const W = 160;
const H = 224;
const GRID = 8;

/** 12-color-ish palette */
const C = {
  void: '#1a1028',
  void2: '#140c1c',
  grid: '#241832',
  white: '#fff8f0',
  comet: '#ffe0f0',
  pink: '#ff6bcb',
  cyan: '#5ce1ff',
  purple: '#c4a0ff',
  gold: '#ffd166',
  red: '#ff5c7a',
  redDark: '#801028',
  wall: '#6a7aaa',
  dim: '#4a4060',
};

const $ = (id) => document.getElementById(id);
const overlay = $('overlay');
const btnStart = $('btnStart');
const btnNext = $('btnNext');
const titleEl = $('title');
const blurbEl = $('blurb');
const hintEl = $('hint');
const diffBlock = $('diffBlock');
const diffPreview = $('diffPreview');

const DIFFICULTIES = {
  easy: {
    id: 'easy',
    label: 'EASY',
    short: 'ESY',
    wellBonus: 5,
    wellMult: 1.35,
    wellLife: 4.4,
    strength: 1.32,
    hazardScale: 0.85,
    speedMult: 0.72,
    maxSpeed: 200,
  },
  normal: {
    id: 'normal',
    label: 'NRM',
    short: 'NRM',
    wellBonus: 2,
    wellMult: 1.15,
    wellLife: 3.4,
    strength: 1.08,
    hazardScale: 1,
    speedMult: 1,
    maxSpeed: 280,
  },
  hard: {
    id: 'hard',
    label: 'HARD',
    short: 'HRD',
    wellBonus: 0,
    wellMult: 1,
    wellLife: 2.8,
    strength: 0.92,
    hazardScale: 1.1,
    speedMult: 1.28,
    maxSpeed: 360,
  },
};

const LEVELS = [
  {
    name: 'TUTORIAL',
    wells: 4,
    comet: { x: 0.5, y: 0.82, vx: 0, vy: -52 },
    portal: { x: 0.5, y: 0.14, r: 7 },
    stars: [
      { x: 0.5, y: 0.5 },
      { x: 0.35, y: 0.38 },
    ],
    hazards: [],
    walls: [],
  },
  {
    name: 'SLING',
    wells: 6,
    comet: { x: 0.16, y: 0.8, vx: 18, vy: -36 },
    portal: { x: 0.84, y: 0.16, r: 8 },
    stars: [
      { x: 0.28, y: 0.62 },
      { x: 0.45, y: 0.48 },
      { x: 0.68, y: 0.32 },
    ],
    hazards: [{ x: 0.58, y: 0.52, r: 4 }],
    walls: [],
  },
  {
    name: 'NEEDLE',
    wells: 6,
    comet: { x: 0.5, y: 0.88, vx: 0, vy: -36 },
    portal: { x: 0.5, y: 0.1, r: 7 },
    stars: [
      { x: 0.22, y: 0.55 },
      { x: 0.78, y: 0.55 },
      { x: 0.5, y: 0.35 },
    ],
    hazards: [
      { x: 0.35, y: 0.45, r: 4 },
      { x: 0.65, y: 0.45, r: 4 },
    ],
    walls: [
      { x: 0.2, y: 0.28, w: 0.25, h: 0.04 },
      { x: 0.55, y: 0.28, w: 0.25, h: 0.04 },
    ],
  },
  {
    name: 'TWINS',
    wells: 7,
    comet: { x: 0.12, y: 0.5, vx: 46, vy: 0 },
    portal: { x: 0.88, y: 0.5, r: 7 },
    stars: [
      { x: 0.5, y: 0.22 },
      { x: 0.5, y: 0.78 },
      { x: 0.35, y: 0.5 },
      { x: 0.65, y: 0.5 },
    ],
    hazards: [
      { x: 0.42, y: 0.35, r: 6 },
      { x: 0.58, y: 0.65, r: 6 },
    ],
    walls: [],
  },
  {
    name: 'GAUNTLET',
    wells: 8,
    comet: { x: 0.5, y: 0.9, vx: 16, vy: -30 },
    portal: { x: 0.5, y: 0.08, r: 6 },
    stars: [
      { x: 0.2, y: 0.7 },
      { x: 0.8, y: 0.7 },
      { x: 0.2, y: 0.4 },
      { x: 0.8, y: 0.4 },
      { x: 0.5, y: 0.25 },
    ],
    hazards: [
      { x: 0.5, y: 0.55, r: 5 },
      { x: 0.28, y: 0.35, r: 4 },
      { x: 0.72, y: 0.35, r: 4 },
    ],
    walls: [
      { x: 0.1, y: 0.62, w: 0.28, h: 0.035 },
      { x: 0.62, y: 0.62, w: 0.28, h: 0.035 },
    ],
  },
];

const state = {
  mode: 'title',
  difficulty: 'normal',
  levelIndex: 0,
  score: 0,
  wellsLeft: 0,
  wells: [],
  stars: [],
  hazards: [],
  walls: [],
  portal: { x: 0, y: 0, r: 7 },
  comet: { x: 0, y: 0, vx: 0, vy: 0, trail: [] },
  particles: [],
  tick: 0,
  hover: null,
};

function diff() {
  return DIFFICULTIES[state.difficulty] || DIFFICULTIES.normal;
}

function wellsForLevel(levelIndex) {
  const L = LEVELS[levelIndex % LEVELS.length];
  const d = diff();
  return Math.max(1, Math.ceil(L.wells * d.wellMult) + d.wellBonus);
}

function px(n, axis) {
  return n * (axis === 'x' ? W : H);
}

function snap(v) {
  return Math.round(v / GRID) * GRID + GRID / 2;
}

function setDifficulty(id) {
  if (!DIFFICULTIES[id]) return;
  state.difficulty = id;
  document.querySelectorAll('.pixel-diff-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.diff === id);
  });
  updateDiffPreview();
  updateHud();
}

function updateDiffPreview() {
  if (!diffPreview) return;
  const d = diff();
  diffPreview.textContent =
    `${d.label}: W L1=${wellsForLevel(0)} L2=${wellsForLevel(1)} · SPD×${d.speedMult.toFixed(2)}`;
}

function showDiffUI(show) {
  if (!diffBlock) return;
  diffBlock.hidden = !show;
}

function loadLevel(i) {
  const L = LEVELS[i % LEVELS.length];
  const d = diff();
  state.levelIndex = i;
  state.wellsLeft = wellsForLevel(i);
  state.wells = [];
  state.particles = [];
  state.comet = {
    x: px(L.comet.x, 'x'),
    y: px(L.comet.y, 'y'),
    vx: L.comet.vx * d.speedMult,
    vy: L.comet.vy * d.speedMult,
    trail: [],
  };
  state.portal = {
    x: snap(px(L.portal.x, 'x')),
    y: snap(px(L.portal.y, 'y')),
    r: L.portal.r,
  };

  state.stars = L.stars.map((s) => ({
    x: snap(px(s.x, 'x')),
    y: snap(px(s.y, 'y')),
    taken: false,
  }));
  state.hazards = L.hazards.map((h) => ({
    x: snap(px(h.x, 'x')),
    y: snap(px(h.y, 'y')),
    r: Math.max(2, Math.round(h.r * d.hazardScale)),
  }));
  state.walls = L.walls.map((w) => ({
    x: Math.floor(px(w.x, 'x') / GRID) * GRID,
    y: Math.floor(px(w.y, 'y') / GRID) * GRID,
    w: Math.max(GRID, Math.round((w.w * W) / GRID) * GRID),
    h: Math.max(GRID, Math.round((w.h * H) / GRID) * GRID),
  }));
  updateHud();
  hintEl.textContent = `${L.name} · ${d.label} · W${state.wellsLeft} · SPD×${d.speedMult}`;
}

function updateHud() {
  const d = diff();
  $('hudLevel').textContent = `L${state.levelIndex + 1}`;
  $('hudDiff').textContent = d.short;
  $('hudScore').textContent = `*${state.score}`;
  $('hudWells').textContent = `W${state.wellsLeft}`;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function burst(x, y, color, n = 6) {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    state.particles.push({
      x: Math.floor(x),
      y: Math.floor(y),
      vx: Math.cos(a) * (20 + Math.random() * 30),
      vy: Math.sin(a) * (20 + Math.random() * 30),
      life: 0.35,
      color,
    });
  }
}

function placeWell(x, y) {
  if (state.mode !== 'play' || state.wellsLeft <= 0) return;
  const sx = snap(x);
  const sy = snap(y);

  for (const h of state.hazards) {
    if (dist({ x: sx, y: sy }, h) < h.r + GRID) return;
  }
  // no stack exact same cell
  for (const w of state.wells) {
    if (w.x === sx && w.y === sy) return;
  }

  const life = diff().wellLife;
  state.wellsLeft -= 1;
  state.wells.push({ x: sx, y: sy, r: 18, life: life, maxLife: life });
  sfx.play('place');
  updateHud();
  burst(sx, sy, C.purple, 5);
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
canvas.addEventListener('mousemove', (e) => {
  const p = eventToCanvas(e);
  state.hover = { x: snap(p.x), y: snap(p.y) };
});
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const p = eventToCanvas(e);
  state.hover = { x: snap(p.x), y: snap(p.y) };
}, { passive: false });

document.querySelectorAll('.pixel-diff-btn').forEach((btn) => {
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
  if (state.mode === 'title') {
    state.score = 0;
    state.levelIndex = 0;
  }
  loadLevel(state.levelIndex);
  state.mode = 'play';
  overlay.hidden = true;
  showDiffUI(false);
  btnNext.hidden = true;
  btnStart.hidden = false;
});

btnNext.addEventListener('click', () => {
  sfx.play('tap');
  const last = state.levelIndex >= LEVELS.length - 1;
  if (last) {
    state.mode = 'title';
    state.levelIndex = 0;
    titleEl.innerHTML = 'COMET<br />PIXEL';
    blurbEl.innerHTML =
      'GRID WELLS. GUIDE COMET.<br />STARS = FUEL. RED = DEATH.<br />CYAN GATE = WIN.';
    btnNext.hidden = true;
    btnStart.hidden = false;
    btnStart.textContent = 'AGAIN';
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
    titleEl.textContent = last ? 'CLEAR!' : 'GATE OK';
    blurbEl.textContent = last
      ? `SCORE ${state.score} · ${diff().label}`
      : `LVL ${state.levelIndex + 1} · *${state.score} · W${state.wellsLeft}`;
    btnStart.hidden = true;
    btnNext.hidden = false;
    btnNext.textContent = last ? 'MENU' : 'NEXT';
    showDiffUI(last);
    sfx.play('win');
  } else {
    titleEl.textContent = 'BOOM';
    blurbEl.textContent = `VOID · ${diff().label} · W${wellsForLevel(state.levelIndex)} THIS LVL`;
    btnStart.hidden = false;
    btnStart.textContent = 'RETRY';
    btnNext.hidden = true;
    showDiffUI(true);
    updateDiffPreview();
    sfx.play('die');
  }
}

function circleRectHit(cx, cy, cr, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < cr * cr;
}

function die() {
  if (state.mode !== 'play') return;
  state.mode = 'dead';
  burst(state.comet.x, state.comet.y, C.red, 10);
  showOverlay('dead');
}

function win() {
  if (state.mode !== 'play') return;
  state.mode = 'win';
  state.score += 100 + state.wellsLeft * 15;
  updateHud();
  burst(state.portal.x, state.portal.y, C.cyan, 12);
  showOverlay('win');
}

/** 3x5 pixel font (digits + few letters via fillRect map) — numbers only for HUD on canvas optional */
function fillPixelCircle(cx, cy, r, color) {
  ctx.fillStyle = color;
  const r2 = r * r;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      // chunky circle: include diamond-ish for small r
      if (x * x + y * y <= r2 + r * 0.2) {
        ctx.fillRect(Math.floor(cx + x), Math.floor(cy + y), 1, 1);
      }
    }
  }
}

function fillPixelRing(cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let a = 0; a < Math.PI * 2; a += 0.12) {
    const x = Math.round(cx + Math.cos(a) * r);
    const y = Math.round(cy + Math.sin(a) * r);
    ctx.fillRect(x, y, 1, 1);
  }
}

let last = performance.now();

function update(dt) {
  state.tick += dt;

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  if (state.mode !== 'play') return;

  const c = state.comet;

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
    // slightly stronger / shorter range for chunky feel
    const strength = 3800 * diff().strength * (w.life / w.maxLife);
    const force = strength / (d * d + 400);
    c.vx += (dx / d) * force * dt;
    c.vy += (dy / d) * force * dt;
  }

  c.vx *= 1 - 0.12 * dt;
  c.vy *= 1 - 0.12 * dt;
  const sp = Math.hypot(c.vx, c.vy);
  const maxSp = diff().maxSpeed;
  if (sp > maxSp) {
    c.vx = (c.vx / sp) * maxSp;
    c.vy = (c.vy / sp) * maxSp;
  }

  c.x += c.vx * dt;
  c.y += c.vy * dt;

  // trail stores integer pixels
  c.trail.push({ x: Math.round(c.x), y: Math.round(c.y) });
  if (c.trail.length > 16) c.trail.shift();

  if (c.x < -4 || c.x > W + 4 || c.y < -4 || c.y > H + 4) {
    die();
    return;
  }

  for (const h of state.hazards) {
    if (dist(c, h) < h.r + 2) {
      die();
      return;
    }
  }

  for (const w of state.walls) {
    if (circleRectHit(c.x, c.y, 2, w.x, w.y, w.w, w.h)) {
      die();
      return;
    }
  }

  for (const s of state.stars) {
    if (!s.taken && dist(c, s) < 6) {
      s.taken = true;
      state.score += 25;
      state.wellsLeft += 1;
      updateHud();
      sfx.play('pickup');
      burst(s.x, s.y, C.gold, 6);
    }
  }

  if (dist(c, state.portal) < state.portal.r - 1) {
    win();
  }
}

function drawBg() {
  ctx.fillStyle = C.void;
  ctx.fillRect(0, 0, W, H);

  // checker / grid sky
  for (let y = 0; y < H; y += GRID) {
    for (let x = 0; x < W; x += GRID) {
      if (((x + y) / GRID) % 2 === 0) {
        ctx.fillStyle = C.grid;
        ctx.fillRect(x, y, GRID, GRID);
      }
    }
  }

  // sparse stars (deterministic)
  ctx.fillStyle = C.dim;
  for (let i = 0; i < 28; i++) {
    const x = (i * 47 + 13) % W;
    const y = (i * 89 + 29) % H;
    if ((i + Math.floor(state.tick * 2)) % 7 !== 0) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawStar(x, y) {
  const t = Math.floor(state.tick * 6) % 2;
  ctx.fillStyle = C.gold;
  // plus shape
  ctx.fillRect(x - 2, y, 5, 1);
  ctx.fillRect(x, y - 2, 1, 5);
  if (t) {
    ctx.fillRect(x - 1, y - 1, 1, 1);
    ctx.fillRect(x + 1, y - 1, 1, 1);
    ctx.fillRect(x - 1, y + 1, 1, 1);
    ctx.fillRect(x + 1, y + 1, 1, 1);
  }
}

function draw() {
  drawBg();

  // walls
  for (const w of state.walls) {
    ctx.fillStyle = C.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = C.white;
    ctx.fillRect(w.x, w.y, w.w, 1);
  }

  // hazards — blocky black holes
  for (const h of state.hazards) {
    fillPixelCircle(h.x, h.y, h.r + 2, C.redDark);
    fillPixelCircle(h.x, h.y, h.r, C.red);
    fillPixelCircle(h.x, h.y, Math.max(1, h.r - 3), C.void2);
    // teeth
    ctx.fillStyle = C.red;
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + state.tick * 2;
      const px = Math.round(h.x + Math.cos(ang) * (h.r + 1));
      const py = Math.round(h.y + Math.sin(ang) * (h.r + 1));
      ctx.fillRect(px, py, 2, 2);
    }
  }

  // portal
  {
    const p = state.portal;
    const phase = Math.floor(state.tick * 8) % 3;
    fillPixelRing(p.x, p.y, p.r + phase, C.cyan);
    fillPixelRing(p.x, p.y, p.r, C.white);
    fillPixelCircle(p.x, p.y, 2, C.cyan);
  }

  // stars
  for (const s of state.stars) {
    if (!s.taken) drawStar(s.x, s.y);
  }

  // wells
  for (const w of state.wells) {
    const a = w.life / w.maxLife;
    const rad = 3 + Math.floor((1 - a) * 4);
    fillPixelCircle(w.x, w.y, rad + 4, C.purple);
    fillPixelCircle(w.x, w.y, rad, C.void);
    // crosshair
    ctx.fillStyle = C.purple;
    ctx.fillRect(w.x - 4, w.y, 9, 1);
    ctx.fillRect(w.x, w.y - 4, 1, 9);
  }

  // ghost hover cell
  if (state.hover && state.mode === 'play' && state.wellsLeft > 0) {
    ctx.fillStyle = 'rgba(196,160,255,0.35)';
    ctx.fillRect(state.hover.x - GRID / 2, state.hover.y - GRID / 2, GRID, GRID);
  }

  // trail
  const c = state.comet;
  for (let i = 0; i < c.trail.length; i++) {
    const p = c.trail[i];
    const k = i / c.trail.length;
    ctx.fillStyle = k > 0.6 ? C.pink : C.purple;
    ctx.fillRect(p.x, p.y, k > 0.8 ? 2 : 1, k > 0.8 ? 2 : 1);
  }

  // comet body — 5x5 sprite
  {
    const x = Math.round(c.x);
    const y = Math.round(c.y);
    const spr = [
      '  .  ',
      ' ... ',
      '.....',
      ' ... ',
      '  .  ',
    ];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const ch = spr[row][col];
        if (ch === '.') {
          ctx.fillStyle = row === 2 && col === 2 ? C.white : C.comet;
          ctx.fillRect(x + col - 2, y + row - 2, 1, 1);
        }
      }
    }
  }

  // particles
  for (const p of state.particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 2, 2);
  }

  // border
  ctx.strokeStyle = C.cyan;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
}

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

setDifficulty('normal');
loadLevel(0);
showDiffUI(true);
requestAnimationFrame(loop);
