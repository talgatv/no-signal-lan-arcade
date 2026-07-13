/**
 * Paint XP — UI layer: toolbox/menu/palette DOM, pointer-driven drawing for
 * every tool, dialogs, status bar, file open/save, i18n wiring. Canvas pixel
 * operations (undo/redo, flood fill, transforms) live in paint-engine.js.
 */
import { PaintEngine, canvasPointFromClient, clientPointFromCanvas, hexToRgb, rgbToHex } from './paint-engine.js';
import {
  LANGS, LANG_LABELS, RTL_LANGS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';

const $ = (id) => document.getElementById(id);
const FONT_STACK = 'Tahoma, "Segoe UI", Verdana, sans-serif';
const ERASER_SIZE = 18;
const SIZES = [1, 2, 4, 8];

const canvas = $('canvas');
const engine = new PaintEngine(canvas);
const ctx = engine.ctx;

/* ------------------------------------------------------------------------ *
 * Palette — 2 rows x 14 classic Windows-VGA-ish swatches. Row 1: black/white
 * + the 12 saturated hues. Row 2: gray/silver + a pastel of each hue in the
 * same column, so the two rows visually line up.
 * ------------------------------------------------------------------------ */
const PALETTE_ROW1 = [
  '#000000', '#ffffff', '#800000', '#ff0000', '#808000', '#ffff00', '#008000',
  '#00ff00', '#008080', '#00ffff', '#000080', '#0000ff', '#800080', '#ff00ff',
];
const PALETTE_ROW2 = [
  '#808080', '#c0c0c0', '#c08080', '#ff8080', '#c0c080', '#ffff80', '#80c080',
  '#80ff80', '#80c0c0', '#80ffff', '#8080c0', '#8080ff', '#c080c0', '#ff80ff',
];
const PALETTE = [...PALETTE_ROW1, ...PALETTE_ROW2];

/* ------------------------------------------------------------------------ *
 * Tools + small inline-SVG icons (16x16). Kept monochrome so both the
 * unpressed (outset) and pressed/active (inset) button states read clearly.
 * ------------------------------------------------------------------------ */
const TOOLS = [
  { id: 'select', labelKey: 'toolSelect' },
  { id: 'eraser', labelKey: 'toolEraser' },
  { id: 'fill', labelKey: 'toolFill' },
  { id: 'picker', labelKey: 'toolPicker' },
  { id: 'pencil', labelKey: 'toolPencil' },
  { id: 'brush', labelKey: 'toolBrush' },
  { id: 'text', labelKey: 'toolText' },
  { id: 'line', labelKey: 'toolLine' },
  { id: 'rect', labelKey: 'toolRect' },
  { id: 'ellipse', labelKey: 'toolEllipse' },
];

const ICONS = {
  select: '<svg viewBox="0 0 16 16" width="16" height="16"><rect x="2" y="2" width="12" height="12" fill="none" stroke="#000" stroke-width="1.3" stroke-dasharray="2,1.4"/></svg>',
  eraser: '<svg viewBox="0 0 16 16" width="16" height="16"><rect x="3" y="4.5" width="10" height="7.5" rx="1" fill="#e8869b" stroke="#000" stroke-width="1.1"/><rect x="3" y="8.5" width="10" height="3.5" fill="#fff" stroke="#000" stroke-width="1.1"/></svg>',
  fill: '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M4 2.6 L12 2.6 L10.6 9 L5.4 9 Z" fill="#fff" stroke="#000" stroke-width="1.1"/><rect x="5.3" y="8.6" width="5.4" height="1.3" fill="#000"/><circle cx="7.3" cy="12" r="1.3" fill="#1e5bc7" stroke="#000" stroke-width="0.4"/><circle cx="10" cy="13.4" r="0.9" fill="#1e5bc7" stroke="#000" stroke-width="0.4"/></svg>',
  picker: '<svg viewBox="0 0 16 16" width="16" height="16"><line x1="3" y1="13.5" x2="9.2" y2="7.3" stroke="#000" stroke-width="1.6" stroke-linecap="round"/><rect x="8.6" y="2.4" width="3.4" height="4.6" rx="0.6" fill="#000" transform="rotate(45 10.3 4.7)"/></svg>',
  pencil: '<svg viewBox="0 0 16 16" width="16" height="16"><rect x="6.8" y="2" width="2.4" height="9" fill="#ffd23f" stroke="#000" stroke-width="0.8" transform="rotate(45 8 8)"/><path d="M11.6 10.2 L13.6 12.2 L12.2 13.6 L10.2 11.6 Z" fill="#000"/></svg>',
  brush: '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M9.6 2.6 L13.4 6.4 L7 12.8 C6 13.8 4.4 13.8 3.4 12.8 C4.6 12.6 5.4 11.6 5.2 10.4 Z" fill="#3d78d8" stroke="#000" stroke-width="0.8"/></svg>',
  text: '<span class="xp-icon-letter">A</span>',
  line: '<svg viewBox="0 0 16 16" width="16" height="16"><line x1="2.5" y1="13.5" x2="13.5" y2="2.5" stroke="#000" stroke-width="1.6" stroke-linecap="round"/></svg>',
  rect: '<svg viewBox="0 0 16 16" width="16" height="16"><rect x="2.5" y="4" width="11" height="8" fill="none" stroke="#000" stroke-width="1.5"/></svg>',
  ellipse: '<svg viewBox="0 0 16 16" width="16" height="16"><ellipse cx="8" cy="8" rx="5.6" ry="4" fill="none" stroke="#000" stroke-width="1.5"/></svg>',
};

const DIALOG_ICONS = {
  info: '<svg viewBox="0 0 32 32" width="30" height="30"><circle cx="16" cy="16" r="14" fill="#1650c0"/><rect x="14" y="13" width="4" height="12" fill="#fff"/><rect x="14" y="7" width="4" height="4" fill="#fff"/></svg>',
  question: '<svg viewBox="0 0 32 32" width="30" height="30"><circle cx="16" cy="16" r="14" fill="#1650c0"/><text x="16" y="22" font-size="17" font-weight="bold" text-anchor="middle" fill="#fff" font-family="Tahoma,sans-serif">?</text></svg>',
};

/* ------------------------------------------------------------------------ *
 * Mutable UI state
 * ------------------------------------------------------------------------ */
let lang = detectLang();
let primaryColor = '#000000';
let secondaryColor = '#ffffff';
let currentTool = 'pencil';
let currentSize = 2;
let filledShape = false;

let toolboxVisible = true;
let colorBoxVisible = true;
let statusBarVisible = true;

let activePointerId = null;
let strokeButton = 0;
let lastX = 0;
let lastY = 0;
let dragStartX = 0;
let dragStartY = 0;
let preDragSnapshot = null;

let activeTextEditor = null; // { el, x, y, fontSize }

/** @type {{x:number,y:number,w:number,h:number,data:ImageData|null}|null} */
let selection = null;
let selectionDragging = false;
let selectionMoveBase = null;
let selectionDragAnchor = { x: 0, y: 0 };

let statusMsgTimer = null;

/* ------------------------------------------------------------------------ *
 * Color helpers
 * ------------------------------------------------------------------------ */
function colorForButton(button) {
  return button === 2 ? secondaryColor : primaryColor;
}

function setPrimaryColor(hex) {
  primaryColor = hex;
  $('fgIndicator').style.background = hex;
}

function setSecondaryColor(hex) {
  secondaryColor = hex;
  $('bgIndicator').style.background = hex;
}

/* ------------------------------------------------------------------------ *
 * Toolbox
 * ------------------------------------------------------------------------ */
function buildToolbox() {
  const grid = $('toolGrid');
  TOOLS.forEach((tool) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'xp-tool-btn';
    btn.dataset.tool = tool.id;
    btn.setAttribute('data-i18n-title', tool.labelKey);
    btn.innerHTML = ICONS[tool.id];
    btn.addEventListener('click', () => setTool(tool.id));
    grid.appendChild(btn);
  });
}

