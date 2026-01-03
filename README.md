# 🎭 Roleplay Chat App

Application mobile Android de roleplay conversationnel avec 200 personnages uniques, système de relation dynamique et génération d'images.

## ✨ Fonctionnalités

### 🎯 Personnages
- **200 personnages uniques** avec des backgrounds, personnalités et tempéraments variés
- Hommes, femmes et personnages non-binaires
- Professions et scénarios diversifiés
- Apparences physiques détaillées

### 💬 Système de Roleplay
- **Format RP immersif** : actions entre astérisques, dialogues entre guillemets
- Messages de départ uniques pour chaque personnage
- Réponses contextuelles basées sur le tempérament du personnage
- Interface de chat intuitive avec formatage RP

### 💖 Système de Relation
- **Expérience (XP)** : gagnez de l'XP à chaque interaction
- **Niveaux** : progression de 1 à 20+
- **Affection** : jauge de 0 à 100%
- **Confiance** : jauge de 0 à 100%
- Évolution dynamique basée sur vos interactions

### 🤖 Génération IA
- **Multi-clés Groq** avec rotation automatique
- Génération de texte quasi-illimitée
- Modèle Mixtral-8x7b haute qualité
- Gestion intelligente des erreurs et retry

### 🎨 Génération d'Images
- **Pollinations.ai** - gratuit et illimité
- Styles variés : photoréaliste, animé, digital art, etc.
- Génération d'images de personnages
- Génération contextuelle basée sur la conversation

### 💾 Sauvegarde
- Conversations sauvegardées automatiquement
- Reprise de conversation à tout moment
- Historique complet des discussions
- Relations persistantes

## 📱 Captures d'écran

L'application comprend :
- **Page d'accueil** : liste de tous les personnages avec recherche et filtres
- **Page conversations** : historique de tous vos chats
- **Page paramètres** : gestion des clés API et configuration
- **Page détails** : informations complètes sur un personnage + stats de relation
- **Page conversation** : chat interactif avec système RP et génération d'images

## 🚀 Installation

### Prérequis

- Node.js 18+ installé
- npm ou yarn
- Expo Go app sur votre smartphone Android
- Clé(s) API Groq (gratuit sur console.groq.com)

### Installation des dépendances

```bash
npm install
```

### Lancement de l'application

```bash
npm start
```

Scannez le QR code avec l'application Expo Go sur votre smartphone.

## 🔑 Configuration des clés API

### Obtenir des clés Groq (gratuit)

