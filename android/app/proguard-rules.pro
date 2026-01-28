# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ONNX Runtime - Garder toutes les classes
-keep class ai.onnxruntime.** { *; }
-keepclassmembers class ai.onnxruntime.** { *; }
-dontwarn ai.onnxruntime.**

# Stable Diffusion Local Module
-keep class com.roleplaychat.app.sdlocal.** { *; }
-keepclassmembers class com.roleplaychat.app.sdlocal.** { *; }

# Garder les méthodes natives
-keepclasseswithmembernames class * {
    native <methods>;
}

# Garder les annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses,EnclosingMethod

# Add any project specific keep options here:
