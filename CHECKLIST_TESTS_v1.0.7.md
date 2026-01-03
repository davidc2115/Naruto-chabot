# ✅ Checklist de Test - Version 1.0.7

## 📋 Tests à Effectuer

Cochez chaque étape après l'avoir testée :

---

### 1️⃣ Installation et Configuration Initiale

- [ ] **Télécharger l'APK v1.0.7** depuis les Releases GitHub
- [ ] **Installer l'APK** sur Android
- [ ] **Lancer l'application** (elle doit démarrer sans crash)

---

### 2️⃣ Créer le Profil Utilisateur

- [ ] Aller dans **Paramètres** (icône ⚙️ en bas)
- [ ] Appuyer sur **"Créer mon profil"**
- [ ] Remplir :
  - Pseudo : `TestUser`
  - Âge : `25`
  - Genre : `Femme` ou `Homme`
  - Attributs : Bonnet `D` (femme) ou Taille `17` (homme)
- [ ] ✅ Activer le **Mode NSFW** (si 18+)
- [ ] Appuyer sur **"Sauvegarder"**
- [ ] **Vérifier** : Le profil s'affiche correctement dans Paramètres

---

### 3️⃣ Ajouter des Clés API Groq

**⚠️ CRITIQUE : Sans clé, l'app ne peut pas générer de texte !**

