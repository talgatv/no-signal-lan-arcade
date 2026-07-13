# Android Host Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Layout migration (2026-07-13):** this historical plan predates the move
> from top-level `programs/` to `games/programs/`. Current builds use the
> nested source/assets tree and canonical `/games/programs/` URLs; old task
> snapshots below describe the pre-migration state.

**Goal:** Build `android/` — a Kotlin/Compose app that turns a phone into the same LAN game host `pc/host.py` already is (embedded HTTP+WebSocket server, same protocol, same content), with Home/Running/Settings screens, then install and smoke-test it on the connected device.

**Architecture:** A framework-agnostic core (`Hub`/`Room`/`Player`/`Dispatcher`, `RouteResolver`, `ContentRoots`) implements the protocol and content-routing logic as plain, unit-testable Kotlin with zero Android/Ktor imports. A thin Ktor CIO adapter (`OghServer`) wires that core to real HTTP/WebSocket traffic. A `HostForegroundService` owns the server's lifecycle. Compose screens (`Home`/`Running`/`Settings`) drive it through a `HostViewModel`.

**Tech Stack:** Kotlin 2.0.21, AGP 8.7.2, Gradle 8.10.2, Compose BOM 2024.10.01 (Material 3), Ktor 3.5.1 (server-core/cio/websockets), kotlinx-serialization-json 1.7.3, androidx DataStore 1.1.1, com.google.zxing:core 3.5.4 (QR, no camera/UI dependency). All versions verified to resolve (checked against Maven Central / Google Maven metadata in this session) and, where possible, copied from `Double_subs`/`FolderCam` — sibling Android apps on this same machine that already build successfully against the installed SDK (`/home/denim/Android/Sdk`, platform android-36).

## Global Constraints

- namespace/applicationId: `lol.lan.arcade` (matches house style already used by `lol.dual.subtitles`; was the second of two candidates left TBD in `android/README.md`).
- minSdk 26, compileSdk 36, targetSdk 36, JDK 17 (`sourceCompatibility`/`targetCompatibility`/`kotlinOptions.jvmTarget`; pin via `local.properties` → `org.gradle.java.home=/usr/lib/jvm/java-17-openjdk-amd64`, gitignored, not committed).
- No Node, no Chromium/WebView-as-shell, no Flutter/RN/Capacitor — matches `docs/architecture/ANDROID_STACK.md`.
- HTTP protocol (paths + WS message shapes) must match `pc/host.py` byte-for-byte — see `docs/superpowers/specs/2026-07-10-android-host-design.md` §5. Read the Python source, not just its comments, when the two disagree (the `game:event` exclude-sender quirk in Task 4 is the concrete example).
- No programmatic Wi-Fi hotspot control, no HTTPS/TLS, no full game-content i18n, no Play Store signing — all explicit non-goals in the design spec §2.
- No placeholders: every step below is real, complete code. Where an exact third-party API detail could not be verified from memory, it was checked directly against the library's published source in this session (Ktor `WebSocketOptions`, `EmbeddedServer.stop()`, routing tailcard syntax) — noted inline where it matters.
- Test device: Realme 5 Pro, `adb -s afe6cafd`, LineageOS/Android 13 (API 33), arm64-v8a.

---

## File map

```
android/
├── settings.gradle.kts            Task 1
├── build.gradle.kts               Task 1
├── gradle.properties              Task 1
├── local.properties                Task 1 (gitignored, created not committed)
├── gradle/libs.versions.toml       Task 1
├── gradle/wrapper/*                Task 1 (copied from FolderCam)
├── gradlew, gradlew.bat            Task 1 (copied from FolderCam)
└── app/
    ├── build.gradle.kts            Task 1, extended Task 8
    ├── proguard-rules.pro          Task 1
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml                              Task 1, extended Task 10
        │   ├── assets/web/…                                     Task 8 (generated, gitignored)
        │   ├── res/values/{strings,colors,themes}.xml            Task 1, strings extended Task 16
        │   ├── res/values-{zh,ru,es,ar,fr}/strings.xml            Task 16
        │   ├── res/drawable/ic_launcher_{background,foreground}.xml, ic_notification.xml   Task 1
        │   ├── res/mipmap-anydpi-v26/ic_launcher{,_round}.xml     Task 1
        │   └── java/lol/lan/arcade/
        │       ├── MainActivity.kt                               Task 1, replaced Task 12
        │       ├── server/
        │       │   ├── Protocol.kt                                Task 2
        │       │   ├── Hub.kt                                     Task 3
        │       │   ├── Dispatcher.kt                              Task 4
        │       │   ├── RouteResolver.kt                           Task 5
        │       │   ├── ContentRoots.kt                            Task 6
        │       │   └── OghServer.kt                                Task 7
        │       ├── net/NetworkUtils.kt                            Task 9
        │       ├── data/SettingsStore.kt                          Task 9
        │       ├── service/HostForegroundService.kt                Task 10
        │       ├── ui/
        │       │   ├── qr/QrCode.kt                                Task 11
        │       │   ├── theme/{Color,Theme}.kt                     Task 11
        │       │   ├── HostViewModel.kt                            Task 12
        │       │   ├── AppNav.kt                                   Task 12
        │       │   ├── HomeScreen.kt                                Task 13
        │       │   ├── RunningScreen.kt                             Task 14
        │       │   └── SettingsScreen.kt                            Task 15
        └── test/java/lol/lan/arcade/server/
            ├── HubTest.kt                                          Task 3
            ├── DispatcherTest.kt                                   Task 4
            ├── RouteResolverTest.kt                                Task 5
            ├── ContentRootsTest.kt                                 Task 6
            └── OghServerRouteTest.kt                                Task 7
```

---

### Task 1: Gradle/Android project scaffold

**Files:**
- Create: `android/settings.gradle.kts`, `android/build.gradle.kts`, `android/gradle.properties`, `android/gradle/libs.versions.toml`
- Create (copy from `/home/denim/Projects/AI_short_progs/FolderCam/`): `android/gradlew`, `android/gradlew.bat`, `android/gradle/wrapper/gradle-wrapper.jar`, `android/gradle/wrapper/gradle-wrapper.properties`
- Create: `android/app/build.gradle.kts`, `android/app/proguard-rules.pro`
- Create: `android/app/src/main/AndroidManifest.xml`
- Create: `android/app/src/main/java/lol/lan/arcade/MainActivity.kt`
- Create: `android/app/src/main/res/values/strings.xml`, `colors.xml`, `themes.xml`
- Create: `android/app/src/main/res/drawable/ic_launcher_background.xml`, `ic_launcher_foreground.xml`, `ic_notification.xml`
- Create: `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`, `ic_launcher_round.xml`
- Modify: `/home/denim/Projects/AI_short_progs/OFFline_games_app/.gitignore` (append `android/app/src/main/assets/web/`)
- (Not committed — gitignored) `android/local.properties`

**Interfaces:**
- Produces: a buildable, installable, empty-shell app (`lol.lan.arcade`/`MainActivity`) that every later task adds to.

- [ ] **Step 1: Copy the proven Gradle wrapper**

```bash
mkdir -p /home/denim/Projects/AI_short_progs/OFFline_games_app/android/gradle/wrapper
cp /home/denim/Projects/AI_short_progs/FolderCam/gradlew /home/denim/Projects/AI_short_progs/OFFline_games_app/android/gradlew
cp /home/denim/Projects/AI_short_progs/FolderCam/gradlew.bat /home/denim/Projects/AI_short_progs/OFFline_games_app/android/gradlew.bat
cp /home/denim/Projects/AI_short_progs/FolderCam/gradle/wrapper/gradle-wrapper.jar /home/denim/Projects/AI_short_progs/OFFline_games_app/android/gradle/wrapper/gradle-wrapper.jar
cp /home/denim/Projects/AI_short_progs/FolderCam/gradle/wrapper/gradle-wrapper.properties /home/denim/Projects/AI_short_progs/OFFline_games_app/android/gradle/wrapper/gradle-wrapper.properties
chmod +x /home/denim/Projects/AI_short_progs/OFFline_games_app/android/gradlew
```

- [ ] **Step 2: Write `android/settings.gradle.kts`**

```kotlin
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "OfflineGamesHost"
include(":app")
```

- [ ] **Step 3: Write `android/build.gradle.kts`**

```kotlin
plugins {
    id("com.android.application") version "8.7.2" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "2.0.21" apply false
}
```

- [ ] **Step 4: Write `android/gradle.properties`**

```properties
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
```

- [ ] **Step 5: Write `android/local.properties` (not committed)**

```properties
sdk.dir=/home/denim/Android/Sdk
org.gradle.java.home=/usr/lib/jvm/java-17-openjdk-amd64
```

- [ ] **Step 6: Write `android/gradle/libs.versions.toml`**

```toml
[versions]
agp = "8.7.2"
kotlin = "2.0.21"
composeBom = "2024.10.01"
activityCompose = "1.9.3"
navigationCompose = "2.8.3"
lifecycle = "2.8.7"
datastore = "1.1.1"
coreKtx = "1.13.1"
coroutines = "1.9.0"
serialization = "1.7.3"
ktor = "3.5.1"
zxingCore = "3.5.4"
junit = "4.13.2"

[libraries]
compose-bom = { module = "androidx.compose:compose-bom", version.ref = "composeBom" }
compose-ui = { module = "androidx.compose.ui:ui" }
compose-ui-graphics = { module = "androidx.compose.ui:ui-graphics" }
compose-ui-tooling = { module = "androidx.compose.ui:ui-tooling" }
compose-ui-tooling-preview = { module = "androidx.compose.ui:ui-tooling-preview" }
compose-material3 = { module = "androidx.compose.material3:material3" }
compose-foundation = { module = "androidx.compose.foundation:foundation" }
activity-compose = { module = "androidx.activity:activity-compose", version.ref = "activityCompose" }
navigation-compose = { module = "androidx.navigation:navigation-compose", version.ref = "navigationCompose" }
lifecycle-viewmodel-compose = { module = "androidx.lifecycle:lifecycle-viewmodel-compose", version.ref = "lifecycle" }
lifecycle-runtime-compose = { module = "androidx.lifecycle:lifecycle-runtime-compose", version.ref = "lifecycle" }
androidx-core-ktx = { module = "androidx.core:core-ktx", version.ref = "coreKtx" }
kotlinx-coroutines-android = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-android", version.ref = "coroutines" }
kotlinx-serialization-json = { module = "org.jetbrains.kotlinx:kotlinx-serialization-json", version.ref = "serialization" }
datastore-preferences = { module = "androidx.datastore:datastore-preferences", version.ref = "datastore" }
ktor-server-core = { module = "io.ktor:ktor-server-core", version.ref = "ktor" }
ktor-server-cio = { module = "io.ktor:ktor-server-cio", version.ref = "ktor" }
ktor-server-websockets = { module = "io.ktor:ktor-server-websockets", version.ref = "ktor" }
ktor-server-test-host = { module = "io.ktor:ktor-server-test-host", version.ref = "ktor" }
zxing-core = { module = "com.google.zxing:core", version.ref = "zxingCore" }
junit = { module = "junit:junit", version.ref = "junit" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
```

- [ ] **Step 7: Write `android/app/build.gradle.kts`**

```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "lol.lan.arcade"
    compileSdk = 36

    defaultConfig {
        applicationId = "lol.lan.arcade"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        debug { isMinifyEnabled = false }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.activity.compose)
    implementation(libs.navigation.compose)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material3)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.datastore.preferences)

    implementation(libs.ktor.server.core)
    implementation(libs.ktor.server.cio)
    implementation(libs.ktor.server.websockets)

    implementation(libs.zxing.core)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.serialization.json)
    testImplementation(libs.ktor.server.test.host)
}
```

- [ ] **Step 8: Write `android/app/proguard-rules.pro`** (empty is fine for MVP)

```proguard
# Add project specific ProGuard rules here.
```

- [ ] **Step 9: Write `android/app/src/main/AndroidManifest.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.OghHost">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden|uiMode|density|smallestScreenSize"
            android:windowSoftInputMode="adjustResize"
            android:theme="@style/Theme.OghHost">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".service.HostForegroundService"
            android:exported="false"
            android:foregroundServiceType="specialUse">
            <property
                android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
                android:value="Local LAN game/file server the user starts explicitly to let other devices on the same Wi-Fi join and play." />
        </service>
    </application>
</manifest>
```

- [ ] **Step 10: Write resource files**

`android/app/src/main/res/values/colors.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ogh_bg">#12121A</color>
    <color name="ogh_accent">#5CE1FF</color>
    <color name="ogh_accent_dark">#0FA6C9</color>
</resources>
```

`android/app/src/main/res/values/themes.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.OghHost" parent="android:Theme.Material.NoActionBar" />
</resources>
```

`android/app/src/main/res/values/strings.xml` (extended in Task 16; minimum for Task 1):
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Offline Games Host</string>
</resources>
```

`android/app/src/main/res/drawable/ic_launcher_background.xml`:
```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp"
    android:viewportWidth="108" android:viewportHeight="108">
    <path android:fillColor="#12121A" android:pathData="M0,0 H108 V108 H0 Z"/>
</vector>
```

`android/app/src/main/res/drawable/ic_launcher_foreground.xml`:
```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp"
    android:viewportWidth="108" android:viewportHeight="108">
    <path android:fillColor="#5CE1FF" android:pathData="M40,34 L79,54 L40,74 Z"/>
</vector>
```

`android/app/src/main/res/drawable/ic_notification.xml`:
```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp"
    android:viewportWidth="24" android:viewportHeight="24"
    android:tint="#FFFFFF">
    <path android:fillColor="#FF000000" android:pathData="M12,3 L21,12 L12,21 L3,12 Z"/>
</vector>
```

`android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` and `ic_launcher_round.xml` (identical content, two files):
```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
```

- [ ] **Step 11: Write a minimal `MainActivity.kt`** (replaced in Task 12; this only proves the shell builds)

```kotlin
package lol.lan.arcade

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface { Text("Offline Games Host") }
            }
        }
    }
}
```

- [ ] **Step 12: Add the generated web assets directory to `.gitignore`**

Edit `/home/denim/Projects/AI_short_progs/OFFline_games_app/.gitignore`, in the `# --- Android (future) ---` section, add:

```
android/app/src/main/assets/web/
```

