import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import AuthService from '../services/AuthService';

const FREEBOX_URL = 'http://88.174.155.230:33437';

export default function AdminPanelScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('📋 Chargement des utilisateurs...');
      console.log('🔗 URL:', `${FREEBOX_URL}/admin/users`);
      console.log('👤 Admin email:', AuthService.getCurrentUser()?.email);
      
      const response = await fetch(`${FREEBOX_URL}/admin/users`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Email': AuthService.getCurrentUser()?.email || ''
        }
      });
      
      console.log('📥 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Utilisateurs récupérés:', data.users?.length || 0);
        // Vérifier les IDs des utilisateurs
        if (data.users?.length > 0) {
          console.log('📋 Premier utilisateur:', JSON.stringify(data.users[0], null, 2));
          const usersWithoutId = data.users.filter(u => !u.id);
          if (usersWithoutId.length > 0) {
            console.warn('⚠️ Utilisateurs sans ID:', usersWithoutId.length);
          }
        }
        setUsers(data.users || []);
      } else {
        const errorText = await response.text();
        console.error('❌ Erreur chargement utilisateurs:', response.status, errorText);
        
        // Essayer un fallback avec l'endpoint /api/users/all
        console.log('🔄 Tentative fallback /api/users/all...');
        await loadUsersFromFallback();
      }
    } catch (error) {
      console.error('❌ Erreur réseau:', error.message);
      // Essayer le fallback
      await loadUsersFromFallback();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const loadUsersFromFallback = async () => {
    try {
      console.log('🔄 Fallback: chargement via /api/users/all');
      const response = await fetch(`${FREEBOX_URL}/api/users/all`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Email': AuthService.getCurrentUser()?.email || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Fallback réussi:', data.users?.length || data.length || 0, 'utilisateurs');
        // Gérer les deux formats de réponse possibles
        const userList = data.users || data || [];
        setUsers(userList);
      } else {
        console.error('❌ Fallback échoué:', response.status);
      }
    } catch (error) {
      console.error('❌ Erreur fallback:', error.message);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const toggleAdminStatus = async (userId, currentStatus) => {
    if (!userId) {
      Alert.alert('❌ Erreur', 'ID utilisateur manquant');
      console.error('❌ toggleAdminStatus: userId est undefined/null');
      return;
    }
    
    const action = currentStatus ? 'retirer les droits admin' : 'donner les droits admin';
    Alert.alert(
      '👑 Modifier les droits',
      `Voulez-vous ${action} à cet utilisateur ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              console.log(`👑 Modification admin pour userId=${userId}, nouveau statut=${!currentStatus}`);
              const url = `${FREEBOX_URL}/admin/users/${userId}/role`;
              console.log('🔗 URL:', url);
              
              const response = await fetch(url, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Admin-Email': AuthService.getCurrentUser()?.email || ''
                },
                body: JSON.stringify({ is_admin: !currentStatus })
              });
              
              console.log('📥 Response status:', response.status);
              const responseData = await response.json().catch(() => ({}));
              console.log('📥 Response data:', responseData);
              
              if (response.ok && responseData.success !== false) {
                Alert.alert('✅ Succès', 'Les droits ont été modifiés');
                loadUsers();
              } else {
                Alert.alert('❌ Erreur', responseData.error || 'Impossible de modifier les droits');
              }
            } catch (error) {
              console.error('❌ Erreur toggleAdminStatus:', error);
              Alert.alert('❌ Erreur', `Erreur de connexion: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const togglePremiumStatus = async (userId, currentStatus) => {
    if (!userId) {
      Alert.alert('❌ Erreur', 'ID utilisateur manquant');
      console.error('❌ togglePremiumStatus: userId est undefined/null');
      return;
    }
    
    const action = currentStatus ? 'retirer le statut premium' : 'donner le statut premium';
    Alert.alert(
      '⭐ Modifier le statut premium',
      `Voulez-vous ${action} à cet utilisateur ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              console.log(`⭐ Modification premium pour userId=${userId}, nouveau statut=${!currentStatus}`);
              const url = `${FREEBOX_URL}/admin/users/${userId}/premium`;
              console.log('🔗 URL:', url);
              
              const response = await fetch(url, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Admin-Email': AuthService.getCurrentUser()?.email || ''
                },
                body: JSON.stringify({ is_premium: !currentStatus })
              });
              
              console.log('📥 Response status:', response.status);
              const responseData = await response.json().catch(() => ({}));
              console.log('📥 Response data:', responseData);
              
              if (response.ok && responseData.success !== false) {
                Alert.alert('✅ Succès', 'Le statut premium a été modifié');
                loadUsers();
              } else {
                Alert.alert('❌ Erreur', responseData.error || 'Impossible de modifier le statut');
              }
            } catch (error) {
              console.error('❌ Erreur togglePremiumStatus:', error);
              Alert.alert('❌ Erreur', `Erreur de connexion: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const deleteUser = async (userId, email) => {
    Alert.alert(
      '🗑️ Supprimer l\'utilisateur',
      `Êtes-vous sûr de vouloir supprimer le compte de ${email} ? Cette action est irréversible.`,
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
              Alert.alert('❌ Erreur', 'Erreur de connexion au serveur');
            }
          }
        }
      ]
    );
  };

  // Afficher le profil complet d'un utilisateur
  const viewUserProfile = (user) => {
    const profile = user.full_profile || {};
    
    const genderText = {
      'male': '👨 Homme',
      'female': '👩 Femme',
      'non-binary': '🧑 Non-binaire'
    }[profile.gender] || profile.gender || 'Non défini';
    
    let profileDetails = `📧 Email: ${user.email}\n`;
    profileDetails += `👤 Pseudo: ${profile.username || 'Non défini'}\n`;
    profileDetails += `🎂 Âge: ${profile.age || 'Non défini'}\n`;
    profileDetails += `⚧️ Genre: ${genderText}\n`;
    profileDetails += `\n📊 Statuts:\n`;
    profileDetails += `   👑 Admin: ${user.is_admin ? 'Oui' : 'Non'}\n`;
    profileDetails += `   ⭐ Premium: ${user.is_premium ? 'Oui' : 'Non'}\n`;
    profileDetails += `   🔞 NSFW: ${profile.nsfwMode ? 'Activé' : 'Désactivé'}\n`;
    
    if (profile.gender === 'female' && profile.bust) {
      profileDetails += `\n👙 Bonnet: ${profile.bust}\n`;
    }
    if (profile.gender === 'male' && profile.penis) {
      profileDetails += `\n📏 Taille: ${profile.penis} cm\n`;
    }
    
    profileDetails += `\n📅 Inscrit le: ${new Date(user.created_at).toLocaleDateString('fr-FR')}\n`;
    profileDetails += `🆔 ID: ${user.id || 'N/A'}`;

    Alert.alert(
      `👤 Profil de ${profile.username || user.email}`,
      profileDetails,
      [{ text: 'Fermer', style: 'cancel' }]
    );
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUser = ({ item }) => {
    const isCurrentUser = item.email === AuthService.getCurrentUser()?.email;
    
    return (
      <View style={[styles.userCard, isCurrentUser && styles.currentUserCard]}>
        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <Text style={styles.userName}>
              {item.username || 'Sans pseudo'}
            </Text>
            <View style={styles.badges}>
              {item.is_admin && (
                <View style={[styles.adminBadge, styles.badge]}>
                  <Text style={styles.badgeText}>👑 Admin</Text>
                </View>
              )}
              {item.is_premium && (
                <View style={[styles.premiumBadge, styles.badge]}>
                  <Text style={styles.badgeText}>⭐ Premium</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userDetails}>
            <Text style={[styles.detailText, styles.detailItem]}>
              📅 Inscrit: {new Date(item.created_at).toLocaleDateString('fr-FR')}
            </Text>
            {item.age && (
              <Text style={[styles.detailText, styles.detailItem]}>🎂 {item.age} ans</Text>
            )}
            {item.nsfw_enabled && (
              <Text style={[styles.detailText, styles.detailItem]}>🔞 NSFW activé</Text>
            )}
          </View>
        </View>
        
        {/* Bouton voir profil - pour tous les utilisateurs */}
        <TouchableOpacity 
          style={styles.viewProfileButton}
          onPress={() => viewUserProfile(item)}
        >
          <Text style={styles.viewProfileButtonText}>👁️ Voir le profil complet</Text>
        </TouchableOpacity>
        
        {!isCurrentUser && (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, item.is_admin ? styles.removeButton : styles.adminButton, styles.actionItem]}
              onPress={() => toggleAdminStatus(item.id, item.is_admin)}
            >
              <Text style={styles.actionButtonText}>
                {item.is_admin ? '➖ Admin' : '➕ Admin'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, item.is_premium ? styles.removeButton : styles.premiumButton, styles.actionItem]}
              onPress={() => togglePremiumStatus(item.id, item.is_premium)}
            >
              <Text style={styles.actionButtonText}>
                {item.is_premium ? '➖ Premium' : '➕ Premium'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => deleteUser(item.id, item.email)}
            >
              <Text style={styles.actionButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {isCurrentUser && (
          <View style={styles.currentUserLabel}>
            <Text style={styles.currentUserText}>Vous</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Chargement des utilisateurs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👑 Panel Admin</Text>
        <Text style={styles.subtitle}>Gestion des membres</Text>
      </View>
      
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Membres</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{users.filter(u => u.is_admin).length}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{users.filter(u => u.is_premium).length}</Text>
          <Text style={styles.statLabel}>Premium</Text>
        </View>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher un membre..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={item => item.id?.toString() || item.email}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyText}>Aucun utilisateur trouvé</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    marginTop: 15,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    paddingTop: 60,
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statItem: {
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
  searchContainer: {
    padding: 15,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  list: {
    padding: 15,
    paddingTop: 0,
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
  userInfo: {
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  badge: {
    marginRight: 6,
  },
  adminBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  premiumBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  userDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    marginRight: 10,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  viewProfileButton: {
    backgroundColor: '#e0e7ff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  viewProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4338ca',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  actionItem: {
    marginRight: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  adminButton: {
    backgroundColor: '#fef3c7',
  },
  premiumButton: {
    backgroundColor: '#dbeafe',
  },
  removeButton: {
    backgroundColor: '#fee2e2',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    flex: 0,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  currentUserLabel: {
    alignItems: 'center',
    paddingTop: 8,
  },
  currentUserText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});
