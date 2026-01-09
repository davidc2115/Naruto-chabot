import AsyncStorage from '@react-native-async-storage/async-storage';
import SyncService from './SyncService';
import AuthService from './AuthService';

class CustomCharacterService {
  
  /**
   * Récupère la clé de stockage unique pour l'utilisateur connecté
   */
  getUserStorageKey() {
    const user = AuthService.getCurrentUser();
    const userId = user?.id || 'anonymous';
    return `custom_characters_${userId}`;
  }

  /**
   * Sauvegarde un personnage personnalisé
   * @param {object} character - Le personnage à sauvegarder
   * @param {boolean} isPublic - Si true, le personnage sera publié sur le serveur
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
        createdAt: Date.now()
      };
      
      characters.push(newCharacter);
      await AsyncStorage.setItem(key, JSON.stringify(characters));
      
      // Si public, publier sur le serveur
      if (isPublic) {
        try {
          await SyncService.init();
          const publishedChar = await SyncService.publishCharacter(newCharacter);
          // Mettre à jour avec l'ID du serveur
          if (publishedChar && publishedChar.id) {
            newCharacter.serverId = publishedChar.id;
            await this.updateCustomCharacter(newCharacter.id, { serverId: publishedChar.id });
          }
          console.log('✅ Personnage publié sur le serveur');
        } catch (error) {
          console.error('⚠️ Erreur publication, personnage sauvé localement uniquement:', error);
        }
      }
      
      return newCharacter;
    } catch (error) {
      console.error('Error saving custom character:', error);
      throw error;
    }
  }

  /**
   * Récupère les personnages de l'utilisateur connecté uniquement
   */
  async getCustomCharacters() {
    try {
      const key = this.getUserStorageKey();
      const data = await AsyncStorage.getItem(key);
      const localChars = data ? JSON.parse(data) : [];
      
      // Retourner uniquement les personnages de l'utilisateur
      return localChars;
    } catch (error) {
      console.error('Error getting custom characters:', error);
      return [];
    }
  }

  /**
   * Récupère les personnages de l'utilisateur + personnages publics des autres
   */
  async getAllVisibleCharacters() {
    try {
      // Personnages de l'utilisateur
      const myCharacters = await this.getCustomCharacters();
      
      // Personnages publics du serveur (des autres utilisateurs)
      let publicCharacters = [];
      try {
        await SyncService.init();
        const serverPublic = await SyncService.getCachedPublicCharacters();
        const user = AuthService.getCurrentUser();
        const myUserId = user?.id;
        
        // Filtrer pour ne pas inclure mes propres personnages (déjà dans myCharacters)
        publicCharacters = serverPublic.filter(char => {
          return char.createdBy !== myUserId;
        });
      } catch (e) {
        console.log('⚠️ Impossible de charger les personnages publics:', e.message);
      }
      
      return [...myCharacters, ...publicCharacters];
    } catch (error) {
      console.error('Error getting all visible characters:', error);
      return [];
    }
  }

