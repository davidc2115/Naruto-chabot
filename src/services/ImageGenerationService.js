import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service de génération d'images - VERSION 2.6.1
 * 
 * 2 OPTIONS:
 * 1. SD Local (Prodia API gratuite) - NSFW supporté
 * 2. Freebox SD (votre serveur local)
 * 
 * AMÉLIORATION NSFW: Prompts explicites pour mode Spicy
 */
class ImageGenerationService {
  constructor() {
    this.strategy = 'local'; // 'local' ou 'freebox'
    this.freeboxUrl = 'http://88.174.155.230:33437/generate';
    this.lastRequestTime = 0;
    this.minDelay = 2000;
    
    // Styles photo réalistes (priorité)
    this.realisticStyles = [
      'ultra photorealistic, DSLR photo, professional photography, 8K UHD',
      'hyperrealistic photograph, Canon EOS R5, studio lighting, sharp focus',
      'photorealistic portrait, high-end fashion photography, magazine cover',
      'realistic photo, professional model shoot, perfect lighting',
      'cinematic photography, film grain, bokeh, shallow depth of field',
    ];
    
    // Styles anime (moins fréquent)
    this.animeStyles = [
      'anime style, high quality anime art, detailed',
      'manga style illustration, vibrant colors',
    ];
    
    // ========== NSFW CONTENT ==========
    
    // Tenues sexy (Romance mode)
    this.sexyOutfits = [
      'wearing tight black dress, showing cleavage',
      'wearing red cocktail dress, low cut',
      'wearing silk blouse unbuttoned, lace bra visible',
      'wearing crop top and mini skirt',
      'wearing swimsuit, wet skin',
      'wearing sheer white shirt, visible curves',
    ];
    
    // Tenues révélatrices (Spicy mode)
    this.revealingOutfits = [
      'wearing sexy black lace lingerie, stockings',
      'wearing red silk lingerie set, garter belt',
      'wearing sheer negligee, see-through',
      'wearing tiny string bikini, barely covering',
      'wearing only lace bra and panties',
      'topless, covering with hands, artistic',
      'wearing open robe, lingerie underneath',
      'nude, tasteful pose, strategic shadows',
    ];
    
    // Poses sensuelles
    this.sensualPoses = [
      'lying seductively on bed, bedroom eyes',
      'sitting provocatively, legs crossed',
      'leaning forward, showing cleavage',
      'standing against wall, hip tilted',
      'kneeling on bed, looking up seductively',
      'lying on side, curves emphasized',
      'bending over slightly, looking back',
    ];
    
    // Expressions
    this.sexyExpressions = [
      'seductive smile, bedroom eyes, parted lips',
      'sultry gaze, biting lip',
      'inviting expression, half-closed eyes',
      'playful smirk, flirtatious look',
      'intense passionate gaze',
    ];
    
    // Ambiances
    this.intimateSettings = [
      'romantic bedroom lighting, soft shadows',
      'dim candlelight, intimate atmosphere',
      'luxury hotel room, silk sheets',
      'sunset light through window, warm tones',
      'boudoir photography style, elegant',
    ];
  }

  async loadConfig() {
    try {
      const strategy = await AsyncStorage.getItem('image_strategy');
      if (strategy) this.strategy = strategy;
      
      const freeboxUrl = await AsyncStorage.getItem('freebox_url');
      if (freeboxUrl) this.freeboxUrl = freeboxUrl;
    } catch (e) {
      console.error('Erreur chargement config images:', e);
    }
  }

  async setStrategy(strategy) {
    this.strategy = strategy;
    await AsyncStorage.setItem('image_strategy', strategy);
  }

  async setFreeboxUrl(url) {
    this.freeboxUrl = url;
    await AsyncStorage.setItem('freebox_url', url);
  }

  getStrategy() {
    return this.strategy;
  }

  /**
   * Choix aléatoire dans un tableau
   */
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Génère une description physique détaillée
   */
  buildPhysicalDescription(character) {
    const age = Math.max(character.age || 25, 18);
    const gender = character.gender === 'female' ? 'woman' : 'man';
    
    let desc = `beautiful ${gender}, ${age} years old`;
    
    if (character.hairColor) {
      desc += `, ${character.hairColor} hair`;
    }
    if (character.eyeColor) {
      desc += `, ${character.eyeColor} eyes`;
    }
    if (character.appearance) {
      // Limiter et nettoyer l'apparence
      const cleanAppearance = character.appearance
        .replace(/[^\w\s,.-]/g, '')
        .substring(0, 150);
      desc += `, ${cleanAppearance}`;
    }
    
    // Ajouts pour réalisme
    desc += ', perfect skin, detailed face, natural makeup';
    
    return desc;
  }

