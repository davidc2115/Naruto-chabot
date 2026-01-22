import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service de stockage des conversations
 * v5.4.64 - CORRECTION CRITIQUE: ID utilisateur unique et synchronisé
 * 
 * PROBLÈME RÉSOLU: Condition de concurrence où StorageService et GalleryService
 * créaient des device_user_id différents, causant la perte des données
 */

// ========== ID UTILISATEUR GLOBAL ==========
// Variable globale partagée - UNE SEULE source de vérité
let GLOBAL_APP_USER_ID = null;

/**
 * Obtient l'ID utilisateur de façon SYNCHRONE si disponible
 * Ou ASYNCHRONE si première fois
 */
export async function getAppUserId() {
  // Si déjà en mémoire, retourner immédiatement
  if (GLOBAL_APP_USER_ID) {
    return GLOBAL_APP_USER_ID;
  }
  
  try {
    // Essayer de charger depuis AsyncStorage
    let deviceId = await AsyncStorage.getItem('app_user_id');
    
    if (!deviceId) {
      // Migrer depuis l'ancien format si existe
      deviceId = await AsyncStorage.getItem('device_user_id');
      
      if (!deviceId) {
        // Créer un nouvel ID UNIQUE
        deviceId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        console.log('📱 NOUVEL ID créé:', deviceId);
      }
      
      // Sauvegarder avec la nouvelle clé
      await AsyncStorage.setItem('app_user_id', deviceId);
    }
    
    // Mettre en cache global
    GLOBAL_APP_USER_ID = deviceId;
    console.log('📱 ID utilisateur chargé:', deviceId);
    return deviceId;
    
  } catch (error) {
    console.error('❌ Erreur getAppUserId:', error);
    // Fallback d'urgence
    if (!GLOBAL_APP_USER_ID) {
      GLOBAL_APP_USER_ID = 'fallback_user';
    }
    return GLOBAL_APP_USER_ID;
  }
}

/**
 * Retourne l'ID de façon synchrone (peut être null si pas encore initialisé)
 */
export function getAppUserIdSync() {
  return GLOBAL_APP_USER_ID;
}

/**
 * Force le rechargement de l'ID (après login/logout)
 */
export function resetAppUserId() {
  GLOBAL_APP_USER_ID = null;
}

// ========== STORAGE SERVICE ==========

class StorageService {
  constructor() {
    // Initialiser l'ID au démarrage
    this._initPromise = this._init();
  }

  async _init() {
    try {
      await getAppUserId();
    } catch (e) {
      console.log('⚠️ Init ID différé');
    }
  }

  /**
   * Récupère l'ID de l'utilisateur courant
   * v5.4.64 - Utilise le système global unifié
   */
  async getCurrentUserId() {
    return await getAppUserId();
  }

  /**
   * Réinitialise le cache utilisateur (appelé lors du logout/login)
   */
  resetUserCache() {
    resetAppUserId();
    console.log('🔄 Cache utilisateur réinitialisé');
  }

  // ========== CONVERSATIONS ==========

