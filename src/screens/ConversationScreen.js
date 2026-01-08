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
  Modal,
  ScrollView,
} from 'react-native';
import GroqService from '../services/GroqService';
import TextGenerationService from '../services/TextGenerationService';
import StorageService from '../services/StorageService';
import ImageGenerationService from '../services/ImageGenerationService';
import UserProfileService from '../services/UserProfileService';
import GalleryService from '../services/GalleryService';
import ChatStyleService from '../services/ChatStyleService';

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
  
  // Style settings
  const [showSettings, setShowSettings] = useState(false);
  const [chatStyle, setChatStyle] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [opacity, setOpacity] = useState(1);
  const [borderRadius, setBorderRadius] = useState(15);
  
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
      // Charger tout en parallèle
      await Promise.all([
        loadConversation(),
        loadUserProfile(),
        loadGallery(),
        loadBackground(),
        loadChatStyle(),
      ]);
      
      setIsInitialized(true);
      
      navigation.setOptions({
        title: character?.name || 'Conversation',
        headerRight: () => (
          <View style={{ flexDirection: 'row', marginRight: 10 }}>
            <TouchableOpacity onPress={() => setShowSettings(true)} style={{ marginRight: 15 }}>
              <Text style={{ color: '#fff', fontSize: 20 }}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('CharacterDetail', { character })}>
              <Text style={{ color: '#fff', fontSize: 20 }}>ℹ️</Text>
            </TouchableOpacity>
          </View>
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

  const loadChatStyle = async () => {
    try {
      const style = await ChatStyleService.loadStyle();
      setChatStyle(style);
      setSelectedTheme(ChatStyleService.getCurrentTheme());
      setOpacity(style.bubbleOpacity || 1);
      setBorderRadius(style.borderRadius || 15);
    } catch (error) {
      console.error('❌ Erreur chargement style:', error);
      setChatStyle(ChatStyleService.getCurrentStyle());
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

    const userMessage = {
      role: 'user',
      content: inputText.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const newRelationship = updateRelationship(userMessage.content);
      setRelationship(newRelationship);

      const response = await TextGenerationService.generateResponse(
        updatedMessages,
        character,
        userProfile
      );

      const assistantMessage = {
        role: 'assistant',
        content: response,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      
      await saveConversation(finalMessages, newRelationship);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('Erreur', error.message);
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const generateImage = async () => {
    if (generatingImage) return;

    setGeneratingImage(true);
    try {
      const imageUrl = await ImageGenerationService.generateSceneImage(
        character,
        userProfile,
        messages
      );
      
      await GalleryService.saveImageToGallery(character.id, imageUrl);
      await loadGallery();
      
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

  // Fonctions de personnalisation du style
  const handleThemeChange = async (themeId) => {
    setSelectedTheme(themeId);
    const newStyle = await ChatStyleService.applyTheme(themeId);
    setChatStyle(newStyle);
    setOpacity(newStyle.bubbleOpacity);
    setBorderRadius(newStyle.borderRadius);
  };

  const handleOpacityChange = async (value) => {
    setOpacity(value);
    const newStyle = await ChatStyleService.setOpacity(value);
    setChatStyle(newStyle);
  };

  const handleBorderRadiusChange = async (value) => {
    setBorderRadius(value);
    const newStyle = await ChatStyleService.setBorderRadius(value);
    setChatStyle(newStyle);
  };

  const formatRPMessage = (content) => {
    const parts = [];
    const actionRegex = /\*([^*]+)\*/g;
    const dialogueRegex = /"([^"]+)"/g;
    
    let match;
    const allMatches = [];
    
    while ((match = actionRegex.exec(content)) !== null) {
      allMatches.push({ type: 'action', text: match[1], index: match.index, length: match[0].length });
    }
    
    while ((match = dialogueRegex.exec(content)) !== null) {
      allMatches.push({ type: 'dialogue', text: match[1], index: match.index, length: match[0].length });
    }
    
    allMatches.sort((a, b) => a.index - b.index);
    
    let currentIndex = 0;
    allMatches.forEach(match => {
      if (match.index > currentIndex) {
        const text = content.substring(currentIndex, match.index).trim();
        if (text) {
          parts.push({ type: 'text', text });
        }
      }
      parts.push({ type: match.type, text: match.text });
      currentIndex = match.index + match.length;
    });
    
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
    const style = chatStyle || {};

    if (isSystem && item.image) {
      return (
        <View style={styles.imageMessageContainer}>
          <Image source={{ uri: item.image }} style={styles.generatedImage} />
          <Text style={styles.imageTimestamp}>
            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
      );
    }

    const formattedParts = formatRPMessage(item.content);

    const bubbleStyle = {
      backgroundColor: isUser 
        ? (style.userBubble || '#6366f1') 
        : (style.assistantBubble || '#ffffff'),
      opacity: style.bubbleOpacity || 1,
      borderRadius: style.borderRadius || 15,
    };

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        <View style={[styles.messageBubble, bubbleStyle]}>
          {!isUser && (
            <Text style={[styles.characterName, { color: style.userBubble || '#6366f1' }]}>
              {character.name}
            </Text>
          )}
          <View style={styles.messageContent}>
            {formattedParts.map((part, index) => {
              if (part.type === 'action') {
                return (
                  <Text key={index} style={[styles.actionText, { color: style.actionColor || '#8b5cf6' }]}>
                    *{part.text}*
                  </Text>
                );
              } else if (part.type === 'dialogue') {
                return (
                  <Text key={index} style={[
                    styles.dialogueText, 
                    { color: isUser ? (style.userText || '#fff') : (style.dialogueColor || '#111827') }
                  ]}>
                    "{part.text}"
                  </Text>
                );
              } else {
                return (
                  <Text key={index} style={[
                    styles.normalText, 
                    { color: isUser ? (style.userText || '#fff') : (style.assistantText || '#4b5563') }
                  ]}>
                    {part.text}
                  </Text>
                );
              }
            })}
          </View>
          <Text style={[styles.timestamp, { color: isUser ? 'rgba(255,255,255,0.7)' : '#9ca3af' }]}>
            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
      </View>
    );
  };

  // Modal de personnalisation
  const renderSettingsModal = () => {
    const themes = ChatStyleService.getThemes();
    
    return (
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚙️ Style des bulles</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Thèmes prédéfinis */}
              <Text style={styles.settingLabel}>🎨 Thèmes</Text>
              <View style={styles.themesGrid}>
                {themes.map((theme) => (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeOption,
                      selectedTheme === theme.id && styles.themeOptionSelected
                    ]}
                    onPress={() => handleThemeChange(theme.id)}
                  >
                    <View style={styles.themePreview}>
                      <View style={[styles.themePreviewBubble, { backgroundColor: theme.preview.userBubble }]} />
                      <View style={[styles.themePreviewBubble, { backgroundColor: theme.preview.assistantBubble, borderWidth: 1, borderColor: '#e5e7eb' }]} />
                    </View>
                    <Text style={styles.themeName}>{theme.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Opacité */}
              <Text style={styles.settingLabel}>🔍 Opacité: {Math.round(opacity * 100)}%</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>50%</Text>
                <View style={styles.sliderWrapper}>
                  <View 
                    style={[
                      styles.sliderTrack,
                      { width: `${((opacity - 0.5) / 0.5) * 100}%` }
                    ]} 
                  />
                  <TouchableOpacity
                    style={[
                      styles.sliderThumb,
                      { left: `${((opacity - 0.5) / 0.5) * 100}%` }
                    ]}
                    onPress={() => {}}
                  />
                </View>
                <Text style={styles.sliderLabel}>100%</Text>
              </View>
              <View style={styles.sliderButtons}>
                <TouchableOpacity 
                  style={styles.sliderBtn}
                  onPress={() => handleOpacityChange(Math.max(0.5, opacity - 0.1))}
                >
                  <Text style={styles.sliderBtnText}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.sliderBtn}
                  onPress={() => handleOpacityChange(Math.min(1, opacity + 0.1))}
                >
                  <Text style={styles.sliderBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              
              {/* Arrondi */}
              <Text style={styles.settingLabel}>⭕ Arrondi: {Math.round(borderRadius)}px</Text>
              <View style={styles.sliderButtons}>
                <TouchableOpacity 
                  style={styles.sliderBtn}
                  onPress={() => handleBorderRadiusChange(Math.max(0, borderRadius - 5))}
                >
                  <Text style={styles.sliderBtnText}>-</Text>
                </TouchableOpacity>
                <View style={styles.radiusPreview}>
                  <View style={[styles.radiusPreviewBox, { borderRadius: borderRadius }]} />
                </View>
                <TouchableOpacity 
                  style={styles.sliderBtn}
                  onPress={() => handleBorderRadiusChange(Math.min(30, borderRadius + 5))}
                >
                  <Text style={styles.sliderBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              
              {/* Aperçu */}
              <Text style={styles.settingLabel}>👁️ Aperçu</Text>
              <View style={styles.previewContainer}>
                <View style={[
                  styles.previewBubble, 
                  { 
                    backgroundColor: chatStyle?.assistantBubble || '#fff',
                    opacity: opacity,
                    borderRadius: borderRadius,
                    alignSelf: 'flex-start',
                  }
                ]}>
                  <Text style={{ color: chatStyle?.assistantText || '#111827' }}>
                    *sourit* "Bonjour !"
                  </Text>
                </View>
                <View style={[
                  styles.previewBubble, 
                  { 
                    backgroundColor: chatStyle?.userBubble || '#6366f1',
                    opacity: opacity,
                    borderRadius: borderRadius,
                    alignSelf: 'flex-end',
                  }
                ]}>
                  <Text style={{ color: chatStyle?.userText || '#fff' }}>
                    Salut !
                  </Text>
                </View>
              </View>
            </ScrollView>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.modalButtonText}>✓ Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
          style={[styles.backgroundImage, { opacity: opacity * 0.6 }]}
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
      
      {renderSettingsModal()}
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
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  characterName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  messageContent: {
    marginBottom: 5,
  },
  actionText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 3,
  },
  dialogueText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 3,
  },
  normalText: {
    fontSize: 14,
    marginBottom: 3,
  },
  timestamp: {
    fontSize: 10,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalClose: {
    fontSize: 24,
    color: '#6b7280',
  },
  modalBody: {
    padding: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    marginTop: 10,
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  themeOption: {
    width: '30%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  themeOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  themePreview: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 5,
  },
  themePreviewBubble: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  themeName: {
    fontSize: 11,
    color: '#4b5563',
    textAlign: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderWrapper: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginHorizontal: 10,
    position: 'relative',
  },
  sliderTrack: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    marginLeft: -10,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6b7280',
    width: 40,
    textAlign: 'center',
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
  },
  sliderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderBtnText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  radiusPreview: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusPreviewBox: {
    width: 50,
    height: 30,
    backgroundColor: '#6366f1',
  },
  previewContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 15,
    gap: 10,
  },
  previewBubble: {
    padding: 12,
    maxWidth: '70%',
  },
  modalButton: {
    backgroundColor: '#6366f1',
    margin: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
