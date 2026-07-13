/**
 * village.js — the village skyline's data model: building silhouette
 * profiles, window placement, and the one non-targetable grounding-spire
 * slot every successful cast redirects into. Pure geometry/data, no ctx
 * drawing here (same split as games/void-drift's asteroids.js: this module
 * hands game.js plain objects with pixel-space fields to draw, it never
 * touches a canvas itself) — game.js owns all rendering and all runtime
 * mutation (marking a building struck, growing its smoke particles, etc.).
 *
 * Layout model: the village is `count` targetable buildings plus one
 * grounding spire, laid out left-to-right across `count + 1` equal-width
 * slots (the spire always occupies `spireIndex`). Each building's roof
 * profile is authored in a local unit box (x: 0..1 across its own slot, y:
 * 0..1 where 0 is that building's own roof apex and 1 is the ground) so
 * `layoutVillage` can re-scale every building independently to its own
 * randomized height/width fraction with one shared formula, and re-run
 * cheaply on resize without re-rolling the random silhouette choices.
 */

function randRange(lo, hi) { return lo + Math.random() * (hi - lo); }

/* ------------------------------------------------------------------------ *
 * Roofline profiles — five recognizably different silhouettes, each with a
 * randomized detail so instances of the same profile still vary. Every
 * profile returns `apex` (the roof's highest point, where a threat's charge
 * filament anchors) and `bodyTopY` (the y below which the wall is a plain
 * vertical rectangle, safe for windows).
 * ------------------------------------------------------------------------ */
function profileFlat() {
  const parapet = randRange(0.05, 0.11);
  return {
    apex: { x: 0.5, y: parapet },
    bodyTopY: parapet,
    points: [
      { x: 0.06, y: 1 }, { x: 0.06, y: parapet }, { x: 0.94, y: parapet }, { x: 0.94, y: 1 },
    ],
  };
}

function profileGable() {
  const eaveY = randRange(0.32, 0.42);
  return {
    apex: { x: 0.5, y: 0 },
    bodyTopY: eaveY,
    points: [
      { x: 0.08, y: 1 }, { x: 0.08, y: eaveY }, { x: 0.5, y: 0 }, { x: 0.92, y: eaveY }, { x: 0.92, y: 1 },
    ],
  };
}

function profileShed() {
  const hi = randRange(0.08, 0.16);
  const lo = randRange(0.36, 0.46);
  const flip = Math.random() < 0.5;
  const leftY = flip ? hi : lo;
  const rightY = flip ? lo : hi;
  return {
    apex: { x: flip ? 0.08 : 0.92, y: Math.min(leftY, rightY) },
    bodyTopY: Math.max(leftY, rightY),
    points: [
      { x: 0.08, y: 1 }, { x: 0.08, y: leftY }, { x: 0.92, y: rightY }, { x: 0.92, y: 1 },
    ],
  };
}

function profileStepped() {
  const towerHalfW = randRange(0.14, 0.2);
  const towerTop = randRange(0.06, 0.12);
  const baseTop = randRange(0.4, 0.5);
  return {
    apex: { x: 0.5, y: towerTop },
    bodyTopY: baseTop,
    points: [
      { x: 0.06, y: 1 }, { x: 0.06, y: baseTop }, { x: 0.5 - towerHalfW, y: baseTop },
      { x: 0.5 - towerHalfW, y: towerTop }, { x: 0.5 + towerHalfW, y: towerTop },
      { x: 0.5 + towerHalfW, y: baseTop }, { x: 0.94, y: baseTop }, { x: 0.94, y: 1 },
    ],
  };
}

function profileDome() {
  const baseY = randRange(0.3, 0.38);
  const domeTopY = randRange(0.04, 0.09);
  const points = [{ x: 0.1, y: 1 }, { x: 0.1, y: baseY }];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = 0.1 + t * 0.8;
    const py = baseY - Math.sin(t * Math.PI) * (baseY - domeTopY);
    points.push({ x: px, y: py });
  }
  points.push({ x: 0.9, y: baseY }, { x: 0.9, y: 1 });
  return { apex: { x: 0.5, y: domeTopY }, bodyTopY: baseY, points };
}

const PROFILE_FACTORIES = [profileFlat, profileGable, profileShed, profileStepped, profileDome];

/* ------------------------------------------------------------------------ *
 * Windows — a loose grid of 2-3 columns by 2-3 rows below the roofline,
 * each lit with ~62% probability (a lived-in, irregular scatter, not every
 * window glowing) with a per-window random `flicker` phase for a gentle
 * candle-like shimmer at render time. Guaranteed at least one lit window per
 * building so nothing reads as abandoned before the storm even starts.
 * ------------------------------------------------------------------------ */
