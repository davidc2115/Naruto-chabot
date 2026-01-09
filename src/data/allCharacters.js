// Import des 6 personnages Naruto
import characters from './characters';
// Import des 30 personnages amies
import friendCharacters from './friendCharacters';
// Import des 30 personnages maman/belle-maman
import momCharacters from './momCharacters';
// Import des 30 personnages collègues de travail
import colleagueCharacters from './colleagueCharacters';

// Combiner tous les personnages
export const enhancedCharacters = [...characters, ...friendCharacters, ...momCharacters, ...colleagueCharacters];
export default enhancedCharacters;
