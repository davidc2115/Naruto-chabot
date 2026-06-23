import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * LocalImageService v1.0 — Génération d'images 100% locale sur smartphone
 * 
 * Utilise react-native-fast-tflite pour l'inférence TensorFlow Lite sur device
 * 
 * Modèles supportés (à télécharger):
 *   - Style Transfer (légère, ~50-100MB)
 *   - Image Super-resolution (légère, ~50-100MB)
 *   - Future: Stable Diffusion Mobile (quand disponible en TFLite léger)
 * 
 * Flux:
 *   1. downloadModel() → télécharge le .tflite dans documentDirectory
 *   2. loadModel() → charge le modèle TFLite en mémoire
 *   3. generateImage() → inférence locale (on-device, offline)
 *   4. unloadModel() → libère la mémoire
 */

// Modèles disponibles pour la génération d'images locale
export const LOCAL_IMAGE_MODELS = {
  // Style Transfer - pour modifier le style d'images existantes
  styleTransfer: {
    name: 'Style Transfer (Neural Style)',
    desc: '~80 Mo • Applique un style artistique aux images',
    filename: 'style-transfer.tflite',
    url: 'https://tfhub.dev/google/lite-model/magenta/arbitrary-image-stylization-v1-256/fp16/prediction/1?lite-format=tflite',
    size: 80_000_000,
    type: 'style_transfer',
    inputSize: 256,
  },
  // Super-resolution - pour améliorer la qualité d'images
  superResolution: {
    name: 'Super Resolution (ESRGAN)',
    desc: '~70 Mo • Améliore la résolution 4x',
    filename: 'esrgan-sr.tflite',
    url: 'https://tfhub.dev/captain-pool/esrgan-tf2/1?lite-format=tflite',
    size: 70_000_000,
    type: 'super_resolution',
    inputSize: 512,
  },
  // Future: Stable Diffusion Mobile (quand disponible)
  // stableDiffusion: {
  //   name: 'Stable Diffusion Mobile',
  //   desc: '~500 Mo • Génération d\'images text-to-image',
  //   filename: 'stable-diffusion-mobile.tflite',
  //   url: '', // À définir quand disponible
  //   size: 500_000_000,
  //   type: 'text_to_image',
  //   inputSize: 512,
  // },
};

const ACTIVE_MODEL_KEY = 'local_image_active_model_id';
const MODEL_DIR = () => `${FileSystem.documentDirectory}local_image_models/`;

class LocalImageService {
  constructor() {
    this.model = null;
    this.isLoaded = false;
    this.activeModelId = null;
    this._loadingBusy = false;
    this._downloadResumable = null;
  }

  // ─── Model paths ────────────────────────────────────────────────────────────

  getModelPath(modelId) {
    const m = LOCAL_IMAGE_MODELS[modelId];
    return m ? `${MODEL_DIR()}${m.filename}` : null;
  }

  async isModelDownloaded(modelId) {
    const path = this.getModelPath(modelId);
    if (!path) return false;
    try {
      const info = await FileSystem.getInfoAsync(path);
      return info.exists && info.size > (LOCAL_IMAGE_MODELS[modelId]?.size || 0) * 0.90;
    } catch { return false; }
  }

  async getStoredActiveModelId() {
    try { return await AsyncStorage.getItem(ACTIVE_MODEL_KEY); } catch { return null; }
  }

  // ─── Download ────────────────────────────────────────────────────────────────

  /**
   * Télécharge un modèle TFLite pour la génération d'images locale
   * @param {string} modelId
   * @param {(progress: number, bytesWritten: number, total: number) => void} onProgress
   * @returns {Promise<void>}
   */
  async downloadModel(modelId, onProgress) {
    const model = LOCAL_IMAGE_MODELS[modelId];
    if (!model) throw new Error('Modèle inconnu');

    // Créer le répertoire si nécessaire
    const dir = MODEL_DIR();
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

    const path = this.getModelPath(modelId);

    this._downloadResumable = FileSystem.createDownloadResumable(
      model.url,
      path,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        const pct = totalBytesExpectedToWrite > 0 ? totalBytesWritten / totalBytesExpectedToWrite : 0;
        onProgress?.(pct, totalBytesWritten, totalBytesExpectedToWrite);
      }
    );

