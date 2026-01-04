#!/bin/bash

# Script de Build et Surveillance EAS - Version 1.7.1 (Tag 7.1)
# Ce script lance le build APK et surveille sa progression

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║     🚀 BUILD APK v1.7.1 (Tag 7.1) - EAS Build                   ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json non trouvé"
    echo "   Exécutez ce script depuis le répertoire du projet"
    exit 1
fi

# Vérifier que les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

echo "✅ Prérequis vérifiés"
echo ""

# Afficher la configuration
echo "📋 Configuration du Build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "App:          Roleplay Chat"
echo "Version:      1.7.1"
echo "Tag:          7.1"
echo "Platform:     Android"
echo "Build Type:   APK (Preview)"
echo "Profile:      preview"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Vérifier si l'utilisateur est connecté à EAS
echo "🔐 Vérification de l'authentification EAS..."
if npx eas-cli whoami 2>/dev/null | grep -q "Not logged in"; then
    echo ""
    echo "⚠️  Vous n'êtes pas connecté à EAS Build."
    echo ""
    echo "Pour vous connecter:"
    echo "  1. Exécutez: npx eas-cli login"
    echo "  2. Entrez vos identifiants Expo"
    echo "  3. Relancez ce script"
    echo ""
    read -p "Voulez-vous vous connecter maintenant? (Y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        npx eas-cli login
    else
        echo "❌ Build annulé. Connectez-vous d'abord avec: npx eas-cli login"
        exit 1
    fi
fi

EXPO_USER=$(npx eas-cli whoami 2>/dev/null | head -n 1)
echo "✅ Connecté en tant que: $EXPO_USER"
echo ""

# Demander confirmation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Le build va être lancé sur les serveurs EAS Build"
echo "    Durée estimée: 10-20 minutes"
echo "    Un APK sera généré et disponible au téléchargement"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "🚀 Lancer le build maintenant? (Y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
    echo "❌ Build annulé"
    exit 0
fi

echo ""
echo "🚀 Lancement du build EAS..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Lancer le build avec message personnalisé
BUILD_MESSAGE="Version 1.7.1 (Tag 7.1) - Corrections NSFW + Toutes fonctionnalités v1.6.0"

# Lancer le build et capturer l'ID
npx eas-cli build \
    --platform android \
    --profile preview \
    --message "$BUILD_MESSAGE" \
    --non-interactive

BUILD_EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "✅ Build lancé avec succès!"
    echo ""
    echo "📱 Prochaines étapes:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. 🔍 Surveiller la progression:"
    echo "   npx eas-cli build:list"
    echo ""
    echo "2. 📊 Voir le statut en temps réel:"
    echo "   npx eas-cli build:view"
    echo ""
    echo "3. 🌐 Ou visitez le dashboard:"
    echo "   https://expo.dev/accounts/$EXPO_USER/projects/roleplay-chat-app/builds"
    echo ""
    echo "4. 📥 Une fois terminé, téléchargez l'APK depuis le lien fourni"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "⏱️  Durée estimée: 10-20 minutes"
    echo "📧 Vous recevrez une notification par email quand le build sera prêt"
    echo ""
    
    # Proposer de surveiller le build
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    read -p "👀 Voulez-vous surveiller le build en temps réel? (Y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        echo ""
        echo "🔍 Surveillance du build en cours..."
        echo "   (Appuyez sur Ctrl+C pour arrêter la surveillance)"
        echo ""
        
        # Surveiller le build
        while true; do
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "📊 Statut actuel ($(date '+%H:%M:%S')):"
            echo ""
            
            # Afficher les derniers builds
            npx eas-cli build:list --limit 1 --platform android
            
            # Vérifier si le build est terminé
            STATUS=$(npx eas-cli build:list --limit 1 --platform android --json 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
            
            if [ "$STATUS" = "finished" ]; then
                echo ""
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo "🎉 BUILD TERMINÉ AVEC SUCCÈS!"
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo ""
                echo "📥 Téléchargez votre APK maintenant!"
                echo ""
                
                # Afficher les détails du build
                npx eas-cli build:view
                
                break
            elif [ "$STATUS" = "errored" ] || [ "$STATUS" = "canceled" ]; then
                echo ""
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo "❌ LE BUILD A ÉCHOUÉ"
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo ""
                echo "📋 Détails de l'erreur:"
                npx eas-cli build:view
                break
            fi
            
            echo ""
            echo "⏳ Build en cours... Prochaine vérification dans 30 secondes"
            sleep 30
        done
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Script terminé"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo "❌ Erreur lors du lancement du build"
    echo ""
    echo "Vérifiez:"
    echo "  - Que vous êtes connecté: npx eas-cli whoami"
    echo "  - Votre configuration EAS: cat eas.json"
    echo "  - Les logs d'erreur ci-dessus"
    exit 1
fi
