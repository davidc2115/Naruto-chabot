import AsyncStorage from '@react-native-async-storage/async-storage';
import LlamaService from './LlamaService';
import LocalImageService from './LocalImageService';

/**
 * AutoInitService v1.0 — Initialisation automatique des modèles au démarrage
 * 
 * Ce service gère le chargement automatique des modèles locaux (LLM et Image)
 * au démarrage de l'application pour une expérience utilisateur fluide.
 * 
 * Fonctionnalités:
 *   - Chargement automatique du modèle LLM local (LlamaService)
 *   - Chargement automatique du modèle d'image locale (LocalImageService)
 *   - Gestion des préférences utilisateur pour l'auto-chargement
 *   - Rapport d'état pour l'UI (loading, success, error)
 *   - Possibilité de désactiver l'auto-chargement pour les appareils avec peu de RAM
 */

const AUTO_INIT_LLAMA_KEY = 'auto_init_llama';
const AUTO_INIT_IMAGE_KEY = 'auto_init_image';
const PREFERRED_LLAMA_MODEL_KEY = 'preferred_llama_model';
const PREFERRED_IMAGE_MODEL_KEY = 'preferred_image_model';

class AutoInitService {
  constructor() {
    this.isInitialized = false;
    this.initializationStatus = {
      llama: 'idle', // idle, loading, success, error
      image: 'idle', // idle, loading, success, error
    };
    this.statusCallbacks = [];
  }

