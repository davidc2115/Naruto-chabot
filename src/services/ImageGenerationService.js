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
    // Construire le prompt avec les attributs anatomiques
    let prompt = `${character.gender === 'male' ? 'handsome man' : 'beautiful woman'}, ${character.hairColor} hair, ${character.appearance}`;
    
    // Ajouter les attributs anatomiques de manière subtile
    if (character.gender === 'female' && character.bust) {
      const bustDescriptions = {
        'A': 'petite',
        'B': 'petite',
        'C': 'medium',
        'D': 'curvy',
        'DD': 'voluptuous',
        'E': 'voluptuous',
        'F': 'very curvy',
        'G': 'very curvy'
      };
      prompt += `, ${bustDescriptions[character.bust] || 'medium'} figure`;
    }
    
    if (character.gender === 'male' && character.penis) {
      // Pour les hommes, ajouter des descripteurs de physique général
      prompt += `, athletic build, confident posture`;
    }
    
    return await this.generateImage(prompt);
  }
  
  async generateSceneImage(character, sceneDescription) {
    // Générer une image basée sur le personnage dans une scène spécifique
    let prompt = `${character.gender === 'male' ? 'man' : 'woman'}, ${character.hairColor} hair`;
    
    if (character.gender === 'female' && character.bust) {
      const bustDesc = ['A', 'B'].includes(character.bust) ? 'slim' : 
                       ['C', 'D'].includes(character.bust) ? 'curvy' : 'voluptuous';
      prompt += `, ${bustDesc} figure`;
    }
    
    prompt += `, ${sceneDescription}, detailed background`;
    
    return await this.generateImage(prompt);
  }
}

export default new ImageGenerationService();
