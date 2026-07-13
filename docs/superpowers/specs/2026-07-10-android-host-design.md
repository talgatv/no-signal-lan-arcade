# Android Host — Design Spec

**Date:** 2026-07-10
**Module:** `android/`
**Status:** Approved for implementation (autonomous session — owner stepped away and pre-approved; see §0)
**Related:** `android/README.md`, `docs/architecture/ANDROID_STACK.md`, `docs/architecture/CORE.md`, `docs/architecture/MULTIPLAYER.md`, `docs/VISION.md`

> **Layout migration (2026-07-13):** this dated spec records the former
> top-level `programs/` layout. The current source root is
> `games/programs/`, with canonical PC-host URLs under `/games/programs/`.
> Any old `programs/` filesystem examples below must be translated to that
> nested location when implementing the plan.

---

## 0. Why this spec skips live review

Normal process asks the user to approve this design before implementation starts. The owner's
instruction for this session was explicit: build the Android host now, decide the open
questions without asking, and use the connected test device to verify. This doc is written to
the usual bar (so the decisions are legible and reversible later) but is self-approved under
that instruction rather than held for a live round-trip.

**Standing gate this overrides:** `docs/plans/LLM_DEVELOPMENT_PLAN.md` Epic E says *"do not
start E until C4 or C1 works on PC"* (a turn-based MP reference or Pulse Race online snapshot).
Neither is done — Phase 1 is still mid-flight. That gate exists so the WebSocket protocol gets
proven by a real multiplayer game before a second host implementation copies it. This session
proceeds anyway per direct instruction, copying the protocol byte-for-byte from `pc/host.py`
rather than re-deriving it, which is the closest available substitute for "proven on PC." This
must be stated plainly when reporting results — it is not fully validated the way the gate
intended.

---

## 1. Summary

A thin Kotlin/Compose Android app (`android/`) that turns a phone into the same kind of LAN game
host `pc/host.py` already is: it serves the existing `games/`, `programs/`, `docs/` static web
content over HTTP, runs the same WebSocket room/relay protocol, and shows guests a QR/IP to join
from **any browser** (Android, iPhone/iPad Safari, laptop) — no guest app. It does not reimplement
any game, the chat/radio program, or the video converter; those already work as static web
packs and only need correct serving.

## 2. Goals / non-goals

### Goals (this session)

| Goal | Done when |
|---|---|
| Gradle/Compose app builds | `./gradlew :app:assembleDebug` succeeds |
| Embedded server matches `pc/host.py` protocol | Same HTTP routes + WS message types (§5) |
| Host UI: Home / Running / Settings | Start/stop, IP list, QR, language, keep-screen-on |
| Foreground service | Server survives screen-off / app-backgrounded |
| Guests join from a browser | A second client (LAN device or dev-laptop browser) reaches lobby, sees `/games/`, `/programs/` |
| Bundled demo content works offline, out of the box | Hub + a curated set of games/programs ship as APK assets |
| Full repo content servable for real testing | External pack directory, pushed via adb for this session's test |
| UN-6 host UI language | `strings.xml` for en/zh/ru/es/ar(RTL)/fr |
| Installed & smoke-tested on the connected device | Realme 5 Pro (`afe6cafd`), LineageOS/Android 13 |

### Explicit non-goals (this session)

- **No programmatic Wi-Fi hotspot control.** `android/README.md`'s own role table lists "Start/stop
  local HTTP+WS" and "Show IP+QR" as host duties; hotspot creation isn't one of them, and the MVP
  screens (Home/Running/Settings) never included a hotspot toggle. The user's message describes
  the *use case* ("so anyone can join a hotspot during a blackout"), not a feature request — the
  phone's own Settings already does this. The Running screen will show one instructional line
  and a deep-link button into Android's Wi-Fi hotspot settings; it will not call
  `WifiManager.startLocalOnlyHotspot` or request `NEARBY_WIFI_DEVICES` / location permissions to
  drive it programmatically. That API is also fragmentary across OEM/Android versions and not
  worth the risk for an unattended session.
- **No HTTPS/TLS.** `pc/host.py --https` exists because phone browsers need a secure context for
  mic (PTT radio) and GPS (World Trail). Minting a self-signed cert in Kotlin without OpenSSL CLI
  needs Bouncy Castle (extra APK weight) or hand-rolled ASN.1 — real work with real risk. Deferred;
  documented as a follow-up. Text chat, all pure-JS games, and Video Convert (reads a local file,
  not the mic) all work over plain HTTP today; only PTT-radio and live GPS degrade gracefully.
- **No translation of game/lobby content into all 6 languages.** `ROADMAP.md` Phase 3 scopes that
  separately ("UN-6 i18n" for lobby content is future work); this session's i18n is the **native
  host UI only** (~25 strings × 6 languages), which is what `ANDROID_STACK.md` actually specifies
  ("Host UI = strings.xml only. Lobby/games = key-based JSON locales" — the latter already exist
  per-game as `instructions.en/ru/...` and are out of scope to expand).
