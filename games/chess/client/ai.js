/**
 * ai.js — a real chess AI: negamax with alpha-beta pruning over a
 * material + piece-square-table evaluation, plus a capture-only quiescence
 * search to blunt the horizon effect. Pure/DOM-free; it only ever chooses from
 * rules.js's legalMoves(), so every move it makes is legal and it can never
 * ignore its own king (moves that leave the king in check are not legal moves).
 *
 * Strength is tuned by search depth + a small random-move chance per
 * difficulty, and Easy/Medium also pick at random among near-equal top moves
 * for variety. A node budget guarantees the search always returns promptly in a
 * browser even in a wild tactical position.
 */

import {
  legalMoves, makeMoveInPlace, unmakeMoveInPlace, clonePosition, inCheck,
  row, col, CELLS, WHITE,
} from './rules.js';

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 1000000;
const NEAR_BEST = 25; // centipawns; Easy/Medium randomize among moves within this of best

export const DIFFICULTY = {
  easy: { depth: 2, randomness: 0.30, quiesce: false, spread: NEAR_BEST },
  medium: { depth: 3, randomness: 0.06, quiesce: true, spread: NEAR_BEST },
  hard: { depth: 4, randomness: 0, quiesce: true, spread: 0 },
};

/*
 * Piece-square tables, written from White's point of view in board order
 * (row 0 = rank 8 = top / far side, row 7 = rank 1 = White's home). They encode
 * the required "basic positional bonuses": center control (knights/bishops/pawns
 * rewarded centrally), pawn advancement, rooks on open-ish ranks, and king
 * safety (the midgame king table rewards castled corners and punishes the
 * center; an endgame king table centralizes the king once queens are gone).
 * Black reuses each table vertically mirrored (row r <-> 7-r).
 */
const PST = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  kMid: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
  kEnd: [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50,
  ],
};

const mirror = (i) => idx8(7 - row(i), col(i));
function idx8(r, c) { return r * 8 + c; }

function isEndgame(board) {
  // Endgame once both queens are gone, or very little material remains.
  let queens = 0; let major = 0;
  for (const p of board) {
    if (!p) continue;
    if (p.type === 'q') queens += 1;
    if (p.type === 'q' || p.type === 'r') major += 1;
  }
  return queens === 0 || major <= 2;
}

/**
 * Static evaluation from `color`'s point of view (higher = better for `color`).
 * Material dominates; piece-square tables add the positional terms; a small
 * bishop-pair bonus is included.
 */
export function evaluate(pos, color) {
  const board = pos.board;
  const endgame = isEndgame(board);
  let white = 0;
  let wb = 0; let bb = 0;
  for (let i = 0; i < CELLS; i++) {
    const p = board[i];
    if (!p) continue;
    let v = VAL[p.type];
    let table;
    if (p.type === 'k') table = endgame ? PST.kEnd : PST.kMid;
    else table = PST[p.type];
    v += p.color === WHITE ? table[i] : table[mirror(i)];
    if (p.type === 'b') { if (p.color === WHITE) wb += 1; else bb += 1; }
    white += p.color === WHITE ? v : -v;
  }
  if (wb >= 2) white += 30;
  if (bb >= 2) white -= 30;
  return color === WHITE ? white : -white;
}

// MVV-LVA-ish ordering: captures (biggest victim, smallest attacker) and
// promotions first — dramatically improves alpha-beta pruning.
function scoreMove(m) {
  let s = 0;
  if (m.capture) s += 1000 + VAL[m.captureType || 'p'] * 8 - VAL[m.type];
  if (m.promo) s += 800 + VAL[m.promo];
  if (m.castle) s += 40;
  return s;
}

function orderMoves(pos, moves) {
  for (const m of moves) {
    if (m.capture && m.captureType === undefined) {
      const t = pos.board[m.to];
      m.captureType = t ? t.type : 'p'; // 'p' for en passant (victim square empty)
    }
  }
  return moves.slice().sort((a, b) => scoreMove(b) - scoreMove(a));
}

const NODE_BUDGET = 700000; // hard cap so a wild position can never hang the tab
const QMAX = 8; // max plies of capture-chain quiescence
let nodeBudget = 0;

