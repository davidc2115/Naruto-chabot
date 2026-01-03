import axios from 'axios';

class ImageGenerationService {
  constructor() {
    this.baseURL = 'https://image.pollinations.ai/prompt/';
  }

  async generateCharacterImage(character, userProfile = null) {
    // FILTRAGE: Ne pas générer d'images pour les personnages trop jeunes
    if (character.age < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    // Mode NSFW détecté
    const nsfwMode = userProfile?.nsfwMode && userProfile?.isAdult;

    // Base du prompt
    let prompt = `${character.gender === 'male' ? 'handsome man' : 'beautiful woman'}, ${character.hairColor} hair, ${character.appearance}, adult, mature, 18+`;

    // ANATOMIE ULTRA-PRÉCISE pour les femmes
    if (character.gender === 'female' && character.bust) {
      const bustDescriptions = {
        'A': 'petite chest, small A cup breasts, slim delicate figure, modest bust',
        'B': 'small B cup breasts, slender figure, modest bust, petite chest',
        'C': 'medium C cup breasts, balanced proportions, natural figure, moderate bust',
        'D': 'large D cup breasts, curvy figure, voluptuous bust, prominent chest, noticeable cleavage',
        'DD': 'very large DD cup breasts, very curvy figure, generous bust, eye-catching chest, prominent cleavage',
        'E': 'very large E cup breasts, voluptuous figure, impressive bust, full chest, deep cleavage',
        'F': 'extremely large F cup breasts, very voluptuous figure, massive bust, striking chest, dramatic cleavage',
        'G': 'extremely large G cup breasts, exceptionally voluptuous figure, enormous bust, remarkable chest, extraordinary cleavage'
      };
      prompt += `, ${bustDescriptions[character.bust] || 'medium C cup breasts, balanced figure'}`;
    }

    // ANATOMIE pour les hommes
    if (character.gender === 'male' && character.penis) {
      prompt += `, athletic muscular build, confident masculine posture, broad shoulders, toned physique`;
    }

    // MODE NSFW si activé
    if (nsfwMode) {
      prompt += this.getNSFWPromptAddition(character);
    } else {
      // MODE SFW par défaut
      prompt += ', clothed, decent attire, appropriate outfit, respectful pose, casual clothing';
    }

    prompt += ', high quality, detailed, realistic, photorealistic, 4k';

    return await this.generateImage(prompt);
  }

  getNSFWPromptAddition(character) {
    let nsfwPrompt = '';
    
    if (character.gender === 'female') {
      nsfwPrompt = ', sexy, sensual, seductive pose, alluring, attractive, provocative expression, sultry gaze';
      nsfwPrompt += ', revealing lingerie, intimate wear, lace underwear, silk bra and panties, transparent fabric';
      nsfwPrompt += ', suggestive posture, seductive body language, intimate atmosphere, bedroom setting';
      nsfwPrompt += ', partially undressed, showing skin, exposed shoulders, décolleté visible, cleavage emphasized';
      
      // Emphase sur la poitrine selon la taille
      if (character.bust) {
        if (['D', 'DD', 'E', 'F', 'G'].includes(character.bust)) {
          nsfwPrompt += ', prominent bust emphasized, cleavage highlighted, chest focused, breasts visible through fabric';
        } else {
          nsfwPrompt += ', elegant bust, chest delicately shown';
        }
      }
      
      nsfwPrompt += ', sensual pose, legs visible, feminine curves, seductive atmosphere';
    } else if (character.gender === 'male') {
      nsfwPrompt += ', sexy, masculine, seductive, shirtless, bare torso, muscular chest visible, abs defined';
      nsfwPrompt += ', intimate pose, confident, attractive, sensual expression, intense gaze';
      nsfwPrompt += ', wearing only underwear or briefs, revealing clothing, suggestive posture';
      nsfwPrompt += ', muscular body, toned physique, masculine appeal, seductive atmosphere';
    }
    
    nsfwPrompt += ', intimate bedroom setting, soft warm lighting, sensual ambiance, romantic atmosphere, erotic mood';
    
    return nsfwPrompt;
  }

  async generateSceneImage(character, userProfile = null, recentMessages = []) {
    // FILTRAGE
    if (character.age < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    // Mode NSFW détecté
    const nsfwMode = userProfile?.nsfwMode && userProfile?.isAdult;

    // Base du prompt
    let prompt = `${character.gender === 'male' ? 'handsome man' : 'beautiful woman'}, ${character.hairColor} hair, ${character.appearance}`;

    // ANATOMIE ULTRA-PRÉCISE
    if (character.gender === 'female' && character.bust) {
      const bustDescriptions = {
        'A': 'petite A cup breasts, slim delicate figure',
        'B': 'small B cup breasts, slender figure',
        'C': 'medium C cup breasts, balanced figure',
        'D': 'large D cup breasts, curvy voluptuous figure, prominent chest',
        'DD': 'very large DD cup breasts, very curvy figure, generous bust',
        'E': 'very large E cup breasts, voluptuous figure, impressive bust',
        'F': 'extremely large F cup breasts, very voluptuous figure, massive bust',
        'G': 'extremely large G cup breasts, exceptionally voluptuous figure, enormous bust'
      };
      prompt += `, ${bustDescriptions[character.bust] || 'medium C cup breasts'}`;
    }

    if (character.gender === 'male' && character.penis) {
      prompt += `, athletic muscular build, broad shoulders, confident masculine posture`;
    }

    // DÉTECTION DE TENUE dans les messages récents
    const outfit = this.detectOutfit(recentMessages);
    if (outfit) {
      prompt += `, wearing ${outfit}`;
    }

    // CONTEXTE de la conversation
    const context = recentMessages.slice(-2).map(m => m.content).join(' ').substring(0, 200);
    if (context && !outfit) {
      prompt += `, ${context}`;
    }

    // MODE NSFW si activé
    if (nsfwMode) {
      // Si tenue suggestive détectée OU pas de tenue spécifique → mode NSFW complet
      if (!outfit || this.isOutfitSuggestive(outfit)) {
        prompt += this.getNSFWPromptAddition(character);
      } else {
        // Tenue normale mentionnée → mode NSFW atténué
        prompt += ', attractive pose, alluring expression, sensual atmosphere';
      }
    } else {
      prompt += ', clothed, decent, appropriate, respectful pose';
    }

    prompt += ', high quality, detailed, realistic, photorealistic, 4k, adult, mature, 18+';

    return await this.generateImage(prompt);
  }

  detectOutfit(messages) {
    // Mots-clés pour détecter les tenues
    const outfitKeywords = [
      // Vêtements normaux
      'robe', 'dress', 'jupe', 'skirt', 'pantalon', 'pants', 'jean', 'jeans',
      'chemise', 'shirt', 'blouse', 't-shirt', 'tshirt', 'pull', 'sweater',
      'veste', 'jacket', 'manteau', 'coat',
      // Vêtements intimes/suggestifs
      'lingerie', 'sous-vêtements', 'underwear', 'soutien-gorge', 'bra', 
      'culotte', 'panties', 'boxer', 'caleçon', 'string', 'thong',
      'bikini', 'maillot', 'swimsuit', 'nuisette', 'nightgown', 'pyjama', 'pajamas',
      'débardeur', 'tank top', 'short', 'shorts',
      // Termes généraux
      'costume', 'uniforme', 'uniform', 'tenue', 'outfit', 'porter', 'wearing',
      'vêtu', 'habillé', 'dressed', 'déshabillé', 'undressed', 'torse nu', 'shirtless'
    ];

    const recentText = messages.slice(-3).map(m => m.content).join(' ').toLowerCase();

    for (const keyword of outfitKeywords) {
      // Chercher le mot-clé et capturer le contexte autour
      const regex = new RegExp(`([\\w\\s]{0,20}${keyword}[\\w\\s]{0,20})`, 'i');
      const match = recentText.match(regex);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  isOutfitSuggestive(outfit) {
    const suggestiveKeywords = [
      'lingerie', 'sous-vêtements', 'underwear', 'soutien-gorge', 'bra',
      'culotte', 'panties', 'string', 'thong', 'bikini', 'nuisette', 'nightgown',
      'débardeur', 'tank top', 'boxer', 'caleçon', 'déshabillé', 'undressed',
      'torse nu', 'shirtless', 'topless'
    ];
    const outfitLower = outfit.toLowerCase();
    return suggestiveKeywords.some(keyword => outfitLower.includes(keyword));
  }

  async generateImage(prompt) {
    try {
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `${this.baseURL}${encodedPrompt}?width=512&height=512&model=flux&nologo=true&enhance=true&seed=${Date.now()}`;
      
      // Vérifier que l'URL est accessible
      const response = await axios.head(imageUrl, { timeout: 5000 });
      
      if (response.status === 200) {
        return imageUrl;
      } else {
        throw new Error('Image service unavailable');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error('Impossible de générer l\'image. Veuillez réessayer.');
    }
  }
}

export default new ImageGenerationService();
