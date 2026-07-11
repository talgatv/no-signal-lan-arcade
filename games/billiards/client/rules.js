/**
 * Billiards — 8-ball turn/rules engine (pure, DOM-free).
 *
 * Deliberately split out of physics.js (which only knows about circles,
 * velocities, and a table — it has no concept of "players" or "fouls") and
 * out of game.js (which owns rendering/input/sfx) — same three-way split
 * idea as games/neon-drift's physics.js/track.js/game.js. Only 8-ball mode
 * ever touches this module; solo practice mode uses physics.js directly and
 * never constructs a match state at all.
 *
 * A shot resolves in one call, resolveShot(match, balls, shot), once every
 * ball on the table has stopped moving. `balls` is the CURRENT physics
 * state (this shot's pocketed balls already applied, via ball.pocketed) —
 * used to answer "has this player's whole group already been cleared?".
 * `shot` is a small summary game.js assembles from the raw physics events
 * emitted during the shot:
 *
 *   { pocketedNumbers: number[], scratched: boolean, firstContactNumber: number|null }
 *
 * Core rules implemented (the "must-have" set the task calls out —
 * intentionally NOT exhaustive official-rules foul detection, e.g. no
 * "cue ball must contact a rail after contact" tracking, no call-shot/
 * call-pocket): open table until a player's first legal pocket, which
 * assigns that player solids/stripes for the rest of the game; a shot that
 * doesn't touch a ball at all, touches the wrong group first, or pockets
 * the cue ball is a foul (turn passes, incoming player gets ball-in-hand);
 * pocketing your own group keeps your turn; pocketing the 8-ball wins if
 * your group was already fully cleared (and you didn't also scratch), and
 * loses immediately otherwise (too early, or scratch-on-the-8).
 */

export function ballGroup(number) {
  if (number === 0) return 'cue';
  if (number === 8) return 'eight';
  return number <= 7 ? 'solid' : 'stripe';
}

export function otherPlayer(p) { return p === 0 ? 1 : 0; }

export function createMatch() {
  return {
    players: [
      { group: null, pocketedCount: 0 },
      { group: null, pocketedCount: 0 },
    ],
    currentPlayer: 0,
    tableOpen: true,
    ballInHand: false,
    gameOver: false,
    winner: null,
    reasonKey: null,
  };
}

/** True once every ball in `group` (solid = 1-7, stripe = 9-15) is pocketed. */
function groupCleared(balls, group) {
  return balls
    .filter((b) => ballGroup(b.number) === group)
    .every((b) => b.pocketed);
}

/**
 * Resolve one completed shot. Mutates `match` in place (group assignment,
 * turn switch, ball-in-hand, game-over/winner) and returns a small summary
 * for game.js to react to (toast text, sfx, overlay):
 *
 *   { foul, foulReason, gameOver, winner, reasonKey, groupAssigned, continued }
 *
 * foulReason: 'scratch' | 'noContact' | 'wrongBall' | null
 * reasonKey (only set when gameOver): 'winEight' | 'lossEightEarly' | 'lossEightScratch'
 */
export function resolveShot(match, balls, shot) {
  const shooterIdx = match.currentPlayer;
  const shooter = match.players[shooterIdx];
  const opponent = match.players[otherPlayer(shooterIdx)];

  const pocketedGroups = shot.pocketedNumbers.map((n) => ({ number: n, group: ballGroup(n) }));
  const eightPocketed = pocketedGroups.some((p) => p.group === 'eight');
  const ownPocketed = pocketedGroups.filter((p) => p.group !== 'eight');
  const firstContactGroup = shot.firstContactNumber == null ? null : ballGroup(shot.firstContactNumber);

  // --- Foul detection (evaluated against PRE-shot group state) -----------
  let foul = false;
  let foulReason = null;
  if (shot.scratched) {
    foul = true;
    foulReason = 'scratch';
  } else if (firstContactGroup == null) {
    foul = true;
    foulReason = 'noContact';
  } else if (!match.tableOpen && shooter.group) {
    const mustPlayEight = groupCleared(balls, shooter.group);
    const legalFirst = mustPlayEight ? firstContactGroup === 'eight' : firstContactGroup === shooter.group;
    if (!legalFirst) {
      foul = true;
      foulReason = 'wrongBall';
    }
  }
  // Table still open: any first contact is legal (no group to be "wrong" yet).

  // --- 8-ball outcome (overrides the normal foul/continue flow) ----------
  if (eightPocketed) {
    const cleared = shooter.group ? groupCleared(balls, shooter.group) : false;
    const legalWin = cleared && !shot.scratched;
    match.gameOver = true;
    match.winner = legalWin ? shooterIdx : otherPlayer(shooterIdx);
    match.reasonKey = legalWin ? 'winEight' : (shot.scratched ? 'lossEightScratch' : 'lossEightEarly');
    return {
      foul: !legalWin,
      foulReason,
      gameOver: true,
      winner: match.winner,
      reasonKey: match.reasonKey,
      groupAssigned: false,
      continued: false,
    };
  }

  // --- Group assignment (first legal pocket on an open table) ------------
  let groupAssigned = false;
  if (match.tableOpen && !foul && ownPocketed.length > 0) {
    const counts = {};
    for (const p of ownPocketed) counts[p.group] = (counts[p.group] || 0) + 1;
    const assigned = (counts.solid || 0) >= (counts.stripe || 0) ? 'solid' : 'stripe';
    shooter.group = assigned;
    opponent.group = assigned === 'solid' ? 'stripe' : 'solid';
    match.tableOpen = false;
    groupAssigned = true;
  }

  const pocketedOwnGroup = ownPocketed.some((p) => p.group === shooter.group);
  shooter.pocketedCount = balls.filter((b) => b.pocketed && ballGroup(b.number) === shooter.group).length;
  if (opponent.group) {
    opponent.pocketedCount = balls.filter((b) => b.pocketed && ballGroup(b.number) === opponent.group).length;
  }

  if (foul) {
    match.ballInHand = true;
    match.currentPlayer = otherPlayer(shooterIdx);
    return { foul: true, foulReason, gameOver: false, winner: null, reasonKey: null, groupAssigned, continued: false };
  }

  match.ballInHand = false;
  const continued = pocketedOwnGroup;
  if (!continued) match.currentPlayer = otherPlayer(shooterIdx);
  return { foul: false, foulReason: null, gameOver: false, winner: null, reasonKey: null, groupAssigned, continued };
}
