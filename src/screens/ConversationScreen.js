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
import TextGenerationService from '../services/TextGenerationService';
import StorageService from '../services/StorageService';
import ImageGenerationService from '../services/ImageGenerationService';
import UserProfileService from '../services/UserProfileService';
import GalleryService from '../services/GalleryService';
import LevelService from '../services/LevelService';
import ChatStyleService from '../services/ChatStyleService';

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
  
  // Style settings
  const [showSettings, setShowSettings] = useState(false);
  const [chatStyle, setChatStyle] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [opacity, setOpacity] = useState(1);
  const [borderRadius, setBorderRadius] = useState(15);
  
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!character || !character.id) {
      setInitError('Personnage invalide');
      Alert.alert('Erreur', 'Personnage invalide.', [
        { text: 'Retour', onPress: () => navigation.goBack() }
      ]);
      return;
    }
    initializeScreen();
  }, [character]);

  const initializeScreen = async () => {
    try {
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
      setInitError(error.message);
    }
  };

  const loadChatStyle = async () => {
    const style = await ChatStyleService.loadStyle();
    setChatStyle(style);
    setSelectedTheme(ChatStyleService.getCurrentTheme());
    setOpacity(style.bubbleOpacity);
    setBorderRadius(style.borderRadius);
  };

  const loadUserProfile = async () => {
    const profile = await UserProfileService.getProfile();
    setUserProfile(profile);
  };

  const loadGallery = async () => {
    if (!character?.id) return;
    const g = await GalleryService.getGallery(character.id);
    setGallery(g || []);
  };

  const loadBackground = async () => {
    if (!character?.id) return;
    const bg = await GalleryService.getConversationBackground(character.id);
    setConversationBackground(bg);
  };

  const loadConversation = async () => {
    if (!character?.id) return;
    
    if (newConversation) {
      await StorageService.deleteConversation(character.id);
      const initialMessage = {
        role: 'assistant',
        content: character.startMessage || `*sourit* "Salut..." (Enfin on se rencontre)`,
      };
      setMessages([initialMessage]);
      const defaultRel = StorageService.getDefaultRelationship();
      setRelationship(defaultRel);
      await StorageService.saveRelationship(character.id, defaultRel);
      return;
    }
    
    const saved = await StorageService.loadConversation(character.id);
    if (saved?.messages?.length > 0) {
      setMessages(saved.messages);
      setRelationship(saved.relationship || StorageService.getDefaultRelationship());
    } else {
      const initialMessage = {
        role: 'assistant',
        content: character.startMessage || `*sourit* "Salut..." (Enfin on se rencontre)`,
      };
      setMessages([initialMessage]);
      const rel = await StorageService.loadRelationship(character.id);
      setRelationship(rel);
    }
  };

  const saveConversation = async (newMessages, newRelationship) => {
    await StorageService.saveConversation(character.id, newMessages, newRelationship);
    await StorageService.saveRelationship(character.id, newRelationship);
  };

  // Appliquer un thème
  const applyTheme = async (themeId) => {
    const newStyle = await ChatStyleService.applyTheme(themeId);
    setChatStyle(newStyle);
    setSelectedTheme(themeId);
    setOpacity(newStyle.bubbleOpacity);
    setBorderRadius(newStyle.borderRadius);
  };

  // Changer l'opacité
  const changeOpacity = async (value) => {
    setOpacity(value);
    const newStyle = await ChatStyleService.setOpacity(value);
    setChatStyle(newStyle);
  };

  // Changer le border radius
  const changeRadius = async (value) => {
    setBorderRadius(value);
    const newStyle = await ChatStyleService.setBorderRadius(value);
    setChatStyle(newStyle);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = { role: 'user', content: inputText.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const xpGain = LevelService.calculateXpGain(userMessage.content, character, userProfile);
      const result = await LevelService.updateRelationship(relationship, xpGain, character, userProfile);
      setRelationship(result.relationship);
      
      if (result.leveledUp) {
        setLevelUpData({
          oldLevel: result.oldLevel,
          newLevel: result.newLevel,
          image: result.levelUpImage,
        });
        setShowLevelUp(true);
        await loadGallery();
      }

      const response = await TextGenerationService.generateResponse(updatedMessages, character, userProfile);
      const assistantMessage = { role: 'assistant', content: response };
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      await saveConversation(finalMessages, result.relationship);

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
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
      const imageUrl = await ImageGenerationService.generateSceneImage(character, userProfile, messages);
      await GalleryService.saveImageToGallery(character.id, imageUrl);
      await loadGallery();
      
      const imageMessage = { role: 'system', content: '[Image]', image: imageUrl };
      const updatedMessages = [...messages, imageMessage];
      setMessages(updatedMessages);
      await saveConversation(updatedMessages, relationship);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setGeneratingImage(false);
    }
  };

  // Parser le message RP avec le nouveau format (pensées)
  const formatRPMessage = (content) => {
    const parts = [];
    const allMatches = [];
    
    // Actions *...*
    let match;
    const actionRegex = /\*([^*]+)\*/g;
    while ((match = actionRegex.exec(content)) !== null) {
      allMatches.push({ type: 'action', text: match[1], index: match.index, length: match[0].length });
    }
    
    // Pensées (...) - nouveau format
    const thoughtRegex = /\(([^)]+)\)/g;
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
    const style = chatStyle || ChatStyleService.themes.default;

    if (item.role === 'system' && item.image) {
      return (
        <View style={styles.imageMessageContainer}>
          <Image source={{ uri: item.image }} style={styles.generatedImage} />
        </View>
      );
    }

    const formattedParts = formatRPMessage(item.content);
    
    const bubbleStyle = {
      backgroundColor: isUser ? style.userBubble : style.assistantBubble,
      opacity: style.bubbleOpacity,
      borderRadius: style.borderRadius,
    };

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        <View style={[styles.messageBubble, bubbleStyle]}>
          {!isUser && <Text style={[styles.characterName, { color: style.userBubble }]}>{character.name}</Text>}
          <View style={styles.messageContent}>
            {formattedParts.map((part, index) => {
              if (part.type === 'action') {
                return (
                  <Text key={index} style={[styles.actionText, { color: isUser ? '#e0e7ff' : style.actionColor }]}>
                    *{part.text}*
                  </Text>
                );
              } else if (part.type === 'thought') {
                return (
                  <Text key={index} style={[styles.thoughtText, { color: isUser ? '#c7d2fe' : style.thoughtColor }]}>
                    ({part.text})
                  </Text>
                );
              } else if (part.type === 'dialogue') {
                return (
                  <Text key={index} style={[styles.dialogueText, { color: isUser ? style.userText : style.dialogueColor }]}>
                    "{part.text}"
                  </Text>
                );
              } else {
                return (
                  <Text key={index} style={[styles.normalText, { color: isUser ? style.userText : style.assistantText }]}>
                    {part.text}
                  </Text>
                );
              }
            })}
          </View>
        </View>
      </View>
    );
  };

  const levelInfo = relationship ? LevelService.getLevelInfo(relationship.experience) : null;
  const themes = ChatStyleService.getThemes();

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
      
      {/* Barre de relation */}
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
          <TouchableOpacity style={styles.galleryButton} onPress={() => navigation.navigate('Gallery', { character })}>
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
        <TouchableOpacity style={styles.imageButton} onPress={generateImage} disabled={generatingImage}>
          {generatingImage ? <ActivityIndicator size="small" color="#6366f1" /> : <Text style={styles.imageButtonText}>🎨</Text>}
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="*actions* (pensées) 'paroles'..."
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
            <Text style={styles.levelUpText}>Niveau {levelUpData?.oldLevel} → {levelUpData?.newLevel}</Text>
            {levelUpData?.image && <Image source={{ uri: levelUpData.image }} style={styles.levelUpImage} />}
            <Text style={styles.levelUpReward}>🎁 Image récompense ajoutée!</Text>
            <TouchableOpacity style={styles.levelUpButton} onPress={() => setShowLevelUp(false)}>
              <Text style={styles.levelUpButtonText}>Continuer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Paramètres Style */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsModal}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>⚙️ Personnalisation</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.settingsContent}>
              {/* Thèmes */}
              <Text style={styles.settingLabel}>🎨 Thèmes</Text>
              <View style={styles.themesGrid}>
                {themes.map((theme) => (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeItem,
                      selectedTheme === theme.id && styles.themeItemSelected,
                    ]}
                    onPress={() => applyTheme(theme.id)}
                  >
                    <View style={styles.themePreview}>
                      <View style={[styles.themeColorUser, { backgroundColor: theme.preview.userBubble }]} />
                      <View style={[styles.themeColorAssistant, { backgroundColor: theme.preview.assistantBubble }]} />
                    </View>
                    <Text style={styles.themeName}>{theme.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Opacité */}
              <Text style={styles.settingLabel}>💧 Opacité: {Math.round(opacity * 100)}%</Text>
              <View style={styles.sliderRow}>
                <TouchableOpacity 
                  style={styles.sliderBtn} 
                  onPress={() => changeOpacity(Math.max(0.5, opacity - 0.1))}
                >
                  <Text style={styles.sliderBtnText}>−</Text>
                </TouchableOpacity>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${(opacity - 0.5) * 200}%` }]} />
                </View>
                <TouchableOpacity 
                  style={styles.sliderBtn} 
                  onPress={() => changeOpacity(Math.min(1, opacity + 0.1))}
                >
                  <Text style={styles.sliderBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Border Radius */}
              <Text style={styles.settingLabel}>⬜ Arrondi: {Math.round(borderRadius)}px</Text>
              <View style={styles.sliderRow}>
                <TouchableOpacity 
                  style={styles.sliderBtn} 
                  onPress={() => changeRadius(Math.max(0, borderRadius - 5))}
                >
                  <Text style={styles.sliderBtnText}>−</Text>
                </TouchableOpacity>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${(borderRadius / 30) * 100}%` }]} />
                </View>
                <TouchableOpacity 
                  style={styles.sliderBtn} 
                  onPress={() => changeRadius(Math.min(30, borderRadius + 5))}
                >
                  <Text style={styles.sliderBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Aperçu */}
              <Text style={styles.settingLabel}>👁️ Aperçu</Text>
              <View style={styles.previewContainer}>
                <View style={[styles.previewBubbleUser, { 
                  backgroundColor: chatStyle?.userBubble, 
                  opacity: chatStyle?.bubbleOpacity,
                  borderRadius: chatStyle?.borderRadius,
                }]}>
                  <Text style={{ color: chatStyle?.userText }}>"Message utilisateur"</Text>
                </View>
                <View style={[styles.previewBubbleAssistant, { 
                  backgroundColor: chatStyle?.assistantBubble, 
                  opacity: chatStyle?.bubbleOpacity,
                  borderRadius: chatStyle?.borderRadius,
                }]}>
                  <Text style={{ color: chatStyle?.actionColor, fontStyle: 'italic' }}>*action*</Text>
                  <Text style={{ color: chatStyle?.dialogueColor }}>"Dialogue"</Text>
                  <Text style={{ color: chatStyle?.thoughtColor, fontStyle: 'italic' }}>(pensée)</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.settingsCloseBtn} onPress={() => setShowSettings(false)}>
              <Text style={styles.settingsCloseBtnText}>Fermer</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#6366f1', paddingVertical: 8, paddingHorizontal: 12,
  },
  levelContainer: { flex: 1, marginRight: 10 },
  levelText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  xpBarContainer: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, marginVertical: 4, overflow: 'hidden' },
  xpBar: { height: '100%', backgroundColor: '#fbbf24', borderRadius: 3 },
  xpText: { fontSize: 10, color: '#e0e7ff' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  galleryButton: { backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 10 },
  galleryButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  messagesList: { padding: 15, paddingBottom: 10 },
  messageContainer: { marginBottom: 12, maxWidth: '85%' },
  userMessage: { alignSelf: 'flex-end' },
  assistantMessage: { alignSelf: 'flex-start' },
  messageBubble: { padding: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  characterName: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  messageContent: {},
  actionText: { fontSize: 14, fontStyle: 'italic', marginBottom: 2 },
  thoughtText: { fontSize: 13, fontStyle: 'italic', marginBottom: 2 },
  dialogueText: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  normalText: { fontSize: 14 },
  imageMessageContainer: { alignItems: 'center', marginBottom: 15 },
  generatedImage: { width: 280, height: 280, borderRadius: 15, backgroundColor: '#e5e7eb' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: '#f3f4f6' },
  loadingText: { marginLeft: 10, fontSize: 14, color: '#6b7280', fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', alignItems: 'flex-end' },
  imageButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 5 },
  imageButtonText: { fontSize: 20 },
  input: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, fontSize: 15, maxHeight: 100, marginRight: 8 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  sendButtonDisabled: { backgroundColor: '#d1d5db' },
  sendButtonText: { fontSize: 20, color: '#fff' },
  backgroundImage: { position: 'absolute', width: '100%', height: '100%', opacity: 0.6, resizeMode: 'cover' },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  loadingScreenText: { marginTop: 15, fontSize: 16, color: '#6366f1' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 18, color: '#ef4444', marginBottom: 20 },
  retryButton: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  // Modal Level Up
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  levelUpModal: { backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center', width: '85%', maxWidth: 350 },
  levelUpTitle: { fontSize: 32, fontWeight: 'bold', color: '#6366f1', marginBottom: 10 },
  levelUpText: { fontSize: 20, color: '#111827', marginBottom: 15 },
  levelUpImage: { width: 200, height: 200, borderRadius: 15, marginBottom: 15 },
  levelUpReward: { fontSize: 14, color: '#10b981', textAlign: 'center', marginBottom: 15 },
  levelUpButton: { backgroundColor: '#6366f1', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  levelUpButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Modal Settings
  settingsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  settingsModal: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, maxHeight: '80%' },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  settingsTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  closeButton: { fontSize: 24, color: '#6b7280' },
  settingsContent: { padding: 20 },
  settingLabel: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 15, marginBottom: 10 },
  themesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeItem: { width: '30%', padding: 10, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#f3f4f6', alignItems: 'center' },
  themeItemSelected: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  themePreview: { flexDirection: 'row', marginBottom: 5 },
  themeColorUser: { width: 20, height: 20, borderRadius: 10, marginRight: 5 },
  themeColorAssistant: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  themeName: { fontSize: 11, color: '#374151', textAlign: 'center' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  sliderBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
  sliderBtnText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  sliderTrack: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginHorizontal: 15, overflow: 'hidden' },
  sliderFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: 4 },
  previewContainer: { backgroundColor: '#f3f4f6', padding: 15, borderRadius: 12, marginTop: 10 },
  previewBubbleUser: { alignSelf: 'flex-end', padding: 10, marginBottom: 10, maxWidth: '70%' },
  previewBubbleAssistant: { alignSelf: 'flex-start', padding: 10, maxWidth: '70%' },
  settingsCloseBtn: { backgroundColor: '#6366f1', margin: 20, padding: 15, borderRadius: 12, alignItems: 'center' },
  settingsCloseBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
