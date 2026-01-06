import axios from 'axios';

class ImageGenerationService {
  constructor() {
    this.baseURL = 'https://image.pollinations.ai/prompt/';
  }

  /**
   * Construit une description ultra-détaillée des caractéristiques physiques
   */
  buildDetailedPhysicalDescription(character) {
    let description = '';
    
    // === GENRE ET BASE ===
    if (character.gender === 'female') {
      description += 'beautiful woman, female, lady';
    } else if (character.gender === 'male') {
      description += 'handsome man, male, gentleman';
    } else {
      description += 'beautiful person, androgynous';
    }
    
    // === ÂGE PRÉCIS ===
    description += `, ${character.age} years old`;
    if (character.age >= 35 && character.age < 45) {
      description += ', mature, experienced, confident age';
    } else if (character.age >= 45) {
      description += ', mature, distinguished, elegant age';
    } else if (character.age >= 25 && character.age < 35) {
      description += ', young adult, prime age';
    } else if (character.age >= 18 && character.age < 25) {
      description += ', youthful, young adult';
    }
    
    // === CHEVEUX ULTRA-DÉTAILLÉS ===
    const hairColor = character.hairColor || 'brown';
    description += `, ${hairColor} hair`;
    
    // Longueur et style (extraits de l'apparence)
    const appearance = (character.appearance || '').toLowerCase();
    if (appearance.includes('long') || appearance.includes('longs')) {
      description += ', very long flowing hair, hair reaching lower back';
    } else if (appearance.includes('mi-long') || appearance.includes('shoulder')) {
      description += ', shoulder-length hair, medium hair';
    } else if (appearance.includes('court') || appearance.includes('short')) {
      description += ', short hair, short cut';
    } else {
      description += ', medium length hair';
    }
    
    if (appearance.includes('bouclé') || appearance.includes('curly') || appearance.includes('ondulé')) {
      description += ', curly wavy hair, natural curls';
    } else if (appearance.includes('raides') || appearance.includes('straight') || appearance.includes('lisse')) {
      description += ', straight sleek hair, silky straight';
    }
    
    // === TAILLE CORPORELLE ===
    if (appearance.includes('grande') || appearance.includes('tall')) {
      description += ', tall height, tall stature, 5\'8" to 6\'0"';
    } else if (appearance.includes('petite') || appearance.includes('small')) {
      description += ', petite height, short stature, 5\'0" to 5\'4"';
    } else {
      description += ', average height, medium stature, 5\'4" to 5\'7"';
    }
    
    // === BUILD / MORPHOLOGIE ===
    if (appearance.includes('musclé') || appearance.includes('muscular') || appearance.includes('athlétique') || appearance.includes('athletic')) {
      description += ', athletic build, toned body, fit physique, defined muscles';
    } else if (appearance.includes('mince') || appearance.includes('slim') || appearance.includes('élancé') || appearance.includes('slender')) {
      description += ', slim build, slender figure, lean body';
    } else if (appearance.includes('voluptu') || appearance.includes('curvy') || appearance.includes('généreuses')) {
      description += ', voluptuous build, curvy figure, full-figured body';
    } else {
      description += ', balanced build, normal physique';
    }
    
    // === COULEUR DE PEAU ===
    if (appearance.includes('pâle') || appearance.includes('pale')) {
      description += ', pale skin, fair complexion, porcelain skin';
    } else if (appearance.includes('bronzé') || appearance.includes('tanned') || appearance.includes('caramel')) {
      description += ', tanned skin, golden complexion, sun-kissed skin';
    } else if (appearance.includes('ébène') || appearance.includes('noire') || appearance.includes('dark')) {
      description += ', dark skin, ebony complexion, rich dark skin tone';
    } else if (appearance.includes('asiat') || appearance.includes('asian')) {
      description += ', asian skin tone, light brown complexion';
    } else if (appearance.includes('latin') || appearance.includes('mediterran')) {
      description += ', mediterranean skin, olive complexion, warm skin tone';
    } else {
      description += ', natural skin tone, healthy complexion';
    }
    
    // === TRAITS DU VISAGE ===
    if (appearance.includes('yeux bleu')) {
      description += ', bright blue eyes, piercing blue gaze';
    } else if (appearance.includes('yeux vert')) {
      description += ', emerald green eyes, striking green gaze';
    } else if (appearance.includes('yeux marron') || appearance.includes('yeux brun')) {
      description += ', warm brown eyes, deep brown gaze';
    } else if (appearance.includes('yeux noi')) {
      description += ', dark eyes, intense black gaze';
    } else if (appearance.includes('yeux gris')) {
      description += ', steel gray eyes, mysterious gray gaze';
    } else {
      description += ', expressive eyes, captivating gaze';
    }
    
    // Traits additionnels
    if (appearance.includes('taches de rousseur') || appearance.includes('freckles')) {
      description += ', freckles on face, cute freckles';
    }
    
    if (appearance.includes('lunettes') || appearance.includes('glasses')) {
      description += ', wearing stylish glasses, elegant eyewear';
    }
    
    return description;
  }

