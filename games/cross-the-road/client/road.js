/**
 * road.js — pure data/model layer for Cross the Road: difficulty curve,
 * row/lane generation, vehicle motion, and collision math. No canvas/DOM
 * code lives here (see render.js for drawing, game.js for orchestration) so
 * the whole simulation can be driven and inspected headlessly — exactly
 * what the debug hook (window.OGH_CROSS_ROAD in game.js) leans on for
 * automated testing of collisions and the difficulty ramp.
 *
 * World model
 * -----------
 * The road is an endless sequence of integer-indexed *rows* the player hops
 * across one at a time:
 *   - row 0 is the starting platform (always safe).
 *   - a "stage" is `lanes(stage)` consecutive traffic rows followed by one
 *     safe median row. Landing on that median = the stage is cleared.
 *   - the next stage's traffic rows follow immediately, generated with
 *     harder params (see stageParams()).
 * Rows are generated lazily in a rolling window around the player
 * (growRowsTo / pruneRowsBehind) so an endless run has bounded memory and a
 * restart can never leave stray state behind.
 *
 * Within a row, horizontal position uses a depth-independent "colNorm" unit
 * in roughly [-1, 1] (the drivable road width at any depth maps to this same
 * range — only its on-screen pixel width shrinks with distance, per
 * render.js's perspective projection). The player stands on one of a fixed
 * number of discrete SLOTS across that range; vehicles move continuously
 * through it.
 */

/* ------------------------------------------------------------------------ *
 * Tunables — the difficulty curve lives here, as pure functions of stage
 * number, mirroring games/pop-the-bugs/client/app.js's rampAt() pattern:
 * inspectable directly (stageParams(n)) instead of eyeballed.
 * ------------------------------------------------------------------------ */
export const SLOTS = 5; // discrete dodge positions across the road width

// Hitboxes are intentionally a little smaller than the drawn sprites (an
// arcade-fairness trick, same rationale as games/pop-the-bugs' generous tap
// targets): a near-miss should *look* closer than it actually was.
export const PLAYER_HALF = 0.11;
export const PLAYER_VISUAL_HALF = 0.17;
export const CAR_HALF_W = 0.14;
export const TRUCK_HALF_W = 0.27;

// Per-row traffic is a rigid circular conveyor of this total colNorm length;
// must stay comfortably wider than the visible [-1, 1] road so vehicles
// enter/exit off-screen with no visible pop-in.
export const LOOP_SPAN = 3.4;

// Lane count grows by exactly 1 every stage until MAX_LANES, i.e. the road
// visibly, mechanically widens for the first several stages (not a token
// bump) before capping so the board stays a bounded, readable size; from
// then on the *endless* difficulty keeps climbing purely via speed/density.
export const BASE_LANES = 3;
export const MAX_LANES = 9;

// Speed/density/truck-mix ramp from *_START to *_CAP over RAMP_STAGES,
// eased so the early game stays close to the generous starting values and
// the ramp bites harder in the later stages of the climb (same eased-hold
// shape as pop-the-bugs' RAMP_EASE), then holds at the cap forever after —
// "endless" means the run never stops getting harder in principle, but the
// per-stage numbers themselves settle at a fixed (very hard) ceiling.
export const RAMP_STAGES = 16;
export const RAMP_EASE = 1.2;

export const SPEED_MIN_START = 0.35; // colNorm units/sec
export const SPEED_MIN_CAP = 1.10;
export const SPEED_MAX_START = 0.55;
export const SPEED_MAX_CAP = 1.65;

// Clearance = guaranteed bumper-to-bumper gap (colNorm units), independent
// of which vehicle kinds land on either side of it. The floor is chosen so
// a stationary player (2*PLAYER_HALF = 0.22 wide) always fits through the
// tightest possible gap with room to spare (0.34 - 0.22 = 0.12 slack) —
// deliberately never a literal wall-to-wall blockade, however fast/dense
// traffic gets, same "floor clamp" fairness philosophy as pop-the-bugs'
// spawn/visible-time floors.
export const CLEARANCE_MIN_START = 0.62;
export const CLEARANCE_MIN_FLOOR = 0.34;
export const CLEARANCE_MAX_START = 0.95;
export const CLEARANCE_MAX_FLOOR = 0.52;

export const TRUCK_CHANCE_START = 0.10;
export const TRUCK_CHANCE_CAP = 0.42;

// Row-window bookkeeping: keep rows generated this far ahead of the player
// (covers render.js's visible depth with margin) and drop rows this far
// behind (nothing ever needs to look back further than a couple of rows).
export const AHEAD_GEN = 26;
export const REAR_KEEP = 2;

const CAR_COLORS = ['#5ce1ff', '#ff6bcb', '#5cffb0', '#c4a0ff'];
const TRUCK_COLORS = ['#ffd166', '#ff8a5c'];

function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function lerp(a, b, tt) { return a + (b - a) * tt; }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

