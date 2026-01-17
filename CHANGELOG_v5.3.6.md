# Changelog v5.3.6

## Date: 17 Janvier 2026

### Corrections Majeures

#### 1. Affichage des Conversations
- **Problème**: Les conversations en cours ne s'affichaient pas dans l'onglet Conversations
- **Solution**: Refonte complète de `StorageService.getAllConversations()`:
  - Recherche exhaustive dans TOUTES les clés AsyncStorage possibles
  - Support de multiples formats de données (messages, history, data.messages, tableau direct)
  - Extraction intelligente du characterId depuis les clés ou les données
  - Normalisation automatique des messages (role, content)
  - Évite les doublons avec `seenCharacterIds`
  - Logs détaillés pour le débogage

#### 2. Suppression des Personnages Personnalisés
- **Problème**: Les personnages supprimés apparaissaient toujours pour les autres membres
- **Solution**: Amélioration majeure de `CustomCharacterService.deleteCustomCharacter()`:
  - Suppression server-side via DELETE, POST et endpoint /purge
  - Liste noire des IDs supprimés sur le serveur (persiste les suppressions)
  - Variantes d'IDs testées (avec/sans préfixe `custom_`)
  - Nettoyage de tous les caches locaux (dont `cached_public_characters`)
  - Invalidation forcée du cache serveur

#### 3. Génération d'Images - Morphologie
- **Problème**: Pas assez de différence entre rond, très rond, généreux et voluptueux
- **Solution**: Nouvelle hiérarchie de morphologie distincte:
  - **Niveau 5 - TRÈS RONDE (BBW)**: Corps très large, gros ventre proéminent
  - **Niveau 4 - RONDE (Chubby)**: Corps rond avec ventre visible, visiblement en surpoids
  - **Niveau 3 - GÉNÉREUSE (Full-figured)**: Formes prononcées sans gros ventre, silhouette en sablier élargie
  - **Niveau 2 - VOLUPTUEUSE (Bombshell)**: Silhouette en sablier sexy avec grosses formes sans surpoids
  - **Niveau 1 - CURVY (Courbes)**: Corps avec courbes attrayantes mais proportionné
  - **Niveau 0 - MATERNELLE (Douce)**: Corps maternel doux avec formes confortables
- Chaque niveau a des descriptions anglaises UNIQUES et distinctes
- Détection supplémentaire pour poitrine, fesses, ventre, hanches

#### 4. Génération de Texte - Mémoire Conversationnelle
- **Problème**: L'IA manquait de cohérence dans les réponses
- **Solution**: Mémoire étendue dans `generateWithPollinations()`:
  - Jusqu'à **12 messages récents** inclus (au lieu de 6)
  - **Résumé détaillé** des anciens messages (sujets, moments émotionnels, actions)
  - Nouvelle fonction `buildDetailedMemorySummary()` pour analyser l'historique
  - Nouvelle fonction `buildFinalInstructionWithMemory()` pour rappeler le contexte
  - Rappel du dernier message utilisateur et de la dernière action
  - Instructions anti-répétition renforcées
  - Tokens augmentés à 350 pour réponses plus élaborées

#### 5. Serveur Freebox - Synchronisation Temps Réel
- **Nouveau**: Serveur `freebox_server_v7.py` avec sync temps réel
  - Liste noire des IDs supprimés (persiste entre redémarrages)
  - Version de cache incrémentée à chaque modification
  - Endpoints `/api/characters/purge` et `/api/characters/invalidate-cache`
  - Filtrage automatique des personnages supprimés
  - Variantes d'IDs supportées (custom_xxx et xxx)
  - Logging détaillé de toutes les opérations

### Fichiers Modifiés

1. `src/services/StorageService.js` - Chargement conversations amélioré
2. `src/services/CustomCharacterService.js` - Suppression server-side robuste
3. `src/services/ImageGenerationService.js` - Morphologie hiérarchique distincte
4. `src/services/TextGenerationService.js` - Mémoire conversationnelle étendue
5. `freebox_server_v7.py` - Nouveau serveur avec sync temps réel
6. `app.json` - Version 5.3.6, versionCode 60
7. `package.json` - Version 5.3.6

### Notes pour le Déploiement

Pour activer la synchronisation temps réel sur le serveur Freebox:

```bash
# Arrêter l'ancien serveur
pkill -f freebox_server

# Démarrer le nouveau serveur
cd /chemin/vers/app
nohup python3 freebox_server_v7.py > /tmp/server.log 2>&1 &
```

### Instructions de Test

1. **Conversations**: Vérifier que les conversations existantes apparaissent dans l'onglet
2. **Suppression**: Créer un personnage, le supprimer, vérifier qu'il n'apparaît plus pour d'autres utilisateurs
3. **Morphologie**: Tester la génération d'images avec:
   - "très ronde" → corps BBW
   - "ronde" → corps chubby visible
   - "généreuse" → formes prononcées sans gros ventre
   - "voluptueuse" → bombshell sexy
4. **Mémoire**: Avoir une longue conversation et vérifier que l'IA se souvient du contexte
