import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initLlama } from 'llama.rn';
import PromptBuilder from './PromptBuilder';

/**
 * LlamaService v1.0 — IA 100% hors ligne (llama.rn + llama.cpp)
 *
 * Modèles disponibles :
 *   • Phi-3.5-mini-instruct Q4_K_M  (~2.2GB) → meilleure qualité roleplay
 *   • Llama-3.2-1B-Instruct Q4_K_M  (~700MB)  → téléphone modeste / rapide
 *
 * Flux :
 *   1. downloadModel()  → télécharge le .gguf dans documentDirectory
 *   2. loadModel()      → initLlama() charge en RAM (~10-30s)
 *   3. generateResponse() → context.completion() (on-device, offline)
 *   4. unloadModel()    → libère la RAM
 */

export const LLAMA_MODELS = {
  phi35mini: {
    name: 'Phi-3.5 Mini (Recommandé)',
    desc: '2.2 Go • Excellente qualité, idéal pour le roleplay',
    filename: 'phi-3.5-mini-q4.gguf',
    url: 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf',
    size: 2_200_000_000,
    stop: ['<|end|>', '<|user|>', '\n\nUtilisateur:', 'Utilisateur:'],
  },
  llama321b: {
    name: 'Llama 3.2 1B (Léger)',
    desc: '700 Mo • Rapide, pour téléphones avec peu de RAM',
    filename: 'llama-3.2-1b-q4.gguf',
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    size: 700_000_000,
    stop: ['<|eot_id|>', '\n\nUtilisateur:', 'Utilisateur:', '<|start_header_id|>user'],
  },
};

const ACTIVE_MODEL_KEY = 'llama_active_model_id';
const MODEL_DIR = () => `${FileSystem.documentDirectory}llama/`;

class LlamaService {
  constructor() {
    this.context = null;
    this.isLoaded = false;
    this.activeModelId = null;
    this._loadingBusy = false;
    this._downloadResumable = null;
  }

  // ─── Model paths ────────────────────────────────────────────────────────────

  getModelPath(modelId) {
    const m = LLAMA_MODELS[modelId];
    return m ? `${MODEL_DIR()}${m.filename}` : null;
  }

  async isModelDownloaded(modelId) {
    const path = this.getModelPath(modelId);
    if (!path) return false;
    try {
      const info = await FileSystem.getInfoAsync(path);
      return info.exists && info.size > (LLAMA_MODELS[modelId]?.size || 0) * 0.90;
    } catch { return false; }
  }

  async getStoredActiveModelId() {
    try { return await AsyncStorage.getItem(ACTIVE_MODEL_KEY); } catch { return null; }
  }

  // ─── Download ────────────────────────────────────────────────────────────────

  /**
   * @param {string} modelId
   * @param {(progress: number, bytesWritten: number, total: number) => void} onProgress
   * @returns {Promise<void>}
   */
  async downloadModel(modelId, onProgress) {
    const model = LLAMA_MODELS[modelId];
    if (!model) throw new Error('Modèle inconnu');

    // Ensure directory exists
    const dir = MODEL_DIR();
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

    const path = this.getModelPath(modelId);

    this._downloadResumable = FileSystem.createDownloadResumable(
      model.url,
      path,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        const pct = totalBytesExpectedToWrite > 0 ? totalBytesWritten / totalBytesExpectedToWrite : 0;
        onProgress?.(pct, totalBytesWritten, totalBytesExpectedToWrite);
      }
    );

