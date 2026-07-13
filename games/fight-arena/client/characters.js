/**
 * characters.js — the Fight Arena roster: pure data, no DOM, no canvas.
 *
 * Three deliberately different archetypes so picking a fighter is a real
 * decision, not a costume swap:
 *   - Volt    : balanced ZONER — average everything, one PROJECTILE special
 *               (Arc Bolt) that travels the stage as its own entity.
 *   - Boulder : heavy BRUISER — most HP and biggest damage, but slow walk /
 *               low jump / slow startups; his special is a rising UPPERCUT
 *               (Rising Ram) gap-closer/anti-air.
 *   - Sable   : fragile SPEEDSTER — least HP and lowest per-hit damage, but
 *               fastest walk, highest jump and fastest attacks; her special
 *               is a forward RUSH (Slip Strike) melee gap-closer.
 *
 * All distances are in canvas-pixel world units (see combat.js STAGE), all
 * durations in fixed 60 Hz frames. combat.js reads these directly.
 *
 * Attack shape (normals lp/hp/lk/hk and each special):
 *   startup   frames before the hitbox turns on (the windup — genuinely not
 *             instant; the attack cannot hit during these frames)
 *   active    frames the hitbox is live (the only frames a hit can register)
 *   recovery  frames after the hitbox turns off, still committed / vulnerable
 *   damage    HP removed on a clean (unblocked) hit
 *   ox        forward offset of the hitbox CENTER from the fighter's center,
 *             in facing space (flipped by facing sign in combat.js)
 *   oy        height of the hitbox center ABOVE the fighter's feet
 *   w, h      hitbox size
 *   knock     horizontal knockback speed applied to the victim (px/s)
 *   hitstun   frames the victim is stunned on a clean hit
 *   blockstun frames the victim is stuck in block on a blocked hit
 *   cancel    true = if this attack LANDS, its recovery can be canceled into
 *             another attack (the simple combo system; only light normals)
 *   height    'mid' | 'low' | 'high' — 'high' attacks aim at head level and
 *             MISS a crouching hurtbox (that is why crouch dodges them); this
 *             is enforced purely by hitbox-vs-hurtbox overlap, not a flag.
 */

// Per-character neon body colors (hardcoded strings — canvas needs concrete
// colors, same convention as games/billiards' and games/comet's draw code).
export const CHARACTER_IDS = ['volt', 'boulder', 'sable'];

