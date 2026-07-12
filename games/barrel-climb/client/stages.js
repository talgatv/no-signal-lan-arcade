/**
 * stages.js — pure level geometry + difficulty curve for Barrel Climb.
 * No DOM/canvas/audio here (same "pure model" split as games/cross-the-road's
 * road.js and games/fight-arena's combat.js) so the whole level shape and
 * every barrel's path can be driven and inspected directly from a plain
 * Node script or the browser test hook, not just eyeballed.
 *
 * World: a fixed CANVAS_W x CANVAS_H portrait world with LEVEL_COUNT stacked
 * horizontal "levels" (index 0 = ground at the bottom, LEVEL_COUNT-1 = the
 * top deck where the antagonist + rescue target stand). Each level between
 * the ground and the top is a single gently-tilted girder — occasionally
 * split into two segments by a gap — spanning [PLAT_LEFT, PLAT_RIGHT]. A
 * ladder connects one specific x on level i to the same x on level i+1.
 *
 * Coordinate system matches <canvas>: x grows right, y grows DOWN. "Downhill"
 * on a tilted segment means toward the larger-y end.
 */

export const CANVAS_W = 720;
export const CANVAS_H = 1000;

export const PLAT_LEFT = 40;
export const PLAT_RIGHT = 680;

/** 6 levels: 0 = ground, 1..4 = climbable tilted girders, 5 = top deck. */
export const LEVEL_Y = [920, 764, 608, 452, 296, 140];
export const LEVEL_COUNT = LEVEL_Y.length;
export const TOP_LEVEL = LEVEL_COUNT - 1;

/** Half the total vertical drop of a tilted girder across its full width. */
const TILT_MAG = 35;

const GOAL_RADIUS = 70;

/* ------------------------------------------------------------------------ *
 * Small geometry helpers — every consumer (player, barrels, hazard, render,
 * tests) goes through these instead of re-deriving slope math inline.
 * ------------------------------------------------------------------------ */
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/** Linear y at x along a {x1,y1,x2,y2} line (x assumed within [x1,x2]). */
export function lerpY(seg, x) {
  if (seg.x2 === seg.x1) return seg.y1;
  const tt = (x - seg.x1) / (seg.x2 - seg.x1);
  return seg.y1 + (seg.y2 - seg.y1) * tt;
}

/** The segment of `level` (an array of {x1,y1,x2,y2}) covering x, or null if
 * x falls inside a gap (no segment covers it). */
export function findSegmentAt(level, x) {
  for (const seg of level) {
    if (x >= seg.x1 - 0.01 && x <= seg.x2 + 0.01) return seg;
  }
  return null;
}

/** Surface y at x on `level`, or null if x is over a gap. */
export function surfaceYAt(level, x) {
  const seg = findSegmentAt(level, x);
  return seg ? lerpY(seg, x) : null;
}

/** Downhill x-direction of a segment: +1 (toward x2), -1 (toward x1), or 0
 * (flat — ground/top decks, or a level-0/5 style segment). */
export function slopeDirOf(seg) {
  if (seg.y2 > seg.y1 + 0.5) return 1;
  if (seg.y1 > seg.y2 + 0.5) return -1;
  return 0;
}

/** Search downward from `fromIndex - 1` for the nearest level with a surface
 * under x. Level 0 (ground) is always full-width/gapless, so this always
 * resolves for any x within [PLAT_LEFT, PLAT_RIGHT]. */
export function findSupportBelow(levels, fromIndex, x) {
  for (let i = fromIndex - 1; i >= 0; i--) {
    const y = surfaceYAt(levels[i], x);
    if (y != null) return { levelIndex: i, y };
  }
  return null;
}

/* ------------------------------------------------------------------------ *
 * Level construction from a compact per-stage descriptor.
 * ------------------------------------------------------------------------ */
function buildLevel(baseY, tilt, gap) {
  const yL = baseY - tilt * TILT_MAG;
  const yR = baseY + tilt * TILT_MAG;
  const full = { x1: PLAT_LEFT, y1: yL, x2: PLAT_RIGHT, y2: yR };
  if (!gap) return [full];
  const [gx1, gx2] = gap;
  const gy1 = lerpY(full, gx1);
  const gy2 = lerpY(full, gx2);
  return [
    { x1: PLAT_LEFT, y1: yL, x2: gx1, y2: gy1 },
    { x1: gx2, y1: gy2, x2: PLAT_RIGHT, y2: yR },
  ];
}

