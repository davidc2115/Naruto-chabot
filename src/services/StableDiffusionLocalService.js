/**
 * Service Stable Diffusion Local (génération sur smartphone)
 * 
 * STATUT: Téléchargement OK, Génération en développement
 * Le modèle peut être téléchargé pour préparer l'utilisation future.
 * En attendant, la Freebox est utilisée comme fallback.
 */

import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const { StableDiffusionLocal } = NativeModules;

class StableDiffusionLocalService {
  constructor() {
    // Vérifier si le module natif existe
    this.isAvailable = Platform.OS === 'android' && StableDiffusionLocal != null;
    this.isModelLoaded = false;
    this.modelInfo = null;
    
    console.log('🎨 StableDiffusionLocalService initialized');
    console.log('📱 Platform:', Platform.OS);
    console.log('📱 Module natif:', this.isAvailable ? 'Disponible' : 'Non disponible');
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
      
      console.log('📁 Vérification modèle:', modelPath);
      console.log('📁 Existe:', fileInfo.exists);
      
      return {
        exists: fileInfo.exists,
        size: fileInfo.size || 0,
        sizeMB: fileInfo.size ? fileInfo.size / 1024 / 1024 : 0,
        path: modelPath,
      };
    } catch (error) {
      console.error('❌ Erreur vérification modèle:', error);
      return { exists: false, size: 0, sizeMB: 0, path: this.getModelPath() };
    }
  }

  /**
   * Vérifie si le service est disponible
   */
  async checkAvailability() {
    console.log('🔍 Vérification disponibilité SD Local');
    
    // Vérifier le modèle côté JS
    const jsCheck = await this.checkModelExistsJS();
    
    // Si le module natif n'est pas disponible
    if (!this.isAvailable) {
      return {
        available: false,
        reason: 'Module natif non chargé (sera disponible après compilation native)',
        modelDownloaded: jsCheck.exists,
        modelSizeMB: jsCheck.sizeMB,
        modelPath: jsCheck.path,
        canRunSD: false,
        ramMB: 0,
        pipelineReady: false,
      };
    }

    try {
      // Essayer d'obtenir les infos du module natif
      const modelStatus = await StableDiffusionLocal.isModelAvailable();
      const systemInfo = await StableDiffusionLocal.getSystemInfo();
      
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
        pipelineReady: false, // Le pipeline n'est pas encore implémenté
        reason: modelDownloaded 
          ? 'Modèle téléchargé. Pipeline en développement.'
          : 'Modèle non téléchargé.',
      };
    } catch (error) {
      console.error('❌ Erreur module natif:', error);
      
      return {
        available: false,
        reason: `Erreur module: ${error.message}`,
        modelDownloaded: jsCheck.exists,
        modelSizeMB: jsCheck.sizeMB,
        modelPath: jsCheck.path,
        canRunSD: false,
        ramMB: 0,
        pipelineReady: false,
      };
    }
  }

  /**
   * Télécharge le modèle SD-Turbo
   * @param {function} onProgress - Callback pour la progression (0-100)
   */
  async downloadModel(onProgress = null) {
    console.log('📥 Début téléchargement modèle SD');
    
    try {
      // Créer le dossier si nécessaire
      const modelDir = this.getModelDirectory();
      const dirInfo = await FileSystem.getInfoAsync(modelDir);
      if (!dirInfo.exists) {
        console.log('📁 Création dossier:', modelDir);
        await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
      }
      
      const modelPath = this.getModelPath();
      
      // URL du modèle SD-Turbo (Hugging Face)
      // Ce modèle fait environ 2.5 GB
      const modelUrl = 'https://huggingface.co/stabilityai/sd-turbo/resolve/main/sd_turbo.safetensors';
      
      console.log('🌐 Téléchargement depuis:', modelUrl);
      console.log('📂 Destination:', modelPath);
      
      // Supprimer l'ancien fichier s'il existe
      const existingFile = await FileSystem.getInfoAsync(modelPath);
      if (existingFile.exists) {
        console.log('🗑️ Suppression ancien modèle...');
        await FileSystem.deleteAsync(modelPath);
      }
      
      const downloadResumable = FileSystem.createDownloadResumable(
        modelUrl,
        modelPath,
        {},
        (downloadProgress) => {
          if (downloadProgress.totalBytesExpectedToWrite > 0) {
            const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
            console.log(`📥 Progression: ${Math.round(progress)}%`);
            if (onProgress) {
              onProgress(progress);
            }
          }
        }
      );
      
      const result = await downloadResumable.downloadAsync();
      
      if (result && result.uri) {
        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        const sizeMB = fileInfo.size / 1024 / 1024;
        
        console.log('✅ Téléchargement terminé!');
        console.log('📊 Taille:', sizeMB.toFixed(2), 'MB');
        
        return {
          success: true,
          path: result.uri,
          sizeMB: sizeMB,
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
   * Initialise le modèle (si le module natif est disponible)
   */
  async initializeModel() {
    if (!this.isAvailable) {
      throw new Error('Module natif non disponible');
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
   * Génère une image (retourne une erreur car non implémenté)
   */
  async generateImage(prompt, options = {}) {
    // Le pipeline n'est pas encore implémenté
    // Retourner null pour que le fallback vers Freebox soit utilisé
    console.log('⚠️ SD Local: Pipeline non implémenté, utilisation du fallback');
    return null;
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
      console.log('✅ Modèle libéré');
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
        await FileSystem.deleteAsync(modelPath);
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