1. Allez sur [console.groq.com](https://console.groq.com)
2. Créez un compte gratuit
3. Accédez à la section "API Keys"
4. Générez une nouvelle clé API
5. Répétez pour créer plusieurs clés (recommandé)

### Ajouter les clés dans l'app

1. Ouvrez l'application
2. Allez dans l'onglet "Paramètres" (⚙️)
3. Collez vos clés API Groq
4. Cliquez sur "Sauvegarder"
5. Testez avec le bouton "Tester"

**💡 Astuce** : Ajoutez plusieurs clés pour bénéficier de la rotation automatique et de capacités quasi-illimitées !

## 📦 Build APK pour Android

### Méthode 1 : GitHub Actions (recommandé - automatique) 🚀

**Le plus simple ! Build automatique dans le cloud.**

#### Configuration rapide (5 minutes):

1. **Créez un token Expo** (gratuit)
   - https://expo.dev → Compte → Access Tokens → Create

2. **Ajoutez le token sur GitHub**
   - Repo → Settings → Secrets → New secret
   - Name: `EXPO_TOKEN`
   - Value: [votre token]

3. **Lancez le build**
   - GitHub → Actions → "Build APK (Simple)" → Run workflow
   - Version: 1.0.0 → Run

4. **Récupérez l'APK** (après ~20 min)
   - Releases → Téléchargez l'APK

📖 **Guide détaillé**: [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)  
⚡ **Guide rapide**: [QUICK_BUILD_GUIDE.md](QUICK_BUILD_GUIDE.md)

---

### Méthode 2 : EAS Build manuel

```bash
# Installer EAS CLI
npm install -g eas-cli

# Se connecter à Expo
eas login

# Configurer le projet
eas build:configure

# Builder l'APK
eas build --platform android --profile preview
```

L'APK sera téléchargeable depuis votre compte Expo.

### Méthode 3 : Build local

```bash
# Installer les outils Android
# Suivre : https://docs.expo.dev/build-reference/local-builds/

# Builder localement
eas build --platform android --local
```

## 🎮 Guide d'utilisation

### Démarrer une conversation

1. Sur la page d'accueil, parcourez les 200 personnages
2. Utilisez la recherche ou les filtres (Tous / Femmes / Hommes / NB)
3. Cliquez sur un personnage pour voir ses détails
4. Consultez son apparence, personnalité, scénario
5. Cliquez sur "Commencer la conversation"

### Converser en RP

Format recommandé pour vos messages :
```
*J'entre dans le café et remarque Emma* "Bonjour ! Belle journée n'est-ce pas ?"
```

Le personnage répondra dans le même format :
```
*Emma lève les yeux de son ordinateur et sourit* "Oh, bonjour ! Oui, magnifique." *Elle ferme son laptop* "Vous êtes nouveau ici ?"
```

### Générer des images

- Pendant une conversation, cliquez sur le bouton 🎨
- L'image sera générée en fonction du contexte actuel
- Les images sont variées : photoréaliste, animé, etc.

### Suivre votre relation

- La barre en haut de la conversation montre :
  - **Niveau** : progression globale
  - **💖 Affection** : affection du personnage envers vous
  - **🤝 Confiance** : niveau de confiance
- Ces stats évoluent selon vos interactions

## 🛠️ Technologies utilisées

- **React Native** avec Expo
- **React Navigation** pour la navigation
- **AsyncStorage** pour le stockage local
- **Groq API** pour la génération de texte IA
- **Pollinations.ai** pour la génération d'images
- **Axios** pour les requêtes HTTP

## 📁 Structure du projet

```
/workspace
├── App.js                          # Point d'entrée de l'app
├── app.json                        # Configuration Expo
├── package.json                    # Dépendances
├── babel.config.js                 # Configuration Babel
└── src/
    ├── screens/                    # Écrans de l'application
    │   ├── HomeScreen.js          # Page d'accueil (liste personnages)
    │   ├── ChatsScreen.js         # Historique des conversations
    │   ├── SettingsScreen.js      # Paramètres et clés API
    │   ├── CharacterDetailScreen.js  # Détails d'un personnage
    │   └── ConversationScreen.js  # Chat avec système RP
    ├── services/                   # Services et logique métier
    │   ├── GroqService.js         # Gestion API Groq + rotation
    │   ├── ImageGenerationService.js  # Génération d'images
    │   └── StorageService.js      # Stockage et relations
    └── data/
        └── characters.js          # Base de 200 personnages
```

## 🎨 Personnalisation

### Ajouter des personnages

Éditez `src/data/characters.js` et ajoutez un nouvel objet :

```javascript
{
  id: 201,
  name: "Nom Prénom",
  age: 25,
  gender: "female", // ou "male" ou "non-binary"
  hairColor: "brune",
  appearance: "Description physique détaillée...",
  personality: "Traits de personnalité...",
  temperament: "romantique", // romantique, timide, direct, flirt, taquin, coquin, mystérieux, dominant
  tags: ["tag1", "tag2", "tag3"],
  scenario: "Contexte et situation de départ...",
  startMessage: "*Action initiale* \"Dialogue initial\""
}
```

### Modifier le modèle IA

Dans `src/services/GroqService.js`, ligne 15 :

```javascript
this.model = 'mixtral-8x7b-32768'; // Changez ici
```

Modèles disponibles : `mixtral-8x7b-32768`, `llama-3.1-70b-versatile`, `llama-3.1-8b-instant`

## 🐛 Dépannage

### "Aucune clé API configurée"
- Allez dans Paramètres et ajoutez au moins une clé Groq
- Vérifiez que la clé est valide avec le bouton "Tester"

### "Échec de génération après plusieurs tentatives"
- Vérifiez votre connexion internet
- Vérifiez que vos clés API sont valides
- Ajoutez plus de clés pour une meilleure redondance

### L'image ne se génère pas
- Vérifiez votre connexion internet
- Pollinations.ai est gratuit mais peut être lent parfois
- Réessayez après quelques secondes

### L'app ne démarre pas
```bash
# Nettoyer le cache
npm start -- --clear

# Réinstaller les dépendances
rm -rf node_modules
npm install
```

## 📄 Licence

Ce projet est libre d'utilisation pour un usage personnel.

## 🤝 Contribution

Les suggestions et améliorations sont les bienvenues !

## 📧 Support

Pour toute question ou problème, consultez :
- [Documentation Expo](https://docs.expo.dev/)
- [Documentation Groq](https://console.groq.com/docs)
- [Documentation React Native](https://reactnative.dev/)

## 🌟 Fonctionnalités futures possibles

- [ ] Personnalisation de l'apparence de l'app (thèmes)
- [ ] Système de favoris
- [ ] Partage de conversations
- [ ] Création de personnages personnalisés
- [ ] Support de plus de modèles IA
- [ ] Génération vocale (TTS)
- [ ] Mode hors ligne
- [ ] Statistiques détaillées
- [ ] Achievements/trophées

---

**Amusez-vous bien avec vos 200 personnages ! 🎭✨**
