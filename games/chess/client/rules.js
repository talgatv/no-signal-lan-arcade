/**
 * rules.js — pure, DOM-free standard chess engine.
 *
 * Everything here is plain functions over a 64-cell board array plus a small
 * position record, so the rules can be driven directly (see window.OGH_CHESS
 * in app.js) and unit-tested in isolation without any DOM or network — the
 * same "pure logic never touches the DOM" split as games/checkers/rules.js.
 *
 * Board model
 * -----------
 *  - 64 cells, row-major: index = row*8 + col, row 0 at the TOP.
 *  - A cell is `null` (empty) or a piece `{ color:'w'|'b', type:'p'|'n'|'b'|'r'|'q'|'k' }`.
 *  - White ('w') starts at the BOTTOM (rows 6-7) and pawns move UP (row-1);
 *    White promotes on row 0. Black ('b') starts at the TOP (rows 0-1) and
 *    pawns move DOWN (row+1); Black promotes on row 7. This matches the
 *    on-screen layout (White at the bottom) exactly, so cell-index math is the
 *    physical left-to-right / top-to-bottom order regardless of UI text `dir`.
 *  - FEN maps rank 8 -> row 0 (top). Uppercase = White, lowercase = Black.
 *
 * A "position" is `{ board, turn, castling, ep, halfmove, fullmove }`:
 *  - turn:      'w' | 'b'
 *  - castling:  { wk, wq, bk, bq } booleans (king/queen-side rights per color)
 *  - ep:        index of the square a pawn may capture onto en passant, or null
 *  - halfmove:  plies since the last capture or pawn move (50-move rule)
 *  - fullmove:  full move number (starts at 1)
 *
 * A "move" is `{ from, to, color, type, capture, promo, ep, double, castle }`:
 *  - promo:  null | 'q'|'r'|'b'|'n'  (promotion piece; a promotion generates
 *            one move per choice)
 *  - ep:     true if this is an en-passant capture
 *  - double: true if this is a pawn two-square advance (sets the ep target)
 *  - castle: null | 'k' | 'q'  (king/queen-side castling)
 *
 * Legal-move generation is the standard, correct approach: generate
 * pseudo-legal moves per piece, then reject any that leave the mover's own king
 * in check. The king-safety test is done by an in-place make/test/unmake on the
 * shared board (touching only the few squares a move changes), so it is cheap
 * enough to run inside the AI search.
 */

export const N = 8;
export const CELLS = 64;
export const WHITE = 'w';
export const BLACK = 'b';

export const row = (i) => i >> 3;
export const col = (i) => i & 7;
export const idx = (r, c) => r * 8 + c;
export const onBoard = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
export const other = (color) => (color === WHITE ? BLACK : WHITE);

export const START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Algebraic name of a cell index, e.g. idx(7,4) -> "e1". Debug/testing aid. */
export function sqName(i) {
  return String.fromCharCode(97 + col(i)) + (8 - row(i));
}

export function cloneBoard(board) {
  return board.map((p) => (p ? { color: p.color, type: p.type } : null));
}

export function clonePosition(pos) {
  return {
    board: cloneBoard(pos.board),
    turn: pos.turn,
    castling: { ...pos.castling },
    ep: pos.ep,
    halfmove: pos.halfmove,
    fullmove: pos.fullmove,
  };
}

