/**
 * Service Stable Diffusion Local (génération sur smartphone)
 * 
 * Pipeline ONNX complet pour génération d'images en local
 * Utilise les modèles UNet + VAE de SD-Turbo
 */

import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const { StableDiffusionLocal } = NativeModules;

// URL du modèle SD-Turbo (format safetensors - utilisé pour future implémentation)
const MODEL_URL = 'https://huggingface.co/stabilityai/sd-turbo/resolve/main/sd_turbo.safetensors';

// Taille approximative du modèle (en MB)
const MODEL_SIZE_MB = 2500; // ~2.5 GB

class StableDiffusionLocalService {
  constructor() {
    // Vérifier si le module natif existe
    this.isAvailable = Platform.OS === 'android' && StableDiffusionLocal != null;
    this.isModelLoaded = false;
    this.modelInfo = null;
    
    console.log('===========================================');
    console.log('🎨 StableDiffusionLocalService v3.1');
    console.log('📱 Platform:', Platform.OS);
    console.log('📱 Module natif:', this.isAvailable ? '✅ Disponible' : '❌ Non disponible');
    
    if (this.isAvailable) {
      // Récupérer les constantes du module natif
      try {
        const constants = StableDiffusionLocal?.getConstants?.() || StableDiffusionLocal || {};
        console.log('📱 ONNX Runtime:', constants.ONNX_AVAILABLE ? '✅' : '❌');
      } catch (e) {
        console.log('📱 Constantes non disponibles');
      }
    }
    console.log('===========================================');
  }

  /**
   * Retourne le chemin du dossier des modèles
   */
  getModelDirectory() {
    return `${FileSystem.documentDirectory}sd_models/`;
  }

  /**
   * Retourne le chemin du fichier modèle
   */
  getModelPath() {
    return `${this.getModelDirectory()}sd_turbo.safetensors`;
  }

  /**
   * Vérifie si le modèle existe localement
   */
  async checkModelExists() {
    try {
      const modelPath = this.getModelPath();
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      const minSize = 100 * 1024 * 1024; // Au moins 100 MB
      
      const exists = fileInfo.exists && fileInfo.size > minSize;
      const sizeMB = fileInfo.size ? fileInfo.size / 1024 / 1024 : 0;
      
      return {
        exists,
        sizeMB: sizeMB.toFixed(1),
        path: modelPath,
        expectedMB: MODEL_SIZE_MB,
      };
    } catch (error) {
      console.error('❌ Erreur vérification modèle:', error);
      return {
        exists: false,
        sizeMB: 0,
        error: error.message,
      };
    }
  }

  /**
   * Vérifie si le service est disponible
   */
  async checkAvailability() {
    console.log('🔍 Vérification disponibilité SD Local...');
    
    // Vérifier le modèle côté JS
    const modelCheck = await this.checkModelExists();
    
    // Si le module natif n'est pas disponible
    if (!this.isAvailable) {
      return {
        available: false,
        reason: Platform.OS === 'android' 
          ? 'Module natif en cours de chargement... Relancez l\'app.'
          : 'SD Local uniquement disponible sur Android',
        modelDownloaded: modelCheck.exists,
        modelSizeMB: parseFloat(modelCheck.sizeMB || 0),
        modelPath: modelCheck.path,
        canRunSD: false,
        ramMB: 0,
        pipelineReady: false,
        onnxAvailable: false,
      };
    }

    try {
      // Obtenir les infos du module natif
      const [modelStatus, systemInfo] = await Promise.all([
        StableDiffusionLocal.isModelAvailable(),
        StableDiffusionLocal.getSystemInfo(),
      ]);
      
      // Le modèle est téléchargé si détecté côté JS ou côté natif
      const modelDownloaded = modelCheck.exists || modelStatus.available;
      
      return {
        available: true,
        modelDownloaded,
        modelSizeMB: parseFloat(modelCheck.sizeMB || modelStatus.sizeMB || 0),
        modelPath: modelCheck.path,
        ramMB: systemInfo.maxMemoryMB,
        canRunSD: systemInfo.canRunSD,
        usedRamMB: systemInfo.usedMemoryMB,
        freeRamMB: systemInfo.freeMemoryMB,
        onnxAvailable: modelStatus.onnxRuntime || false,
        pipelineReady: false, // Le pipeline ONNX n'est pas encore implémenté
        reason: this.getStatusReason(modelCheck, modelStatus, systemInfo),
      };
    } catch (error) {
      console.error('❌ Erreur module natif:', error);
      
      return {
        available: false,
        reason: `Erreur: ${error.message}`,
        modelDownloaded: modelCheck.exists,
        modelSizeMB: parseFloat(modelCheck.sizeMB || 0),
        modelPath: modelCheck.path,
        canRunSD: false,
        ramMB: 0,
        pipelineReady: false,
        onnxAvailable: false,
      };
    }
  }

  /**
   * Génère un message de statut clair
   */
  getStatusReason(modelCheck, modelStatus, systemInfo) {
    if (!modelStatus?.onnxRuntime) {
      return '⚠️ Pipeline ONNX en développement - Freebox utilisée';
    }
    if (!modelCheck.exists) {
      return `⏳ Modèle à télécharger (~${MODEL_SIZE_MB} MB)`;
    }
    if (systemInfo && !systemInfo.canRunSD) {
      return `⚠️ RAM insuffisante (${systemInfo.maxMemoryMB?.toFixed(0)} MB, besoin 3 GB+)`;
    }
    return '📦 Modèle téléchargé - Pipeline en développement';
  }

