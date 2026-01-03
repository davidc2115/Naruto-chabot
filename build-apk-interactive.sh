#!/bin/bash

echo "🎯 Build APK - Script Complet"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Install dependencies
echo "📦 Étape 1/5: Installation des dépendances..."
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Erreur lors de l'installation${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✅ Dépendances installées${NC}"
echo ""

# Step 2: Install EAS CLI
echo "🔧 Étape 2/5: Installation d'EAS CLI..."
if ! command -v eas &> /dev/null; then
    npm install -g eas-cli
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Erreur lors de l'installation d'EAS CLI${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✅ EAS CLI installé${NC}"
echo ""

# Step 3: Check Expo login
echo "🔐 Étape 3/5: Vérification de la connexion Expo..."
if ! eas whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vous devez vous connecter à Expo${NC}"
    echo ""
    echo "Voulez-vous vous connecter maintenant? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        eas login
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Échec de la connexion${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Connexion requise pour continuer${NC}"
        echo ""
        echo "Pour vous connecter plus tard:"
        echo "  eas login"
        echo ""
        echo "Si vous n'avez pas de compte:"
        echo "  1. Allez sur https://expo.dev"
        echo "  2. Créez un compte gratuit"
        echo "  3. Revenez et lancez: eas login"
        exit 1
    fi
fi

EXPO_USER=$(eas whoami 2>/dev/null | tr -d '\n')
echo -e "${GREEN}✅ Connecté en tant que: $EXPO_USER${NC}"
echo ""

# Step 4: Configure EAS (if needed)
echo "⚙️  Étape 4/5: Configuration du projet..."
if [ ! -f "eas.json" ]; then
    echo "Configuration de EAS Build..."
    eas build:configure
fi
echo -e "${GREEN}✅ Projet configuré${NC}"
echo ""

# Step 5: Launch build
echo "🏗️  Étape 5/5: Lancement du build APK..."
echo ""
echo -e "${YELLOW}⏱️  Le build va prendre 15-20 minutes${NC}"
echo "📊 Suivez la progression sur: https://expo.dev"
echo ""

# Prompt for confirmation
echo "Voulez-vous lancer le build maintenant? (y/n)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo "🚀 Lancement du build..."
    echo ""
    
    eas build --platform android --profile preview
    
    BUILD_EXIT_CODE=$?
    
    echo ""
    if [ $BUILD_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✅ Build lancé avec succès!${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "📥 Pour télécharger l'APK une fois terminé:"
        echo ""
        echo "Méthode 1 - Via le site web:"
        echo "  https://expo.dev/accounts/$EXPO_USER/projects/roleplay-chat-app/builds"
        echo ""
        echo "Méthode 2 - Via la CLI:"
        echo "  eas build:list --platform android"
        echo ""
        echo "Méthode 3 - Téléchargement direct:"
        echo "  # Attendez que le build se termine (~15-20 min)"
        echo "  # Puis exécutez:"
        echo "  eas build:list --platform android --limit 1 --json | jq -r '.[0].artifacts.buildUrl' | xargs wget -O roleplay-chat.apk"
        echo ""
        echo "📧 Vous recevrez aussi un email quand le build sera terminé"
        echo ""
    else
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${RED}❌ Erreur lors du build${NC}"
        echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "💡 Solutions possibles:"
        echo "  - Vérifiez votre connexion internet"
        echo "  - Vérifiez que vous êtes connecté: eas whoami"
        echo "  - Consultez les logs ci-dessus"
        echo "  - Essayez: eas build --platform android --profile preview"
        echo ""
    fi
else
    echo ""
    echo "Build annulé. Pour lancer le build plus tard:"
    echo "  ./build-apk-now.sh"
    echo ""
    echo "Ou manuellement:"
    echo "  eas build --platform android --profile preview"
    echo ""
fi
