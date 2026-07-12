# Keyboard Ninja

A typing-speed test for the Offline Games Hub: type words and sentences as fast and
accurately as you can. Practice solo against the clock, or race friends over LAN —
everyone types the same passage at once, first to finish wins.

## Solo Practice

- A queue of common, easy-to-type words is drawn from a per-language word bank
  (`client/data/content.json`, 80 words/language). The current word is shown large with
  live per-character highlighting; a dim preview strip shows the next few words coming
  up.
- Type the word into the text input; pressing **Space** commits it (right or wrong) and
  advances to the next one, exactly like most typing tutors — you're never blocked by a
  single bad word.
- One 60-second timed session. **WPM** and **accuracy** update live:
  - **WPM** = (characters typed / 5) / minutes elapsed — the standard gross-speed
    convention. "Characters typed" counts every character-producing keystroke since the
    session started, including ones later backspaced away; accuracy (see below) is
    tracked completely separately rather than folded into this number.
  - **Accuracy** = correct keystrokes / total keystrokes × 100. A keystroke is judged
    against the target character at its own position at the moment it was typed — an
    earlier mistake doesn't retroactively poison a later correct keystroke, and
    backspacing to fix something doesn't itself count as a new keystroke (only the
    original wrong one it's fixing already did, when it happened).
- Best WPM persists locally via `OGHProfile` (`games/_shared/js/ogh-profile.js`), the
  same local-only `localStorage` convention `games/pop-the-bugs` established — no
  server, nothing uploaded, survives a page reload.
- All the pure math (per-character diff, WPM, accuracy, progress) lives in
  `client/typing-core.js` with zero DOM references, so it's directly unit-testable from
  plain Node — same "pure logic never touches the DOM" split as `games/tic-tac-toe`.

## LAN Race

- Join the room lobby (roster shown live via `OGHNet`); whoever presses **Start Race**
  picks a random sentence from the sentence bank (15 sentences/language, in *their own*
  UI language) and broadcasts `{text, lang, startAt}` so every client renders and types
  the byte-identical passage, after a synchronized 3-2-1 countdown.
- Each racer's own client scores its own keystrokes locally (same diff/accuracy engine
  as solo mode) and periodically broadcasts its progress (~every 300ms while typing) so
  everyone sees a live track of progress bars — this doesn't need to be frame-perfect,
  just a readable "who's ahead" view.
- First to finish the passage wins. A round ends once every racer has finished, or after
  a 90-second timeout — anyone still unfinished at that point is ranked by how far they
  got. The final leaderboard shows finish order, WPM, and accuracy for everyone.
- Racing alone works too (no 2-player minimum): you just race the clock. If no PC host
  is reachable, LAN Race degrades automatically to that same solo time-trial — the exact
  offline-fallback convention every LAN-capable game in this hub uses.
- Ranking is kept consistent across every screen without a central game-logic server:
  each client times its own run with `performance.now()` from the instant its *own*
  local countdown hits GO (not `Date.now()`, which would drift with wall-clock skew
  between devices), and finish order is just "sort by each racer's own reported elapsed
  time" — a deterministic function of data every client already has, so delivery order
  on the WebSocket relay can never produce two different leaderboards.

## Content vs. chrome — and the ar/zh decision

`client/i18n.js` (UI chrome: menus, HUD labels, results, leaderboard) is completely
separate from `client/data/content.json` (the actual words/sentences you type) — same
split `games/doodle-guess` established. Both are translated into all 6 UN languages
(en, ru, zh, es, ar, fr), but **not the same way**:

- **Arabic (`ar`) typing content is native Arabic script**, right-to-left. Unlike CJK
  input, a standard Arabic keyboard layout maps one physical key to one Arabic letter
  directly — there's no IME/composition step, the same mechanism a Cyrillic layout uses
  for Russian, just right-to-left. Direct `keydown`/`input` capture therefore works
  correctly, which was verified empirically (not just assumed) before writing 95 Arabic
  words/sentences: a live `dir="rtl"` per-character `<span>` overlay plus a `dir="rtl"`
  `<input>` render right-to-left while `input.value` keeps the logical (typed) character
  order untouched, so the diff/accuracy logic needed zero RTL-specific branching — only
  the display `dir` attribute is content-language-dependent (see `setContentDir()` in
  `app.js`).
