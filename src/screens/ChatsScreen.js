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
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import des services avec protection
let StorageService = null;
let CustomCharacterService = null;
let enhancedCharacters = [];

try {
  StorageService = require('../services/StorageService').default;
} catch (e) {
  console.error('❌ Erreur import StorageService:', e.message);
}

try {
  CustomCharacterService = require('../services/CustomCharacterService').default;
} catch (e) {
  console.error('❌ Erreur import CustomCharacterService:', e.message);
}

try {
  const allCharsModule = require('../data/allCharacters');
  enhancedCharacters = allCharsModule.enhancedCharacters || allCharsModule.default || [];
} catch (e) {
  console.error('❌ Erreur import allCharacters:', e.message);
}

export default function ChatsScreen({ navigation }) {
  const [characters, setCharacters] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    console.log('📱 ChatsScreen monté');
    loadAllData();
    
    return () => {
      isMounted.current = false;
      console.log('📱 ChatsScreen démonté');
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('📱 ChatsScreen focus');
      loadAllData();
      return () => {};
    }, [])
  );

  const loadAllData = async () => {
    if (!isMounted.current) return;
    
    console.log('🔄 Chargement des données...');
    setError(null);
    
    try {
      // 1. Charger les personnages
      let allChars = [];
      try {
        allChars = Array.isArray(enhancedCharacters) ? [...enhancedCharacters] : [];
        console.log(`📚 ${allChars.length} personnages de base`);
      } catch (e) {
        console.log('⚠️ Erreur personnages:', e.message);
      }
      
      // Ajouter les personnages custom
      try {
        if (CustomCharacterService) {
          const custom = await CustomCharacterService.getCustomCharacters();
          if (Array.isArray(custom)) {
            const seenIds = new Set(allChars.map(c => c?.id));
            for (const c of custom) {
              if (c?.id && !seenIds.has(c.id)) {
                allChars.push(c);
              }
            }
          }
        }
      } catch (e) {
        console.log('⚠️ Erreur custom chars:', e.message);
      }
      
      if (isMounted.current) {
        setCharacters(allChars);
      }
      
      // 2. Charger les conversations
      let convs = [];
      try {
        if (StorageService) {
          convs = await StorageService.getAllConversations();
          convs = Array.isArray(convs) ? convs : [];
        } else {
          // Fallback: charger directement depuis AsyncStorage
          convs = await loadConversationsDirectly();
        }
        console.log(`💬 ${convs.length} conversations trouvées`);
      } catch (e) {
        console.log('⚠️ Erreur conversations:', e.message);
        // Fallback
        try {
          convs = await loadConversationsDirectly();
        } catch (e2) {
          console.log('⚠️ Fallback échoué:', e2.message);
        }
      }
      
      // Trier par date
      const sorted = convs.sort((a, b) => {
        const dateA = new Date(a?.lastUpdated || a?.createdAt || 0).getTime() || 0;
        const dateB = new Date(b?.lastUpdated || b?.createdAt || 0).getTime() || 0;
        return dateB - dateA;
      });
      
      if (isMounted.current) {
        setConversations(sorted);
        setLoading(false);
        setRefreshing(false);
      }
      
    } catch (err) {
      console.error('❌ Erreur loadAllData:', err);
      if (isMounted.current) {
        setError(err?.message || 'Erreur de chargement');
        setLoading(false);
        setRefreshing(false);
      }
    }
  };
  
  // Fallback: charger les conversations directement depuis AsyncStorage
  const loadConversationsDirectly = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const convKeys = keys.filter(k => 
        k.startsWith('conv_') && !k.includes('index') && !k.includes('deleted')
      );
      
      const result = [];
      const seenIds = new Set();
      
      for (const key of convKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            const charId = parsed?.characterId || key.split('_').pop();
            
            if (charId && !seenIds.has(charId)) {
              seenIds.add(charId);
              result.push({
                characterId: charId,
                messages: parsed?.messages || [],
                relationship: parsed?.relationship || { level: 1, affection: 50 },
                lastUpdated: parsed?.lastUpdated || new Date().toISOString(),
              });
            }
          }
        } catch (e) {}
      }
      
      return result;
    } catch (e) {
      console.error('❌ loadConversationsDirectly:', e);
      return [];
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData();
  }, []);

  const deleteConversation = (characterId) => {
    const char = findCharacter(characterId);
    Alert.alert(
      'Supprimer',
      `Supprimer la conversation avec ${char?.name || 'ce personnage'}?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              if (StorageService) {
                await StorageService.deleteConversation(characterId);
              }
              loadAllData();
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  const findCharacter = (characterId) => {
    if (!characterId) return null;
    const id = String(characterId);
    return characters.find(c => 
      c?.id === characterId || 
      c?.id === id || 
      String(c?.id) === id
    );
  };

  const openConversation = (character) => {
    try {
      navigation.navigate('Conversation', { character });
    } catch (e) {
      console.error('Navigation error:', e);
    }
  };

  const renderConversation = ({ item, index }) => {
    if (!item) return null;
    
    const characterId = item?.characterId || `unknown-${index}`;
    let character = findCharacter(characterId);
    
    if (!character) {
      character = {
        id: characterId,
        name: item?.characterName || `Chat #${String(characterId).slice(0, 6)}`,
        gender: 'unknown',
      };
    }
    
    const messages = Array.isArray(item?.messages) ? item.messages : [];
    const lastMsg = messages[messages.length - 1];
    const preview = lastMsg?.content 
      ? String(lastMsg.content).slice(0, 60) + '...'
      : 'Commencer la conversation';
    
    const initials = (character?.name || '??')
      .split(' ')
      .map(n => (n || '')[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || '??';

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => openConversation(character)}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.info}>
            <View style={styles.row}>
              <Text style={styles.name} numberOfLines={1}>{character?.name}</Text>
              <Text style={styles.date}>
                {item?.lastUpdated 
                  ? new Date(item.lastUpdated).toLocaleDateString('fr-FR')
                  : ''}
              </Text>
            </View>
            <Text style={styles.preview} numberOfLines={2}>{preview}</Text>
            <View style={styles.statsRow}>
              <Text style={styles.stat}>💬 {messages.length}</Text>
              <Text style={styles.stat}>💖 {item?.relationship?.affection || 50}%</Text>
              <Text style={styles.stat}>⭐ Niv.{item?.relationship?.level || 1}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => deleteConversation(characterId)}
        >
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // === RENDU v5.3.73 ===
  return (
    <View style={{ flex: 1, backgroundColor: '#12121f', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <StatusBar barStyle="light-content" backgroundColor="#12121f" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>💬 Conversations</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Text style={styles.refreshText}>🔄</Text>
        </TouchableOpacity>
      </View>
      
      {/* Contenu principal */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#C9A227" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadAllData}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Aucune conversation</Text>
            <Text style={styles.emptyText}>
              Allez dans l'onglet "Découvrir" pour commencer une conversation
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item, index) => item?.characterId?.toString() || `c-${index}`}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#C9A227']}
                tintColor="#C9A227"
                progressBackgroundColor="#1a1a2e"
              />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a12',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#12121f',
    borderBottomWidth: 1,
    borderBottomColor: '#C9A227',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#C9A227',
  },
  refreshBtn: {
    padding: 8,
  },
  refreshText: {
    fontSize: 22,
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 15,
    color: '#D4AF37',
    fontSize: 16,
  },
  errorIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#C9A227',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#0a0a12',
    fontWeight: 'bold',
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C9A227',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C9A227',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a0a12',
  },
  info: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  date: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 8,
  },
  preview: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    fontSize: 11,
    color: '#D4AF37',
  },
  deleteBtn: {
    backgroundColor: '#8B0000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  deleteBtnText: {
    fontSize: 18,
  },
});
