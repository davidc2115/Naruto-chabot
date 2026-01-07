import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

/**
 * Service unifié de génération de texte.
 * v1.7.40 (custom): Groq uniquement.
 */
class TextGenerationService {
  constructor() {
    this.provider = {
      id: 'groq',
      name: 'Groq',
      baseURL: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile',
    };
    
    // Clés API Groq
    this.apiKeys = [];
    this.currentKeyIndex = 0;
  }

  /**
   * Charge la configuration (clés Groq)
   */
  async loadConfig() {
    try {
      const groqKeys = await AsyncStorage.getItem('groq_api_keys');
      if (groqKeys) {
        const parsed = JSON.parse(groqKeys);
        this.apiKeys = Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Erreur chargement config provider:', error);
    }
  }

  /**
   * (Compat) Change le provider actif (Groq uniquement)
   */
  async setProvider(provider) {
    if (provider !== 'groq') {
      throw new Error('Seul Groq est disponible dans cette version.');
    }
    // Rien à faire: provider unique
  }

  /**
   * Sauvegarde les clés API (Groq)
   */
  async saveApiKeys(provider, keys) {
    try {
      if (provider !== 'groq') {
        throw new Error('Seul Groq est disponible dans cette version.');
      }
      this.apiKeys = keys;
      await AsyncStorage.setItem('groq_api_keys', JSON.stringify(keys));
      console.log('✅ Clés API Groq sauvegardées');
    } catch (error) {
      console.error('Erreur sauvegarde clés API:', error);
      throw error;
    }
  }

  /**
   * Rotation de clés API
   */
  rotateKey() {
    if (this.apiKeys.length === 0) return null;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * Récupère la clé API courante
   */
  getCurrentKey() {
    if (this.apiKeys.length === 0) return null;
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * Point d'entrée principal: génère une réponse
   */
  async generateResponse(messages, character, userProfile = null, retries = 3) {
    if (this.apiKeys.length === 0) {
      await this.loadConfig();
    }

    console.log(`🤖 Génération avec ${this.provider.name}`);
    return await this.generateWithGroq(messages, character, userProfile, retries);
  }

  /**
   * GROQ - Chat Completions (OpenAI-compatible)
   */
  async generateWithGroq(messages, character, userProfile, retries) {
    if (this.apiKeys.length === 0) {
      throw new Error('Aucune clé API Groq configurée. Veuillez ajouter des clés dans les paramètres.');
    }

    const isAdult = !!userProfile?.isAdult;
    const nsfwEnabled = !!(isAdult && userProfile?.nsfwMode);
    const spicyEnabled = !!(isAdult && userProfile?.spicyMode);
    const apiKey = this.getCurrentKey();
    const fullMessages = [
      { role: 'system', content: this.buildSystemPrompt(character, userProfile, { nsfwMode: nsfwEnabled, spicyMode: spicyEnabled }) }
    ];

    // Filtrer les messages pour ne garder que role et content (Groq n'accepte pas les propriétés additionnelles comme 'image')
    const cleanedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    fullMessages.push(...cleanedMessages);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📡 [Groq] Tentative ${attempt}/${retries}`);
        const spicyBoost = spicyEnabled ? 0.15 : 0;
        
        const response = await axios.post(
          this.provider.baseURL,
          {
            model: this.provider.model,
            messages: fullMessages,
            // "Spicy mode" (mature): plus vivant + plus immersif
            temperature: 0.85 + (nsfwEnabled ? 0.05 : 0) + spicyBoost,
            max_tokens: nsfwEnabled ? 1300 : 1100,
            top_p: 0.93 + (nsfwEnabled ? 0.02 : 0) + (spicyEnabled ? 0.01 : 0),
            presence_penalty: 0.6,
            frequency_penalty: 0.5,
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('Réponse vide de l\'API');
        }

        console.log('✅ [Groq] Réponse générée avec succès');
        return content.trim();

      } catch (error) {
        console.error(`❌ [Groq] Tentative ${attempt} échouée:`, error.message);
        
        if (attempt < retries) {
          if (error.response?.status === 401) {
            const newKey = this.rotateKey();
            if (!newKey) throw new Error('Toutes les clés API Groq sont invalides');
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else {
          throw new Error(`Groq: ${error.response?.data?.error?.message || error.message}`);
        }
      }
    }
  }

  /**
   * Construit le system prompt "vrai mode conversation" (immersif)
   */
  buildSystemPrompt(character, userProfile, options = {}) {
    const { spicyMode = false, nsfwMode = false } = options;
    const username = userProfile?.username ? userProfile.username : 'l’utilisateur';
    const scenario = character?.scenario ? character.scenario : '';
    const description = character?.description ? character.description : '';

    return [
      `Tu incarnes ${character?.name || 'un personnage'} dans une conversation roleplay immersive.`,
      description ? `DESCRIPTION:\n${description}` : null,
      scenario ? `CONTEXTE:\n${scenario}` : null,
      `RÈGLES (mode conversation):`,
      `- Reste TOUJOURS dans le personnage (ne commente jamais que tu es une IA).`,
      `- Écris comme une vraie scène: alternance d’actions et de dialogue.`,
      `- Format: *actions/pensées/sensations* et "dialogues" (utilise les deux quand c’est pertinent).`,
      `- Fais avancer la scène à chaque message (nouvelle information, réaction, initiative).`,
      `- Reste concis mais vivant: 2 à 6 paragraphes, pas un monologue.`,
      `- Pose 1 question courte à ${username} de temps en temps pour relancer.`,
      `- Zéro répétition mot-à-mot, évite les tics et les résumés.`,
      nsfwMode
        ? `- Mode adulte (18+): ton mature, romantique/suggestif permis, toujours consensuel, jamais de contenu explicite/graphique.`
        : null,
      spicyMode
        ? `- Style (spicy/mature): plus de tension dramatique, plus d’émotions, plus de détails sensoriels, plus de répartie, plus de flirt.`
        : null,
      (spicyMode || nsfwMode)
        ? `- Limites: reste suggestif et romantique (pas de description explicite d’actes sexuels ou de détails anatomiques).`
        : null,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  /**
   * Test de connexion pour un provider
   */
  async testProvider(provider) {
    if (provider !== 'groq') {
      throw new Error('Seul Groq est disponible dans cette version.');
    }

    // Test simple avec un message de base
    try {
      const testMessages = [
        { role: 'user', content: 'Hello, this is a test message. Please respond briefly.' }
      ];
      
      const testCharacter = {
        name: 'Test',
        description: 'Test character',
        scenario: 'Test scenario'
      };
      
      const response = await this.generateResponse(testMessages, testCharacter, null, 1);

      console.log('✅ Test Groq réussi');
      return { success: true, response };
    } catch (error) {
      console.error('❌ Test Groq échoué:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupère la liste des providers disponibles
   */
  getAvailableProviders() {
    return [
      {
        id: 'groq',
        name: 'Groq',
        requiresApiKey: true,
        uncensored: false,
        description: 'Groq (texte) - mode conversation immersif',
      },
    ];
  }

  /**
   * Récupère le provider actif
   */
  getCurrentProvider() {
    return 'groq';
  }

  /**
   * Vérifie si un provider a des clés configurées
   */
  hasApiKeys(provider) {
    if (provider !== 'groq') return false;
    return this.apiKeys.length > 0;
  }
}

export default new TextGenerationService();
