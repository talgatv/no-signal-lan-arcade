# OGH PC Host

Лёгкий **LAN-сервер** для Offline Games Hub на **Python 3** (только стандартная библиотека).

- Раздаёт игры из `../games/`
- Лобби: `http://IP:8080/`
- WebSocket: `ws://IP:8080/ws` (комнаты, ready, relay `game:action` / `game:state`)
- **Без Node, без pip, без npm**
- **Полный офлайн:** portable Python уже в `runtimes/win64` и `runtimes/linux64` — интернет не нужен

Телефоны в той же Wi‑Fi открывают URL хоста и играют в браузере.

📦 Офлайн-раздача: см. **[OFFLINE.md](OFFLINE.md)**

```
pc/
├── host.py              # движок
├── start.sh / start.bat # лаунчеры
├── www/                 # HTML-лобби
└── runtimes/            # portable Python (скачивается, не в git)
```

## Запуск

### Linux

```bash
cd pc
./start.sh
# или: python3 host.py --port 8080
```

### Windows

```bat
cd pc
start.bat
```

### Python уже лежит в проекте (офлайн)

| OS | Runtime |
|----|---------|
| Windows | `runtimes/win64/python.exe` (~22 МБ) |
| Linux x64 | `runtimes/linux64/bin/python3` (~80 МБ) |
| macOS | системный python3 (portable не бандлится) |

`start.sh` / `start.bat` **сначала** берут portable runtime, потом системный.

Скрипты `runtimes/download_*.sh|ps1` нужны **только если** папок нет (например, клонировали git без runtime).  
Подробности: [`OFFLINE.md`](OFFLINE.md), [`runtimes/README.md`](runtimes/README.md).

## После старта

1. На ПК: `http://127.0.0.1:8080/`  
2. На телефонах (та же сеть): `http://<IP_ПК>:8080/`  
3. **Connect to lobby** → видно игроков  
4. Открыть игру (например Pulse Race) — `ogh-net` подключится к `/ws`  

Опции:

```bash
python3 host.py --port 9090 --bind 0.0.0.0
python3 host.py --games /path/to/games
```

## API

| URL | |
|-----|--|
| `GET /` | Лобби |
| `GET /games/...` | Пакеты игр |
| `GET /api/health` | `{ ok, rooms }` |
| `WS /ws` | Протокол OGH v1 (join, ready, game:*) |

См. [`../docs/architecture/MULTIPLAYER.md`](../docs/architecture/MULTIPLAYER.md).

## Требования

- Python **3.9+** (рекомендуется 3.11 / 3.12)  
- Открытый порт в LAN (firewall: allow inbound 8080)  
- Для hotspot: ПК в сети раздачи телефона **или** телефон-гость в Wi‑Fi роутера с ПК  

## Почему не Node

Меньше вес, нет `node_modules`, один файл `host.py`, portable Python ~десятки МБ против тяжёлого runtime+deps. Android-хост позже — **Kotlin**, не Node.

## Статус

| | |
|--|--|
| HTTP static | ✅ |
| WebSocket lobby | ✅ |
| game action relay | ✅ |
| Полная симуляция гонок на сервере | ⬜ (клиенты + AI; online snapshot — следующий шаг) |
| Installer .msi / .AppImage | ⬜ позже |
