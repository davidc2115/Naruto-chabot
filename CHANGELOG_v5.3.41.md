# Changelog v5.3.41 - Restauration v5.3.35 + Améliorations Cohérence

## Date: 18 Janvier 2026

## Base de Code

Cette version est basée sur **v5.3.35** qui fonctionnait correctement, avec les améliorations de cohérence ajoutées.

### Fichiers Restaurés depuis v5.3.35:
- `src/services/TextGenerationService.js` - Multi-API fonctionnel
- `src/services/StorageService.js` - Stockage avec ID device persistant
- `src/services/GalleryService.js` - Galerie avec stockage correct

## Améliorations de Cohérence (v5.3.41)

### 1. Messages Limités à 6 Maximum
- **Avant**: 15-20 messages envoyés à l'API (confusion)
- **Après**: Maximum 6 messages récents (3 échanges)
- **Résultat**: L'IA se concentre sur la conversation actuelle

### 2. Focus Absolu sur le Dernier Message
- Structure de prompt claire: `>>> MESSAGE ACTUEL: "..."`
- Extraction action/dialogue du message utilisateur
- Instruction directe de répondre à ce message

### 3. Format de Réponse Strict
```
*action courte 5-10 mots* "Dialogue 1-2 phrases" (pensée)
```
- Action: max 50 caractères
- Dialogue: max 120 caractères
- Pensée: max 35 caractères (obligatoire)

### 4. Anti-Répétition
- Détection de la dernière action du personnage
- Instruction: `⛔ NE REFAIS PAS: "dernière action"`

### 5. Tokens Réduits
- maxTokens: 200 (SFW) / 220 (NSFW)
- Temperature: 0.8 (plus stable)

## Modifications Techniques

### `generateWithSelectedApi()` v5.3.41
```javascript
// Messages limités à 6 max
const recentCount = Math.min(6, totalMessages);
// Tokens réduits
const maxTokens = isNSFW ? 220 : 200;
```

### `callPollinationsApi()` v5.3.41
```javascript
// Format clair avec focus dernier message
prompt += `\n\n>>> MESSAGE ACTUEL:\n"${lastUserMsg}"\n`;
```

### `buildFinalInstructionWithMemory()` v5.3.41
```javascript
// Anti-répétition
if (lastCharAction) {
  instruction += `\n⛔ NE REFAIS PAS: "${lastCharAction}"\n`;
}
// Format avec pensée
instruction += `*action courte* "Dialogue" (ta pensée)\n`;
```

### `cleanAndValidateResponse()` v5.3.41
```javascript
// Pensée obligatoire si absente
if (!thought) {
  thought = thoughtOptions[Math.floor(Math.random() * thoughtOptions.length)];
}
// Max 280 caractères
if (cleaned.length > 280) {
  cleaned = cleaned.substring(0, 280);
}
```

## Exemple de Réponse

**Avant:**
```
*s'approche lentement de toi, pose sa main sur ton épaule, te regarde dans les yeux avec un sourire mystérieux, penche légèrement la tête, caresse ta joue doucement* "Hmm..."
```

**Après (v5.3.41):**
```
*te sourit* "Oh, tu es vraiment adorable quand tu fais ça!" (Il/Elle me plaît)
```

## Build

- Version: 5.3.41
- versionCode: 95
- Base: v5.3.35 + améliorations cohérence
