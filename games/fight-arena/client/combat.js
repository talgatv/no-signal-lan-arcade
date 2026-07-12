/**
 * combat.js — Fight Arena simulation core. Pure: no DOM, no canvas, no audio.
 * Everything is plain numbers in a fixed canvas-pixel world space, advanced in
 * fixed 60 Hz steps, so the whole fight can be driven and inspected directly
 * from a test harness (see window.OGH_FIGHT_ARENA in game.js) instead of only
 * being observable through the rendered scene — same pure-sim split as
 * games/billiards' physics.js and games/mini-golf's physics.js.
 *
 * THE CORE MECHANIC — hitboxes vs hurtboxes (not center distance):
 *   - Every fighter has a HURTBOX: an axis-aligned rectangle around its body
 *     (`hurtbox(f)`). Crouching literally removes the top of that rectangle
 *     (CROUCH_H < STAND_H), which is exactly why crouching ducks 'high'
 *     attacks — the attack's hitbox simply fails to overlap the shortened box.
 *   - An attack has real STARTUP -> ACTIVE -> RECOVERY frames. Its HITBOX only
 *     exists during the ACTIVE frames (`activeHitbox(f)` returns null
 *     otherwise), positioned forward of the fighter by the move's reach.
 *   - A hit registers ONLY when that active hitbox rectangle overlaps the
 *     opponent's hurtbox rectangle (`rectsOverlap`). A whiff at range genuinely
 *     does not connect; a punch cannot hit behind or above its reach.
 *
 * Rounds: best-of-3 (first to ROUNDS_TO_WIN round wins takes the match), with
 * an intro ("Round N / Fight!"), a KO/time-out round-end, and a match-end.
 */

import { getCharacter } from './characters.js';

/* ------------------------------------------------------------------------ *
 * World / tuning constants (canvas-pixel units, 60 Hz frames).
 * ------------------------------------------------------------------------ */
export const STAGE = { W: 960, H: 540, floorY: 470, wallPad: 54 };
export const FIXED_DT = 1 / 60;
export const ROUND_SECONDS = 75;
export const ROUNDS_TO_WIN = 2;

export const BODY_W = 60;
export const STAND_H = 152;
export const CROUCH_H = 94;

const GRAVITY = 2000;
const INTRO_FRAMES = 100;     // "Round N" then "Fight!"
const ROUNDEND_FRAMES = 140;  // KO pose / round banner before next round
const HITSTOP_HIT = 6;        // impact freeze frames on a clean hit
const HITSTOP_BLOCK = 3;
const DASH_TAP_WINDOW = 12;   // max frames between the two taps of a dash
const DASH_COOLDOWN = 24;
const FRICTION = 0.80;        // per-frame ground velocity decay when not driving

const P1_START_X = 340;
const P2_START_X = 620;

const EMPTY_INPUT = {
  left: false, right: false, up: false, down: false,
  lp: false, hp: false, lk: false, hk: false, special: false,
};

const INPUT_KEYS = ['left', 'right', 'up', 'down', 'lp', 'hp', 'lk', 'hk', 'special'];

