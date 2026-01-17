import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import enhancedCharacters from '../data/allCharacters';
import CustomCharacterService from '../services/CustomCharacterService';
import GalleryService from '../services/GalleryService';

export default function HomeScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('tous');
  const [allCharacters, setAllCharacters] = useState([]);
  const [characterImages, setCharacterImages] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Chargement initial IMMÉDIAT des personnages de base
  useEffect(() => {
    // Afficher IMMÉDIATEMENT les personnages de base
    setAllCharacters([...enhancedCharacters]);
    
    // Puis charger les personnages custom en arrière-plan
    loadCustomCharactersBackground();
  }, []);

  // Recharger quand on revient sur l'écran
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCustomCharactersBackground();
    });
    return unsubscribe;
  }, [navigation]);

  // Charger les personnages custom en arrière-plan
  const loadCustomCharactersBackground = async () => {
    try {
      await CustomCharacterService.migrateOldCharacters();
      const customChars = await CustomCharacterService.getAllVisibleCharacters();
      
      if (customChars && customChars.length > 0) {
        setAllCharacters([...enhancedCharacters, ...customChars]);
      }
    } catch (error) {
      console.log('⚠️ Erreur chargement personnages custom:', error.message);
    }
    
    // Charger les images en arrière-plan
    loadGalleryImagesBackground();
  };

  // Charger les images de galerie en arrière-plan par lots
  const loadGalleryImagesBackground = async () => {
    const charsWithPotentialImages = allCharacters.filter(c => c.imageUrl || c.isCustom);
    
    if (charsWithPotentialImages.length === 0) return;
    
    const images = { ...characterImages };
    const BATCH_SIZE = 15;
    
    for (let i = 0; i < charsWithPotentialImages.length; i += BATCH_SIZE) {
      const batch = charsWithPotentialImages.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (char) => {
        try {
          if (char.imageUrl) {
            images[char.id] = char.imageUrl;
          } else if (char.isCustom) {
            const gallery = await GalleryService.getGallery(char.id);
            if (gallery && gallery.length > 0) {
              images[char.id] = gallery[0];
            }
          }
        } catch (e) {
          // Ignorer les erreurs individuelles
        }
      }));
      
      // Mettre à jour progressivement
      setCharacterImages(prev => ({ ...prev, ...images }));
    }
  };

  // Filtrage optimisé avec useMemo
  const filteredCharacters = useMemo(() => {
    let filtered = allCharacters;

    // Filter by gender
    if (selectedFilter !== 'tous') {
      filtered = filtered.filter(char => char.gender === selectedFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const queries = searchQuery.toLowerCase().split(/[\s|]+/).filter(q => q.length > 0);
      filtered = filtered.filter(char => {
        const name = (char.name || '').toLowerCase();
        const tags = char.tags || [];
        const personality = (char.personality || '').toLowerCase();
        const charId = String(char.id || '').toLowerCase();
        const scenario = (char.scenario || '').toLowerCase();
        
        return queries.some(query => 
          name.includes(query) ||
          charId.includes(query) ||
          scenario.includes(query) ||
          tags.some(tag => tag && tag.toLowerCase().includes(query)) ||
          personality.includes(query)
        );
      });
    }

    return filtered;
  }, [searchQuery, selectedFilter, allCharacters]);

  // Rendu optimisé des personnages
  const renderCharacter = useCallback(({ item }) => {
    const imageUrl = item.imageUrl || characterImages[item.id];
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('CharacterDetail', { character: item })}
      >
        <View style={styles.cardContent}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.characterImage}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name}>
              {item.name}
              {item.isCustom && <Text style={styles.customBadge}> ✨</Text>}
            </Text>
            <Text style={styles.age}>{item.age} ans • {
              item.gender === 'male' ? 'Homme' :
              item.gender === 'female' ? 'Femme' : 
              'Non-binaire'
            }</Text>
            <Text style={styles.description} numberOfLines={2}>
              {item.scenario}
            </Text>
            <View style={styles.tagsContainer}>
              {(item.tags || []).slice(0, 4).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [characterImages, navigation]);

  // Tags populaires pour le filtre rapide
  const popularTags = [
    { label: '👩 Femmes', filter: 'female', type: 'gender' },
    { label: '👨 Hommes', filter: 'male', type: 'gender' },
    { label: '👧 Belle-fille', filter: 'stepdaughter', type: 'id' },
    { label: '💋 Belles', filter: 'beauty_', type: 'id' },
    { label: '👩‍💼 Collègues', filter: 'colleague', type: 'id' },
    { label: '👩‍👧 Maman', filter: 'mom', type: 'id' },
    { label: '👧 Sœur', filter: 'sister', type: 'id' },
    { label: '🔥 MILF', filter: 'milf', type: 'id' },
    { label: '💪 DILF', filter: 'dilf', type: 'id' },
    { label: '🏠 Coloc', filter: 'roommate', type: 'id' },
    { label: '🏥 Médical', filter: 'medical', type: 'id' },
    { label: '🧝 Fantasy', filter: 'fantasy', type: 'id' },
    { label: '🍑 Curvy', filter: 'curvy', type: 'id' },
    { label: '👫 Amis', filter: 'friend', type: 'id' },
  ];

  const handleTagFilter = useCallback((tag) => {
    if (tag.type === 'gender') {
      setSelectedFilter(tag.filter);
      setSearchQuery('');
    } else {
      setSelectedFilter('tous');
      setSearchQuery(tag.filter.replace('|', ' '));
    }
  }, []);

  const keyExtractor = useCallback((item) => String(item.id), []);

  return (
    <View style={styles.container}>
      {/* En-tête avec titre en or */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>Boys & Girls</Text>
        <Text style={styles.subtitle}>{filteredCharacters.length} personnages</Text>
      </View>

      {/* Bouton Carrousel */}
      <TouchableOpacity
        style={styles.carouselButton}
        onPress={() => navigation.navigate('CharacterCarousel')}
      >
        <Text style={styles.carouselButtonIcon}>❤️</Text>
        <View style={styles.carouselButtonContent}>
          <Text style={styles.carouselButtonTitle}>Mode Découverte</Text>
          <Text style={styles.carouselButtonSubtitle}>Swipe et découvre</Text>
        </View>
        <Text style={styles.carouselButtonArrow}>→</Text>
      </TouchableOpacity>

      {/* Bouton Créer */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateCharacter')}
      >
        <Text style={styles.createButtonText}>✨ Créer mon personnage</Text>
      </TouchableOpacity>

      {/* Recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filtres par tags */}
      <View style={styles.tagsFilterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={popularTags}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tagFilterButton,
                (item.type === 'gender' && selectedFilter === item.filter) && styles.tagFilterButtonActive
              ]}
              onPress={() => handleTagFilter(item)}
            >
              <Text style={[
                styles.tagFilterText,
                (item.type === 'gender' && selectedFilter === item.filter) && styles.tagFilterTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.tagsFilterList}
        />
      </View>

      {/* Liste des personnages */}
      <FlatList
        data={filteredCharacters}
        renderItem={renderCharacter}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: 150,
          offset: 150 * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#d4af37',
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#d4af37',
    textShadowColor: '#ffd700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  tagsFilterContainer: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  tagsFilterList: {
    paddingHorizontal: 10,
    gap: 8,
  },
  tagFilterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2d2d44',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#3d3d5c',
  },
  tagFilterButtonActive: {
    backgroundColor: '#d4af37',
    borderColor: '#ffd700',
  },
  tagFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tagFilterTextActive: {
    color: '#1a1a2e',
  },
  createButton: {
    margin: 15,
    marginTop: 5,
    marginBottom: 5,
    padding: 16,
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  carouselButton: {
    margin: 15,
    marginTop: 10,
    marginBottom: 5,
    padding: 18,
    backgroundColor: '#8b1a4a',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  carouselButtonIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  carouselButtonContent: {
    flex: 1,
  },
  carouselButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 2,
  },
  carouselButtonSubtitle: {
    fontSize: 13,
    color: '#f0c0d0',
  },
  carouselButtonArrow: {
    fontSize: 28,
    color: '#d4af37',
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#1a1a2e',
  },
  searchInput: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3d3d5c',
  },
  list: {
    padding: 15,
    backgroundColor: '#0f0f1a',
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 15,
  },
  characterImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8b1a4a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 4,
  },
  customBadge: {
    color: '#ffd700',
  },
  age: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 10,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#2d2d44',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3d3d5c',
  },
  tagText: {
    fontSize: 12,
    color: '#d4af37',
    fontWeight: '500',
  },
});
