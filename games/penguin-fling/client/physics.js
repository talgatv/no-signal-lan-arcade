/**
 * Penguin Fling — physics module (pure, DOM-free, canvas-free).
 *
 * Everything here works in world units of meters/seconds/radians so the
 * numbers stay human-tunable; games/penguin-fling/client/game.js is the only
 * place that knows about pixels, camera offsets, or canvas — it converts
 * meters -> screen pixels for drawing and never feeds pixels back in here.
 * Being pure like this also makes the whole simulation directly steppable
 * and inspectable from a test harness (see window.OGH_PENGUIN_FLING in
 * game.js), the same way games/pop-the-bugs exposes rampAt()/tick() and
 * games/neon-drift splits car physics into its own physics.js.
 *
 * Phase machine (state.phase): 'aiming' -> 'flight' -> 'slide' -> 'stopped'.
 * There is deliberately no separate "bounce" phase: a bounce is just the
 * moment 'flight' touches the ground. resolveBounce() below applies a
 * coefficient-of-restitution loss to the vertical speed and a smaller
 * horizontal (ice-friction) loss, and either kicks the penguin back into a
 * shorter 'flight' arc (another bounce coming) or — once the vertical
 * energy has mostly died out — hands off into 'slide' (horizontal-only,
 * exponential-decay ice friction, no more vertical motion). That handoff is
 * the "cool physics" this whole game is built around: skips that visibly
 * get shorter, then a long low-friction glide that decays smoothly to a
 * full stop rather than snapping to zero or sliding forever.
 */

// --- World constants ------------------------------------------------------

/** Downward acceleration, m/s^2. Deliberately less than real gravity
 * (9.8) for a floatier, more "arcade" arc — see README for the tuning
 * rationale. */
export const GRAVITY = 21;

/** Launch speed at 100% power, m/s. */
export const MAX_LAUNCH_SPEED = 34;

export const MIN_LAUNCH_ANGLE_DEG = 12;
export const MAX_LAUNCH_ANGLE_DEG = 78;

/** Release point above ground (meters) — a thrown-from-the-mitts height,
 * not ground level, so the arc has a believable start. */
export const LAUNCH_X = 0;
export const LAUNCH_Y = 1.15;

// --- Bounce tuning ----------------------------------------------------
/** Fraction of vertical speed kept after each bounce (coefficient of
 * restitution). A constant CoR alone already produces the "each bounce
 * shorter than the last" feel: bounce height scales with vy^2, so a
 * constant fraction of vy every bounce means each bounce peak is
 * RESTITUTION^2 of the previous one's height. */
export const BOUNCE_RESTITUTION = 0.52;
/** Fraction of horizontal speed kept per bounce — ice is slippery, so this
 * stays close to 1 (a small loss, not a big one). */
export const BOUNCE_VX_DAMP = 0.96;
/** Once the post-bounce vertical speed drops below this, stop bouncing and
 * hand off to the slide phase. */
export const BOUNCE_TO_SLIDE_VY = 1.9;
/** Safety cap so a pathological tuning/edge case can't bounce forever. */
export const MAX_BOUNCES = 8;

// --- Spin tuning --------------------------------------------------------
export const SPIN_BASE = 5; // rad/s at 0 power
export const SPIN_POWER_SCALE = 11; // extra rad/s at full power
/** Spin lost per bounce (grinds against the ice). */
export const SPIN_BOUNCE_DAMP = 0.78;
/** Fraction of the spin *lost* on a bounce that gets transferred into extra
 * forward speed — a simplified "grippy topspin skips forward" arcade
 * approximation of a real effect (topspin bounces kick forward), not a
 * literal rigid-body friction model. */
export const SPIN_GRIP_TRANSFER = 0.028;
/** Spin decay per second while sliding (rad/s multiplier, exponential). */
export const SPIN_SLIDE_DECAY_PER_SEC = 0.25;
/** Spin-vs-slide-friction interaction: while sliding, residual forward spin
 * "rolls" a little extra distance out of the slide (reduces effective
 * friction slightly); this constant converts rad/s of spin into m/s^2 of
 * extra forward assist. */
