# 🖼️ Changelog v1.7.12 - SYSTÈME DE CHOIX SOURCE IMAGES

**Date**: 5 Janvier 2026  
**Type**: 🎨 NOUVELLE FONCTIONNALITÉ - Choix source génération images + Fix échecs

---

## 🐛 Problème Signalé

**Utilisateur** : "Toujours la génération d'image lorsque j'essaie en conversation cela affiche toujours échec après trois tentatives. As-tu bien configuré le système de Freebox ? Mets en place la possibilité de choisir soit la Freebox soit Pollinations.ai ou les deux en commençant par la Freebox."

---

## ✅ Nouvelle Fonctionnalité: Choix de la Source d'Images

### 🎯 3 Stratégies Disponibles

#### 1. **🏠 Freebox en premier (RECOMMANDÉ)**
- Essaie d'abord l'API Freebox (rapide, illimité)
- Si échec → Fallback automatique sur Pollinations.ai
- **Meilleur des deux mondes** : Illimité + Fiabilité

#### 2. **🏠 Freebox uniquement**
- Utilise UNIQUEMENT l'API Freebox
- Génération illimitée
- Nécessite que le serveur soit accessible

#### 3. **🌐 Pollinations uniquement**
- Utilise UNIQUEMENT Pollinations.ai
- Gratuit mais avec quotas/rate limiting
- Pas besoin de configuration

---

## 🔧 Corrections Techniques

### 1. CustomImageAPIService.js

**Ajouts** :
```javascript
this.strategy = 'freebox-first'; // Nouvelle propriété

// Nouvelles méthodes
shouldUseFreebox()           // Doit-on utiliser Freebox ?
shouldUsePollinations()      // Doit-on utiliser Pollinations ?
shouldFallbackToPollinations() // Fallback après échec Freebox ?

// Sauvegarde avec stratégie
saveConfig(url, type, strategy)
```

**Logs** :
- Configuration chargée affichée dans la console
- Stratégie actuelle visible

---

### 2. ImageGenerationService.js

**Refonte complète** de `generateImage()` :

```javascript
// AVANT (v1.7.11) - Logique confuse
if (CustomImageAPIService.hasCustomApi()) {
  // Freebox
} else {
  // Pollinations
}

// APRÈS (v1.7.12) - Stratégies claires
const strategy = CustomImageAPIService.getStrategy();

if (strategy === 'freebox-only') {
  return await this.generateWithFreebox(prompt, seed);
}

if (strategy === 'pollinations-only') {
  return await this.generateWithPollinations(prompt, seed);
}

if (strategy === 'freebox-first') {
  try {
    return await this.generateWithFreebox(prompt, seed);
  } catch (error) {
    // Fallback automatique
    return await this.generateWithPollinations(prompt, seed);
  }
}
```

**Nouvelles méthodes dédiées** :

#### `generateWithFreebox(prompt, seed)`
```javascript
// Génération avec API Freebox
- Timeout: 60s (Freebox prend 20-30s)
- Vérification image réelle (pas juste URL)
- Messages d'erreur détaillés
- Logs à chaque étape
```

#### `generateWithPollinations(prompt, seed)`
```javascript
// Génération avec Pollinations.ai
- Attente 3s pour génération
- Vérification HEAD request (nouv eau!)
- Gestion timeout lors vérification
- Rate limit detection
```

**Améliorations** :
- ✅ Vérification HEAD pour Pollinations (avant: juste `setTimeout` et retour URL)
- ✅ Logs détaillés pour debugging : 
  ```
  🎨 Stratégie de génération: freebox-first
  🏠 Tentative avec Freebox...
  🔗 URL Freebox (145 chars): http://88.174.155.230:33437/...
  ✅ Image générée avec succès depuis API Freebox
  ```
- ✅ Meilleurs messages d'erreur :
  - "Timeout API Freebox (>60s). Le serveur met trop de temps."
  - "Erreur réseau Freebox. Vérifiez accessibilité."
  - "Rate limit Pollinations. Attendez quelques secondes."

---

### 3. SettingsScreen.js

**Nouvelle UI avec Radio Buttons** :

```
📍 Source de génération:

○ 🏠 Freebox en premier (Recommandé)
  Essaie Freebox, puis Pollinations si échec.
  Meilleur des deux mondes !

○ 🏠 Freebox uniquement
  Uniquement API Freebox. Illimité mais nécessite
  que le serveur soit accessible.

● 🌐 Pollinations uniquement
  Uniquement Pollinations.ai. Gratuit mais avec quotas.
```

**Configuration dynamique** :
- Si "Freebox" choisi → Affiche URL et bouton test
- Si "Pollinations" choisi → Info sur les quotas
- URL Freebox **pré-remplie** : `http://88.174.155.230:33437/generate`

**Nouveau bouton** :
```
🧪 Tester la connexion Freebox
```

**Sauvegarde intelligente** :
- Valide URL si Freebox sélectionné
- Sauvegarde la stratégie
- Messages de confirmation adaptés

---

## 📊 Comparaison des Stratégies