- **No Play Store signing/release pipeline.** Debug build only.
- **No two-physical-device multiplayer proof.** Only one test device is connected. Verification
  hosts the server *on* the phone and joins as a second client from a browser on the dev laptop
  over the same Wi-Fi — this exercises the identical join/relay code path a second phone would
  use, without claiming a second-phone test happened.

## 3. Architecture

```
┌───────────────────────────────────────────────────────────┐
│ MainActivity (Compose)                                     │
│  Home → Running → Settings (bottom/segmented nav)           │
│  ViewModel holds server state via a StateFlow                │
└───────────────────────┬─────────────────────────────────────┘
                         │ start()/stop()
┌───────────────────────▼─────────────────────────────────────┐
│ HostForegroundService (foreground service, "server running") │
│  owns the Ktor server lifecycle; survives backgrounding       │
└───────────────────────┬─────────────────────────────────────┘
                         │
┌───────────────────────▼─────────────────────────────────────┐
│ Ktor CIO embedded server (Kotlin, in-process)                 │
│  HTTP: static file routing (same tree as pc/host.py)          │
│  WS  /ws: Hub/Room/Player — same message protocol             │
└───────────────────────┬─────────────────────────────────────┘
                         │ reads
┌───────────────────────▼─────────────────────────────────────┐
│ Content resolver: assets/ (bundled) ∪ external pack dir       │
│  (external wins on id collision — lets a pushed full games/    │
│  tree override/extend the bundled curated subset for testing) │
└───────────────────────────────────────────────────────────────┘
```

**Stack** (copied from the working sibling app `Double_subs`/"Dual" on this machine, which
`ANDROID_STACK.md` already names as the DX reference — versions proven to build against the
installed SDK, not guessed):

| | |
|---|---|
| Kotlin | 2.0.21 |
| AGP | 8.7.2 |
| Gradle wrapper | 8.10.2 |
| Compose BOM | 2024.10.01 (Material 3) |
| compileSdk / targetSdk | 36 |
| minSdk | 26 |
| JDK | 17 (`/usr/lib/jvm/java-17-openjdk-amd64`, pinned via `local.properties` → `org.gradle.java.home`) |
| Server | Ktor CIO (`ktor-server-cio`, `ktor-server-websockets`) |
| Settings | DataStore (port, language, keep-screen-on) |
| QR | `zxing-android-embedded` (small, well-known) or hand-rolled if it pulls too much weight — decide at implementation time by checking AAR size |
| Package / namespace | `lol.lan.arcade` (matches the `lol.*` house style already used by `lol.dual.subtitles`; was the second of two candidates `android/README.md` left TBD) |

## 4. Content strategy: bundled assets + external pack directory

`ANDROID_STACK.md` explicitly allows both "inside APK assets (few demos)" and "external packs";
this uses both, for different purposes:

- **`app/src/main/assets/web/`** — a curated subset copied at build time by a Gradle task
  (`syncWebAssets`) from the repo root, so the APK works standalone out of the box:
  `games/hub`, `games/catalog`, `games/_shared` (JS/CSS/shaders — **not** `_shared/fonts`, see
  below), `games/comet`, `games/comet-pixel`, `games/demo-tap`, `games/piece-caller`,
  `games/pulse-race`, `games/rootwork`, `programs/lan-chat`, `programs/video-convert`, `pc/www`
  (lobby/about). Total ≈ 500 KB–1 MB, comfortably inside the documented 8–12 MB base-APK budget.
  **Excluded:** `games/world-trail` (5.2 MB — mostly its city/river dataset) and
  `games/_shared/fonts` (4.6 MB of TTFs). Both exclusions are safe: `ogh-fonts.css` utility
  classes already fall back to `system-ui, sans-serif` when a font file 404s (verified by
  reading the CSS), so missing fonts degrade the look, not the function; World Trail is simply
  not part of the bundled demo set this session.
- **External pack directory** — `getExternalFilesDir(null)/packs/{games,programs}`. If present,
  its `catalog/games.json` (if any) and directories are merged over the bundled assets
  (external id wins on collision). This is where the **full** repo content goes for this
  session's real device test: `adb push` the entire `games/` and `programs/` trees (including
  World Trail and fonts) into that directory after install, so testing on the phone reflects the
  whole project, not just the curated demo — without that content ever being baked into the
  installable APK. This is also the intended path for "anyone can add a pack on GitHub" longer
  term (drop a pack in this directory / a future in-app installer), which the curated APK subset
  alone cannot offer.

## 5. Protocol — copied from `pc/host.py`, not redesigned

