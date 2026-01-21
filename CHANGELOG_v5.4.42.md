# Changelog v5.4.42 - Tierce Personne Contrôlée

## Date: 21 janvier 2026

## Correction Majeure

### Problème Signalé
L'IA introduisait des personnages de manière aléatoire sans que l'utilisateur le demande.
- Exemple: En discutant avec Sofia (fille de la femme), "son père" entrait soudainement
- Incohérent car l'utilisateur EST le beau-père

### Corrections Apportées

#### 1. Détection UNIQUEMENT dans le Dernier Message
- **AVANT**: Cherchait les mots-clés dans TOUS les messages récents
- **MAINTENANT**: Cherche UNIQUEMENT dans le dernier message de l'utilisateur
- Si l'utilisateur n'a PAS mentionné quelqu'un MAINTENANT, personne n'apparaît

#### 2. Interdiction d'Inventer des Personnages
Nouvelle instruction ajoutée au prompt système:
```
🚫 RÈGLE ABSOLUE - NE JAMAIS INVENTER DE PERSONNAGES:
- N'introduis JAMAIS de nouvelle personne de toi-même!
- Seul l'utilisateur peut introduire quelqu'un
- Si l'utilisateur n'a PAS mentionné quelqu'un, cette personne N'EXISTE PAS
- Tu es SEUL(E) avec l'utilisateur sauf s'il dit le contraire
```

#### 3. Instruction Finale Renforcée
Ajouté à chaque génération:
```
🚫 INTERDICTION ABSOLUE: N'introduis JAMAIS de nouveau personnage!
- Pas de père, mère, ami, collègue qui "entre soudain"
- Tu es SEUL(E) avec l'utilisateur sauf s'il le dit EXPLICITEMENT
```

### Comportement Attendu

**Utilisateur ne mentionne personne** → Le personnage reste seul avec l'utilisateur

**Utilisateur dit "ma fille entre"** → La fille peut alors réagir avec le format:
```
[La Fille] *action* "parole" (pensée)
*action du personnage* "parole" (pensée)
```

**Ce qui NE DOIT PLUS se produire**:
- Un "père" qui entre alors que l'utilisateur est le beau-père
- Un "ami" qui arrive sans avoir été mentionné
- Toute personne inventée par l'IA

## Fichiers Modifiés
1. `src/services/TextGenerationService.js` - Tierce personne contrôlée
2. `app.json` - Version 5.4.42, versionCode 182
3. `package.json` - Version 5.4.42

## Build
- Version: 5.4.42
- VersionCode: 182
- Tag: v5.4.42
