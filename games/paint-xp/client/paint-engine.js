/**
 * Paint XP — canvas engine: undo/redo stack, flood fill, whole-image
 * transforms, and pixel/color helpers. No DOM wiring here — that's app.js.
 */

const MAX_UNDO = 20;

export class PaintEngine {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    /** @type {ImageData[]} */
    this.undoStack = [];
    /** @type {ImageData[]} */
    this.redoStack = [];
  }

  /** (Re)size the backing bitmap and fill it with a solid color. Resets undo/redo history. */
  init(width, height, fillColor = '#ffffff') {
    this.canvas.width = Math.max(1, Math.round(width));
    this.canvas.height = Math.max(1, Math.round(height));
    this.undoStack = [];
    this.redoStack = [];
    this.ctx.fillStyle = fillColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Snapshot the current bitmap onto the undo stack. Call this immediately
   *  before starting any committed mutation (a stroke, a shape, a fill, a
   *  transform, a paste...). Invalidates the redo stack, matching standard
   *  undo/redo semantics (a new action forks away from redo history). */
  pushUndo() {
    const snap = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.undoStack.push(snap);
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    this.redoStack = [];
  }

  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }

  undo() {
    if (!this.undoStack.length) return false;
    const current = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.redoStack.push(current);
    const prev = this.undoStack.pop();
    // A prior action may have resized the canvas (rotate, open, new) — restore that too.
    if (prev.width !== this.canvas.width || prev.height !== this.canvas.height) {
      this.canvas.width = prev.width;
      this.canvas.height = prev.height;
    }
    this.ctx.putImageData(prev, 0, 0);
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;
    const current = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.undoStack.push(current);
    const next = this.redoStack.pop();
    if (next.width !== this.canvas.width || next.height !== this.canvas.height) {
      this.canvas.width = next.width;
      this.canvas.height = next.height;
    }
    this.ctx.putImageData(next, 0, 0);
    return true;
  }

  clear(fillColor = '#ffffff') {
    this.ctx.fillStyle = fillColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  getPixel(x, y) {
    const { width, height } = this.canvas;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    if (xi < 0 || yi < 0 || xi >= width || yi >= height) return null;
    const d = this.ctx.getImageData(xi, yi, 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
  }

  /** Standard 4-directional stack flood fill over ImageData, with a small
   *  tolerance so anti-aliased edges (e.g. from an opened photo/PNG) don't
   *  leave a thin unfilled ring. */
  floodFill(startX, startY, fillRgb, tolerance = 24) {
    const { width, height } = this.canvas;
    const sx = Math.floor(startX);
    const sy = Math.floor(startY);
    if (sx < 0 || sy < 0 || sx >= width || sy >= height) return;

    const imgData = this.ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const startI = (sy * width + sx) * 4;
    const r0 = data[startI], g0 = data[startI + 1], b0 = data[startI + 2], a0 = data[startI + 3];
    const [fr, fg, fb] = fillRgb;
    const fa = 255;

    if (Math.abs(r0 - fr) <= tolerance && Math.abs(g0 - fg) <= tolerance
      && Math.abs(b0 - fb) <= tolerance && Math.abs(a0 - fa) <= tolerance) {
      return; // already effectively this color — nothing to do
    }

    const visited = new Uint8Array(width * height);
    const stack = [sy * width + sx];
    while (stack.length) {
      const p = stack.pop();
      if (visited[p]) continue;
      const i = p * 4;
      const dr = data[i] - r0, dg = data[i + 1] - g0, db = data[i + 2] - b0, da = data[i + 3] - a0;
      if (Math.abs(dr) > tolerance || Math.abs(dg) > tolerance
        || Math.abs(db) > tolerance || Math.abs(da) > tolerance) continue;
      visited[p] = 1;
      data[i] = fr; data[i + 1] = fg; data[i + 2] = fb; data[i + 3] = fa;
      const x = p % width;
      if (x + 1 < width) stack.push(p + 1);
      if (x - 1 >= 0) stack.push(p - 1);
      if (p + width < width * height) stack.push(p + width);
      if (p - width >= 0) stack.push(p - width);
    }
    this.ctx.putImageData(imgData, 0, 0);
  }

  flipHorizontal() {
    const { width, height } = this.canvas;
    const src = this.ctx.getImageData(0, 0, width, height);
    const out = this.ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const si = (y * width + x) * 4;
        const di = (y * width + (width - 1 - x)) * 4;
        out.data[di] = src.data[si];
        out.data[di + 1] = src.data[si + 1];
        out.data[di + 2] = src.data[si + 2];
        out.data[di + 3] = src.data[si + 3];
      }
    }
    this.ctx.putImageData(out, 0, 0);
  }

  flipVertical() {
    const { width, height } = this.canvas;
    const src = this.ctx.getImageData(0, 0, width, height);
    const out = this.ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      const srcRowStart = y * width * 4;
      const dstRowStart = (height - 1 - y) * width * 4;
      out.data.set(src.data.subarray(srcRowStart, srcRowStart + width * 4), dstRowStart);
    }
    this.ctx.putImageData(out, 0, 0);
  }

  /** Rotate the whole bitmap 90 degrees clockwise. Swaps canvas width/height. */
  rotate90() {
    const { canvas, ctx } = this;
    const w = canvas.width;
    const h = canvas.height;
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    tmp.getContext('2d').drawImage(canvas, 0, 0);

    canvas.width = h;
    canvas.height = w;
    ctx.save();
    ctx.translate(h, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
  }

  invertColors() {
    const { width, height } = this.canvas;
    const img = this.ctx.getImageData(0, 0, width, height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 255 - d[i];
      d[i + 1] = 255 - d[i + 1];
      d[i + 2] = 255 - d[i + 2];
    }
    this.ctx.putImageData(img, 0, 0);
  }

  /** Clears to `fillColor`, then draws `img` centered and scaled to fit. */
  drawImageFit(img, fillColor = '#ffffff') {
    const { width, height } = this.canvas;
    this.ctx.fillStyle = fillColor;
    this.ctx.fillRect(0, 0, width, height);
    const scale = Math.min(width / img.width, height / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (width - dw) / 2;
    const dy = (height - dh) / 2;
    this.ctx.drawImage(img, dx, dy, dw, dh);
  }

  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }
}

/** Maps a client (viewport) coordinate to canvas *bitmap* pixel coordinates.
 *  Always recomputed from a fresh getBoundingClientRect() — the canvas is
 *  letterboxed responsively (CSS size can differ from its backing
 *  resolution, e.g. after a language switch reflows the toolbox), so the
 *  scale factor must never be cached. Every consumer (drawing, eyedropper,
 *  text placement, the status-bar cursor readout, shape preview) must call
 *  this same function rather than rolling its own math. */
export function canvasPointFromClient(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

/** Inverse of canvasPointFromClient: canvas bitmap coords -> viewport client coords. */
export function clientPointFromCanvas(canvas, x, y) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;
  return {
    x: rect.left + x * scaleX,
    y: rect.top + y * scaleY,
    scaleX,
    scaleY,
  };
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}

export function rgbToHex([r, g, b]) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
