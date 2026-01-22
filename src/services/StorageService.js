/**
 * StorageService - Gestion du stockage des conversations
 * v5.4.66 - CORRECTION: Sauvegarde plus robuste des conversations
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserId } from './AppUserManager';

class StorageService {
  constructor() {
    console.log('📦 [StorageService] Initialisé v5.4.66');
  }

  async getCurrentUserId() {
    return await getUserId();
  }

  /**
   * Récupère les clés de sauvegarde pour un personnage
   */
  _getKeys(userId, characterId) {
    return {
      primary: `conv_${userId}_${characterId}`,
      backup: `conv_backup_${characterId}`,
      global: `conv_global_${characterId}`,
      legacy: `conversation_${characterId}`,
    };
  }

  /**
   * Charge une conversation depuis toutes les clés possibles
   */
  async _loadFromAllKeys(userId, characterId) {
    const keys = this._getKeys(userId, characterId);
    const keysToTry = [keys.primary, keys.backup, keys.global, keys.legacy];
    
    for (const key of keysToTry) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.messages && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
            console.log(`📂 [CONV] Chargé ${parsed.messages.length} msgs depuis ${key}`);
            return parsed;
          }
        }
      } catch (e) {}
    }
    
    return null;
  }

  /**
   * SAUVEGARDE DE CONVERSATION - Ultra-robuste
   */
  async saveConversation(characterId, messages, relationship) {
    console.log(`\n========== SAVE CONVERSATION ==========`);
    console.log(`📝 characterId: ${characterId}`);
    console.log(`📝 messages: ${messages?.length || 0}`);
    
    try {
      if (!characterId) {
        console.error('❌ [CONV] characterId MANQUANT!');
        return false;
      }
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        console.error('❌ [CONV] messages VIDE!');
        return false;
      }
      
      const userId = await this.getCurrentUserId();
      console.log(`🔑 [CONV] userId: ${userId}`);
      
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
        messageCount: messages.length,
        version: '5.4.66',
      };
      
      const jsonData = JSON.stringify(data);
      console.log(`📦 [CONV] Taille: ${jsonData.length} bytes`);
      
      // QUADRUPLE SAUVEGARDE
      const keys = this._getKeys(userId, characterId);
      
      const savePromises = [
        AsyncStorage.setItem(keys.primary, jsonData),
        AsyncStorage.setItem(keys.backup, jsonData),
        AsyncStorage.setItem(keys.global, jsonData),
        AsyncStorage.setItem(keys.legacy, jsonData),
      ];
      
      await Promise.all(savePromises);
      console.log(`💾 [CONV] Sauvegardé vers 4 clés`);
      
      // Vérification immédiate
      const verify = await AsyncStorage.getItem(keys.primary);
      if (verify) {
        const verifyParsed = JSON.parse(verify);
        console.log(`✅ [CONV] Vérification: ${verifyParsed.messages?.length || 0} messages`);
        
        if (verifyParsed.messages?.length !== messages.length) {
          console.error(`❌ [CONV] MISMATCH! Sauvé: ${messages.length}, Vérifié: ${verifyParsed.messages?.length}`);
          // Réessayer
          await AsyncStorage.setItem(keys.primary, jsonData);
        }
      } else {
        console.error(`❌ [CONV] Vérification ÉCHOUÉE - données non trouvées!`);
      }
      
      // Mettre à jour l'index
      await this._updateIndex(userId, characterId);
      
      console.log(`========== SAVE CONVERSATION END ==========\n`);
      return true;
      
    } catch (error) {
      console.error('❌ [CONV] EXCEPTION:', error);
      
      // Sauvegarde d'urgence
      try {
        await AsyncStorage.setItem(`conv_emergency_${characterId}`, JSON.stringify({
          characterId: String(characterId),
          messages: messages || [],
          relationship: relationship || { level: 1 },
          savedAt: Date.now(),
        }));
        console.log(`⚠️ [CONV] Sauvegarde d'urgence effectuée`);
      } catch (e2) {}
      
      return false;
    }
  }

  /**
   * CHARGEMENT DE CONVERSATION
   */
  async loadConversation(characterId) {
    console.log(`\n========== LOAD CONVERSATION ==========`);
    console.log(`📝 characterId: ${characterId}`);
    
    try {
      if (!characterId) {
        console.error('❌ [CONV] characterId MANQUANT!');
        return null;
      }
      
      const userId = await this.getCurrentUserId();
      console.log(`🔑 [CONV] userId: ${userId}`);
      
      // Essayer de charger depuis toutes les clés
      const data = await this._loadFromAllKeys(userId, characterId);
      
      if (data) {
        console.log(`✅ [CONV] Chargé: ${data.messages?.length || 0} messages`);
        console.log(`========== LOAD CONVERSATION END ==========\n`);
        return data;
      }
      
      // Essayer les clés d'urgence
      const emergencyKeys = [
        `conv_emergency_${characterId}`,
        `conv_fallback_${characterId}`,
        `conv_default_${characterId}`,
      ];
      
      for (const key of emergencyKeys) {
        try {
          const emergencyData = await AsyncStorage.getItem(key);
          if (emergencyData) {
            const parsed = JSON.parse(emergencyData);
            if (parsed.messages && parsed.messages.length > 0) {
              console.log(`🔄 [CONV] Récupéré depuis ${key}: ${parsed.messages.length} messages`);
              // Migrer vers les clés principales
              await this.saveConversation(characterId, parsed.messages, parsed.relationship);
              return parsed;
            }
          }
        } catch (e) {}
      }
      
      console.log(`ℹ️ [CONV] Aucune conversation trouvée`);
      console.log(`========== LOAD CONVERSATION END ==========\n`);
      return null;
      
    } catch (error) {
      console.error('❌ [CONV] EXCEPTION:', error);
      return null;
    }
  }

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
        }
      }
    } catch (e) {}
  }

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
      }
    } catch (e) {}
  }

  async getAllConversations() {
    console.log(`\n========== GET ALL CONVERSATIONS ==========`);
    
    try {
      const userId = await this.getCurrentUserId();
      const result = [];
      const seenIds = new Set();
      
      let deletedIds = [];
      try {
        const deletedData = await AsyncStorage.getItem(`deleted_conversations_${userId}`);
        if (deletedData) deletedIds = JSON.parse(deletedData);
      } catch (e) {}
      
      const allKeys = await AsyncStorage.getAllKeys();
      const convKeys = allKeys.filter(key => 
        (key.startsWith('conv_') || key.startsWith('conversation_')) &&
        !key.includes('index') && !key.includes('deleted')
      );
      
      console.log(`🔍 [ALL] ${convKeys.length} clés trouvées`);
      
      for (const key of convKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (!data) continue;
          
          const parsed = JSON.parse(data);
          const messages = parsed.messages || parsed.history;
          
          if (!Array.isArray(messages) || messages.length === 0) continue;
          
          let characterId = parsed.characterId;
          if (!characterId) {
            const parts = key.split('_');
            characterId = parts[parts.length - 1];
          }
          
          if (!characterId) continue;
          
          const charIdStr = String(characterId);
          
          if (deletedIds.includes(charIdStr)) continue;
          if (seenIds.has(charIdStr)) continue;
          seenIds.add(charIdStr);
          
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
      
      result.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
      
      console.log(`✅ [ALL] ${result.length} conversations`);
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
    console.log(`🗑️ [DELETE] ${characterId}`);
    
    try {
      const userId = await this.getCurrentUserId();
      const charIdStr = String(characterId);
      
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToDelete = allKeys.filter(key => {
        if (key.includes('gallery') || key.includes('gal_')) return false;
        return key.includes(charIdStr) && (key.startsWith('conv_') || key.startsWith('conversation_'));
      });
      
      for (const key of keysToDelete) {
        await AsyncStorage.removeItem(key);
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
      
      console.log(`✅ [DELETE] Supprimé`);
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
    } catch (error) {}
  }

  async loadRelationship(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const data = await AsyncStorage.getItem(`rel_${userId}_${characterId}`);
      if (data) return JSON.parse(data);
      
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

  resetUserCache() {
    console.log('🔄 [StorageService] resetUserCache');
  }
}

export default new StorageService();
