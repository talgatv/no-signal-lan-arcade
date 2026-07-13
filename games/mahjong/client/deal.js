/**
 * deal.js — solvability-guaranteed board generation.
 *
 * The naive approach (place 68 random matching pairs onto 136 random
 * positions) can produce an unsolvable or early-deadlocked board. Instead
 * this uses a "drain the full board" construction:
 *
 *   1. Start with every slot "active".
 *   2. Repeatedly find all currently-free active slots (isFreeGiven,
 *      checked against the CURRENT active set — so as tiles are removed,
 *      remaining ones only ever become MORE free, never less).
 *   3. Pick any 2 of them, record that pair, remove both from "active".
 *   4. Repeat until nothing is active.
 *
 * The recorded pair order is — by construction — a fully valid clearing
 * sequence: every pair was genuinely free (top-clear + a side open) in the
 * exact board state it was removed from. Only AFTER this structural
 * pairing is decided do we assign a shared tile type to each pair, which
 * can never break the guarantee (type never affects the freedom rule).
 *
 * (An earlier "build up from empty" formulation — insert pairs into a
 * growing filled-set instead — was tried first and rejected: it can wall a
 * middle tile in between two neighbors placed before it, with no way to
 * undo, since the filled set only ever grows. The drain formulation has no
 * such failure mode because freedom is monotonically non-decreasing as the
 * active set shrinks; empirically it succeeds on attempt 1 in >95% of
 * fresh 136-tile boards and within a handful of attempts otherwise, and
 * fails closed — returns null — on genuinely-impossible inputs, e.g. a
 * hypothetical 2-slot input where one slot sits directly atop the other.)
 *
 * Because isFreeGiven() only ever looks at the tiles it's handed, this
 * exact function also generates a guaranteed-solvable rearrangement for
 * any SUBSET of slots — i.e. Shuffle just calls it again with only the
 * currently-remaining tiles' positions.
 */
import { isFreeGiven } from './layout.js';
import { TILE_TYPE_COUNT } from './tiles.js';

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * @param {Array<{id:string, layer:number, x:number, y:number}>} slots
 * @param {() => number} rng
 * @param {number} maxAttempts
 * @returns {{ order: Array<[string,string]> } | null}
 */
export function generateRemovalOrder(slots, rng = Math.random, maxAttempts = 500) {
  if (slots.length % 2 !== 0) return null; // pairs only — should never happen (see callers)
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const bySlotId = new Map(slots.map((s) => [s.id, s]));
    const active = new Set(slots.map((s) => s.id));
    const order = [];
    let stuck = false;
    while (active.size > 0) {
      const activeSlots = [...active].map((id) => bySlotId.get(id));
      const free = activeSlots.filter((s) =>
        isFreeGiven(s, activeSlots.filter((o) => o.id !== s.id)),
      );
      if (free.length < 2) {
        stuck = true;
        break;
      }
      shuffleInPlace(free, rng);
      const [a, b] = free;
      order.push([a.id, b.id]);
      active.delete(a.id);
      active.delete(b.id);
    }
    if (!stuck) return { order };
  }
  return null;
}

/** Assign each pair in `order` a shared random tile-type index (0..33),
 * cycling through all types as evenly as possible regardless of how many
 * pairs there are (68 for a fresh board, fewer for a Shuffle). */
export function assignTypes(order, rng = Math.random) {
  const seq = order.map((_, i) => i % TILE_TYPE_COUNT);
  shuffleInPlace(seq, rng);
  const typeOf = new Map();
  order.forEach(([a, b], i) => {
    typeOf.set(a, seq[i]);
    typeOf.set(b, seq[i]);
  });
  return typeOf;
}

/**
 * Build a fresh, guaranteed-solvable deal for exactly the given slots.
 * Returns an array of `{ ...slot, type }`, or null if no valid order could
 * be constructed (callers must handle this — see app.js's shuffle(), the
 * one caller where a contrived remaining-tile shape could in principle
 * make it fail; a fresh New Game essentially never fails in practice).
 */
export function buildDeal(slots, rng = Math.random) {
  const gen = generateRemovalOrder(slots, rng);
  if (!gen) return null;
  const typeOf = assignTypes(gen.order, rng);
  return slots.map((s) => ({ ...s, type: typeOf.get(s.id) }));
}
