# Void Drift

**A Newtonian-physics space shooter.** Rotate and thrust a drifting ship through the void, blast
asteroids into smaller asteroids, dodge the odd UFO looking for a fight, and watch both edges of the
screen — everything wraps. This is an original game in the classic "rotate/thrust ship, shoot and split
asteroids, screen wraps" arcade genre (no copied assets or content — an original vector-line take in
this hub's own neon-vector style).

## The physics (the point of the genre)

Movement lives in [`client/physics.js`](client/physics.js) and is real momentum-based Newtonian
physics, not an arcade "moves where you point" control scheme:

- **Turning never touches velocity.** The left/right controls only ever change the ship's facing
  angle. A ship that is drifting and gets turned keeps drifting at the exact same speed, in the exact
  same direction, no matter which way it now points.
- **Thrust accumulates onto existing velocity**, along the *current* facing direction — it never
  snaps velocity to match facing. Burn thrust facing up, then rotate to face sideways without
  thrusting again, and the ship keeps sliding in its old (upward) direction while visually pointing
  sideways. Thrust again and the new acceleration *adds* to what's already there, producing a genuinely
  diagonal resultant. This "drift while turning" feel is the single most defining characteristic of
  the genre.
- **Gentle drag** scales the velocity vector's *magnitude* over time (never its direction), so momentum
  clearly carries for several seconds after a burn but the ship isn't stuck coasting forever — a common
  modern take on the original 1979 game's zero-friction space.
- **Screen wraparound** applies independently to the ship, every asteroid, every bullet and the UFO:
  exit one edge, re-enter the opposite one, position wrapped exactly (never clamped or destroyed).
  Collision distance is computed the same *toroidal* way (`toroidalDistance` in physics.js), so a
  bullet near one edge can still hit a rock that has already wrapped to the opposite edge — and the
  renderer draws a "ghost" copy of anything crossing the seam so it's visibly on both edges at once
  instead of popping.

`window.OGH_VOID_DRIFT` exposes live ship/state/config for direct inspection (handy for confirming the
above without eyeballing it — e.g. `ship.angle` vs. `Math.atan2(ship.vy, ship.vx)` diverge exactly when
you'd expect).

## Play

- **Waves:** each wave starts with a set number of large asteroids, tumbling with their own
  independent drift and spin. Clearing every asteroid (down through all of its splits) advances to the
  next wave with more, faster rocks — `waveConfig(n)` in `game.js` ramps the large-asteroid count
  (4 → 11) and a speed multiplier (1x → 2.2x) well past wave 5 before capping, and UFOs start showing
  up more often too.
- **Asteroids:** shooting a large rock splits it into 2-3 medium rocks; shooting a medium rock splits
  it into 2-3 small rocks; a small rock is destroyed outright. Each split inherits half the parent's
  drift plus a fresh randomized kick so the pieces visibly scatter. Bigger rocks are worth fewer points
  (20) but are slow and have a big hitbox; smaller rocks are worth more (50 / 100) but are fast and easy
  to miss.
- **UFO:** an occasional saucer crosses the field on its own gentle sine-wave path and takes
  aimed-but-imperfect shots at you. Shoot it down for a bonus (200 pts); colliding with its hull costs a
  life just like an asteroid would.
- **Lives:** you start with 3 ships. Colliding with an asteroid, the UFO, or a UFO bolt costs a life.
  Losing a ship (with lives remaining) respawns you at center with a brief invulnerability window (the
  ship blinks) so you can't be hit again the instant you reappear. Lose your last ship and it's game
  over, with a results screen and a local high score (saved via `OGHProfile`, same convention as
  `games/pop-the-bugs`).

## Controls

**Touch (primary):**

| Action | Control |
|--------|---------|
| Rotate left / right | **◁ / ▷** (bottom-left D-pad) |
| Thrust | **▲** (bottom-left D-pad) |
| Fire | **●** (bottom-right; hold any button to keep rotating/thrusting/firing) |

**Desktop (bonus):** `← →` (or `A`/`D`) rotate, `↑` (or `W`) thrusts, **Space** fires.

Fire has a short cooldown (not full-auto) — a deliberate, genre-authentic limit so spamming shots isn't
free. The play field, the wraparound behavior and the rotate-button meanings never mirror under RTL
(Arabic) — only the header, cards and hint text flip. A physics simulation has no "reading direction,"
and flipping rotate-left/rotate-right would invert muscle memory against a control scheme that has
nothing to do with text layout.

## How to run

```bash
cd pc && ./start.sh
# then open:
# http://127.0.0.1:8080/games/void-drift/client/
```

Add `?lang=ru` (or `zh`, `es`, `ar`, `fr`) to the URL to force a language.

## Files

```text
games/void-drift/
├── manifest.json     ← pack metadata (id, controls, notes)
├── README.md         ← this file
└── client/
    ├── index.html    ← header/HUD, canvas stage, touch D-pad, overlay cards
    ├── style.css     ← neon-vector chrome on ogh-base.css + touch controls
    ├── i18n.js       ← en/ru/zh/es/ar/fr strings (RTL-aware; the play field never mirrors)
    ├── physics.js    ← ship/bullet Newtonian movement + toroidal wrap/collision math
    ├── asteroids.js  ← asteroid spawn/split model + UFO spawn/path/fire AI
    └── game.js       ← state, waves, lives/scoring, collisions, input, HUD, render loop
```

No bundled image or audio assets: the ship, asteroids, UFO, bullets and starfield are all Canvas 2-D
neon-vector line-art with a glow, and every sound is synthesized via `games/_shared/js/ogh-sfx.js`'s
tiny oscillator helper (reused unchanged — `pop` fire, `thwack` asteroid split, `pocket` asteroid/UFO
destroyed, `splat` life lost, `die` game over, `win` wave clear, `screech` UFO fires, `whoosh` thrust).
Only the chosen language is persisted between sessions.

MIT licensed, same as the hub.
