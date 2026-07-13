// Flashlight — the classic "screen at max brightness" trick, plus an SOS
// blink mode. No hardware torch API, no camera, no permissions: this just
// fills the screen with solid color. See the brightnessNote string (shown
// in the off-state UI) for the caveat that this cannot change the OS's
// actual screen-brightness setting.

import { LANGS, LANG_LABELS, STRINGS, t, detectLang, rememberLang, applyStaticStrings } from './i18n.js';

let lang = detectLang();

const $ = (id) => document.getElementById(id);

// --- SOS timing --------------------------------------------------------
//
// International Morse SOS: ··· −−− ··· (dot dot dot, dash dash dash, dot
// dot dot), then a long pause before repeating.
//
// SAFETY: these exact values keep the flash rate at 2.5 flashes/second
// during the dot phase (200ms on + 200ms off = 400ms per cycle), which
// stays under the ~3-flashes/second threshold commonly used for
// photosensitive-epilepsy safety (the same threshold WCAG 2.3.1 uses). Do
// not shorten these to "look more urgent" — the values are a deliberate,
// reviewed choice, not a placeholder.
const SOS_TIMING = Object.freeze({
  dot: 200,       // short flash, on-duration
  dash: 600,      // long flash, on-duration
  symbolGap: 200, // off-duration between symbols within one letter
  letterGap: 600, // off-duration between letters
  wordGap: 1400,  // off-duration before the whole SOS pattern repeats
});

/** Flat list of {on, duration} steps for exactly one SOS cycle (including
 *  the trailing word gap), walked and looped by runSosStep(). */
function buildSosSequence() {
  const steps = [];
  const letter = (durations) => {
    durations.forEach((duration, i) => {
      steps.push({ on: true, duration });
      if (i < durations.length - 1) steps.push({ on: false, duration: SOS_TIMING.symbolGap });
    });
  };
  letter([SOS_TIMING.dot, SOS_TIMING.dot, SOS_TIMING.dot]);       // S
  steps.push({ on: false, duration: SOS_TIMING.letterGap });
  letter([SOS_TIMING.dash, SOS_TIMING.dash, SOS_TIMING.dash]);    // O
  steps.push({ on: false, duration: SOS_TIMING.letterGap });
  letter([SOS_TIMING.dot, SOS_TIMING.dot, SOS_TIMING.dot]);       // S
  steps.push({ on: false, duration: SOS_TIMING.wordGap });
  return steps;
}
const SOS_SEQUENCE = buildSosSequence();

// --- state ---------------------------------------------------------------

const state = {
  mode: 'off', // 'off' | 'steady' | 'sos'
};

let sosTimer = null;
let sosStepIndex = 0;
let wakeLock = null;

// --- boot ------------------------------------------------------------------

function init() {
  applyStaticStrings(lang);
  buildLangSwitch();
  wireControls();
  if (!('wakeLock' in navigator)) {
    $('wakeNote').hidden = false;
  }
}

document.addEventListener('DOMContentLoaded', init);

// --- i18n: language switcher + re-render on change --------------------------

function buildLangSwitch() {
  const el = $('langSwitch');
  if (!el) return;
  el.innerHTML = '';
  el.setAttribute('aria-label', t(lang, 'langLabel'));
  for (const code of LANGS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-btn' + (code === lang ? ' is-on' : '');
    btn.textContent = LANG_LABELS[code];
    btn.setAttribute('aria-pressed', String(code === lang));
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setLang(code);
    });
    el.appendChild(btn);
  }
}

function setLang(code) {
  if (!STRINGS[code] || code === lang) return;
  lang = code;
  rememberLang(lang);
  applyStaticStrings(lang);
  buildLangSwitch();
}

// --- controls: Turn on / SOS / off-anywhere --------------------------------

function wireControls() {
  $('turnOnBtn').addEventListener('click', (e) => {
    // Load-bearing: without stopPropagation, this same click keeps
    // bubbling to the document-level "tap anywhere to turn off" listener
    // below, which would see mode !== 'off' (just set) and immediately
    // undo the very click that turned the light on.
    e.stopPropagation();
    turnOnSteady();
  });
  $('sosBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    turnOnSos();
  });
  $('sosCornerBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    turnOff();
  });

  // The whole lit screen is the off-button: any tap/click while active
  // turns it off, regardless of which SOS flash phase is currently
  // showing (bright or dark) — this listener doesn't check background
  // color, only `state.mode`.
  document.addEventListener('click', () => {
    if (state.mode !== 'off') turnOff();
  });

  // Keyboard escape hatch: Turn on/SOS/corner-stop are all real <button>
  // elements (focusable + Enter/Space-activatable for free), but the
  // steady-on state hides every button, so Escape is the only way a
  // keyboard-only user can turn it back off without a mouse/touch tap.
  document.addEventListener('keydown', (e) => {
    if (state.mode !== 'off' && e.key === 'Escape') turnOff();
  });
}

function turnOnSteady() {
  if (state.mode !== 'off') return;
  state.mode = 'steady';
  const html = document.documentElement;
  html.classList.add('fl-lit', 'fl-mode-steady');
  $('offScreen').hidden = true;
  acquireWakeLock();
}

function turnOnSos() {
  if (state.mode !== 'off') return;
  state.mode = 'sos';
  const html = document.documentElement;
  html.classList.add('fl-lit', 'fl-mode-sos');
  $('offScreen').hidden = true;
  $('sosCornerBtn').hidden = false;
  sosStepIndex = 0;
  runSosStep();
  acquireWakeLock();
}

function turnOff() {
  if (state.mode === 'off') return;
  state.mode = 'off';
  if (sosTimer) {
    clearTimeout(sosTimer);
    sosTimer = null;
  }
  document.documentElement.classList.remove('fl-lit', 'fl-mode-steady', 'fl-mode-sos', 'fl-flash-on');
  $('offScreen').hidden = false;
  $('sosCornerBtn').hidden = true;
  releaseWakeLock();
}

function runSosStep() {
  if (state.mode !== 'sos') return; // stopped mid-flight (turnOff already cleared the timer, but guard anyway)
  const step = SOS_SEQUENCE[sosStepIndex % SOS_SEQUENCE.length];
  document.documentElement.classList.toggle('fl-flash-on', step.on);
  sosTimer = setTimeout(() => {
    sosStepIndex++;
    runSosStep();
  }, step.duration);
}

// --- Screen Wake Lock -------------------------------------------------------
//
// Feature-detected: plenty of browsers don't implement this yet. When it's
// missing we just skip it silently (the off-state UI shows a small,
// non-nagging note instead — see wakeNoteUnsupported in i18n.js).

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
    });
  } catch (e) {
    // Permission denied, battery saver, page not visible yet, etc. — the
    // light still works, it just may not prevent the screen from timing
    // out. Not worth surfacing as an error.
    wakeLock = null;
  }
}

async function releaseWakeLock() {
  if (!wakeLock) return;
  try {
    await wakeLock.release();
  } catch (e) { /* already released */ }
  wakeLock = null;
}

// Most browsers auto-release the wake lock when the tab is hidden
// (backgrounded / screen locked) — re-acquire it on return if the light is
// still supposed to be on, so a quick app-switch doesn't quietly disable it.
document.addEventListener('visibilitychange', () => {
  if (state.mode !== 'off' && document.visibilityState === 'visible' && !wakeLock) {
    acquireWakeLock();
  }
});
