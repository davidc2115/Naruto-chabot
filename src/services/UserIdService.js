/**
 * Service centralisé pour l'ID utilisateur
 * v5.4.60 - Source UNIQUE de vérité pour l'ID utilisateur
 * Utilisé par StorageService ET GalleryService
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ID en mémoire - ne change JAMAIS une fois défini
let CACHED_USER_ID = null;

const UserIdService = {
  /**
   * Récupère l'ID utilisateur unique et persistant
   * TOUJOURS le même ID pour toute la session
   */
  async getUserId() {
    // Si on a déjà un ID en mémoire, le retourner immédiatement
    if (CACHED_USER_ID) {
      return CACHED_USER_ID;
    }

    try {
      // Récupérer depuis AsyncStorage (persistant)
      let deviceId = await AsyncStorage.getItem('device_user_id');
      
      if (deviceId) {
        CACHED_USER_ID = deviceId;
        console.log('🔑 [UserID] ID existant:', deviceId);
        return deviceId;
      }

      // Créer un nouvel ID unique
      deviceId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      
      // Sauvegarder immédiatement
      await AsyncStorage.setItem('device_user_id', deviceId);
      CACHED_USER_ID = deviceId;
      
      console.log('📱 [UserID] Nouvel ID créé:', deviceId);
      return deviceId;
    } catch (error) {
      console.error('❌ [UserID] Erreur:', error);
      // Fallback en mémoire si AsyncStorage échoue
      if (!CACHED_USER_ID) {
        CACHED_USER_ID = 'temp_' + Date.now();
      }
      return CACHED_USER_ID;
    }
  },

  /**
   * Retourne l'ID en cache (synchrone) - peut être null si pas encore initialisé
   */
  getCachedId() {
    return CACHED_USER_ID;
  },

  /**
   * Force la réinitialisation de l'ID (pour debug uniquement)
   */
  async resetId() {
    CACHED_USER_ID = null;
    await AsyncStorage.removeItem('device_user_id');
    console.log('🔄 [UserID] ID réinitialisé');
  }
};

export default UserIdService;
