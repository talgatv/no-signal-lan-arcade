/**
 * lightning.js — pure "lightning domain" model for Storm Warden: the
 * threat/charge lifecycle, the difficulty ramp, the timing-precision
 * rating/score curve, and the jagged glowing bolt-path renderer. Nothing
 * here touches the DOM; game.js drives it all via plain function calls, so
 * every piece is directly steppable/inspectable from a test harness (see
 * window.OGH_STORM_WARDEN in game.js).
 *
 * THE THREAT MODEL
 * A threat is a wild charge building over one specific building. Its
 * `charge` (0..1) is a pure function of accumulated elapsed time versus its
 * own `buildDurationMs` — advanced by `advanceThreat(threat, dtMs)`, an
 * accumulator (like games/pop-the-bugs's hole ageMs/lifeMs), never a
 * wall-clock timestamp — so a test harness can drive it frame-by-frame with
 * synthetic dt and get fully deterministic, inspectable charge values
 * without waiting out real time. `charge` reaching 1 means the threat has
 * peaked with no player cast: game.js treats that as an automatic strike.
 * Casting *before* charge reaches 1, at the right building, neutralizes it;
 * `ratingForCharge`/`scoreForCharge` reward waiting closer to peak (more
 * precision, more risk) over an early, safe tap — the same
 * closer-to-peak-scores-higher curve as a rhythm game's timing window, just
 * framed the other way around (there is no "too late that still counts":
 * once charge hits 1 the wild bolt has already struck).
 *
 * THE BOLT RENDERER
 * `generateBoltPath` is a classic recursive midpoint-displacement fractal
 * line: split a segment at its midpoint, nudge the midpoint sideways
 * (perpendicular to the segment) by a random amount, recurse into both
 * halves with the displacement shrinking each level. `generateBranches`
 * peels a few short jittered stubs off random interior points of an already
 * -generated path for the classic "forking" lightning look.
 * `strokeBoltPath` draws any such path with the hub's neon-vector two-pass
 * glow (a wide, soft, low-alpha halo stroke under a thin bright core
 * stroke), reused identically for the small flickering charge filament, the
 * big cast/strike bolts and their branches — one renderer, every voltage.
 */

/* ------------------------------------------------------------------------ *
 * Difficulty ramp — a pure function of elapsed session time (seconds), same
 * "eased progress toward a floor, then hold" shape as games/pop-the-bugs's
 * rampAt() and games/void-drift's waveConfig(). Threats start relatively
 * rare with a generous 1.5-3s telegraph window (a fair warning); by late
 * session they spawn far more often, the window shrinks well under a
 * second, and up to 3 can be charging across the village at once.
 * ------------------------------------------------------------------------ */
export const SESSION_DURATION_MS = 100000;
export const LOSS_LIMIT = 4; // buildings struck -> the storm wins
export const BUILDING_COUNT = 6; // targetable buildings (the grounding spire is a 7th, non-targetable slot)

const SPAWN_INTERVAL_START_MS = 3400;
const SPAWN_INTERVAL_FLOOR_MS = 1250;
const BUILD_DURATION_START_MS = 2800;
const BUILD_DURATION_FLOOR_MS = 1100;
const RAMP_HOLD_FRACTION = 0.85; // reach the floor at 85% of the session, then hold
const RAMP_EASE = 1.3; // >1 keeps the first stretch closer to the generous start values

function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function lerp(a, b, t) { return a + (b - a) * t; }

/**
 * @param {number} elapsedSec seconds into the current session
 * @returns {{spawnIntervalMs:number, buildDurationMs:number, maxConcurrent:number}}
 */
export function difficultyAt(elapsedSec) {
  const sessionSec = SESSION_DURATION_MS / 1000;
  const raw = clamp01(elapsedSec / (sessionSec * RAMP_HOLD_FRACTION));
  const tt = raw ** RAMP_EASE;
  const maxConcurrent = elapsedSec < 28 ? 1 : elapsedSec < 62 ? 2 : 3;
  return {
    spawnIntervalMs: lerp(SPAWN_INTERVAL_START_MS, SPAWN_INTERVAL_FLOOR_MS, tt),
    buildDurationMs: lerp(BUILD_DURATION_START_MS, BUILD_DURATION_FLOOR_MS, tt),
    maxConcurrent,
  };
}

/* ------------------------------------------------------------------------ *
 * Threat lifecycle
 * ------------------------------------------------------------------------ */
export function createThreat(buildingIndex, buildDurationMs) {
  return {
    buildingIndex,
    buildDurationMs,
    elapsedMs: 0,
    charge: 0,
    state: 'charging', // charging -> (removed on cast, or 'peaked' when charge hits 1)
  };
}

/** Advance a threat's charge by dtMs. Returns true if it just peaked (charge
 * hit 1 this call) so the caller can resolve the strike exactly once. */
