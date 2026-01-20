import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import AuthService from './AuthService';

/**
 * Service de configuration d'API d'image
 * v5.4.17 - Support de 3 stratégies:
 * - pollinations: Pollinations AI (cloud)
 * - freebox: Stable Diffusion sur serveur Freebox
 * - local: SD Local sur smartphone
 */
class CustomImageAPIService {
  constructor() {
    // URL Freebox par défaut pour SD sur Freebox
    this.freeboxUrl = 'http://88.174.155.230:33437/generate';
    this.apiType = 'pollinations'; // 'pollinations', 'freebox' ou 'local'
    this.strategy = 'pollinations'; // Par défaut: Pollinations AI
    this.currentUserId = null;
  }

  /**
   * Récupère l'ID de l'utilisateur courant
   */
  async getCurrentUserId() {
    try {
      const user = AuthService.getCurrentUser();
      if (user?.id) {
        return user.id;
      }
      const storedUser = await AsyncStorage.getItem('current_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        return parsed.id || 'anonymous';
      }
      return 'anonymous';
    } catch (error) {
      return 'anonymous';
    }
  }

  /**
   * Clé de stockage spécifique à l'utilisateur
   */
  async getUserConfigKey() {
    const userId = await this.getCurrentUserId();
    return `custom_image_api_${userId}`;
  }

  /**
   * Charger la configuration de l'API personnalisée (PAR UTILISATEUR)
   */
  async loadConfig() {
    try {
      const userId = await this.getCurrentUserId();
      this.currentUserId = userId;
      
      // Essayer d'abord la config spécifique à l'utilisateur
      const userKey = `custom_image_api_${userId}`;
      let config = await AsyncStorage.getItem(userKey);
      
      // Fallback sur la config globale si pas de config utilisateur
      if (!config) {
        config = await AsyncStorage.getItem('custom_image_api');
      }
      
      if (config) {
        const parsed = JSON.parse(config);
        this.freeboxUrl = parsed.freeboxUrl || parsed.url || 'http://88.174.155.230:33437/generate';
        this.apiType = parsed.type || 'pollinations';
        // v5.4.31 - Supporter les 3 stratégies: pollinations, freebox, local
        // IMPORTANT: NE PAS migrer/changer la stratégie si elle est explicitement "freebox"
        this.strategy = parsed.strategy || 'pollinations';
        
        // v5.4.31 - Si la stratégie est freebox, TOUJOURS utiliser freebox (pas de migration auto)
        // L'ancienne migration causait des problèmes en changeant freebox en pollinations
        if (this.strategy === 'freebox') {
          console.log('🏠 Stratégie FREEBOX détectée - PAS de migration vers Pollinations');
          // S'assurer que l'URL Freebox est définie
          if (!this.freeboxUrl) {
            this.freeboxUrl = 'http://88.174.155.230:33437/generate';
          }
        }
        
        console.log(`📸 Config images chargée (user: ${userId}):`, {
          freeboxUrl: this.freeboxUrl ? this.freeboxUrl.substring(0, 50) + '...' : 'default',
          type: this.apiType,
          strategy: this.strategy
        });
        console.log(`🎯 STRATÉGIE ACTIVE: ${this.strategy.toUpperCase()}`);
      } else {
        console.log(`📸 Aucune config images (user: ${userId}), utilisation par défaut: Pollinations AI`);
        this.freeboxUrl = 'http://88.174.155.230:33437/generate';
        this.apiType = 'pollinations';
        this.strategy = 'pollinations';
      }
    } catch (error) {
      console.error('Error loading custom API config:', error);
      // Fallback sur Pollinations
      this.freeboxUrl = 'http://88.174.155.230:33437/generate';
      this.apiType = 'pollinations';
      this.strategy = 'pollinations';
    }
  }

  /**
   * Sauvegarder la configuration de l'API personnalisée (PAR UTILISATEUR)
   * @param {string} strategy - 'pollinations', 'freebox', ou 'local'
   * @param {string} freeboxUrl - URL du serveur Freebox (si strategy='freebox')
   */
  async saveConfig(strategy = 'pollinations', freeboxUrl = null) {
    try {
      const userId = await this.getCurrentUserId();
      
      // Valider la stratégie
      const validStrategies = ['pollinations', 'freebox', 'local'];
      const validStrategy = validStrategies.includes(strategy) ? strategy : 'pollinations';
      
      const config = { 
        freeboxUrl: freeboxUrl || this.freeboxUrl || 'http://88.174.155.230:33437/generate',
        type: validStrategy,
        strategy: validStrategy,
        userId: userId,
        updatedAt: Date.now()
      };
      
      this.freeboxUrl = config.freeboxUrl;
      this.apiType = config.type;
      this.strategy = config.strategy;
      
      // Sauvegarder avec la clé spécifique à l'utilisateur
      const userKey = `custom_image_api_${userId}`;
      await AsyncStorage.setItem(userKey, JSON.stringify(config));
      
      console.log(`✅ Config images sauvegardée (user: ${userId}):`, config);
      return true;
    } catch (error) {
      console.error('Error saving custom API config:', error);
      return false;
    }
  }

