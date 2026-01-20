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
    // v5.4.11 - STYLES ANIME AMÉLIORÉS avec NSFW et corps entier
    this.animeStyles = [
      'anime style full body illustration, anime art, clean lineart, vibrant colors, entire figure visible',
      'anime artwork, japanese animation style, cel shading, detailed anime, complete character head to feet',
      'manga style illustration full body, anime character design, 2D anime art, full figure',
      'high quality anime illustration, beautiful anime art, detailed background, entire body visible',
      'ecchi anime style, sensual anime art, detailed body, full figure illustration, soft shading',
      'hentai art style, explicit anime illustration, detailed anatomy, full body visible, uncensored',
    ];
    
    // v5.4.11 - STYLES SANS "PORTRAIT" pour éviter les close-ups
    this.realisticStyles = [
      'photorealistic full body photography, professional DSLR photo, 50mm lens, entire figure visible',
      'hyper-realistic photograph, studio lighting, high-end boudoir photography, full body shot',
      'ultra-realistic photo, natural lighting, professional full figure photography',
      'cinematic photography, movie still quality, professional photoshoot, complete figure head to feet',
      'glamour photography style, sensual lighting, full body visible, magazine quality',
      'intimate boudoir photoshoot, soft lighting, entire body from head to toes',
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
    
    // v5.4.15 - PROMPT ANATOMIQUE POUR DUOS/TRIOS - ULTRA-DÉTAILLÉ
    this.anatomyDuoPrompt = 
      'ANATOMICALLY PERFECT TWO PEOPLE: ' +
      'exactly TWO distinct persons shown together, both with perfect anatomy, ' +
      'each person has exactly TWO arms attached to shoulders, exactly TWO legs attached to hips, ' +
      'each person has exactly TWO hands with FIVE fingers each, exactly TWO feet with five toes each, ' +
      'each person has ONE head, ONE face, TWO symmetrical eyes, ONE nose centered, ONE mouth with lips, TWO ears, ' +
      'two completely separate bodies, NOT merged, NOT fused, clearly distinct individuals, ' +
      'both persons fully visible from head to feet, natural interaction, ' +
      'perfect proportions for both, realistic human anatomy, ' +
      'correct breast shape with visible nipples if topless female, natural body curves, ' +
      'beautiful faces, expressive eyes, full lips, detailed skin texture';
    
    // v5.4.16 - NEGATIVE PROMPT SPÉCIAL DUOS (évite les fusions)
    this.negativeDuoPrompt = 
      'three people, four people, crowd, group of more than two, ' +
      'merged bodies, fused bodies, conjoined, siamese, overlapping bodies, ' +
      'extra arms, three arms, four arms, six arms, extra legs, three legs, four legs, ' +
      'extra hands, three hands, extra fingers, six fingers, seven fingers, missing fingers, ' +
      'extra heads, three heads, two faces on one head, ' +
      'deformed, distorted, disfigured, mutated, bad anatomy, wrong anatomy, ' +
      'malformed hands, twisted hands, backwards hands, clawed hands, ' +
      'malformed face, asymmetrical face, cross-eyed, misaligned eyes, ' +
      'missing nipples, no nipples, flat chest when should have breasts, ' +
      'missing lips, no mouth, deformed mouth, missing eyes, ' +
      'blurry, low quality, pixelated, watermark, signature, text, ' +
      'ugly, grotesque, horror, creepy, nightmare';
    
    // v5.4.22 - NEGATIVE PROMPT ULTRA-COMPLET RENFORCÉ
    // Base - sera augmenté dynamiquement selon le body type
    this.negativePromptBase = 
      'deformed, distorted, disfigured, mutated, bad anatomy, wrong anatomy, anatomical errors, ' +
      'extra limbs, missing limbs, three arms, four arms, three legs, four legs, extra body parts, ' +
      'floating limbs, disconnected limbs, merged limbs, fused body parts, ' +
      'malformed hands, twisted hands, backwards hands, extra fingers, missing fingers, ' +
      'fused fingers, six fingers, seven fingers, too many fingers, mutated hands, bad hands, ' +
      'clothes fused with skin, clothes melting into body, fabric merged with flesh, ';
      
    this.negativePromptFull = this.negativePromptBase +
      'clawed hands, webbed fingers, malformed feet, extra toes, bent wrong way, ' +
      'extra arms, extra legs, duplicate body parts, clone, conjoined, ' +
      'two heads, two faces, multiple people when single, crowd, group when solo, ' +
      'malformed breasts, misshapen breasts, uneven breasts, extra nipples, droopy wrong breasts, ' +
      'breasts too high, breasts too low, breasts on stomach, breasts on neck, ' +
      'square breasts, triangular breasts, flat when should be big, huge when should be small, ' +
      'malformed face, asymmetrical face, cross-eyed, misaligned eyes, third eye, ' +
      'double chin overlapping, long neck, twisted neck, broken neck, giraffe neck, ' +
      'legs bending wrong way, knees backwards, arms bending wrong, elbows reversed, ' +
      'butt on front, butt too high, butt on back of knees, malformed buttocks, ' +
      'waist too thin, waist too wide, impossible waist, broken spine, twisted torso, ' +
      'fingers merged together, thumb on wrong side, palm facing wrong way, ' +
      'toes fused, feet backwards, ankles twisted, ' +
      'blurry, low quality, pixelated, watermark, signature, text, logo, ' +
      'bad proportions, giant head, tiny head, long arms, short arms, ' +
      'jpeg artifacts, compression artifacts, noise, grainy, ' +
      'ugly, grotesque, horror, creepy, nightmare, zombie, ' +
      'nsfw artifacts, censorship bars, mosaic censorship, black bars';
    
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
    
    // === v5.4.11 - LIEUX NSFW TRÈS DÉTAILLÉS ===
    this.locations = {
      bedroom: [
        'in luxurious master bedroom with silk red sheets, romantic candles, intimate boudoir atmosphere, detailed room visible',
        'on king-size bed with satin pillows scattered, messy sheets after passion, intimate bedroom setting',
        'bedroom with fairy lights and roses, dreamy romantic ambiance, soft bed visible',
        'modern minimalist bedroom with city view at night, floor-to-ceiling windows, sexy atmosphere',
        'vintage boudoir room with antique vanity mirror, velvet curtains, erotic elegant setting',
        'hotel suite bedroom, champagne on nightstand, romantic getaway atmosphere',
      ],
      bathroom: [
        'in marble bathroom with steamy mirrors, wet tiles, sensual spa atmosphere',
        'near clawfoot bathtub filled with bubbles, vintage elegant bathroom, rose petals floating',
        'in modern shower with glass walls, water streaming on body, steam everywhere',
        'by bathroom mirror after shower, towels on floor, steamy intimate atmosphere',
        'in jacuzzi with bubbles and champagne, relaxing sensual, jets bubbling',
      ],
      pool: [
        'by infinity pool at sunset, wet glistening body, tropical paradise background',
        'in swimming pool water, breasts above water, wet hair, sensual',
        'poolside on luxury lounger, tropical palm trees, bikini tan lines visible',
        'near waterfall pool in exotic jungle, wet paradise, natural beauty',
      ],
      nature: [
        'on secluded private beach, waves crashing behind, sunset golden light, nude beach atmosphere',
        'in forest clearing with sunbeams through trees, natural goddess, earthy setting',
        'near crystal lake at sunset, golden hour glow on skin, romantic nature',
        'in lavender flower field, purple blooms surrounding, ethereal natural beauty',
        'on luxury balcony overlooking ocean, salty breeze, panoramic view background',
      ],
      interior: [
        'in penthouse with panoramic city view at night, city lights twinkling behind, luxury atmosphere',
        'by roaring fireplace on fur rug, warm flickering orange glow, cozy intimate',
        'on leather sofa in upscale living room, whiskey on table, sophisticated sexy',
        'in artist studio with large windows and natural light, canvas and paint visible, creative',
        'in front of large bay window with city skyline, silhouette lighting, mysterious',
        'on soft white fur rug near crackling fireplace, wine glasses nearby, romantic',
        'in walk-in closet with designer clothes, full mirror reflection, getting dressed/undressed',
      ],
      special: [
        'hotel room with rose petals on bed and champagne, honeymoon suite, romantic',
        'yacht deck at sunset on calm ocean, luxury pillows, glamorous atmosphere',
        'private Finnish sauna with wooden benches, steam rising, hot naked atmosphere',
        'backstage dressing room with makeup lights, costume rack visible, glamorous',
        'professional photo studio with softbox lighting, white backdrop, boudoir shoot',
        'strip club VIP room with velvet couches, purple lighting, naughty atmosphere',
      ],
    };
    
    // === v5.4.20 - TYPES DE PHOTOS VARIÉS AVEC ANGLES INTIMES ===
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
    
    // === v5.4.20 - ANGLES INTIMES NSFW (pour niveaux 4+) ===
    this.intimateAngles = [
      // === VUES CENTRÉES SUR LA POITRINE ===
      'close-up on breasts, cleavage detail, nipples visible, sensual focus',
      'medium shot focused on chest, breasts emphasized, seductive expression',
      'POV looking down at breasts, hands cupping, intimate perspective',
      'breast focus shot, nipples prominent, soft lighting on skin',
      'chest centered frame, breasts bouncing or jiggling, dynamic pose',
      // === VUES DU DESSUS ===
      'shot from above, looking down at body, breasts visible from top angle',
      'overhead view of body lying down, intimate bird eye perspective',
      'top-down angle showing cleavage and body, voyeuristic POV',
      'from above while lying on bed, breasts and face visible',
      // === VUES DE DERRIÈRE / FESSES ===
      'rear view focused on butt, looking over shoulder seductively',
      'ass-focused shot, bent over, rear presented, back arched',
      'from behind, butt emphasized, thong or naked, inviting pose',
      'doggy style angle, rear view, butt prominent, face looking back',
      'kneeling from behind, ass up, face down, submissive pose',
      'standing rear view, butt cheeks visible, looking back flirtatiously',
      // === VUES INTIMES / SEXE ===
      'legs spread view, intimate area visible, lying on bed',
      'POV between legs, looking up at face, intimate perspective',
      'pussy shot, legs open wide, explicit frontal view',
      'close-up intimate area, spread open, detailed explicit',
      'missionary POV, looking down at body, legs wrapped around',
      // === VUES COMBINÉES SENSUELLES ===
      'on all fours, breasts hanging, rear up, seductive look back',
      'lying on side, breast and hip curve emphasized, sensual pose',
      'straddling view from below, breasts and face visible',
      'bent over bed, rear view with breasts visible from angle',
    ];
    
    // === VARIÉTÉ D'ÉCLAIRAGES ===
    // v5.4.14 - ÉCLAIRAGES INSPIRÉS DES EXEMPLES (Evie, Mira, Nora, Lucy)
    this.lightingStyles = [
      // Style Evie - Chambre chaleureuse
      'soft warm bedroom lighting, golden glow from lamp, romantic ambiance',
      'soft diffused bedroom light, intimate warm tones, silk sheets glowing',
      'warm amber lighting from bedside lamp, cozy romantic atmosphere',
      // Style Mira - Club/Neon
      'neon club lighting pink and blue, modern nightlife aesthetic, moody atmosphere',
      'bathroom vanity lights with warm bulbs, mirror reflections, intimate setting',
      'purple and blue neon glow, velvet textures, club VIP ambiance',
      // Style Nora - Dark moody
      'dark moody lighting with subtle blue accents, mysterious atmosphere',
      'low key dramatic lighting, strong shadows, sensual contrast',
      'dramatic chiaroscuro lighting, highlighting curves, artistic shadows',
      // Style Lucy - Fireplace/Holiday
      'warm fireplace glow, orange flickering light, cozy intimate atmosphere',
      'fairy lights twinkling, soft warm Christmas ambiance, magical glow',
      'golden candlelight, romantic warm tones, sensual shadows',
      // Classiques améliorés
      'studio professional boudoir lighting, soft boxes, flawless skin illumination',
      'natural window light with soft shadows, morning bedroom glow',
      'golden hour sunset light through curtains, magical warm atmosphere',
    ];
    
    // === v5.4.14 - AMBIANCES INSPIRÉES DES EXEMPLES (Evie, Mira, Nora, Lucy) ===
    this.moods = [
      // Style Evie - Douce et séductrice
      'soft seductive expression, gentle smile, bedroom eyes looking at camera, inviting',
      'playful teasing mood, slight smile, looking over shoulder flirtatiously',
      'relaxed sensual atmosphere, lying comfortably, intimate and inviting gaze',
      'elegant sophisticated sensuality, classy lingerie, secret desires visible in eyes',
      // Style Mira - Suggestive et confiante  
      'suggestive playful expression, lips slightly parted, teasing with lollipop',
      'confident alluring pose, deep cleavage, knowing smile, mysterious',
      'nightclub seductive vibe, smoky eyes, pouty lips, irresistible attraction',
      // Style Nora - Athlétique et confiante
      'confident athletic sensuality, slight smile, dark moody, powerful feminine energy',
      'mysterious seductive femme fatale, enigmatic allure, dangerously sexy',
      'sporty yet sensual, healthy glow, confident in her body, inviting gaze',
      // Style Lucy - Élégante et chaleureuse
      'warm confident expression, hands on hips, fireplace glow, welcoming sensuality',
      'elegant holiday mood, romantic atmosphere, soft smile, inviting warmth',
      'sophisticated sensuality, velvet textures, classy but naughty expression',
      // Ambiances variées
      'innocent sweet appearance hiding naughty thoughts, subtle corruption, coy smile',
      'aroused excited state, flushed cheeks, slightly parted lips, obvious desire',
      'soft tender intimate connection, loving lustful gaze, deep emotional desire',
    ];
    
    // v5.4.3 - TENUES NSFW ULTRA-EXPLICITES ET SUGGESTIVES
    this.nsfwOutfits = [
      // === LINGERIE TRÈS SEXY ===
      'wearing tiny red lace thong and matching push-up bra barely containing breasts, nipples almost visible through sheer fabric',
      'wearing black crotchless lace panties and cupless bra, nipples and pussy fully exposed',
      'wearing see-through mesh lingerie set, nipples clearly visible, pussy outline visible',
      'wearing string thong riding up between ass cheeks, bra pushed down showing nipples',
      'wearing sexy corset crushing waist, breasts overflowing on top, nipples peeking out',
      'wearing open-crotch bodysuit, pussy fully exposed, breasts barely covered',
      'wearing slutty red lingerie, bra too small for big tits, thong disappearing between legs',
      
      // === NUISETTES TRANSPARENTES ===
      'wearing completely transparent babydoll nightgown, nipples and pussy clearly visible through fabric',
      'wearing sheer silk slip riding up to waist, no panties underneath, ass exposed',
      'wearing see-through negligee open at front, full frontal exposure, nothing hidden',
      'wearing micro negligee barely covering nipples, pussy fully visible when standing',
      'wearing transparent chemise, body completely visible, nipples erect through fabric',
      
      // === TOPLESS EXPLICITE ===
      'topless, big bare breasts with erect nipples fully exposed, wearing only tiny g-string',
      'topless with open unbuttoned shirt, full breasts and hard nipples on display',
      'topless, breasts bouncing freely, wearing only stockings and heels',
      'topless and sweaty, breasts glistening, only panties pulled to the side',
      'topless squeezing breasts together, nipples pointing forward, very erotic',
      
      // === ENTIÈREMENT NUE ===
      'completely nude and exposed, full frontal showing breasts, nipples, and shaved pussy',
      'fully naked with legs spread, pussy lips visible, breasts heaving',
      'totally nude lying down, legs open, everything exposed and inviting',
      'naked except for high heels, standing with legs apart showing everything',
      'nude and wet from shower, water dripping down breasts and between legs',
      'completely naked on all fours, ass up, pussy and ass exposed from behind',
      'nude with body oil glistening on skin, breasts shiny, thighs parted',
      
      // === TENUES TRÈS COURTES ===
      'wearing micro mini-skirt so short pussy is visible, no panties, bending over',
      'wearing tight crop top with no bra, nipples poking through, tiny shorts riding up',
      'wearing slutty schoolgirl outfit, skirt flipped up showing bare ass and pussy',
      'wearing tiny bikini top struggling to contain breasts, string bottom barely covering',
      'wearing wet white t-shirt clinging to body, nipples clearly visible, no bra',
      
      // === BONDAGE LÉGER ===
      'wearing only leather harness around body, breasts and pussy framed by straps',
      'wearing collar and chain, otherwise completely nude and submissive',
      'wearing rope bondage on breasts making them bulge, nipples hard',
      
      // === COSTUMES SEXY ===
      'wearing slutty nurse outfit, breasts spilling out, skirt too short',
      'wearing sexy maid costume, bending over showing no panties underneath',
      'wearing naughty secretary outfit, blouse open showing bra, skirt hiked up',
    ];
    
    // v5.4.3 - POSITIONS NSFW ULTRA-EXPLICITES ET SUGGESTIVES
    this.nsfwPoses = [
      // === ALLONGÉE - TRÈS EXPLICITE ===
      'lying on back with legs spread wide open, pussy fully exposed and inviting, breasts heaving',
      'lying on bed legs up in the air spread in V shape, pussy and ass exposed, hands on inner thighs',
      'sprawled on silk sheets, one hand between spread legs touching pussy, moaning expression',
      'lying on side showing curves, one leg raised high, pussy peeking between thighs',
      'lying on back arching spine, breasts thrust upward, legs spread waiting',
      
      // === À GENOUX - SOUMISE ===
      'kneeling submissively, looking up with mouth slightly open, breasts pushed forward',
      'on knees with legs spread, hands behind head, presenting body obediently',
      'kneeling bent forward, ass raised high, pussy visible from behind, face on pillow',
      'kneeling upright, hands cupping and squeezing own breasts, pinching nipples',
      'on knees begging pose, breasts dangling, looking up with lustful eyes',
      
      // === À QUATRE PATTES - PROVOCANTE ===
      'on all fours with back arched deeply, ass raised high presenting pussy and ass',
      'doggy style position, face down ass up, looking back over shoulder seductively',
      'crawling forward on bed, breasts swinging, predatory hungry look, ass up',
      'on hands and knees, spreading ass cheeks with hands, fully exposed from behind',
      'on all fours, one hand reaching back between legs touching pussy',
      
      // === PENCHÉE EN AVANT ===
      'bending over deeply, breasts hanging and swinging, ass pushed out invitingly',
      'bent over table, skirt flipped up, bare ass and pussy on display',
      'leaning forward with hands on knees, massive cleavage on display, licking lips',
      'bending at waist touching toes, ass and pussy visible from behind',
      
      // === MAINS SUR LE CORPS ===
      'hands squeezing and pressing breasts together, tongue licking own nipple',
      'one hand groping breast while other hand slides between parted thighs',
      'pinching own nipples hard, mouth open in pleasure, eyes closed',
      'hands sliding down body toward pussy, teasing self-touch',
      'cupping breasts, pushing them up, nipples between fingers',
      
      // === DEBOUT SEXY ===
      'standing with one leg raised on chair, pussy exposed, confident dominant pose',
      'standing against wall with back arched, ass pushed out, looking over shoulder',
      'standing legs wide apart, hands on hips, fully nude and confident',
      'leaning against doorframe, one hand between legs, inviting look',
      
      // === POSITIONS TRÈS EXPLICITES ===
      'sitting with legs spread extremely wide, leaning back, pussy fully open and exposed',
      'straddling chair backwards, ass prominent, looking back over shoulder licking lips',
      'lying with legs pulled back to chest, pussy and ass completely exposed and open',
      'squatting with legs spread, pussy at eye level, balancing on heels',
      'missionary position ready, legs spread wide in the air, waiting to be taken',
      'riding position, as if on top, bouncing motion, breasts jiggling',
      
      // === AUTO-PLAISIR ===
      'fingers spreading pussy lips apart, showing pink inside, aroused expression',
      'masturbating with fingers inside, eyes closed in ecstasy, free hand on breast',
      'rubbing clit with one hand, squeezing breast with other, orgasmic face',
      'inserting fingers, back arched in pleasure, mouth open moaning',
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
      // === NIVEAU 2 - PROVOCANT v5.4.14 (inspiré Evie, Mira, Nora, Lucy) ===
      2: [
        // === ROBES SENSUELLES (style Lucy/Mira) ===
        'wearing tight red velvet mini dress with corset top, cleavage visible, elegant sexy',
        'wearing sequin mini dress with deep V neckline, sparkly club outfit, curves emphasized',
        'wearing black satin slip dress clinging to body, thin straps, no bra visible',
        'wearing burgundy bodycon dress with cutouts, showing sides, sophisticated',
        'wearing sheer evening gown with strategic coverage, glamorous, silhouette visible',
        // === NUISETTES (style Evie) ===
        'wearing silky black short nightgown, lace trim, barely covering thighs',
        'wearing satin chemise nightdress, thin straps, cleavage showing',
        'wearing silk robe loosely tied, lingerie visible underneath, teasing',
        // === TENUES MOULANTES (style Nora) ===
        'wearing tight black catsuit with zipper front, curves emphasized, sleek',
        'wearing leather leggings with sheer top, edgy sexy style',
        'wearing wet-look leggings with crop top, shiny and tight, modern',
        'wearing thigh-high boots with mini skirt, powerful dominatrix vibe',
        // === COLLANTS ET BAS ===
        'wearing sheer black stockings with garter belt, high heels, short skirt showing tops',
        'wearing fishnet stockings with suspenders visible under mini dress',
        'wearing thigh-high black boots with mini dress, showing leg skin between',
        // === TRANSPARENCES ===
        'wearing mesh top over black bra, skin visible through fabric, daring',
        'wearing semi-transparent black blouse, bra silhouette visible',
        'wearing backless mini dress, spine and lower back exposed, no underwear lines',
        'wearing side-boob revealing halter top, daring fashion, confident',
      ],
      // === NIVEAU 3 - LINGERIE v5.4.14 (inspiré Evie, Mira, Nora, Lucy) ===
      3: [
        // === STYLE EVIE - Dentelle noire élégante ===
        'wearing black lace bodysuit with open back, sheer panels showing skin, sexy lingerie',
        'wearing black lace corset with matching thong, silk ribbon details, boudoir style',
        'wearing black sheer lace teddy, back exposed, cleavage visible, elegant sensual',
        'wearing black satin and lace chemise, thin straps, barely covering thighs',
        // === STYLE MIRA - Nuisettes et robes de chambre ===
        'wearing black deep V bodysuit with silk robe open, bathroom mirror setting',
        'wearing black satin robe loosely open over matching lingerie, teasing',
        'wearing sheer black negligee, body silhouette visible, silk fabric flowing',
        'wearing sequin mini dress with deep plunging neckline, club ready',
        // === STYLE NORA - Body fitness et sheer ===
        'wearing black mesh bodysuit, see-through panels, athletic sensual',
        'wearing black sheer top over black bra, sporty chic lingerie',
        'wearing high-cut black bodysuit with sheer mesh sides, fitness model',
        'wearing black one-piece with cutouts, showing stomach and sides',
        // === STYLE LUCY - Velours et corsets ===
        'wearing red velvet corset dress, deep cleavage, tight fit, elegant',
        'wearing burgundy satin corset with push-up, matching panties',
        'wearing red lace bodysuit, romantic fireplace setting',
        'wearing wine red silk slip dress, thin straps, short length',
        // Lingerie classique améliorée
        'wearing matching black lace bra and panties set, garter belt, stockings',
        'wearing white bridal lingerie set, innocent yet sexy, lace details',
        'wearing push-up bra with thong, cleavage emphasized, confident pose',
        'wearing silk camisole with lace trim, matching panties, elegant bedroom',
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
      // === NIVEAU 2 - POSES SEXY v5.4.14 (inspiré Evie, Mira, Nora, Lucy) ===
      2: [
        // === POSES STYLE EVIE (lit, détendue) ===
        'lying on silk bed sheets, propped on elbow, looking over shoulder, bedroom eyes',
        'sitting on bed with legs tucked, adjusting dress strap, teasing expression',
        'lying on stomach on bed, feet up playfully, looking at camera, silk sheets visible',
        // === POSES STYLE MIRA (club, suggestive) ===
        'reclining on velvet couch, head tilted back, suggestive pose, neon mood lighting',
        'leaning back on sofa, sucking lollipop suggestively, deep cleavage showing',
        'standing by bathroom mirror, adjusting robe, looking at reflection seductively',
        // === POSES STYLE NORA (athlétique, confiante) ===
        'kneeling on floor, leaning forward on silver ball, athletic sensual, smiling',
        'sitting with one knee up, confident pose, showing leg, dark moody background',
        'standing against wall, one hand behind head, stretching sensually',
        // === POSES STYLE LUCY (élégante, confiante) ===
        'standing by fireplace, hands on hips, confident elegant pose, warm lighting',
        'leaning against doorframe, dress hugging curves, mysterious seductive',
        'walking towards camera, hips swaying, confident strut, corset top',
        // Poses classiques améliorées
        'undressing slowly, dress sliding off shoulder, teasing expression',
        'in silk robe loosely tied, hint of lingerie underneath, bathroom setting',
        'sitting on bed edge, legs apart slightly, looking up, inviting',
        'bending over slightly, cleavage visible, playful look back',
      ],
      // === NIVEAU 3 - POSES LINGERIE v5.4.14 (inspiré Evie, Mira, Nora, Lucy) ===
      3: [
        // === POSES STYLE EVIE (allongée, lit en soie) ===
        'lying on silk sheets on stomach, looking over shoulder, black lace bodysuit, back exposed',
        'sitting on bed with legs tucked, wearing black corset, adjusting strap, seductive smile',
        'lying on side on satin sheets, black lace lingerie, curves emphasized, warm lighting',
        'propped on elbow on bed, wearing sheer teddy, inviting expression, soft bedroom glow',
        // === POSES STYLE MIRA (debout, robe de chambre) ===
        'standing by bathroom counter, silk robe open over black bodysuit, mirror reflection',
        'leaning against vanity, black bodysuit with deep V, fixing hair, seductive glance',
        'walking out of bathroom, robe sliding off shoulder, lingerie visible underneath',
        // === POSES STYLE NORA (athlétique, body noir) ===
        'kneeling confidently, wearing black mesh bodysuit, hands on thighs, dark setting',
        'on all fours on bed, black sheer lingerie, looking up seductively, athletic pose',
        'sitting with one knee up, black body, showing off long legs, moody lighting',
        // === POSES STYLE LUCY (corset, élégante) ===
        'standing confidently in red corset, hands on hips, fireplace glowing behind',
        'sitting on edge of bed, red lingerie set, legs crossed elegantly, warm light',
        // Poses lingerie classiques améliorées
        'posing in black lace corset and stockings, garter belt visible, boudoir setting',
        'removing stockings slowly, in matching bra and panties, bedroom eyes',
        'lying back on silk sheets, lingerie set, one leg raised, inviting pose',
        'bending forward in push-up bra, cleavage prominent, teasing expression',
      ],
      // === NIVEAU 4 - POSES TOPLESS (seins nus) ===
      4: [
        'topless, covering breasts with arms, teasing shy pose',
        'bare breasted, hands on hips, confident topless pose',
        'lying topless on bed, one arm across chest, sensual',
        'kneeling topless, breasts fully visible, hands on thighs',
        'standing topless by window, natural light on breasts',
        'topless from behind, looking over shoulder, back visible',
        'removing bra, breasts being revealed, sexy striptease',
        'topless lying on stomach, side of breast visible',
        'sitting topless on bed, knees up, casual topless',
        'topless stretching, breasts lifted, morning pose',
        'in only panties, topless, playing with hair',
        'topless leaning forward, breasts swinging, seductive',
      ],
      // === NIVEAU 5 - POSES NUE ARTISTIQUE (complètement nue) ===
      5: [
        'fully nude standing, hands at sides, confident nude',
        'naked lying on silk sheets, elegant artistic pose',
        'nude kneeling, back arched, breasts prominent',
        'completely naked on all fours, looking back seductively',
        'nude lying on back, one knee up, relaxed',
        'standing nude in profile, curves silhouetted',
        'naked sitting cross-legged, natural casual nude',
        'nude bent over, rear view, spine curved',
        'lying nude on fur rug, glamour pose',
        'naked in bathtub, water barely covering',
        'nude stretching on bed, full body visible',
        'standing naked against wall, frontal view',
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
    // v5.3.63 - Ajout des termes français
    if (bodyType.includes('bbw') || bodyType.includes('chubby') || bodyType.includes('plump') ||
        bodyType.includes('generous') || bodyType.includes('généreus') ||
        bodyType.includes('voluptuous') || bodyType.includes('voluptue') ||
        bodyType.includes('pulpeu') || bodyType.includes('plantureu') ||
        bodyType.includes('curvy') || bodyType.includes('thick') || bodyType.includes('maternal') || 
        bodyType.includes('round') || bodyType.includes('ronde') || bodyType.includes('enrobé') || bodyType.includes('potelé')) {
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
    
    // === v5.3.65 - Poitrine - Exclusions PRÉCISES ===
    if (character.gender === 'female') {
      const bustSize = (physicalDetails.bust.size || character.bust || '').toLowerCase();
      // Petite poitrine (A-B) -> exclure gros seins
      if (bustSize.includes('a') || bustSize.includes('b') || bustSize === 'small' || bustSize === 'petite') {
        negative += ', big breasts, large breasts, huge breasts, busty, big chest, large bust, massive breasts, heavy breasts, giant breasts';
        console.log('🚫 Exclusion: gros seins (poitrine petite)');
      }
      // Grosse poitrine (D+) -> exclure petits seins
      else if (bustSize.includes('d') || bustSize.includes('e') || bustSize.includes('f') || 
               bustSize.includes('g') || bustSize.includes('h') || bustSize.includes('i') ||
               bustSize === 'large' || bustSize === 'huge' || bustSize === 'big') {
        negative += ', flat chest, small breasts, tiny breasts, flat breasted, no breasts, petite bust, modest bust, small chest';
        console.log('🚫 Exclusion: petits seins (grosse poitrine)');
      }
      // Énorme poitrine (F+) -> renforcer l'exclusion
      if (bustSize.includes('f') || bustSize.includes('g') || bustSize.includes('h') || bustSize.includes('i') ||
          bustSize === 'huge' || bustSize === 'massive' || bustSize === 'gigantic') {
        negative += ', medium breasts, average breasts, normal breasts';
        console.log('🚫 Exclusion: seins moyens (poitrine énorme)');
      }
    }
    
    return negative;
  }

  /**
   * v5.3.75 - Retourne une emphase TRIPLE pour la taille de bonnet
   * Répétition maximale pour forcer le modèle à respecter la taille
   */
  /**
   * v5.4.0 - Emphase ULTRA-MARQUÉE pour la poitrine
   * Descriptions visuellement TRÈS FORTES pour que la taille soit ÉVIDENTE
   */
  getBustEmphasis(bustSize) {
    if (!bustSize) return '';
    const size = bustSize.toUpperCase().trim();
    
    // v5.4.0 - Descriptions ULTRA-MARQUÉES avec emphase visuelle MAXIMALE
    const emphasisMap = {
      'A': 'VERY SMALL A-CUP breasts, nearly FLAT CHEST, very petite tiny bust, small pointed nipples, barely any cleavage, flat-chested slim appearance',
      'B': 'SMALL B-CUP breasts, MODEST PETITE bust, small perky round breasts, subtle cleavage, youthful small chest',
      'C': 'MEDIUM C-CUP breasts, AVERAGE bust, natural round breasts, nice visible cleavage, proportionate chest',
      'D': 'LARGE D-CUP BREASTS that are VISIBLY BIG, FULL ROUND HEAVY BREASTS clearly visible, PROMINENT cleavage, big bouncy bust, OBVIOUSLY LARGE CHEST, breasts that STAND OUT',
      'DD': 'VERY LARGE DD-CUP BREASTS that are EXTREMELY NOTICEABLE, BIG HEAVY BOUNCY ROUND BREASTS dominating the chest, DEEP PROMINENT CLEAVAGE impossible to miss, voluptuous HUGE bust, VERY OBVIOUSLY LARGE heavy boobs, breasts that DEMAND ATTENTION',
      'E': 'HUGE E-CUP BREASTS that DOMINATE the figure, VERY BIG HEAVY BOUNCY ROUND BREASTS impossible to ignore, MASSIVE DEEP CLEAVAGE, extremely busty woman with BREASTS THAT STAND OUT, HUGE heavy boobs that are THE FOCUS of attention, overflowing jiggly bouncy breasts',
      'F': 'ENORMOUS F-CUP BREASTS that are THE DOMINANT feature, HUGE HEAVY ROUND BREASTS that cannot be missed, GIGANTIC DEEP CLEAVAGE, extremely busty with BREASTS LARGER THAN HER HEAD, MASSIVE heavy boobs that OVERFLOW any clothing, breast-heavy figure where BOOBS ARE THE MAIN FOCUS',
      'G': 'GIGANTIC G-CUP BREASTS that are ABSURDLY LARGE, EXTREMELY LARGE HEAVY ROUND BREASTS that DOMINATE her entire torso, MASSIVE ENORMOUS BUST impossible to hide, GIANT heavy boobs BIGGER THAN MELONS, colossal bouncy breasts that BOUNCE WITH EVERY MOVEMENT',
      'H': 'MASSIVE H-CUP BREASTS that are IMPOSSIBLY HUGE, COLOSSAL HEAVY ROUND BREASTS each BIGGER THAN HER HEAD, GIANT ENORMOUS BUST that WEIGHS HER DOWN, impossibly large heavy boobs that HANG HEAVILY, MASSIVE chest that IS HER DEFINING FEATURE',
      'I': 'COLOSSAL I-CUP BREASTS that are CARTOONISHLY LARGE, IMPOSSIBLY HUGE HEAVY ROUND BREASTS that DEFY GRAVITY, GIGANTIC ENORMOUS BUST that DOMINATES HER ENTIRE BODY, I cup COLOSSAL chest that CANNOT BE CONTAINED, extremely massive oversized boobs BIGGER THAN BASKETBALLS'
    };
    
    return emphasisMap[size] || '';
  }
  
  /**
   * v5.4.0 - Retourne un prompt ULTRA-PRIORITAIRE pour la poitrine
   * Avec emphase visuelle EXTRÊME pour que la taille soit VRAIMENT VISIBLE
   * RÉALISTE: Les grandes poitrines doivent être CLAIREMENT VISIBLES!
   */
  getBustUltraPriority(bustSize, gender) {
    if (!bustSize || gender !== 'female') return '';
    const size = bustSize.toUpperCase().trim();
    
    // v5.4.0 - Mapping ULTRA-VISIBLE avec emphase visuelle EXTRÊME
    const bustPrompts = {
      'A': 'A-CUP BREASTS, small flat chest, petite bust, tiny breasts, nearly flat',
      'B': 'B-CUP BREASTS, small perky breasts, modest bust, small chest',
      'C': 'C-CUP BREASTS, medium round breasts, average bust, visible cleavage',
      'D': '((D-CUP LARGE BREASTS)), ((BIG VISIBLE BUST)), full round chest clearly visible, big boobs that STAND OUT, heavy breasts with OBVIOUS cleavage',
      'DD': '(((DD-CUP VERY LARGE BREASTS))), (((BIG HEAVY VISIBLE BUST))), (((PROMINENT DEEP CLEAVAGE))), DD cup big heavy boobs that DOMINATE the view, large bouncy round breasts CLEARLY VISIBLE, extremely busty with OBVIOUS LARGE CHEST',
      'E': '(((E-CUP HUGE BREASTS))), (((VERY BIG HEAVY DOMINANT BUST))), (((MASSIVE VISIBLE CLEAVAGE))), E cup HUGE heavy boobs that are THE FOCUS, very large bouncy round breasts IMPOSSIBLE TO MISS, breasts LARGER THAN NORMAL that DEMAND ATTENTION',
      'F': '(((F-CUP ENORMOUS BREASTS))), (((HUGE HEAVY DOMINANT BUST))), (((GIGANTIC VISIBLE CLEAVAGE))), F cup ENORMOUS heavy boobs DOMINATING the figure, extremely large bouncy round breasts BIGGER THAN HER HEAD, breast-dominant figure where BOOBS ARE THE MAIN FEATURE',
      'G': '(((G-CUP GIGANTIC BREASTS))), (((MASSIVE HEAVY DOMINANT BUST))), G cup GIANT heavy boobs EACH BIGGER THAN A MELON, colossal bouncy round breasts that OVERWHELM her torso, extremely oversized bust IMPOSSIBLE TO IGNORE',
      'H': '(((H-CUP MASSIVE BREASTS))), (((COLOSSAL HEAVY BUST))), H cup MASSIVE heavy boobs EACH BIGGER THAN HER HEAD, impossibly large round breasts that HANG HEAVILY, enormous bust that DEFINES HER SILHOUETTE',
      'I': '(((I-CUP COLOSSAL BREASTS))), (((GIGANTIC HEAVY BUST))), I cup COLOSSAL heavy boobs BIGGER THAN BASKETBALLS, extremely massive round breasts that DOMINATE HER ENTIRE BODY, impossibly huge bust'
    };
    
    return bustPrompts[size] || '';
  }
  
  /**
   * v5.4.0 - Prompt de renforcement FINAL pour la poitrine
   * Utilisé à la FIN du prompt pour emphase maximale (les IA favorisent la fin)
   */
  getBustFinalReinforcement(bustSize, gender) {
    if (!bustSize || gender !== 'female') return '';
    const size = bustSize.toUpperCase().trim();
    
    // Pour les grandes tailles, ajouter un renforcement final
    const reinforcement = {
      'A': '',
      'B': '',
      'C': '',
      'D': 'IMPORTANT: breasts are LARGE and VISIBLE, D-cup size',
      'DD': 'CRITICAL: breasts are VERY LARGE DD-cup, OBVIOUSLY BIG, DOMINANT FEATURE',
      'E': 'CRITICAL: breasts are HUGE E-cup, EXTREMELY LARGE, IMPOSSIBLE TO MISS, DOMINATING THE IMAGE',
      'F': 'CRITICAL: breasts are ENORMOUS F-cup, MASSIVE HEAVY, BIGGER THAN HER HEAD, THE MAIN FOCUS',
      'G': 'CRITICAL: breasts are GIGANTIC G-cup, ABSURDLY LARGE, EACH BIGGER THAN A MELON, OVERWHELMING',
      'H': 'CRITICAL: breasts are MASSIVE H-cup, IMPOSSIBLY HUGE, HANGING HEAVILY, DEFINING HER FIGURE',
      'I': 'CRITICAL: breasts are COLOSSAL I-cup, CARTOONISHLY LARGE, BIGGER THAN BASKETBALLS, DOMINATING EVERYTHING',
    };
    
    return reinforcement[size] || '';
  }

  /**
   * Extrait une version courte du body type pour le renforcement
   */
  getShortBodyType(bodyType) {
    if (!bodyType) return '';
    const lower = bodyType.toLowerCase();
    // === v5.3.66 - Renvoie description COURTE avec info ventre ===
    // TRÈS RONDE = GROS ventre
    if (lower.includes('bbw') || lower.includes('très rond') || lower.includes('very fat') || lower.includes('big belly') || lower.includes('huge belly')) {
      return 'BBW fat, BIG BELLY visible';
    }
    // RONDE = LÉGER ventre
    if (lower.includes('chubby') || lower.includes('plump') || lower.includes('ronde') || lower.includes('potelé') || 
        lower.includes('enrobé') || lower.includes('small belly') || lower.includes('soft belly')) {
      return 'plump soft, small belly';
    }
    // VOLUPTUEUSE/PULPEUSE = SANS ventre
    if (lower.includes('voluptuous') || lower.includes('voluptue') || lower.includes('generous') || lower.includes('généreus') ||
        lower.includes('pulpeu') || lower.includes('plantureu') || lower.includes('buxom') || lower.includes('bombshell')) {
      return 'curvy hourglass, FLAT STOMACH';
    }
    if (lower.includes('curvy') || lower.includes('hourglass') || lower.includes('thick')) {
      return 'curvy, flat stomach';
    }
    // Autres
    if (lower.includes('maternal') || lower.includes('milf')) return 'mature curvy, small belly';
    if (lower.includes('athletic') || lower.includes('toned')) return 'athletic, flat stomach';
    if (lower.includes('slim') || lower.includes('slender') || lower.includes('mince')) return 'slim, flat stomach';
    if (lower.includes('petite')) return 'petite, flat stomach';
    if (lower.includes('massive') || lower.includes('muscular')) return 'muscular, flat stomach';
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
   * v5.4.15 - Détecte si un personnage est un duo/trio (2+ personnes)
   * @param {Object} character - Le personnage
   * @returns {Object} { isDuo: boolean, memberCount: number, members: array }
   */
  isDuoOrTrioCharacter(character) {
    // Vérifier le type threesome
    if (character.type === 'threesome') {
      const memberCount = character.members?.length || 2;
      return { isDuo: true, memberCount, members: character.members || [] };
    }
    
    // Vérifier le genre duo/couple
    const gender = (character.gender || '').toLowerCase();
    if (gender.includes('duo') || gender === 'couple') {
      const memberCount = character.members?.length || 2;
      return { isDuo: true, memberCount, members: character.members || [] };
    }
    
    // Vérifier le nom contient "&" ou "et" (indiquant deux personnes)
    const name = character.name || '';
    if (name.includes(' & ') || name.includes(' et ')) {
      const memberCount = character.members?.length || 2;
      return { isDuo: true, memberCount, members: character.members || [] };
    }
    
    // Vérifier les tags
    const tags = character.tags || [];
    if (tags.includes('duo') || tags.includes('couple') || tags.includes('plan à trois') || tags.includes('trio')) {
      const memberCount = character.members?.length || 2;
      return { isDuo: true, memberCount, members: character.members || [] };
    }
    
    return { isDuo: false, memberCount: 1, members: [] };
  }
  
  /**
   * v5.4.15 - Construit un prompt pour les personnages duo/trio
   * @param {Object} character - Le personnage duo
   * @param {number} level - Niveau de relation
   * @param {boolean} isRealistic - Style réaliste ou anime
   * @returns {string} Prompt adapté pour duo
   */
  buildDuoPrompt(character, level, isRealistic) {
    const duoInfo = this.isDuoOrTrioCharacter(character);
    if (!duoInfo.isDuo) return '';
    
    const members = duoInfo.members;
    const isNSFW = level >= 2;
    
    let prompt = 'TWO DISTINCT PEOPLE shown together, both fully visible, ';
    
    // Utiliser l'imagePrompt du personnage comme base (contient la description des 2 personnes)
    if (character.imagePrompt) {
      prompt += character.imagePrompt + ', ';
    } else {
      // Fallback: construire à partir des membres
      if (members.length >= 2) {
        const m1 = members[0];
        const m2 = members[1];
        
        if (character.gender === 'duo_female') {
          prompt += `two beautiful women together, ${m1.name || 'first woman'} with ${m1.hairColor || 'dark'} hair ${m1.bust || ''} bust, ${m2.name || 'second woman'} with ${m2.hairColor || 'light'} hair ${m2.bust || ''} bust, `;
        } else if (character.gender === 'duo_male') {
          prompt += `two handsome men together, ${m1.name || 'first man'} ${m1.hairColor || ''} ${m1.penis || ''}, ${m2.name || 'second man'} ${m2.hairColor || ''} ${m2.penis || ''}, `;
        } else if (character.gender === 'couple') {
          prompt += `couple together, man and woman, ${m1.hairColor || ''} ${m1.penis || m1.bust || ''}, ${m2.hairColor || ''} ${m2.bust || m2.penis || ''}, `;
        }
      }
    }
    
    // Ajouter les descriptions physiques
    if (character.appearance) {
      prompt += character.appearance + ', ';
    }
    if (character.physicalDescription) {
      prompt += character.physicalDescription + ', ';
    }
    
    // v5.4.16 - TENUES NSFW ULTRA-DÉTAILLÉES POUR DUOS
    if (isNSFW) {
      const duoOutfits = {
        2: [ // Provocant - Sexy mais habillé
          'both wearing matching black lace lingerie sets, push-up bras showing cleavage, thong panties, garter belts with stockings',
          'both in tight mini dresses showing curves, deep cleavage visible, short skirts revealing thighs',
          'both wearing sheer negligees, see-through fabric showing bodies underneath, silk and lace',
          'matching red satin corsets pushing up breasts, tiny panties, high heels',
          'both in sexy clubwear, crop tops showing midriffs, tight shorts, curves emphasized',
          'matching leather lingerie, strappy details, dominant sexy look',
          'both wearing open silk robes over lace bras and panties, curves visible',
          'sexy secretary outfits, tight blouses unbuttoned showing bras, mini skirts',
        ],
        3: [ // Lingerie explicite
          'both in black lace bodysuits, sheer panels showing skin, nipples visible through fabric',
          'matching crotchless panties and cupless bras, breasts and intimate areas exposed',
          'both wearing only garter belts, stockings and high heels, breasts fully exposed',
          'sheer mesh bodysuits completely see-through, nipples and bodies visible',
          'both in open-cup corsets, breasts pushed up and fully exposed, tiny thongs',
          'matching fishnet bodystockings, everything visible through mesh',
          'both topless wearing only thong panties and heels, breasts exposed',
          'lace garters and stockings only, both bare-breasted, seductive',
        ],
        4: [ // Topless - Seins nus
          'both completely topless, ((large breasts exposed)), ((visible nipples)), only tiny panties',
          'both bare-chested showing ((full breasts with nipples)), wearing only thongs',
          'topless embrace, ((breasts pressed together)), ((nipples touching)), intimate',
          'both nude from waist up, ((beautiful exposed breasts)), hands caressing each other',
          'topless on silk sheets, ((breasts fully visible)), ((erect nipples)), sensual pose',
          'both with ((exposed breasts)), ((pink nipples visible)), only stockings remaining',
          'bare breasted beauties, ((large natural breasts)), ((prominent nipples)), passionate',
          'topless lovers, ((breasts exposed)), ((nipples erect)), bodies intertwined',
        ],
        5: [ // Complètement nu
          'both ((completely nude)), ((full frontal)), ((breasts and intimate areas visible)), passionate embrace',
          'both ((fully naked)), ((exposed bodies)), ((visible nipples)), ((smooth skin)), intimate lovers',
          '((nude bodies)) intertwined, ((breasts pressed together)), ((skin on skin)), passionate',
          'both ((naked in bed)), ((exposed breasts)), ((nude bodies)), sheets barely covering',
          '((completely undressed)), ((full nudity)), ((beautiful naked bodies)), intimate moment',
          'both ((bare naked)), ((exposed from head to toe)), ((breasts and curves visible)), sensual',
          '((nude embrace)), ((naked lovers)), ((breasts touching)), ((bodies pressed together))',
          '((fully exposed bodies)), ((complete nudity)), ((natural beauty)), passionate love scene',
        ],
      };
      
      const levelOutfits = duoOutfits[Math.min(level, 5)] || duoOutfits[2];
      const selectedOutfit = levelOutfits[Math.floor(Math.random() * levelOutfits.length)];
      prompt += selectedOutfit + ', ';
      
      // v5.4.16 - POSES NSFW ULTRA-DÉTAILLÉES POUR DUOS
      const duoPoses = {
        2: [ // Sexy provocant
          'bodies close together, hands on each others hips, seductive eye contact',
          'one behind the other, hands on waist, sensual pose',
          'sitting on bed together, legs intertwined, flirtatious',
          'standing face to face, almost kissing, hands exploring',
          'one kneeling, other standing, suggestive pose',
          'both leaning forward showing cleavage, inviting look',
        ],
        3: [ // Lingerie intime
          'lying on bed together, bodies intertwined, intimate caress',
          'one on top of the other, sensual embrace',
          'spooning position, hands wandering, intimate',
          'face to face on silk sheets, legs wrapped together',
          'kneeling facing each other, hands on breasts',
          'both on all fours side by side, looking back seductively',
        ],
        4: [ // Topless passionné
          'topless embrace, ((breasts pressed together)), passionate kiss',
          'one sucking others nipple, ((intimate breast play))',
          'hands cupping each others ((exposed breasts)), sensual',
          'lying together topless, ((nipples touching)), intimate',
          'one massaging others ((bare breasts)), erotic',
          'face between breasts, ((motorboating)), playful sensual',
        ],
        5: [ // Nu explicite
          '((nude bodies)) intertwined in bed, ((passionate love making))',
          '((naked)) 69 position, ((intimate oral))',
          'one on top ((riding)), ((nude lovers)), passionate',
          '((naked spooning)), ((intimate from behind))',
          '((nude)) scissoring position, ((bodies pressed together))',
          'both ((naked)) in shower, ((wet bodies)), sensual',
        ],
      };
      const levelPoses = duoPoses[Math.min(level, 5)] || duoPoses[2];
      const selectedPose = levelPoses[Math.floor(Math.random() * levelPoses.length)];
      prompt += selectedPose + ', ';
    } else {
      // SFW duo
      prompt += 'both dressed elegantly, friendly pose together, ';
    }
    
    // v5.4.16 - LOCALISATIONS NSFW DÉTAILLÉES
    const duoLocations = isNSFW ? [
      'luxury bedroom with silk sheets, romantic candles, warm lighting',
      'five star hotel suite, king size bed, elegant decor',
      'intimate boudoir, velvet curtains, soft mood lighting',
      'penthouse bedroom, city lights through window, romantic atmosphere',
      'private spa, steam room, wet sensual setting',
      'romantic cabin, fireplace glow, fur rug',
      'yacht master bedroom, ocean view, luxury setting',
      'honeymoon suite, rose petals on bed, champagne',
      'private pool area, lounge chairs, tropical night',
      'mirror room, multiple reflections, erotic setting',
    ] : [
      'elegant living room, sophisticated decor',
      'beautiful outdoor garden, natural lighting',
      'modern stylish interior, clean aesthetic',
    ];
    prompt += duoLocations[Math.floor(Math.random() * duoLocations.length)] + ', ';
    
    // v5.4.16 - AMBIANCE ET ÉCLAIRAGE NSFW
    if (isNSFW) {
      const duoMoods = [
        'soft romantic lighting, warm golden glow, intimate atmosphere',
        'candlelight ambiance, shadows and highlights on bodies',
        'neon mood lighting, pink and purple tones, sensual',
        'natural sunlight through curtains, morning after feel',
        'dramatic lighting, artistic shadows, erotic mood',
        'soft focus background, sharp focus on bodies, professional',
      ];
      prompt += duoMoods[Math.floor(Math.random() * duoMoods.length)] + ', ';
      
      // Expressions sensuelles
      const duoExpressions = [
        'both with seductive expressions, bedroom eyes, parted lips',
        'passionate looks, desire in eyes, sensual smiles',
        'lustful gazes, biting lip, aroused expressions',
        'intimate eye contact, loving sensual expressions',
        'ecstatic expressions, pleasure visible, passionate',
      ];
      prompt += duoExpressions[Math.floor(Math.random() * duoExpressions.length)] + ', ';
    }
    
    // v5.4.16 - QUALITÉ ET ANATOMIE PARFAITE
    prompt += this.anatomyDuoPrompt + ', ';
    
    // Style et qualité finale
    if (isRealistic) {
      prompt += 'ultra realistic photograph, 8K resolution, professional erotic photography, ';
      prompt += 'perfect skin texture, detailed pores, realistic lighting, ';
      prompt += 'sharp focus on both subjects, bokeh background, magazine quality, ';
      prompt += 'two distinct people clearly visible, NOT merged, both faces detailed';
    } else {
      prompt += 'masterpiece anime art, best quality ecchi illustration, highly detailed, ';
      prompt += 'beautiful anime style, vibrant colors, clean lines, ';
      prompt += 'both characters distinct, detailed faces, expressive eyes';
    }
    
    return prompt;
  }

  /**
   * Choisit un style aléatoire (anime ou réaliste)
   * @returns {Object} { style: string, isRealistic: boolean }
   */
  getRandomStyle() {
    // v5.4.22 - 75% réaliste, 25% anime (plus d'images réalistes demandées)
    const isRealistic = Math.random() < 0.75;
    
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
   * v5.4.0 - Option ignoreOutfit pour ne pas utiliser la tenue en NSFW
   * @param {Object} character - Personnage
   * @param {boolean} isRealistic - Style réaliste ou anime
   * @param {boolean} ignoreOutfit - Si true, ignore les infos de tenue (pour NSFW)
   */
  buildUltraDetailedPhysicalPrompt(character, isRealistic = false, ignoreOutfit = false) {
    const parts = [];
    
    // v5.4.0 - En NSFW, ne pas inclure imagePrompt qui contient souvent la tenue
    const appearance = (
      (character.appearance || '') + ' ' + 
      (character.physicalDescription || '') + ' ' +
      (character.bodyType || '') + ' ' +
      (ignoreOutfit ? '' : (character.imagePrompt || '')) // Ignorer imagePrompt en NSFW
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
    
    // === 10. MORPHOLOGIE / BODY TYPE - v5.3.64 PRÉCIS ===
    // VOLUPTUEUSE/PULPEUSE = SANS ventre | RONDE = LÉGER ventre | TRÈS RONDE = GROS ventre
    const bodyTypes = {
      'très mince|very slim|maigre': 'very slim thin body, flat stomach',
      'mince|slim|élancé|slender': 'slim slender body, flat stomach',
      'athlétique|athletic|musclé|toned|fit': 'athletic toned fit body, flat stomach',
      'moyenne|average|normal': 'average balanced body, flat stomach',
      'curvy': 'curvy body, flat stomach, slim waist, wide hips',
      // === VOLUPTUEUSE/PULPEUSE = SANS ventre ===
      'voluptueuse|voluptueux|voluptuous': 'voluptuous curvy hourglass, FLAT STOMACH, slim waist, wide hips, big breasts, NO belly',
      'généreuse|généreux|generous': 'generous curves, FLAT STOMACH, slim waist, curvy hips, NO belly',
      'pulpeuse|pulpeux|thick|épaisse': 'thick curvy body, FLAT STOMACH, slim waist, wide hips, NO belly',
      'plantureuse|plantureux|buxom': 'buxom body, big breasts, FLAT STOMACH, slim waist, wide hips, NO belly',
      // === RONDE = LÉGER ventre ===
      'ronde|plump|chubby|potelé': 'soft plump body, SMALL SOFT BELLY, chubby',
      'enrobée|enrobé': 'plump soft body, SMALL ROUND BELLY',
      // === TRÈS RONDE = GROS ventre ===
      'très ronde|very curvy|bbw': 'BBW very fat body, BIG FAT BELLY, overweight',
      'matern|maternal': 'soft maternal curvy body, small soft belly',
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
    
    // === 12. POITRINE (femmes) - v5.4.2 ULTRA-RENFORCÉE ===
    if (character.gender === 'female') {
      const bust = (character.bust || '').toUpperCase().replace(/[^A-Z]/g, '');
      const bustDescriptions = {
        'A': '((SMALL A-CUP breasts)), nearly flat petite chest, tiny breasts, small nipples',
        'B': '((SMALL B-CUP breasts)), petite modest bust, small perky breasts, subtle cleavage',
        'C': '((MEDIUM C-CUP breasts)), average sized breasts, natural round shape, visible cleavage',
        'D': '(((LARGE D-CUP breasts))), BIG FULL ROUND breasts, VISIBLE CLEAVAGE, heavy bouncy bust',
        'DD': '(((VERY LARGE DD-CUP breasts))), BIG HEAVY breasts, DEEP PROMINENT CLEAVAGE, bouncy jiggly',
        'E': '((((HUGE E-CUP breasts)))), VERY BIG HEAVY breasts, MASSIVE DEEP CLEAVAGE, bouncy jiggling',
        'F': '((((HUGE F-CUP breasts)))), ENORMOUS HEAVY breasts, GIGANTIC DEEP CLEAVAGE, very bouncy',
        'G': '(((((GIGANTIC G-CUP breasts))))), EXTREMELY LARGE HEAVY breasts, MASSIVE cleavage, giant bust',
        'H': '(((((MASSIVE H-CUP breasts))))), IMPOSSIBLY HUGE HEAVY breasts, ENORMOUS cleavage, gigantic',
        'I': '(((((COLOSSAL I-CUP breasts))))), EXTREMELY MASSIVE HEAVY breasts, GIGANTIC bust',
      };
      const letterMatch = bust.match(/([A-I])/);
      const bustKey = letterMatch ? letterMatch[1] : bust;
      if (bustDescriptions[bustKey]) {
        parts.push(bustDescriptions[bustKey]);
        console.log(`👙 POITRINE buildUltra v5.4.2: ${bustKey} -> ${bustDescriptions[bustKey].substring(0, 50)}`);
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
   * VERSION v5.4.2 - NSFW: ignore vêtements, poitrines ULTRA-RENFORCÉES
   * @param {boolean} ignoreOutfit - Si true, n'inclut PAS imagePrompt (mode NSFW)
   */
  extractBodyFeatures(character, ignoreOutfit = false) {
    const features = [];
    
    // v5.4.2 - Combiner les sources SANS imagePrompt en mode NSFW
    // imagePrompt contient souvent la tenue par défaut qu'on veut ignorer en NSFW
    const fullText = (
      (character.appearance || '') + ' ' + 
      (character.bodyType || '') + ' ' + 
      (character.physicalDescription || '') + ' ' +
      (ignoreOutfit ? '' : (character.imagePrompt || '')) + ' ' + // IGNORER en NSFW!
      (character.personality || '') + ' ' +
      (Array.isArray(character.tags) ? character.tags.join(' ') : '')
    ).toLowerCase();
    
    console.log(`🔍 extractBodyFeatures (ignoreOutfit=${ignoreOutfit}) - Texte: ${fullText.substring(0, 200)}...`);
    
    // === v5.4.2 - PRIORITÉ 1: POITRINE EXPLICITE ULTRA-RENFORCÉE ===
    if (character.gender === 'female' && character.bust) {
      const bustSize = character.bust.toUpperCase().trim().replace(/[^A-Z]/g, ''); // Nettoyer
      // v5.4.2 - Descriptions ULTRA-DÉTAILLÉES pour chaque taille
      const bustDescriptions = {
        'A': '((SMALL A-CUP BREASTS)), nearly flat petite chest, tiny small breasts, delicate bust, cute small chest',
        'B': '((SMALL B-CUP BREASTS)), modest petite bust, small perky breasts, delicate cleavage, cute small chest',
        'C': '((MEDIUM C-CUP BREASTS)), average sized breasts, round natural bust, visible cleavage, normal sized chest',
        'D': '(((LARGE D-CUP BREASTS))), big full round breasts, generous impressive bust, DEEP VISIBLE CLEAVAGE, heavy chest, bouncy breasts',
        'DD': '(((VERY LARGE DD-CUP BREASTS))), BIG HEAVY BREASTS, impressive large bust, DEEP PROMINENT CLEAVAGE, bouncy jiggly chest, heavy round breasts',
        'E': '((((HUGE E-CUP BREASTS)))), VERY BIG HEAVY BREASTS, ENORMOUS BUST, MASSIVE DEEP CLEAVAGE, jiggly bouncy chest, extremely large breasts that bounce',
        'F': '((((HUGE F-CUP BREASTS)))), MASSIVE HEAVY BREASTS, GIGANTIC BUST, EXTREMELY DEEP CLEAVAGE, very jiggly bouncy, enormous round breasts',
        'G': '(((((GIGANTIC G-CUP BREASTS))))), ENORMOUS MASSIVE BREASTS, HUGE HEAVY BUST, IMPOSSIBLY DEEP CLEAVAGE, giant bouncy chest, colossal breasts',
        'H': '(((((MASSIVE H-CUP BREASTS))))), EXTREMELY HUGE BREASTS, COLOSSAL BUST, GIANT CHEST, impossibly big heavy breasts, enormous jiggly bouncy bust',
        'I': '(((((COLOSSAL I-CUP BREASTS))))), IMPOSSIBLY HUGE BREASTS, GIGANTIC MASSIVE BUST, absurdly big heavy chest, enormous bouncing breasts'
      };
      if (bustDescriptions[bustSize]) {
        features.push(bustDescriptions[bustSize]);
        console.log('👙 POITRINE ULTRA:', bustSize, '→', bustDescriptions[bustSize].substring(0, 60));
      } else {
        // Fallback: extraire la lettre de la taille
        const letterMatch = bustSize.match(/([A-I])/);
        if (letterMatch && bustDescriptions[letterMatch[1]]) {
          features.push(bustDescriptions[letterMatch[1]]);
          console.log('👙 POITRINE (fallback):', letterMatch[1]);
        }
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
      // v5.4.2 - Poitrine ULTRA-RENFORCÉE (description uniquement, pas de vêtements)
      const bustSize = character.bust || character.bustSize;
      if (bustSize) {
        // v5.4.2 - Descriptions TRÈS MARQUÉES pour emphase maximale
        const bustDescriptions = {
          'A': '((small perky A-cup breasts)), petite flat chest, tiny bust',
          'B': '((petite natural B-cup breasts)), small modest bust, cute chest',
          'C': '((medium beautiful C-cup breasts)), average bust, nice cleavage',
          'D': '(((LARGE generous D-cup breasts))), BIG FULL BUST, VISIBLE CLEAVAGE, heavy bouncy',
          'DD': '(((VERY LARGE DD-cup breasts))), BIG IMPRESSIVE BUST, DEEP CLEAVAGE, bouncy heavy',
          'E': '((((HUGE E-cup breasts)))), MASSIVE BUST, ENORMOUS CLEAVAGE, very heavy jiggly',
          'F': '((((ENORMOUS F-cup breasts)))), GIGANTIC BUST, HUGE DEEP CLEAVAGE, bouncy heavy',
          'G': '(((((MASSIVE G-cup breasts))))), GIANT BUST, ENORMOUS CLEAVAGE, extremely heavy',
          'H': '(((((ENORMOUS MASSIVE H-cup breasts))))), COLOSSAL BUST, GIGANTIC CLEAVAGE',
          'I': '(((((COLOSSAL I-cup breasts))))), IMPOSSIBLY HUGE BUST, GIGANTIC CLEAVAGE'
        };
        
        // Extraire la lettre du bonnet
        let normalizedBust = bustSize.toUpperCase().replace(/[^A-Z]/g, '');
        const letterMatch = normalizedBust.match(/([A-I])/);
        normalizedBust = letterMatch ? letterMatch[1] : normalizedBust;
        
        // Fallback pour descriptions françaises
        if (!bustDescriptions[normalizedBust]) {
          if (bustSize.toLowerCase().includes('petit')) normalizedBust = 'B';
          else if (bustSize.toLowerCase().includes('moyen')) normalizedBust = 'C';
          else if (bustSize.toLowerCase().includes('génér') || bustSize.toLowerCase().includes('voluptu')) normalizedBust = 'D';
          else if (bustSize.toLowerCase().includes('énorme') || bustSize.toLowerCase().includes('gros')) normalizedBust = 'E';
        }
        
        nsfw += `, ${bustDescriptions[normalizedBust] || 'beautiful breasts'}`;
        console.log(`👙 buildNSFWPrompt: ${bustSize} -> ${normalizedBust}`);
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
   * v5.3.76 - Génération image PROFIL avec support NSFW optionnel
   * MORPHOLOGIE et POITRINE EN PREMIER pour emphase maximale
   * @param {Object} character - Personnage à générer
   * @param {Object} userProfile - Profil utilisateur (optionnel)
   * @param {boolean} isNSFW - Mode NSFW pour tenues sexy (optionnel, default false)
   */
  async generateCharacterImage(character, userProfile = null, isNSFW = false) {
    // Parser l'âge correctement (gère "300 ans (apparence 25)")
    const charAge = this.parseCharacterAge(character.age);
    if (charAge < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    console.log(`✨ Génération image PROFIL (SFW) pour ${character.name}`);
    
    // v5.4.15 - DÉTECTER SI C'EST UN DUO/TRIO
    const duoInfo = this.isDuoOrTrioCharacter(character);
    if (duoInfo.isDuo) {
      console.log(`👯 PROFIL DUO DÉTECTÉ: ${character.name} (${duoInfo.memberCount} personnes)`);
      
      // === GÉNÉRATION SPÉCIALE POUR PROFIL DUO ===
      const { style: duoStyle, isRealistic: duoRealistic } = this.getRandomStyle();
      
      // Construire le prompt duo à partir de l'imagePrompt du personnage
      let duoProfilePrompt = 'TWO DISTINCT PEOPLE visible together, both shown full body, ' + duoStyle;
      
      // Utiliser l'imagePrompt original qui décrit les deux personnes
      if (character.imagePrompt) {
        duoProfilePrompt += ', ' + character.imagePrompt;
      } else if (character.appearance) {
        duoProfilePrompt += ', ' + character.appearance;
      } else if (character.physicalDescription) {
        duoProfilePrompt += ', ' + character.physicalDescription;
      }
      
      // Ajouter la description physique détaillée
      if (character.physicalDescription && !duoProfilePrompt.includes(character.physicalDescription)) {
        duoProfilePrompt += ', ' + character.physicalDescription;
      }
      
      // Tenue SFW pour profil
      if (character.outfit) {
        duoProfilePrompt += ', ' + character.outfit;
      } else {
        duoProfilePrompt += ', both elegantly dressed, casual stylish outfits';
      }
      
      // Poses duo SFW
      const duoSfwPoses = [
        'standing together, friendly pose',
        'sitting together, natural pose',
        'close together, smiling at camera',
        'elegant couple pose, confident',
      ];
      duoProfilePrompt += ', ' + duoSfwPoses[Math.floor(Math.random() * duoSfwPoses.length)];
      
      // Anatomie duo
      duoProfilePrompt += ', ' + this.anatomyDuoPrompt;
      
      // Qualité
      if (duoRealistic) {
        duoProfilePrompt += ', professional photography, 8K resolution, two people portrait';
        duoProfilePrompt += ', realistic skin texture, both faces clear and visible';
      } else {
        duoProfilePrompt += ', masterpiece anime art, best quality, two characters illustrated';
        duoProfilePrompt += ', clean lines, vibrant colors, both visible';
      }
      
      console.log(`👯 Génération PROFIL DUO: ${character.name}`);
      console.log(`👯 Prompt DUO: ${duoProfilePrompt.substring(0, 300)}...`);
      // Utiliser la même méthode que les personnages solo
      return await this.generateImage(duoProfilePrompt, character);
    }

    // === SUITE NORMALE POUR PERSONNAGES SOLO ===
    // v5.3.67 - Obtenir le profil physique prioritaire (PERSISTANT)
    const priorityPhysicalPrompt = this.buildPriorityPhysicalPrompt(character);
    
    // Choisir le style (anime ou réaliste)
    const { style, isRealistic } = this.getRandomStyle();
    
    // v5.3.59 - Parser les détails physiques comme v5.3.34
    const physicalDetails = this.parsePhysicalDescription(character);
    
    // v5.3.59 - COMMENCER PAR FULL BODY + STYLE
    let prompt = 'FULL BODY SHOT showing entire character from head to feet, complete figure visible, NOT cropped, ' + style;
    
    // === v5.3.67 - PROFIL PHYSIQUE PRIORITAIRE EN PREMIER (persistant) ===
    if (priorityPhysicalPrompt) {
      prompt += ', ' + priorityPhysicalPrompt;
      console.log('✅ Profil physique prioritaire ajouté (generateCharacterImage)');
    }
    
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
        // === v5.3.65 - TAILLES DE POITRINE RÉALISTES ===
        const bustMap = {
          'A': 'VERY SMALL A-CUP breasts, nearly flat chest, small nipples, barely visible cleavage',
          'B': 'SMALL B-CUP breasts, petite modest bust, small perky breasts, subtle cleavage',
          'C': 'MEDIUM C-CUP breasts, average sized breasts, natural round shape, normal cleavage',
          'D': 'LARGE D-CUP breasts, big full round breasts, visible cleavage, heavy bust',
          'DD': 'VERY LARGE DD-CUP breasts, big heavy breasts, deep cleavage, bouncy',
          'E': 'HUGE E-CUP breasts, very big heavy breasts, massive cleavage, bouncy jiggling',
          'F': 'HUGE F-CUP breasts, enormous heavy breasts, huge deep cleavage, very bouncy',
          'G': 'GIGANTIC G-CUP breasts, extremely large breasts, massive heavy bust, gigantic cleavage',
          'H': 'MASSIVE H-CUP breasts, impossibly huge breasts, enormous heavy bust, giant cleavage',
          'I': 'COLOSSAL I-CUP breasts, extremely massive breasts, gigantic heavy bust'
        };
        const bustDesc = bustMap[character.bust.toUpperCase()] || `${character.bust}-cup breasts`;
        prompt += `, ${bustDesc}`;
        console.log(`👙 POITRINE (fallback): ${character.bust} -> ${bustDesc}`);
      }
    }
    
    // Genre et âge (les duos ont déjà retourné plus haut)
    const genderEn = character.gender === 'female' ? 'woman' : (character.gender === 'male' ? 'man' : 'person');
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
    
    // === v5.3.76 - TENUES ET POSES SELON LE MODE ===
    if (isNSFW) {
      // TENUES SEXY/PROVOCANTES pour profil NSFW
      const nsfwProfileOutfits = [
        'wearing sexy lingerie, lace bra and panties, seductive',
        'wearing sheer silk robe, open front, revealing',
        'wearing tight low-cut dress, deep cleavage visible',
        'wearing sexy corset, breasts pushed up, provocative',
        'wearing see-through nightgown, body visible',
        'wearing bikini, showing off curves, sexy',
        'topless, wearing only panties, sensual',
        'wearing sexy bodysuit, curves emphasized',
        'wearing garter belt and stockings, seductive lingerie',
        'wearing crop top and short skirt, sexy casual',
      ];
      prompt += `, ${nsfwProfileOutfits[Math.floor(Math.random() * nsfwProfileOutfits.length)]}`;
      
      // POSES SEXY pour profil NSFW
      const nsfwProfilePoses = [
        'seductive pose, bedroom eyes, inviting',
        'sexy confident pose, hand on hip, sultry look',
        'provocative pose, showing off body, flirtatious',
        'sensual pose, touching body, teasing',
        'alluring pose, emphasizing curves, sexy expression',
        'lying on bed, inviting pose, sensual',
        'kneeling, looking up seductively, submissive',
        'bending forward, showing cleavage, playful',
      ];
      prompt += `, ${nsfwProfilePoses[Math.floor(Math.random() * nsfwProfilePoses.length)]}`;
      
      // Qualités NSFW
      prompt += ', sexy, seductive, sensual, attractive, NSFW';
      console.log('🔞 Mode PROFIL NSFW activé');
    } else {
      // TENUES SFW ÉLÉGANTES POUR PROFIL
      const sfwOutfits = [
        'wearing elegant casual outfit, fashionable',
        'wearing beautiful dress, classy',
        'wearing smart casual clothes, stylish',
        'wearing trendy modern outfit, chic',
        'wearing stylish blouse, elegant',
      ];
      prompt += `, ${sfwOutfits[Math.floor(Math.random() * sfwOutfits.length)]}`;
      
      // POSES SFW NATURELLES
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
    }
    
    // ANATOMIE STRICTE (les duos ont déjà retourné plus haut)
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
    
    // === v5.3.66 - EXCLUSIONS MORPHOLOGIQUES avec CATÉGORIE ===
    // Déterminer la catégorie depuis le bodyType ou le character
    let charCategory = 'unknown';
    const bodyType = (physicalDetails.body.type || character.bodyType || '').toLowerCase();
    const charPhysDesc = (character.physicalDescription || '').toLowerCase();
    
    // Priorité: très rond > rond > voluptueuse (ordre important!)
    if (bodyType.includes('bbw') || bodyType.includes('très rond') || charPhysDesc.includes('très rond') || 
        charPhysDesc.includes('bbw') || charPhysDesc.includes('obèse')) {
      charCategory = 'bbw_big_belly';
    } else if (bodyType.includes('chubby') || bodyType.includes('plump') || bodyType.includes('ronde') || 
               bodyType.includes('potelé') || bodyType.includes('enrobé') ||
               charPhysDesc.includes('ronde') || charPhysDesc.includes('potelé') || charPhysDesc.includes('enrobé')) {
      charCategory = 'chubby_small_belly';
    } else if (bodyType.includes('voluptu') || bodyType.includes('généreus') || bodyType.includes('pulpeu') ||
               bodyType.includes('curvy') || bodyType.includes('plantureu') || bodyType.includes('hourglass') ||
               charPhysDesc.includes('voluptu') || charPhysDesc.includes('généreus') || charPhysDesc.includes('pulpeu')) {
      charCategory = 'curvy_no_belly';
    }
    
    // Appliquer renforcement selon catégorie
    if (charCategory === 'bbw_big_belly') {
      prompt += ', BBW fat body, BIG FAT ROUND BELLY visible, fat arms, fat thighs, huge butt, NOT thin, NOT slim, NOT fit';
      console.log('🔴 RENFORCEMENT PROFIL: BBW GROS VENTRE');
    } else if (charCategory === 'chubby_small_belly') {
      prompt += ', soft plump body, small soft round belly, chubby arms, thick thighs, big soft butt, NOT thin, NOT slim';
      console.log('🟠 RENFORCEMENT PROFIL: RONDE LÉGER VENTRE');
    } else if (charCategory === 'curvy_no_belly') {
      prompt += ', curvy hourglass body, FLAT TONED STOMACH, slim waist, wide hips, big butt, NOT fat belly, NOT round belly';
      console.log('🟢 RENFORCEMENT PROFIL: CURVY SANS VENTRE');
    }

    // === v5.4.0 - RENFORCEMENT FINAL DE LA POITRINE ===
    // Répéter la taille de bonnet à la fin pour emphase maximale
    if (character.gender === 'female' && character.bust) {
      const bustFinal = this.getBustUltraPriority(character.bust, 'female');
      if (bustFinal) {
        prompt += `, ${bustFinal}`;
        console.log(`👙 RENFORCEMENT FINAL POITRINE: ${character.bust} -> ${bustFinal.substring(0, 50)}...`);
      }
      
      // v5.4.0 - Ajouter le renforcement critique pour les grandes tailles (D+)
      const bustReinforce = this.getBustFinalReinforcement(character.bust, 'female');
      if (bustReinforce) {
        prompt += `, ${bustReinforce}`;
        console.log(`👙 RENFORCEMENT CRITIQUE: ${bustReinforce.substring(0, 60)}...`);
      }
    }

    console.log(`🖼️ Génération image profil ${isNSFW ? 'NSFW' : 'SFW'} (${isRealistic ? 'RÉALISTE' : 'ANIME'})...`);
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
    
    // === v5.4.20 - MORPHOLOGIE / CORPS - PRIORITÉ AU CHAMP bodyType EXPLICITE ===
    // D'abord vérifier si le personnage a un bodyType explicitement défini
    const explicitBodyType = (character.bodyType || '').toLowerCase().trim();
    
    // Mapping des types de corps explicites vers les descriptions en anglais
    const explicitBodyTypeMap = {
      'mince': 'SLIM SLENDER BODY, lean figure, thin physique, slender frame',
      'élancée': 'SLENDER ELEGANT BODY, tall and slim, graceful figure, lean physique',
      'moyenne': 'AVERAGE NORMAL BODY, normal proportions, regular build',
      'athlétique': 'ATHLETIC TONED BODY, fit physique, defined muscles, sporty figure, toned arms and legs',
      'voluptueuse': 'VOLUPTUOUS BODY, extremely curvy figure, sexy hourglass shape, large bust, wide hips, thick thighs, sensual full curves',
      'généreuse': 'GENEROUS CURVY BODY, full-figured woman, voluptuous figure, wide hips, large bust, thick thighs',
      'pulpeuse': 'THICK CURVY BODY, pronounced sexy curves, thick thighs, wide hips, full-figured',
      'ronde': 'CHUBBY ROUND BODY, plump soft curves, thick body with soft belly, wide hips, rounded figure',
      'très ronde': 'BBW body type, very fat curvy woman, extremely thick plump body, big belly, thick everywhere',
      'plantureuse': 'VOLUPTUOUS CURVY body, big breasts, wide hips, hourglass figure',
      'enrobée': 'PLUMP SOFT body, chubby, soft curves, round belly',
      'potelée': 'CHUBBY CUTE body, soft plump figure, round face',
    };
    
    // Si bodyType explicite trouvé, l'utiliser directement
    if (explicitBodyType && explicitBodyTypeMap[explicitBodyType]) {
      details.body.type = explicitBodyTypeMap[explicitBodyType];
      console.log(`🏋️ MORPHOLOGIE EXPLICITE: ${explicitBodyType} -> ${details.body.type.substring(0, 40)}...`);
    } else {
      // Sinon, utiliser la détection par mots-clés dans physicalDescription SEULEMENT
      // NE PAS utiliser les tags ou le nom pour éviter les faux positifs
      const physDescOnly = (character.physicalDescription || '').toLowerCase();
      
      const bodyIndicators = {
        bbw: physDescOnly.includes('bbw') || physDescOnly.includes('très ronde') || physDescOnly.includes('très grosse') || physDescOnly.includes('obèse'),
        round: physDescOnly.includes('ronde ') || physDescOnly.includes('rondelette') || physDescOnly.includes('potelée') || physDescOnly.includes('dodue'),
        chubby: physDescOnly.includes('chubby') || physDescOnly.includes('enrobée') || physDescOnly.includes('en chair'),
        generous: false, // Désactivé - trop de faux positifs
        voluptuous: physDescOnly.includes('pulpeuse') || physDescOnly.includes('plantureuse') || physDescOnly.includes('voluptueuse'),
        curvy: physDescOnly.includes('courbes généreuses') || physDescOnly.includes('formes généreuses') || physDescOnly.includes('curvy body'),
        thick: physDescOnly.includes('thick body') || physDescOnly.includes('épaisse') || physDescOnly.includes('cuisses épaisses'),
        maternal: false, // Désactivé - MILF ne signifie pas forcément ronde
        athletic: physDescOnly.includes('musclé') || physDescOnly.includes('athlétique') || physDescOnly.includes('tonique') || physDescOnly.includes('sportif'),
        slim: physDescOnly.includes('mince') || physDescOnly.includes('svelte') || physDescOnly.includes('élancée') || physDescOnly.includes('fine silhouette'),
        petite: physDescOnly.includes('petite silhouette') || physDescOnly.includes('petite taille'),
        massive: physDescOnly.includes('massif') || physDescOnly.includes('trapu') || physDescOnly.includes('costaud'),
        hourglass: physDescOnly.includes('sablier') || physDescOnly.includes('hourglass'),
      };
      
      const activeIndicators = Object.entries(bodyIndicators).filter(([k,v]) => v).map(([k]) => k);
      if (activeIndicators.length > 0) {
        console.log('🔍 Indicateurs morphologie (physicalDescription):', activeIndicators.join(', '));
      }
      
      // BBW / Très ronde - PRIORITÉ MAXIMALE
      if (bodyIndicators.bbw) {
        details.body.type = 'BBW body type, very fat curvy woman, extremely thick plump body, very large full-figured, big beautiful woman, chubby fat body, wide hips, big belly, thick everywhere';
      }
      // Ronde / Chubby / Dodue
      else if (bodyIndicators.round || bodyIndicators.chubby) {
        details.body.type = 'CHUBBY ROUND BODY, plump soft curves, full-figured curvy woman, thick body with soft belly, wide hips, rounded figure, pleasantly plump';
      }
      // Voluptueuse / Pulpeuse - MOTS FRANÇAIS SPÉCIFIQUES
      else if (bodyIndicators.voluptuous) {
        details.body.type = 'VOLUPTUOUS BODY, extremely curvy figure, sexy hourglass shape, large bust, wide hips, thick thighs, sensual full curves, bombshell figure';
      }
      // Curvy / Formes généreuses - SEULEMENT SI explicite
      else if (bodyIndicators.curvy || bodyIndicators.hourglass) {
        details.body.type = 'CURVY HOURGLASS BODY, sexy curves, pronounced bust and hips, slim waist, feminine figure, attractive curves';
      }
      // Thick / Épaisse
      else if (bodyIndicators.thick) {
        details.body.type = 'THICK CURVY BODY, pronounced sexy curves, thick thighs, wide hips, full-figured, thicc body';
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
      // v5.4.20 - PAS DE DEFAULT CURVY - Si rien n'est détecté, laisser vide
      // Le générateur utilisera une silhouette normale
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
   * v5.4.0 - MORPHOLOGIE EN PRIORITÉ MAXIMALE + Option ignoreOutfit pour NSFW
   * @param {Object} character - Personnage
   * @param {boolean} isRealistic - Style réaliste ou anime
   * @param {boolean} ignoreOutfit - Si true, ignore la tenue du personnage (pour NSFW)
   */
  buildUltraDetailedPrompt(character, isRealistic = false, ignoreOutfit = false) {
    const parts = [];
    
    // v5.4.0 - En mode NSFW (ignoreOutfit), ne PAS utiliser imagePrompt car il contient souvent la tenue
    if (character.imagePrompt && character.imagePrompt.length > 50 && !ignoreOutfit) {
      // Utiliser directement le prompt optimisé du personnage (MODE SFW SEULEMENT)
      console.log('🎨 Mode SFW: Utilisation imagePrompt Bagbot:', character.imagePrompt.substring(0, 100) + '...');
      return character.imagePrompt;
    } else if (ignoreOutfit) {
      console.log('🔞 Mode NSFW: imagePrompt IGNORÉ pour utiliser tenues NSFW');
    }
    
    // Parser le descriptif physique avec la nouvelle fonction
    const physicalDetails = this.parsePhysicalDescription(character);
    
    // v5.4.0 - NE PAS inclure outfit si ignoreOutfit est true
    // Collecter TOUTES les données PHYSIQUES pour analyse (PAS LA TENUE en NSFW)
    const allData = [
      character.physicalDescription || '', // Priorité haute (nouveau format Bagbot)
      character.appearance || '',
      character.bodyType || '',
      (character.tags || []).join(' '),
      character.hairColor || '',
      character.hairLength || '',
      character.eyeColor || '',
      ignoreOutfit ? '' : (character.outfit || '') // v5.4.0 - Ignorer tenue en NSFW
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
    
    // === 15. imagePrompt DU PERSONNAGE (SEULEMENT en mode SFW) ===
    // v5.4.0 - NE PAS ajouter en mode NSFW car il contient la tenue du personnage
    if (character.imagePrompt && !ignoreOutfit) {
      // Ajouter le imagePrompt personnalisé qui contient souvent des détails précis
      parts.push(character.imagePrompt);
      console.log('✅ Mode SFW: imagePrompt ajouté au prompt');
    } else if (character.imagePrompt && ignoreOutfit) {
      console.log('🔞 Mode NSFW: imagePrompt NON ajouté (utilisation tenues NSFW)');
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

    // v5.4.6 - Le level est le niveau de RELATION avec ce personnage spécifique
    // PAS un niveau global utilisateur!
    const level = Math.max(1, relationLevel || 1);
    const isNSFW = level >= 2; // NSFW seulement à partir du niveau 2
    
    console.log(`🖼️ Image pour ${character.name} - Niveau RELATION: ${level} - ${isNSFW ? '🔞 NSFW' : '✨ SFW'}`);
    
    // v5.4.15 - DÉTECTER SI C'EST UN DUO/TRIO
    const duoInfo = this.isDuoOrTrioCharacter(character);
    if (duoInfo.isDuo) {
      console.log(`👯 PERSONNAGE DUO DÉTECTÉ: ${character.name} (${duoInfo.memberCount} personnes)`);
    }
    
    // v5.3.77 - Extraire les informations du profil utilisateur
    const userProfileInfo = this.extractUserProfileForImage(userProfile, isNSFW);
    if (userProfileInfo) {
      console.log(`👤 Profil utilisateur intégré: ${userProfileInfo.username || 'Anonyme'}, genre=${userProfileInfo.gender}, age=${userProfileInfo.age}`);
    }

    // v5.3.67 - Obtenir le profil physique prioritaire (PERSISTANT)
    const priorityPhysicalPrompt = this.buildPriorityPhysicalPrompt(character);

    // Choisir le style
    const { style, isRealistic } = this.getRandomStyle();
    
    // === EXTRAIRE LE CONTEXTE DE CONVERSATION ===
    const conversationContext = this.extractConversationContext(recentMessages);
    console.log(`📍 Contexte conversation:`, conversationContext);
    
    // === GÉNÉRER LES ÉLÉMENTS VARIÉS ===
    const sceneElements = this.generateVariedSceneElements();
    
    // v5.4.16 - GÉNÉRATION SPÉCIALE POUR DUOS avec NSFW amélioré
    if (duoInfo.isDuo) {
      // buildDuoPrompt inclut maintenant tenues, poses, locations, mood, et anatomie
      const duoPrompt = this.buildDuoPrompt(character, level, isRealistic);
      
      // Construire le prompt final - le style est déjà dans duoPrompt
      let finalDuoPrompt = duoPrompt;
      
      // Ajouter le marker de niveau NSFW pour la détection
      finalDuoPrompt = `[NSFW_LEVEL_${level}] ` + finalDuoPrompt;
      
      console.log(`👯 Génération IMAGE DUO NSFW: ${character.name} - Niveau ${level}`);
      console.log(`👯 Prompt DUO (${finalDuoPrompt.length} chars): ${finalDuoPrompt.substring(0, 400)}...`);
      
      // Utiliser la même méthode que les personnages solo
      return await this.generateImage(finalDuoPrompt, character);
    }
    
    // === SUITE NORMALE POUR PERSONNAGES SOLO ===
    // v5.4.21 - COMMENCER PAR STYLE + ANGLE/POSE PRIORITAIRE POUR NSFW
    let prompt = '';
    
    // v5.4.22 - En mode NSFW, mettre l'angle/pose/tenue EN PREMIER (priorité maximale)
    // VARIÉTÉ MAXIMALE avec tenues et poses plus provocantes et sexy
    if (isNSFW && level >= 2) {
      // Sélectionner l'angle en fonction du niveau
      let priorityAngle;
      let priorityOutfit;
      let priorityPose;
      
      if (level >= 5) {
        // Niveau 5+ : TRÈS EXPLICITE - NUE COMPLÈTE
        const explicitAngles = [
          '((legs spread wide open)), ((pussy fully visible)), explicit frontal view',
          '((bent over presenting rear)), ((ass and pussy visible from behind)), doggy view',
          '((lying on back, legs wide apart)), ((full frontal nudity)), intimate exposure',
          '((on all fours)), ((rear view ass up)), presenting sexually, pussy peeking',
          '((straddling view from below)), ((breasts and pussy visible)), riding position',
          '((kneeling with legs spread)), ((genitals exposed)), submissive explicit',
          '((lying with legs in the air)), ((everything visible)), maximum exposure',
          '((squatting down)), ((pussy and ass visible)), explicit squat pose',
          '((hands spreading pussy lips)), ((intimate close-up)), self-exposure',
          '((lying face down ass up)), ((rear fully exposed)), presenting pose',
          '((sitting with legs wide open)), ((pussy on display)), inviting view',
          '((standing bent forward)), ((ass and pussy from behind)), provocative bend',
        ];
        const explicitOutfits = [
          '((completely nude)), ((naked body)), no clothes at all, fully exposed skin',
          '((totally naked)), ((nothing covering)), nude and vulnerable',
          '((fully nude)), ((bare everywhere)), complete nudity displayed',
          '((stark naked)), ((all clothes removed)), pure nudity',
          '((wearing nothing)), ((nude body glistening)), completely bare',
          '((nude with only high heels)), ((otherwise naked)), erotic nudity',
          '((nude with choker only)), ((body fully exposed)), accessorized nudity',
          '((nude oiled body)), ((glistening naked skin)), wet look nude',
        ];
        const explicitPoses = [
          '((masturbating)), ((fingers on pussy)), pleasuring herself visibly',
          '((spreading pussy open)), ((showing inside)), maximum exposure pose',
          '((touching between legs)), ((self-pleasure)), erotic masturbation',
          '((fingers inside)), ((penetrating self)), explicit self-play',
          '((rubbing clit)), ((pleasure face)), orgasmic expression',
          '((legs behind head)), ((maximum flexibility)), gymnastic explicit',
          '((riding invisible)), ((bouncing pose)), sexual movement',
          '((arching back in ecstasy)), ((orgasm pose)), climax moment',
          '((grabbing own ass cheeks)), ((spreading apart)), presenting rear',
          '((pinching nipples)), ((pleasure expression)), breast stimulation',
        ];
        priorityAngle = explicitAngles[Math.floor(Math.random() * explicitAngles.length)];
        priorityOutfit = explicitOutfits[Math.floor(Math.random() * explicitOutfits.length)];
        priorityPose = explicitPoses[Math.floor(Math.random() * explicitPoses.length)];
      } else if (level >= 4) {
        // Niveau 4 : TOPLESS/SEINS NUS - Plus de variété
        const toplessAngles = [
          '((topless)), ((bare breasts prominent)), nipples clearly visible, breast focus',
          '((from above looking at topless body)), ((breasts viewed from top)), intimate angle',
          '((breasts centered in frame)), ((nipples erect and detailed)), chest focus',
          '((rear view showing butt)), ((topless looking back)), sexy back view',
          '((kneeling topless)), ((breasts hanging naturally)), submissive topless',
          '((lying topless on bed)), ((breasts falling to sides)), relaxed nude',
          '((standing topless profile)), ((breast silhouette)), elegant topless',
          '((bending forward topless)), ((breasts hanging down)), gravity view',
          '((stretching arms up topless)), ((breasts lifted)), athletic topless',
          '((topless with hands behind head)), ((breasts pushed out)), display pose',
          '((topless on knees)), ((breasts at eye level)), worship angle',
          '((topless back arched)), ((breasts thrust forward)), dramatic pose',
        ];
        const toplessOutfits = [
          '((topless)), ((bare breasts)), wearing only tiny panties',
          '((shirtless)), ((breasts fully exposed)), just a thong below',
          '((nude from waist up)), ((big breasts out)), lace panties only',
          '((topless in garter belt)), ((breasts free)), stockings and heels',
          '((topless in short skirt)), ((breasts bouncing)), no bra',
          '((breasts out of bra)), ((bra pulled down)), partially undressed',
          '((topless with open shirt)), ((breasts visible through)), unbuttoned',
          '((topless in just boots)), ((otherwise bare)), fetish topless',
          '((topless wet)), ((water on breasts)), shower or pool scene',
          '((oiled topless body)), ((glistening breasts)), massage look',
        ];
        const toplessPoses = [
          '((cupping her own breasts)), ((squeezing)), sensual self-touch',
          '((arching back dramatically)), ((breasts pushed forward)), sexy arch',
          '((on knees looking up)), ((breasts prominent)), submissive gaze',
          '((pressing breasts together)), ((creating cleavage)), push-up pose',
          '((lifting one breast)), ((showing underboob)), playful touch',
          '((hands on breasts)), ((covering nipples teasingly)), peek-a-boo',
          '((jiggling breasts)), ((movement captured)), bouncing action',
          '((leaning forward)), ((breasts hanging)), gravity emphasized',
          '((twisting torso)), ((breast profile)), elegant twist',
          '((pulling on nipples)), ((erotic expression)), nipple play',
        ];
        priorityAngle = toplessAngles[Math.floor(Math.random() * toplessAngles.length)];
        priorityOutfit = toplessOutfits[Math.floor(Math.random() * toplessOutfits.length)];
        priorityPose = toplessPoses[Math.floor(Math.random() * toplessPoses.length)];
      } else if (level >= 3) {
        // Niveau 3 : LINGERIE TRÈS SEXY - Plus provocante
        const lingerieAngles = [
          '((in revealing lingerie)), ((lace bra barely covering)), deep cleavage',
          '((bent forward in lingerie)), ((breasts almost spilling out)), teasing view',
          '((lying in sheer lingerie)), ((body visible through fabric)), see-through',
          '((from behind in thong)), ((ass cheeks fully visible)), rear lingerie view',
          '((kneeling in lingerie)), ((cleavage emphasized)), worship angle',
          '((standing in doorway in lingerie)), ((silhouette)), backlit sexy',
          '((lying on stomach in lingerie)), ((ass up)), butt focus',
          '((straddling in lingerie)), ((crotch area visible)), suggestive pose',
          '((undressing from lingerie)), ((bra half off)), mid-undress',
          '((lingerie pulled aside)), ((skin peeking)), tease reveal',
        ];
        const lingerieOutfits = [
          '((wearing sheer lace lingerie)), ((nipples visible through)), see-through bra',
          '((transparent negligee)), ((entire body visible)), nothing hidden',
          '((corset pushing breasts up)), ((maximum cleavage)), waist cinched',
          '((crotchless panties)), ((intimate area accessible)), open lingerie',
          '((cupless bra)), ((nipples exposed)), peek-a-boo bra',
          '((fishnet bodystocking)), ((body visible through mesh)), full coverage but revealing',
          '((tiny bikini)), ((barely covering)), string bikini',
          '((sheer babydoll)), ((everything visible through)), romantic but revealing',
          '((open-front lingerie)), ((breasts fully exposed)), frame lingerie',
          '((wet white lingerie)), ((completely see-through)), wet look',
          '((leather lingerie)), ((strappy and revealing)), bondage style',
          '((lace teddy)), ((high cut sides)), one piece revealing',
          '((garter belt and stockings only)), ((no panties)), minimal coverage',
          '((mesh bodysuit)), ((pattern barely covers)), strategic coverage',
        ];
        const lingeriePoses = [
          '((lounging seductively on bed)), ((legs slightly parted)), inviting pose',
          '((slowly removing bra)), ((strap sliding off)), strip tease',
          '((hands exploring own body)), ((sensual self-caress)), lingerie touch',
          '((pulling panties down)), ((revealing more)), undressing tease',
          '((arching back on bed)), ((breasts emphasized)), sexy stretch',
          '((kneeling on all fours)), ((lingerie view from behind)), crawling pose',
          '((standing with leg up)), ((panties visible)), flamingo pose',
          '((lying with legs in air)), ((lingerie from below)), legs up pose',
          '((sitting spread-legged)), ((panties stretched)), open seated',
          '((bending over)), ((rear in thong)), bent over view',
        ];
        priorityAngle = lingerieAngles[Math.floor(Math.random() * lingerieAngles.length)];
        priorityOutfit = lingerieOutfits[Math.floor(Math.random() * lingerieOutfits.length)];
        priorityPose = lingeriePoses[Math.floor(Math.random() * lingeriePoses.length)];
      } else {
        // Niveau 2 : TENUE TRÈS PROVOCANTE - Plus sexy
        const sexyAngles = [
          '((tight dress showing every curve)), ((cleavage prominent)), sexy stance',
          '((micro mini skirt)), ((long legs on display)), flirtatious pose',
          '((low-cut top)), ((breasts pushed together)), maximum cleavage view',
          '((bent over in short dress)), ((panties peeking)), upskirt tease',
          '((sitting with legs uncrossed)), ((panties visible)), revealing sit',
          '((wet t-shirt)), ((breasts visible through)), wet clothing',
          '((side view in tight dress)), ((curves emphasized)), profile sexy',
          '((from behind in tight jeans)), ((ass emphasized)), rear view',
          '((dancing provocatively)), ((dress riding up)), movement sexy',
          '((stretching in crop top)), ((underboob visible)), stretch pose',
        ];
        const sexyOutfits = [
          '((wearing skin-tight mini dress)), ((every curve visible)), bodycon',
          '((crop top and micro shorts)), ((midriff and legs)), hot pants outfit',
          '((plunging neckline dress)), ((cleavage to navel)), deep V dress',
          '((see-through blouse)), ((bra visible underneath)), sheer top',
          '((backless dress)), ((entire back exposed)), elegant but sexy',
          '((side-boob revealing top)), ((no bra)), daring fashion',
          '((ultra short skirt)), ((barely covering)), micro mini',
          '((wet white shirt)), ((body visible through)), wet look',
          '((mesh top)), ((bra showing through)), layered sexy',
          '((tube top barely covering)), ((slipping down)), precarious top',
          '((cut-out dress)), ((strategic skin showing)), peek-a-boo dress',
          '((bodysuit with deep V)), ((cleavage emphasized)), sleek sexy',
          '((off-shoulder top)), ((almost falling)), shoulder exposed',
          '((latex dress)), ((skintight shiny)), fetish fashion',
          '((bikini top as shirt)), ((maximum exposure)), beach to street',
        ];
        const sexyPoses = [
          '((bending forward showing cleavage)), ((breasts hanging)), cleavage pose',
          '((hand on hip, hip popped)), ((confident stance)), power pose',
          '((sitting with legs apart)), ((skirt riding up)), open seated',
          '((leaning against wall)), ((chest pushed out)), lean pose',
          '((adjusting dress strap)), ((almost slipping)), wardrobe malfunction',
          '((pulling up skirt teasingly)), ((showing thigh)), tease pose',
          '((unbuttoning top)), ((revealing more)), undressing start',
          '((hands running through hair)), ((chest emphasized)), glamour pose',
          '((blowing a kiss)), ((seductive expression)), flirty pose',
          '((finger on lips)), ((innocent but sexy)), coy pose',
          '((lying back provocatively)), ((dress riding up)), recline tease',
          '((straddling chair)), ((dress stretched)), straddle pose',
        ];
        priorityAngle = sexyAngles[Math.floor(Math.random() * sexyAngles.length)];
        priorityOutfit = sexyOutfits[Math.floor(Math.random() * sexyOutfits.length)];
        priorityPose = sexyPoses[Math.floor(Math.random() * sexyPoses.length)];
      }
      
      // v5.4.21 - PROMPT NSFW: Angle/Tenue/Pose EN PREMIER avec poids élevé
      prompt = `${style}, ${priorityAngle}, ${priorityOutfit}, ${priorityPose}`;
      console.log(`🔥 v5.4.21 NSFW Niveau ${level} - PRIORITÉ:`);
      console.log(`   📷 Angle: ${priorityAngle}`);
      console.log(`   👙 Tenue: ${priorityOutfit}`);
      console.log(`   🎭 Pose: ${priorityPose}`);
    } else {
      // Mode SFW - prompt classique
      prompt = 'FULL BODY SHOT showing entire character from head to feet, complete figure visible, NOT cropped, ' + style;
    }
    
    // === v5.3.67 - PROFIL PHYSIQUE PRIORITAIRE ===
    if (priorityPhysicalPrompt) {
      prompt += ', ' + priorityPhysicalPrompt;
      console.log('✅ Profil physique prioritaire ajouté (generateSceneImage)');
    }
    
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
        // === v5.3.65 - TAILLES DE POITRINE RÉALISTES ===
        const bustMap = {
          'A': 'VERY SMALL A-CUP breasts, nearly flat chest, small nipples',
          'B': 'SMALL B-CUP breasts, petite modest bust, small perky breasts',
          'C': 'MEDIUM C-CUP breasts, average sized breasts, natural round shape',
          'D': 'LARGE D-CUP breasts, big full round breasts, visible cleavage',
          'DD': 'VERY LARGE DD-CUP breasts, big heavy breasts, deep cleavage',
          'E': 'HUGE E-CUP breasts, very big heavy breasts, massive cleavage',
          'F': 'HUGE F-CUP breasts, enormous heavy breasts, huge deep cleavage',
          'G': 'GIGANTIC G-CUP breasts, extremely large breasts, massive heavy bust',
          'H': 'MASSIVE H-CUP breasts, impossibly huge breasts, enormous heavy bust',
          'I': 'COLOSSAL I-CUP breasts, extremely massive breasts, gigantic heavy bust'
        };
        const bustDesc = bustMap[character.bust.toUpperCase()] || `${character.bust}-cup breasts`;
        prompt += `, ${bustDesc}`;
        console.log(`👙 POITRINE SCÈNE (fallback): ${character.bust} -> ${bustDesc}`);
      }
    }
    
    // === DESCRIPTION PHYSIQUE ULTRA-DÉTAILLÉE (reste) ===
    // v5.4.0 - En mode NSFW, ignorer la tenue du personnage pour utiliser les tenues NSFW aléatoires
    prompt += ', ' + this.buildUltraDetailedPhysicalPrompt(character, isRealistic, isNSFW);
    
    // === v5.4.0 - UTILISER imagePrompt SEULEMENT EN MODE SFW ===
    // En mode NSFW, on ne veut PAS utiliser la tenue du personnage car on utilise des tenues NSFW aléatoires
    if (character.imagePrompt && !isNSFW) {
      // Mode SFW: Nettoyer et ajouter l'imagePrompt du personnage
      const cleanImagePrompt = character.imagePrompt.replace(/\n/g, ' ').trim();
      prompt += ', ' + cleanImagePrompt;
      console.log('✅ Mode SFW: imagePrompt utilisé');
    } else if (character.imagePrompt && isNSFW) {
      // Mode NSFW: Extraire SEULEMENT les détails physiques (sans la tenue)
      const cleanImagePrompt = character.imagePrompt.replace(/\n/g, ' ').trim().toLowerCase();
      
      // Filtrer pour garder seulement les caractéristiques physiques, pas les vêtements
      const clothingKeywords = ['wearing', 'dressed', 'outfit', 'clothes', 'clothing', 'robe', 'chemise', 
        'pantalon', 'jupe', 'dress', 'shirt', 'pants', 'skirt', 'jacket', 'veste', 'tenue', 'habill',
        'lingerie', 'bra', 'panties', 'underwear', 'bikini', 'maillot', 't-shirt', 'top', 'jean',
        'uniforme', 'costume', 'suit', 'blouse', 'sweater', 'pull', 'coat', 'manteau'];
      
      // Si le imagePrompt contient des mots de vêtements, ne pas l'utiliser
      const hasClothing = clothingKeywords.some(kw => cleanImagePrompt.includes(kw));
      
      if (!hasClothing) {
        // Pas de vêtements mentionnés, utiliser le prompt physique
        prompt += ', ' + character.imagePrompt.replace(/\n/g, ' ').trim();
        console.log('✅ Mode NSFW: imagePrompt physique utilisé (pas de vêtements)');
      } else {
        console.log('🔞 Mode NSFW: imagePrompt IGNORÉ (contient tenue de personnage)');
      }
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
    
    // === v5.4.2 - CARACTÉRISTIQUES CORPORELLES (ignorer vêtements en NSFW) ===
    const bodyFeatures = this.extractBodyFeatures(character, isNSFW); // isNSFW = ignoreOutfit
    if (bodyFeatures) {
      prompt += `, ${bodyFeatures}`;
      console.log(`💪 CORPS (NSFW=${isNSFW}): ${bodyFeatures.substring(0, 100)}...`);
    }
    
    // === SELON LE MODE SFW/NSFW ===
    if (isNSFW) {
      // === v5.4.21 MODE NSFW SIMPLIFIÉ ===
      // L'angle, tenue et pose ont déjà été ajoutés en PRIORITÉ au début du prompt
      // Ici on ajoute seulement les éléments complémentaires
      console.log(`🔞 Mode NSFW actif - Niveau ${level} (angle/tenue/pose déjà en tête)`);
      
      // Anatomie détaillée pour NSFW
      prompt += ', ' + this.buildAnatomyDescription(character, isRealistic);
      
      // Lieu intime
      prompt += `, ${sceneElements.location}`;
      prompt += `, ${sceneElements.lighting}`;
      
      // === v5.4.2 - CARACTÉRISTIQUES CORPORELLES (IGNORER vêtements car NSFW) ===
      const bodyFeaturesNSFW = this.extractBodyFeatures(character, true);
      if (bodyFeaturesNSFW) {
        prompt += `, ${bodyFeaturesNSFW}`;
        console.log(`💪 CORPS NSFW: ${bodyFeaturesNSFW.substring(0, 80)}...`);
      }
      
      // v5.4.11 - RENFORCEMENT DE LA TENUE SELON LE NIVEAU
      if (level >= 4) {
        prompt += ', bare breasts fully visible, topless, nipples showing';
      }
      if (level >= 5) {
        prompt += ', completely nude naked, full frontal nudity, nothing covering body';
      }
      if (level >= 6) {
        prompt += ', explicit nude, pussy visible, legs spread, erotic exposure';
      }
      
      // Ambiance sensuelle
      prompt += `, ${sceneElements.mood}`;
      
      // Prompt NSFW explicite RENFORCÉ SELON LE NIVEAU
      prompt += this.buildNSFWPrompt(character, isRealistic);
      
      // v5.4.11 - RENFORCEMENT NSFW ULTRA-EXPLICITE selon le niveau
      // Ces termes sont ajoutés EN PLUS de la tenue et pose par niveau
      if (level === 2) {
        // Niveau 2: Provocante - Tenue sexy mais habillée
        prompt += ', ((NSFW)), ((sexy provocative)), seductive outfit showing curves';
        prompt += ', deep cleavage visible, short tight dress, high heels, stockings';
        prompt += ', sexy confident pose, bedroom eyes, flirtatious, ((sensual atmosphere))';
        prompt += ', detailed bedroom background visible, romantic lighting';
        console.log('📸 Mode NIVEAU 2: Provocante');
      } else if (level === 3) {
        // Niveau 3: Lingerie - Sous-vêtements sexy
        prompt += ', ((NSFW)), ((sexy lingerie)), lace bra and panties only';
        prompt += ', underwear only, nipples showing through sheer fabric, garter belt stockings';
        prompt += ', seductive lingerie pose on bed, ((erotic sensual)), bedroom setting';
        prompt += ', silk sheets visible, intimate boudoir atmosphere';
        console.log('📸 Mode NIVEAU 3: Lingerie');
      } else if (level === 4) {
        // Niveau 4: TOPLESS - Seins nus
        prompt += ', ((NSFW)), ((topless)), ((bare breasts fully visible)), ((nipples exposed))';
        prompt += ', naked from waist up, wearing only panties, breasts out';
        prompt += ', ((sensual nude)), confident topless pose, hands on body';
        prompt += ', bedroom with soft lighting, intimate setting, sheets visible';
        console.log('📸 Mode NIVEAU 4: TOPLESS');
      } else if (level === 5) {
        // Niveau 5: Nu artistique - Complètement nue
        prompt += ', ((NSFW)), ((fully nude)), ((completely naked)), ((artistic nudity))';
        prompt += ', ((naked body fully exposed)), ((nipples visible)), ((nude pose))';
        prompt += ', nothing covering body, natural beautiful nude, elegant exposure';
        prompt += ', boudoir setting, soft romantic lighting, luxurious bedroom';
        console.log('📸 Mode NIVEAU 5: Nu artistique');
      } else if (level === 6) {
        // Niveau 6: Nu sensuel - Pose suggestive
        prompt += ', ((NSFW)), ((nude sensual pose)), ((naked body glistening with oil))';
        prompt += ', ((legs slightly parted)), hands exploring own body, ((erotic))';
        prompt += ', explicit adult content, passionate expression, intimate exposure';
        prompt += ', on silk bed, candles, romantic erotic atmosphere';
        console.log('📸 Mode NIVEAU 6: Nu sensuel');
      } else if (level === 7) {
        // Niveau 7: Nu érotique - Jambes écartées
        prompt += ', ((NSFW)), ((erotic nude)), ((legs spread invitingly))';
        prompt += ', ((naked on bed)), hand between thighs, provocative explicit';
        prompt += ', ((sexual pose)), pussy visible, adult only, uncensored';
        prompt += ', messy bed, passionate atmosphere, explicit bedroom';
        console.log('📸 Mode NIVEAU 7: Nu érotique');
      } else if (level === 8) {
        // Niveau 8: Très explicite
        prompt += ', ((NSFW)), ((very explicit nude)), ((legs wide spread open))';
        prompt += ', ((touching pussy intimately)), naked spread on bed, nothing hidden';
        prompt += ', extreme explicit, masturbation pose, fingers near pussy';
        prompt += ', completely exposed, maximum nudity, uncensored adult';
        console.log('📸 Mode NIVEAU 8: Très explicite');
      } else if (level === 9) {
        // Niveau 9: Ultra explicite
        prompt += ', ((NSFW)), ((ultra explicit nude)), ((maximum sexual exposure))';
        prompt += ', ((fingers inside pussy)), orgasmic expression, most intimate pose';
        prompt += ', extreme sexual content, explicit masturbation, ((uncensored))';
        prompt += ', pussy spread open, juices visible, climax moment';
        console.log('📸 Mode NIVEAU 9: Ultra explicite');
      } else if (level >= 10) {
        // Niveau 10+: Maximum explicite
        prompt += ', ((NSFW)), ((maximum explicit nude)), ultimate erotic exposure';
        prompt += ', most provocative pose possible, extreme intimacy, everything visible';
        prompt += ', explicit self-pleasure, toy insertion visible, intense orgasm';
        prompt += ', absolute maximum adult content, nothing censored, XXX rated';
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
    
    // QUALITÉ - v5.4.11 - PAS DE "PORTRAIT" qui force les close-ups!
    if (isRealistic) {
      prompt += ', ' + this.buildRealisticQualityPrompts();
      prompt += ', ultra-detailed photograph, 8K, professional quality';
      prompt += ', single person, full body visible from head to feet';
      if (isNSFW) {
        prompt += ', sensual erotic photography, intimate boudoir style';
        prompt += ', detailed background visible, NOT cropped, NOT close-up, NOT headshot';
      }
    } else {
      // ANIME NSFW - v5.4.11
      prompt += ', masterpiece, best quality, highly detailed anime illustration';
      prompt += ', single character, full body from head to feet';
      if (isNSFW) {
        prompt += ', ecchi hentai style, sensual anime, provocative pose';
        prompt += ', detailed background, NOT cropped, NOT portrait, NOT headshot';
      }
    }

    // === RENFORCEMENT FINAL DE LA MORPHOLOGIE POUR SCÈNE ===
    const physicalDetails = this.parsePhysicalDescription(character);
    if (physicalDetails.body.type) {
      const shortBody = this.getShortBodyType(physicalDetails.body.type);
      if (shortBody) {
        prompt += `, ${shortBody} body, ${shortBody}`;
      }
      
      // === v5.3.66 - EXCLUSIONS MORPHOLOGIQUES SCÈNE avec CATÉGORIE ===
      let sceneCategory = 'unknown';
      const bodyType = (physicalDetails.body.type || character.bodyType || '').toLowerCase();
      const scenePhysDesc = (character.physicalDescription || '').toLowerCase();
      
      // Priorité: très rond > rond > voluptueuse
      if (bodyType.includes('bbw') || bodyType.includes('très rond') || scenePhysDesc.includes('très rond') || 
          scenePhysDesc.includes('bbw') || scenePhysDesc.includes('obèse')) {
        sceneCategory = 'bbw_big_belly';
      } else if (bodyType.includes('chubby') || bodyType.includes('plump') || bodyType.includes('ronde') || 
                 bodyType.includes('potelé') || bodyType.includes('enrobé') ||
                 scenePhysDesc.includes('ronde') || scenePhysDesc.includes('potelé') || scenePhysDesc.includes('enrobé')) {
        sceneCategory = 'chubby_small_belly';
      } else if (bodyType.includes('voluptu') || bodyType.includes('généreus') || bodyType.includes('pulpeu') ||
                 bodyType.includes('curvy') || bodyType.includes('plantureu') ||
                 scenePhysDesc.includes('voluptu') || scenePhysDesc.includes('généreus') || scenePhysDesc.includes('pulpeu')) {
        sceneCategory = 'curvy_no_belly';
      }
      
      // Appliquer renforcement selon catégorie
      if (sceneCategory === 'bbw_big_belly') {
        prompt += ', BBW fat body, BIG FAT ROUND BELLY visible, fat arms, fat thighs, huge butt, NOT thin, NOT slim';
        console.log('🔴 RENFORCEMENT SCÈNE: BBW GROS VENTRE');
      } else if (sceneCategory === 'chubby_small_belly') {
        prompt += ', soft plump body, small soft round belly, chubby arms, thick thighs, big soft butt, NOT thin, NOT slim';
        console.log('🟠 RENFORCEMENT SCÈNE: RONDE LÉGER VENTRE');
      } else if (sceneCategory === 'curvy_no_belly') {
        prompt += ', curvy hourglass body, FLAT TONED STOMACH, slim waist, wide hips, big butt, NOT fat belly, NOT round belly';
        console.log('🟢 RENFORCEMENT SCÈNE: CURVY SANS VENTRE');
      }
    }
    
    // === v5.4.0 - RENFORCEMENT FINAL POITRINE ULTRA-PRIORITAIRE ===
    if (character.gender === 'female' && character.bust) {
      const bustFinal = this.getBustUltraPriority(character.bust, 'female');
      if (bustFinal) {
        prompt += `, ${bustFinal}`;
        console.log(`👙 RENFORCEMENT FINAL POITRINE SCÈNE: ${character.bust} -> ${bustFinal.substring(0, 50)}...`);
      }
      
      // v5.4.0 - Ajouter le renforcement final pour les grandes tailles (D+)
      const bustReinforce = this.getBustFinalReinforcement(character.bust, 'female');
      if (bustReinforce) {
        prompt += `, ${bustReinforce}`;
        console.log(`👙 RENFORCEMENT CRITIQUE POITRINE: ${bustReinforce.substring(0, 60)}...`);
      }
    } else if (character.gender === 'female' && physicalDetails.bust.size) {
      // Fallback: utiliser la taille détectée
      const bustSize = physicalDetails.bust.size.toLowerCase();
      if (bustSize.includes('dd') || bustSize.includes('e') || bustSize.includes('f') || 
          bustSize.includes('g') || bustSize.includes('h') || bustSize === 'large' || bustSize === 'huge') {
        prompt += ', ((VERY LARGE breasts)), ((big heavy bust)), deep cleavage, large boobs, BREASTS THAT DOMINATE THE VIEW';
      } else if (bustSize.includes('d')) {
        prompt += ', ((LARGE D-CUP breasts)), big full bust, visible cleavage, big boobs';
      } else if (bustSize.includes('a') || bustSize === 'small') {
        prompt += ', small breasts, flat chest, petite bust';
      }
    }

    // v5.3.77 - Ajouter le contexte du profil utilisateur pour plus d'immersion
    if (isNSFW && userProfileInfo) {
      const userContextPrompt = this.buildUserProfilePromptForScene(userProfile, isNSFW);
      if (userContextPrompt) {
        prompt += `, ${userContextPrompt}`;
        console.log(`👤 Contexte utilisateur ajouté: ${userContextPrompt}`);
      }
    }

    // v5.4.22 - RENFORCEMENT ANTI-DÉFAUTS ULTRA-STRICT (ajouté à la fin pour emphase)
    // Ces termes sont cruciaux pour éviter les problèmes anatomiques
    prompt += ', ((perfect anatomy)), ((correct proportions)), ((natural human body))';
    prompt += ', ((exactly two arms)), ((exactly two legs)), ((five fingers each hand))';
    prompt += ', ((symmetrical face)), ((two eyes)), ((one nose)), ((one mouth))';
    prompt += ', ((natural breast shape)), ((correct breast placement on chest))';
    prompt += ', ((legs bending correctly)), ((knees in right direction)), ((elbows correct))';
    prompt += ', ((clothes not fused with skin)), ((separate fabric from body))';
    prompt += ', ((realistic skin texture)), ((natural body curves))';
    if (isRealistic) {
      prompt += ', ((photograph quality)), ((no artifacts)), ((sharp focus))';
      prompt += ', ((professional lighting)), ((studio quality)), 8K resolution';
    } else {
      prompt += ', ((clean lineart)), ((no distortions)), ((anime quality))';
      prompt += ', ((vibrant colors)), ((detailed shading))';
    }
    console.log('✅ v5.4.22: Renforcement anti-défauts ajouté');

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
   * v5.4.17 - Génère une image avec 3 stratégies possibles:
   * - pollinations: Pollinations AI (cloud, NSFW)
   * - freebox: Stable Diffusion sur serveur Freebox
   * - local: SD Local sur smartphone
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
    console.log(`🎨 Stratégie: ${strategy.toUpperCase()} (tentative ${retryCount + 1}/${this.maxRetries + 2})`);
    
    let imageUrl;
    
    // v5.4.17 - Support des 3 stratégies
    switch (strategy) {
      case 'local':
        console.log('📱 Génération avec SD Local (smartphone)...');
        imageUrl = await this.generateWithLocal(prompt);
        break;
        
      case 'freebox':
        console.log('🏠 Génération avec SD Freebox (serveur)...');
        imageUrl = await this.generateWithFreeboxSD(prompt, character);
        break;
        
      case 'pollinations':
      default:
        console.log('☁️ Génération avec Pollinations AI (cloud)...');
        imageUrl = await this.generateWithPollinations(prompt, character);
        break;
    }
    
    // Vérifier si l'image est valide
    const isValid = await this.validateImageUrl(imageUrl);
    
    if (isValid) {
      console.log(`✅ Image générée avec succès via ${strategy.toUpperCase()}`);
      return imageUrl;
    }
    
    // Si échec et encore des retries disponibles
    if (retryCount < this.maxRetries - 1) {
      console.log(`⚠️ Image invalide, retry ${retryCount + 2}...`);
      // Délai progressif: 2s, 4s, 6s...
      await new Promise(r => setTimeout(r, 2000 + retryCount * 2000));
      return await this.generateImage(prompt, retryCount + 1, character);
    }
    
    // Dernière tentative: fallback sur Pollinations
    console.log('🔄 Fallback sur Pollinations AI...');
    return await this.generateWithPollinations(prompt, character);
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
  /**
   * v5.4.19 - Génère une image avec POLLINATIONS AI (Cloud)
   * URL: https://image.pollinations.ai/prompt/
   * Paramètres: model=flux, safe=false (NSFW), enhance=true
   * FIX CRITIQUE: Si le marker [NSFW_LEVEL_X] est présent, utiliser le prompt DIRECTEMENT
   * Le marker est AUTORITATIF - il vient de generateSceneImage avec les tenues/poses correctes
   */
  async generateWithPollinations(prompt, character = null) {
    console.log('☁️ POLLINATIONS AI: Génération cloud (model=flux, safe=false, NSFW activé)...');
    
    await this.waitForRateLimit();
    
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    const pollinationsUrl = 'https://image.pollinations.ai/prompt/';
    const lowerPrompt = prompt.toLowerCase();
    
    // v5.4.19 - Détecter le niveau NSFW via le marker [NSFW_LEVEL_X]
    // CE MARKER EST LA SOURCE AUTORITAIRE - il est ajouté par generateSceneImage
    const nsfwMatch = prompt.match(/\[NSFW_LEVEL_(\d+)\]/);
    const nsfwLevel = nsfwMatch ? parseInt(nsfwMatch[1]) : 0;
    const isNSFW = nsfwLevel >= 2;
    
    // v5.4.19 - FIX CRITIQUE: SI LE MARKER EST PRÉSENT, UTILISER LE PROMPT DIRECTEMENT
    // Le prompt vient de generateSceneImage avec:
    // - getOutfitByLevel(level) : tenues par niveau (mini dress niveau 2, lingerie niveau 3, etc.)
    // - getPoseByLevel(level) : poses par niveau
    // - NSFW reinforcement keywords
    // NE PAS reconstruire le prompt car ça ÉCRASE ces tenues/poses!
    if (isNSFW) {
      console.log(`🔞 v5.4.19 FIX: MARKER [NSFW_LEVEL_${nsfwLevel}] DÉTECTÉ`);
      console.log(`🔞 UTILISATION DIRECTE du prompt original avec tenues/poses niveau ${nsfwLevel}`);
      
      // Nettoyer le marker NSFW du prompt
      let cleanPrompt = prompt.replace(/\[NSFW_LEVEL_\d+\]\s*/g, '');
      
      // v5.4.22 - QUALITÉ ET ANTI-DÉFAUTS RENFORCÉS
      cleanPrompt += ', masterpiece, best quality, ultra detailed, 8K resolution, sharp focus';
      cleanPrompt += ', ((anatomically correct)), ((perfect human anatomy)), ((correct proportions))';
      cleanPrompt += ', ((exactly one person)), ((correct number of limbs))';
      cleanPrompt += ', ((exactly two arms attached to shoulders)), ((exactly two legs attached to hips))';
      cleanPrompt += ', ((five fingers on each hand)), ((two hands)), ((two feet))';
      cleanPrompt += ', ((beautiful detailed face)), ((symmetrical face)), ((two eyes)), ((one nose)), ((one mouth))';
      cleanPrompt += ', ((natural breast shape)), ((breasts on chest not stomach))';
      cleanPrompt += ', ((legs bending naturally)), ((knees forward not backward))';
      cleanPrompt += ', ((clothes separate from skin)), NOT deformed, NOT distorted, NOT mutated';
      cleanPrompt += ', NOT extra limbs, NOT merged body parts, NOT fused fingers';
      cleanPrompt += ', professional photography quality, studio lighting';
      
      const shortPrompt = cleanPrompt.substring(0, 2400);
      const encodedPrompt = encodeURIComponent(shortPrompt);
      const imageUrl = `${pollinationsUrl}${encodedPrompt}?width=576&height=1024&seed=${seed}&nologo=true&model=flux&enhance=true&safe=false&nofeed=true`;
      
      console.log(`📝 PROMPT NSFW DIRECT Niveau ${nsfwLevel}:`);
      console.log(`📝 Tenue/Pose du prompt: ${shortPrompt.substring(0, 600)}...`);
      return imageUrl;
    }
    
    // === MODE SFW (pas de marker ou niveau 1) ===
    // Détecter si anime ou réaliste
    const isAnime = lowerPrompt.includes('anime') || lowerPrompt.includes('manga');
    const isRealistic = lowerPrompt.includes('realistic') || lowerPrompt.includes('photo');
    
    // Fallback: Vérifier si contenu NSFW présent sans marker (cas rare)
    const hasNSFWContent = lowerPrompt.includes('lingerie') || 
                          lowerPrompt.includes('topless') || 
                          lowerPrompt.includes('nude') ||
                          lowerPrompt.includes('naked') ||
                          lowerPrompt.includes('breasts') ||
                          lowerPrompt.includes('nipples') ||
                          lowerPrompt.includes('panties') ||
                          lowerPrompt.includes('bra ') ||
                          lowerPrompt.includes('thong') ||
                          lowerPrompt.includes('corset') ||
                          lowerPrompt.includes('stockings') ||
                          lowerPrompt.includes('garter') ||
                          lowerPrompt.includes('bodysuit') ||
                          lowerPrompt.includes('negligee') ||
                          lowerPrompt.includes('sensual') ||
                          lowerPrompt.includes('provocative') ||
                          lowerPrompt.includes('cleavage') ||
                          lowerPrompt.includes('erotic') ||
                          lowerPrompt.includes('explicit') ||
                          lowerPrompt.includes('nightgown') ||
                          lowerPrompt.includes('catsuit') ||
                          lowerPrompt.includes('mini dress') ||
                          lowerPrompt.includes('slip dress') ||
                          lowerPrompt.includes('fishnet') ||
                          lowerPrompt.includes('sheer');
    
    if (hasNSFWContent) {
      console.log('🔞 v5.4.22: Contenu NSFW détecté sans marker - utilisation directe');
      let cleanPrompt = prompt.replace(/\[NSFW_LEVEL_\d+\]\s*/g, '');
      cleanPrompt += ', masterpiece, best quality, ultra detailed, 8K';
      cleanPrompt += ', ((anatomically correct)), ((perfect anatomy)), ((correct proportions))';
      cleanPrompt += ', ((exactly two arms)), ((exactly two legs)), ((five fingers each hand))';
      cleanPrompt += ', ((natural breast shape)), ((correct body structure))';
      cleanPrompt += ', NOT deformed, NOT extra limbs, NOT mutated';
      
      const shortPrompt = cleanPrompt.substring(0, 2400);
      const encodedPrompt = encodeURIComponent(shortPrompt);
      const imageUrl = `${pollinationsUrl}${encodedPrompt}?width=576&height=1024&seed=${seed}&nologo=true&model=flux&enhance=true&safe=false&nofeed=true`;
      
      console.log(`📝 Prompt NSFW FALLBACK (${shortPrompt.length} chars): ${shortPrompt.substring(0, 400)}...`);
      return imageUrl;
    }
    
    // === v5.4.0 - UTILISER imagePrompt SEULEMENT EN MODE SFW ===
    // En mode NSFW, ne PAS utiliser imagePrompt car il contient la tenue du personnage
    let finalPrompt = '';
    
    // Si character.imagePrompt existe ET qu'on est en mode SFW, l'utiliser
    if (character && character.imagePrompt) {
      console.log('🎯 Mode SFW: UTILISATION imagePrompt DIRECT (priorité max)');
      finalPrompt = 'FULL BODY SHOT from head to feet, complete figure visible, ' + character.imagePrompt;
      
      // Vérifier si c'est un personnage rond/curvy et renforcer
      const imgPromptLower = character.imagePrompt.toLowerCase();
      const physDescLower = (character.physicalDescription || '').toLowerCase();
      const combinedText = imgPromptLower + ' ' + physDescLower;
      
      // v5.3.66 - Déterminer la catégorie depuis imagePrompt/physicalDescription
      let imgCategory = 'unknown';
      if (combinedText.includes('très rond') || combinedText.includes('bbw') || combinedText.includes('obèse') ||
          combinedText.includes('very fat') || combinedText.includes('big belly')) {
        imgCategory = 'bbw_big_belly';
      } else if (combinedText.includes('ronde') || combinedText.includes('potelé') || combinedText.includes('enrobé') ||
                 combinedText.includes('chubby') || combinedText.includes('plump')) {
        imgCategory = 'chubby_small_belly';
      } else if (combinedText.includes('voluptu') || combinedText.includes('pulpeu') || combinedText.includes('généreus') ||
                 combinedText.includes('plantureu') || combinedText.includes('curvy') || combinedText.includes('hourglass')) {
        imgCategory = 'curvy_no_belly';
      }
      
      // Appliquer le renforcement selon la catégorie
      if (imgCategory === 'bbw_big_belly') {
        finalPrompt += ', BBW fat body, BIG FAT ROUND BELLY visible, fat chubby arms, fat thighs, huge butt, NOT thin, NOT slim, ';
        console.log('🔴 RENFORCEMENT imagePrompt: BBW GROS VENTRE');
      } else if (imgCategory === 'chubby_small_belly') {
        finalPrompt += ', soft plump body, small soft round belly, chubby arms, thick thighs, big soft butt, NOT thin, NOT slim, ';
        console.log('🟠 RENFORCEMENT imagePrompt: RONDE LÉGER VENTRE');
      } else if (imgCategory === 'curvy_no_belly') {
        finalPrompt += ', curvy hourglass, FLAT TONED STOMACH, slim waist, wide hips, big butt, NOT fat belly, NOT round belly, ';
        console.log('🟢 RENFORCEMENT imagePrompt: CURVY SANS VENTRE');
      }
      
      // Ajouter qualité et NSFW si nécessaire
      if (isNSFW) {
        finalPrompt += `, sensual, erotic, [NSFW_LEVEL_${nsfwLevel}]`;
      }
      finalPrompt += ', 8k ultra detailed, masterpiece';
      
      // Encoder et retourner
      const shortPrompt = finalPrompt.substring(0, 1900);
      const encodedPrompt = encodeURIComponent(shortPrompt);
      // v5.4.16 - Ajout safe=false pour NSFW et nofeed=true
      const imageUrl = `${pollinationsUrl}${encodedPrompt}?width=576&height=1024&seed=${seed}&nologo=true&model=flux&enhance=true&safe=false&nofeed=true`;
      console.log(`📝 Prompt FINAL via POLLINATIONS AI (${shortPrompt.length} chars): ${shortPrompt.substring(0, 300)}...`);
      return imageUrl;
    }
    
    // === v5.3.67 - UTILISER LE PROFIL PHYSIQUE PRIORITAIRE (PERSISTANT) ===
    let physicalDetails;
    let priorityPhysicalPrompt = '';
    
    if (character) {
      console.log('📋 Utilisation données CHARACTER avec profil prioritaire');
      physicalDetails = this.extractPhysicalDetailsFromCharacter(character);
      priorityPhysicalPrompt = this.buildPriorityPhysicalPrompt(character);
    } else {
      console.log('📋 Extraction depuis le prompt texte (pas de cache)');
      physicalDetails = this.extractAllPhysicalDetails(prompt);
    }
    console.log('📋 Détails physiques:', JSON.stringify(physicalDetails).substring(0, 300));
    
    // 1. FULL BODY SHOT EN PREMIER
    finalPrompt += 'FULL BODY SHOT from head to feet, complete figure visible, ';
    
    // 2. v5.3.67 - PROFIL PHYSIQUE PRIORITAIRE (s'il existe)
    if (priorityPhysicalPrompt) {
      finalPrompt += priorityPhysicalPrompt + ', ';
      console.log('✅ Profil physique prioritaire ajouté EN PREMIER');
    }
    
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
    
    // 7. === v5.3.66 - MORPHOLOGIE / CORPS - EMPHASE ULTRA FORTE avec CATÉGORIE ===
    if (physicalDetails.bodyType) {
      // Ajouter 3 fois pour emphase maximale
      finalPrompt += `${physicalDetails.bodyType}, ${physicalDetails.bodyType}, ${physicalDetails.bodyType}, `;
      console.log(`🏋️ Morphologie (x3): ${physicalDetails.bodyType}`);
      
      // v5.3.66 - RENFORCEMENT basé sur la CATÉGORIE (plus fiable)
      const cat = physicalDetails.bodyCategory || '';
      console.log(`🏷️ Catégorie corps: ${cat}`);
      
      if (cat === 'bbw_big_belly') {
        // TRÈS RONDE = GROS ventre obligatoire
        finalPrompt += 'BBW fat body, BIG FAT ROUND BELLY visible, fat chubby arms, very fat thick thighs, huge fat butt, overweight, NOT thin, NOT slim, NOT fit, ';
        console.log('🔴 RENFORCEMENT BBW: GROS VENTRE');
      } else if (cat === 'chubby_small_belly') {
        // RONDE = LÉGER ventre
        finalPrompt += 'soft plump chubby body, small soft round belly, soft chubby arms, thick soft thighs, big soft butt, NOT thin, NOT slim, NOT athletic, ';
        console.log('🟠 RENFORCEMENT RONDE: LÉGER VENTRE');
      } else if (cat === 'curvy_no_belly') {
        // VOLUPTUEUSE/PULPEUSE = PAS de ventre, courbes sexy
        finalPrompt += 'curvy hourglass figure, FLAT TONED STOMACH, slim narrow waist, wide curvy hips, big round butt, NOT fat belly, NOT chubby belly, NOT round belly, ';
        console.log('🟢 RENFORCEMENT CURVY: SANS VENTRE');
      } else if (cat === 'athletic') {
        finalPrompt += 'athletic toned fit body, flat muscular stomach, toned arms, toned legs, firm butt, ';
        console.log('💪 RENFORCEMENT ATHLETIC');
      } else if (cat === 'slim') {
        finalPrompt += 'slim thin body, flat stomach, slim arms, slim legs, small butt, ';
        console.log('🔵 RENFORCEMENT SLIM');
      }
    } else {
      // v5.3.66 - Si pas de bodyType, analyser physicalDescription avec catégorie
      if (character && character.physicalDescription) {
        const pd = character.physicalDescription.toLowerCase();
        let pdCategory = 'unknown';
        
        // Déterminer la catégorie (ordre important: très rond avant rond!)
        if (pd.includes('très rond') || pd.includes('bbw') || pd.includes('95kg') || pd.includes('100kg') || pd.includes('obèse')) {
          pdCategory = 'bbw_big_belly';
        } else if (pd.includes('ronde') || pd.includes('potelé') || pd.includes('enrobé') || pd.includes('chubby')) {
          pdCategory = 'chubby_small_belly';
        } else if (pd.includes('voluptu') || pd.includes('pulpeu') || pd.includes('généreus') || pd.includes('plantureu')) {
          pdCategory = 'curvy_no_belly';
        }
        
        // Appliquer renforcement selon catégorie
        if (pdCategory === 'bbw_big_belly') {
          finalPrompt += 'BBW fat body, BIG FAT ROUND BELLY visible, fat arms, fat thighs, huge butt, NOT thin, NOT slim, ';
          console.log('🔴 RENFORCEMENT physicalDesc: BBW GROS VENTRE');
        } else if (pdCategory === 'chubby_small_belly') {
          finalPrompt += 'soft plump body, small soft round belly, chubby arms, thick thighs, big soft butt, NOT thin, ';
          console.log('🟠 RENFORCEMENT physicalDesc: RONDE LÉGER VENTRE');
        } else if (pdCategory === 'curvy_no_belly') {
          finalPrompt += 'curvy hourglass, FLAT TONED STOMACH, slim waist, wide hips, big butt, NOT fat belly, ';
          console.log('🟢 RENFORCEMENT physicalDesc: CURVY SANS VENTRE');
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
    
    // v5.4.16 - Ratio 9:16 avec mode NSFW activé
    // safe=false permet le contenu NSFW, enhance=true améliore la qualité
    const imageUrl = `${pollinationsUrl}${encodedPrompt}?width=576&height=1024&seed=${seed}&nologo=true&model=flux&enhance=true&safe=false&nofeed=true`;
    
    console.log(`🔗 URL POLLINATIONS AI (seed: ${seed}, NSFW: ${nsfwLevel}, safe=false)`);
    console.log(`📝 Prompt FINAL via POLLINATIONS (${shortPrompt.length} chars): ${shortPrompt.substring(0, 400)}...`);
    
    return imageUrl;
  }
  
  /**
   * v5.3.75 - CACHE des profils physiques pour persistance
   * Garantit que le même personnage a toujours la même apparence
   * v5.3.75 - Cache invalidé à chaque nouvelle version pour appliquer les améliorations
   */
  physicalProfileCache = {};
  cacheVersion = '5.4.4'; // Incrémenter pour invalider le cache
  
  /**
   * v5.3.75 - Génère une clé unique pour un personnage basée sur ses attributs physiques
   * Inclut la version pour invalider le cache lors des mises à jour
   */
  getCharacterPhysicalKey(character) {
    if (!character) return 'unknown';
    const parts = [
      this.cacheVersion, // v5.3.75 - Inclure la version pour invalider le cache
      character.id || character.name || 'anon',
      character.gender || '',
      character.bodyType || '',
      character.bust || '',
      character.hairColor || '',
      character.eyeColor || '',
    ];
    return parts.join('_').toLowerCase().replace(/\s+/g, '_');
  }
  
  /**
   * v5.3.67 - Construit le PROMPT PHYSIQUE COMPLET en PRIORITÉ ABSOLUE
   * Ce prompt est placé EN PREMIER dans toutes les générations d'images
   * Inclut: taille, poids, morphologie, bras, jambes, ventre, visage, cheveux, yeux, corps
   */
  buildPriorityPhysicalPrompt(character) {
    if (!character) return '';
    
    // Vérifier le cache pour persistance
    const cacheKey = this.getCharacterPhysicalKey(character);
    if (this.physicalProfileCache[cacheKey]) {
      console.log(`💾 Profil physique en cache pour: ${cacheKey}`);
      return this.physicalProfileCache[cacheKey];
    }
    
    const parts = [];
    const physicalDetails = this.extractPhysicalDetailsFromCharacter(character);
    
    // === 1. GENRE (OBLIGATOIRE EN PREMIER) ===
    if (physicalDetails.gender === 'female') {
      parts.push('beautiful woman, female');
    } else if (physicalDetails.gender === 'male') {
      parts.push('handsome man, male');
    } else if (physicalDetails.gender === 'non-binary') {
      parts.push('androgynous person, non-binary');
    }
    
    // === v5.3.75 - POITRINE EN PRIORITÉ ABSOLUE #2 (femmes) ===
    // TRIPLE emphase pour forcer la génération correcte de la taille de poitrine
    if (physicalDetails.gender === 'female' && character.bust) {
      // 1. Prompt ultra-prioritaire (avec parenthèses pour poids)
      const ultraPriority = this.getBustUltraPriority(character.bust, 'female');
      if (ultraPriority) {
        parts.push(ultraPriority);
      }
      
      // 2. Description détaillée depuis extractPhysicalDetails
      if (physicalDetails.bust) {
        parts.push(physicalDetails.bust);
      }
      
      // 3. Emphase additionnelle
      const bustEmphasis = this.getBustEmphasis(character.bust);
      if (bustEmphasis) {
        parts.push(bustEmphasis);
      }
      
      console.log(`👙 POITRINE TRIPLE PRIORITÉ: ${character.bust} -> ${ultraPriority}`);
    } else if (physicalDetails.bust && physicalDetails.gender === 'female') {
      // Fallback si pas de character.bust direct
      parts.push(physicalDetails.bust);
      console.log(`👙 POITRINE (fallback): ${physicalDetails.bust}`);
    }
    
    // === 3. ÂGE ===
    if (physicalDetails.age) {
      parts.push(`${physicalDetails.age} years old`);
    }
    
    // === 4. MORPHOLOGIE / CORPS ===
    if (physicalDetails.bodyType) {
      parts.push(physicalDetails.bodyType);
      // Répéter pour emphase
      if (physicalDetails.bodyCategory) {
        if (physicalDetails.bodyCategory === 'bbw_big_belly') {
          parts.push('BBW body, BIG FAT ROUND BELLY visible, fat chubby body');
        } else if (physicalDetails.bodyCategory === 'chubby_small_belly') {
          parts.push('plump body, small soft belly, chubby soft body');
        } else if (physicalDetails.bodyCategory === 'curvy_no_belly') {
          parts.push('curvy hourglass, FLAT STOMACH, slim waist');
        }
      }
    }
    
    // === 5. PÉNIS (hommes, NSFW) ===
    if (physicalDetails.penis && physicalDetails.gender === 'male') {
      parts.push(physicalDetails.penis);
    }
    
    // === 6. VENTRE (spécifique) ===
    if (physicalDetails.belly) {
      parts.push(physicalDetails.belly);
    }
    
    // === 7. FESSES ===
    if (physicalDetails.butt) {
      parts.push(physicalDetails.butt);
    }
    
    // === 8. HANCHES ===
    if (physicalDetails.hips) {
      parts.push(physicalDetails.hips);
    }
    
    // === 9. CUISSES ===
    if (physicalDetails.thighs) {
      parts.push(physicalDetails.thighs);
    }
    
    // === 10. BRAS ===
    if (physicalDetails.arms) {
      parts.push(physicalDetails.arms);
    }
    
    // === 11. TAILLE / HAUTEUR ===
    if (physicalDetails.height) {
      parts.push(physicalDetails.height);
    }
    
    // === 12. POIDS (si spécifié) ===
    if (physicalDetails.weight) {
      parts.push(physicalDetails.weight);
    }
    
    // === 13. VISAGE ===
    if (physicalDetails.faceShape) {
      parts.push(physicalDetails.faceShape);
    }
    
    // === 14. CHEVEUX - COULEUR ===
    if (physicalDetails.hairColor) {
      parts.push(`${physicalDetails.hairColor} hair`);
    }
    
    // === 15. CHEVEUX - LONGUEUR ===
    if (physicalDetails.hairLength) {
      parts.push(`${physicalDetails.hairLength} hair`);
    }
    
    // === 16. CHEVEUX - STYLE ===
    if (physicalDetails.hairStyle) {
      parts.push(`${physicalDetails.hairStyle} hair`);
    }
    
    // === 17. YEUX ===
    if (physicalDetails.eyeColor) {
      parts.push(`${physicalDetails.eyeColor} eyes`);
    }
    
    // === 18. PEAU ===
    if (physicalDetails.skinTone) {
      parts.push(`${physicalDetails.skinTone} skin`);
    }
    
    // Construire le prompt final
    const priorityPrompt = parts.join(', ');
    
    // Mettre en cache pour persistance
    this.physicalProfileCache[cacheKey] = priorityPrompt;
    console.log(`✅ Profil physique créé et mis en cache: ${cacheKey}`);
    console.log(`📋 Profil: ${priorityPrompt.substring(0, 200)}...`);
    
    return priorityPrompt;
  }
  
  /**
   * v5.3.60 - Extrait TOUS les détails physiques de l'objet character
   * v5.3.67 - Amélioré avec bras, jambes, visage, poids, style cheveux
   */
  extractPhysicalDetailsFromCharacter(character) {
    const details = {
      gender: null,
      age: null,
      hairColor: null,
      hairLength: null,
      hairStyle: null,  // v5.3.67
      eyeColor: null,
      skinTone: null,
      height: null,
      weight: null,     // v5.3.67
      bodyType: null,
      bodyCategory: null, // v5.3.66
      bust: null,
      penis: null,
      butt: null,
      hips: null,
      thighs: null,
      belly: null,
      arms: null,       // v5.3.67
      faceShape: null,  // v5.3.67
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
    
    // === v5.3.66 - MORPHOLOGIE PRÉCISE avec CATÉGORIE SAUVEGARDÉE ===
    // VOLUPTUEUSE/PULPEUSE = Courbes sexy SANS ventre (taille fine)
    // RONDE = Potelée avec LÉGER ventre
    // TRÈS RONDE = Grosse avec GROS ventre
    // CATÉGORIES: 'slim', 'athletic', 'average', 'curvy_no_belly', 'chubby_small_belly', 'bbw_big_belly'
    const bodyPatterns = {
      // Mince -> catégorie 'slim'
      'très mince|very thin|maigre|skinny': { desc: 'very slim thin body, flat stomach, slim arms, slim legs, small butt', cat: 'slim' },
      'mince|slim|slender|fine': { desc: 'slim slender body, flat stomach, toned arms, slim legs, small firm butt', cat: 'slim' },
      'élancé|élancée|tall slender': { desc: 'slender elegant tall body, flat stomach, long slim arms, long slim legs', cat: 'slim' },
      // Athlétique -> catégorie 'athletic'
      'athlétique|athletic|musclé|muscular|toned|fit': { desc: 'athletic toned fit body, flat stomach, muscular arms, toned legs, firm round butt', cat: 'athletic' },
      // Moyenne -> catégorie 'average'
      'moyenne|average|normal': { desc: 'average balanced body, flat stomach, normal arms, normal legs, average butt', cat: 'average' },
      // === VOLUPTUEUSE/PULPEUSE = SANS ventre -> catégorie 'curvy_no_belly' ===
      'voluptueuse|voluptueux|voluptuous': { desc: 'voluptuous curvy hourglass body, FLAT STOMACH, slim waist, wide hips, big breasts, curvy thighs, big round butt, NO belly', cat: 'curvy_no_belly' },
      'généreuse|généreux|generous': { desc: 'generous curves, full-figured body, FLAT STOMACH, slim waist, curvy hips, soft arms, thick thighs, big butt, NO belly', cat: 'curvy_no_belly' },
      'pulpeuse|pulpeux|thick': { desc: 'thick curvy body, FLAT STOMACH, slim waist, wide hips, full thighs, big round butt, soft arms, NO belly', cat: 'curvy_no_belly' },
      'plantureuse|plantureux|buxom': { desc: 'buxom body, big breasts, FLAT STOMACH, slim waist, wide hips, curvy thighs, big butt, NO belly', cat: 'curvy_no_belly' },
      // === RONDE = LÉGER ventre -> catégorie 'chubby_small_belly' ===
      'ronde|rond|chubby|plump|potelé|potelée': { desc: 'soft plump body, SLIGHTLY CHUBBY, small soft belly, soft chubby arms, thick soft thighs, big soft butt', cat: 'chubby_small_belly' },
      'enrobé|enrobée': { desc: 'plump soft body, SLIGHTLY CHUBBY, small round belly, soft arms, thick thighs, big soft butt', cat: 'chubby_small_belly' },
      // === TRÈS RONDE = GROS ventre -> catégorie 'bbw_big_belly' ===
      'très ronde|très rond|very curvy|bbw': { desc: 'BBW very fat body, BIG ROUND BELLY, fat arms, very thick fat thighs, huge butt, overweight, plus size', cat: 'bbw_big_belly' },
      'corps très rond': { desc: 'very fat round body, HUGE BELLY, chubby fat arms, very fat thick thighs, massive butt, BBW, obese', cat: 'bbw_big_belly' },
      // Maternelle -> catégorie 'chubby_small_belly'
      'maternelle|maternel|maternal|milf': { desc: 'soft maternal curvy body, small soft belly, soft arms, curvy thighs, big motherly butt', cat: 'chubby_small_belly' },
    };
    
    // D'abord vérifier character.bodyType
    if (character.bodyType) {
      const lb = character.bodyType.toLowerCase();
      for (const [pattern, data] of Object.entries(bodyPatterns)) {
        if (new RegExp(pattern).test(lb)) { 
          details.bodyType = data.desc; 
          details.bodyCategory = data.cat; // v5.3.66 - Sauvegarder la catégorie
          break; 
        }
      }
      if (!details.bodyType) {
        // === v5.3.66 - Mapping direct avec CATÉGORIE ===
        const directMap = {
          'mince': { desc: 'slim slender body, flat stomach, slim arms and legs', cat: 'slim' },
          'moyenne': { desc: 'average balanced body, flat stomach', cat: 'average' },
          'athlétique': { desc: 'athletic toned fit body, flat stomach, muscular', cat: 'athletic' },
          // VOLUPTUEUSE/PULPEUSE = PAS de ventre
          'voluptueuse': { desc: 'voluptuous curvy hourglass, FLAT STOMACH, slim waist, wide hips, big breasts, curvy thighs, big butt, NO belly', cat: 'curvy_no_belly' },
          'généreuse': { desc: 'generous curves, FLAT STOMACH, slim waist, curvy hips, thick thighs, big butt, NO belly', cat: 'curvy_no_belly' },
          'pulpeuse': { desc: 'thick curvy body, FLAT STOMACH, slim waist, wide hips, full thighs, big butt, NO belly', cat: 'curvy_no_belly' },
          'plantureuse': { desc: 'buxom body, big breasts, FLAT STOMACH, wide hips, big butt, NO belly', cat: 'curvy_no_belly' },
          // RONDE = LÉGER ventre
          'ronde': { desc: 'soft plump body, SMALL SOFT BELLY, chubby arms, thick thighs, big soft butt', cat: 'chubby_small_belly' },
          'potelée': { desc: 'cute plump body, SMALL BELLY, soft arms, thick thighs, round butt', cat: 'chubby_small_belly' },
          'enrobée': { desc: 'plump soft body, SMALL ROUND BELLY, soft arms, thick thighs, big butt', cat: 'chubby_small_belly' },
          // TRÈS RONDE = GROS ventre
          'très ronde': { desc: 'BBW very fat body, BIG FAT BELLY, fat arms, very fat thighs, huge butt, overweight', cat: 'bbw_big_belly' },
        };
        const mapped = directMap[lb];
        if (mapped) {
          details.bodyType = mapped.desc;
          details.bodyCategory = mapped.cat;
        } else {
          details.bodyType = character.bodyType;
          details.bodyCategory = 'unknown';
        }
      }
    }
    
    // Ensuite chercher dans physicalDescription
    if (!details.bodyType) {
      // Vérifier d'abord les patterns composés - TRÈS RONDE en premier (ordre important!)
      if (fullText.includes('très rond') || fullText.includes('very round') || fullText.includes('bbw') || fullText.includes('obèse')) {
        details.bodyType = 'BBW very fat body, BIG FAT BELLY, fat arms, very fat thighs, huge butt, overweight';
        details.bodyCategory = 'bbw_big_belly';
        console.log('🔴 Détecté: très rond -> BBW avec GROS ventre');
      } else if (fullText.includes('ronde') || fullText.includes('potelé') || fullText.includes('enrobé') || fullText.includes('chubby') || fullText.includes('plump')) {
        details.bodyType = 'soft plump body, SMALL SOFT BELLY, chubby arms, thick thighs, big soft butt';
        details.bodyCategory = 'chubby_small_belly';
        console.log('🔴 Détecté: ronde -> LÉGER ventre');
      } else if (fullText.includes('voluptue') || fullText.includes('pulpeu') || fullText.includes('généreus') || fullText.includes('plantureu')) {
        details.bodyType = 'voluptuous curvy hourglass, FLAT STOMACH, slim waist, wide hips, curvy thighs, big butt, NO belly';
        details.bodyCategory = 'curvy_no_belly';
        console.log('🔴 Détecté: voluptueuse/pulpeuse -> SANS ventre');
      } else {
        for (const [pattern, data] of Object.entries(bodyPatterns)) {
          if (new RegExp(pattern, 'i').test(fullText)) { 
            details.bodyType = data.desc; 
            details.bodyCategory = data.cat;
            break; 
          }
        }
      }
    }
    
    // v5.3.66 - Si toujours pas de catégorie, la deviner depuis bodyType
    if (!details.bodyCategory && details.bodyType) {
      const bt = details.bodyType.toLowerCase();
      if (bt.includes('bbw') || bt.includes('very fat') || bt.includes('big belly') || bt.includes('huge belly')) {
        details.bodyCategory = 'bbw_big_belly';
      } else if (bt.includes('chubby') || bt.includes('plump') || bt.includes('small belly') || bt.includes('soft belly')) {
        details.bodyCategory = 'chubby_small_belly';
      } else if (bt.includes('curvy') || bt.includes('hourglass') || bt.includes('flat stomach') || bt.includes('no belly')) {
        details.bodyCategory = 'curvy_no_belly';
      } else if (bt.includes('athletic') || bt.includes('toned') || bt.includes('muscular')) {
        details.bodyCategory = 'athletic';
      } else if (bt.includes('slim') || bt.includes('thin') || bt.includes('slender')) {
        details.bodyCategory = 'slim';
      } else {
        details.bodyCategory = 'average';
      }
    }
    
    console.log(`🏋️ MORPHOLOGIE FINALE: ${details.bodyType || 'non détectée'} | Catégorie: ${details.bodyCategory || 'inconnue'}`);
    
    // === v5.3.60 - POITRINE - ANALYSE COMPLÈTE ===
    const isFemale = details.gender === 'female' || fullText.includes('femme') || fullText.includes('woman');
    
    if (isFemale) {
      // === v5.3.65 - TAILLES DE POITRINE RÉALISTES ET DÉTAILLÉES ===
      // D'abord character.bust
      if (character.bust) {
        const bustMap = {
          'A': 'VERY SMALL A-CUP breasts, nearly flat chest, small nipples, barely visible cleavage, petite bust',
          'B': 'SMALL B-CUP breasts, petite modest bust, small perky breasts, subtle cleavage, youthful',
          'C': 'MEDIUM C-CUP breasts, average sized breasts, natural round shape, normal cleavage, proportionate',
          'D': 'LARGE D-CUP breasts, big full round breasts, visible cleavage, heavy bust, attractive',
          'DD': 'VERY LARGE DD-CUP breasts, big heavy breasts, deep prominent cleavage, bouncy, voluptuous',
          'E': 'HUGE E-CUP breasts, very big heavy breasts, massive deep cleavage, bouncy jiggling, busty',
          'F': 'HUGE F-CUP breasts, enormous heavy breasts, huge deep cleavage, very bouncy, extremely busty',
          'G': 'GIGANTIC G-CUP breasts, extremely large heavy breasts, massive cleavage, giant bust, extremely busty',
          'H': 'MASSIVE H-CUP breasts, impossibly huge heavy breasts, enormous cleavage, gigantic bust',
          'I': 'COLOSSAL I-CUP breasts, extremely massive heavy breasts, gigantic bust, huge heavy',
        };
        details.bust = bustMap[character.bust.toUpperCase()] || `${character.bust}-cup breasts`;
      }
      
      // Chercher dans physicalDescription
      if (!details.bust) {
        const bustPatterns = {
          // Petites poitrines (A-B)
          'bonnet a|a-cup|très petite poitrine|flat chest|presque plate': 'VERY SMALL A-CUP breasts, nearly flat chest, small nipples',
          'bonnet b|b-cup|petite poitrine|petits seins|modest': 'SMALL B-CUP breasts, petite modest bust, small perky',
          // Moyenne (C)
          'bonnet c|c-cup|poitrine moyenne|average|normal': 'MEDIUM C-CUP breasts, average sized, natural round shape',
          // Grosses (D-DD)
          'bonnet d|d-cup|belle poitrine|grosse poitrine|big breast': 'LARGE D-CUP breasts, big full round breasts, visible cleavage',
          'bonnet dd|dd-cup|très grosse poitrine|very large': 'VERY LARGE DD-CUP breasts, big heavy breasts, deep cleavage',
          // Énormes (E-F)
          'bonnet e|e-cup|énorme poitrine|huge breast': 'HUGE E-CUP breasts, very big heavy breasts, massive cleavage',
          'bonnet f|f-cup|poitrine massive|massive breast': 'HUGE F-CUP breasts, enormous heavy breasts, huge cleavage',
          // Gigantesques (G-H-I)
          'bonnet g|g-cup|poitrine gigantesque|gigantic': 'GIGANTIC G-CUP breasts, extremely large breasts, massive bust',
          'bonnet h|h-cup|poitrine énorme': 'MASSIVE H-CUP breasts, impossibly huge breasts, enormous bust',
          'bonnet i|i-cup': 'COLOSSAL I-CUP breasts, extremely massive breasts, gigantic bust',
          // Descriptions génériques
          'gros seins|big breasts|large breasts|heavy breasts|poitrine généreuse': 'LARGE full breasts, big bust, visible cleavage',
          'énormes seins|huge breasts|massive breasts|poitrine opulente': 'HUGE MASSIVE breasts, very large heavy bust',
          'petits seins|small breasts|poitrine menue': 'small petite breasts, modest bust',
          'seins fermes|perky breasts|poitrine ferme': 'firm perky breasts, shapely bust',
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
    
    // === v5.3.67 - BRAS ===
    const armPatterns = {
      'gros bras|fat arms|bras potelés|chubby arms': 'chubby fat arms, soft arms',
      'bras fins|slim arms|thin arms': 'slim thin arms',
      'bras musclés|muscular arms|toned arms': 'muscular toned arms',
      'bras doux|soft arms': 'soft plump arms',
    };
    for (const [pattern, value] of Object.entries(armPatterns)) {
      if (new RegExp(pattern, 'i').test(fullText)) { details.arms = value; break; }
    }
    // Auto-détection selon morphologie
    if (!details.arms && details.bodyCategory) {
      if (details.bodyCategory === 'bbw_big_belly') {
        details.arms = 'fat chubby arms';
      } else if (details.bodyCategory === 'chubby_small_belly') {
        details.arms = 'soft chubby arms';
      } else if (details.bodyCategory === 'curvy_no_belly') {
        details.arms = 'soft arms';
      } else if (details.bodyCategory === 'athletic') {
        details.arms = 'toned muscular arms';
      } else if (details.bodyCategory === 'slim') {
        details.arms = 'slim thin arms';
      }
    }
    
    // === v5.3.67 - VISAGE ===
    const facePatterns = {
      'visage rond|round face|joues rondes|chubby face': 'round chubby face, soft cheeks',
      'visage fin|thin face|narrow face': 'thin narrow face, defined cheekbones',
      'visage carré|square face|mâchoire carrée': 'square face, strong jaw',
      'visage ovale|oval face': 'oval face, balanced features',
      'visage doux|soft face|sweet face': 'soft sweet face, gentle features',
      'visage angulaire|angular face': 'angular face, sharp features',
      'double menton|double chin': 'double chin, chubby face',
    };
    for (const [pattern, value] of Object.entries(facePatterns)) {
      if (new RegExp(pattern, 'i').test(fullText)) { details.faceShape = value; break; }
    }
    // Auto-détection selon morphologie
    if (!details.faceShape && details.bodyCategory) {
      if (details.bodyCategory === 'bbw_big_belly') {
        details.faceShape = 'round chubby face, double chin';
      } else if (details.bodyCategory === 'chubby_small_belly') {
        details.faceShape = 'round soft face, chubby cheeks';
      }
    }
    
    // === v5.3.67 - POIDS ===
    const weightMatch = fullText.match(/(\d{2,3})\s*kg/i);
    if (weightMatch) {
      const weight = parseInt(weightMatch[1]);
      if (weight < 50) details.weight = 'very light weight (under 50kg)';
      else if (weight < 60) details.weight = 'slim weight (50-60kg)';
      else if (weight < 70) details.weight = 'average weight (60-70kg)';
      else if (weight < 85) details.weight = 'curvy weight (70-85kg)';
      else if (weight < 100) details.weight = 'plump weight (85-100kg), chubby';
      else details.weight = 'heavy weight (100kg+), BBW, very chubby';
      console.log(`⚖️ POIDS: ${weight}kg -> ${details.weight}`);
    }
    
    // === v5.3.67 - STYLE CHEVEUX ===
    const hairStylePatterns = {
      'cheveux bouclés|curly hair|boucles': 'curly hair, bouncy curls',
      'cheveux raides|straight hair|lisses': 'straight sleek hair',
      'cheveux ondulés|wavy hair|ondulations': 'wavy flowing hair',
      'cheveux crépus|kinky hair|afro': 'kinky afro hair',
      'queue de cheval|ponytail': 'ponytail hairstyle',
      'chignon|bun': 'hair in bun',
      'tresse|braid|nattes': 'braided hair',
      'cheveux attachés|tied hair': 'tied up hair',
      'cheveux lâchés|loose hair': 'loose flowing hair',
    };
    for (const [pattern, value] of Object.entries(hairStylePatterns)) {
      if (new RegExp(pattern, 'i').test(fullText)) { details.hairStyle = value; break; }
    }
    
    console.log(`📋 DÉTAILS PHYSIQUES COMPLETS: genre=${details.gender}, age=${details.age}, morpho=${details.bodyCategory}, cheveux=${details.hairColor}/${details.hairLength}, yeux=${details.eyeColor}, peau=${details.skinTone}`);
    
    return details;
  }

  /**
   * v5.3.77 - Extrait et formate les informations du profil utilisateur pour la génération d'images
   * Inclut: pseudo, genre, âge, taille bonnet (femmes), taille pénis (hommes)
   * Ces informations peuvent être utilisées pour personnaliser les images selon les préférences
   * @param {Object} userProfile - Profil utilisateur
   * @param {boolean} isNSFW - Mode NSFW activé
   * @returns {Object} Informations formatées pour l'image
   */
  extractUserProfileForImage(userProfile, isNSFW = false) {
    if (!userProfile) return null;
    
    const profileInfo = {
      username: null,
      gender: null,
      genderPrompt: null,
      age: null,
      agePrompt: null,
      bust: null,
      bustPrompt: null,
      penis: null,
      penisPrompt: null,
      isAdult: false,
    };
    
    // === PSEUDO ===
    profileInfo.username = userProfile.username || userProfile.pseudo || null;
    
    // === GENRE ===
    const gender = (userProfile.gender || '').toLowerCase();
    if (gender === 'male' || gender === 'homme' || gender === 'masculin') {
      profileInfo.gender = 'male';
      profileInfo.genderPrompt = 'male partner, man';
    } else if (gender === 'female' || gender === 'femme' || gender === 'féminin') {
      profileInfo.gender = 'female';
      profileInfo.genderPrompt = 'female partner, woman';
    } else if (gender === 'non-binary' || gender === 'non-binaire' || gender === 'autre') {
      profileInfo.gender = 'non-binary';
      profileInfo.genderPrompt = 'non-binary partner, androgynous';
    }
    
    // === ÂGE ===
    const age = parseInt(userProfile.age);
    if (!isNaN(age) && age >= 18) {
      profileInfo.age = age;
      profileInfo.isAdult = true;
      
      // Descriptions d'âge pour plus de réalisme
      if (age < 25) {
        profileInfo.agePrompt = 'young adult';
      } else if (age < 35) {
        profileInfo.agePrompt = 'adult';
      } else if (age < 45) {
        profileInfo.agePrompt = 'mature adult';
      } else if (age < 55) {
        profileInfo.agePrompt = 'mature';
      } else {
        profileInfo.agePrompt = 'older mature';
      }
    }
    
    // === TAILLE DE BONNET (femmes) - NSFW UNIQUEMENT ===
    if (isNSFW && profileInfo.gender === 'female' && userProfile.bust) {
      const bust = userProfile.bust.toUpperCase().trim();
      profileInfo.bust = bust;
      
      const bustDescriptions = {
        'A': 'small A-cup breasts, petite chest',
        'B': 'small B-cup breasts, modest bust',
        'C': 'medium C-cup breasts, average bust',
        'D': 'large D-cup breasts, big bust',
        'DD': 'very large DD-cup breasts, heavy bust',
        'E': 'huge E-cup breasts, very large bust',
        'F': 'enormous F-cup breasts, massive bust',
        'G': 'gigantic G-cup breasts, extremely large bust',
        'H': 'massive H-cup breasts, huge bust',
        'I': 'colossal I-cup breasts, enormous bust',
      };
      profileInfo.bustPrompt = bustDescriptions[bust] || null;
      console.log(`👤 USER PROFILE: Femme avec bonnet ${bust}`);
    }
    
    // === TAILLE DE PÉNIS (hommes) - NSFW UNIQUEMENT ===
    if (isNSFW && profileInfo.gender === 'male' && userProfile.penis) {
      const penisSize = parseInt(userProfile.penis);
      if (!isNaN(penisSize)) {
        profileInfo.penis = penisSize;
        
        if (penisSize < 12) {
          profileInfo.penisPrompt = 'small penis';
        } else if (penisSize < 15) {
          profileInfo.penisPrompt = 'average penis';
        } else if (penisSize < 18) {
          profileInfo.penisPrompt = 'big penis, large';
        } else if (penisSize < 22) {
          profileInfo.penisPrompt = 'huge penis, very large';
        } else {
          profileInfo.penisPrompt = 'enormous penis, massive';
        }
        console.log(`👤 USER PROFILE: Homme avec pénis ${penisSize}cm`);
      }
    }
    
    console.log(`👤 USER PROFILE: ${profileInfo.username || 'Anonyme'}, ${profileInfo.gender || 'genre inconnu'}, ${profileInfo.age || '?'} ans, adult=${profileInfo.isAdult}`);
    
    return profileInfo;
  }

  /**
   * v5.3.77 - Génère un prompt basé sur le profil utilisateur pour les images de scène
   * Utile pour personnaliser les images selon qui regarde (le "point de vue")
   * @param {Object} userProfile - Profil utilisateur
   * @param {boolean} isNSFW - Mode NSFW
   * @returns {string} Prompt additionnel basé sur le profil
   */
  buildUserProfilePromptForScene(userProfile, isNSFW = false) {
    const profileInfo = this.extractUserProfileForImage(userProfile, isNSFW);
    if (!profileInfo) return '';
    
    const parts = [];
    
    // En mode NSFW, le personnage peut interagir avec le "viewer" (utilisateur)
    if (isNSFW && profileInfo.isAdult) {
      // Ajouter un contexte de POV (point of view)
      if (profileInfo.gender === 'male') {
        parts.push('POV from male viewer perspective');
      } else if (profileInfo.gender === 'female') {
        parts.push('POV from female viewer perspective');
      }
      
      // Ajouter l'âge du viewer pour le contexte
      if (profileInfo.agePrompt) {
        parts.push(`viewer is ${profileInfo.agePrompt}`);
      }
    }
    
    return parts.length > 0 ? parts.join(', ') : '';
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
   * v5.4.19 - Génère une image avec Stable Diffusion sur serveur FREEBOX
   * Utilise le serveur SD hébergé sur la Freebox
   * URL configurable: http://88.174.155.230:33437/generate
   * FIX CRITIQUE: Si le marker [NSFW_LEVEL_X] est présent, utiliser le prompt DIRECTEMENT
   * Le marker est AUTORITATIF - il vient de generateSceneImage avec les tenues/poses correctes
   */
  async generateWithFreeboxSD(prompt, character = null) {
    console.log('🏠 FREEBOX SD: Génération sur serveur Freebox...');
    
    await this.waitForRateLimit();
    
    // Récupérer l'URL du serveur Freebox
    let freeboxUrl = CustomImageAPIService.getFreeboxUrl();
    if (!freeboxUrl) {
      freeboxUrl = this.freeboxURL || 'http://88.174.155.230:33437/generate';
    }
    
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    const lowerPrompt = prompt.toLowerCase();
    
    // v5.4.19 - Détecter le niveau NSFW via le marker [NSFW_LEVEL_X]
    // CE MARKER EST LA SOURCE AUTORITAIRE - il est ajouté par generateSceneImage
    const nsfwMatch = prompt.match(/\[NSFW_LEVEL_(\d+)\]/);
    const nsfwLevel = nsfwMatch ? parseInt(nsfwMatch[1]) : 0;
    const isNSFW = nsfwLevel >= 2;
    
    let finalPrompt;
    
    // v5.4.19 - FIX CRITIQUE: SI LE MARKER EST PRÉSENT, UTILISER LE PROMPT DIRECTEMENT
    // Le prompt vient de generateSceneImage avec:
    // - getOutfitByLevel(level) : tenues par niveau (mini dress niveau 2, lingerie niveau 3, etc.)
    // - getPoseByLevel(level) : poses par niveau
    // - NSFW reinforcement keywords
    // NE PAS reconstruire le prompt car ça ÉCRASE ces tenues/poses!
    if (isNSFW) {
      console.log(`🔞 v5.4.22 FIX: MARKER [NSFW_LEVEL_${nsfwLevel}] DÉTECTÉ pour Freebox SD`);
      console.log(`🔞 UTILISATION DIRECTE du prompt original avec tenues/poses niveau ${nsfwLevel}`);
      
      // Utiliser le prompt tel quel, il contient déjà les tenues/poses NSFW
      finalPrompt = prompt.replace(/\[NSFW_LEVEL_\d+\]\s*/g, '');
      
      // v5.4.22 - QUALITÉ ET ANTI-DÉFAUTS RENFORCÉS pour Freebox SD
      finalPrompt += ', masterpiece, best quality, ultra detailed, 8K resolution';
      finalPrompt += ', ((anatomically correct)), ((perfect human anatomy)), ((correct proportions))';
      finalPrompt += ', ((exactly one person)), ((exactly two arms)), ((exactly two legs))';
      finalPrompt += ', ((five fingers each hand)), ((natural hand pose))';
      finalPrompt += ', ((beautiful detailed face)), ((symmetrical features))';
      finalPrompt += ', ((natural breast shape)), ((correct breast placement))';
      finalPrompt += ', ((legs bending forward not backward)), ((correct joint anatomy))';
      finalPrompt += ', ((clothes not fused with skin)), ((fabric separate from body))';
      finalPrompt += ', professional quality, sharp focus, detailed';
      
      console.log(`📝 PROMPT NSFW DIRECT Niveau ${nsfwLevel} pour Freebox:`);
      console.log(`📝 Tenue/Pose: ${finalPrompt.substring(0, 500)}...`);
    } else {
      // Mode SFW - construire le prompt normalement
      finalPrompt = prompt.replace(/\[NSFW_LEVEL_\d+\]\s*/g, '');
    }
    
    // Ajouter les prompts de qualité pour SD
    finalPrompt += ', ' + this.anatomyStrictPrompt;
    finalPrompt += ', masterpiece, best quality, ultra detailed, 8K';
    
    if (isNSFW) {
      finalPrompt += ', nsfw, erotic, sensual, sexy, provocative, intimate';
    }
    
    // v5.4.22 - Limiter la longueur pour le serveur Freebox mais garder plus
    const shortPrompt = finalPrompt.substring(0, 2000);
    const encodedPrompt = encodeURIComponent(shortPrompt);
    
    // Construire l'URL avec les paramètres
    const separator = freeboxUrl.includes('?') ? '&' : '?';
    const imageUrl = `${freeboxUrl}${separator}prompt=${encodedPrompt}&width=576&height=1024&seed=${seed}&negative_prompt=${encodeURIComponent(this.negativePromptBase)}`;
    
    console.log(`🏠 URL Freebox SD (seed: ${seed}, NSFW: ${nsfwLevel})`);
    console.log(`📝 Prompt Freebox (${shortPrompt.length} chars): ${shortPrompt.substring(0, 400)}...`);
    
    return imageUrl;
  }
  
  /**
   * API de secours (compatibilité)
   */
  async generateWithFreeboxBackup(prompt) {
    return await this.generateWithFreeboxSD(prompt, null);
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
    // v5.4.16 - URL avec mode NSFW activé (safe=false)
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=576&height=1024&seed=${seed}&nologo=true&nofeed=true&model=flux&safe=false&enhance=true&t=${antiCache}`;
    
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
