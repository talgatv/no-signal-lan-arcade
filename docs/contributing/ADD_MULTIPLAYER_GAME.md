# Add a multiplayer game

Multiplayer here means: **several browsers on the same Wi‑Fi**, talking through the **PC host WebSocket** — not the public internet.

You still ship a normal game pack. You add **`ogh-net`**.

---

## Big picture

```text
Phone A ──┐
Phone B ──┼──►  ws://HOST:8080/ws  ──►  rooms + relay
Phone C ──┘
              each browser also loads your HTML game files
```

- Players open the **same host URL** (lobby QR / IP).  
- Your game calls `OGHNet.connect({ gameId: 'your-id' })`.  
- If WebSocket is up → `mode: 'online'`.  
- If not (opened as static only) → `mode: 'offline'` (solo/AI fallback).

**Games never scan the LAN.** Discovery = host URL.

---

## 1. Scaffold

```bash
python3 tools/new_game.py click-party --multiplayer --title "Click Party" --author "Your Name"
```

Or copy:

```bash
cp -r games/_templates/multiplayer games/click-party
```

---

## 2. Connect to the room

```js
import { OGHNet } from '../../_shared/js/ogh-net.js';

const net = await OGHNet.connect({
  gameId: 'click-party',   // must match folder / catalog id
  // name & room taken from ?name= & ?room= query (lobby sets these)
});

console.log(net.mode);      // 'online' | 'offline'
console.log(net.playerId);
console.log(net.isHost);    // first joiner on server is host
```

Lobby links already look like:

```text
/games/click-party/client/?name=Ada&room=main
```

---

## 3. Core API (what you actually use)

### Listen

```js
net.on('players', (list) => {
  // [{ id, name, ready, isHost }, ...]
});

net.on('hello', (msg) => {
  // { playerId, isHost, room }
});

net.on('state', (payload) => {
  // authoritative snapshot from someone (often host)
});

net.on('event', (payload) => {
  // one-shot events
});

net.on('start', (msg) => {
  // host pressed start (optional flow)
});

net.on('mode', (mode) => { /* online | offline */ });
```

### Send

```js
// Gameplay action — relayed to other clients (not echoed to sender)
net.send('input', { x: 1, y: 0 });
net.send('tap', { score: 3 });

// Ready flag (lobby-style)
net.setReady(true);
```

### Host broadcast of full state

The PC host **relays** messages. It does **not** run your game rules.  
Typical pattern:

| Role | Responsibility |
|------|----------------|
| **Every client** | Draw UI, read local input |
| **Host client** (`net.isHost`) | Simulate world, `send` snapshots or events |
| **Others** | Apply `state` / `event` from network |

Example (host only):

```js
if (net.isHost) {
  net.send('snapshot', { tick, positions });
}
// NOTE: ogh-net wraps this as game:action with action name.
// Receivers listen:
net.on('state', ...)  // if you use type game:state from custom code
```

**Current host relay** (`pc/host.py`):

- Client sends `{ type: 'game:action', action, payload }` via `net.send(action, payload)`  
- Others receive `{ type: 'game:action', from, action, payload }`  
- Also supported: raw `game:state` / `game:event` if you extend send (see ENGINE_API)

For the template, we use **`net.send` + custom events on the wire** and also listen with:

```js
net.on('*', (type, msg) => { ... }); // optional debug
```

The template multiplayer game shows a **shared counter**: any player taps, everyone sees the number (host or any peer can broadcast via action relay).

---

## 4. Design patterns by genre

| Genre | Pattern |
|-------|---------|
| Turn-based (tic-tac-toe) | Host validates moves; broadcast board |
| Trivia | Host advances questions; clients send answers |
| Racing | Clients send input; host simulates; broadcast cars |
| Sandbox dig | Clients send dig/place; host owns tile map |
| Party roles | Host assigns roles privately (send only to one id — *future*); MVP: public state |

**MVP tip:** start with **fully public state** (everyone sees everything). Private roles come later.

---

## 5. Offline fallback (required for good UX)

Always handle:

```js
if (net.mode === 'offline') {
  // solo practice / vs AI / local-only
}
```

Never hard-crash if WebSocket fails. Guests might open a file path or a broken port.

---

## 6. Catalog flags

In `games.json` / `manifest.json`:

```json
"players": { "min": 2, "max": 8, "solo": true },
"tags": ["multiplayer", "realtime"],
"multiplayer": {
  "status": "ready",
  "protocol": "ogh-net-v1",
  "notes": "Shared counter via action relay"
}
```

`solo: true` + multiplayer means: works alone **and** with friends.

---

## 7. Test with two browsers

1. `cd pc && ./start.sh`  
2. Chrome window A: lobby → Connect → your game  
3. Chrome window B (or phone): same room name → Connect → same game  
4. Confirm `mode: online` in UI (template shows it)  
5. Actions on A appear on B  

Same **room** string (`main` by default). Different rooms = isolated groups.

---

## 8. Security reality (LAN parties)

- Anyone on the Wi‑Fi who knows the URL can join.  
- No passwords in MVP.  
- Don’t put secrets in the game.  
- Trust the room like people on the same couch.

---

## 9. PR checklist (multiplayer)

- [ ] Works **offline** alone  
- [ ] Works **online** with 2 browsers  
- [ ] `gameId` matches folder and catalog  
- [ ] No CDN  
- [ ] Document controls for 2+ players  
- [ ] `validate_catalog.py` passes  

---

## 10. Template walkthrough

Open `games/_templates/multiplayer/client/game.js` and read top comments.  
Copy, rename, replace the counter with your rules.

Full low-level protocol: [ENGINE_API.md](./ENGINE_API.md)  
Architecture: [../../architecture/MULTIPLAYER.md](../architecture/MULTIPLAYER.md)
