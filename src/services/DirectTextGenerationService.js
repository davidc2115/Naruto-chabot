import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service de génération de texte direct (intégré dans l'APK)
 * Utilise Groq API (nécessite clé) ou fallback sur réponses simulées
 */
class DirectTextGenerationService {
  constructor() {
    this.selectedApi = 'groq';
    this.apis = [
      { id: 'groq', name: 'Groq', requiresKey: true },
      { id: 'simulated', name: 'Simulé', requiresKey: false },
    ];
    this.selectedModel = 'llama3-70b-8192';
    this.models = [
      { id: 'llama3-70b-8192', name: 'Llama 3 70B' },
      { id: 'llama3-8b-8192', name: 'Llama 3 8B' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
    ];
  }

  /**
   * Génère du texte avec l'API sélectionnée
   */
  async generateText(prompt, options = {}) {
    try {
      const api = this.apis.find(a => a.id === this.selectedApi) || this.apis[0];
      
      if (api.id === 'groq') {
        return await this.generateWithGroq(prompt, options);
      } else {
        return await this.generateSimulated(prompt, options);
      }
    } catch (error) {
      console.error('❌ Erreur génération texte:', error);
      throw error;
    }
  }

  /**
   * Génère avec Groq API
   */
  async generateWithGroq(prompt, options = {}) {
    try {
      const apiKey = await AsyncStorage.getItem('groq_api_key');
      if (!apiKey) {
        throw new Error('Clé API Groq requise');
      }

      const model = options.model || this.selectedModel;
      const maxTokens = options.maxTokens || 200;
      const temperature = options.temperature || 0.7;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: maxTokens,
          temperature: temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices[0]?.message?.content || '';
      
      console.log(`✅ Texte généré avec Groq: ${text.substring(0, 50)}...`);
      return text;
    } catch (error) {
      console.error('❌ Erreur Groq:', error);
      throw error;
    }
  }

  /**
   * Génère une réponse simulée (fallback)
   */
  async generateSimulated(prompt, options = {}) {
    try {
      console.log(`📝 Génération simulée: ${prompt.substring(0, 50)}...`);
      
      // Réponses simples basées sur le prompt
      const responses = [
        "Hmm, intéressant...",
        "Je comprends ce que tu veux dire.",
        "C'est une bonne question.",
        "Laisse-moi réfléchir à ça...",
        "Oui, je suis d'accord.",
        "Non, je ne pense pas que ce soit une bonne idée.",
        "Pourquoi tu me demandes ça?",
        "Je ne suis pas sûr de comprendre.",
        "Dis-m'en plus.",
        "Intéressant point de vue.",
      ];

      const randomIndex = Math.floor(Math.random() * responses.length);
      return responses[randomIndex];
    } catch (error) {
      console.error('❌ Erreur génération simulée:', error);
      throw error;
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
