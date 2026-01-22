/**
 * Service de gestion de galerie d'images
 * v5.4.61 - Version simplifiée et robuste
 * SANS dépendance externe - tout en direct avec AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

class GalleryService {
  constructor() {
    this.imageDirectory = `${FileSystem.documentDirectory}gallery/`;
    this.initDirectory();
  }

  async initDirectory() {
    try {
      const info = await FileSystem.getInfoAsync(this.imageDirectory);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(this.imageDirectory, { intermediates: true });
      }
    } catch (e) {}
  }

  /**
   * Sauvegarde une image dans la galerie
   */
  async saveImageToGallery(characterId, imageUrl) {
    console.log(`📸 Sauvegarde image: ${characterId}`);
    
    if (!characterId || !imageUrl) {
      console.error('❌ saveImageToGallery: params manquants');
      return null;
    }
    
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('file')) {
      console.error('❌ URL invalide:', imageUrl?.substring(0, 30));
      return null;
    }

    try {
      const key = `g_${characterId}`;
      
      // Charger galerie existante
      let gallery = [];
      try {
        const existing = await AsyncStorage.getItem(key);
        if (existing) {
          gallery = JSON.parse(existing);
          if (!Array.isArray(gallery)) gallery = [];
        }
      } catch (e) {
        gallery = [];
      }
      
      // Vérifier si déjà présent
      const exists = gallery.some(item => {
        if (typeof item === 'string') return item === imageUrl;
        return item?.url === imageUrl;
      });
      
      if (!exists) {
        // Ajouter la nouvelle image
        gallery.unshift({
          url: imageUrl,
          savedAt: Date.now(),
        });
        
        // Limiter à 100
        if (gallery.length > 100) gallery.pop();
        
        // Sauvegarder
        await AsyncStorage.setItem(key, JSON.stringify(gallery));
        
        // Backup
        await AsyncStorage.setItem(`gb_${characterId}`, JSON.stringify(gallery));
        
        console.log(`✅ Image sauvegardée: ${gallery.length} images total`);
      } else {
        console.log('ℹ️ Image déjà en galerie');
      }
      
      return imageUrl;
    } catch (error) {
      console.error('❌ Erreur saveImageToGallery:', error);
      return null;
    }
  }

  /**
   * Récupère la galerie d'un personnage
   */
  async getGallery(characterId) {
    console.log(`📸 Chargement galerie: ${characterId}`);
    
    if (!characterId) return [];

    try {
      // Essayer clé principale
      let data = await AsyncStorage.getItem(`g_${characterId}`);
      
      // Fallback backup
      if (!data) {
        data = await AsyncStorage.getItem(`gb_${characterId}`);
      }
      
      // Fallback anciens formats
      if (!data) {
        const keys = await AsyncStorage.getAllKeys();
        for (const key of keys) {
          if (key.includes(characterId) && key.includes('gal')) {
            data = await AsyncStorage.getItem(key);
            if (data) break;
          }
        }
      }
      
      if (data) {
        const gallery = JSON.parse(data);
        if (!Array.isArray(gallery)) return [];
        
        // Extraire les URLs
        const urls = gallery
          .map(item => typeof item === 'string' ? item : item?.url)
          .filter(url => url && (url.startsWith('http') || url.startsWith('file')));
        
        console.log(`✅ Galerie: ${urls.length} images`);
        return urls;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Erreur getGallery:', error);
      return [];
    }
  }

  /**
   * Supprime une image de la galerie
   */
  async deleteImage(characterId, imageUrl) {
    if (!characterId || !imageUrl) return [];

    try {
      const key = `g_${characterId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        let gallery = JSON.parse(data);
        
        gallery = gallery.filter(item => {
          if (typeof item === 'string') return item !== imageUrl;
          return item?.url !== imageUrl;
        });
        
        await AsyncStorage.setItem(key, JSON.stringify(gallery));
        await AsyncStorage.setItem(`gb_${characterId}`, JSON.stringify(gallery));
        
        return gallery.map(item => typeof item === 'string' ? item : item?.url).filter(Boolean);
      }
      
      return [];
    } catch (error) {
      console.error('❌ Erreur deleteImage:', error);
      return [];
    }
  }

  /**
   * Définit le fond de conversation
   */
  async setConversationBackground(characterId, imageUrl) {
    if (!characterId) return;
    try {
      await AsyncStorage.setItem(`bg_${characterId}`, imageUrl);
    } catch (e) {}
  }

  /**
   * Récupère le fond de conversation
   */
  async getConversationBackground(characterId) {
    if (!characterId) return null;
    try {
      return await AsyncStorage.getItem(`bg_${characterId}`);
    } catch (e) {
      return null;
    }
  }

  // Méthodes utilitaires pour compatibilité
  extractSeedFromUrl(url) {
    if (!url) return null;
    const match = url.match(/[&?]seed=(\d+)/);
    return match ? match[1] : null;
  }

  extractPromptFromUrl(url) {
    if (!url) return null;
    try {
      const match = url.match(/pollinations\.ai\/prompt\/([^?]+)/);
      if (match) return decodeURIComponent(match[1]);
    } catch (e) {}
    return null;
  }

  async getCurrentUserId() {
    return 'user';
  }
}

export default new GalleryService();
