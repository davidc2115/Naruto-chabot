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
import UserProfileService from '../services/UserProfileService';
import CustomImageAPIService from '../services/CustomImageAPIService';

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [groqKeys, setGroqKeys] = useState(['']);
  const [testingGroq, setTestingGroq] = useState(false);
  const [freeboxUrl, setFreeboxUrl] = useState('http://88.174.155.230:33437/generate');

  const ADMIN_EMAIL = 'douvdouv21@gmail.com';
  const isAdmin = (userProfile?.email || '').toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    loadProfile();
    loadGroqConfig();
    loadImageApiConfig();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
    });
    return unsubscribe;
  }, [navigation]);

  const loadProfile = async () => {
    const profile = await UserProfileService.getProfile();
    setUserProfile(profile);
  };

  const loadGroqConfig = async () => {
    try {
      await TextGenerationService.loadConfig();
      const keys = TextGenerationService.apiKeys || [];
      setGroqKeys(keys.length > 0 ? keys : ['']);
    } catch (error) {
      console.error('Erreur chargement config Groq:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadImageApiConfig = async () => {
    await CustomImageAPIService.loadConfig();
    const url = CustomImageAPIService.getApiUrl();
    if (url) setFreeboxUrl(url);
  };

  const addGroqKeyField = () => setGroqKeys([...groqKeys, '']);

  const removeGroqKeyField = (index) => {
    const newKeys = groqKeys.filter((_, i) => i !== index);
    setGroqKeys(newKeys.length === 0 ? [''] : newKeys);
  };

  const updateGroqKey = (index, value) => {
    const newKeys = [...groqKeys];
    newKeys[index] = value;
    setGroqKeys(newKeys);
  };

  const saveGroqKeys = async () => {
    if (!isAdmin) {
      Alert.alert('Accès refusé', 'Configuration réservée au compte admin.');
      return;
    }

    const validKeys = groqKeys.map(k => k.trim()).filter(Boolean);
    if (validKeys.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins une clé API Groq valide.');
      return;
    }

    await TextGenerationService.saveApiKeys('groq', validKeys);
    Alert.alert('✅ Succès', `${validKeys.length} clé(s) Groq sauvegardée(s).`);
  };

  const testGroqKeys = async () => {
    if (!isAdmin) {
      Alert.alert('Accès refusé', 'Configuration réservée au compte admin.');
      return;
    }

    const validKeys = groqKeys.map(k => k.trim()).filter(Boolean);
    if (validKeys.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins une clé API Groq valide.');
      return;
    }

    setTestingGroq(true);
    try {
      await TextGenerationService.saveApiKeys('groq', validKeys);
      const result = await TextGenerationService.testProvider('groq');
      if (result.success) {
        Alert.alert('✅ Succès', 'Groq fonctionne correctement.');
      } else {
        Alert.alert('❌ Échec', result.error || 'Test échoué');
      }
    } catch (error) {
      Alert.alert('❌ Erreur', error.message);
    } finally {
      setTestingGroq(false);
    }
  };

  const testImageApi = async () => {
    if (freeboxUrl.trim() === '') {
      Alert.alert('Erreur', 'Veuillez entrer une URL d\'API.');
      return;
    }

    try {
      Alert.alert('Test en cours', 'Vérification de la connexion...');
      const result = await CustomImageAPIService.testConnection(freeboxUrl.trim());
      
      if (result.success) {
        Alert.alert('✅ Succès', 'Connexion à l\'API réussie !');
      } else {
        Alert.alert('❌ Échec', `Impossible de se connecter:\n${result.error}`);
      }
    } catch (error) {
      Alert.alert('❌ Erreur', `Test échoué: ${error.message}`);
    }
  };

  const saveImageApiConfig = async () => {
    if (!isAdmin) {
      Alert.alert('Accès refusé', 'Configuration réservée au compte admin.');
      return;
    }

    if (freeboxUrl.trim() === '') {
      Alert.alert('Erreur', 'Veuillez entrer une URL Freebox valide.');
      return;
    }

    try {
      await CustomImageAPIService.saveConfig(freeboxUrl.trim(), 'freebox', 'freebox-only');
      Alert.alert('✅ Succès', 'API Freebox configurée (source unique).');
      await loadImageApiConfig();
    } catch (error) {
      Alert.alert('❌ Erreur', `Impossible de sauvegarder: ${error.message}`);
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 Texte</Text>
        <Text style={styles.sectionDescription}>
          Cette version utilise uniquement Groq pour la génération de texte (mode conversation immersif).
        </Text>

        {!isAdmin ? (
          <View style={styles.lockBox}>
            <Text style={styles.lockText}>
              🔒 La configuration des clés API est réservée au compte admin ({ADMIN_EMAIL}).
            </Text>
            <Text style={styles.lockTextSub}>
              Pour y accéder, ajoutez votre email dans "Mon Profil".
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>ℹ️ Clés API Groq:</Text>
              <Text style={styles.infoSteps}>1. Visitez console.groq.com</Text>
              <Text style={styles.infoSteps}>2. Créez un compte gratuit</Text>
              <Text style={styles.infoSteps}>3. Générez une clé API</Text>
              <Text style={styles.infoSteps}>4. Collez-la ci-dessous</Text>
            </View>

            {groqKeys.map((key, index) => (
              <View key={index} style={styles.keyInputContainer}>
                <TextInput
                  style={styles.keyInput}
                  placeholder={`Clé Groq ${index + 1}`}
                  value={key}
                  onChangeText={(value) => updateGroqKey(index, value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={key.length > 0}
                />
                {groqKeys.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeGroqKeyField(index)}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={addGroqKeyField}>
              <Text style={styles.addButtonText}>+ Ajouter une clé</Text>
            </TouchableOpacity>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.testButton} onPress={testGroqKeys} disabled={testingGroq}>
                {testingGroq ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.testButtonText}>🧪 Tester</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButtonInline} onPress={saveGroqKeys}>
                <Text style={styles.saveButtonText}>💾 Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🖼️ Images</Text>
        <Text style={styles.sectionDescription}>
          Cette version utilise uniquement la Freebox (local) pour générer les images.
        </Text>

        {!isAdmin ? (
          <View style={styles.lockBox}>
            <Text style={styles.lockText}>
              🔒 La configuration de l’URL Freebox est réservée au compte admin ({ADMIN_EMAIL}).
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>💡 Configuration Freebox:</Text>
              <Text style={styles.infoSteps}>IP: 88.174.155.230</Text>
              <Text style={styles.infoSteps}>Port: 33437</Text>
            </View>

            <TextInput
              style={styles.keyInput}
              placeholder="URL Freebox"
              value={freeboxUrl}
              onChangeText={setFreeboxUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity style={styles.testButtonFull} onPress={testImageApi}>
              <Text style={styles.testButtonText}>🧪 Tester la connexion Freebox</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={saveImageApiConfig}>
              <Text style={styles.saveButtonText}>💾 Sauvegarder la configuration</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ À propos</Text>
        <View style={styles.aboutBox}>
          <Text style={styles.aboutText}>Version: 1.7.40</Text>
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
          <Text style={styles.featureItem}>✓ Groq (texte) - mode conversation immersif</Text>
          <Text style={styles.featureItem}>✓ 200 personnages diversifiés</Text>
          <Text style={styles.featureItem}>✓ Système de roleplay immersif</Text>
          <Text style={styles.featureItem}>✓ Système d'expérience et d'affection</Text>
          <Text style={styles.featureItem}>✓ Images Freebox (local)</Text>
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
  saveButtonInline: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
  lockBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  lockText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  lockTextSub: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  testButtonFull: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
});
