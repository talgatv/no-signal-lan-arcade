/**
 * Authored parking-lot layout for Cart Corral.
 *
 * The values are plain data on purpose: physics and rendering both consume the
 * same hitboxes, and the browser debug hook can inspect every spawn directly.
 * Parked cars are axis-aligned (some face north/south, some east/west), which
 * keeps collision rules deterministic while still giving the lot visual variety.
 */

export const PARKING_LAYOUT = Object.freeze({
  playerStart: Object.freeze({ x: 720, y: 322 }),
  duration: 150,
  dropZone: Object.freeze({ x: 555, y: 130, w: 330, h: 154 }),
  store: Object.freeze({ x: 0, y: 0, w: 1440, h: 92 }),
  cars: Object.freeze([
    // Upper parking bank: a wide central aisle leads back to the cart return.
    { id: 'u1', x: 92, y: 338, w: 82, h: 166, color: '#ef6a72', facing: 'north' },
    { id: 'u2', x: 222, y: 338, w: 82, h: 166, color: '#55b8df', facing: 'south' },
    { id: 'u3', x: 352, y: 338, w: 82, h: 166, color: '#f0bd58', facing: 'north' },
    { id: 'u4', x: 482, y: 338, w: 82, h: 166, color: '#9b86e8', facing: 'south' },
    { id: 'u5', x: 876, y: 338, w: 82, h: 166, color: '#73c88d', facing: 'north' },
    { id: 'u6', x: 1006, y: 338, w: 82, h: 166, color: '#e88955', facing: 'south' },
    { id: 'u7', x: 1136, y: 338, w: 82, h: 166, color: '#6f91d8', facing: 'north' },
    { id: 'u8', x: 1266, y: 338, w: 82, h: 166, color: '#d76aa6', facing: 'south' },

    // Lower bank. The offset gaps make a loaded train choose its route instead
    // of simply walking one straight line through the whole level.
    { id: 'l1', x: 128, y: 722, w: 82, h: 166, color: '#e7a34e', facing: 'south' },
    { id: 'l2', x: 258, y: 722, w: 82, h: 166, color: '#62c2c8', facing: 'north' },
    { id: 'l3', x: 388, y: 722, w: 82, h: 166, color: '#d76c64', facing: 'south' },
    { id: 'l4', x: 518, y: 722, w: 82, h: 166, color: '#788edf', facing: 'north' },
    { id: 'l5', x: 840, y: 722, w: 82, h: 166, color: '#74bd68', facing: 'south' },
    { id: 'l6', x: 970, y: 722, w: 82, h: 166, color: '#b77bdc', facing: 'north' },
    { id: 'l7', x: 1100, y: 722, w: 82, h: 166, color: '#d6b34f', facing: 'south' },
    { id: 'l8', x: 1230, y: 722, w: 82, h: 166, color: '#539ed1', facing: 'north' },

    // Cars along the far curb are parked sideways. They frame two roomy turn
    // pockets where a long cart train can be swung around safely.
    { id: 'b1', x: 96, y: 1081, w: 168, h: 82, color: '#78b77b', facing: 'east' },
    { id: 'b2', x: 326, y: 1081, w: 168, h: 82, color: '#d36f87', facing: 'west' },
    { id: 'b3', x: 946, y: 1081, w: 168, h: 82, color: '#5fadd0', facing: 'east' },
    { id: 'b4', x: 1176, y: 1081, w: 168, h: 82, color: '#d79752', facing: 'west' },
  ]),
  carts: Object.freeze([
    { id: 'c1', x: 118, y: 232, angle: 0.28 },
    { id: 'c2', x: 1318, y: 236, angle: 2.86 },
    { id: 'c3', x: 638, y: 440, angle: 1.46 },
    { id: 'c4', x: 806, y: 421, angle: -1.18 },
    { id: 'c5', x: 102, y: 612, angle: 0.72 },
    { id: 'c6', x: 1332, y: 614, angle: -2.42 },
    { id: 'c7', x: 580, y: 623, angle: 2.15 },
    { id: 'c8', x: 856, y: 641, angle: -0.52 },
    { id: 'c9', x: 214, y: 982, angle: 1.92 },
    { id: 'c10', x: 1224, y: 970, angle: -1.66 },
    { id: 'c11', x: 598, y: 1124, angle: 0.14 },
    { id: 'c12', x: 846, y: 1186, angle: 3.02 },
  ]),
});

/** Return mutable layout data for a fresh run. */
export function makeParkingLayout() {
  return {
    playerStart: { ...PARKING_LAYOUT.playerStart },
    duration: PARKING_LAYOUT.duration,
    dropZone: { ...PARKING_LAYOUT.dropZone },
    store: { ...PARKING_LAYOUT.store },
    cars: PARKING_LAYOUT.cars.map((car) => ({ ...car })),
    carts: PARKING_LAYOUT.carts.map((cart) => ({ ...cart })),
  };
}
