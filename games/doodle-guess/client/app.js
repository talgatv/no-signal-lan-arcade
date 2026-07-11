/**
 * Doodle Guess — LAN draw-and-guess party game.
 *
 * One player draws on a live canvas everyone else watches in real time; the
 * others type guesses; the first correct guess scores. Two modes share the
 * same drawing/guessing/round engine:
 *   - 'bank': the game deals the drawer a random word from data/words.json
 *     (100+ concepts x 6 languages) — nobody picks.
 *   - 'your': the drawer secretly types their own word.
 *
 * NETWORK MODEL (built on the repo's OGHNet room relay — same pattern as
 * programs/lan-chat and games/piece-caller: net.send(action,payload)
 * broadcasts to everyone else; net.on('action', ...) receives; the app does
 * its own recipient filtering). There is no central authority beyond "the
 * current drawer owns the round":
 *
 *   - The HOST only kicks off the session (picks the mode, presses Start) and
 *     names the first drawer. Turn ORDER is derived deterministically from the
 *     roster (players sorted by id), so every client agrees who is next.
 *   - The current DRAWER owns their round: it holds the secret word (never
 *     broadcast in cleartext until the reveal), starts the timer, validates
 *     incoming guesses against the word, and ends the round (correct/timeout),
 *     broadcasting the reveal + score deltas + who draws next. Every client
 *     applies the SAME round-end deltas, so scoreboards stay in sync without a
 *     server tallying anything.
 *
 * WORD SECRECY (a real correctness requirement, see test step 6): the secret
 * word lives only in state.secret on the drawer's client. The only word-shaped
 * thing that ever goes on the wire before the reveal is its LENGTH (wordLen),
 * used to render the underscore hint. The concept INDEX is likewise never
 * broadcast in 'bank' mode (a guesser could look it up in words.json). The
 * plaintext word appears on the wire exactly once: inside the round-end reveal
 * message, which is intentional.
 *
 * Every outgoing/incoming game message is mirrored into sentMessages /
 * recvMessages (exposed on window.OGH_DOODLE) so a test can inspect the actual
 * payloads and assert the word never leaked.
 */
import { OGHNet } from '../../_shared/js/ogh-net.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import {
  LANGS, LANG_LABELS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';
import { createDrawSurface, PALETTE, BRUSH_SIZES, ERASER } from './canvas-sync.js';

const GAME_ID = 'doodle-guess';
const $ = (id) => document.getElementById(id);

/* --- tunables --- */
const ROUND_SECONDS = 75;      // within the suggested 60–90s window
const REVEAL_MS = 4500;        // pause on the reveal card before the next turn
const GUESS_BASE = 50;         // points a correct guesser always gets
const GUESS_SPEED_BONUS = 50;  // extra points scaled by time remaining
const DRAWER_BONUS = 25;       // drawer's reward when someone guesses right
const MAX_GUESS_LEN = 40;
const FEED_CAP = 120;

const sfx = createOghSfx();
let lang = detectLang();
let WORDS = null; // { en:[...], ru:[...], ... } from data/words.json

/* --- test/inspection instrumentation --- */
const sentMessages = [];
const recvMessages = [];

let net = null;

const state = {
  phase: 'lobby',        // lobby | choosing | drawing | reveal
  mode: 'bank',          // 'bank' | 'your'
  drawerId: null,
  isDrawer: false,
  secret: null,          // DRAWER ONLY: { text, index|null } — never broadcast pre-reveal
  wordLen: 0,
  durationSec: ROUND_SECONDS,
  roundEndsAtLocal: 0,   // each client computes = now + duration on receipt (skew-proof)
  roundEnded: false,     // drawer guard so only the first correct guess counts
  scores: new Map(),     // playerId -> points (kept identical on every client via shared deltas)
  names: new Map(),      // playerId -> display name
  revealTimer: null,
  nextTurnTimer: null,
};

/* ------------------------------------------------------------------ *
 * DOM refs
 * ------------------------------------------------------------------ */
const canvas = $('board');
const hudRound = $('hudRound');
const hudWord = $('hudWord');
const hudTime = $('hudTime');
const netLine = $('netLine');
const tools = $('tools');
const feedEl = $('feed');
const scoreListEl = $('scoreList');
const guessForm = $('guessForm');
const guessInput = $('guessInput');
const guessBtn = $('guessBtn');
const choosingNote = $('choosingNote');
const overlayStart = $('overlayStart');
const overlayChoose = $('overlayChoose');
const overlayReveal = $('overlayReveal');

