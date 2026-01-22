# Changelog v5.4.52 - 30 Personnages BDSM

## Date: 2026-01-19

## Résumé
Ajout de **30 personnages BDSM** avec des rôles variés : Dominants, Soumis et Switches, hommes et femmes.

## Nouveau Fichier

### `src/data/bdsmCharacters.js` (30 personnages)

## Répartition des Personnages

### Hommes (15)
| Type | Nombre | Personnages |
|------|--------|-------------|
| Dominants | 8 | Maître Alexandre, Sire Victor, Daddy Marcus, Maître Raven, Sir Thomas, Coach Dominik, Dr. Nathaniel, Maître Kai |
| Soumis | 4 | Esclave Lucas, Pet Noah, Brat Théo, Masochiste Julien |
| Switches | 3 | Switch Gabriel, Switch Raphaël, Switch Dominique |

### Femmes (15)
| Type | Nombre | Personnages |
|------|--------|-------------|
| Dominantes | 8 | Maîtresse Élisabeth, Mistress Scarlett, Mommy Dominique, Déesse Athéna, Maîtresse Jade, Lady Victoria, Mistress Raven, Coach Léa |
| Soumises | 4 | Soumise Amélie, Little Sophie, Brat Emma, Painslut Marina |
| Switches | 3 | Switch Clara, Switch Morgane, Switch Élodie |

## Types de Personnages BDSM

### Dominants/Dominatrices
- **Maîtres/Maîtresses classiques** : Protocoles stricts, fouet, discipline
- **Daddy/Mommy Dom** : DDLG/MDLB, nurturing, protection
- **Sadiques** : Impact play, douleur mesurée
- **Shibari Masters** : Art du bondage japonais
- **Findom** : Domination financière
- **Medical Dom** : Clinical play, examens
- **Mind Dom** : Jeux psychologiques

### Soumis/Soumises
- **Esclaves classiques** : Service total, dévotion
- **Pets** : Pet play (puppy, kitten)
- **Brats** : Provocation, recherche de punition
- **Masochistes** : Besoin de douleur, subspace
- **Littles** : DDLG, régression, innocence

### Switches
- **Équilibrés** : S'adaptent au partenaire
- **Fluides** : Changent de rôle mid-session
- **Mentors** : Enseignent les deux côtés

## Caractéristiques Techniques

### Nouvelles Propriétés de Sexualité
```javascript
sexuality: {
  nsfwSpeed: "slow" | "normal" | "fast",
  virginity: { complete, anal, oral },
  preferences: { dominant, submissive, switch },
  kinks: ["bondage", "discipline", etc.]
}
```

### Kinks Couverts
- Bondage & Shibari
- Impact Play (fouet, fessée)
- Discipline & Protocoles
- Orgasm Control / Denial
- Pet Play
- DDLG / MDLB
- Medical Play
- Wax Play
- Mind Games
- Findom
- Service / Worship

## Tags Utilisés
- `bdsm`, `dominant`, `dominatrice`, `soumis`, `soumise`, `switch`
- `maître`, `maîtresse`, `esclave`, `pet`, `brat`, `masochiste`
- `daddy dom`, `mommy dom`, `little`, `sadique`, `shibari`
- `findom`, `medical`, `gothique`, etc.

## Modifications de Fichiers

### `src/data/allCharacters.js`
- Import de `bdsmCharacters`
- Ajout au tableau `enhancedCharacters`
- Total: **760+ personnages**

### `app.json`
- Version: `5.4.52`
- versionCode: `192`

### `package.json`
- Version: `5.4.52`

## Notes d'Utilisation

### Safe, Sane, Consensual
Tous les personnages BDSM sont conçus avec les principes SSC en tête :
- Safewords mentionnés dans certains scénarios
- Aftercare important pour les dominants
- Consentement toujours implicite

### Variété de Niveaux
- Débutants : Little Sophie, Pet Noah
- Intermédiaires : Brat Emma, Switch Clara
- Expérimentés : Lady Victoria, Sire Victor
- Extrêmes : Painslut Marina, Masochiste Julien
