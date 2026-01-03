import AsyncStorage from '@react-native-async-storage/async-storage';

class GalleryService {
  async saveImageToGallery(characterId, imageUrl) {
    try {
      const key = `gallery_${characterId}`;
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
      }
      
      return imageUrl;
    } catch (error) {
      console.error('Error saving image to gallery:', error);
      throw error;
    }
  }

  async getGallery(characterId) {
    try {
      const key = `gallery_${characterId}`;
      const data = await AsyncStorage.getItem(key);
      if (!data) return [];
      
      const gallery = JSON.parse(data);
      // Retourner juste les URLs pour compatibilité
      return gallery.map(item => typeof item === 'string' ? item : item.url);
    } catch (error) {
      console.error('Error getting gallery:', error);
      return [];
    }
  }

  async deleteImage(characterId, imageUrl) {
    try {
      const key = `gallery_${characterId}`;
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
      const key = `bg_${conversationId}`;
      await AsyncStorage.setItem(key, imageUrl);
    } catch (error) {
      console.error('Error setting background:', error);
    }
  }

  async getConversationBackground(conversationId) {
    try {
      const key = `bg_${conversationId}`;
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting background:', error);
      return null;
    }
  }
}

export default new GalleryService();
