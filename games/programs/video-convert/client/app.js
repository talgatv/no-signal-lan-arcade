// Video Convert — 100% in-browser video toolkit.
// Engine: native <video> decode → <canvas> → captureStream → MediaRecorder.
// No uploads, no ffmpeg.wasm, no CDN. Files never leave the device.

import { encodeGIF } from './gif.js';
import { LANGS, LANG_LABELS, STRINGS, t, detectLang, rememberLang, applyStaticStrings } from './i18n.js';

let lang = detectLang();

// --- feature detection ------------------------------------------------------

const HAS_RECORDER = typeof window.MediaRecorder !== 'undefined';
const HAS_CAPTURE = !!HTMLCanvasElement.prototype.captureStream;
const HAS_AUDIO_CTX = !!(window.AudioContext || window.webkitAudioContext);

const VIDEO_MIMES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
  'video/x-matroska;codecs=vp9',
];
const AUDIO_MIMES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

// MP4 container + H.264(avc1)/AAC — the combo iPhones actually play in
// Photos/Messages/Mail. Probed explicitly (rather than reusing the generic
// 'video/mp4' check) so the "iPhone-compatible" preset only claims success
// when this exact codec pair is genuinely available via isTypeSupported().
const IPHONE_MP4_MIMES = [
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', // baseline, level 3.0
  'video/mp4;codecs="avc1.4D401E,mp4a.40.2"', // main, level 3.0
  'video/mp4;codecs="avc1.64001E,mp4a.40.2"', // high, level 3.0
  'video/mp4;codecs="avc1.640028,mp4a.40.2"', // high, level 4.0 (1080p headroom)
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',   // unquoted variant
  'video/mp4;codecs=avc1,mp4a.40.2',          // generic avc1, let the encoder pick a profile
];

function supportedMime(list) {
  if (!HAS_RECORDER) return null;
  for (const m of list) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {}
  }
  return null;
}

function extFor(mime) {
  if (!mime) return 'bin';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('matroska')) return 'mkv';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

// --- operation registry -----------------------------------------------------

const OPS = {
  convert: {
    label: 'Convert / Re-encode',
    kind: 'video',
    fields: [
      { id: 'format', label: 'Format', type: 'select', options: ['auto', 'webm', 'mp4'], help: 'Auto picks the best your browser supports.' },
      { id: 'resolution', label: 'Resolution', type: 'select', options: ['original', '1080p', '720p', '480p', '360p', '240p'] },
      { id: 'fps', label: 'Frame rate', type: 'select', options: ['original', '30', '24', '15'] },
      { id: 'bitrate', label: 'Quality', type: 'select', options: ['auto', 'high', 'medium', 'low'] },
      { id: 'mute', label: 'Remove audio track', type: 'check' },
    ],
    trim: true,
  },
  compress: {
    label: 'Compress',
    kind: 'video',
    fields: [
      { id: 'preset', label: 'Target', type: 'select', options: ['light', 'medium', 'strong', 'tiny'], help: 'Smaller targets = lower resolution + bitrate.' },
    ],
    trim: true,
  },
  trim: {
    label: 'Trim / Cut',
    kind: 'video',
    fields: [
      { id: 'format', label: 'Format', type: 'select', options: ['auto', 'webm', 'mp4'] },
    ],
    trim: true,
  },
  audio: {
    label: 'Extract audio',
    kind: 'audio',
    fields: [],
    trim: true,
  },
  gif: {
    label: 'Make GIF',
    kind: 'gif',
    fields: [
      { id: 'width', label: 'Width', type: 'select', options: ['480', '640', '320', '800', 'original'] },
      { id: 'fps', label: 'Frame rate', type: 'select', options: ['15', '10', '20', '8'] },
      { id: 'quality', label: 'Colors', type: 'select', options: ['256', '128', '64'] },
    ],
    trim: true,
  },
  frames: {
    label: 'Grab frames',
    kind: 'frames',
    fields: [
      { id: 'count', label: 'How many', type: 'select', options: ['6', '9', '12', '4', '16'] },
      { id: 'format', label: 'Format', type: 'select', options: ['png', 'jpeg'] },
      { id: 'width', label: 'Width', type: 'select', options: ['original', '1280', '960', '640'] },
    ],
    trim: false,
  },
  rotate: {
    label: 'Rotate / Flip',
    kind: 'video',
    fields: [
      { id: 'rotation', label: 'Rotate', type: 'select', options: ['0', '90', '180', '270'] },
      { id: 'flipH', label: 'Flip horizontal', type: 'check' },
      { id: 'flipV', label: 'Flip vertical', type: 'check' },
    ],
    trim: true,
  },
  speed: {
    label: 'Change speed',
    kind: 'video',
    fields: [
      { id: 'rate', label: 'Speed', type: 'select', options: ['2', '1.5', '0.5', '0.25', '3', '4'] },
    ],
    trim: true,
  },
};

