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
      // Utiliser UN SEUL format de clé simple et prévisible
      const key = `conv_${userId}_${characterId}`;
      const data = {
        characterId: String(characterId),
        userId,
        messages: messages || [],
        relationship: relationship || { level: 1, affection: 50, trust: 50 },
        lastUpdated: new Date().toISOString(),
        savedAt: Date.now(),
      };
      
      // Sauvegarder la conversation
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`💾 Conversation sauvegardée: ${key} (${messages?.length || 0} messages)`);
      
      // AUSSI sauvegarder dans un index de conversations pour récupération facile
      // L'index stocke la liste des characterIds avec lesquels l'utilisateur a des conversations
      const indexKey = `conv_index_${userId}`;
      let index = [];
      try {
        const indexData = await AsyncStorage.getItem(indexKey);
        if (indexData) {
          index = JSON.parse(indexData);
        }
      } catch (e) {}
      
      // Ajouter le characterId à l'index s'il n'y est pas déjà
      if (!index.includes(String(characterId))) {
        index.push(String(characterId));
        await AsyncStorage.setItem(indexKey, JSON.stringify(index));
        console.log(`📋 Index mis à jour: ${index.length} conversations`);
      }
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
        
        // S'assurer que cette conversation est dans l'index
        try {
          const indexKey = `conv_index_${userId}`;
          let index = [];
          const indexData = await AsyncStorage.getItem(indexKey);
          if (indexData) index = JSON.parse(indexData);
          if (!index.includes(String(characterId))) {
            index.push(String(characterId));
            await AsyncStorage.setItem(indexKey, JSON.stringify(index));
          }
        } catch (e) {}
        
        return parsed;
      }
      
      // Essayer d'autres formats de clés
      const alternativeKeys = [
        `conv_anonymous_${characterId}`,
        `conversation_${characterId}`,
      ];
      
      for (const altKey of alternativeKeys) {
        try {
          const altData = await AsyncStorage.getItem(altKey);
          if (altData) {
            const parsed = JSON.parse(altData);
            console.log(`🔄 Conversation trouvée avec clé alternative: ${altKey}`);
            // Sauvegarder avec le bon format (ceci met aussi à jour l'index)
            await this.saveConversation(characterId, parsed.messages, parsed.relationship);
            return parsed;
          }
        } catch (e) {}
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
      const result = [];
      
      console.log(`🔍 Recherche conversations pour userId: ${userId}`);
      
      // === MÉTHODE 1: Utiliser l'index de conversations ===
      const indexKey = `conv_index_${userId}`;
      let indexData = null;
      try {
        indexData = await AsyncStorage.getItem(indexKey);
      } catch (e) {}
      
      if (indexData) {
        const characterIds = JSON.parse(indexData);
        console.log(`📋 Index trouvé: ${characterIds.length} conversations`);
        
        for (const characterId of characterIds) {
          const convKey = `conv_${userId}_${characterId}`;
          try {
            const convData = await AsyncStorage.getItem(convKey);
            if (convData) {
              const parsed = JSON.parse(convData);
              if (parsed.messages && parsed.messages.length > 0) {
                result.push({
                  characterId: String(characterId),
                  messages: parsed.messages,
                  relationship: parsed.relationship || { level: 1, affection: 50 },
                  lastUpdated: parsed.lastUpdated || new Date().toISOString(),
                  savedAt: parsed.savedAt || Date.now(),
                });
                console.log(`✅ Conversation (index): ${characterId} (${parsed.messages.length} msgs)`);
              }
            }
          } catch (e) {
            console.log(`⚠️ Erreur lecture ${characterId}:`, e.message);
          }
        }
      }
      
      // === MÉTHODE 2: Recherche par clés (fallback) ===
      // Si l'index n'a rien trouvé, chercher toutes les clés
      if (result.length === 0) {
        console.log(`📋 Index vide, recherche par clés...`);
        const keys = await AsyncStorage.getAllKeys();
        
        // Trouver toutes les clés de conversation
        const convKeys = keys.filter(key => {
          // Format principal: conv_userId_characterId
          if (key.startsWith(`conv_${userId}_`) && !key.includes('index')) return true;
          // Conversations anonymes
          if (key.startsWith('conv_anonymous_') && !key.includes('index')) return true;
          // Format conv_ générique (si userId est différent ou anonyme)
          if (key.startsWith('conv_') && !key.includes('index') && key.split('_').length >= 3) return true;
          // Ancien format conversation_
          if (key.startsWith('conversation_')) return true;
          return false;
        });
        
        console.log(`📚 ${convKeys.length} clés de conversations trouvées`);
        
        if (convKeys.length === 0) {
          // Debug: afficher les clés existantes
          const debugKeys = keys.filter(k => k.includes('conv') || k.includes('message'));
          console.log(`📋 Debug - Clés contenant 'conv' ou 'message':`, debugKeys.slice(0, 20));
        }
        
        const seenCharacterIds = new Set();
        
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
              if (key.startsWith('conv_') && parts.length >= 3) {
                characterId = parts.slice(2).join('_');
              } else if (key.startsWith('conversation_')) {
                characterId = parts.slice(1).join('_');
              }
            }
            
            if (!characterId || seenCharacterIds.has(characterId)) continue;
            seenCharacterIds.add(characterId);
            
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
                characterId: String(characterId),
                messages: normalizedMessages,
                relationship: parsed.relationship || { level: 1, affection: 50 },
                lastUpdated: parsed.lastUpdated || new Date().toISOString(),
                savedAt: parsed.savedAt || Date.now(),
              });
              console.log(`✅ Conversation (clé): ${characterId} (${normalizedMessages.length} msgs)`);
              
              // Ajouter à l'index pour les prochaines fois
              try {
                let index = [];
                const indexData = await AsyncStorage.getItem(indexKey);
                if (indexData) index = JSON.parse(indexData);
                if (!index.includes(characterId)) {
                  index.push(characterId);
                  await AsyncStorage.setItem(indexKey, JSON.stringify(index));
                }
              } catch (e) {}
            }
          } catch (e) {
            console.log(`⚠️ Erreur traitement ${key}:`, e.message);
          }
        }
      }
      
      // Trier par date (plus récentes en premier)
      result.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
      
      console.log(`✅ TOTAL: ${result.length} conversations chargées`);
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
