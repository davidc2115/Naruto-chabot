import axios from 'axios';
import CustomImageAPIService from './CustomImageAPIService';

class ImageGenerationService {
  constructor() {
    this.baseURL = 'https://image.pollinations.ai/prompt/';
    this.lastRequestTime = 0;
    this.minDelay = 3000; // 3 secondes minimum entre les requêtes
    this.maxRetries = 3;
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
   * MODE NSFW ULTRA-RÉALISTE (Suggestif, NON-EXPLICITE mais SEXY)
   */
  buildNSFWPrompt(character) {
    let nsfw = '';
    
    if (character.gender === 'female') {
      // BASE NSFW FÉMININ - Plus explicite
      nsfw += ', extremely sexy pose, highly sensual expression, intensely seductive look, sultry passionate gaze';
      nsfw += ', alluring inviting smile, very provocative attitude, erotic energy';
      nsfw += ', bedroom eyes, deeply inviting expression, intensely flirtatious look';
      nsfw += ', suggestive sensual body language, confident sexy dominant pose';
      
      // TENUE NSFW - Plus détaillée
      nsfw += ', wearing very revealing lingerie, sexy transparent lace underwear, delicate silk bra and panties set';
      nsfw += ', sheer see-through lingerie, lace details clearly visible, satin and silk fabric';
      nsfw += ', extremely delicate intimate wear, luxury lingerie pieces';
      nsfw += ', lingerie clearly visible and highlighted, straps prominently showing, intimate clothing fully revealed';
      nsfw += ', transparent fabric showing skin beneath, lace patterns defined';
      
      // POSE ET ATTITUDE - Plus suggestive
      nsfw += ', sitting provocatively on bed edge, lying seductively on silk sheets';
      nsfw += ', reclining in very seductive pose, positioned alluringly on luxurious bed';
      nsfw += ', legs elegantly and suggestively crossed, one leg raised provocatively';
      nsfw += ', highly suggestive leg position revealing thighs, very sensual body curve emphasized';
      nsfw += ', looking seductively over shoulder, back beautifully arched, extremely sensual posture';
      nsfw += ', inviting and open pose, body positioned to showcase curves';
      
      // PEAU ET EXPOSITION - Plus détaillée
      nsfw += ', smooth flawless skin extensively visible, shoulders completely exposed and highlighted';
      nsfw += ', décolleté prominently visible and emphasized, legs fully showing and featured';
      nsfw += ', midriff fully exposed and toned, lower back visible and curved';
      nsfw += ', thighs prominently visible and shapely, skin softly and romantically lit';
      nsfw += ', silky smooth skin texture, body glistening subtly';
      
      // EMPHASE POITRINE (selon taille) - Plus direct
      if (character.bust) {
        if (['D', 'DD', 'E', 'F', 'G'].includes(character.bust)) {
          nsfw += ', cleavage very prominently and dramatically displayed, breasts heavily emphasized in revealing lingerie';
          nsfw += ', bust clearly and boldly defined through transparent fabric, very deep visible cleavage featured';
          nsfw += ', breast curves strongly highlighted and showcased, chest as primary focal point';
          nsfw += ', bustline powerfully emphasized, breasts pressed closely together creating dramatic cleavage';
          nsfw += ', bust enhanced and accentuated by provocative pose, cleavage deepened intentionally';
          nsfw += ', large bust clearly visible and centered, generous curves fully displayed';
        } else if (['B', 'C'].includes(character.bust)) {
          nsfw += ', cleavage tastefully yet clearly visible, bust elegantly and attractively shown in sexy lingerie';
          nsfw += ', chest naturally and beautifully defined, visible cleavage subtly revealed';
          nsfw += ', breast curves delicately and sensually shown, natural bustline emphasized';
          nsfw += ', feminine curves highlighted by lingerie, bust presented attractively';
        }
      }
      
      // AMBIANCE - Plus immersive
      nsfw += ', intimate romantic bedroom setting, soft sensual lighting creating shadows';
      nsfw += ', warm amber ambient light, dim seductive lighting, candlelit atmosphere';
      nsfw += ', luxury silk sheets in warm tones, sumptuous bed with plush pillows';
      nsfw += ', romantic dreamy atmosphere, intimate private mood, highly seductive environment';
      nsfw += ', candles glowing softly in background, soft shadows enhancing curves';
      nsfw += ', dreamy bokeh lighting effect, sensual warm ambiance';
      
    } else if (character.gender === 'male') {
      // BASE NSFW MASCULIN - Plus intense
      nsfw += ', very sexy masculine pose, intensely seductive confident look, powerful intense gaze';
      nsfw += ', alluring attractive smile, dominant strong attitude, alpha male presence';
      nsfw += ', powerful penetrating eyes, inviting masculine expression, confident dominant body language';
      
      // TENUE NSFW - Plus révélateur
      nsfw += ', completely shirtless, bare muscular chest fully exposed, topless revealing physique';
      nsfw += ', wearing only very tight underwear, boxer briefs clearly visible and form-fitting';
      nsfw += ', very low-waisted pants revealing v-line, extremely revealing clothing';
      nsfw += ', abs sharply and clearly defined, chest muscles prominently visible';
      nsfw += ', defined v-line clearly showing, muscular definition strongly showcased';
      
      // POSE ET ATTITUDE - Plus dominant
      nsfw += ', standing very confidently and dominantly, leaning seductively against wall';
      nsfw += ', sitting on bed edge in dominant pose, reclining in masculine powerful pose';
      nsfw += ', hands behind head showing muscles, arms flexed displaying physique';
      nsfw += ', flexing subtly but noticeably, powerful dominant stance';
      nsfw += ', looking intensely directly at camera, very dominant gaze, supremely confident posture';
      nsfw += ', masculine powerful presence, body positioned to show strength';
      
      // PEAU ET MUSCLES - Plus défini
      nsfw += ', tanned skin glistening with subtle sheen, muscles sharply defined by dramatic lighting';
      nsfw += ', body highlighted and showcased, physique heavily emphasized and featured';
      nsfw += ', six-pack abs clearly visible and defined, chest muscles well-defined and prominent';
      nsfw += ', shoulders broad muscular and powerful, arms toned and strong';
      nsfw += ', strong masculine features, rugged masculine appeal, raw masculine sexual energy';
      nsfw += ', muscular athletic body clearly visible, definition in every muscle';
      
      // AMBIANCE - Plus virile
      nsfw += ', intimate masculine bedroom setting, strong moody lighting, dramatic shadows emphasizing muscles';
      nsfw += ', soft warm light highlighting skin and muscles, athletic powerful aesthetic';
      nsfw += ', seductive intimate mood, sensual masculine atmosphere';
    }
    
    // QUALITÉ FINALE - Plus haute
    nsfw += ', ultra-realistic photorealistic rendering, extremely high detail and definition';
    nsfw += ', professional fashion photography style, high-end magazine quality aesthetic';
    nsfw += ', cinematic lighting and composition, editorial quality image';
    nsfw += ', tasteful yet very sensual, artistic yet suggestive, elegant yet very sexy';
    nsfw += ', sophisticated intimate photography, luxury sensual aesthetic';
    
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
   * Attend le délai minimum entre les requêtes pour éviter le rate limiting
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minDelay) {
      const waitTime = this.minDelay - timeSinceLastRequest;
      console.log(`⏳ Attente de ${waitTime}ms pour éviter le rate limit...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Appelle l'API Pollinations ou l'API personnalisée avec gestion du rate limiting
   */
  async generateImage(prompt) {
    // Charger la config de l'API personnalisée
    await CustomImageAPIService.loadConfig();
    
    const strategy = CustomImageAPIService.getStrategy();
    console.log(`🎨 Stratégie de génération: ${strategy}`);
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🎨 Tentative ${attempt}/${this.maxRetries} de génération d'image...`);
        
        const encodedPrompt = encodeURIComponent(prompt);
        const seed = Date.now() + Math.floor(Math.random() * 10000);
        
        console.log(`📏 Taille prompt: ${prompt.length} chars, encodé: ${encodedPrompt.length} chars`);
        
        // Vérifier longueur UNIQUEMENT pour Pollinations (limite URL navigateur)
        // Freebox peut gérer des prompts beaucoup plus longs (API serveur)
        const needsPollinationsCheck = (strategy === 'pollinations-only') || 
                                        (strategy === 'freebox-first' && !CustomImageAPIService.hasCustomApi());
        
        if (needsPollinationsCheck && encodedPrompt.length > 2000) {
          console.warn('⚠️ Prompt très long pour Pollinations, peut causer des problèmes');
          // Ne pas bloquer, juste avertir
        }
        
        // STRATÉGIE 1: Freebox uniquement
        if (strategy === 'freebox-only') {
          console.log('🏠 Stratégie: Freebox uniquement');
          if (!CustomImageAPIService.hasCustomApi()) {
            throw new Error('API Freebox non configurée. Allez dans Paramètres > API d\'Images.');
          }
          // Pas de limite de longueur pour Freebox
          return await this.generateWithFreebox(prompt, seed);
        }
        
        // STRATÉGIE 2: Pollinations uniquement
        if (strategy === 'pollinations-only') {
          console.log('🌐 Stratégie: Pollinations uniquement');
          
          // Si prompt trop long, le tronquer pour Pollinations
          let finalPrompt = prompt;
          if (encodedPrompt.length > 2000) {
            console.log('✂️ Prompt trop long pour Pollinations, réduction...');
            // Tronquer intelligemment en gardant le début (description physique)
            finalPrompt = prompt.substring(0, Math.floor(prompt.length * 0.6));
            console.log(`📏 Nouveau prompt: ${finalPrompt.length} chars`);
          }
          
          await this.waitForRateLimit();
          return await this.generateWithPollinations(finalPrompt, seed);
        }
        
        // STRATÉGIE 3: Freebox en premier, puis Pollinations en fallback (DÉFAUT)
        if (strategy === 'freebox-first') {
          console.log('🔄 Stratégie: Freebox en premier, Pollinations en fallback');
          
          // Essayer Freebox si configuré (pas de limite de longueur)
          if (CustomImageAPIService.hasCustomApi()) {
            try {
              console.log('🏠 Tentative avec Freebox...');
              return await this.generateWithFreebox(prompt, seed);
            } catch (freeboxError) {
              console.error('❌ Freebox a échoué:', freeboxError.message);
              console.log('🔄 Passage à Pollinations en fallback...');
              lastError = freeboxError;
              // Continue vers Pollinations avec prompt potentiellement réduit
            }
          } else {
            console.log('⚠️ API Freebox non configurée, utilisation de Pollinations directement');
          }
          
          // Fallback: Pollinations (avec réduction si nécessaire)
          let finalPrompt = prompt;
          if (encodedPrompt.length > 2000) {
            console.log('✂️ Prompt trop long pour Pollinations fallback, réduction...');
            finalPrompt = prompt.substring(0, Math.floor(prompt.length * 0.6));
          }
          
          await this.waitForRateLimit();
          return await this.generateWithPollinations(finalPrompt, seed);
        }
        
        // Fallback par défaut: Pollinations
        console.log('⚠️ Stratégie inconnue, utilisation de Pollinations');
        await this.waitForRateLimit();
        return await this.generateWithPollinations(prompt, seed);
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Tentative ${attempt} échouée:`, error.message);
        
        // Si rate limited, attendre plus longtemps avant de réessayer
        if (error.response?.status === 429 || error.message.includes('rate limit')) {
          const waitTime = attempt * 5000; // 5s, 10s, 15s...
          console.log(`⏳ Rate limited détecté. Attente de ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (attempt < this.maxRetries) {
          // Attendre avant de réessayer (backoff exponentiel)
          const waitTime = attempt * 2000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // Toutes les tentatives ont échoué
    console.error('❌ Échec de génération après toutes les tentatives');
    throw new Error(`Impossible de générer l'image après ${this.maxRetries} tentatives. ${lastError?.message || 'Le service est peut-être temporairement surchargé.'}. Réessayez dans quelques minutes.`);
  }

  /**
   * Génère une image avec l'API Freebox
   */
  async generateWithFreebox(prompt, seed) {
    console.log('🏠 Génération avec API Freebox...');
    
    const imageUrl = CustomImageAPIService.buildImageUrl(prompt, {
      width: 768,
      height: 768,
      seed: seed,
    });
    
    console.log(`🔗 URL Freebox (${imageUrl.length} chars):`, imageUrl.substring(0, 100) + '...');
    
    try {
      // IMPORTANT: Vérification légère pour Freebox
      // L'API Freebox retourne l'URL directement, pas besoin de vérifier avec axios.get
      // qui peut causer des timeouts inutiles
      
      console.log('✅ URL Freebox générée, l\'image sera chargée par l\'app');
      return imageUrl;
      
      // Note: L'app chargera l'image elle-même avec son propre timeout
      // Pas besoin de la télécharger ici juste pour vérifier
    } catch (error) {
      console.error('❌ Erreur génération URL Freebox:', error.message);
      throw new Error(`API Freebox: ${error.message}`);
    }
  }

  /**
   * Génère une image avec Pollinations.ai
   */
  async generateWithPollinations(prompt, seed) {
    console.log('🌐 Génération avec Pollinations.ai...');
    
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `${this.baseURL}${encodedPrompt}?width=768&height=768&model=flux&nologo=true&enhance=true&seed=${seed}&private=true`;
    
    console.log(`🔗 URL Pollinations (${imageUrl.length} chars):`, imageUrl.substring(0, 100) + '...');
    
    try {
      // Attendre un peu pour la génération (Pollinations génère à la volée)
      console.log('⏳ Attente de la génération (3s)...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Vérifier que l'URL est accessible avec un HEAD request
      console.log('🔍 Vérification de l\'image...');
      const headResponse = await axios.head(imageUrl, {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (status) => status === 200
      });
      
      if (headResponse.status === 200) {
        console.log('✅ Image Pollinations vérifiée et accessible');
        return imageUrl;
      } else {
        throw new Error(`Pollinations a retourné le statut ${headResponse.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        // Timeout lors de la vérification - l'image se génère peut-être encore
        // On retourne l'URL quand même, elle se chargera dans l'app
        console.log('⚠️ Timeout vérification Pollinations, mais URL retournée (génération en cours)');
        return imageUrl;
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit Pollinations. Attendez quelques secondes.');
      }
      throw new Error(`Pollinations: ${error.message}`);
    }
  }

  /**
   * ANCIENNE MÉTHODE - Conservée pour compatibilité mais dépréciée
   */
  async _generateImageLegacy(prompt) {
    // Charger la config de l'API personnalisée
    await CustomImageAPIService.loadConfig();
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🎨 Tentative ${attempt}/${this.maxRetries} de génération d'image...`);
        
        // Attendre pour éviter le rate limiting (seulement pour Pollinations)
        if (!CustomImageAPIService.hasCustomApi()) {
          await this.waitForRateLimit();
        }
        
        const encodedPrompt = encodeURIComponent(prompt);
        
        // Ajouter un seed aléatoire pour varier les images
        const seed = Date.now() + Math.floor(Math.random() * 10000);
        
        // Utiliser l'API personnalisée ou Pollinations
        let imageUrl;
        if (CustomImageAPIService.hasCustomApi()) {
          console.log('🏠 Utilisation de l\'API personnalisée');
          imageUrl = CustomImageAPIService.buildImageUrl(prompt, {
            width: 768,
            height: 768,
            seed: seed,
          });
        } else {
          // Utiliser plusieurs paramètres pour améliorer la qualité
          imageUrl = `${this.baseURL}${encodedPrompt}?width=768&height=768&model=flux&nologo=true&enhance=true&seed=${seed}&private=true`;
        }
        
        console.log(`🔗 URL générée (longueur: ${imageUrl.length})`);
        
        // Vérifier que l'URL n'est pas trop longue (limite ~2000 caractères)
        if (imageUrl.length > 2000) {
          throw new Error('Prompt trop long. Réduisez la description.');
        }
        
        // Vérification différente selon le type d'API
        if (CustomImageAPIService.hasCustomApi()) {
          // API personnalisée (Freebox, Stable Diffusion, etc.)
          // Ces APIs prennent plus de temps mais génèrent l'image synchroniquement
          console.log('🏠 Génération avec API personnalisée (peut prendre 20-30 secondes)...');
          
          try {
            // Vérifier que l'image est accessible (timeout long pour la génération)
            const testResponse = await axios.get(imageUrl, {
              timeout: 60000, // 60 secondes pour la génération
              responseType: 'arraybuffer',
              maxContentLength: 10485760, // 10 MB pour les images complètes
              validateStatus: (status) => status === 200
            });
            
            // Vérifier que c'est bien une image
            const contentType = testResponse.headers['content-type'];
            if (contentType && contentType.includes('image')) {
              console.log('✅ Image générée et vérifiée depuis API personnalisée');
              return imageUrl;
            } else {
              throw new Error('Réponse invalide de l\'API personnalisée');
            }
          } catch (error) {
            console.error('❌ Erreur API personnalisée:', error.message);
            // Si l'API personnalisée échoue, essayer Pollinations en fallback
            console.log('🔄 Tentative avec Pollinations en fallback...');
            
            try {
              const pollinationsUrl = `${this.baseURL}${encodedPrompt}?width=768&height=768&model=flux&nologo=true&enhance=true&seed=${seed}&private=true`;
              console.log('🌐 URL Pollinations:', pollinationsUrl.substring(0, 100) + '...');
              
              await this.waitForRateLimit();
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              const pollinationsTest = await axios.head(pollinationsUrl, {
                timeout: 15000,
                maxRedirects: 5,
                validateStatus: (status) => status === 200 || status === 404
              });
              
              if (pollinationsTest.status === 200) {
                console.log('✅ Image générée avec Pollinations (fallback)');
                return pollinationsUrl;
              }
            } catch (fallbackError) {
              console.error('❌ Fallback Pollinations échoué:', fallbackError.message);
            }
            
            throw new Error(`API personnalisée: ${error.message}`);
          }
        } else {
          // API Pollinations - génération à la volée
          console.log('🌐 Génération avec Pollinations.ai');
          
          // Attendre un délai pour la génération
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Retourner l'URL directement - Pollinations génère à la volée
          // L'image sera générée lors du premier accès
          console.log('✅ URL Pollinations retournée');
          return imageUrl;
        }
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Tentative ${attempt} échouée:`, error.message);
        
        // Si rate limited, attendre plus longtemps avant de réessayer
        if (error.response?.status === 429 || error.message.includes('rate limit')) {
          const waitTime = attempt * 5000; // 5s, 10s, 15s...
          console.log(`⏳ Rate limited détecté. Attente de ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (attempt < this.maxRetries) {
          // Attendre avant de réessayer (backoff exponentiel)
          const waitTime = attempt * 2000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // Toutes les tentatives ont échoué
    console.error('❌ Échec de génération après toutes les tentatives');
    throw new Error(`Impossible de générer l'image après ${this.maxRetries} tentatives. Le service est peut-être temporairement surchargé. Réessayez dans quelques minutes.`);
  }
}

export default new ImageGenerationService();
