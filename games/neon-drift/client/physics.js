/**
 * Neon Drift — physics module.
 *
 * Car model + per-frame update (steering, throttle/brake, drift/grip
 * dynamics, off-track handling, lap tracking), pairwise car-car collision
 * resolution, and AI decision-making (apex-biased steering + rubber-band).
 *
 * Drift model: each car has a `angle` (facing/body direction, driven by
 * steering input) and a velocity vector (vx,vy) that is largely
 * independent of it. Each frame the velocity's direction is smoothed
 * toward the facing angle at a rate called "grip" — high grip snaps the
 * velocity to the facing direction almost immediately (normal driving, no
 * slide); low grip lets the velocity lag behind, so the car keeps sliding
 * in its old direction while the body rotates — that lag *is* the drift.
 * The same mechanism doubles as the collision response: a hit perturbs
 * (vx,vy) directly, and grip smoothly pulls it back in line afterward,
 * which reads as a believable knock/slide rather than an instant snap.
 */
import { TRACK, trackPoint, progressOf, distToCenterline, onTrack, apexTarget, rightNormal } from './track.js';

export const CAR_RADIUS = 9;

export const TUNING = {
  maxSpeed: 250,
  aiMaxSpeedBase: 228,
  aiMaxSpeedVar: 34,
  accel: 250,
  brakeFactor: 0.16,   // per-second multiplicative decay while braking
  dragFactor: 0.62,    // per-second multiplicative decay while coasting
  turnRateBase: 2.15,
  turnRateSpeedBoost: 1.5,
  turnRateDriftMult: 1.18,
  gripNormal: 14,       // 1/s convergence rate, velocity angle -> facing angle
  gripDrift: 1.5,
  driftEnterSteer: 0.55,
  driftEnterSpeedFrac: 0.5,
  driftExitSteer: 0.28,
  driftExitSpeedFrac: 0.3,
  driftBlendRate: 6,
  driftMinDurationForBoost: 0.35,
  driftBoostMult: 1.16,
  driftBoostSpeedCap: 1.1, // x maxSpeed, held open for driftBoostDuration
  driftBoostDuration: 0.6, // seconds the raised speed cap stays open
  driftScorePerSecond: 120,
  offTrackDragFactor: 0.22,
  offTrackMaxSpeedFrac: 0.42,
  wallPushFrac: 0.14,
  wallMargin: 6,
  apexLookAhead: 0.035,
  apexLookFarMult: 2.4,
  apexBiasStrength: 55,
  aiSteerGain: 2.4,
  aiCornerFullBrakeAngle: 0.55,  // rad heading-error at which corner severity maxes out (1.0)
  aiCornerBrakeThreshold: 0.45,  // severity above which the AI actually brakes (below: lift off gas only)
  aiCornerThrottleCut: 0.85,     // fraction of throttle removed as severity ramps to the brake threshold
  aiCornerBrakeMax: 0.6,         // brake intensity at severity 1.0
  rubberBandK: 0.85,
  rubberBandMax: 0.12,
  collisionRestitution: 0.5,
  collisionDamp: 0.94,
  hardCollisionThreshold: 85,
};

let uid = 1;
export function makeCar({ name, color, isPlayer, t0, lateralOffset = 0, aiSkill }) {
  const p = trackPoint(t0);
  const n = rightNormal(p.angle);
  return {
    id: `c${uid++}`,
    name,
    color,
    isPlayer,
    x: p.x + n.x * lateralOffset,
    y: p.y + n.y * lateralOffset,
    angle: p.angle,
    vx: 0,
    vy: 0,
    lap: 0,
    progress: t0,
    lastProgress: t0,
    finished: false,
    place: 0,
    score: 0,
    aiSkill: aiSkill ?? (0.5 + Math.random() * 0.4),
    drifting: false,
    driftBlend: 0,
    driftTimer: 0,
    driftWasOn: false,
    boostTimer: 0,
    offTrack: false,
  };
}

function raceMetric(c) {
  if (c.finished) return 1000 + (10 - c.place);
  return c.lap + c.progress;
}

