/**
 * app.js — Keyboard Ninja: solo typing practice + LAN typing race.
 *
 * Architecture:
 *  - typing-core.js holds every pure calculation (per-character diff,
 *    WPM/accuracy formulas, progress, completion) with zero DOM references,
 *    same "pure logic never touches the DOM" split as games/tic-tac-toe.
 *  - race.js owns all LAN race state/protocol (OGHNet wiring, countdown,
 *    progress broadcast, finish ranking) and never touches the DOM either —
 *    it calls back into this file's `onRaceChange` with a plain state
 *    object, which is the only thing that renders it.
 *  - This file is DOM + input glue: it owns the actual <input>, the running
 *    keystroke-accuracy counters (classifyAppends is called from exactly
 *    ONE place per mode, here), solo-mode's word queue, i18n wiring, sound,
 *    and OGHProfile (best WPM) persistence.
 *
 * Both solo and race modes share one <input> + one #passage element, one
 * per-character-span renderer (charSpansHtml), and one keystroke-accuracy
 * tally helper (tallyAppends) — the only real difference is WHAT the
 * current target string is and what happens on completion (advance to the
 * next word vs. finish the race).
 */
import { OGHNet } from '../../_shared/js/ogh-net.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import {
  LANGS, LANG_LABELS, RTL_LANGS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import {
  diffChars, classifyAppends, computeWPM, computeAccuracy, progressPct, isComplete,
  pickRandom, formatWpm, formatAccuracy,
} from './typing-core.js';
import { createRace } from './race.js';

const GAME_ID = 'keyboard-ninja';
const SESSION_MS = 60000;
const QUEUE_LEN = 8; // current word + this many upcoming, kept topped up
const SOUND_KEY = 'ogh_kn_key_sound';

const sfx = createOghSfx();
const $ = (id) => document.getElementById(id);

function qs(name) {
  try { return new URLSearchParams(location.search).get(name); } catch { return null; }
}

// ---- DOM refs --------------------------------------------------------
const netPill = $('netPill');
const wpmVal = $('wpmVal');
const accVal = $('accVal');
const timeVal = $('timeVal');
const bestVal = $('bestVal');
const btnSound = $('btnSound');
const btnMenu = $('btnMenu');
const langSwitchEl = $('langSwitch');

const typingView = $('typingView');
const passageEl = $('passage');
const typeInput = $('typeInput');
const raceTrack = $('raceTrack');
const raceLobby = $('raceLobby');
const lobbyRoomLine = $('lobbyRoomLine');
const lobbyRoster = $('lobbyRoster');
const btnStartRace = $('btnStartRace');

const modeOverlay = $('modeOverlay');
const btnModeSolo = $('btnModeSolo');
const btnModeRace = $('btnModeRace');

const resultOverlay = $('resultOverlay');
const resultWpmLine = $('resultWpmLine');
const resultAccLine = $('resultAccLine');
const newBestLine = $('newBestLine');
const resultBestLine = $('resultBestLine');
const btnPlayAgain = $('btnPlayAgain');
const btnResultMenu = $('btnResultMenu');

const raceResultOverlay = $('raceResultOverlay');
const raceResultTitle = $('raceResultTitle');
const leaderboardBody = $('leaderboardBody');
const btnRaceAgain = $('btnRaceAgain');
const btnRaceResultMenu = $('btnRaceResultMenu');

const countdownOverlay = $('countdownOverlay');
const countdownNum = $('countdownNum');

const BASE_VIEWS = [typingView, raceLobby];
const OVERLAYS = [modeOverlay, resultOverlay, raceResultOverlay, countdownOverlay];

function setBaseView(el) {
  BASE_VIEWS.forEach((v) => { v.hidden = v !== el; });
}
function setOverlay(el) {
  OVERLAYS.forEach((o) => { o.hidden = o !== el; });
}

