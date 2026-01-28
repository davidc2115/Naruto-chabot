# Changelog v5.4.41 - Cohérence et Sexualité

## Date: 21 janvier 2026

## Corrections

### 1. Cohérence Narrative (Fix Majeur)
**Problème**: L'IA répétait ce que l'utilisateur venait de dire au lieu de continuer l'histoire.
- Ex: User dit "ma fille entre, je la salue" → IA répond "elle entre dans la cuisine..."

**Solution**:
- Instruction explicite: "NE RÉPÈTE PAS ce que l'utilisateur vient de dire!"
- Instruction: "CONTINUE l'histoire depuis où l'utilisateur s'est arrêté"
- Exemple incorrect vs correct dans le prompt
- **Fichier**: `src/services/TextGenerationService.js`

### 2. Tierce Personne (Instructions Corrigées)
- L'IA doit faire RÉAGIR/RÉPONDRE la tierce personne, pas décrire son arrivée à nouveau
- Exemple clair: Si l'utilisateur dit "ma fille entre, je la salue":
  - ❌ INCORRECT: "[La Fille] entre dans la cuisine..."
  - ✅ CORRECT: "[La Fille] *te sourit* 'Salut papa!' (Il est déjà rentré)"
- Format: `[Nom] *action* "parole" (pensée)`

### 3. Sexualité des Personnages (Rappel des fonctionnalités)
Les fonctionnalités de sexualité sont déjà en place:

**Virginité** (`getCharacterVirginityStatus`):
- Vierge complet(e) - jamais eu de rapport
- Vierge anal(e) - jamais essayé l'anal
- Vierge oral(e) - jamais fait de fellation/cunnilingus
- Généré automatiquement pour les 18-21 ans si non défini

**Limites et Refus** (`getCharacterSexualLimits`):
- Limites absolues que le personnage REFUSE
- Préférences (ce qu'il/elle aime)
- "Only" - ce qu'il/elle accepte EXCLUSIVEMENT
- Limites par défaut selon tempérament:
  - Timide: refuse brutalité, humiliation, exhibitionnisme
  - Romantique: refuse sexe brutal, one night stand
  - Jeune (≤20): refuse pratiques extrêmes

**Vitesse NSFW** (`getNSFWProgressionSpeed`):
- Timide: très lent (0.3x) - résiste au NSFW
- Amical: normal (0.5x)
- Séducteur: rapide (1.0x)
- Dominant: très rapide (1.5x)

**Type de Relation** (`getRelationshipPreference`):
- Sérieux: refuse les plans d'un soir
- Casual: accepte tout
- FWB: amis avec avantages
- One night: aventures uniquement

## Configuration Sexualité (character.sexuality)
```javascript
{
  virginity: {
    complete: true,  // Vierge complet
    anal: true,      // Jamais essayé l'anal
    oral: true,      // Jamais sucé/léché
  },
  refuses: ['anal', 'brutalité'],  // Ce qu'il/elle refuse
  limits: ['pratiques extrêmes'],   // Limites absolues
  preferences: ['douceur', 'tendresse'], // Ce qu'il/elle aime
  only: 'anal',  // Accepte UNIQUEMENT ça
  nsfwSpeed: 'slow', // slow, normal, fast
  relationshipType: 'serious' // serious, casual, fwb, one_night
}
```

## Fichiers Modifiés
1. `src/services/TextGenerationService.js` - Cohérence + tierce personne
2. `app.json` - Version 5.4.41, versionCode 181
3. `package.json` - Version 5.4.41

## Build
- Version: 5.4.41
- VersionCode: 181
- Tag: v5.4.41
