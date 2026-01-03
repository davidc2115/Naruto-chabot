#!/bin/bash

# Script pour ouvrir directement les pages GitHub nécessaires

echo "🚀 Ouverture des pages GitHub nécessaires..."
echo ""

REPO_URL="https://github.com/davidc2115/Naruto-chabot"

echo "📂 Repository : $REPO_URL"
echo ""

# Detect OS and open browser accordingly
open_url() {
    if command -v xdg-open > /dev/null; then
        xdg-open "$1"
    elif command -v open > /dev/null; then
        open "$1"
    elif command -v start > /dev/null; then
        start "$1"
    else
        echo "Ouvrez manuellement : $1"
    fi
}

echo "1️⃣  Création du token Expo..."
echo "   → https://expo.dev"
open_url "https://expo.dev"
sleep 2

echo ""
echo "2️⃣  Page Settings pour ajouter le secret..."
echo "   → $REPO_URL/settings/secrets/actions"
open_url "$REPO_URL/settings/secrets/actions"
sleep 2

echo ""
echo "3️⃣  Page Actions pour lancer le build..."
echo "   → $REPO_URL/actions"
open_url "$REPO_URL/actions"
sleep 2

echo ""
echo "4️⃣  Page Releases pour télécharger l'APK (une fois prêt)..."
echo "   → $REPO_URL/releases"
open_url "$REPO_URL/releases"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Toutes les pages ont été ouvertes !"
echo ""
echo "📋 Maintenant :"
echo "   1. Créez un compte Expo (si pas déjà fait)"
echo "   2. Créez un token Expo"
echo "   3. Ajoutez-le dans GitHub Secrets (Name: EXPO_TOKEN)"
echo "   4. Allez dans Actions et lancez 'Build APK (Simple)'"
echo ""
echo "⏱️  Le build prendra ~20 minutes"
echo "📥 L'APK sera dans Releases après le build"
echo ""
