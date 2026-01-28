# Changelog v5.4.19 - FIX CRITIQUE: Tenues et Positions NSFW

## Date: 19 janvier 2026

## Problème Identifié

Les tenues et positions NSFW (définies par `getOutfitByLevel` et `getPoseByLevel`) n'apparaissaient pas lors de la génération d'images, même si elles étaient correctement ajoutées au prompt par `generateSceneImage`.

### Cause Racine

Dans `generateWithPollinations` et `generateWithFreeboxSD`, la logique de détection NSFW utilisait deux conditions:
1. `isNSFW` - basé sur le marker `[NSFW_LEVEL_X]`
2. `hasNSFWContent` - recherche de mots-clés comme "lingerie", "nude", "breasts", etc.

**Le problème**: Les tenues de niveau 2 (comme "tight red velvet mini dress", "black satin slip dress", "silky nightgown") NE CONTIENNENT PAS ces mots-clés NSFW explicites! 

Résultat: La condition `isNSFW && hasNSFWContent` échouait, et le code reconstruisait le prompt depuis zéro, ÉCRASANT les tenues et poses soigneusement définies par `getOutfitByLevel(level)` et `getPoseByLevel(level)`.

### Exemples de Tenues Niveau 2 Non-Détectées
- "tight red velvet mini dress with corset top" 
- "sequin mini dress with deep V neckline"
- "black satin slip dress clinging to body"
- "silky black short nightgown"
- "tight black catsuit with zipper front"

Ces tenues sont NSFW mais ne contiennent pas les mots "lingerie", "nude", "breasts", etc.

## Solution Implémentée (v5.4.19)

### Fix Critique: Le Marker `[NSFW_LEVEL_X]` est AUTORITATIF

Le marker `[NSFW_LEVEL_X]` est ajouté par `generateSceneImage` APRÈS avoir intégré les tenues et poses correctes. Si ce marker est présent, nous DEVONS utiliser le prompt tel quel.

### Changements dans `generateWithPollinations`:

```javascript
// AVANT (v5.4.18)
if (isNSFW && hasNSFWContent) {
  // Utiliser le prompt directement
} else {
  // Reconstruire le prompt (BUG: écrasait les tenues!)
}

// APRÈS (v5.4.19)
if (isNSFW) {
  // Si le marker est présent, utiliser le prompt DIRECTEMENT
  // Le marker signifie que generateSceneImage a déjà ajouté les bonnes tenues/poses
  console.log(`🔞 v5.4.19 FIX: MARKER [NSFW_LEVEL_${nsfwLevel}] DÉTECTÉ`);
  console.log(`🔞 UTILISATION DIRECTE du prompt original`);
}
```

### Changements dans `generateWithFreeboxSD`:

Même logique appliquée - si `isNSFW` (marker détecté), utiliser le prompt directement.

### Améliorations Supplémentaires

1. **Meilleurs logs** pour déboguer:
   - Affiche le niveau NSFW détecté
   - Affiche les 500 premiers caractères du prompt pour vérifier les tenues/poses

2. **Paramètres anti-défauts** ajoutés:
   - `anatomically correct, perfect anatomy`
   - `(one person:1.2), correct number of limbs`
   - `five fingers on each hand, two arms, two legs`

3. **Mots-clés niveau 2 ajoutés** (fallback pour prompts sans marker):
   - `nightgown`, `catsuit`, `mini dress`, `slip dress`
   - `fishnet`, `sheer`

## Flux Correct Maintenant

1. **ConversationScreen** appelle `ImageGenerationService.generateSceneImage(character, profile, messages, level)`
2. **generateSceneImage** appelle:
   - `getOutfitByLevel(level)` → Tenue appropriée au niveau (ex: lingerie niveau 3, topless niveau 4)
   - `getPoseByLevel(level)` → Pose appropriée au niveau
   - Ajoute le marker: `[NSFW_LEVEL_${level}]` + prompt complet
3. **generateImage** dispatch vers `generateWithPollinations` ou `generateWithFreeboxSD`
4. **generateWithPollinations/FreeboxSD** détecte le marker et utilise le prompt DIRECTEMENT

## Tenues Par Niveau (Rappel)

| Niveau | Type | Exemples |
|--------|------|----------|
| 1 | Habillé sexy | Robes cocktail, décolletés, jupes |
| 2 | Provocant | Mini dress, nightgown, catsuit, nuisettes |
| 3 | Lingerie | Soutien-gorge + culotte, corset, porte-jarretelles |
| 4 | Topless | Seins nus + culotte |
| 5 | Nu artistique | Complètement nue |
| 6+ | Explicite | Poses érotiques de plus en plus explicites |

## Fichiers Modifiés

- `src/services/ImageGenerationService.js`
  - `generateWithPollinations()` - Fix critique
  - `generateWithFreeboxSD()` - Fix critique
- `app.json` - Version 5.4.19, versionCode 159
- `package.json` - Version 5.4.19

## Tests Recommandés

1. Créer une conversation avec un personnage
2. Monter au niveau 2 avec ce personnage
3. Générer une image
4. Vérifier que la tenue correspond au niveau (mini dress, nightgown, etc.)
5. Répéter pour niveaux 3, 4, 5

## Notes Techniques

Le marker `[NSFW_LEVEL_X]` est la source de vérité. Il indique que:
- Le prompt vient de `generateSceneImage`
- Les tenues/poses ont été ajoutées via `getOutfitByLevel` et `getPoseByLevel`
- Le contenu est prêt pour la génération NSFW