const RES_H = { '1080p': 1080, '720p': 720, '480p': 480, '360p': 360, '240p': 240 };
const COMPRESS_PRESET = {
  light: { res: 1080, bps: 4_000_000 },
  medium: { res: 720, bps: 2_000_000 },
  strong: { res: 480, bps: 1_000_000 },
  tiny: { res: 360, bps: 500_000 },
};

// Option words worth translating (technical tokens like webm/mp4/png/720p
// and plain numbers are left as-is, same as file extensions in any language).
const OPT_LABEL_KEYS = new Set(['auto', 'original', 'high', 'medium', 'low', 'light', 'strong', 'tiny']);
function optionText(raw) {
  return OPT_LABEL_KEYS.has(raw) ? t(lang, 'opt_' + raw) : raw;
}

// --- state ------------------------------------------------------------------

const state = {
  file: null,
  url: null,
  duration: 0,
  vw: 0,
  vh: 0,
  videoMime: '',
  busy: false,
  lastResult: null,
};

// --- boot -------------------------------------------------------------------

const $ = (id) => document.getElementById(id);

function init() {
  applyStaticStrings(lang);
  buildLangSwitch();

  if (!HAS_RECORDER || !HAS_CAPTURE) {
    $('dropZone').insertAdjacentHTML(
      'beforeend',
      `<p class="warn" id="noRecorderWarn" data-i18n-html="noRecorderWarn">${t(lang, 'noRecorderWarn')}</p>`
    );
  }

  // file picking
  const fileInput = $('fileInput');
  $('pickBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) loadFile(e.target.files[0]);
  });
  $('dropZone').addEventListener('dragover', (e) => {
    e.preventDefault();
    $('dropZone').classList.add('drag');
  });
  $('dropZone').addEventListener('dragleave', () => $('dropZone').classList.remove('drag'));
  $('dropZone').addEventListener('drop', (e) => {
    e.preventDefault();
    $('dropZone').classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  });

  // operation selector
  const sel = $('opSelect');
  Object.keys(OPS).forEach((k) => {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = t(lang, 'op_' + k);
    sel.appendChild(o);
  });
  sel.addEventListener('change', renderOp);

  $('runBtn').addEventListener('click', run);
  $('resetBtn').addEventListener('click', reset);
  $('setStartBtn').addEventListener('click', () => setTrimFromPreview('start'));
  $('setEndBtn').addEventListener('click', () => setTrimFromPreview('end'));

  // preview scrubbing keeps trim inputs valid
  const v = $('srcVideo');
  v.addEventListener('loadedmetadata', () => {
    state.vw = v.videoWidth;
    state.vh = v.videoHeight;
    state.duration = isFinite(v.duration) ? v.duration : 0;
    renderMeta();
    renderOp();
  });

  renderOp();
}

// --- i18n: language switcher + re-render on change --------------------------

function buildLangSwitch() {
  const el = $('langSwitch');
  if (!el) return;
  el.innerHTML = '';
  for (const code of LANGS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-btn' + (code === lang ? ' is-on' : '');
    btn.textContent = LANG_LABELS[code];
    btn.setAttribute('aria-pressed', String(code === lang));
    btn.addEventListener('click', () => setLang(code));
    el.appendChild(btn);
  }
}

function relabelOpSelect() {
  const sel = $('opSelect');
  Array.from(sel.options).forEach((o) => { o.textContent = t(lang, 'op_' + o.value); });
}

function applyFieldValues(values) {
  Object.entries(values).forEach(([k, v]) => {
    const el = document.querySelector(`.ctrl[data-f="${k}"]`);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = v;
    else el.value = v;
  });
}

