# Pull request checklist — new game

Copy into your PR description.

## Identity

- [ ] Folder name = `id` (lowercase, hyphens)
- [ ] `manifest.json` present and valid JSON
- [ ] Catalog row in `games/catalog/games.json`
- [ ] `entry` points to existing `client/index.html`

## Product rules

- [ ] Plays fully **offline** (no CDN / remote fonts / remote APIs)
- [ ] Size ≤ **10 MB** (`du -sh games/<id>`)
- [ ] Touch or large click targets
- [ ] Family-friendly (or clearly marked otherwise)
- [ ] Original title (no trademark impersonation)

## Solo

- [ ] Can finish / retry a session alone
- [ ] Tested via `pc/start.sh` → `http://127.0.0.1:8080/games/<id>/client/`

## Multiplayer (if applicable)

- [ ] Uses `ogh-net` (or documents why not)
- [ ] Offline fallback does not crash
- [ ] Tested with **two browsers**, same `room`
- [ ] `players.min` / `max` correct
- [ ] Tags include `multiplayer` when online is real

## Docs

- [ ] Game `README.md` with controls
- [ ] `instructions.en` (and ideally `ru`) in catalog
- [ ] Author credit if you want public attribution

## Tools

- [ ] `python3 tools/validate_catalog.py` exits 0

## License

- [ ] Agree contributions are MIT (project LICENSE)
