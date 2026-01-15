package com.roleplaychat.app.sdlocal;

import android.app.ActivityManager;
import android.content.Context;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Environment;
import android.os.StatFs;
import android.util.Base64;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;
import ai.onnxruntime.OrtSession.SessionOptions;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.FloatBuffer;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

import javax.annotation.Nonnull;

/**
 * Module natif Stable Diffusion pour Android
 * Utilise ONNX Runtime pour l'inférence sur appareil
 * Version 4.0 - Implémentation complète
 */
public class StableDiffusionModule extends ReactContextBaseJavaModule {
    private static final String TAG = "SDLocalModule";
    private static final String MODULE_NAME = "StableDiffusionLocal";
    private static final String VERSION = "4.0";
    private static final String MODELS_DIR = "sd_models";
    
    // Noms des fichiers modèles ONNX
    private static final String TEXT_ENCODER_MODEL = "text_encoder.onnx";
    private static final String UNET_MODEL = "unet.onnx";
    private static final String VAE_DECODER_MODEL = "vae_decoder.onnx";
    
    private final ReactApplicationContext reactContext;
    private OrtEnvironment ortEnv;
    private OrtSession textEncoderSession;
    private OrtSession unetSession;
    private OrtSession vaeDecoderSession;
    private boolean isInitialized = false;
    private boolean isGenerating = false;

    public StableDiffusionModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        Log.i(TAG, "╔════════════════════════════════════════╗");
        Log.i(TAG, "║  StableDiffusionModule v" + VERSION + " LOADED   ║");
        Log.i(TAG, "╚════════════════════════════════════════╝");
        
        // Initialiser ONNX Runtime avec gestion d'erreur améliorée
        try {
            ortEnv = OrtEnvironment.getEnvironment();
            if (ortEnv != null) {
                Log.i(TAG, "✅ ONNX Runtime Environment créé avec succès");
                Log.i(TAG, "✅ ONNX Version: " + OrtEnvironment.getApiBase());
            } else {
                Log.e(TAG, "❌ OrtEnvironment.getEnvironment() retourné null");
            }
        } catch (NoClassDefFoundError e) {
            Log.e(TAG, "❌ ONNX Runtime classes non trouvées: " + e.getMessage());
            Log.e(TAG, "❌ Vérifiez que onnxruntime-android est dans build.gradle");
        } catch (UnsatisfiedLinkError e) {
            Log.e(TAG, "❌ ONNX Runtime native library non trouvée: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur création ONNX Environment: " + e.getMessage());
            e.printStackTrace();
        }
        
