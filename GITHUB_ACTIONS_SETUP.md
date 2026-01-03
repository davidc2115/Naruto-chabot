# 🚀 Configuration GitHub Actions pour Build APK

## 📋 Prérequis

1. **Compte Expo** (gratuit)
   - Créez un compte sur https://expo.dev

2. **Token Expo**
   - Connectez-vous à Expo
   - Allez sur https://expo.dev/accounts/[username]/settings/access-tokens
   - Créez un nouveau token
   - Copiez-le (vous ne pourrez plus le voir après)

3. **Repository GitHub**
   - Votre code doit être sur GitHub
   - Vous devez avoir les droits admin

---

## ⚙️ Configuration des Secrets GitHub

### 1. Ajouter le token Expo

1. Allez sur votre repository GitHub
2. Cliquez sur **Settings** (⚙️)
3. Dans le menu de gauche, cliquez sur **Secrets and variables** > **Actions**
4. Cliquez sur **New repository secret**
5. Nom: `EXPO_TOKEN`
6. Valeur: Collez votre token Expo
7. Cliquez sur **Add secret**

### 2. Vérifier les permissions

1. Toujours dans **Settings**
2. Allez dans **Actions** > **General**
3. Sous "Workflow permissions", sélectionnez **Read and write permissions**
4. Cochez **Allow GitHub Actions to create and approve pull requests**
5. Cliquez sur **Save**

---

## 🎯 Workflows disponibles

### 1. Build APK Simple (Recommandé)

**Fichier**: `.github/workflows/build-apk-simple.yml`

**Déclenchement**: Manuel uniquement

**Comment l'utiliser**:
1. Allez dans l'onglet **Actions** de votre repo
2. Cliquez sur **Build APK (Simple)** dans la liste de gauche
3. Cliquez sur **Run workflow**
4. Entrez la version (ex: 1.0.0)
5. Cliquez sur **Run workflow**

**Ce qu'il fait**:
- ✅ Install les dépendances
- ✅ Build l'APK avec EAS
- ✅ Télécharge l'APK
- ✅ Crée une release GitHub avec l'APK

---

### 2. Build Automatique

**Fichier**: `.github/workflows/build-apk.yml`

**Déclenchement**: 
- Push sur main/master
- Tags v*
- Manuel

**Ce qu'il fait**:
- ✅ Build complet avec surveillance
- ✅ Attend la fin du build
- ✅ Télécharge l'APK
- ✅ Crée une release avec infos détaillées

---

### 3. Manual Release

**Fichier**: `.github/workflows/manual-release.yml`

**Déclenchement**: Manuel uniquement

**Avantage**: Vous pouvez ajouter des notes de release personnalisées

---

## 🚀 Utilisation rapide

### Première release (Méthode simple)

1. **Push votre code sur GitHub**
   ```bash
   git add .
   git commit -m "Initial commit with app"
   git push origin main
   ```

2. **Allez sur GitHub**
   - Repository > Actions
   - Sélectionnez "Build APK (Simple)"
   - Run workflow
   - Version: 1.0.0

3. **Attendez** (15-20 minutes)
   - Le workflow s'exécute
   - L'APK se build
   - La release se crée

4. **Téléchargez**
   - Allez dans l'onglet **Releases**
   - Téléchargez l'APK

---

## 🔧 Première exécution détaillée

### Étape 1: Configurer EAS Build

Avant la première utilisation, configurez EAS localement:

```bash
# Installer EAS CLI
npm install -g eas-cli

# Se connecter
eas login

# Configurer le projet
eas build:configure
```

Cela va créer `eas.json` (déjà fait dans ce projet).

### Étape 2: Premier build manuel (optionnel)

Pour tester avant d'utiliser GitHub Actions:

```bash
eas build --platform android --profile preview
```

### Étape 3: Push sur GitHub

```bash
git add .
git commit -m "Add GitHub Actions workflows"
git push origin main
```

### Étape 4: Exécuter le workflow

1. GitHub.com > Votre repo
2. Actions tab
3. "Build APK (Simple)"
4. Run workflow
5. Entrez version "1.0.0"
6. Run workflow

---

## 📊 Suivi du build

### Pendant le build

1. Allez dans **Actions**
2. Cliquez sur le workflow en cours
3. Vous verrez les étapes s'exécuter en temps réel

### Logs détaillés

Cliquez sur chaque étape pour voir les logs:
- 🔍 Checkout code
- 🟢 Setup Node.js
- 📦 Install dependencies
- 🔧 Setup Expo
- 🏗️ Build APK
- 📥 Download APK
- 🏷️ Create Release

