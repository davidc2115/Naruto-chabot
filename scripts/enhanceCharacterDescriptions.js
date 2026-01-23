/**
 * Script pour enrichir les descriptions physiques des personnages
 * v5.4.81 - Ajoute les détails manquants: cheveux, yeux, visage, corps, etc.
 */

const fs = require('fs');
const path = require('path');

// Dictionnaires pour générer des descriptions cohérentes
const hairLengths = ['courts', 'mi-longs', 'longs', 'très longs'];
const hairTypes = ['lisses', 'ondulés', 'bouclés', 'frisés'];
const hairColorsF = ['blonds', 'châtains', 'bruns', 'noirs', 'roux', 'auburn', 'caramel'];
const hairColorsM = ['blonds', 'châtains', 'bruns', 'noirs', 'poivre et sel'];

const eyeShapes = ['en amande', 'ronds', 'bridés', 'grands'];
const eyeColors = ['bleus', 'verts', 'marron', 'noisette', 'gris', 'noirs'];

const faceShapes = ['ovale', 'rond', 'carré', 'en cœur', 'allongé'];
const skinTones = ['pâle', 'claire', 'mate', 'bronzée', 'dorée', 'ébène', 'caramel'];
const skinTypes = ['douce', 'satinée', 'veloutée', 'soyeuse'];

const bustShapes = ['fermes et hauts', 'ronds et pleins', 'naturels et doux', 'généreux et lourds'];
const buttShapes = ['fermes et rondes', 'rebondies', 'musclées', 'généreuses'];
const bellyTypes = ['plat et tonique', 'plat', 'doux et légèrement arrondi', 'doux'];
const legTypes = ['fines et élancées', 'longues et galbées', 'musclées', 'généreuses'];

// Fonction pour extraire les infos existantes d'une description
function extractExistingInfo(desc) {
  const info = {};
  const lowerDesc = desc.toLowerCase();
  
  // Cheveux - couleur
  if (lowerDesc.includes('blond')) info.hairColor = 'blonds';
  else if (lowerDesc.includes('châtain')) info.hairColor = 'châtains';
  else if (lowerDesc.includes('brun')) info.hairColor = 'bruns';
  else if (lowerDesc.includes('noir')) info.hairColor = 'noirs';
  else if (lowerDesc.includes('roux') || lowerDesc.includes('rousse')) info.hairColor = 'roux';
  
  // Cheveux - longueur
  if (lowerDesc.includes('cheveux courts')) info.hairLength = 'courts';
  else if (lowerDesc.includes('mi-long') || lowerDesc.includes('milongs')) info.hairLength = 'mi-longs';
  else if (lowerDesc.includes('très longs') || lowerDesc.includes('tres longs')) info.hairLength = 'très longs';
  else if (lowerDesc.includes('longs') || lowerDesc.includes('long ')) info.hairLength = 'longs';
  
  // Cheveux - type
  if (lowerDesc.includes('bouclé') || lowerDesc.includes('boucles')) info.hairType = 'bouclés';
  else if (lowerDesc.includes('ondulé') || lowerDesc.includes('vagues')) info.hairType = 'ondulés';
  else if (lowerDesc.includes('frisé')) info.hairType = 'frisés';
  else if (lowerDesc.includes('lisse') || lowerDesc.includes('raide')) info.hairType = 'lisses';
  
  // Yeux
  if (lowerDesc.includes('yeux bleu')) info.eyeColor = 'bleus';
  else if (lowerDesc.includes('yeux vert')) info.eyeColor = 'verts';
  else if (lowerDesc.includes('yeux marron')) info.eyeColor = 'marron';
  else if (lowerDesc.includes('yeux noisette')) info.eyeColor = 'noisette';
  else if (lowerDesc.includes('yeux noir')) info.eyeColor = 'noirs';
  else if (lowerDesc.includes('yeux gris')) info.eyeColor = 'gris';
  
  // Taille
  const heightMatch = lowerDesc.match(/(\d{3})cm/);
  if (heightMatch) info.height = heightMatch[1];
  
  // Morphologie
  if (lowerDesc.includes('mince') || lowerDesc.includes('élancé')) info.bodyType = 'élancée';
  else if (lowerDesc.includes('athlétique') || lowerDesc.includes('musclé')) info.bodyType = 'athlétique';
  else if (lowerDesc.includes('voluptu') || lowerDesc.includes('généreu')) info.bodyType = 'voluptueuse';
  else if (lowerDesc.includes('pulpeu') || lowerDesc.includes('ronde')) info.bodyType = 'pulpeuse';
  
  return info;
}