function relabelResult() {
  const r = state.lastResult;
  if (!r) return;
  const btn = document.querySelector('#resultArea .dl-all');
  if (!btn) return;
  btn.textContent = r.kind === 'frames'
    ? t(lang, 'downloadAllZip', { count: r.frames.length })
    : t(lang, 'downloadBtn');
}

function setLang(code) {
  if (!STRINGS[code] || code === lang) return;
  lang = code;
  rememberLang(lang);
  applyStaticStrings(lang);
  buildLangSwitch();
  relabelOpSelect();

  // #fields is entirely regenerated by renderOp(); capture + restore the
  // user's current values (and trim range) so a language switch doesn't
  // discard in-progress choices.
  const savedFields = readFields();
  const savedTrim = { start: $('trimStart').value, end: $('trimEnd').value };
  renderOp();
  applyFieldValues(savedFields);
  $('trimStart').value = savedTrim.start;
  $('trimEnd').value = savedTrim.end;
  updateTrimReadout();

  relabelResult();
}

// --- file loading -----------------------------------------------------------

function loadFile(file) {
  if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|mkv|avi|m4v|ogv|3gp)$/i.test(file.name)) {
    toast(t(lang, 'toastPickVideo'), true);
    return;
  }
  resetResult();
  if (state.url) URL.revokeObjectURL(state.url);
  state.file = file;
  state.url = URL.createObjectURL(file);
  state.videoMime = file.type || '';
  const v = $('srcVideo');
  v.src = state.url;
  $('dropZone').hidden = true;
  $('editor').hidden = false;
  $('fileName').textContent = file.name;
  $('runBtn').disabled = false;
}

function renderMeta() {
  const f = state.file;
  if (!f) return;
  $('meta').hidden = false;
  $('metaSize').textContent = formatBytes(f.size);
  $('metaDim').textContent = state.vw ? `${state.vw}×${state.vh}` : '…';
  $('metaDur').textContent = state.duration ? formatTime(state.duration) : '…';
  $('metaType').textContent = state.videoMime || pathExt(f.name);
}

function pathExt(name) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toUpperCase() : '';
}

// --- operation options ------------------------------------------------------

function renderOp() {
  const key = $('opSelect').value;
  const op = OPS[key];
  const box = $('fields');
  box.innerHTML = '';

  // unsupported-feature notes
  if ((op.kind === 'video' || op.kind === 'audio') && (!HAS_RECORDER || !HAS_CAPTURE)) {
    box.appendChild(note(t(lang, 'noteReencodeNeeds'), true));
  }

  op.fields.forEach((fld) => {
    const row = document.createElement('label');
    row.className = 'field';
    let inner = `<span class="field-label">${t(lang, 'fld_' + fld.id)}</span>`;
    if (fld.type === 'select') {
      const opts = fld.options
        .map((o) => `<option value="${o}">${optionText(o)}</option>`)
        .join('');
      inner += `<select class="ctrl" data-f="${fld.id}">${opts}</select>`;
    } else if (fld.type === 'check') {
      inner += `<input class="ctrl chk" type="checkbox" data-f="${fld.id}" />`;
    }
    row.innerHTML = inner;
    box.appendChild(row);
    if (fld.help) {
      const h = document.createElement('p');
      h.className = 'field-help';
      h.textContent = t(lang, 'help_' + fld.id);
      box.appendChild(h);
    }
  });

  // defaults
  if (key === 'compress') setField('preset', 'medium');
  if (key === 'convert') setField('bitrate', 'auto');
  if (key === 'gif') setField('fps', '15');
  if (key === 'frames') setField('count', '9');

  // one-tap "iPhone-compatible" preset, additive on top of Convert's fields
  if (key === 'convert') box.appendChild(buildIphonePreset());

  // trim section visibility
  $('trimSection').hidden = !op.trim;
  if (op.trim) initTrimDefaults();
}

// --- iPhone-compatible one-tap preset ---------------------------------------

function buildIphonePreset() {
  const wrap = document.createElement('div');
  wrap.className = 'iphone-preset';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'iphonePresetBtn';
  btn.className = 'ogh-btn iphone-btn';
  btn.textContent = t(lang, 'iphonePresetBtn');
  btn.disabled = state.busy;
  btn.addEventListener('click', runIphonePreset);
  wrap.appendChild(btn);

  wrap.appendChild(note(t(lang, 'iphonePresetHelp'), false));

  const msg = document.createElement('p');
  msg.id = 'iphoneMsg';
  msg.className = 'warn iphone-fallback';
  msg.hidden = true;
  wrap.appendChild(msg);

  return wrap;
}

