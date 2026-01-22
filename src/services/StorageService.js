/**
 * Service de stockage des conversations
 * v5.4.61 - Version simplifiée et robuste
 * SANS dépendance externe - tout en direct avec AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ID utilisateur en mémoire - simple et efficace
let USER_ID = null;

class StorageService {
  /**
   * Récupère ou crée l'ID utilisateur
   */
  async getUserId() {
    if (USER_ID) return USER_ID;
    
    try {
      USER_ID = await AsyncStorage.getItem('app_user_id');
      if (!USER_ID) {
        USER_ID = 'u' + Date.now().toString(36);
        await AsyncStorage.setItem('app_user_id', USER_ID);
        console.log('📱 Nouvel ID créé:', USER_ID);
      }
    } catch (e) {
      USER_ID = 'default';
    }
    return USER_ID;
  }

  /**
   * Sauvegarde une conversation
   */
  async saveConversation(characterId, messages, relationship) {
    if (!characterId) {
      console.error('❌ saveConversation: characterId requis');
      return false;
    }
    
    if (!messages || !Array.isArray(messages)) {
      console.error('❌ saveConversation: messages requis');
      return false;
    }

    try {
      const userId = await this.getUserId();
      
      const data = {
        cid: String(characterId),
        uid: userId,
        msgs: messages,
        rel: relationship || { level: 1, affection: 50, trust: 50 },
        ts: Date.now(),
      };
      
      const json = JSON.stringify(data);
      
      // Sauvegarde principale
      const key = `c_${characterId}`;
      await AsyncStorage.setItem(key, json);
      
      // Backup
      await AsyncStorage.setItem(`cb_${characterId}`, json);
      
      console.log(`✅ Conversation sauvegardée: ${characterId} (${messages.length} msgs)`);
      return true;
    } catch (error) {
      console.error('❌ Erreur saveConversation:', error);
      return false;
    }
  }

  /**
   * Charge une conversation
   */
  async loadConversation(characterId) {
    if (!characterId) return null;
    
    try {
      // Essayer la clé principale
      let data = await AsyncStorage.getItem(`c_${characterId}`);
      
      // Fallback sur backup
      if (!data) {
        data = await AsyncStorage.getItem(`cb_${characterId}`);
      }
      
      // Fallback sur anciens formats
      if (!data) {
        const userId = await this.getUserId();
        data = await AsyncStorage.getItem(`conv_${userId}_${characterId}`);
      }
      if (!data) {
        data = await AsyncStorage.getItem(`conv_backup_${characterId}`);
      }
      if (!data) {
        data = await AsyncStorage.getItem(`conversation_${characterId}`);
      }
      
      if (data) {
        const parsed = JSON.parse(data);
        console.log(`✅ Conversation chargée: ${characterId} (${parsed.msgs?.length || parsed.messages?.length || 0} msgs)`);
        return {
          characterId: parsed.cid || parsed.characterId || characterId,
          messages: parsed.msgs || parsed.messages || [],
          relationship: parsed.rel || parsed.relationship || { level: 1, affection: 50, trust: 50 },
          lastUpdated: parsed.ts ? new Date(parsed.ts).toISOString() : new Date().toISOString(),
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erreur loadConversation:', error);
      return null;
    }
  }

  /**
   * Récupère toutes les conversations
   */
  async getAllConversations() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const convKeys = keys.filter(k => k.startsWith('c_') && !k.startsWith('cb_'));
      
      console.log(`📚 ${convKeys.length} conversations trouvées`);
      
      const result = [];
      
      for (const key of convKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            const msgs = parsed.msgs || parsed.messages || [];
            
            if (msgs.length > 0) {
              result.push({
                characterId: parsed.cid || parsed.characterId || key.replace('c_', ''),
                messages: msgs,
                relationship: parsed.rel || parsed.relationship || { level: 1, affection: 50 },
                lastUpdated: parsed.ts ? new Date(parsed.ts).toISOString() : new Date().toISOString(),
                savedAt: parsed.ts || Date.now(),
              });
            }
          }
        } catch (e) {}
      }
      
      // Chercher aussi dans les anciens formats
      const oldKeys = keys.filter(k => 
        (k.startsWith('conv_') && !k.includes('index') && !k.includes('deleted')) ||
        k.startsWith('conversation_')
      );
      
      const seenIds = new Set(result.map(r => r.characterId));
      
      for (const key of oldKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            const msgs = parsed.msgs || parsed.messages || [];
            const charId = parsed.cid || parsed.characterId || key.split('_').pop();
            
            if (msgs.length > 0 && !seenIds.has(charId)) {
              seenIds.add(charId);
              result.push({
                characterId: charId,
                messages: msgs,
                relationship: parsed.rel || parsed.relationship || { level: 1, affection: 50 },
                lastUpdated: parsed.ts || parsed.lastUpdated || new Date().toISOString(),
                savedAt: parsed.ts || parsed.savedAt || Date.now(),
              });
              
              // Migrer vers nouveau format
              await this.saveConversation(charId, msgs, parsed.rel || parsed.relationship);
            }
          }
        } catch (e) {}
      }
      
      result.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
      
      console.log(`✅ Total: ${result.length} conversations`);
      return result;
    } catch (error) {
      console.error('❌ Erreur getAllConversations:', error);
      return [];
    }
  }

  /**
   * Supprime une conversation
   */
  async deleteConversation(characterId) {
    if (!characterId) return false;
    
    try {
      await AsyncStorage.removeItem(`c_${characterId}`);
      await AsyncStorage.removeItem(`cb_${characterId}`);
      
      // Supprimer aussi les anciens formats
      const keys = await AsyncStorage.getAllKeys();
      for (const key of keys) {
        if (key.includes(characterId) && (key.startsWith('conv_') || key.startsWith('conversation_'))) {
          await AsyncStorage.removeItem(key);
        }
      }
      
      console.log(`✅ Conversation supprimée: ${characterId}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur deleteConversation:', error);
      return false;
    }
  }

  /**
   * Sauvegarde la relation
   */
  async saveRelationship(characterId, relationship) {
    if (!characterId) return;
    try {
      await AsyncStorage.setItem(`r_${characterId}`, JSON.stringify(relationship));
    } catch (e) {}
  }

  /**
   * Charge la relation
   */
  async loadRelationship(characterId) {
    if (!characterId) return this.getDefaultRelationship();
    try {
      const data = await AsyncStorage.getItem(`r_${characterId}`);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return this.getDefaultRelationship();
  }

  getDefaultRelationship() {
    return { experience: 0, level: 1, affection: 50, trust: 50, interactions: 0 };
  }

  calculateRelationshipChange(message, character) {
    const len = message?.length || 0;
    return {
      expGain: Math.min(15, Math.floor(len / 30) + 1),
      affectionChange: 2,
      trustChange: 1,
    };
  }
  
  // Compatibilité
  async getCurrentUserId() {
    return await this.getUserId();
  }
  
  resetUserCache() {}
}

export default new StorageService();
