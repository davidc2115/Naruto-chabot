/**
 * Écran de Support Utilisateur
 * v5.4.77 - Permet aux utilisateurs d'envoyer et suivre des tickets de support
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import SupportService from '../services/SupportService';
import AuthService from '../services/AuthService';

export default function SupportScreen({ navigation }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Nouveau ticket
  const [newSubject, setNewSubject] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  
  const categories = SupportService.getCategories();
  const scrollViewRef = useRef();

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const userTickets = await SupportService.getUserTickets();
      setTickets(userTickets);
    } catch (error) {
      console.error('Erreur chargement tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!newSubject.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un sujet');
      return;
    }
    if (!newContent.trim()) {
      Alert.alert('Erreur', 'Veuillez décrire votre problème');
      return;
    }

    setCreating(true);
    try {
      const result = await SupportService.createTicket(
        newSubject.trim(),
        newContent.trim(),
        selectedCategory
      );

      if (result.success) {
        Alert.alert(
          '✅ Ticket envoyé',
          `Votre message a été envoyé au support.\n\nID: ${result.ticket.id}\n\nVous recevrez une réponse prochainement.`
        );
        setShowNewTicketModal(false);
        setNewSubject('');
        setNewContent('');
        setSelectedCategory('general');
        await loadTickets();
      } else {
        Alert.alert('Erreur', result.error || 'Impossible d\'envoyer le message');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setSendingMessage(true);
    try {
      const result = await SupportService.addMessage(selectedTicket.id, newMessage.trim());
      
      if (result.success) {
        setNewMessage('');
        // Recharger le ticket
        const updatedTickets = await SupportService.getUserTickets();
        setTickets(updatedTickets);
        const updated = updatedTickets.find(t => t.id === selectedTicket.id);
        if (updated) {
          setSelectedTicket(updated);
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSendingMessage(false);
    }
  };

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
    
    // Marquer les messages comme lus
    const user = AuthService.getCurrentUser();
    if (user) {
      await SupportService.markMessagesAsRead(ticket.id, user.id);
    }
  };

  const renderTicketItem = ({ item }) => {
    const statusInfo = SupportService.getStatusLabel(item.status);
    const category = categories.find(c => c.id === item.category);
    const unreadCount = item.messages.filter(
      m => m.senderType === 'admin' && !m.read
    ).length;

    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() => openTicket(item)}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.ticketCategory}>
            <Text style={styles.ticketCategoryIcon}>{category?.icon || '💬'}</Text>
            <Text style={styles.ticketCategoryText}>{category?.name || 'Général'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.icon} {statusInfo.label}
            </Text>
          </View>
        </View>
        
        <Text style={styles.ticketSubject}>{item.subject}</Text>
        
        <View style={styles.ticketFooter}>
          <Text style={styles.ticketDate}>
            {new Date(item.createdAt).toLocaleDateString('fr-FR')}
          </Text>
          <View style={styles.ticketMeta}>
            <Text style={styles.ticketMessages}>
              💬 {item.messages.length} message{item.messages.length > 1 ? 's' : ''}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }) => {
    const isUser = item.senderType === 'user';
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.messageUser : styles.messageAdmin
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.messageBubbleUser : styles.messageBubbleAdmin
        ]}>
          <Text style={styles.messageSender}>
            {isUser ? '👤 Vous' : '🛡️ Support'}
          </Text>
          <Text style={[
            styles.messageContent,
            isUser ? styles.messageContentUser : styles.messageContentAdmin
          ]}>
            {item.content}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(item.sentAt).toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🎫 Support</Text>
          <TouchableOpacity 
            style={styles.newButton}
            onPress={() => setShowNewTicketModal(true)}
          >
            <Text style={styles.newButtonText}>+ Nouveau</Text>
          </TouchableOpacity>
        </View>

        {/* Liste des tickets */}
        {tickets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Aucun ticket</Text>
            <Text style={styles.emptyText}>
              Vous n'avez pas encore contacté le support.{'\n'}
              Cliquez sur "Nouveau" pour envoyer un message.
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => setShowNewTicketModal(true)}
            >
              <Text style={styles.emptyButtonText}>📝 Créer un ticket</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={tickets}
            renderItem={renderTicketItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.ticketsList}
            refreshing={loading}
            onRefresh={loadTickets}
          />
        )}

        {/* Modal Nouveau Ticket */}
        <Modal
          visible={showNewTicketModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowNewTicketModal(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📝 Nouveau Ticket</Text>
                <TouchableOpacity onPress={() => setShowNewTicketModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Catégorie */}
                <Text style={styles.inputLabel}>Catégorie</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        selectedCategory === cat.id && styles.categoryChipSelected
                      ]}
                      onPress={() => setSelectedCategory(cat.id)}
                    >
                      <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                      <Text style={[
                        styles.categoryChipText,
                        selectedCategory === cat.id && styles.categoryChipTextSelected
                      ]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Sujet */}
                <Text style={styles.inputLabel}>Sujet</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: Problème de paiement"
                  value={newSubject}
                  onChangeText={setNewSubject}
                  maxLength={100}
                />

                {/* Message */}
                <Text style={styles.inputLabel}>Décrivez votre problème</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Expliquez en détail votre problème ou question..."
                  value={newContent}
                  onChangeText={setNewContent}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={2000}
                />
                <Text style={styles.charCount}>{newContent.length}/2000</Text>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowNewTicketModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, creating && styles.buttonDisabled]}
                  onPress={handleCreateTicket}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>📤 Envoyer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal Conversation */}
        <Modal
          visible={showTicketModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowTicketModal(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalContent, { height: '90%' }]}>
              {selectedTicket && (
                <>
                  <View style={styles.modalHeader}>
                    <View style={styles.ticketHeaderInfo}>
                      <Text style={styles.modalTitle} numberOfLines={1}>
                        {selectedTicket.subject}
                      </Text>
                      <Text style={styles.ticketIdText}>ID: {selectedTicket.id}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowTicketModal(false)}>
                      <Text style={styles.closeButton}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Status */}
                  <View style={styles.ticketStatusBar}>
                    {(() => {
                      const statusInfo = SupportService.getStatusLabel(selectedTicket.status);
                      return (
                        <View style={[styles.statusBadgeLarge, { backgroundColor: statusInfo.color }]}>
                          <Text style={styles.statusBadgeLargeText}>
                            {statusInfo.icon} {statusInfo.label}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>

                  {/* Messages */}
                  <FlatList
                    ref={scrollViewRef}
                    data={selectedTicket.messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.messagesList}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
                  />

                  {/* Input de réponse */}
                  {selectedTicket.status !== 'closed' && (
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.messageInput}
                        placeholder="Votre réponse..."
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                        maxLength={1000}
                      />
                      <TouchableOpacity
                        style={[styles.sendButton, (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled]}
                        onPress={handleSendMessage}
                        disabled={!newMessage.trim() || sendingMessage}
                      >
                        {sendingMessage ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.sendButtonText}>➤</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedTicket.status === 'closed' && (
                    <View style={styles.closedNotice}>
                      <Text style={styles.closedNoticeText}>
                        ⚫ Ce ticket est fermé. Créez un nouveau ticket si vous avez besoin d'aide.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    color: '#6b7280',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#6366f1',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  newButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Tickets list
  ticketsList: {
    padding: 16,
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ticketCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketCategoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  ticketCategoryText: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 10,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketMessages: {
    fontSize: 12,
    color: '#6b7280',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Modal
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
    padding: 5,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 10,
  },
  // Form inputs
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  categoriesScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryChipSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  categoryChipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 13,
    color: '#6b7280',
  },
  categoryChipTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  // Buttons
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Ticket detail
  ticketHeaderInfo: {
    flex: 1,
  },
  ticketIdText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  ticketStatusBar: {
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statusBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeLargeText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Messages
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  messageUser: {
    alignItems: 'flex-end',
  },
  messageAdmin: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleUser: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  messageBubbleAdmin: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  messageSender: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
  },
  messageContent: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageContentUser: {
    color: '#fff',
  },
  messageContentAdmin: {
    color: '#1f2937',
  },
  messageTime: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 6,
    textAlign: 'right',
  },
  // Input container
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    backgroundColor: '#f9fafb',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  closedNotice: {
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  closedNoticeText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 13,
  },
});
