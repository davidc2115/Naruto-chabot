import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
  // Conversations
  async saveConversation(characterId, messages, relationship) {
    try {
      const key = `conversation_${characterId}`;
      const data = {
        characterId,
        messages,
        relationship,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  async loadConversation(characterId) {
    try {
      const key = `conversation_${characterId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading conversation:', error);
      return null;
    }
  }

  async getAllConversations() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const conversationKeys = keys.filter(key => key.startsWith('conversation_'));
      const conversations = await AsyncStorage.multiGet(conversationKeys);
      
      return conversations
        .map(([key, value]) => JSON.parse(value))
        .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    } catch (error) {
      console.error('Error loading all conversations:', error);
      return [];
    }
  }

  async deleteConversation(characterId) {
    try {
      const key = `conversation_${characterId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  }

  // Relationship/Experience system
  async saveRelationship(characterId, relationship) {
    try {
      const key = `relationship_${characterId}`;
      await AsyncStorage.setItem(key, JSON.stringify(relationship));
    } catch (error) {
      console.error('Error saving relationship:', error);
    }
  }

  async loadRelationship(characterId) {
    try {
      const key = `relationship_${characterId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : this.getDefaultRelationship();
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