async function runIphonePreset() {
  if (state.busy || !state.file) return;

  const msgEl = $('iphoneMsg');
  if (!HAS_RECORDER || !HAS_CAPTURE) {
    if (msgEl) { msgEl.hidden = false; msgEl.textContent = t(lang, 'recorderUnsupportedToast'); }
    toast(t(lang, 'recorderUnsupportedToast'), true);
    return;
  }

  const mime = supportedMime(IPHONE_MP4_MIMES);
  if (!mime) {
    if (msgEl) { msgEl.hidden = false; msgEl.textContent = t(lang, 'iphoneUnsupported'); }
    toast(t(lang, 'iphoneUnsupported'), true);
    return;
  }
  if (msgEl) msgEl.hidden = true;

  // Auto-select container=mp4 + a sane resolution cap (max 1080p); leave
  // the rest of the Convert tool's current params (fps, bitrate, mute) as-is —
  // this is a preset layered on top of the existing pipeline, not a new one.
  setField('format', 'mp4');
  setField('resolution', '1080p');

  const fields = readFields();
  const trim = readTrim();
  resetResult();
  setBusy(true);
  setProgress(0, t(lang, 'progressStarting'));
  try {
    const result = await reencode({ ...fields, trim, opKey: 'convert', forceMime: mime });
    showResult(result);
    setProgress(1, t(lang, 'progressDone'));
    toast(t(lang, 'iphonePresetDone'));
  } catch (err) {
    console.error(err);
    setProgress(0, t(lang, 'progressError'));
    toast((err && err.message) || t(lang, 'toastConvertFailed'), true);
  } finally {
    setBusy(false);
  }
}

function note(text, warn) {
  const p = document.createElement('p');
  p.className = warn ? 'warn' : 'field-help';
  p.textContent = text;
  return p;
}

function setField(id, val) {
  const el = document.querySelector(`.ctrl[data-f="${id}"]`);
  if (el) el.value = val;
}

function readFields() {
  const out = {};
  document.querySelectorAll('.ctrl').forEach((el) => {
    const k = el.dataset.f;
    if (el.type === 'checkbox') out[k] = el.checked;
    else out[k] = el.value;
  });
  return out;
}

// --- trim helpers -----------------------------------------------------------

function initTrimDefaults() {
  $('trimStart').value = 0;
  $('trimEnd').value = (state.duration || 0).toFixed(2);
  updateTrimReadout();
}

function readTrim() {
  let s = parseFloat($('trimStart').value) || 0;
  let e = parseFloat($('trimEnd').value) || state.duration || 0;
  if (s < 0) s = 0;
  if (e > state.duration) e = state.duration;
  if (e <= s) e = Math.min(state.duration, s + 0.1);
  return { start: s, end: e };
}

function updateTrimReadout() {
  const { start, end } = readTrim();
  $('trimReadout').textContent = `${formatTime(start)} → ${formatTime(end)} (${formatTime(end - start)})`;
}

function setTrimFromPreview(which) {
  const v = $('srcVideo');
  if (!isFinite(v.currentTime)) return;
  const cur = v.currentTime;
  if (which === 'start') $('trimStart').value = cur.toFixed(2);
  else $('trimEnd').value = cur.toFixed(2);
  updateTrimReadout();
}

// --- run dispatcher ---------------------------------------------------------

async function run() {
  if (state.busy || !state.file) return;
  const key = $('opSelect').value;
  const op = OPS[key];
  const fields = readFields();
  const trim = op.trim ? readTrim() : null;
  resetResult();
  setBusy(true);
  setProgress(0, t(lang, 'progressStarting'));
  try {
    let result;
    if (op.kind === 'video') {
      result = await reencode({ ...fields, trim, opKey: key });
    } else if (op.kind === 'audio') {
      result = await reencodeAudio({ trim });
    } else if (op.kind === 'gif') {
      result = await makeGif({ ...fields, trim });
    } else if (op.kind === 'frames') {
      result = await extractFrames(fields);
    }
    showResult(result);
    setProgress(1, t(lang, 'progressDone'));
  } catch (err) {
    console.error(err);
    setProgress(0, t(lang, 'progressError'));
    toast((err && err.message) || t(lang, 'toastConvertFailed'), true);
  } finally {
    setBusy(false);
  }
}

