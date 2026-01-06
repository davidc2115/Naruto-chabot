import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

/**
 * Service unifié de génération de texte.
 *
 * Objectif:
 * - **SFW**: Groq (rapide, chat completions)
 * - **NSFW (18+)**: KoboldAI Horde (moins filtré) pour éviter les limitations Groq
 * - **Fallback**: si Groq échoue / refuse, bascule sur Kobold
 */
class TextGenerationService {
  constructor() {
    this.groq = {
      baseURL: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile',
      apiKeys: [],
      currentKeyIndex: 0,
    };

    // KoboldAI Horde (async)
    this.kobold = {
      submitURL: 'https://koboldai.net/api/v2/generate/text/async',
      statusURLBase: 'https://koboldai.net/api/v2/generate/text/status/',
      models: ['PygmalionAI/pygmalion-2-7b'],
      anonymousKey: '0000000000',
    };
  }

  async loadGroqApiKeys() {
    try {
      const raw = await AsyncStorage.getItem('groq_api_keys');
      if (raw) this.groq.apiKeys = JSON.parse(raw);
    } catch (error) {
      console.error('Error loading Groq API keys:', error);
    }
  }

  async saveGroqApiKeys(keys) {
    try {
      this.groq.apiKeys = keys;
      this.groq.currentKeyIndex = 0;
      await AsyncStorage.setItem('groq_api_keys', JSON.stringify(keys));
    } catch (error) {
      console.error('Error saving Groq API keys:', error);
    }
  }

  rotateGroqKey() {
    if (this.groq.apiKeys.length === 0) return null;
    this.groq.currentKeyIndex = (this.groq.currentKeyIndex + 1) % this.groq.apiKeys.length;
    return this.groq.apiKeys[this.groq.currentKeyIndex];
  }

  getCurrentGroqKey() {
    if (this.groq.apiKeys.length === 0) return null;
    return this.groq.apiKeys[this.groq.currentKeyIndex];
  }

  isNSFW(userProfile) {
    return Boolean(userProfile?.nsfwMode && userProfile?.isAdult);
  }

  truncateText(text, maxChars) {
    if (typeof text !== 'string') return '';
    if (text.length <= maxChars) return text;
    return `${text.slice(0, maxChars - 1)}…`;
  }

  sanitizeMessages(messages, { maxMessages = 18 } = {}) {
    const cleaned = (messages || [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: this.truncateText(m.content, 700) }));

