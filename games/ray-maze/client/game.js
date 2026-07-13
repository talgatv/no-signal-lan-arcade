/**
 * Ray Maze — first-person DDA raycasting maze shooter (OGH, solo).
 *
 * game.js wires the pieces together: the raycasting renderer (raycaster.js),
 * the maze data (levels.js), enemy AI (enemies.js), sound, i18n, HUD, input and
 * combat. The heavy 3D math lives in raycaster.js; this file owns game state,
 * the player, controls (touch-first: left virtual stick + right drag-look, with
 * keyboard/mouse as desktop bonuses), hitscan firing, projectiles, pickups, the
 * minimap HUD and the level/round structure.
 *
 * RTL note: the canvas view, the minimap and all movement/turn directions are
 * fixed spatial renders and never mirror — only the DOM chrome flips for Arabic
 * (see i18n.js). ctx.direction is forced to 'ltr' as a second guard.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import { LEVELS, isWall as cellIsWall, wallType as cellWallType } from './levels.js';
import {
  castRay, renderView, drawSprite, drawMinimap, hasLineOfSight,
} from './raycaster.js';
import { makeEnemy, updateEnemies, alertNearby } from './enemies.js';

const PI2 = Math.PI * 2;
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
// Pointer capture is best-effort: it keeps a drag alive if the finger slides
// off the zone, but the browser rejects it in some states (e.g. a mouse that is
// also driving pointer-lock), so failures must be swallowed, not thrown.
const safeCapture = (el, id) => { try { el.setPointerCapture(id); } catch (_) { /* ignore */ } };

/* ── Tunables ─────────────────────────────────────────────────────────── */
const MAG_SIZE = 7;
const FIRE_CD = 0.16; // s between shots
const RELOAD_TIME = 0.85; // s
const WEAPON_DAMAGE = 25;
const MOVE_SPEED = 3.1; // cells / s
const STRAFE_SPEED = 2.7;
const TURN_SPEED = 2.7; // rad / s (keyboard/button turn)
const PLAYER_RADIUS = 0.2;
const MAX_HEALTH = 100;
const HEALTH_PICKUP = 30;
const MAX_PITCH = 120; // px of vertical look offset
const LOOK_SENS = 0.0045; // touch drag -> radians
const PITCH_SENS = 0.6; // touch drag -> px
const MOUSE_SENS = 0.0022;

/* ── Canvas ───────────────────────────────────────────────────────────── */
const canvas = $('view');
const ctx = canvas.getContext('2d');
ctx.direction = 'ltr'; // never mirror canvas text under RTL
let W = 480;
let H = 320;

function resize() {
  const r = canvas.getBoundingClientRect();
  const aspect = (r.width || 480) / (r.height || 320);
  H = 340;
  W = clamp(Math.round(H * aspect), 360, 680);
  canvas.width = W;
  canvas.height = H;
  if (!zbuffer || zbuffer.length !== W) zbuffer = new Float32Array(W);
}
window.addEventListener('resize', resize);

const sfx = createOghSfx();

/* ── State ────────────────────────────────────────────────────────────── */
const player = { x: 1.5, y: 1.5, dir: 0, pitch: 0, health: MAX_HEALTH };

const state = {
  mode: 'title', // title | play | levelclear | dead | victory
  levelIndex: 0,
  level: LEVELS[0],
  enemies: [],
  projectiles: [], // {x,y,vx,vy,damage,life,r}
  health: [], // {x,y,taken}
  exit: LEVELS[0].exit,
  exitOpen: false,
  kills: 0, // this level
  totalKills: 0,
  mag: MAG_SIZE,
  reloading: false,
  reloadT: 0,
  fireCd: 0,
  muzzle: 0, // muzzle-flash timer
  damageFlash: 0,
  shake: 0,
  alertCd: 0,
  bobPhase: 0,
  recoil: 0,
};

const input = { moveF: 0, moveS: 0, turn: 0, lookDelta: 0, pitchDelta: 0, firing: false };
const keys = new Set();
let lang = detectLang();

let zbuffer = new Float32Array(W);

/* ── World helpers shared with enemy AI ───────────────────────────────── */
function isWall(col, row) {
  return cellIsWall(state.level, col, row);
}
function wallTypeAt(col, row) {
  return cellWallType(state.level, col, row);
}
const world = {
  isWall,
  hasLineOfSight: (ax, ay, bx, by) => hasLineOfSight(ax, ay, bx, by, isWall),
  damagePlayer: (amt) => damagePlayer(amt),
  spawnProjectile: (x, y, dx, dy, sp, dmg) => spawnProjectile(x, y, dx, dy, sp, dmg),
  onAlert: () => {
    if (state.alertCd <= 0) {
      sfx.play('screech');
      state.alertCd = 0.45;
    }
  },
};

