/**
 * ai.js — the vs-Computer opponent. Pure: given the live match state and which
 * fighter it controls, it returns the same flat input object a human keyboard
 * produces ({left,right,up,down,lp,hp,lk,hk,special}), so combat.js can't tell
 * the difference and the AI is exercised through the exact same code path.
 *
 * It genuinely acts: it walks toward/away to manage spacing, throws out light
 * and heavy attacks in range, reacts to the opponent's swings and incoming
 * projectiles by guarding or hopping, and mixes in its character's special.
 * It is deliberately beatable — reactions are gated behind chance rolls and it
 * leaves gaps between attacks, so it presses and behaves like a person, not a
 * frame-perfect wall.
 *
 * Buttons that fire on a rising edge (attacks/jump/special) are held for a
 * couple of frames and then force-released for a few (ai.gap) so the NEXT press
 * is a real edge — otherwise a permanently-held key only ever triggers once.
 */

const NEUTRAL = () => ({
  left: false, right: false, up: false, down: false,
  lp: false, hp: false, lk: false, hk: false, special: false,
});

const DIFF = {
  easy: { react: 0.32, aggression: 0.045, blockChance: 0.35, spacing: 100 },
  normal: { react: 0.5, aggression: 0.08, blockChance: 0.52, spacing: 92 },
  hard: { react: 0.72, aggression: 0.12, blockChance: 0.72, spacing: 88 },
};

export function createAi(difficulty = 'normal') {
  return {
    cfg: DIFF[difficulty] || DIFF.normal,
    atkKey: null,
    atkT: 0,   // frames left holding an attack/special button
    gap: 0,    // forced release frames after an attack (so next press edges)
  };
}

const chance = (p) => Math.random() < p;

function pickAttack(ai, dist) {
  // Lights up close (fast, comboable), heavies at the edge of reach.
  if (dist > 100) ai.atkKey = chance(0.5) ? 'hk' : 'hp';
  else if (chance(0.62)) ai.atkKey = chance(0.5) ? 'lp' : 'lk';
  else ai.atkKey = chance(0.5) ? 'hp' : 'hk';
}

export function aiInput(ai, match, selfIndex) {
  const out = NEUTRAL();
  const self = match.fighters[selfIndex];
  const opp = match.fighters[1 - selfIndex];

  if (match.phase !== 'fight' || self.state === 'ko' || self.state === 'win') {
    ai.atkT = 0; ai.gap = 0;
    return out;
  }
  // Committed to an attack or stunned: wait it out (release everything).
  if (self.stun > 0 || self.attack) { ai.atkT = 0; return out; }

  // Forced release window so the next attack press is a genuine rising edge.
  if (ai.gap > 0) { ai.gap--; return out; }

  // Finish holding a queued attack/special.
  if (ai.atkT > 0) {
    out[ai.atkKey] = true;
    ai.atkT--;
    if (ai.atkT <= 0) ai.gap = 5;
    return out;
  }

  const cfg = ai.cfg;
  const dx = opp.x - self.x;
  const dist = Math.abs(dx);
  const toward = dx >= 0 ? 'right' : 'left';
  const away = toward === 'right' ? 'left' : 'right';

  // --- Reactive guard against a close swing (reads startup; gated by chance) ---
  const oppSwinging = opp.attack
    && opp.attack.t <= (opp.attack.def.startup + opp.attack.def.active);
  if (oppSwinging && dist < 145 && chance(cfg.blockChance)) {
    out[away] = true;
    if (opp.attack.def.height === 'low' || chance(0.25)) out.down = true;
    return out;
  }

  // --- Incoming projectile: hop over it or guard ---
  for (const p of match.projectiles) {
    if (p.owner === selfIndex) continue;
    const approaching = (p.x < self.x && p.vx > 0) || (p.x > self.x && p.vx < 0);
    if (approaching && Math.abs(p.x - self.x) < 360) {
      if (chance(0.45)) { out.up = true; if (chance(0.6)) out[toward] = true; }
      else out[away] = true;
      return out;
    }
  }

  // --- Use our own special ---
  const special = self.char.special;
  if (self.cd <= 0) {
    if (special.type === 'projectile' && dist > 240 && chance(0.05)) {
      ai.atkKey = 'special'; ai.atkT = 2; out.special = true; return out;
    }
    if (special.type !== 'projectile' && dist < cfg.spacing + 80 && dist > cfg.spacing - 30 && chance(0.05)) {
      ai.atkKey = 'special'; ai.atkT = 2; out.special = true; return out;
    }
  }

  const spacing = cfg.spacing;

  if (dist > spacing + 34) {
    out[toward] = true;                 // approach
    if (chance(0.012)) out.up = true;   // occasional hop-in
    return out;
  }

  if (dist < spacing - 42) {
    // Too close — attack, or make space.
    if (chance(cfg.aggression * 4)) { pickAttack(ai, dist); ai.atkT = 2; out[ai.atkKey] = true; return out; }
    out[away] = true;
    if (chance(0.15)) out.up = true;
    return out;
  }

  // In strike range: attack fairly often, otherwise shuffle for spacing.
  if (chance(cfg.aggression * 5)) { pickAttack(ai, dist); ai.atkT = 2; out[ai.atkKey] = true; return out; }
  if (chance(0.4)) out[toward] = true;
  else if (chance(0.4)) out[away] = true;
  return out;
}
