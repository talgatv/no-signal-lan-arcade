# Leap Quest

**An original side-scrolling platformer.** Run, leap, and stomp your way across five neon worlds:
bounce on enemies from above to defeat them, wall-jump up sheer shafts, dodge spikes and bottomless
pits, ride moving platforms, collect coins and star shells, and reach the flag at the end of each
level. This is an original game in the classic "run, jump on enemies, collect coins, reach the flag"
2D platformer tradition — original neon-vector art, levels and character, no copied content.

## Movement (the point of the genre)

Physics lives in [`client/player.js`](client/player.js):

- **Real gravity-based, variable-height jumping.** A jump launches at a fixed upward speed; if you
  release JUMP while still rising, the remaining upward velocity is cut, so a quick tap is a short
  hop (~1 tile) and holding JUMP through the whole rise is a full leap (~3 tiles). Everything in
  between is available by how long you hold — line up the arc you need.
- **Momentum, not snapping.** Running accelerates and decelerates (with a little air control and
  ground friction) rather than toggling to full speed, so a wide gap rewards a run-up.

### The extra ability: WALL-JUMP

The one movement ability beyond run/jump is the **wall-jump**. Press *into* a wall while falling and
the player **wall-slides** (fall speed clamped to a slow scrape); tap JUMP during the slide to kick
**up and away** from the wall. A short input-lock on the push-off guarantees you actually clear the
wall, and small coyote/buffer windows keep it forgiving. Alternate between two close walls to climb a
shaft as high as you like.

It isn't bolted on unused: **level 4, "The Ascent," is a tall two-walled shaft that is the only route
to the exit ledge and flag** — there is no staircase, so you *must* wall-jump up it. Level 5 has a
shorter wall-jump nook too.

## Enemies, hazards, collectibles

- **Two enemy behaviours** ([`client/enemies.js`](client/enemies.js)), both defeated by a stomp from
  above (you bounce off) and both harmful on side/below contact:
  - **Crawler** — a back-and-forth patroller that reverses at platform edges and walls, so it never
    walks off its ledge.
  - **Stalker** — patrols slowly, but **charges at ~3× speed when you enter its detection box** at a
    similar height. It still respects edges (it won't dive into a pit), so it's a threat while you
    share its platform, not a homing missile.
- **Three hazard types:** **spikes** (cost a hit), **bottomless pits** (fall in and it costs a life),
  and **moving platforms** (one-way, land-on-top; they **carry you along**, so time your jumps off
  them).
- **Collectibles:** **coins** scattered through every level for score, and a **star shell** power-up
  that grants **one extra hit** — the next hit you take strips the shell instead of costing a life.

## Levels & scoring

Five hand-tuned levels ([`client/levels.js`](client/levels.js)) of rising difficulty, authored from
numeric rectangles (not fragile ASCII) so every platform height and gap width is exact — a running
jump clears ~3 tiles up and ~4 across, so ground gaps stay within that budget and required platforms
stay within reach. A cheap reachability lint warns in the console if any un-bridged pit is ever wider
than the jump budget.

1. **First Steps** — gentle intro: run, jump, coins, a couple of crawlers, small pits.
2. **Gaps & Spikes** — spikes to hop, wider pits, and the first stalker.
3. **The Chase** — a horizontal and a vertical **moving platform** bridge a wide chasm; a stalker guards the mid.
4. **The Ascent** — the tall **wall-jump shaft** (required).
5. **Gauntlet** — everything together, tightest jumps, both enemy types, movers, spikes and a wall-jump nook.

You have **3 lives**. Coins (+100), stomps (+200) and clearing a level (+1000 plus a per-remaining-life
bonus) all score. Losing all lives ends the run with a results screen (score, levels cleared); clearing
all five wins. Your **best score is saved on this device** via `OGHProfile` (same convention as
`games/pop-the-bugs`).

A smoothed follow-camera keeps the player roughly centred, clamped to the level bounds, and follows
vertically as well (needed for the wall-jump shaft).

## Controls

**Touch (primary):** hold **LEFT / RIGHT** (bottom-left) to run, tap **JUMP** (bottom-right) to hop —
hold JUMP longer to leap higher. The JUMP button doubles as the wall-jump (slide a wall, then tap it).

**Desktop (bonus):** `←` / `→` or `A` / `D` to move, `Space` / `W` / `↑` to jump. `Space` / `Enter`
also starts and advances the menus.

The level, camera, the direction you run toward the flag, and the LEFT/RIGHT/JUMP button layout never
mirror under RTL (Arabic) — only the header, cards and hint text flip. A scrolling platformer's
spatial logic has no reading direction, and mirroring it would invert every jump (stage is `dir="ltr"`,
`ctx.direction` forced to `'ltr'`).

## How to run

```bash
cd pc && ./start.sh
# then open:
# http://127.0.0.1:8080/games/leap-quest/client/
```

Add `?lang=ru` (or `zh`, `es`, `ar`, `fr`) to the URL to force a language.

## Files

```text
games/leap-quest/
├── manifest.json     ← pack metadata (id, controls, notes)
├── README.md         ← this file
└── client/
    ├── index.html    ← header/HUD (lives/coins/level/score), canvas stage, LEFT/RIGHT/JUMP buttons, overlay cards
    ├── style.css     ← neon-vector chrome on ogh-base.css + touch controls + legend swatches
    ├── i18n.js       ← en/ru/zh/es/ar/fr strings (RTL-aware; the play field never mirrors)
    ├── levels.js     ← 5 level definitions + the compiler (tile grid, entities, movers) + reachability lint
    ├── player.js     ← momentum physics, variable-height jump, wall-slide/wall-jump, AABB tile + mover collision
    ├── enemies.js    ← crawler (patrol) and stalker (charge) behaviours + stomp/hurt contact classifier
    └── game.js       ← state, camera, HUD, input, sound, i18n, collision glue, render loop, test hook
```

No bundled image or audio assets: the level, player, enemies and collectibles are all Canvas 2-D
neon-vector line-art with a glow, and every sound is synthesized via `games/_shared/js/ogh-sfx.js`'s
tiny oscillator helper — reused entirely unchanged (`hop` = jump, `boing` = wall-jump, `thwack` =
stomp, `pickup` = coin, `chain` = star shell, `screech` = lose the shell, `die` = lose a life, `win` =
level clear / victory). Only the chosen language is persisted between sessions.

MIT licensed, same as the hub.