function aliveEnemies() {
  return state.enemies.filter((e) => e.alive).length;
}

/* ── Level lifecycle ──────────────────────────────────────────────────── */
function loadLevel(i) {
  const level = LEVELS[i % LEVELS.length];
  state.level = level;
  state.levelIndex = i;
  state.enemies = level.enemies.map(makeEnemy);
  state.projectiles = [];
  state.health = level.health.map((h) => ({ x: h.x, y: h.y, taken: false }));
  state.exit = level.exit;
  state.exitOpen = false;
  state.kills = 0;
  state.mag = MAG_SIZE;
  state.reloading = false;
  state.reloadT = 0;
  state.fireCd = 0;
  player.x = level.spawn.x;
  player.y = level.spawn.y;
  player.dir = level.spawn.dir;
  player.pitch = 0;
  updateHud();
}

function startRun() {
  player.health = MAX_HEALTH;
  state.totalKills = 0;
  loadLevel(0);
  state.mode = 'play';
  showOverlay(null);
  updateHud();
}

/* ── Combat ───────────────────────────────────────────────────────────── */
function fire() {
  if (state.mode !== 'play' || state.reloading || state.fireCd > 0) return false;
  if (state.mag <= 0) {
    startReload();
    return false;
  }
  state.mag -= 1;
  state.fireCd = FIRE_CD;
  state.muzzle = 0.07;
  state.recoil = 1;
  sfx.play('pop');

  const dirX = Math.cos(player.dir);
  const dirY = Math.sin(player.dir);
  // Hitscan: distance to the first wall straight ahead (unit dir -> Euclidean).
  const wallHit = castRay(player.x, player.y, dirX, dirY, isWall);
  const wallDist = wallHit.dist;

  // Nearest enemy whose center is close to the aim ray AND in front of the wall.
  let best = null;
  let bestT = Infinity;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const ex = e.x - player.x;
    const ey = e.y - player.y;
    const along = ex * dirX + ey * dirY; // projection onto aim ray
    if (along <= 0 || along >= wallDist) continue; // behind us or past a wall
    const perp = Math.abs(dirX * ey - dirY * ex); // |cross|, dir is unit
    if (perp < e.def.radius + 0.05 && along < bestT) {
      best = e;
      bestT = along;
    }
  }
  let hitEnemy = false;
  if (best) {
    hitEnemy = true;
    damageEnemy(best, WEAPON_DAMAGE);
  }
  // The shot's noise wakes anything that can see us, hit or miss.
  alertNearby(state.enemies, player.x, player.y, world);
  updateHud();
  if (state.mag <= 0) startReload();
  return hitEnemy;
}

function damageEnemy(e, dmg) {
  e.hp -= dmg;
  e.hitFlash = 0.14;
  e.alerted = true;
  if (e.hp <= 0) {
    e.alive = false;
    e.deathT = 0;
    state.kills += 1;
    state.totalKills += 1;
    sfx.play('pocket');
    checkExit();
    updateHud();
  } else {
    sfx.play('thwack');
  }
}

function startReload() {
  if (state.reloading || state.mag >= MAG_SIZE) return;
  state.reloading = true;
  state.reloadT = RELOAD_TIME;
  sfx.play('place');
  updateHud();
}

function spawnProjectile(x, y, dx, dy, speed, damage) {
  state.projectiles.push({ x, y, vx: dx * speed, vy: dy * speed, damage, life: 5, r: 0.16 });
}

function damagePlayer(amount) {
  if (state.mode !== 'play') return;
  player.health -= amount;
  state.damageFlash = 0.55;
  state.shake = 6;
  sfx.play('splat');
  if (player.health <= 0) {
    player.health = 0;
    gameOver();
  }
  updateHud();
}

function gameOver() {
  state.mode = 'dead';
  sfx.play('die');
  showOverlay('dead');
}

function checkExit() {
  if (!state.exitOpen && aliveEnemies() === 0) {
    state.exitOpen = true;
    updateHud();
  }
}

function reachExit() {
  const last = state.levelIndex >= LEVELS.length - 1;
  if (last) {
    state.mode = 'victory';
    sfx.play('win');
    showOverlay('victory');
  } else {
    state.mode = 'levelclear';
    sfx.play('win');
    showOverlay('levelclear');
  }
}

/* ── Player movement + collision ──────────────────────────────────────── */
function circleHitsWall(x, y, rad) {
  return (
    isWall(Math.floor(x - rad), Math.floor(y - rad)) ||
    isWall(Math.floor(x + rad), Math.floor(y - rad)) ||
    isWall(Math.floor(x - rad), Math.floor(y + rad)) ||
    isWall(Math.floor(x + rad), Math.floor(y + rad))
  );
}

