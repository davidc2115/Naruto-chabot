# Changelog v5.4.36 - Corrections Critiques

## Date: 19 janvier 2026

## Corrections Critiques

### 1. Fix Crash Génération d'Images
- **Problème**: L'application crashait lors de la génération d'images
- **Cause**: Variables d'état `imageGenerationCount` et `totalImagesToGenerate` supprimées mais encore utilisées dans l'interface
- **Fix**: Suppression des références obsolètes dans le rendu du bouton de génération
- **Fichier**: `src/screens/ConversationScreen.js`

### 2. Analyse d'Image Simplifiée (LOCAL)
- **Problème**: Les APIs de vision ne fonctionnaient pas (ni Pollinations, ni Groq, ni autres)
- **Solution**: Génération de profil LOCAL sans API externe
- **Fonctionnement**:
  - Génère un profil aléatoire varié localement
  - Affiche un message clair demandant à l'utilisateur de modifier les caractéristiques
  - Pas de dépendance à des APIs externes non fiables
- **Message affiché**: "Un profil aléatoire a été créé. MODIFIEZ les caractéristiques pour correspondre à votre image"
- **Fichier**: `src/screens/CreateCharacterScreen.js`

### 3. Amélioration Tierce Personne
- **Problème**: L'IA ne faisait pas parler les tierces personnes dans les conversations
- **Améliorations**:
  - Instructions ajoutées directement dans le prompt système (pas seulement dans l'instruction finale)
  - Détection de tierce personne dans le contexte passé à `buildSimpleSystemPrompt`
  - Section dédiée dans le prompt système quand une tierce personne est active
  - Instructions plus explicites avec exemples de format multi-personnages
- **Format attendu**:
  ```
  [Nom] *action* "parole" (pensée)  <- Pour la tierce personne
  *action* "parole" (pensée)        <- Pour le personnage principal
  ```
- **Fichier**: `src/services/TextGenerationService.js`

## Note Importante sur l'API Vision

**Groq n'a PAS d'API de vision image.** Groq est une API de génération de texte uniquement.

Les APIs de vision disponibles (Pollinations Vision, Google Gemini, Hugging Face BLIP, etc.) ont toutes montré des problèmes de fiabilité:
- Réponses incohérentes
- Erreurs réseau fréquentes
- Descriptions génériques sans rapport avec l'image

**Solution adoptée**: Génération locale de profil + instruction claire pour que l'utilisateur ajuste manuellement les caractéristiques selon son image.

## Fichiers Modifiés
1. `src/screens/ConversationScreen.js` - Fix crash génération image
2. `src/screens/CreateCharacterScreen.js` - Analyse image simplifiée
3. `src/services/TextGenerationService.js` - Support tierce personne amélioré
4. `app.json` - Version 5.4.36, versionCode 176
5. `package.json` - Version 5.4.36

## Build
- Version: 5.4.36
- VersionCode: 176
- Tag: v5.4.36
