// Import des 6 personnages Naruto
import characters from './characters';
// Import des 30 personnages amies
import friendCharacters from './friendCharacters';
// Import des 30 personnages maman/belle-maman
import momCharacters from './momCharacters';
// Import des 30 personnages collègues de travail
import colleagueCharacters from './colleagueCharacters';
// Import des 30 personnages sœur/demi-sœur/belle-sœur
import sisterCharacters from './sisterCharacters';
// Import des 30 personnages frère/demi-frère/beau-frère (NOUVEAU)
import brotherCharacters from './brotherCharacters';
// Import des 30 personnages père/beau-père (NOUVEAU)
import fatherCharacters from './fatherCharacters';
// Import des 30 personnages amis de mon fils/ma fille (NOUVEAU)
import sonFriendCharacters from './sonFriendCharacters';

// Combiner tous les personnages (216 personnages au total)
export const enhancedCharacters = [
  ...characters,          // 6 Naruto
  ...friendCharacters,    // 30 amies
  ...momCharacters,       // 30 mamans
  ...colleagueCharacters, // 30 collègues
  ...sisterCharacters,    // 30 sœurs
  ...brotherCharacters,   // 30 frères
  ...fatherCharacters,    // 30 pères
  ...sonFriendCharacters, // 30 amis fils/fille
];

export default enhancedCharacters;
