/**
 * typing-core.js — pure typing-test math and text diffing. Zero DOM/window
 * references anywhere in this file, by design: it can be imported and driven
 * directly from plain Node (`node --input-type=module`) for unit testing,
 * exactly the same "pure logic never touches the DOM" split documented in
 * games/tic-tac-toe/client/app.js (checkResult/minimax there, diff/WPM/
 * accuracy here). app.js and race.js hold all the mutable state (current
 * target string, running keystroke counters, timers) and call into these
 * functions with plain values; nothing in here mutates its arguments.
 */

/**
 * Per-character status of `typed` against `target`, for rendering the
 * classic typing-test highlight (correct / incorrect / not-yet-typed).
 * Uses Array.from so multi-byte/surrogate-pair characters (not actually
 * present in this game's content, but cheap to get right) count as one
 * character each, same as everywhere else in this file.
 * @param {string} target
 * @param {string} typed
 * @returns {{ char: string, status: 'correct'|'incorrect'|'pending' }[]}
 */
export function diffChars(target, typed) {
  const targetChars = Array.from(target);
  const typedChars = Array.from(typed);
  const out = new Array(targetChars.length);
  for (let i = 0; i < targetChars.length; i++) {
    if (i >= typedChars.length) {
      out[i] = { char: targetChars[i], status: 'pending' };
    } else {
      out[i] = { char: targetChars[i], status: typedChars[i] === targetChars[i] ? 'correct' : 'incorrect' };
    }
  }
  return out;
}

/**
 * Classifies an input change (oldValue -> newValue against a fixed target)
 * into keystroke-accuracy events, one per character *appended* since
 * oldValue. Deletions (newValue shorter than or equal to oldValue) produce
 * no events — a correction is not itself a scored keystroke, only the
 * original wrong keystroke it's fixing was (already scored when it
 * happened). A multi-character jump (e.g. a paste) is treated as N append
 * events, one per new character, so accuracy accounting stays correct even
 * outside the normal one-keystroke-at-a-time case.
 * @param {string} target
 * @param {string} oldValue
 * @param {string} newValue
 * @returns {{ index: number, correct: boolean }[]}
 */
export function classifyAppends(target, oldValue, newValue) {
  const targetChars = Array.from(target);
  const oldChars = Array.from(oldValue);
  const newChars = Array.from(newValue);
  if (newChars.length <= oldChars.length) return [];
  const events = [];
  for (let i = oldChars.length; i < newChars.length; i++) {
    const expected = targetChars[i];
    events.push({ index: i, correct: expected !== undefined && newChars[i] === expected });
  }
  return events;
}

/**
 * WPM — the standard gross-speed convention specified for this game:
 * (characters typed / 5) / minutes elapsed. "Characters typed" is every
 * character-producing keystroke since the session/race started, INCLUDING
 * ones later backspaced away (this is gross WPM, not "net of errors" —
 * accuracy is tracked as a separate, independent metric via
 * computeAccuracy, not folded into this formula). 5 characters = 1 "word"
 * is the conventional typing-test constant regardless of the content's
 * actual word boundaries.
 * @param {number} totalKeystrokes cumulative character-producing keystrokes
 * @param {number} elapsedMs time elapsed since the session/race started
 * @returns {number} words per minute, 0 if no time has elapsed yet
 */
export function computeWPM(totalKeystrokes, elapsedMs) {
  if (!(elapsedMs > 0) || !(totalKeystrokes > 0)) return 0;
  const minutes = elapsedMs / 60000;
  return (totalKeystrokes / 5) / minutes;
}

/**
 * Accuracy — % of keystrokes that were correct vs. required a correction.
 * @param {number} correctKeystrokes
 * @param {number} totalKeystrokes
 * @returns {number} 0-100; defined as 100 when no keystrokes have happened
 *   yet (nothing has gone wrong yet, so "100% so far" reads correctly in a
 *   live HUD rather than showing a misleading 0%).
 */
export function computeAccuracy(correctKeystrokes, totalKeystrokes) {
  if (!(totalKeystrokes > 0)) return 100;
  return (correctKeystrokes / totalKeystrokes) * 100;
}

/**
 * Race/solo progress toward completing `target`, clamped to [0, 100].
 * @param {string} typed
 * @param {string} target
 */
export function progressPct(typed, target) {
  const targetLen = Array.from(target).length;
  if (targetLen <= 0) return 0;
  const typedLen = Math.min(Array.from(typed).length, targetLen);
  return (typedLen / targetLen) * 100;
}

/** Exact-match completion check (race passages, and solo per-word commit). */
export function isComplete(target, typed) {
  return typed === target;
}

/**
 * Picks a random item from `list`, avoiding `avoid` (by value) when the
 * list has more than one distinct option — used so the solo word queue
 * doesn't (usually) repeat the same word back-to-back. Falls back to a
 * plain random pick if avoidance isn't possible (e.g. a 1-item list).
 * @template T
 * @param {T[]} list
 * @param {T} [avoid]
 * @returns {T}
 */
export function pickRandom(list, avoid) {
  if (!list.length) throw new Error('pickRandom: empty list');
  if (list.length === 1) return list[0];
  let pick = list[(Math.random() * list.length) | 0];
  let guard = 0;
  while (pick === avoid && guard++ < 8) {
    pick = list[(Math.random() * list.length) | 0];
  }
  return pick;
}

/** Round for display: WPM to the nearest whole number, accuracy to 1 decimal. */
export function formatWpm(wpm) {
  return Math.round(wpm);
}
export function formatAccuracy(acc) {
  return Math.round(acc * 10) / 10;
}
