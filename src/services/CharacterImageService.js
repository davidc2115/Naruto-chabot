import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * CharacterImageService - Persistance des images générées par personnage
 * 
 * Stocke les URLs des images générées pour chaque personnage
 * Les images sont conservées même si la conversation est supprimée
 */
class CharacterImageService {
  constructor() {
    this.STORAGE_KEY = 'character_generated_images';
  }

  /**
   * Récupère toutes les images générées pour un personnage
   */
  async getCharacterImages(characterId) {
    try {
      const allImages = await this.getAllImages();
      return allImages[characterId] || [];
    } catch (error) {
      console.error('Erreur récupération images personnage:', error);
      return [];
    }
  }

  /**
   * Récupère toutes les images stockées
   */
  async getAllImages() {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Erreur récupération toutes images:', error);
      return {};
    }
  }

  /**
   * Ajoute une image générée pour un personnage
   */
  async addImage(characterId, imageUrl, prompt = '') {
    try {
      const allImages = await this.getAllImages();
      
      if (!allImages[characterId]) {
        allImages[characterId] = [];
      }
      
      // Ajouter l'image avec timestamp et prompt
      allImages[characterId].unshift({
        url: imageUrl,
        prompt: prompt,
        timestamp: Date.now(),
        id: `${characterId}_${Date.now()}`
      });
      
      // Limiter à 20 images par personnage
      if (allImages[characterId].length > 20) {
        allImages[characterId] = allImages[characterId].slice(0, 20);
      }
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(allImages));
      return true;
    } catch (error) {
      console.error('Erreur ajout image:', error);
      return false;
    }
  }

  /**
   * Supprime une image spécifique
   */
  async deleteImage(characterId, imageId) {
    try {
      const allImages = await this.getAllImages();
      
      if (allImages[characterId]) {
        allImages[characterId] = allImages[characterId].filter(img => img.id !== imageId);
        
        if (allImages[characterId].length === 0) {
          delete allImages[characterId];
        }
        
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(allImages));
      }
      
      return true;
    } catch (error) {
      console.error('Erreur suppression image:', error);
      return false;
    }
  }

  /**
   * Supprime toutes les images d'un personnage
   */
  async deleteCharacterImages(characterId) {
    try {
      const allImages = await this.getAllImages();
      
      if (allImages[characterId]) {
        delete allImages[characterId];
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(allImages));
      }
      
      return true;
    } catch (error) {
      console.error('Erreur suppression images personnage:', error);
      return false;
    }
  }

  /**
   * Récupère la dernière image générée pour un personnage
   */
  async getLatestImage(characterId) {
    try {
      const images = await this.getCharacterImages(characterId);
      return images.length > 0 ? images[0] : null;
    } catch (error) {
      console.error('Erreur récupération dernière image:', error);
      return null;
    }
  }

  /**
   * Compte le nombre total d'images stockées
   */
  async getTotalImageCount() {
    try {
      const allImages = await this.getAllImages();
      let total = 0;
      
      Object.values(allImages).forEach(images => {
        total += images.length;
      });
      
      return total;
    } catch (error) {
      console.error('Erreur comptage images:', error);
      return 0;
    }
  }
}

export default new CharacterImageService();