// ---- movement offset tables ----------------------------------------------
const KNIGHT_D = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING_D = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const BISHOP_D = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_D = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// ---- FEN ------------------------------------------------------------------
/** Parse a FEN string into a position. Fields after the board are optional. */
export function parseFEN(fen) {
  const parts = String(fen).trim().split(/\s+/);
  const placement = parts[0];
  const turn = parts[1] === 'b' ? BLACK : WHITE;
  const castle = parts[2] || '-';
  const ep = parts[3] || '-';
  const half = parts[4];
  const full = parts[5];

  const board = new Array(CELLS).fill(null);
  const rows = placement.split('/');
  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (const ch of rows[r] || '') {
      if (ch >= '1' && ch <= '8') {
        c += ch.charCodeAt(0) - 48;
      } else {
        const color = ch === ch.toUpperCase() ? WHITE : BLACK;
        board[idx(r, c)] = { color, type: ch.toLowerCase() };
        c += 1;
      }
    }
  }

  const castling = {
    wk: castle.includes('K'),
    wq: castle.includes('Q'),
    bk: castle.includes('k'),
    bq: castle.includes('q'),
  };

  let epIdx = null;
  if (ep !== '-' && ep.length >= 2) {
    const file = ep.charCodeAt(0) - 97;
    const rank = ep.charCodeAt(1) - 48;
    if (file >= 0 && file < 8 && rank >= 1 && rank <= 8) epIdx = idx(8 - rank, file);
  }

  return {
    board,
    turn,
    castling,
    ep: epIdx,
    halfmove: Number.isFinite(+half) ? +half : 0,
    fullmove: Number.isFinite(+full) ? +full : 1,
  };
}

/** Serialize a position back to FEN (debug/testing aid). */
export function toFEN(pos) {
  let placement = '';
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = pos.board[idx(r, c)];
      if (!p) { empty += 1; continue; }
      if (empty) { placement += empty; empty = 0; }
      placement += p.color === WHITE ? p.type.toUpperCase() : p.type;
    }
    if (empty) placement += empty;
    if (r < 7) placement += '/';
  }
  const cr = (pos.castling.wk ? 'K' : '') + (pos.castling.wq ? 'Q' : '')
    + (pos.castling.bk ? 'k' : '') + (pos.castling.bq ? 'q' : '');
  const epName = pos.ep == null ? '-' : sqName(pos.ep);
  return `${placement} ${pos.turn} ${cr || '-'} ${epName} ${pos.halfmove} ${pos.fullmove}`;
}

export function initialPosition() {
  return parseFEN(START_FEN);
}

// ---- attack detection -----------------------------------------------------
/**
 * Is square (r,c) attacked by any piece of color `by` on `board`?
 * Pure geometric check (ignores pins — a pinned piece still gives check and
 * still controls squares), so it never recurses into move generation. Used for
 * check detection and for castling's "pass through / land on attacked square".
 */