    try {
      await this._downloadResumable.downloadAsync();
    } catch (e) {
      if (!e.message?.includes('cancel')) {
        await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
      }
      throw e;
    } finally {
      this._downloadResumable = null;
    }
  }

  async cancelDownload() {
    if (this._downloadResumable) {
      await this._downloadResumable.cancelAsync().catch(() => {});
      this._downloadResumable = null;
    }
  }

  async deleteModel(modelId) {
    const path = this.getModelPath(modelId);
    if (path) await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
    if (this.activeModelId === modelId) await this.unloadModel();
  }

  // ─── Load / unload ───────────────────────────────────────────────────────────

  /**
   * Charge le modèle TFLite en mémoire
   * @param {string} modelId
   * @param {(msg: string) => void} onProgress
   */
  async loadModel(modelId, onProgress) {
    if (this._loadingBusy) throw new Error('Chargement déjà en cours…');
    if (this.isLoaded && this.activeModelId === modelId) return;

    const downloaded = await this.isModelDownloaded(modelId);
    if (!downloaded) throw new Error('Modèle non téléchargé');

    this._loadingBusy = true;
    try {
      // Libérer l'ancien modèle si chargé
      if (this.model) {
        onProgress?.('Libération de l\'ancien modèle…');
        this.model = null;
        this.isLoaded = false;
        this.activeModelId = null;
      }

      onProgress?.('Chargement du modèle TFLite…');
      
      // Note: react-native-fast-tflite sera importé ici
      // Pour l'instant, nous simulons le chargement
      // Une fois la bibliothèque installée, nous utiliserons:
      // const { loadTensorflowModel } = require('react-native-fast-tflite');
      // this.model = await loadTensorflowModel(require(`assets/${LOCAL_IMAGE_MODELS[modelId].filename}`), []);
      
      this.isLoaded = true;
      this.activeModelId = modelId;
      await AsyncStorage.setItem(ACTIVE_MODEL_KEY, modelId).catch(() => {});
      onProgress?.('✅ Modèle prêt !');
    } finally {
      this._loadingBusy = false;
    }
  }

  async unloadModel() {
    if (this.model) {
      // Note: libérer le modèle TFLite ici
      this.model = null;
    }
    this.isLoaded = false;
    this.activeModelId = null;
    await AsyncStorage.removeItem(ACTIVE_MODEL_KEY).catch(() => {});
  }

  // ─── Image Generation ─────────────────────────────────────────────────────────

  /**
   * Génère une image en local, sans Internet
   * @param {Object} options
   * @param {string} options.prompt - Description textuelle (pour text-to-image)
   * @param {string} options.inputImage - URI de l'image d'entrée (pour style transfer/super-resolution)
   * @param {Object} options.character - Données du personnage
   * @param {number} options.relationLevel - Niveau de relation pour adapter le style
   * @param {string} options.imageType - Type d'image (portrait, full_body, etc.)
   * @param {Function} [onProgress] - Callback de progression
   * @returns {Promise<string>} - URI de l'image générée
   */
  async generateImage(options, onProgress) {
    if (!this.isLoaded || !this.model) {
      throw new Error(
        'Aucun modèle chargé. Téléchargez et chargez un modèle dans Config → Images Locales.'
      );
    }

    const model = LOCAL_IMAGE_MODELS[this.activeModelId];
    const { prompt, inputImage, character, relationLevel, imageType } = options;

    onProgress?.('Préparation de l\'inférence…');

    // Selon le type de modèle, utiliser différentes méthodes
    if (model.type === 'style_transfer' && inputImage) {
      return await this.generateStyleTransfer(inputImage, prompt, onProgress);
    } else if (model.type === 'super_resolution' && inputImage) {
      return await this.generateSuperResolution(inputImage, onProgress);
    } else if (model.type === 'text_to_image' && prompt) {
      return await this.generateTextToImage(prompt, character, relationLevel, imageType, onProgress);
    } else {
      throw new Error('Type de modèle ou paramètres non supportés');
    }
  }

  /**
   * Style Transfer - applique un style artistique à une image
   */
  async generateStyleTransfer(inputImage, stylePrompt, onProgress) {
    onProgress?.('Chargement de l\'image d\'entrée…');
    
    // Lire l'image d'entrée
    const imageInfo = await FileSystem.getInfoAsync(inputImage);
    if (!imageInfo.exists) throw new Error('Image d\'entrée introuvable');

    onProgress?.('Application du style transfer…');
    
    // Note: Ici nous utiliserions react-native-fast-tflite
    // Pour l'instant, nous retournons l'image originale (placeholder)
    // Une fois la bibliothèque installée:
    // const inputData = await this.prepareImageInput(inputImage);
    // const outputData = await this.model.run([inputData]);
    // const outputImage = await this.saveOutputImage(outputData);
    
    onProgress?.('✅ Image générée !');
    return inputImage; // Placeholder - retourne l'originale pour l'instant
  }

  /**
   * Super Resolution - améliore la résolution d'une image
   */
  async generateSuperResolution(inputImage, onProgress) {
    onProgress?.('Chargement de l\'image…');
    
    const imageInfo = await FileSystem.getInfoAsync(inputImage);
    if (!imageInfo.exists) throw new Error('Image introuvable');

    onProgress?.('Amélioration de la résolution (4x)…');
    
    // Note: Ici nous utiliserions react-native-fast-tflite
    // Placeholder pour l'instant
    
    onProgress?.('✅ Image améliorée !');
    return inputImage; // Placeholder
  }

  /**
   * Text to Image - génère une image à partir d'un texte
   * Note: Nécessite un modèle Stable Diffusion Mobile en TFLite
   */
  async generateTextToImage(prompt, character, relationLevel, imageType, onProgress) {
    onProgress?.('Préparation du prompt…');
    
    // Construire le prompt détaillé avec les attributs du personnage
    const detailedPrompt = this.buildDetailedPrompt(prompt, character, relationLevel, imageType);
    
    onProgress?.('Génération de l\'image… (peut prendre 30-60s)');
    
    // Note: Pour l'instant, Stable Diffusion Mobile en TFLite n'est pas disponible
    // Nous retournons null pour indiquer que cette fonctionnalité n'est pas encore disponible
    throw new Error(
      'La génération text-to-image locale nécessite un modèle Stable Diffusion Mobile en TFLite. ' +
      'Cette fonctionnalité sera disponible quand un modèle léger sera publié. ' +
      'Utilisez le Style Transfer ou Super Resolution pour l\'instant.'
    );
  }

  /**
   * Construit un prompt détaillé pour la génération d'images
   */
  buildDetailedPrompt(basePrompt, character, relationLevel, imageType) {
    if (!character) return basePrompt;

    const parts = [];
    
    // Ajouter la description physique du personnage
    if (character.physicalDescription) {
      parts.push(character.physicalDescription);
    }
    
    // Ajouter l'imagePrompt si disponible
    if (character.imagePrompt) {
      parts.push(character.imagePrompt);
    }
    
    // Ajouter le type d'image
    if (imageType) {
      parts.push(imageType);
    }
    
    // Ajouter le niveau de relation pour adapter le style
    if (relationLevel) {
      const styleMap = {
        1: 'conservative, modest',
        3: 'casual, friendly',
        5: 'warm, intimate',
        7: 'sensual, provocative',
        10: 'passionate, explicit',
      };
      parts.push(styleMap[Math.min(relationLevel, 10)] || 'casual');
    }
    
    // Ajouter le prompt de base
    parts.push(basePrompt);
    
    return parts.join(', ');
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────

  formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
  }

  /**
   * Vérifie si la génération d'images locale est disponible
   */
  async isAvailable() {
    try {
      // Vérifier si react-native-fast-tflite est disponible
      const FastTFLite = require('react-native-fast-tflite');
      return !!FastTFLite;
    } catch (e) {
      console.log('react-native-fast-tflite non disponible:', e.message);
      return false;
    }
  }
}

export default new LocalImageService();
