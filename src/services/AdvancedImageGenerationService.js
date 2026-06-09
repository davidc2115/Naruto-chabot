import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service de génération d'image avancé
 * Prend en compte l'apparence physique détaillée du personnage
 * Utilise plusieurs APIs pour la génération d'images
 */
class AdvancedImageGenerationService {
  constructor() {
    this.selectedApi = 'pollinations';
    this.apis = [
      { 
        id: 'pollinations', 
        name: 'Pollinations.ai', 
        url: 'https://image.pollinations.ai/prompt/',
        requiresKey: false,
        quality: 'high'
      },
      { 
        id: 'stability', 
        name: 'Stability AI', 
        url: 'https://api.stability.ai/v1/generation/',
        requiresKey: true,
        quality: 'very-high'
      },
      { 
        id: 'replicate', 
        name: 'Replicate', 
        url: 'https://api.replicate.com/v1/predictions',
        requiresKey: true,
        quality: 'very-high'
      },
    ];
  }

  /**
   * Génère une image avec prise en compte de l'apparence physique
   */
  async generateImage(character, options = {}) {
    try {
      const api = this.apis.find(a => a.id === this.selectedApi) || this.apis[0];
      
      // Construire le prompt détaillé avec l'apparence physique
      const prompt = this.buildDetailedPrompt(character, options);
      
      console.log(`🎨 Génération image avec ${api.name}: ${prompt.substring(0, 100)}...`);

      let imageUrl;
      
      if (api.id === 'pollinations') {
        imageUrl = await this.generateWithPollinations(prompt, options);
      } else if (api.id === 'stability') {
        imageUrl = await this.generateWithStability(prompt, options);
      } else if (api.id === 'replicate') {
        imageUrl = await this.generateWithReplicate(prompt, options);
      }

      return imageUrl;
    } catch (error) {
      console.error('❌ Erreur génération image:', error);
      throw error;
    }
  }

  /**
   * Construit un prompt détaillé avec l'apparence physique
   */
  buildDetailedPrompt(character, options = {}) {
    let prompt = '';

    // Style et qualité
    const style = options.style || 'realistic';
    const quality = options.quality || 'masterpiece, best quality, ultra detailed';
    
    prompt += `${quality}, ${style} style, `;

    // Genre
    if (character.gender === 'female') {
      prompt += 'beautiful woman, ';
    } else if (character.gender === 'male') {
      prompt += 'handsome man, ';
    } else {
      prompt += 'beautiful person, ';
    }

    // Âge
    if (character.age) {
      const age = this.parseAge(character.age);
      prompt += `${age} years old, `;
    }

    // Apparence physique détaillée
    if (character.physicalDescription) {
      prompt += `${character.physicalDescription}, `;
    }

    // Cheveux
    if (character.hairColor) {
      prompt += `${character.hairColor} hair, `;
    }
    if (character.hairLength) {
      prompt += `${character.hairLength} hair, `;
    }
    if (character.hairStyle) {
      prompt += `${character.hairStyle} hairstyle, `;
    }

    // Yeux
    if (character.eyeColor) {
      prompt += `${character.eyeColor} eyes, `;
    }

    // Type de corps
    if (character.bodyType) {
      prompt += `${this.translateBodyType(character.bodyType)}, `;
    }

    // Taille
    if (character.height) {
      prompt += `${character.height} tall, `;
    }

    // Tenue
    if (character.outfit) {
      prompt += `wearing ${character.outfit}, `;
    }

    // Traits du visage
    if (character.appearance) {
      prompt += `${character.appearance}, `;
    }

    // Tags supplémentaires
    if (character.tags && character.tags.length > 0) {
      prompt += character.tags.join(', ') + ', ';
    }

    // Niveau NSFW
    if (options.nsfwLevel && options.nsfwLevel > 1) {
      prompt += this.buildNSFWPrompt(options.nsfwLevel);
    }

    // Nettoyage du prompt
    prompt = prompt.replace(/,\s*,/g, ',').trim();
    if (prompt.endsWith(',')) {
      prompt = prompt.slice(0, -1);
    }

    return prompt;
  }

  /**
   * Traduit le type de corps en anglais
   */
  translateBodyType(bodyType) {
    const translations = {
      'mince': 'slim slender body',
      'élancée': 'tall slender body',
      'moyenne': 'average body',
      'athlétique': 'athletic muscular body',
      'voluptueuse': 'voluptuous curvy body, hourglass figure',
      'généreuse': 'generous curvy body, full-figured',
      'pulpeuse': 'plump curvy body',
      'ronde': 'chubby round body',
      'très ronde': 'very chubby BBW body',
      'plantureuse': 'voluptuous body, big breasts, wide hips',
      'enrobée': 'plump soft body',
      'potelée': 'chubby cute body',
    };
    return translations[bodyType.toLowerCase()] || bodyType;
  }

