# Claw Machine

**Solo pseudo-3D arcade.** A real arcade claw machine, rendered at an angle —
looking down and into the cabinet through the glass, the way you'd actually
peer into one — instead of a flat top-down or side view. Steer the claw over
a jumbled pile of prizes, drop it, and hope the grip holds all the way to the
chute. No networking, no installs, nothing but this browser tab.

## Controls

| Input | Action |
|---|---|
| D-pad (▲▼◀▶) or Arrow keys / WASD | Steer the claw left/right (X) and toward/away from the glass (Y) |
| **DROP** button, or `Space` / `Enter` | Lower the claw straight down from its current X/Y |

Touch is primary (hold a D-pad button to move, tap DROP to grab); mouse and
keyboard work identically. The D-pad only moves the claw while it's idle and
waiting — once you commit to a drop, the joystick goes dead until the claw
finishes its sequence and returns, exactly like a real cabinet.

## The pseudo-3D scene

The pit is a real 3-axis coordinate space — `x` (left/right), `y` (depth,
0 at the glass up to the back wall), `z` (height, floor up to the claw's
rail) — projected onto the 2D canvas with a simple oblique "cabinet-style"
projection (`client/render3d.js`'s `project()`): farther objects (`y`) are
pulled up and sideways on screen *and* drawn smaller, while everything is
depth-sorted back-to-front so a claw hanging low over a near prize correctly
covers it. It's deliberately not a flat top-down view or a full perspective
camera — just enough 3D math to make the claw's height and the pile's depth
genuinely readable, the same "flat scene with a depth trick" spirit as
`games/paintball`'s lane rendering, applied to three real axes instead of
static rows.

## The grip mechanic — read this before you get frustrated

**The imperfect grip is intentional.** Real claw machines are (in)famous for
weak, unreliable claws, and faithfully reproducing that is more true to the
genre — and more interesting — than a guaranteed-success grab:

- **Grip success** depends on how precisely centered the claw was over a
  prize the instant it stopped descending. Dead center on an average prize
  succeeds roughly 85% of the time; near the edge of the prize's grab
  window, that drops to single digits. Different prize types are also
  inherently easier or harder to hold (round/small/light ones are
  forgiving; bulky plush and the rare high-value tokens are not).
- **Even a successful grip can slip** — once during the lift out of the
  pile, once more during the carry to the chute — and that risk *also*
  scales with how centered the original grab was. A marginal-but-successful
  grab is meaningfully more likely to shake loose than a dead-center one.
- **Net effect:** precise play is dramatically — not marginally — more
  successful than sloppy play (in testing, a dead-center drop on an average
  prize delivered roughly 5x more often end-to-end than a drop taken near
  the edge of the grab window), but even perfect centering doesn't win
  every single time. That unpredictability is the genre's whole charm.

A prize that slips doesn't teleport back — it tumbles: real gravity, a
horizontal kick, and a few decaying bounces before it settles back into the
pile (`client/prizes.js`'s `stepFallingPrize`).

## Prizes

Six vector prize types, no bitmap assets — distinct silhouettes and colors,
not just palette swaps:

| Prize | Points | Notes |
|---|---|---|
| Ball | 60 | Small and round — the easiest, most forgiving grab |
| Gift box | 140 | Ribbon + bow, medium difficulty |
| Bear plush | 220 | Bulky — harder to get a firm hold on |
| Bunny plush | 240 | Long ears, bulky like the bear |
| Star token | 320 | Small and rare — high value, tight grab window |
| Gem | 400 | The jackpot — smallest and least forgiving of all |

The pit scatters ~16 prizes per session with deliberate overlap, so the pile
reads as a real jumble, not a grid.

## Credits & scoring

8 credits per session (like inserting coins) — each DROP attempt spends one,
whether it succeeds or not. The header tracks credits, score, and prizes
won live. Once credits run out (and the current drop finishes resolving),
a results screen shows your score, prizes won, and drops used, plus your
best score (saved locally, same as other OGH games). **Play again** resets
credits, score, and the pile for a fresh session.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/claw-machine/client/
```

## Files

```text
client/
├── index.html    ← layout: header (back/HUD/lang), canvas stage, floating
│                   grip-feedback message, hint, D-pad + DROP controls,
│                   start / results overlay cards
├── style.css     ← neon theme, floating message + D-pad/drop-button layout
│                   (forced LTR regardless of document direction), legend,
│                   results/best-score styling
├── render3d.js   ← the pseudo-3D projection (project()/depthScale()) and
│                   ALL canvas drawing: cabinet bezel/glass/chute, the pit
│                   shell (back+side walls, floor grid), the claw rig
│                   (rails/crossbar/cable/head), and the six prize shapes
├── prizes.js     ← pure model: world/claw-space constants, prize type
│                   stats, pit scatter, the grip/slip probability curves,
│                   and gravity/bounce physics for a slipped prize — no
│                   canvas or DOM code
├── game.js       ← the claw's phase state machine (idle → dropping →
│                   gripping → lifting/carrying → releasing/returning →
│                   idle), input (D-pad hold-buttons + keyboard), credits/
│                   scoring, sfx, i18n wiring, the single RAF loop, and a
│                   window.OGH_CLAW_MACHINE debug/test hook
└── i18n.js       ← en/ru/zh/es/ar/fr strings (RTL-aware; the pit/claw
                    scene and the D-pad's left/right meaning never mirror
                    — see index.html's dir="ltr" and style.css's
                    `direction: ltr` on .clw-controls)
```

No bundled image or audio assets — the whole cabinet is Canvas 2D vector
shapes with a neon glow, and sound reuses `games/_shared/js/ogh-sfx.js`'s
existing oscillator patterns (`whoosh`/`thwack`/`pickup`/`clack`/`boing`/
`land`/`pocket`/`win`/`die`/`tap`) with no new patterns needed.
`window.OGH_CLAW_MACHINE` exposes live state, the projection function, the
grip/slip probability curves, and `simulateDrop`/`runGripTrials`/
`fastForward` test hooks that drive the real state machine without waiting
out real animation time.

MIT licensed, same as the hub.
