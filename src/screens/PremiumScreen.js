import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import AuthService from '../services/AuthService';
import PayPalService from '../services/PayPalService';

const FREEBOX_URL = 'http://88.174.155.230:33437';

/**
 * v5.4.75 - PremiumScreen avec 3 types d'abonnement
 * - Mensuel: 4.99€/mois
 * - Annuel: 39.99€/an (RECOMMANDÉ)
 * - À Vie: 99.99€ une fois
 */
export default function PremiumScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState({});
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Les 3 plans disponibles
  const plans = {
    monthly: {
      id: 'monthly',
      name: 'Mensuel',
      icon: '📅',
      price: 4.99,
      period: '/mois',
      color: '#3b82f6',
      features: [
        'Génération d\'images illimitée',
        'Tous les personnages débloqués',
        'Pas de publicité',
        'Support prioritaire',
      ],
      description: 'Renouvelé chaque mois',
    },
    yearly: {
      id: 'yearly',
      name: 'Annuel',
      icon: '🌟',
      price: 39.99,
      period: '/an',
      color: '#f59e0b',
      recommended: true,
      features: [
        'Tous les avantages mensuels',
        '2 mois GRATUITS (33% économie)',
        'Accès anticipé aux nouveautés',
        'Personnages exclusifs',
      ],
      description: 'Meilleur rapport qualité/prix',
    },
    lifetime: {
      id: 'lifetime',
      name: 'À Vie',
      icon: '👑',
      price: 99.99,
      period: 'une fois',
      color: '#10b981',
      features: [
        'Accès PERMANENT',
        'Toutes les futures mises à jour',
        'Badge VIP exclusif',
        'Support prioritaire à vie',
      ],
      description: 'Paiement unique, accès illimité',
    },
  };

  useEffect(() => {
    loadPremiumStatus();
  }, []);

  const loadPremiumStatus = async () => {
    try {
      // Vérifier via PayPalService (local)
      const localStatus = await PayPalService.checkPremiumStatus();
      if (localStatus.isPremium) {
        setIsPremium(true);
        setPremiumStatus(localStatus);
      } else {
        // Vérifier aussi via AuthService (serveur)
        const serverStatus = await AuthService.checkPremiumStatus();
        setIsPremium(serverStatus.is_premium || false);
        setPremiumStatus(serverStatus);
      }
    } catch (error) {
      console.error('Erreur chargement statut premium:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (planId) => {
    const plan = plans[planId];
    if (!plan) return;

    setSelectedPlan(planId);
    setPurchasing(true);

    try {
      // Utiliser PayPalService pour le paiement avec activation auto
      const success = await PayPalService.processPaymentWithAutoActivation(
        planId,
        async (status) => {
          // Callback de succès
          setPremiumStatus(status);
          setIsPremium(true);
        },
        () => {
          // Callback d'annulation
          console.log('Paiement annulé');
        }
      );

      if (success) {
        // Recharger le statut
        await loadPremiumStatus();
      }
    } catch (error) {
      console.error('Erreur paiement:', error);
      Alert.alert('Erreur', 'Impossible de traiter le paiement');
    } finally {
      setPurchasing(false);
      setSelectedPlan(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // Écran pour les utilisateurs déjà Premium
  if (isPremium) {
    return (
      <View style={styles.safeArea}>
        <ScrollView style={styles.container}>
          <View style={styles.premiumHeader}>
            <Text style={styles.premiumIcon}>👑</Text>
            <Text style={styles.premiumTitle}>Vous êtes Premium !</Text>
            {premiumStatus.planId && (
              <Text style={styles.premiumPlanLabel}>
                {premiumStatus.planId === 'monthly' && '📅 Abonnement Mensuel'}
                {premiumStatus.planId === 'yearly' && '🌟 Abonnement Annuel'}
                {premiumStatus.planId === 'lifetime' && '👑 Premium à Vie'}
              </Text>
            )}
            {premiumStatus.expiresAt && (
              <View style={styles.expirationBadge}>
                <Text style={styles.expirationText}>
                  Expire le {new Date(premiumStatus.expiresAt).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            )}
            {!premiumStatus.expiresAt && premiumStatus.planId === 'lifetime' && (
              <View style={[styles.expirationBadge, { backgroundColor: '#d1fae5' }]}>
                <Text style={[styles.expirationText, { color: '#059669' }]}>
                  ♾️ Accès permanent
                </Text>
              </View>
            )}
          </View>

          <View style={styles.benefitsSection}>
            <Text style={styles.sectionTitle}>✨ Vos avantages actifs</Text>
            
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🖼️</Text>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Génération d'images illimitée</Text>
                <Text style={styles.benefitDesc}>Créez autant d'images que vous voulez</Text>
              </View>
              <Text style={styles.checkmark}>✓</Text>
            </View>

            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🎨</Text>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Styles d'images variés</Text>
                <Text style={styles.benefitDesc}>Anime, réaliste, 3D et plus</Text>
              </View>
              <Text style={styles.checkmark}>✓</Text>
            </View>

            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>💬</Text>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Chat Communautaire</Text>
                <Text style={styles.benefitDesc}>Discutez avec les membres Premium</Text>
              </View>
              <Text style={styles.checkmark}>✓</Text>
            </View>

            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>💫</Text>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Support prioritaire</Text>
                <Text style={styles.benefitDesc}>Accès au support Discord VIP</Text>
              </View>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          </View>

          {/* Bouton Chat Premium */}
          <TouchableOpacity
            style={styles.premiumChatButton}
            onPress={() => navigation.navigate('PremiumChat')}
          >
            <Text style={styles.premiumChatButtonIcon}>💬</Text>
            <View style={styles.premiumChatButtonContent}>
              <Text style={styles.premiumChatButtonTitle}>Accéder au Chat Premium</Text>
              <Text style={styles.premiumChatButtonDesc}>Discutez en public ou en privé</Text>
            </View>
            <Text style={styles.premiumChatButtonArrow}>→</Text>
          </TouchableOpacity>

          <Text style={styles.thankYou}>
            Merci pour votre soutien ! 💜
          </Text>

          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    );
  }

  // Écran pour les utilisateurs non-Premium - AFFICHAGE DES 3 PLANS
  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>💎</Text>
          <Text style={styles.headerTitle}>Devenir Premium</Text>
          <Text style={styles.headerSubtitle}>Choisissez votre formule</Text>
        </View>

        {/* ========== LES 3 PLANS ========== */}
        <View style={styles.plansContainer}>
          
          {/* PLAN MENSUEL */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected
            ]}
            onPress={() => handlePurchase('monthly')}
            disabled={purchasing}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planIcon}>📅</Text>
              <Text style={styles.planName}>Mensuel</Text>
            </View>
            <View style={styles.planPriceRow}>
              <Text style={[styles.planPrice, { color: '#3b82f6' }]}>4.99€</Text>
              <Text style={styles.planPeriod}>/mois</Text>
            </View>
            <View style={styles.planFeatures}>
              <Text style={styles.planFeature}>✓ Génération d'images illimitée</Text>
              <Text style={styles.planFeature}>✓ Tous les personnages</Text>
              <Text style={styles.planFeature}>✓ Support prioritaire</Text>
            </View>
            <View style={[styles.planButton, { backgroundColor: '#3b82f6' }]}>
              {purchasing && selectedPlan === 'monthly' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.planButtonText}>📲 S'abonner</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* PLAN ANNUEL - RECOMMANDÉ */}
          <TouchableOpacity
            style={[
              styles.planCard,
              styles.planCardRecommended,
              selectedPlan === 'yearly' && styles.planCardSelected
            ]}
            onPress={() => handlePurchase('yearly')}
            disabled={purchasing}
          >
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>⭐ RECOMMANDÉ</Text>
            </View>
            <View style={styles.planHeader}>
              <Text style={styles.planIcon}>🌟</Text>
              <Text style={[styles.planName, { color: '#f59e0b' }]}>Annuel</Text>
            </View>
            <View style={styles.planPriceRow}>
              <Text style={[styles.planPrice, { color: '#f59e0b' }]}>39.99€</Text>
              <Text style={styles.planPeriod}>/an</Text>
            </View>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>💰 2 mois GRATUITS !</Text>
            </View>
            <View style={styles.planFeatures}>
              <Text style={styles.planFeature}>✓ Tout le plan mensuel</Text>
              <Text style={[styles.planFeature, { fontWeight: 'bold', color: '#f59e0b' }]}>✓ 33% d'économie</Text>
              <Text style={styles.planFeature}>✓ Accès anticipé nouveautés</Text>
              <Text style={styles.planFeature}>✓ Personnages exclusifs</Text>
            </View>
            <View style={[styles.planButton, { backgroundColor: '#f59e0b' }]}>
              {purchasing && selectedPlan === 'yearly' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.planButtonText}>📲 S'abonner</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* PLAN À VIE */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'lifetime' && styles.planCardSelected
            ]}
            onPress={() => handlePurchase('lifetime')}
            disabled={purchasing}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planIcon}>👑</Text>
              <Text style={styles.planName}>À Vie</Text>
            </View>
            <View style={styles.planPriceRow}>
              <Text style={[styles.planPrice, { color: '#10b981' }]}>99.99€</Text>
              <Text style={styles.planPeriod}>une fois</Text>
            </View>
            <View style={styles.planFeatures}>
              <Text style={[styles.planFeature, { fontWeight: 'bold' }]}>✓ Accès PERMANENT</Text>
              <Text style={styles.planFeature}>✓ Toutes les mises à jour</Text>
              <Text style={styles.planFeature}>✓ Badge VIP exclusif</Text>
              <Text style={styles.planFeature}>✓ Support à vie</Text>
            </View>
            <View style={[styles.planButton, { backgroundColor: '#10b981' }]}>
              {purchasing && selectedPlan === 'lifetime' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.planButtonText}>🎁 Acheter à vie</Text>
              )}
            </View>
          </TouchableOpacity>

        </View>

        {/* Info paiement */}
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentInfoTitle}>💳 Comment ça marche ?</Text>
          <Text style={styles.paymentInfoText}>
            1. Choisissez votre formule{'\n'}
            2. Vous serez redirigé vers PayPal{'\n'}
            3. Après paiement, confirmez dans l'app{'\n'}
            4. Votre Premium est activé instantanément !
          </Text>
        </View>

        <Text style={styles.secureText}>
          🔒 Paiement sécurisé via PayPal • Annulation facile
        </Text>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 30,
    paddingTop: 20,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    marginTop: 5,
  },
  premiumHeader: {
    padding: 30,
    paddingTop: 20,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  premiumIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  premiumTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  premiumPlanLabel: {
    fontSize: 16,
    color: '#d1fae5',
    marginTop: 8,
    fontWeight: '600',
  },
  expirationBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  expirationText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '600',
  },
  // Plans Container
  plansContainer: {
    padding: 15,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planCardRecommended: {
    borderColor: '#f59e0b',
    borderWidth: 3,
    backgroundColor: '#fffbeb',
  },
  planCardSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    right: 15,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 1,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  planIcon: {
    fontSize: 32,
    marginRight: 10,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  planPeriod: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 5,
  },
  savingsBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  savingsText: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: 'bold',
  },
  planFeatures: {
    marginBottom: 15,
  },
  planFeature: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  planButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  planButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Benefits Section (for premium users)
  benefitsSection: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  benefitDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    color: '#059669',
    fontWeight: 'bold',
  },
  // Payment Info
  paymentInfo: {
    margin: 15,
    padding: 15,
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  paymentInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0369a1',
    marginBottom: 10,
  },
  paymentInfoText: {
    fontSize: 14,
    color: '#0c4a6e',
    lineHeight: 22,
  },
  secureText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 12,
    marginVertical: 15,
  },
  thankYou: {
    textAlign: 'center',
    fontSize: 18,
    color: '#6b7280',
    marginTop: 20,
    marginBottom: 30,
  },
  premiumChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  premiumChatButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  premiumChatButtonContent: {
    flex: 1,
  },
  premiumChatButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  premiumChatButtonDesc: {
    fontSize: 13,
    color: '#e0e7ff',
    marginTop: 2,
  },
  premiumChatButtonArrow: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});
