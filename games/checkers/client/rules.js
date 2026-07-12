/**
 * rules.js — pure, DOM-free English draughts (standard checkers) engine.
 *
 * Everything here is plain functions over a 64-cell board array, so the
 * rules can be driven directly (see window.OGH_CHECKERS in app.js) and
 * unit-tested in isolation without any DOM or network — same "pure logic
 * never touches the DOM" split as games/tic-tac-toe's app.js.
 *
 * Board model
 * -----------
 *  - 64 cells, row-major: index = row*8 + col, row 0 at the TOP.
 *  - A cell is `null` (empty or an unused light square) or a piece
 *    `{ color: 'c'|'p', king: boolean }`.
 *  - Only dark squares ((row+col) odd) are ever occupied.
 *  - color 'c' (cyan) starts at the BOTTOM (rows 5-7) and moves UP
 *    (decreasing row); its king row is row 0.
 *  - color 'p' (pink) starts at the TOP (rows 0-2) and moves DOWN
 *    (increasing row); its king row is row 7.
 *  - Men move/capture only diagonally forward; kings do both directions.
 *
 * Rules implemented (standard English draughts):
 *  - Mandatory capture: if any capture exists for the side to move, only
 *    captures are legal (legalMoves() returns captures exclusively).
 *  - Multi-jump chains: a capture that can be immediately followed by
 *    another capture with the same piece MUST continue (legalMoves()
 *    returns complete jump sequences; captureStepsFrom() drives the
 *    interactive one-hop-at-a-time continuation).
 *  - Crowning: a man reaching the far row becomes a king. Per standard
 *    English-draughts rules, if a man reaches the king row *during* a jump
 *    the move terminates there (it does not keep jumping as a king that
 *    turn) — see the `promote` short-circuit in captureFrom().
 *  - Win: opponent has no pieces OR no legal move on their turn.
 *
 * Note: captured pieces are removed immediately during a chain (they can't
 * block later landing squares in the same sequence). This is the standard
 * casual-play interpretation and produces identical legal move sets to the
 * "remove after the move" reading in every ordinary position.
 */

export const BOARD_N = 8;
export const CELLS = BOARD_N * BOARD_N;

export const row = (i) => (i / 8) | 0;
export const col = (i) => i % 8;
export const idx = (r, c) => r * 8 + c;
export const onBoard = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
export const isDark = (r, c) => ((r + c) & 1) === 1;
export const other = (color) => (color === 'c' ? 'p' : 'c');
export const kingRow = (color) => (color === 'c' ? 0 : 7);

export function cloneBoard(board) {
  return board.map((p) => (p ? { color: p.color, king: p.king } : null));
}

/** Standard 12-vs-12 starting position. */
export function initialBoard() {
  const b = new Array(CELLS).fill(null);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (!isDark(r, c)) continue;
      if (r < 3) b[idx(r, c)] = { color: 'p', king: false };
      else if (r > 4) b[idx(r, c)] = { color: 'c', king: false };
    }
  }
  return b;
}

