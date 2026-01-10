import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import StorageService from '../services/StorageService';
import ImageGenerationService from '../services/ImageGenerationService';
import CustomCharacterService from '../services/CustomCharacterService';
import GalleryService from '../services/GalleryService';
import UserProfileService from '../services/UserProfileService';
import AuthService from '../services/AuthService';

export default function CharacterDetailScreen({ route, navigation }) {
  const { character } = route.params;
  const [relationship, setRelationship] = useState(null);
  const [hasConversation, setHasConversation] = useState(false);
  const [characterImage, setCharacterImage] = useState(null);
  const [loadingImage, setLoadingImage] = useState(true);
  const [gallery, setGallery] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    initializeScreen();
    navigation.setOptions({ title: character.name });
    
    // Recharger la galerie quand on revient sur cet écran
    const unsubscribe = navigation.addListener('focus', () => {
      loadGallery();
      loadUserProfile();
      checkPremiumStatus();
    });
    
    return unsubscribe;
  }, [character]);

  const initializeScreen = async () => {
    loadCharacterData();
    loadGallery();
    loadUserProfile();
    
    // Vérifier le statut premium avant de générer l'image
    const premiumStatus = await checkPremiumStatus();
    console.log('🎫 Premium status:', premiumStatus);
    
    if (premiumStatus) {
      // Passer le statut premium directement pour éviter les problèmes de timing
      generateCharacterImage(true);
    } else {
      setLoadingImage(false);
      // Charger une image existante de la galerie si disponible
      const existingGallery = await GalleryService.getGallery(character.id);
      if (existingGallery && existingGallery.length > 0) {
        setCharacterImage(existingGallery[0]);
      }
    }
  };

  const checkPremiumStatus = async () => {
    try {
      // Vérifier d'abord localement (admin = premium automatiquement)
      const user = AuthService.getCurrentUser();
      const isAdmin = user?.is_admin || user?.email?.toLowerCase() === 'douvdouv21@gmail.com';
      
      if (isAdmin) {
        console.log('👑 Admin détecté - Premium automatique');
        setIsPremium(true);
        return true;
      }
      
      const localPremium = AuthService.isPremium();
      setIsPremium(localPremium);
      
      // Puis vérifier côté serveur
      const serverPremium = await AuthService.checkPremiumStatus();
      setIsPremium(serverPremium);
      console.log('💎 Premium server check:', serverPremium);
      return serverPremium;
    } catch (error) {
      console.error('Erreur vérification premium:', error);
      // En cas d'erreur, vérifier si admin
      const user = AuthService.getCurrentUser();
      const isAdmin = user?.is_admin || user?.email?.toLowerCase() === 'douvdouv21@gmail.com';
      const fallback = isAdmin || AuthService.isPremium();
      setIsPremium(fallback);
      return fallback;
    }
  };

  const loadUserProfile = async () => {
    const profile = await UserProfileService.getProfile();
    setUserProfile(profile);
  };

  const loadGallery = async () => {
    const images = await GalleryService.getGallery(character.id);
    setGallery(images);
  };

  const loadCharacterData = async () => {
    const rel = await StorageService.loadRelationship(character.id);
    setRelationship(rel);

    const conv = await StorageService.loadConversation(character.id);
    setHasConversation(conv !== null && conv.messages.length > 0);
  };

  const generateCharacterImage = async (forceAllowed = false) => {
    // Vérifier le statut premium (utiliser le paramètre ou l'état)
    const canGenerate = forceAllowed || isPremium;
    
    if (!canGenerate) {
      Alert.alert(
        '💎 Fonctionnalité Premium',
        'La génération d\'images est réservée aux membres Premium.\n\nDevenez Premium pour voir vos personnages prendre vie !',
        [
          { text: 'Plus tard', style: 'cancel' },
          { 
            text: 'Devenir Premium', 
            onPress: () => navigation.navigate('Premium')
          }
        ]
      );
      return;
    }

    try {
      setLoadingImage(true);
      console.log('🎨 Génération image pour:', character.name);
      
      // Charger le profil utilisateur pour le mode NSFW
      const profile = userProfile || await UserProfileService.getProfile();
      const imageUrl = await ImageGenerationService.generateCharacterImage(character, profile);
      
      console.log('✅ Image générée:', imageUrl ? 'OK' : 'Échec');
      setCharacterImage(imageUrl);
      
      // SAUVEGARDER l'image dans la galerie du personnage
      if (imageUrl) {
        await GalleryService.saveImageToGallery(character.id, imageUrl);
        // Recharger la galerie pour afficher la nouvelle image
        await loadGallery();
      }
    } catch (error) {
      console.error('❌ Error generating image:', error);
      if (error.message?.includes('Premium') || error.message?.includes('403')) {
        Alert.alert(
          '💎 Premium Requis',
          'Vous devez être membre Premium pour générer des images.'
        );
      } else {
        // Essayer de charger une image existante
        const existingGallery = await GalleryService.getGallery(character.id);
        if (existingGallery && existingGallery.length > 0) {
          setCharacterImage(existingGallery[0]);
        }
      }
    } finally {
      setLoadingImage(false);
    }
  };

  const startConversation = () => {
    // Vérification avant navigation
    if (!character || !character.id) {
      Alert.alert('Erreur', 'Impossible de démarrer la conversation. Personnage invalide.');
      console.error('❌ Tentative de démarrer conversation avec character invalide:', character);
      return;
    }
    
    console.log('✅ Démarrage conversation:', character.name, 'ID:', character.id);
    navigation.navigate('Conversation', { character });
  };

  const startNewConversation = () => {
    Alert.alert(
      'Nouvelle conversation',
      'Voulez-vous vraiment démarrer une nouvelle conversation ? L\'ancienne conversation sera perdue.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Nouvelle conversation',
          style: 'destructive',
          onPress: async () => {
            // Supprimer l'ancienne conversation
            await StorageService.deleteConversation(character.id);
            setHasConversation(false);
            // Démarrer une nouvelle conversation
            startConversation();
          }
        }
      ]
    );
  };

  const resumeConversation = () => {
    if (!character || !character.id) {
      Alert.alert('Erreur', 'Impossible de reprendre la conversation. Personnage invalide.');
      return;
    }
    
    console.log('✅ Reprise conversation:', character.name, 'ID:', character.id);
    navigation.navigate('Conversation', { character });
  };

  const handleEditCharacter = () => {
    if (character.isCustom) {
      navigation.navigate('CreateCharacter', { characterToEdit: character });
    } else {
      Alert.alert('Info', 'Seuls les personnages personnalisés peuvent être modifiés');
    }
  };

  const handleDeleteCharacter = async () => {
    if (!character.isCustom) {
      Alert.alert('Info', 'Seuls les personnages personnalisés peuvent être supprimés');
      return;
    }

    Alert.alert(
      'Supprimer le personnage',
      `Voulez-vous vraiment supprimer ${character.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await CustomCharacterService.deleteCustomCharacter(character.id);
              Alert.alert('Succès', 'Personnage supprimé', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le personnage');
            }
          }
        }
      ]
    );
  };

  const getRelationshipLevel = () => {
    if (!relationship) return 'Inconnu';
    const level = relationship.level;
    if (level < 5) return 'Connaissance';
    if (level < 10) return 'Ami';
    if (level < 15) return 'Proche';
    if (level < 20) return 'Très proche';
    return 'Âme sœur';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        {loadingImage && isPremium ? (
          <View style={styles.imagePlaceholder}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Génération de l'image...</Text>
          </View>
        ) : characterImage ? (
          <Image source={{ uri: characterImage }} style={styles.characterImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.avatarLarge}>
              {character.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{character.name}</Text>
            <Text style={styles.info}>
              {character.age} ans • {
                character.gender === 'male' ? 'Homme' :
                character.gender === 'female' ? 'Femme' :
                'Non-binaire'
              }
              {character.gender === 'female' && character.bust && ` • Bonnet ${character.bust}`}
              {character.gender === 'male' && character.penis && ` • ${character.penis}`}
            </Text>
          </View>
          {isPremium && (
            <TouchableOpacity
              style={styles.refreshImageButton}
              onPress={generateCharacterImage}
            >
              <Text style={styles.refreshImageText}>🔄</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tagsContainer}>
          {character.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💭 Tempérament</Text>
          <Text style={styles.sectionContent}>
            {character.temperament.charAt(0).toUpperCase() + character.temperament.slice(1)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Apparence physique</Text>
          {/* Afficher la description principale */}
          {(character.physicalDescription || character.appearance) ? (
            <Text style={styles.sectionContent}>
              {character.physicalDescription || character.appearance}
            </Text>
          ) : (
            // Construire une description à partir des champs disponibles
            <Text style={styles.sectionContent}>
              {[
                character.gender === 'female' ? 'Femme' : character.gender === 'male' ? 'Homme' : 'Personne',
                character.age ? `de ${character.age} ans` : null,
                character.height ? `mesurant ${character.height}` : null,
                character.bodyType ? `au corps ${character.bodyType}` : null,
                character.hairColor || character.hairLength ? `cheveux ${[character.hairColor, character.hairLength].filter(Boolean).join(' ')}` : null,
                character.eyeColor ? `yeux ${character.eyeColor}` : null,
              ].filter(Boolean).join(', ') || 'Description non disponible'}
            </Text>
          )}
          {/* Détails supplémentaires */}
          {character.hairColor && !character.appearance?.toLowerCase().includes('cheveux') && (
            <Text style={styles.attributeDetail}>• Cheveux : {character.hairColor} {character.hairLength || ''}</Text>
          )}
          {character.eyeColor && !character.appearance?.toLowerCase().includes('yeux') && (
            <Text style={styles.attributeDetail}>• Yeux : {character.eyeColor}</Text>
          )}
          {character.height && !character.appearance?.toLowerCase().includes('cm') && (
            <Text style={styles.attributeDetail}>• Taille : {character.height}</Text>
          )}
          {character.bodyType && (
            <Text style={styles.attributeDetail}>• Morphologie : {character.bodyType}</Text>
          )}
          {character.gender === 'female' && character.bust && (
            <Text style={styles.attributeDetail}>• Poitrine : Bonnet {character.bust}</Text>
          )}
          {character.gender === 'male' && character.penis && (
            <Text style={styles.attributeDetail}>• Attribut : {character.penis} cm</Text>
          )}
        </View>

        {character.outfit && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👘 Tenue</Text>
            <Text style={styles.sectionContent}>{character.outfit}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎭 Personnalité</Text>
          <Text style={styles.sectionContent}>{character.personality}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📖 Scénario</Text>
          <Text style={styles.sectionContent}>
            {character.scenario || character.background || 'Pas de scénario défini'}
          </Text>
        </View>

        {/* Message d'accroche */}
        {(character.startMessage || character.greeting) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 Premier message</Text>
            <Text style={styles.sectionContent}>
              {character.startMessage || character.greeting}
            </Text>
          </View>
        )}

        {relationship && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💖 Relation</Text>
            <View style={styles.relationshipContainer}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Niveau:</Text>
                <View style={styles.statBar}>
                  <View style={[styles.statFill, { width: `${Math.min(relationship.level * 5, 100)}%` }]} />
                </View>
                <Text style={styles.statValue}>{relationship.level}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Affection:</Text>
                <View style={styles.statBar}>
                  <View style={[styles.statFill, { width: `${relationship.affection}%`, backgroundColor: '#ec4899' }]} />
                </View>
                <Text style={styles.statValue}>{relationship.affection}%</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Confiance:</Text>
                <View style={styles.statBar}>
                  <View style={[styles.statFill, { width: `${relationship.trust}%`, backgroundColor: '#10b981' }]} />
                </View>
                <Text style={styles.statValue}>{relationship.trust}%</Text>
              </View>
              <Text style={styles.relationshipLevel}>
                {getRelationshipLevel()}
              </Text>
              <Text style={styles.relationshipStats}>
                {relationship.interactions} interaction(s) • {relationship.experience} XP
              </Text>
            </View>
          </View>
        )}

        {/* Galerie d'images - TOUJOURS VISIBLE */}
        <View style={styles.section}>
          <View style={styles.gallerySectionHeader}>
            <Text style={styles.sectionTitle}>🖼️ Galerie</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Gallery', { character })}
            >
              <Text style={styles.seeAllText}>Voir tout ({gallery.length}) →</Text>
            </TouchableOpacity>
          </View>
          {gallery.length === 0 ? (
            <View style={styles.emptyGalleryContainer}>
              <Text style={styles.emptyGalleryIcon}>📸</Text>
              <Text style={styles.emptyGalleryText}>
                Aucune image pour le moment. Générez des images dans les conversations !
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.galleryPreview}>
                {gallery.map((imageUrl, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => navigation.navigate('Gallery', { character })}
                  >
                    <Image source={{ uri: imageUrl }} style={styles.galleryThumbnail} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        <View style={styles.buttonContainer}>
          {hasConversation ? (
            <>
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={resumeConversation}
              >
                <Text style={styles.resumeButtonText}>
                  💬 Reprendre la conversation
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.newConversationButton}
                onPress={startNewConversation}
              >
                <Text style={styles.newConversationButtonText}>
                  ✨ Nouvelle conversation
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startConversation}
            >
              <Text style={styles.startButtonText}>
                ✨ Commencer la conversation
              </Text>
            </TouchableOpacity>
          )}

          {character.isCustom && (
            <View style={styles.customButtonsRow}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditCharacter}
              >
                <Text style={styles.editButtonText}>✏️ Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteCharacter}
              >
                <Text style={styles.deleteButtonText}>🗑️ Supprimer</Text>
              </TouchableOpacity>
            </View>
          )}
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
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#e5e7eb',
  },
  characterImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLarge: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 5,
  },
  info: {
    fontSize: 16,
    color: '#6b7280',
  },
  refreshImageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshImageText: {
    fontSize: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  tagText: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  relationshipContainer: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 10,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    width: 80,
  },
  statBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  statFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    width: 40,
    textAlign: 'right',
  },
  relationshipLevel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
    textAlign: 'center',
    marginTop: 5,
  },
  relationshipStats: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 5,
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#6366f1',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  resumeButton: {
    backgroundColor: '#10b981',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  resumeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  newConversationButton: {
    backgroundColor: '#6366f1',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  newConversationButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  attributeDetail: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: 8,
  },
  customButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  gallerySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  galleryPreview: {
    flexDirection: 'row',
    gap: 10,
  },
  galleryThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
  emptyGalleryContainer: {
    padding: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyGalleryIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyGalleryText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
