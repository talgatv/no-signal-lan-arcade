// Media Player — 100% in-browser playlist player for local video/audio files.
// Engine: a single persistent <video> element plays both video and
// audio-only files (it happily decodes audio-only sources, it just shows no
// frame). Files are referenced via URL.createObjectURL() and never leave
// the device — no uploads, no server involvement beyond serving this page.

import { LANGS, LANG_LABELS, STRINGS, t, detectLang, rememberLang, applyStaticStrings } from './i18n.js';

let lang = detectLang();

const $ = (id) => document.getElementById(id);
const mediaEl = $('mediaEl');

// Detached element used only to query canPlayType() as a quick heuristic —
// never loaded with real media. The authoritative "can this actually play"
// signal is mediaEl's own 'error' event once we try to load a file for real
// (a MIME type alone can't tell you if e.g. an MKV's audio codec is decodable).
const probeEl = document.createElement('video');

const RATES = ['0.5', '0.75', '1', '1.25', '1.5', '2'];

const ERROR_KEY_BY_CODE = {
  1: 'err_aborted',            // MEDIA_ERR_ABORTED
  2: 'err_network',            // MEDIA_ERR_NETWORK
  3: 'err_decode',             // MEDIA_ERR_DECODE
  4: 'err_unsupported',        // MEDIA_ERR_SRC_NOT_SUPPORTED
};

// --- state -------------------------------------------------------------

const state = {
  playlist: [],       // { id, file, url, name, size, kind, duration, subtitleUrl, subtitleName, error, probeWarn }
  currentIndex: -1,
  loop: false,
  volume: 1,
  muted: false,
  rate: 1,
  seeking: false,
  pendingSubtitleIndex: -1,
  audioCtx: null,
  analyser: null,
  audioGraphReady: false,
  vizRAF: 0,
};

let idCounter = 1;
let vizCtx2d = null;

// --- boot ----------------------------------------------------------------

function init() {
  applyStaticStrings(lang);
  buildLangSwitch();
  buildRateSelect();

  const fileInput = $('fileInput');
  $('pickBtn').addEventListener('click', () => fileInput.click());
  $('addMoreBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  });

  $('subtitleInput').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (file && state.pendingSubtitleIndex !== -1) {
      attachSubtitle(state.pendingSubtitleIndex, file);
      state.pendingSubtitleIndex = -1;
    }
  });

  wireDragAndDrop();

  // media element events
  mediaEl.addEventListener('loadedmetadata', onLoadedMetadata);
  mediaEl.addEventListener('timeupdate', onTimeUpdate);
  mediaEl.addEventListener('progress', paintSeekBar);
  mediaEl.addEventListener('ended', onEnded);
  mediaEl.addEventListener('error', onErrorEvent);
  mediaEl.addEventListener('play', updatePlayIcon);
  mediaEl.addEventListener('pause', updatePlayIcon);
  mediaEl.addEventListener('volumechange', updateVolumeUI);
  mediaEl.addEventListener('ratechange', () => {
    state.rate = mediaEl.playbackRate;
    $('rateSelect').value = String(mediaEl.playbackRate);
  });

  // controls
  $('playBtn').addEventListener('click', togglePlay);
  $('prevBtn').addEventListener('click', prev);
  $('nextBtn').addEventListener('click', next);
  $('loopBtn').addEventListener('click', () => {
    state.loop = !state.loop;
    mediaEl.loop = state.loop;
    updateLoopBtn();
  });
  $('muteBtn').addEventListener('click', toggleMute);
  $('volumeBar').addEventListener('input', () => {
    const v = parseFloat($('volumeBar').value);
    mediaEl.volume = v;
    if (v > 0 && mediaEl.muted) mediaEl.muted = false;
  });
  $('rateSelect').addEventListener('change', () => {
    const r = parseFloat($('rateSelect').value) || 1;
    state.rate = r;
    mediaEl.playbackRate = r;
  });
  $('fullscreenBtn').addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreenBtn);
  document.addEventListener('webkitfullscreenchange', updateFullscreenBtn);

  const seekBar = $('seekBar');
  seekBar.addEventListener('pointerdown', () => { state.seeking = true; });
  window.addEventListener('pointerup', () => { state.seeking = false; });
  seekBar.addEventListener('input', () => {
    const pos = parseFloat(seekBar.value) || 0;
    $('curTime').textContent = formatTime(pos);
    mediaEl.currentTime = pos;
  });

  $('errorDismiss').addEventListener('click', hideErrorBanner);

  document.addEventListener('keydown', onKeyDown);

  updatePlayIcon();
  updateLoopBtn();
  updateVolumeUI();
  updateNavButtons();
}

