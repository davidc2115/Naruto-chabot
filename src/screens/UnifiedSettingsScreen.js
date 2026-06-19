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
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserProfileService from '../services/UserProfileService';
import GroqService from '../services/GroqService';
import LlamaService from '../services/LlamaService';
import StableDiffusionLocalService from '../services/StableDiffusionLocalService';
import AuthService from '../services/AuthService';

export default function UnifiedSettingsScreen({ navigation, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  
  // Text Generation System
  const [textSystem, setTextSystem] = useState('mix'); // 'local', 'groq', 'mix'
  const [groqApiKeys, setGroqApiKeys] = useState(['']);
  const [groqModel, setGroqModel] = useState('llama-3.3-70b-versatile');
  
  // Image Generation System
  const [imageSystem, setImageSystem] = useState('mix'); // 'local', 'horde', 'pollinations', 'mix'
  const [stableHordeKey, setStableHordeKey] = useState('');
  
  // Llama Models
  const [llamaAvailability, setLlamaAvailability] = useState(null);
  
  // SD Local
  const [sdAvailability, setSdAvailability] = useState(null);
  
  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    try {
      await loadProfile();
      await loadTextSystem();
      await loadImageSystem();
      await checkLlamaAvailability();
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

  const loadTextSystem = async () => {
    try {
      const system = await AsyncStorage.getItem('text_generation_system') || 'mix';
      setTextSystem(system);
      
      const keys = await AsyncStorage.getItem('groq_api_keys');
      if (keys) setGroqApiKeys(JSON.parse(keys));
      
      const model = await AsyncStorage.getItem('groq_model');
      if (model) setGroqModel(model);
    } catch (error) {
      console.error('Erreur chargement système texte:', error);
    }
  };

  const loadImageSystem = async () => {
    try {
      const system = await AsyncStorage.getItem('image_generation_system') || 'mix';
      setImageSystem(system);
      
      const key = await AsyncStorage.getItem('stable_horde_key');
      if (key) setStableHordeKey(key);
    } catch (error) {
      console.error('Erreur chargement système image:', error);
    }
  };

  const checkLlamaAvailability = async () => {
    try {
      const availability = {
        available: LlamaService.isAvailable,
        isLoaded: LlamaService.isLoaded,
        phi35Downloaded: await LlamaService.isModelDownloaded('phi35mini'),
        llama321bDownloaded: await LlamaService.isModelDownloaded('llama321b'),
      };
      setLlamaAvailability(availability);
    } catch (error) {
      console.error('Erreur vérification Llama:', error);
    }
  };

  const checkSDAvailability = async () => {
    try {
      const availability = await StableDiffusionLocalService.checkAvailability();
      setSdAvailability(availability);
    } catch (error) {
      console.error('Erreur vérification SD:', error);
    }
  };

  const saveTextSystem = async (system) => {
    try {
      setTextSystem(system);
      await AsyncStorage.setItem('text_generation_system', system);
      Alert.alert('Succès', `Système de texte: ${system === 'local' ? 'Local uniquement' : system === 'groq' ? 'Groq uniquement' : 'Mix (Groq + Local)'}`);
    } catch (error) {
      console.error('Erreur sauvegarde système texte:', error);
    }
  };

  const saveImageSystem = async (system) => {
    try {
      setImageSystem(system);
      await AsyncStorage.setItem('image_generation_system', system);
      Alert.alert('Succès', `Système d'image: ${system === 'local' ? 'Local uniquement' : system === 'horde' ? 'Stable Horde uniquement' : system === 'pollinations' ? 'Pollinations uniquement' : 'Mix (tous)'}`);
    } catch (error) {
      console.error('Erreur sauvegarde système image:', error);
    }
  };

  const saveGroqKeys = async () => {
    try {
      const validKeys = groqApiKeys.filter(k => k && k.trim());
      await AsyncStorage.setItem('groq_api_keys', JSON.stringify(validKeys));
      await GroqService.loadApiKeys();
      Alert.alert('Succès', `${validKeys.length} clé(s) Groq sauvegardée(s)`);
    } catch (error) {
      console.error('Erreur sauvegarde clés Groq:', error);
    }
  };

  const saveStableHordeKey = async () => {
    try {
      await AsyncStorage.setItem('stable_horde_key', stableHordeKey);
      Alert.alert('Succès', 'Clé Stable Horde sauvegardée');
    } catch (error) {
      console.error('Erreur sauvegarde clé Stable Horde:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: () => {
            if (onLogout) onLogout();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
      
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚙️ Paramètres</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>🚪 Déconnexion</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Profil</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Nom d'utilisateur</Text>
            <TextInput
              style={styles.input}
              value={userProfile?.username || ''}
              onChangeText={(text) => setUserProfile({ ...userProfile, username: text })}
              placeholder="Votre nom"
              placeholderTextColor="#6b7280"
            />
            
            <Text style={styles.label}>Genre</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.optionButton, userProfile?.gender === 'male' && styles.optionButtonActive]}
                onPress={() => setUserProfile({ ...userProfile, gender: 'male' })}
              >
                <Text style={[styles.optionButtonText, userProfile?.gender === 'male' && styles.optionButtonTextActive]}>
                  👨 Homme
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionButton, userProfile?.gender === 'female' && styles.optionButtonActive]}
                onPress={() => setUserProfile({ ...userProfile, gender: 'female' })}
              >
                <Text style={[styles.optionButtonText, userProfile?.gender === 'female' && styles.optionButtonTextActive]}>
                  👩 Femme
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionButton, userProfile?.gender === 'other' && styles.optionButtonActive]}
                onPress={() => setUserProfile({ ...userProfile, gender: 'other' })}
              >
                <Text style={[styles.optionButtonText, userProfile?.gender === 'other' && styles.optionButtonTextActive]}>
                  🧑 Autre
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Âge</Text>
            <TextInput
              style={styles.input}
              value={userProfile?.age?.toString() || ''}
              onChangeText={(text) => {
                const age = parseInt(text) || 0;
                setUserProfile({ 
                  ...userProfile, 
                  age,
                  isAdult: age >= 18,
                  nsfwEnabled: age >= 18 ? (userProfile?.nsfwEnabled || false) : false
                });
              }}
              placeholder="Votre âge"
              placeholderTextColor="#6b7280"
              keyboardType="numeric"
            />
            
            {userProfile?.isAdult && (
              <View style={styles.switchRow}>
                <Text style={styles.label}>Mode NSFW</Text>
                <TouchableOpacity
                  style={[styles.switch, userProfile?.nsfwEnabled && styles.switchActive]}
                  onPress={async () => {
                    const newProfile = await UserProfileService.toggleNSFW();
                    setUserProfile(newProfile);
                  }}
                >
                  <Text style={styles.switchText}>{userProfile?.nsfwEnabled ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={async () => {
                if (!userProfile?.username || !userProfile?.age || !userProfile?.gender) {
                  Alert.alert('Erreur', 'Veuillez remplir tous les champs du profil');
                  return;
                }
                if (userProfile.age < 18) {
                  Alert.alert('Erreur', 'Vous devez avoir 18 ans ou plus');
                  return;
                }
                await UserProfileService.updateProfile(userProfile);
                Alert.alert('Succès', 'Profil sauvegardé');
              }}
            >
              <Text style={styles.saveButtonText}>💾 Sauvegarder</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Text Generation System */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Génération de Texte</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Système de génération</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.optionButton, textSystem === 'local' && styles.optionButtonActive]}
                onPress={() => saveTextSystem('local')}
              >
                <Text style={[styles.optionButtonText, textSystem === 'local' && styles.optionButtonTextActive]}>
                  📱 Local
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionButton, textSystem === 'groq' && styles.optionButtonActive]}
                onPress={() => saveTextSystem('groq')}
              >
                <Text style={[styles.optionButtonText, textSystem === 'groq' && styles.optionButtonTextActive]}>
                  ☁️ Groq
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionButton, textSystem === 'mix' && styles.optionButtonActive]}
                onPress={() => saveTextSystem('mix')}
              >
                <Text style={[styles.optionButtonText, textSystem === 'mix' && styles.optionButtonTextActive]}>
                  🔄 Mix
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.description}>
              {textSystem === 'local' ? 'Génération 100% hors ligne avec Llama' :
               textSystem === 'groq' ? 'Génération en ligne avec Groq (rapide)' :
               'Groq en priorité, fallback automatique sur Local'}
            </Text>

            {/* Groq Configuration */}
            {textSystem !== 'local' && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>🔑 Clés API Groq</Text>
                {groqApiKeys.map((key, index) => (
                  <TextInput
                    key={index}
                    style={styles.input}
                    value={key}
                    onChangeText={(text) => {
                      const newKeys = [...groqApiKeys];
                      newKeys[index] = text;
                      setGroqApiKeys(newKeys);
                    }}
                    placeholder={`Clé API ${index + 1}`}
                    placeholderTextColor="#6b7280"
                    secureTextEntry
                  />
                ))}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setGroqApiKeys([...groqApiKeys, ''])}
                  >
                    <Text style={styles.secondaryButtonText}>+ Ajouter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveGroqKeys}
                  >
                    <Text style={styles.saveButtonText}>💾 Sauvegarder</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Llama Configuration */}
            {textSystem !== 'groq' && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>🦙 Modèles Llama</Text>
                {llamaAvailability ? (
                  <View>
                    <Text style={styles.statusText}>
                      Phi-3.5: {llamaAvailability.phi35Downloaded ? '✅ Téléchargé' : '❌ Non téléchargé'}
                    </Text>
                    <Text style={styles.statusText}>
                      Llama 3.2 1B: {llamaAvailability.llama321bDownloaded ? '✅ Téléchargé' : '❌ Non téléchargé'}
                    </Text>
                    <Text style={styles.statusText}>
                      État: {llamaAvailability.isLoaded ? '✅ Chargé' : '❌ Non chargé'}
                    </Text>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => navigation.navigate('UserSettings')}
                    >
                      <Text style={styles.secondaryButtonText}>Gérer les modèles</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ActivityIndicator size="small" color="#6366f1" />
                )}
              </View>
            )}
          </View>
        </View>

        {/* Image Generation System */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Génération d'Images</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Système de génération</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.optionButton, imageSystem === 'local' && styles.optionButtonActive]}
                onPress={() => saveImageSystem('local')}
              >
                <Text style={[styles.optionButtonText, imageSystem === 'local' && styles.optionButtonTextActive]}>
                  📱 Local
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionButton, imageSystem === 'horde' && styles.optionButtonActive]}
                onPress={() => saveImageSystem('horde')}
              >
                <Text style={[styles.optionButtonText, imageSystem === 'horde' && styles.optionButtonTextActive]}>
                  🌐 Horde
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionButton, imageSystem === 'pollinations' && styles.optionButtonActive]}
                onPress={() => saveImageSystem('pollinations')}
              >
                <Text style={[styles.optionButtonText, imageSystem === 'pollinations' && styles.optionButtonTextActive]}>
                  🎭 Pollinations
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionButton, imageSystem === 'mix' && styles.optionButtonActive]}
                onPress={() => saveImageSystem('mix')}
              >
                <Text style={[styles.optionButtonText, imageSystem === 'mix' && styles.optionButtonTextActive]}>
                  🔄 Mix
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.description}>
              {imageSystem === 'local' ? 'Génération 100% locale avec Stable Diffusion' :
               imageSystem === 'horde' ? 'Génération via Stable Horde (gratuit)' :
               imageSystem === 'pollinations' ? 'Génération via Pollinations (gratuit)' :
               'Pollinations → Horde → Local (fallback automatique)'}
            </Text>

            {/* Stable Horde Key */}
            {imageSystem === 'horde' || imageSystem === 'mix' ? (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>🔑 Clé API Stable Horde</Text>
                <TextInput
                  style={styles.input}
                  value={stableHordeKey}
                  onChangeText={setStableHordeKey}
                  placeholder="Clé API Stable Horde (optionnel)"
                  placeholderTextColor="#6b7280"
                />
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={saveStableHordeKey}
                >
                  <Text style={styles.saveButtonText}>💾 Sauvegarder</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* SD Local Status */}
            {imageSystem === 'local' || imageSystem === 'mix' ? (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>🎨 Stable Diffusion Local</Text>
                {sdAvailability ? (
                  <View>
                    <Text style={styles.statusText}>
                      Disponible: {sdAvailability.available ? '✅' : '❌'}
                    </Text>
                    <Text style={styles.statusText}>
                      Modèles: {sdAvailability.modelDownloaded ? '✅ Téléchargés' : '❌ Non téléchargés'}
                    </Text>
                    <Text style={styles.statusText}>
                      Pipeline: {sdAvailability.pipelineReady ? '✅ Prêt' : '❌ Non prêt'}
                    </Text>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => navigation.navigate('UserSettings')}
                    >
                      <Text style={styles.secondaryButtonText}>Gérer SD Local</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ActivityIndicator size="small" color="#6366f1" />
                )}
              </View>
            ) : null}
          </View>
        </View>

        {/* Memory System */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧠 Système de Mémoire</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Mémoire avancée illimitée</Text>
            <Text style={styles.description}>
              Stockage local illimité sur votre smartphone. Vos conversations et souvenirs sont sauvegardés automatiquement.
            </Text>
            <View style={styles.memoryStats}>
              <Text style={styles.statLabel}>💾 Stockage local</Text>
              <Text style={styles.statValue}>Illimité</Text>
            </View>
            <View style={styles.memoryStats}>
              <Text style={styles.statLabel}>📝 Conversations</Text>
              <Text style={styles.statValue}>Sauvegardées automatiquement</Text>
            </View>
            <View style={styles.memoryStats}>
              <Text style={styles.statLabel}>🎭 Souvenirs</Text>
              <Text style={styles.statValue}>Conservés indéfiniment</Text>
            </View>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ À propos</Text>
          <View style={styles.card}>
            <Text style={styles.versionText}>Version 5.4.0</Text>
            <Text style={styles.description}>
              Application de roleplay IA avec génération de texte et d'images.
              Tous les services sont accessibles sans abonnement premium.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1e1e2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3a3a4e',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  optionButton: {
    flex: 1,
    minWidth: 80,
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a4e',
  },
  optionButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  optionButtonText: {
    color: '#a0a0b0',
    fontWeight: '600',
    fontSize: 14,
  },
  optionButtonTextActive: {
    color: '#ffffff',
  },
  description: {
    color: '#a0a0b0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  subsection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#3a3a4e',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  statusText: {
    color: '#a0a0b0',
    fontSize: 14,
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a4e',
  },
  secondaryButtonText: {
    color: '#a0a0b0',
    fontWeight: '600',
    fontSize: 14,
  },
  memoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a4e',
  },
  statLabel: {
    color: '#a0a0b0',
    fontSize: 14,
  },
  statValue: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  versionText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switch: {
    backgroundColor: '#2a2a3e',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#3a3a4e',
  },
  switchActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  switchText: {
    color: '#a0a0b0',
    fontWeight: '600',
    fontSize: 14,
  },
});
