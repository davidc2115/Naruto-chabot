# Changelog v5.4.23

## Corrections de Bugs

### 1. Fix Formatage du Texte - Couleurs Actions/Pensées

**Problème:** Les actions (`*action*`) et pensées (`(pensée)`) situées entre deux dialogues (`"parole"`) s'affichaient avec la même couleur que les paroles, au lieu de leurs couleurs distinctes.

**Solution:**
- Réécriture complète du parser `formatRPMessage` (v7)
- Priorité de détection: Actions → Pensées → Dialogues → Texte
- Le parser détecte maintenant correctement les actions/pensées même au milieu d'un dialogue
- Les guillemets sont maintenant inclus dans l'affichage des dialogues pour plus de clarté
- Gestion des parenthèses imbriquées pour les pensées
- Support étendu des guillemets Unicode (français, anglais, smart quotes)

**Avant:** `"Bonjour" *sourit* "Comment vas-tu?"` → tout en noir
**Après:** 
- `"Bonjour"` → couleur dialogue
- `*sourit*` → couleur action (rouge par défaut)
- `"Comment vas-tu?"` → couleur dialogue

### 2. Fix Génération de Texte - Plus d'Erreurs

**Problème:** Messages d'erreur fréquents du type `*te regarde* "Hmm..." (J'ai eu un problème, réessaie)` même avec plusieurs clés API Groq en rotation.

**Solutions apportées:**

#### a) Fallback Automatique dans callGroqApi
- Quand Groq échoue (429, 401, timeout), le système bascule **automatiquement** vers Pollinations
- La rotation des clés Groq continue pour la prochaine requête
- Log clair: "Groq échoué, fallback automatique vers Pollinations..."

#### b) Retry Intelligent dans ConversationScreen
- 3 tentatives de génération au lieu d'1
- Timeout réduit à 45s (au lieu de 60s) pour réponses plus rapides
- Délai progressif entre les tentatives (1s, 2s, 3s)
- Vérification de la validité de la réponse (> 10 caractères)

#### c) Réponses Contextuelles de Secours
Si toutes les tentatives échouent, le système génère une réponse contextuelle basée sur le message de l'utilisateur:
- Si "bonjour/salut/hey" → réponse de salutation
- Si question (?) → réponse réflexive
- Sinon → réponse d'écoute attentive

## Fichiers Modifiés

- `src/screens/ConversationScreen.js`
  - Parser `formatRPMessage` v7 (couleurs distinctes)
  - Retry logic avec 3 tentatives
  - Réponses contextuelles de secours
  - Styles de texte améliorés avec clés uniques

- `src/services/TextGenerationService.js`
  - Fallback automatique Groq → Pollinations
  - Meilleure gestion des erreurs API

- `app.json`: version 5.4.23, versionCode 163
- `package.json`: version 5.4.23

## Notes Techniques

### Parser v7 - Logique de Détection
```
1. Astérisque (*) détecté → chercher fermeture → type 'action'
2. Parenthèse (() détectée → chercher fermeture avec profondeur → type 'thought'
3. Guillemet (") détecté → chercher fermeture OU action/pensée → type 'dialogue'
4. Autre caractère → type 'text'
```

### Hiérarchie des Fallbacks
```
1. API sélectionnée (ex: Groq)
   ↓ échec
2. Pollinations Mistral (automatique)
   ↓ échec
3. Retry (jusqu'à 3 fois)
   ↓ échec
4. Réponse contextuelle (basée sur message utilisateur)
```
