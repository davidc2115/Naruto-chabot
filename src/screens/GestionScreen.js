import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GestionScreen({ navigation }) {
  const [stats, setStats] = useState({
    totalCharacters: 0,
    totalConversations: 0,
    totalImages: 0,
    storageUsed: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Charger les statistiques depuis AsyncStorage
      const conversations = await AsyncStorage.getItem('conversations');
      const conversationsData = conversations ? JSON.parse(conversations) : [];
      
      const images = await AsyncStorage.getItem('gallery_images');
      const imagesData = images ? JSON.parse(images) : [];

      setStats({
        totalCharacters: 400, // Nombre de personnages dans enhancedCharacters
        totalConversations: conversationsData.length,
        totalImages: imagesData.length,
        storageUsed: 'Calcul en cours...',
      });
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Vider le cache',
      'Voulez-vous vraiment vider le cache de l\'application?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('✅ Succès', 'Cache vidé avec succès');
              loadStats();
            } catch (error) {
              Alert.alert('❌ Erreur', 'Impossible de vider le cache');
            }
          },
        },
      ]
    );
  };

  const handleResetApp = async () => {
    Alert.alert(
      'Réinitialiser l\'application',
      '⚠️ Cette action va supprimer toutes vos données. Êtes-vous sûr?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('✅ Succès', 'Application réinitialisée. Redémarrage...');
              // Redémarrer l'application
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            } catch (error) {
              Alert.alert('❌ Erreur', 'Impossible de réinitialiser');
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    Alert.alert('📤 Export des données', 'Fonctionnalité en développement');
  };

  const handleImportData = async () => {
    Alert.alert('📥 Import des données', 'Fonctionnalité en développement');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#6366f1', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <ScrollView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
        <View style={{ padding: 20, paddingTop: 15, backgroundColor: '#6366f1' }}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#fff' }}>⚙️ Gestion</Text>
          <Text style={{ fontSize: 14, color: '#e0e7ff', marginTop: 5 }}>
            Gérez votre application et vos données
          </Text>
        </View>

        {/* Statistiques */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Statistiques</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalCharacters}</Text>
              <Text style={styles.statLabel}>Personnages</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalConversations}</Text>
              <Text style={styles.statLabel}>Conversations</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalImages}</Text>
              <Text style={styles.statLabel}>Images</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.storageUsed}</Text>
              <Text style={styles.statLabel}>Stockage</Text>
            </View>
          </View>
        </View>

        {/* Gestion des données */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Gestion des données</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
            <Text style={styles.actionIcon}>📤</Text>
            <Text style={styles.actionText}>Exporter les données</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleImportData}>
            <Text style={styles.actionIcon}>📥</Text>
            <Text style={styles.actionText}>Importer les données</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleClearCache}>
            <Text style={styles.actionIcon}>🧹</Text>
            <Text style={styles.actionText}>Vider le cache</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Actions dangereuses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Actions dangereuses</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]} 
            onPress={handleResetApp}
          >
            <Text style={styles.actionIcon}>🔄</Text>
            <Text style={[styles.actionText, styles.dangerText]}>Réinitialiser l'application</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Informations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Informations</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Version: 3.7.10</Text>
            <Text style={styles.infoText}>Application de roleplay conversationnel</Text>
            <Text style={styles.infoText}>400+ personnages disponibles</Text>
            <Text style={styles.infoText}>Génération de texte: Groq API</Text>
            <Text style={styles.infoText}>Génération d'image: Pollinations.ai</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  actionArrow: {
    fontSize: 20,
    color: '#9ca3af',
  },
  dangerButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  dangerText: {
    color: '#dc2626',
  },
  infoBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
});
