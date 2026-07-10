# Каталог игр — схема данных

Живой реестр всех игр, вариаций и «семейств».  
**Сейчас:** JSON (git-friendly, читается лобби/инструментами без SQLite).  
**Позже:** тот же смысл полей → SQLite на Android-хосте (`games.db`).

## Файлы

| Файл | Роль |
|------|------|
| [`games.json`](games.json) | Записи игр (основная «таблица» `games`) |
| [`families.json`](families.json) | Семейства / франшизы механик |
| [`authors.json`](authors.json) | Авторы (нормализация, без дублей email) |
| [`SCHEMA.md`](SCHEMA.md) | Этот документ |

Версия схемы: **1**. Поле `schemaVersion` в каждом корневом JSON.

---

## Таблица `games` (элемент массива `games`)

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `id` | string | да | Уникальный slug: `comet`, `comet-pixel` |
| `name` | string | да | Отображаемое имя (default locale) |
| `names` | map locale→string | нет | Локализованные названия |
| `tagline` | string | нет | Одна строка «о чём игра» |
| `style` | string | да | Основной стиль рисовки (см. словарь ниже) |
| `styles` | string[] | нет | Доп. теги стиля |
| `genres` | string[] | да | Жанры |
| `controls` | object | да | Тип управления (см. ниже) |
| `parameters` | object | нет | Настраиваемые параметры игры (сложность, бюджет колодцев…) |
| `tags` | string[] | нет | Свободные теги |
| `instructions` | map locale→string | да | Как играть (коротко) |
| `instructionsLong` | map locale→string | нет | Подробный гайд |
| `authorId` | string \| null | нет | FK → `authors.id` |
| `authorInline` | object \| null | нет | Если автора ещё нет в authors.json |
| `dates.added` | ISO date | да | Дата добавления в каталог |
| `dates.updated` | ISO date | нет | Последнее обновление записи |
| `dates.released` | ISO date | нет | «Релиз» версии |
| `familyId` | string \| null | нет | FK → `families.id` |
| `variantOf` | string \| null | нет | `id` базовой игры, если это вариация |
| `relatedIds` | string[] | нет | Похожие / того же семейства (двусторонне дублируем для удобства) |
| `relationNote` | string | нет | «pixel reskin + grid wells» |
| `players.min` | int | да | |
| `players.max` | int | да | |
| `players.solo` | bool | да | |
| `entry` | string | да | Путь от `games/`: `comet/client/index.html` |
| `manifest` | string | нет | Путь к manifest.json |
| `version` | string | нет | semver пакета |
| `sizeBudgetKb` | number | нет | Оценка / лимит |
| `sizeMeasuredKb` | number | нет | Замер `du` |
| `status` | enum | да | `idea` \| `wip` \| `experimental` \| `playable` \| `stable` \| `deprecated` |
| `license` | string | нет | MIT, CC0, … |
| `familyFriendly` | bool | да | |
| `localeDefault` | string | нет | `en` |
| `notes` | string | нет | Внутренние заметки для разработчиков |

### `authorInline` (если без `authors.json`)

```json
{
  "name": "OGH Team",
  "email": null,
  "site": null,
  "links": [
    { "label": "GitHub", "url": "https://..." }
  ]
}
```

### `controls` — тип управления

Разделение важно для лобби: на телефоне гостя **сенсор** — основной; на ноутбуке в той же LAN часто удобнее **клавиатура**.  
**Геймпад пока не учитываем** (зарезервировано на потом).

