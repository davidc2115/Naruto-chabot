import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DirectTextGenerationService from '../services/DirectTextGenerationService';
import SimpleSyncService from '../services/SimpleSyncService';

/**
 * Écran de configuration simplifié
 * - Génération de texte: intégrée dans l'APK (Pollinations.ai)
 * - Génération d'image: intégrée dans l'APK (Pollinations.ai)
 * - Synchronisation: comptes et images partagées sur Debian
 */
export default function SimpleSettingsScreen({ navigation, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState(false);
  const [selectedTextModel, setSelectedTextModel] = useState('mistral');
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Charger le modèle de texte
      await DirectTextGenerationService.loadSelectedModel();
      const currentModel = DirectTextGenerationService.getCurrentModel();
      if (currentModel) {
        setSelectedTextModel(currentModel.id);
      }

      // Charger les paramètres de sync
      const syncStatus = await AsyncStorage.getItem('sync_enabled');
      setSyncEnabled(syncStatus !== 'false');

      // Initialiser le service de sync
      await SimpleSyncService.init();
      setUserId(SimpleSyncService.userId);

      // Vérifier le statut du serveur
      const isOnline = await SimpleSyncService.checkServerStatus();
      setServerOnline(isOnline);

    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextModelChange = async (modelId) => {
    try {
      await DirectTextGenerationService.selectModel(modelId);
      setSelectedTextModel(modelId);
      Alert.alert('✅ Succès', `Modèle ${modelId} sélectionné`);
    } catch (error) {
      Alert.alert('❌ Erreur', error.message);
    }
  };

  const handleSyncToggle = async () => {
    try {
      const newValue = !syncEnabled;
      setSyncEnabled(newValue);
      await AsyncStorage.setItem('sync_enabled', newValue.toString());
      Alert.alert('✅ Succès', newValue ? 'Synchronisation activée' : 'Synchronisation désactivée');
    } catch (error) {
      Alert.alert('❌ Erreur', error.message);
    }
  };

  const handleCheckServer = async () => {
    setLoading(true);
    try {
      const isOnline = await SimpleSyncService.checkServerStatus();
      setServerOnline(isOnline);
      Alert.alert(
        isOnline ? '✅ Serveur en ligne' : '❌ Serveur hors ligne',
        isOnline ? 'Le serveur Debian est accessible' : 'Impossible de contacter le serveur Debian'
      );
    } catch (error) {
      Alert.alert('❌ Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: () => {
            if (onLogout) onLogout();
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.center}>
          <Text>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 Génération de texte</Text>
          <Text style={styles.sectionDescription}>
            Intégré dans l'APK - Gratuit et illimité (Pollinations.ai)
          </Text>

          <View style={styles.option}>
            <Text style={styles.optionLabel}>Modèle</Text>
            {DirectTextGenerationService.getAvailableModels().map(model => (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.modelButton,
                  selectedTextModel === model.id && styles.modelButtonActive
                ]}
                onPress={() => handleTextModelChange(model.id)}
              >
                <Text style={[
                  styles.modelButtonText,
                  selectedTextModel === model.id && styles.modelButtonTextActive
                ]}>
                  {model.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Génération d'image</Text>
          <Text style={styles.sectionDescription}>
            Intégré dans l'APK - Gratuit et illimité (Pollinations.ai)
          </Text>
          <View style={styles.option}>
            <Text style={styles.optionLabel}>Statut</Text>
            <Text style={styles.optionValue}>✓ Actif</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>☁️ Synchronisation</Text>
          <Text style={styles.sectionDescription}>
            Sauvegarde des comptes et images partagées sur Debian
          </Text>

          <View style={styles.option}>
            <Text style={styles.optionLabel}>Statut serveur</Text>
            <TouchableOpacity onPress={handleCheckServer}>
              <Text style={[styles.optionValue, serverOnline ? styles.online : styles.offline]}>
                {serverOnline ? '● En ligne' : '● Hors ligne'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.option}>
            <Text style={styles.optionLabel}>ID utilisateur</Text>
            <Text style={styles.optionValue}>{userId?.substring(0, 20)}...</Text>
          </View>

          <View style={styles.option}>
            <Text style={styles.optionLabel}>Synchronisation</Text>
            <TouchableOpacity
              style={[styles.toggle, syncEnabled && styles.toggleActive]}
              onPress={handleSyncToggle}
            >
              <Text style={styles.toggleText}>{syncEnabled ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
  },
  optionValue: {
    fontSize: 16,
    color: '#666',
  },
  online: {
    color: '#4CAF50',
  },
  offline: {
    color: '#F44336',
  },
  modelButton: {
    padding: 10,
    margin: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    minWidth: 100,
    alignItems: 'center',
  },
  modelButtonActive: {
    backgroundColor: '#2196F3',
  },
  modelButtonText: {
    color: '#333',
    fontSize: 14,
  },
  modelButtonTextActive: {
    color: 'white',
  },
  toggle: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#ccc',
    minWidth: 60,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleText: {
    color: 'white',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#F44336',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
