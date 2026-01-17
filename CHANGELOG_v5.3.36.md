# Changelog v5.3.36

## 🎯 Résumé des changements

Cette version restaure la fonctionnalité de la v5.3.34 et améliore significativement la génération de texte et le stockage des données.

## 🔧 Corrections majeures

### 1. Génération de texte améliorée
- **Restauration de la v5.3.34**: Retour à la version multi-API complète avec tous les providers (Pollinations, Venice, DeepInfra, Ollama)
- **Plus de dialogue, moins d'actions**: Le prompt système a été complètement revu pour donner la priorité au dialogue
  - Format: `*action COURTE* "DIALOGUE LONG ET EXPRESSIF" (pensée optionnelle)`
  - Le dialogue doit être plus long que l'action
  - Instructions explicites pour parler plus qu'agir

### 2. Profil utilisateur complet intégré dans les prompts
- **Sexe de l'utilisateur**: Le personnage sait si l'utilisateur est homme ou femme
- **Attributs physiques**:
  - Pour les femmes: taille de poitrine (bonnet A à H) mentionnée dans les réponses NSFW
  - Pour les hommes: taille du sexe (en cm) mentionnée dans les réponses NSFW
- **Pseudo**: Le personnage utilise le pseudo de l'utilisateur pour s'adresser à lui
- **Âge et différence d'âge**: 
  - L'âge de l'utilisateur est communiqué au personnage
  - La différence d'âge influence le comportement du personnage:
    - Si l'utilisateur est beaucoup plus vieux (+15 ans): le personnage peut montrer de l'attirance pour sa maturité
    - Si l'utilisateur est plus vieux (+5 ans): respect pour son âge
    - Si l'utilisateur est beaucoup plus jeune (-15 ans): le personnage peut être protecteur ou apprécier sa jeunesse
    - Si l'utilisateur est plus jeune (-5 ans): légèrement protecteur
    - Âges similaires: comportement normal
- Les prompts rappellent ces informations au modèle pour des réponses personnalisées

### 3. Stockage des conversations et images corrigé
- **ID utilisateur persistant**: Création d'un `device_user_id` unique et persistant
- **Cache optimisé**: Évite les appels répétés à AsyncStorage
- **Fallback robuste**: Si pas de compte, utilise un ID device stable (ne change plus)
- **Migration automatique**: Les anciennes conversations sans userId sont migrées

## 📋 Fichiers modifiés

1. `src/services/TextGenerationService.js`
   - Restauration complète de v5.3.34
   - Amélioration de `buildImmersiveSystemPrompt()` - profil utilisateur complet
   - Amélioration de `buildCompactImmersivePrompt()` - version Ollama
   - Amélioration de `buildFinalInstruction()` - priorité dialogue
   - Amélioration de `buildFinalInstructionWithMemory()` - rappel profil

2. `src/services/StorageService.js`
   - Nouvelle méthode `getCurrentUserId()` plus robuste
   - Cache utilisateur avec TTL de 5 secondes
   - ID device persistant comme fallback
   - Méthode `resetUserCache()` pour login/logout

3. `src/services/GalleryService.js`
   - Même amélioration du `getCurrentUserId()`
   - Cache et ID device persistant

4. `app.json`
   - Version: 5.3.35
   - versionCode: 89

## 🎭 Exemples de prompts améliorés

### Avant (trop d'actions):
```
*s'approche lentement, pose sa main sur son épaule, regarde dans ses yeux, caresse sa joue doucement, soupire* "Oui."
```

### Après (priorité dialogue):
```
*sourit* "Oh tu es vraiment adorable quand tu fais ça! J'adore passer du temps avec toi, tu me fais tellement de bien..." (Il me plaît)
```

## 🔒 Stockage plus fiable

### Avant:
- ID utilisateur pouvait changer entre 'anonymous' et l'ID réel
- Conversations perdues si l'app redémarrait avant l'authentification

### Après:
- ID device persistant créé une seule fois (`device_xxxxx`)
- Cache de 5 secondes pour éviter les lectures répétées
- Pas de perte de données même sans compte

## 📱 Compatibilité

- Version Android: 5.3.35 (versionCode 89)
- APIs supportées: Pollinations (Mistral, OpenAI, Llama, DeepSeek, Qwen), Venice AI, DeepInfra, Ollama

---
Date: 2026-01-17
