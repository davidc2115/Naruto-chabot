import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appConfig from '../../app.json';
import UserProfileService from '../services/UserProfileService';
import CustomImageAPIService from '../services/CustomImageAPIService';
import StableDiffusionLocalService from '../services/StableDiffusionLocalService';
import TextGenerationService from '../services/TextGenerationService';
import SyncService from '../services/SyncService';
import AuthService from '../services/AuthService';
import PayPalService from '../services/PayPalService';
import * as FileSystem from 'expo-file-system';

// URL du serveur Freebox pour les fonctions admin
const FREEBOX_URL = 'http://88.174.155.230:33437';

export default function SettingsScreen({ navigation, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // === API de génération de texte v5.3.33 ===
  const [selectedApi, setSelectedApi] = useState('pollinations-mistral');
  const [availableApis, setAvailableApis] = useState([]);
  
  // Clés API optionnelles
  const [veniceApiKey, setVeniceApiKey] = useState('');
  const [deepinfraApiKey, setDeepinfraApiKey] = useState('');
  
  // Anciens états (pour compatibilité)
  const [textProvider, setTextProvider] = useState('pollinations');
  const [textProviders, setTextProviders] = useState([]);
  const [apiMode, setApiMode] = useState('pollinations-mistral');
  const [availableApiModes, setAvailableApiModes] = useState([]);
  
  // Anciens états Groq (pour compatibilité)
  const [groqApiKeys, setGroqApiKeys] = useState(['']);
  const [testingApi, setTestingApi] = useState(false);
  const [groqModel, setGroqModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  
  // Configuration images - v5.4.17: 3 options
  const [imageSource, setImageSource] = useState('pollinations'); // 'pollinations', 'freebox', 'local'
  const [freeboxUrl, setFreeboxUrl] = useState('http://88.174.155.230:33437/generate');
  
  // SD Local
  const [sdAvailability, setSdAvailability] = useState(null);
  const [sdDownloading, setSdDownloading] = useState(false);
  const [sdDownloadProgress, setSdDownloadProgress] = useState(0);
  
  // Synchronisation
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [serverStats, setServerStats] = useState(null);
  
  // v5.4.73 - PayPal avec 3 types de plans
  const [paypalEmail, setPaypalEmail] = useState('');
  const [premiumStatus, setPremiumStatus] = useState({ isPremium: false });
  // Initialiser avec les 3 plans par défaut pour éviter les problèmes d'affichage
  const [premiumPlans, setPremiumPlans] = useState({
    monthly: {
      id: 'premium_monthly',
      name: '📅 Premium Mensuel',
      price: 4.99,
      currency: 'EUR',
      period: 'month',
      features: ['Génération d\'images illimitée', 'Tous les personnages débloqués', 'Pas de publicité', 'Support prioritaire'],
      icon: '📅',
      color: '#3b82f6',
    },
    yearly: {
      id: 'premium_yearly',
      name: '🌟 Premium Annuel',
      price: 39.99,
      currency: 'EUR',
      period: 'year',
      features: ['Tous les avantages mensuels', '2 mois gratuits (33% d\'économie)', 'Accès anticipé aux nouvelles fonctionnalités', 'Personnages exclusifs'],
      icon: '🌟',
      color: '#f59e0b',
      recommended: true,
    },
    lifetime: {
      id: 'premium_lifetime',
      name: '👑 Premium à Vie',
      price: 99.99,
      currency: 'EUR',
      period: 'lifetime',
      features: ['Accès PERMANENT', 'Toutes les futures mises à jour', 'Badge VIP exclusif', 'Support prioritaire à vie'],
      icon: '👑',
      color: '#10b981',
    },
  });

  useEffect(() => {
    loadAllSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
      checkSDAvailability();
    });
    return unsubscribe;
  }, [navigation]);

  const loadAllSettings = async () => {
    try {
      // Vérifier si admin
      const adminStatus = AuthService.isAdmin();
      setIsAdmin(adminStatus);
      console.log('👑 Admin status:', adminStatus);
      
      await loadProfile();
      await loadTextProvider();
      await loadGroqKeys(); // v5.3.63 - Charger les clés Groq
      
      // Charger les paramètres sensibles seulement si admin
      if (adminStatus) {
        await loadImageConfig();
        await checkSDAvailability();
      }
      await loadSyncStatus();
      await loadPayPalConfig();
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // v5.4.73 - Charger la configuration PayPal avec les 3 plans
  const loadPayPalConfig = async () => {
    try {
      const config = await PayPalService.loadConfig();
      setPaypalEmail(config.paypalEmail || '');
      
      // Charger les plans depuis le service (ou garder les valeurs par défaut)
      const servicePlans = PayPalService.getPremiumPlans();
      if (servicePlans && Object.keys(servicePlans).length >= 3) {
        setPremiumPlans(servicePlans);
        console.log('💳 Plans premium chargés:', Object.keys(servicePlans));
      } else {
        console.log('💳 Utilisation des plans par défaut');
      }
      
      const status = await PayPalService.checkPremiumStatus();
      setPremiumStatus(status);
      console.log('💳 Statut premium:', status);
    } catch (error) {
      console.error('Erreur chargement PayPal:', error);
      // Garder les plans par défaut en cas d'erreur
    }
  };
  
  // v5.4.49 - Sauvegarder la configuration PayPal
  const savePayPalConfig = async () => {
    try {
      await PayPalService.saveConfig({ paypalEmail });
      Alert.alert('✅ Succès', 'Configuration PayPal sauvegardée!');
    } catch (error) {
      Alert.alert('❌ Erreur', error.message);
    }
  };
  
  // v5.4.53 - Ouvrir le paiement PayPal avec activation automatique
  const openPayPalPayment = async (planId) => {
    if (!paypalEmail) {
      Alert.alert('⚠️ Configuration requise', 'L\'administrateur doit d\'abord configurer PayPal.');
      return;
    }
    
    // Utiliser le nouveau processus avec activation automatique
    const success = await PayPalService.processPaymentWithAutoActivation(
      planId,
      // Callback de succès - recharger le statut premium
      async (status) => {
        setPremiumStatus(status);
      },
      // Callback d'annulation
      () => {
        console.log('Paiement annulé');
      }
    );
    
    if (success) {
      // Recharger le statut premium
      const newStatus = await PayPalService.checkPremiumStatus();
      setPremiumStatus(newStatus);
    }
  };

  // Charger les APIs de texte disponibles v5.3.33
  const loadTextProvider = async () => {
    try {
      await TextGenerationService.loadConfig();
      
      // Charger les APIs disponibles
      const apis = TextGenerationService.getAvailableApisForUI();
      setAvailableApis(apis);
      
      // Charger l'API sélectionnée
      const currentApi = TextGenerationService.getSelectedApiId();
      setSelectedApi(currentApi || 'pollinations-mistral');
      
      // Charger les clés API
      setVeniceApiKey(TextGenerationService.getApiKey('venice_api_key') || '');
      setDeepinfraApiKey(TextGenerationService.getApiKey('deepinfra_api_key') || '');
      
      // Pour compatibilité
      setApiMode(currentApi || 'pollinations-mistral');
    } catch (error) {
      console.error('Erreur chargement APIs texte:', error);
    }
  };

  // Sélectionner une API de texte
  const selectTextApi = async (apiId) => {
    try {
      // Vérifier si l'API nécessite une clé
      const api = availableApis.find(a => a.id === apiId);
      if (api?.requiresKey && !api.available) {
        Alert.alert(
          '🔑 Clé API requise',
          `${api.name} nécessite une clé API.\n\nConfigurez la clé ci-dessous avant de sélectionner cette API.`
        );
        return;
      }
      
      setSelectedApi(apiId);
      await TextGenerationService.setSelectedApi(apiId);
      
      const apiName = availableApis.find(a => a.id === apiId)?.name || apiId;
      Alert.alert('✅ API sélectionnée', apiName);
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  // Sauvegarder une clé API
  const saveApiKey = async (keyName, keyValue) => {
    try {
      await TextGenerationService.setApiKey(keyName, keyValue);
      
      // Recharger les APIs pour mettre à jour la disponibilité
      const apis = TextGenerationService.getAvailableApisForUI();
      setAvailableApis(apis);
      
      Alert.alert('✅ Clé sauvegardée', 'La clé API a été enregistrée.');
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  // Compatibilité anciennes fonctions
  const saveTextProvider = async (providerId) => {
    await selectTextApi(providerId);
  };

  const saveApiMode = async (mode) => {
    await selectTextApi(mode);
  };

  const loadSyncStatus = async () => {
    try {
      await SyncService.init();
      const status = await SyncService.getSyncStatus();
      setSyncStatus(status);
      
      if (status.serverOnline) {
        const stats = await SyncService.getServerStats();
        setServerStats(stats);
      }
    } catch (error) {
      console.error('Erreur vérification sync:', error);
    }
  };

  const handleSyncUpload = async () => {
    setSyncing(true);
    try {
      await SyncService.init();
      await SyncService.syncUpload();
      await loadSyncStatus();
      Alert.alert('Succès', 'Données synchronisées avec le serveur !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de synchroniser: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncDownload = async () => {
    Alert.alert(
      'Restaurer les données',
      'Cela remplacera vos données locales par celles du serveur. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          onPress: async () => {
            setSyncing(true);
            try {
              await SyncService.init();
              const success = await SyncService.syncDownload();
              if (success) {
                await loadSyncStatus();
                Alert.alert('Succès', 'Données restaurées depuis le serveur !');
              } else {
                Alert.alert('Info', 'Aucune donnée à restaurer sur le serveur.');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de restaurer: ' + error.message);
            } finally {
              setSyncing(false);
            }
          }
        }
      ]
    );
  };

  const loadProfile = async () => {
    try {
      const profile = await UserProfileService.getProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    }
  };

  const loadGroqKeys = async () => {
    try {
      // D'abord charger les clés multiples
      const saved = await AsyncStorage.getItem('groq_api_keys');
      if (saved) {
        const keys = JSON.parse(saved);
        if (keys && keys.length > 0) {
          setGroqApiKeys(keys);
          console.log(`🔑 ${keys.length} clé(s) Groq chargée(s)`);
          return;
        }
      }
      
      // Sinon, vérifier si une clé unique existe dans TextGenerationService
      const singleKey = TextGenerationService.getApiKey('groq_api_key');
      if (singleKey && singleKey.trim()) {
        setGroqApiKeys([singleKey]);
        console.log('🔑 1 clé Groq chargée (depuis service)');
        return;
      }
      
      // Aucune clé trouvée
      setGroqApiKeys(['']);
    } catch (error) {
      console.error('Erreur chargement clés Groq:', error);
      setGroqApiKeys(['']);
    }
  };

  const loadGroqModel = async () => {
    try {
      // Charger la config du service
      await TextGenerationService.loadConfig();
      
      // Récupérer les modèles disponibles
      const models = TextGenerationService.getAvailableGroqModels();
      setAvailableModels(models);
      
      // Récupérer le modèle actuel
      const currentModel = TextGenerationService.getGroqModel();
      setGroqModel(currentModel);
      
      console.log('🤖 Modèles Groq chargés:', models.length);
      console.log('🤖 Modèle actuel:', currentModel);
    } catch (error) {
      console.error('Erreur chargement modèle Groq:', error);
    }
  };

  const saveGroqModel = async (modelId) => {
    try {
      await TextGenerationService.setGroqModel(modelId);
      setGroqModel(modelId);
      Alert.alert('✅ Succès', `Modèle ${modelId} sélectionné !`);
    } catch (error) {
      Alert.alert('❌ Erreur', error.message);
    }
  };

  const loadImageConfig = async () => {
    try {
      await CustomImageAPIService.loadConfig();
      const strategy = CustomImageAPIService.getStrategy();
      const url = CustomImageAPIService.getFreeboxUrl();
      
      // v5.4.17 - Supporter les 3 stratégies
      setImageSource(strategy || 'pollinations');
      if (url) {
        setFreeboxUrl(url);
      }
      console.log(`📸 Config images chargée: ${strategy}, URL: ${url?.substring(0, 40)}...`);
    } catch (error) {
      console.error('Erreur chargement config images:', error);
    }
  };

  const checkSDAvailability = async () => {
    try {
      const availability = await StableDiffusionLocalService.checkAvailability();
      setSdAvailability(availability);
      console.log('📱 SD Local availability:', availability);
    } catch (error) {
      console.error('❌ Error checking SD availability:', error);
      setSdAvailability({ available: false, reason: error.message });
    }
  };

  const saveGroqKeys = async () => {
    try {
      const validKeys = groqApiKeys.filter(key => key && key.trim() !== '');
      
      if (validKeys.length === 0) {
        Alert.alert('Erreur', 'Veuillez ajouter au moins une clé API valide.');
        return;
      }

      // Sauvegarder le tableau de clés
      await AsyncStorage.setItem('groq_api_keys', JSON.stringify(validKeys));
      
      // v5.3.63 - Sauvegarder aussi la première clé pour TextGenerationService
      if (validKeys.length > 0) {
        await TextGenerationService.setApiKey('groq_api_key', validKeys[0]);
        
        // Recharger les APIs pour mettre à jour la disponibilité
        const apis = TextGenerationService.getAvailableApisForUI();
        setAvailableApis(apis);
      }
      
      Alert.alert('✅ Succès', `${validKeys.length} clé(s) API Groq sauvegardée(s) !\n\nVous pouvez maintenant sélectionner Groq dans la liste des APIs.`);
    } catch (error) {
      Alert.alert('❌ Erreur', `Impossible de sauvegarder: ${error.message}`);
    }
  };

  // Partager les clés avec tous les utilisateurs (Admin seulement)
  const shareGroqKeys = async () => {
    try {
      const validKeys = groqApiKeys.filter(key => key && key.trim() !== '');
      
      if (validKeys.length === 0) {
        Alert.alert('Erreur', 'Veuillez ajouter au moins une clé API avant de partager.');
        return;
      }

      Alert.alert(
        '🔗 Partager les clés',
        `Voulez-vous partager ${validKeys.length} clé(s) API Groq avec tous les utilisateurs de l'application ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Partager',
            onPress: async () => {
              try {
                const response = await fetch(`${FREEBOX_URL}/api/shared-keys`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Email': AuthService.getCurrentUser()?.email || ''
                  },
                  body: JSON.stringify({
                    groq: validKeys,
                    groq_model: groqModel
                  })
                });

                const data = await response.json();
                
                if (response.ok && data.success) {
                  Alert.alert(
                    '✅ Clés partagées !',
                    `${validKeys.length} clé(s) Groq sont maintenant disponibles pour tous les utilisateurs.\n\nModèle: ${groqModel}`
                  );
                } else {
                  Alert.alert('❌ Erreur', data.error || 'Impossible de partager les clés');
                }
              } catch (error) {
                Alert.alert('❌ Erreur', `Erreur serveur: ${error.message}`);
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('❌ Erreur', error.message);
    }
  };

  const testGroqKey = async () => {
    const validKeys = groqApiKeys.filter(key => key && key.trim() !== '');
    
    if (validKeys.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter une clé API d\'abord.');
      return;
    }

    setTestingApi(true);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validKeys[0]}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Dis bonjour.' }],
          max_tokens: 50,
        }),
      });

      if (response.ok) {
        Alert.alert('✅ Succès', 'La clé API fonctionne correctement !');
      } else {
        const error = await response.json();
        Alert.alert('❌ Échec', `Erreur: ${error.error?.message || 'Clé invalide'}`);
      }
    } catch (error) {
      Alert.alert('❌ Erreur', `Test échoué: ${error.message}`);
    } finally {
      setTestingApi(false);
    }
  };

  const saveImageConfig = async () => {
    try {
      // v5.4.17 - Support des 3 stratégies
      switch (imageSource) {
        case 'local':
          await CustomImageAPIService.saveConfig('local', null);
          Alert.alert('✅ Succès', 'Stable Diffusion Local activé !\nTéléchargez le modèle pour commencer.');
          break;
          
        case 'freebox':
          if (!freeboxUrl.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer l\'URL du serveur Freebox.');
            return;
          }
          await CustomImageAPIService.saveConfig('freebox', freeboxUrl.trim());
          Alert.alert('✅ Succès', 'Stable Diffusion Freebox configuré !\nURL: ' + freeboxUrl.substring(0, 40) + '...');
          break;
          
        case 'pollinations':
        default:
          await CustomImageAPIService.saveConfig('pollinations', null);
          Alert.alert('✅ Succès', 'Pollinations AI activé !\nGénération cloud avec NSFW activé.');
          break;
      }
    } catch (error) {
      Alert.alert('❌ Erreur', error.message);
    }
  };

  const testFreeboxConnection = async () => {
    if (!freeboxUrl.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une URL.');
      return;
    }

    try {
      Alert.alert('Test en cours', 'Vérification de la connexion au serveur Freebox...');
      const result = await CustomImageAPIService.testFreeboxConnection(freeboxUrl.trim());
      
      if (result.success) {
        Alert.alert('✅ Succès', 'Connexion à la Freebox réussie !');
      } else {
        Alert.alert('❌ Échec', `Impossible de se connecter:\n${result.error}`);
      }
    } catch (error) {
      Alert.alert('❌ Erreur', `Test échoué: ${error.message}`);
    }
  };

  const downloadSDModel = async () => {
    try {
      setSdDownloading(true);
      setSdDownloadProgress(0);
      
      Alert.alert(
        '📥 Téléchargement du modèle SD',
        'Le téléchargement va commencer.\nTaille: ~450 MB\n\n⚠️ Assurez-vous d\'être connecté en WiFi.',
        [
          { text: 'Annuler', style: 'cancel', onPress: () => setSdDownloading(false) },
          {
            text: 'Télécharger',
            onPress: async () => {
              try {
                console.log('📥 Début téléchargement modèle SD...');
                
                // Créer le dossier
                const modelDir = `${FileSystem.documentDirectory}sd_models/`;
                const dirInfo = await FileSystem.getInfoAsync(modelDir);
                if (!dirInfo.exists) {
                  await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
                }
                
                // URL du modèle (placeholder - sera remplacée par le vrai modèle)
                const modelUrl = 'https://huggingface.co/stabilityai/sd-turbo/resolve/main/sd_turbo.safetensors';
                const modelPath = `${modelDir}sd_turbo.safetensors`;
                
                console.log('🌐 Téléchargement depuis:', modelUrl);
                
                const downloadResumable = FileSystem.createDownloadResumable(
                  modelUrl,
                  modelPath,
                  {},
                  (downloadProgress) => {
                    if (downloadProgress.totalBytesExpectedToWrite > 0) {
                      const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
                      setSdDownloadProgress(progress);
                    }
                  }
                );
                
                const result = await downloadResumable.downloadAsync();
                
                if (result && result.uri) {
                  const fileInfo = await FileSystem.getInfoAsync(result.uri);
                  const sizeMB = fileInfo.size / 1024 / 1024;
                  
                  setSdDownloading(false);
                  setSdDownloadProgress(100);
                  
                  Alert.alert(
                    '✅ Téléchargement réussi !',
                    `Modèle téléchargé avec succès.\nTaille: ${sizeMB.toFixed(2)} MB`,
                    [{ text: 'OK', onPress: () => checkSDAvailability() }]
                  );
                }
              } catch (error) {
                console.error('❌ Erreur téléchargement:', error);
                setSdDownloading(false);
                Alert.alert('❌ Erreur', `Téléchargement échoué: ${error.message}`);
              }
            }
          }
        ]
      );
    } catch (error) {
      setSdDownloading(false);
      Alert.alert('❌ Erreur', error.message);
    }
  };

  const addKeyField = () => {
    setGroqApiKeys([...groqApiKeys, '']);
  };

  const removeKeyField = (index) => {
    const newKeys = groqApiKeys.filter((_, i) => i !== index);
    setGroqApiKeys(newKeys.length === 0 ? [''] : newKeys);
  };

  const updateKey = (index, value) => {
    const newKeys = [...groqApiKeys];
    newKeys[index] = value;
    setGroqApiKeys(newKeys);
  };

  // v5.3.72 - Gestion robuste du chargement et des erreurs
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#6366f1', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 40 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={{ marginTop: 10, fontSize: 16, color: '#6b7280' }}>Chargement des paramètres...</Text>
        </View>
      </View>
    );
  }

  // v5.3.72 - Rendu avec try-catch implicite via structure simple
  return (
    <View style={{ flex: 1, backgroundColor: '#6366f1', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <ScrollView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
        <View style={{ padding: 20, paddingTop: 15, backgroundColor: '#6366f1' }}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#fff' }}>⚙️ Paramètres</Text>
        </View>

        {/* PROFIL */}
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Mon Profil</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('UserProfile')}
        >
          {userProfile ? (
            <View>
              <Text style={styles.profileName}>👋 {userProfile.username}</Text>
              <Text style={styles.profileInfo}>
                {userProfile.age} ans • {userProfile.gender === 'male' ? 'Homme' : userProfile.gender === 'female' ? 'Femme' : 'Autre'}
                {userProfile.nsfwMode && userProfile.isAdult && ' • 🔞 Mode NSFW'}
              </Text>
              <Text style={styles.profileAction}>Modifier mon profil →</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.profileCreate}>✨ Créer mon profil</Text>
              <Text style={styles.profileSubtext}>
                Personnalisez vos conversations avec les personnages
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        {/* Chat Premium pour Admin */}
        <TouchableOpacity
          style={styles.premiumChatButton}
          onPress={() => navigation.navigate('PremiumChat')}
        >
          <Text style={styles.premiumChatIcon}>💬</Text>
          <View style={styles.premiumChatContent}>
            <Text style={styles.premiumChatTitle}>Chat Communautaire</Text>
            <Text style={styles.premiumChatDesc}>Discuter avec les membres Premium</Text>
          </View>
          <Text style={styles.premiumChatArrow}>→</Text>
        </TouchableOpacity>
        </View>

        {/* === GÉNÉRATION DE TEXTE v5.3.33 - Multi-API === */}
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 Génération de Texte</Text>
        <Text style={styles.sectionDescription}>
          Sélectionnez l'API pour les réponses des personnages.{'\n'}
          Pas de rotation automatique - vous gardez l'API choisie.
        </Text>

        {/* === APIS GRATUITES (sans clé) === */}
        <View style={styles.apiCategoryBox}>
          <Text style={styles.apiCategoryTitle}>🆓 APIs Gratuites (sans clé)</Text>
          
          {availableApis.filter(api => !api.requiresKey).map((api) => (
            <TouchableOpacity
              key={api.id}
              style={[
                styles.apiModeOption,
                selectedApi === api.id && styles.apiModeOptionActive
              ]}
              onPress={() => selectTextApi(api.id)}
            >
              <View style={styles.radioButtonSmall}>
                {selectedApi === api.id && <View style={styles.radioButtonSmallInner} />}
              </View>
              <View style={styles.apiModeContent}>
                <Text style={[
                  styles.apiModeName,
                  selectedApi === api.id && styles.apiModeNameActive
                ]}>
                  {api.name}
                </Text>
                <Text style={styles.apiModeDescription}>
                  {api.description}
                  {api.uncensored && ' 🔓'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* === APIS AVEC CLÉ (optionnelles) === */}
        <View style={styles.apiKeySection}>
          <Text style={styles.apiKeyTitle}>🔑 APIs avec clé (optionnel)</Text>
          <Text style={styles.apiKeyDesc}>
            Ces APIs offrent des modèles uncensored mais nécessitent une clé gratuite.
          </Text>
          
          {/* Venice AI */}
          <View style={styles.apiKeyInputBox}>
            <Text style={styles.apiKeyLabel}>🔓 Venice AI (uncensored)</Text>
            <Text style={styles.apiKeyHint}>Créez un compte sur venice.ai pour obtenir une clé</Text>
            <TextInput
              style={styles.apiKeyInput}
              value={veniceApiKey}
              onChangeText={setVeniceApiKey}
              placeholder="Entrez votre clé Venice AI..."
              placeholderTextColor="#9ca3af"
              secureTextEntry={true}
            />
            <TouchableOpacity
              style={styles.apiKeySaveButton}
              onPress={() => saveApiKey('venice_api_key', veniceApiKey)}
            >
              <Text style={styles.apiKeySaveText}>Sauvegarder</Text>
            </TouchableOpacity>
          </View>
          
          {/* DeepInfra */}
          <View style={styles.apiKeyInputBox}>
            <Text style={styles.apiKeyLabel}>⚡ DeepInfra (rapide)</Text>
            <Text style={styles.apiKeyHint}>Créez un compte sur deepinfra.com pour obtenir une clé</Text>
            <TextInput
              style={styles.apiKeyInput}
              value={deepinfraApiKey}
              onChangeText={setDeepinfraApiKey}
              placeholder="Entrez votre clé DeepInfra..."
              placeholderTextColor="#9ca3af"
              secureTextEntry={true}
            />
            <TouchableOpacity
              style={styles.apiKeySaveButton}
              onPress={() => saveApiKey('deepinfra_api_key', deepinfraApiKey)}
            >
              <Text style={styles.apiKeySaveText}>Sauvegarder</Text>
            </TouchableOpacity>
          </View>
          
          {/* === GROQ API - MULTI-CLÉS v5.3.63 === */}
          <View style={styles.groqSection}>
            <Text style={styles.groqSectionTitle}>⚡ Groq API (Ultra Rapide)</Text>
            <Text style={styles.apiKeyHint}>
              Créez un compte sur console.groq.com pour obtenir des clés gratuites.{'\n'}
              Ajoutez plusieurs clés pour une rotation automatique.
            </Text>
            
            {/* Liste des clés Groq */}
            {groqApiKeys.map((key, index) => (
              <View key={index} style={styles.keyInputContainer}>
                <TextInput
                  style={styles.keyInput}
                  value={key}
                  onChangeText={(value) => updateKey(index, value)}
                  placeholder={`Clé Groq ${index + 1} (gsk_...)`}
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={true}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {groqApiKeys.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeKeyField(index)}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            
            {/* Bouton ajouter clé */}
            <TouchableOpacity style={styles.addButton} onPress={addKeyField}>
              <Text style={styles.addButtonText}>+ Ajouter une clé Groq</Text>
            </TouchableOpacity>
            
            {/* Boutons d'action */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.testButton, testingApi && { opacity: 0.7 }]}
                onPress={testGroqKey}
                disabled={testingApi}
              >
                <Text style={styles.testButtonText}>
                  {testingApi ? '⏳ Test...' : '🧪 Tester'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveGroqKeys}
              >
                <Text style={styles.saveButtonText}>💾 Sauvegarder</Text>
              </TouchableOpacity>
            </View>
            
            {/* Info clés */}
            <Text style={styles.groqInfoText}>
              💡 {groqApiKeys.filter(k => k && k.trim()).length} clé(s) configurée(s){'\n'}
              🔄 Rotation automatique entre les clés{'\n'}
              ⚡ Llama 70B, 8B et Mixtral disponibles
            </Text>
          </View>
          
          {/* APIs nécessitant clé */}
          {availableApis.filter(api => api.requiresKey).map((api) => (
            <TouchableOpacity
              key={api.id}
              style={[
                styles.apiModeOption,
                selectedApi === api.id && styles.apiModeOptionActive,
                !api.available && styles.apiModeOptionDisabled
              ]}
              onPress={() => selectTextApi(api.id)}
              disabled={!api.available}
            >
              <View style={styles.radioButtonSmall}>
                {selectedApi === api.id && <View style={styles.radioButtonSmallInner} />}
              </View>
              <View style={styles.apiModeContent}>
                <Text style={[
                  styles.apiModeName,
                  selectedApi === api.id && styles.apiModeNameActive,
                  !api.available && styles.apiModeNameDisabled
                ]}>
                  {api.name} {!api.available && '(clé requise)'}
                </Text>
                <Text style={styles.apiModeDescription}>
                  {api.description}
                  {api.uncensored && ' 🔓'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.providerNote}>
          <Text style={styles.providerNoteText}>
            💡 Les APIs Pollinations sont gratuites et ne nécessitent aucune clé.{'\n'}
            🔓 = Mode uncensored (sans restrictions){'\n'}
            En cas d'erreur, l'app bascule automatiquement vers Pollinations Mistral.
          </Text>
        </View>
      </View>

      {/* GÉNÉRATION D'IMAGES - Admin seulement */}
      {isAdmin && (
        <View style={styles.section}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>👑 Admin Only</Text>
          </View>
          <Text style={styles.sectionTitle}>🖼️ Génération d'Images</Text>
          <Text style={styles.sectionDescription}>
            Choisissez votre source de génération d'images.
          </Text>

          {/* Option 1: Pollinations AI (Cloud) */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              imageSource === 'pollinations' && styles.optionCardActive
            ]}
            onPress={() => setImageSource('pollinations')}
          >
            <View style={styles.radioButton}>
              {imageSource === 'pollinations' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>☁️ Pollinations AI (Cloud)</Text>
              <Text style={styles.optionDescription}>
                Génération cloud rapide et gratuite. NSFW activé !
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option 2: Stable Diffusion sur Freebox */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              imageSource === 'freebox' && styles.optionCardActive
            ]}
            onPress={() => setImageSource('freebox')}
          >
            <View style={styles.radioButton}>
              {imageSource === 'freebox' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>🏠 SD Freebox (Serveur)</Text>
              <Text style={styles.optionDescription}>
                Stable Diffusion sur votre serveur Freebox. Privé et illimité !
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option 3: SD Local */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              imageSource === 'local' && styles.optionCardActive
            ]}
            onPress={() => setImageSource('local')}
          >
            <View style={styles.radioButton}>
              {imageSource === 'local' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>📱 SD Local (Smartphone)</Text>
              <Text style={styles.optionDescription}>
                Génération sur téléphone. Offline, 100% privé.
              </Text>
              <Text style={styles.optionWarning}>⚠️ Pipeline en développement</Text>
            </View>
          </TouchableOpacity>

          {/* Configuration Pollinations AI */}
          {imageSource === 'pollinations' && (
            <View style={styles.configBox}>
              <Text style={styles.configTitle}>☁️ Pollinations AI (Cloud)</Text>
              <Text style={styles.optionDescription}>
                Génération automatique via Pollinations AI avec le modèle Flux.
              </Text>
              <Text style={[styles.optionDescription, { color: '#22c55e', marginTop: 8 }]}>
                ✅ Mode NSFW activé (safe=false)
              </Text>
              <Text style={[styles.optionDescription, { color: '#22c55e' }]}>
                ✅ Qualité améliorée (enhance=true)
              </Text>
              <Text style={[styles.optionDescription, { color: '#22c55e' }]}>
                ✅ Modèle Flux pour meilleure qualité
              </Text>
              <Text style={[styles.optionDescription, { color: '#3b82f6', marginTop: 8 }]}>
                ℹ️ Aucune configuration requise
              </Text>
            </View>
          )}

          {/* Configuration Freebox SD */}
          {imageSource === 'freebox' && (
            <View style={styles.configBox}>
              <Text style={styles.configTitle}>🏠 Stable Diffusion Freebox</Text>
              <Text style={styles.optionDescription}>
                Connectez-vous à votre serveur Stable Diffusion sur Freebox.
              </Text>
              <TextInput
                style={styles.urlInput}
                placeholder="http://88.174.155.230:33437/generate"
                value={freeboxUrl}
                onChangeText={setFreeboxUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.testButtonSmall} onPress={testFreeboxConnection}>
                <Text style={styles.testButtonSmallText}>🧪 Tester la connexion</Text>
              </TouchableOpacity>
              <Text style={[styles.optionDescription, { color: '#f59e0b', marginTop: 8, fontSize: 11 }]}>
                ⚠️ Assurez-vous que le serveur SD est démarré sur votre Freebox
              </Text>
            </View>
          )}

          {/* Configuration SD Local */}
          {imageSource === 'local' && (
            <View style={styles.configBox}>
              <Text style={styles.configTitle}>📱 Stable Diffusion Local:</Text>

              {/* Statut détaillé */}
              {sdAvailability && (
                <View style={styles.sdInfoBox}>
                  <Text style={styles.sdInfoTitle}>📊 Statut du module</Text>
                  
                  <Text style={styles.sdInfoText}>
                    📱 Module natif: {sdAvailability.moduleLoaded ? '✅ Chargé' : '❌ Non chargé'}
                    {sdAvailability.moduleVersion && ` (v${sdAvailability.moduleVersion})`}
                  </Text>
                  
                  <Text style={styles.sdInfoText}>
                    🔧 ONNX Runtime: {sdAvailability.onnxAvailable ? '✅ Disponible' : '❌ Non disponible'}
                  </Text>
                  
                  {!sdAvailability.onnxAvailable && (
                    <Text style={[styles.sdInfoText, { color: '#dc2626', fontSize: 11, marginLeft: 20 }]}>
                      ⚠️ La génération locale n'est pas disponible sur cet appareil.
                      {'\n'}   Utilisez la Freebox ou l'API externe pour générer des images.
                    </Text>
                  )}
                  
                  <Text style={styles.sdInfoText}>
                    📦 Modèles: {sdAvailability.modelDownloaded 
                      ? `✅ Prêts (${sdAvailability.modelSizeMB?.toFixed(0) || 0} MB)` 
                      : '📥 À télécharger (~2 GB)'}
                  </Text>
                  
                  {sdAvailability.deviceModel && (
                    <Text style={styles.sdInfoText}>
                      📲 Appareil: {sdAvailability.deviceModel} (Android {sdAvailability.androidVersion})
                    </Text>
                  )}
                  
                  <Text style={styles.sdInfoText}>
                    🧠 RAM Totale: {
                      sdAvailability.totalSystemRamMB > 0 
                        ? (sdAvailability.totalSystemRamMB / 1024).toFixed(2)
                        : sdAvailability.ramMB > 0 
                          ? (sdAvailability.ramMB / 1024).toFixed(2) 
                          : '?'
                    } GB
                    {(sdAvailability.availableSystemRamMB > 0 || sdAvailability.freeRamMB > 0) 
                      ? ` (${((sdAvailability.availableSystemRamMB || sdAvailability.freeRamMB) / 1024).toFixed(2)} GB dispo)` 
                      : ''
                    }
                    {sdAvailability.hasEnoughRAM ? ' ✅' : ' ⚠️'}
                  </Text>
                  
                  {sdAvailability.freeStorageMB > 0 && (
                    <Text style={styles.sdInfoText}>
                      💾 Stockage: {(sdAvailability.freeStorageMB / 1024).toFixed(1)} GB libre
                    </Text>
                  )}
                  
                  <Text style={styles.sdInfoText}>
                    ⚡ Pipeline: {sdAvailability.pipelineReady ? '✅ Prêt' : '⏸️ Non initialisé'}
                  </Text>
                  
                  <View style={[styles.sdStatusBadge, { 
                    backgroundColor: sdAvailability.canRunSD ? '#d1fae5' : '#fef3c7' 
                  }]}>
                    <Text style={[styles.sdStatusText, { 
                      color: sdAvailability.canRunSD ? '#065f46' : '#92400e' 
                    }]}>
                      {sdAvailability.reason || 'Vérification...'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Barre de progression */}
              {sdDownloading && (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    📥 Téléchargement... {Math.round(sdDownloadProgress)}%
                  </Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${sdDownloadProgress}%` }]} />
                  </View>
                </View>
              )}

              {/* Bouton téléchargement */}
              <TouchableOpacity 
                style={[
                  styles.downloadButton, 
                  sdDownloading && styles.downloadButtonDisabled
                ]} 
                onPress={downloadSDModel}
                disabled={sdDownloading}
              >
                <Text style={styles.downloadButtonText}>
                  {sdDownloading 
                    ? '⏳ Téléchargement en cours...' 
                    : sdAvailability?.modelDownloaded
                      ? '🔄 Re-télécharger le modèle'
                      : '📥 Télécharger le modèle (~2.5 GB)'}
                </Text>
              </TouchableOpacity>
              
              {/* Bouton de test du module */}
              <TouchableOpacity
                style={[styles.sdButton, { backgroundColor: '#6366f1', marginTop: 10 }]}
                onPress={async () => {
                  try {
                    Alert.alert('🧪 Test...', 'Test du module natif en cours...');
                    const result = await StableDiffusionLocalService.testModule();
                    console.log('🧪 Résultat test module:', JSON.stringify(result, null, 2));
                    
                    if (result.success) {
                      // Calculer les valeurs à afficher
                      const totalGB = result.totalRamGB || (result.totalRamMB ? result.totalRamMB / 1024 : 0);
                      const availGB = result.availableRamGB || (result.availableRamMB ? result.availableRamMB / 1024 : 0);
                      
                      Alert.alert(
                        '✅ Module OK',
                        `Source: ${result.source || 'N/A'}\n` +
                        `Version: ${result.moduleVersion || 'N/A'}\n` +
                        `\n📊 RAM:\n` +
                        `  • Totale: ${totalGB.toFixed(2)} GB\n` +
                        `  • Disponible: ${availGB.toFixed(2)} GB\n` +
                        (result.totalRamMB ? `  • (${Math.round(result.totalRamMB)} MB / ${Math.round(result.availableRamMB || 0)} MB)\n` : '') +
                        `\n⚡ ONNX: ${result.onnxAvailable ? '✅ Disponible' : '❌ Non disponible'}\n` +
                        `  Status: ${result.onnxStatus || 'N/A'}\n` +
                        `\n📱 Appareil: ${result.device || 'N/A'}\n` +
                        `  Fabricant: ${result.manufacturer || 'N/A'}\n` +
                        `  Android: ${result.androidVersion || 'N/A'}` +
                        (result.hint ? `\n\n💡 ${result.hint}` : '')
                      );
                    } else {
                      // Afficher les détails de l'erreur
                      let errorDetails = `Module trouvé: ${result.moduleExists ? '✅' : '❌'}\n`;
                      errorDetails += `Platform: ${result.platform || 'N/A'} ${result.platformVersion || ''}\n`;
                      errorDetails += `\nErreur: ${result.error || 'Inconnue'}\n`;
                      
                      if (result.hint) {
                        errorDetails += `\n💡 ${result.hint}\n`;
                      }
                      
                      if (result.availableModules && result.availableModules.length > 0) {
                        errorDetails += `\nModules natifs trouvés (${result.availableModules.length}):\n`;
                        errorDetails += result.availableModules.slice(0, 10).join(', ');
                        if (result.availableModules.length > 10) {
                          errorDetails += '...';
                        }
                      }
                      
                      if (result.methodsAvailable && result.methodsAvailable.length > 0) {
                        errorDetails += `\n\nMéthodes du module:\n${result.methodsAvailable.join(', ')}`;
                      }
                      
                      Alert.alert('❌ Erreur Module', errorDetails);
                    }
                    checkSDAvailability();
                  } catch (e) {
                    Alert.alert('❌ Erreur', e.message);
                  }
                }}
              >
                <Text style={styles.sdButtonText}>🧪 Tester le module natif</Text>
              </TouchableOpacity>
              
              <Text style={styles.sdNote}>
                💡 Conseil: Utilisez la Freebox pour l'instant. Le SD Local sera fonctionnel dans une future mise à jour.
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.saveButton} onPress={saveImageConfig}>
            <Text style={styles.saveButtonText}>💾 Sauvegarder la configuration</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* COMPTE - Admin seulement */}
      {isAdmin && (
        <View style={styles.section}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>👑 Admin Only</Text>
          </View>
          <Text style={styles.sectionTitle}>👤 Compte Admin</Text>
          
          <View style={styles.accountBox}>
            <Text style={styles.accountStatus}>
              ✅ Connecté: {AuthService.getCurrentUser()?.email || 'Admin'}
            </Text>
            
            <TouchableOpacity
              style={[styles.accountButton, styles.logoutButton]}
              onPress={() => {
                Alert.alert(
                  'Déconnexion',
                  'Voulez-vous vraiment vous déconnecter ?',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { 
                      text: 'Déconnexion', 
                      style: 'destructive',
                      onPress: async () => {
                        await AuthService.logout();
                        // Appeler le callback pour retourner à l'écran de connexion
                        if (onLogout) {
                          onLogout();
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={styles.accountButtonText}>🚪 Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* SYNCHRONISATION FREEBOX - Admin seulement */}
      {isAdmin && (
        <View style={styles.section}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>👑 Admin Only</Text>
          </View>
          <Text style={styles.sectionTitle}>☁️ Synchronisation Freebox</Text>
          
          <View style={styles.syncStatusBox}>
            <View style={styles.syncStatusRow}>
              <Text style={styles.syncLabel}>Serveur:</Text>
              <Text style={[
                styles.syncValue, 
                { color: syncStatus?.serverOnline ? '#059669' : '#dc2626' }
              ]}>
                {syncStatus?.serverOnline ? '🟢 En ligne' : '🔴 Hors ligne'}
              </Text>
            </View>
            
            {syncStatus?.lastSync && (
              <View style={styles.syncStatusRow}>
                <Text style={styles.syncLabel}>Dernière sync:</Text>
                <Text style={styles.syncValue}>
                  {new Date(syncStatus.lastSync).toLocaleString('fr-FR')}
                </Text>
              </View>
            )}
            
            {serverStats && (
              <View style={styles.syncStatusRow}>
                <Text style={styles.syncLabel}>Personnages publics:</Text>
                <Text style={styles.syncValue}>{serverStats.publicCharacters || 0}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.syncButtons}>
            <TouchableOpacity
              style={[styles.syncButton, styles.syncUploadButton]}
              onPress={handleSyncUpload}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.syncButtonText}>📤 Sauvegarder</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.syncButton, styles.syncDownloadButton]}
              onPress={handleSyncDownload}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.syncButtonText}>📥 Restaurer</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={styles.syncHint}>
            Synchronise tes personnages, conversations et paramètres avec ta Freebox.
            Les personnages publics sont partagés avec la communauté.
          </Text>
        </View>
      )}

      {/* v5.4.73 - PAYPAL & PREMIUM - 3 types d'abonnement */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💳 Premium & Paiement</Text>
        
        {/* Statut Premium - Amélioré */}
        <View style={[
          styles.premiumStatusBox,
          premiumStatus.isPremium && { borderColor: '#10b981', backgroundColor: '#ecfdf5' }
        ]}>
          <Text style={styles.premiumStatusTitle}>
            {premiumStatus.isPremium ? '👑 Compte Premium' : '⭐ Compte Gratuit'}
          </Text>
          
          {premiumStatus.isPremium && (
            <>
              {/* Afficher le type de plan */}
              {premiumStatus.planId && (
                <Text style={styles.premiumPlanType}>
                  {premiumStatus.planId === 'monthly' && '📅 Abonnement Mensuel'}
                  {premiumStatus.planId === 'yearly' && '🌟 Abonnement Annuel'}
                  {premiumStatus.planId === 'lifetime' && '👑 Premium à Vie'}
                </Text>
              )}
              
              {/* Date d'expiration ou Premium à vie */}
              {premiumStatus.expiresAt ? (
                <View style={styles.expirationBox}>
                  <Text style={styles.premiumExpiry}>
                    ⏰ Expire le: {new Date(premiumStatus.expiresAt).toLocaleDateString('fr-FR')}
                  </Text>
                  {premiumStatus.daysRemaining && (
                    <Text style={[
                      styles.daysRemaining,
                      premiumStatus.daysRemaining <= 7 && { color: '#ef4444' }
                    ]}>
                      {premiumStatus.daysRemaining} jour{premiumStatus.daysRemaining > 1 ? 's' : ''} restant{premiumStatus.daysRemaining > 1 ? 's' : ''}
                    </Text>
                  )}
                  {premiumStatus.willExpireSoon && (
                    <Text style={styles.expirationWarning}>
                      ⚠️ Renouveler bientôt pour garder vos avantages !
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.premiumLifetime}>🎉 Premium à vie - Aucune expiration !</Text>
              )}
              
              {/* Date d'activation */}
              {premiumStatus.activatedAt && (
                <Text style={styles.activatedDate}>
                  Activé le: {new Date(premiumStatus.activatedAt).toLocaleDateString('fr-FR')}
                </Text>
              )}
            </>
          )}
          
          {/* Si expiré récemment */}
          {premiumStatus.expired && (
            <Text style={styles.expiredNotice}>
              ❌ Votre abonnement a expiré. Renouvelez pour retrouver vos avantages !
            </Text>
          )}
        </View>
        
        {/* Configuration PayPal (Admin) */}
        {isAdmin && (
          <View style={styles.paypalConfigBox}>
            <Text style={styles.paypalConfigTitle}>⚙️ Configuration PayPal (Admin)</Text>
            <Text style={styles.paypalConfigHint}>
              Email PayPal pour recevoir les paiements
            </Text>
            <TextInput
              style={styles.paypalInput}
              value={paypalEmail}
              onChangeText={setPaypalEmail}
              placeholder="votre-email@paypal.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.paypalSaveButton} onPress={savePayPalConfig}>
              <Text style={styles.paypalSaveButtonText}>💾 Sauvegarder</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* v5.4.73 - Plans Premium - Afficher les 3 plans */}
        {!premiumStatus.isPremium && (
          <View style={styles.premiumPlansBox}>
            <Text style={styles.premiumPlansTitle}>🌟 Passer en Premium</Text>
            <Text style={styles.premiumPlansSubtitle}>
              Choisissez votre formule et débloquez tous les avantages !
            </Text>
            
            {/* v5.4.74 - Afficher explicitement les 3 plans dans l'ordre */}
            {['monthly', 'yearly', 'lifetime'].map((planId) => {
              const plan = premiumPlans[planId];
              if (!plan) {
                console.warn(`⚠️ Plan ${planId} non trouvé dans premiumPlans`);
                return null;
              }
              
              const isRecommended = plan.recommended;
              
              return (
                <TouchableOpacity 
                  key={planId}
                  style={[
                    styles.premiumPlanCard,
                    isRecommended && styles.recommendedPlanCard
                  ]}
                  onPress={() => openPayPalPayment(planId)}
                >
                  {isRecommended && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>⭐ RECOMMANDÉ</Text>
                    </View>
                  )}
                  
                  <View style={styles.premiumPlanHeader}>
                    <View style={styles.planTitleRow}>
                      <Text style={styles.planIcon}>{plan.icon || '💎'}</Text>
                      <Text style={[
                        styles.premiumPlanName,
                        isRecommended && { color: '#f59e0b' }
                      ]}>
                        {plan.name}
                      </Text>
                    </View>
                    <View style={styles.priceBox}>
                      <Text style={styles.premiumPlanPrice}>{plan.price}€</Text>
                      <Text style={styles.pricePeriod}>
                        {plan.period === 'month' && '/mois'}
                        {plan.period === 'year' && '/an'}
                        {plan.period === 'lifetime' && 'une fois'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.premiumPlanFeatures}>
                    {plan.features.map((feature, i) => (
                      <Text key={i} style={styles.premiumPlanFeature}>
                        ✓ {feature}
                      </Text>
                    ))}
                  </View>
                  
                  <View style={[
                    styles.selectPlanButton,
                    { backgroundColor: plan.color || '#6366f1' }
                  ]}>
                    <Text style={styles.selectPlanText}>
                      {plan.period === 'lifetime' ? '🎁 Acheter' : '📲 S\'abonner'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            
            <Text style={styles.premiumNote}>
              💡 Après le paiement sur PayPal, confirmez dans l'app pour activer automatiquement votre Premium !
            </Text>
            
            <Text style={styles.premiumSecurityNote}>
              🔒 Paiement sécurisé via PayPal • Annulation facile
            </Text>
          </View>
        )}
        
        {/* Option de renouvellement pour les premium non-lifetime */}
        {premiumStatus.isPremium && premiumStatus.expiresAt && premiumStatus.willExpireSoon && (
          <View style={styles.renewBox}>
            <Text style={styles.renewTitle}>⚡ Renouveler maintenant</Text>
            <Text style={styles.renewDesc}>
              Votre abonnement expire bientôt. Renouvelez pour ne pas perdre vos avantages !
            </Text>
            <TouchableOpacity 
              style={styles.renewButton}
              onPress={() => openPayPalPayment(premiumStatus.planId || 'monthly')}
            >
              <Text style={styles.renewButtonText}>🔄 Renouveler</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* À PROPOS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ À propos</Text>
        <View style={styles.aboutBox}>
          <Text style={styles.aboutText}>Version: {appConfig.expo.version}</Text>
          <Text style={styles.aboutText}>Build: {appConfig.expo.android.versionCode}</Text>
          <Text style={styles.aboutText}>Application de roleplay conversationnel</Text>
          <Text style={styles.aboutText}>840+ personnages disponibles</Text>
          <Text style={styles.aboutText}>Génération d'images: Freebox + Pollinations</Text>
          <Text style={styles.aboutText}>Synchronisation Freebox + Personnages publics</Text>
          <Text style={styles.aboutText}>Mode NSFW 100% français</Text>
        </View>
      </View>

      {/* FONCTIONNALITÉS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Fonctionnalités</Text>
        <View style={styles.featuresList}>
          <Text style={styles.featureItem}>✓ Multi-clés Groq avec rotation</Text>
          <Text style={styles.featureItem}>✓ Personnalisation des bulles de chat</Text>
          <Text style={styles.featureItem}>✓ Mode NSFW pour adultes</Text>
          <Text style={styles.featureItem}>✓ Génération d'images Freebox illimitée</Text>
          <Text style={styles.featureItem}>✓ Option SD Local sur smartphone</Text>
          <Text style={styles.featureItem}>✓ Galerie d'images par personnage</Text>
          <Text style={styles.featureItem}>✓ Sauvegarde automatique</Text>
        </View>
      </View>

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
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    paddingTop: 15,
    backgroundColor: '#6366f1',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 15,
  },
  infoBox: {
    backgroundColor: '#e0e7ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '600',
    marginBottom: 10,
  },
  infoSteps: {
    fontSize: 13,
    color: '#4f46e5',
    marginLeft: 10,
    marginBottom: 5,
  },
  keyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  keyInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  removeButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  shareButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  shareHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  optionCardActive: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366f1',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  configBox: {
    backgroundColor: '#f0f9ff',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  configTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 10,
  },
  urlInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  testButtonSmall: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  testButtonSmallText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  sdInfoBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sdInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  sdInfoText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  sdStatusBadge: {
    backgroundColor: '#f0f9ff',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  sdStatusText: {
    fontSize: 12,
    color: '#0369a1',
    textAlign: 'center',
  },
  sdInfoWarning: {
    fontSize: 13,
    color: '#dc2626',
    marginTop: 5,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 5,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  downloadButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  downloadButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  optionWarning: {
    fontSize: 11,
    color: '#dc2626',
    marginTop: 4,
    fontStyle: 'italic',
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  warningText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  sdNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  aboutBox: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
  },
  aboutText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  // Styles synchronisation
  syncStatusBox: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  syncStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  syncValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  syncButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  syncButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  syncUploadButton: {
    backgroundColor: '#6366f1',
  },
  syncDownloadButton: {
    backgroundColor: '#10b981',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  syncHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Styles compte
  accountBox: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
  },
  accountStatus: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 15,
    textAlign: 'center',
  },
  accountButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  loginButton: {
    backgroundColor: '#6366f1',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
  },
  accountButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  accountHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
  featuresList: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
  },
  featureItem: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  profileButton: {
    padding: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    marginBottom: 10,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 5,
  },
  profileInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  profileAction: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  profileCreate: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  profileSubtext: {
    fontSize: 13,
    color: '#6b7280',
  },
  // Styles pour le chat premium
  premiumChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
  },
  premiumChatIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  premiumChatContent: {
    flex: 1,
  },
  premiumChatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  premiumChatDesc: {
    fontSize: 13,
    color: '#e0e7ff',
    marginTop: 2,
  },
  premiumChatArrow: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  // Styles pour les limites Groq
  groqLimitsBox: {
    backgroundColor: '#f0fdf4',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  groqLimitsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 12,
  },
  groqLimitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  groqLimitItem: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    width: '48%',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  groqLimitLabel: {
    fontSize: 11,
    color: '#166534',
    marginBottom: 4,
  },
  groqLimitValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#15803d',
  },
  groqLimitSub: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  groqLimitsNote: {
    backgroundColor: '#dcfce7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  groqLimitsNoteText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
    textAlign: 'center',
  },
  groqContextInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  groqContextLabel: {
    fontSize: 12,
    color: '#166534',
  },
  groqContextValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#15803d',
  },
  // Styles pour la sélection du modèle Groq
  modelSection: {
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modelSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 5,
  },
  modelDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 15,
  },
  modelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  modelCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  modelRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modelRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  modelContent: {
    flex: 1,
  },
  modelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  modelDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  // Style badge admin
  adminBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  adminBadgeText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
  },
  // Styles pour le choix de provider de texte
  optionHint: {
    fontSize: 11,
    color: '#10b981',
    marginTop: 4,
    fontStyle: 'italic',
  },
  providerNote: {
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  providerNoteText: {
    fontSize: 12,
    color: '#065f46',
    lineHeight: 18,
  },
  // === Styles pour le sélecteur d'API ===
  apiModeSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  apiModeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  apiModeDesc: {
    fontSize: 12,
    color: '#78350f',
    marginBottom: 12,
    lineHeight: 18,
  },
  apiModeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginVertical: 4,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  apiModeOptionActive: {
    backgroundColor: '#fef08a',
    borderColor: '#f59e0b',
  },
  radioButtonSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#d97706',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioButtonSmallInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f59e0b',
  },
  apiModeContent: {
    flex: 1,
  },
  apiModeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350f',
  },
  apiModeNameActive: {
    color: '#92400e',
  },
  apiModeDescription: {
    fontSize: 11,
    color: '#92400e',
    marginTop: 2,
  },
  apiModeOptionDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    opacity: 0.7,
  },
  apiModeNameDisabled: {
    color: '#9ca3af',
  },
  // === Nouveaux styles pour Multi-API v5.3.33 ===
  apiCategoryBox: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  apiCategoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 12,
  },
  apiKeySection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  apiKeyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  apiKeyDesc: {
    fontSize: 12,
    color: '#78350f',
    marginBottom: 15,
    lineHeight: 18,
  },
  apiKeyInputBox: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  apiKeyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350f',
    marginBottom: 4,
  },
  apiKeyHint: {
    fontSize: 11,
    color: '#92400e',
    marginBottom: 8,
  },
  apiKeyInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1f2937',
  },
  apiKeySaveButton: {
    marginTop: 10,
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  apiKeySaveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // === v5.3.63 - Styles section Groq ===
  groqSection: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  groqSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 8,
  },
  groqInfoText: {
    fontSize: 12,
    color: '#065f46',
    marginTop: 10,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  // === v5.4.49 - Styles PayPal & Premium ===
  premiumStatusBox: {
    backgroundColor: '#fef3c7',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  premiumStatusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400e',
    textAlign: 'center',
  },
  premiumExpiry: {
    fontSize: 13,
    color: '#78350f',
    textAlign: 'center',
    marginTop: 5,
  },
  premiumLifetime: {
    fontSize: 14,
    color: '#059669',
    textAlign: 'center',
    marginTop: 5,
    fontWeight: '600',
  },
  paypalConfigBox: {
    backgroundColor: '#e0f2fe',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  paypalConfigTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0369a1',
    marginBottom: 8,
  },
  paypalConfigHint: {
    fontSize: 12,
    color: '#0c4a6e',
    marginBottom: 10,
  },
  paypalInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
  },
  paypalSaveButton: {
    marginTop: 10,
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  paypalSaveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  premiumPlansBox: {
    backgroundColor: '#f0fdf4',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  premiumPlansTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065f46',
    textAlign: 'center',
    marginBottom: 15,
  },
  premiumPlanCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  premiumPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  premiumPlanName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065f46',
  },
  premiumPlanPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
  },
  premiumPlanFeatures: {
    marginTop: 5,
  },
  premiumPlanFeature: {
    fontSize: 12,
    color: '#047857',
    marginBottom: 3,
  },
  premiumNote: {
    fontSize: 11,
    color: '#065f46',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  // === v5.4.73 - Nouveaux styles Premium ===
  premiumPlanType: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
  expirationBox: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  daysRemaining: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'center',
    marginTop: 5,
  },
  expirationWarning: {
    fontSize: 12,
    color: '#f59e0b',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  activatedDate: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  expiredNotice: {
    fontSize: 13,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '600',
  },
  premiumPlansSubtitle: {
    fontSize: 13,
    color: '#065f46',
    textAlign: 'center',
    marginBottom: 15,
  },
  recommendedPlanCard: {
    borderWidth: 3,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  planIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  pricePeriod: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  selectPlanButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  selectPlanText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  premiumSecurityNote: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  renewBox: {
    backgroundColor: '#fef3c7',
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  renewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    textAlign: 'center',
    marginBottom: 8,
  },
  renewDesc: {
    fontSize: 13,
    color: '#78350f',
    textAlign: 'center',
    marginBottom: 12,
  },
  renewButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  renewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
