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
import TextGenerationService from '../services/TextGenerationService';
import StorageService from '../services/StorageService';
import ImageGenerationService from '../services/ImageGenerationService';
import UserProfileService from '../services/UserProfileService';
import GalleryService from '../services/GalleryService';

export default function ConversationScreen({ route, navigation }) {
  const { character } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [relationship, setRelationship] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [conversationBackground, setConversationBackground] = useState(null);
  const [initError, setInitError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const flatListRef = useRef(null);

  // Vérification de sécurité
  useEffect(() => {
    if (!character || !character.id) {
      console.error('❌ Character invalide:', character);
      setInitError('Personnage invalide ou incomplet');
      Alert.alert(
        'Erreur',
        'Impossible de charger la conversation. Le personnage est invalide.',
        [{ text: 'Retour', onPress: () => navigation.goBack() }]
      );
      return;
    }
    
    console.log('✅ Initialisation conversation pour:', character.name, 'ID:', character.id);
    initializeScreen();
  }, [character]);

  const initializeScreen = async () => {
    try {
      // Les clés API Groq sont maintenant chargées automatiquement dans generateResponse
      
      // Charger le reste
      await Promise.all([
        loadConversation(),
        loadUserProfile(),
        loadGallery(),
        loadBackground()
      ]);
      
      setIsInitialized(true);
      
      navigation.setOptions({
        title: character?.name || 'Conversation',
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('CharacterDetail', { character })}
            style={{ marginRight: 15 }}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>ℹ️</Text>
          </TouchableOpacity>
        ),
      });
    } catch (error) {
      console.error('❌ Erreur initialisation conversation:', error);
      setInitError(error.message);
      Alert.alert(
        'Erreur',
        `Impossible d'initialiser la conversation: ${error.message}`,
        [{ text: 'Retour', onPress: () => navigation.goBack() }]
      );
    }
  };

  const loadUserProfile = async () => {
    try {
      const profile = await UserProfileService.getProfile();
      setUserProfile(profile);
      console.log('✅ Profil utilisateur chargé');
    } catch (error) {
      console.error('❌ Erreur chargement profil:', error);
    }
  };

  const loadGallery = async () => {
    try {
      if (!character || !character.id) return;
      const characterGallery = await GalleryService.getGallery(character.id);
      setGallery(characterGallery || []);
      console.log(`✅ Galerie chargée: ${characterGallery?.length || 0} images`);
    } catch (error) {
      console.error('❌ Erreur chargement galerie:', error);
      setGallery([]);
    }
  };

  const loadBackground = async () => {
    try {
      if (!character || !character.id) return;
      const bg = await GalleryService.getConversationBackground(character.id);
      setConversationBackground(bg);
      if (bg) console.log('✅ Background chargé');
    } catch (error) {
      console.error('❌ Erreur chargement background:', error);
    }
  };

  const loadConversation = async () => {
    try {
      if (!character || !character.id) {
        throw new Error('Character ID manquant');
      }
      
      const saved = await StorageService.loadConversation(character.id);
      if (saved && saved.messages && saved.messages.length > 0) {
        console.log(`✅ Conversation chargée: ${saved.messages.length} messages`);
        setMessages(saved.messages);
        setRelationship(saved.relationship);
      } else {
        // Start with character's initial message - PAS DE TIMESTAMP
        const initialMessage = {
          role: 'assistant',
          content: character.startMessage || `Bonjour, je suis ${character.name}.`,
        };
        console.log('✅ Nouveau conversation initialisée');
        setMessages([initialMessage]);
        const rel = await StorageService.loadRelationship(character.id);
        setRelationship(rel);
      }
    } catch (error) {
      console.error('❌ Erreur chargement conversation:', error);
      // Initialiser avec un message par défaut
      setMessages([{
        role: 'assistant',
        content: character?.startMessage || `Bonjour, je suis ${character?.name || 'votre personnage'}.`
      }]);
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

    // PAS DE TIMESTAMP - Groq ne l'accepte pas
    const userMessage = {
      role: 'user',
      content: inputText.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      // Update relationship
      const newRelationship = updateRelationship(userMessage.content);
      setRelationship(newRelationship);

      // Generate AI response (utilise TextGenerationService multi-providers)
      const response = await TextGenerationService.generateResponse(
        updatedMessages,
        character,
        userProfile
      );

      // PAS DE TIMESTAMP - Groq ne l'accepte pas
      const assistantMessage = {
        role: 'assistant',
        content: response,
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
      // Utiliser generateSceneImage avec détection de tenue et mode NSFW
      const imageUrl = await ImageGenerationService.generateSceneImage(
        character,
        userProfile,
        messages
      );
      
      // Sauvegarder dans la galerie
      await GalleryService.saveImageToGallery(character.id, imageUrl);
      await loadGallery(); // Recharger la galerie
      
      // PAS DE TIMESTAMP
      const imageMessage = {
        role: 'system',
        content: '[Image générée et sauvegardée dans la galerie]',
        image: imageUrl,
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
            {item.timestamp
              ? new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              : ''}
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
            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
      </View>
    );
  };

  // Afficher l'écran de chargement ou d'erreur
  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>❌ Erreur</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isInitialized) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingScreenText}>Chargement de la conversation...</Text>
        <Text style={styles.loadingScreenSubText}>{character?.name || ''}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, conversationBackground && { backgroundColor: 'transparent' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
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
          returnKeyType="default"
          blurOnSubmit={false}
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
    color: '#8b5cf6', // Violet pour actions/pensées (même couleur pour user et assistant)
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
    opacity: 0.6,
    resizeMode: 'cover',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingScreenText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  loadingScreenSubText: {
    marginTop: 5,
    fontSize: 14,
    color: '#9ca3af',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
