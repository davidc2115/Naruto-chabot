import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service de génération d'images - VERSION 2.6.0
 * 
 * 2 OPTIONS UNIQUEMENT:
 * 1. SD Local (APIs gratuites Prodia)
 * 2. Freebox SD (votre serveur local)
 */
class ImageGenerationService {
  constructor() {
    this.strategy = 'local'; // 'local' ou 'freebox'
    this.freeboxUrl = 'http://88.174.155.230:33437/generate';
    this.lastRequestTime = 0;
    this.minDelay = 2000;
    
    // Styles réalistes (85% réaliste, 15% anime)
    this.styles = [
      'ultra photorealistic, DSLR photo, professional photography, 8K',
      'hyperrealistic photograph, Canon EOS R5, studio lighting',
      'photorealistic portrait, high-end fashion photography',
      'realistic photo, professional model shoot, magazine quality',
      'anime style, high quality anime art',
    ];
    
    // Tenues NSFW
    this.nsfwOutfits = [
      'wearing sexy black lace lingerie',
      'wearing red silk lingerie set',
      'wearing sheer negligee',
      'wearing tiny bikini',
      'topless, artistic pose',
      'wearing only towel',
    ];
    
    // Poses NSFW
    this.nsfwPoses = [
      'lying seductively on bed',
      'sitting provocatively',
      'standing against wall, sensual pose',
      'kneeling, alluring expression',
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
   * Génère une description physique
   */
  buildPhysicalDescription(character) {
    let desc = character.gender === 'female' ? 'beautiful woman' : 'handsome man';
    desc += `, ${Math.max(character.age || 25, 18)} years old`;
    if (character.hairColor) desc += `, ${character.hairColor} hair`;
    if (character.appearance) desc += `, ${character.appearance.substring(0, 200)}`;
    return desc;
  }

  /**
   * Génère le prompt NSFW
   */
  buildNSFWPrompt(character) {
    const outfit = this.nsfwOutfits[Math.floor(Math.random() * this.nsfwOutfits.length)];
    const pose = this.nsfwPoses[Math.floor(Math.random() * this.nsfwPoses.length)];
    
    return `, ${outfit}, ${pose}, seductive expression, intimate lighting, sensual atmosphere`;
  }

  /**
   * Génère une image de personnage
   */
  async generateCharacterImage(character, userProfile = null) {
    if (character.age < 18) {
      throw new Error('Génération désactivée pour les mineurs');
    }

    const isNSFW = userProfile?.nsfwMode || userProfile?.spicyMode;
    
    // Construire le prompt
    let prompt = this.styles[Math.floor(Math.random() * (isNSFW ? this.styles.length : this.styles.length - 1))];
    prompt += ', ' + this.buildPhysicalDescription(character);
    
    if (isNSFW) {
      prompt += this.buildNSFWPrompt(character);
    } else {
      prompt += ', casual clothing, natural pose, friendly expression';
    }
    
    prompt += ', high quality, detailed, sharp focus';
    
    return await this.generateImage(prompt);
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
  async generateImage(prompt) {
    await this.loadConfig();
    
    const seed = Date.now() + Math.floor(Math.random() * 10000);
    
    console.log(`🎨 Stratégie: ${this.strategy}`);
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

    // FREEBOX
    if (this.strategy === 'freebox') {
      try {
        console.log('🏠 Génération via Freebox SD...');
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `${this.freeboxUrl}?prompt=${encodedPrompt}&width=768&height=768&seed=${seed}`;
        return url;
      } catch (error) {
        console.log('⚠️ Freebox échoué, fallback SD Local...');
      }
    }

    // SD LOCAL (Prodia API gratuite)
    try {
      console.log('📱 Génération via Prodia (gratuit)...');
      
      const createResponse = await axios.post(
        'https://api.prodia.com/v1/sd/generate',
        {
          model: 'deliberate_v2.safetensors',
          prompt: prompt,
          negative_prompt: 'low quality, blurry, distorted, deformed, ugly',
          steps: 25,
          cfg_scale: 7,
          seed: seed,
          sampler: 'DPM++ 2M Karras',
          width: 512,
          height: 512,
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
      );

      const jobId = createResponse.data?.job;
      if (!jobId) throw new Error('Prodia: Pas de job ID');

      // Polling
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        
        const status = await axios.get(
          `https://api.prodia.com/v1/job/${jobId}`,
          { timeout: 10000 }
        );

        if (status.data?.status === 'succeeded') {
          console.log('✅ Prodia: Image générée');
          return status.data.imageUrl;
        }
        
        if (status.data?.status === 'failed') {
          throw new Error('Prodia: Échec');
        }
      }
      
      throw new Error('Prodia: Timeout');
    } catch (error) {
      console.log('⚠️ Prodia échoué:', error.message);
      
      // Fallback Pollinations
      console.log('🔄 Fallback Pollinations...');
      const encoded = encodeURIComponent(prompt.substring(0, 1000));
      return `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&model=flux&nologo=true&seed=${seed}`;
    }
  }
}

export default new ImageGenerationService();