// --- i18n: language switcher + re-render on change ------------------------

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

function setLang(code) {
  if (!STRINGS[code] || code === lang) return;
  lang = code;
  rememberLang(lang);
  applyStaticStrings(lang);
  buildLangSwitch();
  relabelControls();
}

// re-applies translated text/titles that live outside the data-i18n sweep
// (button state toggles between two strings, e.g. play/pause) or that are
// rebuilt from JS (playlist rows, whose "duration pending" / error text /
// per-row titles need the new language too).
function relabelControls() {
  updatePlayIcon();
  updateLoopBtn();
  updateVolumeUI();
  updateFullscreenBtn();
  renderPlaylist();
}

function buildRateSelect() {
  const sel = $('rateSelect');
  sel.innerHTML = '';
  RATES.forEach((r) => {
    const o = document.createElement('option');
    o.value = r;
    o.textContent = r + '×';
    if (r === '1') o.selected = true;
    sel.appendChild(o);
  });
}

// --- file loading -----------------------------------------------------------

function guessKind(file) {
  if (file.type && file.type.startsWith('video/')) return 'video';
  if (file.type && file.type.startsWith('audio/')) return 'audio';
  return 'unknown';
}

function probeMaybeUnsupported(file) {
  if (!file.type) return false;
  try {
    return probeEl.canPlayType(file.type) === '';
  } catch (e) {
    return false;
  }
}

function makeTrack(file) {
  return {
    id: idCounter++,
    file,
    url: URL.createObjectURL(file),
    name: file.name,
    size: file.size,
    kind: guessKind(file),
    duration: null,
    subtitleUrl: null,
    subtitleName: null,
    error: null,
    probeWarn: probeMaybeUnsupported(file),
  };
}

function addFiles(fileList) {
  const files = Array.from(fileList || []).filter(Boolean);
  if (!files.length) return;
  const wasEmpty = state.playlist.length === 0;
  const startIndex = state.playlist.length;
  files.forEach((file) => state.playlist.push(makeTrack(file)));
  renderPlaylist();
  if (wasEmpty) {
    $('dropZone').hidden = true;
    $('player').hidden = false;
    playTrackAt(startIndex, { autoplay: false });
  }
}

function revokeTrack(track) {
  if (track.url) URL.revokeObjectURL(track.url);
  if (track.subtitleUrl) URL.revokeObjectURL(track.subtitleUrl);
}

function removeTrack(index) {
  if (index < 0 || index >= state.playlist.length) return;
  const track = state.playlist[index];
  const wasCurrent = index === state.currentIndex;
  revokeTrack(track);
  state.playlist.splice(index, 1);

  if (state.playlist.length === 0) {
    state.currentIndex = -1;
    stopViz();
    mediaEl.pause();
    mediaEl.removeAttribute('src');
    Array.from(mediaEl.querySelectorAll('track')).forEach((tr) => tr.remove());
    mediaEl.load();
    hideErrorBanner();
    $('player').hidden = true;
    $('dropZone').hidden = false;
    $('fileInput').value = '';
    renderPlaylist();
    return;
  }

  if (wasCurrent) {
    const nextIndex = Math.min(index, state.playlist.length - 1);
    playTrackAt(nextIndex, { autoplay: false });
    return;
  }
  if (index < state.currentIndex) state.currentIndex -= 1;
  renderPlaylist();
}

// --- playback ---------------------------------------------------------------

