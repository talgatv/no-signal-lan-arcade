# Contributor documentation (game engine)

**You do not need to rewrite the host.**  
You add a **game pack** (folder of HTML/JS) and register it in the **catalog**.  
Solo and multiplayer both use the same shape; multiplayer also uses `ogh-net`.

## Start here

| Level | Doc | Time |
|-------|-----|------|
| **Full integration manual (recommended)** | [GAME_INTEGRATION_MANUAL.md](./GAME_INTEGRATION_MANUAL.md) | 45–90 min read |
| **Beginner — short path** | [ADD_A_GAME.md](./ADD_A_GAME.md) | 30–60 min |
| **Начинающим — по-русски** | [ADD_A_GAME.ru.md](./ADD_A_GAME.ru.md) | краткая инструкция |
| **Multiplayer game** | [ADD_MULTIPLAYER_GAME.md](./ADD_MULTIPLAYER_GAME.md) | +1–2 h |
| **Save progress / profile** | [SAVE_PROGRESS.md](./SAVE_PROGRESS.md) | localStorage + export file |
| **API reference** | [ENGINE_API.md](./ENGINE_API.md) | reference |
| **Copy-paste checklist** | [CHECKLIST.md](./CHECKLIST.md) | 5 min |
| **FAQ** | [FAQ.md](./FAQ.md) | when stuck |

Official language of documentation: **English** ([docs index](../README.md)).

**Player hub (library + profile):** open `/games/` on the host — sort games, set nickname/avatar, view progress, download/upload profile JSON (browser-only).

## Templates (copy these)

```text
games/_templates/solo/           → simplest playable game
games/_templates/multiplayer/    → ogh-net room demo
```

Scaffold with a script:

```bash
python3 tools/new_game.py my-cool-game --title "My Cool Game" --author "Your Name"
python3 tools/new_game.py click-duel --multiplayer --title "Click Duel" --author "Your Name"
```

Validate before PR:

```bash
python3 tools/validate_catalog.py
```

## Mental model

```text
┌─────────────────────────────────────────┐
│  PC or Android host                     │
│  serves files + WebSocket rooms         │
└──────────────────┬──────────────────────┘
                   │
     /games/<your-id>/client/index.html
                   │
┌──────────────────▼──────────────────────┐
│  YOUR GAME (HTML/CSS/JS)                │
│  optional: import ogh-net for multiplayer│
└─────────────────────────────────────────┘
                   │
     catalog/games.json  ← library listing
```

**Library listing ≠ automatic discovery of random folders.**  
You must add a row in `games/catalog/games.json` (or run the scaffold script, which does it).  
The lobby loads that JSON and shows your game to everyone on the LAN.

## Rules of the road

1. Offline: no CDN, no paid APIs required to play.  
2. Size: hard max **10 MB**, target under **2 MB**.  
3. Touch-friendly.  
4. Family-friendly by default.  
5. Original names (no trademark clones).  
6. MIT contributions (see root LICENSE).

Welcome — make something tiny and brilliant.
