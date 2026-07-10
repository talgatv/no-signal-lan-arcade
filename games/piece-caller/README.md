# Piece Caller

Two-player **asymmetric Tetris-like** game.

| Role | Job |
|------|-----|
| **Builder** | Classic stack: move, rotate, soft/hard drop |
| **Caller** | Chooses the **next** piece — but only inside the **timing window** |

## Timing rules

1. When a piece is about to spawn, a **call window** opens (timer).  
2. Caller must tap a tetromino **during** that window.  
3. **Too early / too late** — buttons disabled; pick ignored.  
4. If the window ends with no pick → **random** piece.  
5. Window length shortens slightly as the stack speeds up.

## Roles (online)

- First in room / host → **Builder** (runs simulation, broadcasts state)  
- Second player → **Caller**  
- Solo offline → both panels on one screen (practice)

## Controls

### Builder
| Touch | Keys |
|-------|------|
| ← → | A/D or arrows |
| ↻ | W / ↑ |
| soft drop | S / ↓ |
| hard drop | Space |

### Caller
Tap piece buttons only while the ring is **open** (green).

## Run

```bash
cd pc && ./start.sh
# two browsers, same room:
# http://HOST:8080/games/piece-caller/client/?name=A&room=main
```