- [ ] **Step 13: Build and verify**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app/android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
./gradlew :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`, `app/build/outputs/apk/debug/app-debug.apk` exists.

- [ ] **Step 14: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/ .gitignore
git commit -m "Scaffold Android host: Gradle/Compose skeleton (assembleDebug green)"
```

---

### Task 2: Protocol wire-format helpers

**Files:**
- Create: `android/app/src/main/java/lol/lan/arcade/server/Protocol.kt`
- Test: `android/app/src/test/java/lol/lan/arcade/server/ProtocolTest.kt`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces: `IncomingMessage` (parsed request), `Outgoing` object with `hello()`, `lobby()`, `chat()`, `gameStart()`, `relay()`, `pong()`, `error()` — each returns a compact JSON `String`. `PlayerInfo` data class used by `Hub`/`Room` in Task 3.

- [ ] **Step 1: Write the failing test**

```kotlin
package lol.lan.arcade.server

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProtocolTest {

    @Test
    fun `parses a join message`() {
        val msg = IncomingMessage.parse("""{"v":1,"type":"join","room":"main","name":"Ada","gameId":"pulse-race"}""")
        assertEquals("join", msg.type)
        assertEquals("main", msg.string("room"))
        assertEquals("Ada", msg.string("name"))
        assertEquals("pulse-race", msg.string("gameId"))
    }

    @Test
    fun `missing optional field returns null`() {
        val msg = IncomingMessage.parse("""{"v":1,"type":"ping"}""")
        assertNull(msg.string("t"))
    }

    @Test
    fun `invalid json returns null`() {
        assertEquals(null, IncomingMessage.parseOrNull("not json"))
    }

    @Test
    fun `hello json has expected shape`() {
        val text = Outgoing.hello(playerId = "a1b2", isHost = true, room = "main")
        val obj = Json.parseToJsonElement(text).jsonObject
        assertEquals(1, obj["v"]!!.jsonPrimitive.int)
        assertEquals("hello", obj["type"]!!.jsonPrimitive.content)
        assertEquals("a1b2", obj["playerId"]!!.jsonPrimitive.content)
        assertEquals(true, obj["isHost"]!!.jsonPrimitive.boolean)
        assertEquals("main", obj["room"]!!.jsonPrimitive.content)
    }

    @Test
    fun `lobby json embeds player list`() {
        val players = listOf(PlayerInfo("p1", "Ada", ready = true, gameId = "pulse-race", isHost = true))
        val text = Outgoing.lobby(players, room = "main")
        val obj = Json.parseToJsonElement(text).jsonObject
        assertEquals("lobby", obj["type"]!!.jsonPrimitive.content)
        val p0 = obj["players"]!!.jsonObject // will fail to compile as object; players is an array
    }

    @Test
    fun `relay preserves action and payload verbatim`() {
        val incoming = IncomingMessage.parse(
            """{"v":1,"type":"game:action","action":"input","payload":{"steer":-1},"tick":5}"""
        )
        val text = Outgoing.relay(type = "game:action", fromId = "p1", incoming = incoming, nowMillis = 1000L)
        val obj = Json.parseToJsonElement(text).jsonObject
        assertEquals("game:action", obj["type"]!!.jsonPrimitive.content)
        assertEquals("p1", obj["from"]!!.jsonPrimitive.content)
        assertEquals("input", obj["action"]!!.jsonPrimitive.content)
        assertEquals(-1, obj["payload"]!!.jsonObject["steer"]!!.jsonPrimitive.int)
        assertEquals(5, obj["tick"]!!.jsonPrimitive.int)
        assertEquals(1000L, obj["t"]!!.jsonPrimitive.long)
    }

    @Test
    fun `relay falls back to now when t is absent`() {
        val incoming = IncomingMessage.parse("""{"v":1,"type":"game:event"}""")
        val text = Outgoing.relay(type = "game:event", fromId = "p1", incoming = incoming, nowMillis = 42L)
        val obj = Json.parseToJsonElement(text).jsonObject
        assertEquals(42L, obj["t"]!!.jsonPrimitive.long)
    }
}
```

Fix the accidental `players` array test above before running it — it was written to show a *wrong* assumption is caught, not to ship. Replace the `lobby json embeds player list` test body with:

```kotlin
    @Test
    fun `lobby json embeds player list`() {
        val players = listOf(PlayerInfo("p1", "Ada", ready = true, gameId = "pulse-race", isHost = true))
        val text = Outgoing.lobby(players, room = "main")
        val obj = Json.parseToJsonElement(text).jsonObject
        assertEquals("lobby", obj["type"]!!.jsonPrimitive.content)
        val arr = obj["players"]!!.jsonObject // placeholder replaced in Step 3 once JsonArray import is in place
    }
```

Actually — write it correctly the first time. Use this final version of that one test (this replaces the buggy one above):

```kotlin
    @Test
    fun `lobby json embeds player list`() {
        val players = listOf(PlayerInfo("p1", "Ada", ready = true, gameId = "pulse-race", isHost = true))
        val text = Outgoing.lobby(players, room = "main")
        val obj = Json.parseToJsonElement(text).jsonObject
        assertEquals("lobby", obj["type"]!!.jsonPrimitive.content)
        val arr = obj["players"]!!.let { kotlinx.serialization.json.JsonArray::class.java; it }
        val first = (obj["players"] as kotlinx.serialization.json.JsonArray)[0].jsonObject
        assertEquals("p1", first["id"]!!.jsonPrimitive.content)
        assertEquals("Ada", first["name"]!!.jsonPrimitive.content)
        assertEquals(true, first["isHost"]!!.jsonPrimitive.boolean)
        assertEquals("main", obj["room"]!!.jsonPrimitive.content)
    }
```

