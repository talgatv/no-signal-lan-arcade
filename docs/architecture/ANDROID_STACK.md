# Android-стек (решение)

## Критерии выбора

1. **Очень лёгкий хост** — APK оболочки маленький; игры не раздувают base install.  
2. **Мультиплатформа позже** — `android/` сейчас, desktop/iOS рядом, общее ядро.  
3. **Языки ООН** с первого дня (i18n-ready).  
4. **Знакомый DX** — как Dual: Kotlin + Compose.  
5. **Игры = браузер** — любой телефон без установки APK.

---

## Рекомендация (итог)

| Слой | Стек | Зачем |
|------|------|--------|
| **Android host UI** | **Kotlin + Jetpack Compose + Material 3** | Как Dual: быстрый UI, Play Store, foreground service, QR |
| **Локальный сервер** | **Kotlin** (минимальный HTTP + WebSocket, мало зависимостей) | Без Node/Chromium внутри APK — экономия десятков МБ |
| **Лобби + игры (клиент)** | **HTML / CSS / vanilla JS** (canvas/SVG), без тяжёлых движков | Открывается в браузере гостей; ≤ 10 МБ на игру |
| **Тексты UI хоста** | Android `res/values-XX/strings.xml` | Системный i18n, RTL (ar) из коробки |
| **Тексты/словари игр** | JSON locale packs **по требованию** | Китайский словарь не лежит в каждой игре «на всякий» |
| **Сборка Android** | Gradle, Version Catalog, minSdk 26, JDK 17 | Как Dual |

**Не берём для хоста:** Flutter, React Native, Capacitor+WebView-app, Electron, встроенный Node — база слишком тяжёлая для философии «соревнование лёгкости».

**Не берём для игр (по умолчанию):** Unity, Unreal, Godot export, Phaser «на весь бандл», большие texture packs.

---

## Структура репозитория (цель)

```
OFFline_games_app/
├── README.md
├── docs/
├── android/                 # хост-приложение (Kotlin/Compose)
│   └── app/
├── core/                    # общее: протокол, модели комнат (portable)
│   └── ...                  # старт: Kotlin common или просто spec + shared assets
├── web/                     # то, что раздаёт сервер браузерам
│   ├── lobby/               # лобби (HTML)
│   └── shared/              # общий CSS/JS kit (кнопки, i18n loader)
├── games/                   # плагины-игры, каждая папка ≤ 10 МБ
│   ├── tictactoe/
│   ├── quiz/
│   └── ...
└── desktop/                 # позже: тот же серверный протокол
```

Android-папка — **первый** platform host. Ядро и `games/` не привязаны к Android.

---

## Почему не «весь dual-стек + Node внутри»

| Вариант | Размер / сложность | Вердикт |
|---------|-------------------|---------|
| Compose + **встроенный Node/Bun** | +30–80 МБ, кошмар сборки | ❌ против «очень лёгких» |
| Compose + **Capacitor** (UI=Web) | лишний WebView-runtime | ❌ UI хоста лучше native |
| **Flutter** host | base APK заметно толще | ❌ для нашей философии |
| **KMP + Compose Multiplatform** сразу | мощно, но дольше старт | ⏳ фаза 2–3, не блокер MVP |
| **Compose + тонкий Kotlin server** | APK хоста реально **2–8 МБ** без игр | ✅ рекомендуется |

Игры могут жить:

- **в APK** как `assets/games/...` (несколько MVP-игр), или  
- **как паки** (скачал один раз / скопировал с ПК) — base app остаётся крошечным.

Философия: **«GTA в 10 МБ»** = процедурка, вектор, мало кадров анимации, свои правила, ноль фотореализма. Лимит 10 МБ — потолок; цель большинства игр — **&lt; 500 КБ–2 МБ**.

---

## Сервер на Android (детали)

Минимальные обязанности хоста:

1. Слушать `0.0.0.0:PORT` (HTTP static + WebSocket).  
2. Раздавать `web/lobby` + `games/<id>/`.  
3. Держать комнаты / игроков / broadcast state.  
4. Foreground service + уведомление «сервер запущен».  
5. Экран: старт/стоп, IP, QR, язык UI, список установленных игр.

