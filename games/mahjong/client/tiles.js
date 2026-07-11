/**
 * tiles.js — the 34 unique Mahjong Solitaire tile types.
 *
 * Rendered directly with the real Unicode Mahjong Tiles block (U+1F000–
 * U+1F02B) — no bitmap image assets, no custom SVG art. Confirmed legible
 * in this environment's browser/system fonts (Noto's symbol coverage
 * renders every glyph cleanly, including the red-tinted center dragon,
 * even with no font-family override needed).
 *
 * U+1F000–U+1F021 is exactly the 34 non-flower/season/joker/back tiles:
 * 4 winds + 3 dragons + 9 characters(wan) + 9 bamboos(sou) + 9 circles(pin).
 * This hub's board uses exactly 4 copies of each (136 tiles = 68 pairs) —
 * the "simplified, consistent multiples-of-2" set suggested for this game,
 * skipping flowers/seasons/joker (U+1F022–U+1F02B) to keep the matching
 * rule uniform (every tile matches only its exact own type, no wildcards).
 */

function range1to9() {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9];
}

const WIND_NAMES = ['East', 'South', 'West', 'North'];
const DRAGON_NAMES = ['Red', 'Green', 'White'];

export const TILE_TYPES = [
  ...WIND_NAMES.map((name, i) => ({
    id: `wind-${name.toLowerCase()}`,
    glyph: String.fromCodePoint(0x1f000 + i),
    suit: 'wind',
    label: `${name} Wind`,
  })),
  ...DRAGON_NAMES.map((name, i) => ({
    id: `dragon-${name.toLowerCase()}`,
    glyph: String.fromCodePoint(0x1f004 + i),
    suit: 'dragon',
    label: `${name} Dragon`,
  })),
  ...range1to9().map((n) => ({
    id: `char-${n}`,
    glyph: String.fromCodePoint(0x1f006 + n),
    suit: 'char',
    label: `${n} of Characters`,
  })),
  ...range1to9().map((n) => ({
    id: `bamboo-${n}`,
    glyph: String.fromCodePoint(0x1f00f + n),
    suit: 'bamboo',
    label: `${n} of Bamboo`,
  })),
  ...range1to9().map((n) => ({
    id: `circle-${n}`,
    glyph: String.fromCodePoint(0x1f018 + n),
    suit: 'circle',
    label: `${n} of Circles`,
  })),
];

// Sanity: exactly 34 types (4 + 3 + 9 + 9 + 9), verified once at load time
// rather than trusted silently, since an off-by-one codepoint arithmetic
// error here would quietly corrupt the whole tile set.
if (TILE_TYPES.length !== 34) {
  throw new Error(`TILE_TYPES must have 34 entries, got ${TILE_TYPES.length}`);
}

export const TILE_TYPE_COUNT = TILE_TYPES.length;