export const SPIN_SLIDE_ASSIST = 0.045;

// --- Slide tuning ---------------------------------------------------------
/** Multiplicative, frame-rate-independent exponential decay applied to
 * slide speed every second (vx *= SLIDE_DECAY_PER_SEC ^ dt) — same idiom as
 * games/neon-drift's drag/brake model. Very close to 1 would be "ice with
 * almost no friction"; this value is tuned so a strong throw's slide phase
 * still covers a satisfying tens-of-meters glide before gently stopping. */
export const SLIDE_DECAY_PER_SEC = 0.6;
/** Below this speed (m/s), snap to a clean, fully-stopped 0 rather than
 * asymptotically crawling forever. */
export const SLIDE_STOP_EPS = 0.12;

// --- Wind -----------------------------------------------------------------
/** Max magnitude of the per-attempt random horizontal wind, m/s^2. Applied
 * throughout flight only (not during slide — a light breeze doesn't budge
 * a sliding penguin's ice-locked mass the way it deflects it mid-air).
 * Deliberately kept small: this is meant to read as a light, replay-variety
 * nudge (and something to visually indicate before a throw), not a factor
 * that swings the final distance more than the player's own aim does. */
export const WIND_MAX = 0.55;

// --- Terrain ---------------------------------------------------------------
// Small procedural bumps (never more than ~tens of cm) so the ice isn't
// perfectly flat — they nudge a bounce's contact angle slightly for minor
// extra variety without dominating the outcome. A single "ramp" zone is a
// bigger, deliberate terrain feature: groundHeight() actually rises through
// it (what's drawn IS what's collided with), and stepSlide() below detects
// crossing its exit edge and converts forward slide speed into a fresh
// small launch — a real secondary arc, not a scripted effect.
// Kept gentle on purpose: testing an earlier, larger amplitude (0.16/0.09)
// showed the slide phase's slope-decel term (see stepSlide) briefly
// *reaccelerating* the penguin by 1.5+ m/s on a downhill bump stretch —
// physically real, but strong enough to read as "it stopped decelerating"
// mid-slide, which fights the one thing this game has to get right. Halving
// the amplitude keeps bumps visible and still nudges bounce contact timing
// without competing with the slide's main deceleration story. The ramp's
// own climb cost (a much bigger, deliberate slope) is a separate set of
// constants below and is untouched by this.
const BUMP_AMP_1 = 0.08;
const BUMP_WAVELEN_1 = 8.5; // meters
const BUMP_AMP_2 = 0.045;
const BUMP_WAVELEN_2 = 4.2; // meters

/** The ramp's rise is eased (smoothstep) so it blends into flat ground with
 * no visible seam, but that also means its *tangent* goes nearly flat right
 * at the exit edge — a real ramp/ski-jump has a distinct upturned "kicker"
 * lip at the bottom of the exit for exactly this reason (a plain incline
 * launches you barely off the ground). So the exit uses this fixed kick
 * angle rather than the numerically-flattened ramp tangent, same way a
 * physical jump ramp's last few degrees of curvature are deliberately
 * steeper than its average slope. */
const RAMP_KICK_ANGLE_RAD = (26 * Math.PI) / 180;

// Tuned empirically (see the physics tuning notes in README.md) against a
// simulated power/angle/wind sweep so each target roughly corresponds to a
// distinct, discoverable commitment level: a soft lob, a solid mid throw, a
// strong throw that just engages the ramp, and an all-out max-power throw.
export const TARGETS = [
  { id: 'icicle', xMeters: 16, radius: 2.6, bonus: 60 },
  { id: 'frost', xMeters: 37, radius: 3.0, bonus: 130 },
  { id: 'glacier', xMeters: 70, radius: 4.0, bonus: 260 },
  { id: 'aurora', xMeters: 145, radius: 7.0, bonus: 520 },
];

/** Deterministic-shape, per-attempt-randomized terrain: two bump phases
 * plus a ramp placed between the 'frost' and 'glacier' targets. */
