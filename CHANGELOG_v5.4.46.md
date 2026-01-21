# Changelog v5.4.46 - Noms des Personnages Obligatoires

## 🎯 Problème Résolu
- Les noms des personnages (principal et tierce personne) n'apparaissaient pas dans le texte généré
- Impossible de différencier qui parlait dans une scène multi-personnages

## 📝 Format Multi-Personnages Renforcé

### Instructions ULTRA-EXPLICITES pour l'IA
Les instructions ont été massivement renforcées pour FORCER l'affichage des noms:

```
╔════════════════════════════════════════════════════════════════════╗
║  🚨🚨🚨 ATTENTION: SCÈNE MULTI-PERSONNAGES 🚨🚨🚨                  ║
╚════════════════════════════════════════════════════════════════════╝

🎭 PERSONNAGES PRÉSENTS (tu dois les jouer TOUS):
   1. [Sofia] = TOI (personnage principal)
   2. [La Femme] = Tierce personne présente

╔════════════════════════════════════════════════════════════════════╗
║  📝 FORMAT 100% OBLIGATOIRE - COMMENCE CHAQUE LIGNE PAR [NOM]     ║
╚════════════════════════════════════════════════════════════════════╝

QUAND SOFIA PARLE, ÉCRIS:
[Sofia] *action* "paroles" (pensées)

QUAND LA FEMME PARLE, ÉCRIS:
[La Femme] *action* "paroles" (pensées)
```

### Règles Absolues
- CHAQUE RÉPLIQUE DOIT COMMENCER PAR LE NOM ENTRE CROCHETS
- SANS LE [NOM], LE TEXTE EST INVALIDE
- L'IA reçoit des exemples clairs de ce qui est correct et incorrect

### Exemple Correct
```
[La Femme] *ouvre grand les yeux en vous voyant* "Mais qu'est-ce que... ?!" (Oh mon Dieu!)

[Sofia] *se retourne, paniqué(e)* "Ce n'est pas ce que tu crois!" (Merde, on est pris!)
```

### Exemple d'Erreur (à éviter)
```
*se retourne* "Ce n'est pas ce que tu crois!" ← FAUX! Manque [Sofia] au début!
```

## 🔧 System Prompt Amélioré
- Instructions plus détaillées avec exemples concrets
- Format obligatoire clairement défini pour chaque personnage
- Exemple de dialogue multi-personnages inclus

## 🎨 Affichage (déjà en place depuis v5.4.45)
- Noms entre crochets `[Nom]` affichés en **violet** (#9333ea)
- Style gras pour une meilleure visibilité

## Version
- Version: 5.4.46
- Version Code Android: 186
