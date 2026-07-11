# Tic-Tac-Toe

**The classic 3×3 grid game**, with three ways to play: against a minimax AI (two
difficulties plus an unbeatable one), pass-and-play on one device, or LAN
multiplayer with a friend on another device — relayed through `pc/host.py`'s
WebSocket, same as the rest of the hub's multiplayer titles.

## Rules

Standard tic-tac-toe. Players alternate placing **X** and **O** on a 3×3 grid; X
always moves first. Get three of your mark in a row — horizontally, vertically, or
diagonally — to win. If all 9 squares fill with no line, it's a draw.

## Modes

Pick a mode from the menu shown on launch (or reopen it any time with **Change
mode**):

- **vs AI** — you play against the computer. Choose a difficulty first:
  - **Unbeatable** — a full minimax search of the entire game tree (tic-tac-toe's
    tree is tiny, well under a million nodes, so no pruning is needed). It always
    plays a minimax-optimal move, so it **can never lose** — worst case, if you also
    play perfectly, every round is a draw. Ties among equally-good moves are broken
    at random for variety; this never weakens the guarantee, since by definition all
    tied moves are equally good.
  - **Easy** / **Medium** — the same AI, but it substitutes a random legal move
    instead of the optimal one some of the time (65% / 25% of moves respectively),
    so casual or younger players have a real chance to win. This is controlled by a
    difficulty table that **Unbeatable** never consults — the "never loses" guarantee
    is a separate `if (difficulty !== 'unbeatable')` code path, not just a zero in a
    table, so it can't be silently weakened by a future tuning change.
  - Who leads alternates each round (you first, then the AI first, then you again…)
    so you see the AI play both sides.
- **Pass & Play** — two players share one device, tapping in turn. No networking
  involved.
- **LAN Multiplayer** — open the same room on two devices on the same Wi-Fi (via
  `pc/host.py`). The first player to join is **X**, the second is **O**; further
  joiners can watch but not play. Moves relay as a tiny `{index, mark}` message. If
  no host is reachable (offline, or opened without `pc/host.py` running), this mode
  quietly falls back to local pass-and-play on the one device instead of erroring.

A running **score** (X wins / O wins / Draws) is kept in the header for as long as
you stay in the same mode; choosing a mode (even the same one again) resets it.
**New round** keeps the score and just clears the board.

## Controls

| Input | Action |
|---|---|
| Tap / click an empty square | Places your mark there |
| `Tab` then `Enter`/`Space` | Same — squares are real `<button>` elements |
| **New round** | Clears the board, keeps the score |
| **Change mode** | Back to the mode/difficulty menu (resets the score) |
| Language buttons (top right) | Switch UI language |

## Layout — fits any screen, no scrolling

The 3×3 board is laid out once in a fixed logical-pixel grid, then scaled as a whole
via a CSS `transform: scale()` computed from the actual available viewport space —
the same "virtual viewport" idea as `games/solitaire`'s `.sol-board`/`fitBoard()` and
`games/comet`'s canvas sizing. The page never needs to scroll.

## i18n

UI chrome (menu, difficulty picker, turn/score status, result screen) is localized
into all 6 hub languages (en, ru, zh, es, ar, fr) via `i18n.js`, detected from
`?lang=`, then `navigator.language`, falling back to `en`. Arabic flips the
header/menu/result chrome to RTL, but the 3×3 board's spatial layout (cell 0 is
always physically top-left) is a fixed gameplay convention and is deliberately
**not** mirrored — `#board` carries `dir="ltr"`, same precedent as
`games/solitaire`'s `#board` and `games/mahjong`'s tile board.

## Rendering — no bundled art

Marks are plain text (`X` / `O`) styled with the shared neon-vector palette — no
image assets. Sound reuses `games/_shared/js/ogh-sfx.js` (tiny Web Audio oscillator
beeps).

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/tic-tac-toe/client/
```

For LAN multiplayer, open the same URL on a second device on the same Wi-Fi (or a
second browser tab) with a shared `?room=` — e.g.
`?name=Alex&room=family` and `?name=Sam&room=family`.

## Files

```text
client/
├── index.html   ← layout: header (net/turn/score pills, mode/new-round, lang), board, mode + result overlays
├── style.css    ← neon-vector grid/cell geometry, mode & result overlay lists
├── app.js       ← pure game logic (minimax AI), state, rendering, OGHNet wiring
└── i18n.js      ← en/ru/zh/es/ar/fr strings (RTL-aware; the board itself never mirrors)
```

### Debug/test hook

`window.OGH_TTT` exposes `getState()`, `setState(patch)`, `getNet()`, the pure
`checkResult(board)` and `bestMove(board, aiMark, difficulty)` functions, `click(i)`
(simulates tapping square `i`), `chooseMode(mode)`, `newRound()`, `render()`, and
`fitBoard()` — the same manual-test-hook convention as `games/solitaire`'s
`window.OGH_SOLITAIRE`.

MIT licensed, same as the hub.
