# Ray Maze

**A first-person raycasting maze shooter.** Prowl a corrupted neon data-vault in true 2.5-D, purge
it of rogue security constructs, then reach the exit. The whole 3-D view is drawn from scratch with a
DDA raycasting engine — no textures, no bitmap assets, just glowing vector walls fading into the dark.

This is an original game in the classic "1990s corridor shooter" genre. Wolfenstein 3D is the
reference point **for the rendering technique only** — the setting, the constructs, the weapon and all
of the art here are our own.

## The raycasting technique (the technical core)

Rendering lives in [`client/raycaster.js`](client/raycaster.js) and is a from-scratch **DDA (Digital
Differential Analysis)** raycaster — the standard, well-documented approach (Lode Vandevenne's
tutorial is the canonical reference for the exact math):

- The level is a 2-D grid of cells (`levels.js`); a cell is either empty floor or a solid wall of
  some type. The outer ring of every level is forced solid so no ray can escape the grid.
- The player has a position `(x, y)` in grid units, a unit **facing vector** `(dirX, dirY)`, and a
  **camera plane** perpendicular to the facing whose half-length is `tan(FOV/2)` (FOV = 66°).
- For **each vertical screen column** `x` we build a ray `dir + plane * cameraX`
  (`cameraX ∈ [-1, +1]`), then step through the grid one cell boundary at a time, always advancing to
  the nearer of the next vertical/horizontal grid line, until the ray enters a solid cell.
- The wall slice height is `H / perpendicularDistance`, so nearer walls are taller. The distance used
  is the ray's **projection onto the camera direction** (`sideDist - deltaDist`), *not* the raw
  Euclidean ray length — using the latter is the classic bug that bows straight walls outward
  (fisheye). Correcting it here means straight corridors render straight.
- Walls are solid neon colors, **darker on N/S faces than E/W faces** (a cheap orientation cue) and
  **faded toward a dark fog with distance** (bright up close, dissolving into the background far off).
  Wall color also varies by cell type for level variety. No textures.
- **Enemies, pickups and the exit are billboarded sprites** — flat vector shapes scaled by distance
  and always facing the camera — drawn in a second pass against a per-column **z-buffer** (the wall
  distances from the first pass) so they are correctly occluded when they step behind a wall.
- The same ray routine, given a *normalised* direction, returns the true Euclidean distance to the
  first wall — reused directly for **hitscan firing** and enemy **line-of-sight**.

The view is rendered at a low internal resolution and upscaled by the browser, which is both faithful
to the era and cheap enough to stay smooth on a phone.

## Play

- **Goal:** each sector (level) has an exit that stays **locked until every construct is destroyed**.
  Clear them all, then walk into the exit to descend to the next sector. Clear all 3 sectors to win.
- **Enemies (two distinct threats):**
  - **Drone** — fast, low-HP **melee** swarmer. Charges straight at you and zaps on contact.
  - **Sentry** — tougher **ranged** construct. Holds a standoff distance and fires slow energy bolts
    whenever it has line of sight. Punishes standing in the open.
  - Constructs stay dormant until they see you (range + line-of-sight); shooting one wakes anything
    nearby.
- **Weapon:** hitscan blaster with a **7-round magazine**. It fires along your crosshair and hits the
  nearest construct in the ray's path *in front of* the wall — firing at a wall or empty corridor
  hits nothing. Reload with the ⟳ button or **R** (auto-reloads when the magazine runs dry).
- **Health:** you start at 100. Melee zaps and bolts hurt; repair cells scattered in the maze restore
  HP. At 0 HP you flatline — game over.
- **HUD:** a top-down **minimap** (walls, your position + facing, live enemies, the exit), plus health
  and ammo readouts and the exit's locked/online status.

## Controls

**Touch (primary):**

| Action | Control |
|--------|---------|
| Move / strafe | **Left half** — floating virtual joystick (push up = forward, sideways = strafe) |
| Look / turn | **Drag the right half** of the screen |
| Fire | **◎** button (bottom-right; hold to auto-fire) |
| Reload | **⟳** button |

**Desktop (bonus):** `W A S D` / arrow keys to move (`A`/`D` strafe, `← →` or `Q`/`E` turn); drag the
right side of the view (or `← →`) to look, or **double-click** it for classic **pointer-lock
mouse-look** (then click to fire); **Space** fires; **R** reloads.

The maze, the first-person view and the minimap never mirror under RTL (Arabic) — only the header,
cards and hint text flip. A 3-D scene is fixed space, not reading-order text.

## How to run

```bash
cd pc && ./start.sh
# then open:
# http://127.0.0.1:8080/games/ray-maze/client/
```

Add `?lang=ru` (or `zh`, `es`, `ar`, `fr`) to the URL to force a language.

## Files

```text
games/ray-maze/
├── manifest.json     ← pack metadata (id, controls, notes)
├── README.md         ← this file
└── client/
    ├── index.html    ← header, canvas stage, touch controls, overlay cards
    ├── style.css     ← neon-vector chrome on ogh-base.css + touch controls
    ├── i18n.js       ← en/ru/zh/es/ar/fr strings (RTL-aware; the view never mirrors)
    ├── levels.js     ← the 3 maze grids + parser (forces a solid border)
    ├── raycaster.js  ← from-scratch DDA renderer, sprite billboards, minimap, LOS/fire ray
    ├── enemies.js    ← Drone + Sentry types and their detect/chase/attack AI
    └── game.js       ← state, player, input (touch/keyboard/mouse), combat, HUD, loop
```

No bundled image or audio assets: the walls, constructs, weapon, HUD and minimap are all Canvas 2-D
neon-vector drawing, and every sound is synthesized via `games/_shared/js/ogh-sfx.js`'s tiny
oscillator helper (reused unchanged — `pop` fire, `thwack` enemy hit, `pocket` enemy destroyed,
`screech` alert, `splat` player hurt, `pickup` repair cell, `place`/`tick` reload, `win` sector clear,
`die` game over). Only the chosen language is persisted between sessions.

MIT licensed, same as the hub.