function rubberbandMultiplier(c, cars) {
  if (cars.length < 2) return 1;
  const metrics = cars.map(raceMetric);
  const avg = metrics.reduce((a, b) => a + b, 0) / metrics.length;
  const my = raceMetric(c);
  const delta = avg - my; // positive => trailing field average => boost
  const rb = Math.max(-TUNING.rubberBandMax, Math.min(TUNING.rubberBandMax, delta * TUNING.rubberBandK));
  return 1 + rb;
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function aiDecision(c) {
  const lookAhead = TUNING.apexLookAhead + c.aiSkill * 0.018;
  const lookFar = lookAhead * TUNING.apexLookFarMult;
  const target = apexTarget(c.progress, lookAhead, lookFar, TUNING.apexBiasStrength);
  const desired = Math.atan2(target.y - c.y, target.x - c.x);
  const diff = normalizeAngle(desired - c.angle);
  let steer = Math.max(-1, Math.min(1, diff * TUNING.aiSteerGain));

  // Small per-car personality wobble so a pack of AIs doesn't all drive
  // identically; the primary behavior is the apex-biased steer above, this
  // is just texture on top of it.
  steer += Math.sin(performance.now() / 480 + c.aiSkill * 12.3) * 0.035;
  steer = Math.max(-1, Math.min(1, steer));

  // Corner speed management: `diff` (heading error to the lookahead target,
  // which sits ~90-140 world units ahead) grows as an unmatched corner
  // approaches, since the lookahead point swings toward the bend before the
  // car is physically there — so it's a naturally anticipatory signal, not
  // just a reactive one. Without this an AI at/near top speed simply cannot
  // out-turn a tight bend (turn rate is intentionally speed-limited, see
  // TUNING.turnRateSpeedBoost) and sails off the outside of the corner at
  // full throttle; this was reproduced directly (an AI flew off the right-
  // hander into the hairpin at ~245 u/s while still holding 0.94 throttle,
  // never recovering). Scrubbing speed in proportion to how sharp the
  // upcoming turn is is what lets the AI actually make the corner.
  //
  // Below aiCornerBrakeThreshold: lift off the gas only (brake stays
  // exactly 0, throttle ramps down) — mild corners just need less power,
  // not the pedal. Above it: brake ramps in (and updateCar's brake/throttle
  // handling is else-if gated, so real braking correctly stops fighting the
  // throttle rather than blending with it).
  const severity = Math.min(1, Math.abs(diff) / TUNING.aiCornerFullBrakeAngle);
  const onTr = onTrack(c.x, c.y);
  const liftFrac = Math.min(1, severity / TUNING.aiCornerBrakeThreshold);
  const baseThrottle = (0.8 + c.aiSkill * 0.2) * (1 - liftFrac * TUNING.aiCornerThrottleCut);
  let throttle, brake;
  if (!onTr) {
    // Recovering off-track: throttle only, brake stays exactly 0. Setting
    // both (as pulse-race's own off-track branch does) hits the same
    // else-if trap as the corner-braking bug above — brake>0 fully
    // suppresses throttle every frame, so a car that drifted off track
    // would decelerate to a stop and then sit there forever (the soft-wall
    // push nudges position back but never restores speed on its own).
    // Reproduced directly: two AI cars stalled dead at ~0 speed, still
    // flagged offTrack, for the rest of a 60s simulated race.
    throttle = 0.5;
    brake = 0;
  } else if (severity > TUNING.aiCornerBrakeThreshold) {
    const brakeFrac = (severity - TUNING.aiCornerBrakeThreshold) / (1 - TUNING.aiCornerBrakeThreshold);
    throttle = 0;
    brake = brakeFrac * TUNING.aiCornerBrakeMax;
  } else {
    throttle = baseThrottle;
    brake = 0;
  }
  return { steer, throttle, brake };
}

/**
 * Advance one car by dt seconds.
 * @param {object} c car state (mutated in place)
 * @param {number} dt seconds
 * @param {object} opts { input, cars, totalLaps, hooks }
 *   hooks: onLap(c), onFinish(c), onDriftStart(c), onDriftBoost(c,bonus),
 *          onWallHit(c), onTick(c) — all optional.
 */
export function updateCar(c, dt, opts) {
  if (c.finished) return;
  const { cars, totalLaps, hooks } = opts;

  let steer = 0, throttle = 0, brake = 0;
  if (c.isPlayer) {
    const input = opts.input;
    steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    throttle = input.gas ? 1 : 0;
    brake = input.brake ? 1 : 0;
  } else {
    const d = aiDecision(c);
    steer = d.steer;
    throttle = d.throttle;
    brake = d.brake;
  }

  let speed = Math.hypot(c.vx, c.vy);
  const rb = c.isPlayer ? 1 : rubberbandMultiplier(c, cars);
  const baseMax = c.isPlayer ? TUNING.maxSpeed : TUNING.aiMaxSpeedBase + c.aiSkill * TUNING.aiMaxSpeedVar;
  const maxSpeed = baseMax * rb;
  const speedFrac = Math.min(1.3, speed / maxSpeed);

  // --- steering rotates the car body (facing angle) ---
  const turnRate = (TUNING.turnRateBase + (1 - Math.min(1, speedFrac)) * TUNING.turnRateSpeedBoost)
    * (c.drifting ? TUNING.turnRateDriftMult : 1);
  c.angle = normalizeAngle(c.angle + steer * turnRate * dt);

  // --- drift state (hysteresis: enter/exit thresholds differ) ---
  const steerMag = Math.abs(steer);
  const targetDrift = c.drifting
    ? (steerMag > TUNING.driftExitSteer && speedFrac > TUNING.driftExitSpeedFrac)
    : (steerMag > TUNING.driftEnterSteer && speedFrac > TUNING.driftEnterSpeedFrac);
  if (targetDrift && !c.drifting) hooks?.onDriftStart?.(c);
  c.drifting = targetDrift;
  const blendF = 1 - Math.exp(-TUNING.driftBlendRate * dt);
  c.driftBlend += ((targetDrift ? 1 : 0) - c.driftBlend) * blendF;

  const grip = TUNING.gripNormal + (TUNING.gripDrift - TUNING.gripNormal) * c.driftBlend;

  // --- velocity direction chases facing angle at rate `grip` ---
  let velAngle = speed > 0.5 ? Math.atan2(c.vy, c.vx) : c.angle;
  const angDiff = normalizeAngle(c.angle - velAngle);
  const chaseF = 1 - Math.exp(-grip * dt);
  velAngle = normalizeAngle(velAngle + angDiff * chaseF);

  // --- throttle / brake / drag act on the scalar speed ---
  // Brake takes priority over throttle if both are asserted (mirrors
  // pulse-race's if/else-if input priority) — otherwise holding both would
  // fight each other in a confusing way. `brake` is a continuous 0..1
  // intensity, not a boolean: it's blended toward TUNING.brakeFactor rather
  // than gated on truthiness, because the AI's corner-braking (below) feeds
  // in fractional severity values, and gating on `if (brake)` would apply
  // *full* braking (and fully suppress throttle via the else-if) for even a
  // tiny nonzero severity — reproduced directly as a real bug: every AI car
  // sat frozen at the start line because `diff` (and so brake) is almost
  // never exactly 0, so throttle never once ran. The player's brake input
  // is always exactly 0 or 1 (key held or not), so this is a strict
  // generalization with no behavior change for the player: at brake=1 the
  // blended factor is exactly TUNING.brakeFactor, same as before.
  if (brake > 0) {
    const brakeBlend = 1 - brake * (1 - TUNING.brakeFactor);
    speed *= Math.pow(brakeBlend, dt);
  } else if (throttle) {
    speed += TUNING.accel * throttle * dt;
  }
  speed *= Math.pow(TUNING.dragFactor, dt);
  speed = Math.max(0, speed);

  // Sustained-drift exit reward: a real kick, not a same-frame no-op. A
  // plain "clamp to maxSpeed every frame" would erase the boost within the
  // very frame it's granted, so the elevated speed ceiling is held open by
  // a short decaying timer (`boostTimer`) instead of being applied once.
  const isDriftingMeaningfully = c.driftBlend > 0.5;
  if (isDriftingMeaningfully) {
    c.driftTimer += dt;
  } else if (c.driftWasOn && c.driftTimer > TUNING.driftMinDurationForBoost) {
    speed *= TUNING.driftBoostMult;
    c.boostTimer = TUNING.driftBoostDuration;
    const bonus = Math.round(c.driftTimer * TUNING.driftScorePerSecond);
    c.score += bonus;
    hooks?.onDriftBoost?.(c, bonus);
    c.driftTimer = 0;
  } else {
    c.driftTimer = 0;
  }
  c.driftWasOn = isDriftingMeaningfully;

  if (c.boostTimer > 0) c.boostTimer = Math.max(0, c.boostTimer - dt);
  const speedCap = c.boostTimer > 0 ? maxSpeed * TUNING.driftBoostSpeedCap : maxSpeed;
  speed = Math.min(speed, speedCap);

  c.vx = Math.cos(velAngle) * speed;
  c.vy = Math.sin(velAngle) * speed;

  c.x += c.vx * dt;
  c.y += c.vy * dt;

  // --- off-track handling ---
  const dCenter = distToCenterline(c.x, c.y);
  c.offTrack = dCenter > TRACK.halfWidth;
  if (c.offTrack) {
    const wasOnTrack = !c._wasOffTrack;
    if (wasOnTrack) hooks?.onWallHit?.(c);
    speed = Math.hypot(c.vx, c.vy);
    speed *= Math.pow(TUNING.offTrackDragFactor, dt);
    speed = Math.min(speed, maxSpeed * TUNING.offTrackMaxSpeedFrac);
    const a2 = Math.atan2(c.vy, c.vx);
    c.vx = Math.cos(a2) * speed;
    c.vy = Math.sin(a2) * speed;
  }
  c._wasOffTrack = c.offTrack;
  if (dCenter > TRACK.halfWidth + TUNING.wallMargin) {
    const t = progressOf(c.x, c.y);
    const p = trackPoint(t);
    c.x += (p.x - c.x) * TUNING.wallPushFrac;
    c.y += (p.y - c.y) * TUNING.wallPushFrac;
  }

  // --- lap / progress tracking (nearest-sample progress, wrap-detect) ---
  const prog = progressOf(c.x, c.y);
  if (c.lastProgress > 0.75 && prog < 0.25 && speed > 20) {
    c.lap += 1;
    hooks?.onLap?.(c);
    if (c.lap >= totalLaps) {
      c.finished = true;
      hooks?.onFinish?.(c);
    }
  }
  c.lastProgress = prog;
  c.progress = prog;

  hooks?.onTick?.(c, { steer, throttle, brake, speed: Math.hypot(c.vx, c.vy) });
}

/**
 * Single-pass pairwise circle collision for all cars this frame
 * (Gauss-Seidel style: each resolved pair updates positions/velocities
 * immediately, so later pairs in the same pass see the update). This is
 * an explicit simplification, not a real solver — with only a handful of
 * cars a transient 3-way overlap looks slightly imperfect for one frame
 * and self-corrects continuously at 60fps, which is well within the
 * "believable arcade bump", not "full rigid body" bar this needs to hit.
 */
export function resolveCollisions(cars, hooks) {
  for (let i = 0; i < cars.length; i++) {
    const a = cars[i];
    if (a.finished) continue;
    for (let j = i + 1; j < cars.length; j++) {
      const b = cars[j];
      if (b.finished) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const minDist = CAR_RADIUS * 2;
      if (dist >= minDist) continue;

      const nx = dx / dist, ny = dy / dist;
      const overlap = minDist - dist;
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;

      const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
      const relN = rvx * nx + rvy * ny;
      if (relN < 0) {
        const impulse = -(1 + TUNING.collisionRestitution) * relN / 2;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
        a.vx *= TUNING.collisionDamp;
        a.vy *= TUNING.collisionDamp;
        b.vx *= TUNING.collisionDamp;
        b.vy *= TUNING.collisionDamp;
        hooks?.onCollide?.(a, b, Math.abs(relN), Math.abs(relN) > TUNING.hardCollisionThreshold);
      }
    }
  }
}
