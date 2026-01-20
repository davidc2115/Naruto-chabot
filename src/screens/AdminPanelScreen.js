import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import AuthService from '../services/AuthService';

const FREEBOX_URL = 'http://88.174.155.230:33437';
const ADMIN_EMAIL = 'douvdouv21@gmail.com'; // Email admin principal

/**
 * v5.4.4 - AdminPanelScreen CORRIGÉ
 * - Vérification email admin directe (pas seulement is_admin)
 * - Chargement robuste avec retry automatique
 * - Messages d'erreur détaillés
 */
export default function AdminPanelScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');
  const [debugInfo, setDebugInfo] = useState('');
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  // Vérifier si l'utilisateur actuel est admin (email OU is_admin)
  const checkIsAdmin = useCallback(() => {
    const user = AuthService.getCurrentUser();
    const email = (user?.email || '').toLowerCase();
    const isAdminFlag = user?.is_admin === true;
    const isAdminEmail = email === ADMIN_EMAIL.toLowerCase();
    return isAdminFlag || isAdminEmail;
  }, []);

  // Charger les utilisateurs
  const loadUsers = useCallback(async (showLoading = true) => {
    // Éviter les appels multiples simultanés
    if (loadingRef.current) {
      console.log('⏳ Chargement déjà en cours, ignoré');
      return;
    }
    
    loadingRef.current = true;
    
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    setServerStatus('checking');
    
    const user = AuthService.getCurrentUser();
    const adminEmail = user?.email || '';
    const isAdmin = checkIsAdmin();
    
    const debug = `Email: ${adminEmail}\nisAdmin: ${isAdmin}\nis_admin flag: ${user?.is_admin}`;
    setDebugInfo(debug);
    console.log('🔐 Debug Admin:', debug);
    
    try {
      console.log(`🔗 Appel /admin/users avec email: ${adminEmail}`);
      
      const response = await fetch(`${FREEBOX_URL}/admin/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Email': adminEmail,
        },
      });
      
      console.log(`📥 Réponse: status ${response.status}`);
      
      const data = await response.json();
      
      if (!mountedRef.current) return;
      
      if (response.ok && data.success !== false) {
        const usersData = Array.isArray(data) ? data : (data.users || []);
        setUsers(usersData);
        setServerStatus('online');
        setError(null);
        console.log(`✅ ${usersData.length} utilisateurs chargés`);
      } else {
        // Erreur du serveur
        const errorMsg = data.error || data.message || `Erreur ${response.status}`;
        console.log(`❌ Erreur: ${errorMsg}`);
        
        setServerStatus('online');
        
        if (response.status === 403 || errorMsg.includes('admin')) {
          setError(`Accès refusé.\n\nVotre email: ${adminEmail}\n\nPour accéder au panel admin, connectez-vous avec:\n${ADMIN_EMAIL}`);
        } else {
          setError(errorMsg);
        }
      }
    } catch (err) {
      console.log(`❌ Erreur réseau: ${err.message}`);
      if (mountedRef.current) {
        setServerStatus('offline');
        setError(`Impossible de contacter le serveur.\n\n${err.message}`);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
      loadingRef.current = false;
    }
  }, [checkIsAdmin]);

  // Effet de montage
  useEffect(() => {
    mountedRef.current = true;
    console.log('🚀 AdminPanelScreen v5.4.4: Montage');
    
    // Petit délai pour s'assurer que tout est prêt
    const timer = setTimeout(() => {
      loadUsers();
    }, 100);
    
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, []);

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers(false);
  }, [loadUsers]);

  // Actions admin
  const toggleAdminStatus = useCallback(async (userId, currentStatus, email) => {
    if (!userId) {
      Alert.alert('Erreur', 'ID utilisateur manquant');
      return;
    }
    
    Alert.alert(
      '👑 Modifier Admin',
      `${currentStatus ? 'Retirer' : 'Donner'} les droits admin à ${email} ?`,
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
                Alert.alert('✅ Succès', 'Droits modifiés');
                loadUsers(false);
              } else {
                Alert.alert('❌ Erreur', 'Impossible de modifier');
              }
            } catch (e) {
              Alert.alert('❌ Erreur', e.message);
            }
          }
        }
      ]
    );
  }, [loadUsers]);

  const togglePremiumStatus = useCallback(async (userId, currentStatus, email) => {
    if (!userId) {
      Alert.alert('Erreur', 'ID utilisateur manquant');
      return;
    }
    
    Alert.alert(
      '⭐ Modifier Premium',
      `${currentStatus ? 'Retirer' : 'Donner'} le premium à ${email} ?`,
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
                Alert.alert('✅ Succès', 'Premium modifié');
                loadUsers(false);
              } else {
                Alert.alert('❌ Erreur', 'Impossible de modifier');
              }
            } catch (e) {
              Alert.alert('❌ Erreur', e.message);
            }
          }
        }
      ]
    );
  }, [loadUsers]);

  const deleteUser = useCallback(async (userId, email) => {
    if (!userId) {
      Alert.alert('Erreur', 'ID utilisateur manquant');
      return;
    }
    
    Alert.alert(
      '🗑️ Supprimer',
      `Supprimer ${email} ? Action IRRÉVERSIBLE.`,
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
                loadUsers(false);
              } else {
                Alert.alert('❌ Erreur', 'Impossible de supprimer');
              }
            } catch (e) {
              Alert.alert('❌ Erreur', e.message);
            }
          }
        }
      ]
    );
  }, [loadUsers]);

  // v5.4.21 - État pour les personnages d'un utilisateur
  const [selectedUser, setSelectedUser] = useState(null);
  const [userCharacters, setUserCharacters] = useState([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);

  const viewUserProfile = useCallback((user) => {
    const profile = user.full_profile || user.profile || {};
    const username = profile.username || user.username || 'N/A';
    const age = profile.age || user.age || 'N/A';
    const gender = profile.gender || user.gender || 'N/A';
    
    let details = `📧 ${user.email}\n👤 ${username}\n🎂 ${age} ans\n⚧️ ${gender}\n\n`;
    details += `👑 Admin: ${user.is_admin ? 'Oui' : 'Non'}\n`;
    details += `⭐ Premium: ${user.is_premium ? 'Oui' : 'Non'}\n`;
    details += `🔞 NSFW: ${profile.nsfwMode ? 'Oui' : 'Non'}\n`;
    details += `\n🆔 ${user.id}`;

    Alert.alert(
      `👤 ${username}`, 
      details,
      [
        { text: 'Fermer', style: 'cancel' },
        { 
          text: '📚 Voir personnages', 
          onPress: () => loadUserCharacters(user)
        }
      ]
    );
  }, []);

  // v5.4.21 - Charger les personnages créés par un utilisateur
  const loadUserCharacters = useCallback(async (user) => {
    setSelectedUser(user);
    setLoadingCharacters(true);
    setUserCharacters([]);
    
    try {
      const response = await fetch(`${FREEBOX_URL}/api/characters/user/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Email': AuthService.getCurrentUser()?.email || ''
        },
        timeout: 10000
      });
      
      if (response.ok) {
        const data = await response.json();
        const chars = data.characters || data || [];
        setUserCharacters(Array.isArray(chars) ? chars : []);
        console.log(`📚 ${chars.length} personnages trouvés pour ${user.email}`);
      } else {
        // Essayer de récupérer depuis les personnages publics
        const publicResponse = await fetch(`${FREEBOX_URL}/api/characters/public`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        
        if (publicResponse.ok) {
          const publicData = await publicResponse.json();
          const allPublic = publicData.characters || publicData || [];
          // Filtrer par créateur
          const userChars = allPublic.filter(c => 
            c.createdBy === user.id || 
            c.createdByEmail === user.email
          );
          setUserCharacters(userChars);
          console.log(`📚 ${userChars.length} personnages publics trouvés pour ${user.email}`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement personnages:', error);
      Alert.alert('Erreur', 'Impossible de charger les personnages de cet utilisateur');
    } finally {
      setLoadingCharacters(false);
    }
  }, []);

  // v5.4.21 - Ajouter un personnage à l'application de façon permanente
  const addCharacterToApp = useCallback(async (character) => {
    Alert.alert(
      '➕ Ajouter à l\'application',
      `Voulez-vous ajouter "${character.name}" de façon permanente à l'application?\n\nUne copie sera créée et ne pourra plus être supprimée par l'utilisateur original.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Ajouter',
          onPress: async () => {
            try {
              // Créer une copie du personnage avec un nouvel ID
              const permanentCharacter = {
                ...character,
                id: `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                originalId: character.id,
                originalCreator: character.createdBy,
                originalCreatorEmail: character.createdByEmail,
                isPermanent: true,
                isCustom: false, // Le marquer comme personnage intégré
                addedToAppAt: Date.now(),
                addedByAdmin: AuthService.getCurrentUser()?.email,
              };
              
              // Sauvegarder sur le serveur comme personnage permanent
              const response = await fetch(`${FREEBOX_URL}/api/characters/permanent`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Admin-Email': AuthService.getCurrentUser()?.email || ''
                },
                body: JSON.stringify({ character: permanentCharacter })
              });
              
              if (response.ok) {
                Alert.alert('✅ Succès', `"${character.name}" a été ajouté à l'application de façon permanente.`);
              } else {
                // Sauvegarder localement comme fallback
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                const key = 'permanent_characters';
                const existing = await AsyncStorage.getItem(key);
                const chars = existing ? JSON.parse(existing) : [];
                chars.push(permanentCharacter);
                await AsyncStorage.setItem(key, JSON.stringify(chars));
                Alert.alert('✅ Succès', `"${character.name}" a été ajouté localement. Il sera synchronisé plus tard.`);
              }
            } catch (error) {
              console.error('❌ Erreur ajout personnage:', error);
              Alert.alert('Erreur', 'Impossible d\'ajouter ce personnage');
            }
          }
        }
      ]
    );
  }, []);

  // v5.4.21 - Voir les détails d'un personnage
  const viewCharacterDetails = useCallback((character) => {
    let details = `📛 ${character.name}\n`;
    details += `🎂 ${character.age || '?'} ans\n`;
    details += `⚧️ ${character.gender === 'female' ? 'Femme' : character.gender === 'male' ? 'Homme' : 'Non-binaire'}\n`;
    if (character.tags && character.tags.length > 0) {
      details += `🏷️ ${character.tags.join(', ')}\n`;
    }
    details += `\n📖 ${(character.scenario || character.description || 'Pas de scénario').substring(0, 100)}...\n`;
    details += `\n✨ ${(character.physicalDescription || character.appearance || 'Pas de description').substring(0, 100)}...`;
    
    Alert.alert(
      `👤 ${character.name}`,
      details,
      [
        { text: 'Fermer', style: 'cancel' },
        { text: '➕ Ajouter à l\'app', onPress: () => addCharacterToApp(character) }
      ]
    );
  }, [addCharacterToApp]);

  // Filtrer les utilisateurs
  const filteredUsers = users.filter(user => 
    (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (user.username?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Rendu d'un utilisateur
  const renderUser = useCallback(({ item }) => {
    const isCurrentUser = item.email === AuthService.getCurrentUser()?.email;
    const username = item.username || item.email?.split('@')[0] || 'Sans nom';
    
    return (
      <View style={[styles.userCard, isCurrentUser && styles.currentUserCard]}>
        <View style={styles.userHeader}>
          <Text style={styles.userName} numberOfLines={1}>{username}</Text>
          <View style={styles.badges}>
            {item.is_admin && <View style={styles.adminBadge}><Text style={styles.badgeText}>👑</Text></View>}
            {item.is_premium && <View style={styles.premiumBadge}><Text style={styles.badgeText}>⭐</Text></View>}
          </View>
        </View>
        
        <Text style={styles.userEmail}>{item.email}</Text>
        
        <TouchableOpacity style={styles.profileBtn} onPress={() => viewUserProfile(item)}>
          <Text style={styles.profileBtnText}>👁️ Profil</Text>
        </TouchableOpacity>
        
        {!isCurrentUser && (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionBtn, item.is_admin ? styles.removeBtn : styles.addBtn]}
              onPress={() => toggleAdminStatus(item.id, item.is_admin, item.email)}
            >
              <Text style={styles.actionText}>{item.is_admin ? '➖👑' : '➕👑'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, item.is_premium ? styles.removeBtn : styles.addBtn]}
              onPress={() => togglePremiumStatus(item.id, item.is_premium, item.email)}
            >
              <Text style={styles.actionText}>{item.is_premium ? '➖⭐' : '➕⭐'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => deleteUser(item.id, item.email)}
            >
              <Text style={styles.actionText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {isCurrentUser && (
          <Text style={styles.youLabel}>👤 C'est vous</Text>
        )}
      </View>
    );
  }, [toggleAdminStatus, togglePremiumStatus, deleteUser, viewUserProfile]);

  // === RENDU ===
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>👑 Admin Panel</Text>
        <Text style={styles.version}>v5.4.21</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, 
            serverStatus === 'online' ? styles.online : 
            serverStatus === 'offline' ? styles.offline : styles.checking
          ]} />
          <Text style={styles.statusText}>
            {serverStatus === 'online' ? 'Connecté' : 
             serverStatus === 'offline' ? 'Hors ligne' : 'Vérification...'}
          </Text>
        </View>
      </View>
      
      {/* Contenu */}
      <View style={styles.content}>
        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{users.length}</Text>
            <Text style={styles.statLabel}>Membres</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{users.filter(u => u.is_admin).length}</Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{users.filter(u => u.is_premium).length}</Text>
            <Text style={styles.statLabel}>Premium</Text>
          </View>
        </View>
        
        {/* Recherche */}
        <TextInput
          style={styles.search}
          placeholder="🔍 Rechercher..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        
        {/* Contenu principal */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadUsers()}>
              <Text style={styles.retryText}>🔄 Réessayer</Text>
            </TouchableOpacity>
            {__DEV__ && debugInfo && (
              <Text style={styles.debugText}>{debugInfo}</Text>
            )}
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Aucun résultat' : 'Aucun utilisateur'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadUsers()}>
              <Text style={styles.retryText}>🔄 Recharger</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            renderItem={renderUser}
            keyExtractor={item => item.id || item.email || Math.random().toString()}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#6366f1']}
              />
            }
          />
        )}
      </View>
      
      {/* v5.4.21 - Modal pour les personnages de l'utilisateur */}
      <Modal
        visible={selectedUser !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                📚 Personnages de {selectedUser?.username || selectedUser?.email?.split('@')[0] || 'Utilisateur'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {loadingCharacters ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Chargement des personnages...</Text>
              </View>
            ) : userCharacters.length === 0 ? (
              <View style={styles.noCharacters}>
                <Text style={styles.noCharsIcon}>🎭</Text>
                <Text style={styles.noCharsText}>Aucun personnage créé</Text>
              </View>
            ) : (
              <ScrollView style={styles.charactersList}>
                {userCharacters.map((char, index) => (
                  <TouchableOpacity 
                    key={char.id || index}
                    style={styles.characterCard}
                    onPress={() => viewCharacterDetails(char)}
                  >
                    <View style={styles.charRow}>
                      {char.imageUrl ? (
                        <Image 
                          source={{ uri: char.imageUrl }} 
                          style={styles.charImage}
                          defaultSource={require('../../assets/adaptive-icon.png')}
                        />
                      ) : (
                        <View style={styles.charImagePlaceholder}>
                          <Text style={styles.charImagePlaceholderText}>
                            {(char.name || '?')[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.charInfo}>
                        <Text style={styles.charName}>{char.name || 'Sans nom'}</Text>
                        <Text style={styles.charMeta}>
                          {char.age || '?'} ans • {char.gender === 'female' ? '♀' : char.gender === 'male' ? '♂' : '⚧'}
                        </Text>
                        {char.tags && char.tags.length > 0 && (
                          <Text style={styles.charTags} numberOfLines={1}>
                            🏷️ {char.tags.slice(0, 3).join(', ')}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity 
                        style={styles.addToAppBtn}
                        onPress={() => addCharacterToApp(char)}
                      >
                        <Text style={styles.addToAppBtnText}>➕</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            
            <TouchableOpacity 
              style={styles.closeModalBtn}
              onPress={() => setSelectedUser(null)}
            >
              <Text style={styles.closeModalBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6366f1',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 15 : 55,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  version: {
    fontSize: 12,
    color: '#c7d2fe',
    marginTop: 2,
  },
  statusRow: {
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
  online: { backgroundColor: '#10b981' },
  offline: { backgroundColor: '#ef4444' },
  checking: { backgroundColor: '#f59e0b' },
  statusText: {
    fontSize: 12,
    color: '#e0e7ff',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
  },
  search: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    color: '#333',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: '#666',
  },
  errorIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  debugText: {
    marginTop: 20,
    fontSize: 10,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  list: {
    padding: 15,
    paddingBottom: 30,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  currentUserCard: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  adminBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  profileBtn: {
    backgroundColor: '#e0e7ff',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  profileBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338ca',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtn: {
    backgroundColor: '#e0f2fe',
  },
  removeBtn: {
    backgroundColor: '#fee2e2',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    flex: 0,
    paddingHorizontal: 15,
  },
  actionText: {
    fontSize: 14,
  },
  youLabel: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  // v5.4.21 - Styles pour le modal des personnages
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeBtn: {
    fontSize: 24,
    color: '#9ca3af',
    padding: 5,
  },
  modalLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 15,
    color: '#6366f1',
    fontSize: 14,
  },
  noCharacters: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  noCharsIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  noCharsText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  charactersList: {
    maxHeight: 400,
  },
  characterCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  charRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  charImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  charImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  charImagePlaceholderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  charInfo: {
    flex: 1,
  },
  charName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  charMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  charTags: {
    fontSize: 11,
    color: '#9ca3af',
  },
  addToAppBtn: {
    backgroundColor: '#10b981',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToAppBtnText: {
    fontSize: 16,
    color: '#fff',
  },
  closeModalBtn: {
    backgroundColor: '#6366f1',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  closeModalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