// --- VIDEO re-encode pipeline ----------------------------------------------

async function reencode(opts) {
  const { trim } = opts;
  const v = await loadVideoMeta(state.url);
  const srcW = v.videoWidth, srcH = v.videoHeight;

  // figure out output dimensions + transforms
  let scale = 1;
  if (opts.opKey === 'convert') scale = scaleForResolution(opts.resolution, srcH);
  if (opts.opKey === 'compress') {
    const p = COMPRESS_PRESET[opts.preset] || COMPRESS_PRESET.medium;
    scale = Math.min(1, p.res / Math.max(srcW, srcH));
  }
  if (opts.opKey === 'trim') scale = 1;
  if (opts.opKey === 'speed' || opts.opKey === 'audio') scale = 1;

  let rotation = 0;
  let flipH = false, flipV = false;
  if (opts.opKey === 'rotate') {
    rotation = parseInt(opts.rotation || '0', 10);
    flipH = !!opts.flipH;
    flipV = !!opts.flipV;
  }

  const baseW = Math.max(2, Math.round(srcW * scale));
  const baseH = Math.max(2, Math.round(srcH * scale));
  const swap = rotation === 90 || rotation === 270;
  const outW = swap ? baseH : baseW;
  const outH = swap ? baseW : baseH;

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { alpha: false });

  let fps = 30;
  if (opts.opKey === 'convert') fps = opts.fps === 'original' ? 30 : parseInt(opts.fps, 10);
  if (opts.opKey === 'compress') fps = 30;
  if (opts.opKey === 'speed') fps = 30;

  const stream = canvas.captureStream(fps);

  // audio routing
  let audioCtx = null;
  const wantAudio = !(opts.opKey === 'convert' && opts.mute);
  if (wantAudio && HAS_AUDIO_CTX) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
      await audioCtx.resume();
      const srcNode = audioCtx.createMediaElementSource(v);
      const dest = audioCtx.createMediaStreamDestination();
      srcNode.connect(dest);
      dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
    } catch (e) {
      // element already has a source node, or no audio track — continue muted
      console.warn('audio routing skipped:', e);
    }
  }

  // pick mime
  let mime;
  if (opts.forceMime) mime = opts.forceMime;
  else if (opts.opKey === 'compress') mime = supportedMime(VIDEO_MIMES);
  else mime = pickVideoMime(opts.format);

  const recOpts = {};
  if (mime) recOpts.mimeType = mime;
  if (opts.opKey === 'compress') {
    recOpts.videoBitsPerSecond = (COMPRESS_PRESET[opts.preset] || COMPRESS_PRESET.medium).bps;
  } else if (opts.opKey === 'convert' && opts.bitrate !== 'auto') {
    recOpts.videoBitsPerSecond = bpsForQuality(opts.bitrate, outW * outH, fps);
  }

  const rec = new MediaRecorder(stream, recOpts);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise((res) => { rec.onstop = res; });

  // seek to start
  const start = trim ? trim.start : 0;
  const end = trim ? trim.end : v.duration;
  if (start > 0) {
    v.currentTime = start;
    await once(v, 'seeked');
  }
  if (opts.opKey === 'speed') v.playbackRate = parseFloat(opts.rate) || 1;
  v.muted = true; // keep element silent (audio travels through WebAudio graph if routed)

  rec.start(100);
  await v.play();

  await drawLoop(v, ctx, canvas, baseW, baseH, rotation, flipH, flipV, start, end, (p) => setProgress(p, t(lang, 'progressEncoding')));

  v.pause();
  if (rec.state !== 'inactive') rec.stop();
  await stopped;
  try { stream.getTracks().forEach((track) => track.stop()); } catch (e) {}
  if (audioCtx) { try { await audioCtx.close(); } catch (e) {} }

  const finalMime = mime || 'video/webm';
  const blob = new Blob(chunks, { type: finalMime });
  const suffix = suffixForOp(opts.opKey);
  const name = outName(state.file.name, suffix, extFor(finalMime));
  return { blob, name, mime: finalMime, kind: 'video' };
}