### Durée estimée

- **Installation**: 1-2 minutes
- **Build EAS**: 15-20 minutes
- **Total**: ~20-25 minutes

---

## 📦 Récupérer l'APK

### Méthode 1: Release GitHub (Recommandé)

1. Allez sur votre repo GitHub
2. Cliquez sur **Releases** (à droite)
3. Vous verrez la release créée
4. Téléchargez le fichier `.apk`

### Méthode 2: Artifacts

1. Actions > Votre workflow terminé
2. Scrollez en bas
3. Section "Artifacts"
4. Téléchargez `roleplay-chat-apk`

---

## 🐛 Dépannage

### Erreur: "EXPO_TOKEN not found"

**Solution**:
1. Vérifiez que vous avez créé le secret `EXPO_TOKEN`
2. Vérifiez l'orthographe (majuscules)
3. Régénérez le token sur expo.dev si besoin

### Erreur: "eas command not found"

**Cause**: EAS CLI pas installé dans le workflow

**Solution**: Le workflow devrait installer automatiquement. Vérifiez que l'étape "Setup Expo" s'exécute.

### Build échoue sur EAS

**Solutions**:
1. Vérifiez que `app.json` et `eas.json` sont valides
2. Testez localement d'abord: `eas build -p android`
3. Vérifiez les logs EAS sur expo.dev

### Timeout du workflow

**Cause**: Le build prend plus de 30 minutes

**Solution**: Augmentez le timeout dans le workflow ou utilisez `--no-wait` et récupérez le build plus tard

---

## 🎨 Personnalisation

### Changer le nom de l'APK

Dans le workflow, modifiez:
```yaml
wget -O mon-app.apk "$BUILD_URL"
```

### Ajouter des tests avant build

Ajoutez une étape:
```yaml
- name: Run tests
  run: npm test
```

### Build automatique sur push

Le workflow `build-apk.yml` le fait déjà. Pour désactiver:
```yaml
on:
  # Commentez ces lignes
  # push:
  #   branches:
  #     - main
  workflow_dispatch:  # Garder seulement manuel
```

---

## 📈 Versions et Tags

### Créer une release avec tag

```bash
git tag -a v1.0.0 -m "Version 1.0.0"
git push origin v1.0.0
```

Le workflow se déclenchera automatiquement et créera une release `v1.0.0`.

### Numérotation sémantique

- **v1.0.0** - Release initiale
- **v1.0.1** - Bug fixes
- **v1.1.0** - Nouvelles fonctionnalités
- **v2.0.0** - Breaking changes

---

## ✅ Checklist finale

Avant de lancer votre premier build:

- [ ] Token Expo créé
- [ ] Secret `EXPO_TOKEN` ajouté sur GitHub
- [ ] Permissions "Read and write" activées
- [ ] Code pushé sur GitHub
- [ ] `eas.json` présent dans le repo
- [ ] `app.json` configuré correctement

Puis:

- [ ] Actions > Build APK (Simple) > Run workflow
- [ ] Attendre ~20 minutes
- [ ] Vérifier que la release est créée
- [ ] Télécharger l'APK
- [ ] Tester sur Android

---

## 🎉 Après le premier build

Une fois que ça marche:

1. **L'APK est dans Releases**
   - Téléchargeable directement
   - Versionné
   - Avec description

2. **Pour les futures versions**
   - Changez le code
   - Push sur GitHub
   - Run workflow avec nouvelle version
   - Nouvelle release créée automatiquement

3. **Partager l'app**
   - Partagez le lien de la release
   - Les utilisateurs téléchargent l'APK
   - Installation directe sur Android

---

## 💡 Conseils

1. **Première fois**: Utilisez "Build APK (Simple)" - c'est le plus fiable
2. **Test local d'abord**: `eas build -p android` avant de pousser
3. **Vérifiez les logs**: Si ça échoue, lisez les logs dans Actions
4. **Patience**: Le premier build prend du temps (15-20 min)
5. **Gardez le token secret**: Ne le commitez jamais dans le code

---

## 📞 Support

Si vous avez des erreurs:

1. Lisez les logs du workflow (Actions > Click sur le run)
2. Vérifiez que tous les secrets sont configurés
3. Testez `eas build` localement d'abord
4. Consultez https://docs.expo.dev/build/introduction/

---

**Votre APK sera disponible dans Releases après le build ! 🎉**
