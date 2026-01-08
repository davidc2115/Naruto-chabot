import axios from 'axios';
import CustomImageAPIService from './CustomImageAPIService';
import StableDiffusionLocalService from './StableDiffusionLocalService';

class ImageGenerationService {
  constructor() {
    // URL Freebox par défaut
    this.freeboxURL = 'http://88.174.155.230:33437/generate';
    this.lastRequestTime = 0;
    this.minDelay = 1000;
    this.maxRetries = 3;
    
    // STYLES SÉPARÉS - Anime vs Réaliste
    this.animeStyles = [
      'anime style, anime art, manga illustration, clean lineart, vibrant colors',
      'anime artwork, japanese animation style, cel shading, detailed anime',
      'manga style illustration, anime character design, 2D anime art',
      'high quality anime, beautiful anime art, studio ghibli style',
    ];
    
    this.realisticStyles = [
      'photorealistic portrait photography, professional DSLR photo, 85mm lens',
      'hyper-realistic photograph, studio lighting, high-end fashion photography',
      'ultra-realistic photo, natural lighting, professional portrait',
      'cinematic photography, movie still quality, professional photoshoot',
    ];
    
    // PROMPTS DE QUALITÉ ANATOMIQUE (pour réaliste)
    this.anatomyQualityPrompts = [
      'perfect anatomy, correct human proportions, anatomically correct',
      'proper hand anatomy with five fingers, correct arm proportions',
      'natural body proportions, realistic human figure, proper limb placement',
      'correct facial features, symmetrical face, natural pose',
      'professional model pose, natural body position, balanced composition',
    ];
    
    // PROMPTS NÉGATIFS INTÉGRÉS (ajoutés au prompt pour contrer les défauts)
    this.antiDeformationPrompts = 
      'NOT deformed, NOT distorted, NOT disfigured, NOT mutated, ' +
      'NOT bad anatomy, NOT wrong anatomy, NOT extra limbs, NOT missing limbs, ' +
      'NOT floating limbs, NOT disconnected limbs, NOT malformed hands, ' +
      'NOT extra fingers, NOT missing fingers, NOT fused fingers, ' +
      'NOT too many fingers, NOT mutated hands, NOT bad hands, ' +
      'NOT extra arms, NOT extra legs, NOT duplicate body parts, ' +
      'normal human anatomy, correct proportions, natural pose';
    
    // TENUES NSFW ALÉATOIRES
    this.nsfwOutfits = [
      'wearing sexy lingerie, lace underwear',
      'wearing silk robe, partially open',
      'topless, bare chest visible',
      'wearing only towel',
      'completely nude, artistic nudity',
      'wearing see-through clothing',
      'wearing bikini, swimsuit',
      'lingerie visible under clothing',
    ];
    
    // POSTURES NSFW ALÉATOIRES
    this.nsfwPoses = [
      'lying on bed, seductive pose',
      'sitting elegantly, legs crossed',
      'standing gracefully, hand on hip',
      'kneeling, looking up',
      'arching back, sensual pose',
      'leaning against wall, alluring',
      'reclining on couch, relaxed',
      'stretching, body exposed',
    ];
  }

  /**
   * Choisit un style aléatoire (anime ou réaliste)
   * @returns {Object} { style: string, isRealistic: boolean }
   */
  getRandomStyle() {
    // 50% chance anime, 50% chance réaliste
    const isRealistic = Math.random() > 0.5;
    
    if (isRealistic) {
      const style = this.realisticStyles[Math.floor(Math.random() * this.realisticStyles.length)];
      return { style, isRealistic: true };
    } else {
      const style = this.animeStyles[Math.floor(Math.random() * this.animeStyles.length)];
      return { style, isRealistic: false };
    }
  }

  /**
   * Construit les prompts de qualité pour images réalistes
   */
  buildRealisticQualityPrompts() {
    // Sélectionner plusieurs prompts de qualité anatomique
    const selectedPrompts = [];
    const shuffled = [...this.anatomyQualityPrompts].sort(() => Math.random() - 0.5);
    selectedPrompts.push(shuffled[0], shuffled[1]);
    
    return selectedPrompts.join(', ') + ', ' + this.antiDeformationPrompts;
  }

