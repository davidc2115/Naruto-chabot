import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './AuthService';

class StorageService {
  /**
   * Récupère l'ID de l'utilisateur courant pour isoler les données
   */
  async getCurrentUserId() {
    try {
      const user = AuthService.getCurrentUser();
      if (user?.id) {
        return user.id;
      }
      // Fallback: récupérer depuis AsyncStorage
      const storedUser = await AsyncStorage.getItem('current_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        return parsed.id || 'anonymous';
      }
      return 'anonymous';
    } catch (error) {
      console.error('Error getting user ID:', error);
      return 'anonymous';
    }
  }

  // Conversations - ISOLÉES PAR UTILISATEUR
  async saveConversation(characterId, messages, relationship) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `conv_${userId}_${characterId}`;
      const data = {
        characterId,
        userId,
        messages,
        relationship,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`💾 Conversation sauvegardée: ${key} (${messages.length} messages)`);
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  async loadConversation(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `conv_${userId}_${characterId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        const parsed = JSON.parse(data);
        console.log(`📖 Conversation chargée: ${key} (${parsed.messages?.length || 0} messages)`);
        return parsed;
      }
      
      // Migration: essayer de charger l'ancienne clé sans userId
      const oldKey = `conversation_${characterId}`;
      const oldData = await AsyncStorage.getItem(oldKey);
      if (oldData) {
        console.log(`🔄 Migration ancienne conversation: ${oldKey} -> ${key}`);
        const parsed = JSON.parse(oldData);
        // Sauvegarder avec la nouvelle clé
        await this.saveConversation(characterId, parsed.messages, parsed.relationship);
        // Supprimer l'ancienne clé
        await AsyncStorage.removeItem(oldKey);
        return parsed;
      }
      
      return null;
    } catch (error) {
      console.error('Error loading conversation:', error);
      return null;
    }
  }

  async getAllConversations() {
    try {
      const userId = await this.getCurrentUserId();
      const keys = await AsyncStorage.getAllKeys();
      
      console.log(`🔍 Recherche conversations pour userId: ${userId}`);
      console.log(`📋 Toutes les clés AsyncStorage (${keys.length})`);
      
      // === RECHERCHE EXHAUSTIVE DE TOUTES LES CLÉS DE CONVERSATIONS ===
      const conversationKeys = keys.filter(key => {
        const lowerKey = key.toLowerCase();
        // Format actuel: conv_userId_characterId
        if (key.startsWith(`conv_${userId}_`)) return true;
        // Conversations anonymes
        if (key.startsWith('conv_anonymous_')) return true;
        // Toutes les conversations avec format conv_*
        if (key.startsWith('conv_')) return true;
        // Ancien format: conversation_characterId
        if (key.startsWith('conversation_')) return true;
        // Format messages_characterId
        if (key.startsWith('messages_')) return true;
        // Format chat_characterId
        if (key.startsWith('chat_')) return true;
        // Format history_characterId
        if (key.startsWith('history_')) return true;
        // Format thread_characterId
        if (key.startsWith('thread_')) return true;
        // Contient 'conv' dans le nom
        if (lowerKey.includes('conv') && !lowerKey.includes('conversion')) return true;
        return false;
      });
      
      console.log(`📚 ${conversationKeys.length} clés de conversations trouvées:`, conversationKeys.slice(0, 10));
      
      if (conversationKeys.length === 0) {
        console.log('⚠️ Aucune conversation trouvée dans AsyncStorage');
        return [];
      }
      
      const conversations = await AsyncStorage.multiGet(conversationKeys);
      
      const result = [];
      const seenCharacterIds = new Set(); // Éviter les doublons
      
      for (const [key, value] of conversations) {
        try {
          if (!value) {
            console.log(`⚠️ Clé ${key} sans valeur`);
            continue;
          }
          
          const parsed = JSON.parse(value);
          
          // === EXTRACTION DES MESSAGES AVEC MULTIPLES FORMATS ===
          let messages = null;
          
          // Format 1: { messages: [...] }
          if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
            messages = parsed.messages;
          }
          // Format 2: { history: [...] }
          else if (Array.isArray(parsed.history) && parsed.history.length > 0) {
            messages = parsed.history;
          }
          // Format 3: { data: { messages: [...] } }
          else if (parsed.data && Array.isArray(parsed.data.messages)) {
            messages = parsed.data.messages;
          }
          // Format 4: Tableau direct
          else if (Array.isArray(parsed) && parsed.length > 0) {
            // Vérifier que c'est un tableau de messages
            if (parsed[0] && (parsed[0].content || parsed[0].text || parsed[0].message)) {
              messages = parsed.map(m => ({
                role: m.role || (m.isUser ? 'user' : 'assistant'),
                content: m.content || m.text || m.message || ''
              }));
            }
          }
          // Format 5: Message unique { content, role }
          else if (parsed.content && parsed.role) {
            messages = [parsed];
          }
          
          if (!messages || messages.length === 0) {
            console.log(`⚠️ Pas de messages valides dans ${key}`);
            continue;
          }
          
          // === EXTRACTION DU CHARACTER ID ===
          let characterId = parsed.characterId || parsed.charId || parsed.character_id;
          
          // Extraire depuis les données imbriquées
          if (!characterId && parsed.data) {
            characterId = parsed.data.characterId || parsed.data.charId;
          }
          
          // Extraire depuis la clé elle-même
          if (!characterId && key.includes('_')) {
            const parts = key.split('_');
            // conv_userId_characterId -> characterId
            // conversation_characterId -> characterId
            if (key.startsWith('conv_') && parts.length >= 3) {
              characterId = parts.slice(2).join('_'); // Au cas où l'ID contient des _
            } else if (parts.length >= 2) {
              characterId = parts[parts.length - 1];
            }
          }
          
          if (!characterId) {
            console.log(`⚠️ Pas de characterId trouvé pour ${key}`);
            continue;
          }
          
          // Éviter les doublons (garder la conversation la plus récente)
          if (seenCharacterIds.has(characterId)) {
            console.log(`⚠️ Doublon ignoré: ${characterId}`);
            continue;
          }
          seenCharacterIds.add(characterId);
          
          // Normaliser les messages
          const normalizedMessages = messages.map(m => ({
            role: m.role || (m.isUser === true ? 'user' : 'assistant'),
            content: m.content || m.text || m.message || '',
          })).filter(m => m.content && m.content.trim() !== '');
          
          if (normalizedMessages.length > 0) {
            result.push({
              characterId: characterId,
              messages: normalizedMessages,
              relationship: parsed.relationship || parsed.data?.relationship || { level: 1, affection: 50 },
              lastUpdated: parsed.lastUpdated || parsed.updatedAt || parsed.timestamp || Date.now(),
            });
            console.log(`✅ Conversation chargée: ${characterId} (${normalizedMessages.length} messages)`);
          }
        } catch (e) {
          console.log(`⚠️ Erreur parsing clé ${key}:`, e.message);
        }
      }
      
      // Trier par date (plus récentes en premier)
      result.sort((a, b) => {
        const dateA = new Date(a.lastUpdated).getTime() || 0;
        const dateB = new Date(b.lastUpdated).getTime() || 0;
        return dateB - dateA;
      });
      
      console.log(`✅ ${result.length} conversations uniques chargées`);
      return result;
    } catch (error) {
      console.error('❌ Error loading all conversations:', error);
      return [];
    }
  }

  async deleteConversation(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `conv_${userId}_${characterId}`;
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Conversation supprimée: ${key}`);
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  }

  // Relationship/Experience system - ISOLÉ PAR UTILISATEUR
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
      
      // Migration: essayer l'ancienne clé
      const oldKey = `relationship_${characterId}`;
      const oldData = await AsyncStorage.getItem(oldKey);
      if (oldData) {
        const parsed = JSON.parse(oldData);
        await this.saveRelationship(characterId, parsed);
        await AsyncStorage.removeItem(oldKey);
        return parsed;
      }
      
      return this.getDefaultRelationship();
    } catch (error) {
      console.error('Error loading relationship:', error);
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
    // Algorithme amélioré basé sur le tempérament du personnage
    const messageLength = message.length;
    const baseExp = Math.min(15, Math.floor(messageLength / 30) + 1);
    
    let affectionChange = 0;
    let trustChange = 0;

    // Mots-clés par catégorie
    const affectionPositive = ['merci', 'super', 'génial', 'aime', 'adore', 'parfait', 'excellent', 'magnifique', 'belle', 'beau', 'sexy', 'attirant', 'désir', 'envie', 'plaisir', 'heureux', 'heureuse', 'content', 'contente', 'bisou', 'câlin', 'embrasse', 'caresse', 'tendresse', 'doux', 'douce'];
    const affectionNegative = ['déteste', 'moche', 'laid', 'horrible', 'dégoûtant', 'ennuyeux', 'chiant', 'nul', 'nulle'];
    const trustPositive = ['confiance', 'honnête', 'promis', 'jure', 'vérité', 'sincère', 'sérieux', 'fidèle', 'respecte', 'protège', 'soutien', 'aide', 'comprends', 'écoute'];
    const trustNegative = ['menteur', 'menteuse', 'triche', 'trahis', 'abandonne', 'ignore', 'méprise'];
    const intimateWords = ['embrasse', 'caresse', 'déshabille', 'touche', 'corps', 'peau', 'lèvres', 'baiser', 'lit', 'nuit', 'ensemble', 'proche', 'intime'];
    
    const lowerMessage = message.toLowerCase();
    
    // Calculer les changements d'affection
    affectionPositive.forEach(word => {
      if (lowerMessage.includes(word)) affectionChange += 3;
    });
    affectionNegative.forEach(word => {
      if (lowerMessage.includes(word)) affectionChange -= 4;
    });
    
    // Calculer les changements de confiance
    trustPositive.forEach(word => {
      if (lowerMessage.includes(word)) trustChange += 3;
    });
    trustNegative.forEach(word => {
      if (lowerMessage.includes(word)) trustChange -= 5;
    });
    
    // Bonus pour les messages intimes
    intimateWords.forEach(word => {
      if (lowerMessage.includes(word)) {
        affectionChange += 2;
        trustChange += 1;
      }
    });

    // Ajuster selon le tempérament du personnage
    const temperament = (character.temperament || character.personality || '').toLowerCase();
    
    if (temperament.includes('timide') || temperament.includes('shy')) {
      // Les personnages timides gagnent la confiance lentement mais l'affection rapidement
      trustChange = Math.floor(trustChange * 0.5);
      affectionChange = Math.floor(affectionChange * 1.3);
    } else if (temperament.includes('direct') || temperament.includes('bold') || temperament.includes('audacieux')) {
      // Les personnages directs gagnent confiance rapidement
      trustChange = Math.floor(trustChange * 1.5);
    } else if (temperament.includes('séducteur') || temperament.includes('séductrice') || temperament.includes('charmeur')) {
      // Les séducteurs réagissent plus à l'affection
      affectionChange = Math.floor(affectionChange * 1.5);
    } else if (temperament.includes('dominant') || temperament.includes('dominante')) {
      // Les dominants demandent plus de confiance
      trustChange = Math.floor(trustChange * 1.2);
      affectionChange = Math.floor(affectionChange * 0.8);
    } else if (temperament.includes('soumis') || temperament.includes('soumise')) {
      // Les soumis gagnent l'affection très facilement
      affectionChange = Math.floor(affectionChange * 1.5);
      trustChange = Math.floor(trustChange * 1.2);
    } else if (temperament.includes('mystérieux') || temperament.includes('mystérieuse')) {
      // Les mystérieux sont difficiles à cerner
      trustChange = Math.floor(trustChange * 0.6);
      affectionChange = Math.floor(affectionChange * 0.8);
    } else if (temperament.includes('passionné') || temperament.includes('passionnée')) {
      // Les passionnés réagissent fortement
      affectionChange = Math.floor(affectionChange * 1.8);
      trustChange = Math.floor(trustChange * 1.3);
    }
    
    // Bonus de base pour chaque message (interaction = progression)
    affectionChange += 1;
    trustChange += 1;
    
    // Limiter les changements extrêmes
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