function loadTrackIntoElement(track) {
  hideErrorBanner();
  stopViz();
  mediaEl.pause();
  Array.from(mediaEl.querySelectorAll('track')).forEach((tr) => tr.remove());

  mediaEl.src = track.url;
  mediaEl.loop = state.loop;
  mediaEl.volume = state.volume;
  mediaEl.muted = state.muted;
  mediaEl.playbackRate = state.rate;

  if (track.subtitleUrl) {
    const trackEl = document.createElement('track');
    trackEl.kind = 'subtitles';
    trackEl.src = track.subtitleUrl;
    trackEl.default = true;
    trackEl.label = track.subtitleName || 'Subtitles';
    mediaEl.appendChild(trackEl);
  }

  mediaEl.load();

  const seekBar = $('seekBar');
  seekBar.value = 0;
  seekBar.max = track.duration || 0;
  seekBar.disabled = !track.duration;
  $('curTime').textContent = formatTime(0);
  $('durTime').textContent = track.duration ? formatTime(track.duration) : '…';

  applyPlaceholderFor(track);
}

function applyPlaceholderFor(track) {
  $('audioPlaceholder').hidden = track.kind !== 'audio';
  $('phName').textContent = track.name;
}

function playTrackAt(index, opts = {}) {
  const { autoplay = true } = opts;
  if (index < 0 || index >= state.playlist.length) return;
  state.currentIndex = index;
  loadTrackIntoElement(state.playlist[index]);
  renderPlaylist();
  if (autoplay) safePlay();
  else updatePlayIcon();
}

function safePlay() {
  ensureAudioGraphIfNeeded();
  const p = mediaEl.play();
  if (p && typeof p.catch === 'function') {
    p.catch((err) => {
      // Autoplay policy can reject play() calls that aren't a direct user
      // gesture (most notably auto-advance from the 'ended' handler). Never
      // fail silently — tell the user and leave the UI in a correct, paused
      // state (updatePlayIcon() already reflects reality via the 'pause'/
      // native no-op here since playback never actually started).
      console.warn('Playback blocked:', err);
      toast(t(lang, 'toastPlayBlocked'), true);
    });
  }
}

function togglePlay() {
  if (state.currentIndex === -1) return;
  if (mediaEl.paused || mediaEl.ended) safePlay();
  else mediaEl.pause();
}

function next() {
  if (state.currentIndex < state.playlist.length - 1) playTrackAt(state.currentIndex + 1, { autoplay: true });
}

function prev() {
  if (state.currentIndex > 0) playTrackAt(state.currentIndex - 1, { autoplay: true });
}

function updateNavButtons() {
  const hasTrack = state.currentIndex !== -1;
  // playBtn only needs a track loaded, not metadata — you can hit play
  // before duration is known, buffering just starts. (seekBar is handled
  // separately: it stays disabled until loadedmetadata actually resolves a
  // duration, since scrubbing needs a known range.)
  $('playBtn').disabled = !hasTrack;
  $('prevBtn').disabled = state.currentIndex <= 0;
  $('nextBtn').disabled = state.currentIndex < 0 || state.currentIndex >= state.playlist.length - 1;
}

// --- media element event handlers -------------------------------------------

function onLoadedMetadata() {
  const track = state.playlist[state.currentIndex];
  if (!track) return;
  const dur = isFinite(mediaEl.duration) ? mediaEl.duration : 0;
  track.duration = dur;
  track.kind = mediaEl.videoWidth === 0 ? 'audio' : 'video';
  applyPlaceholderFor(track);

  const seekBar = $('seekBar');
  seekBar.max = dur;
  seekBar.disabled = dur <= 0;
  $('durTime').textContent = formatTime(dur);
  renderPlaylist();

  // kind may have just resolved from "unknown"/guessed to "audio" after the
  // user already hit play — retroactively start the visualizer if so.
  if (!mediaEl.paused) updatePlayIcon();
}

function onTimeUpdate() {
  if (state.seeking) return;
  const cur = mediaEl.currentTime || 0;
  $('seekBar').value = cur;
  $('curTime').textContent = formatTime(cur);
  paintSeekBar();
}

