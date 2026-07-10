# Мультиплеер по локальной сети (LAN)

## Короткий ответ

**Нет, каждой игре не нужен свой «движок поиска».**  
Нужен **один host-сервер** на телефоне (уже в плане OGH) + **общий протокол** (WebSocket).  
Браузеры игроков подключаются к **одному IP хоста** — так они «находят» друг друга.  
Игры только шлют/принимают сообщения через тонкий клиентский слой (`ogh-net`).

```
  [Телефон-хост]  HTTP раздаёт lobby + games/*
        │
        │  WebSocket /ws
        ▼
  ┌─────────────────────────────────────┐
  │  CORE: lobby · rooms · relay/state  │
  └─────────────────────────────────────┘
        │              │              │
     Browser A     Browser B     Browser C
     (player)      (player)      (player)
```

Игры **не** сканируют Wi‑Fi сами (из браузера это почти нельзя).  
«Нашли друг друга» = все открыли `http://192.168.x.x:порт` хоста (QR / ссылка).

---

## Что уже есть vs чего не хватает

| Есть | Нет (нужно для MP) |
|------|---------------------|
| Статические игры (Comet, Rootwork, …) | Постоянный **host process** (Android / desktop) |
| Раздача файлов через любой HTTP | **WebSocket hub** + комнаты |
| Каталог игр | **Лобби** (ник, ready, выбор игры) |
| | Общий клиентский **`ogh-net`** в играх |
| | Авторитетное состояние (кто confит мир) |

Сейчас `python -m http.server` **только файлы**. Он **не** связывает игроков.  
Мультиплеер появится, когда host умеет **WS + broadcast**.

---

## Два уровня «движка»

### 1. Host Core (на телефоне / ПК) — один на все игры

Ответственность:

- HTTP: `/`, `/lobby`, `/games/<id>/`, `/shared/`
- WebSocket: join, leave, room state, `game:action`, `game:state`
- Реестр игр из `manifest` / catalog
- Комнаты: `roomId`, `gameId`, список `players[]`

Язык: **Kotlin на Android** (как Dual-shell) или Node/desktop для разработки.  
Протокол стабильный — игры не зависят от языка хоста.

### 2. Browser Game Runtime (в каждой игре) — тонкий

Не «новый Unity». Это **50–150 строк** общего JS:

```text
OGHNet.connect(url) → room
OGHNet.send({ type, payload })
OGHNet.on('state' | 'event' | 'players', handler)
OGHNet.isHost / OGHNet.playerId
```

Режимы:

| Режим | Когда |
|-------|--------|
| `offline` | Нет WS — соло / vs AI / split-screen |
| `online` | Есть `/ws` на хосте — реальный MP |

Игра **сама** решает правила (кто сталкивается, кто выиграл).  
Хост **ретранслирует** (relay) или **подтверждает** state (authority) — по типу игры.

---

## Модели синхронизации (по жанрам)

| Жанр | Модель | Пример |
|------|--------|--------|
| Ходы / викторина | Host authoritative, простой state | Quiz, Codenames |
| Песочница | Host держит карту, клиенты шлют dig/place | Rootwork MP |
| Гонки / action | Relay input + snapshot / client prediction | Pulse Race |
| Party | Host ведёт фазы | Мафия |

Для **гонок** MVP:

1. Каждый клиент шлёт `input` (газ, поворот) 15–20 Hz.  
2. **Host-игрок** или **core** симулирует машины и шлёт `snapshot` 10–15 Hz.  
3. Остальные рисуют интерполяцию.

Пока core нет — Pulse Race работает **offline**: 1 игрок + AI, или 2 на одном экране.

---

## Как «находят» друг друга на практике

1. Хост жмёт **Start server** → Wi‑Fi / hotspot.  
2. UI показывает **QR** и `http://192.168.43.1:8080`.  
3. Гости в браузере открывают URL (тот же Wi‑Fi).  
4. Лобби: ник → Ready → хост жмёт **Start game**.  
5. Все грузят `/games/pulse-race/client/?room=...`  
6. `ogh-net` уже в комнате, игра стартует.

**mDNS / «сканер игр»** в браузере без native-моста — ненадёжно.  
На Android-хосте можно позже: «устройства рядом» через NSD, но MVP = **QR + IP**.

---

## Минимальный протокол (черновик)

Клиент → сервер:

```json
{ "v": 1, "type": "join", "room": "main", "name": "Ada" }
{ "v": 1, "type": "ready", "value": true }
{ "v": 1, "type": "game:action", "action": "input", "payload": { "t": 1, "steer": -1, "throttle": 1 } }
```

Сервер → клиент:

```json
{ "v": 1, "type": "lobby", "players": [{ "id": "p1", "name": "Ada", "ready": true }] }
{ "v": 1, "type": "game:start", "gameId": "pulse-race", "seed": 42 }
{ "v": 1, "type": "game:state", "tick": 120, "payload": { "cars": [...] } }
```

---

## Нужен ли «один браузерный движок»?

| Вариант | Вердикт |
|---------|---------|
| Один толстый game engine на все игры | ❌ не нужен, убьёт лёгкость |
| Один **net + lobby + plugin API** | ✅ да |
| Каждая игра = HTML/JS pack | ✅ как сейчас |
| WebRTC peer-to-peer без хоста | ⚠️ можно позже; NAT/hotspot больнее, чем central host |

**Итог:** один **сетевой runtime** (`core` + `ogh-net`), много **тонких игр**.

---

## План внедрения MP

1. ✅ Игры solo + `OGHNet` (offline fallback).  
2. ✅ **PC host** — `pc/host.py` (Python stdlib): static + WS rooms + lobby.  
3. ✅ Lobby page — `pc/www/index.html`.  
4. ⬜ Pulse Race online — input/snapshot поверх host.  
5. ⬜ Rootwork online — tile patches.  
6. ⬜ Android host — foreground service + QR.

---

## FAQ

**Игры сами пингуют локалку?**  
Нет. Только хост известен по IP.

**Можно без Android-приложения?**  
Да, на dev: `host-cli` на ноуте; телефоны заходят в браузере.

**Сохранит ли offline?**  
Да. Нет WS → `offline` (AI / local).

**Безопасность?**  
Только LAN, без аккаунтов. Trust local network.
