# Towers of Hanoi

**The classic disk-moving puzzle.** Three pegs, a stack of differently-sized disks
on the first peg (largest at the bottom), move the whole stack to the goal peg one
disk at a time — a bigger disk can never sit on a smaller one. No networking —
this is a single-device, single-player game.

## Difficulty = disk count

Choose how many disks to play with on the setup screen (a −/+ stepper, range
3-10) — that choice **is** the difficulty. A live label bands the current count
into Easy/Medium/Hard/Extreme, and shows the **theoretical minimum move count**
(2^n − 1, the well-known optimal solution length for n disks) right there before
you even start.

| Disks | Band | Optimal moves |
|---|---|---|
| 3-4 | Easy | 7-15 |
| 5-6 | Medium | 31-63 |
| 7-8 | Hard | 127-255 |
| 9-10 | Extreme | 511-1023 |

## Rules

- All disks start on the **source peg** (left), largest at the bottom.
- Move disks one at a time to any peg. A disk can only be placed on an empty peg
  or on top of a **larger** disk — never on a smaller one.
- Win by getting the entire stack onto the **goal peg** (right, marked with a
  distinct glowing rod color and a "Goal" label) — not the middle peg, not back on
  the source peg.
- The header shows your live move count and the optimal count side by side, plus
  an elapsed-time clock, so you can see how close to optimal you're tracking as
  you go.
- Solve it in exactly the optimal number of moves and the result screen calls it
  out with a distinct "Perfect!" note.

## Controls

| Input | Action |
|---|---|
| Tap / click a peg with a disk on it | Picks up its top disk (it floats above the stack) |
| Tap / click a different peg | Attempts to place the held disk there |
| Tap / click the same peg again | Cancels the pickup |
| **Restart** | Replay at the current disk count |
| **Change disks** | Reopen the disk-count picker |
| Language buttons (top right) | Switch UI language |

Placing a disk on a smaller one is rejected — you'll see a shake, a message, and
hear a distinct sound, and the disk stays "in hand" so you can immediately try a
different peg instead of having to pick it up again.

Your best (fewest moves) is tracked locally **per disk count** and shown on the
setup and result screens.

## Layout — fits any screen, no scrolling

The peg board is laid out once per round in a fixed logical-pixel stage sized to
the chosen disk count, then scaled as a whole via a CSS `transform: scale()`
computed from the actual available viewport space — the same "virtual viewport"
idea as `games/solitaire`'s `.sol-board`/`fitBoard()` and `games/memory-match`'s
`.mm-board`. This applies at every disk count from 3 up to the 10-disk extreme
setting on a small phone — the page never needs to scroll.

## i18n

UI chrome (setup screen, header, result screen, the "Goal" peg label) is
localized into all 6 hub languages (en, ru, zh, es, ar, fr) via `i18n.js`,
detected from `?lang=`, then `navigator.language`, falling back to `en`. Arabic
flips the header/setup/result chrome to RTL, but the peg board's spatial layout
(peg 0 is always physically the left/source peg, peg 2 is always physically the
right/goal peg) is a fixed convention and is deliberately **not** mirrored —
`#board` carries `dir="ltr"`, same precedent as `games/gem-swap`'s `.gs-board`
and `games/sliding-puzzle`'s `#board`.

## Rendering — no bundled art

Every disk is a styled DOM element with a neon glow, colored from a 10-step
palette keyed by disk size — no bitmap image assets. Sound reuses
`games/_shared/js/ogh-sfx.js`'s existing patterns unchanged (`pickup` for lifting
a disk, `place` for a valid drop, `screech` for a rejected illegal drop, `win`
for completing the stack on the goal peg) — no new patterns were needed for this
game.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/hanoi-towers/client/
```

Add `?lang=ru` (or `zh`, `es`, `ar`, `fr`) to the URL to force a language.

## Files

```text
games/hanoi-towers/
├── manifest.json     ← pack metadata (id, controls, notes)
├── README.md          ← this file
└── client/
    ├── index.html    ← header/HUD (moves/optimal/time), board stage, setup + result overlays
    ├── style.css     ← neon-vector chrome on ogh-base.css + peg/disk geometry
    ├── i18n.js       ← en/ru/zh/es/ar/fr strings (RTL-aware; the board never mirrors)
    └── app.js        ← peg/stack model, legality + win detection, optimal-move math,
                         tap-to-pick-up/tap-to-place input, timer, best-score tracking,
                         DOM/animation, i18n wiring
```

### Debug/test hook

`window.OGH_HANOI_TOWERS` exposes the pure logic functions (`optimalMoves`,
`canPlace`, `isWin`, `initPegs`) plus `startSession(n)`, `onTapPeg(i)`,
`getPegs()`, `setPegs(pegsArray, numDisks)` and `forceOneMoveFromWin(n)` (jumps
straight to one legal move away from winning, to exercise win detection without
solving a full stack by hand) — the same manual-test-hook convention as
`games/gem-swap`'s `window.OGH_GEM_SWAP` and `games/sliding-puzzle`'s
`window.OGH_SLIDING_PUZZLE`.

MIT licensed, same as the hub.
