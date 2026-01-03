import AsyncStorage from '@react-native-async-storage/async-storage';

class GalleryService {
  async saveImageToGallery(characterId, imageUrl) {
    try {
      const key = `gallery_${characterId}`;
      const existing = await AsyncStorage.getItem(key);
      const gallery = existing ? JSON.parse(existing) : [];
      
      // Ajouter l'image avec timestamp
      const newImage = {
        url: imageUrl,
        timestamp: Date.now(),
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      gallery.unshift(newImage); // Ajouter au début
      
      // Limiter à 50 images par personnage
      if (gallery.length > 50) {
        gallery.pop();
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(gallery));
      return newImage;
    } catch (error) {
      console.error('Error saving image to gallery:', error);
      throw error;
    }
  }

  async getGallery(characterId) {
    try {
      const key = `gallery_${characterId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting gallery:', error);
      return [];
    }
  }

  async deleteImage(characterId, imageId) {
    try {
      const gallery = await this.getGallery(characterId);
      const updated = gallery.filter(img => img.id !== imageId);
      await AsyncStorage.setItem(`gallery_${characterId}`, JSON.stringify(updated));
      return updated;
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
