import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service de gestion des niveaux et de l'XP
 * Système de progression INDIVIDUEL par personnage
 */
class LevelService {
  constructor() {
    // Configuration des niveaux
    this.baseXP = 50; // Moins d'XP requis pour progresser plus vite
    this.exponent = 1.3;
    this.maxLevel = 100;
    
    // Titres par niveau (CHAQUE niveau a un titre)
    this.titles = {
      1: 'Inconnu',
      2: 'Nouveau venu',
      3: 'Connaissance',
      4: 'Familier',
      5: 'Ami proche',
      6: 'Confident',
      7: 'Intime',
      8: 'Complice',
      9: 'Âme sœur',
      10: 'Amant',
      15: 'Partenaire',
      20: 'Amoureux',
      25: 'Passionné',
      30: 'Dévoué',
      40: 'Fusionnel',
      50: 'Éternel',
      75: 'Légendaire',
      100: 'Divin',
    };
    
    // Récompenses par niveau - IMAGES EXCLUSIVES
    this.rewards = {
      2: { type: 'image', description: 'Image sexy en lingerie', imageType: 'lingerie' },
      3: { type: 'image', description: 'Image en tenue provocante', imageType: 'provocative' },
      4: { type: 'image', description: 'Image en sous-vêtements', imageType: 'underwear' },
      5: { type: 'image', description: 'Image topless exclusive', imageType: 'topless' },
      6: { type: 'image', description: 'Image nue artistique', imageType: 'artistic_nude' },
      7: { type: 'image', description: 'Image nue sensuelle', imageType: 'sensual_nude' },
      8: { type: 'image', description: 'Image très sexy', imageType: 'very_sexy' },
      9: { type: 'image', description: 'Image érotique exclusive', imageType: 'erotic' },
      10: { type: 'image', description: 'Image ultra-hot', imageType: 'ultra_hot' },
      15: { type: 'image', description: 'Galerie spéciale', imageType: 'special_gallery' },
      20: { type: 'image', description: 'Image personnalisée', imageType: 'custom' },
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
    let title = 'Inconnu';
    for (const [reqLevel, titleName] of Object.entries(this.titles)) {
      if (level >= parseInt(reqLevel)) {
        title = titleName;
      }
    }
    return title;
  }

  /**
   * Charge les données d'un personnage spécifique
   */
  async getCharacterData(characterId) {
    try {
      const allData = await AsyncStorage.getItem('character_levels_data');
      const parsed = allData ? JSON.parse(allData) : {};
      return parsed[characterId] || this.getDefaultCharacterData(characterId);
    } catch (error) {
      console.error('Erreur chargement niveau personnage:', error);
      return this.getDefaultCharacterData(characterId);
    }
  }

  /**
   * Données par défaut pour un personnage
   */
  getDefaultCharacterData(characterId) {
    return {
      characterId,
      totalXP: 0,
      level: 1,
      title: 'Inconnu',
      messagesCount: 0,
      lastActivity: null,
      unlockedImages: [],
    };
  }

  /**
   * Sauvegarde les données d'un personnage
   */
  async saveCharacterData(characterId, data) {
    try {
      const allData = await AsyncStorage.getItem('character_levels_data');
      const parsed = allData ? JSON.parse(allData) : {};
      parsed[characterId] = data;
      await AsyncStorage.setItem('character_levels_data', JSON.stringify(parsed));
    } catch (error) {
      console.error('Erreur sauvegarde niveau personnage:', error);
    }
  }

  /**
   * Charge les données globales utilisateur (pour compatibilité)
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
   * Données par défaut globales
   */
  getDefaultUserData() {
    return {
      totalXP: 0,
      level: 1,
      title: 'Inconnu',
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
   * Sauvegarde les données utilisateur globales
   */
  async saveUserData(data) {
    try {
      await AsyncStorage.setItem('user_level_data', JSON.stringify(data));
    } catch (error) {
      console.error('Erreur sauvegarde niveau:', error);
    }
  }

  /**
   * Ajoute de l'XP pour un personnage spécifique
   */
  async addXPForCharacter(characterId, amount, source = 'message') {
    const charData = await this.getCharacterData(characterId);
    const oldLevel = charData.level;
    
    // Ajouter l'XP
    charData.totalXP += amount;
    charData.messagesCount += 1;
    charData.lastActivity = new Date().toISOString();
    
    // Calculer le nouveau niveau
    const newLevel = this.getLevelFromXP(charData.totalXP);
    charData.level = newLevel;
    charData.title = this.getTitleForLevel(newLevel);
    
    // Sauvegarder
    await this.saveCharacterData(characterId, charData);
    
    // Vérifier si level up
    const leveledUp = newLevel > oldLevel;
    let reward = null;
    if (leveledUp && this.rewards[newLevel]) {
      reward = this.rewards[newLevel];
    }
    
    return {
      xpGained: amount,
      totalXP: charData.totalXP,
      level: newLevel,
      title: charData.title,
      progress: this.getProgressToNextLevel(charData.totalXP),
      xpToNextLevel: this.getXPForLevel(newLevel + 1) - charData.totalXP,
      leveledUp,
      oldLevel,
      newLevel,
      reward,
      characterId,
    };
  }

  /**
   * Ajoute de l'XP (méthode legacy - met à jour global + personnage actuel)
   */
  async addXP(amount, source = 'message', characterId = null) {
    // Si un characterId est fourni, utiliser le nouveau système
    if (characterId) {
      return await this.addXPForCharacter(characterId, amount, source);
    }
    
    // Sinon, comportement legacy
    const userData = await this.getUserData();
    const oldLevel = userData.level;
    
    userData.totalXP += amount;
    userData.messagesCount += 1;
    userData.lastActivity = new Date().toISOString();
    
    await this.checkDailyStreak(userData);
    
    const newLevel = this.getLevelFromXP(userData.totalXP);
    userData.level = newLevel;
    userData.title = this.getTitleForLevel(newLevel);
    
    await this.saveUserData(userData);
    
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
    // XP de base selon la longueur - plus généreux
    let xp = Math.min(20, Math.floor(messageLength / 15) + 2);
    
    // Bonus pour messages plus longs
    if (messageLength > 100) xp += 5;
    if (messageLength > 200) xp += 8;
    
    // Bonus NSFW (conversations plus engagées)
    if (isNSFW) xp = Math.floor(xp * 1.5);
    
    return xp;
  }

  /**
   * Obtient les statistiques pour un personnage spécifique
   */
  async getCharacterStats(characterId) {
    const charData = await this.getCharacterData(characterId);
    const level = charData.level;
    
    return {
      ...charData,
      progress: this.getProgressToNextLevel(charData.totalXP),
      xpToNextLevel: this.getXPForLevel(level + 1) - charData.totalXP,
      xpForCurrentLevel: this.getXPForLevel(level),
      xpForNextLevel: this.getXPForLevel(level + 1),
      unlockedRewards: Object.entries(this.rewards)
        .filter(([reqLevel]) => level >= parseInt(reqLevel))
        .map(([reqLevel, reward]) => ({ ...reward, level: parseInt(reqLevel) })),
      nextReward: Object.entries(this.rewards)
        .find(([reqLevel]) => level < parseInt(reqLevel))?.[1] || null,
      nextRewardLevel: Object.keys(this.rewards)
        .map(l => parseInt(l))
        .find(l => l > level) || null,
    };
  }

  /**
   * Obtient les statistiques complètes (globales)
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
   * Génère le prompt ULTRA-DÉTAILLÉ pour l'image de récompense selon le type
   * Inclut qualité professionnelle et détails anatomiques
   */
  getRewardImagePrompt(imageType, character) {
    // Préfixe selon le genre
    const genderDesc = character?.gender === 'female' 
      ? 'beautiful gorgeous woman, feminine curves, perfect female body'
      : 'handsome attractive man, masculine features, perfect male body';
    
    // Prompts ultra-détaillés par type avec qualité maximale
    const detailedPrompts = {
      // Niveau 2 - Lingerie
      'lingerie': `${genderDesc}, wearing exquisite French lace lingerie set, matching elegant bra and panties with delicate lace patterns, garter belt with silk stockings, seductive confident pose sitting on luxurious bed, soft romantic bedroom lighting, silk sheets, intimate atmosphere, looking at viewer with desire`,
      
      // Niveau 3 - Provocant
      'provocative': `${genderDesc}, wearing sheer see-through negligee, fabric so thin that skin and curves visible underneath, nipples showing through delicate material, provocative teasing pose lying on satin sheets, sensual dim lighting with warm tones, bedroom boudoir setting, seductive inviting expression`,
      
      // Niveau 4 - Sous-vêtements
      'underwear': `${genderDesc}, wearing only tiny elegant thong panties, upper body completely bare and exposed, perfect natural breasts fully visible, confident sensual pose with hands on hips, intimate private bedroom, soft golden hour lighting, artistic composition, nothing hidden`,
      
      // Niveau 5 - Topless
      'topless': `${genderDesc}, topless with beautiful bare breasts fully exposed, perfect natural breast shape, visible nipples, wearing only delicate lace panties and high heels, elegant artistic sensual pose, professional boudoir photography lighting, silk backdrop, confident sexy expression`,
      
      // Niveau 6 - Nu artistique
      'artistic_nude': `${genderDesc}, completely nude artistic full body shot, every curve visible, breasts and full body exposed, elegant sophisticated pose like classical painting, professional studio boudoir lighting, artistic shadows enhancing curves, nothing hidden, natural beauty celebrated`,
      
      // Niveau 7 - Nu sensuel
      'sensual_nude': `${genderDesc}, sensual nude lying naked on luxurious silk sheets, romantic intimate atmosphere, body fully exposed from head to toe, breasts visible, legs slightly parted, soft candlelight and rose petals, passionate loving expression, bedroom setting`,
      
      // Niveau 8 - Très sexy
      'very_sexy': `${genderDesc}, very sexy completely nude pose on bed, legs parted invitingly, full frontal exposure nothing hidden, breasts and intimate areas visible, erotic provocative position, hot passionate atmosphere, bedroom with dim red lighting, intense desire in eyes`,
      
      // Niveau 9 - Érotique
      'erotic': `${genderDesc}, highly erotic nude pose, explicit intimate position with legs spread, everything fully visible and exposed, passionate aroused expression, hot steamy bedroom atmosphere, body glistening, extremely provocative sensual position`,
      
      // Niveau 10 - Ultra hot
      'ultra_hot': `${genderDesc}, maximum erotic nude, most explicit provocative pose possible, legs wide open revealing everything, complete full exposure, intensely sexual position, hot passionate atmosphere, nothing left to imagination, ultimate sensuality`,
      
      // Galerie spéciale
      'special_gallery': `${genderDesc}, exclusive professional erotic nude photoshoot quality, multiple artistic poses implied, full body completely exposed, mix of elegant and provocative positions, professional erotica magazine quality, perfect lighting and composition`,
      
      // Personnalisé
      'custom': `${genderDesc}, personalized intimate nude session, unique creative sexy pose tailored to personality, special private romantic setting, ultimate exposure with artistic flair, deeply personal and sensual atmosphere`,
    };
    
    // Prompt de qualité à ajouter
    const qualityBoost = ', hyper-realistic photograph, 8K ultra HD resolution, professional DSLR camera quality, perfect sharp focus, studio lighting, skin texture visible, photorealistic details, masterpiece quality, award-winning photography';
    
    // Prompt anatomique pour éviter les défauts
    const anatomyBoost = ', anatomically perfect human body, correct proportions, exactly two arms two legs, proper hands with five fingers, symmetrical face, natural body position, single person solo';
    
    const basePrompt = detailedPrompts[imageType] || detailedPrompts['lingerie'];
    return basePrompt + qualityBoost + anatomyBoost;
  }

  /**
   * Enregistre une image de récompense débloquée
   */
  async recordUnlockedImage(characterId, level, imageUrl) {
    const charData = await this.getCharacterData(characterId);
    if (!charData.unlockedImages) {
      charData.unlockedImages = [];
    }
    charData.unlockedImages.push({
      level,
      imageUrl,
      unlockedAt: new Date().toISOString(),
    });
    await this.saveCharacterData(characterId, charData);
  }

  /**
   * Réinitialise les données (pour debug)
   */
  async resetData() {
    await AsyncStorage.removeItem('user_level_data');
    await AsyncStorage.removeItem('character_levels_data');
  }
}

export default new LevelService();
