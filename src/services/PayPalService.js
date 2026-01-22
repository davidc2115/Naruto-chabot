/**
 * Service PayPal pour les paiements
 * v5.4.53 - Gestion des abonnements et paiements premium avec activation automatique
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Alert } from 'react-native';

class PayPalService {
  constructor() {
    this.STORAGE_KEY = '@paypal_config';
    this.PREMIUM_KEY = '@premium_status';
    
    // Configuration par défaut
    this.config = {
      paypalEmail: '',
      clientId: '',
      isConfigured: false,
    };
    
    // Tarifs premium
    this.premiumPlans = {
      monthly: {
        id: 'premium_monthly',
        name: 'Premium Mensuel',
        price: 4.99,
        currency: 'EUR',
        period: 'month',
        features: [
          'Génération d\'images illimitée',
          'Tous les personnages débloqués',
          'Pas de publicité',
          'Support prioritaire',
        ],
      },
      yearly: {
        id: 'premium_yearly',
        name: 'Premium Annuel',
        price: 39.99,
        currency: 'EUR',
        period: 'year',
        features: [
          'Tous les avantages mensuels',
          '2 mois gratuits',
          'Accès anticipé aux nouvelles fonctionnalités',
          'Personnages exclusifs',
        ],
      },
      lifetime: {
        id: 'premium_lifetime',
        name: 'Premium à Vie',
        price: 99.99,
        currency: 'EUR',
        period: 'lifetime',
        features: [
          'Accès permanent',
          'Toutes les futures mises à jour',
          'Badge VIP',
          'Support prioritaire permanent',
        ],
      },
    };
  }
  
  /**
   * Charge la configuration PayPal
   */
  async loadConfig() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.config = JSON.parse(stored);
      }
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
   * Vérifie le statut premium de l'utilisateur
   */
  async checkPremiumStatus() {
    try {
      const stored = await AsyncStorage.getItem(this.PREMIUM_KEY);
      if (stored) {
        const status = JSON.parse(stored);
        
        // Vérifier si l'abonnement n'a pas expiré
        if (status.expiresAt && new Date(status.expiresAt) < new Date()) {
          // Abonnement expiré
          await this.setPremiumStatus(false);
          return { isPremium: false, expired: true };
        }
        
        return status;
      }
      return { isPremium: false };
    } catch (error) {
      console.error('Erreur vérification premium:', error);
      return { isPremium: false };
    }
  }
  
  /**
   * Définit le statut premium (après vérification manuelle du paiement)
   */
  async setPremiumStatus(isPremium, planId = null, transactionId = null) {
    try {
      let expiresAt = null;
      
      if (isPremium && planId) {
        const plan = this.premiumPlans[planId];
        if (plan) {
          const now = new Date();
          switch (plan.period) {
            case 'month':
              expiresAt = new Date(now.setMonth(now.getMonth() + 1));
              break;
            case 'year':
              expiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
              break;
            case 'lifetime':
              expiresAt = null; // Pas d'expiration
              break;
          }
        }
      }
      
      const status = {
        isPremium,
        planId,
        transactionId,
        activatedAt: isPremium ? new Date().toISOString() : null,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      };
      
      await AsyncStorage.setItem(this.PREMIUM_KEY, JSON.stringify(status));
      return status;
    } catch (error) {
      console.error('Erreur définition premium:', error);
      return null;
    }
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