  /**
   * Sauvegarde une conversation
   * v5.4.64 - Sauvegarde ultra-robuste avec triple backup
   */
  async saveConversation(characterId, messages, relationship) {
    try {
      if (!characterId) {
        console.error('❌ saveConversation: characterId manquant!');
        return;
      }
      
      const userId = await this.getCurrentUserId();
      console.log(`💾 SAVE: userId=${userId}, charId=${characterId}, msgs=${messages?.length || 0}`);
      
      // Retirer de la liste des conversations supprimées
      try {
        const deletedKey = `deleted_conversations_${userId}`;
        const deletedData = await AsyncStorage.getItem(deletedKey);
        if (deletedData) {
          const deletedList = JSON.parse(deletedData);
          const charIdStr = String(characterId);
          if (deletedList.includes(charIdStr)) {
            const newDeletedList = deletedList.filter(id => id !== charIdStr);
            await AsyncStorage.setItem(deletedKey, JSON.stringify(newDeletedList));
          }
        }
      } catch (e) {}
      
      // Données à sauvegarder
      const data = {
        characterId: String(characterId),
        userId,
        messages: messages || [],
        relationship: relationship || { level: 1, affection: 50, trust: 50 },
        lastUpdated: new Date().toISOString(),
        savedAt: Date.now(),
        version: '5.4.64',
      };
      
      const jsonData = JSON.stringify(data);
      
      // TRIPLE SAUVEGARDE
      const key = `conv_${userId}_${characterId}`;
      
      // 1. Clé principale
      await AsyncStorage.setItem(key, jsonData);
      
      // 2. Backup global (sans userId)
      await AsyncStorage.setItem(`conv_backup_${characterId}`, jsonData);
      
      // 3. Backup simple
      await AsyncStorage.setItem(`conv_simple_${characterId}`, jsonData);
      
      // Vérification
      const verify = await AsyncStorage.getItem(key);
      if (verify) {
        console.log(`✅ SAVE OK: ${key} (${messages?.length || 0} msgs)`);
      } else {
        console.error(`❌ SAVE FAILED: ${key}`);
        // Retry
        await AsyncStorage.setItem(key, jsonData);
      }
      
      // Mettre à jour l'index
      try {
        const indexKey = `conv_index_${userId}`;
        let index = [];
        const indexData = await AsyncStorage.getItem(indexKey);
        if (indexData) index = JSON.parse(indexData);
        const charIdStr = String(characterId);
        if (!index.includes(charIdStr)) {
          index.push(charIdStr);
          await AsyncStorage.setItem(indexKey, JSON.stringify(index));
        }
      } catch (e) {}
      
    } catch (error) {
      console.error('❌ Error saving conversation:', error);
      // Sauvegarde d'urgence
      try {
        await AsyncStorage.setItem(`conv_emergency_${characterId}`, JSON.stringify({
          characterId: String(characterId),
          messages: messages || [],
          relationship: relationship || { level: 1, affection: 50, trust: 50 },
          savedAt: Date.now(),
        }));
      } catch (e2) {}
    }
  }

