# Dominoes

Standard **double-six block dominoes** for the Offline Games Hub — neon-vector
look, offline-first, no build step, no image assets (tiles are pure CSS pip
dots). Play against a heuristic AI, pass-and-play on one device, or over the
LAN via the PC host.

## Rules

- A full set is **28 tiles** — every pair 0-0 through 6-6, each once. Shuffle,
  deal **7** to each of two players; the remaining **14** form a face-down
  **boneyard** (draw pile).
- The starting player opens by playing any tile. Players then take turns
  placing one tile onto either **open end** of the line, matching the placed
  tile's pip to the pip already exposed at that end. The line grows both ways.
- If you have **no legal tile**, you **must draw** from the boneyard, one tile
  at a time, until you draw a tile you can play. If the boneyard is empty and
  you still can't play, you **pass**.
- **Winning:**
  - Play your **last tile** and you win immediately.
  - If neither player can play and the boneyard is empty, the game is
    **blocked**: each player totals the pips left in their hand, and the
    **lower total wins** (equal totals = a draw).

## Modes

- **vs AI** (default entry) — you are Player 1; a heuristic AI is Player 2. The
  AI always plays a legal tile when one exists and prefers to shed doubles /
  heavy tiles and keep its options open (it isn't a deep planner, by design).
- **Pass & Play** — two players share one device. A hand-off gate hides each
  hand until the next player taps "I'm ready", so hands stay secret.
- **LAN Multiplayer** — open the same room on two devices over Wi-Fi through the
  PC host. If no host is reachable, LAN mode falls back to local pass-and-play.

## Controls

Touch / mouse. **Tap a tile** in your hand to play it. If it fits **both** open
ends, the left and right end zones glow — tap the one you want. When you can't
play, a **Draw** button appears (or **Pass** if the boneyard is empty).

## LAN privacy note

Hidden hands over a **dumb relay** (the host only forwards messages) can't be
made cryptographically secret without mental-poker crypto, which is out of
scope here. Instead the dealer broadcasts only a small integer **seed**; both
clients run the identical seeded shuffle, and **each client computes only its
own hand slice plus the shared boneyard** — it never even reads the opponent's
tiles. During play the only messages sent are public events: a placed tile
(public anyway), a draw (which advances the shared boneyard by one — a count,
never a tile), a pass, and, on a blocked game, a single **summed** pip count.
**No hand tile list is ever put on the wire** — you can confirm this by
inspecting the WebSocket payloads. (A modified client could recompute the deck
from the seed; that residual is the honest limit of serverless hidden-hand
play, and is why this is fine for casual LAN games among friends.)

## How to run

From the repo root, start the host and open the game in any LAN browser:

```sh
cd pc && ./start.sh
# then browse to:  http://<host-ip>:8080/games/domino-line/client/
```

Useful query params: `?lang=ru` (UN-6 languages: en, ru, zh, es, ar, fr),
`?name=Ada&room=test` (LAN room + display name).

## Files

```text
games/domino-line/
├── manifest.json
├── README.md
└── client/
    ├── index.html   # markup + mode/gate/result overlays
    ├── style.css    # neon-vector table + CSS pip-dot domino tiles
    ├── rules.js     # pure engine: seeded deal, placement, draw/block, scoring
    ├── ai.js        # heuristic tile-picking AI over rules.js
    ├── app.js       # state, rendering, input, AI + LAN orchestration
    └── i18n.js      # UN-6 string table (RTL-aware chrome; line stays LTR)
```

`rules.js` and `ai.js` are pure and DOM/network-free, so the engine is
directly unit-testable (a 300-game self-play simulation checks that games
always terminate and that both win-by-empty and blocked pip-scoring work) and
is also exposed at `window.OGH_DOMINO` for driving/inspecting the game without
clicking through the UI.
