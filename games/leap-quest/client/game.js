/**
 * Leap Quest — a solo side-scrolling platformer (OGH).
 *
 * game.js wires the pieces together: the level compiler (levels.js), the
 * player physics + wall-jump (player.js), the two enemy behaviours
 * (enemies.js), sound, i18n, HUD, input, the follow-camera and the Canvas
 * neon-vector renderer. It owns run state (mode, lives, coins, score, which
 * level) and the per-frame collision glue between the player and the world
 * (coins, star shells, spikes, pits, enemies, the goal flag).
 *
 * Camera: a smoothed follow-camera that keeps the player roughly centred and
 * is clamped to the level bounds, translating the world by -camera each
 * frame — the same translate-the-world shape as games/hill-rider and
 * games/neon-drift. It follows vertically too (needed for the tall wall-jump
 * shaft in level 4).
 *
 * RTL note: the play field is a fixed spatial simulation — the level layout,
 * the camera, the direction the player runs toward the flag, and the
 * LEFT/RIGHT/JUMP button positions never mirror. Only the DOM chrome
 * (header/cards/hint) flips for Arabic (see i18n.js). The stage and touch
 * layer are dir="ltr" in the markup and ctx.direction is forced 'ltr'.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import {
  TILE, LEVEL_DEFS, compileLevel, updateMover, resetMover,
} from './levels.js';
import {
  CONFIG as PC, makePlayer, resetPlayer, stepPlayer,
} from './player.js';
import { makeEnemy, stepEnemy, classifyContact } from './enemies.js';

const $ = (id) => document.getElementById(id);
const GAME_ID = 'leap-quest';

/* ------------------------------------------------------------------------ *
 * Tunables
 * ------------------------------------------------------------------------ */
const START_LIVES = 3;
const COIN_SCORE = 100;
const STOMP_SCORE = 200;
const LEVEL_BONUS = 1000;
const LIFE_BONUS = 250;
const LEVEL_CLEAR_HOLD = 1.9; // seconds the "Level clear" card auto-holds
const CAMERA_CHASE = 12; // exponential follow rate (1/s)

const THEMES = [
  { edge: '#5ce1ff', fill: 'rgba(92,225,255,0.10)', bg: ['#04060f', '#0a1226'], hill: 'rgba(92,225,255,0.05)' },
  { edge: '#ff6bcb', fill: 'rgba(255,107,203,0.10)', bg: ['#0b0410', '#1a0a1f'], hill: 'rgba(255,107,203,0.05)' },
  { edge: '#5cffb0', fill: 'rgba(92,255,176,0.10)', bg: ['#04100c', '#08201a'], hill: 'rgba(92,255,176,0.05)' },
  { edge: '#b78bff', fill: 'rgba(183,139,255,0.10)', bg: ['#08040f', '#160a26'], hill: 'rgba(183,139,255,0.05)' },
  { edge: '#ffb15c', fill: 'rgba(255,177,92,0.10)', bg: ['#0f0a04', '#1e1408'], hill: 'rgba(255,177,92,0.05)' },
];
const COL_COIN = '#ffd166';
const COL_STAR = '#ffe27a';
const COL_CRAWLER = '#ff5c7a';
const COL_STALKER = '#b78bff';
const COL_STALKER_HOT = '#ff7ab0';
const COL_PLAYER = '#eafcff';
const COL_POWER = '#ffd166';

/* ------------------------------------------------------------------------ *
 * Canvas
 * ------------------------------------------------------------------------ */
const canvas = $('view');
const ctx = canvas.getContext('2d');
let W = 800;
let H = 600;

function resize() {
  const r = canvas.getBoundingClientRect();
  W = Math.max(320, Math.round(r.width));
  H = Math.max(240, Math.round(r.height));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.direction = 'ltr';
}

const sfx = createOghSfx();

/* ------------------------------------------------------------------------ *
 * DOM refs
 * ------------------------------------------------------------------------ */
const overlay = $('overlay');
const startCard = $('startCard');
const clearCard = $('clearCard');
const resultCard = $('resultCard');

