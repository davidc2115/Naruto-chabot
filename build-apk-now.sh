#!/bin/bash

echo "🚀 Script de build automatique de l'APK"
echo "======================================"
echo ""

# Check if we're logged into Expo
echo "📋 Vérification des prérequis..."

# Install EAS CLI if needed
if ! command -v eas &> /dev/null; then
    echo "📦 Installation d'EAS CLI..."
    npm install -g eas-cli
fi

echo "✅ EAS CLI installé"
echo ""

# Check if logged in
echo "🔐 Vérification de la connexion Expo..."
if ! eas whoami &> /dev/null; then
    echo "❌ Vous n'êtes pas connecté à Expo"
    echo ""
    echo "👉 Veuillez vous connecter avec:"
    echo "   eas login"
    echo ""
    echo "   Si vous n'avez pas de compte Expo:"
    echo "   1. Allez sur https://expo.dev"
    echo "   2. Créez un compte gratuit"
    echo "   3. Revenez ici et tapez: eas login"
    echo ""
    exit 1
fi

EXPO_USER=$(eas whoami 2>/dev/null)
echo "✅ Connecté en tant que: $EXPO_USER"
echo ""

# Start build
echo "🏗️  Lancement du build APK..."
echo ""
echo "⏱️  Cela va prendre environ 15-20 minutes"
echo "📊 Vous pouvez suivre la progression sur: https://expo.dev"
echo ""

# Build the APK
eas build --platform android --profile preview --non-interactive

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build lancé avec succès!"
    echo ""
    echo "📥 Pour télécharger l'APK une fois terminé:"
    echo "   1. Allez sur https://expo.dev/accounts/$EXPO_USER/projects/roleplay-chat-app/builds"
    echo "   2. Cliquez sur le dernier build"
    echo "   3. Téléchargez l'APK"
    echo ""
    echo "   OU utilisez:"
    echo "   eas build:list --platform android"
    echo ""
else
    echo ""
    echo "❌ Erreur lors du lancement du build"
    echo ""
    echo "💡 Conseils:"
    echo "   - Vérifiez votre connexion Expo: eas whoami"
    echo "   - Vérifiez votre connexion internet"
    echo "   - Consultez les logs ci-dessus pour plus de détails"
    echo ""
fi