/** Discrete slot index -> depth-independent colNorm position in [-1, 1]. */
export function slotNorm(col) {
  return (col - (SLOTS - 1) / 2) / ((SLOTS - 1) / 2);
}

/**
 * Pure function of stage number -> traffic parameters for that stage.
 * Exposed on the debug hook for direct inspection/testing (no need to play
 * through dozens of real stages to see the numbers).
 */
export function stageParams(stage) {
  const s = Math.max(1, Math.floor(stage));
  const lanes = Math.min(MAX_LANES, BASE_LANES + (s - 1));
  const tt = clamp01((s - 1) / (RAMP_STAGES - 1)) ** RAMP_EASE;
  return {
    stage: s,
    lanes,
    speedMin: lerp(SPEED_MIN_START, SPEED_MIN_CAP, tt),
    speedMax: lerp(SPEED_MAX_START, SPEED_MAX_CAP, tt),
    clearanceMin: lerp(CLEARANCE_MIN_START, CLEARANCE_MIN_FLOOR, tt),
    clearanceMax: lerp(CLEARANCE_MAX_START, CLEARANCE_MAX_FLOOR, tt),
    truckChance: lerp(TRUCK_CHANCE_START, TRUCK_CHANCE_CAP, tt),
  };
}

/** Row index of the first traffic row of `targetStage` (row 0 = start, row 1 = stage-1's first lane). */
export function rowIndexAtStageStart(targetStage) {
  let idx = 1;
  for (let k = 1; k < targetStage; k++) idx += stageParams(k).lanes + 1;
  return idx;
}

/** Row index of the safe row (start platform or median) right before `targetStage` begins. */
export function safeRowBeforeStage(targetStage) {
  return rowIndexAtStageStart(targetStage) - 1;
}

/* ------------------------------------------------------------------------ *
 * Vehicles + traffic rows
 * ------------------------------------------------------------------------ */
function makeVehicle(kind, x) {
  const halfW = kind === 'truck' ? TRUCK_HALF_W : CAR_HALF_W;
  const color = pick(kind === 'truck' ? TRUCK_COLORS : CAR_COLORS);
  return { kind, x, halfW, color };
}

function makeTrafficRow(rowIndex, stage) {
  const p = stageParams(stage);
  const dir = rowIndex % 2 === 0 ? 1 : -1; // alternate direction by lane, per design brief
  const speed = (p.speedMin + Math.random() * (p.speedMax - p.speedMin)) * dir;
  const vehicles = [];
  const half = LOOP_SPAN / 2;

  // Build outward from a guaranteed-clear gap straddling colNorm 0 (the
  // player's spawn/entry column) instead of a single random left-edge
  // phase. This matters because a freshly generated row can be reached in
  // a *single hop* with essentially zero elapsed time for traffic to have
  // moved from its just-rolled spawn positions — concretely, row 1 (the
  // first traffic row right after the safe start platform) and whichever
  // row the debug hook's jumpToStage() lands next to. Without this, pure
  // left-edge phase jitter had a substantial chance of placing a vehicle
  // directly on the entry column at t=0, i.e. an unavoidable "instant
  // death on your very first tap" with no time to react — found via the
  // debug hook's getRowHitboxes() while testing, not by eyeballing.
  // Traffic still gets just as dense/fast everywhere else; this only ever
  // guarantees the single gap nearest dead-center, which at high stages
  // can still close within a hop if the player dawdles — that part is
  // intended difficulty, not a bug.
  const firstGap = p.clearanceMin + Math.random() * (p.clearanceMax - p.clearanceMin);
  let xRight = firstGap / 2;
  while (xRight < half) {
    const kind = Math.random() < p.truckChance ? 'truck' : 'car';
    const halfW = kind === 'truck' ? TRUCK_HALF_W : CAR_HALF_W;
    const center = xRight + halfW;
    vehicles.push(makeVehicle(kind, center));
    const clearance = p.clearanceMin + Math.random() * (p.clearanceMax - p.clearanceMin);
    xRight = center + halfW + clearance;
  }
  let xLeft = -firstGap / 2;
  while (xLeft > -half) {
    const kind = Math.random() < p.truckChance ? 'truck' : 'car';
    const halfW = kind === 'truck' ? TRUCK_HALF_W : CAR_HALF_W;
    const center = xLeft - halfW;
    vehicles.push(makeVehicle(kind, center));
    const clearance = p.clearanceMin + Math.random() * (p.clearanceMax - p.clearanceMin);
    xLeft = center - halfW - clearance;
  }
  vehicles.sort((a, b) => a.x - b.x);

  return {
    rowIndex, kind: 'road', stage, dir, speed, loopSpan: LOOP_SPAN, vehicles,
  };
}

function makeSafeRow(rowIndex, kind, stage) {
  return {
    rowIndex, kind, stage, dir: 0, speed: 0, loopSpan: LOOP_SPAN, vehicles: [],
  };
}

