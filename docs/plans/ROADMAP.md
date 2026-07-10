# Roadmap

Актуальный **план с LLM-задачами:** [LLM_DEVELOPMENT_PLAN.md](./LLM_DEVELOPMENT_PLAN.md)

## Фаза 0 — Документация и каталог ✅

- [x] README, VISION, CORE, ANDROID_STACK, MULTIPLAYER  
- [x] Каталог JSON + SCHEMA  
- [x] Игры: Comet, Comet Pixel, Rootwork, Pulse Race  
- [x] PC host Python + offline runtimes on disk  
- [x] План LLM-разработки  
- [ ] Публичный GitHub + Pages  

## Фаза 1 — PC host + LAN multiplayer

- [x] `pc/host.py` HTTP + WebSocket  
- [x] Лобби `pc/www`  
- [ ] QR + copy IP  
- [ ] Эталон turn-based MP (крестики / 4 в ряд)  
- [ ] Pulse Race online snapshot  
- [ ] Trivia party  

## Фаза 2 — Android host

- [ ] Gradle Compose skeleton  
- [ ] Foreground service + WS/HTTP  
- [ ] QR + IP  
- [ ] Demo games in assets  

## Фаза 3 — Каталог v1 (~15–25 игр)

- [ ] Фильтры в лобби / catalog viewer  
- [ ] Больше micro-игр (1 PR = 1 игра)  
- [ ] i18n UN-6 в UI  

## Фаза 4 — Релиз

- [ ] CI, SECURITY.md  
- [ ] Offline Release zip (runtimes)  
- [ ] Tag v0.1.0  

## Метрики

| Вехи | Критерий |
|------|----------|
| Demo friends | PC host + 2 телефона + 1 MP-игра |
| Alpha | 10 игр, 2+ MP |
| Beta | Android host + 20 игр |
