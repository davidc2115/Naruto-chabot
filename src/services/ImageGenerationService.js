import axios from 'axios';
import CustomImageAPIService from './CustomImageAPIService';
import StableDiffusionLocalService from './StableDiffusionLocalService';

/**
 * Service de génération d'images - VERSION 2.4.0
 * Amélioré pour:
 * - Plus de RÉALISME (priorité aux styles photo-réalistes)
 * - Vrai mode NSFW (tenues sexy, lingerie, déshabillé, etc.)
 * - Meilleure gestion des erreurs
 */
class ImageGenerationService {
  constructor() {
    this.baseURL = 'https://image.pollinations.ai/prompt/';
    this.lastRequestTime = 0;
    this.minDelay = 3000;
    this.maxRetries = 3;
    
    // STYLES - Priorité RÉALISME (80% réaliste, 20% anime)
    this.realisticStyles = [
      'ultra photorealistic, DSLR photo, professional photography, 8K',
      'hyperrealistic photograph, Canon EOS R5, studio lighting',
      'photorealistic portrait, high-end fashion photography',
      'realistic photo, professional model shoot, magazine quality',
      'lifelike photography, detailed skin texture, realistic lighting',
    ];
    
    this.animeStyles = [
      'anime style, high quality anime art',
      'semi-realistic anime, detailed anime illustration',
    ];
    
    // TENUES NSFW - Plus variées et explicites
    this.nsfwOutfitsSexy = [
      'wearing sexy black lace lingerie, see-through bra',
      'wearing red silk lingerie set, matching bra and panties',
      'wearing white lace bodysuit, revealing',
      'wearing sheer negligee, transparent fabric',
      'wearing sexy corset, push-up effect',
      'wearing tiny bikini, string bikini',
      'wearing crop top and mini skirt, no bra',
      'wearing oversized shirt only, no pants, shirt barely covering',
    ];
    
    this.nsfwOutfitsRevealing = [
      'topless, bare breasts visible, wearing only panties',
      'wearing open robe, chest exposed, silk robe',
      'nude with strategic covering, artistic nudity',
      'wearing only towel, loosely wrapped, about to fall',
      'completely nude, full body visible, tasteful pose',
      'wearing unbuttoned shirt, breasts partially visible',
      'braless under thin white shirt, nipples visible through fabric',
      'wearing thong only, topless from behind',
    ];
    
    // POSTURES NSFW - Plus sensuelles
    this.nsfwPoses = [
      'lying seductively on silk bed sheets, inviting pose',
      'sitting on bed edge, legs spread slightly, leaning forward',
      'on all fours on bed, looking back over shoulder',
      'standing against wall, one leg raised, sensual',
      'lying on back, arms above head, vulnerable pose',
      'kneeling on bed, hands on thighs, submissive',
      'bending over, looking back seductively',
      'straddling pose, confident and dominant',
      'lounging on couch, legs open, relaxed sensual',
      'stretching, back arched, body fully displayed',
    ];
    
    // AMBIANCES NSFW
    this.nsfwSettings = [
      'luxury bedroom, silk sheets, candlelight, romantic',
      'hotel room, mood lighting, intimate atmosphere',
      'bathroom, steam, wet skin, shower scene',
      'private pool, wet body, sun-kissed skin',
      'boudoir setting, vintage glamour, soft focus',
    ];
  }

  /**
   * Choisit un style avec priorité au réalisme
   */
  getRandomStyle(preferRealistic = true) {
    if (preferRealistic) {
      // 85% réaliste, 15% anime
      if (Math.random() < 0.85) {
        return this.realisticStyles[Math.floor(Math.random() * this.realisticStyles.length)];
      }
    }
    return this.animeStyles[Math.floor(Math.random() * this.animeStyles.length)];
  }

  /**
   * Description physique détaillée
   */
  buildPhysicalDescription(character) {
    let desc = '';
    
    // Genre
    if (character.gender === 'female') {
      desc += 'beautiful woman, female';
    } else if (character.gender === 'male') {
      desc += 'handsome man, male';
    } else {
      desc += 'attractive person';
    }
    
    // Âge
    desc += `, ${character.age} years old, adult`;
    
    // Cheveux
    if (character.hairColor) {
      desc += `, ${character.hairColor} hair`;
    }
    
    // Apparence
    if (character.appearance) {
      const app = character.appearance.substring(0, 300);
      desc += `, ${app}`;
    }
    
    return desc;
  }

