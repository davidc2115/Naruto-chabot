import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './AuthService';

class StorageService {
  constructor() {
    // Cache pour l'ID utilisateur (évite les appels répétés)
    this._cachedUserId = null;
    this._lastUserIdCheck = 0;
  }

  /**
   * Récupère l'ID de l'utilisateur courant pour isoler les données
   * v5.3.43 - Plus robuste avec cache et fallback device ID persistant
   */
  async getCurrentUserId() {
    try {
      // Utiliser le cache si récent (moins de 5 secondes)
      const now = Date.now();
      if (this._cachedUserId && (now - this._lastUserIdCheck) < 5000) {
        return this._cachedUserId;
      }

      // 1. Essayer AuthService
      const user = AuthService.getCurrentUser();
      if (user?.id) {
        this._cachedUserId = user.id;
        this._lastUserIdCheck = now;
        return user.id;
      }

      // 2. Essayer le token stocké
      const storedUser = await AsyncStorage.getItem('current_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.id) {
            this._cachedUserId = parsed.id;
            this._lastUserIdCheck = now;
            return parsed.id;
          }
        } catch (e) {
          // JSON invalide, ignorer
        }
      }

      // 3. Utiliser ou créer un ID device PERSISTANT (ne change jamais)
      let deviceId = await AsyncStorage.getItem('device_user_id');
      if (!deviceId) {
        deviceId = 'device_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        await AsyncStorage.setItem('device_user_id', deviceId);
        console.log('📱 Nouvel ID device créé:', deviceId);
      }

