# Game Integration Manual

**A complete guide to adding your game to Offline Games Hub  
(No-Signal LAN Arcade)**

This manual is written for **beginners** and **experienced developers**.  
If you can edit HTML/CSS/JavaScript and open a browser, you can ship a pack.

| Document | Role |
|----------|------|
| **This manual** | Long, end-to-end path |
| [ADD_A_GAME.md](./ADD_A_GAME.md) | Short beginner checklist |
| [ADD_MULTIPLAYER_GAME.md](./ADD_MULTIPLAYER_GAME.md) | Multiplayer deep dive |
| [SAVE_PROGRESS.md](./SAVE_PROGRESS.md) | Local saves / profile |
| [ENGINE_API.md](./ENGINE_API.md) | API reference tables |
| [CHECKLIST.md](./CHECKLIST.md) | PR checklist |

**Repository:** https://github.com/talgatv/no-signal-lan-arcade  
**Language of docs:** English  

---

## Table of contents

1. [What you are integrating into](#1-what-you-are-integrating-into)  
2. [Mental model (the “engine”)](#2-mental-model-the-engine)  
3. [Prerequisites](#3-prerequisites)  
4. [One-time setup](#4-one-time-setup)  
5. [Fast path: scaffold a game](#5-fast-path-scaffold-a-game)  
6. [Manual path: every file explained](#6-manual-path-every-file-explained)  
7. [Registering in the library (catalog)](#7-registering-in-the-library-catalog)  
8. [Shared toolkit (`_shared`)](#8-shared-toolkit-_shared)  
9. [Building a solid solo game](#9-building-a-solid-solo-game)  
10. [Player profile & progress saves](#10-player-profile--progress-saves)  
11. [Multiplayer integration](#11-multiplayer-integration)  
12. [Sorting, hub, lobby, and URLs](#12-sorting-hub-lobby-and-urls)  
13. [Art, size, performance, offline rules](#13-art-size-performance-offline-rules)  
14. [Testing matrix](#14-testing-matrix)  
15. [Validation & pull request](#15-validation--pull-request)  
16. [Common mistakes](#16-common-mistakes)  
17. [Worked examples](#17-worked-examples)  
18. [FAQ](#18-faq)  
19. [Appendix: field cheatsheets](#19-appendix-field-cheatsheets)  

---

## 1. What you are integrating into

**Offline Games Hub** is a **LAN arcade**:

1. Someone runs a **host** (today: PC Python server in `pc/`).  
2. The host serves a **lobby**, a **game library**, and your **game files**.  
3. Players open a normal **web browser** on phones or laptops.  
4. There is **no required internet** after the project is on disk.  
5. Guests **do not install** your game as an APK — they open a URL.

Your contribution is almost never “rewrite the server”.  
Your contribution is a **game pack**: a small static website + a catalog row.

```text
┌──────────────────────────────────────────────┐
│  Host (pc/host.py)                           │
│  • HTTP files                                │
│  • WebSocket rooms (optional multiplayer)    │
└───────────────────┬──────────────────────────┘
                    │  same Wi‑Fi
     ┌──────────────┼──────────────┐
     ▼              ▼              ▼
  Browser        Browser        Browser
  (you)          (friend)       (friend)
     │
     └── loads /games/your-id/client/
```

---

## 2. Mental model (the “engine”)

There is **no Unity / Godot project** here. The engine surface is three contracts:

| Piece | Location | You touch it? |
|-------|----------|----------------|
| **Host** | `pc/host.py` (+ future Android) | Rarely |
| **Catalog** | `games/catalog/games.json` | **Yes** — one object per game |
| **Your pack** | `games/<id>/` | **Yes** — HTML/CSS/JS |

### What the host does for you

- Serves `games/<id>/client/index.html` at  
  `http://HOST:8080/games/<id>/client/`  
- Serves the **library UI** at `/games/` (sort, profile, progress)  
- Serves the **LAN lobby** at `/` (room nicknames, WebSocket presence)  
- Relays multiplayer messages on `/ws`  

### What the host does **not** do

- It does **not** compile your game  
- It does **not** store player progress (that is browser `localStorage`)  
- It does **not** invent discovery — players use the host IP / QR  

### Library vs direct URL

| Action | Result |
|--------|--------|
| Pack exists on disk | Playable at direct URL |
| + row in `games.json` | Appears in **/games/** library and lobby list |
| + `ogh-net` | Can talk to other browsers in a room |
| + `OGHProfile` | Progress visible in hub profile |

---

## 3. Prerequisites

### Required

- Git (to clone / PR)  
- A text editor  
- A browser (Chrome / Firefox / Safari)  
- Python 3.9+ **or** the portable runtime under `pc/runtimes/`  

### Not required

- Node.js / npm  
- React / Vue / Angular  
- Unity / Unreal / Godot  
- Docker  
- A public server  

### Nice to have

- A second phone on the same Wi‑Fi (touch + multiplayer tests)  
- Two browser windows (multiplayer without a second device)  

---

## 4. One-time setup

```bash
git clone https://github.com/talgatv/no-signal-lan-arcade.git
cd no-signal-lan-arcade
```

Start the host:

```bash
cd pc
./start.sh          # Linux / macOS
# Windows: start.bat
```

Open:

| URL | Purpose |
|-----|---------|
| http://127.0.0.1:8080/ | LAN lobby |
| http://127.0.0.1:8080/games/ | **Game library + profile** |
| http://127.0.0.1:8080/docs/contributing/GAME_INTEGRATION_MANUAL.md | This manual (via host) |

Leave the host process running while you develop.  
Refresh the browser after file changes (hard refresh if cached: `Ctrl+Shift+R`).

> **Never double-click `index.html` from the file manager.**  
> ES modules, shared paths, and catalog fetch need **HTTP** from the host.

---

## 5. Fast path: scaffold a game

From the **repository root**:

### Solo game

```bash
python3 tools/new_game.py hello-dots --title "Hello Dots"
python3 tools/validate_catalog.py
```

### Multiplayer-ready game

```bash
python3 tools/new_game.py click-party --multiplayer --title "Click Party"
python3 tools/validate_catalog.py
```

What the script does:

1. Copies `games/_templates/solo` or `.../multiplayer`  
2. Replaces `TEMPLATE_ID` / `TEMPLATE_NAME`  
3. Fixes `_shared` import paths for a normal pack depth  
4. Appends a row to `games/catalog/games.json`  

Then open:

```text
http://127.0.0.1:8080/games/hello-dots/client/
```

and check the library:

```text
http://127.0.0.1:8080/games/
```

Your title should appear after a refresh.

**Optional author credit:**

```bash
python3 tools/new_game.py my-game --title "My Game" --author "Your Name"
```

---

## 6. Manual path: every file explained

Use this section when you want to understand every moving part.

### 6.1 Choose an `id`

Rules:

- lowercase Latin letters, digits, hyphens  
- 3–48 characters, starts with a letter  
- **must equal the folder name**  
- unique across the catalog  

Good: `space-golf`, `memory-duel`, `quiz-party`  
Bad: `MyGame`, `space_golf`, `игра`, `a`

### 6.2 Create the folder tree

```text
games/
  your-id/
    manifest.json      ← required
    README.md          ← required for PR
    client/
      index.html       ← required entry
      style.css        ← recommended
      game.js          ← recommended
      ... assets ...
```

Optional later:

```text
    assets/
    server/            ← not executed by host yet (future)
```

Copy a template:

```bash
cp -r games/_templates/solo games/your-id
# then edit TEMPLATE_* placeholders by hand, or re-run new_game.py instead
```

### 6.3 `manifest.json` (pack identity)

This file describes the pack to tools and future hosts.

Minimal useful example:

```json
{
  "id": "hello-dots",
  "name": "Hello Dots",
  "version": "0.1.0",
  "minPlayers": 1,
  "maxPlayers": 1,
  "supportsSolo": true,
  "genres": ["casual", "arcade"],
  "style": "minimal-line",
  "controls": {
    "primary": "touch",
    "supported": ["touch", "mouse"],
    "keyboard": "none",
    "mouse": "ok"
  },
  "entry": {
    "client": "client/index.html"
  },
  "familyFriendly": true
}
```

**Critical:** `id` === folder name.

Full field docs: [../../games/catalog/SCHEMA.md](../../games/catalog/SCHEMA.md)

### 6.4 `client/index.html` (the page)

This is the only file the browser must load.

Good practices:

- Mobile viewport meta tag  
- `user-scalable=no` only if your game needs it (or allow zoom for accessibility)  
- Link shared CSS with **relative** paths  
- Use `type="module"` for JS so you can `import`  

Example head:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<link rel="stylesheet" href="../../_shared/css/ogh-fonts.css" />
<link rel="stylesheet" href="../../_shared/css/ogh-base.css" />
<link rel="stylesheet" href="style.css" />
```

Path rule from `games/<id>/client/`:

```text
../../_shared/   →   games/_shared/
```

### 6.5 `client/game.js` (rules)

This is where gameplay lives: input, state, draw loop, win/lose.

You may use:

- Canvas 2D  
- DOM + CSS  
- SVG  
- WebGL (keep it small)  
- Shared modules (`ogh-sfx`, `ogh-net`, `ogh-profile`, …)  

You should **not** use:

- Remote script tags (`https://cdn...`)  
- Remote fonts / images / APIs required to play  
- `eval` of untrusted network data without care  

### 6.6 `README.md` (for humans reviewing your PR)

Include at least:

- One-paragraph description  
- Controls table  
- Solo vs multiplayer  
- How to open via host  
- Whether progress is saved  

---

## 7. Registering in the library (catalog)

The library UI and lobby load:

```text
GET /games/catalog/games.json
```

### Minimal catalog row

Add an object inside the `"games": [ ... ]` array  
(file: `games/catalog/games.json`).

```json
{
  "id": "hello-dots",
  "name": "Hello Dots",
  "tagline": "Tap to score. Your first OGH pack.",
  "style": "minimal-line",
  "genres": ["casual", "arcade"],
  "controls": {
    "primary": "touch",
    "supported": ["touch", "mouse"],
    "keyboard": "none",
    "mouse": "ok"
  },
  "instructions": {
    "en": "Tap or click the big button. Each tap adds one point."
  },
  "authorId": "ogh-team",
  "authorInline": null,
  "dates": {
    "added": "2026-07-10",
    "updated": "2026-07-10"
  },
  "players": { "min": 1, "max": 1, "solo": true },
  "entry": "hello-dots/client/index.html",
  "manifest": "hello-dots/manifest.json",
  "version": "0.1.0",
  "status": "experimental",
  "familyFriendly": true,
  "tags": ["beginner"]
}
```

### Field meanings (short)

| Field | Meaning |
|-------|---------|
| `entry` | Path **from `games/`** to the HTML entry |
| `status` | `experimental` / `playable` / `stable` / … (`idea` & `deprecated` hidden in hub) |
| `players` | min/max/solo — used for filters |
| `controls` | Used for filters and accessibility expectations |
| `instructions.en` | Shown in UI / review |
| `multiplayer` | Optional object describing MP support |
| `variantOf` / `familyId` | Link visual or mechanical variants |

### Authors

Either:

- `"authorId": "someone"` + entry in `authors.json`, or  
- `"authorInline": { "name": "...", "links": [...] }`  

Email is optional; only publish with consent.

### Families / variants

If you ship “same game, different art/rules”:

```json
"familyId": "comet",
"variantOf": "comet",
"relatedIds": ["comet"]
```

Example in repo: `comet` and `comet-pixel`.

### Validate every time

```bash
python3 tools/validate_catalog.py
```

Exit code `0` means the catalog is consistent and files exist.

---

## 8. Shared toolkit (`_shared`)

All packs may import shared code. It is optional but recommended for cohesion.

### 8.1 CSS

| File | Use |
|------|-----|
| `ogh-base.css` | Dark neon tokens, buttons, overlays, HUD helpers |
| `ogh-fonts.css` | Local `@font-face` (Roboto, pixel font, mono, …) |

Utility classes (with fonts CSS):  
`.ogh-font-ui` · `.ogh-font-pixel` · `.ogh-font-mono` · `.ogh-font-display`

### 8.2 Sound

```js
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
const sfx = createOghSfx();
// after a user gesture:
sfx.unlock();
sfx.play('tap'); // place | pickup | win | die | tick
```

No MP3 files required — Web Audio beeps.

### 8.3 Shader background

```js
import { OGHShaderBg } from '../../_shared/js/ogh-shader-bg.js';
const bg = OGHShaderBg.mount(document.getElementById('bg'));
bg.start();
```

Gameplay still usually draws on a separate 2D canvas.

### 8.4 Multiplayer client

```js
import { OGHNet } from '../../_shared/js/ogh-net.js';
const net = await OGHNet.connect({ gameId: 'your-id' });
```

See [§11](#11-multiplayer-integration).

### 8.5 Profile & progress

```js
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
```

See [§10](#10-player-profile--progress-saves).

---

## 9. Building a solid solo game

### Recommended loop

1. Boot screen / title  
2. Play loop (`requestAnimationFrame` or turn steps)  
3. Win / lose overlay  
4. Retry without full page reload  
5. Optional: save best score via `OGHProfile`  

### Input

| Priority | Why |
|----------|-----|
| Touch first | Phones are the main clients |
| Mouse | Desktop testing |
| Keyboard optional | Nice for PC; never required for phone-first games unless you also provide on-screen controls |

Large hit targets (≥ 44–48px). Avoid hover-only UI.

### Orientation

- Prefer **both** portrait and landscape when possible.  
- If you need one, set `"orientation"` in manifest and document it.  
- Use `viewport-fit=cover` and safe-area CSS for notched phones.

### Pause / visibility

When the tab hides, pause timers:

```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
});
```

### Don’t fight the host

- Do not hardcode `localhost` for assets — use relative URLs.  
- Do not open your own WebSocket port.  
- Do not assume screen size — read `innerWidth` / canvas client size.

---

## 10. Player profile & progress saves

### Where data lives

| Storage | Contents |
|---------|----------|
| Browser `localStorage` key `ogh_player_v1` | Nickname, avatar, all game saves |
| User-downloaded JSON file | Same vault (backup) |
| Host / cloud | **Never** (by design) |

Players manage profile in the hub: **Profile** button on `/games/`.

### Saving from your game

```js
import { OGHProfile } from '../../_shared/js/ogh-profile.js';

const GAME_ID = 'hello-dots'; // MUST match folder + catalog id

function persist() {
  OGHProfile.saveProgress(
    GAME_ID,
    {
      score: state.score,
      best: state.best,
      level: state.level,
      // keep it small and JSON-friendly
    },
    {
      label: 'Hello Dots',
      summary: `Best ${state.best} · Level ${state.level}`,
    }
  );
}
```

### Loading

```js
const save = OGHProfile.getProgress(GAME_ID);
if (save) {
  state.score = save.score || 0;
  state.best = save.best || 0;
  state.level = save.level || 1;
}
```

### When to write

| Good | Bad |
|------|-----|
| Level complete | Every animation frame |
| New high score | Every pointermove |
| Settings change | Huge binary blobs |
| Checkpoint | DOM nodes / functions in data |

### Export / import (players)

Handled entirely by the hub UI:

- **Download profile** → JSON file  
- **Upload profile** → replace or merge  

Authors do not need to implement file pickers unless they want in-game shortcuts:

```js
OGHProfile.downloadFile();
// await OGHProfile.importFile(file, { mode: 'merge' });
```

### Display name for multiplayer

Hub and lobby pass `?name=` into game URLs.  
`ogh-net` reads that query param.  
`OGHProfile.getNickname()` is the canonical local nickname — keep them similar by opening games from the hub (it injects the profile name).

Full details: [SAVE_PROGRESS.md](./SAVE_PROGRESS.md)  
Working demo: `games/demo-tap` (saves score/best on each tap).

---

## 11. Multiplayer integration

### 11.1 Principles

1. All players open the **same host** (same IP).  
2. They share a **room** name (`main` by default).  
3. Your game uses **`OGHNet`**, not raw random ports.  
4. Always support **offline fallback** (solo / AI / local).  

### 11.2 Connect

```js
import { OGHNet } from '../../_shared/js/ogh-net.js';

const net = await OGHNet.connect({
  gameId: 'click-party', // = folder id
});

console.log(net.mode);     // 'online' | 'offline'
console.log(net.playerId);
console.log(net.isHost);   // first joiner in the room
```

### 11.3 Send & receive

```js
// send a named action + JSON payload
net.send('move', { x: 2, y: 3 });

// receive other players' actions
net.on('action', ({ action, payload, from }) => {
  if (action === 'move' && from !== net.playerId) {
    applyRemoteMove(from, payload);
  }
});

// roster
net.on('players', (list) => renderRoster(list));
```

### 11.4 Authority patterns

| Pattern | Who simulates | Use when |
|---------|---------------|----------|
| **Relay free-for-all** | Everyone applies events | Casual toys, shared counters |
| **Host-player authority** | `net.isHost` runs rules, broadcasts state | Competitive / anti-cheat-lite |
| **Lockstep turns** | Current player acts; others wait | Tic-tac-toe, chess |

The PC host **relays**; it does not run your JavaScript rules (yet).

### 11.5 Catalog flags for MP

```json
"players": { "min": 2, "max": 8, "solo": true },
"tags": ["multiplayer"],
"multiplayer": {
  "status": "ready",
  "protocol": "ogh-net-v1",
  "notes": "Host-player validates moves"
}
```

`solo: true` + multiplayer means: works alone **and** with friends.

### 11.6 Test with two clients

1. Start `pc/start.sh`  
2. Browser A: lobby → Connect → open your game  
3. Browser B (or phone): same room → same game  
4. Confirm UI shows `ONLINE`  
5. Action on A appears on B  

Deep dive: [ADD_MULTIPLAYER_GAME.md](./ADD_MULTIPLAYER_GAME.md)  
Protocol tables: [ENGINE_API.md](./ENGINE_API.md)  
Architecture: [../architecture/MULTIPLAYER.md](../architecture/MULTIPLAYER.md)

Template: `games/_templates/multiplayer` (shared counter).

---

## 12. Sorting, hub, lobby, and URLs

### Important URLs

| URL | What |
|-----|------|
| `/` | LAN lobby (WebSocket presence) |
| `/games/` | **Main library** (sort/filter + profile) |
| `/games/<id>/client/` | Your game |
| `/games/catalog/games.json` | Machine-readable library |
| `/docs/...` | Documentation via host |
| `/ws` | WebSocket |

### Query parameters

| Param | Used by |
|-------|---------|
| `name` | Display name / ogh-net join |
| `room` | Room isolation |
| `offline=1` | Force ogh-net offline |
| `ws=` | Override WebSocket URL (advanced) |

Hub links automatically append `name` from the local profile and `room` from lobby storage.

### How sorting works

The hub sorts **catalog fields** only:

- name  
- max players  
- first genre  
- art style  
- recent local progress (from `OGHProfile`)  

If your metadata is empty or wrong, sorting looks wrong — fix the catalog row, not the hub.

---

## 13. Art, size, performance, offline rules

### Size budget

```bash
du -sh games/your-id
```

| Size | Interpretation |
|------|----------------|
| &lt; 200 KB | Ultra — celebrate |
| &lt; 2 MB | Healthy default |
| ≤ 10 MB | Hard maximum |
| &gt; 10 MB | Reject / split assets |

Tips:

- Prefer code-drawn graphics over PNG sequences  
- Compress JPEG/WebP if you must ship images  
- No video cutscenes in packs  
- Don’t vendor entire UI frameworks without discussion  

### Offline rules (non-negotiable)

1. No CDN script/link tags.  
2. No “must phone home” license checks.  
3. Fonts from `_shared/fonts` or system fonts.  
4. Optional online features must degrade gracefully.  

### Performance on phones

- Cap DPR (`Math.min(devicePixelRatio, 2)`)  
- Pause when `document.hidden`  
- Avoid huge per-frame allocations  
- Keep WebGL simple or stick to Canvas2D  

### Content policy

- Family-friendly by default  
- No trademark impersonation (“Minecraft clone” names/assets)  
- Credit third-party OFL fonts if you bundle more  

---

## 14. Testing matrix

Before you open a PR, tick what you can:

| Test | How |
|------|-----|
| Loads on host | `/games/<id>/client/` returns 200 |
| In library | Visible on `/games/` after refresh |
| Touch | Real phone or devtools device mode |
| Desktop mouse | Click / drag as designed |
| Portrait + landscape | Resize window |
| Refresh mid-run | No hard crash |
| Progress (if any) | Save → reload → restored; visible in profile |
| Export/import (if progress) | Download JSON → clear site data → upload |
| Offline pack | Disconnect internet; still plays |
| Multiplayer (if any) | Two browsers, same room |
| Offline MP fallback | Stop host WS or `?offline=1` — no exception spam |
| Validator | `python3 tools/validate_catalog.py` → OK |

---

## 15. Validation & pull request

### Validate

```bash
python3 tools/validate_catalog.py
```

### Git workflow

```bash
git checkout -b feat/game-hello-dots
git add games/hello-dots games/catalog/games.json
# if you added an author:
# git add games/catalog/authors.json
git status
git commit -m "Add Hello Dots micro-game"
git push -u origin feat/game-hello-dots
```

Open a Pull Request against  
https://github.com/talgatv/no-signal-lan-arcade  

### PR description template

```markdown
## Game
- id: hello-dots
- solo / multiplayer: solo
- controls: tap button

## How to test
1. `cd pc && ./start.sh`
2. Open http://127.0.0.1:8080/games/
3. Launch Hello Dots

## Checklist
- [x] validate_catalog.py OK
- [x] no CDN
- [x] size: ___ KB
- [x] progress: yes/no (OGHProfile)
```

Also paste items from [CHECKLIST.md](./CHECKLIST.md).

---

## 16. Common mistakes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Blank page / module error | Opened as `file://` | Use host URL |
| 404 on `/games/x/client/` | Wrong folder name | Match `id` |
| Game missing from library | No catalog row / JSON comma error | Validator + refresh |
| Shared CSS 404 | Wrong relative path | From `client/`: `../../_shared/...` |
| Fonts missing | No `ogh-fonts.css` or CDN blocked | Local fonts only |
| MP works for me only | Different `room` query | Same room in lobby |
| Progress not in profile | Wrong `gameId` string | Must equal catalog `id` |
| Import fails | Invalid JSON / huge avatar | Re-export; shrink custom avatar |
| PR rejected for size | 20 MB assets | Compress / redraw |
| `validate_catalog` fails | Trailing comma in JSON | Fix JSON syntax |

---

## 17. Worked examples (in this repo)

| Pack | Learn from it |
|------|----------------|
| `games/demo-tap` | Scaffold + **OGHProfile** saves |
| `games/_templates/solo` | Minimal solo starter |
| `games/_templates/multiplayer` | ogh-net shared counter |
| `games/comet` | Canvas game + difficulty params |
| `games/comet-pixel` | Variant + family link |
| `games/rootwork` | Larger solo systems / localStorage of its own map |
| `games/pulse-race` | Touch controls + ogh-net hook for future MP |

Study `demo-tap` first if you want progress integration in 10 minutes.

---

## 18. FAQ

**Do I need to know Python?**  
No. Only to run the host (`./start.sh`). Games are front-end.

**Can I use TypeScript?**  
Yes if you commit **built** JS the host can serve without a build step, or document a build. Prefer plain JS for review speed.

**Can I use Phaser / Three.js?**  
Only if the final pack stays under 10 MB, offline, and vendored (no CDN). Discuss large frameworks in an Issue first.

**Where is progress stored on the server?**  
Nowhere. Browser only (+ optional user JSON file).

**How do strangers find my game on the LAN?**  
They don’t scan — they open the host’s IP. Your game appears in `/games/` because of the catalog.

**Can two games share one id?**  
No.

**What about Android?**  
Same packs will be served by the future Android host. Write portable web; don’t depend on PC-only APIs.

**Who reviews PRs?**  
Maintainers of the public repo. Be patient and keep changes focused.

---

## 19. Appendix: field cheatsheets

### A. Controls object

```json
"controls": {
  "primary": "touch",
  "supported": ["touch", "mouse", "keyboard"],
  "keyboard": "none",
  "mouse": "ok",
  "notes": { "en": "Tap the stage to place pieces." }
}
```

`keyboard`: `none` | `optional` | `required`  
`mouse`: `none` | `ok` | `required`  
`primary`: `touch` | `mouse` | `keyboard` | `hybrid`

### B. Status enum

`idea` · `wip` · `experimental` · `playable` · `stable` · `deprecated`  

Hub hides `idea` and `deprecated`.

### C. Style ids (art)

`neon-vector` · `pixel` · `pixel-hires` · `flat-ui` · `ascii` · `minimal-line` · `hand-drawn` · `shader-abstract`

### D. Multiplayer object

```json
"multiplayer": {
  "status": "ready",
  "protocol": "ogh-net-v1",
  "notes": "Host-player validates board"
}
```

### E. OGHProfile quick reference

| Method | |
|--------|--|
| `saveProgress(id, data, { summary, label })` | Write save |
| `getProgress(id)` | Read `data` or `null` |
| `listProgress()` | All games for UI |
| `getNickname()` / `setNickname(s)` | Profile |
| `setAvatar(id, customUrl?)` / `getAvatarSrc()` | Avatar |
| `downloadFile()` | Export JSON |
| `importFile(file, { mode: 'replace'\|'merge' })` | Import |

### F. OGHNet quick reference

| Method / event | |
|----------------|--|
| `await OGHNet.connect({ gameId })` | Start |
| `net.send(action, payload)` | Outbound |
| `net.on('action', fn)` | Inbound actions |
| `net.on('players', fn)` | Roster |
| `net.mode` | `online` / `offline` |
| `net.isHost` | First in room |

### G. Directory template (copy)

```text
games/my-game/
  manifest.json
  README.md
  client/
    index.html
    style.css
    game.js
```

### H. Commands you’ll use constantly

```bash
# create
python3 tools/new_game.py my-game --title "My Game"
python3 tools/new_game.py my-mp --multiplayer --title "My MP"

# check
python3 tools/validate_catalog.py
du -sh games/my-game

# run
cd pc && ./start.sh
# library:  http://127.0.0.1:8080/games/
# game:     http://127.0.0.1:8080/games/my-game/client/
```

---

## Closing

You do not need permission to experiment locally.  
You do not need a heavy engine.  
You need a **folder**, a **catalog row**, and something fun under **10 MB**.

If this manual is missing a step that blocked you, open a GitHub Issue — improving the integration path is part of the project.

**Welcome to the LAN arcade. Ship something tiny and brilliant.**