function movePlayer(dt) {
  // Keyboard contributes to the same input channel as the touch stick.
  let mf = input.moveF;
  let ms = input.moveS;
  let turn = input.turn;
  if (keys.has('w') || keys.has('ArrowUp')) mf += 1;
  if (keys.has('s') || keys.has('ArrowDown')) mf -= 1;
  if (keys.has('a')) ms -= 1;
  if (keys.has('d')) ms += 1;
  if (keys.has('ArrowLeft') || keys.has('q')) turn -= 1;
  if (keys.has('ArrowRight') || keys.has('e')) turn += 1;
  mf = clamp(mf, -1, 1);
  ms = clamp(ms, -1, 1);
  turn = clamp(turn, -1, 1);

  // Turn from keys/buttons, then apply accumulated drag/mouse yaw.
  player.dir += turn * TURN_SPEED * dt;
  player.dir += input.lookDelta;
  input.lookDelta = 0;
  player.pitch = clamp(player.pitch + input.pitchDelta, -MAX_PITCH, MAX_PITCH);
  input.pitchDelta = 0;
  if (player.dir > Math.PI) player.dir -= PI2;
  else if (player.dir < -Math.PI) player.dir += PI2;

  const dirX = Math.cos(player.dir);
  const dirY = Math.sin(player.dir);
  // Right-strafe vector = facing rotated +90° (player's right, y-down screen).
  const rightX = -dirY;
  const rightY = dirX;
  let vx = (dirX * mf * MOVE_SPEED + rightX * ms * STRAFE_SPEED) * dt;
  let vy = (dirY * mf * MOVE_SPEED + rightY * ms * STRAFE_SPEED) * dt;

  if (!circleHitsWall(player.x + vx, player.y, PLAYER_RADIUS)) player.x += vx;
  if (!circleHitsWall(player.x, player.y + vy, PLAYER_RADIUS)) player.y += vy;

  const speed = Math.hypot(vx, vy);
  if (speed > 0.0005) state.bobPhase += dt * 9;
}

/* ── Per-frame update ─────────────────────────────────────────────────── */
function update(dt) {
  state.alertCd = Math.max(0, state.alertCd - dt);
  state.damageFlash = Math.max(0, state.damageFlash - dt);
  state.shake = Math.max(0, state.shake - dt * 24);
  state.muzzle = Math.max(0, state.muzzle - dt);
  state.recoil = Math.max(0, state.recoil - dt * 6);
  if (state.fireCd > 0) state.fireCd = Math.max(0, state.fireCd - dt);

  // dying enemies keep animating so their poof plays out
  for (const e of state.enemies) if (!e.alive && e.deathT < 1) e.deathT = Math.min(1, e.deathT + dt * 3);

  if (state.mode !== 'play') return;

  if (state.reloading) {
    state.reloadT -= dt;
    if (state.reloadT <= 0) {
      state.reloading = false;
      state.mag = MAG_SIZE;
      sfx.play('tick');
      updateHud();
    }
  }

  movePlayer(dt);

  if (input.firing) fire();

  updateEnemies(state.enemies, player, dt, world);

  // Projectiles
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0 || isWall(Math.floor(p.x), Math.floor(p.y))) {
      state.projectiles.splice(i, 1);
      continue;
    }
    if (Math.hypot(p.x - player.x, p.y - player.y) < 0.34) {
      damagePlayer(p.damage);
      state.projectiles.splice(i, 1);
    }
  }

  // Health pickups
  for (const h of state.health) {
    if (h.taken) continue;
    if (Math.hypot(h.x - player.x, h.y - player.y) < 0.5) {
      h.taken = true;
      player.health = Math.min(MAX_HEALTH, player.health + HEALTH_PICKUP);
      sfx.play('pickup');
      updateHud();
    }
  }

  // Exit
  checkExit();
  if (state.exitOpen && Math.hypot(state.exit.x - player.x, state.exit.y - player.y) < 0.6) {
    reachExit();
  }
}

