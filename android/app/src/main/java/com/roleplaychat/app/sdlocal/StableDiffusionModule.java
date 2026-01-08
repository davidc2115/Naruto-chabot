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
import java.nio.FloatBuffer;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

/**
 * Module Stable Diffusion Local - Pipeline ONNX Mobile
 * Utilise ONNX Runtime pour génération d'images sur smartphone
 */
public class StableDiffusionModule extends ReactContextBaseJavaModule {
    private static final String TAG = "SDLocal";
    private static final String MODELS_DIR = "sd_models";
    private static final String UNET_MODEL = "unet.onnx";
    private static final String VAE_MODEL = "vae_decoder.onnx"; 
    private static final String TEXT_ENCODER_MODEL = "text_encoder.onnx";
    
    private ReactApplicationContext context;
    private boolean onnxAvailable = false;
    private boolean modelsLoaded = false;
    
    // ONNX Runtime objects (loaded dynamically)
    private Object ortEnvironment = null;
    private Object unetSession = null;
    private Object vaeSession = null;
    private Object textEncoderSession = null;

    public StableDiffusionModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.context = reactContext;
        
        Log.i(TAG, "===========================================");
        Log.i(TAG, "🎨 StableDiffusionModule initializing...");
        Log.i(TAG, "===========================================");
        
