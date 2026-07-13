<p align="center">
  <img src="docs/assets/banner.svg" alt="Offline Games Hub" width="720" />
</p>

<h1 align="center">Offline Games Hub</h1>

<p align="center">
  <strong>When the internet dies, the party doesn’t.</strong><br/>
  One machine becomes a LAN arcade. Everyone else joins from a browser.<br/>
  No accounts. No cloud. No app install for players. Just Wi‑Fi and play.
</p>

<p align="center">
  <a href="https://github.com/talgatv/no-signal-lan-arcade">GitHub</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#games">Games</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#documentation">Docs</a> ·
  <a href="#roadmap-snapshot">Roadmap</a>
</p>

<p align="center">
  <code>offline-first</code>&nbsp;·&nbsp;
  <code>LAN multiplayer</code>&nbsp;·&nbsp;
  <code>≤10&nbsp;MB games</code>&nbsp;·&nbsp;
  <code>zero Node in the host</code>&nbsp;·&nbsp;
  <code>MIT</code>
</p>

---

## Why this exists

Power outages. Road trips. Cabins. Camping. Classrooms with blocked networks.  
You still have phones, a laptop, and a power bank — but **no internet**.

### Origin story

The idea crystallized when the project author was **without power during the 2025 Los Angeles wildfires**.  
The lights were out and the network was unreliable — but people were still together in a room, with charged phones and a need for something human: play, talk, pass the time.  
**Offline Games Hub / No-Signal LAN Arcade** is built for that kind of night: one host on a battery, everyone else in a browser, no cloud required.

**Offline Games Hub** turns one PC or Android phone into a **local game server**:

```text
   📱  📱  💻  📱
    \  |  |  /
     \ | | /
   ┌───────────┐
   │   HOST    │  ← PC (Python) or Android (Kotlin)
   │  Wi‑Fi    │  ← serves lobby + game/program packs
   └───────────┘
         ▲
    open in browser
    http://192.168.x.x:8080
```

Guests never install anything. They open a URL and play.  
When the lights come back, you can still use it — because local is faster, private, and free.

---

## Features

| | |
|--|--|
| **True offline** | No CDN, no telemetry, no “phone home”. Host + games run on LAN only. |
| **Browser clients** | Any modern phone/tablet/laptop. Touch-first UI. |
| **Tiny games** | Hard cap **10 MB** per pack; most are tens of KB. *Maximum fun per kilobyte.* |
| **Plugin catalog** | Each game is a folder + `manifest.json` + metadata in JSON. |
| **LAN multiplayer ready** | Shared protocol + `ogh-net` client; lobby over WebSocket. |
| **PC host today** | Pure **Python 3 stdlib** — no Node, no pip, no `node_modules`. |
| **Portable runtimes** | Windows + Linux Python ships *beside* the project for USB handoff. |
| **Android host** | Kotlin + Compose app with one-button hosting, QR invite, and offline game packs. |
| **UN languages** | i18n path for en · zh · ru · es · ar · fr. |

---

## Quick start

### 1. Start the PC host

```bash
cd pc
./start.sh              # Linux — uses bundled runtimes/linux64 if present
./start.sh --https      # self-signed HTTPS so phones can use mic / sensors
# Windows:  start.bat
#           start.bat --https
# or:       python3 host.py --port 8080 --https
```

> **Phones + microphone / compass:** use `--https`, then open `https://PC_IP:8080/`  
> and accept the certificate warning once. Details: [`pc/HTTPS.md`](pc/HTTPS.md).

> **No PC nearby?** The [Android host](android/README.md) serves the same offline
> library and shows one QR invite for everyone in the room.

### 2. Open the lobby