/* ── Rendering ────────────────────────────────────────────────────────── */
function render() {
  const zb = zbuffer;
  const shx = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const shy = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  ctx.save();
  ctx.translate(shx, shy);

  renderView(ctx, W, H, player, isWall, wallTypeAt, zb, player.pitch);

  // Gather billboard sprites (enemies, projectiles, pickups, exit), far-first.
  const sprites = [];
  for (const e of state.enemies) {
    if (!e.alive && e.deathT >= 1) continue;
    const d = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
    sprites.push({ d, kind: e.type, e });
  }
  for (const p of state.projectiles) {
    const d = (p.x - player.x) ** 2 + (p.y - player.y) ** 2;
    sprites.push({ d, kind: 'proj', p });
  }
  for (const h of state.health) {
    if (h.taken) continue;
    const d = (h.x - player.x) ** 2 + (h.y - player.y) ** 2;
    sprites.push({ d, kind: 'health', h });
  }
  {
    const d = (state.exit.x - player.x) ** 2 + (state.exit.y - player.y) ** 2;
    sprites.push({ d, kind: 'exit' });
  }
  sprites.sort((a, b) => b.d - a.d);

  for (const s of sprites) {
    if (s.kind === 'drone' || s.kind === 'sentry') {
      const e = s.e;
      const vScale = 0.86;
      drawSprite(ctx, W, H, zb, player, e,
        (c, cx, cy, h) => (s.kind === 'drone' ? drawDrone(c, cx, cy, h, e) : drawSentry(c, cx, cy, h, e)),
        { sizeScale: 0.72, vScale, vShift: 0.5 - vScale / 2, pitch: player.pitch });
    } else if (s.kind === 'proj') {
      drawSprite(ctx, W, H, zb, player, s.p, drawProjectile,
        { sizeScale: 1, vScale: 0.22, vShift: 0.16, pitch: player.pitch });
    } else if (s.kind === 'health') {
      drawSprite(ctx, W, H, zb, player, s.h, drawHealth,
        { sizeScale: 1, vScale: 0.4, vShift: 0.5 - 0.2, pitch: player.pitch });
    } else if (s.kind === 'exit') {
      drawSprite(ctx, W, H, zb, player, state.exit,
        (c, cx, cy, h) => drawExit(c, cx, cy, h, state.exitOpen),
        { sizeScale: 0.9, vScale: 1.0, vShift: 0, pitch: player.pitch });
    }
  }

  ctx.restore(); // undo shake before screen-space HUD

  drawWeapon();
  drawCrosshair();
  drawMinimap(ctx, state.level, player, state.enemies, state.exit, state.exitOpen, state.health,
    minimapLayout());
  drawVignette();
}

function minimapLayout() {
  const size = Math.min(W, H) * 0.34;
  return { x: W - size - 12, y: 12, size };
}

function hexPath(c, cx, cy, rx, ry) {
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI2 - Math.PI / 2;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
}

function drawDrone(c, cx, cy, h, e) {
  const w = h * 0.9;
  const alpha = e.alive ? 1 : 1 - e.deathT;
  const scale = e.alive ? 1 : 1 - e.deathT * 0.4;
  c.save();
  c.globalAlpha = alpha;
  const rx = (w * 0.5) * scale;
  const ry = (h * 0.5) * scale;
  c.shadowColor = 'rgba(255,96,200,0.85)';
  c.shadowBlur = Math.min(22, h * 0.22);
  c.fillStyle = 'rgba(96,14,66,0.96)';
  c.strokeStyle = e.hitFlash > 0 ? '#ffffff' : '#ff60c8';
  c.lineWidth = Math.max(1, h * 0.035);
  hexPath(c, cx, cy, rx, ry);
  c.fill();
  c.stroke();
  c.shadowBlur = 0;
  // eye
  c.fillStyle = e.hitFlash > 0 ? '#ffffff' : '#ffd6f2';
  c.beginPath();
  c.arc(cx, cy - h * 0.04, Math.max(1, h * 0.17 * scale), 0, PI2);
  c.fill();
  c.fillStyle = '#ff2fa6';
  c.beginPath();
  c.arc(cx, cy - h * 0.04, Math.max(0.5, h * 0.08 * scale), 0, PI2);
  c.fill();
  // hover fins
  const fin = Math.sin(e.bob) * h * 0.06;
  c.strokeStyle = 'rgba(255,120,210,0.8)';
  c.lineWidth = Math.max(1, h * 0.03);
  c.beginPath();
  c.moveTo(cx - rx * 1.05, cy + fin);
  c.lineTo(cx - rx * 1.35, cy + fin);
  c.moveTo(cx + rx * 1.05, cy - fin);
  c.lineTo(cx + rx * 1.35, cy - fin);
  c.stroke();
  if (!e.alive) {
    c.strokeStyle = `rgba(255,150,220,${1 - e.deathT})`;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(cx, cy, ry + e.deathT * h * 0.7, 0, PI2);
    c.stroke();
  }
  c.restore();
}

