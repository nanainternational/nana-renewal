import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }

val deviceApiKey = providers.gradleProperty("SMS_DEVICE_API_KEY")
    .orElse(providers.environmentVariable("SMS_DEVICE_API_KEY")).orElse("")
val releaseStoreFile = providers.gradleProperty("NANA_SMS_KEYSTORE_FILE")
    .orElse(providers.environmentVariable("NANA_SMS_KEYSTORE_FILE"))
val releaseStorePassword = providers.gradleProperty("NANA_SMS_KEYSTORE_PASSWORD")
    .orElse(providers.environmentVariable("NANA_SMS_KEYSTORE_PASSWORD"))
val releaseKeyAlias = providers.gradleProperty("NANA_SMS_KEY_ALIAS")
    .orElse(providers.environmentVariable("NANA_SMS_KEY_ALIAS"))
val releaseKeyPassword = providers.gradleProperty("NANA_SMS_KEY_PASSWORD")
    .orElse(providers.environmentVariable("NANA_SMS_KEY_PASSWORD"))

android {
    namespace = "com.nanainter.smssender"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.nanainter.smssender"
        minSdk = 23
        targetSdk = 35
        versionCode = 7
        versionName = "1.3.3"
        buildConfigField("String", "SMS_DEVICE_API_KEY", "\"${deviceApiKey.get()}\"")
    }
    signingConfigs {
        create("nanaRelease") {
            if (releaseStoreFile.isPresent) storeFile = file(releaseStoreFile.get())
            if (releaseStorePassword.isPresent) storePassword = releaseStorePassword.get()
            if (releaseKeyAlias.isPresent) keyAlias = releaseKeyAlias.get()
            if (releaseKeyPassword.isPresent) keyPassword = releaseKeyPassword.get()
        }
    }
    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("nanaRelease")
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures { buildConfig = true }
}

kotlin {
    jvmToolchain(17)
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}
