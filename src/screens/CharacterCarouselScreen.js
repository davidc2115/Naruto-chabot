import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ImageBackground,
} from 'react-native';
import characters from '../data/characters'; // 6 personnages Naruto uniquement
import CustomCharacterService from '../services/CustomCharacterService';
import GalleryService from '../services/GalleryService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CharacterCarouselScreen({ navigation }) {
  const [allCharacters, setAllCharacters] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [characterImages, setCharacterImages] = useState({});
  const [selectedTags, setSelectedTags] = useState([]);

  useEffect(() => {
    loadAllCharacters();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadAllCharacters();
    });
    return unsubscribe;
  }, [navigation]);

  const loadAllCharacters = async () => {
    const customChars = await CustomCharacterService.getCustomCharacters();
    // Combiner les personnages de la base + customs
    const combined = [...characters, ...customChars]; // 6 personnages Naruto
    setAllCharacters(combined);
    await loadGalleryImages(combined);
  };

  const loadGalleryImages = async (chars) => {
    const images = {};
    for (const char of chars) {
      if (char.imageUrl) {
        images[char.id] = char.imageUrl;
      } else {
        const gallery = await GalleryService.getGallery(char.id);
        if (gallery && gallery.length > 0) {
          images[char.id] = gallery[0];
        }
      }
    }
    setCharacterImages(images);
  };

  const filteredCharacters = selectedTags.length > 0
    ? allCharacters.filter(char =>
        selectedTags.every(tag => char.tags.includes(tag))
      )
    : allCharacters;

  const currentCharacter = filteredCharacters[currentIndex];

  const handleNext = () => {
    if (currentIndex < filteredCharacters.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Revenir au début
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(filteredCharacters.length - 1); // Aller à la fin
    }
  };

  const handleSelect = () => {
    navigation.navigate('CharacterDetail', { character: currentCharacter });
  };

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
    setCurrentIndex(0); // Reset à 0 quand on filtre
  };

  // Extraire tous les tags uniques
  const allTags = [...new Set(allCharacters.flatMap(char => char.tags))].sort();

  if (!currentCharacter) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Aucun personnage disponible</Text>
      </View>
    );
  }

  const imageUrl = characterImages[currentCharacter.id];

  return (
    <View style={styles.container}>
      {/* Filtres tags */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {allTags.slice(0, 15).map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.filterTag,
                selectedTags.includes(tag) && styles.filterTagActive
              ]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={[
                styles.filterTagText,
                selectedTags.includes(tag) && styles.filterTagTextActive
              ]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Carte personnage */}
      <View style={styles.cardContainer}>
        <ImageBackground
          source={imageUrl ? { uri: imageUrl } : null}
          style={styles.card}
          imageStyle={styles.cardImage}
        >
          {/* Overlay gradient */}
          <View style={styles.overlay} />
          
          {/* Contenu */}
          <View style={styles.cardContent}>
            <View style={styles.header}>
              <Text style={styles.name}>{currentCharacter.name}</Text>
              {currentCharacter.isCustom && (
                <Text style={styles.customBadge}>✨</Text>
              )}
            </View>
            
            <Text style={styles.ageGender}>
              {currentCharacter.age} ans • {
                currentCharacter.gender === 'male' ? 'Homme' :
                currentCharacter.gender === 'female' ? 'Femme' :
                'Non-binaire'
              }
              {currentCharacter.gender === 'female' && currentCharacter.bust && 
                ` • Bonnet ${currentCharacter.bust}`}
              {currentCharacter.gender === 'male' && currentCharacter.penis && 
                ` • ${currentCharacter.penis}`}
            </Text>

            <Text style={styles.description} numberOfLines={4}>
              {currentCharacter.scenario}
            </Text>

            {/* Tags */}
            <View style={styles.tagsContainer}>
              {currentCharacter.tags.slice(0, 6).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>

            {/* Compteur */}
            <Text style={styles.counter}>
              {currentIndex + 1} / {filteredCharacters.length}
            </Text>
          </View>
        </ImageBackground>
      </View>

      {/* Boutons navigation */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.navButton} onPress={handlePrevious}>
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.selectButton} onPress={handleSelect}>
          <Text style={styles.selectButtonText}>💬 Démarrer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={handleNext}>
          <Text style={styles.navButtonText}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  filtersContainer: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  filterTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#334155',
    marginRight: 8,
  },
  filterTagActive: {
    backgroundColor: '#8b5cf6',
  },
  filterTagText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  filterTagTextActive: {
    color: '#fff',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.65,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  cardImage: {
    borderRadius: 24,
    opacity: 0.9,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  customBadge: {
    fontSize: 24,
    marginLeft: 8,
  },
  ageGender: {
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    fontSize: 15,
    color: '#f1f5f9',
    lineHeight: 22,
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: 'rgba(139, 92, 246, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  counter: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  navButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 28,
    color: '#fff',
  },
  selectButton: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyText: {
    fontSize: 18,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 100,
  },
});
