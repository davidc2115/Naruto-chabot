import AsyncStorage from '@react-native-async-storage/async-storage';
import PromptBuilder from './PromptBuilder';

/**
 * GroqService v7.0
 * - Prompt système unifié via PromptBuilder (partagé avec LlamaService)
 * - Format immersif : *pensée*, (action), dialogue (sans guillemets)
 * - Tempérament détaillé pris en compte (temperamentDetails)
 * - Respect du scénario initial (role : belle-mère, voisine, etc.)
 * - Évolution progressive de la proximité via le niveau de relation
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
      if (keysJson) this.apiKeys = JSON.parse(keysJson).filter(k => k && k.trim());
      const single = await AsyncStorage.getItem('groq_api_key');
      if (single && !this.apiKeys.includes(single)) this.apiKeys.push(single);
      const savedModel = await AsyncStorage.getItem('groq_model');
      if (savedModel) this.selectedModel = savedModel;
    } catch { /* ignore storage errors */ }
    return this.apiKeys;
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
    if (!this.apiKeys.length) throw new Error('NO_KEY');
    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  /**
   * Construit le prompt système unifié (utilisé par Groq ET Llama local).
   * @param {object} character
   * @param {object} userProfile
   * @param {string} memoriesPrompt
   * @param {object} relationship  { level, affection, trust, interactions }
   */
  buildSystemPrompt(character, userProfile, memoriesPrompt = '', relationship = null) {
    return PromptBuilder.buildSystemPrompt(character, userProfile, memoriesPrompt, relationship, { compact: false });
  }

  /**
   * Génère une réponse via l'API Groq (clé locale).
   */
  async generateResponse(messages, character, userProfile, options = {}, memoriesPrompt = '', relationship = null) {
    await this.loadApiKeys();
    if (!this.apiKeys.length) throw new Error('NO_KEY');

    const model = options.model || this.selectedModel;
    const systemPrompt = this.buildSystemPrompt(character, userProfile, memoriesPrompt, relationship);
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
        .slice(-80)
        .map(m => ({
          role: m.role === 'user' ? 'user' : (m.role === 'assistant' ? 'assistant' : null),
          content: m.content,
        }))
        .filter(m => m.role !== null && m.content?.trim()),
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
            max_tokens: options.maxTokens || 220,
            temperature: options.temperature || 0.9,
            frequency_penalty: 0.6,
            presence_penalty: 0.5,
            top_p: 0.93,
          }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          if (res.status === 401) { lastError = new Error('Clé Groq invalide — vérifiez dans Config → Groq IA.'); continue; }
          if (res.status === 429) { lastError = new Error('Limite Groq atteinte. Réessayez dans quelques secondes.'); continue; }
          throw new Error(e?.error?.message || `Groq erreur ${res.status}`);
        }
        const data = await res.json();
        return data.choices[0]?.message?.content || '';
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error('Toutes les clés ont échoué');
  }
}

export default new GroqService();
