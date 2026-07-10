# Programs

Utility apps (not competitive “gamesplay packs”). Same LAN host, same browser clients.

| Kind | Folder | Catalog field |
|------|--------|----------------|
| Game | `games/<id>/` | `"kind": "game"` (default) |
| Program | `programs/<id>/` | `"kind": "program"` |

Both appear in the hub at `/games/` (filter by type).  
Shared kit still lives in `games/_shared/` (import as `../../games/_shared/...` from a program client, or use `/games/_shared/...` absolute from host).

## Packs

| ID | Name | Status |
|----|------|--------|
| [`lan-chat`](lan-chat/) | LAN Chat & Radio | text + push-to-talk |
| compass | Compass | (your pack — add when ready) |

## Scaffold note

`tools/new_game.py` currently targets `games/`. For programs, copy `lan-chat` or create manually and set `"kind": "program"` + `entry` under `programs/`.
