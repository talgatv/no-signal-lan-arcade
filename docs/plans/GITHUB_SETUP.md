# GitHub setup (public + contributions)

## Recommended repository name

| Name | Pros | Cons |
|------|------|------|
| **`offline-games-hub`** | Clear, searchable, matches product title | Longer |
| **`lan-arcade`** | Short, catchy | Less “offline” in the name |
| **`pocket-lan-party`** | Fun story | Longer, “party” may feel narrow |
| **`ogh`** | Tiny | Cryptic for strangers |
| **`no-signal-games`** | Memorable hook | Slightly gimmicky |

**Recommendation:** **`offline-games-hub`**

- Matches README H1  
- Good GitHub search keywords: offline, games, hub  
- Org-friendly later: `github.com/you/offline-games-hub`

Homepage / About blurb (paste into GitHub About):

> LAN arcade for when the internet dies. One host, browser clients, tiny games. No cloud.

Topics (Settings → Topics):

```text
offline  lan  multiplayer  party-games  browser-games  python  web-games
local-first  pwa-friendly  educational  open-source
```

---

## Make it easy for anyone to contribute

| Setting / file | Action |
|----------------|--------|
| **Visibility** | Public |
| **LICENSE** | MIT ✅ already |
| **CONTRIBUTING.md** | ✅ added |
| **Issues** | Enabled |
| **Discussions** | Optional, nice for game ideas |
| ** fortify** | Branch protection on `main` optional at start |
| **Labels** | `good first issue`, `help wanted`, `game`, `host`, `docs` |
| **SECURITY.md** | Later (LAN trust model) |
| **Code owners** | Optional |

Pin Issues for newcomers:

1. “Add a 200 KB ultra game”  
2. “Translate lobby to language X”  
3. “Add QR to PC lobby”  

---

## Push commands (after creating empty public repo)

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git remote add origin git@github.com:YOUR_USER/offline-games-hub.git
# or HTTPS:
# git remote add origin https://github.com/YOUR_USER/offline-games-hub.git
git push -u origin main
```

Do **not** upload `pc/runtimes/win64` / `linux64` in the first push (gitignored).  
Attach them as a **Release** asset `offline-runtimes-win-linux.zip` for full offline packs.

---

## GitHub Pages (simple)

Options:

1. **README as homepage** — enough at first (repo root README is strong).  
2. **Pages from `/docs`** — add `docs/index.md` landing later.  
3. **Copy `pc/www`** — only static; host still needs Python on a machine.

For v1: public repo + great README is enough; Pages can wait a week.