/** Diagonal directions this piece may travel. */
function dirsFor(color, king) {
  if (king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return color === 'c' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

/**
 * All complete capture sequences starting from cell `i`, recursively.
 * Each result is a full jump chain: { path:[i, land1, land2, ...],
 * captures:[mid1, mid2, ...], promote:boolean }.
 */
function captureFrom(board, i, color) {
  const piece = board[i];
  const results = [];
  const r = row(i);
  const c = col(i);
  for (const [dr, dc] of dirsFor(color, piece.king)) {
    const mr = r + dr;
    const mc = c + dc;
    const lr = r + 2 * dr;
    const lc = c + 2 * dc;
    if (!onBoard(lr, lc)) continue;
    const mid = board[idx(mr, mc)];
    if (!mid || mid.color === color) continue; // must jump an enemy
    if (board[idx(lr, lc)]) continue; // landing must be empty
    const li = idx(lr, lc);
    const capIdx = idx(mr, mc);

    const nb = cloneBoard(board);
    nb[i] = null;
    nb[capIdx] = null;
    nb[li] = { color: piece.color, king: piece.king };
    const promo = !piece.king && lr === kingRow(color);
    if (promo) {
      nb[li].king = true;
      // Crowned mid-jump → the move terminates here (English draughts).
      results.push({ path: [i, li], captures: [capIdx], promote: true });
      continue;
    }
    const cont = captureFrom(nb, li, color);
    if (cont.length === 0) {
      results.push({ path: [i, li], captures: [capIdx], promote: false });
    } else {
      for (const s of cont) {
        // s.path already begins at this jump's landing square (li), so it is
        // spread whole after the outer start `i` — [i, li, ...] with no dup.
        results.push({
          path: [i, ...s.path],
          captures: [capIdx, ...s.captures],
          promote: s.promote,
        });
      }
    }
  }
  return results;
}

/**
 * Every legal *complete* move for `color`. If any capture exists, ONLY
 * captures are returned (mandatory-capture rule). Each move:
 *   { path:number[], captures:number[], promote:boolean, isCapture:boolean }
 */
export function legalMoves(board, color) {
  const captures = [];
  for (let i = 0; i < CELLS; i++) {
    const p = board[i];
    if (!p || p.color !== color) continue;
    for (const s of captureFrom(board, i, color)) {
      s.isCapture = true;
      captures.push(s);
    }
  }
  if (captures.length) return captures;

  const simple = [];
  for (let i = 0; i < CELLS; i++) {
    const p = board[i];
    if (!p || p.color !== color) continue;
    const r = row(i);
    const c = col(i);
    for (const [dr, dc] of dirsFor(color, p.king)) {
      const nr = r + dr;
      const nc = c + dc;
      if (!onBoard(nr, nc)) continue;
      const ni = idx(nr, nc);
      if (board[ni]) continue;
      simple.push({
        path: [i, ni],
        captures: [],
        promote: !p.king && nr === kingRow(color),
        isCapture: false,
      });
    }
  }
  return simple;
}

/** Immediate one-hop capture steps for the piece at `i`: [{to, captured}]. */
export function captureStepsFrom(board, i, color) {
  const p = board[i];
  if (!p || p.color !== color) return [];
  const out = [];
  const r = row(i);
  const c = col(i);
  for (const [dr, dc] of dirsFor(color, p.king)) {
    const mr = r + dr;
    const mc = c + dc;
    const lr = r + 2 * dr;
    const lc = c + 2 * dc;
    if (!onBoard(lr, lc)) continue;
    const mid = board[idx(mr, mc)];
    if (!mid || mid.color === color) continue;
    if (board[idx(lr, lc)]) continue;
    out.push({ to: idx(lr, lc), captured: idx(mr, mc) });
  }
  return out;
}

/**
 * Immediate legal one-hop steps for the piece at `i`, honoring the
 * position-level mandatory-capture flag `mustCapture`. Drives interactive
 * selection/highlighting. Returns [{to, captured|null}].
 */
export function stepTargets(board, i, color, mustCapture) {
  const p = board[i];
  if (!p || p.color !== color) return [];
  if (mustCapture) return captureStepsFrom(board, i, color);
  const out = [];
  const r = row(i);
  const c = col(i);
  for (const [dr, dc] of dirsFor(color, p.king)) {
    const nr = r + dr;
    const nc = c + dc;
    if (!onBoard(nr, nc)) continue;
    const ni = idx(nr, nc);
    if (board[ni]) continue;
    out.push({ to: ni, captured: null });
  }
  return out;
}

/** Does `color` have any capture available anywhere? (mandatory-capture gate) */
export function hasAnyCapture(board, color) {
  for (let i = 0; i < CELLS; i++) {
    const p = board[i];
    if (!p || p.color !== color) continue;
    if (captureStepsFrom(board, i, color).length) return true;
  }
  return false;
}

export function countPieces(board, color) {
  let n = 0;
  for (const p of board) if (p && p.color === color) n++;
  return n;
}

/**
 * Apply a complete move (from legalMoves) to a fresh board and return it.
 * Removes every captured piece and crowns the mover when appropriate.
 */
export function applyMove(board, move) {
  const nb = cloneBoard(board);
  const from = move.path[0];
  const to = move.path[move.path.length - 1];
  const piece = nb[from];
  nb[from] = null;
  for (const cap of move.captures) nb[cap] = null;
  let king = piece.king;
  if (move.promote || (!king && row(to) === kingRow(piece.color))) king = true;
  nb[to] = { color: piece.color, king };
  return nb;
}

/**
 * Apply a single hop (used by the interactive/step-by-step path, both for a
 * local human tapping and for a relayed remote step). `from`/`to` are cell
 * indices; a distance of 2 rows means it was a capture. Mutates `board`.
 * @returns {{ captured:number|null, promote:boolean }}
 */
export function applyHop(board, from, to) {
  const piece = board[from];
  board[from] = null;
  let captured = null;
  if (Math.abs(row(to) - row(from)) === 2) {
    captured = idx((row(from) + row(to)) / 2, (col(from) + col(to)) / 2);
    board[captured] = null;
  }
  let king = piece.king;
  const promote = !king && row(to) === kingRow(piece.color);
  if (promote) king = true;
  board[to] = { color: piece.color, king };
  return { captured, promote };
}

/**
 * Outcome check, called at the START of `toMove`'s turn.
 * @returns {'c'|'p'|null} winner color, or null if the game continues.
 */
export function winnerAtTurn(board, toMove) {
  if (countPieces(board, toMove) === 0) return other(toMove);
  if (legalMoves(board, toMove).length === 0) return other(toMove);
  return null;
}
