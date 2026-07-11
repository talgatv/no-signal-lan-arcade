# Memory Match

**The classic flip-two-cards concentration game.** Pick a grid size and a card
theme, then flip cards two at a time to find every matching pair. No networking —
this is a single-device, single-player game.

## Rules

- All cards start face-down in a shuffled grid.
- Tap a card to flip it face-up. Tap a second card:
  - **Match** — both cards stay face-up (dimmed) and are removed from play.
  - **No match** — after a brief pause, both flip back face-down.
- While a pair is settling (matching or not), the rest of the board is briefly
  unresponsive so a fast double-tap can't sneak in a third flip.
- Win by finding every pair. The result screen shows your move count and elapsed
  time, plus a "new best" note if you beat your previous best for that grid size
  (tracked locally per device, separately for each grid size).

## Grid sizes

| Size | Grid | Pairs |
|---|---|---|
| Easy | 4×4 | 8 |
| Medium | 6×4 | 12 |
| Hard | 6×6 | 18 |

## Themes

Pick a theme on the setup screen — each has 24 curated symbols, comfortably
covering even the 18-pair hard grid:

- **Shapes** — plain CSS shapes (circle, square, triangle, diamond, pentagon,
  hexagon, star, cross) via `clip-path`/`border-radius`, in a 3-color rotation. No
  image or SVG assets — just styled `<span>` elements.
- **Animals** — Unicode animal emoji (🐶 🐱 🦊 🐼 …). Emoji are plain text, not
  bitmap assets, so this is zero-cost.
- **Letters** — bold uppercase letters A–X.
- **Tiles** — reuses `games/mahjong`'s Unicode Mahjong Tiles glyphs (winds,
  dragons, circles, bamboos), already confirmed legible in this hub by that game.

## Controls

| Input | Action |
|---|---|
| Tap / click a face-down card | Flips it |
| **New game** | Reshuffles with the same grid size + theme |
| **Change setup** | Reopen the grid size / theme picker |
| Language buttons (top right) | Switch UI language |

The header shows a live move counter, an elapsed-time clock, and a pairs-found
counter (`found/total`) throughout the round.

## Layout — fits any screen, no scrolling

The card grid is laid out once per round in a fixed logical-pixel grid (cell size ×
the chosen column/row count), then scaled as a whole via a CSS `transform:
scale()` computed from the actual available viewport space — the same "virtual
viewport" idea as `games/solitaire`'s `.sol-board`/`fitBoard()` and
`games/tic-tac-toe`'s `.ttt-board`. This applies to all three grid sizes, including
the 6×6/36-card hard grid on a small phone — the page never needs to scroll.

## i18n

UI chrome (setup screen, header, result screen) is localized into all 6 hub
languages (en, ru, zh, es, ar, fr) via `i18n.js`, detected from `?lang=`, then
`navigator.language`, falling back to `en`. Arabic flips the header/setup/result
chrome to RTL, but the card grid's spatial layout (card 0 is always physically
top-left) is a fixed convention and is deliberately **not** mirrored — `#board`
carries `dir="ltr"`, same precedent as `games/solitaire`'s `#board` and
`games/tic-tac-toe`'s `#board`.

## Rendering — no bundled art

Every card face is plain DOM/CSS or Unicode text as described above — no bitmap
image assets. Sound reuses `games/_shared/js/ogh-sfx.js` (tiny Web Audio oscillator
beeps: a tap on flip, a "pickup" chime on a match, a "die" buzz on a mismatch, a
"win" fanfare on completing the board).

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/memory-match/client/
```

## Files

```text
client/
├── index.html   ← layout: header (moves/time/pairs pills, new-game/change-setup, lang), board, setup + result overlays
├── style.css    ← neon-vector grid/card geometry, the flip animation, all four theme looks
├── app.js       ← state, shuffle/deal, flip logic, timer, rendering, best-score tracking
└── i18n.js      ← en/ru/zh/es/ar/fr strings (RTL-aware; the board itself never mirrors)
```

### Debug/test hook

`window.OGH_MEMORY` exposes `getState()`, `setState(patch)`, `newGame(gridKey,
theme)`, `flipCard(i)` (simulates tapping card `i`), `renderAll()`, and
`fitBoard()` — the same manual-test-hook convention as `games/solitaire`'s
`window.OGH_SOLITAIRE`.

MIT licensed, same as the hub.
