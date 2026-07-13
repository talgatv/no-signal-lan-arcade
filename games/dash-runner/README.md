# Dash Runner

**Solo pseudo-3D endless runner.** Ember, a small neon glow-fox, auto-runs
down an endless night trail at an ever-increasing speed. You never control
forward speed directly — only which of 3 lanes Ember is in, and whether
she's jumping, ducking, or standing. The trail is rendered in genuine
pseudo-3D — it narrows toward a horizon with a perspective projection,
obstacles/coins scaled by distance — not a flat side-view strip, using the
same projection technique as `games/cross-the-road/`.

## Controls

| Input | Action |
|---|---|
| Swipe left/right on the trail, or the ◀ / ▶ buttons | Change lanes |
| Swipe up on the trail, or the ▲ button | Jump (real gravity arc) |
| Swipe down on the trail, or the ▼ button | Duck (fixed-length slide) |
| `←` / `A`, `→` / `D` | Change lanes |
| `↑` / `W` | Jump |
| `↓` / `S` | Duck |

Touch is primary: on-screen buttons are large, fixed-position touch targets
in a plus/D-pad layout (jump on top, duck on bottom, lanes on the sides), and
swipe/tap detection on the trail itself is a second, more immersive way to
play (whichever axis — horizontal or vertical — the gesture moves further
past a small threshold decides lane-change vs. jump/duck; a short gesture
below the threshold is a plain tap and deliberately does nothing, so an
imprecise swipe can't misfire — use the buttons if that happens). Keyboard
arrows/WASD are a secondary, optional input. Lane-change is a smooth
tween, never an instant teleport; jump integrates real gravity (rises, decelerates,
falls) rather than snapping up and down.

## Obstacles

Three distinct types, each requiring a different response — placed with a
comfortable, time-based minimum lead distance (see "Fairness" below) so
reacting is always fair, never a cheap surprise:

- **Low** (amber log/rock) — blocks the ground. Jump over it.
- **High** (violet hanging vine-arch) — blocks head height but leaves the
  ground clear. Duck under it.
- **Full** (red pillar) — spans the entire reachable height, top to bottom.
  Neither jump nor duck helps — change lanes to dodge it.

Collision uses one unified test across three independent axes (which lane,
whether the obstacle's world-position currently overlaps the player's,
and whether the player's current vertical extent overlaps the obstacle's
vertical band) — see `track.js`'s header comment for the exact model, and
its `findObstacleHit()`/`playerVerticalInterval()`/`obstacleVerticalInterval()`
for the checkable functions themselves.

## Fairness — obstacles never trap you

Every generated segment places an obstacle in **at most 2 of the 3 lanes**
— `pickObstacleLaneCount()` in `track.js` can only ever return 0, 1, or 2,
so at least one lane is always fully clear at any single segment, by
construction, not by chance.

That alone isn't quite enough: a segment leaving lane 0 clear immediately
followed by one leaving only lane 2 clear would demand a two-lane dodge with
no time to execute it. So consecutive segments are also spaced with a
**time-based** gap floor (`GAP_SEC_FLOOR` in `track.js`, converted to
world-units via the current `speedForDistance()` so the floor holds however
fast the run gets) sized so a worst-case edge-to-edge lane change — two
chained lane-change tweens plus a reaction buffer
(`LANE_CHANGE_SAFETY_MIN_SEC`) — always has time to complete before the next
segment arrives. `track.js` throws at load time if a future tuning pass ever
shrinks the gap floor below that requirement.

`track.js` exports `getFairnessReport(track)`, which scans a generated
track and directly reports whether any segment ever blocks all 3 lanes
(`allLanesBlockedCount`, must be 0) or leaves a lane unreachable in time
from the previous segment (`unreachableCount`, must be 0) — a real
inspection of the generated layout, not an eyeballed guess. The debug hook
(`window.OGH_DASH_RUNNER`) exposes the live track and this report for direct
testing in the console.

## Difficulty ramp

Speed is a **pure function of distance** (`speedForDistance()` in
`track.js`, also reachable at `window.OGH_DASH_RUNNER.TRACK.speedForDistance(d)`
for direct inspection): it climbs from 5 to 11 world-units/second over the
first 260 units of distance, then holds at that cap forever — the run
itself is endless; distance 5000 plays exactly as fast as distance 500.
Obstacle density (chance of a 2-lane pattern vs. a clear breather) also
ramps up over the same stretch before holding, so the run keeps getting
busier as well as faster.

## Collectibles

Fireflies (coins) run in short guided lines through the always-clear lane at
each segment, plus a friendly warm-up line before the very first obstacle.
Each is worth points and nudges you toward the safe path. A rare comet-shard
power-up grants ~5 seconds of "blaze" mode (invincibility — Ember flickers
gold/cyan and any obstacle hit is smashed through with a burst of particles
instead of ending the run).

## Scoring & high score

Score is **distance traveled** (shown live, in meters) **plus coins
collected** (5 points each) — shown together on the crash screen. Your best
**distance** persists locally via `OGHProfile`
(`games/_shared/js/ogh-profile.js`, the same convention as
`games/cross-the-road` and `games/pop-the-bugs`) — no server, survives a
page reload, shows in the hub's profile drawer.

## Pseudo-3D rendering

`render.js` reuses `games/cross-the-road/client/render.js`'s exact
`scale = FOCAL / (FOCAL + depth)` perspective divide: screen Y, on-screen
width, and every sprite's size are scaled by that same per-depth factor, so
the trail visibly narrows into a horizon. Unlike cross-the-road's discrete
traffic rows, Dash Runner's world is continuous, so the ground and lane
dividers are drawn as many small stacked depth-bands rather than one giant
trapezoid — over a longer visible range a single straight-edged shape would
noticeably deviate from the true (slightly curved) perspective line.
Lane-divider dashes and the parallax pine-tree treeline are anchored to
world position (not screen position), so they flow smoothly toward the
camera as distance increases. The camera rides with the player (always at
depth 0, screen-anchored). Trail, obstacles, coins, and Ember are all canvas
vector shapes with a neon glow filter — no bitmap sprites.

## Sound

Reuses `games/_shared/js/ogh-sfx.js`'s tiny oscillator beeps — `hop` for a
jump lift-off, `land` for a real-gravity touchdown, `tick` for a lane change
(the same convention cross-the-road set for its own within-lane dodge),
`pickup` for a coin, `die` for a crash, `win` for both a power-up activating
and a new best distance, `boom` for smashing through an obstacle while
invincible, and `tap` for UI buttons — extended with exactly one new
pattern: `duck`, a quick downward pitch sweep for the crouch/slide motion
that nothing existing captured.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/dash-runner/client/
```

## Files

```text
client/
├── index.html   ← layout: header (back/HUD/lang), canvas stage, hint,
│                  plus-shaped on-screen controls, start/game-over overlay
├── style.css    ← neon theme, perspective-canvas sizing, D-pad touch
│                  controls, RTL-safe forced-LTR rules for the trail/controls
├── track.js     ← pure model: speed ramp (speedForDistance), lane/vertical
│                  geometry, obstacle/coin/power-up generation, all
│                  collision math, getFairnessReport() — no canvas/DOM code
├── render.js    ← pseudo-3D projection + all canvas drawing (trail,
│                  obstacles, coins, power-ups, Ember, particles)
├── game.js      ← state machine, input (buttons/swipe/keyboard), sfx, i18n
│                  wiring, OGHProfile, single RAF loop, debug hook
└── i18n.js      ← en/ru/zh/es/ar/fr strings (RTL-aware; the trail/lane
                   layout and lane-change directions never mirror — see
                   index.html's dir="ltr")
```

No bundled image or audio assets. `window.OGH_DASH_RUNNER` exposes live
state, the `track.js` module directly (including `getFairnessReport()` and
`speedForDistance()`), directly-checkable hitboxes via `getPlayerHitbox()`,
a `tick(dt)` for manually stepping frames with an explicit timestep, and a
`jumpToDistance(d)` fast-travel for automated testing of the difficulty ramp
without playing through it in real time.

MIT licensed, same as the hub.
