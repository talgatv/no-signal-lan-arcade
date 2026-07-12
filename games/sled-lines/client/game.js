/**
 * Sled Lines — draw a track, watch a Verlet-jointed sled ride it.
 *
 * mode: 'title' -> 'edit' <-> 'play' -> 'crashed' -> 'edit' ...
 *   - 'edit': the canvas is a drawing surface (Pointer Events: press+drag to
 *     draw a track/scenery/boost line, or erase one). The rider sits at its
 *     spawn point in its rest pose (a live preview of where/how it starts).
 *   - 'play': physics.js's stepRider() advances the rider on a fixed 1/120s
 *     accumulator (same discipline as games/siege-break), following
 *     whatever was drawn.
 *   - 'crashed': stepRider stopped itself (see physics.js); the frozen pose
 *     is shown tinted red until the player presses Edit.
 * Pressing Play always resets the rider to spawn first; pressing Edit always
 * resets it back to spawn too — so "watch again" and "keep editing" both
 * start from the same clean state, never wherever the sled ended up.
 *
 * This file owns everything physics.js/track.js don't: canvas rendering
 * (Canvas 2D vector shapes with a neon glow — no bitmap assets), the
 * responsive full-bleed canvas (sized in JS, same approach as
 * games/leap-quest and games/hill-rider), pointer-drag draw/erase input, the
 * toolbar, sfx/i18n wiring, and a fixed-timestep physics loop.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings } from './i18n.js';
import * as Physics from './physics.js';
import * as Track from './track.js';

const $ = (id) => document.getElementById(id);
const sfx = createOghSfx();

const PHYS_DT = 1 / 120;
const ERASE_RADIUS = 16; // px — generous for touch/finger imprecision

const COLORS = {
  track: '#5ce1ff',
  scenery: 'rgba(139,147,184,0.85)',
  accel: '#ffd166',
  frame: '#ff6bcb',
  frameCrashed: '#ff5c7a',
  body: '#e8ecff',
  bodyCrashed: '#ffd0d8',
};

const TOOLS = ['track', 'scenery', 'accel', 'erase'];
const HINT_KEY = { track: 'hintTrack', scenery: 'hintScenery', accel: 'hintAccel', erase: 'hintErase' };

/* ------------------------------------------------------------------------ *
 * DOM refs
 * ------------------------------------------------------------------------ */
const canvas = $('game');
const ctx = canvas.getContext('2d');
const overlay = $('overlay');
const hint = $('hint');
const btnPlay = $('btnPlay');
const playIcon = $('playIcon');
const playLabel = $('playLabel');
const btnUndo = $('btnUndo');
const btnClear = $('btnClear');
const toolButtons = Object.fromEntries(TOOLS.map((name) => [name, $(`btnTool${name[0].toUpperCase()}${name.slice(1)}`)]));

/* ------------------------------------------------------------------------ *
 * Canvas sizing — full-bleed, responsive (more canvas = more track to
 * draw), sized in JS via getBoundingClientRect + devicePixelRatio, the same
 * approach as games/leap-quest / games/hill-rider. World/drawing coordinates
 * are plain CSS px (1:1 with the canvas's on-screen rect) so pointer
 * coordinates never need a scale-factor conversion.
 * ------------------------------------------------------------------------ */
let W = 900, H = 560;
const spawn = { x: 0, y: 0 };

function resize() {
  const rect = canvas.getBoundingClientRect();
  W = Math.max(280, Math.round(rect.width));
  H = Math.max(200, Math.round(rect.height));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.direction = 'ltr'; // never inherit page RTL for canvas text/paths
  spawn.x = Math.round(W * 0.15);
  spawn.y = Math.round(H * 0.18);
  // Reposition the resting rider preview to follow the new spawn point on
  // any resize — except mid-'play' (don't yank a running sim) or 'crashed'
  // (keep the frozen wreck where it crashed). 'title' matters too: the very
  // first resize() runs from init() before the player has pressed Start, so
  // this must not be gated to 'edit' only or the rider would never move off
  // the raw (0,0) it was constructed with.
  if (state.mode === 'title' || state.mode === 'edit') Physics.resetRider(rider, spawn.x, spawn.y);
}

