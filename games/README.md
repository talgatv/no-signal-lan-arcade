# Games — web packs for Offline Games Hub

Each game is a **folder pack** ≤ **10 MB** (aim ≪ 2 MB, ultra badge &lt; 200 KB).
Players open games in a **browser** through either the PC or Android host.
Utility web packs use the same format under [`programs/`](programs/).

## Add your game

| Resource | |
|----------|--|
| [Beginner guide](../docs/contributing/ADD_A_GAME.md) | Step-by-step |
| [Multiplayer guide](../docs/contributing/ADD_MULTIPLAYER_GAME.md) | ogh-net |
| [Engine map](./ENGINE.md) | Host + catalog + pack |
| [Templates](_templates/) | Solo & multiplayer starters |
| Scaffold | `python3 tools/new_game.py my-id --title "My Game" --author "Your Name"` |
| Validate | `python3 tools/validate_catalog.py` |

## Concept

### “GTA in 10 MB”

- Maximum gameplay per kilobyte.  
- Procedural / vector / canvas art; minimal bitmaps.  
- No CDN, no heavy default frameworks.  
- Offline after install/copy.

### Shared look (OGH kit)

Under [`_shared/`](_shared/):

| Resource | Purpose |
|----------|---------|
| `css/ogh-base.css` | Colors, type, buttons, HUD |
| `css/ogh-fonts.css` | Local OFL fonts |
| `js/ogh-shader-bg.js` | Fullscreen WebGL backgrounds |
| `js/ogh-sfx.js` | Tiny Web Audio beeps |
| `js/ogh-net.js` | Multiplayer client |

### Manifest

Every pack has `manifest.json` (id, players, genres, entry). See `catalog/SCHEMA.md`.

### Layout

```text
games/<id>/
  manifest.json
  README.md
  client/
    index.html
    ...
```

## Registry (JSON → SQLite later)

| File | Content |
|------|---------|
| [`catalog/SCHEMA.md`](catalog/SCHEMA.md) | Fields & relations |
| [`catalog/games.json`](catalog/games.json) | Library rows |
| [`catalog/families.json`](catalog/families.json) | Families / variants |
| [`catalog/authors.json`](catalog/authors.json) | Authors |

**Variant** = new `id` + `variantOf` + shared `familyId`.  
Example: `comet` ↔ `comet-pixel`.

**Controls** (`controls` in catalog): `touch` / `mouse` / `keyboard`  
(`primary`, `supported`, `keyboard: none|optional|required`). Gamepad later.

## Pack library

The hand-written five-pack table that used to live here quickly became stale.
[`catalog/games.json`](catalog/games.json) is the source of truth for the full,
growing library: games, multiplayer packs, samples, and utility
programs. The PC and Android hosts both render that catalog and serve the same
paths.

Useful entry points:

| Browse | Path |
|--------|------|
| All catalog rows | [`catalog/games.json`](catalog/games.json) |
| Utility programs | [`programs/`](programs/) |
| Solo starter | [`_templates/solo/`](_templates/solo/) |
| Multiplayer starter | [`_templates/multiplayer/`](_templates/multiplayer/) |

**Multiplayer docs:** [docs/architecture/MULTIPLAYER.md](../docs/architecture/MULTIPLAYER.md) · client [`_shared/js/ogh-net.js`](_shared/js/ogh-net.js)

Ideas backlog: [docs/games/CATALOG.md](../docs/games/CATALOG.md).

## Local run

```bash
cd pc && ./start.sh
# lobby: http://127.0.0.1:8080/
# direct: http://127.0.0.1:8080/games/<id>/client/
```

## Rules for new packs

1. `manifest.json` + solo-playable client (or clear MP offline fallback).  
2. Touch + mouse.  
3. No external URLs at runtime.  
4. `du -sh` before PR.  
5. Prefer OGH shared kit for visual cohesion.  
6. Family-friendly by default.
