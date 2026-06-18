/**
 * Script de validation des personnages
 * Vérifie la cohérence des données et identifie les erreurs
 */

const fs = require('fs');
const path = require('path');

const characterFiles = [
  'src/data/characters.js',
  'src/data/friendCharacters.js',
  'src/data/momCharacters.js',
  'src/data/colleagueCharacters.js',
  'src/data/sisterCharacters.js',
  'src/data/brotherCharacters.js',
  'src/data/fatherCharacters.js',
  'src/data/sonFriendCharacters.js',
  'src/data/milfCharacters.js',
  'src/data/curvyCharacters.js',
  'src/data/dilfCharacters.js',
  'src/data/roommateCharacters.js',
  'src/data/medicalCharacters.js',
  'src/data/situationCharacters.js',
  'src/data/fantasyCharacters.js',
  'src/data/beautifulGirlsCharacters.js',
  'src/data/stepdaughterCharacters.js',
];

const requiredFields = ['id', 'name', 'age', 'gender'];
const recommendedFields = ['personality', 'temperament', 'temperamentDetails', 'scenario', 'startMessage'];
const temperamentDetailFields = ['emotionnel', 'seduction', 'intimite', 'communication', 'reactions'];

function validateCharacter(character, file) {
  const errors = [];
  const warnings = [];

  // Champs requis
  requiredFields.forEach(field => {
    if (!character[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Champs recommandés
  recommendedFields.forEach(field => {
    if (!character[field]) {
      warnings.push(`Missing recommended field: ${field}`);
    }
  });

  // Validation temperamentDetails
  if (character.temperamentDetails) {
    temperamentDetailFields.forEach(field => {
      if (!character.temperamentDetails[field]) {
        warnings.push(`Missing temperamentDetail field: ${field}`);
      }
    });
  }

  // Validation des valeurs
  if (character.age && (typeof character.age !== 'number' && !character.age.toString().match(/^\d+/))) {
    errors.push(`Invalid age format: ${character.age}`);
  }

  if (character.gender && !['male', 'female', 'other'].includes(character.gender)) {
    errors.push(`Invalid gender: ${character.gender}`);
  }

  if (character.temperament && typeof character.temperament !== 'string') {
    errors.push(`Invalid temperament format: ${character.temperament}`);
  }

  return { errors, warnings };
}

function validateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extraire les personnages du fichier
    const characterMatch = content.match(/export const \w+ = \[([\s\S]*?)\];/);
    if (!characterMatch) {
      console.log(`⚠️  No character array found in ${filePath}`);
      return [];
    }

    // Parser les personnages (simplifié)
    const characters = [];
    let currentCharacter = {};
    let inCharacter = false;
    let braceCount = 0;

    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('{') && !line.includes('//')) {
        if (!inCharacter) {
          inCharacter = true;
          currentCharacter = {};
          braceCount = 1;
        } else {
          braceCount++;
        }
      } else if (line.includes('}') && !line.includes('//')) {
        braceCount--;
        if (braceCount === 0 && inCharacter) {
          characters.push(currentCharacter);
          inCharacter = false;
        }
      } else if (inCharacter) {
        // Extraire les champs (simplifié)
        const fieldMatch = line.match(/(\w+):\s*['"]([^'"]*)['"]/);
        if (fieldMatch) {
          currentCharacter[fieldMatch[1]] = fieldMatch[2];
        }
      }
    }

    return characters.map(char => validateCharacter(char, filePath));
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
}

function main() {
  console.log('🔍 Validation des personnages...\n');

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalCharacters = 0;

  characterFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file}`);
      return;
    }

    console.log(`📄 ${file}`);
    const results = validateFile(filePath);
    
    results.forEach((result, index) => {
      totalCharacters++;
      if (result.errors.length > 0) {
        console.log(`  ❌ Character ${index + 1}: ${result.errors.length} error(s)`);
        result.errors.forEach(err => console.log(`     - ${err}`));
        totalErrors += result.errors.length;
      }
      if (result.warnings.length > 0) {
        console.log(`  ⚠️  Character ${index + 1}: ${result.warnings.length} warning(s)`);
        result.warnings.forEach(warn => console.log(`     - ${warn}`));
        totalWarnings += result.warnings.length;
      }
    });

    if (results.length === 0) {
      console.log('  ℹ️  No characters found or parsing error');
    }
    console.log('');
  });

  console.log('📊 Résumé:');
  console.log(`   Total personnages: ${totalCharacters}`);
  console.log(`   Total erreurs: ${totalErrors}`);
  console.log(`   Total avertissements: ${totalWarnings}`);

  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('\n✅ Tous les personnages sont valides !');
  } else {
    console.log('\n⚠️  Des corrections sont nécessaires.');
  }
}

main();
