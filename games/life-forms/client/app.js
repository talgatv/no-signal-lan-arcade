/**
 * app.js — Life Forms (Conway's Game of Life), OGH.
 *
 * Simulation state lives in `grid` (see simulation.js) and is entirely
 * separate from *visual* state: `vis` is a per-cell Float32Array eased
 * toward 1 (alive) or 0 (dead) every render frame, independent of the
 * discrete generation-step cadence. That one mechanism gives three of the
 * "beautiful effects" asks for free: a fade-in glow on birth, a fade-out +
 * shrink on death, and smooth generation-to-generation interpolation — a
 * cell never just snaps, it always eases. `lastAge` freezes each cell's
 * most recent alive age so a dying cell keeps fading out in *its own*
 * color instead of flashing to the "newborn" color the instant it dies
 * (its `age` in the simulation grid resets to 0 immediately on death).
 *
 * Rendering is a cheap-bloom pipeline: live cells are drawn once (solid,
 * no per-shape shadow) into an offscreen `buffer` canvas, which is then
 * composited onto the visible canvas three times — two blurred/additive
 * passes for a soft glow halo, one crisp pass on top. A single
 * `ctx.filter = 'blur()'` raster over the whole buffer is dramatically
 * cheaper than per-cell `shadowBlur` at the hundreds-to-low-thousands of
 * live cells a dense random soup or a running Gosper gun can produce.
 *
 * The render/ease RAF loop always runs, every frame, regardless of
 * play/pause — only the generation-*advance* cadence (doStep, via a fixed-
 * timestep accumulator keyed off the speed slider) is gated by `running`.
 * This is what makes a single Step while paused fade in/out exactly like a
 * continuous Play does, instead of snapping.
 *
 * Grid dimensions are computed once at load from the initial viewport and
 * never change afterward — window resize/orientation change only rescales
 * cell pixel size and recenters, so in-progress patterns are never lost or
 * remapped mid-session (see resize()).
 *
 * window.OGH_LIFE_FORMS at the bottom is the same debug/test-hook
 * convention as window.OGH_HANOI_TOWERS / window.OGH_SLIDING_PUZZLE: it
 * lets the automation harness place exact patterns via direct state
 * manipulation (setAliveCells) and drive stepping deterministically, which
 * is how blinker/glider/still-life correctness gets verified against known
 * ground truth rather than "something happens."
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings } from './i18n.js';
import {
  createGrid, step, setCellAlive, getCell, clearGrid, randomizeGrid, recountLive, boundingBox,
} from './simulation.js';
import { PATTERNS, getPattern, stampPattern, stampPatternCentered } from './patterns.js';

const sfx = createOghSfx();

/* ------------------------------------------------------------------------ *
 * Tunables
 * ------------------------------------------------------------------------ */
const MIN_COLS = 24, MAX_COLS = 90;
const MIN_ROWS = 16, MAX_ROWS = 60;
const TARGET_CELL_CSS_PX = 16; // desired cell size at initial load, before clamping
const RANDOM_DENSITY = 0.28;
const MIN_SPEED = 1, MAX_SPEED = 20, DEFAULT_SPEED = 8;
const VIS_TAU_MS = 60; // exponential ease time constant for fade in/out (~180ms to fully settle)
const MIN_TICK_INTERVAL_MS = 90; // caps the audible tick rate even at high sim speeds

// Age -> color gradient stops (newborn warm -> long-lived cool), built from
// this hub's neon palette (--ogh-warn, --ogh-accent-2, --ogh-accent) plus a
// deep violet for the oldest survivors — a heatmap of each cell's history.
const AGE_STOPS = [
  { age: 0, rgb: [255, 247, 214] },  // spark-of-life near-white gold
  { age: 3, rgb: [255, 178, 89] },   // warm amber
  { age: 7, rgb: [255, 107, 203] },  // --ogh-accent-2 pink
  { age: 14, rgb: [92, 225, 255] },  // --ogh-accent cyan
  { age: 26, rgb: [90, 110, 255] },  // deepening blue
  { age: 42, rgb: [130, 64, 220] },  // rich violet, "ancient"
];

