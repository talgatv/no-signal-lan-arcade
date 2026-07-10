# Pulse Race

Neon **top-down racing** on a closed circuit.  
Solo: you + AI. With PC host WebSocket, the same pack is multiplayer-ready via `OGHNet`.

## Controls

| Touch | Keys |
|-------|------|
| Hold gas | W / ↑ |
| ← → steer | A/D or ← → |
| Brake | S / ↓ / Space |

## Multiplayer

See [docs/architecture/MULTIPLAYER.md](../../docs/architecture/MULTIPLAYER.md).

- Today: `OGHNet` often runs **offline** with AI if you only serve static files.  
- With `pc/host.py`: clients join the same room; online snapshot is the next step.

## Run

```bash
cd pc && ./start.sh
# http://127.0.0.1:8080/games/pulse-race/client/
```
