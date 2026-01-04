# 🚀 GUIDE COMPLET - BUILD APK v1.7.1 (Tag 7.1)

## ⚠️ IMPORTANT - Authentification Requise

Le build EAS nécessite une **authentification interactive** que je ne peux pas effectuer automatiquement dans cet environnement cloud.

**Tu dois lancer le build manuellement** en suivant ce guide.

---

## 📋 ÉTAT ACTUEL DU PROJET

✅ **Tout est prêt pour le build:**

```
✅ Code v1.7.1 avec corrections NSFW
✅ Toutes fonctionnalités v1.6.0 conservées
✅ package.json → version 1.7.1
✅ app.json → version 1.7.1
✅ Tags Git créés (7.1 et v1.7.1)
✅ Dépendances installées (npm install)
✅ Configuration EAS en place (eas.json)
✅ Scripts de build créés
```

---

## 🎯 OPTION 1 - MÉTHODE SIMPLE (RECOMMANDÉE)

### Étape 1: Se Connecter à EAS

```bash
cd /workspace
npx eas-cli login
```

**Identifiants:**
- Entre ton email Expo
- Entre ton mot de passe
- (Si pas de compte, crée-en un sur https://expo.dev)

### Étape 2: Lancer le Build avec Surveillance

```bash
bash launch-and-monitor-build.sh
```

Ce script va :
1. ✅ Vérifier l'authentification
2. ✅ Lancer le build APK
3. ✅ Surveiller automatiquement la progression
4. ✅ Te notifier quand c'est terminé
5. ✅ Afficher le lien de téléchargement

**Durée:** 10-20 minutes

---

## 🛠️ OPTION 2 - COMMANDES MANUELLES

### 1. Connexion

```bash
cd /workspace
npx eas-cli login
```

### 2. Lancement du Build

```bash
npx eas-cli build --platform android --profile preview --message "v1.7.1 Tag 7.1"
```

### 3. Surveillance du Build

```bash
# Voir tous les builds
npx eas-cli build:list

# Voir les détails du dernier build
npx eas-cli build:view

# Surveiller en temps réel (toutes les 30 secondes)
watch -n 30 'npx eas-cli build:list --limit 1'
```

### 4. Téléchargement de l'APK

Une fois le build terminé, le lien de téléchargement sera affiché.

```bash
# Ou obtenir le lien directement
npx eas-cli build:list --limit 1 --json | grep -o 'https://.*\.apk'
```

---

## 🌐 OPTION 3 - VIA LE DASHBOARD WEB

### Accès au Dashboard

1. Va sur: **https://expo.dev**
2. Connecte-toi avec ton compte
3. Va dans: **Projects → roleplay-chat-app → Builds**
4. Clique sur **"Create Build"**
5. Sélectionne:
   - Platform: **Android**
   - Build type: **APK**
   - Profile: **preview**
6. Clique sur **"Build"**

### Surveillance

Le dashboard affiche en temps réel :
- 📊 Progression du build (%)
- ⏱️ Temps écoulé
- 📝 Logs en direct
- ✅ Statut (queued, in-progress, finished)

### Téléchargement

Quand le build est terminé :
- Clique sur **"Download"** pour récupérer l'APK
- Ou copie le lien de téléchargement direct

---

## 📱 OPTION 4 - BUILD LOCAL (SANS EAS)

Si tu préfères un build 100% local (plus complexe) :

### Prérequis

- ✅ Android Studio installé
- ✅ Android SDK configuré
- ✅ Java JDK 11+
- ✅ Variables d'environnement ANDROID_HOME et JAVA_HOME

### Commandes

```bash
# 1. Préparer le projet natif
cd /workspace
npx expo prebuild

# 2. Aller dans le dossier Android
cd android

# 3. Build l'APK
./gradlew assembleRelease

# 4. L'APK sera dans:
# android/app/build/outputs/apk/release/app-release.apk
```

**Avantages:** Contrôle total, pas de dépendance cloud  
**Inconvénients:** Configuration complexe, temps de setup

---

## 🔍 SURVEILLANCE DU BUILD

### Commandes Utiles

```bash
# Statut actuel
npx eas-cli build:list --limit 1

# Détails complets
npx eas-cli build:view

# Logs en direct
npx eas-cli build:view --logs

# Liste de tous les builds
npx eas-cli build:list --limit 10

# Annuler un build en cours
npx eas-cli build:cancel
```

### Statuts Possibles

- 🟡 **queued** - En attente dans la file
- 🔵 **in-progress** - En cours de build
- 🟢 **finished** - Terminé avec succès ✅
- 🔴 **errored** - Erreur durant le build ❌
- ⚫ **canceled** - Annulé manuellement

---

## 📥 RÉCUPÉRATION DE L'APK

### Méthode 1: Via CLI

```bash
# Afficher le lien de téléchargement
npx eas-cli build:view --json | grep -o 'https://.*\.apk'

# Télécharger directement
wget $(npx eas-cli build:view --json | grep -o 'https://.*\.apk' | head -1) -O roleplay-chat-v1.7.1-tag-7.1.apk
```

### Méthode 2: Via Dashboard

1. Va sur https://expo.dev
2. Projet → roleplay-chat-app → Builds
3. Clique sur le build terminé
4. Clique sur **"Download"**

### Méthode 3: Via Email

Tu recevras un email avec le lien de téléchargement quand le build sera prêt.

---

## 🐛 DÉPANNAGE

### Erreur: "Not logged in"

```bash
npx eas-cli login
```

### Erreur: "Project not found"

Vérifie que le projectId dans app.json est correct :
```json
"extra": {
  "eas": {
    "projectId": "99a2d247-e734-4dde-b0f7-926207ce2815"
  }
}
```

### Erreur: "Build failed"

1. Regarde les logs: `npx eas-cli build:view --logs`
2. Vérifie les erreurs de compilation
3. Corrige et relance: `npx eas-cli build --platform android --profile preview`

### Build Trop Long (> 30 min)

1. Vérifie le statut: `npx eas-cli build:list`
2. Si bloqué, annule et relance: `npx eas-cli build:cancel` puis `npx eas-cli build ...`

---

## ⏱️ TEMPS ESTIMÉS

| Étape | Durée |
|-------|-------|
| Connexion EAS | < 1 min |
| Mise en file | 1-3 min |
| Build Android | 8-15 min |
| Upload APK | 1-2 min |
| **TOTAL** | **10-20 min** |

---

## 📊 CE QUI SERA BUILDÉ

```
App Name:     Roleplay Chat
Package:      com.roleplaychat.app
Version:      1.7.1
Version Code: Auto (basé sur builds précédents)
Build Type:   APK (installable directement)
Profile:      preview
Target:       Android 5.0+ (API 21+)
Architecture: ARM64, ARMv7
Size:         ~30-50 MB
```

---

## ✅ CHECKLIST AVANT BUILD

- [x] Code v1.7.1 prêt
- [x] package.json version 1.7.1
- [x] app.json version 1.7.1
- [x] Tags Git créés (7.1, v1.7.1)
- [x] Dépendances installées
- [x] Configuration EAS valide
- [ ] **Connexion à EAS** ← **À FAIRE**
- [ ] **Lancer le build** ← **À FAIRE**
- [ ] **Surveiller jusqu'à la fin** ← **À FAIRE**
- [ ] **Télécharger l'APK** ← **À FAIRE**

---

## 🎯 COMMANDE RAPIDE (TOUT EN UN)

```bash
# Se connecter
npx eas-cli login

# Lancer et surveiller
bash launch-and-monitor-build.sh

# OU en une ligne
npx eas-cli build --platform android --profile preview --message "v1.7.1 Tag 7.1" && npx eas-cli build:view
```

---

## 📚 RESSOURCES

- **Documentation EAS:** https://docs.expo.dev/build/introduction/
- **Dashboard Expo:** https://expo.dev
- **Créer un compte:** https://expo.dev/signup
- **Support:** https://expo.dev/support

---

## 🎉 APRÈS LE BUILD

Une fois l'APK téléchargé :

1. **Renommer l'APK:**
   ```bash
   mv app-release.apk roleplay-chat-v1.7.1-tag-7.1.apk
   ```

2. **Tester l'installation:**
   - Transfère l'APK sur ton téléphone
   - Active "Sources inconnues" si nécessaire
   - Installe l'APK
   - Lance l'app et teste les fonctionnalités

3. **Vérifier les Corrections NSFW:**
   - Active le mode NSFW dans le profil utilisateur
   - Teste les conversations (réponses plus explicites)
   - Génère des images (plus détaillées et suggestives)
   - Vérifie qu'il y a moins de répétitions

---

## 📝 NOTES IMPORTANTES

⚠️ **Je ne peux pas lancer le build moi-même** car l'authentification EAS nécessite une interaction humaine (email + mot de passe).

✅ **Tout est prêt** de mon côté. Il te suffit de :
1. Te connecter avec `npx eas-cli login`
2. Lancer `bash launch-and-monitor-build.sh`
3. Attendre 10-20 minutes
4. Télécharger l'APK

🚀 **Le script `launch-and-monitor-build.sh` surveille automatiquement** le build et te notifie quand c'est prêt.

---

**Status:** ✅ Prêt pour le build  
**Action:** Lance `bash launch-and-monitor-build.sh` après connexion EAS  
**Support:** Voir ce guide en cas de problème
