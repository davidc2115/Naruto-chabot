# Changelog v5.4.6 - Sexualité Unique par Personnage

## Date: Janvier 2025

## 🆕 Nouvelles Fonctionnalités

### 1. Vitesse NSFW Variable par Personnage
Chaque personnage a sa propre vitesse de progression vers le contenu explicite:
- **very_slow**: Prend énormément de temps (10-15 messages avant un baiser)
- **slow**: A besoin de temps et de connexion
- **normal**: Suit le rythme naturel
- **fast**: Direct et ouvert aux avances
- **very_fast**: Très explicite rapidement
- **immediate**: Veut du sexe tout de suite

### 2. Limites et Refus Sexuels
Les personnages peuvent maintenant **REFUSER** certains actes:
- Refuser l'anal
- Refuser les plans d'un soir
- Refuser la brutalité
- Refuser d'être dominé/soumis
- Et toute autre limite personnalisée

Le personnage exprime son refus de manière réaliste et peut se fâcher si on insiste.

### 3. Préférences Exclusives
Certains personnages veulent **SEULEMENT** une chose:
- Seulement une relation sérieuse
- Seulement un plan d'un soir
- Seulement de l'anal
- Seulement des jeunes hommes
- etc.

### 4. États de Virginité
Gestion détaillée de l'expérience sexuelle:
- **Vierge complet(e)**: Jamais eu de rapport (nerveux, première fois)
- **Vierge anal**: Jamais essayé l'anal (peur, curiosité)
- **Vierge oral**: Jamais fait de sexe oral (maladroit)
- **Première relation**: Jamais été en couple

### 5. Type de Relation Recherché
- **serious**: Veut une relation sérieuse (refuse les plans d'un soir)
- **casual**: Quelque chose de léger sans prise de tête
- **fwb**: Ami(e) avec avantages
- **one_night**: Plan d'un soir uniquement
- **open**: Ouvert à tout

## 📊 Personnages Mis à Jour

| Personnage | Vitesse | Particularité |
|------------|---------|---------------|
| Sarah Chen | very_slow | **VIERGE COMPLÈTE**, timide |
| Jade Petit | very_slow | **VIERGE**, refuse anal |
| Éloïse Fontaine | very_slow | Refuse les plans d'un soir |
| Louise (mannequin) | very_slow | Refuse d'être un objet |
| Maxime Leroy | slow | Romantique, jamais fait d'anal |
| Thomas Beaumont | very_slow | Refuse la vulgarité |
| Clara Rousseau | normal | Jamais fait d'anal |
| Catherine MILF | immediate | Veut SEULEMENT des jeunes hommes |
| Zoé (tatoueuse) | very_fast | Veut SEULEMENT de l'anal! |
| Nyxara (succube) | immediate | AUCUNE limite |
| Lunaria (licorne) | very_slow | **VIERGE TOTALE** |
| Lucas Martin | fast | Direct, aucune limite |
| Alexandre Durant | normal | Refuse d'être soumis |

## 🔧 Modifications Techniques

### TextGenerationService v5.4.6
Nouvelles méthodes:
- `getCharacterSexualLimits(character)` - Retourne les limites/refus
- `getCharacterVirginityStatus(character)` - Retourne l'état de virginité
- `getNSFWProgressionSpeed(character)` - Retourne la vitesse NSFW
- `getRelationshipPreference(character)` - Retourne le type de relation voulu

### Structure Character.sexuality
```javascript
sexuality: {
  nsfwSpeed: 'normal', // very_slow, slow, normal, fast, very_fast, immediate
  relationshipType: 'open', // serious, casual, fwb, one_night, open
  preferences: ['tendresse', 'lenteur'], // ce qu'elle/il aime
  limits: ['brutalité'], // ce qu'elle/il n'aime pas
  refuses: ['anal'], // ce qu'elle/il REFUSE catégoriquement
  only: 'une relation sérieuse', // ce qu'elle/il veut EXCLUSIVEMENT
  virginity: {
    complete: false, // vierge totale
    anal: true, // jamais essayé l'anal
    oral: false, // jamais fait de sexe oral
    relationship: false // première relation
  }
}
```

## 🎮 Exemples de Comportements

### Personnage Vierge (Sarah Chen)
> "Je... je n'ai jamais fait ça avant... *rougit intensément* Tu veux bien aller doucement? J'ai un peu peur mais je te fais confiance..."

### Personnage qui Refuse (Éloïse)
> *recule* "Non. Je ne suis pas ce genre de femme. Si tu veux juste du sexe d'un soir, tu te trompes de personne. Je cherche quelque chose de vrai."

### Personnage Insatiable (Nyxara la Succube)
> "Pas de préambule, mortel. Je sens ton désir brûler. Donne-moi tout, MAINTENANT. Ton corps, ton âme, ton plaisir m'appartiennent."

## 🔄 Mise à jour
- Version: 5.4.6
- VersionCode Android: 146
