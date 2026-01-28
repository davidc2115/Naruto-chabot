# Changelog v5.4.24 - Mode Adaptatif SFW/NSFW et Cohérence Visuelle

## Date: 19 Janvier 2026

## Corrections Majeures

### 1. Mode Adaptatif SFW/NSFW
- **NOUVEAU**: Les conversations s'adaptent maintenant au contenu des messages de l'utilisateur
- **SFW par défaut**: Les conversations commencent en mode SFW et ne passent en NSFW que si l'utilisateur utilise des mots explicites
- **Retour au SFW possible**: Si l'utilisateur change de sujet (parle de travail, pose des questions normales, dit bonjour, etc.), la conversation revient au mode SFW
- **Tempérament du personnage**: Le tempérament influence la vitesse de progression vers le NSFW:
  - Personnages **timides/réservés**: Progressent très lentement vers le NSFW (multiplicateur x0.2-0.3)
  - Personnages **amicaux**: Progression normale (x0.5)
  - Personnages **séducteurs/passionnés**: Progression rapide (x1.0-1.5)
- **Liste SFW étendue**: Plus de 50 mots-clés SFW (salutations, sujets quotidiens, famille, hobbies, etc.) pour détecter le retour à une conversation normale

### 2. Poses et Tenues Intimes Améliorées
- **15 nouvelles poses sexy** (niveau 2):
  - Allongée sur le lit avec poitrine apparente
  - Mains soulevant la poitrine
  - Descendant une bretelle de robe
  - Remontant l'ourlet de la jupe pour montrer la culotte
  - Penchée sur une table avec décolleté visible
  - Dos cambré sur le lit
  - Et plus encore...
- **12 nouvelles poses lingerie** (niveau 3):
  - À genoux au bord du lit
  - Rampant sur le lit vers la caméra
  - Bretelle de soutien-gorge tombée
  - Se touchant à travers le tissu
- **12 nouvelles poses topless** (niveau 4):
  - Allongée avec seins tombant naturellement
  - Mains soulevant et présentant les seins
  - Bras au-dessus de la tête
  - Seins pressés contre une surface

### 3. Réduction Drastique des Défauts d'Image
- **Negative prompts ultra-renforcés** avec 40+ nouveaux termes:
  - Pas de personne dupliquée/clonée
  - Pas de corps divisé ou de jumeaux accidentels
  - Tétons corrects et visibles si topless
  - Lèvres et bouche naturelles
  - Yeux de même taille
  - Pose réaliste sans contorsions impossibles
- **Positive prompts anti-défauts** ajoutés:
  - Anatomie parfaite explicitement demandée
  - Placement correct des seins et tétons
  - Articulations qui plient dans le bon sens
  - Vêtements séparés de la peau

### 4. Cohérence d'Apparence du Personnage
- **Seed d'identité**: Chaque personnage a maintenant un seed basé sur son identité (nom + caractéristiques physiques)
- **Prompt d'identité visuelle**: Les caractéristiques permanentes sont ajoutées en priorité:
  - Même couleur et longueur de cheveux
  - Même couleur des yeux
  - Même teint de peau
  - Même morphologie corporelle
  - Même taille de poitrine (pour les femmes)
- **Cache mis à jour** (version 5.4.24): Les anciens profils sont invalidés pour appliquer les améliorations

## Fichiers Modifiés
- `src/services/TextGenerationService.js` - Mode adaptatif SFW/NSFW avec tempérament
- `src/services/ImageGenerationService.js` - Poses intimes, negative prompts, cohérence visuelle
- `app.json` - Version 5.4.24, versionCode 164
- `package.json` - Version 5.4.24

## Notes Techniques
- La détection du mode est basée sur les 3 derniers messages utilisateur (au lieu de 5)
- Le dernier message a un poids triple pour détecter le retour au SFW
- Le hash d'identité génère un nombre entre 100000 et 999999 avec une légère variation (±1000) pour la diversité
- Les traductions français→anglais sont intégrées pour les caractéristiques physiques