function setTool(id) {
  if (activeTextEditor) commitText();
  if (currentTool === 'select' && id !== 'select') deselectAll();
  currentTool = id;
  document.querySelectorAll('.xp-tool-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tool === id);
  });
  updateToolOptions();
}

function updateToolOptions() {
  const wrap = $('toolOptions');
  wrap.innerHTML = '';
  const showSize = ['brush', 'line', 'rect', 'ellipse'].includes(currentTool);
  const showFilled = ['rect', 'ellipse'].includes(currentTool);
  if (!showSize && !showFilled) return;

  if (showSize) {
    const label = document.createElement('div');
    label.className = 'xp-tool-options-label';
    label.textContent = t(lang, 'sizeLabel');
    wrap.appendChild(label);

    const row = document.createElement('div');
    row.className = 'xp-size-row';
    SIZES.forEach((sz) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `xp-size-btn${sz === currentSize ? ' active' : ''}`;
      const dot = document.createElement('span');
      dot.className = 'xp-size-dot';
      const d = Math.max(2, Math.min(14, sz * 1.6));
      dot.style.width = `${d}px`;
      dot.style.height = `${d}px`;
      b.appendChild(dot);
      b.addEventListener('click', () => { currentSize = sz; updateToolOptions(); });
      row.appendChild(b);
    });
    wrap.appendChild(row);
  }

  if (showFilled) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `xp-filled-toggle${filledShape ? ' active' : ''}`;
    b.textContent = t(lang, 'filledLabel');
    b.addEventListener('click', () => { filledShape = !filledShape; updateToolOptions(); });
    wrap.appendChild(b);
  }
}

