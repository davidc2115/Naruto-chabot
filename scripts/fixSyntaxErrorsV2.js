/**
 * Script to fix syntax errors in character data files v2
 * Properly restores outfit field when it was corrupted
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'src', 'data');

function fixFile(filePath, content) {
  // Pattern 1: physicalDescription ends with .' + text (text was supposed to be after outfit:)
  // This was already handled but might have left remnants
  
  // Pattern 2: physicalDescription ends with 's' (typical ending) followed directly by capital letter 
  // without comma - this means outfit text was concatenated
  // Example: jambes fines et élancées'Blouse pastel...
  // Should be: jambes fines et élancées.',\n    outfit: 'Blouse pastel...
  
  const lines = content.split('\n');
  let fixedLines = [];
  let fixCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for the pattern: physicalDescription with unquoted text after the closing quote
    // Pattern: '...'SomeText', where SomeText starts with uppercase
    const match = line.match(/^(\s*physicalDescription:\s*['"])(.+)(élancées|féminines|galbées|sensuelles|musclées)(['"])[A-Z](.+)$/);
    
    if (match) {
      const indent = match[1].match(/^\s*/)[0];
      const quoteChar = match[1].slice(-1);
      const prefix = match[1];
      const mainText = match[2] + match[3];
      const remainder = match[5];
      
      // Reconstruct the line properly
      const fixedPhysDesc = `${prefix}${mainText}.${quoteChar},`;
      const outfitLine = `${indent}    outfit: ${quoteChar}${remainder.replace(/^['"],?\s*/, '')}`;
      
      fixedLines.push(fixedPhysDesc);
      fixedLines.push(outfitLine);
      fixCount++;
      console.log(`  Fixed line ${i + 1}: split physicalDescription and outfit`);
      continue;
    }
    
    // Also check for pattern where text follows directly after closing quote
    // Example: ...élancées'Some outfit text',
    const match2 = line.match(/^(\s*physicalDescription:\s*)(['"])(.+)(élancées|féminines|galbées|sensuelles|musclées)(['"])([A-Z].+)$/);
    
    if (match2) {
      const indent = match2[1].match(/^\s*/)[0];
      const quoteChar = match2[2];
      const mainText = match2[3] + match2[4];
      const outfitText = match2[6];
      
      // Reconstruct properly
      const fixedPhysDesc = `${match2[1]}${quoteChar}${mainText}.${quoteChar},`;
      const outfitLine = `${indent}    outfit: ${quoteChar}${outfitText}`;
      
      fixedLines.push(fixedPhysDesc);
      fixedLines.push(outfitLine);
      fixCount++;
      console.log(`  Fixed line ${i + 1}: pattern 2`);
      continue;
    }
    
    fixedLines.push(line);
  }
  
  if (fixCount > 0) {
    return fixedLines.join('\n');
  }
  return content;
}

function main() {
  console.log('Fixing syntax errors in character data files v2...\n');
  
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.js'));
  let totalFixed = 0;
  
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Apply fixes
    const fixedContent = fixFile(filePath, content);
    
    if (fixedContent !== originalContent) {
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      console.log(`✅ Fixed: ${file}`);
      totalFixed++;
    }
  }
  
  console.log(`\nTotal files fixed: ${totalFixed}`);
}

main();
