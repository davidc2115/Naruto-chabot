import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    kotlin("jvm") version "1.9.24"
    id("java-gradle-plugin")
}

repositories {
    mavenCentral()
    maven { url = uri("https://maven.aliyun.com/repository/central") }
    maven { url = uri("https://maven.aliyun.com/repository/public") }
    maven { url = uri("https://repo.huaweicloud.com/repository/maven/") }
    maven { url = uri("https://jitpack.io") }
}

gradlePlugin {
    plugins {
        create("reactSettingsPlugin") {
            id = "com.facebook.react.settings"
            implementationClass = "expo.plugins.ReactSettingsPlugin"
        }
    }
}
