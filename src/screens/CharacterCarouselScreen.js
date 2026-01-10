import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ImageBackground,
  TextInput,
  SafeAreaView,
  Platform,
  StatusBar,
  PanResponder,
  Animated,
} from 'react-native';
import enhancedCharacters from '../data/allCharacters';
import CustomCharacterService from '../services/CustomCharacterService';
import GalleryService from '../services/GalleryService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;

// Fonction pour mélanger un tableau (Fisher-Yates)
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function CharacterCarouselScreen({ navigation }) {
  const [allCharacters, setAllCharacters] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [characterImages, setCharacterImages] = useState({});
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearch, setTagSearch] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const [nameSearch, setNameSearch] = useState('');
  const [searchMode, setSearchMode] = useState('tags'); // 'tags' ou 'name'

  // Animation pour le swipe
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  // Refs pour stocker les valeurs actuelles (éviter les closures obsolètes)
  const currentIndexRef = useRef(currentIndex);
  const filteredCharactersLengthRef = useRef(0);
  
  // Mettre à jour les refs quand les valeurs changent
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Fonctions de navigation utilisant les refs
  const goToNext = () => {
    const maxIndex = filteredCharactersLengthRef.current - 1;
    if (currentIndexRef.current < maxIndex) {
      setCurrentIndex(currentIndexRef.current + 1);
    } else {
      setCurrentIndex(0); // Revenir au début
    }
  };

  const goToPrevious = () => {
    const maxIndex = filteredCharactersLengthRef.current - 1;
    if (currentIndexRef.current > 0) {
      setCurrentIndex(currentIndexRef.current - 1);
    } else {
      setCurrentIndex(maxIndex); // Aller à la fin
    }
  };

  const swipeCard = (direction) => {
    const toValue = direction === 'left' ? -SCREEN_WIDTH : SCREEN_WIDTH;
    Animated.timing(position, {
      toValue: { x: toValue, y: 0 },
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      if (direction === 'left') {
        goToNext();
      } else {
        goToPrevious();
      }
      position.setValue({ x: 0, y: 0 });
    });
  };

  // PanResponder pour le swipe - créé une seule fois mais utilise les refs
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Activer le pan si le mouvement horizontal est significatif
        return Math.abs(gesture.dx) > 5;
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: 0 });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          // Swipe vers la droite -> personnage précédent
          swipeCard('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          // Swipe vers la gauche -> personnage suivant
          swipeCard('left');
        } else {
          // Retour au centre
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

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
    try {
      // Rafraîchir les personnages publics depuis le serveur
      const SyncService = require('../services/SyncService').default;
      await SyncService.init();
      await SyncService.getPublicCharacters(); // Force le refresh du cache
      
      // Utiliser getAllVisibleCharacters pour inclure les personnages publics des autres utilisateurs
      const customChars = await CustomCharacterService.getAllVisibleCharacters();
      
      // Combiner les personnages de la base + customs/publics et mélanger aléatoirement
      const combined = [...enhancedCharacters, ...customChars];
      const shuffled = shuffleArray(combined);
      setAllCharacters(shuffled);
      await loadGalleryImages(shuffled);
    } catch (error) {
      console.error('Erreur chargement personnages:', error);
      // Fallback: charger seulement les personnages de base
      const shuffled = shuffleArray([...enhancedCharacters]);
      setAllCharacters(shuffled);
    }
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

  // Filtrer par recherche texte (nom OU tags) ET par tags sélectionnés
  let filteredCharacters = allCharacters;
  
  // Filtre par recherche texte (cherche dans nom ET dans tags)
  const searchText = nameSearch.trim().toLowerCase();
  if (searchText) {
    filteredCharacters = filteredCharacters.filter(char => {
      const nameMatch = (char.name || '').toLowerCase().includes(searchText);
      const tagMatch = (char.tags || []).some(tag => 
        tag.toLowerCase().includes(searchText)
      );
      return nameMatch || tagMatch;
    });
  }
  
  // Filtre par tags sélectionnés (en plus de la recherche texte)
  // Gestion spéciale des catégories principales (Homme, Femme, Non-binaire, Fantasy)
  if (selectedTags.length > 0) {
    filteredCharacters = filteredCharacters.filter(char => {
      const charTags = (char.tags || []).map(t => t.toLowerCase());
      const charGender = (char.gender || '').toLowerCase();
      
      return selectedTags.every(selectedTag => {
        const tagLower = selectedTag.toLowerCase();
        
        // Catégorie "Femme" - vérifie le tag OU le gender
        if (tagLower === 'femme') {
          return charTags.includes('femme') || charGender === 'female' || charGender === 'femme';
        }
        // Catégorie "Homme" - vérifie le tag OU le gender
        if (tagLower === 'homme') {
          return charTags.includes('homme') || charGender === 'male' || charGender === 'homme';
        }
        // Catégorie "Non-binaire" - vérifie le tag OU le gender
        if (tagLower === 'non-binaire') {
          return charTags.includes('non-binaire') || charTags.includes('non binaire') || 
                 charTags.includes('androgyne') || charGender === 'non-binary' || 
                 charGender === 'non-binaire' || charGender === 'nonbinary';
        }
        // Catégorie "Fantasy" - vérifie les tags fantasy
        if (tagLower === 'fantasy') {
          const fantasyTags = ['fantasy', 'elfe', 'elf', 'démon', 'demon', 'ange', 'angel', 
                               'vampire', 'loup-garou', 'werewolf', 'succube', 'incube', 
                               'dragon', 'fée', 'fairy', 'sorcière', 'sorcier', 'magie', 
                               'créature', 'monstre', 'mythique', 'surnaturel'];
          return fantasyTags.some(ft => charTags.includes(ft));
        }
        
        // Tag normal
        return charTags.includes(tagLower);
      });
    });
  }
  
  // Mettre à jour la ref avec la longueur des personnages filtrés
  filteredCharactersLengthRef.current = filteredCharacters.length;
  
  // Filtrer les tags pour la recherche
  const allTags = [...new Set(allCharacters.flatMap(char => char.tags || []))].sort();
  const filteredTags = tagSearch 
    ? allTags.filter(tag => tag.toLowerCase().includes(tagSearch.toLowerCase()))
    : allTags;

  const currentCharacter = filteredCharacters[currentIndex];
  
  // Fonction pour obtenir la description à afficher
  const getDisplayDescription = (char) => {
    return char.scenario || char.description || char.personality || char.background || 'Personnage mystérieux...';
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

  // Remélanger les personnages
  const handleShuffle = () => {
    setAllCharacters(shuffleArray([...allCharacters]));
    setCurrentIndex(0);
  };

  if (!currentCharacter) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Aucun personnage trouvé</Text>
          <Text style={styles.emptySubtitle}>
            {selectedTags.length > 0 || nameSearch.trim() 
              ? 'Essayez de modifier vos filtres'
              : 'Chargement en cours...'}
          </Text>
          
          {(selectedTags.length > 0 || nameSearch.trim()) && (
            <TouchableOpacity
              style={styles.resetFiltersButton}
              onPress={() => {
                setSelectedTags([]);
                setNameSearch('');
                setTagSearch('');
                setCurrentIndex(0);
              }}
            >
              <Text style={styles.resetFiltersButtonText}>🔄 Réinitialiser les filtres</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.shuffleAllButton}
            onPress={handleShuffle}
          >
            <Text style={styles.shuffleAllButtonText}>🔀 Mélanger tous les personnages</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const imageUrl = characterImages[currentCharacter.id];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Premium */}
      <View style={styles.headerSafe}>
        {/* Barre de recherche unifiée */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIconInline}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher nom ou tag..."
              placeholderTextColor="#64748b"
              value={nameSearch}
              onChangeText={(text) => {
                setNameSearch(text);
                setTagSearch(text); // Pour filtrer la liste de tags aussi
                setCurrentIndex(0);
              }}
            />
            {nameSearch ? (
              <TouchableOpacity 
                onPress={() => { 
                  setNameSearch(''); 
                  setTagSearch(''); 
                  setSelectedTags([]);
                  setCurrentIndex(0);
                }}
                style={styles.clearInputButton}
              >
                <Text style={styles.clearInputText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={styles.shuffleButton} onPress={handleShuffle}>
            <Text style={styles.shuffleButtonText}>🔀</Text>
          </TouchableOpacity>
        </View>
        
        {/* Info résultats */}
        <View style={styles.resultsInfoBar}>
          <Text style={styles.resultsInfoText}>
            💫 {filteredCharacters.length} personnage{filteredCharacters.length !== 1 ? 's' : ''}
          </Text>
        </View>
      
        {/* Tags sélectionnés ou recherche nom active */}
        {(selectedTags.length > 0 || nameSearch.trim()) && (
          <View style={styles.selectedTagsContainer}>
            <Text style={styles.selectedLabel}>Filtres actifs:</Text>
            {nameSearch.trim() && (
              <TouchableOpacity
                style={styles.selectedTag}
                onPress={() => setNameSearch('')}
              >
                <Text style={styles.selectedTagText}>Nom: {nameSearch} ✕</Text>
              </TouchableOpacity>
            )}
            {selectedTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.selectedTag}
                onPress={() => toggleTag(tag)}
              >
                <Text style={styles.selectedTagText}>{tag} ✕</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => { setSelectedTags([]); setNameSearch(''); }}>
              <Text style={styles.clearAllText}>Effacer tout</Text>
            </TouchableOpacity>
          </View>
        )}
      
        {/* Catégories principales - Ligne 1 */}
        <View style={styles.categoryFiltersContainer}>
          {['Femme', 'Homme', 'Non-binaire', 'Fantasy'].map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryTag,
                selectedTags.map(t => t.toLowerCase()).includes(category.toLowerCase()) && styles.categoryTagActive
              ]}
              onPress={() => toggleTag(category)}
            >
              <Text style={[
                styles.categoryTagText,
                selectedTags.map(t => t.toLowerCase()).includes(category.toLowerCase()) && styles.categoryTagTextActive
              ]}>
                {category === 'Femme' ? '👩 ' : category === 'Homme' ? '👨 ' : category === 'Non-binaire' ? '⚧️ ' : '🧝 '}
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tags populaires - toujours visible */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(showAllTags ? filteredTags : filteredTags.slice(0, 25)).filter(tag => 
              !['femme', 'homme', 'non-binaire', 'fantasy'].includes(tag.toLowerCase())
            ).map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.filterTag,
                  selectedTags.map(t => t.toLowerCase()).includes(tag.toLowerCase()) && styles.filterTagActive
                ]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[
                  styles.filterTagText,
                  selectedTags.map(t => t.toLowerCase()).includes(tag.toLowerCase()) && styles.filterTagTextActive
                ]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
            {filteredTags.length > 25 && !showAllTags && (
              <TouchableOpacity 
                style={styles.moreTagsButton}
                onPress={() => setShowAllTags(true)}
              >
                <Text style={styles.moreTagsText}>+{filteredTags.length - 25}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Carte personnage avec swipe */}
      <View style={styles.cardContainer}>
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              transform: [
                { translateX: position.x },
                { rotate: rotate },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <ImageBackground
            source={imageUrl ? { uri: imageUrl } : null}
            style={styles.card}
            imageStyle={styles.cardImage}
          >
            {/* Overlay gradient */}
            <View style={styles.overlay} />
            
            {/* Indicateurs de swipe */}
            <Animated.View style={[styles.swipeIndicatorLeft, { opacity: position.x.interpolate({
              inputRange: [0, SWIPE_THRESHOLD],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }) }]}>
              <Text style={styles.swipeIndicatorText}>◀ Précédent</Text>
            </Animated.View>
            <Animated.View style={[styles.swipeIndicatorRight, { opacity: position.x.interpolate({
              inputRange: [-SWIPE_THRESHOLD, 0],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }) }]}>
              <Text style={styles.swipeIndicatorText}>Suivant ▶</Text>
            </Animated.View>
            
            {/* Contenu */}
            <View style={styles.cardContent}>
              <View style={styles.header}>
                <Text style={styles.name}>{currentCharacter.name || 'Personnage'}</Text>
                {currentCharacter.isCustom && (
                  <Text style={styles.customBadge}>✨</Text>
                )}
                {currentCharacter.isPublic && !currentCharacter.isCustom && (
                  <Text style={styles.publicBadge}>🌐</Text>
                )}
              </View>
              
              <Text style={styles.ageGender}>
                {currentCharacter.age ? `${currentCharacter.age} ans` : ''} 
                {currentCharacter.age && currentCharacter.gender ? ' • ' : ''}
                {currentCharacter.gender === 'male' ? 'Homme' :
                 currentCharacter.gender === 'female' ? 'Femme' :
                 currentCharacter.gender === 'non-binary' ? 'Non-binaire' : ''}
                {currentCharacter.gender === 'female' && currentCharacter.bust && 
                  ` • Bonnet ${currentCharacter.bust}`}
                {currentCharacter.gender === 'male' && currentCharacter.penis && 
                  ` • ${currentCharacter.penis} cm`}
              </Text>

              {/* Rôle si disponible */}
              {currentCharacter.role && (
                <Text style={styles.role}>{currentCharacter.role}</Text>
              )}

              {/* Description avec fallback */}
              <Text style={styles.description} numberOfLines={4}>
                {getDisplayDescription(currentCharacter)}
              </Text>

              {/* Tags avec fallback */}
              <View style={styles.tagsContainer}>
                {(currentCharacter.tags && currentCharacter.tags.length > 0) ? (
                  currentCharacter.tags.slice(0, 6).map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>
                      {currentCharacter.gender === 'female' ? '👩' : currentCharacter.gender === 'male' ? '👨' : '🧑'} personnage
                    </Text>
                  </View>
                )}
              </View>

              {/* Compteur */}
              <Text style={styles.counter}>
                {currentIndex + 1} / {filteredCharacters.length}
              </Text>
              
              {/* Instruction swipe */}
              <Text style={styles.swipeHint}>← Glissez pour naviguer →</Text>
            </View>
          </ImageBackground>
        </Animated.View>
      </View>

      {/* Bouton démarrer uniquement */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.selectButton} onPress={handleSelect}>
          <Text style={styles.selectButtonText}>💬 Démarrer la conversation</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerSafe: {
    backgroundColor: '#1e293b',
    zIndex: 100,
    elevation: 10,
  },
  searchToggle: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 8,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  toggleText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    gap: 10,
    zIndex: 100,
    elevation: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    paddingHorizontal: 15,
  },
  searchIconInline: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
  },
  clearInputButton: {
    padding: 5,
  },
  clearInputText: {
    color: '#64748b',
    fontSize: 16,
  },
  resultsInfoBar: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    backgroundColor: '#1e293b',
  },
  resultsInfoText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },
  shuffleButton: {
    backgroundColor: '#8b5cf6',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shuffleButtonText: {
    fontSize: 20,
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    gap: 6,
  },
  selectedLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginRight: 4,
  },
  selectedTag: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  clearAllText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  categoryFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 8,
  },
  categoryTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#475569',
  },
  categoryTagActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#a78bfa',
  },
  categoryTagText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryTagTextActive: {
    color: '#fff',
  },
  filtersContainer: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  moreTagsButton: {
    backgroundColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  moreTagsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
    padding: 10,
    zIndex: 1,
    elevation: 1,
  },
  cardWrapper: {
    width: SCREEN_WIDTH - 20,
    height: SCREEN_HEIGHT * 0.58,
  },
  card: {
    width: '100%',
    height: '100%',
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
  swipeIndicatorLeft: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  swipeIndicatorRight: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  swipeIndicatorText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  customBadge: {
    fontSize: 20,
    marginLeft: 8,
  },
  publicBadge: {
    fontSize: 18,
    marginLeft: 8,
  },
  ageGender: {
    fontSize: 14,
    color: '#e2e8f0',
    marginBottom: 4,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  role: {
    fontSize: 13,
    color: '#a78bfa',
    marginBottom: 8,
    fontWeight: '600',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    fontSize: 14,
    color: '#f1f5f9',
    lineHeight: 20,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
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
    fontSize: 13,
    color: '#cbd5e1',
    textAlign: 'center',
    fontWeight: '600',
  },
  swipeHint: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  selectButton: {
    flex: 1,
    maxWidth: 300,
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  selectButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyText: {
    fontSize: 18,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 30,
  },
  resetFiltersButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 15,
  },
  resetFiltersButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shuffleAllButton: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
  },
  shuffleAllButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
});
