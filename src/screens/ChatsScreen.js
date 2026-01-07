import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import StorageService from '../services/StorageService';
import CustomCharacterService from '../services/CustomCharacterService';
import characters from '../data/characters';

export default function ChatsScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [allCharacters, setAllCharacters] = useState([]);

  useEffect(() => {
    loadAll();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadAll();
    });

    return unsubscribe;
  }, [navigation]);

  const loadAll = async () => {
    // Charger les personnages par défaut + personnalisés
    const customChars = await CustomCharacterService.getCustomCharacters();
    const combined = [...characters, ...customChars];
    setAllCharacters(combined);
    
    // Charger les conversations
    const allConversations = await StorageService.getAllConversations();
    setConversations(allConversations);
  };

  const deleteConversation = async (characterId) => {
    const character = getCharacter(characterId);
    Alert.alert(
      'Supprimer définitivement',
      `Voulez-vous vraiment supprimer la conversation avec ${character?.name || 'ce personnage'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteConversation(characterId);
            loadAll();
          },
        },
      ]
    );
  };

  const getCharacter = (characterId) => {
    return allCharacters.find(c => c.id === characterId);
  };

  const renderConversation = ({ item }) => {
    const character = getCharacter(item.characterId);
    if (!character) {
      console.log('⚠️ Personnage non trouvé pour ID:', item.characterId);
      return null;
    }

    const lastMessage = item.messages[item.messages.length - 1];
    const messagePreview = lastMessage?.content?.substring(0, 80) + '...' || 'Aucun message';
    
    // Calculer le niveau avec le nouveau système
    const level = item.relationship?.level || 1;
    const xp = item.relationship?.experience || 0;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={() => navigation.navigate('Conversation', { character })}
        >
          <View style={styles.cardContent}>
            <View style={[styles.avatarPlaceholder, character.isCustom && styles.customAvatar]}>
              <Text style={styles.avatarText}>
                {character.name.split(' ').map(n => n[0]).join('')}
              </Text>
              {character.isCustom && (
                <View style={styles.customBadge}>
                  <Text style={styles.customBadgeText}>✨</Text>
                </View>
              )}
            </View>
            <View style={styles.info}>
              <View style={styles.header}>
                <Text style={styles.name}>{character.name}</Text>
                <Text style={styles.date}>
                  {new Date(item.lastUpdated).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <Text style={styles.preview} numberOfLines={2}>
                {messagePreview}
              </Text>
              <View style={styles.statsContainer}>
                <Text style={styles.stats}>
                  💬 {item.messages.length}
                </Text>
                <Text style={styles.stats}>
                  ⭐ Niv.{level}
                </Text>
                <Text style={styles.stats}>
                  💖 {item.relationship?.affection || 50}%
                </Text>
                <Text style={styles.statsXp}>
                  {xp} XP
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteConversation(item.characterId)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>💬</Text>
        <Text style={styles.emptyTitle}>Aucune conversation</Text>
        <Text style={styles.emptyText}>
          Commencez une conversation depuis l'onglet Personnages
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Conversations</Text>
        <Text style={styles.subtitle}>{conversations.length} conversation(s)</Text>
      </View>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={item => item.characterId.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerBar: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#6366f1',
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
    flexDirection: 'row',
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
    backgroundColor: '#fee2e2',
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 20,
  },
  avatarPlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 27,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customAvatar: {
    backgroundColor: '#10b981',
  },
  customBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fbbf24',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customBadgeText: {
    fontSize: 12,
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
    marginBottom: 5,
  },
  name: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  date: {
    fontSize: 11,
    color: '#9ca3af',
  },
  preview: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  stats: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  statsXp: {
    fontSize: 11,
    color: '#9ca3af',
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
