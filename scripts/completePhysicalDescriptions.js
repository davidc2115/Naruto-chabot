/**
 * Script pour compléter les descriptions physiques incomplètes
 * Vérifie et ajoute: longueur cheveux, type cheveux, forme yeux, texture peau, etc.
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'src', 'data');

// Patterns pour détecter les éléments manquants
const hairLengthPatterns = ['courts', 'mi-longs', 'longs', 'très longs', 'short', 'long', 'medium'];
const hairTypePatterns = ['lisses', 'ondulés', 'bouclés', 'frisés', 'straight', 'wavy', 'curly'];
const eyeShapePatterns = ['en amande', 'ronds', 'grands', 'bridés', 'amande'];
const skinTexturePatterns = ['douce', 'satinée', 'veloutée', 'soyeuse', 'lisse'];

// Options aléatoires
const hairLengths = ['courts', 'mi-longs', 'longs', 'très longs'];
const hairTypes = ['lisses', 'ondulés', 'bouclés', 'frisés'];
const eyeShapes = ['en amande', 'ronds', 'grands'];
const skinTextures = ['douce', 'satinée', 'veloutée', 'soyeuse'];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hasPattern(text, patterns) {
  const lowerText = text.toLowerCase();
  return patterns.some(p => lowerText.includes(p.toLowerCase()));
}

function enhanceDescription(desc, gender) {
  let enhanced = desc;
  const lowerDesc = desc.toLowerCase();
  
  // 1. Ajouter longueur de cheveux si manquante
  if (lowerDesc.includes('cheveux') && !hasPattern(desc, hairLengthPatterns)) {
    // Trouver où insérer la longueur après "Cheveux [couleur]"
    const hairMatch = enhanced.match(/(Cheveux\s+\w+)/i);
    if (hairMatch) {
      const hairLength = randomChoice(hairLengths);
      enhanced = enhanced.replace(hairMatch[0], `${hairMatch[0]} ${hairLength}`);
    }
  }
  
  // 2. Ajouter type de cheveux si manquant
  if (lowerDesc.includes('cheveux') && !hasPattern(desc, hairTypePatterns)) {
    // Trouver où insérer après la longueur ou couleur
    const hairMatch = enhanced.match(/(Cheveux\s+\w+\s+(?:courts|mi-longs|longs|très longs)?)/i);
    if (hairMatch) {
      const hairType = randomChoice(hairTypes);
      // Éviter la répétition si déjà présent
      if (!enhanced.includes(hairType)) {
        enhanced = enhanced.replace(hairMatch[0], `${hairMatch[0]} ${hairType}`);
      }
    }
  }
  
  // 3. Ajouter forme des yeux si manquante
  if (lowerDesc.includes('yeux') && !hasPattern(desc, eyeShapePatterns)) {
    // Trouver "Yeux [couleur]" et ajouter la forme
    const eyeMatch = enhanced.match(/(Yeux\s+\w+)/i);
    if (eyeMatch && !eyeMatch[0].toLowerCase().includes('amande') && !eyeMatch[0].toLowerCase().includes('rond') && !eyeMatch[0].toLowerCase().includes('grand')) {
      const eyeShape = randomChoice(eyeShapes);
      enhanced = enhanced.replace(eyeMatch[0], `${eyeMatch[0]} ${eyeShape}`);
    }
  }
  
  // 4. Ajouter texture de peau si manquante
  if (lowerDesc.includes('peau') && !hasPattern(desc, skinTexturePatterns)) {
    // Trouver "peau [couleur]" et ajouter texture
    const skinMatch = enhanced.match(/(peau\s+\w+)(?!\s+(?:douce|satinée|veloutée|soyeuse))/i);
    if (skinMatch) {
      const skinTexture = randomChoice(skinTextures);
      enhanced = enhanced.replace(skinMatch[0], `${skinMatch[0]} ${skinTexture}`);
    }
  }
  
  return enhanced;
}

function processFile(filePath) {
  console.log(`\nTraitement: ${path.basename(filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let updateCount = 0;
  
  // Pattern pour trouver les physicalDescription
  const descPattern = /(physicalDescription:\s*['"])([^'"]+)(['"])/g;
  
  content = content.replace(descPattern, (match, start, desc, end) => {
    // Vérifier si la description est incomplète
    const hasHairLength = hasPattern(desc, hairLengthPatterns);
    const hasHairType = hasPattern(desc, hairTypePatterns);
    const hasEyeShape = hasPattern(desc, eyeShapePatterns);
    const hasSkinTexture = hasPattern(desc, skinTexturePatterns);
    
    // Si au moins un élément manque dans une description qui contient "Cheveux" ou "Femme/Homme"
    if (desc.toLowerCase().includes('cheveux') || desc.toLowerCase().includes('femme') || desc.toLowerCase().includes('homme')) {
      if (!hasHairLength || !hasHairType || !hasEyeShape || !hasSkinTexture) {
        const gender = desc.toLowerCase().includes('homme') ? 'male' : 'female';
        const enhanced = enhanceDescription(desc, gender);
        
        if (enhanced !== desc) {
          console.log(`  ✓ Amélioré: ${desc.substring(0, 50)}...`);
          updateCount++;
          modified = true;
          return start + enhanced + end;
        }
      }
    }
    
    return match;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  → ${updateCount} description(s) améliorée(s)`);
  } else {
    console.log(`  → Aucune amélioration nécessaire`);
  }
  
  return updateCount;
}

function main() {
  console.log('='.repeat(60));
  console.log('Complétion des descriptions physiques');
  console.log('='.repeat(60));
  
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
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${totalUpdated} description(s) améliorée(s)`);
  console.log('='.repeat(60));
}

main();