  /**
   * Construit une description ultra-détaillée des caractéristiques physiques
   */
  buildDetailedPhysicalDescription(character, isRealistic = false) {
    let description = '';
    
    // === GENRE ET BASE ===
    if (character.gender === 'female') {
      if (isRealistic) {
        description += 'beautiful real woman, female human, realistic lady, real person';
      } else {
        description += 'beautiful anime woman, female character, anime lady';
      }
    } else if (character.gender === 'male') {
      if (isRealistic) {
        description += 'handsome real man, male human, realistic gentleman, real person';
      } else {
        description += 'handsome anime man, male character, anime gentleman';
      }
    } else {
      description += 'beautiful person, androgynous';
    }
    
    // === ÂGE PRÉCIS ===
    description += `, ${character.age} years old`;
    if (character.age >= 35 && character.age < 45) {
      description += ', mature adult, experienced, confident';
    } else if (character.age >= 45) {
      description += ', mature, distinguished, elegant';
    } else if (character.age >= 25 && character.age < 35) {
      description += ', young adult, prime of life';
    } else if (character.age >= 18 && character.age < 25) {
      description += ', youthful adult, young adult';
    }
    
    // === CHEVEUX DÉTAILLÉS ===
    const hairColor = character.hairColor || 'brown';
    description += `, ${hairColor} hair`;
    
    const appearance = (character.appearance || '').toLowerCase();
    if (appearance.includes('long') || appearance.includes('longs')) {
      description += ', very long flowing hair reaching lower back';
    } else if (appearance.includes('mi-long') || appearance.includes('shoulder')) {
      description += ', shoulder-length medium hair';
    } else if (appearance.includes('court') || appearance.includes('short')) {
      description += ', short cropped hair';
    } else {
      description += ', medium length hair';
    }
    
    if (appearance.includes('bouclé') || appearance.includes('curly') || appearance.includes('ondulé')) {
      description += ', curly wavy hair with natural curls';
    } else if (appearance.includes('raides') || appearance.includes('straight') || appearance.includes('lisse')) {
      description += ', straight sleek silky hair';
    }
    
    // === MORPHOLOGIE ===
    if (appearance.includes('grande') || appearance.includes('tall')) {
      description += ', tall stature';
    } else if (appearance.includes('petite') || appearance.includes('small')) {
      description += ', petite short stature';
    } else {
      description += ', average height';
    }
    
    if (appearance.includes('musclé') || appearance.includes('muscular') || appearance.includes('athlétique') || appearance.includes('athletic')) {
      description += ', athletic toned fit body with defined muscles';
    } else if (appearance.includes('mince') || appearance.includes('slim') || appearance.includes('élancé') || appearance.includes('slender')) {
      description += ', slim slender lean body';
    } else if (appearance.includes('voluptu') || appearance.includes('curvy') || appearance.includes('généreuses')) {
      description += ', voluptuous curvy full-figured body';
    } else if (appearance.includes('ronde') || appearance.includes('round')) {
      description += ', curvy soft rounded body';
    } else {
      description += ', balanced normal physique';
    }
    
    // === COULEUR DE PEAU ===
    if (appearance.includes('pâle') || appearance.includes('pale') || appearance.includes('porcelaine')) {
      description += ', pale fair porcelain skin';
    } else if (appearance.includes('bronzé') || appearance.includes('tanned') || appearance.includes('doré')) {
      description += ', tanned golden sun-kissed skin';
    } else if (appearance.includes('ébène') || appearance.includes('noire') || appearance.includes('dark') || appearance.includes('noir')) {
      description += ', beautiful dark ebony skin';
    } else if (appearance.includes('caramel') || appearance.includes('métisse') || appearance.includes('mixed')) {
      description += ', warm caramel mixed skin tone';
    } else if (appearance.includes('asiat') || appearance.includes('asian')) {
      description += ', asian light skin tone';
    } else if (appearance.includes('latin') || appearance.includes('olive') || appearance.includes('mediterran')) {
      description += ', mediterranean olive warm skin';
    } else {
      description += ', natural healthy skin';
    }
    
    // === YEUX ===
    if (appearance.includes('yeux bleu') || appearance.includes('blue eyes')) {
      description += ', bright blue eyes';
    } else if (appearance.includes('yeux vert') || appearance.includes('green eyes')) {
      description += ', emerald green eyes';
    } else if (appearance.includes('yeux marron') || appearance.includes('yeux brun') || appearance.includes('brown eyes')) {
      description += ', warm brown eyes';
    } else if (appearance.includes('yeux noi') || appearance.includes('black eyes') || appearance.includes('dark eyes')) {
      description += ', deep dark eyes';
    } else if (appearance.includes('yeux gris') || appearance.includes('grey eyes')) {
      description += ', steel gray eyes';
    } else if (appearance.includes('noisette') || appearance.includes('hazel')) {
      description += ', hazel eyes';
    } else {
      description += ', expressive captivating eyes';
    }
    
    // === TRAITS ADDITIONNELS ===
    if (appearance.includes('taches de rousseur') || appearance.includes('freckles')) {
      description += ', cute freckles on face';
    }
    
    if (appearance.includes('lunettes') || appearance.includes('glasses')) {
      description += ', wearing stylish glasses';
    }
    
    // Pour réaliste: ajouter des détails de peau réaliste
    if (isRealistic) {
      description += ', realistic skin texture, natural skin pores, lifelike appearance';
    }
    
    return description;
  }