function drawLoop(v, ctx, canvas, baseW, baseH, rotation, flipH, flipV, start, end, onProgress) {
  return new Promise((resolve) => {
    const rad = (rotation * Math.PI) / 180;
    let raf = 0;
    const step = () => {
      const now = v.currentTime;
      if (now >= end - 0.001 || v.ended) {
        cancelAnimationFrame(raf);
        onProgress(1);
        resolve();
        return;
      }
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      if (rotation) ctx.rotate(rad);
      if (flipH) ctx.scale(-1, 1);
      if (flipV) ctx.scale(1, -1);
      ctx.drawImage(v, -baseW / 2, -baseH / 2, baseW, baseH);
      ctx.restore();
      const span = end - start;
      onProgress(span > 0 ? (now - start) / span : 0);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  });
}

// --- AUDIO only -------------------------------------------------------------

async function reencodeAudio({ trim }) {
  if (!HAS_RECORDER || !HAS_AUDIO_CTX) throw new Error('Audio extraction needs AudioContext + MediaRecorder.');
  const v = await loadVideoMeta(state.url);
  const AC = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AC();
  await audioCtx.resume();
  const srcNode = audioCtx.createMediaElementSource(v);
  const dest = audioCtx.createMediaStreamDestination();
  srcNode.connect(dest);

  const mime = supportedMime(AUDIO_MIMES);
  const rec = new MediaRecorder(dest.stream, mime ? { mimeType: mime } : {});
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise((res) => { rec.onstop = res; });

  const start = trim ? trim.start : 0;
  const end = trim ? trim.end : v.duration;
  if (start > 0) { v.currentTime = start; await once(v, 'seeked'); }
  v.muted = false;

  rec.start(100);
  await v.play();
  await waitUntil(v, end);
  v.pause();
  if (rec.state !== 'inactive') rec.stop();
  await stopped;
  try { await audioCtx.close(); } catch (e) {}

  const finalMime = mime || 'audio/webm';
  const blob = new Blob(chunks, { type: finalMime });
  return { blob, name: outName(state.file.name, 'audio', extFor(finalMime)), mime: finalMime, kind: 'audio' };
}

function waitUntil(v, end) {
  return new Promise((res) => {
    const tick = () => {
      if (v.currentTime >= end - 0.02 || v.ended) { res(); return; }
      setTimeout(tick, 50);
    };
    tick();
  });
}

// --- FRAMES (seek-based) ----------------------------------------------------

async function extractFrames(fields) {
  const v = await loadVideoMeta(state.url);
  const count = parseInt(fields.count, '12');
  const fmt = fields.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const mime = fmt;
  const wOpt = fields.width;
  const srcW = v.videoWidth, srcH = v.videoHeight;
  let scale = 1;
  if (wOpt !== 'original') scale = Math.min(1, parseInt(wOpt, 10) / srcW);
  const cw = Math.max(2, Math.round(srcW * scale));
  const ch = Math.max(2, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d', { alpha: false });

  const dur = v.duration;
  const frames = [];
  for (let i = 0; i < count; i++) {
    const tPos = count === 1 ? 0 : (i / count) * dur;
    v.currentTime = Math.min(tPos, dur - 0.05);
    await once(v, 'seeked');
    ctx.drawImage(v, 0, 0, cw, ch);
    const blob = await canvasBlob(canvas, mime, 0.9);
    const fext = fmt === 'image/jpeg' ? 'jpg' : 'png';
    frames.push({ name: frameName(state.file.name, i, count, fext), blob });
    setProgress((i + 1) / count, t(lang, 'progressFrame', { i: i + 1, count }));
  }
  return { frames, kind: 'frames', defaultName: outName(state.file.name, 'frames', 'zip') };
}

// --- GIF --------------------------------------------------------------------

async function makeGif(opts) {
  const v = await loadVideoMeta(state.url);
  const srcW = v.videoWidth, srcH = v.videoHeight;
  const widthOpt = opts.width;
  let gw = widthOpt === 'original' ? srcW : parseInt(widthOpt, 10);
  gw = Math.min(gw, 960);
  const scale = gw / srcW;
  const gh = Math.round(srcH * scale);
  const fps = parseInt(opts.fps, 10) || 10;
  const maxColors = parseInt(opts.quality, 10) || 256;
  const delay = Math.round(1000 / fps);

  const start = opts.trim ? opts.trim.start : 0;
  const end = opts.trim ? opts.trim.end : v.duration;
  const span = Math.max(0.1, end - start);
  const frameCount = Math.min(400, Math.max(2, Math.round(span * fps)));

  const canvas = document.createElement('canvas');
  canvas.width = gw; canvas.height = gh;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, gw, gh);

  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    const tPos = start + (i / frameCount) * span;
    v.currentTime = Math.min(tPos, end - 0.02);
    await once(v, 'seeked');
    ctx.drawImage(v, 0, 0, gw, gh);
    frames.push({ width: gw, height: gh, data: ctx.getImageData(0, 0, gw, gh).data, delay });
    setProgress((i / frameCount) * 0.8, t(lang, 'progressSampling', { i: i + 1, count: frameCount }));
  }

  const blob = await encodeGIF(frames, {
    maxColors,
    dither: true,
    loop: 0,
    onProgress: (p) => setProgress(0.8 + p * 0.2, t(lang, 'progressEncodingGif')),
  });
  return { blob, name: outName(state.file.name, 'anim', 'gif'), mime: 'image/gif', kind: 'image' };
}

