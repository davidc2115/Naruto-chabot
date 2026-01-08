/**
 * Service Stable Diffusion Local (génération sur smartphone)
 * Version 3.2
 * 
 * STATUT:
 * ✅ Module natif se charge correctement
 * ✅ Téléchargement du modèle fonctionne
 * ⏳ Pipeline de génération en développement
 * 🏠 Freebox utilisée comme fallback
 */

import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Récupération du module natif
const { StableDiffusionLocal } = NativeModules;

// URL du modèle SD-Turbo
const MODEL_URL = 'https://huggingface.co/stabilityai/sd-turbo/resolve/main/sd_turbo.safetensors';
const MODEL_SIZE_MB = 2500; // ~2.5 GB

class StableDiffusionLocalService {
  constructor() {
    // Détection du module natif
    this.nativeModule = StableDiffusionLocal;
    this.isAndroid = Platform.OS === 'android';
    this.moduleInfo = this._getModuleInfo();
    
    console.log('╔════════════════════════════════════════╗');
    console.log('║  StableDiffusionLocalService v3.2      ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('📱 Platform:', Platform.OS, Platform.Version);
    console.log('📱 Module natif:', this.moduleInfo.status);
    
    if (this.moduleInfo.isLoaded) {
      console.log('📱 Module version:', this.moduleInfo.version);
      console.log('📱 Constantes disponibles:', this.moduleInfo.hasConstants);
    }
    console.log('==========================================');
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
        hasConstants: false,
      };
    }

    if (!this.nativeModule) {
      return {
        isLoaded: false,
        status: '❌ Module non trouvé dans NativeModules',
        version: null,
        hasConstants: false,
      };
    }

