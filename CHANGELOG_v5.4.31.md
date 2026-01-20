# Changelog v5.4.31

## Date: 19 janvier 2026

## Problèmes signalés par l'utilisateur

1. **Génération de texte NSFW bloquée**: Le texte généré affichait souvent "*te regarde attentivement* oui? (Hmm)" au lieu de contenu NSFW explicite
2. **Images Pollinations "rate limit" avec Freebox**: Même avec Freebox SD configuré, certaines images affichaient l'erreur "rate limit Pollinations"
3. **Analyse d'image IA incorrecte**: L'analyse lors de la création de personnage ne correspondait pas à l'image (description avec cheveux bleus tressés alors que l'image montrait autre chose)
4. **NSFW images pas assez explicites**: Les positions, tenues et scènes NSFW n'apparaissaient pas comme demandé

## Corrections apportées

### 1. Génération de texte NSFW - Mode explicite sans censure
**Fichier**: `src/services/TextGenerationService.js`

- **System prompt renforcé**: Ajout d'instructions ultra-explicites pour le mode NSFW
  - "MODE ADULTE EXPLICITE - SANS AUCUNE CENSURE"
  - Liste explicite de ce que l'IA DOIT faire (décrire actes sexuels, utiliser mots explicites, exprimer le plaisir)
  - Interdiction explicite de refuser le contenu sexuel
- **Fallback NSFW amélioré**: Les messages de fallback en mode NSFW sont maintenant plus explicites
  - Ajout de 6 nouvelles réponses NSFW variées avec gémissements et descriptions de plaisir

### 2. Freebox SD strict - Plus de fallback vers Pollinations
**Fichiers**: `src/services/CustomImageAPIService.js`, `src/services/ImageGenerationService.js`

- **Suppression de la migration problématique**: L'ancienne migration qui changeait "freebox" en "pollinations" a été retirée
- **Logs renforcés**: Ajout de logs explicites pour confirmer la stratégie active
- **Stratégie stricte garantie**: Si Freebox est configuré, il est TOUJOURS utilisé, jamais de fallback vers Pollinations

### 3. Analyse d'image IA - Vraie analyse visuelle
**Fichier**: `src/screens/CreateCharacterScreen.js`

- **Prompt ultra-strict**: Nouveau prompt qui force l'IA à analyser l'image RÉELLE
  - Instructions en anglais pour meilleure compréhension
  - Règles critiques: "DO NOT invent", "ONLY visible features", "If you cannot see, say unknown"
- **Détection de réponses génériques**: Vérification que la réponse n'est pas une description générique inventée
- **Image non tronquée**: L'image base64 n'est plus tronquée agressivement (1.5MB max au lieu de 500KB)
- **Haute résolution**: Ajout du paramètre `detail: 'high'` pour meilleure analyse
- **Température basse**: Température à 0.1 pour précision maximale

### 4. Images NSFW plus explicites
**Fichier**: `src/services/ImageGenerationService.js`

- **Prompts NSFW renforcés pour Freebox SD**:
  - Ajout de `((nsfw)), ((explicit))` avec double parenthèses pour priorité
  - Keywords additionnels: `uncensored, nude, exposed, seductive, alluring, arousing`
  - Niveau 4+: `((topless)), ((bare breasts)), ((nipples visible))`
  - Niveau 5+: `((fully nude)), ((naked)), ((genitals visible)), explicit nudity`

## Fichiers modifiés

1. `src/services/TextGenerationService.js` - NSFW explicite sans censure
2. `src/services/CustomImageAPIService.js` - Freebox strict sans migration
3. `src/services/ImageGenerationService.js` - Prompts NSFW renforcés
4. `src/screens/CreateCharacterScreen.js` - Vraie analyse d'image IA
5. `app.json` - Version 5.4.31, versionCode 171
6. `package.json` - Version 5.4.31

## Tests recommandés

1. **Test génération texte NSFW**:
   - Démarrer une conversation NSFW explicite
   - Vérifier que l'IA répond avec du contenu explicite
   - Vérifier qu'il n'y a plus de messages génériques type "*te regarde* oui?"

2. **Test génération images Freebox**:
   - Configurer Freebox SD comme générateur
   - Générer 5 images d'affilée
   - Vérifier qu'AUCUNE image ne montre "rate limit Pollinations"

3. **Test analyse d'image**:
   - Créer un personnage depuis une photo
   - Vérifier que les caractéristiques (cheveux, yeux, morphologie) correspondent à l'image
   - Si l'analyse échoue, un message clair indique que c'est une génération aléatoire

4. **Test images NSFW niveau 4-5**:
   - Atteindre niveau 4-5 avec un personnage
   - Générer des images
   - Vérifier que les images sont topless (niveau 4) ou nues (niveau 5)