  async deleteCustomCharacter(characterId) {
    try {
      const characters = await this.getCustomCharacters();
      const charToDelete = characters.find(char => char.id === characterId);
      
      // Si le personnage était public, le retirer du serveur
      if (charToDelete?.isPublic && charToDelete?.serverId) {
        try {
          await SyncService.init();
          await SyncService.unpublishCharacter(charToDelete.serverId);
        } catch (e) {
          console.log('⚠️ Erreur retrait du serveur:', e.message);
        }
      }
      
      const updated = characters.filter(char => char.id !== characterId);
      await AsyncStorage.setItem(this.getUserStorageKey(), JSON.stringify(updated));
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
        await AsyncStorage.setItem(this.getUserStorageKey(), JSON.stringify(characters));
        return characters[index];
      }
      
      throw new Error('Character not found');
    } catch (error) {
      console.error('Error updating custom character:', error);
      throw error;
    }
  }

  /**
   * Publie un personnage existant sur le serveur
   */
  async publishCharacter(characterId) {
    try {
      const characters = await this.getCustomCharacters();
      const character = characters.find(char => char.id === characterId);
      
      if (!character) {
        throw new Error('Personnage non trouvé');
      }

      await SyncService.init();
      const publishedChar = await SyncService.publishCharacter(character);
      
      // Mettre à jour le statut local
      await this.updateCustomCharacter(characterId, {
        isPublic: true,
        serverId: publishedChar.id
      });

      return publishedChar;
    } catch (error) {
      console.error('Error publishing character:', error);
      throw error;
    }
  }

  /**
   * Retire un personnage du serveur public
   */
  async unpublishCharacter(characterId) {
    try {
      const characters = await this.getCustomCharacters();
      const character = characters.find(char => char.id === characterId);
      
      if (!character) {
        throw new Error('Personnage non trouvé');
      }

      const serverIdToRemove = character.serverId || characterId;
      
      await SyncService.init();
      await SyncService.unpublishCharacter(serverIdToRemove);
      
      // Mettre à jour le statut local
      await this.updateCustomCharacter(characterId, {
        isPublic: false,
        serverId: null
      });

      return true;
    } catch (error) {
      console.error('Error unpublishing character:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les personnages publics du serveur
   */
  async getPublicCharacters() {
    try {
      await SyncService.init();
      return await SyncService.getPublicCharacters();
    } catch (error) {
      console.error('Error getting public characters:', error);
      return [];
    }
  }

  /**
   * Télécharge un personnage public et l'ajoute aux personnages locaux
   */
  async downloadPublicCharacter(characterId) {
    try {
      await SyncService.init();
      const character = await SyncService.downloadPublicCharacter(characterId);
      
      if (character) {
        const user = AuthService.getCurrentUser();
        
        // Sauvegarder localement avec un nouvel ID
        const localCharacter = {
          ...character,
          id: `downloaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          originalId: character.id,
          isCustom: true,
          isPublic: false, // Le personnage téléchargé est privé par défaut
          isDownloaded: true,
          downloadedBy: user?.id || 'anonymous',
          downloadedAt: Date.now()
        };

        const key = this.getUserStorageKey();
        const existing = await AsyncStorage.getItem(key);
        const characters = existing ? JSON.parse(existing) : [];
        characters.push(localCharacter);
        await AsyncStorage.setItem(key, JSON.stringify(characters));

        return localCharacter;
      }
      return null;
    } catch (error) {
      console.error('Error downloading public character:', error);
      throw error;
    }
  }

  /**
   * Like un personnage public
   */
  async likePublicCharacter(characterId) {
    try {
      await SyncService.init();
      return await SyncService.likeCharacter(characterId);
    } catch (error) {
      console.error('Error liking character:', error);
      return null;
    }
  }

  /**
   * Migrer les anciens personnages vers le nouveau système par utilisateur
   */
  async migrateOldCharacters() {
    try {
      const oldKey = 'custom_characters';
      const oldData = await AsyncStorage.getItem(oldKey);
      
      if (oldData) {
        const oldCharacters = JSON.parse(oldData);
        const user = AuthService.getCurrentUser();
        
        if (user && oldCharacters.length > 0) {
          // Vérifier si les personnages appartiennent à cet utilisateur
          const myOldChars = oldCharacters.filter(char => {
            // Si pas de createdBy, on considère que c'est l'utilisateur courant
            return !char.createdBy || char.createdBy === user.id;
          });
          
          if (myOldChars.length > 0) {
            const newKey = this.getUserStorageKey();
            const existingNew = await AsyncStorage.getItem(newKey);
            const existingChars = existingNew ? JSON.parse(existingNew) : [];
            
            // Ajouter les anciens personnages s'ils n'existent pas déjà
            for (const oldChar of myOldChars) {
              const exists = existingChars.some(c => c.id === oldChar.id);
              if (!exists) {
                existingChars.push({
                  ...oldChar,
                  createdBy: user.id,
                  createdByEmail: user.email
                });
              }
            }
            
            await AsyncStorage.setItem(newKey, JSON.stringify(existingChars));
            console.log(`✅ Migré ${myOldChars.length} personnages vers le nouveau système`);
          }
        }
      }
    } catch (error) {
      console.error('Erreur migration:', error);
    }
  }
}

export default new CustomCharacterService();