  /**
   * Décrit l'anatomie de manière précise
   */
  buildAnatomyDescription(character, isRealistic = false) {
    let anatomy = '';
    
    // === FEMMES - POITRINE ===
    if (character.gender === 'female' && character.bust) {
      const bustDetails = {
        'A': { size: 'small A cup breasts', details: 'petite chest, small perky bust' },
        'B': { size: 'small B cup breasts', details: 'modest bust, small perky breasts' },
        'C': { size: 'medium C cup breasts', details: 'balanced bust, natural medium breasts' },
        'D': { size: 'large D cup breasts', details: 'voluptuous bust, full generous breasts' },
        'DD': { size: 'very large DD cup breasts', details: 'very generous bust, full heavy breasts' },
        'E': { size: 'extremely large E cup breasts', details: 'impressive large bust, massive full breasts' },
        'F': { size: 'huge F cup breasts', details: 'huge voluptuous bust, enormous full breasts' },
        'G': { size: 'gigantic G cup breasts', details: 'gigantic massive bust, colossal breasts' }
      };
      
      const bustInfo = bustDetails[character.bust] || bustDetails['C'];
      anatomy += `, ${bustInfo.size}, ${bustInfo.details}`;
    }
    
    // === HOMMES - PHYSIQUE ===
    if (character.gender === 'male' && character.penis) {
      const penisSize = parseInt(character.penis) || 15;
      
      if (penisSize >= 22) {
        anatomy += ', exceptionally muscular build, very broad shoulders, defined pecs, rock-hard abs';
      } else if (penisSize >= 20) {
        anatomy += ', very muscular athletic build, broad shoulders, six-pack abs';
      } else if (penisSize >= 18) {
        anatomy += ', muscular athletic build, defined chest, toned abs';
      } else {
        anatomy += ', toned athletic build, lean fit physique';
      }
    }
    
    // Pour réaliste: insister sur l'anatomie correcte
    if (isRealistic) {
      anatomy += ', correct human anatomy, proper body proportions, natural limb positions';
      anatomy += ', realistic hands with five fingers each, proper arm length';
    }
    
    return anatomy;
  }

  /**
   * MODE NSFW
   */
  buildNSFWPrompt(character, isRealistic = false) {
    let nsfw = '';
    
    if (character.gender === 'female') {
      nsfw += ', sexy alluring pose, sensual seductive expression, sultry gaze';
      nsfw += ', wearing revealing lingerie, lace underwear, silk intimate wear';
      nsfw += ', lying on luxurious bed, soft romantic lighting';
      nsfw += ', smooth flawless skin, shoulders exposed';
      
      if (character.bust && ['D', 'DD', 'E', 'F', 'G'].includes(character.bust)) {
        nsfw += ', prominent cleavage displayed, bust emphasized';
      }
      
    } else if (character.gender === 'male') {
      nsfw += ', sexy masculine pose, confident seductive look';
      nsfw += ', shirtless bare muscular chest, topless';
      nsfw += ', defined abs, muscular physique highlighted';
    }
    
    if (isRealistic) {
      nsfw += ', professional boudoir photography, high-end intimate photoshoot';
      nsfw += ', tasteful sensual, elegant erotic, artistic';
    } else {
      nsfw += ', beautiful anime art, detailed illustration';
    }
    
    return nsfw;
  }

