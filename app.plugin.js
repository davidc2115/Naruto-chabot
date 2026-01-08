const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Plugin Expo pour :
 * 1. Configurer le network_security_config (HTTP cleartext)
 * 2. Enregistrer le module natif StableDiffusionLocal
 */
module.exports = function withCustomConfig(config) {
  
  // 1. Modifier AndroidManifest pour network_security_config
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];
    
    application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    application.$['android:usesCleartextTraffic'] = 'true';
    
    console.log('✅ Plugin: AndroidManifest modifié pour cleartext');
    return config;
  });

  // 2. Créer le fichier network_security_config.xml
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resXmlPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/xml'
      );
      
      if (!fs.existsSync(resXmlPath)) {
        fs.mkdirSync(resXmlPath, { recursive: true });
      }
      
      const networkSecurityConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">192.168.0.0</domain>
        <domain includeSubdomains="true">192.168.1.0</domain>
        <domain includeSubdomains="true">88.174.155.230</domain>
    </domain-config>
</network-security-config>`;
      
      const configPath = path.join(resXmlPath, 'network_security_config.xml');
      fs.writeFileSync(configPath, networkSecurityConfig, 'utf-8');
      console.log('✅ Plugin: network_security_config.xml créé');
      
      return config;
    },
  ]);

  // 3. Copier les fichiers du module SD Local
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const sdLocalDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java/com/roleplaychat/app/sdlocal'
      );
      
      if (!fs.existsSync(sdLocalDir)) {
        fs.mkdirSync(sdLocalDir, { recursive: true });
        console.log('✅ Plugin: Dossier sdlocal créé');
      }
      
      // Créer StableDiffusionModule.java
      const moduleContent = `package com.roleplaychat.app.sdlocal;

import android.os.Build;
import android.os.Environment;
import android.os.StatFs;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

import javax.annotation.Nonnull;

public class StableDiffusionModule extends ReactContextBaseJavaModule {
    private static final String TAG = "SDLocalModule";
    private static final String MODULE_NAME = "StableDiffusionLocal";
    private static final String VERSION = "3.2";
    private static final String MODELS_DIR = "sd_models";
    private static final String MODEL_FILE = "sd_turbo.safetensors";
    
    private final ReactApplicationContext reactContext;

