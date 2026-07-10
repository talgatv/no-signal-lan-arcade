# План разработки Offline Games Hub с помощью LLM

Документ для людей и для агентов (Claude / Grok / Cursor и т.д.).  
Цель: вести проект **итерациями**, с маленькими PR-задачами, офлайн-first и без раздувания размера.

**Дата:** 2026-07-10  
**Репо:** локальный git → публичный GitHub (следующий шаг)  
**Лицензия (предложение):** MIT для кода; шрифты/Python — свои OFL/PSF

---

## 1. Продукт в одном абзаце

Хост (сначала **PC Python**, потом **Android**) поднимает LAN-сервер.  
Гости открывают браузер → лобби → лёгкие игры (≤ 10 МБ).  
Без интернета. Сборник игр + общий net-слой (`ogh-net`) + каталог метаданных.

---

## 2. Принципы работы с LLM

| Правило | Зачем |
|---------|--------|
| **Одна задача = один заход** | Меньше галлюцинаций и ломающих диффов |
| **Сначала docs/spec, потом код** | Игры и MP легко расползаются scope |
| **Лимит размера** | Каждая игра ≤ 10 МБ, цель ≪ 2 МБ; host без Node |
| **Не коммитить секреты и 100+ МБ runtime в git** | `runtimes/*64` — Release / USB |
| **Проверка руками** | `pc/start.sh` + телефон в Wi‑Fi + 2 браузера |
| **Каталог обновлять сразу** | `games/catalog/*.json` — источник правды |
| **Промпт со ссылкой на файлы** | `docs/VISION.md`, `MULTIPLAYER.md`, `CATALOG.md` |

### Шаблон промпта для агента

```text
Проект: Offline Games Hub (OGH). Офлайн LAN, браузерные игры, PC host = Python stdlib.

Контекст прочитай:
- docs/VISION.md
- docs/architecture/MULTIPLAYER.md
- docs/plans/LLM_DEVELOPMENT_PLAN.md (этот файл)
- games/catalog/SCHEMA.md

Задача: <одна конкретная задача из §4>
Ограничения: без Node; без CDN; touch-first; не трогай pc/runtimes/*64.
Definition of done: <как проверить>.
```

### Роли LLM (можно чередовать)

1. **Architect** — только design doc, без кода  
2. **Implementer** — код по готовому plan  
3. **Reviewer** — checklist: размер, offline, i18n hooks, security LAN  
4. **Game designer** — правила + manifest + catalog row  
5. **Release** — CHANGELOG, tag, offline zip instructions  

---

## 3. Текущее состояние (baseline)

| Компонент | Статус |
|-----------|--------|
| Документация vision / core / android stack / multiplayer | ✅ |
| Каталог JSON (games, families, authors, controls, parameters) | ✅ |
| Игры: Comet, Comet Pixel, Rootwork, Pulse Race | ✅ solo / AI |
| Shared: css, fonts, sfx, shader-bg, ogh-net | ✅ |
| PC host (`pc/host.py`) HTTP + WS lobby + relay | ✅ |
| PC lobby UI | ✅ |
| Portable Python offline on disk | ✅ (gitignored) |
| Android host scaffold | ⬜ только README |
| Реальный online-gameplay (гонка snapshot) | ⬜ |
| Публичный GitHub + Pages | ⬜ следующий шаг человека |
| CI | ⬜ |

---

## 4. Дорожная карта (эпики → задачи для LLM)

### Эпик A — GitHub public + Pages (человек + LLM docs)

| ID | Задача | Кто | DoD |
|----|--------|-----|-----|
| A1 | Локальный `git init` + initial commit | agent | repo with history |
| A2 | Создать repo на GitHub, `git remote`, push | человек | public URL |
| A3 | LICENSE (MIT), CODE_OF_CONDUCT optional | LLM | files at root |
| A4 | GitHub Pages: лендинг из `docs/` или `pc/www` + README | LLM + человек | site live |
| A5 | Release **offline-pack**: zip с `runtimes/win64+linux64` | человек | asset на Release |
| A6 | Topics: offline, lan, party-game, python | человек | discoverable |

**Pages идея:** статическая страница «что это / как запустить / скриншоты», не сам host (host нужен Python на ПК).

---

### Эпик B — PC host hardening (LLM)

| ID | Задача | DoD |
|----|--------|-----|
| B1 | QR-код в лобби (локальная lib или canvas QR без CDN) | QR ведёт на `http://LAN_IP:port/` |
| B2 | Показ всех IP + copy button | UX |
| B3 | Unit-тесты handshake WS (stdlib unittest) | `python -m unittest` green |
| B4 | `--open` открыть браузер; config.json port | dev UX |
| B5 | Rate-limit / max players per room | защита от мусора в LAN |
| B6 | Лог в файл optional `--log` | debug party |

---

### Эпик C — Мультиплеер игр (LLM, по одной игре)

| ID | Задача | DoD |
|----|--------|-----|
| C1 | Pulse Race: online input relay + host authority snapshot | 2 браузера, 2 машины |
| C2 | Простая party-игра **Trivia** (3–8) на ogh-net | вопросы JSON RU/EN |
| C3 | Rootwork: optional shared dig patches (delay OK) | 2 игрока видят блоки |
| C4 | Tic-tac-toe / Connect4 как «учебный» turn-based MP | протокол эталон |
| C5 | Документ «как добавить MP в игру» 1 страница | contrib guide |

**Порядок C:** C4 → C1 → C2 → C3 (от простого к сложному).

---

### Эпик D — Каталог и контент (LLM)

| ID | Задача | DoD |
|----|--------|-----|
| D1 | HTML catalog browser `/games/catalog/view.html` | фильтр genre / players / controls |
| D2 | 5–10 новых micro-игр по CATALOG shortlist | каждая ≤ 2 МБ, catalog row |
| D3 | i18n strings en+ru+zh минимум в лобби | UN-6 later |
| D4 | Badge «ultra &lt; 200 KB» в catalog | sizeMeasuredKb filled |
| D5 | Family links UI (variantOf) | Comet ↔ Pixel |

---

### Эпик E — Android host (LLM, большой)

| ID | Задача | DoD |
|----|--------|-----|
| E1 | Gradle skeleton Kotlin+Compose (как Dual) | assembleDebug |
| E2 | Embed: start/stop foreground service | notification |
| E3 | Перенос логики host: Ktor/minimal WS **или** встроенный tiny server | phone = host |
| E4 | QR + IP screen | guest join |
| E5 | Assets: ship 3 demo games in APK | size budget |
| E6 | UN languages strings.xml | en/zh/ru/es/ar/fr |

**Не делать E, пока C1 или C4 не работает на PC** — отладка сети проще на desktop.

---

### Эпик F — Качество и релиз (LLM + человек)

| ID | Задача | DoD |
|----|--------|-----|
| F1 | CI: lint python + json validate catalog | GitHub Actions |
| F2 | Script `tools/measure_games.py` sizes → catalog | automated |
| F3 | Security note: LAN trust model | SECURITY.md |
| F4 | v0.1.0 tag: PC host + 4 games + docs | Release notes |
| F5 | Playtest checklist (blackout party 4 phones) | written results |

---

## 5. Порядок работ на ближайшие 2–4 недели

```text
Week 0 (сейчас)
  A1 git local ✅
  A2–A3 GitHub public + LICENSE
  A4 Pages landing (simple)

Week 1
  C4 turn-based MP эталон
  B1–B2 QR + IP
  C1 Pulse Race online

Week 2
  C2 Trivia
  D1 catalog viewer
  B3 tests

Week 3+
  E1–E4 Android host
  D2 more games (LLM batch: 1 game / session)
  F1 CI + F4 release
```

---

## 6. Структура репо (целевая)

```
OFFline_games_app/
  README.md
  LICENSE
  docs/                 # vision, architecture, plans
  games/                # packs + catalog + _shared
  pc/                   # Python host + www + runtimes (local)
  android/              # future Compose host
  tools/                # measure, validate catalog
  .github/workflows/    # CI later
```

---

## 7. Метрики успеха

| Метрика | Цель v0.1 |
|---------|-----------|
| Игр playable offline | ≥ 4 |
| Игр с real LAN MP | ≥ 1 |
| PC host без pip/node | да |
| Гостевой join &lt; 30 с | QR/IP |
| Размер одной игры | max 10 МБ, median &lt; 1 МБ |
| Языки UI лобби | en + ru minimum |

---

## 8. Риски и как режет LLM

| Риск | Митигация |
|------|-----------|
| Агент тащит React/Phaser/Node | Явный запрет в промпте + review |
| Раздувает git runtime | gitignore + Release assets |
| MP desync в гонках | Сначала C4 turn-based; гонки — host authority |
| Scope «ещё 50 игр» | Tier list в CATALOG; 1 игра / PR |
| Android раньше времени | Gate: PC MP green |

---

## 9. Чеклист перед «сделай игру X» (для LLM)

- [ ] `manifest.json` + `client/`  
- [ ] запись в `catalog/games.json` (+ family)  
- [ ] controls + genres + instructions en/ru  
- [ ] без CDN; шрифты только из `_shared/fonts` если нужны  
- [ ] touch + optional keyboard  
- [ ] `du -sh` → `sizeMeasuredKb`  
- [ ] ссылка из `pc/www` games list **или** catalog viewer  
- [ ] README игры: как открыть через PC host  

---

## 10. Следующие конкретные команды (человек)

```bash
# после initial commit:
# 1) Создать пустой public repo на GitHub (без README)
# 2) git remote add origin git@github.com:<user>/offline-games-hub.git
# 3) git branch -M main
# 4) git push -u origin main
# 5) Settings → Pages → Deploy from branch main / docs
# 6) Release → приложить offline-runtimes-win-linux.zip
```

---

*Этот план — живой. После каждого эпика обновляйте таблицу §3 Status.*
