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
    testImplementation(libs.ktor.client.websockets)
}
