import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

/**
 * ImageGenerationService v6.2
 * Fix complet : 
 *   1. Stable Horde r2:false → base64 → fichier local (compatible GalleryService)
 *   2. Essai Pollinations en premier (direct URL, gratuit, aucune clé)
 *   3. Fallback Stable Horde si Pollinations échoue
 */
class ImageGenerationService {
  constructor() {
    this.hordeUrl = 'https://stablehorde.net/api/v2';
    this.hordeClient = 'roleplay-chat:6.2.0:anon';
    this.preferredModels = ['Deliberate', 'Dreamshaper', 'SDXL 1.0'];
    this.lastRequestTime = 0;
    this.minDelay = 1500;
  }

  async waitMinDelay() {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.minDelay) await new Promise(r => setTimeout(r, this.minDelay - elapsed));
    this.lastRequestTime = Date.now();
  }

  // ─── Prompt builders ───────────────────────────────────────────────────────

  buildBasePromptText(character, style) {
    const gender = character.gender === 'male' ? 'handsome man' : 'beautiful woman';
    const appearance = (character.appearance || character.physicalDescription || '').substring(0, 200);
    const bodyType = character.bodyType || '';
    const bust = character.bust || character.bustSize || '';
    const penis = character.penis || '';

    const physicalExtra = character.gender === 'female' && bust
      ? `, ${bust} cup bust size`
      : character.gender === 'male' && penis
        ? ''
        : '';

    const styleMap = {
      portrait:        'portrait, close-up, soft lighting, elegant, detailed face, expressive eyes',
      sensuel:         'sensual pose, alluring expression, soft warm lighting, intimate atmosphere',
      lingerie:        'elegant lingerie, boudoir photography, silk sheets, soft candlelight, tasteful',
      provocative:     'very revealing outfit, provocative pose, intense gaze, dramatic lighting',
      underwear:       'underwear, boudoir, intimate setting, warm soft light',
      topless:         'topless, artistic, soft studio lighting, tasteful composition',
      artistic_nude:   'artistic nude, professional photography, tasteful pose, elegant, natural light',
      sensual_nude:    'nude, sensual, dreamy soft lighting, silk fabric, artistic',
      very_sexy:       'very sexy lingerie, explicit pose, intense lighting',
      erotic:          'erotic boudoir pose, intimate, revealing, dramatic lighting',
      ultra_hot:       'explicit nude, very sexy, uncensored, ultra realistic, 4k',
      special_gallery: 'exclusive artistic nude, gallery quality, dramatic cinematic lighting',
      custom:          'ultra detailed, explicit, photorealistic, 8k uhd',
      beach:           'bikini, tropical beach, golden hour sunlight, carefree smile',
      fantasy:         'fantasy outfit, magical glow, ethereal atmosphere, enchanted forest',
      casual:          'casual modern outfit, natural relaxed pose, warm indoor lighting',
      action:          'dynamic action pose, determined expression, dramatic lighting, cinematic',
    };

    const base = appearance
      ? `${appearance}${bodyType ? ', ' + bodyType + ' build' : ''}${physicalExtra}, ${styleMap[style] || styleMap.portrait}`
      : `${gender}${bodyType ? ', ' + bodyType : ''}${physicalExtra}, ${styleMap[style] || styleMap.portrait}`;

    return base + ', highly detailed, 8k, masterpiece, best quality, sharp focus, photorealistic';
  }

  buildScenePromptText(character, messages, relationLevel, imageType) {
    if (imageType) return this.buildBasePromptText(character, imageType);

    const recentContent = (messages || [])
      .slice(-4)
      .filter(m => m.role === 'assistant' || m.role === 'user')
      .map(m => m.content || '')
      .join(' ')
      .toLowerCase();

    let sceneContext = 'portrait, expressive, detailed face';
    if (recentContent.includes('plage') || recentContent.includes('mer')) {
      sceneContext = 'beach, ocean, golden hour, natural light';
    } else if (recentContent.includes('nuit') || recentContent.includes('soir')) {
      sceneContext = 'night scene, moonlight, atmospheric blue lighting';
    } else if (recentContent.includes('combat') || recentContent.includes('bataille')) {
      sceneContext = 'dynamic action pose, dramatic lighting, cinematic';
    } else if (recentContent.includes('chambre') || recentContent.includes('lit')) {
      sceneContext = 'indoor bedroom, soft warm lighting, intimate atmosphere';
    }

    let styleLevel = '';
    if (relationLevel >= 10) styleLevel = 'explicit nude, ultra sexy, uncensored, boudoir';
    else if (relationLevel >= 9) styleLevel = 'erotic pose, very revealing lingerie, intimate lighting';
    else if (relationLevel >= 8) styleLevel = 'lingerie, boudoir photography, silk sheets';
    else if (relationLevel >= 7) styleLevel = 'sensual pose, alluring expression, soft warm lighting';
    else if (relationLevel >= 5) styleLevel = 'flirtatious smile, elegant casual outfit, warm lighting';
    else if (relationLevel >= 3) styleLevel = 'friendly smile, casual outfit, natural pose';
    else styleLevel = 'portrait, neutral expression, detailed face';

    const appearance = (character.appearance || character.physicalDescription || '').substring(0, 200);
    const bodyType = character.bodyType || '';
    const bust = character.bust || character.bustSize || '';
    const physicalExtra = character.gender === 'female' && bust ? `, ${bust} cup bust` : '';

    const gender = character.gender === 'male' ? 'handsome man' : 'beautiful woman';
    const base = appearance
      ? `${appearance}${bodyType ? ', ' + bodyType : ''}${physicalExtra}, ${sceneContext}, ${styleLevel}`
      : `${gender}${bodyType ? ', ' + bodyType : ''}${physicalExtra}, ${sceneContext}, ${styleLevel}`;

    return base + ', highly detailed, 8k, masterpiece, best quality, photorealistic, sharp focus';
  }

  // ─── Pollinations (try first — no API key) ────────────────────────────────

  async generateViaPollinations(prompt, onProgress) {
    onProgress?.('Génération via Pollinations…');
    const seed = Math.floor(Math.random() * 99999);
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?model=flux-schnell&width=512&height=768&nologo=true&seed=${seed}`;

    const tmpUri = `${FileSystem.cacheDirectory}pollinations_${Date.now()}.jpg`;
    const result = await FileSystem.downloadAsync(url, tmpUri);

    if (result.status === 200) {
      onProgress?.('Image prête !');
      return tmpUri;
    }
    throw new Error(`Pollinations: HTTP ${result.status}`);
  }

  // ─── Stable Horde ─────────────────────────────────────────────────────────

  async submitHordeJob(prompt) {
    const apiKey = await AsyncStorage.getItem('stable_horde_key').catch(() => null) || '0000000000';
    const negative = 'blurry, ugly, deformed, bad anatomy, extra limbs, watermark, text, low quality, pixelated';
    const res = await fetch(`${this.hordeUrl}/generate/async`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
        'Client-Agent': this.hordeClient,
      },
      body: JSON.stringify({
        prompt,
        params: {
          width: 512, height: 768, steps: 28, n: 1,
          sampler_name: 'k_euler_a', cfg_scale: 7,
          negative_prompt: negative,
        },
        nsfw: true,
        censor_nsfw: false,
        models: this.preferredModels,
        r2: false,        // ← CRUCIAL : retourne base64, pas URL
        slow_workers: true,
        trusted_workers: false,
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e?.message || `Stable Horde erreur ${res.status}`);
    }
    const data = await res.json();
    if (!data.id) throw new Error('Pas d\'ID de job reçu');
    return data.id;
  }

  async pollHordeJob(jobId, onProgress) {
    for (let i = 0; i < 100; i++) {
      await new Promise(r => setTimeout(r, 2500));
      try {
        const res = await fetch(`${this.hordeUrl}/generate/check/${jobId}`, {
          headers: { 'Client-Agent': this.hordeClient },
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (data.faulted) throw new Error('Worker Stable Horde a échoué — réessayez');
        if (data.done) return true;
        const s = Math.round((i + 1) * 2.5);
        onProgress?.(s < 30 ? `Génération… ${s}s` : s < 70 ? `Presque prêt… ${s}s` : `Finalisation… ${s}s`);
      } catch (e) {
        if (e.message.includes('échoué')) throw e;
      }
    }
    throw new Error('Timeout Stable Horde (> 2 minutes)');
  }

  async getHordeResult(jobId) {
    const res = await fetch(`${this.hordeUrl}/generate/status/${jobId}`, {
      headers: { 'Client-Agent': this.hordeClient },
    });
    const data = await res.json();
    const img = data.generations?.[0]?.img;
    if (!img) throw new Error('Aucune image dans la réponse Stable Horde');

    // img = base64 pur (r2:false) — écrire dans un fichier local
    // pour compatibilité avec GalleryService (qui attend une URI fichier ou URL)
    const tmpUri = `${FileSystem.cacheDirectory}horde_${Date.now()}.webp`;
    await FileSystem.writeAsStringAsync(tmpUri, img, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return tmpUri;
  }

  async generateViaStableHorde(prompt, onProgress) {
    onProgress?.('Envoi à Stable Horde…');
    const jobId = await this.submitHordeJob(prompt);
    onProgress?.('En file d\'attente…');
    await this.pollHordeJob(jobId, onProgress);
    onProgress?.('Récupération…');
    return await this.getHordeResult(jobId);
  }

  // ─── API publique ──────────────────────────────────────────────────────────

  /**
   * Génère une image de base (portrait, style)
   */
  async generateImage(character, style = 'portrait', customPrompt = null, onProgress = null) {
    await this.waitMinDelay();
    const prompt = customPrompt?.trim()
      ? customPrompt + ', highly detailed, 8k, masterpiece'
      : this.buildBasePromptText(character, style);

    // Essai Pollinations d'abord (rapide, sans clé)
    try {
      return await this.generateViaPollinations(prompt, onProgress);
    } catch (e) {
      onProgress?.('Pollinations indisponible → Stable Horde…');
    }

    // Fallback Stable Horde
    return await this.generateViaStableHorde(prompt, onProgress);
  }

  /**
   * Génère une image contextuelle (conversation + niveau de relation + récompense de niveau).
   */
  async generateSceneImage(character, userProfile, messages = [], relationLevel = 1, onProgress = null, imageType = null) {
    await this.waitMinDelay();
    const prompt = this.buildScenePromptText(character, messages, relationLevel, imageType);

    // Essai Pollinations d'abord
    try {
      return await this.generateViaPollinations(prompt, onProgress);
    } catch (e) {
      onProgress?.('Pollinations indisponible → Stable Horde…');
    }

    // Fallback Stable Horde
    return await this.generateViaStableHorde(prompt, onProgress);
  }
}

export default new ImageGenerationService();
