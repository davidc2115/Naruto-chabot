# Changelog v5.4.39 - Améliorations Complètes

## Date: 19 janvier 2026

## Changements

### 1. Couleur des Paroles (Fix)
- **Problème**: Les paroles apparaissaient parfois en noir, parfois en gris
- **Solution**: Couleur fixée à `#000000` (noir) pour toutes les paroles du personnage
- Texte normal aussi en noir pour cohérence
- **Fichier**: `src/screens/ConversationScreen.js`

### 2. API Vision Pollinations (GRATUITE)
- **Nouvelle implémentation**: Vraie analyse d'image avec Pollinations Vision (GPT-4o)
- Convertit l'image en base64
- Envoie à l'API avec le modèle `openai` (vision)
- Détecte: genre, âge, cheveux, yeux, teint, morphologie, poitrine
- Fallback: génération locale si l'API échoue
- **Fichier**: `src/screens/CreateCharacterScreen.js`

### 3. Génération d'Images NSFW
- Les modèles Pollinations et Freebox SD sont configurés avec `safe=false`
- Tenues par niveau (lingerie → topless → nude → explicite)
- Poses sensuelles, provocantes et intimes
- Angles variés (vue de face, de dos, d'en haut, intime)
- Arrière-plans variés (lit, canapé, douche, etc.)
- Anti-défauts anatomiques renforcés
- **Fichier**: `src/services/ImageGenerationService.js`

### 4. Support Tierce Personne
- Détection automatique des tierces personnes (ma fille, ma mère, mon ami, etc.)
- Instructions au modèle pour faire parler la tierce personne
- Format: `[Nom] *action* "parole" (pensée)`
- Ajouté dans le system prompt ET l'instruction finale
- **Fichier**: `src/services/TextGenerationService.js`

### 5. Génération de Texte par Personnage
- **Tempérament**: Influence la vitesse de progression NSFW
  - Timide: très lent, résiste
  - Séducteur: rapide
  - Dominant: très rapide
- **Sexualité**: Limites et refus personnalisés
  - Peut refuser certains actes (anal, brutalité, etc.)
  - Virginité configurable
  - Type de relation (sérieux, casual, etc.)
- **Scénario**: Contexte de départ respecté
- **Fichier**: `src/services/TextGenerationService.js`

### 6. Mode SFW/NSFW Adaptatif
- Détection du mode basée sur les mots-clés
- **SFW forcé** si dernier message contient: bonjour, travail, film, famille, etc.
- **NSFW activé** si mots explicites: sexe, nu, baise, etc.
- **Retour possible** du NSFW vers SFW si l'utilisateur change de sujet
- Multiplicateur de tempérament appliqué
- **Fichier**: `src/services/TextGenerationService.js`

## Configuration NSFW

### Pollinations AI
- URL: `https://image.pollinations.ai/prompt/`
- Paramètres: `model=flux`, `safe=false`, `enhance=true`
- NSFW: Activé sans censure

### Freebox SD
- URL: `http://88.174.155.230:33437/generate`
- Modèle: Stable Diffusion local
- NSFW: Activé sans censure

## Fichiers Modifiés
1. `src/screens/ConversationScreen.js` - Couleurs texte
2. `src/screens/CreateCharacterScreen.js` - API Vision
3. `src/services/TextGenerationService.js` - Tierce personne + tempérament
4. `app.json` - Version 5.4.39, versionCode 179
5. `package.json` - Version 5.4.39

## Build
- Version: 5.4.39
- VersionCode: 179
- Tag: v5.4.39
