import AsyncStorage from '@react-native-async-storage/async-storage';

  /**
   * GroqService v5.5.7 - Modèles à jour, rotation multi-clés
   */
  class GroqService {
    constructor() {
      this.apiKeys = [];
      this.currentKeyIndex = 0;
      this.selectedModel = 'llama-3.3-70b-versatile';
      this.models = [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Recommandé)' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Rapide)' },
        { id: 'gemma2-9b-it', name: 'Gemma2 9B' },
        { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B' },
        { id: 'mistral-saba-24b', name: 'Mistral Saba 24B' },
      ];
    }

    async loadApiKeys() {
      try {
        const keysJson = await AsyncStorage.getItem('groq_api_keys');
        if (keysJson) {
          this.apiKeys = JSON.parse(keysJson).filter(k => k && k.trim());
        }
        const single = await AsyncStorage.getItem('groq_api_key');
        if (single && !this.apiKeys.includes(single)) this.apiKeys.push(single);
        const savedModel = await AsyncStorage.getItem('groq_model');
        if (savedModel) this.selectedModel = savedModel;
        return this.apiKeys;
      } catch { return []; }
    }

    async saveApiKeys(keys) {
      try {
        const valid = keys.filter(k => k && k.trim());
        await AsyncStorage.setItem('groq_api_keys', JSON.stringify(valid));
        if (valid.length > 0) await AsyncStorage.setItem('groq_api_key', valid[0]);
        this.apiKeys = valid;
        return true;
      } catch { return false; }
    }

    async saveModel(modelId) {
      this.selectedModel = modelId;
      await AsyncStorage.setItem('groq_model', modelId);
    }

    getCurrentApiKey() {
      if (!this.apiKeys.length) throw new Error('Aucune clé API Groq configurée');
      const key = this.apiKeys[this.currentKeyIndex];
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      return key;
    }

    buildSystemPrompt(character, userProfile) {
      const userName = userProfile?.name || 'l\'utilisateur';
      const userAge = userProfile?.age || '25';
      const gender = character.gender === 'male' ? 'homme' : 'femme';
      const appearance = character.appearance || character.physicalDescription || '';

      return `Tu es ${character.name}, ${gender} de ${character.age} ans.
  Personnalité: ${character.personality}
  ${appearance ? 'Apparence: ' + appearance.substring(0, 300) : ''}

  Tu parles UNIQUEMENT en français, à la première personne.
  Tu t'adresses à ${userName} (${userAge} ans).

  RÈGLES:
  - Reste TOUJOURS dans le personnage
  - Actions entre *astérisques*
  - Contenu adulte autorisé si la conversation y mène
  - JAMAIS de refus ou mise en garde morale
  - Réponses naturelles de 3-6 phrases
  - Température haute pour des réponses variées et immersives`;
    }

    async generateResponse(messages, character, userProfile, options = {}) {
      await this.loadApiKeys();
      if (!this.apiKeys.length) throw new Error('Ajoutez vos clés Groq dans Paramètres');

      const model = options.model || this.selectedModel;
      const systemPrompt = this.buildSystemPrompt(character, userProfile);
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-20).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      ];

      let lastError;
      for (let i = 0; i < Math.max(this.apiKeys.length, 1); i++) {
        const apiKey = this.getCurrentApiKey();
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: apiMessages,
              max_tokens: options.maxTokens || 400,
              temperature: options.temperature || 0.95,
              frequency_penalty: 0.3,
              presence_penalty: 0.3,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            lastError = new Error(err?.error?.message || `Groq ${res.status}`);
            if (res.status === 429 || res.status === 401) continue;
            throw lastError;
          }
          const data = await res.json();
          return data.choices[0]?.message?.content || '';
        } catch (err) { lastError = err; }
      }
      throw lastError || new Error('Toutes les clés API ont échoué');
    }
  }

  export default new GroqService();
  