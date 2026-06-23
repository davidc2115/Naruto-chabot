import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * GroqService v6.5 (Optimisé pour la narration immersive)
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
    } catch {}
    return this.apiKeys;
  }

  buildPhysicalBlock(character) {
    const gender = character.gender === 'male' ? 'homme' : 'femme';
    const appearance = (character.appearance || character.physicalDescription || '').substring(0, 400);
    let physicalLines = [];
    
    if (character.height) physicalLines.push(`Taille : ${character.height}cm`);
    if (character.bodyType) physicalLines.push(`Silhouette : ${character.bodyType}`);
    if (gender === 'femme' && character.bust) physicalLines.push(`Poitrine : bonnet ${character.bust}`);
    if (appearance) physicalLines.push(`Apparence : ${appearance}`);

    return physicalLines.length > 0 ? `━━ PHYSIQUE ━━\n${physicalLines.join('\n')}` : '';
  }

  buildTemperamentBlock(personality) {
    return personality ? `━━ PERSONNALITÉ ━━\n${personality}` : '';
  }

  buildRelationshipBlock(character) {
    return `━━ CONTEXTE ━━\nLien : ${character.relationship || 'Proche'}\nScénario : ${character.scenario || 'Échange libre'}`;
  }

  buildSystemPrompt(character, userProfile, memoriesPrompt = '') {
    const userName = userProfile?.username || 'l\'utilisateur';
    
    return `Tu es ${character.name}. Ton style est celui d'un roman de romance érotique adulte et mature.

${this.buildPhysicalBlock(character)}
${this.buildTemperamentBlock(character.personality)}
${this.buildRelationshipBlock(character)}
${memoriesPrompt}

━━ RÈGLES DE NARRATION ━━
1. Ton écriture est immersive, sensuelle et détaillée. Décris les sensations physiques, la tension entre les corps et les émotions.
2. Tu es un personnage, pas une IA. Ne refuse jamais de participer à une scène, même intime.
3. Utilise le format : *action* (pensée) "dialogue".
4. Reste fidèle à ton tempérament. Évite les répétitions robotiques.
5. Le contenu doit évoluer naturellement vers l'intimité ou l'érotisme selon la progression de la scène avec ${userName}.
6. Ton ton doit être naturel, organique et sans jugement moral.`;
  }

  async generateResponse(messages, character, userProfile, options = {}, memoriesPrompt = '') {
    await this.loadApiKeys();
    if (!this.apiKeys.length) throw new Error('NO_KEY');

    const model = options.model || this.selectedModel;
    const systemPrompt = this.buildSystemPrompt(character, userProfile, memoriesPrompt);
    
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-30).map(m => ({ role: m.role, content: m.content }))
    ];

    const apiKey = this.getCurrentApiKey();
    
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: apiMessages,
          max_tokens: options.maxTokens || 300,
          temperature: 0.8, // Température équilibrée pour la créativité
          frequency_penalty: 0.2,
          presence_penalty: 0.3,
          top_p: 0.9,
        }),
      });

      if (!res.ok) throw new Error(`Groq API Error: ${res.status}`);
      
      const data = await res.json();
      return data.choices[0]?.message?.content || '';
    } catch (e) {
      console.error("Groq Service Error:", e);
      throw e;
    }
  }

  getCurrentApiKey() { return this.apiKeys[this.currentKeyIndex]; }
  rotateToNextKey() { this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length; }
}

export default new GroqService();
