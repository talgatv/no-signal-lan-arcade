# Doodle Guess

A LAN draw-and-guess party game for the Offline Games Hub. One player draws on
a live canvas that everyone else watches reconstruct in real time; the others
race to type the word. First correct guess scores. Think Pictionary / Skribbl,
running entirely on your own Wi‑Fi with no installs and no build step.

## What it is

- **Live shared canvas.** The current drawer's freehand strokes are streamed as
  small stroke-segment messages over the host WebSocket relay and replayed on
  every other player's read-only canvas as they're drawn — no whole-canvas
  images, no lag-inducing frame dumps.
- **Everyone guesses in a chat feed.** Every guess is broadcast to the room, so
  you see each other's near-misses too (part of the fun). The first correct
  guess ends the round.
- **Two modes, one engine.**
- **Real running scoreboard** kept in sync across all devices for the whole
  session.
- **6 languages** of UI chrome (English, Русский, 中文, Español, العربية,
  Français) and a **112-word bank translated into all 6**.

## The two modes

Both share the same drawing surface, timer, guessing feed and scoring. The host
picks the mode on the start screen before the game begins.

1. **Word Bank** — the game deals each drawer a random word from a pre-built
   bank of 112 concretely-drawable concepts (`client/data/words.json`), one per
   turn. Nobody chooses; it's the computer's pick, like classic Pictionary. The
   word is dealt in the drawer's own UI language. Because the bank is
   concept-indexed across all 6 languages, a correct guess is accepted in **any**
   of the 6 languages — a mixed-language room still works.

2. **Your Word** — the drawer secretly types their own word to draw. Only they
   ever see it: it is **never** sent across the network in cleartext until the
   round-end reveal (the only word-shaped thing on the wire beforehand is its
   character length, for the `_ _ _` hint).

## How a round works

- Turn order is derived deterministically from the room roster (players sorted
  by id), so every client agrees on who draws next without a central server.
- The drawer privately gets / types their word, then presses **Start drawing**.
  A shared 75-second countdown begins.
- Guessers type into the feed. The drawer's client (the only one that knows the
  word) validates each guess — case-insensitive, with light typo tolerance.
- The round ends the instant someone guesses correctly, or when time runs out.
  The word is revealed to everyone, points are awarded, and after a short pause
  the next player's turn begins automatically.
- **Scoring:** the correct guesser gets 50 points + up to 50 more the faster
  they guess; the drawer gets a 25-point bonus whenever someone guesses their
  drawing (rewarding a clear doodle). Identical score deltas are applied on every
  client, so scoreboards never drift apart.

## Controls

- **Drawer:** draw with touch or mouse. An 8-colour palette, 3 brush sizes, an
  eraser and a **Clear** button (which clears everyone's canvas in sync). The
  drawer does not guess their own word.
- **Guessers:** a read-only canvas plus a text box — type a guess and press
  Enter / **Guess**. A keyboard (on-screen or physical) is needed to guess.
- Language switcher (top-right) changes the UI chrome; Arabic flips the chrome
  to RTL but never mirrors the drawing itself.

## How to run

This is a genuinely multiplayer game — it needs **2 or more players** (a drawer
and at least one guesser), so you need two browser tabs / devices in the same
room.

1. From the repo root, start the PC host if it isn't already running:
   ```sh
   cd pc && ./start.sh
   ```
2. On each device (same Wi‑Fi), open the host URL and launch **Doodle Guess**,
   or go directly to `/games/doodle-guess/client/`. Add `?name=You&room=party`
   to set a name and share a room. Everyone using the same `room` plays together.
3. The first player to join is the host: pick a mode and press **Start Game**.

Without the host running the page still loads, but shows an "offline" notice —
you can't play alone (there's nobody to guess).

## Files

```text
games/doodle-guess/
├── manifest.json          # catalog/runtime metadata
├── README.md              # this file
└── client/
    ├── index.html         # page shell (header, canvas stage, side panel, overlays)
    ├── style.css          # neon-vector chrome; fixed shell, only feed/scores scroll
    ├── app.js             # net, turn/round engine, guessing, scoring, UI, i18n wiring
    ├── canvas-sync.js     # the live shared drawing surface (draw + broadcast + replay)
    ├── i18n.js            # UI-chrome string table (6 UN languages) + RTL handling
    └── data/
        └── words.json     # word bank: 112 concepts × 6 languages, concept-indexed
```

## Notes

- No build step, no CDN, no bitmap or audio assets. The canvas is plain
  Canvas 2D; sound reuses `games/_shared/js/ogh-sfx.js`.
- The UI-chrome i18n (`i18n.js`) is separate from the word bank's per-language
  noun lists (`data/words.json`) — don't conflate them.
- Multiplayer is built on the shared `OGHNet` room relay
  (`games/_shared/js/ogh-net.js`), the same pattern as `programs/lan-chat` and
  `games/piece-caller`.
