import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ApiServerService v1.0
 * Proxy vers le serveur Replit — génération de texte et d'images sans clé côté utilisateur.
 * Le serveur gère les clés API. L'APK appelle juste ce service.
 */

const SERVER_URL_KEY = 'api_server_url';

// URL du serveur déployé — mise à jour automatique après déploiement
// L'utilisateur peut aussi la configurer dans Config → Serveur IA
let DEFAULT_SERVER_URL = '';

class ApiServerService {
  constructor() {
    this._url = null;
    this._healthy = null; // cache: true/false/null
    this._lastCheck = 0;
  }

  async getServerUrl() {
    if (!this._url) {
      const saved = await AsyncStorage.getItem(SERVER_URL_KEY).catch(() => null);
      this._url = saved || DEFAULT_SERVER_URL;
    }
    return this._url;
  }

  async setServerUrl(url) {
    const normalized = url.trim().replace(/\/$/, '');
    this._url = normalized;
    this._healthy = null;
    await AsyncStorage.setItem(SERVER_URL_KEY, normalized);
  }

  async clearServerUrl() {
    this._url = null;
    this._healthy = null;
    await AsyncStorage.removeItem(SERVER_URL_KEY);
  }

  /**
   * Vérifie si le serveur est disponible (avec cache 30s).
   */
  async isServerAvailable() {
    const url = await this.getServerUrl();
    if (!url) return false;

    const now = Date.now();
    if (this._healthy !== null && now - this._lastCheck < 30000) {
      return this._healthy;
    }

    try {
      const res = await fetch(`${url}/api/healthz`, {
        signal: AbortSignal.timeout(5000),
      });
      this._healthy = res.ok;
      this._lastCheck = now;
      return this._healthy;
    } catch {
      this._healthy = false;
      this._lastCheck = now;
      return false;
    }
  }

  /**
   * Génère une réponse de personnage via le serveur Replit.
   * @param {string} systemPrompt - Prompt système complet
   * @param {Array} messages - Historique [{role, content}]
   * @param {string} model - Modèle Groq
   * @returns {Promise<string>} - Réponse du personnage
   */
  async generateText(systemPrompt, messages, model = 'llama-3.3-70b-versatile') {
    const url = await this.getServerUrl();
    if (!url) throw new Error('NO_SERVER');

    const res = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, messages, model }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `Serveur erreur ${res.status}`);
    }

    const data = await res.json();
    return data.content || '';
  }

  /**
   * Génère une image via le serveur Replit (Stable Horde côté serveur).
   * Retourne base64 pur (sans préfixe data:).
   * Attention : peut prendre jusqu'à 2 minutes.
   * @param {string} prompt - Prompt de génération
   * @param {string} negativePrompt - Prompt négatif
   * @returns {Promise<string>} - base64 de l'image
   */
  async generateImage(prompt, negativePrompt = '') {
    const url = await this.getServerUrl();
    if (!url) throw new Error('NO_SERVER');

    const res = await fetch(`${url}/api/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, negativePrompt }),
      signal: AbortSignal.timeout(150000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `Serveur image erreur ${res.status}`);
    }

    const data = await res.json();
    return data.imageBase64 || '';
  }
}

export default new ApiServerService();