/* ------------------------------------------------------------------------ *
 * DOM refs
 * ------------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const stage = document.querySelector('.lf-stage');
const canvas = $('view');
const ctx = canvas.getContext('2d');
ctx.direction = 'ltr';

const langSwitchEl = $('langSwitch');
const genValEl = $('genVal');
const aliveValEl = $('aliveVal');
const btnSound = $('btnSound');
const soundIconEl = $('soundIcon');
const hintEl = $('hint');

const speedSlider = $('speedSlider');
const speedValEl = $('speedVal');

const btnPatterns = $('btnPatterns');
const btnRandomize = $('btnRandomize');
const btnClear = $('btnClear');
const btnStep = $('btnStep');
const btnPlayPause = $('btnPlayPause');
const playIconEl = $('playIcon');
const playLabelEl = $('playLabel');

const patternPanelEl = $('patternPanel');
const patternGroupsEl = $('patternGroups');
const btnClosePatterns = $('btnClosePatterns');

/* ------------------------------------------------------------------------ *
 * Grid + visual-state setup — dimensions fixed for the session (see file
 * header); only cell pixel size / canvas resolution change on resize.
 * ------------------------------------------------------------------------ */
function computeInitialGridSize() {
  const w = window.innerWidth || 800;
  const h = Math.max(200, (window.innerHeight || 600) - 170); // rough header+footer allowance
  let cols = Math.round(w / TARGET_CELL_CSS_PX);
  let rows = Math.round(h / TARGET_CELL_CSS_PX);
  cols = Math.max(MIN_COLS, Math.min(MAX_COLS, cols));
  rows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, rows));
  return { cols, rows };
}

const { cols: GRID_COLS, rows: GRID_ROWS } = computeInitialGridSize();
const grid = createGrid(GRID_COLS, GRID_ROWS);
const vis = new Float32Array(GRID_COLS * GRID_ROWS); // eased visual alive-ness 0..1, defaults to 0 so the initial soup fades in
const lastAge = new Uint16Array(GRID_COLS * GRID_ROWS); // frozen "last known age" for fade-out coloring

/* ------------------------------------------------------------------------ *
 * Canvas + offscreen buffers
 * ------------------------------------------------------------------------ */
let W = 800, H = 600;
let cellPx = 16;
let offsetX = 0, offsetY = 0;

const buffer = document.createElement('canvas');
const bufferCtx = buffer.getContext('2d');
const bg = document.createElement('canvas');
const bgCtx = bg.getContext('2d');

function rebuildBackgroundLayer() {
  bgCtx.clearRect(0, 0, W, H);
  // Subtle vignette so the grid feels atmospheric rather than a flat sheet.
  const grad = bgCtx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.2,
    W / 2, H / 2, Math.max(W, H) * 0.78,
  );
  grad.addColorStop(0, 'rgba(18, 22, 46, 0)');
  grad.addColorStop(1, 'rgba(2, 3, 8, 0.55)');
  bgCtx.fillStyle = grad;
  bgCtx.fillRect(0, 0, W, H);

  // Faint dot per cell — a usability reference for precise tapping on an
  // otherwise-empty (all-black) grid, deliberately subtle so it never reads
  // as "a sterile checkerboard".
  bgCtx.fillStyle = 'rgba(255, 255, 255, 0.055)';
  const r = Math.max(0.6, cellPx * 0.05);
  for (let row = 0; row < grid.rows; row++) {
    const cy = offsetY + row * cellPx + cellPx / 2;
    for (let col = 0; col < grid.cols; col++) {
      const cx = offsetX + col * cellPx + cellPx / 2;
      bgCtx.beginPath();
      bgCtx.arc(cx, cy, r, 0, Math.PI * 2);
      bgCtx.fill();
    }
  }
}

function resize() {
  const r = stage.getBoundingClientRect();
  W = Math.max(200, Math.round(r.width));
  H = Math.max(150, Math.round(r.height));
  canvas.width = W;
  canvas.height = H;
  buffer.width = W;
  buffer.height = H;
  bg.width = W;
  bg.height = H;

  cellPx = Math.max(2, Math.floor(Math.min(W / grid.cols, H / grid.rows)));
  const gridPxW = cellPx * grid.cols;
  const gridPxH = cellPx * grid.rows;
  offsetX = Math.floor((W - gridPxW) / 2);
  offsetY = Math.floor((H - gridPxH) / 2);

  rebuildBackgroundLayer();
}

