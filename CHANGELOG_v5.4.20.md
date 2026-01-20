# Changelog v5.4.20 - Angles Intimes, Correction Morphologie et Édition Personnages

## Date: 19 janvier 2026

## Nouvelles Fonctionnalités

### 1. Angles de Caméra Intimes et Variés (NSFW)

Nouveaux angles de caméra selon le niveau de relation:

#### Niveau 2 - Angles Provocants
- Corps entier en robe moulante
- Penchée en avant montrant le décolleté
- Assise jambes croisées, jupe remontant
- Vue de dos regardant par-dessus l'épaule

#### Niveau 3 - Angles Sensuels (Lingerie)
- Corps entier en lingerie, courbes mises en valeur
- Allongée sur le lit en sous-vêtements
- Devant un miroir en sous-vêtements
- En train de se déshabiller

#### Niveau 4 - Angles Intimes (Topless)
- Focus sur la poitrine nue
- Vue du dessus sur le corps topless
- Vue de dos, fesses mises en valeur
- Penchée en avant, fesses visibles

#### Niveau 5+ - Angles Explicites
- Vue entre les jambes écartées
- POV intime explicite
- Vue close-up sur les parties intimes
- Position doggy, vue arrière
- Jambes écartées, exposition complète

### 2. Correction des Morphologies Incorrectes

**Problème résolu**: Certains personnages apparaissaient avec des rondeurs non prévues dans leur description.

**Cause**: La détection de morphologie était trop agressive et matchait sur des mots comme "milf", "mature", "formes" dans les tags ou noms.

**Solution**:
- Le champ `bodyType` explicite du personnage est maintenant PRIORITAIRE
- La détection par mots-clés est limitée à `physicalDescription` seulement
- Les tags "milf", "mature" ne forcent plus une morphologie ronde
- Mapping explicite pour tous les types de corps (mince, élancée, athlétique, voluptueuse, etc.)

### 3. Édition des Personnages Intégrés

Nouvelle fonctionnalité permettant de modifier TOUS les personnages (pas seulement les personnages custom):

- **Bouton "Modifier"** visible sur toutes les fiches personnage
- **Modifications sauvegardées localement** pour les personnages intégrés
- Possibilité de modifier:
  - Description physique
  - Tempérament et personnalité
  - Scénario et message de départ
  - Tags

### 4. Tags Personnalisables pour les Personnages Custom

- Nouveau champ "Tags" dans l'écran de création de personnage
- Tags séparés par des virgules
- Exemples: romantique, aventurier, milf, dominant, timide, fantasy...

## Fichiers Modifiés

### `src/services/ImageGenerationService.js`
- Nouveau tableau `intimateAngles` avec angles NSFW variés
- Modification de `generateSceneImage`: sélection d'angles selon le niveau
- Modification de `parsePhysicalDescription`: priorité au `bodyType` explicite
- Désactivation de la détection automatique "maternal" pour éviter les faux positifs

### `src/screens/CharacterDetailScreen.js`
- Bouton "Modifier" visible pour TOUS les personnages
- Passage du flag `isBuiltIn` à l'écran de création

### `src/screens/CreateCharacterScreen.js`
- Support de l'édition des personnages intégrés via `isEditingBuiltIn`
- Nouveau champ "Tags" avec suggestions
- Note explicative pour les modifications de personnages intégrés
- Sauvegarde différenciée selon le type de personnage

### `src/services/CustomCharacterService.js`
- Nouvelles méthodes pour les modifications de personnages intégrés:
  - `saveCharacterModifications(characterId, modifications)`
  - `getCharacterModifications(characterId)`
  - `getAllCharacterModifications()`
  - `applyModificationsToCharacter(character)`
  - `deleteCharacterModifications(characterId)`

## Angles de Caméra par Niveau (Résumé)

| Niveau | Type | Angles |
|--------|------|--------|
| 2 | Provocant | Corps entier habillé, poses suggestives |
| 3 | Sensuel | Lingerie, lit, miroir |
| 4 | Intime | Topless, focus poitrine/fesses |
| 5+ | Explicite | Parties intimes, poses explicites |

## Morphologies Supportées

- `mince` → SLIM SLENDER BODY
- `élancée` → SLENDER ELEGANT BODY
- `moyenne` → AVERAGE NORMAL BODY
- `athlétique` → ATHLETIC TONED BODY
- `voluptueuse` → VOLUPTUOUS curvy figure
- `généreuse` → GENEROUS CURVY BODY
- `pulpeuse` → THICK CURVY BODY
- `ronde` → CHUBBY ROUND BODY
- `très ronde` → BBW body type

## Notes Techniques

- Les modifications de personnages intégrés sont stockées séparément dans `character_modifications`
- Le personnage original n'est jamais modifié
- Les modifications sont appliquées automatiquement lors du chargement du personnage
