# Android host stack (decision record)

## Selection criteria

1. **Tiny host APK** — shell stays small; games must not force a fat base install.  
2. **Multi-platform later** — same packs on PC and Android.  
3. **UN languages** from day one (i18n-ready).  
4. **Familiar DX** — Kotlin + Compose (as in Dual).  
5. **Players use the browser** — guests never install the APK.

---

## Decision summary

| Layer | Stack | Why |
|-------|--------|-----|
| **Android host UI** | Kotlin + Jetpack Compose + Material 3 | Fast UI, Play Store, foreground service, QR |
| **Local server** | Kotlin HTTP + WebSocket (minimal deps) | No Node/Chromium in the APK |
| **Lobby + games** | HTML/CSS/vanilla JS | Any phone browser; ≤ 10 MB per pack |
| **Host strings** | `res/values-XX/strings.xml` | System i18n + RTL for Arabic |
| **Game dictionaries** | On-demand JSON locale packs | Don’t ship CJK word lists in every pack |
| **Build** | Gradle Version Catalog, minSdk 26, JDK 17 | Matches Dual-class tooling |

**Reject for host:** Flutter, React Native, Capacitor-as-shell, Electron, embedded Node.  
**Reject for default games:** Unity / Unreal / full Godot export / huge texture packs.

---

## Target repository layout

```text
OFFline_games_app/   (no-signal-lan-arcade)
├── README.md
├── docs/
├── android/                 # this host
│   └── app/
├── pc/                      # Python host (shipping now)
├── games/                   # web packs ≤ 10 MB
└── ...
```

`android/` is a **platform shell**. Game logic lives in `games/` HTML packs.

---

## Why not “Dual + Node inside”

| Option | Size / pain | Verdict |
|--------|-------------|---------|
| Compose + **embedded Node/Bun** | +30–80 MB, nasty builds | ❌ |
| Compose + **Capacitor** host UI | Extra WebView weight | ❌ |
| **Flutter** host | Heavier base APK | ❌ |
| **KMP + Compose Multiplatform** day one | Strong later; slow start | ⏳ phase 2–3 |
| **Compose + thin Kotlin server** | Host APK realistically **2–8 MB** without games | ✅ |

Games may ship:

- inside APK `assets/games/...` (few demos), or  
- as external packs — base app stays tiny.

**Philosophy:** “GTA in 10 MB” = procedural/vector art, tiny assets, original rules.  
10 MB is a **ceiling**; most packs should be **&lt; 500 KB–2 MB**.

---

## Server duties on Android

1. Listen `0.0.0.0:PORT` (HTTP + WebSocket).  
2. Serve lobby + `/games/<id>/`.  
3. Rooms / players / broadcast (same protocol as `pc/host.py`).  
4. Foreground service + “server running” notification.  
5. UI: start/stop, IP, QR, language, installed packs.

**Sparse dependencies:** Coroutines, Compose BOM, optional QR lib, DataStore.  
No Room required for MVP. No speech SDKs.

| HTTP/WS approach | Pros | Cons |
|------------------|------|------|
| A. Custom ServerSocket + WS | Minimal MB | More code |
| B. Ktor CIO | Nice API | +size |
| C. NanoHTTPD + WS | Balance | Maintenance |

**MVP:** B or C. Shrink to A if needed.

---

## i18n — UN languages

| Code | Language | Notes |
|------|----------|--------|
| `en` | English | default |
| `zh` | Chinese (Simplified) | system CJK fonts |
| `ru` | Russian | |
| `es` | Spanish | |
| `ar` | Arabic | **RTL** |
| `fr` | French | |

Rules:

1. Host UI = `strings.xml` only.  
2. Lobby/games = key-based JSON locales.  
3. Huge word packs load **on demand** per room language.  
4. Do not bundle full Noto CJK in the APK.

---

## Dual (reference app)

Copy **patterns**, not the subtitle codebase:

- Gradle catalog, JDK 17, Compose, ViewModel, DataStore  
- Dark high-contrast UI, large hit targets  

Do **not** pull Vosk, Room subtitle schemas, etc.

---

## Stack comparison

| Host stack | Lightness | MVP speed | Desktop port | Dual familiarity |
|------------|-----------|-----------|--------------|------------------|
| **Kotlin + Compose + Kotlin server** | ★★★★★ | ★★★★ | ★★★ | ★★★★★ |
| KMP + CMP | ★★★★ | ★★★ | ★★★★★ | ★★★★ |
| Flutter | ★★★ | ★★★★ | ★★★★ | ★★ |
| Capacitor web host | ★★ | ★★★★ | ★★★ | ★★ |

**Choose row 1 now.** Evolve shared models into KMP later if useful.

---

## Size definition of done

| Artifact | Target |
|----------|--------|
| Base APK (0–2 demo games) | **&lt; 8–12 MB** install |
| One game pack | max **10 MB**, aim **&lt; 2 MB** |
| Ultra badge | **&lt; 200 KB** |
| Wordpack per language | separate gzip |

---

## Open (non-blocking)

1. Ktor vs nano server on first spike.  
2. Assets vs external packs for demos.  
3. Final `applicationId` package name.

## Related

- [CORE.md](./CORE.md)  
- [../VISION.md](../VISION.md)  
- [../../android/README.md](../../android/README.md)
