/**
 * targets.js — pure model for Paintball: arena depth-lane layout, target
 * type stats, wave difficulty curve, and target-slot lifecycle helpers.
 * No canvas/DOM code lives here (same split as games/cross-the-road's
 * road.js) so LANES/waveParams()/slot state can be inspected or driven
 * directly from a test harness without booting the renderer.
 */

export const CANVAS_W = 1000;
export const CANVAS_H = 600;

/* ------------------------------------------------------------------------ *
 * Depth lanes — a classic 3-row shooting-gallery layout: targets pop up
 * from behind a cover band at a fixed baseline Y. Each lane's spread width,
 * draw scale and slot count shrink toward the horizon (far = narrow/small/
 * few slots near the top, near = wide/big/more slots near the bottom),
 * giving a trapezoidal sense of depth without any real 3D — the same "flat
 * scene, scaled by distance" trick games/cross-the-road's render.js uses
 * for a receding road, applied here to static rows instead of forward
 * motion. `rise` is how far (px, before per-target scale) a target lifts
 * above baseY once fully popped up.
 * ------------------------------------------------------------------------ */
export const LANES = [
  { id: 'far', baseY: 200, spreadW: 520, slots: 6, scale: 0.50, rise: 46 },
  { id: 'mid', baseY: 328, spreadW: 760, slots: 5, scale: 0.78, rise: 64 },
  { id: 'near', baseY: 478, spreadW: 940, slots: 4, scale: 1.12, rise: 90 },
];

export function laneSlotX(lane, slotIdx) {
  const left = CANVAS_W / 2 - lane.spreadW / 2;
  return left + (lane.spreadW * (slotIdx + 0.5)) / lane.slots;
}

/* ------------------------------------------------------------------------ *
 * Target types. `points` scores on hit, `penalty` deducts from score and
 * `strike` accrues toward MAX_STRIKES (civilian only), `refill` instantly
 * tops up the magazine (crate only), `drift` lets a target sway sideways
 * while up (ace only — "moves", not just "pops up", per the design brief).
 * ------------------------------------------------------------------------ */
export const TARGET_TYPES = {
  grunt: { points: 100, penalty: 0, strike: 0, refill: false, sizeMul: 1.00, drift: false },
  ace: { points: 250, penalty: 0, strike: 0, refill: false, sizeMul: 0.74, drift: true },
  civilian: { points: 0, penalty: 150, strike: 1, refill: false, sizeMul: 1.05, drift: false },
  crate: { points: 60, penalty: 0, strike: 0, refill: true, sizeMul: 0.86, drift: false },
};

export const BASE_TARGET_R = 46;

/* Lifecycle animation durations (ms) — constant across waves; only spawn
 * cadence / visible duration / type mix / drift ramp with difficulty (see
 * waveParams below), same "floor stays humanly reactable" philosophy as
 * games/pop-the-bugs. */
export const RISE_MS = 150;
export const FALL_MS = 220;
export const HIT_MS = 240;
export const COOLDOWN_MS = 220;

export const WAVE_COUNT = 8;
export const MAX_STRIKES = 3;
export const MAG_SIZE = 7;
export const RELOAD_MS = 1300;

function lerp(a, b, tt) { return a + (b - a) * tt; }
function clamp01(x) { return Math.max(0, Math.min(1, x)); }

/**
 * Pure function of wave index (0-based) -> difficulty parameters. Exposed
 * on the debug hook (window.OGH_PAINTBALL.waveParams) so any wave's
 * difficulty can be inspected/diffed directly instead of eyeballed by
 * playing every earlier wave in real time (same convention as
 * games/cross-the-road's ROAD.stageParams and games/pop-the-bugs' rampAt).
 */
