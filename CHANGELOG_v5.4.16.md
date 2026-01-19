# Changelog v5.4.16 - Images Duo NSFW Améliorées + Qualité

## Date: 19 Janvier 2026

## Améliorations Majeures

### 1. Tenues NSFW Ultra-Détaillées pour Duos

**Niveau 2 (Provocant):**
- Lingerie assortie en dentelle noire, soutiens-gorge push-up, strings, porte-jarretelles
- Mini robes moulantes avec décolletés profonds
- Nuisettes transparentes, soie et dentelle
- Corsets en satin rouge, petites culottes, talons hauts
- Robes ouvertes sur lingerie, courbes visibles

**Niveau 3 (Lingerie explicite):**
- Bodysuits en dentelle noire, tétons visibles à travers le tissu
- Culottes sans entrejambe et soutiens-gorge sans bonnets
- Porte-jarretelles et bas uniquement, poitrines exposées
- Bodysuits en mesh transparent, tout visible
- Corsets à bonnets ouverts, seins exposés et poussés

**Niveau 4 (Topless):**
- Complètement topless, ((seins exposés)), ((tétons visibles))
- Poitrines pressées ensemble, tétons qui se touchent
- Mains caressant les seins exposés de l'autre
- Sur draps de soie topless, pose sensuelle

**Niveau 5 (Nu complet):**
- ((Complètement nues)), ((frontal intégral)), étreinte passionnée
- ((Corps nus)) entrelacés, ((seins pressés ensemble))
- Scène d'amour passionnée, corps exposés
- Nudité complète, beauté naturelle

### 2. Poses NSFW Détaillées pour Duos

**Niveau 2:** Corps proches, mains sur hanches, contact visuel séducteur
**Niveau 3:** Allongées sur lit, corps entrelacés, caresses intimes
**Niveau 4:** Étreinte passionnée topless, jeux de seins intimes
**Niveau 5:** Corps nus entrelacés, positions explicites

### 3. Localisations Romantiques NSFW
- Suite d'hôtel 5 étoiles, lit king size
- Boudoir intime, rideaux en velours
- Penthouse avec vue sur la ville
- Spa privé, ambiance vaporeuse
- Cabine romantique, lueur de cheminée
- Chambre de yacht, vue océan

### 4. Ambiances et Éclairages
- Éclairage romantique doux, lueur dorée
- Ambiance aux bougies, ombres sensuelles
- Éclairage néon, tons roses et violets
- Lumière naturelle, ambiance "matin après"

### 5. Mode NSFW Pollinations AI Activé
- Ajout du paramètre `safe=false` à l'URL Pollinations
- Permet la génération de contenu NSFW explicite
- Paramètre `enhance=true` pour meilleure qualité
- Appliqué à toutes les URLs de génération

### 6. Anatomie Améliorée pour Duos
- Prompt anatomique ultra-détaillé pour deux personnes
- Instructions explicites: tétons visibles, lèvres, yeux détaillés
- Negative prompt spécial duos pour éviter fusions
- Évite: 3+ personnes, corps fusionnés, bras/jambes extra
- Évite: tétons manquants, bouche déformée, yeux absents

### 7. Negative Prompt Spécial Duos
Nouveau `negativeDuoPrompt` qui évite:
- Corps fusionnés ou conjoints
- Bras/jambes/mains supplémentaires
- Têtes ou visages en double
- Tétons manquants
- Lèvres/bouche/yeux déformés ou absents
- Images floues, basse qualité

## Paramètres Pollinations Mis à Jour

```
URL: https://image.pollinations.ai/prompt/{prompt}
Paramètres:
- width=576 (portrait)
- height=1024 (portrait)
- seed={random}
- nologo=true
- model=flux
- enhance=true (qualité améliorée)
- safe=false (NSFW activé)
- nofeed=true (pas de publication)
```

## Fichiers Modifiés
- `src/services/ImageGenerationService.js`:
  - `buildDuoPrompt()` - Tenues et poses NSFW ultra-détaillées
  - `anatomyDuoPrompt` - Instructions anatomiques améliorées
  - `negativeDuoPrompt` - Nouveau negative prompt pour duos
  - URLs Pollinations avec `safe=false`
- `app.json` - Version 5.4.16, versionCode 156
- `package.json` - Version 5.4.16
