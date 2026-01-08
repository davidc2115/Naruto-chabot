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
import * as FileSystem from 'expo-file-system';

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  
  // Clés API Groq
  const [groqApiKeys, setGroqApiKeys] = useState(['']);
  const [testingApi, setTestingApi] = useState(false);
  
  // Configuration images
  const [imageSource, setImageSource] = useState('freebox');
  const [freeboxUrl, setFreeboxUrl] = useState('http://88.174.155.230:33437/generate');
  
  // SD Local
  const [sdAvailability, setSdAvailability] = useState(null);
  const [sdDownloading, setSdDownloading] = useState(false);
  const [sdDownloadProgress, setSdDownloadProgress] = useState(0);

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
      await loadProfile();
      await loadGroqKeys();
      await loadImageConfig();
      await checkSDAvailability();
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoading(false);
    }
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

      {/* CLÉS API GROQ */}
      <View style={styles.section}>
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
      </View>

      {/* GÉNÉRATION D'IMAGES */}
      <View style={styles.section}>
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

            {/* Statut */}
            {sdAvailability && (
              <View style={styles.sdInfoBox}>
                <Text style={styles.sdInfoText}>
                  📱 Module natif: {sdAvailability.available ? '✅ Chargé' : '❌ Non chargé'}
                </Text>
                <Text style={styles.sdInfoText}>
                  📦 Modèle: {sdAvailability.modelDownloaded ? '✅ Téléchargé' : '❌ Non téléchargé'}
                </Text>
                {sdAvailability.modelSizeMB > 0 && (
                  <Text style={styles.sdInfoText}>
                    💾 Taille: {sdAvailability.modelSizeMB.toFixed(1)} MB
                  </Text>
                )}
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

      {/* À PROPOS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ À propos</Text>
        <View style={styles.aboutBox}>
          <Text style={styles.aboutText}>Version: 3.0.7</Text>
          <Text style={styles.aboutText}>Application de roleplay conversationnel</Text>
          <Text style={styles.aboutText}>45 personnages (15 originaux + 30 amies)</Text>
          <Text style={styles.aboutText}>Génération d'images: Freebox + HuggingFace SD</Text>
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
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  sdInfoText: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 5,
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
});
