/**
 * ai.js — a real (non-random) checkers AI: negamax with alpha-beta pruning
 * over a material + positional evaluation. Pure/DOM-free, operates on
 * complete moves from rules.js (so multi-jumps are atomic to the search and
 * mandatory captures are respected automatically — the AI can only ever pick
 * from legalMoves()).
 *
 * Strength is tuned by search depth + a small random-move chance per
 * difficulty. Even at depth 2 it is a genuine opponent (it will always take
 * a free capture chain, defend obvious threats, and push toward kinging);
 * higher depths look several exchanges ahead.
 */

import { legalMoves, applyMove, other, row, col, CELLS } from './rules.js';

const VAL_MAN = 100;
const VAL_KING = 175;
const WIN = 100000;

export const DIFFICULTY = {
  easy: { depth: 2, randomness: 0.45 },
  medium: { depth: 4, randomness: 0.12 },
  hard: { depth: 6, randomness: 0 },
};

/**
 * Static evaluation from `color`'s point of view (higher = better for
 * `color`). Material dominates; small terms reward advancing men toward
 * promotion, holding the safe board edges, and keeping the home back rank
 * (which denies the opponent easy kings).
 */
export function evaluate(board, color) {
  let score = 0;
  for (let i = 0; i < CELLS; i++) {
    const p = board[i];
    if (!p) continue;
    let v = p.king ? VAL_KING : VAL_MAN;
    const r = row(i);
    const c = col(i);
    if (!p.king) {
      // Distance advanced toward the far (king) row.
      const adv = p.color === 'c' ? 7 - r : r;
      v += adv * 3;
    }
    if (c === 0 || c === 7) v += 4; // edge pieces can't be captured
    else if (c >= 2 && c <= 5) v += 2; // central files
    // Back-rank guard bonus (home row): 'c' home is row 7, 'p' home is row 0.
    if ((p.color === 'c' && r === 7) || (p.color === 'p' && r === 0)) v += 4;
    score += p.color === color ? v : -v;
  }
  return score;
}

function orderMoves(moves) {
  // Search capturing moves (esp. bigger chains) first — better pruning.
  return moves.slice().sort((a, b) => b.captures.length - a.captures.length);
}

function negamax(board, color, depth, alpha, beta) {
  const moves = legalMoves(board, color);
  if (moves.length === 0) return -WIN - depth; // no move = loss (prefer a later loss)
  if (depth === 0) return evaluate(board, color);
  let best = -Infinity;
  for (const m of orderMoves(moves)) {
    const nb = applyMove(board, m);
    const v = -negamax(nb, other(color), depth - 1, -beta, -alpha);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Choose a move for `color`. Returns a complete move object (from
 * legalMoves) or null if there are none. Ties among equally-scored best
 * moves are broken at random for variety.
 * @param {object[]} board
 * @param {'c'|'p'} color
 * @param {{depth?:number, randomness?:number}} [opts]
 */
export function pickMove(board, color, opts = {}) {
  const depth = opts.depth ?? DIFFICULTY.medium.depth;
  const randomness = opts.randomness ?? 0;
  const moves = legalMoves(board, color);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  if (randomness > 0 && Math.random() < randomness) {
    return moves[(Math.random() * moves.length) | 0];
  }
  let best = -Infinity;
  let picks = [];
  for (const m of orderMoves(moves)) {
    const nb = applyMove(board, m);
    const v = -negamax(nb, other(color), depth - 1, -Infinity, Infinity);
    if (v > best) {
      best = v;
      picks = [m];
    } else if (v === best) {
      picks.push(m);
    }
  }
  return picks[(Math.random() * picks.length) | 0];
}
