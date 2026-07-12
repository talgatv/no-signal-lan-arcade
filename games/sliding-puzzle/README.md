# Sliding Puzzle

**The classic sliding tile puzzle** (8-puzzle / 15-puzzle / 24-puzzle). A grid of
numbered tiles with one blank space; slide tiles into the blank until every number
is back in order, blank last. No networking — this is a single-device,
single-player game.

## Difficulty = grid size

Pick a grid size on the setup screen — that choice **is** the difficulty:

| Size | Grid | Tiles |
|---|---|---|
| Easy | 3×3 | 8 (the "8-puzzle") |
| Medium | 4×4 | 15 (the classic "15 puzzle") |
| Hard | 5×5 | 24 (the "24-puzzle") |

## Rules

- Tiles are numbered 1..N and start shuffled around one blank space.
- Tap any tile in the blank's row or column to slide it (and everything between
  it and the blank) toward the blank in one move. A tile directly next to the
  blank just slides itself; a tile two or more cells away shoves the whole line
  in between along with it — a common, convenient extra beyond single-tile-only
  sliding.
- Win by getting every tile back in numerical order, reading left-to-right,
  top-to-bottom, with the blank in the last position.
- A tile currently sitting in its correct final slot glows soft green, so you can
  see progress at a glance.

## Shuffling is always solvable

The shuffle **never** produces tiles in a random arrangement. Instead it starts
from the solved grid and performs a large number of random *legal* slides (moving
the blank around), the same way a human would scramble a real puzzle by hand. Any
position reached this way is, by construction, solvable — a raw random permutation
of tile values would instead be unsolvable about half the time, which is a classic
gotcha for this puzzle (the reachable positions from "solved" form exactly one of
the two parity classes of all possible arrangements). As an extra check, the
independent standard solvability test (inversion count + blank-row parity for even
grid widths) is run against every shuffle result too.

## Controls

| Input | Action |
|---|---|
| Tap / click a tile in the blank's row or column | Slides it (and any tiles between it and the blank) |
| **Shuffle** | Re-shuffle at the current grid size |
| **Change size** | Reopen the grid size picker |
| Language buttons (top right) | Switch UI language |

The header shows a live move counter and an elapsed-time clock throughout the
round. Your best (fewest moves, and separately fastest time) is tracked locally
**per grid size** and shown on the setup and result screens.

## Layout — fits any screen, no scrolling

The tile grid is laid out once per round in a fixed logical-pixel grid sized to
the chosen grid size, then scaled as a whole via a CSS `transform: scale()`
computed from the actual available viewport space — the same "virtual viewport"
idea as `games/solitaire`'s `.sol-board`/`fitBoard()` and `games/memory-match`'s
`.mm-board`. This applies to all three grid sizes, including the 5×5/24-tile hard
grid on a small phone — the page never needs to scroll.

## i18n

UI chrome (setup screen, header, result screen) is localized into all 6 hub
languages (en, ru, zh, es, ar, fr) via `i18n.js`, detected from `?lang=`, then
`navigator.language`, falling back to `en`. Arabic flips the header/setup/result
chrome to RTL, but the tile grid's spatial layout (tile (0,0) is always physically
top-left, "slide right" always means "toward higher column index") is a fixed
convention and is deliberately **not** mirrored — `#board` carries `dir="ltr"`,
same precedent as `games/gem-swap`'s `.gs-board` and `games/memory-match`'s
`#board`.

## Rendering — no bundled art

Every tile is a styled DOM `<button>` with a neon glow border — no bitmap image
assets. Sound reuses `games/_shared/js/ogh-sfx.js`'s existing patterns unchanged
(`place` for a single-tile slide, `whoosh` for a multi-tile line slide, `win` for
solving the puzzle) — no new patterns were needed for this game.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/sliding-puzzle/client/
```

Add `?lang=ru` (or `zh`, `es`, `ar`, `fr`) to the URL to force a language.

## Files

```text
games/sliding-puzzle/
├── manifest.json     ← pack metadata (id, controls, notes)
├── README.md          ← this file
└── client/
    ├── index.html    ← header/HUD (moves/time), board stage, setup + result overlays
    ├── style.css     ← neon-vector chrome on ogh-base.css + tile/board geometry
    ├── i18n.js       ← en/ru/zh/es/ar/fr strings (RTL-aware; the grid never mirrors)
    └── app.js        ← board model, solvable shuffle, slide/line-move logic, win
                         detection, timer, best-score tracking, DOM/animation, i18n wiring
```

### Debug/test hook

`window.OGH_SLIDING_PUZZLE` exposes the pure board-logic functions
(`solvedBoard`, `isSolved`, `neighborsOf`, `countInversions`, `isSolvable`,
`shuffledBoard`) plus `startSession(size)`, `attemptMove(idx)`, `setBoard(board)`
and `forceOneMoveFromSolved(size)` (jumps straight to one tap away from winning,
to exercise win detection without solving a full shuffle by hand) — the same
manual-test-hook convention as `games/gem-swap`'s `window.OGH_GEM_SWAP` and
`games/memory-match`'s `window.OGH_MEMORY`.

MIT licensed, same as the hub.
