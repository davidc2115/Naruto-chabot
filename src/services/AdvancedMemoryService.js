import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * AdvancedMemoryService - Système de mémoire avancé illimité
 * 
 * Inspiré de Joyland - Stockage local illimité des conversations et souvenirs
 * - Sauvegarde automatique de toutes les conversations
 * - Indexation des souvenirs importants
 * - Recherche dans l'historique
 * - Pas de limite de stockage
 */
class AdvancedMemoryService {
  constructor() {
    this.CONVERSATIONS_KEY = 'advanced_memory_conversations';
    this.MEMORIES_KEY = 'advanced_memory_memories';
    this.INDEX_KEY = 'advanced_memory_index';
  }

  /**
   * Sauvegarde une conversation complète
   */
  async saveConversation(characterId, conversationData) {
    try {
      const allConversations = await this.getAllConversations();
      
      const conversation = {
        id: `${characterId}_${Date.now()}`,
        characterId,
        messages: conversationData.messages || [],
        relationship: conversationData.relationship || null,
        timestamp: Date.now(),
        lastUpdated: Date.now(),
      };
      
      // Remplacer ou ajouter
      allConversations[conversation.id] = conversation;
      
      await AsyncStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(allConversations));
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde conversation:', error);
      return false;
    }
  }

  /**
   * Récupère toutes les conversations
   */
  async getAllConversations() {
    try {
      const data = await AsyncStorage.getItem(this.CONVERSATIONS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Erreur récupération conversations:', error);
      return {};
    }
  }

  /**
   * Récupère les conversations d'un personnage
   */
  async getCharacterConversations(characterId) {
    try {
      const allConversations = await this.getAllConversations();
      const characterConversations = Object.values(allConversations).filter(
        conv => conv.characterId === characterId
      );
      
      // Trier par date (plus récent en premier)
      return characterConversations.sort((a, b) => b.lastUpdated - a.lastUpdated);
    } catch (error) {
      console.error('Erreur récupération conversations personnage:', error);
      return [];
    }
  }

  /**
   * Sauvegarde un souvenir important
   */
  async saveMemory(characterId, memoryData) {
    try {
      const allMemories = await this.getAllMemories();
      
      const memory = {
        id: `${characterId}_memory_${Date.now()}`,
        characterId,
        content: memoryData.content,
        type: memoryData.type || 'general', // 'general', 'preference', 'event', 'emotion'
        importance: memoryData.importance || 5, // 1-10
        timestamp: Date.now(),
        relatedMessages: memoryData.relatedMessages || [],
      };
      
      allMemories[memory.id] = memory;
      
      await AsyncStorage.setItem(this.MEMORIES_KEY, JSON.stringify(allMemories));
      await this.updateIndex(memory);
      
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde souvenir:', error);
      return false;
    }
  }

  /**
   * Récupère tous les souvenirs
   */
  async getAllMemories() {
    try {
      const data = await AsyncStorage.getItem(this.MEMORIES_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Erreur récupération souvenirs:', error);
      return {};
    }
  }

  /**
   * Récupère les souvenirs d'un personnage
   */
  async getCharacterMemories(characterId) {
    try {
      const allMemories = await this.getAllMemories();
      const characterMemories = Object.values(allMemories).filter(
        mem => mem.characterId === characterId
      );
      
      // Trier par importance puis par date
      return characterMemories.sort((a, b) => {
        if (b.importance !== a.importance) {
          return b.importance - a.importance;
        }
        return b.timestamp - a.timestamp;
      });
    } catch (error) {
      console.error('Erreur récupération souvenirs personnage:', error);
      return [];
    }
  }

  /**
   * Met à jour l'index de recherche
   */
  async updateIndex(memory) {
    try {
      const index = await this.getIndex();
      
      const keywords = this.extractKeywords(memory.content);
      keywords.forEach(keyword => {
        if (!index[keyword]) {
          index[keyword] = [];
        }
        if (!index[keyword].includes(memory.id)) {
          index[keyword].push(memory.id);
        }
      });
      
      await AsyncStorage.setItem(this.INDEX_KEY, JSON.stringify(index));
    } catch (error) {
      console.error('Erreur mise à jour index:', error);
    }
  }

  /**
   * Récupère l'index
   */
  async getIndex() {
    try {
      const data = await AsyncStorage.getItem(this.INDEX_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Erreur récupération index:', error);
      return {};
    }
  }

  /**
   * Extrait les mots-clés d'un texte
   */
  extractKeywords(text) {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'à', 'au', 'aux', 'en', 'dans', 'pour', 'avec', 'sur', 'par', 'que', 'qui', 'quoi', 'dont', 'où', 'lorsque', 'si', 'alors', 'mais', 'ou', 'et', 'donc', 'or', 'ni', 'car', 'comme', 'quand', 'comment', 'pourquoi', 'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 'son', 'ma', 'ta', 'sa', 'nos', 'vos', 'leurs', 'tout', 'tous', 'toute', 'toutes', 'chaque', 'plusieurs', 'certains', 'certaines', 'aucun', 'aucune', 'nul', 'nulle', 'tel', 'telle', 'tels', 'telles'];
    
    return words.filter(word => 
      word.length > 2 && 
      !stopWords.includes(word) &&
      /^[a-zàâäéèêëïîôöùûüÿç]+$/.test(word)
    );
  }

  /**
   * Recherche dans les souvenirs
   */
  async searchMemories(query) {
    try {
      const index = await this.getIndex();
      const allMemories = await this.getAllMemories();
      const keywords = this.extractKeywords(query);
      
      const memoryIds = new Set();
      keywords.forEach(keyword => {
        if (index[keyword]) {
          index[keyword].forEach(id => memoryIds.add(id));
        }
      });
      
      const results = Array.from(memoryIds).map(id => allMemories[id]).filter(Boolean);
      
      return results.sort((a, b) => b.importance - a.importance);
    } catch (error) {
      console.error('Erreur recherche souvenirs:', error);
      return [];
    }
  }

  /**
   * Supprime une conversation
   */
  async deleteConversation(conversationId) {
    try {
      const allConversations = await this.getAllConversations();
      delete allConversations[conversationId];
      await AsyncStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(allConversations));
      return true;
    } catch (error) {
      console.error('Erreur suppression conversation:', error);
      return false;
    }
  }

  /**
   * Supprime tous les souvenirs d'un personnage
   */
  async deleteCharacterMemories(characterId) {
    try {
      const allMemories = await this.getAllMemories();
      Object.keys(allMemories).forEach(key => {
        if (allMemories[key].characterId === characterId) {
          delete allMemories[key];
        }
      });
      await AsyncStorage.setItem(this.MEMORIES_KEY, JSON.stringify(allMemories));
      return true;
    } catch (error) {
      console.error('Erreur suppression souvenirs personnage:', error);
      return false;
    }
  }

  /**
   * Récupère les statistiques de stockage
   */
  async getStorageStats() {
    try {
      const allConversations = await this.getAllConversations();
      const allMemories = await this.getAllMemories();
      
      const totalConversations = Object.keys(allConversations).length;
      const totalMemories = Object.keys(allMemories).length;
      const totalMessages = Object.values(allConversations).reduce(
        (sum, conv) => sum + (conv.messages?.length || 0), 0
      );
      
      return {
        totalConversations,
        totalMemories,
        totalMessages,
        storageUsed: JSON.stringify(allConversations).length + JSON.stringify(allMemories).length,
      };
    } catch (error) {
      console.error('Erreur récupération statistiques:', error);
      return {
        totalConversations: 0,
        totalMemories: 0,
        totalMessages: 0,
        storageUsed: 0,
      };
    }
  }

  /**
   * Exporte toutes les données (pour backup)
   */
  async exportData() {
    try {
      const allConversations = await this.getAllConversations();
      const allMemories = await this.getAllMemories();
      
      return {
        conversations: allConversations,
        memories: allMemories,
        exportDate: Date.now(),
      };
    } catch (error) {
      console.error('Erreur export données:', error);
      return null;
    }
  }

  /**
   * Importe des données (pour restore)
   */
  async importData(data) {
    try {
      if (data.conversations) {
        await AsyncStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(data.conversations));
      }
      if (data.memories) {
        await AsyncStorage.setItem(this.MEMORIES_KEY, JSON.stringify(data.memories));
      }
      return true;
    } catch (error) {
      console.error('Erreur import données:', error);
      return false;
    }
  }
}

export default new AdvancedMemoryService();
