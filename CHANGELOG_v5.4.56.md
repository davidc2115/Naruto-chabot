# Changelog v5.4.56

## Date: 19 Janvier 2026

## Nouveaux Personnages en Uniforme

### 10 Hommes en Uniforme
1. **Capitaine Lucas Renard** - Gendarme, 35 ans, autoritaire et protecteur
2. **Lieutenant Maxime Duval** - Pompier, 32 ans, héroïque et musclé
3. **Sergent-Chef Thomas Mercier** - Militaire, 38 ans, discipliné et dominant
4. **Dr. Antoine Lambert** - Médecin urgentiste, 40 ans, attentionné
5. **Commandant Hugo Lefebvre** - Pilote de ligne, 42 ans, charismatique
6. **Officier Julien Roux** - Policier BAC, 30 ans, bad boy sexy
7. **Maître-Nageur Enzo Costa** - Maître-nageur, 28 ans, bronzé et confiant
8. **Chef Marc Fontaine** - Chef cuisinier, 36 ans, passionné
9. **Agent Kevin Martin** - Bodyguard, 27 ans, protecteur vigilant
10. **Professeur Alexandre Dubois** - Professeur, 34 ans, intellectuel séducteur

### 10 Femmes en Uniforme
1. **Capitaine Marie Leclerc** - Femme gendarme, 34 ans, dominante stricte
2. **Lieutenant Sarah Moreau** - Pompière, 29 ans, courageuse et passionnée
3. **Sergent Élodie Martin** - Femme militaire, 31 ans, corps d'acier
4. **Dr. Sophie Bernard** - Médecin, 36 ans, professionnelle séduisante
5. **Commandant Isabelle Petit** - Femme pilote, 38 ans, sophistiquée
6. **Brigadier Julie Roux** - Policière rousse, 28 ans, joueuse
7. **Infirmière Claire Dumont** - Infirmière, 27 ans, douce et câline
8. **Hôtesse Emma Fontaine** - Hôtesse de l'air, 26 ans, glamour
9. **Coach Laura Girard** - Coach sportive, 30 ans, motivante et exigeante
10. **Professeure Nathalie Leroy** - Professeure, 33 ans, intellectuelle stricte

## Correction Affichage Version

### Mise à jour dynamique dans Paramètres
- **Version** maintenant lue directement depuis `app.json`
- **Build** (versionCode) également affiché
- **Nombre de personnages** mis à jour: 840+
- Plus besoin de mise à jour manuelle à chaque version

## Amélioration File d'Attente Images (Freebox)

### v5.4.56 - ImageQueueService Amélioré
- **Délai entre requêtes**: 3 secondes (évite rate limits)
- **Retry automatique**: 2 tentatives en cas d'échec
- **Pas de fallback Pollinations**: Reste sur Freebox, message d'attente clair
- **Statistiques de file**: Succès/Échecs trackés
- **Message d'attente UI**: "📋 File d'attente: X image(s) - ~Ys"

### Fonctionnalités
- Génération séquentielle garantie
- Estimation du temps d'attente
- Annulation de requête possible
- Reset des statistiques

## Fichiers Modifiés
- `src/data/uniformCharacters.js` (NOUVEAU)
- `src/data/allCharacters.js` - Import des personnages uniformes
- `src/screens/SettingsScreen.js` - Version dynamique depuis app.json
- `src/services/ImageQueueService.js` - File d'attente améliorée
- `src/services/ImageGenerationService.js` - Intégration queue Freebox
- `app.json` - Version 5.4.56, versionCode 196
- `package.json` - Version 5.4.56

## Nombre Total de Personnages: 840+
