/**
 * Fight Arena — 1v1 side-view versus fighting game.
 *
 * This file owns everything the pure sim does not: canvas rendering (neon
 * vector fighters, stage, HUD health bars / timer / round banners), keyboard +
 * touch input, sfx, i18n wiring, the character-select screen, and the match
 * glue (fixed-timestep loop, mode/AI selection, round/match overlays).
 *
 * combat.js owns the whole fight simulation (state machine, hitbox/hurtbox
 * overlap, physics, projectiles, round/match structure) in plain canvas-pixel
 * units with no DOM dependency, so it is directly steppable from the test hook
 * window.OGH_FIGHT_ARENA at the bottom — same pure-sim split as
 * games/billiards' physics.js. ai.js produces the vs-Computer input.
 *
 * The fight runs on a FIXED 60 Hz logical step (accumulator below): attack
 * startup/active/recovery windows and hit detection are deterministic and
 * frame-exact regardless of the display refresh rate, and a test can advance
 * the sim one exact step at a time.
 */

import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import { CHARACTER_IDS, getCharacter } from './characters.js';
import {
  createMatch, stepMatch, hurtbox, activeHitbox, rectsOverlap,
  STAGE, FIXED_DT, BODY_W, STAND_H, CROUCH_H, ROUNDS_TO_WIN,
} from './combat.js';
import { createAi, aiInput } from './ai.js';

const $ = (id) => document.getElementById(id);
const sfx = createOghSfx();
const canvas = $('game');
const ctx = canvas.getContext('2d');
ctx.direction = 'ltr'; // belt-and-suspenders; the stage never mirrors under RTL

const DEBUG = /[?&]debug=1/.test(location.search);
let debugBoxes = DEBUG;
const FORCE_TOUCH = /[?&]touch=1/.test(location.search);

let lang = detectLang();

/* ------------------------------------------------------------------------ *
 * UI / session state
 * ------------------------------------------------------------------------ */
const ui = {
  screen: 'select',     // 'select' | 'fight' | 'match'
  mode: 'local',        // 'local' | 'ai'
  aiDiff: 'normal',
  sel: ['volt', 'boulder'],
  match: null,
  ai: null,
  preview: [null, null],
};

// Per-player held inputs; both keyboard and touch and the test hook write here.
const rawInput = [freshInput(), freshInput()];
function freshInput() {
  return { left: false, right: false, up: false, down: false, lp: false, hp: false, lk: false, hk: false, special: false };
}
function clearInputs() {
  for (const inp of rawInput) for (const k of Object.keys(inp)) inp[k] = false;
}

// Render-only feedback state.
const hudHp = [100, 100];   // smoothly-draining displayed HP (per player)
let shake = 0;
let renderFrame = 0;
const banner = { text: '', sub: '', life: 0, color: '#e8ecff' };

/* ------------------------------------------------------------------------ *
 * Neon palette (concrete strings — canvas needs them)
 * ------------------------------------------------------------------------ */
const COL = {
  bg0: '#05060d',
  bg1: '#0b0f22',
  floor: '#141a33',
  floorGlow: 'rgba(92, 225, 255, 0.5)',
  fg: '#e8ecff',
  dim: '#8b93b8',
  good: '#5cffb0',
  warn: '#ffd166',
  bad: '#ff5c7a',
  accent: '#5ce1ff',
  accent2: '#ff6bcb',
};

/* ======================================================================== *
 * MATCH FLOW
 * ======================================================================== */
function startMatch() {
  clearInputs();
  ui.match = createMatch(ui.mode, ui.sel);
  ui.ai = ui.mode === 'ai' ? createAi(ui.aiDiff) : null;
  hudHp[0] = ui.match.fighters[0].maxHp;
  hudHp[1] = ui.match.fighters[1].maxHp;
  shake = 0;
  ui.screen = 'fight';
  $('overlay').setAttribute('hidden', '');
  setBanner(t(lang, 'roundLabel', { n: 1 }), '', 90, COL.accent);
  updateTouchVisibility();
  updateHint();
  srSay(`${t(lang, 'roundLabel', { n: 1 })}. ${t(lang, 'fightGo')}`);
  sfx.unlock();
}