function drawSentry(c, cx, cy, h, e) {
  const w = h * 0.6;
  const alpha = e.alive ? 1 : 1 - e.deathT;
  const scale = e.alive ? 1 : 1 - e.deathT * 0.4;
  c.save();
  c.globalAlpha = alpha;
  const halfW = (w * 0.5) * scale;
  const top = cy - (h * 0.5) * scale;
  const bot = cy + (h * 0.5) * scale;
  // tripod legs
  c.strokeStyle = 'rgba(255,184,92,0.7)';
  c.lineWidth = Math.max(1, h * 0.035);
  c.beginPath();
  c.moveTo(cx, bot - h * 0.28);
  c.lineTo(cx - halfW * 1.1, bot);
  c.moveTo(cx, bot - h * 0.28);
  c.lineTo(cx + halfW * 1.1, bot);
  c.moveTo(cx, bot - h * 0.28);
  c.lineTo(cx, bot);
  c.stroke();
  // body column
  c.shadowColor = 'rgba(255,184,92,0.8)';
  c.shadowBlur = Math.min(20, h * 0.2);
  c.fillStyle = 'rgba(90,58,10,0.96)';
  c.strokeStyle = e.hitFlash > 0 ? '#ffffff' : '#ffb85c';
  c.lineWidth = Math.max(1, h * 0.035);
  roundRectPath(c, cx - halfW, top, halfW * 2, (bot - h * 0.28) - top, h * 0.08);
  c.fill();
  c.stroke();
  c.shadowBlur = 0;
  // big lens eye
  const eyeY = top + (bot - h * 0.28 - top) * 0.34;
  const pulse = e.alerted ? 0.6 + 0.4 * Math.abs(Math.sin(e.bob * 0.8)) : 0.4;
  c.fillStyle = e.hitFlash > 0 ? '#ffffff' : `rgba(255,210,120,${pulse})`;
  c.beginPath();
  c.arc(cx, eyeY, Math.max(1, halfW * 0.72), 0, PI2);
  c.fill();
  c.fillStyle = '#ff7a3c';
  c.beginPath();
  c.arc(cx, eyeY, Math.max(0.5, halfW * 0.34), 0, PI2);
  c.fill();
  if (!e.alive) {
    c.strokeStyle = `rgba(255,200,120,${1 - e.deathT})`;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(cx, cy, halfW + e.deathT * h * 0.7, 0, PI2);
    c.stroke();
  }
  c.restore();
}

function drawProjectile(c, cx, cy, h) {
  const r = Math.max(2, h * 0.5);
  c.save();
  c.shadowColor = 'rgba(255,180,90,0.9)';
  c.shadowBlur = Math.min(24, r * 2);
  c.fillStyle = 'rgba(255,150,60,0.95)';
  c.beginPath();
  c.arc(cx, cy, r, 0, PI2);
  c.fill();
  c.shadowBlur = 0;
  c.fillStyle = '#fff4e0';
  c.beginPath();
  c.arc(cx, cy, r * 0.45, 0, PI2);
  c.fill();
  c.restore();
}

function drawHealth(c, cx, cy, h) {
  const s = h * 0.5;
  const bob = Math.sin(performance.now() / 320) * h * 0.08;
  c.save();
  c.translate(cx, cy + bob);
  c.shadowColor = 'rgba(92,255,176,0.85)';
  c.shadowBlur = Math.min(18, h * 0.35);
  c.fillStyle = 'rgba(10,40,26,0.9)';
  c.strokeStyle = '#5cffb0';
  c.lineWidth = Math.max(1, h * 0.05);
  roundRectPath(c, -s, -s, s * 2, s * 2, s * 0.25);
  c.fill();
  c.stroke();
  c.shadowBlur = 0;
  c.fillStyle = '#5cffb0';
  const arm = s * 0.6;
  const thick = s * 0.28;
  c.fillRect(-thick / 2, -arm, thick, arm * 2);
  c.fillRect(-arm, -thick / 2, arm * 2, thick);
  c.restore();
}

function drawExit(c, cx, cy, h, open) {
  const w = h * 0.5;
  const top = cy - h * 0.48;
  const bot = cy + h * 0.48;
  const col = open ? [92, 255, 120] : [255, 184, 92];
  c.save();
  // gate fill
  const g = c.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${open ? 0.32 : 0.12})`);
  g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},${open ? 0.08 : 0.03})`);
  c.fillStyle = g;
  c.fillRect(cx - w, top, w * 2, bot - top);
  // posts
  c.shadowColor = `rgba(${col[0]},${col[1]},${col[2]},0.8)`;
  c.shadowBlur = open ? Math.min(26, h * 0.14) : Math.min(12, h * 0.07);
  c.strokeStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
  c.lineWidth = Math.max(1.5, h * 0.04);
  c.beginPath();
  c.moveTo(cx - w, bot);
  c.lineTo(cx - w, top);
  c.lineTo(cx + w, top);
  c.lineTo(cx + w, bot);
  c.stroke();
  c.shadowBlur = 0;
  if (open) {
    const p = 0.5 + 0.5 * Math.sin(performance.now() / 240);
    for (let i = 1; i <= 3; i++) {
      c.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.25 * p})`;
      c.beginPath();
      c.moveTo(cx - w + i * (w * 0.5), top);
      c.lineTo(cx - w + i * (w * 0.5), bot);
      c.stroke();
    }
  } else {
    // locked bars (X)
    c.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.7)`;
    c.lineWidth = Math.max(1, h * 0.03);
    c.beginPath();
    c.moveTo(cx - w * 0.6, top + h * 0.2);
    c.lineTo(cx + w * 0.6, bot - h * 0.2);
    c.moveTo(cx + w * 0.6, top + h * 0.2);
    c.lineTo(cx - w * 0.6, bot - h * 0.2);
    c.stroke();
  }
  c.restore();
}

