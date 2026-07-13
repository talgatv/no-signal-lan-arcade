/**
 * rules.js — pure, DOM-free standard Backgammon engine.
 *
 * Everything here is plain functions over a small board record, so the rules
 * can be driven directly (see window.OGH_BACKGAMMON in app.js) and unit-tested
 * in isolation without any DOM or network — the same "pure logic never touches
 * the DOM" split as games/chess/rules.js and games/checkers/rules.js.
 *
 * Board model
 * -----------
 * One absolute 24-point coordinate system (points 1..24) shared by both sides:
 *  - `points` is an array length 26; only indices 1..24 are used. A cell is a
 *    signed integer: POSITIVE = that many White checkers, NEGATIVE = that many
 *    Black checkers, 0 = empty. (So a point can never hold both colors — the
 *    sign is the owner and the magnitude is the count.)
 *  - `bar` = { w, b } and `off` = { w, b } count checkers on the bar and borne
 *    off, per color.
 *
 * Direction & geography (fixed, universal board convention — never mirrored):
 *  - White ('w') moves from point 24 DOWN toward point 1 (DIR = -1). White's
 *    home board is points 1..6; White bears off past point 0. White re-enters
 *    from the bar into Black's home board (points 24..19): a die value d enters
 *    on point 25 - d.
 *  - Black ('b') moves from point 1 UP toward point 24 (DIR = +1). Black's home
 *    board is points 19..24; Black bears off past point 25. Black re-enters
 *    from the bar into White's home board (points 1..6): a die value d enters
 *    on point d.
 *
 * The standard opening position (each side: 2 on the 24-pt, 5 on the 13-pt,
 * 3 on the 8-pt, 5 on the 6-pt, in that side's own numbering) is, in this
 * absolute White-numbered frame:
 *   White  +2@24  +5@13  +3@8  +5@6
 *   Black  -2@1   -5@12  -3@17 -5@19
 *
 * A "move" is `{ from, to, die }` where `from` is a point index 1..24 or the
 * string 'bar', and `to` is a point index 1..24 or the string 'off' (bearing
 * off). Move generation, the hit rule, the bar re-entry rule, bearing off
 * (incl. the "use a higher die from a lower point when no checker is on a
 * higher point" rule) and the "use as many dice as possible" forcing rule (with
 * the non-double must-play-the-larger-die tie-break) are all implemented here.
 */

export const WHITE = 'w';
export const BLACK = 'b';

export const other = (color) => (color === WHITE ? BLACK : WHITE);

// Movement direction and the per-checker sign in `points` for each color.
export const DIR = { w: -1, b: +1 };
export const SIGN = { w: +1, b: -1 };

/** A fresh board in the standard Backgammon opening position. */
export function initialBoard() {
  const points = new Array(26).fill(0);
  // White (positive)
  points[24] = 2; points[13] = 5; points[8] = 3; points[6] = 5;
  // Black (negative)
  points[1] = -2; points[12] = -5; points[17] = -3; points[19] = -5;
  return { points, bar: { w: 0, b: 0 }, off: { w: 0, b: 0 } };
}

export function cloneBoard(b) {
  return { points: b.points.slice(), bar: { ...b.bar }, off: { ...b.off } };
}

/** Number of `color` checkers on point `p` (0 if the point is empty/enemy). */
export function countAt(b, p, color) {
  const v = b.points[p];
  return color === WHITE ? (v > 0 ? v : 0) : (v < 0 ? -v : 0);
}

/** Does `color` own point `p` (at least one of its checkers there)? */
export function ownsPoint(b, p, color) {
  return color === WHITE ? b.points[p] > 0 : b.points[p] < 0;
}

/** Is point `p` inside `color`'s own home board? */
export function inHome(color, p) {
  return color === WHITE ? (p >= 1 && p <= 6) : (p >= 19 && p <= 24);
}

/** The point a bar checker of `color` re-enters on for die value `d` (1..6). */
export function entryPoint(color, d) {
  return color === WHITE ? 25 - d : d;
}

/** Pip distance from point `p` to `color`'s bear-off edge (White:p, Black:25-p). */
export function pip(color, p) {
  return color === WHITE ? p : 25 - p;
}

/**
 * Are all 15 of `color`'s checkers in their home board (none on the bar, none
 * outside home)? Required before any checker may bear off — and re-checked
 * every move, so a checker hit back to the bar mid-bear-off correctly blocks
 * bearing off again until it re-enters and comes home.
 */
export function allHome(b, color) {
  if (b.bar[color] > 0) return false;
  if (color === WHITE) {
    for (let p = 7; p <= 24; p++) if (b.points[p] > 0) return false;
  } else {
    for (let p = 1; p <= 18; p++) if (b.points[p] < 0) return false;
  }
  return true;
}

/**
 * Can `color` land on point `p`? Open = empty, own, or a single enemy checker
 * (a blot, which would be hit). Blocked = 2+ enemy checkers.
 */
export function canLand(b, color, p) {
  return color === WHITE ? b.points[p] >= -1 : b.points[p] <= 1;
}

/** The greatest pip value (farthest-from-off point) `color` occupies in home. */
function highestHomePip(b, color) {
  let best = 0;
  if (color === WHITE) {
    for (let p = 1; p <= 6; p++) if (b.points[p] > 0 && p > best) best = p;
  } else {
    for (let p = 19; p <= 24; p++) if (b.points[p] < 0 && (25 - p) > best) best = 25 - p;
  }
  return best;
}

