import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import enhancedCharacters from '../data/allCharacters';

// Import optionnel des services (avec fallback)
let CustomCharacterService = null;
let GalleryService = null;
let CharacterImageService = null;

try {
  CustomCharacterService = require('../services/CustomCharacterService').default;
} catch (e) {
  console.log('CustomCharacterService non disponible');
}

try {
  GalleryService = require('../services/GalleryService').default;
} catch (e) {
  console.log('GalleryService non disponible');
}

try {
  CharacterImageService = require('../services/CharacterImageService').default;
} catch (e) {
  console.log('CharacterImageService non disponible');
}

export default function HomeScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('tous');
  // IMPORTANT: Initialiser IMMÉDIATEMENT avec les personnages de base
  const [allCharacters, setAllCharacters] = useState(enhancedCharacters || []);
  const [characterImages, setCharacterImages] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [customLoaded, setCustomLoaded] = useState(false);
  const loadingRef = useRef(false);

  // Chargement initial IMMÉDIAT des personnages de base
  useEffect(() => {
    console.log('🚀 HomeScreen: Affichage immédiat de', enhancedCharacters?.length || 0, 'personnages');
    
    // S'assurer que les personnages de base sont affichés
    if (enhancedCharacters && enhancedCharacters.length > 0) {
      setAllCharacters([...enhancedCharacters]);
    }
    
    // Charger les images générées
    loadGeneratedImages();
    
    // Charger les personnages custom en arrière-plan avec timeout
    const timer = setTimeout(() => {
      loadCustomCharactersBackground();
    }, 100); // Petit délai pour laisser le rendu initial se faire
    
    return () => clearTimeout(timer);
  }, []);

  // Recharger quand on revient sur l'écran (seulement si pas déjà en cours)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!loadingRef.current && customLoaded) {
        loadCustomCharactersBackground();
      }
      loadGeneratedImages();
    });
    return unsubscribe;
  }, [navigation, customLoaded]);

  // Charger les images générées pour chaque personnage
  const loadGeneratedImages = async () => {
    if (!CharacterImageService) return;
    
    try {
      const images = {};
      
      for (const character of allCharacters) {
        const latestImage = await CharacterImageService.getLatestImage(character.id);
        if (latestImage) {
          images[character.id] = latestImage.url;
        }
      }
      
      setCharacterImages(images);
    } catch (error) {
      console.error('Erreur chargement images générées:', error);
    }
  };

  // Charger les personnages custom en arrière-plan avec TIMEOUT
  const loadCustomCharactersBackground = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    try {
      if (!CustomCharacterService) {
        console.log('⚠️ CustomCharacterService non disponible');
        loadingRef.current = false;
        setCustomLoaded(true);
        return;
      }
      
      // Utiliser un timeout pour éviter de bloquer
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      // Migration rapide (local seulement)
      try {
        await Promise.race([
          CustomCharacterService.migrateOldCharacters(),
          timeoutPromise
        ]);
      } catch (e) {
        console.log('⚠️ Migration timeout ou erreur');
      }
      
      // Charger uniquement les personnages locaux d'abord (rapide)
      let customChars = [];
      try {
        const localData = await AsyncStorage.getItem('custom_characters_anonymous');
        if (localData) {
          customChars = JSON.parse(localData);
        }
      } catch (e) {
        console.log('⚠️ Erreur chargement local');
      }
      
      // Mettre à jour avec les personnages locaux
      if (customChars && customChars.length > 0) {
        setAllCharacters(prev => {
          const baseChars = enhancedCharacters || [];
          const existingIds = new Set(baseChars.map(c => c.id));
          const newCustom = customChars.filter(c => !existingIds.has(c.id));
          return [...baseChars, ...newCustom];
        });
      }
      
      setCustomLoaded(true);
      
      // Charger les personnages du serveur en arrière-plan (sans bloquer)
      loadServerCharactersAsync();
      
    } catch (error) {
      console.log('⚠️ Erreur chargement personnages custom:', error.message);
    } finally {
      loadingRef.current = false;
    }
  };
  
  // Charger les personnages du serveur en arrière-plan (asynchrone, non-bloquant)
  const loadServerCharactersAsync = async () => {
    try {
      if (!CustomCharacterService) return;
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout serveur')), 8000)
      );
      
      const customChars = await Promise.race([
        CustomCharacterService.getAllVisibleCharacters(),
        timeoutPromise
      ]);
      
      if (customChars && customChars.length > 0) {
        setAllCharacters(prev => {
          const baseChars = enhancedCharacters || [];
          const existingIds = new Set(baseChars.map(c => c.id));
          const newCustom = customChars.filter(c => !existingIds.has(c.id));
          console.log('✅ Personnages serveur chargés:', newCustom.length);
          return [...baseChars, ...newCustom];
        });
      }
    } catch (error) {
      console.log('⚠️ Chargement serveur en arrière-plan échoué (normal si hors-ligne)');
    }
  };

  // Charger les images de galerie en arrière-plan par lots
  const loadGalleryImagesBackground = useCallback(async (characters) => {
    if (!GalleryService) return;
    
    const charsWithPotentialImages = characters.filter(c => c.imageUrl || c.isCustom);
    if (charsWithPotentialImages.length === 0) return;
    
    const images = {};
    const BATCH_SIZE = 10;
    
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
      if (Object.keys(images).length > 0) {
        setCharacterImages(prev => ({ ...prev, ...images }));
      }
    }
  }, []);
  
  // Charger les images quand les personnages changent
  useEffect(() => {
    if (allCharacters.length > 0 && customLoaded) {
      loadGalleryImagesBackground(allCharacters);
    }
  }, [allCharacters, customLoaded, loadGalleryImagesBackground]);

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
    const hasGeneratedImage = characterImages[item.id] && !item.imageUrl;
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('CharacterDetail', { character: item })}
      >
        <View style={styles.cardContent}>
          <View style={styles.imageContainer}>
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
            {hasGeneratedImage && (
              <View style={styles.generatedBadge}>
                <Text style={styles.generatedBadgeText}>🎨</Text>
              </View>
            )}
          </View>
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {item.name}
              </Text>
              {item.isCustom && <Text style={styles.customBadge}> ✨</Text>}
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.age}>{item.age} ans</Text>
              <Text style={styles.gender}>• {
                item.gender === 'male' ? 'Homme' :
                item.gender === 'female' ? 'Femme' : 
                'NB'
              }</Text>
            </View>
            <Text style={styles.scenario} numberOfLines={2}>
              {item.scenario}
            </Text>
            <View style={styles.tagsContainer}>
              {(item.tags || []).slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {(item.tags || []).length > 3 && (
                <Text style={styles.moreTagsText}>+{(item.tags || []).length - 3}</Text>
              )}
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
    backgroundColor: '#0a0a0f',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#12121a',
    borderBottomWidth: 0,
  },
  appTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#a0a0b0',
    textAlign: 'center',
    fontWeight: '500',
  },
  tagsFilterContainer: {
    backgroundColor: '#12121a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
  },
  tagsFilterList: {
    paddingHorizontal: 0,
    gap: 10,
  },
  tagFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#1e1e2e',
    marginRight: 8,
    borderWidth: 0,
  },
  tagFilterButtonActive: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tagFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a0a0b0',
  },
  tagFilterTextActive: {
    color: '#ffffff',
  },
  createButton: {
    margin: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 18,
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  carouselButton: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 20,
    backgroundColor: '#6366f1',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
  },
  carouselButtonIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  carouselButtonContent: {
    flex: 1,
  },
  carouselButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  carouselButtonSubtitle: {
    fontSize: 13,
    color: '#f0c0d0',
  },
  carouselButtonArrow: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#12121a',
  },
  searchInput: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  list: {
    padding: 16,
    backgroundColor: '#0a0a0f',
  },
  card: {
    backgroundColor: '#1e1e2e',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  imageContainer: {
    width: 80,
    height: 80,
    marginRight: 16,
    position: 'relative',
  },
  generatedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e1e2e',
  },
  generatedBadgeText: {
    fontSize: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  gender: {
    fontSize: 13,
    color: '#a0a0b0',
    marginLeft: 8,
  },
  scenario: {
    fontSize: 13,
    color: '#d1d5db',
    marginBottom: 12,
    lineHeight: 18,
  },
  moreTagsText: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '600',
    marginLeft: 8,
  },
  characterImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  customBadge: {
    color: '#6366f1',
  },
  age: {
    fontSize: 14,
    color: '#a0a0b0',
    marginBottom: 8,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#c0c0d0',
    marginBottom: 12,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 0,
  },
  tagText: {
    fontSize: 12,
    color: '#a0a0b0',
    fontWeight: '600',
  },
});
