# Android host

Нативное **приложение-хост** для Offline-игр по локальной Wi‑Fi.

Телефон с этим APK поднимает сервер. Остальные игроки заходят **через браузер** (отдельное приложение не нужно).

Код Android-проекта будет жить **в этой папке**. Сейчас здесь только описание; scaffold Gradle/Compose — следующий шаг.

---

## Роль

| Делает host | Не делает host |
|-------------|----------------|
| Старт / стоп локального HTTP + WebSocket | Рисовать сложный геймплей (это HTML-игры) |
| Показ IP и QR для подключения | Облачный матчмейкинг |
| Foreground service, чтобы сервер не убили | Тяжёлые 3D-движки |
| Выбор языка UI, keep-screen-on | Установку APK на телефоны гостей |
| Раздача лобби + game packs | |

---

## Стек

Ориентир — [Double_subs / Dual](../../Double_subs): знакомый и лёгкий путь.

| | |
|--|--|
| Язык | **Kotlin** |
| UI | **Jetpack Compose** + Material 3 |
| Сборка | Gradle, Version Catalog |
| minSdk / target | 26 / 36 (как Dual, уточним при scaffold) |
| JDK | **17** (обязательно) |
| Сеть | **Kotlin** HTTP + WebSocket (без Node внутри APK) |
| Настройки | DataStore |
| i18n | `res/values-XX/strings.xml` |

Подробности и сравнения стеков: [../docs/architecture/ANDROID_STACK.md](../docs/architecture/ANDROID_STACK.md).

### Языки UI (ООН)

`en` · `zh` · `ru` · `es` · `ar` (RTL) · `fr`

Шрифты CJK / Arabic — **системные**, не бандлим Noto CJK в APK.

---

## Цели по размеру

Философия продукта: **соревнование очень лёгких игр**.

| Артефакт | Ориентир |
|----------|----------|
| Base APK (оболочка, 0–2 demo-игры) | как можно меньше; цель порядка **&lt; 8–12 МБ** |
| Одна игра (pack) | жёсткий max **10 МБ**, желательно **&lt; 2 МБ** |
| Badge «ultra» | **&lt; 200 КБ** на игру |

В APK не кладём: Node, Chromium, Flutter engine, Unity, огромные словари на все языки сразу.

---

## Планируемая структура (после scaffold)

```
android/
├── README.md                 ← вы здесь
├── settings.gradle.kts
├── build.gradle.kts
├── gradle/
│   └── libs.versions.toml
├── gradlew, gradlew.bat
└── app/
    ├── build.gradle.kts
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/.../         # Compose UI, service, server
        ├── res/              # themes, strings (en/zh/ru/es/ar/fr)
        └── assets/           # опционально: lobby + demo games
```

Общие игры и веб-лобби в корне репо (`games/`, `web/`) — не дублировать логику; Android только **раздаёт** их с устройства (assets или external packs).

---

## Связь с остальным репо

```
OFFline_games_app/
├── android/          ← ЭТОТ хост (Kotlin/Compose)
├── docs/             ← визия, каталог игр, архитектура
├── games/            ← (будет) web-плагины ≤ 10 МБ
├── web/              ← (будет) лобби для браузера
└── desktop/          ← позже, другой thin host
```

- Каталог игр: [../docs/games/CATALOG.md](../docs/games/CATALOG.md)  
- Ядро / протокол: [../docs/architecture/CORE.md](../docs/architecture/CORE.md)  
- Корень: [../README.md](../README.md)

---

## Сборка (когда появится проект)

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64   # или ваш JDK 17
cd android
./gradlew :app:assembleDebug
# APK → app/build/outputs/apk/debug/
```

Пока `./gradlew` здесь нет — папка только под документацию и будущий scaffold.

---

## MVP экранов host

1. **Home** — «Запустить сервер» / «Остановить»  
2. **Running** — IP, порт, QR, число подключений, кнопка «открыть лобби у себя»  
3. **Settings** — язык, порт, keep screen on  
4. (Позже) список установленных game packs  

---

## Статус

| | |
|--|--|
| Папка `android/` | ✅ есть |
| README | ✅ этот файл |
| Gradle / Compose skeleton | ⬜ не создан |
| HTTP/WS server | ⬜ |
| QR + foreground service | ⬜ |

---

## Имя пакета (черновик)

TBD. Варианты:

- `lol.offline.games` / `lol.lan.party`
- `dev.<you>.offlinegames`

Зафиксируем при первом `build.gradle.kts`.
