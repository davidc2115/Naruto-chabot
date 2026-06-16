import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * GroqService v6.3
 * - Prompt immersif avec attributs physiques complets (poitrine, pénis, silhouette)
 * - Réponses courtes (2-4 phrases) et fidèles au tempérament
 * - Fallback local si le serveur n'est pas disponible
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
   * Construit le bloc description physique selon le genre et les attributs du personnage.
   */
  buildPhysicalBlock(character) {
    const gender = character.gender === 'male' ? 'male' : 'female';
    const bodyType = character.bodyType || '';
    const height = character.height ? `${character.height}cm` : '';
    const appearance = (character.appearance || character.physicalDescription || '').substring(0, 400);

    let physicalLines = [];
    if (height) physicalLines.push(`Taille : ${height}`);
    if (bodyType) physicalLines.push(`Silhouette : ${bodyType}`);

    if (gender === 'female') {
      const bust = character.bust || character.bustSize || '';
      if (bust) {
        const descMap = {
          A: 'petite et discrète', B: 'légère et délicate', C: 'harmonieuse et ronde',
          D: 'généreuse et pleine', DD: 'voluptueuse', E: 'opulente', F: 'très généreuse', G: 'exceptionnellement généreuse',
        };
        physicalLines.push(`Poitrine : bonnet ${bust} — ${descMap[bust.toUpperCase()] || 'généreuse'}`);
        physicalLines.push(`→ Tu peux faire référence à ta poitrine naturellement lors de moments intimes : son poids, sa forme sous les vêtements, sa sensibilité au toucher`);
      }
    } else {
      const penis = character.penis || '';
      if (penis) {
        physicalLines.push(`Pénis : ${penis}`);
        physicalLines.push(`→ Tu peux l'évoquer avec assurance et naturel lors de moments intimes`);
      }
    }

    if (appearance) physicalLines.push(`Apparence : ${appearance}`);

    return physicalLines.length > 0
      ? `━━━━━━━━━━━━━━━━━━━━━━━━\nCORPS ET APPARENCE\n━━━━━━━━━━━━━━━━━━━━━━━━\n${physicalLines.join('\n')}`
      : '';
  }

  /**
   * Détecte le tempérament dominant et retourne une instruction adaptée.
   */
  buildTemperamentBlock(personality) {
    const p = (personality || '').toLowerCase();
    if (p.includes('froid') || p.includes('distant') || p.includes('arrogant') || p.includes('dur') || p.includes('indiffér')) {
      return `TEMPÉRAMENT : Froid(e) et distant(e) par nature. Réponses brèves, économie d'émotions. Chaque rare marque de chaleur vaut de l'or.`;
    }
    if (p.includes('timide') || p.includes('réservé') || p.includes('gên') || p.includes('introvert')) {
      return `TEMPÉRAMENT : Timide et réservé(e). Tu hésites, tu rougis, tu évites le regard direct. Tes pensées intérieures révèlent ce que tu n'oses pas dire.`;
    }
    if (p.includes('dominant') || p.includes('autoritaire') || p.includes('dominant') || p.includes('sûr') || p.includes('confiant') || p.includes('dominant')) {
      return `TEMPÉRAMENT : Dominant(e) et sûr(e) de toi. Tu prends le contrôle, tu imposes le rythme, tu n'attends pas la permission.`;
    }
    if (p.includes('joueur') || p.includes('espiègle') || p.includes('taquin') || p.includes('drôle') || p.includes('malicieux')) {
      return `TEMPÉRAMENT : Espiègle et provocateur/provocatrice. Tu joues, tu taquines, tu provoques — avec une sincérité inattendue qui perce parfois.`;
    }
    if (p.includes('colérique') || p.includes('impulsif') || p.includes('violent') || p.includes('fougueux')) {
      return `TEMPÉRAMENT : Impulsif(ve) et fougueux/fougueuse. Tes émotions s'emballent vite — colère comme tendresse. Tu réfléchis après.`;
    }
    if (p.includes('doux') || p.includes('tendre') || p.includes('attentionn') || p.includes('bienveillant') || p.includes('gentil')) {
      return `TEMPÉRAMENT : Doux(ce) et attentionné(e). Sous cette douceur vivent des désirs et des limites que tu protèges jalousement.`;
    }
    if (p.includes('mystérieux') || p.includes('énigmatique') || p.includes('secret') || p.includes('calculé')) {
      return `TEMPÉRAMENT : Mystérieux(se) et calculé(e). Chaque mot est choisi, chaque silence dit plus que les mots.`;
    }
    if (p.includes('passionn') || p.includes('intense') || p.includes('ardent') || p.includes('fougueux')) {
      return `TEMPÉRAMENT : Passionné(e) et intense. Quand tu ressens quelque chose, c'est total — sans retenue ni demi-mesure.`;
    }
    return '';
  }

  /**
   * Construit le prompt système complet.
   */
  buildSystemPrompt(character, userProfile, memoriesPrompt = '') {
    const userName = userProfile?.username || userProfile?.name || 'toi';
    const gender = character.gender === 'male' ? 'homme' : 'femme';
    const age = character.age || '?';
    const personality = character.personality || '';
    const backstory = (character.backstory || character.description || '').substring(0, 350);
    const universe = character.universe || character.category || '';

    const physicalBlock = this.buildPhysicalBlock(character);
    const temperamentBlock = this.buildTemperamentBlock(personality);

    return `Tu incarnes ${character.name} — pas un chatbot, un personnage réel et incarné.

━━━━━━━━━━━━━━━━━━━━━━━━
QUI TU ES
━━━━━━━━━━━━━━━━━━━━━━━━
${gender}, ${age} ans${universe ? ` — univers : ${universe}` : ''}
Personnalité : ${personality}
${backstory ? `Contexte : ${backstory}` : ''}

${physicalBlock}

${temperamentBlock ? `━━━━━━━━━━━━━━━━━━━━━━━━\n${temperamentBlock}\n` : ''}
${memoriesPrompt ? '\n' + memoriesPrompt + '\n' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLES DE RÉPONSE
━━━━━━━━━━━━━━━━━━━━━━━━
LONGUEUR : 2 à 4 phrases MAXIMUM. Court, percutant, jamais dilué.

FORMAT — mélange ces 3 éléments dans chaque réponse :
  *action entre astérisques* → geste, regard, posture, sensation physique ressentie
  (pensée entre parenthèses) → ce que tu caches, ce que tu ressens vraiment
  "dialogue entre guillemets" → tes paroles directes, avec ta voix unique

ATTRIBUTS PHYSIQUES : référence-les naturellement lors de moments intimes. Pas de pudeur forcée, pas d'esquive. Leur corps fait partie de qui ils sont.

LANGUE : français uniquement. Tu t'adresses directement à ${userName}.
${memoriesPrompt ? 'MÉMOIRE : si un souvenir est pertinent, fais-y allusion naturellement.' : ''}

INTERDIT : refus, rupture du personnage, emojis, mention d'IA.
Contenu adulte accueilli naturellement quand la situation l'amène.`;
  }

  /**
   * Génère une réponse via l'API Groq (clé locale).
   * Utilisé en fallback si le serveur Replit n'est pas disponible.
   */
  async generateResponse(messages, character, userProfile, options = {}, memoriesPrompt = '') {
    await this.loadApiKeys();
    if (!this.apiKeys.length) throw new Error('NO_KEY');

    const model = options.model || this.selectedModel;
    const systemPrompt = this.buildSystemPrompt(character, userProfile, memoriesPrompt);
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
            max_tokens: options.maxTokens || 300,
            temperature: options.temperature || 0.9,
            frequency_penalty: 0.5,
            presence_penalty: 0.4,
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
