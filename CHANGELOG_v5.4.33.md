# Changelog v5.4.33

## Date: 20 janvier 2026

## Amélioration majeure: Analyse d'image multi-API robuste

### Problème signalé
L'analyse d'image lors de la création de personnage affichait toujours "impossible d'analyser, un profil aléatoire a été généré". Les APIs précédentes (Pollinations) ne fonctionnaient pas correctement pour l'analyse d'image.

### Solution implémentée

**Fichier**: `src/screens/CreateCharacterScreen.js`

Réécriture complète de la fonction `analyzeImageWithAI()` avec 5 méthodes de fallback:

#### Méthode 1: Hugging Face BLIP
- API gratuite et fiable de Salesforce
- Modèle: `blip-image-captioning-large`
- Génère une description textuelle de l'image
- Extraction automatique des caractéristiques (genre, cheveux, âge, etc.)

#### Méthode 2: Hugging Face BLIP-2
- Version améliorée plus détaillée
- Modèle: `blip2-opt-2.7b`
- Meilleure compréhension contextuelle

#### Méthode 3: Pollinations Vision amélioré
- Prompt simplifié pour réponses directes
- Format: "gender,hairColor,hairLength,age,skinTone,bodyType"
- Modèle: `gpt-4o`

#### Méthode 4: Google Gemini Vision
- API gratuite de Google
- Modèle: `gemini-pro-vision`
- Analyse d'image native

#### Méthode 5: Génération locale (fallback ultime)
- Utilisé uniquement si toutes les APIs échouent
- Génération aléatoire avec message d'avertissement

### Nouvelles fonctions helpers

#### `extractFeaturesFromCaption(caption)`
Extrait les caractéristiques d'une description en anglais:
- Genre: détecte "man", "woman", "male", "female", etc.
- Couleur cheveux: "blonde", "brunette", "black hair", "red", etc.
- Longueur cheveux: "long hair", "short hair", "medium"
- Âge: détecte les chiffres ou mots-clés ("young", "mature")
- Teint: "dark skin", "tan", "pale", "fair"
- Morphologie: "slim", "curvy", "athletic", etc.

#### `parseSimpleResponse(text)`
Parse les réponses simplifiées des APIs:
- Format flexible pour différents formats de réponse
- Extraction robuste même avec des réponses partielles

### Caractéristiques détectées

| Caractéristique | Valeurs possibles |
|-----------------|-------------------|
| Genre | male, female |
| Couleur cheveux | noir, brun, blond, roux, blanc, rose, bleu |
| Longueur cheveux | courts, mi-longs, longs |
| Couleur yeux | marron, noisette, vert, bleu, gris, noir |
| Teint | très claire, claire, mate, bronzée, caramel, ébène |
| Morphologie | mince, élancée, moyenne, athlétique, voluptueuse, ronde |
| Taille poitrine | A, B, C, D, DD, E, F |
| Âge | 18-80 ans |

### Message de succès amélioré
Affiche maintenant la méthode utilisée:
```
✅ Image analysée
L'image a été analysée avec succès (méthode: BLIP).
Les caractéristiques physiques ont été extraites de votre image.
⚠️ Vérifiez et ajustez si nécessaire.
```

### Ordre de priorité des APIs

1. **BLIP** (Hugging Face) - Plus rapide, gratuit illimité
2. **BLIP-2** (Hugging Face) - Plus détaillé
3. **Pollinations Vision** - GPT-4o avec prompt simple
4. **Google Gemini** - API native de vision
5. **Local** - Génération aléatoire (dernier recours)

### Fichiers modifiés

1. `src/screens/CreateCharacterScreen.js`:
   - Réécriture de `analyzeImageWithAI()`
   - Nouvelle fonction `extractFeaturesFromCaption()`
   - Nouvelle fonction `parseSimpleResponse()`
2. `app.json` - Version 5.4.33, versionCode 173
3. `package.json` - Version 5.4.33

### Tests recommandés

1. Créer un personnage depuis la galerie avec une photo de personne
2. Vérifier que l'analyse détecte correctement:
   - Le genre (homme/femme)
   - La couleur des cheveux
   - La longueur des cheveux
   - L'âge approximatif
3. Le message de succès doit afficher la méthode utilisée (BLIP, BLIP-2, etc.)
