/**
 * Rootwork — 2D dig-build sandbox (not Minecraft)
 * Solo MVP · touch / mouse / keyboard · ultra-light tile world
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';

const SAVE_KEY = 'ogh_rootwork_v1';
const TW = 128; // world width in tiles
const TH = 72;  // world height
const TS = 12;  // tile pixel size (internal buffer scale)
const SURFACE = 18;

/** @enum {number} */
const T = {
  AIR: 0,
  SOIL: 1,
  CLAY: 2,
  STONE: 3,
  ROOT: 4,
  CRYSTAL: 5,
  MYCEL: 6,
  BEDROCK: 7,
};

const BLOCKS = {
  [T.AIR]: { name: 'Air', solid: false, hp: 0, color: null, light: 0, drop: null },
  [T.SOIL]: { name: 'Soil', solid: true, hp: 2, color: '#6b4a2e', color2: '#5a3c24', light: 0, drop: T.SOIL },
  [T.CLAY]: { name: 'Clay', solid: true, hp: 3, color: '#8a6a50', color2: '#7a5a42', light: 0, drop: T.CLAY },
  [T.STONE]: { name: 'Stone', solid: true, hp: 5, color: '#5a5a62', color2: '#484850', light: 0, drop: T.STONE },
  [T.ROOT]: { name: 'Rootwood', solid: true, hp: 3, color: '#8b5a2b', color2: '#6e4420', light: 0, drop: T.ROOT },
  [T.CRYSTAL]: { name: 'Crystal', solid: true, hp: 4, color: '#5ce1ff', color2: '#3a90b0', light: 8, drop: T.CRYSTAL },
  [T.MYCEL]: { name: 'Mycel', solid: true, hp: 1, color: '#7a5a8a', color2: '#5a3a6a', light: 1, drop: T.MYCEL },
  [T.BEDROCK]: { name: 'Bedrock', solid: true, hp: 999, color: '#1a1418', color2: '#0e0a0c', light: 0, drop: null },
};

const PLACEABLE = [T.SOIL, T.CLAY, T.STONE, T.ROOT, T.CRYSTAL, T.MYCEL];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const sfx = createOghSfx();

const $ = (id) => document.getElementById(id);
const overlay = $('overlay');
const invEl = $('inv');

const state = {
  playing: false,
  mode: 'dig', // dig | place
  world: null, // Uint8Array TW*TH
  hp: null,    // Uint8Array remaining dig hits
  inv: Object.fromEntries(PLACEABLE.map((id) => [id, 0])),
  sel: T.ROOT,
  player: { x: 0, y: 0, vx: 0, vy: 0, w: 8, h: 10, onGround: false, face: 1 },
  cam: { x: 0, y: 0 },
  keys: {},
  stick: { x: 0, y: 0, active: false },
  breakTx: -1,
  breakTy: -1,
  breakProg: 0,
  particles: [],
  lightCache: null,
  lightDirty: true,
  seed: 1,
  time: 0,
  actHold: false,
};

function idx(x, y) {
  return y * TW + x;
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < TW && y < TH;
}

function getTile(x, y) {
  if (!inBounds(x, y)) return T.BEDROCK;
  return state.world[idx(x, y)];
}

function setTile(x, y, id) {
  if (!inBounds(x, y)) return;
  if (getTile(x, y) === T.BEDROCK && id !== T.BEDROCK) return;
  state.world[idx(x, y)] = id;
  state.hp[idx(x, y)] = BLOCKS[id].hp > 200 ? 255 : BLOCKS[id].hp;
  state.lightDirty = true;
}

function hash(n) {
  n = Math.imul(n ^ (n >>> 16), 2246822507);
  n = Math.imul(n ^ (n >>> 13), 3266489909);
  return (n ^= n >>> 16) >>> 0;
}

function noise1(x, seed) {
  return (hash(x * 374761393 + seed * 668265263) % 10000) / 10000;
}

