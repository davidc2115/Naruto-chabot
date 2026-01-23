/**
 * Service PayPal pour les paiements
 * v5.4.80 - Tarification dynamique CENTRALISÉE sur serveur Freebox
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Alert } from 'react-native';
import axios from 'axios';

// URL du serveur Freebox pour la tarification centralisée
const FREEBOX_URL = 'http://88.174.155.230:33437';

class PayPalService {
  constructor() {
    this.STORAGE_KEY = '@paypal_config';
    this.PREMIUM_KEY = '@premium_status';
    this.LAST_CHECK_KEY = '@premium_last_check';
    this.PRICING_KEY = '@premium_pricing';
    this.PRICING_CACHE_KEY = '@premium_pricing_cache';
    
    // Configuration par défaut
    this.config = {
      paypalEmail: '',
      clientId: '',
      isConfigured: false,
    };
    
    // v5.4.80 - Prix de base (modifiable par admin, stocké sur serveur)
    this.basePricing = {
      monthlyPrice: 4.99,        // Prix mensuel de base
      lifetimeMultiplier: 20,    // À vie = mensuel × 20
      yearlyMonths: 10,          // Annuel = mensuel × 10 (2 mois gratuits)
      currency: 'EUR',
    };
    
    // Tarifs premium - calculés dynamiquement
    this.premiumPlans = this.calculatePlans(this.basePricing.monthlyPrice);
    
    // v5.4.80 - Charger les tarifs depuis le serveur au démarrage
    this.loadPricingFromServer();
    
    // Vérification automatique au démarrage
    this.checkAndExpirePremium();
  }
  
  /**
   * v5.4.77 - Calcule les plans à partir du prix mensuel de base
   */
  calculatePlans(monthlyPrice) {
    const yearlyPrice = parseFloat((monthlyPrice * this.basePricing.yearlyMonths).toFixed(2));
    const lifetimePrice = parseFloat((monthlyPrice * this.basePricing.lifetimeMultiplier).toFixed(2));
    
    return {
      monthly: {
        id: 'premium_monthly',
        name: '📅 Premium Mensuel',
        price: monthlyPrice,
        currency: this.basePricing.currency,
        period: 'month',
        durationDays: 30,
        features: [
          'Génération d\'images illimitée',
          'Tous les personnages débloqués',
          'Pas de publicité',
          'Support prioritaire',
        ],
        icon: '📅',
        color: '#3b82f6',
      },
      yearly: {
        id: 'premium_yearly',
        name: '🌟 Premium Annuel',
        price: yearlyPrice,
        currency: this.basePricing.currency,
        period: 'year',
        durationDays: 365,
        features: [
          'Tous les avantages mensuels',
          '2 mois gratuits (33% d\'économie)',
          'Accès anticipé aux nouvelles fonctionnalités',
          'Personnages exclusifs',
        ],
        icon: '🌟',
        color: '#f59e0b',
        recommended: true,
        savings: `${parseFloat((monthlyPrice * 12 - yearlyPrice).toFixed(2))}€ d'économie`,
      },
      lifetime: {
        id: 'premium_lifetime',
        name: '👑 Premium à Vie',
        price: lifetimePrice,
        currency: this.basePricing.currency,
        period: 'lifetime',
        durationDays: null, // Pas d'expiration
        features: [
          'Accès PERMANENT',
          'Toutes les futures mises à jour',
          'Badge VIP exclusif',
          'Support prioritaire à vie',
        ],
        icon: '👑',
        color: '#10b981',
      },
    };
  }
  
  /**
   * v5.4.80 - Charge les tarifs depuis le serveur Freebox (centralisé)
   */
  async loadPricingFromServer() {
    try {
      console.log('🔄 Chargement tarifs depuis serveur Freebox...');
      
      const response = await axios.get(`${FREEBOX_URL}/pricing`, {
        timeout: 5000,
      });
      
      if (response.data && response.data.monthlyPrice) {
        const pricing = response.data;
        this.basePricing = {
          monthlyPrice: pricing.monthlyPrice || 4.99,
          lifetimeMultiplier: pricing.lifetimeMultiplier || 20,
          yearlyMonths: pricing.yearlyMonths || 10,
          currency: pricing.currency || 'EUR',
        };
        this.premiumPlans = this.calculatePlans(this.basePricing.monthlyPrice);
        
        // Mettre en cache local pour fallback
        await AsyncStorage.setItem(this.PRICING_CACHE_KEY, JSON.stringify(this.basePricing));
        
        console.log(`💰 Tarifs serveur: Mensuel=${this.basePricing.monthlyPrice}€, Annuel=${this.premiumPlans.yearly.price}€, À vie=${this.premiumPlans.lifetime.price}€`);
        return this.basePricing;
      }
    } catch (error) {
      console.log('⚠️ Serveur tarifs indisponible, utilisation cache local...');
    }
    
    // Fallback: charger depuis le cache local
    return await this.loadPricingFromCache();
  }
  
  /**
   * v5.4.80 - Charge les tarifs depuis le cache local (fallback)
   */
  async loadPricingFromCache() {
    try {
      const stored = await AsyncStorage.getItem(this.PRICING_CACHE_KEY);
      if (stored) {
        const pricing = JSON.parse(stored);
        this.basePricing = { ...this.basePricing, ...pricing };
        this.premiumPlans = this.calculatePlans(this.basePricing.monthlyPrice);
        console.log(`💰 Tarifs cache: Mensuel=${this.basePricing.monthlyPrice}€`);
      }
      return this.basePricing;
    } catch (error) {
      console.error('Erreur chargement cache tarifs:', error);
      return this.basePricing;
    }
  }
  
  /**
   * v5.4.80 - Alias pour compatibilité
   */
  async loadPricing() {
    return await this.loadPricingFromServer();
  }
  
  /**
   * v5.4.80 - Modifie le prix mensuel de base (stocké sur serveur)
   * @param {number} newMonthlyPrice - Nouveau prix mensuel
   */
  async setBasePrice(newMonthlyPrice) {
    try {
      if (typeof newMonthlyPrice !== 'number' || newMonthlyPrice <= 0) {
        throw new Error('Prix mensuel invalide');
      }
      
      const newPricing = {
        monthlyPrice: parseFloat(newMonthlyPrice.toFixed(2)),
        lifetimeMultiplier: this.basePricing.lifetimeMultiplier,
        yearlyMonths: this.basePricing.yearlyMonths,
        currency: this.basePricing.currency,
        updatedAt: new Date().toISOString(),
      };
      
      // Sauvegarder sur le serveur Freebox
      try {
        await axios.post(`${FREEBOX_URL}/pricing`, newPricing, {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' },
        });
        console.log('✅ Tarifs sauvegardés sur serveur Freebox');
      } catch (serverError) {
        console.log('⚠️ Serveur indisponible, sauvegarde locale uniquement');
      }
      
      // Mettre à jour localement
      this.basePricing = newPricing;
      this.premiumPlans = this.calculatePlans(this.basePricing.monthlyPrice);
      
      // Mettre en cache local
      await AsyncStorage.setItem(this.PRICING_CACHE_KEY, JSON.stringify(this.basePricing));
      
      console.log(`💰 Prix mis à jour: Mensuel=${this.basePricing.monthlyPrice}€, Annuel=${this.premiumPlans.yearly.price}€, À vie=${this.premiumPlans.lifetime.price}€`);
      
      return {
        success: true,
        monthly: this.basePricing.monthlyPrice,
        yearly: this.premiumPlans.yearly.price,
        lifetime: this.premiumPlans.lifetime.price,
      };
    } catch (error) {
      console.error('Erreur modification prix:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * v5.4.80 - Modifie le prix à vie séparément (stocké sur serveur)
   */
  async setLifetimePrice(newLifetimePrice) {
    try {
      if (typeof newLifetimePrice !== 'number' || newLifetimePrice <= 0) {
        throw new Error('Prix à vie invalide');
      }
      
      // Calculer le nouveau multiplicateur
      const newMultiplier = newLifetimePrice / this.basePricing.monthlyPrice;
      
      const newPricing = {
        ...this.basePricing,
        lifetimeMultiplier: newMultiplier,
        updatedAt: new Date().toISOString(),
      };
      
      // Sauvegarder sur le serveur Freebox
      try {
        await axios.post(`${FREEBOX_URL}/pricing`, newPricing, {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' },
        });
        console.log('✅ Prix à vie sauvegardé sur serveur Freebox');
      } catch (serverError) {
        console.log('⚠️ Serveur indisponible, sauvegarde locale uniquement');
      }
      
      // Mettre à jour localement
      this.basePricing = newPricing;
      this.premiumPlans = this.calculatePlans(this.basePricing.monthlyPrice);
      this.premiumPlans.lifetime.price = parseFloat(newLifetimePrice.toFixed(2));
      
      // Mettre en cache local
      await AsyncStorage.setItem(this.PRICING_CACHE_KEY, JSON.stringify(this.basePricing));
      
      return { success: true, lifetime: this.premiumPlans.lifetime.price };
    } catch (error) {
      console.error('Erreur modification prix à vie:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * v5.4.77 - Obtient les tarifs actuels
   */
  getCurrentPricing() {
    return {
      monthlyPrice: this.basePricing.monthlyPrice,
      yearlyPrice: this.premiumPlans.yearly.price,
      lifetimePrice: this.premiumPlans.lifetime.price,
      yearlyMonths: this.basePricing.yearlyMonths,
      yearlySavings: this.premiumPlans.yearly.savings,
      currency: this.basePricing.currency,
    };
  }
  
  /**
   * v5.4.73 - Vérifie et expire automatiquement les abonnements expirés
   * Appelée au démarrage et peut être appelée manuellement
   */
  async checkAndExpirePremium() {
    try {
      const status = await this.getRawPremiumStatus();
      
      if (!status || !status.isPremium) {
        return { isPremium: false };
      }
      
      // Premium à vie = pas d'expiration
      if (status.planId === 'lifetime' || !status.expiresAt) {
        return status;
      }
      
      const now = new Date();
      const expiresAt = new Date(status.expiresAt);
      
      if (expiresAt < now) {
        // Abonnement expiré - le désactiver
        console.log(`⏰ Premium expiré le ${expiresAt.toLocaleDateString()}. Désactivation...`);
        await this.deactivatePremium();
        
        return { 
          isPremium: false, 
          expired: true,
          expiredAt: status.expiresAt,
          previousPlan: status.planId
        };
      }
      
      // Calculer les jours restants
      const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      
      return {
        ...status,
        daysRemaining,
        willExpireSoon: daysRemaining <= 7
      };
    } catch (error) {
      console.error('Erreur vérification premium:', error);
      return { isPremium: false };
    }
  }
  
  /**
   * v5.4.73 - Récupère le statut premium brut (sans vérification d'expiration)
   */
  async getRawPremiumStatus() {
    try {
      const stored = await AsyncStorage.getItem(this.PREMIUM_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return { isPremium: false };
    } catch (error) {
      return { isPremium: false };
    }
  }
  
  /**
   * v5.4.73 - Calcule la date d'expiration selon le plan
   */
  calculateExpirationDate(planId, startDate = new Date()) {
    const plan = this.premiumPlans[planId];
    if (!plan || plan.period === 'lifetime') {
      return null; // Pas d'expiration pour lifetime
    }
    
    const expiresAt = new Date(startDate);
    
    switch (plan.period) {
      case 'month':
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        break;
      case 'year':
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        break;
      default:
        expiresAt.setDate(expiresAt.getDate() + (plan.durationDays || 30));
    }
    
    return expiresAt;
  }
  
  /**
   * v5.4.73 - Formate la date d'expiration pour affichage
   */
  formatExpirationDate(expiresAt) {
    if (!expiresAt) return 'À vie';
    const date = new Date(expiresAt);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  
  /**
   * v5.4.73 - Récupère les jours restants
   */
  getDaysRemaining(expiresAt) {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    return Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
  }
  
  /**
   * v5.4.80 - Charge la configuration PayPal et les tarifs depuis le serveur
   */
  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.config = JSON.parse(stored);
      }
      // v5.4.80 - Charger les tarifs depuis le serveur (centralisé)
      await this.loadPricingFromServer();
      return this.config;
    } catch (error) {
      console.error('Erreur chargement config PayPal:', error);
      return this.config;
    }
  }
  
  /**
   * Sauvegarde la configuration PayPal
   */
  async saveConfig(config) {
    try {
      this.config = { ...this.config, ...config, isConfigured: !!config.paypalEmail };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde config PayPal:', error);
      return false;
    }
  }
  
  /**
   * Vérifie si PayPal est configuré
   */
  isConfigured() {
    return this.config.isConfigured && this.config.paypalEmail;
  }
  
  /**
   * Obtient les plans premium disponibles
   */
  getPremiumPlans() {
    return this.premiumPlans;
  }
  
  /**
   * Génère un lien de paiement PayPal.me
   */
  generatePaymentLink(planId, customAmount = null) {
    const plan = this.premiumPlans[planId];
    if (!plan && !customAmount) {
      throw new Error('Plan non trouvé');
    }
    
    const amount = customAmount || plan.price;
    const paypalEmail = this.config.paypalEmail;
    
    if (!paypalEmail) {
      throw new Error('Email PayPal non configuré');
    }
    
    // Générer le lien PayPal.me
    // Format: https://paypal.me/username/amount
    const username = paypalEmail.split('@')[0]; // Utiliser la partie avant @ comme username
    const paypalMeLink = `https://paypal.me/${username}/${amount}EUR`;
    
    return paypalMeLink;
  }
  
  /**
   * Ouvre le lien de paiement PayPal
   */
  async openPaymentLink(planId) {
    try {
      const link = this.generatePaymentLink(planId);
      const supported = await Linking.canOpenURL(link);
      
      if (supported) {
        await Linking.openURL(link);
        return true;
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir PayPal');
        return false;
      }
    } catch (error) {
      console.error('Erreur ouverture PayPal:', error);
      Alert.alert('Erreur', error.message);
      return false;
    }
  }
  
  /**
   * Processus complet de paiement avec activation automatique
   * Ouvre PayPal, puis demande confirmation et active le premium
   */
  async processPaymentWithAutoActivation(planId, onSuccess = null, onCancel = null) {
    const plan = this.premiumPlans[planId];
    if (!plan) {
      Alert.alert('Erreur', 'Plan non trouvé');
      return false;
    }
    
    // Générer un ID de transaction
    const transactionId = this.generateTransactionId();
    
    // Sauvegarder la transaction en attente
    await this.savePendingTransaction(transactionId, planId);
    
    return new Promise((resolve) => {
      Alert.alert(
        '💳 Paiement Premium',
        `Plan: ${plan.name}\nPrix: ${plan.price}€\n\nVous allez être redirigé vers PayPal.\n\nAprès le paiement, revenez dans l'application et confirmez.`,
        [
          {
            text: 'Annuler',
            style: 'cancel',
            onPress: () => {
              if (onCancel) onCancel();
              resolve(false);
            }
          },
          {
            text: 'Payer avec PayPal',
            onPress: async () => {
              const opened = await this.openPaymentLink(planId);
              if (opened) {
                // Attendre que l'utilisateur revienne et confirme
                setTimeout(() => {
                  this.showPaymentConfirmation(transactionId, planId, onSuccess, resolve);
                }, 3000);
              } else {
                resolve(false);
              }
            }
          }
        ]
      );
    });
  }
  
  /**
   * Affiche la confirmation de paiement après retour de PayPal
   */
  showPaymentConfirmation(transactionId, planId, onSuccess, resolve) {
    const plan = this.premiumPlans[planId];
    
    Alert.alert(
      '✅ Confirmer le paiement',
      `Avez-vous effectué le paiement de ${plan.price}€ sur PayPal ?\n\nID Transaction: ${transactionId}`,
      [
        {
          text: 'Non, annuler',
          style: 'cancel',
          onPress: async () => {
            await this.removePendingTransaction(transactionId);
            resolve(false);
          }
        },
        {
          text: 'Oui, j\'ai payé',
          onPress: async () => {
            // Activer automatiquement le premium
            const status = await this.activatePremiumAfterPayment(transactionId, planId);
            if (status && status.isPremium) {
              Alert.alert(
                '🎉 Premium Activé !',
                `Félicitations ! Votre compte est maintenant Premium.\n\nPlan: ${plan.name}\nValide jusqu'à: ${status.expiresAt ? new Date(status.expiresAt).toLocaleDateString() : 'À vie'}`,
                [{ text: 'Super !' }]
              );
              if (onSuccess) onSuccess(status);
              resolve(true);
            } else {
              Alert.alert('Erreur', 'Impossible d\'activer le premium. Contactez le support.');
              resolve(false);
            }
          }
        }
      ]
    );
  }
  
  /**
   * Active le premium automatiquement après confirmation de paiement
   */
  async activatePremiumAfterPayment(transactionId, planId) {
    try {
      // Activer le statut premium
      const status = await this.setPremiumStatus(true, planId, transactionId);
      
      // Supprimer la transaction en attente
      await this.removePendingTransaction(transactionId);
      
      // Sauvegarder l'historique des paiements
      await this.savePaymentHistory(transactionId, planId);
      
      console.log(`✅ Premium activé automatiquement - Transaction: ${transactionId}, Plan: ${planId}`);
      
      return status;
    } catch (error) {
      console.error('Erreur activation premium:', error);
      return null;
    }
  }
  
  /**
   * Sauvegarde une transaction en attente
   */
  async savePendingTransaction(transactionId, planId) {
    try {
      const key = '@pending_transactions';
      const stored = await AsyncStorage.getItem(key);
      const pending = stored ? JSON.parse(stored) : [];
      
      pending.push({
        transactionId,
        planId,
        createdAt: new Date().toISOString(),
      });
      
      await AsyncStorage.setItem(key, JSON.stringify(pending));
    } catch (error) {
      console.error('Erreur sauvegarde transaction en attente:', error);
    }
  }
  
  /**
   * Supprime une transaction en attente
   */
  async removePendingTransaction(transactionId) {
    try {
      const key = '@pending_transactions';
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const pending = JSON.parse(stored).filter(t => t.transactionId !== transactionId);
        await AsyncStorage.setItem(key, JSON.stringify(pending));
      }
    } catch (error) {
      console.error('Erreur suppression transaction en attente:', error);
    }
  }
  
  /**
   * Sauvegarde l'historique des paiements
   */
  async savePaymentHistory(transactionId, planId) {
    try {
      const key = '@payment_history';
      const stored = await AsyncStorage.getItem(key);
      const history = stored ? JSON.parse(stored) : [];
      
      const plan = this.premiumPlans[planId];
      history.push({
        transactionId,
        planId,
        planName: plan?.name || planId,
        amount: plan?.price || 0,
        currency: plan?.currency || 'EUR',
        paidAt: new Date().toISOString(),
      });
      
      await AsyncStorage.setItem(key, JSON.stringify(history));
    } catch (error) {
      console.error('Erreur sauvegarde historique paiement:', error);
    }
  }
  
  /**
   * Récupère l'historique des paiements
   */
  async getPaymentHistory() {
    try {
      const stored = await AsyncStorage.getItem('@payment_history');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erreur récupération historique:', error);
      return [];
    }
  }
  
  /**
   * Vérifie et récupère les transactions en attente (au cas où l'app a été fermée)
   */
  async checkPendingTransactions() {
    try {
      const key = '@pending_transactions';
      const stored = await AsyncStorage.getItem(key);
      const pending = stored ? JSON.parse(stored) : [];
      
      // Filtrer les transactions de plus de 24h
      const recent = pending.filter(t => {
        const created = new Date(t.createdAt);
        const now = new Date();
        const hours = (now - created) / (1000 * 60 * 60);
        return hours < 24;
      });
      
      if (recent.length !== pending.length) {
        await AsyncStorage.setItem(key, JSON.stringify(recent));
      }
      
      return recent;
    } catch (error) {
      console.error('Erreur vérification transactions en attente:', error);
      return [];
    }
  }
  
  /**
   * Permet à l'admin d'activer manuellement le premium pour un utilisateur
   */
  async adminActivatePremium(planId, customDuration = null) {
    const transactionId = `ADMIN_${this.generateTransactionId()}`;
    return await this.activatePremiumAfterPayment(transactionId, planId);
  }
  
  /**
   * Désactive le premium (admin ou expiration)
   */
  async deactivatePremium() {
    return await this.setPremiumStatus(false, null, null);
  }
  
  /**
   * Vérifie le statut premium de l'utilisateur (avec vérification d'expiration)
   */
  async checkPremiumStatus() {
    return await this.checkAndExpirePremium();
  }
  
  /**
   * v5.4.73 - Définit le statut premium avec gestion complète
   * @param {boolean} isPremium - Si premium activé
   * @param {string} planId - 'monthly', 'yearly', ou 'lifetime'
   * @param {string} transactionId - ID de transaction
   * @param {Date} customExpiration - Date d'expiration personnalisée (pour admin)
   */
  async setPremiumStatus(isPremium, planId = null, transactionId = null, customExpiration = null) {
    try {
      let expiresAt = null;
      let planName = null;
      
      if (isPremium && planId) {
        const plan = this.premiumPlans[planId];
        planName = plan?.name || planId;
        
        if (customExpiration) {
          // Utiliser l'expiration personnalisée (donnée par admin)
          expiresAt = customExpiration;
        } else {
          // Calculer l'expiration selon le plan
          expiresAt = this.calculateExpirationDate(planId);
        }
      }
      
      const status = {
        isPremium,
        planId,
        planName,
        transactionId,
        activatedAt: isPremium ? new Date().toISOString() : null,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        // v5.4.73 - Métadonnées supplémentaires
        activatedBy: transactionId?.startsWith('ADMIN_') ? 'admin' : 'payment',
        version: '5.4.80',
      };
      
      await AsyncStorage.setItem(this.PREMIUM_KEY, JSON.stringify(status));
      
      console.log(`✅ Premium ${isPremium ? 'activé' : 'désactivé'}: Plan=${planId}, Expire=${expiresAt ? expiresAt.toISOString() : 'jamais'}`);
      
      return status;
    } catch (error) {
      console.error('Erreur définition premium:', error);
      return null;
    }
  }
  
  /**
   * v5.4.73 - Active le premium avec un type spécifique (pour admin)
   */
  async adminSetPremium(planId, customDurationDays = null) {
    const transactionId = `ADMIN_${this.generateTransactionId()}`;
    
    let customExpiration = null;
    if (customDurationDays) {
      customExpiration = new Date();
      customExpiration.setDate(customExpiration.getDate() + customDurationDays);
    }
    
    return await this.setPremiumStatus(true, planId, transactionId, customExpiration);
  }
  
  /**
   * Génère un code de transaction unique
   */
  generateTransactionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `TXN_${timestamp}_${random}`.toUpperCase();
  }
  
  /**
   * Simule une vérification de paiement (pour test)
   * En production, cela devrait vérifier avec l'API PayPal
   */
  async verifyPayment(transactionId) {
    // TODO: Implémenter la vérification réelle avec l'API PayPal
    // Pour l'instant, retourne true pour les tests
    console.log(`Vérification paiement: ${transactionId}`);
    return true;
  }
  
  /**
   * Obtient l'email PayPal configuré
   */
  getPayPalEmail() {
    return this.config.paypalEmail;
  }
}

// Singleton
const payPalService = new PayPalService();
export default payPalService;
