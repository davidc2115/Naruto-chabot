# Changelog v5.4.18 - FIX: Tenues et Poses NSFW Préservées

## Date: 20 Janvier 2026

## Problème Résolu

Les tenues et poses NSFW générées par `getOutfitByLevel()` et `getPoseByLevel()` n'étaient pas utilisées par les générateurs Pollinations AI et Freebox SD. Les fonctions reconstruisaient le prompt depuis zéro, perdant ainsi le contenu NSFW.

## Cause Racine

Le flux était:
1. `generateSceneImage()` construit un prompt avec tenues/poses NSFW via `getOutfitByLevel(level)` et `getPoseByLevel(level)`
2. Ce prompt est passé à `generateImage()` puis à `generateWithPollinations()` ou `generateWithFreeboxSD()`
3. **BUG:** Ces fonctions reconstruisaient le prompt depuis zéro au lieu d'utiliser celui déjà construit

## Corrections

### generateWithPollinations()
- **Nouvelle détection** du contenu NSFW dans le prompt reçu
- Si le prompt contient déjà des tenues/poses NSFW → **utilisation directe**
- Mots-clés détectés: lingerie, topless, nude, naked, breasts, nipples, panties, bra, thong, corset, stockings, garter, bodysuit, negligee, sensual, provocative, cleavage, erotic, explicit
- Log: `🔞 v5.4.18: Prompt NSFW COMPLET détecté - utilisation directe`

### generateWithFreeboxSD()
- Même logique de détection et préservation du prompt NSFW
- Log: `🔞 v5.4.18: Prompt NSFW COMPLET détecté pour Freebox - utilisation directe`

## Flux Corrigé

```
generateSceneImage(character, level=4)
    ↓
getOutfitByLevel(4) → "topless, bare breasts fully visible, wearing only lace panties"
getPoseByLevel(4) → "confident topless pose, hands on hips, seductive expression"
    ↓
prompt = "[NSFW_LEVEL_4] ... topless, bare breasts ... confident topless pose ..."
    ↓
generateImage(prompt, character)
    ↓
generateWithPollinations(prompt, character)
    ↓
✅ Détection: "topless" + "breasts" trouvés → utilisation DIRECTE du prompt
    ↓
URL Pollinations avec prompt NSFW complet
```

## Tenues Par Niveau (rappel)

- **Niveau 1:** Habillé sexy (robes, jupes, décolletés)
- **Niveau 2:** Provocant (nuisettes, mini-jupes, transparences)
- **Niveau 3:** Lingerie (bodysuits, corsets, bas)
- **Niveau 4:** Topless (seins nus, panties)
- **Niveau 5:** Nu artistique (complètement nue)
- **Niveau 6+:** De plus en plus explicite

## Poses Par Niveau (rappel)

- **Niveau 1:** Poses aguichantes (debout confiante, jambes croisées)
- **Niveau 2:** Poses sexy (penchée en avant, mini-jupe remontée)
- **Niveau 3:** Poses lingerie (sur le lit, regardant par-dessus l'épaule)
- **Niveau 4:** Poses topless (confiante seins nus, mains sur hanches)
- **Niveau 5:** Poses nues artistiques (allongée sur soie, position gracieuse)
- **Niveau 6+:** Poses de plus en plus explicites

## Fichiers Modifiés
- `src/services/ImageGenerationService.js`:
  - `generateWithPollinations()` - Détection et préservation prompt NSFW
  - `generateWithFreeboxSD()` - Même logique
- `app.json` - Version 5.4.18, versionCode 158
- `package.json` - Version 5.4.18