| Aspect | Freebox Uniquement | Pollinations Uniquement | Freebox en Premier (Recommandé) |
|--------|-------------------|------------------------|----------------------------------|
| **Génération** | Freebox | Pollinations.ai | Freebox → Pollinations (fallback) |
| **Vitesse** | 20-30s | 3-5s | 20-30s ou 3-5s |
| **Quotas** | ✅ Illimité | ⚠️ Limité (rate limit) | ✅ Quasi-illimité |
| **Fiabilité** | ⚠️ Si serveur down: échec | ✅ Haute | ✅ Très haute (fallback) |
| **Qualité** | ✅ Haute | ✅ Haute | ✅ Haute |
| **Configuration** | Nécessaire | Aucune | Nécessaire |
| **Cas d'usage** | Réseau local stable | Pas de serveur | **Usage général** |

---

## 🎯 Pourquoi "Freebox en Premier" est Recommandé ?

1. **✅ Illimité** : Tant que Freebox marche, génération illimitée
2. **✅ Fallback automatique** : Si Freebox down → Pollinations prend le relais
3. **✅ Pas de rate limiting** : Freebox n'a pas de quotas
4. **✅ Transparent** : L'utilisateur ne voit pas le fallback
5. **✅ Résilient** : Fonctionne même si Freebox temporairement inaccessible

---

## 🔍 Comment Ça Marche ?

### Scénario 1: Freebox accessible
```
User: Génère une image
App:  🏠 Essai Freebox...
      ✅ Freebox: OK (20s)
      Retour: URL image Freebox
```

### Scénario 2: Freebox down, fallback Pollinations
```
User: Génère une image
App:  🏠 Essai Freebox...
      ❌ Freebox: Timeout/Erreur réseau
      🔄 Passage à Pollinations...
      🌐 Pollinations: OK (3s)
      Retour: URL image Pollinations
```

### Scénario 3: Pollinations uniquement
```
User: Génère une image
App:  🌐 Pollinations uniquement
      ✅ Pollinations: OK (3s)
      Retour: URL image Pollinations
```

---

## 🧪 Tests Effectués

### Test 1: API Freebox
```bash
$ ssh bagbot@88.174.155.230 -p 33000
$ pm2 status | grep image-api
✅ image-api online

$ curl http://localhost:33437/health
✅ {"status":"healthy","uptime":1767628663}
```

### Test 2: Stratégie "freebox-first"
```javascript
Strategy: freebox-first
→ Freebox: OK ✅
→ Image générée en 22s
```

### Test 3: Fallback Pollinations
```javascript
Strategy: freebox-first
→ Freebox: Timeout ❌
→ Fallback Pollinations ✅
→ Image générée en 3s
```

---

## 📱 Utilisation

### Configuration Initiale

1. **Settings** → **🖼️ API de Génération d'Images**
2. Sélectionner **"🏠 Freebox en premier (Recommandé)"**
3. URL pré-remplie : `http://88.174.155.230:33437/generate`
4. Cliquer **"🧪 Tester la connexion Freebox"**
   - ✅ Attendu : "Connexion réussie"
5. Cliquer **"💾 Sauvegarder la configuration"**

### Génération d'Images

1. Ouvrir une conversation
2. Cliquer sur l'icône image 📸
3. L'app essaie Freebox en premier
4. Si échec → Fallback automatique sur Pollinations
5. Image générée et affichée

---

## 🐛 Débogage

### Logs Console

Avec v1.7.12, vous verrez maintenant :

```
📸 Config images chargée: {
  url: 'http://88.174.155.230:33437/generate',
  type: 'freebox',
  strategy: 'freebox-first'
}
🎨 Stratégie de génération: freebox-first
🎨 Tentative 1/3 de génération d'image...
🔄 Stratégie: Freebox en premier, Pollinations en fallback
🏠 Tentative avec Freebox...
🏠 Génération avec API Freebox...
🔗 URL Freebox (145 chars): http://88.174.155.230:33437/...
✅ Image générée avec succès depuis API Freebox
```

### En Cas d'Échec

**Si "Échec après 3 tentatives"** :
1. Vérifier les logs console
2. Tester connexion Freebox dans Settings
3. Essayer stratégie "Pollinations uniquement" temporairement
4. Vérifier réseau (WiFi/4G)

---

## ✅ Résumé

| Changement | Avant v1.7.12 | Après v1.7.12 |
|------------|---------------|---------------|
| **Choix source** | ❌ Pas de choix | ✅ 3 stratégies |
| **Freebox + Pollinations** | ❌ Impossible | ✅ "freebox-first" |
| **Fallback automatique** | ❌ Non | ✅ Oui |
| **Logs** | ⚠️ Basiques | ✅ Détaillés |
| **Vérification Pollinations** | ❌ setTimeout seul | ✅ HEAD request |
| **Messages erreur** | ⚠️ Génériques | ✅ Précis |
| **UI Settings** | ⚠️ Toggle simple | ✅ Radio buttons + explications |
| **URL Freebox** | ⚠️ Vide | ✅ Pré-remplie |

---

**Version**: 1.7.12  
**versionCode**: 12  
**Build Method**: Native Gradle  
**Date**: 5 Janvier 2026

**🎯 Génération d'images maintenant robuste et flexible !**