// ---- shared helpers ----------------------------------------------------
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Renders `target` as one <span class="kn-ch"> per character, graded
 * against `typed` via typing-core's diffChars, with the next-to-type
 * character marked `.is-current` (blinking caret underline in CSS). Shared
 * by both solo (current word) and race (whole passage). */
function charSpansHtml(target, typed) {
  const diffed = diffChars(target, typed);
  const typedLen = Array.from(typed).length;
  return diffed.map((c, i) => {
    const cls = ['kn-ch', `is-${c.status}`];
    if (i === typedLen && c.status === 'pending') cls.push('is-current');
    return `<span class="${cls.join(' ')}">${escapeHtml(c.char)}</span>`;
  }).join('');
}

/** Sets RTL/LTR on the passage+input from the CONTENT language, which is
 * NOT necessarily the viewer's own UI language (race mode types the
 * starter's chosen passage). Verified empirically (see race.js / i18n.js
 * header comments) that a dir="rtl" span overlay + dir="rtl" input render
 * correctly with zero changes needed to the diff logic itself. */
function setContentDir(lang) {
  const rtl = RTL_LANGS.has(lang);
  passageEl.dir = rtl ? 'rtl' : 'ltr';
  typeInput.dir = rtl ? 'rtl' : 'ltr';
}

/** Tallies classifyAppends events from an input change into a running
 * {total, correct} counter (mutated in place) and plays the optional
 * per-keystroke sound. Used by both solo and race input handlers so
 * classifyAppends is only ever called from here. */
function tallyAppends(counter, target, oldValue, newValue) {
  const events = classifyAppends(target, oldValue, newValue);
  for (const ev of events) {
    counter.total++;
    if (ev.correct) counter.correct++;
    if (soundEnabled) sfx.play(ev.correct ? 'tap' : 'tick');
  }
  return events;
}

// ---- sound toggle --------------------------------------------------------
let soundEnabled = loadSoundPref();
function loadSoundPref() {
  try { return localStorage.getItem(SOUND_KEY) === '1'; } catch { return false; }
}
function saveSoundPref(v) {
  try { localStorage.setItem(SOUND_KEY, v ? '1' : '0'); } catch { /* ignore */ }
}
function updateSoundBtn() {
  btnSound.textContent = t(currentLang, soundEnabled ? 'soundOnLabel' : 'soundOffLabel');
}
btnSound.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  saveSoundPref(soundEnabled);
  updateSoundBtn();
  sfx.unlock();
  if (soundEnabled) sfx.play('tap');
});

// ---- i18n wiring --------------------------------------------------------
let currentLang = detectLang();

function buildLangSwitch() {
  langSwitchEl.innerHTML = '';
  for (const lang of LANGS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `lang-btn${lang === currentLang ? ' is-on' : ''}`;
    btn.textContent = LANG_LABELS[lang];
    btn.setAttribute('aria-pressed', lang === currentLang ? 'true' : 'false');
    btn.addEventListener('click', () => setLang(lang));
    langSwitchEl.appendChild(btn);
  }
}

function setLang(lang) {
  currentLang = lang;
  rememberLang(lang);
  applyStaticStrings(lang);
  buildLangSwitch();
  updateSoundBtn();
  updateHudStatic();
  // Re-render whichever dynamic view is currently visible so interpolated
  // strings (not covered by [data-i18n]) pick up the new language too.
  if (mode === 'solo' && !soloEnded) renderSoloPassage();
  if (!resultOverlay.hidden) renderSoloResults();
  if (mode === 'race' && raceController) renderRace(lastRaceState());
  if (!raceResultOverlay.hidden && raceController) renderLeaderboard(lastRaceState());
  updateNetPill();
}

function updateHudStatic() {
  bestVal.textContent = String(Math.round(soloBest));
}

/** Module-scoped (not a closure inside the boot IIFE) so setLang() can
 * refresh it too — otherwise the net-status pill would keep showing
 * whichever language was active the last time 'mode'/'players'/'hello'
 * happened to fire, instead of updating immediately like every other
 * piece of UI chrome does when the language switch is clicked. */