  /**
   * Génère le prompt selon le mode de contenu
   */
  buildPromptForMode(character, userProfile) {
    const isSpicy = userProfile?.spicyMode === true;
    const isRomance = userProfile?.nsfwMode === true;
    
    // Style (85% réaliste, 15% anime)
    const useRealistic = Math.random() < 0.85;
    let style = useRealistic 
      ? this.randomChoice(this.realisticStyles)
      : this.randomChoice(this.animeStyles);
    
    // Description physique
    let physical = this.buildPhysicalDescription(character);
    
    // Contenu selon le mode
    let content = '';
    
    if (isSpicy) {
      // MODE SPICY - Explicite
      console.log('🔥 Mode SPICY activé - génération explicite');
      const outfit = this.randomChoice(this.revealingOutfits);
      const pose = this.randomChoice(this.sensualPoses);
      const expression = this.randomChoice(this.sexyExpressions);
      const setting = this.randomChoice(this.intimateSettings);
      
      content = `${outfit}, ${pose}, ${expression}, ${setting}`;
      
    } else if (isRomance) {
      // MODE ROMANCE - Sexy mais pas explicite
      console.log('💕 Mode Romance activé - génération sexy');
      const outfit = this.randomChoice(this.sexyOutfits);
      const pose = this.randomChoice(this.sensualPoses.slice(0, 4)); // Poses moins explicites
      const expression = this.randomChoice(this.sexyExpressions);
      
      content = `${outfit}, ${pose}, ${expression}, elegant lighting`;
      
    } else {
      // MODE NORMAL - SFW
      console.log('✨ Mode Normal - génération SFW');
      content = 'wearing casual elegant clothing, friendly smile, natural pose, bright lighting';
    }
    
    // Assemblage du prompt
    const prompt = `${style}, ${physical}, ${content}, high quality, detailed, sharp focus, professional`;
    
    // Negative prompt pour éviter les problèmes
    const negativePrompt = 'low quality, blurry, distorted, deformed, ugly, bad anatomy, bad hands, missing fingers, extra fingers, watermark, signature, text';
    
    return { prompt, negativePrompt };
  }

  /**
   * Génère une image de personnage
   */
  async generateCharacterImage(character, userProfile = null) {
    // Vérification âge
    if (character.age && character.age < 18) {
      console.log('⚠️ Personnage mineur - génération refusée');
      throw new Error('Génération désactivée pour les personnages mineurs');
    }

    console.log('🎨 Génération image pour:', character.name);
    console.log('   - NSFW Mode:', userProfile?.nsfwMode);
    console.log('   - Spicy Mode:', userProfile?.spicyMode);
    
    const { prompt, negativePrompt } = this.buildPromptForMode(character, userProfile);
    
    console.log('📝 Prompt généré:', prompt.substring(0, 100) + '...');
    
    return await this.generateImage(prompt, negativePrompt, userProfile);
  }

  /**
   * Génère une image de scène
   */
  async generateSceneImage(character, userProfile = null, messages = []) {
    return await this.generateCharacterImage(character, userProfile);
  }

  /**
   * Génération principale
   */
  async generateImage(prompt, negativePrompt = '', userProfile = null) {
    await this.loadConfig();
    
    const seed = Date.now() + Math.floor(Math.random() * 10000);
    const isNSFW = userProfile?.nsfwMode || userProfile?.spicyMode;
    
    console.log(`🎨 Stratégie: ${this.strategy}`);
    console.log(`🔞 Mode NSFW: ${isNSFW}`);

    // FREEBOX SD
    if (this.strategy === 'freebox') {
      try {
        console.log('🏠 Génération via Freebox SD...');
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `${this.freeboxUrl}?prompt=${encodedPrompt}&width=768&height=768&seed=${seed}`;
        return url;
      } catch (error) {
        console.log('⚠️ Freebox échoué, fallback Prodia...');
      }
    }

    // SD LOCAL (Prodia API gratuite) - Supporte NSFW
    try {
      console.log('📱 Génération via Prodia (gratuit, NSFW supporté)...');
      
      // Modèles Prodia - utiliser des modèles plus permissifs pour NSFW
      const model = isNSFW 
        ? 'deliberate_v2.safetensors' // Bon pour NSFW
        : 'v1-5-pruned-emaonly.safetensors';
      
      const createResponse = await axios.post(
        'https://api.prodia.com/v1/sd/generate',
        {
          model: model,
          prompt: prompt,
          negative_prompt: negativePrompt || 'low quality, blurry, distorted, deformed',
          steps: 30, // Plus de steps pour qualité
          cfg_scale: 7.5,
          seed: seed,
          sampler: 'DPM++ 2M Karras',
          width: 512,
          height: 768, // Portrait
        },
        { 
          headers: { 'Content-Type': 'application/json' }, 
          timeout: 30000 
        }
      );

      const jobId = createResponse.data?.job;
      if (!jobId) {
        console.log('⚠️ Prodia: Pas de job ID');
        throw new Error('Prodia: Pas de job ID');
      }

      console.log('⏳ Prodia job créé:', jobId);

      // Polling pour attendre le résultat
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        
        const status = await axios.get(
          `https://api.prodia.com/v1/job/${jobId}`,
          { timeout: 10000 }
        );

        if (status.data?.status === 'succeeded') {
          console.log('✅ Prodia: Image générée avec succès!');
          return status.data.imageUrl;
        }
        
        if (status.data?.status === 'failed') {
          console.log('❌ Prodia: Job échoué');
          throw new Error('Prodia: Génération échouée');
        }
        
        console.log(`⏳ Prodia: En cours... (${i + 1}/60)`);
      }
      
      throw new Error('Prodia: Timeout');
    } catch (error) {
      console.log('⚠️ Prodia échoué:', error.message);
      
      // Fallback Pollinations (moins bon pour NSFW mais fonctionne)
      console.log('🔄 Fallback vers Pollinations...');
      
      // Pour Pollinations, simplifier le prompt
      let pollinationsPrompt = prompt;
      if (isNSFW) {
        // Pollinations est plus restrictif, adapter le prompt
        pollinationsPrompt = prompt
          .replace(/nude|topless|naked/gi, 'artistic')
          .replace(/lingerie/gi, 'elegant dress')
          .replace(/see-through|sheer/gi, 'elegant');
      }
      
      const encoded = encodeURIComponent(pollinationsPrompt.substring(0, 1000));
      return `https://image.pollinations.ai/prompt/${encoded}?width=768&height=1024&model=flux&nologo=true&seed=${seed}`;
    }
  }
}

export default new ImageGenerationService();
