import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * AuthService - Version sans connexion
 * Le système d'authentification a été supprimé.
 * Ce fichier est conservé pour éviter les erreurs dans les autres écrans
 * qui importent encore ce service.
 */
class AuthService {
  constructor() {
    this.token = null;
    this.user = null;
  }

  isAdmin() {
    return false;
  }

  isPremium() {
    return false;
  }

  async checkPremiumStatus() {
    return false;
  }

  async getPremiumDetails() {
    return { is_premium: false, is_admin: false };
  }

  async init() {
    return false;
  }

  getHeaders() {
    return { 'Content-Type': 'application/json' };
  }

  isLoggedIn() {
    return false;
  }

  isProfileCompleted() {
    return true;
  }

  getCurrentUser() {
    return null;
  }

  getProfile() {
    return null;
  }

  async register(email, password) {
    return { success: false, error: 'Système de connexion désactivé' };
  }

  async login(email, password) {
    return { success: false, error: 'Système de connexion désactivé' };
  }

  async loginWithDiscord() {
    return { success: false, error: 'Connexion Discord désactivée' };
  }

  async loginWithGoogle() {
    return { success: false, error: 'Connexion Google désactivée' };
  }

  async handleOAuthCallback(token) {
    return { success: false, error: 'OAuth désactivé' };
  }

  async verifyToken() {
    return false;
  }

  async fetchProfile() {
    return null;
  }

  async updateProfile(profile) {
    return { success: false, error: 'Système de connexion désactivé' };
  }

  async logout() {
    this.token = null;
    this.user = null;
    await AsyncStorage.removeItem('auth_token').catch(() => {});
  }

  async getMyCharacters() {
    return [];
  }

  async saveCharacter(character) {
    throw new Error('Système de connexion désactivé');
  }

  async deleteCharacter(characterId) {
    return false;
  }

  async checkServerHealth() {
    return false;
  }
}

export default new AuthService();
