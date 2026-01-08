package com.roleplaychat.app.sdlocal;

import android.graphics.Bitmap;
import android.graphics.Color;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import java.io.File;
import java.io.FileOutputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

/**
 * Module Stable Diffusion Local - v3.1
 * 
 * STATUT: En développement
 * - Le module natif se charge correctement
 * - Le téléchargement du modèle fonctionne
 * - La génération d'images n'est PAS encore implémentée
 * - Freebox est utilisée comme fallback
 */
public class StableDiffusionModule extends ReactContextBaseJavaModule {
    private static final String TAG = "SDLocal";
    private static final String MODELS_DIR = "sd_models";
    private static final String MODEL_FILE = "sd_turbo.safetensors";
    
    private ReactApplicationContext context;
    private boolean moduleReady = true; // Le module se charge toujours
    private boolean modelDownloaded = false;
    private long modelSizeMB = 0;

    public StableDiffusionModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.context = reactContext;
        
        Log.i(TAG, "===========================================");
        Log.i(TAG, "🎨 StableDiffusionModule v3.1 initializing");
        Log.i(TAG, "===========================================");
        
        // Vérifier si le modèle est téléchargé
        checkModelStatus();
    }

    private void checkModelStatus() {
        try {
            File modelsDir = getModelsDirectory();
            File modelFile = new File(modelsDir, MODEL_FILE);
            
            if (modelFile.exists()) {
                long size = modelFile.length();
                if (size > 100 * 1024 * 1024) { // > 100 MB
                    modelDownloaded = true;
                    modelSizeMB = size / 1024 / 1024;
                    Log.i(TAG, "✅ Modèle trouvé: " + modelSizeMB + " MB");
                } else {
                    Log.w(TAG, "⚠️ Modèle trop petit: " + size + " bytes");
                }
            } else {
                Log.i(TAG, "📥 Modèle non téléchargé");
            }
        } catch (Exception e) {
            Log.e(TAG, "Erreur vérification modèle", e);
        }
    }

    @Override
    public String getName() {
        return "StableDiffusionLocal";
    }

    /**
     * Vérifie la disponibilité du service SD Local
     */
    @ReactMethod
    public void isModelAvailable(Promise promise) {
        try {
            // Re-vérifier le statut
            checkModelStatus();
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("available", modelDownloaded);
            result.putBoolean("onnxRuntime", false); // ONNX pas utilisé pour l'instant
            result.putBoolean("moduleLoaded", true); // Le module se charge
            result.putBoolean("modelDownloaded", modelDownloaded);
            result.putDouble("sizeMB", modelSizeMB);
            result.putString("modelPath", new File(getModelsDirectory(), MODEL_FILE).getAbsolutePath());
            result.putString("status", getStatusMessage());
            
            Log.i(TAG, "Status: moduleLoaded=true, modelDownloaded=" + modelDownloaded);
            
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error checking availability", e);
            WritableMap result = Arguments.createMap();
            result.putBoolean("available", false);
            result.putBoolean("moduleLoaded", true);
            result.putString("error", e.getMessage());
            promise.resolve(result);
        }
    }

    private String getStatusMessage() {
        if (!modelDownloaded) {
            return "Modèle non téléchargé. Téléchargez le modèle (~2.5 GB) pour activer.";
        }
        return "Modèle téléchargé (" + modelSizeMB + " MB). Pipeline en développement - Freebox utilisée.";
    }

    /**
     * Retourne les informations système
     */
    @ReactMethod
    public void getSystemInfo(Promise promise) {
        try {
            Runtime runtime = Runtime.getRuntime();
            long maxMemory = runtime.maxMemory();
            long totalMemory = runtime.totalMemory();
            long freeMemory = runtime.freeMemory();
            
            // Espace disque disponible
            File filesDir = context.getFilesDir();
            long freeSpace = filesDir.getFreeSpace() / 1024 / 1024; // MB
            
            WritableMap result = Arguments.createMap();
            result.putDouble("maxMemoryMB", maxMemory / 1024.0 / 1024.0);
            result.putDouble("usedMemoryMB", (totalMemory - freeMemory) / 1024.0 / 1024.0);
            result.putDouble("freeMemoryMB", freeMemory / 1024.0 / 1024.0);
            result.putDouble("freeStorageMB", freeSpace);
            result.putBoolean("canRunSD", maxMemory > 2000000000L && freeSpace > 3000); // > 2 GB RAM, > 3 GB storage
            result.putBoolean("onnxAvailable", false); // Pas encore implémenté
            result.putBoolean("moduleLoaded", true);
            result.putInt("availableProcessors", runtime.availableProcessors());
            
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error getting system info", e);
            WritableMap result = Arguments.createMap();
            result.putBoolean("canRunSD", false);
            result.putBoolean("moduleLoaded", true);
            promise.resolve(result);
        }
    }

    /**
     * Initialise le modèle (placeholder - pas encore implémenté)
     */
    @ReactMethod
    public void initializeModel(Promise promise) {
        checkModelStatus();
        
        if (!modelDownloaded) {
            promise.reject("MODEL_NOT_FOUND", "Modèle non téléchargé. Téléchargez d'abord le modèle.");
            return;
        }
        
        // Pour l'instant, on simule l'initialisation
        Log.i(TAG, "🔄 Initialisation simulée (pipeline non implémenté)");
        promise.resolve("initialized_placeholder");
    }

    /**
     * Génère une image (placeholder - retourne null pour utiliser Freebox)
     */
    @ReactMethod
    public void generateImage(String prompt, String negativePrompt, int steps, double guidanceScale, Promise promise) {
        Log.i(TAG, "🎨 generateImage appelé");
        Log.i(TAG, "📝 Prompt: " + prompt.substring(0, Math.min(50, prompt.length())) + "...");
        
        // Le pipeline n'est pas encore implémenté
        // Retourner null pour que le JS utilise Freebox
        WritableMap result = Arguments.createMap();
        result.putBoolean("success", false);
        result.putString("status", "not_implemented");
        result.putString("message", "Pipeline local non implémenté. Utilisation de Freebox.");
        result.putNull("imagePath");
        
        promise.resolve(result);
    }

    /**
     * Libère les ressources
     */
    @ReactMethod
    public void releaseModel(Promise promise) {
        Log.i(TAG, "✅ releaseModel appelé");
        promise.resolve("released");
    }

    /**
     * Retourne le dossier des modèles
     */
    private File getModelsDirectory() {
        File dir = new File(context.getFilesDir(), MODELS_DIR);
        if (!dir.exists()) {
            dir.mkdirs();
        }
        return dir;
    }

    /**
     * Constantes exportées vers JavaScript
     */
    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("MODULE_LOADED", true);
        constants.put("MODEL_FILE", MODEL_FILE);
        constants.put("MODELS_DIR", MODELS_DIR);
        constants.put("PIPELINE_IMPLEMENTED", false); // Pas encore implémenté
        constants.put("VERSION", "3.1");
        return constants;
    }
}
