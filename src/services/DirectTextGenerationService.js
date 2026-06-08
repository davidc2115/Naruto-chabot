import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service de génération de texte direct (intégré dans l'APK)
 * Utilise Pollinations.ai directement - GRATUIT, SANS CLÉ, ILLIMITÉ
 */
class DirectTextGenerationService {
  constructor() {
    this.selectedModel = 'mistral';
    this.models = [
      { id: 'mistral', name: 'Mistral 7B', url: 'https://text.pollinations.ai/' },
      { id: 'gpt4', name: 'GPT-4 (Simulated)', url: 'https://text.pollinations.ai/' },
      { id: 'llama3', name: 'Llama 3 70B', url: 'https://text.pollinations.ai/' },
    ];
  }

  /**
   * Génère du texte avec Pollinations.ai
   */
  async generateText(prompt, options = {}) {
    try {
      const model = options.model || this.selectedModel;
      const maxTokens = options.maxTokens || 200;
      const temperature = options.temperature || 0.7;

      // Construire l'URL Pollinations.ai
      const encodedPrompt = encodeURIComponent(prompt);
      const url = `https://text.pollinations.ai/${encodedPrompt}?model=${model}&max=${maxTokens}&temp=${temperature}&seed=${Date.now()}`;

      console.log(`📝 Génération texte avec Pollinations.ai: ${prompt.substring(0, 50)}...`);

      // Faire la requête
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const text = await response.text();
      
      console.log(`✅ Texte généré: ${text.substring(0, 50)}...`);
      return text;
    } catch (error) {
      console.error('❌ Erreur génération texte:', error);
      throw new Error(`Impossible de générer le texte: ${error.message}`);
    }
  }

  /**
   * Génère une réponse de chat
   */
  async generateChatResponse(messages, character, userProfile) {
    try {
      // Construire le prompt à partir des messages
      const prompt = this.buildChatPrompt(messages, character, userProfile);
      
      // Générer la réponse
      const response = await this.generateText(prompt, {
        maxTokens: 200,
        temperature: 0.7
      });

      return response;
    } catch (error) {
      console.error('❌ Erreur génération chat:', error);
      throw error;
    }
  }

  /**
   * Construit le prompt de chat
   */
  buildChatPrompt(messages, character, userProfile) {
    const lastMessages = messages.slice(-5); // Derniers 5 messages
    const conversation = lastMessages.map(m => `${m.role}: ${m.content}`).join('\n');
    
    let prompt = `You are ${character.name}, ${character.description || 'a friendly character'}.\n`;
    prompt += `Personality: ${character.personality || 'friendly and helpful'}.\n`;
    prompt += `Age: ${character.age || 'adult'}.\n`;
    prompt += `Gender: ${character.gender || 'unknown'}.\n\n`;
    
    prompt += `Conversation:\n${conversation}\n\n`;
    prompt += `Respond as ${character.name} in character. Keep responses under 200 characters.`;
    
    return prompt;
  }

  /**
   * Sélectionne un modèle
   */
  async selectModel(modelId) {
    const model = this.models.find(m => m.id === modelId);
    if (model) {
      this.selectedModel = modelId;
      await AsyncStorage.setItem('selected_text_model', modelId);
      return true;
    }
    return false;
  }

  /**
   * Charge le modèle sélectionné
   */
  async loadSelectedModel() {
    try {
      const modelId = await AsyncStorage.getItem('selected_text_model');
      if (modelId) {
        this.selectedModel = modelId;
      }
    } catch (error) {
      console.error('Erreur chargement modèle:', error);
    }
  }

  /**
   * Retourne les modèles disponibles
   */
  getAvailableModels() {
    return this.models;
  }

  /**
   * Retourne le modèle actuel
   */
  getCurrentModel() {
    return this.models.find(m => m.id === this.selectedModel);
  }
}

export default new DirectTextGenerationService();
