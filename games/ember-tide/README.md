# Ember & Tide

**A two-spirit elemental co-op puzzle-platformer.** Guide **Ember** (a fire spirit) and **Tide** (a
water spirit) through an old elemental temple at the same time, and get each one to its own
matching-colored door. It only counts when **both** spirits are home at once.

This is an original take on the "control a fire character and a water character through a hazard
maze to their own exits" genre (Fireboy & Watergirl is the classic reference point). Its own
spirits, temple setting, level design, code and procedurally-synthesized sound — no assets, source
or content were copied from any specific existing game.

## The elemental rules

| Spirit | Safe in | Dies in | Neutral hazard |
|--------|---------|---------|----------------|
| **Ember** (fire, warm/orange) | lava — wades right through it | **water** — doused instantly | **spikes** kill it |
| **Tide** (water, cool/blue) | water pools — flows through them | **lava** — boils away instantly | **spikes** kill it |

Because a pool that is a safe path for one spirit is a deadly wall for the other, the two spirits
almost never share a route — the puzzle is coordinating them. **Spikes** kill *both*, so some gaps
are dangerous for everyone. Any death (wrong element, spikes, or falling out) resets the whole
chamber; a small counter tracks your resets.

## Cooperative mechanisms

Progress in most chambers requires **actively using both spirits together**, not just walking each
to its door:

- **Pressure plates (momentary)** — a gate stays open only *while* a spirit stands on the plate, so
  one spirit must hold it while the other slips through (chamber 2, and again in 5).
- **Levers → bridges (latching)** — a spirit throws a lever to extend a solid deck across a pool the
  *other* spirit can't cross. Bridge pools are deliberately **four tiles wide — wider than any jump
  can clear** — so the wrong-element spirit genuinely needs the bridge (chambers 3, 4, 6).
- **Element-locked levers** — some levers are colored and only the matching spirit can throw them,
  so a chamber can force *this* spirit to be the one who helps.
- Spirits can also **stand on each other's heads** for a small boost (never required to finish).

## The six chambers

1. **Twin Springs** — elemental tutorial: each spirit jumps the *other's* pool, both jump a shared
   spike gap.
2. **The Sunken Gate** — Tide holds a pressure plate to keep a gate open while Ember climbs to the
   fire door.
3. **Ember's Bridge** — Ember wades the lava to a lever, extending a bridge so Tide can cross.
4. **Give and Take** — mutual: each spirit's lever extends the *other* element's bridge; neither can
   help itself.
5. **Hold the Line** — plate **and** lever across two heights: Tide's plate lets Ember reach a lever
   that opens Tide's own path.
6. **The Confluence** — capstone: mutual bridges *plus* a vertical climb, both pools and a spike gap.

## Controls

Two real modes, chosen on the start screen:

- **Solo (one player, both spirits).** One spirit is *active* at a time. **WASD** *or* the **Arrow
  keys** move the active spirit, **W / ↑ / Space** jump, and **Shift** or **Tab** switch which
  spirit you control (a glowing halo + arrow marks the active one). This matches how the single-
  player browser versions of the genre work.
- **Local 2-player (two people, one keyboard).** Split keyboard, **both spirits live at once** — the
  genre's classic co-op. **Ember** on **A/D** move + **W** jump; **Tide** on the **Arrow keys**. The
  two schemes are independent and never interfere.
- **`R`** restarts the current chamber at any time.
- **Touch (fallback).** On-screen d-pads: two in 2-player (Ember left, Tide right), or one d-pad + a
  **Switch** button in solo. Keyboard is the deliberate richer/primary input for this genre.

## Running

```bash
cd pc && ./start.sh
# then open http://127.0.0.1:8080/games/ember-tide/client/
```

No install, no build step — plain HTML/CSS/JS. Nothing is saved or uploaded; every run resets on
reload. Add `?lang=ru` (or `zh`, `es`, `ar`, `fr`) to force a language; `?touch=1` forces the
on-screen pads.

## Files

```text
games/ember-tide/
├── manifest.json     ← catalog metadata + control notes (en/ru)
├── README.md         ← this file
└── client/
    ├── index.html    ← layout: header/HUD, canvas stage, touch pads, overlays
    ├── style.css     ← neon-vector page chrome on top of ogh-base.css
    ├── i18n.js       ← en/ru/zh/es/ar/fr strings (RTL-aware; the stage never mirrors)
    ├── levels.js     ← pure level data (six 24×15 ASCII grids) + parser — no DOM
    ├── sim.js        ← pure fixed-60Hz simulation (physics, hazards, mechanisms, win) — no DOM
    └── game.js       ← canvas rendering, keyboard/touch input, loop, sfx/i18n, test hook
```

**No bundled image or audio assets:** the whole temple (terrain, lava/water pools, spikes, gates,
bridges, doors, both spirits) is Canvas 2D neon-vector shapes with a glow, and every sound is
synthesized via `games/_shared/js/ogh-sfx.js`'s tiny oscillator helper — reused entirely unchanged
(`boing` for a jump, `land` for a hard landing, `place` for a lever/plate/gate, `pickup` when a
spirit reaches its door, `win` for clearing a chamber, `die` for a death).

**i18n / RTL.** All UI text is translated across the UN-6 languages (en, ru, zh, es, ar, fr). Arabic
flips the text-bearing chrome (header, HUD, menu, hint, cards) to RTL, but **never** the canvas: the
level layout, the fire/water hazard positions, the spirit colors and the movement directions stay
exactly as laid out in every language — mirroring that spatial content would put the fire door where
the water door should be and make "left" move a spirit right.

MIT licensed, same as the hub.
