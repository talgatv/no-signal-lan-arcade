# Neon Drift

Neon **top-down racing** on a real, hand-varied circuit — not an oval.

This is a from-scratch sibling to [Pulse Race](../pulse-race/), built specifically to
fix what made that one forgettable: a single ellipse track with no corners to learn,
zero car-to-car contact, a static whole-track camera with no sense of speed, AI that
just glides down the centerline, and cars that were literally a rectangle. Neon Drift
keeps the same controls and offline-solo-plus-AI shape, but replaces every one of
those with a real system. `games/pulse-race/` is untouched — both games live side by
side in the hub.

## What's actually different

- **A real circuit.** The centerline is a closed **centripetal Catmull-Rom spline**
  through 16 waypoints (`client/track.js`), densely resampled into a 400-point
  arc-length lookup table — not an ellipse formula. It reads as an actual track: a top
  straight, a sweeping right-hander, a back straight, a tight hairpin loop-back, an
  S-kink chicane, a bottom sweeper, a long left-hand corner, and a short return
  straight. Centripetal parameterization (rather than uniform Catmull-Rom) is what
  keeps the spline from overshooting/self-intersecting at the chicane, where waypoints
  sit much closer together than on the straights.
- **A chase camera + minimap.** The canvas follows the player car (north-up, no world
  rotation) with a subtle speed-based zoom and hit-triggered screen shake, instead of
  showing the whole track at a fixed zoom all the time. A small canvas-drawn minimap
  in the corner keeps you oriented since you can now only see a local part of the
  circuit.
- **Real car-to-car collision.** Circle-based overlap detection each frame; on contact
  cars are pushed apart along the collision normal and exchange velocity
  (impulse-style, with damping) — bumping, blocking, and contact racing are real here,
  not ghosts sharing a lane.
- **An actual drift mechanic.** Each car has a facing angle (driven by steering) and a
  separate velocity vector; normally "grip" snaps the velocity to the facing direction
  almost instantly, but steer hard above a speed threshold and grip drops, so the
  velocity lags behind the facing angle and the car visibly slides toward the outside
  of the turn — tire smoke, skid marks on the track, and a screech sound accompany it.
  Sustain a drift for at least ~0.35s and exiting it (straighten out) grants a speed
  boost and a score bonus; the same grip mechanism is reused for collision response,
  so a hit knocks the car into a brief believable slide rather than snapping instantly.
- **Apex-biased, rubber-banded AI.** AI cars steer toward a lookahead point biased
  toward the inside of the upcoming bend (based on how much the track curves further
  ahead), not the raw centerline, and they brake proportionally to how sharp the
  upcoming turn is instead of holding full throttle into corners they can't make. Mild
  rubber-banding (relative to the live field average, not just the player) keeps races
  close. AI cars run through the exact same `updateCar`/collision code as the player,
  so they drift through the hairpin and bump into each other and you too.
- **Sense of speed.** Speed-streak particles at high velocity, camera shake on hard
  hits or going off-track, and screech/crash/pickup audio feedback layered on top of
  the systems above.

## Controls

Same muscle memory as Pulse Race:

| Touch | Keys |
|-------|------|
| Hold gas | W / ↑ |
| ← → steer | A/D or ← → |
| Brake | S / ↓ / Space |

Touch-primary with keyboard/mouse as alternatives (`controls.primary: "touch"`).

## Languages

Full UI in English, Russian, Chinese, Spanish, Arabic, and French
(`client/i18n.js`), including RTL layout for Arabic. The track, minimap, and
on-screen steer/gas/brake buttons deliberately **never** mirror under RTL — they're
spatial gameplay, not text (the canvas's 2D context `direction` is explicitly forced
to `ltr` for the same reason, since it otherwise inherits from the page and could
silently flip `fillText` positioning).

## Run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/neon-drift/client/
```

## Files

```text
client/
├── index.html   ← layout: HUD, canvas, touch controls, start/finish overlays
├── style.css    ← neon theme, canvas-shell layout, RTL-safe control row
├── track.js     ← spline construction, trackPoint/progressOf/distToCenterline/
│                  onTrack, apex-bias helper, track + minimap rendering
├── physics.js   ← car model, drift/grip physics, collision resolution, AI
├── game.js      ← state, camera, particles/skid marks, HUD, i18n wiring, net
└── i18n.js      ← en/ru/zh/es/ar/fr strings
```

`track.js`'s `trackPoint`/`progressOf`/`distToCenterline`/`onTrack` mirror the exact
function names/signatures from `games/pulse-race/client/game.js`, just backed by the
spline-sampled path instead of ellipse formulas.

## Multiplayer

See [docs/architecture/MULTIPLAYER.md](../../docs/architecture/MULTIPLAYER.md). Wired
the same way as Pulse Race: `OGHNet.connect({ gameId: 'neon-drift' })` runs offline
with AI when no host `/ws` is reachable, and reports online mode (relay-only for now)
when one is.

MIT licensed, same as the hub.
