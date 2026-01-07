# 🔥 Changelog v2.0.0 - Mode Spicy (NSFW Explicite)

## Date: 7 Janvier 2026

## 🚀 Nouveautés Majeures

### 🔥 Nouveau Système de Modes de Contenu (3 niveaux)

L'application propose maintenant **3 modes de conversation distincts** pour les utilisateurs adultes (18+):

1. **😊 Mode Normal (SFW)**
   - Conversations amicales et respectueuses
   - Pas de contenu romantique explicite
   - Par défaut pour tous les utilisateurs

2. **💕 Mode Romance**
   - Flirt, baisers, câlins autorisés
   - Moments romantiques suggestifs
   - Atmosphère sensuelle mais élégante
   - "Fade to black" pour les scènes trop explicites

3. **🔥 Mode Spicy (Explicite)**
   - Contenu adulte complet sans restrictions
   - Scènes intimes détaillées
   - Descriptions explicites autorisées
   - Roleplay 18+ sans limites
   - **Idéal avec Ollama (Freebox) pour zéro censure**

### 🤖 Améliorations des Providers IA

#### Groq (LLaMA 3.3)
- Nouveau jailbreak conversationnel avancé pour le mode Spicy
- Paramètres optimisés par mode (température, tokens)
- Meilleure gestion des refus avec système de retry

#### Ollama (Freebox - Dolphin-Mistral)
- **RECOMMANDÉ pour le mode Spicy** - Modèle uncensored natif
- Prompt explicite direct sans jailbreak nécessaire
- Zéro censure, parfait pour le contenu adulte

#### OpenRouter
- Support des modèles uncensored
- Jailbreak similaire à Groq pour le mode Spicy

#### KoboldAI Horde
- Support amélioré du mode NSFW
- Gratuit et uncensored

## 📱 Interface Utilisateur

### Écran de Profil
- Nouvelle interface de sélection des modes avec 3 options visuelles
- Indicateurs clairs pour chaque niveau de contenu
- Avertissements appropriés pour le mode Spicy

### Écran des Paramètres
- Affichage du mode actif (SFW/Romance/Spicy)
- Badge "PARFAIT SPICY" pour Ollama/Freebox
- Version 2.0.0 affichée

## 🔧 Technique

### UserProfileService
- Nouveau champ `spicyMode` pour le mode explicite
- Méthode `toggleSpicy()` pour basculer le mode
- Méthode `getContentMode()` pour déterminer le mode actif
- Logique: Spicy active automatiquement Romance

### TextGenerationService
- Fonction `getContentMode()` centralisée
- Jailbreaks différenciés par mode et par provider
- Prompts optimisés pour chaque niveau de contenu
- Détection et gestion des refus améliorée

### GroqService
- Adaptation au nouveau système de modes
- System prompts simplifiés et efficaces
- Jailbreak conversationnel pour le mode Spicy

## 📋 Migration depuis v1.7.x

- Les profils existants conservent leur `nsfwMode`
- Le nouveau `spicyMode` est désactivé par défaut
- Les utilisateurs doivent activer manuellement le mode Spicy

## ⚠️ Notes Importantes

- **18+ uniquement** - Les modes Romance et Spicy nécessitent un profil adulte
- **Ollama recommandé** pour le mode Spicy (zéro censure)
- **Groq fonctionne** mais peut avoir des refus occasionnels
- Les jailbreaks sont des techniques de contournement, pas une garantie

## 🎯 Prochaines Étapes

- [ ] Tester avec plus de modèles OpenRouter uncensored
- [ ] Améliorer les jailbreaks si nécessaire
- [ ] Ajouter plus de personnalisations par personnage
