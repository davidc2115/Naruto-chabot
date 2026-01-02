# 🚀 Commandes importantes

## Installation et lancement

### Installation initiale
```bash
npm install
```

### Lancer l'application
```bash
npm start
```

### Nettoyer le cache
```bash
npm start -- --clear
```

---

## Build APK

### Installer EAS CLI
```bash
npm install -g eas-cli
```

### Se connecter à Expo
```bash
eas login
```

### Configurer le projet
```bash
eas build:configure
```

### Builder un APK
```bash
eas build --platform android --profile preview
```

### Builder avec cache nettoyé
```bash
eas build --platform android --profile preview --clear-cache
```

---

## Maintenance

### Réinstaller les dépendances
```bash
rm -rf node_modules
npm install
```

### Mettre à jour les dépendances
```bash
npm update
```

### Voir les dépendances obsolètes
```bash
npm outdated
```

---

## Développement

### Lancer en mode tunnel (si problème réseau)
```bash
npm start -- --tunnel
```

### Voir les logs Android
```bash
npx react-native log-android
```

### Voir les logs iOS
```bash
npx react-native log-ios
```

---

## Git

### Voir les changements
```bash
git status
```

### Ajouter tous les fichiers
```bash
git add .
```

### Commit
```bash
git commit -m "Description des changements"
```

### Push
```bash
git push
```

---

## Expo

### Publier l'application
```bash
npx expo publish
```

### Voir les builds
```bash
eas build:list
```

### Télécharger un build
```bash
eas build:view [BUILD_ID]
```

---

## Dépannage

### Nettoyer complètement
```bash
rm -rf node_modules
npm cache clean --force
npm install
npx expo start --clear
```

### Réinitialiser Metro Bundler
```bash
killall -9 node
npm start -- --reset-cache
```

---

## Tests

### Tester sur Android
```bash
npm start -- --android
```

### Tester sur iOS
```bash
npm start -- --ios
```

### Tester sur Web
```bash
npm start -- --web
```

---

## Infos système

### Version de Node
```bash
node -v
```

### Version de npm
```bash
npm -v
```

### Version d'Expo
```bash
npx expo --version
```

### Infos complètes
```bash
npx expo-env-info
```
