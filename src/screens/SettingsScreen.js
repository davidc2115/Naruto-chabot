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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserProfileService from '../services/UserProfileService';
import CustomImageAPIService from '../services/CustomImageAPIService';
import StableDiffusionLocalService from '../services/StableDiffusionLocalService';
import TextGenerationService from '../services/TextGenerationService';
import SyncService from '../services/SyncService';
import AuthService from '../services/AuthService';
import * as FileSystem from 'expo-file-system';

export default function SettingsScreen({ navigation, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Clés API Groq
  const [groqApiKeys, setGroqApiKeys] = useState(['']);
  const [testingApi, setTestingApi] = useState(false);
  
  // Modèle Groq
  const [groqModel, setGroqModel] = useState('llama-3.1-70b-versatile');
  const [availableModels, setAvailableModels] = useState([]);
  
  // Configuration images
  const [imageSource, setImageSource] = useState('freebox');
  const [freeboxUrl, setFreeboxUrl] = useState('http://88.174.155.230:33437/generate');
  
  // SD Local
  const [sdAvailability, setSdAvailability] = useState(null);
  const [sdDownloading, setSdDownloading] = useState(false);
  const [sdDownloadProgress, setSdDownloadProgress] = useState(0);
  
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
      
      // Charger les paramètres sensibles seulement si admin
      if (adminStatus) {
        await loadGroqKeys();
        await loadGroqModel();
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
      const saved = await AsyncStorage.getItem('groq_api_keys');
      if (saved) {
        const keys = JSON.parse(saved);
        setGroqApiKeys(keys.length > 0 ? keys : ['']);
      }
    } catch (error) {
      console.error('Erreur chargement clés Groq:', error);
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

  const saveGroqKeys = async () => {
    try {
      const validKeys = groqApiKeys.filter(key => key && key.trim() !== '');
      
      if (validKeys.length === 0) {
        Alert.alert('Erreur', 'Veuillez ajouter au moins une clé API valide.');
        return;
      }

      await AsyncStorage.setItem('groq_api_keys', JSON.stringify(validKeys));
      Alert.alert('✅ Succès', `${validKeys.length} clé(s) API sauvegardée(s) !`);
    } catch (error) {
      Alert.alert('❌ Erreur', `Impossible de sauvegarder: ${error.message}`);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Chargement des paramètres...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres</Text>
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
      </View>

      {/* CLÉS API GROQ - Admin seulement */}
      {isAdmin && (
        <View style={styles.section}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>👑 Admin Only</Text>
          </View>
          <Text style={styles.sectionTitle}>🔑 Clés API Groq</Text>
          <Text style={styles.sectionDescription}>
            Ajoutez vos clés API Groq pour la génération de texte. Gratuit sur console.groq.com
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>ℹ️ Comment obtenir une clé gratuite:</Text>
            <Text style={styles.infoSteps}>1. Allez sur console.groq.com</Text>
            <Text style={styles.infoSteps}>2. Créez un compte (gratuit)</Text>
            <Text style={styles.infoSteps}>3. Créez une API Key</Text>
            <Text style={styles.infoSteps}>4. Collez-la ci-dessous</Text>
          </View>

          {groqApiKeys.map((key, index) => (
            <View key={index} style={styles.keyInputContainer}>
              <TextInput
                style={styles.keyInput}
                placeholder={`Clé API ${index + 1}`}
                value={key}
                onChangeText={(value) => updateKey(index, value)}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={key.length > 0}
              />
              {groqApiKeys.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeKeyField(index)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={addKeyField}>
            <Text style={styles.addButtonText}>+ Ajouter une clé</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.testButton} 
              onPress={testGroqKey}
              disabled={testingApi}
            >
              {testingApi ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.testButtonText}>🧪 Tester</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={saveGroqKeys}>
              <Text style={styles.saveButtonText}>💾 Sauvegarder</Text>
            </TouchableOpacity>
          </View>

          {/* Limites API Groq */}
          <View style={styles.groqLimitsBox}>
            <Text style={styles.groqLimitsTitle}>📊 Limites API Groq (Free Tier)</Text>
            
            <View style={styles.groqLimitsGrid}>
              <View style={styles.groqLimitItem}>
                <Text style={styles.groqLimitLabel}>🔑 Clés configurées</Text>
                <Text style={styles.groqLimitValue}>
                  {groqApiKeys.filter(k => k && k.trim()).length}
                </Text>
              </View>
              
              <View style={styles.groqLimitItem}>
                <Text style={styles.groqLimitLabel}>⚡ Requêtes/min</Text>
                <Text style={styles.groqLimitValue}>
                  {30 * groqApiKeys.filter(k => k && k.trim()).length}
                </Text>
                <Text style={styles.groqLimitSub}>
                  (30 × {groqApiKeys.filter(k => k && k.trim()).length} clés)
                </Text>
              </View>
              
              <View style={styles.groqLimitItem}>
                <Text style={styles.groqLimitLabel}>📅 Requêtes/jour</Text>
                <Text style={styles.groqLimitValue}>
                  {(14400 * groqApiKeys.filter(k => k && k.trim()).length).toLocaleString('fr-FR')}
                </Text>
                <Text style={styles.groqLimitSub}>
                  (14 400 × {groqApiKeys.filter(k => k && k.trim()).length} clés)
                </Text>
              </View>
              
              <View style={styles.groqLimitItem}>
                <Text style={styles.groqLimitLabel}>📝 Tokens/min</Text>
                <Text style={styles.groqLimitValue}>
                  {(6000 * groqApiKeys.filter(k => k && k.trim()).length).toLocaleString('fr-FR')}
                </Text>
                <Text style={styles.groqLimitSub}>
                  (6 000 × {groqApiKeys.filter(k => k && k.trim()).length} clés)
                </Text>
              </View>
            </View>
            
            <View style={styles.groqLimitsNote}>
              <Text style={styles.groqLimitsNoteText}>
                💡 Ajoutez plus de clés pour augmenter les limites !
                Chaque clé gratuite multiplie vos quotas.
              </Text>
            </View>
            
            {/* Fenêtre de contexte du modèle actuel */}
            <View style={styles.groqContextInfo}>
              <Text style={styles.groqContextLabel}>
                🧠 Fenêtre de contexte ({groqModel.split('-')[0]}):
              </Text>
              <Text style={styles.groqContextValue}>
                {availableModels.find(m => m.id === groqModel)?.contextWindow?.toLocaleString('fr-FR') || '128 000'} tokens
              </Text>
            </View>
          </View>

          {/* Sélection du modèle Groq */}
          <View style={styles.modelSection}>
            <Text style={styles.modelSectionTitle}>🤖 Modèle Groq</Text>
            <Text style={styles.modelDescription}>
              Sélectionnez le modèle IA pour les conversations
            </Text>
            
            {availableModels.map((model) => (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.modelCard,
                  groqModel === model.id && styles.modelCardActive
                ]}
                onPress={() => saveGroqModel(model.id)}
              >
                <View style={styles.modelRadio}>
                  {groqModel === model.id && <View style={styles.modelRadioInner} />}
                </View>
                <View style={styles.modelContent}>
                  <Text style={styles.modelName}>{model.name}</Text>
                  <Text style={styles.modelDesc}>{model.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

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
                placeholder="http://88.174.155.230:33437/generate"
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
              
              {/* Avertissement */}
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Le pipeline ONNX complet n'est pas encore implémenté.
                  Vous pouvez télécharger le modèle pour préparer l'utilisation future.
                  En attendant, la Freebox sera utilisée comme fallback.
                </Text>
              </View>

              {/* Statut détaillé */}
              {sdAvailability && (
                <View style={styles.sdInfoBox}>
                  <Text style={styles.sdInfoTitle}>📊 Statut du module</Text>
                  
                  <Text style={styles.sdInfoText}>
                    📱 Module natif: {sdAvailability.moduleLoaded ? '✅ Chargé' : '❌ Non chargé'}
                    {sdAvailability.moduleVersion && ` (v${sdAvailability.moduleVersion})`}
                  </Text>
                  
                  <Text style={styles.sdInfoText}>
                    📦 Modèle: {sdAvailability.modelDownloaded ? '✅ Téléchargé' : '❌ Non téléchargé'}
                    {sdAvailability.modelSizeMB > 0 && ` (${typeof sdAvailability.modelSizeMB === 'number' ? sdAvailability.modelSizeMB.toFixed(0) : sdAvailability.modelSizeMB} MB)`}
                  </Text>
                  
                  {sdAvailability.deviceModel && (
                    <Text style={styles.sdInfoText}>
                      📲 Appareil: {sdAvailability.deviceModel} (Android {sdAvailability.androidVersion})
                    </Text>
                  )}
                  
                  {sdAvailability.ramMB > 0 && (
                    <Text style={styles.sdInfoText}>
                      🧠 RAM: {sdAvailability.ramMB.toFixed(0)} MB max
                      {sdAvailability.canRunSD ? ' ✅' : ' ⚠️'}
                    </Text>
                  )}
                  
                  {sdAvailability.freeStorageMB > 0 && (
                    <Text style={styles.sdInfoText}>
                      💾 Stockage libre: {(sdAvailability.freeStorageMB / 1024).toFixed(1)} GB
                    </Text>
                  )}
                  
                  <View style={styles.sdStatusBadge}>
                    <Text style={styles.sdStatusText}>
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
          <Text style={styles.aboutText}>Version: 3.7.6</Text>
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
  );
}

const styles = StyleSheet.create({
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
    paddingTop: 60,
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
});
