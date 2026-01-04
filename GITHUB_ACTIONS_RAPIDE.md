# 🚀 GITHUB ACTIONS - GUIDE ULTRA-RAPIDE

## ✅ SOLUTION AUTOMATIQUE AVEC GITHUB ACTIONS

Plus besoin d'authentification manuelle ! Le build se fait **automatiquement** dans GitHub.

---

## 📋 SETUP (1 FOIS SEULEMENT)

### 1. Créer Token Expo (2 minutes)

```
1. Va sur: https://expo.dev/settings/access-tokens
2. Connecte-toi (ou crée un compte)
3. Clique "Create Token"
4. Nom: "GitHub Actions Build"
5. Scope: read:builds, write:builds, read:projects
6. COPIE le token (tu ne le verras plus après!)
```

### 2. Ajouter dans GitHub Secrets (1 minute)

```
1. Va sur ton repo GitHub
2. Settings → Secrets and variables → Actions
3. Clique "New repository secret"
4. Name: EXPO_TOKEN
5. Secret: Colle le token Expo
6. "Add secret"
```

✅ **Terminé ! Tu n'as plus jamais à le refaire.**

---

## 🚀 LANCER LE BUILD (10 secondes)

### Via GitHub UI (Plus Simple)

```
1. Va sur: https://github.com/TON-USERNAME/TON-REPO/actions
2. Clique "Build APK v1.7.1 (Tag 7.1)"
3. Clique "Run workflow"
4. Sélectionne la branche: cursor/version-1-6-0-build-7-1-f7fd
5. Clique "Run workflow" (vert)
```

### Via Commande Git

```bash
git tag v1.7.1-build
git push origin v1.7.1-build
```

---

## 📥 RÉCUPÉRER L'APK (Après 10-20 min)

### Méthode 1: Artifacts

```
1. Actions → Clique sur le workflow terminé
2. Scroll en bas → "Artifacts"
3. Télécharge roleplay-chat-v1.7.1-tag-7.1-apk.zip
4. Dézippe → APK prêt !
```

### Méthode 2: Release (Si tag)

```
1. Onglet "Releases"
2. Clique sur v1.7.1
3. Télécharge l'APK direct
```

---

## 🎯 AVANTAGES

✅ **Automatique** - Aucune authentification manuelle  
✅ **Gratuit** - 2000 minutes/mois pour repos publics  
✅ **Surveillance** - Progression en temps réel  
✅ **Notifications** - Email quand c'est prêt  
✅ **Historique** - Tous les builds conservés  

---

## 📚 GUIDE COMPLET

Voir: **GUIDE_GITHUB_ACTIONS.md**

---

**TL;DR:**
1. Crée token Expo → Ajoute dans secrets GitHub (1 fois)
2. Actions → Run workflow (10 secondes)
3. Attends 10-20 min (automatique)
4. Télécharge APK depuis artifacts 🎉
