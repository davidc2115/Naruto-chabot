# Changelog v5.4.30 - Analyse d'image réelle et Freebox SD strict

## Date: 2026-01-19

## Problèmes corrigés

### 1. Analyse d'image IA ne ressemble pas au personnage
- **Problème**: L'analyse IA générait un profil aléatoire sans regarder l'image
- **Solution v5.4.30**: VRAIE analyse d'image avec API Vision
  - Utilise Pollinations Vision (GPT-4o) pour analyser l'image réellement
  - L'image est convertie en base64 et envoyée à l'API
  - L'IA décrit ce qu'elle VOIT dans l'image
  - Fallback vers Claude Vision si GPT-4o échoue
  - Message clair indiquant si l'analyse est réelle ou un profil généré

### 2. Génération multiple: seulement 1 image au lieu de 5, erreur "rate limit Pollinations"
- **Problème**: Freebox SD configuré mais Pollinations était quand même utilisé
- **Solution v5.4.30**: Respect STRICT de la stratégie sélectionnée
  - Si Freebox est configuré, UNIQUEMENT Freebox est utilisé
  - Aucun fallback vers Pollinations quand Freebox est sélectionné
  - Nouvelle fonction `generateWithLocalStrict` qui ne fallback pas vers Pollinations
  - Fonction `generateWithFallbackAPI` respecte maintenant la stratégie
  - Les retries utilisent la MÊME stratégie, pas un fallback

## Changements techniques

### CreateCharacterScreen.js - `analyzeImageWithAI()`
- **ÉTAPE 1**: Conversion de l'image en base64
  - Support fichiers locaux (`file://`)
  - Support URLs externes (téléchargement)
  - Support images data:image
  
- **MÉTHODE 1**: Pollinations Vision API (GPT-4o)
  - Envoie l'image avec un prompt précis
  - Demande une analyse JSON structurée
  - Température basse (0.3) pour précision
  - Timeout 60 secondes

- **MÉTHODE 2**: Claude Vision (fallback)
  - Si GPT-4o échoue, essaie Claude
  - Même format de réponse attendu

- **MÉTHODE 3**: Génération locale (dernier recours)
  - Seulement si les APIs vision échouent
  - Message d'alerte différent pour l'utilisateur

### ImageGenerationService.js - `generateImage()`
- **Stratégie STRICTE**: Le switch respecte maintenant la stratégie sans exception
- **Pas de fallback croisé**: 
  - Freebox ne tombe JAMAIS vers Pollinations
  - Local tombe vers Freebox (pas Pollinations)
- **Validation conditionnelle**: 
  - URLs Freebox ne sont pas validées (génération à la volée)
  - Seulement Pollinations est validé

### ImageGenerationService.js - Nouvelles fonctions
- `generateWithLocalStrict()`: Génération locale qui fallback vers Freebox
- `generateWithFallbackAPI()` mis à jour: Respecte la stratégie configurée

## Flux de génération selon stratégie

### Stratégie "freebox"
```
generateImage() 
  → generateWithFreeboxSD() 
  → Si erreur: retry avec Freebox (seed différent)
  → JAMAIS Pollinations
```

### Stratégie "local"
```
generateImage() 
  → generateWithLocalStrict() 
  → Si local non disponible: Freebox SD
  → JAMAIS Pollinations
```

### Stratégie "pollinations"
```
generateImage() 
  → generateWithPollinations()
  → Si erreur: retry avec Pollinations
```

## Tests recommandés

### Test 1: Analyse d'image réelle
1. Aller dans Créer un personnage
2. Importer une image depuis la galerie
3. Appuyer sur "Analyser"
4. Vérifier que les caractéristiques correspondent à l'image:
   - Couleur des cheveux
   - Couleur des yeux
   - Genre
   - Morphologie

### Test 2: Génération multiple Freebox
1. Configurer Freebox SD dans les paramètres
2. Aller dans une conversation
3. Générer 5 images
4. Vérifier:
   - 5 images générées (pas 1)
   - Aucun message "rate limit Pollinations"
   - Toutes les images viennent de Freebox

### Test 3: Pas de fallback Pollinations
1. Configurer Freebox SD
2. Débrancher la Freebox (simuler erreur)
3. Tenter de générer une image
4. Vérifier: erreur Freebox, PAS d'image Pollinations
