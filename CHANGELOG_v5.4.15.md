# Changelog v5.4.15 - Support Images Duo/Trio

## Date: 19 Janvier 2026

## Problème Résolu
Les personnages duo/trio (deux femmes, deux hommes, ou couple) n'affichaient qu'une seule personne dans les images générées à partir du niveau 2. Le niveau 1 fonctionnait correctement car il utilisait l'`imagePrompt` original.

## Cause Racine
Les prompts de génération d'images contenaient des instructions explicites "single person", "one person", "solo" qui écrasaient la description duo du personnage :
- `anatomyStrictPrompt` : "exactly ONE person..."
- Qualité réaliste : "single person only, one subject"
- Qualité anime : "single character, solo, one person"

## Corrections Apportées

### 1. Nouvelle méthode `isDuoOrTrioCharacter(character)`
Détecte automatiquement les personnages duo/trio en vérifiant :
- `character.type === 'threesome'`
- `character.gender` contient 'duo' ou 'couple'
- Le nom contient '&' ou 'et' (ex: "Léa & Sofia")
- Les tags incluent 'duo', 'couple', 'plan à trois', 'trio'

### 2. Nouveau prompt anatomique `anatomyDuoPrompt`
Remplace le prompt "exactement UNE personne" par :
```
ANATOMICALLY PERFECT TWO PEOPLE:
exactly TWO distinct persons shown together, both with proper anatomy,
each person has TWO arms, TWO legs, TWO hands with FIVE fingers each,
each person has ONE head, ONE face, TWO eyes, ONE nose, ONE mouth,
two distinct bodies, not merged, clearly separated individuals,
both persons fully visible, interacting naturally,
proper proportions for both, natural poses together
```

### 3. Nouvelle méthode `buildDuoPrompt(character, level, isRealistic)`
Génère des prompts spécifiques pour les duos selon le niveau :
- **Niveau 2 (Provocant)** : Lingerie assortie, poses intimes
- **Niveau 3 (Lingerie)** : Dentelle, ambiance boudoir
- **Niveau 4 (Topless)** : Étreinte artistique, partiellement nu
- **Niveau 5 (Nu)** : Nus ensemble, scène de lovers

Inclut aussi :
- Localisations romantiques (chambre luxueuse, hôtel, lit en soie)
- Poses duo spécifiques (embrassés, enlacés, sur le lit ensemble)

### 4. Modification de `generateSceneImage()`
- Détection des duos au début de la fonction
- Branchement vers `buildDuoPrompt()` pour les personnages duo
- Utilisation de `anatomyDuoPrompt` au lieu de `anatomyStrictPrompt`
- Le prompt négatif exclut "three or more people" au lieu de "two people"

### 5. Modification de `generateCharacterImage()`
- Détection des duos pour les images de profil
- Gestion appropriée du genre pour duo_female, duo_male, couple
- Utilisation des descriptions complètes (appearance, imagePrompt)

## Personnages Affectés
Tous les personnages avec :
- `type: 'threesome'`
- `gender: 'duo_female'` (ex: Léa & Sofia, Chloé & Margot)
- `gender: 'duo_male'` (ex: Marcus & Antoine, Théo & Lucas)
- `gender: 'couple'` (ex: Maxime & Clara, Alexandre & Inès)

## Test
- Niveau 1 : Les deux personnages apparaissent (comme avant)
- Niveau 2+ : Les deux personnages apparaissent maintenant ensemble avec les tenues NSFW appropriées

## Fichiers Modifiés
- `src/services/ImageGenerationService.js` : Ajout de la détection et génération duo
- `app.json` : Version 5.4.15, versionCode 155
- `package.json` : Version 5.4.15
