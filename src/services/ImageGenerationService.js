import axios from 'axios';

class ImageGenerationService {
  constructor() {
    // Using Pollinations.ai - free, unlimited, no API key needed
    this.baseURL = 'https://image.pollinations.ai/prompt/';
    this.styles = [
      'photorealistic portrait',
      'anime style portrait',
      'digital art portrait',
      'realistic photo',
      'cartoon style',
      '3D render',
    ];
  }

  async generateImage(prompt, style = null) {
    try {
      const selectedStyle = style || this.getRandomStyle();
      const fullPrompt = `${selectedStyle}, ${prompt}, high quality, detailed`;
      
      // Encode the prompt for URL
      const encodedPrompt = encodeURIComponent(fullPrompt);
      
      // Pollinations.ai automatically generates and returns an image
      const imageUrl = `${this.baseURL}${encodedPrompt}?width=512&height=512&nologo=true&seed=${Date.now()}`;
      
      return imageUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error('Échec de génération d\'image');
    }
  }

  getRandomStyle() {
    return this.styles[Math.floor(Math.random() * this.styles.length)];
  }

  async generateCharacterImage(character) {
    // FILTRAGE: Ne pas générer d'images pour les personnages trop jeunes
    if (character.age < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    // Construire le prompt avec les attributs anatomiques
    let prompt = `${character.gender === 'male' ? 'handsome man' : 'beautiful woman'}, ${character.hairColor} hair, ${character.appearance}, adult, mature, 18+`;
    
    // Ajouter les attributs anatomiques de manière EXPLICITE
    if (character.gender === 'female' && character.bust) {
      const bustDescriptions = {
        'A': 'small breasts, petite chest, A cup',
        'B': 'small breasts, B cup',
        'C': 'medium breasts, C cup, balanced figure',
        'D': 'large breasts, D cup, curvy figure',
        'DD': 'very large breasts, DD cup, voluptuous figure',
        'E': 'very large breasts, E cup, voluptuous and curvy',
        'F': 'extremely large breasts, F cup, very curvy figure',
        'G': 'extremely large breasts, G cup, very voluptuous'
      };
      prompt += `, ${bustDescriptions[character.bust] || 'medium breasts, C cup'}`;
    }
    
    if (character.gender === 'male' && character.penis) {
      // Pour les hommes, ajouter des descripteurs de physique général
      prompt += `, athletic build, confident posture`;
    }
    
    return await this.generateImage(prompt);
  }
  
  async generateSceneImage(character, sceneDescription) {
    // FILTRAGE: Ne pas générer d'images pour les personnages trop jeunes
    if (character.age < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    // Générer une image basée sur le personnage dans une scène spécifique
    let prompt = `${character.gender === 'male' ? 'man' : 'woman'}, ${character.hairColor} hair, adult, mature`;
    
    if (character.gender === 'female' && character.bust) {
      const bustMap = {
        'A': 'slim body, small chest, A cup breasts',
        'B': 'slim body, small chest, B cup breasts',
        'C': 'balanced figure, medium chest, C cup breasts',
        'D': 'curvy figure, large chest, D cup breasts',
        'DD': 'very curvy, very large chest, DD cup breasts',
        'E': 'voluptuous figure, very large chest, E cup breasts',
        'F': 'very voluptuous, extremely large chest, F cup breasts',
        'G': 'extremely voluptuous, massive chest, G cup breasts'
      };
      prompt += `, ${bustMap[character.bust] || 'medium chest, C cup breasts'}`;
    }
    
    prompt += `, ${sceneDescription}, detailed background, 18+`;
    
    return await this.generateImage(prompt);
  }
}

export default new ImageGenerationService();