  /**
   * Décrit l'anatomie de manière ULTRA-PRÉCISE
   */
  buildAnatomyDescription(character) {
    let anatomy = '';
    
    // === FEMMES - POITRINE ULTRA-DÉTAILLÉE ===
    if (character.gender === 'female' && character.bust) {
      const bustDetails = {
        'A': {
          size: 'small A cup breasts',
          details: 'petite chest, delicate small bust, subtle curves, slim upper body, athletic chest, perky small breasts, proportionate to slim frame',
          emphasis: 'feminine delicate chest, natural small proportions'
        },
        'B': {
          size: 'small B cup breasts',
          details: 'modest bust, small perky breasts, slender figure, subtle feminine curves, petite chest, proportioned small bust, natural B cup shape',
          emphasis: 'elegant modest chest, naturally proportioned'
        },
        'C': {
          size: 'medium C cup breasts',
          details: 'balanced bust, natural C cup proportions, moderate chest size, feminine curves, well-proportioned breasts, attractive medium bust, natural cleavage',
          emphasis: 'perfectly balanced chest, ideal proportions, natural medium breasts'
        },
        'D': {
          size: 'large D cup breasts',
          details: 'voluptuous D cup bust, curvy figure, prominent chest, noticeable cleavage, full breasts, generous bust, shapely large breasts, eye-catching chest',
          emphasis: 'impressive bust, prominent cleavage visible, large feminine curves, voluptuous chest emphasized'
        },
        'DD': {
          size: 'very large DD cup breasts',
          details: 'very voluptuous DD cup bust, very curvy figure, very generous chest, deep cleavage, very full heavy breasts, striking bust, remarkably large chest, attention-grabbing breasts',
          emphasis: 'very prominent bust emphasized, deep visible cleavage, very large feminine curves highlighted, chest clearly defined'
        },
        'E': {
          size: 'extremely large E cup breasts',
          details: 'extremely voluptuous E cup bust, highly curvy figure, impressive large chest, dramatic cleavage, massive full breasts, extraordinary bust, remarkably large and full chest',
          emphasis: 'extremely prominent bust emphasized, dramatic deep cleavage clearly visible, massive feminine curves highlighted, chest dominantly featured'
        },
        'F': {
          size: 'huge F cup breasts',
          details: 'huge voluptuous F cup bust, extremely curvy figure, massive chest, extreme deep cleavage, enormous heavy full breasts, spectacular bust, incredibly large chest',
          emphasis: 'massively prominent bust emphasized, extreme dramatic cleavage clearly visible, huge feminine curves dominated, chest as focal point'
        },
        'G': {
          size: 'gigantic G cup breasts',
          details: 'gigantic G cup bust, extraordinarily voluptuous figure, colossal chest, extreme dramatic cleavage, gigantic massive breasts, phenomenal bust, unbelievably large chest',
          emphasis: 'gigantically prominent bust heavily emphasized, extreme deep cleavage fully visible, gigantic feminine curves completely dominating, chest as main feature'
        }
      };
      
      const bustInfo = bustDetails[character.bust] || bustDetails['C'];
      anatomy += `, ${bustInfo.size}, ${bustInfo.details}, ${bustInfo.emphasis}`;
    }
    
    // === HOMMES - PHYSIQUE DÉTAILLÉ ===
    if (character.gender === 'male' && character.penis) {
      const penisSize = parseInt(character.penis) || 15;
      
      if (penisSize >= 22) {
        anatomy += ', exceptionally muscular build, very broad shoulders, extremely defined pecs, rock-hard abs, powerful arms, massive muscular thighs, dominant masculine physique, alpha male body';
      } else if (penisSize >= 20) {
        anatomy += ', very muscular athletic build, broad strong shoulders, well-defined pecs, six-pack abs, strong arms, muscular thighs, impressive masculine physique, powerful body';
      } else if (penisSize >= 18) {
        anatomy += ', muscular athletic build, broad shoulders, defined chest, toned abs, athletic arms, strong legs, fit masculine physique, sporty body';
      } else {
        anatomy += ', toned athletic build, proportioned shoulders, lean chest, athletic body, fit physique, healthy masculine frame';
      }
    }
    
    return anatomy;
  }

