import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service de gestion du profil utilisateur
 * Modes de conversation:
 * - SFW (default): Conversations normales
 * - Romance (nsfwMode): Romantique/suggestif, flirt, baisers
 * - Spicy (spicyMode): Contenu adulte explicite, scènes intimes détaillées
 */
class UserProfileService {
  async createProfile(profile) {
    try {
      const userProfile = {
        username: profile.username,
        gender: profile.gender, // 'male', 'female', 'other'
        age: profile.age,
        isAdult: profile.age >= 18,
        // Attributs physiques
        ...(profile.gender === 'female' && { bust: profile.bust }),
        ...(profile.gender === 'male' && { penis: profile.penis }),
        // Préférences de mode - 3 niveaux
        // nsfwMode: mode romance (suggestif, baisers, flirt)
        // spicyMode: mode explicite (scènes intimes détaillées, contenu 18+)
        nsfwMode: profile.age >= 18 ? (profile.nsfwMode || false) : false,
        spicyMode: profile.age >= 18 ? (profile.spicyMode || false) : false,
        createdAt: Date.now(),
      };

      await AsyncStorage.setItem('user_profile', JSON.stringify(userProfile));
      return userProfile;
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  async getProfile() {
    try {
      const data = await AsyncStorage.getItem('user_profile');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  }

  async updateProfile(updates) {
    try {
      const currentProfile = await this.getProfile();
      if (!currentProfile) {
        throw new Error('No profile found');
      }

      // Si l'âge change, réajuster isAdult et les modes
      if (updates.age) {
        updates.isAdult = updates.age >= 18;
        if (updates.age < 18) {
          updates.nsfwMode = false;
          updates.spicyMode = false;
        }
      }

      // Si spicyMode est activé, nsfwMode doit aussi être activé
      if (updates.spicyMode && !updates.nsfwMode) {
        updates.nsfwMode = true;
      }

      const updatedProfile = {
        ...currentProfile,
        ...updates,
        updatedAt: Date.now(),
      };

      await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  async deleteProfile() {
    try {
      await AsyncStorage.removeItem('user_profile');
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  }

  async toggleNSFW() {
    try {
      const profile = await this.getProfile();
      if (!profile) {
        throw new Error('No profile found');
      }

      if (!profile.isAdult) {
        throw new Error('Must be 18+ to enable NSFW mode');
      }

      // Si on désactive NSFW, on désactive aussi Spicy
      const newNsfwMode = !profile.nsfwMode;
      const updates = { nsfwMode: newNsfwMode };
      if (!newNsfwMode) {
        updates.spicyMode = false;
      }

      return await this.updateProfile(updates);
    } catch (error) {
      console.error('Error toggling NSFW:', error);
      throw error;
    }
  }

  async toggleSpicy() {
    try {
      const profile = await this.getProfile();
      if (!profile) {
        throw new Error('No profile found');
      }

      if (!profile.isAdult) {
        throw new Error('Must be 18+ to enable Spicy mode');
      }

      const newSpicyMode = !profile.spicyMode;
      const updates = { spicyMode: newSpicyMode };
      
      // Si on active Spicy, on active aussi NSFW
      if (newSpicyMode) {
        updates.nsfwMode = true;
      }

      return await this.updateProfile(updates);
    } catch (error) {
      console.error('Error toggling Spicy:', error);
      throw error;
    }
  }

  /**
   * Retourne le mode de contenu actif
   * @returns 'sfw' | 'romance' | 'spicy'
   */
  getContentMode(profile) {
    if (!profile || !profile.isAdult) return 'sfw';
    if (profile.spicyMode) return 'spicy';
    if (profile.nsfwMode) return 'romance';
    return 'sfw';
  }
}

export default new UserProfileService();