let surface = null;

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function myId() { return net ? net.playerId : 'local'; }
function qsParam(name) {
  try { return new URLSearchParams(location.search).get(name); } catch { return null; }
}
// Prefer an explicit ?name= (handy for a shared LAN link, and lets two tabs
// on one origin be distinct people even though they share the profile
// nickname in localStorage); otherwise use the local profile nickname.
function myName() { return (qsParam('name') || '').trim().slice(0, 24) || OGHProfile.getNickname(); }

function orderedPlayers() {
  const list = (net?.players || []).slice();
  list.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return list;
}
function nameOf(id) {
  if (id === myId()) return myName();
  const p = (net?.players || []).find((x) => x.id === id);
  return p?.name || state.names.get(id) || 'Player';
}
function firstDrawerId() {
  const o = orderedPlayers();
  return o.length ? o[0].id : myId();
}
// The "starter" (session coordinator) is derived deterministically as the
// first player by id — every client computes the same answer from the shared
// roster, so it's more robust than net.isHost (which the relay never refreshes
// after a host reassignment). The starter is also the first drawer.
function isStarter() {
  return firstDrawerId() === myId();
}
function nextDrawerIdAfter(id) {
  const o = orderedPlayers();
  if (!o.length) return myId();
  const i = o.findIndex((p) => p.id === id);
  return o[(i + 1 + o.length) % o.length].id;
}

/** Broadcast a game action + mirror it for inspection (see file header). */
function sendMsg(action, payload = {}) {
  sentMessages.push({ action, payload, t: Date.now() });
  if (net && net.mode === 'online') net.send(action, payload);
}

/* ------------------------------------------------------------------ *
 * Word selection + matching
 * ------------------------------------------------------------------ */
function wordListFor(lg) {
  return (WORDS && WORDS[lg]) || (WORDS && WORDS.en) || [];
}
function pickBankWord(index) {
  const list = wordListFor(lang);
  const i = (typeof index === 'number' && index >= 0 && index < list.length)
    ? index
    : Math.floor(Math.random() * list.length);
  return { text: list[i], index: i };
}

function normalize(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    // strip common diacritics for latin scripts so "árbol" ~ "arbol"
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}
/** Levenshtein edit distance (small strings). */
function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    let cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}
/** Case-insensitive match with a light typo tolerance (1 edit for 4–5 char
 *  words, 2 for 6+). Exact match always wins. */
function fuzzyEq(guess, target) {
  const g = normalize(guess);
  const w = normalize(target);
  if (!g || !w) return false;
  if (g === w) return true;
  const len = [...w].length;
  const tol = len >= 6 ? 2 : len >= 4 ? 1 : 0;
  return tol > 0 && editDistance(g, w) <= tol;
}
/** Does a guess match the drawer's secret? In 'bank' mode we accept the same
 *  concept in ANY of the 6 languages (words.json is concept-indexed), so a
 *  mixed-language room still works; in 'your' mode only the typed word. */
function guessMatches(guess) {
  if (!state.secret) return false;
  if (state.mode === 'bank' && typeof state.secret.index === 'number' && WORDS) {
    for (const lg of LANGS) {
      const list = WORDS[lg];
      const target = list && list[state.secret.index];
      if (target && fuzzyEq(guess, target)) return true;
    }
    return false;
  }
  return fuzzyEq(guess, state.secret.text);
}

/* ------------------------------------------------------------------ *
 * Phase / UI transitions
 * ------------------------------------------------------------------ */
function hideAllOverlays() {
  overlayStart.hidden = true;
  overlayChoose.hidden = true;
  overlayReveal.hidden = true;
  choosingNote.hidden = true;
}

function setGuessEnabled(on) {
  guessInput.disabled = !on;
  guessBtn.disabled = !on;
  guessForm.classList.toggle('is-off', !on);
}

function wordHint(len) {
  return Array.from({ length: len }, () => '_').join(' ');
}

