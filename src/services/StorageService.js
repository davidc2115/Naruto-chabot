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
      
      // Filtrer les conversations de l'utilisateur courant
      const userConvPrefix = `conv_${userId}_`;
      const conversationKeys = keys.filter(key => key.startsWith(userConvPrefix));
      
      console.log(`📚 Chargement de ${conversationKeys.length} conversations pour ${userId}`);
      
      const conversations = await AsyncStorage.multiGet(conversationKeys);
      
      return conversations
        .map(([key, value]) => {
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        })
        .filter(conv => conv !== null)
        .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    } catch (error) {
      console.error('Error loading all conversations:', error);
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
    // Simple algorithm to adjust relationship based on interaction
    const messageLength = message.length;
    const baseExp = Math.min(10, Math.floor(messageLength / 50));
    
    let affectionChange = 0;
    let trustChange = 0;

    // Analyze message sentiment (simple keyword matching)
    const positive = ['merci', 'super', 'génial', 'aime', 'adore', 'parfait', 'excellent'];
    const negative = ['non', 'pas', 'jamais', 'déteste', 'arrête'];
    
    const lowerMessage = message.toLowerCase();
    positive.forEach(word => {
      if (lowerMessage.includes(word)) affectionChange += 2;
    });
    negative.forEach(word => {
      if (lowerMessage.includes(word)) affectionChange -= 1;
    });

    // Adjust based on character temperament
    if (character.temperament === 'timide') {
      trustChange = Math.floor(baseExp / 2);
    } else if (character.temperament === 'direct') {
      trustChange = baseExp;
    }

    return {
      expGain: baseExp,
      affectionChange,
      trustChange,
    };
  }
}

export default new StorageService();
