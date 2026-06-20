import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import StableDiffusionLocalService from './StableDiffusionLocalService';

/**
 * ImageGenerationService v6.4 — VITESSE MAXIMALE + GÉNÉRATION LOCALE
 *
 * Stratégie :
 *   1. Pollinations.ai (flux-schnell) → retourne l'URL directement, aucun download
 *      React Native affiche l'image dès qu'elle est prête (5-15s)
 *   2. Fallback Stable Horde → base64 → fichier local (compatible GalleryService)
 *   3. Fallback Stable Diffusion Local → génération ONNX sur appareil Android
 *
 * Le composant <Image source={{ uri }} /> gère le streaming nativement.
 * Le download n'a lieu QUE si l'utilisateur sauvegarde en galerie.
 */
class ImageGenerationService {
  constructor() {
    this.hordeUrl = 'https://stablehorde.net/api/v2';
    this.hordeClient = 'roleplay-chat:6.3.0:anon';
    this.preferredModels = ['Deliberate', 'Dreamshaper', 'SDXL 1.0'];
    this.lastRequestTime = 0;
    this.minDelay = 1000;
    
    // Variations pour génération dynamique
    this.scenes = [
      'luxury penthouse with city skyline view',
      'elegant restaurant with candlelight',
      'sunny beach at golden hour',
      'cozy coffee shop interior',
      'modern office with glass walls',
      'beautiful garden with flowers',
      'rooftop bar at night',
      'art gallery with spotlights',
      'vintage library with warm light',
      'spa with soft ambient lighting',
      'yacht deck at sunset',
      'mountain cabin fireplace',
      'fashion runway backstage',
      'hotel suite with city view',
      'private jet interior',
      'wine cellar with dim lighting',
      'botanical garden greenhouse',
      'rooftop pool at twilight',
      'luxury car interior',
      'beach house balcony'
    ];
    
    this.poses = [
      'elegant standing pose',
      'relaxed sitting pose',
      'dynamic walking pose',
      'casual leaning pose',
      'confident standing pose',
      'playful jumping pose',
      'graceful dancing pose',
      'thoughtful sitting pose',
      'flirtatious glance pose',
      'power pose standing',
      'intimate close-up pose',
      'candid laughing pose',
      'mysterious shadow pose',
      'romantic embrace pose',
      'confident stride pose'
    ];
    
    this.outfits = [
      'elegant evening gown',
      'sophisticated business suit',
      'casual chic outfit',
      'summer dress',
      'designer cocktail dress',
      'smart casual ensemble',
      'luxury loungewear',
      'vintage inspired outfit',
      'modern minimalist outfit',
      'bohemian style dress',
      'athletic luxury wear',
      'formal black tie attire',
      'designer jeans and blazer',
      'silk blouse and skirt',
      'cashmere sweater ensemble'
    ];
    
    this.cameraAngles = [
      'close-up portrait shot',
      'medium shot framing',
      'full body shot',
      'low angle dramatic shot',
      'high angle portrait',
      'side profile view',
      'three-quarter view',
      'over-the-shoulder shot',
      'dutch angle creative shot',
      'birds eye view',
      'worms eye view',
      'silhouette shot',
      'backlit dramatic shot',
      'soft focus portrait',
      'sharp detailed close-up'
    ];
    
    this.lighting = [
      'golden hour sunlight',
      'soft diffused studio light',
      'dramatic side lighting',
      'backlit rim lighting',
      'natural window light',
      'neon city lights',
      'candlelight ambiance',
      'softbox studio lighting',
      'moonlight blue tones',
      'warm tungsten light',
      'bright daylight',
      'overcast soft light',
      'colored gel lighting',
      'vintage film lighting',
      'high-key bright lighting'
    ];
    
    this.moods = [
      'elegant and sophisticated',
      'playful and flirtatious',
      'mysterious and alluring',
      'confident and powerful',
      'romantic and intimate',
      'casual and relaxed',
      'dramatic and intense',
      'dreamy and ethereal',
      'bold and daring',
      'soft and gentle'
    ];
  }