function showMatchEnd() {
  ui.screen = 'match';
  const w = ui.match.matchWinner;
  const name = t(lang, getCharacter(ui.sel[w]).nameKey);
  const who = ui.mode === 'ai' && w === 1 ? t(lang, 'cpuLabel') : `${t(lang, w === 0 ? 'p1Label' : 'p2Label')}`;
  $('matchTitle').textContent = t(lang, 'matchWinLabel', { name });
  $('matchLine').textContent = `${who} · ${ui.match.wins[0]}–${ui.match.wins[1]}`;
  $('selectCard').setAttribute('hidden', '');
  $('matchCard').removeAttribute('hidden');
  $('overlay').removeAttribute('hidden');
  updateTouchVisibility();
  srSay(t(lang, 'matchWinLabel', { name }));
  sfx.play('win');
}

function showSelect() {
  ui.screen = 'select';
  ui.match = null;
  $('matchCard').setAttribute('hidden', '');
  $('selectCard').removeAttribute('hidden');
  $('overlay').removeAttribute('hidden');
  rebuildPreview();
  updateTouchVisibility();
  updateHint();
}

/* ======================================================================== *
 * FIXED-TIMESTEP LOOP
 * ======================================================================== */
let acc = 0;
let lastNow = performance.now();

function stepOnce() {
  if (ui.screen !== 'fight' || !ui.match) return;
  const p2 = ui.match.mode === 'ai' ? aiInput(ui.ai, ui.match, 1) : rawInput[1];
  const events = stepMatch(ui.match, [rawInput[0], p2]);
  handleEvents(events);
  if (ui.match.phase === 'matchEnd') showMatchEnd();
}

function loop(now) {
  let dt = (now - lastNow) / 1000;
  lastNow = now;
  if (dt > 0.1) dt = 0.1; // clamp after a tab-switch so we don't spiral
  acc += dt;
  let guard = 0;
  while (acc >= FIXED_DT && guard < 6) { stepOnce(); acc -= FIXED_DT; guard += 1; }
  render();
  requestAnimationFrame(loop);
}

function handleEvents(events) {
  for (const ev of events) {
    switch (ev.type) {
      case 'hit':
        sfx.play('thwack');
        shake = Math.min(14, 5 + ev.dmg * 0.4);
        break;
      case 'block':
        sfx.play('clack');
        shake = Math.max(shake, 3);
        break;
      case 'swing':
        if (ev.kind === 'projectile') break; // 'fire' handles it
        if (ev.kind === 'uppercut' || ev.kind === 'rush' || ev.key === 'hp' || ev.key === 'hk') sfx.play('whoosh');
        else sfx.play('tap');
        break;
      case 'fire': sfx.play('screech'); break;
      case 'dash': sfx.play('tap'); break;
      case 'ko': {
        sfx.play('die');
        shake = 16;
        let msg;
        if (ev.draw) msg = t(lang, 'drawLabel');
        else {
          const name = t(lang, getCharacter(ui.sel[ev.winner]).nameKey);
          msg = t(lang, 'roundWinLabel', { name });
        }
        setBanner(ev.draw ? t(lang, 'drawLabel') : t(lang, ev.timeOut ? 'timeUpLabel' : 'koLabel'), msg, 130, COL.accent2);
        srSay(msg);
        break;
      }
      case 'fightCue':
        setBanner(t(lang, 'fightGo'), '', 55, COL.good);
        sfx.play('pickup');
        break;
      case 'roundStart':
        setBanner(t(lang, 'roundLabel', { n: ev.round }), '', 90, COL.accent);
        srSay(t(lang, 'roundLabel', { n: ev.round }));
        break;
      default: break;
    }
  }
}

function setBanner(text, sub, life, color) {
  banner.text = text; banner.sub = sub || ''; banner.life = life; banner.color = color || COL.fg;
}

/* ======================================================================== *
 * RENDER
 * ======================================================================== */
