import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

/**
 * Service de synchronisation simplifié
 * Gère uniquement:
 * - Sauvegardes de compte utilisateur
 * - Images partagées entre utilisateurs
 * 
 * Tout le reste (génération de texte, génération d'image) est intégré dans l'APK
 */
class SimpleSyncService {
  constructor() {
    this.baseUrl = 'http://82.65.75.176:33437';
    this.userId = null;
    this.lastSync = null;
  }

  /**
   * Initialise le service et récupère l'ID utilisateur
   */
  async init() {
    try {
      let userId = await AsyncStorage.getItem('sync_user_id');
      if (!userId) {
        userId = this.generateUserId();
        await AsyncStorage.setItem('sync_user_id', userId);
      }
      this.userId = userId;

      const lastSync = await AsyncStorage.getItem('sync_last_time');
      this.lastSync = lastSync ? parseInt(lastSync) : null;

      console.log('✅ SimpleSyncService initialisé, userId:', this.userId);
      return true;
    } catch (error) {
      console.error('❌ Erreur init SimpleSyncService:', error);
      return false;
    }
  }

  generateUserId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `user_${timestamp}_${random}`;
  }

  /**
   * Sauvegarde le compte utilisateur sur le serveur
   */
  async saveAccount(accountData) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/account/save`,
        {
          user_id: this.userId,
          ...accountData
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );

      if (response.data.success) {
        await AsyncStorage.setItem('sync_last_time', Date.now().toString());
        console.log('✅ Compte sauvegardé sur serveur');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur sauvegarde compte:', error);
      return false;
    }
  }

  /**
   * Charge le compte utilisateur depuis le serveur
   */
  async loadAccount() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/account/load?user_id=${this.userId}`,
        { timeout: 10000 }
      );

      if (response.data.success && response.data.account) {
        console.log('✅ Compte chargé depuis serveur');
        return response.data.account;
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur chargement compte:', error);
      return null;
    }
  }

  /**
   * Partage une image générée
   */
  async shareImage(imageData) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/images/share`,
        {
          user_id: this.userId,
          ...imageData
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );

      if (response.data.success) {
        console.log('✅ Image partagée sur serveur');
        return response.data.image_id;
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur partage image:', error);
      return null;
    }
  }

  /**
   * Charge les images partagées
   * Admin voit toutes les images, utilisateur voit seulement ses images
   */
  async loadSharedImages(isAdmin = false) {
    try {
      const params = isAdmin ? {} : { user_id: this.userId };
      const response = await axios.get(
        `${this.baseUrl}/api/images/shared`,
        { params, timeout: 10000 }
      );

      if (response.data.success && response.data.images) {
        console.log(`✅ ${response.data.images.length} images chargées (${isAdmin ? 'admin' : 'user'})`);
        return response.data.images;
      }
      return [];
    } catch (error) {
      console.error('❌ Erreur chargement images partagées:', error);
      return [];
    }
  }

  /**
   * Charge les images de l'utilisateur courant
   */
  async loadUserImages() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/images/user/${this.userId}`,
        { timeout: 10000 }
      );

      if (response.data.success && response.data.images) {
        console.log(`✅ ${response.data.images.length} images utilisateur chargées`);
        return response.data.images;
      }
      return [];
    } catch (error) {
      console.error('❌ Erreur chargement images utilisateur:', error);
      return [];
    }
  }

  /**
   * Vérifie si le serveur est en ligne
   */
  async checkServerStatus() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/health`,
        { timeout: 5000 }
      );
      return response.data.status === 'ok';
    } catch (error) {
      console.error('❌ Serveur hors ligne');
      return false;
    }
  }

  /**
   * Retourne le statut de synchronisation
   */
  getSyncStatus() {
    return {
      userId: this.userId,
      lastSync: this.lastSync,
      serverOnline: true // À vérifier avec checkServerStatus()
    };
  }
}

export default new SimpleSyncService();
