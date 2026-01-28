# Changelog v5.4.65 - CORRECTION DÉFINITIVE PERSISTANCE

## Date: 19 Janvier 2026

## Problème Identifié

Le problème persistant de sauvegarde était causé par:
1. **Dépendances circulaires** entre les services lors de l'import de `getAppUserId`
2. **Ordre de chargement des modules** qui causait des undefined references
3. **Manque de robustesse** dans la gestion des erreurs

## Solution: AppUserManager Autonome

Création d'un nouveau module **AppUserManager.js** qui est:
- **100% autonome** - aucune dépendance sur d'autres services
- **Singleton global** - un seul ID pour toute l'application
- **Pré-initialisé** - l'ID est chargé dès le premier import du module

### Architecture Nouvelle

```
AppUserManager.js (MODULE AUTONOME)
       │
       ▼ getUserId()
       │
   ┌───┴───┬───────────┐
   │       │           │
   ▼       ▼           ▼
Storage  Gallery    Level
Service  Service   Service
```

## Changements par Fichier

### AppUserManager.js (NOUVEAU)
```javascript
// Variables globales du module
let cachedUserId = null;
let initPromise = null;

// API principale
export async function getUserId() {
  if (cachedUserId) return cachedUserId;
  if (initPromise) return await initPromise;
  initPromise = initializeUserId();
  return await initPromise;
}

// Pré-initialisation au chargement
getUserId().catch(e => console.error('Pré-init échouée:', e));
```

### StorageService.js
- Import: `import { getUserId } from './AppUserManager';`
- QUADRUPLE sauvegarde pour chaque conversation
- Logs TRÈS détaillés à chaque étape
- Vérification immédiate après sauvegarde

### GalleryService.js
- Import: `import { getUserId } from './AppUserManager';`
- QUADRUPLE sauvegarde pour chaque image
- Logs TRÈS détaillés à chaque étape
- Vérification immédiate après sauvegarde

### LevelService.js
- Import: `import { getUserId } from './AppUserManager';`
- Cohérence avec les autres services

## Clés de Sauvegarde (QUADRUPLE)

### Conversations
1. `conv_{userId}_{characterId}` - Principale
2. `conv_backup_{characterId}` - Backup
3. `conv_global_{characterId}` - Global
4. `conversation_{characterId}` - Legacy

### Galerie
1. `gal_{userId}_{characterId}` - Principale
2. `gal_backup_{characterId}` - Backup
3. `gal_global_{characterId}` - Global
4. `gallery_{characterId}` - Legacy

## Logs de Debug

L'application affiche maintenant des logs détaillés:

```
========== SAVE CONVERSATION START ==========
📝 characterId: naruto
📝 messages: 15
📝 relationship level: 3
🔑 [StorageService] userId: user_abc123
📦 [SAVE] Taille données: 4523 bytes
✅ [SAVE] Sauvegardé: conv_user_abc123_naruto
✅ [SAVE] Sauvegardé: conv_backup_naruto
✅ [SAVE] Sauvegardé: conv_global_naruto
✅ [SAVE] Sauvegardé: conversation_naruto
✅ [SAVE] Vérification OK: 15 messages
✅ [SAVE] Terminé en 45ms (4/4 sauvegardes)
========== SAVE CONVERSATION END ==========
```

## Version
- Version: 5.4.65
- Build: 205
- Tag: v5.4.65
- Date Build: 22 Janvier 2026
