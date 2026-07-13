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
        versionCode = 3
        versionName = "0.2.0"
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

    // The app has an in-app language picker. Keep every bundled translation
    // available even when a release is distributed as an Android App Bundle.
    bundle {
        language { enableSplit = false }
    }

    // Netty ships its own META-INF/INDEX.LIST (a JVM jar-indexing hint, unused by
    // Android's own class loading) in multiple sub-artifacts; Android's resource
    // merger refuses to silently pick one, so it must be dropped explicitly.
    packaging {
        resources {
            excludes += "META-INF/INDEX.LIST"
            excludes += "META-INF/io.netty.versions.properties"
        }
    }
}

val repoRoot = rootDir.parentFile!!
// Linked worktrees can build an APK from the primary checkout's current web
// packs without copying them into the Android branch first:
//   ./gradlew :app:assembleDebug -PoghWebRoot=/path/to/OFFline_games_app
val webSourceRoot = providers.gradleProperty("oghWebRoot").orNull?.let(::file) ?: repoRoot

val syncWebAssets by tasks.registering(Sync::class) {
    into(layout.projectDirectory.dir("src/main/assets/web"))

    // games/ is now the single source tree for every browser pack, including
    // utility programs under games/programs/. Keeping the catalog and payload
    // in one Sync source prevents cards that point at files absent from the APK.
    from(webSourceRoot.resolve("games")) {
        into("games")
        exclude("_shared/fonts/**")
        exclude("_templates/**")
    }

    from(webSourceRoot.resolve("pc/www")) { into("www") }
}

tasks.named("preBuild") { dependsOn(syncWebAssets) }

// jansi is ktor-server-netty's *optional* dependency for ANSI console colors on a JVM
// server's terminal output — no terminal on Android, and Netty's own code guards its
// absence, so it's dead weight only. A per-dependency exclude{} block on the
// version-catalog accessor silently failed to apply here, so excluding at the
// configuration level instead, which reliably does.
//
// Deliberately NOT excluding netty-transport-native-{epoll,kqueue} here even though
// their actual native .so/.jnilib binaries can never load on Android: Ktor's own
// NettyApplicationEngine.getChannelClass() references io.netty.channel.kqueue.KQueue
// unconditionally (not behind a try/catch) as part of choosing an event-loop group on
// *every* engine stop, not just on unsupported platforms — a real NoClassDefFoundError
// reproduced in NettyOghServerTest when this was excluded, which would have crashed
// HostForegroundService.onDestroy() on-device. Keeping these costs some APK size (see
// the size note in NettyOghServer.kt) in exchange for a server that actually stops.
configurations.all {
    exclude(group = "org.fusesource.jansi", module = "jansi")
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
    implementation(libs.ktor.server.netty)
    implementation(libs.ktor.server.websockets)
    implementation(libs.ktor.network.tls.certificates)

    implementation(libs.zxing.core)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.serialization.json)
    testImplementation(libs.ktor.server.test.host)
    testImplementation(libs.ktor.client.websockets)
}
