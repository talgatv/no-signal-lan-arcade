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
- [x] Turn-based MP reference (`tic-tac-toe`)
- [ ] Pulse Race online snapshot  
- [ ] Trivia party  

## Phase 2 — Android host

- [x] Gradle Compose application
- [x] Foreground service + HTTP/HTTPS + WebSocket host
- [x] Simple QR/share invitation flow
- [x] Offline game and program packs in APK assets

## Phase 3 — Community catalog

- [x] Catalog expanded beyond the original 15–25 entry goal
- [x] Library search, sorting, and player/type filters
- [ ] Keep adding focused micro-games (prefer 1 game per PR)
- [x] UN-6 i18n in the Android host UI
- [ ] Expand browser library and game translations

## Phase 4 — Release polish

- [x] Basic catalog/Python validation in CI + security notes
- [ ] Offline Release zip (runtimes)  
- [ ] Tag v0.1.0  

## Success metrics

| Milestone | Criterion |
|-----------|-----------|
| Friends demo | PC host + 2 phones + 1 real MP game |
| Alpha | 10 games, 2+ MP |
| Beta | Android host + 20 games |