/* ------------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------------ */
let lang = detectLang();
let currentTool = 'track';
const track = Track.createTrack();
const rider = Physics.createRider(0, 0); // real spawn set by the first resize()
const state = { mode: 'title' };

let activePointerId = null;
let drawingLine = null;
let erasing = false;
let accumulator = 0;

const now = () => performance.now();
const sfxGate = { land: 0 };
function gated(name, gapMs) {
  const t0 = now();
  if (t0 - sfxGate[name] < gapMs) return false;
  sfxGate[name] = t0; return true;
}

/* ------------------------------------------------------------------------ *
 * Toolbar / hint / play-button UI state
 * ------------------------------------------------------------------------ */
function setTool(name) {
  currentTool = name;
  for (const key of TOOLS) {
    const on = key === name;
    toolButtons[key].classList.toggle('is-on', on);
    toolButtons[key].setAttribute('aria-pressed', String(on));
  }
  canvas.classList.toggle('tool-erase', name === 'erase');
  updateHint();
}

function updateToolbarEnabled() {
  const editing = state.mode === 'edit';
  for (const key of TOOLS) toolButtons[key].disabled = !editing;
  const hasLines = track.lines.length > 0;
  btnUndo.disabled = !editing || !hasLines;
  btnClear.disabled = !editing || !hasLines;
}

function updatePlayButton() {
  const playing = state.mode !== 'edit';
  playIcon.textContent = playing ? '■' : '▶';
  playLabel.textContent = t(lang, playing ? 'editBtn' : 'playBtn');
  btnPlay.setAttribute('aria-label', t(lang, playing ? 'editAria' : 'playAria'));
  btnPlay.classList.toggle('is-playing', playing);
}

function updateHint() {
  if (state.mode === 'play') hint.textContent = t(lang, 'hintPlaying');
  else if (state.mode === 'crashed') hint.textContent = t(lang, 'hintCrashed');
  else hint.textContent = t(lang, HINT_KEY[currentTool]);
  canvas.classList.toggle('mode-play', state.mode === 'play');
  canvas.classList.toggle('mode-crashed', state.mode === 'crashed');
}

/* ------------------------------------------------------------------------ *
 * Mode transitions
 * ------------------------------------------------------------------------ */
function onStart() {
  sfx.unlock();
  overlay.hidden = true;
  state.mode = 'edit';
  updateToolbarEnabled();
  updatePlayButton();
  updateHint();
}

function togglePlay() {
  sfx.unlock();
  if (state.mode === 'title') { onStart(); return; }
  if (state.mode === 'edit') {
    Physics.resetRider(rider, spawn.x, spawn.y);
    state.mode = 'play';
    accumulator = 0;
    sfx.play('whoosh');
  } else {
    // From 'play' or 'crashed': stop and reset back to the start position so
    // editing always resumes from a clean, known state.
    state.mode = 'edit';
    Physics.resetRider(rider, spawn.x, spawn.y);
  }
  updatePlayButton();
  updateToolbarEnabled();
  updateHint();
}

function handlePhysicsEvents(evs) {
  for (const e of evs) {
    if (e.type === 'land') {
      if (gated('land', 220)) sfx.play('land');
    } else if (e.type === 'crash') {
      state.mode = 'crashed';
      sfx.play('die');
      updatePlayButton();
      updateToolbarEnabled();
      updateHint();
    }
  }
}

/* ------------------------------------------------------------------------ *
 * Input — Pointer Events unify touch/mouse. Drawing/erasing only happens in
 * 'edit' mode; a single active pointer at a time (a second simultaneous
 * touch is ignored rather than starting a second stroke).
 * ------------------------------------------------------------------------ */
function eventToPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function onPointerDown(e) {
  sfx.unlock();
  if (state.mode !== 'edit' || activePointerId !== null) return;
  e.preventDefault();
  activePointerId = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  const pt = eventToPoint(e);
  if (currentTool === 'erase') {
    erasing = true;
    const removed = Track.eraseNear(track, pt.x, pt.y, ERASE_RADIUS);
    if (removed.length) { sfx.play('screech'); updateToolbarEnabled(); }
    return;
  }
  drawingLine = Track.startLine(currentTool, pt.x, pt.y);
  sfx.play('tap');
}

