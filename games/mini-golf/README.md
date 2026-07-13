# Mini Golf

**Solo top-down mini-golf.** See the whole hole from above, drag back from the ball like a
slingshot, let go to putt, and watch it roll — real 2D rolling-friction physics, proper wall
reflections, sand that bogs you down, water that sends you back with a penalty stroke, and a
cup that only sinks the ball at a reasonable speed. 9 hand-built holes, real par, a running
score, and a final scorecard.

This is an original take on the well-known "top-down mini-golf" genre — its own hole layouts,
its own code, its own procedurally-synthesized sound. No assets, source code, or content were
sourced or copied from any specific existing game.

## The course — 9 holes, genuine layout variety

| # | Hole | Par | What makes it different |
|---|------|-----|--------------------------|
| 1 | First Putt | 2 | A clean straight lane — learn the drag-and-release control with nothing else to think about. |
| 2 | Sharp Turn | 3 | A 90° dogleg right; the cup is hidden around the corner, no straight shot reaches it. |
| 3 | Bumper Field | 3 | A wide-open green with round pillar obstacles to bank shots off. |
| 4 | Sand Gauntlet | 3 | A big bunker sits dead-center on the direct line — go around, or plow through slowly. |
| 5 | Water Crossing | 4 | A pond blocks the direct path; a stroke into the water drops the ball at a marked drop zone near the hazard instead of all the way back at the tee. |
| 6 | Windmill | 3 | A single rotating bar sweeps the corridor's center — timing, not just aim. |
| 7 | Switchback | 4 | A Z-shaped double dogleg with a bunker guarding the first turn. |
| 8 | Sliding Gate | 4 | A barrier slides back and forth across the fairway; a pond guards the final approach. |
| 9 | Grand Finale | 5 | Everything at once — a pond, a bunker, and a 4-blade windmill guarding the cup. |

Course par: 31.

## The physics (the whole point of the game)

All of it lives in `client/physics.js`, which is deliberately pure — no DOM, no canvas, just
plain numbers in the same pixel units `client/game.js` draws with (this game has no camera, so
unlike e.g. `games/penguin-fling`'s meters-to-pixels layer, there's nothing to convert) — so it
can be stepped and inspected directly from a test harness (see `window.OGH_MINI_GOLF` below)
instead of only being observable through the rendered scene.

1. **Rolling.** A shot gives the ball an initial velocity (direction + power from the drag
   gesture); every frame afterward, speed decays by a frame-rate-independent exponential factor
   (the same `speed *= factor^dt` idiom `games/neon-drift` and `games/penguin-fling` use) — a
   ball that's rolling continuously loses speed and settles to a stop, rather than sliding at a
   constant speed and snapping to zero.
2. **Walls.** Every wall (the fairway's own boundary, internal dividers, round bumper
   obstacles, moving obstacles) is modelled as a "thick line segment" — a capsule shape, so one
   collision routine handles straight boundaries, angled dogleg corners, *and* round pillars (a
   zero-length segment degenerates cleanly to a plain circle) with no special-casing. On contact,
   the ball's velocity is reflected around the wall's contact normal (angle of incidence equals
   angle of reflection) and then scaled down by a restitution factor, so energy bleeds off every
   bounce instead of bouncing forever. A hole's fairway polygon edges are turned into walls
   automatically, so the rendered green shape and the collision boundary can never disagree —
   same "one source of truth" principle as `games/penguin-fling`'s `groundHeight()`.
3. **Sand.** A zone check (circle/rect shapes, sometimes clustered into an organic blob) swaps
   in a dramatically stronger friction constant while the ball's center is inside it — a ball
   that rolls into a bunker visibly, almost abruptly, bogs down within a few frames instead of
   gliding through.
4. **Water.** Also a zone check; entering one resets the ball to the position it had *before*
   the current shot (or, on Water Crossing, a marked drop zone near the hazard instead of the
   tee, matching the standard golf "drop near where it entered" rule) and adds a 1-stroke
   penalty, with an on-screen splash message so it's never a silent, confusing teleport.
5. **Sinking the cup.** Requires *both* proximity (the ball's center within a capture radius of
   the cup) *and* a low-enough speed — a ball roaring across the green at speed visibly skips
   right over the cup instead of magnetically snapping in the moment it's near, the same
   authentic "you can blow past it" nuance good mini-golf implementations have.
6. **Moving obstacles.** A windmill's rotating blades and a sliding gate are both just walls
   whose endpoints are a function of a monotonic game-clock that keeps advancing even while the
   player is still aiming — the windmill never freezes while you line up a shot, so timing
   matters. Their instantaneous contact-point velocity (via a small finite difference, one
   implementation for both the rotating and sliding kinds) is folded into the bounce as a
   relative-velocity reflection, so a sweeping blade can genuinely *knock* a slow or resting
   ball, not just nudge it aside.

## Controls

**Drag back and release (mouse and touch, via Pointer Events).** Press near the ball, drag back
away from where you want to putt — like a slingshot — and let go. Power comes from how far you
pulled (capped at a maximum pull distance); direction comes from the pull angle. A dashed
preview line, a range guide, and a live "Power NN%" readout update as you drag.

**Keyboard: optional**, same convention as `games/mahjong`/`games/solitaire` — the core aiming
gesture has no natural keyboard equivalent (it's a 2D pull vector), so this is a light utility
shortcut rather than a full alternate control scheme: <kbd>Enter</kbd>/<kbd>Space</kbd>
activates whichever overlay button is currently showing (Start Round / Next hole / Play again).

## Scoring

Strokes are tracked per hole (every shot counts, including a mis-hit into a water hazard, which
also adds its 1-stroke penalty). Sinking the cup shows the hole's par comparison — "Par 3 — you
took 4 (+1)" — plus a real-golf scoring term (Hole in one / Eagle / Birdie / Par / Bogey /
Double bogey+). A running total (strokes vs. cumulative par, shown as `E`/`+N`/`-N` in the
header) tracks the whole round the way a real golf scoreboard does. After the 9th hole, a final
scorecard table lists every hole's par/strokes/+-, a total line, and a "Play again" button that
resets the round from hole 1.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/mini-golf/client/
```

## Files

```text
client/
├── index.html    ← layout: header (back/HUD pills/lang switch), canvas stage, hint/toast,
│                    start / hole-complete / final-scorecard overlay cards
├── style.css     ← neon-vector page chrome on top of ogh-base.css's shared structure/classes
├── physics.js    ← pure rolling/friction/wall-reflection/sand/water/cup/moving-obstacle
│                   simulation, no DOM, no canvas
├── courses.js    ← the 9 hole layouts (fairway polygon, obstacles, sand/water zones, moving
│                   obstacles, tee/cup, par) as plain data
├── game.js       ← canvas rendering, pointer-drag input, HUD/scorecard, sfx, i18n wiring
└── i18n.js       ← en/ru/zh/es/ar/fr strings (RTL-aware; the course itself never mirrors)
```

No bundled image or audio assets: the whole course (fairway, walls, sand, water, cup, ball,
windmill/gate) is Canvas 2D vector shapes with a neon glow, and every sound is synthesized via
`games/_shared/js/ogh-sfx.js`'s tiny oscillator helper (extended here with `bounce`/`splash`
patterns; the shot and sink cues deliberately reuse the existing `thwack` and `win` patterns
rather than adding more — see the comment in `ogh-sfx.js`). Nothing is persisted between
sessions (no local high score) — each round starts fresh from hole 1.

MIT licensed, same as the hub.
