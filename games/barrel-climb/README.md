# Barrel Climb

**Solo neon-vector climbing platformer.** An original game inspired by the classic
"climb tilted platforms via ladders while dodging rolling barrels to reach the
top and rescue someone" arcade-platformer genre — its own setting, characters
and story, not a copy of anyone's specific characters or content.

**Story:** a rogue salvage robot, **Warden-9**, has holed up atop a scrapyard
signal tower with engineer **Mira**, rolling fuel drums down the scaffolding
at anyone who tries to climb up. You play **Rook**, climbing girder by
girder, ladder by ladder, to reach the top and get Mira clear — before
Warden-9 flees to the next tower and does it all again.

## Mechanics

- **Level layout** — each stage is a stack of gently tilted girders
  connected by ladders, ground at the bottom to a top deck at the top where
  Warden-9 and Mira stand. Walking follows the girder's own tilt (you visibly
  walk the incline, not a flat line).
- **Movement** — walk left/right, climb a ladder up/down (grab one by
  standing at its foot/head and holding Up/Down), and jump a real
  gravity-arc (not a teleport) — with a little air control, and enough
  hang-time to clear a barrel if timed well.
- **Barrels** — Warden-9 periodically rolls a drum off the top deck. It
  genuinely **rolls down the platform's own slope** (its on-screen height is
  derived from the same tilt formula the player's walk uses, not a scripted
  path), drops to the next girder down at a wall or a gap, and re-derives its
  roll direction from *that* girder's own tilt — which is what produces the
  classic zigzag descent, not a hardcoded reversal. Occasionally, crossing a
  ladder that leads down from its current girder, a barrel diverts down that
  ladder instead of continuing to the edge (a per-stage chance) — the
  "occasional ladder" variety the genre is known for. Touching one costs a
  life; jumping over one at the right moment does not (see **Physics
  validation** below) and banks a small score bonus.
- **Hazards** — a patrolling **Spark Drone** paces back and forth along one
  girder per stage (also riding that girder's tilt); touching it costs a
  life exactly like a barrel.
- **Pickups** — energy-cell gems along the route for points, and a
  **salvage hammer** power-up: while it's active, walking into a barrel or
  the Spark Drone smashes/stuns it for bonus points instead of costing a
  life, the genre's classic risk-clearing mechanic.
- **Goal** — reach the top deck and walk to Mira to clear the stage. **5**
  distinct hand-authored layouts (different girder-tilt patterns, ladder
  zigzag spacing, gap count, hazard/item placement — see the table below)
  cycle with a continuously ramping difficulty curve (barrel speed and spawn
  frequency, ladder-branch chance, hazard patrol speed) that climbs to a fair
  ceiling by stage 10 and holds there — the run itself is endless, same
  "endless with a cap" philosophy as `games/cross-the-road`.
- **Lives & scoring** — 3 lives; a hit respawns you at the *current* stage's
  start (classic genre behavior — you don't keep your height on that stage,
  but you don't lose the run either); 0 lives ends the run with a results
  screen (stage reached, score, energy cells collected). Score comes from
  height climbed, items collected, a jump-over-barrel bonus, and a
  stage-clear bonus. Your best score persists locally via `OGHProfile`
  (`games/_shared/js/ogh-profile.js`), same convention as `games/pop-the-bugs`.

| Layout | Gaps | Hazard girder | Notes |
|---|---|---|---|
| Entry Deck | 0 | 2 | Tutorial-friendly baseline |
| Coolant Shaft | 0 | 3 | Mirrored tilt pattern, tighter ladder spacing |
| Cargo Bay | 1 | 1 | First gap: barrels/player can fall straight through |
| Reactor Core | 1 | 4 | Gap higher up, hazard right below the top deck |
| Signal Spire | 2 | 3 | Two gaps — the hardest layout in the rotation |

## Controls

| Input | Action |
|---|---|
| ◀ / ▶ buttons, or `←`/`→`, `A`/`D` | Walk left / right |
| ▲ / ▼ buttons, or `↑`/`↓`, `W`/`S` (near a ladder) | Climb up / down |
| JUMP button, or `Space` | Jump (real arc; hold a direction for air control) |

Touch is primary: a D-pad (walk + climb) plus a separate round JUMP button,
matching how this hub's other platformer-adjacent games (`games/fight-arena`,
`games/cross-the-road`) put movement and the main action on distinct touch
targets. Keyboard arrows/WASD + Space are a secondary, optional input.

## Physics validation

The barrel-roll and jump-over mechanics were validated with a standalone
Node script against `stages.js`/`entities.js` directly (both are pure,
DOM-free ES modules) before any canvas/input code was written:

- Barrel position sampled every 5 frames across 80 trials over 12 stages
  confirms rolling barrels sit *exactly* on the current platform's slope
  formula (zero mismatches), that both a plain edge-drop and a ladder-branch
  diversion actually occur, that barrels visit multiple distinct levels while
  descending (not a straight vertical drop), and that every barrel
  eventually resolves (reaches the ground or despawns — no stuck barrels).
- A closing-speed encounter between a stationary player and a barrel, swept
  across ~120 different "frame jump was pressed" offsets, confirms a real,
  contiguous *safe* jump-timing window exists (tuned to roughly a
  quarter-second at stage-1 speed — enough margin for touch input) alongside
  genuinely *unsafe* offsets both too early and too late — i.e. jumping over
  a barrel is an actual timing skill, not a trivial always-safe or
  never-safe mechanic, at both the easiest and hardest difficulty.

`window.OGH_BARREL_CLIMB` exposes the same live state, hitboxes, a
frame-exact `tick()`, direct `setInput()`, and a `jumpToStage(n)` fast-travel
for browser-side testing without playing through every earlier stage.

## Sound

Reuses `games/_shared/js/ogh-sfx.js`'s existing oscillator patterns —
`hop` (jump), `land` (touchdown), `tick` (ladder rung / jump-over bonus),
`die` (hit), `pickup` (gem), `boing` (hammer power-up), `thwack` (smashing a
barrel/drone with the hammer), `win` (stage clear), `tap` (UI) — no new
patterns were needed, so `ogh-sfx.js` itself is untouched.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/barrel-climb/client/
```

## Files

```text
client/
├── index.html   ← layout: header (back/HUD/lang), canvas stage, hammer/stage
│                  banners, on-screen controls, start/game-over overlay
├── style.css    ← neon theme, touch-pad layout, RTL-safe forced-LTR rules
│                  for the tower/controls
├── stages.js    ← pure model: level geometry (tilt/gap math, ladders),
│                  the 5 hand-authored layouts, difficulty curve
│                  (stageParams), and a geometry validator
├── entities.js  ← pure model: player movement/jump/ladder-climb physics,
│                  barrel roll-and-fall simulation, patrol hazard, pickups,
│                  collision — fixed 1/60s steps, no canvas/DOM code
├── render.js    ← all canvas drawing (girders, ladders, Warden-9, Mira,
│                  barrels, Spark Drone, items, player)
├── game.js      ← state machine, input (buttons/keyboard), sfx, i18n
│                  wiring, OGHProfile, scoring, fixed-timestep loop, debug
│                  hook
└── i18n.js      ← en/ru/zh/es/ar/fr strings (RTL-aware; the tower layout
                   and climb/walk directions never mirror — see index.html's
                   dir="ltr")
```

No bundled image or audio assets. MIT licensed, same as the hub.
