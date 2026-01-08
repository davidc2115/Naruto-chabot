/**
 * Service Stable Diffusion Local (génération sur smartphone)
 * 
 * Version 3.1 - STATUT:
 * ✅ Module natif se charge correctement
 * ✅ Téléchargement du modèle fonctionne
 * ⏳ Pipeline de génération en développement
 * 🏠 Freebox utilisée comme fallback
 */

import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const { StableDiffusionLocal } = NativeModules;

// URL du modèle SD-Turbo
const MODEL_URL = 'https://huggingface.co/stabilityai/sd-turbo/resolve/main/sd_turbo.safetensors';
const MODEL_SIZE_MB = 2500; // ~2.5 GB

class StableDiffusionLocalService {
  constructor() {
    this.isModuleAvailable = Platform.OS === 'android' && StableDiffusionLocal != null;
    this.isModelLoaded = false;
    
    console.log('===========================================');
    console.log('🎨 StableDiffusionLocalService v3.1');
    console.log('📱 Platform:', Platform.OS);
    console.log('📱 Module natif:', this.isModuleAvailable ? '✅ Disponible' : '❌ Non disponible');
    
    if (this.isModuleAvailable) {
      try {
        const constants = StableDiffusionLocal.getConstants ? StableDiffusionLocal.getConstants() : StableDiffusionLocal;
        console.log('📱 Module version:', constants?.VERSION || 'unknown');
        console.log('📱 Pipeline implémenté:', constants?.PIPELINE_IMPLEMENTED ? '✅' : '❌');
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
      
      console.log(`📁 Modèle: ${exists ? '✅ Présent' : '❌ Absent'} (${sizeMB.toFixed(0)} MB)`);
      
      return {
        exists,
        sizeMB: sizeMB.toFixed(1),
        path: modelPath,
        expectedMB: MODEL_SIZE_MB,
      };
    } catch (error) {
      console.error('❌ Erreur vérification modèle:', error);
      return { exists: false, sizeMB: 0, error: error.message };
    }
  }

  /**
   * Vérifie si le service est disponible
   */
  async checkAvailability() {
    console.log('🔍 Vérification disponibilité SD Local...');
    
    // Vérifier le modèle côté JS
    const modelCheck = await this.checkModelExists();
    
    // Construire la réponse de base
    const baseResponse = {
      modelDownloaded: modelCheck.exists,
      modelSizeMB: parseFloat(modelCheck.sizeMB || 0),
      modelPath: modelCheck.path,
      expectedSizeMB: MODEL_SIZE_MB,
    };
    
    // Si le module natif n'est pas disponible (iOS ou erreur)
    if (!this.isModuleAvailable) {
      return {
        ...baseResponse,
        available: false,
        moduleLoaded: false,
        pipelineReady: false,
        canRunSD: false,
        reason: Platform.OS === 'ios' 
          ? 'SD Local non disponible sur iOS'
          : 'Module natif non chargé. Redémarrez l\'app.',
      };
    }

    try {
      // Obtenir les infos du module natif
      const [modelStatus, systemInfo] = await Promise.all([
        StableDiffusionLocal.isModelAvailable(),
        StableDiffusionLocal.getSystemInfo(),
      ]);
      
      // Le modèle est téléchargé si détecté côté JS ou côté natif
      const isDownloaded = modelCheck.exists || modelStatus.modelDownloaded;
      
      return {
        available: true, // Module chargé
        moduleLoaded: modelStatus.moduleLoaded || true,
        modelDownloaded: isDownloaded,
        modelSizeMB: parseFloat(modelCheck.sizeMB || modelStatus.sizeMB || 0),
        modelPath: modelCheck.path,
        expectedSizeMB: MODEL_SIZE_MB,
        ramMB: systemInfo.maxMemoryMB,
        freeStorageMB: systemInfo.freeStorageMB,
        canRunSD: systemInfo.canRunSD,
        pipelineReady: false, // Pas encore implémenté
        reason: this.getStatusMessage(isDownloaded, systemInfo),
      };
    } catch (error) {
      console.error('❌ Erreur module natif:', error);
      
      return {
        ...baseResponse,
        available: false,
        moduleLoaded: false,
        pipelineReady: false,
        canRunSD: false,
        reason: `Erreur: ${error.message}`,
      };
    }
  }

  /**
   * Génère un message de statut clair
   */
  getStatusMessage(modelDownloaded, systemInfo) {
    if (!modelDownloaded) {
      const storageFree = systemInfo?.freeStorageMB || 0;
      if (storageFree < 3000) {
        return `❌ Espace insuffisant (${storageFree.toFixed(0)} MB libre, besoin 3 GB)`;
      }
      return `⏳ Modèle à télécharger (~${MODEL_SIZE_MB} MB)`;
    }
    
    if (!systemInfo?.canRunSD) {
      return `⚠️ RAM insuffisante pour SD local. Freebox utilisée.`;
    }
    
    return '📦 Modèle OK. Pipeline en développement - Freebox utilisée.';
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
          message: 'Modèle téléchargé ! Le pipeline sera disponible prochainement.',
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
   * Génère une image (retourne null pour utiliser Freebox)
   */
  async generateImage(prompt, options = {}) {
    console.log('📱 SD Local: Génération demandée');
    
    // Le pipeline n'est pas encore implémenté
    // Retourner null pour que ImageGenerationService utilise Freebox
    console.log('⚠️ Pipeline non implémenté - Fallback Freebox');
    return null;
  }

  /**
   * Retourne les infos système
   */
  async getSystemInfo() {
    if (!this.isModuleAvailable) {
      return {
        maxMemoryMB: 0,
        freeStorageMB: 0,
        canRunSD: false,
        moduleLoaded: false,
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
}

export default new StableDiffusionLocalService();
