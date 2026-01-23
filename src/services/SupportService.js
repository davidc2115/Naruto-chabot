/**
 * Service de Support Utilisateur
 * v5.4.77 - Permet aux utilisateurs d'envoyer des messages de support
 * Stockage local + synchronisation avec le serveur Freebox
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './AuthService';

const FREEBOX_URL = 'http://88.174.155.230:33437';

class SupportService {
  constructor() {
    this.TICKETS_KEY = '@support_tickets';
    this.MESSAGES_KEY = '@support_messages';
  }
  
  /**
   * Génère un ID unique pour un ticket
   */
  generateTicketId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `TKT_${timestamp}_${random}`.toUpperCase();
  }
  
  /**
   * Crée un nouveau ticket de support
   */
  async createTicket(subject, message, category = 'general') {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) {
        throw new Error('Vous devez être connecté pour envoyer un message');
      }
      
      const ticketId = this.generateTicketId();
      const ticket = {
        id: ticketId,
        userId: user.id,
        userEmail: user.email,
        username: user.profile?.username || user.email?.split('@')[0] || 'Utilisateur',
        subject,
        category,
        status: 'open', // open, pending, resolved, closed
        priority: 'normal', // low, normal, high, urgent
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [{
          id: `MSG_${Date.now()}`,
          ticketId,
          senderId: user.id,
          senderName: user.profile?.username || 'Utilisateur',
          senderType: 'user',
          content: message,
          sentAt: new Date().toISOString(),
          read: false,
        }],
      };
      
      // Sauvegarder localement
      await this.saveTicketLocally(ticket);
      
      // Envoyer au serveur
      await this.syncTicketToServer(ticket);
      
      console.log(`🎫 Ticket créé: ${ticketId}`);
      
      return { success: true, ticket };
    } catch (error) {
      console.error('Erreur création ticket:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Ajoute un message à un ticket existant
   */
  async addMessage(ticketId, content, isAdmin = false) {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) {
        throw new Error('Vous devez être connecté');
      }
      
      const message = {
        id: `MSG_${Date.now()}`,
        ticketId,
        senderId: user.id,
        senderName: isAdmin ? 'Support' : (user.profile?.username || 'Utilisateur'),
        senderType: isAdmin ? 'admin' : 'user',
        content,
        sentAt: new Date().toISOString(),
        read: false,
      };
      
      // Mettre à jour le ticket local
      const tickets = await this.getLocalTickets();
      const ticketIndex = tickets.findIndex(t => t.id === ticketId);
      
      if (ticketIndex !== -1) {
        tickets[ticketIndex].messages.push(message);
        tickets[ticketIndex].updatedAt = new Date().toISOString();
        
        // Si admin répond, passer en pending, si user répond sur resolved, réouvrir
        if (isAdmin && tickets[ticketIndex].status === 'open') {
          tickets[ticketIndex].status = 'pending';
        } else if (!isAdmin && tickets[ticketIndex].status === 'resolved') {
          tickets[ticketIndex].status = 'open';
        }
        
        await AsyncStorage.setItem(this.TICKETS_KEY, JSON.stringify(tickets));
      }
      
      // Envoyer au serveur
      await this.syncMessageToServer(ticketId, message);
      
      return { success: true, message };
    } catch (error) {
      console.error('Erreur ajout message:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Sauvegarde un ticket localement
   */
  async saveTicketLocally(ticket) {
    try {
      const tickets = await this.getLocalTickets();
      const existingIndex = tickets.findIndex(t => t.id === ticket.id);
      
      if (existingIndex !== -1) {
        tickets[existingIndex] = ticket;
      } else {
        tickets.unshift(ticket); // Ajouter en premier
      }
      
      await AsyncStorage.setItem(this.TICKETS_KEY, JSON.stringify(tickets));
    } catch (error) {
      console.error('Erreur sauvegarde ticket local:', error);
    }
  }
  
  /**
   * Récupère les tickets locaux
   */
  async getLocalTickets() {
    try {
      const stored = await AsyncStorage.getItem(this.TICKETS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erreur lecture tickets:', error);
      return [];
    }
  }
  
  /**
   * Récupère les tickets de l'utilisateur actuel
   */
  async getUserTickets() {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) return [];
      
      // D'abord, synchroniser avec le serveur
      await this.syncFromServer();
      
      const tickets = await this.getLocalTickets();
      return tickets.filter(t => t.userId === user.id);
    } catch (error) {
      console.error('Erreur récupération tickets user:', error);
      return [];
    }
  }
  
  /**
   * Récupère tous les tickets (pour admin)
   */
  async getAllTickets() {
    try {
      // Synchroniser avec le serveur
      await this.syncFromServer();
      
      return await this.getLocalTickets();
    } catch (error) {
      console.error('Erreur récupération tous tickets:', error);
      return [];
    }
  }
  
  /**
   * Met à jour le statut d'un ticket (admin)
   */
  async updateTicketStatus(ticketId, newStatus) {
    try {
      const tickets = await this.getLocalTickets();
      const ticketIndex = tickets.findIndex(t => t.id === ticketId);
      
      if (ticketIndex !== -1) {
        tickets[ticketIndex].status = newStatus;
        tickets[ticketIndex].updatedAt = new Date().toISOString();
        await AsyncStorage.setItem(this.TICKETS_KEY, JSON.stringify(tickets));
        
        // Synchroniser avec le serveur
        await this.syncTicketToServer(tickets[ticketIndex]);
        
        return { success: true };
      }
      
      return { success: false, error: 'Ticket non trouvé' };
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Marque les messages comme lus
   */
  async markMessagesAsRead(ticketId, userId) {
    try {
      const tickets = await this.getLocalTickets();
      const ticketIndex = tickets.findIndex(t => t.id === ticketId);
      
      if (ticketIndex !== -1) {
        tickets[ticketIndex].messages = tickets[ticketIndex].messages.map(msg => {
          if (msg.senderId !== userId && !msg.read) {
            return { ...msg, read: true };
          }
          return msg;
        });
        await AsyncStorage.setItem(this.TICKETS_KEY, JSON.stringify(tickets));
      }
    } catch (error) {
      console.error('Erreur marquage messages lus:', error);
    }
  }
  
  /**
   * Compte les messages non lus pour l'utilisateur
   */
  async getUnreadCount(isAdmin = false) {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) return 0;
      
      const tickets = isAdmin 
        ? await this.getLocalTickets()
        : await this.getUserTickets();
      
      let unreadCount = 0;
      
      tickets.forEach(ticket => {
        ticket.messages.forEach(msg => {
          // Si admin, compter les messages des users non lus
          // Si user, compter les messages des admins non lus
          if (isAdmin && msg.senderType === 'user' && !msg.read) {
            unreadCount++;
          } else if (!isAdmin && msg.senderType === 'admin' && !msg.read) {
            unreadCount++;
          }
        });
      });
      
      return unreadCount;
    } catch (error) {
      console.error('Erreur comptage non lus:', error);
      return 0;
    }
  }
  
  /**
   * Synchronise un ticket vers le serveur
   */
  async syncTicketToServer(ticket) {
    try {
      const token = AuthService.token;
      if (!token) return;
      
      const response = await fetch(`${FREEBOX_URL}/api/support/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(ticket),
      });
      
      if (response.ok) {
        console.log(`🔄 Ticket ${ticket.id} synchronisé`);
      }
    } catch (error) {
      console.log('Serveur non disponible pour sync ticket:', error.message);
      // Pas d'erreur fatale - le ticket reste local
    }
  }
  
  /**
   * Synchronise un message vers le serveur
   */
  async syncMessageToServer(ticketId, message) {
    try {
      const token = AuthService.token;
      if (!token) return;
      
      const response = await fetch(`${FREEBOX_URL}/api/support/ticket/${ticketId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(message),
      });
      
      if (response.ok) {
        console.log(`🔄 Message synchronisé pour ticket ${ticketId}`);
      }
    } catch (error) {
      console.log('Serveur non disponible pour sync message:', error.message);
    }
  }
  
  /**
   * Synchronise les tickets depuis le serveur
   */
  async syncFromServer() {
    try {
      const token = AuthService.token;
      if (!token) return;
      
      const user = AuthService.getCurrentUser();
      const isAdmin = user?.is_admin || false;
      
      const endpoint = isAdmin 
        ? `${FREEBOX_URL}/api/support/tickets/all`
        : `${FREEBOX_URL}/api/support/tickets`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.tickets && Array.isArray(data.tickets)) {
          // Fusionner avec les tickets locaux
          const localTickets = await this.getLocalTickets();
          const serverTicketIds = data.tickets.map(t => t.id);
          
          // Garder les tickets locaux qui ne sont pas sur le serveur
          const newLocalOnly = localTickets.filter(t => !serverTicketIds.includes(t.id));
          
          // Fusionner les tickets du serveur avec les locaux uniquement
          const mergedTickets = [...data.tickets, ...newLocalOnly];
          
          await AsyncStorage.setItem(this.TICKETS_KEY, JSON.stringify(mergedTickets));
          console.log(`🔄 ${data.tickets.length} tickets synchronisés depuis le serveur`);
        }
      }
    } catch (error) {
      console.log('Serveur non disponible pour sync:', error.message);
      // Pas d'erreur fatale - utiliser les tickets locaux
    }
  }
  
  /**
   * Supprime un ticket (admin uniquement)
   */
  async deleteTicket(ticketId) {
    try {
      const tickets = await this.getLocalTickets();
      const filteredTickets = tickets.filter(t => t.id !== ticketId);
      await AsyncStorage.setItem(this.TICKETS_KEY, JSON.stringify(filteredTickets));
      
      // Supprimer aussi sur le serveur
      const token = AuthService.token;
      if (token) {
        await fetch(`${FREEBOX_URL}/api/support/ticket/${ticketId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erreur suppression ticket:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Catégories de tickets disponibles
   */
  getCategories() {
    return [
      { id: 'general', name: 'Général', icon: '💬' },
      { id: 'bug', name: 'Bug / Problème technique', icon: '🐛' },
      { id: 'payment', name: 'Paiement / Premium', icon: '💳' },
      { id: 'account', name: 'Compte / Profil', icon: '👤' },
      { id: 'content', name: 'Contenu / Personnages', icon: '🎭' },
      { id: 'suggestion', name: 'Suggestion / Amélioration', icon: '💡' },
      { id: 'other', name: 'Autre', icon: '📝' },
    ];
  }
  
  /**
   * Obtient le label d'un statut
   */
  getStatusLabel(status) {
    const labels = {
      open: { label: 'Ouvert', color: '#3b82f6', icon: '🔵' },
      pending: { label: 'En attente', color: '#f59e0b', icon: '🟡' },
      resolved: { label: 'Résolu', color: '#10b981', icon: '🟢' },
      closed: { label: 'Fermé', color: '#6b7280', icon: '⚫' },
    };
    return labels[status] || labels.open;
  }
}

// Singleton
const supportService = new SupportService();
export default supportService;
