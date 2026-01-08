/**
 * Service Stable Diffusion Local (génération sur smartphone)
 * 
 * ⚠️ STATUT: DÉSACTIVÉ TEMPORAIREMENT
 * Le module ONNX nécessite un pipeline complet (tokenizer, UNet, VAE)
 * qui n'est pas encore implémenté.
 * 
 * La génération d'images se fait via l'API Freebox (Hugging Face SD).
 */

import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const { StableDiffusionLocal } = NativeModules;

class StableDiffusionLocalService {
  constructor() {
    // SD Local n'est PAS disponible actuellement
    // Le module ONNX existe mais le pipeline n'est pas complet
    this.isAvailable = false; // Désactivé
    this.isModelLoaded = false;
    this.modelInfo = null;
    
    console.log('🎨 StableDiffusionLocalService: DÉSACTIVÉ');
    console.log('📱 Utiliser l\'API Freebox pour la génération d\'images');
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
    return `${this.getModelDirectory()}sd_model.onnx`;
  }

  /**
   * Vérifie si le modèle existe localement
   */
  async checkModelExistsJS() {
    try {
      const modelPath = this.getModelPath();
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      
      return {
        exists: fileInfo.exists,
        size: fileInfo.size || 0,
        sizeMB: fileInfo.size ? fileInfo.size / 1024 / 1024 : 0,
        path: modelPath,
      };
    } catch (error) {
      return { exists: false, size: 0, sizeMB: 0, path: this.getModelPath() };
    }
  }

  /**
   * Vérifie si le service est disponible
   * ⚠️ Retourne TOUJOURS indisponible car non implémenté
   */
  async checkAvailability() {
    console.log('🔍 SD Local: Vérification disponibilité');
    
    // Toujours retourner non disponible avec explication claire
    return {
      available: false,
      reason: '⚠️ SD Local non disponible - Utilisez l\'API Freebox',
      reasonDetail: 'Le pipeline ONNX (tokenizer, UNet, VAE) n\'est pas encore implémenté. La génération d\'images se fait via l\'API Freebox qui utilise Stable Diffusion sur serveur.',
      modelDownloaded: false,
      modelSizeMB: 0,
      modelPath: this.getModelPath(),
      canRunSD: false,
      ramMB: 0,
      recommendation: 'Utilisez Freebox pour générer des images',
    };
  }

  /**
   * Téléchargement du modèle - DÉSACTIVÉ
   */
  async downloadModel(onProgress = null) {
    console.log('📥 SD Local: Téléchargement désactivé');
    
    throw new Error(
      '⚠️ SD Local non disponible\n\n' +
      'Le téléchargement du modèle est désactivé car le pipeline ONNX n\'est pas implémenté.\n\n' +
      'Solution: Utilisez l\'option "Freebox" dans les paramètres pour générer des images via le serveur Stable Diffusion.'
    );
  }

  /**
   * Initialisation du modèle - DÉSACTIVÉ
   */
  async initializeModel() {
    throw new Error('SD Local non disponible - Utilisez Freebox');
  }

  /**
   * Génération d'image - DÉSACTIVÉ
   */
  async generateImage(prompt, options = {}) {
    throw new Error('SD Local non disponible - Utilisez Freebox');
  }

  /**
   * Libère le modèle
   */
  async releaseModel() {
    return;
  }

  /**
   * Infos système
   */
  async getSystemInfo() {
    return {
      maxMemoryMB: 0,
      usedMemoryMB: 0,
      freeMemoryMB: 0,
      canRunSD: false,
      sdLocalStatus: 'DÉSACTIVÉ',
      recommendation: 'Utilisez Freebox',
    };
  }

  /**
   * Supprime le modèle
   */
  async deleteModel() {
    try {
      const modelDir = this.getModelDirectory();
      const dirInfo = await FileSystem.getInfoAsync(modelDir);
      
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(modelDir, { idempotent: true });
        console.log('✅ Dossier modèle supprimé');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      return false;
    }
  }
}

export default new StableDiffusionLocalService();
