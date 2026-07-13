/**
 * Music Synth — UI layer: on-screen piano DOM, pointer glissando, computer
 * keyboard shortcuts, instrument/octave/volume/reverb controls, i18n.
 * All actual sound synthesis lives in synth.js.
 */
import { SynthEngine, INSTRUMENTS, noteToMidi } from './synth.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';

const $ = (id) => document.getElementById(id);

const engine = new SynthEngine();

/* ------------------------------------------------------------------------ *
 * Note layout: 2 octaves + a trailing high C (25 keys: 15 white, 10 black),
 * offsets 0-24 from the currently selected base octave's C.
 * ------------------------------------------------------------------------ */
const BLACK_STEPS = new Set([1, 3, 6, 8, 10]);
const TOTAL_SEMITONES = 24; // 2 full octaves visible

function buildKeyDefs() {
  const defs = [];
  for (let offset = 0; offset <= TOTAL_SEMITONES; offset++) {
    const step = offset % 12;
    defs.push({ offset, black: BLACK_STEPS.has(step), isC: step === 0 });
  }
  return defs;
}
const KEY_DEFS = buildKeyDefs();
const WHITE_COUNT = KEY_DEFS.filter((d) => !d.black).length; // 15
const BLACK_WIDTH_PCT = (100 / WHITE_COUNT) * 0.62;

// Standard "virtual piano" QWERTY layout (physical layout, via e.code):
// white keys A S D F G H J K -> C D E F G A B C; black keys W E T Y U -> C# D# F# G# A#.
const QWERTY_MAP = [
  { offset: 0, code: 'KeyA', ch: 'A' },
  { offset: 1, code: 'KeyW', ch: 'W' },
  { offset: 2, code: 'KeyS', ch: 'S' },
  { offset: 3, code: 'KeyE', ch: 'E' },
  { offset: 4, code: 'KeyD', ch: 'D' },
  { offset: 5, code: 'KeyF', ch: 'F' },
  { offset: 6, code: 'KeyT', ch: 'T' },
  { offset: 7, code: 'KeyG', ch: 'G' },
  { offset: 8, code: 'KeyY', ch: 'Y' },
  { offset: 9, code: 'KeyH', ch: 'H' },
  { offset: 10, code: 'KeyU', ch: 'U' },
  { offset: 11, code: 'KeyJ', ch: 'J' },
  { offset: 12, code: 'KeyK', ch: 'K' },
];
const CODE_TO_OFFSET = new Map(QWERTY_MAP.map((m) => [m.code, m.offset]));
const KEYCHAR_TO_OFFSET = new Map(QWERTY_MAP.map((m) => [m.ch.toLowerCase(), m.offset]));
const OFFSET_TO_CHAR = new Map(QWERTY_MAP.map((m) => [m.offset, m.ch]));

const OCTAVE_MIN = 1;
const OCTAVE_MAX = 6;
const OCTAVE_DEFAULT = 4;

/* ------------------------------------------------------------------------ *
 * Mutable UI state
 * ------------------------------------------------------------------------ */
let lang = detectLang();
let currentInstrument = 'piano';
let baseOctave = OCTAVE_DEFAULT;
/** @type {Array<{el: HTMLElement, glow: HTMLElement, label: HTMLElement, isC: boolean}>} indexed by offset */
const keyEls = new Array(KEY_DEFS.length);

/* ------------------------------------------------------------------------ *
 * Persistence (mirrors the localStorage-remembers-language pattern used by
 * other OGH programs — small nicety, not required for correctness).
 * ------------------------------------------------------------------------ */
const STATE_KEY = 'ogh_ms_state';
function loadSavedState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({
      instrument: currentInstrument,
      octave: baseOctave,
      volume: Number($('volumeRange').value),
      reverb: Number($('reverbRange').value),
    }));
  } catch { /* ignore */ }
}

/* ------------------------------------------------------------------------ *
 * Keyboard DOM
 * ------------------------------------------------------------------------ */
function buildKeyboardDom() {
  const whitesWrap = $('pkWhites');
  const blacksWrap = $('pkBlacks');
  let whiteIdx = 0;

  KEY_DEFS.forEach((def) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `pk-key ${def.black ? 'pk-black' : 'pk-white'}`;
    el.dataset.offset = String(def.offset);
    el.tabIndex = -1; // played via pointer + explicit QWERTY mapping, not Tab
    el.setAttribute('aria-pressed', 'false');

    const glow = document.createElement('span');
    glow.className = 'pk-glow';
    glow.setAttribute('aria-hidden', 'true');
    el.appendChild(glow);

    const label = document.createElement('span');
    label.className = 'pk-label';
    el.appendChild(label);

    const sub = document.createElement('span');
    sub.className = 'pk-sub';
    if (OFFSET_TO_CHAR.has(def.offset)) sub.textContent = OFFSET_TO_CHAR.get(def.offset);
    el.appendChild(sub);

    if (def.black) {
      const leftPct = (whiteIdx / WHITE_COUNT) * 100 - BLACK_WIDTH_PCT / 2;
      el.style.left = `${leftPct}%`;
      el.style.width = `${BLACK_WIDTH_PCT}%`;
      blacksWrap.appendChild(el);
    } else {
      whitesWrap.appendChild(el);
      whiteIdx += 1;
    }

    keyEls[def.offset] = { el, glow, label, isC: def.isC };
  });
}

