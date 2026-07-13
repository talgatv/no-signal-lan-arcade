/**
 * race.js — LAN race mode: shared-passage sync, live progress broadcast, and
 * finish-order ranking, layered on top of OGHNet (games/_shared/js/ogh-net.js)
 * using the same "apply locally + conditionally broadcast" / "net.on('action')
 * applies remote events" pattern as games/tic-tac-toe and games/doodle-guess
 * (both read before writing this file). Action names are prefixed `race-`:
 * pc/host.py keys rooms by room id ONLY, not room+gameId (confirmed by
 * reading it), so two different games sharing a room name would otherwise
 * see each other's broadcasts — a distinctive prefix is a cheap defensive
 * measure against that, on top of the payload-shape checks below.
 *
 * Ranking model: every client measures its OWN elapsed race time with
 * performance.now() from the moment ITS OWN local countdown reaches GO, not
 * Date.now() (which would be vulnerable to wall-clock skew between devices).
 * All clients schedule their local GO relative to the same shared `startAt`
 * epoch the starter broadcasts, so every client's perf-clock starts within
 * normal LAN-latency + setTimeout-jitter of every other client's —
 * comfortably precise enough for a human-timescale typing race (the task
 * explicitly doesn't require high precision here). Finish rank is then just
 * "sort finished players by their own reported elapsedMs", a deterministic
 * function of data every client already has, so every screen produces the
 * same leaderboard order regardless of WebSocket relay/delivery order.
 *
 * The player roster racing in a given round is frozen at go() time (a
 * snapshot of net.players at that instant) and NOT re-synced from
 * net.players while a round is in progress — otherwise a spectator joining
 * mid-race would be added as an unfinished "racer" who can never finish,
 * permanently blocking the "everyone finished" end condition (the
 * RACE_TIMEOUT_MS safety net would still end it eventually, but there's no
 * reason to wait that long for something this easy to avoid).
 */
import { computeWPM, computeAccuracy, progressPct, isComplete } from './typing-core.js';

const COUNTDOWN_MS = 3000;
const RACE_TIMEOUT_MS = 90000;
const PROGRESS_BROADCAST_MS = 300;

/**
 * @param {{ net: object, sfx: object, pickSentence: () => {text: string, lang: string}, onChange: (state: object) => void }} opts
 */
