/**
 * layout.js — board geometry and the core "is this tile free?" rule.
 *
 * Coordinate system: a half-tile-unit grid. Every tile occupies a 2×2 unit
 * footprint at integer (x, y); consecutive layers are offset by 1 unit
 * (half a tile) in both axes so an upper tile visually nests into the gap
 * between four lower tiles — the classic stepped-pyramid look. This is a
 * simplified alternative to the traditional "turtle" layout (5 layers,
 * rectangular per layer, strictly shrinking) but has genuine multi-layer
 * depth: every non-bottom tile is physically supported by ≥1 tile in a
 * lower layer (verified computationally — see the repo's dev history for
 * the verification script), so nothing renders as visually "floating".
 *
 * isFreeGiven() is THE single rule shared by both board generation
 * (deal.js) and live gameplay (app.js): a tile is free iff (a) no OTHER
 * given tile in a strictly higher layer overlaps its footprint, AND
 * (b) at least one of its immediate left/right same-layer neighbors is
 * absent from the given tile list. It only ever inspects the tiles it's
 * handed — it has no notion of an "original" board — which is exactly
 * what lets deal.js reuse it unchanged for both a fresh 136-tile deal and
 * a Shuffle restricted to whatever subset of tiles is still in play.
 */

const LAYER_SPECS = [
  { layer: 0, cols: 10, rows: 6, ox: 0, oy: 0 },
  { layer: 1, cols: 8, rows: 5, ox: 1, oy: 1 },
  { layer: 2, cols: 6, rows: 4, ox: 4, oy: 2 },
  { layer: 3, cols: 4, rows: 2, ox: 7, oy: 5 },
  { layer: 4, cols: 2, rows: 2, ox: 8, oy: 6 },
];

export const MAX_LAYER = LAYER_SPECS[LAYER_SPECS.length - 1].layer;
export const TOTAL_TILE_COUNT = LAYER_SPECS.reduce((sum, s) => sum + s.cols * s.rows, 0);

function makeLayerSlots({ layer, cols, rows, ox, oy }) {
  const slots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({ id: `L${layer}-${r}-${c}`, layer, x: ox + c * 2, y: oy + r * 2 });
    }
  }
  return slots;
}

/** The full fixed set of 136 board slot positions (never changes between
 * games — only which tile TYPE occupies each, and whether it's still on
 * the board, changes per deal/move). */
export function generateSlots() {
  return LAYER_SPECS.flatMap(makeLayerSlots);
}

export const ALL_SLOTS = generateSlots();

// ---- pixel geometry (fixed logical-pixel design space, scaled as a whole
// via CSS transform by app.js's fitBoard() — same pattern as games/comet's
// canvas sizing / games/solitaire's .sol-board) -----------------------------
export const U = 30; // half tile width, logical px
export const V = 40; // half tile height, logical px
export const TILE_W = U * 2;
export const TILE_H = V * 2;
export const LAYER_LIFT = 7; // upward px shift per layer (pseudo-3D "step")
export const PAD = 40;

const maxXUnits = Math.max(...ALL_SLOTS.map((s) => s.x + 2));
const maxYUnits = Math.max(...ALL_SLOTS.map((s) => s.y + 2));

export const BOARD_W = PAD * 2 + maxXUnits * U;
export const BOARD_H = PAD * 2 + MAX_LAYER * LAYER_LIFT + maxYUnits * V;

export function pixelX(slot) {
  return PAD + slot.x * U;
}
export function pixelY(slot) {
  return PAD + (MAX_LAYER - slot.layer) * LAYER_LIFT + slot.y * V;
}

// ---- overlap helpers --------------------------------------------------
function footprintOverlap(a, b) {
  return a.x < b.x + 2 && a.x + 2 > b.x && a.y < b.y + 2 && a.y + 2 > b.y;
}
function rowOverlap(a, b) {
  return a.y < b.y + 2 && a.y + 2 > b.y;
}

/**
 * The core freedom rule. `others` must be the list of OTHER currently-
 * present tiles/slots (never including `slot` itself) — callers decide
 * what "currently present" means (all 136 minus removed ones, at runtime;
 * or a growing/shrinking working set, during generation).
 */
export function isFreeGiven(slot, others) {
  for (const t of others) {
    if (t.layer > slot.layer && footprintOverlap(t, slot)) return false; // covered from above
  }
  let leftBlocked = false;
  let rightBlocked = false;
  for (const t of others) {
    if (t.layer !== slot.layer || !rowOverlap(t, slot)) continue;
    if (t.x + 2 === slot.x) leftBlocked = true;
    if (t.x === slot.x + 2) rightBlocked = true;
  }
  return !(leftBlocked && rightBlocked);
}
