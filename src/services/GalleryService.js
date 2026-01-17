import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './AuthService';

/**
 * Service de gestion de galerie d'images
 * v5.3.8 - Stockage amélioré avec seed pour URLs persistantes
 */
class GalleryService {
  /**
   * Récupère l'ID de l'utilisateur courant
   */
  async getCurrentUserId() {
    try {
      const user = AuthService.getCurrentUser();
      if (user?.id) {
        return user.id;
      }
      const storedUser = await AsyncStorage.getItem('current_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        return parsed.id || 'anonymous';
      }
      return 'anonymous';
    } catch (error) {
      return 'anonymous';
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

  async saveImageToGallery(characterId, imageUrl) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `gal_${userId}_${characterId}`;
      const existing = await AsyncStorage.getItem(key);
      const gallery = existing ? JSON.parse(existing) : [];
      
      // Extraire les infos importantes de l'URL pour pouvoir la régénérer
      const seed = this.extractSeedFromUrl(imageUrl);
      const prompt = this.extractPromptFromUrl(imageUrl);
      
      // Vérifier si l'URL ou le seed existe déjà
      const exists = gallery.some(item => {
        if (typeof item === 'string') {
          return item === imageUrl || this.extractSeedFromUrl(item) === seed;
        }
        return item.url === imageUrl || item.seed === seed;
      });
      
      if (!exists) {
        // Stocker un objet avec URL, seed et prompt pour régénération future
        const imageData = {
          url: imageUrl,
          seed: seed,
          prompt: prompt ? prompt.substring(0, 500) : null, // Limiter la taille du prompt
          savedAt: Date.now(),
          characterId: characterId,
        };
        
        gallery.unshift(imageData);
        
        // Limiter à 50 images par personnage
        if (gallery.length > 50) {
          gallery.pop();
        }
        
        await AsyncStorage.setItem(key, JSON.stringify(gallery));
        console.log(`🖼️ Image sauvegardée avec seed ${seed}: ${key}`);
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
        // Retourner les URLs en les régénérant si nécessaire
        return gallery.map(item => {
          if (typeof item === 'string') {
            // Ancien format - essayer de régénérer
            return this.regeneratePollinationsUrl(item);
          }
          // Nouveau format avec seed - régénérer l'URL
          if (item.seed && item.prompt) {
            const encodedPrompt = encodeURIComponent(item.prompt);
            return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=1024&seed=${item.seed}&nologo=true&model=flux&enhance=true`;
          }
          return item.url;
        });
      }
      
      // Migration: essayer l'ancienne clé
      const oldKey = `gallery_${characterId}`;
      const oldData = await AsyncStorage.getItem(oldKey);
      if (oldData) {
        console.log(`🔄 Migration galerie: ${oldKey} -> ${key}`);
        await AsyncStorage.setItem(key, oldData);
        const parsed = JSON.parse(oldData);
        return parsed.map(item => {
          if (typeof item === 'string') {
            return this.regeneratePollinationsUrl(item);
          }
          return item.url;
        });
      }
      
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