/* ------------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------------ */
let lang = detectLang();

const player = makePlayer(); // persistent — never reassigned (test hook holds it)
const input = { left: false, right: false, jump: false, jumpPressed: false };

const state = {
  mode: 'title', // title | play | levelclear | over | won
  levelIndex: 0,
  lives: START_LIVES,
  coins: 0,
  score: 0,
  best: 0,
  isNewBest: false,
  levelsCleared: 0,
  level: null,
  enemies: [],
  particles: [],
  floaters: [],
  clearTimer: 0,
  camera: { x: 0, y: 0 },
};

function theme() {
  return THEMES[state.levelIndex % THEMES.length];
}

const hooks = {
  onJump() { if (state.mode === 'play') sfx.play('hop'); },
  onWallJump() { if (state.mode === 'play') sfx.play('boing'); },
  onLand() {},
};

/* ------------------------------------------------------------------------ *
 * FX helpers
 * ------------------------------------------------------------------------ */
function spawnFloater(x, y, text, color) {
  state.floaters.push({ x, y, life: 0.85, maxLife: 0.85, text, color });
}
function burst(x, y, color, n = 8, spd = 150) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = spd * (0.4 + Math.random() * 0.8);
    state.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40,
      life: 0.5 + Math.random() * 0.3, maxLife: 0.8, color, r: 2 + Math.random() * 2,
    });
  }
}
function updateFx(dt) {
  for (let i = state.floaters.length - 1; i >= 0; i--) {
    const f = state.floaters[i];
    f.life -= dt; f.y -= 26 * dt;
    if (f.life <= 0) state.floaters.splice(i, 1);
  }
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt; p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

/* ------------------------------------------------------------------------ *
 * Level lifecycle
 * ------------------------------------------------------------------------ */
function buildEnemies(level) {
  return level.enemySpawns.map((s) => makeEnemy(s));
}

function loadLevel(i) {
  state.levelIndex = i;
  const level = compileLevel(LEVEL_DEFS[i]);
  state.level = level;
  state.enemies = buildEnemies(level);
  state.particles = [];
  state.floaters = [];
  resetPlayer(player, level.spawn);
  centerCameraOnPlayer();
  updateHud();
}

function respawnInLevel() {
  const level = state.level;
  resetPlayer(player, level.spawn);
  player.invuln = PC.RESPAWN_INVULN;
  state.enemies = buildEnemies(level); // fresh patrols so you never respawn onto a charge
  level.movers.forEach(resetMover);
  centerCameraOnPlayer();
}

function startRun() {
  state.mode = 'play';
  state.lives = START_LIVES;
  state.coins = 0;
  state.score = 0;
  state.levelsCleared = 0;
  state.isNewBest = false;
  loadLevel(0);
  overlay.hidden = true;
  sfx.play('tap');
}

function levelClear() {
  if (state.mode !== 'play') return;
  state.mode = 'levelclear';
  state.levelsCleared++;
  state.score += LEVEL_BONUS + state.lives * LIFE_BONUS;
  state.clearTimer = LEVEL_CLEAR_HOLD;
  updateHud();
  renderClearCard();
  startCard.hidden = true;
  resultCard.hidden = true;
  clearCard.hidden = false;
  overlay.hidden = false;
  sfx.play('win');
  burst(player.x + player.w / 2, player.y + player.h / 2, theme().edge, 16, 200);
}

function advanceLevel() {
  const next = state.levelIndex + 1;
  if (next >= LEVEL_DEFS.length) {
    endRun('won');
    return;
  }
  state.mode = 'play';
  loadLevel(next);
  overlay.hidden = true;
  clearCard.hidden = true;
}

function endRun(kind) {
  state.mode = kind; // 'over' | 'won'
  state.isNewBest = state.score > state.best;
  if (state.isNewBest) {
    state.best = state.score;
    persistBest();
  }
  startCard.hidden = true;
  clearCard.hidden = true;
  resultCard.hidden = false;
  overlay.hidden = false;
  renderResult();
  sfx.play(kind === 'won' ? 'win' : 'die');
}

/* ------------------------------------------------------------------------ *
 * Damage / defeat
 * ------------------------------------------------------------------------ */
function loseLife() {
  state.lives--;
  updateHud();
  if (state.lives <= 0) {
    sfx.play('die');
    endRun('over');
  } else {
    sfx.play('die');
    respawnInLevel();
  }
}

function takeHit(fromX) {
  if (player.invuln > 0 || state.mode !== 'play') return;
  if (player.powered) {
    player.powered = false;
    player.invuln = PC.HIT_INVULN;
    const away = Math.sign(player.x + player.w / 2 - fromX) || -player.facing;
    player.vx = away * 260;
    player.vy = -260;
    sfx.play('screech');
    spawnFloater(player.x + player.w / 2, player.y, '-shell', COL_POWER);
    burst(player.x + player.w / 2, player.y + player.h / 2, COL_POWER, 8);
  } else {
    loseLife();
  }
}

function defeatEnemy(e) {
  e.dead = true;
  e.deathT = 0;
  player.vy = PC.STOMP_BOUNCE;
  player.jumpCutAvailable = false; // stomp bounce is always full height
  player.onMover = null;
  player.squash = 1;
  state.score += STOMP_SCORE;
  updateHud();
  spawnFloater(e.x + e.w / 2, e.y, `+${STOMP_SCORE}`, '#ffffff');
  burst(e.x + e.w / 2, e.y + e.h / 2, e.type === 'stalker' ? COL_STALKER : COL_CRAWLER, 10);
  sfx.play('thwack');
}

/* ------------------------------------------------------------------------ *
 * Per-frame collision glue
 * ------------------------------------------------------------------------ */
function pOverlapsRect(rx, ry, rw, rh) {
  return player.x + player.w > rx && player.x < rx + rw
    && player.y + player.h > ry && player.y < ry + rh;
}

function checkCollectibles() {
  const lvl = state.level;
  for (const c of lvl.coins) {
    if (c.taken) continue;
    if (pOverlapsRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2)) {
      c.taken = true;
      state.coins++;
      state.score += COIN_SCORE;
      updateHud();
      sfx.play('pickup');
      spawnFloater(c.x, c.y - 6, `+${COIN_SCORE}`, COL_COIN);
      burst(c.x, c.y, COL_COIN, 6, 120);
    }
  }
  for (const s of lvl.stars) {
    if (s.taken) continue;
    if (pOverlapsRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2)) {
      s.taken = true;
      player.powered = true;
      sfx.play('chain');
      spawnFloater(s.x, s.y - 6, '+shell', COL_STAR);
      burst(s.x, s.y, COL_STAR, 12, 170);
    }
  }
}

