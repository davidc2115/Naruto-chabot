// Script pour générer des images de personnages style Candy AI
// Utilise le ImageGenerationService existant

import ImageGenerationService from '../src/services/ImageGenerationService';
import enhancedCharacters from '../src/data/allCharacters';

const imageService = new ImageGenerationService();

// Style Candy AI: anime/réaliste hybride, haute qualité, détaillé
const candyAIStyleModifiers = {
  male: ', anime realistic style, handsome male character, detailed face, expressive eyes, high quality, 8k, masterpiece, professional portrait photography, soft lighting, clean background',
  female: ', anime realistic style, beautiful female character, detailed face, expressive eyes, high quality, 8k, masterpiece, professional portrait photography, soft lighting, clean background',
  default: ', anime realistic style, detailed character, expressive face, high quality, 8k, masterpiece, professional portrait photography, soft lighting, clean background'
};

async function generateImageForCharacter(character, index) {
  console.log(`[${index + 1}/${enhancedCharacters.length}] Génération image pour: ${character.name}`);
  
  try {
    // Construire le prompt avec le style Candy AI
    const basePrompt = character.imagePrompt || character.appearance || character.physicalDescription;
    const styleModifier = candyAIStyleModifiers[character.gender] || candyAIStyleModifiers.default;
    const enhancedPrompt = basePrompt + styleModifier;
    
    // Générer l'image
    const imageUrl = await imageService.generateImage(
      character,
      'portrait',
      enhancedPrompt,
      (progress) => console.log(`  Progress: ${progress}`)
    );
    
    console.log(`  ✅ Image générée: ${imageUrl}`);
    return imageUrl;
  } catch (error) {
    console.error(`  ❌ Erreur pour ${character.name}:`, error.message);
    return null;
  }
}

async function generateAllCharacterImages() {
  console.log('🎨 Début génération images style Candy AI...');
  console.log(`Nombre total de personnages: ${enhancedCharacters.length}`);
  
  const results = [];
  
  for (let i = 0; i < enhancedCharacters.length; i++) {
    const character = enhancedCharacters[i];
    const imageUrl = await generateImageForCharacter(character, i);
    
    if (imageUrl) {
      results.push({
        id: character.id,
        name: character.name,
        imageUrl: imageUrl
      });
    }
    
    // Pause entre chaque génération pour éviter les limites de rate
    if (i < enhancedCharacters.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n📊 Résultats:');
  console.log(`Images générées avec succès: ${results.length}/${enhancedCharacters.length}`);
  
  // Sauvegarder les résultats
  const fs = require('fs');
  fs.writeFileSync(
    'generatedCharacterImages.json',
    JSON.stringify(results, null, 2)
  );
  console.log('💾 Résultats sauvegardés dans generatedCharacterImages.json');
  
  return results;
}

// Exécuter la génération
if (require.main === module) {
  generateAllCharacterImages()
    .then(() => console.log('✅ Génération terminée'))
    .catch(error => console.error('❌ Erreur:', error));
}

module.exports = { generateAllCharacterImages, generateImageForCharacter };
