# Как добавить свою первую игру (гайд для новичков)

Этот текст — для тех, кто **никогда** не вносил игру в чужой репозиторий.  
Если умеешь править файлы и открывать браузер — справишься.

---

## Что такое «игра» в этом проекте

Это **не** установка в Steam и не плагин Unity.

Это **маленький сайт** (HTML + CSS + JS), который:

1. Лежит в папке `games/твой-id/`  
2. Открывается через **PC-хост** (сервер в локальной сети)  
3. Появляется в **библиотеке** (каталог JSON)

Тебе **не нужны**: Node, React, Unity, интернет во время игры (после копирования проекта).

---

## 0. Подготовка

```bash
git clone https://github.com/talgatv/no-signal-lan-arcade.git
cd no-signal-lan-arcade
cd pc
./start.sh          # Linux
# Windows: start.bat
```

Открой: **http://127.0.0.1:8080/** — это лобби. Терминал не закрывай.

---

## 1. Самый быстрый путь (скрипт)

Из **корня** проекта:

```bash
python3 tools/new_game.py hello-dots --title "Hello Dots"
```

Появится папка `games/hello-dots/` и запись в каталоге.  
Обнови лобби (Ctrl+Shift+R) и открой игру:

**http://127.0.0.1:8080/games/hello-dots/client/**

Дальше правь `client/game.js` — это уже твоя механика.

---

## 2. Вручную (чтобы понять устройство)

### A. Имя (id)

Только латиница, цифры, дефис: `hello-dots`, `my-snake`.  
Папка **обязана** называться так же, как `id`.

### B. Скопируй шаблон

```bash
cp -r games/_templates/solo games/hello-dots
```

### C. `manifest.json`

Минимум: `id`, `name`, `minPlayers`, `maxPlayers`, `entry.client`, `familyFriendly`.

### D. Код игры

| Файл | Зачем |
|------|--------|
| `client/index.html` | Страница |
| `client/style.css` | Стили |
| `client/game.js` | Логика |

Общие штуки проекта (необязательно):

```html
<link rel="stylesheet" href="../../_shared/css/ogh-base.css" />
```

**Нельзя** подключать скрипты с интернета (cdn). Шрифты — только локальные из `_shared/fonts`.

### E. Запись в библиотеку

Файл: `games/catalog/games.json`  
Добавь объект в массив `"games": [ ... ]`.

Поля `id`, `name`, `entry`, `players`, `controls`, `genres`, `instructions`, `status`, `familyFriendly`, `dates.added` — обязательны по смыслу (валидатор подскажет).

### F. Проверка

```bash
python3 tools/validate_catalog.py
```

### G. Телефон в той же Wi‑Fi

На ПК запущен `./start.sh`.  
В телефоне: `http://IP-твоего-ПК:8080/` → твоя игра.

---

## 3. Как «движок» это видит

```text
Хост PC  →  раздаёт файлы из games/
Лобби    →  читает games/catalog/games.json  →  рисует список
Игрок    →  открывает /games/твой-id/client/
```

Без строки в `games.json` игра **откроется по прямой ссылке**, но **не покажется** в библиотеке лобби.

---

## 4. Размер

```bash
du -sh games/hello-dots
```

Максимум **10 МБ**, цель — **гораздо меньше** (сотни КБ).

---

## 5. Pull Request

```bash
git checkout -b feat/game-hello-dots
git add games/hello-dots games/catalog/games.json
git commit -m "Add Hello Dots micro-game"
git push -u origin feat/game-hello-dots
```

На GitHub: **Pull request** в  
https://github.com/talgatv/no-signal-lan-arcade  

---

## 6. Частые ошибки

| Ошибка | Что сделать |
|--------|-------------|
| Неверный JSON (запятая) | `python3 tools/validate_catalog.py` |
| Открыл `index.html` с диска | Только через `http://127.0.0.1:8080/...` |
| CDN / Google Fonts URL | Убрать, offline only |
| Папка ≠ id | Переименовать |

---

## Дальше

- Мультиплеер: [ADD_MULTIPLAYER_GAME.md](./ADD_MULTIPLAYER_GAME.md)  
- Чеклист: [CHECKLIST.md](./CHECKLIST.md)  
- English full guide: [ADD_A_GAME.md](./ADD_A_GAME.md)

Удачи — сделай что-то крошечное и весёлое.
