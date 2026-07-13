# Hill Rider

**A side-view physics hill-climbing driving game.** Gas and brake are your only controls — there's
no steering. Roll a two-wheeled rover across endless procedurally-generated bumpy terrain, tilt to
match the slope under your wheels, launch off crests and jumps, rotate in mid-air to land level,
collect coins and fuel canisters, and don't flip or run dry. This is an original game in the classic
"gas/brake only, bumpy terrain, momentum and tilt, don't crash or run out of gas" genre (Hill Climb
Racing is the reference point for the genre only — an original rover, setting and neon-vector art,
no copied content).

## The physics (the point of the genre)

Movement lives in [`client/vehicle.js`](client/vehicle.js) and [`client/terrain.js`](client/terrain.js):

- **Terrain is a pure function of x.** `terrain.js`'s `heightAt(x)` combines a few sine layers at
  different wavelengths ("rolling hills"), a smoothed 1-D value-noise layer for irregularity, and
  occasional localized raised-cosine bumps ("jump" features) — no seed, no precomputed chunks. The
  strip is trivially endless: querying further out just evaluates the same formula at a bigger `x`.
  The first ~500 units ease flat so every run starts on fair, safe ground.
- **Wheels individually follow the terrain.** Every frame, `stepVehicle` samples `heightAt` under a
  front and a rear wheel offset and derives the chassis angle from the line between those two contact
  points — the body visibly tilts to match the slope under it, not just translated in a straight
  line.
- **Grounded vs. airborne is resolved by one comparison.** Each frame computes (a) where gravity
  alone would put the chassis (a ballistic free-fall candidate) and (b) where the terrain-contact
  line actually is at the vehicle's tentative new x. If the ballistic candidate has reached or passed
  the contact line, the ground catches it; otherwise it's still airborne. This single check naturally
  covers ordinary rolling-hill driving, launching off a crest that falls away faster than gravity can
  follow, and landing — there's no separate "am I taking off" special case.
  Gravity also pulls along the slope while grounded (steep climbs cost real speed, descents build it),
  and landing projects the airborne velocity onto the new surface tangent (the impact/perpendicular
  component is absorbed, not bounced — suspension, not a trampoline).
- **Gas tips the nose up, brake tips it down — on the ground and in the air.** While grounded, a
  small cosmetic tilt offset (eased in/out) rides on top of the terrain angle: gas noses up a touch,
  brake noses down, the authentic weight-transfer cue this genre always has. While airborne (both
  wheels off the ground), gas/brake instead directly accelerate the chassis's free rotation — the
  genre's core air-control skill, used to level out for a landing or rotate into a jump.
- **Crash detection is gated to grounded frames only.** Tilting past ~95 degrees while actually
  touching/resting on the terrain — including a hard nose- or tail-first landing — ends the run.
  Rotating through *any* angle purely in mid-air, however extreme, never crashes on its own: that
  freedom is the entire point of the air-tilt control above, and crashing mid-flip before ever
  landing would make it useless.

`window.OGH_HILL_RIDER` exposes the live vehicle, terrain's `heightAt`/`slopeAt`, and a few test
hooks (`setFuel`, `snapToGround`, `tick`) for direct inspection — e.g. comparing `car.angle` at a
given x against `slopeAt(x, CAR_CFG.WHEEL_OFFSET)` instead of eyeballing the correlation.

## Play

- **Fuel:** drains with speed (a distance proxy) plus a small idle trickle. Fuel canisters sit low
  along the route, always reachable by normal driving — never gated behind a risky jump the way a
  coin sometimes is. Run the tank dry and gas stops working (braking and air-tilt still work); the
  run ends once the vehicle coasts to a stop.
- **Coins:** float along the route, sometimes requiring a small hop, and add to your coin count —
  separate from fuel.
- **Scoring:** primarily distance (how far you got before crashing or running out of fuel), plus
  coins collected. A local high score for best distance, saved via `OGHProfile` (same convention as
  `games/pop-the-bugs`).

## Controls

**Touch (primary):** two large hold buttons — **BRAKE** bottom-left, **GAS** bottom-right. Hold
either for continuous input; both also rotate the vehicle while airborne.

**Desktop (bonus):** `↑` / `W` for gas, `↓` / `S` for brake.

The terrain, the vehicle's forward direction and the chase camera never mirror under RTL (Arabic) —
only the header, cards and hint text flip. A physics simulation with a fixed "forward" has no
reading direction, and mirroring it would invert which button accelerates against a control scheme
that has nothing to do with text layout (stage is `dir="ltr"`, `ctx.direction` forced to `'ltr'`).

## How to run

```bash
cd pc && ./start.sh
# then open:
# http://127.0.0.1:8080/games/hill-rider/client/
```

Add `?lang=ru` (or `zh`, `es`, `ar`, `fr`) to the URL to force a language.

## Files

```text
games/hill-rider/
├── manifest.json     ← pack metadata (id, controls, notes)
├── README.md          ← this file
└── client/
    ├── index.html    ← header/HUD (distance/coins/fuel gauge), canvas stage, brake/gas buttons, overlay cards
    ├── style.css     ← neon-vector chrome on ogh-base.css + touch controls + fuel gauge
    ├── i18n.js       ← en/ru/zh/es/ar/fr strings (RTL-aware; the play field never mirrors)
    ├── terrain.js    ← procedural heightAt(x)/slopeAt(x), coin/fuel slot placement, terrain rendering
    ├── vehicle.js    ← gas/brake-only vehicle physics: ground-follow tilt, airborne rotation, crash detection
    └── game.js       ← state, camera, fuel/coins/distance, collisions, input, HUD, sound, i18n wiring, render loop
```

No bundled image or audio assets: the terrain, rover and collectibles are all Canvas 2-D neon-vector
line-art with a glow, and every sound is synthesized via `games/_shared/js/ogh-sfx.js`'s tiny
oscillator helper — almost entirely reused unchanged (`whoosh` on a timer while gas is held reads as
an engine note, `pickup` = coin, `die` = crash, `land` = wheels-down thud, `tick` = coasted-out-of-fuel
end) plus one new pattern this game needed, `refuel` (a low descending glug, pitched well below
`pickup`'s bright chime so a coin and a fuel canister never sound alike). Only the chosen language is
persisted between sessions.

MIT licensed, same as the hub.
