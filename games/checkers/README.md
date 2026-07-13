# Checkers

Standard **English draughts** (American checkers) for the Offline Games Hub —
neon-vector look, offline-first, no build step, no image assets. Play against
a real AI, pass-and-play on one device, or over the LAN via the PC host.

## Rules

- 8×8 board, 12 pieces per side on the dark squares of the first three rows on
  each side (standard starting position).
- **Men** move diagonally **forward** one square onto an empty square, or
  **capture** by jumping diagonally over an adjacent enemy piece onto the empty
  square beyond it (the jumped piece is removed).
- **Mandatory capture:** if you have *any* capture available, you **must**
  capture — a simple non-capturing move is not allowed that turn. Pieces that
  can capture pulse, and the hint bar shows "Capture is mandatory".
- **Multi-jump chains:** if the piece you just captured with can immediately
  capture again, you **must** continue jumping with that same piece this turn.
  Tap each landing square in turn to finish the chain.
- **Kinging:** a man that reaches the opponent's back row becomes a **king**
  (shown with a crown) and may then move and capture **backward** as well as
  forward. Per standard rules, if a man reaches the king row *during* a jump,
  it is crowned and the move ends there.
- **Winning:** you win when your opponent has **no pieces left**, or has **no
  legal move** on their turn. A game with 40 moves per side and no capture or
  promotion is declared a **draw** (standard no-progress rule).

## Modes

- **vs AI** (default entry) — you are Cyan and move first; the AI is Pink.
  Difficulty **Easy / Medium / Hard** = search depth **2 / 4 / 6** (Easy and
  Medium also mix in occasional random moves). The AI is a negamax search with
  alpha-beta pruning over a material + positional evaluation; it always
  respects mandatory captures and multi-jump chains.
- **Pass & Play** — two players share one device, moving in turn.
- **LAN Multiplayer** — open the same room on two devices over Wi-Fi through the
  PC host. The first to join is Cyan, the second is Pink; later joiners
  spectate. If no host is reachable, LAN mode falls back to local pass-and-play.

## Controls

Touch / mouse. **Tap a piece, then tap a highlighted square.** Legal
destinations glow (a soft dot for a slide, a ring for a capture landing);
the selected piece is outlined. Tap the piece again to deselect.

## How to run

From the repo root, start the host and open the game in any LAN browser:

```sh
cd pc && ./start.sh
# then browse to:  http://<host-ip>:8080/games/checkers/client/
```

Useful query params: `?lang=ru` (UN-6 languages: en, ru, zh, es, ar, fr),
`?name=Ada&room=test` (LAN room + display name).

## Files

```text
games/checkers/
├── manifest.json
├── README.md
└── client/
    ├── index.html   # markup + mode/result overlays
    ├── style.css    # neon-vector board, pieces, move highlights
    ├── rules.js     # pure engine: move gen, mandatory capture, chains, win
    ├── ai.js        # negamax + alpha-beta AI over rules.js
    ├── app.js       # state, rendering, input, AI + LAN orchestration
    └── i18n.js      # UN-6 string table (RTL-aware chrome; board stays LTR)
```

`rules.js` and `ai.js` are pure and DOM/network-free, so the engine is
directly unit-testable and is also exposed at `window.OGH_CHECKERS` for
driving/inspecting the game without clicking through the UI.