function makeWindows(bodyTopY) {
  const cols = 2 + (Math.random() < 0.5 ? 0 : 1);
  const rows = 2 + (Math.random() < 0.35 ? 1 : 0);
  const top = Math.min(0.78, bodyTopY + 0.09);
  const bottom = 0.92;
  const usableH = Math.max(0.05, bottom - top);
  const winW = 0.11;
  const winH = Math.min(0.1, (usableH / rows) * 0.55);
  const windows = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() > 0.62) continue;
      const cx = cols === 1 ? 0.5 : 0.22 + (c / (cols - 1)) * 0.56;
      const cy = top + ((r + 0.5) / rows) * usableH;
      windows.push({ x: cx - winW / 2, y: cy - winH / 2, w: winW, h: winH, flicker: Math.random() * Math.PI * 2 });
    }
  }
  if (windows.length === 0) {
    const cy = top + usableH * 0.5;
    windows.push({ x: 0.5 - winW / 2, y: cy - winH / 2, w: winW, h: winH, flicker: Math.random() * Math.PI * 2 });
  }
  return windows;
}

/* ------------------------------------------------------------------------ *
 * Village construction + layout
 * ------------------------------------------------------------------------ */

/**
 * @param {number} count targetable buildings (the storm can strike these)
 * @param {number} spireIndex which of the `count + 1` slots is the
 *   non-targetable grounding spire every successful cast redirects into
 */
export function buildVillage(count, spireIndex) {
  const slotCount = count + 1;
  const buildings = [];
  let bi = 0;
  for (let slot = 0; slot < slotCount; slot++) {
    if (slot === spireIndex) continue;
    const profile = PROFILE_FACTORIES[(Math.random() * PROFILE_FACTORIES.length) | 0]();
    buildings.push({
      index: bi,
      slotIndex: slot,
      widthFrac: randRange(0.6, 0.9),
      heightFrac: randRange(0.42, 1.0),
      profile,
      windows: makeWindows(profile.bodyTopY),
      struck: false,
      struckMs: 0,
      smoke: [],
      // pixel geometry — filled in by layoutVillage()
      x: 0, y: 0, w: 0, h: 0, apexX: 0, apexY: 0, outline: [], windowRects: [],
    });
    bi += 1;
  }
  const spire = {
    slotIndex: spireIndex,
    widthFrac: 0.1,
    heightFrac: 1.22, // deliberately taller than any building's own max so the rod always reads as the village's tallest point
    x: 0, y: 0, w: 0, h: 0, tipX: 0, tipY: 0, baseY: 0,
  };
  return { slotCount, spireIndex, buildings, spire };
}

const MAX_BUILDING_H_FRAC = 0.46; // tallest possible building as a fraction of stage height — leaves clear open sky above for threats to read

/** Recompute every building's and the spire's pixel geometry for the
 * current canvas size. Cheap and resize-safe: never re-rolls a silhouette
 * choice, only rescales the already-chosen profile/windows into pixels. */
export function layoutVillage(village, W, H) {
  const slotW = W / village.slotCount;
  const groundY = H;
  const maxH = H * MAX_BUILDING_H_FRAC;

  for (const b of village.buildings) {
    const cx = (b.slotIndex + 0.5) * slotW;
    const w = slotW * b.widthFrac;
    const h = Math.max(28, maxH * b.heightFrac);
    const x = cx - w / 2;
    const y = groundY - h;
    b.x = x; b.y = y; b.w = w; b.h = h;
    b.apexX = x + b.profile.apex.x * w;
    b.apexY = y + b.profile.apex.y * h;
    b.outline = b.profile.points.map((p) => ({ x: x + p.x * w, y: y + p.y * h }));
    b.windowRects = b.windows.map((win) => ({
      x: x + win.x * w, y: y + win.y * h, w: win.w * w, h: win.h * h, flicker: win.flicker,
    }));
  }

  const spireCx = (village.spireIndex + 0.5) * slotW;
  const spireH = Math.max(40, maxH * village.spire.heightFrac);
  const spireW = slotW * village.spire.widthFrac;
  village.spire.x = spireCx - spireW / 2;
  village.spire.w = spireW;
  village.spire.h = spireH;
  village.spire.baseY = groundY;
  village.spire.tipX = spireCx;
  village.spire.tipY = groundY - spireH;
}

/** Look up which building (if any) a horizontal pixel X falls under, by
 * slot — the full height of a building's column counts as its tap target,
 * not just the roofline pixel, so the game reads as "pick the right
 * building" rather than demanding a pixel-perfect hit on a moving flicker. */
export function buildingAtX(village, W, x) {
  const slotW = W / village.slotCount;
  const slot = Math.max(0, Math.min(village.slotCount - 1, Math.floor(x / slotW)));
  if (slot === village.spireIndex) return null;
  return village.buildings.find((b) => b.slotIndex === slot) || null;
}

export function markStruck(building) {
  building.struck = true;
  building.struckMs = 0;
}
