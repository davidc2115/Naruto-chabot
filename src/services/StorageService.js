/**
 * StorageService - Gestion du stockage des conversations
 * v5.4.65 - RÉÉCRITURE COMPLÈTE avec AppUserManager
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserId } from './AppUserManager';

class StorageService {
  constructor() {
    console.log('📦 [StorageService] Initialisé');
  }

  /**
   * Récupère l'ID utilisateur via AppUserManager
   */
  async getCurrentUserId() {
    const userId = await getUserId();
    console.log(`🔑 [StorageService] userId: ${userId}`);
    return userId;
  }

  /**
   * SAUVEGARDE DE CONVERSATION - Ultra-robuste avec logs détaillés
   */
  async saveConversation(characterId, messages, relationship) {
    const startTime = Date.now();
    console.log(`\n========== SAVE CONVERSATION START ==========`);
    console.log(`📝 characterId: ${characterId}`);
    console.log(`📝 messages: ${messages?.length || 0}`);
    console.log(`📝 relationship level: ${relationship?.level || 1}`);
    
    try {
      // Validation
      if (!characterId) {
        console.error('❌ [SAVE] characterId MANQUANT!');
        return false;
      }
      
      if (!messages || !Array.isArray(messages)) {
        console.error('❌ [SAVE] messages INVALIDE!');
        return false;
      }
      
      const userId = await this.getCurrentUserId();
      if (!userId) {
        console.error('❌ [SAVE] userId MANQUANT!');
        return false;
      }
      
      // Nettoyer la liste des suppressions
      await this._removeFromDeleted(userId, characterId);
      
      // Préparer les données
      const data = {
        characterId: String(characterId),
        userId,
        messages: messages,
        relationship: relationship || { level: 1, affection: 50, trust: 50 },
        lastUpdated: new Date().toISOString(),
        savedAt: Date.now(),
        version: '5.4.65',
      };
      
      const jsonData = JSON.stringify(data);
      console.log(`📦 [SAVE] Taille données: ${jsonData.length} bytes`);
      
      // QUADRUPLE SAUVEGARDE
      const keys = [
        `conv_${userId}_${characterId}`,
        `conv_backup_${characterId}`,
        `conv_global_${characterId}`,
        `conversation_${characterId}`,
      ];
      
      let saveCount = 0;
      for (const key of keys) {
        try {
          await AsyncStorage.setItem(key, jsonData);
          console.log(`✅ [SAVE] Sauvegardé: ${key}`);
          saveCount++;
        } catch (keyError) {
          console.error(`❌ [SAVE] Échec ${key}:`, keyError.message);
        }
      }
      
      // Vérification immédiate
      const verifyKey = keys[0];
      const verification = await AsyncStorage.getItem(verifyKey);
      if (verification) {
        const parsed = JSON.parse(verification);
        console.log(`✅ [SAVE] Vérification OK: ${parsed.messages?.length || 0} messages`);
      } else {
        console.error(`❌ [SAVE] Vérification ÉCHOUÉE!`);
      }
      
      // Mettre à jour l'index
      await this._updateIndex(userId, characterId);
      
      const duration = Date.now() - startTime;
      console.log(`✅ [SAVE] Terminé en ${duration}ms (${saveCount}/4 sauvegardes)`);
      console.log(`========== SAVE CONVERSATION END ==========\n`);
      
      return saveCount > 0;
      
    } catch (error) {
      console.error('❌ [SAVE] EXCEPTION:', error);
      console.error('❌ [SAVE] Stack:', error.stack);
      
      // Sauvegarde d'urgence
      try {
        const emergencyKey = `conv_emergency_${characterId}`;
        await AsyncStorage.setItem(emergencyKey, JSON.stringify({
          characterId: String(characterId),
          messages: messages || [],
          relationship: relationship || { level: 1 },
          savedAt: Date.now(),
          emergency: true,
        }));
        console.log(`⚠️ [SAVE] Sauvegarde d'urgence: ${emergencyKey}`);
      } catch (e2) {
        console.error('❌ [SAVE] Même urgence a échoué:', e2.message);
      }
      
      console.log(`========== SAVE CONVERSATION END (ERROR) ==========\n`);
      return false;
    }
  }

  /**
   * CHARGEMENT DE CONVERSATION - Recherche multi-clés
   */
  async loadConversation(characterId) {
    console.log(`\n========== LOAD CONVERSATION START ==========`);
    console.log(`📝 characterId: ${characterId}`);
    
    try {
      if (!characterId) {
        console.error('❌ [LOAD] characterId MANQUANT!');
        return null;
      }
      
      const userId = await this.getCurrentUserId();
      console.log(`🔑 [LOAD] userId: ${userId}`);
      
      // Liste des clés à essayer (ordre de priorité)
      const keysToTry = [
        `conv_${userId}_${characterId}`,
        `conv_backup_${characterId}`,
        `conv_global_${characterId}`,
        `conversation_${characterId}`,
        `conv_emergency_${characterId}`,
        `conv_fallback_${characterId}`,
        `conv_default_${characterId}`,
      ];
      
      for (const key of keysToTry) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            if (parsed.messages && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
              console.log(`✅ [LOAD] Trouvé: ${key} (${parsed.messages.length} messages)`);
              
              // Si trouvé dans une clé alternative, sauvegarder vers la clé principale
              if (key !== keysToTry[0]) {
                console.log(`🔄 [LOAD] Migration vers clé principale...`);
                // Ne pas await pour ne pas bloquer
                this.saveConversation(characterId, parsed.messages, parsed.relationship).catch(() => {});
              }
              
              console.log(`========== LOAD CONVERSATION END ==========\n`);
              return parsed;
            }
          }
        } catch (keyError) {
          console.log(`⚠️ [LOAD] Erreur ${key}:`, keyError.message);
        }
      }
      
      // Aucune conversation trouvée
      console.log(`ℹ️ [LOAD] Aucune conversation trouvée pour ${characterId}`);
      console.log(`========== LOAD CONVERSATION END ==========\n`);
      return null;
      
    } catch (error) {
      console.error('❌ [LOAD] EXCEPTION:', error);
      console.log(`========== LOAD CONVERSATION END (ERROR) ==========\n`);
      return null;
    }
  }

  /**
   * Supprime un characterId de la liste des conversations supprimées
   */
  async _removeFromDeleted(userId, characterId) {
    try {
      const deletedKey = `deleted_conversations_${userId}`;
      const deletedData = await AsyncStorage.getItem(deletedKey);
      if (deletedData) {
        const deletedList = JSON.parse(deletedData);
        const charIdStr = String(characterId);
        if (deletedList.includes(charIdStr)) {
          const newList = deletedList.filter(id => id !== charIdStr);
          await AsyncStorage.setItem(deletedKey, JSON.stringify(newList));
          console.log(`✅ [SAVE] Retiré de la liste supprimée`);
        }
      }
    } catch (e) {
      // Ignorer les erreurs
    }
  }

  /**
   * Met à jour l'index des conversations
   */
  async _updateIndex(userId, characterId) {
    try {
      const indexKey = `conv_index_${userId}`;
      let index = [];
      
      const indexData = await AsyncStorage.getItem(indexKey);
      if (indexData) {
        index = JSON.parse(indexData);
      }
      
      const charIdStr = String(characterId);
      if (!index.includes(charIdStr)) {
        index.push(charIdStr);
        await AsyncStorage.setItem(indexKey, JSON.stringify(index));
        console.log(`📋 [SAVE] Index mis à jour: ${index.length} conversations`);
      }
    } catch (e) {
      // Ignorer les erreurs d'index
    }
  }

  /**
   * Récupère toutes les conversations
   */
  async getAllConversations() {
    console.log(`\n========== GET ALL CONVERSATIONS ==========`);
    
    try {
      const userId = await this.getCurrentUserId();
      const result = [];
      const seenIds = new Set();
      
      // Charger la liste des supprimées
      let deletedIds = [];
      try {
        const deletedData = await AsyncStorage.getItem(`deleted_conversations_${userId}`);
        if (deletedData) deletedIds = JSON.parse(deletedData);
      } catch (e) {}
      
      // Récupérer toutes les clés
      const allKeys = await AsyncStorage.getAllKeys();
      const convKeys = allKeys.filter(key => {
        if (key.includes('index') || key.includes('deleted')) return false;
        return key.startsWith('conv_') || key.startsWith('conversation_');
      });
      
      console.log(`🔍 [ALL] ${convKeys.length} clés de conversation trouvées`);
      
      for (const key of convKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (!data) continue;
          
          const parsed = JSON.parse(data);
          const messages = parsed.messages || parsed.history;
          
          if (!Array.isArray(messages) || messages.length === 0) continue;
          
          // Extraire characterId
          let characterId = parsed.characterId;
          if (!characterId) {
            // Essayer d'extraire de la clé
            const parts = key.split('_');
            characterId = parts[parts.length - 1];
          }
          
          if (!characterId) continue;
          
          const charIdStr = String(characterId);
          
          // Ignorer les supprimées et doublons
          if (deletedIds.includes(charIdStr)) continue;
          if (seenIds.has(charIdStr)) continue;
          seenIds.add(charIdStr);
          
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
      
      console.log(`✅ [ALL] ${result.length} conversations chargées`);
      console.log(`========== GET ALL CONVERSATIONS END ==========\n`);
      
      return result;
      
    } catch (error) {
      console.error('❌ [ALL] EXCEPTION:', error);
      return [];
    }
  }

  async refreshConversations() {
    return await this.getAllConversations();
  }

  async deleteConversation(characterId) {
    console.log(`🗑️ [DELETE] Suppression: ${characterId}`);
    
    try {
      const userId = await this.getCurrentUserId();
      const charIdStr = String(characterId);
      
      // Trouver et supprimer les clés de conversation
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToDelete = allKeys.filter(key => {
        if (key.includes('gallery') || key.includes('gal_')) return false;
        return key.includes(charIdStr) && (key.startsWith('conv_') || key.startsWith('conversation_'));
      });
      
      for (const key of keysToDelete) {
        await AsyncStorage.removeItem(key);
        console.log(`✅ [DELETE] Supprimé: ${key}`);
      }
      
      // Ajouter à la liste des supprimées
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
      
      return true;
    } catch (error) {
      console.error('❌ [DELETE] EXCEPTION:', error);
      return false;
    }
  }

  async isConversationDeleted(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const deletedData = await AsyncStorage.getItem(`deleted_conversations_${userId}`);
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
      await AsyncStorage.setItem(`rel_${userId}_${characterId}`, JSON.stringify(relationship));
    } catch (error) {
      console.error('❌ [REL] Save error:', error);
    }
  }

  async loadRelationship(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const data = await AsyncStorage.getItem(`rel_${userId}_${characterId}`);
      if (data) return JSON.parse(data);
      
      // Migration
      const oldData = await AsyncStorage.getItem(`relationship_${characterId}`);
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

  /**
   * Réinitialise le cache utilisateur
   */
  resetUserCache() {
    // Plus nécessaire avec AppUserManager, mais garder pour compatibilité
    console.log('🔄 [StorageService] resetUserCache appelé');
  }
}

export default new StorageService();