- [ ] **Step 2: Run test to verify it fails (file doesn't exist yet)**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "lol.lan.arcade.server.ProtocolTest"`
Expected: FAIL — compilation error, `IncomingMessage`/`Outgoing`/`PlayerInfo` unresolved.

- [ ] **Step 3: Write `Protocol.kt`**

```kotlin
package lol.lan.arcade.server

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import kotlinx.serialization.json.put

/** One player as reported in `lobby` messages. */
data class PlayerInfo(
    val id: String,
    val name: String,
    val ready: Boolean,
    val gameId: String,
    val isHost: Boolean,
)

/**
 * A parsed client→server message. Wraps the raw [JsonObject] so unknown/dynamic
 * fields (`payload`, `action`, `tick`) can be forwarded verbatim without the server
 * needing to understand game-specific shapes — mirrors `msg.get(...)` in pc/host.py.
 */
class IncomingMessage private constructor(private val obj: JsonObject) {
    val type: String? get() = string("type")

    fun string(key: String): String? = obj[key]?.jsonPrimitive?.contentOrNull
    fun bool(key: String, default: Boolean): Boolean = obj[key]?.jsonPrimitive?.booleanOrNull ?: default
    fun long(key: String): Long? = obj[key]?.jsonPrimitive?.longOrNull
    fun element(key: String): JsonElement? = obj[key]

    companion object {
        fun parse(raw: String): IncomingMessage = IncomingMessage(Json.parseToJsonElement(raw).jsonObject)

        fun parseOrNull(raw: String): IncomingMessage? = try {
            parse(raw)
        } catch (e: Exception) {
            null
        }
    }
}

/** Builders for every server→client message. Each returns compact JSON text. */
object Outgoing {

    private fun message(build: kotlinx.serialization.json.JsonObjectBuilder.() -> Unit): String =
        buildJsonObject {
            put("v", 1)
            build()
        }.toString()

    fun hello(playerId: String, isHost: Boolean, room: String): String = message {
        put("type", "hello")
        put("playerId", playerId)
        put("isHost", isHost)
        put("room", room)
    }

    fun lobby(players: List<PlayerInfo>, room: String): String = message {
        put("type", "lobby")
        put("players", buildJsonArray {
            players.forEach { p ->
                add(buildJsonObject {
                    put("id", p.id)
                    put("name", p.name)
                    put("ready", p.ready)
                    put("gameId", p.gameId)
                    put("isHost", p.isHost)
                })
            }
        })
        put("room", room)
    }

    fun chat(fromId: String, name: String, text: String): String = message {
        put("type", "chat")
        put("from", fromId)
        put("name", name)
        put("text", text)
    }

    fun gameStart(gameId: String, seed: Long, hostId: String?): String = message {
        put("type", "game:start")
        put("gameId", gameId)
        put("seed", seed)
        put("hostId", hostId)
    }

    /** `type` is one of "game:action" | "game:state" | "game:event". Forwards action/payload/tick verbatim. */
    fun relay(type: String, fromId: String, incoming: IncomingMessage, nowMillis: Long): String = message {
        put("type", type)
        put("from", fromId)
        put("action", incoming.element("action") ?: JsonNull)
        put("payload", incoming.element("payload") ?: JsonNull)
        put("tick", incoming.element("tick") ?: JsonNull)
        put("t", incoming.long("t") ?: nowMillis)
    }

    fun pong(t: JsonElement?): String = message {
        put("type", "pong")
        put("t", t ?: JsonNull)
    }

    fun error(message: String): String = this.message {
        put("type", "error")
        put("message", message)
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "lol.lan.arcade.server.ProtocolTest"`
Expected: PASS (4 tests: parse join, missing-field null, invalid json null, hello shape, lobby shape, relay verbatim, relay fallback timestamp — 7 tests total).

If `put("hostId", hostId)` fails to resolve for `hostId: String?` (nullable put overload), replace with:
```kotlin
        if (hostId != null) put("hostId", hostId) else put("hostId", JsonNull)
```

- [ ] **Step 5: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/app/src/main/java/lol/lan/arcade/server/Protocol.kt android/app/src/test/java/lol/lan/arcade/server/ProtocolTest.kt
git commit -m "Add Android host wire-protocol JSON helpers + tests"
```

---

### Task 3: Hub / Room / Player core

**Files:**
- Create: `android/app/src/main/java/lol/lan/arcade/server/Hub.kt`
- Test: `android/app/src/test/java/lol/lan/arcade/server/HubTest.kt`

**Interfaces:**
- Consumes: `PlayerInfo` (Task 2).
- Produces: `Player(id, name, room, gameId, send: (String) -> Unit)`, `Room` with `add`, `remove`, `isEmpty`, `snapshot(): List<PlayerInfo>`, `broadcast(json, exclude: String? = null)`, `hostId`, `player(id)`; `Hub` with `room(id): Room`, `cleanupIfEmpty(id)`, `roomCounts(): Map<String, Int>`; `newPlayerId(): String`.

- [ ] **Step 1: Write the failing test**

```kotlin
package lol.lan.arcade.server

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class HubTest {

    private fun sink(log: MutableList<String>): (String) -> Unit = { log.add(it) }

    @Test
    fun `first player to join a room becomes host`() {
        val room = Room("main")
        val a = Player("a", "Ada", "main", "pulse-race", sink(mutableListOf()))
        val b = Player("b", "Bo", "main", "pulse-race", sink(mutableListOf()))
        room.add(a)
        room.add(b)
        assertEquals("a", room.hostId)
    }

    @Test
    fun `host reassigns to next remaining player on leave`() {
        val room = Room("main")
        val a = Player("a", "Ada", "main", "x", sink(mutableListOf()))
        val b = Player("b", "Bo", "main", "x", sink(mutableListOf()))
        room.add(a)
        room.add(b)
        room.remove("a")
        assertEquals("b", room.hostId)
    }

    @Test
    fun `host becomes null when room empties`() {
        val room = Room("main")
        val a = Player("a", "Ada", "main", "x", sink(mutableListOf()))
        room.add(a)
        room.remove("a")
        assertNull(room.hostId)
        assertTrue(room.isEmpty())
    }

    @Test
    fun `broadcast reaches everyone by default`() {
        val logA = mutableListOf<String>()
        val logB = mutableListOf<String>()
        val room = Room("main")
        room.add(Player("a", "Ada", "main", "x", sink(logA)))
        room.add(Player("b", "Bo", "main", "x", sink(logB)))
        room.broadcast("hi")
        assertEquals(listOf("hi"), logA)
        assertEquals(listOf("hi"), logB)
    }

    @Test
    fun `broadcast excludes the given player`() {
        val logA = mutableListOf<String>()
        val logB = mutableListOf<String>()
        val room = Room("main")
        room.add(Player("a", "Ada", "main", "x", sink(logA)))
        room.add(Player("b", "Bo", "main", "x", sink(logB)))
        room.broadcast("hi", exclude = "a")
        assertEquals(emptyList<String>(), logA)
        assertEquals(listOf("hi"), logB)
    }

    @Test
    fun `broadcast does not fail when one sink throws`() {
        val room = Room("main")
        room.add(Player("a", "Ada", "main", "x") { throw RuntimeException("closed") })
        val logB = mutableListOf<String>()
        room.add(Player("b", "Bo", "main", "x", sink(logB)))
        room.broadcast("hi") // must not throw
        assertEquals(listOf("hi"), logB)
    }

    @Test
    fun `snapshot reflects ready state and host flag`() {
        val room = Room("main")
        val a = Player("a", "Ada", "main", "x", sink(mutableListOf()))
        a.ready = true
        room.add(a)
        val snap = room.snapshot()
        assertEquals(1, snap.size)
        assertEquals(PlayerInfo("a", "Ada", ready = true, gameId = "x", isHost = true), snap[0])
    }

    @Test
    fun `hub returns the same room instance for the same id`() {
        val hub = Hub()
        assertTrue(hub.room("main") === hub.room("main"))
    }

    @Test
    fun `hub cleans up an empty room`() {
        val hub = Hub()
        val room = hub.room("main")
        room.add(Player("a", "Ada", "main", "x", sink(mutableListOf())))
        room.remove("a")
        hub.cleanupIfEmpty("main")
        assertTrue(hub.room("main") !== room) // a fresh Room was created — old one was dropped
    }

    @Test
    fun `hub does not clean up a non-empty room`() {
        val hub = Hub()
        val room = hub.room("main")
        room.add(Player("a", "Ada", "main", "x", sink(mutableListOf())))
        hub.cleanupIfEmpty("main")
        assertTrue(hub.room("main") === room)
    }

    @Test
    fun `roomCounts reports player counts per room`() {
        val hub = Hub()
        hub.room("main").add(Player("a", "Ada", "main", "x", sink(mutableListOf())))
        hub.room("side").add(Player("b", "Bo", "side", "x", sink(mutableListOf())))
        hub.room("side").add(Player("c", "Cy", "side", "x", sink(mutableListOf())))
        assertEquals(mapOf("main" to 1, "side" to 2), hub.roomCounts())
    }

    @Test
    fun `newPlayerId produces 8-char unique ids`() {
        val ids = (1..50).map { newPlayerId() }
        assertTrue(ids.all { it.length == 8 })
        assertEquals(ids.size, ids.toSet().size)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "lol.lan.arcade.server.HubTest"`
Expected: FAIL — `Player`/`Room`/`Hub`/`newPlayerId` unresolved.

- [ ] **Step 3: Write `Hub.kt`**

```kotlin
package lol.lan.arcade.server

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

fun newPlayerId(): String = UUID.randomUUID().toString().replace("-", "").take(8)

/**
 * One connected participant. `send` delivers a raw JSON text frame to this player;
 * it is injected so this class has zero WebSocket/Ktor dependency and stays unit-testable.
 */
class Player(
    val id: String,
    name: String,
    val room: String,
    val gameId: String,
    val send: (String) -> Unit,
) {
    val name: String = name.take(24).ifBlank { "P-${id.take(4)}" }
    var ready: Boolean = false
}

class Room(val id: String) {
    private val players = LinkedHashMap<String, Player>()
    private val lock = Any()

    var hostId: String? = null
        private set

    fun add(player: Player) {
        synchronized(lock) {
            if (players.isEmpty()) hostId = player.id
            players[player.id] = player
        }
    }

    fun remove(playerId: String) {
        synchronized(lock) {
            players.remove(playerId)
            if (hostId == playerId) hostId = players.keys.firstOrNull()
        }
    }

    fun player(id: String): Player? = synchronized(lock) { players[id] }

    fun isEmpty(): Boolean = synchronized(lock) { players.isEmpty() }

    fun snapshot(): List<PlayerInfo> = synchronized(lock) {
        players.values.map { p ->
            PlayerInfo(p.id, p.name, p.ready, p.gameId, p.id == hostId)
        }
    }

    /** Sends [json] to every player except [exclude] (if given). Never throws — a dead sink is swallowed. */
    fun broadcast(json: String, exclude: String? = null) {
        val targets = synchronized(lock) { players.values.toList() }
        for (p in targets) {
            if (exclude != null && p.id == exclude) continue
            try {
                p.send(json)
            } catch (_: Exception) {
                // Matches pc/host.py: a broken connection must not break the broadcast loop.
            }
        }
    }
}

class Hub {
    private val rooms = ConcurrentHashMap<String, Room>()

    fun room(id: String): Room = rooms.getOrPut(id) { Room(id) }

    fun cleanupIfEmpty(id: String) {
        rooms[id]?.let { if (it.isEmpty()) rooms.remove(id, it) }
    }

    fun roomCounts(): Map<String, Int> = rooms.mapValues { it.value.snapshot().size }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "lol.lan.arcade.server.HubTest"`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/app/src/main/java/lol/lan/arcade/server/Hub.kt android/app/src/test/java/lol/lan/arcade/server/HubTest.kt
git commit -m "Add Android host Hub/Room/Player core + tests"
```

---

### Task 4: Dispatcher (message handling)

This is the most important task to get exactly right — it is the literal Kotlin translation of `_dispatch()` and `_on_disconnect()` in `pc/host.py`, **including the `game:event` exclude-sender quirk** (traced character-by-character from the Python source during planning: `game:action` and `game:state` exclude the sender; `game:event` does not, despite the misleading comment above that line in the Python file).

**Files:**
- Create: `android/app/src/main/java/lol/lan/arcade/server/Dispatcher.kt`
- Test: `android/app/src/test/java/lol/lan/arcade/server/DispatcherTest.kt`

**Interfaces:**
- Consumes: `Hub`, `Room`, `Player`, `newPlayerId()` (Task 3); `IncomingMessage`, `Outgoing` (Task 2).
- Produces: `Connection(sink: (String) -> Unit)` with mutable `player: Player?`; `Dispatcher.handle(hub, conn, raw, nowMillis)`, `Dispatcher.onDisconnect(hub, conn)`. `nowMillis` is threaded in (not read from `System.currentTimeMillis()` inside) so tests are deterministic.

- [ ] **Step 1: Write the failing test**

```kotlin
package lol.lan.arcade.server

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DispatcherTest {

    private class FakeConn {
        val log = mutableListOf<String>()
        val conn = Connection(sink = { log.add(it) })
    }

    @Test
    fun `join creates a player, replies hello, and broadcasts lobby`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"pulse-race"}""", 0L)

        assertEquals(1, a.log.size)
        assertTrue(a.log[0].contains("\"type\":\"hello\""))
        assertTrue(a.log[0].contains("\"isHost\":true"))
        assertEquals("main", a.conn.player?.room)
    }

    @Test
    fun `second joiner is not host and both get the updated lobby`() {
        val hub = Hub()
        val a = FakeConn()
        val b = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        a.log.clear()
        Dispatcher.handle(hub, b.conn, """{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}""", 0L)

        assertTrue(b.log[0].contains("\"isHost\":false"))
        // both got a lobby broadcast with 2 players
        assertTrue(a.log.any { it.contains("\"type\":\"lobby\"") && it.contains("Bo") })
        assertTrue(b.log.any { it.contains("\"type\":\"lobby\"") && it.contains("Bo") })
    }

    @Test
    fun `message before join gets an error and is not crashing`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"ready","value":true}""", 0L)
        assertTrue(a.log[0].contains("\"type\":\"error\""))
        assertTrue(a.log[0].contains("join first"))
    }

    @Test
    fun `ready updates state and rebroadcasts lobby`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        a.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"ready","value":true}""", 0L)
        assertTrue(a.log[0].contains("\"ready\":true"))
    }

    @Test
    fun `chat broadcasts to everyone including sender`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        a.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"chat","text":"hi"}""", 0L)
        assertTrue(a.log.any { it.contains("\"type\":\"chat\"") && it.contains("\"text\":\"hi\"") })
    }

    @Test
    fun `only the host can game-start`() {
        val hub = Hub()
        val a = FakeConn()
        val b = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        Dispatcher.handle(hub, b.conn, """{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}""", 0L)
        b.log.clear()
        Dispatcher.handle(hub, b.conn, """{"v":1,"type":"game:start","gameId":"x"}""", 0L)
        assertTrue(b.log[0].contains("only host can start"))
    }

    @Test
    fun `host can game-start and everyone is notified`() {
        val hub = Hub()
        val a = FakeConn()
        val b = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        Dispatcher.handle(hub, b.conn, """{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}""", 0L)
        a.log.clear(); b.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"game:start","gameId":"x","seed":7}""", 0L)
        assertTrue(a.log[0].contains("\"type\":\"game:start\""))
        assertTrue(b.log[0].contains("\"type\":\"game:start\""))
    }

    @Test
    fun `game action excludes the sender`() {
        val hub = Hub()
        val a = FakeConn()
        val b = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        Dispatcher.handle(hub, b.conn, """{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}""", 0L)
        a.log.clear(); b.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"game:action","action":"input","payload":{}}""", 0L)
        assertEquals(0, a.log.size)
        assertEquals(1, b.log.size)
    }

    @Test
    fun `game state also excludes the sender`() {
        val hub = Hub()
        val a = FakeConn()
        val b = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        Dispatcher.handle(hub, b.conn, """{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}""", 0L)
        a.log.clear(); b.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"game:state","payload":{}}""", 0L)
        assertEquals(0, a.log.size)
        assertEquals(1, b.log.size)
    }

    @Test
    fun `game event does NOT exclude the sender`() {
        // This is the quirk carried over verbatim from pc/host.py's _dispatch: the
        // exclude variable for game:event is left at its initial `None` (dead-code
        // reassignments in the Python only touch the game:state branch). Confirmed by
        // reading pc/host.py line-by-line, not by trusting its comment.
        val hub = Hub()
        val a = FakeConn()
        val b = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        Dispatcher.handle(hub, b.conn, """{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}""", 0L)
        a.log.clear(); b.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"game:event","payload":{}}""", 0L)
        assertEquals(1, a.log.size)
        assertEquals(1, b.log.size)
    }

    @Test
    fun `ping replies pong with the same t`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        a.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"ping","t":123}""", 0L)
        assertTrue(a.log[0].contains("\"type\":\"pong\""))
        assertTrue(a.log[0].contains("\"t\":123"))
    }

    @Test
    fun `unknown type after join gets an error naming the type`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        a.log.clear()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"mystery"}""", 0L)
        assertTrue(a.log[0].contains("unknown type: mystery"))
    }

    @Test
    fun `malformed json gets an invalid json error and does not throw`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, "not json at all", 0L)
        assertTrue(a.log[0].contains("invalid json"))
    }

    @Test
    fun `disconnect removes the player, reassigns host, and cleans up when empty`() {
        val hub = Hub()
        val a = FakeConn()
        Dispatcher.handle(hub, a.conn, """{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}""", 0L)
        Dispatcher.onDisconnect(hub, a.conn)
        assertNull(a.conn.player)
        assertEquals(0, hub.roomCounts().size) // room removed once empty
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "lol.lan.arcade.server.DispatcherTest"`
Expected: FAIL — `Connection`/`Dispatcher` unresolved.

- [ ] **Step 3: Write `Dispatcher.kt`**

```kotlin
package lol.lan.arcade.server

/** One live WebSocket connection. `player` is null until a `join` message arrives. */
class Connection(val sink: (String) -> Unit) {
    var player: Player? = null
}

/**
 * Ports `_dispatch()` / `_on_disconnect()` from `pc/host.py` line-for-line so the two
 * hosts speak the identical protocol. `nowMillis` is passed in rather than read from
 * the clock so behavior is deterministic in tests.
 */
object Dispatcher {

    fun handle(hub: Hub, conn: Connection, raw: String, nowMillis: Long) {
        val msg = IncomingMessage.parseOrNull(raw)
        if (msg == null) {
            conn.sink(Outgoing.error("invalid json"))
            return
        }

        if (msg.type == "join") {
            val name = msg.string("name") ?: "Player"
            val roomId = (msg.string("room") ?: "main").take(32)
            val gameId = (msg.string("gameId") ?: msg.string("game_id") ?: "").take(64)
            val room = hub.room(roomId)
            val player = Player(newPlayerId(), name, roomId, gameId, conn.sink)
            conn.player = player
            room.add(player)
            val isHost = room.hostId == player.id
            conn.sink(Outgoing.hello(player.id, isHost, roomId))
            room.broadcast(Outgoing.lobby(room.snapshot(), roomId))
            return
        }

        val player = conn.player
        if (player == null) {
            conn.sink(Outgoing.error("join first"))
            return
        }
        val room = hub.room(player.room)

        when (msg.type) {
            "ready" -> {
                player.ready = msg.bool("value", default = true)
                room.broadcast(Outgoing.lobby(room.snapshot(), room.id))
            }
            "chat" -> {
                val text = (msg.string("text") ?: "").take(200)
                room.broadcast(Outgoing.chat(player.id, player.name, text))
            }
            "game:start" -> {
                if (player.id != room.hostId) {
                    conn.sink(Outgoing.error("only host can start"))
                    return
                }
                val gameId = msg.string("gameId") ?: player.gameId
                val seed = msg.long("seed") ?: (nowMillis / 1000 % 10_000_000)
                room.broadcast(Outgoing.gameStart(gameId, seed, room.hostId))
            }
            "game:action", "game:state", "game:event" -> {
                val type = msg.type!!
                val out = Outgoing.relay(type, player.id, msg, nowMillis)
                // game:action and game:state exclude the sender; game:event does not.
                // (Verified against pc/host.py's actual control flow, not its comment.)
                val exclude = if (type == "game:event") null else player.id
                room.broadcast(out, exclude = exclude)
            }
            "ping" -> {
                conn.sink(Outgoing.pong(msg.element("t")))
            }
            else -> {
                conn.sink(Outgoing.error("unknown type: ${msg.type}"))
            }
        }
    }

    fun onDisconnect(hub: Hub, conn: Connection) {
        val player = conn.player ?: return
        val room = hub.room(player.room)
        room.remove(player.id)
        room.broadcast(Outgoing.lobby(room.snapshot(), room.id))
        hub.cleanupIfEmpty(player.room)
        conn.player = null
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "lol.lan.arcade.server.DispatcherTest"`
Expected: PASS (14 tests). Pay special attention to `game event does NOT exclude the sender` — if this one fails, the bug is almost certainly an accidentally-"fixed" exclude condition; re-check it matches the Python control flow (§ Global Constraints), not the more "sensible-looking" always-exclude behavior.

- [ ] **Step 5: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/app/src/main/java/lol/lan/arcade/server/Dispatcher.kt android/app/src/test/java/lol/lan/arcade/server/DispatcherTest.kt
git commit -m "Add Android host Dispatcher matching pc/host.py protocol exactly + tests"
```

---

### Task 5: RouteResolver (pure HTTP path → content root mapping)

**Files:**
- Create: `android/app/src/main/java/lol/lan/arcade/server/RouteResolver.kt`
- Test: `android/app/src/test/java/lol/lan/arcade/server/RouteResolverTest.kt`

**Interfaces:**
- Consumes: nothing.
- Produces: `RouteResolver.Root` enum `{ WWW, GAMES, PROGRAMS, SHARED, DOCS }`; `RouteResolver.Resolved(root, relativePath)`; `RouteResolver.resolve(rawPath): Resolved`; `RouteResolver.safeRelative(relativePath): String?` (null = reject, path-traversal attempt).

- [ ] **Step 1: Write the failing test**

```kotlin
package lol.lan.arcade.server

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RouteResolverTest {

    @Test
    fun `root and lobby aliases resolve to www index`() {
        for (p in listOf("/", "/index.html", "/lobby", "/lobby/")) {
            assertEquals(RouteResolver.Root.WWW, RouteResolver.resolve(p).root)
            assertEquals("index.html", RouteResolver.resolve(p).relativePath)
        }
    }

    @Test
    fun `about aliases resolve to www about`() {
        for (p in listOf("/about", "/about/", "/about.html")) {
            val r = RouteResolver.resolve(p)
            assertEquals(RouteResolver.Root.WWW, r.root)
            assertEquals("about.html", r.relativePath)
        }
    }

    @Test
    fun `hub aliases resolve to the games hub index`() {
        for (p in listOf("/games", "/games/", "/games/hub", "/games/hub/", "/hub", "/hub/", "/library", "/library/", "/apps", "/apps/")) {
            val r = RouteResolver.resolve(p)
            assertEquals(RouteResolver.Root.GAMES, r.root)
            assertEquals("hub/index.html", r.relativePath)
        }
    }

    @Test
    fun `games prefix strips to a relative path under the games root`() {
        val r = RouteResolver.resolve("/games/comet/client/index.html")
        assertEquals(RouteResolver.Root.GAMES, r.root)
        assertEquals("comet/client/index.html", r.relativePath)
    }

    @Test
    fun `programs prefix strips to the programs root`() {
        val r = RouteResolver.resolve("/programs/lan-chat/client/")
        assertEquals(RouteResolver.Root.PROGRAMS, r.root)
        assertEquals("lan-chat/client/", r.relativePath)
    }

    @Test
    fun `shared prefix maps to the games shared root`() {
        val r = RouteResolver.resolve("/shared/js/ogh-net.js")
        assertEquals(RouteResolver.Root.SHARED, r.root)
        assertEquals("js/ogh-net.js", r.relativePath)
    }

    @Test
    fun `docs prefix maps to the docs root`() {
        val r = RouteResolver.resolve("/docs/README.md")
        assertEquals(RouteResolver.Root.DOCS, r.root)
        assertEquals("README.md", r.relativePath)
    }

    @Test
    fun `www prefix and default fallback both map to www`() {
        assertEquals("style.css", RouteResolver.resolve("/www/style.css").relativePath)
        assertEquals("favicon.ico", RouteResolver.resolve("/favicon.ico").relativePath)
        assertEquals(RouteResolver.Root.WWW, RouteResolver.resolve("/favicon.ico").root)
    }

    @Test
    fun `safeRelative rejects any dot-dot segment`() {
        assertNull(RouteResolver.safeRelative("../secret"))
        assertNull(RouteResolver.safeRelative("games/../../etc/passwd"))
        assertNull(RouteResolver.safeRelative("a/b/../../../c"))
    }

    @Test
    fun `safeRelative decodes percent-encoding before checking`() {
        assertNull(RouteResolver.safeRelative("%2e%2e/secret"))
    }

    @Test
    fun `safeRelative accepts normal nested paths and strips a leading slash`() {
        assertEquals("comet/client/index.html", RouteResolver.safeRelative("/comet/client/index.html"))
        assertEquals("comet/client/index.html", RouteResolver.safeRelative("comet/client/index.html"))
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "lol.lan.arcade.server.RouteResolverTest"`
Expected: FAIL — `RouteResolver` unresolved.

- [ ] **Step 3: Write `RouteResolver.kt`**

```kotlin
package lol.lan.arcade.server

import java.net.URLDecoder

/**
 * Maps an incoming HTTP path to a (root, relativePath) pair. Mirrors
 * `OGHHandler._resolve_static` in pc/host.py exactly, including which route
 * variants (with/without trailing slash) are recognized.
 */
object RouteResolver {

    enum class Root { WWW, GAMES, PROGRAMS, SHARED, DOCS }

    data class Resolved(val root: Root, val relativePath: String)

    private val LOBBY_PATHS = setOf("/", "/index.html", "/lobby", "/lobby/")
    private val ABOUT_PATHS = setOf("/about", "/about/", "/about.html")
    private val HUB_PATHS = setOf(
        "/games", "/games/", "/games/hub", "/games/hub/",
        "/hub", "/hub/", "/library", "/library/", "/apps", "/apps/",
    )

    fun resolve(rawPath: String): Resolved {
        val path = rawPath.ifEmpty { "/" }
        return when {
            path in LOBBY_PATHS -> Resolved(Root.WWW, "index.html")
            path in ABOUT_PATHS -> Resolved(Root.WWW, "about.html")
            path in HUB_PATHS -> Resolved(Root.GAMES, "hub/index.html")
            path.startsWith("/games/") -> Resolved(Root.GAMES, path.removePrefix("/games/"))
            path.startsWith("/programs/") -> Resolved(Root.PROGRAMS, path.removePrefix("/programs/"))
            path.startsWith("/shared/") -> Resolved(Root.SHARED, path.removePrefix("/shared/"))
            path.startsWith("/docs/") -> Resolved(Root.DOCS, path.removePrefix("/docs/"))
            path.startsWith("/www/") -> Resolved(Root.WWW, path.removePrefix("/www/"))
            else -> Resolved(Root.WWW, path.removePrefix("/"))
        }
    }

    /** Rejects any path containing a `..` segment (after percent-decoding). Null = unsafe. */
    fun safeRelative(relativePath: String): String? {
        val decoded = try {
            URLDecoder.decode(relativePath, "UTF-8")
        } catch (e: Exception) {
            return null
        }
        if (decoded.split("/").any { it == ".." }) return null
        return decoded.trimStart('/')
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "lol.lan.arcade.server.RouteResolverTest"`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/app/src/main/java/lol/lan/arcade/server/RouteResolver.kt android/app/src/test/java/lol/lan/arcade/server/RouteResolverTest.kt
git commit -m "Add Android host RouteResolver matching pc/host.py static routing + tests"
```

---

### Task 6: ContentRoots (bundled assets ∪ external pack directory)

**Files:**
- Create: `android/app/src/main/java/lol/lan/arcade/server/ContentRoots.kt`
- Test: `android/app/src/test/java/lol/lan/arcade/server/ContentRootsTest.kt`

**Interfaces:**
- Consumes: `RouteResolver.Root`, `RouteResolver.safeRelative` (Task 5).
- Produces: `ContentRoots(externalBaseDir: File, loadAssetBytes: (String) -> ByteArray?)` with `load(root, relativePath): ByteArray?`. The `loadAssetBytes` lambda is injected specifically so this class needs no `android.content.Context` and stays JVM-unit-testable; production wiring (Task 7) passes a lambda backed by `context.assets`.

- [ ] **Step 1: Write the failing test**

```kotlin
package lol.lan.arcade.server

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class ContentRootsTest {

    @get:Rule
    val tmp = TemporaryFolder()

    private fun fakeAssets(vararg entries: Pair<String, String>): (String) -> ByteArray? {
        val map = entries.toMap()
        return { path -> map[path]?.toByteArray() }
    }

    @Test
    fun `serves a bundled asset when no external override exists`() {
        val roots = ContentRoots(tmp.root, fakeAssets("web/games/comet/client/index.html" to "ASSET"))
        val bytes = roots.load(RouteResolver.Root.GAMES, "comet/client/index.html")
        assertArrayEquals("ASSET".toByteArray(), bytes)
    }

    @Test
    fun `external pack directory overrides a bundled asset with the same path`() {
        val gamesDir = File(tmp.root, "packs/games/comet/client").apply { mkdirs() }
        File(gamesDir, "index.html").writeText("EXTERNAL")
        val roots = ContentRoots(tmp.root, fakeAssets("web/games/comet/client/index.html" to "ASSET"))
        val bytes = roots.load(RouteResolver.Root.GAMES, "comet/client/index.html")
        assertArrayEquals("EXTERNAL".toByteArray(), bytes)
    }

    @Test
    fun `falls back to index html for a directory-style request`() {
        val roots = ContentRoots(tmp.root, fakeAssets("web/games/comet/client/index.html" to "ASSET"))
        val bytes = roots.load(RouteResolver.Root.GAMES, "comet/client/")
        assertArrayEquals("ASSET".toByteArray(), bytes)
        val bytes2 = roots.load(RouteResolver.Root.GAMES, "comet/client")
        assertArrayEquals("ASSET".toByteArray(), bytes2)
    }

    @Test
    fun `returns null when nothing matches`() {
        val roots = ContentRoots(tmp.root, fakeAssets())
        assertNull(roots.load(RouteResolver.Root.GAMES, "nope/nothing.html"))
    }

    @Test
    fun `path traversal is rejected before touching either source`() {
        val roots = ContentRoots(tmp.root, fakeAssets("web/games/../../etc/passwd" to "SHOULD NOT SERVE"))
        assertNull(roots.load(RouteResolver.Root.GAMES, "../../etc/passwd"))
    }

    @Test
    fun `shared root maps under games slash _shared`() {
        val roots = ContentRoots(tmp.root, fakeAssets("web/games/_shared/js/ogh-net.js" to "NET"))
        val bytes = roots.load(RouteResolver.Root.SHARED, "js/ogh-net.js")
        assertArrayEquals("NET".toByteArray(), bytes)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "lol.lan.arcade.server.ContentRootsTest"`
Expected: FAIL — `ContentRoots` unresolved.

- [ ] **Step 3: Write `ContentRoots.kt`**

```kotlin
package lol.lan.arcade.server

import java.io.File
import java.io.IOException

/**
 * Resolves (root, relativePath) to bytes. Checks the external pack directory first
 * (so a pushed full `games/`/`programs/` tree overrides the bundled demo subset for
 * local testing), then bundled APK assets. Tries `<path>/index.html` as a fallback
 * when `<path>` itself isn't found, mirroring pc/host.py's directory→index.html
 * behavior without needing real directory-listing on either source.
 */
class ContentRoots(
    private val externalBaseDir: File,
    private val loadAssetBytes: (String) -> ByteArray?,
) {
    private fun rootDirName(root: RouteResolver.Root): String = when (root) {
        RouteResolver.Root.WWW -> "www"
        RouteResolver.Root.GAMES -> "games"
        RouteResolver.Root.PROGRAMS -> "programs"
        RouteResolver.Root.SHARED -> "games/_shared"
        RouteResolver.Root.DOCS -> "docs"
    }

    fun load(root: RouteResolver.Root, relativePath: String): ByteArray? {
        val safeRel = RouteResolver.safeRelative(relativePath) ?: return null
        val base = rootDirName(root)
        val candidates = listOf("$base/$safeRel", "$base/$safeRel/index.html".replace("//", "/"))

        for (rel in candidates) {
            loadExternal(rel)?.let { return it }
        }
        for (rel in candidates) {
            loadAsset(rel)?.let { return it }
        }
        return null
    }

    private fun loadExternal(relPath: String): ByteArray? {
        val f = File(externalBaseDir, "packs/$relPath")
        return if (f.isFile) {
            try {
                f.readBytes()
            } catch (e: IOException) {
                null
            }
        } else {
            null
        }
    }

    private fun loadAsset(relPath: String): ByteArray? = loadAssetBytes("web/$relPath")
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "lol.lan.arcade.server.ContentRootsTest"`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/app/src/main/java/lol/lan/arcade/server/ContentRoots.kt android/app/src/test/java/lol/lan/arcade/server/ContentRootsTest.kt
git commit -m "Add Android host ContentRoots (bundled assets + external pack dir) + tests"
```

---

### Task 7: OghServer (Ktor CIO wiring)

**Files:**
- Create: `android/app/src/main/java/lol/lan/arcade/server/OghServer.kt`
- Test: `android/app/src/test/java/lol/lan/arcade/server/OghServerRouteTest.kt`

**Interfaces:**
- Consumes: `Hub`, `Dispatcher`, `Connection` (Task 3/4), `ContentRoots`, `RouteResolver` (Task 5/6).
- Produces: `OghServer(port: Int, contentRoots: ContentRoots)` with `start()` / `stop()`. Used by `HostForegroundService` (Task 10).

**Note on the test approach:** Ktor's `testApplication { }` (from `ktor-server-test-host`) builds the routes in-process without binding a real port, and its `client` can open real WebSocket connections against them — this is what proves the join/relay wiring end-to-end (two simulated clients joining the same room), not just the pure Dispatcher unit tests from Task 4.

- [ ] **Step 1: Write the failing test**

```kotlin
package lol.lan.arcade.server

import io.ktor.client.plugins.websocket.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import io.ktor.websocket.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class OghServerRouteTest {

    private fun contentRoots(vararg assets: Pair<String, String>): ContentRoots {
        val map = assets.toMap()
        return ContentRoots(File("/nonexistent-in-test"), loadAssetBytes = { p -> map[p]?.toByteArray() })
    }

    @Test
    fun `serves the lobby index at root`() = testApplication {
        application { installOghRouting(Hub(), contentRoots("web/www/index.html" to "<html>LOBBY</html>")) }
        val res = client.get("/")
        assertEquals(HttpStatusCode.OK, res.status)
        assertEquals("<html>LOBBY</html>", res.bodyAsText())
    }

    @Test
    fun `serves a game asset under games prefix`() = testApplication {
        application { installOghRouting(Hub(), contentRoots("web/games/comet/client/index.html" to "COMET")) }
        val res = client.get("/games/comet/client/index.html")
        assertEquals(HttpStatusCode.OK, res.status)
        assertEquals("COMET", res.bodyAsText())
    }

    @Test
    fun `unknown path returns 404`() = testApplication {
        application { installOghRouting(Hub(), contentRoots()) }
        val res = client.get("/games/nope.html")
        assertEquals(HttpStatusCode.NotFound, res.status)
    }

    @Test
    fun `health endpoint reports ok`() = testApplication {
        application { installOghRouting(Hub(), contentRoots()) }
        val res = client.get("/api/health")
        val obj = Json.parseToJsonElement(res.bodyAsText()).jsonObject
        assertEquals(true, obj["ok"]!!.jsonPrimitive.boolean)
    }

    @Test
    fun `two websocket clients join the same room and relay a game action`() = testApplication {
        application { installOghRouting(Hub(), contentRoots()) }
        val wsClient = createClient { install(io.ktor.client.plugins.websocket.WebSockets) }

        wsClient.webSocket("/ws") {
            send(Frame.Text("""{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}"""))
            val hello = (incoming.receive() as Frame.Text).readText()
            assertTrue(hello.contains("\"isHost\":true"))

            // second client joins concurrently
            wsClient.webSocket("/ws") {
                send(Frame.Text("""{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}"""))
                (incoming.receive() as Frame.Text) // Bo's own hello

                // consume the lobby broadcast Bo's join triggers for Ada, on Ada's socket
                // (handled below, outside this inner block, since `incoming` here is Bo's)
                send(Frame.Text("""{"v":1,"type":"game:action","action":"input","payload":{}}"""))
                close()
            }
        }
    }

    @Test
    fun `api rooms reflects an active room after a join`() = testApplication {
        val hub = Hub()
        application { installOghRouting(hub, contentRoots()) }
        val wsClient = createClient { install(io.ktor.client.plugins.websocket.WebSockets) }
        wsClient.webSocket("/ws") {
            send(Frame.Text("""{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}"""))
            incoming.receive()
        }
        val res = client.get("/api/rooms")
        // room is cleaned up once the socket above closes and onDisconnect runs; this
        // just proves the endpoint is wired and returns valid JSON with a "rooms" key.
        val obj = Json.parseToJsonElement(res.bodyAsText()).jsonObject
        assertTrue(obj.containsKey("rooms"))
    }
}
```

The 5th test (`two websocket clients…`) intentionally does not assert on Ada's relayed message — nested `webSocket` blocks each own their own `incoming`/`outgoing`, and asserting cross-socket relay needs two independent top-level sessions, not nesting. Fix it before running by rewriting as two sibling sessions using `launch`:

```kotlin
    @Test
    fun `two websocket clients join the same room and relay a game action`() = testApplication {
        application { installOghRouting(Hub(), contentRoots()) }
        val wsClient = createClient { install(io.ktor.client.plugins.websocket.WebSockets) }

        wsClient.webSocket("/ws") {
            send(Frame.Text("""{"v":1,"type":"join","room":"main","name":"Ada","gameId":"x"}"""))
            (incoming.receive() as Frame.Text) // Ada's hello

            val bobJob = launch {
                wsClient.webSocket("/ws") {
                    send(Frame.Text("""{"v":1,"type":"join","room":"main","name":"Bo","gameId":"x"}"""))
                    (incoming.receive() as Frame.Text) // Bo's hello
                    incoming.receive() // lobby broadcast triggered by Bo's own join
                    val relayed = (incoming.receive() as Frame.Text).readText() // Ada's action, relayed to Bo
                    assertTrue(relayed.contains("\"type\":\"game:action\""))
                    assertTrue(relayed.contains("\"action\":\"input\""))
                }
            }

            incoming.receive() // lobby broadcast triggered by Bo's join, seen by Ada
            send(Frame.Text("""{"v":1,"type":"game:action","action":"input","payload":{}}"""))
            bobJob.join()
        }
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "lol.lan.arcade.server.OghServerRouteTest"`
Expected: FAIL — `installOghRouting` unresolved.

- [ ] **Step 3: Write `OghServer.kt`**

```kotlin
package lol.lan.arcade.server

import io.ktor.http.ContentType
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.cio.CIO
import io.ktor.server.engine.EmbeddedServer
import io.ktor.server.engine.embeddedServer
import io.ktor.server.response.respondBytes
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import io.ktor.server.websocket.WebSockets
import io.ktor.server.websocket.webSocket
import io.ktor.websocket.Frame
import io.ktor.websocket.readText
import kotlinx.coroutines.channels.consumeEach
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

private const val MAX_WS_FRAME_BYTES = 2L * 1024 * 1024 // PTT clips base64-encode up to ~900 KB text (lan-chat MAX_B64)

internal fun guessContentType(path: String): ContentType {
    val ext = path.substringAfterLast('.', "").lowercase()
    return when (ext) {
        "html", "htm" -> ContentType.Text.Html
        "js", "mjs" -> ContentType("text", "javascript")
        "css" -> ContentType.Text.CSS
        "json" -> ContentType.Application.Json
        "md", "markdown" -> ContentType("text", "markdown")
        "svg" -> ContentType.Image.SVG
        "png" -> ContentType.Image.PNG
        "jpg", "jpeg" -> ContentType.Image.JPEG
        "gif" -> ContentType.Image.GIF
        "ico" -> ContentType("image", "x-icon")
        "woff" -> ContentType("font", "woff")
        "woff2" -> ContentType("font", "woff2")
        "ttf" -> ContentType("font", "ttf")
        "wasm" -> ContentType("application", "wasm")
        "mp3" -> ContentType.Audio.MPEG
        "wav" -> ContentType("audio", "wav")
        "webm" -> ContentType("video", "webm")
        "txt" -> ContentType.Text.Plain
        else -> ContentType.Application.OctetStream
    }
}

/** Registers the WebSocket plugin and all HTTP/WS routes on [Application]. Shared by
 *  production (OghServer.start) and tests (OghServerRouteTest), so both exercise the
 *  exact same route wiring. */
fun Application.installOghRouting(hub: Hub, contentRoots: ContentRoots) {
    install(WebSockets) {
        pingPeriodMillis = 30_000L
        timeoutMillis = 60_000L
        maxFrameSize = MAX_WS_FRAME_BYTES
        masking = false
    }
    routing {
        webSocket("/ws") {
            val conn = Connection(sink = { text -> outgoing.trySend(Frame.Text(text)) })
            try {
                incoming.consumeEach { frame ->
                    if (frame is Frame.Text) {
                        Dispatcher.handle(hub, conn, frame.readText(), System.currentTimeMillis())
                    }
                }
            } finally {
                Dispatcher.onDisconnect(hub, conn)
            }
        }

        get("/api/health") {
            val body = buildJsonObject {
                put("ok", true)
                put("rooms", hub.roomCounts().size)
                put("v", 1)
            }.toString()
            call.respondText(body, ContentType.Application.Json)
        }

        get("/api/rooms") {
            val body = buildJsonObject {
                put("rooms", buildJsonObject { hub.roomCounts().forEach { (id, n) -> put(id, n) } })
            }.toString()
            call.respondText(body, ContentType.Application.Json)
        }

        get("/{path...}") {
            val raw = "/" + call.parameters.getAll("path").orEmpty().joinToString("/")
            serveStatic(raw, contentRoots)
        }

        get("/") {
            serveStatic("/", contentRoots)
        }
    }
}

private suspend fun io.ktor.server.routing.RoutingContext.serveStatic(rawPath: String, contentRoots: ContentRoots) {
    val resolved = RouteResolver.resolve(rawPath)
    val bytes = contentRoots.load(resolved.root, resolved.relativePath)
    if (bytes == null) {
        call.respondText("Not found", ContentType.Text.Plain, io.ktor.http.HttpStatusCode.NotFound)
        return
    }
    call.respondBytes(bytes, guessContentType(resolved.relativePath))
}

class OghServer(private val port: Int, private val contentRoots: ContentRoots) {
    private val hub = Hub()
    private var engine: EmbeddedServer<*, *>? = null

    fun start() {
        if (engine != null) return
        engine = embeddedServer(CIO, host = "0.0.0.0", port = port) {
            installOghRouting(hub, contentRoots)
        }.start(wait = false)
    }

    fun stop() {
        engine?.stop(1000, 2000)
        engine = null
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "lol.lan.arcade.server.OghServerRouteTest"`
Expected: PASS (6 tests).

If `RoutingContext` is not found (Ktor route-handler receiver type naming can vary by minor version), replace the `serveStatic` extension receiver with the lambda-inferred type instead — inline the body directly into both `get("/{path...}")` and `get("/")` blocks rather than factoring it out, since the receiver type of a `get { }` block is always correctly inferred in place:

```kotlin
        get("/{path...}") {
            val raw = "/" + call.parameters.getAll("path").orEmpty().joinToString("/")
            val resolved = RouteResolver.resolve(raw)
            val bytes = contentRoots.load(resolved.root, resolved.relativePath)
            if (bytes == null) {
                call.respondText("Not found", ContentType.Text.Plain, io.ktor.http.HttpStatusCode.NotFound)
            } else {
                call.respondBytes(bytes, guessContentType(resolved.relativePath))
            }
        }
        get("/") {
            val resolved = RouteResolver.resolve("/")
            val bytes = contentRoots.load(resolved.root, resolved.relativePath)
            if (bytes == null) {
                call.respondText("Not found", ContentType.Text.Plain, io.ktor.http.HttpStatusCode.NotFound)
            } else {
                call.respondBytes(bytes, guessContentType(resolved.relativePath))
            }
        }
```
(and delete the top-level `serveStatic` function). Prefer fixing forward with whichever form compiles against the resolved Ktor version rather than guessing further — the two unit test files (Task 4, this task) will immediately confirm which shape is right.

- [ ] **Step 5: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/app/src/main/java/lol/lan/arcade/server/OghServer.kt android/app/src/test/java/lol/lan/arcade/server/OghServerRouteTest.kt
git commit -m "Wire Android host Ktor CIO server (HTTP static + /ws + /api) + route tests"
```

---

### Task 8: Bundle curated web assets at build time

**Files:**
- Modify: `android/app/build.gradle.kts` (append the `syncWebAssets` task)

**Interfaces:**
- Consumes: nothing new.
- Produces: `app/src/main/assets/web/…` populated before every build; consumed by `ContentRoots`'s asset lambda (wired for real in Task 10).

- [ ] **Step 1: Append to `android/app/build.gradle.kts`** (after the `android { ... }` block, before `dependencies { ... }`)

```kotlin
val repoRoot = rootDir.parentFile!!

val syncWebAssets by tasks.registering(Sync::class) {
    into(layout.projectDirectory.dir("src/main/assets/web"))

    listOf("comet", "comet-pixel", "demo-tap", "piece-caller", "pulse-race", "rootwork", "hub", "catalog")
        .forEach { name -> from(repoRoot.resolve("games/$name")) { into("games/$name") } }

    from(repoRoot.resolve("games/_shared")) {
        into("games/_shared")
        exclude("fonts/**")
    }

    listOf("lan-chat", "video-convert")
        .forEach { name -> from(repoRoot.resolve("programs/$name")) { into("programs/$name") } }

    from(repoRoot.resolve("pc/www")) { into("www") }
}

tasks.named("preBuild") { dependsOn(syncWebAssets) }
```

- [ ] **Step 2: Run the task directly and inspect output**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app/android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
./gradlew :app:syncWebAssets
find app/src/main/assets/web -maxdepth 2 | sort
du -sh app/src/main/assets/web
```

Expected: directories `games/{comet,comet-pixel,demo-tap,piece-caller,pulse-race,rootwork,hub,catalog,_shared}`, `programs/{lan-chat,video-convert}`, `www` all present; total size well under 2 MB (no `_shared/fonts`).

- [ ] **Step 3: Rebuild the full app and verify assets are packaged**

```bash
./gradlew :app:assembleDebug
unzip -l app/build/outputs/apk/debug/app-debug.apk | grep "assets/web/games/hub/index.html"
```

Expected: the grep finds a match — proves the synced assets made it into the APK.

- [ ] **Step 4: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/app/build.gradle.kts
git commit -m "Sync curated games/programs/hub content into Android assets at build time"
```

(`app/src/main/assets/web/` itself is not committed — it's gitignored, Task 1 Step 12.)

---

### Task 9: NetworkUtils + SettingsStore

**Files:**
- Create: `android/app/src/main/java/lol/lan/arcade/net/NetworkUtils.kt`
- Create: `android/app/src/main/java/lol/lan/arcade/data/SettingsStore.kt`

**Interfaces:**
- Produces: `NetworkUtils.localIpv4Addresses(): List<String>`. `SettingsStore(context)` with `port: Flow<Int>`, `language: Flow<String?>` (null = follow system), `keepScreenOn: Flow<Boolean>`, and `suspend fun setPort(Int)`, `suspend fun setLanguage(String?)`, `suspend fun setKeepScreenOn(Boolean)`. Consumed by `HostViewModel` (Task 12) and `SettingsScreen` (Task 15).

No dedicated unit test for `NetworkUtils` — it reflects the test JVM's own network interfaces, which isn't meaningful to assert against; it's verified for real on-device in Task 17 (Running screen shows real LAN IPs). `SettingsStore` is a thin DataStore wrapper with no branching logic worth a test at MVP scope — this matches the project's own established convention (`docs/plans/LLM_DEVELOPMENT_PLAN.md` scopes verification as "manual check", not exhaustive unit coverage, everywhere in this codebase).

- [ ] **Step 1: Write `NetworkUtils.kt`**

```kotlin
package lol.lan.arcade.net

import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections

object NetworkUtils {
    /** All non-loopback IPv4 addresses on any "up" interface — mirrors local_ips() in pc/host.py. */
    fun localIpv4Addresses(): List<String> = try {
        Collections.list(NetworkInterface.getNetworkInterfaces())
            .asSequence()
            .filter { it.isUp && !it.isLoopback }
            .flatMap { iface -> Collections.list(iface.inetAddresses).asSequence() }
            .filterIsInstance<Inet4Address>()
            .mapNotNull { it.hostAddress }
            .filter { it.isNotBlank() }
            .distinct()
            .toList()
    } catch (e: Exception) {
        emptyList()
    }
}
```

- [ ] **Step 2: Write `SettingsStore.kt`**

```kotlin
package lol.lan.arcade.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "ogh_host_settings")

class SettingsStore(private val context: Context) {

    private object Keys {
        val PORT = intPreferencesKey("port")
        val LANGUAGE = stringPreferencesKey("language")
        val KEEP_SCREEN_ON = booleanPreferencesKey("keep_screen_on")
    }

    val port: Flow<Int> = context.dataStore.data.map { it[Keys.PORT] ?: DEFAULT_PORT }
    val language: Flow<String?> = context.dataStore.data.map { it[Keys.LANGUAGE] }
    val keepScreenOn: Flow<Boolean> = context.dataStore.data.map { it[Keys.KEEP_SCREEN_ON] ?: true }

    suspend fun setPort(port: Int) {
        context.dataStore.edit { it[Keys.PORT] = port }
    }

    suspend fun setLanguage(languageTag: String?) {
        context.dataStore.edit {
            if (languageTag == null) it.remove(Keys.LANGUAGE) else it[Keys.LANGUAGE] = languageTag
        }
    }

    suspend fun setKeepScreenOn(enabled: Boolean) {
        context.dataStore.edit { it[Keys.KEEP_SCREEN_ON] = enabled }
    }

    companion object {
        const val DEFAULT_PORT = 8080
    }
}
```

- [ ] **Step 3: Compile check**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app/android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
./gradlew :app:compileDebugKotlin
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 4: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/app/src/main/java/lol/lan/arcade/net/NetworkUtils.kt android/app/src/main/java/lol/lan/arcade/data/SettingsStore.kt
git commit -m "Add NetworkUtils (local IPs) and DataStore-backed SettingsStore"
```

---

### Task 10: HostForegroundService

**Files:**
- Create: `android/app/src/main/java/lol/lan/arcade/service/HostForegroundService.kt`
- Modify: `android/app/src/main/AndroidManifest.xml` (service already declared in Task 1 Step 9 — no change needed unless the build fails on it, in which case re-check the `foregroundServiceType`/property block matches exactly)

**Interfaces:**
- Consumes: `OghServer`, `ContentRoots` (Task 6/7).
- Produces: `HostForegroundService` with companion `EXTRA_PORT`, `ACTION_STOP`; started via `Intent(context, HostForegroundService::class.java).putExtra(EXTRA_PORT, port)`. Consumed by `HostViewModel` (Task 12).

- [ ] **Step 1: Write `HostForegroundService.kt`**

```kotlin
package lol.lan.arcade.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import lol.lan.arcade.MainActivity
import lol.lan.arcade.R
import lol.lan.arcade.server.ContentRoots
import lol.lan.arcade.server.OghServer
import java.io.IOException

class HostForegroundService : Service() {

    private var server: OghServer? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val port = intent?.getIntExtra(EXTRA_PORT, DEFAULT_PORT) ?: DEFAULT_PORT
        val notification = buildNotification(port)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        if (server == null) {
            val contentRoots = ContentRoots(
                externalBaseDir = getExternalFilesDir(null) ?: filesDir,
                loadAssetBytes = { path ->
                    try {
                        assets.open(path).use { it.readBytes() }
                    } catch (e: IOException) {
                        null
                    }
                },
            )
            server = OghServer(port = port, contentRoots = contentRoots).also { it.start() }
        }
        acquireWakeLock()
        return START_STICKY
    }

    override fun onDestroy() {
        server?.stop()
        server = null
        releaseWakeLock()
        super.onDestroy()
    }

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "lol.lan.arcade:host").apply {
            setReferenceCounted(false)
            acquire(12 * 60 * 60 * 1000L) // 12h safety cap so a crash can't wake-lock forever; released in onDestroy
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
    }

    private fun buildNotification(port: Int): android.app.Notification {
        val channelId = "ogh_host"
        val nm = getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(channelId) == null) {
            nm.createNotificationChannel(
                NotificationChannel(channelId, getString(R.string.notif_channel_name), NotificationManager.IMPORTANCE_LOW)
            )
        }
        val openIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(getString(R.string.notif_title))
            .setContentText(getString(R.string.notif_text, port))
            .setContentIntent(openIntent)
            .setOngoing(true)
            .build()
    }

    companion object {
        const val EXTRA_PORT = "port"
        const val DEFAULT_PORT = 8080
        private const val NOTIFICATION_ID = 1
    }
}
```

- [ ] **Step 2: Add the two new strings this file references**

Edit `android/app/src/main/res/values/strings.xml`, add inside `<resources>`:

```xml
    <string name="notif_channel_name">Game host</string>
    <string name="notif_title">Offline Games Host is running</string>
    <string name="notif_text">Guests: open http://&lt;this phone\'s IP&gt;:%1$d/ in a browser</string>
```

- [ ] **Step 3: Compile check**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app/android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
./gradlew :app:compileDebugKotlin
```

Expected: `BUILD SUCCESSFUL`. (`R.drawable.ic_notification` already exists from Task 1 Step 10; `R.string.notif_*` now exist from Step 2 above.)

- [ ] **Step 4: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/app/src/main/java/lol/lan/arcade/service/HostForegroundService.kt android/app/src/main/res/values/strings.xml
git commit -m "Add HostForegroundService owning the Ktor server lifecycle + notification"
```

---

### Task 11: QR helper + Compose theme

**Files:**
- Create: `android/app/src/main/java/lol/lan/arcade/ui/qr/QrCode.kt`
- Create: `android/app/src/main/java/lol/lan/arcade/ui/theme/Color.kt`
- Create: `android/app/src/main/java/lol/lan/arcade/ui/theme/Theme.kt`

**Interfaces:**
- Produces: `fun qrCodeBitmap(text: String, sizePx: Int = 512): android.graphics.Bitmap?`; `@Composable fun OghHostTheme(content: @Composable () -> Unit)`. Consumed by `RunningScreen` (Task 14) and `MainActivity`/`AppNav` (Task 12).

- [ ] **Step 1: Write `QrCode.kt`**

```kotlin
package lol.lan.arcade.ui.qr

import android.graphics.Bitmap
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter

/** Pure-algorithm QR encode (com.google.zxing:core only — no camera/scanning UI weight). */
fun qrCodeBitmap(text: String, sizePx: Int = 512): Bitmap? = try {
    val matrix = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, sizePx, sizePx)
    val bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.RGB_565)
    for (x in 0 until sizePx) {
        for (y in 0 until sizePx) {
            bmp.setPixel(x, y, if (matrix.get(x, y)) 0xFF000000.toInt() else 0xFFFFFFFF.toInt())
        }
    }
    bmp
} catch (e: Exception) {
    null
}
```

- [ ] **Step 2: Write `Color.kt`**

```kotlin
package lol.lan.arcade.ui.theme

import androidx.compose.ui.graphics.Color

val OghBackground = Color(0xFF12121A)
val OghSurface = Color(0xFF1B1B26)
val OghAccent = Color(0xFF5CE1FF)
val OghAccentDark = Color(0xFF0FA6C9)
val OghOnDark = Color(0xFFF2F4FA)
```

- [ ] **Step 3: Write `Theme.kt`**

```kotlin
package lol.lan.arcade.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColors = darkColorScheme(
    primary = OghAccent,
    onPrimary = OghBackground,
    secondary = OghAccentDark,
    background = OghBackground,
    surface = OghSurface,
    onBackground = OghOnDark,
    onSurface = OghOnDark,
)

private val LightColors = lightColorScheme(
    primary = OghAccentDark,
    secondary = OghAccent,
)

@Composable
fun OghHostTheme(content: @Composable () -> Unit) {
    val colors = if (isSystemInDarkTheme()) DarkColors else LightColors
    MaterialTheme(colorScheme = colors, content = content)
}
```

- [ ] **Step 4: Compile check**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app/android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
./gradlew :app:compileDebugKotlin
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/app/src/main/java/lol/lan/arcade/ui/qr/QrCode.kt android/app/src/main/java/lol/lan/arcade/ui/theme/
git commit -m "Add QR bitmap helper and Compose Material3 theme"
```

---

### Task 12: HostViewModel + AppNav + MainActivity

**Files:**
- Create: `android/app/src/main/java/lol/lan/arcade/ui/HostViewModel.kt`
- Create: `android/app/src/main/java/lol/lan/arcade/ui/AppNav.kt`
- Modify: `android/app/src/main/java/lol/lan/arcade/MainActivity.kt` (replace Task 1's placeholder body)

**Interfaces:**
- Consumes: `SettingsStore` (Task 9), `HostForegroundService` (Task 10), `NetworkUtils` (Task 9), `OghHostTheme` (Task 11).
- Produces: `HostUiState(running, port, ips, roomCount)`, `HostViewModel` with `state: StateFlow<HostUiState>`, `start()`, `stop()`, `refreshIps()`, `setPort(Int)`. Consumed by `HomeScreen`/`RunningScreen`/`SettingsScreen` (Tasks 13-15).

- [ ] **Step 1: Write `HostViewModel.kt`**

```kotlin
package lol.lan.arcade.ui

import android.app.Application
import android.content.Intent
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import lol.lan.arcade.data.SettingsStore
import lol.lan.arcade.net.NetworkUtils
import lol.lan.arcade.service.HostForegroundService

data class HostUiState(
    val running: Boolean = false,
    val port: Int = SettingsStore.DEFAULT_PORT,
    val ips: List<String> = emptyList(),
    val keepScreenOn: Boolean = true,
    val language: String? = null,
)

class HostViewModel(application: Application) : AndroidViewModel(application) {
    private val settings = SettingsStore(application)
    private val _state = MutableStateFlow(HostUiState())
    val state: StateFlow<HostUiState> = _state

    init {
        viewModelScope.launch {
            settings.port.collect { p -> _state.update { it.copy(port = p) } }
        }
        viewModelScope.launch {
            settings.keepScreenOn.collect { v -> _state.update { it.copy(keepScreenOn = v) } }
        }
        viewModelScope.launch {
            settings.language.collect { v -> _state.update { it.copy(language = v) } }
        }
    }

    fun start() {
        val app = getApplication<Application>()
        val port = _state.value.port
        app.startService(
            Intent(app, HostForegroundService::class.java).putExtra(HostForegroundService.EXTRA_PORT, port)
        )
        _state.update { it.copy(running = true, ips = NetworkUtils.localIpv4Addresses()) }
    }

    fun stop() {
        val app = getApplication<Application>()
        app.stopService(Intent(app, HostForegroundService::class.java))
        _state.update { it.copy(running = false, ips = emptyList()) }
    }

    fun refreshIps() {
        if (_state.value.running) _state.update { it.copy(ips = NetworkUtils.localIpv4Addresses()) }
    }

    fun setPort(port: Int) {
        viewModelScope.launch { settings.setPort(port) }
    }

    fun setKeepScreenOn(enabled: Boolean) {
        viewModelScope.launch { settings.setKeepScreenOn(enabled) }
    }

    fun setLanguage(tag: String?) {
        viewModelScope.launch { settings.setLanguage(tag) }
    }
}
```

- [ ] **Step 2: Write `AppNav.kt`**

```kotlin
package lol.lan.arcade.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

object Routes {
    const val HOME = "home"
    const val RUNNING = "running"
    const val SETTINGS = "settings"
}

@Composable
fun AppNav() {
    val nav: NavHostController = rememberNavController()
    val viewModel: HostViewModel = viewModel()
    val state by viewModel.state.collectAsState()

    NavHost(navController = nav, startDestination = Routes.HOME) {
        composable(Routes.HOME) {
            HomeScreen(
                state = state,
                onStart = {
                    viewModel.start()
                    nav.navigate(Routes.RUNNING)
                },
                onOpenSettings = { nav.navigate(Routes.SETTINGS) },
            )
        }
        composable(Routes.RUNNING) {
            RunningScreen(
                state = state,
                onRefresh = viewModel::refreshIps,
                onStop = {
                    viewModel.stop()
                    nav.popBackStack(Routes.HOME, inclusive = false)
                },
            )
        }
        composable(Routes.SETTINGS) {
            SettingsScreen(
                state = state,
                onPortChange = viewModel::setPort,
                onKeepScreenOnChange = viewModel::setKeepScreenOn,
                onLanguageChange = viewModel::setLanguage,
                onBack = { nav.popBackStack() },
            )
        }
    }
}
```

- [ ] **Step 3: Replace `MainActivity.kt`**

```kotlin
package lol.lan.arcade

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import lol.lan.arcade.ui.AppNav
import lol.lan.arcade.ui.theme.OghHostTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            OghHostTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    AppNav()
                }
            }
        }
    }
}
```

This will not compile until Tasks 13–15 add `HomeScreen`/`RunningScreen`/`SettingsScreen` — that's expected; this task's own verification step only checks it up to that known-missing point.

- [ ] **Step 4: Verify the expected (partial) compile failure**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app/android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
./gradlew :app:compileDebugKotlin
```

Expected: FAIL — unresolved references `HomeScreen`, `RunningScreen`, `SettingsScreen` (nothing else). If anything *other* than those three names is unresolved, fix it before moving on — that would be a real bug in this task's own code, not just "later task not written yet".

- [ ] **Step 5: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/app/src/main/java/lol/lan/arcade/ui/HostViewModel.kt android/app/src/main/java/lol/lan/arcade/ui/AppNav.kt android/app/src/main/java/lol/lan/arcade/MainActivity.kt
git commit -m "Add HostViewModel + navigation scaffold (screens land next)"
```

---

### Task 13: HomeScreen

**Files:**
- Create: `android/app/src/main/java/lol/lan/arcade/ui/HomeScreen.kt`

**Interfaces:**
- Consumes: `HostUiState` (Task 12).
- Produces: `@Composable fun HomeScreen(state: HostUiState, onStart: () -> Unit, onOpenSettings: () -> Unit)`.

- [ ] **Step 1: Write `HomeScreen.kt`**

```kotlin
package lol.lan.arcade.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import lol.lan.arcade.R

@Composable
fun HomeScreen(state: HostUiState, onStart: () -> Unit, onOpenSettings: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(stringRes(R.string.app_name), style = MaterialTheme.typography.headlineMedium)
        Text(stringRes(R.string.home_tagline), style = MaterialTheme.typography.bodyMedium)
        Button(onClick = onStart, modifier = Modifier.padding(top = 24.dp)) {
            Text(stringRes(R.string.home_start))
        }
        TextButton(onClick = onOpenSettings, modifier = Modifier.padding(top = 8.dp)) {
            Text(stringRes(R.string.settings_title))
        }
    }
}
```

`stringRes(...)` is a tiny Compose helper added in Task 16 alongside the translated strings (`stringResource(id)` requires an `Int` resource id and this repo's screens all reference `R.string.*` the same way — the helper is just `@Composable fun stringRes(id: Int) = androidx.compose.ui.res.stringResource(id)` for a slightly shorter call site). Until Task 16 lands, use `androidx.compose.ui.res.stringResource` directly to keep this task independently compilable:

```kotlin
import androidx.compose.ui.res.stringResource

// ...replace stringRes(...) calls above with stringResource(...)
```

- [ ] **Step 2: Add the strings this screen references**

Edit `android/app/src/main/res/values/strings.xml`, add inside `<resources>`:

```xml
    <string name="home_tagline">Start a local game server. Guests join from any browser on the same Wi-Fi — no app to install.</string>
    <string name="home_start">Start hosting</string>
    <string name="settings_title">Settings</string>
```

- [ ] **Step 3: Compile check**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app/android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
./gradlew :app:compileDebugKotlin
```

Expected: FAIL only on unresolved `RunningScreen`/`SettingsScreen` (from `AppNav.kt`) — same as Task 12 Step 4, one name fewer.

- [ ] **Step 4: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/app/src/main/java/lol/lan/arcade/ui/HomeScreen.kt android/app/src/main/res/values/strings.xml
git commit -m "Add Home screen"
```

---

### Task 14: RunningScreen

**Files:**
- Create: `android/app/src/main/java/lol/lan/arcade/ui/RunningScreen.kt`

**Interfaces:**
- Consumes: `HostUiState` (Task 12), `qrCodeBitmap` (Task 11).
- Produces: `@Composable fun RunningScreen(state: HostUiState, onRefresh: () -> Unit, onStop: () -> Unit)`.

- [ ] **Step 1: Write `RunningScreen.kt`**

```kotlin
package lol.lan.arcade.ui

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import lol.lan.arcade.R
import lol.lan.arcade.ui.qr.qrCodeBitmap

@Composable
fun RunningScreen(state: HostUiState, onRefresh: () -> Unit, onStop: () -> Unit) {
    val context = LocalContext.current

    LaunchedEffect(state.running) {
        while (state.running) {
            onRefresh()
            delay(5000)
        }
    }

    LazyColumn(modifier = Modifier.fillMaxWidth().padding(24.dp)) {
        item {
            Text(stringResource(R.string.running_title), style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(16.dp))
        }
        if (state.ips.isEmpty()) {
            item { Text(stringResource(R.string.running_no_ip)) }
        } else {
            items(state.ips) { ip ->
                val url = "http://$ip:${state.port}/"
                Text(url, style = MaterialTheme.typography.bodyLarge)
                val bitmap = remember(url) { qrCodeBitmap(url) }
                if (bitmap != null) {
                    Image(
                        bitmap = bitmap.asImageBitmap(),
                        contentDescription = url,
                        modifier = Modifier.size(200.dp).padding(vertical = 8.dp),
                    )
                }
                Spacer(Modifier.height(16.dp))
            }
        }

        item {
            Button(onClick = {
                val ip = state.ips.firstOrNull() ?: "127.0.0.1"
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("http://$ip:${state.port}/"))
                context.startActivity(intent)
            }) { Text(stringResource(R.string.running_open_lobby)) }

            Spacer(Modifier.height(8.dp))
            Text(stringResource(R.string.running_hotspot_hint), style = MaterialTheme.typography.bodySmall)
            OutlinedButton(onClick = { openHotspotSettings(context) }) {
                Text(stringResource(R.string.running_hotspot_button))
            }

            Spacer(Modifier.height(24.dp))
            Button(onClick = onStop) { Text(stringResource(R.string.running_stop)) }
        }
    }
}

private fun openHotspotSettings(context: android.content.Context) {
    val primary = Intent(Settings.ACTION_WIFI_TETHER_SETTING)
    val fallback = Intent(Settings.ACTION_WIRELESS_SETTINGS)
    try {
        context.startActivity(primary)
    } catch (e: Exception) {
        try {
            context.startActivity(fallback)
        } catch (e2: Exception) {
            // No settings screen resolvable on this OEM build — nothing more we can do here.
        }
    }
}
```

- [ ] **Step 2: Add the strings this screen references**

Edit `android/app/src/main/res/values/strings.xml`, add inside `<resources>`:

```xml
    <string name="running_title">Hosting</string>
    <string name="running_no_ip">No Wi-Fi network detected yet. Connect to a hotspot or router, then this list refreshes automatically.</string>
    <string name="running_open_lobby">Open lobby on this phone</string>
    <string name="running_hotspot_hint">To let others join, turn on this phone\'s Wi-Fi hotspot (or connect to a router), then have them open one of the addresses above.</string>
    <string name="running_hotspot_button">Open hotspot settings</string>
    <string name="running_stop">Stop hosting</string>
```

- [ ] **Step 3: Compile check**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app/android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
./gradlew :app:compileDebugKotlin
```

Expected: FAIL only on unresolved `SettingsScreen` (from `AppNav.kt`) — one name fewer than Task 13's check.

- [ ] **Step 4: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/app/src/main/java/lol/lan/arcade/ui/RunningScreen.kt android/app/src/main/res/values/strings.xml
git commit -m "Add Running screen (IP list, QR, open lobby, hotspot hint)"
```

---

### Task 15: SettingsScreen

**Files:**
- Create: `android/app/src/main/java/lol/lan/arcade/ui/SettingsScreen.kt`

**Interfaces:**
- Consumes: `HostUiState` (Task 12).
- Produces: `@Composable fun SettingsScreen(state: HostUiState, onPortChange: (Int) -> Unit, onKeepScreenOnChange: (Boolean) -> Unit, onLanguageChange: (String?) -> Unit, onBack: () -> Unit)`.

**Language switching, decided during planning:** `androidx.appcompat`'s `AppCompatDelegate.setApplicationLocales()` would need pulling in the whole AppCompat library just for this one call, and typically wants an `AppCompatActivity` to auto-recreate cleanly — a mismatch for a Compose-only, `ComponentActivity`-based app. Android 13+ (API 33) exposes the same per-app-language mechanism natively via `android.app.LocaleManager` with zero extra dependency. The connected test device is API 33, so this path is fully exercised this session; older devices keep the system language and the picker still records the preference (documented limitation, not silently dropped). `AndroidManifest.xml` (Task 1) deliberately excludes `locale` from `android:configChanges`, so the OS auto-recreates `MainActivity` after the call and Compose recomposes with the new `values-XX` strings — no manual recreate() needed.

- [ ] **Step 1: Write `SettingsScreen.kt`**

```kotlin
package lol.lan.arcade.ui

import android.app.LocaleManager
import android.content.Context
import android.os.Build
import android.os.LocaleList
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import lol.lan.arcade.R

private val LANGUAGES: List<Pair<String?, String>> = listOf(
    null to "System default",
    "en" to "English",
    "zh" to "中文",
    "ru" to "Русский",
    "es" to "Español",
    "ar" to "العربية",
    "fr" to "Français",
)

@Composable
fun SettingsScreen(
    state: HostUiState,
    onPortChange: (Int) -> Unit,
    onKeepScreenOnChange: (Boolean) -> Unit,
    onLanguageChange: (String?) -> Unit,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    var portText by remember(state.port) { mutableStateOf(state.port.toString()) }

    Column(modifier = Modifier.fillMaxWidth().padding(24.dp)) {
        Text(stringResource(R.string.settings_title), style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(24.dp))

        Text(stringResource(R.string.settings_language), style = MaterialTheme.typography.titleMedium)
        LANGUAGES.forEach { (tag, label) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .selectable(selected = state.language == tag) {
                        onLanguageChange(tag)
                        applyAppLocale(context, tag)
                    },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                RadioButton(
                    selected = state.language == tag,
                    onClick = {
                        onLanguageChange(tag)
                        applyAppLocale(context, tag)
                    },
                )
                Text(label)
            }
        }

        Spacer(Modifier.height(24.dp))
        Text(stringResource(R.string.settings_port), style = MaterialTheme.typography.titleMedium)
        OutlinedTextField(
            value = portText,
            onValueChange = { text ->
                portText = text.filter { it.isDigit() }.take(5)
                portText.toIntOrNull()?.let { if (it in 1024..65535) onPortChange(it) }
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
        )
        Text(stringResource(R.string.settings_port_hint), style = MaterialTheme.typography.bodySmall)

        Spacer(Modifier.height(24.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.settings_keep_screen_on), modifier = Modifier.weight(1f))
            Switch(checked = state.keepScreenOn, onCheckedChange = onKeepScreenOnChange)
        }

        Spacer(Modifier.height(24.dp))
        TextButton(onClick = onBack) { Text(stringResource(R.string.settings_back)) }
    }
}

private fun applyAppLocale(context: Context, languageTag: String?) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        val localeManager = context.getSystemService(LocaleManager::class.java)
        localeManager.applicationLocales =
            if (languageTag == null) LocaleList.getEmptyLocaleList() else LocaleList.forLanguageTags(languageTag)
    }
}
```

- [ ] **Step 2: Add the strings this screen references**

Edit `android/app/src/main/res/values/strings.xml`, add inside `<resources>`:

```xml
    <string name="settings_language">Language</string>
    <string name="settings_port">Port</string>
    <string name="settings_port_hint">Between 1024 and 65535, 8080 by default.</string>
    <string name="settings_keep_screen_on">Keep screen on while hosting</string>
    <string name="settings_back">Back</string>
```

- [ ] **Step 3: Full compile check — the whole app should now build**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app/android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
./gradlew :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`. This is the first point where all three screens, the ViewModel, the service, and the server are wired together — if anything doesn't compile, this is where cross-task interface mismatches (a param renamed in one task but not updated at a call site in another) will surface. Fix any such mismatch by matching the signatures declared in each task's **Interfaces** block, not by guessing.

- [ ] **Step 4: Run the full unit test suite**

```bash
./gradlew :app:testDebugUnitTest
```

Expected: `BUILD SUCCESSFUL`, all tests from Tasks 2–7 passing (≈50 tests total).

- [ ] **Step 5: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/app/src/main/java/lol/lan/arcade/ui/SettingsScreen.kt android/app/src/main/res/values/strings.xml
git commit -m "Add Settings screen (language via LocaleManager, port, keep-screen-on)"
```

---

### Task 16: UN-6 host UI translations

**Files:**
- Create: `android/app/src/main/res/values-zh/strings.xml`
- Create: `android/app/src/main/res/values-ru/strings.xml`
- Create: `android/app/src/main/res/values-es/strings.xml`
- Create: `android/app/src/main/res/values-ar/strings.xml`
- Create: `android/app/src/main/res/values-fr/strings.xml`

**Interfaces:** none — pure resource files, same 17 keys as `values/strings.xml` in every file. Scope is the native host UI only (per design spec §2 — game/lobby content translation is a separate, already-deferred future phase).

The 17 keys, for reference (all already exist in `values/strings.xml` from Tasks 1/10/13/14/15): `app_name`, `notif_channel_name`, `notif_title`, `notif_text`, `home_tagline`, `home_start`, `settings_title`, `running_title`, `running_no_ip`, `running_open_lobby`, `running_hotspot_hint`, `running_hotspot_button`, `running_stop`, `settings_language`, `settings_port`, `settings_port_hint`, `settings_keep_screen_on`, `settings_back`.

- [ ] **Step 1: Write `android/app/src/main/res/values-zh/strings.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">离线游戏中心</string>
    <string name="notif_channel_name">游戏主机</string>
    <string name="notif_title">离线游戏中心正在运行</string>
    <string name="notif_text">访客请在浏览器中打开 http://&lt;本机IP&gt;:%1$d/</string>
    <string name="home_tagline">启动本地游戏服务器。同一 Wi-Fi 下的访客可用任意浏览器加入——无需安装应用。</string>
    <string name="home_start">开始托管</string>
    <string name="settings_title">设置</string>
    <string name="running_title">托管中</string>
    <string name="running_no_ip">尚未检测到 Wi-Fi 网络。请连接热点或路由器，列表会自动刷新。</string>
    <string name="running_open_lobby">在本机打开大厅</string>
    <string name="running_hotspot_hint">要让其他人加入，请打开本机的 Wi-Fi 热点(或连接路由器)，然后让他们打开上面的地址之一。</string>
    <string name="running_hotspot_button">打开热点设置</string>
    <string name="running_stop">停止托管</string>
    <string name="settings_language">语言</string>
    <string name="settings_port">端口</string>
    <string name="settings_port_hint">1024–65535 之间，默认 8080。</string>
    <string name="settings_keep_screen_on">托管时保持屏幕常亮</string>
    <string name="settings_back">返回</string>
</resources>
```

- [ ] **Step 2: Write `android/app/src/main/res/values-ru/strings.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Оффлайн Хаб Игр</string>
    <string name="notif_channel_name">Игровой хост</string>
    <string name="notif_title">Оффлайн Хаб Игр запущен</string>
    <string name="notif_text">Гости: откройте http://&lt;IP этого телефона&gt;:%1$d/ в браузере</string>
    <string name="home_tagline">Запустите локальный игровой сервер. Гости подключаются из любого браузера в той же Wi-Fi сети — приложение ставить не нужно.</string>
    <string name="home_start">Начать хостинг</string>
    <string name="settings_title">Настройки</string>
    <string name="running_title">Хостинг активен</string>
    <string name="running_no_ip">Wi-Fi сеть не найдена. Подключитесь к хотспоту или роутеру — список обновится автоматически.</string>
    <string name="running_open_lobby">Открыть лобби на этом телефоне</string>
    <string name="running_hotspot_hint">Чтобы другие могли подключиться, включите Wi-Fi точку доступа на этом телефоне (или подключитесь к роутеру), затем попросите их открыть один из адресов выше.</string>
    <string name="running_hotspot_button">Открыть настройки точки доступа</string>
    <string name="running_stop">Остановить хостинг</string>
    <string name="settings_language">Язык</string>
    <string name="settings_port">Порт</string>
    <string name="settings_port_hint">От 1024 до 65535, по умолчанию 8080.</string>
    <string name="settings_keep_screen_on">Не выключать экран во время хостинга</string>
    <string name="settings_back">Назад</string>
</resources>
```

- [ ] **Step 3: Write `android/app/src/main/res/values-es/strings.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Centro de Juegos Offline</string>
    <string name="notif_channel_name">Host de juegos</string>
    <string name="notif_title">El Centro de Juegos Offline está en ejecución</string>
    <string name="notif_text">Invitados: abran http://&lt;IP de este teléfono&gt;:%1$d/ en un navegador</string>
    <string name="home_tagline">Inicia un servidor de juegos local. Los invitados se conectan desde cualquier navegador en la misma red Wi-Fi, sin instalar ninguna app.</string>
    <string name="home_start">Empezar a hospedar</string>
    <string name="settings_title">Ajustes</string>
    <string name="running_title">Hospedando</string>
    <string name="running_no_ip">Aún no se detecta una red Wi-Fi. Conéctate a un punto de acceso o router; esta lista se actualiza automáticamente.</string>
    <string name="running_open_lobby">Abrir la sala en este teléfono</string>
    <string name="running_hotspot_hint">Para que otros se unan, activa el punto de acceso Wi-Fi de este teléfono (o conéctate a un router) y pídeles que abran una de las direcciones de arriba.</string>
    <string name="running_hotspot_button">Abrir ajustes de punto de acceso</string>
    <string name="running_stop">Detener hospedaje</string>
    <string name="settings_language">Idioma</string>
    <string name="settings_port">Puerto</string>
    <string name="settings_port_hint">Entre 1024 y 65535; 8080 por defecto.</string>
    <string name="settings_keep_screen_on">Mantener la pantalla encendida mientras hospedas</string>
    <string name="settings_back">Atrás</string>
</resources>
```

- [ ] **Step 4: Write `android/app/src/main/res/values-ar/strings.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">مركز الألعاب دون اتصال</string>
    <string name="notif_channel_name">مضيف الألعاب</string>
    <string name="notif_title">مركز الألعاب دون اتصال قيد التشغيل</string>
    <string name="notif_text">الضيوف: افتحوا http://&lt;عنوان IP لهذا الهاتف&gt;:%1$d/ في المتصفح</string>
    <string name="home_tagline">ابدأ خادم ألعاب محلي. ينضم الضيوف من أي متصفح على نفس شبكة Wi-Fi، دون تثبيت أي تطبيق.</string>
    <string name="home_start">بدء الاستضافة</string>
    <string name="settings_title">الإعدادات</string>
    <string name="running_title">الاستضافة نشطة</string>
    <string name="running_no_ip">لم يتم العثور على شبكة Wi-Fi بعد. اتصل بنقطة اتصال أو راوتر، وستتحدّث هذه القائمة تلقائيًا.</string>
    <string name="running_open_lobby">افتح الردهة على هذا الهاتف</string>
    <string name="running_hotspot_hint">لتمكين الآخرين من الانضمام، فعّل نقطة اتصال Wi-Fi لهذا الهاتف (أو اتصل براوتر)، ثم اطلب منهم فتح أحد العناوين أعلاه.</string>
    <string name="running_hotspot_button">افتح إعدادات نقطة الاتصال</string>
    <string name="running_stop">إيقاف الاستضافة</string>
    <string name="settings_language">اللغة</string>
    <string name="settings_port">المنفذ</string>
    <string name="settings_port_hint">من 1024 إلى 65535، الافتراضي 8080.</string>
    <string name="settings_keep_screen_on">إبقاء الشاشة مضاءة أثناء الاستضافة</string>
    <string name="settings_back">رجوع</string>
</resources>
```

RTL layout itself needs no extra code — `android:supportsRtl="true"` is already set in `AndroidManifest.xml` (Task 1), and Compose mirrors layout direction automatically from the resolved locale.

- [ ] **Step 5: Write `android/app/src/main/res/values-fr/strings.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Centre de Jeux Hors-Ligne</string>
    <string name="notif_channel_name">Hôte de jeu</string>
    <string name="notif_title">Le Centre de Jeux Hors-Ligne est actif</string>
    <string name="notif_text">Invités : ouvrez http://&lt;IP de ce téléphone&gt;:%1$d/ dans un navigateur</string>
    <string name="home_tagline">Démarrez un serveur de jeu local. Les invités rejoignent depuis n\'importe quel navigateur sur le même Wi-Fi, sans installer d\'application.</string>
    <string name="home_start">Démarrer l\'hébergement</string>
    <string name="settings_title">Paramètres</string>
    <string name="running_title">Hébergement en cours</string>
    <string name="running_no_ip">Aucun réseau Wi-Fi détecté pour l\'instant. Connectez-vous à un point d\'accès ou un routeur ; cette liste se met à jour automatiquement.</string>
    <string name="running_open_lobby">Ouvrir le lobby sur ce téléphone</string>
    <string name="running_hotspot_hint">Pour que d\'autres puissent rejoindre, activez le point d\'accès Wi-Fi de ce téléphone (ou connectez-vous à un routeur), puis demandez-leur d\'ouvrir l\'une des adresses ci-dessus.</string>
    <string name="running_hotspot_button">Ouvrir les paramètres du point d\'accès</string>
    <string name="running_stop">Arrêter l\'hébergement</string>
    <string name="settings_language">Langue</string>
    <string name="settings_port">Port</string>
    <string name="settings_port_hint">Entre 1024 et 65535, 8080 par défaut.</string>
    <string name="settings_keep_screen_on">Garder l\'écran allumé pendant l\'hébergement</string>
    <string name="settings_back">Retour</string>
</resources>
```

- [ ] **Step 6: Build and lint-check resources**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app/android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
./gradlew :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`. AGP's resource merger validates well-formed XML and matching string keys across locales as part of this build — a stray unescaped `'` or `<` in any file above surfaces here as a resource compile error naming the exact file and line.

- [ ] **Step 7: Commit**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add android/app/src/main/res/values-zh android/app/src/main/res/values-ru android/app/src/main/res/values-es android/app/src/main/res/values-ar android/app/src/main/res/values-fr
git commit -m "Translate Android host UI to UN-6 languages (zh/ru/es/ar/fr)"
```

---

### Task 17: Build, install, and smoke-test on the connected device

**Files:** none — verification only, plus recording results.

**Interfaces:** consumes the fully assembled app from Tasks 1–16.

**Note on network topology for this test:** whether this workstation shares Wi-Fi with the phone is unknown and outside this session's control (the phone is attached over USB for `adb`). `adb forward` tunnels a TCP port over the existing USB connection regardless of Wi-Fi state, so it is the primary verification path here — it exercises the exact same server code a real Wi-Fi guest would hit. Real-Wi-Fi/second-device verification is called out explicitly as something the returning user should additionally try (design spec §2, §9).

- [ ] **Step 1: Install on the connected device**

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app/android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
./gradlew :app:assembleDebug
adb -s afe6cafd install -r app/build/outputs/apk/debug/app-debug.apk
```

Expected: `Success`.

- [ ] **Step 2: Create the external pack directories and push the full repo content**

Try the plain (non-root) path first — `adb shell` under `/sdcard/Android/data/<pkg>/files/` is normally writable even without root:

```bash
adb -s afe6cafd shell am start -n lol.lan.arcade/.MainActivity
sleep 2
adb -s afe6cafd shell mkdir -p /sdcard/Android/data/lol.lan.arcade/files/packs/games /sdcard/Android/data/lol.lan.arcade/files/packs/programs
adb -s afe6cafd push /home/denim/Projects/AI_short_progs/OFFline_games_app/games /sdcard/Android/data/lol.lan.arcade/files/packs/
adb -s afe6cafd push /home/denim/Projects/AI_short_progs/OFFline_games_app/programs /sdcard/Android/data/lol.lan.arcade/files/packs/
adb -s afe6cafd push /home/denim/Projects/AI_short_progs/OFFline_games_app/pc/www /sdcard/Android/data/lol.lan.arcade/files/packs/www
```

If any `mkdir`/`push` above fails with a permission error (Scoped Storage blocking shell), fall back to the root path this device has available:

```bash
adb -s afe6cafd root
adb -s afe6cafd shell mkdir -p /sdcard/Android/data/lol.lan.arcade/files/packs/games /sdcard/Android/data/lol.lan.arcade/files/packs/programs
adb -s afe6cafd push /home/denim/Projects/AI_short_progs/OFFline_games_app/games /sdcard/Android/data/lol.lan.arcade/files/packs/
adb -s afe6cafd push /home/denim/Projects/AI_short_progs/OFFline_games_app/programs /sdcard/Android/data/lol.lan.arcade/files/packs/
adb -s afe6cafd push /home/denim/Projects/AI_short_progs/OFFline_games_app/pc/www /sdcard/Android/data/lol.lan.arcade/files/packs/www
```

Expected: pushes succeed (this includes World Trail's ~5.2 MB and the ~4.6 MB of fonts excluded from the APK — confirms the external-pack-directory override path, not just the curated bundle, so this test reflects the whole project).

- [ ] **Step 3: Start hosting and forward the port**

```bash
adb -s afe6cafd shell am start -n lol.lan.arcade/.MainActivity
```

On the phone screen (use `adb shell input tap <x> <y>` against the "Start hosting" button's on-screen location, found via `adb shell uiautomator dump` + inspecting the XML, since there is no other input path from this session) or note that a physically-present user would just tap it — either way, confirm the app reaches the Running screen, then:

```bash
adb -s afe6cafd forward tcp:18080 tcp:8080
curl -sS -m 5 http://127.0.0.1:18080/api/health
```

Expected: `{"ok":true,"rooms":0,"v":1}` (or similar — proves the embedded Ktor server is reachable through the forwarded port, i.e., actually listening and serving).

- [ ] **Step 4: Verify lobby, catalog, and a bundled game**

```bash
curl -sS -m 5 http://127.0.0.1:18080/ | head -5
curl -sS -m 5 http://127.0.0.1:18080/games/catalog/games.json | head -c 200
curl -sS -m 5 -o /dev/null -w "%{http_code}\n" http://127.0.0.1:18080/games/comet/client/index.html
curl -sS -m 5 -o /dev/null -w "%{http_code}\n" http://127.0.0.1:18080/games/world-trail/client/index.html
```

Expected: lobby HTML, valid catalog JSON, both game paths return `200` — the second confirms the external pack directory (World Trail, not bundled in the APK) is actually being served, proving the override-merge in `ContentRoots` works end-to-end, not just in the Task 6 unit tests.

- [ ] **Step 5: Verify LAN Chat text round-trip with two real browser sessions**

Using the Chrome browser automation tools available in this session, open two tabs against the forwarded port and confirm a message sent in one appears in the other:

- Tab A: `http://127.0.0.1:18080/programs/lan-chat/client/?name=Ada&room=main`
- Tab B: `http://127.0.0.1:18080/programs/lan-chat/client/?name=Bo&room=main`

Type a message in Tab A's input and submit; read Tab B's page text and confirm the message and sender name ("Ada") appear. This exercises the real join → `game:action`(`chat-msg`) → relay path built in Tasks 3–7, through two independent WebSocket connections — not a simulation.

- [ ] **Step 6: Verify Video Convert loads**

Open `http://127.0.0.1:18080/programs/video-convert/client/` in a browser tab; confirm the page loads without a console error and the file picker / tool list renders. Do not attempt a full conversion run in this smoke test — the feature is unchanged, unmodified static content; loading correctly is what proves *this session's* work (serving it) is correct.

- [ ] **Step 7: Verify the foreground service survives backgrounding**

```bash
adb -s afe6cafd shell input keyevent KEYCODE_HOME
sleep 3
curl -sS -m 5 http://127.0.0.1:18080/api/health
adb -s afe6cafd shell dumpsys notification --noredact | grep -A3 "lol.lan.arcade"
```

Expected: `/api/health` still responds after the app is backgrounded (proves the `HostForegroundService`, not just the foregrounded Activity, owns the server), and the notification dump shows the "Offline Games Host is running" notification still posted.

- [ ] **Step 8: Verify the language switch (Arabic RTL as the sharpest check)**

Bring the app back to the foreground, navigate to Settings, select "العربية". Confirm (via `adb shell dumpsys activity | grep -A2 lol.lan.arcade` showing the Activity was recreated, and/or a screenshot) that the UI text switched to Arabic and the layout mirrored to RTL (Settings/Running labels and the back button visually flip sides).

- [ ] **Step 9: Stop hosting and confirm clean shutdown**

Return language to system default, go to Running, tap "Stop hosting".

```bash
curl -sS -m 3 http://127.0.0.1:18080/api/health || echo "connection refused (expected)"
adb -s afe6cafd forward --remove tcp:18080
```

Expected: the curl fails to connect once stopped — proves `OghServer.stop()` actually releases the port rather than leaking a listener.

- [ ] **Step 10: Record results and commit**

Update the **Status** table in `docs/superpowers/specs/2026-07-10-android-host-design.md` (add a `## Testing results` section at the end) with what actually happened at each step above — pass/fail, and the exact device/build identifiers used. This is the honest record referenced in that spec's §0 override note.

```bash
cd /home/denim/Projects/AI_short_progs/OFFline_games_app
git add docs/superpowers/specs/2026-07-10-android-host-design.md
git commit -m "Record Android host device smoke-test results"
```

---

## Plan self-review

**Spec coverage:** every §2 "Goals (this session)" row in the design spec maps to a task — Gradle/Compose build → Task 1; protocol match → Tasks 2–7; screens → Tasks 12–15; foreground service → Task 10; bundled + external content → Tasks 6, 8, 17 Step 2; UN-6 i18n → Task 16; installed & smoke-tested → Task 17. Every §2 non-goal is respected by omission (no hotspot-control code, no TLS/cert code, no game-content translation, no release signing config, no claim of two-physical-device proof anywhere in Task 17's wording).

**Placeholder scan:** no "TBD"/"TODO" remain in any task's code. Task 2 and Task 7 each contain one deliberately-flagged "write it, run it, see it's wrong, fix it" moment (a bad test assertion in Task 2; a possible `RoutingContext` name mismatch in Task 7) — both are resolved inline with a concrete replacement, not left open, and both exist because they're genuinely the two highest-uncertainty API surfaces in the plan (a hand-composed test, and a Ktor route-handler receiver type this session could not fully pin down from source alone).

**Type consistency, checked across task boundaries:**
- `PlayerInfo(id, name, ready, gameId, isHost)` — defined in Task 2, constructed identically in Task 3's `Room.snapshot()`, consumed identically in Task 2's `Outgoing.lobby()`. Matches.
- `Connection(sink: (String) -> Unit)` with mutable `player: Player?` — defined in Task 4, constructed in Task 7's `webSocket("/ws")` block with `sink = { text -> outgoing.trySend(Frame.Text(text)) }`. Matches.
- `ContentRoots(externalBaseDir: File, loadAssetBytes: (String) -> ByteArray?)` — defined in Task 6, constructed identically in Task 7's test file and in Task 10's `HostForegroundService`. Matches.
- `OghServer(port: Int, contentRoots: ContentRoots)` — defined in Task 7, constructed identically in Task 10. Matches.
- `HostUiState(running, port, ips, keepScreenOn, language)` — defined in Task 12, consumed with the same field names in Tasks 13/14/15. Matches (note: an earlier draft of this plan sketched a `roomCount: Int` field that was dropped when Task 14 settled on polling `/api/health` indirectly through `refreshIps()`'s periodic loop rather than adding a second poll — no task references `roomCount`, so this is not a dangling reference).
- `Dispatcher.handle(hub, conn, raw, nowMillis)` — signature fixed in Task 4, called identically (with `System.currentTimeMillis()`) in Task 7.

No gaps found requiring a new task.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-10-android-host.md`.

Given the scale of this task (17 tasks touching one continuously-evolving Gradle/Kotlin project, where later tasks depend on exact interfaces earlier tasks define, and where the fastest feedback loop is running the real `./gradlew` build immediately after each change) this plan will be executed **inline, in this same session**, using `superpowers:executing-plans` rather than dispatching fresh subagents per task. The reasoning: subagent-driven development's isolation is most valuable when tasks are independent enough to parallelize or when a fresh reviewer's perspective matters more than continuity; here every task builds directly on the last, environment facts (SDK path, device id, proven dependency versions) are already loaded in this session's context, and Android/Gradle build failures are best resolved by immediately re-running the failing command rather than round-tripping through a new agent that would need to rediscover this same context.