function surfaceY(x, seed) {
  const n =
    noise1(x, seed) * 4 +
    noise1(Math.floor(x / 3), seed + 1) * 6 +
    noise1(Math.floor(x / 8), seed + 2) * 5;
  return Math.floor(SURFACE + n);
}

function generate(seed) {
  const world = new Uint8Array(TW * TH);
  const hp = new Uint8Array(TW * TH);
  for (let y = 0; y < TH; y++) {
    for (let x = 0; x < TW; x++) {
      let id = T.AIR;
      const sy = surfaceY(x, seed);
      if (y >= TH - 2) id = T.BEDROCK;
      else if (y > sy + 14 + (hash(x * 13 + y * 7 + seed) % 5)) {
        id = T.STONE;
        // crystal veins
        if (hash(x * 91 + y * 51 + seed) % 47 === 0) id = T.CRYSTAL;
        else if (hash(x * 17 + y * 31 + seed) % 23 === 0) id = T.MYCEL;
      } else if (y > sy + 5) {
        id = hash(x + y * 3 + seed) % 5 === 0 ? T.CLAY : T.STONE;
      } else if (y > sy) {
        id = y > sy + 2 ? T.CLAY : T.SOIL;
        if (hash(x * 3 + y + seed) % 40 === 0) id = T.ROOT;
      } else if (y === sy) {
        id = T.SOIL;
      }
      // small root clusters near surface
      if (y > sy && y < sy + 8 && hash(x * 101 + y * 3 + seed) % 55 === 0) id = T.ROOT;

      world[idx(x, y)] = id;
      hp[idx(x, y)] = BLOCKS[id].hp > 200 ? 255 : BLOCKS[id].hp;
    }
  }
  // carve a starter pocket
  const sx = (TW / 2) | 0;
  const sy = surfaceY(sx, seed) - 1;
  for (let dy = -2; dy <= 1; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = sx + dx;
      const y = sy + dy;
      if (inBounds(x, y) && world[idx(x, y)] !== T.BEDROCK) {
        world[idx(x, y)] = T.AIR;
        hp[idx(x, y)] = 0;
      }
    }
  }
  // starter platform of rootwood
  for (let dx = -2; dx <= 2; dx++) {
    const x = sx + dx;
    const y = sy + 2;
    if (inBounds(x, y)) {
      world[idx(x, y)] = T.ROOT;
      hp[idx(x, y)] = BLOCKS[T.ROOT].hp;
    }
  }

  return {
    world,
    hp,
    spawn: { x: sx * TS + TS / 2, y: (sy - 1) * TS },
  };
}

function resetInv() {
  state.inv = Object.fromEntries(PLACEABLE.map((id) => [id, 0]));
  state.inv[T.ROOT] = 12;
  state.inv[T.SOIL] = 8;
  state.sel = T.ROOT;
}

function newWorld() {
  state.seed = (Math.random() * 1e9) | 0;
  const g = generate(state.seed);
  state.world = g.world;
  state.hp = g.hp;
  state.player.x = g.spawn.x;
  state.player.y = g.spawn.y;
  state.player.vx = 0;
  state.player.vy = 0;
  resetInv();
  state.lightDirty = true;
  save();
}

function save() {
  try {
    const data = {
      seed: state.seed,
      world: Array.from(state.world),
      hp: Array.from(state.hp),
      inv: state.inv,
      sel: state.sel,
      mode: state.mode,
      player: {
        x: state.player.x,
        y: state.player.y,
      },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (_) { /* quota */ }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data.world || data.world.length !== TW * TH) return false;
    state.seed = data.seed || 1;
    state.world = Uint8Array.from(data.world);
    state.hp = data.hp && data.hp.length === TW * TH
      ? Uint8Array.from(data.hp)
      : new Uint8Array(TW * TH);
    if (!data.hp) {
      for (let i = 0; i < TW * TH; i++) {
        const id = state.world[i];
        state.hp[i] = BLOCKS[id].hp > 200 ? 255 : BLOCKS[id].hp;
      }
    }
    state.inv = { ...Object.fromEntries(PLACEABLE.map((id) => [id, 0])), ...data.inv };
    state.sel = data.sel ?? T.ROOT;
    state.mode = data.mode === 'place' ? 'place' : 'dig';
    state.player.x = data.player?.x ?? TW * TS / 2;
    state.player.y = data.player?.y ?? SURFACE * TS;
    state.lightDirty = true;
    return true;
  } catch (_) {
    return false;
  }
}

