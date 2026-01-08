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

/**
 * Module Stable Diffusion Local - v3.2
 * 
 * Ce module est TOUJOURS chargé. Le statut "disponible" dépend de:
 * - La présence du modèle téléchargé
 * - Les ressources système (RAM, stockage)
 */
public class StableDiffusionModule extends ReactContextBaseJavaModule {
    private static final String TAG = "SDLocalModule";
    private static final String MODULE_NAME = "StableDiffusionLocal";
    private static final String VERSION = "3.2";
    
    // Dossier et fichier du modèle
    private static final String MODELS_DIR = "sd_models";
    private static final String MODEL_FILE = "sd_turbo.safetensors";
    
    private final ReactApplicationContext reactContext;

    public StableDiffusionModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        
        // Log au démarrage pour confirmer que le module est chargé
        Log.i(TAG, "╔════════════════════════════════════════╗");
        Log.i(TAG, "║  StableDiffusionModule v" + VERSION + " LOADED   ║");
        Log.i(TAG, "╚════════════════════════════════════════╝");
        Log.i(TAG, "📱 Device: " + Build.MANUFACTURER + " " + Build.MODEL);
        Log.i(TAG, "📱 Android: " + Build.VERSION.RELEASE + " (SDK " + Build.VERSION.SDK_INT + ")");
    }

    @Override
    @Nonnull
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Constantes exportées vers JavaScript
     * Ces valeurs sont disponibles immédiatement côté JS
     */
    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("MODULE_NAME", MODULE_NAME);
        constants.put("VERSION", VERSION);
        constants.put("MODEL_FILE", MODEL_FILE);
        constants.put("MODELS_DIR", MODELS_DIR);
        constants.put("IS_LOADED", true);  // Toujours true si ce code s'exécute
        constants.put("PIPELINE_READY", false);  // Pipeline pas encore implémenté
        
        // Info appareil
        constants.put("DEVICE_MODEL", Build.MODEL);
        constants.put("ANDROID_VERSION", Build.VERSION.RELEASE);
        constants.put("SDK_VERSION", Build.VERSION.SDK_INT);
        
        Log.i(TAG, "getConstants() called - module is working!");
        return constants;
    }

    /**
     * Vérifie si le modèle est disponible
     */
    @ReactMethod
    public void isModelAvailable(Promise promise) {
        Log.i(TAG, "isModelAvailable() called");
        
        try {
            WritableMap result = Arguments.createMap();
            
            // Le module est TOUJOURS chargé si cette méthode est appelée
            result.putBoolean("moduleLoaded", true);
            result.putString("moduleVersion", VERSION);
            
            // Vérifier le modèle
            File modelFile = getModelFile();
            boolean modelExists = modelFile != null && modelFile.exists();
            long modelSize = modelExists ? modelFile.length() : 0;
            double modelSizeMB = modelSize / 1024.0 / 1024.0;
            
            result.putBoolean("modelDownloaded", modelExists && modelSize > 100 * 1024 * 1024);
            result.putDouble("sizeMB", modelSizeMB);
            result.putString("modelPath", modelFile != null ? modelFile.getAbsolutePath() : "N/A");
            
            // Statut global
            result.putBoolean("available", modelExists && modelSize > 100 * 1024 * 1024);
            result.putBoolean("pipelineReady", false);
            
            String status = modelExists 
                ? "Modèle présent (" + String.format("%.1f", modelSizeMB) + " MB)"
                : "Modèle non téléchargé";
            result.putString("status", status);
            
            Log.i(TAG, "Status: " + status);
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Error in isModelAvailable", e);
            WritableMap result = Arguments.createMap();
            result.putBoolean("moduleLoaded", true);
            result.putBoolean("modelDownloaded", false);
            result.putBoolean("available", false);
            result.putString("error", e.getMessage());
            promise.resolve(result);
        }
    }

    /**
     * Retourne les informations système détaillées
     */
    @ReactMethod
    public void getSystemInfo(Promise promise) {
        Log.i(TAG, "getSystemInfo() called");
        
        try {
            Runtime runtime = Runtime.getRuntime();
            
            // Mémoire
            long maxMemory = runtime.maxMemory();
            long totalMemory = runtime.totalMemory();
            long freeMemory = runtime.freeMemory();
            long usedMemory = totalMemory - freeMemory;
            
            // Stockage
            StatFs stat = new StatFs(Environment.getDataDirectory().getPath());
            long availableBytes = stat.getAvailableBytes();
            long totalBytes = stat.getTotalBytes();
            
            WritableMap result = Arguments.createMap();
            
            // Mémoire en MB
            result.putDouble("maxMemoryMB", maxMemory / 1024.0 / 1024.0);
            result.putDouble("totalMemoryMB", totalMemory / 1024.0 / 1024.0);
            result.putDouble("usedMemoryMB", usedMemory / 1024.0 / 1024.0);
            result.putDouble("freeMemoryMB", freeMemory / 1024.0 / 1024.0);
            
            // Stockage en MB
            result.putDouble("freeStorageMB", availableBytes / 1024.0 / 1024.0);
            result.putDouble("totalStorageMB", totalBytes / 1024.0 / 1024.0);
            
            // Processeur
            result.putInt("availableProcessors", runtime.availableProcessors());
            
            // Peut-on exécuter SD?
            // Besoin de ~2GB RAM et ~3GB stockage libre
            boolean canRunSD = (maxMemory > 2L * 1024 * 1024 * 1024) && 
                               (availableBytes > 3L * 1024 * 1024 * 1024);
            result.putBoolean("canRunSD", canRunSD);
            
            // Le module est toujours chargé
            result.putBoolean("moduleLoaded", true);
            result.putString("moduleVersion", VERSION);
            
            // Info appareil
            result.putString("deviceModel", Build.MODEL);
            result.putString("androidVersion", Build.VERSION.RELEASE);
            
            Log.i(TAG, String.format("RAM: %.0f MB max, Storage: %.0f MB free, canRunSD: %s",
                maxMemory / 1024.0 / 1024.0,
                availableBytes / 1024.0 / 1024.0,
                canRunSD));
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Error in getSystemInfo", e);
            WritableMap result = Arguments.createMap();
            result.putBoolean("moduleLoaded", true);
            result.putBoolean("canRunSD", false);
            result.putString("error", e.getMessage());
            promise.resolve(result);
        }
    }

    /**
     * Initialise le modèle (placeholder pour future implémentation)
     */
    @ReactMethod
    public void initializeModel(Promise promise) {
        Log.i(TAG, "initializeModel() called");
        
        File modelFile = getModelFile();
        if (modelFile == null || !modelFile.exists()) {
            promise.reject("MODEL_NOT_FOUND", "Le modèle n'est pas téléchargé");
            return;
        }
        
        // Pour l'instant, on simule l'initialisation
        // Le vrai pipeline ONNX sera implémenté plus tard
        Log.i(TAG, "Model found at: " + modelFile.getAbsolutePath());
        Log.i(TAG, "Model size: " + (modelFile.length() / 1024 / 1024) + " MB");
        
        WritableMap result = Arguments.createMap();
        result.putBoolean("success", true);
        result.putString("status", "initialized_placeholder");
        result.putString("message", "Module prêt. Pipeline en développement.");
        promise.resolve(result);
    }

    /**
     * Génère une image (retourne null pour forcer le fallback vers Freebox)
     */
    @ReactMethod
    public void generateImage(String prompt, String negativePrompt, int steps, double guidanceScale, Promise promise) {
        Log.i(TAG, "generateImage() called");
        Log.i(TAG, "Prompt: " + (prompt.length() > 50 ? prompt.substring(0, 50) + "..." : prompt));
        
        // Le pipeline n'est pas encore implémenté
        // Retourner un résultat qui indique au JS d'utiliser Freebox
        WritableMap result = Arguments.createMap();
        result.putBoolean("success", false);
        result.putString("status", "not_implemented");
        result.putString("message", "Pipeline local non implémenté. Utilisez Freebox.");
        result.putNull("imagePath");
        
        promise.resolve(result);
    }

    /**
     * Libère les ressources
     */
    @ReactMethod
    public void releaseModel(Promise promise) {
        Log.i(TAG, "releaseModel() called");
        promise.resolve("released");
    }

    /**
     * Retourne le fichier du modèle
     */
    private File getModelFile() {
        try {
            // Essayer plusieurs emplacements possibles
            
            // 1. Dossier files de l'app
            File filesDir = reactContext.getFilesDir();
            File modelDir = new File(filesDir, MODELS_DIR);
            File modelFile = new File(modelDir, MODEL_FILE);
            if (modelFile.exists()) {
                Log.i(TAG, "Model found in filesDir: " + modelFile.getAbsolutePath());
                return modelFile;
            }
            
            // 2. Dossier documents (Expo FileSystem)
            File documentsDir = new File(filesDir.getParentFile(), "files/ExponentExperienceData");
            if (documentsDir.exists()) {
                for (File expDir : documentsDir.listFiles()) {
                    File expModelDir = new File(expDir, "sd_models");
                    File expModelFile = new File(expModelDir, MODEL_FILE);
                    if (expModelFile.exists()) {
                        Log.i(TAG, "Model found in ExponentExperienceData: " + expModelFile.getAbsolutePath());
                        return expModelFile;
                    }
                }
            }
            
            // 3. Retourner le chemin par défaut même s'il n'existe pas
            Log.i(TAG, "Model not found, default path: " + modelFile.getAbsolutePath());
            return modelFile;
            
        } catch (Exception e) {
            Log.e(TAG, "Error getting model file", e);
            return null;
        }
    }
}
