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
  SafeAreaView,
} from 'react-native';
import AuthService from '../services/AuthService';

const FREEBOX_URL = 'http://88.174.155.230:33437';

/**
 * v5.4.0 - AdminPanelScreen COMPLÈTEMENT RÉÉCRIT
 * - Gestion d'erreurs robuste
 * - Affichage même si serveur indisponible
 * - Interface claire pour gérer utilisateurs
 */
export default function AdminPanelScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking'); // checking, online, offline

  // Charger les utilisateurs au démarrage
  useEffect(() => {
    console.log('🚀 AdminPanelScreen: Initialisation v5.4.0...');
    loadUsers();
  }, []);

  // Fonction de chargement des utilisateurs
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = AuthService.getCurrentUser();
      console.log('📋 Chargement des utilisateurs...');
      console.log('👤 Admin email:', currentUser?.email);
      
      // Essayer plusieurs endpoints
      let usersData = null;
      
      // 1. Essayer /admin/users
      try {
        console.log('🔗 Tentative: /admin/users');
        const response = await fetch(`${FREEBOX_URL}/admin/users`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Email': currentUser?.email || ''
          },
          timeout: 10000
        });
        
        console.log('📥 Status /admin/users:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          usersData = data.users || data || [];
          setServerStatus('online');
          console.log('✅ /admin/users: ', usersData.length, 'utilisateurs');
        }
      } catch (e) {
        console.log('❌ /admin/users failed:', e.message);
      }
      
      // 2. Fallback: /api/users/all
      if (!usersData) {
        try {
          console.log('🔗 Fallback: /api/users/all');
          const response = await fetch(`${FREEBOX_URL}/api/users/all`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Email': currentUser?.email || ''
            },
            timeout: 10000
          });
          
          console.log('📥 Status /api/users/all:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            usersData = data.users || data || [];
            setServerStatus('online');
            console.log('✅ /api/users/all:', usersData.length, 'utilisateurs');
          }
        } catch (e) {
          console.log('❌ /api/users/all failed:', e.message);
        }
      }
      
      // 3. Fallback: /api/users
      if (!usersData) {
        try {
          console.log('🔗 Fallback: /api/users');
          const response = await fetch(`${FREEBOX_URL}/api/users`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Email': currentUser?.email || ''
            },
            timeout: 10000
          });
          
          if (response.ok) {
            const data = await response.json();
            usersData = data.users || data || [];
            setServerStatus('online');
            console.log('✅ /api/users:', usersData.length, 'utilisateurs');
          }
        } catch (e) {
          console.log('❌ /api/users failed:', e.message);
        }
      }
      
      // Résultat
      if (usersData && usersData.length > 0) {
        setUsers(usersData);
        setError(null);
        console.log('✅ Total utilisateurs chargés:', usersData.length);
      } else if (usersData) {
        setUsers([]);
        setError('Aucun utilisateur trouvé sur le serveur.');
        setServerStatus('online');
      } else {
        setUsers([]);
        setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
        setServerStatus('offline');
      }
      
    } catch (error) {
      console.error('❌ Erreur globale:', error.message);
      setError(`Erreur: ${error.message}`);
      setServerStatus('offline');
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers();
  }, [loadUsers]);

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
                loadUsers();
              } else {
                const errorData = await response.json().catch(() => ({}));
                Alert.alert('❌ Erreur', errorData.error || 'Impossible de modifier les droits');
              }
            } catch (error) {
              Alert.alert('❌ Erreur', `Erreur de connexion: ${error.message}`);
            }
          }
        }
      ]
    );
  }, [loadUsers]);

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
                loadUsers();
              } else {
                const errorData = await response.json().catch(() => ({}));
                Alert.alert('❌ Erreur', errorData.error || 'Impossible de modifier le statut');
              }
            } catch (error) {
              Alert.alert('❌ Erreur', `Erreur de connexion: ${error.message}`);
            }
          }
        }
      ]
    );
  }, [loadUsers]);

  // Supprimer un utilisateur
  const deleteUser = useCallback(async (userId, email) => {
    if (!userId) {
      Alert.alert('❌ Erreur', 'ID utilisateur manquant');
      return;
    }
    
    Alert.alert(
      '🗑️ Supprimer l\'utilisateur',
      `Êtes-vous sûr de vouloir supprimer le compte de ${email} ?\n\nCette action est IRRÉVERSIBLE.`,
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
                Alert.alert('✅ Supprimé', 'L\'utilisateur a été supprimé');
                loadUsers();
              } else {
                Alert.alert('❌ Erreur', 'Impossible de supprimer l\'utilisateur');
              }
            } catch (error) {
              Alert.alert('❌ Erreur', `Erreur de connexion: ${error.message}`);
            }
          }
        }
      ]
    );
  }, [loadUsers]);

  // Voir le profil complet d'un utilisateur
  const viewUserProfile = useCallback((user) => {
    const profile = user.full_profile || user.profile || {};
    
    const username = profile.username || user.username || 'Non défini';
    const age = profile.age || user.age || 'Non défini';
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

    Alert.alert(`👤 Profil de ${username}`, details, [{ text: 'Fermer' }]);
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
        {/* En-tête avec nom et badges */}
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
        
        {/* Email et ID */}
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userId}>ID: {item.id || '⚠️ MANQUANT'}</Text>
        
        {/* Détails */}
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
        
        {/* Bouton voir profil */}
        <TouchableOpacity 
          style={styles.viewProfileBtn}
          onPress={() => viewUserProfile(item)}
        >
          <Text style={styles.viewProfileBtnText}>👁️ Voir le profil complet</Text>
        </TouchableOpacity>
        
        {/* Actions (sauf pour l'utilisateur actuel) */}
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

  // === RENDU PRINCIPAL ===
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>👑 Panel Admin</Text>
          <Text style={styles.subtitle}>Gestion des utilisateurs</Text>
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
        
        {/* Contenu principal */}
        <View style={styles.content}>
          {/* Stats */}
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
          
          {/* État de chargement */}
          {loading && !refreshing ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Chargement des utilisateurs...</Text>
            </View>
          ) : error ? (
            /* Affichage erreur */
            <View style={styles.errorBox}>
              <Text style={styles.errorEmoji}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadUsers}>
                <Text style={styles.retryBtnText}>🔄 Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : filteredUsers.length === 0 ? (
            /* Liste vide */
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Aucun résultat pour cette recherche' : 'Aucun utilisateur trouvé'}
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadUsers}>
                <Text style={styles.retryBtnText}>🔄 Recharger</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Liste des utilisateurs */
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
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6366f1',
  },
  container: {
    flex: 1,
    backgroundColor: '#6366f1',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10,
    backgroundColor: '#6366f1',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
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
  content: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    padding: 15,
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
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6b7280',
  },
  errorBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorEmoji: {
    fontSize: 50,
    marginBottom: 15,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  listContent: {
    padding: 15,
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
