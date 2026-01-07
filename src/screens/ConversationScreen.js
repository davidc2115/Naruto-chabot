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
} from 'react-native';
import TextGenerationService from '../services/TextGenerationService';
import StorageService from '../services/StorageService';
import ImageGenerationService from '../services/ImageGenerationService';
import UserProfileService from '../services/UserProfileService';
import GalleryService from '../services/GalleryService';
import LevelService from '../services/LevelService';

export default function ConversationScreen({ route, navigation }) {
  const { character, newConversation } = route.params || {};
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
  
  // Level up modal
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!character || !character.id) {
      console.error('❌ Character invalide:', character);
      setInitError('Personnage invalide');
      Alert.alert('Erreur', 'Personnage invalide.', [
        { text: 'Retour', onPress: () => navigation.goBack() }
      ]);
      return;
    }
    
    console.log('✅ Init conversation:', character.name, 'ID:', character.id);
    console.log('   - Nouvelle conversation:', newConversation ? 'OUI' : 'NON');
    initializeScreen();
  }, [character]);

  const initializeScreen = async () => {
    try {
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
      console.error('❌ Erreur init:', error);
      setInitError(error.message);
    }
  };

  const loadUserProfile = async () => {
    try {
      const profile = await UserProfileService.getProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Erreur profil:', error);
    }
  };

  const loadGallery = async () => {
    try {
      if (!character?.id) return;
      const g = await GalleryService.getGallery(character.id);
      setGallery(g || []);
    } catch (error) {
      setGallery([]);
    }
  };

  const loadBackground = async () => {
    try {
      if (!character?.id) return;
      const bg = await GalleryService.getConversationBackground(character.id);
      setConversationBackground(bg);
    } catch (error) {}
  };

  const loadConversation = async () => {
    try {
      if (!character?.id) throw new Error('Character ID manquant');
      
      // Si newConversation=true, on repart à zéro
      if (newConversation) {
        console.log('🆕 Nouvelle conversation - reset');
        await StorageService.deleteConversation(character.id);
        
        const initialMessage = {
          role: 'assistant',
          content: character.startMessage || `Bonjour, je suis ${character.name}.`,
        };
        setMessages([initialMessage]);
        
        // Reset relation aussi
        const defaultRel = StorageService.getDefaultRelationship();
        setRelationship(defaultRel);
        await StorageService.saveRelationship(character.id, defaultRel);
        return;
      }
      
      // Charger conversation existante
      const saved = await StorageService.loadConversation(character.id);
      if (saved?.messages?.length > 0) {
        console.log(`✅ Conversation chargée: ${saved.messages.length} messages`);
        setMessages(saved.messages);
        setRelationship(saved.relationship || StorageService.getDefaultRelationship());
      } else {
        // Nouvelle conversation
        const initialMessage = {
          role: 'assistant',
          content: character.startMessage || `Bonjour, je suis ${character.name}.`,
        };
        setMessages([initialMessage]);
        const rel = await StorageService.loadRelationship(character.id);
        setRelationship(rel);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
      setMessages([{
        role: 'assistant',
        content: character?.startMessage || `Bonjour, je suis ${character?.name || 'votre personnage'}.`
      }]);
    }
  };

  const saveConversation = async (newMessages, newRelationship) => {
    await StorageService.saveConversation(character.id, newMessages, newRelationship);
    await StorageService.saveRelationship(character.id, newRelationship);
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
      // Calculer XP avec le nouveau système
      const xpGain = LevelService.calculateXpGain(userMessage.content, character, userProfile);
      
      // Mettre à jour la relation et vérifier level up
      const result = await LevelService.updateRelationship(
        relationship,
        xpGain,
        character,
        userProfile
      );
      
      setRelationship(result.relationship);
      
      // Si level up, afficher le modal
      if (result.leveledUp) {
        setLevelUpData({
          oldLevel: result.oldLevel,
          newLevel: result.newLevel,
          image: result.levelUpImage,
        });
        setShowLevelUp(true);
        await loadGallery(); // Recharger galerie si nouvelle image
      }

      // Générer la réponse IA
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
      await saveConversation(finalMessages, result.relationship);

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
        content: '[Image générée]',
        image: imageUrl,
      };

      const updatedMessages = [...messages, imageMessage];
      setMessages(updatedMessages);
      await saveConversation(updatedMessages, relationship);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setGeneratingImage(false);
    }
  };

  const formatRPMessage = (content) => {
    const parts = [];
    const allMatches = [];
    
    // Actions *...*
    const actionRegex = /\*([^*]+)\*/g;
    let match;
    while ((match = actionRegex.exec(content)) !== null) {
      allMatches.push({ type: 'action', text: match[1], index: match.index, length: match[0].length });
    }
    
    // Pensées ~...~
    const thoughtRegex = /~([^~]+)~/g;
    while ((match = thoughtRegex.exec(content)) !== null) {
      allMatches.push({ type: 'thought', text: match[1], index: match.index, length: match[0].length });
    }
    
    // Dialogues "..."
    const dialogueRegex = /"([^"]+)"/g;
    while ((match = dialogueRegex.exec(content)) !== null) {
      allMatches.push({ type: 'dialogue', text: match[1], index: match.index, length: match[0].length });
    }
    
    allMatches.sort((a, b) => a.index - b.index);
    
    let currentIndex = 0;
    allMatches.forEach(m => {
      if (m.index > currentIndex) {
        const text = content.substring(currentIndex, m.index).trim();
        if (text) parts.push({ type: 'text', text });
      }
      parts.push({ type: m.type, text: m.text });
      currentIndex = m.index + m.length;
    });
    
    if (currentIndex < content.length) {
      const text = content.substring(currentIndex).trim();
      if (text) parts.push({ type: 'text', text });
    }
    
    return parts.length > 0 ? parts : [{ type: 'text', text: content }];
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';

    if (item.role === 'system' && item.image) {
      return (
        <View style={styles.imageMessageContainer}>
          <Image source={{ uri: item.image }} style={styles.generatedImage} />
        </View>
      );
    }

    const formattedParts = formatRPMessage(item.content);

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          {!isUser && <Text style={styles.characterName}>{character.name}</Text>}
          <View style={styles.messageContent}>
            {formattedParts.map((part, index) => {
              if (part.type === 'action') {
                return <Text key={index} style={styles.actionText}>*{part.text}*</Text>;
              } else if (part.type === 'thought') {
                return <Text key={index} style={styles.thoughtText}>~{part.text}~</Text>;
              } else if (part.type === 'dialogue') {
                return <Text key={index} style={[styles.dialogueText, isUser && styles.userDialogue]}>"{part.text}"</Text>;
              } else {
                return <Text key={index} style={[styles.normalText, isUser && styles.userNormalText]}>{part.text}</Text>;
              }
            })}
          </View>
        </View>
      </View>
    );
  };

  // Level info
  const levelInfo = relationship ? LevelService.getLevelInfo(relationship.experience) : null;

  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>❌ {initError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isInitialized) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingScreenText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
    >
      {conversationBackground && (
        <Image source={{ uri: conversationBackground }} style={styles.backgroundImage} blurRadius={2} />
      )}
      
      {/* Barre de relation améliorée */}
      {levelInfo && (
        <View style={styles.relationshipBar}>
          <View style={styles.levelContainer}>
            <Text style={styles.levelText}>⭐ Niv. {levelInfo.level}</Text>
            <View style={styles.xpBarContainer}>
              <View style={[styles.xpBar, { width: `${levelInfo.progress}%` }]} />
            </View>
            <Text style={styles.xpText}>{levelInfo.xpCurrent}/{levelInfo.xpNeeded} XP</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statText}>💖 {relationship.affection}%</Text>
            <Text style={styles.statText}>🤝 {relationship.trust}%</Text>
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
        keyExtractor={(_, index) => index.toString()}
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
          placeholder="*actions* ~pensées~ 'paroles'..."
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
      
      {/* Modal Level Up */}
      <Modal visible={showLevelUp} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.levelUpModal}>
            <Text style={styles.levelUpTitle}>🎉 LEVEL UP!</Text>
            <Text style={styles.levelUpText}>
              Niveau {levelUpData?.oldLevel} → {levelUpData?.newLevel}
            </Text>
            {levelUpData?.image && (
              <Image source={{ uri: levelUpData.image }} style={styles.levelUpImage} />
            )}
            <Text style={styles.levelUpReward}>
              🎁 Image récompense ajoutée à la galerie!
            </Text>
            <TouchableOpacity
              style={styles.levelUpButton}
              onPress={() => setShowLevelUp(false)}
            >
              <Text style={styles.levelUpButtonText}>Continuer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  relationshipBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  levelContainer: { flex: 1, marginRight: 10 },
  levelText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  xpBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginVertical: 4,
    overflow: 'hidden',
  },
  xpBar: { height: '100%', backgroundColor: '#fbbf24', borderRadius: 3 },
  xpText: { fontSize: 10, color: '#e0e7ff' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  galleryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  galleryButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  messagesList: { padding: 15, paddingBottom: 10 },
  messageContainer: { marginBottom: 12, maxWidth: '85%' },
  userMessage: { alignSelf: 'flex-end' },
  assistantMessage: { alignSelf: 'flex-start' },
  messageBubble: { borderRadius: 15, padding: 12, elevation: 2 },
  userBubble: { backgroundColor: '#6366f1' },
  assistantBubble: { backgroundColor: '#fff' },
  characterName: { fontSize: 12, fontWeight: 'bold', color: '#6366f1', marginBottom: 4 },
  messageContent: {},
  actionText: { fontSize: 14, fontStyle: 'italic', color: '#8b5cf6', marginBottom: 2 },
  thoughtText: { fontSize: 13, fontStyle: 'italic', color: '#9ca3af', marginBottom: 2 },
  dialogueText: { fontSize: 15, fontWeight: '500', color: '#111827', marginBottom: 2 },
  userDialogue: { color: '#fff' },
  normalText: { fontSize: 14, color: '#4b5563' },
  userNormalText: { color: '#e0e7ff' },
  imageMessageContainer: { alignItems: 'center', marginBottom: 15 },
  generatedImage: { width: 280, height: 280, borderRadius: 15, backgroundColor: '#e5e7eb' },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f3f4f6',
  },
  loadingText: { marginLeft: 10, fontSize: 14, color: '#6b7280', fontStyle: 'italic' },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  imageButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 5,
  },
  imageButtonText: { fontSize: 20 },
  input: {
    flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 15,
    paddingVertical: 10, fontSize: 15, maxHeight: 100, marginRight: 8,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#6366f1',
    justifyContent: 'center', alignItems: 'center', marginBottom: 5,
  },
  sendButtonDisabled: { backgroundColor: '#d1d5db' },
  sendButtonText: { fontSize: 20, color: '#fff' },
  backgroundImage: {
    position: 'absolute', width: '100%', height: '100%', opacity: 0.6, resizeMode: 'cover',
  },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  loadingScreenText: { marginTop: 15, fontSize: 16, color: '#6366f1' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 18, color: '#ef4444', marginBottom: 20 },
  retryButton: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  // Modal Level Up
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center',
  },
  levelUpModal: {
    backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center',
    width: '85%', maxWidth: 350,
  },
  levelUpTitle: { fontSize: 32, fontWeight: 'bold', color: '#6366f1', marginBottom: 10 },
  levelUpText: { fontSize: 20, color: '#111827', marginBottom: 15 },
  levelUpImage: { width: 200, height: 200, borderRadius: 15, marginBottom: 15 },
  levelUpReward: { fontSize: 14, color: '#10b981', textAlign: 'center', marginBottom: 15 },
  levelUpButton: { backgroundColor: '#6366f1', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  levelUpButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
