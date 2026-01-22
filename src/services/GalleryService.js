/**
 * GalleryService - Gestion de la galerie d'images
 * v5.4.66 - CORRECTION BUG: Race condition dans downloadInBackground
 * 
 * PROBLÈME RÉSOLU: downloadInBackground écrasait la galerie avec une version obsolète
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { getUserId } from './AppUserManager';

class GalleryService {
  constructor() {
    this.imageDirectory = `${FileSystem.documentDirectory}gallery/`;
    this.initDirectory();
    console.log('🖼️ [GalleryService] Initialisé v5.4.66');
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

  async getCurrentUserId() {
    const userId = await getUserId();
    return userId;
  }

  /**
   * Récupère les clés de sauvegarde pour un personnage
   */
  _getKeys(userId, characterId) {
    return {
      primary: `gal_${userId}_${characterId}`,
      backup: `gal_backup_${characterId}`,
      global: `gal_global_${characterId}`,
      legacy: `gallery_${characterId}`,
    };
  }

  /**
   * Charge la galerie existante depuis toutes les clés possibles
   */
  async _loadExistingGallery(userId, characterId) {
    const keys = this._getKeys(userId, characterId);
    const keysToTry = [keys.primary, keys.backup, keys.global, keys.legacy];
    
    for (const key of keysToTry) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`📂 [GALLERY] Chargé ${parsed.length} images depuis ${key}`);
            return parsed;
          }
        }
      } catch (e) {}
    }
    
    return [];
  }

  /**
   * Sauvegarde la galerie vers toutes les clés
   */
  async _saveGallery(userId, characterId, gallery) {
    const keys = this._getKeys(userId, characterId);
    const jsonData = JSON.stringify(gallery);
    
    const savePromises = [
      AsyncStorage.setItem(keys.primary, jsonData),
      AsyncStorage.setItem(keys.backup, jsonData),
      AsyncStorage.setItem(keys.global, jsonData),
      AsyncStorage.setItem(keys.legacy, jsonData),
    ];
    
    await Promise.all(savePromises);
    console.log(`💾 [GALLERY] Sauvegardé ${gallery.length} images vers 4 clés`);
  }

  /**
   * SAUVEGARDE IMAGE - Version corrigée sans race condition
   */
  async saveImageToGallery(characterId, imageUrl) {
    console.log(`\n========== SAVE IMAGE START ==========`);
    console.log(`🖼️ characterId: ${characterId}`);
    console.log(`🖼️ imageUrl: ${imageUrl?.substring(0, 60)}...`);
    
    try {
      if (!characterId || !imageUrl || typeof imageUrl !== 'string') {
        console.error('❌ [GALLERY] Paramètres invalides');
        return null;
      }
      
      const userId = await this.getCurrentUserId();
      console.log(`🔑 [GALLERY] userId: ${userId}`);
      
      // Charger galerie existante
      let gallery = await this._loadExistingGallery(userId, characterId);
      console.log(`📂 [GALLERY] Galerie existante: ${gallery.length} images`);
      
      // Extraire les infos de l'URL
      const seed = this.extractSeedFromUrl(imageUrl);
      
      // Vérifier si image existe déjà (par URL exacte ou par seed si non-null)
      const exists = gallery.some(item => {
        const itemUrl = typeof item === 'string' ? item : item?.url;
        if (itemUrl === imageUrl) return true;
        
        if (seed) {
          const itemSeed = typeof item === 'string' 
            ? this.extractSeedFromUrl(item) 
            : item?.seed;
          if (itemSeed === seed) return true;
        }
        return false;
      });
      
      if (exists) {
        console.log(`ℹ️ [GALLERY] Image déjà présente, ignorée`);
        return imageUrl;
      }
      
      // Créer l'entrée
      const imageData = {
        url: imageUrl,
        localPath: null,
        seed: seed,
        savedAt: Date.now(),
        characterId: String(characterId),
      };
      
      // Ajouter au DÉBUT
      gallery.unshift(imageData);
      console.log(`➕ [GALLERY] Image ajoutée, total: ${gallery.length}`);
      
      // Limiter à 100 images
      while (gallery.length > 100) {
        const removed = gallery.pop();
        if (removed?.localPath) {
          try { await FileSystem.deleteAsync(removed.localPath, { idempotent: true }); } catch (e) {}
        }
      }
      
      // Sauvegarder
      await this._saveGallery(userId, characterId, gallery);
      
      // Vérification immédiate
      const verify = await AsyncStorage.getItem(this._getKeys(userId, characterId).primary);
      if (verify) {
        const verifyParsed = JSON.parse(verify);
        console.log(`✅ [GALLERY] Vérification: ${verifyParsed.length} images`);
      }
      
      // Télécharger en arrière-plan (SANS SAUVEGARDER - évite race condition)
      this._downloadOnly(imageUrl, characterId, seed).catch(() => {});
      
      console.log(`========== SAVE IMAGE END ==========\n`);
      return imageUrl;
      
    } catch (error) {
      console.error('❌ [GALLERY] EXCEPTION:', error);
      
      // Sauvegarde d'urgence
      try {
        await AsyncStorage.setItem(`gal_emergency_${characterId}`, JSON.stringify([{
          url: imageUrl,
          savedAt: Date.now(),
        }]));
      } catch (e2) {}
      
      return null;
    }
  }

  /**
   * Télécharge l'image SANS modifier AsyncStorage
   * Cela évite la race condition
   */
  async _downloadOnly(imageUrl, characterId, seed) {
    try {
      await this.initDirectory();
      const fileName = `${characterId}_${seed || Date.now()}_${Date.now()}.jpg`;
      const localPath = `${this.imageDirectory}${fileName}`;
      
      const result = await FileSystem.downloadAsync(imageUrl, localPath);
      if (result.status === 200) {
        console.log(`✅ [GALLERY] Image téléchargée localement: ${fileName}`);
        
        // Mettre à jour l'entrée dans la galerie de façon sûre
        await this._updateLocalPath(characterId, imageUrl, localPath);
      }
    } catch (error) {
      console.log(`⚠️ [GALLERY] Téléchargement échoué:`, error.message);
    }
  }

  /**
   * Met à jour le localPath d'une image de façon sûre (recharge la galerie avant)
   */
  async _updateLocalPath(characterId, imageUrl, localPath) {
    try {
      const userId = await this.getCurrentUserId();
      const gallery = await this._loadExistingGallery(userId, characterId);
      
      const index = gallery.findIndex(item => {
        const itemUrl = typeof item === 'string' ? item : item?.url;
        return itemUrl === imageUrl;
      });
      
      if (index !== -1) {
        if (typeof gallery[index] === 'string') {
          gallery[index] = { url: gallery[index], localPath, savedAt: Date.now() };
        } else {
          gallery[index].localPath = localPath;
        }
        
        await this._saveGallery(userId, characterId, gallery);
        console.log(`✅ [GALLERY] LocalPath mis à jour pour index ${index}`);
      }
    } catch (error) {
      console.log(`⚠️ [GALLERY] Erreur mise à jour localPath:`, error.message);
    }
  }

  /**
   * CHARGEMENT GALERIE
   */
  async getGallery(characterId) {
    console.log(`\n========== LOAD GALLERY ==========`);
    
    try {
      if (!characterId) return [];
      
      const userId = await this.getCurrentUserId();
      const gallery = await this._loadExistingGallery(userId, characterId);
      
      if (gallery.length === 0) {
        console.log(`ℹ️ [GALLERY] Galerie vide`);
        return [];
      }
      
      // Construire la liste des URLs/chemins
      const result = [];
      for (const item of gallery) {
        if (typeof item === 'string') {
          result.push(item);
        } else if (item.localPath) {
          const exists = await this.checkLocalFile(item.localPath);
          result.push(exists ? item.localPath : item.url);
        } else if (item.url) {
          result.push(item.url);
        }
      }
      
      console.log(`✅ [GALLERY] ${result.length} images chargées`);
      console.log(`========== LOAD GALLERY END ==========\n`);
      return result;
      
    } catch (error) {
      console.error('❌ [GALLERY] Erreur:', error);
      return [];
    }
  }

  // ========== MÉTHODES UTILITAIRES ==========

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
    if (!url || typeof url !== 'string') return null;
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

  async getGalleryFull(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      return await this._loadExistingGallery(userId, characterId);
    } catch (error) {
      return [];
    }
  }

  async deleteImage(characterId, imageUrl) {
    try {
      const userId = await this.getCurrentUserId();
      let gallery = await this._loadExistingGallery(userId, characterId);
      
      const seedToDelete = this.extractSeedFromUrl(imageUrl);
      
      const updated = gallery.filter(item => {
        const itemUrl = typeof item === 'string' ? item : item?.url;
        const itemSeed = typeof item === 'string' ? this.extractSeedFromUrl(item) : item?.seed;
        
        // Garder si différent
        if (itemUrl === imageUrl) return false;
        if (seedToDelete && itemSeed === seedToDelete) return false;
        if (typeof item !== 'string' && item?.localPath === imageUrl) return false;
        
        return true;
      });
      
      await this._saveGallery(userId, characterId, updated);
      
      return updated.map(item => typeof item === 'string' ? item : item?.url || item?.localPath);
    } catch (error) {
      console.error('❌ [GALLERY] Delete error:', error);
      throw error;
    }
  }

  async setConversationBackground(conversationId, imageUrl) {
    try {
      const userId = await this.getCurrentUserId();
      await AsyncStorage.setItem(`bg_${userId}_${conversationId}`, imageUrl);
    } catch (error) {}
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
    await this.getGallery(characterId);
    return true;
  }
}

export default new GalleryService();
