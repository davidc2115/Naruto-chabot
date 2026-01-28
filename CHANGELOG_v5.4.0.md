# CHANGELOG v5.4.0

## Date: 19 janvier 2026

## Mise à jour majeure - Mémoire conversationnelle et Poitrine visible

### Mémoire conversationnelle améliorée

#### Problème résolu
L'IA "oubliait" que la personne était déjà nue et disait des choses incohérentes comme "sous son soutien-gorge" alors que la femme était déjà complètement nue.

#### Solution v5.4.0

**Nouvel état de nudité global (`nudityState`):**
- `isTopless`: Seins exposés (soutien-gorge retiré)
- `isBottomless`: Partie basse nue (culotte/slip retiré)
- `isCompletelyNude`: Entièrement nu(e)
- `topClothingRemoved[]`: Liste des vêtements du haut retirés
- `bottomClothingRemoved[]`: Liste des vêtements du bas retirés
- `underwearRemoved[]`: Liste des sous-vêtements retirés

**Analyse de TOUS les messages:**
- Auparavant: seulement les 30 derniers messages
- Maintenant: TOUS les messages de la conversation
- Détection des patterns de nudité explicites dans le texte

**Patterns de vêtements détectés (50+):**
- Vêtements du haut: chemise, t-shirt, pull, veste, manteau, robe
- Vêtements du bas: pantalon, jupe, short, jean
- Sous-vêtements: soutien-gorge, culotte, slip, boxer, string, caleçon
- Déshabillage complet: "complètement nu", "entièrement nue", etc.

**Instructions renforcées pour l'IA:**
- Si COMPLÈTEMENT NU(E): 
  - ⛔ "IL N'Y A PLUS AUCUN VÊTEMENT À RETIRER!"
  - ⛔ "NE DIS JAMAIS: je retire, j'enlève, je dégrafe, sous son soutien-gorge"
  - ✅ "DÉCRIS: son corps nu, ses seins nus, sa peau nue, le contact peau contre peau"

### Poitrine VRAIMENT visible dans les images

#### Problème résolu
Les poitrines des femmes n'étaient pas assez marquées et ressemblantes à la taille réelle (souvent trop petites).

#### Solution v5.4.0

**Nouvelle fonction `getBustFinalReinforcement()`:**
- Ajoute un renforcement CRITIQUE à la FIN du prompt
- Pour les bonnets D+, ajoute des descriptions impossibles à ignorer:
  - D: "IMPORTANT: breasts are LARGE and VISIBLE"
  - DD: "CRITICAL: breasts are VERY LARGE DD-cup, OBVIOUSLY BIG, DOMINANT FEATURE"
  - E: "CRITICAL: breasts are HUGE E-cup, EXTREMELY LARGE, IMPOSSIBLE TO MISS"
  - F+: "CRITICAL: breasts are ENORMOUS, MASSIVE HEAVY, BIGGER THAN HER HEAD"

**Descriptions améliorées:**
- Ajout de phrases comme "STAND OUT", "DOMINATE THE VIEW", "DEMAND ATTENTION"
- Comparaisons visuelles: "BIGGER THAN HER HEAD", "BIGGER THAN MELONS", "BIGGER THAN BASKETBALLS"
- Emphase sur la dominance visuelle: "THE MAIN FOCUS", "DEFINING FEATURE"

**Triple renforcement pour les grandes poitrines:**
1. `getBustUltraPriority()` - Au début du prompt
2. `getBustEmphasis()` - Au milieu avec descriptions
3. `getBustFinalReinforcement()` - À la fin (où l'IA prête le plus d'attention)

### Autres améliorations

- Cache version mis à jour à 5.4.0 (invalidation des anciens prompts)
- Logs de debug améliorés pour le suivi de l'état de nudité
- Détection des expressions de nudité en français et anglais

## Fichiers modifiés

- `src/services/TextGenerationService.js` - Mémoire conversationnelle complète
- `src/services/ImageGenerationService.js` - Poitrine visible + cache 5.4.0
- `app.json` - Version 5.4.0, versionCode 140
- `package.json` - Version 5.4.0
