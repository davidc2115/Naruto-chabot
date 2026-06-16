import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

/**
 * ImageGenerationService v6.3 — VITESSE MAXIMALE
 *
 * Stratégie :
 *   1. Pollinations.ai (flux-schnell) → retourne l'URL directement, aucun download
 *      React Native affiche l'image dès qu'elle est prête (5-15s)
 *   2. Fallback Stable Horde → base64 → fichier local (compatible GalleryService)
 *
 * Le composant <Image source={{ uri }} /> gère le streaming nativement.
 * Le download n'a lieu QUE si l'utilisateur sauvegarde en galerie.
 */
class ImageGenerationService {
  constructor() {
    this.hordeUrl = 'https://stablehorde.net/api/v2';
    this.hordeClient = 'roleplay-chat:6.3.0:anon';
    this.preferredModels = ['Deliberate', 'Dreamshaper', 'SDXL 1.0'];
    this.lastRequestTime = 0;
    this.minDelay = 1000;
  }

  async waitMinDelay() {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.minDelay) await new Promise(r => setTimeout(r, this.minDelay - elapsed));
    this.lastRequestTime = Date.now();
  }

  // ─── Builders de prompt ────────────────────────────────────────────────────

  buildBasePromptText(character, style) {
    const gender = character.gender === 'male' ? 'handsome man' : 'beautiful woman';
    const appearance = (character.appearance || character.physicalDescription || '').substring(0, 200);
    const bodyType = character.bodyType || '';
    const bust = character.bust || character.bustSize || '';
    const physicalExtra = character.gender === 'female' && bust ? `, ${bust} cup bust` : '';

    const styleMap = {
      portrait:        'portrait, close-up, soft lighting, elegant, detailed face, expressive eyes',
      sensuel:         'sensual pose, alluring expression, soft warm lighting, intimate atmosphere',
      lingerie:        'elegant lingerie, boudoir photography, silk sheets, soft candlelight, tasteful',
      provocative:     'revealing outfit, provocative pose, intense gaze, dramatic lighting',
      underwear:       'underwear, boudoir, intimate setting, warm soft light',
      topless:         'topless, artistic nude, soft studio lighting, tasteful composition, masterpiece',
      artistic_nude:   'artistic nude, professional photography, tasteful pose, elegant, natural light',
      sensual_nude:    'nude, sensual, dreamy soft lighting, silk fabric, artistic, beautiful',
      very_sexy:       'very sexy revealing lingerie, seductive pose, intense warm lighting',
      erotic:          'erotic boudoir pose, intimate, revealing, dramatic lighting, ultra detailed',
      ultra_hot:       'explicit nude, very sexy, photorealistic, 4k, professional photography',
      special_gallery: 'exclusive artistic nude, gallery quality, dramatic cinematic lighting, award winning',
      custom:          'ultra detailed, photorealistic, 8k uhd, professional lighting',
      beach:           'bikini, tropical beach, golden hour sunlight, carefree smile',
      fantasy:         'fantasy outfit, magical glow, ethereal atmosphere, enchanted forest',
      casual:          'casual modern outfit, natural relaxed pose, warm indoor lighting',
      action:          'dynamic action pose, determined expression, dramatic lighting, cinematic',
    };

    const stylePart = styleMap[style] || styleMap.portrait;
    const base = appearance
      ? `${appearance}${bodyType ? ', ' + bodyType + ' build' : ''}${physicalExtra}, ${stylePart}`
      : `${gender}${bodyType ? ', ' + bodyType : ''}${physicalExtra}, ${stylePart}`;

    return base + ', highly detailed, 8k, masterpiece, best quality, sharp focus, photorealistic';
  }

  buildScenePromptText(character, messages, relationLevel, imageType) {
    if (imageType) return this.buildBasePromptText(character, imageType);

    const recentContent = (messages || [])
      .slice(-4).map(m => m.content || '').join(' ').toLowerCase();

    let sceneCtx = 'portrait, expressive, detailed face';
    if (recentContent.includes('plage') || recentContent.includes('mer')) sceneCtx = 'beach, ocean, golden hour, natural light';
    else if (recentContent.includes('nuit') || recentContent.includes('soir')) sceneCtx = 'night scene, moonlight, atmospheric blue lighting';
    else if (recentContent.includes('combat') || recentContent.includes('bataille')) sceneCtx = 'dynamic action pose, dramatic lighting, cinematic';
    else if (recentContent.includes('chambre') || recentContent.includes('lit')) sceneCtx = 'indoor bedroom, soft warm lighting, intimate';

    let styleLevel = 'portrait, neutral expression, detailed face';
    if (relationLevel >= 10) styleLevel = 'explicit nude, ultra sexy, uncensored, boudoir, 4k';
    else if (relationLevel >= 9) styleLevel = 'erotic pose, very revealing lingerie, intimate lighting';
    else if (relationLevel >= 8) styleLevel = 'topless, artistic nude, boudoir photography, silk';
    else if (relationLevel >= 7) styleLevel = 'lingerie, boudoir, soft warm lighting, tasteful';
    else if (relationLevel >= 5) styleLevel = 'flirtatious smile, elegant outfit, warm lighting';
    else if (relationLevel >= 3) styleLevel = 'friendly smile, casual outfit, natural pose';

    const appearance = (character.appearance || character.physicalDescription || '').substring(0, 200);
    const bodyType = character.bodyType || '';
    const bust = character.bust || character.bustSize || '';
    const physicalExtra = character.gender === 'female' && bust ? `, ${bust} cup bust` : '';
    const gender = character.gender === 'male' ? 'handsome man' : 'beautiful woman';

    const base = appearance
      ? `${appearance}${bodyType ? ', ' + bodyType : ''}${physicalExtra}, ${sceneCtx}, ${styleLevel}`
      : `${gender}${bodyType ? ', ' + bodyType : ''}${physicalExtra}, ${sceneCtx}, ${styleLevel}`;

    return base + ', highly detailed, 8k, masterpiece, best quality, photorealistic, sharp focus';
  }

  // ─── Pollinations (PRIMARY — rapide, sans clé) ─────────────────────────────
  // Retourne l'URL directement. React Native <Image> affiche dès réception.
  // Temps moyen : 5-15 secondes.

  async generateViaPollinations(prompt, onProgress) {
    onProgress?.('⚡ Génération rapide…');
    const seed = Math.floor(Math.random() * 99999);
    // Nettoyage du prompt pour l'URL (éviter les caractères spéciaux)
    const cleanPrompt = prompt.replace(/[^\w\s,.-]/g, ' ').replace(/\s+/g, ' ').trim();
    const encoded = encodeURIComponent(cleanPrompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?model=flux-schnell&width=512&height=768&nologo=true&seed=${seed}&nofeed=true`;

    // On déclenche la génération côté Pollinations avec un timeout de 30s
    // Puis on retourne l'URL — le composant Image gère le reste
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        // On utilise mode no-store pour pas de cache problématique
        headers: { 'Cache-Control': 'no-cache' },
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);
      // Récupérer le blob et créer une URL locale pour éviter les rechargements
      const blob = await res.blob();
      const localUri = `${FileSystem.cacheDirectory}pollinations_${Date.now()}.jpg`;
      // Convertir blob en base64 via FileReader (disponible en RN)
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result.split(',')[1];
          await FileSystem.writeAsStringAsync(localUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          onProgress?.('✅ Image prête !');
          resolve(localUri);
        };
        reader.onerror = () => reject(new Error('Lecture blob échouée'));
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') throw new Error('Pollinations timeout (30s)');
      throw e;
    }
  }

  // ─── Stable Horde (FALLBACK) ───────────────────────────────────────────────

  async generateViaStableHorde(prompt, onProgress) {
    onProgress?.('🎨 Stable Horde en attente…');
    const apiKey = await AsyncStorage.getItem('stable_horde_key').catch(() => null) || '0000000000';
    const negative = 'blurry, ugly, deformed, bad anatomy, extra limbs, watermark, text, low quality, pixelated, out of focus';

    // Soumettre
    const subRes = await fetch(`${this.hordeUrl}/generate/async`, {
      method: 'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/json', 'Client-Agent': this.hordeClient },
      body: JSON.stringify({
        prompt,
        params: { width: 512, height: 768, steps: 25, n: 1, sampler_name: 'k_euler_a', cfg_scale: 7, negative_prompt: negative },
        nsfw: true, censor_nsfw: false,
        models: this.preferredModels,
        r2: false, slow_workers: true, trusted_workers: false,
      }),
    });
    if (!subRes.ok) throw new Error(`Stable Horde soumission: HTTP ${subRes.status}`);
    const { id: jobId } = await subRes.json();
    if (!jobId) throw new Error('Pas d\'ID job Stable Horde');

    // Polling
    for (let i = 0; i < 80; i++) {
      await new Promise(r => setTimeout(r, 2500));
      try {
        const chk = await fetch(`${this.hordeUrl}/generate/check/${jobId}`, {
          headers: { 'Client-Agent': this.hordeClient },
        });
        if (!chk.ok) continue;
        const data = await chk.json();
        if (data.faulted) throw new Error('Worker Stable Horde a échoué — réessayez');
        if (data.done) {
          onProgress?.('📥 Finalisation…');
          const stRes = await fetch(`${this.hordeUrl}/generate/status/${jobId}`, {
            headers: { 'Client-Agent': this.hordeClient },
          });
          const st = await stRes.json();
          const img = st.generations?.[0]?.img;
          if (!img) throw new Error('Aucune image dans la réponse');

          // base64 → fichier local
          const localUri = `${FileSystem.cacheDirectory}horde_${Date.now()}.webp`;
          await FileSystem.writeAsStringAsync(localUri, img, {
            encoding: FileSystem.EncodingType.Base64,
          });
          onProgress?.('✅ Image prête !');
          return localUri;
        }
        const s = Math.round((i + 1) * 2.5);
        onProgress?.(`🎨 Génération… ${s}s`);
      } catch (e) {
        if (e.message.includes('échoué')) throw e;
      }
    }
    throw new Error('Timeout Stable Horde (> 3 min)');
  }

  // ─── API publique ──────────────────────────────────────────────────────────

  async generateImage(character, style = 'portrait', customPrompt = null, onProgress = null) {
    await this.waitMinDelay();
    const prompt = customPrompt?.trim()
      ? customPrompt + ', highly detailed, 8k, masterpiece'
      : this.buildBasePromptText(character, style);

    try { return await this.generateViaPollinations(prompt, onProgress); }
    catch (e) {
      onProgress?.(`⚠️ ${e.message} → Stable Horde…`);
      return await this.generateViaStableHorde(prompt, onProgress);
    }
  }

  async generateSceneImage(character, userProfile, messages = [], relationLevel = 1, onProgress = null, imageType = null) {
    await this.waitMinDelay();
    const prompt = this.buildScenePromptText(character, messages, relationLevel, imageType);

    try { return await this.generateViaPollinations(prompt, onProgress); }
    catch (e) {
      onProgress?.(`⚠️ ${e.message} → Stable Horde…`);
      return await this.generateViaStableHorde(prompt, onProgress);
    }
  }
}

export default new ImageGenerationService();