  /**
   * Description anatomique (poitrine, physique)
   */
  buildAnatomyDescription(character) {
    let anatomy = '';
    
    if (character.gender === 'female' && character.bust) {
      const bustMap = {
        'A': 'small breasts, petite chest, A cup',
        'B': 'small breasts, modest bust, B cup',
        'C': 'medium breasts, natural bust, C cup, nice cleavage',
        'D': 'large breasts, big bust, D cup, prominent cleavage, voluptuous',
        'DD': 'very large breasts, huge bust, DD cup, deep cleavage, very voluptuous',
        'E': 'huge breasts, massive bust, E cup, extreme cleavage',
        'F': 'enormous breasts, gigantic bust, F cup',
        'G': 'gigantic breasts, massive chest, G cup',
      };
      anatomy += `, ${bustMap[character.bust] || bustMap['C']}`;
    }
    
    if (character.gender === 'male') {
      anatomy += ', muscular build, athletic body, defined muscles';
    }
    
    return anatomy;
  }

  /**
   * MODE NSFW COMPLET - Vraiment sexy et explicite
   */
  buildNSFWPrompt(character, level = 'sexy') {
    let nsfw = '';
    
    // Choisir tenue selon le niveau
    let outfits = level === 'revealing' ? this.nsfwOutfitsRevealing : this.nsfwOutfitsSexy;
    const randomOutfit = outfits[Math.floor(Math.random() * outfits.length)];
    nsfw += `, ${randomOutfit}`;
    
    // Pose aléatoire
    const randomPose = this.nsfwPoses[Math.floor(Math.random() * this.nsfwPoses.length)];
    nsfw += `, ${randomPose}`;
    
    // Ambiance
    const randomSetting = this.nsfwSettings[Math.floor(Math.random() * this.nsfwSettings.length)];
    nsfw += `, ${randomSetting}`;
    
    // Attributs sensuels
    if (character.gender === 'female') {
      nsfw += ', seductive expression, bedroom eyes, pouty lips';
      nsfw += ', smooth flawless skin, curves emphasized';
      nsfw += ', sensual lighting highlighting body';
      
      // Emphase poitrine si grande
      if (character.bust && ['D', 'DD', 'E', 'F', 'G'].includes(character.bust)) {
        nsfw += ', cleavage prominently displayed, breasts emphasized';
        nsfw += ', bust as focal point, chest highlighted';
      }
    } else {
      nsfw += ', confident seductive look, intense gaze';
      nsfw += ', muscles defined, masculine appeal';
      nsfw += ', dramatic lighting on body';
    }
    
    // Qualité
    nsfw += ', professional erotic photography, high-end boudoir';
    nsfw += ', soft sensual lighting, intimate atmosphere';
    nsfw += ', tasteful but explicit, sexy and alluring';
    
    return nsfw;
  }

  /**
   * Mode SFW
   */
  buildSFWPrompt(character) {
    let sfw = ', fully clothed, appropriate attire, casual outfit';
    sfw += ', natural pose, friendly expression';
    sfw += ', clean background, natural lighting';
    return sfw;
  }

  /**
   * Génère image de profil
   */
  async generateCharacterImage(character, userProfile = null) {
    if (character.age < 18) {
      throw new Error('Génération désactivée pour les mineurs');
    }

    const isNSFW = userProfile?.nsfwMode && userProfile?.isAdult;
    const isSpicy = userProfile?.spicyMode && userProfile?.isAdult;

    let prompt = '';
    
    // Style réaliste prioritaire
    prompt += this.getRandomStyle(true);
    
    // Description physique
    prompt += ', ' + this.buildPhysicalDescription(character);
    
    // Anatomie
    prompt += this.buildAnatomyDescription(character);
    
    // Mode NSFW/Spicy ou SFW
    if (isSpicy) {
      // Mode Spicy = plus explicite
      prompt += this.buildNSFWPrompt(character, 'revealing');
      console.log('🔥 Mode SPICY activé - Images explicites');
    } else if (isNSFW) {
      // Mode NSFW = sexy mais moins explicite
      prompt += this.buildNSFWPrompt(character, 'sexy');
      console.log('💕 Mode NSFW activé - Images sexy');
    } else {
      prompt += this.buildSFWPrompt(character);
    }
    
    // Qualité
    prompt += ', ultra detailed, sharp focus, professional quality';
    prompt += ', adult 18+, mature';

    console.log('🖼️ Prompt image:', prompt.substring(0, 400));
    return await this.generateImage(prompt);
  }

