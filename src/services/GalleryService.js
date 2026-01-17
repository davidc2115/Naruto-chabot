import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './AuthService';

class GalleryService {
  constructor() {
    // Cache pour l'ID utilisateur
    this._cachedUserId = null;
    this._lastUserIdCheck = 0;
  }

  /**
   * Récupère l'ID de l'utilisateur courant
   * v5.3.35 - Plus robuste avec cache et fallback device ID
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
        } catch (e) {
          // JSON invalide, ignorer
        }
      }

      // 3. Utiliser ou créer un ID device persistant (partagé avec StorageService)
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

  async saveImageToGallery(characterId, imageUrl) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `gal_${userId}_${characterId}`;
      const existing = await AsyncStorage.getItem(key);
      const gallery = existing ? JSON.parse(existing) : [];
      
      // Vérifier si l'URL existe déjà
      const urlExists = gallery.some(item => {
        const url = typeof item === 'string' ? item : item.url;
        return url === imageUrl;
      });
      
      if (!urlExists) {
        // Ajouter simplement l'URL comme string (plus simple)
        gallery.unshift(imageUrl);
        
        // Limiter à 50 images par personnage
        if (gallery.length > 50) {
          gallery.pop();
        }
        
        await AsyncStorage.setItem(key, JSON.stringify(gallery));
        console.log(`🖼️ Image sauvegardée: ${key}`);
      }
      
      return imageUrl;
    } catch (error) {
      console.error('Error saving image to gallery:', error);
      throw error;
    }
  }

  async getGallery(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `gal_${userId}_${characterId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        const gallery = JSON.parse(data);
        return gallery.map(item => typeof item === 'string' ? item : item.url);
      }
      
      // Migration: essayer l'ancienne clé
      const oldKey = `gallery_${characterId}`;
      const oldData = await AsyncStorage.getItem(oldKey);
      if (oldData) {
        console.log(`🔄 Migration galerie: ${oldKey} -> ${key}`);
        await AsyncStorage.setItem(key, oldData);
        return JSON.parse(oldData).map(item => typeof item === 'string' ? item : item.url);
      }
      
      return [];
    } catch (error) {
      console.error('Error getting gallery:', error);
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
      // Filtrer par URL (compatible avec ancien et nouveau format)
      const updated = gallery.filter(item => {
        const url = typeof item === 'string' ? item : item.url;
        return url !== imageUrl;
      });
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      return updated.map(item => typeof item === 'string' ? item : item.url);
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
}

export default new GalleryService();