  /**
   * MODE SFW
   */
  buildSFWPrompt(character, isRealistic = false) {
    let sfw = ', fully clothed, appropriate attire, decent outfit';
    
    const appearance = (character.appearance || '').toLowerCase();
    
    if (appearance.includes('élégant') || appearance.includes('elegant')) {
      sfw += ', elegant sophisticated outfit, classy clothing';
    } else if (appearance.includes('professionnel') || appearance.includes('professional')) {
      sfw += ', professional business attire, formal clothing';
    } else if (appearance.includes('sport') || appearance.includes('athletic')) {
      sfw += ', athletic sportswear, fitness outfit';
    } else {
      sfw += ', casual modern clothing, stylish outfit';
    }
    
    sfw += ', natural confident pose, friendly expression';
    
    if (isRealistic) {
      sfw += ', professional portrait photography, natural lighting, clean background';
    }
    
    return sfw;
  }

  /**
   * Génère l'image du personnage (profil)
   */
  async generateCharacterImage(character, userProfile = null) {
    if (character.age < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    const nsfwMode = userProfile?.nsfwMode && userProfile?.isAdult;

    // Choisir le style (anime ou réaliste)
    const { style, isRealistic } = this.getRandomStyle();
    
    let prompt = style;
    
    // Description physique adaptée au style
    prompt += ', ' + this.buildDetailedPhysicalDescription(character, isRealistic);
    
    // Apparence du personnage
    if (character.appearance) {
      prompt += `, ${character.appearance.replace(/\n/g, ' ').trim()}`;
    }
    
    // Anatomie
    prompt += this.buildAnatomyDescription(character, isRealistic);
    
    // Tenue
    if (character.outfit) {
      prompt += `, wearing: ${character.outfit.replace(/\n/g, ' ').trim()}`;
    }
    
    // Mode NSFW ou SFW
    if (nsfwMode) {
      prompt += this.buildNSFWPrompt(character, isRealistic);
    } else {
      prompt += this.buildSFWPrompt(character, isRealistic);
    }
    
    // QUALITÉ SPÉCIFIQUE AU STYLE
    if (isRealistic) {
      // Prompts anti-déformation pour réaliste
      prompt += ', ' + this.buildRealisticQualityPrompts();
      prompt += ', ultra-high quality photo, 4K resolution, sharp focus, professional photography';
      prompt += ', realistic skin texture, lifelike details, photographic quality';
      prompt += ', single person only, one subject, solo portrait';
    } else {
      // Qualité anime
      prompt += ', masterpiece anime art, best quality illustration, highly detailed';
      prompt += ', clean lines, vibrant colors, professional anime artwork';
      prompt += ', single character, solo, one person';
    }
    
    prompt += ', adult 18+, mature';

    console.log(`🖼️ Génération image profil (${isRealistic ? 'RÉALISTE' : 'ANIME'})...`);
    return await this.generateImage(prompt);
  }

  /**
   * Génère l'image de scène (conversation)
   */
  async generateSceneImage(character, userProfile = null, recentMessages = []) {
    if (character.age < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    const nsfwMode = userProfile?.nsfwMode && userProfile?.isAdult;

    // Choisir le style
    const { style, isRealistic } = this.getRandomStyle();
    
    let prompt = style;
    
    // Description physique
    prompt += ', ' + this.buildDetailedPhysicalDescription(character, isRealistic);
    
    // Apparence
    if (character.appearance) {
      prompt += `, ${character.appearance.replace(/\n/g, ' ').trim()}`;
    }
    
    // Anatomie
    prompt += this.buildAnatomyDescription(character, isRealistic);
    
    // Tenue détectée ou aléatoire
    const detectedOutfit = this.detectOutfit(recentMessages);
    if (detectedOutfit) {
      prompt += `, wearing ${detectedOutfit}`;
    } else if (nsfwMode) {
      const randomOutfit = this.nsfwOutfits[Math.floor(Math.random() * this.nsfwOutfits.length)];
      prompt += `, ${randomOutfit}`;
    }
    
    // Posture si NSFW
    if (nsfwMode) {
      const randomPose = this.nsfwPoses[Math.floor(Math.random() * this.nsfwPoses.length)];
      prompt += `, ${randomPose}`;
    }
    
    // Mode NSFW ou SFW
    if (nsfwMode) {
      prompt += this.buildNSFWPrompt(character, isRealistic);
    } else {
      prompt += this.buildSFWPrompt(character, isRealistic);
    }
    
    // QUALITÉ
    if (isRealistic) {
      prompt += ', ' + this.buildRealisticQualityPrompts();
      prompt += ', ultra-detailed photo, 4K, professional quality, sharp focus';
      prompt += ', single person, solo, one subject';
    } else {
      prompt += ', masterpiece, best quality, highly detailed anime';
      prompt += ', single character, solo';
    }
    
    prompt += ', adult 18+, mature';

    console.log(`🖼️ Génération image conversation (${isRealistic ? 'RÉALISTE' : 'ANIME'})...`);
    return await this.generateImage(prompt);
  }

  /**
   * Détecte une tenue mentionnée dans les messages
   */
  detectOutfit(messages) {
    const outfitKeywords = [
      'robe', 'dress', 'jupe', 'skirt', 'pantalon', 'pants', 'jean', 'jeans',
      'chemise', 'shirt', 'blouse', 't-shirt', 'pull', 'sweater', 'veste', 'jacket',
      'lingerie', 'underwear', 'soutien-gorge', 'bra', 'culotte', 'panties',
      'bikini', 'swimsuit', 'nuisette', 'nightgown', 'pyjama', 'débardeur',
      'costume', 'uniforme', 'uniform', 'tenue', 'outfit'
    ];

    const recentText = messages.slice(-3).map(m => m.content).join(' ').toLowerCase();

    for (const keyword of outfitKeywords) {
      const regex = new RegExp(`([\\w\\s]{0,20}${keyword}[\\w\\s]{0,20})`, 'i');
      const match = recentText.match(regex);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Attend le délai minimum entre les requêtes
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minDelay) {
      const waitTime = this.minDelay - timeSinceLastRequest;
      console.log(`⏳ Attente de ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Génère une image - UNIQUEMENT FREEBOX
   */
  async generateImage(prompt) {
    await CustomImageAPIService.loadConfig();
    
    const strategy = CustomImageAPIService.getStrategy();
    console.log(`🎨 Stratégie de génération: ${strategy}`);
    
    if (strategy === 'local') {
      console.log('📱 Génération locale (SD sur smartphone)...');
      return await this.generateWithLocal(prompt);
    }
    
    console.log('🏠 Génération avec Freebox...');
    return await this.generateWithFreebox(prompt);
  }

  /**
   * Génère une image avec l'API Freebox
   */
  async generateWithFreebox(prompt) {
    console.log('🏠 Génération avec API Freebox...');
    
    await this.waitForRateLimit();
    
    let freeboxUrl = CustomImageAPIService.getApiUrl();
    if (!freeboxUrl) {
      freeboxUrl = this.freeboxURL;
    }
    
    const seed = Date.now() + Math.floor(Math.random() * 10000);
    const encodedPrompt = encodeURIComponent(prompt);
    
    const separator = freeboxUrl.includes('?') ? '&' : '?';
    const imageUrl = `${freeboxUrl}${separator}prompt=${encodedPrompt}&width=768&height=768&seed=${seed}`;
    
    console.log(`🔗 URL Freebox générée (${prompt.length} chars)`);
    
    return imageUrl;
  }

  /**
   * Génère une image avec Stable Diffusion Local
   */
  async generateWithLocal(prompt) {
    console.log('📱 Tentative génération locale SD...');
    
    try {
      const availability = await StableDiffusionLocalService.checkAvailability();
      
      if (!availability.available || !availability.modelDownloaded || !availability.canRunSD) {
        console.log('⚠️ SD Local non disponible - Utilisation de Freebox');
        return await this.generateWithFreebox(prompt);
      }

      const fullPrompt = `${prompt}, masterpiece, best quality, ultra detailed`;
      const negativePrompt = 'deformed, distorted, disfigured, mutated, bad anatomy, wrong anatomy, ' +
        'extra limbs, missing limbs, floating limbs, disconnected limbs, malformed hands, ' +
        'extra fingers, missing fingers, fused fingers, too many fingers, mutated hands, ' +
        'bad hands, extra arms, extra legs, duplicate, low quality, blurry, ugly';

      console.log('🎨 Génération avec SD-Turbo local...');
      
      const result = await StableDiffusionLocalService.generateImage(fullPrompt, {
        negativePrompt,
        steps: 2,
        guidanceScale: 1.0,
      });

      if (result && result.imagePath) {
        console.log('✅ Image générée localement');
        return result.imagePath;
      }
      
      console.log('⚠️ Pas de résultat SD Local, fallback Freebox');
      return await this.generateWithFreebox(prompt);
      
    } catch (error) {
      console.error('❌ Erreur génération locale:', error.message);
      return await this.generateWithFreebox(prompt);
    }
  }
}

export default new ImageGenerationService();
