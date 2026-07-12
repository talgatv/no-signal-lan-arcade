# Drop Smash

**Solo ball-drop tower-smashing physics toy.** Pick how many balls (1-3), how heavy they
are, and where to drop them from — then let real physics take over. The ball(s) fall under
gravity, hit the tower's stacked breakable layers, smash through what they can and bounce off
what they can't, and keep going until everything comes to rest or falls out the bottom. Four
structurally different towers, a growing crack before a layer fully breaks, and a saved best
score.

This is an original take on the well-known "drop one or more balls onto a stack of breakable
layers, choose count/weight/position" genre of casual mobile physics game. Its own towers,
tuning, code, art and procedurally-synthesized sound — no assets, source or content were copied
from any specific existing game.

## The physics (the whole point of the toy)

All of it lives in `client/physics.js`, a deliberately pure module — no DOM, no canvas, just
numbers in the same pixel units `client/game.js` draws with (there is no camera/scroll) — so the
whole simulation is directly steppable and inspectable from a test harness (see
`window.OGH_DROP_SMASH`) rather than only being observable through the rendered scene.

1. **Impact momentum drives everything.** A ball's mass times its approach speed at the moment
   of contact is its "impact momentum" — the single number that decides both how much hit-point
   damage a platform takes and how hard the ball bounces back. A **heavier** weight setting gives
   a ball both more mass *and* more initial drop speed (see `WEIGHTS` in `physics.js`), so the
   difference between a light and a heavy ball is real and compounding, not cosmetic: in the
   default "Sheer Tower" a light ball dropped center-first breaks through the two weakest layers
   and then stalls well short of the tougher ones (2 of 11 broken), a medium ball breaks roughly
   half the tower, and a heavy ball routinely clears every layer and exits the bottom.
2. **Crack before break.** Each platform has hit points; a hit that doesn't fully deplete them
   leaves it standing but visibly cracked (the crack pattern grows through three stages as hp
   drops), and only hp ≤ 0 removes it. A ball that breaks through keeps falling (lightly damped —
   breaking things costs a little speed, so a ball that chains many breaks does measurably slow
   down); a ball that doesn't break through **bounces** — its velocity's normal component
   reflects with energy loss (`LAYER_RESTITUTION`) and its sideways component is damped, so it
   deflects at an angle and loses energy every bounce instead of stopping dead or sliding through.
3. **Multi-ball combos matter.** Because platform hp is a shared pool, several balls landing on
   the same platform within the same drop all chip away at the *same* hit points — the tower's
   material tiers are calibrated so there's a tier a single light ball can't dent meaningfully but
   three light balls landing together can break, and a tier that needs a heavy ball (or two)
   specifically. Balls also collide with **each other** if their paths cross: a textbook
   unequal-mass elastic-ish impulse (restitution < 1), the general form
   `games/billiards/client/physics.js`'s equal-mass swap is a special case of, with position
   correction split by inverse mass so a heavy ball barely moves when it shoulders a light one
   aside — no permanent overlap, no glitching.
4. **Contained, not endless.** Side walls bounce balls back into play; the only way out of the
   simulation is straight down past the last row (`EXIT_Y`) — "exits the bottom" in the spec
   sense. Fixed sub-stepping keeps even a fast heavy ball from tunneling through a platform
   within one frame.

## The towers — 4 structurally different layouts

`client/tower.js` authors each layout as plain data: a 14-row grid where every row holds zero,
one, or two independent breakable platforms (splitting a row in two means one side can shatter
while the other survives — a later drop can route through the broken half).

| Tower | What makes it different |
|-------|--------------------------|
| Sheer Tower | Mostly full-width rows with a few open corridors, toughness escalating gently with depth. The easy intro layout. |
| Staggered Ledges | Alternating half-width platforms zigzag the ball left/right, with full-width rows punctuating the routing. |
| Fortress Bands | Full-width "wall" rows in a tougher material gate the descent — only a heavy ball or a multi-ball combo punches through alone — plus a narrow center-gap band for aimed routing. |
| Twin Spire | Two standing columns either side of a center shaft, bridged by full-width landings every few rows, ending in a merged toughest-tier base. |

Every drop rebuilds the selected tower **fully intact** — damage never carries over between
drops, so retrying or switching weight always compares against full hp. Clearing a tower
completely (every platform broken) auto-advances to the next one; the Tower pill in the header
can also be tapped any time during configuration to cycle towers manually, for replay variety
either way.

## Controls

**Touch or mouse (Pointer Events).** Drag anywhere on the canvas while configuring to set the
horizontal drop position — a marker on the dashed line above the tower, and a live preview of
the ball(s) about to drop, follow your finger/cursor. Pick 1-3 balls and a light/medium/heavy
weight from the strip below the canvas, then press **Drop**.

**Keyboard: optional** — <kbd>Enter</kbd>/<kbd>Space</kbd> activates the current primary action
(start / drop / configure next drop), the arrow keys nudge the drop position, and <kbd>1</kbd>/
<kbd>2</kbd>/<kbd>3</kbd> pick the ball count.

## Scoring

Each drop scores points for layers broken and for how many rows deep the ball(s) reached, with
bonuses for a ball exiting the bottom and for fully clearing the tower in one drop. Score
accumulates across drops in a session, and your **best total is saved locally** via
`games/_shared/js/ogh-profile.js` (same convention as `games/pop-the-bugs` / `games/siege-break`).
The results readout after every drop shows layers broken, depth reached, and the score gained
this drop alongside the running total.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/drop-smash/client/
```

## Files

```text
client/
├── index.html    ← layout: header (back / HUD pills / lang switch), canvas stage, hint, the
│                    persistent ball-count/weight/Drop config strip, start/results overlay cards
├── style.css     ← neon-vector page chrome on top of ogh-base.css's shared classes
├── tower.js      ← the 4 tower layouts + material hp tiers + fixed layout constants, as plain
│                    data (no DOM)
├── physics.js    ← pure 2D physics: gravity, circle-vs-platform impact/damage/bounce, unequal-
│                    mass ball-vs-ball collision, side walls, rest/exit detection — no DOM/canvas
├── game.js       ← canvas rendering, pointer-drag input, fixed-timestep drop loop, scoring,
│                    sfx, i18n wiring, best-score persistence, test harness
└── i18n.js       ← en/ru/zh/es/ar/fr strings (RTL-aware; the tower/spawn-position scene never
                     mirrors)
```

No bundled image or audio assets: the whole scene (tower layers, cracks, balls, debris) is
Canvas 2D vector shapes with a neon glow, plus a screen-shake and particle burst on a big break.
Every sound is synthesized via `games/_shared/js/ogh-sfx.js`'s tiny oscillator helper (extended
here with one new `crack` pattern for a layer taking damage without breaking; the drop release,
no-damage bounce, ball-ball knock, full break and exit-the-bottom cues all reuse the existing
`whoosh` / `bounce` / `clack` / `crumble` / `land` patterns — see the comment in `ogh-sfx.js`).

**i18n / RTL.** All UI text is translated across the UN-6 languages. Arabic flips the
text-bearing chrome (header, HUD labels, hint, config-strip labels, overlay cards) to RTL, but
**never** the tower scene: the horizontal spawn-position track keeps its visual-left =
smaller-x meaning, and every tower's own layout (which side a gap sits on) stays exactly as
authored — mirroring either would silently change where a drag actually drops the ball, or which
side a routing gap is on, for Arabic players only.

Best score persists locally (nothing is uploaded); everything else resets each run. MIT licensed,
same as the hub.
