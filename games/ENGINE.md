# Game engine surface (for contributors)

This project is **not** Unity. The “engine” is three small pieces:

| Piece | Where | Your job |
|-------|--------|----------|
| **Host** | `pc/host.py` | Already written — serves files + WebSocket rooms |
| **Catalog** | `games/catalog/` | Add one JSON row per game |
| **Your pack** | `games/<id>/` | HTML/CSS/JS game |

## Quick paths

| I want to… | Go to |
|------------|--------|
| Add first solo game | [docs/contributing/ADD_A_GAME.md](../docs/contributing/ADD_A_GAME.md) |
| Multiplayer | [docs/contributing/ADD_MULTIPLAYER_GAME.md](../docs/contributing/ADD_MULTIPLAYER_GAME.md) |
| API reference | [docs/contributing/ENGINE_API.md](../docs/contributing/ENGINE_API.md) |
| Copy template | `games/_templates/solo` or `multiplayer` |
| Scaffold | `python3 tools/new_game.py my-id --title "My Game"` |
| Validate | `python3 tools/validate_catalog.py` |

## Shared libraries

```text
games/_shared/
  css/ogh-base.css
  css/ogh-fonts.css
  js/ogh-net.js      ← multiplayer
  js/ogh-sfx.js
  js/ogh-shader-bg.js
  fonts/             ← offline OFL fonts
```

Import from `client/game.js` as `../../_shared/js/...`.

## Library listing

Lobby reads **`/games/catalog/games.json`**.  
If your pack is missing from that file, it will **not** appear in the library (direct URL still works).