export function makeTerrain(rng = Math.random) {
  const rampX0 = 46 + rng() * 8; // ramp base ~46-54m
  const rampLen = 6.5 + rng() * 1.5; // long-ish and gentle on purpose, see height below
  return {
    bumpPhase1: rng() * Math.PI * 2,
    bumpPhase2: rng() * Math.PI * 2,
    ramp: {
      x0: rampX0,
      x1: rampX0 + rampLen,
      // Kept deliberately low/gentle: a taller ramp costs so much
      // climbing speed (see stepSlide's slopeDecel) that clearing it turns
      // into a razor-thin threshold most medium throws either barely clear
      // or barely stall on. This height clears comfortably for any slide
      // that reaches it with a reasonable arrival speed, so "did I throw
      // hard enough to reach the ramp at all" stays the interesting
      // question, not "did I clear an unpredictable coin-flip on it".
      height: 1.3 + rng() * 0.4,
    },
  };
}

/** Signed wind acceleration for one attempt, m/s^2 (+ helps distance). */
export function makeWind(rng = Math.random) {
  return (rng() * 2 - 1) * WIND_MAX;
}

function baseBumps(x, terrain) {
  const a =
    BUMP_AMP_1 * Math.sin((x / BUMP_WAVELEN_1) * Math.PI * 2 + terrain.bumpPhase1) +
    BUMP_AMP_2 * Math.sin((x / BUMP_WAVELEN_2) * Math.PI * 2 + terrain.bumpPhase2);
  // Never let procedural bumps dip below 0 right at the launch pad, so the
  // yeti always stands on solid (>= 0) ground.
  return x < 1 ? Math.max(a, 0) : a;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/** Ground height (meters, 0 = baseline) at world x. This is the single
 * source of truth for both collision AND rendering — game.js's terrain
 * drawing samples this same function, so the drawn ice and the physics
 * penguins slide/bounce on are always exactly the same surface. */
export function groundHeight(x, terrain) {
  const r = terrain.ramp;
  if (r && x >= r.x0 && x <= r.x1) {
    const frac = (x - r.x0) / (r.x1 - r.x0);
    return smoothstep(frac) * r.height;
  }
  return baseBumps(x, terrain);
}

/** Local ground slope (dHeight/dx, radians-ish small-angle) via a central
 * numeric difference — used to tilt the penguin's sprite to match the ice
 * while sliding, and to apply a gravity-along-slope term (climbing the
 * ramp costs speed, just like it would in real life). */
export function groundSlopeAngle(x, terrain) {
  const eps = 0.05;
  const h1 = groundHeight(x - eps, terrain);
  const h2 = groundHeight(x + eps, terrain);
  return Math.atan2(h2 - h1, 2 * eps);
}

// --- Launch -----------------------------------------------------------

/**
 * @param {{power:number, angleRad:number, rng?:()=>number}} opts power in
 *   [0,1], angleRad already clamped to the launch angle range by the caller
 *   (game.js owns the drag->power/angle mapping since that's input, not
 *   physics).
 */
export function createLaunchState({ power, angleRad, rng = Math.random }) {
  const clampedPower = Math.max(0.05, Math.min(1, power));
  const speed = clampedPower * MAX_LAUNCH_SPEED;
  const vx = Math.cos(angleRad) * speed;
  const vy = Math.sin(angleRad) * speed;
  const spin = (SPIN_BASE + clampedPower * SPIN_POWER_SCALE) * (0.85 + rng() * 0.3);
  return {
    phase: 'flight',
    x: LAUNCH_X,
    y: LAUNCH_Y,
    vx,
    vy,
    spin,
    rotation: 0,
    bounceCount: 0,
    maxHeight: LAUNCH_Y,
    power: clampedPower,
    angleRad,
    stoppedAt: null,
  };
}

/** One bounce resolution at the current state.x/state.vy — mutates state,
 * returns a list of event objects for the caller (sfx/particles/HUD). */
function resolveBounce(state, terrain) {
  const events = [];
  const incomingVy = state.vy; // negative == moving down into the ground
  const bounceVy = Math.max(0, -incomingVy) * BOUNCE_RESTITUTION;

  const spinBefore = state.spin;
  state.spin *= SPIN_BOUNCE_DAMP;
  const spinLost = spinBefore - state.spin;
  state.vx += spinLost * SPIN_GRIP_TRANSFER;
  state.vx *= BOUNCE_VX_DAMP;
  state.vx = Math.max(0, state.vx); // ice bounces never kick you backward

  state.bounceCount += 1;
  events.push({ type: 'bounce', count: state.bounceCount, impactSpeed: Math.abs(incomingVy) });

  if (bounceVy < BOUNCE_TO_SLIDE_VY || state.bounceCount >= MAX_BOUNCES) {
    state.phase = 'slide';
    state.vy = 0;
    events.push({ type: 'slide-start' });
  } else {
    state.vy = bounceVy;
  }
  return events;
}

function stepFlight(state, dt, terrain, wind) {
  state.vy -= GRAVITY * dt;
  state.vx += wind * dt;
  state.x += state.vx * dt;
  state.y += state.vy * dt;
  state.rotation += state.spin * dt;
  state.maxHeight = Math.max(state.maxHeight, state.y);

  const gh = groundHeight(state.x, terrain);
  if (state.y <= gh) {
    state.y = gh;
    return resolveBounce(state, terrain);
  }
  return [];
}

function stepSlide(state, dt, terrain) {
  const events = [];
  const prevX = state.x;
  const r = terrain.ramp;

  const slope = groundSlopeAngle(state.x, terrain);
  const slopeDecel = GRAVITY * Math.sin(slope); // >0 when climbing, slows vx

  let vx = state.vx;
  vx *= Math.pow(SLIDE_DECAY_PER_SEC, dt);
  vx -= slopeDecel * dt;
  vx += state.spin * SPIN_SLIDE_ASSIST * dt;
  vx = Math.max(0, vx);

  state.spin *= Math.pow(SPIN_SLIDE_DECAY_PER_SEC, dt);
  state.x = prevX + vx * dt;
  state.vx = vx;

  // Ramp launch: only fires the instant the slide crosses the ramp's exit
  // edge (x1) having actually climbed it this attempt (prevX inside the
  // ramp span) — groundHeight() already made the penguin visually ride up
  // the slope every frame until now, so this is a continuation of that
  // same surface, not a teleport.
  if (r && prevX < r.x1 && state.x >= r.x1 && prevX >= r.x0 - 0.001) {
    const launchSpeed = vx;
    state.vx = launchSpeed * Math.cos(RAMP_KICK_ANGLE_RAD);
    state.vy = launchSpeed * Math.sin(RAMP_KICK_ANGLE_RAD);
    state.y = r.height;
    state.phase = 'flight';
    state.maxHeight = r.height;
    events.push({ type: 'ramp-launch', speed: launchSpeed });
    return events;
  }

  state.y = groundHeight(state.x, terrain);

  if (vx < SLIDE_STOP_EPS) {
    state.vx = 0;
    state.phase = 'stopped';
    state.stoppedAt = state.x;
    events.push({ type: 'stopped', distance: state.x });
  }
  return events;
}

/** Advance the simulation by dt seconds. No-ops outside flight/slide
 * (aiming/stopped have nothing to integrate). Returns an array of event
 * objects (possibly empty) describing anything notable that happened this
 * step, for the caller to react to (sfx, particles, HUD). */
export function stepPhysics(state, dt, terrain, wind) {
  if (state.phase === 'flight') return stepFlight(state, dt, terrain, wind);
  if (state.phase === 'slide') return stepSlide(state, dt, terrain);
  return [];
}

/** First target whose zone contains x (targets don't overlap in practice,
 * but first-match wins if a future edit makes them). */
export function checkTargetHit(x, targets = TARGETS) {
  for (const tgt of targets) {
    if (Math.abs(x - tgt.xMeters) <= tgt.radius) return tgt;
  }
  return null;
}
