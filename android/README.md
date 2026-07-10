# Android host

Native **host app** for Offline Games Hub on local Wi‑Fi.

A phone with this APK starts the server. Other players join with a **browser** (no guest APK).

Code will live in this folder. Today: documentation only. Gradle/Compose scaffold is next.

---

## Role

| Host does | Host does not |
|-----------|----------------|
| Start / stop local HTTP + WebSocket | Draw complex gameplay (that is HTML) |
| Show IP + QR | Cloud matchmaking |
| Foreground service so the OS keeps the process | Force guests to install an app |
| UI language, keep-screen-on | Ship a full Node runtime |
| Serve lobby + game packs | |

---

## Stack

Reference DX: Dual-class Kotlin apps (Compose, not Flutter).

| | |
|--|--|
| Language | **Kotlin** |
| UI | **Jetpack Compose** + Material 3 |
| Build | Gradle Version Catalog |
| minSdk / target | 26 / 36 (to confirm at scaffold) |
| JDK | **17** required |
| Networking | **Kotlin** HTTP + WebSocket (no Node in APK) |
| Settings | DataStore |
| i18n | `res/values-XX/strings.xml` |

Details: [docs/architecture/ANDROID_STACK.md](../docs/architecture/ANDROID_STACK.md)

### Host UI languages (UN set)

`en` · `zh` · `ru` · `es` · `ar` (RTL) · `fr`  

Use **system** CJK/Arabic fonts — do not bundle full Noto CJK.

---

## Size goals

Product philosophy: **maximum gameplay per kilobyte**.

| Artifact | Target |
|----------|--------|
| Base APK (shell, 0–2 demos) | as small as possible; ~**&lt; 8–12 MB** |
| One game pack | hard max **10 MB**, prefer **&lt; 2 MB** |
| Ultra badge | **&lt; 200 KB** |

Do not ship: Node, Chromium, Flutter engine, Unity, giant multilingual dictionaries in base.

---

## Planned structure (after scaffold)

```text
android/
├── README.md                 ← you are here
├── settings.gradle.kts
├── build.gradle.kts
├── gradle/libs.versions.toml
├── gradlew
└── app/
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/.../         # Compose UI, service, server
        ├── res/              # themes, strings
        └── assets/           # optional lobby + demo games
```

Shared packs live in repo root `games/`. Android only **serves** them (assets or external packs).

---

## Relation to the rest of the monorepo

```text
no-signal-lan-arcade/
├── android/     ← this host shell
├── pc/          ← Python host (shipping now)
├── docs/
└── games/       ← web packs ≤ 10 MB
```

- Catalog: [docs/games/CATALOG.md](../docs/games/CATALOG.md)  
- Core: [docs/architecture/CORE.md](../docs/architecture/CORE.md)  
- Root: [README.md](../README.md)

---

## Build (when scaffold exists)

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
cd android
./gradlew :app:assembleDebug
# APK → app/build/outputs/apk/debug/
```

There is no `gradlew` yet — docs only.

---

## MVP screens

1. **Home** — Start / Stop server  
2. **Running** — IP, port, QR, connection count, “open lobby”  
3. **Settings** — language, port, keep screen on  
4. Later — installed pack list  

---

## Status

| | |
|--|--|
| `android/` folder | ✅ |
| This README | ✅ |
| Gradle / Compose skeleton | ⬜ |
| HTTP/WS server | ⬜ |
| QR + foreground service | ⬜ |

---

## Package name (draft)

TBD. Candidates:

- `dev.talgatv.nosignal`  
- `lol.lan.arcade`  

Finalize with the first `build.gradle.kts`.
