/**
 * Script pour corriger les descriptions corrompues
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'src', 'data');

// Patterns corrompus à corriger
const corruptedPatterns = [
  { find: /peau p soyeuseâle/g, replace: 'peau pâle soyeuse' },
  { find: /peau p satinéeâle/g, replace: 'peau pâle satinée' },
  { find: /peau p veloutéeâle/g, replace: 'peau pâle veloutée' },
  { find: /peau p douceâle/g, replace: 'peau pâle douce' },
  { find: /Cheveux poivre  boucléset sel/g, replace: 'Cheveux poivre et sel bouclés' },
  { find: /Cheveux poivre  frisésset sel/g, replace: 'Cheveux poivre et sel frisés' },
  { find: /Cheveux poivre  lisses set sel/g, replace: 'Cheveux poivre et sel lisses' },
  { find: /Cheveux poivre  ondulésset sel/g, replace: 'Cheveux poivre et sel ondulés' },
  // Pattern générique pour les cheveux "poivre et sel"
  { find: /Cheveux poivre\s+(\w+)set\s+sel/g, replace: 'Cheveux poivre et sel $1' },
  { find: /Cheveux poivre\s+(\w+)\s+et sel/g, replace: 'Cheveux poivre et sel $1' },
  // Corriger aussi les patterns doubles
  { find: /courts courts/g, replace: 'courts' },
  { find: /longs longs/g, replace: 'longs' },
  { find: /mi-longs mi-longs/g, replace: 'mi-longs' },
  { find: /bouclés bouclés/g, replace: 'bouclés' },
  { find: /lisses lisses/g, replace: 'lisses' },
  { find: /ondulés ondulés/g, replace: 'ondulés' },
  { find: /frisés frisés/g, replace: 'frisés' },
  // Corriger peau [couleur] [couleur]
  { find: /peau claire claire/g, replace: 'peau claire' },
  { find: /peau mate mate/g, replace: 'peau mate' },
  { find: /peau pâle pâle/g, replace: 'peau pâle' },
];

function processFile(filePath) {
  console.log(`Traitement: ${path.basename(filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let fixCount = 0;
  
  for (const pattern of corruptedPatterns) {
    const matches = content.match(pattern.find);
    if (matches) {
      console.log(`  → Correction: "${pattern.find}" (${matches.length} occurrences)`);
      content = content.replace(pattern.find, pattern.replace);
      fixCount += matches.length;
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ ${fixCount} correction(s) appliquée(s)`);
  }
  
  return fixCount;
}

function main() {
  console.log('Correction des descriptions corrompues...\n');
  
  const files = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(dataDir, f));
  
  let totalFixed = 0;
  
  for (const file of files) {
    try {
      totalFixed += processFile(file);
    } catch (e) {
      console.error(`Erreur: ${e.message}`);
    }
  }
  
  console.log(`\nTotal: ${totalFixed} correction(s) appliquée(s)`);
}

main();
