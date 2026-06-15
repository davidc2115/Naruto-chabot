import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ImageGenerationService v6.2
 * - Fix boucle polling (timeout explicite)
 * - Modèles Stable Horde mis à jour
 * - Fallback automatique vers Pollinations.ai en cas d'échec
 */
class ImageGenerationService {
  constructor() {
    this.apiUrl = 'https://stablehorde.net/api/v2';
    this.anonKey = '0000000000';
    // Noms exacts actuels sur Stable Horde (vérifiés via /api/v2/status/models)
    this.preferredModels = [
      'Stable Diffusion XL 1.0',
      'AlbedoBase XL (SDXL)',
      'DreamShaper XL Alpha 2',
      'stable_diffusion',
    ];
    this.lastRequestTime = 0;
    this.minDelay = 1200;
  }

  async waitMinDelay() {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.minDelay) await new Promise(r => setTimeout(r, this.minDelay - elapsed));
    this.lastRequestTime = Date.now();
  }

  formatImageResult(img) {
    if (!img) return null;
    if (img.startsWith('http')) return img;
    return `data:image/webp;base64,${img}`;
  }

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
    };
    const base = appearance
      ? `${appearance}, ${styleMap[style] || styleMap.portrait}`
      : `${gender}, ${styleMap[style] || styleMap.portrait}`;
    return {
      prompt: `${base}, highly detailed, 8k, masterpiece, best quality, sharp focus`,
      negativePrompt: 'blurry, ugly, deformed, bad anatomy, extra limbs, watermark, text, low quality, pixelated',
    };
  }

  buildScenePrompt(character, userProfile, messages, relationLevel, imageType = null) {
    const gender = character.gender === 'male' ? 'handsome man' : 'beautiful woman';
    const appearance = (character.appearance || character.physicalDescription || '').substring(0, 200);

    if (imageType) {
      return this.buildPrompt(character, imageType);
    }

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
    if (relationLevel >= 7) styleElements = 'sensual pose, alluring expression, soft warm lighting';
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

  // ─────────────────────────────────────────────
  // STABLE HORDE
  // ─────────────────────────────────────────────

  async submitJob(promptObj, apiKey) {
    const res = await fetch(`${this.apiUrl}/generate/async`, {
      method: 'POST',
      headers: {
        apikey: apiKey || this.anonKey,
        'Content-Type': 'application/json',
        'Client-Agent': 'roleplay-chat:6.2.0:anon',
      },
      body: JSON.stringify({
        prompt: promptObj.prompt,
        params: {
          width: 512,
          height: 768,
          steps: 25,
          n: 1,
          sampler_name: 'k_euler_a',
          cfg_scale: 7,
          negative_prompt: promptObj.negativePrompt || '',
        },
        nsfw: false,
        censor_nsfw: true,
        models: this.preferredModels,
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
        headers: { 'Client-Agent': 'roleplay-chat:6.2.0:anon' },
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
      headers: { 'Client-Agent': 'roleplay-chat:6.2.0:anon' },
    });
    if (!res.ok) throw new Error(`Erreur récupération résultat: ${res.status}`);
    const data = await res.json();
    const gen = data.generations?.[0];
    if (!gen?.img) throw new Error('Aucune image dans la réponse Stable Horde');
    return this.formatImageResult(gen.img);
  }

  /**
   * Polling commun — utilisé par generateImage et generateSceneImage
   * Lance une erreur explicite si timeout atteint.
   */
  async pollUntilDone(jobId, onProgress, signal = null) {
    let done = false;
    for (let i = 0; i < 100; i++) {
      if (signal?.aborted) throw new Error('Annulé');
      await new Promise(r => setTimeout(r, 2500));
      done = await this.checkJob(jobId);
      if (done) break;
      const s = Math.round((i + 1) * 2.5);
      onProgress?.(
        s < 30 ? `Génération… ${s}s` : s < 70 ? `Presque prêt… ${s}s` : `Encore un peu… ${s}s`
      );
    }
    if (!done) throw new Error('Timeout Stable Horde : génération trop longue (>250s)');
  }

  // ─────────────────────────────────────────────
  // FALLBACK : POLLINATIONS.AI
  // ─────────────────────────────────────────────

  /**
   * Génère une image via Pollinations.ai (gratuit, sans clé, instantané)
   * Retourne une URL directe utilisable dans <Image source={{ uri }} />
   */
  async generateWithPollinations(promptObj, onProgress = null) {
    onProgress?.('Fallback Pollinations…');
    const encoded = encodeURIComponent(
      promptObj.prompt + ', highly detailed, masterpiece'
    );
    // Nouveau endpoint gen.pollinations.ai (remplace l'ancien image.pollinations.ai)
    const url = `https://gen.pollinations.ai/image/${encoded}?width=512&height=768&model=flux&seed=${Math.floor(Math.random() * 999999)}`;

    // Pollinations retourne l'image directement : on vérifie juste que la requête aboutit
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) throw new Error(`Pollinations erreur ${res.status}`);

    onProgress?.('Image prête (Pollinations) !');
    return url; // URL directement utilisable
  }

  // ─────────────────────────────────────────────
  // API PUBLIQUE
  // ─────────────────────────────────────────────

  /**
   * Génération image de base (portrait, galerie)
   * Tente Stable Horde → fallback Pollinations si échec
   */
  async generateImage(character, style = 'portrait', customPrompt = null, onProgress = null, signal = null) {
    await this.waitMinDelay();
    const promptObj = this.buildPrompt(character, style, customPrompt);
    const apiKey = await AsyncStorage.getItem('stable_horde_key').catch(() => null);

    try {
      onProgress?.('Envoi de la requête…');
      const jobId = await this.submitJob(promptObj, apiKey);
      onProgress?.('En file d\'attente…');
      await this.pollUntilDone(jobId, onProgress, signal);
      onProgress?.('Finalisation…');
      return await this.getResult(jobId);
    } catch (hordeError) {
      console.warn('[ImageGen] Stable Horde échoué, fallback Pollinations :', hordeError.message);
      onProgress?.(`Stable Horde indisponible, utilisation de Pollinations…`);
      return await this.generateWithPollinations(promptObj, onProgress);
    }
  }

  /**
   * Génération image contextuelle (conversation + niveau de relation)
   * Tente Stable Horde → fallback Pollinations si échec
   */
  async generateSceneImage(character, userProfile, messages = [], relationLevel = 1, onProgress = null, imageType = null, signal = null) {
    await this.waitMinDelay();
    const promptObj = this.buildScenePrompt(character, userProfile, messages, relationLevel, imageType);
    const apiKey = await AsyncStorage.getItem('stable_horde_key').catch(() => null);

    try {
      onProgress?.('Création de la scène…');
      const jobId = await this.submitJob(promptObj, apiKey);
      onProgress?.('Génération en cours…');
      await this.pollUntilDone(jobId, onProgress, signal);
      onProgress?.('Image prête !');
      return await this.getResult(jobId);
    } catch (hordeError) {
      console.warn('[ImageGen] Stable Horde échoué, fallback Pollinations :', hordeError.message);
      onProgress?.(`Stable Horde indisponible, utilisation de Pollinations…`);
      return await this.generateWithPollinations(promptObj, onProgress);
    }
  }
}

export default new ImageGenerationService();