/* ------------------------------------------------------------------------ *
 * Palette grid + fg/bg indicator
 * left click -> primary/foreground; right click (mouse) or long-press
 * (touch/pen) -> secondary/background. This is core classic-Paint behavior,
 * not cosmetic — see attachSwatchHandlers.
 * ------------------------------------------------------------------------ */
function buildPalette() {
  const grid = $('paletteGrid');
  PALETTE.forEach((hex) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'xp-swatch';
    b.style.background = hex;
    b.dataset.color = hex;
    attachSwatchHandlers(b, hex);
    grid.appendChild(b);
  });
}

function attachSwatchHandlers(el, hex) {
  let pressTimer = null;
  let longPressFired = false;
  let startX = 0;
  let startY = 0;

  function cancelPress() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
  }

  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    setSecondaryColor(hex);
  });

  el.addEventListener('pointerdown', (e) => {
    if (e.button === 2) return; // contextmenu handler above covers right mouse button
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      longPressFired = false;
      startX = e.clientX;
      startY = e.clientY;
      cancelPress();
      pressTimer = setTimeout(() => {
        longPressFired = true;
        pressTimer = null;
        setSecondaryColor(hex);
        if (navigator.vibrate) navigator.vibrate(15);
      }, 500);
    }
  });
  el.addEventListener('pointermove', (e) => {
    if (pressTimer && (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10)) {
      cancelPress();
    }
  });
  el.addEventListener('pointerup', cancelPress);
  el.addEventListener('pointercancel', cancelPress);
  el.addEventListener('pointerleave', cancelPress);

  el.addEventListener('click', () => {
    if (longPressFired) { longPressFired = false; return; } // long-press already set secondary; don't also set primary
    setPrimaryColor(hex);
  });
}

function setupColorPicker() {
  let target = 'primary';
  $('fgIndicator').addEventListener('click', () => {
    target = 'primary';
    $('colorPicker').value = primaryColor;
    $('colorPicker').click();
  });
  $('bgIndicator').addEventListener('click', () => {
    target = 'secondary';
    $('colorPicker').value = secondaryColor;
    $('colorPicker').click();
  });
  $('colorPicker').addEventListener('input', (e) => {
    if (target === 'primary') setPrimaryColor(e.target.value);
    else setSecondaryColor(e.target.value);
  });
}

/* ------------------------------------------------------------------------ *
 * Freehand drawing (pencil / brush / eraser)
 * Pencil is plotted pixel-by-pixel (Bresenham) for a genuinely hard,
 * non-anti-aliased 1px edge — ctx.stroke() always anti-aliases vector paths,
 * which real classic Paint's pencil never did. Brush/eraser use normal
 * canvas stroking, which is fine (and even appropriate — a "brush" should
 * look a little soft).
 * ------------------------------------------------------------------------ */
