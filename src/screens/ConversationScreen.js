import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import GroqService from '../services/GroqService';
import StorageService from '../services/StorageService';
import ImageGenerationService from '../services/ImageGenerationService';
import UserProfileService from '../services/UserProfileService';
import GalleryService from '../services/GalleryService';

export default function ConversationScreen({ route, navigation }) {
  const { character } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [relationship, setRelationship] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [conversationBackground, setConversationBackground] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadConversation();
    loadUserProfile();
    loadGallery();
    loadBackground();
    navigation.setOptions({
      title: character.name,
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('CharacterDetail', { character })}
          style={{ marginRight: 15 }}
        >
          <Text style={{ color: '#fff', fontSize: 16 }}>ℹ️</Text>
        </TouchableOpacity>
      ),
    });
  }, [character]);

  const loadUserProfile = async () => {
    const profile = await UserProfileService.getProfile();
    setUserProfile(profile);
  };

  const loadGallery = async () => {
    const characterGallery = await GalleryService.getGallery(character.id);
    setGallery(characterGallery);
  };

  const loadBackground = async () => {
    const bg = await GalleryService.getConversationBackground(character.id);
    setConversationBackground(bg);
  };

  const loadConversation = async () => {
    const saved = await StorageService.loadConversation(character.id);
    if (saved && saved.messages.length > 0) {
      setMessages(saved.messages);
      setRelationship(saved.relationship);
    } else {
      // Start with character's initial message
      const initialMessage = {
        role: 'assistant',
        content: character.startMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages([initialMessage]);
      const rel = await StorageService.loadRelationship(character.id);
      setRelationship(rel);
    }
  };

  const saveConversation = async (newMessages, newRelationship) => {
    await StorageService.saveConversation(character.id, newMessages, newRelationship);
  };

  const updateRelationship = (userMessage) => {
    if (!relationship) return relationship;

    const changes = StorageService.calculateRelationshipChange(userMessage, character);
    
    const newRelationship = {
      experience: relationship.experience + changes.expGain,
      level: Math.floor((relationship.experience + changes.expGain) / 100) + 1,
      affection: Math.max(0, Math.min(100, relationship.affection + changes.affectionChange)),
      trust: Math.max(0, Math.min(100, relationship.trust + changes.trustChange)),
      interactions: relationship.interactions + 1,
    };

    return newRelationship;
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      // Update relationship
      const newRelationship = updateRelationship(userMessage.content);
      setRelationship(newRelationship);

      // Generate AI response
      const response = await GroqService.generateResponse(
        updatedMessages,
        character,
        userProfile
      );

      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      
      // Save conversation
      await saveConversation(finalMessages, newRelationship);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('Erreur', error.message);
      // Remove the user message if there was an error
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const generateImage = async () => {
    if (generatingImage) return;

    setGeneratingImage(true);
    try {
      // Create a prompt based on the last few messages
      const recentMessages = messages.slice(-3).map(m => m.content).join(' ');
      const prompt = `${character.appearance}, ${recentMessages}`;
      
      const imageUrl = await ImageGenerationService.generateImage(prompt);
      
      // Sauvegarder dans la galerie
      await GalleryService.saveImageToGallery(character.id, imageUrl);
      await loadGallery(); // Recharger la galerie
      
      const imageMessage = {
        role: 'system',
        content: '[Image générée et sauvegardée dans la galerie]',
        image: imageUrl,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...messages, imageMessage];
      setMessages(updatedMessages);
      await saveConversation(updatedMessages, relationship);

      Alert.alert('Succès', 'Image générée et ajoutée à la galerie !');

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de générer l\'image');
    } finally {
      setGeneratingImage(false);
    }
  };

  const formatRPMessage = (content) => {
    // Parse RP format: *actions* "dialogue" *thoughts*
    const parts = [];
    let lastIndex = 0;
    
    // Match patterns for actions/thoughts (between asterisks) and dialogue (between quotes)
    const actionRegex = /\*([^*]+)\*/g;
    const dialogueRegex = /"([^"]+)"/g;
    
    let match;
    const allMatches = [];
    
    // Find all actions
    while ((match = actionRegex.exec(content)) !== null) {
      allMatches.push({ type: 'action', text: match[1], index: match.index, length: match[0].length });
    }
    
    // Find all dialogues
    while ((match = dialogueRegex.exec(content)) !== null) {
      allMatches.push({ type: 'dialogue', text: match[1], index: match.index, length: match[0].length });
    }
    
    // Sort by index
    allMatches.sort((a, b) => a.index - b.index);
    
    // Build parts array
    let currentIndex = 0;
    allMatches.forEach(match => {
      // Add text before this match
      if (match.index > currentIndex) {
        const text = content.substring(currentIndex, match.index).trim();
        if (text) {
          parts.push({ type: 'text', text });
        }
      }
      // Add the match
      parts.push({ type: match.type, text: match.text });
      currentIndex = match.index + match.length;
    });
    
    // Add remaining text
    if (currentIndex < content.length) {
      const text = content.substring(currentIndex).trim();
      if (text) {
        parts.push({ type: 'text', text });
      }
    }
    
    return parts.length > 0 ? parts : [{ type: 'text', text: content }];
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    if (isSystem && item.image) {
      return (
        <View style={styles.imageMessageContainer}>
          <Image source={{ uri: item.image }} style={styles.generatedImage} />
          <Text style={styles.imageTimestamp}>
            {new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      );
    }

    const formattedParts = formatRPMessage(item.content);

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          {!isUser && (
            <Text style={styles.characterName}>{character.name}</Text>
          )}
          <View style={styles.messageContent}>
            {formattedParts.map((part, index) => {
              if (part.type === 'action') {
                return (
                  <Text key={index} style={styles.actionText}>
                    *{part.text}*
                  </Text>
                );
              } else if (part.type === 'dialogue') {
                return (
                  <Text key={index} style={styles.dialogueText}>
                    "{part.text}"
                  </Text>
                );
              } else {
                return (
                  <Text key={index} style={styles.normalText}>
                    {part.text}
                  </Text>
                );
              }
            })}
          </View>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, conversationBackground && { backgroundColor: 'transparent' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {conversationBackground && (
        <Image
          source={{ uri: conversationBackground }}
          style={styles.backgroundImage}
          blurRadius={2}
        />
      )}
      
      {relationship && (
        <View style={styles.relationshipBar}>
          <View style={styles.relationshipStat}>
            <Text style={styles.relationshipLabel}>Niv. {relationship.level}</Text>
            <Text style={styles.relationshipValue}>{relationship.experience} XP</Text>
          </View>
          <View style={styles.relationshipStat}>
            <Text style={styles.relationshipLabel}>💖 {relationship.affection}%</Text>
          </View>
          <View style={styles.relationshipStat}>
            <Text style={styles.relationshipLabel}>🤝 {relationship.trust}%</Text>
          </View>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={() => navigation.navigate('Gallery', { character })}
          >
            <Text style={styles.galleryButtonText}>🖼️ {gallery.length}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.loadingText}>{character.name} écrit...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.imageButton}
          onPress={generateImage}
          disabled={generatingImage}
        >
          {generatingImage ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <Text style={styles.imageButtonText}>🎨</Text>
          )}
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Votre message (utilisez *actions* et 'paroles')..."
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  relationshipBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  relationshipStat: {
    alignItems: 'center',
  },
  relationshipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  relationshipValue: {
    fontSize: 10,
    color: '#e0e7ff',
    marginTop: 2,
  },
  messagesList: {
    padding: 15,
    paddingBottom: 10,
  },
  messageContainer: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 15,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#6366f1',
  },
  assistantBubble: {
    backgroundColor: '#fff',
  },
  characterName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 5,
  },
  messageContent: {
    marginBottom: 5,
  },
  actionText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6b7280',
    marginBottom: 3,
  },
  dialogueText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 3,
  },
  normalText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 3,
  },
  timestamp: {
    fontSize: 10,
    color: '#9ca3af',
    alignSelf: 'flex-end',
  },
  imageMessageContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  generatedImage: {
    width: 300,
    height: 300,
    borderRadius: 15,
    backgroundColor: '#e5e7eb',
  },
  imageTimestamp: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  imageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 5,
  },
  imageButtonText: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  galleryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  galleryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
});
