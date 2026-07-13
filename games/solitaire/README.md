# Klondike Solitaire

**Solo card classic.** The standard 52-card patience game: deal a tableau of seven
cascading columns from a shuffled deck, work through the stock/waste pile, and build
all four suits up to King on their foundations to win. No networking — this is a
single-device, single-player game.

## Rules

- **Tableau**: 7 columns, dealt 1–7 cards left to right (column *N* gets *N* cards),
  only the top card of each column starts face-up.
- **Foundations**: 4 piles, one per suit, built up Ace → King. Filling all four wins
  the game.
- **Stock/waste**: the 24 leftover cards after the deal form a face-down stock. Tap it
  to flip cards face-up onto the waste pile — 1 or 3 at a time depending on draw mode
  (toggle in the header; only the top waste card is ever playable, same in both
  modes). Tapping an empty stock recycles the waste back into it, face-down, in
  reverse order.
- **Tableau building**: cards stack down in alternating color (e.g. a red 7 on a black
  8). A run of cards already in that valid descending-alternating order can be picked
  up and moved together as a group.
- **Empty columns**: only a King (or a run starting with one) may fill an empty
  tableau column.
- **Winning**: get all 52 cards onto the foundations.

### Simplifications from a "full" Klondike implementation

- **Foundations are a one-way sink** during normal play — there's no drag/tap-back
  from a foundation to the tableau. Undo is how you reverse a foundation placement.
  This matches most simplified digital Klondike implementations and keeps the input
  model unambiguous (a foundation pile is never a valid *source*, only a
  *destination*).
- **Waste always shows only its single top card**, even in draw-3 mode — draw-3 still
  moves 3 cards from stock to waste per tap (or fewer if the stock has less), it just
  doesn't fan them out visually. The only card that's ever playable from the waste is
  the top one, in both modes, so this has no effect on what you can actually do.

## Controls

| Input | Action |
|---|---|
| Drag a card (or press-and-drag a card mid-run) | Picks up that card and every card above it in the same column, drops on release |
| Tap a card, then tap a destination | Selects a card/run (gold highlight), then places it on the next tap — a touch-friendly alternative to dragging |
| Tap the same selected card again | Deselects |
| Tap the stock pile | Draws (or recycles the waste when the stock is empty) |
| Double-click a card *(desktop bonus)* | *(not required, not implemented — use drag or tap-to-place)* |
| `Ctrl+Z` / `U` | Undo |
| `N` | New game |

Both drag (Pointer Events — works identically with mouse and touch, not HTML5
drag-and-drop) and tap-to-select-then-tap-to-place are fully supported side by side;
use whichever is more comfortable. Invalid drops/placements are simply rejected — the
card animates back to where it started.

## Other features

- **Undo** reverts the most recent move (stock draw/recycle, any card/run placement,
  or one step of an auto-finish cascade). It's a full state snapshot per move, capped
  at 200 steps.
- **New game** reshuffles and redeals immediately, with no leftover state (timer,
  move counter, undo history, and any selection/win overlay all reset).
- **Auto-finish**: once every remaining card is face-up and the stock/waste are empty,
  an "Auto-finish" button appears — it repeatedly sends any card that can legally go
  to its foundation until the board is solved (this is always possible once nothing
  is hidden, the standard heuristic behind every Klondike "auto play" button).
- A move counter and elapsed-time clock are shown in the header; the win screen
  reports both.

## Rendering — no bundled art

Every card is a plain DOM element: a rounded-rectangle cream face with the rank and
suit in the top-left and (rotated) bottom-right corners, plus a large suit glyph
watermarked in the center, using the real Unicode suit characters (♠ ♥ ♦ ♣ —
U+2660/2665/2666/2663) colored red or black. Card backs are a pure-CSS diagonal
lattice pattern with a gold border — no bitmap image assets anywhere, matching the
rest of the hub's "no sample files" philosophy (see
`games/_shared/js/ogh-sfx.js`'s doc comment).

The felt-green, classic-card-table look is a deliberate style exception for this hub
(same reasoning as `games/paint-xp` and `games/penguin-fling`) — a traditional card
table reads better for Klondike than the usual neon-vector theme. It's built almost
entirely by overriding the shared `--ogh-*` design tokens, so the shared
`.ogh-btn`/`.ogh-pill`/`.ogh-card`/`.ogh-overlay` components reskin for free.

## Layout — fits any screen, no scrolling

The board (7 tableau columns + stock/waste/4 foundations) is laid out once in a fixed
logical-pixel coordinate space, then the whole board is scaled as a unit via a CSS
`transform: scale()` computed from the actual available viewport space — the same
"virtual viewport" idea as `games/comet`'s canvas sizing, applied to a DOM subtree
instead of a `<canvas>`. Each tableau column's card-reveal offset shrinks dynamically
if needed so a column can never overflow its allotted height, regardless of how many
cards end up stacked in it. `games/_shared/css/ogh-base.css`'s `overflow: hidden` on
`html`/`body` is left untouched (like `games/programs/flashlight`) — the page never needs to
scroll in the first place.

## i18n

UI chrome (buttons, hint, win screen) is localized into all 6 hub languages (en, ru,
zh, es, ar, fr) via `i18n.js`, detected from `?lang=`, then `navigator.language`,
falling back to `en`. Arabic flips the header/hint/win-overlay to RTL, but the card
board's layout (stock/waste/foundation positions, tableau column order) is a fixed
spatial convention and is deliberately **not** mirrored — `#board` carries
`dir="ltr"` and every card position is set via plain `left`/`top` (always
physical-left regardless of `dir`), the same precedent as `games/pop-the-bugs`' grid
and `games/music-synth`'s piano keys.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/solitaire/client/
```

## Files

```text
client/
├── index.html   ← layout: header (back/HUD/draw-mode/undo/new-game/lang), board, hint, win overlay
├── style.css    ← felt-table theme, board/slot/card geometry, drag/selection states
├── cards.js     ← suit/rank constants, deck creation+shuffle, card DOM element builder
├── layout.js    ← fixed logical-pixel board geometry, dynamic per-column offset shrinking
├── rules.js     ← move validation (tableau/foundation), win check, auto-finish greedy scan
├── app.js       ← game state, rendering, the pointer-event drag/tap input state machine
└── i18n.js      ← en/ru/zh/es/ar/fr strings (RTL-aware; the board itself never mirrors)
```

No bundled image or audio assets: cards are plain DOM/CSS as described above, and
sound reuses `games/_shared/js/ogh-sfx.js` (tiny Web Audio oscillator beeps — `tap` on
a stock draw, `pickup` on a stock recycle, `place` on any card placement, `win` on
victory).

### Debug/test hook

`window.OGH_SOLITAIRE` exposes `getState()`, `setState(patch)`, `newGame()`, `undo()`,
`tryMove(source, destSlot)`, `render()`, `fitBoard()`, and `forceNearWin()` (jumps to
two cards away from winning, for quickly exercising the win screen without playing a
full game) — the same manual-test-hook convention as `games/pop-the-bugs`'
`window.OGH_POP_BUGS`.

MIT licensed, same as the hub.
