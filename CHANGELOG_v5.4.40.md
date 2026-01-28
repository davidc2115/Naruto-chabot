# Changelog v5.4.40 - Corrections Demandées

## Date: 19 janvier 2026

## Changements

### 1. Analyse d'Image Retirée
- L'analyse d'image par IA a été retirée
- Seule la génération locale de profil reste
- L'utilisateur doit modifier manuellement les caractéristiques
- **Fichier**: `src/screens/CreateCharacterScreen.js`

### 2. Couleur du Texte (Fix Définitif)
- **Problème**: Texte apparaissant en noir ET gris
- **Solution**: 
  - Couleur de base définie sur le conteneur parent
  - TOUT le texte (dialogue + normal) maintenant en noir `#000000`
  - Seules exceptions: actions (rouge) et pensées (bleu)
- **Fichier**: `src/screens/ConversationScreen.js`

### 3. Tierce Personne (Amélioration Majeure)
- **Détection étendue**:
  - Plus de mots-clés (soeur, frère, patronne, secrétaire, etc.)
  - Actions d'arrivée (entre, arrive, ouvre la porte, rentre)
  - Actions de découverte (nous surprend, nous voit, a vu)
  - Recherche dans les messages récents, pas seulement le dernier
  
- **Instructions ultra-explicites**:
  - Encadrement visuel avec bordures ASCII
  - Liste claire des 2 personnages à jouer
  - Format avec exemples détaillés
  - Instruction de commencer par [Nom] si l'utilisateur s'adresse à la tierce personne
  
- **Format attendu**:
  ```
  [La Fille] *ouvre la porte, choquée* "Mais qu'est-ce que...?!" (Oh mon Dieu!)
  
  *sursaute* "Ce n'est pas ce que tu crois!" (Merde!)
  ```

- **Fichier**: `src/services/TextGenerationService.js`

## Fichiers Modifiés
1. `src/screens/ConversationScreen.js` - Couleurs texte
2. `src/screens/CreateCharacterScreen.js` - Analyse retirée
3. `src/services/TextGenerationService.js` - Tierce personne
4. `app.json` - Version 5.4.40, versionCode 180
5. `package.json` - Version 5.4.40

## Build
- Version: 5.4.40
- VersionCode: 180
- Tag: v5.4.40