function paintSeekBar() {
  const bar = $('seekBar');
  const dur = mediaEl.duration;
  if (!isFinite(dur) || dur <= 0) return;
  const played = Math.min(100, (mediaEl.currentTime / dur) * 100);
  let bufferedEnd = 0;
  try {
    const b = mediaEl.buffered;
    for (let i = 0; i < b.length; i++) {
      bufferedEnd = Math.max(bufferedEnd, b.end(i));
    }
  } catch (e) { /* buffered can throw on some detached states */ }
  const buffered = Math.min(100, (bufferedEnd / dur) * 100);
  bar.style.background =
    `linear-gradient(to right, var(--ogh-accent) 0%, var(--ogh-accent) ${played}%, ` +
    `rgba(255,255,255,0.35) ${played}%, rgba(255,255,255,0.35) ${buffered}%, ` +
    `rgba(255,255,255,0.12) ${buffered}%, rgba(255,255,255,0.12) 100%)`;
}

function onEnded() {
  stopViz();
  updatePlayIcon();
  if (!state.loop && state.currentIndex < state.playlist.length - 1) {
    playTrackAt(state.currentIndex + 1, { autoplay: true });
  }
}

function onErrorEvent() {
  // Fires (harmlessly) when we deliberately clear mediaEl.src on an
  // empty-playlist reset; state.currentIndex is already -1 by then.
  if (state.currentIndex === -1) return;
  const track = state.playlist[state.currentIndex];
  if (!track) return;
  const code = mediaEl.error ? mediaEl.error.code : 0;
  const key = ERROR_KEY_BY_CODE[code] || 'err_unknown';
  const msg = t(lang, key, { name: track.name });
  track.error = msg;
  stopViz();
  showErrorBanner(msg);
  renderPlaylist();
}

// --- volume / mute / loop / rate --------------------------------------------

function toggleMute() {
  mediaEl.muted = !mediaEl.muted;
}

function updateVolumeUI() {
  state.volume = mediaEl.volume;
  state.muted = mediaEl.muted;
  $('volumeBar').value = mediaEl.volume;
  const isMuted = mediaEl.muted || mediaEl.volume === 0;
  const btn = $('muteBtn');
  btn.textContent = isMuted ? '🔇' : '🔊';
  btn.title = t(lang, isMuted ? 'unmuteTitle' : 'muteTitle');
}

function updateLoopBtn() {
  const btn = $('loopBtn');
  btn.classList.toggle('is-on', state.loop);
  btn.title = t(lang, state.loop ? 'loopOnTitle' : 'loopTitle');
}

function updatePlayIcon() {
  const playing = state.currentIndex !== -1 && !mediaEl.paused && !mediaEl.ended;
  const btn = $('playBtn');
  btn.textContent = playing ? '⏸' : '▶';
  btn.title = t(lang, playing ? 'pauseTitle' : 'playTitle');
  const track = state.playlist[state.currentIndex];
  if (playing && track && track.kind === 'audio') startViz();
  else stopViz();
}

// --- fullscreen --------------------------------------------------------------

function toggleFullscreen() {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  if (isFs) {
    try {
      const ret = document.exitFullscreen ? document.exitFullscreen() : (document.webkitExitFullscreen && document.webkitExitFullscreen());
      if (ret && ret.catch) ret.catch(() => {});
    } catch (e) { /* ignore */ }
    return;
  }
  const el = $('stageWrap');
  const req = el.requestFullscreen ? () => el.requestFullscreen() : (el.webkitRequestFullscreen ? () => el.webkitRequestFullscreen() : null);
  if (!req) {
    toast(t(lang, 'toastFullscreenUnsupported'), true);
    return;
  }
  try {
    const ret = req();
    if (ret && ret.catch) ret.catch(() => toast(t(lang, 'toastFullscreenFailed'), true));
  } catch (e) {
    toast(t(lang, 'toastFullscreenFailed'), true);
  }
}

function updateFullscreenBtn() {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  $('fullscreenBtn').title = t(lang, isFs ? 'exitFullscreenTitle' : 'fullscreenTitle');
}

// --- subtitles -----------------------------------------------------------

