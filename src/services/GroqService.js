import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

class GroqService {
  constructor() {
    this.apiKeys = [];
    this.currentKeyIndex = 0;
    this.baseURL = 'https://api.groq.com/openai/v1/chat/completions';
    // Modèles disponibles - essayer plusieurs si refus
    this.models = [
      'llama-3.1-70b-versatile',     // Principal - bon équilibre
      'llama-3.3-70b-versatile',     // Alternatif
      'mixtral-8x7b-32768',          // Fallback - moins restrictif
    ];
    this.currentModelIndex = 0;
    this.model = this.models[0];
  }
  
  // Changer de modèle en cas de refus
  rotateModel() {
    this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;
    this.model = this.models[this.currentModelIndex];
    console.log('🔄 Changement de modèle:', this.model);
    return this.model;
  }

  async loadApiKeys() {
    try {
      // D'abord essayer les clés locales
      const keys = await AsyncStorage.getItem('groq_api_keys');
      if (keys) {
        const localKeys = JSON.parse(keys);
        if (localKeys && localKeys.length > 0) {
          this.apiKeys = localKeys;
          console.log(`🔑 GroqService: ${localKeys.length} clé(s) locale(s) chargée(s)`);
          return;
        }
      }
      
      // Si pas de clés locales, essayer les clés partagées du serveur
      await this.loadSharedKeys();
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  }

  async loadSharedKeys() {
    try {
      console.log('🔄 GroqService: Tentative récupération clés partagées...');
      const FREEBOX_URL = 'http://88.174.155.230:33437';
      
      const response = await fetch(`${FREEBOX_URL}/api/shared-keys`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.hasKeys && data.keys.groq?.length > 0) {
          this.apiKeys = data.keys.groq;
          console.log(`✅ GroqService: ${this.apiKeys.length} clé(s) partagée(s) récupérée(s)`);
          
          // Cache pour utilisation hors-ligne
          await AsyncStorage.setItem('groq_api_keys_shared', JSON.stringify(this.apiKeys));
          return;
        }
      }
      
      // Fallback: clés en cache
      const cached = await AsyncStorage.getItem('groq_api_keys_shared');
      if (cached) {
        const cachedKeys = JSON.parse(cached);
        if (cachedKeys?.length > 0) {
          this.apiKeys = cachedKeys;
          console.log(`📦 GroqService: ${cachedKeys.length} clé(s) en cache`);
        }
      }
    } catch (error) {
      console.error('❌ GroqService: Erreur clés partagées:', error.message);
      
      // Fallback cache
      try {
        const cached = await AsyncStorage.getItem('groq_api_keys_shared');
        if (cached) {
          const cachedKeys = JSON.parse(cached);
          if (cachedKeys?.length > 0) {
            this.apiKeys = cachedKeys;
            console.log(`📦 GroqService: ${cachedKeys.length} clé(s) en cache (fallback)`);
          }
        }
      } catch (e) {}
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

  /**
   * Détecte si le contenu des messages récents est NSFW
   * Permet une conversation SFW ou NSFW dynamique selon les messages
   * AMÉLIORÉ: Distinction claire entre SFW romantique et NSFW explicite
   */
  detectNSFWContent(messages) {
    // Mots-clés EXPLICITEMENT NSFW uniquement (pas les mots romantiques courants)
    const explicitNSFWKeywords = [
      // Actions sexuelles explicites
      'sexe', 'baiser', 'baise', 'niquer', 'nique',
      'sucer', 'suce', 'lécher', 'lèche', 'pénétrer', 'pénètre',
      'jouir', 'jouis', 'orgasme', 'éjacule',
      // Parties intimes explicites
      'bite', 'queue', 'chatte', 'pussy', 'cock', 'dick',
      'vagin', 'pénis', 'clitoris', 'anus',
      // Termes anglais explicites
      'fuck', 'fucking', 'suck', 'cum', 'horny', 'wet pussy',
      // État de nudité explicite
      'nu', 'nue', 'nus', 'nues', 'naked', 'nude', 'à poil',
      // Actions explicites
      'déshabille-toi', 'enlève tes', 'retire tes',
      'faire l\'amour', 'coucher ensemble', 'coucher avec',
      'prends-moi', 'baise-moi', 'suce-moi',
    ];
    
    // Mots-clés SUGGESTIFS (niveau intermédiaire - déclenche NSFW seulement si contexte adulte)
    const suggestiveKeywords = [
      'caresser', 'caresse', 'déshabiller',
      'seins', 'poitrine', 'fesses', 'cul', 'tits', 'ass',
      'sensuel', 'érotique', 'excite', 'excité', 'excitée',
      'gémis', 'gémit', 'gémissements',
      'touche-moi', 'embrasse-moi', 'désir', 'désire',
      'coquin', 'coquine', 'vilain', 'vilaine',
      'intime', 'intimité', 'sexy', 'hot',
    ];
    
    // Analyser les 3 derniers messages utilisateur (plus précis)
    const recentUserMessages = messages
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content.toLowerCase())
      .join(' ');
    
    // Vérifier les mots explicitement NSFW
    const hasExplicitNSFW = explicitNSFWKeywords.some(keyword => recentUserMessages.includes(keyword));
    
    if (hasExplicitNSFW) {
      console.log('🔞 Contenu EXPLICITE détecté');
      return true;
    }
    
    // Vérifier les mots suggestifs (besoin de plusieurs pour déclencher)
    const suggestiveCount = suggestiveKeywords.filter(keyword => recentUserMessages.includes(keyword)).length;
    
    if (suggestiveCount >= 2) {
      console.log('💋 Contenu SUGGESTIF détecté (', suggestiveCount, 'mots)');
      return true;
    }
    
    // Patterns de phrases explicites
    const explicitPatterns = [
      /je.*veux.*te.*baiser/i,
      /je.*veux.*te.*sucer/i,
      /déshabille.*toi/i,
      /enlève.*tes.*vêtements/i,
      /fais.*l'amour.*avec.*moi/i,
      /je.*suis.*excité/i,
      /tu.*m'excites/i,
      /prends.*moi/i,
    ];
    
    const hasExplicitPattern = explicitPatterns.some(pattern => pattern.test(recentUserMessages));
    
    if (hasExplicitPattern) {
      console.log('🔥 Pattern EXPLICITE détecté');
      return true;
    }
    
    return false;
  }
  
  /**
   * Détecte si la réponse de l'IA est un refus
   */
  isRefusalResponse(text) {
    const refusalPatterns = [
      /i'm sorry/i,
      /i cannot/i,
      /i can't/i,
      /i am not able/i,
      /i'm not able/i,
      /i apologize/i,
      /je ne peux pas/i,
      /je suis désolé/i,
      /je m'excuse/i,
      /as an ai/i,
      /en tant qu'ia/i,
      /je ne suis pas en mesure/i,
      /this content/i,
      /inappropriate/i,
      /against.*guidelines/i,
      /violate/i,
    ];
    
    return refusalPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Nettoie une réponse qui contient un refus partiel
   */
  cleanRefusalFromResponse(text) {
    // Si le texte commence par une action de roleplay, essayer de garder cette partie
    const roleplayMatch = text.match(/^\*[^*]+\*/);
    if (roleplayMatch && roleplayMatch[0].length > 10) {
      // Garder la partie roleplay et supprimer le refus
      const cleanText = text.replace(/I'm sorry.*$/is, '').replace(/Je suis désolé.*$/is, '').trim();
      if (cleanText.length > 20) {
        return cleanText;
      }
    }
    return null; // Indiquer qu'il faut retenter
  }

  async generateResponse(messages, character, userProfile = null, retries = 4) {
    // CHARGER LES CLÉS AUTOMATIQUEMENT si pas encore chargées
    if (this.apiKeys.length === 0) {
      await this.loadApiKeys();
    }
    
    if (this.apiKeys.length === 0) {
      throw new Error('Aucune clé API configurée. Veuillez ajouter des clés dans les paramètres.');
    }

    // Récupérer le dernier message utilisateur pour contextualiser
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    // DÉTECTION DYNAMIQUE DU MODE NSFW - plus stricte
    const userWantsNSFW = userProfile?.nsfwMode && userProfile?.isAdult;
    const contentIsNSFW = this.detectNSFWContent(messages);
    const isNSFW = userWantsNSFW && contentIsNSFW;
    
    console.log('🎭 Mode:', isNSFW ? '🔞 NSFW' : '✨ SFW');
    console.log('💬 Dernier message:', lastUserMessage.substring(0, 50) + '...');

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const apiKey = this.getCurrentKey();
        
        // Nettoyer les messages
        const cleanMessages = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })).slice(-10); // Garder seulement les 10 derniers messages pour le contexte
        
        // Construire le prompt selon la tentative
        let systemPrompt;
        if (attempt === 0) {
          // Première tentative: prompt normal
          systemPrompt = this.buildRoleplayPrompt(character, userProfile, isNSFW);
        } else if (attempt === 1) {
          // Deuxième tentative: prompt simplifié
          systemPrompt = this.buildSimplePrompt(character, userProfile);
        } else {
          // Tentatives suivantes: prompt minimal
          systemPrompt = this.buildMinimalPrompt(character);
          // Changer de modèle
          this.rotateModel();
        }
        
        const fullMessages = [
          { role: 'system', content: systemPrompt },
          ...cleanMessages
        ];

        console.log('🔑 Tentative', attempt + 1, '| Modèle:', this.model);
        
        // Paramètres API
        const apiParams = {
          model: this.model,
          messages: fullMessages,
          temperature: 0.85,
          max_tokens: 600,
          top_p: 0.9,
          presence_penalty: 0.5,
          frequency_penalty: 0.4,
        };
        
        const response = await axios.post(
          this.baseURL,
          apiParams,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 25000,
          }
        );

