import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomCharacterService from '../services/CustomCharacterService';

// Import optionnel AuthService
let AuthService = null;
try {
  AuthService = require('../services/AuthService').default;
} catch (e) {
  console.log('AuthService non disponible');
}

// Cache pour éviter les rechargements inutiles
let cachedCharacters = null;
let lastLoadTime = 0;
const CACHE_DURATION = 10000; // 10 secondes

export default function MyCharactersScreen({ navigation }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'public', 'private'
  const loadingRef = useRef(false);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    // Charger immédiatement depuis le cache si disponible
    if (cachedCharacters && cachedCharacters.length > 0) {
      setCharacters(cachedCharacters);
      setLoading(false);
    }
    
    // Puis charger les données fraîches
    loadCharacters(false);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Afficher le cache immédiatement
      if (cachedCharacters) {
        setCharacters(cachedCharacters);
      }
      
      // Ne recharger que si nécessaire
      const now = Date.now();
      if (now - lastLoadTime > CACHE_DURATION) {
        loadCharacters(false);
      }
    });
    return unsubscribe;
  }, [navigation]);

  const loadCharacters = async (forceRefresh = false) => {
    // Éviter les chargements multiples
    if (loadingRef.current && !forceRefresh) return;
    loadingRef.current = true;
    
    try {
      // Utiliser le cache si disponible et non expiré
      const now = Date.now();
      if (!forceRefresh && cachedCharacters && (now - lastLoadTime < CACHE_DURATION)) {
        setCharacters(cachedCharacters);
        setLoading(false);
        loadingRef.current = false;
        return;
      }
      
      // Ne montrer le loading que si pas de données en cache
      if (!cachedCharacters || cachedCharacters.length === 0) {
        setLoading(true);
      }
      
      // ÉTAPE 1: Charger les personnages locaux IMMÉDIATEMENT (rapide)
      let localChars = [];
      try {
        // Essayer d'abord le stockage local direct (plus rapide)
        const localData = await AsyncStorage.getItem('custom_characters_anonymous');
        if (localData) {
          localChars = JSON.parse(localData);
        }
        
        // Essayer aussi la clé avec l'utilisateur si connecté
        if (AuthService) {
          const user = AuthService.getCurrentUser();
          if (user?.id) {
            const userData = await AsyncStorage.getItem(`custom_characters_${user.id}`);
            if (userData) {
              const userChars = JSON.parse(userData);
              // Fusionner sans doublons
              const existingIds = new Set(localChars.map(c => c.id));
              userChars.forEach(c => {
                if (!existingIds.has(c.id)) {
                  localChars.push(c);
                }
              });
            }
          }
        }
      } catch (e) {
        console.log('⚠️ Erreur lecture locale:', e.message);
      }
      
      // Mettre à jour immédiatement avec les données locales
      if (localChars.length > 0) {
        cachedCharacters = localChars;
        lastLoadTime = now;
        setCharacters(localChars);
        setLoading(false);
        initialLoadDone.current = true;
      }
      
      // ÉTAPE 2: Synchroniser avec le serveur en arrière-plan (avec timeout)
      loadServerDataAsync(localChars);
      
    } catch (error) {
      console.error('Erreur chargement personnages:', error);
      if (cachedCharacters) {
        setCharacters(cachedCharacters);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };
  
  // Charger les données du serveur en arrière-plan
  const loadServerDataAsync = async (localChars) => {
    try {
      if (!CustomCharacterService || !AuthService) return;
      if (!AuthService.isLoggedIn()) return;
      
      // Timeout pour éviter de bloquer
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      const serverChars = await Promise.race([
        AuthService.getMyCharacters(),
        timeoutPromise
      ]);
      
      if (serverChars && serverChars.length > 0) {
        const finalChars = mergeCharacters(localChars, serverChars);
        cachedCharacters = finalChars;
        lastLoadTime = Date.now();
        setCharacters(finalChars);
      }
    } catch (e) {
      console.log('⚠️ Sync serveur en arrière-plan échoué (normal si hors-ligne)');
    }
  };

  const mergeCharacters = (local, server) => {
    // Utiliser les personnages locaux comme base
    const merged = [...local];
    const existingIds = new Set(merged.map(c => c.id));
    
    // Ajouter les personnages du serveur qui ne sont pas en local
    server.forEach(serverChar => {
      if (!existingIds.has(serverChar.id) && !merged.find(c => c.serverId === serverChar.id)) {
        merged.push({ ...serverChar, isFromServer: true });
      }
    });
    
    return merged;
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCharacters(true); // Forcer le rafraîchissement
    setRefreshing(false);
  }, []);
  
  // Filtrer les personnages avec useMemo
  const getFilteredCharacters = useMemo(() => {
    if (filter === 'public') {
      return characters.filter(c => c.isPublic);
    } else if (filter === 'private') {
      return characters.filter(c => !c.isPublic);
    }
    return characters;
  }, [characters, filter]);

  const handleDelete = useCallback((character) => {
    Alert.alert(
      'Supprimer le personnage',
      `Êtes-vous sûr de vouloir supprimer "${character.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Suppression du personnage:', character.id);
              
              // ÉTAPE 1: Suppression immédiate de l'état local
              setCharacters(prev => prev.filter(c => c.id !== character.id));
              cachedCharacters = cachedCharacters ? cachedCharacters.filter(c => c.id !== character.id) : null;
              
              // ÉTAPE 2: Suppression directe dans TOUTES les clés AsyncStorage possibles
              const keysToCheck = [
                'custom_characters_anonymous',
                'custom_characters',
                'my_characters',
                'created_characters',
              ];
              
              // Ajouter les clés utilisateur
              if (AuthService && AuthService.getCurrentUser) {
                const user = AuthService.getCurrentUser();
                if (user?.id) {
                  keysToCheck.push(`custom_characters_${user.id}`);
                  keysToCheck.push(`my_characters_${user.id}`);
                }
              }
              
              // Supprimer de chaque clé
              for (const key of keysToCheck) {
                try {
                  const data = await AsyncStorage.getItem(key);
                  if (data) {
                    const chars = JSON.parse(data);
                    if (Array.isArray(chars)) {
                      const filtered = chars.filter(c => c.id !== character.id && c.id !== String(character.id));
                      if (filtered.length !== chars.length) {
                        await AsyncStorage.setItem(key, JSON.stringify(filtered));
                        console.log('✅ Supprimé de', key);
                      }
                    }
                  }
                } catch (e) {
                  console.log('⚠️ Clé', key, ':', e.message);
                }
              }
              
              // ÉTAPE 3: CustomCharacterService si disponible
              if (CustomCharacterService && CustomCharacterService.deleteCustomCharacter) {
                try {
                  await CustomCharacterService.deleteCustomCharacter(character.id);
                  console.log('✅ Supprimé via CustomCharacterService');
                } catch (e) {
                  console.log('⚠️ Erreur CustomCharacterService:', e.message);
                }
              }
              
              // ÉTAPE 4: Si public, retirer du serveur
              if (character.isPublic && character.serverId && CustomCharacterService) {
                try {
                  await CustomCharacterService.unpublishCharacter(character.id);
                } catch (e) {}
              }
              
              // Si connecté, supprimer du serveur auth
              if (AuthService && AuthService.isLoggedIn && AuthService.isLoggedIn()) {
                try {
                  await AuthService.deleteCharacter(character.id);
                } catch (e) {}
              }
              
              Alert.alert('Succès', 'Personnage supprimé avec succès');
            } catch (error) {
              console.error('❌ Erreur suppression:', error);
              // Même en cas d'erreur, recharger pour être sûr
              loadCharacters(true);
              Alert.alert('Erreur', 'Problème lors de la suppression');
            }
          }
        }
      ]
    );
  }, []);

  const handleEdit = (character) => {
    navigation.navigate('CreateCharacter', { characterToEdit: character });
  };

  const handleTogglePublic = async (character) => {
    try {
      if (character.isPublic) {
        // Rendre privé
        await CustomCharacterService.unpublishCharacter(character.id);
        Alert.alert('Succès', 'Personnage rendu privé');
      } else {
        // Rendre public
        await CustomCharacterService.publishCharacter(character.id);
        Alert.alert('Succès', 'Personnage publié !');
      }
      loadCharacters();
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de changer la visibilité');
    }
  };

  const renderCharacter = useCallback(({ item }) => {
    // Protection contre les items null/undefined
    if (!item || !item.id) {
      console.log('⚠️ renderCharacter: item invalide');
      return null;
    }
    
    // Formater la date de manière sécurisée
    const formatDate = (dateValue) => {
      try {
        if (!dateValue) return 'Date inconnue';
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return 'Date inconnue';
        return date.toLocaleDateString('fr-FR');
      } catch {
        return 'Date inconnue';
      }
    };
    
    return (
      <View style={styles.characterCard}>
        <View style={styles.characterHeader}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.characterImage} />
          ) : (
            <View style={styles.characterImagePlaceholder}>
              <Text style={styles.placeholderText}>{item.name?.charAt(0) || '?'}</Text>
            </View>
          )}
          
          <View style={styles.characterInfo}>
            <Text style={styles.characterName}>{item.name || 'Sans nom'}</Text>
            <Text style={styles.characterAge}>{item.age || '?'} ans • {item.gender === 'female' ? 'Femme' : 'Homme'}</Text>
            <View style={styles.tagRow}>
              <View style={[styles.tag, item.isPublic ? styles.tagPublic : styles.tagPrivate]}>
                <Text style={styles.tagText}>{item.isPublic ? '🌐 Public' : '🔒 Privé'}</Text>
              </View>
              {item.temperament && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.temperament}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        {item.personality && (
          <Text style={styles.characterPersonality} numberOfLines={2}>
            {item.personality}
          </Text>
        )}
        
        <View style={styles.characterActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEdit(item)}
          >
            <Text style={styles.actionButtonText}>✏️ Modifier</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, item.isPublic ? styles.privateButton : styles.publicButton]}
            onPress={() => handleTogglePublic(item)}
          >
            <Text style={styles.actionButtonText}>
              {item.isPublic ? '🔒 Rendre privé' : '🌐 Publier'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.characterDate}>
          Créé le {formatDate(item.createdAt)}
        </Text>
      </View>
    );
  }, [handleDelete, handleEdit, handleTogglePublic]);

  // v5.3.73 - Écran de chargement avec SafeAreaView
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#6366f1', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Chargement des personnages...</Text>
        </View>
      </View>
    );
  }

  // v5.3.73 - Rendu principal avec structure robuste
  return (
    <View style={{ flex: 1, backgroundColor: '#6366f1', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <View style={styles.container}>
        {/* Titre */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mes personnages</Text>
        </View>
        
        {/* Filtres */}
        <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Tous ({characters.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'public' && styles.filterButtonActive]}
          onPress={() => setFilter('public')}
        >
          <Text style={[styles.filterText, filter === 'public' && styles.filterTextActive]}>
            🌐 Publics ({characters.filter(c => c.isPublic).length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'private' && styles.filterButtonActive]}
          onPress={() => setFilter('private')}
        >
          <Text style={[styles.filterText, filter === 'private' && styles.filterTextActive]}>
            🔒 Privés ({characters.filter(c => !c.isPublic).length})
          </Text>
        </TouchableOpacity>
      </View>

      {getFilteredCharacters.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>Aucun personnage créé</Text>
          <Text style={styles.emptyText}>
            Créez votre premier personnage personnalisé !
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateCharacter')}
          >
            <Text style={styles.createButtonText}>✨ Créer un personnage</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={getFilteredCharacters}
          renderItem={renderCharacter}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />
          }
        />
      )}

        {/* Bouton flottant */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateCharacter')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#6366f1',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6b7280',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  filterText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 15,
    paddingBottom: 80,
  },
  characterCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  characterHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  characterImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  characterImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  placeholderText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  characterInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  characterName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  characterAge: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  tagPublic: {
    backgroundColor: '#dcfce7',
  },
  tagPrivate: {
    backgroundColor: '#fef3c7',
  },
  tagText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  characterPersonality: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  characterActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#e0e7ff',
  },
  publicButton: {
    backgroundColor: '#dcfce7',
  },
  privateButton: {
    backgroundColor: '#fef3c7',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    flex: 0.3,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  characterDate: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 25,
  },
  createButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
});
