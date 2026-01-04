# 💬 Version 1.4.0 - Conversations Immersives

## 📅 Date de release : 4 janvier 2026

---

## 🎯 OBJECTIF

Rendre les conversations plus **immersives**, **réalistes** et **fluides** en :
1. **Réponses AI plus courtes** (2-4 phrases max)
2. **Pas de répétitions** des pensées/actions/paroles
3. **Formatage couleur cohérent** pour actions/pensées
4. **Images de galerie** dans les vignettes personnages

---

## 🎨 NOUVEAUTÉS MAJEURES

### **1. Réponses IA courtes et variées**

#### ❌ **AVANT v1.4.0** :
Les réponses étaient souvent **longues** et **répétitives** :
```
*Sophie sourit doucement en s'approchant de toi*
"Bonjour ! Comment vas-tu aujourd'hui ?"
*Elle te regarde avec attention et sourit encore*
"J'espère que tu passes une bonne journée !"
*Sophie sourit en attendant ta réponse*
```

#### ✅ **APRÈS v1.4.0** :
Les réponses sont **courtes** et **variées** :
```
*Sophie sourit en s'approchant*
"Salut ! Ça va ?"
```

Puis dans le message suivant :
```
*Elle rit doucement*
"Content de te voir !"
```

### **Règles appliquées à l'IA** :
- ✅ **2-4 phrases MAXIMUM** par réponse
- ✅ **PAS DE RÉPÉTITION** des pensées/actions/paroles précédentes
- ✅ **VARIE tes expressions**, ne répète JAMAIS les mêmes formulations
- ✅ **Une seule pensée OU une seule action** par message
- ✅ Réponses **NATURELLES** et **DIRECTES**

---

### **2. Formatage couleur unifié**

#### ❌ **AVANT v1.4.0** :
- Actions/pensées du **personnage** : gris `#6b7280`
- Actions/pensées de l'**utilisateur** : (couleur différente ou pas de coloration)

#### ✅ **APRÈS v1.4.0** :
- Actions/pensées **TOUS** : **violet** `#8b5cf6` (italique)
- Plus immersif et visuellement cohérent
- Facile d'identifier actions vs paroles

#### **Exemple visuel** :

**Personnage** :
```
*Elle sourit*  ← violet italique
"Bonjour !"    ← noir normal
```

**Utilisateur** :
```
*Je m'approche*  ← violet italique (MÊME COULEUR)
"Salut !"        ← noir normal
```

---

### **3. Images de galerie dans les vignettes**

#### ❌ **AVANT v1.4.0** :
- Vignettes personnages avec **initiales** seulement
- Personnages sans image → `AB` pour "Anne Bernard"

#### ✅ **APRÈS v1.4.0** :
- **Première image de la galerie** affichée automatiquement
- Si galerie vide → initiales (comme avant)
- Personnages custom gardent leur `imageUrl`

#### **Comment ça marche** :
1. Au démarrage de `HomeScreen`, on charge la **galerie** de chaque personnage
2. On prend la **première image** (`gallery[0]`)
3. On l'affiche dans la vignette ronde

#### **Avantages** :
- 🖼️ Vignettes visuellement **riches**
- 👤 Personnages **reconnaissables** immédiatement
- ✨ Images générées précédemment sont **réutilisées**

---

## 📋 Modifications techniques

### **1. GroqService.js - Prompt optimisé**

#### **Modifications** :
- Ajout de **RÈGLES DE ROLEPLAY (STRICT)** dans le prompt système
- Instructions explicites : **"2-4 phrases MAXIMUM"**
- Emphase : **"PAS DE RÉPÉTITION"**, **"VARIE tes expressions"**
- **"Une seule pensée OU une seule action par message"**

#### **Code snippet** :

```javascript
prompt += `\n\nScénario de base: ${character.scenario}

RÈGLES DE ROLEPLAY (STRICT):
1. FORMAT:
   - *astérisques* pour actions et pensées
   - "guillemets" pour paroles
   
2. RÉPONSES COURTES:
   - 2-4 phrases MAXIMUM
   - PAS DE RÉPÉTITION des pensées/actions/paroles précédentes
   - VARIE tes expressions, ne répète JAMAIS les mêmes formulations
   - Une seule pensée OU une seule action par message
   - Réponses NATURELLES et DIRECTES
   
3. STYLE:
   - Reste en personnage
   - Réagis au contexte immédiat
   - Avance l'interaction, ne te répète pas
   - Évite les descriptions longues`;
```

---

### **2. ConversationScreen.js - Couleur actions violette**

#### **Modifications** :
- Style `actionText` modifié de `#6b7280` (gris) à `#8b5cf6` (violet)
- Conserve l'italique
- Même couleur pour **user** et **assistant**

#### **Code snippet** :

