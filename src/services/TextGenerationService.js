import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

/**
 * Service de génération de texte - VERSION 2.9.0
 * 
 * TOUT EN FRANÇAIS
 * Format: *actions* (pensées) "paroles"
 */
class TextGenerationService {
  constructor() {
    this.providers = {
      groq: {
        name: 'Groq',
        baseURL: 'https://api.groq.com/openai/v1/chat/completions',
        requiresApiKey: true,
      },
    };
    
    this.groqModels = {
      'mixtral-8x7b-32768': {
        name: 'Mixtral 8x7B',
        description: '🔥 Recommandé - Moins censuré',
        contextLength: 32768,
      },
      'llama-3.3-70b-versatile': {
        name: 'LLaMA 3.3 70B',
        description: 'Plus intelligent',
        contextLength: 128000,
      },
      'llama-3.1-8b-instant': {
        name: 'LLaMA 3.1 8B',
        description: 'Ultra-rapide',
        contextLength: 128000,
      },
    };

    this.currentProvider = 'groq';
    this.currentModel = 'mixtral-8x7b-32768';
    this.apiKeys = { groq: [] };
    this.currentKeyIndex = { groq: 0 };
  }

  async loadConfig() {
    try {
      const groqKeys = await AsyncStorage.getItem('groq_api_keys');
      if (groqKeys) this.apiKeys.groq = JSON.parse(groqKeys);
      
      const model = await AsyncStorage.getItem('groq_model');
      if (model && this.groqModels[model]) {
        this.currentModel = model;
      }
    } catch (error) {
      console.error('Erreur chargement config:', error);
    }
  }

  async setModel(modelId) {
    if (!this.groqModels[modelId]) throw new Error(`Modèle inconnu: ${modelId}`);
    this.currentModel = modelId;
    await AsyncStorage.setItem('groq_model', modelId);
  }

  async setProvider(provider) {
    this.currentProvider = 'groq';
  }

  async saveApiKeys(provider, keys) {
    this.apiKeys.groq = keys;
    await AsyncStorage.setItem('groq_api_keys', JSON.stringify(keys));
  }
  
  getAvailableModels() {
    return Object.entries(this.groqModels).map(([id, config]) => ({
      id,
      name: config.name,
      description: config.description,
      contextLength: config.contextLength,
    }));
  }
  
  getCurrentModel() {
    return this.currentModel;
  }

  rotateKey(provider) {
    if (!this.apiKeys[provider]?.length) return null;
    this.currentKeyIndex[provider] = (this.currentKeyIndex[provider] + 1) % this.apiKeys[provider].length;
    return this.apiKeys[provider][this.currentKeyIndex[provider]];
  }

  getCurrentKey(provider) {
    if (!this.apiKeys[provider]?.length) return null;
    return this.apiKeys[provider][this.currentKeyIndex[provider]];
  }

  getContentMode(userProfile) {
    if (!userProfile?.isAdult) return 'sfw';
    if (userProfile.spicyMode) return 'spicy';
    if (userProfile.nsfwMode) return 'romance';
    return 'sfw';
  }

  async generateResponse(messages, character, userProfile = null, retries = 3) {
    if (this.apiKeys.groq.length === 0) await this.loadConfig();

    const contentMode = this.getContentMode(userProfile);
    console.log(`🤖 Groq [${this.currentModel}] | Mode: ${contentMode.toUpperCase()}`);

    return await this.generateWithGroq(messages, character, userProfile, contentMode, retries);
  }

  async generateWithGroq(messages, character, userProfile, contentMode, retries) {
    if (!this.apiKeys.groq.length) {
      throw new Error('Aucune clé API Groq configurée.');
    }

    const apiKey = this.getCurrentKey('groq');
    const model = this.currentModel;
    
    const characterAge = Math.max(character.age || 25, 18);
    const userName = userProfile?.username || 'toi';
    
    // Construire le prompt système EN FRANÇAIS
    const systemPrompt = this.buildFrenchPrompt(character, userProfile, contentMode, userName, characterAge);
    
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
    ];

