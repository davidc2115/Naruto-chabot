/**
 * Script pour réécrire complètement les descriptions physiques
 * Format ultra-détaillé avec:
 * - Origine ethnique
 * - Taille
 * - Cheveux (longueur, couleur, type)
 * - Yeux (couleur, forme)
 * - Peau (couleur, type)
 * - Morphologie (ventre, bras, jambes)
 * - Poitrine (femmes) / Pénis (hommes - taille uniquement)
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'src', 'data');

// Options d'origine ethnique
const origins = ['caucasienne', 'latine', 'asiatique', 'africaine', 'métisse', 'méditerranéenne', 'nordique', 'orientale'];
const maleOrigins = ['caucasien', 'latin', 'asiatique', 'africain', 'métis', 'méditerranéen', 'nordique', 'oriental'];

// Options de cheveux
const hairColors = ['blonds', 'bruns', 'noirs', 'châtains', 'roux', 'auburn', 'platine', 'gris', 'poivre et sel'];
const hairLengths = ['courts', 'mi-longs', 'longs', 'très longs'];
const hairTypes = ['lisses', 'ondulés', 'bouclés', 'frisés'];

// Options d'yeux
const eyeColors = ['bleus', 'verts', 'marron', 'noisette', 'gris', 'noirs', 'ambre'];
const eyeShapes = ['en amande', 'ronds', 'grands', 'bridés', 'expressifs'];

// Options de peau
const skinColors = ['claire', 'pâle', 'dorée', 'bronzée', 'mate', 'ébène', 'caramel', 'olive', 'laiteuse'];
const skinTypes = ['douce', 'satinée', 'veloutée', 'soyeuse', 'lisse', 'parfaite'];

// Options de morphologie - Ventre
const bellyTypes = ['plat', 'plat et tonique', 'musclé', 'légèrement arrondi', 'doux', 'ferme'];
// Options de morphologie - Bras
const armTypes = ['fins', 'toniques', 'musclés', 'galbés', 'gracieux', 'fermes'];
// Options de morphologie - Jambes
const legTypes = ['longues', 'fines', 'galbées', 'musclées', 'élancées', 'fuselées', 'bien dessinées'];
// Options de morphologie - Fesses
const buttTypes = ['rondes', 'fermes', 'galbées', 'rebondies', 'musclées', 'pulpeuses'];

// Options de poitrine
const bustSizes = ['A', 'B', 'C', 'D', 'DD', 'E', 'F'];
const bustVolumes = ['petite', 'moyenne', 'généreuse', 'volumineuse', 'opulente'];
const bustShapes = ['ferme', 'ronde', 'haute', 'naturelle', 'pleine', 'galbée'];

// Options de pénis (taille uniquement)
const penisSizes = ['16cm', '17cm', '18cm', '19cm', '20cm', '21cm', '22cm'];

// Tailles
const femaleHeights = [155, 158, 160, 162, 165, 168, 170, 172, 175, 178];
const maleHeights = [170, 172, 175, 178, 180, 182, 185, 188, 190, 192];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractExistingInfo(char) {
  const info = {};
  
  // Age
  if (char.age) info.age = char.age;
  
  // Gender
  info.gender = char.gender || 'female';
  
  // Bust size
  if (char.bust) info.bust = char.bust;
  
  // Try to extract from existing description
  const desc = (char.physicalDescription || '').toLowerCase();
  const appearance = (char.appearance || '').toLowerCase();
  const combined = desc + ' ' + appearance;
  
  // Hair color
  for (const color of hairColors) {
    if (combined.includes(color.toLowerCase())) {
      info.hairColor = color;
      break;
    }
  }
  
  // Eye color
  for (const color of eyeColors) {
    if (combined.includes('yeux ' + color) || combined.includes(color + ' eyes')) {
      info.eyeColor = color;
      break;
    }
  }
  
  // Origin hints
  if (combined.includes('asiatique') || combined.includes('japonais') || combined.includes('coréen') || combined.includes('chinois')) {
    info.origin = info.gender === 'male' ? 'asiatique' : 'asiatique';
  } else if (combined.includes('latina') || combined.includes('latino') || combined.includes('brésilien')) {
    info.origin = info.gender === 'male' ? 'latin' : 'latine';
  } else if (combined.includes('noir') || combined.includes('ébène') || combined.includes('africain')) {
    info.origin = info.gender === 'male' ? 'africain' : 'africaine';
  } else if (combined.includes('métis') || combined.includes('métisse')) {
    info.origin = info.gender === 'male' ? 'métis' : 'métisse';
  }
  
  // Height extraction
  const heightMatch = combined.match(/(\d{3})cm/);
  if (heightMatch) {
    info.height = parseInt(heightMatch[1]);
  }
  
  // Penis size extraction (for males)
  const penisMatch = combined.match(/pénis\s*(\d{2})cm/i);
  if (penisMatch) {
    info.penisSize = penisMatch[1] + 'cm';
  }
  
  return info;
}

function generateFemaleDescription(char, existingInfo) {
  const age = existingInfo.age || char.age || 25 + Math.floor(Math.random() * 20);
  const height = existingInfo.height || randomChoice(femaleHeights);
  const origin = existingInfo.origin || randomChoice(origins);
  
  // Hair
  const hairColor = existingInfo.hairColor || randomChoice(hairColors);
  const hairLength = randomChoice(hairLengths);
  const hairType = randomChoice(hairTypes);
  
  // Eyes
  const eyeColor = existingInfo.eyeColor || randomChoice(eyeColors);
  const eyeShape = randomChoice(eyeShapes);
  
  // Skin - adapt based on origin
  let skinColor;
  if (origin === 'africaine' || origin === 'ébène') {
    skinColor = randomChoice(['ébène', 'caramel', 'chocolat']);
  } else if (origin === 'asiatique') {
    skinColor = randomChoice(['dorée', 'claire', 'ivoire']);
  } else if (origin === 'latine') {
    skinColor = randomChoice(['mate', 'dorée', 'caramel', 'bronzée']);
  } else if (origin === 'méditerranéenne') {
    skinColor = randomChoice(['mate', 'olive', 'bronzée']);
  } else {
    skinColor = randomChoice(skinColors);
  }
  const skinType = randomChoice(skinTypes);
  
  // Bust
  let bustSize = existingInfo.bust || char.bust;
  if (!bustSize) {
    bustSize = randomChoice(bustSizes);
  }
  let bustVolume, bustShape;
  if (bustSize === 'A' || bustSize === 'B') {
    bustVolume = randomChoice(['petite', 'menue', 'discrète']);
    bustShape = randomChoice(['ferme', 'haute', 'pommée']);
  } else if (bustSize === 'C' || bustSize === 'D') {
    bustVolume = randomChoice(['moyenne', 'généreuse', 'belle']);
    bustShape = randomChoice(['ronde', 'ferme', 'galbée', 'naturelle']);
  } else {
    bustVolume = randomChoice(['généreuse', 'volumineuse', 'opulente']);
    bustShape = randomChoice(['pleine', 'lourde', 'ronde', 'naturelle']);
  }
  
  // Morphology
  const belly = randomChoice(bellyTypes);
  const arms = randomChoice(armTypes);
  const legs = randomChoice(legTypes);
  const butt = randomChoice(buttTypes);
  
  const description = `Femme ${origin} de ${age} ans, ${height}cm. ` +
    `Cheveux ${hairColor} ${hairLength} ${hairType}. ` +
    `Yeux ${eyeColor} ${eyeShape}. ` +
    `Peau ${skinColor} ${skinType}. ` +
    `Poitrine ${bustVolume} bonnet ${bustSize}, seins ${bustShape}. ` +
    `Morphologie: ventre ${belly}, bras ${arms}, jambes ${legs}, fesses ${butt}.`;
  
  return description;
}

function generateMaleDescription(char, existingInfo) {
  const age = existingInfo.age || char.age || 25 + Math.floor(Math.random() * 25);
  const height = existingInfo.height || randomChoice(maleHeights);
  const origin = existingInfo.origin || randomChoice(maleOrigins);
  
  // Hair
  const hairColor = existingInfo.hairColor || randomChoice(hairColors.slice(0, 7)); // Exclude grey for younger
  const hairLength = 'courts'; // Most men have short hair
  const hairType = randomChoice(hairTypes);
  
  // Eyes
  const eyeColor = existingInfo.eyeColor || randomChoice(eyeColors);
  const eyeShape = randomChoice(eyeShapes);
  
  // Skin - adapt based on origin
  let skinColor;
  if (origin === 'africain') {
    skinColor = randomChoice(['ébène', 'caramel', 'chocolat']);
  } else if (origin === 'asiatique') {
    skinColor = randomChoice(['dorée', 'claire', 'ivoire']);
  } else if (origin === 'latin') {
    skinColor = randomChoice(['mate', 'dorée', 'bronzée']);
  } else if (origin === 'méditerranéen') {
    skinColor = randomChoice(['mate', 'olive', 'bronzée']);
  } else {
    skinColor = randomChoice(['claire', 'pâle', 'bronzée', 'mate']);
  }
  const skinType = randomChoice(skinTypes);
  
  // Penis - size only
  const penisSize = existingInfo.penisSize || randomChoice(penisSizes);
  
  // Morphology
  const belly = randomChoice(['plat', 'musclé', 'ferme', 'tonique']);
  const arms = randomChoice(['musclés', 'puissants', 'toniques', 'fermes']);
  const legs = randomChoice(['musclées', 'puissantes', 'athlétiques', 'fermes']);
  const butt = randomChoice(['fermes', 'musclées', 'galbées']);
  
  const description = `Homme ${origin} de ${age} ans, ${height}cm. ` +
    `Cheveux ${hairColor} ${hairLength} ${hairType}. ` +
    `Yeux ${eyeColor} ${eyeShape}. ` +
    `Peau ${skinColor} ${skinType}. ` +
    `Morphologie: ventre ${belly}, bras ${arms}, jambes ${legs}, fesses ${butt}. ` +
    `Pénis ${penisSize}.`;
  
  return description;
}

function processFile(filePath) {
  console.log(`\nTraitement: ${path.basename(filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let updateCount = 0;
  
  // Pattern pour trouver les objets personnages
  const charPattern = /(\{\s*(?:[^{}]*?)id:\s*['"][^'"]+['"](?:[^{}]*?))(physicalDescription:\s*['"])([^'"]*?)(['"])((?:[^{}]*?)\})/gs;
  
  content = content.replace(charPattern, (match, before, pdStart, pdContent, pdEnd, after) => {
    // Extraire les infos du personnage
    const idMatch = before.match(/id:\s*['"]([^'"]+)['"]/);
    const nameMatch = before.match(/name:\s*['"]([^'"]+)['"]/);
    const genderMatch = match.match(/gender:\s*['"]([^'"]+)['"]/);
    const ageMatch = match.match(/age:\s*(\d+)/);
    const bustMatch = match.match(/bust:\s*['"]([^'"]+)['"]/);
    
    const charInfo = {
      id: idMatch ? idMatch[1] : 'unknown',
      name: nameMatch ? nameMatch[1] : 'unknown',
      gender: genderMatch ? genderMatch[1] : 'female',
      age: ageMatch ? parseInt(ageMatch[1]) : null,
      bust: bustMatch ? bustMatch[1] : null,
      physicalDescription: pdContent
    };
    
    const existingInfo = extractExistingInfo(charInfo);
    
    let newDescription;
    if (charInfo.gender === 'male') {
      newDescription = generateMaleDescription(charInfo, existingInfo);
    } else {
      newDescription = generateFemaleDescription(charInfo, existingInfo);
    }
    
    console.log(`  ✓ ${charInfo.name}`);
    updateCount++;
    modified = true;
    
    return before + pdStart + newDescription + pdEnd + after;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  → ${updateCount} personnage(s) mis à jour`);
  } else {
    console.log(`  → Aucune mise à jour`);
  }
  
  return updateCount;
}

function main() {
  console.log('='.repeat(70));
  console.log('Réécriture complète des descriptions physiques');
  console.log('Format ultra-détaillé avec origine, morphologie, etc.');
  console.log('='.repeat(70));
  
  const files = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.js') && f.includes('Character'))
    .map(f => path.join(dataDir, f));
  
  console.log(`\nFichiers à traiter: ${files.length}`);
  
  let totalUpdated = 0;
  
  for (const file of files) {
    try {
      totalUpdated += processFile(file);
    } catch (e) {
      console.error(`Erreur dans ${path.basename(file)}: ${e.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`Total: ${totalUpdated} personnage(s) mis à jour`);
  console.log('='.repeat(70));
}

main();
