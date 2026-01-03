import AsyncStorage from '@react-native-async-storage/async-storage';

class CustomCharacterService {
  async saveCustomCharacter(character) {
    try {
      const key = 'custom_characters';
      const existing = await AsyncStorage.getItem(key);
      const characters = existing ? JSON.parse(existing) : [];
      
      // Générer un ID unique
      const newCharacter = {
        ...character,
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isCustom: true,
        createdAt: Date.now()
      };
      
      characters.push(newCharacter);
      await AsyncStorage.setItem(key, JSON.stringify(characters));
      
      return newCharacter;
    } catch (error) {
      console.error('Error saving custom character:', error);
      throw error;
    }
  }

  async getCustomCharacters() {
    try {
      const data = await AsyncStorage.getItem('custom_characters');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting custom characters:', error);
      return [];
    }
  }

  async deleteCustomCharacter(characterId) {
    try {
      const characters = await this.getCustomCharacters();
      const updated = characters.filter(char => char.id !== characterId);
      await AsyncStorage.setItem('custom_characters', JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error('Error deleting custom character:', error);
      throw error;
    }
  }

  async updateCustomCharacter(characterId, updates) {
    try {
      const characters = await this.getCustomCharacters();
      const index = characters.findIndex(char => char.id === characterId);
      
      if (index !== -1) {
        characters[index] = { ...characters[index], ...updates, updatedAt: Date.now() };
        await AsyncStorage.setItem('custom_characters', JSON.stringify(characters));
        return characters[index];
      }
      
      throw new Error('Character not found');
    } catch (error) {
      console.error('Error updating custom character:', error);
      throw error;
    }
  }
}

export default new CustomCharacterService();
