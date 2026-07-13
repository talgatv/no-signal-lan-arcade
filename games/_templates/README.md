# Game templates

| Folder | Use |
|--------|-----|
| `solo/` | Single-player starter |
| `multiplayer/` | ogh-net shared-counter starter |

**Do not edit these as real games.** Copy or run:

```bash
python3 tools/new_game.py my-game --title "My Game" --author "Your Name"
python3 tools/new_game.py party-tap --multiplayer --title "Party Tap" --author "Your Name"
```

The scaffold rewrites `TEMPLATE_ID` / `TEMPLATE_NAME` and fixes `_shared` import paths.