function solidAt(px, py) {
  const tx = Math.floor(px / TS);
  const ty = Math.floor(py / TS);
  return BLOCKS[getTile(tx, ty)].solid;
}

function rectSolid(x, y, w, h) {
  // sample corners + mid
  const pts = [
    [x, y], [x + w - 0.1, y],
    [x, y + h - 0.1], [x + w - 0.1, y + h - 0.1],
    [x + w / 2, y], [x + w / 2, y + h - 0.1],
    [x, y + h / 2], [x + w - 0.1, y + h / 2],
  ];
  for (const [px, py] of pts) {
    if (solidAt(px, py)) return true;
  }
  return false;
}

function movePlayer(dt) {
  const p = state.player;
  const accel = 520;
  const maxRun = 78;
  const gravity = 420;
  const jumpV = -168;
  const friction = 0.82;

  let ix = 0;
  if (state.keys['ArrowLeft'] || state.keys['a'] || state.keys['A']) ix -= 1;
  if (state.keys['ArrowRight'] || state.keys['d'] || state.keys['D']) ix += 1;
  if (state.stick.active) ix += state.stick.x;

  ix = Math.max(-1, Math.min(1, ix));
  if (ix !== 0) p.face = ix > 0 ? 1 : -1;

  p.vx += ix * accel * dt;
  if (ix === 0) p.vx *= Math.pow(friction, dt * 60);
  p.vx = Math.max(-maxRun, Math.min(maxRun, p.vx));

  const wantJump =
    state.keys[' '] || state.keys['ArrowUp'] || state.keys['w'] || state.keys['W'] || state.keys['jump'];
  if (wantJump && p.onGround) {
    p.vy = jumpV;
    p.onGround = false;
    sfx.play('tap');
    state.keys['jump'] = false;
  }

  p.vy += gravity * dt;
  p.vy = Math.min(p.vy, 280);

  // axis-separated collision
  p.x += p.vx * dt;
  if (rectSolid(p.x, p.y, p.w, p.h)) {
    p.x -= p.vx * dt;
    p.vx = 0;
  }

  p.y += p.vy * dt;
  p.onGround = false;
  if (rectSolid(p.x, p.y, p.w, p.h)) {
    if (p.vy > 0) p.onGround = true;
    p.y -= p.vy * dt;
    p.vy = 0;
  }

  // world bounds soft
  p.x = Math.max(2, Math.min(TW * TS - p.w - 2, p.x));
  if (p.y > TH * TS + 40) {
    // fell out — respawn high
    p.y = SURFACE * TS;
    p.vy = 0;
  }
}

function facingTile() {
  const p = state.player;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  let tx = Math.floor(cx / TS) + p.face;
  let ty = Math.floor((cy + 2) / TS);
  // prefer lower if stick down
  if (state.stick.y > 0.45 || state.keys['ArrowDown'] || state.keys['s'] || state.keys['S']) {
    tx = Math.floor(cx / TS);
    ty = Math.floor(cy / TS) + 1;
  } else if (state.stick.y < -0.45) {
    tx = Math.floor(cx / TS);
    ty = Math.floor(cy / TS) - 1;
  }
  return { tx, ty };
}

function canReach(tx, ty) {
  const p = state.player;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const dx = (tx + 0.5) * TS - cx;
  const dy = (ty + 0.5) * TS - cy;
  return Math.hypot(dx, dy) < TS * 2.6;
}

