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
import GroqService from '../services/GroqService';
import TextGenerationService from '../services/TextGenerationService';
import UserProfileService from '../services/UserProfileService';
import CustomImageAPIService from '../services/CustomImageAPIService';
import StableDiffusionLocalService from '../services/StableDiffusionLocalService';
import * as FileSystem from 'expo-file-system';

export default function SettingsScreen({ navigation }) {
  const [apiKeys, setApiKeys] = useState(['']);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [customImageApi, setCustomImageApi] = useState('');
  const [useCustomImageApi, setUseCustomImageApi] = useState(false);
  const [imageStrategy, setImageStrategy] = useState('freebox-first');
  
  // Configuration multi-providers pour génération de texte
  const [textProvider, setTextProvider] = useState('groq');
  const [availableProviders, setAvailableProviders] = useState([]);
  const [providerApiKeys, setProviderApiKeys] = useState({
    groq: [''],
    openrouter: [''],
    kobold: [],
    ollama: [],
  });
  const [testingProvider, setTestingProvider] = useState(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // Stable Diffusion Local
  const [sdAvailability, setSdAvailability] = useState(null);
  const [sdDownloading, setSdDownloading] = useState(false);
  const [sdDownloadProgress, setSdDownloadProgress] = useState(0);

  useEffect(() => {
    loadSettings();
    loadProfile();
    loadImageApiConfig();
    loadTextGenerationConfig();
    checkSDAvailability();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
    });
    return unsubscribe;
  }, [navigation]);

  const loadSettings = async () => {
    await GroqService.loadApiKeys();
    if (GroqService.apiKeys.length > 0) {
      setApiKeys(GroqService.apiKeys);
    }
    setLoading(false);
  };

  const loadProfile = async () => {
    const profile = await UserProfileService.getProfile();
    setUserProfile(profile);
  };

  const loadImageApiConfig = async () => {
    await CustomImageAPIService.loadConfig();
    const hasApi = CustomImageAPIService.hasCustomApi();
    const strategy = CustomImageAPIService.getStrategy();
    
    setUseCustomImageApi(hasApi);
    setImageStrategy(strategy);
    
    if (hasApi) {
      setCustomImageApi(CustomImageAPIService.getApiUrl());
    } else {
      // URL Freebox par défaut
      setCustomImageApi('http://88.174.155.230:33437/generate');
    }
  };

  const loadTextGenerationConfig = async () => {
    try {
      await TextGenerationService.loadConfig();
      const providers = TextGenerationService.getAvailableProviders();
      const currentProvider = TextGenerationService.getCurrentProvider();
      
      setAvailableProviders(providers);
      setTextProvider(currentProvider || 'groq');
      
      // Charger les clés pour tous les providers qui en nécessitent
      const newProviderKeys = {
        groq: [''],
        openrouter: [''],
        kobold: [],
        ollama: [],
      };
      
      providers.forEach(provider => {
        if (provider.requiresApiKey) {
          const keys = TextGenerationService.apiKeys?.[provider.id] || [];
          newProviderKeys[provider.id] = keys.length > 0 ? [...keys] : [''];
        }
      });
      
      setProviderApiKeys(newProviderKeys);
      setSettingsLoaded(true);
      
      console.log('✅ Config providers chargée:', currentProvider);
      console.log('📋 Clés chargées pour:', Object.keys(newProviderKeys));
    } catch (error) {
      console.error('Erreur chargement config text generation:', error);
      // En cas d'erreur, initialiser avec les valeurs par défaut
      setProviderApiKeys({
        groq: [''],
        openrouter: [''],
        kobold: [],
        ollama: [],
      });
      setSettingsLoaded(true);
    }
  };

  const addKeyField = () => {
    setApiKeys([...apiKeys, '']);
  };

  const removeKeyField = (index) => {
    const newKeys = apiKeys.filter((_, i) => i !== index);
    setApiKeys(newKeys.length === 0 ? [''] : newKeys);
  };

  const updateKey = (index, value) => {
    const newKeys = [...apiKeys];
    newKeys[index] = value;
    setApiKeys(newKeys);
  };

  const saveSettings = async () => {
    const validKeys = apiKeys.filter(key => key.trim() !== '');
    
    if (validKeys.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins une clé API valide.');
      return;
    }

    await GroqService.saveApiKeys(validKeys);
    Alert.alert('Succès', `${validKeys.length} clé(s) API sauvegardée(s) avec succès!`);
  };

  const testKeys = async () => {
    const validKeys = apiKeys.filter(key => key.trim() !== '');
    
    if (validKeys.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins une clé API valide.');
      return;
    }

    await GroqService.saveApiKeys(validKeys);
    
    try {
      const testMessage = [
        { role: 'user', content: 'Dis bonjour en une phrase.' }
      ];
      
      const testCharacter = {
        name: 'Test',
        appearance: 'Test',
        personality: 'Test',
        temperament: 'direct',
        age: 25,
        scenario: 'Test'
      };

      await GroqService.generateResponse(testMessage, testCharacter);
      Alert.alert('Succès', 'Les clés API fonctionnent correctement!');
    } catch (error) {
      Alert.alert('Erreur', `Échec du test: ${error.message}`);
    }
  };

  const saveImageApiConfig = async () => {
    // Validation selon la stratégie
    if ((imageStrategy === 'freebox-only' || imageStrategy === 'freebox-first') && customImageApi.trim() === '') {
      Alert.alert('Erreur', 'Veuillez entrer une URL d\'API Freebox valide pour cette stratégie.');
      return;
    }

    try {
      if (imageStrategy === 'local') {
        // SD Local sur smartphone
        await CustomImageAPIService.saveConfig('', 'local', 'local');
        Alert.alert('✅ Succès', 'Stable Diffusion Local activé ! Téléchargez le modèle (450 MB) pour commencer.');
      } else if (imageStrategy === 'pollinations-only') {
        // Pollinations uniquement: pas besoin d'URL custom
        await CustomImageAPIService.clearConfig();
        // Mais sauvegarder la stratégie
        await CustomImageAPIService.saveConfig('', 'pollinations', 'pollinations-only');
        Alert.alert('✅ Succès', 'Pollinations.ai configuré comme source unique.');
      } else {
        // Freebox configuré
        await CustomImageAPIService.saveConfig(customImageApi.trim(), 'freebox', imageStrategy);
        
        let message = '';
        if (imageStrategy === 'freebox-only') {
          message = 'API Freebox configurée comme source unique.';
        } else if (imageStrategy === 'freebox-first') {
          message = 'API Freebox configurée avec Pollinations en fallback.';
        }
        
        Alert.alert('✅ Succès', message);
      }
      
      await loadImageApiConfig();
    } catch (error) {
      Alert.alert('❌ Erreur', `Impossible de sauvegarder: ${error.message}`);
    }
  };

  const testImageApi = async () => {
    if (customImageApi.trim() === '') {
      Alert.alert('Erreur', 'Veuillez entrer une URL d\'API.');
      return;
    }

    try {
      Alert.alert('Test en cours', 'Vérification de la connexion...');
      const result = await CustomImageAPIService.testConnection(customImageApi.trim());
      
      if (result.success) {
        Alert.alert('✅ Succès', 'Connexion à l\'API réussie !');
      } else {
        Alert.alert('❌ Échec', `Impossible de se connecter:\n${result.error}`);
      }
    } catch (error) {
      Alert.alert('❌ Erreur', `Test échoué: ${error.message}`);
    }
  };

  const checkSDAvailability = async () => {
    try {
      const availability = await StableDiffusionLocalService.checkAvailability();
      setSdAvailability(availability);
      console.log('📱 SD Local availability:', availability);
    } catch (error) {
      console.error('❌ Error checking SD availability:', error);
    }
  };

  const downloadSDModel = async () => {
    try {
      setSdDownloading(true);
      setSdDownloadProgress(0);
      
      Alert.alert(
        '📥 Téléchargement du modèle SD',
        'Le téléchargement va commencer. Taille: ~450 MB\n\n⚠️ Assurez-vous d\'être connecté en WiFi.\n\nDurée estimée: 5-15 minutes',
        [
          { text: 'Annuler', style: 'cancel', onPress: () => setSdDownloading(false) },
          {
            text: 'Télécharger',
            onPress: async () => {
              try {
                console.log('📥 Début téléchargement modèle SD...');
                
                // URL du modèle - Utilisation d'une image de test pour validation
                // TODO: Remplacer par le vrai modèle SD quand prêt
                const modelUrl = 'https://raw.githubusercontent.com/onnx/models/main/README.md';
                const modelPath = `${FileSystem.documentDirectory}sd_models/sd_turbo_test.onnx`;
                
                // Créer le dossier si nécessaire
                const modelDir = `${FileSystem.documentDirectory}sd_models/`;
                const dirInfo = await FileSystem.getInfoAsync(modelDir);
                if (!dirInfo.exists) {
                  console.log('📁 Création dossier:', modelDir);
                  await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
                }
                
                console.log('🌐 URL:', modelUrl);
                console.log('📂 Destination:', modelPath);
                
                Alert.alert(
                  '⚠️ Mode Test',
                  'Pour validation, un fichier de test sera téléchargé.\n\nLe modèle SD complet (1.7 GB) sera ajouté dans une prochaine version.\n\nContinuer ?',
                  [
                    { text: 'Annuler', style: 'cancel', onPress: () => { setSdDownloading(false); return; } },
                    { 
                      text: 'OK', 
                      onPress: async () => {
                        try {
                          // Téléchargement avec progress
                          const downloadResumable = FileSystem.createDownloadResumable(
                            modelUrl,
                            modelPath,
                            {},
                            (downloadProgress) => {
                              if (downloadProgress.totalBytesExpectedToWrite > 0) {
                                const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
                                setSdDownloadProgress(progress);
                                console.log(`📥 Progress: ${Math.round(progress)}% (${downloadProgress.totalBytesWritten}/${downloadProgress.totalBytesExpectedToWrite} bytes)`);
                              } else {
                                console.log(`📥 Téléchargé: ${downloadProgress.totalBytesWritten} bytes...`);
                              }
                            }
                          );
                          
                          const result = await downloadResumable.downloadAsync();
                
                          if (result && result.uri) {
                            console.log('✅ Téléchargement terminé:', result.uri);
                            
                            // Vérifier la taille du fichier
                            const fileInfo = await FileSystem.getInfoAsync(result.uri);
                            const sizeMB = fileInfo.size / 1024 / 1024;
                            console.log('📊 Taille fichier:', sizeMB.toFixed(2), 'MB');
                            
                            setSdDownloading(false);
                            setSdDownloadProgress(100);
                            
                            if (fileInfo.size === 0) {
                              Alert.alert(
                                '⚠️ Fichier vide',
                                `Le téléchargement s'est terminé mais le fichier est vide (0 MB).\n\n` +
                                `Causes possibles:\n` +
                                `- URL incorrecte\n` +
                                `- Serveur inaccessible\n` +
                                `- Problème de connexion\n\n` +
                                `Le modèle SD complet sera disponible dans une prochaine version.`
                              );
                            } else {
                              Alert.alert(
                                '✅ Téléchargement réussi !',
                                `Fichier téléchargé avec succès.\n\nTaille: ${sizeMB.toFixed(2)} MB\n\n` +
                                `📋 Note: C'est un fichier de test.\nLe vrai modèle SD-Turbo (1.7 GB) sera ajouté prochainement.`,
                                [
                                  { 
                                    text: 'OK', 
                                    onPress: () => {
                                      checkSDAvailability();
                                    } 
                                  }
                                ]
                              );
                            }
                          } else {
                            throw new Error('Téléchargement échoué: pas de résultat');
                          }
                        } catch (innerError) {
                          console.error('❌ Erreur téléchargement inner:', innerError);
                          setSdDownloading(false);
                          setSdDownloadProgress(0);
                          
                          Alert.alert(
                            '❌ Téléchargement échoué',
                            `Erreur: ${innerError.message}\n\n` +
                            `Réessayez plus tard.`
                          );
                        }
                      }
                    }
                  ]
                );
                return; // Exit early after showing alert
              } catch (error) {
                console.error('❌ Erreur init:', error);
                setSdDownloading(false);
                Alert.alert('❌ Erreur', error.message);
              }
              return; // Exit to avoid outer catch
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Erreur init download:', error);
      Alert.alert('❌ Erreur', error.message);
      setSdDownloading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres</Text>
      </View>

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
        {!userProfile && (
          <Text style={styles.profileHint}>
            ℹ️ Un profil permet aux personnages de mieux vous connaître et d'adapter leurs réponses à vous !
          </Text>
        )}
      </View>

      {/* NOUVELLE SECTION: Sélecteur de Provider de Génération de Texte */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 Moteur de Génération de Texte</Text>
        <Text style={styles.sectionDescription}>
          Choisissez le service d'IA pour générer les réponses des personnages. 
          Testez plusieurs providers pour trouver le meilleur pour vos conversations.
        </Text>

        <View style={styles.providerContainer}>
          {availableProviders.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              style={[
                styles.providerOption,
                textProvider === provider.id && styles.providerOptionSelected,
              ]}
              onPress={async () => {
                setTextProvider(provider.id);
                await TextGenerationService.setProvider(provider.id);
                Alert.alert('✅ Provider changé', `${provider.name} activé`);
              }}
            >
              <View style={styles.providerHeader}>
                <View style={styles.providerRadio}>
                  {textProvider === provider.id && <View style={styles.providerRadioSelected} />}
                </View>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  {provider.uncensored && (
                    <Text style={styles.providerBadge}>🔞 UNCENSORED</Text>
                  )}
                  {provider.id === 'kobold' && (
                    <Text style={styles.providerBadgeFree}>💚 GRATUIT</Text>
                  )}
                  {provider.id === 'ollama' && (
                    <Text style={styles.providerBadgeFreebox}>🏠 FREEBOX LOCAL</Text>
                  )}
                </View>
              </View>
              <Text style={styles.providerDescription}>{provider.description}</Text>
              
              {provider.requiresApiKey && (
                <View style={styles.providerKeyInfo}>
                  <Text style={styles.providerKeyText}>
                    {TextGenerationService.hasApiKeys(provider.id) 
                      ? '✅ Clés configurées' 
                      : '⚠️ Clés API requises (voir ci-dessous)'}
                  </Text>
                </View>
              )}
              
              {provider.requiresApiKey && (
                <TouchableOpacity
                  style={styles.providerTestButton}
                  onPress={async () => {
                    if (!TextGenerationService.hasApiKeys(provider.id)) {
                      Alert.alert('❌ Erreur', `Veuillez d'abord configurer les clés API pour ${provider.name}`);
                      return;
                    }
                    
                    setTestingProvider(provider.id);
                    try {
                      const result = await TextGenerationService.testProvider(provider.id);
                      if (result.success) {
                        Alert.alert('✅ Succès', `${provider.name} fonctionne correctement!`);
                      } else {
                        Alert.alert('❌ Échec', `Test échoué:\n${result.error}`);
                      }
                    } catch (error) {
                      Alert.alert('❌ Erreur', error.message);
                    } finally {
                      setTestingProvider(null);
                    }
                  }}
                  disabled={testingProvider === provider.id}
                >
                  {testingProvider === provider.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.providerTestButtonText}>🧪 Tester</Text>
                  )}
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Section Clés API pour chaque provider */}
      {textProvider !== 'kobold' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🔑 Clés API - {availableProviders.find(p => p.id === textProvider)?.name}
          </Text>
          <Text style={styles.sectionDescription}>
            Ajoutez vos clés API pour {availableProviders.find(p => p.id === textProvider)?.name}. 
            Vous pouvez ajouter plusieurs clés pour une rotation automatique.
          </Text>

          {textProvider === 'groq' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>ℹ️ Obtenir une clé API gratuite:</Text>
              <Text style={styles.infoSteps}>1. Visitez console.groq.com</Text>
              <Text style={styles.infoSteps}>2. Créez un compte gratuit</Text>
              <Text style={styles.infoSteps}>3. Générez une clé API</Text>
              <Text style={styles.infoSteps}>4. Collez-la ci-dessous</Text>
            </View>
          )}
          
          {(providerApiKeys[textProvider] || ['']).map((key, index) => (
            <View key={index} style={styles.keyInputContainer}>
              <TextInput
                style={styles.keyInput}
                placeholder={`Clé API ${index + 1}`}
                value={key || ''}
                onChangeText={(value) => {
                  const newKeys = { ...providerApiKeys };
                  if (!newKeys[textProvider]) {
                    newKeys[textProvider] = [''];
                  }
                  newKeys[textProvider][index] = value;
                  setProviderApiKeys(newKeys);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={key && key.length > 0}
              />
              {(providerApiKeys[textProvider] || []).length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => {
                    const newKeys = { ...providerApiKeys };
                    if (!newKeys[textProvider]) {
                      newKeys[textProvider] = [''];
                      setProviderApiKeys(newKeys);
                      return;
                    }
                    newKeys[textProvider] = newKeys[textProvider].filter((_, i) => i !== index);
                    if (newKeys[textProvider].length === 0) newKeys[textProvider] = [''];
                    setProviderApiKeys(newKeys);
                  }}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => {
              const newKeys = { ...providerApiKeys };
              if (!newKeys[textProvider]) {
                newKeys[textProvider] = [];
              }
              newKeys[textProvider] = [...newKeys[textProvider], ''];
              setProviderApiKeys(newKeys);
            }}
          >
            <Text style={styles.addButtonText}>+ Ajouter une clé</Text>
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={async () => {
                const currentKeys = providerApiKeys[textProvider] || [];
                const validKeys = currentKeys.filter(key => key && key.trim() !== '');
                
                if (validKeys.length === 0) {
                  Alert.alert('Erreur', 'Veuillez ajouter au moins une clé API valide.');
                  return;
                }

                try {
                  await TextGenerationService.saveApiKeys(textProvider, validKeys);
                  Alert.alert('✅ Succès', `${validKeys.length} clé(s) API ${textProvider.toUpperCase()} sauvegardée(s)!`);
                  await loadTextGenerationConfig(); // Recharger la config
                } catch (error) {
                  Alert.alert('❌ Erreur', `Impossible de sauvegarder: ${error.message}`);
                }
              }}
            >
              <Text style={styles.saveButtonText}>💾 Sauvegarder les clés</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ANCIENNE SECTION GROQ - Gardée pour compatibilité mais masquée */}
      <View style={[styles.section, { display: 'none' }]}>
        <Text style={styles.sectionTitle}>🔑 Clés API Groq</Text>
        <Text style={styles.sectionDescription}>
          Ajoutez vos clés API Groq pour activer la génération de texte. Plus vous ajoutez de clés,
          plus vous aurez de capacité de génération grâce à la rotation automatique.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ Obtenir une clé API gratuite:
          </Text>
          <Text style={styles.infoSteps}>
            1. Visitez console.groq.com
          </Text>
          <Text style={styles.infoSteps}>
            2. Créez un compte gratuit
          </Text>
          <Text style={styles.infoSteps}>
            3. Générez une clé API
          </Text>
          <Text style={styles.infoSteps}>
            4. Collez-la ci-dessous
          </Text>
        </View>

        {apiKeys.map((key, index) => (
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
            {apiKeys.length > 1 && (
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

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.testButton} onPress={testKeys}>
            <Text style={styles.testButtonText}>🧪 Tester</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
            <Text style={styles.saveButtonText}>💾 Sauvegarder</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🖼️ API de Génération d'Images</Text>
        <Text style={styles.sectionDescription}>
          Choisissez la source pour générer les images de personnages et de scènes.
        </Text>

        {/* Stratégies de génération */}
        <View style={styles.strategyContainer}>
          <Text style={styles.strategyTitle}>📍 Source de génération:</Text>
          
          {/* Option 0: SD Local sur Smartphone (NOUVEAU) */}
          <TouchableOpacity
            style={[
              styles.strategyOption,
              imageStrategy === 'local' && styles.strategyOptionActive
            ]}
            onPress={() => setImageStrategy('local')}
          >
            <View style={styles.radioButton}>
              {imageStrategy === 'local' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.strategyContent}>
              <Text style={styles.strategyName}>📱 Local Smartphone (NOUVEAU) 🚀</Text>
              <Text style={styles.strategyDescription}>
                Stable Diffusion sur votre téléphone. Illimité, privé, offline ! (450 MB)
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* Option 1: Freebox + Pollinations (RECOMMANDÉ) */}
          <TouchableOpacity
            style={[
              styles.strategyOption,
              imageStrategy === 'freebox-first' && styles.strategyOptionActive
            ]}
            onPress={() => setImageStrategy('freebox-first')}
          >
            <View style={styles.radioButton}>
              {imageStrategy === 'freebox-first' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.strategyContent}>
              <Text style={styles.strategyName}>🏠 Freebox en premier (Recommandé)</Text>
              <Text style={styles.strategyDescription}>
                Essaie Freebox, puis Pollinations si échec. Meilleur des deux mondes !
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option 2: Freebox uniquement */}
          <TouchableOpacity
            style={[
              styles.strategyOption,
              imageStrategy === 'freebox-only' && styles.strategyOptionActive
            ]}
            onPress={() => setImageStrategy('freebox-only')}
          >
            <View style={styles.radioButton}>
              {imageStrategy === 'freebox-only' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.strategyContent}>
              <Text style={styles.strategyName}>🏠 Freebox uniquement</Text>
              <Text style={styles.strategyDescription}>
                Uniquement API Freebox. Illimité mais nécessite que le serveur soit accessible.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option 3: Pollinations uniquement */}
          <TouchableOpacity
            style={[
              styles.strategyOption,
              imageStrategy === 'pollinations-only' && styles.strategyOptionActive
            ]}
            onPress={() => setImageStrategy('pollinations-only')}
          >
            <View style={styles.radioButton}>
              {imageStrategy === 'pollinations-only' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.strategyContent}>
              <Text style={styles.strategyName}>🌐 Pollinations uniquement</Text>
              <Text style={styles.strategyDescription}>
                Uniquement Pollinations.ai. Gratuit mais avec quotas.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Configuration URL Freebox (si nécessaire) */}
        {(imageStrategy === 'freebox-only' || imageStrategy === 'freebox-first') && (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Configuration API Freebox:
              </Text>
              <Text style={styles.infoSteps}>
                IP: 88.174.155.230
              </Text>
              <Text style={styles.infoSteps}>
                Port: 33437
              </Text>
              <Text style={styles.infoSteps}>
                Status: {/* On pourrait ajouter un indicateur de status */}✅ En ligne
              </Text>
            </View>

            <TextInput
              style={styles.keyInput}
              placeholder="URL de l'API Freebox"
              value={customImageApi}
              onChangeText={setCustomImageApi}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity style={styles.testButton} onPress={testImageApi}>
              <Text style={styles.testButtonText}>🧪 Tester la connexion Freebox</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Info SD Local */}
        {imageStrategy === 'local' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📱 Stable Diffusion Local
            </Text>
            <Text style={styles.infoSteps}>
              ✅ Génération ILLIMITÉE sur votre téléphone
            </Text>
            <Text style={styles.infoSteps}>
              🔒 100% PRIVÉ - Aucune donnée envoyée
            </Text>
            <Text style={styles.infoSteps}>
              ⚡ Optimisé 8 GB RAM (15-30 sec/image)
            </Text>
            <Text style={styles.infoSteps}>
              📦 Modèle: SD-Turbo ONNX (450 MB)
            </Text>
            <Text style={styles.infoSteps}>
              🎨 Qualité: Hyper-réaliste + Anime
            </Text>
            <Text style={styles.infoSteps}>
              ⚠️ Premier téléchargement: ~10 min (WiFi)
            </Text>
          </View>
        )}
        
        {/* Info Pollinations */}
        {imageStrategy === 'pollinations-only' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              🌐 Pollinations.ai
            </Text>
            <Text style={styles.infoSteps}>
              ✅ Génération gratuite
            </Text>
            <Text style={styles.infoSteps}>
              ⚠️ Quotas limités (rate limiting possible)
            </Text>
            <Text style={styles.infoSteps}>
              💡 Conseil: Utilisez "Freebox en premier" pour éviter les limites
            </Text>
          </View>
        )}

        {/* Bouton de sauvegarde */}
        <TouchableOpacity style={styles.saveButton} onPress={saveImageApiConfig}>
          <Text style={styles.saveButtonText}>💾 Sauvegarder la configuration</Text>
        </TouchableOpacity>
      </View>

      {/* NOUVELLE SECTION: Téléchargement modèle SD Local */}
      {imageStrategy === 'local' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📥 Modèle Stable Diffusion Local</Text>
          <Text style={styles.sectionDescription}>
            Téléchargez le modèle SD-Turbo ONNX (450 MB) pour générer des images sur votre smartphone.
          </Text>

          {sdAvailability && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                📊 État du système:
              </Text>
              <Text style={styles.infoSteps}>
                📱 RAM disponible: {sdAvailability.ramMB ? Math.round(sdAvailability.ramMB) : 'N/A'} MB
              </Text>
              <Text style={styles.infoSteps}>
                {sdAvailability.canRunSD ? '✅ Compatible SD Local' : '⚠️ RAM insuffisante (min 2 GB)'}
              </Text>
              <Text style={styles.infoSteps}>
                {sdAvailability.modelDownloaded 
                  ? `✅ Modèle téléchargé (${Math.round(sdAvailability.modelSizeMB)} MB)` 
                  : '❌ Modèle non téléchargé'}
              </Text>
            </View>
          )}

          {sdDownloading && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                📥 Téléchargement en cours... {Math.round(sdDownloadProgress)}%
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${sdDownloadProgress}%` }]} />
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[
              styles.downloadButton, 
              (sdDownloading || (sdAvailability && sdAvailability.modelDownloaded)) && styles.downloadButtonDisabled
            ]} 
            onPress={downloadSDModel}
            disabled={sdDownloading || (sdAvailability && sdAvailability.modelDownloaded)}
          >
            <Text style={styles.downloadButtonText}>
              {sdDownloading 
                ? '⏳ Téléchargement...' 
                : (sdAvailability && sdAvailability.modelDownloaded)
                  ? '✅ Modèle installé'
                  : '📥 Télécharger le modèle (450 MB)'}
            </Text>
          </TouchableOpacity>

          {sdAvailability && sdAvailability.modelDownloaded && (
            <TouchableOpacity 
              style={styles.testButton} 
              onPress={async () => {
                try {
                  const sysInfo = await StableDiffusionLocalService.getSystemInfo();
                  Alert.alert(
                    '📊 Infos Système',
                    `RAM Max: ${Math.round(sysInfo.maxMemoryMB)} MB\n` +
                    `RAM Utilisée: ${Math.round(sysInfo.usedMemoryMB)} MB\n` +
                    `RAM Libre: ${Math.round(sysInfo.freeMemoryMB)} MB\n\n` +
                    `${sysInfo.canRunSD ? '✅ Peut exécuter SD' : '⚠️ RAM insuffisante'}`
                  );
                } catch (error) {
                  Alert.alert('❌ Erreur', error.message);
                }
              }}
            >
              <Text style={styles.testButtonText}>📊 Infos Système</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ À propos</Text>
        <View style={styles.aboutBox}>
          <Text style={styles.aboutText}>Version: 3.0.0</Text>
          <Text style={styles.aboutText}>
            Application de roleplay conversationnel
          </Text>
          <Text style={styles.aboutText}>
            236 personnages uniques (dont 30 nouvelles amies)
          </Text>
          <Text style={styles.aboutText}>
            Système de relation dynamique
          </Text>
          <Text style={styles.aboutText}>
            Génération d'images gratuite
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Fonctionnalités</Text>
        <View style={styles.featuresList}>
          <Text style={styles.featureItem}>✓ Multi-clés Groq avec rotation automatique</Text>
          <Text style={styles.featureItem}>✓ 236 personnages diversifiés</Text>
          <Text style={styles.featureItem}>✓ 30 nouvelles amies avec apparences variées</Text>
          <Text style={styles.featureItem}>✓ Système de roleplay immersif</Text>
          <Text style={styles.featureItem}>✓ Système d'expérience et d'affection</Text>
          <Text style={styles.featureItem}>✓ Génération d'images illimitée</Text>
          <Text style={styles.featureItem}>✓ Sauvegarde automatique des conversations</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
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
  downloadButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  downloadButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressContainer: {
    marginTop: 15,
    marginBottom: 10,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
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
  strategyContainer: {
    marginTop: 15,
    marginBottom: 15,
  },
  strategyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  strategyOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  strategyOptionActive: {
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
  strategyContent: {
    flex: 1,
  },
  strategyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  strategyDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
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
  profileHint: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: '#6366f1',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  // Styles pour le sélecteur de provider
  providerContainer: {
    marginTop: 10,
  },
  providerOption: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  providerOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#e0e7ff',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerRadioSelected: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#6366f1',
  },
  providerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginRight: 8,
  },
  providerBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 6,
  },
  providerBadgeFree: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  providerDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 10,
  },
  providerKeyInfo: {
    marginTop: 5,
    marginBottom: 8,
  },
  providerKeyText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  providerTestButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    minWidth: 80,
    alignItems: 'center',
  },
  providerTestButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