// Fonction pour générer une description complète pour femme
function generateFemaleDescription(char, existingInfo) {
  const age = char.age || 25;
  const height = existingInfo.height || (155 + Math.floor(Math.random() * 25));
  const bust = char.bust || 'C';
  
  // Générer ou utiliser les valeurs existantes
  const hairColor = existingInfo.hairColor || hairColorsF[Math.floor(Math.random() * hairColorsF.length)];
  const hairLength = existingInfo.hairLength || hairLengths[Math.floor(Math.random() * hairLengths.length)];
  const hairType = existingInfo.hairType || hairTypes[Math.floor(Math.random() * hairTypes.length)];
  const eyeColor = existingInfo.eyeColor || eyeColors[Math.floor(Math.random() * eyeColors.length)];
  const eyeShape = eyeShapes[Math.floor(Math.random() * eyeShapes.length)];
  const faceShape = faceShapes[Math.floor(Math.random() * faceShapes.length)];
  const skinTone = skinTones[Math.floor(Math.random() * skinTones.length)];
  const skinType = skinTypes[Math.floor(Math.random() * skinTypes.length)];
  
  // Corps basé sur la morphologie existante ou le bust
  let bodyDesc, bustDesc, buttDesc, bellyDesc, legDesc;
  
  if (existingInfo.bodyType === 'élancée' || ['A', 'B'].includes(bust)) {
    bodyDesc = 'silhouette élancée et fine';
    bustDesc = 'poitrine menue mais bien formée';
    buttDesc = 'fesses fermes et galbées';
    bellyDesc = 'ventre plat et tonique';
    legDesc = 'jambes fines et élancées';
  } else if (existingInfo.bodyType === 'athlétique') {
    bodyDesc = 'corps athlétique et tonique';
    bustDesc = 'poitrine ferme et haute';
    buttDesc = 'fesses musclées et fermes';
    bellyDesc = 'ventre plat avec abdos légers';
    legDesc = 'jambes musclées et galbées';
  } else if (existingInfo.bodyType === 'voluptueuse' || ['D', 'DD', 'E', 'F'].includes(bust)) {
    bodyDesc = 'silhouette voluptueuse aux courbes généreuses';
    bustDesc = `poitrine généreuse bonnet ${bust}, seins ronds et pleins`;
    buttDesc = 'fesses rebondies et sensuelles';
    bellyDesc = 'ventre doux légèrement arrondi';
    legDesc = 'jambes galbées et féminines';
  } else if (existingInfo.bodyType === 'pulpeuse' || ['G', 'H', 'I', 'J'].includes(bust)) {
    bodyDesc = 'corps pulpeux et généreux';
    bustDesc = `énorme poitrine bonnet ${bust}, seins lourds et naturels`;
    buttDesc = 'fesses très généreuses et rebondies';
    bellyDesc = 'ventre doux et accueillant';
    legDesc = 'cuisses généreuses et douces';
  } else {
    bodyDesc = 'silhouette féminine harmonieuse';
    bustDesc = `poitrine bonnet ${bust}, seins ronds et fermes`;
    buttDesc = 'fesses rondes et fermes';
    bellyDesc = 'ventre plat';
    legDesc = 'jambes bien galbées';
  }
  
  return `Femme de ${age} ans, ${height}cm. Cheveux ${hairColor} ${hairLength} ${hairType}. Yeux ${eyeColor} ${eyeShape}. Visage ${faceShape}, peau ${skinTone} ${skinType}. ${bodyDesc.charAt(0).toUpperCase() + bodyDesc.slice(1)}: ${bustDesc}, ${bellyDesc}, hanches féminines, ${buttDesc}, ${legDesc}.`;
}