        // Vérifier ONNX Runtime
        checkOnnxAvailability();
    }

    private void checkOnnxAvailability() {
        try {
            Class<?> ortEnvClass = Class.forName("ai.onnxruntime.OrtEnvironment");
            java.lang.reflect.Method getEnvMethod = ortEnvClass.getMethod("getEnvironment");
            ortEnvironment = getEnvMethod.invoke(null);
            onnxAvailable = true;
            Log.i(TAG, "✅ ONNX Runtime disponible et chargé");
        } catch (Exception e) {
            onnxAvailable = false;
            Log.e(TAG, "❌ ONNX Runtime non disponible: " + e.getMessage());
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
            File modelsDir = getModelsDirectory();
            File unetFile = new File(modelsDir, UNET_MODEL);
            File vaeFile = new File(modelsDir, VAE_MODEL);
            
            boolean unetExists = unetFile.exists() && unetFile.length() > 1000000;
            boolean vaeExists = vaeFile.exists() && vaeFile.length() > 1000000;
            boolean allModelsPresent = unetExists && vaeExists;
            
            long totalSize = 0;
            if (unetExists) totalSize += unetFile.length();
            if (vaeExists) totalSize += vaeFile.length();
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("available", onnxAvailable && allModelsPresent);
            result.putBoolean("onnxRuntime", onnxAvailable);
            result.putBoolean("unetModel", unetExists);
            result.putBoolean("vaeModel", vaeExists);
            result.putDouble("sizeMB", totalSize / 1024.0 / 1024.0);
            result.putString("modelsPath", modelsDir.getAbsolutePath());
            
            Log.i(TAG, String.format("Status: ONNX=%s, UNet=%s, VAE=%s", 
                onnxAvailable, unetExists, vaeExists));
            
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error checking availability", e);
            WritableMap result = Arguments.createMap();
            result.putBoolean("available", false);
            result.putString("error", e.getMessage());
            promise.resolve(result);
        }
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
            
            WritableMap result = Arguments.createMap();
            result.putDouble("maxMemoryMB", maxMemory / 1024.0 / 1024.0);
            result.putDouble("usedMemoryMB", (totalMemory - freeMemory) / 1024.0 / 1024.0);
            result.putDouble("freeMemoryMB", freeMemory / 1024.0 / 1024.0);
            result.putBoolean("canRunSD", maxMemory > 3000000000L); // > 3 GB
            result.putBoolean("onnxAvailable", onnxAvailable);
            result.putInt("availableProcessors", runtime.availableProcessors());
            
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error getting system info", e);
            WritableMap result = Arguments.createMap();
            result.putBoolean("canRunSD", false);
            result.putBoolean("onnxAvailable", false);
            promise.resolve(result);
        }
    }

    /**
     * Initialise les modèles ONNX
     */
    @ReactMethod
    public void initializeModel(Promise promise) {
        if (!onnxAvailable) {
            promise.reject("ONNX_ERROR", "ONNX Runtime non disponible sur cet appareil");
            return;
        }
        
        try {
            File modelsDir = getModelsDirectory();
            File unetFile = new File(modelsDir, UNET_MODEL);
            File vaeFile = new File(modelsDir, VAE_MODEL);
            
            if (!unetFile.exists() || !vaeFile.exists()) {
                promise.reject("MODELS_NOT_FOUND", "Modèles non téléchargés. Téléchargez d'abord les modèles.");
                return;
            }
            
            Log.i(TAG, "🔄 Chargement des modèles ONNX...");
            
            // Charger les sessions ONNX via reflection
            Class<?> ortSessionClass = Class.forName("ai.onnxruntime.OrtSession");
            Class<?> ortEnvClass = Class.forName("ai.onnxruntime.OrtEnvironment");
            Class<?> sessionOptionsClass = Class.forName("ai.onnxruntime.OrtSession$SessionOptions");
            
            Object sessionOptions = sessionOptionsClass.getConstructor().newInstance();
            
            // Optimisations
            java.lang.reflect.Method setThreads = sessionOptionsClass.getMethod("setIntraOpNumThreads", int.class);
            setThreads.invoke(sessionOptions, 4);
            
            // Créer les sessions
            java.lang.reflect.Method createSession = ortEnvClass.getMethod("createSession", String.class, sessionOptionsClass);
            
            unetSession = createSession.invoke(ortEnvironment, unetFile.getAbsolutePath(), sessionOptions);
            Log.i(TAG, "✅ UNet chargé");
            
            vaeSession = createSession.invoke(ortEnvironment, vaeFile.getAbsolutePath(), sessionOptions);
            Log.i(TAG, "✅ VAE chargé");
            
            modelsLoaded = true;
            promise.resolve("loaded");
            
        } catch (Exception e) {
            Log.e(TAG, "Erreur chargement modèles", e);
            promise.reject("LOAD_ERROR", e.getMessage());
        }
    }

    /**
     * Génère une image avec le pipeline SD
     */
    @ReactMethod
    public void generateImage(String prompt, String negativePrompt, int steps, double guidanceScale, Promise promise) {
        if (!onnxAvailable) {
            // Retourner null pour fallback Freebox
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("error", "ONNX non disponible");
            result.putNull("imagePath");
            promise.resolve(result);
            return;
        }
        
        if (!modelsLoaded) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("error", "Modèles non chargés");
            result.putNull("imagePath");
            promise.resolve(result);
            return;
        }
        
        try {
            Log.i(TAG, "🎨 Génération: " + prompt.substring(0, Math.min(50, prompt.length())) + "...");
            
            // Pour l'instant, générer une image placeholder colorée
            // Le vrai pipeline ONNX nécessite plus d'implémentation
            String imagePath = generatePlaceholderImage(prompt);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("imagePath", imagePath);
            result.putString("message", "Image générée (mode test)");
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Erreur génération", e);
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
            result.putNull("imagePath");
            promise.resolve(result);
        }
    }

    /**
     * Génère une image placeholder (pour test)
     */
    private String generatePlaceholderImage(String prompt) throws Exception {
        int size = 512;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        
        // Générer une image colorée basée sur le hash du prompt
        Random random = new Random(prompt.hashCode());
        int baseColor = Color.rgb(
            random.nextInt(200) + 55,
            random.nextInt(200) + 55,
            random.nextInt(200) + 55
        );
        
        for (int y = 0; y < size; y++) {
            for (int x = 0; x < size; x++) {
                float noise = (float) Math.sin(x * 0.02 + random.nextFloat()) * 
                              (float) Math.cos(y * 0.02 + random.nextFloat()) * 30;
                int r = Math.max(0, Math.min(255, Color.red(baseColor) + (int) noise));
                int g = Math.max(0, Math.min(255, Color.green(baseColor) + (int) noise));
                int b = Math.max(0, Math.min(255, Color.blue(baseColor) + (int) noise));
                bitmap.setPixel(x, y, Color.rgb(r, g, b));
            }
        }
        
        // Sauvegarder
        File outputDir = new File(context.getCacheDir(), "sd_output");
        if (!outputDir.exists()) outputDir.mkdirs();
        
        String filename = "sd_" + System.currentTimeMillis() + ".png";
        File outputFile = new File(outputDir, filename);
        
        FileOutputStream fos = new FileOutputStream(outputFile);
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos);
        fos.close();
        bitmap.recycle();
        
        Log.i(TAG, "Image sauvegardée: " + outputFile.getAbsolutePath());
        return outputFile.getAbsolutePath();
    }

    /**
     * Libère les ressources
     */
    @ReactMethod
    public void releaseModel(Promise promise) {
        try {
            if (unetSession != null) {
                java.lang.reflect.Method close = unetSession.getClass().getMethod("close");
                close.invoke(unetSession);
                unetSession = null;
            }
            if (vaeSession != null) {
                java.lang.reflect.Method close = vaeSession.getClass().getMethod("close");
                close.invoke(vaeSession);
                vaeSession = null;
            }
            modelsLoaded = false;
            Log.i(TAG, "✅ Modèles libérés");
            promise.resolve("released");
        } catch (Exception e) {
            Log.e(TAG, "Erreur libération", e);
            promise.resolve("released");
        }
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
     * Constantes exportées
     */
    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("ONNX_AVAILABLE", onnxAvailable);
        constants.put("UNET_MODEL", UNET_MODEL);
        constants.put("VAE_MODEL", VAE_MODEL);
        constants.put("MODELS_DIR", MODELS_DIR);
        return constants;
    }
}