    try {
      await this._downloadResumable.downloadAsync();
    } catch (e) {
      // Clean up partial file on error (not on cancel)
      if (!e.message?.includes('cancel')) {
        await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
      }
      throw e;
    } finally {
      this._downloadResumable = null;
    }
  }

  async cancelDownload() {
    if (this._downloadResumable) {
      await this._downloadResumable.cancelAsync().catch(() => {});
      this._downloadResumable = null;
    }
  }

  async deleteModel(modelId) {
    const path = this.getModelPath(modelId);
    if (path) await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
    if (this.activeModelId === modelId) await this.unloadModel();
  }

  // ─── Load / unload ───────────────────────────────────────────────────────────

  /**
   * Charge le modèle en mémoire (~10-30 secondes).
   * @param {string} modelId
   * @param {(msg: string) => void} onProgress
   */
  async loadModel(modelId, onProgress) {
    if (this._loadingBusy) throw new Error('Chargement déjà en cours…');
    if (this.isLoaded && this.activeModelId === modelId) return; // Already loaded

    const downloaded = await this.isModelDownloaded(modelId);
    if (!downloaded) throw new Error('Modèle non téléchargé');

    this._loadingBusy = true;
    try {
      // Unload previous context first
      if (this.context) {
        onProgress?.('Libération de l\'ancien modèle…');
        await this.context.release().catch(() => {});
        this.context = null;
        this.isLoaded = false;
        this.activeModelId = null;
      }

      onProgress?.('Chargement en mémoire… (peut prendre 30s)');
      const modelPath = this.getModelPath(modelId);

      this.context = await initLlama({
        model: modelPath,
        use_mlock: false,
        n_ctx: 2048,
        n_threads: 4,
        n_gpu_layers: 0,  // CPU inference (NDK ARM)
        n_batch: 512,
      });

      this.isLoaded = true;
      this.activeModelId = modelId;
      await AsyncStorage.setItem(ACTIVE_MODEL_KEY, modelId).catch(() => {});
      onProgress?.('✅ Modèle prêt !');
    } finally {
      this._loadingBusy = false;
    }
  }

  async unloadModel() {
    if (this.context) {
      await this.context.release().catch(() => {});
      this.context = null;
    }
    this.isLoaded = false;
    this.activeModelId = null;
    await AsyncStorage.removeItem(ACTIVE_MODEL_KEY).catch(() => {});
  }

  // ─── Inference ───────────────────────────────────────────────────────────────

  /**
   * Construit un prompt système COMPACT optimisé pour les petits modèles locaux.
   * Réutilise PromptBuilder partagé avec GroqService.
   */
  buildSystemPrompt(character, userProfile, memoriesPrompt = '', relationship = null) {
    return PromptBuilder.buildSystemPrompt(character, userProfile, memoriesPrompt, relationship, { compact: true });
  }

  /**
   * Génère une réponse en local, sans Internet.
   * Format imposé : *pensée*, (action), dialogue — réponses 1-3 phrases.
   * @param {Array} messages          — historique [{role, content}]
   * @param {string|null} systemPrompt — prompt système. Si null, doit être fourni via buildSystemPrompt.
   * @param {Function} [onToken]      — callback token-by-token (streaming)
   * @returns {Promise<string>}
   */
  async generateResponse(messages, systemPrompt, onToken) {
    if (!this.isLoaded || !this.context) {
      throw new Error(
        'Aucun modèle chargé. Allez dans Config → Hors-ligne pour télécharger et charger un modèle.'
      );
    }

    const model = LLAMA_MODELS[this.activeModelId];
    // Stops élargis : on coupe dès que le modèle veut continuer un nouveau tour ou faire un monologue
    const baseStop = model?.stop || ['<|end|>', 'Utilisateur:'];
    const stopTokens = [
      ...baseStop,
      '\nUtilisateur:', '\nUser:', '\n\nUtilisateur', '\n\nUser',
      '\n###', '\n[INST]', '</s>',
    ];

    const chatMessages = [
      { role: 'system', content: systemPrompt || '' },
      ...messages
        .slice(-16) // contexte plus court → réponses plus rapides + plus concises
        .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content?.trim()),
    ];

    const completionOpts = {
      messages: chatMessages,
      n_predict: 160,          // ↓ pour réponses COURTES (1-3 phrases)
      temperature: 0.82,
      top_p: 0.92,
      min_p: 0.05,
      repeat_penalty: 1.18,
      frequency_penalty: 0.5,
      presence_penalty: 0.4,
      stop: stopTokens,
    };

    const result = await this.context.completion(
      completionOpts,
      onToken ? (data) => { if (data.token) onToken(data.token); } : undefined
    );

    let text = (result.text || '').trim();
    // Coupe défensivement après la 4e phrase si le modèle s'emballe
    const sentences = text.split(/(?<=[.!?…])\s+/);
    if (sentences.length > 4) text = sentences.slice(0, 4).join(' ').trim();
    return text;
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────

  formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
  }
}

export default new LlamaService();
