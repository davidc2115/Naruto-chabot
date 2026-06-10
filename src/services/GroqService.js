import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service de génération de texte avec Groq API (multi-clés)
 * - Rotation automatique entre les clés
 * - Support multi-modèles (Llama 70B, 8B, Mixtral)
 * - Gestion des erreurs et retries
 */
class GroqService {
  constructor() {
    this.apiKeys = [];
    this.currentKeyIndex = 0;
    this.selectedModel = 'llama3-70b-8192';
    this.models = [
      { id: 'llama3-70b-8192', name: 'Llama 3 70B' },
      { id: 'llama3-8b-8192', name: 'Llama 3 8B' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
    ];
  }

  /**
   * Charge les clés API depuis AsyncStorage
   */
  async loadApiKeys() {
    try {
      const keysJson = await AsyncStorage.getItem('groq_api_keys');
      if (keysJson) {
        this.apiKeys = JSON.parse(keysJson);
        this.apiKeys = this.apiKeys.filter(key => key && key.trim() !== '');
      }
      
      // Charger aussi la clé unique pour compatibilité
      const singleKey = await AsyncStorage.getItem('groq_api_key');
      if (singleKey && !this.apiKeys.includes(singleKey)) {
        this.apiKeys.push(singleKey);
      }
      
      console.log(`🔑 ${this.apiKeys.length} clé(s) Groq chargée(s)`);
      return this.apiKeys;
    } catch (error) {
      console.error('❌ Erreur chargement clés Groq:', error);
      return [];
    }
  }

  /**
   * Sauvegarde les clés API
   */
  async saveApiKeys(keys) {
    try {
      const validKeys = keys.filter(key => key && key.trim() !== '');
      await AsyncStorage.setItem('groq_api_keys', JSON.stringify(validKeys));
      
      // Sauvegarder aussi la première clé pour compatibilité
      if (validKeys.length > 0) {
        await AsyncStorage.setItem('groq_api_key', validKeys[0]);
      }
      
      this.apiKeys = validKeys;
      console.log(`✅ ${validKeys.length} clé(s) Groq sauvegardée(s)`);
      return true;
    } catch (error) {
      console.error('❌ Erreur sauvegarde clés Groq:', error);
      return false;
    }
  }

  /**
   * Obtient la clé API courante avec rotation
   */
  getCurrentApiKey() {
    if (this.apiKeys.length === 0) {
      throw new Error('Aucune clé API Groq configurée');
    }
    
    const key = this.apiKeys[this.currentKeyIndex];
    // Rotation pour la prochaine requête
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    
    return key;
  }

  /**
   * Génère une réponse avec Groq API
   */
  async generateResponse(messages, character, userProfile, options = {}) {
    try {
      await this.loadApiKeys();
      
      if (this.apiKeys.length === 0) {
        throw new Error('Aucune clé API Groq configurée. Ajoutez des clés dans les paramètres.');
      }

      const model = options.model || this.selectedModel;
      const maxTokens = options.maxTokens || 200;
      const temperature = options.temperature || 0.7;

      // Construire le prompt
      const prompt = this.buildPrompt(messages, character, userProfile);

      // Essayer avec rotation des clés
      let lastError = null;
      for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
        try {
          const apiKey = this.getCurrentApiKey();
          
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: 'system', content: `You are ${character.name}, ${character.description || 'a friendly character'}. Personality: ${character.personality || 'friendly and helpful'}. Age: ${character.age || 'adult'}. Gender: ${character.gender || 'unknown'}.` },
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
          
          console.log(`✅ Réponse générée avec Groq (${model}): ${text.substring(0, 50)}...`);
          return text;
        } catch (error) {
          console.error(`❌ Erreur clé ${attempt + 1}/${this.apiKeys.length}:`, error.message);
          lastError = error;
          // Continuer avec la clé suivante
        }
      }

      throw lastError || new Error('Impossible de générer une réponse avec aucune des clés');
    } catch (error) {
      console.error('❌ Erreur génération Groq:', error);
      throw error;
    }
  }

  /**
   * Construit le prompt à partir des messages
   */
  buildPrompt(messages, character, userProfile) {
    const lastMessages = messages.slice(-5); // Derniers 5 messages
    const conversation = lastMessages.map(m => `${m.role}: ${m.content}`).join('\n');
    
    let prompt = `Conversation:\n${conversation}\n\n`;
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
      await AsyncStorage.setItem('groq_model', modelId);
      return true;
    }
    return false;
  }

  /**
   * Charge le modèle sélectionné
   */
  async loadSelectedModel() {
    try {
      const modelId = await AsyncStorage.getItem('groq_model');
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

  /**
   * Teste une clé API
   */
  async testApiKey(apiKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [
            { role: 'user', content: 'Hello' }
          ],
          max_tokens: 10,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Erreur test clé:', error);
      return false;
    }
  }
}

export default new GroqService();
