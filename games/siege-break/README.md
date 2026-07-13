# Siege Break

**Solo catapult-vs-fortress destruction physics.** Load the catapult, drag back like a
slingshot, and let a boulder fly in a real gravity arc. Smash walls, topple towers, and collapse
the whole structure onto the enemies holding it — in as few boulders as you can. Six hand-built
strongholds, a star rating for efficiency, and a saved best score.

This is an original take on the well-known "aim a catapult at a block fortress and knock it down"
genre (Crush the Castle is the classic reference point). Its own settings, structures, code, art
and procedurally-synthesized sound — no assets, source or content were copied from any specific
existing game.

## The physics (the whole point of the game)

All of it lives in `client/physics.js`, a deliberately pure module — no DOM, no canvas, just
numbers in the same pixel units `client/game.js` draws with (there is no camera/scroll) — so the
whole simulation is directly steppable and inspectable from a test harness (see
`window.OGH_SIEGE_BREAK`) rather than only being observable through the rendered scene.

It is a genuine (if compact) **2D impulse-based rigid-body engine** — a faithful port of Erin
Catto's *box2d-lite* sequential-impulse solver, adapted from its y-up/metres convention to this
game's y-**down** pixel space:

1. **Real rigid bodies.** Every block is an oriented rectangle with a centre of mass, an
   orientation angle, linear velocity **and angular velocity**, a real mass and a real moment of
   inertia. That angular term is what makes toppling *emergent* instead of faked.
2. **Contacts.** Oriented boxes are tested with the Separating Axis Theorem and turned into a 1–2
   point contact manifold by reference/incident-face clipping. Contacts are resolved with
   accumulated, **warm-started** normal + friction impulses over several iterations, with
   Baumgarte position correction. The circular boulder uses a closest-point circle-vs-box test.
3. **Toppling / support / cascades are emergent, not scripted.** Because an impulse is applied *at
   a contact point offset from the centre of mass*, it produces a torque (`r × P`) automatically:
   - An **off-centre boulder hit** spins the struck block in the physically correct direction.
   - A block resting on another has an upward contact impulse each tick that cancels gravity;
     **destroy the block beneath it and that contact simply stops existing next tick**, so gravity
     is unopposed and the block falls or topples over the nearest edge *on its own* — no separate
     "is this supported?" check is needed, it falls out of the same solver.
   - A knocked block carries velocity into its neighbour, whose contact the same solver resolves,
     so **one shot can cascade** down a whole row.
4. **Destruction from impact energy.** Blocks carry material hit points (stone / wood / glass /
   granite). Damage is dealt from a contact's **approach speed** (relative normal velocity before
   it is resolved), so a hard boulder strike or a long fall onto the ground shatters a block,
   while gentle settling contacts (approach speed ≈ 0) never chip one. A target is a body like any
   other, so it is defeated the same way whether it is **hit directly** or **crushed under falling
   debris**.
5. **Stable at rest.** Warm starting + 12 solver iterations + a snap-to-rest floor (residual jitter
   below a threshold is zeroed — the generalisation of `games/mini-golf`'s `STOP_SPEED`) keep a
   settled structure rock-steady, so a well-formed stack never pre-collapses before you hit it.

The engine was validated head-less with Node before any UI existed (overlapping boxes separate; a
5-block stack drifts &lt;0.25 px over 5 s; destroying a support makes the block above free-fall at
`g`; an overhang topples toward the unsupported side; one boulder displaces three blocks in a row).

## The strongholds — 6 structures, genuine layout variety

`client/structures.js` authors each layout bottom-up as plain data.

| # | Stronghold | What makes it different |
|---|------------|--------------------------|
| 1 | The Watchpost | A slim two-wide tower; a target on the roof and one sheltered behind a wall. Learn the knock-down. |
| 2 | Twin Gate | Two stout pillars carry a heavy granite lintel — topple the span to drop the target riding it. |
| 3 | The Vault | An enclosed chamber (walls + roof) sealing a target inside; break in to reach it. |
| 4 | Stepped Keep | A stepped pyramid; exposed shoulder targets and a crown a single shot can cascade down. |
| 5 | Sky Bridge | A long plank spans two towers; its target rides the middle, supported only at the ends — knock a tower out and the whole span (and its rider) drops. |
| 6 | The Citadel | The finale: two flanking towers plus a capped inner keep, mixed stone / granite / wood, four targets. |

## Controls

**Drag back and release (mouse and touch, via Pointer Events).** Press near the catapult, drag
back away from where you want to launch — like a slingshot winding tension — and let go. Power
comes from how far you pull (capped at a maximum); the launch angle comes from the pull direction.
A dashed arc previews the boulder's initial gravity trajectory as you aim.

**Keyboard: optional** — <kbd>Enter</kbd>/<kbd>Space</kbd> activates whichever overlay button is
showing (start / next stronghold / retry / play again). The aiming gesture itself is a 2D pull
vector with no natural keyboard equivalent.

## Scoring

Each defeated target and each destroyed block scores points; clearing a stronghold banks a bonus
for every unused boulder. A **star rating** (★★★) reflects efficiency: three stars if you clear it
in ≤ par boulders. Score accumulates across all six strongholds, and your **best total is saved
locally** via `games/_shared/js/ogh-profile.js` (same convention as `games/pop-the-bugs`). Run out
of boulders with targets still standing and you retry that stronghold (its provisional points are
dropped, so retries never inflate the score).

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/siege-break/client/
```

## Files

```text
client/
├── index.html      ← layout: header (back / HUD pills / lang switch), canvas stage, hint,
│                      start / level-clear / level-fail / final overlay cards
├── style.css       ← neon-vector page chrome on top of ogh-base.css's shared classes
├── physics.js      ← pure 2D rigid-body engine (OBB SAT + clipping, warm-started impulse solver,
│                      circle boulder, material hit points) — no DOM, no canvas
├── structures.js   ← the 6 stronghold layouts + arena constants, as plain data
├── game.js         ← canvas rendering, pointer-drag input, fixed-timestep firing loop, scoring /
│                      progression, sfx, i18n wiring, best-score persistence, test harness
└── i18n.js         ← en/ru/zh/es/ar/fr strings (RTL-aware; the battlefield never mirrors)
```

No bundled image or audio assets: the whole scene (catapult, boulder, blocks, target creatures,
debris) is Canvas 2D vector shapes with a neon glow, and every sound is synthesized via
`games/_shared/js/ogh-sfx.js`'s tiny oscillator helper (extended here with one new `crumble`
pattern for shattering masonry; the launch, heavy-impact, target-defeated and clear/fail cues
deliberately reuse the existing `thwack` / `boom` / `pickup` / `win` / `die` patterns rather than
adding more — see the comment in `ogh-sfx.js`).

**i18n / RTL.** All UI text is translated across the UN-6 languages. Arabic flips the text-bearing
chrome (header, HUD labels, hint, overlay cards) to RTL, but **never** the battlefield: the
catapult stays on the left, the structure on the right, and the launch direction stays left → right
in every language — mirroring that spatial gameplay would silently invert every shot.

Best score persists locally (nothing is uploaded); everything else resets each run. MIT licensed,
same as the hub.
