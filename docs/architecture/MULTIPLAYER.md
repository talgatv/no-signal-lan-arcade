# LAN multiplayer

## Short answer

**No game needs its own “network discovery engine”.**  
You need **one host server** (PC Python or Android) + a **shared protocol** (WebSocket).
Browsers connect to **one host IP** — that is how players “find” each other.  
Games only send/receive messages through a thin client (`ogh-net`).

```text
  [Host PC or phone]  HTTP serves lobby + games/**
         │
         │  WebSocket /ws
         ▼
  ┌─────────────────────────────────────┐
  │  CORE: lobby · rooms · relay/state  │
  └─────────────────────────────────────┘
         │              │              │
      Browser A     Browser B     Browser C
```

Games **must not** scan Wi‑Fi themselves (browsers cannot do this reliably).  
“Found each other” = everyone opened `http://192.168.x.x:port` (QR / link).

---

## What exists vs what is left

| Exists | Still improving |
|--------|-----------------|
| Static games and utility programs | Host-authoritative sim for races |
| PC host HTTP + WebSocket (`pc/host.py`) | Private messages / roles |
| Android 0.2.0 HTTP/HTTPS + WebSocket host | External pack management |
| Catalog + lobby UI | Reconnect and late-join recovery |
| `ogh-net` client | More MP game examples |
| Action relay between clients | Server-side game modules |

Plain `python -m http.server` serves files only — it does **not** connect players.  
Use **`pc/host.py`** or the Android host for WS + broadcast.

---

## Two layers of “engine”

### 1. Host core (one for all games)

Responsibilities:

- HTTP: `/`, `/games/<id>/`, `/games/programs/<id>/`, and catalog
- PC-only documentation route: `/docs/**`
- WebSocket: join, leave, room state, `game:action`, `game:state`  
- Game registry via catalog  
- Rooms: `roomId`, `gameId`, `players[]`

Language: **Python on PC**; **Kotlin + Ktor Netty on Android**.
Protocol stays stable so games do not care which host binary runs.

### 2. Browser game runtime (per pack)

Not a second Unity. About **50–150 lines** of shared JS:

```text
OGHNet.connect(url) → room
OGHNet.send({ type, payload })
OGHNet.on('state' | 'action' | 'players', handler)
OGHNet.isHost / OGHNet.playerId
```

Modes:

| Mode | When |
|------|------|
| `offline` | No WS — solo / AI / local |
| `online` | Host `/ws` available |

The game defines rules. The host **relays** (or later validates) state.

---

## Sync models by genre

| Genre | Model | Example |
|-------|--------|---------|
| Turns / quiz | Host player or host validates state | Quiz, Codenames-like |
| Sandbox | Host (or host player) owns map; clients send dig/place | Rootwork MP |
| Racing / action | Input relay + snapshot / prediction | Pulse Race |
| Party phases | Host advances phases | Mafia |

**Racing MVP path:**

1. Clients send `input` ~15–20 Hz.  
2. Host player (or future core) simulates and sends `snapshot` ~10–15 Hz.  
3. Others interpolate.

Until then Pulse Race runs **offline** with AI, while still calling `ogh-net`.

---

## How players meet in practice

1. Host runs `./start.sh` or taps **Play together** in the Android app.
2. The PC shows its LAN URL; Android shows one QR plus share/copy actions.
3. Guests open the invitation on the same Wi-Fi.
4. Library/profile: choose a name and open a game.
5. Game loads `/games/<id>/client/?name=&room=`  
6. `ogh-net` joins the room; play starts.

**mDNS / “scan for games”** from a pure browser is unreliable.  
Current discovery = **QR + IP**.

---

## Protocol v1

Client → server:

```json
{ "v": 1, "type": "join", "room": "main", "name": "Ada", "gameId": "pulse-race" }
{ "v": 1, "type": "ready", "value": true }
{ "v": 1, "type": "game:action", "action": "input", "payload": { "steer": -1, "throttle": 1 } }
```

Server → client:

```json
{ "v": 1, "type": "hello", "playerId": "a1b2", "isHost": true, "room": "main" }
{ "v": 1, "type": "lobby", "players": [{ "id": "a1b2", "name": "Ada", "ready": true }] }
{ "v": 1, "type": "game:action", "from": "a1b2", "action": "input", "payload": { } }
```

Client API: [../contributing/ENGINE_API.md](../contributing/ENGINE_API.md)  
Author guide: [../contributing/ADD_MULTIPLAYER_GAME.md](../contributing/ADD_MULTIPLAYER_GAME.md)

---

## Do we need one browser game engine?

| Option | Verdict |
|--------|---------|
| One heavy engine for all games | ❌ kills lightness |
| One **net + lobby + plugin API** | ✅ yes |
| Each game = HTML/JS pack | ✅ as now |
| WebRTC P2P without host | ⚠️ later; hotspot pain |

**Conclusion:** one **network runtime** (host + `ogh-net`), many **thin games**.

---

## Rollout plan

1. ✅ Solo games + `OGHNet` offline fallback  
2. ✅ PC host static + WS rooms + lobby  
3. ⬜ Turn-based MP reference (tic-tac-toe)  
4. ⬜ Pulse Race online snapshot  
5. ⬜ Trivia party  
6. ⬜ Rootwork shared dig  
7. ✅ Android host + QR/share invitation

---

## FAQ

**Do games ping the LAN themselves?**  
No. Only the host IP is known.

**Can we work without the Android app?**  
Yes — PC host is enough; phones use browsers.

**Does offline still work?**  
Yes. No WS → `offline` mode (AI / local).

**Security?**  
LAN trust only; see [SECURITY.md](../SECURITY.md).
