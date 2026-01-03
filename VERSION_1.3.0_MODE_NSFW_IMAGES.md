# 🔥 Version 1.3.0 - MODE NSFW pour génération d'images

## 📅 Date de release : 3 janvier 2026

---

## 🎨 NOUVEAUTÉS MAJEURES

### **1. Mode NSFW pour génération d'images**

Le système de génération d'images dispose désormais de **deux modes** :

#### ✨ **Mode SFW (Safe For Work)** - Par défaut
- Images décentes et respectueuses
- Personnages habillés avec tenue appropriée
- Pose respectable et professionnelle
- Activé automatiquement si :
  - Pas de profil utilisateur créé
  - Utilisateur mineur (<18 ans)
  - Mode NSFW désactivé dans les paramètres

#### 🔥 **Mode NSFW (Not Safe For Work)** - Optionnel
- Images sexy, sensuelles et provocantes
- Lingerie, sous-vêtements, tenues intimes
- Poses suggestives et séductrices
- Décolletés visibles, peau exposée
- Atmosphère sensuelle et érotique
- Tenues révélatrices :
  - Pour femmes : lingerie, nuisette, string, soutien-gorge transparent, bikini
  - Pour hommes : torse nu, sous-vêtements, boxer, posture musclée

**Conditions d'activation du mode NSFW** :
1. ✅ Utilisateur **majeur** (18+ ans)
2. ✅ Mode NSFW **activé** dans les paramètres
3. ✅ Personnage **majeur** (18+ ans)

---

### **2. Anatomie ULTRA-PRÉCISE**

Les descriptions anatomiques sont maintenant **extrêmement détaillées** pour générer des images plus réalistes et fidèles aux personnages.

#### 📏 **Bonnets de poitrine pour femmes (A à G cup)**

| Taille | Description SFW | Description NSFW (si activé) |
|--------|----------------|------------------------------|
| **A** | Poitrine petite, délicate, figure svelte | Petite poitrine visible, décolleté modeste |
| **B** | Petite poitrine, silhouette élancée | Poitrine petite et délicate visible |
| **C** | Poitrine moyenne, proportions équilibrées | Poitrine moyenne visible, décolleté naturel |
| **D** | Large poitrine, silhouette voluptueuse | Large poitrine mise en valeur, décolleté prononcé |
| **DD** | Très large poitrine, silhouette très voluptueuse | Très large poitrine accentuée, décolleté généreux |
| **E** | Très large poitrine, figure voluptueuse | Très large poitrine mise en avant, décolleté profond |
| **F** | Énorme poitrine, silhouette extrêmement voluptueuse | Énorme poitrine spectaculaire, décolleté dramatique |
| **G** | Énorme poitrine exceptionnelle | Énorme poitrine extraordinaire, décolleté impressionnant |

#### 💪 **Physique masculin**
- **SFW** : Physique athlétique, épaules larges, posture confiante
- **NSFW** : Torse nu musclé, abdos définis, physique sculpté, posture sensuelle

---

### **3. Détection automatique de tenue dans les conversations**

Le système **détecte automatiquement** les mentions de vêtements dans les conversations et génère des images **dans la tenue mentionnée**.

#### 🎭 **Tenues détectées** :
- **Vêtements normaux** : robe, jupe, pantalon, chemise, pull, veste, etc.
- **Vêtements intimes** : lingerie, soutien-gorge, culotte, string, boxer, nuisette, bikini, etc.

#### 👗 **Logique de génération** :
1. **Tenue normale mentionnée** (robe, pantalon) → Génère l'image avec cette tenue
2. **Tenue suggestive mentionnée** (lingerie, bikini) + NSFW activé → Image NSFW dans cette tenue
3. **Pas de tenue mentionnée** + NSFW activé → Image NSFW complète (lingerie par défaut)
4. **Mode SFW** → Toujours décent, peu importe la tenue

#### 📝 **Exemples de détection** :

| Phrase dans la conversation | Détection | Résultat (si NSFW actif) |
|-----------------------------|-----------|-------------------------|
| "Elle porte une robe rouge élégante" | ✅ Robe rouge | Image avec robe rouge |
| "Il est en boxer noir" | ✅ Boxer noir | Image homme en boxer |
| "Elle est en lingerie noire" | ✅ Lingerie | Image NSFW lingerie noire |
| "Elle enfile une nuisette" | ✅ Nuisette | Image NSFW nuisette |
| (aucune mention) | ❌ Pas de tenue | Image NSFW lingerie/intime par défaut |

---

### **4. Génération contextuelle selon la source**

Le mode NSFW s'applique **différemment selon l'endroit** où l'image est générée :

#### 🖼️ **Images profil personnage** (`CharacterDetailScreen`)
- Utilise le profil utilisateur pour détecter le mode NSFW
- Si NSFW activé + utilisateur majeur → Image sexy du personnage
- Image sauvegardée automatiquement dans la galerie