export function makeRow(rowIndex, kind, stage) {
  return kind === 'road' ? makeTrafficRow(rowIndex, stage) : makeSafeRow(rowIndex, kind, stage);
}

/** Advance one traffic row's vehicles by dt seconds (no-op for safe rows). */
export function updateRow(row, dt) {
  if (row.kind !== 'road' || row.speed === 0) return;
  const half = row.loopSpan / 2;
  for (const v of row.vehicles) {
    v.x += row.speed * dt;
    if (row.speed > 0 && v.x - v.halfW > half) v.x -= row.loopSpan;
    else if (row.speed < 0 && v.x + v.halfW < -half) v.x += row.loopSpan;
  }
}

/* ------------------------------------------------------------------------ *
 * Row-window generator — sequential, amortized O(1) per new row. Tracks
 * which stage is currently being materialized so newly created traffic rows
 * always use that stage's params.
 * ------------------------------------------------------------------------ */
export function createRoadState() {
  const rows = new Map();
  const gen = { cursorRow: 0, stage: 1, rowInStage: 0, lanesInStage: stageParams(1).lanes };
  return { rows, gen };
}

/**
 * Materialize rows up to and including `targetRow` (no-op for
 * already-generated rows). A median row's `.stage` is the stage it leads
 * INTO (not the one it just closed) — e.g. the median right after stage 3's
 * last traffic lane is labeled stage 4 — so that both the live HUD (which
 * just reads the current row's `.stage`) and jumpToStage()'s return value
 * read as "the stage you're now heading into," matching how a player
 * standing on that median actually thinks about it. The transient
 * "Stage N clear!" floater (game.js's onStageClear) accounts for this with
 * a `- 1` at its one call site.
 */
export function growRowsTo(road, targetRow) {
  const { rows, gen } = road;
  while (gen.cursorRow <= targetRow) {
    const i = gen.cursorRow;
    let row;
    if (i === 0) {
      row = makeRow(0, 'start', 1);
    } else if (gen.rowInStage < gen.lanesInStage) {
      row = makeRow(i, 'road', gen.stage);
      gen.rowInStage++;
    } else {
      gen.stage++;
      gen.rowInStage = 0;
      gen.lanesInStage = stageParams(gen.stage).lanes;
      row = makeRow(i, 'median', gen.stage);
    }
    rows.set(i, row);
    gen.cursorRow++;
  }
}

/** Drop rows behind `keepFromRow` so an endless run has bounded memory. */
export function pruneRowsBehind(road, keepFromRow) {
  for (const key of road.rows.keys()) {
    if (key < keepFromRow) road.rows.delete(key);
  }
}

/**
 * Jump generation straight to the safe row that begins `targetStage`,
 * without materializing every row of every earlier stage (that row index is
 * computed in closed form by safeRowBeforeStage). Used by the title-screen
 * "start" flow (targetStage=1) and by the test-only debug hook to fast
 * forward to a much harder stage.
 */
export function jumpRoadToStage(road, targetStage) {
  road.rows.clear();
  const startRow = safeRowBeforeStage(targetStage);
  if (startRow === 0) {
    road.rows.set(0, makeRow(0, 'start', 1));
  } else {
    road.rows.set(startRow, makeRow(startRow, 'median', targetStage));
  }
  road.gen.cursorRow = startRow + 1;
  road.gen.stage = targetStage;
  road.gen.rowInStage = 0;
  road.gen.lanesInStage = stageParams(targetStage).lanes;
  growRowsTo(road, startRow + AHEAD_GEN);
  return startRow;
}

/* ------------------------------------------------------------------------ *
 * Collision math — plain 1D interval overlap, exposed in a directly
 * checkable shape (explicit min/max per vehicle) rather than something a
 * test harness has to reverse-engineer.
 * ------------------------------------------------------------------------ */
export function playerBounds(col) {
  const c = slotNorm(col);
  return { min: c - PLAYER_HALF, max: c + PLAYER_HALF };
}

export function vehicleBounds(v) {
  return { min: v.x - v.halfW, max: v.x + v.halfW };
}

export function intervalsOverlap(aMin, aMax, bMin, bMax) {
  return aMin < bMax && bMin < aMax;
}

/** All vehicle hitboxes in `row`, in a flat directly-inspectable shape. */
export function rowHitboxes(row) {
  if (row.kind !== 'road') return [];
  return row.vehicles.map((v) => {
    const b = vehicleBounds(v);
    return { kind: v.kind, xMin: b.min, xMax: b.max, x: v.x, halfW: v.halfW };
  });
}

/** Does any vehicle in `row` currently overlap a player standing at `col`? */
export function rowHasCollision(row, col) {
  if (row.kind !== 'road') return false;
  const pb = playerBounds(col);
  return row.vehicles.some((v) => {
    const b = vehicleBounds(v);
    return intervalsOverlap(pb.min, pb.max, b.min, b.max);
  });
}
