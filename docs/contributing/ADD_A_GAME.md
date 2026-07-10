# Add your first game (beginner guide)

This guide assumes **zero** knowledge of this repo.  
If you can edit text files and open a browser, you can ship a game here.

---

## What you will build

A **game pack**: a small website (HTML + CSS + JavaScript) that:

1. Lives in `games/your-game-id/`  
2. Opens from the PC host lobby  
3. Appears in the **game library** (catalog)

You do **not** need:

- Node.js / npm  
- React / Unity / Godot  
- A backend language  
- Internet (after you clone / copy the project)

---

## 0. One-time setup

### Get the project

```bash
git clone https://github.com/talgatv/no-signal-lan-arcade.git
cd no-signal-lan-arcade
```

### Start the host (Linux / macOS)

```bash
cd pc
./start.sh
```

Windows: double-click `pc/start.bat` or:

```bat
cd pc
start.bat
```

Open: **http://127.0.0.1:8080/**

You should see the lobby. Leave this terminal running while you develop.

---

## 1. Create a game in 30 seconds (recommended)

From the **repo root**:

```bash
python3 tools/new_game.py hello-dots --title "Hello Dots"
```

This creates:

```text
games/hello-dots/
  manifest.json
  README.md
  client/
    index.html
    style.css
    game.js
```

…and appends a row to `games/catalog/games.json`.

Restart is **not** required for static files (refresh the lobby).  
If the new game doesn’t show: hard-refresh (`Ctrl+Shift+R`) or re-run `./start.sh`.

Open:

**http://127.0.0.1:8080/games/hello-dots/client/**

---

## 2. Create a game by hand (understand every file)

### Step A — pick an `id`

Rules:

- lowercase letters, numbers, hyphens only  
- unique (not used by another game)  
- examples: `hello-dots`, `snake-lite`, `memory-duel`

### Step B — copy the template

```bash
cp -r games/_templates/solo games/hello-dots
```

### Step C — edit `manifest.json`

Path: `games/hello-dots/manifest.json`

```json
{
  "id": "hello-dots",
  "name": "Hello Dots",
  "version": "0.1.0",
  "minPlayers": 1,
  "maxPlayers": 1,
  "supportsSolo": true,
  "genres": ["arcade", "casual"],
  "style": "minimal-line",
  "controls": {
    "primary": "touch",
    "supported": ["touch", "mouse"],
    "keyboard": "none",
    "mouse": "ok"
  },
  "entry": { "client": "client/index.html" },
  "familyFriendly": true
}
```

**`id` must match the folder name.**

### Step D — make it fun (`client/`)

| File | Role |
|------|------|
| `index.html` | Page shell, buttons, canvas |
| `style.css` | Look & feel |
| `game.js` | Rules, drawing, input |

Tips:

- Prefer **one HTML page** for MVP.  
- Use relative paths to shared kit:

```html
<link rel="stylesheet" href="../../_shared/css/ogh-base.css" />
<script type="module" src="game.js"></script>
```

```js
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
```

- **Never** load scripts from the internet (`cdn.js`, Google Fonts URL, etc.).  
  Local fonts: `../../_shared/css/ogh-fonts.css`

### Step E — register in the library

Open `games/catalog/games.json`.  
Inside the `"games": [ ... ]` array, add an object (comma-separated).

**Minimal valid entry:**

```json
{
  "id": "hello-dots",
  "name": "Hello Dots",
  "tagline": "Tap to score. Your first OGH game.",
  "style": "minimal-line",
  "genres": ["arcade", "casual"],
  "controls": {
    "primary": "touch",
    "supported": ["touch", "mouse"],
    "keyboard": "none",
    "mouse": "ok"
  },
  "instructions": {
    "en": "Tap or click the button to score points.",
    "ru": "Тап или клик по кнопке — очки."
  },
  "authorId": "ogh-team",
  "dates": { "added": "2026-07-10" },
  "players": { "min": 1, "max": 1, "solo": true },
  "entry": "hello-dots/client/index.html",
  "manifest": "hello-dots/manifest.json",
  "version": "0.1.0",
  "status": "experimental",
  "familyFriendly": true
}
```

