/**
 * lcd.js — the shared "retro LCD dot-matrix" renderer for the Brick Game
 * collection. This one module is what makes Tanks, Snake and Arkanoid read as
 * one handheld: every game draws by lighting chunky square dots on a shared
 * greenish LCD grid, in the same tiny palette, through the same painter.
 *
 * The look is a classic *positive* LCD (like a Game Boy / cheap "Brick Game"
 * handheld): a pale olive-green panel with all the unlit "ghost" segments
 * faintly visible, and dark segments switched on for game objects. No bitmap
 * assets — the whole aesthetic is fillRect squares with a small gap between
 * them, so it stays crisp at any size and weighs nothing.
 *
 * A game never mirrors under RTL: `ctx.direction` is forced to 'ltr' and the
 * dot field is purely spatial (no reading order), exactly like void-drift's /
 * ray-maze's play fields. Only the surrounding HTML text chrome flips.
 */

/** Limited LCD palette — three "shades" plus the panel. */
export const LCD = {
  panel: '#aab883', // lit LCD background (the pale olive "paper")
  ghost: '#9eac76', // off/unlit segment — barely darker than the panel
  ink: '#2c3317', // on segment — dark olive, the main "pixel"
  inkDim: '#5f6a37', // secondary mid shade (outlines / de-emphasised bits)
  edge: '#899462', // faint inner edge shading for depth
};

/** Shade constants a game passes to `set`/`block`/`sprite`. */
export const OFF = 0;
export const ON = 1; // dark ink
export const DIM = 2; // mid shade

const GAP = 0.14; // fraction of a cell left as gap between dots (chunky look)

/**
 * Paint a dot buffer onto a 2D context. Shared by the full-screen LCD and the
 * little menu-icon canvases, so icons and gameplay use pixel-identical dots.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Uint8Array} buf  cols*rows cells, values 0/1/2
 * @param {number} cols
 * @param {number} rows
 * @param {number} ox  device-px origin x of the grid
 * @param {number} oy  device-px origin y of the grid
 * @param {number} s   device-px size of one cell
 * @param {object} [opt]
 * @param {boolean} [opt.ghost=true]  draw faint unlit segments
 */
export function paintDots(ctx, buf, cols, rows, ox, oy, s, opt = {}) {
  const ghost = opt.ghost !== false;
  const inset = Math.max(0.5, s * GAP);
  const d = s - inset; // drawn square size (leaves the gap)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = buf[y * cols + x];
      if (v === OFF) {
        if (!ghost) continue;
        ctx.fillStyle = LCD.ghost;
      } else {
        ctx.fillStyle = v === DIM ? LCD.inkDim : LCD.ink;
      }
      const px = ox + x * s + inset * 0.5;
      const py = oy + y * s + inset * 0.5;
      ctx.fillRect(px, py, d, d);
    }
  }
}

/**
 * The main full-screen LCD. Owns a dot buffer of `cols`x`rows`, sizes itself
 * to fill (and stay centred/square within) its canvas box, and exposes tiny
 * primitives every game composes objects from.
 */