```json
"controls": {
  "primary": "touch",
  "supported": ["touch", "mouse"],
  "keyboard": "none",
  "mouse": "ok",
  "notes": {
    "en": "Tap to place wells. Mouse click works the same.",
    "ru": "Тап = колодец. Клик мыши — то же самое."
  }
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `primary` | enum | Главный задуманный ввод: `touch` \| `mouse` \| `keyboard` \| `hybrid` |
| `supported` | string[] | Все реально работающие способы из словаря ниже |
| `keyboard` | enum | `none` — клавиш нет; `optional` — есть, но не обязательны; `required` — без клавы не поиграть |
| `mouse` | enum | `none` \| `ok` \| `required` — мышь/трекпад как pointer (клик = тап часто `ok`) |
| `notes` | map locale→string | опционально | Подсказка для карточки в лобби |

#### Словарь устройств / способов (`supported` и смысл `primary`)

| id | Смысл | Типичные игры |
|----|--------|----------------|
| `touch` | Палец: tap, drag, multi-touch | Comet, викторина-кнопки, drawing |
| `mouse` | Курсор: click, drag (десктоп/ноут) | То же, что touch, если hit-area крупные |
| `keyboard` | Клавиши: WASD, стрелки, hotkeys | Змейка, тетрис, roguelike, typing |
| `hybrid` | *(только как `primary`)* равноценно touch+keyboard | «табы или стрелки» |

**Правила фильтра в лобби (рекомендация):**

| Фильтр | Условие |
|--------|---------|
| «Только телефон / сенсор» | `supported` содержит `touch` и `keyboard` ≠ `required` |
| «Удобно с клавиатуры» | `keyboard` ∈ {`optional`,`required`} или `supported` содержит `keyboard` |
| «Можно и так и так» | `primary` = `hybrid` или (есть `touch` и `keyboard` optional/required) |

**Не путать:**

- `mouse` ≈ pointer; на телефоне его нет, но **та же логика**, что touch, если игра tap-based.  
- Игра «только WASD» → `primary: keyboard`, `keyboard: required`, `supported: ["keyboard"]` (touch UI нет).  
- Игра «тап + опционально R = restart» → `primary: touch`, `keyboard: optional`.

Геймпад (`gamepad`) — **не добавляем в записи**, пока явно не решим поддерживать.

### `parameters` — тюнинг внутри игры

Свободный объект: ключ = id параметра, значение = дескриптор.

```json
"parameters": {
  "difficulty": {
    "type": "enum",
    "default": "normal",
    "options": ["easy", "normal", "hard"],
    "affects": ["wellsPerLevel", "wellLifeSec"],
    "labels": { "en": "Difficulty", "ru": "Сложность" }
  },
  "wellsPerLevel": {
    "type": "derived",
    "description": { "en": "…", "ru": "…" }
  }
}
```

Типичные `type`: `enum` · `int` · `float` · `bool` · `derived` (вычисляется из других).

Для Comet: **Easy** даёт больше гравиколодцев и дольше их жизнь; **Hard** — минимум зарядов.

---

## Таблица `authors`

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | `ogh-team`, `ivan-ivanov` |
| `name` | string | |
| `email` | string \| null | Публичный контакт (опционально) |
| `site` | string \| null | Основной сайт |
| `links` | {label, url}[] | Соцсети, itch, GitHub… |
| `notes` | string \| null | |

---

## Таблица `families`

Семейство = одна **механика / фантазия**, разные стили или правила.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | `comet` |
| `name` | string | |
| `names` | map | |
| `description` | map locale→string | |
| `gameIds` | string[] | Члены семейства |
| `baseGameId` | string \| null | «каноничная» версия |
| `dates.added` | ISO date | |

**Пример:** `comet` (neon vector) + `comet-pixel` (pixel + snap) → family `comet`.

Связи можно читать так:

1. По `familyId` — все вариации.  
2. По `variantOf` — дерево «форк от».  
3. По `relatedIds` — произвольные «см. также».

---

## Словарь `style` (рисование)

| id | Смысл |
|----|--------|
| `neon-vector` | Градиенты, glow, smooth canvas |
| `pixel` | Низкое разрешение, nearest-neighbor, ограниченная палитра |
| `pixel-hires` | Пиксель-арт на высоком canvas |
| `flat-ui` | Плоский UI, shapes |
| `ascii` | Текст / Unicode |
| `minimal-line` | Контуры, monoline |
| `hand-drawn` | Имитация скетча |
| `shader-abstract` | Упор на fullscreen shader |
| `photo-collage` | (избегаем — тяжело) |

---

## SQLite (миграция позже)

Предлагаемые таблицы 1:1:

```sql
CREATE TABLE authors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  site TEXT,
  links_json TEXT,  -- JSON array
  notes TEXT
);

CREATE TABLE families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  names_json TEXT,
  description_json TEXT,
  base_game_id TEXT,
  date_added TEXT NOT NULL
);

CREATE TABLE games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  names_json TEXT,
  tagline TEXT,
  style TEXT NOT NULL,
  styles_json TEXT,
  genres_json TEXT NOT NULL,
  controls_json TEXT NOT NULL,  -- { primary, supported, keyboard, mouse, notes }
  tags_json TEXT,
  instructions_json TEXT NOT NULL,
  instructions_long_json TEXT,
  author_id TEXT REFERENCES authors(id),
  author_inline_json TEXT,
  date_added TEXT NOT NULL,
  date_updated TEXT,
  date_released TEXT,
  family_id TEXT REFERENCES families(id),
  variant_of TEXT REFERENCES games(id),
  related_ids_json TEXT,
  relation_note TEXT,
  players_min INTEGER NOT NULL,
  players_max INTEGER NOT NULL,
  players_solo INTEGER NOT NULL,
  entry TEXT NOT NULL,
  manifest TEXT,
  version TEXT,
  size_budget_kb REAL,
  size_measured_kb REAL,
  status TEXT NOT NULL,
  license TEXT,
  family_friendly INTEGER NOT NULL,
  locale_default TEXT,
  notes TEXT
);

CREATE TABLE family_games (
  family_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  PRIMARY KEY (family_id, game_id)
);
```

Скрипт импорта `json → sqlite` — когда появится Android host / CLI.

---

## Правила ведения

1. Новый пакет игры → строка в `games.json` + при необходимости family.  
2. Вариация стиля/механики = **новый `id`**, не перезапись.  
3. `variantOf` указывает на канон; `relatedIds` симметричны по возможности.  
4. Email автора только с согласия; иначе `null`.  
5. Размер: после заметных правок обновлять `sizeMeasuredKb`.  
6. Не класть бинарники в JSON — только метаданные и пути.