function bresenhamLine(x0, y0, x1, y1, plotFn) {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const ex = Math.round(x1);
  const ey = Math.round(y1);
  const dx = Math.abs(ex - x);
  const sx = x < ex ? 1 : -1;
  const dy = -Math.abs(ey - y);
  const sy = y < ey ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    plotFn(x, y);
    if (x === ex && y === ey) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

function plotHardLine(x0, y0, x1, y1, rgb) {
  const bx0 = Math.max(0, Math.floor(Math.min(x0, x1)) - 1);
  const by0 = Math.max(0, Math.floor(Math.min(y0, y1)) - 1);
  const bx1 = Math.min(canvas.width, Math.ceil(Math.max(x0, x1)) + 2);
  const by1 = Math.min(canvas.height, Math.ceil(Math.max(y0, y1)) + 2);
  const bw = Math.max(1, bx1 - bx0);
  const bh = Math.max(1, by1 - by0);
  const img = ctx.getImageData(bx0, by0, bw, bh);
  bresenhamLine(x0, y0, x1, y1, (x, y) => {
    const lx = x - bx0;
    const ly = y - by0;
    if (lx < 0 || ly < 0 || lx >= bw || ly >= bh) return;
    const i = (ly * bw + lx) * 4;
    img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255;
  });
  ctx.putImageData(img, bx0, by0);
}

function drawFreehandSegment(x0, y0, x1, y1) {
  if (currentTool === 'pencil') {
    plotHardLine(x0, y0, x1, y1, hexToRgb(colorForButton(strokeButton)));
    return;
  }
  ctx.beginPath();
  if (currentTool === 'eraser') {
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.lineWidth = ERASER_SIZE;
    ctx.strokeStyle = secondaryColor; // eraser always paints background color, any button
  } else {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, currentSize);
    ctx.strokeStyle = colorForButton(strokeButton);
  }
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/* ------------------------------------------------------------------------ *
 * Shape previews (line / rectangle / ellipse) — redraw from a pre-drag
 * snapshot on every move so the shape "chases" the pointer instead of
 * leaving a trail, then commits on release.
 * ------------------------------------------------------------------------ */
function restoreSnapshot() {
  if (preDragSnapshot) ctx.putImageData(preDragSnapshot, 0, 0);
}

function drawLinePreview(x0, y0, x1, y1, color) {
  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1, currentSize);
  ctx.strokeStyle = color;
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function shapeColors(button) {
  const outline = button === 2 ? secondaryColor : primaryColor;
  const fill = button === 2 ? primaryColor : secondaryColor;
  return { outline, fill };
}

function drawRectPreview(x0, y0, x1, y1, button) {
  const { outline, fill } = shapeColors(button);
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  const w = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);
  if (filledShape) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
  ctx.lineWidth = Math.max(1, currentSize);
  ctx.strokeStyle = outline;
  ctx.strokeRect(x, y, w, h);
}

function drawEllipsePreview(x0, y0, x1, y1, button) {
  const { outline, fill } = shapeColors(button);
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  const w = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = Math.max(0.5, w / 2);
  const ry = Math.max(0.5, h / 2);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  if (filledShape) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.lineWidth = Math.max(1, currentSize);
  ctx.strokeStyle = outline;
  ctx.stroke();
}

/* ------------------------------------------------------------------------ *
 * Select + move (rectangular marquee)
 * ------------------------------------------------------------------------ */
function pointInSelection(x, y) {
  if (!selection || selection.data == null) return false;
  return x >= selection.x && x < selection.x + selection.w
    && y >= selection.y && y < selection.y + selection.h;
}

function updateMarqueeOverlay(x, y, w, h) {
  if (!selection) { hideMarquee(); return; }
  const sx = x ?? selection.x;
  const sy = y ?? selection.y;
  const sw = w ?? selection.w;
  const sh = h ?? selection.h;
  const stage = $('canvasStage');
  const stageRect = stage.getBoundingClientRect();
  const p0 = clientPointFromCanvas(canvas, sx, sy);
  const p1 = clientPointFromCanvas(canvas, sx + sw, sy + sh);
  const marquee = $('marquee');
  marquee.hidden = false;
  marquee.style.left = `${p0.x - stageRect.left}px`;
  marquee.style.top = `${p0.y - stageRect.top}px`;
  marquee.style.width = `${Math.max(0, p1.x - p0.x)}px`;
  marquee.style.height = `${Math.max(0, p1.y - p0.y)}px`;
}

function hideMarquee() { $('marquee').hidden = true; }

function deselectAll() {
  selection = null;
  selectionDragging = false;
  selectionMoveBase = null;
  hideMarquee();
}

function handleSelectPointerDown(p) {
  if (selection && pointInSelection(p.x, p.y)) {
    engine.pushUndo();
    selectionDragging = true;
    selectionDragAnchor = { x: p.x, y: p.y };
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(selection.x, selection.y, selection.w, selection.h);
    selectionMoveBase = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.putImageData(selection.data, selection.x, selection.y);
  } else {
    selection = { x: p.x, y: p.y, w: 0, h: 0, data: null };
    selectionDragging = false;
    dragStartX = p.x;
    dragStartY = p.y;
    updateMarqueeOverlay();
  }
}

function handleSelectPointerMove(x, y) {
  if (!selection) return;
  if (selectionDragging) {
    const dx = Math.round(x - selectionDragAnchor.x);
    const dy = Math.round(y - selectionDragAnchor.y);
    ctx.putImageData(selectionMoveBase, 0, 0);
    ctx.putImageData(selection.data, selection.x + dx, selection.y + dy);
    updateMarqueeOverlay(selection.x + dx, selection.y + dy, selection.w, selection.h);
  } else {
    const x0 = Math.min(dragStartX, x);
    const y0 = Math.min(dragStartY, y);
    selection.x = x0;
    selection.y = y0;
    selection.w = Math.abs(x - dragStartX);
    selection.h = Math.abs(y - dragStartY);
    updateMarqueeOverlay();
  }
}

