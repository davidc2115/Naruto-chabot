import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, StyleSheet, Linking, TouchableOpacity, Alert } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import ChatsScreen from './src/screens/ChatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import GestionScreen from './src/screens/GestionScreen';
import UserSettingsScreen from './src/screens/UserSettingsScreen';
import CharacterDetailScreen from './src/screens/CharacterDetailScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import CreateCharacterScreen from './src/screens/CreateCharacterScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import CharacterCarouselScreen from './src/screens/CharacterCarouselScreen';
import MyCharactersScreen from './src/screens/MyCharactersScreen';
import PayPalConfigScreen from './src/screens/PayPalConfigScreen';
import PremiumScreen from './src/screens/PremiumScreen';
import PremiumChatScreen from './src/screens/PremiumChatScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const DISCORD_INVITE_URL = 'https://discord.gg/W52qQtNqFt';

function DiscordScreen() {
  const [opening, setOpening] = useState(false);

  const openDiscord = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const discordAppUrl = 'discord://discord.gg/W52qQtNqFt';
      const canOpenApp = await Linking.canOpenURL(discordAppUrl).catch(() => false);
      if (canOpenApp) {
        await Linking.openURL(discordAppUrl);
      } else {
        await Linking.openURL(DISCORD_INVITE_URL);
      }
    } catch (error) {
      try {
        await Linking.openURL(DISCORD_INVITE_URL);
      } catch (e) {
        Alert.alert(
          'Discord',
          `Copiez ce lien dans votre navigateur:\n\n${DISCORD_INVITE_URL}`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setOpening(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      openDiscord();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={discordStyles.container}>
      <Text style={discordStyles.icon}>🎮</Text>
      <Text style={discordStyles.title}>Serveur Discord</Text>
      <Text style={discordStyles.subtitle}>Rejoignez notre communauté !</Text>
      <TouchableOpacity
        style={[discordStyles.button, opening && { opacity: 0.7 }]}
        onPress={openDiscord}
        disabled={opening}
      >
        <Text style={discordStyles.buttonText}>
          {opening ? 'Ouverture...' : 'Ouvrir Discord'}
        </Text>
      </TouchableOpacity>
      <Text style={discordStyles.link}>{DISCORD_INVITE_URL}</Text>
      <Text style={discordStyles.hint}>
        Si Discord ne s'ouvre pas, copiez le lien ci-dessus
      </Text>
    </View>
  );
}

const discordStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a12',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#C9A227',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#D4AF37',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#5865F2',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 15,
  },
  hint: {
    color: '#9ca3af',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

function TabIcon({ name, color }) {
  return <Text style={{ fontSize: 24, color }}>{name}</Text>;
}

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#C9A227',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#12121f',
          borderTopColor: '#C9A227',
          borderTopWidth: 1,
          shadowColor: '#8B0000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        headerShown: false,
      }}
    >
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
      <Tab.Screen
        name="Discord"
        component={DiscordScreen}
        options={{
          tabBarLabel: 'Discord',
          tabBarIcon: ({ color }) => <TabIcon name="🎮" color={color} />,
        }}
      />
      <Tab.Screen
        name="Gestion"
        component={GestionScreen}
        options={{
          tabBarLabel: 'Gestion',
          tabBarIcon: ({ color }) => <TabIcon name="⚙️" color={color} />,
        }}
      />
      <Tab.Screen
        name="UserSettings"
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color }) => <TabIcon name="👤" color={color} />,
        }}
      >
        {props => <UserSettingsScreen {...props} onLogout={() => {}} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingEmoji}>💋</Text>
        <Text style={styles.loadingTitle}>Boys & Girls</Text>
        <ActivityIndicator size="large" color="#C9A227" style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator>
        <Stack.Screen
          name="MainTabs"
          component={HomeTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CharacterCarousel"
          component={CharacterCarouselScreen}
          options={{
            title: 'Découvrir',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="UserProfile"
          component={UserProfileScreen}
          options={{
            title: 'Mon Profil',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
          }}
        />
        <Stack.Screen
          name="CharacterDetail"
          component={CharacterDetailScreen}
          options={{
            title: 'Détails du personnage',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
          }}
        />
        <Stack.Screen
          name="CreateCharacter"
          component={CreateCharacterScreen}
          options={{
            title: 'Créer un personnage',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
          }}
        />
        <Stack.Screen
          name="Gallery"
          component={GalleryScreen}
          options={{
            title: 'Galerie',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
          }}
        />
        <Stack.Screen
          name="Conversation"
          component={ConversationScreen}
          options={{
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
          }}
        />
        <Stack.Screen
          name="PayPalConfig"
          component={PayPalConfigScreen}
          options={{
            title: 'Configuration PayPal',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
          }}
        />
        <Stack.Screen
          name="Premium"
          component={PremiumScreen}
          options={{
            title: 'Premium',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
          }}
        />
        <Stack.Screen
          name="PremiumChat"
          component={PremiumChatScreen}
          options={{
            title: 'Chat Premium',
            headerStyle: { backgroundColor: '#12121f' },
            headerTintColor: '#C9A227',
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
    backgroundColor: '#0a0a12',
  },
  loadingEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#C9A227',
    textShadowColor: '#8B6914',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 12,
    letterSpacing: 4,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#D4AF37',
    fontWeight: '600',
  },
});
