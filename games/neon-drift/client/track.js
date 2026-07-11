/**
 * Neon Drift — track module.
 *
 * The circuit centerline is a *closed* centripetal Catmull-Rom spline
 * through a loop of waypoints (not a closed-form ellipse like Pulse
 * Race's TRACK). Centripetal (alpha=0.5) parameterization is used rather
 * than uniform Catmull-Rom specifically because the waypoint spacing here
 * is very uneven (a ~320-unit top straight next to a ~72-unit chicane
 * kink) — uniform parameterization is prone to overshoot/self-intersecting
 * loops at the tight sections under that kind of spacing, centripetal is
 * not.
 *
 * At load time the spline is densely sampled and re-parameterized into an
 * evenly arc-length-spaced lookup table (`TRACK.samples`). The public query
 * functions mirror the exact names/signatures used by
 * games/pulse-race/client/game.js (trackPoint, progressOf,
 * distToCenterline, onTrack) so the rest of the codebase reads the same
 * way, but every one of them is backed by the sampled path instead of
 * ellipse formulas.
 */

// Design-space waypoints (~1000x700 units), closed loop — index 0 follows
// the last index to close the circuit. In order: top straight, sweeping
// right-hander, back straight, tight hairpin, chicane (S-kink), bottom
// sweeper, long left-hand corner, short return straight back to start.
//
// Adjusted from the original flat 14-point starting set after the visual
// spline-preview check (see README/commit notes): the original back
// straight + hairpin region rendered as one continuous ~57-degree bulge
// instead of a straight followed by a real hairpin, because Catmull-Rom's
// neighbor-averaged tangents smoothed the two features together. Fixed by
// (a) inserting an exact midpoint on the back straight so its own tangent
// reinforces a straight line rather than being pulled by the curve on
// either side, and (b) reshaping the hairpin into a 3-point loop-back
// (~160 degree total direction reversal over 900,420 -> 945,545 -> 860,675
// -> 700,645 -> 630,560) instead of the original single dip. Chicane and
// the rest of the loop rendered cleanly in the original set and were left
// as-is.
export const WAYPOINTS = [
  [500, 60], [820, 90], [930, 220], [915, 320], [900, 420], [945, 545],
  [860, 675], [700, 645], [630, 560], [560, 600], [480, 560], [340, 610],
  [150, 560], [70, 380], [110, 180], [260, 80],
];

// Constant track half-width, world units. Tuned against the tightest
// waypoint gap (~72 units at the chicane entry) — see the load-time
// screenshot check in the game's test pass before changing this.
export const TRACK_HALF_WIDTH = 40;

const SUBSTEPS_PER_SEGMENT = 28;
const SAMPLE_COUNT = 400;
const ALPHA = 0.5; // centripetal

function lerp(a, b, f) {
  return a + (b - a) * f;
}

// Scalar Catmull-Rom blend for one coordinate axis, given the four
// centripetal knot values t0..t3 and the query knot t (standard nested
// formula: 3 first-order blends -> 2 second-order blends -> 1 final blend).
function crAxis(v0, v1, v2, v3, t0, t1, t2, t3, t) {
  const segLerp = (vA, vB, tA, tB) => {
    const d = tB - tA;
    const f = Math.abs(d) > 1e-6 ? (t - tA) / d : 0;
    return vA + (vB - vA) * f;
  };
  const a1 = segLerp(v0, v1, t0, t1);
  const a2 = segLerp(v1, v2, t1, t2);
  const a3 = segLerp(v2, v3, t2, t3);
  const b1 = segLerp(a1, a2, t0, t2);
  const b2 = segLerp(a2, a3, t1, t3);
  return segLerp(b1, b2, t1, t2);
}

/** Point on the centripetal Catmull-Rom segment p1->p2 at local u in [0,1]. */
function catmullRomPoint(p0, p1, p2, p3, u) {
  const t0 = 0;
  const t1 = t0 + Math.pow(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), ALPHA) || 1e-4;
  const t2 = t1 + Math.pow(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), ALPHA) || t1 + 1e-4;
  const t3 = t2 + Math.pow(Math.hypot(p3[0] - p2[0], p3[1] - p2[1]), ALPHA) || t2 + 1e-4;
  const t = t1 + (t2 - t1) * u;
  return {
    x: crAxis(p0[0], p1[0], p2[0], p3[0], t0, t1, t2, t3, t),
    y: crAxis(p0[1], p1[1], p2[1], p3[1], t0, t1, t2, t3, t),
  };
}

function buildRawPoints(waypoints) {
  const n = waypoints.length;
  const raw = [];
  for (let i = 0; i < n; i++) {
    const p0 = waypoints[(i - 1 + n) % n];
    const p1 = waypoints[i];
    const p2 = waypoints[(i + 1) % n];
    const p3 = waypoints[(i + 2) % n];
    for (let s = 0; s < SUBSTEPS_PER_SEGMENT; s++) {
      raw.push(catmullRomPoint(p0, p1, p2, p3, s / SUBSTEPS_PER_SEGMENT));
    }
  }
  return raw;
}