export function createRace({ net, sfx, pickSentence, onChange }) {
  /** @type {'lobby'|'countdown'|'racing'|'ended'} */
  let phase = 'lobby';
  let text = '';
  let lang = 'en';
  let countdownN = 0;
  let timeUp = false;
  let startPerf = 0;
  let countdownTimer = null;
  let raceTimeoutTimer = null;
  let lastBroadcastAt = 0;

  /** id -> { id, name, pct, wpm, accuracy, finished, elapsedMs } */
  const players = new Map();

  function myId() {
    return net?.playerId || 'local';
  }

  function ensurePlayer(id, name) {
    if (!id) id = myId();
    if (!players.has(id)) {
      players.set(id, { id, name: name || id, pct: 0, wpm: 0, accuracy: 100, finished: false, elapsedMs: 0 });
    } else if (name) {
      players.get(id).name = name;
    }
    return players.get(id);
  }

  /** Only meaningful in the lobby — see file header for why this must NOT
   * run during an active round. */
  function syncRosterFromNet() {
    const list = net?.players?.length ? net.players : [{ id: myId(), name: net?.name || 'You' }];
    for (const p of list) ensurePlayer(p.id, p.name);
  }

  function emit() {
    const arr = Array.from(players.values()).map((p) => ({ ...p, isYou: p.id === myId() }));
    onChange({ phase, text, lang, countdownN, timeUp, players: arr });
  }

  function reset() {
    clearTimeout(countdownTimer);
    clearTimeout(raceTimeoutTimer);
    phase = 'lobby';
    text = '';
    countdownN = 0;
    timeUp = false;
    players.clear();
    syncRosterFromNet();
    emit();
  }

  function beginRound(payload, { broadcast }) {
    if (!payload || typeof payload.text !== 'string' || !payload.text) return;
    clearTimeout(countdownTimer);
    clearTimeout(raceTimeoutTimer);
    text = payload.text;
    lang = payload.lang || 'en';
    phase = 'countdown';
    timeUp = false;
    players.clear();
    syncRosterFromNet(); // snapshot the roster NOW, frozen for the whole round
    const startAt = Number(payload.startAt) || Date.now() + COUNTDOWN_MS;

    const tick = () => {
      const remain = startAt - Date.now();
      countdownN = Math.max(0, Math.ceil(remain / 1000));
      emit();
      if (remain <= 0) {
        go();
      } else {
        countdownTimer = setTimeout(tick, Math.min(250, remain));
      }
    };
    tick();

    if (broadcast && net?.mode === 'online') net.send('race-start', payload);
  }

  function go() {
    phase = 'racing';
    startPerf = performance.now();
    sfx?.play('tap');
    emit();
    raceTimeoutTimer = setTimeout(() => endRound(true), RACE_TIMEOUT_MS);
  }

  function startRace() {
    if (phase !== 'lobby') return;
    const chosen = pickSentence();
    beginRound({ text: chosen.text, lang: chosen.lang, startAt: Date.now() + COUNTDOWN_MS }, { broadcast: true });
  }

  function localElapsedMs() {
    return Math.max(0, performance.now() - startPerf);
  }

  /**
   * Called by app.js on every keystroke while racing. app.js owns the
   * actual keystroke-accuracy tallying (classifyAppends against `text`,
   * same helper solo mode uses) and passes in the resulting running
   * total/correct counts — race.js only needs the totals (for wpm/accuracy)
   * and the current typed value (for progress/completion), not the raw
   * per-keystroke events, so there's exactly one place that calls
   * classifyAppends instead of two redundant ones. Handles progress,
   * throttled broadcast, and completion in one atomic pass so ordering bugs
   * (e.g. broadcasting stale wpm right at the finish line) can't creep in.
   */
  function handleLocalInput(newValue, totalKeystrokes, correctKeystrokes) {
    if (phase !== 'racing') return;
    const me = ensurePlayer(myId(), net?.name);
    me.pct = progressPct(newValue, text);
    me.wpm = computeWPM(totalKeystrokes, localElapsedMs());
    me.accuracy = computeAccuracy(correctKeystrokes, totalKeystrokes);

    const done = isComplete(text, newValue);
    if (done && !me.finished) {
      me.finished = true;
      me.pct = 100;
      me.elapsedMs = localElapsedMs();
      sfx?.play('win');
      if (net?.mode === 'online') {
        net.send('race-finish', { wpm: me.wpm, accuracy: me.accuracy, elapsedMs: me.elapsedMs });
      }
    } else {
      const now = performance.now();
      if (now - lastBroadcastAt > PROGRESS_BROADCAST_MS) {
        lastBroadcastAt = now;
        if (net?.mode === 'online') net.send('race-progress', { pct: me.pct, wpm: me.wpm });
      }
    }

    emit();
    if (done) maybeEndRound();
  }

  function maybeEndRound() {
    if (phase !== 'racing') return;
    const all = Array.from(players.values());
    if (all.length > 0 && all.every((p) => p.finished)) endRound(false);
  }

  function endRound(byTimeout) {
    if (phase !== 'racing' && phase !== 'countdown') return;
    clearTimeout(raceTimeoutTimer);
    phase = 'ended';
    timeUp = !!byTimeout;
    emit();
  }

  /** Final leaderboard: finished players by elapsed time ascending, then
   * anyone still unfinished (timeout) by progress descending. */
  function rankedResults() {
    const all = Array.from(players.values());
    const finished = all.filter((p) => p.finished).sort((a, b) => a.elapsedMs - b.elapsedMs);
    const unfinished = all.filter((p) => !p.finished).sort((a, b) => b.pct - a.pct);
    return [...finished, ...unfinished].map((p, i) => ({ ...p, rank: i + 1, isYou: p.id === myId() }));
  }

  // ---- OGHNet wiring ------------------------------------------------------
  function onPlayersChanged() {
    if (phase !== 'lobby') return; // frozen roster mid-round — see file header
    syncRosterFromNet();
    emit();
  }

  function onAction({ action, payload, from }) {
    if (!payload) return;
    if (action === 'race-start') {
      beginRound(payload, { broadcast: false });
    } else if (action === 'race-progress') {
      if (phase === 'racing' || phase === 'countdown') {
        const p = ensurePlayer(from);
        if (typeof payload.pct === 'number') p.pct = payload.pct;
        if (typeof payload.wpm === 'number') p.wpm = payload.wpm;
        emit();
      }
    } else if (action === 'race-finish') {
      if (phase === 'racing' || phase === 'countdown') {
        const p = ensurePlayer(from);
        p.finished = true;
        p.pct = 100;
        if (typeof payload.wpm === 'number') p.wpm = payload.wpm;
        if (typeof payload.accuracy === 'number') p.accuracy = payload.accuracy;
        if (typeof payload.elapsedMs === 'number') p.elapsedMs = payload.elapsedMs;
        emit();
        maybeEndRound();
      }
    }
  }

  if (net) {
    net.on('players', onPlayersChanged);
    net.on('hello', onPlayersChanged);
    net.on('action', onAction);
  }
  syncRosterFromNet();

  return {
    startRace,
    handleLocalInput,
    reset,
    rankedResults,
    getPhase: () => phase,
    getText: () => text,
    getLang: () => lang,
  };
}