/**
 * May `color` bear a checker off point `p` with die value `d`?
 *  - exact: d equals the checker's pip distance to the edge; or
 *  - overshoot: d is greater than that pip AND there is no checker of `color`
 *    on a point farther from the edge (a higher pip) — the standard rule.
 * (Does NOT check allHome — the caller gates on that.)
 */
export function canBearOff(b, color, p, d) {
  if (!inHome(color, p)) return false;
  const pp = pip(color, p); // 1..6
  if (d === pp) return true;
  if (d > pp) return highestHomePip(b, color) === pp; // p is the farthest occupied
  return false;
}

/**
 * Every legal single move for `color` using one die value `d`.
 * If `color` has any checker on the bar, ONLY re-entry moves are legal (you
 * must bring every bar checker in before touching anything else).
 */
export function singleDieMoves(b, color, d) {
  const moves = [];
  if (b.bar[color] > 0) {
    const e = entryPoint(color, d);
    if (canLand(b, color, e)) moves.push({ from: 'bar', to: e, die: d });
    return moves;
  }
  for (let p = 1; p <= 24; p++) {
    if (!ownsPoint(b, p, color)) continue;
    const dest = p + DIR[color] * d;
    if (dest >= 1 && dest <= 24) {
      if (canLand(b, color, dest)) moves.push({ from: p, to: dest, die: d });
    } else if (allHome(b, color) && canBearOff(b, color, p, d)) {
      moves.push({ from: p, to: 'off', die: d });
    }
  }
  return moves;
}

/** Apply one move; returns { board, hit } with hit=true if it sent a blot to the bar. */
export function applyMove(b, color, m) {
  const nb = cloneBoard(b);
  const s = SIGN[color];
  // remove the source checker
  if (m.from === 'bar') nb.bar[color] -= 1;
  else nb.points[m.from] -= s;
  // place it
  let hit = false;
  if (m.to === 'off') {
    nb.off[color] += 1;
  } else {
    if (nb.points[m.to] === -s) { // exactly one enemy checker sitting there
      nb.points[m.to] = 0;
      nb.bar[other(color)] += 1;
      hit = true;
    }
    nb.points[m.to] += s;
  }
  return { board: nb, hit };
}

/** Return a copy of `dice` with one occurrence of value `d` removed. */
export function removeOne(dice, d) {
  const out = dice.slice();
  const i = out.indexOf(d);
  if (i >= 0) out.splice(i, 1);
  return out;
}

const distinct = (dice) => [...new Set(dice)];

/**
 * The maximum number of dice from `dice` that `color` can legally consume in
 * sequence from board `b`. This is the heart of the "use as many dice as
 * possible" forcing rule: a value is only truly playable if it can be part of a
 * maximal sequence.
 */
export function maxDiceUsable(b, color, dice) {
  if (dice.length === 0) return 0;
  let best = 0;
  for (const d of distinct(dice)) {
    const ms = singleDieMoves(b, color, d);
    if (!ms.length) continue;
    const rest = removeOne(dice, d);
    for (const m of ms) {
      const nb = applyMove(b, color, m).board;
      const u = 1 + maxDiceUsable(nb, color, rest);
      if (u > best) best = u;
      if (best === dice.length) return best; // cannot do better
    }
  }
  return best;
}

/**
 * The legal first moves right now for `color` with remaining `dice`, filtered
 * so that:
 *  - every returned move preserves the MAXIMUM number of dice usable (the
 *    forcing rule — you may not throw away a die you could have played), and
 *  - for a non-double where at most one die can ever be played, the larger die
 *    must be used if it is playable (the standard tie-break).
 * Returns [] when no die can be played (the turn is forfeit).
 *
 * The app calls this after every roll and after every move with the CURRENT
 * remaining dice, so the max-usage invariant holds across the whole turn.
 */
export function legalTurnMoves(b, color, dice) {
  const maxUsed = maxDiceUsable(b, color, dice);
  if (maxUsed === 0) return [];
  let res = [];
  for (const d of distinct(dice)) {
    for (const m of singleDieMoves(b, color, d)) {
      const nb = applyMove(b, color, m).board;
      if (1 + maxDiceUsable(nb, color, removeOne(dice, d)) === maxUsed) res.push(m);
    }
  }
  // Non-double, at most one die playable => must play the larger if possible.
  if (maxUsed === 1 && dice.length === 2 && dice[0] !== dice[1]) {
    const larger = Math.max(dice[0], dice[1]);
    if (res.some((m) => m.die === larger)) res = res.filter((m) => m.die === larger);
  }
  return res;
}

/** Legal current moves originating from `from` (a point index or 'bar'). */
export function movesFrom(b, color, dice, from) {
  return legalTurnMoves(b, color, dice).filter((m) => m.from === from);
}

/** Total pip count for `color` (checkers' distances to bear off; bar = 25 each). */
export function pipCount(b, color) {
  let total = b.bar[color] * 25;
  for (let p = 1; p <= 24; p++) total += countAt(b, p, color) * pip(color, p);
  return total;
}

/** 'w' | 'b' | null — whoever has borne off all 15 checkers. */
export function winner(b) {
  if (b.off.w >= 15) return WHITE;
  if (b.off.b >= 15) return BLACK;
  return null;
}

/** A canonical string key for a board (AI de-duplication of equal positions). */
export function boardKey(b) {
  return b.points.slice(1, 25).join(',') + `|${b.bar.w},${b.bar.b}|${b.off.w},${b.off.b}`;
}

/** [d1,d2] for a normal roll, or [d,d,d,d] for doubles (four moves). */
export function diceFromRoll(d1, d2) {
  return d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
}
