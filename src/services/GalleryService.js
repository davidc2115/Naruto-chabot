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
   * v5.4.62 - Logs détaillés pour debug
   */
  async saveImageToGallery(characterId, imageUrl) {
    console.log(`\n========== SAVE IMAGE TO GALLERY ==========`);
    console.log(`📸 CharacterID: ${characterId}`);
    console.log(`📸 URL: ${imageUrl?.substring(0, 80)}...`);
    
    if (!characterId) {
      console.error('❌ ERREUR: characterId manquant!');
      return null;
    }
    
    if (!imageUrl) {
      console.error('❌ ERREUR: imageUrl manquant!');
      return null;
    }
    
    if (typeof imageUrl !== 'string') {
      console.error('❌ ERREUR: imageUrl n\'est pas une string:', typeof imageUrl);
      return null;
    }
    
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('file')) {
      console.error('❌ ERREUR: URL invalide (ne commence pas par http/file)');
      console.error('❌ URL reçue:', imageUrl.substring(0, 100));
      return null;
    }

    try {
      const key = `g_${characterId}`;
      console.log(`🔑 Clé galerie: ${key}`);
      
      // Charger galerie existante
      let gallery = [];
      const existing = await AsyncStorage.getItem(key);
      console.log(`📂 Données existantes: ${existing ? 'OUI' : 'NON'}`);
      
      if (existing) {
        try {
          gallery = JSON.parse(existing);
          if (!Array.isArray(gallery)) {
            console.log('⚠️ Galerie n\'était pas un array, réinitialisation');
            gallery = [];
          }
          console.log(`📂 Galerie existante: ${gallery.length} images`);
        } catch (parseError) {
          console.error('⚠️ Erreur parsing galerie:', parseError.message);
          gallery = [];
        }
      }
      
      // Vérifier si déjà présent (comparaison simple)
      const urlToCheck = imageUrl.split('?')[0]; // Ignorer les params pour comparaison
      const exists = gallery.some(item => {
        const itemUrl = (typeof item === 'string' ? item : item?.url) || '';
        return itemUrl.split('?')[0] === urlToCheck;
      });
      
      if (exists) {
        console.log('ℹ️ Image déjà présente en galerie (ignoré)');
        console.log(`========== FIN SAVE (déjà présent) ==========\n`);
        return imageUrl;
      }
      
      // Ajouter la nouvelle image
      const newItem = {
        url: imageUrl,
        savedAt: Date.now(),
        id: Date.now().toString(36),
      };
      
      gallery.unshift(newItem);
      console.log(`➕ Nouvelle image ajoutée, total: ${gallery.length}`);
      
      // Limiter à 100
      if (gallery.length > 100) {
        gallery = gallery.slice(0, 100);
        console.log('⚠️ Galerie limitée à 100 images');
      }
      
      // Sauvegarder
      const jsonData = JSON.stringify(gallery);
      console.log(`💾 Taille données: ${jsonData.length} bytes`);
      
      await AsyncStorage.setItem(key, jsonData);
      console.log(`✅ Sauvegardé clé principale: ${key}`);
      
      // Backup
      await AsyncStorage.setItem(`gb_${characterId}`, jsonData);
      console.log(`✅ Sauvegardé backup: gb_${characterId}`);
      
      // Vérification immédiate
      const verify = await AsyncStorage.getItem(key);
      if (verify) {
        const verifyParsed = JSON.parse(verify);
        console.log(`✅ VÉRIFICATION OK: ${verifyParsed.length} images en galerie`);
      } else {
        console.error('❌ VÉRIFICATION ÉCHOUÉE: données non trouvées après save!');
      }
      
      console.log(`========== FIN SAVE (succès) ==========\n`);
      return imageUrl;
    } catch (error) {
      console.error('❌ EXCEPTION saveImageToGallery:', error.message);
      console.error('❌ Stack:', error.stack);
      console.log(`========== FIN SAVE (erreur) ==========\n`);
      return null;
    }
  }

  /**
   * Récupère la galerie d'un personnage
   * v5.4.62 - Logs détaillés pour debug
   */
  async getGallery(characterId) {
    console.log(`\n========== GET GALLERY ==========`);
    console.log(`📸 CharacterID: ${characterId}`);
    
    if (!characterId) {
      console.log('❌ characterId manquant');
      return [];
    }

    try {
      const key = `g_${characterId}`;
      console.log(`🔑 Clé: ${key}`);
      
      // Essayer clé principale
      let data = await AsyncStorage.getItem(key);
      console.log(`📂 Clé principale: ${data ? 'TROUVÉ' : 'NON'}`);
      
      // Fallback backup
      if (!data) {
        data = await AsyncStorage.getItem(`gb_${characterId}`);
        console.log(`📂 Backup: ${data ? 'TROUVÉ' : 'NON'}`);
      }
      
      // Fallback anciens formats
      if (!data) {
        console.log('🔍 Recherche anciens formats...');
        const keys = await AsyncStorage.getAllKeys();
        const galKeys = keys.filter(k => k.includes(characterId) && (k.includes('gal') || k.includes('gallery')));
        console.log(`🔍 Clés trouvées: ${galKeys.join(', ') || 'aucune'}`);
        
        for (const oldKey of galKeys) {
          data = await AsyncStorage.getItem(oldKey);
          if (data) {
            console.log(`📂 Trouvé dans: ${oldKey}`);
            // Migrer vers nouveau format
            await AsyncStorage.setItem(key, data);
            await AsyncStorage.setItem(`gb_${characterId}`, data);
            console.log('✅ Migré vers nouveau format');
            break;
          }
        }
      }
      
      if (data) {
        const gallery = JSON.parse(data);
        
        if (!Array.isArray(gallery)) {
          console.log('⚠️ Données ne sont pas un array');
          return [];
        }
        
        console.log(`📂 Galerie brute: ${gallery.length} items`);
        
        // Extraire les URLs
        const urls = gallery
          .map(item => {
            if (typeof item === 'string') return item;
            return item?.url;
          })
          .filter(url => url && typeof url === 'string' && (url.startsWith('http') || url.startsWith('file')));
        
        console.log(`✅ URLs valides: ${urls.length}`);
        if (urls.length > 0) {
          console.log(`📸 Première: ${urls[0].substring(0, 60)}...`);
        }
        console.log(`========== FIN GET GALLERY ==========\n`);
        return urls;
      }
      
      console.log('ℹ️ Galerie vide');
      console.log(`========== FIN GET GALLERY ==========\n`);
      return [];
    } catch (error) {
      console.error('❌ EXCEPTION getGallery:', error.message);
      console.log(`========== FIN GET GALLERY (erreur) ==========\n`);
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