#### 💬 **Images conversation** (`ConversationScreen`)
- Utilise le profil utilisateur + messages récents
- Détecte les tenues mentionnées dans les 3 derniers messages
- Génère l'image en contexte (tenue + scène décrite)
- Image sauvegardée automatiquement dans la galerie

#### ✏️ **Création personnage** (`CreateCharacterScreen`)
- Utilise le profil utilisateur pour le mode NSFW
- Génère un aperçu du personnage créé
- Permet de voir le résultat avant sauvegarde

---

## 📋 Comment activer le mode NSFW ?

### **Étape 1 : Créer un profil utilisateur**
1. Allez dans l'onglet **Paramètres**
2. Appuyez sur **"Mon Profil"** (bouton vert)
3. Remplissez les informations :
   - Pseudo
   - Âge (**18+ obligatoire**)
   - Genre
   - Détails anatomiques (bonnet/pénis)
4. Appuyez sur **"Sauvegarder"**

### **Étape 2 : Activer le mode NSFW**
1. Dans l'écran **Mon Profil**
2. Activez le **toggle "Mode NSFW"** (rouge)
3. Le mode NSFW est maintenant **actif**

### **Étape 3 : Générer des images**
1. Allez sur un **profil de personnage**
2. Appuyez sur le bouton **"📷 Générer une image"**
3. L'image générée sera **sexy/sensuelle** si NSFW activé
4. Dans une **conversation**, appuyez sur **"📷"** pour générer une image de scène
5. L'image prendra en compte :
   - Le mode NSFW
   - La tenue mentionnée dans la conversation
   - Le contexte des messages récents

---

## 🔒 Sécurité et restrictions

### **Protections implémentées** :
- ⛔ **Génération désactivée pour personnages mineurs** (<18 ans)
- 🔐 **Mode NSFW disponible uniquement pour utilisateurs majeurs** (18+)
- ✅ **Mode SFW par défaut** si pas de profil ou profil mineur
- 🛡️ **Filtrage automatique** : images refusées si personnage <18 ans

---

## 📱 Installation

1. Téléchargez **roleplay-chat.apk** (68 Mo)
2. Installez sur Android (autoriser sources inconnues si nécessaire)
3. Ouvrez l'application
4. Vérifiez la version **1.3.0** dans **Paramètres** > **À propos**

---

## 🐛 Correctifs techniques

### **ImageGenerationService.js**
- Réécriture complète du service
- Ajout de `generateCharacterImage(character, userProfile)` avec mode NSFW
- Ajout de `generateSceneImage(character, userProfile, messages)` avec détection de tenue
- Méthode `getNSFWPromptAddition()` pour prompts NSFW explicites
- Méthode `detectOutfit(messages)` pour détecter les vêtements
- Méthode `isOutfitSuggestive(outfit)` pour identifier tenues intimes
- Descriptions anatomiques ultra-précises (A cup à G cup)

### **CharacterDetailScreen.js**
- Import de `UserProfileService`
- Chargement du profil utilisateur au démarrage
- Passage du `userProfile` à `ImageGenerationService.generateCharacterImage()`
- Recharge du profil à chaque focus sur l'écran

### **ConversationScreen.js**
- Modification de `generateImage()` pour utiliser `generateSceneImage()`
- Passage de `character`, `userProfile`, et `messages` au service
- Détection automatique de tenue dans les messages

### **CreateCharacterScreen.js**
- Import de `UserProfileService`
- Chargement du profil utilisateur avant génération d'image
- Passage du `userProfile` pour mode NSFW

---

## 📊 Statistiques du build

- **Version** : 1.3.0
- **Taille APK** : 68 Mo
- **Build** : Direct Gradle (sans EAS)
- **Date** : 3 janvier 2026
- **Fichiers modifiés** : 4
  - `ImageGenerationService.js` (réécriture complète)
  - `CharacterDetailScreen.js`
  - `ConversationScreen.js`
  - `CreateCharacterScreen.js`

---

## 🎯 Roadmap future (idées)

- [ ] Paramètres d'intensité NSFW (soft, medium, hard)
- [ ] Plus de styles d'images (hyperréaliste, anime, dessin)
- [ ] Filtres de couleurs (noir et blanc, sépia, vintage)
- [ ] Galerie avec filtres (SFW/NSFW)
- [ ] Historique des prompts utilisés
- [ ] Possibilité de re-générer avec même prompt

---

## 🙏 Remerciements

Merci pour votre patience et vos retours ! Cette version 1.3.0 apporte une **dimension visuelle beaucoup plus riche et personnalisée** à l'expérience de roleplay.

**Profitez bien du mode NSFW ! 🔥**
