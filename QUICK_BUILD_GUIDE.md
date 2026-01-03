# ⚡ Guide ULTRA-RAPIDE - Build APK avec GitHub Actions

## 🎯 3 étapes pour obtenir votre APK

### 1️⃣ Créer un token Expo (2 minutes)

```
1. Allez sur https://expo.dev
2. Créez un compte (gratuit)
3. Allez sur: https://expo.dev/accounts/[votre-nom]/settings/access-tokens
4. Cliquez "Create Token"
5. Copiez le token (gardez-le précieusement !)
```

### 2️⃣ Ajouter le token sur GitHub (1 minute)

```
1. Votre repo GitHub > Settings ⚙️
2. Secrets and variables > Actions
3. New repository secret
4. Name: EXPO_TOKEN
5. Value: [collez votre token]
6. Add secret
```

### 3️⃣ Lancer le build (1 clic)

```
1. GitHub repo > Actions
2. Cliquez sur "Build APK (Simple)"
3. Run workflow
4. Version: 1.0.0
5. Run workflow
```

## ⏱️ Attendez 20 minutes

Le workflow va :
- ✅ Installer les dépendances
- ✅ Builder l'APK
- ✅ Créer une release

## 📥 Télécharger votre APK

```
1. Allez dans Releases (à droite sur GitHub)
2. Téléchargez roleplay-chat-1.0.0.apk
3. Installez sur Android
4. C'est prêt ! 🎉
```

---

## 🐛 Problème ?

### "EXPO_TOKEN not found"
→ Vérifiez que vous avez bien créé le secret (étape 2)

### Build échoue
→ Lisez les logs dans Actions pour voir l'erreur

### Ça prend trop de temps
→ C'est normal, le premier build prend 15-20 minutes

---

## 📖 Guide détaillé

Pour plus d'informations, consultez **GITHUB_ACTIONS_SETUP.md**

---

**C'est tout ! Votre APK sera disponible dans 20 minutes ! ⚡**