  /**
   * MODE NSFW ULTRA-RÉALISTE (Suggestif, NON-EXPLICITE)
   */
  buildNSFWPrompt(character) {
    let nsfw = '';
    
    if (character.gender === 'female') {
      // BASE NSFW FÉMININ
      nsfw += ', sexy pose, sensual expression, seductive look, sultry gaze, alluring smile, provocative attitude';
      nsfw += ', bedroom eyes, inviting expression, flirtatious look, suggestive body language, confident sexy pose';
      
      // TENUE NSFW
      nsfw += ', wearing revealing lingerie, sexy lace underwear, silk bra and panties set, transparent lingerie';
      nsfw += ', delicate lace details, satin fabric, sheer material, elegant intimate wear';
      nsfw += ', lingerie partially visible, straps showing, intimate clothing revealed';
      
      // POSE ET ATTITUDE
      nsfw += ', sitting on bed edge, lying on silk sheets, reclining seductively, posed on bed';
      nsfw += ', legs crossed elegantly, one leg raised, suggestive leg position, sensual body curve';
      nsfw += ', looking over shoulder, arched back, sensual posture, inviting pose';
      
      // PEAU ET EXPOSITION
      nsfw += ', smooth skin visible, shoulders exposed, décolleté visible, legs showing';
      nsfw += ', midriff exposed, lower back visible, thighs visible, skin softly lit';
      
      // EMPHASE POITRINE (selon taille)
      if (character.bust) {
        if (['D', 'DD', 'E', 'F', 'G'].includes(character.bust)) {
          nsfw += ', cleavage prominently displayed, breasts emphasized in lingerie, bust clearly defined through fabric';
          nsfw += ', deep visible cleavage, breast curves highlighted, chest focal point, bustline emphasized';
          nsfw += ', breasts pressed together, cleavage deepened, bust enhanced by pose';
        } else if (['B', 'C'].includes(character.bust)) {
          nsfw += ', cleavage subtly visible, bust elegantly shown in lingerie, chest naturally defined';
          nsfw += ', modest cleavage visible, breast curves delicately shown, natural bustline';
        }
      }
      
      // AMBIANCE
      nsfw += ', intimate bedroom setting, soft romantic lighting, warm ambient light, dim sensual lighting';
      nsfw += ', silk sheets, luxurious bed, romantic atmosphere, intimate mood, seductive environment';
      nsfw += ', candles in background, soft shadows, dreamy lighting, sensual ambiance';
      
    } else if (character.gender === 'male') {
      // BASE NSFW MASCULIN
      nsfw += ', sexy masculine pose, seductive confident look, intense gaze, alluring smile, dominant attitude';
      nsfw += ', powerful eyes, inviting expression, confident body language, alpha male presence';
      
      // TENUE NSFW
      nsfw += ', shirtless, bare chest exposed, topless, muscular torso visible';
      nsfw += ', wearing only tight underwear, boxer briefs visible, low-waisted pants, revealing clothing';
      nsfw += ', abs clearly defined, chest muscles visible, defined v-line, muscular definition shown';
      
      // POSE ET ATTITUDE
      nsfw += ', standing confidently, leaning against wall, sitting on bed edge, reclining pose';
      nsfw += ', hands behind head, arms crossed showing muscles, flexing subtly, powerful stance';
      nsfw += ', looking intensely at camera, dominant gaze, confident posture, masculine presence';
      
      // PEAU ET MUSCLES
      nsfw += ', tanned skin glistening, muscles defined by lighting, body highlighted, physique emphasized';
      nsfw += ', six-pack abs visible, chest muscles defined, shoulders broad and muscular, arms toned';
      nsfw += ', strong masculine features, rugged appeal, raw masculine energy';
      
      // AMBIANCE
      nsfw += ', intimate bedroom setting, masculine environment, moody lighting, dramatic shadows';
      nsfw += ', soft warm light on skin, athletic aesthetic, seductive mood, intimate atmosphere';
    }
    
    // QUALITÉ FINALE
    nsfw += ', ultra-realistic, high detail, professional photography style, magazine quality';
    nsfw += ', tasteful sensual, artistic suggestive, elegant sexy, sophisticated intimate';
    
    return nsfw;
  }

