import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ImageGenerationService v6.1
 * Fix principal : r2:false → retourne base64 directement (fiable sur mobile React Native)
 * r2:true retourne une URL pré-signée qui expire — ne pas utiliser sur mobile.
 */
class ImageGenerationService {
  constructor() {
    this.apiUrl = 'https://stablehorde.net/api/v2';
    this.anonKey = '0000000000';
    // Modèles les plus disponibles sur Stable Horde (du plus disponible au moins)
    this.preferredModels = ['Deliberate', 'Dreamshaper', 'SDXL 1.0', 'stable_diffusion'];
    this.lastRequestTime = 0;
    this.minDelay = 1200;
  }

  async waitMinDelay() {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.minDelay) await new Promise(r => setTimeout(r, this.minDelay - elapsed));
    this.lastRequestTime = Date.now();
  }

  /**
   * Retourne l'image correctement formatée (base64 → data URI, URL → URL)
   */
  formatImageResult(img) {
    if (!img) return null;
    if (img.startsWith('http')) return img;
    return `data:image/webp;base64,${img}`;
  }

  /**
   * Prompt de base pour portrait simple
   */
  buildPrompt(character, style = 'portrait', customPrompt = null) {
    if (customPrompt && customPrompt.trim()) {
      return {
        prompt: customPrompt.trim() + ', highly detailed, 8k, masterpiece, best quality',
        negativePrompt: 'blurry, ugly, deformed, bad anatomy, watermark, low quality',
      };
    }
    const gender = character.gender === 'male' ? 'handsome man' : 'beautiful woman';
    const appearance = (character.appearance || character.physicalDescription || '').substring(0, 150);
    const styleMap = {
      portrait: 'portrait, close-up, soft lighting, elegant, detailed face, expressive eyes',
      sensuel: 'sensual pose, alluring expression, soft warm lighting, intimate atmosphere',
      lingerie: 'wearing elegant lingerie, boudoir photography, silk sheets, soft candlelight',
      beach: 'bikini, tropical beach, golden hour sunlight, carefree smile',
      fantasy: 'fantasy outfit, magical glow, ethereal atmosphere, enchanted forest',
      casual: 'casual modern outfit, natural relaxed pose, warm indoor lighting, friendly smile',
      action: 'dynamic action pose, determined expression, dramatic lighting, cinematic',
      provocative: 'very revealing outfit, provocative pose, intense gaze, dramatic lighting',
      underwear: 'underwear, boudoir, intimate setting, warm soft light',
      topless: 'topless, artistic nude, tasteful, soft studio lighting',
      artistic_nude: 'artistic nude, professional photography, tasteful pose, elegant',
      sensual_nude: 'nude, sensual, dreamy soft lighting, flowing fabric',
      very_sexy: 'very sexy, explicit lingerie, intense lighting, provocative',
      erotic: 'erotic pose, boudoir, intimate, explicit',
      ultra_hot: 'explicit, very sexy, uncensored, ultra realistic',
      special_gallery: 'exclusive artistic nude, gallery quality, dramatic lighting',
      custom: 'ultra detailed, customized explicit, photorealistic, 8k',
    };
    const base = appearance
      ? `${appearance}, ${styleMap[style] || styleMap.portrait}`
      : `${gender}, ${styleMap[style] || styleMap.portrait}`;
    return {
      prompt: `${base}, highly detailed, 8k, masterpiece, best quality, sharp focus`,
      negativePrompt: 'blurry, ugly, deformed, bad anatomy, extra limbs, watermark, text, low quality, pixelated',
    };
  }

  /**
   * Prompt contextuel basé sur la conversation et le niveau de relation
   */
  buildScenePrompt(character, userProfile, messages, relationLevel, imageType = null) {
    const gender = character.gender === 'male' ? 'handsome man' : 'beautiful woman';
    const appearance = (character.appearance || character.physicalDescription || '').substring(0, 200);

    // Si imageType spécifié (récompense de niveau), utiliser directement
    if (imageType) {
      return this.buildPrompt(character, imageType);
    }

    // Contexte depuis les derniers messages
    const recentContent = messages
      .slice(-4)
      .filter(m => m.role === 'assistant' || m.role === 'user')
      .map(m => m.content || '')
      .join(' ')
      .toLowerCase();

    let sceneContext = 'portrait, expressive, detailed face';
    if (recentContent.includes('plage') || recentContent.includes('mer')) {
      sceneContext = 'beach, ocean, golden hour, natural light';
    } else if (recentContent.includes('nuit') || recentContent.includes('soir') || recentContent.includes('lune')) {
      sceneContext = 'night scene, moonlight, atmospheric blue lighting';
    } else if (recentContent.includes('combat') || recentContent.includes('bataille')) {
      sceneContext = 'dynamic action pose, dramatic lighting, cinematic, determined expression';
    } else if (recentContent.includes('chambre') || recentContent.includes('lit')) {
      sceneContext = 'indoor bedroom scene, soft warm lighting, intimate atmosphere';
    }

    let styleElements = '';
    if (relationLevel >= 10) styleElements = 'explicit, ultra sexy, boudoir, uncensored';
    else if (relationLevel >= 9) styleElements = 'erotic pose, very revealing lingerie, intimate lighting';
    else if (relationLevel >= 8) styleElements = 'lingerie, boudoir photography, silk sheets';
    else if (relationLevel >= 7) styleElements = 'sensual pose, alluring expression, soft warm lighting';
    else if (relationLevel >= 5) styleElements = 'flirtatious smile, casual elegant outfit, warm lighting';
    else if (relationLevel >= 3) styleElements = 'friendly smile, casual outfit, natural pose';
    else styleElements = 'portrait, neutral expression, detailed face, expressive eyes';

    const base = appearance
      ? `${appearance}, ${sceneContext}, ${styleElements}`
      : `${gender}, ${sceneContext}, ${styleElements}`;

    return {
      prompt: `${base}, highly detailed, 8k, masterpiece, best quality, photorealistic, sharp focus`,
      negativePrompt: 'blurry, ugly, deformed, bad anatomy, extra limbs, watermark, text, low quality',
    };
  }

  async submitJob(promptObj, apiKey) {
    const res = await fetch(`${this.apiUrl}/generate/async`, {
      method: 'POST',
      headers: {
        apikey: apiKey || this.anonKey,
        'Content-Type': 'application/json',
        'Client-Agent': 'roleplay-chat:6.1.0:anon',
      },
      body: JSON.stringify({
        prompt: promptObj.prompt,
        params: {
          width: 512,
          height: 768,
          steps: 28,
          n: 1,
          sampler_name: 'k_euler_a',
          cfg_scale: 7,
          negative_prompt: promptObj.negativePrompt || '',
        },
        nsfw: true,
        censor_nsfw: false,
        models: this.preferredModels,
        // r2: false → retourne base64 directement dans img (stable sur mobile)
        r2: false,
        trusted_workers: false,
        slow_workers: true,
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      const msg = e?.message || `Stable Horde erreur ${res.status}`;
      if (res.status === 429) throw new Error('File Stable Horde saturée, réessayez dans 30s');
      throw new Error(msg);
    }
    const data = await res.json();
    if (!data.id) throw new Error('Pas d\'ID de job reçu de Stable Horde');
    return data.id;
  }

  async checkJob(jobId) {
    try {
      const res = await fetch(`${this.apiUrl}/generate/check/${jobId}`, {
        headers: { 'Client-Agent': 'roleplay-chat:6.1.0:anon' },
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.faulted) throw new Error('Génération échouée sur le worker Stable Horde');
      return data.done === true;
    } catch (e) {
      if (e.message.includes('échouée')) throw e;
      return false;
    }
  }

  async getResult(jobId) {
    const res = await fetch(`${this.apiUrl}/generate/status/${jobId}`, {
      headers: { 'Client-Agent': 'roleplay-chat:6.1.0:anon' },
    });
    if (!res.ok) throw new Error(`Erreur récupération résultat: ${res.status}`);
    const data = await res.json();
    const gen = data.generations?.[0];
    if (!gen?.img) throw new Error('Aucune image dans la réponse Stable Horde');
    return this.formatImageResult(gen.img);
  }

  /**
   * Génération image de base (portrait, galerie)
   */
  async generateImage(character, style = 'portrait', customPrompt = null, onProgress = null, signal = null) {
    await this.waitMinDelay();
    const promptObj = this.buildPrompt(character, style, customPrompt);
    const apiKey = await AsyncStorage.getItem('stable_horde_key').catch(() => null);
    onProgress?.('Envoi de la requête…');
    const jobId = await this.submitJob(promptObj, apiKey);
    onProgress?.('En file d\'attente…');
    for (let i = 0; i < 100; i++) {
      if (signal?.aborted) throw new Error('Annulé');
      await new Promise(r => setTimeout(r, 2500));
      if (await this.checkJob(jobId)) break;
      const s = Math.round((i + 1) * 2.5);
      if (i < 100 - 1) onProgress?.(
        s < 30 ? `Génération… ${s}s` : s < 70 ? `Presque prêt… ${s}s` : `Encore un peu… ${s}s`
      );
    }
    onProgress?.('Finalisation…');
    return await this.getResult(jobId);
  }

  /**
   * Génération image contextuelle (conversation + niveau de relation + récompenses niveau).
   * @param {object} character
   * @param {object} userProfile
   * @param {Array} messages - Derniers messages de la conversation
   * @param {number} relationLevel - Niveau de relation (1-10+)
   * @param {function|null} onProgress - Callback de progression
   * @param {string|null} imageType - Type d'image pour récompenses (ex: 'lingerie', 'topless')
   */
  async generateSceneImage(character, userProfile, messages = [], relationLevel = 1, onProgress = null, imageType = null) {
    await this.waitMinDelay();
    const promptObj = this.buildScenePrompt(character, userProfile, messages, relationLevel, imageType);
    const apiKey = await AsyncStorage.getItem('stable_horde_key').catch(() => null);
    onProgress?.('Création de la scène…');
    const jobId = await this.submitJob(promptObj, apiKey);
    onProgress?.('Génération en cours…');
    for (let i = 0; i < 100; i++) {
      await new Promise(r => setTimeout(r, 2500));
      if (await this.checkJob(jobId)) break;
      const s = Math.round((i + 1) * 2.5);
      if (i < 100 - 1) onProgress?.(
        s < 25 ? `Dessin en cours… ${s}s`
          : s < 60 ? `Rendu des détails… ${s}s`
          : `Finalisation… ${s}s`
      );
    }
    onProgress?.('Image prête !');
    return await this.getResult(jobId);
  }
}

export default new ImageGenerationService();