function attachSubtitle(index, file) {
  const track = state.playlist[index];
  if (!track) return;
  if (track.subtitleUrl) URL.revokeObjectURL(track.subtitleUrl);
  track.subtitleUrl = URL.createObjectURL(file);
  track.subtitleName = file.name;
  renderPlaylist();

  if (index === state.currentIndex) {
    Array.from(mediaEl.querySelectorAll('track')).forEach((tr) => tr.remove());
    const trackEl = document.createElement('track');
    trackEl.kind = 'subtitles';
    trackEl.src = track.subtitleUrl;
    trackEl.default = true;
    trackEl.label = file.name;
    mediaEl.appendChild(trackEl);
  }
  toast(t(lang, 'toastSubtitleAttached', { name: track.name }));
}

// --- audio-only visualizer (AudioContext + AnalyserNode) --------------------
// Only ever touched for audio-kind tracks, so pure-video playback never
// depends on Web Audio at all. The graph, once created, stays connected to
// mediaEl for the lifetime of the page (createMediaElementSource can only be
// called once per element) — safe for later video tracks too, since the
// analyser stays connected straight through to the speakers either way.

function ensureAudioGraph() {
  if (state.audioGraphReady) return;
  state.audioGraphReady = true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const src = ctx.createMediaElementSource(mediaEl);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    state.audioCtx = ctx;
    state.analyser = analyser;
  } catch (e) {
    console.warn('Audio visualizer unavailable:', e);
    state.audioCtx = null;
    state.analyser = null;
  }
}

function ensureAudioGraphIfNeeded() {
  const track = state.playlist[state.currentIndex];
  if (!track || track.kind !== 'audio') return;
  ensureAudioGraph();
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume().catch(() => {});
  }
}

function startViz() {
  if (state.vizRAF || !state.analyser) return;
  const canvas = $('vizCanvas');
  vizCtx2d = vizCtx2d || canvas.getContext('2d');
  const bufferLength = state.analyser.frequencyBinCount;
  const data = new Uint8Array(bufferLength);
  const styles = getComputedStyle(document.documentElement);
  const c1 = styles.getPropertyValue('--ogh-accent').trim() || '#5ce1ff';
  const c2 = styles.getPropertyValue('--ogh-accent-2').trim() || '#ff6bcb';

  const frame = () => {
    state.vizRAF = requestAnimationFrame(frame);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    state.analyser.getByteFrequencyData(data);
    vizCtx2d.clearRect(0, 0, canvas.width, canvas.height);
    const barCount = Math.min(40, bufferLength);
    const gap = 3;
    const barWidth = (canvas.width - gap * (barCount - 1)) / barCount;
    for (let i = 0; i < barCount; i++) {
      const v = data[i] / 255;
      const barH = Math.max(2, v * canvas.height * 0.9);
      vizCtx2d.globalAlpha = 0.85;
      vizCtx2d.fillStyle = i % 2 === 0 ? c1 : c2;
      vizCtx2d.fillRect(i * (barWidth + gap), canvas.height - barH, barWidth, barH);
    }
  };
  frame();
}

