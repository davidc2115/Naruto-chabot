# 🔧 Guide de dépannage

## Problèmes courants et solutions

### 1. "Aucune clé API configurée"

**Cause** : Aucune clé Groq n'a été ajoutée dans les paramètres.

**Solution** :
1. Allez sur [console.groq.com](https://console.groq.com)
2. Créez un compte gratuit
3. Générez une clé API
4. Ouvrez l'app > Paramètres
5. Collez votre clé
6. Cliquez sur "Sauvegarder"

### 2. "Échec de génération après plusieurs tentatives"

**Causes possibles** :
- Clé API invalide ou expirée
- Pas de connexion internet
- Quota API dépassé
- Serveur Groq temporairement indisponible

**Solutions** :
1. Vérifiez votre connexion internet
2. Testez vos clés avec le bouton "Tester" dans Paramètres
3. Ajoutez plusieurs clés API pour la rotation
4. Attendez quelques minutes et réessayez
5. Générez une nouvelle clé sur console.groq.com

### 3. L'image ne se génère pas

**Causes possibles** :
- Connexion internet lente
- Service Pollinations.ai temporairement lent

**Solutions** :
1. Vérifiez votre connexion internet
2. Attendez 10-15 secondes
3. Réessayez
4. L'image finira par apparaître

### 4. L'application ne démarre pas

**Solutions** :
```bash
# Nettoyer le cache
npm start -- --clear

# Si ça ne fonctionne pas
rm -rf node_modules
npm install
npm start
```

### 5. "Metro bundler error"

**Solution** :
```bash
# Tuer tous les processus Metro
killall -9 node

# Nettoyer et redémarrer
npm start -- --clear
```

### 6. Conversations ne se sauvegardent pas

**Cause** : Problème avec AsyncStorage

**Solution** :
1. Redémarrez l'application
2. Si le problème persiste, réinstallez l'app
3. Les données sont stockées localement sur votre téléphone

### 7. App très lente

**Solutions** :
1. Redémarrez l'application
2. Supprimez les anciennes conversations
3. Redémarrez votre téléphone
4. Assurez-vous d'avoir suffisamment d'espace de stockage

### 8. Erreur lors du build APK

**Solution EAS Build** :
```bash
# Assurez-vous d'être connecté
eas login

# Vérifiez la configuration
eas build:configure

# Rebuild
eas build --platform android --profile preview --clear-cache
```

### 9. QR code ne scanne pas

**Solutions** :
1. Assurez-vous qu'Expo Go est installé
2. Augmentez la luminosité de votre écran
3. Rapprochez/éloignez le téléphone
4. Essayez de cliquer sur "Scan QR Code" dans Expo Go

### 10. Personnage ne répond plus

**Solutions** :
1. Vérifiez votre connexion internet
2. Vérifiez vos clés API dans Paramètres
3. Fermez et rouvrez la conversation
4. Redémarrez l'application

## Logs et débogage

### Voir les logs dans Expo

1. Ouvrez le terminal où vous avez lancé `npm start`
2. Les logs s'affichent en temps réel
3. Recherchez les messages d'erreur en rouge

### Logs sur Android

Utilisez la commande :
```bash
npx react-native log-android
```

## Rapport de bug

Si vous rencontrez un problème non listé :

1. Notez le message d'erreur exact
2. Notez les étapes pour reproduire le problème
3. Vérifiez les logs
4. Essayez les solutions de base :
   - Redémarrer l'app
   - Vérifier internet
   - Vérifier les clés API

## Support

- Documentation Expo : https://docs.expo.dev/
- Documentation Groq : https://console.groq.com/docs
- Documentation React Native : https://reactnative.dev/

## Astuces de performance

1. **Limitez le nombre de messages** : Les conversations très longues peuvent ralentir
2. **Utilisez plusieurs clés** : Plus de clés = meilleure performance
3. **Connexion stable** : Utilisez WiFi plutôt que 4G pour les images
4. **Mettez à jour** : Gardez Node.js et npm à jour

## Réinitialisation complète

Si rien ne fonctionne :

```bash
# 1. Supprimer node_modules
rm -rf node_modules

# 2. Nettoyer le cache npm
npm cache clean --force

# 3. Réinstaller
npm install

# 4. Nettoyer Expo
npx expo start --clear

# 5. Sur le téléphone, désinstaller et réinstaller Expo Go
```
