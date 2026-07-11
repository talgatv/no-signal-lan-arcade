# Mahjong Solitaire

**Solo tile-matching puzzle.** This is the classic single-player tile-matching
game — clear the board by matching pairs of identical, currently-exposed
tiles from a layered pyramid — **not** the 4-player Mahjong card game. No
networking — this is a single-device, single-player game.

## Rules

- **The board**: 136 tiles (4 copies each of 34 unique types — 4 winds, 3
  dragons, and characters/bamboo/circles 1–9) are stacked in a 5-layer
  stepped pyramid (60/40/24/8/4 tiles per layer, largest at the bottom).
  Flowers/seasons/joker are deliberately omitted to keep matching uniform
  (every tile matches only its own exact type — no wildcards) and the tile
  count a clean multiple of 2 (68 pairs).
- **Free tile rule**: a tile is selectable only if (a) no other tile sits
  anywhere above it (covering its footprint from a higher layer), **and**
  (b) at least one of its immediate left/right same-layer neighbors is
  empty — the standard Mahjong Solitaire "top-clear + one side open" rule
  (not full 4-side-open).
- **Matching**: tap a free tile to select it (it highlights), then tap a
  second free tile of the identical type to clear both. Tap the same tile
  again to deselect. Tap a different free tile that *doesn't* match instead
  of erroring — your selection just switches to it.
- **Winning**: clear every tile from the board.
- **Deadlock**: if no two currently-free tiles share a type, the game
  detects it automatically and offers **Shuffle** (re-deal just the
  remaining tiles into a fresh, guaranteed-solvable arrangement), **New
  game**, or **Undo** — you're never left silently stuck.

## Controls