if (typeof ResizeObserver === 'function') {
  new ResizeObserver(resize).observe(stage);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

/* ------------------------------------------------------------------------ *
 * Age -> color
 * ------------------------------------------------------------------------ */
const _colorScratch = [255, 255, 255];
function colorForAge(age, out) {
  if (age <= AGE_STOPS[0].age) {
    out[0] = AGE_STOPS[0].rgb[0]; out[1] = AGE_STOPS[0].rgb[1]; out[2] = AGE_STOPS[0].rgb[2];
    return out;
  }
  for (let i = 1; i < AGE_STOPS.length; i++) {
    const b = AGE_STOPS[i];
    if (age <= b.age) {
      const a = AGE_STOPS[i - 1];
      const t2 = (age - a.age) / (b.age - a.age);
      out[0] = a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t2;
      out[1] = a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t2;
      out[2] = a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t2;
      return out;
    }
  }
  const last = AGE_STOPS[AGE_STOPS.length - 1].rgb;
  out[0] = last[0]; out[1] = last[1]; out[2] = last[2];
  return out;
}

/* ------------------------------------------------------------------------ *
 * Render pipeline
 * ------------------------------------------------------------------------ */
function syncLastAge() {
  for (let i = 0; i < grid.age.length; i++) {
    if (grid.age[i] > 0) lastAge[i] = grid.age[i];
  }
}

function updateVis(dtMs) {
  const k = 1 - Math.exp(-dtMs / VIS_TAU_MS);
  for (let i = 0; i < vis.length; i++) {
    const target = grid.alive[i] ? 1 : 0;
    const d = target - vis[i];
    if (d === 0) continue;
    vis[i] += d * k;
    if (Math.abs(target - vis[i]) < 0.004) vis[i] = target;
  }
}

function drawCellsToBuffer() {
  bufferCtx.clearRect(0, 0, W, H);
  const pad = Math.max(0.5, cellPx * 0.12);
  const fullSize = Math.max(1, cellPx - pad);
  const canRound = typeof bufferCtx.roundRect === 'function';
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const idx = r * grid.cols + c;
      const v = vis[idx];
      if (v <= 0.004) continue;
      const age = grid.alive[idx] ? grid.age[idx] : lastAge[idx];
      colorForAge(Math.max(1, age), _colorScratch);
      const size = fullSize * (0.35 + 0.65 * v);
      const off = (cellPx - size) / 2;
      const x = offsetX + c * cellPx + off;
      const y = offsetY + r * cellPx + off;
      bufferCtx.globalAlpha = v;
      bufferCtx.fillStyle = `rgb(${_colorScratch[0] | 0}, ${_colorScratch[1] | 0}, ${_colorScratch[2] | 0})`;
      if (canRound) {
        bufferCtx.beginPath();
        bufferCtx.roundRect(x, y, size, size, Math.min(4, size * 0.3));
        bufferCtx.fill();
      } else {
        bufferCtx.fillRect(x, y, size, size);
      }
    }
  }
  bufferCtx.globalAlpha = 1;
}

