# Changelog v5.4.37 - API Vision + Tierce Personne Améliorée

## Date: 19 janvier 2026

## Changements Majeurs

### 1. API Vision Pollinations (GRATUITE)
- **Nouvelle implémentation**: Utilisation de Pollinations Vision API (GPT-4o gratuit)
- **Fonctionnement**:
  1. L'image est convertie en base64
  2. Envoyée à `https://text.pollinations.ai/` avec le modèle `openai` (GPT-4o vision)
  3. L'IA analyse l'image et retourne les caractéristiques en JSON
- **Caractéristiques détectées**:
  - Genre (homme/femme)
  - Âge estimé
  - Couleur des cheveux
  - Longueur des cheveux
  - Couleur des yeux
  - Teint de peau
  - Morphologie
  - Taille de poitrine (femmes)
- **Fallback**: Si l'API échoue, génération locale aléatoire avec message explicite
- **Fichier**: `src/screens/CreateCharacterScreen.js`

### 2. Tierce Personne - Instructions Ultra-Explicites
- **Problème**: L'IA ne faisait pas toujours parler la tierce personne
- **Solution**: Instructions beaucoup plus explicites et formatées
- **Améliorations**:
  - Format visuel clair avec séparateurs (`═══` et `━━━`)
  - Exemples concrets de dialogue multi-personnages
  - Instruction explicite: "Tu joues DEUX rôles"
  - Mots-clés de détection étendus pour l'adressage direct
  - Instruction prioritaire si l'utilisateur parle à la tierce personne
- **Format attendu**:
  ```
  [NomTierce] *action* "paroles" (pensées)
  *action personnage principal* "paroles" (pensées)
  ```
- **Fichier**: `src/services/TextGenerationService.js`

### 3. Génération d'Image (Version Stable)
- La génération d'image reste en mode simple (1 image à la fois)
- Pas de génération multiple pour éviter les crashs
- Code stable provenant de v5.4.26

## Configuration API Vision

L'API Pollinations Vision est:
- **Gratuite** (pas de clé API requise)
- **Sans limite** connue
- Utilise **GPT-4o** en backend
- Supporte les images en **base64** ou **URL**

## Fichiers Modifiés
1. `src/screens/CreateCharacterScreen.js` - API Vision Pollinations
2. `src/services/TextGenerationService.js` - Tierce personne améliorée
3. `app.json` - Version 5.4.37, versionCode 177
4. `package.json` - Version 5.4.37

## Build
- Version: 5.4.37
- VersionCode: 177
- Tag: v5.4.37
