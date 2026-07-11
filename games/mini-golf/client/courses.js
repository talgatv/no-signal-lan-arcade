/**
 * Mini Golf — course data.
 *
 * All coordinates are absolute canvas pixels in game.js's fixed 720x1000
 * design resolution (same "hand-authored design-space units" convention as
 * games/neon-drift's track.js WAYPOINTS) — there is no camera or relative-
 * unit scaling layer, so what's written here is exactly what's drawn and
 * collided against.
 *
 * Each hole:
 *   fairway   — closed polygon (clockwise), the playable green. Its edges
 *               double as the outer wall (see physics.js#fairwayWalls) —
 *               one shape drives both the rendered outline and the
 *               collision boundary, so they can never disagree.
 *   obstacles — extra internal wall segments (islands, dividers, bumper
 *               pillars — a zero-length segment + `half` is a round pillar).
 *   sand/water— zones (circle/rect unions) that DON'T block movement, just
 *               change physics (see physics.js#pointInZone / stepBall).
 *               Every zone here is authored to sit fully inside a single
 *               rectangular "leg" of its hole's fairway with margin, so it
 *               can never bleed into the surrounding rough/wall notch of a
 *               dogleg's concave corner.
 *   movingObstacles — 'rotate' (windmill) / 'slide' (gate) obstacles; see
 *               physics.js#movingWallsAt.
 *   tee/cup   — shot start / target. par — expected stroke count.
 *   dropZone  — optional; where a water penalty drops the ball instead of
 *               the default (the position the ball had before the shot).
 */

function rectPoly(x, y, w, h) {
  return [
    { x, y: y + h },
    { x: x + w, y: y + h },
    { x: x + w, y },
    { x, y },
  ];
}

