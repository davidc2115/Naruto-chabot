#!/bin/bash

echo "🚀 Installation de Roleplay Chat App"
echo "===================================="
echo ""

# Vérifier Node.js
if ! command -v node &> /dev/null
then
    echo "❌ Node.js n'est pas installé"
    echo "📥 Téléchargez-le depuis: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) détecté"
echo ""

# Vérifier npm
if ! command -v npm &> /dev/null
then
    echo "❌ npm n'est pas installé"
    exit 1
fi

echo "✅ npm $(npm -v) détecté"
echo ""

# Installation des dépendances
echo "📦 Installation des dépendances..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation réussie!"
    echo ""
    echo "🎯 Prochaines étapes:"
    echo "1. Lancez 'npm start' pour démarrer le serveur"
    echo "2. Scannez le QR code avec Expo Go sur votre téléphone"
    echo "3. Ajoutez vos clés API Groq dans les Paramètres"
    echo "4. Commencez à discuter avec les 200 personnages!"
    echo ""
    echo "📖 Consultez README.md pour plus d'informations"
else
    echo ""
    echo "❌ Erreur lors de l'installation"
    echo "💡 Essayez: rm -rf node_modules && npm install"
fi
