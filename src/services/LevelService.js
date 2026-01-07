import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageGenerationService from './ImageGenerationService';
import GalleryService from './GalleryService';

/**
 * Service de gestion des niveaux - VERSION 2.7.0
 * 
 * Système de niveaux avec paliers d'XP progressifs
 * + Génération d'image sexy à chaque nouveau niveau
 */
class LevelService {
  constructor() {
    // Paliers d'XP pour chaque niveau
    // Niveau 1: 0 XP, Niveau 2: 10 XP, Niveau 3: 30 XP, etc.
    this.levelThresholds = {
      1: 0,
      2: 10,
      3: 30,
      4: 60,
      5: 100,
      6: 150,
      7: 220,
      8: 300,
      9: 400,
      10: 520,
      11: 660,
      12: 820,
      13: 1000,
      14: 1200,
      15: 1450,
      16: 1750,
      17: 2100,
      18: 2500,
      19: 3000,
      20: 3600,
      // Niveaux 21+ : +700 XP par niveau
    };
    
    // Tenues de plus en plus révélatrices selon le niveau
    this.levelOutfits = {
      2: 'wearing elegant dress, showing legs',
      3: 'wearing tight cocktail dress, low neckline',
      4: 'wearing mini skirt and crop top, midriff showing',
      5: 'wearing bikini on beach, wet skin',
      6: 'wearing sexy red lingerie set',
      7: 'wearing black lace lingerie, stockings',
      8: 'wearing sheer negligee, visible silhouette',
      9: 'wearing tiny string bikini, sensual pose',
      10: 'wearing only lace bra and panties, seductive',
      11: 'topless, covering with hands, playful',
      12: 'wearing open robe, lingerie underneath',
      13: 'nude artistic pose, strategic covering',
      14: 'nude lying on silk sheets, seductive',
      15: 'fully nude, confident sensual pose',
      // 16+ : même chose que 15, mais avec variations de poses
    };
    
    // Poses de plus en plus intimes
    this.levelPoses = {
      2: 'standing elegantly, friendly smile',
      3: 'sitting with crossed legs, flirty expression',
      4: 'leaning forward, showing cleavage',
      5: 'lying on beach, relaxed pose',
      6: 'lying on bed, seductive gaze',
      7: 'kneeling on bed, looking up',
      8: 'lying on side, curves emphasized',
      9: 'standing against wall, hip tilted',
      10: 'lying seductively, bedroom eyes',
      11: 'playful pose, hands covering',
      12: 'sensual reclined pose',
      13: 'artistic nude pose, elegant',
      14: 'intimate pose on bed',
      15: 'confident sensual full body pose',
    };
  }

  /**
   * Calcule le niveau à partir de l'XP
   */
  calculateLevel(experience) {
    let level = 1;
    
    // Vérifier les seuils définis
    for (let lv = 20; lv >= 1; lv--) {
      if (experience >= this.levelThresholds[lv]) {
        level = lv;
        break;
      }
    }
    
    // Niveaux au-delà de 20
    if (experience >= this.levelThresholds[20]) {
      const extraXp = experience - this.levelThresholds[20];
      level = 20 + Math.floor(extraXp / 700);
    }
    
    return level;
  }

  /**
   * Calcule l'XP nécessaire pour le prochain niveau
   */
  getXpForNextLevel(currentLevel) {
    if (currentLevel < 20) {
      return this.levelThresholds[currentLevel + 1];
    }
    // Après niveau 20: +700 XP par niveau
    return this.levelThresholds[20] + (currentLevel - 19) * 700;
  }

