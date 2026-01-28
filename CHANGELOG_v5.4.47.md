# Changelog v5.4.47 - Corrections Multi-Personnages et Répétitions

## 🐛 Problèmes Résolus

### 1. Instructions Tronquées
- **Problème**: Les instructions pour les noms de personnages étaient tronquées à 600 caractères
- **Solution**: Augmentation de la limite à 1500 caractères pour les instructions finales

### 2. Répétitions de Texte
- **Problème**: Le texte se répétait plusieurs fois dans les réponses
- **Solution**: Nouveau système de détection et suppression des segments répétés

### 3. Format [Nom] Écrasé
- **Problème**: Le nettoyage des réponses supprimait le format multi-personnages
- **Solution**: 
  - Conservation des lignes commençant par `[`
  - Pas de reconstruction si format multi-personnages détecté
  - Limite de caractères augmentée à 600 pour multi-personnages

## 📝 Instructions Simplifiées

Les instructions pour l'IA ont été simplifiées et mises en PREMIER pour éviter la troncature:

```
🚨 MULTI-PERSONNAGES - UTILISE CE FORMAT:
[Sofia] *action* "parole"
[La Femme] *action* "parole"

👥 Personnages présents: Sofia, La Femme

✅ EXEMPLE:
[La Femme] *te regarde choqué(e)* "Qu'est-ce que vous faites?!"
[Sofia] *se fige* "Ce n'est pas ce que tu crois!"
```

## 🔧 Modifications Techniques

### TextGenerationService.js

#### callPollinationsApi
- Limite d'instructions finales: 600 → 1500 caractères

#### buildShortFinalInstruction
- Instructions multi-personnages simplifiées et placées en premier
- Format concis pour éviter la troncature

#### cleanAndValidateResponse
- Détection et suppression des segments répétés
- Conservation des lignes avec `[Nom]`
- Sauts de ligne préservés entre personnages
- Limite de caractères augmentée pour multi-personnages (600 vs 400)
- Pas de reconstruction forcée si format multi-personnages

## Version
- Version: 5.4.47
- Version Code Android: 187
