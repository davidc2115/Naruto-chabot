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
    
    // v5.3.69 - Récompenses par niveau - IMAGES EXCLUSIVES avec descriptions explicites
    this.rewards = {
      2: { type: 'image', description: '🔥 Image sexy en lingerie provocante', imageType: 'lingerie', nsfwLevel: 2 },
      3: { type: 'image', description: '💋 Image en tenue très provocante', imageType: 'provocative', nsfwLevel: 3 },
      4: { type: 'image', description: '🩲 Image en sous-vêtements sexy', imageType: 'underwear', nsfwLevel: 3 },
      5: { type: 'image', description: '👙 Image topless exclusive', imageType: 'topless', nsfwLevel: 4 },
      6: { type: 'image', description: '🔞 Image nue artistique', imageType: 'artistic_nude', nsfwLevel: 4 },
      7: { type: 'image', description: '💕 Image nue sensuelle', imageType: 'sensual_nude', nsfwLevel: 5 },
      8: { type: 'image', description: '🔥 Image très sexy et explicite', imageType: 'very_sexy', nsfwLevel: 5 },
      9: { type: 'image', description: '💦 Image érotique exclusive', imageType: 'erotic', nsfwLevel: 5 },
      10: { type: 'image', description: '🌶️ Image ultra-hot sans censure', imageType: 'ultra_hot', nsfwLevel: 5 },
      15: { type: 'image', description: '✨ Galerie spéciale exclusive', imageType: 'special_gallery', nsfwLevel: 5 },
      20: { type: 'image', description: '⭐ Image personnalisée ultime', imageType: 'custom', nsfwLevel: 5 },
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
   * MAINTENANT AVEC GRANDE VARIÉTÉ - Plusieurs options par type
   */
  getRewardImagePrompt(imageType, character) {
    // Préfixe selon le genre
    const genderDesc = character?.gender === 'female' 
      ? 'beautiful gorgeous woman, feminine curves, perfect female body'
      : 'handsome attractive man, masculine features, perfect male body';
    
    // Lieux variés pour les récompenses
    const rewardLocations = [
      'in luxurious master bedroom with silk sheets',
      'in marble bathroom, steam rising',
      'by infinity pool at sunset',
      'on private yacht deck',
      'in penthouse with city night view',
      'on fur rug near fireplace',
      'in tropical private beach bungalow',
      'in modern minimalist studio',
      'in vintage boudoir with velvet furniture',
      'in candlelit spa room',
    ];
    
    // Éclairages variés
    const rewardLighting = [
      'soft romantic golden hour lighting',
      'dramatic chiaroscuro studio lighting',
      'warm candlelight glow',
      'natural window sunlight',
      'pink and blue neon aesthetic',
      'fireplace warm flickering light',
      'moonlight through sheer curtains',
      'professional softbox photography lighting',
    ];
    
    // Sélection aléatoire
    const location = rewardLocations[Math.floor(Math.random() * rewardLocations.length)];
    const lighting = rewardLighting[Math.floor(Math.random() * rewardLighting.length)];
    
    // Prompts ultra-détaillés par type avec VARIÉTÉ - Plusieurs options chacun
    const promptVariations = {
      // Niveau 2 - Lingerie - 6 VARIATIONS
      'lingerie': [
        `${genderDesc}, wearing exquisite French lace lingerie set, matching elegant bra and panties, garter belt with silk stockings, ${location}, ${lighting}, seductive confident pose`,
        `${genderDesc}, wearing red satin lingerie, push-up bra emphasizing cleavage, lace thong, ${location}, ${lighting}, lying seductively on bed`,
        `${genderDesc}, wearing black velvet lingerie set, strappy details, ${location}, ${lighting}, standing by mirror admiring reflection`,
        `${genderDesc}, wearing white bridal lingerie, innocent yet sexy, sheer fabric, ${location}, ${lighting}, sitting elegantly`,
        `${genderDesc}, wearing mesh bodysuit over bare skin, provocative peek-a-boo style, ${location}, ${lighting}, confident pose`,
        `${genderDesc}, wearing corset with garter straps, classic burlesque style, ${location}, ${lighting}, glamorous pose`,
      ],
      
      // Niveau 3 - Provocant - 6 VARIATIONS
      'provocative': [
        `${genderDesc}, wearing sheer see-through negligee, body visible through fabric, ${location}, ${lighting}, provocative teasing pose`,
        `${genderDesc}, wearing wet white t-shirt clinging to body, everything visible underneath, ${location}, ${lighting}, playful pose`,
        `${genderDesc}, wearing open silk robe with nothing underneath, barely covered, ${location}, ${lighting}, sensual standing pose`,
        `${genderDesc}, wearing fishnet dress over lingerie, skin visible through mesh, ${location}, ${lighting}, confident strut`,
        `${genderDesc}, wearing backless dress with side cutouts, daring fashion, ${location}, ${lighting}, elegant turn`,
        `${genderDesc}, wearing oversized shirt unbuttoned, hints of bare body, ${location}, ${lighting}, casual morning pose`,
      ],
      
      // Niveau 4 - Sous-vêtements/Topless - 6 VARIATIONS
      'underwear': [
        `${genderDesc}, topless wearing only tiny thong panties, bare breasts visible, ${location}, ${lighting}, confident pose hands on hips`,
        `${genderDesc}, nude from waist up wearing only jeans unbuttoned, casual sexy, ${location}, ${lighting}, relaxed standing`,
        `${genderDesc}, topless in shower steam, wearing only bikini bottom, wet body, ${location}, ${lighting}, sensual`,
        `${genderDesc}, bare chested holding sheet across hips, just woke up look, ${location}, ${lighting}, sleepy sexy`,
        `${genderDesc}, topless wearing garter belt and stockings only, classic boudoir, ${location}, ${lighting}, sitting on bed edge`,
        `${genderDesc}, nude torso wearing only heels and jewelry, glamorous, ${location}, ${lighting}, standing profile`,
      ],
      
      // Niveau 5 - Topless explicite - 6 VARIATIONS
      'topless': [
        `${genderDesc}, topless with breasts fully exposed, perfect natural shape, ${location}, ${lighting}, elegant artistic pose`,
        `${genderDesc}, bare breasted kneeling on bed, hands in hair, ${location}, ${lighting}, sensual expression`,
        `${genderDesc}, topless stretching arms up, body elongated, ${location}, ${lighting}, morning stretch`,
        `${genderDesc}, nude from waist up in bathtub, bubbles partially covering, ${location}, ${lighting}, relaxed`,
        `${genderDesc}, topless by pool, water glistening on skin, ${location}, ${lighting}, sun-kissed`,
        `${genderDesc}, bare chested lying on fur rug, glamour style, ${location}, ${lighting}, vintage pose`,
      ],
      
      // Niveau 6 - Nu artistique - 6 VARIATIONS
      'artistic_nude': [
        `${genderDesc}, completely nude artistic full body, classical painting pose, ${location}, ${lighting}, shadows enhancing curves`,
        `${genderDesc}, fully naked by window, natural light silhouette, ${location}, ${lighting}, ethereal beauty`,
        `${genderDesc}, nude on silk sheets, elegant reclining pose, ${location}, ${lighting}, nothing hidden`,
        `${genderDesc}, completely bare in mirror reflection, artistic composition, ${location}, ${lighting}, confident`,
        `${genderDesc}, naked kneeling meditation pose, peaceful sensuality, ${location}, ${lighting}, serene`,
        `${genderDesc}, artistic nude standing back view, spine and curves visible, ${location}, ${lighting}, elegant`,
      ],
      
      // Niveau 7 - Nu sensuel - 6 VARIATIONS
      'sensual_nude': [
        `${genderDesc}, sensual nude lying on luxurious silk sheets, ${location}, ${lighting}, romantic atmosphere`,
        `${genderDesc}, naked body glistening with massage oil, ${location}, ${lighting}, sensual relaxation`,
        `${genderDesc}, nude in candlelit bath with rose petals, ${location}, ${lighting}, romantic`,
        `${genderDesc}, completely bare stretching on bed, morning sensuality, ${location}, ${lighting}, natural`,
        `${genderDesc}, naked cuddling soft pillow, vulnerable intimate, ${location}, ${lighting}, tender`,
        `${genderDesc}, fully nude in hot tub steam, relaxed sensual, ${location}, ${lighting}, steamy`,
      ],
      
      // Niveau 8 - Très sexy - 6 VARIATIONS
      'very_sexy': [
        `${genderDesc}, very sexy nude on bed, legs parted invitingly, ${location}, ${lighting}, erotic atmosphere`,
        `${genderDesc}, completely naked on hands and knees, looking back seductively, ${location}, ${lighting}, provocative`,
        `${genderDesc}, nude spread on leather couch, confident display, ${location}, ${lighting}, bold`,
        `${genderDesc}, naked in shower with water streaming, everything visible, ${location}, ${lighting}, wet body`,
        `${genderDesc}, fully bare bent over vanity, rear view emphasized, ${location}, ${lighting}, teasing`,
        `${genderDesc}, completely nude legs spread in chair, inviting pose, ${location}, ${lighting}, hot`,
      ],
      
      // Niveau 9 - Érotique - 6 VARIATIONS
      'erotic': [
        `${genderDesc}, highly erotic nude, legs spread wide, everything exposed, ${location}, ${lighting}, passionate`,
        `${genderDesc}, explicit nude position on bed, nothing hidden, ${location}, ${lighting}, intense desire`,
        `${genderDesc}, naked spread eagle fully revealed, ${location}, ${lighting}, maximum intimacy`,
        `${genderDesc}, erotic nude bent forward, rear exposed, ${location}, ${lighting}, provocative view`,
        `${genderDesc}, completely open nude pose, legs high, ${location}, ${lighting}, explicit sensuality`,
        `${genderDesc}, ultimate exposure nude kneeling, everything visible, ${location}, ${lighting}, erotic`,
      ],
      
      // Niveau 10 - Ultra hot - 6 VARIATIONS
      'ultra_hot': [
        `${genderDesc}, maximum erotic nude, most explicit pose, legs wide revealing all, ${location}, ${lighting}, ultimate sensuality`,
        `${genderDesc}, extremely explicit nude, complete exposure, nothing hidden, ${location}, ${lighting}, peak eroticism`,
        `${genderDesc}, ultimate sexual pose, full frontal spread, ${location}, ${lighting}, intensely hot`,
        `${genderDesc}, most provocative nude possible, absolute maximum display, ${location}, ${lighting}, passionate`,
        `${genderDesc}, extreme explicit position, everything on show, ${location}, ${lighting}, ultimate intimacy`,
        `${genderDesc}, maximum exposure nude, most revealing pose imaginable, ${location}, ${lighting}, complete vulnerability`,
      ],
      
      // Galerie spéciale - 4 VARIATIONS
      'special_gallery': [
        `${genderDesc}, professional erotic photoshoot, artistic nude poses, ${location}, ${lighting}, magazine quality`,
        `${genderDesc}, exclusive boudoir session, mix of elegant and explicit, ${location}, ${lighting}, high-end erotica`,
        `${genderDesc}, private intimate photography, artistic sensuality, ${location}, ${lighting}, personal collection`,
        `${genderDesc}, luxury nude photoshoot, multiple poses implied, ${location}, ${lighting}, professional quality`,
      ],
      
      // Personnalisé - 4 VARIATIONS
      'custom': [
        `${genderDesc}, personalized intimate nude session, unique creative pose, ${location}, ${lighting}, deeply personal`,
        `${genderDesc}, custom fantasy fulfillment, special request pose, ${location}, ${lighting}, tailored sensuality`,
        `${genderDesc}, exclusive private moment captured, intimate exposure, ${location}, ${lighting}, personal connection`,
        `${genderDesc}, one-of-a-kind erotic pose, special setting, ${location}, ${lighting}, unique experience`,
      ],
    };
    
    // Sélectionner une variation aléatoire
    const variations = promptVariations[imageType] || promptVariations['lingerie'];
    const basePrompt = variations[Math.floor(Math.random() * variations.length)];
    
    // Prompt de qualité à ajouter
    const qualityBoost = ', hyper-realistic photograph, 8K ultra HD resolution, professional DSLR camera quality, perfect sharp focus, studio lighting, skin texture visible, photorealistic details, masterpiece quality, award-winning photography';
    
    // Prompt anatomique pour éviter les défauts
    const anatomyBoost = ', anatomically perfect human body, correct proportions, exactly two arms two legs, proper hands with five fingers, symmetrical face, natural body position, single person solo';
    
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
   * Réinitialise les données d'un personnage spécifique
   */
  async resetCharacterStats(characterId) {
    try {
      const allData = await AsyncStorage.getItem('character_levels_data');
      const parsed = allData ? JSON.parse(allData) : {};
      
      // Réinitialiser les données de ce personnage
      parsed[characterId] = this.getDefaultCharacterData(characterId);
      
      await AsyncStorage.setItem('character_levels_data', JSON.stringify(parsed));
      console.log(`✅ Stats réinitialisées pour ${characterId}`);
      return true;
    } catch (error) {
      console.error('Erreur reset stats personnage:', error);
      return false;
    }
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
