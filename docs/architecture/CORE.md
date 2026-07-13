# Portable game core

## Goal

A **host core** that:

- serves HTTP (lobby + static game and program packs);
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
│          Game/program web packs (plugins)               │
│         manifest + client HTML (+ optional logic)       │
└─────────────────────────────────────────────────────────┘
         │ LAN
         ▼
   Browser clients
```

## Stack (lightweight-first)

| Layer | Choice | Why |
|-------|--------|-----|
| **PC host** | Python 3 **stdlib** (`pc/host.py`) | No Node/pip; offline portable runtimes |
| **Android host 0.2.0** | Kotlin + Compose + Ktor Netty HTTP/HTTPS/WS | Foreground service, QR invitation, same protocol |
| **Lobby + web packs** | Vanilla HTML/CSS/JS + canvas/SVG | Universal phones; ≤ 10 MB packs |
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

  programs/
    <id>/               # utility web packs use the same format
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
| `GET /games/...` | Static game and program packs |
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

## Implemented host adapters

The two shipping hosts implement the same v1 wire contract and URL layout:

- `pc/host.py` uses Python's standard library;
- Android 0.2.0 uses a Compose shell, foreground service, and Ktor Netty for
  HTTP/HTTPS/WebSocket;
- Android bundles the complete `games/` tree at build time and can override an
  individual asset from its external `packs/` directory.

The protocol and pack format are shared; the Python and Kotlin implementations
remain platform-specific so neither host carries another platform's runtime.

## Remaining decisions

1. Per-game authoritative server modules versus host-player trust.
2. External pack import, validation, signatures, and update policy.
3. Whether future native hosts justify extracting shared models to KMP.

## Related

- [ANDROID_STACK.md](./ANDROID_STACK.md)  
- [HOST_PC.md](./HOST_PC.md)  
- [../VISION.md](../VISION.md)