| Input | Action |
|---|---|
| Tap a free tile | Selects it (gold highlight) |
| Tap the same tile again | Deselects |
| Tap a second free tile, same type | Matches and clears both |
| Tap a second free tile, different type | Switches the selection to it |
| Tap a blocked (non-free) tile | Ignored (a brief shake shows it's not selectable) |
| **Hint** button / `H` | Highlights one genuinely valid matching pair |
| **Undo** button / `U` / `Ctrl+Z` | Restores the most recently matched pair (full history, not just one step) |
| **Shuffle** button / `S` | Re-deals only the remaining tiles into a new solvable arrangement |
| **New game** button / `N` | Deals a brand new board |

Every tile is a real, focusable, keyboard-activatable button (Tab + Enter/
Space works), on top of tap/click — no drag-and-drop is needed for this
genre.

## Guaranteed-solvable board generation

A naive "place 68 random pairs on 136 random positions" approach can easily
produce an unsolvable or early-deadlocked board. Instead the board is built
by **draining a fully-occupied board**: repeatedly find every currently-free
tile position (checked only against whatever is still "active" in this
in-progress construction), pick any two of them, record that pair, and
remove both from the active set — repeat until nothing remains. The
recorded pair order is, by construction, a fully valid clearing sequence:
every pair really was free (top-clear + a side open) in the exact state it
was "removed" from. Tile **types** are assigned to the resulting pairs only
afterward, and can never break that guarantee.

*(An earlier "build up from an empty board" formulation — insert pairs into
a growing filled-set instead — was tried first and rejected during
development: it can permanently wall a middle tile in between two neighbors
placed before it, since the filled set only ever grows and there's no way
to undo. The drain formulation has no such failure mode, because freedom is
monotonically non-decreasing as the active set shrinks — removing tiles can
only free up others, never block them. This was verified computationally,
not just by inspection: replaying the exact generated order against the
live freedom rule always fully clears the board, independently confirmed
across many freshly-generated boards.)*

**Shuffle** reuses the exact same generator, restricted to just the tiles
still on the board — so it always produces a freshly solvable arrangement
for whatever remains, including recovery from a genuine deadlock, not a
naive in-place retype (which could easily produce yet another unsolvable
state).

## Rendering — no bundled art

Every tile is a plain `<button>`: a rounded ivory face with the real
**Unicode Mahjong Tiles block** (U+1F000–U+1F021) as its text content — the
34 wind, dragon, character (wan), bamboo (sou), and circle (pin) glyphs,
rendered natively by system/browser fonts. No bitmap image assets, no
custom SVG art. Legibility was confirmed directly in this environment
before committing to this approach (the font even renders the center
dragon glyph with its traditional red tint automatically). Depth between
the 5 layers is a CSS-only illusion: each layer is shifted a few logical
pixels higher and gets a taller drop-shadow "step", with blocked
(non-free) tiles dimmed and flattened so it's visually obvious what's
currently selectable.

## Layout — fits any screen, no scrolling

Tile positions live on a fixed half-tile-unit coordinate grid (every tile
occupies a 2×2-unit footprint; consecutive layers are offset by 1 unit so
an upper tile visually nests into the gap between the tiles below it),
converted once to a fixed logical-pixel board. The whole board is then
scaled as a single unit via a CSS `transform: scale()` computed from the
real available viewport space — the same "virtual viewport" idea as
`games/comet`'s canvas sizing and `games/solitaire`'s `.sol-board`, applied
here to this board's own absolutely-positioned tile buttons. Tile
*positions* never change between games (only which type occupies each slot,
and whether it's still on the board) — `games/_shared/css/ogh-base.css`'s
`overflow: hidden` on `html`/`body` is left untouched; the page never needs
to scroll.

## i18n

UI chrome (buttons, HUD labels, hint text, win/deadlock messages) is
localized into all 6 hub languages (en, ru, zh, es, ar, fr) via `i18n.js`,
detected from `?lang=`, then `navigator.language`, falling back to `en`.
Arabic flips the header/hint/win/deadlock chrome to RTL, but the tile
board's layout is a fixed spatial puzzle structure (not text) and is
deliberately **not** mirrored — `#board` carries `dir="ltr"` and every tile
position is set via plain `left`/`top` (always physical-left regardless of
`dir`), the same precedent as `games/solitaire`'s `#board` and
`games/pop-the-bugs`' `.pb-grid`.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/mahjong/client/
```

## Files

```text
client/
├── index.html   ← layout: header (back/HUD/hint/undo/shuffle/new-game/lang), board, hint, win + deadlock overlays
├── style.css    ← lacquered jade-and-gold theme, board/tile geometry, free/blocked/selected/hint states
├── tiles.js     ← the 34 unique tile types (Unicode Mahjong Tiles glyphs, suit metadata)
├── layout.js    ← half-tile-unit board geometry (5-layer stepped pyramid) + the shared isFreeGiven() rule
├── deal.js      ← solvability-guaranteed board generation (drain-from-full construction) + type assignment
├── app.js       ← game state, rendering, tap-to-select-then-tap-to-match input, win/deadlock/hint/undo/shuffle
└── i18n.js      ← en/ru/zh/es/ar/fr strings (RTL-aware; the board itself never mirrors)
```

No bundled image or audio assets: tiles are plain DOM/Unicode text as
described above, and sound reuses `games/_shared/js/ogh-sfx.js` (tiny Web
Audio oscillator beeps — `place` on a match, `win` on clearing the board,
`tap` on Hint, `pickup` on Shuffle).

### Debug/test hook

`window.OGH_MAHJONG` exposes `getState()`, `computeFreeIds()`, `isFreeGiven`
(the raw rule function, for direct inspection), `newGame()`, `undo()`,
`shuffle()`, `showHint()`, `onTileClick(id)`, `render()`, `fitBoard()`, and
`forceDeadlock()` (reassigns every currently-free tile a distinct type so no
two match, reaching a genuine deadlock state instantly instead of needing to
play it out by hand) — the same manual-test-hook convention as
`games/solitaire`'s `window.OGH_SOLITAIRE`.

MIT licensed, same as the hub.