function compositeToScreen() {
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(bg, 0, 0);

  ctx.save();
  ctx.filter = 'blur(3px)';
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.9;
  ctx.drawImage(buffer, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.filter = 'blur(14px)';
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.45;
  ctx.drawImage(buffer, 0, 0);
  ctx.restore();

  ctx.drawImage(buffer, 0, 0);
}

function renderFrame(dtMs) {
  syncLastAge();
  updateVis(dtMs);
  drawCellsToBuffer();
  compositeToScreen();
}

/* ------------------------------------------------------------------------ *
 * Generation stepping — fixed-timestep accumulator keyed off the speed
 * slider, fully decoupled from the render loop above (which always runs).
 * ------------------------------------------------------------------------ */
let running = false;
let speed = DEFAULT_SPEED;
let stepAccumulator = 0;
let lastTickSoundAt = 0;

function maybePlayTick() {
  if (!soundOn) return;
  const now = performance.now();
  if (now - lastTickSoundAt >= MIN_TICK_INTERVAL_MS) {
    sfx.play('tick');
    lastTickSoundAt = now;
  }
}

function doStep() {
  step(grid);
  updateHud();
  maybePlayTick();
}

function renderPlayPauseButton() {
  playIconEl.textContent = running ? '⏸' : '▶';
  playLabelEl.textContent = t(currentLang, running ? 'pauseBtn' : 'playBtn');
  btnPlayPause.classList.toggle('is-running', running);
}

function play() {
  if (running) return;
  running = true;
  renderPlayPauseButton();
}
function pause() {
  if (!running) return;
  running = false;
  renderPlayPauseButton();
}
function togglePlay() { if (running) pause(); else play(); }

let lastTime = 0;
function mainLoop(now) {
  const rawDt = lastTime ? now - lastTime : 16.7;
  const dt = Math.min(rawDt, 250); // clamp so a backgrounded tab can't create a huge catch-up backlog
  lastTime = now;

  if (running) {
    stepAccumulator += dt;
    const interval = 1000 / speed;
    let stepsThisFrame = 0;
    while (stepAccumulator >= interval && stepsThisFrame < 4) {
      doStep();
      stepAccumulator -= interval;
      stepsThisFrame++;
    }
    if (stepsThisFrame >= 4) stepAccumulator = 0; // drop backlog rather than burst-catch-up over following frames
  }

  renderFrame(dt);
  requestAnimationFrame(mainLoop);
}

/* ------------------------------------------------------------------------ *
 * HUD
 * ------------------------------------------------------------------------ */
function updateHud() {
  genValEl.textContent = String(grid.generation);
  aliveValEl.textContent = String(grid.liveCount);
}

/* ------------------------------------------------------------------------ *
 * Pointer input — tap to toggle a cell, drag to paint/erase a run. The
 * first cell touched decides paint-vs-erase for the whole stroke (so
 * dragging back over already-painted cells doesn't flicker them). A
 * pointerdown while running auto-pauses first, so "tap the grid" always
 * behaves like the spec's "toggle while paused", never a dead end.
 * setPointerCapture keeps a fast drag that leaves the canvas bounds (finger
 * slides past the edge, or over a toolbar button) delivering move/up events
 * to the canvas instead of dropping the rest of the gesture.
 * ------------------------------------------------------------------------ */
let paintMode = null;
let lastPaintCell = null;

function canvasPointToCell(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width ? W / rect.width : 1;
  const scaleY = rect.height ? H / rect.height : 1;
  const x = (clientX - rect.left) * scaleX - offsetX;
  const y = (clientY - rect.top) * scaleY - offsetY;
  return { c: Math.floor(x / cellPx), r: Math.floor(y / cellPx) };
}

function paintCellAt(c, r) {
  if (c < 0 || c >= grid.cols || r < 0 || r >= grid.rows) return;
  if (setCellAlive(grid, c, r, paintMode)) updateHud();
}

function paintLine(c0, r0, c1, r1) {
  const dc = c1 - c0, dr = r1 - r0;
  const steps = Math.max(Math.abs(dc), Math.abs(dr));
  if (steps === 0) { paintCellAt(c1, r1); return; }
  for (let i = 1; i <= steps; i++) {
    paintCellAt(Math.round(c0 + (dc * i) / steps), Math.round(r0 + (dr * i) / steps));
  }
}

canvas.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  if (running) pause();
  const { c, r } = canvasPointToCell(e.clientX, e.clientY);
  if (c < 0 || c >= grid.cols || r < 0 || r >= grid.rows) return;
  try { canvas.setPointerCapture(e.pointerId); } catch { /* not critical */ }
  paintMode = !getCell(grid, c, r);
  paintCellAt(c, r);
  sfx.play('tap');
  lastPaintCell = { c, r };
  e.preventDefault();
});

canvas.addEventListener('pointermove', (e) => {
  if (paintMode === null || !lastPaintCell) return;
  const { c, r } = canvasPointToCell(e.clientX, e.clientY);
  if (c === lastPaintCell.c && r === lastPaintCell.r) return;
  paintLine(lastPaintCell.c, lastPaintCell.r, c, r);
  lastPaintCell = { c, r };
});

