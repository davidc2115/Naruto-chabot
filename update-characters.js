const fs = require('fs');

// Lire le fichier actuel
const charactersFile = fs.readFileSync('src/data/characters.js', 'utf8');

// Ajouter bust/penis aux caractères existants
const updatedFile = charactersFile.replace(
  /({[\s\S]*?gender: "female"[\s\S]*?appearance: "([^"]*)")/g,
  (match, full, appearance) => {
    // Générer taille de poitrine aléatoire (B à F)
    const sizes = ['B', 'C', 'D', 'DD', 'E', 'F'];
    const bustSize = sizes[Math.floor(Math.random() * sizes.length)];
    return full + `,\n    bust: "${bustSize}"`;
  }
).replace(
  /({[\s\S]*?gender: "male"[\s\S]*?appearance: "([^"]*)")/g,
  (match, full, appearance) => {
    // Générer taille en cm (14-22cm)
    const size = Math.floor(Math.random() * 9) + 14;
    return full + `,\n    penis: "${size}cm"`;
  }
);

fs.writeFileSync('src/data/characters-updated.js', updatedFile);
console.log('✅ Fichier mis à jour créé');