- [ ] Aller sur [console.groq.com](https://console.groq.com)
- [ ] Créer un compte (Google/GitHub)
- [ ] Créer une clé API (commence par `gsk_...`)
- [ ] Dans l'app, section **"Clés API Groq"**
- [ ] Coller la clé et appuyer sur **"Ajouter"**
- [ ] La clé apparaît dans la liste
- [ ] Appuyer sur **"Tester toutes les clés"**
- [ ] **Vérifier** : Message "Clé valide ✓"

---

### 4️⃣ Test Conversation (FIX: Clés API)

- [ ] Aller sur l'écran d'accueil
- [ ] Choisir un personnage (ex: "Léa Bernard")
- [ ] Appuyer sur **"Commencer la conversation"**
- [ ] **Vérifier** : Le message de départ du personnage s'affiche
- [ ] **PAS d'erreur "Aucune clé API configurée"** ✅
- [ ] Envoyer un message : `*Je souris* "Bonjour !"`
- [ ] **Vérifier** : Le personnage répond (peut prendre 5-10 sec)
- [ ] **PAS d'erreur "timestamp is unsupported"** ✅

---

### 5️⃣ Test Génération d'Images dans Conversation

- [ ] Dans la conversation, appuyer sur l'icône **🎨** (en bas à gauche)
- [ ] Attendre la génération (10-20 secondes)
- [ ] **Vérifier** : Une image s'affiche dans la conversation
- [ ] **Vérifier** : Le compteur **🖼️ X** en haut augmente (ex: 🖼️ 1)

---

### 6️⃣ Test Galerie dans Profil du Personnage (FIX: Galerie visible)

- [ ] Appuyer sur l'icône **ℹ️** en haut à droite (ou retourner au profil)
- [ ] **Vérifier** : Section **"🖼️ Galerie"** est visible
- [ ] **Vérifier** : L'image générée s'affiche dans la galerie
- [ ] Appuyer sur **"Voir tout (1) →"**
- [ ] **Vérifier** : La galerie complète s'ouvre avec l'image

---

### 7️⃣ Test Fond de Conversation

- [ ] Dans la galerie, appuyer sur l'image
- [ ] Appuyer sur **"📷 Fond"**
- [ ] **Vérifier** : Message "Fond défini"
- [ ] Retourner à la conversation
- [ ] **Vérifier** : L'image apparaît en fond flou
- [ ] Fermer et rouvrir la conversation
- [ ] **Vérifier** : Le fond est toujours là (persistance)

---

### 8️⃣ Test Création Personnage avec Image (FIX: Photo + Bonnet)

- [ ] Aller sur l'écran d'accueil
- [ ] Appuyer sur **"✨ Créer mon propre personnage"**
- [ ] Remplir :
  - Nom : `TestCharacter`
  - Âge : `25`
  - Genre : `Femme`
  - Couleur cheveux : `blond`
  - Apparence : `Grande et élégante, cheveux blonds, yeux bleus`
  - **Bonnet : `E`** ← Important pour le test
  - Personnalité : `Gentille et timide`
  - Tempérament : `timide`
  - Scénario : `Test scenario`
  - Message : `*Bonjour* "Salut !"`
- [ ] Appuyer sur **"🎨 Générer une image"**
- [ ] Attendre 10-20 secondes
- [ ] **Vérifier** : Une image s'affiche en prévisualisation
- [ ] **Vérifier visuel** : L'image montre une femme avec une poitrine généreuse (bonnet E) ✅
- [ ] Appuyer sur **"Sauvegarder"**
- [ ] **Vérifier** : Message "Personnage créé ! L'image a été ajoutée à la galerie"

---

### 9️⃣ Test Personnage Custom dans la Liste (FIX: Visible avec ✨)

- [ ] Retourner à l'écran d'accueil
- [ ] **Vérifier** : Le personnage `TestCharacter` apparaît dans la liste
- [ ] **Vérifier** : Il a un badge **✨** (personnage custom)
- [ ] **Vérifier** : Sa photo s'affiche dans la vignette

---

### 🔟 Test Galerie du Personnage Custom (FIX: Image dans galerie)

- [ ] Appuyer sur `TestCharacter` pour voir son profil
- [ ] **Vérifier** : Section **"🖼️ Galerie"** est visible
- [ ] **Vérifier** : L'image générée à l'étape 8 est dans la galerie ✅
- [ ] Appuyer sur **"Voir tout (1) →"**
- [ ] **Vérifier** : La galerie s'ouvre avec l'image

---

### 1️⃣1️⃣ Test Modification Personnage

- [ ] Dans le profil de `TestCharacter`, appuyer sur **"✏️ Modifier"**
- [ ] Modifier l'apparence : `Grande et élégante, cheveux blonds, yeux verts`
- [ ] Changer le bonnet : `G` ← Tester avec une taille différente
- [ ] Appuyer sur **"🎨 Générer une image"**
- [ ] **Vérifier visuel** : Nouvelle image avec bonnet G (encore plus généreux) ✅
- [ ] Appuyer sur **"Sauvegarder"**
- [ ] Retourner au profil
- [ ] **Vérifier** : La galerie a maintenant **2 images** (ancienne + nouvelle)

---

### 1️⃣2️⃣ Test Suppression Image

- [ ] Dans la galerie de `TestCharacter`
- [ ] Appuyer sur une image
- [ ] Appuyer sur **"🗑️ Supprimer"**
- [ ] Confirmer
- [ ] **Vérifier** : L'image disparaît de la galerie

---

### 1️⃣3️⃣ Test Suppression Personnage

- [ ] Dans le profil de `TestCharacter`
- [ ] Appuyer sur **"🗑️ Supprimer"**
- [ ] Confirmer
- [ ] **Vérifier** : Retour à l'écran d'accueil
- [ ] **Vérifier** : `TestCharacter` n'est plus dans la liste

---

### 1️⃣4️⃣ Test Attributs Anatomiques Affichage

- [ ] Choisir un personnage pré-créé (ex: "Sophie Dubois")
- [ ] Ouvrir son profil
- [ ] **Vérifier** : La ligne d'info affiche le bonnet (ex: "25 ans • Femme • Bonnet C")
- [ ] **Vérifier** : Dans la section "Apparence physique", il y a une ligne séparée :
  - `• Taille de poitrine : Bonnet C` (pour femme)
  - `• Taille : 17cm` (pour homme)

---

### 1️⃣5️⃣ Test Persistance des Données

- [ ] Fermer complètement l'application (fermer de force)
- [ ] Rouvrir l'application
- [ ] **Vérifier** : Le profil utilisateur est toujours là
- [ ] **Vérifier** : Les clés Groq sont toujours là (pas besoin de re-tester)
- [ ] Ouvrir une conversation précédente
- [ ] **Vérifier** : L'historique des messages est intact
- [ ] **Vérifier** : Les images dans la galerie sont toujours là
- [ ] **Vérifier** : Le fond de conversation est toujours actif

---

## 🎯 Résultats Attendus

### ✅ Tous les tests doivent passer SANS :
- ❌ "Aucune clé API configurée"
- ❌ "timestamp is unsupported"
- ❌ Galerie vide après génération d'images
- ❌ Images sans attributs anatomiques visibles
- ❌ Personnages custom invisibles
- ❌ Crash au démarrage

### ✅ Fonctionnalités confirmées :
- ✅ Clés API chargées automatiquement
- ✅ Galerie visible et mise à jour en temps réel
- ✅ Attributs anatomiques pris en compte dans les images
- ✅ Images sauvegardées automatiquement dans la galerie
- ✅ Fond de conversation personnalisable
- ✅ Création/modification/suppression de personnages
- ✅ Persistance totale des données

---

## 📝 Rapport de Bug

Si un test échoue, notez :

1. **Numéro du test** (ex: 4️⃣)
2. **Comportement observé** (ce qui se passe)
3. **Comportement attendu** (ce qui devrait se passer)
4. **Message d'erreur** (si présent)
5. **Capture d'écran** (si possible)

**Exemple** :
```
Test 8️⃣ - Création personnage avec image
❌ ÉCHEC
- Observé : L'image générée ne montre pas les attributs
- Attendu : L'image devrait montrer une poitrine généreuse (bonnet E)
- Erreur : Aucune
- Screenshot : [joindre capture]
```

---

**Bonne chance pour les tests ! 🚀**
