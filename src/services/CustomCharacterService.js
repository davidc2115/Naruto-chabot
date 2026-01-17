import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './AuthService';
import axios from 'axios';

/**
 * Service simplifié pour la gestion des personnages personnalisés
 * PRIORITÉ: Stockage LOCAL fiable
 * Publication serveur optionnelle et non-bloquante
 */
class CustomCharacterService {
  constructor() {
    this.FREEBOX_URL = 'http://88.174.155.230:33437';
  }
  
  /**
   * Clé de stockage unique pour l'utilisateur
   */
  getUserStorageKey() {
    const user = AuthService.getCurrentUser();
    const userId = user?.id || 'anonymous';
    return `custom_characters_${userId}`;
  }

  /**
   * Crée un nouveau personnage (LOCAL uniquement)
   */
  async saveCustomCharacter(character, isPublic = false) {
    try {
      const key = this.getUserStorageKey();
      const existing = await AsyncStorage.getItem(key);
      const characters = existing ? JSON.parse(existing) : [];
      
      const user = AuthService.getCurrentUser();
      
      // Générer un ID unique
      const newCharacter = {
        ...character,
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isCustom: true,
        isPublic: isPublic,
        createdBy: user?.id || 'anonymous',
        createdByEmail: user?.email || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        scenario: character.scenario || character.description || '',
        description: character.description || character.scenario || '',
        personality: character.personality || '',
        tags: character.tags || ['personnalisé'],
      };
      
      characters.push(newCharacter);
      await AsyncStorage.setItem(key, JSON.stringify(characters));
      
      console.log(`✅ Personnage créé localement: ${newCharacter.name} (${newCharacter.id})`);
      
      // Publication serveur en arrière-plan (non-bloquante)
      if (isPublic) {
        this.publishToServerAsync(newCharacter);
      }
      
      return newCharacter;
    } catch (error) {
      console.error('❌ Erreur création personnage:', error);
      throw error;
    }
  }

  /**
   * Récupère les personnages de l'utilisateur (LOCAL uniquement)
   */
  async getCustomCharacters() {
    try {
      const key = this.getUserStorageKey();
      const data = await AsyncStorage.getItem(key);
      const characters = data ? JSON.parse(data) : [];
      console.log(`📖 ${characters.length} personnages custom chargés`);
      return characters;
    } catch (error) {
      console.error('❌ Erreur chargement personnages:', error);
      return [];
    }
  }

  /**
   * Met à jour un personnage (LOCAL)
   */
  async updateCustomCharacter(characterId, updates) {
    try {
      const key = this.getUserStorageKey();
      const data = await AsyncStorage.getItem(key);
      const characters = data ? JSON.parse(data) : [];
      
      const index = characters.findIndex(char => char.id === characterId);
      
      if (index !== -1) {
        const updatedCharacter = { 
          ...characters[index], 
          ...updates, 
          updatedAt: Date.now(),
        };
        characters[index] = updatedCharacter;
        await AsyncStorage.setItem(key, JSON.stringify(characters));
        
        console.log(`✅ Personnage mis à jour: ${updatedCharacter.name}`);
        
        // Si public, mettre à jour sur serveur en arrière-plan
        if (updatedCharacter.isPublic) {
          this.publishToServerAsync(updatedCharacter);
        }
        
        return updatedCharacter;
      }
      
      throw new Error('Personnage non trouvé');
    } catch (error) {
      console.error('❌ Erreur mise à jour personnage:', error);
      throw error;
    }
  }

  /**
   * Supprime un personnage (LOCAL + tentative serveur)
   */
  async deleteCustomCharacter(characterId) {
    try {
      const key = this.getUserStorageKey();
      const data = await AsyncStorage.getItem(key);
      const characters = data ? JSON.parse(data) : [];
      
      const charToDelete = characters.find(c => c.id === characterId);
      console.log(`🗑️ Suppression personnage: ${characterId}`, charToDelete?.name);
      
      // 1. Suppression locale
      const updated = characters.filter(char => char.id !== characterId);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      
      // 2. Ajouter à la liste des suppressions locales
      await this.addToDeletedList(characterId);
      if (charToDelete?.serverId) {
        await this.addToDeletedList(charToDelete.serverId);
      }
      
      // 3. Tentative suppression serveur (non-bloquante)
      this.deleteFromServerAsync(characterId, charToDelete);
      
      console.log(`✅ Personnage supprimé localement: ${characterId}`);
      return updated;
    } catch (error) {
      console.error('❌ Erreur suppression personnage:', error);
      throw error;
    }
  }

  /**
   * Ajoute un ID à la liste des personnages supprimés
   */
  async addToDeletedList(characterId) {
    try {
      const user = AuthService.getCurrentUser();
      const key = `deleted_characters_${user?.id || 'anonymous'}`;
      let deleted = [];
      const data = await AsyncStorage.getItem(key);
      if (data) deleted = JSON.parse(data);
      if (!deleted.includes(String(characterId))) {
        deleted.push(String(characterId));
        await AsyncStorage.setItem(key, JSON.stringify(deleted));
      }
    } catch (e) {}
  }

