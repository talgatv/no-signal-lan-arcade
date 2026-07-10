# OGH PC Host

Lightweight **LAN server** for Offline Games Hub, written in **Python 3** (standard library only).

- Serves packs from `../games/`
- Lobby: `http://IP:8080/` (or `https://` with `--https`)
- WebSocket: `ws://IP:8080/ws` (rooms, ready, `game:action` / `game:state` relay)
- **Phone GPS / sensors:** run with TLS: `./start.sh --https` then open `https://IP:8080/` and accept the self-signed certificate once.
- **No Node, no pip, no npm**
- **Offline-capable:** portable Python under `runtimes/win64` and `runtimes/linux64` when present

Phones on the same Wi‑Fi open the host URL and play in the browser.

Offline distribution notes: **[OFFLINE.md](OFFLINE.md)**  
Architecture: **[docs/architecture/HOST_PC.md](../docs/architecture/HOST_PC.md)**

```text
pc/
├── host.py              # server
├── start.sh / start.bat # launchers
├── www/                 # lobby HTML
└── runtimes/            # portable Python (large; often gitignored)
```

## Run

### Linux / macOS

```bash
cd pc
./start.sh                 # plain HTTP
./start.sh --https         # self-signed TLS for phones (mic, compass, GPS)
./start.sh --https-regen   # remake cert after Wi‑Fi IP change
# or: python3 host.py --port 8080 --https
```

### Windows

```bat
cd pc
start.bat
start.bat --https
```

Phone sensors / push-to-talk radio usually need HTTPS — see **[HTTPS.md](HTTPS.md)**.

### Bundled Python (offline)

| OS | Runtime |
|----|---------|
| Windows | `runtimes/win64/python.exe` (~22 MB) |
| Linux x64 | `runtimes/linux64/bin/python3` (~80 MB) |
| macOS | system `python3` (portable not bundled) |

Launchers prefer bundled runtimes, then system Python.

Download scripts (`runtimes/download_*.sh|ps1`) are needed **only if** runtime folders are missing (e.g. fresh git clone).  
See [OFFLINE.md](OFFLINE.md) and [runtimes/README.md](runtimes/README.md).

## After start

1. On PC: `http://127.0.0.1:8080/`  
2. On phones (same network): `http://<PC_LAN_IP>:8080/`  
3. **Connect to lobby** → see players  
4. Open a game — library loads from `games/catalog/games.json`  
5. Multiplayer packs use `ogh-net` → `/ws`

Options:

```bash
python3 host.py --port 9090 --bind 0.0.0.0
python3 host.py --games /path/to/games
```

## HTTP / WS API

| URL | |
|-----|--|
| `GET /` | Lobby |
| `GET /games/...` | Game packs + catalog |
| `GET /docs/...` | Project documentation |
| `GET /api/health` | `{ ok, rooms }` |
| `GET /api/rooms` | Room sizes |
| `WS /ws` | OGH protocol v1 |

Protocol details: [docs/architecture/MULTIPLAYER.md](../docs/architecture/MULTIPLAYER.md)  
Client API: [docs/contributing/ENGINE_API.md](../docs/contributing/ENGINE_API.md)

## Requirements

- Python **3.9+** (3.11 / 3.12 recommended) if not using bundled runtime  
- Open LAN port (firewall allow inbound 8080)  
- Hotspot: PC on phone’s hotspot **or** all devices on the same router  

## Why not Node

Smaller footprint, no `node_modules`, single `host.py`, portable CPython tens of MB vs heavier runtimes. Future Android host is **Kotlin**, not Node.

## Status

| Feature | |
|---------|--|
| HTTP static | ✅ |
| WebSocket lobby | ✅ |
| Game action relay | ✅ |
| Catalog-driven library UI | ✅ |
| Directory → `index.html` | ✅ |
| Full race simulation on server | ⬜ (client/AI; online snapshot next) |
| QR in lobby | ⬜ |
| Installer (.msi / AppImage) | ⬜ later |