function checkSpikes() {
  for (const sp of state.level.spikes) {
    if (pOverlapsRect(sp.x, sp.y, sp.w, sp.h)) {
      takeHit(player.x + player.w / 2); // knock straight up (no horizontal bias)
      break;
    }
  }
}

function checkEnemies() {
  for (const e of state.enemies) {
    const kind = classifyContact(player, e);
    if (kind === 'stomp') defeatEnemy(e);
    else if (kind === 'hurt') takeHit(e.x + e.w / 2);
  }
}

function checkGoal() {
  const g = state.level.goal;
  if (pOverlapsRect(g.x, g.y, g.w, g.h)) levelClear();
}

/* ------------------------------------------------------------------------ *
 * Camera
 * ------------------------------------------------------------------------ */
function cameraTarget() {
  const lvl = state.level;
  const cx = player.x + player.w / 2 - W / 2;
  const cy = player.y + player.h / 2 - H * 0.56;
  return {
    x: Math.max(0, Math.min(cx, Math.max(0, lvl.pixelW - W))),
    y: Math.max(0, Math.min(cy, Math.max(0, lvl.pixelH - H))),
  };
}
function centerCameraOnPlayer() {
  const tgt = cameraTarget();
  state.camera.x = tgt.x;
  state.camera.y = tgt.y;
}
function updateCamera(dt) {
  const tgt = cameraTarget();
  const k = 1 - Math.exp(-CAMERA_CHASE * dt);
  state.camera.x += (tgt.x - state.camera.x) * k;
  state.camera.y += (tgt.y - state.camera.y) * k;
}

