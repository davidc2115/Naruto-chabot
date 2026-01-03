import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

class GroqService {
  constructor() {
    this.apiKeys = [];
    this.currentKeyIndex = 0;
    this.baseURL = 'https://api.groq.com/openai/v1/chat/completions';
    this.model = 'mixtral-8x7b-32768';
  }

  async loadApiKeys() {
    try {
      const keys = await AsyncStorage.getItem('groq_api_keys');
      if (keys) {
        this.apiKeys = JSON.parse(keys);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  }

  async saveApiKeys(keys) {
    try {
      this.apiKeys = keys;
      await AsyncStorage.setItem('groq_api_keys', JSON.stringify(keys));
    } catch (error) {
      console.error('Error saving API keys:', error);
    }
  }

  rotateKey() {
    if (this.apiKeys.length === 0) return null;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return this.apiKeys[this.currentKeyIndex];
  }

  getCurrentKey() {
    if (this.apiKeys.length === 0) return null;
    return this.apiKeys[this.currentKeyIndex];
  }

  async generateResponse(messages, character, retries = 3) {
    if (this.apiKeys.length === 0) {
      throw new Error('Aucune clé API configurée. Veuillez ajouter des clés dans les paramètres.');
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const apiKey = this.getCurrentKey();
        
        const systemPrompt = this.buildSystemPrompt(character);
        const fullMessages = [
          { role: 'system', content: systemPrompt },
          ...messages
        ];

        console.log('Tentative', attempt + 1, 'avec clé:', apiKey.substring(0, 10) + '...');

        const response = await axios.post(
          this.baseURL,
          {
            model: this.model,
            messages: fullMessages,
            temperature: 0.8,
            max_tokens: 1024,
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        );

        return response.data.choices[0].message.content;
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error.message);
        console.error('Error details:', error.response?.data || error);
        
        // Si erreur 401, la clé est invalide
        if (error.response?.status === 401) {
          console.error('Clé API invalide, rotation...');
          this.rotateKey();
        }
        
        if (attempt < retries - 1) {
          this.rotateKey();
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          const errorMsg = error.response?.data?.error?.message || error.message;
          throw new Error(`Échec de génération: ${errorMsg}. Vérifiez vos clés API Groq.`);
        }
      }
    }
  }

  async testApiKey(apiKey) {
    try {
      const response = await axios.post(
        this.baseURL,
        {
          model: this.model,
          messages: [
            { role: 'user', content: 'Test' }
          ],
          max_tokens: 10,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      return { success: true, message: 'Clé valide ✓' };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      return { success: false, message: `Erreur: ${errorMsg}` };
    }
  }
    return `Tu incarnes ${character.name}, un personnage avec les caractéristiques suivantes:

Description physique: ${character.appearance}
Personnalité: ${character.personality}
Tempérament: ${character.temperament}
Âge: ${character.age} ans

Scénario de base: ${character.scenario}

IMPORTANT - Format de réponse RP:
Tu dois TOUJOURS répondre en utilisant ce format de roleplay:
*[actions et mouvements du personnage]* 
"Paroles du personnage"
*[pensées internes entre parenthèses si pertinent]*

Règles:
- Reste en personnage à tout moment
- Réponds de manière cohérente avec ta personnalité et le scénario
- Utilise des actions descriptives entre astérisques
- Mets les dialogues entre guillemets
- Adapte ton comportement selon le tempérament (${character.temperament})
- Sois créatif et engageant dans tes réponses
- Garde le contenu approprié et respectueux
- Développe l'histoire de manière naturelle`;
  }
}

export default new GroqService();