export function advanceThreat(threat, dtMs) {
  if (threat.state !== 'charging') return false;
  const wasBelow = threat.charge < 1;
  threat.elapsedMs += dtMs;
  threat.charge = Math.min(1, threat.elapsedMs / threat.buildDurationMs);
  if (wasBelow && threat.charge >= 1) {
    threat.state = 'peaked';
    return true;
  }
  return false;
}

/* ------------------------------------------------------------------------ *
 * Timing-precision rating + score — a pure function of charge-at-cast-time
 * so it's directly unit-testable (see window.OGH_STORM_WARDEN.scoreForCharge
 * / ratingForCharge) instead of relying on fragile real-time UI timing.
 * Higher charge (closer to peak, more risk of the window closing) scores
 * more; each tier boundary gives a small "you committed to the risk" bonus
 * jump rather than a smooth curve alone, so crossing into Good/Perfect
 * feels like a deliberate, rewarded choice.
 * ------------------------------------------------------------------------ */
export const RATING = { EARLY: 'early', GOOD: 'good', PERFECT: 'perfect' };

const EARLY_MAX = 0.40; // [0, 0.40) -> Early
const GOOD_MAX = 0.78; // [0.40, 0.78) -> Good, [0.78, 1) -> Perfect

const TIER_BONUS = { early: 0, good: 20, perfect: 60 };
const SCORE_BASE = 60;
const SCORE_SCALE = 240;

export function ratingForCharge(charge) {
  const c = clamp01(charge);
  if (c >= GOOD_MAX) return RATING.PERFECT;
  if (c >= EARLY_MAX) return RATING.GOOD;
  return RATING.EARLY;
}

export function scoreForCharge(charge) {
  const c = Math.min(0.999, Math.max(0, charge));
  return Math.round(SCORE_BASE + c * SCORE_SCALE) + TIER_BONUS[ratingForCharge(c)];
}

/* ------------------------------------------------------------------------ *
 * Bolt geometry — recursive midpoint displacement + branching. Pure, no
 * canvas state touched here (see strokeBoltPath below for drawing).
 * ------------------------------------------------------------------------ */

/**
 * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
 * @param {{depth?:number, roughness?:number}} [opts]
 * @returns {{x:number,y:number}[]} an ordered polyline from (x1,y1) to (x2,y2)
 */
export function generateBoltPath(x1, y1, x2, y2, opts = {}) {
  const depth = opts.depth ?? 5;
  const roughness = opts.roughness ?? 0.5;
  let points = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
  let disp = Math.hypot(x2 - x1, y2 - y1) * roughness;
  for (let d = 0; d < depth; d++) {
    const next = [points[0]];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len; // unit perpendicular
      const ny = dx / len;
      const offset = (Math.random() * 2 - 1) * disp;
      next.push({ x: (a.x + b.x) / 2 + nx * offset, y: (a.y + b.y) / 2 + ny * offset });
      next.push(b);
    }
    points = next;
    disp *= 0.55; // each level jitters less, converging on a jagged-but-coherent line
  }
  return points;
}

/**
 * A few short jittered stubs branching off random interior points of an
 * already-generated bolt path, angled loosely away from the local segment
 * direction — the classic lightning "forking" look.
 * @returns {{x:number,y:number}[][]}
 */
export function generateBranches(path, opts = {}) {
  const count = opts.count ?? 3;
  const branches = [];
  if (path.length < 4) return branches;
  for (let i = 0; i < count; i++) {
    if (Math.random() > (opts.chance ?? 0.85)) continue;
    const idx = 1 + ((Math.random() * (path.length - 3)) | 0);
    const a = path[idx];
    const b = path[idx + 1];
    const baseAngle = Math.atan2(b.y - a.y, b.x - a.x);
    const deviation = (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.7);
    const angle = baseAngle + deviation;
    const branchLen = Math.hypot(b.x - a.x, b.y - a.y) * (3 + Math.random() * 4);
    const ex = a.x + Math.cos(angle) * branchLen;
    const ey = a.y + Math.sin(angle) * branchLen;
    branches.push(generateBoltPath(a.x, a.y, ex, ey, { depth: opts.branchDepth ?? 2, roughness: 0.6 }));
  }
  return branches;
}

function tracePath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
}

/**
 * Two-pass neon-vector glow stroke (wide soft halo under a thin bright
 * core) — the one bolt renderer reused for charge filaments, cast bolts,
 * strike bolts and their branches, just with different color/width/alpha.
 */
export function strokeBoltPath(ctx, points, opts = {}) {
  if (!points || points.length < 2) return;
  const color = opts.color || '#eaffff';
  const glowColor = opts.glowColor || color;
  const width = opts.width ?? 2.4;
  const glow = opts.glow ?? 16;
  const alpha = opts.alpha ?? 1;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = glowColor;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = glow;
  ctx.lineWidth = width * 2.8;
  ctx.globalAlpha = alpha * 0.32;
  tracePath(ctx, points);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.shadowBlur = glow * 0.55;
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha;
  tracePath(ctx, points);
  ctx.stroke();
  ctx.restore();
}
