// Top-level build file for Arflix Native Android TV

plugins {
    id("com.android.application") version "8.13.2" apply false
    id("org.jetbrains.kotlin.android") version "2.3.0" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "2.3.0" apply false
    // Kotlin 2.0+: Compose compiler is a dedicated Gradle plugin; version
    // must track Kotlin.
    id("org.jetbrains.kotlin.plugin.compose") version "2.3.0" apply false
    id("com.google.devtools.ksp") version "2.3.0" apply false
    // Hilt stays on 2.57 because Hilt 2.59 and newer require AGP 9 (Gradle 9.1+) for the Hilt Gradle
    // plugin, and this project is on AGP 8.13.2. dagger#5099 (missing ComponentTreeDeps) is fixed in
    // 2.59.1/2.59.2, so it is no longer a blocker; the AGP 9 migration is. Paired with androidx.hilt
    // 1.2.0 (stable) so hilt-work doesn't pull dagger up to 2.59+.
    id("com.google.dagger.hilt.android") version "2.57" apply false
    id("com.google.android.libraries.mapsplatform.secrets-gradle-plugin") version "2.0.1" apply false
    // Firebase - requires google-services.json from Firebase Console
    id("com.google.gms.google-services") version "4.4.0" apply false
    id("com.google.firebase.crashlytics") version "2.9.9" apply false
    // Static analysis
    id("io.gitlab.arturbosch.detekt") version "1.23.7" apply false
}

