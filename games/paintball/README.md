# Paintball

**Solo lightgun-style arcade.** A fixed-camera paintball shooting gallery — think
Time Crisis / House of the Dead cabinets, but paintball-themed and family-friendly.
Aim with your mouse or finger, fire before targets duck back out of sight, and
rack up score across 8 escalating waves. No networking, no installs, nothing but
this browser tab.

## Controls

| Input | Action |
|---|---|
| Move the mouse, or drag a finger on the arena | Aim the crosshair |
| Click, or tap | Fire a paintball at the crosshair |
| Reload button (⟳) in the header, or `R` | Reload early (also auto-reloads on empty) |
| `Space` / `Enter` | Fire at the current aim point (keyboard-accessible alternative) |

Touch is primary (drag to aim, tap to fire); mouse works identically. The
magazine holds **7 shots**; firing is blocked while reloading (a ~1.3s delay),
so — like real lightgun cabinets — spraying every shot the instant you have
ammo is a losing strategy.

## Target types

| Target | Look | Effect |
|---|---|---|
| **Target** (grunt) | Dummy with a bullseye vest, cyan outline | +100 points |
| **Bonus target** (ace) | Smaller, faster, drifts sideways while up, gold outline + star badge | +250 points |
| **Don't shoot!** (civilian) | Hands raised, carries a small white flag, green outline | −150 points **and** a strike — 3 strikes ends the run immediately |
| **Ammo crate** | Wooden crate with a paint-drop icon, orange outline | +60 points and an instant full reload |

The civilian is deliberately distinguished by **silhouette shape** (arms up,
flag) and not just outline color, so it stays readable at a glance and for
players with color-vision differences — you genuinely have to look before you
shoot, not just spam the trigger at anything that pops up.

## Wave progression

8 waves, each 30-40 seconds. Difficulty is a pure function of wave number
(`waveParams(n)` in `client/targets.js`, also reachable at
`window.OGH_PAINTBALL.waveParams(n)` for direct inspection): spawn interval
drops from ~1000ms to ~420ms, a target's visible window shrinks from ~1.9s to
~0.9s, up to 5 targets can be up at once (vs. 2 early on), and both the
civilian and bonus-target spawn share climb — later waves mix in noticeably
more "don't shoot" risk alongside more high-value bonus targets, not just
raw speed. Clearing a wave shows a short recap (wave score / running total)
before the next one starts; clearing all 8 — or running out of strikes —
goes straight to the results screen.

## Paint splatter

Every shot leaves a mark: a randomized irregular paint blob (smoothed random
polygon + a scatter of small droplets, one of six saturated paint colors)
pops in wherever it lands, hit or miss. Splats bake onto a persistent
backdrop layer once their pop-in animation finishes, so the gallery visibly
gets messier over the course of a wave without the per-frame draw cost
growing — it's wiped clean at the start of each new wave.

## Scoring & results

Score climbs on every good hit and drops on civilians (never below 0). The
results screen shows:

- **Score** — total points for the run.
- **Accuracy** — the percentage of *fired* shots (magazine actually clicked
  empty, so a blocked trigger-pull mid-reload never counts) that landed a
  clean hit on a grunt/ace/crate target. Civilian hits count as a fired shot
  but not as accuracy — they're a mistake, not a miss.
- **Waves survived** — waves fully cleared. Clearing all 8 counts all 8;
  getting struck out by civilians mid-wave counts only the waves finished
  before that.

Your best score persists locally via `OGHProfile`
(`games/_shared/js/ogh-profile.js`, the same convention as
`games/pop-the-bugs` and `games/cross-the-road`) — no server, survives a
page reload, shows in the hub's profile drawer. "Play again" resets score,
strikes, ammo, and the arena, and jumps straight back into wave 1.

## Rendering

A flat 2D canvas scene, not real 3D: three static depth lanes (far / mid /
near) shrink in scale and spread width toward the horizon, giving a
trapezoidal sense of depth the same way `games/cross-the-road`'s renderer
narrows lanes toward a vanishing point — just applied to fixed rows instead
of a receding road. Targets are clipped so they visually "pop up from
behind" each lane's cover band. Everything — backdrop, cover bands, the four
target silhouettes, paint splats, and the crosshair — is Canvas 2D vector
shapes with a neon glow. No bitmap sprites.

## Sound

Reuses `games/_shared/js/ogh-sfx.js`'s tiny oscillator beeps, extended with
two new patterns in the same no-sample-files style: `pop` (a quick
pneumatic marker shot, played on every fire) and `splat` (a soft wet paint
impact, played on every hit). Everything else reuses existing patterns:
`whoosh`/`land` for reload start/finish, `pickup` for a crate refill, `win`
for a wave clear or full course clear, `die` for a civilian hit, and `tap`
for UI buttons.

## How to run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/paintball/client/
```

## Files

```text
client/
├── index.html   ← layout: header (back/HUD/reload/lang), canvas stage, hint,
│                  start / wave-clear / results overlay cards
├── style.css    ← neon theme, landscape-canvas sizing, ammo-pip/reload-bar
│                  HUD widget, legend swatches, RTL-safe forced-LTR arena
├── targets.js   ← pure model: lane layout, target type stats, the
│                  waveParams() difficulty curve, target-slot lifecycle —
│                  no canvas/DOM code
├── render.js    ← all canvas drawing: parallax backdrop, lane cover bands,
│                  target silhouettes, paint splats, score popups, crosshair
├── game.js      ← state machine, input (pointer/keyboard), sfx, i18n
│                  wiring, single RAF loop, debug hook
└── i18n.js      ← en/ru/zh/es/ar/fr strings (RTL-aware; the arena/target
                   layout never mirrors — see index.html's dir="ltr")
```

No bundled image or audio assets. `window.OGH_PAINTBALL` exposes live state,
`waveParams(n)`, a `jumpToWave(n)` fast-travel, and `forceSpawn(slotIndex,
type)` (deterministically pops a target for testing real pointer-driven hit
detection) for automated testing without playing every earlier wave in real
time.

MIT licensed, same as the hub.