function handleSelectPointerUp(x, y) {
  if (!selection) return;
  if (selectionDragging) {
    const dx = Math.round(x - selectionDragAnchor.x);
    const dy = Math.round(y - selectionDragAnchor.y);
    selection.x = Math.round(selection.x + dx);
    selection.y = Math.round(selection.y + dy);
    selectionDragging = false;
    selectionMoveBase = null;
    updateMarqueeOverlay();
  } else {
    selection.x = Math.round(selection.x);
    selection.y = Math.round(selection.y);
    selection.w = Math.round(selection.w);
    selection.h = Math.round(selection.h);
    if (selection.w < 1 || selection.h < 1) { selection = null; hideMarquee(); return; }
    selection.data = ctx.getImageData(selection.x, selection.y, selection.w, selection.h);
    updateMarqueeOverlay();
  }
}

function selectAllAction() {
  deselectAll();
  selection = {
    x: 0, y: 0, w: canvas.width, h: canvas.height,
    data: ctx.getImageData(0, 0, canvas.width, canvas.height),
  };
  setTool('select');
  updateMarqueeOverlay();
}

function clearSelectionAction() {
  if (!selection || selection.data == null) return;
  engine.pushUndo();
  ctx.fillStyle = secondaryColor;
  ctx.fillRect(selection.x, selection.y, selection.w, selection.h);
  deselectAll();
  afterMutation();
}

/* ------------------------------------------------------------------------ *
 * Text tool — overlay <input> positioned over the canvas in *screen* space
 * (via the same canvas<->client mapping used everywhere else), committed as
 * real canvas pixels via fillText on Enter/blur.
 * ------------------------------------------------------------------------ */
function startTextInput(x, y) {
  if (activeTextEditor) commitText();
  const stage = $('canvasStage');
  const stageRect = stage.getBoundingClientRect();
  const anchor = clientPointFromCanvas(canvas, x, y);
  const fontSizeCanvas = 22;
  const fontSizeCss = Math.max(10, fontSizeCanvas * anchor.scaleY);

  const overlay = document.createElement('input');
  overlay.type = 'text';
  overlay.className = 'xp-text-input';
  overlay.dir = 'auto'; // free-text entry: let it follow whatever script the user types
  overlay.autocomplete = 'off';
  overlay.spellcheck = false;
  overlay.style.left = `${anchor.x - stageRect.left}px`;
  overlay.style.top = `${anchor.y - stageRect.top}px`;
  overlay.style.fontSize = `${fontSizeCss}px`;
  overlay.style.color = primaryColor;
  overlay.style.width = `${Math.max(60, Math.min(320, (canvas.width - x) * anchor.scaleX))}px`;

  stage.appendChild(overlay);
  activeTextEditor = { el: overlay, x, y, fontSize: fontSizeCanvas };

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitText(); } else if (e.key === 'Escape') { e.preventDefault(); cancelText(); }
    e.stopPropagation();
  });
  overlay.addEventListener('blur', () => { if (activeTextEditor) commitText(); });
  overlay.focus();
}

function commitText() {
  if (!activeTextEditor) return;
  const { el, x, y, fontSize } = activeTextEditor;
  const text = el.value;
  activeTextEditor = null;
  el.remove();
  if (!text) return;
  engine.pushUndo();
  ctx.fillStyle = primaryColor;
  ctx.font = `${fontSize}px ${FONT_STACK}`;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
  afterMutation();
}

function cancelText() {
  if (!activeTextEditor) return;
  activeTextEditor.el.remove();
  activeTextEditor = null;
}

/* ------------------------------------------------------------------------ *
 * Canvas pointer wiring — one active pointer at a time; button captured at
 * pointerdown drives primary-vs-secondary color for the whole stroke.
 * ------------------------------------------------------------------------ */
