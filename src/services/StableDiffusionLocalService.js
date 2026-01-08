/**
 * Service pour Stable Diffusion Local (génération sur smartphone)
 * Utilise le module natif Android ONNX Runtime
 * Optimisé pour 8 GB RAM - Qualité hyper-réaliste
 */

import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const { StableDiffusionLocal } = NativeModules;

class StableDiffusionLocalService {
  constructor() {
    this.isAvailable = Platform.OS === 'android' && StableDiffusionLocal != null;
    this.isModelLoaded = false;
    this.modelInfo = null;
    
    console.log('🎨 StableDiffusionLocalService initialized');
    console.log('📱 Platform:', Platform.OS);
    console.log('📱 Module disponible:', this.isAvailable);
    console.log('📱 NativeModules.StableDiffusionLocal:', StableDiffusionLocal ? 'exists' : 'null');
  }

  /**
   * Retourne le chemin du dossier des modèles
   */
  getModelDirectory() {
    return `${FileSystem.documentDirectory}sd_models/`;
  }

  /**
   * Retourne le chemin complet du modèle
   */
  getModelPath() {
    return `${this.getModelDirectory()}sd_turbo.safetensors`;
  }

  /**
   * Vérifie si le modèle existe localement (côté JavaScript)
   */
  async checkModelExistsJS() {
    try {
      const modelPath = this.getModelPath();
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      
      console.log('📁 Vérification modèle JS:', modelPath);
      console.log('📁 Existe:', fileInfo.exists);
      console.log('📁 Taille:', fileInfo.size ? `${(fileInfo.size / 1024 / 1024).toFixed(2)} MB` : 'N/A');
      
      return {
        exists: fileInfo.exists,
        size: fileInfo.size || 0,
        sizeMB: fileInfo.size ? fileInfo.size / 1024 / 1024 : 0,
        path: modelPath,
      };
    } catch (error) {
      console.error('❌ Erreur vérification modèle JS:', error);
      return { exists: false, size: 0, sizeMB: 0, path: this.getModelPath() };
    }
  }

  /**
   * Vérifie si le service est disponible
   */
  async checkAvailability() {
    console.log('🔍 checkAvailability called');
    
    // Vérifier d'abord si le module natif existe
    if (!this.isAvailable) {
      console.log('⚠️ Module natif non disponible');
      
      // Vérifier quand même si le modèle existe côté JS
      const jsCheck = await this.checkModelExistsJS();
      
      return {
        available: false,
        reason: 'Module natif SD Local non disponible. Le module ONNX n\'est pas chargé.',
        modelDownloaded: jsCheck.exists,
        modelSizeMB: jsCheck.sizeMB,
        modelPath: jsCheck.path,
        canRunSD: false,
        ramMB: 0,
      };
    }

    try {
      console.log('🔄 Appel StableDiffusionLocal.isModelAvailable()...');
      const modelStatus = await StableDiffusionLocal.isModelAvailable();
      console.log('✅ Model status natif:', modelStatus);
      
      // Aussi vérifier côté JS
      const jsCheck = await this.checkModelExistsJS();
      console.log('✅ Model status JS:', jsCheck);
      
      console.log('🔄 Appel StableDiffusionLocal.getSystemInfo()...');
      const systemInfo = await StableDiffusionLocal.getSystemInfo();
      console.log('✅ System info:', systemInfo);
      
      // Le modèle est disponible si trouvé côté natif OU côté JS
      const modelDownloaded = modelStatus.available || jsCheck.exists;
      const modelSizeMB = modelStatus.sizeMB || jsCheck.sizeMB;
      
      return {
        available: true,
        modelDownloaded: modelDownloaded,
        modelSizeMB: modelSizeMB,
        modelPath: modelStatus.path || jsCheck.path,
        ramMB: systemInfo.maxMemoryMB,
        canRunSD: systemInfo.canRunSD,
        usedRamMB: systemInfo.usedMemoryMB,
        freeRamMB: systemInfo.freeMemoryMB,
      };
    } catch (error) {
      console.error('❌ Error checking SD Local availability:', error);
      
      // En cas d'erreur, vérifier quand même côté JS
      const jsCheck = await this.checkModelExistsJS();
      
      return {
        available: false,
        reason: `Erreur module natif: ${error.message}`,
        modelDownloaded: jsCheck.exists,
        modelSizeMB: jsCheck.sizeMB,
        modelPath: jsCheck.path,
        canRunSD: false,
        ramMB: 0,
      };
    }
  }

  /**
   * Télécharge le modèle SD-Turbo
   * @param {function} onProgress - Callback pour la progression (0-100)
   */
  async downloadModel(onProgress = null) {
    console.log('📥 downloadModel called');
    
    try {
      // Créer le dossier si nécessaire
      const modelDir = this.getModelDirectory();
      const dirInfo = await FileSystem.getInfoAsync(modelDir);
      if (!dirInfo.exists) {
        console.log('📁 Création dossier:', modelDir);
        await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
      }
      
      const modelPath = this.getModelPath();
      
      // URL du modèle (Hugging Face)
      // Note: SD-Turbo complet est ~5GB, on utilise une version optimisée
      const modelUrl = 'https://huggingface.co/stabilityai/sd-turbo/resolve/main/sd_turbo.safetensors';
      
      console.log('🌐 Téléchargement depuis:', modelUrl);
      console.log('📂 Destination:', modelPath);
      
      const downloadResumable = FileSystem.createDownloadResumable(
        modelUrl,
        modelPath,
        {},
        (downloadProgress) => {
          if (downloadProgress.totalBytesExpectedToWrite > 0) {
            const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
            console.log(`📥 Progress: ${Math.round(progress)}%`);
            if (onProgress) {
              onProgress(progress);
            }
          }
        }
      );
      
      const result = await downloadResumable.downloadAsync();
      
      if (result && result.uri) {
        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        console.log('✅ Téléchargement terminé:', result.uri);
        console.log('📊 Taille:', (fileInfo.size / 1024 / 1024).toFixed(2), 'MB');
        
        return {
          success: true,
          path: result.uri,
          sizeMB: fileInfo.size / 1024 / 1024,
        };
      } else {
        throw new Error('Téléchargement échoué: pas de résultat');
      }
    } catch (error) {
      console.error('❌ Erreur téléchargement:', error);
      throw error;
    }
  }

  /**
   * Initialise le modèle ONNX (charge en mémoire)
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
      steps = 2,
      guidanceScale = 1.0,
    } = options;

    try {
      console.log('🎨 Generating image locally...');
      console.log('📝 Prompt:', prompt.substring(0, 100) + '...');

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
   * Libère le modèle de la mémoire
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
      return {
        maxMemoryMB: 0,
        usedMemoryMB: 0,
        freeMemoryMB: 0,
        canRunSD: false,
      };
    }

    try {
      return await StableDiffusionLocal.getSystemInfo();
    } catch (error) {
      console.error('❌ Error getting system info:', error);
      return null;
    }
  }

  /**
   * Supprime le modèle téléchargé
   */
  async deleteModel() {
    try {
      const modelPath = this.getModelPath();
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(modelPath);
        console.log('✅ Modèle supprimé:', modelPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur suppression modèle:', error);
      throw error;
    }
  }
}

export default new StableDiffusionLocalService();
