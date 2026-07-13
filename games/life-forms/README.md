# Life Forms

**A solo cellular-automaton toy — Conway's Game of Life.** Draw a starting pattern, drop in
a famous preset, or scatter a random soup, then watch it evolve one generation at a time.
No score, no win condition, no timer: a calm, contemplative sandbox for watching simple
rules create complex, sometimes beautiful, behavior.

## The rules

Standard Conway's Game of Life, computed fresh each generation from a clean snapshot of the
previous one (never mutated mid-scan, the classic bug this simulation genre invites):

- A **live** cell with **2 or 3** live neighbors survives to the next generation.
- A **dead** cell with **exactly 3** live neighbors is born.
- Every other cell dies (isolation or overcrowding) or stays dead.

Each cell counts its 8 surrounding neighbors (including diagonals). The grid **wraps
toroidally** — a live cell on the right edge counts neighbors across to the left edge, and
likewise top/bottom — so nothing is artificially starved by a hard boundary; a glider (or a
Gosper gun's stream of gliders) that reaches an edge simply continues on the opposite side.

## Preset patterns

A small library of famous, well-documented patterns, grouped by category and reachable from
the **Patterns** button (each drops in centered on the grid):

| Category | Patterns |
|---|---|
| Still lifes (never change) | Block, Beehive |
| Oscillators (repeat with a fixed period) | Blinker (period 2), Toad (period 2), Beacon (period 2), Pulsar (period 3) |
| Spaceships (translate indefinitely) | Glider (period 4, moves one cell diagonally every 4 generations) |
| Guns (periodically emit spaceships) | Gosper glider gun (36 cells, emits a new glider every 30 generations) |

Every pattern here was checked against its known, documented real-world behavior (still
lifes genuinely unchanged, oscillators returning to their *exact* starting cells after their
real period, the glider's bounding box shifting by exactly one cell diagonally every 4
generations with constant population, the gun's live-cell count growing as it keeps
emitting) before shipping.

## Beautiful effects

Cells are never flat on/off squares:

- A newly-born cell **fades and grows in** with a warm glow; a dying cell **fades and
  shrinks out** in whatever color it had the instant before it died — nothing ever just
  snaps, every generation transition is smoothly animated.
- Cells are colored by **age** (how many consecutive generations they've stayed alive) along
  a warm-to-cool gradient — newborn cells glow a bright near-white gold, then amber, then
  pink, cooling through cyan to a deep violet for long-lived survivors — a heatmap of the
  simulation's history at a glance.
- A soft neon **glow/bloom** halos every live cell, composited from a blurred, additively
  blended copy of the grid under a crisp top layer, matching this hub's neon-vector look
  (see `games/comet`, `games/void-drift`).
- A faint dot at every empty cell gives a usability reference for precise tapping without
  the grid ever looking like a sterile checkerboard.

## Controls

Touch/click first, via Pointer Events:

- **Tap** a cell to toggle it alive/dead (while paused).
- **Drag** across cells to paint or erase a run of them — the first cell your stroke touches
  decides whether the drag paints or erases, so retracing your own stroke doesn't flicker
  cells back off.
- Touching the grid while the simulation is running **pauses it first**, so drawing always
  behaves like the "toggle while paused" rule rather than silently doing nothing.

Toolbar buttons: **Play**/**Pause** (continuous evolution at the chosen speed), **Step**
(advance exactly one generation — useful for watching a pattern's behavior closely),
**Randomize** (scatter a random soup at ~28% density), **Clear** (wipe to empty), and
**Patterns** (the preset library above). A speed slider controls generations per second
(1–20). A small speaker icon mutes the very quiet sound cues.

No keyboard required.

## Sound

Reuses `games/_shared/js/ogh-sfx.js`'s existing oscillator-based patterns unchanged and
adds nothing new to it — the existing library already covered everything this toy needed:
`tap` for a cell toggle, `tick` for a generation step (throttled to a max of roughly 11
audible ticks per second so high playback speeds read as a soft pulse rather than a buzz),
and `place` for a pattern dropped in or the grid randomized. All of it is muteable with one
toggle, and deliberately minimal — this is a calm toy, not an action game.

## How to run

```bash
cd pc && ./start.sh
# then open:
# http://127.0.0.1:8080/games/life-forms/client/
```

Add `?lang=ru` (or `zh`, `es`, `ar`, `fr`) to the URL to force a language.

## Files

```text
games/life-forms/
├── manifest.json     ← pack metadata (id, controls, notes)
├── README.md          ← this file
└── client/
    ├── index.html     ← header/HUD (generation/live-cell counts), canvas stage, toolbar, pattern panel
    ├── style.css       ← neon-vector chrome on ogh-base.css + toolbar/panel styling
    ├── i18n.js         ← en/ru/zh/es/ar/fr strings (RTL-aware; the grid itself never mirrors)
    ├── simulation.js   ← pure, DOM-free Game of Life engine (toroidal step, age tracking, editing)
    ├── patterns.js     ← the preset pattern library + a stamp-onto-grid helper
    └── app.js          ← canvas rendering (glow/bloom, age-color, fade in/out), pointer input,
                           playback controls, i18n wiring, sound, the window.OGH_LIFE_FORMS test hook
```

No bundled image or audio assets: the grid is entirely canvas-drawn vector shapes with a
neon glow, matching the hub's established look (see `games/comet` or `games/void-drift`).
Sound reuses `games/_shared/js/ogh-sfx.js`'s tiny oscillator helper unchanged.

MIT licensed, same as the hub.
