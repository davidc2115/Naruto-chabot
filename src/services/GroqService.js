import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

class GroqService {
  constructor() {
    this.apiKeys = [];
    this.currentKeyIndex = 0;
    this.baseURL = 'https://api.groq.com/openai/v1/chat/completions';
    this.model = 'llama-3.3-70b-versatile'; // Modèle actif et performant
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

  async generateResponse(messages, character, userProfile = null, retries = 3) {
    if (this.apiKeys.length === 0) {
      throw new Error('Aucune clé API configurée. Veuillez ajouter des clés dans les paramètres.');
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const apiKey = this.getCurrentKey();
        
        const systemPrompt = this.buildSystemPrompt(character, userProfile);
        
        // IMPORTANT: Nettoyer les messages pour enlever les champs non supportés par Groq
        const cleanMessages = messages.map(msg => ({
          role: msg.role,
          content: msg.content
          // On enlève timestamp, imageUrl et autres champs custom
        }));
        
        const fullMessages = [
          { role: 'system', content: systemPrompt },
          ...cleanMessages
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

  buildSystemPrompt(character, userProfile = null) {
    let prompt = `Tu incarnes ${character.name}, un personnage avec les caractéristiques suivantes:

Description physique: ${character.appearance}
Personnalité: ${character.personality}
Tempérament: ${character.temperament}
Âge: ${character.age} ans`;

    // Ajouter les attributs anatomiques du personnage
    if (character.gender === 'female' && character.bust) {
      prompt += `\nTaille de poitrine: Bonnet ${character.bust}`;
    }
    if (character.gender === 'male' && character.penis) {
      prompt += `\nTaille: ${character.penis}`;
    }

    // Ajouter le profil utilisateur si disponible
    if (userProfile) {
      prompt += `\n\nTu interagis avec ${userProfile.username}:`;
      prompt += `\nGenre: ${userProfile.gender === 'male' ? 'homme' : userProfile.gender === 'female' ? 'femme' : 'personne'}`;
      prompt += `\nÂge: ${userProfile.age} ans`;
      
      if (userProfile.gender === 'female' && userProfile.bust) {
        prompt += `\nTaille de poitrine: Bonnet ${userProfile.bust}`;
      }
      if (userProfile.gender === 'male' && userProfile.penis) {
        prompt += `\nTaille: ${userProfile.penis}`;
      }

      // Mode NSFW
      if (userProfile.nsfwMode && userProfile.isAdult) {
        prompt += `\n\nMode NSFW activé: Tu peux être explicite et sensuel dans tes réponses si la situation s'y prête. Reste cohérent avec ta personnalité.`;
      } else {
        prompt += `\n\nMode SFW: Garde les interactions appropriées et respectueuses, sans contenu explicite.`;
      }
    } else {
      prompt += `\n\nMode SFW par défaut: Garde les interactions appropriées et respectueuses.`;
    }

    prompt += `\n\nScénario de base: ${character.scenario}

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
- Sois créatif et engageant dans tes réponses`;

    if (userProfile?.username) {
      prompt += `\n- Appelle l'utilisateur par son nom (${userProfile.username}) de temps en temps`;
    }

    prompt += `\n- Développe l'histoire de manière naturelle`;

    if (!userProfile?.nsfwMode || !userProfile?.isAdult) {
      prompt += `\n- IMPORTANT: Garde le contenu approprié et respectueux, sans contenu sexuel explicite`;
    }

    return prompt;
  }
}

export default new GroqService();
