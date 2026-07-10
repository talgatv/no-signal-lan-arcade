# Offline Games Hub

**Локальный игровой сервер на телефоне** — хост раздаёт Wi‑Fi / поднимает сервер в локальной сети, остальные подключаются через браузер и играют вместе. Без интернета. На случай отключения света, поездок, вечеринок.

## Идея

| Роль | Устройство | Что делает |
|------|------------|------------|
| **Хост** | Android (позже iOS, desktop) | Запускает приложение → поднимает HTTP/WebSocket сервер + (опционально) точку доступа |
| **Игроки** | Любой смартфон/планшет/ноутбук | Открывают `http://IP:порт` в браузере → лобби → игры |

- Каждая игра — **отдельный лёгкий пакет ≤ 10 МБ** (HTML/CSS/JS + ассеты).
- Игры **браузерные**: один код клиента для всех устройств.
- **Ядро (game core)** — платформо-независимое: сеть, лобби, комнаты, сессии, плагины игр. Портируется на Android, iOS, Linux, macOS, Windows.

## Для кого

- Семья и друзья в одной комнате без интернета  
- Вечера при отключении электричества (телефоны + powerbank)  
- Лагеря, поездки, офисные перерывы  

## Документация

| Документ | Содержание |
|----------|------------|
| [docs/VISION.md](docs/VISION.md) | Продуктовая визия, сценарии, ограничения |
| [docs/games/CATALOG.md](docs/games/CATALOG.md) | **Каталог игр** — жанры, механики, 1 / 2 / 3 / 4+ игроков |
| [docs/architecture/CORE.md](docs/architecture/CORE.md) | Портативное ядро, хост-адаптеры, жизненный цикл игр |
| [docs/architecture/ANDROID_STACK.md](docs/architecture/ANDROID_STACK.md) | **Стек Android-хоста** (Kotlin/Compose), i18n ООН, лимиты размера |
| [docs/architecture/MULTIPLAYER.md](docs/architecture/MULTIPLAYER.md) | **LAN multiplayer**: host, WebSocket, ogh-net, без P2P-скана |
| [docs/plans/ROADMAP.md](docs/plans/ROADMAP.md) | Этапы разработки |
| [docs/plans/LLM_DEVELOPMENT_PLAN.md](docs/plans/LLM_DEVELOPMENT_PLAN.md) | **План разработки с LLM** (эпики, промпты, порядок) |
| [pc/OFFLINE.md](pc/OFFLINE.md) | Офлайн-пакет PC (runtimes) |

## Стек (кратко)

- **PC host** ([`pc/`](pc/)): **Python 3 stdlib**, portable runtime **уже в** `pc/runtimes/` (Win+Linux) — **полный офлайн**, см. [`pc/OFFLINE.md`](pc/OFFLINE.md)  
- **Android host** (`android/`): Kotlin + Jetpack Compose (позже)  
- **Игроки**: браузер по Wi‑Fi (HTML/JS games ≤ 10 МБ)  
- **Языки**: en, zh, ru, es, ar, fr (ООН)

## Статус

🟢 **Фаза 0 — документация и каталог игр**  
🟡 **Android host** — [`android/`](android/) + README  
🟢 **Games** — Comet · Rootwork · [**Pulse Race**](games/pulse-race/) · каталог · [ogh-net](games/_shared/js/ogh-net.js)  
🟢 **PC Host** — [`pc/host.py`](pc/host.py) + лобби + WebSocket; portable Python scripts в [`pc/runtimes/`](pc/runtimes/)  
🟡 **Android host** — папка + README, scaffold позже  
⬜ Фаза 1 — MVP ядра + ещё игры  
⬜ Фаза 2 — Android-хост (сервер, QR, service)  
⬜ Фаза 3 — расширение каталога  

## Принципы

1. **Offline-first** — ноль зависимости от интернета после установки.  
2. **Лёгкие игры** — ≤ 10 МБ на игру, быстрая загрузка по Wi‑Fi.  
3. **Core отдельно от UI хоста** — один движок, много платформ.  
4. **Игры как плагины** — манифест + клиент + (опционально) серверная логика.  
5. **Телефон-friendly** — тач, вертикальные экраны, крупные кнопки.

## Лицензия

TBD (рекомендация: MIT или Apache-2.0 для ядра; игры — отдельно по желанию).