function roundRectPath(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

function drawWeapon() {
  const bobX = Math.sin(state.bobPhase) * 5;
  const bobY = Math.abs(Math.cos(state.bobPhase)) * 5;
  const kick = state.recoil * 14;
  const baseY = H + kick - bobY;
  const cx = W / 2 + bobX;
  c2(cx, baseY);
}
function c2(cx, baseY) {
  const s = H * 0.16; // weapon scale
  ctx.save();
  // body
  ctx.fillStyle = 'rgba(14,18,32,0.96)';
  ctx.strokeStyle = 'rgba(64,214,255,0.65)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.9, baseY);
  ctx.lineTo(cx - s * 0.5, baseY - s * 1.1);
  ctx.lineTo(cx + s * 0.1, baseY - s * 1.25);
  ctx.lineTo(cx + s * 0.35, baseY - s * 0.55);
  ctx.lineTo(cx + s * 0.9, baseY - s * 0.5);
  ctx.lineTo(cx + s * 0.9, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // barrel glow line
  ctx.strokeStyle = 'rgba(92,225,255,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.2, baseY - s * 0.95);
  ctx.lineTo(cx + s * 0.05, baseY - s * 1.15);
  ctx.stroke();
  // muzzle flash
  if (state.muzzle > 0) {
    const mx = cx + s * 0.05;
    const my = baseY - s * 1.2;
    const a = state.muzzle / 0.07;
    const grd = ctx.createRadialGradient(mx, my, 1, mx, my, s * 0.9 * a);
    grd.addColorStop(0, `rgba(255,255,255,${a})`);
    grd.addColorStop(0.4, `rgba(92,225,255,${0.7 * a})`);
    grd.addColorStop(1, 'rgba(92,225,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(mx, my, s * 0.9 * a, 0, PI2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCrosshair() {
  const cx = W / 2;
  const cy = H / 2;
  const spread = 5 + state.recoil * 6;
  ctx.save();
  ctx.strokeStyle = state.reloading ? 'rgba(255,184,92,0.9)' : 'rgba(120,240,255,0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - spread - 4, cy);
  ctx.lineTo(cx - spread, cy);
  ctx.moveTo(cx + spread, cy);
  ctx.lineTo(cx + spread + 4, cy);
  ctx.moveTo(cx, cy - spread - 4);
  ctx.lineTo(cx, cy - spread);
  ctx.moveTo(cx, cy + spread);
  ctx.lineTo(cx, cy + spread + 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(120,240,255,0.9)';
  ctx.fillRect(cx - 0.5, cy - 0.5, 1.5, 1.5);
  ctx.restore();
}

function drawVignette() {
  // permanent soft darkening at the corners for mood
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (state.damageFlash > 0) {
    const a = state.damageFlash / 0.55;
    const rg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.7);
    rg.addColorStop(0, 'rgba(255,40,70,0)');
    rg.addColorStop(1, `rgba(255,40,70,${0.55 * a})`);
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }
}

/* ── HUD ──────────────────────────────────────────────────────────────── */
function updateHud() {
  $('hudHealthVal').textContent = Math.round(player.health);
  $('hudLevelVal').textContent = `${state.levelIndex + 1}/${LEVELS.length}`;
  // ammo pips
  const pips = $('ammoPips');
  if (pips.childElementCount !== MAG_SIZE) {
    pips.innerHTML = '';
    for (let i = 0; i < MAG_SIZE; i++) {
      const s = document.createElement('span');
      s.className = 'rm-pip';
      pips.appendChild(s);
    }
  }
  [...pips.children].forEach((el, i) => {
    el.classList.toggle('is-spent', i >= state.mag);
  });
  $('reloadLabel').hidden = !state.reloading;
  // exit status
  const alive = aliveEnemies();
  $('hudExit').textContent = state.exitOpen
    ? t(lang, 'exitOpen')
    : t(lang, 'exitLocked', { n: alive });
  $('hudExit').classList.toggle('is-open', state.exitOpen);
  // low-health tint
  $('hudHealth').classList.toggle('is-low', player.health <= 30);
}

/* ── Overlay cards ────────────────────────────────────────────────────── */
function showOverlay(kind) {
  const overlay = $('overlay');
  $('touchLayer').hidden = kind !== null; // only during play
  if (kind === null) {
    overlay.hidden = true;
    return;
  }
  overlay.hidden = false;
  ['startCard', 'levelClearCard', 'gameOverCard', 'victoryCard'].forEach((id) => {
    $(id).hidden = true;
  });
  if (kind === 'title') {
    $('startCard').hidden = false;
  } else if (kind === 'levelclear') {
    $('levelClearCard').hidden = false;
    $('levelClearTitle').textContent = t(lang, 'levelClearBanner', { n: state.levelIndex + 1 });
    $('levelClearSub').textContent = t(lang, 'levelClearSub');
  } else if (kind === 'dead') {
    $('gameOverCard').hidden = false;
    $('gameOverSub').textContent = t(lang, 'gameOverSub', { level: state.levelIndex + 1 });
    $('gameOverStats').textContent = t(lang, 'statsLine', { level: state.levelIndex + 1, kills: state.totalKills });
  } else if (kind === 'victory') {
    $('victoryCard').hidden = false;
    $('victoryStats').textContent = t(lang, 'statsLine', { level: LEVELS.length, kills: state.totalKills });
  }
}

/* ── i18n wiring ──────────────────────────────────────────────────────── */
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
  // refresh any visible card
  if (state.mode === 'title') showOverlay('title');
  else if (state.mode === 'levelclear') showOverlay('levelclear');
  else if (state.mode === 'dead') showOverlay('dead');
  else if (state.mode === 'victory') showOverlay('victory');
  rememberLang(lang);
}

/* ── Input: touch stick + look zone + buttons ─────────────────────────── */
function setupTouch() {
  const stickZone = $('stickZone');
  const stickBase = $('stickBase');
  const stickKnob = $('stickKnob');
  const lookZone = $('lookZone');
  const R = 46; // stick radius in px

  let stickId = null;
  let baseX = 0;
  let baseY = 0;
  stickZone.addEventListener('pointerdown', (e) => {
    if (stickId !== null) return;
    stickId = e.pointerId;
    safeCapture(stickZone, e.pointerId);
    baseX = e.clientX;
    baseY = e.clientY;
    const zr = stickZone.getBoundingClientRect();
    stickBase.style.left = `${baseX - zr.left}px`;
    stickBase.style.top = `${baseY - zr.top}px`;
    stickBase.hidden = false;
    stickKnob.style.transform = 'translate(-50%,-50%)';
    sfx.unlock();
  });
  stickZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickId) return;
    let dx = e.clientX - baseX;
    let dy = e.clientY - baseY;
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    input.moveS = dx / R;
    input.moveF = -dy / R;
  });
  const endStick = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    input.moveF = 0;
    input.moveS = 0;
    stickBase.hidden = true;
  };
  stickZone.addEventListener('pointerup', endStick);
  stickZone.addEventListener('pointercancel', endStick);

  let lookId = null;
  let lastX = 0;
  let lastY = 0;
  lookZone.addEventListener('pointerdown', (e) => {
    if (lookId !== null) return;
    lookId = e.pointerId;
    safeCapture(lookZone, e.pointerId);
    lastX = e.clientX;
    lastY = e.clientY;
    sfx.unlock();
  });
  lookZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookId) return;
    input.lookDelta += (e.clientX - lastX) * LOOK_SENS;
    input.pitchDelta += (e.clientY - lastY) * PITCH_SENS;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  const endLook = (e) => {
    if (e.pointerId !== lookId) return;
    lookId = null;
  };
  lookZone.addEventListener('pointerup', endLook);
  lookZone.addEventListener('pointercancel', endLook);

  // Fire button (hold to auto-fire; fire() is cooldown-gated)
  const btnFire = $('btnFire');
  btnFire.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    sfx.unlock();
    input.firing = true;
    fire();
  });
  const stopFire = (e) => {
    e.stopPropagation();
    input.firing = false;
  };
  btnFire.addEventListener('pointerup', stopFire);
  btnFire.addEventListener('pointercancel', stopFire);
  btnFire.addEventListener('pointerleave', stopFire);

  const btnReload = $('btnReload');
  btnReload.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    sfx.unlock();
    startReload();
  });
}

