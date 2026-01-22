/**
 * AppUserManager - Gestionnaire d'ID utilisateur AUTONOME
 * v5.4.65 - Module INDÉPENDANT sans aucune dépendance sur d'autres services
 * 
 * Ce module est la SOURCE UNIQUE de vérité pour l'ID utilisateur.
 * Tous les autres services DOIVENT utiliser ce module.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ========== CONSTANTES ==========
const STORAGE_KEY = 'app_unique_user_id';
const LEGACY_KEY = 'device_user_id';
const BACKUP_KEY = 'app_user_backup';

// ========== ÉTAT GLOBAL ==========
let cachedUserId = null;
let initPromise = null;

/**
 * Génère un nouvel ID utilisateur unique
 */
function generateNewUserId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 12);
  return `user_${timestamp}_${random}`;
}

/**
 * Initialise et retourne l'ID utilisateur
 * Cette fonction est IDEMPOTENTE - peut être appelée plusieurs fois sans effet secondaire
 */
async function initializeUserId() {
  console.log('🔑 [AppUserManager] Initialisation ID utilisateur...');
  
  try {
    // 1. Essayer la clé principale
    let userId = await AsyncStorage.getItem(STORAGE_KEY);
    
    if (userId) {
      console.log(`✅ [AppUserManager] ID trouvé (principal): ${userId}`);
      cachedUserId = userId;
      return userId;
    }
    
    // 2. Essayer le backup
    userId = await AsyncStorage.getItem(BACKUP_KEY);
    if (userId) {
      console.log(`✅ [AppUserManager] ID trouvé (backup): ${userId}`);
      // Restaurer vers la clé principale
      await AsyncStorage.setItem(STORAGE_KEY, userId);
      cachedUserId = userId;
      return userId;
    }
    
    // 3. Essayer la clé legacy
    userId = await AsyncStorage.getItem(LEGACY_KEY);
    if (userId) {
      console.log(`✅ [AppUserManager] ID trouvé (legacy): ${userId}`);
      // Migrer vers les nouvelles clés
      await AsyncStorage.setItem(STORAGE_KEY, userId);
      await AsyncStorage.setItem(BACKUP_KEY, userId);
      cachedUserId = userId;
      return userId;
    }
    
    // 4. Aucun ID trouvé - en créer un nouveau
    userId = generateNewUserId();
    console.log(`🆕 [AppUserManager] Nouvel ID créé: ${userId}`);
    
    // Sauvegarder dans les deux clés
    await AsyncStorage.setItem(STORAGE_KEY, userId);
    await AsyncStorage.setItem(BACKUP_KEY, userId);
    
    cachedUserId = userId;
    return userId;
    
  } catch (error) {
    console.error('❌ [AppUserManager] Erreur initialisation:', error);
    
    // Fallback d'urgence - utiliser un ID en mémoire seulement
    if (!cachedUserId) {
      cachedUserId = generateNewUserId();
      console.log(`⚠️ [AppUserManager] Fallback mémoire: ${cachedUserId}`);
      
      // Tenter quand même de sauvegarder
      try {
        await AsyncStorage.setItem(STORAGE_KEY, cachedUserId);
        await AsyncStorage.setItem(BACKUP_KEY, cachedUserId);
      } catch (e) {
        console.error('❌ [AppUserManager] Impossible de sauvegarder:', e);
      }
    }
    
    return cachedUserId;
  }
}

/**
 * Obtient l'ID utilisateur (API publique principale)
 * Utilise un cache pour éviter les appels AsyncStorage répétés
 * Garantit qu'un seul processus d'initialisation est en cours à la fois
 */
export async function getUserId() {
  // Si déjà en cache, retourner immédiatement
  if (cachedUserId) {
    return cachedUserId;
  }
  
  // Si une initialisation est déjà en cours, attendre sa complétion
  if (initPromise) {
    return await initPromise;
  }
  
  // Démarrer l'initialisation (une seule fois)
  initPromise = initializeUserId();
  
  try {
    const userId = await initPromise;
    return userId;
  } finally {
    initPromise = null;
  }
}

/**
 * Retourne l'ID en cache (peut être null si pas encore initialisé)
 * Utile pour les logs synchrones
 */
export function getUserIdSync() {
  return cachedUserId;
}

/**
 * Force le rechargement de l'ID depuis AsyncStorage
 * À utiliser après login/logout
 */
export async function refreshUserId() {
  console.log('🔄 [AppUserManager] Rafraîchissement ID...');
  cachedUserId = null;
  initPromise = null;
  return await getUserId();
}

/**
 * Réinitialise complètement l'ID (crée un nouvel ID)
 * ATTENTION: Cela causera la perte de toutes les données associées à l'ancien ID
 */
export async function resetUserId() {
  console.log('⚠️ [AppUserManager] RESET ID...');
  cachedUserId = null;
  initPromise = null;
  
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(BACKUP_KEY);
  } catch (e) {}
  
  return await getUserId();
}

/**
 * Debug: Affiche toutes les informations sur l'ID
 */
export async function debugUserIdInfo() {
  const info = {
    cached: cachedUserId,
    storage_key: await AsyncStorage.getItem(STORAGE_KEY).catch(() => null),
    backup_key: await AsyncStorage.getItem(BACKUP_KEY).catch(() => null),
    legacy_key: await AsyncStorage.getItem(LEGACY_KEY).catch(() => null),
  };
  console.log('📋 [AppUserManager] Debug Info:', JSON.stringify(info, null, 2));
  return info;
}

// Pré-initialiser au chargement du module
getUserId().catch(e => console.error('❌ [AppUserManager] Pré-init échouée:', e));

export default {
  getUserId,
  getUserIdSync,
  refreshUserId,
  resetUserId,
  debugUserIdInfo,
};
