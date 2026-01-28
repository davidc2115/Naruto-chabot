/**
 * Script pour corriger les descriptions incomplètes
 * - Ajoute pénis aux hommes qui n'en ont pas
 * - Complète les détails manquants
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'src', 'data');

const penisSizes = ['17cm', '18cm', '19cm', '20cm', '21cm', '22cm'];

function addPenisToMaleDescription(desc) {
  // Vérifier si c'est un homme et s'il n'a pas déjà de pénis mentionné
  if (!desc.includes('pénis') && !desc.includes('penis')) {
    const penisSize = penisSizes[Math.floor(Math.random() * penisSizes.length)];
    // Ajouter avant le point final ou à la fin
    if (desc.endsWith('.')) {
      desc = desc.slice(0, -1) + `. Pénis ${penisSize}.`;
    } else if (desc.endsWith("'") || desc.endsWith('"')) {
      desc = desc.slice(0, -1) + `. Pénis ${penisSize}` + desc.slice(-1);
    } else {
      desc = desc + `. Pénis ${penisSize}`;
    }
  }
  return desc;
}

function processFile(filePath) {
  console.log(`\nTraitement: ${path.basename(filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let updateCount = 0;
  
  // Trouver tous les personnages masculins
  // Pattern pour les blocs de personnages
  const charBlockPattern = /\{[^{}]*?gender:\s*['"]male['"][^{}]*?physicalDescription:\s*['"]([^'"]+)['"]/gs;
  
  // Pattern alternatif: chercher physicalDescription qui mentionne "Homme"
  const hommePattern = /(physicalDescription:\s*['"])(Homme[^'"]+)(['"])/g;
  
  content = content.replace(hommePattern, (match, start, desc, end) => {
    // Vérifier si le pénis est mentionné
    if (!desc.includes('pénis') && !desc.includes('penis') && !desc.includes('Pénis')) {
      const penisSize = penisSizes[Math.floor(Math.random() * penisSizes.length)];
      
      // Nettoyer la description et ajouter le pénis
      let newDesc = desc.trim();
      if (newDesc.endsWith('.')) {
        newDesc = newDesc.slice(0, -1) + `. Pénis ${penisSize}.`;
      } else {
        newDesc = newDesc + `. Pénis ${penisSize}.`;
      }
      
      console.log(`  ✓ Ajout pénis: ${desc.substring(0, 50)}...`);
      updateCount++;
      modified = true;
      return start + newDesc + end;
    }
    return match;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  → ${updateCount} description(s) mise(s) à jour`);
  } else {
    console.log(`  → Aucune mise à jour nécessaire`);
  }
  
  return updateCount;
}

function main() {
  console.log('='.repeat(60));
  console.log('Correction des descriptions masculines incomplètes');
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
  console.log(`Total: ${totalUpdated} description(s) mise(s) à jour`);
  console.log('='.repeat(60));
}

main();