function tryDig(tx, ty, dt) {
  if (!inBounds(tx, ty) || !canReach(tx, ty)) {
    state.breakProg = 0;
    return;
  }
  const id = getTile(tx, ty);
  const b = BLOCKS[id];
  if (!b.solid || id === T.BEDROCK || !b.drop) {
    state.breakProg = 0;
    return;
  }

  if (state.breakTx !== tx || state.breakTy !== ty) {
    state.breakTx = tx;
    state.breakTy = ty;
    state.breakProg = 0;
  }

  // dig rate
  const rate = id === T.STONE ? 1.6 : id === T.CRYSTAL ? 1.4 : 2.4;
  state.breakProg += rate * dt;
  const need = b.hp;
  if (state.breakProg >= need) {
    setTile(tx, ty, T.AIR);
    state.inv[b.drop] = (state.inv[b.drop] || 0) + 1;
    state.breakProg = 0;
    sfx.play('place');
    spawnDust(tx, ty, b.color);
    renderInv();
    saveSoon();
  }
}

function tryPlace(tx, ty) {
  if (!inBounds(tx, ty) || !canReach(tx, ty)) return;
  if (getTile(tx, ty) !== T.AIR) return;
  const id = state.sel;
  if (!PLACEABLE.includes(id)) return;
  if ((state.inv[id] || 0) <= 0) return;

  // don't place inside player
  const p = state.player;
  const tileLeft = tx * TS;
  const tileTop = ty * TS;
  const overlap =
    p.x < tileLeft + TS &&
    p.x + p.w > tileLeft &&
    p.y < tileTop + TS &&
    p.y + p.h > tileTop;
  if (overlap) return;

  setTile(tx, ty, id);
  state.inv[id] -= 1;
  sfx.play('pickup');
  spawnDust(tx, ty, BLOCKS[id].color);
  renderInv();
  saveSoon();
}

function spawnDust(tx, ty, color) {
  for (let i = 0; i < 6; i++) {
    state.particles.push({
      x: (tx + 0.5) * TS,
      y: (ty + 0.5) * TS,
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.8) * 40,
      life: 0.35,
      color: color || '#888',
    });
  }
}

let saveTimer = 0;
function saveSoon() {
  saveTimer = 0.8;
}

function rebuildLight() {
  // simple flood from crystals + surface ambient
  const light = new Uint8Array(TW * TH);
  const q = [];
  for (let x = 0; x < TW; x++) {
    for (let y = 0; y < Math.min(SURFACE + 6, TH); y++) {
      if (getTile(x, y) === T.AIR) {
        light[idx(x, y)] = 10;
        q.push(x, y);
      }
    }
  }
  for (let y = 0; y < TH; y++) {
    for (let x = 0; x < TW; x++) {
      const L = BLOCKS[getTile(x, y)].light;
      if (L > 0) {
        light[idx(x, y)] = Math.max(light[idx(x, y)], L);
        q.push(x, y);
      }
    }
  }
  // BFS dim
  for (let qi = 0; qi < q.length; qi += 2) {
    const x = q[qi];
    const y = q[qi + 1];
    const cur = light[idx(x, y)];
    if (cur <= 1) continue;
    const nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of nbs) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny)) continue;
      const fall = BLOCKS[getTile(nx, ny)].solid ? 2 : 1;
      const nl = cur - fall;
      if (nl > light[idx(nx, ny)]) {
        light[idx(nx, ny)] = nl;
        q.push(nx, ny);
      }
    }
  }
  state.lightCache = light;
  state.lightDirty = false;
}