function setupCanvasEvents() {
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('pointerdown', (e) => {
    if (activeTextEditor) commitText();
    if (activePointerId !== null) return;
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    const p = canvasPointFromClient(canvas, e.clientX, e.clientY);

    if (currentTool === 'fill') {
      engine.pushUndo();
      engine.floodFill(Math.floor(p.x), Math.floor(p.y), hexToRgb(colorForButton(e.button)));
      afterMutation();
      return;
    }
    if (currentTool === 'picker') {
      const px = engine.getPixel(Math.floor(p.x), Math.floor(p.y));
      if (px) {
        const hex = rgbToHex(px);
        if (e.button === 2) setSecondaryColor(hex); else setPrimaryColor(hex);
      }
      return;
    }
    if (currentTool === 'text') {
      startTextInput(p.x, p.y);
      return;
    }

    canvas.setPointerCapture(e.pointerId);
    activePointerId = e.pointerId;
    strokeButton = e.button;
    lastX = p.x; lastY = p.y;
    dragStartX = p.x; dragStartY = p.y;

    if (currentTool === 'select') {
      handleSelectPointerDown(p);
      return;
    }

    engine.pushUndo();
    if (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser') {
      drawFreehandSegment(p.x, p.y, p.x, p.y);
    } else {
      preDragSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = canvasPointFromClient(canvas, e.clientX, e.clientY);
    updateStatusPos(p.x, p.y);
    if (e.pointerId !== activePointerId) return;

    if (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser') {
      drawFreehandSegment(lastX, lastY, p.x, p.y);
      lastX = p.x; lastY = p.y;
    } else if (currentTool === 'line') {
      restoreSnapshot();
      drawLinePreview(dragStartX, dragStartY, p.x, p.y, colorForButton(strokeButton));
    } else if (currentTool === 'rect') {
      restoreSnapshot();
      drawRectPreview(dragStartX, dragStartY, p.x, p.y, strokeButton);
    } else if (currentTool === 'ellipse') {
      restoreSnapshot();
      drawEllipsePreview(dragStartX, dragStartY, p.x, p.y, strokeButton);
    } else if (currentTool === 'select') {
      handleSelectPointerMove(p.x, p.y);
    }
  });

  function endDrawPointer(e) {
    if (e.pointerId !== activePointerId) return;
    const p = canvasPointFromClient(canvas, e.clientX, e.clientY);
    if (currentTool === 'line') { restoreSnapshot(); drawLinePreview(dragStartX, dragStartY, p.x, p.y, colorForButton(strokeButton)); } else if (currentTool === 'rect') { restoreSnapshot(); drawRectPreview(dragStartX, dragStartY, p.x, p.y, strokeButton); } else if (currentTool === 'ellipse') { restoreSnapshot(); drawEllipsePreview(dragStartX, dragStartY, p.x, p.y, strokeButton); } else if (currentTool === 'select') { handleSelectPointerUp(p.x, p.y); }
    try { canvas.releasePointerCapture(activePointerId); } catch { /* already released */ }
    activePointerId = null;
    preDragSnapshot = null;
    afterMutation();
  }
  canvas.addEventListener('pointerup', endDrawPointer);
  canvas.addEventListener('pointercancel', endDrawPointer);

  canvas.addEventListener('pointerleave', () => {
    if (activePointerId === null) $('statusPos').textContent = '–, –';
  });

  window.addEventListener('resize', () => { if (selection) updateMarqueeOverlay(); });
}

/* ------------------------------------------------------------------------ *
 * Status bar
 * ------------------------------------------------------------------------ */
function updateStatusPos(x, y) {
  $('statusPos').textContent = t(lang, 'statusPos', { x: Math.round(x), y: Math.round(y) });
}

function updateStatusDims() {
  $('statusDims').textContent = t(lang, 'statusDims', { w: canvas.width, h: canvas.height });
}

function setStatusMsg(text) {
  const el = $('statusMsg');
  el.removeAttribute('data-i18n');
  el.textContent = text;
  clearTimeout(statusMsgTimer);
  statusMsgTimer = setTimeout(() => {
    el.setAttribute('data-i18n', 'statusReady');
    el.textContent = t(lang, 'statusReady');
  }, 1800);
}

function syncCanvasAspect() {
  canvas.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
}

function updateEditMenuState() {
  const undoBtn = document.querySelector('.xp-menuitem[data-action="undo"]');
  const redoBtn = document.querySelector('.xp-menuitem[data-action="redo"]');
  if (undoBtn) undoBtn.disabled = !engine.canUndo();
  if (redoBtn) redoBtn.disabled = !engine.canRedo();
}

function afterMutation() {
  syncCanvasAspect();
  updateStatusDims();
  updateEditMenuState();
}

/* ------------------------------------------------------------------------ *
 * Undo / redo
 * ------------------------------------------------------------------------ */
function doUndo() {
  if (activeTextEditor) cancelText();
  if (engine.undo()) { deselectAll(); afterMutation(); setStatusMsg(t(lang, 'statusUndo')); }
}
function doRedo() {
  if (activeTextEditor) cancelText();
  if (engine.redo()) { deselectAll(); afterMutation(); setStatusMsg(t(lang, 'statusRedo')); }
}

/* ------------------------------------------------------------------------ *
 * Menu bar + dropdowns
 * ------------------------------------------------------------------------ */
function closeAllMenus() {
  document.querySelectorAll('.xp-menu.is-open').forEach((m) => m.classList.remove('is-open'));
  $('langMenu').hidden = true;
  $('langBtn').setAttribute('aria-expanded', 'false');
}

function setupMenuBar() {
  document.querySelectorAll('.xp-menu').forEach((menuEl) => {
    const btn = menuEl.querySelector('.xp-menubtn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = menuEl.classList.contains('is-open');
      closeAllMenus();
      if (!wasOpen) menuEl.classList.add('is-open');
    });
    menuEl.querySelectorAll('.xp-menuitem').forEach((item) => {
      item.addEventListener('click', () => {
        if (item.disabled) return;
        handleMenuAction(item.dataset.action);
        closeAllMenus();
      });
    });
  });
  document.addEventListener('click', () => closeAllMenus());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

function handleMenuAction(action) {
  switch (action) {
    case 'new':
      confirmThen('confirmNewTitle', 'confirmNewBody', resetCanvas);
      break;
    case 'open':
      $('fileInput').click();
      break;
    case 'save':
      saveAsPng();
      break;
    case 'exit':
      goBackToLibrary();
      break;
    case 'undo':
      doUndo();
      break;
    case 'redo':
      doRedo();
      break;
    case 'selectAll':
      selectAllAction();
      break;
    case 'clearSelection':
      clearSelectionAction();
      break;
    case 'clearImage':
      confirmThen('confirmClearTitle', 'confirmClearBody', () => {
        engine.pushUndo();
        engine.clear(secondaryColor);
        deselectAll();
        afterMutation();
      });
      break;
    case 'toggleToolbox':
      toggleView('toolbox');
      break;
    case 'toggleColorBox':
      toggleView('colorBox');
      break;
    case 'toggleStatusBar':
      toggleView('statusBar');
      break;
    case 'flipH':
      engine.pushUndo(); engine.flipHorizontal(); deselectAll(); afterMutation();
      break;
    case 'flipV':
      engine.pushUndo(); engine.flipVertical(); deselectAll(); afterMutation();
      break;
    case 'rotate':
      engine.pushUndo(); engine.rotate90(); deselectAll(); afterMutation();
      break;
    case 'invert':
      engine.pushUndo(); engine.invertColors(); deselectAll(); afterMutation();
      break;
    case 'editColors':
      $('fgIndicator').click();
      break;
    case 'about':
      showAboutDialog();
      break;
    default:
      break;
  }
}

function toggleView(which) {
  if (which === 'toolbox') {
    toolboxVisible = !toolboxVisible;
    $('toolbox').hidden = !toolboxVisible;
    setMenuChecked('toggleToolbox', toolboxVisible);
  } else if (which === 'colorBox') {
    colorBoxVisible = !colorBoxVisible;
    $('paletteRow').hidden = !colorBoxVisible;
    setMenuChecked('toggleColorBox', colorBoxVisible);
  } else if (which === 'statusBar') {
    statusBarVisible = !statusBarVisible;
    $('statusbar').hidden = !statusBarVisible;
    setMenuChecked('toggleStatusBar', statusBarVisible);
  }
}

function setMenuChecked(action, checked) {
  const el = document.querySelector(`.xp-menuitem[data-action="${action}"]`);
  if (el) el.classList.toggle('is-checked', checked);
}

/* ------------------------------------------------------------------------ *
 * Dialogs — one generic classic-Windows message box, reused for About and
 * for New/Clear confirmations. Dialog *prose* (unlike the toolbox/canvas
 * chrome) is safe to mirror for RTL languages, so its dir is set per-call.
 * ------------------------------------------------------------------------ */
function showDialog({
  title, message, buttons, icon = 'info',
}) {
  return new Promise((resolve) => {
    const overlay = $('dialogOverlay');
    $('dialogTitle').textContent = title;
    const msgEl = $('dialogMsg');
    msgEl.textContent = message;
    msgEl.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
    $('dialogIcon').innerHTML = DIALOG_ICONS[icon] || DIALOG_ICONS.info;
    const btnWrap = $('dialogButtons');
    btnWrap.innerHTML = '';
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'xp-dialog-btn';
      el.textContent = b.label;
      el.addEventListener('click', () => { overlay.hidden = true; resolve(b.value); });
      btnWrap.appendChild(el);
    });
    overlay.hidden = false;
    btnWrap.querySelector('button')?.focus();
  });
}

