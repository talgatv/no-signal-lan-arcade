/**
 * rules.js — pure move-validation / win / auto-finish logic for Klondike.
 * No DOM here; everything takes plain state objects so it's trivially
 * testable from a console (also used by app.js's window.OGH_SOLITAIRE hook).
 *
 * Simplifications documented in README.md:
 *  - Foundations are a one-way sink during normal play — no drag/tap a
 *    card back from a foundation to the tableau. Undo is how you reverse a
 *    foundation placement. This matches most simplified digital Klondikes.
 */
import { isRed } from './cards.js';

/** Can `cards` (a run, bottom card first) be dropped on a tableau column
 *  whose current top is `destTop` (null if the column is empty)? */
export function canDropOnTableau(cards, destTop) {
  if (!cards.length) return false;
  const first = cards[0];
  if (!destTop) return first.rank === 13; // only a King may start an empty column
  return first.rank === destTop.rank - 1 && isRed(first.suit) !== isRed(destTop.suit);
}

/** Can `card` be dropped on the foundation pile `pile` (array, top = last)? */
export function canDropOnFoundation(card, pile) {
  if (!pile.length) return card.rank === 1;
  return card.rank === pile[pile.length - 1].rank + 1;
}

export function isWin(foundations) {
  return Object.values(foundations).every((pile) => pile.length === 13);
}

/** True once every remaining card is visible and there's still a move to
 * make — i.e. it's safe to offer one-click auto-completion. Stock+waste
 * must be empty and no tableau card may be face-down. This is the standard
 * heuristic used by essentially every Klondike implementation's "Auto
 * play": once nothing is hidden, the greedy scan-and-send loop below is
 * guaranteed to empty the whole board (for any column, the card blocking
 * further progress is always its exposed top card, and the globally
 * lowest still-needed foundation rank is always sitting at the top of
 * *some* column — if a lower-still-needed card were buried under it, that
 * buried card's own suit would have an even smaller still-needed rank,
 * contradicting minimality). */
export function canAutoFinish(state) {
  if (state.stock.length || state.waste.length) return false;
  if (isWin(state.foundations)) return false;
  return state.tableau.every((col) => col.every((entry) => entry.faceUp));
}

/** Find the next greedy auto-finish move, or null if none remains.
 * Only used once canAutoFinish() is true (stock/waste already empty). */
export function findAutoFinishMove(state) {
  for (let col = 0; col < state.tableau.length; col++) {
    const column = state.tableau[col];
    if (!column.length) continue;
    const top = column[column.length - 1];
    if (!top.faceUp) continue;
    if (canDropOnFoundation(top.card, state.foundations[top.card.suit])) {
      return {
        source: { type: 'tableau', col, index: column.length - 1 },
        destSlot: { type: 'foundation', suit: top.card.suit },
      };
    }
  }
  return null;
}

/* ---- pure state-query / state-mutation helpers used by app.js ---------
 * Kept here (not app.js) so the whole move-legality surface is in one
 * DOM-free, console-testable file. validateMove() is pure/cheap and gets
 * called on every pointermove while a drag is in flight (for the live
 * drop-highlight) as well as once per real attempt — it must never mutate
 * or be conflated with committing a move. Only removeFromSource() mutates,
 * and only app.js's tryMove() calls it, only after validateMove() passes. */

/** The cards a pointer/tap gesture starting at `source` would carry (bottom
 * of the run first), or null if `source` isn't currently a legal grab —
 * either nothing there, or (for a tableau card) it's face-down. */
export function getMovableCards(state, source) {
  if (!source) return null;
  if (source.type === 'waste') {
    if (!state.waste.length) return null;
    return [state.waste[state.waste.length - 1]];
  }
  if (source.type === 'tableau') {
    const column = state.tableau[source.col];
    if (!column || source.index < 0 || source.index >= column.length) return null;
    if (!column[source.index].faceUp) return null;
    return column.slice(source.index).map((entry) => entry.card);
  }
  return null;
}

/** Would dropping `cards` (as returned by getMovableCards) from `source`
 * onto `destSlot` be legal? Pure — no mutation. */
export function validateMove(state, source, destSlot, cards) {
  if (!destSlot || !cards || !cards.length) return false;
  if (destSlot.type === 'foundation') {
    if (cards.length !== 1) return false; // only one card moves to a foundation at a time
    const card = cards[0];
    if (card.suit !== destSlot.suit) return false;
    return canDropOnFoundation(card, state.foundations[destSlot.suit]);
  }
  if (destSlot.type === 'tableau') {
    if (source && source.type === 'tableau' && source.col === destSlot.col) return false; // no-op onto its own column
    const destCol = state.tableau[destSlot.col];
    const destTop = destCol.length ? destCol[destCol.length - 1].card : null;
    return canDropOnTableau(cards, destTop);
  }
  return false;
}

/** Mutates `state`: removes the movable run at `source` and returns it
 * (bottom-of-run first), flipping a newly-exposed tableau top face-up.
 * Caller must have already validated the move. */
export function removeFromSource(state, source) {
  if (source.type === 'waste') return [state.waste.pop()];
  if (source.type === 'tableau') {
    const column = state.tableau[source.col];
    const removed = column.splice(source.index).map((entry) => entry.card);
    if (column.length && !column[column.length - 1].faceUp) {
      column[column.length - 1].faceUp = true;
    }
    return removed;
  }
  return [];
}