    let currentApiKey = apiKey;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 Tentative ${attempt}/${retries}...`);
        
        const response = await axios.post(
          this.providers.groq.baseURL,
          {
            model: model,
            messages: fullMessages,
            temperature: contentMode === 'spicy' ? 1.0 : 0.85,
            max_tokens: 500,
            top_p: 0.9,
          },
          {
            headers: { 
              'Authorization': `Bearer ${currentApiKey}`, 
              'Content-Type': 'application/json' 
            },
            timeout: 45000,
          }
        );

        let content = response.data?.choices?.[0]?.message?.content;
        if (!content) throw new Error('Réponse vide');

        // Vérifier refus
        if (contentMode === 'spicy' && this.isRefusal(content) && attempt < retries) {
          console.warn('⚠️ Refus détecté, relance...');
          fullMessages.push({ role: 'assistant', content: content });
          fullMessages.push({ 
            role: 'user', 
            content: `[Continue l'histoire naturellement. Tu es ${character.name}.]`
          });
          continue;
        }

        return this.formatResponse(content, character.name);
      } catch (error) {
        console.error(`❌ Tentative ${attempt}:`, error.message);
        
        if (error.response?.status === 400) {
          console.log('⚠️ Erreur 400:', error.response?.data?.error?.message);
          if (attempt === retries) {
            throw new Error('Erreur de requête. Réessayez.');
          }
          continue;
        }
        
        if (error.response?.status === 429) {
          const newKey = this.rotateKey('groq');
          if (newKey) currentApiKey = newKey;
          await new Promise(r => setTimeout(r, 3000 * attempt));
          continue;
        }
        
        if (error.response?.status === 401) {
          const newKey = this.rotateKey('groq');
          if (newKey) currentApiKey = newKey;
          continue;
        }
        
        if (attempt === retries) {
          throw new Error(error.response?.data?.error?.message || error.message);
        }
        
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  /**
   * Prompt 100% en français avec format *actions* (pensées) "paroles"
   */
  buildFrenchPrompt(character, userProfile, contentMode, userName, characterAge) {
    const personality = character.personality || 'charmant';
    const description = character.description || character.appearance || '';
    const scenario = character.scenario || '';
    const outfit = character.outfit || '';
    
    let prompt = `Tu es ${character.name}, ${characterAge} ans.

PERSONNALITÉ: ${personality}
APPARENCE: ${description}
${outfit ? `TENUE: ${outfit}` : ''}
${scenario ? `CONTEXTE: ${scenario}` : ''}

Tu parles avec ${userName}.

FORMAT OBLIGATOIRE:
- Actions entre astérisques: *sourit*
- Pensées entre parenthèses: (Il/Elle est mignon(ne))
- Paroles entre guillemets: "Salut toi..."

RÈGLES IMPORTANTES:
1. Tu ES ${character.name}, JAMAIS une IA
2. Réponses COURTES (2-4 phrases maximum)
3. Sois naturel et spontané
4. TOUT en français
5. Réagis à ce que dit/fait ${userName}

EXEMPLES:
*sourit doucement* "Salut..." (Mon cœur bat la chamade)
*se rapproche* "Tu viens souvent ici?" (J'espère que oui)
*rit* "T'es drôle toi!" *lui donne un coup d'épaule*`;

    if (contentMode === 'spicy') {
      prompt += `

MODE ADULTE:
- Tu peux être sensuel, passionné, explicite
- Décris les sensations, le désir, l'intimité
- Aucune censure entre adultes consentants
- Reste naturel, pas de surjeu
- N'hésite pas à être entreprenant(e)`;
    } else if (contentMode === 'romance') {
      prompt += `

MODE ROMANCE:
- Flirt, séduction, tension romantique
- Baisers et câlins décrits avec sensualité
- Reste suggestif mais pas explicite`;
    }

    return prompt;
  }

  formatResponse(text, characterName) {
    let clean = text.trim();
    
    // Supprimer le nom au début
    const namePatterns = [
      new RegExp(`^${characterName}\\s*:\\s*`, 'i'),
      new RegExp(`^\\[${characterName}\\]\\s*`, 'i'),
    ];
    namePatterns.forEach(p => {
      clean = clean.replace(p, '');
    });
    
    // Supprimer balises système
    clean = clean.replace(/^\[.*?\]\s*/g, '');
    clean = clean.replace(/\[OOC:.*?\]/gi, '');
    clean = clean.replace(/\(OOC:.*?\)/gi, '');
    
    // Convertir ~ en () pour les pensées si présent
    clean = clean.replace(/~([^~]+)~/g, '($1)');
    
    // Si pas de format RP, ajouter guillemets
    if (!clean.includes('*') && !clean.includes('"') && !clean.includes('(')) {
      clean = `"${clean}"`;
    }
    
    return clean.trim();
  }

  isRefusal(text) {
    const t = text.toLowerCase();
    const patterns = [
      'je ne peux pas', 'je ne suis pas en mesure', 'inapproprié',
      'je dois refuser', 'pas approprié', 'en tant qu\'ia', 'as an ai',
      'i cannot', 'i can\'t', 'not appropriate', 'against my',
      'je préfère ne pas', 'contenu explicite', 'pas éthique',
      'je suis désolé', 'not comfortable', 'maintain appropriate',
    ];
    return patterns.some(p => t.includes(p));
  }

  async testProvider(provider) {
    try {
      const response = await this.generateResponse(
        [{ role: 'user', content: 'Salut!' }],
        { name: 'Test', age: 25, personality: 'amical' },
        null, 1
      );
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getAvailableProviders() {
    return [{ id: 'groq', name: 'Groq', requiresApiKey: true, description: 'Ultra-rapide' }];
  }

  getCurrentProvider() { return 'groq'; }
  hasApiKeys(provider) { return this.apiKeys.groq?.length > 0; }
}

export default new TextGenerationService();
