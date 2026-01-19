import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import AuthService from '../services/AuthService';

const FREEBOX_URL = 'http://88.174.155.230:33437';

/**
 * v5.4.2 - AdminPanelScreen RÉÉCRIT POUR AFFICHAGE GARANTI
 * - Rendu TOUJOURS garanti, jamais de page blanche
 * - Gestion d'erreurs complète
 * - UI robuste avec états clairs
 */
export default function AdminPanelScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Charger les utilisateurs au démarrage
  useEffect(() => {
    console.log('🚀 AdminPanelScreen v5.4.2: Initialisation...');
    loadUsersWithTimeout();
  }, []);

  // Fonction de chargement avec timeout
  const loadUsersWithTimeout = async () => {
    try {
      setLoading(true);
      setError(null);
      setServerStatus('checking');
      setLoadAttempt(prev => prev + 1);
      
      console.log(`📋 Tentative de chargement #${loadAttempt + 1}...`);
      
      // Timeout de 15 secondes
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: Le serveur met trop de temps à répondre')), 15000)
      );
      
      const loadPromise = loadUsersInternal();
      
      await Promise.race([loadPromise, timeoutPromise]);
      
    } catch (err) {
      console.error('❌ Erreur globale:', err.message);
      setError(err.message || 'Erreur de connexion');
      setServerStatus('offline');
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fonction interne de chargement
  const loadUsersInternal = async () => {
    const currentUser = AuthService.getCurrentUser();
    console.log('👤 Admin email:', currentUser?.email);
    
    let usersData = null;
    let lastError = null;
    
    // Liste des endpoints à essayer
    const endpoints = [
      '/admin/users',
      '/api/users/all', 
      '/api/users',
      '/users'
    ];
    
    for (const endpoint of endpoints) {
      if (usersData) break;
      
      try {
        console.log(`🔗 Essai: ${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${FREEBOX_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Email': currentUser?.email || '',
            'Authorization': `Bearer ${currentUser?.token || ''}`
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log(`📥 ${endpoint}: status ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          usersData = Array.isArray(data) ? data : (data.users || data.data || []);
          setServerStatus('online');
          console.log(`✅ ${endpoint}: ${usersData.length} utilisateurs`);
          break;
        } else {
          lastError = `Erreur ${response.status}`;
        }
      } catch (e) {
        console.log(`❌ ${endpoint}: ${e.message}`);
        lastError = e.message;
      }
    }
    
    // Résultat
    if (usersData && usersData.length > 0) {
      setUsers(usersData);
      setError(null);
      setServerStatus('online');
    } else if (usersData) {
      setUsers([]);
      setError('Aucun utilisateur trouvé');
      setServerStatus('online');
    } else {
      setUsers([]);
      setError(lastError || 'Serveur indisponible');
      setServerStatus('offline');
    }
  };

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsersWithTimeout();
  }, []);

  // Modifier le statut admin
  const toggleAdminStatus = useCallback(async (userId, currentStatus, email) => {
    if (!userId) {
      Alert.alert('❌ Erreur', 'ID utilisateur manquant');
      return;
    }
    
    const action = currentStatus ? 'retirer les droits admin' : 'donner les droits admin';
    
    Alert.alert(
      '👑 Modifier les droits Admin',
      `Voulez-vous ${action} à ${email} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              const response = await fetch(`${FREEBOX_URL}/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Admin-Email': AuthService.getCurrentUser()?.email || ''
                },
                body: JSON.stringify({ is_admin: !currentStatus })
              });
              
              if (response.ok) {
                Alert.alert('✅ Succès', `Droits admin ${currentStatus ? 'retirés' : 'accordés'}`);
                loadUsersWithTimeout();
              } else {
                Alert.alert('❌ Erreur', 'Impossible de modifier les droits');
              }
            } catch (error) {
              Alert.alert('❌ Erreur', error.message);
            }
          }
        }
      ]
    );
  }, []);

  // Modifier le statut premium
  const togglePremiumStatus = useCallback(async (userId, currentStatus, email) => {
    if (!userId) {
      Alert.alert('❌ Erreur', 'ID utilisateur manquant');
      return;
    }
    
    const action = currentStatus ? 'retirer le statut premium' : 'donner le statut premium';
    
    Alert.alert(
      '⭐ Modifier le statut Premium',
      `Voulez-vous ${action} à ${email} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              const response = await fetch(`${FREEBOX_URL}/admin/users/${userId}/premium`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Admin-Email': AuthService.getCurrentUser()?.email || ''
                },
                body: JSON.stringify({ is_premium: !currentStatus })
              });
              
              if (response.ok) {
                Alert.alert('✅ Succès', `Statut premium ${currentStatus ? 'retiré' : 'accordé'}`);
                loadUsersWithTimeout();
              } else {
                Alert.alert('❌ Erreur', 'Impossible de modifier le statut');
              }
            } catch (error) {
              Alert.alert('❌ Erreur', error.message);
            }
          }
        }
      ]
    );
  }, []);

  // Supprimer un utilisateur
  const deleteUser = useCallback(async (userId, email) => {
    if (!userId) {
      Alert.alert('❌ Erreur', 'ID utilisateur manquant');
      return;
    }
    
    Alert.alert(
      '🗑️ Supprimer l\'utilisateur',
      `Supprimer ${email} ?\n\nAction IRRÉVERSIBLE.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${FREEBOX_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Admin-Email': AuthService.getCurrentUser()?.email || ''
                }
              });
              
              if (response.ok) {
                Alert.alert('✅ Supprimé', 'Utilisateur supprimé');
                loadUsersWithTimeout();
              } else {
                Alert.alert('❌ Erreur', 'Impossible de supprimer');
              }
            } catch (error) {
              Alert.alert('❌ Erreur', error.message);
            }
          }
        }
      ]
    );
  }, []);

  // Voir le profil complet
  const viewUserProfile = useCallback((user) => {
    const profile = user.full_profile || user.profile || {};
    
    const username = profile.username || user.username || 'Non défini';
    const age = profile.age || user.age || 'N/A';
    const genderRaw = (profile.gender || user.gender || '').toLowerCase();
    const nsfwMode = profile.nsfwMode || user.nsfw_enabled || false;
    const bust = profile.bust || user.bust || '';
    const penis = profile.penis || user.penis || '';
    
    const isMale = genderRaw === 'male' || genderRaw === 'homme';
    const isFemale = genderRaw === 'female' || genderRaw === 'femme';
    
    let genderText = 'Non défini';
    if (isMale) genderText = '👨 Homme';
    else if (isFemale) genderText = '👩 Femme';
    else if (genderRaw) genderText = `🧑 ${genderRaw}`;
    
    let details = `📧 Email: ${user.email || 'N/A'}\n`;
    details += `👤 Pseudo: ${username}\n`;
    details += `🎂 Âge: ${age}\n`;
    details += `⚧️ Genre: ${genderText}\n`;
    
    if (isFemale && bust) details += `👙 Bonnet: ${bust}\n`;
    if (isMale && penis) details += `📏 Pénis: ${penis} cm\n`;
    if (!isMale && !isFemale) {
      if (bust) details += `👙 Bonnet: ${bust}\n`;
      if (penis) details += `📏 Pénis: ${penis} cm\n`;
    }
    
    details += `\n📊 STATUTS:\n`;
    details += `   👑 Admin: ${user.is_admin ? '✅ OUI' : '❌ Non'}\n`;
    details += `   ⭐ Premium: ${user.is_premium ? '✅ OUI' : '❌ Non'}\n`;
    details += `   🔞 NSFW: ${nsfwMode ? '✅ Activé' : '❌ Désactivé'}\n`;
    
    const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'N/A';
    details += `\n📅 Inscrit le: ${createdAt}\n`;
    details += `🆔 ID: ${user.id || 'MANQUANT'}`;

    Alert.alert(`👤 ${username}`, details, [{ text: 'Fermer' }]);
  }, []);

  // Filtrer les utilisateurs
  const filteredUsers = users.filter(user => 
    (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (user.username?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Rendu d'un utilisateur
  const renderUser = useCallback(({ item }) => {
    const isCurrentUser = item.email === AuthService.getCurrentUser()?.email;
    const username = item.username || item.email?.split('@')[0] || 'Sans pseudo';
    
    return (
      <View style={[styles.userCard, isCurrentUser && styles.currentUserCard]}>
        <View style={styles.userHeader}>
          <Text style={styles.userName} numberOfLines={1}>{username}</Text>
          <View style={styles.badges}>
            {item.is_admin && (
              <View style={styles.adminBadge}>
                <Text style={styles.badgeText}>👑 Admin</Text>
              </View>
            )}
            {item.is_premium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.badgeText}>⭐ Premium</Text>
              </View>
            )}
          </View>
        </View>
        
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userId}>ID: {item.id || '⚠️ MANQUANT'}</Text>
        
        <View style={styles.userDetails}>
          {item.age && <Text style={styles.detailChip}>🎂 {item.age} ans</Text>}
          {item.gender && (
            <Text style={styles.detailChip}>
              {item.gender === 'male' ? '👨' : item.gender === 'female' ? '👩' : '🧑'} {item.gender}
            </Text>
          )}
          {(item.nsfw_enabled || item.profile?.nsfwMode) && (
            <Text style={[styles.detailChip, styles.nsfwChip]}>🔞 NSFW</Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.viewProfileBtn}
          onPress={() => viewUserProfile(item)}
        >
          <Text style={styles.viewProfileBtnText}>👁️ Voir profil complet</Text>
        </TouchableOpacity>
        
        {!isCurrentUser ? (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionBtn, item.is_admin ? styles.removeBtn : styles.addAdminBtn]}
              onPress={() => toggleAdminStatus(item.id, item.is_admin, item.email)}
            >
              <Text style={styles.actionBtnText}>
                {item.is_admin ? '➖ Admin' : '➕ Admin'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, item.is_premium ? styles.removeBtn : styles.addPremiumBtn]}
              onPress={() => togglePremiumStatus(item.id, item.is_premium, item.email)}
            >
              <Text style={styles.actionBtnText}>
                {item.is_premium ? '➖ Premium' : '➕ Premium'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => deleteUser(item.id, item.email)}
            >
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.youLabel}>
            <Text style={styles.youLabelText}>👤 C'est vous</Text>
          </View>
        )}
      </View>
    );
  }, [toggleAdminStatus, togglePremiumStatus, deleteUser, viewUserProfile]);

  // ============================================
  // === RENDU PRINCIPAL - TOUJOURS QUELQUE CHOSE
  // ============================================
  
  // HEADER - Toujours affiché
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>👑 Panel Admin</Text>
      <Text style={styles.subtitle}>Gestion des utilisateurs v5.4.2</Text>
      <View style={styles.serverStatus}>
        <View style={[
          styles.statusDot, 
          serverStatus === 'online' ? styles.statusOnline : 
          serverStatus === 'offline' ? styles.statusOffline : 
          styles.statusChecking
        ]} />
        <Text style={styles.statusText}>
          {serverStatus === 'online' ? 'Serveur connecté' : 
           serverStatus === 'offline' ? 'Serveur hors ligne' : 
           'Vérification...'}
        </Text>
      </View>
    </View>
  );

  // STATS - Affichées même si vides
  const renderStats = () => (
    <View style={styles.statsRow}>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>{users.length}</Text>
        <Text style={styles.statLabel}>Membres</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>{users.filter(u => u.is_admin).length}</Text>
        <Text style={styles.statLabel}>Admins</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>{users.filter(u => u.is_premium).length}</Text>
        <Text style={styles.statLabel}>Premium</Text>
      </View>
    </View>
  );

  // CONTENU PRINCIPAL
  const renderContent = () => {
    // Chargement
    if (loading && !refreshing) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.centerText}>Chargement des utilisateurs...</Text>
          <Text style={styles.subText}>Tentative #{loadAttempt}</Text>
        </View>
      );
    }
    
    // Erreur avec serveur offline
    if (error && serverStatus === 'offline') {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.errorEmoji}>📡</Text>
          <Text style={styles.errorTitle}>Serveur indisponible</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadUsersWithTimeout}>
            <Text style={styles.retryBtnText}>🔄 Réessayer</Text>
          </TouchableOpacity>
          <Text style={styles.hintText}>
            Vérifiez que le serveur Freebox est en ligne
          </Text>
        </View>
      );
    }
    
    // Erreur autre
    if (error) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadUsersWithTimeout}>
            <Text style={styles.retryBtnText}>🔄 Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Liste vide
    if (filteredUsers.length === 0) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Aucun résultat' : 'Aucun utilisateur'}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery ? 
              `Aucun utilisateur ne correspond à "${searchQuery}"` : 
              'La liste des utilisateurs est vide'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadUsersWithTimeout}>
            <Text style={styles.retryBtnText}>🔄 Recharger</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Liste des utilisateurs
    return (
      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={item => item.id?.toString() || item.email || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
      />
    );
  };

  // === RENDU FINAL ===
  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        {renderHeader()}
      </View>
      
      <View style={styles.contentSection}>
        {renderStats()}
        
        {/* Recherche */}
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Rechercher un membre..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        {/* Contenu principal */}
        <View style={styles.listSection}>
          {renderContent()}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6366f1',
  },
  headerSection: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  header: {},
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#e0e7ff',
    marginTop: 4,
  },
  serverStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusOnline: {
    backgroundColor: '#10b981',
  },
  statusOffline: {
    backgroundColor: '#ef4444',
  },
  statusChecking: {
    backgroundColor: '#f59e0b',
  },
  statusText: {
    fontSize: 12,
    color: '#e0e7ff',
  },
  contentSection: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  searchBox: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  listSection: {
    flex: 1,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  centerText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6b7280',
  },
  subText: {
    marginTop: 5,
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
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  hintText: {
    marginTop: 15,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  retryBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
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
    marginBottom: 20,
  },
  listContent: {
    padding: 15,
    paddingBottom: 30,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  currentUserCard: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
  },
  adminBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 6,
  },
  premiumBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 13,
    color: '#6b7280',
  },
  userId: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  userDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  detailChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 11,
    color: '#6b7280',
  },
  nsfwChip: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
  viewProfileBtn: {
    backgroundColor: '#e0e7ff',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  viewProfileBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338ca',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  addAdminBtn: {
    backgroundColor: '#fef3c7',
  },
  addPremiumBtn: {
    backgroundColor: '#dbeafe',
  },
  removeBtn: {
    backgroundColor: '#fee2e2',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    flex: 0,
    paddingHorizontal: 12,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  deleteBtnText: {
    fontSize: 14,
  },
  youLabel: {
    marginTop: 12,
    alignItems: 'center',
  },
  youLabelText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
});
