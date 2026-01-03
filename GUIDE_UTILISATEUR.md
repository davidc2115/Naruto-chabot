# 📱 Guide Utilisateur - Roleplay Chat App

## 🚀 Installation

1. **Téléchargez l'APK**
   - Rendez-vous sur [Releases](https://github.com/davidc2115/Naruto-chabot/releases)
   - Téléchargez la dernière version `roleplay-chat.apk`

2. **Installez sur Android**
   - Transférez le fichier APK sur votre téléphone
   - Activez "Installation depuis des sources inconnues" dans les paramètres
   - Ouvrez le fichier APK et installez

## ⚙️ Configuration Initiale (IMPORTANT)

### 1️⃣ Créer votre profil utilisateur

Au premier lancement :
1. Appuyez sur l'icône **Paramètres** (⚙️) en bas
2. Dans la section **👤 Mon Profil**, appuyez sur **"Créer mon profil"**
3. Remplissez :
   - Pseudo
   - Âge (minimum 18 ans)
   - Genre
   - Attributs physiques (bonnet de poitrine ou taille selon le genre)
4. Si vous avez 18 ans ou plus, vous pouvez activer le **Mode NSFW** (optionnel)
5. Appuyez sur **"Sauvegarder"**

### 2️⃣ Configurer les clés API Groq (OBLIGATOIRE)

**SANS CLÉ API, L'APP NE PEUT PAS GÉNÉRER DE TEXTE !**

#### Comment obtenir une clé Groq gratuite :

1. Allez sur [console.groq.com](https://console.groq.com)
2. Créez un compte gratuit (Google/GitHub)
3. Cliquez sur **"API Keys"** dans le menu
4. Cliquez sur **"Create API Key"**
5. Copiez la clé (commence par `gsk_...`)

#### Ajouter la clé dans l'app :

1. Dans l'app, allez dans **Paramètres** (⚙️)
2. Section **🔑 Clés API Groq**
3. Collez votre clé dans le champ de texte
4. Appuyez sur **"Ajouter"**
5. La clé apparaît dans la liste
6. Appuyez sur **"Tester toutes les clés"** pour vérifier

**💡 Astuce :** Vous pouvez ajouter jusqu'à 5 clés pour éviter les limites. L'app les utilisera en rotation automatique.

## 🎮 Utilisation

### 💬 Converser avec un personnage

1. Sur l'écran d'accueil, choisissez un personnage
2. Appuyez dessus pour voir son profil
3. Appuyez sur **"Commencer la conversation"**
4. Tapez votre message en utilisant le format RP :
   - `*actions*` pour les actions
   - `"paroles"` pour les dialogues
   - Exemple : `*Je m'approche en souriant* "Bonjour !"`

### 🎨 Générer des images

Pendant une conversation :
1. Appuyez sur l'icône **🎨** en bas à gauche
2. Une image est générée selon le contexte
3. L'image est **automatiquement sauvegardée** dans la galerie du personnage

### 🖼️ Galerie d'images

#### Accéder à la galerie :
- **Méthode 1** : Dans une conversation, appuyez sur le bouton **🖼️ X** en haut (X = nombre d'images)
- **Méthode 2** : Dans le profil du personnage, appuyez sur **"Voir tout (X) →"** dans la section Galerie

#### Utiliser une image comme fond :
1. Ouvrez la galerie du personnage
2. Appuyez sur une image en grand
3. Appuyez sur **"📷 Fond"**
4. L'image devient le fond flou de vos conversations avec ce personnage

#### Supprimer une image :
1. Ouvrez la galerie
2. Appuyez sur une image
3. Appuyez sur **"🗑️ Supprimer"**

### ✨ Créer un personnage personnalisé

1. Sur l'écran d'accueil, appuyez sur **"✨ Créer mon propre personnage"**
2. Remplissez tous les champs :
   - Nom, âge (18+ minimum)
   - Genre, couleur de cheveux
   - Apparence physique
   - Attributs anatomiques (bonnet ou taille)
   - Personnalité, tempérament
   - Scénario de départ
   - Message d'introduction
3. **Générer une image** (optionnel mais recommandé) :
   - Remplissez d'abord l'apparence, la couleur de cheveux et l'âge
   - Appuyez sur **"🎨 Générer une image"**
   - Attendez quelques secondes
   - L'image apparaît en prévisualisation
   - Elle sera automatiquement ajoutée à la galerie du personnage
4. Appuyez sur **"Sauvegarder"**

### ✏️ Modifier un personnage personnalisé

1. Ouvrez le profil d'un personnage que **vous avez créé** (identifiable par ✨)
2. Appuyez sur **"✏️ Modifier"**
3. Modifiez les champs souhaités
4. Si vous générez une nouvelle image, elle sera ajoutée à la galerie
5. Sauvegardez

### 🗑️ Supprimer un personnage personnalisé

1. Ouvrez le profil du personnage
2. Appuyez sur **"🗑️ Supprimer"**
3. Confirmez

## 📊 Système de progression

Chaque conversation développe votre relation avec le personnage :

- **Niveau** : Augmente avec l'expérience (XP)
- **Affection** : Monte si vous êtes gentil, complimentez, etc.
- **Confiance** : Augmente avec les conversations profondes

Ces stats influencent les réponses du personnage !

## 🔧 Dépannage

### "Aucune clé API configurée"
➡️ Vous n'avez pas ajouté de clé Groq. Voir section **Configuration Initiale** ci-dessus.

### "Échec de génération: mixtral-7b-32768 has been decommissioned"
➡️ Votre version de l'app est obsolète. Téléchargez la **v1.0.6** ou supérieure.

### "Génération d'images désactivée pour les personnages mineurs"
➡️ L'app bloque la génération d'images pour les personnages de moins de 18 ans. Créez un personnage adulte.

### Les images ne s'affichent pas dans la galerie
➡️ Assurez-vous d'avoir généré au moins une image pendant une conversation. Vérifiez que vous êtes sur la **v1.0.6**.

### Pas de fond de conversation visible
➡️ Vous devez d'abord définir une image comme fond depuis la galerie (appuyez sur "📷 Fond").

### Les personnages créés n'apparaissent pas
➡️ Redémarrez l'app ou retournez à l'écran d'accueil. Les personnages custom sont identifiables par l'icône ✨.

## 📝 Notes importantes

- **Âge minimum** : 18 ans pour tous les personnages et utilisateurs
- **Mode NSFW** : Disponible uniquement pour les utilisateurs majeurs
- **Stockage local** : Toutes les données sont sauvegardées sur votre appareil
- **Clés API gratuites** : Groq offre un quota gratuit généreux
- **Génération d'images** : Pollinations.ai (gratuit et illimité)

## 🆘 Support

Pour toute question ou bug :
1. Vérifiez ce guide en entier
2. Assurez-vous d'avoir la dernière version
3. Créez une issue sur [GitHub](https://github.com/davidc2115/Naruto-chabot/issues)

---

**Bon roleplay ! 🎭**
