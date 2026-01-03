#!/bin/bash

# Script de vérification avant build GitHub Actions

echo "🔍 Vérification de la configuration pour GitHub Actions"
echo "=================================================="
echo ""

# Check if we're in a git repo
if [ ! -d ".git" ]; then
    echo "❌ Erreur: Ce n'est pas un dépôt Git"
    echo "   Exécutez: git init"
    exit 1
fi

echo "✅ Dépôt Git détecté"

# Check if workflows exist
if [ ! -d ".github/workflows" ]; then
    echo "❌ Erreur: Dossier .github/workflows manquant"
    exit 1
fi

echo "✅ Workflows GitHub Actions présents"

# Check required files
FILES=("package.json" "app.json" "eas.json" "App.js")
for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Erreur: $file manquant"
        exit 1
    fi
    echo "✅ $file présent"
done

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  Attention: node_modules manquant"
    echo "   Exécutez: npm install"
fi

echo ""
echo "=================================================="
echo "✅ Configuration valide !"
echo ""
echo "📝 Prochaines étapes:"
echo ""
echo "1. Créez un token Expo:"
echo "   https://expo.dev/accounts/[username]/settings/access-tokens"
echo ""
echo "2. Ajoutez le token sur GitHub:"
echo "   Repo > Settings > Secrets > New secret"
echo "   Name: EXPO_TOKEN"
echo "   Value: [votre token]"
echo ""
echo "3. Push votre code:"
echo "   git add ."
echo "   git commit -m 'Add GitHub Actions'"
echo "   git push origin main"
echo ""
echo "4. Lancez le workflow:"
echo "   GitHub > Actions > Build APK (Simple) > Run workflow"
echo ""
echo "🎉 Votre APK sera disponible dans ~20 minutes !"
