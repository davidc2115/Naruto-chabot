import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import StorageService from '../services/StorageService';
import enhancedCharacters from '../data/allCharacters';
import CustomCharacterService from '../services/CustomCharacterService';

export default function ChatsScreen({ navigation }) {
  const [allCharacters, setAllCharacters] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const isInitialized = useRef(false);

  // Charger au premier rendu
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      loadData(true);
    }
  }, []);

  // Recharger quand l'écran reprend le focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 ChatsScreen: Focus - Rechargement...');
      loadData(false);
    }, [])
  );

  const loadData = async (forceRefresh = false) => {
    try {
      setError(null);
      if (!refreshing) setLoading(true);
      console.log('📱 ChatsScreen: Chargement des données...');
      
      // Charger les personnages de base IMMÉDIATEMENT
      const allChars = [...(enhancedCharacters || [])];
      const seenIds = new Set(allChars.map(c => c.id));
      setAllCharacters(allChars);
      console.log(`📚 ${allChars.length} personnages de base chargés`);
      
      // Charger les conversations LOCALES
      let allConversations = [];
      try {
        allConversations = await StorageService.getAllConversations() || [];
      } catch (e) {
        console.log('⚠️ Erreur chargement conversations:', e.message);
        allConversations = [];
      }
      
      // Trier par date
      const sortedConversations = allConversations.sort((a, b) => {
        const dateA = new Date(a.lastUpdated || a.createdAt || 0).getTime();
        const dateB = new Date(b.lastUpdated || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      
      console.log(`✅ ${sortedConversations.length} conversations chargées`);
      setConversations(sortedConversations);
      
      // Charger les personnages custom en arrière-plan (sans bloquer)
      setTimeout(async () => {
        try {
          const customChars = await CustomCharacterService.getCustomCharacters().catch(() => []);
          for (const char of (customChars || [])) {
            if (char && char.id && !seenIds.has(char.id)) {
              allChars.push(char);
              seenIds.add(char.id);
            }
          }
          setAllCharacters([...allChars]);
        } catch (e) {
          console.log('⚠️ Personnages custom non chargés:', e.message);
        }
      }, 100);
      
    } catch (err) {
      console.error('❌ Erreur loadData ChatsScreen:', err);
      setError(err.message || 'Erreur de chargement');
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    await loadData(true);
  };

  const deleteConversation = async (characterId) => {
    const character = getCharacter(characterId);
    Alert.alert(
      'Supprimer définitivement',
      `Voulez-vous vraiment supprimer définitivement la conversation avec ${character?.name || 'ce personnage'} ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: async () => {
            const success = await StorageService.deleteConversation(characterId);
            if (success) {
              // Recharger immédiatement avec forceRefresh
              await loadData(true);
              Alert.alert('✅ Supprimée', 'La conversation a été supprimée définitivement.');
            } else {
              Alert.alert('❌ Erreur', 'Impossible de supprimer la conversation.');
            }
          },
        },
      ]
    );
  };

  const getCharacter = (characterId) => {
    // Chercher par ID exact
    let char = allCharacters.find(c => c.id === characterId);
    if (char) return char;
    
    // Chercher par ID converti en string
    char = allCharacters.find(c => c.id === String(characterId));
    if (char) return char;
    
    // Chercher par ID partiel (pour les custom_xxx)
    char = allCharacters.find(c => 
      c.id?.includes(characterId) || characterId?.includes(c.id)
    );
    if (char) return char;
    
    // Chercher par serverId
    char = allCharacters.find(c => c.serverId === characterId);
    if (char) return char;
    
    // Chercher par originalId
    char = allCharacters.find(c => c.originalId === characterId);
    
    return char;
  };

  const renderConversation = ({ item }) => {
    // v5.3.47 - TOUJOURS afficher la conversation, même sans personnage
    if (!item) {
      console.log('⚠️ Item null, skip');
      return null;
    }
    
    const characterId = item.characterId || item.id || 'unknown';
    console.log(`🔍 Rendu conversation: ${characterId}`);
    
    // Chercher le personnage
    let character = getCharacter(characterId);
    
    // v5.3.47 - TOUJOURS créer un placeholder si non trouvé
    if (!character) {
      console.log(`⚠️ Personnage ${characterId} non trouvé, création placeholder`);
      character = {
        id: characterId,
        name: `Conversation #${String(characterId).substring(0, 6)}`,
        gender: 'unknown',
        age: 25,
        tags: ['conversation'],
        scenario: 'Conversation en cours',
        startMessage: '...',
      };
    }
    
    // S'assurer que name existe
    if (!character.name) {
      character.name = `Chat ${String(characterId).substring(0, 6)}`;
    }

    const messages = item.messages || [];
    const lastMessage = messages[messages.length - 1];
    const messagePreview = lastMessage?.content 
      ? lastMessage.content.substring(0, 80) + (lastMessage.content.length > 80 ? '...' : '')
      : 'Aucun message';
    
    // Extraire les initiales
    const getInitials = (name) => {
      if (!name || typeof name !== 'string') return '?';
      const parts = name.split(' ').filter(n => n);
      if (parts.length === 0) return '?';
      return parts.map(n => n[0] || '').join('').substring(0, 2) || '?';
    };

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={() => navigation.navigate('Conversation', { character })}
        >
          <View style={styles.cardContent}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {getInitials(character.name)}
              </Text>
            </View>
            <View style={styles.info}>
              <View style={styles.header}>
                <Text style={styles.name}>{character.name}</Text>
                <Text style={styles.date}>
                  {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString('fr-FR') : ''}
                </Text>
              </View>
              <Text style={styles.preview} numberOfLines={2}>
                {messagePreview}
              </Text>
              <View style={styles.statsContainer}>
                <Text style={styles.stats}>
                  💬 {messages.length} messages
                </Text>
                <Text style={styles.stats}>
                  💖 {item.relationship?.affection || 50}%
                </Text>
                <Text style={styles.stats}>
                  ⭐ Niv.{item.relationship?.level || 1}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteConversation(characterId)}
        >
          <Text style={styles.deleteButtonText}>🗑️ Supprimer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // État de chargement
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Retour</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Conversations</Text>
            </View>
            <View style={{ width: 70 }} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Chargement des conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Retour</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Conversations</Text>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <Text style={styles.refreshButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyTitle}>Erreur de chargement</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => loadData(true)}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Pas de conversations
  if (!conversations || conversations.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Retour</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Conversations</Text>
              <Text style={styles.subtitle}>0 conversation</Text>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <Text style={styles.refreshButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>Aucune conversation</Text>
          <Text style={styles.emptyText}>
            Commencez une conversation avec un personnage depuis l'onglet Personnages
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Affichage normal avec conversations
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerBar}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Retour</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Conversations</Text>
              <Text style={styles.subtitle}>{conversations.length} conversation(s)</Text>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <Text style={styles.refreshButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item, index) => item?.characterId?.toString() || `conv-${index}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6366f1']}
              tintColor="#6366f1"
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerBar: {
    padding: 20,
    paddingTop: 15,
    backgroundColor: '#6366f1',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#6366f1',
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 22,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardTouchable: {
    flex: 1,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 15,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#fee2e2',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  info: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
  },
  preview: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 10,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  stats: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
