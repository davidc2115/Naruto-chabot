import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import ChatsScreen from './src/screens/ChatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CharacterDetailScreen from './src/screens/CharacterDetailScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import CreateCharacterScreen from './src/screens/CreateCharacterScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import CharacterCarouselScreen from './src/screens/CharacterCarouselScreen';
import LoginScreen from './src/screens/LoginScreen';
import MyCharactersScreen from './src/screens/MyCharactersScreen';
import AuthService from './src/services/AuthService';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Personnages',
          tabBarIcon: ({ color }) => <TabIcon name="👥" color={color} />,
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
          tabBarLabel: 'Mes Créations',
          tabBarIcon: ({ color }) => <TabIcon name="✨" color={color} />,
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Paramètres',
          tabBarIcon: ({ color }) => <TabIcon name="⚙️" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function TabIcon({ name, color }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 24, color }}>{name}</Text>;
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Vérifier si l'utilisateur est déjà connecté
      const isLoggedIn = await AuthService.init();
      if (isLoggedIn) {
        setUser(AuthService.getCurrentUser());
      }
      // Ne pas forcer la connexion, laisser l'utilisateur accéder à l'app
      setShowLogin(false);
    } catch (error) {
      console.error('Erreur auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setShowLogin(false);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator>
        {showLogin ? (
          <Stack.Screen 
            name="Login" 
            options={{ headerShown: false }}
          >
            {props => <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen 
              name="MainTabs" 
              component={HomeTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Login" 
              options={{ 
                title: 'Connexion',
                headerStyle: { backgroundColor: '#6366f1' },
                headerTintColor: '#fff',
              }}
            >
              {props => <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />}
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