    if (cleaned.length <= maxMessages) return cleaned;
    return cleaned.slice(-maxMessages);
  }

  looksLikeRefusal(text) {
    if (!text) return true;
    const t = text.toLowerCase();
    const patterns = [
      "i can't help",
      'i cannot help',
      "i can’t help",
      "i’m sorry",
      "i am sorry",
      'policy',
      'content policy',
      'cannot comply',
      "can't comply",
      'not able to',
      'as an ai',
    ];
    return patterns.some(p => t.includes(p));
  }

  buildSystemPrompt(character, userProfile) {
    let prompt = `Tu es ${character.name}. Tu incarnes ce personnage de manière immersive et naturelle.\n\n`;

    prompt += `PROFIL PERSONNAGE:\n`;
    prompt += `- Âge: ${character.age} ans\n`;
    prompt += `- Tempérament: ${character.temperament}\n`;
    prompt += `- Personnalité: ${character.personality}\n`;
    prompt += `- Apparence: ${character.appearance}\n`;
    if (character.outfit) {
      prompt += `- Tenue: ${character.outfit}\n`;
    }
    if (character.gender === 'female' && character.bust) {
      prompt += `- Poitrine: Bonnet ${character.bust}\n`;
    }
    if (character.gender === 'male' && character.penis) {
      prompt += `- Taille: ${character.penis}\n`;
    }

    prompt += `\nSCÉNARIO:\n${character.scenario}\n\n`;

    if (userProfile?.username) {
      prompt += `UTILISATEUR:\n`;
      prompt += `- Nom: ${userProfile.username}\n`;
      prompt += `- Âge: ${userProfile.age} ans\n`;
      prompt += `- Genre: ${
        userProfile.gender === 'male' ? 'homme' : userProfile.gender === 'female' ? 'femme' : 'personne'
      }\n\n`;
    }

    prompt += `RÈGLES DE ROLEPLAY:\n`;
    prompt += `- Utilise *astérisques* pour actions/pensées\n`;
    prompt += `- Utilise "guillemets" pour les paroles\n`;
    prompt += `- Reste concis (2-5 phrases) et fais avancer la scène\n`;
    prompt += `- Reste toujours dans le personnage\n`;

    return prompt;
  }

  buildKoboldPrompt(character, userProfile, messages) {
    const isNSFW = this.isNSFW(userProfile);
    const cleanedMessages = this.sanitizeMessages(messages, { maxMessages: 12 });

    // Prompt compact pour vitesse (Horde peut être lent si le contexte est énorme)
    let prompt = `Character: ${character.name}\n`;
    prompt += `Profile: ${this.truncateText(character.personality || '', 220)}. ${this.truncateText(character.appearance || '', 320)}\n`;
    if (character.outfit) prompt += `Outfit: ${character.outfit}\n`;
    prompt += `Scenario: ${this.truncateText(character.scenario || '', 360)}\n`;
    if (isNSFW) prompt += `Note: Adult roleplay between consenting adults (18+).\n`;
    prompt += `Rules: Use *asterisks* for actions/thoughts and "quotes" for dialogue. Stay in-character.\n`;
    prompt += `\nRoleplay:\n`;

    for (const msg of cleanedMessages) {
      if (msg.role === 'user') prompt += `User: ${this.truncateText(msg.content, 520)}\n`;
      if (msg.role === 'assistant') prompt += `${character.name}: ${this.truncateText(msg.content, 520)}\n`;
    }
    prompt += `${character.name}:`;

    return prompt;
  }

  async generateResponse(messages, character, userProfile = null, retries = 3) {
    const isNSFW = this.isNSFW(userProfile);

    // Routage: NSFW -> Kobold (évite les limitations Groq)
    if (isNSFW) {
      return await this.generateWithKobold(messages, character, userProfile, retries);
    }

    // SFW -> Groq, avec fallback vers Kobold si erreur/refus
    try {
      const groqText = await this.generateWithGroq(messages, character, userProfile, retries);
      if (!this.looksLikeRefusal(groqText)) return groqText;
      console.warn('Groq returned a refusal-like response, falling back to Kobold.');
      return await this.generateWithKobold(messages, character, userProfile, 2);
    } catch (error) {
      console.warn('Groq failed, falling back to Kobold:', error?.message || error);
      return await this.generateWithKobold(messages, character, userProfile, 2);
    }
  }

  async generateWithGroq(messages, character, userProfile, retries) {
    if (this.groq.apiKeys.length === 0) {
      await this.loadGroqApiKeys();
    }
    if (this.groq.apiKeys.length === 0) {
      throw new Error('Aucune clé API Groq configurée. Veuillez ajouter des clés dans les paramètres.');
    }

    const cleanedMessages = this.sanitizeMessages(messages, { maxMessages: 20 });
    const systemPrompt = this.buildSystemPrompt(character, userProfile);
    const fullMessages = [{ role: 'system', content: systemPrompt }, ...cleanedMessages];

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const apiKey = this.getCurrentGroqKey();
        console.log(`📡 [Groq] Tentative ${attempt}/${retries}`);

        const response = await axios.post(
          this.groq.baseURL,
          {
            model: this.groq.model,
            messages: fullMessages,
            temperature: 0.9,
            max_tokens: 900,
            top_p: 0.95,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) throw new Error('Réponse vide de l’API Groq');
        return content.trim();
      } catch (error) {
        const status = error.response?.status;
        console.error(`❌ [Groq] Tentative ${attempt} échouée:`, error.message);

        if (status === 401) {
          this.rotateGroqKey();
        }

        if (attempt < retries) {
          this.rotateGroqKey();
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        const errorMsg = error.response?.data?.error?.message || error.message;
        throw new Error(`Groq: ${errorMsg}`);
      }
    }
  }

  async generateWithKobold(messages, character, userProfile, retries) {
    const isNSFW = this.isNSFW(userProfile);
    const prompt = this.buildKoboldPrompt(character, userProfile, messages);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📡 [KoboldAI] Tentative ${attempt}/${retries}`);

        // Soumission async (Horde)
        const submitResponse = await axios.post(
          this.kobold.submitURL,
          {
            prompt,
            params: {
              // Vitesse > longueur
              max_length: 180,
              max_context_length: 1536,
              temperature: 0.85,
              top_p: 0.9,
              top_k: 0,
              rep_pen: 1.08,
              rep_pen_range: 256,
            },
            models: this.kobold.models,
            nsfw: isNSFW,
            trusted_workers: false,
            slow_workers: false,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              apikey: this.kobold.anonymousKey,
            },
            timeout: 10000,
          }
        );

        const taskId = submitResponse.data?.id;
        if (!taskId) throw new Error('KoboldAI: tâche invalide (id manquant)');

        // Polling raccourci (UX meilleure)
        let result = null;
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const statusResponse = await axios.get(`${this.kobold.statusURLBase}${taskId}`, { timeout: 5000 });

          if (statusResponse.data?.done) {
            result = statusResponse.data?.generations?.[0]?.text;
            break;
          }
        }

        if (!result) {
          throw new Error("Timeout: KoboldAI n'a pas généré de réponse à temps");
        }

        return result.trim();
      } catch (error) {
        console.error(`❌ [KoboldAI] Tentative ${attempt} échouée:`, error.message);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
          continue;
        }
        throw new Error(`KoboldAI: ${error.message}. Le service est peut-être surchargé.`);
      }
    }
  }

  async testGroqKeys() {
    const testMessage = [{ role: 'user', content: 'Dis bonjour en une phrase.' }];
    const testCharacter = {
      name: 'Test',
      appearance: 'Test',
      personality: 'Test',
      temperament: 'direct',
      age: 25,
      scenario: 'Test',
    };
    await this.generateWithGroq(testMessage, testCharacter, null, 1);
    return true;
  }
}

export default new TextGenerationService();

