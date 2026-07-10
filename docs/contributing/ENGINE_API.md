# Engine API reference

“Engine” = **host + catalog + shared JS**, not a monolithic game runtime.

---

## 1. Game pack contract

### Required paths

```text
games/<id>/
  manifest.json
  client/index.html
```

### manifest.json (recommended fields)

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | = folder name |
| `name` | string | Display name |
| `version` | semver | e.g. `0.1.0` |
| `minPlayers` / `maxPlayers` | int | |
| `supportsSolo` | bool | |
| `genres` | string[] | |
| `style` | string | drawing style id |
| `controls` | object | see SCHEMA |
| `entry.client` | string | usually `client/index.html` |
| `familyFriendly` | bool | |
| `multiplayer` | object | optional |

### Catalog row

Must exist in `games/catalog/games.json` for lobby library listing.  
See [SCHEMA.md](../../games/catalog/SCHEMA.md).

`entry` is relative to `games/`:

```json
"entry": "hello-dots/client/index.html"
```

---

## 2. HTTP URLs (PC host)

| URL | Purpose |
|-----|---------|
| `/` | Lobby UI |
| `/games/<path>` | Files under `games/` |
| `/games/catalog/games.json` | Library data |
| `/api/health` | `{ ok, rooms }` |
| `/ws` | WebSocket |

Example game URL:

```text
http://HOST:8080/games/hello-dots/client/?name=Ada&room=main
```

Query params used by `ogh-net` and lobby:

| Param | Meaning |
|-------|---------|
| `name` | Player display name |
| `room` | Room id (default `main`) |
| `ws` | Override WebSocket URL |
| `offline=1` | Force offline mode |

---

## 3. OGHNet (`games/_shared/js/ogh-net.js`)

### Import

```js
import { OGHNet } from '../../_shared/js/ogh-net.js';
```

(Path depth depends on your file location. From `client/game.js` one level of game folder → `../../_shared/...`.)

### `await OGHNet.connect(opts)`

```js
const net = await OGHNet.connect({
  gameId: 'my-game',
  room: 'main',       // optional; default from ?room=
  name: 'Player',     // optional; default from ?name=
  forceOffline: false,
});
```

Returns object:

| Property | Type | Description |
|----------|------|-------------|
| `mode` | `'online'\|'offline'` | Connection state |
| `playerId` | string | Stable for session |
| `isHost` | boolean | First player in room (server-assigned) |
| `players` | array | Last known lobby list |
| `name` | string | Your name |
| `room` | string | Room id |
| `gameId` | string | |

### Methods

| Method | Description |
|--------|-------------|
| `net.on(type, fn)` | Subscribe; returns unsubscribe fn |
| `net.off(type, fn)` | Unsubscribe |
| `net.send(action, payload)` | Send gameplay action |
| `net.setReady(boolean)` | Ready flag |
| `net.disconnect()` | Close socket |

### Events (`net.on`)

| type | When |
|------|------|
| `hello` | Identity assigned |
| `players` / lobby list | Roster changed |
| `mode` | online/offline |
| `state` | `game:state` message |
| `event` | `game:event` message |
| `start` | `game:start` |
| `local` | offline echo of `send` |
| `disconnect` | socket closed |
| `*` | all (fn receives `type, data`) |

### Wire format (client → server)

Join:

```json
{ "v": 1, "type": "join", "room": "main", "gameId": "my-game", "name": "Ada" }
```

Action (`net.send('tap', { n: 1 })`):

```json
{ "v": 1, "type": "game:action", "action": "tap", "payload": { "n": 1 }, "t": 123 }
```

Ready:

```json
{ "v": 1, "type": "ready", "value": true }
```

### Wire format (server → client)

Hello, lobby, and relayed `game:action` / `game:state` / `game:event` / `game:start`.  
See `pc/host.py` (`_dispatch`).

---

## 4. Shared UI / audio / shaders

| Module | Export |
|--------|--------|
| `ogh-sfx.js` | `createOghSfx()` → `{ play, unlock }` |
| `ogh-shader-bg.js` | `OGHShaderBg.mount(canvas)` |
| `ogh-base.css` | CSS variables + utility classes |
| `ogh-fonts.css` | `@font-face` local fonts |

SFX names: `tap`, `place`, `pickup`, `win`, `die`, `tick`.

---

## 5. Host responsibilities vs game responsibilities

| Host (`pc/host.py`) | Your game |
|---------------------|-----------|
| Serve static files | Render & input |
| WebSocket rooms | Game rules |
| Relay messages | Choose host-authority or peer relay |
| Lobby HTML | Optional in-game lobby UI |

The host does **not** load your `server/*.js` yet. All logic is client-side + relay.  
Future: optional authoritative server modules.

---

## 6. Validation tool

```bash
python3 tools/validate_catalog.py
```

Checks:

- JSON parse  
- unique ids  
- required fields  
- `entry` file exists  
- folder exists for each game id  

Exit code `0` = OK.

---

## 7. Versioning

- Catalog `schemaVersion`  
- Game `version` semver  
- Protocol `v: 1` on every WS message  

Bump game version when you break saves or net payload shape.