- **On the host:** [http://127.0.0.1:8080/](http://127.0.0.1:8080/)  
- **On phones (same Wi‑Fi):** `http://<your-pc-lan-ip>:8080/`

### 3. Open the game library (profile + progress)

**http://127.0.0.1:8080/games/**

- Browse & **sort** all catalog games and utility programs
- Set **nickname** & **avatar** (presets or custom)  
- See **local progress** per game  
- **Download / upload** your profile JSON (browser storage only — never sent to the server)

### 4. Connect → pick a game → play

Lobby (`/`) is for LAN room presence. Games load under `/games/<id>/...`;
utility programs live in the same web tree under `/games/programs/<id>/...`.

> **Fully offline pack:** see [`pc/OFFLINE.md`](pc/OFFLINE.md).  
> Portable Python under `pc/runtimes/` is gitignored (large) but lives on disk for USB copies.

---

## Games

The catalog currently contains **55 game and utility entries**. Open
[`games/catalog/games.json`](games/catalog/games.json) for the source of truth,
or start the host and browse the friendly library at `/games/`.

### Add your game

You do not need Node.js, a framework, or a backend. Scaffold a tiny web game,
edit its HTML/CSS/JavaScript, test it on a phone, and open a pull request:

```bash
python3 tools/new_game.py my-cool-game --title "My Cool Game" --author "Your Name"
python3 tools/validate_catalog.py
```

Start with the [beginner guide](docs/contributing/ADD_A_GAME.md) or the
[краткая инструкция на русском](docs/contributing/ADD_A_GAME.ru.md). Ideas for
party, word, board, and trivia games live in
[`docs/games/CATALOG.md`](docs/games/CATALOG.md).

---

## Architecture

```text
┌────────────────────────────────────────────────────────────┐
│  Platform hosts                                            │
│  • pc/host.py     Python stdlib  — HTTP + WebSocket  ✅    │
│  • android/       Kotlin + Compose host              ✅    │
└────────────────────────────┬───────────────────────────────┘
                             │ LAN
┌────────────────────────────▼───────────────────────────────┐
│  Browser clients                                           │
│  lobby (pc/www) · games/* · games/programs/* · shared kit  │
│  ogh-net.js → offline fallback OR /ws when host is live    │
└────────────────────────────────────────────────────────────┘
```

**Design rule:** games do not scan the network.  
They all connect to **one host URL**. Discovery = QR / IP, not magic P2P.

Deep dive: [`docs/architecture/MULTIPLAYER.md`](docs/architecture/MULTIPLAYER.md)

### Stack choices (on purpose)

| Layer | Choice | Why |
|-------|--------|-----|
| PC host | Python **stdlib only** | Tiny, offline, no dependency hell |
| Games | HTML / CSS / Canvas / vanilla JS | Universal phones, zero install |
| Net | WebSocket + thin `ogh-net` | One protocol, many games |
| Android host | Kotlin + Jetpack Compose | Native one-button hosting, QR invite, small APK |
| Not used | Node-in-APK, Unity, Electron | Too heavy for this philosophy |

---

## Repository layout

```text
OFFline_games_app/
├── README.md                 ← you are here
├── LICENSE                   ← MIT
├── docs/                     vision, architecture, plans
├── games/
│   ├── _shared/              fonts, CSS, sfx, shaders, ogh-net
│   ├── catalog/              JSON registry (genre, controls, authors…)
│   ├── programs/             utility HTML/CSS/JS packs
│   ├── comet/ · comet-pixel/
│   ├── rootwork/
│   └── pulse-race/
├── pc/                       LAN host + lobby + portable Python scripts
└── android/                  Kotlin/Compose Android host
```

---

## Documentation

**Full index (English):** [docs/README.md](docs/README.md)

| Doc | What you’ll find |
|-----|------------------|
| [Vision](docs/VISION.md) | Product intent, constraints, success criteria |
| [Game catalog (ideas)](docs/games/CATALOG.md) | Genres, player counts, mechanics |
| [Catalog schema](games/catalog/SCHEMA.md) | Metadata DB shape (JSON → SQLite later) |
| [Core architecture](docs/architecture/CORE.md) | Host adapters, plugins |
| [PC host architecture](docs/architecture/HOST_PC.md) | Python host design |
| [Android stack](docs/architecture/ANDROID_STACK.md) | Kotlin/Compose host architecture |
| [Multiplayer](docs/architecture/MULTIPLAYER.md) | LAN model, protocol draft |
| [Security](docs/SECURITY.md) | LAN trust model |
| [Roadmap](docs/plans/ROADMAP.md) | Phases |
| [**LLM development plan**](docs/plans/LLM_DEVELOPMENT_PLAN.md) | Epics, prompts, agent workflow |
| [PC host](pc/README.md) | Run, ports, API |
| [Offline PC pack](pc/OFFLINE.md) | USB / no-internet distribution |

---

## Philosophy

1. **Offline is a feature**, not a fallback.  
2. **Kilobytes are a design material** — treat size like a high score.  
3. **Hosts are thin; games are replaceable packs.**  
4. **Touch first**, keyboard optional, gamepad later.  
5. **Family-friendly by default**; adult packs only as opt-in later.  
6. **Original names & rules** — inspired by classics, not trademark clones.

---

## Roadmap (snapshot)

| Phase | Focus | Status |
|-------|--------|--------|
| 0 | Docs, catalog, first games, PC host | **Done** |
| 1 | Real LAN multiplayer (turn-based → race → party) | In progress |
| 2 | Android host (Compose + foreground service) | **Available** |
| 3 | Community catalog, filters, i18n | In progress — 55 entries |
| 4 | CI, polished release, offline GitHub Release zips | In progress |

Full agent-friendly plan: [`docs/plans/LLM_DEVELOPMENT_PLAN.md`](docs/plans/LLM_DEVELOPMENT_PLAN.md)

---

## Contributing (human or LLM)

**Everyone is welcome** — solo games, multiplayer packs, host fixes, translations.

| Start here | |
|------------|--|
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Project rules + PR flow |
| **[Documentation index](docs/README.md)** | Full map of docs (English) |
| **[Game integration manual](docs/contributing/GAME_INTEGRATION_MANUAL.md)** | **Long guide: embed solo/MP games + saves** |
| **[Add a game (short)](docs/contributing/ADD_A_GAME.md)** | Quick beginner path |
| **[Добавить игру (по-русски)](docs/contributing/ADD_A_GAME.ru.md)** | Краткая инструкция для начинающих |
| **[Multiplayer games](docs/contributing/ADD_MULTIPLAYER_GAME.md)** | ogh-net guide |
| **[Save progress](docs/contributing/SAVE_PROGRESS.md)** | Profile + localStorage API |
| **[Engine API](docs/contributing/ENGINE_API.md)** | Manifest, URLs, net events |
| **[Checklist](docs/contributing/CHECKLIST.md)** | Before you open a PR |

```bash
# scaffold + register in library
python3 tools/new_game.py my-cool-game --title "My Cool Game" --author "Your Name"
python3 tools/new_game.py tap-arena --multiplayer --title "Tap Arena" --author "Your Name"
python3 tools/validate_catalog.py
```

Templates: `games/_templates/solo` · `games/_templates/multiplayer`

- Prefer **one game or one subsystem per change**.  
- Catalog row required for lobby listing (`games/catalog/games.json`).  
- No CDNs. Keep each game under **10 MB** (aim far lower).

```text
Prompt starter for AI agents:
  Read docs/contributing/ADD_A_GAME.md and ENGINE_API.md,
  then scaffold with tools/new_game.py and implement ONE game.
```
---

## License

**MIT** — see [`LICENSE`](LICENSE).

Third-party notes:

- Bundled fonts keep their upstream OFL/Apache licenses; see
  [`games/_shared/fonts/THIRD_PARTY_NOTICES.md`](games/_shared/fonts/THIRD_PARTY_NOTICES.md)
- Portable CPython under `pc/runtimes/*` (when present) — PSF License  

---

<p align="center">
  <em>Build a pocket arcade that fits on a flash drive.<br/>
  Then invite the whole room — no signal required.</em>
</p>
