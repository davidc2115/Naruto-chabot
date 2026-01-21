# Changelog v5.4.44 - Tierce Personne Renforcée

## Date: 21 janvier 2026

## Corrections

### Problème Signalé
La tierce personne ne parlait pas dans les textes du personnage même quand l'utilisateur l'introduisait explicitement (ex: "surpris par ma femme").

### Corrections Apportées

#### 1. Mots-clés Étendus
Ajout de nombreux nouveaux mots-clés:
- **Belle-famille**: belle-fille, beau-fils, belle-soeur, beau-frère
- **Actions de surprise**: "surpris par", "surprise par", "surpris en train", "nous surprend", "me surprend"
- **Retours**: "elle revient", "il revient"
- **Variantes**: "sa femme", "son mari", "ta mère", "ton père", etc.

#### 2. Instructions Plus Explicites
Format visuel renforcé avec encadrement:
```
╔══════════════════════════════════════════════════════════╗
║  🚨 TIERCE PERSONNE INTRODUITE: LA FEMME                ║
╚══════════════════════════════════════════════════════════╝

⚠️⚠️⚠️ RÈGLE OBLIGATOIRE ⚠️⚠️⚠️
La Femme DOIT parler dans ta réponse!
Tu joues DEUX personnages: [Personnage] ET La Femme
```

#### 3. Exemple Spécifique pour Situation de Surprise
```
[La Femme] *ouvre grand les yeux, bouche bée* "Mais... mais qu'est-ce que vous faites?!" (Oh mon Dieu!)
*se fige, paniqué(e)* "Ce... ce n'est pas ce que tu crois!" (Merde, on est pris!)
```

#### 4. Logique Améliorée
- Si tierce personne détectée → Instructions complètes avec format
- Si pas de tierce personne → Rappel de l'interdiction d'en inventer

### Liste Complète des Mots-clés
```
Famille: ma/sa/ta fille, ma/sa mère, maman, mon/son père, papa
         ma/sa femme, mon/son mari, ma/sa copine, mon/son copain
         ma/sa soeur, mon/son frère

Belle-famille: belle-mère, beau-père, belle-fille, beau-fils
               belle-soeur, beau-frère

Relations: ami(e), voisin(e), collègue, patron(ne), secrétaire

Actions: quelqu'un entre/arrive/vient
         elle/il entre/arrive/rentre/revient
         on nous surprend, surpris par, surprise par
         surpris en train, elle/il nous voit, ouvre la porte
```

## Fichiers Modifiés
1. `src/services/TextGenerationService.js` - Tierce personne renforcée
2. `app.json` - Version 5.4.44, versionCode 184
3. `package.json` - Version 5.4.44

## Build
- Version: 5.4.44
- VersionCode: 184
- Tag: v5.4.44
