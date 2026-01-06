/**
 * Service pour Stable Diffusion Local (génération sur smartphone)
 * Utilise le module natif Android ONNX Runtime
 * Optimisé pour 8 GB RAM - Qualité hyper-réaliste
 */

import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { StableDiffusionLocal } = NativeModules;

class StableDiffusionLocalService {
  constructor() {
    this.isAvailable = Platform.OS === 'android' && StableDiffusionLocal != null;
    this.isModelLoaded = false;
    this.modelInfo = null;
    
    console.log('🎨 StableDiffusionLocalService initialized');
    console.log('📱 Available:', this.isAvailable);
  }

  /**
   * Vérifie si le service est disponible
   */
  async checkAvailability() {
    console.log('🔍 checkAvailability called');
    console.log('📱 Platform:', Platform.OS);
    console.log('📱 Module disponible:', this.isAvailable);
    
    if (!this.isAvailable) {
      console.log('⚠️ Module natif non disponible');
      return {
        available: false,
        reason: 'Module natif SD Local non disponible. Ceci est normal sur iOS ou si le module natif n\'est pas compilé.',
      };
    }

    try {
      console.log('🔄 Appel StableDiffusionLocal.isModelAvailable()...');
      const modelStatus = await StableDiffusionLocal.isModelAvailable();
      console.log('✅ Model status:', modelStatus);
      
      console.log('🔄 Appel StableDiffusionLocal.getSystemInfo()...');
      const systemInfo = await StableDiffusionLocal.getSystemInfo();
      console.log('✅ System info:', systemInfo);
      
      return {
        available: true,
        modelDownloaded: modelStatus.available,
        modelSizeMB: modelStatus.sizeMB,
        modelPath: modelStatus.path,
        ramMB: systemInfo.maxMemoryMB,
        canRunSD: systemInfo.canRunSD,
        usedRamMB: systemInfo.usedMemoryMB,
        freeRamMB: systemInfo.freeMemoryMB,
      };
    } catch (error) {
      console.error('❌ Error checking SD Local availability:', error);
      console.error('❌ Error details:', error.message);
      return {
        available: false,
        reason: `Erreur module natif: ${error.message}`,
      };
    }
  }

  /**
   * Télécharge le modèle SD-Turbo ONNX (450 MB)
   * Retourne les instructions de téléchargement
   */
  async downloadModel() {
    console.log('📥 downloadModel called');
    console.log('📱 isAvailable:', this.isAvailable);
    console.log('📱 StableDiffusionLocal module:', StableDiffusionLocal);
    
    if (!this.isAvailable) {
      throw new Error('Module natif SD Local non disponible (Android uniquement). Assurez-vous que l\'APK est bien installée.');
    }

    try {
      console.log('🔄 Appel StableDiffusionLocal.downloadModel()...');
      const downloadInfo = await StableDiffusionLocal.downloadModel();
      console.log('✅ Model download info:', downloadInfo);
      return downloadInfo;
    } catch (error) {
      console.error('❌ Error calling native module:', error);
      console.error('❌ Error details:', error.message, error.stack);
      throw new Error(`Impossible d'accéder au module natif: ${error.message}`);
    }
  }

  /**
   * Initialise le modèle ONNX (charge en mémoire)
   * À appeler avant la première génération
   */
  async initializeModel() {
    if (!this.isAvailable) {
      throw new Error('Service non disponible');
    }

    try {
      console.log('🔄 Initializing SD model...');
      const result = await StableDiffusionLocal.initializeModel();
      this.isModelLoaded = true;
      console.log('✅ Model initialized:', result);
      return result;
    } catch (error) {
      console.error('❌ Error initializing model:', error);
      this.isModelLoaded = false;
      throw error;
    }
  }

  /**
   * Génère une image avec Stable Diffusion Local
   * @param {string} prompt - Prompt complet (style + description)
   * @param {Object} options - Options de génération
   */
  async generateImage(prompt, options = {}) {
    if (!this.isAvailable) {
      throw new Error('Service non disponible');
    }

    if (!this.isModelLoaded) {
      console.log('⚠️ Model not loaded, initializing...');
      await this.initializeModel();
    }

    const {
      negativePrompt = 'low quality, blurry, distorted, deformed, ugly, bad anatomy, worst quality',
      steps = 2, // SD-Turbo optimal: 1-4 steps
      guidanceScale = 1.0, // SD-Turbo optimal: 1.0
      seed = -1,
    } = options;

    try {
      console.log('🎨 Generating image locally...');
      console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
      console.log('🎚️ Steps:', steps, '| CFG:', guidanceScale);

      const result = await StableDiffusionLocal.generateImage(
        prompt,
        negativePrompt,
        steps,
        guidanceScale
      );

      console.log('✅ Image generated:', result);
      return result;
    } catch (error) {
      console.error('❌ Error generating image:', error);
      throw error;
    }
  }

  /**
   * Libère le modèle de la mémoire (important pour économiser RAM)
   */
  async releaseModel() {
    if (!this.isAvailable || !this.isModelLoaded) {
      return;
    }

    try {
      await StableDiffusionLocal.releaseModel();
      this.isModelLoaded = false;
      console.log('✅ Model released from memory');
    } catch (error) {
      console.error('❌ Error releasing model:', error);
    }
  }

  /**
   * Retourne les infos système
   */
  async getSystemInfo() {
    if (!this.isAvailable) {
      return null;
    }

    try {
      return await StableDiffusionLocal.getSystemInfo();
    } catch (error) {
      console.error('❌ Error getting system info:', error);
      return null;
    }
  }

  /**
   * Constantes du module natif
   */
  getConstants() {
    if (!this.isAvailable) {
      return {};
    }
    return {
      MODEL_NAME: 'sd_turbo_onnx_fp16.onnx',
      IMAGE_SIZE: 512,
      RECOMMENDED_STEPS: 2,
      MODEL_SIZE_MB: 450,
    };
  }

  /**
   * Sauvegarde les préférences SD Local
   */
  async savePreferences(prefs) {
    await AsyncStorage.setItem('sd_local_prefs', JSON.stringify(prefs));
  }

  /**
   * Charge les préférences SD Local
   */
  async loadPreferences() {
    const prefs = await AsyncStorage.getItem('sd_local_prefs');
    return prefs ? JSON.parse(prefs) : {
      enabled: false,
      autoInit: false,
      defaultSteps: 2,
      defaultCFG: 1.0,
    };
  }
}

export default new StableDiffusionLocalService();
