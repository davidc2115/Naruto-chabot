/**
 * GalleryService - Gestion de la galerie d'images
 * v5.4.65 - RÉÉCRITURE COMPLÈTE avec AppUserManager
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { getUserId } from './AppUserManager';

class GalleryService {
  constructor() {
    this.imageDirectory = `${FileSystem.documentDirectory}gallery/`;
    this.initDirectory();
    console.log('🖼️ [GalleryService] Initialisé');
  }

  async initDirectory() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.imageDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.imageDirectory, { intermediates: true });
        console.log('📁 [GalleryService] Répertoire créé');
      }
    } catch (error) {
      console.error('❌ [GalleryService] Erreur init:', error);
    }
  }

  /**
   * Récupère l'ID utilisateur via AppUserManager
   */
  async getCurrentUserId() {
    const userId = await getUserId();
    console.log(`🔑 [GalleryService] userId: ${userId}`);
    return userId;
  }

  /**
   * SAUVEGARDE IMAGE - Ultra-robuste avec logs détaillés
   */
  async saveImageToGallery(characterId, imageUrl) {
    const startTime = Date.now();
    console.log(`\n========== SAVE IMAGE START ==========`);
    console.log(`🖼️ characterId: ${characterId}`);
    console.log(`🖼️ imageUrl: ${imageUrl?.substring(0, 80)}...`);
    
    try {
      // Validation
      if (!characterId) {
        console.error('❌ [GALLERY SAVE] characterId MANQUANT!');
        return null;
      }
      
      if (!imageUrl || typeof imageUrl !== 'string') {
        console.error('❌ [GALLERY SAVE] imageUrl INVALIDE!');
        return null;
      }
      
      const userId = await this.getCurrentUserId();
      if (!userId) {
        console.error('❌ [GALLERY SAVE] userId MANQUANT!');
        return null;
      }
      
      // Charger galerie existante
      let gallery = [];
      const primaryKey = `gal_${userId}_${characterId}`;
      
      try {
        const existing = await AsyncStorage.getItem(primaryKey);
        if (existing) {
          gallery = JSON.parse(existing);
          if (!Array.isArray(gallery)) gallery = [];
        }
      } catch (e) {
        console.log('⚠️ [GALLERY SAVE] Galerie vide ou corrompue, création nouvelle');
        gallery = [];
      }
      
      console.log(`📦 [GALLERY SAVE] Galerie existante: ${gallery.length} images`);
      
      // Extraire les infos de l'URL
      const seed = this.extractSeedFromUrl(imageUrl);
      const prompt = this.extractPromptFromUrl(imageUrl);
      
      // Vérifier si image existe déjà
      const exists = gallery.some(item => {
        if (typeof item === 'string') {
          return item === imageUrl || this.extractSeedFromUrl(item) === seed;
        }
        return item.url === imageUrl || item.seed === seed;
      });
      
      if (exists) {
        console.log(`ℹ️ [GALLERY SAVE] Image déjà présente, ignorée`);
        console.log(`========== SAVE IMAGE END (already exists) ==========\n`);
        return imageUrl;
      }
      
      // Créer l'entrée
      const imageData = {
        url: imageUrl,
        localPath: null,
        seed: seed,
        prompt: prompt ? prompt.substring(0, 500) : null,
        savedAt: Date.now(),
        characterId: String(characterId),
        isLocal: false,
      };
      
      // Ajouter au début
      gallery.unshift(imageData);
      
      // Limiter à 100 images
      if (gallery.length > 100) {
        const removed = gallery.pop();
        if (removed?.localPath) {
          try {
            await FileSystem.deleteAsync(removed.localPath, { idempotent: true });
          } catch (e) {}
        }
      }
      
      const jsonData = JSON.stringify(gallery);
      console.log(`📦 [GALLERY SAVE] Taille données: ${jsonData.length} bytes`);
      
      // QUADRUPLE SAUVEGARDE
      const keys = [
        primaryKey,
        `gal_backup_${characterId}`,
        `gal_global_${characterId}`,
        `gallery_${characterId}`,
      ];
      
      let saveCount = 0;
      for (const key of keys) {
        try {
          await AsyncStorage.setItem(key, jsonData);
          console.log(`✅ [GALLERY SAVE] Sauvegardé: ${key}`);
          saveCount++;
        } catch (keyError) {
          console.error(`❌ [GALLERY SAVE] Échec ${key}:`, keyError.message);
        }
      }
      
      // Vérification immédiate
      const verification = await AsyncStorage.getItem(primaryKey);
      if (verification) {
        const parsed = JSON.parse(verification);
        console.log(`✅ [GALLERY SAVE] Vérification OK: ${parsed.length} images`);
      } else {
        console.error(`❌ [GALLERY SAVE] Vérification ÉCHOUÉE!`);
        // Réessayer la clé principale
        await AsyncStorage.setItem(primaryKey, jsonData);
      }
      
      // Télécharger en arrière-plan (ne pas attendre)
      this.downloadInBackground(characterId, imageUrl, seed, primaryKey, gallery).catch(() => {});
      
      const duration = Date.now() - startTime;
      console.log(`✅ [GALLERY SAVE] Terminé en ${duration}ms (${saveCount}/4 sauvegardes)`);
      console.log(`========== SAVE IMAGE END ==========\n`);
      
      return imageUrl;
      
    } catch (error) {
      console.error('❌ [GALLERY SAVE] EXCEPTION:', error);
      console.error('❌ [GALLERY SAVE] Stack:', error.stack);
      
      // Sauvegarde d'urgence
      try {
        const emergencyKey = `gal_emergency_${characterId}`;
        await AsyncStorage.setItem(emergencyKey, JSON.stringify([{
          url: imageUrl,
          savedAt: Date.now(),
          emergency: true,
        }]));
        console.log(`⚠️ [GALLERY SAVE] Sauvegarde d'urgence: ${emergencyKey}`);
      } catch (e2) {
        console.error('❌ [GALLERY SAVE] Même urgence a échoué:', e2.message);
      }
      
      console.log(`========== SAVE IMAGE END (ERROR) ==========\n`);
      return null;
    }
  }

  /**
   * CHARGEMENT GALERIE - Recherche multi-clés
   */
  async getGallery(characterId) {
    console.log(`\n========== LOAD GALLERY START ==========`);
    console.log(`🖼️ characterId: ${characterId}`);
    
    try {
      if (!characterId) {
        console.error('❌ [GALLERY LOAD] characterId MANQUANT!');
        return [];
      }
      
      const userId = await this.getCurrentUserId();
      console.log(`🔑 [GALLERY LOAD] userId: ${userId}`);
      
      // Liste des clés à essayer
      const keysToTry = [
        `gal_${userId}_${characterId}`,
        `gal_backup_${characterId}`,
        `gal_global_${characterId}`,
        `gallery_${characterId}`,
        `gal_emergency_${characterId}`,
        `gal_fallback_${characterId}`,
      ];
      
      let data = null;
      let foundKey = null;
      
      for (const key of keysToTry) {
        try {
          const d = await AsyncStorage.getItem(key);
          if (d) {
            const parsed = JSON.parse(d);
            if (Array.isArray(parsed) && parsed.length > 0) {
              data = parsed;
              foundKey = key;
              console.log(`✅ [GALLERY LOAD] Trouvé: ${key} (${parsed.length} images)`);
              break;
            }
          }
        } catch (keyError) {
          console.log(`⚠️ [GALLERY LOAD] Erreur ${key}:`, keyError.message);
        }
      }
      
      if (!data) {
        console.log(`ℹ️ [GALLERY LOAD] Galerie vide`);
        console.log(`========== LOAD GALLERY END ==========\n`);
        return [];
      }
      
      // Migrer vers clé principale si trouvé ailleurs
      if (foundKey && foundKey !== keysToTry[0]) {
        console.log(`🔄 [GALLERY LOAD] Migration vers clé principale...`);
        try {
          await AsyncStorage.setItem(keysToTry[0], JSON.stringify(data));
        } catch (e) {}
      }
      
      // Construire la liste des URLs/chemins
      const result = [];
      for (const item of data) {
        if (typeof item === 'string') {
          result.push(item);
        } else if (item.localPath) {
          const exists = await this.checkLocalFile(item.localPath);
          if (exists) {
            result.push(item.localPath);
          } else if (item.url) {
            result.push(item.url);
          }
        } else if (item.url) {
          result.push(item.url);
        }
      }
      
      console.log(`✅ [GALLERY LOAD] ${result.length} images valides`);
      console.log(`========== LOAD GALLERY END ==========\n`);
      
      return result;
      
    } catch (error) {
      console.error('❌ [GALLERY LOAD] EXCEPTION:', error);
      console.log(`========== LOAD GALLERY END (ERROR) ==========\n`);
      return [];
    }
  }

  // ========== MÉTHODES UTILITAIRES ==========

  async downloadInBackground(characterId, imageUrl, seed, key, gallery) {
    try {
      const downloadResult = await this.downloadAndSaveImage(imageUrl, characterId, seed);
      if (downloadResult.success) {
        const itemIndex = gallery.findIndex(item => item.seed === seed);
        if (itemIndex !== -1) {
          gallery[itemIndex].localPath = downloadResult.localPath;
          gallery[itemIndex].isLocal = true;
          await AsyncStorage.setItem(key, JSON.stringify(gallery));
          console.log(`✅ [GALLERY] Image téléchargée: ${seed}`);
        }
      }
    } catch (error) {
      console.log(`⚠️ [GALLERY] Téléchargement arrière-plan échoué:`, error.message);
    }
  }

  async downloadAndSaveImage(imageUrl, characterId, seed) {
    try {
      await this.initDirectory();
      
      const fileName = this.generateFileName(characterId, seed);
      const localPath = `${this.imageDirectory}${fileName}`;
      
      const downloadResult = await FileSystem.downloadAsync(imageUrl, localPath);
      
      if (downloadResult.status === 200) {
        return { localPath, fileName, success: true };
      }
      return { success: false, error: `Status ${downloadResult.status}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  generateFileName(characterId, seed) {
    const timestamp = Date.now();
    const seedPart = seed || Math.random().toString(36).substring(7);
    return `${characterId}_${seedPart}_${timestamp}.jpg`;
  }

  async checkLocalFile(localPath) {
    try {
      if (!localPath) return false;
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      return fileInfo.exists;
    } catch (error) {
      return false;
    }
  }

  extractSeedFromUrl(url) {
    if (!url) return null;
    const seedMatch = url.match(/[&?]seed=(\d+)/);
    return seedMatch ? seedMatch[1] : null;
  }

  extractPromptFromUrl(url) {
    if (!url) return null;
    try {
      const match = url.match(/pollinations\.ai\/prompt\/([^?]+)/);
      if (match) return decodeURIComponent(match[1]);
    } catch (e) {}
    return null;
  }

  regeneratePollinationsUrl(originalUrl) {
    if (!originalUrl || !originalUrl.includes('pollinations.ai')) {
      return originalUrl;
    }
    
    const seed = this.extractSeedFromUrl(originalUrl);
    const prompt = this.extractPromptFromUrl(originalUrl);
    
    if (seed && prompt) {
      const encodedPrompt = encodeURIComponent(prompt);
      return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=1024&seed=${seed}&nologo=true&model=flux&enhance=true`;
    }
    
    return originalUrl;
  }

  async getGalleryFull(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const data = await AsyncStorage.getItem(`gal_${userId}_${characterId}`);
      if (data) return JSON.parse(data);
      return [];
    } catch (error) {
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
      const seedToDelete = this.extractSeedFromUrl(imageUrl);
      
      const filesToDelete = [];
      const updated = gallery.filter(item => {
        if (typeof item === 'string') {
          return item !== imageUrl && this.extractSeedFromUrl(item) !== seedToDelete;
        }
        
        const shouldDelete = item.url === imageUrl || item.seed === seedToDelete || item.localPath === imageUrl;
        if (shouldDelete && item.localPath) {
          filesToDelete.push(item.localPath);
        }
        return !shouldDelete;
      });
      
      for (const filePath of filesToDelete) {
        try {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        } catch (e) {}
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      
      return updated.map(item => {
        if (typeof item === 'string') return this.regeneratePollinationsUrl(item);
        if (item.localPath) return item.localPath;
        return item.url;
      });
    } catch (error) {
      console.error('❌ [GALLERY] Delete error:', error);
      throw error;
    }
  }

  async setConversationBackground(conversationId, imageUrl) {
    try {
      const userId = await this.getCurrentUserId();
      await AsyncStorage.setItem(`bg_${userId}_${conversationId}`, imageUrl);
    } catch (error) {
      console.error('❌ [GALLERY] Background save error:', error);
    }
  }

  async getConversationBackground(conversationId) {
    try {
      const userId = await this.getCurrentUserId();
      const data = await AsyncStorage.getItem(`bg_${userId}_${conversationId}`);
      if (data) return data;
      
      const oldData = await AsyncStorage.getItem(`bg_${conversationId}`);
      if (oldData) {
        await AsyncStorage.setItem(`bg_${userId}_${conversationId}`, oldData);
        return oldData;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getStorageStats() {
    try {
      await this.initDirectory();
      const dirInfo = await FileSystem.getInfoAsync(this.imageDirectory);
      if (!dirInfo.exists) return { totalImages: 0, totalSize: 0, totalSizeMB: '0.00' };
      
      const files = await FileSystem.readDirectoryAsync(this.imageDirectory);
      let totalSize = 0;
      
      for (const file of files) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(`${this.imageDirectory}${file}`);
          if (fileInfo.exists && fileInfo.size) totalSize += fileInfo.size;
        } catch (e) {}
      }
      
      return {
        totalImages: files.length,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        directory: this.imageDirectory,
      };
    } catch (error) {
      return { totalImages: 0, totalSize: 0, totalSizeMB: '0.00' };
    }
  }

  async clearLocalCache() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.imageDirectory);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.imageDirectory, { idempotent: true });
      }
      await this.initDirectory();
      return true;
    } catch (error) {
      return false;
    }
  }

  async prefetchGallery(characterId) {
    try {
      await this.getGallery(characterId);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new GalleryService();
