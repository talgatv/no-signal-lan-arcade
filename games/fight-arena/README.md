# Fight Arena

**A 1v1 side-view versus fighting game.** Pick a fighter, close the distance, and read your
opponent — light and heavy punches and kicks with real hitboxes, blocking, a simple combo system,
and one signature special per character. Best of three rounds, with a KO/time-out round-end and a
match-winner screen. Play **local 2-player** on one shared keyboard (the primary mode) or **vs the
computer** solo.

This is an original game in the general 2D fighting genre. Street Fighter is the classic reference
point for the genre, but every character, move, stat and bit of art here is our own — nothing was
copied from any specific existing game.

## Modes

- **Local 2-Player (pass-and-play)** — two people share one keyboard, one on the left-hand keys and
  one on the right-hand keys. The two control schemes are fully independent and never interfere.
- **Vs Computer** — solo play against `ai.js`, which manages spacing, attacks in range, guards
  against swings, hops or blocks incoming bolts, and mixes in its character's special. It is
  deliberately beatable, not a frame-perfect wall.

## The roster (genuinely different, not cosmetic)

| Fighter | Archetype | HP | Speed | Damage | Special |
|--------|-----------|----|-------|--------|---------|
| **Volt** | Balanced zoner | 100 | medium | medium | **Arc Bolt** — a projectile that travels the stage as its own entity |
| **Boulder** | Heavy bruiser | 132 | slow, low jump | high | **Rising Ram** — a rising uppercut gap-closer / anti-air |
| **Sable** | Fragile speedster | 82 | fastest, high jump | low | **Slip Strike** — a fast forward rush (melee gap-closer) |

Each has the four basic attacks (light/heavy punch, light/heavy kick) but with different frame data,
reach and knockback, so the same buttons feel different in each character's hands. Faster characters
recover sooner and combo more easily; Boulder hits far harder but commits for much longer.

## Core mechanics

- **Movement** — walk toward/away, **jump** with real gravity and an arc, **crouch** (shortens your
  hurtbox, so it ducks under `high` attacks such as heavy punches), and a **dash** (double-tap
  left/right) for a quick burst.
- **Attacks** — every attack has real **startup → active → recovery** frames. The hitbox only exists
  during the brief *active* window; there is a genuine windup and a genuine short hit window, so
  whiffing at the wrong range or time misses.
- **Hitboxes vs hurtboxes** — a hit registers **only when the attack's active hitbox rectangle
  actually overlaps the opponent's hurtbox rectangle** (`rectsOverlap` in `combat.js`), never by
  comparing character centers. Attack reach is modelled separately from body size, so a long poke
  can hit a body the attacker's own body isn't touching, and a short jab whiffs just out of range.
- **Blocking** — hold **away** from your opponent to guard. A blocked hit is reduced to a little
  chip damage instead of the full amount. Stance matters: a standing block stops highs and mids but
  not low attacks; a crouching (down+back) block stops lows and mids but not overhead `high` hits.
- **Combos** — light normals are *cancelable*: if a light punch/kick **lands**, you can cancel its
  recovery into another attack (or a special) before it finishes, for simple chains like LP → LP →
  LK → special.
- **Specials** — one signature move per character on a dedicated key (no fiddly quarter-circle
  motions): a **projectile** (Volt), an **uppercut** gap-closer (Boulder) and a forward **rush**
  (Sable). Each is on a short cooldown so it can't be spammed.
- **Rounds** — best of three. Win two rounds to win the match. Each round has a timer; if it runs
  out, the higher-HP fighter takes the round. A round-transition banner and a final match-winner
  screen bookend the match.

## Controls

Keyboard is primary. The two players split one keyboard (keys are read by physical position, so the
layout is the same regardless of your keyboard's language):

| Action | Player 1 (left) | Player 2 (right) |
|--------|-----------------|------------------|
| Move / jump / crouch | `A` `D` / `W` / `S` | `←` `→` / `↑` / `↓` |
| Light punch | `F` | `K` |
| Heavy punch | `G` | `L` |
| Light kick | `V` | `,` |
| Heavy kick | `B` | `.` |
| Special | `R` | `;` |
| **Block** | hold `A`/`D` **away** from opponent | hold `←`/`→` **away** |
| **Dash** | double-tap `A` or `D` | double-tap `←` or `→` |

**Touch (solo vs-AI fallback only):** on a touch device, Vs Computer mode shows an on-screen d-pad
(move / jump / crouch) plus **LP HP LK HK SP** buttons that drive Player 1. Keyboard remains the
primary, best experience — the touch overlay never appears in local 2-player.

Add `?debug=1` to the URL (or press the backtick `` ` `` key) to draw the live hurtboxes (green) and
active hitboxes (red) for verifying the overlap-based hit detection.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/fight-arena/client/
```

## Files

```text
games/fight-arena/
├── manifest.json      ← pack metadata (id, controls, split-keyboard notes)
├── README.md          ← this file
└── client/
    ├── index.html     ← header, canvas stage, character-select + match-end cards, touch pad
    ├── style.css      ← neon-vector chrome on ogh-base.css + landscape canvas + select/touch UI
    ├── i18n.js        ← en/ru/zh/es/ar/fr strings (RTL-aware; the stage never mirrors)
    ├── characters.js  ← the roster: stats, frame data and special params (pure data)
    ├── combat.js      ← pure fixed-60Hz sim: state machine, hitbox/hurtbox overlap, physics,
    │                    projectiles, blocking, combos, round/match structure
    ├── ai.js          ← the vs-Computer controller (produces the same input a keyboard does)
    └── game.js        ← rendering, input, HUD, sfx, i18n wiring, character select, test hook
```

No bundled image or audio assets: the fighters, stage, projectiles, sparks and HUD are all Canvas 2D
neon-vector shapes, and every sound is synthesized via `games/_shared/js/ogh-sfx.js`'s tiny
oscillator helper (reused unchanged — `thwack` for a clean hit, `clack` for a block, `whoosh`/`tap`
for swings, `screech` for the bolt, `die` for a KO, `pickup` for "Fight!", `win` for the match).
Nothing is persisted between sessions except the chosen language.

MIT licensed, same as the hub.
