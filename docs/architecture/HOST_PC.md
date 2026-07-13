# PC host architecture

Implementation: [`pc/host.py`](../../pc/host.py)  
User guide: [`pc/README.md`](../../pc/README.md)  
Offline packs: [`pc/OFFLINE.md`](../../pc/OFFLINE.md)

## Role

The PC host is the **reference host** for development and LAN parties:

- Static file server for `games/` and `pc/www/` (lobby)  
- WebSocket hub at `/ws` (rooms, ready, action relay)  
- No pip, no Node — **Python 3 standard library only**

## Process model

```text
ThreadingHTTPServer
  ├─ GET  /                  → pc/www/index.html
  ├─ GET  /games/**          → games/**
  │        /games/programs/** → games/programs/**
  ├─ GET  /docs/**           → docs/**
  ├─ GET  /api/health
  └─ GET  /ws  (Upgrade)     → per-connection WS thread
         Hub → Room → Players
```

## Room model

- `join` creates/attaches a player to `room`  
- First player becomes **host** (`isHost`)  
- `ready` updates roster broadcast  
- `game:action` is relayed to everyone **except** sender  
- `game:state` / `game:event` / `game:start` supported for richer flows  

The host does **not** execute game rules. Clients (often the host player) simulate.

## Client integration

Games use:

```js
import { OGHNet } from '../../_shared/js/ogh-net.js';
const net = await OGHNet.connect({ gameId: 'my-game' });
```

Lobby appends `?name=&room=` so all players share a room.

## Portable Python

| Path | Platform |
|------|----------|
| `pc/runtimes/win64/` | Windows embeddable CPython |
| `pc/runtimes/linux64/` | Linux portable CPython |
| System `python3` | Fallback / macOS |

Launchers `start.sh` / `start.bat` prefer bundled runtimes.

## Security

See [SECURITY.md](../SECURITY.md). LAN is trusted; no auth in MVP.

## Roadmap for this host

- [x] HTTP + WS lobby + relay  
- [x] Catalog-driven game list in lobby  
- [ ] QR code of LAN URL  
- [ ] Optional host-side game modules  
- [ ] Packaging (AppImage / zip release with runtimes)