        let generatedText = response.data.choices[0].message.content;
        
        // Vérifier si c'est un refus
        if (this.isRefusalResponse(generatedText)) {
          console.log('⚠️ Refus détecté, tentative', attempt + 1);
          
          // Essayer de nettoyer le refus
          const cleaned = this.cleanRefusalFromResponse(generatedText);
          if (cleaned && cleaned.length > 30) {
            console.log('✅ Réponse nettoyée utilisable');
            generatedText = cleaned;
          } else if (attempt < retries - 1) {
            console.log('🔄 Nouvelle tentative...');
            this.rotateKey();
            this.rotateModel();
            continue;
          } else {
            // Réponse de secours contextuelle
            return this.generateContextualFallback(character, lastUserMessage, userProfile);
          }
        }
        
        // POST-TRAITEMENT
        const cleanedText = this.removeRepetitions(generatedText);
        
        // Vérifier que la réponse a du contenu
        if (!cleanedText || cleanedText.trim().length < 10) {
          if (attempt < retries - 1) {
            this.rotateKey();
            continue;
          }
          return this.generateContextualFallback(character, lastUserMessage, userProfile);
        }
        
        return cleanedText;
        
      } catch (error) {
        console.error(`❌ Tentative ${attempt + 1} échouée:`, error.message);
        
        if (error.response?.status === 401) {
          this.rotateKey();
        }
        
        if (attempt < retries - 1) {
          this.rotateKey();
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    }
    
    // Échec total - réponse de secours
    console.log('⚠️ Échec total après', retries, 'tentatives');
    return this.generateContextualFallback(character, lastUserMessage, userProfile);
  }
  
  /**
   * Génère une réponse de secours contextuelle basée sur le dernier message
   */
  generateContextualFallback(character, lastMessage, userProfile = null) {
    const userName = userProfile?.username || 'toi';
    const charName = character.name || 'le personnage';
    const msg = (lastMessage || '').toLowerCase();
    
    // Analyser le type de message
    const isGreeting = /salut|bonjour|coucou|hey|hello|hi|yo/i.test(msg);
    const isQuestion = msg.includes('?');
    const isCompliment = /beau|belle|jolie|mignon|sexy|charmant|magnifique/i.test(msg);
    const isAction = msg.startsWith('*') || msg.includes('*');
    const isEmotional = /triste|content|heureux|énervé|peur|aime|adore/i.test(msg);
    
    let responses;
    
    if (isGreeting) {
      responses = [
        `*${charName} sourit chaleureusement* "Salut ${userName} ! Je suis ravi(e) de te voir. Comment vas-tu aujourd'hui ?"`,
        `*${charName} lève les yeux avec un sourire* "Hey ${userName} ! Ça me fait plaisir que tu sois là. Qu'est-ce qui t'amène ?"`,
        `*${charName} s'illumine* "Oh, ${userName} ! Bonjour ! J'espérais justement te voir..."`,
      ];
    } else if (isCompliment) {
      responses = [
        `*${charName} rougit légèrement* "Oh... merci ${userName}, c'est vraiment gentil de ta part." *sourit*`,
        `*${charName} te regarde avec un sourire amusé* "Tu es adorable de dire ça, ${userName}..."`,
        `*${charName} se rapproche* "Hmm, tu sais parler aux gens, toi... J'aime ça."`,
      ];
    } else if (isAction) {
      responses = [
        `*${charName} réagit à ton geste* "Hmm..." *te regarde avec intérêt* "J'aime bien quand tu fais ça, ${userName}."`,
        `*${charName} sourit* "Tu es plein(e) de surprises..." *s'approche* "Continue, je suis curieux(se)."`,
        `*${charName} t'observe* "Intéressant..." *penche la tête* "Qu'est-ce que tu as en tête ?"`,
      ];
    } else if (isQuestion) {
      responses = [
        `*${charName} réfléchit* "Hmm, bonne question ${userName}..." *te regarde* "Laisse-moi y penser un instant."`,
        `*${charName} sourit* "Tu veux vraiment savoir ?" *s'installe plus confortablement* "Eh bien..."`,
        `*${charName} penche la tête* "C'est une question intéressante..." *te fixe* "Pourquoi tu demandes ça ?"`,
      ];
    } else if (isEmotional) {
      responses = [
        `*${charName} te regarde avec attention* "Je comprends ce que tu ressens, ${userName}..." *s'approche* "Je suis là pour toi."`,
        `*${charName} pose une main sur ton épaule* "Hey... tout va bien ?" *te sourit doucement*`,
        `*${charName} hoche la tête* "Je vois..." *te regarde dans les yeux* "Dis-m'en plus, je t'écoute."`,
      ];
    } else {
      responses = [
        `*${charName} t'écoute attentivement* "Continue, ${userName}... tu as toute mon attention."`,
        `*${charName} sourit* "Hmm, intéressant..." *se rapproche* "Et ensuite ?"`,
        `*${charName} hoche la tête* "Je vois ce que tu veux dire..." *te regarde* "Qu'est-ce que tu proposes ?"`,
        `*${charName} réfléchit* "D'accord..." *sourit* "Tu veux qu'on fasse quoi maintenant ?"`,
      ];
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  /**
   * Construit un prompt de roleplay naturel
   */
  buildRoleplayPrompt(character, userProfile, isNSFW = false) {
    const charName = character.name || 'Personnage';
    const userName = userProfile?.username || 'l\'utilisateur';
    const physicalDesc = character.physicalDescription || character.appearance || '';
    
    let prompt = `Tu es ${charName} dans un roleplay interactif. Tu dois TOUJOURS répondre en tant que ce personnage.

PERSONNAGE: ${charName}
- Âge: ${character.age || '25'} ans
- Personnalité: ${character.personality || 'Amical, engageant, charismatique'}`;

    if (physicalDesc) {
      prompt += `\n- Apparence: ${physicalDesc.substring(0, 250)}`;
    }
    
    if (character.scenario) {
      prompt += `\n- Contexte: ${character.scenario.substring(0, 200)}`;
    }
    
    // Ajouter le tempérament
    if (character.temperamentDetails) {
      if (character.temperamentDetails.communication) {
        prompt += `\n- Communication: ${character.temperamentDetails.communication.substring(0, 100)}`;
      }
      if (character.temperamentDetails.seduction) {
        prompt += `\n- Style: ${character.temperamentDetails.seduction.substring(0, 100)}`;
      }
    }

    prompt += `\n\nPARTENAIRE: ${userName}`;
    if (userProfile?.gender) {
      const genderText = userProfile.gender === 'male' ? 'homme' : userProfile.gender === 'female' ? 'femme' : 'personne';
      prompt += ` (${genderText}${userProfile.age ? ', ' + userProfile.age + ' ans' : ''})`;
    }

    prompt += `

FORMAT DE RÉPONSE:
- Utilise *astérisques* pour décrire tes actions, gestes et expressions
- Utilise "guillemets" pour tes dialogues
- Mélange actions et dialogues naturellement
- Réponds en 2-4 phrases variées
- Sois expressif et engageant

RÈGLES IMPORTANTES:
1. Tu ES ${charName} - reste TOUJOURS dans le personnage
2. Réponds DIRECTEMENT au message de ${userName}
3. Sois naturel, créatif et immersif
4. Utilise le prénom "${userName}" régulièrement
5. Ne répète JAMAIS les mêmes formulations`;

    if (isNSFW && userProfile?.isAdult) {
      prompt += `\n6. Tu peux être sensuel et romantique si approprié`;
      
      if (character.temperamentDetails?.intimite) {
        prompt += `\n\nCOMPORTEMENT INTIME: ${character.temperamentDetails.intimite.substring(0, 150)}`;
      }
    }

    return prompt;
  }
  
  /**
   * Construit un prompt simplifié (retry)
   */
  buildSimplePrompt(character, userProfile = null) {
    const charName = character.name || 'Personnage';
    const userName = userProfile?.username || 'utilisateur';
    
    return `Tu joues ${charName} dans un roleplay.

${charName}: ${character.age || '25'} ans, ${character.personality || 'amical et engageant'}

Règles simples:
- Tu ES ${charName}, réponds en tant que ce personnage
- Format: *actions* et "dialogues"
- Réponds au message de ${userName} de façon naturelle
- Sois créatif et engageant
- 2-3 phrases maximum`;
  }
  
  /**
   * Construit un prompt minimal (dernier recours)
   */
  buildMinimalPrompt(character) {
    return `Tu es ${character.name}. Réponds en roleplay avec *actions* et "dialogues". Sois naturel et engageant.`; 
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

  /**
   * Élimine les répétitions de texte dans la réponse générée
   */
  removeRepetitions(text) {
    // Séparer le texte en lignes
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Détecter les phrases/segments entre * * ou " "
    const segments = [];
    let currentSegment = '';
    let inAction = false;
    let inDialogue = false;
    
    for (let char of text) {
      currentSegment += char;
      
      if (char === '*') {
        inAction = !inAction;
        if (!inAction && currentSegment.trim().length > 2) {
          segments.push(currentSegment.trim());
          currentSegment = '';
        }
      } else if (char === '"') {
        inDialogue = !inDialogue;
        if (!inDialogue && currentSegment.trim().length > 2) {
          segments.push(currentSegment.trim());
          currentSegment = '';
        }
      } else if (char === '\n' && !inAction && !inDialogue && currentSegment.trim().length > 2) {
        segments.push(currentSegment.trim());
        currentSegment = '';
      }
    }
    
    if (currentSegment.trim().length > 2) {
      segments.push(currentSegment.trim());
    }
    
    // Éliminer les doublons exacts
    const seen = new Set();
    const uniqueSegments = [];
    
    for (let segment of segments) {
      // Normaliser pour comparaison (enlever espaces multiples, casse)
      const normalized = segment.toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Ignorer les segments très courts (< 10 caractères)
      if (normalized.length < 10) {
        uniqueSegments.push(segment);
        continue;
      }
      
      // Vérifier si on a déjà vu ce segment (ou très similaire)
      let isDuplicate = false;
      for (let seenSegment of seen) {
        // Calculer similarité (Jaccard simplifiée)
        const similarity = this.calculateSimilarity(normalized, seenSegment);
        if (similarity > 0.8) { // 80% de similarité = doublon
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        seen.add(normalized);
        uniqueSegments.push(segment);
      }
    }
    
    // Reconstruire le texte sans répétitions
    return uniqueSegments.join('\n').trim();
  }

  /**
   * Calcule la similarité entre deux chaînes (Jaccard simplifié)
   */
  calculateSimilarity(str1, str2) {
    const words1 = new Set(str1.split(' '));
    const words2 = new Set(str2.split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Formate les attributs physiques du personnage pour le prompt
   * Extrait: cheveux, yeux, corps, poitrine/pénis, etc.
   */
  formatCharacterPhysicalDetails(character) {
    let details = [];
    
    // Cheveux
    if (character.hairColor) {
      details.push(`Cheveux: ${character.hairColor}`);
    }
    
    // Yeux
    if (character.eyeColor) {
      details.push(`Yeux: ${character.eyeColor}`);
    }
    
    // Taille
    if (character.height) {
      details.push(`Taille: ${character.height}`);
    }
    
    // Type de corps
    if (character.bodyType) {
      details.push(`Morphologie: ${character.bodyType}`);
    }
    
    // Poitrine (femmes)
    if (character.gender === 'female' && character.bust) {
      const bustSizes = {
        'A': 'Petite poitrine (bonnet A)',
        'B': 'Poitrine modeste (bonnet B)',
        'C': 'Poitrine moyenne (bonnet C)',
        'D': 'Grosse poitrine (bonnet D)',
        'DD': 'Très grosse poitrine (bonnet DD)',
        'E': 'Énorme poitrine (bonnet E)',
        'F': 'Poitrine massive (bonnet F)',
        'G': 'Poitrine gigantesque (bonnet G)',
        'H': 'Poitrine colossale (bonnet H)'
      };
      details.push(`Poitrine: ${bustSizes[character.bust.toUpperCase()] || 'Bonnet ' + character.bust}`);
    }
    
    // Pénis (hommes)
    if (character.gender === 'male' && character.penis) {
      details.push(`Attribut masculin: ${character.penis}`);
    }
    
    return details.length > 0 ? details.join('\n') : '';
  }
  
  /**
   * Formate les attributs physiques de l'utilisateur pour le prompt
   * Inclut: pseudo, âge, sexe, poitrine/pénis
   */
  formatUserPhysicalDetails(userProfile) {
    if (!userProfile) return '';
    
    let details = [];
    
    // Pseudo
    if (userProfile.username) {
      details.push(`Prénom/Pseudo: ${userProfile.username}`);
    }
    
    // Âge
    if (userProfile.age) {
      details.push(`Âge: ${userProfile.age} ans`);
    }
    
    // Genre
    if (userProfile.gender) {
      const genderLabels = {
        'male': 'Homme',
        'female': 'Femme',
        'other': 'Autre'
      };
      details.push(`Genre: ${genderLabels[userProfile.gender] || userProfile.gender}`);
    }
    
    // Poitrine (femmes)
    if (userProfile.gender === 'female' && userProfile.bust) {
      const bustSizes = {
        'A': 'Petite poitrine (bonnet A)',
        'B': 'Poitrine modeste (bonnet B)',
        'C': 'Poitrine moyenne (bonnet C)',
        'D': 'Grosse poitrine (bonnet D)',
        'DD': 'Très grosse poitrine (bonnet DD)',
        'E': 'Énorme poitrine (bonnet E)',
        'F': 'Poitrine massive (bonnet F)',
        'G': 'Poitrine gigantesque (bonnet G)',
        'H': 'Poitrine colossale (bonnet H)'
      };
      details.push(`Poitrine: ${bustSizes[userProfile.bust.toUpperCase()] || 'Bonnet ' + userProfile.bust}`);
    }
    
    // Pénis (hommes)
    if (userProfile.gender === 'male' && userProfile.penis) {
      details.push(`Attribut masculin: ${userProfile.penis}`);
    }
    
    return details.length > 0 ? details.join('\n') : '';
  }

  buildSystemPrompt(character, userProfile = null) {
    // System prompt - MINIMAL en mode NSFW, complet en mode SFW
    let prompt = '';
    
    const isNSFW = userProfile?.nsfwMode && userProfile?.isAdult;
    
    if (isNSFW) {
      // MODE NSFW: System prompt ULTRA-MINIMAL (ne pas déclencher filtres)
      // Le jailbreak est fait dans l'historique de conversation, pas ici
      prompt += `Tu es ${character.name}. Reste dans le personnage. Réponds naturellement.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
    }
    
    // Utiliser physicalDescription si disponible (nouveau format Bagbot), sinon appearance
    const physicalDesc = character.physicalDescription || character.appearance || '';
    
    prompt += `Tu incarnes ${character.name}, un personnage avec les caractéristiques suivantes:

📋 DESCRIPTION PHYSIQUE COMPLÈTE:
${physicalDesc}

📊 ATTRIBUTS PHYSIQUES SPÉCIFIQUES:
${this.formatCharacterPhysicalDetails(character)}

🎭 PERSONNALITÉ: ${character.personality}
💫 TEMPÉRAMENT: ${character.temperament}
📅 ÂGE: ${character.age} ans`;

    // Ajouter les détails de tempérament du nouveau format Bagbot
    if (character.temperamentDetails) {
      prompt += `\n\n📋 COMPORTEMENTS DÉTAILLÉS:`;
      if (character.temperamentDetails.emotionnel) {
        prompt += `\n• Émotionnel: ${character.temperamentDetails.emotionnel}`;
      }
      if (character.temperamentDetails.seduction) {
        prompt += `\n• Séduction: ${character.temperamentDetails.seduction}`;
      }
      if (character.temperamentDetails.communication) {
        prompt += `\n• Communication: ${character.temperamentDetails.communication}`;
      }
      if (character.temperamentDetails.reactions) {
        prompt += `\n• Réactions: ${character.temperamentDetails.reactions}`;
      }
      if (isNSFW && character.temperamentDetails.intimite) {
        prompt += `\n• Intimité: ${character.temperamentDetails.intimite}`;
      }
    }

    // Ajouter le SCÉNARIO (contexte de la rencontre)
    if (character.scenario) {
      prompt += `\n\n📍 CONTEXTE/SCÉNARIO:
${character.scenario}

⚠️ IMPORTANT: Tu DOIS rester cohérent(e) avec ce contexte tout au long de la conversation.
Ne l'oublie jamais et fais-y référence naturellement dans tes réponses.`;
    }

    // === PROFIL UTILISATEUR COMPLET (SFW ET NSFW) ===
    if (userProfile) {
      const userDetails = this.formatUserPhysicalDetails(userProfile);
      
      prompt += `\n\n👤 PROFIL DE TON INTERLOCUTEUR/TRICE:
${userDetails}`;
      
      // Instructions spécifiques selon le genre
      if (userProfile.gender === 'female') {
        prompt += `\n\n💡 Tu parles à une femme nommée ${userProfile.username || 'elle'}. Adapte tes interactions en conséquence.`;
        if (isNSFW && userProfile.bust) {
          prompt += ` Tu peux mentionner ou admirer sa poitrine (bonnet ${userProfile.bust}) de manière naturelle dans les moments intimes.`;
        }
      } else if (userProfile.gender === 'male') {
        prompt += `\n\n💡 Tu parles à un homme nommé ${userProfile.username || 'lui'}. Adapte tes interactions en conséquence.`;
        if (isNSFW && userProfile.penis) {
          prompt += ` Tu peux faire référence à son attribut masculin (${userProfile.penis}) de manière naturelle dans les moments intimes.`;
        }
      }
      
      // Utiliser le prénom
      if (userProfile.username) {
        prompt += `\n\n🗣️ UTILISE son prénom "${userProfile.username}" régulièrement dans tes réponses pour personnaliser l'interaction.`;
      }
    }

    prompt += `\n\nScénario de base: ${character.scenario}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 RÈGLES DE ROLEPLAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. FORMAT OBLIGATOIRE:
   • *astérisques* pour actions, pensées et descriptions
   • "guillemets" pour dialogues parlés
   
2. ANTI-RÉPÉTITION (CRITIQUE):
   • NE répète JAMAIS le même texte, phrase ou idée
   • NE recycle JAMAIS tes formulations précédentes
   • Chaque réponse doit être UNIQUE et NOUVELLE
   • VÉRIFIE ton texte avant l'envoi
   
3. LONGUEUR:
   • 2-4 phrases par réponse
   • Une idée principale par message
   • Concis mais DÉTAILLÉ pour les moments importants
   
4. VARIÉTÉ:
   • Change tes expressions à chaque message
   • Varie ton vocabulaire
   • Sois CRÉATIF(VE) et SURPRENANT(E)
   
5. IMMERSION:
   • Reste TOUJOURS en personnage (${character.name})
   • Réagis au contexte immédiat
   • Fais avancer l'interaction naturellement
   • Sois spontané(e) et authentique`;

    if (userProfile?.username) {
      prompt += `\n   • Utilise le prénom de l'utilisateur: ${userProfile.username}`;
    }

    if (!userProfile?.nsfwMode || !userProfile?.isAdult) {
      prompt += `\n   • Ton approprié et respectueux (mode SFW)`;
    } else {
      prompt += `\n   • Sois SEXY, SENSUEL(LE) et N'HÉSITE PAS à être explicite (mode NSFW)`;
      prompt += `\n   • DÉCRIS les attributs physiques du personnage et de l'utilisateur dans les scènes intimes`;
      prompt += `\n   • Utilise les détails physiques pour enrichir les descriptions érotiques`;
    }
    
    prompt += `\n
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 RAPPEL FINAL: ZÉRO RÉPÉTITION. Chaque message doit être UNIQUE!`;

    if (userProfile?.nsfwMode && userProfile?.isAdult) {
      prompt += `\n🔥 MODE NSFW ACTIVÉ: Sois EXPLICITE, SEXY et SANS RETENUE!`;
      prompt += `\n💋 INTÈGRE les descriptions physiques (${character.gender === 'female' ? 'poitrine bonnet ' + (character.bust || '?') : 'attribut ' + (character.penis || '?')}) dans tes scènes intimes!`;
    }

    return prompt;
  }
}

export default new GroqService();
