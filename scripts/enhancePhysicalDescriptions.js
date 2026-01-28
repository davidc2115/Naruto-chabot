/**
 * Script complet pour améliorer les descriptions physiques de tous les personnages
 * Inclut: visage, yeux, cheveux, morphologie, poitrine/pénis, peau, etc.
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'src', 'data');

// Options pour les descriptions
const hairColors = ['blonds', 'bruns', 'noirs', 'châtains', 'roux', 'auburn', 'caramel', 'platine', 'gris', 'blancs'];
const hairLengths = ['courts', 'mi-longs', 'longs', 'très longs'];
const hairTypes = ['lisses', 'ondulés', 'bouclés', 'frisés'];
const eyeColors = ['bleus', 'verts', 'marron', 'noisette', 'gris', 'noirs', 'ambre'];
const eyeShapes = ['en amande', 'ronds', 'grands', 'bridés'];
const faceShapes = ['ovale', 'rond', 'carré', 'en cœur', 'allongé'];
const skinColors = ['claire', 'pâle', 'dorée', 'bronzée', 'mate', 'ébène', 'caramel'];
const skinTextures = ['douce', 'satinée', 'veloutée', 'soyeuse'];

// Tailles de poitrine
const bustSizes = ['A', 'B', 'C', 'D', 'DD', 'E', 'F'];
const bustShapes = ['fermes et hauts', 'ronds et pleins', 'ronds et fermes', 'naturels et généreux', 'petits mais fermes'];

// Types de corps féminins
const femaleBodyTypes = [
  { type: 'élancée et fine', belly: 'plat et tonique', hips: 'féminines', butt: 'fermes et galbées', legs: 'fines et élancées' },
  { type: 'féminine harmonieuse', belly: 'plat', hips: 'féminines', butt: 'rondes et fermes', legs: 'bien galbées' },
  { type: 'voluptueuse aux courbes généreuses', belly: 'doux légèrement arrondi', hips: 'féminines', butt: 'rebondies et sensuelles', legs: 'galbées et féminines' },
  { type: 'athlétique et tonique', belly: 'plat avec abdos légers', hips: 'féminines', butt: 'musclées et fermes', legs: 'musclées et galbées' }
];

// Types de corps masculins
const maleBodyTypes = [
  { type: 'athlétique et musclé', shoulders: 'larges', chest: 'pectoraux développés, abdos visibles', legs: 'musclées' },
  { type: 'bien bâti', shoulders: 'carrées', chest: 'torse masculin', legs: 'musclées' },
  { type: 'élancé et tonique', shoulders: 'proportionnées', chest: 'corps fin mais ferme', legs: 'musclées' },
  { type: 'imposant et puissant', shoulders: 'très larges', chest: 'torse massif et puissant', legs: 'puissantes' }
];

// Tailles de pénis
const penisSizes = ['17cm', '18cm', '19cm', '20cm', '21cm', '22cm'];

function extractInfoFromCharacter(char) {
  const info = {};
  
  // Extraire l'âge
  if (char.age) info.age = char.age;
  
  // Extraire le genre
  info.gender = char.gender || 'female';
  
  // Extraire la taille de poitrine si disponible
  if (char.bust) info.bust = char.bust;
  
  // Extraire les infos des champs existants
  const fields = ['appearance', 'physicalDescription', 'hairColor', 'eyeColor', 'hairStyle', 'hairLength'];
  
  for (const field of fields) {
    if (char[field]) {
      const text = char[field].toLowerCase();
      
      // Chercher la couleur des cheveux
      if (!info.hairColor) {
        for (const color of hairColors) {
          if (text.includes(color.toLowerCase()) || text.includes(color.slice(0, -1))) {
            info.hairColor = color;
            break;
          }
        }
      }
      
      // Chercher la couleur des yeux
      if (!info.eyeColor) {
        for (const color of eyeColors) {
          if (text.includes('yeux ' + color) || text.includes(color + ' eyes')) {
            info.eyeColor = color;
            break;
          }
        }
      }
      
      // Chercher la longueur des cheveux
      if (!info.hairLength) {
        if (text.includes('cheveux courts') || text.includes('short hair')) info.hairLength = 'courts';
        else if (text.includes('mi-long') || text.includes('medium')) info.hairLength = 'mi-longs';
        else if (text.includes('très long') || text.includes('very long')) info.hairLength = 'très longs';
        else if (text.includes('long') || text.includes('longs')) info.hairLength = 'longs';
      }
    }
  }
  
  return info;
}

function generateHeight(gender, age) {
  if (gender === 'male') {
    return 170 + Math.floor(Math.random() * 20); // 170-189cm
  } else {
    return 155 + Math.floor(Math.random() * 20); // 155-174cm
  }
}

function generateFemaleDescription(char, existingInfo) {
  const age = existingInfo.age || char.age || 25 + Math.floor(Math.random() * 20);
  const height = generateHeight('female', age);
  
  // Cheveux
  const hairColor = existingInfo.hairColor || hairColors[Math.floor(Math.random() * hairColors.length)];
  const hairLength = existingInfo.hairLength || hairLengths[Math.floor(Math.random() * hairLengths.length)];
  const hairType = hairTypes[Math.floor(Math.random() * hairTypes.length)];
  
  // Yeux
  const eyeColor = existingInfo.eyeColor || eyeColors[Math.floor(Math.random() * eyeColors.length)];
  const eyeShape = eyeShapes[Math.floor(Math.random() * eyeShapes.length)];
  
  // Visage
  const faceShape = faceShapes[Math.floor(Math.random() * faceShapes.length)];
  
  // Peau
  const skinColor = skinColors[Math.floor(Math.random() * skinColors.length)];
  const skinTexture = skinTextures[Math.floor(Math.random() * skinTextures.length)];
  
  // Poitrine
  let bustSize = existingInfo.bust || char.bust;
  if (!bustSize) {
    bustSize = bustSizes[Math.floor(Math.random() * bustSizes.length)];
  }
  const bustShapeIdx = Math.floor(Math.random() * bustShapes.length);
  const bustShape = bustShapes[bustShapeIdx];
  
  // Corps
  let bodyTypeIdx;
  if (bustSize === 'A' || bustSize === 'B') {
    bodyTypeIdx = Math.random() < 0.7 ? 0 : 3; // Plus souvent élancée ou athlétique
  } else if (bustSize === 'D' || bustSize === 'DD' || bustSize === 'E' || bustSize === 'F') {
    bodyTypeIdx = Math.random() < 0.7 ? 2 : 1; // Plus souvent voluptueuse
  } else {
    bodyTypeIdx = Math.floor(Math.random() * femaleBodyTypes.length);
  }
  const bodyType = femaleBodyTypes[bodyTypeIdx];
  
  const description = `Femme de ${age} ans, ${height}cm. Cheveux ${hairColor} ${hairLength} ${hairType}. Yeux ${eyeColor} ${eyeShape}. Visage ${faceShape}, peau ${skinColor} ${skinTexture}. Silhouette ${bodyType.type}: poitrine bonnet ${bustSize} ${bustShape}, ventre ${bodyType.belly}, hanches ${bodyType.hips}, fesses ${bodyType.butt}, jambes ${bodyType.legs}.`;
  
  return description;
}

function generateMaleDescription(char, existingInfo) {
  const age = existingInfo.age || char.age || 25 + Math.floor(Math.random() * 25);
  const height = generateHeight('male', age);
  
  // Cheveux
  const hairColor = existingInfo.hairColor || hairColors[Math.floor(Math.random() * 6)]; // Pas de couleurs trop excentriques
  const hairType = 'courts'; // Hommes généralement cheveux courts
  
  // Yeux
  const eyeColor = existingInfo.eyeColor || eyeColors[Math.floor(Math.random() * eyeColors.length)];
  
  // Visage
  const faceShape = faceShapes[Math.floor(Math.random() * faceShapes.length)];
  const jawType = 'mâchoire marquée';
  const beardType = Math.random() < 0.5 ? 'barbe de 3 jours' : 'visage rasé de près';
  
  // Peau
  const skinColor = skinColors[Math.floor(Math.random() * 4)]; // Couleurs plus classiques
  
  // Corps
  const bodyType = maleBodyTypes[Math.floor(Math.random() * maleBodyTypes.length)];
  
  // Pénis
  const penisSize = penisSizes[Math.floor(Math.random() * penisSizes.length)];
  
  const description = `Homme de ${age} ans, ${height}cm. Cheveux ${hairColor} ${hairType}. Yeux ${eyeColor}. Visage ${faceShape}, ${jawType}, ${beardType}, peau ${skinColor}. Corps ${bodyType.type}: épaules ${bodyType.shoulders}, ${bodyType.chest}, jambes ${bodyType.legs}. Pénis ${penisSize}.`;
  
  return description;
}

function isDescriptionIncomplete(desc) {
  if (!desc) return true;
  
  const text = desc.toLowerCase();
  
  // Vérifier si la description a les éléments essentiels
  const hasAge = /\d+ ans/.test(text);
  const hasHeight = /\d+cm/.test(text);
  const hasHair = text.includes('cheveux');
  const hasEyes = text.includes('yeux');
  const hasSkin = text.includes('peau');
  const hasBody = text.includes('poitrine') || text.includes('corps') || text.includes('silhouette') || text.includes('épaules');
  
  // Si manque des éléments essentiels, c'est incomplet
  if (!hasAge || !hasHeight || !hasHair || !hasEyes || !hasSkin || !hasBody) {
    return true;
  }
  
  // Vérifier les erreurs de syntaxe (texte corrompu)
  if (desc.includes(".'") || desc.includes("',") === false && desc.endsWith("'")) {
    return true;
  }
  
  return false;
}

function processFile(filePath) {
  console.log(`\nTraitement: ${path.basename(filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let updateCount = 0;
  
  // Pattern pour trouver les objets personnages avec physicalDescription
  const charPattern = /(\{\s*(?:[^{}]*?)id:\s*['"][^'"]+['"](?:[^{}]*?))(physicalDescription:\s*['"])([^'"]*?)(['"])((?:[^{}]*?)\})/gs;
  
  content = content.replace(charPattern, (match, before, pdStart, pdContent, pdEnd, after) => {
    // Extraire les infos du personnage
    const idMatch = before.match(/id:\s*['"]([^'"]+)['"]/);
    const nameMatch = before.match(/name:\s*['"]([^'"]+)['"]/);
    const genderMatch = before.match(/gender:\s*['"]([^'"]+)['"]/);
    const ageMatch = before.match(/age:\s*(\d+)/);
    const bustMatch = before.match(/bust:\s*['"]([^'"]+)['"]/);
    
    const charInfo = {
      id: idMatch ? idMatch[1] : 'unknown',
      name: nameMatch ? nameMatch[1] : 'unknown',
      gender: genderMatch ? genderMatch[1] : 'female',
      age: ageMatch ? parseInt(ageMatch[1]) : null,
      bust: bustMatch ? bustMatch[1] : null
    };
    
    // Vérifier si la description est incomplète ou corrompue
    if (isDescriptionIncomplete(pdContent)) {
      const existingInfo = { 
        age: charInfo.age, 
        bust: charInfo.bust 
      };
      
      let newDescription;
      if (charInfo.gender === 'male') {
        newDescription = generateMaleDescription(charInfo, existingInfo);
      } else {
        newDescription = generateFemaleDescription(charInfo, existingInfo);
      }
      
      console.log(`  ✓ Mise à jour: ${charInfo.name}`);
      updateCount++;
      modified = true;
      
      return before + pdStart + newDescription + pdEnd + after;
    }
    
    return match;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  → ${updateCount} personnage(s) mis à jour`);
  } else {
    console.log(`  → Aucune mise à jour nécessaire`);
  }
  
  return updateCount;
}

function main() {
  console.log('='.repeat(60));
  console.log('Amélioration des descriptions physiques des personnages');
  console.log('='.repeat(60));
  
  const files = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.js') && f.includes('Characters'))
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
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${totalUpdated} personnage(s) mis à jour`);
  console.log('='.repeat(60));
}

main();