/* ── Input: keyboard + mouse-look ─────────────────────────────────────── */
function setupKeyboard() {
  window.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    if (e.key === ' ') {
      sfx.unlock();
      fire();
      return;
    }
    if (k === 'r') {
      startReload();
      return;
    }
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys.delete(k);
  });

  // Desktop mouse look. Plain mouse drag-look already works through the look
  // zone's own pointer handlers (they fire for mouse too, unlocked). On top of
  // that, DOUBLE-CLICK enters classic pointer-lock mouse-look — while locked,
  // moving the mouse looks and clicking fires (Esc exits, per the browser).
  // Lock is on dblclick (not mousedown) so a single drag isn't swallowed by
  // the lock request freezing the cursor mid-drag.
  const lookZone = $('lookZone');
  lookZone.addEventListener('dblclick', () => {
    if (state.mode === 'play' && document.pointerLockElement !== lookZone) {
      lookZone.requestPointerLock?.();
    }
  });
  lookZone.addEventListener('mousedown', () => {
    sfx.unlock();
    if (document.pointerLockElement === lookZone) fire();
  });
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === lookZone) {
      input.lookDelta += e.movementX * MOUSE_SENS;
      input.pitchDelta += -e.movementY * 0.6;
    }
  });
}

/* ── Buttons ──────────────────────────────────────────────────────────── */
function setupButtons() {
  $('btnStart').addEventListener('click', () => {
    sfx.unlock();
    sfx.play('tap');
    startRun();
  });
  $('btnNext').addEventListener('click', () => {
    sfx.play('tap');
    loadLevel(state.levelIndex + 1);
    state.mode = 'play';
    showOverlay(null);
  });
  $('btnRetry').addEventListener('click', () => {
    sfx.play('tap');
    startRun();
  });
  $('btnVictoryAgain').addEventListener('click', () => {
    sfx.play('tap');
    startRun();
  });
}

