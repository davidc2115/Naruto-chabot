import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { getAppUserId } from './StorageService';

/**
 * Service de gestion de galerie d'images
 * v5.4.64 - CORRECTION CRITIQUE: Utilise le même ID que StorageService
 * 
 * PROBLÈME RÉSOLU: GalleryService créait un device_user_id différent
 * de StorageService, causant la perte des images
 */
class GalleryService {
  constructor() {
    this.imageDirectory = `${FileSystem.documentDirectory}gallery/`;
    this.initDirectory();
  }

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
   * v5.4.64 - Utilise le MÊME ID que StorageService
   */
  async getCurrentUserId() {
    return await getAppUserId();
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
   * Télécharge une image et la sauvegarde localement
   */
  async downloadAndSaveImage(imageUrl, characterId, seed) {
    try {
      await this.initDirectory();
      
      const fileName = this.generateFileName(characterId, seed);
      const localPath = `${this.imageDirectory}${fileName}`;
      
      console.log(`📥 Téléchargement image: ${imageUrl.substring(0, 50)}...`);
      
      const downloadResult = await FileSystem.downloadAsync(imageUrl, localPath);
      
      if (downloadResult.status === 200) {
        console.log(`✅ Image sauvegardée localement: ${fileName}`);
        return {
          localPath: localPath,
          fileName: fileName,
          success: true,
        };
      } else {
        console.log(`⚠️ Échec téléchargement: status ${downloadResult.status}`);
        return { success: false, error: `Status ${downloadResult.status}` };
      }
    } catch (error) {
      console.error('❌ Erreur téléchargement image:', error);
      return { success: false, error: error.message };
    }
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
      if (match) {
        return decodeURIComponent(match[1]);
      }
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

  /**
   * Sauvegarde une image dans la galerie
   * v5.4.64 - Triple sauvegarde avec vérification
   */
  async saveImageToGallery(characterId, imageUrl) {
    try {
      if (!characterId || !imageUrl) {
        console.error('❌ saveImageToGallery: paramètres manquants');
        return null;
      }
      
      const userId = await this.getCurrentUserId();
      const key = `gal_${userId}_${characterId}`;
      
      console.log(`🖼️ SAVE GALLERY: userId=${userId}, charId=${characterId}`);
      
      // Charger galerie existante
      let gallery = [];
      try {
        const existing = await AsyncStorage.getItem(key);
        if (existing) {
          gallery = JSON.parse(existing);
        }
      } catch (e) {
        gallery = [];
      }
      
      // Extraire les infos
      const seed = this.extractSeedFromUrl(imageUrl);
      const prompt = this.extractPromptFromUrl(imageUrl);
      
      // Vérifier si existe déjà
      const exists = gallery.some(item => {
        if (typeof item === 'string') {
          return this.extractSeedFromUrl(item) === seed || item === imageUrl;
        }
        return item.seed === seed || item.url === imageUrl;
      });
      
      if (exists) {
        console.log(`ℹ️ Image déjà dans galerie: seed=${seed}`);
        return imageUrl;
      }
      
      // Ajouter nouvelle image
      const imageData = {
        url: imageUrl,
        localPath: null,
        seed: seed,
        prompt: prompt ? prompt.substring(0, 500) : null,
        savedAt: Date.now(),
        characterId: characterId,
        isLocal: false,
      };
      
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
      
      // TRIPLE SAUVEGARDE
      // 1. Clé principale
      await AsyncStorage.setItem(key, jsonData);
      
      // 2. Backup global
      await AsyncStorage.setItem(`gal_backup_${characterId}`, jsonData);
      
      // 3. Backup simple
      await AsyncStorage.setItem(`gal_simple_${characterId}`, jsonData);
      
      // Vérification
      const verify = await AsyncStorage.getItem(key);
      if (verify) {
        console.log(`✅ GALLERY SAVE OK: ${key}, total=${gallery.length}`);
      } else {
        console.error(`❌ GALLERY SAVE FAILED: ${key}`);
        await AsyncStorage.setItem(key, jsonData);
      }
      
      // Télécharger en arrière-plan
      this.downloadInBackground(characterId, imageUrl, seed, key, gallery);
      
      return imageUrl;
      
    } catch (error) {
      console.error('Error saving image to gallery:', error);
      // Sauvegarde de secours
      try {
        const fallbackKey = `gal_fallback_${characterId}`;
        await AsyncStorage.setItem(fallbackKey, JSON.stringify([{ url: imageUrl, savedAt: Date.now() }]));
      } catch (e2) {}
      return null;
    }
  }
  
  async downloadInBackground(characterId, imageUrl, seed, key, gallery) {
    try {
      const downloadResult = await this.downloadAndSaveImage(imageUrl, characterId, seed);
      
      if (downloadResult.success) {
        const itemIndex = gallery.findIndex(item => item.seed === seed);
        if (itemIndex !== -1) {
          gallery[itemIndex].localPath = downloadResult.localPath;
          gallery[itemIndex].isLocal = true;
          await AsyncStorage.setItem(key, JSON.stringify(gallery));
          console.log(`✅ Image téléchargée: ${seed}`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Erreur téléchargement arrière-plan: ${error.message}`);
    }
  }

  /**
   * Récupère la galerie d'un personnage
   * v5.4.64 - Recherche multi-clés robuste
   */
  async getGallery(characterId) {
    try {
      if (!characterId) return [];
      
      const userId = await this.getCurrentUserId();
      const key = `gal_${userId}_${characterId}`;
      
      console.log(`📖 LOAD GALLERY: userId=${userId}, charId=${characterId}`);
      
      // Ordre de priorité des clés
      const keysToTry = [
        key,
        `gal_backup_${characterId}`,
        `gal_simple_${characterId}`,
        `gal_fallback_${characterId}`,
        `gallery_${characterId}`,
      ];
      
      let data = null;
      let foundKey = null;
      
      for (const k of keysToTry) {
        try {
          const d = await AsyncStorage.getItem(k);
          if (d) {
            data = d;
            foundKey = k;
            break;
          }
        } catch (e) {}
      }
      
      if (!data) {
        console.log(`ℹ️ Galerie vide pour ${characterId}`);
        return [];
      }
      
      // Migrer vers clé principale si trouvé ailleurs
      if (foundKey && foundKey !== key) {
        console.log(`🔄 Migration galerie: ${foundKey} -> ${key}`);
        await AsyncStorage.setItem(key, data);
      }
      
      const gallery = JSON.parse(data);
      const result = [];
      
      for (const item of gallery) {
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
      
      console.log(`✅ GALLERY LOAD OK: ${result.length} images`);
      return result;
      
    } catch (error) {
      console.error('Error getting gallery:', error);
      return [];
    }
  }
  
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
      const localSeedMatch = imageUrl?.match(/_(\d+)_\d+\.jpg$/);
      const localSeed = localSeedMatch ? localSeedMatch[1] : null;
      
      const filesToDelete = [];
      
      const updated = gallery.filter(item => {
        if (typeof item === 'string') {
          const itemSeed = this.extractSeedFromUrl(item);
          if (item === imageUrl) return false;
          if (seedToDelete && itemSeed === seedToDelete) return false;
          if (localSeed && itemSeed === localSeed) return false;
          return true;
        }
        
        let shouldDelete = false;
        if (item.localPath === imageUrl) shouldDelete = true;
        if (item.url === imageUrl) shouldDelete = true;
        if (seedToDelete && item.seed === seedToDelete) shouldDelete = true;
        if (localSeed && item.seed === localSeed) shouldDelete = true;
        
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
        if (typeof item === 'string') {
          return this.regeneratePollinationsUrl(item);
        }
        if (item.localPath) return item.localPath;
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
      
      const oldKey = `bg_${conversationId}`;
      const oldData = await AsyncStorage.getItem(oldKey);
      if (oldData) {
        await AsyncStorage.setItem(key, oldData);
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
      return { totalImages: 0, totalSize: 0, totalSizeMB: '0.00' };
    }
  }

  async clearLocalCache() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.imageDirectory);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.imageDirectory, { idempotent: true });
        console.log('🗑️ Cache images local supprimé');
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
