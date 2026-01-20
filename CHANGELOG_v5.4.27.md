# Changelog v5.4.27 - Respect du Générateur et Images Multiples

## Date: 20 Janvier 2026

## Corrections Majeures

### 1. Respect du Générateur Sélectionné

**Problème:** Quand Stable Diffusion sur Freebox était sélectionné, l'application utilisait quand même Pollinations comme fallback automatique.

**Solution:** 
- Le générateur sélectionné (Freebox SD, Pollinations, ou Local) est maintenant **strictement respecté**
- Plus de fallback automatique vers Pollinations quand Freebox est configuré
- Si Freebox échoue, l'application réessaie avec Freebox (avec un seed différent)
- Le fallback vers Pollinations ne se fait **que** si Pollinations ou "auto" est sélectionné

```javascript
// Avant: Fallback automatique vers Pollinations
console.log('🔄 Fallback sur Pollinations AI...');
return await this.generateWithPollinations(prompt, character);

// Après: Respect de la stratégie sélectionnée
if (strategy === 'freebox') {
  console.log('🏠 Freebox sélectionné - Réessai avec Freebox (pas de fallback)...');
  return await this.generateWithFreeboxSD(prompt, character);
}
```

### 2. Génération Multiple d'Images

**Nouvelle fonctionnalité:** Possibilité de générer plusieurs images à la fois (1, 3 ou 5).

#### Comment ça marche:
1. Appuyer sur le bouton 🎨
2. Un menu s'affiche avec les options:
   - **1 image** - Génération rapide
   - **3 images** - Génération moyenne
   - **5 images** - Génération complète
3. Les images sont générées une par une avec un compteur de progression
4. Toutes les images sont automatiquement sauvegardées dans la galerie

#### Caractéristiques:
- **Compteur visuel** affiché pendant la génération (1/3, 2/3, 3/3)
- **Variations automatiques** - Chaque image a une légère variation pour plus de diversité:
  - Angle légèrement différent
  - Pose alternative
  - Éclairage varié
  - Perspective changée
  - Atmosphère différente
- **Délai anti-rate-limit** de 1.5 secondes entre chaque image
- **Message récapitulatif** à la fin: "3/3 images générées et ajoutées à la galerie"

#### Nouvelle fonction `generateMultipleImages`:
```javascript
async generateMultipleImages(prompt, character, count, onProgress) {
  // Génère N images avec variations
  // Retourne un array d'URLs
}
```

## Fichiers Modifiés

- `src/services/ImageGenerationService.js`:
  - Suppression du fallback automatique vers Pollinations
  - Ajout de `generateMultipleImages()` 
  - Ajout de `getPromptVariation()` pour les variations

- `src/screens/ConversationScreen.js`:
  - Nouveau menu de sélection du nombre d'images
  - États `imageGenerationCount` et `totalImagesToGenerate`
  - Compteur visuel dans le bouton pendant la génération
  - Nouveaux styles pour l'affichage du compteur

- `app.json` - Version 5.4.27, versionCode 167
- `package.json` - Version 5.4.27

## Notes d'Utilisation

### Configuration du Générateur
Pour utiliser **uniquement** Freebox SD:
1. Aller dans Paramètres > Génération d'images
2. Sélectionner "Stable Diffusion Freebox"
3. L'application utilisera UNIQUEMENT ce générateur

### Génération Multiple
- La génération de 5 images prend environ 30-45 secondes
- Les images sont variées mais conservent le style et le personnage
- Toutes les images apparaissent dans la galerie du personnage