// Resample the raw (unevenly-spaced) spline points into SAMPLE_COUNT points
// evenly spaced by arc length. `rawIdx` is a single monotonically
// increasing cursor shared across the whole k-loop (never reset per-k) so
// this is a bounded O(SAMPLE_COUNT + raw.length) two-pointer walk, not a
// nested/quadratic search.
function buildSamples(waypoints) {
  const raw = buildRawPoints(waypoints);
  const n = raw.length;
  const cum = new Array(n);
  cum[0] = 0;
  for (let i = 1; i < n; i++) {
    cum[i] = cum[i - 1] + Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
  }
  const closing = Math.hypot(raw[0].x - raw[n - 1].x, raw[0].y - raw[n - 1].y);
  const totalLength = cum[n - 1] + closing;

  const samples = new Array(SAMPLE_COUNT);
  let rawIdx = 0;
  for (let k = 0; k < SAMPLE_COUNT; k++) {
    const targetS = (k / SAMPLE_COUNT) * totalLength;
    while (rawIdx < n - 1 && cum[rawIdx + 1] < targetS) rawIdx++;
    const nextIdx = (rawIdx + 1) % n;
    const segStart = cum[rawIdx];
    const segEnd = nextIdx === 0 ? totalLength : cum[nextIdx];
    const segLen = segEnd - segStart;
    const frac = segLen > 1e-6 ? (targetS - segStart) / segLen : 0;
    const a = raw[rawIdx];
    const b = raw[nextIdx];
    samples[k] = {
      x: lerp(a.x, b.x, frac),
      y: lerp(a.y, b.y, frac),
      s: targetS,
      angle: 0, // filled below
    };
  }

  // Tangent angle at each sample via wrap-aware central finite difference.
  for (let k = 0; k < SAMPLE_COUNT; k++) {
    const prev = samples[(k - 1 + SAMPLE_COUNT) % SAMPLE_COUNT];
    const next = samples[(k + 1) % SAMPLE_COUNT];
    samples[k].angle = Math.atan2(next.y - prev.y, next.x - prev.x);
  }

  return { samples, totalLength };
}

function computeBounds(samples) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of samples) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

// Right-hand perpendicular of a heading angle in canvas (x-right, y-down)
// space: rightNormal(0) = (0,1) = south, matching an eastbound driver's
// right hand. Verified at a=0, pi/2, pi against real-world "which way does
// my right hand point" before use elsewhere (AI apex bias, grid placement).
export function rightNormal(angle) {
  return { x: -Math.sin(angle), y: Math.cos(angle) };
}

function buildEdges(samples, halfWidth) {
  const left = new Array(samples.length);
  const right = new Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    const n = rightNormal(p.angle);
    // "left" edge = opposite of right-hand normal
    left[i] = { x: p.x - n.x * halfWidth, y: p.y - n.y * halfWidth };
    right[i] = { x: p.x + n.x * halfWidth, y: p.y + n.y * halfWidth };
  }
  return { left, right };
}

const built = buildSamples(WAYPOINTS);
const edges = buildEdges(built.samples, TRACK_HALF_WIDTH);

export const TRACK = {
  samples: built.samples,
  totalLength: built.totalLength,
  halfWidth: TRACK_HALF_WIDTH,
  bounds: computeBounds(built.samples),
  leftEdge: edges.left,
  rightEdge: edges.right,
};

function lerpAngle(a, b, f) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * f;
}

/** Point + tangent angle on the centerline at t in [0,1), wrapping. */
export function trackPoint(t) {
  const n = TRACK.samples.length;
  let tt = t % 1;
  if (tt < 0) tt += 1;
  const idx = tt * n;
  const i0 = Math.floor(idx) % n;
  const i1 = (i0 + 1) % n;
  const frac = idx - Math.floor(idx);
  const a = TRACK.samples[i0];
  const b = TRACK.samples[i1];
  return {
    x: lerp(a.x, b.x, frac),
    y: lerp(a.y, b.y, frac),
    angle: lerpAngle(a.angle, b.angle, frac),
  };
}

// Brute-force nearest-sample search. ~400 samples x a handful of cars is a
// trivial cost per frame at 60fps (explicitly sanctioned as fine by the
// design brief) — a per-car cached-index + local-window search would be
// the next optimization step if this ever needed to scale up.
function nearestIndex(x, y) {
  const samples = TRACK.samples;
  let best = 0;
  let bestD2 = Infinity;
  for (let i = 0; i < samples.length; i++) {
    const dx = x - samples[i].x;
    const dy = y - samples[i].y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = i;
    }
  }
  return best;
}

/** Nearest-sample lap-progress fraction in [0,1) for world point (x,y). */
export function progressOf(x, y) {
  return nearestIndex(x, y) / TRACK.samples.length;
}

function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const abLen2 = abx * abx + aby * aby;
  let t = abLen2 > 1e-9 ? (apx * abx + apy * aby) / abLen2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + abx * t, cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