- **Chinese (`zh`) typing content is romanized Hanyu Pinyin (toneless), not hanzi.**
  Real Chinese characters require an IME composition step — several keystrokes (pinyin
  letters) collapse into one candidate-selected hanzi — which this game's
  one-keystroke-per-target-character model fundamentally can't represent: per-character
  correctness highlighting and the WPM/accuracy formulas above would be meaningless
  against composed IME input, and there's no way to fake that honestly with plain
  `keydown`/`input` events. Romanized Pinyin is a real, honestly-functional typing
  exercise in its own right (it's genuinely how Chinese speakers type on a physical
  keyboard, even though a real IME would then convert the syllables to hanzi as a second
  step this game doesn't attempt), so it's what's shipped here — clearly labeled as such
  (a note appears in the `zh` UI, and `zhRomanizedNote` in `i18n.js`), rather than
  silently shipping hanzi that can't actually be typed by this game's input model. Word
  bank entries have no internal spaces (e.g. `taiyang`, not `tai yang`) so Solo mode's
  space-bar word-advance logic keeps working the same way for every language; sentence
  entries keep natural space-separated syllables since Race mode diffs the whole passage
  as one continuous string and doesn't treat space specially.
  - **Note**: the `zh`/`ar` UI *chrome* in `i18n.js` is unaffected by any of this — it's
    real, natural Chinese/Arabic either way. Only the typing *content* differs.

The live race progress track (`#raceTrack` / `.kn-track`) is forced `dir="ltr"`
regardless of UI language — a racer's position is spatial/comparative gameplay, not
prose, the same reasoning `games/tic-tac-toe`'s board and `games/pop-the-bugs`' grid use
to justify staying un-mirrored under RTL.

## Controls — keyboard only, by design

This is a physical-keyboard-only game, and that's a deliberate scope decision, not an
oversight: the hub is nominally touch-primary, but a typing-speed test inherently
assumes a physical keyboard is available — forcing an on-screen keyboard into a typing
test would defeat the entire point of measuring real typing speed. `manifest.json`
declares `controls.primary: "keyboard"` (the same deliberate exception `games/fight-arena`
and `games/ember-tide` already use for a split-keyboard local fighter and a
keyboard-first puzzle-platformer, respectively).

## Sound

Reuses `games/_shared/js/ogh-sfx.js` unchanged — no new patterns were needed. Per-key
feedback (`tap` for a correct keystroke, `tick` for an incorrect one, both already very
quiet/short patterns) is gated behind a single header toggle, **off by default**, since a
sound firing on every keystroke of a fast typist gets old fast; word-list completion,
race countdown/GO, and race-finish reuse the existing `win`/`tap` patterns unconditionally
since those are rare, one-time events rather than a per-keystroke cadence.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/keyboard-ninja/client/
```

For a LAN race, open the same URL on two or more devices/tabs on the same Wi-Fi, e.g.
`?name=Alice&room=test` and `?name=Bob&room=test` — everyone in the same `room` races
together. Works solo too, with or without the host running.

## Files

```text
games/keyboard-ninja/
├── manifest.json
├── README.md
└── client/
    ├── index.html       ← layout: header/HUD, typing view, race lobby, all overlays
    ├── style.css        ← neon-vector theme; per-character highlight states, live track
    ├── app.js            ← DOM glue: input handling, solo mode, i18n/sound wiring, boot
    ├── race.js           ← LAN race state machine + OGHNet protocol (no DOM access)
    ├── typing-core.js    ← pure diff/WPM/accuracy math (no DOM access; Node-testable)
    ├── i18n.js           ← UI-chrome string table (6 UN languages) + RTL handling
    └── data/
        └── content.json  ← per-language word bank (solo) + sentence bank (race)
```

No build step, no CDN, no bitmap image assets. MIT licensed, same as the hub.