// --- helpers: video element, naming, format helpers ------------------------

const _metaCache = new Map();
async function loadVideoMeta(url) {
  if (_metaCache.has(url)) return _metaCache.get(url);
  const v = $('srcVideo');
  if (v.src !== url) v.src = url;
  if (v.readyState < 1) await once(v, 'loadedmetadata');
  _metaCache.set(url, v);
  return v;
}

function once(el, ev) {
  return new Promise((res, rej) => {
    const ok = () => { el.removeEventListener(ev, ok); el.removeEventListener('error', bad); res(); };
    const bad = () => { el.removeEventListener(ev, ok); el.removeEventListener('error', bad); rej(new Error('media error')); };
    el.addEventListener(ev, ok);
    el.addEventListener('error', bad);
  });
}

function pickVideoMime(formatPref) {
  if (formatPref === 'mp4') {
    return supportedMime(['video/mp4']) || supportedMime(VIDEO_MIMES);
  }
  if (formatPref === 'webm') {
    return supportedMime(['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']);
  }
  return supportedMime(VIDEO_MIMES);
}

function scaleForResolution(res, srcH) {
  if (res === 'original' || !RES_H[res]) return 1;
  const target = RES_H[res];
  if (srcH <= target) return 1;
  return target / srcH;
}

function bpsForQuality(q, pixels, fps) {
  const pxPerSec = pixels * fps;
  const k = q === 'high' ? 0.12 : q === 'medium' ? 0.07 : 0.04;
  return Math.max(150_000, Math.round(pxPerSec * k));
}

function canvasBlob(canvas, mime, quality) {
  return new Promise((res) => canvas.toBlob(res, mime, quality));
}

function suffixForOp(key) {
  return ({ convert: 'convert', compress: 'compress', trim: 'trim', rotate: 'rotate', speed: 'speed' })[key] || 'out';
}

function baseName(name) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

function outName(orig, suffix, ext) {
  return `${baseName(orig)}-${suffix}.${ext}`;
}

function frameName(orig, i, count, ext) {
  const pad = String(count).length;
  return `${baseName(orig)}-frame-${String(i + 1).padStart(pad, '0')}.${ext}`;
}

// --- result UI --------------------------------------------------------------

function resetResult() {
  $('result').hidden = true;
  $('resultArea').innerHTML = '';
  state.lastResult = null;
}