HTTP routing (mirrors `OGHHandler._resolve_static` exactly so `games/hub/hub.js`'s `detectRoots()`
sees the same shape it already handles as `mode: 'ogh'`):

| Path | Serves |
|---|---|
| `/`, `/index.html` | `pc/www/index.html` (lobby) |
| `/about`, `/about.html` | `pc/www/about.html` |
| `/games`, `/games/`, `/games/hub`, `/hub`, `/library`, `/apps` | `games/hub/index.html` |
| `/games/...` | content root `games/` |
| `/programs/...` | content root `programs/` |
| `/shared/...` | alias for `games/_shared/...` |
| `/docs/...` | content root `docs/` (skip if not bundled — 404 is fine, nothing depends on it) |
| `/www/...` and fallback | `pc/www/...` |
| `/api/health` | `{ ok, rooms, v: 1 }` |
| `/api/rooms` | `{ rooms: { roomId: playerCount } }` |
| `GET /ws` | WebSocket upgrade |

WS message types — **relay only, no new server-side features**, because `lan-chat`'s text *and*
PTT radio both already travel as `game:action` (`action: 'chat-msg'` / `action: 'ptt'`) through
the generic relay, not a dedicated server feature:

- Client→server: `join`, `ready`, `chat`, `game:start`, `game:action`, `game:state`, `game:event`, `ping`
- Server→client: `hello`, `lobby`, `chat`, `game:start`, `game:action`, `game:state`, `game:event`, `error`, `pong`

Room/Player/Hub model matches `pc/host.py`: first joiner is host, host reassigned on leave, room
GC'd when empty, `game:action` excludes sender, `game:state`/`game:event` also exclude sender
(matches the PC implementation's actual behavior, not its comment — read the code, not the
comment, when the two disagree).

**Frame size:** PTT audio clips travel as base64 JSON text frames up to `MAX_B64 = 900_000`
chars (`programs/lan-chat/client/app.js`). Ktor CIO's WebSocket default max frame size must be
raised explicitly (e.g. 2 MB) — confirmed as a specific risk to check during implementation, not
assumed safe by default.

## 6. Screens (MVP, per `android/README.md`)

1. **Home** — Start/Stop button; when stopped, nothing else.
2. **Running** — local IP(s) + port, QR code, `http://ip:port/` text (copyable), connected-room
   count (poll `/api/rooms` locally), "Open lobby" (launches system browser at `127.0.0.1:port`),
   one-line hotspot hint + button deep-linking to `Settings.ACTION_WIFI_TETHER_SETTING` (falls
   back to `Settings.ACTION_WIRELESS_SETTINGS` if that intent doesn't resolve on the device's
   OEM skin).
3. **Settings** — language picker (system default + 6 explicit overrides), port number, keep-screen-on
   toggle. Persisted via DataStore.

## 7. Error handling

- Port already in use → catch bind failure, surface as inline error on Home, suggest alternate port from Settings.
- No Wi-Fi/LAN interface (e.g. airplane mode) → still bind `0.0.0.0`; Running screen shows "no
  network interface found" instead of an IP list rather than crashing.
- Guest requests a path outside the content roots → 404, same path-traversal guard as
  `safe_join()` in `pc/host.py` (resolve + prefix-check, reject `..`).
- WS client sends malformed JSON → reply `error` message, keep connection open (matches PC).
- Foreground service killed by OS → notification simply disappears; Home screen reflects
  stopped state on next open (no persistent "zombie" state claimed).

## 8. Testing plan (this session, one physical device)

1. `./gradlew :app:assembleDebug`; install via `adb -s afe6cafd install -r`.
2. Push full repo content to the external pack directory; launch app; start server.
3. From the **dev laptop's browser**, hit the phone's LAN IP: verify lobby loads, catalog
   populates, a solo game runs, `lan-chat` text round-trips (two browser tabs against the same
   phone host, since laptop can open two tabs even with one physical Android device), Video
   Convert loads and can pick/process a local file.
4. Verify `/api/health` and `/api/rooms` respond.
5. Screen-off / home-button the phone; confirm the foreground notification stays and the server
   keeps responding (proves the foreground service, not just the Activity, owns the server).
6. Switch host language in Settings; confirm strings change including an RTL check for Arabic.

This is **not** a two-phone multiplayer proof (§2 non-goals) — it proves the host serves,
relays, and survives backgrounding correctly, which is what this session can actually verify.

## 9. Follow-ups (explicitly deferred, not silently dropped)

- HTTPS self-signed cert on Android (needed for PTT radio + live GPS from LAN guests).
- Programmatic hotspot control, if ever wanted, as its own scoped spec.
- World Trail + fonts in a downloadable/optional asset pack instead of external-only.
- Real second-device multiplayer test once a second Android device or emulator is available.
- Epic E's actual gate: a turn-based PC multiplayer reference (C4) to validate the protocol this
  session copied on faith from `pc/host.py`.