      this._cachedUserId = deviceId;
      this._lastUserIdCheck = now;
      return deviceId;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return 'default';
    }
  }

  /**
   * Réinitialise le cache utilisateur (appelé lors du logout/login)
   */
  resetUserCache() {
    this._cachedUserId = null;
    this._lastUserIdCheck = 0;
    console.log('🔄 Cache utilisateur réinitialisé');
  }

  // Conversations - ISOLÉES PAR UTILISATEUR
  // v5.3.68 - Sauvegarde ULTRA-ROBUSTE avec triple backup et vérification
  async saveConversation(characterId, messages, relationship) {
    try {
      if (!characterId) {
        console.error('❌ saveConversation: characterId manquant!');
        return;
      }
      
      const userId = await this.getCurrentUserId();
      console.log(`💾 Sauvegarde conversation: userId=${userId}, charId=${characterId}, msgs=${messages?.length || 0}`);
      
      // Utiliser UN SEUL format de clé simple et prévisible
      const key = `conv_${userId}_${characterId}`;
      const data = {
        characterId: String(characterId),
        userId,
        messages: messages || [],
        relationship: relationship || { level: 1, affection: 50, trust: 50 },
        lastUpdated: new Date().toISOString(),
        savedAt: Date.now(),
        version: '5.3.68',
      };
      
      // v5.3.68 - TRIPLE SAUVEGARDE pour garantir la persistance
      const jsonData = JSON.stringify(data);
      
      // 1. Clé principale
      await AsyncStorage.setItem(key, jsonData);
      
      // 2. Backup global (sans userId)
      const backupKey = `conv_backup_${characterId}`;
      await AsyncStorage.setItem(backupKey, jsonData);
      
      // 3. Backup de secours
      const fallbackKey = `conv_fallback_${characterId}`;
      await AsyncStorage.setItem(fallbackKey, jsonData);
      
      console.log(`✅ Conversation sauvegardée: ${key} (${messages?.length || 0} messages) + 2 backups`);
      
      // Vérifier que la sauvegarde principale a fonctionné
      const verify = await AsyncStorage.getItem(key);
      if (!verify) {
        console.error(`❌ ÉCHEC vérification sauvegarde: ${key}`);
        // Réessayer une fois
        await AsyncStorage.setItem(key, jsonData);
        const verify2 = await AsyncStorage.getItem(key);
        if (verify2) {
          console.log('✅ Sauvegarde réussie après retry');
        }
      }
      
      // AUSSI sauvegarder dans un index de conversations pour récupération facile
      const indexKey = `conv_index_${userId}`;
      let index = [];
      try {
        const indexData = await AsyncStorage.getItem(indexKey);
        if (indexData) {
          index = JSON.parse(indexData);
        }
      } catch (e) {}
      
      // Ajouter le characterId à l'index s'il n'y est pas déjà
      const charIdStr = String(characterId);
      if (!index.includes(charIdStr)) {
        index.push(charIdStr);
        await AsyncStorage.setItem(indexKey, JSON.stringify(index));
        console.log(`📋 Index mis à jour: ${index.length} conversations`);
      }
      
    } catch (error) {
      console.error('❌ Error saving conversation:', error);
      // v5.3.68 - Tentatives de sauvegarde de secours multiples
      const fallbackKeys = [
        `conv_default_${characterId}`,
        `conv_emergency_${characterId}`,
      ];
      
      for (const fallbackKey of fallbackKeys) {
        try {
          await AsyncStorage.setItem(fallbackKey, JSON.stringify({
            characterId: String(characterId),
            messages: messages || [],
            relationship: relationship || { level: 1, affection: 50, trust: 50 },
            lastUpdated: new Date().toISOString(),
            savedAt: Date.now(),
          }));
          console.log(`⚠️ Sauvegarde de secours réussie: ${fallbackKey}`);
          break;
        } catch (e2) {
          console.error(`❌ Échec sauvegarde ${fallbackKey}:`, e2.message);
        }
      }
    }
  }

  // v5.3.49 - Chargement robuste avec recherche multi-clés
  async loadConversation(characterId) {
    try {
      if (!characterId) {
        console.log('⚠️ loadConversation: characterId manquant');
        return null;
      }
      
      const userId = await this.getCurrentUserId();
      console.log(`📖 Chargement conversation: userId=${userId}, charId=${characterId}`);
      
      const key = `conv_${userId}_${characterId}`;
      let data = await AsyncStorage.getItem(key);
      
      if (data) {
        const parsed = JSON.parse(data);
        console.log(`✅ Conversation chargée: ${key} (${parsed.messages?.length || 0} messages)`);
        
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
      
      // v5.3.68 - Essayer TOUS les formats de clés possibles (dans l'ordre de priorité)
      const alternativeKeys = [
        `conv_backup_${characterId}`,         // Backup global
        `conv_fallback_${characterId}`,       // Backup de secours v5.3.68
        `conv_default_${characterId}`,        // Sauvegarde de secours
        `conv_emergency_${characterId}`,      // Sauvegarde d'urgence
        `conv_anonymous_${characterId}`,      // Legacy anonymous
        `conversation_${characterId}`,        // Ancien format
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
      const seenCharacterIds = new Set();
      
      console.log(`🔍 Recherche conversations pour userId: ${userId}`);
      
      // Charger la liste des conversations supprimées
      let deletedIds = [];
      try {
        const deletedKey = `deleted_conversations_${userId}`;
        const deletedData = await AsyncStorage.getItem(deletedKey);
        if (deletedData) deletedIds = JSON.parse(deletedData);
        // Aussi vérifier les anciens formats
        const deletedKeyAnon = `deleted_conversations_anonymous`;
        const deletedDataAnon = await AsyncStorage.getItem(deletedKeyAnon);
        if (deletedDataAnon) {
          const anonDeleted = JSON.parse(deletedDataAnon);
          deletedIds = [...new Set([...deletedIds, ...anonDeleted])];
        }
      } catch (e) {}
      
      console.log(`🚫 Conversations supprimées à ignorer: ${deletedIds.length}`);
      
      // v5.4.21 - Chercher TOUTES les conversations possibles (tous formats)
      const keys = await AsyncStorage.getAllKeys();
      const convKeys = keys.filter(key => {
        // Exclure les index et deleted
        if (key.includes('index') || key.includes('deleted')) return false;
        
        // Format principal: conv_userId_characterId
        if (key.startsWith(`conv_${userId}_`)) return true;
        
        // v5.4.21 - Backups globaux (TOUS les formats de backup)
        if (key.startsWith('conv_backup_')) return true;
        if (key.startsWith('conv_fallback_')) return true;  // Ajouté v5.4.21
        if (key.startsWith('conv_emergency_')) return true; // Ajouté v5.4.21
        
        // Formats legacy: conv_anonymous_, conv_device_, conversation_
        if (key.startsWith('conv_anonymous_')) return true;
        if (key.startsWith('conv_device_')) return true;
        if (key.startsWith('conversation_')) return true;
        if (key.startsWith('conv_default_')) return true;
        
        return false;
      });
      
      console.log(`📚 ${convKeys.length} clés de conversations trouvées`);
      
      // Reconstruire l'index
      const indexKey = `conv_index_${userId}`;
      const newIndex = [];
      
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
            }
          }
          
          if (!characterId) continue;
          
          const charIdStr = String(characterId);
          
          // VÉRIFIER si cette conversation a été supprimée
          if (deletedIds.includes(charIdStr)) {
            console.log(`🚫 Conversation ignorée (supprimée): ${charIdStr}`);
            // Supprimer aussi la clé résiduelle
            await AsyncStorage.removeItem(key);
            continue;
          }
          
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
            
            // Ajouter à l'index
            if (!newIndex.includes(charIdStr)) {
              newIndex.push(charIdStr);
            }
            
            console.log(`✅ Conversation: ${charIdStr} (${normalizedMessages.length} msgs)`);
          }
        } catch (e) {
          console.log(`⚠️ Erreur traitement ${key}:`, e.message);
        }
      }
      
      // Mettre à jour l'index
      try {
        await AsyncStorage.setItem(indexKey, JSON.stringify(newIndex));
        console.log(`📋 Index reconstruit: ${newIndex.length} conversations`);
      } catch (e) {}
      
      // Trier par date (plus récentes en premier)
      result.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
      
      console.log(`✅ TOTAL: ${result.length} conversations chargées`);
      return result;
    } catch (error) {
      console.error('❌ Error loading all conversations:', error);
      return [];
    }
  }
  
  /**
   * Force le rechargement de toutes les conversations (ignore le cache/index)
   */
  async refreshConversations() {
    return await this.getAllConversations();
  }

  async deleteConversation(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const charIdStr = String(characterId);
      
      console.log(`🗑️ Suppression conversation: ${characterId} (CONSERVATION des images galerie)`);
      
      // 1. Récupérer TOUTES les clés
      const allKeys = await AsyncStorage.getAllKeys();
      
      // 2. Trouver les clés de CONVERSATION liées à ce characterId
      // v5.4.4 - NE PAS supprimer les clés de galerie (gallery_*)
      const keysToDelete = allKeys.filter(key => {
        // EXCLURE les clés de galerie - NE JAMAIS supprimer les images!
        if (key.startsWith('gallery_')) return false;
        if (key.includes('_gallery_')) return false;
        if (key.includes('gallery')) return false;
        
        // EXCLURE les clés d'images générées
        if (key.includes('generated_images')) return false;
        if (key.includes('image_cache')) return false;
        
        // Supprimer uniquement les clés de conversation
        // Format conv_userId_characterId ou conversation_*
        if (key.startsWith('conv_') && (key.endsWith(`_${characterId}`) || key.endsWith(`_${charIdStr}`))) return true;
        if (key.startsWith('conversation_') && key.includes(charIdStr)) return true;
        
        // Clés de niveau/relation mais PAS les images
        if (key.startsWith('level_') && key.includes(charIdStr)) return true;
        if (key.startsWith('relation_') && key.includes(charIdStr)) return true;
        if (key.startsWith('messages_') && key.includes(charIdStr)) return true;
        
        return false;
      });
      
      console.log(`🔍 Clés conversation à supprimer: ${keysToDelete.length}`);
      console.log(`📷 Les images de galerie seront CONSERVÉES`);
      
      // 3. Supprimer SEULEMENT les clés de conversation
      for (const key of keysToDelete) {
        try {
          await AsyncStorage.removeItem(key);
          console.log(`✅ Supprimé: ${key}`);
        } catch (e) {
          console.log(`⚠️ Erreur suppression ${key}:`, e.message);
        }
      }
      
      // 4. Mettre à jour l'index
      const indexKey = `conv_index_${userId}`;
      try {
        const indexData = await AsyncStorage.getItem(indexKey);
        if (indexData) {
          let index = JSON.parse(indexData);
          index = index.filter(id => id !== charIdStr && id !== characterId);
          await AsyncStorage.setItem(indexKey, JSON.stringify(index));
          console.log(`📋 Index mis à jour: ${index.length} conversations`);
        }
      } catch (e) {}
      
      // 5. Ajouter à une liste de suppressions pour éviter recréation
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
      
      console.log(`✅ Conversation ${characterId} supprimée (images galerie conservées)`);
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