/** Re-tune every key to the current baseOctave. Does not touch already-sounding voices. */
function refreshKeyboard() {
  const rootMidi = noteToMidi(baseOctave, 0);
  KEY_DEFS.forEach((def) => {
    const rec = keyEls[def.offset];
    const midi = rootMidi + def.offset;
    rec.el.dataset.midi = String(midi);
    rec.label.textContent = def.isC ? `C${baseOctave + Math.floor(def.offset / 12)}` : '';
  });
  $('octReadout').textContent = `C${baseOctave}`;
}

function shiftOctave(delta) {
  const next = Math.max(OCTAVE_MIN, Math.min(OCTAVE_MAX, baseOctave + delta));
  if (next === baseOctave) return;
  baseOctave = next;
  refreshKeyboard();
  saveState();
}

/* ------------------------------------------------------------------------ *
 * Press / release — shared by pointer and computer-keyboard input.
 * ------------------------------------------------------------------------ */
function ringFade(glowEl, decaySec) {
  if (!glowEl) return;
  const d = Math.max(0.05, decaySec);
  glowEl.style.transitionDuration = '0s';
  glowEl.classList.add('is-lit');
  void glowEl.offsetWidth; // force reflow so the 0s transition commits first
  glowEl.style.transitionDuration = `${d}s`;
  glowEl.classList.remove('is-lit');
  clearTimeout(glowEl._resetTimer);
  glowEl._resetTimer = setTimeout(() => { glowEl.style.transitionDuration = ''; }, d * 1000 + 60);
}

function pressKey(el, triggerId) {
  if (!el) return null;
  const midi = Number(el.dataset.midi);
  const voice = engine.noteOn(triggerId, midi, currentInstrument);
  el.classList.add('is-down');
  el.setAttribute('aria-pressed', 'true');
  if (voice.percussive) {
    ringFade(keyEls[Number(el.dataset.offset)]?.glow, voice.stopAt - engine.ctx.currentTime);
  }
  return voice;
}

function releaseKey(el, triggerId) {
  engine.noteOff(triggerId);
  if (el) {
    el.classList.remove('is-down');
    el.setAttribute('aria-pressed', 'false');
  }
}

/* ------------------------------------------------------------------------ *
 * Pointer input: touch/mouse/pen, multi-touch chords, glissando.
 * ------------------------------------------------------------------------ */
const activePointers = new Map(); // pointerId -> currently-sounding key element (or null between keys)

function keyElAtPoint(x, y) {
  const hit = document.elementFromPoint(x, y);
  return hit ? hit.closest('.pk-key') : null;
}

function setupPointerInput() {
  const piano = $('piano');

  piano.addEventListener('pointerdown', (e) => {
    const keyEl = e.target.closest('.pk-key');
    if (!keyEl) return;
    e.preventDefault();
    activePointers.set(e.pointerId, keyEl);
    pressKey(keyEl, `ptr:${e.pointerId}`);
  });

  window.addEventListener('pointermove', (e) => {
    if (!activePointers.has(e.pointerId)) return;
    const prevEl = activePointers.get(e.pointerId);
    const keyEl = keyElAtPoint(e.clientX, e.clientY);
    if (keyEl === prevEl) return;
    // Glissando: sliding onto a new key releases the old one and triggers the new one.
    if (prevEl) releaseKey(prevEl, `ptr:${e.pointerId}`);
    activePointers.set(e.pointerId, keyEl || null);
    if (keyEl) pressKey(keyEl, `ptr:${e.pointerId}`);
  });

  function endPointer(e) {
    if (!activePointers.has(e.pointerId)) return;
    const prevEl = activePointers.get(e.pointerId);
    if (prevEl) releaseKey(prevEl, `ptr:${e.pointerId}`);
    activePointers.delete(e.pointerId);
  }
  window.addEventListener('pointerup', endPointer);
  window.addEventListener('pointercancel', endPointer);
}

/* ------------------------------------------------------------------------ *
 * Computer keyboard input.
 * ------------------------------------------------------------------------ */
const heldPhysical = new Set();

function offsetForEvent(e) {
  if (e.code && CODE_TO_OFFSET.has(e.code)) return CODE_TO_OFFSET.get(e.code);
  const k = (e.key || '').toLowerCase();
  return KEYCHAR_TO_OFFSET.has(k) ? KEYCHAR_TO_OFFSET.get(k) : null;
}
function idForEvent(e) {
  return e.code || `k:${(e.key || '').toLowerCase()}`;
}

