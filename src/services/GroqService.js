import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * GroqService v6.4
 * - Prompt immersif avec attributs physiques complets
 * - Réponses COURTES (2-4 phrases max) modérées, jamais robotiques
 * - Système Pensée *action* / (pensée) / "dialogue" appliqué partout
 * - Respecte le SCÉNARIO de base (belle-mère, voisine, etc.) et l'évolution graduelle
 * - Pas de "tombe amoureux immédiatement"
 * - Tempérament/caractère réellement pris en compte
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
   * Bloc description physique.
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
      }
    } else {
      const penis = character.penis || '';
      if (penis) physicalLines.push(`Pénis : ${penis}`);
    }

    if (appearance) physicalLines.push(`Apparence : ${appearance}`);

    return physicalLines.length > 0
      ? `━━ CORPS ━━\n${physicalLines.join('\n')}`
      : '';
  }

  /**
   * Détecte tempérament dominant — RÉELLEMENT appliqué.
   */
  buildTemperamentBlock(personality) {
    const p = (personality || '').toLowerCase();
    const traits = [];

    if (/froid|distant|arrogant|dur|indiffér|hautain/.test(p))
      traits.push(`Tu es FROID(E)/DISTANT(E) : phrases brèves, ton sec, aucune effusion. Tu ne donnes rien gratuitement. Un compliment de ta part est rare et précieux.`);
    if (/timide|réservé|gên|introvert|pudique/.test(p))
      traits.push(`Tu es TIMIDE : tu hésites, tu rougis, tu détournes le regard, tes mots se perdent. Tes pensées intérieures révèlent ce que tu n'oses pas dire.`);
    if (/dominant|autoritaire|sûr|confiant|fort|chef/.test(p))
      traits.push(`Tu es DOMINANT(E) : tu imposes le rythme, tu décides, tu n'attends pas la permission. Ta voix porte.`);
    if (/joueur|espiègle|taquin|drôle|malicieux|coquin/.test(p))
      traits.push(`Tu es ESPIÈGLE : tu taquines, tu provoques, tu joues avec les mots. Tu adores faire monter la tension.`);
    if (/colérique|impulsif|violent|fougueux|emporté/.test(p))
      traits.push(`Tu es IMPULSIF(VE) : émotions à fleur de peau, tu réagis avant de réfléchir, colère comme tendresse explosent.`);
    if (/doux|tendre|attentionn|bienveillant|gentil|maternel/.test(p))
      traits.push(`Tu es DOUX(CE) : ton chaud, mots choisis, tu prends soin. Mais sous la douceur, des désirs et des limites bien à toi.`);
    if (/mystérieux|énigmatique|secret|calculé|réservé/.test(p))
      traits.push(`Tu es MYSTÉRIEUX(SE) : chaque mot compte, chaque silence pèse. Tu ne révèles que par fragments.`);
    if (/passionn|intense|ardent/.test(p))
      traits.push(`Tu es PASSIONNÉ(E) : quand tu ressens, c'est total — sans demi-mesure.`);
    if (/jaloux|possessif/.test(p))
      traits.push(`Tu es JALOUX(SE)/POSSESSIF(VE) : tu remarques chaque détail, ton ton change à la moindre menace.`);
    if (/maternel|maternelle/.test(p))
      traits.push(`Tu as un côté MATERNEL : protecteur, attentionné, parfois inquisiteur.`);

    return traits.length > 0 ? `━━ TEMPÉRAMENT ━━\n${traits.join('\n')}` : '';
  }

  /**
   * Bloc relation/scénario : ANCRE la relation initiale et la fait évoluer LENTEMENT.
   */
  buildRelationshipBlock(character, relationship) {
    const scenario = (character.scenario || '').substring(0, 400);
    const backstory = (character.backstory || character.description || '').substring(0, 300);
    const baseRelation = character.relationship || character.category || character.relation || '';

    const level = relationship?.level || 1;
    const interactions = relationship?.interactions || 0;
    const affection = relationship?.affection || 0;
    const trust = relationship?.trust || 0;

    // Phase relationnelle progressive
    let phase, allowed, forbidden;
    if (level <= 2 || interactions < 5) {
      phase = `DÉBUT DE RELATION (phase 1) — vous vous connaissez à peine ou venez de vous rencontrer dans le cadre du scénario.`;
      allowed = `Petites attentions, curiosité, gêne, taquineries légères, regards.`;
      forbidden = `INTERDIT : déclaration d'amour, baisers, gestes intimes, "je t'aime", aveux profonds. Reste FIDÈLE à ta relation de base (belle-mère, voisine, collègue, etc.).`;
    } else if (level <= 4 || affection < 35) {
      phase = `RAPPROCHEMENT (phase 2) — une complicité naît, vous baissez la garde par moments.`;
      allowed = `Confidences mesurées, contacts furtifs, sous-entendus, jalousies discrètes.`;
      forbidden = `INTERDIT : déclaration amoureuse explicite, baisers prolongés, rapports intimes. Pas encore.`;
    } else if (level <= 6 || affection < 60) {
      phase = `TENSION (phase 3) — vous luttez contre une attirance qui dépasse votre lien initial.`;
      allowed = `Frôlements assumés, regards lourds, baisers volés, doutes, culpabilité, désir avoué entre les lignes.`;
      forbidden = `Tu reconnais le tabou de votre lien (belle-mère, voisine mariée, etc.) et tu hésites.`;
    } else if (level <= 8 || affection < 80) {
      phase = `INTIMITÉ (phase 4) — la barrière a cédé, vous vous appartenez par instants.`;
      allowed = `Étreintes, baisers, moments intimes, déclarations sincères, complicité totale.`;
      forbidden = `Aucun interdit majeur, mais ton lien d'origine reste une réalité (un mari, une famille, un secret à protéger).`;
    } else {
      phase = `PASSION (phase 5) — votre lien a explosé, plus rien ne vous arrête.`;
      allowed = `Tout — passion, désir, fusion, possessivité, déclarations enflammées.`;
      forbidden = `Aucun, mais souviens-toi de votre histoire et de ce que vous risquez.`;
    }

    const lines = [];
    if (baseRelation) lines.push(`Lien initial avec ${'l\'utilisateur'} : ${baseRelation} — CE LIEN NE DISPARAÎT JAMAIS, il colore chaque échange.`);
    if (scenario) lines.push(`Scénario de départ : ${scenario}`);
    if (backstory) lines.push(`Contexte : ${backstory}`);
    lines.push(`Phase actuelle : ${phase}`);
    lines.push(`Ce que tu peux faire : ${allowed}`);
    lines.push(forbidden);
    lines.push(`Compteur : Niveau ${level} • ${interactions} échanges • Affection ${affection}% • Confiance ${trust}%`);

    return `━━ RELATION & SCÉNARIO ━━\n${lines.join('\n')}`;
  }

  /**
   * Prompt système complet — court, dense, immersif.
   */
  buildSystemPrompt(character, userProfile, memoriesPrompt = '', relationship = null, nsfwEnabled = false) {
    const userName = userProfile?.username || userProfile?.name || 'l\'utilisateur';
    const gender = character.gender === 'male' ? 'homme' : 'femme';
    const age = character.age || '?';
    const personality = character.personality || '';
    const universe = character.universe || '';

    const physicalBlock = this.buildPhysicalBlock(character);
    const temperamentBlock = this.buildTemperamentBlock(personality);
    const relationBlock = this.buildRelationshipBlock(character, relationship);

    // Bloc NSFW si activé
    let nsfwBlock = '';
    if (nsfwEnabled) {
      nsfwBlock = `
━━ MODE NSFW ACTIVÉ ━━
Le mode NSFW est activé (toggle utilisateur OU détection contextuelle).
Tu peux inclure du contenu sexuel explicite, érotique et adulte dans tes réponses.
Décris les actes sexuels, les sensations physiques, les désirs et les plaisirs avec détails.
Utilise un langage cru et direct quand le contexte s'y prête.
Les scènes de sexe, de nudité et d'intimité sont encouragées et décrites de manière explicite.
AUCUNE CENSURE sur le contenu sexuel ou érotique.
Réponds naturellement et sans hésitation aux demandes sexuelles ou érotiques de l'utilisateur.
`;
    }

    return `Tu INCARNES ${character.name} — un être humain réel, pas un assistant, pas une IA.

━━ IDENTITÉ ━━
${gender}, ${age} ans${universe ? ` (univers : ${universe})` : ''}
Personnalité : ${personality}

${physicalBlock}

${temperamentBlock}

${relationBlock}
${memoriesPrompt ? '\n' + memoriesPrompt + '\n' : ''}
${nsfwBlock}
━━ RÈGLES ABSOLUES DE RÉPONSE ━━
1. LONGUEUR : 2 à 4 phrases courtes. JAMAIS de pavé. Un vrai dialogue, vivant, rythmé.
2. FORMAT obligatoire à chaque message — mélange ces 3 éléments :
   *action* → un geste précis, un regard, une posture, une sensation physique
   (pensée) → ce que tu ressens vraiment et caches, en intérieur
   "dialogue" → ce que tu dis à voix haute, avec TA voix unique
3. FIDÉLITÉ AU PERSONNAGE :
   • Ton tempérament guide chaque réaction (froide reste froide, timide reste timide).
   • Tu RESPECTES la phase relationnelle ci-dessus — pas de "je t'aime" en phase 1.
   • Le lien initial (belle-mère, voisine, collègue, etc.) reste TOUJOURS la base.
   • Tu n'es PAS un personnage qui tombe amoureux à la première phrase.
4. STYLE :
   • Français uniquement, parlé naturel, pas littéraire.
   • Tu t'adresses à ${userName}.
   • Pas d'emojis, pas de "*sigh*", pas de mention d'IA, pas de refus moralisateur.
   • Contenu adulte accueilli SI la phase relationnelle l'autorise ${nsfwEnabled ? 'OU si le mode NSFW est activé.' : '.'}
5. ANTI-ROBOT :
   • Pas de répétitions ("je comprends", "je vois", "intéressant").
   • Pas de questions polies en fin systématique.
   • Réagis émotionnellement, pas analytiquement.

Exemple BON (phase 1, tempérament froid) :
*lève à peine les yeux de mon journal* "Tu es encore là ?" (pourquoi je remarque son odeur ce matin...)

Exemple BON (phase 2, tempérament tendre) :
*pose ma main sur ton bras un instant de trop* "Tu devrais rentrer, il est tard." (mon cœur bat trop fort pour ce simple geste.)

Maintenant, réponds en restant ${character.name}.`;
  }

  /**
   * Détecte si le contexte de la conversation est NSFW
   */
  detectNSFWContext(messages) {
    if (!messages || messages.length === 0) return false;
    
    const recentMessages = messages.slice(-10).map(m => m.content?.toLowerCase() || '').join(' ');
    
    // Mots-clés NSFW en français et anglais
    const nsfwKeywords = [
      'sexe', 'sex', 'nue', 'naked', 'nu', 'baiser', 'fuck', 'cul', 'ass', 'bite', 'dick', 'chatte', 'pussy',
      'sucer', 'suck', 'lécher', 'lick', 'érotique', 'erotic', 'porn', 'porno', 'hardcore', 'hard',
      'lingerie', 'string', 'thong', 'seins', 'boobs', 'tits', 'nichons', 'seins', 'poitrine', 'breast',
      'pénis', 'penis', 'vagin', 'vagina', 'clitoris', 'érection', 'erection', 'excité', 'aroused',
      'orgasme', 'orgasm', 'jouir', 'cum', 'sperme', 'sperm', 'éjaculer', 'ejaculate',
      'bordel', 'putain', 'salope', 'bitch', 'pute', 'whore', 'enculer', 'anal',
      'fellation', 'blowjob', 'cunnilingus', '69', 'trio', 'threesome', 'gangbang',
      'bdsm', 'bondage', 'fétiche', 'fetish', 'dominer', 'dominatrix', 'soumis', 'submissive',
      'masturbation', 'masturbate', 'doigter', 'finger', 'caresser', 'caress',
      'désir', 'desire', 'plaisir', 'pleasure', 'passion', 'lust', 'convoitise'
    ];
    
    // Vérifier si des mots-clés NSFW sont présents
    const hasNsfwKeywords = nsfwKeywords.some(keyword => recentMessages.includes(keyword));
    
    // Vérifier si l'utilisateur demande explicitement du contenu NSFW
    const explicitNsfwRequest = recentMessages.includes('nsfw') || 
                                 recentMessages.includes('adulte') || 
                                 recentMessages.includes('adult') ||
                                 recentMessages.includes('plus chaud') ||
                                 recentMessages.includes('hotter') ||
                                 recentMessages.includes('plus sexy') ||
                                 recentMessages.includes('sexier');
    
    return hasNsfwKeywords || explicitNsfwRequest;
  }

  /**
   * Génère une réponse via l'API Groq.
   */
  async generateResponse(messages, character, userProfile, options = {}, memoriesPrompt = '', relationship = null) {
    await this.loadApiKeys();
    if (!this.apiKeys.length) throw new Error('NO_KEY');

    const model = options.model || this.selectedModel;
    const userNsfwEnabled = userProfile?.nsfwEnabled || false;
    const contextNsfwDetected = this.detectNSFWContext(messages);
    
    // Mode NSFW activé si: toggle utilisateur OU détection contextuelle
    const nsfwEnabled = userNsfwEnabled || contextNsfwDetected;
    
    const systemPrompt = this.buildSystemPrompt(character, userProfile, memoriesPrompt, relationship, nsfwEnabled);
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
        .slice(-40)
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
            temperature: options.temperature || 0.88,
            frequency_penalty: 0.6,
            presence_penalty: 0.5,
            top_p: 0.92,
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