/**
 * Compact per-layout descriptors. `tilts[i]` / `gaps[i]` describe climbable
 * level i+1 (levels 1..4); ground(0) and the top deck(5) are always flat and
 * gapless. `ladders[i]` is the x connecting level i to level i+1 (5 ladders
 * for 6 levels). Five genuinely different layouts: tilt pattern, ladder
 * zigzag spacing, gap count (0/0/1/1/2), hazard level and item placement all
 * differ — see README for the at-a-glance table.
 */
const LAYOUT_DEFS = [
  {
    key: 'entry-deck',
    tilts: [1, -1, 1, -1],
    gaps: [null, null, null, null],
    ladders: [200, 560, 180, 540, 220],
    hazardLevel: 2,
    items: [{ level: 1, x: 460 }, { level: 3, x: 380 }],
    hammer: { level: 2, x: 420 },
    antagonistX: 560,
    goalX: 160,
    playerStartX: 80,
  },
  {
    key: 'coolant-shaft',
    tilts: [-1, 1, -1, 1],
    gaps: [null, null, null, null],
    ladders: [520, 160, 580, 140, 600],
    hazardLevel: 3,
    items: [{ level: 2, x: 200 }, { level: 4, x: 500 }],
    hammer: { level: 1, x: 600 },
    antagonistX: 180,
    goalX: 600,
    playerStartX: 640,
  },
  {
    key: 'cargo-bay',
    tilts: [1, -1, 1, -1],
    gaps: [null, [320, 400], null, null],
    ladders: [240, 600, 140, 580, 200],
    hazardLevel: 1,
    items: [{ level: 1, x: 460 }, { level: 3, x: 420 }],
    hammer: { level: 2, x: 250 },
    antagonistX: 560,
    goalX: 160,
    playerStartX: 80,
  },
  {
    key: 'reactor-core',
    tilts: [-1, 1, -1, 1],
    gaps: [null, null, [280, 360], null],
    ladders: [560, 180, 560, 160, 580],
    hazardLevel: 4,
    items: [{ level: 1, x: 300 }, { level: 4, x: 460 }],
    hammer: { level: 3, x: 500 },
    antagonistX: 180,
    goalX: 600,
    playerStartX: 640,
  },
  {
    key: 'signal-spire',
    tilts: [1, -1, 1, -1],
    gaps: [null, [380, 460], null, [240, 320]],
    ladders: [200, 520, 160, 560, 200],
    hazardLevel: 3,
    items: [{ level: 1, x: 600 }, { level: 3, x: 600 }],
    hammer: { level: 2, x: 250 },
    antagonistX: 560,
    goalX: 160,
    playerStartX: 80,
  },
];

export const LAYOUT_COUNT = LAYOUT_DEFS.length;

/** Build the full concrete geometry for `layoutIndex` (0-based, wraps). */
export function buildStage(layoutIndex) {
  const def = LAYOUT_DEFS[((layoutIndex % LAYOUT_COUNT) + LAYOUT_COUNT) % LAYOUT_COUNT];

  const levels = [];
  levels[0] = buildLevel(LEVEL_Y[0], 0, null); // ground: flat, gapless
  for (let i = 1; i <= 4; i++) {
    levels[i] = buildLevel(LEVEL_Y[i], def.tilts[i - 1], def.gaps[i - 1]);
  }
  levels[TOP_LEVEL] = buildLevel(LEVEL_Y[TOP_LEVEL], 0, null); // top deck: flat, gapless

  const ladders = def.ladders.map((x, i) => {
    const levelBottom = i;
    const levelTop = i + 1;
    const yBottom = surfaceYAt(levels[levelBottom], x);
    const yTop = surfaceYAt(levels[levelTop], x);
    return {
      x, levelBottom, levelTop, yBottom, yTop,
    };
  });

  const items = def.items.map((it, i) => ({
    id: `gem${i}`,
    type: 'gem',
    level: it.level,
    x: it.x,
    y: surfaceYAt(levels[it.level], it.x),
    collected: false,
  }));
  const hammerItem = {
    id: 'hammer0',
    type: 'hammer',
    level: def.hammer.level,
    x: def.hammer.x,
    y: surfaceYAt(levels[def.hammer.level], def.hammer.x),
    collected: false,
  };

  const antagonist = { x: def.antagonistX, y: LEVEL_Y[TOP_LEVEL] };
  const goal = { x: def.goalX, y: LEVEL_Y[TOP_LEVEL], radius: GOAL_RADIUS };

  return {
    key: def.key,
    levels,
    ladders,
    hazardLevel: def.hazardLevel,
    items,
    hammerItem,
    antagonist,
    goal,
    playerStartX: def.playerStartX,
  };
}

