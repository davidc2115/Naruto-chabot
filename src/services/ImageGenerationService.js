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
    
    // NEGATIVE PROMPT ULTRA-COMPLET (pour SD local et Pollinations)
    // Base - sera augmenté dynamiquement selon le body type
    this.negativePromptBase = 
      'deformed, distorted, disfigured, mutated, bad anatomy, wrong anatomy, anatomical errors, ' +
      'extra limbs, missing limbs, three arms, four arms, three legs, four legs, extra body parts, ' +
      'floating limbs, disconnected limbs, merged limbs, fused body parts, ' +
      'malformed hands, twisted hands, backwards hands, extra fingers, missing fingers, ' +
      'fused fingers, six fingers, seven fingers, too many fingers, mutated hands, bad hands, ';
      
    this.negativePromptFull = this.negativePromptBase +
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
    
    // PROMPT QUALITÉ PARFAITE - Pour images sans défauts
    this.perfectQualityPrompt = 
      'masterpiece, best quality, ultra detailed, extremely detailed, ' +
      'perfect anatomy, anatomically correct, perfect proportions, ' +
      'perfect hands, five fingers on each hand, correct finger count, ' +
      'perfect face, beautiful face, symmetrical face, detailed eyes, ' +
      'flawless skin, smooth skin, clear skin, no blemishes, ' +
      'professional lighting, studio lighting, perfect lighting, ' +
      'sharp focus, high resolution, 8K, ultra HD, ' +
      'single person, one character, solo, one subject only';
    
    // PROMPT QUALITÉ ANIME PARFAIT
    this.perfectAnimePrompt = 
      'masterpiece anime art, best quality anime, perfect anime illustration, ' +
      'clean lineart, perfect lines, no artifacts, vibrant colors, ' +
      'professional anime artwork, studio quality, detailed anime face, ' +
      'beautiful anime eyes, perfect anime proportions, ' +
      'single character, solo character, one person';
    
    // PROMPT QUALITÉ RÉALISTE PARFAIT
    this.perfectRealisticPrompt = 
      'ultra realistic photo, photorealistic, hyperrealistic, ' +
      'professional photography, DSLR quality, 8K resolution, ' +
      'perfect skin texture, realistic skin, natural lighting, ' +
      'professional portrait, magazine quality, flawless, ' +
      'single person, solo portrait, one subject';
    
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
    
    // === v5.3.54 - TYPES DE PHOTOS CORPS ENTIER TOUJOURS ===
    this.shotTypes = [
      // Vues de face corps entier sexy
      'full body frontal shot showing entire figure from head to feet, breasts and body visible',
      'full body frontal view facing camera, confident sexy pose, entire figure visible',
      'full body front view, legs visible, inviting pose, complete figure',
      // Vues de profil corps entier
      'full body side profile view, curves emphasized, entire figure from head to feet',
      'full body profile shot showing complete figure, breast and butt curve visible',
      'full body three-quarter angle, entire person visible, mysterious allure',
      // Vues de dos corps entier
      'full body back view, showing butt and spine, looking over shoulder, head to feet visible',
      'full body rear view, bent over slightly, entire figure shown, arched back',
      'full body from behind, rear visible, entire person head to feet',
      // Poses aguichantes corps entier
      'full body lying on bed, legs open, inviting pose, entire figure visible',
      'full body on knees, looking up, complete figure shown',
      'full body straddling position, dominant sexy pose, entire person visible',
      'full body arched back showing curves, erotic pose, head to feet',
      // Angles variés corps entier
      'full body shot from above, entire figure visible, voyeuristic angle',
      'full body low angle, powerful pose, complete figure from feet to head',
      'full body mirror reflection showing complete figure, front and back',
      'full body caught undressing, candid sexy moment, entire figure',
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
   * POSES NSFW VARIÉES: aguichante → sexy → topless → nue → explicite
   */
  getPoseByLevel(level) {
    const lvl = Math.min(Math.max(1, level || 1), 10);
    const poses = {
      // === NIVEAU 1 - POSES AGUICHANTES (habillée sexy) ===
      1: [
        'standing confidently, hand on hip, showing off dress, flirty smile',
        'sitting with legs crossed elegantly, cleavage visible, seductive look',
        'leaning forward showing deep cleavage, teasing smile',
        'bending over slightly, skirt riding up, playful pose',
        'lying on bed fully clothed, legs slightly apart, inviting',
        'standing in doorway, dress hugging curves, mysterious',
        'sitting on chair backwards, looking over shoulder, sexy',
        'walking towards camera, hips swaying, confident strut',
        'stretching arms up, shirt rising showing midriff, casual sexy',
        'adjusting dress strap, shoulder exposed, coy expression',
      ],
      // === NIVEAU 2 - POSES SEXY (tenues provocantes) ===
      2: [
        'lying on bed in lingerie, propped on elbow, bedroom eyes',
        'standing in sheer nightgown, body silhouette visible',
        'kneeling on bed in sexy outfit, hands on thighs',
        'bending over in mini skirt, rear visible, looking back',
        'sitting on bed edge in stockings and heels, legs apart slightly',
        'standing against wall in tight dress, curves emphasized',
        'lying on stomach in negligee, feet up, teasing',
        'straddling chair in revealing outfit, confident',
        'undressing slowly, dress half off shoulder',
        'in bathrobe loosely tied, hint of body underneath',
        'posing in mirror wearing lingerie, admiring reflection',
        'stretching in see-through top, nipples visible through fabric',
      ],
      // === NIVEAU 3 - POSES TOPLESS (lingerie/topless) ===
      3: [
        'topless, covering breasts with arms, teasing shy pose',
        'in bra and panties, unhooking bra, about to remove',
        'bare breasted, hands on hips, confident topless pose',
        'lying topless on bed, one arm across chest, sensual',
        'kneeling topless, breasts fully visible, submissive pose',
        'standing topless by window, natural light on breasts',
        'topless from behind, looking over shoulder, back visible',
        'removing bra, breasts being revealed, sexy striptease',
        'topless lying on stomach, side of breast visible',
        'sitting topless on bed, knees up, casual nude',
        'topless stretching, breasts lifted, morning pose',
        'in only panties, topless, playing with hair',
      ],
      // === NIVEAU 4 - POSES NUES ARTISTIQUES ===
      4: [
        'fully nude standing, hands at sides, confident nude',
        'naked lying on silk sheets, elegant artistic pose',
        'nude kneeling, back arched, breasts prominent',
        'completely naked on all fours, looking back seductively',
        'nude lying on back, one knee up, relaxed',
        'standing nude in profile, curves silhouetted',
        'naked sitting cross-legged, natural casual nude',
        'nude bent over, rear view, spine curved',
        'lying nude on fur rug, glamour pose',
        'naked in bathtub, bubbles barely covering',
        'nude stretching on bed, full body visible',
        'standing naked against wall, frontal view',
      ],
      // === NIVEAU 5 - POSES NUES SENSUELLES ===
      5: [
        'nude lying with legs slightly parted, inviting',
        'naked on bed, touching own body sensually',
        'nude spread on couch, one hand between thighs',
        'lying nude, legs open, intimate view',
        'naked kneeling, legs apart, frontal exposed',
        'nude arching back on bed, breasts up, legs spread',
        'completely naked squatting, full frontal view',
        'nude on all fours, rear presented, looking back',
        'lying nude with legs in air, spread',
        'naked sitting with legs wide open',
        'nude lying on side, top leg raised high',
        'standing nude, legs apart, hands on thighs',
      ],
      // === NIVEAU 6+ - POSES EXPLICITES PROGRESSIVES ===
      6: [
        'explicit nude, legs spread wide on bed, everything visible',
        'naked bent over, rear fully exposed, looking back invitingly',
        'nude lying spread eagle, complete frontal exposure',
        'on knees, legs spread, touching intimately',
        'lying nude, fingers between legs, self-pleasure pose',
        'naked doggy position, rear view, presented',
        'spread open on chair, fully exposed, inviting',
        'nude with legs over head, extreme flexibility, exposed',
      ],
      7: [
        'very explicit spread, fingers spreading labia',
        'maximum exposure nude, masturbation pose',
        'extreme spread position, penetration implied',
        'nude touching sex openly, erotic pose',
        'legs spread maximum, everything on display',
        'explicit rear view, bent over presenting',
        'self-pleasure pose, fingers inside',
        'ultimate exposure, orgasmic expression',
      ],
      8: [
        'ultra explicit pose, sex toy visible',
        'maximum spread with penetration',
        'extreme masturbation pose, intense pleasure',
        'most explicit position, nothing hidden',
        'climax pose, orgasm captured',
        'double penetration implied, toys visible',
        'extreme spread, wet and aroused visible',
        'ultimate explicit, peak eroticism',
      ],
      9: [
        'absolute maximum explicit, toys in use',
        'extreme orgasm pose, intense climax',
        'most revealing possible, multiple toys',
        'ultimate sexual position, peak explicit',
        'maximum penetration pose, intense',
        'extreme pleasure captured, orgasmic',
        'most provocative imaginable, everything shown',
        'ultimate erotic climax pose',
      ],
      10: [
        'peak explicit content, maximum everything',
        'ultimate orgasm captured, intense climax',
        'most extreme pose possible, total exposure',
        'absolute maximum eroticism, nothing hidden',
        'ultimate sexual peak, extreme pleasure',
        'maximum explicit climax, toys and fingers',
        'most provocative possible, intense orgasm',
        'absolute ultimate explicit pose, peak erotic',
      ],
    };
    
    const effectiveLevel = lvl > 10 ? 10 : lvl;
    const levelPoses = poses[effectiveLevel] || poses[1];
    return levelPoses[Math.floor(Math.random() * levelPoses.length)];
  }

  /**
   * Génère un negative prompt dynamique selon le body type du personnage
   * Exclut les morphologies opposées pour éviter la confusion
   */
  getDynamicNegativePrompt(character) {
    const physicalDetails = this.parsePhysicalDescription(character);
    let negative = this.negativePromptFull;
    
    const bodyType = (physicalDetails.body.type || '').toLowerCase();
    
    // Si le personnage est rond/curvy/voluptueux, exclure les corps minces
    if (bodyType.includes('bbw') || bodyType.includes('chubby') || bodyType.includes('plump') ||
        bodyType.includes('generous') || bodyType.includes('voluptuous') || bodyType.includes('curvy') ||
        bodyType.includes('thick') || bodyType.includes('maternal') || bodyType.includes('round')) {
      negative += ', thin body, slim body, skinny, anorexic, very thin, bony, underweight, flat stomach, ' +
                  'athletic build, toned abs, slim waist, narrow hips, small hips, flat butt';
      console.log('🚫 Negative prompt: exclusion morphologie mince');
    }
    
    // Si le personnage est mince/athlétique, exclure les corps ronds
    if (bodyType.includes('slim') || bodyType.includes('thin') || bodyType.includes('petite') ||
        bodyType.includes('athletic') || bodyType.includes('toned')) {
      negative += ', fat, obese, overweight, chubby, plump, BBW, thick belly, big belly, round belly';
      console.log('🚫 Negative prompt: exclusion morphologie ronde');
    }
    
    // Poitrine
    if (character.gender === 'female' && physicalDetails.bust.size) {
      const bustSize = physicalDetails.bust.size.toLowerCase();
      if (bustSize.includes('a-cup') || bustSize === 'small') {
        negative += ', big breasts, large breasts, huge breasts, busty, big chest, large bust';
      } else if (bustSize.includes('d') || bustSize.includes('e') || bustSize.includes('f') || 
                 bustSize.includes('g') || bustSize.includes('h') || bustSize === 'large' || bustSize === 'huge') {
        negative += ', flat chest, small breasts, tiny breasts, flat breasted, no breasts';
      }
    }
    
    return negative;
  }

  /**
   * Extrait une version courte du body type pour le renforcement
   */
  getShortBodyType(bodyType) {
    if (!bodyType) return '';
    const lower = bodyType.toLowerCase();
    if (lower.includes('bbw') || lower.includes('very fat')) return 'BBW curvy';
    if (lower.includes('chubby') || lower.includes('plump')) return 'chubby plump';
    if (lower.includes('generous') || lower.includes('généreus')) return 'generous curves';
    if (lower.includes('voluptuous') || lower.includes('bombshell')) return 'voluptuous';
    if (lower.includes('curvy') || lower.includes('hourglass')) return 'curvy';
    if (lower.includes('thick')) return 'thick curvy';
    if (lower.includes('maternal') || lower.includes('milf')) return 'mature curvy';
    if (lower.includes('athletic') || lower.includes('toned')) return 'athletic';
    if (lower.includes('slim') || lower.includes('slender')) return 'slim';
    if (lower.includes('petite')) return 'petite';
    if (lower.includes('massive') || lower.includes('muscular')) return 'muscular';
    return '';
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
   * Extrait le contexte de la conversation pour l'image
   * Détecte: lieu, position, tenue, action en cours
   */
  extractConversationContext(recentMessages = []) {
    if (!recentMessages || recentMessages.length === 0) {
      return { location: null, position: null, outfit: null, action: null };
    }
    
    // Analyser les 5 derniers messages
    const lastMessages = recentMessages.slice(-5).map(m => m.content?.toLowerCase() || '').join(' ');
    
    // === DÉTECTION DU LIEU ===
    const locations = {
      // Intérieur maison
      'chambre|bedroom|lit|bed|draps': 'in bedroom, on comfortable bed, intimate setting',
      'cuisine|kitchen|comptoir': 'in kitchen, domestic setting',
      'salon|living room|canapé|sofa': 'in living room, on couch, relaxed atmosphere',
      'salle de bain|bathroom|douche|shower|bain|bath': 'in bathroom, wet environment, steamy atmosphere',
      'bureau|office|travail': 'in office, professional setting',
      // Extérieur
      'jardin|garden|dehors|outside|terrasse': 'outside in garden, natural light, outdoor setting',
      'plage|beach|mer|sea|sable': 'at the beach, ocean view, sandy environment',
      'forêt|forest|bois|nature': 'in forest, natural surroundings, trees',
      'piscine|pool|eau': 'by the pool, water nearby, summer setting',
      // Lieux publics
      'restaurant|café|bar': 'in restaurant or cafe, ambient lighting',
      'hôtel|hotel|suite': 'in luxury hotel room, elegant decor',
      'voiture|car|siège': 'in car, vehicle interior',
      'ascenseur|elevator': 'in elevator, confined space',
    };
    
    let detectedLocation = null;
    for (const [keywords, location] of Object.entries(locations)) {
      if (new RegExp(keywords, 'i').test(lastMessages)) {
        detectedLocation = location;
        break;
      }
    }
    
    // === DÉTECTION DE LA POSITION ===
    const positions = {
      'allongé|couché|lying|lying down': 'lying down, horizontal position',
      'assis|sitting|assise': 'sitting position',
      'debout|standing': 'standing upright',
      'à genoux|kneeling|agenouillé': 'kneeling position',
      'quatre pattes|all fours|doggy': 'on all fours position',
      'penché|bent over|bending': 'bent over, leaning forward',
      'contre le mur|against wall': 'against the wall',
      'sur le dos|on back': 'lying on back, face up',
      'sur le ventre|on stomach': 'lying on stomach, face down',
      'chevauch|straddl|riding': 'straddling position',
    };
    
    let detectedPosition = null;
    for (const [keywords, position] of Object.entries(positions)) {
      if (new RegExp(keywords, 'i').test(lastMessages)) {
        detectedPosition = position;
        break;
      }
    }
    
    // === DÉTECTION DE LA TENUE ===
    const outfits = {
      'nue?|naked|nu ': 'completely naked, nude',
      'lingerie|sous-vêtements|underwear': 'wearing sexy lingerie',
      'robe|dress': 'wearing a dress',
      'jupe|skirt': 'wearing a skirt',
      'jean|pantalon|pants': 'wearing jeans/pants',
      'maillot|bikini|swimsuit': 'wearing bikini/swimsuit',
      'pyjama|nuisette|nightgown': 'wearing nightwear',
      'uniforme|uniform': 'wearing uniform',
      'costume|suit': 'wearing formal suit',
      'topless|seins nus': 'topless, bare breasts',
    };
    
    let detectedOutfit = null;
    for (const [keywords, outfit] of Object.entries(outfits)) {
      if (new RegExp(keywords, 'i').test(lastMessages)) {
        detectedOutfit = outfit;
        break;
      }
    }
    
    // === DÉTECTION DE L'ACTION ===
    const actions = {
      'embrass|kiss': 'romantic kissing moment',
      'câlin|hug|enlacer': 'embracing, hugging',
      'caress|touche|touch': 'being touched sensually',
      'déshabill|undress': 'undressing, removing clothes',
      'danse|dancing': 'dancing sensually',
      'regard|looking|regarde': 'making eye contact, looking seductively',
      'sourit|smile': 'smiling warmly',
      'rougit|blush': 'blushing shyly',
    };
    
    let detectedAction = null;
    for (const [keywords, action] of Object.entries(actions)) {
      if (new RegExp(keywords, 'i').test(lastMessages)) {
        detectedAction = action;
        break;
      }
    }
    
    console.log(`📍 Contexte détecté - Lieu: ${detectedLocation || 'auto'}, Position: ${detectedPosition || 'auto'}, Tenue: ${detectedOutfit || 'auto'}`);
    
    return {
      location: detectedLocation,
      position: detectedPosition,
      outfit: detectedOutfit,
      action: detectedAction,
    };
  }

  /**
   * Construit une description physique ULTRA-DÉTAILLÉE pour les prompts d'image
   * Inclut: visage, cheveux (couleur, longueur, type), corps, peau, attributs
   */
  buildUltraDetailedPhysicalPrompt(character, isRealistic = false) {
    const parts = [];
    const appearance = (
      (character.appearance || '') + ' ' + 
      (character.physicalDescription || '') + ' ' +
      (character.bodyType || '') + ' ' +
      (character.imagePrompt || '')
    ).toLowerCase();
    
    // === 1. GENRE ===
    if (character.gender === 'female') {
      parts.push(isRealistic ? 'beautiful real woman, female' : 'beautiful anime woman, female character');
    } else if (character.gender === 'male') {
      parts.push(isRealistic ? 'handsome real man, male' : 'handsome anime man, male character');
    } else {
      const nbType = this.getNonBinaryAppearanceType(character);
      parts.push(`androgynous ${nbType}-presenting person`);
    }
    
    // === 2. ÂGE ===
    const age = this.parseCharacterAge(character.age) || 25;
    parts.push(`${age} years old`);
    
    // === 3. FORME DU VISAGE ===
    const faceShapes = {
      'ovale|oval': 'oval face shape',
      'rond|round face': 'round soft face',
      'carré|square': 'square strong jawline',
      'coeur|heart': 'heart-shaped face',
      'long|oblong': 'long elegant face',
      'diamant|diamond': 'diamond-shaped face with high cheekbones',
      'triangul': 'triangular face',
      'angul': 'angular defined features',
      'doux|soft': 'soft gentle facial features',
    };
    let faceShape = 'harmonious face';
    for (const [key, value] of Object.entries(faceShapes)) {
      if (new RegExp(key, 'i').test(appearance)) {
        faceShape = value;
        break;
      }
    }
    parts.push(faceShape);
    
    // === 4. COULEUR DE PEAU ===
    const skinColors = {
      'porcelaine|très pale|très claire': 'porcelain pale white skin',
      'pale|claire|fair|pâle': 'fair light skin',
      'ivoire|ivory': 'ivory cream skin',
      'pêche|peach|rosé': 'peachy rosy skin',
      'bronzé|tan|doré|golden': 'tanned golden sun-kissed skin',
      'olive|méditerran': 'olive mediterranean skin',
      'caramel|métis': 'warm caramel mixed skin',
      'marron|brown|brun': 'warm brown skin',
      'ébène|noir|dark|foncé': 'beautiful dark ebony skin',
      'asiat|asian|jaune': 'asian warm-toned skin',
      'latin|hispani': 'latin warm skin tone',
    };
    let skinColor = 'natural healthy skin';
    for (const [key, value] of Object.entries(skinColors)) {
      if (new RegExp(key, 'i').test(appearance)) {
        skinColor = value;
        break;
      }
    }
    parts.push(skinColor);
    
    // === 5. TYPE DE PEAU ===
    const skinTypes = {
      'taches de rousseur|freckles': 'with cute freckles',
      'grain de beauté|beauty mark|mole': 'with beauty mark',
      'lisse|smooth': 'smooth flawless skin',
      'velout|velvet': 'velvety soft skin',
      'satin|satiny': 'satiny glowing skin',
    };
    for (const [key, value] of Object.entries(skinTypes)) {
      if (new RegExp(key, 'i').test(appearance)) {
        parts.push(value);
        break;
      }
    }
    
    // === 6. COULEUR DES CHEVEUX ===
    const hairColor = character.hairColor || this.extractFromAppearance(character, 'hair') || 'brown';
    parts.push(`${hairColor} hair`);
    
    // === 7. LONGUEUR DES CHEVEUX ===
    const hairLengths = {
      'très long|very long|hanches|waist': 'extremely long hair reaching waist',
      'long|longs': 'long flowing hair',
      'mi-long|shoulder|épaules': 'medium shoulder-length hair',
      'court|short': 'short stylish hair',
      'très court|very short|pixie': 'very short pixie cut',
      'carré|bob': 'sleek bob haircut',
      'rasé|shaved|buzz': 'shaved/buzzcut hair',
    };
    let hairLength = 'medium length hair';
    const hairLengthField = (character.hairLength || '').toLowerCase();
    for (const [key, value] of Object.entries(hairLengths)) {
      if (new RegExp(key, 'i').test(hairLengthField) || new RegExp(key, 'i').test(appearance)) {
        hairLength = value;
        break;
      }
    }
    parts.push(hairLength);
    
    // === 8. TYPE DE CHEVEUX ===
    const hairTypes = {
      'crépu|kinky|afro|coily': 'kinky coily afro-textured hair',
      'frisé|curly|boucl': 'curly bouncy hair',
      'ondulé|wavy': 'wavy flowing hair',
      'lisse|straight|raide': 'straight sleek hair',
      'épais|thick|volum': 'thick voluminous hair',
      'fin|thin|fine': 'fine delicate hair',
      'soyeux|silky': 'silky smooth hair',
      'brillant|shiny': 'shiny glossy hair',
    };
    for (const [key, value] of Object.entries(hairTypes)) {
      if (new RegExp(key, 'i').test(hairLengthField) || new RegExp(key, 'i').test(appearance)) {
        parts.push(value);
        break;
      }
    }
    
    // === 9. COULEUR DES YEUX ===
    const eyeColor = character.eyeColor || 'expressive eyes';
    parts.push(`${eyeColor} eyes`);
    
    // === 10. MORPHOLOGIE / BODY TYPE ===
    const bodyTypes = {
      'très mince|very slim|maigre': 'very slim thin body',
      'mince|slim|élancé|slender': 'slim slender body',
      'athlétique|athletic|musclé|toned|fit': 'athletic toned fit body',
      'moyenne|average|normal': 'average balanced body',
      'curvy': 'curvy body with soft curves',
      'pulpeuse|thick|épaisse': 'thick curvy body with curves',
      'ronde|plump|chubby|potelé': 'soft plump rounded body',
      'très ronde|very curvy|bbw': 'very curvy plump body, BBW',
      'matern|maternal': 'soft maternal curvy body',
    };
    let bodyType = 'balanced proportionate body';
    const bodyField = (character.bodyType || '').toLowerCase();
    for (const [key, value] of Object.entries(bodyTypes)) {
      if (new RegExp(key, 'i').test(bodyField) || new RegExp(key, 'i').test(appearance)) {
        bodyType = value;
        break;
      }
    }
    parts.push(bodyType);
    
    // === 11. TAILLE ===
    if (character.height) {
      const h = parseInt(character.height);
      if (h >= 180) parts.push('tall stature');
      else if (h >= 170) parts.push('above average height');
      else if (h <= 155) parts.push('petite short stature');
      else if (h <= 165) parts.push('average height');
    }
    
    // === 12. POITRINE (femmes) ===
    if (character.gender === 'female') {
      const bust = character.bust || '';
      const bustDescriptions = {
        'A': 'small petite A-cup breasts',
        'B': 'modest B-cup breasts',
        'C': 'medium C-cup breasts',
        'D': 'full D-cup breasts',
        'DD': 'large DD-cup breasts',
        'E': 'very large E-cup breasts',
        'F': 'huge F-cup breasts',
        'G': 'massive G-cup breasts',
      };
      if (bustDescriptions[bust]) {
        parts.push(bustDescriptions[bust]);
      }
    }
    
    // === 13. PÉNIS (hommes) ===
    if (character.gender === 'male' && character.penis) {
      const size = parseInt(character.penis);
      if (size >= 22) parts.push('very large endowed');
      else if (size >= 18) parts.push('well endowed');
      else if (size >= 14) parts.push('average endowment');
    }
    
    // === 14. FESSES ===
    const buttTypes = {
      'énorme fesse|huge butt|très grosse': 'huge massive round butt',
      'grosse fesse|big butt|large butt': 'big round plump butt',
      'fesses rebond|bubble butt|fesses rondes': 'round bubble butt',
      'curvy butt': 'curvy butt',
      'fesses musclé|toned butt|fit butt': 'toned muscular firm butt',
      'fesses plates|flat butt|petites fesses': 'small flat butt',
      'fesses fermes|firm butt|perky': 'firm perky butt',
    };
    for (const [key, value] of Object.entries(buttTypes)) {
      if (new RegExp(key, 'i').test(appearance)) {
        parts.push(value);
        break;
      }
    }
    
    // === 15. HANCHES ===
    if (appearance.includes('hanches larges') || appearance.includes('wide hips')) {
      parts.push('wide generous hips');
    } else if (appearance.includes('hanches étroites') || appearance.includes('narrow hips')) {
      parts.push('narrow slim hips');
    }
    
    // === 16. CUISSES ===
    if (appearance.includes('cuisses épaisses') || appearance.includes('thick thighs')) {
      parts.push('thick meaty thighs');
    } else if (appearance.includes('cuisses fines') || appearance.includes('slim thighs')) {
      parts.push('slim slender thighs');
    }
    
    // === 17. VENTRE ===
    if (appearance.includes('ventre rond') || appearance.includes('round belly')) {
      parts.push('soft round belly');
    } else if (appearance.includes('ventre plat') || appearance.includes('flat stomach')) {
      parts.push('flat toned stomach');
    }
    
    // === 18. ACCESSOIRES ===
    if (appearance.includes('lunettes') || appearance.includes('glasses')) {
      parts.push('wearing glasses');
    }
    if (appearance.includes('piercing')) {
      parts.push('with piercings');
    }
    if (appearance.includes('tatouage') || appearance.includes('tattoo')) {
      parts.push('with tattoos');
    }
    
    // === QUALITÉ IMAGE ===
    if (isRealistic) {
      parts.push('photorealistic, ultra detailed, 8K, professional photography');
    } else {
      parts.push('high quality anime art, detailed illustration');
    }
    
    return parts.join(', ');
  }

  /**
   * Calcule un hash simple et déterministe pour un personnage
   * Utilisé pour garantir la cohérence des images non-binaires
   */
  getCharacterHash(character) {
    const str = (character.id || character.name || 'default').toString();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir en 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Détermine l'apparence fixe d'un personnage non-binaire
   * Basé sur les caractéristiques explicites OU un hash déterministe
   */
  getNonBinaryAppearanceType(character) {
    const charAppearance = (character.appearance || '').toLowerCase();
    const charPhysical = (character.physicalDescription || '').toLowerCase();
    const charImagePrompt = (character.imagePrompt || '').toLowerCase();
    const combined = charAppearance + ' ' + charPhysical + ' ' + charImagePrompt;
    
    // === PRIORITÉ 1: Détection explicite dans les données ===
    // Mots-clés féminins explicites
    const explicitFeminine = combined.includes('femme') || combined.includes('woman') ||
                            combined.includes('poitrine') || combined.includes('seins') ||
                            combined.includes('breast') || combined.includes('bust') ||
                            combined.includes('féminine') || combined.includes('feminine') ||
                            combined.includes('robe') || combined.includes('dress') ||
                            combined.includes('jupe') || combined.includes('skirt') ||
                            combined.includes('décolleté') || combined.includes('maquillage');
    
    // Mots-clés masculins explicites
    const explicitMasculine = combined.includes('homme') || combined.includes('man ') ||
                             combined.includes('barbe') || combined.includes('beard') ||
                             combined.includes('musclé') || combined.includes('muscular') ||
                             combined.includes('masculine') || combined.includes('masculin') ||
                             combined.includes('torse') || combined.includes('chest hair') ||
                             combined.includes('pénis') || combined.includes('penis');
    
    // Si explicitement défini, utiliser cette apparence
    if (explicitFeminine && !explicitMasculine) {
      console.log(`🎭 Non-binaire ${character.name}: FÉMININ (explicite)`);
      return 'feminine';
    }
    if (explicitMasculine && !explicitFeminine) {
      console.log(`🎭 Non-binaire ${character.name}: MASCULIN (explicite)`);
      return 'masculine';
    }
    
    // === PRIORITÉ 2: Hash déterministe pour cohérence ===
    // Le même personnage aura TOUJOURS la même apparence
    const hash = this.getCharacterHash(character);
    const appearanceType = hash % 3; // 0, 1, ou 2
    
    if (appearanceType === 0) {
      console.log(`🎭 Non-binaire ${character.name}: FÉMININ (hash: ${hash})`);
      return 'feminine';
    } else if (appearanceType === 1) {
      console.log(`🎭 Non-binaire ${character.name}: MASCULIN (hash: ${hash})`);
      return 'masculine';
    } else {
      console.log(`🎭 Non-binaire ${character.name}: ANDROGYNE (hash: ${hash})`);
      return 'androgynous';
    }
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
        description += 'beautiful real woman, female human, realistic lady, real person, feminine features';
      } else {
        description += 'beautiful anime woman, female character, anime lady, feminine features';
      }
    } else if (character.gender === 'male') {
      if (isRealistic) {
        description += 'handsome real man, male human, realistic gentleman, real person, masculine features';
      } else {
        description += 'handsome anime man, male character, anime gentleman, masculine features';
      }
    } else {
      // NON-BINAIRE: Utiliser une apparence COHÉRENTE ET FIXE
      // Basée sur les caractéristiques explicites OU un hash déterministe
      const appearanceType = this.getNonBinaryAppearanceType(character);
      
      if (appearanceType === 'feminine') {
        // Non-binaire avec apparence féminine COHÉRENTE
        if (isRealistic) {
          description += 'beautiful androgynous feminine-presenting person, soft feminine features, delicate face, smooth skin, real person, ALWAYS feminine appearance';
        } else {
          description += 'beautiful androgynous feminine anime character, soft delicate features, graceful appearance, ALWAYS feminine';
        }
        description += ', feminine-presenting, soft curves, delicate frame';
      } else if (appearanceType === 'masculine') {
        // Non-binaire avec apparence masculine COHÉRENTE
        if (isRealistic) {
          description += 'handsome androgynous masculine-presenting person, defined angular features, strong jaw, real person, ALWAYS masculine appearance';
        } else {
          description += 'handsome androgynous masculine anime character, defined features, sharp look, ALWAYS masculine';
        }
        description += ', masculine-presenting, angular features, defined frame';
      } else {
        // Non-binaire vraiment androgyne
        if (isRealistic) {
          description += 'elegant androgynous person, perfectly balanced gender-neutral features, soft yet defined face, real person, ALWAYS androgynous';
        } else {
          description += 'elegant androgynous anime character, perfectly balanced features, graceful neutral appearance, ALWAYS androgynous';
        }
        description += ', truly androgynous, balanced features, elegant frame';
      }
      description += ', androgynous non-binary';
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
    
    // === MORPHOLOGIE DE BASE ===
    if (appearance.includes('grande') || appearance.includes('tall')) {
      description += ', tall stature';
    } else if (appearance.includes('petite') || appearance.includes('small')) {
      description += ', petite short stature';
    } else {
      description += ', average height';
    }
    
    // === TYPE DE CORPS GÉNÉRAL ===
    if (appearance.includes('musclé') || appearance.includes('muscular') || appearance.includes('athlétique') || appearance.includes('athletic')) {
      description += ', athletic toned fit body with defined muscles';
    } else if (appearance.includes('mince') || appearance.includes('slim') || appearance.includes('élancé') || appearance.includes('slender')) {
      description += ', slim slender lean body';
    } else if (appearance.includes('curvy') || appearance.includes('formes')) {
      description += ', curvy body with soft feminine curves';
    } else if (appearance.includes('ronde') || appearance.includes('round') || appearance.includes('potelée') || appearance.includes('chubby')) {
      description += ', curvy soft rounded plump body';
    } else if (appearance.includes('pulpeuse') || appearance.includes('thick')) {
      description += ', thick curvy body with pronounced curves';
    } else {
      description += ', balanced normal physique';
    }
    
    // === DÉTAILS CORPORELS SPÉCIFIQUES (ventre, fesses, hanches) ===
    // Ventre
    if (appearance.includes('ventre rond') || appearance.includes('ventre arrondi') || appearance.includes('belly') || appearance.includes('soft belly')) {
      description += ', soft round belly, plump midsection';
    } else if (appearance.includes('ventre plat') || appearance.includes('flat stomach') || appearance.includes('abdos')) {
      description += ', flat toned stomach, defined abs';
    }
    
    // Fesses
    if (appearance.includes('grosse fesse') || appearance.includes('grosses fesses') || appearance.includes('big butt')) {
      description += ', big round butt, large plump buttocks, thick ass';
    } else if (appearance.includes('fesses rebondies') || appearance.includes('bubble butt') || appearance.includes('fesses rondes')) {
      description += ', round bubble butt, perky buttocks';
    } else if (appearance.includes('fesses plates') || appearance.includes('flat butt')) {
      description += ', small flat butt';
    }
    
    // Hanches
    if (appearance.includes('hanches larges') || appearance.includes('wide hips')) {
      description += ', wide hips, curvy hips';
    } else if (appearance.includes('hanches étroites') || appearance.includes('narrow hips')) {
      description += ', narrow slim hips';
    }
    
    // Cuisses
    if (appearance.includes('cuisses épaisses') || appearance.includes('thick thighs') || appearance.includes('grosses cuisses')) {
      description += ', thick meaty thighs, full legs';
    } else if (appearance.includes('cuisses fines') || appearance.includes('slim thighs')) {
      description += ', slim slender thighs';
    }
    
    // Silhouette en sablier / poire
    if (appearance.includes('sablier') || appearance.includes('hourglass')) {
      description += ', perfect hourglass figure, narrow waist with wide hips';
    } else if (appearance.includes('poire') || appearance.includes('pear')) {
      description += ', pear-shaped body, wider hips than bust';
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
        // Rondeurs et formes
        { key: 'très ronde', value: 'very curvy chubby plump body' },
        { key: 'very curvy', value: 'very curvy full-figured' },
        { key: 'ronde', value: 'curvy plump soft body' },
        { key: 'chubby', value: 'chubby curvy plump' },
        { key: 'potelée', value: 'chubby plump soft body' },
        { key: 'thick', value: 'thick curvy body' },
        { key: 'pulpeuse', value: 'curvy full-figured' },
        { key: 'curvy', value: 'curvy full-figured' },
        { key: 'bbw', value: 'BBW curvy thick plump body' },
        // Fesses spécifiques
        { key: 'grosses fesses', value: 'big round butt thick ass' },
        { key: 'grosse fesse', value: 'big round butt thick ass' },
        { key: 'fesses rebondies', value: 'bubble butt perky round ass' },
        { key: 'big butt', value: 'big round butt thick ass' },
        { key: 'bubble butt', value: 'bubble butt round perky ass' },
        // Ventre spécifique
        { key: 'ventre rond', value: 'soft round belly plump midsection' },
        { key: 'ventre arrondi', value: 'soft round belly' },
        { key: 'belly', value: 'soft belly plump midsection' },
        // Hanches et cuisses
        { key: 'hanches larges', value: 'wide hips curvy hips' },
        { key: 'cuisses épaisses', value: 'thick thighs full legs' },
        { key: 'thick thighs', value: 'thick meaty thighs' },
        // Silhouettes
        { key: 'sablier', value: 'hourglass figure curvy' },
        { key: 'hourglass', value: 'hourglass figure' },
        { key: 'poire', value: 'pear-shaped body wide hips' },
        { key: 'pear', value: 'pear-shaped body' },
        // Athlétique et musclé
        { key: 'athlétique', value: 'athletic toned' },
        { key: 'athletic', value: 'athletic' },
        { key: 'musclée', value: 'muscular toned' },
        { key: 'muscular', value: 'muscular' },
        { key: 'tonique', value: 'toned fit' },
        { key: 'toned', value: 'toned' },
        { key: 'sportive', value: 'athletic sporty' },
        // Mince et élancé
        { key: 'mince', value: 'slim slender' },
        { key: 'slim', value: 'slim' },
        { key: 'élancée', value: 'slender elegant' },
        { key: 'slender', value: 'slender' },
        { key: 'fine', value: 'slim petite' },
        { key: 'petite', value: 'petite small' },
        { key: 'maternelle', value: 'maternal soft curvy' },
        { key: 'maternal', value: 'maternal' },
      ];
      for (const bt of bodyTypes) {
        if (text.includes(bt.key)) return bt.value;
      }
    }
    
    return null;
  }

  /**
   * Extrait les caractéristiques corporelles spécifiques (fesses, hanches, ventre, cuisses)
   * et les transforme en prompts explicites pour l'image
   * VERSION AMÉLIORÉE - Détecte TOUS les termes de morphologie
   */
  extractBodyFeatures(character) {
    const features = [];
    
    // Combiner TOUTES les sources de données du personnage
    const fullText = (
      (character.appearance || '') + ' ' + 
      (character.bodyType || '') + ' ' + 
      (character.physicalDescription || '') + ' ' +
      (character.imagePrompt || '') + ' ' +
      (character.personality || '') + ' ' +
      (Array.isArray(character.tags) ? character.tags.join(' ') : '')
    ).toLowerCase();
    
    console.log('🔍 extractBodyFeatures - Texte analysé:', fullText.substring(0, 300));
    
    // === PRIORITÉ 1: POITRINE EXPLICITE (character.bust) ===
    if (character.gender === 'female' && character.bust) {
      const bustSize = character.bust.toUpperCase().trim();
      const bustDescriptions = {
        'A': 'SMALL A-CUP BREASTS, petite flat chest, tiny breasts',
        'B': 'SMALL B-CUP BREASTS, modest small bust, petite chest',
        'C': 'MEDIUM C-CUP BREASTS, average bust, normal sized breasts',
        'D': 'LARGE D-CUP BREASTS, big full breasts, generous bust, impressive cleavage',
        'DD': 'VERY LARGE DD-CUP BREASTS, big heavy breasts, impressive large bust, deep cleavage',
        'E': 'HUGE E-CUP BREASTS, very big heavy breasts, enormous bust, massive chest',
        'F': 'HUGE F-CUP BREASTS, massive heavy breasts, gigantic bust, extremely large chest',
        'G': 'GIGANTIC G-CUP BREASTS, enormous massive breasts, huge heavy bust',
        'H': 'MASSIVE H-CUP BREASTS, extremely huge breasts, colossal bust, giant chest'
      };
      if (bustDescriptions[bustSize]) {
        features.push(bustDescriptions[bustSize]);
        console.log('👙 POITRINE DIRECTE:', bustSize, '→', bustDescriptions[bustSize].substring(0, 50));
      }
    }
    
    // === PRIORITÉ 2: PÉNIS EXPLICITE (character.penis) ===
    if (character.gender === 'male' && character.penis) {
      const penisText = character.penis.toLowerCase();
      const sizeMatch = penisText.match(/(\d+)\s*cm/);
      if (sizeMatch) {
        const size = parseInt(sizeMatch[1]);
        if (size >= 22) {
          features.push('very well endowed, large thick');
        } else if (size >= 18) {
          features.push('well endowed');
        } else if (size >= 15) {
          features.push('average build');
        }
      }
      console.log('🍆 PÉNIS DIRECT:', character.penis);
    }
    
    // === TYPE DE CORPS GÉNÉRAL - DÉTECTION ULTRA-COMPLÈTE ===
    
    // TRÈS RONDE / TRÈS GROSSE
    if (fullText.includes('très ronde') || fullText.includes('very round') || fullText.includes('très grosse') || fullText.includes('very fat') || fullText.includes('obèse') || fullText.includes('obese')) {
      features.push('very round very curvy very plump body, extremely soft full figure, very chubby thick');
    }
    // RONDE / RONDELET / RONDEUR
    else if (fullText.includes('ronde') || fullText.includes('rondelet') || fullText.includes('rondeur') || fullText.includes('round body') || fullText.includes('rounded')) {
      features.push('curvy plump soft rounded body, soft full figure, chubby cute');
    }
    
    // DODU / DODUE / POTELÉ
    if (fullText.includes('dodu') || fullText.includes('potelé') || fullText.includes('plump') || fullText.includes('pudgy') || fullText.includes('chubby')) {
      features.push('soft plump chubby body, cute pudgy figure, doughy soft curves');
    }
    
    // PULPEUSE (v5.3.30 - généreuse/voluptueuse désactivés)
    if (fullText.includes('pulpeuse') || fullText.includes('lush')) {
      features.push('voluptuous lush curvy body with generous sensual curves');
    }
    
    // CURVY / THICK
    if (fullText.includes('curvy') || fullText.includes('thick body') || fullText.includes('thicc')) {
      features.push('thick curvy body with pronounced sexy curves');
    }
    
    // BBW / PLUS SIZE
    if (fullText.includes('bbw') || fullText.includes('plus size') || fullText.includes('plus-size') || fullText.includes('grande taille')) {
      features.push('BBW curvy thick plump body, very generous big beautiful proportions');
    }
    
    // ENROBÉ / ENVELOPPÉ
    if (fullText.includes('enrobé') || fullText.includes('enveloppé') || fullText.includes('well-padded') || fullText.includes('soft body')) {
      features.push('soft padded body, pleasantly plump, well-rounded figure');
    }
    
    // MATERNELLE / FEMME AU FOYER
    if (fullText.includes('maternelle') || fullText.includes('maternal') || fullText.includes('femme au foyer') || fullText.includes('housewife') || fullText.includes('maman') || fullText.includes('mommy')) {
      features.push('soft maternal curvy body, nurturing motherly figure, womanly curves');
    }
    
    // === VENTRE SPÉCIFIQUE - ULTRA-DÉTAILLÉ ===
    if (fullText.includes('énorme ventre') || fullText.includes('très gros ventre') || fullText.includes('huge belly') || fullText.includes('big fat belly')) {
      features.push('huge round soft belly, very big plump tummy, large soft midsection, prominent belly');
    } else if (fullText.includes('gros ventre') || fullText.includes('big belly') || fullText.includes('fat belly') || fullText.includes('ventre proéminent')) {
      features.push('big round soft belly, large plump tummy, prominent soft midsection');
    } else if (fullText.includes('ventre rond') || fullText.includes('ventre arrondi') || fullText.includes('round belly') || fullText.includes('soft belly') || fullText.includes('ventre doux')) {
      features.push('soft round belly, plump cute tummy, gentle belly curve, soft padded midsection');
    } else if (fullText.includes('petit ventre') || fullText.includes('belly pooch') || fullText.includes('little belly')) {
      features.push('small soft belly pooch, gentle cute tummy, slight belly curve');
    }
    
    // === FESSES SPÉCIFIQUES - ULTRA-DÉTAILLÉ ===
    if (fullText.includes('énorme fesse') || fullText.includes('énormes fesses') || fullText.includes('huge butt') || fullText.includes('huge ass') || fullText.includes('massive butt')) {
      features.push('huge massive round butt, enormous thick buttocks, very big jiggly ass, extremely wide rear');
    } else if (fullText.includes('grosse fesse') || fullText.includes('grosses fesses') || fullText.includes('big butt') || fullText.includes('large butt') || fullText.includes('big round butt') || fullText.includes('gros fessier') || fullText.includes('big ass') || fullText.includes('fat ass')) {
      features.push('big round plump butt, large thick buttocks, generous thick ass, wide jiggly rear');
    } else if (fullText.includes('fesses rebondies') || fullText.includes('bubble butt') || fullText.includes('fesses rondes') || fullText.includes('round butt') || fullText.includes('perky butt')) {
      features.push('round bubble butt, perky plump buttocks, juicy round ass, bouncy rear');
    } else if (fullText.includes('curvy butt') || fullText.includes('nice butt') || fullText.includes('beau fessier')) {
      features.push('curvy butt, round buttocks, shapely rear');
    }
    
    // === HANCHES SPÉCIFIQUES ===
    if (fullText.includes('très larges hanches') || fullText.includes('hanches très larges') || fullText.includes('very wide hips') || fullText.includes('huge hips')) {
      features.push('very wide generous hips, extremely broad curvy hip bones, massive childbearing hips');
    } else if (fullText.includes('hanches larges') || fullText.includes('wide hips') || fullText.includes('larges hanches') || fullText.includes('broad hips') || fullText.includes('hanches rondes')) {
      features.push('wide hips, broad curvy hip bones');
    }
    
    // === CUISSES SPÉCIFIQUES ===
    if (fullText.includes('très grosses cuisses') || fullText.includes('huge thighs') || fullText.includes('massive thighs')) {
      features.push('very thick massive thighs, huge plump legs, extremely generous meaty thighs');
    } else if (fullText.includes('cuisses épaisses') || fullText.includes('thick thighs') || fullText.includes('grosses cuisses') || fullText.includes('cuisses pleines') || fullText.includes('full thighs') || fullText.includes('fat thighs')) {
      features.push('thick meaty thighs, full plump legs');
    }
    
    // === POITRINE TRÈS GÉNÉREUSE ===
    if (fullText.includes('énorme poitrine') || fullText.includes('très grosse poitrine') || fullText.includes('huge breasts') || fullText.includes('enormous breasts') || fullText.includes('massive breasts') || fullText.includes('énormes seins') || fullText.includes('gigantic breasts')) {
      features.push('huge massive breasts, enormous bust, very large heavy chest');
    } else if (fullText.includes('grosse poitrine') || fullText.includes('large breasts') || fullText.includes('big breasts') || fullText.includes('gros seins') || fullText.includes('full breasts')) {
      features.push('large full breasts, big bust, ample chest');
    } else if (fullText.includes('poitrine pleine') || fullText.includes('full bust') || fullText.includes('ample bust')) {
      features.push('full round breasts, ample bust, nicely filled chest');
    }
    
    // === SILHOUETTE GLOBALE ===
    if (fullText.includes('sablier') || fullText.includes('hourglass')) {
      features.push('perfect hourglass figure, narrow waist with wide hips and bust');
    } else if (fullText.includes('poire') || fullText.includes('pear shape') || fullText.includes('pear-shaped')) {
      features.push('pear-shaped body, wider hips than bust, curvy lower body');
    } else if (fullText.includes('pomme') || fullText.includes('apple shape') || fullText.includes('apple-shaped')) {
      features.push('apple-shaped body, fuller midsection, round in the middle');
    }
    
    // === PEAU DOUCE / MOELLEUSE ===
    if (fullText.includes('peau douce') || fullText.includes('soft skin') || fullText.includes('moelleuse') || fullText.includes('cushiony')) {
      features.push('soft smooth skin, cushiony touchable body');
    }
    
    // Log des features trouvées
    if (features.length > 0) {
      console.log(`✅ Features corporelles trouvées: ${features.length}`);
      features.forEach((f, i) => console.log(`   ${i+1}. ${f}`));
    } else {
      console.log('⚠️ Aucune feature corporelle spécifique trouvée dans:', fullText.substring(0, 100));
    }
    
    return features.length > 0 ? features.join(', ') : null;
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
      
      // === CORPS FÉMININ DÉTAILLÉ (fesses, hanches, ventre, cuisses) ===
      const fullAppearance = ((character.appearance || '') + ' ' + (character.bodyType || '') + ' ' + (character.physicalDescription || '')).toLowerCase();
      
      // Fesses détaillées
      if (fullAppearance.includes('grosse fesse') || fullAppearance.includes('grosses fesses') || fullAppearance.includes('big butt') || fullAppearance.includes('large butt')) {
        anatomy += ', big round plump butt, large thick buttocks, generous rear, wide ass';
      } else if (fullAppearance.includes('fesses rebondies') || fullAppearance.includes('bubble butt') || fullAppearance.includes('fesses rondes')) {
        anatomy += ', round bubble butt, perky plump buttocks, nice round ass';
      } else if (fullAppearance.includes('curvy butt')) {
        anatomy += ', curvy butt, round buttocks';
      } else if (fullAppearance.includes('fesses plates') || fullAppearance.includes('flat butt')) {
        anatomy += ', small flat butt, petite rear';
      }
      
      // Hanches détaillées
      if (fullAppearance.includes('hanches larges') || fullAppearance.includes('wide hips')) {
        anatomy += ', wide hips, curvy hip bones, feminine hips';
      } else if (fullAppearance.includes('hanches étroites') || fullAppearance.includes('narrow hips')) {
        anatomy += ', narrow slim hips, petite hip bones';
      }
      
      // Ventre détaillé
      if (fullAppearance.includes('ventre rond') || fullAppearance.includes('ventre arrondi') || fullAppearance.includes('round belly') || fullAppearance.includes('soft belly')) {
        anatomy += ', soft round belly, plump midsection, gentle tummy';
      } else if (fullAppearance.includes('ventre plat') || fullAppearance.includes('flat stomach') || fullAppearance.includes('abdos')) {
        anatomy += ', flat toned stomach, tight abs';
      }
      
      // Cuisses détaillées
      if (fullAppearance.includes('cuisses épaisses') || fullAppearance.includes('thick thighs') || fullAppearance.includes('grosses cuisses')) {
        anatomy += ', thick meaty thighs, full plump legs, generous thighs';
      } else if (fullAppearance.includes('cuisses fines') || fullAppearance.includes('slim thighs') || fullAppearance.includes('jambes fines')) {
        anatomy += ', slim slender thighs, long elegant legs';
      }
      
      // Type de corps global (curvy, ronde, etc.)
      if (fullAppearance.includes('curvy') || fullAppearance.includes('formes')) {
        anatomy += ', curvy body with soft feminine curves';
      } else if (fullAppearance.includes('ronde') || fullAppearance.includes('plump') || fullAppearance.includes('chubby') || fullAppearance.includes('potelée')) {
        anatomy += ', curvy plump soft body, rounded figure, soft curves';
      } else if (fullAppearance.includes('pulpeuse') || fullAppearance.includes('thick')) {
        anatomy += ', thick curvy body, pronounced curves, full-figured';
      } else if (fullAppearance.includes('bbw')) {
        anatomy += ', BBW curvy thick plump body, very full-figured, generous proportions';
      }
      
      // Silhouette basée sur la poitrine ET le corps
      const isCurvy = fullAppearance.includes('curvy') || fullAppearance.includes('ronde') || 
                      fullAppearance.includes('grosse') || fullAppearance.includes('thick');
      
      if (isCurvy || ['D', 'DD', 'E', 'F', 'G', 'H'].includes(normalizedBust)) {
        anatomy += ', hourglass figure, curvy sexy body, prominent bust and hips';
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
   * NE PAS ajouter de tenues ici - la tenue vient de getOutfitByLevel
   */
  buildNSFWPrompt(character, isRealistic = false) {
    let nsfw = '';
    
    // Expressions sensuelles (PAS de tenues, juste l'ambiance)
    nsfw += ', seductive sexy expression, bedroom eyes, sultry gaze, sensual atmosphere';
    nsfw += ', smooth flawless skin, beautiful body, attractive physique';
    
    if (character.gender === 'female') {
      // Poitrine (description uniquement, pas de vêtements)
      const bustSize = character.bust || character.bustSize;
      if (bustSize) {
        const bustDescriptions = {
          'A': 'small perky breasts',
          'B': 'petite natural breasts',
          'C': 'medium beautiful breasts',
          'D': 'large generous breasts, full bust',
          'DD': 'very large breasts, impressive bust',
          'E': 'huge breasts, massive bust',
          'F': 'enormous breasts, gigantic bust',
          'G': 'massive huge breasts',
          'H': 'enormous massive breasts'
        };
        
        let normalizedBust = bustSize;
        if (bustSize.toLowerCase().includes('petit')) normalizedBust = 'B';
        else if (bustSize.toLowerCase().includes('moyen')) normalizedBust = 'C';
        else if (bustSize.toLowerCase().includes('génér') || bustSize.toLowerCase().includes('voluptu')) normalizedBust = 'D';
        else if (bustSize.toLowerCase().includes('énorme')) normalizedBust = 'E';
        
        nsfw += `, ${bustDescriptions[normalizedBust] || bustDescriptions[bustSize] || 'beautiful breasts'}`;
      }
      
      nsfw += ', feminine curves, hourglass figure, sensual body';
      
    } else if (character.gender === 'male') {
      nsfw += ', masculine physique, attractive male body';
      if (character.penis) {
        const size = parseInt(character.penis) || 15;
        if (size >= 20) nsfw += ', extremely muscular body, powerful build';
        else if (size >= 17) nsfw += ', athletic muscular body';
      }
    }
    
    if (isRealistic) {
      nsfw += ', professional boudoir photography, high-end erotic photoshoot';
      nsfw += ', intimate sensual photo, elegant erotica, perfect lighting';
    } else {
      nsfw += ', beautiful ecchi anime art, high quality nsfw anime';
    }
    
    nsfw += ', NSFW content, adult only, erotic, sexy, sensual';
    
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
   * Génère l'image du personnage (profil) - MODE SFW
   * Les images de profil sont TOUJOURS SFW (élégantes mais pas explicites)
   * v5.3.3 - Morphologie renforcée avec exclusions
   */
  /**
   * v5.3.59 - Génération image PROFIL comme v5.3.34
   * MORPHOLOGIE EN PREMIER pour emphase maximale
   */
  async generateCharacterImage(character, userProfile = null) {
    // Parser l'âge correctement (gère "300 ans (apparence 25)")
    const charAge = this.parseCharacterAge(character.age);
    if (charAge < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    console.log(`✨ Génération image PROFIL (SFW) pour ${character.name}`);

    // Choisir le style (anime ou réaliste)
    const { style, isRealistic } = this.getRandomStyle();
    
    // v5.3.59 - Parser les détails physiques comme v5.3.34
    const physicalDetails = this.parsePhysicalDescription(character);
    
    // v5.3.59 - COMMENCER PAR FULL BODY + STYLE
    let prompt = 'FULL BODY SHOT showing entire character from head to feet, complete figure visible, NOT cropped, ' + style;
    
    // === v5.3.59 - MORPHOLOGIE EN PREMIER POUR EMPHASE MAXIMALE (comme v5.3.34) ===
    if (physicalDetails.body.type) {
      prompt += ', ' + physicalDetails.body.type;
      console.log(`🏋️ MORPHOLOGIE (priorité): ${physicalDetails.body.type}`);
    } else if (character.bodyType) {
      // Fallback: utiliser bodyType directement avec mapping complet
      const bodyTypeEn = {
        'mince': 'slim slender thin body',
        'élancée': 'slender elegant tall body',
        'moyenne': 'average normal body',
        'athlétique': 'athletic toned muscular body',
        'voluptueuse': 'VOLUPTUOUS CURVY body, hourglass figure, big bust, wide hips, sexy curves',
        'généreuse': 'GENEROUS CURVY body, full-figured, soft curves everywhere, plump',
        'pulpeuse': 'THICK CURVY body, plump figure, soft curves, full thighs',
        'ronde': 'CHUBBY ROUND body, soft belly, plump figure, BBW, soft curves',
        'très ronde': 'VERY CHUBBY BBW body, big soft belly, very plump, plus size, full figure',
        'plantureuse': 'VOLUPTUOUS body, big breasts, wide hips, sexy curvy, hourglass',
        'enrobée': 'PLUMP SOFT body, chubby, soft curves, round belly',
        'potelée': 'CHUBBY CUTE body, soft plump figure, round face'
      }[character.bodyType];
      if (bodyTypeEn) {
        prompt += `, ${bodyTypeEn}`;
        console.log(`🏋️ MORPHOLOGIE (fallback): ${character.bodyType} -> ${bodyTypeEn}`);
      }
    }
    
    // === v5.3.59 - POITRINE EN SECOND POUR EMPHASE (comme v5.3.34) ===
    if (character.gender === 'female') {
      if (physicalDetails.bust.description) {
        prompt += ', ' + physicalDetails.bust.description;
        console.log(`👙 POITRINE (priorité): ${physicalDetails.bust.description}`);
      } else if (character.bust) {
        const bustMap = {
          'A': 'SMALL A-CUP breasts, petite flat chest',
          'B': 'SMALL B-CUP breasts, modest small bust',
          'C': 'MEDIUM C-CUP breasts, average bust',
          'D': 'LARGE D-CUP breasts, big full breasts',
          'DD': 'VERY LARGE DD-CUP breasts, big heavy breasts',
          'E': 'HUGE E-CUP breasts, very big breasts',
          'F': 'HUGE F-CUP breasts, massive breasts',
          'G': 'GIGANTIC G-CUP breasts, enormous bust',
          'H': 'MASSIVE H-CUP breasts, extremely huge breasts'
        };
        const bustDesc = bustMap[character.bust.toUpperCase()] || `${character.bust} cup breasts`;
        prompt += `, ${bustDesc}`;
        console.log(`👙 POITRINE (fallback): ${character.bust} -> ${bustDesc}`);
      }
    }
    
    // Genre et âge
    const genderEn = character.gender === 'female' ? 'woman' : 'man';
    prompt += `, beautiful ${charAge} year old ${genderEn}`;
    
    // === CHEVEUX ===
    if (character.hairColor || character.hairLength) {
      const hairLengthEn = {
        'très courts': 'very short', 'courts': 'short', 'mi-longs': 'medium length',
        'longs': 'long', 'très longs': 'very long'
      }[character.hairLength] || character.hairLength || '';
      
      const hairColorEn = this.translateColorToEnglish(character.hairColor);
      prompt += `, ${hairLengthEn} ${hairColorEn} hair`.replace(/\s+/g, ' ');
    }
    
    // === YEUX ===
    if (character.eyeColor) {
      const eyeColorEn = this.translateColorToEnglish(character.eyeColor);
      prompt += `, ${eyeColorEn} eyes`;
    }
    
    // === PEAU ===
    if (character.skinTone) {
      const skinToneEn = {
        'très claire': 'very fair pale', 'claire': 'fair light', 'mate': 'olive tan',
        'bronzée': 'tanned golden', 'caramel': 'caramel brown', 'ébène': 'dark ebony'
      }[character.skinTone] || character.skinTone;
      prompt += `, ${skinToneEn} skin`;
    }
    
    // === TAILLE ===
    if (character.height) {
      const heightNum = parseInt(character.height);
      if (heightNum < 155) prompt += ', petite short';
      else if (heightNum < 165) prompt += ', average height';
      else if (heightNum < 175) prompt += ', tall';
      else prompt += ', very tall';
    }
    
    // === v5.3.55 - DESCRIPTIF PHYSIQUE DÉTAILLÉ EN PRIORITÉ ===
    if (character.physicalDescription && character.physicalDescription.length > 20) {
      // Utiliser le descriptif physique détaillé directement
      const cleanPhysicalDesc = character.physicalDescription
        .replace(/\n/g, ', ')
        .replace(/\./g, ',')
        .substring(0, 200);
      prompt += `, ${cleanPhysicalDesc}`;
      console.log(`📋 Descriptif physique: ${cleanPhysicalDesc.substring(0, 80)}...`);
    }
    
    // === APPARENCE SUPPLÉMENTAIRE ===
    if (character.appearance && character.appearance.length > 10) {
      // Extraire des mots-clés de l'apparence
      const appearanceKeywords = character.appearance
        .toLowerCase()
        .replace(/[,.:;!?]/g, ' ')
        .split(' ')
        .filter(w => w.length > 4)
        .slice(0, 8)  // Plus de mots-clés
        .join(', ');
      if (appearanceKeywords) {
        prompt += `, ${appearanceKeywords}`;
      }
    }
    
    // === TENUES SFW ÉLÉGANTES POUR PROFIL ===
    const sfwOutfits = [
      'wearing elegant casual outfit, fashionable',
      'wearing beautiful dress, classy',
      'wearing smart casual clothes, stylish',
      'wearing trendy modern outfit, chic',
      'wearing stylish blouse, elegant',
    ];
    prompt += `, ${sfwOutfits[Math.floor(Math.random() * sfwOutfits.length)]}`;
    
    // === POSES SFW NATURELLES ===
    const sfwPoses = [
      'natural confident pose, warm smile',
      'elegant standing pose, friendly expression',
      'relaxed casual pose, inviting look',
      'charming pose, attractive smile',
    ];
    prompt += `, ${sfwPoses[Math.floor(Math.random() * sfwPoses.length)]}`;
    
    // Qualités positives SFW
    prompt += ', beautiful, attractive, charming';
    prompt += ', tasteful, classy, SFW';
    
    // ANATOMIE STRICTE
    prompt += ', ' + this.anatomyStrictPrompt;
    
    // QUALITÉ SPÉCIFIQUE AU STYLE
    if (isRealistic) {
      prompt += ', ultra-high quality photo, 8K resolution, sharp focus, professional photography';
      prompt += ', realistic skin texture, lifelike details';
      prompt += ', single person only, one subject, solo portrait';
    } else {
      prompt += ', masterpiece anime art, best quality illustration, highly detailed anime';
      prompt += ', clean lines, vibrant colors';
      prompt += ', single character, solo, one person';
    }
    
    // === v5.3.59 - RENFORCEMENT FINAL DE LA MORPHOLOGIE (comme v5.3.34) ===
    // Répéter le body type à la fin pour emphase maximale
    if (physicalDetails.body.type) {
      const shortBody = this.getShortBodyType(physicalDetails.body.type);
      if (shortBody) {
        prompt += `, ${shortBody} body, ${shortBody}`;
      }
    }
    
    // === v5.3.59 - EXCLUSIONS MORPHOLOGIQUES (comme v5.3.34) ===
    const bodyType = (physicalDetails.body.type || character.bodyType || '').toLowerCase();
    if (bodyType.includes('bbw') || bodyType.includes('chubby') || bodyType.includes('plump') ||
        bodyType.includes('generous') || bodyType.includes('voluptuous') || bodyType.includes('curvy') ||
        bodyType.includes('thick') || bodyType.includes('round') || bodyType.includes('ronde') ||
        bodyType.includes('généreus') || bodyType.includes('pulpeu') || bodyType.includes('enrobé') ||
        bodyType.includes('potelé') || bodyType.includes('plantureu')) {
      // v5.3.62 - MOTS TRÈS FORTS pour les personnages ronds
      prompt += ', VERY FAT, OBESE, OVERWEIGHT, BIG BELLY, NOT THIN, NOT SKINNY, NOT SLIM, NOT FIT, NOT ATHLETIC';
      console.log('🔴 RENFORCEMENT PROFIL: FAT/OBESE ajoutés');
    }

    console.log(`🖼️ Génération image profil SFW (${isRealistic ? 'RÉALISTE' : 'ANIME'})...`);
    console.log(`📝 Prompt final: ${prompt.substring(0, 400)}...`);
    // v5.3.59 - Passer le character pour les détails physiques directs
    return await this.generateImage(prompt, character);
  }
  
  /**
   * Traduit une couleur française en anglais
   */
  translateColorToEnglish(colorFr) {
    if (!colorFr) return '';
    const colorMap = {
      'noir': 'black', 'noirs': 'black', 'noire': 'black',
      'brun': 'brown', 'brune': 'brown', 'bruns': 'brown',
      'châtain': 'chestnut brown', 'chatain': 'chestnut',
      'blond': 'blonde', 'blonde': 'blonde', 'blonds': 'blonde',
      'roux': 'red ginger', 'rousse': 'red ginger',
      'auburn': 'auburn',
      'blanc': 'white', 'blanche': 'white', 'blancs': 'white',
      'gris': 'grey', 'argenté': 'silver',
      'rose': 'pink', 'bleu': 'blue', 'vert': 'green', 'violet': 'purple',
      'marron': 'brown', 'noisette': 'hazel', 'ambre': 'amber'
    };
    const lower = colorFr.toLowerCase();
    return colorMap[lower] || colorFr;
  }
  
  /**
   * Parse le descriptif physique français pour en extraire les détails
   * Retourne un objet structuré avec tous les détails physiques
   */
  parsePhysicalDescription(character) {
    const details = {
      hair: { color: '', length: '', style: '', texture: '' },
      eyes: { color: '', shape: '', details: '' },
      face: { shape: '', features: [] },
      skin: { color: '', type: '', details: '' },
      body: { type: '', height: '', weight: '', build: '' },
      bust: { size: '', description: '' },
      penis: { size: '', description: '' },
      buttocks: { description: '' },
      hips: { description: '' },
      thighs: { description: '' },
      belly: { description: '' },
      special: []
    };
    
    // Collecter toutes les données textuelles
    const allText = [
      character.physicalDescription || '',
      character.appearance || '',
      character.bodyType || '',
      (character.tags || []).join(' '),
      character.hairColor || '',
      character.eyeColor || '',
      character.outfit || '',
      character.penis || '',
      character.bust || ''
    ].join(' ').toLowerCase();
    
    // === CHEVEUX - COULEUR ===
    const hairColorPatterns = {
      'noir': 'black', 'noirs': 'black', 'noir de jais': 'jet black',
      'brun': 'brown', 'bruns': 'brown', 'châtain': 'chestnut brown', 'châtains': 'chestnut',
      'blond': 'blonde', 'blonds': 'blonde', 'blond doré': 'golden blonde', 
      'blond platine': 'platinum blonde', 'blond cendré': 'ash blonde',
      'roux': 'red ginger', 'rousse': 'red ginger', 'auburn': 'auburn',
      'blanc': 'white', 'blancs': 'white', 'argenté': 'silver', 'gris': 'grey',
      'rose': 'pink', 'bleu': 'blue', 'vert': 'green', 'violet': 'purple'
    };
    for (const [fr, en] of Object.entries(hairColorPatterns)) {
      if (allText.includes(fr)) {
        details.hair.color = en;
        break;
      }
    }
    if (character.hairColor) {
      const hc = character.hairColor.toLowerCase();
      for (const [fr, en] of Object.entries(hairColorPatterns)) {
        if (hc.includes(fr)) {
          details.hair.color = en;
          break;
        }
      }
    }
    
    // === CHEVEUX - LONGUEUR ===
    if (allText.includes('très long') || allText.includes('jusqu\'aux fesses') || allText.includes('hanches')) {
      details.hair.length = 'extremely long hair reaching hips';
    } else if (allText.includes('long') || allText.includes('longs')) {
      details.hair.length = 'long flowing hair';
    } else if (allText.includes('mi-long') || allText.includes('épaules')) {
      details.hair.length = 'shoulder-length hair';
    } else if (allText.includes('court') || allText.includes('courts')) {
      details.hair.length = 'short hair';
    } else if (allText.includes('très court') || allText.includes('rasé')) {
      details.hair.length = 'very short buzz cut';
    } else if (allText.includes('carré')) {
      details.hair.length = 'bob cut';
    }
    
    // === CHEVEUX - STYLE ===
    if (allText.includes('coiffé en arrière') || allText.includes('slicked back')) {
      details.hair.style = 'slicked back';
    } else if (allText.includes('décoiffé') || allText.includes('bataille') || allText.includes('ébouriffé')) {
      details.hair.style = 'messy tousled';
    } else if (allText.includes('chignon')) {
      details.hair.style = 'elegant bun';
    } else if (allText.includes('queue de cheval') || allText.includes('queue-de-cheval') || allText.includes('ponytail')) {
      details.hair.style = 'ponytail';
    } else if (allText.includes('tresse') || allText.includes('tresses')) {
      details.hair.style = 'braided';
    } else if (allText.includes('frange')) {
      details.hair.style = 'with bangs';
    } else if (allText.includes('mèches')) {
      details.hair.style = 'with highlights';
    }
    
    // === CHEVEUX - TEXTURE ===
    if (allText.includes('lisse') || allText.includes('raide')) {
      details.hair.texture = 'straight sleek';
    } else if (allText.includes('ondulé') || allText.includes('ondulés')) {
      details.hair.texture = 'wavy';
    } else if (allText.includes('bouclé') || allText.includes('bouclés') || allText.includes('boucles')) {
      details.hair.texture = 'curly';
    } else if (allText.includes('frisé') || allText.includes('crépu') || allText.includes('afro')) {
      details.hair.texture = 'kinky coily afro';
    } else if (allText.includes('soyeux')) {
      details.hair.texture = 'silky smooth';
    } else if (allText.includes('épais')) {
      details.hair.texture = 'thick voluminous';
    }
    
    // === YEUX - COULEUR ===
    const eyeColorPatterns = {
      'bleu acier': 'steel blue', 'bleu clair': 'light blue', 'bleu foncé': 'dark blue',
      'bleu': 'blue', 'bleus': 'blue',
      'vert émeraude': 'emerald green', 'vert clair': 'light green', 'vert': 'green', 'verts': 'green',
      'marron foncé': 'dark brown', 'marron clair': 'light brown', 'marron': 'brown',
      'noisette': 'hazel', 'ambre': 'amber',
      'noir': 'dark black', 'noirs': 'dark',
      'gris': 'grey', 'gris perle': 'pearl grey',
      'violet': 'violet', 'rose': 'pink'
    };
    for (const [fr, en] of Object.entries(eyeColorPatterns)) {
      if (allText.includes('yeux ' + fr) || (character.eyeColor && character.eyeColor.toLowerCase().includes(fr))) {
        details.eyes.color = en;
        break;
      }
    }
    if (!details.eyes.color && character.eyeColor) {
      for (const [fr, en] of Object.entries(eyeColorPatterns)) {
        if (character.eyeColor.toLowerCase().includes(fr)) {
          details.eyes.color = en;
          break;
        }
      }
    }
    
    // === YEUX - FORME/DÉTAILS ===
    if (allText.includes('yeux bridés') || allText.includes('en amande')) {
      details.eyes.shape = 'almond shaped asian eyes';
    } else if (allText.includes('yeux ronds') || allText.includes('grands yeux')) {
      details.eyes.shape = 'big round eyes';
    } else if (allText.includes('yeux perçants') || allText.includes('regard intense')) {
      details.eyes.shape = 'piercing intense eyes';
    } else if (allText.includes('yeux doux')) {
      details.eyes.shape = 'soft gentle eyes';
    }
    if (allText.includes('longs cils') || allText.includes('cils fournis')) {
      details.eyes.details = 'long thick eyelashes';
    }
    
    // === VISAGE - FORME ===
    if (allText.includes('visage ovale') || allText.includes('ovale')) {
      details.face.shape = 'oval face';
    } else if (allText.includes('visage rond') || allText.includes('joues rondes')) {
      details.face.shape = 'round soft face';
    } else if (allText.includes('visage carré') || allText.includes('mâchoire carrée')) {
      details.face.shape = 'square strong jawline';
    } else if (allText.includes('visage fin') || allText.includes('traits fins') || allText.includes('traits délicats')) {
      details.face.shape = 'delicate fine features';
    } else if (allText.includes('angélique')) {
      details.face.shape = 'angelic delicate face';
    }
    
    // === VISAGE - TRAITS ===
    if (allText.includes('pommettes hautes') || allText.includes('hautes pommettes')) {
      details.face.features.push('high cheekbones');
    }
    if (allText.includes('fossettes')) {
      details.face.features.push('cute dimples');
    }
    if (allText.includes('barbe') && allText.includes('3 jours')) {
      details.face.features.push('3-day stubble');
    } else if (allText.includes('barbe')) {
      details.face.features.push('beard');
    }
    if (allText.includes('lèvres pleines') || allText.includes('lèvres pulpeuses')) {
      details.face.features.push('full plump lips');
    }
    if (allText.includes('cicatrice')) {
      details.face.features.push('scar');
    }
    if (allText.includes('taches de rousseur')) {
      details.face.features.push('freckles');
    }
    if (allText.includes('grain de beauté')) {
      details.face.features.push('beauty mark');
    }
    
    // === PEAU - COULEUR ===
    if (allText.includes('ébène') || allText.includes('noir') && allText.includes('peau')) {
      details.skin.color = 'beautiful dark ebony skin';
    } else if (allText.includes('caramel') || allText.includes('métis') || allText.includes('métisse')) {
      details.skin.color = 'warm caramel mixed skin';
    } else if (allText.includes('olive') || allText.includes('méditerran') || allText.includes('mate')) {
      details.skin.color = 'olive mediterranean tanned skin';
    } else if (allText.includes('bronzé') || allText.includes('doré') || allText.includes('hâlé')) {
      details.skin.color = 'golden tanned sun-kissed skin';
    } else if (allText.includes('pâle') || allText.includes('porcelaine') || allText.includes('laiteuse')) {
      details.skin.color = 'pale porcelain fair skin';
    } else if (allText.includes('asiat') || allText.includes('asiatique')) {
      details.skin.color = 'fair asian skin';
    } else if (allText.includes('caucasien') || allText.includes('clair')) {
      details.skin.color = 'fair caucasian skin';
    }
    
    // === MORPHOLOGIE / CORPS - AMÉLIORE AVEC MOTS-CLÉS MULTIPLES ===
    // Collecter les indicateurs de morphologie
    const bodyIndicators = {
      bbw: allText.includes('bbw') || allText.includes('très ronde') || allText.includes('très grosse') || allText.includes('obèse'),
      round: allText.includes('ronde') || allText.includes('rondelette') || allText.includes('potelée') || allText.includes('dodue'),
      chubby: allText.includes('chubby') || allText.includes('enrobée') || allText.includes('en chair'),
      generous: false, // Désactivé v5.3.30
      voluptuous: allText.includes('pulpeuse') || allText.includes('plantureuse'),
      curvy: allText.includes('courbes') || allText.includes('formes') || allText.includes('curvy') || allText.includes('curves'),
      thick: allText.includes('thick') || allText.includes('épaisse') || allText.includes('cuisses épaisses'),
      maternal: allText.includes('maternelle') || allText.includes('maman') || allText.includes('milf') || allText.includes('mature'),
      athletic: allText.includes('musclé') || allText.includes('athlétique') || allText.includes('tonique') || allText.includes('sportif'),
      slim: allText.includes('mince') || allText.includes('svelte') || allText.includes('élancée') || allText.includes('fine'),
      petite: allText.includes('petite') && !allText.includes('poitrine'),
      massive: allText.includes('massif') || allText.includes('trapu') || allText.includes('costaud'),
      hourglass: allText.includes('sablier') || allText.includes('hourglass'),
    };
    
    console.log('🔍 Indicateurs morphologie:', Object.entries(bodyIndicators).filter(([k,v]) => v).map(([k]) => k).join(', '));
    
    // BBW / Très ronde - PRIORITÉ MAXIMALE
    if (bodyIndicators.bbw) {
      details.body.type = 'BBW body type, very fat curvy woman, extremely thick plump body, very large full-figured, big beautiful woman, chubby fat body, wide hips, big belly, thick everywhere';
    }
    // Ronde / Chubby / Dodue
    else if (bodyIndicators.round || bodyIndicators.chubby) {
      details.body.type = 'CHUBBY ROUND BODY, plump soft curves, full-figured curvy woman, thick body with soft belly, wide hips, rounded figure, pleasantly plump';
    }
    // Généreuse - MOTS FRANÇAIS SPÉCIFIQUES
    else if (bodyIndicators.generous) {
      details.body.type = 'GENEROUS CURVY BODY, full-figured woman with generous curves everywhere, voluptuous figure, wide hips, large bust, thick thighs, womanly curves, sexy full body';
    }
    // Voluptueuse / Pulpeuse - MOTS FRANÇAIS SPÉCIFIQUES
    else if (bodyIndicators.voluptuous) {
      details.body.type = 'VOLUPTUOUS BODY, extremely curvy figure, sexy hourglass shape, large bust, wide hips, thick thighs, sensual full curves, bombshell figure';
    }
    // Curvy / Formes
    else if (bodyIndicators.curvy || bodyIndicators.hourglass) {
      details.body.type = 'CURVY HOURGLASS BODY, sexy curves, pronounced bust and hips, slim waist, feminine figure, attractive curves';
    }
    // Thick / Épaisse
    else if (bodyIndicators.thick) {
      details.body.type = 'THICK CURVY BODY, pronounced sexy curves, thick thighs, wide hips, full-figured, thicc body';
    }
    // Maternelle / MILF
    else if (bodyIndicators.maternal) {
      details.body.type = 'MATURE MATERNAL BODY, soft womanly curves, nurturing figure, full bust, wide hips, mature feminine body, MILF figure';
    }
    // Musclée / Athlétique
    else if (bodyIndicators.athletic) {
      details.body.type = 'ATHLETIC TONED BODY, fit physique, defined muscles, sporty figure, toned arms and legs';
    }
    // Mince / Élancée
    else if (bodyIndicators.slim) {
      details.body.type = 'SLIM SLENDER BODY, lean figure, thin physique, slender frame';
    }
    // Petite
    else if (bodyIndicators.petite) {
      details.body.type = 'PETITE SMALL BODY, delicate frame, small stature';
    }
    // Massif / Trapu (hommes)
    else if (bodyIndicators.massive) {
      details.body.type = 'MASSIVE MUSCULAR STOCKY BODY, broad powerful build, big strong frame';
    }
    
    // === POITRINE (FEMMES) - BONNET - DESCRIPTIONS RENFORCÉES ===
    if (character.gender === 'female') {
      const bust = (character.bust || '').toUpperCase().trim();
      
      // Descriptions TRÈS détaillées pour chaque bonnet
      const bustDescriptions = {
        'A': { 
          size: 'A-cup', 
          description: 'SMALL A-CUP BREASTS, petite flat chest, tiny small breasts, minimal bust, flat-chested'
        },
        'B': { 
          size: 'B-cup', 
          description: 'SMALL B-CUP BREASTS, modest small bust, petite breasts, small chest'
        },
        'C': { 
          size: 'C-cup', 
          description: 'MEDIUM C-CUP BREASTS, average sized bust, normal breasts, moderate chest'
        },
        'D': { 
          size: 'D-cup', 
          description: 'LARGE D-CUP BREASTS, big full breasts, generous bust, impressive cleavage, large chest'
        },
        'DD': { 
          size: 'DD-cup', 
          description: 'VERY LARGE DD-CUP BREASTS, big heavy breasts, impressive large bust, deep cleavage, very big chest'
        },
        'E': { 
          size: 'E-cup', 
          description: 'HUGE E-CUP BREASTS, very big heavy breasts, enormous bust, massive chest, huge cleavage'
        },
        'F': { 
          size: 'F-cup', 
          description: 'HUGE F-CUP BREASTS, massive heavy breasts, gigantic bust, extremely large chest, huge hanging breasts'
        },
        'G': { 
          size: 'G-cup', 
          description: 'GIGANTIC G-CUP BREASTS, enormous massive breasts, huge heavy bust, extremely big chest, giant breasts'
        },
        'H': { 
          size: 'H-cup', 
          description: 'MASSIVE H-CUP BREASTS, extremely huge enormous breasts, colossal bust, giant heavy chest, biggest breasts'
        }
      };
      
      if (bustDescriptions[bust]) {
        details.bust = bustDescriptions[bust];
        console.log('👙 Poitrine détectée:', bust, '->', bustDescriptions[bust].description.substring(0, 50));
      } else {
        // Chercher dans le texte si pas de bonnet direct
        if (allText.includes('énorme poitrine') || allText.includes('énormes seins') || allText.includes('gigantesque')) {
          details.bust = { size: 'huge', description: 'HUGE MASSIVE BREASTS, enormous gigantic bust, very big heavy chest' };
        } else if (allText.includes('grosse poitrine') || allText.includes('gros seins') || allText.includes('forte poitrine') || allText.includes('opulente')) {
          details.bust = { size: 'large', description: 'LARGE FULL BREASTS, big generous bust, impressive cleavage, big chest' };
        } else if (allText.includes('poitrine moyenne') || allText.includes('seins moyens')) {
          details.bust = { size: 'medium', description: 'MEDIUM BREASTS, average bust, normal sized chest' };
        } else if (allText.includes('petite poitrine') || allText.includes('petits seins') || allText.includes('menue') || allText.includes('plate')) {
          details.bust = { size: 'small', description: 'SMALL PETITE BREASTS, flat chest, tiny bust, small-chested' };
        }
      }
    }
    
    // === PÉNIS (HOMMES) - TAILLE ===
    if (character.gender === 'male') {
      const penisText = (character.penis || '').toLowerCase();
      const sizeMatch = penisText.match(/(\d+)\s*cm/);
      if (sizeMatch) {
        const size = parseInt(sizeMatch[1]);
        if (size >= 22) {
          details.penis = { size: `${size}cm`, description: 'very well endowed, large thick' };
        } else if (size >= 18) {
          details.penis = { size: `${size}cm`, description: 'well endowed' };
        } else if (size >= 15) {
          details.penis = { size: `${size}cm`, description: 'average size' };
        } else {
          details.penis = { size: `${size}cm`, description: 'modest size' };
        }
      }
      // Détails supplémentaires
      if (penisText.includes('épais') || penisText.includes('thick')) {
        details.penis.description += ', thick';
      }
      if (penisText.includes('fin') || penisText.includes('thin')) {
        details.penis.description += ', slender';
      }
      if (penisText.includes('circoncis')) {
        details.penis.description += ', circumcised';
      } else if (penisText.includes('non circoncis')) {
        details.penis.description += ', uncut';
      }
    }
    
    // === FESSES ===
    if (allText.includes('énorme fesse') || allText.includes('très grosses fesses')) {
      details.buttocks.description = 'huge massive round butt, very big thick ass';
    } else if (allText.includes('grosse fesse') || allText.includes('grosses fesses') || allText.includes('gros fessier')) {
      details.buttocks.description = 'big round plump butt, large thick buttocks';
    } else if (allText.includes('fesses rebondie') || allText.includes('fesses rondes') || allText.includes('fessier ferme')) {
      details.buttocks.description = 'round firm perky butt';
    } else if (allText.includes('fesses musclé')) {
      details.buttocks.description = 'toned muscular firm butt';
    } else if (allText.includes('fesses plates')) {
      details.buttocks.description = 'small flat butt';
    }
    
    // === HANCHES ===
    if (allText.includes('très larges hanches') || allText.includes('hanches très larges')) {
      details.hips.description = 'very wide generous hips, extremely broad';
    } else if (allText.includes('hanches larges') || allText.includes('larges hanches')) {
      details.hips.description = 'wide generous hips';
    } else if (allText.includes('hanches étroites')) {
      details.hips.description = 'narrow slim hips';
    }
    
    // === CUISSES ===
    if (allText.includes('très grosses cuisses') || allText.includes('cuisses énormes')) {
      details.thighs.description = 'very thick massive thighs';
    } else if (allText.includes('cuisses épaisses') || allText.includes('grosses cuisses') || allText.includes('cuisses puissantes')) {
      details.thighs.description = 'thick meaty thighs';
    } else if (allText.includes('cuisses fines') || allText.includes('longues jambes')) {
      details.thighs.description = 'slim slender legs';
    }
    
    // === VENTRE ===
    if (allText.includes('gros ventre') || allText.includes('ventre rebondi') || allText.includes('ventre proéminent')) {
      details.belly.description = 'big round soft belly, large plump tummy';
    } else if (allText.includes('ventre rond') || allText.includes('ventre doux')) {
      details.belly.description = 'soft round belly, cute tummy';
    } else if (allText.includes('ventre plat') || allText.includes('abdos')) {
      details.belly.description = 'flat toned stomach';
    }
    
    // === SPÉCIAL ===
    if (allText.includes('tatouage') || allText.includes('tatoué')) {
      details.special.push('with tattoos');
      if (allText.includes('manchette') || allText.includes('bras tatoué')) {
        details.special.push('full arm sleeve tattoos');
      }
    }
    if (allText.includes('piercing')) {
      details.special.push('with piercings');
    }
    if (allText.includes('lunettes') || allText.includes('glasses')) {
      details.special.push('wearing glasses');
    }
    if (allText.includes('poils') && allText.includes('torse')) {
      details.special.push('hairy chest');
    }
    
    // Taille et poids
    const heightMatch = allText.match(/(\d{3})\s*cm/);
    if (heightMatch) {
      details.body.height = `${heightMatch[1]}cm tall`;
    }
    const weightMatch = allText.match(/(\d{2,3})\s*kg/);
    if (weightMatch) {
      details.body.weight = `${weightMatch[1]}kg`;
    }
    
    return details;
  }

  /**
   * Construit un prompt ULTRA-DÉTAILLÉ basé sur TOUS les attributs du personnage
   * Inclut: visage, cheveux, corps, morphologie, poitrine/pénis, fesses, hanches, peau, etc.
   * v5.3.3 - MORPHOLOGIE EN PRIORITÉ MAXIMALE
   */
  buildUltraDetailedPrompt(character, isRealistic = false) {
    const parts = [];
    
    // PRIORITÉ 1: Si le personnage a un imagePrompt personnalisé (format Bagbot), l'utiliser en premier
    if (character.imagePrompt && character.imagePrompt.length > 50) {
      // Utiliser directement le prompt optimisé du personnage
      console.log('🎨 Utilisation imagePrompt Bagbot:', character.imagePrompt.substring(0, 100) + '...');
      return character.imagePrompt;
    }
    
    // Parser le descriptif physique avec la nouvelle fonction
    const physicalDetails = this.parsePhysicalDescription(character);
    
    // Collecter TOUTES les données pour analyse - PRIORITÉ physicalDescription
    const allData = [
      character.physicalDescription || '', // Priorité haute (nouveau format Bagbot)
      character.appearance || '',
      character.bodyType || '',
      (character.tags || []).join(' '),
      character.hairColor || '',
      character.hairLength || '',
      character.eyeColor || '',
      character.outfit || ''
    ].join(' ').toLowerCase();
    
    // === UTILISER LES DÉTAILS PARSÉS ===
    
    // === 0. MORPHOLOGIE EN PREMIER (PRIORITÉ MAXIMALE) ===
    // Placer le body type AU DÉBUT du prompt pour une influence maximale
    if (physicalDetails.body.type) {
      // Ajouter 2 fois pour emphase
      parts.push(physicalDetails.body.type);
      console.log(`🏋️ MORPHOLOGIE PRIORITAIRE: ${physicalDetails.body.type}`);
    }
    
    // === 0.5. POITRINE/PÉNIS EN PRIORITÉ (après body type) ===
    if (character.gender === 'female' && physicalDetails.bust.description) {
      parts.push(physicalDetails.bust.description);
      console.log(`👙 POITRINE PRIORITAIRE: ${physicalDetails.bust.description}`);
    }
    if (character.gender === 'male' && physicalDetails.penis.description) {
      parts.push(physicalDetails.penis.description);
    }
    
    // === 1. GENRE ===
    if (character.gender === 'female') {
      // Ajouter le body type au genre pour renforcement
      const bodyMod = physicalDetails.body.type ? `, ${this.getShortBodyType(physicalDetails.body.type)}` : '';
      parts.push(isRealistic ? `beautiful real woman${bodyMod}, female human` : `beautiful anime woman${bodyMod}, female character`);
    } else if (character.gender === 'male') {
      const bodyMod = physicalDetails.body.type ? `, ${this.getShortBodyType(physicalDetails.body.type)}` : '';
      parts.push(isRealistic ? `handsome real man${bodyMod}, male human` : `handsome anime man${bodyMod}, male character`);
    } else {
      parts.push('beautiful androgynous person');
    }
    
    // === 2. ÂGE ===
    const age = this.parseCharacterAge(character.age);
    parts.push(`${age} years old`);
    if (age >= 45) parts.push('mature elegant sophisticated');
    else if (age >= 35) parts.push('mature confident adult');
    else if (age >= 28) parts.push('adult prime of life');
    else parts.push('young adult');
    
    // === 3. CHEVEUX (couleur, longueur, style, texture) ===
    if (physicalDetails.hair.color) {
      parts.push(`beautiful ${physicalDetails.hair.color} hair`);
    }
    if (physicalDetails.hair.length) {
      parts.push(physicalDetails.hair.length);
    }
    if (physicalDetails.hair.style) {
      parts.push(physicalDetails.hair.style);
    }
    if (physicalDetails.hair.texture) {
      parts.push(physicalDetails.hair.texture);
    }
    
    // === 4. YEUX (couleur, forme, détails) ===
    if (physicalDetails.eyes.color) {
      parts.push(`beautiful ${physicalDetails.eyes.color} eyes`);
    }
    if (physicalDetails.eyes.shape) {
      parts.push(physicalDetails.eyes.shape);
    }
    if (physicalDetails.eyes.details) {
      parts.push(physicalDetails.eyes.details);
    }
    
    // === 5. VISAGE (forme et traits) ===
    if (physicalDetails.face.shape) {
      parts.push(physicalDetails.face.shape);
    }
    if (physicalDetails.face.features.length > 0) {
      parts.push(physicalDetails.face.features.join(', '));
    }
    
    // === 6. PEAU ===
    if (physicalDetails.skin.color) {
      parts.push(physicalDetails.skin.color);
    } else {
      parts.push('natural healthy skin');
    }
    
    // === 7. MORPHOLOGIE / CORPS ===
    if (physicalDetails.body.type) {
      parts.push(physicalDetails.body.type);
    }
    if (physicalDetails.body.height) {
      parts.push(physicalDetails.body.height);
    }
    
    // === 8. POITRINE (FEMMES) - avec détails du bonnet ===
    if (character.gender === 'female' && physicalDetails.bust.description) {
      parts.push(physicalDetails.bust.description);
      console.log(`👙 Poitrine: ${physicalDetails.bust.size} - ${physicalDetails.bust.description}`);
    }
    
    // === 9. PÉNIS (HOMMES) - avec détails de taille ===
    if (character.gender === 'male' && physicalDetails.penis.description) {
      parts.push(physicalDetails.penis.description);
      console.log(`🍆 Pénis: ${physicalDetails.penis.size} - ${physicalDetails.penis.description}`);
    }
    
    // === 10. FESSES ===
    if (physicalDetails.buttocks.description) {
      parts.push(physicalDetails.buttocks.description);
    }
    
    // === 11. HANCHES ===
    if (physicalDetails.hips.description) {
      parts.push(physicalDetails.hips.description);
    }
    
    // === 12. CUISSES ===
    if (physicalDetails.thighs.description) {
      parts.push(physicalDetails.thighs.description);
    }
    
    // === 13. VENTRE ===
    if (physicalDetails.belly.description) {
      parts.push(physicalDetails.belly.description);
    }
    
    // === 14. SPÉCIAL (tatouages, piercings, lunettes, etc.) ===
    if (physicalDetails.special.length > 0) {
      parts.push(physicalDetails.special.join(', '));
    }
    
    // === 15. imagePrompt DU PERSONNAGE (toujours ajouter si existe) ===
    if (character.imagePrompt) {
      // Ajouter le imagePrompt personnalisé qui contient souvent des détails précis
      parts.push(character.imagePrompt);
    }
    
    // === 16. QUALITÉ ===
    if (isRealistic) {
      parts.push('photorealistic, ultra detailed, 8K, professional photography, perfect anatomy');
    } else {
      parts.push('high quality anime art, detailed illustration, perfect anatomy');
    }
    
    // === 17. RENFORCEMENT FINAL DE LA MORPHOLOGIE ===
    // Répéter les éléments clés à la fin pour emphase maximale
    if (physicalDetails.body.type) {
      const shortBody = this.getShortBodyType(physicalDetails.body.type);
      if (shortBody) {
        parts.push(shortBody + ' body');
        parts.push(shortBody); // Une fois de plus pour l'emphase
      }
    }
    if (character.gender === 'female' && physicalDetails.bust.size) {
      const bustEmphasis = {
        'A-cup': 'small flat chest',
        'B-cup': 'small breasts',
        'C-cup': 'medium breasts',
        'D-cup': 'big breasts large bust',
        'DD-cup': 'very big breasts large chest',
        'E-cup': 'huge breasts',
        'F-cup': 'huge massive breasts',
        'G-cup': 'gigantic breasts',
        'H-cup': 'enormous massive breasts',
        'large': 'big breasts',
        'huge': 'huge massive breasts',
        'medium': 'medium breasts',
        'small': 'small petite breasts'
      };
      const emphasis = bustEmphasis[physicalDetails.bust.size] || '';
      if (emphasis) {
        parts.push(emphasis);
      }
    }
    
    console.log(`📋 Prompt ultra-détaillé généré avec parsePhysicalDescription: ${parts.length} éléments`);
    console.log(`📋 Détails parsés:`, JSON.stringify({
      hair: physicalDetails.hair,
      eyes: physicalDetails.eyes,
      body: physicalDetails.body.type ? physicalDetails.body.type.substring(0, 50) : 'none',
      bust: physicalDetails.bust.size || 'none',
      penis: physicalDetails.penis.size || 'none'
    }));
    
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

    const level = Math.max(1, relationLevel || 1);
    const isNSFW = level >= 2; // NSFW seulement à partir du niveau 2
    
    console.log(`🖼️ Génération image niveau ${level} - ${isNSFW ? '🔞 NSFW' : '✨ SFW'}`);

    // Choisir le style
    const { style, isRealistic } = this.getRandomStyle();
    
    // === EXTRAIRE LE CONTEXTE DE CONVERSATION ===
    const conversationContext = this.extractConversationContext(recentMessages);
    console.log(`📍 Contexte conversation:`, conversationContext);
    
    // === GÉNÉRER LES ÉLÉMENTS VARIÉS ===
    const sceneElements = this.generateVariedSceneElements();
    
    // v5.3.59 - COMMENCER PAR "FULL BODY SHOT" + STYLE
    let prompt = 'FULL BODY SHOT showing entire character from head to feet, complete figure visible, NOT cropped, ' + style;
    
    // === v5.3.59 - MORPHOLOGIE EN PREMIER POUR EMPHASE MAXIMALE (comme v5.3.34) ===
    const physicalDetailsScene = this.parsePhysicalDescription(character);
    if (physicalDetailsScene.body.type) {
      prompt += ', ' + physicalDetailsScene.body.type;
      console.log(`🏋️ MORPHOLOGIE SCÈNE (priorité): ${physicalDetailsScene.body.type}`);
    } else if (character.bodyType) {
      // Fallback: utiliser bodyType directement avec mapping complet
      const bodyTypeEn = {
        'mince': 'slim slender thin body',
        'élancée': 'slender elegant tall body',
        'moyenne': 'average normal body',
        'athlétique': 'athletic toned muscular body',
        'voluptueuse': 'VOLUPTUOUS CURVY body, hourglass figure, big bust, wide hips, sexy curves',
        'généreuse': 'GENEROUS CURVY body, full-figured, soft curves everywhere, plump',
        'pulpeuse': 'THICK CURVY body, plump figure, soft curves, full thighs',
        'ronde': 'CHUBBY ROUND body, soft belly, plump figure, BBW, soft curves',
        'très ronde': 'VERY CHUBBY BBW body, big soft belly, very plump, plus size, full figure',
        'plantureuse': 'VOLUPTUOUS body, big breasts, wide hips, sexy curvy, hourglass',
        'enrobée': 'PLUMP SOFT body, chubby, soft curves, round belly',
        'potelée': 'CHUBBY CUTE body, soft plump figure, round face'
      }[character.bodyType];
      if (bodyTypeEn) {
        prompt += `, ${bodyTypeEn}`;
        console.log(`🏋️ MORPHOLOGIE SCÈNE (fallback): ${character.bodyType} -> ${bodyTypeEn}`);
      }
    }
    
    // === v5.3.59 - POITRINE EN SECOND POUR EMPHASE ===
    if (character.gender === 'female') {
      if (physicalDetailsScene.bust.description) {
        prompt += ', ' + physicalDetailsScene.bust.description;
        console.log(`👙 POITRINE SCÈNE (priorité): ${physicalDetailsScene.bust.description}`);
      } else if (character.bust) {
        const bustMap = {
          'A': 'SMALL A-CUP breasts',
          'B': 'SMALL B-CUP breasts',
          'C': 'MEDIUM C-CUP breasts',
          'D': 'LARGE D-CUP breasts, big full breasts',
          'DD': 'VERY LARGE DD-CUP breasts, big heavy breasts',
          'E': 'HUGE E-CUP breasts, very big breasts',
          'F': 'HUGE F-CUP breasts, massive breasts',
          'G': 'GIGANTIC G-CUP breasts, enormous bust',
          'H': 'MASSIVE H-CUP breasts, extremely huge breasts'
        };
        const bustDesc = bustMap[character.bust.toUpperCase()] || `${character.bust} cup breasts`;
        prompt += `, ${bustDesc}`;
        console.log(`👙 POITRINE SCÈNE (fallback): ${character.bust} -> ${bustDesc}`);
      }
    }
    
    // === DESCRIPTION PHYSIQUE ULTRA-DÉTAILLÉE (reste) ===
    prompt += ', ' + this.buildUltraDetailedPhysicalPrompt(character, isRealistic);
    
    // === UTILISER imagePrompt si disponible ===
    if (character.imagePrompt) {
      // Nettoyer et ajouter l'imagePrompt du personnage
      const cleanImagePrompt = character.imagePrompt.replace(/\n/g, ' ').trim();
      prompt += ', ' + cleanImagePrompt;
    }
    
    // === APPLIQUER LE CONTEXTE DE CONVERSATION ===
    // Lieu détecté dans la conversation (priorité sur le lieu aléatoire)
    if (conversationContext.location) {
      prompt += `, ${conversationContext.location}`;
      console.log(`📍 Lieu conversation: ${conversationContext.location}`);
    }
    
    // Position détectée
    if (conversationContext.position) {
      prompt += `, ${conversationContext.position}`;
      console.log(`🎭 Position conversation: ${conversationContext.position}`);
    }
    
    // Tenue détectée (pour SFW/NSFW)
    if (conversationContext.outfit && isNSFW) {
      prompt += `, ${conversationContext.outfit}`;
      console.log(`👗 Tenue conversation: ${conversationContext.outfit}`);
    }
    
    // Action en cours
    if (conversationContext.action) {
      prompt += `, ${conversationContext.action}`;
    }
    
    // === CARACTÉRISTIQUES CORPORELLES SPÉCIFIQUES ===
    const bodyFeatures = this.extractBodyFeatures(character);
    if (bodyFeatures) {
      prompt += `, ${bodyFeatures}`;
      console.log(`💪 CORPS: ${bodyFeatures.substring(0, 100)}...`);
    }
    
    // === SELON LE MODE SFW/NSFW ===
    if (isNSFW) {
      // === MODE NSFW (niveau 2+) - VARIÉTÉ MAXIMALE ===
      console.log(`🔞 Mode NSFW actif - Niveau ${level}`);
      
      // Anatomie détaillée pour NSFW
      prompt += this.buildAnatomyDescription(character, isRealistic);
      
      // === v5.3.54 - ANGLE/TYPE DE PHOTO TOUJOURS CORPS ENTIER ===
      const nsfwAngles = [
        // Corps entier obligatoire
        'full body shot showing entire figure from head to feet, complete person visible',
        'full body frontal view, entire body from head to toes visible',
        'full body view lying on bed, complete figure from top to bottom',
        'full length shot, whole body exposed from head to feet',
        // Vues de face corps entier
        'full body frontal view, entire figure visible, sexy confident pose',
        'full body front facing camera, complete person head to feet',
        'full body facing viewer, entire figure shown, inviting pose',
        // Vues de profil corps entier
        'full body side profile, entire figure from head to feet',
        'full body profile view, complete silhouette visible',
        'full body three-quarter angle, entire person shown',
        // Vues de dos corps entier
        'full body back view, entire figure from head to feet, looking over shoulder',
        'full body rear view, complete person visible, arched back',
        'full body from behind, entire figure head to toes visible',
        // Poses corps entier
        'full body lying on bed, entire figure visible, inviting pose',
        'full body on knees, complete figure from head to floor',
        'full body bent over, entire person visible, provocative',
        'full body straddling position, complete figure shown',
      ];
      const randomAngle = nsfwAngles[Math.floor(Math.random() * nsfwAngles.length)];
      prompt += `, ${randomAngle}`;
      console.log(`📷 ANGLE: ${randomAngle.substring(0, 50)}...`);
      
      // === v5.3.52 - POSITIONS NSFW TRÈS VARIÉES ===
      const nsfwPositions = [
        // Debout
        'standing nude, confident sexy pose, hand on hip, full body view',
        'standing by window, nude silhouette, natural light, elegant pose',
        'standing leaning against wall, one leg bent, provocative stance',
        
        // Allongée sur lit
        'lying on bed on back, legs slightly spread, inviting pose, breasts visible',
        'lying on stomach on silk sheets, butt raised, looking back seductively',
        'lying on side, propped on elbow, curves emphasized, sensual',
        'sprawled on bed, relaxed nude pose, carefree and sexy',
        
        // À genoux
        'kneeling on bed, sitting back on heels, breasts prominent, sensual gaze',
        'kneeling upright, hands on thighs, submissive pose, looking up',
        'kneeling from behind, looking over shoulder, butt emphasized',
        'on knees looking up seductively, submissive sexy pose',
        
        // À quatre pattes
        'on all fours on bed, rear view, arched back, butt prominent',
        'on all fours looking back over shoulder, provocative pose',
        'crawling on bed on all fours, predatory sexy pose',
        
        // Penchée en avant
        'bending forward, showing cleavage, provocative stance',
        'bent over vanity, looking in mirror, rear view emphasized',
        'leaning forward on hands, breasts hanging, seductive',
        'bending over, rear fully visible, looking back',
        
        // Montrant les fesses
        'rear view standing, looking over shoulder, butt fully visible',
        'lying on stomach, butt raised high, provocative',
        'on all fours, rear emphasized, sexy arch in back',
        'bending over showing butt, thong visible, seductive',
        
        // Montrant les seins
        'frontal nude pose, breasts fully visible, confident',
        'cupping breasts with hands, provocative pose',
        'arms raised above head, breasts prominent, sensual stretch',
        'lying on back, breasts visible, inviting pose',
        
        // Doigts dans la bouche
        'finger on lips, seductive gaze, teasing pose',
        'finger in mouth, innocent but sexy expression',
        'biting finger seductively, playful naughty look',
        'sucking finger suggestively, erotic pose',
        
        // Positions assises
        'sitting on edge of bed, legs parted, inviting',
        'sitting cross-legged on floor, nude, artistic',
        'sitting in chair, legs spread, provocative',
        'straddling chair backwards, butt visible',
        
        // Positions spéciales
        'stretching like just woke up, natural nude beauty',
        'getting out of shower, water droplets on skin',
        'in bathtub, wet skin glistening, sensual',
        'undressing, dress halfway off, teasing',
        'pulling down panties, revealing pose',
        'legs wide open lying on bed, intimate view',
      ];
      const randomPosition = nsfwPositions[Math.floor(Math.random() * nsfwPositions.length)];
      prompt += `, ${randomPosition}`;
      console.log(`🎭 POSITION: ${randomPosition.substring(0, 50)}...`);
      
      // === v5.3.52 - TENUES NSFW TRÈS VARIÉES ===
      const nsfwOutfits = [
        // Nuisettes
        'wearing sheer babydoll nightgown, see-through, lace trim',
        'wearing silk slip nightgown, barely covers body, elegant sexy',
        'wearing transparent negligee, nothing hidden underneath',
        
        // Lingerie
        'wearing sexy lace lingerie set, matching bra and panties',
        'wearing red lace thong and push-up bra, seductive',
        'wearing black mesh bodysuit, sheer, revealing',
        'wearing garter belt with stockings, classic sexy',
        
        // Déshabillé transparent
        'wearing sheer robe, open front, nothing underneath',
        'wearing transparent kimono robe, body visible through',
        'wearing see-through dress, completely visible underneath',
        
        // Jupes courtes
        'wearing micro miniskirt, barely covering, no panties',
        'wearing pleated schoolgirl skirt, lifted to show',
        'wearing tight pencil skirt, riding up, revealing',
        
        // Robes moulantes
        'wearing skin-tight dress, every curve visible',
        'wearing backless dress, no bra, elegant sexy',
        'wearing side-slit dress, leg fully exposed',
        
        // Topless
        'topless, bare breasts exposed, wearing only panties',
        'topless in jeans, casual but very sexy',
        'topless with open shirt, teasing reveal',
        
        // Collants et leggings
        'wearing only sheer pantyhose, nothing else, body visible',
        'wearing yoga leggings only, topless, athletic sexy',
        'wearing fishnet stockings, garter belt, seductive',
        
        // Talons
        'wearing only high heels, completely nude otherwise',
        'in stilettos and lingerie, legs emphasized',
        
        // Nue
        'completely nude, nothing on, full exposure',
        'nude except for jewelry, elegant naked',
        'nude with strategically placed hands, teasing',
      ];
      // Sélection aléatoire de tenue basée sur le niveau
      if (level >= 5) {
        const selectedOutfit = nsfwOutfits[Math.floor(Math.random() * nsfwOutfits.length)];
        prompt += `, ${selectedOutfit}`;
        console.log(`👗 TENUE NSFW: ${selectedOutfit.substring(0, 50)}...`);
      }
      
      // === v5.3.52 - VUES/ANGLES VARIÉS ===
      // v5.3.54 - TOUTES LES VUES EN CORPS ENTIER (pas de close-up)
      const nsfwViews = [
        'full body shot, showing entire figure from head to feet, complete person',
        'full body view from above, entire figure visible from head to toes',
        'full body back view, showing entire back from head to feet',
        'full body side profile view, complete silhouette head to feet',
        'full body low angle, entire figure from feet to head',
        'full body mirror reflection showing complete figure',
        'full body three-quarter view, entire person visible',
        'full body frontal, complete figure with clothing action',
        'full body dramatic pose, entire figure head to feet',
        'full body artistic nude, complete figure visible',
      ];
      const selectedView = nsfwViews[Math.floor(Math.random() * nsfwViews.length)];
      prompt += `, ${selectedView}, NOT cropped, NOT zoomed in`;
      console.log(`📷 VUE: ${selectedView.substring(0, 50)}...`);
      
      // Lieu intime
      prompt += `, ${sceneElements.location}`;
      prompt += `, ${sceneElements.lighting}`;
      
      // === CARACTÉRISTIQUES CORPORELLES SPÉCIFIQUES ===
      const bodyFeatures = this.extractBodyFeatures(character);
      if (bodyFeatures) {
        prompt += `, ${bodyFeatures}`;
        console.log(`💪 CORPS: ${bodyFeatures.substring(0, 80)}...`);
      }
      
      // === TENUE NSFW BASÉE SUR LE NIVEAU ===
      const levelOutfit = this.getOutfitByLevel(level);
      prompt += `, ${levelOutfit}`;
      console.log(`👗 TENUE niveau ${level}: ${levelOutfit.substring(0, 60)}...`);
      
      // Ambiance sensuelle
      prompt += `, ${sceneElements.mood}`;
      
      // Prompt NSFW explicite RENFORCÉ SELON LE NIVEAU
      prompt += this.buildNSFWPrompt(character, isRealistic);
      
      // Forcer le contenu NSFW selon le niveau - CHAQUE NIVEAU A SON STYLE
      if (level === 2) {
        // Niveau 2: Provocante
        prompt += ', NSFW, sexy, seductive, provocative outfit';
        prompt += ', revealing clothes, cleavage visible, short skirt, tight dress';
        prompt += ', sexy pose, flirtatious, adult content';
        console.log('📸 Mode NIVEAU 2: Provocante');
      } else if (level === 3) {
        // Niveau 3: Lingerie
        prompt += ', NSFW, sexy lingerie, bra and panties, lace underwear';
        prompt += ', in underwear, revealing lingerie, seductive pose';
        prompt += ', adult content, erotic, sensual';
        console.log('📸 Mode NIVEAU 3: Lingerie');
      } else if (level === 4) {
        // Niveau 4: Topless
        prompt += ', NSFW, topless, bare breasts, nipples visible';
        prompt += ', naked from waist up, exposed chest, sensual nude';
        prompt += ', adult content, erotic, intimate';
        console.log('📸 Mode NIVEAU 4: Topless');
      } else if (level === 5) {
        // Niveau 5: Nu artistique
        prompt += ', NSFW, fully nude, completely naked, artistic nudity';
        prompt += ', naked body fully exposed, nipples visible, sensual pose';
        prompt += ', erotic, intimate, adult only';
        console.log('📸 Mode NIVEAU 5: Nu artistique');
      } else if (level === 6) {
        // Niveau 6: Nu sensuel
        prompt += ', NSFW, nude sensual pose, naked body glistening';
        prompt += ', legs slightly parted, hands exploring body, erotic';
        prompt += ', explicit adult content, passionate, intimate exposure';
        console.log('📸 Mode NIVEAU 6: Nu sensuel');
      } else if (level === 7) {
        // Niveau 7: Nu érotique
        prompt += ', NSFW, erotic nude pose, legs spread invitingly';
        prompt += ', naked on bed, hand between thighs, provocative';
        prompt += ', explicit, sexual pose, adult only, uncensored';
        console.log('📸 Mode NIVEAU 7: Nu érotique');
      } else if (level === 8) {
        // Niveau 8: Très explicite
        prompt += ', NSFW, very explicit nude, legs wide open';
        prompt += ', touching intimately, naked spread on bed, nothing hidden';
        prompt += ', extreme explicit, masturbation pose, adult content';
        console.log('📸 Mode NIVEAU 8: Très explicite');
      } else if (level === 9) {
        // Niveau 9: Ultra explicite
        prompt += ', NSFW, ultra explicit nude, maximum exposure';
        prompt += ', fingers inside, orgasmic expression, most intimate pose';
        prompt += ', extreme sexual content, explicit masturbation, uncensored';
        console.log('📸 Mode NIVEAU 9: Ultra explicite');
      } else if (level >= 10) {
        // Niveau 10+: Maximum explicite
        prompt += ', NSFW, maximum explicit nude, ultimate erotic exposure';
        prompt += ', most provocative pose possible, extreme intimacy';
        prompt += ', explicit self-pleasure, toy penetration visible, orgasm';
        prompt += ', absolute maximum adult content, nothing censored';
        console.log('📸 Mode NIVEAU 10+: Maximum explicite');
      }
      
    } else {
      // === MODE SFW (niveau 1) ===
      console.log(`✨ Mode SFW actif - Niveau ${level}`);
      
      // Lieu neutre/élégant
      const sfwLocations = [
        'at elegant cafe terrace, daytime',
        'at park with trees, natural setting',
        'at modern apartment, stylish interior',
        'at beach boardwalk, sunny day',
        'at rooftop bar, city skyline behind',
        'at art gallery, sophisticated setting',
        'at cozy bookstore, warm lighting',
      ];
      prompt += `, ${sfwLocations[Math.floor(Math.random() * sfwLocations.length)]}`;
      
      // Tenue SFW élégante
      const sfwOutfits = [
        'wearing elegant casual outfit, fashionable',
        'wearing stylish summer dress, classy',
        'wearing smart casual clothes, well-dressed',
        'wearing trendy outfit, modern fashion',
        'wearing chic blouse with jeans, casual elegant',
        'wearing beautiful sundress, feminine',
        'wearing fitted blazer with pants, sophisticated',
      ];
      prompt += `, ${sfwOutfits[Math.floor(Math.random() * sfwOutfits.length)]}`;
      
      // Poses SFW naturelles
      const sfwPoses = [
        'natural relaxed pose, friendly smile',
        'confident standing pose, warm expression',
        'sitting comfortably, inviting look',
        'leaning casually, playful smile',
        'walking pose, looking at camera',
        'candid pose, genuine smile',
        'elegant pose, sophisticated demeanor',
      ];
      prompt += `, ${sfwPoses[Math.floor(Math.random() * sfwPoses.length)]}`;
      
      // Qualités SFW
      prompt += ', beautiful, attractive, charming';
      prompt += ', professional photography, natural lighting';
      prompt += ', SFW, safe for work, tasteful, classy';
    }
    
    // ANATOMIE STRICTE (pour éviter les défauts)
    prompt += ', ' + this.anatomyStrictPrompt;
    
    // QUALITÉ
    if (isRealistic) {
      prompt += ', ' + this.buildRealisticQualityPrompts();
      prompt += ', ultra-detailed photo, 8K, professional quality';
      prompt += ', single person, solo portrait';
    } else {
      prompt += ', masterpiece, best quality, highly detailed anime';
      prompt += ', single character, solo';
    }

    // === RENFORCEMENT FINAL DE LA MORPHOLOGIE POUR SCÈNE ===
    const physicalDetails = this.parsePhysicalDescription(character);
    if (physicalDetails.body.type) {
      const shortBody = this.getShortBodyType(physicalDetails.body.type);
      if (shortBody) {
        prompt += `, ${shortBody} body, ${shortBody}`;
      }
      
      // Exclusions morphologiques pour les personnages ronds (comme v5.3.34)
      const bodyType = (physicalDetails.body.type || character.bodyType || '').toLowerCase();
      if (bodyType.includes('bbw') || bodyType.includes('chubby') || bodyType.includes('plump') ||
          bodyType.includes('generous') || bodyType.includes('voluptuous') || bodyType.includes('curvy') ||
          bodyType.includes('thick') || bodyType.includes('round') || bodyType.includes('ronde') ||
          bodyType.includes('généreus') || bodyType.includes('pulpeu') || bodyType.includes('enrobé') ||
          bodyType.includes('potelé') || bodyType.includes('plantureu')) {
        // v5.3.62 - MOTS TRÈS FORTS
        prompt += ', VERY FAT, OBESE, OVERWEIGHT, BIG BELLY, NOT THIN, NOT SKINNY, NOT SLIM, NOT FIT, NOT ATHLETIC';
        console.log('🔴 RENFORCEMENT SCÈNE: FAT/OBESE ajoutés');
      }
    }
    
    // Renforcement poitrine
    if (character.gender === 'female' && physicalDetails.bust.size) {
      const bustSize = physicalDetails.bust.size.toLowerCase();
      if (bustSize.includes('d') || bustSize.includes('e') || bustSize.includes('f') || 
          bustSize.includes('g') || bustSize.includes('h') || bustSize === 'large' || bustSize === 'huge') {
        prompt += ', big breasts, large bust';
      } else if (bustSize.includes('a') || bustSize === 'small') {
        prompt += ', small breasts, flat chest';
      }
    }

    // Ajouter un marqueur de niveau pour forcer le mode NSFW
    if (isNSFW) {
      prompt = `[NSFW_LEVEL_${level}] ` + prompt;
    }
    
    console.log(`🖼️ Génération ${isNSFW ? 'NSFW' : 'SFW'} niveau ${level} (${isRealistic ? 'RÉALISTE' : 'ANIME'})`);
    console.log(`📝 Prompt FINAL (150 chars): ${prompt.substring(0, 150)}...`);
    // v5.3.58 - Passer le character pour les détails physiques directs
    return await this.generateImage(prompt, character);
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
   * v5.3.58 - Génère une image avec retry et fallback intelligent
   * Accepte maintenant un objet character optionnel pour les détails physiques directs
   */
  async generateImage(prompt, retryCountOrCharacter = 0, character = null) {
    // Gérer la rétrocompatibilité
    let retryCount = 0;
    if (typeof retryCountOrCharacter === 'number') {
      retryCount = retryCountOrCharacter;
    } else if (typeof retryCountOrCharacter === 'object') {
      character = retryCountOrCharacter;
    }
    
    await CustomImageAPIService.loadConfig();
    
    const strategy = CustomImageAPIService.getStrategy();
    console.log(`🎨 Stratégie: ${strategy} (tentative ${retryCount + 1}/${this.maxRetries + 2})`);
    
    let imageUrl;
    
    // Première tentative: stratégie configurée
    if (strategy === 'local') {
      imageUrl = await this.generateWithLocal(prompt);
    } else {
      // v5.3.58 - Passer le character pour les détails physiques directs
      imageUrl = await this.generateWithFreebox(prompt, character);
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
      return await this.generateImage(prompt, retryCount + 1, character);
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
   * Génère une image avec l'API Freebox/Pollinations
   * VERSION ULTRA-AMÉLIORÉE: Images parfaites sans défauts anatomiques
   */
  /**
   * Extrait les mots-clés de morphologie du prompt
   * v5.3.5 - Détection améliorée des termes français
   */
  extractMorphologyKeywords(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    const morphology = [];
    let detectedType = 'standard';
    
    // === v5.3.45 MORPHOLOGIE AMÉLIORÉE ===
    // Ne plus utiliser "voluptuous", "generous" - termes trop vagues
    // Ajouter ventre léger pour "ronde", ventre plus important pour "très ronde"
    
    // === TRÈS RONDE / BBW === (Corps rond avec ventre IMPORTANT)
    if (lowerPrompt.includes('très ronde') || 
        lowerPrompt.includes('very round') ||
        lowerPrompt.includes('très grosse') ||
        lowerPrompt.includes('very fat') ||
        lowerPrompt.includes('obèse') ||
        lowerPrompt.includes('obese') ||
        lowerPrompt.includes('ssbbw') ||
        lowerPrompt.includes('bbw')) {
      morphology.push(
        'chubby round body, soft full figure, thick body, ' +
        'PROMINENT ROUND BELLY, big soft tummy, visible belly bulge, large midsection, ' +
        'big heavy breasts, large bust, big chest, ' +
        'big round butt, thick buttocks, wide rear, ' +
        'wide hips, broad hips, ' +
        'thick thighs, full legs, ' +
        'thick arms, soft arms, ' +
        'round face, soft cheeks'
      );
      detectedType = 'TRÈS RONDE (ventre important)';
    }
    // === RONDE / CHUBBY / POTELÉE === (Corps doux avec LÉGER ventre)
    else if (lowerPrompt.includes('ronde') || 
             lowerPrompt.includes('rondelet') ||
             lowerPrompt.includes('chubby') ||
             lowerPrompt.includes('potelé') ||
             lowerPrompt.includes('dodu') ||
             lowerPrompt.includes('plump') ||
             lowerPrompt.includes('enrobé')) {
      morphology.push(
        'soft curvy body, cute soft figure, ' +
        'SMALL SOFT BELLY, slight tummy, gentle belly curve, little belly pooch, ' +
        'full breasts, nice bust, feminine chest, ' +
        'round butt, soft buttocks, shapely rear, ' +
        'feminine hips, soft hips, ' +
        'soft thighs, full legs, ' +
        'soft smooth skin'
      );
      detectedType = 'RONDE (léger ventre)';
    }
    // === VOLUPTUEUSE / GÉNÉREUSE === Traités comme corps normal avec formes
    // v5.3.45 - Ne génère plus de corps gros pour ces termes
    else if (lowerPrompt.includes('voluptueuse') ||
             lowerPrompt.includes('voluptuous') ||
             lowerPrompt.includes('généreuse') ||
             lowerPrompt.includes('generous')) {
      morphology.push(
        'attractive feminine body, nice figure, ' +
        'full breasts, nice bust, feminine cleavage, ' +
        'round butt, shapely rear, ' +
        'feminine hips, ' +
        'flat stomach, slim waist, ' +
        'beautiful face'
      );
      detectedType = 'NORMAL (voluptueuse/généreuse ignorés)';
    }
    // === PULPEUSE === (Formes prononcées, ventre plat)
    else if (lowerPrompt.includes('pulpeuse') ||
             lowerPrompt.includes('lush') ||
             lowerPrompt.includes('bombshell') ||
             lowerPrompt.includes('hourglass')) {
      morphology.push(
        'curvy body with soft curves, ' +
        'full breasts, nice bust, feminine cleavage, ' +
        'round butt, shapely rear, ' +
        'feminine hips, hourglass figure, ' +
        'flat toned stomach, slim waist, ' +
        'slim arms, beautiful face'
      );
      detectedType = 'PULPEUSE (formes, ventre plat)';
    }
    // === CURVY / THICK ===
    else if (lowerPrompt.includes('curvy') || 
             lowerPrompt.includes('thick') ||
             lowerPrompt.includes('thicc') ||
             lowerPrompt.includes('courbes') ||
             lowerPrompt.includes('formes')) {
      morphology.push(
        'curvy body with nice curves, ' +
        'full breasts, nice bust, feminine cleavage, ' +
        'round butt, shapely rear, ' +
        'feminine hips, ' +
        'flat stomach, ' +
        'attractive figure'
      );
      detectedType = 'CURVY / THICK';
    }
    // === MATERNELLE / MILF / DOUCE ===
    else if (lowerPrompt.includes('maternal') ||
             lowerPrompt.includes('maternelle') ||
             lowerPrompt.includes('maman') ||
             lowerPrompt.includes('mommy') ||
             lowerPrompt.includes('milf') ||
             lowerPrompt.includes('douce') ||
             lowerPrompt.includes('moelleuse')) {
      morphology.push(
        'soft maternal body, womanly figure, ' +
        'full natural breasts, motherly bust, ' +
        'round butt, maternal hips, ' +
        'small soft belly, slight tummy curve, ' +
        'soft smooth skin, warm body'
      );
      detectedType = 'MATERNELLE / MILF / DOUCE';
    }
    
    console.log(`🎯 Type morphologie détecté: ${detectedType}`);
    
    // === DÉTECTION SUPPLÉMENTAIRE: POITRINE ===
    // Ces ajouts s'ajoutent au type de corps principal
    const bustDescriptions = {
      // Très grosse poitrine
      'h-cup': 'gigantic H-cup breasts, enormous massive bust',
      'g-cup': 'huge G-cup breasts, very big bust',
      'énorme poitrine': 'enormous huge breasts, massive bust',
      'huge breast': 'huge massive breasts, very big bust',
      // Grosse poitrine
      'f-cup': 'big F-cup breasts, large bust',
      'e-cup': 'big E-cup breasts, large full bust',
      'dd-cup': 'large DD-cup breasts, impressive bust',
      'd-cup': 'full D-cup breasts, nice bust',
      'grosse poitrine': 'big breasts, large full bust',
      'forte poitrine': 'big strong breasts, impressive bust',
      'big breast': 'big breasts, large bust',
      // Moyenne
      'c-cup': 'medium C-cup breasts, average bust',
      'moyenne poitrine': 'average medium breasts',
      // Petite
      'b-cup': 'small B-cup breasts, modest bust',
      'a-cup': 'small A-cup breasts, flat chest',
      'petite poitrine': 'small breasts, petite bust',
      'small breast': 'small petite breasts, flat chest',
    };
    
    for (const [keyword, description] of Object.entries(bustDescriptions)) {
      if (lowerPrompt.includes(keyword)) {
        morphology.push(description);
        console.log(`👙 Poitrine: ${keyword}`);
        break; // Une seule description de poitrine
      }
    }
    
    // === DÉTECTION SUPPLÉMENTAIRE: FESSES ===
    const buttDescriptions = {
      'énorme fesse': 'huge massive butt, very big round ass',
      'grosse fesse': 'big round butt, large plump ass',
      'grosses fesses': 'big round butt, large plump ass',
      'fesses rebondies': 'round bubble butt, perky ass',
      'bubble butt': 'round bubble butt, perky bouncy ass',
      'big butt': 'big round butt, large ass',
      'thick ass': 'thick juicy ass, big butt',
      'petites fesses': 'small flat butt, petite rear',
      'fesses plates': 'flat small butt',
    };
    
    for (const [keyword, description] of Object.entries(buttDescriptions)) {
      if (lowerPrompt.includes(keyword)) {
        morphology.push(description);
        console.log(`🍑 Fesses: ${keyword}`);
        break;
      }
    }
    
    // === DÉTECTION SUPPLÉMENTAIRE: VENTRE ===
    const bellyDescriptions = {
      'gros ventre': 'big round belly, large soft stomach',
      'ventre rond': 'round soft belly, pudgy tummy',
      'ventre arrondi': 'rounded soft belly',
      'ventre proéminent': 'prominent big belly, visible stomach',
      'ventre plat': 'flat toned stomach, no belly',
      'abdos': 'toned abs, flat stomach',
    };
    
    for (const [keyword, description] of Object.entries(bellyDescriptions)) {
      if (lowerPrompt.includes(keyword)) {
        morphology.push(description);
        console.log(`🔘 Ventre: ${keyword}`);
        break;
      }
    }
    
    // === DÉTECTION SUPPLÉMENTAIRE: HANCHES/CUISSES ===
    if (lowerPrompt.includes('hanches larges') || lowerPrompt.includes('wide hips')) {
      morphology.push('wide hips, broad pelvis');
      console.log(`📍 Hanches larges`);
    }
    if (lowerPrompt.includes('cuisses épaisses') || lowerPrompt.includes('thick thighs')) {
      morphology.push('thick meaty thighs, big legs');
      console.log(`📍 Cuisses épaisses`);
    }
    
    // Si aucune morphologie détectée, utiliser les indices secondaires
    if (morphology.length === 0) {
      const curveIndicators = ['courbe', 'forme', 'hanch', 'fess', 'cuiss', 'ventre', 'poitrine', 'sein'];
      for (const indicator of curveIndicators) {
        if (lowerPrompt.includes(indicator)) {
          morphology.push('curvy feminine body, attractive figure');
          console.log(`📍 Indicateur de courbes: ${indicator}`);
          break;
        }
      }
    }
    
    console.log(`✅ Morphologie finale: ${morphology.length} éléments`);
    return morphology;
  }

  /**
   * v5.3.58 - RÉÉCRITURE COMPLÈTE avec données CHARACTER DIRECTES
   * Accepte maintenant un objet character optionnel pour les détails physiques directs
   */
  async generateWithFreebox(prompt, character = null) {
    console.log('🖼️ v5.3.58 - Génération image avec DONNÉES CHARACTER DIRECTES...');
    
    await this.waitForRateLimit();
    
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    const pollinationsUrl = 'https://image.pollinations.ai/prompt/';
    const lowerPrompt = prompt.toLowerCase();
    
    // Détecter le niveau NSFW
    const nsfwMatch = prompt.match(/\[NSFW_LEVEL_(\d+)\]/);
    const nsfwLevel = nsfwMatch ? parseInt(nsfwMatch[1]) : 0;
    const isNSFW = nsfwLevel >= 2;
    
    // Détecter si anime ou réaliste
    const isAnime = lowerPrompt.includes('anime') || lowerPrompt.includes('manga');
    const isRealistic = lowerPrompt.includes('realistic') || lowerPrompt.includes('photo');
    
    // === v5.3.62 - UTILISER imagePrompt EN PRIORITÉ (contient les meilleures descriptions) ===
    let finalPrompt = '';
    
    // Si character.imagePrompt existe, l'utiliser EN PREMIER (le plus précis)
    if (character && character.imagePrompt) {
      console.log('🎯 UTILISATION imagePrompt DIRECT (priorité max)');
      finalPrompt = 'FULL BODY SHOT from head to feet, complete figure visible, ' + character.imagePrompt;
      
      // Vérifier si c'est un personnage rond/curvy et renforcer
      const imgPromptLower = character.imagePrompt.toLowerCase();
      const physDescLower = (character.physicalDescription || '').toLowerCase();
      const combinedText = imgPromptLower + ' ' + physDescLower;
      
      if (combinedText.includes('round') || combinedText.includes('plump') || 
          combinedText.includes('chubby') || combinedText.includes('bbw') ||
          combinedText.includes('curvy') || combinedText.includes('thick') ||
          combinedText.includes('voluptuous') || combinedText.includes('generous') ||
          combinedText.includes('ronde') || combinedText.includes('généreus') ||
          combinedText.includes('pulpeu') || combinedText.includes('voluptu')) {
        // RENFORCEMENT ULTRA pour les corps ronds
        finalPrompt += ', VERY FAT BODY, OBESE, CHUBBY, PLUMP, BIG BELLY, NOT THIN, NOT SKINNY, NOT SLIM, NOT FIT, NOT ATHLETIC, ';
        console.log('🔴 RENFORCEMENT RONDEURS: FAT/OBESE/CHUBBY ajoutés');
      }
      
      // Ajouter qualité et NSFW si nécessaire
      if (isNSFW) {
        finalPrompt += `, sensual, erotic, [NSFW_LEVEL_${nsfwLevel}]`;
      }
      finalPrompt += ', 8k ultra detailed, masterpiece';
      
      // Encoder et retourner
      const shortPrompt = finalPrompt.substring(0, 1900);
      const encodedPrompt = encodeURIComponent(shortPrompt);
      const imageUrl = `${pollinationsUrl}${encodedPrompt}?width=576&height=1024&seed=${seed}&nologo=true&model=flux&enhance=true`;
      console.log(`📝 Prompt FINAL avec imagePrompt (${shortPrompt.length} chars): ${shortPrompt.substring(0, 300)}...`);
      return imageUrl;
    }
    
    // === FALLBACK: Extraire les détails physiques ===
    let physicalDetails;
    if (character) {
      console.log('📋 Utilisation données CHARACTER (sans imagePrompt)');
      physicalDetails = this.extractPhysicalDetailsFromCharacter(character);
    } else {
      console.log('📋 Extraction depuis le prompt texte');
      physicalDetails = this.extractAllPhysicalDetails(prompt);
    }
    console.log('📋 Détails physiques:', JSON.stringify(physicalDetails).substring(0, 300));
    
    // 1. FULL BODY SHOT EN PREMIER
    finalPrompt += 'FULL BODY SHOT from head to feet, complete figure visible, ';
    
    // 2. v5.3.61 - GENRE + ÂGE (avec support NON-BINAIRE)
    const gender = physicalDetails.gender || (character ? character.gender : null);
    if (gender === 'male') {
      finalPrompt += isAnime ? 'handsome anime man, male, ' : 'handsome real man, male, ';
    } else if (gender === 'non-binary' || gender === 'nonbinary' || gender === 'nb') {
      // v5.3.61 - Support non-binaire: apparence ANDROGYNE
      finalPrompt += isAnime 
        ? 'beautiful ANDROGYNOUS anime person, neither fully male nor female, androgynous features, ' 
        : 'beautiful ANDROGYNOUS person, neither fully male nor female, androgynous delicate features, ambiguous gender, ';
      console.log('🏳️‍🌈 Genre NON-BINAIRE détecté -> androgyne');
    } else {
      finalPrompt += isAnime ? 'beautiful anime woman, female, ' : 'beautiful real woman, female, ';
    }
    if (physicalDetails.age) {
      finalPrompt += `${physicalDetails.age} years old, `;
    }
    
    // 3. === CHEVEUX (COULEUR + LONGUEUR) - PRIORITÉ HAUTE ===
    if (physicalDetails.hairColor) {
      finalPrompt += `${physicalDetails.hairColor} hair, `;
      console.log(`💇 Cheveux couleur: ${physicalDetails.hairColor}`);
    }
    if (physicalDetails.hairLength) {
      finalPrompt += `${physicalDetails.hairLength} hair, `;
      console.log(`💇 Cheveux longueur: ${physicalDetails.hairLength}`);
    }
    
    // 4. === YEUX - PRIORITÉ HAUTE ===
    if (physicalDetails.eyeColor) {
      finalPrompt += `${physicalDetails.eyeColor} eyes, `;
      console.log(`👁️ Yeux: ${physicalDetails.eyeColor}`);
    }
    
    // 5. === PEAU - PRIORITÉ HAUTE ===
    if (physicalDetails.skinTone) {
      finalPrompt += `${physicalDetails.skinTone} skin, `;
      console.log(`🎨 Peau: ${physicalDetails.skinTone}`);
    }
    
    // 6. === TAILLE ===
    if (physicalDetails.height) {
      finalPrompt += `${physicalDetails.height}, `;
      console.log(`📏 Taille: ${physicalDetails.height}`);
    }
    
    // 7. === v5.3.62 - MORPHOLOGIE / CORPS - EMPHASE ULTRA FORTE ===
    if (physicalDetails.bodyType) {
      // Ajouter 3 fois pour emphase maximale
      finalPrompt += `${physicalDetails.bodyType}, ${physicalDetails.bodyType}, ${physicalDetails.bodyType}, `;
      console.log(`🏋️ Morphologie (x3): ${physicalDetails.bodyType}`);
      
      // Ajouter des exclusions TRÈS FORTES pour les corps ronds
      const bt = physicalDetails.bodyType.toLowerCase();
      if (bt.includes('fat') || bt.includes('obese') || bt.includes('chubby') || bt.includes('plump') || 
          bt.includes('bbw') || bt.includes('curvy') || bt.includes('voluptuous') || bt.includes('round') ||
          bt.includes('generous') || bt.includes('thick') || bt.includes('overweight')) {
        finalPrompt += 'VERY FAT, OBESE, OVERWEIGHT, BIG BELLY, NOT THIN, NOT SKINNY, NOT SLIM, NOT FIT, NOT ATHLETIC, NOT MUSCULAR, ';
        console.log('🔴 RENFORCEMENT ULTRA: FAT/OBESE/OVERWEIGHT + exclusions');
      }
    } else {
      // Si pas de bodyType mais character.physicalDescription contient des indices
      if (character && character.physicalDescription) {
        const pd = character.physicalDescription.toLowerCase();
        if (pd.includes('rond') || pd.includes('généreus') || pd.includes('pulpeu') || 
            pd.includes('voluptu') || pd.includes('plantureu') || pd.includes('enrobé') ||
            pd.includes('potelé') || pd.includes('gros ventre') || pd.includes('95kg') || pd.includes('100kg')) {
          finalPrompt += 'FAT CHUBBY OBESE body, BIG SOFT BELLY, OVERWEIGHT plump, NOT THIN, NOT SKINNY, ';
          console.log('🔴 RENFORCEMENT depuis physicalDescription: FAT/OBESE ajoutés');
        }
      }
    }
    
    // 8. === POITRINE (femmes ET non-binaires) - TRÈS IMPORTANT ===
    if (physicalDetails.bust && (gender === 'female' || !physicalDetails.bust.toLowerCase().includes('flat'))) {
      finalPrompt += `${physicalDetails.bust}, ${physicalDetails.bust}, `; // Répéter pour emphase
      console.log(`👙 Poitrine (x2): ${physicalDetails.bust}`);
    }
    
    // 9. === PÉNIS (hommes) ===
    if (physicalDetails.penis && gender === 'male' && isNSFW) {
      finalPrompt += `${physicalDetails.penis}, `;
      console.log(`🍆 Pénis: ${physicalDetails.penis}`);
    }
    
    // 10. === FESSES / HANCHES / CUISSES ===
    if (physicalDetails.butt) {
      finalPrompt += `${physicalDetails.butt}, `;
    }
    if (physicalDetails.hips) {
      finalPrompt += `${physicalDetails.hips}, `;
    }
    if (physicalDetails.thighs) {
      finalPrompt += `${physicalDetails.thighs}, `;
    }
    
    // 11. === VENTRE ===
    if (physicalDetails.belly) {
      finalPrompt += `${physicalDetails.belly}, `;
    }
    
    // v5.3.61 - Ajouter physicalDescription brut si contient des infos sur les formes
    if (character && character.physicalDescription) {
      const pd = character.physicalDescription.toLowerCase();
      if (pd.includes('rond') || pd.includes('curvy') || pd.includes('plump') || 
          pd.includes('généreus') || pd.includes('voluptu') || pd.includes('gros')) {
        // Extraire les mots-clés importants
        const keywords = character.physicalDescription
          .replace(/\d+\s*(ans|cm|kg)/gi, '')
          .substring(0, 150);
        finalPrompt += `${keywords}, `;
        console.log(`📋 PhysicalDesc ajouté: ${keywords.substring(0, 80)}...`);
      }
    }
    
    // 12. Style et qualité
    if (isAnime) {
      finalPrompt += 'anime art style, masterpiece, best quality, ';
    } else if (isRealistic) {
      finalPrompt += 'photorealistic, professional photo, 8K quality, ';
    } else {
      finalPrompt += 'high quality, detailed, ';
    }
    
    // 13. Anatomie
    finalPrompt += 'perfect anatomy, single person, solo, ';
    
    // 14. Mode NSFW
    if (isNSFW) {
      // Position
      const nsfwPositions = [
        'standing full body, confident pose',
        'lying on bed, full body visible',
        'kneeling, entire figure shown',
        'sitting, legs and body visible',
      ];
      finalPrompt += nsfwPositions[Math.floor(Math.random() * nsfwPositions.length)] + ', ';
      
      // Tenue selon niveau
      if (nsfwLevel >= 5) {
        finalPrompt += 'completely nude, naked, ';
      } else if (nsfwLevel >= 4) {
        finalPrompt += 'topless, bare breasts, ';
      } else if (nsfwLevel >= 3) {
        finalPrompt += 'sexy lingerie, ';
      } else {
        finalPrompt += 'revealing outfit, ';
      }
      
      finalPrompt += 'sensual, erotic';
    } else {
      finalPrompt += 'elegant pose, attractive, tasteful';
    }
    
    // 15. === RÉPÉTER LES DÉTAILS IMPORTANTS À LA FIN (renforcement) ===
    if (physicalDetails.hairColor) {
      finalPrompt += `, ${physicalDetails.hairColor} hair`;
    }
    if (physicalDetails.bodyType) {
      finalPrompt += `, ${physicalDetails.bodyType}`;
    }
    if (physicalDetails.bust && physicalDetails.gender === 'female') {
      finalPrompt += `, ${physicalDetails.bust}`;
    }
    
    // v5.3.56 - Limite augmentée à 1800 caractères pour inclure tous les détails
    const shortPrompt = finalPrompt.substring(0, 1800);
    const encodedPrompt = encodeURIComponent(shortPrompt);
    
    // Ratio 9:16
    const imageUrl = `${pollinationsUrl}${encodedPrompt}?width=576&height=1024&seed=${seed}&nologo=true&model=flux&enhance=true`;
    
    console.log(`🔗 URL Pollinations (seed: ${seed}, NSFW: ${nsfwLevel})`);
    console.log(`📝 Prompt FINAL (${shortPrompt.length} chars): ${shortPrompt.substring(0, 400)}...`);
    
    return imageUrl;
  }
  
  /**
   * v5.3.60 - Extrait TOUS les détails physiques de l'objet character
   * Parse COMPLÈTEMENT physicalDescription pour les formes, rondeurs, poitrine, pénis
   */
  extractPhysicalDetailsFromCharacter(character) {
    const details = {
      gender: null,
      age: null,
      hairColor: null,
      hairLength: null,
      eyeColor: null,
      skinTone: null,
      height: null,
      bodyType: null,
      bust: null,
      penis: null,
      butt: null,
      hips: null,
      thighs: null,
      belly: null,
    };
    
    if (!character) return details;
    
    // === COLLECTER TOUT LE TEXTE POUR ANALYSE ===
    const fullText = [
      character.physicalDescription || '',
      character.appearance || '',
      character.bodyType || '',
      character.imagePrompt || '',
    ].join(' ').toLowerCase();
    
    console.log(`📋 Analyse physicalDescription: ${fullText.substring(0, 200)}...`);
    
    // === v5.3.61 - GENRE avec support NON-BINAIRE ===
    details.gender = character.gender || null;
    if (!details.gender) {
      // Vérifier d'abord non-binaire
      if (fullText.includes('non-binaire') || fullText.includes('non binaire') || 
          fullText.includes('nonbinary') || fullText.includes('androgyne') ||
          fullText.includes('gender fluid') || fullText.includes('genderfluid')) {
        details.gender = 'non-binary';
        console.log('🏳️‍🌈 Genre NON-BINAIRE détecté dans texte');
      } else if (fullText.includes('femme') || fullText.includes('woman') || fullText.includes('female')) {
        details.gender = 'female';
      } else if (fullText.includes('homme') || fullText.includes('man ') || fullText.includes('male')) {
        details.gender = 'male';
      }
    }
    // Vérifier si character.gender est 'non-binary' exactement
    if (character.gender === 'non-binary' || character.gender === 'nonbinary' || character.gender === 'nb') {
      details.gender = 'non-binary';
      console.log('🏳️‍🌈 Genre NON-BINAIRE depuis character.gender');
    }
    
    // === ÂGE ===
    details.age = this.parseCharacterAge(character.age);
    
    // === CHEVEUX - COULEUR ===
    const hairColorPatterns = {
      'noir|noirs|noire|jet black': 'jet black',
      'brun|brune|bruns|châtain|chatain': 'brown',
      'blond|blonde|blonds|doré': 'blonde',
      'roux|rousse|auburn|ginger': 'red ginger',
      'blanc|blanche|argenté|silver|gris': 'silver white',
      'rose|pink': 'pink', 'bleu|blue': 'blue', 'vert|green': 'green', 'violet|purple': 'purple',
    };
    if (character.hairColor) {
      const lh = character.hairColor.toLowerCase();
      for (const [pattern, value] of Object.entries(hairColorPatterns)) {
        if (new RegExp(pattern).test(lh)) { details.hairColor = value; break; }
      }
      if (!details.hairColor) details.hairColor = character.hairColor;
    }
    if (!details.hairColor) {
      for (const [pattern, value] of Object.entries(hairColorPatterns)) {
        if (new RegExp(`cheveux\\s+${pattern}|${pattern}\\s+hair`, 'i').test(fullText)) {
          details.hairColor = value; break;
        }
      }
    }
    
    // === CHEVEUX - LONGUEUR ===
    const hairLengthPatterns = {
      'très courts|very short|rasé': 'very short buzz cut',
      'courts|short': 'short',
      'mi-longs|mi-long|shoulder': 'medium shoulder-length',
      'longs|long': 'long flowing',
      'très longs|very long|waist|hanches': 'very long waist-length',
    };
    if (character.hairLength) {
      const ll = character.hairLength.toLowerCase();
      for (const [pattern, value] of Object.entries(hairLengthPatterns)) {
        if (new RegExp(pattern).test(ll)) { details.hairLength = value; break; }
      }
      if (!details.hairLength) details.hairLength = character.hairLength;
    }
    if (!details.hairLength) {
      for (const [pattern, value] of Object.entries(hairLengthPatterns)) {
        if (new RegExp(pattern, 'i').test(fullText)) { details.hairLength = value; break; }
      }
    }
    
    // === YEUX ===
    const eyeColorPatterns = {
      'bleu|bleus|blue': 'blue', 'vert|verts|green': 'green',
      'marron|brown': 'brown', 'noisette|hazel': 'hazel',
      'noir|noirs|black': 'dark black', 'gris|grey|gray': 'grey',
      'ambre|amber': 'amber', 'violet|purple': 'violet',
    };
    if (character.eyeColor) {
      const le = character.eyeColor.toLowerCase();
      for (const [pattern, value] of Object.entries(eyeColorPatterns)) {
        if (new RegExp(pattern).test(le)) { details.eyeColor = value; break; }
      }
      if (!details.eyeColor) details.eyeColor = character.eyeColor;
    }
    if (!details.eyeColor) {
      for (const [pattern, value] of Object.entries(eyeColorPatterns)) {
        if (new RegExp(`yeux\\s+${pattern}|${pattern}\\s+eyes`, 'i').test(fullText)) {
          details.eyeColor = value; break;
        }
      }
    }
    
    // === PEAU ===
    const skinPatterns = {
      'porcelaine|très pale|très claire|very pale': 'porcelain pale white',
      'pale|claire|fair|pâle': 'fair light',
      'mate|olive|méditerran': 'olive tan',
      'bronzé|tan|doré|golden': 'tanned golden',
      'caramel|métis': 'caramel brown',
      'ébène|noir|dark|foncé|ebony': 'dark ebony',
    };
    if (character.skinTone) {
      const ls = character.skinTone.toLowerCase();
      for (const [pattern, value] of Object.entries(skinPatterns)) {
        if (new RegExp(pattern).test(ls)) { details.skinTone = value; break; }
      }
      if (!details.skinTone) details.skinTone = character.skinTone;
    }
    if (!details.skinTone) {
      for (const [pattern, value] of Object.entries(skinPatterns)) {
        if (new RegExp(`peau\\s+${pattern}|${pattern}\\s+skin`, 'i').test(fullText)) {
          details.skinTone = value; break;
        }
      }
    }
    
    // === TAILLE ===
    if (character.height) {
      const h = parseInt(character.height);
      if (h < 155) details.height = 'petite short (under 155cm)';
      else if (h < 165) details.height = 'average height (155-165cm)';
      else if (h < 175) details.height = 'tall (165-175cm)';
      else details.height = 'very tall (over 175cm)';
    }
    // Chercher dans physicalDescription
    const heightMatch = fullText.match(/(\d{3})\s*cm/);
    if (heightMatch && !details.height) {
      const h = parseInt(heightMatch[1]);
      if (h < 155) details.height = 'petite short';
      else if (h < 165) details.height = 'average height';
      else if (h < 175) details.height = 'tall';
      else details.height = 'very tall';
    }
    
    // === v5.3.62 - MORPHOLOGIE / FORMES / RONDEURS - MOTS TRÈS FORTS ===
    // Utiliser des mots que les modèles AI comprennent bien: FAT, OBESE, OVERWEIGHT
    const bodyPatterns = {
      // Mince
      'très mince|very thin|maigre|skinny': 'very thin skinny body',
      'mince|slim|slender|fine': 'slim slender body',
      'élancé|élancée|tall slender': 'slender elegant tall body',
      // Athlétique
      'athlétique|athletic|musclé|muscular|toned|fit': 'athletic toned muscular body',
      // Moyenne
      'moyenne|average|normal': 'average normal body',
      // Courbes - MOTS TRÈS FORTS
      'voluptueuse|voluptueux|voluptuous': 'FAT CURVY body, OBESE hourglass figure, HUGE BREASTS, WIDE HIPS, very thick',
      'généreuse|généreux|generous': 'FAT OVERWEIGHT body, OBESE full-figured, soft fat everywhere, very plump',
      'pulpeuse|pulpeux|thick curvy': 'FAT THICK body, OBESE plump figure, soft fat, full thick thighs',
      'plantureuse|plantureux|buxom': 'FAT BUXOM body, HUGE HEAVY BREASTS, WIDE FAT HIPS, obese hourglass',
      // Ronde - MOTS TRÈS FORTS
      'très ronde|très rond|very chubby|bbw|obèse': 'VERY FAT OBESE BBW body, HUGE FAT BELLY, extremely plump, plus size, morbidly obese',
      'corps très rond': 'VERY FAT OBESE body, BIG FAT BELLY, extremely plump, BBW, overweight',
      'ronde|rond|chubby|plump|potelé|potelée': 'FAT CHUBBY body, BIG SOFT BELLY, plump obese figure, BBW overweight',
      'enrobé|enrobée|plump soft': 'FAT PLUMP body, OBESE chubby, soft fat, round fat belly',
      // Maternelle
      'maternelle|maternel|maternal|milf': 'soft fat maternal body, MILF figure, plump',
    };
    
    // D'abord vérifier character.bodyType
    if (character.bodyType) {
      const lb = character.bodyType.toLowerCase();
      for (const [pattern, value] of Object.entries(bodyPatterns)) {
        if (new RegExp(pattern).test(lb)) { details.bodyType = value; break; }
      }
      if (!details.bodyType) {
        // Mapping direct - MOTS TRÈS FORTS
        const directMap = {
          'mince': 'slim slender body',
          'moyenne': 'average body',
          'athlétique': 'athletic toned body',
          'voluptueuse': 'FAT CURVY body, OBESE hourglass, HUGE BREASTS, WIDE HIPS',
          'généreuse': 'FAT OVERWEIGHT body, OBESE full-figured, soft fat everywhere',
          'pulpeuse': 'FAT THICK body, OBESE plump, soft fat curves',
          'ronde': 'FAT CHUBBY body, BIG SOFT BELLY, OBESE plump, BBW overweight',
          'très ronde': 'VERY FAT OBESE BBW, HUGE FAT BELLY, extremely plump, morbidly obese',
          'plantureuse': 'FAT BUXOM body, HUGE HEAVY BREASTS, WIDE FAT HIPS',
          'enrobée': 'FAT PLUMP body, OBESE chubby, soft fat',
          'potelée': 'FAT CHUBBY body, soft plump obese',
        };
        details.bodyType = directMap[lb] || character.bodyType;
      }
    }
    
    // Ensuite chercher dans physicalDescription - patterns plus larges
    if (!details.bodyType) {
      // Vérifier d'abord les patterns composés
      if (fullText.includes('très rond') || fullText.includes('very round')) {
        details.bodyType = 'VERY FAT OBESE BBW body, HUGE FAT BELLY, extremely plump';
        console.log('🔴 Détecté: très rond -> VERY FAT OBESE');
      } else if (fullText.includes('corps rond') || fullText.includes('round body')) {
        details.bodyType = 'FAT CHUBBY body, BIG SOFT BELLY, OBESE plump, BBW';
        console.log('🔴 Détecté: corps rond -> FAT CHUBBY');
      } else {
        for (const [pattern, value] of Object.entries(bodyPatterns)) {
          if (new RegExp(pattern, 'i').test(fullText)) { details.bodyType = value; break; }
        }
      }
    }
    
    console.log(`🏋️ MORPHOLOGIE FINALE: ${details.bodyType || 'non détectée'}`);
    
    // === v5.3.60 - POITRINE - ANALYSE COMPLÈTE ===
    const isFemale = details.gender === 'female' || fullText.includes('femme') || fullText.includes('woman');
    
    if (isFemale) {
      // D'abord character.bust
      if (character.bust) {
        const bustMap = {
          'A': 'SMALL A-CUP breasts, petite flat chest',
          'B': 'SMALL B-CUP breasts, modest small bust',
          'C': 'MEDIUM C-CUP breasts, average bust',
          'D': 'LARGE D-CUP breasts, BIG full breasts',
          'DD': 'VERY LARGE DD-CUP breasts, BIG heavy breasts',
          'E': 'HUGE E-CUP breasts, very BIG breasts',
          'F': 'HUGE F-CUP breasts, MASSIVE breasts',
          'G': 'GIGANTIC G-CUP breasts, ENORMOUS bust',
          'H': 'MASSIVE H-CUP breasts, extremely HUGE breasts',
          'I': 'GIGANTIC I-CUP breasts, massive heavy bust',
        };
        details.bust = bustMap[character.bust.toUpperCase()] || `${character.bust}-cup breasts`;
      }
      
      // Chercher dans physicalDescription
      if (!details.bust) {
        const bustPatterns = {
          'bonnet a|a-cup|petite poitrine|flat chest|petit sein': 'SMALL A-CUP breasts, petite flat chest',
          'bonnet b|b-cup|petits seins': 'SMALL B-CUP breasts, modest bust',
          'bonnet c|c-cup|poitrine moyenne': 'MEDIUM C-CUP breasts, average bust',
          'bonnet d|d-cup|belle poitrine|grosse poitrine': 'LARGE D-CUP breasts, BIG full breasts',
          'bonnet dd|dd-cup|très grosse poitrine': 'VERY LARGE DD-CUP breasts, BIG heavy breasts',
          'bonnet e|e-cup|énorme poitrine': 'HUGE E-CUP breasts, very BIG breasts',
          'bonnet f|f-cup|poitrine massive': 'HUGE F-CUP breasts, MASSIVE breasts',
          'bonnet g|g-cup|poitrine gigantesque': 'GIGANTIC G-CUP breasts, ENORMOUS bust',
          'bonnet h|h-cup': 'MASSIVE H-CUP breasts, extremely HUGE breasts',
          'gros seins|big breasts|large breasts|heavy breasts': 'BIG full breasts, large bust',
          'énormes seins|huge breasts|massive breasts': 'HUGE MASSIVE breasts, very large bust',
          'petits seins|small breasts|flat chest': 'small breasts, modest bust',
        };
        for (const [pattern, value] of Object.entries(bustPatterns)) {
          if (new RegExp(pattern, 'i').test(fullText)) { details.bust = value; break; }
        }
      }
      console.log(`👙 POITRINE FINALE: ${details.bust || 'non détectée'}`);
    }
    
    // === v5.3.60 - PÉNIS - ANALYSE COMPLÈTE ===
    const isMale = details.gender === 'male' || fullText.includes('homme') || fullText.includes('man');
    
    if (isMale) {
      // D'abord character.penis
      if (character.penis) {
        const penisNum = parseInt(character.penis);
        if (penisNum < 12) details.penis = 'small penis';
        else if (penisNum < 15) details.penis = 'average penis';
        else if (penisNum < 18) details.penis = 'big penis, large cock';
        else if (penisNum < 22) details.penis = 'HUGE penis, MASSIVE cock';
        else details.penis = 'ENORMOUS penis, GIGANTIC cock';
      }
      
      // Chercher dans physicalDescription
      if (!details.penis) {
        const penisPatterns = {
          'petit pénis|small penis|small cock': 'small penis',
          'pénis moyen|average penis': 'average penis',
          'gros pénis|big penis|big cock|large cock': 'big penis, large cock',
          'énorme pénis|huge penis|huge cock|massive cock': 'HUGE penis, MASSIVE cock',
          '(\\d+)\\s*cm': null, // Will be processed separately
        };
        for (const [pattern, value] of Object.entries(penisPatterns)) {
          if (value && new RegExp(pattern, 'i').test(fullText)) { details.penis = value; break; }
        }
        // Taille en cm
        const penisMatch = fullText.match(/pénis[^\\d]*(\\d+)\\s*cm|sexe[^\\d]*(\\d+)\\s*cm|(\\d+)\\s*cm.*pénis/i);
        if (penisMatch && !details.penis) {
          const size = parseInt(penisMatch[1] || penisMatch[2] || penisMatch[3]);
          if (size < 12) details.penis = 'small penis';
          else if (size < 15) details.penis = 'average penis';
          else if (size < 18) details.penis = 'big penis, large cock';
          else details.penis = 'HUGE penis, MASSIVE cock';
        }
      }
      console.log(`🍆 PÉNIS FINAL: ${details.penis || 'non détecté'}`);
    }
    
    // === FESSES ===
    const buttPatterns = {
      'énormes fesses|huge butt|huge ass|très grosses fesses': 'HUGE round butt, very large plump ass',
      'grosses fesses|big butt|big ass|large butt': 'BIG round butt, large plump ass',
      'fesses rebondies|bubble butt|perky butt': 'round bubble butt, perky ass',
      'belles fesses|nice butt|nice ass': 'nice round butt',
      'petites fesses|small butt|flat butt': 'small flat butt',
    };
    for (const [pattern, value] of Object.entries(buttPatterns)) {
      if (new RegExp(pattern, 'i').test(fullText)) { details.butt = value; break; }
    }
    
    // === HANCHES ===
    const hipPatterns = {
      'très larges hanches|very wide hips': 'very WIDE hips, curvy',
      'larges hanches|wide hips|hanches larges': 'WIDE hips, curvy hip bones',
      'hanches généreuses|generous hips': 'generous WIDE hips',
    };
    for (const [pattern, value] of Object.entries(hipPatterns)) {
      if (new RegExp(pattern, 'i').test(fullText)) { details.hips = value; break; }
    }
    
    // === CUISSES ===
    const thighPatterns = {
      'très grosses cuisses|very thick thighs': 'very THICK meaty thighs',
      'grosses cuisses|thick thighs|cuisses épaisses': 'THICK meaty thighs',
      'cuisses galbées|toned thighs': 'toned shapely thighs',
    };
    for (const [pattern, value] of Object.entries(thighPatterns)) {
      if (new RegExp(pattern, 'i').test(fullText)) { details.thighs = value; break; }
    }
    
    // === VENTRE ===
    const bellyPatterns = {
      'gros ventre|big belly|large belly': 'BIG round belly, chubby tummy',
      'petit ventre|small belly|soft belly|léger ventre': 'soft small belly, slight tummy',
      'ventre plat|flat stomach|flat belly': 'flat toned stomach',
      'ventre rebondi|round belly': 'round soft belly',
    };
    for (const [pattern, value] of Object.entries(bellyPatterns)) {
      if (new RegExp(pattern, 'i').test(fullText)) { details.belly = value; break; }
    }
    
    // Si ronde/généreuse et pas de ventre spécifié, ajouter automatiquement
    if (details.bodyType && !details.belly) {
      const bt = details.bodyType.toLowerCase();
      if (bt.includes('bbw') || bt.includes('chubby') || bt.includes('plump')) {
        details.belly = 'soft round belly';
      } else if (bt.includes('curvy') || bt.includes('voluptuous')) {
        details.belly = 'soft slight belly';
      }
    }
    
    return details;
  }

  /**
   * v5.3.58 - Extrait les détails physiques d'un prompt (fallback)
   */
  extractAllPhysicalDetails(prompt) {
    const lower = prompt.toLowerCase();
    const details = {
      gender: null,
      age: null,
      hairColor: null,
      hairLength: null,
      eyeColor: null,
      skinTone: null,
      height: null,
      bodyType: null,
      bust: null,
      penis: null,
      butt: null,
      hips: null,
      thighs: null,
      belly: null,
    };
    
    // === GENRE ===
    if (lower.includes('woman') || lower.includes('female') || lower.includes('femme') || lower.includes('girl')) {
      details.gender = 'female';
    } else if (lower.includes('man ') || lower.includes('male') || lower.includes('homme') || lower.includes('boy')) {
      details.gender = 'male';
    }
    
    // === ÂGE ===
    const ageMatch = prompt.match(/(\d{2})\s*(ans|years?\s*old|yo)/i);
    if (ageMatch) {
      details.age = parseInt(ageMatch[1]);
    }
    
    // === MORPHOLOGIE - v5.3.58 TRÈS COMPLÈTE ===
    const bodyTypes = {
      'mince': 'slim slender body', 'slim': 'slim slender body', 'slender': 'slender body',
      'élancée': 'slender elegant body', 'élancé': 'slender elegant body',
      'athlétique': 'athletic muscular body', 'athletic': 'athletic toned body',
      'voluptueuse': 'VOLUPTUOUS CURVY body, hourglass, big bust, wide hips',
      'voluptueux': 'VOLUPTUOUS body, curvy',
      'généreuse': 'GENEROUS CURVY body, full-figured, soft curves',
      'généreux': 'GENEROUS body, full-figured',
      'pulpeuse': 'THICK CURVY body, plump, soft curves',
      'pulpeux': 'THICK body, plump',
      'ronde': 'CHUBBY ROUND body, soft belly, plump, BBW',
      'rond': 'CHUBBY ROUND body',
      'très ronde': 'VERY CHUBBY BBW body, big soft belly, very plump',
      'plantureuse': 'VOLUPTUOUS body, big breasts, wide hips',
      'enrobée': 'PLUMP SOFT body, chubby, soft curves',
      'enrobé': 'PLUMP body, chubby',
      'potelée': 'CHUBBY CUTE body, soft plump',
      'potelé': 'CHUBBY body, plump',
      'curvy': 'CURVY body with nice curves',
      'thick': 'THICK body, curvy plump',
      'chubby': 'CHUBBY soft body, plump',
      'bbw': 'BBW body, very curvy, plus size',
      'plump': 'PLUMP soft body',
    };
    for (const [key, value] of Object.entries(bodyTypes)) {
      if (lower.includes(key)) {
        details.bodyType = value;
        console.log(`🏋️ Morphologie (prompt): ${key} -> ${value}`);
        break;
      }
    }
    
    // === CHEVEUX - COULEUR ===
    const hairColors = {
      'black hair': 'black', 'noir': 'black', 'noirs': 'black',
      'brown hair': 'brown', 'brun': 'brown', 'châtain': 'chestnut brown',
      'blonde': 'blonde', 'blond': 'blonde', 'blonds': 'blonde',
      'red hair': 'red', 'roux': 'red ginger', 'rousse': 'red ginger', 'auburn': 'auburn',
      'white hair': 'white', 'blanc': 'white', 'silver': 'silver', 'argenté': 'silver',
      'pink hair': 'pink', 'rose': 'pink',
      'blue hair': 'blue', 'bleu': 'blue',
      'green hair': 'green', 'vert': 'green',
      'purple hair': 'purple', 'violet': 'purple',
    };
    for (const [key, value] of Object.entries(hairColors)) {
      if (lower.includes(key)) {
        details.hairColor = value;
        break;
      }
    }
    
    // === CHEVEUX - LONGUEUR ===
    const hairLengths = {
      'very long hair': 'very long', 'très longs': 'very long', 'waist-length': 'very long flowing',
      'long hair': 'long', 'longs': 'long',
      'medium hair': 'medium length', 'mi-longs': 'medium length', 'shoulder': 'shoulder-length',
      'short hair': 'short', 'courts': 'short', 'très courts': 'very short',
    };
    for (const [key, value] of Object.entries(hairLengths)) {
      if (lower.includes(key)) {
        details.hairLength = value;
        break;
      }
    }
    
    // === YEUX ===
    const eyeColors = {
      'blue eyes': 'blue', 'bleu': 'blue', 'yeux bleus': 'blue',
      'green eyes': 'green', 'vert': 'green', 'yeux verts': 'green',
      'brown eyes': 'brown', 'marron': 'brown', 'yeux marrons': 'brown', 'noisette': 'hazel',
      'black eyes': 'black', 'noir': 'black',
      'amber eyes': 'amber', 'ambre': 'amber',
      'red eyes': 'red', 'rouge': 'red',
      'violet eyes': 'violet', 'purple': 'purple',
      'golden eyes': 'golden', 'doré': 'golden',
    };
    for (const [key, value] of Object.entries(eyeColors)) {
      if (lower.includes(key)) {
        details.eyeColor = value;
        break;
      }
    }
    
    // === PEAU ===
    const skinTones = {
      'pale skin': 'pale fair', 'très claire': 'very pale fair', 'claire': 'fair light',
      'fair skin': 'fair', 'light skin': 'light',
      'tan skin': 'tanned', 'bronzée': 'tanned golden', 'mate': 'olive tan',
      'dark skin': 'dark', 'ébène': 'dark ebony', 'caramel': 'caramel brown',
      'olive skin': 'olive',
    };
    for (const [key, value] of Object.entries(skinTones)) {
      if (lower.includes(key)) {
        details.skinTone = value;
        break;
      }
    }
    
    // === TAILLE ===
    const heightMatch = prompt.match(/(\d{3})\s*cm/i);
    if (heightMatch) {
      const h = parseInt(heightMatch[1]);
      if (h < 155) details.height = 'petite short';
      else if (h < 165) details.height = 'average height';
      else if (h < 175) details.height = 'tall';
      else details.height = 'very tall';
    } else if (lower.includes('petite') || lower.includes('small height')) {
      details.height = 'petite short';
    } else if (lower.includes('tall') || lower.includes('grande')) {
      details.height = 'tall';
    }
    
    // === POITRINE ===
    const bustSizes = {
      'a-cup': 'small A-cup breasts, petite bust', 'a cup': 'small A-cup breasts',
      'b-cup': 'small B-cup breasts, modest bust', 'b cup': 'small B-cup breasts',
      'c-cup': 'medium C-cup breasts, average bust', 'c cup': 'medium C-cup breasts',
      'd-cup': 'full D-cup breasts, nice bust', 'd cup': 'full D-cup breasts, large bust',
      'dd-cup': 'large DD-cup breasts, big bust', 'dd cup': 'large DD-cup breasts',
      'e-cup': 'big E-cup breasts, large bust', 'e cup': 'big E-cup breasts',
      'f-cup': 'huge F-cup breasts, very large bust', 'f cup': 'huge F-cup breasts',
      'g-cup': 'massive G-cup breasts, enormous bust', 'g cup': 'massive G-cup breasts',
      'big breasts': 'big breasts, large bust', 'large breasts': 'large breasts, big bust',
      'small breasts': 'small breasts, petite bust', 'flat chest': 'flat chest, small breasts',
      'huge breasts': 'huge breasts, massive bust', 'enormous breasts': 'enormous massive breasts',
      'grosse poitrine': 'big breasts, large bust', 'petite poitrine': 'small breasts, petite bust',
    };
    for (const [key, value] of Object.entries(bustSizes)) {
      if (lower.includes(key)) {
        details.bust = value;
        break;
      }
    }
    
    // === PÉNIS ===
    const penisMatch = prompt.match(/(\d{1,2})\s*cm.*p[ée]nis/i) || prompt.match(/p[ée]nis.*(\d{1,2})\s*cm/i);
    if (penisMatch) {
      const size = parseInt(penisMatch[1]);
      if (size < 12) details.penis = 'small penis';
      else if (size < 16) details.penis = 'average penis';
      else if (size < 20) details.penis = 'big penis, large cock';
      else details.penis = 'huge penis, massive cock';
    } else if (lower.includes('big penis') || lower.includes('gros pénis')) {
      details.penis = 'big penis, large cock';
    } else if (lower.includes('huge penis') || lower.includes('énorme pénis')) {
      details.penis = 'huge penis, massive cock';
    }
    
    // === FESSES ===
    if (lower.includes('big butt') || lower.includes('grosses fesses') || lower.includes('large butt')) {
      details.butt = 'big round butt, large ass';
    } else if (lower.includes('bubble butt') || lower.includes('fesses rebondies')) {
      details.butt = 'round bubble butt';
    }
    
    // === HANCHES ===
    if (lower.includes('wide hips') || lower.includes('hanches larges')) {
      details.hips = 'wide hips';
    }
    
    // === CUISSES ===
    if (lower.includes('thick thighs') || lower.includes('cuisses épaisses')) {
      details.thighs = 'thick thighs';
    }
    
    // === VENTRE ===
    if (lower.includes('flat stomach') || lower.includes('ventre plat')) {
      details.belly = 'flat toned stomach';
    } else if (lower.includes('soft belly') || lower.includes('petit ventre') || lower.includes('small belly')) {
      details.belly = 'soft small belly';
    }
    
    return details;
  }
  
  /**
   * API de secours avec Freebox
   */
  async generateWithFreeboxBackup(prompt) {
    console.log('🏠 Génération avec API Freebox (backup)...');
    
    let freeboxUrl = CustomImageAPIService.getApiUrl();
    if (!freeboxUrl) {
      freeboxUrl = this.freeboxURL;
    }
    
    const seed = Date.now() + Math.floor(Math.random() * 10000);
    const shortPrompt = prompt.substring(0, 800);
    const encodedPrompt = encodeURIComponent(shortPrompt);
    
    const separator = freeboxUrl.includes('?') ? '&' : '?';
    // v5.3.52 - Ratio 9:16 pour smartphones
    let imageUrl = `${freeboxUrl}${separator}prompt=${encodedPrompt}&width=576&height=1024&seed=${seed}`;
    
    console.log(`🔗 URL Freebox générée`);
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
    // v5.3.52 - Ratio 9:16 pour smartphones
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=576&height=1024&seed=${seed}&nologo=true&nofeed=true&model=flux&t=${antiCache}`;
    
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
