import axios from 'axios';
import CustomImageAPIService from './CustomImageAPIService';
import StableDiffusionLocalService from './StableDiffusionLocalService';

class ImageGenerationService {
  constructor() {
    // URL Freebox par défaut
    this.freeboxURL = 'http://88.174.155.230:33437/generate';
    this.lastRequestTime = 0;
    this.minDelay = 1000; // 1 seconde minimum entre les requêtes
    this.maxRetries = 3;
    
    // STYLES ALÉATOIRES pour variété
    this.artStyles = [
      'photorealistic, ultra-realistic photography',
      'hyper-realistic, 8K ultra-detailed photography',
      'anime style, anime art, manga illustration',
      'semi-realistic anime style',
    ];
    
    // TENUES NSFW ALÉATOIRES (conversations)
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
      'sitting provocatively, legs crossed',
      'standing, hand on hip, confident',
      'kneeling, looking up',
      'arching back, sensual pose',
      'leaning against wall, alluring',
      'reclining on couch, relaxed',
      'stretching, body exposed',
    ];
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
          details: 'petite chest, delicate small bust, subtle curves, slim upper body, athletic chest, perky small breasts',
          emphasis: 'feminine delicate chest, natural small proportions'
        },
        'B': {
          size: 'small B cup breasts',
          details: 'modest bust, small perky breasts, slender figure, subtle feminine curves, proportioned small bust',
          emphasis: 'elegant modest chest, naturally proportioned'
        },
        'C': {
          size: 'medium C cup breasts',
          details: 'balanced bust, natural C cup proportions, moderate chest size, feminine curves, well-proportioned breasts',
          emphasis: 'perfectly balanced chest, ideal proportions, natural medium breasts'
        },
        'D': {
          size: 'large D cup breasts',
          details: 'voluptuous D cup bust, curvy figure, prominent chest, noticeable cleavage, full breasts, generous bust',
          emphasis: 'impressive bust, prominent cleavage visible, large feminine curves'
        },
        'DD': {
          size: 'very large DD cup breasts',
          details: 'very voluptuous DD cup bust, very curvy figure, very generous chest, deep cleavage, very full heavy breasts',
          emphasis: 'very prominent bust emphasized, deep visible cleavage, very large feminine curves'
        },
        'E': {
          size: 'extremely large E cup breasts',
          details: 'extremely voluptuous E cup bust, highly curvy figure, impressive large chest, dramatic cleavage, massive full breasts',
          emphasis: 'extremely prominent bust emphasized, dramatic deep cleavage clearly visible'
        },
        'F': {
          size: 'huge F cup breasts',
          details: 'huge voluptuous F cup bust, extremely curvy figure, massive chest, extreme deep cleavage, enormous heavy full breasts',
          emphasis: 'massively prominent bust emphasized, extreme dramatic cleavage clearly visible'
        },
        'G': {
          size: 'gigantic G cup breasts',
          details: 'gigantic G cup bust, extraordinarily voluptuous figure, colossal chest, extreme dramatic cleavage, gigantic massive breasts',
          emphasis: 'gigantically prominent bust heavily emphasized, extreme deep cleavage fully visible'
        }
      };
      
      const bustInfo = bustDetails[character.bust] || bustDetails['C'];
      anatomy += `, ${bustInfo.size}, ${bustInfo.details}, ${bustInfo.emphasis}`;
    }
    
    // === HOMMES - PHYSIQUE DÉTAILLÉ ===
    if (character.gender === 'male' && character.penis) {
      const penisSize = parseInt(character.penis) || 15;
      
      if (penisSize >= 22) {
        anatomy += ', exceptionally muscular build, very broad shoulders, extremely defined pecs, rock-hard abs, powerful arms';
      } else if (penisSize >= 20) {
        anatomy += ', very muscular athletic build, broad strong shoulders, well-defined pecs, six-pack abs, strong arms';
      } else if (penisSize >= 18) {
        anatomy += ', muscular athletic build, broad shoulders, defined chest, toned abs, athletic arms';
      } else {
        anatomy += ', toned athletic build, proportioned shoulders, lean chest, athletic body, fit physique';
      }
    }
    
    return anatomy;
  }

  /**
   * MODE NSFW ULTRA-RÉALISTE
   */
  buildNSFWPrompt(character) {
    let nsfw = '';
    
    if (character.gender === 'female') {
      nsfw += ', extremely sexy pose, highly sensual expression, intensely seductive look, sultry passionate gaze';
      nsfw += ', alluring inviting smile, very provocative attitude, erotic energy';
      nsfw += ', wearing very revealing lingerie, sexy transparent lace underwear, delicate silk bra and panties set';
      nsfw += ', sitting provocatively on bed edge, lying seductively on silk sheets';
      nsfw += ', smooth flawless skin extensively visible, shoulders completely exposed';
      nsfw += ', intimate romantic bedroom setting, soft sensual lighting creating shadows';
      
      if (character.bust) {
        if (['D', 'DD', 'E', 'F', 'G'].includes(character.bust)) {
          nsfw += ', cleavage very prominently displayed, breasts heavily emphasized in revealing lingerie';
          nsfw += ', bust clearly defined through transparent fabric, very deep visible cleavage featured';
        }
      }
      
    } else if (character.gender === 'male') {
      nsfw += ', very sexy masculine pose, intensely seductive confident look, powerful intense gaze';
      nsfw += ', completely shirtless, bare muscular chest fully exposed, topless revealing physique';
      nsfw += ', abs sharply defined, chest muscles prominently visible';
      nsfw += ', tanned skin glistening with subtle sheen, muscles sharply defined by dramatic lighting';
    }
    
    nsfw += ', ultra-realistic photorealistic rendering, extremely high detail';
    nsfw += ', professional fashion photography style, high-end magazine quality';
    nsfw += ', tasteful yet very sensual, artistic yet suggestive, elegant yet very sexy';
    
    return nsfw;
  }

  /**
   * MODE SFW (Safe For Work)
   */
  buildSFWPrompt(character) {
    let sfw = ', fully clothed, appropriate attire, decent outfit, respectful clothing';
    
    const appearance = (character.appearance || '').toLowerCase();
    
    if (appearance.includes('élégant') || appearance.includes('elegant') || appearance.includes('sophistiqué')) {
      sfw += ', elegant sophisticated outfit, classy clothing, refined attire';
    } else if (appearance.includes('professionnel') || appearance.includes('professional')) {
      sfw += ', professional business attire, suit, formal clothing';
    } else if (appearance.includes('sport') || appearance.includes('athletic')) {
      sfw += ', athletic sportswear, gym clothing, fitness outfit';
    } else {
      sfw += ', casual modern clothing, contemporary outfit, stylish attire';
    }
    
    sfw += ', natural pose, confident stance, friendly expression';
    sfw += ', natural lighting, clean background, professional setting';
    
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

    let prompt = '';
    
    // Style aléatoire
    const randomStyle = this.artStyles[Math.floor(Math.random() * this.artStyles.length)];
    prompt += randomStyle;
    
    // Description physique
    prompt += ', ' + this.buildDetailedPhysicalDescription(character);
    
    // Apparence du personnage
    if (character.appearance) {
      prompt += `, ${character.appearance.replace(/\n/g, ' ').trim()}`;
    }
    
    // Anatomie
    prompt += this.buildAnatomyDescription(character);
    
    // Tenue
    if (character.outfit) {
      prompt += `, wearing: ${character.outfit.replace(/\n/g, ' ').trim()}`;
    }
    
    // Mode NSFW ou SFW
    if (nsfwMode) {
      prompt += this.buildNSFWPrompt(character);
    } else {
      prompt += this.buildSFWPrompt(character);
    }
    
    // Qualité
    prompt += ', ultra-high quality, 4K resolution, professional photography';
    prompt += ', realistic lighting, accurate proportions, lifelike, detailed features';
    prompt += ', adult 18+, mature, age-appropriate';

    console.log('🖼️ Génération image profil avec Freebox...');
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

    let prompt = '';
    
    // Style aléatoire
    const randomStyle = this.artStyles[Math.floor(Math.random() * this.artStyles.length)];
    prompt += randomStyle;
    
    // Description physique
    prompt += ', ' + this.buildDetailedPhysicalDescription(character);
    
    // Apparence
    if (character.appearance) {
      prompt += `, ${character.appearance.replace(/\n/g, ' ').trim()}`;
    }
    
    // Anatomie
    prompt += this.buildAnatomyDescription(character);
    
    // Tenue détectée ou aléatoire
    const detectedOutfit = this.detectOutfit(recentMessages);
    if (detectedOutfit) {
      prompt += `, wearing ${detectedOutfit}`;
    } else if (nsfwMode) {
      const randomOutfit = this.nsfwOutfits[Math.floor(Math.random() * this.nsfwOutfits.length)];
      prompt += `, ${randomOutfit}`;
    }
    
    // Posture aléatoire si NSFW
    if (nsfwMode) {
      const randomPose = this.nsfwPoses[Math.floor(Math.random() * this.nsfwPoses.length)];
      prompt += `, ${randomPose}`;
    }
    
    // Mode NSFW ou SFW
    if (nsfwMode) {
      prompt += this.buildNSFWPrompt(character);
    } else {
      prompt += this.buildSFWPrompt(character);
    }
    
    // Qualité
    prompt += ', ultra-detailed, 4K, professional quality, realistic lighting';
    prompt += ', adult 18+, mature, age-appropriate';

    console.log('🖼️ Génération image conversation avec Freebox...');
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
   * Génère une image - UNIQUEMENT FREEBOX (pas de Pollinations)
   */
  async generateImage(prompt) {
    await CustomImageAPIService.loadConfig();
    
    const strategy = CustomImageAPIService.getStrategy();
    console.log(`🎨 Stratégie de génération: ${strategy}`);
    
    // Si stratégie = 'local', utiliser SD Local sur smartphone
    if (strategy === 'local') {
      console.log('📱 Génération locale (SD sur smartphone)...');
      return await this.generateWithLocal(prompt);
    }
    
    // Sinon: TOUJOURS Freebox (pas de Pollinations)
    console.log('🏠 Génération avec Freebox uniquement...');
    return await this.generateWithFreebox(prompt);
  }

  /**
   * Génère une image avec l'API Freebox UNIQUEMENT
   */
  async generateWithFreebox(prompt) {
    console.log('🏠 Génération avec API Freebox...');
    
    await this.waitForRateLimit();
    
    // Récupérer l'URL Freebox configurée ou utiliser celle par défaut
    let freeboxUrl = CustomImageAPIService.getApiUrl();
    if (!freeboxUrl) {
      freeboxUrl = this.freeboxURL;
      console.log('⚠️ Pas d\'URL configurée, utilisation de l\'URL par défaut:', freeboxUrl);
    }
    
    const seed = Date.now() + Math.floor(Math.random() * 10000);
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Construire l'URL avec le prompt
    const separator = freeboxUrl.includes('?') ? '&' : '?';
    const imageUrl = `${freeboxUrl}${separator}prompt=${encodedPrompt}&width=768&height=768&seed=${seed}`;
    
    console.log(`🔗 URL Freebox générée`);
    
    // Retourner l'URL directement - l'app chargera l'image
    return imageUrl;
  }

  /**
   * Génère une image avec Stable Diffusion Local (Smartphone)
   */
  async generateWithLocal(prompt) {
    console.log('📱 Tentative génération locale SD...');
    
    try {
      const availability = await StableDiffusionLocalService.checkAvailability();
      
      // Si SD Local non disponible, fallback vers Freebox
      if (!availability.available || !availability.modelDownloaded || !availability.canRunSD) {
        const reason = !availability.available 
          ? 'Service SD Local non disponible'
          : !availability.modelDownloaded 
            ? 'Modèle SD non téléchargé'
            : 'RAM insuffisante';
        
        console.log(`⚠️ ${reason} - Utilisation de Freebox à la place`);
        return await this.generateWithFreebox(prompt);
      }

      const fullPrompt = `${prompt}, masterpiece, best quality, ultra detailed, 8k, photorealistic`;
      const negativePrompt = 'low quality, blurry, distorted, deformed, ugly, bad anatomy, worst quality, child, underage';

      console.log('🎨 Génération avec SD-Turbo local...');
      
      const result = await StableDiffusionLocalService.generateImage(fullPrompt, {
        negativePrompt,
        steps: 2,
        guidanceScale: 1.0,
      });

      if (result && result.imagePath) {
        console.log('✅ Image générée localement:', result.imagePath);
        return result.imagePath;
      }
      
      // Si pas de résultat, fallback vers Freebox
      console.log('⚠️ Pas de résultat SD Local, fallback Freebox');
      return await this.generateWithFreebox(prompt);
      
    } catch (error) {
      console.error('❌ Erreur génération locale:', error.message);
      console.log('🔄 Fallback vers Freebox...');
      return await this.generateWithFreebox(prompt);
    }
  }
}

export default new ImageGenerationService();
