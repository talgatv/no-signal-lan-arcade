# Penguin Fling

**Solo physics arcade.** A friendly yeti launches a penguin across an icy landscape. Drag
back like a slingshot, let go, and watch real projectile motion take over — gravity-driven
flight, a coefficient-of-restitution bounce phase that skips shorter and shorter across the
ice, then a long, low-friction slide that gradually decelerates to a stop. Score is total
distance traveled; land your final resting spot on one of four distance-marker flags for a
bonus. Multiple attempts per session, best distance saved locally.

This is an original take on the well-known "physics launch/distance" arcade genre — its own
character designs, its own code, its own procedurally-synthesized sound. No assets, source
code, or content were sourced or copied from any specific existing game.

## The physics (the whole point of the game)

All of it lives in `client/physics.js`, which is deliberately pure — no DOM, no canvas, no
pixels, just meters/seconds/radians — so it can be stepped and inspected directly from a test
harness (see `window.OGH_PENGUIN_FLING` in `client/game.js`) instead of only being observable
through the rendered scene.

1. **Flight.** Real projectile motion: gravity (21 m/s², deliberately a bit lighter than
   Earth's 9.8 for a floatier arcade arc) pulls the penguin down every frame; initial velocity
   comes from launch power × angle. A per-attempt random wind (±0.55 m/s², shown as an arrow
   in the header) nudges the arc for replay variety. Angular velocity set at launch (scaled
   with power, plus a little randomness) makes the penguin visibly tumble in the air.
2. **Bounce.** The moment the penguin touches the ice, its vertical speed is multiplied by a
   fixed coefficient of restitution (0.52) and its horizontal speed by a much gentler ice-friction
   factor (0.96). A constant CoR alone already produces "each bounce shorter than the last":
   bounce height scales with vy², so a fixed fraction of vy every bounce means each peak is
   roughly CoR² of the previous one's height. A little residual spin also bleeds into forward
   speed on each bounce (a simplified "topspin skips forward" arcade approximation) and decays
   itself, so the tumble winds down as the bounces do. Once a bounce's vertical speed drops
   below ~1.9 m/s (or a safety cap of 8 bounces is hit), the penguin hands off into:
3. **Slide.** Purely horizontal from here — no more vertical motion. Speed decays by a
   frame-rate-independent exponential factor every second (the same idiom `games/neon-drift`
   uses for its drag/brake model), plus a small local-slope term (climbing costs speed, coasting
   downhill gains a little) and a small spin-vs-friction assist from any residual spin. The
   penguin visibly lies down and tilts to match the local ice slope. It decelerates smoothly and
   asymptotically — never an instant stop, never forever — and snaps to a clean, fully-stopped
   0 once its speed drops under a small threshold; that final x position **is** the score.
4. **Terrain.** The ice isn't perfectly flat: small procedural bumps (a couple of summed sine
   waves, reseeded every attempt) nudge bounce contact angles slightly for extra variety. A
   single **ramp** zone (also reseeded every attempt, positioned between the second and third
   flags) is a bigger, deliberate feature — its rendered shape *is* its collision shape (the
   same `groundHeight()` function drives both drawing and physics, so it can never visually
   clip or float), and if a slide crosses its exit edge with enough speed, forward speed gets
   redirected into a real secondary arc (a small kicker-lip launch angle, not just the ramp's
   own — deliberately, since the ramp's eased rise flattens to almost no tangent right at the
   edge; a real ramp's last few degrees of curvature are steeper than its average slope for
   exactly this reason).

Every constant above was tuned empirically against a simulated power/angle/wind/seed sweep
(see the git history / commit notes for the tuning script) rather than picked by feel alone —
in particular, wind and the ramp's height were both deliberately kept smaller than an initial
pass, because a taller ramp combined with stronger wind turned "did I throw hard enough to
clear it" into a near coin-flip that swung final distance by 40+ meters from wind alone, which
felt like it undermined the player's own aim more than it added charm.

One emergent side effect worth knowing about: because bounces and slides lose so little
horizontal speed compared to a high arc "wasting" energy going up, a **flatter** throw often
travels *further* overall than a textbook 45° "optimal" arc once bounce-and-slide is added —
much like a skipped stone. Discovering that is part of the game.

## Controls

**Primary — drag to aim (touch and mouse).** Press and drag back from the penguin like a
slingshot: power comes from how far you pull (up to a cap), angle from the pull direction
(clamped to 12°–78° above horizontal so you can't aim into the ground or straight up). A
dashed preview arc and a live "Power NN% · Angle NN°" readout update as you drag, computed by
literally re-running the same flight physics on a scratch state — the preview can never drift
out of sync with what will actually happen. Release to launch.

**Keyboard alternative.** Hold <kbd>Space</kbd> to charge power (fills over ~1.4s), tap
<kbd>↑</kbd>/<kbd>↓</kbd> to adjust angle in 3° steps, release <kbd>Space</kbd> to launch. Also
works for menu buttons (<kbd>Space</kbd>/<kbd>Enter</kbd> on Play / Throw again).

## Scoring & targets

Score is the total distance traveled (flight arc + every bounce + the full slide, i.e. simply
the final resting x position). Four flags mark bonus distance windows along the course —
Icicle Point (~16 m), Frost Ridge (~37 m), Glacier Edge (~70 m, right around where a strong
throw first reaches the ramp), and Aurora Point (~145 m, reachable only with a near-maximum,
well-angled throw) — landing your final stop inside a flag's zone adds its bonus. The results
screen also shows a playful distance comparison ("that's as long as N city buses end to end!")
because no good distance-throwing game skips the silly units. Your best distance persists
locally via `OGHProfile` (`games/_shared/js/ogh-profile.js`), the same convention
`games/pop-the-bugs` uses for its high score — nothing is uploaded anywhere.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/penguin-fling/client/
```

## Files

```text
client/
├── index.html   ← layout: header (back/wind/best/lang), canvas stage, hint, start/result overlay
├── style.css    ← deliberate cartoon-winter palette override on top of ogh-base.css's shared
│                  structure/classes (see games/paint-xp for the precedent of this kind of
│                  departure from the hub's usual neon-vector look)
├── physics.js   ← pure flight/bounce/slide/terrain/target simulation, no DOM
├── game.js      ← canvas rendering, pointer-drag + keyboard input, camera, sfx/HUD/i18n wiring
└── i18n.js      ← en/ru/zh/es/ar/fr strings (RTL-aware; the scene itself never mirrors)
```

No bundled image or audio assets: the entire scene (sky, parallax hills/pines, ice, yeti,
penguin, flags, ramp, snow-puff particles) is Canvas 2D paths/gradients, and every sound is
synthesized via `games/_shared/js/ogh-sfx.js`'s tiny oscillator helper (extended here with
`thwack`/`boing`/`whoosh`/`land` patterns, in the same plain-tone-sweep style as its existing
`screech`, added by `games/neon-drift`). Directory size: well under the 10 MB budget — see
`sizeMeasuredKb` in `games/catalog/games.json` for the exact measured figure (`du -sh
games/penguin-fling/`).

MIT licensed, same as the hub.
