# Roadmap

Detailed LLM task breakdown: [LLM_DEVELOPMENT_PLAN.md](./LLM_DEVELOPMENT_PLAN.md)

## Phase 0 — Docs, catalog, first games ✅

- [x] README, VISION, CORE, ANDROID_STACK, MULTIPLAYER (English)  
- [x] Catalog JSON + SCHEMA  
- [x] Games: Comet, Comet Pixel, Rootwork, Pulse Race, Demo Tap  
- [x] PC host Python + offline runtime support  
- [x] Contributor engine docs, templates, tools  
- [x] Public GitHub: https://github.com/talgatv/no-signal-lan-arcade  

## Phase 1 — PC host + LAN multiplayer

- [x] `pc/host.py` HTTP + WebSocket  
- [x] Lobby `pc/www` + catalog-driven library  
- [ ] QR + copy IP  
- [ ] Turn-based MP reference (tic-tac-toe / connect four)  
- [ ] Pulse Race online snapshot  
- [ ] Trivia party  

## Phase 2 — Android host

- [ ] Gradle Compose skeleton  
- [ ] Foreground service + HTTP/WS  
- [ ] QR + IP  
- [ ] Demo games in assets  

## Phase 3 — Catalog v1 (~15–25 games)

- [ ] Lobby filters (genre / players / controls)  
- [ ] More micro-games (1 PR = 1 game)  
- [ ] UN-6 i18n in host UI  

## Phase 4 — Release polish

- [ ] CI, security notes  
- [ ] Offline Release zip (runtimes)  
- [ ] Tag v0.1.0  

## Success metrics

| Milestone | Criterion |
|-----------|-----------|
| Friends demo | PC host + 2 phones + 1 real MP game |
| Alpha | 10 games, 2+ MP |
| Beta | Android host + 20 games |
