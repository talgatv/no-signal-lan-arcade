// Compact animated GIF encoder — no dependencies.
// Pipeline: median-cut color quantization + Floyd–Steinberg dithering + LZW.
//
//   encodeGIF(frames, opts) -> Promise<Blob>
//
// frames: [{ width, height, data: Uint8ClampedArray|Uint8Array (RGBA), delay: ms }]
// opts:   { maxColors?: 256, dither?: true, loop?: 0(infinite), onProgress?: fn }

export function encodeGIF(frames, opts = {}) {
  const maxColors = Math.min(256, opts.maxColors || 256);
  const dither = opts.dither !== false;
  const loop = opts.loop == null ? 0 : opts.loop; // 0 = infinite

  // 1) Gather color samples across all frames (strided for speed).
  const samples = [];
  for (const f of frames) {
    const d = f.data, n = d.length, step = Math.max(4, Math.floor(n / 40000) & ~3);
    for (let i = 0; i < n; i += step) {
      if (d[i + 3] < 128) continue; // skip transparent-ish
      samples.push(d[i], d[i + 1], d[i + 2]);
    }
  }
  const palette = buildPalette(samples, maxColors);
  const nColors = palette.length / 3;
  const minCodeSize = nColors <= 2 ? 2 : Math.max(2, Math.ceil(Math.log2(nColors)));
  const lookup = buildLookup(palette, nColors);

  // 2) GIF stream assembly.
  const out = new ByteWriter();
  out.ascii('GIF89a');
  const w = frames[0].width, h = frames[0].height;
  out.u16(w);
  out.u16(h);
  out.byte(0b10000000 | ((minCodeSize - 1) << 4) | (minCodeSize - 1)); // global table flag + size
  out.byte(0); // background index
  out.byte(0); // aspect
  writeColorTable(out, palette, nColors, minCodeSize);

  // NETSCAPE looping extension
  out.byte(0x21); out.byte(0xff);
  out.byte(0x0b); out.ascii('NETSCAPE2.0');
  out.byte(0x03); out.byte(0x01); out.u16(loop); out.byte(0x00);

  // 3) Frames
  for (let fi = 0; fi < frames.length; fi++) {
    const f = frames[fi];
    const indices = mapToPalette(f.data, f.width, f.height, lookup, palette, dither);

    const delay = Math.max(2, Math.round((f.delay || 100) / 10)); // centiseconds
    out.byte(0x21); out.byte(0xf9); out.byte(0x04);
    out.byte(0x00); out.u16(delay); out.byte(0x00); out.byte(0x00);

    out.byte(0x2c);
    out.u16(0); out.u16(0);
    out.u16(f.width); out.u16(f.height);
    out.byte(0x00);

    const lzw = lzwEncode(indices, minCodeSize);
    out.byte(minCodeSize);
    writeSubBlocks(out, lzw);
    out.byte(0x00);

    if (opts.onProgress) opts.onProgress((fi + 1) / frames.length);
  }

  out.byte(0x3b); // trailer
  return new Blob([out.finish()], { type: 'image/gif' });
}

// --- median cut quantization -------------------------------------------------

function buildPalette(samples, maxColors) {
  const n = (samples.length / 3) | 0;
  if (n === 0) {
    const p = new Uint8Array(4 * 3);
    for (let i = 0; i < 4; i++) p[i * 3] = p[i * 3 + 1] = p[i * 3 + 2] = i * 85;
    return p;
  }
  const boxes = [makeBox(samples, rangeArr(n))];
  while (boxes.length < maxColors) {
    let bi = -1, best = 1;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.idx.length < 2) continue;
      const m = Math.max(b.maxr - b.minr, b.maxg - b.ming, b.maxb - b.minb);
      if (m > best) { best = m; bi = i; }
    }
    if (bi < 0) break;
    const [a, c] = splitBox(samples, boxes[bi]);
    boxes.splice(bi, 1, a, c);
  }
  const pal = new Uint8Array(boxes.length * 3);
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i], cnt = b.idx.length;
    let sr = 0, sg = 0, sb = 0;
    for (let j = 0; j < cnt; j++) {
      const o = b.idx[j] * 3;
      sr += samples[o]; sg += samples[o + 1]; sb += samples[o + 2];
    }
    pal[i * 3] = Math.round(sr / cnt);
    pal[i * 3 + 1] = Math.round(sg / cnt);
    pal[i * 3 + 2] = Math.round(sb / cnt);
  }
  return pal;
}

function makeBox(samples, idx) {
  let minr = 255, ming = 255, minb = 255, maxr = 0, maxg = 0, maxb = 0;
  for (let i = 0; i < idx.length; i++) {
    const o = idx[i] * 3;
    const r = samples[o], g = samples[o + 1], b = samples[o + 2];
    if (r < minr) minr = r; if (r > maxr) maxr = r;
    if (g < ming) ming = g; if (g > maxg) maxg = g;
    if (b < minb) minb = b; if (b > maxb) maxb = b;
  }
  return { idx, minr, ming, minb, maxr, maxg, maxb };
}

