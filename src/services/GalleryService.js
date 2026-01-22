import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import AuthService from './AuthService';

/**
 * Service de gestion de galerie d'images
 * v5.4.58 - Stockage LOCAL sur le téléphone pour persistance permanente
 * FIX: Amélioration sauvegarde et chargement galerie
 */
class GalleryService {
  constructor() {
    // Répertoire de base pour stocker les images
    this.imageDirectory = `${FileSystem.documentDirectory}gallery/`;
    this.initDirectory();
    // Cache pour l'ID utilisateur - v5.4.58 ID fixe pour cohérence
    this._cachedUserId = null;
    this._lastUserIdCheck = 0;
    this._fixedUserId = null; // ID fixe une fois obtenu
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
   * v5.4.58 - TOUJOURS utiliser le même ID pour cohérence galerie
   */
  async getCurrentUserId() {
    try {
      // v5.4.58 - Si on a déjà un ID fixe, le réutiliser TOUJOURS
      if (this._fixedUserId) {
        return this._fixedUserId;
      }

      // Utiliser le cache si récent (moins de 30 secondes)
      const now = Date.now();
      if (this._cachedUserId && (now - this._lastUserIdCheck) < 30000) {
        return this._cachedUserId;
      }

      // 1. Essayer AuthService
      const user = AuthService.getCurrentUser();
      if (user?.id) {
        this._cachedUserId = user.id;
        this._fixedUserId = user.id; // Fixer cet ID
        this._lastUserIdCheck = now;
        console.log('🔑 Gallery User ID (Auth):', user.id);
        return user.id;
      }

      // 2. Essayer le token stocké
      const storedUser = await AsyncStorage.getItem('current_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.id) {
            this._cachedUserId = parsed.id;
            this._fixedUserId = parsed.id; // Fixer cet ID
            this._lastUserIdCheck = now;
            console.log('🔑 Gallery User ID (Stored):', parsed.id);
            return parsed.id;
          }
        } catch (e) {}
      }

      // 3. Utiliser ou créer un ID device PERSISTANT
      let deviceId = await AsyncStorage.getItem('device_user_id');
      if (!deviceId) {
        deviceId = 'device_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        await AsyncStorage.setItem('device_user_id', deviceId);
        console.log('📱 Nouvel ID device créé (Gallery):', deviceId);
      }

      this._cachedUserId = deviceId;
      this._fixedUserId = deviceId; // Fixer cet ID
      this._lastUserIdCheck = now;
      console.log('🔑 Gallery User ID (Device):', deviceId);
      return deviceId;
    } catch (error) {
      console.error('Error getting user ID (Gallery):', error);
      // v5.4.58 - Utiliser un ID fixe même en cas d'erreur
      if (!this._fixedUserId) {
        this._fixedUserId = 'gallery_default';
      }
      return this._fixedUserId;
    }
  }

  /**
   * Réinitialise le cache utilisateur
   */
  resetUserCache() {
    this._cachedUserId = null;
    this._lastUserIdCheck = 0;
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
    console.log(`📸 [SAVE] Début sauvegarde - CharID: ${characterId}, URL: ${imageUrl?.substring(0, 60)}...`);
    
    try {
      // v5.4.58 - Validation de l'URL avant sauvegarde
      if (!imageUrl || typeof imageUrl !== 'string') {
        console.error('❌ [SAVE] URL invalide (null ou non-string)');
        return null;
      }
      
      // Vérifier que c'est une URL valide (http ou file)
      if (!imageUrl.startsWith('http') && !imageUrl.startsWith('file')) {
        console.error('❌ [SAVE] URL ne commence pas par http ou file:', imageUrl.substring(0, 50));
        return null;
      }
      
      // Vérifier characterId
      if (!characterId) {
        console.error('❌ [SAVE] characterId manquant');
        return null;
      }
      
      const userId = await this.getCurrentUserId();
      const key = `gal_${userId}_${characterId}`;
      console.log(`🔑 [SAVE] Clé galerie: ${key}`);
      
      // v5.4.58 - Charger galerie existante
      let gallery = [];
      try {
        const existing = await AsyncStorage.getItem(key);
        if (existing) {
          const parsed = JSON.parse(existing);
          if (Array.isArray(parsed)) {
            gallery = parsed;
            console.log(`📂 [SAVE] Galerie existante: ${gallery.length} images`);
          }
        } else {
          console.log(`📂 [SAVE] Nouvelle galerie pour ${characterId}`);
        }
      } catch (e) {
        console.log('⚠️ [SAVE] Erreur lecture galerie, création nouvelle:', e.message);
        gallery = [];
      }
      
      // Extraire les infos importantes de l'URL
      const seed = this.extractSeedFromUrl(imageUrl) || String(Date.now());
      const prompt = this.extractPromptFromUrl(imageUrl);
      
      // Vérifier si l'image existe déjà (par seed ou URL)
      const exists = gallery.some(item => {
        if (typeof item === 'string') {
          return this.extractSeedFromUrl(item) === seed || item === imageUrl;
        }
        return item?.seed === seed || item?.url === imageUrl;
      });
      
      if (!exists) {
        // v5.4.58: SAUVEGARDER avec l'URL
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
        console.log(`➕ [SAVE] Nouvelle image ajoutée, total: ${gallery.length}`);
        
        // Limiter à 100 images par personnage
        if (gallery.length > 100) {
          const removed = gallery.pop();
          if (removed?.localPath) {
            try {
              await FileSystem.deleteAsync(removed.localPath, { idempotent: true });
            } catch (e) {}
          }
        }
        
        // v5.4.58 - QUADRUPLE sauvegarde pour persistance garantie
        const jsonData = JSON.stringify(gallery);
        
        // 1. Clé principale avec userId
        await AsyncStorage.setItem(key, jsonData);
        console.log(`💾 [SAVE] Sauvegardé clé principale: ${key}`);
        
        // 2. Backup global sans userId (pour récupération)
        const backupKey = `gal_backup_${characterId}`;
        await AsyncStorage.setItem(backupKey, jsonData);
        console.log(`💾 [SAVE] Sauvegardé backup: ${backupKey}`);
        
        // 3. Backup avec clé simple (fallback ultime)
        const simpleKey = `gallery_${characterId}`;
        await AsyncStorage.setItem(simpleKey, jsonData);
        console.log(`💾 [SAVE] Sauvegardé simple: ${simpleKey}`);
        
        // 4. Vérification immédiate
        const verify = await AsyncStorage.getItem(key);
        if (!verify) {
          console.error('❌ [SAVE] ÉCHEC vérification! Réessai...');
          await AsyncStorage.setItem(key, jsonData);
          const verify2 = await AsyncStorage.getItem(key);
          if (verify2) {
            console.log('✅ [SAVE] Réessai réussi');
          } else {
            console.error('❌ [SAVE] Réessai échoué aussi!');
          }
        } else {
          const verifyParsed = JSON.parse(verify);
          console.log(`✅ [SAVE] Vérification OK: ${verifyParsed.length} images en galerie`);
        }
        
        // Télécharger en ARRIÈRE-PLAN (ne bloque pas)
        this.downloadInBackground(characterId, imageUrl, seed, key, gallery);
      } else {
        console.log(`ℹ️ [SAVE] Image déjà en galerie: seed=${seed}`);
      }
      
      return imageUrl;
    } catch (error) {
      console.error('❌ [SAVE] Erreur:', error.message);
      // v5.4.58 - Tentative de sauvegarde de secours
      try {
        const fallbackKey = `gal_fallback_${characterId}`;
        const simpleData = JSON.stringify([{ url: imageUrl, savedAt: Date.now(), characterId }]);
        await AsyncStorage.setItem(fallbackKey, simpleData);
        console.log('⚠️ [SAVE] Sauvegarde secours effectuée:', fallbackKey);
        return imageUrl;
      } catch (e2) {
        console.error('❌ [SAVE] Échec sauvegarde secours:', e2.message);
      }
      return null;
    }
  }
  
  /**
   * Télécharge une image en arrière-plan et met à jour la galerie
   * v5.3.15: Ne bloque pas la sauvegarde initiale
   */
  async downloadInBackground(characterId, imageUrl, seed, key, gallery) {
    try {
      const downloadResult = await this.downloadAndSaveImage(imageUrl, characterId, seed);
      
      if (downloadResult.success) {
        // Mettre à jour l'entrée dans la galerie avec le chemin local
        const itemIndex = gallery.findIndex(item => item.seed === seed);
        if (itemIndex !== -1) {
          gallery[itemIndex].localPath = downloadResult.localPath;
          gallery[itemIndex].isLocal = true;
          await AsyncStorage.setItem(key, JSON.stringify(gallery));
          console.log(`✅ Image téléchargée en arrière-plan: ${seed}`);
        }
      } else {
        console.log(`⚠️ Téléchargement arrière-plan échoué pour seed=${seed}`);
      }
    } catch (error) {
      console.log(`⚠️ Erreur téléchargement arrière-plan: ${error.message}`);
    }
  }

  async getGallery(characterId) {
    console.log(`📸 [GET] Chargement galerie pour: ${characterId}`);
    
    try {
      if (!characterId) {
        console.error('❌ [GET] characterId manquant');
        return [];
      }
      
      const userId = await this.getCurrentUserId();
      const key = `gal_${userId}_${characterId}`;
      console.log(`🔑 [GET] Clé galerie: ${key}`);
      
      let data = await AsyncStorage.getItem(key);
      
      // v5.4.58 - Si pas de données, essayer TOUTES les clés de backup
      if (!data) {
        console.log(`⚠️ [GET] Pas de données pour ${key}, essai backups...`);
        
        const backupKeys = [
          `gal_backup_${characterId}`,
          `gal_fallback_${characterId}`,
          `gallery_${characterId}`,
        ];
        
        // Aussi essayer avec d'autres userId possibles
        const deviceId = await AsyncStorage.getItem('device_user_id');
        if (deviceId && deviceId !== userId) {
          backupKeys.push(`gal_${deviceId}_${characterId}`);
        }
        backupKeys.push(`gal_default_${characterId}`);
        backupKeys.push(`gal_gallery_default_${characterId}`);
        
        for (const backupKey of backupKeys) {
          try {
            const backupData = await AsyncStorage.getItem(backupKey);
            if (backupData) {
              console.log(`🔄 [GET] Galerie récupérée depuis: ${backupKey}`);
              data = backupData;
              // Migrer vers la clé principale
              await AsyncStorage.setItem(key, data);
              break;
            }
          } catch (e) {
            // Continuer avec les autres backups
          }
        }
      }
      
      if (data) {
        let gallery;
        try {
          gallery = JSON.parse(data);
        } catch (parseError) {
          console.error('❌ [GET] Erreur parsing galerie:', parseError.message);
          return [];
        }
        
        // v5.4.58 - Vérifier que gallery est un tableau
        if (!Array.isArray(gallery)) {
          console.error('❌ [GET] Galerie n\'est pas un tableau, type:', typeof gallery);
          return [];
        }
        
        console.log(`📂 [GET] Galerie brute: ${gallery.length} items`);
        
        const result = [];
        
        // v5.4.58: Amélioration du chargement - toujours fournir une URL valide
        for (let i = 0; i < gallery.length; i++) {
          const item = gallery[i];
          try {
            if (typeof item === 'string') {
              // Ancien format string
              if (item && (item.startsWith('http') || item.startsWith('file'))) {
                result.push(item);
              }
            } else if (item && typeof item === 'object') {
              // Nouveau format objet - priorité à l'URL pour affichage rapide
              if (item.url && item.url.startsWith('http')) {
                result.push(item.url);
              } else if (item.localPath) {
                // Vérifier si le fichier local existe
                const exists = await this.checkLocalFile(item.localPath);
                if (exists) {
                  result.push(item.localPath);
                }
              }
            }
          } catch (itemError) {
            console.log(`⚠️ [GET] Erreur item ${i}:`, itemError.message);
          }
        }
        
        console.log(`✅ [GET] Galerie finale: ${result.length}/${gallery.length} images valides`);
        return result;
      }
      
      console.log(`ℹ️ [GET] Galerie vide pour ${characterId}`);
      return [];
    } catch (error) {
      console.error('❌ [GET] Erreur:', error.message);
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
