# Changelog v5.4.12 - Cohérence de l'Activité Sexuelle

## Date: 19 janvier 2026

## Problème Résolu

**Problème :** Le personnage oublie ce qu'il fait actuellement.

**Exemple signalé :**
- Le personnage tenait la bite de l'utilisateur
- L'utilisateur demande : "caresse ma queue"
- Le personnage répond : "touche-moi, caresse-moi" avec les mains sur le torse
- ❌ Incohérent ! Elle devrait continuer à tenir/caresser la bite

## Solution: Suivi de l'Activité Sexuelle en Cours

Nouvelle fonction `extractCurrentSexualActivity()` qui analyse les derniers messages pour détecter:

### 1. Ce que le personnage TIENT actuellement
```javascript
// Détecte: "je prends ta bite", "ma main sur ton sexe", "je branle ta queue"
result.characterHolding = 'ta bite/ton sexe';
```

### 2. Ce que le personnage TOUCHE
```javascript
// Détecte: "je pétris tes seins", "mes mains sur ta poitrine"
result.characterTouching = 'tes seins';
```

### 3. L'ACTION SEXUELLE en cours
```javascript
// Détecte les actions:
- fellation: "je suce ta bite", "je lèche ton gland"
- branlette: "je branle ta queue"
- pénétration: "tu me pénètres", "tu me baises"
- chevauchée: "je te chevauche", "je suis sur toi"
- cunnilingus: "tu me lèches", "tu suces ma chatte"
- levrette: "à quatre pattes", "en levrette"
```

### 4. La POSITION actuelle
```javascript
// Détecte: "à genoux", "allongée", "debout", "à quatre pattes", etc.
result.position = 'à genoux';
```

### 5. Ce que l'UTILISATEUR touche
```javascript
// Détecte: "tu touches mes seins", "ta main sur ma chatte"
result.userTouching = 'mes seins';
```

## Instructions Ajoutées au Prompt

Quand une activité est détectée, le prompt inclut maintenant:

```
🎯🎯🎯 ACTIVITÉ EN COURS - TRÈS IMPORTANT! 🎯🎯🎯
✋ [Personnage] TIENT ACTUELLEMENT: ta bite/ton sexe
→ CONTINUE cette action! Ne lâche pas soudainement!
🔥 ACTION EN COURS: branlette
→ POURSUIS cette action ou fais-la progresser naturellement!
🛏️ POSITION ACTUELLE: à genoux

⚠️ COHÉRENCE OBLIGATOIRE:
- Si tu tenais sa bite, continue de la caresser/sucer/branler
- Si tu étais en train de le/la sucer, continue ou avale
- Ne change PAS brusquement d'action sans raison
- Tes mains restent là où elles étaient!
```

## Patterns de Détection

### Holding (tenir en main)
```javascript
/(?:je\s+)?(?:prends?|tiens?|saisis?|empoigne|attrape|agrippe)\s+(?:ta|sa)?\s*(bite|queue|sexe|pénis)/i
/(?:ma\s+)?main\s+(?:sur|autour\s+de)\s+(?:ta|sa)?\s*(bite|queue|sexe)/i
/(?:je\s+)?(?:branle|masturbe|caresse)\s+(?:ta|sa)?\s*(bite|queue|sexe)/i
```

### Actions sexuelles
```javascript
{ pattern: /(?:je\s+)?(?:suce|tète|lèche)\s+(?:ta|sa)?\s*(?:bite|queue|gland)/i, action: 'fellation' }
{ pattern: /(?:je\s+)?(?:branle|masturbe)\s+(?:ta|sa)?\s*(?:bite|queue)/i, action: 'branlette' }
{ pattern: /(?:tu\s+)?(?:me\s+)?(?:pénètre|baise|prends|enfonce)/i, action: 'pénétration' }
{ pattern: /(?:je\s+)?(?:chevauche|monte|suis\s+sur\s+toi)/i, action: 'chevauchée' }
```

### Positions
```javascript
{ pattern: /(?:je\s+suis\s+)?(?:à\s+genoux|agenouillée?)/i, position: 'à genoux' }
{ pattern: /(?:allongée?|couchée?|étendue?)/i, position: 'allongé(e)' }
{ pattern: /(?:debout|contre\s+le\s+mur)/i, position: 'debout' }
{ pattern: /(?:quatre\s+pattes)/i, position: 'à quatre pattes' }
```

## Fichiers Modifiés

- `src/services/TextGenerationService.js` - Ajout `extractCurrentSexualActivity()`
- `app.json` - Version 5.4.12, versionCode 152
- `package.json` - Version 5.4.12

## Résultat Attendu

**Avant v5.4.12:**
```
USER: *Je me penche* caresse ma queue
CHAR: "Touche-moi, caresse-moi" *mes mains sur ton torse*
❌ Incohérent - elle a lâché la bite sans raison
```

**Après v5.4.12:**
```
USER: *Je me penche* caresse ma queue
CHAR: "Mmm oui..." *ma main accélère sur ta queue, je sens ta bite durcir* "Tu aimes ça?"
✅ Cohérent - elle continue l'action en cours
```
