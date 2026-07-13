/**
 * Ember & Tide — two-spirit elemental co-op puzzle-platformer.
 *
 * This file owns everything the pure sim does not: neon-vector canvas
 * rendering, keyboard + touch input for both control modes, sfx, i18n wiring,
 * the mode-select / cleared / results overlays, and the fixed-timestep glue.
 *
 * sim.js owns the whole simulation (physics, per-axis tile collision, plates /
 * levers / gates / bridges, elemental hazard death, the both-doors win test) in
 * plain pixel units with no DOM, so it is directly steppable from the test hook
 * window.OGH_EMBER_TIDE at the bottom — same pure-sim split as fight-arena's
 * combat.js. levels.js holds the six authored levels + parser.
 *
 * Control modes:
 *   Solo — one active spirit at a time. WASD or Arrows move the active spirit,
 *          W/↑/Space jump, Shift/Tab (or the on-screen button) switch spirit.
 *   Duo  — split keyboard, both spirits live at once: Ember on WASD, Tide on
 *          the Arrow keys. Two people, one device.
 *
 * The sim runs on a FIXED 60 Hz step (accumulator below); a test can advance
 * exact single steps and drive either spirit deterministically.
 */

import { OGHShaderBg } from '../../_shared/js/ogh-shader-bg.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import { LEVELS, parseLevel, TILE } from './levels.js';
import {
  createWorld, resetWorld, stepWorld, FIXED_DT, overlapsCell, isSolidCell,
} from './sim.js';

const $ = (id) => document.getElementById(id);
const sfx = createOghSfx();
const canvas = $('game');
const ctx = canvas.getContext('2d');
ctx.direction = 'ltr'; // the temple stage never mirrors under RTL
const W = canvas.width;   // 960
const H = canvas.height;  // 600

const bg = OGHShaderBg.mount($('bg'), { palette: 2 });
if (bg) bg.start();

let lang = detectLang();
const FORCE_TOUCH = /[?&]touch=1/.test(location.search);

/* ------------------------------------------------------------------ *
 * Palette — warm (fire) vs cool (water), plus neutral stone.
 * ------------------------------------------------------------------ */
const COL = {
  stone: '#2a3350', stoneEdge: 'rgba(126,150,210,0.55)',
  fire: '#ff7a2f', fireGlow: 'rgba(255,120,50,0.9)', fireDim: 'rgba(255,110,50,0.28)',
  water: '#39c6ff', waterGlow: 'rgba(70,200,255,0.9)', waterDim: 'rgba(70,190,255,0.28)',
  spike: '#c9d3ef', spikeEdge: 'rgba(220,230,255,0.85)',
  gate: '#b7c3e8', bridge: '#ffcf7a',
};

/* ------------------------------------------------------------------ *
 * Session / UI state
 * ------------------------------------------------------------------ */
const ui = {
  screen: 'menu',      // 'menu' | 'play' | 'cleared' | 'results'
  mode: 'solo',        // 'solo' | 'duo'
  levelIndex: 0,
  active: 'ember',     // solo: which spirit responds
  resets: 0,
  totalResets: 0,
  deathTimer: 0,       // >0 while a death flash plays before auto-reset
  flash: 0,
  reachedDoor: { ember: false, tide: false },
  startTime: 0,
};

let level = null;
let world = null;

/* ------------------------------------------------------------------ *
 * Input — keyboard set + touch flags; merged into per-spirit intents.
 * ------------------------------------------------------------------ */
const keys = new Set();
const touch = {
  e: { left: false, right: false, jump: false },
  t: { left: false, right: false, jump: false },
};
// Test-hook overrides (null = not forced).
const forced = { ember: null, tide: null };

function freshIntent() { return { left: false, right: false, jump: false }; }