export function attacksSquare(board, r, c, by) {
  // Pawns: a `by`-colored pawn one rank "behind" the target (from the target's
  // point of view) attacks it diagonally. White pawns sit below (row+1), Black
  // pawns sit above (row-1).
  const pr = by === WHITE ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    const pc = c + dc;
    if (onBoard(pr, pc)) {
      const p = board[idx(pr, pc)];
      if (p && p.color === by && p.type === 'p') return true;
    }
  }
  for (const [dr, dc] of KNIGHT_D) {
    const rr = r + dr; const cc = c + dc;
    if (onBoard(rr, cc)) {
      const p = board[idx(rr, cc)];
      if (p && p.color === by && p.type === 'n') return true;
    }
  }
  for (const [dr, dc] of KING_D) {
    const rr = r + dr; const cc = c + dc;
    if (onBoard(rr, cc)) {
      const p = board[idx(rr, cc)];
      if (p && p.color === by && p.type === 'k') return true;
    }
  }
  for (const [dr, dc] of BISHOP_D) {
    let rr = r + dr; let cc = c + dc;
    while (onBoard(rr, cc)) {
      const p = board[idx(rr, cc)];
      if (p) {
        if (p.color === by && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      rr += dr; cc += dc;
    }
  }
  for (const [dr, dc] of ROOK_D) {
    let rr = r + dr; let cc = c + dc;
    while (onBoard(rr, cc)) {
      const p = board[idx(rr, cc)];
      if (p) {
        if (p.color === by && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      rr += dr; cc += dc;
    }
  }
  return false;
}

export function findKing(board, color) {
  for (let i = 0; i < CELLS; i++) {
    const p = board[i];
    if (p && p.color === color && p.type === 'k') return i;
  }
  return -1;
}

/** Is `color`'s king currently attacked (in check) on `board`? */
export function inCheck(board, color) {
  const k = findKing(board, color);
  if (k < 0) return false;
  return attacksSquare(board, row(k), col(k), other(color));
}

// ---- pseudo-legal move generation ----------------------------------------
function pushMove(moves, from, to, color, type, capture, opts = {}) {
  moves.push({
    from,
    to,
    color,
    type,
    capture: !!capture,
    promo: opts.promo || null,
    ep: !!opts.ep,
    double: !!opts.double,
    castle: opts.castle || null,
  });
}

function genPawn(pos, color, i, r, c, moves) {
  const b = pos.board;
  const dr = color === WHITE ? -1 : 1;
  const startRow = color === WHITE ? 6 : 1;
  const promoRow = color === WHITE ? 0 : 7;
  const one = r + dr;

  // forward one (and two)
  if (onBoard(one, c) && !b[idx(one, c)]) {
    if (one === promoRow) {
      for (const promo of ['q', 'r', 'b', 'n']) pushMove(moves, i, idx(one, c), color, 'p', false, { promo });
    } else {
      pushMove(moves, i, idx(one, c), color, 'p', false);
      if (r === startRow) {
        const two = r + 2 * dr;
        if (!b[idx(two, c)]) pushMove(moves, i, idx(two, c), color, 'p', false, { double: true });
      }
    }
  }

  // diagonal captures + en passant
  for (const dc of [-1, 1]) {
    const cr = one; const cc = c + dc;
    if (!onBoard(cr, cc)) continue;
    const t = b[idx(cr, cc)];
    if (t && t.color !== color) {
      if (cr === promoRow) {
        for (const promo of ['q', 'r', 'b', 'n']) pushMove(moves, i, idx(cr, cc), color, 'p', true, { promo });
      } else {
        pushMove(moves, i, idx(cr, cc), color, 'p', true);
      }
    } else if (!t && pos.ep != null && idx(cr, cc) === pos.ep) {
      pushMove(moves, i, idx(cr, cc), color, 'p', true, { ep: true });
    }
  }
}

function genStep(b, color, i, r, c, dirs, moves, type) {
  for (const [dr, dc] of dirs) {
    const rr = r + dr; const cc = c + dc;
    if (!onBoard(rr, cc)) continue;
    const t = b[idx(rr, cc)];
    if (!t || t.color !== color) pushMove(moves, i, idx(rr, cc), color, type, !!t);
  }
}

function genSlide(b, color, i, r, c, dirs, moves, type) {
  for (const [dr, dc] of dirs) {
    let rr = r + dr; let cc = c + dc;
    while (onBoard(rr, cc)) {
      const t = b[idx(rr, cc)];
      if (!t) {
        pushMove(moves, i, idx(rr, cc), color, type, false);
      } else {
        if (t.color !== color) pushMove(moves, i, idx(rr, cc), color, type, true);
        break;
      }
      rr += dr; cc += dc;
    }
  }
}

/**
 * Castling. Generated only when fully legal per the rules: the right still
 * exists, the squares between are empty, the king is not currently in check,
 * and the king does not pass through or land on an attacked square.
 */
function genCastle(pos, color, i, moves) {
  const b = pos.board;
  const homeRow = color === WHITE ? 7 : 0;
  if (i !== idx(homeRow, 4)) return; // king must be on its home square
  if (inCheck(b, color)) return; // cannot castle out of check
  const enemy = other(color);

  const kSide = color === WHITE ? pos.castling.wk : pos.castling.bk;
  if (kSide) {
    const rk = b[idx(homeRow, 7)];
    if (!b[idx(homeRow, 5)] && !b[idx(homeRow, 6)]
      && rk && rk.type === 'r' && rk.color === color
      && !attacksSquare(b, homeRow, 5, enemy) && !attacksSquare(b, homeRow, 6, enemy)) {
      pushMove(moves, i, idx(homeRow, 6), color, 'k', false, { castle: 'k' });
    }
  }

  const qSide = color === WHITE ? pos.castling.wq : pos.castling.bq;
  if (qSide) {
    const rk = b[idx(homeRow, 0)];
    if (!b[idx(homeRow, 1)] && !b[idx(homeRow, 2)] && !b[idx(homeRow, 3)]
      && rk && rk.type === 'r' && rk.color === color
      && !attacksSquare(b, homeRow, 2, enemy) && !attacksSquare(b, homeRow, 3, enemy)) {
      pushMove(moves, i, idx(homeRow, 2), color, 'k', false, { castle: 'q' });
    }
  }
}

/** All pseudo-legal moves for `color` (own-king safety NOT yet enforced). */
export function pseudoLegal(pos, color = pos.turn) {
  const b = pos.board;
  const moves = [];
  for (let i = 0; i < CELLS; i++) {
    const p = b[i];
    if (!p || p.color !== color) continue;
    const r = row(i); const c = col(i);
    switch (p.type) {
      case 'p': genPawn(pos, color, i, r, c, moves); break;
      case 'n': genStep(b, color, i, r, c, KNIGHT_D, moves, 'n'); break;
      case 'k': genStep(b, color, i, r, c, KING_D, moves, 'k'); genCastle(pos, color, i, moves); break;
      case 'b': genSlide(b, color, i, r, c, BISHOP_D, moves, 'b'); break;
      case 'r': genSlide(b, color, i, r, c, ROOK_D, moves, 'r'); break;
      case 'q':
        genSlide(b, color, i, r, c, BISHOP_D, moves, 'q');
        genSlide(b, color, i, r, c, ROOK_D, moves, 'q');
        break;
      default: break;
    }
  }
  return moves;
}

/**
 * In-place make / test-king-safety / unmake on the shared board, touching only
 * the squares a move changes. Returns true if the move would leave `color`'s
 * own king in check (i.e. the move is illegal). This is what makes the
 * pin/check filter both correct and cheap enough for the AI.
 */
function leavesOwnKingInCheck(board, m, color) {
  const { from, to } = m;
  const moving = board[from];
  const captured = board[to];

  board[to] = m.promo ? { color, type: m.promo } : moving;
  board[from] = null;

  let epSq = -1; let epPiece = null;
  if (m.ep) {
    epSq = idx(row(to) + (color === WHITE ? 1 : -1), col(to));
    epPiece = board[epSq];
    board[epSq] = null;
  }

  let rFrom = -1; let rTo = -1; let rPiece = null;
  if (m.castle) {
    const hr = color === WHITE ? 7 : 0;
    if (m.castle === 'k') { rFrom = idx(hr, 7); rTo = idx(hr, 5); } else { rFrom = idx(hr, 0); rTo = idx(hr, 3); }
    rPiece = board[rFrom];
    board[rTo] = rPiece;
    board[rFrom] = null;
  }

  const bad = inCheck(board, color);

  // revert (exact inverse of the mutations above)
  board[from] = moving;
  board[to] = captured;
  if (m.ep) board[epSq] = epPiece;
  if (m.castle) { board[rFrom] = rPiece; board[rTo] = null; }

  return bad;
}

/** Every fully-legal move for `color`: pseudo-legal minus own-king-in-check. */
export function legalMoves(pos, color = pos.turn) {
  const board = pos.board;
  const out = [];
  for (const m of pseudoLegal(pos, color)) {
    if (!leavesOwnKingInCheck(board, m, color)) out.push(m);
  }
  return out;
}

/** Legal moves originating from cell `from` (drives selection/highlighting). */
export function movesForSquare(pos, from) {
  return legalMoves(pos, pos.turn).filter((m) => m.from === from);
}

// ---- applying a move ------------------------------------------------------
/**
 * Apply a move to a fresh position and return it (the authoritative state
 * transition). Handles captures, en passant, promotion, castling (rook move),
 * castling-rights updates, the en-passant target, the halfmove clock, and the
 * side to move.
 */
export function makeMove(pos, m) {
  const board = cloneBoard(pos.board);
  const moving = board[m.from];
  const color = moving.color;
  const homeRow = color === WHITE ? 7 : 0;

  board[m.from] = null;
  if (m.ep) {
    const capRow = row(m.to) + (color === WHITE ? 1 : -1);
    board[idx(capRow, col(m.to))] = null;
  }
  board[m.to] = m.promo ? { color, type: m.promo } : { color, type: moving.type };

  if (m.castle === 'k') {
    board[idx(homeRow, 5)] = board[idx(homeRow, 7)];
    board[idx(homeRow, 7)] = null;
  } else if (m.castle === 'q') {
    board[idx(homeRow, 3)] = board[idx(homeRow, 0)];
    board[idx(homeRow, 0)] = null;
  }

  const castling = { ...pos.castling };
  if (moving.type === 'k') {
    if (color === WHITE) { castling.wk = false; castling.wq = false; } else { castling.bk = false; castling.bq = false; }
  }
  // A rook leaving its home square, or being captured on it, kills that right.
  if (m.from === idx(7, 0) || m.to === idx(7, 0)) castling.wq = false;
  if (m.from === idx(7, 7) || m.to === idx(7, 7)) castling.wk = false;
  if (m.from === idx(0, 0) || m.to === idx(0, 0)) castling.bq = false;
  if (m.from === idx(0, 7) || m.to === idx(0, 7)) castling.bk = false;

  const ep = m.double ? idx((row(m.from) + row(m.to)) / 2, col(m.from)) : null;
  const halfmove = (moving.type === 'p' || m.capture) ? 0 : pos.halfmove + 1;
  const fullmove = color === BLACK ? pos.fullmove + 1 : pos.fullmove;

  return { board, turn: other(color), castling, ep, halfmove, fullmove };
}

/**
 * In-place make / unmake used by the AI search to avoid cloning the whole
 * board per node (the clone cost dominates otherwise). makeMoveInPlace mutates
 * `pos` and returns an `undo` token; unmakeMoveInPlace restores `pos` exactly.
 * The public makeMove (clone) above stays the authoritative transition for the
 * app; these two are a private fast path validated by the same perft suite.
 */
export function makeMoveInPlace(pos, m) {
  const b = pos.board;
  const moving = b[m.from];
  const color = moving.color;
  const homeRow = color === WHITE ? 7 : 0;
  const undo = {
    from: m.from,
    to: m.to,
    captured: b[m.to],
    castling: { ...pos.castling },
    ep: pos.ep,
    halfmove: pos.halfmove,
    fullmove: pos.fullmove,
    epCapSq: -1,
    epCapPiece: null,
    rFrom: -1,
    rTo: -1,
    rPiece: null,
  };

  b[m.from] = null;
  if (m.ep) {
    undo.epCapSq = idx(row(m.to) + (color === WHITE ? 1 : -1), col(m.to));
    undo.epCapPiece = b[undo.epCapSq];
    b[undo.epCapSq] = null;
  }
  b[m.to] = m.promo ? { color, type: m.promo } : moving;

  if (m.castle === 'k') {
    undo.rFrom = idx(homeRow, 7); undo.rTo = idx(homeRow, 5);
    undo.rPiece = b[undo.rFrom]; b[undo.rTo] = undo.rPiece; b[undo.rFrom] = null;
  } else if (m.castle === 'q') {
    undo.rFrom = idx(homeRow, 0); undo.rTo = idx(homeRow, 3);
    undo.rPiece = b[undo.rFrom]; b[undo.rTo] = undo.rPiece; b[undo.rFrom] = null;
  }

  const cst = pos.castling;
  if (moving.type === 'k') {
    if (color === WHITE) { cst.wk = false; cst.wq = false; } else { cst.bk = false; cst.bq = false; }
  }
  if (m.from === idx(7, 0) || m.to === idx(7, 0)) cst.wq = false;
  if (m.from === idx(7, 7) || m.to === idx(7, 7)) cst.wk = false;
  if (m.from === idx(0, 0) || m.to === idx(0, 0)) cst.bq = false;
  if (m.from === idx(0, 7) || m.to === idx(0, 7)) cst.bk = false;

  pos.ep = m.double ? idx((row(m.from) + row(m.to)) / 2, col(m.from)) : null;
  pos.halfmove = (moving.type === 'p' || m.capture) ? 0 : pos.halfmove + 1;
  if (color === BLACK) pos.fullmove += 1;
  pos.turn = other(color);
  return undo;
}

export function unmakeMoveInPlace(pos, m, undo) {
  const b = pos.board;
  const color = other(pos.turn); // the side that had moved
  if (m.promo) b[undo.from] = { color, type: 'p' };
  else b[undo.from] = b[undo.to];
  b[undo.to] = undo.captured;
  if (m.ep) b[undo.epCapSq] = undo.epCapPiece;
  if (m.castle) { b[undo.rFrom] = undo.rPiece; b[undo.rTo] = null; }
  pos.castling = undo.castling;
  pos.ep = undo.ep;
  pos.halfmove = undo.halfmove;
  pos.fullmove = undo.fullmove;
  pos.turn = color;
}

// ---- position status & draws ---------------------------------------------
/**
 * A canonical key for a position used to detect threefold repetition. Two
 * positions repeat when piece placement, side to move, castling rights and the
 * en-passant target all match — the standard definition.
 */
export function positionKey(pos) {
  let s = '';
  for (let i = 0; i < CELLS; i++) {
    const p = pos.board[i];
    s += p ? (p.color === WHITE ? p.type.toUpperCase() : p.type) : '.';
  }
  s += `|${pos.turn}`;
  s += `|${pos.castling.wk ? 'K' : ''}${pos.castling.wq ? 'Q' : ''}${pos.castling.bk ? 'k' : ''}${pos.castling.bq ? 'q' : ''}`;
  s += `|${pos.ep == null ? '-' : pos.ep}`;
  return s;
}

/**
 * Material too thin for either side to force mate — a draw. Implements the
 * standard small set: K vs K, K+N vs K, K+B vs K, and K+B vs K+B with both
 * bishops on same-colored squares. Any pawn/rook/queen -> sufficient.
 */
export function insufficientMaterial(board) {
  const minors = [];
  for (let i = 0; i < CELLS; i++) {
    const p = board[i];
    if (!p || p.type === 'k') continue;
    if (p.type === 'p' || p.type === 'r' || p.type === 'q') return false;
    minors.push(i); // only bishops/knights reach here
  }
  if (minors.length <= 1) return true; // KvK, KNvK, KBvK
  if (minors.length === 2) {
    const a = board[minors[0]]; const b = board[minors[1]];
    if (a.type === 'b' && b.type === 'b') {
      const ca = (row(minors[0]) + col(minors[0])) & 1;
      const cb = (row(minors[1]) + col(minors[1])) & 1;
      if (ca === cb) return true; // same-colored bishops
    }
    return false;
  }
  return false;
}

/**
 * Terminal / check status of `pos` for the side to move. Draw-by-repetition and
 * the 50-move rule need game history, so they are decided in app.js; this
 * covers checkmate, stalemate, insufficient material and check.
 * @returns {{status:'checkmate'|'stalemate'|'draw'|'check'|'ongoing',
 *            check:boolean, winner:('w'|'b'|'draw'|null), reason:(string|null)}}
 */
export function gameStatus(pos) {
  const color = pos.turn;
  const check = inCheck(pos.board, color);
  const moves = legalMoves(pos, color);
  if (moves.length === 0) {
    if (check) return { status: 'checkmate', check: true, winner: other(color), reason: 'checkmate' };
    return { status: 'stalemate', check: false, winner: 'draw', reason: 'stalemate' };
  }
  if (insufficientMaterial(pos.board)) {
    return { status: 'draw', check, winner: 'draw', reason: 'material' };
  }
  return { status: check ? 'check' : 'ongoing', check, winner: null, reason: null };
}

export function countMaterial(board, color) {
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let n = 0;
  for (const p of board) if (p && p.color === color) n += VAL[p.type];
  return n;
}
