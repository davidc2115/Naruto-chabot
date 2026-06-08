import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import AuthService from './AuthService';

/**
 * Service de configuration d'API d'image
 * Freebox utilise Pollinations avec rotation de modèles en cas de rate limit
 * v5.3.8 - Configuration PAR UTILISATEUR
 */
class CustomImageAPIService {
  constructor() {
    // URL Freebox par défaut (serveur Pollinations avec fallback multi-modèles)
    this.customApiUrl = 'http://82.65.75.176:33437/generate';
    this.apiType = 'freebox'; // 'freebox' ou 'local'
    this.strategy = 'freebox'; // 'freebox' ou 'local'
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
        this.customApiUrl = parsed.url || 'http://88.174.155.230:33437/generate';
        this.apiType = parsed.type || 'freebox';
        // Forcer freebox ou local, jamais pollinations
        this.strategy = (parsed.strategy === 'local') ? 'local' : 'freebox';
        
        console.log(`📸 Config images chargée (user: ${userId}):`, {
          url: this.customApiUrl ? this.customApiUrl.substring(0, 50) + '...' : 'freebox default',
          type: this.apiType,
          strategy: this.strategy
        });
      } else {
        console.log(`📸 Aucune config images (user: ${userId}), utilisation par défaut: Freebox`);
        this.customApiUrl = 'http://88.174.155.230:33437/generate';
        this.apiType = 'freebox';
        this.strategy = 'freebox';
      }
    } catch (error) {
      console.error('Error loading custom API config:', error);
      // Fallback sur Freebox
      this.customApiUrl = 'http://88.174.155.230:33437/generate';
      this.apiType = 'freebox';
      this.strategy = 'freebox';
    }
  }

  /**
   * Sauvegarder la configuration de l'API personnalisée (PAR UTILISATEUR)
   */
  async saveConfig(url, type = 'freebox', strategy = 'freebox') {
    try {
      const userId = await this.getCurrentUserId();
      
      // Forcer freebox ou local uniquement
      const validStrategy = (strategy === 'local') ? 'local' : 'freebox';
      const validType = (type === 'local') ? 'local' : 'freebox';
      
      const config = { 
        url: url || 'http://88.174.155.230:33437/generate', 
        type: validType, 
        strategy: validStrategy,
        userId: userId,
        updatedAt: Date.now()
      };
      
      this.customApiUrl = config.url;
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
   * Supprimer la configuration (revenir à Freebox par défaut)
   */
  async clearConfig() {
    try {
      await AsyncStorage.removeItem('custom_image_api');
      this.customApiUrl = 'http://88.174.155.230:33437/generate';
      this.apiType = 'freebox';
      this.strategy = 'freebox';
      return true;
    } catch (error) {
      console.error('Error clearing custom API config:', error);
      return false;
    }
  }

  /**
   * Obtenir l'URL de l'API actuelle
   */
  getApiUrl() {
    return this.customApiUrl || 'http://88.174.155.230:33437/generate';
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
   * Vérifier si une API personnalisée est configurée
   */
  hasCustomApi() {
    return this.customApiUrl !== null && this.customApiUrl !== '';
  }

  /**
   * Vérifier si on doit utiliser Freebox
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
   * Tester la connexion à l'API personnalisée
   */
  async testConnection(url = null) {
    const testUrl = url || this.customApiUrl;
    
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
      
      console.log('🧪 Test connexion:', healthUrl);
      
      const response = await axios.get(healthUrl, {
        timeout: 10000,
        validateStatus: (status) => status < 500,
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('✅ Réponse:', response.status, response.data);

      return {
        success: true,
        status: response.status,
        message: 'Connexion réussie',
      };
    } catch (error) {
      console.error('❌ Erreur test connexion:', error.message);
      
      // Message d'erreur plus détaillé
      let errorMsg = error.message;
      if (error.message.includes('Network Error') || error.message.includes('Network request failed')) {
        errorMsg = 'Erreur réseau. Vérifiez que:\n1. L\'URL est correcte\n2. La Freebox est allumée\n3. Le port 33437 est ouvert\n4. Vous êtes sur le même réseau (ou en 4G/5G)';
      } else if (error.code === 'ECONNREFUSED') {
        errorMsg = 'Connexion refusée. Le serveur n\'est pas accessible.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMsg = 'Timeout. Le serveur met trop de temps à répondre.';
      }
      
      return {
        success: false,
        error: errorMsg,
        message: 'Impossible de se connecter à l\'API',
      };
    }
  }

  /**
   * Construire l'URL de génération d'image - FREEBOX UNIQUEMENT
   */
  buildImageUrl(prompt, options = {}) {
    const {
      width = 768,
      height = 768,
      seed = Date.now(),
    } = options;

    const url = this.customApiUrl || 'http://88.174.155.230:33437/generate';
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Si l'URL contient déjà des paramètres, utiliser &, sinon ?
    const separator = url.includes('?') ? '&' : '?';
    
    return `${url}${separator}prompt=${encodedPrompt}&width=${width}&height=${height}&seed=${seed}`;
  }
}

export default new CustomImageAPIService();