function computeIntents() {
  const e = freshIntent();
  const t2 = freshIntent();
  if (ui.mode === 'duo') {
    e.left = keys.has('KeyA'); e.right = keys.has('KeyD'); e.jump = keys.has('KeyW');
    t2.left = keys.has('ArrowLeft'); t2.right = keys.has('ArrowRight'); t2.jump = keys.has('ArrowUp');
    orIntent(e, touch.e); orIntent(t2, touch.t);
  } else {
    // Solo: either key group drives the ACTIVE spirit; the other is idle.
    const move = {
      left: keys.has('KeyA') || keys.has('ArrowLeft'),
      right: keys.has('KeyD') || keys.has('ArrowRight'),
      jump: keys.has('KeyW') || keys.has('ArrowUp') || keys.has('Space'),
    };
    const act = ui.active === 'ember' ? e : t2;
    orIntent(act, move);
    orIntent(act, touch.e); // solo uses the single (left) pad
  }
  if (forced.ember) Object.assign(e, forced.ember);
  if (forced.tide) Object.assign(t2, forced.tide);
  return { ember: e, tide: t2 };
}

function orIntent(dst, src) {
  dst.left = dst.left || src.left;
  dst.right = dst.right || src.right;
  dst.jump = dst.jump || src.jump;
}

/* ------------------------------------------------------------------ *
 * Level flow
 * ------------------------------------------------------------------ */
function loadLevel(i) {
  ui.levelIndex = i;
  level = parseLevel(LEVELS[i]);
  world = createWorld(level);
  ui.active = 'ember';
  ui.resets = 0;
  ui.deathTimer = 0;
  ui.flash = 0;
  ui.reachedDoor = { ember: false, tide: false };
  keys.clear();
  clearTouch();
  hideBanner();
  updateHud();
  updateHint();
}

function startGame() {
  ui.totalResets = 0;
  ui.startTime = performance.now();
  loadLevel(0);
  ui.screen = 'play';
  showOverlay(null);
  $('hud').hidden = false;
  refreshTouchLayout();
}

function nextLevel() {
  if (ui.levelIndex >= LEVELS.length - 1) { showResults(); return; }
  loadLevel(ui.levelIndex + 1);
  ui.screen = 'play';
  showOverlay(null);
}

function restartLevel() {
  if (!world) return;
  resetWorld(world);
  ui.reachedDoor = { ember: false, tide: false };
  ui.active = 'ember';
  ui.deathTimer = 0;
  hideBanner();
  updateHud();
}

function onDeath() {
  ui.resets += 1;
  ui.totalResets += 1;
  ui.deathTimer = 0.85;
  ui.flash = 1;
  sfx.play('die');
  const msg = deathTitle();
  showBanner(msg);
  srSay(msg);
  updateHud();
}

function showBanner(text) {
  const b = $('banner');
  b.textContent = text;
  b.hidden = false;
}
function hideBanner() { $('banner').hidden = true; }

function onCleared() {
  sfx.play('win');
  ui.flash = 0.6;
  if (ui.levelIndex >= LEVELS.length - 1) {
    // brief beat, then results
    ui.screen = 'cleared';
    setTimeout(showResults, 700);
  } else {
    ui.screen = 'cleared';
    setTimeout(() => {
      if (ui.screen === 'cleared') { showOverlay('cleared'); }
    }, 550);
  }
  srSay(t(lang, 'clearedTitle'));
}

