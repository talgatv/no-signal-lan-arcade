# Blade Fruit

**Solo fruit-slicing swipe arcade.** Fruit — and the occasional bomb — launch
up from random spots near the bottom of the screen on a real gravity arc:
they rise, decelerate, and fall back down, exactly like a tossed object
under gravity, not a scripted path. Drag a continuous swipe across the
screen to slice anything the stroke crosses. Chain several fruit in one
unbroken swipe for a rising combo bonus. Never slice the bomb — one cut ends
the run instantly. Miss too many fruit falling back down unsliced and you're
out of lives.

This is an original take on the well-known "fruit arcs up from below, swipe
to slice it, avoid the bomb" arcade genre (Fruit Ninja is the classic
reference point) — its own fruit designs, physics, code and synthesized
sound; nothing copied from any specific existing game's art or content.

## Controls

**Touch or mouse (Pointer Events).** Press down and drag anywhere on the
screen — the stroke leaves a glowing trail, and any fruit or bomb the trail
crosses *at any point along its path* (not just where you started or
stopped) is sliced. Release to end the stroke; a fresh swipe starts a new
combo.

**Keyboard: optional** — <kbd>Enter</kbd>/<kbd>Space</kbd> starts a run from
the title screen or starts a new one from the results screen. There's no
sensible keyboard equivalent for a swipe gesture itself, so slicing stays
touch/mouse-only.

## Fruit and bomb types

Five fruit, each readable at a glance by silhouette *and* color, plus one
unmistakably dangerous bomb:

| Type | Look |
|---|---|
| Apple | Round, bright red, small stem + leaf |
| Melon | A watermelon **wedge** (pac-man-style slice, not round) — green rind, pink flesh, seeds |
| Berry cluster | A cluster of 4 overlapping purple circles — the only non-round silhouette besides the wedge |
| Citrus | Round, orange, cut cross-section with radiating segment lines |
| Kiwi | Round, lime-green, white center, a ring of tiny black seeds |
| **Bomb** | Dark, spiky, desaturated metal sphere with a pulsing red glow and a flickering lit fuse — the only non-bright, non-fruit-colored shape on screen, deliberately readable as "don't touch" at a glance |

Every fruit's hitbox is a plain circle regardless of its drawn shape.
Slicing a fruit splits it into two halves that fly apart under gravity plus
a sideways kick from the swipe direction, alongside a burst of
color-matched juice particles. Slicing the bomb triggers a bigger
multi-color explosion, a screen shake, and instant game over.

## Scoring and combos

Each fruit has a base point value (10-15, smaller/harder targets like the
berry cluster are worth more). Consecutive fruit sliced within **one
unbroken swipe** multiply: the *N*th fruit hit in a single continuous
stroke scores `basePoints × N`. Lifting the pointer resets the multiplier,
so slicing 3 fruit in one swipe (1× + 2× + 3× = 6× a fruit's base value)
scores meaningfully more than slicing the same 3 fruit across 3 separate
swipes (1× + 1× + 1× = 3×) — chaining is the whole point. A combo of 2+
pops a brief "×N COMBO!" banner.

## Lives and difficulty

You start with 3 lives. A fruit that falls back down past the bottom of the
screen unsliced costs 1 life (a bomb falling off-screen unsliced is free —
avoiding it passively is fine, exactly like the genre convention). Losing
all 3 lives, or slicing a single bomb, ends the run.

Difficulty is a pure function of elapsed play time
(`fruits.js`'s `difficultyForElapsed()`, directly inspectable at
`window.OGH_BLADE_FRUIT.getDifficulty(seconds)`): the gap between spawn
waves shrinks, the number of fruit tossed together per wave grows from 1 up
to 3, the chance a wave includes a bomb rises, and launch speed itself
increases — all ramping over the first 45 seconds of a run before holding
at their hardest setting, so a long session stays hard without ever
becoming literally unplayable.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/blade-fruit/client/
```

## Files

```text
client/
├── index.html   ← layout: header (back/HUD/lang), canvas stage + combo
│                  popup, hint, start/results overlay
├── style.css    ← neon theme, heart-pip lives readout, combo-popup and
│                  miss-flash animations
├── fruits.js    ← pure entity module: 5 fruit shapes + the bomb, real
│                  gravity-arc physics (per-frame integration), the
│                  difficulty ramp, and sliced-fruit half debris (reuses
│                  each fruit's own whole-shape draw() via canvas clip()
│                  instead of authoring separate half-shapes)
├── slicing.js   ← pure geometry: swipe-segment-vs-circle-hitbox test,
│                  called once per new path segment so a fast swipe is
│                  checked along its whole path, not just its endpoints
├── game.js      ← state machine, spawn scheduling, combo/scoring, pointer
│                  input, canvas rendering, sfx, i18n wiring, OGHProfile,
│                  single RAF loop, debug/test hook
└── i18n.js      ← en/ru/zh/es/ar/fr strings (RTL-aware; the play field —
                   launch positions, swipe path — never mirrors, see
                   index.html's dir="ltr")
```

No bundled image or audio assets. `window.OGH_BLADE_FRUIT` exposes live
state, the `fruits.js`/`slicing.js` modules directly, `forceSpawn()` to
place a deterministic fruit/bomb for scripted testing, `simulateSwipe()` to
drive a scripted swipe through the same combo/scoring logic real input
uses, `jumpElapsed()` to fast-forward the difficulty ramp, and `tick(dt)`
for manual frame stepping.

Sound reuses `games/_shared/js/ogh-sfx.js`'s tiny oscillator beeps, extended
with exactly one new `slice` pattern (a fast, bright blade-swish sweep);
combo continuation, the bomb, a missed fruit and the run-ending sting all
reuse existing patterns (`chain`, `boom`, `screech`, `die`) that already fit.
Best score persists locally via `games/_shared/js/ogh-profile.js` (same
convention as `games/pop-the-bugs`/`games/dash-runner`) — no server, survives
a page reload, shows in the hub's profile drawer.

MIT licensed, same as the hub.