    public StableDiffusionModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        Log.i(TAG, "╔════════════════════════════════════════╗");
        Log.i(TAG, "║  StableDiffusionModule v" + VERSION + " LOADED   ║");
        Log.i(TAG, "╚════════════════════════════════════════╝");
    }

    @Override
    @Nonnull
    public String getName() {
        return MODULE_NAME;
    }

    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("MODULE_NAME", MODULE_NAME);
        constants.put("VERSION", VERSION);
        constants.put("MODEL_FILE", MODEL_FILE);
        constants.put("IS_LOADED", true);
        constants.put("PIPELINE_READY", false);
        constants.put("DEVICE_MODEL", Build.MODEL);
        constants.put("ANDROID_VERSION", Build.VERSION.RELEASE);
        return constants;
    }

    @ReactMethod
    public void isModelAvailable(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            result.putBoolean("moduleLoaded", true);
            result.putString("moduleVersion", VERSION);
            
            File modelFile = getModelFile();
            boolean modelExists = modelFile != null && modelFile.exists();
            long modelSize = modelExists ? modelFile.length() : 0;
            
            result.putBoolean("modelDownloaded", modelExists && modelSize > 100 * 1024 * 1024);
            result.putDouble("sizeMB", modelSize / 1024.0 / 1024.0);
            result.putString("modelPath", modelFile != null ? modelFile.getAbsolutePath() : "N/A");
            result.putBoolean("available", modelExists && modelSize > 100 * 1024 * 1024);
            result.putBoolean("pipelineReady", false);
            
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error in isModelAvailable", e);
            WritableMap result = Arguments.createMap();
            result.putBoolean("moduleLoaded", true);
            result.putBoolean("available", false);
            result.putString("error", e.getMessage());
            promise.resolve(result);
        }
    }

    @ReactMethod
    public void getSystemInfo(Promise promise) {
        try {
            Runtime runtime = Runtime.getRuntime();
            long maxMemory = runtime.maxMemory();
            long freeMemory = runtime.freeMemory();
            
            StatFs stat = new StatFs(Environment.getDataDirectory().getPath());
            long availableBytes = stat.getAvailableBytes();
            
            WritableMap result = Arguments.createMap();
            result.putDouble("maxMemoryMB", maxMemory / 1024.0 / 1024.0);
            result.putDouble("freeMemoryMB", freeMemory / 1024.0 / 1024.0);
            result.putDouble("freeStorageMB", availableBytes / 1024.0 / 1024.0);
            result.putInt("availableProcessors", runtime.availableProcessors());
            result.putBoolean("canRunSD", maxMemory > 2L * 1024 * 1024 * 1024);
            result.putBoolean("moduleLoaded", true);
            result.putString("moduleVersion", VERSION);
            result.putString("deviceModel", Build.MODEL);
            result.putString("androidVersion", Build.VERSION.RELEASE);
            
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error in getSystemInfo", e);
            WritableMap result = Arguments.createMap();
            result.putBoolean("moduleLoaded", true);
            result.putBoolean("canRunSD", false);
            promise.resolve(result);
        }
    }

    @ReactMethod
    public void initializeModel(Promise promise) {
        File modelFile = getModelFile();
        if (modelFile == null || !modelFile.exists()) {
            promise.reject("MODEL_NOT_FOUND", "Model not downloaded");
            return;
        }
        WritableMap result = Arguments.createMap();
        result.putBoolean("success", true);
        result.putString("status", "initialized_placeholder");
        promise.resolve(result);
    }

    @ReactMethod
    public void generateImage(String prompt, String negativePrompt, int steps, double guidanceScale, Promise promise) {
        WritableMap result = Arguments.createMap();
        result.putBoolean("success", false);
        result.putString("status", "not_implemented");
        result.putNull("imagePath");
        promise.resolve(result);
    }

    @ReactMethod
    public void releaseModel(Promise promise) {
        promise.resolve("released");
    }

    private File getModelFile() {
        try {
            File filesDir = reactContext.getFilesDir();
            File modelDir = new File(filesDir, MODELS_DIR);
            return new File(modelDir, MODEL_FILE);
        } catch (Exception e) {
            return null;
        }
    }
}`;
      
      fs.writeFileSync(path.join(sdLocalDir, 'StableDiffusionModule.java'), moduleContent);
      console.log('✅ Plugin: StableDiffusionModule.java créé');
      
      // Créer StableDiffusionPackage.java
      const packageContent = `package com.roleplaychat.app.sdlocal;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class StableDiffusionPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new StableDiffusionModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}`;
      
      fs.writeFileSync(path.join(sdLocalDir, 'StableDiffusionPackage.java'), packageContent);
      console.log('✅ Plugin: StableDiffusionPackage.java créé');
      
      return config;
    },
  ]);

  // 4. Modifier MainApplication.kt pour ajouter le package
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const mainAppPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java/com/roleplaychat/app/MainApplication.kt'
      );
      
      if (fs.existsSync(mainAppPath)) {
        let content = fs.readFileSync(mainAppPath, 'utf-8');
        
        // Ajouter l'import si absent
        if (!content.includes('import com.roleplaychat.app.sdlocal.StableDiffusionPackage')) {
          content = content.replace(
            'import expo.modules.ReactNativeHostWrapper',
            'import expo.modules.ReactNativeHostWrapper\nimport com.roleplaychat.app.sdlocal.StableDiffusionPackage'
          );
        }
        
        // Ajouter le package si absent
        if (!content.includes('StableDiffusionPackage()')) {
          content = content.replace(
            'val packages = PackageList(this).packages.toMutableList()',
            'val packages = PackageList(this).packages.toMutableList()\n        packages.add(StableDiffusionPackage())'
          );
        }
        
        fs.writeFileSync(mainAppPath, content);
        console.log('✅ Plugin: MainApplication.kt modifié pour inclure StableDiffusionPackage');
      }
      
      return config;
    },
  ]);

  // 5. Modifier build.gradle pour ajouter les dépendances
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const buildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        'app/build.gradle'
      );
      
      if (fs.existsSync(buildGradlePath)) {
        let content = fs.readFileSync(buildGradlePath, 'utf-8');
        
        // Ajouter ONNX Runtime si absent
        if (!content.includes('onnxruntime-android')) {
          content = content.replace(
            'implementation("com.facebook.react:react-android")',
            'implementation("com.facebook.react:react-android")\n    \n    // ONNX Runtime pour Stable Diffusion Local\n    implementation "com.microsoft.onnxruntime:onnxruntime-android:1.17.0"'
          );
          fs.writeFileSync(buildGradlePath, content);
          console.log('✅ Plugin: build.gradle modifié pour inclure ONNX Runtime');
        }
      }
      
      return config;
    },
  ]);

  return config;
};