function updateHud() {
  const d = state.drawerId;
  if (state.phase === 'lobby' || !d) {
    hudRound.textContent = net?.mode === 'online' ? t(lang, 'waitingPlayers') : t(lang, 'netOffline');
    hudWord.hidden = true;
    hudTime.hidden = true;
    return;
  }
  if (state.isDrawer) {
    hudRound.textContent = t(lang, 'yourTurnTitle');
  } else {
    hudRound.textContent = t(lang, 'watchingHint', { name: nameOf(d) });
  }
  // Word pill: drawer sees the real word (local only), guessers see blanks.
  if (state.phase === 'drawing' || state.phase === 'reveal') {
    hudWord.hidden = false;
    const label = t(lang, 'wordLabel');
    if (state.isDrawer && state.secret) hudWord.innerHTML = `${label}: <strong>${escapeHtml(state.secret.text)}</strong>`;
    else hudWord.innerHTML = `${label}: <strong class="dg-blanks">${wordHint(state.wordLen)}</strong>`;
  } else {
    hudWord.hidden = true;
  }
}

function updateNetLine() {
  const online = net?.mode === 'online';
  const bits = [];
  if (online) {
    bits.push(t(lang, 'netOnline'));
    bits.push(t(lang, 'roomTag', { room: net.room }));
    bits.push(t(lang, 'playersTag', { n: net.players?.length || 1 }));
  } else {
    bits.push(t(lang, 'netOffline'));
  }
  netLine.textContent = bits.join(' · ');
  netLine.classList.toggle('online', online);
  netLine.classList.toggle('offline', !online);
}

/** Lobby / start screen. Host picks mode + starts once ≥2 players present. */
function showLobby() {
  state.phase = 'lobby';
  state.drawerId = null;
  state.isDrawer = false;
  state.secret = null;
  clearTimers();
  hideAllOverlays();
  overlayStart.hidden = false;
  tools.hidden = true;
  setGuessEnabled(false);
  surface.setInteractive(false);
  surface.clearLocal();
  updateStartButton();
  updateHud();
}

function updateStartButton() {
  const online = net?.mode === 'online';
  const enough = online && (net.players?.length || 0) >= 2;
  const btn = $('btnStart');
  const note = $('startNote');
  $('modeDesc').textContent = t(lang, state.mode === 'bank' ? 'modeWordBankDesc' : 'modeYourWordDesc');
  if (!online) {
    btn.disabled = true;
    note.textContent = t(lang, 'netOffline');
  } else if (!enough) {
    btn.disabled = true;
    note.textContent = t(lang, 'needTwo');
  } else if (!isStarter()) {
    btn.disabled = true;
    note.textContent = t(lang, 'waitingHostStart', { name: nameOf(firstDrawerId()) });
  } else {
    btn.disabled = false;
    note.textContent = '';
  }
}

function clearTimers() {
  if (state.revealTimer) { clearTimeout(state.revealTimer); state.revealTimer = null; }
  if (state.nextTurnTimer) { clearTimeout(state.nextTurnTimer); state.nextTurnTimer = null; }
}

/** Starter-only: start the whole session. */
function hostStartGame() {
  if (!net || net.mode !== 'online' || !isStarter()) return;
  if ((net.players?.length || 0) < 2) return;
  const first = firstDrawerId();
  sfx.unlock();
  sendMsg('game-begin', { firstDrawerId: first, mode: state.mode });
  beginTurn(first, state.mode);
}

/** Everyone: a new drawer's turn begins — they are choosing a word. */
function beginTurn(drawerId, mode) {
  clearTimers();
  state.mode = mode || state.mode;
  state.drawerId = drawerId;
  state.isDrawer = drawerId === myId();
  state.secret = null;
  state.wordLen = 0;
  state.roundEnded = false;
  state.phase = 'choosing';
  hideAllOverlays();
  tools.hidden = true;
  setGuessEnabled(false);
  surface.setInteractive(false);
  surface.clearLocal();

  if (state.isDrawer) {
    openChooseOverlay();
  } else {
    choosingNote.hidden = false;
    choosingNote.textContent = t(lang, 'choosingWord', { name: nameOf(drawerId) });
    sfx.play('tick');
  }
  updateHud();
  renderScores();
}

/** Drawer's private word-choose overlay. */
function openChooseOverlay() {
  overlayChoose.hidden = false;
  $('chooseTitle').textContent = t(lang, state.mode === 'bank' ? 'chooseBankTitle' : 'typeSecretTitle');
  const bank = $('bankChoose');
  const your = $('yourChoose');
  if (state.mode === 'bank') {
    bank.hidden = false;
    your.hidden = true;
    state.secret = pickBankWord();
    $('bankWord').textContent = state.secret.text;
  } else {
    bank.hidden = true;
    your.hidden = false;
    state.secret = null;
    $('secretInput').value = '';
    setTimeout(() => $('secretInput').focus(), 50);
  }
  sfx.play('place');
}

/** Drawer confirms the word and the drawing round goes live. */
function drawerStartRound() {
  if (!state.isDrawer) return;
  if (state.mode === 'your') {
    const typed = $('secretInput').value.trim().slice(0, MAX_GUESS_LEN);
    if (!typed) { $('secretInput').focus(); return; }
    state.secret = { text: typed, index: null };
  }
  if (!state.secret) return;
  state.wordLen = [...state.secret.text].length;
  state.durationSec = ROUND_SECONDS;
  state.roundEndsAtLocal = Date.now() + state.durationSec * 1000;
  state.roundEnded = false;
  state.phase = 'drawing';

  hideAllOverlays();
  surface.clearLocal();
  surface.setInteractive(true);
  tools.hidden = false;
  setGuessEnabled(false); // the drawer never guesses their own word

  // Broadcasts LENGTH only — never the word or (in bank mode) the index.
  sendMsg('round-live', {
    drawerId: myId(),
    durationSec: state.durationSec,
    wordLen: state.wordLen,
    mode: state.mode,
  });
  sfx.play('pickup');
  addSystem(t(lang, 'youDrawingHint'));
  updateHud();
}

/** Guessers: the drawer went live — start watching + guessing. */
function onRoundLive(payload, from) {
  const drawerId = payload.drawerId || from;
  state.drawerId = drawerId;
  state.isDrawer = drawerId === myId();
  state.mode = payload.mode || state.mode;
  state.wordLen = payload.wordLen || 0;
  state.durationSec = payload.durationSec || ROUND_SECONDS;
  // Compute the deadline from LOCAL receipt time, not the sender's clock, so
  // device clock skew can't desync the countdown. The drawer stays the
  // authority for actually ending the round.
  state.roundEndsAtLocal = Date.now() + state.durationSec * 1000;
  state.roundEnded = false;
  state.phase = 'drawing';

  hideAllOverlays();
  tools.hidden = true;
  surface.setInteractive(false);
  surface.clearLocal();
  if (!state.isDrawer) setGuessEnabled(true);
  sfx.play('pickup');
  addSystem(t(lang, 'watchingHint', { name: nameOf(drawerId) }));
  if (!state.isDrawer) setTimeout(() => guessInput.focus(), 30);
  updateHud();
}

/** Drawer authority: end the round (correct guess or timeout), reveal + score. */
function endRound(reason, info = {}) {
  if (!state.isDrawer || state.roundEnded) return;
  state.roundEnded = true;
  const nextId = nextDrawerIdAfter(state.drawerId);
  const deltas = {};
  let guesserId = null;
  let guesserName = null;
  let remaining = 0;
  if (reason === 'correct') {
    guesserId = info.guesserId;
    guesserName = info.guesserName || nameOf(guesserId);
    remaining = Math.max(0, info.remainingSec || 0);
    const frac = state.durationSec ? Math.min(1, remaining / state.durationSec) : 0;
    deltas[guesserId] = GUESS_BASE + Math.round(frac * GUESS_SPEED_BONUS);
    deltas[state.drawerId] = (deltas[state.drawerId] || 0) + DRAWER_BONUS;
  }
  sendMsg('round-end', {
    reason,
    drawerId: state.drawerId,
    nextDrawerId: nextId,
    word: state.secret ? state.secret.text : '',
    index: state.secret ? state.secret.index : null,
    guesserId,
    guesserName,
    remainingSec: remaining,
    deltas,
  });
  applyRoundEnd({
    reason, drawerId: state.drawerId, nextDrawerId: nextId,
    word: state.secret ? state.secret.text : '', guesserId, guesserName,
    remainingSec: remaining, deltas,
  });
}

