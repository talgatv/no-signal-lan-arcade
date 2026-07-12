# Brick Game

**Three handheld classics in one console.** A homage to the cheap 90s/2000s "Brick Game" units
that crammed a handful of simple monochrome-LCD games into a single device. Pick from a shared menu
and play **Tanks**, **Snake** or **Breakout** — all rendered on one pale-olive dot-matrix LCD inside a
skeuomorphic graphite console with a physical D-pad and buttons. No copied assets or ROMs — three
original takes on the classics in this hub's own shared retro-LCD style.

## The shared retro-LCD aesthetic (the point of the collection)

This pack deliberately drops the hub's neon-vector look for a full-commitment **retro-LCD** skin — the
same spirit as [`games/paint-xp`](../paint-xp) going full Windows-XP. It's what makes three different
games read as one device:

- **One dot renderer, one palette.** [`client/lcd.js`](client/lcd.js) is a shared `Lcd` "screen": a
  grid of chunky square dots in a tiny limited palette — a pale olive **panel**, a barely-darker
  **ghost** shade for every *unlit* segment (so you always see the whole dot grid, like a real LCD), a
  dark **ink** shade for lit pixels and one mid shade. Every game — tanks, walls, snake, ball, paddle,
  bricks — is drawn by lighting these same dots, so they all share an identical pixel texture.
- **One console.** The graphite shell, brand plate, LCD bezel and D-pad/A/MENU buttons are constant;
  only the screen content changes between the menu and the three games. The menu itself uses the same
  dot renderer for its game icons.
- **No bitmaps, no samples.** The whole look is `fillRect` squares + CSS; sound is oscillator blips
  reused from [`_shared/js/ogh-sfx.js`](../_shared/js/ogh-sfx.js).

## The three games

### Tanks (Battle City-style)
Top-down grid arena. Your tank moves in four grid-aligned directions (no free rotation — the iconic
simple feel) and fires straight ahead.
- **Brick walls crumble** a dot at a time; **steel walls** are indestructible and stop shots.
- **Defend the eagle base.** Enemy tanks spawn from the top in escalating waves with real AI — they
  roam, converge on your base (and sometimes you) and fire when lined up. If a shot reaches your base,
  the run is **lost immediately, even with lives to spare** — the classic Battle City objective.
- 3 lives, waves ramp enemy count/speed/fire-rate. Score is per kill + a wave-clear bonus.
- **Controls:** D-pad moves & aims · A fires (hold to keep firing).

### Snake
Classic grid snake on a 13×13 board. Moves continuously in the last valid direction; eat the blinking
blip to grow one segment and **speed up**; hitting the outer wall or your own tail ends it.
- **Controls:** D-pad turns (no 180° reversals).

### Breakout / Arkanoid
Paddle at the bottom, a ball, and a wall of bricks up top. Clear every brick to advance to the next of
**three distinct layouts** (solid → checker → diamond, then they cycle a little faster).
- **Paddle-angle physics:** where the ball lands on the paddle sets the rebound angle — a **dead-centre
  hit goes straight up**, an **edge hit flies off at a sharp angle**, always at the same speed
  (`bounceVelocity(off)` in [`client/arkanoid.js`](client/arkanoid.js) is the single source, exposed on
  the test hook so it's inspectable, not eyeballed).
- 3 lives; letting the ball fall past the paddle costs one.
- **Controls:** D-pad **or drag on the screen** moves the paddle · A launches the ball.

## Controls (shared handheld)

| Input | D-pad | A button | MENU button |
| --- | --- | --- | --- |
| **Touch** | move / aim / turn / paddle (or drag on screen for the paddle) | action (fire / launch / confirm) | back to the game menu |
| **Keyboard** | arrow keys or WASD | Space / Enter (or Z) | Esc / M / Backspace |

In the menu: D-pad up/down chooses, A plays, or just tap a game (keys `1`/`2`/`3` jump straight in).

Each game keeps its **own best score** via `OGHProfile` under its own key (`brick-tanks`,
`brick-snake`, `brick-arkanoid`) — they never overwrite each other. Same convention as
[`games/pop-the-bugs`](../pop-the-bugs).

## Languages

English, Russian, Chinese, Spanish, Arabic and French ([`client/i18n.js`](client/i18n.js)). RTL
(Arabic) flips only the text chrome — header, hint, HUD, menu and overlay cards. It never mirrors the
LCD dot field of any game (the `<canvas>` is drawn `dir=ltr`) or the D-pad cluster (`dir="ltr"` in the
markup), so movement and controls stay put.

## Run

Served by the hub host. From the repo root:

```bash
cd pc && ./start.sh
```

then open <http://127.0.0.1:8080/games/brick-game/client/> (or reach it from the library at
`/games/`). It's offline-first: plain HTML/CSS/vanilla-JS ES modules, no build step, no CDN.

## Files

```text
games/brick-game/
├── manifest.json
├── README.md
└── client/
    ├── index.html     # handheld shell markup
    ├── style.css      # retro-LCD skin: console, screen, D-pad, overlays
    ├── lcd.js         # shared LCD dot renderer + palette (the cohesive look)
    ├── i18n.js        # UN-6 strings for the menu + all three games
    ├── menu.js        # the pick-a-game collection hub
    ├── tanks.js       # Tanks (Battle City-style)
    ├── snake.js       # Snake
    ├── arkanoid.js    # Breakout / Arkanoid
    └── app.js         # shell: loop, input routing, overlays, HUD, best scores
```

`window.OGH_BRICK_GAME` exposes the shell and the live active game for inspection/automation.