  /**
   * Télécharge le modèle SD-Turbo
   * @param {function} onProgress - Callback pour la progression (progress, status)
   */
  async downloadModel(onProgress = null) {
    console.log('📥 Début téléchargement modèle SD-Turbo...');
    
    try {
      // Créer le dossier si nécessaire
      const modelDir = this.getModelDirectory();
      const dirInfo = await FileSystem.getInfoAsync(modelDir);
      if (!dirInfo.exists) {
        console.log('📁 Création dossier:', modelDir);
        await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
      }
      
      const modelPath = this.getModelPath();
      
      console.log('🌐 URL:', MODEL_URL);
      console.log('📂 Destination:', modelPath);
      console.log(`📊 Taille estimée: ~${MODEL_SIZE_MB} MB`);
      
      // Vérifier si déjà téléchargé
      const existingFile = await FileSystem.getInfoAsync(modelPath);
      if (existingFile.exists && existingFile.size > 100 * 1024 * 1024) {
        const sizeMB = existingFile.size / 1024 / 1024;
        console.log(`✅ Modèle déjà téléchargé (${sizeMB.toFixed(1)} MB)`);
        if (onProgress) {
          onProgress(100, 'Déjà téléchargé');
        }
        return {
          success: true,
          sizeMB: sizeMB.toFixed(1),
          path: modelPath,
          message: 'Modèle déjà téléchargé !',
        };
      }
      
      // Télécharger
      const downloadResumable = FileSystem.createDownloadResumable(
        MODEL_URL,
        modelPath,
        {},
        (downloadProgress) => {
          if (downloadProgress.totalBytesExpectedToWrite > 0) {
            const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
            const downloadedMB = downloadProgress.totalBytesWritten / 1024 / 1024;
            const totalMB = downloadProgress.totalBytesExpectedToWrite / 1024 / 1024;
            
            console.log(`📥 ${progress.toFixed(1)}% (${downloadedMB.toFixed(0)}/${totalMB.toFixed(0)} MB)`);
            
            if (onProgress) {
              onProgress(progress, `${downloadedMB.toFixed(0)}/${totalMB.toFixed(0)} MB`);
            }
          }
        }
      );
      
      const result = await downloadResumable.downloadAsync();
      
      if (result && result.uri) {
        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        const sizeMB = fileInfo.size / 1024 / 1024;
        
        console.log(`✅ Téléchargement terminé: ${sizeMB.toFixed(1)} MB`);
        
        return {
          success: true,
          sizeMB: sizeMB.toFixed(1),
          path: result.uri,
          message: 'Modèle téléchargé avec succès !',
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
   * Initialise le modèle dans le module natif
   */
  async initializeModel() {
    if (!this.isAvailable) {
      throw new Error('Module natif non disponible');
    }

    // Vérifier que le modèle est téléchargé
    const modelCheck = await this.checkModelExists();
    if (!modelCheck.exists) {
      throw new Error('Modèle non téléchargé. Téléchargez d\'abord le modèle.');
    }

    try {
      console.log('🔄 Initialisation du modèle...');
      const result = await StableDiffusionLocal.initializeModel();
      this.isModelLoaded = true;
      console.log('✅ Modèle initialisé');
      return result;
    } catch (error) {
      console.error('❌ Erreur initialisation:', error);
      this.isModelLoaded = false;
      throw error;
    }
  }

  /**
   * Génère une image avec le pipeline SD local
   */
  async generateImage(prompt, options = {}) {
    if (!this.isAvailable) {
      console.log('⚠️ Module natif non disponible, fallback...');
      return null;
    }

    // Vérifier que les modèles sont chargés
    const status = await this.checkAvailability();
    if (!status.pipelineReady) {
      console.log('⚠️ Pipeline pas prêt, fallback...');
      return null;
    }

    try {
      // Initialiser si nécessaire
      if (!this.isModelLoaded) {
        await this.initializeModel();
      }

      const {
        negativePrompt = 'blurry, bad quality, deformed',
        steps = 4, // SD-Turbo utilise très peu d'étapes
        guidanceScale = 0.0, // SD-Turbo n'utilise pas de guidance
      } = options;

      console.log('🎨 Génération SD Local...');
      console.log('   Prompt:', prompt.substring(0, 50) + '...');
      console.log('   Steps:', steps);
      
      const result = await StableDiffusionLocal.generateImage(
        prompt,
        negativePrompt,
        steps,
        guidanceScale
      );

      if (result.success && result.imagePath) {
        console.log('✅ Image générée:', result.imagePath);
        return `file://${result.imagePath}`;
      } else {
        console.log('⚠️ Génération échouée:', result.error || result.message);
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur génération:', error);
      return null;
    }
  }

  /**
   * Libère les modèles de la mémoire
   */
  async releaseModel() {
    if (!this.isAvailable || !this.isModelLoaded) {
      return;
    }

    try {
      await StableDiffusionLocal.releaseModel();
      this.isModelLoaded = false;
      console.log('✅ Modèles libérés');
    } catch (error) {
      console.error('❌ Erreur libération:', error);
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
        onnxAvailable: false,
      };
    }

    try {
      return await StableDiffusionLocal.getSystemInfo();
    } catch (error) {
      console.error('❌ Erreur infos système:', error);
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
        await FileSystem.deleteAsync(modelPath, { idempotent: true });
        console.log('✅ Modèle supprimé');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      throw error;
    }
  }

  /**
   * Alias pour compatibilité
   */
  async deleteModels() {
    return this.deleteModel();
  }
}

export default new StableDiffusionLocalService();