async function confirmThen(titleKey, bodyKey, onOk) {
  const result = await showDialog({
    title: t(lang, titleKey),
    message: t(lang, bodyKey),
    icon: 'question',
    buttons: [{ label: t(lang, 'btnOk'), value: true }, { label: t(lang, 'btnCancel'), value: false }],
  });
  if (result) onOk();
}

async function showAboutDialog() {
  await showDialog({
    title: t(lang, 'aboutTitle'),
    message: t(lang, 'aboutBody'),
    icon: 'info',
    buttons: [{ label: t(lang, 'btnOk'), value: true }],
  });
}

/* ------------------------------------------------------------------------ *
 * File I/O
 * ------------------------------------------------------------------------ */
function setupFileIO() {
  $('fileInput').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      engine.pushUndo();
      engine.drawImageFit(img, '#ffffff');
      URL.revokeObjectURL(url);
      deselectAll();
      afterMutation();
      setStatusMsg(t(lang, 'statusOpened'));
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
    e.target.value = '';
  });
}

function saveAsPng() {
  const url = engine.toDataURL();
  const a = document.createElement('a');
  a.href = url;
  a.download = 'paint-xp.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setStatusMsg(t(lang, 'statusSaved'));
}

function goBackToLibrary() {
  window.location.href = '/games/';
}

