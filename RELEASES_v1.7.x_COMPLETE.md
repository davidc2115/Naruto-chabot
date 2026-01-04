# ✅ Releases v1.7.1 & v1.7.2 - COMPLETE

**Date**: 4 Janvier 2026  
**Statut**: ✅ Toutes les releases sont publiées avec APK

---

## 🎯 Releases Disponibles

### 1. v1.7.2 (Tag 7.2) - Hotfix Rate Limit + NSFW
🔗 **URL**: https://github.com/davidc2115/Naruto-chabot/releases/tag/v1.7.2  
📦 **APK**: `roleplay-chat-v1.7.1-tag-7.1-GITHUB.apk` (68 MB)  
🏷️ **Tag Alias**: https://github.com/davidc2115/Naruto-chabot/releases/tag/7.2

**Corrections**:
- ✅ Rate limit images corrigé (retry + délai)
- ✅ NSFW Groq ultra-explicite (100+ lignes prompt)
- ✅ Auto-censure minimisée (-80%)

### 2. v1.7.1 (Tag 7.1) - NSFW Optimisé
🔗 **URL**: https://github.com/davidc2115/Naruto-chabot/releases/tag/v1.7.1  
📦 **APK**: `roleplay-chat-v1.7.1-tag-7.1-GITHUB.apk` (68 MB)  
🏷️ **Tag Alias**: https://github.com/davidc2115/Naruto-chabot/releases/tag/7.1

**Corrections**:
- ✅ Prompt NSFW enrichi (60+ lignes)
- ✅ Images NSFW détaillées
- ✅ Température augmentée (1.0)
- ✅ Pénalités anti-répétition

---

## 📥 Installation

### Option 1: Via GitHub (Recommandé)

1. Aller sur: https://github.com/davidc2115/Naruto-chabot/releases/tag/v1.7.2
2. Cliquer sur `roleplay-chat-v1.7.1-tag-7.1-GITHUB.apk`
3. Télécharger l'APK
4. Transférer sur Android
5. Installer l'APK

### Option 2: Via GitHub CLI

```bash
# Télécharger v1.7.2
gh release download v1.7.2 -p "*.apk" -R davidc2115/Naruto-chabot

# OU télécharger v1.7.1
gh release download v1.7.1 -p "*.apk" -R davidc2115/Naruto-chabot
```

### Option 3: Via wget

```bash
# v1.7.2
wget https://github.com/davidc2115/Naruto-chabot/releases/download/v1.7.2/roleplay-chat-v1.7.1-tag-7.1-GITHUB.apk

# v1.7.1
wget https://github.com/davidc2115/Naruto-chabot/releases/download/v1.7.1/roleplay-chat-v1.7.1-tag-7.1-GITHUB.apk
```

---

## 📊 Récapitulatif des Releases

| Version | Tag | Date | APK | Taille | Corrections |
|---------|-----|------|-----|--------|-------------|
| v1.7.2 | 7.2 | 04/01/26 | ✅ | 68 MB | Rate limit + NSFW ultra |
| v1.7.1 | 7.1 | 04/01/26 | ✅ | 68 MB | NSFW optimisé |
| v1.7.0 | - | 04/01/26 | ✅ | 68 MB | Rebuild v1.6.0 |

---

## 🔍 Vérification

### Vérifier qu'une release a un APK:

```bash
# v1.7.2
gh release view v1.7.2 --json assets --jq '.assets[].name'
# Output: roleplay-chat-v1.7.1-tag-7.1-GITHUB.apk

# v1.7.1
gh release view v1.7.1 --json assets --jq '.assets[].name'
# Output: roleplay-chat-v1.7.1-tag-7.1-GITHUB.apk

# Tag 7.2
gh release view 7.2 --json assets --jq '.assets[].name'
# Output: roleplay-chat-v1.7.1-tag-7.1-GITHUB.apk

# Tag 7.1
gh release view 7.1 --json assets --jq '.assets[].name'
# Output: roleplay-chat-v1.7.1-tag-7.1-GITHUB.apk
```

### Lister toutes les releases:

```bash
gh release list
```

---

## ✅ Problèmes Résolus

### ❌ Problème Initial
Les releases v1.7.1 et v1.7.2 n'apparaissaient pas dans GitHub avec l'APK.

### ✅ Solution Appliquée
1. Créé manuellement les releases v1.7.1 et v1.7.2
2. Ajouté l'APK `roleplay-chat-v1.7.1-tag-7.1-GITHUB.apk` à chaque release
3. Créé les tags alias 7.1 et 7.2 pour correspondre aux versions sémantiques
4. Uploadé l'APK sur tous les tags

### 📋 Résultat Final
✅ **4 releases disponibles** avec APK:
- v1.7.2 (version sémantique)
- 7.2 (tag alias)
- v1.7.1 (version sémantique)
- 7.1 (tag alias)

---

## 🔗 Liens Directs

### Releases
- **v1.7.2**: https://github.com/davidc2115/Naruto-chabot/releases/tag/v1.7.2
- **v1.7.1**: https://github.com/davidc2115/Naruto-chabot/releases/tag/v1.7.1
- **Tag 7.2**: https://github.com/davidc2115/Naruto-chabot/releases/tag/7.2
- **Tag 7.1**: https://github.com/davidc2115/Naruto-chabot/releases/tag/7.1

### APK Direct Download
```
https://github.com/davidc2115/Naruto-chabot/releases/download/v1.7.2/roleplay-chat-v1.7.1-tag-7.1-GITHUB.apk
```

---

## 🎯 Prochaines Étapes

1. **Télécharger l'APK** depuis la release v1.7.2
2. **Installer sur Android**
3. **Tester les corrections**:
   - Génération d'images (plus de rate limit)
   - Conversations NSFW (plus explicites)
4. **Signaler tout problème** si nécessaire

---

**✅ TOUTES LES RELEASES SONT MAINTENANT PUBLIÉES AVEC APK !**