  /**
   * Charge une conversation
   * v5.4.64 - Recherche multi-clés robuste
   */
  async loadConversation(characterId) {
    try {
      if (!characterId) {
        console.log('⚠️ loadConversation: characterId manquant');
        return null;
      }
      
      const userId = await this.getCurrentUserId();
      console.log(`📖 LOAD: userId=${userId}, charId=${characterId}`);
      
      // Ordre de priorité des clés à essayer
      const keysToTry = [
        `conv_${userId}_${characterId}`,     // Clé principale
        `conv_backup_${characterId}`,        // Backup global
        `conv_simple_${characterId}`,        // Backup simple
        `conv_fallback_${characterId}`,      // Legacy
        `conv_emergency_${characterId}`,     // Emergency
        `conv_default_${characterId}`,       // Default
        `conversation_${characterId}`,       // Très ancien
      ];
      
      for (const key of keysToTry) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            if (parsed.messages && parsed.messages.length > 0) {
              console.log(`✅ LOAD OK: ${key} (${parsed.messages.length} msgs)`);
              
              // Sauvegarder avec la clé principale si trouvé ailleurs
              if (key !== keysToTry[0]) {
                await this.saveConversation(characterId, parsed.messages, parsed.relationship);
              }
              
              return parsed;
            }
          }
        } catch (e) {}
      }
      
      console.log(`ℹ️ Aucune conversation trouvée pour ${characterId}`);
      return null;
      
    } catch (error) {
      console.error('Error loading conversation:', error);
      return null;
    }
  }

  /**
   * Récupère toutes les conversations
   */
  async getAllConversations() {
    try {
      const userId = await this.getCurrentUserId();
      const result = [];
      const seenCharacterIds = new Set();
      
      console.log(`🔍 Recherche conversations pour userId: ${userId}`);
      
      // Charger la liste des conversations supprimées
      let deletedIds = [];
      try {
        const deletedKey = `deleted_conversations_${userId}`;
        const deletedData = await AsyncStorage.getItem(deletedKey);
        if (deletedData) deletedIds = JSON.parse(deletedData);
      } catch (e) {}
      
      // Chercher toutes les clés de conversations
      const keys = await AsyncStorage.getAllKeys();
      const convKeys = keys.filter(key => {
        if (key.includes('index') || key.includes('deleted')) return false;
        if (key.startsWith(`conv_${userId}_`)) return true;
        if (key.startsWith('conv_backup_')) return true;
        if (key.startsWith('conv_simple_')) return true;
        if (key.startsWith('conv_fallback_')) return true;
        if (key.startsWith('conv_emergency_')) return true;
        if (key.startsWith('conversation_')) return true;
        return false;
      });
      
      for (const key of convKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (!value) continue;
          
          const parsed = JSON.parse(value);
          let messages = parsed.messages || parsed.history;
          
          if (!Array.isArray(messages) || messages.length === 0) continue;
          
          // Extraire characterId
          let characterId = parsed.characterId;
          if (!characterId && key.includes('_')) {
            const parts = key.split('_');
            if (parts.length >= 2) {
              characterId = parts[parts.length - 1];
            }
          }
          
          if (!characterId) continue;
          
          const charIdStr = String(characterId);
          
          // Ignorer les supprimées
          if (deletedIds.includes(charIdStr)) continue;
          
          // Éviter les doublons
          if (seenCharacterIds.has(charIdStr)) continue;
          seenCharacterIds.add(charIdStr);
          
          // Normaliser les messages
          const normalizedMessages = messages
            .filter(m => m && m.content)
            .map(m => ({
              role: m.role || 'assistant',
              content: String(m.content || '').trim(),
            }))
            .filter(m => m.content !== '');
          
          if (normalizedMessages.length > 0) {
            result.push({
              characterId: charIdStr,
              messages: normalizedMessages,
              relationship: parsed.relationship || { level: 1, affection: 50 },
              lastUpdated: parsed.lastUpdated || new Date().toISOString(),
              savedAt: parsed.savedAt || Date.now(),
            });
          }
        } catch (e) {}
      }
      
      // Trier par date
      result.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
      
      console.log(`✅ TOTAL: ${result.length} conversations chargées`);
      return result;
      
    } catch (error) {
      console.error('❌ Error loading all conversations:', error);
      return [];
    }
  }

  /**
   * Force le rechargement de toutes les conversations
   */
  async refreshConversations() {
    return await this.getAllConversations();
  }

  /**
   * Supprime une conversation
   */
  async deleteConversation(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const charIdStr = String(characterId);
      
      console.log(`🗑️ Suppression conversation: ${characterId}`);
      
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Supprimer uniquement les clés de conversation
      const keysToDelete = allKeys.filter(key => {
        if (key.includes('gallery')) return false;
        if (key.includes('gal_')) return false;
        if (key.startsWith('conv_') && key.includes(charIdStr)) return true;
        if (key.startsWith('conversation_') && key.includes(charIdStr)) return true;
        return false;
      });
      
      for (const key of keysToDelete) {
        await AsyncStorage.removeItem(key);
      }
      
      // Ajouter à la liste des suppressions
      try {
        const deletedKey = `deleted_conversations_${userId}`;
        let deleted = [];
        const deletedData = await AsyncStorage.getItem(deletedKey);
        if (deletedData) deleted = JSON.parse(deletedData);
        if (!deleted.includes(charIdStr)) {
          deleted.push(charIdStr);
          await AsyncStorage.setItem(deletedKey, JSON.stringify(deleted));
        }
      } catch (e) {}
      
      console.log(`✅ Conversation ${characterId} supprimée`);
      return true;
      
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
      return false;
    }
  }

  /**
   * Vérifie si une conversation a été supprimée
   */
  async isConversationDeleted(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const deletedKey = `deleted_conversations_${userId}`;
      const deletedData = await AsyncStorage.getItem(deletedKey);
      if (deletedData) {
        const deleted = JSON.parse(deletedData);
        return deleted.includes(String(characterId));
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // ========== RELATIONSHIP ==========

  async saveRelationship(characterId, relationship) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `rel_${userId}_${characterId}`;
      await AsyncStorage.setItem(key, JSON.stringify(relationship));
    } catch (error) {
      console.error('Error saving relationship:', error);
    }
  }

  async loadRelationship(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `rel_${userId}_${characterId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        return JSON.parse(data);
      }
      
      // Migration ancienne clé
      const oldKey = `relationship_${characterId}`;
      const oldData = await AsyncStorage.getItem(oldKey);
      if (oldData) {
        const parsed = JSON.parse(oldData);
        await this.saveRelationship(characterId, parsed);
        return parsed;
      }
      
      return this.getDefaultRelationship();
    } catch (error) {
      return this.getDefaultRelationship();
    }
  }

  getDefaultRelationship() {
    return {
      experience: 0,
      level: 1,
      affection: 50,
      trust: 50,
      interactions: 0,
    };
  }

  calculateRelationshipChange(message, character) {
    const messageLength = message.length;
    const baseExp = Math.min(15, Math.floor(messageLength / 30) + 1);
    
    let affectionChange = 0;
    let trustChange = 0;

    const affectionPositive = ['merci', 'super', 'génial', 'aime', 'adore', 'parfait', 'excellent', 'magnifique', 'belle', 'beau', 'sexy', 'attirant', 'désir', 'envie', 'plaisir', 'heureux', 'heureuse', 'content', 'contente', 'bisou', 'câlin', 'embrasse', 'caresse', 'tendresse', 'doux', 'douce'];
    const affectionNegative = ['déteste', 'moche', 'laid', 'horrible', 'dégoûtant', 'ennuyeux', 'chiant', 'nul', 'nulle'];
    const trustPositive = ['confiance', 'honnête', 'promis', 'jure', 'vérité', 'sincère', 'sérieux', 'fidèle', 'respecte', 'protège', 'soutien', 'aide', 'comprends', 'écoute'];
    const trustNegative = ['menteur', 'menteuse', 'triche', 'trahis', 'abandonne', 'ignore', 'méprise'];
    const intimateWords = ['embrasse', 'caresse', 'déshabille', 'touche', 'corps', 'peau', 'lèvres', 'baiser', 'lit', 'nuit', 'ensemble', 'proche', 'intime'];
    
    const lowerMessage = message.toLowerCase();
    
    affectionPositive.forEach(word => {
      if (lowerMessage.includes(word)) affectionChange += 3;
    });
    affectionNegative.forEach(word => {
      if (lowerMessage.includes(word)) affectionChange -= 4;
    });
    
    trustPositive.forEach(word => {
      if (lowerMessage.includes(word)) trustChange += 3;
    });
    trustNegative.forEach(word => {
      if (lowerMessage.includes(word)) trustChange -= 5;
    });
    
    intimateWords.forEach(word => {
      if (lowerMessage.includes(word)) {
        affectionChange += 2;
        trustChange += 1;
      }
    });

    const temperament = (character.temperament || character.personality || '').toLowerCase();
    
    if (temperament.includes('timide') || temperament.includes('shy')) {
      trustChange = Math.floor(trustChange * 0.5);
      affectionChange = Math.floor(affectionChange * 1.3);
    } else if (temperament.includes('direct') || temperament.includes('bold')) {
      trustChange = Math.floor(trustChange * 1.5);
    } else if (temperament.includes('séducteur') || temperament.includes('séductrice')) {
      affectionChange = Math.floor(affectionChange * 1.5);
    } else if (temperament.includes('dominant')) {
      trustChange = Math.floor(trustChange * 1.2);
      affectionChange = Math.floor(affectionChange * 0.8);
    } else if (temperament.includes('soumis')) {
      affectionChange = Math.floor(affectionChange * 1.5);
      trustChange = Math.floor(trustChange * 1.2);
    } else if (temperament.includes('passionné')) {
      affectionChange = Math.floor(affectionChange * 1.8);
      trustChange = Math.floor(trustChange * 1.3);
    }
    
    affectionChange += 1;
    trustChange += 1;
    
    affectionChange = Math.max(-10, Math.min(15, affectionChange));
    trustChange = Math.max(-10, Math.min(15, trustChange));

    return {
      expGain: baseExp,
      affectionChange,
      trustChange,
    };
  }
}

export default new StorageService();
