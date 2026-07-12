/**
 * rules.js — pure, DOM-free double-six dominoes (block game) engine.
 *
 * All plain functions over simple data, so the rules are unit-testable in
 * isolation and are exposed at window.OGH_DOMINO for driving/inspecting the
 * game without the UI — the same "pure logic never touches the DOM/network"
 * split as games/tic-tac-toe.
 *
 * Data model
 * ----------
 *  - A tile is a 2-element array [a, b] with a <= b (canonical), pips a+b.
 *  - A full set is the 28 tiles [0,0]..[6,6], each combination once.
 *  - A hand is an array of tiles; the boneyard is an array of tiles.
 *  - The table line is an array of PLACED tiles { l, r, tile } read
 *    left-to-right, where consecutive tiles match (line[i].r === line[i+1].l).
 *    The two open ends are line[0].l (left) and line[last].r (right).
 *
 * Deterministic dealing
 * ---------------------
 *  shuffledDeck(seed) is a seeded Fisher-Yates over the full set, so two LAN
 *  clients that share only a small integer `seed` deal an identical deck and
 *  boneyard WITHOUT ever putting any hand/tile list on the wire. Each client
 *  computes only its own hand slice + the boneyard; the opponent's hand is
 *  tracked purely as a count. (See the LAN section of the README for the
 *  honest limits of serverless hidden-hand privacy.)
 */

/** mulberry32 — tiny deterministic PRNG. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The 28 canonical double-six tiles. */
export function fullSet() {
  const tiles = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) tiles.push([a, b]);
  return tiles;
}

/** Seeded shuffle of the full set — identical for a given seed. */
export function shuffledDeck(seed) {
  const d = fullSet();
  const rng = makeRng(seed);
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = d[i]; d[i] = d[j]; d[j] = tmp;
  }
  return d;
}

/** Deal from a deck order: hands[0], hands[1], and the remaining boneyard. */
export function deal(deck, handSize = 7) {
  return {
    hands: [deck.slice(0, handSize), deck.slice(handSize, handSize * 2)],
    boneyard: deck.slice(handSize * 2),
  };
}

export const tilePips = (tile) => tile[0] + tile[1];
export const handPips = (hand) => hand.reduce((s, t) => s + tilePips(t), 0);
export const sameTile = (a, b) => a[0] === b[0] && a[1] === b[1];

/** Open ends of the line, or null when empty. */
export function ends(line) {
  if (!line.length) return null;
  return { left: line[0].l, right: line[line.length - 1].r };
}

/** Which open end(s) `tile` can attach to. {first:true} when the line is empty. */
export function playableEnds(tile, line) {
  if (!line.length) return { first: true };
  const e = ends(line);
  const [a, b] = tile;
  return {
    left: a === e.left || b === e.left,
    right: a === e.right || b === e.right,
  };
}

/** Does `hand` contain any tile playable on the current line? */
export function hasPlayable(hand, line) {
  if (!line.length) return hand.length > 0;
  const e = ends(line);
  return hand.some(([a, b]) => a === e.left || b === e.left || a === e.right || b === e.right);
}

/** All legal placements from `hand`: [{tile, end:'first'|'left'|'right'}]. */
export function legalPlays(hand, line) {
  const out = [];
  if (!line.length) {
    for (const tile of hand) out.push({ tile, end: 'first' });
    return out;
  }
  const e = ends(line);
  for (const tile of hand) {
    const [a, b] = tile;
    if (a === e.left || b === e.left) out.push({ tile, end: 'left' });
    if (a === e.right || b === e.right) out.push({ tile, end: 'right' });
  }
  return out;
}

/**
 * Return a NEW line with `tile` placed on `end` ('first' | 'left' | 'right'),
 * correctly oriented so the matching pip touches the line. Assumes the
 * placement is legal (callers gate with playableEnds/legalPlays).
 */
export function placeTile(line, tile, end) {
  const [a, b] = tile;
  if (!line.length || end === 'first') {
    return [{ l: a, r: b, tile: [a, b] }];
  }
  const e = ends(line);
  if (end === 'left') {
    // new tile's RIGHT pip must equal the current left end; its LEFT pip
    // becomes the new exposed left end.
    const placed = b === e.left ? { l: a, r: b } : { l: b, r: a };
    return [{ ...placed, tile: [a, b] }, ...line];
  }
  // right: new tile's LEFT pip must equal the current right end.
  const placed = a === e.right ? { l: a, r: b } : { l: b, r: a };
  return [...line, { ...placed, tile: [a, b] }];
}

/** Remove the first copy of `tile` from `hand`, returning a new hand. */
export function removeTile(hand, tile) {
  const i = hand.findIndex((t) => sameTile(t, tile));
  if (i < 0) return hand.slice();
  const h = hand.slice();
  h.splice(i, 1);
  return h;
}

/** Player index (0|1) who has emptied their hand, or null. */
export function winnerByEmpty(hands) {
  if (hands[0].length === 0) return 0;
  if (hands[1].length === 0) return 1;
  return null;
}

/** Blocked-game result: lower remaining pip total wins; tie -> 'draw'. */
export function blockedResult(hands) {
  const p0 = handPips(hands[0]);
  const p1 = handPips(hands[1]);
  if (p0 < p1) return { winner: 0, pips: [p0, p1] };
  if (p1 < p0) return { winner: 1, pips: [p0, p1] };
  return { winner: 'draw', pips: [p0, p1] };
}
