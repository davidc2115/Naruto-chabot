# Changelog v5.4.64 - CORRECTION CRITIQUE PERSISTANCE

## Date: 19 Janvier 2026

## Problèmes Résolus

### 🔴 BUG CRITIQUE: ID Utilisateur Incohérent

**Problème identifié:**
- `StorageService` et `GalleryService` créaient chacun leur propre `device_user_id`
- Condition de concurrence au démarrage de l'application
- Les clés de stockage (`conv_userId_charId`, `gal_userId_charId`) utilisaient des IDs différents
- Résultat: Conversations perdues, images non affichées, niveaux bloqués

**Solution implémentée:**

1. **ID Utilisateur Unifié** (`StorageService.js`)
   - Variable globale `GLOBAL_APP_USER_ID` partagée
   - Fonction exportée `getAppUserId()` utilisable par tous les services
   - Nouvelle clé `app_user_id` avec migration automatique depuis `device_user_id`
   - L'ID est créé UNE SEULE fois et mis en cache

2. **GalleryService Synchronisé** (`GalleryService.js`)
   - Importe `getAppUserId` depuis `StorageService`
   - Utilise EXACTEMENT le même ID que `StorageService`
   - Triple sauvegarde avec vérification
   - Recherche multi-clés pour récupération des données

3. **LevelService Synchronisé** (`LevelService.js`)
   - Importe également `getAppUserId`
   - Nouvelle clé `levels_{userId}` avec migration automatique
   - Double sauvegarde pour robustesse

## Changements Techniques

### StorageService.js
```javascript
// Variable globale partagée
let GLOBAL_APP_USER_ID = null;

// Fonction exportée pour tous les services
export async function getAppUserId() {
  if (GLOBAL_APP_USER_ID) return GLOBAL_APP_USER_ID;
  
  let deviceId = await AsyncStorage.getItem('app_user_id');
  if (!deviceId) {
    deviceId = await AsyncStorage.getItem('device_user_id');
    if (!deviceId) {
      deviceId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    await AsyncStorage.setItem('app_user_id', deviceId);
  }
  GLOBAL_APP_USER_ID = deviceId;
  return deviceId;
}
```

### GalleryService.js
```javascript
import { getAppUserId } from './StorageService';

async getCurrentUserId() {
  return await getAppUserId(); // Utilise le MÊME ID
}
```

### LevelService.js
```javascript
import { getAppUserId } from './StorageService';

// Nouvelle clé basée sur userId
const userKey = `levels_${userId}`;
```

## Structure des Clés

| Service | Clé Principale | Backups |
|---------|----------------|---------|
| Conversations | `conv_{userId}_{charId}` | `conv_backup_{charId}`, `conv_simple_{charId}` |
| Galerie | `gal_{userId}_{charId}` | `gal_backup_{charId}`, `gal_simple_{charId}` |
| Niveaux | `levels_{userId}` | `character_levels_data` |

## Migration Automatique

L'application migre automatiquement les anciennes données:
- `device_user_id` → `app_user_id`
- `character_levels_data` → `levels_{userId}`
- Recherche dans les anciennes clés si les nouvelles sont vides

## Tests Recommandés

1. Démarrer une nouvelle conversation → Doit se sauvegarder
2. Quitter et relancer l'app → La conversation doit être restaurée
3. Générer une image → Doit apparaître dans la galerie
4. Envoyer plusieurs messages → Le niveau doit augmenter et ne pas revenir à 2

## Notes

- Version: 5.4.64
- Build: 204
- Cette version corrige le problème fondamental de persistance