function updateNetPill() {
  if (!net) return;
  netPill.textContent = net.mode === 'online'
    ? `${t(currentLang, 'netOnline')} · ${net.room} · ${(net.players || []).length}p`
    : t(currentLang, 'netOffline');
}

// ---- content (word bank + sentence bank) --------------------------------
let content = null;
async function loadContent() {
  try {
    const res = await fetch(new URL('./data/content.json', import.meta.url));
    content = await res.json();
  } catch (e) {
    console.error('[keyboard-ninja] failed to load content.json', e);
    content = {
      words: { en: ['time', 'day', 'water', 'friend', 'happy', 'strong', 'quiet', 'light'] },
      sentences: { en: ['The quick brown fox jumps over the lazy dog.'] },
    };
  }
}
function wordsFor(lang) {
  return (content?.words?.[lang]?.length ? content.words[lang] : content?.words?.en) || ['type'];
}
function sentencesFor(lang) {
  return (content?.sentences?.[lang]?.length ? content.sentences[lang] : content?.sentences?.en) || ['Type this sentence.'];
}

// =========================================================================
// SOLO MODE
// =========================================================================
let soloQueue = [];
let soloContentLang = 'en'; // frozen per-session, see setLang() comment above
let soloStats = { total: 0, correct: 0 };
let soloStartTime = null;
let soloEnded = false;
let soloTickHandle = null;
let soloLastValue = '';
let soloBest = loadBest();

function loadBest() {
  const saved = OGHProfile.getProgress(GAME_ID);
  const n = Number(saved?.bestWpm);
  return Number.isFinite(n) ? n : 0;
}
function persistBest(bestWpm) {
  OGHProfile.saveProgress(
    GAME_ID,
    { bestWpm },
    { label: 'Keyboard Ninja', summary: `Best ${Math.round(bestWpm)} WPM` }
  );
}

function refillSoloQueue() {
  const bank = wordsFor(soloContentLang);
  while (soloQueue.length < QUEUE_LEN) {
    soloQueue.push(pickRandom(bank, soloQueue[soloQueue.length - 1]));
  }
}

function startSolo() {
  mode = 'solo';
  soloContentLang = currentLang;
  soloQueue = [];
  refillSoloQueue();
  soloStats = { total: 0, correct: 0 };
  soloStartTime = null;
  soloEnded = false;
  soloLastValue = '';
  clearInterval(soloTickHandle);

  setBaseView(typingView);
  setOverlay(null);
  raceTrack.hidden = true;
  setContentDir(soloContentLang);
  typeInput.disabled = false;
  typeInput.value = '';
  typeInput.placeholder = t(currentLang, 'readyHint');
  renderSoloPassage();
  updateSoloHud(0, SESSION_MS);
  typeInput.focus();
}

function renderSoloPassage() {
  const target = soloQueue[0] || '';
  const typed = soloEnded ? '' : typeInput.value;
  const upcoming = soloQueue.slice(1, QUEUE_LEN).join('   ');
  passageEl.innerHTML =
    `<span class="kn-current-word">${charSpansHtml(target, typed)}</span>` +
    (upcoming ? `<span class="kn-upcoming-words">${escapeHtml(upcoming)}</span>` : '');
}

function updateSoloHud(elapsedMs, remainMs) {
  const wpm = computeWPM(soloStats.total, elapsedMs);
  const acc = computeAccuracy(soloStats.correct, soloStats.total);
  wpmVal.textContent = String(formatWpm(wpm));
  accVal.textContent = String(formatAccuracy(acc));
  timeVal.textContent = String(Math.ceil(remainMs / 1000));
}

