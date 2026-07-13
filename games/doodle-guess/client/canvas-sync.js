/**
 * canvas-sync.js — the live shared drawing surface for Doodle Guess.
 *
 * Purpose-built and lean: freehand strokes, a small palette, a few brush
 * sizes, an eraser and a clear. This is NOT games/paint-xp's rich local
 * toolset — the hard problem here is broadcasting strokes over the network
 * in real time, not shapes/fill/selection. So this module does two things:
 *
 *   1. DRAWER: capture Pointer Events into short point batches and hand each
 *      batch to an onStroke(seg) callback (app.js broadcasts it). Batches are
 *      small ({c,s,pts,newStroke}) and flushed frequently (~every 45ms or
 *      every 20 points) so remote rendering stays smooth without ever sending
 *      a whole-canvas image.
 *   2. EVERYONE ELSE: applyRemoteStroke(seg) replays an incoming batch onto a
 *      read-only canvas, reconstructing the identical drawing live.
 *
 * Rendering parity: both the drawer's live incremental render and a remote
 * replay draw the SAME primitive — a round-capped segment between each
 * consecutive pair of integer backing-pixel points (or a filled dot for a
 * lone tap). Same points + same primitive => pixel-identical canvases, which
 * is what the sync test asserts (see window.OGH_DOODLE.canvasHash()).
 *
 * All coordinates are in a FIXED backing space (DRAW_W x DRAW_H) that every
 * client shares, so a segment means the same thing on every device
 * regardless of each screen's display size. Coords are rounded to integers to
 * keep messages compact and rendering deterministic.
 *
 * The drawing is spatial content and is never mirrored under RTL:
 * ctx.direction is pinned to 'ltr'.
 */

export const DRAW_W = 800;
export const DRAW_H = 600;
export const PAPER = '#0e1220';
export const ERASER = 'erase';

// 8-color palette (neon-vector friendly, bright on the dark paper).
export const PALETTE = [
  '#ffffff', '#ff5c7a', '#ff9f43', '#ffd166',
  '#5cffb0', '#5ce1ff', '#6ba3ff', '#c4a0ff',
];
export const BRUSH_SIZES = [4, 8, 16];

const FLUSH_MS = 45;
const MAX_BATCH_PTS = 20;
const LOG_CAP = 20000;

