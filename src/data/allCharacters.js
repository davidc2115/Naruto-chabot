// Base de données complète avec 200 personnages de base + 100 NSFW + 50 Famille + 130 autres + 1 trio = 481 personnages
import { characters } from './characters.js';
import { nsfwCharacters } from './nsfwCharacters.js';
import { additionalNSFWCharacters } from './additionalNSFWCharacters.js';
import moreNSFWCharacters from './moreNSFWChars.js';

// Ajouter des tags détaillés aux personnages existants (fonction helper)
function enhanceCharacterTags(character) {
  const baseTags = character.tags || [];
  const newTags = [...baseTags];
  
  // Tags de genre
  if (character.gender === 'female') {
    newTags.push('femme');
    if (character.age >= 35) newTags.push('milf', 'mature');
    if (character.age < 25) newTags.push('jeune');
  } else if (character.gender === 'male') {
    newTags.push('homme');
    if (character.age >= 35) newTags.push('daddy', 'mature');
    if (character.age < 25) newTags.push('jeune');
  } else {
    newTags.push('non-binaire');
  }
  
  // Tags de taille de poitrine/pénis
  if (character.bust) {
    if (['A', 'B'].includes(character.bust)) {
      newTags.push('petits seins');
    } else if (['C', 'D'].includes(character.bust)) {
      newTags.push('gros seins');
    } else if (['DD', 'E', 'F', 'G'].includes(character.bust)) {
      newTags.push('énormes seins');
    }
  }
  
  if (character.penis) {
    const size = parseInt(character.penis);
    if (size >= 20) {
      newTags.push('grosse bite');
    }
  }
  
  // Tags basés sur le tempérament
  if (character.temperament === 'dominant') newTags.push('dominateur', 'dominatrice');
  if (character.temperament === 'timide') newTags.push('soumis', 'soumise');
  if (character.temperament === 'flirt') newTags.push('séduction');
  if (character.temperament === 'romantique') newTags.push('romance', 'doux');
  if (character.temperament === 'coquin') newTags.push('coquin', 'joueur');
  
  // Tags basés sur l'apparence/profession
  if (character.appearance) {
    const appearance = character.appearance.toLowerCase();
    if (appearance.includes('musclé') || appearance.includes('athlétique')) newTags.push('musclé', 'sportif');
    if (appearance.includes('tattoo') || appearance.includes('tatouage')) newTags.push('tatoué');
    if (appearance.includes('gothique')) newTags.push('gothique', 'dark');
    if (appearance.includes('elegant') || appearance.includes('sophistiqué')) newTags.push('élégant', 'sophistiqué');
  }
  
  // Tags d'orientation (par défaut hétéro sauf indication contraire)
  if (!newTags.includes('gay') && !newTags.includes('lesbienne') && !newTags.includes('bisexuelle')) {
    newTags.push('hétéro');
  }
  
  // Retirer les doublons
  return [...new Set(newTags)];
}

// COMBINER avec les 200 personnages de base + 100 NSFW + 51 Famille + 130 Fantasy/Pro = 481+ personnages
const allCharacters = [...characters, ...nsfwCharacters, ...additionalNSFWCharacters, ...moreNSFWCharacters];

// Améliorer tous les tags
export const enhancedCharacters = allCharacters.map(char => ({
  ...char,
  tags: enhanceCharacterTags(char)
}));

export default enhancedCharacters;