// The search runs on a single position via in-place make/unmake (no per-node
// board cloning), which is the difference between "responsive" and "seconds per
// move" in a browser.
function quiesce(pos, alpha, beta, qdepth) {
  const color = pos.turn;
  const stand = evaluate(pos, color);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  if (qdepth <= 0 || nodeBudget <= 0) return alpha;

  const caps = legalMoves(pos, color).filter((m) => m.capture || m.promo);
  for (const m of orderMoves(pos, caps)) {
    nodeBudget -= 1;
    if (nodeBudget <= 0) break;
    const u = makeMoveInPlace(pos, m);
    const v = -quiesce(pos, -beta, -alpha, qdepth - 1);
    unmakeMoveInPlace(pos, m, u);
    if (v >= beta) return beta;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

function negamax(pos, depth, alpha, beta, useQ) {
  const color = pos.turn;
  const moves = legalMoves(pos, color);
  if (moves.length === 0) {
    // Prefer slower losses / faster wins by folding depth into the mate score.
    return inCheck(pos.board, color) ? -(MATE - depth) : 0;
  }
  if (depth === 0) return useQ ? quiesce(pos, alpha, beta, QMAX) : evaluate(pos, color);

  let best = -Infinity;
  for (const m of orderMoves(pos, moves)) {
    if (nodeBudget <= 0) { const v = evaluate(pos, color); if (v > best) best = v; break; }
    nodeBudget -= 1;
    const u = makeMoveInPlace(pos, m);
    const v = -negamax(pos, depth - 1, -beta, -alpha, useQ);
    unmakeMoveInPlace(pos, m, u);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Choose a move for the side to move in `pos`. Returns a legal move object (from
 * rules.js) or null if there are none.
 *
 * Pass 1 is a normal alpha-beta (alpha-sharing) search that finds the exact
 * best move — this is what guarantees the AI always spots a forced mate / best
 * reply and is used alone by Hard (spread 0), so Hard is deterministic-best.
 * Pass 2 (only when spread > 0, i.e. Easy/Medium) re-scores each move against a
 * window whose lower bound sits just *below* (best - spread), so moves clearly
 * worse than the best fail low and are excluded while genuine near-best moves
 * are pooled and one is drawn at random — cheap, correct move variety.
 * @param {object} pos0
 * @param {{depth?:number, randomness?:number, quiesce?:boolean, spread?:number}} [opts]
 */
export function pickMove(pos0, opts = {}) {
  const depth = opts.depth ?? DIFFICULTY.medium.depth;
  const randomness = opts.randomness ?? 0;
  const useQ = opts.quiesce ?? true;
  const spread = opts.spread ?? 0;

  const pos = clonePosition(pos0); // never mutate the caller's position
  const moves = legalMoves(pos, pos.turn);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  if (randomness > 0 && Math.random() < randomness) {
    return moves[(Math.random() * moves.length) | 0];
  }
  const ordered = orderMoves(pos, moves);

  // pass 1 — exact best via alpha-sharing
  nodeBudget = NODE_BUDGET;
  let alpha = -Infinity;
  let bestVal = -Infinity;
  let bestMove = ordered[0];
  for (const m of ordered) {
    const u = makeMoveInPlace(pos, m);
    const v = -negamax(pos, depth - 1, -Infinity, -alpha, useQ);
    unmakeMoveInPlace(pos, m, u);
    if (v > bestVal) { bestVal = v; bestMove = m; }
    if (v > alpha) alpha = v;
  }
  if (spread <= 0) return bestMove;

  // pass 2 — collect near-best moves (threshold strictly below the cutoff so
  // clearly-worse moves fail low and are excluded)
  const threshold = bestVal - spread;
  const cBeta = -(threshold - 1);
  nodeBudget = NODE_BUDGET;
  const pool = [];
  for (const m of ordered) {
    const u = makeMoveInPlace(pos, m);
    const v = -negamax(pos, depth - 1, -Infinity, cBeta, useQ);
    unmakeMoveInPlace(pos, m, u);
    if (v >= threshold) pool.push(m);
  }
  return pool.length ? pool[(Math.random() * pool.length) | 0] : bestMove;
}