function onSoloInputEvent() {
  if (soloEnded) { typeInput.value = ''; return; }
  const newValueRaw = typeInput.value;
  const committing = newValueRaw.endsWith(' ') && !soloLastValue.endsWith(' ');
  const beforeSpace = committing ? newValueRaw.slice(0, -1) : newValueRaw;
  const target = soloQueue[0] || '';

  if (soloStartTime === null && beforeSpace.length > 0) {
    soloStartTime = Date.now();
    soloTickHandle = setInterval(soloTick, 200);
  }

  tallyAppends(soloStats, target, soloLastValue.endsWith(' ') ? '' : soloLastValue, beforeSpace);
  soloLastValue = beforeSpace;

  if (committing) {
    soloQueue.shift();
    refillSoloQueue();
    typeInput.value = '';
    soloLastValue = '';
  }
  renderSoloPassage();
  const elapsed = soloStartTime === null ? 0 : Date.now() - soloStartTime;
  updateSoloHud(elapsed, SESSION_MS - elapsed);
}

function soloTick() {
  if (soloStartTime === null || soloEnded) return;
  const elapsed = Date.now() - soloStartTime;
  const remain = SESSION_MS - elapsed;
  updateSoloHud(elapsed, Math.max(0, remain));
  if (remain <= 0) endSolo();
}

function endSolo() {
  if (soloEnded) return;
  soloEnded = true;
  clearInterval(soloTickHandle);
  typeInput.disabled = true;
  const elapsed = soloStartTime === null ? 0 : Math.min(SESSION_MS, Date.now() - soloStartTime);
  const wpm = computeWPM(soloStats.total, elapsed || SESSION_MS);
  const acc = computeAccuracy(soloStats.correct, soloStats.total);
  const isNewBest = wpm > soloBest;
  if (isNewBest) {
    soloBest = wpm;
    persistBest(soloBest);
  }
  sfx.play('win');
  showSoloResults({ wpm, acc, isNewBest });
}

let lastSoloResult = null;
function showSoloResults(result) {
  if (result) lastSoloResult = result;
  renderSoloResults();
  setOverlay(resultOverlay);
}
function renderSoloResults() {
  if (!lastSoloResult) return;
  const { wpm, acc, isNewBest } = lastSoloResult;
  resultWpmLine.textContent = t(currentLang, 'resultsWpmLine', { wpm: formatWpm(wpm) });
  resultAccLine.textContent = t(currentLang, 'resultsAccuracyLine', { acc: formatAccuracy(acc) });
  newBestLine.hidden = !isNewBest;
  resultBestLine.textContent = t(currentLang, 'resultsBestLine', { best: formatWpm(soloBest) });
  bestVal.textContent = String(Math.round(soloBest));
}

// =========================================================================
// RACE MODE
// =========================================================================
let raceController = null;
let raceStats = { total: 0, correct: 0 };
let raceLastValue = '';
let lastRacePhase = null;
let lastRaceStateCache = null;

function pickSentence() {
  return { text: pickRandom(sentencesFor(currentLang)), lang: currentLang };
}

function lastRaceState() {
  return lastRaceStateCache;
}

function enterRaceMode() {
  mode = 'race';
  if (!raceController) return; // net not ready yet (extremely small boot window)
  raceController.reset();
}

function onRaceChange(state) {
  lastRaceStateCache = state;
  // raceController is wired to OGHNet as soon as it's constructed (so it
  // can track roster/progress even before the player ever opens LAN Race),
  // and race.js's OWN phase defaults to 'lobby' — so a routine roster
  // broadcast can fire this callback well before the user has chosen a
  // mode at all. Only let it drive the shared base-view/overlay DOM when
  // this app is actually showing race UI right now; otherwise just cache
  // the state so it's ready the moment enterRaceMode() does render it.
  // Mirrors the same `mode === 'race'` guard setLang() already uses below.
  if (mode === 'race') renderRace(state);
}