    // Le module existe, vérifions les constantes
    try {
      const constants = this.nativeModule.getConstants 
        ? this.nativeModule.getConstants() 
        : this.nativeModule;
      
      return {
        isLoaded: true,
        status: '✅ Module chargé',
        version: constants?.VERSION || 'unknown',
        hasConstants: !!constants?.IS_LOADED,
        constants: constants,
      };
    } catch (e) {
      return {
        isLoaded: true,
        status: '⚠️ Module chargé (constantes inaccessibles)',
        version: 'unknown',
        hasConstants: false,
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
   * Retourne le chemin du fichier modèle
   */
  getModelPath() {
    return `${this.getModelDirectory()}sd_turbo.safetensors`;
  }

  /**
   * Vérifie si le modèle existe localement (côté JavaScript)
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
        sizeBytes: fileInfo.size || 0,
        path: modelPath,
        expectedMB: MODEL_SIZE_MB,
      };
    } catch (error) {
      console.error('❌ Erreur vérification modèle JS:', error);
      return { exists: false, sizeMB: 0, error: error.message };
    }
  }

  /**
   * Vérifie la disponibilité complète du service
   */
  async checkAvailability() {
    console.log('🔍 Vérification disponibilité SD Local...');
    
    // Vérifier le modèle côté JS d'abord
    const jsModelCheck = await this.checkModelExists();
    console.log('📁 JS Model check:', jsModelCheck.exists ? 'Présent' : 'Absent');
    
    // Construire la réponse de base
    const baseResponse = {
      platform: Platform.OS,
      modelDownloaded: jsModelCheck.exists,
      modelSizeMB: parseFloat(jsModelCheck.sizeMB || 0),
      modelPath: jsModelCheck.path,
      expectedSizeMB: MODEL_SIZE_MB,
    };
    
    // Si ce n'est pas Android
    if (!this.isAndroid) {
      return {
        ...baseResponse,
        available: false,
        moduleLoaded: false,
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
        pipelineReady: false,
        canRunSD: false,
        reason: this.moduleInfo.status,
      };
    }

    // Le module est chargé, essayons de communiquer avec lui
    try {
      console.log('📡 Appel module natif...');
      
      const [modelStatus, systemInfo] = await Promise.all([
        this.nativeModule.isModelAvailable(),
        this.nativeModule.getSystemInfo(),
      ]);
      
      console.log('📱 Native modelStatus:', JSON.stringify(modelStatus));
      console.log('📱 Native systemInfo:', JSON.stringify(systemInfo));
      
      // Combiner les vérifications JS et native
      const isModelDownloaded = jsModelCheck.exists || modelStatus?.modelDownloaded;
      
      return {
        ...baseResponse,
        available: true,
        moduleLoaded: true,
        moduleVersion: modelStatus?.moduleVersion || this.moduleInfo.version,
        modelDownloaded: isModelDownloaded,
        modelSizeMB: parseFloat(jsModelCheck.sizeMB || modelStatus?.sizeMB || 0),
        nativeModelPath: modelStatus?.modelPath,
        
        // Infos système
        ramMB: systemInfo?.maxMemoryMB || 0,
        freeRamMB: systemInfo?.freeMemoryMB || 0,
        freeStorageMB: systemInfo?.freeStorageMB || 0,
        processors: systemInfo?.availableProcessors || 0,
        canRunSD: systemInfo?.canRunSD || false,
        deviceModel: systemInfo?.deviceModel || 'Unknown',
        androidVersion: systemInfo?.androidVersion || 'Unknown',
        
        // Pipeline
        pipelineReady: false,
        reason: this._buildStatusMessage(isModelDownloaded, systemInfo),
      };
      
    } catch (error) {
      console.error('❌ Erreur communication module natif:', error);
      
      return {
        ...baseResponse,
        available: true, // Le module existe mais la communication a échoué
        moduleLoaded: true,
        pipelineReady: false,
        canRunSD: false,
        error: error.message,
        reason: `Module chargé mais erreur: ${error.message}`,
      };
    }
  }

  /**
   * Construit un message de statut clair
   */
  _buildStatusMessage(modelDownloaded, systemInfo) {
    if (!modelDownloaded) {
      const storageFree = systemInfo?.freeStorageMB || 0;
      if (storageFree < 3000) {
        return `❌ Espace insuffisant (${storageFree.toFixed(0)} MB libre, besoin ~3 GB)`;
      }
      return `📥 Modèle à télécharger (~${MODEL_SIZE_MB} MB)`;
    }
    
    if (!systemInfo?.canRunSD) {
      const ramMB = systemInfo?.maxMemoryMB || 0;
      return `⚠️ RAM limitée (${ramMB.toFixed(0)} MB). Freebox recommandée.`;
    }
    
    return '✅ Modèle OK. Pipeline en développement - Freebox utilisée.';
  }

  /**
   * Télécharge le modèle SD-Turbo
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
      
      // Vérifier si déjà téléchargé
      const existingFile = await FileSystem.getInfoAsync(modelPath);
      if (existingFile.exists && existingFile.size > 100 * 1024 * 1024) {
        const sizeMB = existingFile.size / 1024 / 1024;
        console.log(`✅ Modèle déjà téléchargé (${sizeMB.toFixed(1)} MB)`);
        if (onProgress) onProgress(100, 'Déjà téléchargé');
        return {
          success: true,
          sizeMB: sizeMB.toFixed(1),
          path: modelPath,
          message: 'Modèle déjà présent !',
        };
      }
      
      console.log('🌐 Téléchargement depuis:', MODEL_URL);
      
      const downloadResumable = FileSystem.createDownloadResumable(
        MODEL_URL,
        modelPath,
        {},
        (progress) => {
          if (progress.totalBytesExpectedToWrite > 0) {
            const pct = (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100;
            const dlMB = progress.totalBytesWritten / 1024 / 1024;
            const totalMB = progress.totalBytesExpectedToWrite / 1024 / 1024;
            if (onProgress) onProgress(pct, `${dlMB.toFixed(0)}/${totalMB.toFixed(0)} MB`);
          }
        }
      );
      
      const result = await downloadResumable.downloadAsync();
      
      if (result?.uri) {
        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        const sizeMB = fileInfo.size / 1024 / 1024;
        console.log(`✅ Téléchargement terminé: ${sizeMB.toFixed(1)} MB`);
        
        return {
          success: true,
          sizeMB: sizeMB.toFixed(1),
          path: result.uri,
          message: 'Modèle téléchargé ! Pipeline bientôt disponible.',
        };
      }
      
      throw new Error('Téléchargement échoué');
    } catch (error) {
      console.error('❌ Erreur téléchargement:', error);
      throw error;
    }
  }

  /**
   * Génère une image (retourne null → Freebox sera utilisée)
   */
  async generateImage(prompt, options = {}) {
    console.log('📱 SD Local: Génération demandée');
    console.log('⚠️ Pipeline non implémenté - Fallback Freebox');
    return null;
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
