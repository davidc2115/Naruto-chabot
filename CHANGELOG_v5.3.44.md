# Changelog v5.3.44

## Date: 17 Janvier 2026

## Nouvelles fonctionnalités

### Import d'images depuis la galerie et caméra
- **Galerie photos**: Possibilité d'importer une image directement depuis la galerie du smartphone
- **Caméra**: Possibilité de prendre une photo avec la caméra pour l'utiliser comme image de personnage
- **Edition d'image**: L'image peut être recadrée (aspect 1:1) avant d'être utilisée
- **Interface améliorée**: Nouveau design avec boutons séparés pour Galerie, Caméra et Génération IA

### Améliorations techniques
- Installation de `expo-image-picker` v15.1.0 (compatible Expo SDK 51)
- Ajout des permissions Android: CAMERA, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE, READ_MEDIA_IMAGES
- Ajout des permissions iOS: NSPhotoLibraryUsageDescription, NSCameraUsageDescription
- Configuration du plugin expo-image-picker dans app.json

## Corrections

### Import d'image
- Correction du problème "Import indisponible" - la fonctionnalité est maintenant active
- Remplacement de l'import par URL par l'import depuis la galerie du smartphone

### Interface utilisateur
- Nouvelle disposition des boutons d'import d'image (Galerie + Caméra sur une ligne, IA en dessous)
- Meilleure visibilité des options disponibles

## Fichiers modifiés
- `src/screens/CreateCharacterScreen.js` - Import expo-image-picker + fonctions pickImage/takePhoto
- `app.json` - Version 5.3.44, versionCode 98, permissions et plugin expo-image-picker
- `package.json` - Version 5.3.44, ajout dépendance expo-image-picker

## Notes de build
- Cette version nécessite un build natif pour que les permissions fonctionnent correctement
- Compatible avec Expo SDK 51 et React Native 0.74.5