### Step F — author credit (optional but nice)

Edit `games/catalog/authors.json` or use `authorInline` on your game:

```json
"authorInline": {
  "name": "Your Name",
  "email": null,
  "site": "https://github.com/you",
  "links": [{ "label": "GitHub", "url": "https://github.com/you" }]
}
```

### Step G — validate

```bash
python3 tools/validate_catalog.py
```

Fix any errors it prints.

### Step H — play on a real phone (same Wi‑Fi)

1. Host PC running `./start.sh`  
2. Phone browser → `http://<PC-LAN-IP>:8080/`  
3. Tap your game  

---

## 3. Folder layout (required shape)

```text
games/
  your-id/
    manifest.json          ← required
    README.md              ← required for PR
    client/
      index.html           ← entry (required)
      ...                  ← your assets
```

Optional later:

```text
    server/                ← only if you add host-side logic (advanced)
    assets/
```

---

## 4. Shared toolkit (optional imports)

| Path | Use for |
|------|---------|
| `_shared/css/ogh-base.css` | Dark neon UI tokens, buttons, overlays |
| `_shared/css/ogh-fonts.css` | Local Roboto / pixel fonts (offline) |
| `_shared/js/ogh-sfx.js` | Tiny beeps (no mp3 files) |
| `_shared/js/ogh-shader-bg.js` | WebGL background |
| `_shared/js/ogh-net.js` | Multiplayer (see multiplayer guide) |

You can ignore all of them and write plain HTML. The host only needs a working `index.html`.

---

## 5. How the host finds your game

1. Browser asks for `/games/your-id/client/index.html`  
2. Host maps that to folder `games/your-id/client/index.html`  
3. Lobby list comes from `/games/catalog/games.json`  

So:

- **Files** → playable via direct URL even without catalog  
- **Catalog row** → shows in the library UI for everyone  

---

## 6. Size budget

```bash
du -sh games/your-id
```

| Target | Meaning |
|--------|---------|
| &lt; 200 KB | Ultra badge material |
| &lt; 2 MB | Healthy default |
| ≤ 10 MB | Hard maximum |

No videos. Prefer canvas/SVG/CSS over large PNGs.

---

## 7. Submit a pull request

```bash
git checkout -b feat/game-hello-dots
git add games/hello-dots games/catalog/games.json
git commit -m "Add Hello Dots micro-game"
git push -u origin feat/game-hello-dots
```

Open a PR on GitHub:  
https://github.com/talgatv/no-signal-lan-arcade

Describe:

- How to play (1–2 sentences)  
- Solo or multiplayer  
- How you tested (`./start.sh` + browser)

---

## 8. Common mistakes

| Mistake | Fix |
|---------|-----|
| Folder `HelloDots` but id `hello-dots` | Match folder = `id` (lowercase) |
| Forgot comma in `games.json` | JSON is strict; use validator |
| `file://` open of index.html | Use the host URL (modules/fonts need HTTP) |
| Absolute path `/css/x.css` | Use relative `../../_shared/...` |
| CDN script tag | Delete it; offline only |
| 50 MB assets | Compress or redraw with code |

---

## 9. Next steps

- Multiplayer: [ADD_MULTIPLAYER_GAME.md](./ADD_MULTIPLAYER_GAME.md)  
- Full field list: [../games/catalog/SCHEMA.md](../../games/catalog/SCHEMA.md)  
- API: [ENGINE_API.md](./ENGINE_API.md)  
- Checklist: [CHECKLIST.md](./CHECKLIST.md)

You just learned the whole “engine” surface for solo games: **folder + manifest + catalog + static host**.  
Ship something tiny. Ship something fun.
