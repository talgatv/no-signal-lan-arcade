# Cross the Road

**Solo pseudo-3D arcade.** A Frogger-style "cross the road" game: hop forward lane by
lane, dodge the traffic, don't get hit. Unlike the 1981 original's flat top-down grid,
the road is rendered in genuine pseudo-3D — lanes recede toward a horizon (a
trapezoidal perspective projection with vehicles and lane widths scaled by distance),
not a flat overhead board.

## Controls

| Input | Action |
|---|---|
| Tap the road, or the ▲ button | Hop forward one lane |
| Swipe left/right on the road, or the ◀ / ▶ buttons | Dodge within the current lane |
| `↑` / `W` | Hop forward |
| `←` / `A`, `→` / `D` | Dodge left / right |

Touch is primary: on-screen buttons are large (56–84px) fixed-position touch targets,
and swipe/tap detection on the road itself is a second, more immersive way to play (a
short, mostly-vertical/small movement reads as a tap = hop; a clearly horizontal
movement past a small threshold reads as a swipe = dodge). Keyboard arrows/WASD are a
secondary, optional input. There is no backward move.

Movement uses the classic Frogger control scheme: hop forward one row at a time,
dodge left/right within a row before it's safe to advance. Landing position updates
and is collision-checked **instantly** on input (every frame, against current vehicle
hitboxes) — a short (~150ms) tween only animates the sprite/camera and briefly
debounces input so animations don't overlap; it never grants invulnerability.

## Difficulty ramp — the road gets wider *and* harder

Each **stage** is a run of traffic lanes ending in a safe median; landing on the
median clears the stage. Clearing a stage grows the road (more lanes to cross) and
raises the danger, both as real, continuous curves (see `stageParams()` in `road.js`,
also on `window.OGH_CROSS_ROAD.ROAD.stageParams(n)` for direct inspection):

- **Lane count** grows by exactly 1 every stage — 3 lanes at stage 1 up to 9 at stage
  7 — then holds at that cap so the board stays a bounded, readable size.
- **Vehicle speed**, **traffic density** (the gap between vehicles), and the **chance
  of a wide truck/bus** instead of a car all ramp continuously from generous starting
  values to a much harder ceiling, reached by stage 16, and hold there — the run
  itself is endless; stage 20 is exactly as hard as stage 200.
- The minimum gap between vehicles never drops below a floor wide enough for a
  stationary player to fit through with a little room to spare — however fast/dense
  traffic gets, it's deliberately never a literal, un-crossable wall (same "floor
  clamp" fairness philosophy as `games/pop-the-bugs`' spawn-timing floors). Every
  freshly generated lane also guarantees a clear gap straddling the column you're
  about to enter it from, so a brand-new lane can never be an unavoidable instant hit
  before its traffic has had any time to move — found and fixed during testing via
  the debug hook's `getRowHitboxes()`, not by eyeballing.
- Vehicles in a lane share one lane-wide, alternating-by-lane direction/speed (even
  lanes run left→right, odd lanes right→left) — different lanes have different
  speeds, not individual cars within one lane.

## Pseudo-3D rendering

`render.js` projects the road with a standard perspective divide,
`scale = FOCAL / (FOCAL + depth)`: each lane's screen Y, on-screen width, and every
vehicle/player sprite size are scaled by that same factor, so lanes visibly narrow
into a trapezoid toward a horizon line instead of being drawn as a flat grid. The
camera rides with the player (always at depth 0, screen-anchored), so advancing a
lane smoothly slides the whole scene — a cheap parallax skyline in the sky band
reinforces the forward motion. Road, lane markings, traffic, and the runner are all
canvas vector shapes with a neon glow filter — no bitmap sprites.

## Scoring & high score

Score is **distance** — the number of lanes successfully advanced (shown live, and as
a "Stage N · Distance M" summary on crash). Your best distance persists locally via
`OGHProfile` (`games/_shared/js/ogh-profile.js`, the same convention as
`games/pop-the-bugs`) — no server, survives a page reload, shows in the hub's profile
drawer.

## Sound

Reuses `games/_shared/js/ogh-sfx.js`'s tiny oscillator beeps (`tick` for a dodge,
`win` for a stage clear, `die` for a crash, `tap` for UI), extended with two new
patterns in the same no-sample-files style (following how `games/neon-drift` added
`screech` and `games/penguin-fling` added `thwack`/`boing`/`whoosh`/`land`): `hop` (a
bouncy two-note chirp for the very-frequent forward-hop action) and `honk` (a sparse,
cooldown-throttled ambient car-horn cue, boosted when a truck is nearby — pure
atmosphere, not tied to collision).

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/cross-the-road/client/
```

## Files

```text
client/
├── index.html   ← layout: header (back/HUD/lang), canvas stage, hint, on-screen
│                  controls, start/game-over overlay
├── style.css    ← neon theme, perspective-canvas sizing, touch controls, RTL-safe
│                  forced-LTR rules for the road/controls
├── road.js      ← pure model: difficulty curve (stageParams), lane/vehicle
│                  generation, collision math — no canvas/DOM code
├── render.js    ← pseudo-3D projection + all canvas drawing (road, traffic,
│                  player, particles)
├── game.js      ← state machine, input (buttons/swipe/keyboard), sfx, i18n
│                  wiring, OGHProfile, single RAF loop, debug hook
└── i18n.js      ← en/ru/zh/es/ar/fr strings (RTL-aware; the road/lane layout and
                   dodge directions never mirror — see index.html's dir="ltr")
```

No bundled image or audio assets. `window.OGH_CROSS_ROAD` exposes live state,
directly-checkable hitboxes, `ROAD.stageParams(n)`, and a `jumpToStage(n)` fast-travel
for automated testing without playing through every earlier stage in real time.

MIT licensed, same as the hub.