/** Perpendicular distance from (x,y) to the centerline polyline. */
export function distToCenterline(x, y) {
  const n = TRACK.samples.length;
  const i = nearestIndex(x, y);
  const p = TRACK.samples[i];
  const prev = TRACK.samples[(i - 1 + n) % n];
  const next = TRACK.samples[(i + 1) % n];
  const dPrev = pointSegmentDistance(x, y, prev.x, prev.y, p.x, p.y);
  const dNext = pointSegmentDistance(x, y, p.x, p.y, next.x, next.y);
  return Math.min(dPrev, dNext);
}

/** Whether (x,y) is within the track's half-width of the centerline. */
export function onTrack(x, y) {
  return distToCenterline(x, y) < TRACK.halfWidth;
}

/**
 * Curvature-aware apex-biased aim point, used by the AI. Looks at the
 * tangent direction change between a near and a far lookahead point and
 * nudges the near target toward the inside of the upcoming bend (positive
 * dAngle = right-hand turn on screen = bias toward rightNormal; negative =
 * left-hand turn = bias toward leftNormal). Bias is clamped so the target
 * never aims off the drivable surface.
 */
export function apexTarget(t0, lookAhead, lookFar, biasStrength, maxBiasFrac = 0.6) {
  const near = trackPoint(t0 + lookAhead);
  const far = trackPoint(t0 + lookFar);
  let dAngle = far.angle - near.angle;
  while (dAngle > Math.PI) dAngle -= Math.PI * 2;
  while (dAngle < -Math.PI) dAngle += Math.PI * 2;
  const maxBias = TRACK.halfWidth * maxBiasFrac;
  const bias = Math.max(-maxBias, Math.min(maxBias, dAngle * biasStrength));
  const n = rightNormal(near.angle);
  return { x: near.x + n.x * bias, y: near.y + n.y * bias, angle: near.angle };
}

/** Push a scaled-down top-down rendering of the track into a corner rect. */
export function drawMinimap(ctx, rect, cars, playerId) {
  const { x, y, w, h } = rect;
  const b = TRACK.bounds;
  const bw = b.maxX - b.minX;
  const bh = b.maxY - b.minY;
  const pad = 6;
  const scale = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh);
  const ox = x + w / 2 - ((b.minX + b.maxX) / 2) * scale;
  const oy = y + h / 2 - ((b.minY + b.maxY) / 2) * scale;

  ctx.save();
  ctx.fillStyle = 'rgba(6,8,18,0.72)';
  ctx.strokeStyle = 'rgba(92,225,255,0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  const s0 = TRACK.samples[0];
  ctx.moveTo(ox + s0.x * scale, oy + s0.y * scale);
  for (let i = 1; i < TRACK.samples.length; i++) {
    const p = TRACK.samples[i];
    ctx.lineTo(ox + p.x * scale, oy + p.y * scale);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(92,225,255,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  for (const c of cars) {
    ctx.beginPath();
    ctx.fillStyle = c.color;
    const r = c.id === playerId ? 3.2 : 2.2;
    ctx.arc(ox + c.x * scale, oy + c.y * scale, r, 0, Math.PI * 2);
    ctx.fill();
    if (c.id === playerId) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw the asphalt ribbon, edge glow, centerline dashes, start/finish. */
export function drawTrack(ctx) {
  const { leftEdge, rightEdge, samples } = TRACK;

  // Asphalt ribbon: left edge forward, right edge backward, closed.
  ctx.beginPath();
  ctx.moveTo(leftEdge[0].x, leftEdge[0].y);
  for (let i = 1; i < leftEdge.length; i++) ctx.lineTo(leftEdge[i].x, leftEdge[i].y);
  for (let i = rightEdge.length - 1; i >= 0; i--) ctx.lineTo(rightEdge[i].x, rightEdge[i].y);
  ctx.closePath();
  ctx.fillStyle = '#12162a';
  ctx.fill();

  // Edge glow lines.
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(92,225,255,0.38)';
  ctx.beginPath();
  ctx.moveTo(leftEdge[0].x, leftEdge[0].y);
  for (let i = 1; i < leftEdge.length; i++) ctx.lineTo(leftEdge[i].x, leftEdge[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rightEdge[0].x, rightEdge[0].y);
  for (let i = 1; i < rightEdge.length; i++) ctx.lineTo(rightEdge[i].x, rightEdge[i].y);
  ctx.closePath();
  ctx.stroke();

  // Center dashed line.
  ctx.setLineDash([10, 14]);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(samples[0].x, samples[0].y);
  for (let i = 1; i < samples.length; i++) ctx.lineTo(samples[i].x, samples[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // Start/finish line across the ribbon at sample 0.
  const s0 = samples[0];
  const n = rightNormal(s0.angle);
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(s0.x - n.x * TRACK.halfWidth, s0.y - n.y * TRACK.halfWidth);
  ctx.lineTo(s0.x + n.x * TRACK.halfWidth, s0.y + n.y * TRACK.halfWidth);
  ctx.stroke();
}
