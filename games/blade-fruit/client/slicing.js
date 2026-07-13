/**
 * slicing.js — pure swipe-path-vs-entity geometry for Blade Fruit. No DOM,
 * no state of its own: game.js owns the swipe path and the entity list;
 * this module only answers "does this line segment cross this circle" (and
 * the convenience "which of these entities does this segment cross"), so
 * the question is directly testable/inspectable from a console or headless
 * harness without any pointer-event plumbing — the same discipline as
 * games/dash-runner/client/track.js and games/drop-smash/client/physics.js.
 *
 * game.js calls findHits() once per new segment produced while a pointer is
 * down (i.e. once per pointermove, or per coalesced sub-event within one),
 * so a fast swipe is tested along its whole path — every consecutive pair
 * of sampled points — not just the gesture's first and last point.
 */

/** Squared distance from point (px,py) to the closest point on segment (x0,y0)-(x1,y1). */
export function distToSegmentSq(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px - x0) * dx + (py - y0) * dy) / lenSq : 0;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const cx = x0 + t * dx;
  const cy = y0 + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey;
}

/** True if the segment (x0,y0)-(x1,y1) passes within `r` of (cx,cy). */
export function segmentHitsCircle(x0, y0, x1, y1, cx, cy, r) {
  return distToSegmentSq(cx, cy, x0, y0, x1, y1) <= r * r;
}

/**
 * Returns the subset of `entities` (each needs numeric x/y/radius and a
 * `dead` flag) whose hitbox the segment (x0,y0)-(x1,y1) crosses. `dead`
 * entities (already sliced/missed this frame) are skipped so a slow,
 * overlapping zigzag swipe can't double-hit the same fruit.
 */
export function findHits(entities, x0, y0, x1, y1) {
  const hits = [];
  for (const e of entities) {
    if (e.dead) continue;
    if (segmentHitsCircle(x0, y0, x1, y1, e.x, e.y, e.radius)) hits.push(e);
  }
  return hits;
}
