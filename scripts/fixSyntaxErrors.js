/**
 * Script to fix syntax errors in character data files
 * Removes corrupted text after the closing quote in physicalDescription fields
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'src', 'data');

// List of files to fix with their specific issues
const fixes = [
  {
    file: 'additionalCharacters3.js',
    fixes: [
      {
        line: 245,
        pattern: `"Homme de 30 ans, 185cm. Cheveux bruns courts. Yeux bleus. Visage allongé, mâchoire marquée, barbe de 3 jours ou soignée, peau mate. Corps bien bâti: épaules carrées, torse masculin, bras fermes, jambes musclées.'avant",`,
        replacement: `"Homme de 30 ans, 185cm. Cheveux bruns courts. Yeux bleus. Visage allongé, mâchoire marquée, barbe de 3 jours ou soignée, peau mate. Corps bien bâti: épaules carrées, torse masculin, bras fermes, jambes musclées.",`
      },
      {
        line: 346,
        pattern: `"Femme de 28 ans, 170cm. Cheveux roux mi-longs ondulés. Yeux verts bridés. Visage ovale, peau pâle veloutée. Silhouette féminine harmonieuse: poitrine bonnet C, seins ronds et fermes, ventre plat, hanches féminines, fesses rondes et fermes, jambes bien galbées.'avant",`,
        replacement: `"Femme de 28 ans, 170cm. Cheveux roux mi-longs ondulés. Yeux verts bridés. Visage ovale, peau pâle veloutée. Silhouette féminine harmonieuse: poitrine bonnet C, seins ronds et fermes, ventre plat, hanches féminines, fesses rondes et fermes, jambes bien galbées.",`
      },
      {
        line: 366,
        pattern: `"Femme de 26 ans, 164cm. Cheveux roux longs bouclés. Yeux verts ronds. Visage carré, peau bronzée soyeuse. Silhouette élancée et fine: poitrine menue mais bien formée, ventre plat et tonique, hanches féminines, fesses fermes et galbées, jambes fines et élancées.'amis, asiatique, cheveux noirs, yeux en amande",`,
        replacement: `"Femme de 26 ans, 164cm. Cheveux roux longs bouclés. Yeux verts ronds. Visage carré, peau bronzée soyeuse. Silhouette élancée et fine: poitrine menue mais bien formée, ventre plat et tonique, hanches féminines, fesses fermes et galbées, jambes fines et élancées.",`
      }
    ]
  },
  {
    file: 'beautifulGirlsCharacters.js',
    fixes: [
      {
        line: 945,
        pattern: `"Femme de 33 ans, 162cm. Cheveux noirs très longs lisses. Yeux marron grands. Visage rond, peau bronzée soyeuse. Silhouette élancée et fine: poitrine menue mais bien formée, ventre plat et tonique, hanches féminines, fesses fermes et galbées, jambes fines et élancées.'encre, yeux brun foncé profonds, peau porcelaine dorée, traits délicats, présence apaisante",`,
        replacement: `"Femme de 33 ans, 162cm. Cheveux noirs très longs lisses. Yeux marron grands. Visage rond, peau bronzée soyeuse. Silhouette élancée et fine: poitrine menue mais bien formée, ventre plat et tonique, hanches féminines, fesses fermes et galbées, jambes fines et élancées.",`
      }
    ]
  }
];

function fixFile(filePath, content) {
  // Fix pattern: .'<word> -> remove everything from .' to the next quote (fixing the corrupted string)
  // Pattern: ends with .'<lowercase letters/text>",
  // Should become: .",
  
  // Regex to find corrupted physicalDescription fields
  // Match: .'<any text except quotes>'
  const regex = /(\.'[^'"]+)/g;
  
  let fixed = content;
  let matches = content.match(regex);
  if (matches) {
    for (const match of matches) {
      // Check if this is in a physicalDescription context
      const idx = fixed.indexOf(match);
      const before = fixed.substring(Math.max(0, idx - 50), idx);
      if (before.includes('physicalDescription') || before.includes('seins') || before.includes('hanches') || before.includes('fesses') || before.includes('jambes') || before.includes('musclées')) {
        // This is corrupted - remove the text after .'
        console.log(`  Found corrupted text: "${match.substring(0, 50)}..."`);
        fixed = fixed.replace(match, '');
      }
    }
  }
  
  return fixed;
}

function main() {
  console.log('Fixing syntax errors in character data files...\n');
  
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.js'));
  let totalFixed = 0;
  
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Apply fixes
    content = fixFile(filePath, content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${file}`);
      totalFixed++;
    }
  }
  
  console.log(`\nTotal files fixed: ${totalFixed}`);
}

main();