/** Everyone: apply a round-end — reveal word, add score deltas, schedule next. */
function applyRoundEnd(p) {
  clearTimers();
  state.phase = 'reveal';
  state.roundEnded = true;
  surface.setInteractive(false);
  tools.hidden = true;
  setGuessEnabled(false);

  // Apply the SAME deltas on every client -> identical scoreboards.
  for (const [id, pts] of Object.entries(p.deltas || {})) {
    state.scores.set(id, (state.scores.get(id) || 0) + pts);
  }
  renderScores();

  $('revealWord').textContent = p.word || '?';
  if (p.reason === 'correct') {
    $('revealLine').textContent = t(lang, 'guessedIn', {
      name: p.guesserId === myId() ? t(lang, 'youTag') : nameOf(p.guesserId),
      sec: p.remainingSec,
    });
    addSystem(t(lang, 'correctBanner', { name: p.guesserId === myId() ? t(lang, 'youTag') : nameOf(p.guesserId) }), 'correct');
    sfx.play(p.guesserId === myId() ? 'win' : 'pickup');
    flashBanner(p.guesserId === myId() ? t(lang, 'youGotIt') : t(lang, 'correctBanner', { name: nameOf(p.guesserId) }));
  } else {
    $('revealLine').textContent = t(lang, 'nobodyGuessed');
    addSystem(t(lang, 'nobodyGuessed'), 'system');
    sfx.play('die');
  }
  overlayReveal.hidden = false;
  hudTime.hidden = true;

  // Countdown to the next turn, then transition (everyone computed the same
  // nextDrawerId from this message, so no further broadcast is needed).
  let n = Math.ceil(REVEAL_MS / 1000);
  $('nextIn').textContent = t(lang, 'nextIn', { n });
  const tick = setInterval(() => {
    n -= 1;
    if (n <= 0) { clearInterval(tick); return; }
    $('nextIn').textContent = t(lang, 'nextIn', { n });
  }, 1000);
  state.nextTurnTimer = setTimeout(() => {
    clearInterval(tick);
    beginTurn(p.nextDrawerId, state.mode);
  }, REVEAL_MS);
  updateHud();
}

/* ------------------------------------------------------------------ *
 * Guessing
 * ------------------------------------------------------------------ */
function submitGuess() {
  if (state.phase !== 'drawing' || state.isDrawer) return;
  const text = guessInput.value.trim().slice(0, MAX_GUESS_LEN);
  if (!text) return;
  guessInput.value = '';
  addGuess(myName(), text, true);
  sendMsg('guess', { name: myName(), text });
  // Correctness is judged by the drawer (the only client that knows the word);
  // we just wait for their round-end 'correct' broadcast.
}

function onGuess(payload, from) {
  const name = payload.name || nameOf(from);
  state.names.set(from, name);
  addGuess(name, payload.text || '', false);
  sfx.play('tick');
  // Only the drawer validates, and only while the round is live.
  if (state.isDrawer && state.phase === 'drawing' && !state.roundEnded) {
    if (guessMatches(payload.text || '')) {
      const remainingSec = Math.max(0, Math.round((state.roundEndsAtLocal - Date.now()) / 1000));
      endRound('correct', { guesserId: from, guesserName: name, remainingSec });
    }
  }
}

/* ------------------------------------------------------------------ *
 * Feed + scoreboard + banner
 * ------------------------------------------------------------------ */
function trimFeed() {
  while (feedEl.childElementCount > FEED_CAP) feedEl.removeChild(feedEl.firstChild);
}
function addGuess(name, text, mine) {
  const div = document.createElement('div');
  div.className = 'dg-msg' + (mine ? ' mine' : '');
  div.innerHTML = `<span class="dg-msg-who">${escapeHtml(name)}</span><span class="dg-msg-text">${escapeHtml(text)}</span>`;
  feedEl.appendChild(div);
  trimFeed();
  feedEl.scrollTop = feedEl.scrollHeight;
}
function addSystem(text, kind = 'system') {
  const div = document.createElement('div');
  div.className = `dg-msg dg-sys ${kind === 'correct' ? 'dg-correct' : ''}`;
  div.textContent = text;
  feedEl.appendChild(div);
  trimFeed();
  feedEl.scrollTop = feedEl.scrollHeight;
}
function flashBanner(text) {
  const el = choosingNote;
  el.hidden = false;
  el.textContent = text;
  el.classList.add('dg-flash');
  setTimeout(() => { el.classList.remove('dg-flash'); if (state.phase === 'reveal') el.hidden = true; }, 1400);
}

