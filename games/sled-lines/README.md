# Sled Lines

**Solo freehand physics-drawing sled toy.** Draw a track with your finger or mouse, press Play,
and watch a small jointed sled + rider — simulated with real Verlet-integration physics —
roll, slide and tumble down exactly what you drew, pulled by real gravity. Erase, undo, redraw,
try again. There's no score and no fail state that matters much; the point is the joy of drawing
a track and watching it work (or not).

This is an original take on the beloved "draw a line freehand, a rider physics-simulates down
whatever you drew" genre (Line Rider is the classic reference point). Its own rider design, track
tools, code and procedurally-synthesized sound — no assets, source or content were copied from
any specific existing game.

## The physics (the whole point of the toy)

All of it lives in `client/physics.js`, a deliberately pure module — no DOM, no canvas, just
numbers in the same pixel units `client/game.js` draws with — so the whole simulation is directly
steppable and inspectable from a test harness (`window.OGH_SLED_LINES`) rather than only being
observable through the rendered scene.

It's a genuine **Verlet-integration + distance-constraint** rigid body — Thomas Jakobsen's
*"Advanced Character Physics"* technique, the well-documented method this entire genre is built on:

1. **Verlet integration, no explicit velocity.** Every point stores only its current position
   `(x,y)` and previous position `(px,py)`. Velocity is implicit — just `x - px` — so applying
   gravity is one line (`y += (y-py) + g*dt²`) and it's unconditionally stable at the small fixed
   timestep used here.
2. **The rig — 7 points, 8 constraints.** `nose`/`tail`/`hip` form a rigid triangle (the sled +
   seat). The rider's `shoulder` braces to both `hip` (spine) and `nose` (chest), so the torso
   stays locked upright rather than flopping like a pendulum. `head`, and the two hands
   (`handF`/`handB`) each hang off the shoulder with a **single** constraint and nothing else —
   deliberately underbraced, so they swing and flail on their own under gravity and collisions,
   giving the rider ragdoll character for free.
3. **Constraint relaxation.** Each tick, every rod is relaxed several times: measure the live
   distance between its two points, move each point half the error back toward the rod's rest
   length. A handful of these passes per tick is enough for the rig to hold its shape even right
   after a hard collision shoves one point — no matrix solve, no explicit angular state anywhere.
4. **Track collision — "collide and slide."** Every rider point is tested against every solid
   drawn segment as a closest-point-on-segment test. If it's overlapping, the point is pushed out
   along the segment normal (a plain position edit — Verlet turns that directly into a velocity
   change next tick), and once per tick its along-surface (tangential) speed is damped for sliding
   friction while the into-surface component is zeroed so contacts never bounce.
5. **Substepped for robustness.** A fast-falling point can travel further in one 1/120s tick than
   the collision "capture zone" is wide, letting it tunnel clean through a line between two
   integration steps — a real bug found and fixed during development (a ~1400px drop, an entirely
   plausible hand-drawn cliff, passed straight through before this existed). Every tick is
   internally split into 4 substeps, each a smaller, ordinary Verlet step — no swept/continuous
   collision detection needed, just finer-grained ordinary steps. Gravity's air-damping and the
   contact-friction factor are both rescaled so the effective fall speed and slide friction don't
   depend on the substep count.

The engine was validated headless with Node before the UI existed (free-fall: constraint error
stays at machine-precision zero over 240 ticks; a rider dropped onto a flat line settles to a
stable rest position and stays there, drifting &lt;0.03px over 60 more ticks; a scenery line is
provably passed straight through; the hard-impact crash threshold was calibrated against the
simulation's own measured impact speeds, not idealized textbook kinematics, since the two differ
by ~10-15%).

## Line types

Pick a tool from the toolbar, then press-and-drag on the canvas to draw:

| Tool | Color | Behaviour |
|------|-------|-----------|
| **Track** | cyan, solid glow | Collides — the rider slides along it, rests on it, falls off its end. |
| **Scenery** | dim, dashed | Purely decorative. The rider passes straight through — useful for background detail. |
| **Boost** (bonus) | amber, with chevron ticks | Non-collidable, but gives the rider a speed kick along the line's direction when crossed. |
| **Erase** | — | Tap or drag near any line to remove it (whole stroke, not just a segment). |

**Undo** removes the most recently completed line (any type); **Clear** removes everything.

## Controls

**Press and drag (mouse and touch, via Pointer Events).** Pick a tool, then draw directly on the
canvas — press to start a stroke, drag to extend it, release to finish. Works identically with
mouse or touch, and drawing/erasing only responds while in Edit mode.

**Play** resets the rider to its start position and runs the physics simulation. **Edit** (the
same button, relabelled) stops the simulation and resets the rider back to its start position too,
so you always resume editing from a clean, known state — never wherever the sled ended up.

**Keyboard: optional** — `1`/`2`/`3`/`4` or `T`/`S`/`B`/`E` pick a tool, `U` undoes the last line,
`C` clears everything, `Enter`/`Space` toggles Play/Edit.

## Crash detection

Kept modest on purpose — this toy is about drawing and watching, not winning. A crash freezes the
rider's pose (tinted red) and shows a small hint; press Edit to fix the track and try again. Two
triggers:

- **Hard impact** — a core sled/torso point (`nose`/`tail`/`hip`; the flailing limbs don't count)
  hits a track line at high into-surface speed, roughly a ~580px unbroken vertical fall onto flat
  ground or steeper.
- **Fell** — no rider point has touched any track line for a while (or the rider has fallen very
  far below its start), so nothing ever caught it.

A bonus third check (a sustained topple/flip of the sled past a real margin) is also wired up but
not required reading.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/sled-lines/client/
```

## Files

```text
client/
├── index.html    ← layout: header (back / lang switch), toolbar, canvas stage, hint, start card
├── style.css     ← neon-vector page chrome on top of ogh-base.css's shared classes
├── physics.js    ← pure Verlet + distance-constraint rider simulator — no DOM, no canvas
├── track.js      ← pure polyline data model: draw/undo/clear/erase — no DOM, no physics
├── game.js       ← canvas rendering, pointer draw/erase input, toolbar, fixed-timestep physics
│                    loop, sfx/i18n wiring, test harness
└── i18n.js       ← en/ru/zh/es/ar/fr strings (RTL-aware; the canvas never mirrors)
```

No bundled image or audio assets: the whole scene (drawn lines, sled, rider) is Canvas 2D vector
shapes with a neon glow, and every sound is synthesized via `games/_shared/js/ogh-sfx.js`'s tiny
oscillator helper — reused entirely unchanged (`tap` for draw-start/tool-switch/undo, `whoosh` for
Play, `die` for a crash, `screech` for erase/clear, `land` for touchdown after being airborne).

**i18n / RTL.** All UI text is translated across the UN-6 languages. Arabic flips the text-bearing
chrome (header, toolbar labels, hint, start card) to RTL, but **never** the canvas: the drawn
track, the rider's physics, and the toolbar's tool order stay exactly as drawn/laid out in every
language — mirroring that spatial content would silently flip every track and the rider's
nose/tail orientation.

Nothing is saved or uploaded; the track and every run reset when you reload the page. MIT
licensed, same as the hub.
