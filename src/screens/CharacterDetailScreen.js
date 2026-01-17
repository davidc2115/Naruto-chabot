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
import LevelService from '../services/LevelService';

/**
 * Traduit le tempérament en français
 */
const translateTemperament = (temperament) => {
  if (!temperament) return 'Non défini';
  
  const translations = {
    'dominant': 'Dominant(e) et confiant(e)',
    'gentle': 'Doux/Douce et attentionné(e)',
    'shy': 'Timide et réservé(e)',
    'passionate': 'Passionné(e) et intense',
    'mysterious': 'Mystérieux/Mystérieuse et énigmatique',
    'playful': 'Joueur/Joueuse et espiègle',
    'caring': 'Bienveillant(e) et protecteur/protectrice',
    'flirtatious': 'Séducteur/Séductrice et charmeur/charmeuse',
    'direct': 'Direct(e) et franc/franche',
    'submissive': 'Soumis(e) et docile',
    'confident': 'Confiant(e) et assuré(e)',
    'romantic': 'Romantique et rêveur/rêveuse',
    'aggressive': 'Fougueux/Fougueuse et intense',
    'seductive': 'Séducteur/Séductrice',
    'innocent': 'Innocent(e) et naïf/naïve',
    'mature': 'Mature et posé(e)',
    'wild': 'Sauvage et imprévisible',
    'tender': 'Tendre et affectueux/affectueuse',
    'assertive': 'Affirmé(e) et déterminé(e)',
    'sensual': 'Sensuel(le) et voluptueux/voluptueuse',
    'audacieux': 'Audacieux/Audacieuse',
    'chaleureux': 'Chaleureux/Chaleureuse',
    'passionné': 'Passionné(e)',
  };
  
  const temp = temperament.toLowerCase().trim();
  if (translations[temp]) return translations[temp];
  
  for (const [key, value] of Object.entries(translations)) {
    if (temp.includes(key)) return value;
  }
  
  return temperament.charAt(0).toUpperCase() + temperament.slice(1);
};