function draw() {
  const w = canvas.width;
  const h = canvas.height;
  const p = state.player;

  // camera
  state.cam.x = p.x + p.w / 2 - w / 2;
  state.cam.y = p.y + p.h / 2 - h / 2;
  state.cam.x = Math.max(0, Math.min(TW * TS - w, state.cam.x));
  state.cam.y = Math.max(0, Math.min(TH * TS - h, state.cam.y));

  if (state.lightDirty || !state.lightCache) rebuildLight();
  const light = state.lightCache;

  ctx.fillStyle = '#0c0a08';
  ctx.fillRect(0, 0, w, h);

  const x0 = Math.max(0, Math.floor(state.cam.x / TS) - 1);
  const y0 = Math.max(0, Math.floor(state.cam.y / TS) - 1);
  const x1 = Math.min(TW - 1, Math.ceil((state.cam.x + w) / TS) + 1);
  const y1 = Math.min(TH - 1, Math.ceil((state.cam.y + h) / TS) + 1);

  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const id = getTile(tx, ty);
      const b = BLOCKS[id];
      const sx = Math.floor(tx * TS - state.cam.x);
      const sy = Math.floor(ty * TS - state.cam.y);
      const lv = (light[idx(tx, ty)] || 0) / 12;
      const shade = 0.12 + lv * 0.88;

      if (id === T.AIR) {
        // sky gradient near top
        if (ty < SURFACE + 2) {
          const g = 0.15 + (1 - ty / (SURFACE + 2)) * 0.2;
          ctx.fillStyle = `rgb(${30 * g + 20},${40 * g + 18},${50 * g + 22})`;
          ctx.fillRect(sx, sy, TS, TS);
        }
        continue;
      }

      const c = hexToRgb(b.color);
      const c2 = hexToRgb(b.color2 || b.color);
      const mix = (ty + tx) % 2 === 0;
      const r = Math.floor((mix ? c.r : c2.r) * shade);
      const g = Math.floor((mix ? c.g : c2.g) * shade);
      const bl = Math.floor((mix ? c.b : c2.b) * shade);
      ctx.fillStyle = `rgb(${r},${g},${bl})`;
      ctx.fillRect(sx, sy, TS, TS);

      // pixel edge
      ctx.fillStyle = `rgba(0,0,0,${0.25 * shade})`;
      ctx.fillRect(sx, sy + TS - 1, TS, 1);
      ctx.fillRect(sx + TS - 1, sy, 1, TS);

      if (id === T.CRYSTAL) {
        ctx.fillStyle = `rgba(180,240,255,${0.35 + 0.25 * Math.sin(state.time * 4 + tx)})`;
        ctx.fillRect(sx + 3, sy + 3, TS - 6, TS - 6);
      }
    }
  }

  // break progress
  if (state.mode === 'dig' && state.breakProg > 0 && state.breakTx >= 0) {
    const id = getTile(state.breakTx, state.breakTy);
    const need = BLOCKS[id].hp || 1;
    const t = Math.min(1, state.breakProg / need);
    const sx = Math.floor(state.breakTx * TS - state.cam.x);
    const sy = Math.floor(state.breakTy * TS - state.cam.y);
    ctx.strokeStyle = `rgba(255,209,102,${0.5 + t * 0.5})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 1, sy + 1, TS - 2, TS - 2);
    ctx.fillStyle = `rgba(255,80,80,${t * 0.35})`;
    ctx.fillRect(sx, sy, TS, TS * t);
  }

  // target highlight
  const ft = facingTile();
  if (canReach(ft.tx, ft.ty)) {
    const sx = Math.floor(ft.tx * TS - state.cam.x);
    const sy = Math.floor(ft.ty * TS - state.cam.y);
    ctx.strokeStyle = state.mode === 'dig' ? 'rgba(255,120,100,0.7)' : 'rgba(120,220,160,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, sy + 0.5, TS - 1, TS - 1);
  }

  // particles
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life * 2);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - state.cam.x, pt.y - state.cam.y, 2, 2);
    ctx.globalAlpha = 1;
  }

  // player
  const px = Math.floor(p.x - state.cam.x);
  const py = Math.floor(p.y - state.cam.y);
  ctx.fillStyle = '#e8c090';
  ctx.fillRect(px, py, p.w, p.h);
  ctx.fillStyle = '#3a2818';
  ctx.fillRect(px + (p.face > 0 ? 5 : 1), py + 2, 2, 2); // eye
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(px + 1, py + p.h - 3, p.w - 2, 3);

  // vignette underground
  const depth = Math.floor((p.y + p.h) / TS) - SURFACE;
  if (depth > 4) {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.35, (depth - 4) * 0.02)})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function updateHud() {
  $('hudMode').textContent = state.mode.toUpperCase();
  $('btnMode').textContent = state.mode.toUpperCase();
  const p = state.player;
  const tx = Math.floor((p.x + p.w / 2) / TS);
  const ty = Math.floor((p.y + p.h / 2) / TS);
  $('hudPos').textContent = `${tx},${ty}`;
  const depth = Math.max(0, ty - SURFACE);
  $('hudDepth').textContent = depth <= 0 ? 'surface' : `depth ${depth}`;
}

function renderInv() {
  invEl.innerHTML = '';
  for (const id of PLACEABLE) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rw-slot' + (state.sel === id ? ' is-sel' : '');
    btn.title = BLOCKS[id].name;
    btn.innerHTML = `<span class="swatch" style="background:${BLOCKS[id].color}"></span><span class="cnt">${state.inv[id] || 0}</span>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      sfx.play('tap');
      state.sel = id;
      renderInv();
    });
    invEl.appendChild(btn);
  }
}