export function waveParams(waveIndex) {
  const tt = clamp01(WAVE_COUNT > 1 ? waveIndex / (WAVE_COUNT - 1) : 0);
  const civilianWeight = lerp(0.08, 0.24, tt);
  const aceWeight = lerp(0.10, 0.24, tt);
  const crateWeight = lerp(0.09, 0.05, tt);
  const gruntWeight = Math.max(0.2, 1 - civilianWeight - aceWeight - crateWeight);
  const norm = gruntWeight + civilianWeight + aceWeight + crateWeight;
  return {
    wave: waveIndex + 1,
    durationMs: Math.round(lerp(30000, 40000, tt)),
    spawnIntervalMs: Math.round(lerp(1000, 420, tt)),
    visibleMs: Math.round(lerp(1900, 900, tt)),
    maxConcurrent: Math.round(lerp(2, 5, tt)),
    aceDriftAmp: Math.round(lerp(14, 30, tt)),
    aceDriftFreqHz: Number(lerp(1.1, 2.2, tt).toFixed(2)),
    weights: {
      grunt: gruntWeight / norm,
      civilian: civilianWeight / norm,
      ace: aceWeight / norm,
      crate: crateWeight / norm,
    },
  };
}

const TYPE_ORDER = ['grunt', 'civilian', 'ace', 'crate'];

export function pickWeightedType(weights) {
  const r = Math.random();
  let acc = 0;
  for (const key of TYPE_ORDER) {
    acc += weights[key];
    if (r < acc) return key;
  }
  return 'grunt';
}

/* ------------------------------------------------------------------------ *
 * Target-slot factory — one entry per pop-up slot across all lanes,
 * addressed flat (not nested per-lane) so game.js can spawn/tick without a
 * nested loop every frame. Total slots = sum of LANES[*].slots (15).
 * ------------------------------------------------------------------------ */
export function createSlots() {
  const slots = [];
  LANES.forEach((lane, laneIdx) => {
    for (let i = 0; i < lane.slots; i++) {
      slots.push({
        laneIdx,
        slotIdx: i,
        x: laneSlotX(lane, i),
        type: null,
        phase: 'idle', // idle | rising | up | hit | falling
        ageMs: 0,
        phaseMs: 0,
        lifeMs: 0,
        cooldownMs: 0,
        driftSeed: Math.random() * Math.PI * 2,
      });
    }
  });
  return slots;
}

export function resetSlots(slots) {
  for (const s of slots) {
    s.type = null;
    s.phase = 'idle';
    s.ageMs = 0;
    s.phaseMs = 0;
    s.lifeMs = 0;
    s.cooldownMs = 0;
  }
}

/** Target hit/draw radius in canvas px, scaled by lane depth + type size. */
export function targetRadius(slot) {
  const lane = LANES[slot.laneIdx];
  const type = TARGET_TYPES[slot.type];
  if (!lane || !type) return 0;
  return BASE_TARGET_R * lane.scale * type.sizeMul;
}

/**
 * Current screen position + rise progress (0..1) for a slot. Shared by
 * render.js (drawing) and game.js (hit testing) so both agree exactly on
 * where a target visually is — including 'ace's horizontal drift while up.
 */
export function slotVisual(slot, nowSec, params) {
  const lane = LANES[slot.laneIdx];
  let riseT;
  if (slot.phase === 'rising') riseT = clamp01(slot.phaseMs / RISE_MS);
  else if (slot.phase === 'up') riseT = 1;
  else if (slot.phase === 'falling') riseT = 1 - clamp01(slot.phaseMs / FALL_MS);
  else if (slot.phase === 'hit') riseT = 1 - clamp01(slot.phaseMs / HIT_MS) * 0.6;
  else riseT = 0;

  let dx = 0;
  const type = TARGET_TYPES[slot.type];
  if (type && type.drift && slot.phase === 'up' && params) {
    dx = Math.sin(nowSec * params.aceDriftFreqHz * Math.PI * 2 + slot.driftSeed) * params.aceDriftAmp;
  }

  return {
    x: slot.x + dx,
    y: lane.baseY - lane.rise * riseT,
    riseT,
  };
}
