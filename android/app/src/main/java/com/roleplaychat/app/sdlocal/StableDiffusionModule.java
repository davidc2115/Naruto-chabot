package com.roleplaychat.app.sdlocal;

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

/**
 * Module natif Android pour Stable Diffusion Local
 * Version simplifiée - vérifie juste la présence du modèle
 */
public class StableDiffusionModule extends ReactContextBaseJavaModule {
    private static final String TAG = "StableDiffusionLocal";
    private static final String MODEL_NAME = "sd_turbo.safetensors";
    private static final int IMAGE_SIZE = 512;
    
    private ReactApplicationContext reactContext;
    private boolean isModelLoaded = false;
    private boolean onnxAvailable = false;
    
    public StableDiffusionModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        Log.i(TAG, "✅ StableDiffusionModule créé");
        
        // Vérifier si ONNX Runtime est disponible
        try {
            Class.forName("ai.onnxruntime.OrtEnvironment");
            onnxAvailable = true;
            Log.i(TAG, "✅ ONNX Runtime disponible");
        } catch (ClassNotFoundException e) {
            onnxAvailable = false;
            Log.w(TAG, "⚠️ ONNX Runtime non disponible");
        }
    }

    @Override
    public String getName() {
        return "StableDiffusionLocal";
    }

    /**
     * Vérifie si le modèle SD est disponible localement
     */
    @ReactMethod
    public void isModelAvailable(Promise promise) {
        try {
            File modelFile = getModelFile();
            boolean exists = modelFile.exists();
            long size = exists ? modelFile.length() : 0;
            boolean available = exists && size > 100000000; // > 100 MB
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("available", available);
            result.putString("path", modelFile.getAbsolutePath());
            result.putDouble("sizeMB", size / 1024.0 / 1024.0);
            result.putBoolean("onnxAvailable", onnxAvailable);
            
            Log.i(TAG, "Model check: exists=" + exists + ", size=" + (size/1024/1024) + "MB, available=" + available);
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error checking model", e);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("available", false);
            result.putString("path", "");
            result.putDouble("sizeMB", 0);
            result.putBoolean("onnxAvailable", onnxAvailable);
            result.putString("error", e.getMessage());
            promise.resolve(result);
        }
    }

    /**
     * Retourne les infos système (RAM, etc.)
     */
    @ReactMethod
    public void getSystemInfo(Promise promise) {
        try {
            Runtime runtime = Runtime.getRuntime();
            long maxMemory = runtime.maxMemory();
            long totalMemory = runtime.totalMemory();
            long freeMemory = runtime.freeMemory();
            long usedMemory = totalMemory - freeMemory;
            
            WritableMap result = Arguments.createMap();
            result.putDouble("maxMemoryMB", maxMemory / 1024.0 / 1024.0);
            result.putDouble("totalMemoryMB", totalMemory / 1024.0 / 1024.0);
            result.putDouble("usedMemoryMB", usedMemory / 1024.0 / 1024.0);
            result.putDouble("freeMemoryMB", freeMemory / 1024.0 / 1024.0);
            result.putBoolean("canRunSD", maxMemory > 2000000000L); // > 2 GB
            result.putBoolean("onnxAvailable", onnxAvailable);
            
            Log.i(TAG, String.format("System RAM: %.0f MB max, ONNX: %s", 
                maxMemory / 1024.0 / 1024.0, onnxAvailable));
            
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error getting system info", e);
            
            WritableMap result = Arguments.createMap();
            result.putDouble("maxMemoryMB", 0);
            result.putBoolean("canRunSD", false);
            result.putBoolean("onnxAvailable", false);
            promise.resolve(result);
        }
    }

    /**
     * Initialise le modèle (placeholder pour maintenant)
     */
    @ReactMethod
    public void initializeModel(Promise promise) {
        if (!onnxAvailable) {
            promise.reject("ONNX_NOT_AVAILABLE", "ONNX Runtime n'est pas disponible sur cet appareil");
            return;
        }
        
        File modelFile = getModelFile();
        if (!modelFile.exists()) {
            promise.reject("MODEL_NOT_FOUND", "Modèle non trouvé. Téléchargez-le d'abord.");
            return;
        }
        
        // Pour l'instant, on simule le chargement
        isModelLoaded = true;
        Log.i(TAG, "Model initialized (simulation)");
        promise.resolve("loaded");
    }

    /**
     * Génère une image (placeholder - retourne null pour fallback Freebox)
     */
    @ReactMethod
    public void generateImage(String prompt, String negativePrompt, int steps, double guidanceScale, Promise promise) {
        // Retourne null pour que le fallback Freebox soit utilisé
        Log.i(TAG, "generateImage called - returning null for Freebox fallback");
        
        WritableMap result = Arguments.createMap();
        result.putString("status", "not_implemented");
        result.putString("message", "Pipeline ONNX non implémenté. Utilisation de Freebox.");
        result.putNull("imagePath");
        promise.resolve(result);
    }

    /**
     * Libère les ressources
     */
    @ReactMethod
    public void releaseModel(Promise promise) {
        isModelLoaded = false;
        Log.i(TAG, "Model released");
        promise.resolve("released");
    }

    /**
     * Retourne le chemin du fichier modèle
     */
    private File getModelFile() {
        // Chemins possibles
        String[] paths = {
            reactContext.getFilesDir().getAbsolutePath() + "/sd_models/" + MODEL_NAME,
            reactContext.getCacheDir().getAbsolutePath() + "/sd_models/" + MODEL_NAME,
        };
        
        for (String path : paths) {
            File file = new File(path);
            if (file.exists()) {
                return file;
            }
        }
        
        // Chemin par défaut
        File modelsDir = new File(reactContext.getFilesDir(), "sd_models");
        if (!modelsDir.exists()) {
            modelsDir.mkdirs();
        }
        return new File(modelsDir, MODEL_NAME);
    }

    /**
     * Constantes exportées vers React Native
     */
    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("MODEL_NAME", MODEL_NAME);
        constants.put("IMAGE_SIZE", IMAGE_SIZE);
        constants.put("RECOMMENDED_STEPS", 2);
        constants.put("MODEL_SIZE_MB", 2500);
        constants.put("ONNX_AVAILABLE", onnxAvailable);
        return constants;
    }
}
