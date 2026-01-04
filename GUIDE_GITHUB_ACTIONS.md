# 🚀 GUIDE - BUILD AUTOMATIQUE AVEC GITHUB ACTIONS

## ✅ SOLUTION AUTOMATIQUE

J'ai créé un **GitHub Action** qui build l'APK **automatiquement** sans nécessiter d'authentification manuelle !

---

## 📋 PRÉREQUIS (À FAIRE UNE SEULE FOIS)

### Étape 1: Créer un Token Expo

1. **Va sur:** https://expo.dev/settings/access-tokens
2. **Connecte-toi** avec ton compte Expo (ou crée-en un)
3. **Clique sur** "Create Token"
4. **Nom du token:** `GitHub Actions Build`
5. **Scope:** Sélectionne au minimum:
   - ✅ `read:builds`
   - ✅ `write:builds`
   - ✅ `read:projects`
6. **Copie le token** (tu ne pourras plus le voir après !)

### Étape 2: Ajouter le Token dans GitHub Secrets

1. **Va sur ton repo GitHub:**
   ```
   https://github.com/TON-USERNAME/roleplay-chat-app/settings/secrets/actions
   ```

2. **Clique sur** "New repository secret"

3. **Remplis:**
   - **Name:** `EXPO_TOKEN`
   - **Secret:** Colle le token Expo copié à l'étape 1

4. **Clique sur** "Add secret"

✅ **C'est tout ! Tu n'as à faire ça qu'une seule fois.**

---

## 🚀 LANCER LE BUILD

### Option 1: Déclenchement Manuel (Recommandé)

1. **Va sur GitHub:**
   ```
   https://github.com/TON-USERNAME/roleplay-chat-app/actions
   ```

2. **Clique sur** "Build APK v1.7.1 (Tag 7.1)" dans la liste des workflows

3. **Clique sur** "Run workflow" (bouton à droite)

4. **Sélectionne:**
   - **Branch:** `cursor/version-1-6-0-build-7-1-f7fd`
   - **Profile:** `preview` (ou `production`)

5. **Clique sur** "Run workflow" (bouton vert)

6. **Attends 10-20 minutes** 
   - La progression s'affiche en temps réel
   - GitHub t'envoie une notification quand c'est terminé

### Option 2: Déclenchement Automatique sur Push

Le workflow se lance automatiquement quand tu push sur:
- La branche `cursor/version-1-6-0-build-7-1-f7fd`
- Les tags `v1.7.*` ou `7.*`

```bash
# Exemple: Lancer le build en créant un tag
git tag v1.7.1-build
git push origin v1.7.1-build
```

### Option 3: Via Ligne de Commande GitHub CLI

```bash
# Installer GitHub CLI si nécessaire
# https://cli.github.com/

# Déclencher le workflow
gh workflow run "Build APK v1.7.1 (Tag 7.1)" \
  --ref cursor/version-1-6-0-build-7-1-f7fd \
  --field profile=preview
```

---

## 📥 RÉCUPÉRER L'APK

### Méthode 1: Via Artifacts (Toujours disponible)

1. **Va dans l'onglet Actions** de ton repo
2. **Clique sur le workflow** qui vient de se terminer
3. **Scroll en bas** → Section "Artifacts"
4. **Télécharge** `roleplay-chat-v1.7.1-tag-7.1-apk.zip`
5. **Dézippe** et tu as ton APK !

### Méthode 2: Via Release GitHub (Si tag créé)

Si le build est déclenché par un tag, le workflow crée automatiquement une Release GitHub avec l'APK.

1. **Va dans l'onglet Releases** de ton repo
2. **Clique sur la release** v1.7.1
3. **Télécharge l'APK** directement depuis les assets

### Méthode 3: Lien Direct EAS

Le workflow affiche le lien direct EAS dans les logs. Tu peux aussi le retrouver sur:
```
https://expo.dev/accounts/TON-USERNAME/projects/roleplay-chat-app/builds
```

---

## 📊 SURVEILLANCE DU BUILD

### Via GitHub Actions UI

1. **Onglet Actions** → Clique sur le workflow en cours
2. **Voir la progression** en temps réel
3. **Logs détaillés** pour chaque étape
4. **Notifications** par email/GitHub quand terminé

