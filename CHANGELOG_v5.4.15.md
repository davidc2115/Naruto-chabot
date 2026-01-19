# Changelog v5.4.15 - Support Images Duo/Trio

## Date: 19 Janvier 2026

## Problèmes Résolus

### Problème 1: Une seule personne affichée au niveau 2+
Les personnages duo/trio (deux femmes, deux hommes, ou couple) n'affichaient qu'une seule personne dans les images générées à partir du niveau 2. Le niveau 1 fonctionnait correctement car il utilisait l'imagePrompt original.

### Problème 2: Erreur "Impossible de générer d'images" sur la fiche duo
La page de profil (fiche) des personnages duo générait une erreur car le code tentait de traiter les duos comme des personnages solo.

### Problème 3 (CRITIQUE): Méthode generateImageWithPollinations inexistante
Le code appelait `this.generateImageWithPollinations()` qui n'existait pas, causant l'erreur "Impossible de générer".

## Cause Racine
1. Les prompts de génération d'images contenaient des instructions explicites "single person", "one person", "solo"
2. La fonction generateCharacterImage() n'avait pas de chemin dédié pour les duos
3. **La méthode `generateImageWithPollinations` n'existait pas** - il fallait utiliser `this.generateImage()`

## Corrections Apportées

### 1. Nouvelle méthode isDuoOrTrioCharacter(character)
Détecte automatiquement les personnages duo/trio en vérifiant :
- character.type === 'threesome'
- character.gender contient 'duo' ou 'couple'
- Le nom contient '&' ou 'et' (ex: "Léa & Sofia")
- Les tags incluent 'duo', 'couple', 'plan à trois', 'trio'

### 2. Nouveau prompt anatomique anatomyDuoPrompt
Remplace le prompt "exactement UNE personne" par un prompt optimisé pour deux personnes distinctes.

### 3. Nouvelle méthode buildDuoPrompt(character, level, isRealistic)
Génère des prompts spécifiques pour les duos selon le niveau :
- Niveau 2 (Provocant) : Lingerie assortie, poses intimes
- Niveau 3 (Lingerie) : Dentelle, ambiance boudoir
- Niveau 4 (Topless) : Étreinte artistique, partiellement nu
- Niveau 5 (Nu) : Nus ensemble, scène de lovers

### 4. Modification de generateSceneImage()
- Détection des duos au début de la fonction
- Retour anticipé avec prompt duo spécialisé
- Utilisation de anatomyDuoPrompt 

### 5. Modification de generateCharacterImage() - FIX FICHE DUO
- Ajout d'un chemin de génération DÉDIÉ pour les profils duo
- Retour anticipé avant le traitement solo
- Utilisation directe de character.imagePrompt et character.appearance
- Poses SFW duo : "standing together", "sitting together", etc.
- Prompt anatomique duo + qualité adaptée
- Suppression du code mort (vérifications duo après le retour anticipé)

### 6. FIX CRITIQUE - Méthode de génération correcte
- **Remplacement de `generateImageWithPollinations()` par `generateImage()`**
- Cette méthode n'existait pas, causant l'erreur "Impossible de générer"
- Appliqué à generateCharacterImage() ET generateSceneImage() pour les duos

## Personnages Affectés
Tous les personnages avec :
- type: 'threesome'
- gender: 'duo_female' (ex: Léa & Sofia, Chloé & Margot)
- gender: 'duo_male' (ex: Marcus & Antoine, Théo & Lucas)
- gender: 'couple' (ex: Maxime & Clara, Alexandre & Inès)

## Test
- Fiche (profil) : Image générée avec les deux personnages visibles
- Niveau 1 : Les deux personnages apparaissent
- Niveau 2+ : Les deux personnages apparaissent avec tenues NSFW appropriées

## Fichiers Modifiés
- src/services/ImageGenerationService.js : Ajout de la détection et génération duo
- app.json : Version 5.4.15, versionCode 155
- package.json : Version 5.4.15
