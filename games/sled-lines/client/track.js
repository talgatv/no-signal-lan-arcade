/**
 * Sled Lines — track data model (pure, DOM-free).
 *
 * A track is just `{ lines: [] }`. Each line is a hand-drawn polyline:
 * `{ id, type, pts: [{x,y}, ...] }`, where `type` is one of:
 *   - 'track'   — solid: the rider collides with and slides along it.
 *   - 'scenery' — decorative only: the rider passes straight through
 *                 (see physics.js's `isSolid`, which only treats 'track'
 *                 as collidable).
 *   - 'accel'   — bonus: non-collidable, but gives the rider a speed boost
 *                 along the line when crossed (see physics.js's `isBoost`).
 *
 * Kept independent of physics.js (same "small pure data module" precedent as
 * games/siege-break's structures.js) — this file only knows about polylines
 * and editing operations (start/extend/finish/undo/clear/erase), never about
 * simulation.
 */

let _idCounter = 1;
export function _resetIds() { _idCounter = 1; } // for deterministic tests

/** Minimum spacing (px) between consecutive stored points of a line while
 * drawing — keeps the point count (and therefore render/collision cost)
 * reasonable without visibly changing the drawn shape at normal draw speeds. */
export const MIN_POINT_DIST = 4;

/** Tap-vs-drag threshold: a line with a total span under this is treated as
 * an accidental tap, not a deliberate line, and is discarded on finish. */
export const MIN_LINE_SPAN = 3;

export function createTrack() {
  return { lines: [] };
}

/** Begin a new in-progress line. Not yet part of `track.lines` — call
 * `finishLine` to commit it (so a line that never leaves a single point,
 * e.g. an accidental tap, can be discarded instead of stored). */
export function startLine(type, x, y) {
  return { id: _idCounter++, type, pts: [{ x, y }] };
}

/** Extend an in-progress line toward (x,y), respecting MIN_POINT_DIST
 * decimation. Returns true if a point was actually added. */
export function extendLine(line, x, y) {
  const last = line.pts[line.pts.length - 1];
  const dx = x - last.x, dy = y - last.y;
  if (dx * dx + dy * dy < MIN_POINT_DIST * MIN_POINT_DIST) return false;
  line.pts.push({ x, y });
  return true;
}

/** Commit an in-progress line into the track. Discards degenerate lines
 * (a single point, or a total span too small to be a deliberate stroke).
 * Returns true if it was added. */
export function finishLine(track, line) {
  if (!line || line.pts.length < 2) return false;
  const first = line.pts[0], last = line.pts[line.pts.length - 1];
  let span = 0;
  for (let i = 1; i < line.pts.length; i++) {
    span += Math.hypot(line.pts[i].x - line.pts[i - 1].x, line.pts[i].y - line.pts[i - 1].y);
  }
  if (span < MIN_LINE_SPAN && Math.hypot(last.x - first.x, last.y - first.y) < MIN_LINE_SPAN) return false;
  track.lines.push(line);
  return true;
}

/** Remove and return the most recently completed line (any type), or null
 * if the track is empty. */
export function undoLast(track) {
  if (track.lines.length === 0) return null;
  return track.lines.pop();
}

/** Remove every line. Returns the removed lines (so a caller can decide
 * whether anything was actually cleared, e.g. to gate a sound effect). */
export function clearAll(track) {
  const removed = track.lines;
  track.lines = [];
  return removed;
}

/** Closest distance from (x,y) to any segment of a polyline. */
export function distanceToLine(line, x, y) {
  let best = Infinity;
  const pts = line.pts;
  for (let i = 0; i < pts.length - 1; i++) {
    best = Math.min(best, distanceToSegment(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y));
  }
  return best;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 > 1e-9 ? ((px - ax) * abx + (py - ay) * aby) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + abx * t, cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

/** Remove every line within `radius` of (x,y). Returns the removed lines
 * (empty array if nothing was close enough). */
export function eraseNear(track, x, y, radius) {
  const removed = [];
  track.lines = track.lines.filter((line) => {
    if (distanceToLine(line, x, y) <= radius) { removed.push(line); return false; }
    return true;
  });
  return removed;
}
