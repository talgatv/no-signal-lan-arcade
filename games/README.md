# Games — web packs for Offline Games Hub

Each game is a **folder pack** ≤ **10 MB** (aim ≪ 2 MB).  
Players open games in a **browser** via the PC host.

## Add your game

→ **[docs/contributing/ADD_A_GAME.md](../docs/contributing/ADD_A_GAME.md)** (beginner)  
→ **[docs/contributing/ADD_A_GAME.ru.md](../docs/contributing/ADD_A_GAME.ru.md)** (русский)  
→ **[ENGINE.md](./ENGINE.md)** (engine surface)  
→ Templates: [`_templates/`](_templates/) · `python3 tools/new_game.py <id> --title "..."`

## Концепция

### Философия «GTA в 10 МБ»

- Максимум геймплея на килобайт.
- Процедурная графика, SVG/canvas, минимум растров.
- Без CDN, без React/Phaser «на весь бандл» по умолчанию.
- Офлайн: всё в пакете игры + опционально `_shared/`.

### Единый look & feel (OGH kit)

Общие куски лежат в [`_shared/`](_shared/):

| Ресурс | Назначение |
|--------|------------|
| `css/ogh-base.css` | Цвета, типографика, кнопки, HUD, safe-area |
| `css/ogh-fonts.css` | `@font-face` для локальных шрифтов |
| `fonts/` | Roboto, Open Sans, Noto Sans, Montserrat, JetBrains Mono, Press Start 2P (OFL) |
| `js/ogh-shader-bg.js` | Полноэкранный WebGL-фон (переиспользуемые шейдеры) |
| `shaders/*.glsl` | Исходники fragment/vertex (читаются как текст / инлайн) |
| `js/ogh-sfx.js` | Крошечные beep’ы через Web Audio (без mp3) |
| `js/ogh-i18n.js` | Заготовка ключей UI (en/ru/…) |

Игры **могут** работать и без `_shared` (копия критичного CSS), но для экспериментов удобнее relative `../_shared/...`.

Когда появится Android-сервер, shared можно монтировать как `/shared/*`, а игры — `/games/<id>/`.

### Манифест

У каждой игры — `manifest.json` (id, игроки, размер, entry). См. пример в `comet/`.

### Структура игры

```
games/<id>/
  manifest.json
  README.md
  client/
    index.html    # точка входа для браузера
    ...
```

## Реестр (JSON → позже SQLite)

Метаданные всех игр, авторов, семейств и вариаций:

| Файл | Содержание |
|------|------------|
| [`catalog/SCHEMA.md`](catalog/SCHEMA.md) | Поля, связи, план SQLite |
| [`catalog/games.json`](catalog/games.json) | Игры: стиль, жанр, инструкция, автор, даты, related… |
| [`catalog/families.json`](catalog/families.json) | Семейства механик (Comet + pixel-вариация) |
| [`catalog/authors.json`](catalog/authors.json) | Авторы (имя, email, сайт, ссылки) |

**Вариация** = отдельный `id` + `variantOf` + общий `familyId`.  
Пример: `comet` ↔ `comet-pixel`.

**Управление** (`controls` в каталоге): `touch` / `mouse` / `keyboard`  
(`primary`, `supported`, `keyboard: none|optional|required`). Геймпад пока не учитываем.  
См. [catalog/SCHEMA.md](catalog/SCHEMA.md) → секция `controls`.

## Установленные пакеты

| ID | Название | Стиль | Управление | Игроки | Статус |
|----|----------|-------|------------|--------|--------|
| [`comet`](comet/) | Comet | neon-vector | touch / mouse | 1 | ✅ |
| [`comet-pixel`](comet-pixel/) | Comet Pixel | pixel + grid | touch / mouse | 1 | ✅ |
| [`rootwork`](rootwork/) | Rootwork | pixel tiles · sandbox | touch / mouse / keys | 1 | ✅ |
| [`pulse-race`](pulse-race/) | Pulse Race | neon top-down racing | touch / keys | 1–4* | ✅ |

\*Pulse Race: сейчас 1P+AI; LAN когда host WebSocket.

**Мультиплеер:** [docs/architecture/MULTIPLAYER.md](../docs/architecture/MULTIPLAYER.md) · клиент [`_shared/js/ogh-net.js`](_shared/js/ogh-net.js)

Идеи впрок: [../docs/games/CATALOG.md](../docs/games/CATALOG.md).

## Как открыть локально

Простой статический сервер из корня `games/` (нужны пути к `_shared`):

```bash
cd games
python3 -m http.server 8080
# → http://127.0.0.1:8080/comet/client/
```

Или открой `comet/client/index.html` — если браузер режет ES modules/file, используй сервер выше.

## Правила для новых игр

1. `manifest.json` + solo-playable client.  
2. Тач + мышь.  
3. Без внешних URL.  
4. `du -sh` перед коммитом — уложиться в бюджет.  
5. По возможности фон через `OGHShaderBg` (единый вайб «offline neon»).  
6. Family-friendly по умолчанию.