function stopViz() {
  if (state.vizRAF) {
    cancelAnimationFrame(state.vizRAF);
    state.vizRAF = 0;
  }
  if (vizCtx2d) {
    const canvas = $('vizCanvas');
    vizCtx2d.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// --- keyboard shortcuts -------------------------------------------------

function seekBy(delta) {
  if (state.currentIndex === -1) return;
  const dur = isFinite(mediaEl.duration) ? mediaEl.duration : Infinity;
  let pos = (mediaEl.currentTime || 0) + delta;
  pos = Math.max(0, Math.min(dur, pos));
  mediaEl.currentTime = pos;
}

function adjustVolume(delta) {
  let v = mediaEl.volume + delta;
  v = Math.max(0, Math.min(1, v));
  mediaEl.volume = v;
  if (v > 0 && mediaEl.muted) mediaEl.muted = false;
}

function onKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const active = document.activeElement;
  const tag = active && active.tagName;
  const isFormField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (active && active.isContentEditable);
  if (isFormField) return;

  if (e.key === ' ' || e.code === 'Space') {
    // Every button on this page already does the right thing on its own
    // click handler, and browsers natively "click" a focused <button> on
    // Space. If we also ran togglePlay() here while e.g. playBtn is
    // focused, Space would toggle playback twice (once from us, once from
    // the native activation) — so defer to native behavior for buttons and
    // only handle Space ourselves when nothing button-like has focus.
    if (tag === 'BUTTON') return;
    e.preventDefault();
    togglePlay();
    return;
  }
  switch (e.key) {
    case 'ArrowLeft': e.preventDefault(); seekBy(-5); break;
    case 'ArrowRight': e.preventDefault(); seekBy(5); break;
    case 'ArrowUp': e.preventDefault(); adjustVolume(0.1); break;
    case 'ArrowDown': e.preventDefault(); adjustVolume(-0.1); break;
    case 'f': case 'F': toggleFullscreen(); break;
    case 'm': case 'M': toggleMute(); break;
    default: break;
  }
}

// --- drag & drop (whole page, not just the initial drop zone) ---------------

function wireDragAndDrop() {
  let depth = 0;
  const hasFiles = (e) => !!(e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files'));

  document.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth++;
    document.body.classList.add('is-dragging');
  });
  document.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
  });
  document.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) document.body.classList.remove('is-dragging');
  });
  document.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    document.body.classList.remove('is-dragging');
    addFiles(e.dataTransfer.files);
  });
}

// --- playlist UI --------------------------------------------------------

function textSpan(text, className) {
  const s = document.createElement('span');
  if (className) s.className = className;
  s.textContent = text;
  return s;
}

function renderPlaylist() {
  const ul = $('playlistEl');
  ul.innerHTML = '';

  state.playlist.forEach((track, i) => {
    const li = document.createElement('li');
    li.className = 'pl-row' + (i === state.currentIndex ? ' is-current' : '') + (track.error ? ' has-error' : '');
    li.title = t(lang, 'playRowTitle');
    li.appendChild(textSpan(String(i + 1), 'pl-idx'));

    const info = document.createElement('div');
    info.className = 'pl-info';

    info.appendChild(textSpan(track.name, 'pl-name'));

    const meta = document.createElement('p');
    meta.className = 'pl-meta';
    meta.appendChild(textSpan(track.duration ? formatTime(track.duration) : '…'));
    meta.appendChild(textSpan('·'));
    meta.appendChild(textSpan(formatBytes(track.size)));
    if (track.subtitleUrl) meta.appendChild(textSpan('CC', 'pl-cc-badge'));
    if (track.probeWarn && !track.error) meta.appendChild(textSpan(t(lang, 'probeWarn'), 'pl-warn'));
    info.appendChild(meta);

    if (track.error) info.appendChild(textSpan(track.error, 'pl-error-text'));

    li.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'pl-actions';

    const ccBtn = document.createElement('button');
    ccBtn.type = 'button';
    ccBtn.className = 'pl-btn cc';
    ccBtn.textContent = 'CC+';
    ccBtn.title = t(lang, 'addSubtitleTitle');
    ccBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.pendingSubtitleIndex = i;
      $('subtitleInput').click();
    });
    actions.appendChild(ccBtn);

    const rmBtn = document.createElement('button');
    rmBtn.type = 'button';
    rmBtn.className = 'pl-btn remove';
    rmBtn.textContent = '×';
    rmBtn.title = t(lang, 'removeTitle');
    rmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeTrack(i);
    });
    actions.appendChild(rmBtn);

    li.appendChild(actions);

    li.addEventListener('click', () => {
      if (i === state.currentIndex) togglePlay();
      else playTrackAt(i, { autoplay: true });
    });

    ul.appendChild(li);
  });

  updateNavButtons();
}

// --- error banner / toast ----------------------------------------------

function showErrorBanner(msg) {
  $('errorText').textContent = msg;
  $('errorBanner').hidden = false;
  toast(msg, true);
}

function hideErrorBanner() {
  $('errorBanner').hidden = true;
}

let toastTimer = null;
function toast(msg, isError) {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3500);
}

// --- formatters -----------------------------------------------------------

function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function formatTime(s) {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// --- go ---------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', init);
