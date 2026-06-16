import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import AuthService from './AuthService';

/**
 * Service de gestion de galerie d'images
 * v5.3.12 - Stockage LOCAL sur le téléphone pour persistance permanente
 * Les images sont téléchargées et sauvegardées localement
 */
class GalleryService {
  constructor() {
    // Répertoire de base pour stocker les images
    this.imageDirectory = `${FileSystem.documentDirectory}gallery/`;
    this.initDirectory();
    // Cache pour l'ID utilisateur
    this._cachedUserId = null;
    this._lastUserIdCheck = 0;
  }

  /**
   * Initialise le répertoire de stockage des images
   */
  async initDirectory() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.imageDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.imageDirectory, { intermediates: true });
        console.log('📁 Répertoire galerie créé:', this.imageDirectory);
      }
    } catch (error) {
      console.error('❌ Erreur création répertoire galerie:', error);
    }
  }

  /**
   * Récupère l'ID de l'utilisateur courant
   * v5.3.43 - Plus robuste avec cache et fallback device ID persistant
   */
  async getCurrentUserId() {
    try {
      // Utiliser le cache si récent (moins de 5 secondes)
      const now = Date.now();
      if (this._cachedUserId && (now - this._lastUserIdCheck) < 5000) {
        return this._cachedUserId;
      }

      // 1. Essayer AuthService
      const user = AuthService.getCurrentUser();
      if (user?.id) {
        this._cachedUserId = user.id;
        this._lastUserIdCheck = now;
        return user.id;
      }

      // 2. Essayer le token stocké
      const storedUser = await AsyncStorage.getItem('current_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.id) {
            this._cachedUserId = parsed.id;
            this._lastUserIdCheck = now;
            return parsed.id;
          }
        } catch (e) {}
      }

      // 3. Utiliser ou créer un ID device PERSISTANT (partagé avec StorageService)
      let deviceId = await AsyncStorage.getItem('device_user_id');
      if (!deviceId) {
        deviceId = 'device_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        await AsyncStorage.setItem('device_user_id', deviceId);
        console.log('📱 Nouvel ID device créé (Gallery):', deviceId);
      }

      this._cachedUserId = deviceId;
      this._lastUserIdCheck = now;
      return deviceId;
    } catch (error) {
      console.error('Error getting user ID (Gallery):', error);
      return 'default';
    }
  }

  /**
   * Réinitialise le cache utilisateur
   */
  resetUserCache() {
    this._cachedUserId = null;
    this._lastUserIdCheck = 0;
  }

  /**
   * Génère un nom de fichier unique pour une image
   */
  generateFileName(characterId, seed) {
    const timestamp = Date.now();
    const seedPart = seed || Math.random().toString(36).substring(7);
    return `${characterId}_${seedPart}_${timestamp}.jpg`;
  }

  /**
   * Télécharge OU copie une image vers le dossier galerie persistant.
   * Gère 3 cas :
   *   1. URL distante (http/https) → downloadAsync
   *   2. URI locale file:// (cache Pollinations) → copyAsync vers gallery/
   *   3. Chemin déjà dans gallery/ → no-op
   */
  async downloadAndSaveImage(imageUrl, characterId, seed) {
    try {
      await this.initDirectory();

      const fileName = this.generateFileName(characterId, seed);
      const localPath = `${this.imageDirectory}${fileName}`;

      // Cas 3 : déjà dans gallery → rien à faire
      if (imageUrl && imageUrl.startsWith(this.imageDirectory)) {
        return { localPath: imageUrl, fileName: imageUrl.split('/').pop(), success: true };
      }

      // Cas 2 : fichier local (file:// ou chemin absolu cacheDirectory)
      const isLocal = imageUrl && (imageUrl.startsWith('file://') || imageUrl.startsWith('/'));
      if (isLocal) {
        try {
          const info = await FileSystem.getInfoAsync(imageUrl);
          if (!info.exists) {
            console.log(`⚠️ Fichier source introuvable: ${imageUrl}`);
            return { success: false, error: 'Fichier source introuvable' };
          }
          await FileSystem.copyAsync({ from: imageUrl, to: localPath });
          console.log(`✅ Image COPIÉE (local→galerie): ${fileName}`);
          return { localPath, fileName, success: true };
        } catch (copyErr) {
          console.log(`⚠️ Échec copie locale: ${copyErr.message}`);
          return { success: false, error: copyErr.message };
        }
      }

      // Cas 1 : URL distante
      console.log(`📥 Téléchargement image: ${imageUrl.substring(0, 50)}...`);
      const downloadResult = await FileSystem.downloadAsync(imageUrl, localPath);

      if (downloadResult.status === 200) {
        console.log(`✅ Image sauvegardée localement: ${fileName}`);
        return { localPath, fileName, success: true };
      } else {
        console.log(`⚠️ Échec téléchargement: status ${downloadResult.status}`);
        return { success: false, error: `Status ${downloadResult.status}` };
      }
    } catch (error) {
      console.error('❌ Erreur téléchargement/copie image:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Vérifie si un fichier local existe
   */
  async checkLocalFile(localPath) {
    try {
      if (!localPath) return false;
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      return fileInfo.exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extrait le seed d'une URL Pollinations pour régénérer l'URL si nécessaire
   */
  extractSeedFromUrl(url) {
    if (!url) return null;
    const seedMatch = url.match(/[&?]seed=(\d+)/);
    return seedMatch ? seedMatch[1] : null;
  }

  /**
   * Extrait le prompt d'une URL Pollinations
   */
  extractPromptFromUrl(url) {
    if (!url) return null;
    try {
      // Format: https://image.pollinations.ai/prompt/ENCODED_PROMPT?params
      const match = url.match(/pollinations\.ai\/prompt\/([^?]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    } catch (e) {}
    return null;
  }

  /**
   * Régénère une URL Pollinations avec le même seed pour persistance
   */
  regeneratePollinationsUrl(originalUrl) {
    if (!originalUrl || !originalUrl.includes('pollinations.ai')) {
      return originalUrl;
    }
    
    const seed = this.extractSeedFromUrl(originalUrl);
    const prompt = this.extractPromptFromUrl(originalUrl);
    
    if (seed && prompt) {
      // Reconstruire l'URL avec les mêmes paramètres
      const encodedPrompt = encodeURIComponent(prompt);
      return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=1024&seed=${seed}&nologo=true&model=flux&enhance=true`;
    }
    
    return originalUrl;
  }

  async saveImageToGallery(characterId, imageUrl, options = {}) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `gal_${userId}_${characterId}`;

      // v5.3.68 - Double chargement pour s'assurer de ne pas perdre de données
      let gallery = [];
      try {
        const existing = await AsyncStorage.getItem(key);
        if (existing) {
          gallery = JSON.parse(existing);
        }
      } catch (e) {
        console.log('⚠️ Erreur lecture galerie, création nouvelle');
        gallery = [];
      }

      // v7.0 - Si l'input est un fichier local du cache (Pollinations), on le copie
      // IMMÉDIATEMENT dans le dossier galerie persistant pour éviter la purge cache Android.
      const isLocal = imageUrl && (imageUrl.startsWith('file://') || imageUrl.startsWith('/')) && !imageUrl.startsWith(this.imageDirectory);

      // URL distante stable fournie en option (depuis ImageGenerationService.getLastRemoteUrl())
      const remoteUrl = options.remoteUrl || null;

      // Seed/prompt extraits depuis l'URL distante (si disponible) sinon depuis imageUrl
      const sourceForMeta = remoteUrl || imageUrl;
      const seed = this.extractSeedFromUrl(sourceForMeta);
      const prompt = this.extractPromptFromUrl(sourceForMeta);

      // Si fichier local → COPIE SYNCHRONE vers gallery/ pour persistance immédiate
      let finalLocalPath = null;
      if (isLocal) {
        const dl = await this.downloadAndSaveImage(imageUrl, characterId, seed || Math.random().toString(36).slice(2, 9));
        if (dl.success) finalLocalPath = dl.localPath;
      } else if (imageUrl && imageUrl.startsWith(this.imageDirectory)) {
        finalLocalPath = imageUrl;
      }

      // Vérifier si l'image existe déjà
      const exists = gallery.some(item => {
        if (typeof item === 'string') {
          return (seed && this.extractSeedFromUrl(item) === seed) || item === imageUrl || item === remoteUrl;
        }
        return (seed && item.seed === seed) || item.url === imageUrl || item.url === remoteUrl || item.localPath === finalLocalPath;
      });

      if (!exists) {
        const imageData = {
          // Préférer l'URL distante pour fallback réseau
          url: remoteUrl || (isLocal ? null : imageUrl),
          localPath: finalLocalPath,
          seed: seed,
          prompt: prompt ? prompt.substring(0, 500) : null,
          savedAt: Date.now(),
          characterId,
          isLocal: !!finalLocalPath,
        };

        gallery.unshift(imageData);

        // Limiter à 100 images par personnage
        if (gallery.length > 100) {
          const removed = gallery.pop();
          if (removed?.localPath) {
            try { await FileSystem.deleteAsync(removed.localPath, { idempotent: true }); } catch (e) { /* ignore */ }
          }
        }

        const jsonData = JSON.stringify(gallery);
        await AsyncStorage.setItem(key, jsonData);
        await AsyncStorage.setItem(`gal_backup_${characterId}`, jsonData);
        console.log(`🖼️ Image ajoutée à la galerie: ${key} (local=${!!finalLocalPath}, seed=${seed})`);

        // Si on n'a pas pu copier le fichier local mais qu'on a une URL distante stable,
        // on tente un téléchargement en arrière-plan pour persistance hors-ligne.
        if (!finalLocalPath && remoteUrl) {
          this.downloadInBackground(characterId, remoteUrl, seed, key, gallery);
        }
      } else {
        console.log(`ℹ️ Image déjà dans galerie: seed=${seed}`);
      }

      // Retourner ce qui sera affiché : priorité au fichier local persistant
      return finalLocalPath || remoteUrl || imageUrl;
    } catch (error) {
      console.error('Error saving image to gallery:', error);
      try {
        const fallbackKey = `gal_fallback_${characterId}`;
        const simpleData = JSON.stringify([{ url: imageUrl, savedAt: Date.now() }]);
        await AsyncStorage.setItem(fallbackKey, simpleData);
        console.log('⚠️ Sauvegarde de secours effectuée');
      } catch (e2) {}
      throw error;
    }
  }
  
  /**
   * Télécharge une image en arrière-plan et met à jour la galerie
   * v5.3.15: Ne bloque pas la sauvegarde initiale
   */
  async downloadInBackground(characterId, imageUrl, seed, key, gallery) {
    try {
      const downloadResult = await this.downloadAndSaveImage(imageUrl, characterId, seed);
      
      if (downloadResult.success) {
        // Mettre à jour l'entrée dans la galerie avec le chemin local
        const itemIndex = gallery.findIndex(item => item.seed === seed);
        if (itemIndex !== -1) {
          gallery[itemIndex].localPath = downloadResult.localPath;
          gallery[itemIndex].isLocal = true;
          await AsyncStorage.setItem(key, JSON.stringify(gallery));
          console.log(`✅ Image téléchargée en arrière-plan: ${seed}`);
        }
      } else {
        console.log(`⚠️ Téléchargement arrière-plan échoué pour seed=${seed}`);
      }
    } catch (error) {
      console.log(`⚠️ Erreur téléchargement arrière-plan: ${error.message}`);
    }
  }

  async getGallery(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `gal_${userId}_${characterId}`;
      let data = await AsyncStorage.getItem(key);
      
      // v5.3.68 - Si pas de données, essayer les clés de backup
      if (!data) {
        const backupKeys = [
          `gal_backup_${characterId}`,
          `gal_fallback_${characterId}`,
          `gallery_${characterId}`,
        ];
        
        for (const backupKey of backupKeys) {
          const backupData = await AsyncStorage.getItem(backupKey);
          if (backupData) {
            console.log(`🔄 Galerie récupérée depuis backup: ${backupKey}`);
            data = backupData;
            // Migrer vers la clé principale
            await AsyncStorage.setItem(key, data);
            break;
          }
        }
      }
      
      if (data) {
        const gallery = JSON.parse(data);
        const result = [];
        
        // v5.3.68: Utiliser les fichiers locaux s'ils existent, sinon l'URL originale
        for (const item of gallery) {
          if (typeof item === 'string') {
            // Ancien format string - utiliser l'URL directement
            result.push(item);
          } else if (item.localPath) {
            // Vérifier si le fichier local existe
            const exists = await this.checkLocalFile(item.localPath);
            if (exists) {
              // Fichier local existe - l'utiliser
              result.push(item.localPath);
            } else if (item.url) {
              // Fichier local n'existe plus - utiliser l'URL originale
              result.push(item.url);
            }
          } else if (item.url) {
            // Pas de fichier local - utiliser l'URL
            result.push(item.url);
          }
        }
        
        console.log(`📸 Galerie chargée: ${result.length} images pour ${characterId}`);
        return result;
      }
      
      console.log(`ℹ️ Galerie vide pour ${characterId}`);
      return [];
    } catch (error) {
      console.error('Error getting gallery:', error);
      return [];
    }
  }
  
  /**
   * Retourne la galerie avec les données complètes (pour debug/export)
   */
  async getGalleryFull(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `gal_${userId}_${characterId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Error getting full gallery:', error);
      return [];
    }
  }

  async deleteImage(characterId, imageUrl) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `gal_${userId}_${characterId}`;
      const data = await AsyncStorage.getItem(key);
      if (!data) return [];
      
      const gallery = JSON.parse(data);
      
      // Extraire le seed de l'URL/chemin à supprimer pour comparaison
      const seedToDelete = this.extractSeedFromUrl(imageUrl);
      // Si c'est un chemin local, extraire le seed du nom de fichier
      const localSeedMatch = imageUrl?.match(/_(\d+)_\d+\.jpg$/);
      const localSeed = localSeedMatch ? localSeedMatch[1] : null;
      
      console.log(`🗑️ Suppression image - Path: ${imageUrl?.substring(0, 60)}..., Seed: ${seedToDelete || localSeed}`);
      
      const filesToDelete = [];
      
      // Filtrer et collecter les fichiers à supprimer
      const updated = gallery.filter(item => {
        // Ancien format (string)
        if (typeof item === 'string') {
          const itemSeed = this.extractSeedFromUrl(item);
          if (item === imageUrl) return false;
          if (seedToDelete && itemSeed === seedToDelete) return false;
          if (localSeed && itemSeed === localSeed) return false;
          return true;
        }
        
        // Nouveau format (objet avec url, seed, prompt, localPath)
        let shouldDelete = false;
        
        // Comparaison par chemin local
        if (item.localPath === imageUrl) shouldDelete = true;
        // Comparaison par URL
        if (item.url === imageUrl) shouldDelete = true;
        // Comparaison par seed
        if (seedToDelete && item.seed === seedToDelete) shouldDelete = true;
        if (localSeed && item.seed === localSeed) shouldDelete = true;
        
        // Comparer avec URL régénérée
        if (!shouldDelete && item.seed && item.prompt) {
          const regeneratedUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(item.prompt)}?width=768&height=1024&seed=${item.seed}&nologo=true&model=flux&enhance=true`;
          if (regeneratedUrl === imageUrl) shouldDelete = true;
        }
        
        if (shouldDelete && item.localPath) {
          filesToDelete.push(item.localPath);
        }
        
        return !shouldDelete;
      });
      
      // Supprimer les fichiers locaux
      for (const filePath of filesToDelete) {
        try {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          console.log(`🗑️ Fichier local supprimé: ${filePath}`);
        } catch (e) {
          console.log(`⚠️ Impossible de supprimer le fichier: ${filePath}`);
        }
      }
      
      console.log(`🗑️ Galerie: ${gallery.length} -> ${updated.length} images`);
      
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      
      // Retourner les chemins locaux ou URLs
      return updated.map(item => {
        if (typeof item === 'string') {
          return this.regeneratePollinationsUrl(item);
        }
        // Priorité au chemin local
        if (item.localPath) {
          return item.localPath;
        }
        if (item.seed && item.prompt) {
          const encodedPrompt = encodeURIComponent(item.prompt);
          return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=1024&seed=${item.seed}&nologo=true&model=flux&enhance=true`;
        }
        return item.url;
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  async setConversationBackground(conversationId, imageUrl) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `bg_${userId}_${conversationId}`;
      await AsyncStorage.setItem(key, imageUrl);
    } catch (error) {
      console.error('Error setting background:', error);
    }
  }

  async getConversationBackground(conversationId) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `bg_${userId}_${conversationId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (data) return data;
      
      // Migration
      const oldKey = `bg_${conversationId}`;
      const oldData = await AsyncStorage.getItem(oldKey);
      if (oldData) {
        await AsyncStorage.setItem(key, oldData);
        return oldData;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting background:', error);
      return null;
    }
  }

  /**
   * Obtient les statistiques de stockage des images
   */
  async getStorageStats() {
    try {
      await this.initDirectory();
      
      const dirInfo = await FileSystem.getInfoAsync(this.imageDirectory);
      if (!dirInfo.exists) {
        return { totalImages: 0, totalSize: 0, totalSizeMB: '0.00' };
      }
      
      const files = await FileSystem.readDirectoryAsync(this.imageDirectory);
      let totalSize = 0;
      
      for (const file of files) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(`${this.imageDirectory}${file}`);
          if (fileInfo.exists && fileInfo.size) {
            totalSize += fileInfo.size;
          }
        } catch (e) {}
      }
      
      return {
        totalImages: files.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        directory: this.imageDirectory,
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { totalImages: 0, totalSize: 0, totalSizeMB: '0.00' };
    }
  }

  /**
   * Supprime toutes les images locales (libère l'espace)
   * ATTENTION: Les images seront re-téléchargées au prochain accès
   */
  async clearLocalCache() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.imageDirectory);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.imageDirectory, { idempotent: true });
        console.log('🗑️ Cache images local supprimé');
      }
      // Recréer le répertoire vide
      await this.initDirectory();
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Pré-télécharge les images d'une galerie en arrière-plan
   * Utile pour s'assurer que toutes les images sont disponibles hors-ligne
   */
  async prefetchGallery(characterId) {
    try {
      console.log(`📥 Pré-téléchargement galerie: ${characterId}`);
      // getGallery effectue automatiquement le téléchargement des images manquantes
      await this.getGallery(characterId);
      console.log(`✅ Pré-téléchargement terminé: ${characterId}`);
      return true;
    } catch (error) {
      console.error('Error prefetching gallery:', error);
      return false;
    }
  }
}

export default new GalleryService();