```javascript
actionText: {
  fontSize: 14,
  fontStyle: 'italic',
  color: '#8b5cf6', // Violet pour actions/pensées (même couleur pour user et assistant)
  marginBottom: 3,
},
```

---

### **3. HomeScreen.js - Images de galerie**

#### **Modifications** :
- Import de `GalleryService`
- Nouvelle fonction `loadGalleryImages(chars)` qui :
  1. Pour chaque personnage
  2. Si `char.imageUrl` existe → utilise ça (custom chars)
  3. Sinon, charge `GalleryService.getGallery(char.id)`
  4. Si galerie non vide → utilise `gallery[0]`
  5. Stocke dans `characterImages` state

#### **Code snippet** :

```javascript
const loadGalleryImages = async (chars) => {
  const images = {};
  for (const char of chars) {
    // Si le personnage custom a déjà une imageUrl, on l'utilise
    if (char.imageUrl) {
      images[char.id] = char.imageUrl;
    } else {
      // Sinon, on charge la première image de la galerie
      const gallery = await GalleryService.getGallery(char.id);
      if (gallery && gallery.length > 0) {
        images[char.id] = gallery[0]; // Première image de la galerie
      }
    }
  }
  setCharacterImages(images);
};
```

#### **Utilisation** :
- `renderCharacter` utilise `characterImages[item.id]` pour afficher l'image
- Si pas d'image → fallback sur initiales

---

## 📊 Comparaison AVANT / APRÈS

| **Aspect** | **AVANT v1.4.0** | **APRÈS v1.4.0** |
|------------|------------------|------------------|
| **Longueur réponses** | 6-10 phrases, descriptions longues | 2-4 phrases, concis |
| **Répétitions** | Fréquentes (*Elle sourit* × 3) | Aucune, expressions variées |
| **Couleur actions user** | Gris ou non coloré | Violet `#8b5cf6` (comme assistant) |
| **Couleur actions assistant** | Gris `#6b7280` | Violet `#8b5cf6` |
| **Vignettes personnages** | Initiales seulement | Première image de galerie |
| **Images personnages custom** | `imageUrl` si existe | `imageUrl` prioritaire |

---

## 🎭 Expérience utilisateur

### **Exemple de conversation AVANT** :
```
Personnage:
*Sophie sourit doucement en s'approchant de toi avec un air chaleureux*
"Bonjour ! Comment vas-tu aujourd'hui ?"
*Elle te regarde avec attention et sourit encore en attendant ta réponse*
"J'espère que tu passes une bonne journée !"

User:
"Salut, ça va bien !"

Personnage:
*Sophie sourit en hochant la tête doucement*
"C'est super ! Je suis contente de t'entendre !"
*Elle sourit encore et s'approche un peu plus*
```
→ **Problèmes** : répétitions (*sourit* × 4), réponses longues, redondant

---

### **Exemple de conversation APRÈS** :
```
Personnage:
*Sophie s'approche avec un sourire*
"Salut ! Ça va ?"

User:
*Je hoche la tête*
"Oui, et toi ?"

Personnage:
*Elle rit doucement*
"Super, merci !"
```
→ **Avantages** : court, varié, fluide, immersif

---

## 📱 Installation

1. Téléchargez **roleplay-chat.apk** (68 Mo)
2. Installez sur Android (autoriser sources inconnues si nécessaire)
3. Ouvrez l'application
4. Vérifiez la version **1.4.0** dans **Paramètres** > **À propos**

---

## 🐛 Correctifs techniques

### **GroqService.js**
- Prompt système réécrit avec instructions **STRICT**
- Emphase sur **"PAS DE RÉPÉTITION"** et **"VARIE"**
- Limite **2-4 phrases MAXIMUM**

### **ConversationScreen.js**
- Style `actionText` couleur violet `#8b5cf6`
- Cohérence visuelle user/assistant

### **HomeScreen.js**
- Import `GalleryService`
- Fonction `loadGalleryImages()` pour charger galeries
- Affichage première image dans vignettes

---

## 📊 Statistiques du build

- **Version** : 1.4.0
- **Taille APK** : 68 Mo
- **Build** : Direct Gradle (sans EAS)
- **Date** : 4 janvier 2026
- **Fichiers modifiés** : 3
  - `GroqService.js` (prompt optimisé)
  - `ConversationScreen.js` (couleur actions)
  - `HomeScreen.js` (images galerie)

---

## 🎯 Roadmap future (idées)

- [ ] Détection de contexte émotionnel pour ajuster réponses
- [ ] Suggestions de réponses rapides (*Je souris*, *Je m'approche*)
- [ ] Historique des conversations plus riche
- [ ] Thèmes de couleurs personnalisables
- [ ] Plus de styles d'images (anime, réaliste, dessin)

---

## 🙏 Remerciements

Merci pour vos retours ! Cette version 1.4.0 rend les conversations **beaucoup plus naturelles et immersives**.

**Profitez de conversations plus fluides ! 💬**
