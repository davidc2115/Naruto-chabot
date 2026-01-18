# Changelog v5.3.46

## Date: 18 Janvier 2026

## Modifications

### Generation de texte restauree (v5.3.42)
- **Restauration complete** du fichier `TextGenerationService.js` de la version 5.3.42
- Parametres de generation:
  - Max 6 messages recents (3 echanges) pour eviter les confusions
  - MaxTokens: 250 (SFW) / 280 (NSFW)
  - Temperature: 0.8
  - Dialogue max: 200 caracteres (expressif)
  - Reponse totale max: 380 caracteres
- **Format de reponse**: `*action courte* "Dialogue expressif 2-3 phrases" (pensee)`
- **Anti-repetition**: Le personnage ne repete pas sa derniere action
- **Focus utilisateur**: Le dernier message de l'utilisateur est prioritaire
- **Profil utilisateur integre**: Genre, taille poitrine/penis, age dans les prompts

### Corrections conservees des versions precedentes
- Generation d'images amelioree (v5.3.45)
- Import d'images sans redimensionnement (v5.3.45)
- Affichage des conversations corrige (v5.3.45)
- Permissions camera et galerie (v5.3.44)

## Fichiers modifies
- `src/services/TextGenerationService.js` - Restaure depuis v5.3.42
- `app.json` - Version 5.3.46, versionCode 100
- `package.json` - Version 5.3.46

## Notes
- Cette version combine les ameliorations d'images et d'import de v5.3.44-45 avec la generation de texte eprouvee de v5.3.42
- Les conversations ne seront plus melangees grace a la limite de 6 messages recents
