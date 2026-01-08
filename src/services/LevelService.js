import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service de gestion des niveaux et de l'XP
 * Système de progression évolutif
 */
class LevelService {
  constructor() {
    // Configuration des niveaux
    // XP requis = baseXP * (level ^ exponent)
    this.baseXP = 100;
    this.exponent = 1.5;
    this.maxLevel = 100;
    
    // Titres par tranche de niveau
    this.titles = {
      1: 'Débutant',
      5: 'Apprenti',
      10: 'Initié',
      15: 'Habitué',
      20: 'Expert',
      25: 'Maître',
      30: 'Grand Maître',
      40: 'Légende',
      50: 'Mythique',
      75: 'Divin',
      100: 'Transcendant',
    };
    
    // Récompenses par niveau
    this.rewards = {
      5: { type: 'unlock', description: 'Personnages supplémentaires débloqués' },
      10: { type: 'feature', description: 'Styles de chat personnalisés' },
      15: { type: 'unlock', description: 'Mode conversation avancé' },
      20: { type: 'feature', description: 'Génération d\'images améliorée' },
      25: { type: 'unlock', description: 'Personnages exclusifs' },
      30: { type: 'badge', description: 'Badge Maître du Roleplay' },
      50: { type: 'badge', description: 'Badge Légende' },
    };
  }

  /**
   * Calcule l'XP requis pour atteindre un niveau
   */
  getXPForLevel(level) {
    if (level <= 1) return 0;
    return Math.floor(this.baseXP * Math.pow(level, this.exponent));
  }

  /**
   * Calcule le niveau à partir de l'XP total
   */
  getLevelFromXP(totalXP) {
    let level = 1;
    while (level < this.maxLevel && totalXP >= this.getXPForLevel(level + 1)) {
      level++;
    }
    return level;
  }

  /**
   * Calcule la progression vers le niveau suivant (0-100%)
   */
  getProgressToNextLevel(totalXP) {
    const currentLevel = this.getLevelFromXP(totalXP);
    if (currentLevel >= this.maxLevel) return 100;
    
    const currentLevelXP = this.getXPForLevel(currentLevel);
    const nextLevelXP = this.getXPForLevel(currentLevel + 1);
    const xpInCurrentLevel = totalXP - currentLevelXP;
    const xpNeededForNext = nextLevelXP - currentLevelXP;
    
    return Math.floor((xpInCurrentLevel / xpNeededForNext) * 100);
  }

  /**
   * Obtient le titre pour un niveau donné
   */
  getTitleForLevel(level) {
    let title = 'Débutant';
    for (const [reqLevel, titleName] of Object.entries(this.titles)) {
      if (level >= parseInt(reqLevel)) {
        title = titleName;
      }
    }
    return title;
  }

  /**
   * Charge les données de l'utilisateur
   */
  async getUserData() {
    try {
      const data = await AsyncStorage.getItem('user_level_data');
      if (data) {
        return JSON.parse(data);
      }
      return this.getDefaultUserData();
    } catch (error) {
      console.error('Erreur chargement niveau:', error);
      return this.getDefaultUserData();
    }
  }

  /**
   * Données par défaut
   */
  getDefaultUserData() {
    return {
      totalXP: 0,
      level: 1,
      title: 'Débutant',
      messagesCount: 0,
      conversationsCount: 0,
      charactersInteracted: [],
      achievements: [],
      lastActivity: null,
      streakDays: 0,
      lastStreakDate: null,
    };
  }

  /**
   * Sauvegarde les données utilisateur
   */
  async saveUserData(data) {
    try {
      await AsyncStorage.setItem('user_level_data', JSON.stringify(data));
    } catch (error) {
      console.error('Erreur sauvegarde niveau:', error);
    }
  }

  /**
   * Ajoute de l'XP et retourne le résultat
   */
  async addXP(amount, source = 'message') {
    const userData = await this.getUserData();
    const oldLevel = userData.level;
    
    // Ajouter l'XP
    userData.totalXP += amount;
    userData.messagesCount += 1;
    userData.lastActivity = new Date().toISOString();
    
    // Vérifier le streak journalier
    await this.checkDailyStreak(userData);
    
    // Calculer le nouveau niveau
    const newLevel = this.getLevelFromXP(userData.totalXP);
    userData.level = newLevel;
    userData.title = this.getTitleForLevel(newLevel);
    
    // Sauvegarder
    await this.saveUserData(userData);
    
    // Vérifier si level up
    const leveledUp = newLevel > oldLevel;
    let reward = null;
    if (leveledUp && this.rewards[newLevel]) {
      reward = this.rewards[newLevel];
    }
    
    return {
      xpGained: amount,
      totalXP: userData.totalXP,
      level: newLevel,
      title: userData.title,
      progress: this.getProgressToNextLevel(userData.totalXP),
      xpToNextLevel: this.getXPForLevel(newLevel + 1) - userData.totalXP,
      leveledUp,
      oldLevel,
      newLevel,
      reward,
    };
  }

  /**
   * Vérifie et met à jour le streak journalier
   */
  async checkDailyStreak(userData) {
    const today = new Date().toDateString();
    
    if (userData.lastStreakDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (userData.lastStreakDate === yesterday.toDateString()) {
        // Streak continue
        userData.streakDays += 1;
      } else if (userData.lastStreakDate !== today) {
        // Streak perdu
        userData.streakDays = 1;
      }
      
      userData.lastStreakDate = today;
      
      // Bonus XP pour le streak
      if (userData.streakDays >= 7) {
        userData.totalXP += 50; // Bonus hebdomadaire
      } else if (userData.streakDays >= 3) {
        userData.totalXP += 20; // Bonus 3 jours
      }
    }
  }

  /**
   * Enregistre une interaction avec un personnage
   */
  async recordCharacterInteraction(characterId) {
    const userData = await this.getUserData();
    
    if (!userData.charactersInteracted.includes(characterId)) {
      userData.charactersInteracted.push(characterId);
      userData.totalXP += 25; // Bonus premier contact
      await this.saveUserData(userData);
    }
  }

  /**
   * Calcule l'XP gagné pour un message
   */
  calculateMessageXP(messageLength, isNSFW = false) {
    // XP de base selon la longueur
    let xp = Math.min(15, Math.floor(messageLength / 20) + 1);
    
    // Bonus pour messages plus longs
    if (messageLength > 100) xp += 3;
    if (messageLength > 200) xp += 5;
    
    // Bonus NSFW (conversations plus engagées)
    if (isNSFW) xp = Math.floor(xp * 1.2);
    
    return xp;
  }

  /**
   * Obtient les statistiques complètes
   */
  async getFullStats() {
    const userData = await this.getUserData();
    const level = userData.level;
    
    return {
      ...userData,
      progress: this.getProgressToNextLevel(userData.totalXP),
      xpToNextLevel: this.getXPForLevel(level + 1) - userData.totalXP,
      xpForCurrentLevel: this.getXPForLevel(level),
      xpForNextLevel: this.getXPForLevel(level + 1),
      unlockedRewards: Object.entries(this.rewards)
        .filter(([reqLevel]) => level >= parseInt(reqLevel))
        .map(([_, reward]) => reward),
      nextReward: Object.entries(this.rewards)
        .find(([reqLevel]) => level < parseInt(reqLevel))?.[1] || null,
      nextRewardLevel: Object.keys(this.rewards)
        .map(l => parseInt(l))
        .find(l => l > level) || null,
    };
  }

  /**
   * Réinitialise les données (pour debug)
   */
  async resetData() {
    await AsyncStorage.removeItem('user_level_data');
  }
}

export default new LevelService();
