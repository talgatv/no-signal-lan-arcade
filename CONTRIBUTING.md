# Contributing to Offline Games Hub

Thanks for helping build a **LAN arcade that works when the internet doesn’t**.  
Humans and AI agents are both welcome — same rules.

## Ways to contribute

| Kind | Examples |
|------|----------|
| **Games** | New micro-game pack under `games/<id>/` (≤ 10 MB, aim ≪ 2 MB) |
| **Host** | PC host UX, WebSocket reliability, lobby, QR, tests |
| **Docs** | Translations, tutorials, architecture clarity |
| **Catalog** | Metadata, genres, filters, i18n strings |
| **Android** | Kotlin/Compose host (see `docs/architecture/ANDROID_STACK.md`) |
| **Design** | UI kits, pixel/neon packs, accessibility |
| **Ideas** | Open an Issue first for large features |

## Before you code

1. Read [README.md](README.md) and [docs/VISION.md](docs/VISION.md).  
2. **Add a game (beginners):** [docs/contributing/ADD_A_GAME.md](docs/contributing/ADD_A_GAME.md)  
   · [Русский](docs/contributing/ADD_A_GAME.ru.md)  
3. **Multiplayer games:** [docs/contributing/ADD_MULTIPLAYER_GAME.md](docs/contributing/ADD_MULTIPLAYER_GAME.md)  
4. Engine index: [docs/contributing/README.md](docs/contributing/README.md) · [games/ENGINE.md](games/ENGINE.md)  
5. Prefer **one focused change** per pull request.

### Fastest path

```bash
python3 tools/new_game.py my-cool-game --title "My Cool Game"
# multiplayer:
python3 tools/new_game.py my-mp-game --multiplayer --title "My MP Game"
python3 tools/validate_catalog.py
cd pc && ./start.sh
# → http://127.0.0.1:8080/
```

## Hard rules (please don’t break these)

- **Offline-first** — no CDN, no required cloud APIs in games.  
- **No Node in the host** — PC host stays Python stdlib (or agreed alternative).  
- **Games ≤ 10 MB**; celebrate smaller.  
- **Touch-first** controls where it makes sense.  
- **Family-friendly** content by default.  
- **No trademark clones** (no “Minecraft™” names/assets; original titles).  
- Don’t commit secrets, keystores, or huge `pc/runtimes/*64` binaries (use Releases / USB pack).

## Adding a game (checklist)

- [ ] Folder `games/<id>/` with `manifest.json` + `client/`  
- [ ] Row in `games/catalog/games.json` (and `families.json` if needed)  
- [ ] Short `README.md` in the game folder  
- [ ] Works via PC host: `cd pc && ./start.sh` → open `/games/<id>/client/`  
- [ ] Update `sizeMeasuredKb` if you can  
- [ ] Optional: list in `pc/www/index.html` until catalog UI exists  

## Development loop

```bash
# host
cd pc && ./start.sh

# lobby
open http://127.0.0.1:8080/

# phones on same Wi‑Fi
# http://<lan-ip>:8080/
```

## Pull requests

1. Fork the repo (or branch if you have write access).  
2. Create a branch: `feat/game-xyz`, `fix/host-ws`, `docs/...`.  
3. Keep the PR description concrete: *what / why / how to test*.  
4. Link related Issues.  
5. Be kind in review — we’re building a party, not a flame war.

## Issues

Use Issues for bugs, game ideas, and RFCs.  
Label ideas (maintainers): `game`, `host`, `docs`, `good first issue`, `help wanted`.

## License

By contributing, you agree your contributions are licensed under the **MIT License** ([LICENSE](LICENSE)), unless a file says otherwise (e.g. OFL fonts).

## Code of conduct (short)

- Assume good intent.  
- No harassment, hate, or NSFW dumps into the default catalog.  
- Credit authors in catalog `authors.json` when you want public attribution.

---

Questions? Open an Issue with the `question` vibe — or start a Discussion if enabled.