function renderScores() {
  // union of roster + anyone who has scored
  const ids = new Set();
  (net?.players || []).forEach((p) => { ids.add(p.id); state.names.set(p.id, p.name || state.names.get(p.id) || 'Player'); });
  state.scores.forEach((_, id) => ids.add(id));
  const rows = [...ids].map((id) => ({ id, score: state.scores.get(id) || 0 }));
  rows.sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
  scoreListEl.innerHTML = rows.map((r) => {
    const isYou = r.id === myId();
    const isDrawer = r.id === state.drawerId && (state.phase === 'drawing' || state.phase === 'choosing');
    const tags = [];
    if (isYou) tags.push(`<span class="dg-tag dg-you">${escapeHtml(t(lang, 'youTag'))}</span>`);
    if (isDrawer) tags.push(`<span class="dg-tag dg-draw">${escapeHtml(t(lang, 'drawingTag'))}</span>`);
    return `<li class="${isYou ? 'is-you' : ''}">
      <span class="dg-sc-name">${escapeHtml(nameOf(r.id))}${tags.join('')}</span>
      <span class="dg-sc-pts">${r.score} <span class="dg-pts-suffix">${escapeHtml(t(lang, 'ptsSuffix'))}</span></span>
    </li>`;
  }).join('');
}

/* ------------------------------------------------------------------ *
 * Timer loop (drawer is the authority for actually ending on timeout)
 * ------------------------------------------------------------------ */
function tick() {
  if (state.phase === 'drawing') {
    const remaining = Math.max(0, state.roundEndsAtLocal - Date.now());
    hudTime.hidden = false;
    const secs = Math.ceil(remaining / 1000);
    hudTime.innerHTML = `${t(lang, 'timeLabel')}: <strong>${secs}</strong>`;
    hudTime.classList.toggle('dg-urgent', secs <= 10);
    if (state.isDrawer && !state.roundEnded && remaining <= 0) {
      endRound('timeout');
    }
  }
  requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ *
 * Drawing tools (drawer only)
 * ------------------------------------------------------------------ */
function buildTools() {
  const colorsEl = $('colors');
  colorsEl.innerHTML = '';
  PALETTE.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dg-color' + (i === 0 ? ' is-on' : '');
    b.style.setProperty('--c', c);
    b.dataset.color = c;
    b.setAttribute('aria-label', `${t(lang, 'colorLabel')} ${i + 1}`);
    b.addEventListener('click', () => selectColor(c, b));
    colorsEl.appendChild(b);
  });
  const brushesEl = $('brushes');
  brushesEl.innerHTML = '';
  BRUSH_SIZES.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dg-brush' + (i === 1 ? ' is-on' : '');
    b.dataset.size = String(s);
    b.innerHTML = `<span class="dg-brush-dot" style="width:${s}px;height:${s}px"></span>`;
    b.addEventListener('click', () => selectSize(s, b));
    brushesEl.appendChild(b);
  });
}
function selectColor(c, btn) {
  surface.setColor(c);
  document.querySelectorAll('.dg-color').forEach((el) => el.classList.remove('is-on'));
  btn.classList.add('is-on');
  $('btnEraser').classList.remove('is-on');
  sfx.play('tap');
}
function selectSize(s, btn) {
  surface.setSize(s);
  document.querySelectorAll('.dg-brush').forEach((el) => el.classList.remove('is-on'));
  btn.classList.add('is-on');
  sfx.play('tap');
}

/* ------------------------------------------------------------------ *
 * i18n wiring
 * ------------------------------------------------------------------ */
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
  buildTools();
  updateNetLine();
  updateHud();
  renderScores();
  if (!overlayStart.hidden) updateStartButton();
  if (!choosingNote.hidden && state.phase === 'choosing') {
    choosingNote.textContent = t(lang, 'choosingWord', { name: nameOf(state.drawerId) });
  }
  rememberLang(lang);
}

/* ------------------------------------------------------------------ *
 * Net dispatch
 * ------------------------------------------------------------------ */
