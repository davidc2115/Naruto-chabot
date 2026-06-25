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
import UserProfileService from '../services/UserProfileService';
import CustomImageAPIService from '../services/CustomImageAPIService';
import StableDiffusionLocalService from '../services/StableDiffusionLocalService';
import SyncService from '../services/SyncService';
import AuthService from '../services/AuthService';
import LlamaService, { LLAMA_MODELS } from '../services/LlamaService';
import * as FileSystem from 'expo-file-system';

// URL du serveur Freebox pour les fonctions admin
const FREEBOX_URL = 'http://82.65.75.176:33437';

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
  
  // Configuration images
  const [imageSource, setImageSource] = useState('freebox');
  const [freeboxUrl, setFreeboxUrl] = useState('http://82.65.75.176:33437/generate');
  
  // SD Local
  const [sdAvailability, setSdAvailability] = useState(null);
  const [sdDownloading, setSdDownloading] = useState(false);
  const [sdDownloadProgress, setSdDownloadProgress] = useState(0);
  
  // Llama Local
  const [llamaAvailability, setLlamaAvailability] = useState(null);
  const [llamaDownloading, setLlamaDownloading] = useState(false);
  const [llamaDownloadProgress, setLlamaDownloadProgress] = useState(0);
  const [llamaActiveModel, setLlamaActiveModel] = useState(null);
  
  // Synchronisation
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [serverStats, setServerStats] = useState(null);

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
      await loadGroqModel(); // Charger le modèle Groq
      await checkLlamaAvailability(); // Vérifier les modèles Llama locaux
      
      // Charger les paramètres sensibles seulement si admin
      if (adminStatus) {
        await loadImageConfig();
        await checkSDAvailability();
      }
      await loadSyncStatus();
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les APIs de texte disponibles v5.3.33
  const loadTextProvider = async () => {
    try {
      // Charger l'API sélectionnée depuis AsyncStorage
      const currentApi = await AsyncStorage.getItem('selected_api');
      setSelectedApi(currentApi || 'pollinations-mistral');
      
      // Charger les clés API
      const veniceKey = await AsyncStorage.getItem('venice_api_key');
      const deepinfraKey = await AsyncStorage.getItem('deepinfra_api_key');
      setVeniceApiKey(veniceKey || '');
      setDeepinfraApiKey(deepinfraKey || '');
      
      // APIs disponibles
      const apis = [
        { id: 'local-llama', name: '📱 Local Llama (Offline)', requiresKey: false, available: true },
        { id: 'pollinations-mistral', name: 'Pollinations Mistral', requiresKey: false, available: true },
        { id: 'pollinations-gpt4', name: 'Pollinations GPT-4', requiresKey: false, available: true },
        { id: 'venice', name: 'Venice AI', requiresKey: true, available: !!veniceKey },
        { id: 'deepinfra', name: 'DeepInfra', requiresKey: true, available: !!deepinfraKey },
        { id: 'groq', name: 'Groq', requiresKey: true, available: groqApiKeys.some(k => k && k.trim()) },
      ];
      setAvailableApis(apis);
      
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
      await AsyncStorage.setItem('selected_api', apiId);
      
      const apiName = availableApis.find(a => a.id === apiId)?.name || apiId;
      Alert.alert('✅ API sélectionnée', apiName);
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  // Sauvegarder une clé API
  const saveApiKey = async (keyName, keyValue) => {
    try {
      await AsyncStorage.setItem(keyName, keyValue);
      
      // Recharger les APIs pour mettre à jour la disponibilité
      await loadTextProvider();
      
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
      // Charger les clés multiples
      const saved = await AsyncStorage.getItem('groq_api_keys');
      if (saved) {
        const keys = JSON.parse(saved);
        if (keys && keys.length > 0) {
          setGroqApiKeys(keys);
          console.log(`🔑 ${keys.length} clé(s) Groq chargée(s)`);
          return;
        }
      }
      
      // Sinon, vérifier si une clé unique existe
      const singleKey = await AsyncStorage.getItem('groq_api_key');
      if (singleKey && singleKey.trim()) {
        setGroqApiKeys([singleKey]);
        console.log('🔑 1 clé Groq chargée (depuis storage)');
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
      // Charger le modèle depuis AsyncStorage
      const model = await AsyncStorage.getItem('groq_model');
      if (model) {
        setGroqModel(model);
      }
      
      // Modèles disponibles (doivent correspondre à GroqService)
      const models = [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Recommandé)' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Rapide)' },
        { id: 'gemma2-9b-it', name: 'Gemma2 9B' },
        { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B' },
        { id: 'mistral-saba-24b', name: 'Mistral Saba 24B' },
      ];
      setAvailableModels(models);
      
      console.log('🤖 Modèles Groq chargés:', models.length);
      console.log('🤖 Modèle actuel:', model);
    } catch (error) {
      console.error('Erreur chargement modèle Groq:', error);
    }
  };

  const saveGroqModel = async (modelId) => {
    try {
      await AsyncStorage.setItem('groq_model', modelId);
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
      const url = CustomImageAPIService.getApiUrl();
      
      setImageSource(strategy || 'freebox');
      if (url) {
        setFreeboxUrl(url);
      }
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

  const checkLlamaAvailability = async () => {
    try {
      const activeModelId = await LlamaService.getStoredActiveModelId();
      setLlamaActiveModel(activeModelId);
      
      const phi35Downloaded = await LlamaService.isModelDownloaded('phi35mini');
      const llama321bDownloaded = await LlamaService.isModelDownloaded('llama321b');
      
      setLlamaAvailability({
        activeModel: activeModelId,
        phi35Downloaded,
        llama321bDownloaded,
        isLoaded: LlamaService.isLoaded,
      });
      
      console.log('📱 Llama availability:', {
        activeModel: activeModelId,
        phi35Downloaded,
        llama321bDownloaded,
        isLoaded: LlamaService.isLoaded,
      });
    } catch (error) {
      console.error('❌ Error checking Llama availability:', error);
      setLlamaAvailability({ error: error.message });
    }
  };

  const downloadLlamaModel = async (modelId) => {
    try {
      setLlamaDownloading(true);
      setLlamaDownloadProgress(0);
      
      const model = LLAMA_MODELS?.[modelId];
      if (!model) {
        throw new Error('Modèle inconnu');
      }
      
      Alert.alert(
        '📥 Téléchargement',
        `Télécharger ${model.name} (${LlamaService.formatBytes(model.size)}) ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Télécharger',
            onPress: async () => {
              try {
                await LlamaService.downloadModel(modelId, (progress, bytesWritten, total) => {
                  setLlamaDownloadProgress(progress * 100);
                });
                
                setLlamaDownloading(false);
                setLlamaDownloadProgress(100);
                
                Alert.alert(
                  '✅ Téléchargement réussi !',
                  `${model.name} téléchargé avec succès.`,
                  [{ text: 'OK', onPress: () => checkLlamaAvailability() }]
                );
              } catch (error) {
                console.error('❌ Erreur téléchargement Llama:', error);
                setLlamaDownloading(false);
                Alert.alert('❌ Erreur', `Téléchargement échoué: ${error.message}`);
              }
            }
          }
        ]
      );
    } catch (error) {
      setLlamaDownloading(false);
      Alert.alert('❌ Erreur', error.message);
    }
  };

  const loadLlamaModel = async (modelId) => {
    try {
      await LlamaService.loadModel(modelId, (msg) => console.log('Llama load:', msg));
      await checkLlamaAvailability();
      Alert.alert('✅ Succès', 'Modèle Llama chargé avec succès !');
    } catch (error) {
      console.error('❌ Erreur chargement Llama:', error);
      Alert.alert('❌ Erreur', `Chargement échoué: ${error.message}`);
    }
  };

  const unloadLlamaModel = async () => {
    try {
      await LlamaService.unloadModel();
      await checkLlamaAvailability();
      Alert.alert('✅ Succès', 'Modèle Llama déchargé.');
    } catch (error) {
      console.error('❌ Erreur déchargement Llama:', error);
      Alert.alert('❌ Erreur', `Déchargement échoué: ${error.message}`);
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
      
      // Sauvegarder aussi la première clé pour compatibilité
      if (validKeys.length > 0) {
        await AsyncStorage.setItem('groq_api_key', validKeys[0]);
      }
      
      // Recharger les APIs pour mettre à jour la disponibilité de Groq
      await loadTextProvider();
      
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
      if (imageSource === 'local') {
        await CustomImageAPIService.saveConfig('', 'local', 'local');
        Alert.alert('✅ Succès', 'Stable Diffusion Local activé ! Téléchargez le modèle pour commencer.');
      } else {
        // Freebox
        if (!freeboxUrl.trim()) {
          Alert.alert('Erreur', 'Veuillez entrer l\'URL de la Freebox.');
          return;
        }
        await CustomImageAPIService.saveConfig(freeboxUrl.trim(), 'freebox', 'freebox');
        Alert.alert('✅ Succès', 'API Freebox configurée !');
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
      Alert.alert('Test en cours', 'Vérification de la connexion...');
      const result = await CustomImageAPIService.testConnection(freeboxUrl.trim());
      
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

        {/* === GÉNÉRATION DE TEXTE - Groq API Multi-Clés === */}
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 Génération de Texte</Text>
        <Text style={styles.sectionDescription}>
          Configurez vos clés API Groq pour la génération de texte.{'\n'}
          Rotation automatique entre les clés pour éviter les limites.
        </Text>

        {/* === GROQ API - MULTI-CLÉS === */}
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
          
          {/* Sélection du modèle Groq */}
          <View style={styles.modelSelectorContainer}>
            <Text style={styles.modelSelectorTitle}>🎯 Modèle Groq:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modelSelectorScroll}>
              {availableModels.map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.modelOption,
                    groqModel === model.id && styles.modelOptionActive
                  ]}
                  onPress={() => saveGroqModel(model.id)}
                >
                  <Text style={[
                    styles.modelOptionText,
                    groqModel === model.id && styles.modelOptionTextActive
                  ]}>
                    {model.name}
                  </Text>
                  {groqModel === model.id && (
                    <Text style={styles.modelOptionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.providerNote}>
          <Text style={styles.providerNoteText}>
            💡 Groq API est gratuit et rapide. Ajoutez plusieurs clés pour éviter les limites.{'\n'}
            Obtenez vos clés sur console.groq.com
          </Text>
        </View>
      </View>

      {/* === GÉNÉRATION DE TEXTE - Llama Local (Offline) === */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Génération Locale (Offline)</Text>
        <Text style={styles.sectionDescription}>
          Téléchargez et utilisez des modèles Llama directement sur votre téléphone.{'\n'}
          100% hors ligne, aucune connexion internet requise.
        </Text>

        {/* Statut Llama */}
        {llamaAvailability && (
          <View style={styles.llamaStatusBox}>
            <Text style={styles.llamaStatusTitle}>📊 Statut des modèles</Text>
            
            <Text style={styles.llamaStatusText}>
              🤖 Modèle actif: {llamaAvailability.activeModel || 'Aucun'}
            </Text>
            
            <Text style={styles.llamaStatusText}>
              📥 Phi-3.5 Mini: {llamaAvailability.phi35Downloaded ? '✅ Téléchargé' : '❌ Non téléchargé'}
            </Text>
            
            <Text style={styles.llamaStatusText}>
              📥 Llama 3.2 1B: {llamaAvailability.llama321bDownloaded ? '✅ Téléchargé' : '❌ Non téléchargé'}
            </Text>
            
            <Text style={styles.llamaStatusText}>
              ⚡ État: {llamaAvailability.isLoaded ? '✅ Chargé en mémoire' : '❌ Non chargé'}
            </Text>
          </View>
        )}

        {/* Barre de progression */}
        {llamaDownloading && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              📥 Téléchargement... {Math.round(llamaDownloadProgress)}%
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${llamaDownloadProgress}%` }]} />
            </View>
          </View>
        )}

        {/* Boutons de téléchargement */}
        <View style={styles.llamaModelButtons}>
          <TouchableOpacity
            style={[
              styles.llamaModelButton,
              llamaAvailability?.phi35Downloaded && styles.llamaModelButtonDownloaded
            ]}
            onPress={() => downloadLlamaModel('phi35mini')}
            disabled={llamaDownloading}
          >
            <Text style={styles.llamaModelButtonText}>
              {llamaAvailability?.phi35Downloaded 
                ? '✅ Phi-3.5 Mini (2.2 GB)' 
                : '📥 Phi-3.5 Mini (2.2 GB)'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.llamaModelButton,
              llamaAvailability?.llama321bDownloaded && styles.llamaModelButtonDownloaded
            ]}
            onPress={() => downloadLlamaModel('llama321b')}
            disabled={llamaDownloading}
          >
            <Text style={styles.llamaModelButtonText}>
              {llamaAvailability?.llama321bDownloaded 
                ? '✅ Llama 3.2 1B (700 MB)' 
                : '📥 Llama 3.2 1B (700 MB)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Boutons de chargement/déchargement */}
        {llamaAvailability && (
          <View style={styles.llamaActionButtons}>
            {llamaAvailability.isLoaded ? (
              <TouchableOpacity
                style={[styles.llamaActionButton, styles.llamaUnloadButton]}
                onPress={unloadLlamaModel}
              >
                <Text style={styles.llamaActionButtonText}>⏹️ Décharger le modèle</Text>
              </TouchableOpacity>
            ) : (
              <>
                {llamaAvailability.phi35Downloaded && (
                  <TouchableOpacity
                    style={styles.llamaActionButton}
                    onPress={() => loadLlamaModel('phi35mini')}
                  >
                    <Text style={styles.llamaActionButtonText}>⚡ Charger Phi-3.5 Mini</Text>
                  </TouchableOpacity>
                )}
                {llamaAvailability.llama321bDownloaded && (
                  <TouchableOpacity
                    style={styles.llamaActionButton}
                    onPress={() => loadLlamaModel('llama321b')}
                  >
                    <Text style={styles.llamaActionButtonText}>⚡ Charger Llama 3.2 1B</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        <View style={styles.providerNote}>
          <Text style={styles.providerNoteText}>
            💡 Phi-3.5 Mini offre la meilleure qualité pour le roleplay.{'\n'}
            Llama 3.2 1B est plus léger et rapide sur les téléphones modestes.{'\n'}
            Une fois chargé, le modèle fonctionne 100% hors ligne.
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
            Choisissez entre Freebox (serveur) ou SD Local (smartphone).
          </Text>

          {/* Option Freebox */}
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
              <Text style={styles.optionTitle}>🏠 Freebox (Recommandé)</Text>
              <Text style={styles.optionDescription}>
                Serveur Stable Diffusion sur Freebox. Rapide et illimité !
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option SD Local */}
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

          {/* Configuration Freebox */}
          {imageSource === 'freebox' && (
            <View style={styles.configBox}>
              <Text style={styles.configTitle}>Configuration Freebox:</Text>
              <TextInput
                style={styles.urlInput}
                placeholder="http://82.65.75.176:33437/generate"
                value={freeboxUrl}
                onChangeText={setFreeboxUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.testButtonSmall} onPress={testFreeboxConnection}>
                <Text style={styles.testButtonSmallText}>🧪 Tester la connexion</Text>
              </TouchableOpacity>
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

      {/* À PROPOS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ À propos</Text>
        <View style={styles.aboutBox}>
          <Text style={styles.aboutText}>Version: 3.7.10</Text>
          <Text style={styles.aboutText}>Application de roleplay conversationnel</Text>
          <Text style={styles.aboutText}>400+ personnages disponibles</Text>
          <Text style={styles.aboutText}>Génération d'images: Freebox (Pollinations multi-modèles)</Text>
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
  // === Styles pour le sélecteur de modèle Groq ===
  modelSelectorContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  modelSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 8,
  },
  modelSelectorScroll: {
    flexDirection: 'row',
  },
  modelOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  modelOptionActive: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  modelOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  modelOptionTextActive: {
    color: '#fff',
  },
  modelOptionCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  // === Styles pour la section Llama Local ===
  llamaStatusBox: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  llamaStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 8,
  },
  llamaStatusText: {
    fontSize: 13,
    color: '#065f46',
    marginBottom: 4,
  },
  llamaModelButtons: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  llamaModelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    alignItems: 'center',
  },
  llamaModelButtonDownloaded: {
    backgroundColor: '#10b981',
  },
  llamaModelButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  llamaActionButtons: {
    marginTop: 15,
    gap: 10,
  },
  llamaActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    alignItems: 'center',
  },
  llamaUnloadButton: {
    backgroundColor: '#ef4444',
  },
  llamaActionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