export default function CharacterDetailScreen({ route, navigation }) {
  const { character } = route.params;
  const [relationship, setRelationship] = useState(null);
  const [hasConversation, setHasConversation] = useState(false);
  const [characterImage, setCharacterImage] = useState(null);
  const [loadingImage, setLoadingImage] = useState(true);
  const [gallery, setGallery] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showFullAppearance, setShowFullAppearance] = useState(false);

  useEffect(() => {
    initializeScreen();
    navigation.setOptions({ title: character.name });
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadCharacterData();
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
    
    const premiumStatus = await checkPremiumStatus();
    
    if (premiumStatus) {
      generateCharacterImage(true);
    } else {
      setLoadingImage(false);
      const existingGallery = await GalleryService.getGallery(character.id);
      if (existingGallery && existingGallery.length > 0) {
        setCharacterImage(existingGallery[0]);
      }
    }
  };

  const checkPremiumStatus = async () => {
    try {
      const user = AuthService.getCurrentUser();
      const isAdmin = user?.is_admin || user?.email?.toLowerCase() === 'douvdouv21@gmail.com';
      
      if (isAdmin) {
        setIsPremium(true);
        return true;
      }
      
      const localPremium = AuthService.isPremium();
      setIsPremium(localPremium);
      
      const serverPremium = await AuthService.checkPremiumStatus();
      setIsPremium(serverPremium);
      return serverPremium;
    } catch (error) {
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
    try {
      const levelData = await LevelService.getCharacterStats(character.id);
      setRelationship({
        level: levelData.level || 1,
        affection: Math.min((levelData.level || 1) * 10, 100),
        trust: Math.min((levelData.level || 1) * 8, 100),
        interactions: levelData.totalMessages || 0,
        experience: levelData.xp || 0,
      });
    } catch (error) {
      const rel = await StorageService.loadRelationship(character.id);
      setRelationship(rel);
    }

    const conv = await StorageService.loadConversation(character.id);
    setHasConversation(conv !== null && conv.messages.length > 0);
  };

  const generateCharacterImage = async (forceAllowed = false) => {
    const canGenerate = forceAllowed || isPremium;
    
    if (!canGenerate) {
      Alert.alert(
        '💎 Fonctionnalité Premium',
        'La génération d\'images est réservée aux membres Premium.',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Devenir Premium', onPress: () => navigation.navigate('Premium') }
        ]
      );
      return;
    }

    try {
      setLoadingImage(true);
      const profile = userProfile || await UserProfileService.getProfile();
      const imageUrl = await ImageGenerationService.generateCharacterImage(character, profile);
      
      setCharacterImage(imageUrl);
      
      if (imageUrl) {
        await GalleryService.saveImageToGallery(character.id, imageUrl);
        await loadGallery();
      }
    } catch (error) {
      console.error('❌ Error generating image:', error);
      const existingGallery = await GalleryService.getGallery(character.id);
      if (existingGallery && existingGallery.length > 0) {
        setCharacterImage(existingGallery[0]);
      }
    } finally {
      setLoadingImage(false);
    }
  };

  const startConversation = () => {
    if (!character || !character.id) {
      Alert.alert('Erreur', 'Impossible de démarrer la conversation.');
      return;
    }
    navigation.navigate('Conversation', { character });
  };

  const startNewConversation = () => {
    Alert.alert(
      'Nouvelle conversation',
      'L\'ancienne conversation sera perdue.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Nouvelle conversation',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteConversation(character.id);
            setHasConversation(false);
            startConversation();
          }
        }
      ]
    );
  };

  const resumeConversation = () => {
    if (!character || !character.id) return;
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

  // Rendu des détails de tempérament (format Bagbot v6)
  const renderTemperamentDetails = () => {
    const td = character.temperamentDetails;
    if (!td) return null;
    
    return (
      <View style={styles.temperamentDetailsContainer}>
        {td.emotionnel && (
          <View style={styles.temperamentItem}>
            <Text style={styles.temperamentLabel}>💗 Émotionnel</Text>
            <Text style={styles.temperamentText}>{td.emotionnel}</Text>
          </View>
        )}
        {td.seduction && (
          <View style={styles.temperamentItem}>
            <Text style={styles.temperamentLabel}>💋 Séduction</Text>
            <Text style={styles.temperamentText}>{td.seduction}</Text>
          </View>
        )}
        {td.intimite && (
          <View style={styles.temperamentItem}>
            <Text style={styles.temperamentLabel}>🔥 Intimité</Text>
            <Text style={styles.temperamentText}>{td.intimite}</Text>
          </View>
        )}
        {td.communication && (
          <View style={styles.temperamentItem}>
            <Text style={styles.temperamentLabel}>💬 Communication</Text>
            <Text style={styles.temperamentText}>{td.communication}</Text>
          </View>
        )}
        {td.reactions && (
          <View style={styles.temperamentItem}>
            <Text style={styles.temperamentLabel}>⚡ Réactions</Text>
            <Text style={styles.temperamentText}>{td.reactions}</Text>
          </View>
        )}
      </View>
    );
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
                character.gender === 'female' ? 'Femme' : 'Non-binaire'
              }
              {character.gender === 'female' && character.bust && ` • Bonnet ${character.bust}`}
            </Text>
          </View>
          {isPremium && (
            <TouchableOpacity
              style={styles.refreshImageButton}
              onPress={() => generateCharacterImage()}
            >
              <Text style={styles.refreshImageText}>🔄</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tagsContainer}>
          {(character.tags || []).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* TEMPÉRAMENT & PERSONNALITÉ - Format Bagbot v6 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💭 Tempérament & Personnalité</Text>
          
          {/* Tempérament principal traduit */}
          <View style={styles.temperamentMainBox}>
            <Text style={styles.temperamentMainText}>
              {translateTemperament(character.temperament)}
            </Text>
          </View>
          
          {/* Personnalité */}
          {character.personality && (
            <Text style={styles.sectionContent}>{character.personality}</Text>
          )}
          
          {/* Détails du tempérament (emotionnel, seduction, intimite, etc.) */}
          {character.temperamentDetails && renderTemperamentDetails()}
        </View>

        {/* DESCRIPTION PHYSIQUE - Format Bagbot v6 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Description Physique</Text>
          
          {/* physicalDescription résumée */}
          {character.physicalDescription && (
            <View style={styles.physicalDescBox}>
              <Text style={styles.physicalDescText}>{character.physicalDescription}</Text>
            </View>
          )}
          
          {/* Apparence détaillée (toggle) */}
          {character.appearance && character.appearance.length > 100 && (
            <>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowFullAppearance(!showFullAppearance)}
              >
                <Text style={styles.toggleButtonText}>
                  {showFullAppearance ? '📖 Masquer l\'apparence détaillée' : '📖 Voir l\'apparence détaillée'}
                </Text>
              </TouchableOpacity>
              
              {showFullAppearance && (
                <View style={styles.fullAppearanceBox}>
                  <Text style={styles.fullAppearanceText}>{character.appearance}</Text>
                </View>
              )}
            </>
          )}
          
          {/* Attributs en liste */}
          <View style={styles.attributesContainer}>
            {character.height && (
              <Text style={styles.attributeDetail}>• Taille : {character.height}</Text>
            )}
            {character.bodyType && (
              <Text style={styles.attributeDetail}>• Morphologie : {character.bodyType}</Text>
            )}
            {character.hairColor && (
              <Text style={styles.attributeDetail}>• Cheveux : {character.hairColor}</Text>
            )}
            {character.eyeColor && (
              <Text style={styles.attributeDetail}>• Yeux : {character.eyeColor}</Text>
            )}
            {character.gender === 'female' && character.bust && (
              <Text style={styles.attributeDetail}>• Poitrine : Bonnet {character.bust}</Text>
            )}
            {character.gender === 'male' && character.penis && (
              <Text style={styles.attributeDetail}>• Attribut : {character.penis}</Text>
            )}
          </View>
        </View>

        {/* TENUE */}
        {character.outfit && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👘 Tenue</Text>
            <Text style={styles.sectionContent}>{character.outfit}</Text>
          </View>
        )}

        {/* SCÉNARIO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📖 Scénario</Text>
          <Text style={styles.sectionContent}>
            {character.scenario || character.background || 'Pas de scénario défini'}
          </Text>
        </View>

        {/* MESSAGE D'ACCROCHE */}
        {(character.startMessage || character.greeting) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 Premier message</Text>
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>
                {character.startMessage || character.greeting}
              </Text>
            </View>
          </View>
        )}

        {/* RELATION */}
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
              <Text style={styles.relationshipLevel}>{getRelationshipLevel()}</Text>
              <Text style={styles.relationshipStats}>
                {relationship.interactions} interaction(s) • {relationship.experience} XP
              </Text>
            </View>
          </View>
        )}

        {/* GALERIE */}
        <View style={styles.section}>
          <View style={styles.gallerySectionHeader}>
            <Text style={styles.sectionTitle}>🖼️ Galerie</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Gallery', { character })}>
              <Text style={styles.seeAllText}>Voir tout ({gallery.length}) →</Text>
            </TouchableOpacity>
          </View>
          {gallery.length === 0 ? (
            <View style={styles.emptyGalleryContainer}>
              <Text style={styles.emptyGalleryIcon}>📸</Text>
              <Text style={styles.emptyGalleryText}>
                Aucune image. Générez des images dans les conversations !
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.galleryPreview}>
                {gallery.slice(0, 5).map((imageUrl, index) => (
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

        {/* BOUTONS */}
        <View style={styles.buttonContainer}>
          {hasConversation ? (
            <>
              <TouchableOpacity style={styles.resumeButton} onPress={resumeConversation}>
                <Text style={styles.resumeButtonText}>💬 Reprendre la conversation</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.newConversationButton} onPress={startNewConversation}>
                <Text style={styles.newConversationButtonText}>✨ Nouvelle conversation</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.startButton} onPress={startConversation}>
              <Text style={styles.startButtonText}>✨ Commencer la conversation</Text>
            </TouchableOpacity>
          )}

          {character.isCustom && (
            <View style={styles.customButtonsRow}>
              <TouchableOpacity style={styles.editButton} onPress={handleEditCharacter}>
                <Text style={styles.editButtonText}>✏️ Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteCharacter}>
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
    marginBottom: 20,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
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
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  // Tempérament styles
  temperamentMainBox: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  temperamentMainText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  temperamentDetailsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  temperamentItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  temperamentLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 5,
  },
  temperamentText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  // Physical description styles
  physicalDescBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  physicalDescText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  toggleButton: {
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '600',
  },
  fullAppearanceBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  fullAppearanceText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  attributesContainer: {
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 12,
    marginTop: 5,
  },
  attributeDetail: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '600',
    marginBottom: 6,
    paddingLeft: 4,
  },
  // Message box
  messageBox: {
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  messageText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // Relationship
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
  // Gallery
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
  // Buttons
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
  customButtonsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginRight: 10,
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
});
