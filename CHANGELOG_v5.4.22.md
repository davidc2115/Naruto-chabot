# Changelog v5.4.22

## Améliorations Majeures de la Génération d'Images

### 1. Plus de Variété NSFW (Tenues et Poses)

**Niveaux de progression avec variété maximale:**

- **Niveau 2 (Provocant):** 10+ nouvelles tenues (mini dress, crop top, latex, mesh, tube top, etc.) et 12+ nouvelles poses sexy
- **Niveau 3 (Lingerie):** 14+ ensembles de lingerie (negligée, corset, crotchless, fishnet, mesh bodysuit, etc.) et 10+ poses sensuelles
- **Niveau 4 (Topless):** 10+ variations topless avec différents accessoires et 10+ poses mettant en valeur la poitrine
- **Niveau 5+ (Nu Explicite):** 12+ angles explicites et 10+ poses intimes très variées

### 2. Plus d'Images Réalistes

- Ratio modifié: **75% réaliste / 25% anime** (anciennement 50/50)
- Les images réalistes sont maintenant privilégiées

### 3. Réduction Drastique des Défauts

**Negative prompts renforcés pour éviter:**
- Bras/jambes multiples ou déformés
- Articulations dans le mauvais sens (genoux en arrière)
- Vêtements fusionnés avec la peau
- Poitrine mal positionnée ou déformée
- Fesses mal placées
- Doigts fusionnés ou en nombre incorrect
- Parties du corps manquantes

**Prompts positifs anti-défauts ajoutés:**
- `((exactly two arms))`, `((exactly two legs))`
- `((legs bending correctly))`, `((knees in right direction))`
- `((clothes separate from skin))`
- `((natural breast shape))`, `((correct breast placement))`
- `((five fingers each hand))`

### 4. Qualité Améliorée

- Limite de prompt augmentée de 1900 à 2400 caractères pour Pollinations
- Limite de prompt augmentée de 1500 à 2000 caractères pour Freebox SD
- Ajout de termes de qualité professionnelle (8K, sharp focus, studio lighting)

## Améliorations de la Génération de Texte

### 5. Respect du Tempérament et de la Sexualité

**Rappel systématique dans l'instruction finale:**
- Tempérament (timide, séducteur, passionné, dominant, soumis) rappelé explicitement
- Limites sexuelles du personnage rappelées (ce qu'il refuse)
- État de virginité mentionné si applicable
- Instructions de comportement adaptées au tempérament

### 6. Cohérence Améliorée

- Le personnage adapte son style selon son tempérament même dans les scènes NSFW
- Les refus sont mieux respectés
- La vitesse de progression NSFW suit le tempérament

## Fix Affichage des Conversations

### 7. Conversations Redémarrées Visibles

**Problème:** Les conversations redémarrées après suppression ne s'affichaient plus dans l'onglet Conversations.

**Solution:** Lors de la sauvegarde d'une conversation, le personnage est automatiquement retiré de la liste des conversations supprimées. Cela permet aux conversations redémarrées d'apparaître à nouveau.

## Fichiers Modifiés

- `src/services/ImageGenerationService.js`
  - Ratio anime/réaliste: 75% réaliste
  - Negative prompts étendus
  - Plus de variété dans les tenues et poses par niveau
  - Anti-défauts renforcés dans les prompts

- `src/services/TextGenerationService.js`
  - Rappel du tempérament dans l'instruction finale
  - Rappel des limites sexuelles
  - Meilleure cohérence comportementale

- `src/services/StorageService.js`
  - Nettoyage automatique de la liste des conversations supprimées
  - Fix affichage des conversations redémarrées

- `app.json`: version 5.4.22, versionCode 162
- `package.json`: version 5.4.22

## Notes Techniques

### Structure des Prompts NSFW
Les prompts sont maintenant structurés avec priorité maximale aux éléments visuels:
1. Style (réaliste 75%)
2. Angle avec poids élevé `((...))` 
3. Tenue avec poids élevé
4. Pose avec poids élevé
5. Description physique
6. Anti-défauts avec poids élevé
7. Qualité (8K, sharp focus)

Cette structure garantit que les générateurs d'images respectent les instructions les plus importantes.