function endStroke() {
  paintMode = null;
  lastPaintCell = null;
}
canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);
canvas.addEventListener('lostpointercapture', endStroke);

/* ------------------------------------------------------------------------ *
 * Pattern library panel
 * ------------------------------------------------------------------------ */
const GROUP_ORDER = ['still-life', 'oscillator', 'spaceship', 'gun'];
const GROUP_LABEL_KEY = {
  'still-life': 'groupStillLife',
  oscillator: 'groupOscillator',
  spaceship: 'groupSpaceship',
  gun: 'groupGun',
};

function buildPatternPanel() {
  patternGroupsEl.innerHTML = '';
  for (const cat of GROUP_ORDER) {
    const items = PATTERNS.filter((p) => p.category === cat);
    if (!items.length) continue;
    const wrap = document.createElement('div');
    wrap.className = 'lf-pattern-group';

    const h = document.createElement('p');
    h.className = 'lf-pattern-group-title';
    h.setAttribute('data-i18n', GROUP_LABEL_KEY[cat]);
    h.textContent = t(currentLang, GROUP_LABEL_KEY[cat]);
    wrap.appendChild(h);

    const row = document.createElement('div');
    row.className = 'lf-pattern-btn-row';
    for (const p of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lf-pattern-btn';
      btn.setAttribute('data-i18n', p.nameKey);
      btn.textContent = t(currentLang, p.nameKey);
      btn.addEventListener('click', () => placePattern(p.id));
      row.appendChild(btn);
    }
    wrap.appendChild(row);
    patternGroupsEl.appendChild(wrap);
  }
}

function showPatternPanel() { patternPanelEl.hidden = false; }
function hidePatternPanel() { patternPanelEl.hidden = true; }

function placePattern(id) {
  const pattern = getPattern(id);
  if (!pattern) return;
  pause();
  stampPatternCentered(grid, pattern);
  updateHud();
  sfx.play('place');
  hidePatternPanel();
}

btnPatterns.addEventListener('click', () => { sfx.unlock(); showPatternPanel(); });
btnClosePatterns.addEventListener('click', () => hidePatternPanel());
patternPanelEl.addEventListener('click', (e) => { if (e.target === patternPanelEl) hidePatternPanel(); });

/* ------------------------------------------------------------------------ *
 * Sound toggle — persisted locally, same try/catch localStorage convention
 * as i18n.js's rememberLang. Kept as a single mute-everything toggle: it
 * covers both "the per-generation tick got annoying" and general
 * preference, without a separate control per sound type for a toy this
 * small.
 * ------------------------------------------------------------------------ */
let soundOn = true;
try { soundOn = localStorage.getItem('ogh_life_forms_sound') !== 'off'; } catch { /* ignore */ }

function renderSoundButton() {
  btnSound.setAttribute('aria-pressed', String(soundOn));
  soundIconEl.textContent = soundOn ? '\u{1F50A}' : '\u{1F507}';
}
function setSoundOn(on) {
  soundOn = on;
  try { localStorage.setItem('ogh_life_forms_sound', on ? 'on' : 'off'); } catch { /* ignore */ }
  renderSoundButton();
}
btnSound.addEventListener('click', () => {
  sfx.unlock();
  setSoundOn(!soundOn);
  if (soundOn) sfx.play('tap');
});

/* ------------------------------------------------------------------------ *
 * Speed slider — persisted locally too.
 * ------------------------------------------------------------------------ */
try {
  const storedSpeed = Number(localStorage.getItem('ogh_life_forms_speed'));
  if (storedSpeed >= MIN_SPEED && storedSpeed <= MAX_SPEED) speed = storedSpeed;
} catch { /* ignore */ }
speedSlider.value = String(speed);
speedValEl.textContent = `${speed}/s`;

speedSlider.addEventListener('input', () => {
  speed = Number(speedSlider.value);
  speedValEl.textContent = `${speed}/s`;
  try { localStorage.setItem('ogh_life_forms_speed', String(speed)); } catch { /* ignore */ }
});

/* ------------------------------------------------------------------------ *
 * Transport buttons
 * ------------------------------------------------------------------------ */
btnClear.addEventListener('click', () => {
  sfx.unlock();
  pause();
  clearGrid(grid);
  updateHud();
});

