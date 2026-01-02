# 🎓 Guide d'utilisation détaillé

## Table des matières

1. [Premier lancement](#premier-lancement)
2. [Configuration des clés API](#configuration-des-clés-api)
3. [Explorer les personnages](#explorer-les-personnages)
4. [Démarrer une conversation](#démarrer-une-conversation)
5. [Maîtriser le roleplay](#maîtriser-le-roleplay)
6. [Système de relation](#système-de-relation)
7. [Génération d'images](#génération-dimages)
8. [Gérer les conversations](#gérer-les-conversations)
9. [Astuces et conseils](#astuces-et-conseils)

---

## Premier lancement

### Installation

1. **Sur votre ordinateur** :
   ```bash
   npm install
   npm start
   ```

2. **Sur votre téléphone Android** :
   - Téléchargez "Expo Go" depuis le Play Store
   - Ouvrez Expo Go
   - Scannez le QR code affiché sur votre ordinateur

3. **Première ouverture** :
   - L'app s'ouvre sur la page d'accueil
   - Vous verrez 200 personnages disponibles
   - Mais vous ne pourrez pas encore discuter...

---

## Configuration des clés API

### Pourquoi des clés API ?

L'application utilise l'IA Groq pour générer les réponses des personnages. C'est gratuit mais nécessite une clé.

### Obtenir des clés (5 minutes)

1. **Allez sur** : [console.groq.com](https://console.groq.com)
2. **Créez un compte** : Email + Mot de passe
3. **Confirmez votre email**
4. **Accédez à "API Keys"** dans le menu
5. **Cliquez sur "Create API Key"**
6. **Copiez la clé** (format : gsk_...)

### Ajouter les clés dans l'app

1. Ouvrez l'application
2. Allez dans l'onglet **"Paramètres"** ⚙️ (en bas)
3. Collez votre clé dans le champ
4. Cliquez sur **"Sauvegarder"**
5. Testez avec le bouton **"🧪 Tester"**

### Multi-clés (recommandé)

Pour avoir des capacités quasi-illimitées :

1. Créez 3-5 clés Groq différentes
2. Cliquez sur **"+ Ajouter une clé"** dans l'app
3. Collez chaque clé
4. Sauvegardez

**Avantage** : L'app alternera automatiquement entre les clés !

---

## Explorer les personnages

### Page d'accueil

- **200 personnages** disponibles
- **Carte par personnage** avec :
  - Initiales
  - Nom et âge
  - Genre
  - Description courte
  - Tags (profession, traits)

### Recherche

Utilisez la barre de recherche pour trouver :
- Par nom : "Emma"
- Par tag : "avocat", "timide", "sportif"
- Par personnalité : "romantique"

### Filtres

- **Tous** : 200 personnages
- **Femmes** : ~80 personnages
- **Hommes** : ~80 personnages  
- **NB** : ~40 personnages non-binaires

### Voir les détails

Cliquez sur n'importe quel personnage pour voir :
- Photo générée par IA
- Informations complètes
- Apparence physique détaillée
- Personnalité
- Tempérament
- Scénario de départ
- Stats de relation (si déjà discuté)

---

## Démarrer une conversation

### Première conversation

1. Choisissez un personnage
2. Lisez son scénario
3. Cliquez sur **"✨ Commencer la conversation"**
4. Le personnage envoie le premier message
5. À vous de jouer !

### Reprendre une conversation

- Si vous avez déjà discuté avec un personnage
- Retournez sur sa page détails
- Cliquez sur **"💬 Continuer la conversation"**
- Reprenez là où vous en étiez !

---

## Maîtriser le roleplay

### Format RP

Le roleplay utilise un format spécial :

```
*Actions et mouvements*
"Dialogues parlés"
*Pensées internes*
```

### Exemples

**❌ Mauvais** :
```
Salut comment vas-tu
```

**✅ Bon** :
```
*Je m'approche avec un sourire* "Salut ! Comment vas-tu ?"
```

**✅ Encore mieux** :
```
*Je m'approche timidement, les mains dans les poches* "Euh... salut !" *Je me demande si j'ai l'air nerveux* "Comment vas-tu ?"
```

### Conseils d'écriture

1. **Décrivez vos actions** : Comment vous bougez, où vous regardez
2. **Ajoutez des émotions** : Sourire, rougir, nervosité
3. **Utilisez le présent** : "Je marche" pas "J'ai marché"
4. **Restez cohérent** : Respectez le scénario du personnage
5. **Soyez créatif** : Faites avancer l'histoire

### Types de réponses selon tempérament

- **Timide** : Rougit, évite le regard, hésite
- **Direct** : Va droit au but, franc, confiant
- **Romantique** : Doux, attentionné, émotionnel
- **Flirt** : Taquin, séducteur, joueur
- **Taquin** : Espiègle, blagueur, léger
- **Coquin** : Suggestif, audacieux, provocant
- **Mystérieux** : Énigmatique, secret, intense
- **Dominant** : Autoritaire, contrôle, exigeant

---

## Système de relation

### Les 4 stats

1. **Niveau** (1-20+)
   - Progression générale
   - Monte avec l'expérience

2. **Expérience (XP)**
   - Gagnée à chaque message
   - 100 XP = +1 niveau

3. **Affection** (0-100%)
   - Affection du personnage envers vous
   - Monte avec messages positifs
   - Baisse avec messages négatifs

4. **Confiance** (0-100%)
   - Niveau de confiance
   - Monte progressivement
   - Dépend du tempérament

### Comment gagner de l'XP

- **Messages longs** : Plus de XP
- **Messages descriptifs** : Bonus
- **Cohérence** : Respecter le personnage
- **Régularité** : Discuter souvent

### Niveaux de relation

- Niveau 1-4 : **Inconnu**
- Niveau 5-9 : **Connaissance**
- Niveau 10-14 : **Ami**
- Niveau 15-19 : **Proche**
- Niveau 20+ : **Âme sœur**

### Voir les stats

- En haut de la conversation : Vue compacte
- Sur la page détails : Vue complète avec barres

---

## Génération d'images

### Quand générer

Générez une image pour :
- Visualiser le personnage
- Illustrer une scène
- Marquer un moment spécial
- Ajouter de l'immersion

### Comment générer

1. Pendant une conversation
2. Cliquez sur le bouton **🎨** (à gauche de l'input)
3. Attendez 5-15 secondes
4. L'image apparaît dans la conversation

### Styles d'images

L'IA génère aléatoirement :
- Photos photoréalistes
- Style animé/manga
- Digital art
- Rendu 3D
- Art conceptuel
- Autres styles

### Astuces

- Décrivez bien la scène dans vos messages
- L'image est générée en fonction du contexte
- Chaque génération est unique
- C'est gratuit et illimité !

---

## Gérer les conversations

### Historique

Onglet **"Conversations"** 💬 :
- Toutes vos discussions
- Triées par date récente
- Stats rapides (messages, affection, niveau)
- Cliquez pour continuer

### Supprimer une conversation

1. Allez dans "Conversations"
2. **Appuyez longuement** sur une conversation
3. Confirmez la suppression

⚠️ **Attention** : C'est irréversible !

### Sauvegardes

- **Automatique** après chaque message
- **Local** sur votre téléphone
- **Pas de cloud** (pour l'instant)

---

## Astuces et conseils

### Pour de meilleures conversations

1. **Lisez le scénario** : Comprenez le contexte
2. **Respectez le personnage** : Chacun est unique
3. **Soyez descriptif** : Plus de détails = meilleures réponses
4. **Variez les actions** : Ne faites pas toujours pareil
5. **Laissez le personnage répondre** : Pas de double message

### Optimiser les performances

1. **WiFi** : Meilleur que 4G pour les images
2. **Plusieurs clés** : Rotation = rapidité
3. **Messages raisonnables** : 50-200 mots idéal
4. **Nettoyage** : Supprimez les vieilles conversations

### Choisir le bon personnage

- **Débutant** : Tempérament "romantique" ou "direct"
- **Timide IRL** : Essayez un personnage "timide"
- **Aventure** : Tempérament "mystérieux" ou "coquin"
- **Sérieux** : Professions intellectuelles
- **Fun** : Tempérament "taquin" ou "flirt"

### Éviter les erreurs API

1. Testez vos clés régulièrement
2. Ajoutez plusieurs clés
3. Attendez entre messages si erreur
4. Vérifiez votre connexion internet

### Maximiser l'immersion

1. Générez une image du personnage au début
2. Utilisez beaucoup de *actions*
3. Ajoutez des "dialogues" naturels
4. Laissez le personnage mener parfois
5. Réagissez à ses émotions

---

## Raccourcis et fonctionnalités cachées

### Dans les conversations

- **Scroll rapide** : Tapez en haut de l'écran
- **Voir l'heure** : Chaque message a un timestamp
- **Stats en direct** : Barre en haut de la conversation

### Sur la page personnage

- **Régénérer l'image** : Bouton 🔄 pour nouvelle image
- **Tags cliquables** : (future fonctionnalité)

### Dans les paramètres

- **Test API** : Vérifie sans créer de conversation
- **Clés masquées** : Pour la sécurité
- **Info version** : En bas de la page

---

## Prochaines étapes

Maintenant que vous maîtrisez l'app :

1. ✅ Explorez différents personnages
2. ✅ Essayez différents tempéraments
3. ✅ Montez des relations à niveau 10+
4. ✅ Générez des images pour vos conversations préférées
5. ✅ Créez votre propre style RP

**Amusez-vous bien ! 🎭✨**