  /**
   * Supprimer la configuration (revenir à Pollinations par défaut)
   */
  async clearConfig() {
    try {
      const userId = await this.getCurrentUserId();
      const userKey = `custom_image_api_${userId}`;
      await AsyncStorage.removeItem(userKey);
      await AsyncStorage.removeItem('custom_image_api');
      
      this.freeboxUrl = 'http://88.174.155.230:33437/generate';
      this.apiType = 'pollinations';
      this.strategy = 'pollinations';
      return true;
    } catch (error) {
      console.error('Error clearing custom API config:', error);
      return false;
    }
  }

  /**
   * Obtenir l'URL du serveur Freebox
   */
  getFreeboxUrl() {
    return this.freeboxUrl || 'http://88.174.155.230:33437/generate';
  }

  /**
   * Obtenir l'URL de l'API actuelle (pour compatibilité)
   */
  getApiUrl() {
    return this.freeboxUrl;
  }

  /**
   * Obtenir le type d'API actuel
   */
  getApiType() {
    return this.apiType;
  }

  /**
   * Obtenir la stratégie de génération
   */
  getStrategy() {
    return this.strategy;
  }

  /**
   * Vérifier si on doit utiliser Pollinations AI
   */
  shouldUsePollinations() {
    return this.strategy === 'pollinations';
  }

  /**
   * Vérifier si on doit utiliser Freebox SD
   */
  shouldUseFreebox() {
    return this.strategy === 'freebox';
  }

  /**
   * Vérifier si on doit utiliser SD Local
   */
  shouldUseLocal() {
    return this.strategy === 'local';
  }

  /**
   * Tester la connexion au serveur Freebox
   */
  async testFreeboxConnection(url = null) {
    const testUrl = url || this.freeboxUrl;
    
    if (!testUrl) {
      return { success: false, error: 'Aucune URL configurée' };
    }

    try {
      // Extraire l'URL de base et tester avec /health
      let healthUrl = testUrl;
      if (testUrl.includes('/generate')) {
        healthUrl = testUrl.replace('/generate', '/health');
      } else if (!testUrl.endsWith('/health')) {
        healthUrl = testUrl.replace(/\/$/, '') + '/health';
      }
      
      console.log('🧪 Test connexion Freebox:', healthUrl);
      
      const response = await axios.get(healthUrl, {
        timeout: 10000,
        validateStatus: (status) => status < 500,
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('✅ Réponse Freebox:', response.status, response.data);

      return {
        success: true,
        status: response.status,
        message: 'Connexion au serveur Freebox réussie !',
      };
    } catch (error) {
      console.error('❌ Erreur test connexion Freebox:', error.message);
      
      // Message d'erreur plus détaillé
      let errorMsg = error.message;
      if (error.message.includes('Network Error') || error.message.includes('Network request failed')) {
        errorMsg = 'Erreur réseau. Vérifiez que:\n1. L\'URL est correcte\n2. La Freebox est allumée\n3. Le port 33437 est ouvert\n4. Vous êtes sur le même réseau';
      } else if (error.code === 'ECONNREFUSED') {
        errorMsg = 'Connexion refusée. Le serveur Freebox n\'est pas accessible.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMsg = 'Timeout. Le serveur Freebox met trop de temps à répondre.';
      }
      
      return {
        success: false,
        error: errorMsg,
        message: 'Impossible de se connecter au serveur Freebox',
      };
    }
  }

  /**
   * Construire l'URL de génération d'image pour Freebox SD
   */
  buildFreeboxImageUrl(prompt, options = {}) {
    const {
      width = 576,
      height = 1024,
      seed = Date.now(),
    } = options;

    const url = this.freeboxUrl || 'http://88.174.155.230:33437/generate';
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Si l'URL contient déjà des paramètres, utiliser &, sinon ?
    const separator = url.includes('?') ? '&' : '?';
    
    return `${url}${separator}prompt=${encodedPrompt}&width=${width}&height=${height}&seed=${seed}`;
  }
}

export default new CustomImageAPIService();
