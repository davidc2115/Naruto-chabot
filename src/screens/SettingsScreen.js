import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import TextGenerationService from '../services/TextGenerationService';
import UserProfileService from '../services/UserProfileService';

export default function SettingsScreen({ navigation }) {
  const [apiKeys, setApiKeys] = useState(['']);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    loadSettings();
    loadProfile();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
    });
    return unsubscribe;
  }, [navigation]);

  const loadSettings = async () => {
    await TextGenerationService.loadGroqApiKeys();
    if (TextGenerationService.groq?.apiKeys?.length > 0) {
      setApiKeys(TextGenerationService.groq.apiKeys);
    }
    setLoading(false);
  };

  const loadProfile = async () => {
    const profile = await UserProfileService.getProfile();
    setUserProfile(profile);
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

    await TextGenerationService.saveGroqApiKeys(validKeys);
    Alert.alert('Succès', `${validKeys.length} clé(s) API sauvegardée(s) avec succès!`);
  };

  const testKeys = async () => {
    const validKeys = apiKeys.filter(key => key.trim() !== '');
    
    if (validKeys.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins une clé API valide.');
      return;
    }

    await TextGenerationService.saveGroqApiKeys(validKeys);
    
    try {
      await TextGenerationService.testGroqKeys();
      Alert.alert('Succès', 'Les clés API fonctionnent correctement!');
    } catch (error) {
      Alert.alert('Erreur', `Échec du test: ${error.message}`);
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
        <Text style={styles.sectionTitle}>ℹ️ À propos</Text>
        <View style={styles.aboutBox}>
          <Text style={styles.aboutText}>Version: 2.0.0</Text>
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
});