function onPointerMove(e) {
  if (e.pointerId !== activePointerId) return;
  e.preventDefault();
  const pt = eventToPoint(e);
  if (drawingLine) { Track.extendLine(drawingLine, pt.x, pt.y); return; }
  if (erasing) {
    const removed = Track.eraseNear(track, pt.x, pt.y, ERASE_RADIUS);
    if (removed.length) { sfx.play('screech'); updateToolbarEnabled(); }
  }
}

function onPointerUp(e) {
  if (e.pointerId !== activePointerId) return;
  if (drawingLine) {
    const pt = eventToPoint(e);
    Track.extendLine(drawingLine, pt.x, pt.y);
    Track.finishLine(track, drawingLine);
    drawingLine = null;
    updateToolbarEnabled();
  }
  erasing = false;
  activePointerId = null;
}

function onKey(e) {
  if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); togglePlay(); return; }
  if (state.mode !== 'edit') return;
  const toolMap = { Digit1: 'track', Digit2: 'scenery', Digit3: 'accel', Digit4: 'erase', KeyT: 'track', KeyS: 'scenery', KeyB: 'accel', KeyE: 'erase' };
  if (toolMap[e.code]) { sfx.play('tap'); setTool(toolMap[e.code]); return; }
  if (e.code === 'KeyU') { btnUndo.click(); return; }
  if (e.code === 'KeyC') { btnClear.click(); }
}

/* ------------------------------------------------------------------------ *
 * Rendering — Canvas 2D vector shapes with a neon glow, no bitmap assets.
 * Scenery draws first (dashed, dim, behind everything), then track, then
 * boost, then whatever the player is actively drawing (so it's always
 * visible on top), then the rider last.
 * ------------------------------------------------------------------------ */
function strokePolyline(pts, color, { dashed = false, width = 3, glow = 10 } = {}) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.setLineDash(dashed ? [9, 7] : []);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.restore();
}