export const HOLES = [
  // 1 — First Putt: a clean straight lane. No hazards — teaches the
  // drag-back-and-release control with nothing else to think about.
  {
    id: 1,
    name: { en: 'First Putt', ru: 'Первый удар', zh: '第一杆', es: 'Primer Golpe', ar: 'الضربة الأولى', fr: 'Premier Coup' },
    par: 2,
    fairway: rectPoly(260, 130, 200, 790),
    obstacles: [],
    sand: [],
    water: [],
    movingObstacles: [],
    tee: { x: 360, y: 860 },
    cup: { x: 360, y: 190 },
  },

  // 2 — Sharp Turn: a 90-degree dogleg right. Straight line-of-sight from
  // tee to cup is blocked by the inner corner, so the player must aim up
  // the lower leg and bank the turn into the upper leg.
  {
    id: 2,
    name: { en: 'Sharp Turn', ru: 'Крутой поворот', zh: '急转弯', es: 'Giro Cerrado', ar: 'منعطف حاد', fr: 'Virage Serré' },
    par: 3,
    fairway: [
      { x: 210, y: 900 }, { x: 390, y: 900 }, { x: 390, y: 380 },
      { x: 620, y: 380 }, { x: 620, y: 160 }, { x: 210, y: 160 },
    ],
    obstacles: [],
    sand: [],
    water: [],
    movingObstacles: [],
    tee: { x: 300, y: 860 },
    cup: { x: 560, y: 250 },
  },

  // 3 — Bumper Field: a wide-open green with round pillar obstacles to
  // bank shots off — the "open" layout contrast to holes 1/2's corridors.
  {
    id: 3,
    name: { en: 'Bumper Field', ru: 'Поле бамперов', zh: '弹球场', es: 'Campo de Rebotes', ar: 'حقل المصدّات', fr: 'Champ à Bosses' },
    par: 3,
    fairway: rectPoly(80, 140, 560, 760),
    obstacles: [
      { x1: 220, y1: 650, x2: 220, y2: 650, half: 26 },
      { x1: 500, y1: 650, x2: 500, y2: 650, half: 26 },
      { x1: 250, y1: 430, x2: 250, y2: 430, half: 22 },
      { x1: 470, y1: 430, x2: 470, y2: 430, half: 22 },
      { x1: 360, y1: 560, x2: 360, y2: 560, half: 20 },
    ],
    sand: [],
    water: [],
    movingObstacles: [],
    tee: { x: 360, y: 860 },
    cup: { x: 360, y: 200 },
  },

  // 4 — Sand Gauntlet: a big bunker sits dead-center on the direct line,
  // forcing a route around one side (or a slow plow straight through).
  {
    id: 4,
    name: { en: 'Sand Gauntlet', ru: 'Песчаный рубеж', zh: '沙坑关卡', es: 'Reto de Arena', ar: 'اختبار الرمال', fr: 'Défi de Sable' },
    par: 3,
    fairway: rectPoly(200, 140, 320, 760),
    obstacles: [],
    sand: [{ shape: 'circle', cx: 360, cy: 520, r: 110 }],
    water: [],
    movingObstacles: [],
    tee: { x: 360, y: 860 },
    cup: { x: 360, y: 200 },
  },

  // 5 — Water Crossing: a pond blocks the direct path; go around either
  // side, or a mis-hit that lands in the water drops at a marked zone
  // just short of the hazard (standard-golf "drop near where it entered"
  // rule) with the usual 1-stroke penalty, instead of resetting all the
  // way back to the tee.
  {
    id: 5,
    name: { en: 'Water Crossing', ru: 'Через воду', zh: '水域穿越', es: 'Cruce de Agua', ar: 'عبور المياه', fr: 'Traversée d’Eau' },
    par: 4,
    fairway: rectPoly(140, 140, 440, 800),
    obstacles: [],
    sand: [],
    water: [
      { shape: 'circle', cx: 300, cy: 560, r: 80 },
      { shape: 'circle', cx: 420, cy: 560, r: 80 },
      { shape: 'circle', cx: 360, cy: 540, r: 70 },
    ],
    movingObstacles: [],
    tee: { x: 360, y: 900 },
    cup: { x: 360, y: 200 },
    dropZone: { x: 270, y: 660 },
  },

  // 6 — Windmill: a single rotating bar sweeps the corridor's center. The
  // gaps on either side are only clear when the bar isn't near-horizontal —
  // classic mini-golf timing, not just spatial routing.
  {
    id: 6,
    name: { en: 'Windmill', ru: 'Мельница', zh: '风车', es: 'Molino', ar: 'طاحونة الهواء', fr: 'Moulin à Vent' },
    par: 3,
    fairway: rectPoly(220, 140, 280, 780),
    obstacles: [],
    sand: [],
    water: [],
    movingObstacles: [
      { kind: 'rotate', cx: 360, cy: 520, length: 80, angularSpeed: 1.6, phase: 0, blades: 2 },
    ],
    tee: { x: 360, y: 860 },
    cup: { x: 360, y: 200 },
  },

  // 7 — Switchback: a Z-shaped double dogleg (right leg up, jog left,
  // jog left again) — the mirror-and-extend of hole 2's single turn. A
  // bunker guards the approach to the first turn, punishing a rushed line
  // that doesn't leave room to make the corner.
  {
    id: 7,
    name: { en: 'Switchback', ru: 'Серпантин', zh: '之字回廊', es: 'Zigzag', ar: 'المنعطف المزدوج', fr: 'Chicane' },
    par: 4,
    fairway: [
      { x: 500, y: 940 }, { x: 680, y: 940 }, { x: 680, y: 460 },
      { x: 380, y: 460 }, { x: 380, y: 140 }, { x: 200, y: 140 },
      { x: 200, y: 680 }, { x: 500, y: 680 },
    ],
    obstacles: [],
    sand: [{ shape: 'rect', x: 520, y: 720, w: 140, h: 140 }],
    water: [],
    movingObstacles: [],
    tee: { x: 590, y: 900 },
    cup: { x: 290, y: 200 },
  },

  // 8 — Sliding Gate: a horizontal barrier slides back and forth across
  // the corridor. The right lane always has some gap; the left lane
  // fully seals at one extreme, so it's a faster but timing-dependent
  // shortcut. A pond guards the final approach to the cup.
  {
    id: 8,
    name: { en: 'Sliding Gate', ru: 'Скользящие врата', zh: '滑动闸门', es: 'Puerta Deslizante', ar: 'البوابة المنزلقة', fr: 'Porte Coulissante' },
    par: 4,
    fairway: rectPoly(180, 140, 420, 800),
    obstacles: [],
    sand: [],
    water: [{ shape: 'circle', cx: 420, cy: 280, r: 75 }],
    movingObstacles: [
      { kind: 'slide', x1: 260, y1: 560, x2: 460, y2: 560, axis: 'x', amplitude: 80, speed: 1.1, phase: 0 },
    ],
    tee: { x: 360, y: 900 },
    cup: { x: 280, y: 200 },
  },

  // 9 — Grand Finale: a big arena combining every hazard type — a pond on
  // the left, a bunker on the right, and a 4-blade windmill guarding the
  // cup dead-center. Longest hole on the course, highest par.
  {
    id: 9,
    name: { en: 'Grand Finale', ru: 'Финальный удар', zh: '终极挑战', es: 'Gran Final', ar: 'النهاية الكبرى', fr: 'Grand Final' },
    par: 5,
    fairway: rectPoly(100, 130, 520, 810),
    obstacles: [],
    sand: [{ shape: 'rect', x: 440, y: 430, w: 160, h: 220 }],
    water: [
      { shape: 'circle', cx: 200, cy: 540, r: 80 },
      { shape: 'circle', cx: 180, cy: 600, r: 55 },
    ],
    movingObstacles: [
      { kind: 'rotate', cx: 360, cy: 540, length: 95, angularSpeed: 1.3, phase: 0.6, blades: 4 },
    ],
    tee: { x: 360, y: 880 },
    cup: { x: 360, y: 200 },
  },
];

export const TOTAL_PAR = HOLES.reduce((sum, h) => sum + h.par, 0);