### Via GitHub CLI

```bash
# Lister les runs
gh run list --workflow="Build APK v1.7.1 (Tag 7.1)"

# Voir les détails du dernier run
gh run view

# Voir les logs en temps réel
gh run watch
```

---

## 🎯 AVANTAGES DE GITHUB ACTIONS

✅ **Automatique** - Plus besoin de connexion manuelle  
✅ **Surveillance** - Progression en temps réel dans l'UI GitHub  
✅ **Notifications** - Email quand le build est terminé  
✅ **Artifacts** - APK conservé 30 jours automatiquement  
✅ **Releases** - Création automatique de release GitHub  
✅ **Logs** - Historique complet de tous les builds  
✅ **Gratuit** - 2000 minutes/mois pour les repos publics  

---

## 📋 CE QUE FAIT LE WORKFLOW

```
1. ✅ Checkout du code
2. ✅ Setup Node.js + npm
3. ✅ Installation des dépendances
4. ✅ Setup Expo + EAS
5. 🚀 Lancement du build APK
6. ⏳ Attente de la fin (surveillance auto)
7. 📥 Téléchargement de l'APK
8. 📤 Upload comme artifact GitHub
9. 🏷️ Création de release (si tag)
10. 📊 Résumé du build
```

**Durée totale:** 10-20 minutes (automatique)

---

## 🔧 CONFIGURATION DU WORKFLOW

Le workflow est configuré dans:
```
.github/workflows/build-apk-v1.7.1.yml
```

**Déclencheurs:**
- ✅ Manuel (workflow_dispatch)
- ✅ Push sur branche spécifique
- ✅ Push de tags v1.7.* ou 7.*
- ✅ Modifications de fichiers sources

**Paramètres:**
- `profile`: `preview` (APK) ou `production` (AAB)

---

## 🐛 DÉPANNAGE

### Erreur: "EXPO_TOKEN not found"

**Solution:**
1. Vérifie que tu as créé le secret `EXPO_TOKEN` dans GitHub
2. Le nom doit être exactement `EXPO_TOKEN` (sensible à la casse)
3. Le secret doit être au niveau du repository, pas de l'organization

### Erreur: "Build failed" sur EAS

**Solutions:**
1. Vérifie les logs détaillés dans le workflow
2. Va sur https://expo.dev et vérifie le build
3. Le projectId dans `app.json` doit correspondre à ton projet Expo

### Build prend trop de temps

C'est normal ! Les builds EAS prennent 10-20 minutes. Le workflow attend automatiquement.

### Workflow ne se déclenche pas

**Vérifications:**
1. Le fichier `.github/workflows/build-apk-v1.7.1.yml` est bien commité
2. Tu as push sur la bonne branche
3. Le workflow est activé dans Settings → Actions

---

## ⚡ COMMANDE RAPIDE (TOUT EN UN)

```bash
# 1. Push le code (si pas déjà fait)
git push origin cursor/version-1-6-0-build-7-1-f7fd

# 2. Créer un tag pour déclencher le build + release
git tag v1.7.1-github-build
git push origin v1.7.1-github-build

# 3. Surveiller
gh run watch
```

Ou simplement déclenche manuellement via l'UI GitHub Actions ! 🚀

---

## 📚 RESSOURCES

- **GitHub Actions Docs:** https://docs.github.com/actions
- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **Expo Tokens:** https://expo.dev/settings/access-tokens
- **Workflow File:** `.github/workflows/build-apk-v1.7.1.yml`

---

## 🎉 RÉSUMÉ

```
ÉTAPE 1: Créer token Expo (1 fois)
ÉTAPE 2: Ajouter EXPO_TOKEN dans secrets GitHub (1 fois)
ÉTAPE 3: Déclencher le workflow (manuellement ou via tag)
ÉTAPE 4: Attendre 10-20 min (automatique)
ÉTAPE 5: Télécharger l'APK depuis les artifacts
```

**C'est beaucoup plus simple que l'authentification manuelle !** 🎊

---

**Status:** ✅ Workflow créé et prêt  
**Action:** Configure le token EXPO puis lance le workflow  
**Résultat:** APK buildé automatiquement dans GitHub !
