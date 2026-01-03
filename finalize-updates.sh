#!/bin/bash
echo "🔄 Finalisation des mises à jour..."

# Ajouter le bouton de création dans HomeScreen
echo "📝 Mise à jour HomeScreen..."

# Commit tous les changements actuels
git add -A
git commit -m "Add custom characters, anatomical attributes, and gallery system

- Add bust size for female characters (A-G)
- Add penis size for male characters
- Create CustomCharacterService for user-created characters
- Create GalleryService for image galleries per character
- Add CreateCharacterScreen with full character creation form
- Update ImageGenerationService to include anatomical attributes in prompts
- Add better error logging in GroqService
- Update CharacterDetailScreen to show anatomical attributes
- Prepare gallery and background selection features"

echo "✅ Changements commités"
echo "📦 Prêt pour le build"
