# Chess

Full, correct **standard chess** for the Offline Games Hub — neon-vector look,
offline-first, no build step, no image assets. Play against a real minimax AI,
pass-and-play on one device, or over the LAN via the PC host.

## Rules

Everything a legal game of chess needs, implemented correctly:

- 8×8 board, standard starting position, all six piece types (pawn, knight,
  bishop, rook, queen, king) with their exact movement patterns.
- **Legal moves respect check.** Moves are generated pseudo-legally per piece,
  then any move that would leave (or put) your own king in check is filtered
  out — so a pinned piece cannot expose its king, and while in check only
  king-saving moves are offered. (The move generator is validated by *perft*
  against the standard reference positions, including Kiwipete.)
- **Castling** (kingside and queenside): only when the king and that rook have
  not moved, the squares between are empty, the king is not currently in check,
  and the king neither passes through nor lands on an attacked square.
- **En passant**: capture an enemy pawn that has just advanced two squares as if
  it had moved one — including correctly *refusing* it when it is not the
  immediately preceding move, or when it would expose your own king.
- **Pawn promotion**: a pawn reaching the far rank opens a picker so you choose
  the piece (queen / rook / bishop / knight) — no forced auto-queen.
- **Check, checkmate and stalemate** are detected: the checked king glows red;
  no legal move while in check is checkmate (the other player wins); no legal
  move while *not* in check is stalemate (a draw).
- **Draws**: stalemate, **threefold repetition** (same position three times),
  the **50-move rule** (50 moves per side with no capture and no pawn move), and
  **insufficient material** (K vs K, K+B vs K, K+N vs K, and K+B vs K+B with
  same-colored bishops).

## Modes

- **vs AI** (default entry) — you are White and move first; the AI is Black.
  Difficulty **Easy / Medium / Hard** = search depth **2 / 3 / 4** (Easy and
  Medium also mix in some randomness and pick among near-equal top moves for
  variety). The AI is negamax with alpha-beta pruning, a capture-only
  quiescence search and MVV-LVA move ordering over a material +
  piece-square-table evaluation (center control, king safety, pawn
  advancement); it can only ever choose from the legal move set, so it never
  plays an illegal move and always answers a check.
- **Pass & Play** — two players share one device, moving in turn.
- **LAN Multiplayer** — open the same room on two devices over Wi-Fi through the
  PC host. First to join is White, second is Black, later joiners spectate. Each
  move relays as a tiny `{from,to,promo}` payload and is re-validated against the
  receiver's own position, so it can't desync. If no host is reachable, LAN mode
  falls back to local pass-and-play.

## Controls

Touch / mouse. **Tap a piece, then tap a highlighted square.** Legal
destinations glow — a soft dot for a move, a ring for a capture. Tap the piece
again to deselect. When a pawn reaches the last rank, choose the promotion piece
from the picker. The king's square glows red while it is in check.

## How to run

From the repo root, start the host and open the game in any LAN browser:

```sh
cd pc && ./start.sh
# then browse to:  http://<host-ip>:8080/games/chess/client/
```

Useful query params: `?lang=ru` (UN-6 languages: en, ru, zh, es, ar, fr),
`?name=Ada&room=test` (LAN room + display name).

## Files

```text
games/chess/
├── manifest.json
├── README.md
└── client/
    ├── index.html   # markup + mode / promotion / result overlays
    ├── style.css    # neon-vector board, piece glyphs, move highlights
    ├── rules.js     # pure engine: move gen, check/mate/stalemate/draw, FEN
    ├── ai.js        # negamax + alpha-beta + quiescence AI over rules.js
    ├── app.js       # state, rendering, input, promotion, AI + LAN orchestration
    └── i18n.js      # UN-6 string table (RTL-aware chrome; board stays LTR)
```

`rules.js` and `ai.js` are pure and DOM/network-free, so the engine is directly
unit-testable (it passes *perft* on the standard reference positions) and is
also exposed at `window.OGH_CHESS` for driving/inspecting the game without
clicking through the UI (`setFEN`, `move`, `rules.*`, `ai.pickMove`).
