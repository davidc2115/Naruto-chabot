# Instructions pour corriger la génération d'images dans la version 1.7.5

## 📋 Résumé
La version 1.7.5 contient les 470+ personnages mais la génération d'images ne fonctionne plus. 
Voici comment appliquer le correctif manuellement sur GitHub.

## 🔧 Étapes à suivre sur GitHub

### 1. Forker le dépôt (si ce n'est pas déjà fait)
1. Allez sur https://github.com/davidc2115/Naruto-chabot
2. Cliquez sur "Fork" en haut à droite
3. Cela créera une copie du dépôt dans votre compte GitHub

### 2. Créer une nouvelle branche
1. Allez sur votre fork du dépôt
2. Cliquez sur "main" et tapez "fix-image-generation-v1.7.5"
3. Cliquez sur "Create branch: fix-image-generation-v1.7.5 from main"

### 3. Modifier le fichier ImageGenerationService.js
1. Naviguez vers `src/services/ImageGenerationService.js`
2. Cliquez sur l'icône crayon (Edit)
3. Remplacez tout le contenu du fichier avec le contenu ci-dessous
4. Cliquez sur "Commit changes"

### 4. Lancer le workflow GitHub Actions
1. Allez dans l'onglet "Actions"
2. Sélectionnez le workflow "Build APK (Simple)" ou un autre workflow de build
3. Cliquez sur "Run workflow"
4. Sélectionnez la branche "fix-image-generation-v1.7.5"
5. Cliquez sur "Run workflow"

## 📝 Contenu corrigé de ImageGenerationService.js

Le fichier a été mis à jour avec les améliorations de la version HEAD:
- Extraction détaillée des caractéristiques physiques (couleurs cheveux, yeux, peau, taille, poitrine, etc.)
- API Freebox avec mécanismes de fallback
- Construction de prompts améliorée pour correspondre précisément aux descriptions des personnages
- Gestion du rate limiting et logique de retry pour une meilleure fiabilité

## ✅ Résultat attendu

Une fois le workflow terminé:
- L'APK sera disponible dans la section "Actions" > "Artifacts"
- La génération d'images fonctionnera correctement
- Les images correspondront mieux aux descriptions des personnages
- Les 470+ personnages seront disponibles

## 🚀 Alternative: Utiliser l'APK existant

Si vous préférez ne pas modifier le code, vous pouvez télécharger l'APK existant:
1. Allez sur https://github.com/davidc2115/Naruto-chabot
2. Cliquez sur `roleplay-chat-v1.7.40-FINAL.apk`
3. Cliquez sur "Download"

Cependant, cette version pourrait ne pas contenir tous les 470+ personnages selon vos besoins.
