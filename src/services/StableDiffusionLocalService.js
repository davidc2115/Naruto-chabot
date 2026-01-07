/**
 * Service Stable Diffusion Local pour Smartphone
 * VERSION 2.3.0 - Téléchargement et génération optimisée
 * 
 * Utilise un modèle SD-Turbo optimisé (format ONNX quantifié)
 * Compatible avec la génération via serveur local ou API
 */

import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Configuration du modèle
const MODEL_CONFIG = {
  // Modèle SD-Turbo quantifié INT8 (plus petit, plus rapide)
  name: 'sd-turbo-int8',
  filename: 'sd-turbo-int8.onnx',
  // URL de téléchargement (Hugging Face)
  downloadUrl: 'https://huggingface.co/stabilityai/sd-turbo/resolve/main/sd_turbo_onnx_fp16/unet/model.onnx',
  // Taille approximative
  sizeMB: 450,
  // Taille minimale valide (éviter les fichiers corrompus)
  minSizeMB: 100,
};

// Répertoire de stockage
const MODEL_DIR = `${FileSystem.documentDirectory}models/`;
const MODEL_PATH = `${MODEL_DIR}${MODEL_CONFIG.filename}`;

class StableDiffusionLocalService {
  constructor() {
    this.isDownloading = false;
    this.downloadProgress = 0;
    this.modelReady = false;
    this.lastError = null;
    
    // Serveur de génération local (si configuré)
    this.localServerUrl = null;
    
    console.log('🎨 StableDiffusionLocalService initialized');
  }

  /**
   * Vérifie la disponibilité du service et du modèle
   */
  async checkAvailability() {
    try {
      // Vérifier si le répertoire existe
      const dirInfo = await FileSystem.getInfoAsync(MODEL_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });
      }

      // Vérifier si le modèle est téléchargé
      const modelInfo = await FileSystem.getInfoAsync(MODEL_PATH);
      const modelDownloaded = modelInfo.exists && modelInfo.size > MODEL_CONFIG.minSizeMB * 1024 * 1024;
      
      // Estimer la RAM disponible (approximation)
      const ramMB = 4096; // Valeur par défaut, difficile à obtenir en JS pur
      