export function createDrawSurface(canvas, { onStroke, onClear } = {}) {
  const ctx = canvas.getContext('2d');
  ctx.direction = 'ltr';
  canvas.width = DRAW_W;
  canvas.height = DRAW_H;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let interactive = false;
  let color = PALETTE[0];
  let size = BRUSH_SIZES[1];

  // local drawing state
  let drawing = false;
  let activePointer = null;
  let lastLocalPt = null;
  let pending = [];
  let pendingNew = false;
  let flushTimer = null;

  // remote replay state
  let lastRemotePt = null;

  // segment logs (for the sync test + potential replay). {c,s,pts,newStroke}
  const sentSegs = [];
  const appliedSegs = [];

  function logPush(arr, seg) {
    arr.push(seg);
    if (arr.length > LOG_CAP) arr.splice(0, arr.length - LOG_CAP);
  }

  /* ---- low-level primitives (shared by live render + remote replay) ---- */
  function drawPair(c, s, a, b) {
    ctx.strokeStyle = c === ERASER ? PAPER : c;
    ctx.lineWidth = s;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  function drawDot(c, s, p) {
    ctx.fillStyle = c === ERASER ? PAPER : c;
    ctx.beginPath();
    ctx.arc(p[0], p[1], Math.max(0.5, s / 2), 0, Math.PI * 2);
    ctx.fill();
  }

  function paintSeg(seg) {
    const { c, s, pts, newStroke } = seg;
    if (!pts || !pts.length) return;
    let prev = newStroke ? null : lastRemotePt;
    let start = 0;
    if (!prev) {
      // Start of a stroke: draw a dot at the first point, EXACTLY as the
      // drawer's live render does (onDown / simulateStroke both drawDot the
      // press point). Doing it on both sides keeps the drawer's canvas and a
      // remote replay pixel-identical (the sync test asserts equal hashes),
      // and it makes a single-point tap show as a dot.
      drawDot(c, s, pts[0]);
      prev = pts[0];
      start = 1;
    }
    for (let i = start; i < pts.length; i++) {
      drawPair(c, s, prev, pts[i]);
      prev = pts[i];
    }
    lastRemotePt = pts[pts.length - 1];
  }

  /* ---- fill / clear ---- */
  function fillPaper() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, DRAW_W, DRAW_H);
    ctx.restore();
  }

  function clear(emit = false) {
    fillPaper();
    lastLocalPt = null;
    lastRemotePt = null;
    if (emit) {
      onClear && onClear();
    } else {
      // remote/programmatic clear also resets the applied log baseline
    }
  }

  /* ---- local (drawer) input ---- */
  function toBacking(ev) {
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (DRAW_W / rect.width);
    const y = (ev.clientY - rect.top) * (DRAW_H / rect.height);
    return [
      Math.max(0, Math.min(DRAW_W, Math.round(x))),
      Math.max(0, Math.min(DRAW_H, Math.round(y))),
    ];
  }

  function scheduleFlush() {
    if (flushTimer == null) flushTimer = setTimeout(flush, FLUSH_MS);
  }

  function flush() {
    if (flushTimer != null) { clearTimeout(flushTimer); flushTimer = null; }
    if (!pending.length) return;
    const seg = { c: color, s: size, pts: pending, newStroke: pendingNew };
    logPush(sentSegs, seg);
    pending = [];
    pendingNew = false;
    onStroke && onStroke(seg);
  }

  function onDown(ev) {
    if (!interactive || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    ev.preventDefault();
    drawing = true;
    activePointer = ev.pointerId;
    try { canvas.setPointerCapture(ev.pointerId); } catch { /* */ }
    const p = toBacking(ev);
    // live render: a lone press shows a dot immediately
    drawDot(color, size, p);
    lastLocalPt = p;
    pending = [p];
    pendingNew = true;
    scheduleFlush();
  }

  function onMove(ev) {
    if (!interactive || !drawing || ev.pointerId !== activePointer) return;
    ev.preventDefault();
    // coalesced events give smoother, denser sampling when available
    const raw = typeof ev.getCoalescedEvents === 'function' ? ev.getCoalescedEvents() : null;
    const evs = raw && raw.length ? raw : [ev];
    for (const e of evs) {
      const p = toBacking(e);
      if (lastLocalPt && p[0] === lastLocalPt[0] && p[1] === lastLocalPt[1]) continue;
      if (lastLocalPt) drawPair(color, size, lastLocalPt, p);
      lastLocalPt = p;
      pending.push(p);
    }
    if (pending.length >= MAX_BATCH_PTS) flush();
    else scheduleFlush();
  }

  function onUp(ev) {
    if (ev.pointerId !== activePointer) return;
    if (drawing) { flush(); }
    drawing = false;
    activePointer = null;
    lastLocalPt = null;
    try { canvas.releasePointerCapture(ev.pointerId); } catch { /* */ }
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', (ev) => { if (drawing) onUp(ev); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  clear(false);

  /* ---- public API ---- */
  return {
    DRAW_W,
    DRAW_H,
    canvas,
    ctx,
    sentSegs,
    appliedSegs,

    setInteractive(v) {
      interactive = !!v;
      canvas.classList.toggle('is-drawer', interactive);
      if (!v) { drawing = false; activePointer = null; lastLocalPt = null; pending = []; }
    },
    isInteractive() { return interactive; },
    setColor(c) { color = c; },
    setSize(s) { size = s; },
    getColor() { return color; },
    getSize() { return size; },

    /** Apply an incoming remote stroke batch (guesser side). */
    applyRemoteStroke(seg) {
      if (!seg || !Array.isArray(seg.pts)) return;
      paintSeg(seg);
      logPush(appliedSegs, seg);
    },

    /** Clear locally + notify (drawer) via onClear. */
    clearAndEmit() { clear(true); },
    /** Clear locally only (received clear, or new round reset). */
    clearLocal() { clear(false); appliedSegs.length = 0; sentSegs.length = 0; },

    /** Test aid: drive a full stroke from an array of backing-space points
     *  through the exact same live-render + batch/flush + onStroke pipeline
     *  real pointer input uses (so sentSegs and the rendered pixels are
     *  identical to a hand-drawn stroke). No-op unless interactive. */
    simulateStroke(points) {
      if (!interactive || !Array.isArray(points) || !points.length) return;
      const p0 = points[0];
      drawDot(color, size, p0);
      lastLocalPt = p0;
      pending = [p0];
      pendingNew = true;
      for (let i = 1; i < points.length; i++) {
        const p = points[i];
        if (lastLocalPt && p[0] === lastLocalPt[0] && p[1] === lastLocalPt[1]) continue;
        drawPair(color, size, lastLocalPt, p);
        lastLocalPt = p;
        pending.push(p);
        if (pending.length >= MAX_BATCH_PTS) flush();
      }
      flush();
      lastLocalPt = null;
    },

    /** Cheap content hash of the canvas pixels — for the sync test to assert
     *  the drawer's and a guesser's canvases match after replay. */
    canvasHash() {
      const img = ctx.getImageData(0, 0, DRAW_W, DRAW_H).data;
      // sample every 4th pixel's RGB with a rolling 32-bit hash (fast, plenty
      // sensitive for "are these two canvases the same drawing?")
      let h = 0x811c9dc5;
      for (let i = 0; i < img.length; i += 16) {
        h ^= img[i]; h = Math.imul(h, 0x01000193);
        h ^= img[i + 1]; h = Math.imul(h, 0x01000193);
        h ^= img[i + 2]; h = Math.imul(h, 0x01000193);
      }
      return (h >>> 0).toString(16);
    },
  };
}
