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
import TextGenerationService from '../services/TextGenerationService';
import ImageGenerationService from '../services/ImageGenerationService';
import UserProfileService from '../services/UserProfileService';

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  
  // Groq
  const [groqApiKeys, setGroqApiKeys] = useState(['']);
  const [selectedModel, setSelectedModel] = useState('mixtral-8x7b-32768');
  const [availableModels, setAvailableModels] = useState([]);
  const [testing, setTesting] = useState(false);
  
  // Images
  const [imageStrategy, setImageStrategy] = useState('local');
  const [freeboxUrl, setFreeboxUrl] = useState('http://88.174.155.230:33437/generate');

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadProfile);
    return unsubscribe;
  }, [navigation]);

  const loadAll = async () => {
    await loadProfile();
    await loadGroqConfig();
    await loadImageConfig();
    setLoading(false);
  };

  const loadProfile = async () => {
    const profile = await UserProfileService.getProfile();
    setUserProfile(profile);
  };

  const loadGroqConfig = async () => {
    await TextGenerationService.loadConfig();
    const models = TextGenerationService.getAvailableModels();
    const currentModel = TextGenerationService.getCurrentModel();
    const keys = TextGenerationService.apiKeys.groq || [];
    
    setAvailableModels(models);
    setSelectedModel(currentModel);
    setGroqApiKeys(keys.length > 0 ? keys : ['']);
  };

  const loadImageConfig = async () => {
    await ImageGenerationService.loadConfig();
    setImageStrategy(ImageGenerationService.getStrategy());
    setFreeboxUrl(ImageGenerationService.freeboxUrl || 'http://88.174.155.230:33437/generate');
  };

  const saveGroqKeys = async () => {
    const validKeys = groqApiKeys.filter(k => k.trim() !== '');
    if (validKeys.length === 0) {
      Alert.alert('Erreur', 'Ajoutez au moins une clé API Groq.');
      return;
    }
    await TextGenerationService.saveApiKeys('groq', validKeys);
    Alert.alert('✅ Succès', `${validKeys.length} clé(s) API sauvegardée(s)!`);
  };

  const testGroq = async () => {
    const validKeys = groqApiKeys.filter(k => k.trim() !== '');
    if (validKeys.length === 0) {
      Alert.alert('Erreur', 'Ajoutez une clé API d\'abord.');
      return;
    }
    
    setTesting(true);
    try {
      await TextGenerationService.saveApiKeys('groq', validKeys);
      const result = await TextGenerationService.testProvider('groq');
      if (result.success) {
        Alert.alert('✅ Succès', 'Groq fonctionne correctement!');
      } else {
        Alert.alert('❌ Échec', result.error);
      }
    } catch (e) {
      Alert.alert('❌ Erreur', e.message);
    }
    setTesting(false);
  };

  const changeModel = async (modelId) => {
    setSelectedModel(modelId);
    await TextGenerationService.setModel(modelId);
    const modelInfo = availableModels.find(m => m.id === modelId);
    Alert.alert('✅ Modèle changé', modelInfo?.name || modelId);
  };

  const saveImageConfig = async () => {
    await ImageGenerationService.setStrategy(imageStrategy);
    if (imageStrategy === 'freebox') {
      await ImageGenerationService.setFreeboxUrl(freeboxUrl);
    }
    Alert.alert('✅ Succès', imageStrategy === 'local' ? 'SD Local (Prodia) activé!' : 'Freebox SD activé!');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text>Chargement...</Text>
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
                {userProfile.age} ans
                {userProfile.spicyMode && ' • 🔥 Mode Spicy'}
                {userProfile.nsfwMode && !userProfile.spicyMode && ' • 💕 Mode Romance'}
              </Text>
              <Text style={styles.profileAction}>Modifier →</Text>
            </View>
          ) : (
            <Text style={styles.profileCreate}>✨ Créer mon profil</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* GROQ - MODÈLES */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 Modèle Groq</Text>
        <Text style={styles.sectionDescription}>
          Choisissez le modèle pour la génération de texte. Mixtral est recommandé pour le NSFW.
        </Text>

        <View style={styles.modelContainer}>
          {availableModels.map((model) => (
            <TouchableOpacity
              key={model.id}
              style={[
                styles.modelOption,
                selectedModel === model.id && styles.modelOptionSelected
              ]}
              onPress={() => changeModel(model.id)}
            >
              <View style={styles.radioButton}>
                {selectedModel === model.id && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.modelInfo}>
                <Text style={styles.modelName}>{model.name}</Text>
                <Text style={styles.modelDesc}>{model.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* GROQ - CLÉS API */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔑 Clés API Groq</Text>
        <Text style={styles.sectionDescription}>
          Obtenez une clé gratuite sur console.groq.com
        </Text>

        {groqApiKeys.map((key, index) => (
          <View key={index} style={styles.keyRow}>
            <TextInput
              style={styles.keyInput}
              placeholder={`Clé API ${index + 1}`}
              value={key}
              onChangeText={(v) => {
                const newKeys = [...groqApiKeys];
                newKeys[index] = v;
                setGroqApiKeys(newKeys);
              }}
              autoCapitalize="none"
              secureTextEntry={key.length > 0}
            />
            {groqApiKeys.length > 1 && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => {
                  const newKeys = groqApiKeys.filter((_, i) => i !== index);
                  setGroqApiKeys(newKeys.length === 0 ? [''] : newKeys);
                }}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setGroqApiKeys([...groqApiKeys, ''])}
        >
          <Text style={styles.addButtonText}>+ Ajouter une clé</Text>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.testButton} onPress={testGroq} disabled={testing}>
            {testing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>🧪 Tester</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={saveGroqKeys}>
            <Text style={styles.buttonText}>💾 Sauvegarder</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* IMAGES */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🖼️ Génération d'Images</Text>
        <Text style={styles.sectionDescription}>
          Choisissez la source pour les images de personnages.
        </Text>

        <View style={styles.modelContainer}>
          {/* SD Local */}
          <TouchableOpacity
            style={[
              styles.modelOption,
              imageStrategy === 'local' && styles.modelOptionSelected
            ]}
            onPress={() => setImageStrategy('local')}
          >
            <View style={styles.radioButton}>
              {imageStrategy === 'local' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.modelInfo}>
              <Text style={styles.modelName}>📱 SD Local (Prodia)</Text>
              <Text style={styles.modelDesc}>Gratuit, illimité, NSFW supporté</Text>
            </View>
          </TouchableOpacity>

          {/* Freebox */}
          <TouchableOpacity
            style={[
              styles.modelOption,
              imageStrategy === 'freebox' && styles.modelOptionSelected
            ]}
            onPress={() => setImageStrategy('freebox')}
          >
            <View style={styles.radioButton}>
              {imageStrategy === 'freebox' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.modelInfo}>
              <Text style={styles.modelName}>🏠 Freebox SD</Text>
              <Text style={styles.modelDesc}>Votre serveur Stable Diffusion local</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* URL Freebox */}
        {imageStrategy === 'freebox' && (
          <View style={styles.freeboxConfig}>
            <Text style={styles.inputLabel}>URL du serveur Freebox:</Text>
            <TextInput
              style={styles.keyInput}
              placeholder="http://88.174.155.230:33437/generate"
              value={freeboxUrl}
              onChangeText={setFreeboxUrl}
              autoCapitalize="none"
            />
          </View>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={saveImageConfig}>
          <Text style={styles.buttonText}>💾 Sauvegarder la config images</Text>
        </TouchableOpacity>
      </View>

      {/* À PROPOS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ À propos</Text>
        <View style={styles.aboutBox}>
          <Text style={styles.aboutText}>Version: 2.7.0 - RP Immersif + Tenue 🔥</Text>
          <Text style={styles.aboutText}>Application de roleplay conversationnel</Text>
          <Text style={styles.aboutText}>200 personnages uniques</Text>
          <Text style={styles.aboutText}>Génération d'images NSFW</Text>
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 15,
  },
  profileButton: {
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  profileInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  profileAction: {
    fontSize: 14,
    color: '#6366f1',
    marginTop: 8,
  },
  profileCreate: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: 'bold',
  },
  modelContainer: {
    marginTop: 10,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modelOptionSelected: {
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
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366f1',
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modelDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  keyRow: {
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
    marginBottom: 15,
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
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  freeboxConfig: {
    marginTop: 15,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
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
});
