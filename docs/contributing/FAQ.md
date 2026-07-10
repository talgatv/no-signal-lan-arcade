# FAQ — contributing games

### Do I need to know Python?

No. Games are HTML/JS. Python is only the **host** that serves files and WebSocket. Use `./start.sh`.

### Do I need Node / npm?

No. Please don’t add them for a micro-game.

### Can I use React / Phaser / Three.js?

Only if the **final pack** stays under 10 MB and works offline (vendored, no CDN). Prefer vanilla for review speed. Phaser is possible if bundled small.

### Why doesn’t my game show in the lobby?

Missing or broken row in `games/catalog/games.json`. Run `python3 tools/validate_catalog.py`. Hard-refresh lobby.

### Why do fonts/scripts fail when I double-click index.html?

ES modules and some paths need **HTTP**. Always use the host URL.

### Can two games use the same id?

No. Ids are unique forever in the catalog.

### How do players find each other?

They open the **same host IP** and **same room name**. No automatic internet matchmaking.

### Is the host authoritative?

Only as a **relay** today. Your **host player** (`net.isHost`) should run the rules for competitive fairness when needed.

### Can I add adult content?

Default catalog is family-friendly. Mark clearly and discuss in an Issue first.

### Where do big Python runtimes go?

Not in git. See `pc/OFFLINE.md`. Contributors don’t need to commit them.

### I only speak Russian / Chinese / …

Welcome. Catalog supports `names` / `instructions` maps for many locales.  
**Project documentation is English** so every contributor can review the same text.  
English `instructions.en` helps global review; add your language keys too.

### Who do I ask?

Open a GitHub Issue on https://github.com/talgatv/no-signal-lan-arcade