export const CHARACTERS = {
  volt: {
    id: 'volt',
    nameKey: 'char_volt_name',
    tagKey: 'char_volt_tag',
    specialKey: 'char_volt_special',
    color: '#5ce1ff',
    colorDim: '#2b7d99',
    glow: 'rgba(92, 225, 255, 0.65)',
    accent: '#c8f6ff',
    maxHp: 100,
    walkSpeed: 210,
    backSpeedMul: 0.72,
    jumpVel: 760,
    airAccel: 900,
    dashSpeed: 560,
    dashFrames: 11,
    weight: 1,
    // Meter-free: specials gated by a per-move cooldown (frames).
    stats: { power: 3, speed: 3, health: 3 }, // 1..5 for the select-screen bars
    attacks: {
      lp: { startup: 4, active: 3, recovery: 8, damage: 6, ox: 60, oy: 116, w: 46, h: 26, knock: 130, hitstun: 14, blockstun: 9, cancel: true, height: 'mid', kind: 'punch' },
      hp: { startup: 9, active: 4, recovery: 18, damage: 13, ox: 70, oy: 150, w: 56, h: 32, knock: 280, hitstun: 20, blockstun: 14, cancel: false, height: 'high', kind: 'punch' },
      lk: { startup: 5, active: 4, recovery: 10, damage: 7, ox: 64, oy: 60, w: 54, h: 30, knock: 150, hitstun: 15, blockstun: 10, cancel: true, height: 'low', kind: 'kick' },
      hk: { startup: 11, active: 5, recovery: 20, damage: 15, ox: 86, oy: 82, w: 66, h: 34, knock: 340, hitstun: 22, blockstun: 15, cancel: false, height: 'mid', kind: 'kick' },
    },
    special: {
      type: 'projectile',
      startup: 10,
      active: 2,
      recovery: 22,
      cooldown: 66,
      damage: 12,
      knock: 240,
      hitstun: 18,
      blockstun: 12,
      // projectile entity
      projSpeed: 520,
      projW: 34,
      projH: 26,
      projOy: 118, // launch height above feet
      projLife: 150, // frames before it fizzles
    },
  },

  boulder: {
    id: 'boulder',
    nameKey: 'char_boulder_name',
    tagKey: 'char_boulder_tag',
    specialKey: 'char_boulder_special',
    color: '#ffb03a',
    colorDim: '#8a5f1c',
    glow: 'rgba(255, 176, 58, 0.6)',
    accent: '#ffe0a8',
    maxHp: 132,
    walkSpeed: 150,
    backSpeedMul: 0.7,
    jumpVel: 650,
    airAccel: 620,
    dashSpeed: 430,
    dashFrames: 12,
    weight: 1.35,
    stats: { power: 5, speed: 1, health: 5 },
    attacks: {
      lp: { startup: 6, active: 3, recovery: 12, damage: 9, ox: 62, oy: 120, w: 50, h: 30, knock: 170, hitstun: 15, blockstun: 11, cancel: true, height: 'mid', kind: 'punch' },
      hp: { startup: 12, active: 5, recovery: 24, damage: 20, ox: 80, oy: 152, w: 64, h: 40, knock: 380, hitstun: 24, blockstun: 18, cancel: false, height: 'high', kind: 'punch' },
      lk: { startup: 7, active: 4, recovery: 14, damage: 10, ox: 66, oy: 58, w: 58, h: 32, knock: 190, hitstun: 16, blockstun: 12, cancel: true, height: 'low', kind: 'kick' },
      hk: { startup: 14, active: 6, recovery: 26, damage: 22, ox: 92, oy: 78, w: 76, h: 38, knock: 440, hitstun: 26, blockstun: 20, cancel: false, height: 'mid', kind: 'kick' },
    },
    special: {
      type: 'uppercut',
      startup: 6,
      active: 9,
      recovery: 24,
      cooldown: 96,
      damage: 22,
      knock: 260,
      knockUp: 620, // extra upward launch on the victim
      hitstun: 28,
      blockstun: 18,
      // self launch at move start (gap-closer / anti-air arc)
      launchVy: 900,
      launchVx: 210,
      // hitbox rides with the rising body (fist held high)
      ox: 42,
      oy: 176,
      w: 58,
      h: 78,
    },
  },

  sable: {
    id: 'sable',
    nameKey: 'char_sable_name',
    tagKey: 'char_sable_tag',
    specialKey: 'char_sable_special',
    color: '#ff6bcb',
    colorDim: '#993e79',
    glow: 'rgba(255, 107, 203, 0.6)',
    accent: '#ffd0ee',
    maxHp: 82,
    walkSpeed: 300,
    backSpeedMul: 0.78,
    jumpVel: 830,
    airAccel: 1050,
    dashSpeed: 700,
    dashFrames: 10,
    weight: 0.82,
    stats: { power: 2, speed: 5, health: 2 },
    attacks: {
      lp: { startup: 3, active: 3, recovery: 6, damage: 5, ox: 56, oy: 116, w: 44, h: 24, knock: 110, hitstun: 13, blockstun: 8, cancel: true, height: 'mid', kind: 'punch' },
      hp: { startup: 7, active: 3, recovery: 14, damage: 10, ox: 66, oy: 150, w: 54, h: 30, knock: 220, hitstun: 18, blockstun: 13, cancel: false, height: 'high', kind: 'punch' },
      lk: { startup: 4, active: 3, recovery: 8, damage: 6, ox: 62, oy: 56, w: 52, h: 30, knock: 130, hitstun: 14, blockstun: 9, cancel: true, height: 'low', kind: 'kick' },
      hk: { startup: 9, active: 4, recovery: 16, damage: 12, ox: 82, oy: 84, w: 64, h: 32, knock: 300, hitstun: 20, blockstun: 14, cancel: false, height: 'mid', kind: 'kick' },
    },
    special: {
      type: 'rush',
      startup: 4,
      active: 7,
      recovery: 16,
      cooldown: 78,
      damage: 13,
      knock: 250,
      hitstun: 20,
      blockstun: 13,
      // forward dash velocity held through the active window (gap-closer)
      rushSpeed: 640,
      ox: 60,
      oy: 96,
      w: 62,
      h: 80,
    },
  },
};

export function getCharacter(id) {
  return CHARACTERS[id] || CHARACTERS.volt;
}