function splitBox(samples, box) {
  const r = box.maxr - box.minr, g = box.maxg - box.ming, b = box.maxb - box.minb;
  const chan = r >= g && r >= b ? 0 : (g >= b ? 1 : 2);
  const idx = box.idx.slice().sort((p, q) => samples[p * 3 + chan] - samples[q * 3 + chan]);
  const mid = idx.length >> 1;
  return [makeBox(samples, idx.slice(0, mid)), makeBox(samples, idx.slice(mid))];
}

function rangeArr(n) {
  const a = new Array(n);
  for (let i = 0; i < n; i++) a[i] = i;
  return a;
}

// --- nearest-palette cache (5 bits/channel → 32768 LUT entries) -------------

function buildLookup(palette, nColors) {
  const lut = new Uint8Array(32768);
  for (let key = 0; key < 32768; key++) {
    const R = ((key >> 10) & 31) * 255 / 31;
    const G = ((key >> 5) & 31) * 255 / 31;
    const B = (key & 31) * 255 / 31;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < nColors; i++) {
      const dr = R - palette[i * 3], dg = G - palette[i * 3 + 1], db = B - palette[i * 3 + 2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) { bestD = d; best = i; }
    }
    lut[key] = best;
  }
  return (r, g, b) => lut[(((r >> 3) & 31) << 10) | (((g >> 3) & 31) << 5) | ((b >> 3) & 31)];
}

// --- Floyd–Steinberg dithering to palette -----------------------------------

function mapToPalette(rgba, w, h, lookup, palette, dither) {
  const out = new Uint8Array(w * h);
  if (!dither) {
    for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
      out[p] = rgba[i + 3] < 128 ? 0 : lookup(rgba[i], rgba[i + 1], rgba[i + 2]);
    }
    return out;
  }
  const buf = new Float32Array(w * h * 3);
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    buf[p * 3] = rgba[i];
    buf[p * 3 + 1] = rgba[i + 1];
    buf[p * 3 + 2] = rgba[i + 2];
  }
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const r = clamp(buf[p * 3]), g = clamp(buf[p * 3 + 1]), b = clamp(buf[p * 3 + 2]);
      const idx = lookup(r, g, b);
      out[p] = idx;
      const er = r - palette[idx * 3];
      const eg = g - palette[idx * 3 + 1];
      const eb = b - palette[idx * 3 + 2];
      diff(buf, w, h, x + 1, y, er, eg, eb, 7 / 16);
      diff(buf, w, h, x - 1, y + 1, er, eg, eb, 3 / 16);
      diff(buf, w, h, x, y + 1, er, eg, eb, 5 / 16);
      diff(buf, w, h, x + 1, y + 1, er, eg, eb, 1 / 16);
    }
  }
  return out;
}

function diff(buf, w, h, x, y, er, eg, eb, f) {
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const i = (y * w + x) * 3;
  buf[i] += er * f;
  buf[i + 1] += eg * f;
  buf[i + 2] += eb * f;
}

// --- LZW (GIF, LSB-first bit packing) ---------------------------------------

function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  const out = [];
  let cur = 0, bits = 0;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  let dict = new Map();

  const flush = (code) => {
    cur |= code << bits;
    bits += codeSize;
    while (bits >= 8) { out.push(cur & 0xff); cur >>>= 8; bits -= 8; }
  };
  const resetDict = () => {
    dict = new Map();
    for (let i = 0; i < clearCode; i++) dict.set(String.fromCharCode(i), i);
    codeSize = minCodeSize + 1;
    nextCode = eoiCode + 1;
  };

  resetDict();
  flush(clearCode);

  let w = '';
  for (let i = 0; i < indices.length; i++) {
    const ch = String.fromCharCode(indices[i]);
    const wc = w + ch;
    if (dict.has(wc)) {
      w = wc;
    } else {
      flush(dict.get(w));
      if (nextCode <= 4095) {
        dict.set(wc, nextCode);
        nextCode++;
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        flush(clearCode);
        resetDict();
      }
      w = ch;
    }
  }
  if (w !== '') flush(dict.get(w));
  flush(eoiCode);
  if (bits > 0) out.push(cur & 0xff);
  return new Uint8Array(out);
}

// --- byte writer helpers ----------------------------------------------------

class ByteWriter {
  constructor() { this.chunks = []; this.len = 0; }
  ascii(s) { for (let i = 0; i < s.length; i++) { this.chunks.push(s.charCodeAt(i) & 0xff); } this.len += s.length; }
  byte(v) { this.chunks.push(v & 0xff); this.len++; }
  u16(v) { this.chunks.push(v & 0xff, (v >> 8) & 0xff); this.len += 2; }
  bytes(arr) { for (let i = 0; i < arr.length; i++) this.chunks.push(arr[i]); this.len += arr.length; }
  finish() { const u = new Uint8Array(this.len); let o = 0; for (const c of this.chunks) u[o++] = c; return u; }
}

function writeColorTable(out, palette, nColors, minCodeSize) {
  const size = 1 << minCodeSize;
  const fill = new Uint8Array(size * 3);
  fill.set(palette.subarray(0, nColors * 3));
  out.bytes(fill);
}

function writeSubBlocks(out, data) {
  for (let i = 0; i < data.length; i += 255) {
    const len = Math.min(255, data.length - i);
    out.byte(len);
    out.bytes(data.subarray(i, i + len));
  }
}