function renderLobbyRoster(players) {
  lobbyRoomLine.textContent = t(currentLang, 'raceWaitingRoom', { room: net?.room || '?', n: players.length });
  lobbyRoster.innerHTML = players.length
    ? players.map((p) => {
        const youTag = p.isYou ? ` (${t(currentLang, 'raceYouTag')})` : '';
        return `<li class="${p.isYou ? 'you' : ''}">${escapeHtml(p.name)}${youTag}</li>`;
      }).join('')
    : '<li>…</li>';
}

function renderTrack(players) {
  raceTrack.innerHTML = players.map((p) => {
    const rowCls = ['kn-track-row'];
    if (p.isYou) rowCls.push('is-you');
    if (p.finished) rowCls.push('is-finished');
    const pct = Math.max(0, Math.min(100, p.pct || 0));
    return `
      <div class="${rowCls.join(' ')}">
        <div class="kn-track-name">${escapeHtml(p.name)}</div>
        <div class="kn-bar"><div class="kn-bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
        <div class="kn-track-wpm">${formatWpm(p.wpm || 0)}</div>
      </div>`;
  }).join('');
}

function renderRace(state) {
  if (!state) return;
  const { phase, players, countdownN } = state;
  const enteringPhase = phase !== lastRacePhase;

  if (phase === 'lobby') {
    setBaseView(raceLobby);
    setOverlay(null);
    raceTrack.hidden = true;
    renderLobbyRoster(players);
  } else {
    setBaseView(typingView);
    raceTrack.hidden = false;
    renderTrack(players);

    if (phase === 'countdown') {
      if (enteringPhase) {
        setContentDir(state.lang);
        raceStats = { total: 0, correct: 0 };
        raceLastValue = '';
        typeInput.value = '';
        typeInput.disabled = true;
        renderRacePassage('');
      }
      setOverlay(countdownOverlay);
      countdownNum.textContent = countdownN > 0 ? String(countdownN) : t(currentLang, 'raceGo');
    } else if (phase === 'racing') {
      if (enteringPhase) {
        setOverlay(null);
        typeInput.disabled = false;
        typeInput.focus();
      }
      const me = players.find((p) => p.isYou);
      typeInput.disabled = !!me?.finished;
      updateRaceHud(me);
    } else if (phase === 'ended') {
      setOverlay(raceResultOverlay);
      // The overlay backdrop already visually covers the input, but disable
      // it too (belt-and-suspenders, matching solo mode's endSolo()): once
      // a round is over, further keystrokes should never be reachable, not
      // just visually obscured.
      typeInput.disabled = true;
      renderLeaderboard(state);
    }
  }
  lastRacePhase = phase;
}

function updateRaceHud(me) {
  wpmVal.textContent = String(formatWpm(me?.wpm || 0));
  accVal.textContent = String(formatAccuracy(me?.accuracy ?? 100));
  timeVal.textContent = String(Math.round(me?.pct || 0)) + '%';
}

function renderRacePassage(typed) {
  const target = raceController ? raceController.getText() : '';
  passageEl.innerHTML = charSpansHtml(target, typed);
}

function onRaceInputEvent() {
  if (!raceController || raceController.getPhase() !== 'racing') return;
  const newValue = typeInput.value;
  const target = raceController.getText();
  tallyAppends(raceStats, target, raceLastValue, newValue);
  raceLastValue = newValue;
  renderRacePassage(newValue);
  raceController.handleLocalInput(newValue, raceStats.total, raceStats.correct);
}

