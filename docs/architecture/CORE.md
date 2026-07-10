# Портативное ядро (Game Core)

## Цель

Один **Game Core**, который:

- поднимает HTTP + WebSocket сервер;
- раздаёт статический UI лобби и игры;
- управляет комнатами, игроками, lifecycle игр;
- **не зависит** от Android / iOS / desktop UI.

Платформа = **тонкий адаптер**: lifecycle ОС, foreground service, hotspot API, иконка в трее.

```
┌─────────────────────────────────────────────────────────┐
│  Platform Host (Android / iOS / Electron / CLI)         │
│  - permissions, hotspot, notifications, tray            │
└──────────────────────────┬──────────────────────────────┘
                           │ Host Adapter API
┌──────────────────────────▼──────────────────────────────┐
│  GAME CORE (portable)                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ HTTP     │ │ WebSocket│ │ Lobby &  │ │ Game       │ │
│  │ static   │ │ hub      │ │ Rooms    │ │ Registry   │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────┬──────┘ │
│                                               │        │
│  ┌────────────────────────────────────────────▼──────┐ │
│  │ Game Plugin API  (manifest + client + optional    │ │
│  │                   authoritative server module)    │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
         │ LAN
         ▼
   Browser clients (phones)
```

## Рекомендуемый стек (с учётом ультра-лёгкости)

> Детали Android: [ANDROID_STACK.md](./ANDROID_STACK.md)

| Слой | Выбор | Почему |
|------|--------|--------|
| **Android host** | **Kotlin + Jetpack Compose + Material 3** | Как Dual; тонкий native UI; маленький APK |
| **HTTP + WebSocket на хосте** | **Kotlin** (Ktor CIO или ultra-minimal server) | Без Node/Chromium в APK |
| **Клиент лобби и игр** | **Vanilla JS + HTML/CSS + canvas/SVG** | Браузер гостей; max 10 МБ/игра, цель ≪ 2 МБ |
| **Серверная логика игр** | JS в sandbox **или** Kotlin handlers | MVP: state machine на хосте на Kotlin; простые игры — client-authoritative + host relay |
| **Desktop later** | Kotlin/JVM CLI или Compose Desktop | Тот же протокол, другой shell |
| **i18n** | UN-6: en, zh, ru, es, ar, fr | Хост: strings.xml; игры: JSON packs; CJK/AR шрифты системные |

**Почему не TS/Node внутри Android:** философия продукта — соревнование лёгкости. Встроенный runtime съест бюджет размера раньше первой игры.

**Портируемость:** не «один бинарник на всё», а **один протокол + одни game packs (web) + тонкие host shells** (`android/`, `desktop/`, …).

## Game Plugin (формат игры)

Каждая игра — папка:

```
games/
  codenames/
    manifest.json      # id, title, players min/max, genres, size budget
    client/            # то, что отдаётся браузеру
      index.html
      ...
    server/            # optional: authoritative logic
      index.ts         # hooks: onJoin, onMessage, onLeave, tick
    assets/            # ≤ суммарно укладываемся в 10 МБ
    README.md
```

### manifest.json (черновик схемы)

```json
{
  "id": "codenames",
  "name": "Кодовые имена",
  "version": "0.1.0",
  "minPlayers": 4,
  "maxPlayers": 8,
  "bestPlayers": [4, 6],
  "supportsSolo": false,
  "genres": ["party", "word", "team"],
  "tags": ["speech", "teams", "asymmetric"],
  "estimatedSizeMb": 1.2,
  "entry": {
    "client": "client/index.html",
    "server": "server/index.ts"
  },
  "orientation": "any",
  "familyFriendly": true
}
```

## Сетевой протокол (черновик)

- REST/static: `GET /`, `GET /games/:id/*`, `GET /api/lobby`  
- WS: `/ws`  
  - клиент → сервер: `join`, `ready`, `game:action`, `chat`  
  - сервер → клиент: `lobby:state`, `game:state`, `game:event`, `error`  

Игры **не** открывают свои порты: только сообщения через core hub с `gameId` + `roomId`.

## Режимы хоста

1. **Hotspot host** — телефон раздаёт Wi‑Fi, сервер на нём.  
2. **LAN host** — все в одной домашней сети.  
3. **Local solo** — браузер на том же устройстве (`127.0.0.1`).

## Портируемость

| Платформа | Роль host adapter | Приоритет |
|-----------|-------------------|-----------|
| Linux desktop | CLI / tray app | P0 (разработка) |
| Android | Foreground service + QR | P0 (продукт) |
| Windows / macOS | CLI / tray | P1 |
| iOS | Ограничения background/hotspot | P2 (сложнее) |

**Правило:** любая платформа, где можно слушать TCP на LAN и раздавать файлы, может быть хостом. Игроки всегда = браузер.

## Что ядро НЕ делает

- Не рисует сложный native UI игр (это HTML).  
- Не хранит облачные аккаунты.  
- Не обновляет игры из интернета в offline-режиме (обновления — при наличии сети, отдельно).

## Следующие архитектурные решения (открыты)

1. Runtime: Node vs Bun vs Go binary.  
2. Нужен ли authoritative server для каждой игры или достаточно host-as-player trust.  
3. Как паковать игры в APK (assets vs downloadable packs при установке с ПК).
