import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomImageAPIService from './CustomImageAPIService';
import StableDiffusionLocalService from './StableDiffusionLocalService';
import AuthService from './AuthService';

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
    
    // PROMPTS DE QUALITÉ ANATOMIQUE RENFORCÉS
    this.anatomyQualityPrompts = [
      'perfect human anatomy, medically correct body proportions, anatomically accurate',
      'exactly two arms, exactly two legs, proper limb attachment points',
      'proper hand anatomy with exactly five fingers on each hand, correct finger length',
      'natural body proportions, realistic human figure, proper skeletal structure',
      'correct facial features, symmetrical face, natural expression, proper eye placement',
      'professional model pose, natural body position, balanced composition, stable stance',
      'single complete human body, one head, two eyes, one nose, one mouth',
    ];
    
    // PROMPTS NÉGATIFS INTÉGRÉS RENFORCÉS
    this.antiDeformationPrompts = 
      'NOT deformed, NOT distorted, NOT disfigured, NOT mutated, NOT ugly, ' +
      'NOT bad anatomy, NOT wrong anatomy, NOT anatomical errors, ' +
      'NOT extra limbs, NOT missing limbs, NOT three arms, NOT four arms, ' +
      'NOT three legs, NOT four legs, NOT extra body parts, ' +
      'NOT floating limbs, NOT disconnected limbs, NOT merged limbs, ' +
      'NOT malformed hands, NOT twisted hands, NOT backwards hands, ' +
      'NOT extra fingers, NOT missing fingers, NOT fused fingers, NOT six fingers, ' +
      'NOT too many fingers, NOT mutated hands, NOT bad hands, NOT clawed hands, ' +
      'NOT extra arms, NOT extra legs, NOT duplicate body parts, NOT clone, ' +
      'NOT two heads, NOT two faces, NOT multiple people in frame, ' +
      'NOT blurry, NOT low quality, NOT pixelated, NOT watermark, ' +
      'normal human anatomy, correct proportions, natural realistic pose, single subject only';
    
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
   * Prend en compte TOUS les champs du personnage
   */
  buildDetailedPhysicalDescription(character, isRealistic = false) {
    let description = '';
    
    // === UTILISER physicalDescription EN PRIORITÉ si disponible ===
    if (character.physicalDescription) {
      description += character.physicalDescription.replace(/\n/g, ', ').trim();
      description += ', ';
    }
    
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
      description += 'beautiful person, androgynous, non-binary appearance';
    }
    
    // === ÂGE PRÉCIS ===
    const age = parseInt(character.age) || 25;
    description += `, ${age} years old`;
    if (age >= 35 && age < 45) {
      description += ', mature adult, experienced, confident';
    } else if (age >= 45 && age < 55) {
      description += ', mature, distinguished, elegant';
    } else if (age >= 55) {
      description += ', mature, seasoned, sophisticated';
    } else if (age >= 25 && age < 35) {
      description += ', young adult, prime of life';
    } else if (age >= 18 && age < 25) {
      description += ', youthful adult, young adult';
    }
    
    // === CHEVEUX DÉTAILLÉS (utilise hairColor en priorité) ===
    const hairColor = character.hairColor || this.extractFromAppearance(character, 'hair') || 'brown';
    description += `, ${hairColor} hair`;
    
    // Combiner appearance, physicalDescription et autres champs
    const appearance = (
      (character.appearance || '') + ' ' + 
      (character.physicalDescription || '') + ' ' +
      (character.bodyType || '')
    ).toLowerCase();
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
    
    // === YEUX (utilise eyeColor en priorité) ===
    const eyeColor = character.eyeColor?.toLowerCase() || '';
    if (eyeColor) {
      description += `, ${character.eyeColor} eyes`;
    } else if (appearance.includes('yeux bleu') || appearance.includes('blue eyes')) {
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
    } else if (appearance.includes('améthyste') || appearance.includes('violet') || appearance.includes('purple')) {
      description += ', mystical purple amethyst eyes';
    } else if (appearance.includes('doré') || appearance.includes('gold') || appearance.includes('or')) {
      description += ', striking golden eyes';
    } else if (appearance.includes('rouge') || appearance.includes('red')) {
      description += ', intense crimson red eyes';
    } else {
      description += ', expressive captivating eyes';
    }
    
    // === TAILLE (utilise height en priorité) ===
    if (character.height) {
      const heightCm = parseInt(character.height);
      if (heightCm >= 180) {
        description += ', tall stature, impressive height';
      } else if (heightCm >= 170) {
        description += ', above average height';
      } else if (heightCm <= 160) {
        description += ', petite short stature';
      } else {
        description += ', average height';
      }
    }
    
    // === BODY TYPE (utilise bodyType en priorité) ===
    if (character.bodyType) {
      const bodyType = character.bodyType.toLowerCase();
      if (bodyType.includes('athléti') || bodyType.includes('muscl') || bodyType.includes('athletic')) {
        description += ', athletic toned muscular body';
      } else if (bodyType.includes('voluptu') || bodyType.includes('curv') || bodyType.includes('généreus')) {
        description += ', voluptuous curvy full-figured body';
      } else if (bodyType.includes('élancé') || bodyType.includes('mince') || bodyType.includes('slim')) {
        description += ', slim slender elegant body';
      } else if (bodyType.includes('graci') || bodyType.includes('fine')) {
        description += ', graceful slender refined body';
      } else if (bodyType.includes('puissant') || bodyType.includes('massif')) {
        description += ', powerful massive muscular build';
      } else {
        description += `, ${character.bodyType}`;
      }
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
   * Extrait une information spécifique de l'apparence
   */
  extractFromAppearance(character, type) {
    const text = ((character.appearance || '') + ' ' + (character.physicalDescription || '')).toLowerCase();
    
    if (type === 'hair') {
      const hairColors = ['noir', 'black', 'brun', 'brown', 'blond', 'blonde', 'roux', 'red', 'auburn', 
                          'châtain', 'gris', 'grey', 'gray', 'blanc', 'white', 'argenté', 'silver',
                          'violet', 'purple', 'bleu', 'blue', 'vert', 'green', 'rose', 'pink'];
      for (const color of hairColors) {
        if (text.includes(color)) return color;
      }
    }
    
    return null;
  }

  /**
   * Décrit l'anatomie de manière précise
   */
  buildAnatomyDescription(character, isRealistic = false) {
    let anatomy = '';
    
    // === FEMMES - POITRINE (utilise bust OU bustSize) ===
    const bustSize = character.bust || character.bustSize;
    if (character.gender === 'female' && bustSize) {
      const bustDetails = {
        'A': { size: 'small A cup breasts', details: 'petite chest, small perky bust, flat chested' },
        'B': { size: 'small B cup breasts', details: 'modest bust, small perky breasts, cute small chest' },
        'C': { size: 'medium C cup breasts', details: 'balanced bust, natural medium breasts, nice cleavage' },
        'D': { size: 'large D cup breasts', details: 'voluptuous bust, full generous breasts, impressive cleavage' },
        'DD': { size: 'very large DD cup breasts', details: 'very generous bust, full heavy breasts, deep cleavage' },
        'E': { size: 'extremely large E cup breasts', details: 'impressive huge bust, massive full breasts, enormous cleavage' },
        'F': { size: 'huge F cup breasts', details: 'huge voluptuous bust, enormous full breasts, gigantic cleavage' },
        'G': { size: 'gigantic G cup breasts', details: 'gigantic massive bust, colossal breasts, impossibly large' },
        'H': { size: 'enormous H cup breasts', details: 'enormous massive bust, incredibly huge breasts' }
      };
      
      // Normaliser la taille (peut être "Moyenne", "Généreuse", etc.)
      let normalizedBust = bustSize;
      if (bustSize.toLowerCase().includes('petit') || bustSize.toLowerCase().includes('small')) {
        normalizedBust = 'B';
      } else if (bustSize.toLowerCase().includes('moyen') || bustSize.toLowerCase().includes('medium')) {
        normalizedBust = 'C';
      } else if (bustSize.toLowerCase().includes('génér') || bustSize.toLowerCase().includes('large') || bustSize.toLowerCase().includes('voluptu')) {
        normalizedBust = 'D';
      } else if (bustSize.toLowerCase().includes('très') || bustSize.toLowerCase().includes('very') || bustSize.toLowerCase().includes('énorme')) {
        normalizedBust = 'E';
      }
      
      const bustInfo = bustDetails[normalizedBust] || bustDetails[bustSize] || bustDetails['C'];
      anatomy += `, ${bustInfo.size}, ${bustInfo.details}`;
      
      // Ajouter des détails sur les hanches/taille
      if (['D', 'DD', 'E', 'F', 'G', 'H'].includes(normalizedBust)) {
        anatomy += ', wide hips, hourglass figure, curvy body';
      }
    }
    
    // === HOMMES - PHYSIQUE (basé sur maleSize ou penis en cm) ===
    const maleSize = character.maleSize || character.penis;
    if (character.gender === 'male' && maleSize) {
      const penisSize = parseInt(maleSize) || 15;
      
      if (penisSize >= 25) {
        anatomy += ', exceptionally muscular build, bodybuilder physique, massive muscles';
        anatomy += ', very broad shoulders, huge pecs, rock-hard six-pack abs, V-shaped torso';
      } else if (penisSize >= 22) {
        anatomy += ', extremely muscular build, very broad shoulders, defined pecs, rock-hard abs';
      } else if (penisSize >= 20) {
        anatomy += ', very muscular athletic build, broad shoulders, six-pack abs, defined muscles';
      } else if (penisSize >= 18) {
        anatomy += ', muscular athletic build, defined chest, toned abs, fit body';
      } else if (penisSize >= 15) {
        anatomy += ', athletic build, toned physique, lean muscles';
      } else {
        anatomy += ', slim build, lean physique, slender body';
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
   * MODE NSFW - Version explicite
   */
  buildNSFWPrompt(character, isRealistic = false) {
    let nsfw = '';
    
    // Niveau d'explicité aléatoire (soft, medium, hard)
    const explicitLevel = Math.random();
    
    if (character.gender === 'female') {
      nsfw += ', seductive sexy pose, sensual expression, bedroom eyes, sultry gaze';
      
      // Poitrine (utilise bust OU bustSize)
      const bustSize = character.bust || character.bustSize;
      if (bustSize) {
        const bustDescriptions = {
          'A': 'small perky breasts visible',
          'B': 'petite breasts showing',
          'C': 'medium breasts, nice cleavage',
          'D': 'large breasts, deep cleavage, generous bust',
          'DD': 'very large breasts, impressive cleavage',
          'E': 'huge breasts prominently displayed, massive cleavage',
          'F': 'enormous breasts, gigantic bust emphasized',
          'G': 'massive breasts, colossal bust',
          'H': 'enormous massive breasts, gigantic bust'
        };
        
        // Normaliser si nécessaire
        let normalizedBust = bustSize;
        if (bustSize.toLowerCase().includes('petit') || bustSize.toLowerCase().includes('small')) {
          normalizedBust = 'B';
        } else if (bustSize.toLowerCase().includes('moyen') || bustSize.toLowerCase().includes('medium')) {
          normalizedBust = 'C';
        } else if (bustSize.toLowerCase().includes('génér') || bustSize.toLowerCase().includes('large') || bustSize.toLowerCase().includes('voluptu')) {
          normalizedBust = 'D';
        } else if (bustSize.toLowerCase().includes('très') || bustSize.toLowerCase().includes('very') || bustSize.toLowerCase().includes('énorme')) {
          normalizedBust = 'E';
        }
        
        nsfw += `, ${bustDescriptions[normalizedBust] || bustDescriptions[bustSize] || 'beautiful breasts'}`;
      }
      
      // Tenue selon niveau
      if (explicitLevel > 0.7) {
        nsfw += ', topless, bare breasts exposed, nude upper body';
        nsfw += ', nipples visible, exposed chest';
      } else if (explicitLevel > 0.4) {
        nsfw += ', wearing only panties, topless with arm covering';
        nsfw += ', sheer see-through lingerie, nipples showing through';
      } else {
        nsfw += ', sexy lingerie, lace bra barely covering';
        nsfw += ', revealing outfit, cleavage emphasized';
      }
      
      nsfw += ', lying on bed seductively, soft romantic lighting';
      nsfw += ', smooth flawless skin, sensual body curves';
      
    } else if (character.gender === 'male') {
      nsfw += ', sexy masculine pose, confident seductive expression';
      nsfw += ', shirtless, bare muscular chest fully exposed';
      nsfw += ', defined six-pack abs, muscular physique highlighted';
      nsfw += ', V-line visible, low waist pants';
      
      // Physique selon "penis" qui représente la musculature
      if (character.penis) {
        const size = parseInt(character.penis) || 15;
        if (size >= 20) {
          nsfw += ', extremely muscular body, bodybuilder physique';
          nsfw += ', massive muscles, powerful build, impressive physique';
        } else if (size >= 17) {
          nsfw += ', very muscular athletic body, ripped physique';
        }
      }
      
      if (explicitLevel > 0.6) {
        nsfw += ', wearing only underwear, bulge visible';
      }
    }
    
    if (isRealistic) {
      nsfw += ', professional boudoir photography, high-end erotic photoshoot';
      nsfw += ', intimate sensual photo, artistic nude, elegant erotica';
      nsfw += ', perfect studio lighting, professional quality';
    } else {
      nsfw += ', beautiful ecchi anime art, detailed hentai style illustration';
      nsfw += ', high quality nsfw anime, sensual anime artwork';
    }
    
    nsfw += ', NSFW content, adult only, explicit, erotic, sexy';
    
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
    const charAge = parseInt(character.age) || 25;
    if (charAge < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    const nsfwMode = userProfile?.nsfwMode && userProfile?.isAdult;

    // Choisir le style (anime ou réaliste)
    const { style, isRealistic } = this.getRandomStyle();
    
    let prompt = style;
    
    // === UTILISER imagePrompt si disponible (ex: personnages fantasy) ===
    if (character.imagePrompt) {
      prompt += ', ' + character.imagePrompt;
    }
    
    // Description physique adaptée au style
    prompt += ', ' + this.buildDetailedPhysicalDescription(character, isRealistic);
    
    // Apparence du personnage
    if (character.appearance) {
      prompt += `, ${character.appearance.replace(/\n/g, ' ').trim()}`;
    }
    
    // Anatomie (poitrine, physique masculin)
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
      prompt += ', ultra-high quality photo, 8K resolution, sharp focus, professional photography';
      prompt += ', realistic skin texture, lifelike details, photographic quality';
      prompt += ', single person only, one subject, solo portrait, no other people';
      prompt += ', exactly two arms, exactly two legs, normal human body';
    } else {
      // Qualité anime AVEC anti-déformation
      prompt += ', masterpiece anime art, best quality illustration, highly detailed anime';
      prompt += ', clean lines, vibrant colors, professional anime artwork';
      prompt += ', single character, solo, one person, no other characters';
      prompt += ', correct anime anatomy, proper body proportions, NOT extra limbs';
      prompt += ', exactly two arms, exactly two legs, proper hands with five fingers';
    }
    
    prompt += ', adult 18+, mature';

    console.log(`🖼️ Génération image profil (${isRealistic ? 'RÉALISTE' : 'ANIME'})...`);
    return await this.generateImage(prompt);
  }

  /**
   * Génère l'image de scène (conversation)
   */
  async generateSceneImage(character, userProfile = null, recentMessages = []) {
    const charAge = parseInt(character.age) || 25;
    if (charAge < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    const nsfwMode = userProfile?.nsfwMode && userProfile?.isAdult;

    // Choisir le style
    const { style, isRealistic } = this.getRandomStyle();
    
    let prompt = style;
    
    // === UTILISER imagePrompt si disponible ===
    if (character.imagePrompt) {
      prompt += ', ' + character.imagePrompt;
    }
    
    // Description physique
    prompt += ', ' + this.buildDetailedPhysicalDescription(character, isRealistic);
    
    // Apparence
    if (character.appearance) {
      prompt += `, ${character.appearance.replace(/\n/g, ' ').trim()}`;
    }
    
    // Anatomie (poitrine, physique masculin)
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
    
    // QUALITÉ AVEC ANTI-DÉFORMATION
    if (isRealistic) {
      prompt += ', ' + this.buildRealisticQualityPrompts();
      prompt += ', ultra-detailed photo, 8K, professional quality, sharp focus';
      prompt += ', single person, solo, one subject, no other people';
      prompt += ', exactly two arms, exactly two legs, correct body';
    } else {
      prompt += ', masterpiece, best quality, highly detailed anime';
      prompt += ', single character, solo, no duplicates';
      prompt += ', correct anime anatomy, NOT extra limbs, NOT deformed';
      prompt += ', exactly two arms, exactly two legs, proper hands';
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
   * Génère une image - UNIQUEMENT FREEBOX - AVEC RETRY AUTOMATIQUE
   */
  async generateImage(prompt, retryCount = 0) {
    await CustomImageAPIService.loadConfig();
    
    const strategy = CustomImageAPIService.getStrategy();
    console.log(`🎨 Stratégie de génération: ${strategy} (tentative ${retryCount + 1}/${this.maxRetries})`);
    
    let imageUrl;
    
    if (strategy === 'local') {
      console.log('📱 Génération locale (SD sur smartphone)...');
      imageUrl = await this.generateWithLocal(prompt);
    } else {
      console.log('🏠 Génération avec Freebox...');
      imageUrl = await this.generateWithFreebox(prompt);
    }
    
    // Vérifier si l'image est valide (pas d'erreur pollination, etc.)
    const isValid = await this.validateImageUrl(imageUrl);
    
    if (!isValid && retryCount < this.maxRetries - 1) {
      console.log(`⚠️ Image invalide, nouvelle tentative (${retryCount + 2}/${this.maxRetries})...`);
      // Attendre un peu avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 1500));
      return await this.generateImage(prompt, retryCount + 1);
    }
    
    return imageUrl;
  }

  /**
   * Valide qu'une URL d'image est correcte
   */
  async validateImageUrl(imageUrl) {
    if (!imageUrl) return false;
    
    // Vérifier les patterns d'erreur connus
    const errorPatterns = [
      'pollination',
      'error',
      'failed',
      'invalid',
      'blocked',
      'nsfw_blocked'
    ];
    
    const lowerUrl = imageUrl.toLowerCase();
    for (const pattern of errorPatterns) {
      if (lowerUrl.includes(pattern)) {
        console.log(`⚠️ URL contient pattern d'erreur: ${pattern}`);
        return false;
      }
    }
    
    // Vérifier que c'est une URL valide
    try {
      new URL(imageUrl);
      return true;
    } catch {
      return false;
    }
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
    
    // Récupérer le token et user_id pour l'authentification premium
    const token = await AsyncStorage.getItem('auth_token');
    const user = AuthService.getCurrentUser();
    const userId = user?.id || '';
    
    const separator = freeboxUrl.includes('?') ? '&' : '?';
    let imageUrl = `${freeboxUrl}${separator}prompt=${encodedPrompt}&width=768&height=768&seed=${seed}`;
    
    // Ajouter l'authentification pour les utilisateurs premium
    if (token) {
      imageUrl += `&token=${encodeURIComponent(token)}`;
    }
    if (userId) {
      imageUrl += `&user_id=${encodeURIComponent(userId)}`;
    }
    
    console.log(`🔗 URL Freebox générée avec auth (${prompt.length} chars)`);
    
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