/* ── Main loop ────────────────────────────────────────────────────────── */
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

/* ── Boot ─────────────────────────────────────────────────────────────── */
function init() {
  resize();
  applyStaticStrings(lang);
  document.title = `${t(lang, 'title')} — OGH`;
  buildLangSwitch();
  setupTouch();
  setupKeyboard();
  setupButtons();
  loadLevel(0);
  updateHud();
  showOverlay('title');
  requestAnimationFrame(loop);
  exposeTestHook();
}

/* ── Test / debug hook ────────────────────────────────────────────────── */
function exposeTestHook() {
  // Lets the automation harness (and devtools) inspect and drive the game
  // deterministically. Same convention as games/paintball's window.OGH_PAINTBALL
  // and games/fight-arena's window.OGH_FIGHT_ARENA.
  window.OGH_RAY_MAZE = {
    state,
    player,
    input,
    get W() { return W; },
    get H() { return H; },
    LEVELS,
    // geometry checks --------------------------------------------------
    /** Center-ray perpendicular distance to the wall the player faces. */
    centerWallDistance() {
      const h = castRay(player.x, player.y, Math.cos(player.dir), Math.sin(player.dir), isWall);
      return h.dist;
    },
    /** What the renderer computes for screen column x: cast distance and the
     *  exact vertical slice extent it draws. For cross-checking slice height
     *  against H/dist. */
    debugColumn(x) {
      const dirX = Math.cos(player.dir);
      const dirY = Math.sin(player.dir);
      const planeX = -dirY * Math.tan((66 * Math.PI) / 180 / 2);
      const planeY = dirX * Math.tan((66 * Math.PI) / 180 / 2);
      const cameraX = (2 * x) / W - 1;
      const hit = castRay(player.x, player.y, dirX + planeX * cameraX, dirY + planeY * cameraX, isWall);
      const dist = Math.max(0.0001, hit.dist);
      const horizon = Math.floor(H / 2 + player.pitch);
      const lineHeight = H / dist;
      const drawStart = Math.max(0, -lineHeight / 2 + horizon);
      const drawEnd = Math.min(H, lineHeight / 2 + horizon);
      return { dist, side: hit.side, cell: { x: hit.mapX, y: hit.mapY }, lineHeight, drawStart, drawEnd, sliceHeight: drawEnd - drawStart };
    },
    castRay: (x, y, dx, dy) => castRay(x, y, dx, dy, isWall),
    hasLineOfSight: (ax, ay, bx, by) => hasLineOfSight(ax, ay, bx, by, isWall),
    // drivers ----------------------------------------------------------
    fire,
    startReload,
    damagePlayer,
    /** Advance the simulation one deterministic step (bypasses rAF, which the
     *  browser throttles for background/automation tabs). */
    step(dt = 1 / 60) { update(dt); },
    render,
    loadLevel: (i) => { loadLevel(i); state.mode = 'play'; showOverlay(null); },
    startRun,
    setInput(partial) { Object.assign(input, partial); },
    teleport(x, y, dir) { player.x = x; player.y = y; if (dir !== undefined) player.dir = dir; },
    aliveEnemies,
    killAll() { for (const e of state.enemies) { if (e.alive) { e.alive = false; e.deathT = 1; state.kills++; state.totalKills++; } } checkExit(); updateHud(); },
    isWall,
    setLang: applyLang,
    get lang() { return lang; },
  };
}

init();
