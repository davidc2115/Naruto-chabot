# Changelog v5.4.34

## Date: 20 janvier 2026

## Corrections de bugs et améliorations

### 1. Génération d'images - Meilleur logging
**Fichier**: `src/screens/ConversationScreen.js`

- Ajout de logs détaillés pour le debugging des URLs d'images
- Validation améliorée des URLs (vérifie que c'est une string non vide)
- Affiche l'URL générée dans les logs pour diagnostiquer les problèmes

### 2. Analyse d'image - Nouvelles méthodes API
**Fichier**: `src/screens/CreateCharacterScreen.js`

Les anciennes méthodes utilisaient `atob()` qui n'existe pas dans React Native. Nouvelles méthodes:

1. **Replicate BLIP** (gratuit) - API de captioning d'image
2. **FreeImage AI** - Upload et analyse
3. **Together AI Vision** - LLaVA model pour description d'image
4. **Pollinations OpenAI** - Format OpenAI avec GPT-4 Vision
5. **Analyse textuelle** - Génération par l'IA sans image (fallback)
6. **Génération locale** - Profil aléatoire (dernier recours)

Corrections:
- Suppression de `atob()` qui n'existe pas dans React Native
- Utilisation d'APIs qui acceptent le base64 directement
- Meilleure gestion des erreurs avec try/catch pour chaque méthode

### 3. Tierce personne - Détection améliorée
**Fichier**: `src/services/TextGenerationService.js`

Réécriture complète de `detectThirdPerson()`:

**Nouveaux patterns de relations:**
- fille, mère, père, frère, soeur, ami(e), femme, mari
- copine, copain, belle-mère, beau-père
- colocataire, voisin(e), collègue

**Verbes d'arrivée:**
- arrive, entre, ouvre, apparaît, surgit, débarque
- vient, revient, rentre, fait irruption, déboule
- est là, est entrée, est entré

**Verbes de perception:**
- entend, a entendu, nous entend
- voit, a vu, nous voit
- surprend, découvre, remarque

**Verbes d'interaction:**
- lui demande, lui dis, lui parle
- me tourne vers, m'adresse à
- leur demande, leur parle

**Exemple d'utilisation:**
```
Utilisateur: *ma fille entre dans la chambre* "Qu'est-ce que vous faites?!"
Je lui explique "Ce n'est pas ce que tu crois..."

IA: 
[Fille] *s'arrête net, les yeux écarquillés* "Papa?! Avec... avec elle?!" (Je n'en reviens pas)

*me lève précipitamment* "Ma chérie, attends, laisse-moi t'expliquer..." (Merde, comment je vais gérer ça?)
```

### Fichiers modifiés

1. `src/screens/ConversationScreen.js` - Logging images
2. `src/screens/CreateCharacterScreen.js` - Nouvelles APIs d'analyse
3. `src/services/TextGenerationService.js` - Détection tierce personne
4. `app.json` - Version 5.4.34, versionCode 174
5. `package.json` - Version 5.4.34

### Tests recommandés

**Génération d'images:**
1. Générer une image dans une conversation
2. Vérifier les logs dans la console pour voir l'URL générée
3. L'image devrait s'afficher dans le message

**Analyse d'image:**
1. Créer un personnage depuis une photo
2. Attendre le message de succès avec la méthode utilisée
3. Vérifier que les caractéristiques correspondent à l'image

**Tierce personne:**
1. Dans une conversation, écrire: "*ma fille entre* Qu'est-ce que tu fais là?"
2. L'IA devrait faire répondre la fille avec le format [Fille]
3. Le personnage principal peut aussi réagir