/* ------------------------------------------------------------------------ *
 * Update
 * ------------------------------------------------------------------------ */
function update(dt) {
  updateFx(dt);

  if (state.mode === 'levelclear') {
    state.clearTimer -= dt;
    if (state.clearTimer <= 0) advanceLevel();
    updateCamera(dt);
    return;
  }
  if (state.mode !== 'play') {
    updateCamera(dt);
    return;
  }

  for (const m of state.level.movers) updateMover(m, dt);

  stepPlayer(player, input, dt, state.level, state.level.movers, hooks);

  for (const e of state.enemies) stepEnemy(e, dt, state.level, player);
  // remove enemies whose death animation finished
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    if (state.enemies[i].dead && state.enemies[i].deathT > 0.34) state.enemies.splice(i, 1);
  }

  checkEnemies();
  if (state.mode !== 'play') { updateCamera(dt); return; } // a hit may have ended the run
  checkCollectibles();
  checkSpikes();
  if (state.mode !== 'play') { updateCamera(dt); return; }
  checkGoal();

  // Pit death (fell below the level)
  if (state.mode === 'play' && player.y > state.level.killY) {
    burst(player.x + player.w / 2, H, theme().edge, 6);
    loseLife();
  }

  updateCamera(dt);
}

/* ------------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------------ */
function drawBackground() {
  const th = theme();
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, th.bg[0]);
  grad.addColorStop(1, th.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // parallax stars
  ctx.fillStyle = th.hill;
  const sx = state.camera.x * 0.15;
  for (let i = 0; i < 40; i++) {
    const x = ((i * 97.3 - sx) % (W + 40) + W + 40) % (W + 40) - 20;
    const y = (i * 53.7) % (H * 0.7);
    ctx.fillRect(x, y, 2, 2);
  }
  // parallax hill silhouettes
  for (let layer = 0; layer < 2; layer++) {
    const par = 0.2 + layer * 0.18;
    const off = state.camera.x * par;
    const base = H * (0.72 + layer * 0.1);
    const amp = 60 - layer * 18;
    const wl = 320 - layer * 90;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) {
      const y = base + Math.sin((x + off) / wl * Math.PI * 2) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = layer === 0 ? th.hill : 'rgba(255,255,255,0.03)';
    ctx.fill();
  }
}

