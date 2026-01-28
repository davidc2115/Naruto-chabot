# Changelog v5.4.29 - Corrections génération de texte et formatage

## Date: 2026-01-19

## Problèmes corrigés

### 1. Génération de texte identique quel que soit le personnage
- **Problème**: Les personnages avaient tous des réponses similaires sans respecter leur tempérament
- **Solution**: 
  - Chaque tempérament a maintenant des limites sexuelles OBLIGATOIRES
  - Les personnages timides refusent: brutalité, humiliation, exhibitionnisme, sexe en public, mots vulgaires
  - Les personnages romantiques refusent: sexe brutal, one night stand, pratiques sans amour
  - Les personnages réservés refusent: vulgarité, pratiques extrêmes, anal
  - Comportements spécifiques pour chaque tempérament avec phrases de refus

### 2. Aucun personnage ne refuse les actes sexuels
- **Problème**: Les personnages acceptaient tout sans jamais refuser
- **Solution**:
  - Nouvelles instructions EMPHATIQUES pour les refus
  - Phrases de refus prédéfinies par tempérament
  - Escalade si l'utilisateur insiste (fâcherie, départ)
  - Les jeunes (18-21 ans) ont des limites supplémentaires automatiques

### 3. Conversations toujours NSFW, pas de SFW possible
- **Problème**: Même des salutations simples menaient à du NSFW
- **Solution**:
  - Mode SFW par DÉFAUT
  - Liste SFW ultra-étendue (100+ mots-clés)
  - Score SFW très prioritaire (+5 pour dernier message)
  - Seuils NSFW relevés: nécessite contenu TRÈS explicite
  - Messages courts (<30 chars) sont automatiquement SFW
  - Retour au SFW immédiat si le message ne contient pas de contenu explicite

### 4. Pensées des personnages tronquées
- **Problème**: Les pensées entre parenthèses étaient coupées
- **Solution**:
  - Parser v8 amélioré pour les pensées
  - Gestion complète de la profondeur des parenthèses
  - Pensées non fermées sont affichées quand même
  - Aucune troncature même pour les pensées longues

### 5. Couleurs de texte incohérentes pour les dialogues
- **Problème**: Les paroles apparaissaient parfois avec la mauvaise couleur
- **Solution**:
  - Couleurs forcées pour chaque type de texte
  - Dialogues: couleur spécifique avec semi-bold (font-weight: 500)
  - Texte neutre: gris clair (#9ca3af) distinct du dialogue
  - Actions: rouge italique gras (inchangé)
  - Pensées: bleu italique (inchangé)

## Changements techniques

### TextGenerationService.js
- `analyzeConversationContext()`: 
  - Analyse seulement le dernier message pour SFW/NSFW
  - Multiplicateurs de tempérament réduits (plus restrictifs)
  - Scores SFW prioritaires
  - Logs détaillés des scores

- `getCharacterSexualLimits()`:
  - Limites automatiques par tempérament
  - Comportements et phrases de refus spécifiques
  - Limites supplémentaires pour les jeunes (18-21 ans)
  - Instructions emphatiques pour les refus

### ConversationScreen.js
- `formatRPMessage()` v8:
  - Fonction `flushCurrentText()` pour meilleure gestion
  - Pensées: recherche complète jusqu'à fermeture
  - Dialogues: s'arrêtent avant actions/pensées
  - Aucune troncature

- `renderMessage()`:
  - Couleurs forcées avec backgroundColor: transparent
  - Texte neutre gris clair distinct
  - Semi-bold pour les dialogues

## Tests recommandés

1. **Test SFW**: 
   - Envoyer "Bonjour" ou "Comment ça va?" 
   - Le personnage doit répondre de façon SFW

2. **Test refus**:
   - Avec un personnage TIMIDE, demander quelque chose de brutal
   - Le personnage doit refuser fermement

3. **Test pensées**:
   - Vérifier que les pensées longues s'affichent complètement

4. **Test couleurs**:
   - Vérifier que *actions* sont en rouge
   - Vérifier que (pensées) sont en bleu
   - Vérifier que "dialogues" ont une couleur différente du texte neutre
