# Backgammon

Full, correct standard **Backgammon** for the Offline Games Hub — the classic
dice-driven race game, in the hub's neon-vector look. No build step, no image
assets, no CDN: plain HTML/CSS/vanilla-JS only.

## What it is

Two players (White and Black) each race their 15 checkers around the 24-point
board and off the far edge. White runs point 24 → 1 (home board points 1–6),
Black runs point 1 → 24 (home board points 19–24). First to bear all 15 checkers
off wins.

The opening position is the universal standard layout — each side has **2 on
their 24-point, 5 on their 13-point, 3 on their 8-point, 5 on their 6-point**
(in that side's own numbering).

## Modes

- **vs AI** — you are White; a heuristic bot plays Black (Easy / Medium / Hard).
- **Pass & Play** — two players share one device, taking turns.
- **LAN Multiplayer** — over the PC host (`pc/host.py`) via `OGHNet`. First
  joiner is White, second is Black, later joiners spectate. The player whose turn
  it is rolls the dice **once**, locally, and broadcasts the result — there is a
  single authoritative roll per turn — then relays each checker move; the other
  side re-validates and mirrors it. If no host is reachable, LAN falls back to
  local pass-and-play.

## Implemented rules

- **Dice & movement** — roll two dice; move a checker the distance of each die
  separately (either order), each individual hop landing legally. **Doubles give
  four moves** of that value, not two.
- **Legal moves / blocked points** — a checker may land on a point that is empty,
  your own, or holds exactly **one** enemy checker (a blot). A point with **2+**
  enemy checkers is blocked.
- **Hitting** — landing on an enemy blot sends it to the **bar**.
- **The bar & re-entry** — while you have a checker on the bar you **must**
  re-enter it into the opponent's home board first (a die value *d* enters on
  that home board's *d*-point) before making any other move. If neither die can
  enter, you forfeit the turn.
- **Bearing off** — once all 15 of your checkers are in your home board you may
  bear off: a die *N* bears a checker off the *N*-point, and a **higher die may
  bear off a lower point when no checker sits on a higher point**. A checker hit
  back to the bar mid-bear-off must re-enter and come home before bearing off
  resumes.
- **Use as many dice as possible** — if you can't play both dice, you must play
  as many as you legally can; for a non-double where only one die is playable,
  you must play the **larger** one if possible.
- **Win** — bear off all 15 checkers. (Doubling cube and gammon/backgammon bonus
  scoring are intentionally out of scope — simple win/loss.)

## Controls

Touch/click, via Pointer Events:

1. Tap the **dice** (or the **Roll** button) to roll.
2. Tap one of your **checkers** — its legal destination points glow (and the
   bear-off tray glows if bearing off is legal).
3. Tap a highlighted **point** (or the tray) to move there. To use both dice on
   one checker, move it once, then select it again and move it the second die.

When you're on the bar, only the legal **entry points** are offered until every
bar checker is back in play.

## How to run

From the repo root:

```sh
cd pc && ./start.sh          # serves the hub on http://<this-machine>:8080
```

Then open **`http://127.0.0.1:8080/games/backgammon/client/`** (or, from another
device on the same Wi-Fi, `http://<host-ip>:8080/games/backgammon/client/`).
Add `?lang=ru` (or `zh`, `es`, `ar`, `fr`) to force a UI language.

## Files

```text
games/backgammon/
├── manifest.json
├── README.md
└── client/
    ├── index.html   # header HUD, board canvas, mode/result overlays
    ├── style.css    # neon-vector chrome (board is drawn on the canvas)
    ├── app.js       # state, canvas rendering, tap input, dice/turn flow, AI + LAN wiring
    ├── rules.js     # pure move generation/validation, forcing rule, bearing off, win detection
    ├── ai.js        # pure heuristic AI (enumerates maximal move sequences, evaluates, picks best)
    └── i18n.js      # UN-6 language strings (en/ru/zh/es/ar/fr) + RTL handling
```

`rules.js` and `ai.js` are pure and DOM/network-free (the same split as
`games/chess` and `games/checkers`), so the engine can be unit-tested — or driven
from the console via `window.OGH_BACKGAMMON` — in isolation.

## i18n / RTL

UI chrome is translated into the six UN languages. Arabic flips the header, menu
and result chrome to RTL, but the **24-point board is never mirrored** — its
layout is a fixed, universal convention (the canvas is pinned `dir="ltr"`).

## Style & sound

The board (triangular points, checkers, dice, bar and bear-off trays) is drawn
on a single `<canvas>` with neon glows — White = cyan, Black = magenta — scaled
as a whole to always fit without scrolling. Sound reuses
`games/_shared/js/ogh-sfx.js` (`place` = move, `clack` = hit, `pocket` =
bear-off, `win`/`die` = game over) plus one added pattern, `dice`, a short
oscillator dice-rattle for a roll.
