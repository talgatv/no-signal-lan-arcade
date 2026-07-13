# Pop the Bugs

**Solo reaction arcade.** A whack-a-mole game on a 4×4 grid of holes: bugs pop up at
random holes and scurry back down on their own if you don't tap them in time. One
60-second timed round, score as many as you can.

## Bug types

| Bug | Look | Effect |
|---|---|---|
| **Bug** (common) | Round, friendly silhouette — green glow | +10 points |
| **Golden bug** (rare) | Same round silhouette, gold glow, sparkles | +30 points |
| **Trap bug** (decoy) | Spiky, angular silhouette — red glow | −15 points, don't tap it |

Good and golden bugs share the same rounded shape (only the color/rarity differs) so
they read as "the same friendly family"; the trap bug is a completely different,
angular/spiky silhouette so it's recognizable at a glance in the split-second reaction
window this genre demands — you're never relying on subtle color-only differences.
Letting a good/golden bug expire untapped plays a soft "missed it" click; hitting the
trap bug plays a harsher buzz plus a brief screen shake. Leaving the trap bug alone is
the *correct* play and stays silent — there's no penalty for not touching it.

## Difficulty ramp

The round starts generous (spawn every ~1200ms, each bug visible ~900ms) and ramps up
as time passes, reaching its hardest point at 85% of the round and holding there for
the last stretch. The floor is deliberately kept humanly reactable on a touchscreen:
spawn interval never goes below ~400ms and visible duration never goes below ~350ms,
even accounting for the small randomized jitter applied on top of the ramp (jitter is
clamped so it can never push a roll past the floor). The ramp is a pure function of
elapsed round time — see `rampAt()` in `app.js`, also exposed at
`window.OGH_POP_BUGS.rampAt(elapsedSeconds)` for inspection.

## Controls

| Input | Action |
|---|---|
| Tap / click a bug | Pop it (uses `pointerdown`, not `click`, for minimum input latency) |
| Tap / click an empty hole | Nothing happens |

Hit-targets are the full hole (not just the bug's drawn shape), sized generously for
touch on a phone. No keyboard gameplay; the Start/Play again buttons are normal
`<button>` elements and work with Tab+Enter/Space like any other button.

## Scoring & high score

Score is clamped at 0 (a bad round can't go negative). Your best score persists locally
via `OGHProfile` (`games/_shared/js/ogh-profile.js`, the same `localStorage`-only
per-game progress convention used by `games/demo-tap` and `games/piece-caller`) — no
server, nothing uploaded, survives a page reload, shows as "Pop the Bugs" in the hub's
profile drawer if you've played before.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/pop-the-bugs/client/
```

## Files

```text
client/
├── index.html   ← layout: header (back/HUD/lang), grid stage, hint, start/round-over overlay
├── style.css    ← neon theme, grid/hole geometry, bug pop/escape transitions
├── app.js       ← game loop, difficulty ramp, spawn/scoring logic, i18n wiring
└── i18n.js      ← en/ru/zh/es/ar/fr strings (RTL-aware; the grid itself never mirrors)
```

No bundled image or audio assets: bugs are inline SVG shapes with a CSS neon-glow
filter, and sound reuses `games/_shared/js/ogh-sfx.js` (tiny Web Audio oscillator
beeps — `pickup` on a good hit, `die` on a trap-bug hit, `tick` on a soft miss, `win`
at round end, `tap` on button presses).

MIT licensed, same as the hub.
