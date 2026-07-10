# Portable game core

## Goal

A **host core** that:

- serves HTTP (lobby + static game packs);
- runs a WebSocket hub (rooms, players, relay);
- does **not** depend on Android / iOS / desktop UI chrome.

A **platform shell** only provides: process lifecycle, foreground service, hotspot helpers, tray icon, permissions.

```text
┌─────────────────────────────────────────────────────────┐
│  Platform Host (PC Python / Android / future iOS)       │
│  permissions, hotspot, notifications, tray             │
└──────────────────────────┬──────────────────────────────┘
                           │ thin adapter
┌──────────────────────────▼──────────────────────────────┐
│  HOST CORE                                              │
│  HTTP static │ WebSocket hub │ Rooms │ Game registry    │
│                      │                                  │
│              Game packs (plugins)                       │
│         manifest + client HTML (+ optional logic)       │
└─────────────────────────────────────────────────────────┘
         │ LAN
         ▼
   Browser clients
```

## Stack (lightweight-first)

| Layer | Choice | Why |
|-------|--------|-----|
| **PC host (now)** | Python 3 **stdlib** (`pc/host.py`) | No Node/pip; offline portable runtimes |
| **Android host (planned)** | Kotlin + Compose + thin HTTP/WS | Small APK; Dual-like DX |
| **Lobby + games** | Vanilla HTML/CSS/JS + canvas/SVG | Universal phones; ≤ 10 MB packs |
| **Net client** | `games/_shared/js/ogh-net.js` | One API for all multiplayer packs |
| **i18n goal** | en, zh, ru, es, ar, fr | Host strings + game JSON locales |

**Portability model:** one **protocol** + one **web pack format** + thin **host shells** (`pc/`, `android/`, …) — not one giant binary for everything.

**Why not Node inside Android:** the size budget dies before the first game.

## Game plugin format

```text
games/
  <id>/
    manifest.json
    README.md
    client/
      index.html      # required entry
      ...
    server/           # optional future: authoritative host logic
    assets/
```

### manifest.json (example)

```json
{
  "id": "codenames",
  "name": "Code Names",
  "version": "0.1.0",
  "minPlayers": 4,
  "maxPlayers": 8,
  "supportsSolo": false,
  "genres": ["party", "word", "team"],
  "style": "flat-ui",
  "controls": {
    "primary": "touch",
    "supported": ["touch", "mouse"],
    "keyboard": "optional",
    "mouse": "ok"
  },
  "entry": { "client": "client/index.html" },
  "familyFriendly": true
}
```

Library listing also requires a row in `games/catalog/games.json`.  
See [contributing/ENGINE_API.md](../contributing/ENGINE_API.md).

## Network protocol (v1)

| Channel | Role |
|---------|------|
| `GET /` | Lobby UI |
| `GET /games/...` | Static packs |
| `GET /games/catalog/games.json` | Library metadata |
| `WS /ws` | Realtime |

**Client → server:** `join`, `ready`, `game:action`, `chat`, `game:start` (host)  
**Server → client:** `hello`, `lobby`, `game:action` (relay), `game:state`, `game:event`, `error`

Games **do not** open their own ports. All traffic goes through the host hub with `room` + `gameId`.

Details: [MULTIPLAYER.md](./MULTIPLAYER.md).

## Host modes

1. **Hotspot host** — phone shares Wi‑Fi; server on the phone (Android).  
2. **LAN host** — everyone on the same router (PC or phone).  
3. **Local solo** — browser on `127.0.0.1`.

## Platform priority

| Platform | Role | Priority |
|----------|------|----------|
| Linux / Windows PC | Python host | **P0** (now) |
| Android | Compose shell + embedded server | **P0** product |
| macOS | System Python / future tray | P1 |
| iOS | Background/hotspot limits | P2 |

**Rule:** any OS that can listen on LAN TCP can be a host. Players are always browsers.

## What the core does *not* do

- Paint complex native game UI (that is HTML).  
- Cloud accounts or matchmaking.  
- Auto-update games while offline.

## Open decisions

1. Android HTTP: Ktor vs minimal ServerSocket.  
2. Per-game authoritative server modules vs host-player trust.  
3. APK ships few demo packs vs external pack install.

## Related

- [ANDROID_STACK.md](./ANDROID_STACK.md)  
- [HOST_PC.md](./HOST_PC.md)  
- [../VISION.md](../VISION.md)