// Fonction pour générer une description complète pour homme
function generateMaleDescription(char, existingInfo) {
  const age = char.age || 30;
  const height = existingInfo.height || (170 + Math.floor(Math.random() * 20));
  
  const hairColor = existingInfo.hairColor || hairColorsM[Math.floor(Math.random() * hairColorsM.length)];
  const hairLength = existingInfo.hairLength || 'courts';
  const eyeColor = existingInfo.eyeColor || eyeColors[Math.floor(Math.random() * eyeColors.length)];
  const faceShape = faceShapes[Math.floor(Math.random() * faceShapes.length)];
  const skinTone = skinTones[Math.floor(Math.random() * 3)]; // Plus de tons clairs pour hommes par défaut
  
  let bodyDesc;
  if (existingInfo.bodyType === 'athlétique' || existingInfo.bodyType === 'musclé') {
    bodyDesc = 'Corps athlétique et musclé: épaules larges, pectoraux développés, abdos visibles, bras puissants';
  } else if (existingInfo.bodyType === 'élancée') {
    bodyDesc = 'Silhouette élancée et tonique: épaules proportionnées, corps fin mais ferme';
  } else {
    bodyDesc = 'Corps bien bâti: épaules carrées, torse masculin, bras fermes';
  }
  
  const hasBeard = Math.random() > 0.5;
  const beardDesc = hasBeard ? ', barbe de 3 jours ou soignée' : ', visage rasé de près';
  
  return `Homme de ${age} ans, ${height}cm. Cheveux ${hairColor} ${hairLength}. Yeux ${eyeColor}. Visage ${faceShape}, mâchoire marquée${beardDesc}, peau ${skinTone}. ${bodyDesc}, jambes musclées.`;
}

// Fonction pour traiter un fichier
function processFile(filePath) {
  console.log(`\n📂 Traitement de: ${path.basename(filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modifiedCount = 0;
  
  // Regex pour trouver les personnages avec physicalDescription incomplète
  const charRegex = /{\s*id:\s*['"]([^'"]+)['"][^}]*physicalDescription:\s*['"]([^'"]{1,200})['"][^}]*}/gs;
  
  let match;
  while ((match = charRegex.exec(content)) !== null) {
    const charId = match[1];
    const existingDesc = match[2];
    
    // Vérifier si la description est incomplète (moins de 150 caractères ou manque des détails clés)
    const missingDetails = !existingDesc.includes('cheveux') || 
                          !existingDesc.includes('yeux') || 
                          existingDesc.length < 150 ||
                          !existingDesc.match(/\d{3}cm/);
    
    if (missingDetails) {
      // Extraire le bloc complet du personnage pour analyse
      const charBlockStart = content.lastIndexOf('{', match.index);
      let braceCount = 1;
      let charBlockEnd = match.index;
      for (let i = match.index + 1; i < content.length && braceCount > 0; i++) {
        if (content[i] === '{') braceCount++;
        if (content[i] === '}') braceCount--;
        charBlockEnd = i;
      }
      const charBlock = content.substring(charBlockStart, charBlockEnd + 1);
      
      // Extraire les infos du personnage
      const genderMatch = charBlock.match(/gender:\s*['"]([^'"]+)['"]/);
      const ageMatch = charBlock.match(/age:\s*(\d+)/);
      const bustMatch = charBlock.match(/bust:\s*['"]([^'"]+)['"]/);
      const nameMatch = charBlock.match(/name:\s*['"]([^'"]+)['"]/);
      
      const gender = genderMatch ? genderMatch[1] : 'female';
      const age = ageMatch ? parseInt(ageMatch[1]) : 25;
      const bust = bustMatch ? bustMatch[1] : 'C';
      const name = nameMatch ? nameMatch[1] : 'Unknown';
      
      // Extraire les infos existantes
      const existingInfo = extractExistingInfo(existingDesc);
      
      // Générer nouvelle description
      let newDesc;
      if (gender === 'male' || gender === 'homme') {
        newDesc = generateMaleDescription({ age }, existingInfo);
      } else {
        newDesc = generateFemaleDescription({ age, bust }, existingInfo);
      }
      
      // Remplacer dans le contenu
      content = content.replace(existingDesc, newDesc);
      modifiedCount++;
      console.log(`  ✅ ${name} (${charId}): Description enrichie`);
    }
  }
  
  if (modifiedCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  💾 ${modifiedCount} personnage(s) mis à jour dans ${path.basename(filePath)}`);
  } else {
    console.log(`  ℹ️ Aucune modification nécessaire`);
  }
  
  return modifiedCount;
}

// Fonction principale
function main() {
  console.log('🔄 Enrichissement des descriptions physiques des personnages...\n');
  
  const dataDir = path.join(__dirname, '../src/data');
  const files = fs.readdirSync(dataDir).filter(f => 
    f.endsWith('.js') && 
    f.includes('Characters') && 
    !f.includes('allCharacters')
  );
  
  let totalModified = 0;
  
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    totalModified += processFile(filePath);
  }
  
  console.log(`\n✅ Terminé! ${totalModified} personnages enrichis au total.`);
}

main();
