// Import des 6 personnages Naruto
import characters from './characters';
// Import des 30 personnages amies
import friendCharacters from './friendCharacters';

// Combiner tous les personnages
export const enhancedCharacters = [...characters, ...friendCharacters];
export default enhancedCharacters;
