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
    const prompt = `${character.gender === 'male' ? 'man' : character.gender === 'female' ? 'woman' : 'person'}, ${character.hairColor} hair, ${character.appearance}`;
    return await this.generateImage(prompt);
  }
}

export default new ImageGenerationService();