/* ------------------------------------------------------------------------ *
 * Canvas sizing / reset
 * ------------------------------------------------------------------------ */
function computeInitialCanvasSize() {
  const rect = $('canvasStage').getBoundingClientRect();
  const pad = 14;
  const w = Math.max(240, Math.min(1400, Math.round(rect.width - pad) || 600));
  const h = Math.max(180, Math.min(1000, Math.round(rect.height - pad) || 420));
  return { w, h };
}

function resetCanvas() {
  const { w, h } = computeInitialCanvasSize();
  engine.init(w, h, '#ffffff');
  deselectAll();
  syncCanvasAspect();
  afterMutation();
}

/* ------------------------------------------------------------------------ *
 * i18n wiring
 * ------------------------------------------------------------------------ */
function rebuildLangMenu() {
  const menu = $('langMenu');
  menu.innerHTML = '';
  LANGS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `xp-langitem${l === lang ? ' is-on' : ''}`;
    b.textContent = LANG_LABELS[l];
    b.addEventListener('click', (e) => { e.stopPropagation(); applyLang(l); closeAllMenus(); });
    menu.appendChild(b);
  });
  $('langBtn').textContent = LANG_LABELS[lang];
}

function applyLang(l) {
  lang = l;
  applyStaticStrings(lang);
  document.title = `${t(lang, 'appName')} — OGH`;
  rebuildLangMenu();
  updateToolOptions();
  updateStatusDims();
  rememberLang(lang);
}

/* ------------------------------------------------------------------------ *
 * Keyboard shortcuts
 * ------------------------------------------------------------------------ */
function setupGlobalKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (activeTextEditor) return; // typing in the overlay input — its own handler covers Enter/Escape
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo(); return; }
    if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault(); doRedo(); return;
    }
    if (e.key === 'Escape') {
      closeAllMenus();
      if (selection) deselectAll();
    }
  });
}

/* ------------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------------ */
function init() {
  buildToolbox();
  buildPalette();
  setupMenuBar();
  setupCanvasEvents();
  setupGlobalKeyboard();
  setupFileIO();
  setupColorPicker();

  $('backBtn').addEventListener('click', goBackToLibrary);
  $('closeBtn').addEventListener('click', goBackToLibrary);
  $('langBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = $('langMenu').hidden;
    closeAllMenus();
    $('langMenu').hidden = !willOpen;
    $('langBtn').setAttribute('aria-expanded', String(willOpen));
  });

  const { w, h } = computeInitialCanvasSize();
  engine.init(w, h, '#ffffff');
  syncCanvasAspect();

  setPrimaryColor('#000000');
  setSecondaryColor('#ffffff');
  setTool('pencil');
  applyLang(lang);
  updateEditMenuState();
  afterMutation();

  // Debug/test hook — harmless in normal use, lets the harness (and
  // devtools) drive/inspect the app without simulating raw DOM events for
  // everything. Mirrors games/music-synth's window.OGH_MUSIC_SYNTH.
  window.OGH_PAINT_XP = {
    engine,
    canvas,
    ctx,
    PALETTE,
    getTool: () => currentTool,
    setTool,
    getPrimaryColor: () => primaryColor,
    getSecondaryColor: () => secondaryColor,
    setPrimaryColor,
    setSecondaryColor,
    getSize: () => currentSize,
    setSize: (s) => { currentSize = s; updateToolOptions(); },
    getFilled: () => filledShape,
    setFilled: (v) => { filledShape = v; updateToolOptions(); },
    undo: doUndo,
    redo: doRedo,
    canUndo: () => engine.canUndo(),
    canRedo: () => engine.canRedo(),
    applyLang,
    getLang: () => lang,
    saveAsPng,
    resetCanvas,
    getSelection: () => selection,
  };
}

init();