function setupKeyboardInput() {
  window.addEventListener('keydown', (e) => {
    const id = idForEvent(e);
    // Belt-and-suspenders auto-repeat guard: honor e.repeat AND track held
    // physical keys ourselves, since synthetic/test events don't always set repeat.
    if (e.repeat || heldPhysical.has(id)) return;

    const lower = (e.key || '').toLowerCase();
    if (lower === 'z') { heldPhysical.add(id); e.preventDefault(); shiftOctave(-1); return; }
    if (lower === 'x') { heldPhysical.add(id); e.preventDefault(); shiftOctave(1); return; }

    const offset = offsetForEvent(e);
    if (offset == null) return;
    heldPhysical.add(id);
    e.preventDefault();
    const rec = keyEls[offset];
    if (rec) pressKey(rec.el, `key:${id}`);
  });

  window.addEventListener('keyup', (e) => {
    const id = idForEvent(e);
    if (!heldPhysical.has(id)) return;
    heldPhysical.delete(id);
    const offset = offsetForEvent(e);
    const rec = offset != null ? keyEls[offset] : null;
    if (rec) releaseKey(rec.el, `key:${id}`);
  });

  // If focus leaves the window/tab mid-press, don't leave phantom held notes:
  // release every visually-down key by reconstructing whichever trigger id
  // it could have been pressed under (we don't track offset->id directly).
  window.addEventListener('blur', () => {
    keyEls.forEach((rec, offset) => {
      if (!rec || !rec.el.classList.contains('is-down')) return;
      const m = QWERTY_MAP.find((q) => q.offset === offset);
      if (m) {
        releaseKey(rec.el, `key:${m.code}`);
        releaseKey(rec.el, `key:k:${m.ch.toLowerCase()}`);
      }
    });
    heldPhysical.clear();
    activePointers.forEach((el, pointerId) => {
      if (el) releaseKey(el, `ptr:${pointerId}`);
    });
    activePointers.clear();
  });
}

/* ------------------------------------------------------------------------ *
 * Instrument selector
 * ------------------------------------------------------------------------ */
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function buildInstrumentButtons() {
  const wrap = $('instrumentsWrap');
  INSTRUMENTS.forEach((inst) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ms-inst-btn';
    btn.dataset.inst = inst.id;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('data-i18n', `inst${capitalize(inst.id)}`);
    btn.addEventListener('click', () => {
      engine.ensureContext();
      setInstrument(inst.id);
    });
    wrap.appendChild(btn);
  });
}

function setInstrument(id) {
  // Switching instruments only affects *future* noteOn() calls — voices
  // already ringing keep whatever node graph they were built with.
  currentInstrument = id;
  document.querySelectorAll('.ms-inst-btn').forEach((b) => {
    const on = b.dataset.inst === id;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-selected', String(on));
  });
  saveState();
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
  rememberLang(lang);
}

/* ------------------------------------------------------------------------ *
 * Controls: octave buttons, volume, reverb
 * ------------------------------------------------------------------------ */
function setupControls() {
  $('octDown').addEventListener('click', () => { engine.ensureContext(); shiftOctave(-1); });
  $('octUp').addEventListener('click', () => { engine.ensureContext(); shiftOctave(1); });

  $('volumeRange').addEventListener('input', (e) => {
    engine.setMasterVolume(Number(e.target.value));
    saveState();
  });
  $('reverbRange').addEventListener('input', (e) => {
    engine.setReverbAmount(Number(e.target.value));
    saveState();
  });
}

/* ------------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------------ */
function init() {
  buildKeyboardDom();
  buildInstrumentButtons();
  buildLangSwitch();

  const saved = loadSavedState();
  if (saved) {
    if (saved.instrument && INSTRUMENTS.some((i) => i.id === saved.instrument)) currentInstrument = saved.instrument;
    if (Number.isFinite(saved.octave)) baseOctave = Math.max(OCTAVE_MIN, Math.min(OCTAVE_MAX, saved.octave));
    if (Number.isFinite(saved.volume)) $('volumeRange').value = String(saved.volume);
    if (Number.isFinite(saved.reverb)) $('reverbRange').value = String(saved.reverb);
  }

  refreshKeyboard();
  setInstrument(currentInstrument);
  applyLang(lang);

  // Seed the (initially suspended, silent) AudioContext with the current
  // slider values; it starts making sound once a real user gesture resumes it.
  engine.setMasterVolume(Number($('volumeRange').value));
  engine.setReverbAmount(Number($('reverbRange').value));

  setupPointerInput();
  setupKeyboardInput();
  setupControls();

  // Debug/test hook — harmless in normal use, lets the harness (and devtools)
  // drive/inspect the engine without simulating raw DOM events.
  window.OGH_MUSIC_SYNTH = {
    engine,
    INSTRUMENTS,
    getInstrument: () => currentInstrument,
    setInstrument,
    getOctave: () => baseOctave,
    shiftOctave,
    keyEls,
    pressKey,
    releaseKey,
  };
}

init();