function onAction({ action, payload, from }) {
  recvMessages.push({ action, payload, from, t: Date.now() });
  if (from === myId()) return; // ignore our own echoes (host relay shouldn't echo, but be safe)
  switch (action) {
    case 'game-begin':
      state.mode = payload.mode || state.mode;
      beginTurn(payload.firstDrawerId, state.mode);
      break;
    case 'round-live':
      onRoundLive(payload, from);
      break;
    case 'stroke':
      if (!state.isDrawer) surface.applyRemoteStroke(payload);
      break;
    case 'clear':
      if (!state.isDrawer) surface.clearLocal();
      break;
    case 'guess':
      onGuess(payload, from);
      break;
    case 'round-end':
      if (!state.isDrawer) applyRoundEnd(payload); // drawer already applied locally
      break;
    default:
      break;
  }
}

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */
async function loadWords() {
  try {
    const res = await fetch(new URL('./data/words.json', import.meta.url));
    WORDS = await res.json();
  } catch (e) {
    console.error('[doodle-guess] failed to load words.json', e);
    WORDS = { en: ['cat', 'house', 'tree', 'star', 'fish'] };
  }
}

function bindUi() {
  // mode picker
  document.querySelectorAll('.dg-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      document.querySelectorAll('.dg-mode-btn').forEach((b) => b.classList.toggle('is-on', b === btn));
      updateStartButton();
      sfx.play('tap');
    });
  });
  $('btnStart').addEventListener('click', hostStartGame);
  $('btnStartDraw').addEventListener('click', drawerStartRound);
  $('btnNewWord').addEventListener('click', () => {
    if (state.mode !== 'bank') return;
    state.secret = pickBankWord();
    $('bankWord').textContent = state.secret.text;
    sfx.play('tap');
  });
  $('secretInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); drawerStartRound(); }
  });

  // drawing tools
  $('btnClear').addEventListener('click', () => {
    if (!surface.isInteractive()) return;
    surface.clearAndEmit();
    sfx.play('tap');
  });
  $('btnEraser').addEventListener('click', () => {
    surface.setColor(ERASER);
    document.querySelectorAll('.dg-color').forEach((el) => el.classList.remove('is-on'));
    $('btnEraser').classList.add('is-on');
    sfx.play('tap');
  });

  // guessing
  guessForm.addEventListener('submit', (e) => { e.preventDefault(); sfx.unlock(); submitGuess(); });
}

(async () => {
  await loadWords();
  surface = createDrawSurface(canvas, {
    onStroke: (seg) => { if (state.isDrawer) sendMsg('stroke', seg); },
    onClear: () => { if (state.isDrawer) sendMsg('clear', {}); },
  });

  applyLang(lang);
  buildTools();
  bindUi();

  net = await OGHNet.connect({ gameId: GAME_ID, name: myName() });
  updateNetLine();
  showLobby();

  net.on('mode', () => { updateNetLine(); if (state.phase === 'lobby') updateStartButton(); });
  net.on('hello', () => { updateNetLine(); if (state.phase === 'lobby') updateStartButton(); });
  net.on('players', () => {
    updateNetLine();
    renderScores();
    if (state.phase === 'lobby') updateStartButton();
  });
  net.on('action', onAction);

  requestAnimationFrame(tick);

  // Debug / test hook — lets the test harness read internal state, drive the
  // sim deterministically, and (critically) inspect the ACTUAL messages sent
  // and received to prove the secret word never leaked before the reveal.
  window.OGH_DOODLE = {
    state,
    net: () => net,
    surface: () => surface,
    sentMessages,
    recvMessages,
    lang: () => lang,
    setLang: applyLang,
    words: () => WORDS,
    secretWord: () => (state.secret ? state.secret.text : null),
    secretIndex: () => (state.secret ? state.secret.index : null),
    startGame: hostStartGame,
    setMode: (m) => { state.mode = m; },
    startDrawing: drawerStartRound,
    pickWord: (i) => { if (state.isDrawer && state.mode === 'bank') { state.secret = pickBankWord(i); $('bankWord').textContent = state.secret.text; } return state.secret; },
    setSecret: (txt) => { if (state.isDrawer) $('secretInput').value = txt; },
    guess: (txt) => { guessInput.value = txt; submitGuess(); },
    forceTimeout: () => { if (state.isDrawer) endRound('timeout'); },
    simStroke: (pts) => surface.simulateStroke(pts),
    canvasHash: () => surface.canvasHash(),
  };
})();
