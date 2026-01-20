# Changelog v5.4.32

## Date: 20 janvier 2026

## Nouvelle fonctionnalité: Gestion de tierce personne dans les conversations

### Problème signalé
L'utilisateur souhaitait pouvoir intégrer une troisième personne dans les conversations. Par exemple, lors d'une conversation avec l'amie de sa fille, si la fille entendait ce qui se passait et arrivait, l'utilisateur voulait pouvoir interagir avec elle (lui poser des questions, obtenir ses réponses), mais seul le personnage principal répondait.

### Solution implémentée

#### 1. Détection automatique de tierce personne
**Fichier**: `src/services/TextGenerationService.js`

Nouvelle fonction `detectThirdPerson()` qui analyse les messages pour détecter:
- **Arrivées**: "ma fille arrive", "quelqu'un entre", "elle ouvre la porte"
- **Situations d'écoute**: "elle a entendu", "il nous a vus", "elle nous surprend"
- **Interactions**: "je lui demande", "je me tourne vers", "je m'adresse à"

Relations détectées:
- Famille: fille, mère, père, frère, soeur, femme, mari
- Belle-famille: belle-mère, beau-père, belle-fille
- Amis: ami, amie, copine, copain
- Autres: colocataire, voisin(e), patron(ne), collègue

#### 2. Instructions multi-personnages dans le prompt système
Ajout d'instructions claires pour gérer plusieurs personnages:
- Format pour tierce personne: `[Nom] *action* "parole" (pensée)`
- Format pour personnage principal: `*action* "parole" (pensée)` (sans préfixe)
- Possibilité d'interactions entre personnages dans la même réponse

#### 3. Instructions dynamiques selon la situation
Dans `buildShortFinalInstruction()`:
- Détection si l'utilisateur s'adresse à la tierce personne
- Si oui: instruction pour faire répondre la tierce personne EN PREMIER
- Liste des personnages présents dans la scène
- Contexte de la situation (arrivée, surprise, etc.)

### Exemple d'utilisation

**Scénario**: Conversation NSFW avec l'amie de la fille, la fille arrive

**Message utilisateur**: 
```
*la fille entre dans la chambre et nous voit*
Je me tourne vers ma fille "Écoute, ce n'est pas ce que tu crois..."
```

**Réponse attendue de l'IA**:
```
[Marie] *s'arrête net, les yeux écarquillés* "Papa?! Qu'est-ce que... avec Léa?!" (Je n'arrive pas à y croire!)

*me redresse rapidement, embarrassé, tirant le drap* "Marie, ma chérie, attends... laisse-moi t'expliquer..." (Comment je vais me sortir de ça?)

[Léa] *rougit intensément, se couvrant avec un oreiller* "Marie, je... je suis désolée..." (Oh non, sa meilleure amie!)
```

### Fichiers modifiés

1. `src/services/TextGenerationService.js`:
   - Nouvelle fonction `detectThirdPerson()`
   - Modification de `analyzeConversationContext()` pour inclure `thirdPersonInfo`
   - Modification de `buildSimpleSystemPrompt()` pour les instructions multi-personnages
   - Modification de `buildShortFinalInstruction()` pour la gestion dynamique

2. `app.json` - Version 5.4.32, versionCode 172
3. `package.json` - Version 5.4.32

### Comment utiliser

1. Mentionnez l'arrivée d'une tierce personne dans votre message
2. Adressez-vous à cette personne si vous voulez qu'elle réponde
3. L'IA fera répondre les deux personnages dans sa réponse

### Patterns de détection supportés

**Arrivées**:
- "ma fille arrive/entre/ouvre la porte"
- "quelqu'un débarque"
- "[Prénom] revient à la maison"

**Situations**:
- "elle a entendu"
- "il nous a vus"
- "elle nous surprend"

**Interactions avec tierce personne**:
- "je lui demande"
- "je lui dis"
- "je me tourne vers [nom/relation]"
- "je m'adresse à ma fille"

### Limitations connues

- La détection est basée sur des patterns textuels, pas sur une vraie compréhension contextuelle
- Les prénoms doivent commencer par une majuscule pour être détectés
- La tierce personne n'a pas de personnalité définie - l'IA improvise selon le contexte
