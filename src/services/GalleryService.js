import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import AuthService from './AuthService';

/**
 * Service de gestion de galerie d'images
 * v5.3.12 - Stockage LOCAL sur le téléphone pour persistance permanente
 * Les images sont téléchargées et sauvegardées localement
 */
class GalleryService {
  constructor() {
    // Répertoire de base pour stocker les images
    this.imageDirectory = `${FileSystem.documentDirectory}gallery/`;
    this.initDirectory();
  }

  /**
   * Initialise le répertoire de stockage des images
   */
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
      
      // Télécharger l'image
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

  /**
   * Vérifie si un fichier local existe
   */
  async checkLocalFile(localPath) {
    try {
      if (!localPath) return false;
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      return fileInfo.exists;
    } catch (error) {
      return false;
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
      
      // Extraire les infos importantes de l'URL
      const seed = this.extractSeedFromUrl(imageUrl);
      const prompt = this.extractPromptFromUrl(imageUrl);
      
      // Vérifier si l'image existe déjà (par seed)
      const exists = gallery.some(item => {
        if (typeof item === 'string') {
          return this.extractSeedFromUrl(item) === seed;
        }
        return item.seed === seed;
      });
      
      if (!exists) {
        // NOUVEAU: Télécharger et sauvegarder l'image localement
        let localPath = null;
        const downloadResult = await this.downloadAndSaveImage(imageUrl, characterId, seed);
        
        if (downloadResult.success) {
          localPath = downloadResult.localPath;
          console.log(`✅ Image stockée localement: ${downloadResult.fileName}`);
        } else {
          console.log(`⚠️ Impossible de télécharger, utilisation URL distante`);
        }
        
        // Stocker les données complètes de l'image
        const imageData = {
          url: imageUrl,                    // URL originale (backup)
          localPath: localPath,             // Chemin local (priorité)
          seed: seed,
          prompt: prompt ? prompt.substring(0, 500) : null,
          savedAt: Date.now(),
          characterId: characterId,
          isLocal: !!localPath,             // Flag pour indiquer si stocké localement
        };
        
        gallery.unshift(imageData);
        
        // Limiter à 100 images par personnage (augmenté car stockage local)
        if (gallery.length > 100) {
          // Supprimer le fichier local de l'image retirée
          const removed = gallery.pop();
          if (removed?.localPath) {
            try {
              await FileSystem.deleteAsync(removed.localPath, { idempotent: true });
              console.log(`🗑️ Ancien fichier supprimé: ${removed.localPath}`);
            } catch (e) {}
          }
        }
        
        await AsyncStorage.setItem(key, JSON.stringify(gallery));
        console.log(`🖼️ Image ajoutée à la galerie: seed=${seed}, local=${!!localPath}`);
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
        const result = [];
        let needsUpdate = false;
        
        for (const item of gallery) {
          if (typeof item === 'string') {
            // Ancien format string - migrer vers local
            const seed = this.extractSeedFromUrl(item);
            const prompt = this.extractPromptFromUrl(item);
            const url = this.regeneratePollinationsUrl(item);
            
            // Essayer de télécharger pour migration
            const downloadResult = await this.downloadAndSaveImage(url, characterId, seed);
            if (downloadResult.success) {
              result.push(downloadResult.localPath);
              // Marquer pour mise à jour
              needsUpdate = true;
            } else {
              result.push(url);
            }
          } else if (item.localPath) {
            // Nouveau format avec chemin local - vérifier si le fichier existe
            const exists = await this.checkLocalFile(item.localPath);
            if (exists) {
              result.push(item.localPath);
            } else {
              // Fichier local supprimé - régénérer l'URL
              if (item.seed && item.prompt) {
                const encodedPrompt = encodeURIComponent(item.prompt);
                const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=1024&seed=${item.seed}&nologo=true&model=flux&enhance=true`;
                
                // Re-télécharger
                const downloadResult = await this.downloadAndSaveImage(url, characterId, item.seed);
                if (downloadResult.success) {
                  item.localPath = downloadResult.localPath;
                  needsUpdate = true;
                  result.push(downloadResult.localPath);
                } else {
                  result.push(url);
                }
              } else if (item.url) {
                result.push(item.url);
              }
            }
          } else if (item.seed && item.prompt) {
            // Format avec seed/prompt mais sans local - télécharger
            const encodedPrompt = encodeURIComponent(item.prompt);
            const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=1024&seed=${item.seed}&nologo=true&model=flux&enhance=true`;
            
            const downloadResult = await this.downloadAndSaveImage(url, characterId, item.seed);
            if (downloadResult.success) {
              item.localPath = downloadResult.localPath;
              item.isLocal = true;
              needsUpdate = true;
              result.push(downloadResult.localPath);
            } else {
              result.push(url);
            }
          } else if (item.url) {
            result.push(item.url);
          }
        }
        
        // Mettre à jour le stockage si des migrations ont eu lieu
        if (needsUpdate) {
          await AsyncStorage.setItem(key, JSON.stringify(gallery));
          console.log(`🔄 Galerie mise à jour avec chemins locaux: ${key}`);
        }
        
        return result;
      }
      
      // Migration: essayer l'ancienne clé
      const oldKey = `gallery_${characterId}`;
      const oldData = await AsyncStorage.getItem(oldKey);
      if (oldData) {
        console.log(`🔄 Migration galerie: ${oldKey} -> ${key}`);
        await AsyncStorage.setItem(key, oldData);
        // Relancer pour traiter la migration
        return this.getGallery(characterId);
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
      
      // Extraire le seed de l'URL/chemin à supprimer pour comparaison
      const seedToDelete = this.extractSeedFromUrl(imageUrl);
      // Si c'est un chemin local, extraire le seed du nom de fichier
      const localSeedMatch = imageUrl?.match(/_(\d+)_\d+\.jpg$/);
      const localSeed = localSeedMatch ? localSeedMatch[1] : null;
      
      console.log(`🗑️ Suppression image - Path: ${imageUrl?.substring(0, 60)}..., Seed: ${seedToDelete || localSeed}`);
      
      const filesToDelete = [];
      
      // Filtrer et collecter les fichiers à supprimer
      const updated = gallery.filter(item => {
        // Ancien format (string)
        if (typeof item === 'string') {
          const itemSeed = this.extractSeedFromUrl(item);
          if (item === imageUrl) return false;
          if (seedToDelete && itemSeed === seedToDelete) return false;
          if (localSeed && itemSeed === localSeed) return false;
          return true;
        }
        
        // Nouveau format (objet avec url, seed, prompt, localPath)
        let shouldDelete = false;
        
        // Comparaison par chemin local
        if (item.localPath === imageUrl) shouldDelete = true;
        // Comparaison par URL
        if (item.url === imageUrl) shouldDelete = true;
        // Comparaison par seed
        if (seedToDelete && item.seed === seedToDelete) shouldDelete = true;
        if (localSeed && item.seed === localSeed) shouldDelete = true;
        
        // Comparer avec URL régénérée
        if (!shouldDelete && item.seed && item.prompt) {
          const regeneratedUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(item.prompt)}?width=768&height=1024&seed=${item.seed}&nologo=true&model=flux&enhance=true`;
          if (regeneratedUrl === imageUrl) shouldDelete = true;
        }
        
        if (shouldDelete && item.localPath) {
          filesToDelete.push(item.localPath);
        }
        
        return !shouldDelete;
      });
      
      // Supprimer les fichiers locaux
      for (const filePath of filesToDelete) {
        try {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          console.log(`🗑️ Fichier local supprimé: ${filePath}`);
        } catch (e) {
          console.log(`⚠️ Impossible de supprimer le fichier: ${filePath}`);
        }
      }
      
      console.log(`🗑️ Galerie: ${gallery.length} -> ${updated.length} images`);
      
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      
      // Retourner les chemins locaux ou URLs
      return updated.map(item => {
        if (typeof item === 'string') {
          return this.regeneratePollinationsUrl(item);
        }
        // Priorité au chemin local
        if (item.localPath) {
          return item.localPath;
        }
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

  /**
   * Obtient les statistiques de stockage des images
   */
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
      console.error('Error getting storage stats:', error);
      return { totalImages: 0, totalSize: 0, totalSizeMB: '0.00' };
    }
  }

  /**
   * Supprime toutes les images locales (libère l'espace)
   * ATTENTION: Les images seront re-téléchargées au prochain accès
   */
  async clearLocalCache() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.imageDirectory);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.imageDirectory, { idempotent: true });
        console.log('🗑️ Cache images local supprimé');
      }
      // Recréer le répertoire vide
      await this.initDirectory();
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Pré-télécharge les images d'une galerie en arrière-plan
   * Utile pour s'assurer que toutes les images sont disponibles hors-ligne
   */
  async prefetchGallery(characterId) {
    try {
      console.log(`📥 Pré-téléchargement galerie: ${characterId}`);
      // getGallery effectue automatiquement le téléchargement des images manquantes
      await this.getGallery(characterId);
      console.log(`✅ Pré-téléchargement terminé: ${characterId}`);
      return true;
    } catch (error) {
      console.error('Error prefetching gallery:', error);
      return false;
    }
  }
}

export default new GalleryService();
