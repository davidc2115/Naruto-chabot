import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import ChatsScreen from './src/screens/ChatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import UserSettingsScreen from './src/screens/UserSettingsScreen';
import CharacterDetailScreen from './src/screens/CharacterDetailScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import CreateCharacterScreen from './src/screens/CreateCharacterScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import CharacterCarouselScreen from './src/screens/CharacterCarouselScreen';
import LoginScreen from './src/screens/LoginScreen';
import MyCharactersScreen from './src/screens/MyCharactersScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';
import PayPalConfigScreen from './src/screens/PayPalConfigScreen';
import PremiumScreen from './src/screens/PremiumScreen';
import PremiumChatScreen from './src/screens/PremiumChatScreen';
import AuthService from './src/services/AuthService';
import SyncService from './src/services/SyncService';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs({ isAdmin, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
      }}
    >
      {/* Mode Découverte comme écran principal */}
      <Tab.Screen 
        name="Discover" 
        component={CharacterCarouselScreen}
        options={{
          tabBarLabel: 'Découvrir',
          tabBarIcon: ({ color }) => <TabIcon name="❤️" color={color} />,
        }}
      />
      <Tab.Screen 
        name="Chats" 
        component={ChatsScreen}
        options={{
          tabBarLabel: 'Conversations',
          tabBarIcon: ({ color }) => <TabIcon name="💬" color={color} />,
        }}
      />
      <Tab.Screen 
        name="MyCharacters" 
        component={MyCharactersScreen}
        options={{
          tabBarLabel: 'Créations',
          tabBarIcon: ({ color }) => <TabIcon name="✨" color={color} />,
        }}
      />
      {/* Onglet Admin pour gérer les membres (admin uniquement) */}
      {isAdmin && (
        <Tab.Screen 
          name="AdminPanel" 
          options={{
            tabBarLabel: 'Admin',
            tabBarIcon: ({ color }) => <TabIcon name="👑" color={color} />,
          }}
        >
          {props => <AdminPanelScreen {...props} />}
        </Tab.Screen>
      )}
      {/* Admin = SettingsScreen complet, Utilisateur = UserSettingsScreen */}
      {isAdmin ? (
        <Tab.Screen 
          name="Settings" 
          options={{
            tabBarLabel: 'Config',
            tabBarIcon: ({ color }) => <TabIcon name="⚙️" color={color} />,
          }}
        >
          {props => <SettingsScreen {...props} onLogout={onLogout} />}
        </Tab.Screen>
      ) : (
        <Tab.Screen 
          name="UserSettings" 
          options={{
            tabBarLabel: 'Profil',
            tabBarIcon: ({ color }) => <TabIcon name="👤" color={color} />,
          }}
        >
          {props => <UserSettingsScreen {...props} onLogout={onLogout} />}
        </Tab.Screen>
      )}
    </Tab.Navigator>
  );
}

function TabIcon({ name, color }) {
  return <Text style={{ fontSize: 24, color }}>{name}</Text>;
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState('loading'); // 'loading', 'login', 'profile_setup', 'ready'
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Vérifier si l'utilisateur est déjà connecté
      const isLoggedIn = await AuthService.init();
      
      if (isLoggedIn) {
        const currentUser = AuthService.getCurrentUser();
        setUser(currentUser);
        setIsAdmin(AuthService.isAdmin());
        
        // Vérifier si le profil est complété
        if (!AuthService.isProfileCompleted()) {
          setAuthState('profile_setup');
        } else {
          setAuthState('ready');
          // Démarrer la sync auto des personnages publics
          startBackgroundSync();
        }
      } else {
        // Pas connecté, forcer la connexion
        setAuthState('login');
      }
    } catch (error) {
      console.error('Erreur auth:', error);
      setAuthState('login');
    } finally {
      setIsLoading(false);
    }
  };

  const startBackgroundSync = async () => {
    try {
      await SyncService.init();
      // Sync auto toutes les 10 minutes
      SyncService.startAutoSync(10);
    } catch (error) {
      console.error('Erreur démarrage sync:', error);
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAdmin(AuthService.isAdmin());
    
    // Vérifier si le profil est complété
    if (!userData.profile_completed) {
      setAuthState('profile_setup');
    } else {
      setAuthState('ready');
      startBackgroundSync();
    }
  };

  const handleProfileComplete = (userData) => {
    setUser(userData);
    setAuthState('ready');
    startBackgroundSync();
  };

  // Callback de déconnexion - appelé depuis UserSettingsScreen ou SettingsScreen
  const handleLogout = useCallback(() => {
    console.log('🚪 Déconnexion détectée, retour à l\'écran de connexion');
    SyncService.stopAutoSync();
    setUser(null);
    setIsAdmin(false);
    setAuthState('login');
  }, []);

  // Écran de chargement
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingEmoji}>💬</Text>
        <Text style={styles.loadingTitle}>Roleplay Chat</Text>
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // Écran de connexion (obligatoire)
  if (authState === 'login') {
    return (
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login">
            {props => <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} forceLogin={true} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Écran de configuration du profil (première connexion)
  if (authState === 'profile_setup') {
    return (
      <NavigationContainer>
        <StatusBar style="auto" />
        <View style={styles.profileSetupContainer}>
          <ProfileSetupScreen onComplete={handleProfileComplete} />
        </View>
      </NavigationContainer>
    );
  }

  // Application principale (utilisateur connecté et profil complété)
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator>
        <Stack.Screen 
          name="MainTabs" 
          options={{ headerShown: false }}
        >
          {props => <HomeTabs {...props} isAdmin={isAdmin} onLogout={handleLogout} />}
        </Stack.Screen>
        <Stack.Screen 
          name="CharacterCarousel" 
          component={CharacterCarouselScreen}
          options={{ 
            title: 'Découvrir',
            headerStyle: { backgroundColor: '#8b5cf6' },
            headerTintColor: '#fff',
            headerShown: true
          }}
        />
        <Stack.Screen 
          name="UserProfile" 
          component={UserProfileScreen}
          options={{ 
            title: 'Mon Profil',
            headerStyle: { backgroundColor: '#6366f1' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="CharacterDetail" 
          component={CharacterDetailScreen}
          options={{ 
            title: 'Détails du personnage',
            headerStyle: { backgroundColor: '#6366f1' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="CreateCharacter" 
          component={CreateCharacterScreen}
          options={{ 
            title: 'Créer un personnage',
            headerStyle: { backgroundColor: '#6366f1' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="Gallery" 
          component={GalleryScreen}
          options={{ 
            title: 'Galerie',
            headerStyle: { backgroundColor: '#6366f1' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="Conversation" 
          component={ConversationScreen}
          options={{ 
            headerStyle: { backgroundColor: '#6366f1' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="PayPalConfig" 
          component={PayPalConfigScreen}
          options={{ 
            title: 'Configuration PayPal',
            headerStyle: { backgroundColor: '#6366f1' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="Premium" 
          component={PremiumScreen}
          options={{ 
            title: 'Premium',
            headerStyle: { backgroundColor: '#6366f1' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen 
          name="PremiumChat" 
          component={PremiumChatScreen}
          options={{ 
            title: 'Chat Premium',
            headerStyle: { backgroundColor: '#6366f1' },
            headerTintColor: '#fff',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  profileSetupContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});
