# Development plan with LLMs

For humans and agents (Claude / Grok / Cursor, etc.).  
Goal: ship iteratively with small PR-sized tasks, offline-first, without bloating size.

**Date:** 2026-07-10  
**Repo:** https://github.com/talgatv/no-signal-lan-arcade  
**License:** MIT (code); fonts OFL; Python runtimes PSF  

---

## 1. Product in one paragraph

A host (first **PC Python**, then **Android**) starts a LAN server.  
Guests open a browser → lobby → tiny games (≤ 10 MB).  
No internet. Game collection + shared net layer (`ogh-net`) + metadata catalog.

---

## 2. Working with LLMs

| Rule | Why |
|------|-----|
| **One task per session** | Fewer broken mega-diffs |
| **Docs/spec before code** | Games and MP scope-creep easily |
| **Size limits** | ≤ 10 MB/game, aim ≪ 2 MB; host without Node |
| **No secrets / huge runtimes in git** | `runtimes/*64` → Release / USB |
| **Manual check** | `pc/start.sh` + phone Wi‑Fi + 2 browsers |
| **Update catalog immediately** | `games/catalog/*.json` is source of truth |
| **Prompt with file links** | VISION, MULTIPLAYER, contributing guides |

### Agent prompt template

```text
Project: Offline Games Hub / no-signal-lan-arcade.
Offline LAN, browser games, PC host = Python stdlib.

Read:
- docs/VISION.md
- docs/architecture/MULTIPLAYER.md
- docs/contributing/ADD_A_GAME.md
- docs/plans/LLM_DEVELOPMENT_PLAN.md

Task: <one concrete task from §4>
Constraints: no Node; no CDN; touch-first; do not commit pc/runtimes/*64.
Definition of done: <how to verify>.
```

### Agent roles

1. **Architect** — design only  
2. **Implementer** — code to a written plan  
3. **Reviewer** — size, offline, i18n hooks, LAN security  
4. **Game designer** — rules + manifest + catalog row  
5. **Release** — CHANGELOG, tag, offline zip notes  

---

## 3. Baseline status

| Component | Status |
|-----------|--------|
| Vision / core / android / multiplayer docs | ✅ English |
| Catalog JSON + schema | ✅ |
| Games: Comet, Comet Pixel, Rootwork, Pulse Race, Demo Tap | ✅ solo/AI |
| Shared kit + ogh-net | ✅ |
| PC host HTTP + WS + lobby | ✅ |
| Contributor engine docs + templates + tools | ✅ |
| Portable Python on disk | ✅ (gitignored) |
| Public GitHub | ✅ |
| Android host scaffold | ⬜ |
| Real online race snapshot | ⬜ |
| CI | ⬜ |

---

## 4. Roadmap epics → LLM tasks

### Epic A — GitHub public + Pages

| ID | Task | Who | DoD |
|----|------|-----|-----|
| A1 | Local git + initial commits | done | history on main |
| A2 | Public remote + push | done | github.com/talgatv/no-signal-lan-arcade |
| A3 | LICENSE MIT | done | root LICENSE |
| A4 | GitHub Pages landing (optional) | human/LLM | site live |
| A5 | Release offline-runtimes zip | human | Release asset |
| A6 | Topics + About blurb | human | discoverable |

### Epic B — PC host hardening

| ID | Task | DoD |
|----|------|-----|
| B1 | QR in lobby | QR opens LAN URL |
| B2 | Show all IPs + copy | UX |
| B3 | WS unit tests | `python -m unittest` green |
| B4 | `--open` browser; config.json | DX |
| B5 | Max players / soft rate limits | LAN hygiene |
| B6 | Optional file log | debug |

### Epic C — Multiplayer games (one at a time)

| ID | Task | DoD |
|----|------|-----|
| C1 | Pulse Race online snapshot | 2 browsers, 2 cars |
| C2 | Trivia (3–8) on ogh-net | JSON Q packs EN |
| C3 | Rootwork shared dig patches | 2 players see blocks |
| C4 | Tic-tac-toe / Connect Four MP | protocol reference |
| C5 | “How to add MP game” polish | already started — keep current |

**Order:** C4 → C1 → C2 → C3.

### Epic D — Catalog & content

| ID | Task | DoD |
|----|------|-----|
| D1 | Richer catalog browser UI | filters genre/players/controls |
| D2 | 5–10 new micro-games | 1 PR = 1 game |
| D3 | Lobby i18n en + more | UN-6 later |
| D4 | Ultra &lt; 200 KB badge | sizeMeasuredKb |
| D5 | Family links UI | Comet ↔ Pixel |

### Epic E — Android host

| ID | Task | DoD |
|----|------|-----|
| E1 | Gradle Compose skeleton | assembleDebug |
| E2 | Foreground service start/stop | notification |
| E3 | HTTP/WS same protocol as PC | phone = host |
| E4 | QR + IP screen | guest join |
| E5 | 3 demo games in assets | size budget |
| E6 | UN language strings | en/zh/ru/es/ar/fr |

**Gate:** do not start E until C4 or C1 works on PC.

### Epic F — Quality & release

| ID | Task | DoD |
|----|------|-----|
| F1 | CI: validate catalog + python syntax | Actions green |
| F2 | `tools/measure_games.py` | sizes in catalog |
| F3 | SECURITY.md | done — keep updated |
| F4 | Tag v0.1.0 | release notes |
| F5 | Playtest checklist (4 phones) | written results |

---

## 5. Near-term schedule

```text
Now
  Docs English pass ✅
  Contributor engine ✅
  GitHub public ✅

Next
  C4 turn-based MP reference
  B1–B2 QR + IP
  C1 Pulse Race online

Then
  C2 Trivia
  D1 catalog UI filters
  B3 tests

Later
  E1–E4 Android host
  D2 more games (1/session)
  F1 CI + F4 release
```

---

## 6. Target repo layout

```text
no-signal-lan-arcade/
  README.md
  LICENSE
  CONTRIBUTING.md
  docs/
  games/
  pc/
  android/
  tools/
  .github/workflows/   # later
```

---

## 7. Success metrics (v0.1)

| Metric | Target |
|--------|--------|
| Offline playable games | ≥ 4 |
| Real LAN MP games | ≥ 1 |
| PC host without pip/node | yes |
| Guest join &lt; 30 s | QR/IP |
| Pack size | max 10 MB, median &lt; 1 MB |
| Lobby languages | en minimum |

---

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Agent pulls React/Phaser/Node | Explicit ban + review |
| Git bloated with runtimes | gitignore + Release assets |
| Race desync | Start with turn-based C4 |
| “50 games” scope | Tier list; 1 game / PR |
| Android too early | Gate on PC MP |

---

## 9. Checklist before “add game X”

- [ ] `manifest.json` + `client/`  
- [ ] `games/catalog/games.json` row  
- [ ] controls + genres + instructions.en  
- [ ] no CDN; fonts only from `_shared` if needed  
- [ ] touch-friendly  
- [ ] `du -sh` → sizeMeasuredKb  
- [ ] appears in lobby catalog  
- [ ] game README with controls  

---

*Living plan — update §3 status after each epic.*
