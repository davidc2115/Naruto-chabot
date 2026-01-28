# Changelog v5.4.45 - Tierce Personne Persistante et Noms Affichés

## 🎭 Tierce Personne Persistante

### Détection Améliorée
- La tierce personne reste **active** dans toute la conversation après son introduction
- Détection dans les messages récents ET dans l'historique des réponses de l'IA
- Les formats `[Nom]` utilisés précédemment sont reconnus et maintenus

### Liste des Personnages Présents
- Suivi de TOUS les personnages actifs dans la scène
- Affichage clair des personnages présents dans les instructions
- Chaque personnage peut parler et réagir

## 📝 Format Multi-Personnages

### Nom du Personnage Affiché
- Format obligatoire: `[Nom du Personnage] *action* "paroles" (pensées)`
- Le nom principal du personnage est affiché: `[Sofia]`
- Les tierces personnes sont identifiées: `[La Femme]`, `[La Fille]`, etc.

### Rendu Visuel
- Les noms entre crochets `[Nom]` sont affichés en **violet** (#9333ea)
- Style gras pour une meilleure visibilité
- Distinction claire entre les personnages qui parlent

## 🎯 Instructions IA Améliorées

### Scène Multi-Personnages
```
╔══════════════════════════════════════════════════════════╗
║  👥 SCÈNE MULTI-PERSONNAGES                              ║
╚══════════════════════════════════════════════════════════╝

🎭 PERSONNAGES PRÉSENTS DANS LA SCÈNE:
   • [Sofia] - Personnage principal
   • [La Femme] - Tierce personne
```

### Règles de Dialogue
- Chaque personnage doit avoir son nom entre crochets
- Tous les personnages présents peuvent parler/réagir
- Dialogue naturel entre tous les participants

## ✅ Exemple de Conversation

```
[La Femme] *ouvre la porte et reste bouche bée* "Mais qu'est-ce que vous faites?!" (Je n'en reviens pas!)

[Sofia] *se fige, paniquée* "Ce n'est pas ce que tu crois!" (Oh non, on est pris!)
```

## 🔧 Modifications Techniques

### TextGenerationService.js
- `buildShortFinalInstruction`: Détection persistante des tierces personnes
- Collecte des personnages actifs dans tous les messages récents
- Détection des formats `[Nom]` déjà utilisés dans l'historique
- Instructions claires pour les scènes multi-personnages

### ConversationScreen.js
- `formatRPMessage`: Nouveau type `speaker` pour les noms entre crochets
- Rendu en violet gras pour les noms de personnages
- Parsing des crochets `[Nom]` dans les messages

## Version
- Version: 5.4.45
- Version Code Android: 185