  /**
   * Calcule la progression vers le prochain niveau (0-100%)
   */
  getProgressToNextLevel(experience) {
    const currentLevel = this.calculateLevel(experience);
    const currentThreshold = currentLevel <= 20 
      ? this.levelThresholds[currentLevel]
      : this.levelThresholds[20] + (currentLevel - 20) * 700;
    const nextThreshold = this.getXpForNextLevel(currentLevel);
    
    const progress = ((experience - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(100, Math.max(0, progress));
  }

  /**
   * Calcule le gain d'XP pour un message
   */
  calculateXpGain(message, character, userProfile) {
    let baseXp = 5; // XP de base
    
    // Bonus pour longueur du message
    const length = message.length;
    if (length > 50) baseXp += 2;
    if (length > 100) baseXp += 3;
    if (length > 200) baseXp += 5;
    
    // Bonus pour interactions positives
    const positive = ['merci', 'super', 'génial', 'aime', 'adore', 'parfait', 
                      'excellent', 'oui', 'bien', 'magnifique', 'belle', 'beau',
                      '❤', '💕', '😍', '🥰', '😘'];
    const lower = message.toLowerCase();
    positive.forEach(word => {
      if (lower.includes(word)) baseXp += 1;
    });
    
    // Bonus mode NSFW/Spicy
    if (userProfile?.spicyMode) baseXp += 3;
    else if (userProfile?.nsfwMode) baseXp += 2;
    
    return Math.min(baseXp, 20); // Max 20 XP par message
  }

  /**
   * Met à jour la relation et vérifie le changement de niveau
   */
  async updateRelationship(relationship, xpGain, character, userProfile) {
    const oldLevel = relationship.level;
    const newXp = relationship.experience + xpGain;
    const newLevel = this.calculateLevel(newXp);
    
    const updatedRelationship = {
      ...relationship,
      experience: newXp,
      level: newLevel,
      interactions: relationship.interactions + 1,
    };
    
    // Vérifier si on a monté de niveau
    const leveledUp = newLevel > oldLevel;
    let levelUpImage = null;
    
    if (leveledUp) {
      console.log(`🎉 LEVEL UP! ${oldLevel} → ${newLevel}`);
      
      // Générer une image pour le nouveau niveau
      try {
        levelUpImage = await this.generateLevelUpImage(newLevel, character, userProfile);
        
        // Sauvegarder dans la galerie
        if (levelUpImage && character.id) {
          await GalleryService.saveImageToGallery(character.id, levelUpImage);
        }
      } catch (error) {
        console.error('Erreur génération image level up:', error);
      }
    }
    
    return {
      relationship: updatedRelationship,
      leveledUp,
      oldLevel,
      newLevel,
      levelUpImage,
    };
  }

  /**
   * Génère une image sexy pour le nouveau niveau
   */
  async generateLevelUpImage(level, character, userProfile) {
    console.log(`🎨 Génération image niveau ${level}...`);
    
    // Choisir la tenue selon le niveau
    const outfit = this.levelOutfits[Math.min(level, 15)] || this.levelOutfits[15];
    const pose = this.levelPoses[Math.min(level, 15)] || this.levelPoses[15];
    
    // Construire le prompt
    const age = Math.max(character.age || 25, 18);
    const gender = character.gender === 'female' ? 'beautiful woman' : 'handsome man';
    
    let prompt = `ultra photorealistic, DSLR photo, ${gender}, ${age} years old`;
    
    if (character.hairColor) prompt += `, ${character.hairColor} hair`;
    if (character.appearance) {
      prompt += `, ${character.appearance.substring(0, 100)}`;
    }
    
    prompt += `, ${outfit}, ${pose}`;
    prompt += ', seductive expression, intimate lighting, romantic atmosphere';
    prompt += ', high quality, detailed, sharp focus, professional photography';
    
    console.log('📝 Prompt level-up:', prompt.substring(0, 100) + '...');
    
    // Générer l'image avec le profil NSFW forcé pour les récompenses de niveau
    const nsfwProfile = { ...userProfile, nsfwMode: true, spicyMode: level >= 10 };
    
    return await ImageGenerationService.generateImage(
      prompt, 
      'low quality, blurry, distorted, ugly, bad anatomy',
      nsfwProfile
    );
  }

  /**
   * Retourne les infos de niveau formatées
   */
  getLevelInfo(experience) {
    const level = this.calculateLevel(experience);
    const progress = this.getProgressToNextLevel(experience);
    const xpForNext = this.getXpForNextLevel(level);
    const currentThreshold = level <= 20 
      ? this.levelThresholds[level]
      : this.levelThresholds[20] + (level - 20) * 700;
    
    return {
      level,
      experience,
      progress: Math.round(progress),
      xpCurrent: experience - currentThreshold,
      xpNeeded: xpForNext - currentThreshold,
      xpTotal: xpForNext,
    };
  }
}

export default new LevelService();