  /**
   * Enregistre un callback pour suivre le statut d'initialisation
   */
  onStatusChange(callback) {
    this.statusCallbacks.push(callback);
    // Retourner une fonction pour désenregistrer
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Notifie tous les callbacks d'un changement de statut
   */
  notifyStatusChange(service, status, error = null) {
    this.initializationStatus[service] = status;
    this.statusCallbacks.forEach(callback => {
      try {
        callback(service, status, error);
      } catch (e) {
        console.log('⚠️ Erreur callback statut:', e.message);
      }
    });
  }

  /**
   * Récupère les préférences d'auto-initialisation
   */
  async getPreferences() {
    try {
      const autoInitLlama = await AsyncStorage.getItem(AUTO_INIT_LLAMA_KEY);
      const autoInitImage = await AsyncStorage.getItem(AUTO_INIT_IMAGE_KEY);
      const preferredLlama = await AsyncStorage.getItem(PREFERRED_LLAMA_MODEL_KEY);
      const preferredImage = await AsyncStorage.getItem(PREFERRED_IMAGE_MODEL_KEY);

      return {
        autoInitLlama: autoInitLlama !== 'false', // true par défaut
        autoInitImage: autoInitImage !== 'false', // true par défaut
        preferredLlamaModel: preferredLlama || 'phi35mini', // Phi-3.5 par défaut
        preferredImageModel: preferredImage || 'styleTransfer', // Style Transfer par défaut
      };
    } catch (e) {
      console.log('⚠️ Erreur récupération préférences:', e.message);
      return {
        autoInitLlama: true,
        autoInitImage: true,
        preferredLlamaModel: 'phi35mini',
        preferredImageModel: 'styleTransfer',
      };
    }
  }

  /**
   * Définit les préférences d'auto-initialisation
   */
  async setPreferences(preferences) {
    try {
      if (preferences.autoInitLlama !== undefined) {
        await AsyncStorage.setItem(AUTO_INIT_LLAMA_KEY, String(preferences.autoInitLlama));
      }
      if (preferences.autoInitImage !== undefined) {
        await AsyncStorage.setItem(AUTO_INIT_IMAGE_KEY, String(preferences.autoInitImage));
      }
      if (preferences.preferredLlamaModel) {
        await AsyncStorage.setItem(PREFERRED_LLAMA_MODEL_KEY, preferences.preferredLlamaModel);
      }
      if (preferences.preferredImageModel) {
        await AsyncStorage.setItem(PREFERRED_IMAGE_MODEL_KEY, preferences.preferredImageModel);
      }
      console.log('✅ Préférences auto-init sauvegardées');
    } catch (e) {
      console.log('⚠️ Erreur sauvegarde préférences:', e.message);
    }
  }

  /**
   * Initialise automatiquement les modèles au démarrage de l'application
   * Cette fonction doit être appelée dans App.js au démarrage
   */
  async initializeAll(onProgress = null) {
    if (this.isInitialized) {
      console.log('🔄 AutoInit: déjà initialisé');
      return this.initializationStatus;
    }

    console.log('🚀 AutoInit: Démarrage de l\'initialisation automatique...');
    this.isInitialized = true;

    const preferences = await this.getPreferences();
    console.log('⚙️ Préférences:', preferences);

    // Initialisation du modèle LLM
    if (preferences.autoInitLlama) {
      await this.initializeLlama(preferences.preferredLlamaModel, onProgress);
    } else {
      console.log('⏭️ AutoInit LLM désactivé');
      this.notifyStatusChange('llama', 'disabled');
    }

    // Initialisation du modèle d'image - DÉSACTIVÉ car placeholder
    console.log('⏭️ AutoInit Image désactivé (placeholder)');
    this.notifyStatusChange('image', 'disabled');

    console.log('✅ AutoInit: Initialisation terminée');
    return this.initializationStatus;
  }

  /**
   * Initialise le modèle LLM local
   */
  async initializeLlama(modelId, onProgress) {
    try {
      this.notifyStatusChange('llama', 'loading');
      onProgress?.('llama', 'loading', 'Chargement du modèle LLM...');

      // Vérifier si le modèle est téléchargé
      const isDownloaded = await LlamaService.isModelDownloaded(modelId);
      if (!isDownloaded) {
        console.log('⚠️ Modèle LLM non téléchargé, auto-téléchargement désactivé');
        this.notifyStatusChange('llama', 'disabled');
        onProgress?.('llama', 'disabled', 'Modèle non téléchargé. Téléchargez-le dans Paramètres.');
        return;
      }

      // Charger le modèle
      onProgress?.('llama', 'loading', 'Chargement en mémoire...');
      await LlamaService.loadModel(modelId, (msg) => {
        onProgress?.('llama', 'loading', msg);
      });

      this.notifyStatusChange('llama', 'success');
      onProgress?.('llama', 'success', 'Modèle LLM prêt !');
      console.log('✅ LLM initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation LLM:', error);
      this.notifyStatusChange('llama', 'error', error);
      onProgress?.('llama', 'error', error.message);
    }
  }

  /**
   * Initialise le modèle d'image locale
   */
  async initializeImage(modelId, onProgress) {
    try {
      this.notifyStatusChange('image', 'loading');
      onProgress?.('image', 'loading', 'Chargement du modèle d\'image...');

      // Vérifier si le modèle est téléchargé
      const isDownloaded = await LocalImageService.isModelDownloaded(modelId);
      if (!isDownloaded) {
        console.log('⚠️ Modèle Image non téléchargé, téléchargement requis');
        onProgress?.('image', 'downloading', 'Téléchargement du modèle d\'image...');
        
        // Télécharger le modèle
        await LocalImageService.downloadModel(modelId, (progress, bytes, total) => {
          const pct = Math.round(progress * 100);
          onProgress?.('image', 'downloading', `Téléchargement: ${pct}%`);
        });
      }

      // Charger le modèle
      onProgress?.('image', 'loading', 'Chargement en mémoire...');
      await LocalImageService.loadModel(modelId, (msg) => {
        onProgress?.('image', 'loading', msg);
      });

      this.notifyStatusChange('image', 'success');
      onProgress?.('image', 'success', 'Modèle d\'image prêt !');
      console.log('✅ Image initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation Image:', error);
      this.notifyStatusChange('image', 'error', error);
      onProgress?.('image', 'error', error.message);
    }
  }

  /**
   * Réinitialise le statut d'initialisation (pour recharger)
   */
  reset() {
    this.isInitialized = false;
    this.initializationStatus = {
      llama: 'idle',
      image: 'idle',
    };
  }

  /**
   * Retourne le statut actuel d'initialisation
   */
  getStatus() {
    return this.initializationStatus;
  }

  /**
   * Vérifie si les modèles sont prêts
   */
  async areModelsReady() {
    const llamaReady = this.initializationStatus.llama === 'success' && LlamaService.isLoaded;
    const imageReady = this.initializationStatus.image === 'success' && LocalImageService.isLoaded;
    return {
      llama: llamaReady,
      image: imageReady,
      all: llamaReady && imageReady,
    };
  }
}

export default new AutoInitService();