  /**
   * Vérifie si un personnage est supprimé
   */
  async isDeleted(characterId) {
    try {
      const user = AuthService.getCurrentUser();
      const key = `deleted_characters_${user?.id || 'anonymous'}`;
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const deleted = JSON.parse(data);
        return deleted.includes(String(characterId));
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Récupère les personnages publics (depuis serveur avec cache)
   */
  async getPublicCharacters() {
    try {
      // Vérifier le cache local d'abord
      const cacheKey = 'cached_public_characters';
      const cacheTimeKey = 'cached_public_characters_time';
      
      const cachedTime = await AsyncStorage.getItem(cacheTimeKey);
      const now = Date.now();
      
      // Cache valide 5 minutes
      if (cachedTime && (now - parseInt(cachedTime)) < 300000) {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const characters = JSON.parse(cached);
          return await this.filterDeletedCharacters(characters);
        }
      }
      
      // Sinon, charger depuis serveur avec timeout court
      const response = await axios.get(
        `${this.FREEBOX_URL}/api/characters/public`,
        { timeout: 5000 }
      );
      
      if (response.data?.characters) {
        const characters = response.data.characters;
        
        // Mettre en cache
        await AsyncStorage.setItem(cacheKey, JSON.stringify(characters));
        await AsyncStorage.setItem(cacheTimeKey, now.toString());
        
        return await this.filterDeletedCharacters(characters);
      }
      
      return [];
    } catch (error) {
      console.log('⚠️ Erreur chargement personnages publics:', error.message);
      
      // Fallback: utiliser le cache même périmé
      try {
        const cached = await AsyncStorage.getItem('cached_public_characters');
        if (cached) {
          const characters = JSON.parse(cached);
          return await this.filterDeletedCharacters(characters);
        }
      } catch (e) {}
      
      return [];
    }
  }

  /**
   * Filtre les personnages supprimés de la liste
   */
  async filterDeletedCharacters(characters) {
    const user = AuthService.getCurrentUser();
    const key = `deleted_characters_${user?.id || 'anonymous'}`;
    let deleted = [];
    try {
      const data = await AsyncStorage.getItem(key);
      if (data) deleted = JSON.parse(data);
    } catch (e) {}
    
    return characters.filter(c => {
      return !deleted.includes(String(c.id)) && 
             !deleted.includes(String(c.serverId));
    });
  }

  /**
   * Publication serveur en arrière-plan (async, non-bloquante)
   */
  publishToServerAsync(character) {
    const user = AuthService.getCurrentUser();
    if (!user?.id) return;
    
    // Exécuter en arrière-plan sans attendre
    setTimeout(async () => {
      try {
        await axios.post(
          `${this.FREEBOX_URL}/api/characters/public`,
          { character: { ...character, isPublic: true } },
          { 
            headers: { 
              'Content-Type': 'application/json',
              'X-User-ID': user.id
            },
            timeout: 10000 
          }
        );
        console.log(`✅ Personnage publié sur serveur: ${character.name}`);
      } catch (e) {
        console.log(`⚠️ Publication serveur échouée: ${e.message}`);
      }
    }, 100);
  }

  /**
   * Suppression serveur en arrière-plan (async, non-bloquante)
   */
  deleteFromServerAsync(characterId, character) {
    const user = AuthService.getCurrentUser();
    
    setTimeout(async () => {
      try {
        // Essayer plusieurs IDs
        const idsToTry = [
          characterId,
          character?.serverId,
          character?.id,
        ].filter(Boolean);
        
        for (const id of idsToTry) {
          try {
            await axios.delete(
              `${this.FREEBOX_URL}/api/characters/public/${id}`,
              { 
                headers: { 'X-User-ID': user?.id || 'anonymous' },
                timeout: 5000 
              }
            );
            console.log(`✅ Supprimé du serveur: ${id}`);
            break;
          } catch (e) {}
        }
      } catch (e) {
        console.log(`⚠️ Suppression serveur échouée`);
      }
    }, 100);
  }

  /**
   * Publie un personnage existant
   */
  async publishCharacter(characterId) {
    const characters = await this.getCustomCharacters();
    const character = characters.find(c => c.id === characterId);
    
    if (!character) {
      throw new Error('Personnage non trouvé');
    }
    
    // Mettre à jour localement
    await this.updateCustomCharacter(characterId, { isPublic: true });
    
    // Publier sur serveur
    this.publishToServerAsync({ ...character, isPublic: true });
    
    return character;
  }

  /**
   * Dépublie un personnage
   */
  async unpublishCharacter(characterId) {
    await this.updateCustomCharacter(characterId, { isPublic: false });
    return true;
  }

  /**
   * Vide le cache des personnages publics
   */
  async clearPublicCache() {
    try {
      await AsyncStorage.removeItem('cached_public_characters');
      await AsyncStorage.removeItem('cached_public_characters_time');
      console.log('✅ Cache personnages publics vidé');
    } catch (e) {}
  }
}

export default new CustomCharacterService();
