# Changelog v5.4.28 - Fixes Générateur et Poses NSFW

## Date: 20 Janvier 2026

## Corrections Critiques

### 1. Génération Multiple avec Freebox SD - CORRIGÉ

**Problème:** Lors de la génération de 5 images avec Freebox SD configuré, seule 1 image était créée et les autres affichaient "rate limit Pollinations".

**Cause:** Plusieurs fonctions utilisaient encore Pollinations comme fallback:
- `generateWithLocal` appelait `generateWithFreebox` (qui n'existait pas)
- `generateWithFallbackAPI` créait toujours des URLs Pollinations

**Corrections:**
- `generateWithLocal`: Remplacé les appels à `generateWithFreebox` par `generateWithFreeboxSD`
- `generateWithFallbackAPI`: Vérifie maintenant la stratégie sélectionnée et utilise Freebox SD si configuré

### 2. Analyse d'Image - Message Amélioré

**Problème:** L'analyse affichait un profil aléatoire sans tenir compte de l'image.

**Solution:** 
- Message d'alerte amélioré expliquant clairement que l'utilisateur doit vérifier et ajuster manuellement les caractéristiques
- Instructions explicites pour modifier: genre, cheveux, yeux, morphologie, âge

### 3. Nouvelles Poses Ultra-Sexy NSFW (40+)

**Poses ajoutées (niveau 2):**
- Allongée sur lit avec poitrine remontée et bien apparente
- Assise sur chaise avec jambes grand écartées montrant culotte
- Penchée en avant laissant voir culotte par derrière
- Mains sous la poitrine la remontant
- À quatre pattes avec fesses en l'air
- Écartant les jambes au sol
- À genoux cuisses écartées
- Assise genoux remontés culotte visible
- Chevauchant une chaise face caméra
- Debout penchée touchant orteils
- Position de chevauchement avec hanches en avant
- Tirant sur culotte pour montrer

### 4. Nouvelles Tenues Hyper-Sexy (15+)

**Tenues ajoutées:**
- Mini-jupe laissant apparaître fesses et culotte
- Déshabillé transparent (corps entièrement visible)
- Nuisette sexy transparente
- Mini-jupe en cuir moulante
- Combinaison latex brillante
- Lingerie cuir style bondage
- Robe ultra-moulante seconde peau
- Bas sexy avec porte-jarretelles (sans culotte)
- Robe filet (corps visible à travers)
- String bikini micro
- Peignoir ouvert seins visibles
- Body avec découpes aux seins
- Bikini mouillé transparent
- Pantalon cuir moulant
- Corset seul

### 5. Negative Prompts Renforcés - Défauts Anatomiques

**Nouveaux défauts bloqués:**
- Seins et fesses visibles ensemble de face (impossible anatomiquement)
- Fesses visibles de face
- Bras à la place des seins
- Seins dans le dos
- Seins supplémentaires
- Membres partant de mauvais endroits
- Corps tourné dans deux directions
- Tête à l'envers
- Seins sur les bras
- Seins à différentes hauteurs
- Parties du corps mal positionnées

## Fichiers Modifiés

- `src/services/ImageGenerationService.js`:
  - Fix `generateWithLocal` → `generateWithFreeboxSD`
  - Fix `generateWithFallbackAPI` respecte la stratégie
  - 40+ nouvelles poses NSFW
  - 15+ nouvelles tenues sexy
  - Negative prompts anatomiques renforcés

- `src/screens/CreateCharacterScreen.js`:
  - Message d'analyse amélioré avec instructions claires

- `app.json` - Version 5.4.28, versionCode 168
- `package.json` - Version 5.4.28

## Notes d'Utilisation

### Génération Multiple avec Freebox
1. Configurer Freebox SD dans les paramètres
2. Appuyer sur 🎨 et choisir le nombre d'images
3. TOUTES les images seront générées via Freebox SD
4. Plus de fallback vers Pollinations

### Création de Personnage
1. Importer une image depuis galerie/caméra
2. Appuyer "Analyser" pour générer un profil
3. **IMPORTANT**: Vérifier et modifier les champs pour correspondre à l'image
4. L'analyse automatique génère un profil de base à personnaliser
