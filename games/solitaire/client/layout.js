/**
 * layout.js — fixed logical-pixel board geometry.
 *
 * The board is laid out once in a fixed "design space" (BOARD_W x BOARD_H
 * logical px); app.js scales the whole .sol-board element to fit the real
 * viewport via CSS transform (see fitBoard() there), the same "virtual
 * viewport" idea as games/comet's canvas sizing but applied to a DOM
 * subtree of absolutely-positioned cards. Because scaling is uniform and
 * applied to the whole board at once, everything below only has to get the
 * *logical* geometry right once — never touches real screen pixels.
 *
 * Top row (left→right, 7 slots wide to match the 7 tableau columns below):
 *   [stock] [waste] [ -- ] [foundation S] [foundation H] [foundation D] [foundation C]
 * This column order is a fixed layout convention, not text direction —
 * it must NOT mirror under RTL languages (see i18n.js / index.html's
 * dir="ltr" on #board).
 */

export const CARD_W = 100;
export const CARD_H = 140;
export const GAP = 18;
export const PAD = 22;
export const TOP_GAP = 34;
export const TABLEAU_BUDGET = 480; // max on-screen height a tableau column may ever occupy
export const FD_OFFSET = 11; // reveal offset for a face-down card under another
export const FU_OFFSET = 28; // reveal offset for a face-up card under another

export const BOARD_W = PAD * 2 + 7 * CARD_W + 6 * GAP;
export const BOARD_H = PAD * 2 + CARD_H + TOP_GAP + TABLEAU_BUDGET;

export const TOP_Y = PAD;
export const TABLEAU_Y = PAD + CARD_H + TOP_GAP;

export function colX(i) {
  return PAD + i * (CARD_W + GAP);
}

export const STOCK_SLOT = { x: colX(0), y: TOP_Y };
export const WASTE_SLOT = { x: colX(1), y: TOP_Y };
// suit order across the 4 right-hand top slots (cols 3..6)
export const FOUNDATION_SUIT_ORDER = ['S', 'H', 'D', 'C'];
export const FOUNDATION_SLOTS = Object.fromEntries(
  FOUNDATION_SUIT_ORDER.map((suit, i) => [suit, { x: colX(3 + i), y: TOP_Y }]),
);

export function tableauSlot(col) {
  return { x: colX(col), y: TABLEAU_Y };
}

/**
 * Compute the y-offset (relative to the column's top/first card) of each
 * card in a tableau column, shrinking the per-card reveal offset as needed
 * so the column can NEVER exceed TABLEAU_BUDGET regardless of how many
 * cards pile up in it (a normal deal never gets close, but nothing stops a
 * long game — or a directly-poked debug state — from stacking many cards
 * in one column). Returns an array of y-offsets, one per card, same length
 * as `column`.
 */
export function tableauOffsets(column) {
  const n = column.length;
  if (n === 0) return [];
  const desired = column.map((entry, i) => (i === 0 ? 0 : entry.faceUp ? FU_OFFSET : FD_OFFSET));
  const totalDesired = desired.reduce((a, b) => a + b, 0);
  const maxTotal = TABLEAU_BUDGET - CARD_H;
  const scale = totalDesired > maxTotal && totalDesired > 0 ? maxTotal / totalDesired : 1;
  const offsets = [];
  let y = 0;
  for (let i = 0; i < n; i++) {
    y += desired[i] * scale;
    offsets.push(y);
  }
  return offsets;
}