  /**
   * Génère image de scène (conversation)
   */
  async generateSceneImage(character, userProfile = null, recentMessages = []) {
    if (character.age < 18) {
      throw new Error('Génération désactivée pour les mineurs');
    }

    const isNSFW = userProfile?.nsfwMode && userProfile?.isAdult;
    const isSpicy = userProfile?.spicyMode && userProfile?.isAdult;

    let prompt = '';
    
    // Style réaliste prioritaire
    prompt += this.getRandomStyle(true);
    
    // Description physique
    prompt += ', ' + this.buildPhysicalDescription(character);
    
    // Anatomie
    prompt += this.buildAnatomyDescription(character);
    
    // Détecter tenue dans la conversation
    const detectedOutfit = this.detectOutfit(recentMessages);
    if (detectedOutfit) {
      prompt += `, wearing ${detectedOutfit}`;
      console.log('👗 Tenue détectée:', detectedOutfit);
    } else if (isSpicy) {
      // Mode Spicy = plus explicite
      prompt += this.buildNSFWPrompt(character, 'revealing');
      console.log('🔥 Mode SPICY - Image explicite');
    } else if (isNSFW) {
      prompt += this.buildNSFWPrompt(character, 'sexy');
      console.log('💕 Mode NSFW - Image sexy');
    } else {
      prompt += this.buildSFWPrompt(character);
    }
    
    // Qualité
    prompt += ', ultra detailed, sharp focus, professional quality';
    prompt += ', adult 18+, mature';

    console.log('🖼️ Prompt scène:', prompt.substring(0, 400));
    return await this.generateImage(prompt);
  }

  /**
   * Détecte une tenue mentionnée dans les messages
   */
  detectOutfit(messages) {
    const keywords = [
      'lingerie', 'underwear', 'bra', 'panties', 'bikini', 'nude', 'naked',
      'topless', 'robe', 'dress', 'skirt', 'shorts', 'jeans', 'shirt',
      'déshabillé', 'nue', 'seins', 'string', 'culotte', 'soutien-gorge'
    ];

    const text = messages.slice(-5).map(m => m.content).join(' ').toLowerCase();
    
    for (const kw of keywords) {
      if (text.includes(kw)) {
        // Extraire le contexte autour du mot-clé
        const regex = new RegExp(`([\\w\\s]{0,30}${kw}[\\w\\s]{0,30})`, 'i');
        const match = text.match(regex);
        if (match) return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Rate limiting
   */
  async waitForRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minDelay) {
      await new Promise(r => setTimeout(r, this.minDelay - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Génération principale
   */
  async generateImage(prompt) {
    await CustomImageAPIService.loadConfig();
    const strategy = CustomImageAPIService.getStrategy();
    
    console.log(`🎨 Stratégie: ${strategy}`);
    
    const seed = Date.now() + Math.floor(Math.random() * 10000);
    
    // SD LOCAL - Génération sur smartphone
    if (strategy === 'local') {
      try {
        console.log('📱 Tentative génération SD Local...');
        const availability = await StableDiffusionLocalService.checkAvailability();
        
        if (availability.modelDownloaded) {
          const result = await StableDiffusionLocalService.generateImage(prompt, {
            width: 512,
            height: 512,
            seed,
            steps: 4,
          });
          
          if (result.imageUrl) {
            console.log('✅ SD Local: Image générée via fallback');
            return result.imageUrl;
          }
          if (result.imageBase64) {
            console.log('✅ SD Local: Image générée localement');
            return `data:image/png;base64,${result.imageBase64}`;
          }
        } else {
          console.log('⚠️ SD Local: Modèle non téléchargé, fallback Pollinations');
        }
      } catch (error) {
        console.log('⚠️ SD Local échoué:', error.message, '- fallback Pollinations');
      }
    }
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Freebox en premier si configuré
        if ((strategy === 'freebox-first' || strategy === 'freebox-only') && CustomImageAPIService.hasCustomApi()) {
          try {
            console.log('🏠 Tentative Freebox...');
            const url = CustomImageAPIService.buildImageUrl(prompt, { width: 768, height: 768, seed });
            return url;
          } catch (e) {
            console.log('⚠️ Freebox échoué:', e.message);
            if (strategy === 'freebox-only') throw e;
          }
        }
        
        // Pollinations
        console.log('🌐 Génération Pollinations...');
        await this.waitForRateLimit();
        
        // Tronquer si trop long
        let finalPrompt = prompt;
        if (prompt.length > 1500) {
          finalPrompt = prompt.substring(0, 1500);
        }
        
        const encoded = encodeURIComponent(finalPrompt);
        const url = `${this.baseURL}${encoded}?width=768&height=768&model=flux&nologo=true&seed=${seed}`;
        
        // Attendre génération
        await new Promise(r => setTimeout(r, 2000));
        
        console.log('✅ URL générée');
        return url;
        
      } catch (error) {
        console.error(`❌ Tentative ${attempt}:`, error.message);
        if (attempt === this.maxRetries) throw error;
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }
}

export default new ImageGenerationService();