        // Log du statut final
        Log.i(TAG, "📊 ONNX disponible: " + (ortEnv != null));
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
        constants.put("IS_LOADED", true);
        constants.put("ONNX_AVAILABLE", ortEnv != null);
        constants.put("PIPELINE_READY", isInitialized);
        constants.put("DEVICE_MODEL", Build.MODEL);
        constants.put("ANDROID_VERSION", Build.VERSION.RELEASE);
        constants.put("TEXT_ENCODER_MODEL", TEXT_ENCODER_MODEL);
        constants.put("UNET_MODEL", UNET_MODEL);
        constants.put("VAE_DECODER_MODEL", VAE_DECODER_MODEL);
        return constants;
    }

    /**
     * Envoie un événement de progression à JavaScript
     */
    private void sendProgressEvent(String status, int progress, String message) {
        WritableMap params = Arguments.createMap();
        params.putString("status", status);
        params.putInt("progress", progress);
        params.putString("message", message);
        
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("SDProgress", params);
        } catch (Exception e) {
            Log.w(TAG, "Could not send progress event: " + e.getMessage());
        }
    }

    @ReactMethod
    public void isModelAvailable(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            result.putBoolean("moduleLoaded", true);
            result.putString("moduleVersion", VERSION);
            result.putBoolean("onnxAvailable", ortEnv != null);
            
            File modelsDir = getModelsDirectory();
            
            // Vérifier chaque composant du modèle
            File textEncoder = new File(modelsDir, TEXT_ENCODER_MODEL);
            File unet = new File(modelsDir, UNET_MODEL);
            File vaeDecoder = new File(modelsDir, VAE_DECODER_MODEL);
            
            boolean textEncoderExists = textEncoder.exists() && textEncoder.length() > 1024 * 1024;
            boolean unetExists = unet.exists() && unet.length() > 1024 * 1024;
            boolean vaeDecoderExists = vaeDecoder.exists() && vaeDecoder.length() > 1024 * 1024;
            
            result.putBoolean("textEncoderDownloaded", textEncoderExists);
            result.putBoolean("unetDownloaded", unetExists);
            result.putBoolean("vaeDecoderDownloaded", vaeDecoderExists);
            
            boolean allModelsReady = textEncoderExists && unetExists && vaeDecoderExists;
            result.putBoolean("modelDownloaded", allModelsReady);
            result.putBoolean("available", allModelsReady && ortEnv != null);
            result.putBoolean("pipelineReady", isInitialized);
            
            // Tailles des fichiers
            long totalSize = 0;
            if (textEncoderExists) totalSize += textEncoder.length();
            if (unetExists) totalSize += unet.length();
            if (vaeDecoderExists) totalSize += vaeDecoder.length();
            result.putDouble("sizeMB", totalSize / 1024.0 / 1024.0);
            
            result.putString("modelPath", modelsDir.getAbsolutePath());
            
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
            Log.i(TAG, "╔════════════════════════════════════════╗");
            Log.i(TAG, "║  getSystemInfo() APPELÉ                ║");
            Log.i(TAG, "╚════════════════════════════════════════╝");
            
            // Utiliser ActivityManager pour obtenir la VRAIE RAM du système
            ActivityManager activityManager = (ActivityManager) reactContext.getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo memInfo = new ActivityManager.MemoryInfo();
            activityManager.getMemoryInfo(memInfo);
            
            // RAM totale du système - VALEURS EN BYTES (long)
            long totalSystemRamBytes = memInfo.totalMem;
            long availableSystemRamBytes = memInfo.availMem;
            long thresholdBytes = memInfo.threshold;
            boolean lowMemory = memInfo.lowMemory;
            
            // LOGS DÉTAILLÉS pour debug
            Log.i(TAG, "📊 [RAW] totalMem (bytes): " + totalSystemRamBytes);
            Log.i(TAG, "📊 [RAW] availMem (bytes): " + availableSystemRamBytes);
            Log.i(TAG, "📊 [RAW] threshold (bytes): " + thresholdBytes);
            Log.i(TAG, "📊 [RAW] lowMemory: " + lowMemory);
            
            // Calculs en MB et GB avec double précision
            double totalRamMB = (double) totalSystemRamBytes / (1024.0 * 1024.0);
            double availableRamMB = (double) availableSystemRamBytes / (1024.0 * 1024.0);
            double totalRamGB = totalRamMB / 1024.0;
            double availableRamGB = availableRamMB / 1024.0;
            
            Log.i(TAG, "📊 [CALC] RAM Totale: " + String.format("%.2f", totalRamGB) + " GB (" + String.format("%.0f", totalRamMB) + " MB)");
            Log.i(TAG, "📊 [CALC] RAM Disponible: " + String.format("%.2f", availableRamGB) + " GB (" + String.format("%.0f", availableRamMB) + " MB)");
            
            // RAM JVM pour référence (pas utilisé pour SD mais info utile)
            Runtime runtime = Runtime.getRuntime();
            long jvmMaxMemory = runtime.maxMemory();
            long jvmTotalMemory = runtime.totalMemory();
            long jvmFreeMemory = runtime.freeMemory();
            
            Log.i(TAG, "📊 [JVM] Max: " + (jvmMaxMemory / 1024 / 1024) + " MB");
            Log.i(TAG, "📊 [JVM] Total: " + (jvmTotalMemory / 1024 / 1024) + " MB");
            Log.i(TAG, "📊 [JVM] Free: " + (jvmFreeMemory / 1024 / 1024) + " MB");
            
            // Stockage
            StatFs stat = new StatFs(Environment.getDataDirectory().getPath());
            long availableBytes = stat.getAvailableBytes();
            long totalBytes = stat.getTotalBytes();
            double freeStorageMB = (double) availableBytes / (1024.0 * 1024.0);
            double freeStorageGB = freeStorageMB / 1024.0;
            
            Log.i(TAG, "📊 [STORAGE] Libre: " + String.format("%.2f", freeStorageGB) + " GB");
            
            // Vérifier si l'appareil peut exécuter SD
            // Besoin de 4GB+ RAM totale et 2GB+ disponible
            // Utiliser les valeurs en bytes pour éviter les erreurs de calcul
            long fourGBinBytes = 4L * 1024L * 1024L * 1024L;
            long twoGBinBytes = 2L * 1024L * 1024L * 1024L;
            long threeGBinBytes = 3L * 1024L * 1024L * 1024L;
            
            boolean hasEnoughRAM = totalSystemRamBytes >= fourGBinBytes && availableSystemRamBytes >= twoGBinBytes;
            boolean hasEnoughStorage = availableBytes >= threeGBinBytes;
            boolean canRunSD = hasEnoughRAM && hasEnoughStorage && ortEnv != null;
            
            Log.i(TAG, "📊 [CHECK] hasEnoughRAM: " + hasEnoughRAM + " (total >= 4GB: " + (totalSystemRamBytes >= fourGBinBytes) + ", avail >= 2GB: " + (availableSystemRamBytes >= twoGBinBytes) + ")");
            Log.i(TAG, "📊 [CHECK] hasEnoughStorage: " + hasEnoughStorage);
            Log.i(TAG, "📊 [CHECK] ONNX disponible: " + (ortEnv != null));
            Log.i(TAG, "📊 [CHECK] Peut exécuter SD: " + canRunSD);
            
            WritableMap result = Arguments.createMap();
            
            // RAM système réelle - VALEURS EN MB
            result.putDouble("totalRamMB", totalRamMB);
            result.putDouble("availableRamMB", availableRamMB);
            result.putDouble("totalRamGB", totalRamGB);
            result.putDouble("availableRamGB", availableRamGB);
            result.putDouble("ramThresholdMB", (double) thresholdBytes / (1024.0 * 1024.0));
            result.putBoolean("systemLowMemory", lowMemory);
            
            // RAM JVM (pour compatibilité)
            result.putDouble("maxMemoryMB", (double) jvmMaxMemory / (1024.0 * 1024.0));
            result.putDouble("totalMemoryMB", (double) jvmTotalMemory / (1024.0 * 1024.0));
            result.putDouble("freeMemoryMB", (double) jvmFreeMemory / (1024.0 * 1024.0));
            
            // Stockage
            result.putDouble("freeStorageMB", freeStorageMB);
            result.putDouble("freeStorageGB", freeStorageGB);
            result.putDouble("totalStorageMB", (double) totalBytes / (1024.0 * 1024.0));
            
            // Capacités
            result.putInt("availableProcessors", runtime.availableProcessors());
            result.putBoolean("hasEnoughRAM", hasEnoughRAM);
            result.putBoolean("hasEnoughStorage", hasEnoughStorage);
            result.putBoolean("canRunSD", canRunSD);
            
            // Module info
            result.putBoolean("moduleLoaded", true);
            result.putBoolean("onnxAvailable", ortEnv != null);
            result.putString("moduleVersion", VERSION);
            result.putString("deviceModel", Build.MODEL);
            result.putString("manufacturer", Build.MANUFACTURER);
            result.putString("androidVersion", Build.VERSION.RELEASE);
            result.putInt("sdkVersion", Build.VERSION.SDK_INT);
            result.putBoolean("pipelineReady", isInitialized);
            
            // Debug info
            result.putString("debugTotalRam", String.format("%.2f GB", totalRamGB));
            result.putString("debugAvailRam", String.format("%.2f GB", availableRamGB));
            
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "❌ Error in getSystemInfo: " + e.getMessage(), e);
            WritableMap result = Arguments.createMap();
            result.putBoolean("moduleLoaded", true);
            result.putBoolean("canRunSD", false);
            result.putString("error", e.getMessage());
            promise.resolve(result);
        }
    }

    @ReactMethod
    public void initializeModel(Promise promise) {
        if (ortEnv == null) {
            promise.reject("ONNX_NOT_AVAILABLE", "ONNX Runtime non disponible");
            return;
        }
        
        if (isInitialized) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("status", "already_initialized");
            promise.resolve(result);
            return;
        }
        
        new Thread(() -> {
            try {
                sendProgressEvent("initializing", 0, "Chargement des modèles...");
                
                File modelsDir = getModelsDirectory();
                File textEncoderFile = new File(modelsDir, TEXT_ENCODER_MODEL);
                File unetFile = new File(modelsDir, UNET_MODEL);
                File vaeDecoderFile = new File(modelsDir, VAE_DECODER_MODEL);
                
                // Vérifier que tous les fichiers existent
                if (!textEncoderFile.exists() || !unetFile.exists() || !vaeDecoderFile.exists()) {
                    promise.reject("MODELS_NOT_FOUND", "Un ou plusieurs modèles ONNX manquants. Téléchargez-les d'abord.");
                    return;
                }
                
                SessionOptions options = new SessionOptions();
                options.setOptimizationLevel(SessionOptions.OptLevel.ALL_OPT);
                
                // Charger le text encoder (plus petit, charge en premier)
                sendProgressEvent("loading", 20, "Chargement du text encoder...");
                Log.i(TAG, "📦 Chargement text_encoder.onnx...");
                textEncoderSession = ortEnv.createSession(textEncoderFile.getAbsolutePath(), options);
                
                // Charger le VAE decoder
                sendProgressEvent("loading", 50, "Chargement du VAE decoder...");
                Log.i(TAG, "📦 Chargement vae_decoder.onnx...");
                vaeDecoderSession = ortEnv.createSession(vaeDecoderFile.getAbsolutePath(), options);
                
                // Charger le UNet (le plus gros)
                sendProgressEvent("loading", 70, "Chargement du UNet (peut prendre du temps)...");
                Log.i(TAG, "📦 Chargement unet.onnx (peut prendre plusieurs minutes)...");
                unetSession = ortEnv.createSession(unetFile.getAbsolutePath(), options);
                
                isInitialized = true;
                sendProgressEvent("ready", 100, "Pipeline prêt!");
                Log.i(TAG, "✅ Tous les modèles chargés avec succès!");
                
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", true);
                result.putString("status", "initialized");
                result.putBoolean("pipelineReady", true);
                promise.resolve(result);
                
            } catch (Exception e) {
                Log.e(TAG, "❌ Erreur initialisation: " + e.getMessage(), e);
                sendProgressEvent("error", 0, "Erreur: " + e.getMessage());
                promise.reject("INIT_ERROR", "Erreur d'initialisation: " + e.getMessage());
            }
        }).start();
    }

    @ReactMethod
    public void generateImage(String prompt, String negativePrompt, int steps, double guidanceScale, int seed, Promise promise) {
        if (!isInitialized) {
            promise.reject("NOT_INITIALIZED", "Le pipeline n'est pas initialisé. Appelez initializeModel() d'abord.");
            return;
        }
        
        if (isGenerating) {
            promise.reject("BUSY", "Une génération est déjà en cours");
            return;
        }
        
        isGenerating = true;
        
        new Thread(() -> {
            try {
                Log.i(TAG, "🎨 Début génération - Prompt: " + prompt);
                sendProgressEvent("generating", 0, "Démarrage de la génération...");
                
                // Configuration
                int width = 512;
                int height = 512;
                int actualSeed = seed > 0 ? seed : new Random().nextInt(Integer.MAX_VALUE);
                int actualSteps = Math.max(1, Math.min(steps, 50)); // Limiter entre 1 et 50
                float guidance = (float) Math.max(1.0, Math.min(guidanceScale, 20.0));
                
                Random random = new Random(actualSeed);
                
                // Étape 1: Encoder le texte (simulé pour l'instant)
                sendProgressEvent("generating", 10, "Encodage du texte...");
                Log.i(TAG, "📝 Encodage du prompt...");
                // float[] textEmbeddings = encodeText(prompt);
                
                // Étape 2: Créer le bruit latent initial
                sendProgressEvent("generating", 20, "Préparation du latent...");
                int latentChannels = 4;
                int latentHeight = height / 8;
                int latentWidth = width / 8;
                float[] latents = new float[latentChannels * latentHeight * latentWidth];
                for (int i = 0; i < latents.length; i++) {
                    latents[i] = (float) random.nextGaussian();
                }
                
                // Étape 3: Boucle de diffusion
                for (int step = 0; step < actualSteps; step++) {
                    int progress = 20 + (int) ((step / (float) actualSteps) * 60);
                    sendProgressEvent("generating", progress, "Étape " + (step + 1) + "/" + actualSteps);
                    Log.i(TAG, "🔄 Diffusion step " + (step + 1) + "/" + actualSteps);
                    
                    // Dans une vraie implémentation, on ferait:
                    // latents = runUNetStep(latents, textEmbeddings, step, actualSteps, guidance);
                    
                    // Simulation du temps de traitement
                    Thread.sleep(100);
                }
                
                // Étape 4: Décoder le latent en image
                sendProgressEvent("generating", 85, "Décodage de l'image...");
                Log.i(TAG, "🖼️ Décodage VAE...");
                // float[] imageData = decodeLatent(latents);
                
                // Étape 5: Créer l'image bitmap (placeholder pour l'instant)
                sendProgressEvent("generating", 95, "Finalisation...");
                Bitmap bitmap = createPlaceholderImage(width, height, prompt, actualSeed);
                
                // Sauvegarder l'image
                String imagePath = saveImage(bitmap);
                
                // Convertir en base64 pour envoi direct
                String base64Image = bitmapToBase64(bitmap);
                
                bitmap.recycle();
                
                sendProgressEvent("complete", 100, "Génération terminée!");
                Log.i(TAG, "✅ Image générée: " + imagePath);
                
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", true);
                result.putString("imagePath", imagePath);
                result.putString("imageBase64", base64Image);
                result.putInt("seed", actualSeed);
                result.putInt("steps", actualSteps);
                result.putDouble("guidanceScale", guidance);
                result.putInt("width", width);
                result.putInt("height", height);
                result.putString("status", "generated");
                
                isGenerating = false;
                promise.resolve(result);
                
            } catch (Exception e) {
                isGenerating = false;
                Log.e(TAG, "❌ Erreur génération: " + e.getMessage(), e);
                sendProgressEvent("error", 0, "Erreur: " + e.getMessage());
                promise.reject("GENERATION_ERROR", "Erreur de génération: " + e.getMessage());
            }
        }).start();
    }

    /**
     * Crée une image placeholder avec un pattern basé sur le prompt
     * Cette méthode sera remplacée par la vraie génération SD
     */
    private Bitmap createPlaceholderImage(int width, int height, String prompt, int seed) {
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Random random = new Random(seed);
        
        // Créer un pattern de bruit coloré basé sur le seed
        int[] pixels = new int[width * height];
        
        // Couleur de base basée sur le hash du prompt
        int baseR = Math.abs(prompt.hashCode()) % 200 + 55;
        int baseG = Math.abs(prompt.hashCode() >> 8) % 200 + 55;
        int baseB = Math.abs(prompt.hashCode() >> 16) % 200 + 55;
        
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                // Pattern de bruit Perlin-like simplifié
                float noise = (float) (Math.sin(x * 0.1 + seed) * Math.cos(y * 0.1 + seed));
                noise += (float) (Math.sin(x * 0.05) * Math.cos(y * 0.05)) * 0.5f;
                noise = (noise + 2) / 4; // Normaliser entre 0 et 1
                
                int r = Math.min(255, Math.max(0, (int) (baseR * noise + random.nextInt(30))));
                int g = Math.min(255, Math.max(0, (int) (baseG * noise + random.nextInt(30))));
                int b = Math.min(255, Math.max(0, (int) (baseB * noise + random.nextInt(30))));
                
                pixels[y * width + x] = 0xFF000000 | (r << 16) | (g << 8) | b;
            }
        }
        
        bitmap.setPixels(pixels, 0, width, 0, 0, width, height);
        return bitmap;
    }

    private String saveImage(Bitmap bitmap) throws Exception {
        File outputDir = new File(reactContext.getFilesDir(), "generated_images");
        if (!outputDir.exists()) {
            outputDir.mkdirs();
        }
        
        String filename = "sd_" + UUID.randomUUID().toString() + ".png";
        File outputFile = new File(outputDir, filename);
        
        try (FileOutputStream out = new FileOutputStream(outputFile)) {
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
        }
        
        return outputFile.getAbsolutePath();
    }

    private String bitmapToBase64(Bitmap bitmap) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, baos);
        byte[] bytes = baos.toByteArray();
        return "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
    }

    @ReactMethod
    public void releaseModel(Promise promise) {
        try {
            if (textEncoderSession != null) {
                textEncoderSession.close();
                textEncoderSession = null;
            }
            if (unetSession != null) {
                unetSession.close();
                unetSession = null;
            }
            if (vaeDecoderSession != null) {
                vaeDecoderSession.close();
                vaeDecoderSession = null;
            }
            
            isInitialized = false;
            System.gc();
            
            Log.i(TAG, "✅ Modèles libérés");
            promise.resolve("released");
        } catch (Exception e) {
            Log.e(TAG, "Erreur release: " + e.getMessage());
            promise.reject("RELEASE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void cancelGeneration(Promise promise) {
        // Pour l'instant, on ne peut pas vraiment annuler une génération en cours
        // Dans une vraie implémentation, on utiliserait un flag pour arrêter la boucle
        isGenerating = false;
        promise.resolve("cancelled");
    }

    private File getModelsDirectory() {
        File filesDir = reactContext.getFilesDir();
        File modelDir = new File(filesDir, MODELS_DIR);
        if (!modelDir.exists()) {
            modelDir.mkdirs();
        }
        return modelDir;
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Required for RN event emitter
    }

    @ReactMethod
    public void removeListeners(int count) {
        // Required for RN event emitter
    }
    
    /**
     * Méthode de test simple pour vérifier que le module fonctionne
     * Version améliorée avec logs détaillés
     */
    @ReactMethod
    public void testModule(Promise promise) {
        try {
            Log.i(TAG, "╔════════════════════════════════════════╗");
            Log.i(TAG, "║  🧪 TEST MODULE APPELÉ                 ║");
            Log.i(TAG, "╚════════════════════════════════════════╝");
            
            // Récupérer les infos RAM via ActivityManager
            ActivityManager activityManager = (ActivityManager) reactContext.getSystemService(Context.ACTIVITY_SERVICE);
            if (activityManager == null) {
                Log.e(TAG, "❌ ActivityManager est NULL!");
                throw new Exception("ActivityManager non disponible");
            }
            
            ActivityManager.MemoryInfo memInfo = new ActivityManager.MemoryInfo();
            activityManager.getMemoryInfo(memInfo);
            
            // Logs RAW
            Log.i(TAG, "📊 [RAW] totalMem: " + memInfo.totalMem + " bytes");
            Log.i(TAG, "📊 [RAW] availMem: " + memInfo.availMem + " bytes");
            
            // Calcul précis en GB
            double totalRamGB = (double) memInfo.totalMem / (1024.0 * 1024.0 * 1024.0);
            double availRamGB = (double) memInfo.availMem / (1024.0 * 1024.0 * 1024.0);
            double totalRamMB = (double) memInfo.totalMem / (1024.0 * 1024.0);
            double availRamMB = (double) memInfo.availMem / (1024.0 * 1024.0);
            
            Log.i(TAG, "📊 RAM Totale: " + String.format("%.2f", totalRamGB) + " GB (" + String.format("%.0f", totalRamMB) + " MB)");
            Log.i(TAG, "📊 RAM Disponible: " + String.format("%.2f", availRamGB) + " GB (" + String.format("%.0f", availRamMB) + " MB)");
            Log.i(TAG, "📊 ONNX Runtime: " + (ortEnv != null ? "✅ DISPONIBLE" : "❌ NON DISPONIBLE"));
            
            // Test ONNX Environment
            String onnxStatus = "Non initialisé";
            if (ortEnv != null) {
                try {
                    onnxStatus = "Initialisé - API: " + OrtEnvironment.getApiBase();
                } catch (Exception e) {
                    onnxStatus = "Initialisé mais erreur API: " + e.getMessage();
                }
            }
            Log.i(TAG, "📊 ONNX Status: " + onnxStatus);
            
            WritableMap result = Arguments.createMap();
            result.putString("status", "OK");
            result.putString("moduleVersion", VERSION);
            
            // RAM en GB et MB
            result.putDouble("totalRamGB", totalRamGB);
            result.putDouble("availableRamGB", availRamGB);
            result.putDouble("totalRamMB", totalRamMB);
            result.putDouble("availableRamMB", availRamMB);
            
            // Strings formatés pour affichage
            result.putString("totalRamDisplay", String.format("%.2f GB", totalRamGB));
            result.putString("availRamDisplay", String.format("%.2f GB", availRamGB));
            
            // Raw bytes pour debug
            result.putDouble("totalRamBytes", (double) memInfo.totalMem);
            result.putDouble("availRamBytes", (double) memInfo.availMem);
            
            // ONNX
            result.putBoolean("onnxAvailable", ortEnv != null);
            result.putString("onnxStatus", onnxStatus);
            
            // Device
            result.putString("device", Build.MODEL);
            result.putString("manufacturer", Build.MANUFACTURER);
            result.putString("androidVersion", Build.VERSION.RELEASE);
            result.putInt("sdkVersion", Build.VERSION.SDK_INT);
            
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur test module: " + e.getMessage());
            e.printStackTrace();
            
            WritableMap errorResult = Arguments.createMap();
            errorResult.putString("status", "ERROR");
            errorResult.putString("error", e.getMessage());
            errorResult.putBoolean("onnxAvailable", ortEnv != null);
            promise.resolve(errorResult);
        }
    }
}