function setMode(m) {
  state.mode = m;
  updateHud();
  state.breakProg = 0;
}

function toggleMode() {
  setMode(state.mode === 'dig' ? 'place' : 'dig');
  sfx.play('tap');
}

function doAction(dt) {
  const { tx, ty } = facingTile();
  if (state.mode === 'dig') tryDig(tx, ty, dt);
  else {
    // place is discrete
  }
}

function placeOnce() {
  const { tx, ty } = facingTile();
  tryPlace(tx, ty);
}

// ——— Input ———
window.addEventListener('keydown', (e) => {
  state.keys[e.key] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  if (e.key === 'Tab') {
    e.preventDefault();
    toggleMode();
  }
  if (e.key === 'e' || e.key === 'E') setMode('dig');
  if (e.key === 'q' || e.key === 'Q') setMode('place');
  if (e.key === 'f' || e.key === 'F' || e.key === 'Enter') {
    if (state.mode === 'place') placeOnce();
  }
  if (e.key >= '1' && e.key <= '6') {
    state.sel = PLACEABLE[parseInt(e.key, 10) - 1];
    renderInv();
  }
  if (e.key === 'r' && e.shiftKey) {
    if (confirm('New world? Current burrow will be lost.')) {
      newWorld();
      renderInv();
    }
  }
});
window.addEventListener('keyup', (e) => {
  state.keys[e.key] = false;
});