  /**
   * Parse l'âge (gère "300 ans (apparence 25)")
   */
  parseAge(age) {
    if (typeof age === 'number') return age;
    
    const match = age.match(/(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    
    // Extraire l'âge d'apparence si disponible
    const appearanceMatch = age.match(/apparence\s+(\d+)/i);
    if (appearanceMatch) {
      return parseInt(appearanceMatch[1]);
    }
    
    return 25; // Par défaut
  }

  /**
   * Construit le prompt NSFW selon le niveau
   */
  buildNSFWPrompt(level) {
    const nsfwPrompts = {
      1: '',
      2: 'sexy, seductive, revealing clothes, cleavage visible, ',
      3: 'sexy lingerie, bra and panties, lace underwear, in underwear, ',
      4: 'topless, bare breasts, nipples visible, naked from waist up, ',
      5: 'fully nude, completely naked, artistic nudity, naked body fully exposed, ',
      6: 'nude sensual pose, naked body glistening, legs slightly apart, erotic, ',
      7: 'explicit adult content, passionate, intimate exposure, ',
    };
    return nsfwPrompts[level] || '';
  }

  /**
   * Génère avec Pollinations.ai
   */
  async generateWithPollinations(prompt, options = {}) {
    try {
      const encodedPrompt = encodeURIComponent(prompt);
      const seed = Date.now() + Math.floor(Math.random() * 99999);
      const width = options.width || 576;
      const height = options.height || 1024;
      
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&nofeed=true&model=flux&t=${Date.now()}`;
      
      console.log('✅ URL Pollinations générée');
      return url;
    } catch (error) {
      console.error('❌ Erreur Pollinations:', error);
      throw error;
    }
  }

  /**
   * Génère avec Stability AI
   */
  async generateWithStability(prompt, options = {}) {
    try {
      const apiKey = await AsyncStorage.getItem('stability_api_key');
      if (!apiKey) {
        throw new Error('Clé API Stability AI requise');
      }

      const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          text_prompts: [{ text: prompt }],
          cfg_scale: 7,
          height: 1024,
          width: 576,
          steps: 30,
          samples: 1,
        }),
      });

      const data = await response.json();
      if (data.artifacts && data.artifacts[0]) {
        const base64Image = data.artifacts[0].base64;
        return `data:image/png;base64,${base64Image}`;
      }

      throw new Error('Erreur génération Stability AI');
    } catch (error) {
      console.error('❌ Erreur Stability AI:', error);
      throw error;
    }
  }

  /**
   * Génère avec Replicate
   */
  async generateWithReplicate(prompt, options = {}) {
    try {
      const apiKey = await AsyncStorage.getItem('replicate_api_key');
      if (!apiKey) {
        throw new Error('Clé API Replicate requise');
      }

      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
          input: {
            prompt: prompt,
            width: 576,
            height: 1024,
            num_outputs: 1,
            scheduler: 'K_EULER',
            num_inference_steps: 30,
            guidance_scale: 7.5,
          },
        }),
      });

      const data = await response.json();
      
      // Attendre que la génération soit terminée
      if (data.status === 'processing') {
        return await this.waitForReplicateResult(data.urls.get, apiKey);
      }

      if (data.output && data.output[0]) {
        return data.output[0];
      }

      throw new Error('Erreur génération Replicate');
    } catch (error) {
      console.error('❌ Erreur Replicate:', error);
      throw error;
    }
  }

  /**
   * Attend le résultat de Replicate
   */
  async waitForReplicateResult(url, apiKey) {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${apiKey}`,
        },
      });
      
      const data = await response.json();
      
      if (data.status === 'succeeded' && data.output && data.output[0]) {
        return data.output[0];
      }
      
      if (data.status === 'failed') {
        throw new Error('Échec génération Replicate');
      }
    }
    
    throw new Error('Timeout génération Replicate');
  }

  /**
   * Sélectionne une API
   */
  async selectApi(apiId) {
    const api = this.apis.find(a => a.id === apiId);
    if (api) {
      this.selectedApi = apiId;
      await AsyncStorage.setItem('selected_image_api', apiId);
      return true;
    }
    return false;
  }

  /**
   * Charge l'API sélectionnée
   */
  async loadSelectedApi() {
    try {
      const apiId = await AsyncStorage.getItem('selected_image_api');
      if (apiId) {
        this.selectedApi = apiId;
      }
    } catch (error) {
      console.error('Erreur chargement API:', error);
    }
  }

  /**
   * Retourne les APIs disponibles
   */
  getAvailableApis() {
    return this.apis;
  }

  /**
   * Retourne l'API actuelle
   */
  getCurrentApi() {
    return this.apis.find(a => a.id === this.selectedApi);
  }
}

export default new AdvancedImageGenerationService();
