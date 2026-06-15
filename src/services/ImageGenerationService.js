import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ImageGenerationService v6.0 - Stable Horde (100% gratuit, anonyme, NSFW)
 * + generateSceneImage pour ConversationScreen
 */
class ImageGenerationService {
  constructor() {
    this.apiUrl = 'https://stablehorde.net/api/v2';
    this.anonKey = '0000000000';
    this.model = 'Deliberate';
    this.lastRequestTime = 0;
    this.minDelay = 1000;
  }

  async waitMinDelay() {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.minDelay) await new Promise(r => setTimeout(r, this.minDelay - elapsed));
    this.lastRequestTime = Date.now();
  }

  /**
   * Construit un prompt de base à partir du personnage
   */
  buildPrompt(character, style = 'portrait', customPrompt = null) {
    if (customPrompt && customPrompt.trim()) {
      return customPrompt.trim() + ', highly detailed, 8k, masterpiece, best quality';
    }
    const gender = character.gender === 'male' ? 'handsome man' : 'beautiful woman';
    const traits = (character.personality || '').split(',').slice(0, 2).join(', ').toLowerCase();
    const appearance = (character.appearance || character.physicalDescription || '').substring(0, 150);
    const styleMap = {
      portrait: 'portrait, close-up, soft lighting, elegant, detailed face, expressive eyes',
      sensuel: 'sensual pose, alluring expression, soft warm lighting, intimate atmosphere, artistic',
      lingerie: 'lingerie, boudoir photography style, silk sheets, soft candlelight, tasteful artistic',
      beach: 'bikini, tropical beach, golden hour sunlight, vacation, carefree',
      fantasy: 'fantasy outfit, magical glow, ethereal atmosphere, enchanted forest, mystical',
      casual: 'casual modern outfit, natural relaxed pose, warm indoor lighting, friendly smile',
      action: 'dynamic action pose, determined expression, dramatic lighting, cinematic',
    };
    const base = appearance
      ? `${appearance}, ${styleMap[style] || styleMap.portrait}`
      : `${gender}, ${traits}, ${styleMap[style] || styleMap.portrait}`;
    return `${base}, highly detailed, 8k, masterpiece, best quality`;
  }

  /**
   * Construit un prompt contextuel basé sur la conversation et le niveau de relation
   */
  buildScenePrompt(character, userProfile, messages, relationLevel) {
    const gender = character.gender === 'male' ? 'handsome man' : 'beautiful woman';
    const appearance = (character.appearance || character.physicalDescription || '').substring(0, 200);

    // Détecter le contexte depuis les derniers messages
    const recentContent = messages
      .slice(-4)
      .filter(m => m.role === 'assistant' || m.role === 'user')
      .map(m => m.content || '')
      .join(' ')
      .toLowerCase();

    // Détecter des éléments de scène dans la conversation
    let sceneContext = 'portrait, expressive, detailed face';
    if (recentContent.includes('plage') || recentContent.includes('mer') || recentContent.includes('eau')) {
      sceneContext = 'beach, ocean, golden hour, natural light';
    } else if (recentContent.includes('nuit') || recentContent.includes('soir') || recentContent.includes('lune')) {
      sceneContext = 'night scene, moonlight, atmospheric lighting';
    } else if (recentContent.includes('combat') || recentContent.includes('force') || recentContent.includes('bataille')) {
      sceneContext = 'dynamic action pose, dramatic lighting, cinematic, determined expression';
    } else if (recentContent.includes('chambre') || recentContent.includes('lit') || recentContent.includes('maison')) {
      sceneContext = 'indoor scene, soft warm lighting, intimate atmosphere';
    }

    // Adapter le style selon le niveau de relation
    let styleElements = '';
    if (relationLevel >= 9) {
      styleElements = 'lingerie, boudoir photography, silk sheets, artistic, tasteful';
    } else if (relationLevel >= 7) {
      styleElements = 'sensual pose, alluring expression, soft lighting, intimate atmosphere';
    } else if (relationLevel >= 5) {
      styleElements = 'flirtatious smile, casual elegant outfit, warm lighting';
    } else if (relationLevel >= 3) {
      styleElements = 'friendly smile, casual outfit, natural pose';
    } else {
      styleElements = 'portrait, neutral expression, detailed face';
    }

    const base = appearance
      ? `${appearance}, ${sceneContext}, ${styleElements}`
      : `${gender}, ${sceneContext}, ${styleElements}`;

    return `${base}, highly detailed, 8k, masterpiece, best quality, photorealistic`;
  }

  async submitJob(prompt, apiKey) {
    const res = await fetch(`${this.apiUrl}/generate/async`, {
      method: 'POST',
      headers: {
        apikey: apiKey || this.anonKey,
        'Content-Type': 'application/json',
        'Client-Agent': 'roleplay-chat:6.0.0:anon',
      },
      body: JSON.stringify({
        prompt,
        params: {
          width: 512,
          height: 768,
          steps: 25,
          n: 1,
          sampler_name: 'k_euler_a',
          cfg_scale: 7.5,
        },
        nsfw: true,
        censor_nsfw: false,
        models: [this.model],
        r2: true,
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e?.message || `Horde ${res.status}`);
    }
    return (await res.json()).id;
  }

  async checkJob(jobId) {
    const res = await fetch(`${this.apiUrl}/generate/check/${jobId}`, {
      headers: { 'Client-Agent': 'roleplay-chat:6.0.0:anon' },
    });
    const data = await res.json();
    return data.done === true;
  }

  async getResult(jobId) {
    const res = await fetch(`${this.apiUrl}/generate/status/${jobId}`, {
      headers: { 'Client-Agent': 'roleplay-chat:6.0.0:anon' },
    });
    const gen = (await res.json()).generations?.[0];
    if (!gen?.img) throw new Error('Aucune image générée');
    return gen.img;
  }

  /**
   * Génère une image de base (utilisé depuis la galerie ou les récompenses)
   */
  async generateImage(character, style = 'portrait', customPrompt = null, onProgress = null, signal = null) {
    await this.waitMinDelay();
    const prompt = this.buildPrompt(character, style, customPrompt);
    const apiKey = await AsyncStorage.getItem('stable_horde_key').catch(() => null);
    onProgress?.('Envoi de la requête…');
    const jobId = await this.submitJob(prompt, apiKey);
    onProgress?.('En file d\'attente…');
    for (let i = 0; i < 90; i++) {
      if (signal?.aborted) throw new Error('Annulé');
      await new Promise(r => setTimeout(r, 2000));
      if (await this.checkJob(jobId)) break;
      const s = (i + 1) * 2;
      onProgress?.(
        s < 30 ? `Génération… ${s}s` : s < 60 ? `Presque prêt… ${s}s` : `Encore un peu… ${s}s`
      );
    }
    onProgress?.('Finalisation…');
    return await this.getResult(jobId);
  }

  /**
   * Génère une image contextuelle basée sur la conversation et le niveau de relation.
   * Utilisé par ConversationScreen et les récompenses de level-up.
   */
  async generateSceneImage(character, userProfile, messages = [], relationLevel = 1, onProgress = null) {
    await this.waitMinDelay();
    const prompt = this.buildScenePrompt(character, userProfile, messages, relationLevel);
    const apiKey = await AsyncStorage.getItem('stable_horde_key').catch(() => null);
    onProgress?.('Création de la scène…');
    const jobId = await this.submitJob(prompt, apiKey);
    onProgress?.('Génération en cours…');
    for (let i = 0; i < 90; i++) {
      await new Promise(r => setTimeout(r, 2000));
      if (await this.checkJob(jobId)) break;
      const s = (i + 1) * 2;
      onProgress?.(
        s < 20 ? `Dessin en cours… ${s}s`
          : s < 50 ? `Rendu des détails… ${s}s`
          : `Finalisation… ${s}s`
      );
    }
    onProgress?.('Image prête !');
    return await this.getResult(jobId);
  }
}

export default new ImageGenerationService();
