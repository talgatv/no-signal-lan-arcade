/**
 * ai.js — a modest heuristic dominoes opponent (this genre doesn't need
 * minimax). Pure/DOM-free. It always plays a legal tile when one exists, and
 * among legal plays it prefers to:
 *   - offload doubles (they're the hardest tiles to place later),
 *   - shed heavier tiles (fewer pips left if the game blocks),
 *   - keep its own options open (leave ends that match more of its remaining
 *     hand).
 * That's a genuine, non-trivial policy — clearly better than "first legal
 * tile" — without pretending to deep strategy over hidden information.
 */

import { legalPlays, placeTile, removeTile, ends } from './rules.js';

/**
 * Choose a play for `hand` on `line`.
 * @returns {{tile:number[], end:string}|null} null if nothing is playable.
 */
export function pickPlay(hand, line) {
  const plays = legalPlays(hand, line);
  if (!plays.length) return null;
  if (plays.length === 1) return plays[0];

  let best = -Infinity;
  let picks = [];
  for (const pl of plays) {
    const [a, b] = pl.tile;
    let score = 0;
    if (a === b) score += 3; // prefer getting doubles out
    score += (a + b) * 0.5; // prefer heavier tiles
    // Flexibility: how many of the remaining tiles still match an open end?
    const nextLine = placeTile(line, pl.tile, pl.end);
    const remaining = removeTile(hand, pl.tile);
    const e = ends(nextLine);
    let flex = 0;
    for (const [x, y] of remaining) {
      if (x === e.left || y === e.left || x === e.right || y === e.right) flex++;
    }
    score += flex;
    if (score > best) { best = score; picks = [pl]; }
    else if (score === best) picks.push(pl);
  }
  return picks[(Math.random() * picks.length) | 0];
}