function render() {
  renderFrame += 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawBackground();

  let sx = 0;
  let sy = 0;
  if (shake > 0.4) {
    sx = (Math.random() - 0.5) * shake;
    sy = (Math.random() - 0.5) * shake;
    shake *= 0.86;
  }
  ctx.save();
  ctx.translate(sx, sy);
  drawFloor();

  if (ui.screen === 'fight' && ui.match) {
    for (const p of ui.match.projectiles) drawProjectile(p);
    // draw the farther-back fighter first (simple depth by x is unnecessary; draw both)
    drawFighter(ui.match.fighters[0]);
    drawFighter(ui.match.fighters[1]);
    drawSparks(ui.match.sparks);
    if (debugBoxes) drawDebug();
  } else {
    // select / match-end: pose the two chosen fighters idle behind the card
    if (ui.preview[0]) drawFighter(ui.preview[0]);
    if (ui.preview[1]) drawFighter(ui.preview[1]);
  }
  ctx.restore();

  if (ui.screen === 'fight' && ui.match) {
    drawHud();
    drawBanner();
  }
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, STAGE.H);
  g.addColorStop(0, COL.bg1);
  g.addColorStop(1, COL.bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STAGE.W, STAGE.H);

  // distant neon pillars
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 7; i += 1) {
    const x = 70 + i * 135;
    const hue = i % 2 ? 'rgba(255,107,203,0.10)' : 'rgba(92,225,255,0.10)';
    ctx.fillStyle = hue;
    ctx.fillRect(x, 60, 30, STAGE.floorY - 60);
  }
  ctx.restore();

  // horizon glow line
  ctx.save();
  ctx.strokeStyle = 'rgba(92,225,255,0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, STAGE.floorY - 120);
  ctx.lineTo(STAGE.W, STAGE.floorY - 120);
  ctx.stroke();
  ctx.restore();
}

function drawFloor() {
  ctx.save();
  ctx.shadowBlur = 22;
  ctx.shadowColor = COL.floorGlow;
  ctx.fillStyle = COL.floor;
  ctx.fillRect(0, STAGE.floorY, STAGE.W, STAGE.H - STAGE.floorY);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = COL.floorGlow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, STAGE.floorY);
  ctx.lineTo(STAGE.W, STAGE.floorY);
  ctx.stroke();
  // floor perspective lines
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = 'rgba(92,225,255,0.5)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i += 1) {
    const y = STAGE.floorY + i * 14;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(STAGE.W, y); ctx.stroke();
  }
  ctx.restore();
}

/* ---- Fighter rendering (geometric neon humanoid) ---------------------- */
function drawFighter(f) {
  const c = f.char;
  const face = f.facing;
  const feetY = f.y;
  const cx = f.x;

  // ground shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, STAGE.floorY + 6, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (f.state === 'ko') { drawKO(f); return; }

  const crouch = f.crouching;
  const sY = crouch ? 0.64 : 1;
  const bob = f.state === 'idle' ? Math.sin(renderFrame * 0.08) * 1.6 : 0;

  const hipY = feetY - 62 * sY + bob;
  const shoulderY = feetY - 120 * sY + bob;
  const headCy = feetY - 142 * sY + bob;
  const headR = 15;

  // attack extension telegraph
  let ext = 0; // -0.3 (wound back) .. 1 (fully extended)
  let atkKind = null;
  let atkKey = null;
  if (f.attack) {
    const a = f.attack;
    const { startup, active, recovery } = a.def;
    atkKind = a.isSpecial ? a.def.type : a.def.kind;
    atkKey = a.key;
    if (a.t <= startup) ext = -0.3 * (1 - a.t / Math.max(1, startup));
    else if (a.t <= startup + active) ext = 1;
    else ext = Math.max(0, 1 - (a.t - startup - active) / Math.max(1, recovery));
  }
  const activeNow = f.attack && ext === 1;

  const mainCol = c.color;
  const glow = c.glow;
  const bright = f.hitFlash > 0 ? '#ffffff' : c.accent;

  ctx.save();
  ctx.shadowBlur = 14;
  ctx.shadowColor = glow;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // ---- legs ----
  const legSwing = f.state === 'walk' ? Math.sin(renderFrame * 0.32) * 12 : 0;
  const stanceW = crouch ? 20 : 14;
  ctx.strokeStyle = c.colorDim;
  ctx.lineWidth = 11;
  // back leg
  drawLeg(cx, hipY, cx - stanceW - legSwing, feetY, crouch);
  // front leg — becomes the striking limb on a kick
  if ((atkKind === 'kick') && Math.abs(ext) > 0.02) {
    const kx = cx + face * (18 + ext * (f.attack.def.ox));
    const ky = feetY - (f.attack.def.oy) * (0.5 + 0.5 * Math.max(0, ext));
    ctx.strokeStyle = activeNow ? bright : c.color;
    ctx.lineWidth = 12;
    line(cx, hipY, cx + face * 8, hipY + 20);
    line(cx + face * 8, hipY + 20, kx, ky);
    if (activeNow) drawImpactShape(kx, ky, bright, glow);
  } else {
    ctx.strokeStyle = c.colorDim;
    ctx.lineWidth = 11;
    drawLeg(cx, hipY, cx + stanceW + legSwing, feetY, crouch);
  }

  // ---- torso ----
  ctx.strokeStyle = mainCol;
  ctx.fillStyle = withAlpha(mainCol, 0.22);
  const torsoW = (c.id === 'boulder' ? 30 : c.id === 'sable' ? 20 : 24) * (crouch ? 1.12 : 1);
  const lean = f.state === 'hitstun' ? -face * 10 : (atkKind === 'rush' && activeNow ? face * 12 : 0);
  ctx.lineWidth = 4;
  roundedTrapezoid(cx, shoulderY, cx + lean, hipY, torsoW * 0.82, torsoW);

  // ---- head ----
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = mainCol;
  ctx.fillStyle = withAlpha(mainCol, 0.28);
  ctx.beginPath();
  ctx.arc(cx + lean * 0.6, headCy, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  drawHeadMark(f, cx + lean * 0.6, headCy, headR, face, mainCol, bright);

  // ---- arms ----
  const sX = cx + lean * 0.7;
  const armStrike = atkKind === 'punch' || atkKind === 'projectile' || atkKind === 'uppercut' || atkKind === 'rush';
  if (armStrike && Math.abs(ext) > 0.02) {
    // striking arm / blade, aimed at this move's own hitbox height
    let hx;
    let hy;
    const e = Math.max(0, ext);
    if (atkKind === 'uppercut') {
      hx = cx + face * f.attack.def.ox;
      hy = feetY - f.attack.def.oy * (0.55 + 0.35 * e);
    } else if (atkKind === 'projectile') {
      hx = sX + face * (14 + e * 46);
      hy = feetY - f.attack.def.projOy;
    } else { // punch or rush blade
      hx = sX + face * (12 + e * f.attack.def.ox);
      hy = feetY - f.attack.def.oy * (0.62 + 0.38 * e);
    }
    ctx.strokeStyle = activeNow ? bright : c.accent;
    ctx.lineWidth = 8;
    line(sX, shoulderY + 6, sX + face * 12, shoulderY + 14);
    line(sX + face * 12, shoulderY + 14, hx, hy);
    if (activeNow) drawImpactShape(hx, hy, bright, glow);
    // rear arm guard
    ctx.strokeStyle = c.colorDim; ctx.lineWidth = 7;
    line(sX, shoulderY + 8, sX - face * 12, shoulderY + 26);
  } else if (f.state === 'block') {
    // both forearms up in a guard bar
    ctx.strokeStyle = bright; ctx.lineWidth = 8;
    line(sX, shoulderY + 10, sX + face * 16, shoulderY + 2);
    line(sX + face * 16, shoulderY + 2, sX + face * 22, shoulderY + 30);
    ctx.strokeStyle = c.colorDim; ctx.lineWidth = 7;
    line(sX, shoulderY + 14, sX + face * 14, shoulderY + 34);
  } else if (f.state === 'win') {
    ctx.strokeStyle = c.accent; ctx.lineWidth = 8;
    const raise = Math.sin(renderFrame * 0.18) * 6;
    line(sX, shoulderY + 6, sX + face * 10, shoulderY - 24 + raise);
    line(sX, shoulderY + 6, sX - face * 12, shoulderY - 20 - raise);
  } else {
    // relaxed guard
    ctx.strokeStyle = c.accent; ctx.lineWidth = 8;
    const g2 = f.state === 'hitstun' ? -face * 8 : 0;
    line(sX, shoulderY + 6, sX + face * 14 + g2, shoulderY + 30);
    ctx.strokeStyle = c.colorDim; ctx.lineWidth = 7;
    line(sX, shoulderY + 8, sX - face * 10, shoulderY + 30);
  }

  ctx.restore();
}

function drawLeg(hx, hy, fx, fy, crouch) {
  const kneeX = (hx + fx) / 2 + (crouch ? (fx - hx) * 0.3 : 0);
  const kneeY = (hy + fy) / 2 + (crouch ? 10 : 4);
  line(hx, hy, kneeX, kneeY);
  line(kneeX, kneeY, fx, fy);
}

function drawHeadMark(f, x, y, r, face, col, bright) {
  // small per-character silhouette cue + a "read direction" eye
  ctx.save();
  ctx.strokeStyle = col;
  ctx.fillStyle = bright;
  ctx.lineWidth = 3;
  if (f.char.id === 'volt') {
    // antenna spike
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + face * 4, y - r - 12); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + face * 4, y - r - 13, 3, 0, Math.PI * 2); ctx.fill();
  } else if (f.char.id === 'boulder') {
    // heavy brow ridge
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x - r + 3, y - 3); ctx.lineTo(x + r - 3, y - 3); ctx.stroke();
  } else {
    // ponytail streamer
    ctx.beginPath();
    ctx.moveTo(x - face * (r - 3), y - 4);
    ctx.quadraticCurveTo(x - face * (r + 14), y + 2, x - face * (r + 8), y + 16);
    ctx.stroke();
  }
  // eye toward facing
  ctx.fillStyle = bright;
  ctx.beginPath(); ctx.arc(x + face * 6, y - 1, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawImpactShape(x, y, col, glow) {
  ctx.save();
  ctx.shadowBlur = 18; ctx.shadowColor = glow;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawKO(f) {
  const c = f.char;
  const cx = f.x;
  const y = STAGE.floorY;
  ctx.save();
  ctx.translate(cx, y);
  ctx.rotate(f.facing * -1.35);
  ctx.shadowBlur = 12; ctx.shadowColor = c.glow;
  ctx.strokeStyle = c.color; ctx.lineWidth = 10; ctx.lineCap = 'round';
  line(0, -6, 0, -120);            // body flat-ish (rotated)
  ctx.strokeStyle = c.colorDim; ctx.lineWidth = 8;
  line(0, -40, 26, -30); line(0, -40, 26, -52); // limbs splayed
  ctx.fillStyle = withAlpha(c.color, 0.3); ctx.strokeStyle = c.color; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.arc(0, -134, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // X eyes
  ctx.strokeStyle = COL.bad; ctx.lineWidth = 2.5;
  line(-6, -138, -1, -133); line(-1, -138, -6, -133);
  ctx.restore();
}

function drawProjectile(p) {
  ctx.save();
  // trail
  for (let i = p.trail.length - 1; i >= 0; i -= 1) {
    const tp = p.trail[i];
    ctx.globalAlpha = (1 - i / p.trail.length) * 0.4;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(tp.x, tp.y, p.h * 0.32, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 22; ctx.shadowColor = p.glow;
  const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.w * 0.62);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.5, p.color);
  grad.addColorStop(1, withAlpha(p.color, 0));
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(p.x, p.y, p.w * 0.6, p.h * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSparks(sparks) {
  ctx.save();
  for (const s of sparks) {
    const k = s.life / s.max;
    const r = (1 - k) * (s.kind === 'hit' ? 26 : 18) + 4;
    ctx.strokeStyle = s.kind === 'hit' ? COL.warn : COL.accent;
    ctx.globalAlpha = k;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 14;
    ctx.shadowColor = s.kind === 'hit' ? 'rgba(255,209,102,0.8)' : 'rgba(92,225,255,0.8)';
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + (1 - k);
      ctx.beginPath();
      ctx.moveTo(s.x + Math.cos(a) * r * 0.4, s.y + Math.sin(a) * r * 0.4);
      ctx.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ---- HUD (drawn on canvas so it scales with the world) ---------------- */
function drawHud() {
  const m = ui.match;
  for (let i = 0; i < 2; i += 1) {
    const f = m.fighters[i];
    hudHp[i] += (f.hp - hudHp[i]) * 0.2;
    if (Math.abs(hudHp[i] - f.hp) < 0.5) hudHp[i] = f.hp;
  }
  drawHealthBar(0);
  drawHealthBar(1);

  // timer
  const secs = Math.ceil(m.roundClock);
  ctx.save();
  ctx.fillStyle = COL.fg;
  ctx.font = '800 34px "Montserrat", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 12; ctx.shadowColor = 'rgba(92,225,255,0.6)';
  ctx.fillText(String(secs).padStart(2, '0'), STAGE.W / 2, 40);
  ctx.restore();

  drawRoundPips();
}

function drawHealthBar(i) {
  const m = ui.match;
  const f = m.fighters[i];
  const ratio = Math.max(0, hudHp[i] / f.maxHp);
  const realRatio = Math.max(0, f.hp / f.maxHp);
  const barW = 372;
  const barH = 22;
  const y = 26;
  const pad = 24;
  const x = i === 0 ? pad : STAGE.W - pad - barW;
  const grow = i === 0 ? 1 : -1; // player 2's bar depletes toward center (right->left)

  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // name
  ctx.fillStyle = i === 0 ? COL.accent : COL.accent2;
  ctx.font = '700 15px "Montserrat", sans-serif';
  ctx.textAlign = i === 0 ? 'left' : 'right';
  ctx.fillText(t(lang, f.char.nameKey).toUpperCase(), i === 0 ? x + 2 : x + barW - 2, y - 6);

  // frame
  ctx.fillStyle = 'rgba(4,6,14,0.7)';
  ctx.strokeStyle = 'rgba(92,225,255,0.35)';
  ctx.lineWidth = 2;
  roundRect(x, y, barW, barH, 6); ctx.fill(); ctx.stroke();

  // white "chip" (smooth drain) trails behind the real value for a damage cue
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  fillBar(x, y, barW, barH, ratio, grow);

  // colored current HP
  ctx.fillStyle = realRatio > 0.5 ? COL.good : realRatio > 0.22 ? COL.warn : COL.bad;
  fillBar(x, y, barW, barH, realRatio, grow);

  // segment ticks
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  for (let s = 1; s < 5; s += 1) {
    const tx = x + (barW * s) / 5;
    ctx.beginPath(); ctx.moveTo(tx, y + 2); ctx.lineTo(tx, y + barH - 2); ctx.stroke();
  }
  ctx.restore();
}

function fillBar(x, y, w, h, ratio, grow) {
  const fw = w * ratio;
  ctx.save();
  roundRect(x, y, w, h, 6);
  ctx.clip();
  if (grow === 1) ctx.fillRect(x, y, fw, h);
  else ctx.fillRect(x + w - fw, y, fw, h);
  ctx.restore();
}

function drawRoundPips() {
  const m = ui.match;
  const r = 6;
  const gap = 18;
  for (let i = 0; i < 2; i += 1) {
    for (let w = 0; w < ROUNDS_TO_WIN; w += 1) {
      const won = m.wins[i] > w;
      const baseX = i === 0 ? 24 + 4 + w * gap : STAGE.W - 24 - 4 - w * gap;
      const y = 62;
      ctx.beginPath();
      ctx.arc(baseX, y, r, 0, Math.PI * 2);
      ctx.fillStyle = won ? (i === 0 ? COL.accent : COL.accent2) : 'rgba(255,255,255,0.14)';
      ctx.shadowBlur = won ? 10 : 0;
      ctx.shadowColor = i === 0 ? COL.accent : COL.accent2;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

function drawBanner() {
  if (banner.life <= 0) return;
  banner.life -= 1;
  const a = Math.min(1, banner.life / 22);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = banner.color;
  ctx.shadowBlur = 24; ctx.shadowColor = banner.color;
  ctx.font = '800 62px "Montserrat", sans-serif';
  ctx.fillText(banner.text, STAGE.W / 2, STAGE.H / 2 - 18);
  if (banner.sub) {
    ctx.font = '700 24px "Montserrat", sans-serif';
    ctx.shadowBlur = 12;
    ctx.fillStyle = COL.fg;
    ctx.fillText(banner.sub, STAGE.W / 2, STAGE.H / 2 + 34);
  }
  ctx.restore();
}

function drawDebug() {
  const m = ui.match;
  ctx.save();
  ctx.lineWidth = 2;
  for (const f of m.fighters) {
    const hb = hurtbox(f);
    ctx.strokeStyle = 'rgba(92,255,176,0.9)';
    ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
    const at = activeHitbox(f);
    if (at) {
      ctx.strokeStyle = 'rgba(255,92,122,0.95)';
      ctx.fillStyle = 'rgba(255,92,122,0.2)';
      ctx.fillRect(at.x, at.y, at.w, at.h);
      ctx.strokeRect(at.x, at.y, at.w, at.h);
    }
    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${f.state} hp${Math.round(f.hp)} cd${f.cd}`, f.x, f.y - (f.crouching ? CROUCH_H : STAND_H) - 8);
  }
  for (const p of m.projectiles) {
    ctx.strokeStyle = 'rgba(255,209,102,0.95)';
    ctx.strokeRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
  }
  ctx.restore();
}

/* ---- tiny canvas helpers ---- */
function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function roundedTrapezoid(topX, topY, botX, botY, topW, botW) {
  ctx.beginPath();
  ctx.moveTo(topX - topW / 2, topY);
  ctx.lineTo(topX + topW / 2, topY);
  ctx.lineTo(botX + botW / 2, botY);
  ctx.lineTo(botX - botW / 2, botY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
function withAlpha(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  const r = (n >> 16) & 255; const g = (n >> 8) & 255; const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

/* ======================================================================== *
 * CHARACTER SELECT
 * ======================================================================== */
function buildRoster(playerIndex) {
  const host = $(playerIndex === 0 ? 'rosterP1' : 'rosterP2');
  host.innerHTML = '';
  for (const id of CHARACTER_IDS) {
    const c = getCharacter(id);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `fa-chip${ui.sel[playerIndex] === id ? ' is-on' : ''}`;
    b.style.setProperty('--c', c.color);
    b.innerHTML = `<span class="fa-chip-dot"></span><span>${t(lang, c.nameKey)}</span>`;
    b.addEventListener('click', () => {
      ui.sel[playerIndex] = id;
      sfx.unlock(); sfx.play('tap');
      buildRoster(playerIndex);
      renderPreview(playerIndex);
      rebuildPreview();
    });
    host.appendChild(b);
  }
}

function renderPreview(playerIndex) {
  const c = getCharacter(ui.sel[playerIndex]);
  const host = $(playerIndex === 0 ? 'previewP1' : 'previewP2');
  const stat = (labelKey, val) => {
    let pips = '';
    for (let i = 0; i < 5; i += 1) pips += `<span class="fa-pip${i < val ? ' on' : ''}"></span>`;
    return `<div class="fa-stat"><span class="fa-stat-label">${t(lang, labelKey)}</span><span class="fa-stat-pips">${pips}</span></div>`;
  };
  host.style.setProperty('--c', c.color);
  host.innerHTML = `
    <div class="fa-preview-name" style="color:${c.color}">${t(lang, c.nameKey)}</div>
    <div class="fa-preview-special">★ ${t(lang, c.specialKey)}</div>
    <div class="fa-preview-tag">${t(lang, c.tagKey)}</div>
    ${stat('statPower', c.stats.power)}
    ${stat('statSpeed', c.stats.speed)}
    ${stat('statHealth', c.stats.health)}`;
}

function makePreviewFighter(id, player) {
  const c = getCharacter(id);
  return {
    player, char: c, charId: id, maxHp: c.maxHp, hp: c.maxHp,
    x: player === 0 ? 300 : 660, y: STAGE.floorY,
    facing: player === 0 ? 1 : -1,
    state: 'idle', crouching: false, blocking: false,
    attack: null, stun: 0, hitFlash: 0, anim: 0, vx: 0, vy: 0, onGround: true,
  };
}
function rebuildPreview() {
  ui.preview[0] = makePreviewFighter(ui.sel[0], 0);
  ui.preview[1] = makePreviewFighter(ui.sel[1], 1);
}

function setMode(mode) {
  ui.mode = mode;
  $('modeLocal').classList.toggle('is-on', mode === 'local');
  $('modeAi').classList.toggle('is-on', mode === 'ai');
  $('p2Label').textContent = t(lang, mode === 'ai' ? 'cpuLabel' : 'p2Label');
  updateHint();
}

function updateHint() {
  const el = $('hint');
  if (ui.screen === 'select') {
    $('controlsNote').textContent = t(lang, ui.mode === 'ai' ? 'hintAi' : 'hintLocal');
    el.textContent = '';
  } else {
    el.textContent = t(lang, ui.mode === 'ai' ? 'hintAi' : 'hintLocal');
  }
}

/* ======================================================================== *
 * INPUT — keyboard (split P1 / P2) + touch
 * ======================================================================== */
// Physical-key map (event.code) -> [player, action]. Layout-independent.
const KEYMAP = {
  // Player 1: WASD + F G V B + R
  KeyA: [0, 'left'], KeyD: [0, 'right'], KeyW: [0, 'up'], KeyS: [0, 'down'],
  KeyF: [0, 'lp'], KeyG: [0, 'hp'], KeyV: [0, 'lk'], KeyB: [0, 'hk'], KeyR: [0, 'special'],
  // Player 2: Arrows + K L , . + ;
  ArrowLeft: [1, 'left'], ArrowRight: [1, 'right'], ArrowUp: [1, 'up'], ArrowDown: [1, 'down'],
  KeyK: [1, 'lp'], KeyL: [1, 'hp'], Comma: [1, 'lk'], Period: [1, 'hk'], Semicolon: [1, 'special'],
};

function onKeyDown(e) {
  if (e.code === 'Backquote') { debugBoxes = !debugBoxes; return; }
  const map = KEYMAP[e.code];
  if (!map) return;
  e.preventDefault();
  sfx.unlock();
  // In vs-AI, ignore player-2 keys so a solo player can't drive the CPU.
  if (ui.mode === 'ai' && map[0] === 1) return;
  if (!e.repeat) rawInput[map[0]][map[1]] = true;
}
function onKeyUp(e) {
  const map = KEYMAP[e.code];
  if (!map) return;
  e.preventDefault();
  rawInput[map[0]][map[1]] = false;
}

function bindTouch() {
  const btns = document.querySelectorAll('#touch [data-act]');
  btns.forEach((btn) => {
    const act = btn.getAttribute('data-act');
    const down = (e) => { e.preventDefault(); sfx.unlock(); rawInput[0][act] = true; btn.classList.add('is-down'); };
    const up = (e) => { e.preventDefault(); rawInput[0][act] = false; btn.classList.remove('is-down'); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointerleave', up);
    btn.addEventListener('pointercancel', up);
  });
}

function updateTouchVisibility() {
  const coarse = FORCE_TOUCH || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const show = ui.screen === 'fight' && ui.mode === 'ai' && coarse;
  const el = $('touch');
  if (show) el.removeAttribute('hidden');
  else el.setAttribute('hidden', '');
}

/* ======================================================================== *
 * i18n wiring
 * ======================================================================== */
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
  buildRoster(0); buildRoster(1);
  renderPreview(0); renderPreview(1);
  setMode(ui.mode);
  updateHint();
  if (ui.screen === 'match' && ui.match) {
    const w = ui.match.matchWinner;
    const name = t(lang, getCharacter(ui.sel[w]).nameKey);
    $('matchTitle').textContent = t(lang, 'matchWinLabel', { name });
  }
  rememberLang(lang);
}

function srSay(msg) { $('srStatus').textContent = msg; }

/* ======================================================================== *
 * INIT
 * ======================================================================== */
function init() {
  buildRoster(0); buildRoster(1);
  renderPreview(0); renderPreview(1);
  rebuildPreview();
  applyLang(lang);
  setMode('local');

  $('modeLocal').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); setMode('local'); });
  $('modeAi').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); setMode('ai'); });
  $('btnFight').addEventListener('click', () => { sfx.unlock(); sfx.play('pickup'); startMatch(); });
  $('btnRematch').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); startMatch(); });
  $('btnChange').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); showSelect(); });

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  bindTouch();
  window.addEventListener('blur', clearInputs); // drop stuck keys on focus loss

  requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(loop); });

  // ---- Test / debug hook. Mirrors games/billiards' window.OGH_BILLIARDS:
  // lets a harness drive the fight deterministically (exact inputs, single
  // fixed steps, direct HP) instead of fighting real key/rAF timing, and read
  // the live hitbox/hurtbox rectangles to verify overlap-based hit detection.
  window.OGH_FIGHT_ARENA = {
    ui,
    STAGE, FIXED_DT, BODY_W, STAND_H, CROUCH_H,
    hurtbox, activeHitbox, rectsOverlap,
    lang: () => lang,
    setLang: applyLang,
    /** Start a match. mode 'local'|'ai', p1/p2 = character ids. */
    start(mode, p1, p2, diff) {
      ui.mode = mode === 'ai' ? 'ai' : 'local';
      if (p1) ui.sel[0] = p1;
      if (p2) ui.sel[1] = p2;
      if (diff) ui.aiDiff = diff;
      setMode(ui.mode);
      startMatch();
    },
    match: () => ui.match,
    fighter: (i) => ui.match && ui.match.fighters[i],
    /** Set/hold a raw input for a player. */
    hold(player, act, val = true) { rawInput[player][act] = !!val; },
    release(player, act) { rawInput[player][act] = false; },
    releaseAll: clearInputs,
    /** Advance exactly n fixed logical steps (uses current held inputs + AI). */
    tick(n = 1) { for (let i = 0; i < n; i += 1) stepOnce(); render(); },
    /** Tap an attack/jump/special: press for holdFrames, then release. */
    tap(player, act, holdFrames = 2) {
      rawInput[player][act] = true;
      for (let i = 0; i < holdFrames; i += 1) stepOnce();
      rawInput[player][act] = false;
      stepOnce();
      render();
    },
    setHp(player, hp) { if (ui.match) ui.match.fighters[player].hp = hp; },
    /** Current boxes, for asserting overlap-based hit detection in tests. */
    boxes() {
      const m = ui.match;
      if (!m) return null;
      return {
        hurt: [hurtbox(m.fighters[0]), hurtbox(m.fighters[1])],
        hit: [activeHitbox(m.fighters[0]), activeHitbox(m.fighters[1])],
        proj: m.projectiles.map((p) => ({ x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h, owner: p.owner })),
      };
    },
    setDebug(v) { debugBoxes = !!v; },
  };
}

init();
