/**
 * Écran Admin Support
 * v5.4.77 - Permet aux admins de voir et répondre aux tickets de support
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
import PayPalService from '../services/PayPalService';

export default function AdminSupportScreen({ navigation }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  
  // États pour la configuration des prix
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [newMonthlyPrice, setNewMonthlyPrice] = useState('');
  const [currentPricing, setCurrentPricing] = useState(null);
  const [savingPricing, setSavingPricing] = useState(false);
  
  const categories = SupportService.getCategories();
  const scrollViewRef = useRef();

  useEffect(() => {
    loadTickets();
    loadPricing();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const allTickets = await SupportService.getAllTickets();
      setTickets(allTickets);
    } catch (error) {
      console.error('Erreur chargement tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPricing = async () => {
    await PayPalService.loadConfig();
    const pricing = PayPalService.getCurrentPricing();
    setCurrentPricing(pricing);
    setNewMonthlyPrice(pricing.monthlyPrice.toString());
  };

  const handleSavePricing = async () => {
    const price = parseFloat(newMonthlyPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un prix valide');
      return;
    }

    setSavingPricing(true);
    try {
      const result = await PayPalService.setBasePrice(price);
      if (result.success) {
        setCurrentPricing({
          monthlyPrice: result.monthly,
          yearlyPrice: result.yearly,
          lifetimePrice: result.lifetime,
          yearlyMonths: 10,
          currency: 'EUR',
        });
        Alert.alert(
          '✅ Tarifs mis à jour',
          `Mensuel: ${result.monthly}€\nAnnuel: ${result.yearly}€ (2 mois gratuits)\nÀ vie: ${result.lifetime}€`
        );
        setShowPricingModal(false);
      } else {
        Alert.alert('Erreur', result.error || 'Impossible de sauvegarder');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setSavingPricing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setSendingMessage(true);
    try {
      const result = await SupportService.addMessage(selectedTicket.id, newMessage.trim(), true);
      
      if (result.success) {
        setNewMessage('');
        // Recharger le ticket
        const updatedTickets = await SupportService.getAllTickets();
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

  const handleChangeStatus = async (newStatus) => {
    if (!selectedTicket) return;

    const result = await SupportService.updateTicketStatus(selectedTicket.id, newStatus);
    if (result.success) {
      const updatedTickets = await SupportService.getAllTickets();
      setTickets(updatedTickets);
      const updated = updatedTickets.find(t => t.id === selectedTicket.id);
      if (updated) {
        setSelectedTicket(updated);
      }
    }
  };

  const handleDeleteTicket = () => {
    if (!selectedTicket) return;

    Alert.alert(
      'Supprimer le ticket',
      `Voulez-vous vraiment supprimer ce ticket ?\n\n${selectedTicket.subject}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await SupportService.deleteTicket(selectedTicket.id);
            setShowTicketModal(false);
            setSelectedTicket(null);
            await loadTickets();
          },
        },
      ]
    );
  };

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
    await SupportService.markMessagesAsRead(ticket.id, 'admin');
  };

  const getFilteredTickets = () => {
    if (filterStatus === 'all') return tickets;
    return tickets.filter(t => t.status === filterStatus);
  };

  const getTicketCounts = () => {
    return {
      all: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      pending: tickets.filter(t => t.status === 'pending').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
    };
  };

  const renderTicketItem = ({ item }) => {
    const statusInfo = SupportService.getStatusLabel(item.status);
    const category = categories.find(c => c.id === item.category);
    const unreadCount = item.messages.filter(
      m => m.senderType === 'user' && !m.read
    ).length;

    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() => openTicket(item)}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.ticketUserInfo}>
            <Text style={styles.ticketUsername}>👤 {item.username}</Text>
            <Text style={styles.ticketEmail}>{item.userEmail}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusInfo.icon} {statusInfo.label}</Text>
          </View>
        </View>
        
        <Text style={styles.ticketSubject}>{item.subject}</Text>
        
        <View style={styles.ticketMeta}>
          <Text style={styles.ticketCategory}>{category?.icon} {category?.name}</Text>
          <Text style={styles.ticketDate}>
            {new Date(item.updatedAt).toLocaleDateString('fr-FR')}
          </Text>
        </View>

        <View style={styles.ticketFooter}>
          <Text style={styles.ticketMessages}>
            💬 {item.messages.length} message{item.messages.length > 1 ? 's' : ''}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</Text>
            </View>
          )}
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
            {isUser ? `👤 ${item.senderName}` : '🛡️ Support (Vous)'}
          </Text>
          <Text style={[
            styles.messageContent,
            isUser ? styles.messageContentUser : styles.messageContentAdmin
          ]}>
            {item.content}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(item.sentAt).toLocaleString('fr-FR')}
          </Text>
        </View>
      </View>
    );
  };

  const counts = getTicketCounts();

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
          <Text style={styles.headerTitle}>🛡️ Support Admin</Text>
          <TouchableOpacity 
            style={styles.pricingButton}
            onPress={() => setShowPricingModal(true)}
          >
            <Text style={styles.pricingButtonText}>💰</Text>
          </TouchableOpacity>
        </View>

        {/* Filtres */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filtersContainer}
        >
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterText, filterStatus === 'all' && styles.filterTextActive]}>
              Tous ({counts.all})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'open' && styles.filterChipActive]}
            onPress={() => setFilterStatus('open')}
          >
            <Text style={[styles.filterText, filterStatus === 'open' && styles.filterTextActive]}>
              🔵 Ouverts ({counts.open})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'pending' && styles.filterChipActive]}
            onPress={() => setFilterStatus('pending')}
          >
            <Text style={[styles.filterText, filterStatus === 'pending' && styles.filterTextActive]}>
              🟡 En attente ({counts.pending})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'resolved' && styles.filterChipActive]}
            onPress={() => setFilterStatus('resolved')}
          >
            <Text style={[styles.filterText, filterStatus === 'resolved' && styles.filterTextActive]}>
              🟢 Résolus ({counts.resolved})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'closed' && styles.filterChipActive]}
            onPress={() => setFilterStatus('closed')}
          >
            <Text style={[styles.filterText, filterStatus === 'closed' && styles.filterTextActive]}>
              ⚫ Fermés ({counts.closed})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Liste des tickets */}
        {getFilteredTickets().length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Aucun ticket</Text>
            <Text style={styles.emptyText}>
              Aucun ticket de support {filterStatus !== 'all' ? 'avec ce statut' : ''}.
            </Text>
          </View>
        ) : (
          <FlatList
            data={getFilteredTickets()}
            renderItem={renderTicketItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.ticketsList}
            refreshing={loading}
            onRefresh={loadTickets}
          />
        )}

        {/* Modal Ticket Detail */}
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
            <View style={[styles.modalContent, { height: '95%' }]}>
              {selectedTicket && (
                <>
                  <View style={styles.modalHeader}>
                    <View style={styles.ticketHeaderInfo}>
                      <Text style={styles.modalTitle} numberOfLines={1}>
                        {selectedTicket.subject}
                      </Text>
                      <Text style={styles.ticketIdText}>
                        {selectedTicket.username} • {selectedTicket.userEmail}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowTicketModal(false)}>
                      <Text style={styles.closeButton}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Actions statut */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusActions}>
                    <TouchableOpacity
                      style={[styles.statusActionBtn, { backgroundColor: '#3b82f6' }]}
                      onPress={() => handleChangeStatus('open')}
                    >
                      <Text style={styles.statusActionText}>🔵 Ouvert</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusActionBtn, { backgroundColor: '#f59e0b' }]}
                      onPress={() => handleChangeStatus('pending')}
                    >
                      <Text style={styles.statusActionText}>🟡 En attente</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusActionBtn, { backgroundColor: '#10b981' }]}
                      onPress={() => handleChangeStatus('resolved')}
                    >
                      <Text style={styles.statusActionText}>🟢 Résolu</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusActionBtn, { backgroundColor: '#6b7280' }]}
                      onPress={() => handleChangeStatus('closed')}
                    >
                      <Text style={styles.statusActionText}>⚫ Fermé</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusActionBtn, { backgroundColor: '#ef4444' }]}
                      onPress={handleDeleteTicket}
                    >
                      <Text style={styles.statusActionText}>🗑️ Supprimer</Text>
                    </TouchableOpacity>
                  </ScrollView>

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
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.messageInput}
                      placeholder="Répondre au ticket..."
                      value={newMessage}
                      onChangeText={setNewMessage}
                      multiline
                      maxLength={2000}
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
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal Configuration Prix */}
        <Modal
          visible={showPricingModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowPricingModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pricingModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>💰 Configuration des tarifs</Text>
                <TouchableOpacity onPress={() => setShowPricingModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.pricingBody}>
                <Text style={styles.pricingInfo}>
                  Modifiez le prix mensuel de base.{'\n'}
                  Les autres tarifs seront calculés automatiquement :
                </Text>

                <View style={styles.pricingFormula}>
                  <Text style={styles.formulaText}>📅 Mensuel = Prix de base</Text>
                  <Text style={styles.formulaText}>🌟 Annuel = Mensuel × 10 (2 mois gratuits)</Text>
                  <Text style={styles.formulaText}>👑 À Vie = Mensuel × 20</Text>
                </View>

                <Text style={styles.inputLabel}>Prix mensuel (€)</Text>
                <TextInput
                  style={styles.priceInput}
                  value={newMonthlyPrice}
                  onChangeText={setNewMonthlyPrice}
                  keyboardType="decimal-pad"
                  placeholder="4.99"
                />

                {currentPricing && (
                  <View style={styles.pricingPreview}>
                    <Text style={styles.previewTitle}>Aperçu des nouveaux tarifs :</Text>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>📅 Mensuel</Text>
                      <Text style={styles.previewValue}>
                        {parseFloat(newMonthlyPrice || 0).toFixed(2)}€
                      </Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>🌟 Annuel</Text>
                      <Text style={styles.previewValue}>
                        {(parseFloat(newMonthlyPrice || 0) * 10).toFixed(2)}€
                      </Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>👑 À Vie</Text>
                      <Text style={styles.previewValue}>
                        {(parseFloat(newMonthlyPrice || 0) * 20).toFixed(2)}€
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowPricingModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, savingPricing && styles.buttonDisabled]}
                  onPress={handleSavePricing}
                  disabled={savingPricing}
                >
                  {savingPricing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>💾 Sauvegarder</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  pricingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pricingButtonText: {
    fontSize: 20,
  },
  // Filters
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
  },
  filterText: {
    fontSize: 13,
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  // Empty
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
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  ticketUserInfo: {
    flex: 1,
  },
  ticketUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  ticketEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 10,
  },
  ticketMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ticketCategory: {
    fontSize: 12,
    color: '#6b7280',
  },
  ticketDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  ticketMessages: {
    fontSize: 12,
    color: '#6b7280',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
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
  ticketHeaderInfo: {
    flex: 1,
  },
  ticketIdText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  // Status actions
  statusActions: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statusActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  statusActionText: {
    color: '#fff',
    fontSize: 12,
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
    alignItems: 'flex-start',
  },
  messageAdmin: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleUser: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  messageBubbleAdmin: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
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
    color: '#1f2937',
  },
  messageContentAdmin: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 6,
    textAlign: 'right',
  },
  // Input
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
  // Pricing Modal
  pricingModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  pricingBody: {
    padding: 20,
  },
  pricingInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 22,
  },
  pricingFormula: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  formulaText: {
    fontSize: 14,
    color: '#166534',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  priceInput: {
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
  },
  pricingPreview: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  previewValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 10,
  },
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
});
