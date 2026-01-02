# Guide de Build APK

## Option 1 : EAS Build (Recommandé - Plus simple)

### Installation
```bash
npm install -g eas-cli
```

### Connexion
```bash
eas login
```

### Configuration
```bash
eas build:configure
```

### Build APK
```bash
eas build --platform android --profile preview
```

Le build prendra 10-20 minutes. Vous recevrez un lien pour télécharger l'APK.

## Option 2 : Expo Build (Obsolète mais plus simple)

### Build
```bash
expo build:android -t apk
```

## Option 3 : Build local (Avancé)

Nécessite Android Studio et SDK Android installés.

```bash
eas build --platform android --local
```

## Installation de l'APK

1. Téléchargez l'APK sur votre téléphone Android
2. Allez dans Paramètres > Sécurité
3. Activez "Sources inconnues" ou "Installer des applications tierces"
4. Ouvrez le fichier APK téléchargé
5. Suivez les instructions d'installation

## Taille de l'APK attendue

Environ 30-50 MB

## Notes

- Le premier build peut prendre plus de temps
- Assurez-vous d'avoir une bonne connexion internet
- Les builds sont gratuits avec un compte Expo