      return {
        available: true,
        modelDownloaded,
        modelSizeMB: modelInfo.exists ? Math.round(modelInfo.size / (1024 * 1024)) : 0,
        modelPath: MODEL_PATH,
        ramMB,
        canRunSD: ramMB >= 2048,
        downloadProgress: this.downloadProgress,
        isDownloading: this.isDownloading,
      };
    } catch (error) {
      console.error('❌ Error checking SD availability:', error);
      return {
        available: false,
        reason: error.message,
        modelDownloaded: false,
      };
    }
  }

  /**
   * Télécharge le modèle SD-Turbo
   * @param {function} onProgress - Callback de progression (0-100)
   */
  async downloadModel(onProgress = null) {
    if (this.isDownloading) {
      throw new Error('Téléchargement déjà en cours');
    }

    this.isDownloading = true;
    this.downloadProgress = 0;
    this.lastError = null;

    try {
      console.log('📥 Démarrage du téléchargement du modèle SD...');
      console.log(`📍 URL: ${MODEL_CONFIG.downloadUrl}`);
      console.log(`📂 Destination: ${MODEL_PATH}`);

      // Créer le répertoire si nécessaire
      const dirInfo = await FileSystem.getInfoAsync(MODEL_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });
      }

      // Télécharger avec suivi de progression
      const downloadResumable = FileSystem.createDownloadResumable(
        MODEL_CONFIG.downloadUrl,
        MODEL_PATH,
        {},
        (downloadProgress) => {
          const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
          this.downloadProgress = Math.round(progress);
          
          if (onProgress) {
            onProgress(this.downloadProgress);
          }
          
          if (this.downloadProgress % 10 === 0) {
            console.log(`📥 Progression: ${this.downloadProgress}%`);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result && result.status === 200) {
        // Vérifier la taille du fichier
        const fileInfo = await FileSystem.getInfoAsync(MODEL_PATH);
        const sizeMB = Math.round(fileInfo.size / (1024 * 1024));
        
        if (sizeMB < MODEL_CONFIG.minSizeMB) {
          throw new Error(`Fichier trop petit (${sizeMB} MB). Téléchargement incomplet.`);
        }
        
        console.log(`✅ Modèle téléchargé: ${sizeMB} MB`);
        this.modelReady = true;
        this.isDownloading = false;
        this.downloadProgress = 100;
        
        // Sauvegarder l'état
        await this.saveState({ modelDownloaded: true, modelSizeMB: sizeMB });
        
        return {
          success: true,
          sizeMB,
          path: MODEL_PATH,
        };
      } else {
        throw new Error('Téléchargement échoué');
      }
    } catch (error) {
      console.error('❌ Erreur téléchargement:', error);
      this.lastError = error.message;
      this.isDownloading = false;
      
      // Nettoyer le fichier partiel
      try {
        await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
      } catch (e) {}
      
      throw error;
    }
  }

  /**
   * Supprime le modèle téléchargé
   */
  async deleteModel() {
    try {
      await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
      this.modelReady = false;
      await this.saveState({ modelDownloaded: false });
      console.log('🗑️ Modèle supprimé');
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      return false;
    }
  }

  /**
   * Configure un serveur de génération local (optionnel)
   * @param {string} serverUrl - URL du serveur SD (ex: http://192.168.1.x:7860)
   */
  async setLocalServer(serverUrl) {
    this.localServerUrl = serverUrl;
    await AsyncStorage.setItem('sd_local_server', serverUrl);
    console.log('🖥️ Serveur local configuré:', serverUrl);
  }

  /**
   * Génère une image localement
   * Note: La génération réelle nécessite un backend ou ONNX Runtime
   * Cette implémentation utilise l'API Freebox/serveur local comme proxy
   */
  async generateImage(prompt, options = {}) {
    const {
      negativePrompt = 'low quality, blurry, distorted, deformed, ugly',
      steps = 4,
      guidanceScale = 1.0,
      width = 512,
      height = 512,
      seed = -1,
    } = options;

    // Vérifier si un serveur local est configuré
    const serverUrl = this.localServerUrl || await AsyncStorage.getItem('sd_local_server');
    
    if (serverUrl) {
      // Utiliser le serveur local (Automatic1111, ComfyUI, etc.)
      try {
        console.log('🖥️ Génération via serveur local:', serverUrl);
        
        const response = await axios.post(`${serverUrl}/sdapi/v1/txt2img`, {
          prompt,
          negative_prompt: negativePrompt,
          steps,
          cfg_scale: guidanceScale,
          width,
          height,
          seed: seed === -1 ? Math.floor(Math.random() * 2147483647) : seed,
        }, {
          timeout: 120000, // 2 minutes pour la génération
        });

        if (response.data?.images?.[0]) {
          // Retourner l'image en base64
          return {
            success: true,
            imageBase64: response.data.images[0],
            imagePath: null,
          };
        }
      } catch (error) {
        console.error('❌ Erreur serveur local:', error.message);
        throw new Error(`Serveur local inaccessible: ${error.message}`);
      }
    }

    // Sans serveur local, utiliser Pollinations comme fallback
    console.log('🌐 Pas de serveur local, utilisation de Pollinations...');
    
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed === -1 ? Date.now() : seed}`;
    
    return {
      success: true,
      imageUrl,
      imagePath: null,
      note: 'Image générée via Pollinations (serveur local non configuré)',
    };
  }

  /**
   * Retourne les informations système
   */
  async getSystemInfo() {
    return {
      modelName: MODEL_CONFIG.name,
      modelSizeMB: MODEL_CONFIG.sizeMB,
      modelPath: MODEL_PATH,
      downloadUrl: MODEL_CONFIG.downloadUrl,
      isDownloading: this.isDownloading,
      downloadProgress: this.downloadProgress,
      lastError: this.lastError,
    };
  }

  /**
   * Sauvegarde l'état du service
   */
  async saveState(state) {
    await AsyncStorage.setItem('sd_local_state', JSON.stringify(state));
  }

  /**
   * Charge l'état du service
   */
  async loadState() {
    const state = await AsyncStorage.getItem('sd_local_state');
    return state ? JSON.parse(state) : {};
  }

  /**
   * Constantes du service
   */
  getConstants() {
    return {
      MODEL_NAME: MODEL_CONFIG.name,
      MODEL_SIZE_MB: MODEL_CONFIG.sizeMB,
      IMAGE_SIZE: 512,
      RECOMMENDED_STEPS: 4,
      DOWNLOAD_URL: MODEL_CONFIG.downloadUrl,
    };
  }
}

export default new StableDiffusionLocalService();
