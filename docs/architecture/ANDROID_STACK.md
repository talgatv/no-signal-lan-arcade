# Android host stack (implementation record)

## Current status

Android host **0.2.0** is implemented under [`android/`](../../android/).
One Android phone runs the local server; every guest joins from a normal browser
on the same Wi-Fi or phone hotspot. Guests do not install an APK.

| Layer | Implemented stack | Role |
|-------|-------------------|------|
| Host UI | Kotlin + Jetpack Compose + Material 3 | Start/stop, invitation, help, settings |
| Lifecycle | Android foreground service | Owns the server, notification, wake lock, and runtime state |
| HTTP/HTTPS/WS | Ktor server with the Netty engine | One LAN listener and the same routes as the PC host |
| Host core | Plain Kotlin models and dispatcher | Rooms, players, protocol messages, static-route resolution |
| Settings | DataStore | Language, port, screen policy, HTTPS |
| QR | ZXing core | Encodes the direct library invitation |
| Browser packs | HTML/CSS/vanilla JS | The same `games/` tree used by the PC host |
| Build | Gradle Version Catalog, JDK 17 | minSdk 26, targetSdk 36 |

There is no embedded Node, Chromium, Flutter engine, Unity runtime, or cloud
service in the app.

---

## Runtime shape

```text
Compose UI
    │
    ▼
HostViewModel + HostRuntime
    │
    ▼
HostForegroundService
    │
    ▼
NettyOghServer ── HTTP / HTTPS / WebSocket on 0.0.0.0:<port>
    │
    ├── Hub + Dispatcher          rooms, players, relay
    ├── RouteResolver             PC-compatible URLs and redirects
    └── ContentRoots              external override, then APK assets
```

The foreground service is the source of truth for whether hosting is starting,
running, stopped, or failed. Reopening the activity or tapping the persistent
notification therefore returns to the correct invitation state instead of
starting a second server.

## Network transport

Production uses `NettyOghServer` for both modes:

- plain HTTP + `ws://`;
- HTTPS + `wss://`, using a locally generated self-signed certificate whose
  subject-alternative names include the phone's current LAN addresses;
- `/api/health`, `/api/rooms`, static packs, lobby, and the v1 WebSocket
  protocol through one shared Ktor routing function.

The repository also retains the earlier Ktor CIO `OghServer` and the custom
`SSLServerSocket`-based `HttpsOghServer` with its HTTP/1.1 and RFC 6455 codecs.
They remain useful as tested transport/reference implementations, but the
foreground service starts the Netty implementation.

HTTPS is optional and lives under Advanced settings. A guest browser must accept
the local self-signed certificate warning before loading the library. HTTPS is
needed for browser APIs such as phone geolocation when the page is opened from a
LAN IP rather than `localhost`.

## Content packaging and overrides

`syncWebAssets` runs before every Android build and copies:

- the complete repository `games/` tree, including
  `games/programs/<id>/`;
- the PC lobby from `pc/www/`;
- no game templates and no bundled shared font directory.

The generated destination is `android/app/src/main/assets/web/`. It is build
output: do not edit or commit it.

At runtime `ContentRoots` checks the app's external files directory first:

```text
<external-files>/packs/games/...
<external-files>/packs/www/...
```

A file there overrides the matching bundled asset, which supports development
and future pack-management flows without changing the routing protocol. There
is not yet an end-user pack installer or signature/update UI.

Canonical program URLs are `/games/programs/<id>/client/`. Legacy
`/programs/<id>/client/` requests redirect to that tree.

## Host experience

The non-technical flow is deliberately short:

1. Tap the large **Play together** button.
2. Show one QR code to nearby players, or share/copy its link.
3. Guests join the library on the same Wi-Fi; the host can also play locally.
4. Open hotspot help only if no usable LAN address is available.
5. Confirm before stopping the server.

Port and HTTPS controls stay under Advanced settings. The app can keep the
invitation screen awake while hosting and reports bind/start failures instead
of optimistically showing a running server.

## Internationalization

The native host ships the six UN languages:

| Code | Language | Notes |
|------|----------|-------|
| `en` | English | Default fallback |
| `zh` | Chinese (Simplified) | System CJK fonts |
| `ru` | Russian | |
| `es` | Spanish | |
| `ar` | Arabic | RTL layout |
| `fr` | French | |

Host copy lives in `res/values-XX/strings.xml`. Browser packs keep their own
locale tables and reuse system fonts; the APK does not bundle a full CJK font.

## Build and size

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
cd android
./gradlew :app:assembleDebug
```

When building from a linked worktree, `-PoghWebRoot=/path/to/repository` selects
the checkout whose current `games/` and `pc/www/` trees should be packaged.

| Artifact | Current policy |
|----------|----------------|
| Debug APK with the full catalog | approximately 18 MB |
| Bundled web library | approximately 11 MB |
| One pack | hard maximum 10 MB; prefer under 2 MB |
| Ultra-small pack badge | under 200 KB |

The application ID is `lol.lan.arcade`; version 0.2.0 uses version code 3.

## Remaining work

These are product extensions, not unresolved stack choices:

1. User-facing import, validation, versioning, and signatures for external packs.
2. Release signing and distribution automation.
3. Broader device/network smoke coverage, especially OEM hotspot behavior.
4. Optional extraction of genuinely shared models to KMP if another native host
   is implemented.

## Related

- [Android README](../../android/README.md)
- [Portable host core](./CORE.md)
- [LAN multiplayer](./MULTIPLAYER.md)
- [Vision](../VISION.md)