// mouse dig/place on canvas
canvas.addEventListener('mousedown', (e) => {
  if (!state.playing) return;
  sfx.unlock();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX + state.cam.x;
  const my = (e.clientY - rect.top) * scaleY + state.cam.y;
  const tx = Math.floor(mx / TS);
  const ty = Math.floor(my / TS);
  if (!canReach(tx, ty)) return;
  if (state.mode === 'place' || e.button === 2) placeOnceAt(tx, ty);
  else {
    state.breakTx = tx;
    state.breakTy = ty;
    state.mouseDig = true;
  }
});
canvas.addEventListener('mouseup', () => {
  state.mouseDig = false;
  state.breakProg = 0;
});
canvas.addEventListener('mouseleave', () => {
  state.mouseDig = false;
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function placeOnceAt(tx, ty) {
  if (!inBounds(tx, ty) || !canReach(tx, ty)) return;
  if (getTile(tx, ty) !== T.AIR) return;
  const id = state.sel;
  if ((state.inv[id] || 0) <= 0) return;
  const p = state.player;
  const tileLeft = tx * TS;
  const tileTop = ty * TS;
  if (
    p.x < tileLeft + TS &&
    p.x + p.w > tileLeft &&
    p.y < tileTop + TS &&
    p.y + p.h > tileTop
  ) return;
  setTile(tx, ty, id);
  state.inv[id] -= 1;
  sfx.play('pickup');
  spawnDust(tx, ty, BLOCKS[id].color);
  renderInv();
  saveSoon();
}

// touch stick
const stickZone = $('stickZone');
const stickKnob = $('stickKnob');
function stickFromEvent(e, end = false) {
  const t = e.touches ? e.touches[0] : e;
  if (!t || end) {
    state.stick = { x: 0, y: 0, active: false };
    stickKnob.style.transform = 'translate(-50%, -50%)';
    return;
  }
  const rect = stickZone.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = t.clientX - cx;
  let dy = t.clientY - cy;
  const max = 40;
  const len = Math.hypot(dx, dy) || 1;
  if (len > max) {
    dx = (dx / len) * max;
    dy = (dy / len) * max;
  }
  state.stick = { x: dx / max, y: dy / max, active: true };
  stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}
stickZone.addEventListener('touchstart', (e) => { e.preventDefault(); stickFromEvent(e); }, { passive: false });
stickZone.addEventListener('touchmove', (e) => { e.preventDefault(); stickFromEvent(e); }, { passive: false });
stickZone.addEventListener('touchend', (e) => { e.preventDefault(); stickFromEvent(e, true); }, { passive: false });

$('btnJump').addEventListener('touchstart', (e) => {
  e.preventDefault();
  state.keys['jump'] = true;
}, { passive: false });
$('btnJump').addEventListener('mousedown', () => { state.keys['jump'] = true; });

$('btnMode').addEventListener('click', () => toggleMode());

$('btnAct').addEventListener('touchstart', (e) => {
  e.preventDefault();
  sfx.unlock();
  if (state.mode === 'place') placeOnce();
  else state.actHold = true;
}, { passive: false });
$('btnAct').addEventListener('touchend', () => {
  state.actHold = false;
  state.breakProg = 0;
});
$('btnAct').addEventListener('mousedown', () => {
  sfx.unlock();
  if (state.mode === 'place') placeOnce();
  else state.actHold = true;
});
$('btnAct').addEventListener('mouseup', () => {
  state.actHold = false;
  state.breakProg = 0;
});

$('btnStart').addEventListener('click', () => {
  sfx.unlock();
  sfx.play('tap');
  if (!state.world) {
    if (!load()) newWorld();
  }
  state.playing = true;
  overlay.hidden = true;
  renderInv();
  updateHud();
});

$('btnNew').addEventListener('click', () => {
  sfx.unlock();
  if (confirm('Create a new burrow?')) {
    newWorld();
    state.playing = true;
    overlay.hidden = true;
    renderInv();
    updateHud();
    sfx.play('win');
  }
});

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  state.time += dt;

  if (state.playing) {
    movePlayer(dt);

    if (state.actHold || state.keys['e'] || state.keys['E'] || state.mouseDig) {
      if (state.mode === 'dig') {
        if (state.mouseDig) {
          // dig at break tile set by mouse
          tryDig(state.breakTx, state.breakTy, dt);
        } else {
          const { tx, ty } = facingTile();
          tryDig(tx, ty, dt);
        }
      }
    }

    // hold F to place repeatedly slow
    if (state.keys['f'] || state.keys['F']) {
      if (state.mode === 'place' && !state._placeCd) {
        placeOnce();
        state._placeCd = 0.2;
      }
    }
    if (state._placeCd) state._placeCd = Math.max(0, state._placeCd - dt);

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 80 * dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }

    if (saveTimer > 0) {
      saveTimer -= dt;
      if (saveTimer <= 0) save();
    }

    updateHud();
  }

  if (state.world) draw();
  requestAnimationFrame(loop);
}

// boot preview world behind menu
if (!load()) newWorld();
else {
  // ensure inv keys
  for (const id of PLACEABLE) {
    if (state.inv[id] == null) state.inv[id] = 0;
  }
}
renderInv();
updateHud();
requestAnimationFrame(loop);

// resize canvas to device
function fit() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // logical low-res feel
  const lw = 480;
  const lh = 270;
  canvas.width = lw;
  canvas.height = lh;
  ctx.imageSmoothingEnabled = false;
}
fit();
window.addEventListener('resize', fit);