/* ------------------------------------------------------------------------ *
 * Difficulty ramp — a pure function of stage number so it can be inspected
 * directly (window.OGH_BARREL_CLIMB.stageParams) instead of eyeballed, same
 * convention as games/cross-the-road's road.js stageParams(). Ramps from the
 * *_START values to the *_FLOOR/*_CEIL values, reaching them at RAMP_STAGES
 * and holding thereafter — the run itself is endless (layouts cycle) but
 * difficulty caps at a fair ceiling instead of climbing forever.
 * ------------------------------------------------------------------------ */
const RAMP_STAGES = 10;
const RAMP_EASE = 1.25;

const BARREL_INTERVAL_START_MS = 3200;
const BARREL_INTERVAL_FLOOR_MS = 1350;
const BARREL_SPEED_START = 90;
const BARREL_SPEED_CEIL = 175;
const LADDER_FALL_CHANCE_START = 0.16;
const LADDER_FALL_CHANCE_CEIL = 0.34;
const HAZARD_SPEED_START = 70;
const HAZARD_SPEED_CEIL = 150;
const MAX_BARRELS_START = 4;
const MAX_BARRELS_CEIL = 7;

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function lerp(a, b, tt) { return a + (b - a) * tt; }

export function stageParams(stageNumber) {
  const n = Math.max(1, Math.floor(stageNumber));
  const raw = clamp01((n - 1) / (RAMP_STAGES - 1));
  const tt = raw ** RAMP_EASE;
  return {
    layoutIndex: (n - 1) % LAYOUT_COUNT,
    barrelIntervalMs: lerp(BARREL_INTERVAL_START_MS, BARREL_INTERVAL_FLOOR_MS, tt),
    barrelSpeed: lerp(BARREL_SPEED_START, BARREL_SPEED_CEIL, tt),
    ladderFallChance: lerp(LADDER_FALL_CHANCE_START, LADDER_FALL_CHANCE_CEIL, tt),
    hazardSpeed: lerp(HAZARD_SPEED_START, HAZARD_SPEED_CEIL, tt),
    maxBarrels: Math.round(lerp(MAX_BARRELS_START, MAX_BARRELS_CEIL, tt)),
  };
}

/* ------------------------------------------------------------------------ *
 * Authoring validation — every layout must have ladders that land on real
 * surface (not inside a gap) at both ends. Run for all layouts by the Node
 * physics harness and exposed on the debug hook; not called during normal
 * play.
 * ------------------------------------------------------------------------ */
export function validateStageGeometry(stage) {
  const errors = [];
  for (const ladder of stage.ladders) {
    if (ladder.yBottom == null) {
      errors.push(`ladder x=${ladder.x} has no surface on level ${ladder.levelBottom} (bottom)`);
    }
    if (ladder.yTop == null) {
      errors.push(`ladder x=${ladder.x} has no surface on level ${ladder.levelTop} (top)`);
    }
  }
  for (const it of [...stage.items, stage.hammerItem]) {
    if (it.y == null) errors.push(`item ${it.id} at x=${it.x} has no surface on level ${it.level}`);
  }
  const hazardSeg = stage.levels[stage.hazardLevel];
  if (!hazardSeg || hazardSeg.length === 0) errors.push(`hazard level ${stage.hazardLevel} has no segments`);
  if (stage.goal.x < PLAT_LEFT || stage.goal.x > PLAT_RIGHT) errors.push('goal.x out of bounds');
  if (stage.playerStartX < PLAT_LEFT || stage.playerStartX > PLAT_RIGHT) errors.push('playerStartX out of bounds');
  return errors;
}

export function validateAllLayouts() {
  const out = {};
  for (let i = 0; i < LAYOUT_COUNT; i++) {
    const stage = buildStage(i);
    out[stage.key] = validateStageGeometry(stage);
  }
  return out;
}