  /**
   * MODE SFW (Safe For Work)
   */
  buildSFWPrompt(character) {
    let sfw = ', fully clothed, appropriate attire, decent outfit, respectful clothing';
    
    // Style vestimentaire basé sur l'apparence
    const appearance = (character.appearance || '').toLowerCase();
    
    if (appearance.includes('élégant') || appearance.includes('elegant') || appearance.includes('sophistiqué')) {
      sfw += ', elegant sophisticated outfit, classy clothing, refined attire, stylish dress';
    } else if (appearance.includes('professionnel') || appearance.includes('professional') || appearance.includes('business')) {
      sfw += ', professional business attire, suit, formal clothing, office outfit';
    } else if (appearance.includes('sport') || appearance.includes('athletic')) {
      sfw += ', athletic sportswear, gym clothing, fitness outfit, sporty attire';
    } else if (appearance.includes('casual') || appearance.includes('décontracté')) {
      sfw += ', casual comfortable clothing, everyday outfit, relaxed attire';
    } else if (appearance.includes('bohème') || appearance.includes('artistic')) {
      sfw += ', bohemian artistic clothing, creative outfit, artistic attire';
    } else {
      sfw += ', casual modern clothing, contemporary outfit, stylish attire';
    }
    
    sfw += ', natural pose, confident stance, friendly expression, approachable demeanor';
    sfw += ', natural lighting, clean background, professional setting, appropriate environment';
    
    return sfw;
  }

  /**
   * Génère l'image du personnage (profil)
   */
  async generateCharacterImage(character, userProfile = null) {
    // Filtrage d'âge
    if (character.age < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    // Détection mode NSFW
    const nsfwMode = userProfile?.nsfwMode && userProfile?.isAdult;

    // CONSTRUCTION DU PROMPT ULTRA-DÉTAILLÉ
    let prompt = '';
    
    // 1. Description physique complète
    prompt += this.buildDetailedPhysicalDescription(character);
    
    // 2. Anatomie ultra-précise
    prompt += this.buildAnatomyDescription(character);
    
    // 3. Mode NSFW ou SFW
    if (nsfwMode) {
      prompt += this.buildNSFWPrompt(character);
    } else {
      prompt += this.buildSFWPrompt(character);
    }
    
    // 4. Qualité et sécurité
    prompt += ', photorealistic, hyper-detailed, ultra-high quality, 4K resolution, professional photography';
    prompt += ', realistic lighting, accurate proportions, lifelike, detailed features';
    prompt += ', adult 18+, mature, age-appropriate, realistic age depiction';

    return await this.generateImage(prompt);
  }

  /**
   * Génère l'image de scène (conversation)
   */
  async generateSceneImage(character, userProfile = null, recentMessages = []) {
    // Filtrage d'âge
    if (character.age < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    // Détection mode NSFW
    const nsfwMode = userProfile?.nsfwMode && userProfile?.isAdult;

    // CONSTRUCTION DU PROMPT
    let prompt = '';
    
    // 1. Description physique
    prompt += this.buildDetailedPhysicalDescription(character);
    
    // 2. Anatomie
    prompt += this.buildAnatomyDescription(character);
    
    // 3. Détection de tenue dans la conversation
    const outfit = this.detectOutfit(recentMessages);
    if (outfit) {
      prompt += `, wearing ${outfit}`;
    }
    
    // 4. Contexte conversationnel
    const context = recentMessages.slice(-2).map(m => m.content).join(' ').substring(0, 200);
    if (context && !outfit) {
      prompt += `, scene context: ${context}`;
    }
    
    // 5. Mode NSFW ou SFW
    if (nsfwMode) {
      if (!outfit || this.isOutfitSuggestive(outfit)) {
        prompt += this.buildNSFWPrompt(character);
      } else {
        // NSFW atténué si tenue normale
        prompt += ', attractive pose, alluring expression, sensual atmosphere, sexy lighting';
      }
    } else {
      prompt += this.buildSFWPrompt(character);
    }
    
    // 6. Qualité finale
    prompt += ', photorealistic, ultra-detailed, 4K, professional quality, realistic lighting';
    prompt += ', adult 18+, mature, age-appropriate';

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
   * Vérifie si une tenue est suggestive
   */
  isOutfitSuggestive(outfit) {
    const suggestiveKeywords = [
      'lingerie', 'underwear', 'bra', 'panties', 'string', 'thong',
      'bikini', 'nuisette', 'nightgown', 'débardeur', 'déshabillé',
      'torse nu', 'shirtless', 'topless'
    ];
    return suggestiveKeywords.some(kw => outfit.toLowerCase().includes(kw));
  }

  /**
   * Appelle l'API Pollinations
   */
  async generateImage(prompt) {
    try {
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `${this.baseURL}${encodedPrompt}?width=768&height=768&model=flux&nologo=true&enhance=true&seed=${Date.now()}`;
      
      const response = await axios.head(imageUrl, { timeout: 5000 });
      
      if (response.status === 200) {
        return imageUrl;
      } else {
        throw new Error('Image service unavailable');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error('Impossible de générer l\'image. Veuillez réessayer.');
    }
  }
}

export default new ImageGenerationService();
