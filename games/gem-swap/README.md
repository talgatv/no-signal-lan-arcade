# Gem Swap

**A solo match-3 gem puzzle.** Swap adjacent gems on an 8×8 grid to line up 3 or more of
the same shape, watch matches cascade as gems fall and refill, chain combos for a rising
score multiplier, and use the specials big matches create. This is an original game in the
classic "swap adjacent gems to form lines of 3+, gravity-fall cascades, chain combos" genre
(Bejeweled is the reference point for the genre only — original vector gem designs, no
copied content).

## Gems

Six gem types, each a distinct **shape** as well as a distinct color, so identity reads
even without color vision:

| Shape | Color |
|---|---|
| Circle | Cyan |
| Diamond | Pink |
| Star | Amber |
| Square | Green |
| Triangle | Coral |
| Hexagon | Purple |

## Matching, cascades and specials

- **Swap** two orthogonally-adjacent gems (no diagonals). A swap only completes if it
  creates a match of 3+ — an invalid swap animates there and back instead of silently
  refusing, so every attempted move gets visible feedback.
- **Match 3+** in a line (horizontal or vertical) clears and scores. Cleared gems make room
  for the gems above them to fall — a real gravity animation, not a teleport — and fresh
  gems spawn at the top to refill the grid.
- **Cascades:** a fall can create brand-new matches on its own. Each of these chain
  reactions clears and scores again, with an increasing combo multiplier for every
  consecutive cascade step within one swap's resolution — a small early match can
  legitimately snowball into a huge score if the board cooperates.
- **Line-clear special** — match exactly **4** in a line and the matched gem at your swap
  position becomes a striped special (still its original color/shape, with a glowing
  chevron overlay). Matching or swapping it again clears its **entire row or column**
  (whichever orientation created it).
- **Color bomb** — match **5 or more** in a line and you get a color bomb (a distinct
  rainbow-glow wildcard, no color of its own). Its primary use is a **direct swap against
  a normal gem**, which deterministically clears **every gem of that gem's color** on the
  board — a big, controllable, strategic tool, not just a bonus reward. Swapping two bombs
  together clears the whole board.
- **Chained specials:** if a special gem gets caught inside another effect's sweep (a
  row-clear beam passing through a bomb, say), it activates too. Specials can set off
  specials.
- **No-valid-moves safeguard:** if the board ever reaches a state with no possible swap
  that would create a match, the game detects it, shows a brief message, and reshuffles
  automatically rather than leaving you stuck.

## Scoring and session

One session is **25 moves** (only swaps that actually create a match — or a bomb swap —
spend a move; a rejected invalid swap doesn't). Score comes from gems cleared (multiplied
by the current combo step), a bonus for creating a special, and a bonus for activating a
bomb. When moves run out, a results screen shows your score and, if it's a new best,
celebrates it. Your best score persists locally via `OGHProfile` (same convention as
`games/pop-the-bugs`), and "Play again" resets cleanly.

## Controls

Touch/click first, two ways to swap:

- **Drag:** press a gem and drag toward an adjacent cell; release to attempt the swap.
- **Tap:** tap a gem to select it (it pulses), then tap an adjacent gem to attempt the
  swap — a reliable fallback on small screens, same dual-input convention as
  `games/solitaire`.

No keyboard needed.

RTL (Arabic) flips the header/menu/card text chrome only. The grid itself — column order,
which direction is "right", drag/tap adjacency — never mirrors: column 0 is always the
visual-left column regardless of language, the same precedent set by `games/pop-the-bugs`
and `games/solitaire`.

## How to run

```bash
cd pc && ./start.sh
# then open:
# http://127.0.0.1:8080/games/gem-swap/client/
```

Add `?lang=ru` (or `zh`, `es`, `ar`, `fr`) to the URL to force a language.

## Files

```text
games/gem-swap/
├── manifest.json     ← pack metadata (id, controls, notes)
├── README.md          ← this file
└── client/
    ├── index.html    ← header/HUD (score/moves), board stage, overlay cards
    ├── style.css     ← neon-vector chrome on ogh-base.css + gem/board/animation styles
    ├── i18n.js       ← en/ru/zh/es/ar/fr strings (RTL-aware; the grid never mirrors)
    ├── board.js      ← pure grid logic: matching, gravity/refill, specials, deadlock detection
    ├── gems.js       ← pure SVG shape markup per gem type/special
    └── game.js       ← DOM/animation, input (drag + tap), sound, i18n wiring, session/score,
                         the swap -> match -> clear -> fall -> cascade resolution pipeline
```

No bundled image or audio assets: gems are inline SVG vector shapes with a neon glow filter,
matching the hub's established look (see `games/comet` or `games/void-drift`). Sound reuses
`games/_shared/js/ogh-sfx.js`'s tiny oscillator helper almost entirely unchanged (`tap` for a
swap attempt, `screech` for an invalid swap reverting, `pickup` for a plain match, `whoosh`
for a row/col special activating, `win` for creating a special, `tick` for a reshuffle) plus
two new patterns this genre needed: `chain` (a brighter, faster ascending run for a cascade
step) and `boom` (a low punchy hit for a color bomb activating).

MIT licensed, same as the hub.