function showResult(r) {
  state.lastResult = r;
  $('result').hidden = false;
  const area = $('resultArea');
  area.innerHTML = '';

  if (r.kind === 'frames') {
    const grid = document.createElement('div');
    grid.className = 'thumb-grid';
    r.frames.forEach((f) => {
      const url = URL.createObjectURL(f.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      const img = document.createElement('img');
      img.src = url;
      a.appendChild(img);
      grid.appendChild(a);
    });
    area.appendChild(grid);
    const dlAll = document.createElement('button');
    dlAll.className = 'ogh-btn dl-all';
    dlAll.textContent = t(lang, 'downloadAllZip', { count: r.frames.length });
    dlAll.addEventListener('click', () => {
      zipAndDownload(r.frames, r.defaultName);
    });
    area.appendChild(dlAll);
    return;
  }

  const url = URL.createObjectURL(r.blob);
  if (r.kind === 'video') {
    const vid = document.createElement('video');
    vid.src = url;
    vid.controls = true;
    vid.className = 'result-media';
    area.appendChild(vid);
  } else if (r.kind === 'audio') {
    const aud = document.createElement('audio');
    aud.src = url;
    aud.controls = true;
    area.appendChild(aud);
  } else {
    const img = document.createElement('img');
    img.src = url;
    img.className = 'result-media';
    area.appendChild(img);
  }

  const info = document.createElement('p');
  info.className = 'result-info';
  info.textContent = `${r.name} · ${formatBytes(r.blob.size)}`;
  area.appendChild(info);

  const dl = document.createElement('button');
  dl.className = 'ogh-btn dl-all';
  dl.textContent = t(lang, 'downloadBtn');
  dl.addEventListener('click', () => downloadBlob(r.blob, r.name));
  area.appendChild(dl);
}

async function zipAndDownload(frames, name) {
  setBusy(true);
  setProgress(0, t(lang, 'progressZipping'));
  try {
    const files = await Promise.all(
      frames.map(async (f) => ({ name: f.name, data: new Uint8Array(await f.blob.arrayBuffer()) }))
    );
    const zip = zipStore(files);
    downloadBlob(zip, name);
    setProgress(1, t(lang, 'progressDone'));
  } catch (e) {
    toast(t(lang, 'toastZipFailed'), true);
    frames.forEach((f, i) => setTimeout(() => downloadBlob(f.blob, f.name), i * 250));
  } finally {
    setBusy(false);
  }
}

function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// --- busy / progress / toast -----------------------------------------------

function setBusy(b) {
  state.busy = b;
  $('runBtn').disabled = b;
  $('opSelect').disabled = b;
  const ipBtn = $('iphonePresetBtn');
  if (ipBtn) ipBtn.disabled = b;
  document.body.classList.toggle('busy', b);
}

function setProgress(p, label) {
  const pct = Math.round(Math.max(0, Math.min(1, p)) * 100);
  $('progress').hidden = false;
  $('progressBar').style.width = pct + '%';
  $('progressLabel').textContent = label || (pct + '%');
  if (p >= 1) {
    $('progressBar').style.background = 'linear-gradient(90deg,#5cffb0,#5ce1ff)';
  } else {
    $('progressBar').style.background = '';
  }
}

let toastTimer = null;
function toast(msg, isError) {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = 'toast'), 3500);
}

// --- reset ------------------------------------------------------------------

function reset() {
  if (state.url) URL.revokeObjectURL(state.url);
  _metaCache.clear();
  state.file = null;
  state.url = null;
  state.duration = 0;
  state.vw = 0;
  state.vh = 0;
  const v = $('srcVideo');
  v.removeAttribute('src');
  v.load();
  $('fileInput').value = '';
  $('editor').hidden = true;
  $('dropZone').hidden = false;
  $('meta').hidden = true;
  resetResult();
  $('progress').hidden = true;
  $('runBtn').disabled = true;
}

// --- formatters -------------------------------------------------------------

function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function formatTime(s) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(s < 10 ? 2 : 0);
  return `${m}:${sec.padStart(s < 10 ? 5 : 2, '0')}`;
}

// --- minimal ZIP (store mode, no compression) + CRC32 ----------------------

function crc32(bytes) {
  let c = ~0;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function zipStore(files) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = new TextEncoder().encode(f.name);
    const crc = crc32(f.data);
    const size = f.data.length;
    const local = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true); // version
    dv.setUint16(6, 0, true);
    dv.setUint16(8, 0, true); // method 0 = store
    dv.setUint16(10, 0, true);
    dv.setUint16(12, 0, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, size, true);
    dv.setUint32(22, size, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    chunks.push(local, f.data);

    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);
    central.push(cd);

    offset += local.length + f.data.length;
  }

  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const cdOffset = offset;
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...chunks, ...central, end], { type: 'application/zip' });
}

// --- go ---------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', init);
