/**
 * ai.js — a real (if modest) Backgammon AI. Pure/DOM-free; it only ever
 * assembles moves from rules.js's legal-move machinery, so every move it makes
 * is legal and it always obeys the "use as many dice as possible" forcing rule
 * and the bar-re-entry rule (those are baked into legalTurnMoves / singleDieMoves).
 *
 * Strategy: enumerate every MAXIMAL legal move sequence for the roll (each one
 * uses the required maximum number of dice), statically evaluate the resulting
 * board with a heuristic that rewards a real Backgammon plan — race lead, made
 * points (especially blocking home-board points and primes), hitting enemy
 * blots / pinning enemy checkers on the bar, and safety (few exposed blots,
 * weighted by how many enemy shots bear on them) — and pick the best. Easy and
 * Medium add randomness and pick among near-best sequences for variety; Hard is
 * the deterministic best.
 */

import {
  WHITE, other, countAt, inHome, pipCount, boardKey,
  singleDieMoves, applyMove, maxDiceUsable, legalTurnMoves, removeOne,
} from './rules.js';

export const DIFFICULTY = {
  easy: { randomness: 0.35, spread: 9 },
  medium: { randomness: 0.10, spread: 4 },
  hard: { randomness: 0, spread: 0 },
};

const NODE_CAP = 20000; // hard ceiling on enumerated sequences (doubles safety)

/**
 * How many enemy "shots" bear on a blot of `color` at point `p` — a rough
 * hit-probability proxy. Direct shots (an enemy 1..6 pips behind, in its own
 * direction of travel) count fully; indirect shots (7..12 pips, needing two
 * dice) count for less. Enemy checkers on the bar are ignored (they must enter
 * first) — a deliberate simplification.
 */
function shots(b, color, p) {
  const opp = other(color);
  const dOpp = opp === WHITE ? -1 : +1; // enemy direction of travel
  let n = 0;
  for (let q = 1; q <= 24; q++) {
    const c = countAt(b, q, opp);
    if (!c) continue;
    const dist = (p - q) * dOpp; // >0 means q is "behind" p for the enemy
    if (dist >= 1 && dist <= 6) n += 2; // direct shot
    else if (dist >= 7 && dist <= 12) n += 1; // indirect (two-dice) shot
  }
  return n;
}

/** Longest run of consecutive `color`-owned points (2+ checkers) — prime proxy. */
function primeRun(b, color) {
  let run = 0; let best = 0;
  for (let p = 1; p <= 24; p++) {
    if (countAt(b, p, color) >= 2) { run += 1; if (run > best) best = run; } else run = 0;
  }
  return best;
}

/**
 * Static evaluation of `b` from `color`'s point of view (higher = better).
 */
export function evaluate(b, color) {
  const opp = other(color);
  let s = 0;

  // Borne-off checkers are the goal; the race (pip lead) is the backbone.
  s += (b.off[color] - b.off[opp]) * 14;
  s += (pipCount(b, opp) - pipCount(b, color)) * 1.0;

  // The bar: your own checkers stuck there are very bad; pinning the enemy good.
  s -= b.bar[color] * 24;
  s += b.bar[opp] * 16;

  for (let p = 1; p <= 24; p++) {
    const mine = countAt(b, p, color);
    if (mine >= 2) {
      s += 3;                        // a made point (safe, blocks the enemy)
      if (inHome(color, p)) s += 3;  // home-board point — blocks re-entry / builds a board
    } else if (mine === 1) {
      s -= 4 + shots(b, color, p) * 2.5; // an exposed blot, weighted by danger
    }
  }

  // Reward blocking structure (a wall in front of the enemy's back checkers).
  const run = primeRun(b, color);
  if (run >= 2) s += (run - 1) * (run - 1) * 2;

  return s;
}

/**
 * Enumerate maximal legal move sequences for `color` given `dice` from board
 * `b`. Each entry is { moves:[...], board } where `board` is the resulting
 * position after playing the whole sequence. De-duplicated by resulting board.
 */
function enumerateMaximal(b, color, dice) {
  const firsts = legalTurnMoves(b, color, dice); // honors max-usage + larger-die
  if (!firsts.length) return [];
  const out = [];
  const seen = new Set();
  let nodes = 0;

  const dfs = (board, remaining, path) => {
    if (nodes >= NODE_CAP) return;
    // Which moves keep the sequence maximal from here on?
    const need = maxDiceUsable(board, color, remaining);
    if (need === 0) {
      const key = boardKey(board);
      if (!seen.has(key)) { seen.add(key); out.push({ moves: path, board }); }
      return;
    }
    for (const d of new Set(remaining)) {
      for (const m of singleDieMoves(board, color, d)) {
        nodes += 1;
        if (nodes >= NODE_CAP) return;
        const nb = applyMove(board, color, m).board;
        if (1 + maxDiceUsable(nb, color, removeOne(remaining, d)) === need) {
          dfs(nb, removeOne(remaining, d), path.concat(m));
        }
      }
    }
  };

  for (const f of firsts) {
    const nb = applyMove(b, color, f).board;
    dfs(nb, removeOne(dice, f.die), [f]);
  }
  return out;
}

/**
 * Choose a full turn (an array of moves) for `color` given `dice`.
 * Returns [] when there is no legal move (the turn is forfeit).
 * @param {{randomness?:number, spread?:number}} [opts]
 */
export function pickTurn(b, color, dice, opts = {}) {
  const randomness = opts.randomness ?? 0;
  const spread = opts.spread ?? 0;

  const seqs = enumerateMaximal(b, color, dice);
  if (!seqs.length) return [];
  if (seqs.length === 1) return seqs[0].moves;

  if (randomness > 0 && Math.random() < randomness) {
    return seqs[(Math.random() * seqs.length) | 0].moves;
  }

  let best = -Infinity;
  for (const sq of seqs) { sq.score = evaluate(sq.board, color); if (sq.score > best) best = sq.score; }
  const pool = seqs.filter((sq) => sq.score >= best - spread);
  return pool[(Math.random() * pool.length) | 0].moves;
}