**Зависимости — скупо:**

- Coroutines  
- Compose BOM (как Dual)  
- Опционально: ZXing/QR **или** свой QR через tiny lib / системный share ссылки  
- **Без** Room на MVP (состояние в RAM + DataStore для настроек)  
- **Без** Vosk и прочих native SDK, пока не нужны  

Реализация HTTP/WS:

| Вариант | Плюсы | Минусы |
|---------|-------|--------|
| **A. Свой minimal server** (ServerSocket + ws handshake) | минимум МБ | больше кода |
| **B. Ktor CIO** | удобный API | +размер |
| **C. NanoHTTPD / tiny fork + свой WS** | баланс | поддержка |

**MVP:** B или C — скорость разработки.  
**Оптимизация размера:** при необходимости урезать до A.

---

## i18n: языки ООН

Официальные языки ООН (целевой набор):

| Код | Язык | Особенности |
|-----|------|-------------|
| `en` | English | default fallback |
| `zh` | 中文 (简体) | CJK шрифты — **системные**, не бандлить Noto CJK в APK |
| `ru` | Русский | |
| `es` | Español | |
| `ar` | العربية | **RTL** |
| `fr` | Français | |

### Правила лёгкости i18n

1. **Хост:** только `strings.xml` + `LayoutDirection` для ar.  
2. **Лобби/игры:** ключи `t('menu.play')` + файлы `locales/en.json`, `zh.json`, …  
3. **Не вшивать** огромные словари (Scrabble/Wordle) во все языки сразу —  
   `wordpacks/en.words.gz`, `wordpacks/zh.cedict-lite.gz` **подгружаются** с выбором языка комнаты.  
4. **Шрифты:** UI-системные / один латинский variable font &lt; 100 КБ; CJK/Arabic — from device.  
5. **Цифры и даты** — `locale`-aware, без лишних ICU-библиотек если хватает платформы.

---

## Связь с Dual

Можно **копировать паттерны**, не код 1:1:

- Gradle + Version Catalog + JDK 17  
- Compose screens + ViewModel  
- DataStore для «последний порт / язык / keep screen on»  
- Тёмный «cinema» UI, крупные тач-зоны  

Не тащить: Room-схему субтитров, Vosk, auto-sync.

---

## Сравнение стеков (шпаргалка)

| Стек host | Лёгкость | Скорость MVP | Порт на desktop | Знакомость (Dual) |
|-----------|----------|--------------|-----------------|-------------------|
| **Kotlin + Compose + Kotlin server** | ★★★★★ | ★★★★ | ★★★ (переписать shell) | ★★★★★ |
| KMP + Compose Multiplatform | ★★★★ | ★★★ | ★★★★★ | ★★★★ |
| Flutter | ★★★ | ★★★★ | ★★★★ | ★★ |
| Capacitor (Web host) | ★★ | ★★★★ | ★★★ | ★★ |
| Go mobile + thin UI | ★★★★★ | ★★ | ★★★★ | ★ |

**Выбор сейчас:** строка 1.  
**Эволюция:** вынести модели/протокол в `core` (KMP), UI shell — platform-specific.

---

## Definition of lightweight

| Артефакт | Целевой размер (ориентир) |
|----------|---------------------------|
| Base APK (host, 0–2 demo games) | **&lt; 8–12 МБ** install, лучше меньше |
| Одна игра (pack) | **жёсткий max 10 МБ**, цель **&lt; 2 МБ** |
| «Шедевр минимализма» | **&lt; 200 КБ** — badge в каталоге |
| Wordpack на язык | отдельно, gzip, не в base без нужды |

Это и есть «соревнование»: не AAA, а **максимум геймплея на килобайт**.

---

## Открыто (не блокирует старт Android)

1. Ktor vs nano-server — решить при первом spike «hello lobby in browser».  
2. Игры в APK vs external packs — MVP: 2–3 в assets.  
3. Имя пакета (`lol....` как Dual или новый id).

---

*Связано: [CORE.md](./CORE.md), [VISION.md](../VISION.md).*
