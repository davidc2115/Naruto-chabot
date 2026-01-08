/**
 * Service Stable Diffusion Local (génération sur smartphone)
 * 
 * Pipeline ONNX complet pour génération d'images en local
 * Utilise les modèles UNet + VAE de SD-Turbo
 */

import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const { StableDiffusionLocal } = NativeModules;

// URLs des modèles ONNX (SD-Turbo optimisé mobile)
const MODEL_URLS = {
  // Modèle UNet quantifié (~900 MB) - Le cœur de SD
  unet: 'https://huggingface.co/AKJlU/sd-turbo-onnx/resolve/main/unet/model.onnx',
  // Décodeur VAE (~100 MB) - Convertit latents en image
  vae: 'https://huggingface.co/AKJlU/sd-turbo-onnx/resolve/main/vae_decoder/model.onnx',
  // Encodeur texte CLIP (~500 MB) - Convertit texte en embeddings
  textEncoder: 'https://huggingface.co/AKJlU/sd-turbo-onnx/resolve/main/text_encoder/model.onnx',
};

// Tailles approximatives des modèles (en MB)
const MODEL_SIZES = {
  unet: 900,
  vae: 100,
  textEncoder: 500,
  total: 1500, // ~1.5 GB total
};

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
   * Retourne les chemins des fichiers modèles
   */
  getModelPaths() {
    const dir = this.getModelDirectory();
    return {
      unet: `${dir}unet.onnx`,
      vae: `${dir}vae_decoder.onnx`,
      textEncoder: `${dir}text_encoder.onnx`,
    };
  }

  /**
   * Vérifie si tous les modèles existent localement
   */
  async checkModelsExist() {
    try {
      const paths = this.getModelPaths();
      const results = {};
      let allExist = true;
      let totalSize = 0;
      let downloadedCount = 0;

      for (const [name, path] of Object.entries(paths)) {
        const fileInfo = await FileSystem.getInfoAsync(path);
        const minSize = MODEL_SIZES[name] * 0.5 * 1024 * 1024; // Au moins 50% de la taille attendue
        
        results[name] = {
          exists: fileInfo.exists && fileInfo.size > minSize,
          size: fileInfo.size || 0,
          sizeMB: fileInfo.size ? (fileInfo.size / 1024 / 1024).toFixed(1) : 0,
          path: path,
          expectedMB: MODEL_SIZES[name],
        };
        
        if (!results[name].exists) {
          allExist = false;
        } else {
          totalSize += fileInfo.size || 0;
          downloadedCount++;
        }
      }

      return {
        allModelsPresent: allExist,
        models: results,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(1),
        downloadedCount,
        totalCount: Object.keys(paths).length,
        directory: this.getModelDirectory(),
      };
    } catch (error) {
      console.error('❌ Erreur vérification modèles:', error);
      return {
        allModelsPresent: false,
        error: error.message,
      };
    }
  }

  /**
   * Vérifie si le service est disponible
   */
  async checkAvailability() {
    console.log('🔍 Vérification disponibilité SD Local...');
    
    // Vérifier les modèles côté JS
    const modelsCheck = await this.checkModelsExist();
    
    // Si le module natif n'est pas disponible
    if (!this.isAvailable) {
      return {
        available: false,
        reason: Platform.OS === 'android' 
          ? 'Module natif en cours de chargement... Relancez l\'app.'
          : 'SD Local uniquement disponible sur Android',
        modelDownloaded: modelsCheck.allModelsPresent,
        downloadedCount: modelsCheck.downloadedCount || 0,
        totalCount: modelsCheck.totalCount || 3,
        modelSizeMB: parseFloat(modelsCheck.totalSizeMB || 0),
        models: modelsCheck.models,
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
      
      const allReady = modelsCheck.allModelsPresent && modelStatus.onnxRuntime;
      
      return {
        available: true,
        modelDownloaded: modelsCheck.allModelsPresent,
        downloadedCount: modelsCheck.downloadedCount || 0,
        totalCount: modelsCheck.totalCount || 3,
        modelSizeMB: parseFloat(modelsCheck.totalSizeMB || 0),
        models: modelsCheck.models,
        ramMB: systemInfo.maxMemoryMB,
        canRunSD: systemInfo.canRunSD,
        usedRamMB: systemInfo.usedMemoryMB,
        freeRamMB: systemInfo.freeMemoryMB,
        onnxAvailable: modelStatus.onnxRuntime || false,
        pipelineReady: allReady,
        reason: this.getStatusReason(modelsCheck, modelStatus, systemInfo),
      };
    } catch (error) {
      console.error('❌ Erreur module natif:', error);
      
      return {
        available: false,
        reason: `Erreur: ${error.message}`,
        modelDownloaded: modelsCheck.allModelsPresent,
        downloadedCount: modelsCheck.downloadedCount || 0,
        totalCount: modelsCheck.totalCount || 3,
        modelSizeMB: parseFloat(modelsCheck.totalSizeMB || 0),
        models: modelsCheck.models,
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
  getStatusReason(modelsCheck, modelStatus, systemInfo) {
    if (!modelStatus.onnxRuntime) {
      return '❌ ONNX Runtime non disponible sur cet appareil';
    }
    if (!modelsCheck.allModelsPresent) {
      const missing = 3 - (modelsCheck.downloadedCount || 0);
      return `⏳ ${missing} modèle(s) à télécharger (${MODEL_SIZES.total} MB total)`;
    }
    if (!systemInfo.canRunSD) {
      return `⚠️ RAM insuffisante (${systemInfo.maxMemoryMB?.toFixed(0)} MB, besoin 3 GB+)`;
    }
    return '✅ Prêt pour génération locale !';
  }

  /**
   * Télécharge tous les modèles nécessaires
   * @param {function} onProgress - Callback pour la progression
   */
  async downloadModel(onProgress = null) {
    console.log('📥 Début téléchargement modèles ONNX...');
    
    try {
      // Créer le dossier si nécessaire
      const modelDir = this.getModelDirectory();
      const dirInfo = await FileSystem.getInfoAsync(modelDir);
      if (!dirInfo.exists) {
        console.log('📁 Création dossier:', modelDir);
        await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
      }
      
      const paths = this.getModelPaths();
      const downloads = [
        { name: 'VAE Decoder', url: MODEL_URLS.vae, path: paths.vae, sizeMB: MODEL_SIZES.vae },
        { name: 'UNet', url: MODEL_URLS.unet, path: paths.unet, sizeMB: MODEL_SIZES.unet },
        { name: 'Text Encoder', url: MODEL_URLS.textEncoder, path: paths.textEncoder, sizeMB: MODEL_SIZES.textEncoder },
      ];
      
      let totalProgress = 0;
      let completedSize = 0;
      const totalSize = MODEL_SIZES.total;
      
      for (let i = 0; i < downloads.length; i++) {
        const dl = downloads[i];
        console.log(`\n📥 [${i + 1}/${downloads.length}] Téléchargement ${dl.name}...`);
        console.log(`   URL: ${dl.url}`);
        console.log(`   Destination: ${dl.path}`);
        console.log(`   Taille estimée: ${dl.sizeMB} MB`);
        
        // Vérifier si déjà téléchargé
        const existingFile = await FileSystem.getInfoAsync(dl.path);
        if (existingFile.exists && existingFile.size > dl.sizeMB * 0.5 * 1024 * 1024) {
          console.log(`   ✅ Déjà téléchargé (${(existingFile.size / 1024 / 1024).toFixed(1)} MB)`);
          completedSize += dl.sizeMB;
          if (onProgress) {
            onProgress((completedSize / totalSize) * 100, dl.name, true);
          }
          continue;
        }
        
        // Télécharger
        const downloadResumable = FileSystem.createDownloadResumable(
          dl.url,
          dl.path,
          {},
          (downloadProgress) => {
            if (downloadProgress.totalBytesExpectedToWrite > 0) {
              const fileProgress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
              const currentFileMB = dl.sizeMB * fileProgress;
              const overallProgress = ((completedSize + currentFileMB) / totalSize) * 100;
              
              if (onProgress) {
                onProgress(overallProgress, dl.name, false);
              }
            }
          }
        );
        
        try {
          const result = await downloadResumable.downloadAsync();
          
          if (result && result.uri) {
            const fileInfo = await FileSystem.getInfoAsync(result.uri);
            console.log(`   ✅ Téléchargé: ${(fileInfo.size / 1024 / 1024).toFixed(1)} MB`);
            completedSize += dl.sizeMB;
          } else {
            throw new Error(`Échec téléchargement ${dl.name}`);
          }
        } catch (dlError) {
          console.error(`   ❌ Erreur téléchargement ${dl.name}:`, dlError.message);
          throw dlError;
        }
      }
      
      console.log('\n✅ Tous les modèles téléchargés !');
      
      // Vérifier le résultat final
      const finalCheck = await this.checkModelsExist();
      
      return {
        success: true,
        totalSizeMB: finalCheck.totalSizeMB,
        models: finalCheck.models,
        message: 'Modèles ONNX téléchargés avec succès !',
      };
    } catch (error) {
      console.error('❌ Erreur téléchargement:', error);
      throw error;
    }
  }

  /**
   * Initialise les modèles ONNX dans le module natif
   */
  async initializeModel() {
    if (!this.isAvailable) {
      throw new Error('Module natif non disponible');
    }

    // Vérifier que les modèles sont téléchargés
    const modelsCheck = await this.checkModelsExist();
    if (!modelsCheck.allModelsPresent) {
      throw new Error('Modèles non téléchargés. Téléchargez d\'abord les modèles.');
    }

    try {
      console.log('🔄 Initialisation des modèles ONNX...');
      const result = await StableDiffusionLocal.initializeModel();
      this.isModelLoaded = true;
      console.log('✅ Modèles initialisés');
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
   * Alias pour compatibilité
   */
  async deleteModel() {
    return this.deleteModels();
  }
}

export default new StableDiffusionLocalService();
