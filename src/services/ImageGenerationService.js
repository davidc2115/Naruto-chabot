import AsyncStorage from '@react-native-async-storage/async-storage';

  /**
   * ImageGenerationService v5.5.7 - Stable Horde (100% gratuit, anonyme, NSFW)
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

    buildPrompt(character, style = 'portrait', customPrompt = null) {
      if (customPrompt && customPrompt.trim()) {
        return customPrompt.trim() + ', highly detailed, 8k, masterpiece, best quality';
      }
      const gender = character.gender === 'male' ? 'handsome man' : 'beautiful woman';
      const traits = (character.personality || '').split(',').slice(0, 2).join(', ').toLowerCase();
      const styleMap = {
        portrait: 'portrait, close-up, soft lighting, elegant, detailed face',
        sensuel: 'sensual, alluring pose, soft lighting, intimate atmosphere, tasteful',
        lingerie: 'lingerie, boudoir style, artistic, silk sheets, soft lighting',
        beach: 'bikini, beach, sunny tropical, golden hour, vacation',
        fantasy: 'fantasy outfit, magical glow, ethereal atmosphere, enchanted',
        casual: 'casual modern outfit, natural relaxed pose, warm lighting, friendly',
      };
      return `${gender}, ${traits}, ${styleMap[style] || styleMap.portrait}, highly detailed, 8k, masterpiece`;
    }

    async submitJob(prompt, apiKey) {
      const res = await fetch(`${this.apiUrl}/generate/async`, {
        method: 'POST',
        headers: { apikey: apiKey || this.anonKey, 'Content-Type': 'application/json', 'Client-Agent': 'naruto-roleplay:5.5.7:anon' },
        body: JSON.stringify({
          prompt,
          params: { width: 512, height: 768, steps: 20, n: 1, sampler_name: 'k_euler_a', cfg_scale: 7 },
          nsfw: true, censor_nsfw: false, models: [this.model], r2: true,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message || `Horde ${res.status}`); }
      return (await res.json()).id;
    }

    async checkJob(jobId) {
      const res = await fetch(`${this.apiUrl}/generate/check/${jobId}`, { headers: { 'Client-Agent': 'naruto-roleplay:5.5.7:anon' } });
      return (await res.json()).done === true;
    }

    async getResult(jobId) {
      const res = await fetch(`${this.apiUrl}/generate/status/${jobId}`, { headers: { 'Client-Agent': 'naruto-roleplay:5.5.7:anon' } });
      const gen = (await res.json()).generations?.[0];
      if (!gen?.img) throw new Error('Aucune image générée');
      return gen.img;
    }

    async generateImage(character, style = 'portrait', customPrompt = null, onProgress = null, signal = null) {
      await this.waitMinDelay();
      const prompt = this.buildPrompt(character, style, customPrompt);
      const apiKey = await AsyncStorage.getItem('stable_horde_key').catch(() => null);
      onProgress?.("Envoi de la requête…");
      const jobId = await this.submitJob(prompt, apiKey);
      onProgress?.("En file d'attente…");
      for (let i = 0; i < 90; i++) {
        if (signal?.aborted) throw new Error('Annulé');
        await new Promise(r => setTimeout(r, 2000));
        if (await this.checkJob(jobId)) break;
        const s = (i + 1) * 2;
        onProgress?.(s < 30 ? `Génération… ${s}s` : s < 60 ? `Presque prêt… ${s}s` : `Encore un peu… ${s}s`);
      }
      onProgress?.("Finalisation…");
      return await this.getResult(jobId);
    }
  }

  export default new ImageGenerationService();
  