# Changelog v5.4.43 - Fix Image/Texte Concurrent

## Date: 21 janvier 2026

## Correction

### Problème Signalé
Quand une image est générée en même temps que le texte, le texte du personnage disparaît et seule l'image est affichée.

### Cause
Condition de concurrence (race condition) dans la gestion des messages:
- La fonction `generateImage` utilisait `[...messages, imageMessage]`
- Si `messages` n'était pas à jour (car une autre opération était en cours), l'image écrasait les messages précédents

### Solution
Utilisation du callback de `setMessages` pour garantir l'utilisation des messages les plus récents:

**Avant (problématique)**:
```javascript
const updatedMessages = [...messages, imageMessage];
setMessages(updatedMessages);
```

**Après (corrigé)**:
```javascript
setMessages(prevMessages => {
  const newMessages = [...prevMessages, imageMessage];
  saveConversation(newMessages, relationship);
  return newMessages;
});
```

### Autres améliorations
- Ajout de `timestamp` aux messages image pour un meilleur tri
- Ajout de `timestamp` aux messages assistant

## Fichiers Modifiés
1. `src/screens/ConversationScreen.js` - Fix race condition
2. `app.json` - Version 5.4.43, versionCode 183
3. `package.json` - Version 5.4.43

## Build
- Version: 5.4.43
- VersionCode: 183
- Tag: v5.4.43
