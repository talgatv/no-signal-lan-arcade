// Speech Tools — two browser-native speech APIs, no servers, no uploads.
//
// Text -> Speech uses SpeechSynthesis with voices installed on this device:
// fully offline, always.
//
// Speech -> Text uses SpeechRecognition, which needs (a) a secure context
// (https:// or localhost) for microphone access, and (b) in most browsers,
// an internet connection — recognition audio is routed through a cloud
// service (e.g. Chrome uses Google's) for most languages. See the
// `notFullyOfflineNote` string for the user-facing version of this caveat.

import { LANGS, LANG_LABELS, STRINGS, t, detectLang, rememberLang, applyStaticStrings } from './i18n.js';

let lang = detectLang();

const $ = (id) => document.getElementById(id);

// UI language -> a sensible *default* BCP-47 locale for the TTS voice list's
// "matching this language" grouping and for the STT recognition language.
// This is only ever used to seed an initial default — once the user picks a
// voice or a recognition language explicitly, switching the UI language
// again must not silently override that choice. The three languages (UI,
// TTS voice, STT recognition) are independent settings throughout.
const UI_LANG_TO_BCP47 = {
  en: 'en-US',
  ru: 'ru-RU',
  zh: 'zh-CN',
  es: 'es-ES',
  ar: 'ar-SA',
  fr: 'fr-FR',
};

// Recognition language choices — the same UN-6 set as the UI languages,
// which keeps the app's language surface small and consistent instead of
// shipping a giant BCP-47 locale list.
const REC_LANGS = [
  { code: 'en-US', key: 'recLang_en' },
  { code: 'ru-RU', key: 'recLang_ru' },
  { code: 'zh-CN', key: 'recLang_zh' },
  { code: 'es-ES', key: 'recLang_es' },
  { code: 'ar-SA', key: 'recLang_ar' },
  { code: 'fr-FR', key: 'recLang_fr' },
];

const state = {
  // TTS
  voices: [],
  voicesTimedOut: false,
  ttsState: 'idle', // 'idle' | 'speaking' | 'paused'
  // STT
  sttSupported: false,
  sttSecure: false,
  sttListening: false,
  sttManualStop: false,
  finalText: '',
  interimText: '',
};

// --- boot -------------------------------------------------------------------

function init() {
  applyStaticStrings(lang);
  buildLangSwitch();
  initTabs();
  initTts();
  initStt();
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
  relabelVoiceSelect();
  relabelRecLangSelect();
  updateEmptyHints();
  updateTtsButtons();
  updateSttUI();
}

// --- tabs ---------------------------------------------------------------

function initTabs() {
  $('tabTts').addEventListener('click', () => showTab('tts'));
  $('tabStt').addEventListener('click', () => showTab('stt'));
}

function showTab(which) {
  const isTts = which === 'tts';
  $('tabTts').classList.toggle('is-on', isTts);
  $('tabStt').classList.toggle('is-on', !isTts);
  $('tabTts').setAttribute('aria-selected', String(isTts));
  $('tabStt').setAttribute('aria-selected', String(!isTts));
  $('panelTts').hidden = !isTts;
  $('panelStt').hidden = isTts;
}

// =============================================================================
// TEXT -> SPEECH
// =============================================================================

const HAS_TTS = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let currentUtterance = null;

function initTts() {
  if (!HAS_TTS) {
    $('ttsUnsupportedCard').hidden = false;
    $('ttsVoiceCard').hidden = true;
    $('ttsText').disabled = true;
    updateTtsButtons();
    return;
  }

  wireTtsControls();

  // getVoices() is synchronous but can return an empty list on first call in
  // many browsers, populating only later via the async 'voiceschanged'
  // event — which itself is known to fire late, or not at all, in some
  // engines. Try synchronously first, listen for the event, and fall back
  // to a short poll so a silent browser doesn't leave the user staring at
  // "Loading voices…" forever.
  populateVoices();
  renderVoiceState();

  if ('onvoiceschanged' in speechSynthesis) {
    speechSynthesis.onvoiceschanged = populateVoices;
  }

  let tries = 0;
  const poll = setInterval(() => {
    tries++;
    const list = speechSynthesis.getVoices() || [];
    if (list.length) {
      clearInterval(poll);
      populateVoices();
      return;
    }
    if (tries >= 10) {
      clearInterval(poll);
      state.voicesTimedOut = true;
      renderVoiceState();
      updateTtsButtons();
    }
  }, 300);

  updateEmptyHints();
  updateTtsButtons();
}

