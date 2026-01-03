import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import StorageService from '../services/StorageService';
import ImageGenerationService from '../services/ImageGenerationService';

export default function CharacterDetailScreen({ route, navigation }) {
  const { character } = route.params;
  const [relationship, setRelationship] = useState(null);
  const [hasConversation, setHasConversation] = useState(false);
  const [characterImage, setCharacterImage] = useState(null);
  const [loadingImage, setLoadingImage] = useState(true);

  useEffect(() => {
    loadCharacterData();
    generateCharacterImage();
    navigation.setOptions({ title: character.name });
  }, [character]);

  const loadCharacterData = async () => {
    const rel = await StorageService.loadRelationship(character.id);
    setRelationship(rel);

    const conv = await StorageService.loadConversation(character.id);
    setHasConversation(conv !== null && conv.messages.length > 0);
  };

  const generateCharacterImage = async () => {
    try {
      setLoadingImage(true);
      const imageUrl = await ImageGenerationService.generateCharacterImage(character);
      setCharacterImage(imageUrl);
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setLoadingImage(false);
    }
  };

  const startConversation = () => {
    navigation.navigate('Conversation', { character });
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
        {loadingImage ? (
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
          <View>
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
          <TouchableOpacity
            style={styles.refreshImageButton}
            onPress={generateCharacterImage}
          >
            <Text style={styles.refreshImageText}>🔄</Text>
          </TouchableOpacity>
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
          <Text style={styles.sectionContent}>{character.appearance}</Text>
          {character.gender === 'female' && character.bust && (
            <Text style={styles.attributeDetail}>• Taille de poitrine : Bonnet {character.bust}</Text>
          )}
          {character.gender === 'male' && character.penis && (
            <Text style={styles.attributeDetail}>• Taille : {character.penis}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎭 Personnalité</Text>
          <Text style={styles.sectionContent}>{character.personality}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📖 Scénario</Text>
          <Text style={styles.sectionContent}>{character.scenario}</Text>
        </View>

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

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={startConversation}
          >
            <Text style={styles.startButtonText}>
              {hasConversation ? '💬 Continuer la conversation' : '✨ Commencer la conversation'}
            </Text>
          </TouchableOpacity>
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
  attributeDetail: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: 8,
  },
});
