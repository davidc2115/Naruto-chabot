# Changelog v5.3.40 - Cohérence et Format Améliorés

## Date: 17 Janvier 2026

## Problèmes Corrigés

### 1. Conversations Mélangées / IA qui "revient en arrière"
- **Cause**: Trop de messages (15-20) envoyés à l'API créaient de la confusion
- **Solution**: Limitation à 6 messages récents maximum (3 échanges user/assistant)
- **Résultat**: L'IA se concentre uniquement sur la conversation récente

### 2. Réponses Incohérentes avec le Dernier Message
- **Cause**: Le dernier message utilisateur n'était pas assez mis en avant
- **Solution**: 
  - Format de prompt clair: `>>> DERNIER MESSAGE DE L'UTILISATEUR: "..."`
  - Extraction et affichage séparé des actions (*) et dialogues ("")
  - Instruction explicite de répondre à ce que l'utilisateur fait ET dit
- **Résultat**: Réponses directement liées au message de l'utilisateur

### 3. Réponses Trop Longues Sans Pensées
- **Cause**: maxTokens trop élevé (350), pas d'obligation de pensées
- **Solution**:
  - maxTokens réduit à 180-200
  - Format strict obligatoire: `*action courte* "Dialogue" (pensée)`
  - Validation qui ajoute une pensée si manquante
- **Résultat**: Réponses courtes et immersives

### 4. Actions Sans Dialogue
- **Cause**: L'IA générait parfois uniquement des actions
- **Solution**:
  - Instructions claires: "action = 5-10 mots max"
  - `cleanAndValidateResponse` force la présence de dialogue
  - Extraction des composants et reconstruction si nécessaire
- **Résultat**: Toujours un dialogue dans la réponse

### 5. Répétitions
- **Cause**: Pas de mécanisme anti-répétition efficace
- **Solution**:
  - Détection de la dernière action du personnage
  - Instruction explicite: `⛔ NE REFAIS PAS: "..."`
- **Résultat**: Actions variées

## Modifications Techniques

### `generateWithSelectedApi()` - v5.3.40
- Messages limités à 6 max (au lieu de 15-20)
- Dernier message utilisateur complet, autres résumés
- maxTokens réduit: 180 (SFW) / 200 (NSFW)
- Temperature ajustée à 0.8

### `callPollinationsApi()` - v5.3.40
- Nouveau format de prompt:
  ```
  [Identité personnage]
  [Contexte récent - 3 messages courts]
  >>> DERNIER MESSAGE DE L'UTILISATEUR:
  "message complet"
  [Instruction de réponse]
  RÉPONSE:
  ```

### `buildImmersiveSystemPrompt()` - v5.3.40
- Prompt plus concis
- Format strict documenté:
  ```
  📝 FORMAT STRICT:
  *action courte* "Dialogue" (ta pensée intérieure)
  
  RÈGLES:
  1. Réponds UNIQUEMENT au dernier message
  2. Action = 5-10 mots max
  3. Dialogue = 1-2 phrases expressives
  4. Pensée = entre parenthèses
  5. NE RÉPÈTE JAMAIS les mêmes mots/actions
  ```

### `buildFinalInstructionWithMemory()` - v5.3.40
- Extraction du message utilisateur en composants:
  - Action: ce qu'il/elle fait
  - Dialogue: ce qu'il/elle dit
  - Texte brut: autre contenu
- Anti-répétition: affiche la dernière action à éviter
- Format exemple fourni

### `cleanAndValidateResponse()` - v5.3.40
- Extraction des 3 composants: action, dialogue, pensée
- Limites strictes:
  - Action: max 50 caractères
  - Dialogue: max 120 caractères (coupe à une phrase naturelle)
  - Pensée: max 35 caractères
- Ajout automatique de pensée si absente
- Réponse finale: max 250 caractères

### `generateWithOllama()` - v5.3.40
- Seulement 4 messages récents (2 échanges)
- maxTokens réduit à 150
- Format d'instruction cohérent

## Exemple de Réponse Attendue

**Avant (v5.3.39):**
```
*s'approche lentement de toi, pose sa main sur ton épaule, te regarde dans les yeux avec un sourire mystérieux, penche légèrement la tête* "Hmm..."
```

**Après (v5.3.40):**
```
*te sourit* "Oh, tu es vraiment adorable quand tu fais ça!" (Il/Elle me plaît)
```

## Build

- Version: 5.3.40
- versionCode: 94
- Build: GitHub Actions Native
