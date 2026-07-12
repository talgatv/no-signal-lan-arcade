# Storm Warden

**An atmospheric precision timing-and-placement game.** A silhouetted village sleeps at the bottom
of a rainy night sky. A wild storm keeps threatening it, one roof at a time — watch the sky, catch
each charge as it builds, and cast a controlled bolt at exactly the right place and moment to ground
it safely before it strikes home. This is an original concept (a village-at-night-in-the-rain
lightning-warden game) with its own game loop — not a clone of any existing title.

## The game loop

1. **Telegraph.** A charge flickers to life in the sky above one of the village's six buildings and
   builds toward a peak over a fair warning window (1.5-3 seconds early on, shrinking as the session
   goes on) — a growing glow with a jittering tendril reaching toward the roof, flickering faster and
   brighter as it nears peak. The threatened building's roofline also picks up a warm-to-red danger
   glow so it reads at a glance.
2. **Cast.** Tap or click that building before the charge peaks. A well-timed cast fires a jagged,
   glowing bolt from the village's grounding spire up to the charge and safely earths it — the
   building stays lit. Timing is scored on a curve: casting near peak (more risk, since the window is
   about to close) scores far more than an early, safe tap, with three feedback tiers:
   - **Early** (charge < 40%) — safe, modest points.
   - **Good** (40-78%) — solid timing, solid points.
   - **Perfect** (78%+) — cast right before peak for the most points.
3. **Placement matters independently of timing.** A tap only resolves the threat if it lands on the
   *threatened* building — tapping any other building (or an idle one) fizzles harmlessly and does
   nothing to the real threat, which keeps charging.
4. **Failure.** If a charge reaches full peak with no cast — or every cast on it missed the mark — the
   wild bolt strikes the roof directly. The building goes dark and scorched (charred silhouette,
   windows out, a few rising smoke wisps) for the rest of the session and counts toward a buildings-
   lost tally. Lose 4 of the 6 buildings and the storm wins outright, before the clock runs out.
5. **Progression.** Threats escalate over the ~100-second session: they spawn more often, their
   telegraph window shrinks, and by the back third of a session up to three can be charging across the
   village at once — see `difficultyAt()` in `client/lightning.js` (a pure function of elapsed time,
   directly inspectable via `window.OGH_STORM_WARDEN.difficultyAt`).
6. **Session end.** Survive the full session (dawn breaks — a win) or lose 4 buildings first (the storm
   wins) and a results screen shows your final score, how many of the 6 buildings are still standing,
   and a local high score (saved via `OGHProfile`, same convention as `games/pop-the-bugs` and
   `games/void-drift`).

## Controls

**Touch/click (primary):** tap or click directly on the building where a charge is flickering, any
time during its charge window, via Pointer Events.

**Desktop bonus:** number keys `1`-`6` cast on the matching building, left to right (skipping the
grounding spire, which is never a target).

## How to run

```bash
cd pc && ./start.sh
# then open:
# http://127.0.0.1:8080/games/storm-warden/client/
```

Add `?lang=ru` (or `zh`, `es`, `ar`, `fr`) to the URL to force a language.

## Files

```text
games/storm-warden/
├── manifest.json     ← pack metadata (id, controls, notes)
├── README.md          ← this file
└── client/
    ├── index.html     ← header/HUD, canvas stage, overlay cards
    ├── style.css      ← neon-vector chrome on ogh-base.css, tuned to a moodier storm palette
    ├── i18n.js        ← en/ru/zh/es/ar/fr strings (RTL-aware; the storm scene never mirrors)
    ├── lightning.js   ← pure: threat charge lifecycle, difficulty ramp, timing-precision scoring
    │                     curve, and the midpoint-displacement jagged bolt path generator + glow stroke
    ├── village.js     ← pure: building silhouette profiles, windows, layout, the grounding spire,
    │                     X-position hit-testing
    ├── rain.js        ← pure: two-depth-layer falling-raindrop particle system
    └── game.js        ← state, spawner, scoring, input, HUD, i18n wiring, and every ctx.* draw call
```

`lightning.js`, `village.js` and `rain.js` are pure data/geometry modules with no DOM access — `game.js`
is the only place that touches `ctx` or mutates session state, and it exposes
`window.OGH_STORM_WARDEN` (state, `difficultyAt`, `scoreForCharge`/`ratingForCharge`, `forceThreat()`,
`tick()`) so the whole charge/timing/difficulty model can be driven and inspected deterministically
without waiting out real time.

No bundled image or audio assets: the sky, rain, village and every bolt are Canvas 2D vector shapes
with a neon-vector glow, and sound reuses `games/_shared/js/ogh-sfx.js` — `tick` (charge-pulse
countdown), `screech` (a wasted/wrong-position cast), `tap`/`win`/`die` (menus and session end)
unchanged, plus two new patterns added this session: `zap` (a successful cast) and `thunder` (a
noise-like layered-low-oscillator strike crack for a building actually getting hit). Only the chosen
language is persisted between sessions.

MIT licensed, same as the hub.
