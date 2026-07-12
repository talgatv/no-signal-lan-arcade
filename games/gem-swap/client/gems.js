/**
 * gems.js — pure SVG shape markup for Gem Swap. Each gem is one inline
 * <svg>; game.js sets its innerHTML only when that gem's type/special
 * actually changes (a fresh spawn, or an in-place special upgrade), never
 * every frame. Colors are NOT baked in here: every shape paints with
 * fill/stroke: var(--gem-color), and style.css sets --gem-color per
 * [data-type] — the same data-attribute-driven-custom-property convention
 * as games/pop-the-bugs' --bug-color, so this module stays pure markup.
 *
 * Six base shapes carry the six gem colors so identity reads by silhouette
 * as well as hue (colorblind-friendly, not just color-coded): circle,
 * diamond, star, square, triangle, hexagon. A row/col line-clear special
 * (born from a 4-match) overlays a pair of chevrons on its base shape,
 * oriented to hint which axis it clears. A color-bomb special (born from a
 * 5-match) ignores `type` entirely and renders its own wildcard starburst
 * (style.css gives it a spinning rainbow halo — see .gs-gem[data-type="bomb"]).
 */
import { SPECIAL_ROW, SPECIAL_COL, SPECIAL_BOMB } from './board.js';

function polygonPoints(cx, cy, sides, r, rotationDeg) {
  const pts = [];
  const rot = (rotationDeg * Math.PI) / 180;
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * 2 * Math.PI) / sides;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

function starPoints(cx, cy, spikes, outerR, innerR) {
  const pts = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = i * step - Math.PI / 2;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

const SHAPES = {
  circle: () => '<circle class="gs-shape" cx="50" cy="50" r="30"/>',
  diamond: () => '<polygon class="gs-shape" points="50,15 85,50 50,85 15,50"/>',
  star: () => `<polygon class="gs-shape" points="${starPoints(50, 50, 5, 32, 13)}"/>`,
  square: () => '<rect class="gs-shape" x="21" y="21" width="58" height="58" rx="11"/>',
  triangle: () => '<polygon class="gs-shape" points="50,14 88,81 12,81"/>',
  hexagon: () => `<polygon class="gs-shape" points="${polygonPoints(50, 50, 6, 32, -90)}"/>`,
};

/** Chevron-pair overlay marking a line-clear special. rotationDeg=0 points
 * the chevrons left/right (row-clear reads "clears sideways"); 90 rotates
 * them to point up/down (col-clear reads "clears vertically"). */
function lineOverlay(rotationDeg) {
  return `<g class="gs-special-overlay" transform="rotate(${rotationDeg} 50 50)">
      <path d="M6,50 L19,41 L19,59 Z"/>
      <path d="M94,50 L81,41 L81,59 Z"/>
    </g>`;
}

function bombMarkup() {
  return `<g class="gs-bomb">
      <polygon class="gs-bomb-spike" points="${starPoints(50, 50, 8, 39, 22)}"/>
      <circle class="gs-bomb-core" cx="50" cy="50" r="23"/>
      <circle class="gs-bomb-glint" cx="41" cy="39" r="6"/>
    </g>`;
}

/** Full inner SVG markup for a gem at (type, special). */
export function gemMarkup(type, special) {
  if (special === SPECIAL_BOMB || type === 'bomb') return bombMarkup();
  const shape = (SHAPES[type] || SHAPES.circle)();
  if (special === SPECIAL_ROW) return shape + lineOverlay(0);
  if (special === SPECIAL_COL) return shape + lineOverlay(90);
  return shape;
}
