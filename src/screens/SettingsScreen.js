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
  });
  const [testingProvider, setTestingProvider] = useState(null);
  
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
      setTextProvider(currentProvider);
      
      // Charger les clés pour tous les providers qui en nécessitent
      const newProviderKeys = {};
      
      providers.forEach(provider => {
        if (provider.requiresApiKey) {
          const keys = TextGenerationService.apiKeys[provider.id] || [];
          newProviderKeys[provider.id] = keys.length > 0 ? keys : [''];
        }
      });
      
      setProviderApiKeys(newProviderKeys);
      
      console.log('✅ Config providers chargée:', currentProvider);
      console.log('📋 Clés chargées pour:', Object.keys(newProviderKeys));
    } catch (error) {
      console.error('Erreur chargement config text generation:', error);
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
        
        // Vérifier si le modèle est téléchargé
        const availability = await StableDiffusionLocalService.checkAvailability();
        if (!availability.modelDownloaded) {
          Alert.alert(
            '⚠️ Modèle requis',
            'SD Local activé! N\'oubliez pas de télécharger le modèle (~450 MB) pour que la génération fonctionne.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('✅ Succès', 'SD Local activé avec modèle installé!');
        }
      } else if (imageStrategy === 'pollinations-only') {
        // Pollinations uniquement
        await CustomImageAPIService.saveConfig('', 'pollinations', 'pollinations-only');
        Alert.alert('✅ Succès', 'Pollinations.ai configuré comme source unique.');
      } else {
        // Freebox configuré (freebox-first ou freebox-only)
        const url = customImageApi.trim() || 'http://88.174.155.230:33437/generate';
        await CustomImageAPIService.saveConfig(url, 'freebox', imageStrategy);
        
        let message = '';
        if (imageStrategy === 'freebox-only') {
          message = 'Freebox SD configuré comme source unique. NSFW illimité!';
        } else {
          message = 'Freebox SD + Pollinations configuré. NSFW supporté!';
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
    // Vérifier d'abord si le modèle est déjà téléchargé
    const availability = await StableDiffusionLocalService.checkAvailability();
    
    if (availability.modelDownloaded) {
      Alert.alert(
        '✅ Modèle déjà installé',
        `Le modèle SD est déjà téléchargé (${availability.modelSizeMB} MB).\n\nVoulez-vous le supprimer?`,
        [
          { text: 'Garder', style: 'cancel' },
          { 
            text: 'Supprimer', 
            style: 'destructive',
            onPress: async () => {
              await StableDiffusionLocalService.deleteModel();
              await checkSDAvailability();
              Alert.alert('🗑️', 'Modèle supprimé');
            }
          }
        ]
      );
      return;
    }

    // Demander confirmation avant téléchargement
    Alert.alert(
      '📥 Télécharger SD-Turbo',
      `Télécharger le modèle Stable Diffusion (~450 MB)?\n\n` +
      `⚠️ Nécessite une connexion WiFi stable\n` +
      `⏱️ Durée estimée: 5-15 minutes\n\n` +
      `Le modèle sera stocké localement pour une génération plus rapide.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: '📥 Télécharger', 
          onPress: async () => {
            setSdDownloading(true);
            setSdDownloadProgress(0);
            
            try {
              await StableDiffusionLocalService.downloadModel((progress) => {
                setSdDownloadProgress(progress);
              });
              
              setSdDownloading(false);
              await checkSDAvailability();
              Alert.alert('✅ Succès!', 'Modèle SD téléchargé avec succès!');
            } catch (error) {
              setSdDownloading(false);
              Alert.alert('❌ Erreur', `Téléchargement échoué:\n${error.message}`);
            }
          }
        }
      ]
    );
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
                {userProfile.spicyMode && userProfile.isAdult && ' • 🔥 Mode Spicy'}
                {userProfile.nsfwMode && !userProfile.spicyMode && userProfile.isAdult && ' • 💕 Mode Romance'}
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
                    <Text style={styles.providerBadgeFreebox}>🏠 FREEBOX • 🔥 PARFAIT SPICY</Text>
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
          
          {providerApiKeys[textProvider]?.map((key, index) => (
            <View key={index} style={styles.keyInputContainer}>
              <TextInput
                style={styles.keyInput}
                placeholder={`Clé API ${index + 1}`}
                value={key}
                onChangeText={(value) => {
                  const newKeys = { ...providerApiKeys };
                  newKeys[textProvider][index] = value;
                  setProviderApiKeys(newKeys);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={key.length > 0}
              />
              {providerApiKeys[textProvider].length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => {
                    const newKeys = { ...providerApiKeys };
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
                newKeys[textProvider] = [''];
              }
              newKeys[textProvider].push('');
              setProviderApiKeys(newKeys);
            }}
          >
            <Text style={styles.addButtonText}>+ Ajouter une clé</Text>
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={async () => {
                if (!providerApiKeys[textProvider]) {
                  Alert.alert('Erreur', 'Erreur de configuration. Veuillez recharger l\'application.');
                  return;
                }
                
                const validKeys = providerApiKeys[textProvider].filter(key => key.trim() !== '');
                
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
          <Text style={styles.strategyTitle}>📍 Source de génération d'images:</Text>
          
          {/* Option 0: SD Local sur Smartphone */}
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
              <Text style={styles.strategyName}>📱 SD Local Smartphone {sdAvailability?.modelDownloaded ? '✅' : '📥'}</Text>
              <Text style={styles.strategyDescription}>
                Génération sur votre téléphone. Téléchargez le modèle (~450 MB) une seule fois.
                {sdAvailability?.modelDownloaded ? ` Modèle installé (${sdAvailability.modelSizeMB} MB)` : ' Modèle non téléchargé.'}
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* Option 1: Freebox + Pollinations (RECOMMANDÉ) */}
          <TouchableOpacity
            style={[
              styles.strategyOption,
              imageStrategy === 'freebox-first' && styles.strategyOptionActive
            ]}
            onPress={() => {
              setImageStrategy('freebox-first');
              setCustomImageApi('http://88.174.155.230:33437/generate');
            }}
          >
            <View style={styles.radioButton}>
              {imageStrategy === 'freebox-first' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.strategyContent}>
              <Text style={styles.strategyName}>🏠 Freebox SD + Pollinations (Recommandé)</Text>
              <Text style={styles.strategyDescription}>
                Stable Diffusion sur Freebox en priorité, Pollinations en fallback. NSFW supporté!
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option 2: Freebox uniquement */}
          <TouchableOpacity
            style={[
              styles.strategyOption,
              imageStrategy === 'freebox-only' && styles.strategyOptionActive
            ]}
            onPress={() => {
              setImageStrategy('freebox-only');
              setCustomImageApi('http://88.174.155.230:33437/generate');
            }}
          >
            <View style={styles.radioButton}>
              {imageStrategy === 'freebox-only' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.strategyContent}>
              <Text style={styles.strategyName}>🏠 Freebox SD uniquement</Text>
              <Text style={styles.strategyDescription}>
                Uniquement votre serveur Stable Diffusion. Illimité, NSFW total!
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
              <Text style={styles.strategyName}>🌐 Pollinations.ai uniquement</Text>
              <Text style={styles.strategyDescription}>
                Service en ligne gratuit. Pas besoin de serveur, mais quotas limités.
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

      {/* Section SD Local - Téléchargement modèle */}
      {imageStrategy === 'local' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Stable Diffusion Local</Text>
          <Text style={styles.sectionDescription}>
            Générez des images directement sur votre smartphone. Téléchargez le modèle une seule fois.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>📊 Mode SD Local:</Text>
            <Text style={styles.infoSteps}>
              ✅ Utilise des APIs gratuites (Prodia + Pollinations)
            </Text>
            <Text style={styles.infoSteps}>
              📦 Pas de téléchargement requis!
            </Text>
            <Text style={styles.infoSteps}>
              ⚡ Génération: 10-30 secondes/image
            </Text>
            <Text style={styles.infoSteps}>
              🔥 NSFW: Totalement supporté!
            </Text>
            <Text style={styles.infoSteps}>
              💰 100% GRATUIT et ILLIMITÉ
            </Text>
          </View>

          {sdDownloading && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                📥 Téléchargement: {sdDownloadProgress}%
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${sdDownloadProgress}%` }]} />
              </View>
              <Text style={styles.progressHint}>
                Ne fermez pas l'application pendant le téléchargement
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={[
              styles.downloadButton,
              sdDownloading && styles.downloadButtonDisabled
            ]} 
            onPress={async () => {
              setSdDownloading(true);
              try {
                await StableDiffusionLocalService.downloadModel((p) => setSdDownloadProgress(p));
                await checkSDAvailability();
                Alert.alert('✅ Configuré!', 'SD Local est prêt! Utilise Prodia + Pollinations (gratuit).');
              } catch (e) {
                Alert.alert('Info', 'Configuration terminée.');
              }
              setSdDownloading(false);
            }}
            disabled={sdDownloading}
          >
            <Text style={styles.downloadButtonText}>
              {sdDownloading 
                ? '⏳ Configuration...' 
                : '✅ Activer SD Local (Gratuit)'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.downloadHint}>
            💡 Aucun téléchargement lourd - utilise des APIs gratuites!
          </Text>
        </View>
      )}

      {/* Section info Freebox SD */}
      {(imageStrategy === 'freebox-first' || imageStrategy === 'freebox-only') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Configuration Stable Diffusion</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ✅ Votre configuration:
            </Text>
            <Text style={styles.infoSteps}>
              🏠 Serveur: Freebox SD (88.174.155.230:33437)
            </Text>
            <Text style={styles.infoSteps}>
              📸 Style: Photo-réaliste (85%) + Anime (15%)
            </Text>
            <Text style={styles.infoSteps}>
              🔥 NSFW: Images sexy si mode Romance/Spicy activé
            </Text>
            <Text style={styles.infoSteps}>
              👙 Tenues: Lingerie, bikini, nu artistique...
            </Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ À propos</Text>
        <View style={styles.aboutBox}>
          <Text style={styles.aboutText}>Version: 2.5.0 - Venus AI + KoboldAI NSFW 🔥</Text>
          <Text style={styles.aboutText}>
            Application de roleplay conversationnel
          </Text>
          <Text style={styles.aboutText}>
            200 personnages uniques
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
          <Text style={styles.featureItem}>✓ 200 personnages diversifiés</Text>
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
  progressHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  downloadHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
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
  providerBadgeFreebox: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#f97316',
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