function pickInput(src) {
  const o = {};
  const s = src || EMPTY_INPUT;
  for (const k of INPUT_KEYS) o[k] = !!s[k];
  return o;
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/* ------------------------------------------------------------------------ *
 * Fighter creation / placement
 * ------------------------------------------------------------------------ */
function makeFighter(player, charId) {
  const char = getCharacter(charId);
  const f = { player, charId, char, maxHp: char.maxHp };
  placeFighter(f, player);
  return f;
}

function placeFighter(f, player) {
  f.x = player === 0 ? P1_START_X : P2_START_X;
  f.y = STAGE.floorY;
  f.vx = 0;
  f.vy = 0;
  f.facing = player === 0 ? 1 : -1;
  f.onGround = true;
  f.crouching = false;
  f.blocking = false;
  f.moving = false;
  f.hp = f.maxHp;
  f.state = 'intro';        // intro | idle | walk | jump | crouch | block | attack | hitstun | ko | win
  f.stunType = null;        // 'hit' | 'block' while stunned
  f.attack = null;          // { key, def, t, hasHit, isSpecial }
  f.stun = 0;
  f.cd = 0;                 // special cooldown
  f.dash = 0;
  f.dashDir = 0;
  f.dashCd = 0;
  f.lastTap = { dir: 0, frame: -999 };
  f.hitFlash = 0;
  f.anim = 0;
}

/* ------------------------------------------------------------------------ *
 * Boxes — the whole point. Both are world-space AABBs.
 * ------------------------------------------------------------------------ */
export function hurtbox(f) {
  const h = f.crouching ? CROUCH_H : STAND_H;
  return { x: f.x - BODY_W / 2, y: f.y - h, w: BODY_W, h };
}

/** Active melee hitbox for a fighter's current attack, or null if there is no
 *  attack or it is not in its ACTIVE frames (startup/recovery hit nothing). */
export function activeHitbox(f) {
  const a = f.attack;
  if (!a) return null;
  if (a.isSpecial && a.def.type === 'projectile') return null; // the bolt is its own entity
  const { startup, active } = a.def;
  if (a.t <= startup || a.t > startup + active) return null;
  const def = a.def;
  const cx = f.x + f.facing * def.ox;
  const cy = f.y - def.oy;
  return { x: cx - def.w / 2, y: cy - def.h / 2, w: def.w, h: def.h, def };
}

/* ------------------------------------------------------------------------ *
 * Match lifecycle
 * ------------------------------------------------------------------------ */
export function createMatch(mode, charIds) {
  const match = {
    mode: mode === 'ai' ? 'ai' : 'local',
    fighters: [makeFighter(0, charIds[0]), makeFighter(1, charIds[1])],
    projectiles: [],
    sparks: [],
    round: 1,
    wins: [0, 0],
    phase: 'intro',           // intro | fight | roundEnd | matchEnd
    phaseTimer: INTRO_FRAMES,
    roundClock: ROUND_SECONDS,
    roundWinner: null,
    roundDraw: false,
    timeOut: false,
    matchWinner: null,
    frame: 0,
    hitStop: 0,
    fightCued: false,
    prev: [pickInput(), pickInput()],
  };
  return match;
}

function resetRound(match) {
  placeFighter(match.fighters[0], 0);
  placeFighter(match.fighters[1], 1);
  match.projectiles = [];
  match.sparks = [];
  match.phase = 'intro';
  match.phaseTimer = INTRO_FRAMES;
  match.roundClock = ROUND_SECONDS;
  match.roundWinner = null;
  match.roundDraw = false;
  match.timeOut = false;
  match.hitStop = 0;
  match.fightCued = false;
}

/* ------------------------------------------------------------------------ *
 * Top-level step (one fixed 60 Hz tick).
 * rawInputs: [inputP1, inputP2], each a flat {left,right,up,down,lp,hp,lk,hk,special}.
 * Returns an array of events for game.js to turn into sfx / screen shakes.
 * ------------------------------------------------------------------------ */
export function stepMatch(match, rawInputs) {
  match.frame++;
  const events = [];

  // Impact freeze: hold both fighters + projectiles still for a few frames so
  // hits read as weighty (a genre staple). Sparks keep animating.
  if (match.hitStop > 0) {
    match.hitStop--;
    stepSparks(match);
    match.prev = [pickInput(rawInputs && rawInputs[0]), pickInput(rawInputs && rawInputs[1])];
    return events;
  }

  if (match.phase === 'intro') stepIntro(match, events);
  else if (match.phase === 'fight') stepFight(match, rawInputs, events);
  else if (match.phase === 'roundEnd') stepRoundEnd(match, events);
  // matchEnd: static until game.js starts a new match

  stepSparks(match);
  match.prev = [pickInput(rawInputs && rawInputs[0]), pickInput(rawInputs && rawInputs[1])];
  return events;
}

function stepIntro(match, events) {
  match.phaseTimer--;
  if (!match.fightCued && match.phaseTimer <= Math.floor(INTRO_FRAMES * 0.42)) {
    match.fightCued = true;
    events.push({ type: 'fightCue' });
  }
  if (match.phaseTimer <= 0) {
    match.phase = 'fight';
    for (const f of match.fighters) if (f.state === 'intro') f.state = 'idle';
  }
}

function stepRoundEnd(match, events) {
  match.phaseTimer--;
  for (const f of match.fighters) physics(f); // let bodies settle / KO'd fighter fall
  if (match.phaseTimer <= 0) {
    if (match.wins[0] >= ROUNDS_TO_WIN || match.wins[1] >= ROUNDS_TO_WIN) {
      match.phase = 'matchEnd';
      match.matchWinner = match.wins[0] >= ROUNDS_TO_WIN ? 0 : 1;
      events.push({ type: 'matchEnd', winner: match.matchWinner });
    } else {
      match.round++;
      resetRound(match);
      events.push({ type: 'roundStart', round: match.round });
    }
  }
}

function stepFight(match, rawInputs, events) {
  const [f0, f1] = match.fighters;
  const in0 = deriveInput(match, 0, rawInputs && rawInputs[0]);
  const in1 = deriveInput(match, 1, rawInputs && rawInputs[1]);

  updateFacing(f0, f1);
  updateFacing(f1, f0);

  stepFighter(match, f0, f1, in0, events);
  stepFighter(match, f1, f0, in1, events);

  // Melee hit resolution — both directions (a double-hit trade is possible).
  resolveHit(match, f0, f1, events);
  resolveHit(match, f1, f0, events);

  stepProjectiles(match, events);

  separate(f0, f1);
  clampWall(f0);
  clampWall(f1);

  match.roundClock = Math.max(0, match.roundClock - FIXED_DT);
  checkRoundOver(match, events);
}

/* ------------------------------------------------------------------------ *
 * Input edge derivation
 * ------------------------------------------------------------------------ */
function deriveInput(match, i, cur) {
  const c = cur || EMPTY_INPUT;
  const p = match.prev[i] || EMPTY_INPUT;
  const edge = (k) => !!c[k] && !p[k];
  return {
    left: !!c.left, right: !!c.right, up: !!c.up, down: !!c.down,
    lp: !!c.lp, hp: !!c.hp, lk: !!c.lk, hk: !!c.hk, special: !!c.special,
    e_up: edge('up'), e_lp: edge('lp'), e_hp: edge('hp'),
    e_lk: edge('lk'), e_hk: edge('hk'), e_special: edge('special'),
    e_left: edge('left'), e_right: edge('right'),
  };
}

function updateFacing(f, opp) {
  if (f.attack || f.stun > 0 || f.state === 'ko' || f.state === 'win') return;
  if (opp.x > f.x + 1) f.facing = 1;
  else if (opp.x < f.x - 1) f.facing = -1;
}

/* ------------------------------------------------------------------------ *
 * Per-fighter step
 * ------------------------------------------------------------------------ */
function stepFighter(match, f, opp, inp, events) {
  f.anim++;
  f.moving = false;
  if (f.cd > 0) f.cd--;
  if (f.dashCd > 0) f.dashCd--;
  if (f.hitFlash > 0) f.hitFlash--;

  if (f.state === 'ko' || f.state === 'win') { physics(f); return; }

  if (f.stun > 0) {
    f.stun--;
    if (f.stun <= 0) { f.state = 'idle'; f.stunType = null; f.blocking = false; }
    physics(f);
    return;
  }

  if (f.attack) {
    advanceAttack(match, f, opp, inp, events);
    physics(f);
    return;
  }

  // ---- actionable ----
  handleDashTaps(match, f, inp, events);

  if (tryStartAttack(match, f, opp, inp, events)) { physics(f); return; }

  handleMovement(f, inp);
  physics(f);
}

function handleDashTaps(match, f, inp, events) {
  const tapDir = inp.e_left ? -1 : inp.e_right ? 1 : 0;
  if (tapDir === 0) return;
  if (f.lastTap.dir === tapDir && (match.frame - f.lastTap.frame) <= DASH_TAP_WINDOW
      && f.dashCd <= 0 && f.onGround) {
    f.dash = f.char.dashFrames;
    f.dashDir = tapDir;
    f.dashCd = DASH_COOLDOWN;
    f.lastTap = { dir: 0, frame: -999 };
    events.push({ type: 'dash', player: f.player });
  } else {
    f.lastTap = { dir: tapDir, frame: match.frame };
  }
}

function tryStartAttack(match, f, opp, inp, events) {
  if (inp.e_special && f.cd <= 0) { startSpecial(match, f, events); return true; }
  if (inp.e_hp) { startNormal(f, 'hp', events); return true; }
  if (inp.e_hk) { startNormal(f, 'hk', events); return true; }
  if (inp.e_lp) { startNormal(f, 'lp', events); return true; }
  if (inp.e_lk) { startNormal(f, 'lk', events); return true; }
  return false;
}

function startNormal(f, key, events) {
  const def = f.char.attacks[key];
  f.attack = { key, def, t: 0, hasHit: false, isSpecial: false };
  f.state = 'attack';
  f.blocking = false;
  f.crouching = false;
  if (f.onGround) f.vx = 0; // plant for a grounded swing; keep momentum in the air
  events.push({ type: 'startAttack', player: f.player, key });
}

function startSpecial(match, f, events) {
  const sp = f.char.special;
  f.attack = { key: 'special', def: sp, t: 0, hasHit: false, isSpecial: true };
  f.state = 'attack';
  f.blocking = false;
  f.crouching = false;
  f.cd = sp.cooldown;
  if (f.onGround) f.vx = 0;
  events.push({ type: 'special', kind: sp.type, player: f.player });
}

function advanceAttack(match, f, opp, inp, events) {
  const a = f.attack;
  a.t++;
  const { startup, active, recovery } = a.def;
  const total = startup + active + recovery;

  if (a.t === startup + 1) {
    // hitbox turns on this frame
    events.push({ type: 'swing', player: f.player, key: a.key, kind: a.def.kind || a.def.type });
    if (a.isSpecial) {
      if (a.def.type === 'projectile') { spawnProjectile(match, f); events.push({ type: 'fire', kind: 'projectile', player: f.player }); }
      else if (a.def.type === 'uppercut') { f.vy = -a.def.launchVy; f.vx = f.facing * a.def.launchVx; f.onGround = false; }
    }
  }

  // Rush special: hold forward velocity through the active window (gap-closer).
  if (a.isSpecial && a.def.type === 'rush' && a.t > startup && a.t <= startup + active) {
    f.vx = f.facing * a.def.rushSpeed;
    f.moving = true;
  }

  // Combo cancel: a cancelable light normal that already LANDED can cancel its
  // recovery into another attack (simple chains, e.g. LP -> LP -> LK -> special).
  if (a.def.cancel && a.hasHit && a.t > startup + active) {
    if (inp.e_hp || inp.e_hk || inp.e_lp || inp.e_lk) { tryStartAttack(match, f, opp, inp, events); return; }
    if (inp.e_special && f.cd <= 0) { startSpecial(match, f, events); return; }
  }

  if (a.t > total) { f.attack = null; f.state = 'idle'; }
}

function handleMovement(f, inp) {
  // Jump
  if (inp.e_up && f.onGround) {
    f.vy = -f.char.jumpVel;
    f.onGround = false;
    f.state = 'jump';
    if (inp.left && !inp.right) f.vx = -f.char.walkSpeed * 0.9;
    else if (inp.right && !inp.left) f.vx = f.char.walkSpeed * 0.9;
    return;
  }

  // Airborne: drift only
  if (!f.onGround) {
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (dir !== 0) {
      f.vx += dir * f.char.airAccel * FIXED_DT;
      const cap = f.char.walkSpeed * 1.05;
      f.vx = clamp(f.vx, -cap, cap);
    }
    f.state = 'jump';
    return;
  }

  // Grounded stance. facing points at the opponent, so:
  const holdingToward = (f.facing === 1 && inp.right) || (f.facing === -1 && inp.left);
  const holdingAway = (f.facing === 1 && inp.left) || (f.facing === -1 && inp.right);

  f.blocking = false;
  f.crouching = false;

  if (holdingAway) {
    // Back = guard stance + slow retreat. Block only actually matters when a
    // hit connects (see applyDamage); here it just sets the stance + walk-back.
    f.blocking = true;
    f.crouching = inp.down;           // holding down+back = low block
    f.vx = -f.facing * f.char.walkSpeed * f.char.backSpeedMul;
    f.moving = true;
    f.state = 'block';
    return;
  }

  if (inp.down) {
    f.crouching = true;
    f.state = 'crouch';
    return;
  }

  if (holdingToward) {
    f.vx = f.facing * f.char.walkSpeed;
    f.moving = true;
    f.state = 'walk';
    return;
  }

  f.state = 'idle';
}

function physics(f) {
  const dt = FIXED_DT;

  if (f.dash > 0) { f.vx = f.dashDir * f.char.dashSpeed; f.dash--; f.moving = true; }

  if (!f.onGround) f.vy += GRAVITY * dt;

  f.x += f.vx * dt;
  f.y += f.vy * dt;

  if (f.y >= STAGE.floorY) {
    if (!f.onGround && f.state === 'jump') f.state = 'idle';
    f.y = STAGE.floorY;
    f.vy = 0;
    f.onGround = true;
  } else {
    f.onGround = false;
  }

  if (f.onGround && !f.attack && !f.moving) {
    f.vx *= FRICTION;
    if (Math.abs(f.vx) < 4) f.vx = 0;
  }
}

/* ------------------------------------------------------------------------ *
 * Hit resolution + damage
 * ------------------------------------------------------------------------ */
function resolveHit(match, attacker, victim, events) {
  const a = attacker.attack;
  if (!a || a.hasHit) return;
  if (victim.state === 'ko') return;
  const hb = activeHitbox(attacker);
  if (!hb) return;
  const vb = hurtbox(victim);
  if (!rectsOverlap(hb, vb)) return; // <-- the real overlap test: no overlap, no hit
  a.hasHit = true;
  const px = clamp((Math.max(hb.x, vb.x) + Math.min(hb.x + hb.w, vb.x + vb.w)) / 2, vb.x, vb.x + vb.w);
  const py = hb.y + hb.h / 2;
  applyDamage(match, victim, hb.def, attacker.facing, events, px, py);
}

function applyDamage(match, victim, def, dir, events, px, py) {
  if (victim.state === 'ko') return;

  // A grounded blocker in the right stance negates most damage. Stance height
  // matters: a standing block stops highs+mids but not lows; a crouch (low)
  // block stops lows+mids but not overhead 'high' attacks.
  let blocked = false;
  if (victim.blocking && victim.onGround) {
    blocked = victim.crouching ? (def.height !== 'high') : (def.height !== 'low');
  }

  if (blocked) {
    const chip = Math.max(1, Math.round(def.damage * 0.12));
    victim.hp = Math.max(0, victim.hp - chip);
    victim.stun = def.blockstun;
    victim.stunType = 'block';
    victim.state = 'block';
    victim.blocking = true;
    victim.attack = null;
    victim.vx = dir * def.knock * 0.35;
    match.hitStop = HITSTOP_BLOCK;
    match.sparks.push(makeSpark(px, py, 'block'));
    events.push({ type: 'block', victim: victim.player, x: px, y: py });
  } else {
    victim.hp = Math.max(0, victim.hp - def.damage);
    victim.stun = def.hitstun;
    victim.stunType = 'hit';
    victim.state = 'hitstun';
    victim.attack = null;
    victim.blocking = false;
    victim.crouching = false;
    victim.hitFlash = 6;
    victim.vx = dir * def.knock;
    if (def.knockUp) { victim.vy = -def.knockUp; victim.onGround = false; }
    match.hitStop = HITSTOP_HIT;
    match.sparks.push(makeSpark(px, py, 'hit'));
    events.push({ type: 'hit', victim: victim.player, dmg: def.damage, x: px, y: py });
  }
}

/* ------------------------------------------------------------------------ *
 * Projectiles (Volt's Arc Bolt) — genuine travelling entities.
 * ------------------------------------------------------------------------ */
function spawnProjectile(match, f) {
  const sp = f.char.special;
  match.projectiles.push({
    owner: f.player,
    x: f.x + f.facing * (BODY_W / 2 + 12),
    y: f.y - sp.projOy,
    vx: f.facing * sp.projSpeed,
    dir: f.facing,
    w: sp.projW,
    h: sp.projH,
    damage: sp.damage,
    knock: sp.knock,
    hitstun: sp.hitstun,
    blockstun: sp.blockstun,
    life: sp.projLife,
    color: f.char.color,
    glow: f.char.glow,
    trail: [],
    dead: false,
  });
}

function stepProjectiles(match, events) {
  for (const p of match.projectiles) {
    p.trail.unshift({ x: p.x, y: p.y });
    if (p.trail.length > 7) p.trail.pop();
    p.x += p.vx * FIXED_DT;
    p.life--;
    const victim = match.fighters[1 - p.owner];
    if (!p.dead && victim.state !== 'ko') {
      const pb = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
      if (rectsOverlap(pb, hurtbox(victim))) {
        applyDamage(match, victim, { damage: p.damage, knock: p.knock, hitstun: p.hitstun, blockstun: p.blockstun, height: 'mid' }, p.dir, events, p.x, p.y);
        p.dead = true;
      }
    }
    if (p.x < STAGE.wallPad - 40 || p.x > STAGE.W - STAGE.wallPad + 40 || p.life <= 0) p.dead = true;
  }
  match.projectiles = match.projectiles.filter((p) => !p.dead);
}

/* ------------------------------------------------------------------------ *
 * Body separation + walls
 * ------------------------------------------------------------------------ */
function separate(a, b) {
  const ha = hurtbox(a);
  const hb = hurtbox(b);
  const overlapX = Math.min(a.x + BODY_W / 2, b.x + BODY_W / 2) - Math.max(a.x - BODY_W / 2, b.x - BODY_W / 2);
  const overlapY = Math.min(ha.y + ha.h, hb.y + hb.h) - Math.max(ha.y, hb.y);
  if (overlapX > 0 && overlapY > 0) {
    const push = overlapX / 2 + 0.5;
    const dir = a.x <= b.x ? -1 : 1;
    a.x += dir * push;
    b.x -= dir * push;
  }
}

function clampWall(f) {
  const lo = STAGE.wallPad + BODY_W / 2;
  const hi = STAGE.W - STAGE.wallPad - BODY_W / 2;
  if (f.x < lo) { f.x = lo; if (f.vx < 0) f.vx = 0; }
  if (f.x > hi) { f.x = hi; if (f.vx > 0) f.vx = 0; }
}

/* ------------------------------------------------------------------------ *
 * Sparks (visual only; owned here so a headless sim still produces them)
 * ------------------------------------------------------------------------ */
function makeSpark(x, y, kind) {
  return { x, y, life: kind === 'hit' ? 16 : 12, max: kind === 'hit' ? 16 : 12, kind };
}

function stepSparks(match) {
  for (const s of match.sparks) s.life--;
  match.sparks = match.sparks.filter((s) => s.life > 0);
}

/* ------------------------------------------------------------------------ *
 * Round / match resolution
 * ------------------------------------------------------------------------ */
function checkRoundOver(match, events) {
  if (match.phase !== 'fight') return;
  const [f0, f1] = match.fighters;
  const ko0 = f0.hp <= 0;
  const ko1 = f1.hp <= 0;
  let winner = null;
  let draw = false;

  if (ko0 && ko1) draw = true;
  else if (ko1) winner = 0;
  else if (ko0) winner = 1;
  else if (match.roundClock <= 0) {
    match.timeOut = true;
    if (f0.hp > f1.hp) winner = 0;
    else if (f1.hp > f0.hp) winner = 1;
    else draw = true;
  }

  if (winner === null && !draw) return;

  match.phase = 'roundEnd';
  match.phaseTimer = ROUNDEND_FRAMES;
  match.roundWinner = winner;
  match.roundDraw = draw;
  for (const f of match.fighters) f.attack = null;
  match.projectiles = [];

  if (draw) {
    f0.state = 'ko';
    f1.state = 'ko';
  } else {
    const wf = match.fighters[winner];
    const lf = match.fighters[1 - winner];
    lf.state = 'ko';
    lf.stun = 0;
    lf.blocking = false;
    wf.state = 'win';
    wf.stun = 0;
    wf.vx = 0;
    wf.blocking = false;
    match.wins[winner]++;
  }

  events.push({ type: 'ko', winner, draw, timeOut: !!match.timeOut });
}