export class Lcd {
  constructor(canvas, cols = 26, rows = 26) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.direction = 'ltr'; // never mirror the dot field under RTL
    this.cols = cols;
    this.rows = rows;
    this.buf = new Uint8Array(cols * rows);
    this.s = 12;
    this.ox = 0;
    this.oy = 0;
    this.W = 0;
    this.H = 0;
  }

  /** Switch the logical grid resolution (used when swapping games). */
  setGrid(cols, rows) {
    if (cols === this.cols && rows === this.rows) return;
    this.cols = cols;
    this.rows = rows;
    this.buf = new Uint8Array(cols * rows);
    this.layout();
  }

  /** Measure the canvas box, allocate a crisp HiDPI backing store, and centre
   *  the (square) dot grid inside it. Mirrors void-drift's resize(). */
  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(120, Math.round(r.width * dpr));
    this.H = Math.max(120, Math.round(r.height * dpr));
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.ctx.direction = 'ltr'; // reset — resizing clears context state
    this.layout();
  }

  layout() {
    this.s = Math.floor(Math.min(this.W / this.cols, this.H / this.rows));
    this.ox = Math.floor((this.W - this.s * this.cols) / 2);
    this.oy = Math.floor((this.H - this.s * this.rows) / 2);
  }

  clear() {
    this.buf.fill(OFF);
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  set(x, y, shade = ON) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    this.buf[y * this.cols + x] = shade;
  }

  get(x, y) {
    if (!this.inBounds(x, y)) return OFF;
    return this.buf[y * this.cols + x];
  }

  /** Fill an axis-aligned block of dots. */
  block(x, y, w, h, shade = ON) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, shade);
    }
  }

  /** Draw a 1-dot-thick rectangle outline. */
  frame(x, y, w, h, shade = ON) {
    for (let xx = x; xx < x + w; xx++) {
      this.set(xx, y, shade);
      this.set(xx, y + h - 1, shade);
    }
    for (let yy = y; yy < y + h; yy++) {
      this.set(x, yy, shade);
      this.set(x + w - 1, yy, shade);
    }
  }

  /**
   * Stamp a small bitmap sprite. `rows` is an array of strings; any char that
   * is not ' ', '.' or '0' lights the dot. Off cells are left untouched (so
   * sprites can be layered).
   */
  sprite(x, y, rows, shade = ON) {
    for (let j = 0; j < rows.length; j++) {
      const line = rows[j];
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c !== ' ' && c !== '.' && c !== '0') this.set(x + i, y + j, shade);
      }
    }
  }

  /** Fill the whole panel background (LCD "glass"). */
  paintPanel() {
    const ctx = this.ctx;
    ctx.fillStyle = LCD.panel;
    ctx.fillRect(0, 0, this.W, this.H);
    // Subtle top-down sheen so the glass reads as a lit panel, not flat paper.
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, 'rgba(255,255,255,0.05)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.0)');
    g.addColorStop(1, 'rgba(0,0,0,0.06)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);
  }

  /** Draw the current buffer. */
  paint() {
    this.paintPanel();
    paintDots(this.ctx, this.buf, this.cols, this.rows, this.ox, this.oy, this.s);
  }

  /** Convert a client (px) point to dot coords; returns null if outside grid. */
  clientToDot(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const dx = (clientX - r.left) * dpr;
    const dy = (clientY - r.top) * dpr;
    const gx = Math.floor((dx - this.ox) / this.s);
    const gy = Math.floor((dy - this.oy) / this.s);
    if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return null;
    return { x: gx, y: gy };
  }
}

/**
 * Render a standalone dot icon (for the menu). Sizes a crisp square grid into
 * the given canvas and paints the buffer with the shared dot look.
 * @param {HTMLCanvasElement} canvas
 * @param {string[]} rows sprite rows (see Lcd.sprite char rules)
 */
export function renderIcon(canvas, rows, shade = ON) {
  const cols = Math.max(...rows.map((r) => r.length));
  const gr = rows.length;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || 64;
  const cssH = canvas.clientHeight || 64;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.direction = 'ltr';
  ctx.fillStyle = LCD.panel;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const s = Math.floor(Math.min(canvas.width / cols, canvas.height / gr));
  const ox = Math.floor((canvas.width - s * cols) / 2);
  const oy = Math.floor((canvas.height - s * gr) / 2);
  const buf = new Uint8Array(cols * gr);
  for (let j = 0; j < gr; j++) {
    for (let i = 0; i < rows[j].length; i++) {
      const c = rows[j][i];
      if (c !== ' ' && c !== '.' && c !== '0') buf[j * cols + i] = shade;
    }
  }
  paintDots(ctx, buf, cols, gr, ox, oy, s);
}
