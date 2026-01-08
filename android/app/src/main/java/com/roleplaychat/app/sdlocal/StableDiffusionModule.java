package com.roleplaychat.app.sdlocal;

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
}