function drawAccelLine(line) {
  strokePolyline(line.pts, COLORS.accel, { width: 3.4, glow: 15 });
  const pts = line.pts;
  ctx.save();
  ctx.strokeStyle = COLORS.accel;
  ctx.lineWidth = 2;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 14) continue;
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    ctx.beginPath();
    ctx.moveTo(mx - ux * 5 + nx * 5, my - uy * 5 + ny * 5);
    ctx.lineTo(mx + ux * 5, my + uy * 5);
    ctx.lineTo(mx - ux * 5 - nx * 5, my - uy * 5 - ny * 5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTrackData() {
  for (const line of track.lines) if (line.type === 'scenery') strokePolyline(line.pts, COLORS.scenery, { dashed: true, width: 2.4, glow: 5 });
  for (const line of track.lines) if (line.type === 'track') strokePolyline(line.pts, COLORS.track, { width: 3.4, glow: 12 });
  for (const line of track.lines) if (line.type === 'accel') drawAccelLine(line);
  if (drawingLine && drawingLine.pts.length >= 2) {
    if (drawingLine.type === 'scenery') strokePolyline(drawingLine.pts, COLORS.scenery, { dashed: true, width: 2.4, glow: 5 });
    else if (drawingLine.type === 'accel') drawAccelLine(drawingLine);
    else strokePolyline(drawingLine.pts, COLORS.track, { width: 3.4, glow: 12 });
  }
}

function strokeSeg(a, b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

function drawRider() {
  const p = rider.points;
  const crashed = state.mode === 'crashed';
  const frameColor = crashed ? COLORS.frameCrashed : COLORS.frame;
  const bodyColor = crashed ? COLORS.bodyCrashed : COLORS.body;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Sled frame — the nose-tail-hip rigid triangle IS the sled + seat.
  ctx.strokeStyle = frameColor;
  ctx.shadowColor = frameColor;
  ctx.shadowBlur = 9;
  ctx.lineWidth = 3.4;
  strokeSeg(p.tail, p.nose);
  ctx.lineWidth = 2.2;
  strokeSeg(p.nose, p.hip);
  strokeSeg(p.tail, p.hip);

  // Rider figure.
  ctx.strokeStyle = bodyColor;
  ctx.shadowColor = bodyColor;
  ctx.shadowBlur = 7;
  ctx.lineWidth = 2.8;
  strokeSeg(p.hip, p.shoulder); // torso
  ctx.lineWidth = 2.2;
  strokeSeg(p.shoulder, p.head); // neck
  strokeSeg(p.shoulder, p.handF); // front arm — unconstrained past the shoulder, flails
  strokeSeg(p.shoulder, p.handB); // back arm — same

  ctx.shadowBlur = 4;
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(p.head.x, p.head.y, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H); // canvas background (CSS radial-gradient) shows through
  drawTrackData();
  drawRider();
}

/* ------------------------------------------------------------------------ *
 * Main loop — physics only advances in 'play' mode, on a fixed 1/120s
 * accumulator (frame-rate independent), same discipline as
 * games/siege-break. physics.js internally substeps that further for
 * collision robustness — see physics.js's CONFIG.SUBSTEPS.
 * ------------------------------------------------------------------------ */
function update(dt) {
  if (state.mode !== 'play') return;
  accumulator = Math.min(accumulator + dt, 0.25);
  while (accumulator >= PHYS_DT) {
    const evs = Physics.stepRider(rider, track.lines, PHYS_DT);
    handlePhysicsEvents(evs);
    accumulator -= PHYS_DT;
    if (state.mode !== 'play') { accumulator = 0; break; }
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
  updatePlayButton();
  updateHint();
  rememberLang(lang);
}

/* ------------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------------ */
function init() {
  applyLang(lang);
  setTool('track');
  resize();
  updateToolbarEnabled();
  updatePlayButton();
  updateHint();

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  for (const name of TOOLS) toolButtons[name].addEventListener('click', () => { sfx.play('tap'); setTool(name); });
  btnUndo.addEventListener('click', () => {
    if (state.mode !== 'edit') return;
    if (Track.undoLast(track)) sfx.play('tap');
    updateToolbarEnabled();
  });
  btnClear.addEventListener('click', () => {
    if (state.mode !== 'edit') return;
    if (Track.clearAll(track).length) sfx.play('screech');
    updateToolbarEnabled();
  });
  btnPlay.addEventListener('click', togglePlay);
  $('btnStart').addEventListener('click', onStart);
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  requestAnimationFrame((t0) => { lastNow = t0; requestAnimationFrame(loop); });

  // Debug/test hook — mirrors games/siege-break's window.OGH_SIEGE_BREAK:
  // lets a headless harness inspect live rider/track state and drive the
  // sim deterministically instead of fighting real pointer/rAF timing.
  window.OGH_SLED_LINES = {
    state,
    track,
    spawn,
    Physics,
    Track,
    rider: () => rider,
    lang: () => lang,
    tool: () => currentTool,
    setTool,
    play() { if (state.mode === 'edit') togglePlay(); },
    edit() { if (state.mode !== 'edit') togglePlay(); },
    /** Advance N fixed physics ticks directly (bypasses the rAF accumulator),
     * routing events through the same handlePhysicsEvents() the real loop
     * uses so a crash mid-step() updates state.mode/sfx/hint exactly like it
     * would during normal play, not just the rider's own .crashed flag. */
    step(n = 1) {
      const all = [];
      for (let i = 0; i < n && state.mode === 'play'; i++) {
        const evs = Physics.stepRider(rider, track.lines, PHYS_DT);
        handlePhysicsEvents(evs);
        all.push(...evs);
      }
      return all;
    },
    /** Advance one rAF-style frame (physics + draw) for a given elapsed ms. */
    tick(dtMs) { update(dtMs / 1000); draw(); },
    /** Programmatically add a finished line without simulating pointer events. */
    addLine(type, pts) {
      if (!pts || pts.length < 2) return false;
      const line = Track.startLine(type, pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) Track.extendLine(line, pts[i].x, pts[i].y);
      return Track.finishLine(track, line);
    },
    PHYS_DT,
  };
}

init();
