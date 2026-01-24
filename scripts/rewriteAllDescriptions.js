/**
 * Script pour réécrire complètement les descriptions physiques
 * Format ultra-détaillé avec:
 * - Origine ethnique
 * - Taille
 * - Cheveux (longueur, couleur, type)
 * - Yeux (couleur, forme)
 * - Peau (couleur, type)
 * - Morphologie (ventre, bras, jambes, fesses)
 * - Poitrine (femmes) / Pénis (hommes - taille uniquement)
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'src', 'data');

// Options
const femaleOrigins = ['caucasienne', 'latine', 'asiatique', 'africaine', 'métisse', 'méditerranéenne', 'nordique', 'orientale', 'brésilienne', 'slave'];
const maleOrigins = ['caucasien', 'latin', 'asiatique', 'africain', 'métis', 'méditerranéen', 'nordique', 'oriental', 'brésilien', 'slave'];

const hairColors = ['blonds', 'bruns', 'noirs', 'châtains', 'roux', 'auburn', 'platine', 'gris', 'poivre et sel', 'cuivrés'];
const hairLengths = ['courts', 'mi-longs', 'longs', 'très longs'];
const hairTypes = ['lisses', 'ondulés', 'bouclés', 'frisés'];

const eyeColors = ['bleus', 'verts', 'marron', 'noisette', 'gris', 'noirs', 'ambre', 'vert émeraude', 'bleu ciel'];
const eyeShapes = ['en amande', 'ronds', 'grands', 'expressifs', 'envoûtants', 'pétillants'];

const skinColors = {
  'caucasienne': ['claire', 'pâle', 'laiteuse', 'porcelaine', 'rosée'],
  'latine': ['mate', 'dorée', 'caramel', 'bronzée', 'hâlée'],
  'asiatique': ['dorée', 'claire', 'ivoire', 'ambrée'],
  'africaine': ['ébène', 'caramel', 'chocolat', 'café'],
  'métisse': ['caramel', 'dorée', 'cuivrée', 'miel'],
  'méditerranéenne': ['mate', 'olive', 'bronzée', 'hâlée'],
  'nordique': ['claire', 'laiteuse', 'pâle', 'porcelaine'],
  'orientale': ['dorée', 'ambrée', 'cuivrée', 'mate'],
  'brésilienne': ['dorée', 'caramel', 'bronzée', 'mate'],
  'slave': ['claire', 'laiteuse', 'pâle', 'rosée']
};
const skinTypes = ['douce', 'satinée', 'veloutée', 'soyeuse', 'lisse', 'parfaite', 'délicate'];

// Morphologie
const femaleBellyTypes = ['plat', 'plat et tonique', 'légèrement arrondi', 'doux', 'ferme', 'musclé'];
const maleBellyTypes = ['plat', 'musclé', 'ferme', 'tonique', 'sculpté', 'abdos visibles'];
const femaleArmTypes = ['fins', 'délicats', 'gracieux', 'toniques', 'galbés'];
const maleArmTypes = ['musclés', 'puissants', 'toniques', 'fermes', 'vigoureux', 'athlétiques'];
const femaleLegTypes = ['longues', 'fines', 'galbées', 'fuselées', 'élancées', 'bien dessinées', 'interminables'];
const maleLegTypes = ['musclées', 'puissantes', 'athlétiques', 'fermes', 'solides'];
const femaleButtTypes = ['rondes', 'fermes', 'galbées', 'rebondies', 'pulpeuses', 'bien dessinées', 'bombées'];
const maleButtTypes = ['fermes', 'musclées', 'galbées', 'athlétiques'];

// Poitrine
const bustSizes = ['A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G'];
const bustDescriptions = {
  'A': { volume: 'petite', shapes: ['ferme', 'haute', 'discrète', 'pommée'] },
  'B': { volume: 'menue', shapes: ['ferme', 'haute', 'jolie', 'pommée'] },
  'C': { volume: 'moyenne', shapes: ['ronde', 'ferme', 'galbée', 'bien proportionnée'] },
  'D': { volume: 'généreuse', shapes: ['ronde', 'pleine', 'galbée', 'ferme'] },
  'DD': { volume: 'généreuse', shapes: ['ronde', 'pleine', 'lourde', 'naturelle'] },
  'E': { volume: 'volumineuse', shapes: ['pleine', 'lourde', 'imposante', 'généreuse'] },
  'F': { volume: 'opulente', shapes: ['imposante', 'lourde', 'spectaculaire', 'généreuse'] },
  'G': { volume: 'très opulente', shapes: ['impressionnante', 'imposante', 'spectaculaire'] }
};

// Pénis (taille uniquement)
const penisSizes = ['16cm', '17cm', '18cm', '19cm', '20cm', '21cm', '22cm', '23cm'];

// Tailles
const femaleHeights = [155, 158, 160, 162, 165, 168, 170, 172, 175, 178, 180];
const maleHeights = [170, 172, 175, 178, 180, 182, 185, 188, 190, 192, 195];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractExistingInfo(text) {
  const info = {};
  const lower = text.toLowerCase();
  
  // Hair color
  for (const color of hairColors) {
    if (lower.includes(color.toLowerCase()) || lower.includes('cheveux ' + color.toLowerCase())) {
      info.hairColor = color;
      break;
    }
  }
  
  // Eye color
  for (const color of eyeColors) {
    if (lower.includes('yeux ' + color.toLowerCase())) {
      info.eyeColor = color;
      break;
    }
  }
  
  // Height
  const heightMatch = text.match(/(\d{3})cm/);
  if (heightMatch) info.height = parseInt(heightMatch[1]);
  
  // Penis size
  const penisMatch = text.match(/pénis\s*(\d{2})cm/i);
  if (penisMatch) info.penisSize = penisMatch[1] + 'cm';
  
  // Bust
  const bustMatch = text.match(/bonnet\s*([A-G]{1,2})/i);
  if (bustMatch) info.bust = bustMatch[1].toUpperCase();
  
  // Origin hints
  if (lower.includes('asiatique') || lower.includes('japonais') || lower.includes('coréen')) info.origin = 'asiatique';
  else if (lower.includes('latina') || lower.includes('latino') || lower.includes('brésilien')) info.origin = 'latine';
  else if (lower.includes('africain') || lower.includes('ébène')) info.origin = 'africaine';
  else if (lower.includes('métis')) info.origin = 'métisse';
  else if (lower.includes('méditerranéen')) info.origin = 'méditerranéenne';
  
  return info;
}

function generateFemaleDescription(age, bust, existingInfo) {
  const height = existingInfo.height || randomChoice(femaleHeights);
  let origin = existingInfo.origin || randomChoice(femaleOrigins);
  
  // Hair
  const hairColor = existingInfo.hairColor || randomChoice(hairColors);
  const hairLength = randomChoice(hairLengths);
  const hairType = randomChoice(hairTypes);
  
  // Eyes
  const eyeColor = existingInfo.eyeColor || randomChoice(eyeColors);
  const eyeShape = randomChoice(eyeShapes);
  
  // Skin based on origin
  const skinColorOptions = skinColors[origin] || skinColors['caucasienne'];
  const skinColor = randomChoice(skinColorOptions);
  const skinType = randomChoice(skinTypes);
  
  // Bust
  const bustSize = bust || existingInfo.bust || randomChoice(bustSizes);
  const bustInfo = bustDescriptions[bustSize] || bustDescriptions['C'];
  const bustVolume = bustInfo.volume;
  const bustShape = randomChoice(bustInfo.shapes);
  
  // Morphology
  const belly = randomChoice(femaleBellyTypes);
  const arms = randomChoice(femaleArmTypes);
  const legs = randomChoice(femaleLegTypes);
  const butt = randomChoice(femaleButtTypes);
  
  return `Femme ${origin} de ${age} ans, ${height}cm. Cheveux ${hairColor} ${hairLength} ${hairType}. Yeux ${eyeColor} ${eyeShape}. Peau ${skinColor} ${skinType}. Poitrine ${bustVolume} bonnet ${bustSize}, seins ${bustShape}. Morphologie: ventre ${belly}, bras ${arms}, jambes ${legs}, fesses ${butt}.`;
}

function generateMaleDescription(age, existingInfo) {
  const height = existingInfo.height || randomChoice(maleHeights);
  let origin = existingInfo.origin || randomChoice(maleOrigins);
  // Convert female origin to male if needed
  if (origin.endsWith('e') && origin !== 'slave') {
    origin = origin.slice(0, -1);
    if (origin === 'asiatqu') origin = 'asiatique';
  }
  
  // Hair
  const hairColor = existingInfo.hairColor || randomChoice(hairColors.slice(0, 8));
  const hairType = randomChoice(hairTypes);
  
  // Eyes  
  const eyeColor = existingInfo.eyeColor || randomChoice(eyeColors);
  const eyeShape = randomChoice(eyeShapes);
  
  // Skin based on origin
  const originKey = origin.endsWith('e') ? origin : origin + 'e';
  const skinColorOptions = skinColors[originKey] || skinColors['caucasienne'];
  const skinColor = randomChoice(skinColorOptions);
  const skinType = randomChoice(skinTypes);
  
  // Penis - size only
  const penisSize = existingInfo.penisSize || randomChoice(penisSizes);
  
  // Morphology
  const belly = randomChoice(maleBellyTypes);
  const arms = randomChoice(maleArmTypes);
  const legs = randomChoice(maleLegTypes);
  const butt = randomChoice(maleButtTypes);
  
  return `Homme ${origin} de ${age} ans, ${height}cm. Cheveux ${hairColor} courts ${hairType}. Yeux ${eyeColor} ${eyeShape}. Peau ${skinColor} ${skinType}. Morphologie: ventre ${belly}, bras ${arms}, jambes ${legs}, fesses ${butt}. Pénis ${penisSize}.`;
}

function processFile(filePath) {
  console.log(`\nTraitement: ${path.basename(filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let updateCount = 0;
  
  // Pattern pour trouver physicalDescription avec contexte
  const pattern = /((?:age:\s*(\d+)[^}]*?)?(?:gender:\s*['"](\w+)['"][^}]*?)?(?:bust:\s*['"]([^'"]+)['"][^}]*?)?)physicalDescription:\s*(['"])([^'"]+)\5/g;
  
  content = content.replace(pattern, (match, context, age, gender, bust, quote, oldDesc) => {
    // Déterminer le genre
    const charGender = gender || (oldDesc.toLowerCase().startsWith('femme') ? 'female' : 
                                   oldDesc.toLowerCase().startsWith('homme') ? 'male' : 'female');
    
    // Extraire l'âge
    let charAge = age ? parseInt(age) : null;
    if (!charAge) {
      const ageMatch = oldDesc.match(/(\d+)\s*ans/);
      if (ageMatch) charAge = parseInt(ageMatch[1]);
    }
    charAge = charAge || (charGender === 'male' ? 30 : 25);
    
    // Extraire infos existantes
    const existingInfo = extractExistingInfo(oldDesc);
    
    // Générer nouvelle description
    let newDesc;
    if (charGender === 'male') {
      newDesc = generateMaleDescription(charAge, existingInfo);
    } else {
      newDesc = generateFemaleDescription(charAge, bust, existingInfo);
    }
    
    updateCount++;
    return context + `physicalDescription: ${quote}${newDesc}${quote}`;
  });
  
  if (updateCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  → ${updateCount} description(s) réécrite(s)`);
  } else {
    console.log(`  → Aucune mise à jour`);
  }
  
  return updateCount;
}

function main() {
  console.log('='.repeat(70));
  console.log('Réécriture COMPLÈTE des descriptions physiques');
  console.log('Format: Origine, Taille, Cheveux, Yeux, Peau, Poitrine/Pénis, Morphologie');
  console.log('='.repeat(70));
  
  const files = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(dataDir, f));
  
  console.log(`\nFichiers: ${files.length}`);
  
  let total = 0;
  for (const file of files) {
    try {
      total += processFile(file);
    } catch (e) {
      console.error(`Erreur: ${e.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`Total: ${total} description(s) réécrite(s)`);
  console.log('='.repeat(70));
}

main();