btnRandomize.addEventListener('click', () => {
  sfx.unlock();
  pause();
  randomizeGrid(grid, RANDOM_DENSITY);
  updateHud();
  sfx.play('place');
});

btnStep.addEventListener('click', () => {
  sfx.unlock();
  pause();
  doStep();
});

btnPlayPause.addEventListener('click', () => {
  sfx.unlock();
  togglePlay();
});

/* ------------------------------------------------------------------------ *
 * i18n wiring
 * ------------------------------------------------------------------------ */
let currentLang = detectLang();

function buildLangSwitch() {
  langSwitchEl.innerHTML = '';
  for (const l of LANGS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `lang-btn${l === currentLang ? ' is-on' : ''}`;
    btn.textContent = LANG_LABELS[l];
    btn.setAttribute('aria-pressed', l === currentLang ? 'true' : 'false');
    btn.addEventListener('click', () => setLang(l));
    langSwitchEl.appendChild(btn);
  }
}

function setLang(lang) {
  currentLang = lang;
  rememberLang(lang);
  applyStaticStrings(lang);
  document.title = `${t(lang, 'title')} — OGH`;
  buildLangSwitch();
  renderPlayPauseButton(); // label depends on running-state too, not covered by the generic data-i18n swap
  // Header row can wrap differently at a different text length per language,
  // which changes how much vertical space the stage has left — re-measure.
  resize();
}

/* ------------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------------ */
randomizeGrid(grid, RANDOM_DENSITY); // a colorful soup on first load beats a blank black rectangle; vis[] starts at 0 so it fades in
buildLangSwitch();
applyStaticStrings(currentLang);
document.title = `${t(currentLang, 'title')} — OGH`;
renderSoundButton();
renderPlayPauseButton();
buildPatternPanel();
updateHud();
resize();
requestAnimationFrame(mainLoop);

/* ------------------------------------------------------------------------ *
 * Debug/test hook — same convention as games/hanoi-towers'
 * window.OGH_HANOI_TOWERS and games/sliding-puzzle's window.OGH_SLIDING_PUZZLE:
 * lets the automation harness (and devtools) drive the game deterministically
 * via direct state manipulation instead of clicking through by hand — this is
 * how blinker/glider/still-life behavior gets checked against known ground
 * truth rather than "something happens".
 * ------------------------------------------------------------------------ */
window.OGH_LIFE_FORMS = {
  CONFIG: { MIN_SPEED, MAX_SPEED, RANDOM_DENSITY },
  getState: () => ({
    generation: grid.generation,
    liveCount: grid.liveCount,
    running,
    speed,
    cols: grid.cols,
    rows: grid.rows,
  }),
  getCell: (c, r) => getCell(grid, c, r),
  setCell(c, r, alive) {
    const changed = setCellAlive(grid, c, r, !!alive);
    if (changed) updateHud();
    return changed;
  },
  getAliveCells() {
    const list = [];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (getCell(grid, c, r)) list.push([c, r]);
      }
    }
    return list;
  },
  boundingBox: () => boundingBox(grid),
  /** Replace the entire grid with an explicit live-cell set (clears first) —
   * for exact, ground-truth test setups placed away from any edge. */
  setAliveCells(cells) {
    pause();
    clearGrid(grid);
    for (const [c, r] of cells) setCellAlive(grid, c, r, true);
    recountLive(grid);
    updateHud();
  },
  clearAll() { pause(); clearGrid(grid); updateHud(); },
  randomize(density) { pause(); randomizeGrid(grid, density ?? RANDOM_DENSITY); updateHud(); },
  step: () => doStep(),
  play,
  pause,
  isRunning: () => running,
  setSpeed(s) {
    speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, s));
    speedSlider.value = String(speed);
    speedValEl.textContent = `${speed}/s`;
  },
  patternIds: () => PATTERNS.map((p) => p.id),
  placePattern(id, originC, originR) {
    const p = getPattern(id);
    if (!p) return false;
    pause();
    if (originC == null || originR == null) stampPatternCentered(grid, p);
    else stampPattern(grid, p, originC, originR);
    updateHud();
    return true;
  },
  setLang,
  getLang: () => currentLang,
};
