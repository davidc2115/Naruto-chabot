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
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';
import UserProfileService from '../services/UserProfileService';
import CustomImageAPIService from '../services/CustomImageAPIService';
import StableDiffusionLocalService from '../services/StableDiffusionLocalService';

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
  
  // États pour Stable Diffusion Local
  const [imageStrategy, setImageStrategy] = useState('freebox'); // 'freebox' ou 'local'
  const [sdAvailability, setSdAvailability] = useState(null);
  const [sdDownloading, setSdDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  const DISCORD_INVITE = 'https://discord.gg/9KHCqSmz';

  useEffect(() => {
    loadUserData();
    loadImageSettings();
    checkPremiumStatus();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
      loadImageSettings();
      checkPremiumStatus();
    });
    return unsubscribe;
  }, [navigation]);

  const checkPremiumStatus = async () => {
    try {
      const premiumStatus = await AuthService.checkPremiumStatus();
      setIsPremium(premiumStatus);
    } catch (error) {
      console.error('Erreur vérification premium:', error);
      setIsPremium(AuthService.isPremium());
    }
  };

  const loadImageSettings = async () => {
    try {
      await CustomImageAPIService.loadConfig();
      setImageStrategy(CustomImageAPIService.getStrategy());
      
      // Vérifier la disponibilité de SD Local
      const availability = await StableDiffusionLocalService.checkAvailability();
      setSdAvailability(availability);
    } catch (error) {
      console.error('Erreur chargement config images:', error);
    }
  };

  const handleImageStrategyChange = async (newStrategy) => {
    if (newStrategy === 'local' && !isPremium) {
      Alert.alert(
        '💎 Premium Requis',
        'La génération d\'images sur smartphone est réservée aux membres Premium.'
      );
      return;
    }

    if (newStrategy === 'local' && (!sdAvailability?.available || !sdAvailability?.modelDownloaded)) {
      Alert.alert(
        '📱 Stable Diffusion Non Disponible',
        'Vous devez d\'abord télécharger le modèle SD pour utiliser la génération locale.\n\nVoulez-vous le télécharger maintenant ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Télécharger', onPress: handleDownloadSD }
        ]
      );
      return;
    }

    try {
      setImageStrategy(newStrategy);
      await CustomImageAPIService.saveConfig(
        CustomImageAPIService.getApiUrl(),
        newStrategy === 'local' ? 'local' : 'freebox',
        newStrategy
      );
      
      Alert.alert(
        '✅ Configuration Sauvegardée',
        newStrategy === 'local'
          ? 'Les images seront générées directement sur votre smartphone.'
          : 'Les images seront générées via le serveur Freebox.'
      );
    } catch (error) {
      console.error('Erreur changement stratégie:', error);
      Alert.alert('Erreur', 'Impossible de changer la configuration');
    }
  };

  const handleDownloadSD = async () => {
    if (!isPremium) {
      Alert.alert(
        '💎 Premium Requis',
        'Le téléchargement de Stable Diffusion est réservé aux membres Premium.'
      );
      return;
    }

    Alert.alert(
      '📥 Téléchargement SD-Turbo',
      'Cela va télécharger le modèle SD-Turbo (~2 Go).\n\nAssurez-vous d\'avoir:\n• Une bonne connexion WiFi\n• Suffisamment d\'espace de stockage\n• Un appareil compatible (4+ Go RAM)',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Télécharger',
          onPress: async () => {
            try {
              setSdDownloading(true);
              setDownloadProgress(0);
              
              await StableDiffusionLocalService.downloadModel((progress) => {
                // progress est en pourcentage (0-100)
                setDownloadProgress(progress / 100);
              });
              
              setSdDownloading(false);
              
              // Recharger la disponibilité
              const availability = await StableDiffusionLocalService.checkAvailability();
              setSdAvailability(availability);
              
              Alert.alert('✅ Téléchargement Terminé', 'Le modèle SD-Turbo est prêt à utiliser !');
            } catch (error) {
              setSdDownloading(false);
              console.error('Erreur téléchargement SD:', error);
              Alert.alert('❌ Erreur', 'Le téléchargement a échoué: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const handleDeleteSD = async () => {
    Alert.alert(
      '🗑️ Supprimer Stable Diffusion',
      'Voulez-vous supprimer le modèle SD-Turbo de votre appareil ?\n\nCela libérera environ 2 Go d\'espace.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await StableDiffusionLocalService.deleteModel();
              
              // Revenir à Freebox
              setImageStrategy('freebox');
              await CustomImageAPIService.saveConfig(
                CustomImageAPIService.getApiUrl(),
                'freebox',
                'freebox'
              );
              
              // Recharger la disponibilité
              const availability = await StableDiffusionLocalService.checkAvailability();
              setSdAvailability(availability);
              
              Alert.alert('✅ Supprimé', 'Le modèle SD a été supprimé de votre appareil.');
            } catch (error) {
              console.error('Erreur suppression SD:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le modèle');
            }
          }
        }
      ]
    );
  };

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

      {/* PREMIUM */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💎 Premium</Text>
        
        <TouchableOpacity
          style={styles.premiumButton}
          onPress={() => navigation.navigate('Premium')}
        >
          <View style={styles.premiumContent}>
            <Text style={styles.premiumIcon}>⭐</Text>
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumTitle}>
                {AuthService.isPremium() ? 'Vous êtes Premium !' : 'Devenir Premium'}
              </Text>
              <Text style={styles.premiumDesc}>
                {AuthService.isPremium() 
                  ? 'Accédez à vos avantages'
                  : 'Génération d\'images illimitée'}
              </Text>
            </View>
            <Text style={styles.premiumArrow}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* GÉNÉRATION D'IMAGES */}
      {isPremium && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🖼️ Génération d'Images</Text>
          
          <Text style={styles.sectionSubtitle}>Méthode de génération</Text>
          
          <View style={styles.strategyOptions}>
            <TouchableOpacity
              style={[
                styles.strategyOption,
                imageStrategy === 'freebox' && styles.strategyOptionActive
              ]}
              onPress={() => handleImageStrategyChange('freebox')}
            >
              <Text style={styles.strategyIcon}>🏠</Text>
              <Text style={[
                styles.strategyLabel,
                imageStrategy === 'freebox' && styles.strategyLabelActive
              ]}>
                Freebox
              </Text>
              <Text style={styles.strategyDesc}>Via serveur</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.strategyOption,
                imageStrategy === 'local' && styles.strategyOptionActive
              ]}
              onPress={() => handleImageStrategyChange('local')}
            >
              <Text style={styles.strategyIcon}>📱</Text>
              <Text style={[
                styles.strategyLabel,
                imageStrategy === 'local' && styles.strategyLabelActive
              ]}>
                Local
              </Text>
              <Text style={styles.strategyDesc}>Sur smartphone</Text>
            </TouchableOpacity>
          </View>

          {/* Status Stable Diffusion */}
          <View style={styles.sdStatusBox}>
            <Text style={styles.sdStatusTitle}>📱 Stable Diffusion Local</Text>
            
            {sdAvailability ? (
              <View style={styles.sdStatusContent}>
                <View style={styles.sdStatusRow}>
                  <Text style={styles.sdStatusLabel}>Compatible:</Text>
                  <Text style={[
                    styles.sdStatusValue,
                    { color: sdAvailability.canRunSD ? '#10b981' : '#ef4444' }
                  ]}>
                    {sdAvailability.canRunSD ? '✅ Oui' : '❌ Non'}
                  </Text>
                </View>
                <View style={styles.sdStatusRow}>
                  <Text style={styles.sdStatusLabel}>Modèle téléchargé:</Text>
                  <Text style={[
                    styles.sdStatusValue,
                    { color: sdAvailability.modelDownloaded ? '#10b981' : '#f59e0b' }
                  ]}>
                    {sdAvailability.modelDownloaded ? '✅ Oui' : '⬇️ Non'}
                  </Text>
                </View>
                {sdAvailability.deviceInfo && (
                  <View style={styles.sdStatusRow}>
                    <Text style={styles.sdStatusLabel}>RAM disponible:</Text>
                    <Text style={styles.sdStatusValue}>
                      {sdAvailability.deviceInfo.totalMemory 
                        ? `${Math.round(sdAvailability.deviceInfo.totalMemory / 1024 / 1024 / 1024)} Go`
                        : 'N/A'}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <ActivityIndicator color="#6366f1" style={{ marginTop: 10 }} />
            )}
            
            {/* Boutons SD */}
            <View style={styles.sdButtonsRow}>
              {!sdAvailability?.modelDownloaded ? (
                <TouchableOpacity
                  style={[styles.sdDownloadButton, sdDownloading && styles.sdButtonDisabled]}
                  onPress={handleDownloadSD}
                  disabled={sdDownloading}
                >
                  {sdDownloading ? (
                    <View style={styles.sdDownloadingContent}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.sdDownloadButtonText}>
                        {Math.round(downloadProgress * 100)}%
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.sdDownloadButtonText}>
                      📥 Télécharger SD-Turbo (~2 Go)
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.sdDeleteButton}
                  onPress={handleDeleteSD}
                >
                  <Text style={styles.sdDeleteButtonText}>
                    🗑️ Supprimer le modèle
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={styles.sdInfoText}>
              ℹ️ La génération locale nécessite un smartphone puissant (4+ Go RAM).
              Les images sont générées directement sur votre appareil sans passer par un serveur.
            </Text>
          </View>
        </View>
      )}

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
          <Text style={styles.aboutText}>Version: 3.7.5</Text>
          <Text style={styles.aboutText}>Roleplay Chat - Application de conversation</Text>
          <Text style={styles.aboutText}>400+ personnages disponibles</Text>
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
  // Premium
  premiumButton: {
    backgroundColor: '#fef3c7',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  premiumInfo: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
  },
  premiumDesc: {
    fontSize: 13,
    color: '#b45309',
    marginTop: 2,
  },
  premiumArrow: {
    fontSize: 20,
    color: '#92400e',
    fontWeight: 'bold',
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
  // Section subtitle
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 10,
  },
  // Strategy options for image generation
  strategyOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  strategyOption: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  strategyOptionActive: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  strategyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  strategyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  strategyLabelActive: {
    color: '#6366f1',
  },
  strategyDesc: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  // SD Status box
  sdStatusBox: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sdStatusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  sdStatusContent: {
    marginBottom: 15,
  },
  sdStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sdStatusLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  sdStatusValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  sdButtonsRow: {
    marginBottom: 10,
  },
  sdDownloadButton: {
    backgroundColor: '#6366f1',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  sdButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sdDownloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sdDownloadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sdDeleteButton: {
    backgroundColor: '#fee2e2',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  sdDeleteButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  sdInfoText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});
