# Changelog v5.4.17 - 3 Sources de Génération d'Images

## Date: 19 Janvier 2026

## Nouvelles Fonctionnalités

### 3 Options de Génération d'Images

L'application supporte maintenant **3 sources distinctes** pour la génération d'images:

#### 1. ☁️ Pollinations AI (Cloud) - Recommandé
- **URL:** `https://image.pollinations.ai/prompt/`
- **Modèle:** Flux
- **NSFW:** Activé (`safe=false`)
- **Avantages:** Rapide, gratuit, aucune configuration requise
- **Paramètres:**
  - `model=flux`
  - `safe=false` (NSFW)
  - `enhance=true` (qualité)
  - `nofeed=true` (privé)

#### 2. 🏠 Stable Diffusion Freebox (Serveur)
- **URL:** Configurable (ex: `http://88.174.155.230:33437/generate`)
- **NSFW:** Supporté
- **Avantages:** Privé, illimité, sur votre propre serveur
- **Configuration requise:** URL du serveur Freebox
- **Test connexion:** Bouton pour vérifier la connexion

#### 3. 📱 SD Local (Smartphone)
- **Avantages:** 100% offline, privé
- **Statut:** En développement

## Modifications Techniques

### CustomImageAPIService.js
- Support de 3 stratégies: `pollinations`, `freebox`, `local`
- Nouvelle méthode `shouldUsePollinations()`
- Nouvelle méthode `getFreeboxUrl()`
- Nouvelle méthode `testFreeboxConnection()`
- Migration automatique des anciennes configs

### ImageGenerationService.js
- Nouvelle fonction `generateWithPollinations()` (anciennement generateWithFreebox)
- Nouvelle fonction `generateWithFreeboxSD()` pour le serveur Freebox
- Switch case dans `generateImage()` pour les 3 stratégies
- Logs clarifiés avec icônes:
  - ☁️ pour Pollinations
  - 🏠 pour Freebox SD
  - 📱 pour Local

### SettingsScreen.js
- 3 options radio dans l'interface
- Configuration spécifique pour chaque option
- Test de connexion pour Freebox
- Descriptions mises à jour

## Interface Utilisateur

### Écran Paramètres
```
🖼️ Génération d'Images

○ ☁️ Pollinations AI (Cloud)
   Génération cloud rapide et gratuite. NSFW activé !

○ 🏠 SD Freebox (Serveur)
   Stable Diffusion sur votre serveur Freebox. Privé et illimité !

○ 📱 SD Local (Smartphone)
   Génération sur téléphone. Offline, 100% privé.
```

### Configuration Pollinations
- Aucune configuration requise
- Affiche les paramètres actifs (NSFW, enhance, Flux)

### Configuration Freebox
- Champ URL du serveur
- Bouton "🧪 Tester la connexion"
- Avertissement si serveur non démarré

## Fichiers Modifiés
- `src/services/CustomImageAPIService.js` - Support 3 stratégies
- `src/services/ImageGenerationService.js` - Nouvelles fonctions de génération
- `src/screens/SettingsScreen.js` - Interface 3 options
- `app.json` - Version 5.4.17, versionCode 157
- `package.json` - Version 5.4.17

## Migration

Les utilisateurs avec l'ancienne config "freebox" (qui utilisait Pollinations)
seront automatiquement migrés vers "pollinations".