  async waitMinDelay() {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.minDelay) await new Promise(r => setTimeout(r, this.minDelay - elapsed));
    this.lastRequestTime = Date.now();
  }

  // ─── Builders de prompt ────────────────────────────────────────────────────

  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Convertit la taille de bonnet en descripteur détaillé pour la génération d'images
   */
  getBustSizeDescriptor(bust) {
    if (!bust) return '';
    
    const bustLower = bust.toLowerCase().trim();
    
    // Mapping des tailles de bonnet vers des descripteurs précis et réalistes
    const sizeMapping = {
      'a': 'petite A cup breasts, small feminine chest, subtle natural curves',
      'aa': 'very small AA cup breasts, minimal chest, delicate feminine form',
      'b': 'medium B cup breasts, average feminine bust, natural curves, modest size',
      'c': 'medium-large C cup breasts, noticeable feminine bust, attractive curves, well-proportioned',
      'd': 'large D cup breasts, voluptuous full bust, prominent feminine curves, generous size',
      'dd': 'very large DD cup breasts, extremely full voluptuous bust, generous curves, impressive size',
      'e': 'huge E cup breasts, very full heavy bust, impressive curves, substantial size, heavy weight',
      'f': 'enormous F cup breasts, spectacular massive bust, dramatic curves, very large size, extremely heavy',
      'g': 'massive G cup breasts, extremely full heavy bust, overwhelming curves, huge size, colossal weight',
      'h': 'gigantic H cup breasts, colossal heavy bust, hyper-feminine curves, enormous size, monumental weight',
      'i': 'immense I cup breasts, monumental heavy bust, extreme curves, gigantic size, overwhelming weight',
    };
    
    // Extraire la lettre de la taille (A, B, C, etc.)
    const sizeLetter = bustLower.replace(/[^a-z]/g, '');
    
    if (sizeMapping[sizeLetter]) {
      return sizeMapping[sizeLetter];
    }
    
    // Fallback pour les tailles non reconnues
    return `${bust} cup breasts`;
  }

  /**
   * Extrait les descripteurs de morphologie (rond, voluptueux, gros fessier, etc.)
   * Inclut: poids, taille, forme, visage, couleur de peau, origine
   */
  getMorphologyDescriptors(character) {
    const descriptors = [];
    const appearance = (character.appearance || character.physicalDescription || '').toLowerCase();
    const bodyType = (character.bodyType || '').toLowerCase();
    const physicalDescription = (character.physicalDescription || '').toLowerCase();
    
    // === POIDS ===
    if (appearance.includes('très mince') || appearance.includes('very slim') || appearance.includes('maigre')) {
      descriptors.push('very slender lightweight');
    } else if (appearance.includes('mince') || appearance.includes('slim') || appearance.includes('thin')) {
      descriptors.push('slim lightweight');
    } else if (appearance.includes('moyen') || appearance.includes('average') || appearance.includes('normal')) {
      descriptors.push('average weight');
    } else if (appearance.includes('enrobé') || appearance.includes('chubby') || appearance.includes('plump')) {
      descriptors.push('chubby soft weight');
    } else if (appearance.includes('ronde') || appearance.includes('round') || appearance.includes('curvy')) {
      descriptors.push('curvy voluptuous weight');
    } else if (appearance.includes('gros') || appearance.includes('large') || appearance.includes('heavy')) {
      descriptors.push('heavy full-figured');
    }
    
    // === TAILLE ===
    const height = character.height || '';
    if (height) {
      const heightNum = parseInt(height.replace('cm', '').replace(' ', ''));
      if (heightNum < 160) {
        descriptors.push('petite short stature');
      } else if (heightNum < 170) {
        descriptors.push('average height');
      } else if (heightNum < 180) {
        descriptors.push('tall stature');
      } else {
        descriptors.push('very tall stature');
      }
    }
    
    // === FORME DU CORPS ===
    if (bodyType.includes('voluptueux') || bodyType.includes('voluptuous') || appearance.includes('voluptueux')) {
      descriptors.push('voluptuous curvy hourglass figure');
    } else if (bodyType.includes('athlétique') || bodyType.includes('athletic') || bodyType.includes('tonique')) {
      descriptors.push('athletic toned fit figure');
    } else if (bodyType.includes('élancé') || bodyType.includes('slender') || bodyType.includes('mince')) {
      descriptors.push('slender lean figure');
    } else if (bodyType.includes('ronde') || bodyType.includes('round') || appearance.includes('ronde')) {
      descriptors.push('round soft pear-shaped figure');
    } else if (bodyType.includes('rectangulaire') || bodyType.includes('rectangle')) {
      descriptors.push('rectangular straight figure');
    } else if (bodyType.includes('sablier') || bodyType.includes('hourglass')) {
      descriptors.push('classic hourglass figure');
    }
    
    // === VISAGE ===
    if (appearance.includes('visage rond') || appearance.includes('round face')) {
      descriptors.push('round soft face');
    } else if (appearance.includes('visage ovale') || appearance.includes('oval face')) {
      descriptors.push('oval elegant face');
    } else if (appearance.includes('visage carré') || appearance.includes('square face')) {
      descriptors.push('square angular face');
    } else if (appearance.includes('visage en cœur') || appearance.includes('heart-shaped face')) {
      descriptors.push('heart-shaped delicate face');
    } else if (appearance.includes('visage long') || appearance.includes('long face')) {
      descriptors.push('long elongated face');
    }
    
    // === DÉTAILS DU VISAGE ===
    if (appearance.includes('pommettes hautes') || appearance.includes('high cheekbones')) {
      descriptors.push('high defined cheekbones');
    } else if (appearance.includes('pommettes saillantes') || appearance.includes('prominent cheekbones')) {
      descriptors.push('prominent cheekbones');
    }
    
    if (appearance.includes('mâchoire carrée') || appearance.includes('square jaw')) {
      descriptors.push('square defined jawline');
    } else if (appearance.includes('mâchoire anguleuse') || appearance.includes('angular jaw')) {
      descriptors.push('angular sharp jawline');
    } else if (appearance.includes('mâchoire fine') || appearance.includes('delicate jaw')) {
      descriptors.push('delicate refined jawline');
    }
    
    if (appearance.includes('double menton') || appearance.includes('double chin')) {
      descriptors.push('soft double chin');
    } else if (appearance.includes('menton fuyant') || appearance.includes('receding chin')) {
      descriptors.push('receding chin');
    }
    
    // === COULEUR DE PEAU ===
    const skinTone = character.skinTone || character.skin || '';
    if (skinTone) {
      if (skinTone.includes('très claire') || skinTone.includes('very fair') || skinTone.includes('pale')) {
        descriptors.push('very fair pale skin');
      } else if (skinTone.includes('claire') || skinTone.includes('fair')) {
        descriptors.push('fair light skin');
      } else if (skinTone.includes('mate') || skinTone.includes('olive')) {
        descriptors.push('olive matte skin');
      } else if (skinTone.includes('bronzée') || skinTone.includes('tanned')) {
        descriptors.push('tanned bronzed skin');
      } else if (skinTone.includes('caramel') || skinTone.includes('golden')) {
        descriptors.push('golden caramel skin');
      } else if (skinTone.includes('ébène') || skinTone.includes('ebony') || skinTone.includes('dark')) {
        descriptors.push('dark ebony skin');
      }
    }
    
    // === ORIGINE / ETHNICITÉ ===
    if (appearance.includes('caucasienne') || appearance.includes('caucasian') || appearance.includes('blanche')) {
      descriptors.push('Caucasian features');
    } else if (appearance.includes('asiatique') || appearance.includes('asian') || appearance.includes(' asiat')) {
      descriptors.push('Asian features');
    } else if (appearance.includes('africaine') || appearance.includes('african') || appearance.includes('noire')) {
      descriptors.push('African features');
    } else if (appearance.includes('latina') || appearance.includes('hispanic') || appearance.includes('latino')) {
      descriptors.push('Latina Hispanic features');
    } else if (appearance.includes('arabe') || appearance.includes('arab') || appearance.includes('middle eastern')) {
      descriptors.push('Middle Eastern features');
    } else if (appearance.includes('indienne') || appearance.includes('indian') || appearance.includes('south asian')) {
      descriptors.push('South Asian features');
    } else if (appearance.includes('métisse') || appearance.includes('mixed') || appearance.includes('mixed race')) {
      descriptors.push('mixed race features');
    } else if (appearance.includes('méditerranéenne') || appearance.includes('mediterranean')) {
      descriptors.push('Mediterranean features');
    } else if (appearance.includes('nordique') || appearance.includes('nordic') || appearance.includes('scandinavian')) {
      descriptors.push('Nordic Scandinavian features');
    } else if (appearance.includes('slave') || appearance.includes('slavic') || appearance.includes('eastern european')) {
      descriptors.push('Slavic Eastern European features');
    }
    
    // === DÉTAILS SPÉCIFIQUES FÉMININS ===
    if (character.gender === 'female') {
      // Fessier
      if (appearance.includes('gros fessier') || appearance.includes('grosse fesse') || appearance.includes('big butt') || appearance.includes('large butt')) {
        descriptors.push('large voluptuous butt');
      } else if (appearance.includes('fessier rebondi') || appearance.includes('fessier rond') || appearance.includes('round butt')) {
        descriptors.push('round plump butt');
      } else if (appearance.includes('fessier ferme') || appearance.includes('firm butt')) {
        descriptors.push('firm toned butt');
      }
      
      // Hanches
      if (appearance.includes('hanches larges') || appearance.includes('wide hips')) {
        descriptors.push('wide feminine hips');
      } else if (appearance.includes('hanches étroites') || appearance.includes('narrow hips')) {
        descriptors.push('narrow hips');
      }
      
      // Cuisses
      if (appearance.includes('cuisses épaisses') || appearance.includes('thick thighs')) {
        descriptors.push('thick soft thighs');
      } else if (appearance.includes('cuisses musclées') || appearance.includes('muscular thighs')) {
        descriptors.push('muscular toned thighs');
      }
    }
    
    // === DÉTAILS SPÉCIFIQUES MASCULINS ===
    if (character.gender === 'male') {
      // Épaules
      if (appearance.includes('épaules larges') || appearance.includes('broad shoulders')) {
        descriptors.push('broad masculine shoulders');
      } else if (appearance.includes('épaules étroites') || appearance.includes('narrow shoulders')) {
        descriptors.push('narrow shoulders');
      }
      
      // Torse
      if (appearance.includes('torse large') || appearance.includes('broad chest')) {
        descriptors.push('broad muscular chest');
      } else if (appearance.includes('torse poilu') || appearance.includes('hairy chest')) {
        descriptors.push('hairy chest');
      } else if (appearance.includes('torse musclé') || appearance.includes('muscular chest')) {
        descriptors.push('defined muscular chest');
      }
    }
    
    return descriptors.join(', ');
  }

  buildBasePromptText(character, style) {
    const gender = character.gender === 'male' ? 'handsome man' : 'beautiful woman';
    const appearance = (character.appearance || character.physicalDescription || '').substring(0, 200);
    const bodyType = character.bodyType || '';
    const height = character.height ? `${character.height}cm tall` : '';
    const bust = character.bust || character.bustSize || '';
    const age = character.age ? `${character.age} years old` : '';
    
    // Détails physiques supplémentaires pour plus de précision
    const hair = character.hair || character.hairColor || '';
    const hairStyle = character.hairStyle || '';
    const eyes = character.eyes || character.eyeColor || '';
    const skin = character.skin || character.skinTone || '';
    
    // Descripteur de taille de poitrine précis pour les femmes
    const bustDescriptor = character.gender === 'female' ? this.getBustSizeDescriptor(bust) : '';
    
    // Descripteurs de morphologie (fessier, hanches, corps, cuisses)
    const morphologyDescriptors = this.getMorphologyDescriptors(character);
    
    // Construction détaillée de l'apparence
    let detailedAppearance = appearance;
    if (age) detailedAppearance += `, ${age}`;
    if (hair) detailedAppearance += `, ${hair} hair`;
    if (hairStyle) detailedAppearance += `, ${hairStyle} hairstyle`;
    if (eyes) detailedAppearance += `, ${eyes} eyes`;
    if (skin) detailedAppearance += `, ${skin} skin`;
    if (height) detailedAppearance += `, ${height}`;
    if (bodyType) detailedAppearance += `, ${bodyType} build`;
    if (bustDescriptor) detailedAppearance += `, ${bustDescriptor}`;
    if (morphologyDescriptors) detailedAppearance += `, ${morphologyDescriptors}`;

    // Sélection aléatoire des variations pour plus de diversité
    const randomScene = this.getRandomElement(this.scenes);
    const randomPose = this.getRandomElement(this.poses);
    const randomOutfit = this.getRandomElement(this.outfits);
    const randomCamera = this.getRandomElement(this.cameraAngles);
    const randomLighting = this.getRandomElement(this.lighting);
    const randomMood = this.getRandomElement(this.moods);

    const styleMap = {
      portrait:        'portrait, close-up, soft lighting, elegant, detailed face, expressive eyes',
      sensuel:         'sensual pose, alluring expression, soft warm lighting, intimate atmosphere',
      lingerie:        'elegant lingerie, boudoir photography, silk sheets, soft candlelight, tasteful',
      provocative:     'revealing outfit, provocative pose, intense gaze, dramatic lighting',
      underwear:       'underwear, boudoir, intimate setting, warm soft light',
      topless:         'topless, artistic nude, soft studio lighting, tasteful composition, masterpiece',
      artistic_nude:   'artistic nude, professional photography, tasteful pose, elegant, natural light',
      sensual_nude:    'nude, sensual, dreamy soft lighting, silk fabric, artistic, beautiful',
      very_sexy:       'very sexy revealing lingerie, seductive pose, intense warm lighting',
      erotic:          'erotic boudoir pose, intimate, revealing, dramatic lighting, ultra detailed',
      ultra_hot:       'explicit nude, very sexy, photorealistic, 4k, professional photography',
      special_gallery: 'exclusive artistic nude, gallery quality, dramatic cinematic lighting, award winning',
      custom:          'ultra detailed, photorealistic, 8k uhd, professional lighting',
      beach:           'bikini, tropical beach, golden hour sunlight, carefree smile',
      fantasy:         'fantasy outfit, magical glow, ethereal atmosphere, enchanted forest',
      casual:          'casual modern outfit, natural relaxed pose, warm indoor lighting',
      action:          'dynamic action pose, determined expression, dramatic lighting, cinematic',
      // NSFW Styles
      nsfw_soft:       'soft erotic, intimate atmosphere, gentle lighting, sensual pose, romantic, manga anime style',
      nsfw_moderate:   'erotic pose, revealing, intimate lighting, sensual expression, detailed, manga anime style',
      nsfw_hardcore:   'explicit sexual content, hardcore, intense, detailed anatomy, manga anime style, anime art',
      nsfw_fetish:     'fetish content, specific kinks, detailed, erotic lighting, professional, manga style',
      nsfw_bondage:    'bondage, restraints, erotic power dynamics, dramatic lighting, detailed, anime manga',
      nsfw_group:      'group scene, multiple partners, erotic, detailed, professional lighting, manga style',
      nsfw_anal:       'anal content, explicit, detailed, erotic lighting, manga anime style',
      nsfw_oral:       'oral sex, explicit, detailed, intimate, professional photography, manga style',
      nsfw_toys:       'sex toys, erotic play, detailed, intimate lighting, professional, anime manga',
      nsfw_public:     'public sex, exhibitionism, erotic, detailed, dramatic lighting, manga style',
      nsfw_cosplay:    'erotic cosplay, costume play, detailed, professional lighting, sensual, manga anime',
    };

    const stylePart = styleMap[style] || styleMap.portrait;
    
    // Construction du prompt avec variations aléatoires et détails physiques complets
    const base = detailedAppearance
      ? `${detailedAppearance}${physicalExtra}, ${randomOutfit}, ${randomPose}, ${randomScene}, ${randomCamera}, ${randomLighting}, ${randomMood}, ${stylePart}`
      : `${gender}, ${randomOutfit}, ${randomPose}, ${randomScene}, ${randomCamera}, ${randomLighting}, ${randomMood}${physicalExtra}, ${stylePart}`;

    return base + ', highly detailed, 8k, masterpiece, best quality, sharp focus, photorealistic, accurate facial features';
  }

  buildScenePromptText(character, messages, relationLevel, imageType) {
    if (imageType) return this.buildBasePromptText(character, imageType);

    const recentContent = (messages || [])
      .slice(-4).map(m => m.content || '').join(' ').toLowerCase();

    // Sélection aléatoire des variations pour plus de diversité
    const randomScene = this.getRandomElement(this.scenes);
    const randomPose = this.getRandomElement(this.poses);
    const randomOutfit = this.getRandomElement(this.outfits);
    const randomCamera = this.getRandomElement(this.cameraAngles);
    const randomLighting = this.getRandomElement(this.lighting);
    const randomMood = this.getRandomElement(this.moods);

    let sceneCtx = 'portrait, expressive, detailed face';
    if (recentContent.includes('plage') || recentContent.includes('mer')) sceneCtx = 'beach, ocean, golden hour, natural light';
    else if (recentContent.includes('nuit') || recentContent.includes('soir')) sceneCtx = 'night scene, moonlight, atmospheric blue lighting';
    else if (recentContent.includes('combat') || recentContent.includes('bataille')) sceneCtx = 'dynamic action pose, dramatic lighting, cinematic';
    else if (recentContent.includes('chambre') || recentContent.includes('lit')) sceneCtx = 'indoor bedroom, soft warm lighting, intimate';
    else sceneCtx = randomScene; // Utiliser une scène aléatoire par défaut

    // Styles NSFW disponibles dès le début (non explicite: lingerie, topless, etc.)
    // Plus de blocage par niveau de relation
    let styleLevel = 'portrait, neutral expression, detailed face';
    if (relationLevel >= 10) styleLevel = 'explicit nude, ultra sexy, uncensored, boudoir, 4k';
    else if (relationLevel >= 8) styleLevel = 'erotic pose, very revealing lingerie, intimate lighting';
    else if (relationLevel >= 6) styleLevel = 'topless, artistic nude, boudoir photography, silk';
    else if (relationLevel >= 4) styleLevel = 'lingerie, boudoir, soft warm lighting, tasteful';
    else if (relationLevel >= 2) styleLevel = 'flirtatious smile, elegant outfit, warm lighting';
    else styleLevel = 'friendly smile, casual outfit, natural pose';

    // Détails physiques détaillés pour ressemblance au personnage
    const appearance = (character.appearance || character.physicalDescription || '').substring(0, 200);
    const bodyType = character.bodyType || '';
    const height = character.height ? `${character.height}cm tall` : '';
    const bust = character.bust || character.bustSize || '';
    const age = character.age ? `${character.age} years old` : '';
    
    // Descripteur de taille de poitrine précis pour les femmes
    const bustDescriptor = character.gender === 'female' ? this.getBustSizeDescriptor(bust) : '';
    
    // Descripteurs de morphologie (fessier, hanches, corps, cuisses)
    const morphologyDescriptors = this.getMorphologyDescriptors(character);
    
    const hair = character.hair || character.hairColor || '';
    const hairStyle = character.hairStyle || '';
    const eyes = character.eyes || character.eyeColor || '';
    const skin = character.skin || character.skinTone || '';
    
    // Construction détaillée de l'apparence
    let detailedAppearance = appearance;
    if (age) detailedAppearance += `, ${age}`;
    if (hair) detailedAppearance += `, ${hair} hair`;
    if (hairStyle) detailedAppearance += `, ${hairStyle} hairstyle`;
    if (eyes) detailedAppearance += `, ${eyes} eyes`;
    if (skin) detailedAppearance += `, ${skin} skin`;
    if (height) detailedAppearance += `, ${height}`;
    if (bodyType) detailedAppearance += `, ${bodyType} build`;
    if (bustDescriptor) detailedAppearance += `, ${bustDescriptor}`;
    if (morphologyDescriptors) detailedAppearance += `, ${morphologyDescriptors}`;
    
    const gender = character.gender === 'male' ? 'handsome man' : 'beautiful woman';

    // Construction du prompt avec variations aléatoires et détails physiques complets
    const base = detailedAppearance
      ? `${detailedAppearance}, ${randomOutfit}, ${randomPose}, ${sceneCtx}, ${randomCamera}, ${randomLighting}, ${randomMood}, ${styleLevel}`
      : `${gender}, ${randomOutfit}, ${randomPose}, ${sceneCtx}, ${randomCamera}, ${randomLighting}, ${randomMood}, ${styleLevel}`;

    return base + ', highly detailed, 8k, masterpiece, best quality, photorealistic, sharp focus, accurate facial features';
  }

  // ─── Pollinations (PRIMARY — rapide, sans clé) ─────────────────────────────
  // Retourne l'URL directement. React Native <Image> affiche dès réception.
  // Temps moyen : 5-15 secondes.

  async generateViaPollinations(prompt, onProgress) {
    onProgress?.('⚡ Génération rapide…');
    const seed = Math.floor(Math.random() * 99999);
    // Nettoyage du prompt pour l'URL (éviter les caractères spéciaux)
    const cleanPrompt = prompt.replace(/[^\w\s,.-]/g, ' ').replace(/\s+/g, ' ').trim();
    const encoded = encodeURIComponent(cleanPrompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?model=flux-schnell&width=512&height=768&nologo=true&seed=${seed}&nofeed=true`;

    // v6.4 — Téléchargement DIRECT via FileSystem.downloadAsync (plus rapide, sans conversion blob/base64)
    const localUri = `${FileSystem.cacheDirectory}pollinations_${Date.now()}_${seed}.jpg`;
    onProgress?.('⚡ Téléchargement…');

    // Timeout de sécurité (45s max au lieu de plusieurs minutes)
    const downloadPromise = FileSystem.downloadAsync(url, localUri);
    const result = await Promise.race([
      downloadPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Pollinations timeout (45s)')), 45000)),
    ]);

    if (!result || result.status !== 200) {
      throw new Error(`Pollinations HTTP ${result?.status || 'inconnu'}`);
    }
    onProgress?.('✅ Image prête !');
    return result.uri;
  }

  // ─── Stable Diffusion Local (FALLBACK ANDROID) ───────────────────────────────

  async generateViaLocalSD(prompt, onProgress) {
    onProgress?.('📱 Génération locale sur appareil...');
    
    try {
      // Vérifier la disponibilité
      const availability = await StableDiffusionLocalService.checkAvailability();
      
      if (!availability?.available) {
        throw new Error('Stable Diffusion Local non disponible - téléchargez les modèles dans Paramètres');
      }
      
      if (!availability?.modelDownloaded) {
        throw new Error('Modèles SD non téléchargés - téléchargez-les dans Paramètres');
      }
      
      if (!availability?.pipelineReady) {
        onProgress?.('🚀 Initialisation du pipeline...');
        await StableDiffusionLocalService.initializePipeline();
      }
      
      onProgress?.('🎨 Génération en cours...');
      const localUri = await StableDiffusionLocalService.generateImage(prompt, {
        width: 512,
        height: 768,
        steps: 25,
        guidanceScale: 7.5,
      });
      
      onProgress?.('✅ Image locale prête !');
      return localUri;
    } catch (error) {
      throw new Error(`Stable Diffusion Local: ${error.message}`);
    }
  }

  // ─── Stable Horde (FALLBACK) ───────────────────────────────────────────────

  async generateViaStableHorde(prompt, onProgress) {
    onProgress?.('🎨 Stable Horde en attente…');
    const apiKey = await AsyncStorage.getItem('stable_horde_key').catch(() => null) || '0000000000';
    const negative = 'blurry, ugly, deformed, bad anatomy, extra limbs, watermark, text, low quality, pixelated, out of focus';

    // Soumettre
    const subRes = await fetch(`${this.hordeUrl}/generate/async`, {
      method: 'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/json', 'Client-Agent': this.hordeClient },
      body: JSON.stringify({
        prompt,
        params: { width: 512, height: 768, steps: 25, n: 1, sampler_name: 'k_euler_a', cfg_scale: 7, negative_prompt: negative },
        nsfw: true, censor_nsfw: false,
        models: this.preferredModels,
        r2: false, slow_workers: true, trusted_workers: false,
      }),
    });
    if (!subRes.ok) throw new Error(`Stable Horde soumission: HTTP ${subRes.status}`);
    const { id: jobId } = await subRes.json();
    if (!jobId) throw new Error('Pas d\'ID job Stable Horde');

    // Polling
    for (let i = 0; i < 80; i++) {
      await new Promise(r => setTimeout(r, 2500));
      try {
        const chk = await fetch(`${this.hordeUrl}/generate/check/${jobId}`, {
          headers: { 'Client-Agent': this.hordeClient },
        });
        if (!chk.ok) continue;
        const data = await chk.json();
        if (data.faulted) throw new Error('Worker Stable Horde a échoué — réessayez');
        if (data.done) {
          onProgress?.('📥 Finalisation…');
          const stRes = await fetch(`${this.hordeUrl}/generate/status/${jobId}`, {
            headers: { 'Client-Agent': this.hordeClient },
          });
          const st = await stRes.json();
          const img = st.generations?.[0]?.img;
          if (!img) throw new Error('Aucune image dans la réponse');

          // base64 → fichier local
          const localUri = `${FileSystem.cacheDirectory}horde_${Date.now()}.webp`;
          await FileSystem.writeAsStringAsync(localUri, img, {
            encoding: FileSystem.EncodingType.Base64,
          });
          onProgress?.('✅ Image prête !');
          return localUri;
        }
        const s = Math.round((i + 1) * 2.5);
        onProgress?.(`🎨 Génération… ${s}s`);
      } catch (e) {
        if (e.message.includes('échoué')) throw e;
      }
    }
    throw new Error('Timeout Stable Horde (> 3 min)');
  }

  // ─── API publique ──────────────────────────────────────────────────────────

  async generateImage(character, style = 'portrait', customPrompt = null, onProgress = null) {
    await this.waitMinDelay();
    const prompt = customPrompt?.trim()
      ? customPrompt + ', highly detailed, 8k, masterpiece'
      : this.buildBasePromptText(character, style);

    // Pour contenu NSFW, utiliser Stable Horde en priorité (Pollinations filtre)
    const isNSFW = character.isNSFW || style.includes('nsfw') || style.includes('lingerie') || style.includes('nude');
    
    if (isNSFW) {
      onProgress?.('🎨 Mode NSFW → Stable Horde (Pollinations filtre)...');
      try { return await this.generateViaStableHorde(prompt, onProgress); }
      catch (e) {
        onProgress?.(`⚠️ Stable Horde échoué → Local SD…`);
        try { return await this.generateViaLocalSD(prompt, onProgress); }
        catch (e2) {
          onProgress?.(`⚠️ Local SD échoué → Pollinations…`);
          return await this.generateViaPollinations(prompt, onProgress);
        }
      }
    }

    // Pour contenu SFW, Pollinations en priorité
    try { return await this.generateViaPollinations(prompt, onProgress); }
    catch (e) {
      onProgress?.(`⚠️ ${e.message} → Stable Horde…`);
      try { return await this.generateViaStableHorde(prompt, onProgress); }
      catch (e2) {
        onProgress?.(`⚠️ Stable Horde échoué → Local SD…`);
        try { return await this.generateViaLocalSD(prompt, onProgress); }
        catch (e3) {
          onProgress?.(`⚠️ Local SD non disponible → Erreur finale`);
          throw new Error('Tous les services de génération ont échoué');
        }
      }
    }
  }

  /**
   * Détecte si le contexte de la conversation est NSFW
   */
  detectNSFWContext(messages) {
    if (!messages || messages.length === 0) return false;
    
    const recentMessages = messages.slice(-10).map(m => m.content?.toLowerCase() || '').join(' ');
    
    // Mots-clés NSFW en français et anglais
    const nsfwKeywords = [
      'sexe', 'sex', 'nue', 'naked', 'nu', 'baiser', 'fuck', 'cul', 'ass', 'bite', 'dick', 'chatte', 'pussy',
      'sucer', 'suck', 'lécher', 'lick', 'érotique', 'erotic', 'porn', 'porno', 'hardcore', 'hard',
      'lingerie', 'string', 'thong', 'seins', 'boobs', 'tits', 'nichons', 'poitrine', 'breast',
      'pénis', 'penis', 'vagin', 'vagina', 'clitoris', 'érection', 'erection', 'excité', 'aroused',
      'orgasme', 'orgasm', 'jouir', 'cum', 'sperme', 'sperm', 'éjaculer', 'ejaculate',
      'bordel', 'putain', 'salope', 'bitch', 'pute', 'whore', 'enculer', 'anal',
      'fellation', 'blowjob', 'cunnilingus', '69', 'trio', 'threesome', 'gangbang',
      'bdsm', 'bondage', 'fétiche', 'fetish', 'dominer', 'dominatrix', 'soumis', 'submissive',
      'masturbation', 'masturbate', 'doigter', 'finger', 'caresser', 'caress',
      'désir', 'desire', 'plaisir', 'pleasure', 'passion', 'lust', 'convoitise'
    ];
    
    // Vérifier si des mots-clés NSFW sont présents
    const hasNsfwKeywords = nsfwKeywords.some(keyword => recentMessages.includes(keyword));
    
    // Vérifier si l'utilisateur demande explicitement du contenu NSFW
    const explicitNsfwRequest = recentMessages.includes('nsfw') || 
                                 recentMessages.includes('adulte') || 
                                 recentMessages.includes('adult') ||
                                 recentMessages.includes('plus chaud') ||
                                 recentMessages.includes('hotter') ||
                                 recentMessages.includes('plus sexy') ||
                                 recentMessages.includes('sexier');
    
    return hasNsfwKeywords || explicitNsfwRequest;
  }

  async generateSceneImage(character, userProfile, messages = [], relationLevel = 1, onProgress = null, imageType = null) {
    await this.waitMinDelay();
    
    // Détection dynamique du mode NSFW
    const userNsfwEnabled = userProfile?.nsfwEnabled || false;
    const contextNsfwDetected = this.detectNSFWContext(messages);
    const nsfwEnabled = userNsfwEnabled || contextNsfwDetected;
    
    // Sélection automatique du style NSFW si activé et relation élevée
    let selectedImageType = imageType;
    if (nsfwEnabled && !imageType) {
      if (relationLevel >= 10) selectedImageType = 'nsfw_hardcore';
      else if (relationLevel >= 9) selectedImageType = 'nsfw_moderate';
      else if (relationLevel >= 8) selectedImageType = 'nsfw_soft';
      else if (relationLevel >= 7) selectedImageType = 'lingerie';
    }
    
    const prompt = this.buildScenePromptText(character, messages, relationLevel, selectedImageType);

    try { return await this.generateViaPollinations(prompt, onProgress); }
    catch (e) {
      onProgress?.(`⚠️ ${e.message} → Stable Horde…`);
      return await this.generateViaStableHorde(prompt, onProgress);
    }
  }
}

export default new ImageGenerationService();
