# Billiards

**Top-down 8-ball pool with real multi-ball physics.** Drag back from the cue ball like a
slingshot, let go to shoot, and watch proper elastic ball-to-ball collisions, cushion bounces,
and rolling friction play out on a 6-pocket table. Solo practice mode for just knocking balls
around, or a full local pass-and-play 2-player 8-ball match with turn structure, fouls, and a
win/loss condition.

This is an original take on the well-known game of 8-ball pool — its own table layout, its own
code, its own procedurally-synthesized sound. No assets, source code, or content were sourced or
copied from any specific existing game.

## Modes

- **Solo Practice** — the simplest mode: a full rack, no turns, no fouls. Shoot the cue ball
  around, sink whatever you can. Sinking the cue ball just respots it. A "New Rack" button resets
  the table any time; clearing all 15 shows a "Rack cleared!" toast.
- **2-Player 8-Ball (pass-and-play)** — the full turn-based game on one device, players
  alternating shots:
  - The table starts **open** — neither player is solids or stripes.
  - The first player to **legally pocket** an object ball (no foul on that shot) is assigned that
    ball's group (solids 1-7 or stripes 9-15) for the rest of the game; their opponent gets the
    other group.
  - A **foul** — the cue ball touches nothing, touches the wrong group first, or the cue ball
    itself gets pocketed (a **scratch**) — ends the shooter's turn and gives the incoming player
    **ball-in-hand**: tap anywhere on the table to relocate the cue ball before grabbing it to aim
    (a scratch also respots the cue ball to the kitchen automatically first, so there's always a
    sane default even if you don't bother moving it).
  - Pocketing one or more of your own group keeps your turn; anything else (no pocket, a foul, or
    only pocketing your opponent's ball) passes it.
  - Once your group is completely cleared, you must pocket the **8-ball** to win. Pocketing it
    before your group is clear, or pocketing it together with a scratch, is an **immediate loss**.
  - This implements the core "physics + pocketing + group assignment + win condition" ruleset the
    genre is built on; it deliberately does not enforce every official-rules foul nuance (e.g. no
    "cue ball must contact a rail after contact" tracking, no call-shot/call-pocket).

Real-time LAN multiplayer was deliberately **not** attempted: keeping a continuously-simulated,
many-body physics scene in sync frame-by-frame across two separate browser processes is a much
harder problem than this hub's turn-based or discrete-message games, and a half-working version
of it would be worse than a clean pass-and-play. Two players, one device, alternating turns.

## The physics (the whole point of the game)

All of it lives in `client/physics.js`, kept pure — no DOM, no canvas, just plain numbers in the
same pixel units `client/game.js` draws with — so it can be stepped and inspected directly from a
test harness (see `window.OGH_BILLIARDS` below) instead of only being observable through the
rendered scene.

1. **Sub-stepping.** `stepWorld(balls, dt)` advances the whole table in 8 fixed sub-steps rather
   than one big step. A full-power break sends the cue ball into a tightly-packed rack fast enough
   to cover more than a ball's diameter in a single animation frame — sub-stepping keeps every
   per-frame movement small enough that a fast ball can never tunnel through a neighbor without
   the collision ever being detected. Within each sub-step, the full set of ball-ball overlaps is
   resolved 10 times over (`COLLISION_ITERATIONS`) against the same positions before the next
   sub-step's integration — a single pass only lets an impulse travel exactly one contact deeper,
   which is not enough for a freshly-broken rack (a dead-center break needs to fan out through 5
   rows of simultaneous contacts); repeating the pass lets it propagate and split across neighbors
   correctly within one sub-step. This was caught empirically during testing — with one pass, a
   dead-center break funneled almost all of its energy into a single back-row ball while the other
   13 stayed frozen within a fraction of a pixel of their rack position; with 10 passes, the same
   shot fans balls out across the table the way a real break does.
2. **Ball-to-ball collisions.** On overlap, the two balls are pushed apart along the collision
   normal (the line through both centers) by half the overlap each, so they never render visually
   intersecting. Each ball's velocity is then decomposed into a component along that same normal
   and a component tangential to it; the two balls' **normal components are exactly swapped**
   (restitution = 1.0 exactly — not merely close to it), while their tangential components pass
   through completely untouched. That's the textbook equal-mass 2D elastic collision, and because
   the two velocity changes applied are exactly equal and opposite, **total momentum along the
   collision normal is conserved on every single collision** — verified directly during testing by
   staging controlled head-on and oblique collisions and comparing total momentum before/after; the
   only residual came from rolling friction acting over the same timestep (confirmed by shrinking
   the timestep 20x, which shrank the residual by the same 20x, exactly the linear scaling a
   friction-only explanation predicts).
3. **Cushion bounces.** The table is an axis-aligned rectangle, so a rail's normal is always
   purely horizontal or vertical — a bounce is a simple axis-flip (`vx = -vx` off the left/right
   rails, `vy = -vy` off the top/bottom) scaled by a restitution factor just under 1, so every rail
   contact measurably bleeds energy instead of bouncing forever.
4. **Rolling friction.** Every ball decelerates at a **constant rate** (not an exponential decay)
   — real rolling friction is close to a constant force, so speed falls off linearly with time and
   a shot always comes to an exact, full stop in finite time rather than asymptotically crawling
   forever.
5. **Pocketing.** A ball is captured when its center comes within a pocket's radius **and** either
   its speed is reasonable or it's a near-dead-center hit — a ball screaming across the table at
   full power can legitimately rattle the jaws of a pocket it just barely clips and stay in play,
   the same "a fast shot can skip it" nuance `games/mini-golf`'s cup capture has, here dialed back
   to a generous speed threshold so it only matters on genuinely hard, glancing shots. The cue
   ball is never permanently removed: pocketing it (a scratch) respots it at the kitchen (or the
   nearest open spot, if something's sitting on the exact head spot).

## Controls

**Drag back and release (mouse and touch, via Pointer Events).** Press near the cue ball, drag
back away from where you want to shoot — like a slingshot — and let go. Power comes from how far
you pulled (capped at a maximum pull distance); direction comes from the pull angle. A dashed aim
guideline, a range circle, and a live "Power NN%" readout update as you drag.

**Ball-in-hand placement** (8-ball, after an opponent's foul): tap anywhere else on the table to
relocate the cue ball, then grab it and drag-to-aim as normal.

**Keyboard: optional**, same convention as `games/mini-golf`/`games/mahjong` — the core aiming
gesture has no natural keyboard equivalent (it's a 2D pull vector). Every overlay button (mode
select, play again, change mode) is a plain, natively keyboard-focusable `<button>`, reachable
with Tab and activated with Enter/Space with no extra wiring needed.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/billiards/client/
```

## Files

```text
client/
├── index.html    ← layout: header (back/HUD pills/New Rack/lang switch), canvas stage, hint/
│                    toast, mode-select / game-over overlay cards
├── style.css     ← neon-vector page chrome on top of ogh-base.css's shared structure/classes,
│                    plus a landscape override of the shared auto-sizing canvas rule
├── physics.js    ← pure table/ball simulation: rack layout, shooting, sub-stepped rolling
│                   friction/cushion bounces/ball-ball elastic collisions/pocketing
├── rules.js      ← pure 8-ball turn/foul/group-assignment/win-loss state machine
├── game.js       ← canvas rendering, pointer-drag input, HUD, sfx, i18n wiring, mode/match glue
└── i18n.js       ← en/ru/zh/es/ar/fr strings (RTL-aware; the table itself never mirrors)
```

No bundled image or audio assets: the whole table (felt, rails, pockets, balls, cue aim
guideline) is Canvas 2D vector shapes with a neon glow, and every sound is synthesized via
`games/_shared/js/ogh-sfx.js`'s tiny oscillator helper (extended here with `clack`/`pocket`
patterns; the cue-strike and cushion-bounce cues reuse the existing `thwack` and `bounce`).
Nothing is persisted between sessions — every mode starts fresh from a new rack.

MIT licensed, same as the hub.