function wireTtsControls() {
  $('ttsText').addEventListener('input', updateEmptyHints);
  $('voiceSelect').addEventListener('change', updateTtsButtons);

  $('rateRange').addEventListener('input', () => {
    $('rateVal').textContent = parseFloat($('rateRange').value).toFixed(1) + '×';
  });
  $('pitchRange').addEventListener('input', () => {
    $('pitchVal').textContent = parseFloat($('pitchRange').value).toFixed(1);
  });
  $('volumeRange').addEventListener('input', () => {
    $('volumeVal').textContent = Math.round(parseFloat($('volumeRange').value) * 100) + '%';
  });

  $('ttsPlayBtn').addEventListener('click', ttsPlay);
  $('ttsPauseBtn').addEventListener('click', ttsPause);
  $('ttsResumeBtn').addEventListener('click', ttsResume);
  $('ttsStopBtn').addEventListener('click', ttsStop);
}

function populateVoices() {
  if (!HAS_TTS) return;
  const list = speechSynthesis.getVoices() || [];
  if (!list.length) return;
  state.voices = list;
  state.voicesTimedOut = false;
  buildVoiceSelect();
  renderVoiceState();
  updateTtsButtons();
}

function buildVoiceSelect() {
  const sel = $('voiceSelect');
  const prevURI = sel.value;
  sel.innerHTML = '';

  const prefix = (UI_LANG_TO_BCP47[lang] || 'en-US').split('-')[0].toLowerCase();
  const norm = (l) => (l || '').toLowerCase().replace('_', '-');
  const matching = state.voices.filter((v) => norm(v.lang).startsWith(prefix));
  const other = state.voices.filter((v) => !norm(v.lang).startsWith(prefix));

  const addGroup = (label, voices) => {
    if (!voices.length) return;
    const group = document.createElement('optgroup');
    group.label = label;
    voices.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} — ${v.lang}${v.default ? ' ★' : ''}`;
      group.appendChild(opt);
    });
    sel.appendChild(group);
  };

  addGroup(t(lang, 'voiceGroupMatching'), matching);
  addGroup(t(lang, 'voiceGroupOther'), other);

  // Keep the user's existing pick if it still exists (e.g. after a
  // voiceschanged re-population); otherwise default to a matching voice.
  if (prevURI && state.voices.some((v) => v.voiceURI === prevURI)) {
    sel.value = prevURI;
  } else if (matching.length) {
    sel.value = matching[0].voiceURI;
  }
}

function relabelVoiceSelect() {
  // Only the optgroup labels ("Matching this language" / "Other voices")
  // are translated UI chrome; rebuild them without disturbing the
  // selection, and without touching UI_LANG_TO_BCP47-based grouping (a UI
  // language switch alone shouldn't re-sort an already-chosen voice list).
  if (state.voices.length) buildVoiceSelect();
}

function renderVoiceState() {
  const has = state.voices.length > 0;
  $('voiceLoadingMsg').hidden = has || state.voicesTimedOut;
  $('noVoicesMsg').hidden = has || !state.voicesTimedOut;
  $('voiceSelect').hidden = !has;
}

function currentVoice() {
  const uri = $('voiceSelect').value;
  return state.voices.find((v) => v.voiceURI === uri) || null;
}

function ttsPlay() {
  if (!HAS_TTS) return;
  const text = $('ttsText').value.trim();
  if (!text) return;

  // Defensive: some browsers (notably Chrome) can leave speechSynthesis in
  // a stuck state after a previous error or a backgrounded tab; clearing
  // any queued utterance before speaking a fresh one avoids Play silently
  // doing nothing.
  speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  const voice = currentVoice();
  if (voice) utter.voice = voice;
  utter.rate = parseFloat($('rateRange').value) || 1;
  utter.pitch = parseFloat($('pitchRange').value) || 1;
  const vol = parseFloat($('volumeRange').value);
  utter.volume = Number.isNaN(vol) ? 1 : vol;

  utter.onstart = () => { state.ttsState = 'speaking'; updateTtsButtons(); };
  utter.onresume = () => { state.ttsState = 'speaking'; updateTtsButtons(); };
  utter.onpause = () => { state.ttsState = 'paused'; updateTtsButtons(); };
  utter.onend = () => { state.ttsState = 'idle'; currentUtterance = null; updateTtsButtons(); };
  utter.onerror = (e) => {
    state.ttsState = 'idle';
    currentUtterance = null;
    updateTtsButtons();
    // 'canceled'/'interrupted' happen on every ordinary Stop/replace — not
    // real failures, so only surface genuinely unexpected engine errors.
    if (e.error && e.error !== 'canceled' && e.error !== 'interrupted') {
      toast(t(lang, 'errOther', { error: e.error }), true);
    }
  };

  currentUtterance = utter;
  state.ttsState = 'speaking';
  updateTtsButtons();
  speechSynthesis.speak(utter);
}

function ttsPause() {
  if (!HAS_TTS || state.ttsState !== 'speaking') return;
  speechSynthesis.pause();
  state.ttsState = 'paused';
  updateTtsButtons();
}

function ttsResume() {
  if (!HAS_TTS || state.ttsState !== 'paused') return;
  speechSynthesis.resume();
  state.ttsState = 'speaking';
  updateTtsButtons();
}

function ttsStop() {
  if (!HAS_TTS) return;
  speechSynthesis.cancel();
  state.ttsState = 'idle';
  currentUtterance = null;
  updateTtsButtons();
}

function updateTtsButtons() {
  const hasText = $('ttsText').value.trim().length > 0;
  const blocked = !HAS_TTS || state.voices.length === 0;

  $('ttsPlayBtn').disabled = !hasText || blocked || state.ttsState !== 'idle';
  $('ttsPauseBtn').disabled = state.ttsState !== 'speaking';
  $('ttsResumeBtn').disabled = state.ttsState !== 'paused';
  $('ttsStopBtn').disabled = state.ttsState === 'idle';

  $('ttsStatus').textContent =
    state.ttsState === 'speaking' ? t(lang, 'ttsStatusSpeaking') :
    state.ttsState === 'paused' ? t(lang, 'ttsStatusPaused') :
    t(lang, 'ttsStatusIdle');
}

function updateEmptyHints() {
  const hasText = $('ttsText').value.trim().length > 0;
  $('ttsEmptyHint').hidden = hasText;
  updateTtsButtons();
}

// =============================================================================
// SPEECH -> TEXT
// =============================================================================

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
const HAS_STT = !!SpeechRecognitionCtor;

let recognition = null;

function initStt() {
  buildRecLangSelect();

  state.sttSupported = HAS_STT;
  state.sttSecure = !!window.isSecureContext;

  if (!HAS_STT) {
    $('sttUnsupportedCard').hidden = false;
    $('sttControlsCard').hidden = true;
  } else if (!state.sttSecure) {
    $('sttInsecureCard').hidden = false;
  }

  $('sttToggleBtn').addEventListener('click', toggleListening);
  $('copyBtn').addEventListener('click', copyTranscript);
  $('saveBtn').addEventListener('click', saveTranscript);
  $('clearBtn').addEventListener('click', clearTranscript);

  updateSttUI();
  renderTranscript();
}

function buildRecLangSelect() {
  const sel = $('sttLangSelect');
  const prev = sel.value;
  sel.innerHTML = '';
  REC_LANGS.forEach(({ code, key }) => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = `${t(lang, key)} (${code})`;
    sel.appendChild(opt);
  });
  const dflt = UI_LANG_TO_BCP47[lang] || 'en-US';
  sel.value = prev && REC_LANGS.some((r) => r.code === prev) ? prev : dflt;
}

function relabelRecLangSelect() {
  // Preserve the user's chosen recognition language across a UI-language
  // switch — only the option labels are re-translated, not the selection.
  const cur = $('sttLangSelect').value;
  buildRecLangSelect();
  if (cur) $('sttLangSelect').value = cur;
}

function createRecognition() {
  const rec = new SpeechRecognitionCtor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = $('sttLangSelect').value || UI_LANG_TO_BCP47[lang] || 'en-US';
  rec.onresult = handleSttResult;
  rec.onerror = handleSttError;
  rec.onend = handleSttEnd;
  return rec;
}

function toggleListening() {
  if (state.sttListening) stopListening();
  else startListening();
}

function startListening() {
  if (!HAS_STT || !state.sttSecure || state.sttListening) return;
  hideSttError();
  try {
    recognition = createRecognition();
    state.sttManualStop = false;
    recognition.start();
    state.sttListening = true;
    updateSttUI();
  } catch (e) {
    console.error(e);
    showSttError(t(lang, 'errOther', { error: (e && e.message) || String(e) }));
    state.sttListening = false;
    updateSttUI();
  }
}

function stopListening() {
  if (!recognition) return;
  state.sttManualStop = true;
  try { recognition.stop(); } catch (e) { /* already stopped */ }
}

function handleSttResult(event) {
  let interim = '';
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const res = event.results[i];
    const chunk = res[0] ? res[0].transcript : '';
    if (res.isFinal) {
      state.finalText += chunk + ' ';
    } else {
      interim += chunk;
    }
  }
  state.interimText = interim;
  renderTranscript();
}

function handleSttError(event) {
  const code = event.error;
  // A deliberate Stop can trail a harmless 'no-speech'/'aborted' event in
  // some engines — don't scare the user with an "error" for the exact
  // outcome they just asked for.
  if ((code === 'aborted' || code === 'no-speech') && state.sttManualStop) return;

  const map = {
    'no-speech': 'errNoSpeech',
    'network': 'errNetwork',
    'not-allowed': 'errNotAllowed',
    'service-not-allowed': 'errServiceNotAllowed',
    'audio-capture': 'errAudioCapture',
  };
  const key = map[code];
  const msg = key ? t(lang, key) : t(lang, 'errOther', { error: code || 'unknown' });
  showSttError(msg);
}

function handleSttEnd() {
  state.sttListening = false;
  recognition = null;
  updateSttUI();
}

function showSttError(msg) {
  const el = $('sttErrorMsg');
  el.textContent = msg;
  el.hidden = false;
}

function hideSttError() {
  const el = $('sttErrorMsg');
  el.hidden = true;
  el.textContent = '';
}

function renderTranscript() {
  $('finalSpan').textContent = state.finalText;
  $('interimSpan').textContent = state.interimText;
  const empty = !state.finalText && !state.interimText;
  $('transcriptBox').classList.toggle('is-empty', empty);
  // Copy/Save/Clear are no-ops on an empty transcript — disable rather than
  // let them be clicked with no visible effect.
  $('copyBtn').disabled = empty;
  $('saveBtn').disabled = empty;
  $('clearBtn').disabled = empty;
}

function updateSttUI() {
  const canStart = HAS_STT && state.sttSecure;
  const btn = $('sttToggleBtn');
  btn.disabled = !canStart;
  btn.classList.toggle('is-listening', state.sttListening);
  $('sttToggleLabel').textContent = state.sttListening ? t(lang, 'stopListeningBtn') : t(lang, 'startBtn');
  $('sttStateLabel').textContent = state.sttListening ? t(lang, 'sttListening') : t(lang, 'sttIdle');
  $('sttLangSelect').disabled = state.sttListening;
}

// --- transcript actions: copy / save / clear --------------------------------

function transcriptText() {
  return (state.finalText + state.interimText).trim();
}

async function copyTranscript() {
  const text = transcriptText();
  if (!text) return;
  try {
    if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard API unavailable');
    await navigator.clipboard.writeText(text);
    toast(t(lang, 'copiedToast'));
  } catch (e) {
    toast(t(lang, 'copyFailedToast'), true);
  }
}

function saveTranscript() {
  const text = transcriptText();
  if (!text) return;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `speech-to-text-${timestamp()}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(t(lang, 'savedToast'));
}

function clearTranscript() {
  state.finalText = '';
  state.interimText = '';
  renderTranscript();
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// --- toast --------------------------------------------------------------

let toastTimer = null;
function toast(msg, isError) {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = 'toast'), 3500);
}