function renderLeaderboard(state) {
  const results = raceController ? raceController.rankedResults() : [];
  raceResultTitle.textContent = t(currentLang, state?.timeUp ? 'raceTimeUpBanner' : 'raceLeaderboardTitle');
  leaderboardBody.innerHTML = results.map((p) => {
    const rowCls = [];
    if (p.isYou) rowCls.push('is-you');
    if (!p.finished) rowCls.push('is-unfinished');
    const rankCell = p.finished ? String(p.rank) : '—';
    const wpmCell = p.finished ? formatWpm(p.wpm) : '—';
    const accCell = p.finished ? `${formatAccuracy(p.accuracy)}%` : `${Math.round(p.pct)}%`;
    return `
      <tr class="${rowCls.join(' ')}">
        <td class="kn-lb-rank">${rankCell}</td>
        <td>${escapeHtml(p.name)}${p.isYou ? ` (${t(currentLang, 'raceYouTag')})` : ''}</td>
        <td>${wpmCell}</td>
        <td>${accCell}</td>
      </tr>`;
  }).join('');
}

// ---- menu / navigation ---------------------------------------------------
let mode = 'menu'; // 'menu' | 'solo' | 'race'

function stopEverything() {
  clearInterval(soloTickHandle);
  soloEnded = true;
  typeInput.disabled = true;
  if (raceController) raceController.reset();
}

function showMenu() {
  stopEverything();
  mode = 'menu';
  setBaseView(null);
  setOverlay(modeOverlay);
}

// ---- button wiring ---------------------------------------------------
btnModeSolo.addEventListener('click', () => {
  sfx.unlock();
  sfx.play('tap');
  startSolo();
});
btnModeRace.addEventListener('click', () => {
  sfx.unlock();
  sfx.play('tap');
  enterRaceMode();
});
btnStartRace.addEventListener('click', () => {
  sfx.unlock();
  raceController?.startRace();
});
btnMenu.addEventListener('click', showMenu);
btnResultMenu.addEventListener('click', showMenu);
btnRaceResultMenu.addEventListener('click', showMenu);
btnPlayAgain.addEventListener('click', () => {
  setOverlay(null);
  startSolo();
});
btnRaceAgain.addEventListener('click', () => {
  setOverlay(null);
  raceController?.reset();
});

typeInput.addEventListener('input', () => {
  sfx.unlock();
  if (mode === 'solo') onSoloInputEvent();
  else if (mode === 'race') onRaceInputEvent();
});

// ---- kickoff --------------------------------------------------------------
buildLangSwitch();
applyStaticStrings(currentLang);
updateSoundBtn();
updateHudStatic();
bestVal.textContent = String(Math.round(soloBest));

// Mode buttons are only meaningful once content.json (solo) and OGHNet/
// raceController (race) are ready. Both resolve in well under a second in
// practice, but the mode overlay is visible and clickable immediately on
// load (before that async work even starts), so without this a very fast
// click — or an automated test — could hit enterRaceMode() while
// raceController is still null and silently no-op.
btnModeSolo.disabled = true;
btnModeRace.disabled = true;

let net = null;

(async () => {
  await loadContent();

  net = await OGHNet.connect({
    gameId: GAME_ID,
    name: qs('name') || OGHProfile.getNickname(),
  });

  updateNetPill();
  net.on('mode', updateNetPill);
  net.on('players', updateNetPill);
  net.on('hello', updateNetPill);

  raceController = createRace({
    net,
    sfx,
    pickSentence,
    onChange: onRaceChange,
  });

  btnModeSolo.disabled = false;
  btnModeRace.disabled = false;

  // Debug/test hook — same convention as sibling games (games/tic-tac-toe's
  // window.OGH_TTT, games/pop-the-bugs' window.OGH_POP_BUGS, games/doodle-
  // guess's window.OGH_DOODLE): lets a test harness drive/inspect the game
  // without going through click/keyboard events for every single check.
  window.OGH_KEYBOARD_NINJA = {
    getMode: () => mode,
    getLang: () => currentLang,
    setLang,
    getContent: () => content,
    getNet: () => net,
    getRace: () => raceController,
    solo: {
      start: startSolo,
      getQueue: () => soloQueue,
      getStats: () => ({ ...soloStats }),
      getStartTime: () => soloStartTime,
      forceEnd: endSolo,
    },
    typeInput,
    showMenu,
  };
})();
