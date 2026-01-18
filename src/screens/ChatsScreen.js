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
import CustomCharacterService from '../services/CustomCharacterService';

// Import sécurisé des personnages
let enhancedCharacters = [];
try {
  const allCharsModule = require('../data/allCharacters');
  enhancedCharacters = allCharsModule.enhancedCharacters || allCharsModule.default || [];
  console.log(`📚 ${enhancedCharacters.length} personnages importés`);
} catch (e) {
  console.error('❌ Erreur import personnages:', e.message);
  enhancedCharacters = [];
}

export default function ChatsScreen({ navigation }) {
  const [allCharacters, setAllCharacters] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const mounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mounted.current = true;
    loadData();
    return () => { mounted.current = false; };
  }, []);

  // Recharger quand l'écran reprend le focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 ChatsScreen: Focus');
      if (mounted.current) {
        loadData();
      }
    }, [])
  );

  const loadData = async () => {
    if (!mounted.current) return;
    
    try {
      setError(null);
      setDebugInfo('Chargement...');
      setLoading(true);
      
      console.log('📱 ChatsScreen: Début chargement');
      
      // 1. Charger les personnages de base
      let chars = [];
      try {
        chars = Array.isArray(enhancedCharacters) ? [...enhancedCharacters] : [];
        console.log(`📚 ${chars.length} personnages de base`);
      } catch (e) {
        console.error('❌ Erreur personnages:', e);
        chars = [];
      }
      
      if (mounted.current) {
        setAllCharacters(chars);
        setDebugInfo(`${chars.length} personnages`);
      }
      
      // 2. Charger les conversations
      let convs = [];
      try {
        convs = await StorageService.getAllConversations();
        convs = Array.isArray(convs) ? convs : [];
        console.log(`💬 ${convs.length} conversations`);
      } catch (e) {
        console.error('❌ Erreur conversations:', e);
        convs = [];
      }
      
      // 3. Trier par date
      const sorted = convs.sort((a, b) => {
        const dateA = new Date(a?.lastUpdated || a?.createdAt || 0).getTime() || 0;
        const dateB = new Date(b?.lastUpdated || b?.createdAt || 0).getTime() || 0;
        return dateB - dateA;
      });
      
      if (mounted.current) {
        setConversations(sorted);
        setDebugInfo(`${chars.length} perso, ${sorted.length} conv`);
        console.log(`✅ Chargement terminé: ${sorted.length} conversations`);
      }
      
      // 4. Charger les personnages custom en arrière-plan
      try {
        const customChars = await CustomCharacterService.getCustomCharacters();
        if (Array.isArray(customChars) && mounted.current) {
          const seenIds = new Set(chars.map(c => c?.id));
          for (const char of customChars) {
            if (char?.id && !seenIds.has(char.id)) {
              chars.push(char);
              seenIds.add(char.id);
            }
          }
          setAllCharacters([...chars]);
        }
      } catch (e) {
        console.log('⚠️ Custom chars:', e.message);
      }
      
    } catch (err) {
      console.error('❌ Erreur loadData:', err);
      if (mounted.current) {
        setError(err?.message || 'Erreur inconnue');
        setConversations([]);
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const deleteConversation = async (characterId) => {
    const character = findCharacter(characterId);
    Alert.alert(
      'Supprimer',
      `Supprimer la conversation avec ${character?.name || 'ce personnage'}?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteConversation(characterId);
              loadData();
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  const findCharacter = (characterId) => {
    if (!characterId || !Array.isArray(allCharacters)) return null;
    
    const id = String(characterId);
    return allCharacters.find(c => 
      c?.id === characterId || 
      c?.id === id || 
      String(c?.id) === id ||
      c?.serverId === characterId ||
      c?.originalId === characterId
    );
  };

  const renderItem = ({ item, index }) => {
    if (!item) return null;
    
    try {
      const characterId = item?.characterId || item?.id || `unknown-${index}`;
      let character = findCharacter(characterId);
      
      // Créer un placeholder si non trouvé
      if (!character) {
        character = {
          id: characterId,
          name: `Chat #${String(characterId).substring(0, 6)}`,
          gender: 'unknown',
        };
      }
      
      const messages = Array.isArray(item?.messages) ? item.messages : [];
      const lastMessage = messages[messages.length - 1];
      const preview = lastMessage?.content 
        ? String(lastMessage.content).substring(0, 80) + '...'
        : 'Aucun message';
      
      const initials = (character?.name || '??')
        .split(' ')
        .map(n => (n || '')[0] || '')
        .join('')
        .substring(0, 2)
        .toUpperCase() || '??';

      return (
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardTouchable}
            onPress={() => navigation.navigate('Conversation', { character })}
          >
            <View style={styles.cardContent}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.info}>
                <View style={styles.header}>
                  <Text style={styles.name} numberOfLines={1}>
                    {character?.name || 'Inconnu'}
                  </Text>
                  <Text style={styles.date}>
                    {item?.lastUpdated 
                      ? new Date(item.lastUpdated).toLocaleDateString('fr-FR')
                      : ''}
                  </Text>
                </View>
                <Text style={styles.preview} numberOfLines={2}>{preview}</Text>
                <View style={styles.stats}>
                  <Text style={styles.statText}>💬 {messages.length}</Text>
                  <Text style={styles.statText}>💖 {item?.relationship?.affection || 50}%</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => deleteConversation(characterId)}
          >
            <Text style={styles.deleteBtnText}>🗑️ Supprimer</Text>
          </TouchableOpacity>
        </View>
      );
    } catch (e) {
      console.error('❌ Erreur rendu item:', e);
      return null;
    }
  };

  // Fonction de navigation retour sécurisée
  const goBack = () => {
    try {
      if (navigation?.canGoBack?.()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
    } catch (e) {
      console.log('Navigation error:', e);
    }
  };

  // === RENDU ===
  
  // Header commun
  const renderHeader = (subtitle = '') => (
    <View style={styles.headerBar}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Conversations</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <Text style={styles.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // État de chargement
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe}>
        {renderHeader('Chargement...')}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Chargement...</Text>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        {renderHeader('Erreur')}
        <View style={styles.centerContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Aucune conversation
  if (!conversations || conversations.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        {renderHeader('0 conversation')}
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>Aucune conversation</Text>
          <Text style={styles.emptyText}>
            Commencez une conversation avec un personnage
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Liste des conversations
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {renderHeader(`${conversations.length} conversation(s)`)}
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={(item, index) => 
            item?.characterId?.toString() || `conv-${index}`
          }
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
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Aucune conversation</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerBar: {
    padding: 15,
    backgroundColor: '#6366f1',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  backBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtnText: {
    fontSize: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6b7280',
  },
  debugText: {
    marginTop: 10,
    fontSize: 12,
    color: '#9ca3af',
  },
  errorEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#6366f1',
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
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
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
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
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  date: {
    fontSize: 11,
    color: '#9ca3af',
    marginLeft: 8,
  },
  preview: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  statText: {
    fontSize: 11,
    color: '#4f46e5',
    fontWeight: '500',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    padding: 10,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
