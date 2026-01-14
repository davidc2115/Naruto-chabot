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
    
    // PROMPTS ANATOMIQUES ULTRA-STRICTS (intégrés au prompt positif)
    this.anatomyStrictPrompt = 
      'ANATOMICALLY PERFECT HUMAN BODY: ' +
      'exactly ONE person, exactly TWO arms attached to shoulders, exactly TWO legs attached to hips, ' +
      'exactly TWO hands with FIVE fingers each, exactly TWO feet with five toes each, ' +
      'ONE head, ONE face, TWO eyes symmetrically placed, ONE nose centered, ONE mouth, TWO ears, ' +
      'proper human proportions, arms extend from shoulders naturally, ' +
      'legs extend from hips naturally, no floating body parts, ' +
      'anatomically correct female or male body, natural muscle structure, ' +
      'correct breast shape and size if female, natural nipple placement, ' +
      'symmetrical body, balanced pose, stable stance';
    
    // NEGATIVE PROMPT ULTRA-COMPLET (pour SD local)
    this.negativePromptFull = 
      'deformed, distorted, disfigured, mutated, bad anatomy, wrong anatomy, anatomical errors, ' +
      'extra limbs, missing limbs, three arms, four arms, three legs, four legs, extra body parts, ' +
      'floating limbs, disconnected limbs, merged limbs, fused body parts, ' +
      'malformed hands, twisted hands, backwards hands, extra fingers, missing fingers, ' +
      'fused fingers, six fingers, seven fingers, too many fingers, mutated hands, bad hands, ' +
      'clawed hands, webbed fingers, malformed feet, extra toes, ' +
      'extra arms, extra legs, duplicate body parts, clone, conjoined, ' +
      'two heads, two faces, multiple people, crowd, group, ' +
      'malformed breasts, misshapen breasts, uneven breasts, extra nipples, ' +
      'malformed face, asymmetrical face, cross-eyed, misaligned eyes, third eye, ' +
      'double chin overlapping, long neck, twisted neck, broken neck, ' +
      'blurry, low quality, pixelated, watermark, signature, text, logo, ' +
      'bad proportions, giant head, tiny head, long arms, short arms, ' +
      'jpeg artifacts, compression artifacts, noise, grainy, ' +
      'ugly, grotesque, horror, creepy, nightmare, zombie';
    
    // === GRANDE VARIÉTÉ DE POSITIONS ===
    this.positions = {
      standing: [
        'standing confidently, hand on hip, weight on one leg',
        'standing tall against wall, one leg bent, seductive lean',
        'standing in doorway, silhouette pose, dramatic lighting',
        'standing by window, natural light, elegant posture',
        'standing with arms raised above head, stretching sensually',
        'standing from behind, looking over shoulder, back view',
        'standing side profile, elegant curves emphasized',
      ],
      sitting: [
        'sitting elegantly on velvet armchair, legs crossed',
        'sitting on bed edge, legs slightly apart, inviting',
        'sitting on floor, knees up, casual intimate',
        'sitting in bathtub, surrounded by bubbles',
        'sitting at vanity mirror, applying makeup',
        'sitting cross-legged on silk sheets',
        'sitting with legs to side, graceful pose',
      ],
      lying: [
        'lying on back on bed, arms above head, relaxed',
        'lying on stomach, feet up, playful pose',
        'lying on side, propped on elbow, curves emphasized',
        'lying in bathtub, only head and shoulders visible',
        'lying on fur rug, luxurious sensual',
        'lying sprawled on silk sheets, carefree',
        'lying with one knee bent, inviting pose',
      ],
      kneeling: [
        'kneeling on bed, sitting back on heels',
        'kneeling upright, hands on thighs',
        'kneeling forward, hands on bed, arched back',
        'kneeling side view, elegant profile',
        'kneeling from behind, looking back over shoulder',
      ],
      bending: [
        'bending forward slightly, showing cleavage',
        'bent over vanity, looking in mirror',
        'bending to pick something up, rear view',
        'arching back dramatically, sensual curve',
        'leaning forward on hands and knees',
      ],
      special: [
        'stretching like just woke up, natural beauty',
        'getting out of shower, water droplets on skin',
        'stepping into or out of bathtub',
        'undressing, clothing halfway off',
        'wrapped in sheet or towel, partially fallen',
        'exercising, yoga pose, flexible body',
        'dancing sensually, movement captured',
      ],
    };
    
    // === GRANDE VARIÉTÉ DE LIEUX ===
    this.locations = {
      bedroom: [
        'in luxurious master bedroom, silk sheets, romantic atmosphere',
        'on king-size bed with satin pillows, intimate setting',
        'bedroom with fairy lights, dreamy ambiance',
        'modern minimalist bedroom, clean aesthetic',
        'vintage boudoir room, antique furniture, elegant',
      ],
      bathroom: [
        'in marble bathroom, steam from hot water',
        'near clawfoot bathtub, vintage elegant',
        'in modern shower, glass walls, water streaming',
        'by bathroom mirror, steamy atmosphere',
        'in jacuzzi with bubbles, relaxing',
      ],
      pool: [
        'by infinity pool, sunset background',
        'in swimming pool, wet body glistening',
        'poolside on lounger, tropical setting',
        'near waterfall pool feature, exotic',
      ],
      nature: [
        'on private beach, waves in background',
        'in forest clearing, natural sunlight',
        'near lake at sunset, golden hour',
        'in flower field, romantic natural setting',
        'on balcony overlooking ocean',
      ],
      interior: [
        'in penthouse with city view at night',
        'by fireplace, warm flickering light',
        'on leather couch in living room',
        'in artist studio with natural light',
        'in front of large window, silhouette',
        'on fur rug near fireplace',
        'in walk-in closet, mirror reflection',
      ],
      special: [
        'hotel room with rose petals on bed',
        'yacht deck at sunset, luxury atmosphere',
        'private sauna, steamy hot atmosphere',
        'backstage dressing room, glamorous',
        'photo studio with professional lighting',
      ],
    };
    
    // === VARIÉTÉ DE TYPES DE PHOTOS ET ANGLES ===
    this.shotTypes = [
      // Vues de face
      'full body frontal shot showing entire figure from the front',
      'frontal view, facing camera directly, confident pose',
      'front view portrait, looking at camera, seductive gaze',
      // Vues de profil
      'side profile view, elegant silhouette emphasized',
      'profile shot showing curves, side view',
      'three-quarter angle, partial profile, mysterious',
      // Vues de dos
      'back view, showing spine and rear curves, looking over shoulder',
      'rear view, back turned to camera, glancing back seductively',
      'from behind, full back visible, arched spine',
      // Zooms spécifiques
      'close-up on chest and cleavage, sensual focus',
      'zoomed on curves and hips, body emphasis',
      'focus on rear and thighs, from behind',
      'upper body close-up, face and bust prominent',
      // Angles créatifs
      'from above looking down, unique perspective',
      'low angle looking up, powerful dramatic',
      'dutch angle, artistic tilt, dynamic',
      'mirror reflection shot, voyeuristic',
    ];
    
    // === VARIÉTÉ D'ÉCLAIRAGES ===
    this.lightingStyles = [
      'soft romantic candlelight, warm golden glow',
      'natural window light, gentle shadows',
      'dramatic chiaroscuro, strong contrast',
      'neon light pink and blue, modern aesthetic',
      'golden hour sunset light, magical',
      'studio professional lighting, flawless',
      'moonlight through window, ethereal blue',
      'fireplace warm glow, intimate cozy',
      'backlit silhouette, mysterious',
      'soft diffused light, dreamy atmosphere',
    ];
    
    // === VARIÉTÉ D'AMBIANCES ===
    this.moods = [
      'romantic passionate atmosphere, desire in the air',
      'playful teasing mood, mischievous smile',
      'elegant sophisticated, classy sensuality',
      'wild untamed energy, passionate intensity',
      'soft tender intimate, loving gaze',
      'mysterious seductive, enigmatic allure',
      'confident powerful, dominant presence',
      'innocent sweet, subtle sensuality',
      'hot steamy, intense desire',
      'relaxed comfortable, natural beauty',
    ];
    
    // TENUES NSFW ALÉATOIRES - TRÈS VARIÉES
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
   * Sélectionne un élément aléatoire d'un tableau
   */
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  /**
   * Sélectionne un élément aléatoire d'une catégorie dans un objet
   */
  randomFromCategory(obj) {
    const categories = Object.keys(obj);
    const category = categories[Math.floor(Math.random() * categories.length)];
    return this.randomChoice(obj[category]);
  }
  
  /**
   * Génère une combinaison unique de position + lieu + éclairage + ambiance
   */
  generateVariedSceneElements() {
    return {
      position: this.randomFromCategory(this.positions),
      location: this.randomFromCategory(this.locations),
      shotType: this.randomChoice(this.shotTypes),
      lighting: this.randomChoice(this.lightingStyles),
      mood: this.randomChoice(this.moods),
    };
  }

  /**
   * Retourne une tenue basée sur le niveau de relation
   * REFAIT SELON DEMANDE:
   * - Niveau 1: Habillé (robes, jupes, tops, décolletés)
   * - Niveau 2: Provocant (nuisettes, robes moulantes, mini-jupes, collants, bas, talons, transparent)
   * - Niveau 3: Lingerie (sous-vêtements, bikini, nuisette transparente)
   * - Niveau 4+: De plus en plus explicite
   */
  getOutfitByLevel(level) {
    const lvl = Math.min(Math.max(1, level || 1), 10);
    const outfits = {
      // === NIVEAU 1 - HABILLÉ SEXY (robes, jupes, tops, décolletés) ===
      1: [
        // Robes variées
        'wearing elegant red cocktail dress with plunging neckline, cleavage visible',
        'wearing tight black little dress, curves emphasized, short length',
        'wearing flowing summer dress with thin straps, shoulders bare',
        'wearing bodycon dress hugging every curve, side slit showing leg',
        'wearing off-shoulder evening gown, elegant and sexy',
        'wearing wrap dress with deep V showing cleavage, form-fitting',
        // Jupes variées
        'wearing short pleated skirt with tight blouse, legs visible',
        'wearing pencil skirt with silk blouse unbuttoned, professional sexy',
        'wearing denim mini skirt with crop top, casual and hot',
        'wearing leather skirt with lace top, edgy sexy',
        // Tops et décolletés
        'wearing low-cut top showing generous cleavage, jeans',
        'wearing crop top exposing toned midriff, high-waisted pants',
        'wearing halter top with plunging neckline, back exposed',
        'wearing tight sweater emphasizing bust, casual chic',
        'wearing corset top with jeans, cinched waist, cleavage pushed up',
        'wearing tank top with visible bra straps, casual sexy',
      ],
      // === NIVEAU 2 - PROVOCANT (nuisettes, robes moulantes, collants, bas, talons) ===
      2: [
        // Nuisettes et robes de soirée moulantes
        'wearing silky short nightgown barely covering thighs, suggestive',
        'wearing ultra-tight evening dress, every curve visible, almost see-through',
        'wearing satin slip dress clinging to body, no bra visible',
        'wearing sheer evening gown with strategic coverage, glamorous',
        // Mini-jupes provocantes
        'wearing extremely short mini-skirt, panties almost visible when sitting',
        'wearing leather mini-skirt with thigh-high boots, dominatrix vibe',
        'wearing pleated micro-skirt with garter belt visible underneath',
        // Collants, bas et talons
        'wearing sheer black stockings with garter belt, high heels, short skirt',
        'wearing fishnet stockings with suspenders, visible under dress',
        'wearing thigh-high boots with mini dress, powerful sexy',
        'wearing stiletto heels with ankle straps, showing off legs',
        // Tenues transparentes/suggestives
        'wearing semi-transparent blouse, bra visible underneath',
        'wearing mesh top over lace bra, skin visible through fabric',
        'wearing backless dress with no underwear, spine exposed',
        'wearing side-boob revealing top, daring fashion',
        'wearing wet-look leggings with crop top, shiny and tight',
      ],
      // === NIVEAU 3 - LINGERIE (sous-vêtements, bikini, nuisette transparente) ===
      3: [
        // Sous-vêtements classiques
        'wearing matching lace bra and panties set, feminine and sexy',
        'wearing push-up bra and thong, cleavage emphasized',
        'wearing satin underwear set, elegant and sensual',
        'wearing cotton panties and sports bra, innocent sexy',
        // Bikinis variés
        'wearing string bikini, minimal coverage, beach ready',
        'wearing triangle bikini, ties on sides, sexy vacation look',
        'wearing high-cut bikini bottom with bandeau top',
        'wearing micro bikini barely covering essentials',
        // Nuisettes et lingerie élaborée
        'wearing sheer transparent negligee, body visible through fabric',
        'wearing lace babydoll with matching thong, romantic',
        'wearing see-through chemise, nipples visible through lace',
        'wearing silk robe open over lingerie, teasing',
        // Ensembles lingerie
        'wearing corset with garter belt and stockings, burlesque style',
        'wearing bodysuit lingerie, lace detailing, one-piece sexy',
        'wearing bralette and high-waist panties, modern lingerie',
        'wearing crotchless panties with demi-cup bra, erotic lingerie',
      ],
      // === NIVEAU 4 - TOPLESS ===
      4: [
        'topless, bare breasts fully visible, wearing only lace panties',
        'nude from waist up, breasts exposed, wearing thong and heels',
        'topless with hands on hips confidently, wearing only stockings',
        'bare chested, wearing only unbuttoned jeans, casual topless',
        'topless wearing garter belt and stockings only, boudoir',
        'upper body completely nude, sheet covering from waist down',
        'topless in steamy shower, water on breasts',
        'nude torso, wearing only jewelry necklace between breasts',
        'topless lying on stomach, back and side of breast visible',
        'breasts fully exposed, holding panties playfully',
        'topless by pool in just bikini bottom, wet skin',
        'completely topless, nipples erect, confident pose',
      ],
      // === NIVEAU 5 - NU ARTISTIQUE ===
      5: [
        'completely nude, full frontal artistic pose, natural beauty',
        'fully naked lying elegantly on silk sheets, curves visible',
        'nude confident standing pose, nothing hidden, boudoir lighting',
        'naked in bathtub, bubbles strategically placed, relaxed',
        'artistic nude on fur rug, classic glamour photography',
        'nude by window, natural light on body, ethereal',
        'completely naked kneeling pose, graceful feminine',
        'nude from behind, full back and butt visible, looking over shoulder',
        'naked sitting cross-legged on bed, meditation nude',
        'nude stretched out on bed, morning light, lazy sensual',
        'fully nude in mirror reflection, voyeuristic artistic',
        'naked outdoors, natural setting, free spirit nude',
      ],
      // === NIVEAU 6+ - DE PLUS EN PLUS EXPLICITE ===
      6: [
        'sensual nude lying invitingly on bed, legs slightly parted',
        'erotic nude, passionate expression, touching self',
        'naked on silk sheets, body glistening with oil, sensual',
        'nude in candlelight, hands exploring own body',
        'fully exposed lying on stomach, butt raised, arched back',
        'naked cuddling pillow between legs, vulnerable sexy',
        'nude stretching provocatively, body fully displayed',
        'completely bare in hot tub, breasts above water, steamy',
      ],
      7: [
        'sexy nude pose, legs parted invitingly, bedroom eyes',
        'hot erotic nude on bed, hand between thighs',
        'naked on hands and knees, looking back seductively, rear view',
        'nude spread on leather couch, luxurious explicit',
        'completely exposed in shower, hands on body, wet',
        'naked with legs spread, touching intimately',
        'nude provocative pose, fingers near sex, teasing',
        'fully bare bent over, rear fully exposed and inviting',
      ],
      8: [
        'explicit nude pose, legs wide spread, sex visible',
        'extremely sexy naked, open provocative pose, nothing hidden',
        'nude wide open on bed, fingers spreading labia',
        'naked in very intimate position, explicit view',
        'completely exposed masturbation pose, erotic',
        'nude with legs up and spread, explicit full view',
        'explicit position, touching sex openly',
        'naked spread eagle on bed, maximum explicit exposure',
      ],
      9: [
        'ultra erotic nude, very explicit pose, penetration implied',
        'intensely sexual nude position, toys visible',
        'maximum exposure nude, legs wide, fingers inside',
        'extremely explicit naked pose, orgasmic expression',
        'nude in most intimate position, masturbating openly',
        'ultra revealing pose, complete explicit exposure',
        'sexually explicit nude, intense self-pleasure',
        'fully spread nude, ultimate explicit intimacy',
      ],
      10: [
        'maximum explicit nude, most provocative pose, extreme erotic',
        'ultimate erotic nude, nothing hidden, explicit masturbation',
        'absolute maximum exposure, orgasm captured, intensely sexual',
        'most explicit possible nude pose, complete vulnerability',
        'ultimate intimacy pose, toy penetration, everything visible',
        'maximum erotic exposure, passionate explicit climax',
        'most provocative nude imaginable, total explicit display',
        'extreme explicit position, ultimate sensual pleasure',
      ],
    };
    
    const effectiveLevel = lvl > 10 ? 10 : lvl;
    const levelOutfits = outfits[effectiveLevel] || outfits[1];
    return levelOutfits[Math.floor(Math.random() * levelOutfits.length)];
  }

  /**
   * Retourne une pose basée sur le niveau de relation
   * Progression: amicale → séductrice → intime → explicite
   * GRANDE VARIÉTÉ avec beaucoup d'options différentes
   */
  getPoseByLevel(level) {
    const lvl = Math.min(Math.max(1, level || 1), 10);
    const poses = {
      // Niveau 1 - Poses amicales - TRÈS VARIÉES
      1: [
        'standing casually with friendly warm smile, relaxed natural pose',
        'sitting elegantly with legs crossed, confident expression',
        'leaning against wall playfully, flirty smile',
        'walking towards camera, hair flowing, dynamic',
        'twirling in dress, movement captured, joyful',
        'laughing candidly, natural happy expression',
        'looking over shoulder with smile, turning pose',
        'hands in hair, carefree beautiful pose',
        'sitting on stairs, casual relaxed, stylish',
        'standing by window, thoughtful gaze, elegant',
      ],
      // Niveau 2 - Poses séductrices - TRÈS VARIÉES
      2: [
        'lying on bed propped on elbow, bedroom eyes',
        'sitting on bed edge, sensual expression',
        'standing with hand on hip, seductive pose',
        'posing like model, showing off figure',
        'lying on couch, glamorous Hollywood pose',
        'sitting backwards on chair, arms on backrest',
        'standing in doorway, silhouette emphasized',
        'lying with head hanging off bed, hair flowing down',
        'kneeling on bed, sitting on heels, elegant',
        'stretching arms above head, body elongated',
        'lying on fur rug, luxurious classic pose',
        'standing profile, looking at camera, mysterious',
      ],
      // Niveau 3 - Poses provocantes - TRÈS VARIÉES
      3: [
        'arching back sensually, curves emphasized',
        'kneeling on bed looking up, submissive',
        'lying on side, one hand on hip, seductive',
        'bending forward showing cleavage, teasing',
        'on hands and knees, crawling pose, playful',
        'lying on stomach, feet up, looking back',
        'straddling chair, confident provocative',
        'standing bent at waist, rear emphasized',
        'kneeling with back arched dramatically',
        'lying with leg raised high, flexible',
        'sitting with legs apart, inviting',
        'squatting pose, powerful and sexy',
      ],
      // Niveau 4 - Poses intimes - TRÈS VARIÉES
      4: [
        'lying back with one leg raised, intimate',
        'on all fours looking over shoulder, rear view',
        'legs apart on bed edge, open inviting',
        'stretching sensually, body displayed',
        'lying spread on bed, arms above head',
        'kneeling with hands behind head, exposed',
        'sitting legs open, leaning back on hands',
        'lying with knees up and apart, vulnerable',
        'on knees bent forward, back arched',
        'standing spread against wall, pinned pose',
        'lying on back, legs up in air',
        'side lying with top leg raised high',
      ],
      // Niveau 5 - Poses explicites - TRÈS VARIÉES
      5: [
        'legs spread revealing everything, explicit',
        'bent over showing rear, provocative',
        'lying legs open, nothing hidden',
        'kneeling legs apart, frontal exposed',
        'squatting wide, full exposure',
        'lying spread eagle, complete view',
        'on back legs over head, flexible',
        'doggy style pose, rear view',
        'sitting wide open, inviting',
        'standing bent forward, rear exposed',
        'lying sideways, leg raised high',
        'kneeling back arched, everything visible',
      ],
      // Niveau 6+ - Poses très explicites avec variations
      6: [
        'very explicit spread pose, everything visible',
        'extremely provocative open legs, intimate',
        'wide open missionary position on bed',
        'rear view bent over, legs spread',
        'on back legs pulled to chest, exposed',
        'kneeling face down, rear elevated',
        'spread open on chair, seated explicit',
        'standing one leg up on furniture, spread',
      ],
      7: [
        'highly erotic maximum exposure pose',
        'intensely sexual fully open position',
        'extreme spread on bed, passionate',
        'most revealing rear view, bent over',
        'legs behind head, ultimate flexibility',
        'spread wide in chair, slouched open',
        'on knees presenting, rear view',
        'lying inverted, legs spread up wall',
      ],
      8: [
        'ultra explicit pose, most revealing',
        'maximum exposure, nothing hidden',
        'extremely wide spread, passionate',
        'ultimate intimate position, explicit',
        'fully open presenting pose, erotic',
        'maximum spread kneeling, exposed',
        'most explicit standing pose, legs wide',
        'extreme flexibility pose, everything visible',
      ],
      9: [
        'extremely erotic wide open, ultimate exposure',
        'most provocative completely exposed',
        'absolute maximum spread, hot passionate',
        'ultra intimate explicit position',
        'most revealing pose possible, total exposure',
        'extreme explicit spread, intensely sexual',
        'ultimate provocative display, nothing hidden',
        'maximum erotic exposure position',
      ],
      10: [
        'ultimate explicit pose, maximum eroticism',
        'most sexual pose imaginable, complete exposure',
        'absolute peak explicitness, total display',
        'maximum possible intimacy pose, extreme',
        'ultimate erotic spread, everything shown',
        'most provocative position ever, passionate',
        'extreme maximum exposure, intense desire',
        'absolute ultimate explicit pose, nothing hidden',
      ],
    };
    
    const effectiveLevel = lvl > 10 ? 10 : lvl;
    const levelPoses = poses[effectiveLevel] || poses[1];
    return levelPoses[Math.floor(Math.random() * levelPoses.length)];
  }

  /**
   * Parse l'âge du personnage (gère les formats fantastiques)
   * Ex: "300 ans (apparence 25)" -> 25
   * Ex: "42" -> 42
   * Ex: "Immortelle (apparence 26)" -> 26
   */
  parseCharacterAge(ageValue) {
    const ageStr = String(ageValue || '');
    
    // Chercher d'abord "apparence XX" pour les personnages fantastiques
    const appearanceMatch = ageStr.match(/apparence\s*(\d+)/i);
    if (appearanceMatch) {
      return parseInt(appearanceMatch[1]);
    }
    
    // Sinon prendre le premier nombre trouvé
    const numMatch = ageStr.match(/(\d+)/);
    if (numMatch) {
      const age = parseInt(numMatch[1]);
      // Si l'âge est > 100, c'est probablement un âge fantastique
      // Utiliser une apparence raisonnable basée sur l'âge
      if (age > 100) {
        return Math.min(Math.max(Math.floor(age / 10), 20), 50);
      }
      return age;
    }
    
    return 25; // Âge par défaut
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
    
    // === ÂGE PRÉCIS (gère les formats comme "300 ans (apparence 25)") ===
    let age = 25;
    const ageStr = String(character.age || '');
    // Chercher d'abord "apparence XX" pour les personnages fantastiques
    const appearanceMatch = ageStr.match(/apparence\s*(\d+)/i);
    if (appearanceMatch) {
      age = parseInt(appearanceMatch[1]);
    } else {
      // Sinon prendre le premier nombre trouvé
      const numMatch = ageStr.match(/(\d+)/);
      if (numMatch) {
        age = parseInt(numMatch[1]);
        // Si l'âge est > 100, c'est probablement un âge fantastique, utiliser une apparence raisonnable
        if (age > 100) {
          age = Math.min(Math.max(Math.floor(age / 10), 20), 50);
        }
      }
    }
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
    
    // === CHEVEUX ULTRA-DÉTAILLÉS ===
    const hairColor = character.hairColor || this.extractFromAppearance(character, 'hair') || 'brown';
    description += `, beautiful ${hairColor} hair`;
    
    // Combiner tous les champs pour analyse
    const appearance = (
      (character.appearance || '') + ' ' + 
      (character.physicalDescription || '') + ' ' +
      (character.bodyType || '') + ' ' +
      (character.hairLength || '')
    ).toLowerCase();
    
    // Longueur des cheveux (utilise hairLength en priorité)
    const hairLength = (character.hairLength || '').toLowerCase();
    if (hairLength.includes('très long') || hairLength.includes('very long') || hairLength.includes('hanches') || hairLength.includes('taille')) {
      description += ', extremely long flowing luxurious hair reaching waist or hips';
    } else if (hairLength.includes('long') || appearance.includes('longs cheveux') || appearance.includes('long hair')) {
      description += ', long beautiful flowing hair reaching lower back';
    } else if (hairLength.includes('mi-long') || hairLength.includes('épaules') || appearance.includes('mi-long') || appearance.includes('shoulder')) {
      description += ', medium shoulder-length hair';
    } else if (hairLength.includes('court') || hairLength.includes('short') || appearance.includes('court')) {
      description += ', short stylish cropped hair';
    } else if (hairLength.includes('carré') || hairLength.includes('bob')) {
      description += ', sleek bob cut hair';
    } else if (hairLength.includes('pixie')) {
      description += ', cute pixie cut short hair';
    } else if (appearance.includes('long')) {
      description += ', long flowing hair';
    } else {
      description += ', medium length hair';
    }
    
    // Texture des cheveux
    if (hairLength.includes('bouclé') || hairLength.includes('curly') || appearance.includes('bouclé') || appearance.includes('curly')) {
      description += ', naturally curly bouncy hair with beautiful curls';
    } else if (hairLength.includes('ondulé') || hairLength.includes('wavy') || appearance.includes('ondulé') || appearance.includes('wavy')) {
      description += ', wavy flowing hair with soft waves';
    } else if (hairLength.includes('lisse') || hairLength.includes('straight') || appearance.includes('raides') || appearance.includes('lisse')) {
      description += ', perfectly straight sleek silky hair';
    } else if (hairLength.includes('frisé') || appearance.includes('frisé')) {
      description += ', tight curly frizzy hair';
    } else if (hairLength.includes('tresse') || appearance.includes('tresse') || appearance.includes('braid')) {
      description += ', beautifully braided hair';
    }
    
    // Style spécifique
    if (hairLength.includes('queue') || appearance.includes('queue de cheval') || appearance.includes('ponytail')) {
      description += ', styled in ponytail';
    } else if (hairLength.includes('chignon') || appearance.includes('chignon') || appearance.includes('bun')) {
      description += ', styled in elegant bun';
    } else if (hairLength.includes('frange') || appearance.includes('frange') || appearance.includes('bangs')) {
      description += ', with cute bangs framing face';
    } else if (hairLength.includes('undercut') || appearance.includes('undercut')) {
      description += ', with edgy undercut style';
    } else if (hairLength.includes('mèches') || appearance.includes('mèches') || appearance.includes('highlights')) {
      description += ', with stylish highlights';
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
    
    // === YEUX (utilise eyeColor en priorité, sinon extraction) ===
    const eyeColor = character.eyeColor || this.extractFromAppearance(character, 'eyes');
    if (eyeColor) {
      description += `, ${eyeColor} eyes`;
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
    
    // === BODY TYPE (utilise bodyType en priorité, sinon extraction) ===
    const bodyType = character.bodyType || this.extractFromAppearance(character, 'body');
    if (bodyType) {
      const bodyTypeLower = bodyType.toLowerCase();
      if (bodyTypeLower.includes('athléti') || bodyTypeLower.includes('muscl') || bodyTypeLower.includes('athletic')) {
        description += ', athletic toned muscular body';
      } else if (bodyTypeLower.includes('voluptu') || bodyTypeLower.includes('curv') || bodyTypeLower.includes('généreus')) {
        description += ', voluptuous curvy full-figured body';
      } else if (bodyTypeLower.includes('élancé') || bodyTypeLower.includes('mince') || bodyTypeLower.includes('slim')) {
        description += ', slim slender elegant body';
      } else if (bodyTypeLower.includes('graci') || bodyTypeLower.includes('fine')) {
        description += ', graceful slender refined body';
      } else if (bodyTypeLower.includes('puissant') || bodyTypeLower.includes('massif')) {
        description += ', powerful massive muscular build';
      } else if (bodyTypeLower.includes('ronde') || bodyTypeLower.includes('chubby') || bodyTypeLower.includes('plump')) {
        description += ', curvy plump soft body';
      } else if (bodyTypeLower.includes('matern') || bodyTypeLower.includes('maternel')) {
        description += ', maternal soft curvy body';
      } else {
        description += `, ${bodyType} body`;
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
    const text = ((character.appearance || '') + ' ' + (character.physicalDescription || '') + ' ' + (character.imagePrompt || '')).toLowerCase();
    
    if (type === 'hair') {
      const hairColors = [
        { key: 'platine', value: 'platinum blonde' },
        { key: 'platinum', value: 'platinum blonde' },
        { key: 'blond doré', value: 'golden blonde' },
        { key: 'golden blonde', value: 'golden blonde' },
        { key: 'blond cendré', value: 'ash blonde' },
        { key: 'ash blonde', value: 'ash blonde' },
        { key: 'blond miel', value: 'honey blonde' },
        { key: 'honey blonde', value: 'honey blonde' },
        { key: 'blonde', value: 'blonde' },
        { key: 'blond', value: 'blonde' },
        { key: 'roux flamboyant', value: 'fiery red' },
        { key: 'fiery red', value: 'fiery red' },
        { key: 'roux cuivré', value: 'copper red' },
        { key: 'copper red', value: 'copper red' },
        { key: 'rousse', value: 'red' },
        { key: 'roux', value: 'red' },
        { key: 'auburn', value: 'auburn' },
        { key: 'brun chocolat', value: 'chocolate brown' },
        { key: 'chocolate brown', value: 'chocolate brown' },
        { key: 'brune', value: 'brunette' },
        { key: 'brun', value: 'brown' },
        { key: 'châtain', value: 'chestnut brown' },
        { key: 'noir de jais', value: 'jet black' },
        { key: 'jet black', value: 'jet black' },
        { key: 'noire', value: 'black' },
        { key: 'noir', value: 'black' },
        { key: 'gris argenté', value: 'silver gray' },
        { key: 'silver gray', value: 'silver gray' },
        { key: 'argenté', value: 'silver' },
        { key: 'silver', value: 'silver' },
        { key: 'gris', value: 'gray' },
        { key: 'grey', value: 'gray' },
        { key: 'blanc', value: 'white' },
        { key: 'white', value: 'white' },
        { key: 'violet', value: 'purple' },
        { key: 'purple', value: 'purple' },
        { key: 'rose', value: 'pink' },
        { key: 'pink', value: 'pink' },
        { key: 'bleu', value: 'blue' },
        { key: 'blue', value: 'blue' },
        { key: 'vert', value: 'green' },
        { key: 'green', value: 'green' },
        { key: 'rouge vif', value: 'bright red' },
        { key: 'bright red', value: 'bright red' },
      ];
      for (const color of hairColors) {
        if (text.includes(color.key)) return color.value;
      }
    }
    
    if (type === 'eyes') {
      const eyeColors = [
        { key: 'bleu clair', value: 'light blue' },
        { key: 'bleu glacier', value: 'icy blue' },
        { key: 'bleu électrique', value: 'electric blue' },
        { key: 'blue eyes', value: 'blue' },
        { key: 'bleus', value: 'blue' },
        { key: 'bleu', value: 'blue' },
        { key: 'vert émeraude', value: 'emerald green' },
        { key: 'vert clair', value: 'light green' },
        { key: 'green eyes', value: 'green' },
        { key: 'verts', value: 'green' },
        { key: 'vert', value: 'green' },
        { key: 'noisette', value: 'hazel' },
        { key: 'hazel', value: 'hazel' },
        { key: 'ambre', value: 'amber' },
        { key: 'amber', value: 'amber' },
        { key: 'marron foncé', value: 'dark brown' },
        { key: 'marron chaleureux', value: 'warm brown' },
        { key: 'brown eyes', value: 'brown' },
        { key: 'marron', value: 'brown' },
        { key: 'gris acier', value: 'steel gray' },
        { key: 'gray eyes', value: 'gray' },
        { key: 'gris', value: 'gray' },
        { key: 'noirs profonds', value: 'deep black' },
        { key: 'black eyes', value: 'black' },
        { key: 'noirs', value: 'black' },
        { key: 'améthyste', value: 'purple amethyst' },
        { key: 'violet', value: 'purple' },
        { key: 'doré', value: 'golden' },
        { key: 'golden', value: 'golden' },
        { key: 'rouge', value: 'red' },
        { key: 'red eyes', value: 'red' },
      ];
      for (const color of eyeColors) {
        if (text.includes(color.key)) return color.value;
      }
    }
    
    if (type === 'bust') {
      // Extraire la taille de bonnet du texte
      const bustPatterns = [
        { pattern: /bonnet\s*h/i, value: 'H' },
        { pattern: /bonnet\s*g/i, value: 'G' },
        { pattern: /bonnet\s*f/i, value: 'F' },
        { pattern: /bonnet\s*e/i, value: 'E' },
        { pattern: /bonnet\s*dd/i, value: 'DD' },
        { pattern: /bonnet\s*d/i, value: 'D' },
        { pattern: /bonnet\s*c/i, value: 'C' },
        { pattern: /bonnet\s*b/i, value: 'B' },
        { pattern: /bonnet\s*a/i, value: 'A' },
        { pattern: /h\s*cup/i, value: 'H' },
        { pattern: /g\s*cup/i, value: 'G' },
        { pattern: /f\s*cup/i, value: 'F' },
        { pattern: /e\s*cup/i, value: 'E' },
        { pattern: /dd\s*cup/i, value: 'DD' },
        { pattern: /d\s*cup/i, value: 'D' },
        { pattern: /c\s*cup/i, value: 'C' },
        { pattern: /b\s*cup/i, value: 'B' },
        { pattern: /a\s*cup/i, value: 'A' },
        { pattern: /énorme.*poitrine|huge.*breast|massive.*breast/i, value: 'H' },
        { pattern: /très grosse.*poitrine|very large.*breast/i, value: 'G' },
        { pattern: /grosse.*poitrine|large.*breast/i, value: 'F' },
        { pattern: /généreuse.*poitrine|generous.*breast/i, value: 'E' },
        { pattern: /poitrine.*généreuse/i, value: 'E' },
        { pattern: /moyenne.*poitrine|medium.*breast/i, value: 'C' },
        { pattern: /poitrine.*moyenne/i, value: 'C' },
        { pattern: /petite.*poitrine|small.*breast/i, value: 'B' },
        { pattern: /poitrine.*petite/i, value: 'B' },
      ];
      for (const p of bustPatterns) {
        if (p.pattern.test(text)) return p.value;
      }
    }
    
    if (type === 'body') {
      const bodyTypes = [
        { key: 'très ronde', value: 'very curvy chubby' },
        { key: 'very curvy', value: 'very curvy' },
        { key: 'ronde', value: 'curvy plump' },
        { key: 'chubby', value: 'chubby curvy' },
        { key: 'voluptueuse', value: 'voluptuous curvy' },
        { key: 'voluptuous', value: 'voluptuous' },
        { key: 'pulpeuse', value: 'voluptuous full-figured' },
        { key: 'généreuse', value: 'generous curvy' },
        { key: 'curvy', value: 'curvy' },
        { key: 'athlétique', value: 'athletic toned' },
        { key: 'athletic', value: 'athletic' },
        { key: 'musclée', value: 'muscular toned' },
        { key: 'muscular', value: 'muscular' },
        { key: 'tonique', value: 'toned fit' },
        { key: 'toned', value: 'toned' },
        { key: 'sportive', value: 'athletic sporty' },
        { key: 'mince', value: 'slim slender' },
        { key: 'slim', value: 'slim' },
        { key: 'élancée', value: 'slender elegant' },
        { key: 'slender', value: 'slender' },
        { key: 'fine', value: 'slim petite' },
        { key: 'petite', value: 'petite small' },
        { key: 'maternelle', value: 'maternal soft' },
        { key: 'maternal', value: 'maternal' },
      ];
      for (const bt of bodyTypes) {
        if (text.includes(bt.key)) return bt.value;
      }
    }
    
    return null;
  }

  /**
   * Décrit l'anatomie de manière précise
   */
  buildAnatomyDescription(character, isRealistic = false) {
    let anatomy = '';
    
    // === FEMMES - POITRINE ULTRA-DÉTAILLÉE ===
    let bustSize = character.bust || character.bustSize || this.extractFromAppearance(character, 'bust');
    if (character.gender === 'female') {
      const bustDetails = {
        'A': { size: 'small A cup breasts', details: 'petite perky chest, small firm breasts, delicate feminine bust, cute small nipples' },
        'B': { size: 'natural B cup breasts', details: 'modest perky bust, small firm round breasts, cute feminine chest, pink nipples' },
        'C': { size: 'medium C cup breasts', details: 'balanced natural bust, medium round firm breasts, nice feminine cleavage, perfect proportions' },
        'D': { size: 'large D cup breasts', details: 'voluptuous generous bust, full round heavy breasts, impressive deep cleavage, feminine curves' },
        'DD': { size: 'very large DD cup breasts', details: 'very generous voluptuous bust, full heavy round breasts, deep sensual cleavage, prominent nipples' },
        'E': { size: 'huge E cup breasts', details: 'massive impressive bust, enormous full heavy breasts, extremely deep cleavage, large areolas' },
        'F': { size: 'enormous F cup breasts', details: 'huge voluptuous bust, gigantic full heavy breasts, incredible cleavage, very large areolas' },
        'G': { size: 'gigantic G cup breasts', details: 'gigantic massive bust, colossal heavy breasts, impossibly large chest, prominent nipples' },
        'H': { size: 'massive H cup breasts', details: 'enormous massive bust, incredibly huge heavy breasts, extreme proportions' }
      };
      
      // Normaliser la taille
      let normalizedBust = 'C'; // Défaut
      if (bustSize) {
        const bustLower = bustSize.toLowerCase();
        if (bustLower.includes('a') && !bustLower.includes('large')) normalizedBust = 'A';
        else if (bustLower.includes('b') || bustLower.includes('petit') || bustLower.includes('small')) normalizedBust = 'B';
        else if (bustLower.includes('c') || bustLower.includes('moyen') || bustLower.includes('medium')) normalizedBust = 'C';
        else if (bustLower.includes('dd') || bustLower.includes('très') || bustLower.includes('very large')) normalizedBust = 'DD';
        else if (bustLower.includes('d') || bustLower.includes('génér') || bustLower.includes('large') || bustLower.includes('voluptu')) normalizedBust = 'D';
        else if (bustLower.includes('e') || bustLower.includes('énorme') || bustLower.includes('huge')) normalizedBust = 'E';
        else if (bustLower.includes('f') || bustLower.includes('gigant')) normalizedBust = 'F';
        else if (bustLower.includes('g')) normalizedBust = 'G';
        else if (bustLower.includes('h')) normalizedBust = 'H';
        // Si c'est une lettre seule
        else if (['A','B','C','D','DD','E','F','G','H'].includes(bustSize.toUpperCase())) {
          normalizedBust = bustSize.toUpperCase();
        }
      }
      
      const bustInfo = bustDetails[normalizedBust] || bustDetails['C'];
      anatomy += `, ${bustInfo.size}, ${bustInfo.details}`;
      
      // Silhouette basée sur la poitrine
      if (['D', 'DD', 'E', 'F', 'G', 'H'].includes(normalizedBust)) {
        anatomy += ', wide feminine hips, hourglass figure, curvy sexy body, prominent bust';
      } else if (['A', 'B'].includes(normalizedBust)) {
        anatomy += ', slim elegant figure, petite feminine body, graceful silhouette';
      } else {
        anatomy += ', balanced feminine figure, natural curves, attractive proportions';
      }
    }
    
    // === HOMMES - PHYSIQUE ET ATTRIBUTS ===
    if (character.gender === 'male') {
      const bodyType = (character.bodyType || '').toLowerCase();
      const appearance = (character.appearance || '').toLowerCase();
      
      // Déterminer le type de corps basé sur bodyType/appearance
      if (bodyType.includes('muscl') || bodyType.includes('athléti') || appearance.includes('muscl')) {
        anatomy += ', muscular athletic male body, broad shoulders, defined pecs, six-pack abs, V-shaped torso, strong arms';
      } else if (bodyType.includes('mince') || bodyType.includes('slim') || bodyType.includes('élancé')) {
        anatomy += ', slim lean male body, slender build, toned physique, narrow waist';
      } else if (bodyType.includes('massif') || bodyType.includes('puissant') || bodyType.includes('trapu')) {
        anatomy += ', massive powerful male body, very broad shoulders, thick muscular build, imposing physique';
      } else if (bodyType.includes('moyen') || bodyType.includes('normal')) {
        anatomy += ', average male build, normal proportions, healthy physique';
      } else {
        anatomy += ', fit male body, masculine build, natural proportions';
      }
      
      // Taille du pénis (pour images explicites si mentionné)
      const penisSize = character.penis || character.maleSize;
      if (penisSize) {
        const size = parseInt(penisSize) || 15;
        if (size >= 22) {
          anatomy += ', very well endowed, impressive masculine attributes';
        } else if (size >= 18) {
          anatomy += ', well endowed, masculine attributes';
        }
      }
    }
    
    // === TEMPÉRAMENT (influence l'expression et la pose) ===
    const temperament = (character.temperament || '').toLowerCase();
    if (temperament) {
      if (temperament.includes('dominant') || temperament.includes('confiant')) {
        anatomy += ', confident powerful expression, dominant commanding presence, intense gaze';
      } else if (temperament.includes('timide') || temperament.includes('shy') || temperament.includes('gentle')) {
        anatomy += ', soft gentle expression, shy demure look, sweet innocent face';
      } else if (temperament.includes('passionn') || temperament.includes('passion')) {
        anatomy += ', passionate intense expression, burning desire in eyes, fiery presence';
      } else if (temperament.includes('mysterious') || temperament.includes('mystér')) {
        anatomy += ', mysterious enigmatic expression, alluring secretive gaze, intriguing presence';
      } else if (temperament.includes('playful') || temperament.includes('joueur') || temperament.includes('espiègle')) {
        anatomy += ', playful mischievous expression, teasing smile, fun spirited presence';
      } else if (temperament.includes('caring') || temperament.includes('doux') || temperament.includes('tender')) {
        anatomy += ', warm caring expression, gentle loving eyes, nurturing presence';
      } else if (temperament.includes('flirt') || temperament.includes('séduct')) {
        anatomy += ', flirtatious seductive expression, bedroom eyes, alluring inviting look';
      } else if (temperament.includes('direct') || temperament.includes('assertive')) {
        anatomy += ', direct assertive expression, confident bold gaze, straightforward presence';
      }
    }
    
    // Pour réaliste: insister sur l'anatomie correcte
    if (isRealistic) {
      anatomy += ', correct human anatomy, proper body proportions, natural limb positions';
      anatomy += ', realistic hands with five fingers each, proper arm length, symmetrical features';
    }
    
    return anatomy;
  }

  /**
   * Génère un profil d'apparence physique ULTRA-DÉTAILLÉ pour un personnage
   * Utilisé pour la page de profil et les descriptions
   */
  generateCompletePhysicalProfile(character) {
    let profile = '';
    
    // Genre et âge
    if (character.gender === 'female') {
      profile += `Femme de ${character.age || '?'} ans`;
    } else if (character.gender === 'male') {
      profile += `Homme de ${character.age || '?'} ans`;
    } else {
      profile += `Personne de ${character.age || '?'} ans`;
    }
    
    // Taille
    if (character.height) {
      profile += ` mesurant ${character.height}`;
    }
    
    // Type de corps
    if (character.bodyType) {
      profile += `, silhouette ${character.bodyType}`;
    }
    
    profile += '.\n\n';
    
    // Cheveux
    profile += '💇 CHEVEUX: ';
    if (character.hairColor) {
      profile += `${character.hairColor}`;
    }
    if (character.hairLength) {
      profile += `, ${character.hairLength}`;
    }
    profile += '\n';
    
    // Yeux
    profile += '👁️ YEUX: ';
    if (character.eyeColor) {
      profile += `${character.eyeColor}`;
    }
    profile += '\n';
    
    // Peau
    if (character.skinTone) {
      profile += `🎨 PEAU: ${character.skinTone}\n`;
    }
    
    // Corps spécifique selon le genre
    if (character.gender === 'female') {
      profile += '👗 SILHOUETTE: ';
      if (character.bust) {
        profile += `Poitrine ${character.bust}`;
      }
      if (character.bodyType) {
        profile += `, corps ${character.bodyType}`;
      }
      profile += '\n';
    } else if (character.gender === 'male') {
      profile += '💪 PHYSIQUE: ';
      if (character.bodyType) {
        profile += `Corps ${character.bodyType}`;
      }
      if (character.penis) {
        profile += `, ${character.penis} cm`;
      }
      profile += '\n';
    }
    
    // Tempérament
    if (character.temperament) {
      profile += `🎭 TEMPÉRAMENT: ${character.temperament}\n`;
    }
    
    // Description complète
    if (character.appearance) {
      profile += `\n📝 DESCRIPTION COMPLÈTE:\n${character.appearance}`;
    }
    
    return profile;
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
    // Parser l'âge correctement (gère "300 ans (apparence 25)")
    const charAge = this.parseCharacterAge(character.age);
    if (charAge < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    // App 18+ uniquement - toujours NSFW
    const nsfwMode = true;

    // Choisir le style (anime ou réaliste)
    const { style, isRealistic } = this.getRandomStyle();
    
    let prompt = style;
    
    // === CONSTRUIRE UN PROMPT ULTRA-DÉTAILLÉ BASÉ SUR LE PERSONNAGE ===
    prompt += ', ' + this.buildUltraDetailedPrompt(character, isRealistic);
    
    // App 18+ - toujours NSFW (tenue sexy mais pas trop explicite pour le profil)
    prompt += this.buildProfileNSFWPrompt(character, isRealistic);
    
    // ANATOMIE STRICTE (pour éviter les défauts)
    prompt += ', ' + this.anatomyStrictPrompt;
    
    // QUALITÉ SPÉCIFIQUE AU STYLE
    if (isRealistic) {
      prompt += ', ' + this.buildRealisticQualityPrompts();
      prompt += ', ultra-high quality photo, 8K resolution, sharp focus, professional photography';
      prompt += ', realistic skin texture, lifelike details, photographic quality';
      prompt += ', single person only, one subject, solo portrait, perfect lighting';
    } else {
      prompt += ', masterpiece anime art, best quality illustration, highly detailed anime';
      prompt += ', clean lines, vibrant colors, professional anime artwork';
      prompt += ', single character, solo, one person, detailed face';
    }
    
    prompt += ', adult 18+, mature content';

    console.log(`🖼️ Génération image profil (${isRealistic ? 'RÉALISTE' : 'ANIME'})...`);
    console.log(`📝 Prompt (début): ${prompt.substring(0, 300)}...`);
    return await this.generateImage(prompt);
  }
  
  /**
   * Construit un prompt ultra-détaillé basé sur TOUS les attributs du personnage
   */
  buildUltraDetailedPrompt(character, isRealistic = false) {
    const parts = [];
    
    // === 1. imagePrompt en priorité si disponible ===
    if (character.imagePrompt) {
      parts.push(character.imagePrompt);
    }
    
    // === 2. physicalDescription si disponible ===
    if (character.physicalDescription) {
      parts.push(character.physicalDescription.replace(/\n/g, ', '));
    }
    
    // === 3. Genre et base ===
    if (character.gender === 'female') {
      parts.push(isRealistic ? 'beautiful real woman, female' : 'beautiful anime woman, female character');
    } else if (character.gender === 'male') {
      parts.push(isRealistic ? 'handsome real man, male' : 'handsome anime man, male character');
    } else {
      parts.push('beautiful androgynous person');
    }
    
    // === 4. Âge précis ===
    const age = this.parseCharacterAge(character.age);
    parts.push(`${age} years old`);
    if (age >= 40) parts.push('mature elegant');
    else if (age >= 30) parts.push('adult confident');
    else if (age >= 25) parts.push('young adult');
    else parts.push('youthful adult');
    
    // === 5. Cheveux (couleur + longueur + style) ===
    if (character.hairColor) {
      let hairDesc = `${character.hairColor} hair`;
      if (character.hairLength) hairDesc += `, ${character.hairLength}`;
      parts.push(hairDesc);
    }
    
    // === 6. Yeux ===
    if (character.eyeColor) {
      parts.push(`${character.eyeColor} eyes, expressive eyes`);
    }
    
    // === 7. Morphologie / Body type ===
    if (character.bodyType) {
      parts.push(character.bodyType);
    } else if (character.height) {
      parts.push(`${character.height} tall`);
    }
    
    // === 8. Poitrine (femmes) ===
    if (character.gender === 'female' && (character.bust || character.bustSize)) {
      const bustSize = character.bust || character.bustSize;
      parts.push(`${bustSize} cup breasts`);
    }
    
    // === 9. Attribut masculin - IGNORÉ dans le prompt (pas pertinent pour image) ===
    
    // === 10. Accessoires (lunettes, etc.) ===
    if (character.glasses) {
      parts.push('wearing elegant glasses, spectacles');
    }
    
    // === 11. Apparence générale ===
    if (character.appearance) {
      parts.push(character.appearance.replace(/\n/g, ', '));
    }
    
    // === 12. Tenue ===
    if (character.outfit) {
      parts.push(`wearing: ${character.outfit.replace(/\n/g, ', ')}`);
    }
    
    return parts.filter(p => p && p.trim()).join(', ');
  }
  
  /**
   * Prompt NSFW spécifique pour le profil (plus soft que conversation)
   */
  buildProfileNSFWPrompt(character, isRealistic = false) {
    const poses = [
      'elegant pose, confident stance',
      'alluring pose, seductive look',
      'relaxed pose, inviting expression',
      'graceful pose, soft smile',
    ];
    const pose = poses[Math.floor(Math.random() * poses.length)];
    
    let prompt = `, ${pose}`;
    
    if (character.gender === 'female') {
      prompt += ', sensual, attractive, feminine beauty';
      if (isRealistic) {
        prompt += ', professional boudoir photography style';
      }
    } else if (character.gender === 'male') {
      prompt += ', masculine, attractive, confident';
      if (isRealistic) {
        prompt += ', professional portrait photography';
      }
    }
    
    return prompt;
  }

  /**
   * Génère l'image de scène (conversation)
   * @param {Object} character - Le personnage
   * @param {Object} userProfile - Le profil utilisateur
   * @param {Array} recentMessages - Messages récents
   * @param {number} relationLevel - Niveau de relation (1-5+)
   * MAINTENANT AVEC GRANDE VARIÉTÉ: positions, lieux, éclairages, ambiances
   */
  async generateSceneImage(character, userProfile = null, recentMessages = [], relationLevel = 1) {
    // Parser l'âge correctement (gère "300 ans (apparence 25)")
    const charAge = this.parseCharacterAge(character.age);
    if (charAge < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    // Application 18+ uniquement - toujours NSFW
    const level = Math.max(1, relationLevel || 1);
    console.log(`🔞 Génération image niveau ${level} - AVEC VARIÉTÉ`);

    // Choisir le style
    const { style, isRealistic } = this.getRandomStyle();
    
    // === GÉNÉRER LES ÉLÉMENTS VARIÉS ===
    const sceneElements = this.generateVariedSceneElements();
    console.log(`📍 Lieu: ${sceneElements.location.substring(0, 50)}...`);
    console.log(`💡 Éclairage: ${sceneElements.lighting.substring(0, 40)}...`);
    console.log(`🎬 Type de prise: ${sceneElements.shotType.substring(0, 40)}...`);
    
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
    
    // === LIEU / SETTING VARIÉ ===
    prompt += `, ${sceneElements.location}`;
    
    // === ÉCLAIRAGE VARIÉ ===
    prompt += `, ${sceneElements.lighting}`;
    
    // === TYPE DE PRISE DE VUE VARIÉ ===
    prompt += `, ${sceneElements.shotType}`;
    
    // === AMBIANCE VARIÉE ===
    prompt += `, ${sceneElements.mood}`;
    
    // TENUE BASÉE SUR LE NIVEAU DE RELATION - TRÈS VARIÉE
    const detectedOutfit = this.detectOutfit(recentMessages);
    if (detectedOutfit) {
      prompt += `, wearing ${detectedOutfit}`;
    } else {
      // Tenue basée sur le niveau - maintenant avec 8-12 options par niveau
      const levelOutfit = this.getOutfitByLevel(level);
      prompt += `, ${levelOutfit}`;
      console.log(`👗 Tenue niveau ${level}: ${levelOutfit.substring(0, 50)}...`);
    }
    
    // POSE BASÉE SUR LE NIVEAU DE RELATION - TRÈS VARIÉE
    // Utiliser soit la pose de niveau, soit la position variée
    const useLevelPose = Math.random() > 0.5;
    if (useLevelPose) {
      const levelPose = this.getPoseByLevel(level);
      prompt += `, ${levelPose}`;
      console.log(`🎭 Pose niveau ${level}: ${levelPose.substring(0, 50)}...`);
    } else {
      prompt += `, ${sceneElements.position}`;
      console.log(`🎭 Position variée: ${sceneElements.position.substring(0, 50)}...`);
    }
    
    // App 18+ - toujours NSFW
    prompt += this.buildNSFWPrompt(character, isRealistic);
    
    // ANATOMIE STRICTE (pour éviter les défauts)
    prompt += ', ' + this.anatomyStrictPrompt;
    
    // QUALITÉ AVEC ANTI-DÉFORMATION
    if (isRealistic) {
      prompt += ', ' + this.buildRealisticQualityPrompts();
      prompt += ', ultra-detailed photo, 8K, professional quality, sharp focus';
      prompt += ', single person, solo portrait';
    } else {
      prompt += ', masterpiece, best quality, highly detailed anime';
      prompt += ', single character, solo';
    }
    
    prompt += ', adult 18+, mature content';

    console.log(`🖼️ Génération image conversation (${isRealistic ? 'RÉALISTE' : 'ANIME'}) - VARIÉTÉ MAXIMALE`);
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
   * Génère une image avec retry et fallback intelligent
   */
  async generateImage(prompt, retryCount = 0) {
    await CustomImageAPIService.loadConfig();
    
    const strategy = CustomImageAPIService.getStrategy();
    console.log(`🎨 Stratégie: ${strategy} (tentative ${retryCount + 1}/${this.maxRetries + 2})`);
    
    let imageUrl;
    
    // Première tentative: stratégie configurée
    if (strategy === 'local') {
      imageUrl = await this.generateWithLocal(prompt);
    } else {
      imageUrl = await this.generateWithFreebox(prompt);
    }
    
    // Vérifier si l'image est valide
    const isValid = await this.validateImageUrl(imageUrl);
    
    if (isValid) {
      console.log('✅ Image générée avec succès');
      return imageUrl;
    }
    
    // Si échec et encore des retries disponibles
    if (retryCount < this.maxRetries - 1) {
      console.log(`⚠️ Image invalide, retry ${retryCount + 2}...`);
      // Délai progressif: 2s, 4s, 6s...
      await new Promise(r => setTimeout(r, 2000 + retryCount * 2000));
      return await this.generateImage(prompt, retryCount + 1);
    }
    
    // Dernière tentative: fallback API avec délai long
    console.log('🔄 Utilisation fallback API avec délai anti-rate-limit...');
    return await this.generateWithFallbackAPI(prompt, retryCount);
  }

  /**
   * Valide qu'une URL d'image est correcte
   */
  async validateImageUrl(imageUrl) {
    if (!imageUrl) return false;
    
    // Vérifier les patterns d'erreur connus (sauf pollinations.ai qui est valide)
    const errorPatterns = [
      'error',
      'failed',
      'invalid',
      'blocked',
      'nsfw_blocked',
      'rate_limit',
      'rate-limit',
      'too_many_requests',
      '429',
      '503',
      '502'
    ];
    
    const lowerUrl = imageUrl.toLowerCase();
    
    // Ne pas rejeter pollinations.ai car c'est une source valide
    const isPollinations = lowerUrl.includes('pollinations.ai');
    
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
    // Limiter le prompt pour éviter les erreurs
    const shortPrompt = prompt.substring(0, 800);
    const encodedPrompt = encodeURIComponent(shortPrompt);
    
    const token = await AsyncStorage.getItem('auth_token');
    const user = AuthService.getCurrentUser();
    const userId = user?.id || '';
    
    const separator = freeboxUrl.includes('?') ? '&' : '?';
    let imageUrl = `${freeboxUrl}${separator}prompt=${encodedPrompt}&width=768&height=768&seed=${seed}`;
    
    if (token) {
      imageUrl += `&token=${encodeURIComponent(token)}`;
    }
    if (userId) {
      imageUrl += `&user_id=${encodeURIComponent(userId)}`;
    }
    
    console.log(`🔗 URL Freebox générée (${shortPrompt.length} chars)`);
    return imageUrl;
  }

  /**
   * APIs de fallback alternatives (gratuits)
   */
  async generateWithFallbackAPI(prompt, apiIndex = 0) {
    const seed = Date.now() + Math.floor(Math.random() * 99999);
    const shortPrompt = prompt.substring(0, 500);
    const encoded = encodeURIComponent(shortPrompt);
    
    // Rotation entre différentes APIs
    const apis = [
      // Prodia (gratuit, rapide)
      () => `https://api.prodia.com/generate?prompt=${encoded}&seed=${seed}`,
      // GetImg.ai placeholder
      () => `https://getimg.ai/api/v1/generate?prompt=${encoded}`,
      // Lexica (recherche d'images similaires)
      () => `https://lexica.art/api/v1/search?q=${encoded}`,
    ];
    
    // Pour l'instant, générer une URL Pollinations avec délai anti-rate-limit
    await new Promise(r => setTimeout(r, 3000)); // Attendre 3s
    
    const antiCache = Date.now();
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&seed=${seed}&nologo=true&nofeed=true&model=flux&t=${antiCache}`;
    
    console.log(`🌐 Fallback API (attente anti-rate-limit)`);
    return url;
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

      const fullPrompt = `${prompt}, ${this.anatomyStrictPrompt}, masterpiece, best quality, ultra detailed`;

      console.log('🎨 Génération avec SD-Turbo local...');
      
      const result = await StableDiffusionLocalService.generateImage(fullPrompt, {
        negativePrompt: this.negativePromptFull,
        steps: 4, // Plus d'étapes pour meilleure qualité
        guidanceScale: 7.5, // Plus de guidance pour respecter le prompt
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