function showResults() {
  ui.screen = 'results';
  const secs = Math.max(0, Math.round((performance.now() - ui.startTime) / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(1, '0');
  const ss = String(secs % 60).padStart(2, '0');
  $('resultStats').textContent = t(lang, 'winStats', {
    levels: LEVELS.length, resets: ui.totalResets, time: `${mm}:${ss}`,
  });
  showOverlay('results');
}

/* ------------------------------------------------------------------ *
 * Fixed-timestep loop
 * ------------------------------------------------------------------ */
let lastNow = performance.now();
let acc = 0;

function stepOnce() {
  const ev = stepWorld(world, computeIntents());
  // sfx from events
  if (ev.jumps.length) sfx.play('boing');
  if (ev.land.length) sfx.play('land');
  if (ev.lever || ev.plate) sfx.play('place');
  // door-arrival chimes (once per spirit as it first arrives home)
  for (const who of ['ember', 'tide']) {
    if (world[who].atDoor && !ui.reachedDoor[who]) { ui.reachedDoor[who] = true; sfx.play('pickup'); }
    else if (!world[who].atDoor) ui.reachedDoor[who] = false;
  }
  if (ev.died) onDeath();
  else if (ev.won) onCleared();
}

function update(dtReal) {
  if (ui.flash > 0) ui.flash = Math.max(0, ui.flash - dtReal * 2);

  if (ui.screen !== 'play') return;

  if (ui.deathTimer > 0) {
    ui.deathTimer -= dtReal;
    if (ui.deathTimer <= 0) restartLevel();
    return; // freeze during the death flash
  }

  acc += dtReal;
  let iter = 0;
  while (acc >= FIXED_DT && iter < 6) {
    if (world.status !== 'playing') break;
    stepOnce();
    acc -= FIXED_DT;
    iter += 1;
    if (world.status !== 'playing') { acc = 0; break; }
  }
  if (acc > FIXED_DT * 6) acc = 0;
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000);
  lastNow = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------ *
 * Rendering — neon-vector
 * ------------------------------------------------------------------ */
function render() {
  const time = performance.now() / 1000;
  ctx.clearRect(0, 0, W, H);
  ctx.save();

  drawBackdrop(time);
  if (!level) { ctx.restore(); return; }

  drawTerrain();
  drawHazards(time);
  drawBarriers(time);
  drawPlates(time);
  drawLevers();
  drawDoor(level.doors.tide, 'water', time);
  drawDoor(level.doors.ember, 'fire', time);
  if (world) {
    drawSpirit(world.tide, 'water', time);
    drawSpirit(world.ember, 'fire', time);
  }

  if (ui.flash > 0) {
    ctx.fillStyle = world && world.status === 'won'
      ? `rgba(120,255,180,${0.28 * ui.flash})`
      : `rgba(255,70,90,${0.34 * ui.flash})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

function drawBackdrop(time) {
  ctx.fillStyle = 'rgba(6,8,18,0.62)';
  ctx.fillRect(0, 0, W, H);
  // faint tile grid
  ctx.strokeStyle = 'rgba(120,150,220,0.05)';
  ctx.lineWidth = 1;
  for (let x = TILE; x < W; x += TILE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = TILE; y < H; y += TILE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

function drawTerrain() {
  const s = level.solid;
  ctx.lineWidth = 2;
  for (let r = 0; r < level.rows; r += 1) {
    for (let c = 0; c < level.cols; c += 1) {
      if (!s[r][c]) continue;
      const x = c * TILE; const y = r * TILE;
      ctx.fillStyle = COL.stone;
      ctx.fillRect(x, y, TILE, TILE);
      // top edge glow only where the surface is exposed (nothing solid above)
      if (r === 0 || !s[r - 1][c]) {
        ctx.strokeStyle = COL.stoneEdge;
        ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x + TILE, y + 1); ctx.stroke();
      }
    }
  }
}

function drawHazards(time) {
  const hz = level.hazard;
  for (let r = 0; r < level.rows; r += 1) {
    for (let c = 0; c < level.cols; c += 1) {
      const k = hz[r][c]; if (!k) continue;
      const x = c * TILE; const y = r * TILE;
      if (k === 'X') { drawSpikes(x, y); continue; }
      const warm = k === 'L';
      const surf = warm ? COL.fire : COL.water;
      const glow = warm ? COL.fireGlow : COL.waterGlow;
      // pool body
      const g = ctx.createLinearGradient(0, y, 0, y + TILE);
      g.addColorStop(0, warm ? 'rgba(255,120,40,0.85)' : 'rgba(60,180,255,0.8)');
      g.addColorStop(1, warm ? 'rgba(150,30,10,0.9)' : 'rgba(20,70,150,0.9)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y + 6, TILE, TILE - 6);
      // wavy surface
      ctx.strokeStyle = glow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= TILE; i += 4) {
        const yy = y + 8 + Math.sin((x + i) * 0.12 + time * (warm ? 5 : 3.4)) * 2.4;
        if (i === 0) ctx.moveTo(x + i, yy); else ctx.lineTo(x + i, yy);
      }
      ctx.stroke();
      // rising motes
      ctx.fillStyle = surf;
      for (let m = 0; m < 2; m += 1) {
        const ph = (time * (warm ? 0.9 : 0.6) + c * 0.7 + m * 0.5) % 1;
        const mx = x + 8 + ((c * 13 + m * 21) % (TILE - 16));
        const my = y + TILE - ph * (TILE - 6);
        ctx.globalAlpha = (1 - ph) * 0.7;
        ctx.beginPath(); ctx.arc(mx, my, warm ? 2.2 : 1.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}

function drawSpikes(x, y) {
  ctx.fillStyle = 'rgba(20,24,40,0.9)';
  ctx.fillRect(x, y + TILE * 0.5, TILE, TILE * 0.5);
  ctx.fillStyle = COL.spike;
  ctx.strokeStyle = COL.spikeEdge;
  ctx.lineWidth = 1.5;
  const n = 3; const w = TILE / n;
  for (let i = 0; i < n; i += 1) {
    const bx = x + i * w;
    ctx.beginPath();
    ctx.moveTo(bx, y + TILE);
    ctx.lineTo(bx + w / 2, y + TILE * 0.42);
    ctx.lineTo(bx + w, y + TILE);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawBarriers(time) {
  for (const b of level.barriers) {
    const solidNow = b.type === 'gate' ? !b.open : b.open;
    for (const [c, r] of b.cells) {
      const x = c * TILE; const y = r * TILE;
      if (b.type === 'gate') {
        if (solidNow) {
          ctx.fillStyle = 'rgba(150,165,215,0.9)';
          for (let k = 0; k < 3; k += 1) {
            ctx.fillRect(x + 6 + k * 11, y + 2, 6, TILE - 4);
          }
          ctx.strokeStyle = 'rgba(200,215,255,0.7)';
          ctx.strokeRect(x + 2, y + 1, TILE - 4, TILE - 2);
        } else {
          // retracted gate — faint slot in the ceiling/frame
          ctx.strokeStyle = 'rgba(150,165,215,0.28)';
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x + 3, y + 2, TILE - 6, TILE - 4);
          ctx.setLineDash([]);
        }
      } else { // bridge
        if (solidNow) {
          ctx.fillStyle = 'rgba(70,52,28,0.95)';
          ctx.fillRect(x, y + 10, TILE, TILE - 14);
          ctx.fillStyle = COL.bridge;
          for (let k = 0; k < 3; k += 1) ctx.fillRect(x + 3 + k * 12, y + 12, 8, TILE - 20);
          ctx.strokeStyle = 'rgba(255,210,140,0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x + TILE, y + 12); ctx.stroke();
        } else {
          // retracted bridge — glowing anchor nubs on each side only at the ends
          ctx.fillStyle = 'rgba(255,200,120,0.32)';
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + 14 + Math.sin(time * 3 + c) * 1.5, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

function drawPlates(time) {
  for (const p of level.plates) {
    const x = p.col * TILE; const y = p.row * TILE;
    const on = p.active;
    const cy = y + TILE - (on ? 5 : 9);
    ctx.fillStyle = on ? 'rgba(120,255,180,0.9)' : 'rgba(150,175,230,0.5)';
    ctx.strokeStyle = on ? 'rgba(150,255,200,0.95)' : 'rgba(160,185,240,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundRect(x + 6, cy, TILE - 12, on ? 8 : 10, 3);
    ctx.fill(); ctx.stroke();
    // base
    ctx.fillStyle = 'rgba(30,40,70,0.8)';
    ctx.fillRect(x + 4, y + TILE - 4, TILE - 8, 4);
    if (on) {
      ctx.globalAlpha = 0.4 + Math.sin(time * 8) * 0.2;
      ctx.strokeStyle = 'rgba(120,255,180,0.6)';
      ctx.strokeRect(x + 3, cy - 3, TILE - 6, 14);
      ctx.globalAlpha = 1;
    }
  }
}

function drawLevers() {
  for (const lv of level.levers) {
    const x = lv.col * TILE; const y = lv.row * TILE;
    const cx = x + TILE / 2; const baseY = y + TILE - 6;
    const tint = lv.char === 'tide' ? COL.water : (lv.char === 'ember' ? COL.fire : '#cdd6f5');
    // mount
    ctx.fillStyle = 'rgba(30,40,70,0.9)';
    ctx.beginPath(); ctx.arc(cx, baseY, 5, 0, Math.PI * 2); ctx.fill();
    // handle leans right when ON, left when OFF
    const ang = lv.on ? -0.7 : -Math.PI + 0.7;
    const hx = cx + Math.cos(ang) * 16; const hy = baseY + Math.sin(ang) * 16;
    ctx.strokeStyle = tint; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, baseY); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, Math.PI * 2); ctx.fill();
    if (lv.on) {
      ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2);
      ctx.strokeStyle = tint; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.lineCap = 'butt';
  }
}

function drawDoor(door, kind, time) {
  const warm = kind === 'fire';
  const x = door.col * TILE;
  const y = (door.row - 1) * TILE; // 2 tiles tall
  const w = TILE; const h = TILE * 2;
  const col = warm ? COL.fire : COL.water;
  const glow = warm ? COL.fireGlow : COL.waterGlow;
  const home = world && world[warm ? 'ember' : 'tide'].atDoor;
  // arch frame
  ctx.save();
  ctx.strokeStyle = col; ctx.lineWidth = 3;
  ctx.shadowColor = glow; ctx.shadowBlur = home ? 22 : 12;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + h - 2);
  ctx.lineTo(x + 4, y + 14);
  ctx.quadraticCurveTo(x + w / 2, y - 6, x + w - 4, y + 14);
  ctx.lineTo(x + w - 4, y + h - 2);
  ctx.stroke();
  // inner portal
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, warm ? 'rgba(255,140,60,0.30)' : 'rgba(70,200,255,0.28)');
  g.addColorStop(1, warm ? 'rgba(255,90,40,0.12)' : 'rgba(50,150,240,0.12)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + 7, y + h - 3);
  ctx.lineTo(x + 7, y + 15);
  ctx.quadraticCurveTo(x + w / 2, y - 2, x + w - 7, y + 15);
  ctx.lineTo(x + w - 7, y + h - 3);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  // element rune
  ctx.fillStyle = col;
  const ry = y + h * 0.44 + Math.sin(time * 2 + (warm ? 0 : 1)) * 2;
  if (warm) {
    ctx.beginPath();
    ctx.moveTo(x + w / 2, ry - 8);
    ctx.quadraticCurveTo(x + w / 2 + 7, ry, x + w / 2, ry + 8);
    ctx.quadraticCurveTo(x + w / 2 - 7, ry, x + w / 2, ry - 8);
    ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(x + w / 2, ry, 6, 0, Math.PI * 2); ctx.fill();
  }
  if (home) {
    ctx.strokeStyle = 'rgba(150,255,200,0.9)'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 6, ry + 1); ctx.lineTo(x + w / 2 - 1, ry + 6); ctx.lineTo(x + w / 2 + 8, ry - 6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpirit(ch, kind, time) {
  if (!ch.alive && ui.deathTimer <= 0) return;
  const warm = kind === 'fire';
  const col = warm ? COL.fire : COL.water;
  const glow = warm ? COL.fireGlow : COL.waterGlow;
  const x = ch.cx; const y = ch.cy;
  const hw = ch.hw; const hh = ch.hh;
  const activeSolo = ui.mode === 'solo' && ui.active === kindToWho(kind);
  ctx.save();

  // active-spirit halo (solo)
  if (activeSolo && ui.screen === 'play') {
    ctx.globalAlpha = 0.5 + Math.sin(time * 6) * 0.2;
    ctx.strokeStyle = glow; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y - 2, hw + 9, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    // little pointer above
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y - hh - 12); ctx.lineTo(x - 5, y - hh - 20); ctx.lineTo(x + 5, y - hh - 20);
    ctx.closePath(); ctx.fill();
  }

  // glow aura
  ctx.shadowColor = glow; ctx.shadowBlur = 16;
  // body — a rounded elemental blob
  const grad = ctx.createRadialGradient(x - 3, y - 5, 2, x, y, hw + 6);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(0.35, warm ? '#ffd08a' : '#bff0ff');
  grad.addColorStop(1, col);
  ctx.fillStyle = grad;
  if (warm) {
    // flame silhouette
    ctx.beginPath();
    ctx.moveTo(x, y - hh - 2 - Math.sin(time * 12) * 2);
    ctx.quadraticCurveTo(x + hw + 2, y - 2, x + hw - 1, y + hh - 3);
    ctx.quadraticCurveTo(x, y + hh + 2, x - hw + 1, y + hh - 3);
    ctx.quadraticCurveTo(x - hw - 2, y - 2, x, y - hh - 2);
    ctx.fill();
  } else {
    // droplet silhouette
    ctx.beginPath();
    ctx.moveTo(x, y - hh - 2);
    ctx.quadraticCurveTo(x + hw + 2, y, x + hw - 1, y + hh - 4);
    ctx.quadraticCurveTo(x, y + hh + 2, x - hw + 1, y + hh - 4);
    ctx.quadraticCurveTo(x - hw - 2, y, x, y - hh - 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // eyes (face the movement direction)
  const dir = ch.facing >= 0 ? 1 : -1;
  ctx.fillStyle = '#0a0e1a';
  ctx.beginPath(); ctx.arc(x - 4 + dir * 2, y - 2, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5 + dir * 2, y - 2, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(x - 4 + dir * 2 + 0.6, y - 2.6, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5 + dir * 2 + 0.6, y - 2.6, 0.8, 0, Math.PI * 2); ctx.fill();

  // element flair on top
  ctx.fillStyle = warm ? 'rgba(255,220,120,0.9)' : 'rgba(180,240,255,0.9)';
  for (let i = 0; i < 3; i += 1) {
    const ph = (time * (warm ? 2.2 : 1.4) + i * 0.4) % 1;
    const px = x + (i - 1) * 5;
    const py = y - hh - 2 - ph * 10;
    ctx.globalAlpha = (1 - ph) * 0.8;
    ctx.beginPath(); ctx.arc(px, py, warm ? 2 : 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

const kindToWho = (kind) => (kind === 'fire' ? 'ember' : 'tide');

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ------------------------------------------------------------------ *
 * HUD / hint / overlays
 * ------------------------------------------------------------------ */
function updateHud() {
  const name = t(lang, LEVELS[ui.levelIndex].nameKey);
  $('hudLevel').textContent = `${t(lang, 'hudLevel')} ${ui.levelIndex + 1}/${LEVELS.length} · ${name}`;
  $('hudResets').textContent = `⟳ ${ui.resets}`;
  const modeEl = $('hudMode');
  if (ui.mode === 'solo') {
    const who = ui.active === 'ember' ? t(lang, 'ember') : t(lang, 'tide');
    modeEl.textContent = `${t(lang, 'controlling')}: ${who}`;
    modeEl.className = `ogh-pill et-pill-mode ${ui.active === 'ember' ? 'is-fire' : 'is-water'}`;
  } else {
    modeEl.textContent = `${t(lang, 'ember')} ⌨ · ${t(lang, 'tide')} ⌨`;
    modeEl.className = 'ogh-pill et-pill-mode';
  }
}

function updateHint() {
  const coarse = isTouch();
  let key;
  if (ui.mode === 'duo') key = 'hintDuo';
  else key = coarse ? 'hintTouchSolo' : 'hintSolo';
  $('hint').textContent = t(lang, key);
}

function deathTitle() {
  if (!world) return '';
  const who = world.deadWho; const cause = world.deadCause;
  if (cause === 'spike') return t(lang, who === 'ember' ? 'deathSpikeFire' : 'deathSpikeWater');
  if (cause === 'fall') return t(lang, who === 'ember' ? 'deathFallFire' : 'deathFallWater');
  if (who === 'ember') return t(lang, 'deathFire');
  return t(lang, 'deathWater');
}

function showOverlay(which) {
  const overlay = $('overlay');
  const cards = { menu: 'menuCard', cleared: 'clearedCard', results: 'resultsCard' };
  if (!which) { overlay.hidden = true; return; }
  overlay.hidden = false;
  for (const [k, id] of Object.entries(cards)) $(id).hidden = (k !== which);
}

function srSay(msg) { $('srStatus').textContent = msg; }

/* ------------------------------------------------------------------ *
 * Touch
 * ------------------------------------------------------------------ */
function isTouch() {
  return FORCE_TOUCH || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
}

function refreshTouchLayout() {
  const show = isTouch() && ui.screen === 'play';
  $('touch').hidden = !show;
  const solo = ui.mode === 'solo';
  $('padT').style.visibility = solo ? 'hidden' : 'visible';
  $('btnSwitch').hidden = !solo;
}

function clearTouch() {
  touch.e = { left: false, right: false, jump: false };
  touch.t = { left: false, right: false, jump: false };
  document.querySelectorAll('.et-tbtn').forEach((b) => b.classList.remove('is-down'));
}

function bindTouch() {
  document.querySelectorAll('.et-tbtn').forEach((btn) => {
    const pad = btn.dataset.pad; const act = btn.dataset.act;
    const down = (e) => { e.preventDefault(); sfx.unlock(); touch[pad][act] = true; btn.classList.add('is-down'); };
    const up = (e) => { e.preventDefault(); touch[pad][act] = false; btn.classList.remove('is-down'); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);
  });
  $('btnSwitch').addEventListener('click', (e) => { e.preventDefault(); sfx.unlock(); switchActive(); });
  $('btnRestart').addEventListener('click', (e) => { e.preventDefault(); sfx.unlock(); restartLevel(); });
}

function switchActive() {
  ui.active = ui.active === 'ember' ? 'tide' : 'ember';
  sfx.play('tap');
  updateHud();
}

/* ------------------------------------------------------------------ *
 * Keyboard
 * ------------------------------------------------------------------ */
const MOVE_CODES = new Set([
  'KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space',
]);

function onKeyDown(e) {
  if (e.repeat) return;
  sfx.unlock();
  const code = e.code;
  if (MOVE_CODES.has(code)) e.preventDefault();
  keys.add(code);
  if (ui.screen === 'play') {
    if ((code === 'ShiftLeft' || code === 'ShiftRight' || code === 'Tab') && ui.mode === 'solo') {
      e.preventDefault(); switchActive();
    } else if (code === 'KeyR') {
      restartLevel();
    }
  }
  if (code === 'Enter' && ui.screen === 'menu') { e.preventDefault(); startGame(); }
}

function onKeyUp(e) { keys.delete(e.code); }

/* ------------------------------------------------------------------ *
 * i18n wiring
 * ------------------------------------------------------------------ */
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
  setControlsNote();
  if (level) { updateHud(); updateHint(); }
  if (ui.screen === 'results') showResults();
  rememberLang(lang);
}

function setControlsNote() {
  $('controlsNote').textContent = t(lang, ui.mode === 'duo' ? 'controlsDuo' : 'controlsSolo');
}

function setMode(mode) {
  ui.mode = mode;
  $('modeSolo').classList.toggle('is-on', mode === 'solo');
  $('modeDuo').classList.toggle('is-on', mode === 'duo');
  setControlsNote();
}

/* ------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------ */
function init() {
  applyLang(lang);
  setMode('solo');
  // preview the first level behind the menu
  loadLevel(0);
  ui.screen = 'menu';
  $('hud').hidden = true;

  $('modeSolo').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); setMode('solo'); });
  $('modeDuo').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); setMode('duo'); });
  $('btnStart').addEventListener('click', () => { sfx.unlock(); sfx.play('pickup'); startGame(); });
  $('btnNext').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); nextLevel(); });
  $('btnAgain').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); startGame(); });
  $('btnMenu').addEventListener('click', () => {
    sfx.unlock(); sfx.play('tap');
    ui.screen = 'menu'; $('hud').hidden = true; $('touch').hidden = true;
    loadLevel(0); ui.screen = 'menu'; showOverlay('menu');
  });

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => { keys.clear(); });
  bindTouch();
  window.addEventListener('resize', () => { refreshTouchLayout(); updateHint(); });

  showOverlay('menu');
  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });

  installTestHook();
}

/* ------------------------------------------------------------------ *
 * Test / debug hook — mirrors games/fight-arena's window.OGH_FIGHT_ARENA:
 * lets a harness drive both spirits deterministically (exact held inputs,
 * single fixed steps, direct placement) and read live state to verify the
 * elemental rules, door logic and cooperative mechanisms without fighting real
 * key/rAF timing.
 * ------------------------------------------------------------------ */
function installTestHook() {
  window.OGH_EMBER_TIDE = {
    ui, TILE, LEVELS,
    world: () => world,
    level: () => level,
    lang: () => lang,
    setLang: applyLang,
    setMode,
    /** Begin play at a specific level index (0-based). */
    start(mode, levelIndex = 0) {
      if (mode) setMode(mode);
      ui.totalResets = 0; ui.startTime = performance.now();
      loadLevel(levelIndex);
      ui.screen = 'play'; showOverlay(null); $('hud').hidden = false; refreshTouchLayout();
    },
    goToLevel(i) { loadLevel(i); ui.screen = 'play'; showOverlay(null); },
    switchActive,
    active: () => ui.active,
    /** Force-hold an intent for a spirit (overrides live input). */
    hold(who, intent) { forced[who] = Object.assign(freshIntent(), intent); },
    release(who) { forced[who] = null; },
    releaseAll() { forced.ember = null; forced.tide = null; keys.clear(); clearTouch(); },
    /** Simulate a raw key press/release (as the real handler would see it). */
    key(code, downState) {
      if (downState) keys.add(code); else keys.delete(code);
    },
    /** Directly place a spirit's center (cx,cy) or on a tile cell. */
    place(who, cx, cy) { world[who].cx = cx; world[who].cy = cy; world[who].vx = 0; world[who].vy = 0; },
    placeCell(who, col, row) {
      world[who].cx = col * TILE + TILE / 2;
      world[who].cy = (row + 1) * TILE - world[who].hh;
      world[who].vx = 0; world[who].vy = 0;
    },
    /** Advance exactly n fixed logical steps using current held/forced input. */
    tick(n = 1) {
      for (let i = 0; i < n; i += 1) {
        if (world.status !== 'playing') break;
        stepOnce();
        if (ui.deathTimer > 0 || ui.screen !== 'play') break;
      }
    },
    /** Snapshot of live state for assertions. */
    snapshot() {
      return {
        status: world.status, deadWho: world.deadWho, deadCause: world.deadCause,
        levelIndex: ui.levelIndex, mode: ui.mode, active: ui.active,
        screen: ui.screen, resets: ui.resets,
        ember: spiritState(world.ember),
        tide: spiritState(world.tide),
        barriers: level.barriers.map((b) => ({ id: b.id, type: b.type, open: b.open, solid: b.type === 'gate' ? !b.open : b.open })),
        plates: level.plates.map((p) => ({ id: p.id, active: p.active })),
        levers: level.levers.map((l) => ({ id: l.id, on: l.on, char: l.char })),
      };
    },
    isSolidCell: (c, r) => isSolidCell(world, c, r),
    overlapsCell: (who, c, r) => overlapsCell(world[who], c, r),
    restartLevel, resetWorld: () => resetWorld(world),
  };
}

function spiritState(ch) {
  return {
    cx: ch.cx, cy: ch.cy, vx: ch.vx, vy: ch.vy,
    col: Math.floor(ch.cx / TILE), row: Math.floor(ch.cy / TILE),
    onGround: ch.onGround, alive: ch.alive, atDoor: ch.atDoor, atWrongDoor: ch.atWrongDoor,
  };
}

init();
