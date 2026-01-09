import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';
import UserProfileService from '../services/UserProfileService';

/**
 * Écran de paramètres pour les utilisateurs non-admin
 * - Déconnexion
 * - Mode NSFW (si majeur)
 * - Lien Discord (si majeur)
 */
export default function UserSettingsScreen({ navigation, onLogout }) {
  const [userProfile, setUserProfile] = useState(null);
  const [nsfwMode, setNsfwMode] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [loading, setLoading] = useState(true);

  const DISCORD_INVITE = 'https://discord.gg/9KHCqSmz';

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserData = async () => {
    try {
      // Charger le profil depuis AuthService
      const authUser = AuthService.getCurrentUser();
      const authProfile = authUser?.profile;
      
      // Charger aussi depuis UserProfileService (local)
      const localProfile = await UserProfileService.getProfile();
      
      const profile = authProfile || localProfile;
      setUserProfile(profile);
      
      if (profile) {
        const age = profile.age || 0;
        setIsAdult(age >= 18);
        setNsfwMode(profile.nsfwMode || false);
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNSFWToggle = async (value) => {
    if (!isAdult) {
      Alert.alert('Accès restreint', 'Le mode NSFW est réservé aux utilisateurs majeurs (18+).');
      return;
    }

    try {
      setNsfwMode(value);
      
      // Sauvegarder localement
      const updatedProfile = { ...userProfile, nsfwMode: value };
      await UserProfileService.saveProfile(updatedProfile);
      
      // Sauvegarder sur le serveur
      await AuthService.updateProfile(updatedProfile);
      
      setUserProfile(updatedProfile);
      
      Alert.alert(
        value ? '🔞 Mode NSFW activé' : '✅ Mode NSFW désactivé',
        value 
          ? 'Vous avez maintenant accès aux contenus adultes.' 
          : 'Les contenus adultes sont masqués.'
      );
    } catch (error) {
      console.error('Erreur toggle NSFW:', error);
      setNsfwMode(!value); // Revert
    }
  };

  const handleOpenDiscord = () => {
    if (!isAdult) {
      Alert.alert('Accès restreint', 'Le serveur Discord est réservé aux utilisateurs majeurs (18+).');
      return;
    }
    
    Alert.alert(
      '🎮 Rejoindre Discord',
      '⚠️ ATTENTION: Ce serveur Discord est un espace communautaire NSFW réservé exclusivement aux adultes (18+).\n\nEn rejoignant, vous confirmez avoir au moins 18 ans.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Je confirme avoir 18+', 
          onPress: () => Linking.openURL(DISCORD_INVITE)
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      '🚪 Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.logout();
              // Appeler le callback de déconnexion de App.js
              if (onLogout) {
                onLogout();
              }
            } catch (error) {
              console.error('Erreur déconnexion:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          }
        }
      ]
    );
  };

  const currentUser = AuthService.getCurrentUser();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Paramètres</Text>
      </View>

      {/* PROFIL */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Mon Compte</Text>
        
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {userProfile?.username?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {userProfile?.username || 'Utilisateur'}
            </Text>
            <Text style={styles.profileEmail}>
              {currentUser?.email || 'Non connecté'}
            </Text>
            {userProfile?.age && (
              <Text style={styles.profileAge}>
                {userProfile.age} ans • {isAdult ? '✅ Majeur' : '🔒 Mineur'}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => navigation.navigate('UserProfile')}
        >
          <Text style={styles.editProfileButtonText}>✏️ Modifier mon profil</Text>
        </TouchableOpacity>
      </View>

      {/* MODE NSFW */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔞 Contenu Adulte</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Mode NSFW</Text>
            <Text style={styles.settingDescription}>
              {isAdult 
                ? 'Activer les contenus réservés aux adultes'
                : '⚠️ Réservé aux utilisateurs de 18 ans et plus'}
            </Text>
          </View>
          <Switch
            value={nsfwMode}
            onValueChange={handleNSFWToggle}
            disabled={!isAdult}
            trackColor={{ false: '#e5e7eb', true: '#c4b5fd' }}
            thumbColor={nsfwMode ? '#8b5cf6' : '#9ca3af'}
          />
        </View>

        {!isAdult && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              🔒 Vous devez avoir au moins 18 ans pour accéder aux contenus adultes.
            </Text>
          </View>
        )}
      </View>

      {/* DISCORD */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎮 Communauté</Text>
        
        <TouchableOpacity
          style={[styles.discordButton, !isAdult && styles.discordButtonDisabled]}
          onPress={handleOpenDiscord}
          disabled={!isAdult}
        >
          <Text style={styles.discordButtonIcon}>🎮</Text>
          <View style={styles.discordButtonContent}>
            <Text style={styles.discordButtonTitle}>Rejoindre Discord</Text>
            <Text style={styles.discordButtonSubtitle}>
              {isAdult 
                ? '🔞 Serveur communautaire NSFW - Adultes uniquement'
                : '🔒 Réservé aux majeurs (18+)'}
            </Text>
          </View>
          <Text style={styles.discordButtonArrow}>→</Text>
        </TouchableOpacity>

        {!isAdult && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              🔒 Le serveur Discord est un espace NSFW réservé exclusivement aux adultes de 18 ans et plus.
            </Text>
          </View>
        )}
      </View>

      {/* DÉCONNEXION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚪 Session</Text>
        
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>🚪 Se déconnecter</Text>
        </TouchableOpacity>
        
        <Text style={styles.logoutHint}>
          Vos données seront conservées et vous pourrez vous reconnecter à tout moment.
        </Text>
      </View>

      {/* À PROPOS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ À propos</Text>
        <View style={styles.aboutBox}>
          <Text style={styles.aboutText}>Version: 3.5.0</Text>
          <Text style={styles.aboutText}>Roleplay Chat - Application de conversation</Text>
          <Text style={styles.aboutText}>150+ personnages disponibles</Text>
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
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#6366f1',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
  },
  // Profil
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  profileAge: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  editProfileButton: {
    backgroundColor: '#f3f4f6',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  editProfileButtonText: {
    color: '#6366f1',
    fontSize: 15,
    fontWeight: '600',
  },
  // Settings Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  // Warning
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  warningText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
  },
  // Discord
  discordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5865F2',
    padding: 15,
    borderRadius: 12,
  },
  discordButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  discordButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  discordButtonContent: {
    flex: 1,
  },
  discordButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  discordButtonSubtitle: {
    fontSize: 12,
    color: '#e0e0e0',
    marginTop: 2,
  },
  discordButtonArrow: {
    fontSize: 20,
    color: '#fff',
  },
  // Logout
  logoutButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 10,
  },
  // About
  aboutBox: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
  },
  aboutText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
});