function drawTiles() {
  const lvl = state.level;
  const th = theme();
  const c0 = Math.max(0, Math.floor(state.camera.x / TILE) - 1);
  const c1 = Math.min(lvl.cols - 1, Math.floor((state.camera.x + W) / TILE) + 1);
  const r0 = Math.max(0, Math.floor(state.camera.y / TILE) - 1);
  const r1 = Math.min(lvl.rows - 1, Math.floor((state.camera.y + H) / TILE) + 1);

  // fills first
  ctx.fillStyle = th.fill;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (!lvl.solid(c, r)) continue;
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }
  // glowing edges only on exposed faces (clean platform outlines)
  ctx.strokeStyle = th.edge;
  ctx.lineWidth = 2.2;
  ctx.shadowColor = th.edge;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (!lvl.solid(c, r)) continue;
      const x = c * TILE;
      const y = r * TILE;
      if (!lvl.solid(c, r - 1)) { ctx.moveTo(x, y + 0.5); ctx.lineTo(x + TILE, y + 0.5); }
      if (!lvl.solid(c, r + 1)) { ctx.moveTo(x, y + TILE - 0.5); ctx.lineTo(x + TILE, y + TILE - 0.5); }
      if (!lvl.solid(c - 1, r)) { ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + TILE); }
      if (!lvl.solid(c + 1, r)) { ctx.moveTo(x + TILE - 0.5, y); ctx.lineTo(x + TILE - 0.5, y + TILE); }
    }
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawSpikes() {
  ctx.fillStyle = 'rgba(255,92,122,0.16)';
  ctx.strokeStyle = COL_CRAWLER;
  ctx.lineWidth = 2;
  ctx.shadowColor = COL_CRAWLER;
  ctx.shadowBlur = 8;
  for (const sp of state.level.spikes) {
    const teeth = Math.max(1, Math.round(sp.w / 14));
    const tw = sp.w / teeth;
    for (let i = 0; i < teeth; i++) {
      const x = sp.x + i * tw;
      ctx.beginPath();
      ctx.moveTo(x, sp.y + sp.h);
      ctx.lineTo(x + tw / 2, sp.y);
      ctx.lineTo(x + tw, sp.y + sp.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
}

function drawMovers() {
  const th = theme();
  ctx.save();
  ctx.strokeStyle = th.edge;
  ctx.fillStyle = th.fill;
  ctx.lineWidth = 2.4;
  ctx.shadowColor = th.edge;
  ctx.shadowBlur = 10;
  for (const m of state.level.movers) {
    roundRect(m.x, m.y, m.w, m.h, 6);
    ctx.fill();
    ctx.stroke();
    // chevrons hint the motion axis
    ctx.beginPath();
    if (m.axis === 'x') {
      const cy = m.y + m.h / 2;
      ctx.moveTo(m.x + 8, cy - 4); ctx.lineTo(m.x + 12, cy); ctx.lineTo(m.x + 8, cy + 4);
      ctx.moveTo(m.x + m.w - 8, cy - 4); ctx.lineTo(m.x + m.w - 12, cy); ctx.lineTo(m.x + m.w - 8, cy + 4);
    } else {
      const cx = m.x + m.w / 2;
      ctx.moveTo(cx - 4, m.y + 8); ctx.lineTo(cx, m.y + 4); ctx.lineTo(cx + 4, m.y + 8);
      ctx.moveTo(cx - 4, m.y + m.h - 8); ctx.lineTo(cx, m.y + m.h - 4); ctx.lineTo(cx + 4, m.y + m.h - 8);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawCoins(now) {
  ctx.save();
  ctx.strokeStyle = COL_COIN;
  ctx.fillStyle = 'rgba(255,209,102,0.22)';
  ctx.lineWidth = 2.4;
  ctx.shadowColor = COL_COIN;
  ctx.shadowBlur = 10;
  for (const c of state.level.coins) {
    if (c.taken) continue;
    const bob = Math.sin(now * 3 + c.x * 0.05) * 3;
    const squash = 0.6 + 0.4 * Math.abs(Math.sin(now * 2.4 + c.x * 0.03));
    ctx.save();
    ctx.translate(c.x, c.y + bob);
    ctx.scale(squash, 1);
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawStars(now) {
  ctx.save();
  ctx.strokeStyle = COL_STAR;
  ctx.fillStyle = 'rgba(255,226,122,0.24)';
  ctx.lineWidth = 2.2;
  ctx.shadowColor = COL_STAR;
  ctx.shadowBlur = 12;
  for (const s of state.level.stars) {
    if (s.taken) continue;
    const bob = Math.sin(now * 2.6 + s.x * 0.05) * 3;
    ctx.save();
    ctx.translate(s.x, s.y + bob);
    ctx.rotate(Math.sin(now * 1.5 + s.x) * 0.15);
    starPath(0, 0, 5, s.r, s.r * 0.46);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawGoal(now) {
  const g = state.level.goal;
  const th = theme();
  const px = g.x;
  const topY = g.y;
  ctx.save();
  ctx.strokeStyle = th.edge;
  ctx.shadowColor = th.edge;
  ctx.shadowBlur = 12;
  ctx.lineWidth = 3;
  // pole
  ctx.beginPath();
  ctx.moveTo(px, topY);
  ctx.lineTo(px, topY + g.h);
  ctx.stroke();
  // waving flag
  ctx.fillStyle = th.fill;
  ctx.beginPath();
  ctx.moveTo(px, topY + 2);
  const wave = Math.sin(now * 4) * 4;
  ctx.lineTo(px + 30 + wave, topY + 12);
  ctx.lineTo(px, topY + 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // glowing finial
  ctx.fillStyle = th.edge;
  ctx.beginPath();
  ctx.arc(px, topY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(e, now) {
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const base = e.type === 'stalker' ? (e.alerted ? COL_STALKER_HOT : COL_STALKER) : COL_CRAWLER;
  ctx.save();
  ctx.translate(cx, cy);
  if (e.dead) {
    const k = 1 - e.deathT / 0.34;
    ctx.globalAlpha = Math.max(0, k);
    ctx.scale(1 + (1 - k) * 0.4, Math.max(0.08, k * 0.5));
  }
  ctx.strokeStyle = base;
  ctx.fillStyle = e.type === 'stalker' ? 'rgba(183,139,255,0.16)' : 'rgba(255,92,122,0.16)';
  ctx.lineWidth = 2.4;
  ctx.shadowColor = base;
  ctx.shadowBlur = 9;

  const hw = e.w / 2;
  const hh = e.h / 2;
  if (e.type === 'stalker') {
    // angular, spiky body
    ctx.beginPath();
    ctx.moveTo(-hw, hh);
    ctx.lineTo(-hw + 3, -hh + 4);
    ctx.lineTo(-hw * 0.4, -hh);
    ctx.lineTo(0, -hh + 5);
    ctx.lineTo(hw * 0.4, -hh);
    ctx.lineTo(hw - 3, -hh + 4);
    ctx.lineTo(hw, hh);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // rounded blob
    roundRect(-hw, -hh, e.w, e.h, 9);
    ctx.fill();
    ctx.stroke();
    // little feet
    const wob = Math.sin(e.wobble) * 2;
    ctx.beginPath();
    ctx.moveTo(-hw + 6, hh); ctx.lineTo(-hw + 6, hh + 4 + wob);
    ctx.moveTo(hw - 6, hh); ctx.lineTo(hw - 6, hh + 4 - wob);
    ctx.stroke();
  }
  // eyes (look toward travel/alert direction)
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  const ex = e.dir * 3;
  ctx.beginPath();
  ctx.arc(-5 + ex, -3, 3, 0, Math.PI * 2);
  ctx.arc(5 + ex, -3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#101018';
  ctx.beginPath();
  ctx.arc(-5 + ex + e.dir, -3, 1.4, 0, Math.PI * 2);
  ctx.arc(5 + ex + e.dir, -3, 1.4, 0, Math.PI * 2);
  ctx.fill();
  if (e.type === 'stalker' && e.alerted) {
    ctx.fillStyle = COL_STALKER_HOT;
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, -hh - 4);
  }
  ctx.restore();
}

function drawPlayer(now) {
  // blink while invulnerable
  if (player.invuln > 0 && Math.floor(now * 12) % 2 === 0) return;

  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  const th = theme();

  // squash & stretch from vertical speed + jump/land pulse
  let sy = 1;
  let sx = 1;
  if (!player.grounded) {
    const tt = Math.max(-1, Math.min(1, player.vy / 720));
    sy = 1 - tt * 0.1;
    sx = 1 + tt * 0.1;
  }
  sy *= 1 - player.squash * 0.14;
  sx *= 1 + player.squash * 0.12;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, sy);

  const hw = player.w / 2;
  const hh = player.h / 2;

  // power aura
  if (player.powered) {
    ctx.strokeStyle = COL_POWER;
    ctx.shadowColor = COL_POWER;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, hw + 7 + Math.sin(now * 6) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // body
  ctx.fillStyle = 'rgba(234,252,255,0.16)';
  ctx.strokeStyle = COL_PLAYER;
  ctx.lineWidth = 2.6;
  ctx.shadowColor = player.powered ? COL_POWER : COL_PLAYER;
  ctx.shadowBlur = 12;
  roundRect(-hw, -hh, player.w, player.h, 8);
  ctx.fill();
  ctx.stroke();

  // wall-slide scrape marks
  if (player.wallSliding) {
    ctx.strokeStyle = th.edge;
    ctx.shadowColor = th.edge;
    ctx.lineWidth = 2;
    const s = -player.wallDir;
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      ctx.moveTo(s * hw, i * 6);
      ctx.lineTo(s * (hw + 5), i * 6 + 3);
    }
    ctx.stroke();
  }

  // visor / eyes toward facing
  ctx.shadowBlur = 0;
  ctx.fillStyle = th.edge;
  const fx = player.facing * 3;
  roundRect(-6 + fx, -8, 12, 7, 3);
  ctx.fill();
  ctx.fillStyle = '#0a0e1a';
  ctx.beginPath();
  ctx.arc(fx + player.facing * 3, -4.5, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // running feet
  if (player.grounded && Math.abs(player.vx) > 12) {
    ctx.strokeStyle = COL_PLAYER;
    ctx.lineWidth = 2.4;
    const swing = Math.sin(player.runPhase) * 4;
    ctx.beginPath();
    ctx.moveTo(-5, hh); ctx.lineTo(-5 + swing, hh + 4);
    ctx.moveTo(5, hh); ctx.lineTo(5 - swing, hh + 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFloaters() {
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life / f.maxLife));
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function render() {
  const now = performance.now() / 1000;
  drawBackground();
  if (!state.level) return;

  ctx.save();
  ctx.translate(-Math.round(state.camera.x), -Math.round(state.camera.y));

  drawTiles();
  drawSpikes();
  drawMovers();
  drawGoal(now);
  drawStars(now);
  drawCoins(now);
  drawParticles();
  for (const e of state.enemies) drawEnemy(e, now);
  drawPlayer(now);
  drawFloaters();

  ctx.restore();
}

/* ---- small canvas helpers --------------------------------------------- */
function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, rr); return; }
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
function starPath(cx, cy, spikes, outer, inner) {
  ctx.beginPath();
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? outer : inner;
    const a = i * step - Math.PI / 2;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/* ------------------------------------------------------------------------ *
 * HUD + overlay text
 * ------------------------------------------------------------------------ */
function updateHud() {
  $('livesVal').textContent = String(Math.max(0, state.lives));
  $('coinsVal').textContent = String(state.coins);
  $('levelVal').textContent = `${state.levelIndex + 1}/${LEVEL_DEFS.length}`;
  $('scoreVal').textContent = String(state.score);
}

function renderBestLines() {
  const line = `${t(lang, 'bestLabel')}: ${state.best}`;
  $('bestLineStart').textContent = line;
  $('bestLineEnd').textContent = line;
}

function renderClearCard() {
  $('clearTitle').textContent = t(lang, 'levelClearTitle');
  $('clearSub').textContent = t(lang, 'levelClearSub');
  $('clearScoreLine').textContent = `${t(lang, 'scoreLabel')}: ${state.score}`;
}

function renderResult() {
  const won = state.mode === 'won';
  $('resultTitle').textContent = t(lang, won ? 'winTitle' : 'overTitle');
  $('resultSub').textContent = t(lang, won ? 'winSub' : 'overSub');
  $('finalScoreLine').textContent = `${t(lang, 'finalScoreLabel')}: ${state.score}`;
  $('levelsClearedLine').textContent = `${t(lang, 'levelsClearedLabel')}: ${state.levelsCleared}/${LEVEL_DEFS.length}`;
  $('newBestLine').hidden = !state.isNewBest;
  renderBestLines();
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
    { best: state.best, levelsCleared: state.levelsCleared },
    { label: 'Leap Quest', summary: `Best ${state.best}` },
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
  if (state.mode === 'levelclear') renderClearCard();
  if (state.mode === 'over' || state.mode === 'won') renderResult();
  rememberLang(lang);
  resize();
}

/* ------------------------------------------------------------------------ *
 * Input — on-screen LEFT / RIGHT / JUMP via Pointer Events (multi-touch:
 * each button owns its own pointer), plus keyboard as a desktop bonus. The
 * JUMP button doubles as the wall-jump input (context-sensitive in
 * player.js), so no separate ability button is needed.
 * ------------------------------------------------------------------------ */
function bindHold(el, onDown, onUp) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sfx.unlock();
    el.classList.add('is-active');
    onDown();
  });
  const end = (e) => {
    if (e) e.preventDefault();
    el.classList.remove('is-active');
    onUp();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', end);
}

function pressJump() {
  input.jump = true;
  input.jumpPressed = true;
}

function setupTouch() {
  bindHold($('btnLeft'), () => { input.left = true; }, () => { input.left = false; });
  bindHold($('btnRight'), () => { input.right = true; }, () => { input.right = false; });
  bindHold($('btnJump'), () => { pressJump(); }, () => { input.jump = false; });
}

function menuAction() {
  // shared Space/Enter handler for whichever overlay is up
  if (state.mode === 'title' || state.mode === 'over' || state.mode === 'won') {
    sfx.unlock();
    startRun();
    return true;
  }
  if (state.mode === 'levelclear') {
    sfx.unlock();
    advanceLevel();
    return true;
  }
  return false;
}

function setupKeyboard() {
  const LEFT = new Set(['ArrowLeft', 'a', 'A']);
  const RIGHT = new Set(['ArrowRight', 'd', 'D']);
  const JUMP = new Set([' ', 'Spacebar', 'ArrowUp', 'w', 'W', 'z', 'Z']);
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (LEFT.has(k) || RIGHT.has(k) || JUMP.has(k)) e.preventDefault();
    if ((JUMP.has(k) || k === 'Enter') && state.mode !== 'play') {
      if (!e.repeat && menuAction()) return;
      if (state.mode !== 'play') return;
    }
    if (LEFT.has(k)) input.left = true;
    if (RIGHT.has(k)) input.right = true;
    if (JUMP.has(k) && !e.repeat) pressJump();
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key;
    if (LEFT.has(k)) input.left = false;
    if (RIGHT.has(k)) input.right = false;
    if (JUMP.has(k)) input.jump = false;
  });
}

function setupButtons() {
  $('btnStart').addEventListener('click', () => { sfx.unlock(); startRun(); });
  $('btnAgain').addEventListener('click', () => { sfx.unlock(); startRun(); });
  $('btnContinue').addEventListener('click', () => { sfx.unlock(); advanceLevel(); });
}

/* ------------------------------------------------------------------------ *
 * Main loop
 * ------------------------------------------------------------------------ */
let lastNow = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - lastNow) / 1000);
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
  loadLevel(0); // decorative title-screen level
  setupTouch();
  setupKeyboard();
  setupButtons();
  applyLang(lang);
  updateHud();

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });
  exposeTestHook();
}

/* ------------------------------------------------------------------------ *
 * Test / debug hook — same convention as games/hill-rider's
 * window.OGH_HILL_RIDER and games/pop-the-bugs's window.OGH_POP_BUGS.
 * `player`/`state`/`input` are live references (player is never reassigned,
 * see player.js) so a harness can drive and inspect the real running game:
 * set input flags, call tick(dtMs) to advance deterministically, jump to a
 * level, teleport the body, etc.
 * ------------------------------------------------------------------------ */
function exposeTestHook() {
  window.OGH_LEAP_QUEST = {
    state,
    player,
    input,
    PC,
    TILE,
    get W() { return W; },
    get H() { return H; },
    LEVEL_COUNT: LEVEL_DEFS.length,
    startRun,
    loadLevel(i) { state.mode = 'play'; overlay.hidden = true; loadLevel(i); },
    advanceLevel,
    respawnInLevel,
    levelClear,
    setLives(n) { state.lives = n; updateHud(); },
    teleport(x, y) { player.x = x; player.y = y; player.vx = 0; player.vy = 0; },
    /** Manually advance one frame by dtMs — same code path as loop(). */
    tick(dtMs) { update(Math.min(0.033, dtMs / 1000)); },
  };
}

init();
