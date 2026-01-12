/**
 * Service Stable Diffusion Local (génération sur smartphone)
 * Version 4.0 - Utilise le module natif Android avec ONNX Runtime
 * 
 * STATUT:
 * ✅ Module natif avec ONNX Runtime
 * ✅ Détection automatique des modèles
 * ✅ Événements de progression
 * ⚠️ Modèles ONNX à télécharger séparément
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Récupération du module natif
const { StableDiffusionLocal } = NativeModules;

// URLs des modèles ONNX SD-Turbo (à héberger sur un serveur)
const MODEL_BASE_URL = 'https://huggingface.co/stabilityai/sd-turbo-onnx/resolve/main/';
const MODELS = {
  textEncoder: {
    name: 'text_encoder.onnx',
    url: MODEL_BASE_URL + 'text_encoder/model.onnx',
    sizeMB: 250,
  },
  unet: {
    name: 'unet.onnx',
    url: MODEL_BASE_URL + 'unet/model.onnx',
    sizeMB: 1700,
  },
  vaeDecoder: {
    name: 'vae_decoder.onnx',
    url: MODEL_BASE_URL + 'vae_decoder/model.onnx',
    sizeMB: 100,
  },
};

// Taille totale estimée
const TOTAL_MODEL_SIZE_MB = Object.values(MODELS).reduce((sum, m) => sum + m.sizeMB, 0);

class StableDiffusionLocalService {
  constructor() {
    // Détection du module natif
    this.nativeModule = StableDiffusionLocal;
    this.isAndroid = Platform.OS === 'android';
    this.eventEmitter = null;
    this.progressSubscription = null;
    this.moduleInfo = this._getModuleInfo();
    
    console.log('╔════════════════════════════════════════╗');
    console.log('║  StableDiffusionLocalService v4.0      ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('📱 Platform:', Platform.OS, Platform.Version);
    console.log('📱 Module natif:', this.moduleInfo.status);
    
    if (this.moduleInfo.isLoaded) {
      console.log('📱 Module version:', this.moduleInfo.version);
      console.log('📱 ONNX disponible:', this.moduleInfo.onnxAvailable);
      
      // Configurer l'écouteur d'événements si le module est chargé
      this._setupEventListener();
    }
    console.log('==========================================');
  }

  /**
   * Configure l'écouteur d'événements de progression
   */
  _setupEventListener() {
    if (this.nativeModule && this.isAndroid) {
      try {
        this.eventEmitter = new NativeEventEmitter(this.nativeModule);
      } catch (e) {
        console.warn('⚠️ Impossible de créer NativeEventEmitter:', e.message);
      }
    }
  }

  /**
   * S'abonner aux événements de progression
   */
  subscribeToProgress(callback) {
    if (this.eventEmitter) {
      this.progressSubscription = this.eventEmitter.addListener('SDProgress', callback);
      return () => {
        if (this.progressSubscription) {
          this.progressSubscription.remove();
          this.progressSubscription = null;
        }
      };
    }
    return () => {};
  }

  /**
   * Analyse le module natif et retourne ses informations
   */
  _getModuleInfo() {
    if (!this.isAndroid) {
      return {
        isLoaded: false,
        status: '❌ iOS non supporté',
        version: null,
        onnxAvailable: false,
      };
    }

    if (!this.nativeModule) {
      return {
        isLoaded: false,
        status: '❌ Module natif non trouvé',
        version: null,
        onnxAvailable: false,
      };
    }

    // Le module existe, vérifions les constantes
    try {
      const constants = this.nativeModule.getConstants 
        ? this.nativeModule.getConstants() 
        : this.nativeModule;
      
      return {
        isLoaded: true,
        status: '✅ Module natif chargé',
        version: constants?.VERSION || 'unknown',
        onnxAvailable: constants?.ONNX_AVAILABLE || false,
        pipelineReady: constants?.PIPELINE_READY || false,
        constants: constants,
      };
    } catch (e) {
      return {
        isLoaded: true,
        status: '⚠️ Module chargé (constantes inaccessibles)',
        version: 'unknown',
        onnxAvailable: false,
        error: e.message,
      };
    }
  }

  /**
   * Retourne le chemin du dossier des modèles
   */
  getModelDirectory() {
    return `${FileSystem.documentDirectory}sd_models/`;
  }

  /**
   * Vérifie si un modèle spécifique existe
   */
  async checkModelFile(modelName) {
    try {
      const modelPath = `${this.getModelDirectory()}${modelName}`;
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      return {
        exists: fileInfo.exists,
        size: fileInfo.size || 0,
        sizeMB: (fileInfo.size || 0) / 1024 / 1024,
      };
    } catch (error) {
      return { exists: false, size: 0, sizeMB: 0 };
    }
  }

  /**
   * Vérifie si tous les modèles sont téléchargés
   */
  async checkAllModels() {
    const results = {};
    let totalSize = 0;
    let allPresent = true;

    for (const [key, model] of Object.entries(MODELS)) {
      const check = await this.checkModelFile(model.name);
      results[key] = check;
      totalSize += check.size;
      if (!check.exists || check.sizeMB < model.sizeMB * 0.9) {
        allPresent = false;
      }
    }

    return {
      models: results,
      allPresent,
      totalSizeMB: totalSize / 1024 / 1024,
      expectedSizeMB: TOTAL_MODEL_SIZE_MB,
    };
  }

  /**
   * Vérifie la disponibilité complète du service
   */
  async checkAvailability() {
    console.log('🔍 Vérification disponibilité SD Local...');
    
    // Vérifier les modèles côté JS
    const modelsCheck = await this.checkAllModels();
    console.log('📁 Models check:', modelsCheck.allPresent ? 'Tous présents' : 'Incomplet');
    
    // Construire la réponse de base
    const baseResponse = {
      platform: Platform.OS,
      modelDownloaded: modelsCheck.allPresent,
      modelSizeMB: modelsCheck.totalSizeMB,
      expectedSizeMB: TOTAL_MODEL_SIZE_MB,
      modelsDetail: modelsCheck.models,
    };
    
    // Si ce n'est pas Android
    if (!this.isAndroid) {
      return {
        ...baseResponse,
        available: false,
        moduleLoaded: false,
        onnxAvailable: false,
        pipelineReady: false,
        canRunSD: false,
        reason: 'SD Local disponible uniquement sur Android',
      };
    }
    
    // Si le module natif n'est pas chargé
    if (!this.moduleInfo.isLoaded) {
      return {
        ...baseResponse,
        available: false,
        moduleLoaded: false,
        onnxAvailable: false,
        pipelineReady: false,
        canRunSD: false,
        reason: this.moduleInfo.status,
      };
    }

    // Le module est chargé, communiquons avec lui
    try {
      console.log('📡 Appel module natif...');
      
      const [modelStatus, systemInfo] = await Promise.all([
        this.nativeModule.isModelAvailable(),
        this.nativeModule.getSystemInfo(),
      ]);
      
      console.log('📱 Native modelStatus:', JSON.stringify(modelStatus));
      console.log('📱 Native systemInfo:', JSON.stringify(systemInfo));
      
      return {
        ...baseResponse,
        available: true,
        moduleLoaded: true,
        moduleVersion: modelStatus?.moduleVersion || this.moduleInfo.version,
        onnxAvailable: modelStatus?.onnxAvailable || systemInfo?.onnxAvailable || false,
        modelDownloaded: modelStatus?.modelDownloaded || modelsCheck.allPresent,
        pipelineReady: modelStatus?.pipelineReady || false,
        
        // Détails des modèles depuis le natif
        textEncoderReady: modelStatus?.textEncoderDownloaded || false,
        unetReady: modelStatus?.unetDownloaded || false,
        vaeDecoderReady: modelStatus?.vaeDecoderDownloaded || false,
        
        // Infos système
        ramMB: systemInfo?.maxMemoryMB || 0,
        freeRamMB: systemInfo?.freeMemoryMB || 0,
        freeStorageMB: systemInfo?.freeStorageMB || 0,
        processors: systemInfo?.availableProcessors || 0,
        hasEnoughRAM: systemInfo?.hasEnoughRAM || false,
        hasEnoughStorage: systemInfo?.hasEnoughStorage || false,
        canRunSD: systemInfo?.canRunSD || false,
        deviceModel: systemInfo?.deviceModel || 'Unknown',
        manufacturer: systemInfo?.manufacturer || 'Unknown',
        androidVersion: systemInfo?.androidVersion || 'Unknown',
        
        reason: this._buildStatusMessage(modelStatus, systemInfo, modelsCheck),
      };
      
    } catch (error) {
      console.error('❌ Erreur communication module natif:', error);
      
      return {
        ...baseResponse,
        available: true,
        moduleLoaded: true,
        onnxAvailable: this.moduleInfo.onnxAvailable,
        pipelineReady: false,
        canRunSD: false,
        error: error.message,
        reason: `Erreur module: ${error.message}`,
      };
    }
  }

  /**
   * Construit un message de statut clair
   */
  _buildStatusMessage(modelStatus, systemInfo, modelsCheck) {
    if (!modelStatus?.onnxAvailable && !this.moduleInfo.onnxAvailable) {
      return '❌ ONNX Runtime non disponible';
    }
    
    if (!modelsCheck.allPresent) {
      const missing = [];
      for (const [key, check] of Object.entries(modelsCheck.models)) {
        if (!check.exists) missing.push(MODELS[key].name);
      }
      return `📥 Modèles manquants: ${missing.join(', ')}`;
    }
    
    if (!systemInfo?.hasEnoughRAM) {
      const ramGB = ((systemInfo?.maxMemoryMB || 0) / 1024).toFixed(1);
      return `⚠️ RAM insuffisante (${ramGB} GB, besoin 3+ GB)`;
    }
    
    if (!systemInfo?.hasEnoughStorage) {
      const storageGB = ((systemInfo?.freeStorageMB || 0) / 1024).toFixed(1);
      return `⚠️ Stockage insuffisant (${storageGB} GB libre)`;
    }
    
    if (modelStatus?.pipelineReady) {
      return '✅ Pipeline prêt! Vous pouvez générer des images.';
    }
    
    return '✅ Modèles OK. Initialisez le pipeline pour générer.';
  }

  /**
   * Télécharge un modèle spécifique
   */
  async downloadModel(modelKey, onProgress = null) {
    const model = MODELS[modelKey];
    if (!model) {
      throw new Error(`Modèle inconnu: ${modelKey}`);
    }

    console.log(`📥 Téléchargement ${model.name}...`);
    
    // Créer le dossier si nécessaire
    const modelDir = this.getModelDirectory();
    const dirInfo = await FileSystem.getInfoAsync(modelDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
    }
    
    const modelPath = `${modelDir}${model.name}`;
    
    // Vérifier si déjà téléchargé
    const existingFile = await FileSystem.getInfoAsync(modelPath);
    if (existingFile.exists && existingFile.size > model.sizeMB * 0.9 * 1024 * 1024) {
      console.log(`✅ ${model.name} déjà téléchargé`);
      if (onProgress) onProgress(100, 'Déjà téléchargé');
      return { success: true, alreadyExists: true };
    }
    
    // Télécharger
    const downloadResumable = FileSystem.createDownloadResumable(
      model.url,
      modelPath,
      {},
      (progress) => {
        if (progress.totalBytesExpectedToWrite > 0) {
          const pct = (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100;
          const dlMB = progress.totalBytesWritten / 1024 / 1024;
          if (onProgress) onProgress(pct, `${dlMB.toFixed(0)}/${model.sizeMB} MB`);
        }
      }
    );
    
    const result = await downloadResumable.downloadAsync();
    
    if (result?.uri) {
      console.log(`✅ ${model.name} téléchargé`);
      return { success: true, path: result.uri };
    }
    
    throw new Error(`Échec du téléchargement de ${model.name}`);
  }

  /**
   * Télécharge tous les modèles
   */
  async downloadAllModels(onProgress = null) {
    const modelKeys = Object.keys(MODELS);
    let totalProgress = 0;
    
    for (let i = 0; i < modelKeys.length; i++) {
      const key = modelKeys[i];
      const model = MODELS[key];
      
      if (onProgress) {
        onProgress(
          totalProgress,
          `Téléchargement ${model.name} (${i + 1}/${modelKeys.length})`
        );
      }
      
      await this.downloadModel(key, (pct, msg) => {
        const partProgress = pct / modelKeys.length;
        const baseProgress = (i / modelKeys.length) * 100;
        if (onProgress) {
          onProgress(baseProgress + partProgress, `${model.name}: ${msg}`);
        }
      });
      
      totalProgress = ((i + 1) / modelKeys.length) * 100;
    }
    
    if (onProgress) onProgress(100, 'Tous les modèles téléchargés!');
    return { success: true };
  }

  /**
   * Initialise le pipeline de génération
   */
  async initializePipeline() {
    if (!this.moduleInfo.isLoaded) {
      throw new Error('Module natif non disponible');
    }
    
    console.log('🚀 Initialisation du pipeline SD...');
    return await this.nativeModule.initializeModel();
  }

  /**
   * Génère une image
   */
  async generateImage(prompt, options = {}) {
    if (!this.moduleInfo.isLoaded) {
      console.log('⚠️ Module non disponible - Fallback Freebox');
      return null;
    }

    const {
      negativePrompt = '',
      steps = 20,
      guidanceScale = 7.5,
      seed = -1,
    } = options;

    console.log('🎨 Génération SD Local:', prompt);
    
    try {
      const result = await this.nativeModule.generateImage(
        prompt,
        negativePrompt,
        steps,
        guidanceScale,
        seed
      );
      
      if (result?.success && result?.imageBase64) {
        console.log('✅ Image générée avec succès');
        return {
          success: true,
          imageUrl: result.imageBase64,
          imagePath: result.imagePath,
          seed: result.seed,
          steps: result.steps,
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erreur génération:', error);
      return null;
    }
  }

  /**
   * Libère les ressources du pipeline
   */
  async releasePipeline() {
    if (this.moduleInfo.isLoaded) {
      return await this.nativeModule.releaseModel();
    }
  }

  /**
   * Annule la génération en cours
   */
  async cancelGeneration() {
    if (this.moduleInfo.isLoaded) {
      return await this.nativeModule.cancelGeneration();
    }
  }

  /**
   * Retourne les infos système
   */
  async getSystemInfo() {
    if (!this.moduleInfo.isLoaded) {
      return { moduleLoaded: false, canRunSD: false };
    }
    
    try {
      return await this.nativeModule.getSystemInfo();
    } catch (error) {
      console.error('❌ Erreur getSystemInfo:', error);
      return { moduleLoaded: true, canRunSD: false, error: error.message };
    }
  }

  /**
   * Supprime tous les modèles téléchargés
   */
  async deleteModels() {
    try {
      const modelDir = this.getModelDirectory();
      const dirInfo = await FileSystem.getInfoAsync(modelDir);
      
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(modelDir, { idempotent: true });
        console.log('✅ Modèles supprimés');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      throw error;
    }
  }

  /**
   * Retourne la liste des modèles requis
   */
  getRequiredModels() {
    return MODELS;
  }

  /**
   * Retourne la taille totale estimée
   */
  getTotalModelSize() {
    return TOTAL_MODEL_SIZE_MB;
  }
}

export default new StableDiffusionLocalService();
