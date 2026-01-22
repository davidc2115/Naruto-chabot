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
// Import des 30 personnages frère/demi-frère/beau-frère
import brotherCharacters from './brotherCharacters';
// Import des 30 personnages père/beau-père
import fatherCharacters from './fatherCharacters';
// Import des 30 personnages amis de mon fils/ma fille
import sonFriendCharacters from './sonFriendCharacters';
// Import des 30 personnages MILF
import milfCharacters from './milfCharacters';
// Import des 30 personnages curvy (différents corps)
import curvyCharacters from './curvyCharacters';
// Import des 20 personnages DILF
import dilfCharacters from './dilfCharacters';
// Import des 30 personnages colocataires
import roommateCharacters from './roommateCharacters';
// Import des 30 personnages médical/urgence
import medicalCharacters from './medicalCharacters';
// Import des 50 personnages dans diverses situations
import situationCharacters from './situationCharacters';
// Import des 16 personnages fantasy
import fantasyCharacters from './fantasyCharacters';
// Import des 20 belles filles variées
import beautifulGirlsCharacters from './beautifulGirlsCharacters';
// Import des 20 belles-filles (filles de ma femme)
import stepdaughterCharacters from './stepdaughterCharacters';
// Import des 40 personnages de groupe (orgies, soirées, etc.)
import groupCharacters from './groupCharacters';

// ==== NOUVEAUX PERSONNAGES v5.4.51 - 220 personnages supplémentaires ====
// Import des personnages additionnels - Amis, Collègues, Voisins (60 persos)
import {
  additionalFriendCharacters,
  additionalColleagueCharacters,
  additionalNeighborCharacters,
} from './additionalCharacters';

// Import des personnages additionnels - MILF, DILF, Médical (50 persos)
import {
  additionalMilfCharacters,
  additionalDilfCharacters,
  additionalMedicalCharacters,
} from './additionalCharacters2';

// Import des personnages additionnels - Colocataires, Situations (40 persos)
import {
  additionalRoommateCharacters,
  additionalSituationCharacters,
} from './additionalCharacters3';

// Import des personnages additionnels - Fantaisie, Beaux-Parents, Beaux-Enfants (70 persos)
import {
  additionalFantasyCharacters,
  additionalStepParentCharacters,
  additionalStepChildCharacters,
} from './additionalCharacters4';

// Combiner tous les personnages (730+ personnages au total)
export const enhancedCharacters = [
  ...characters,          // 6 Naruto
  ...friendCharacters,    // 30 amies
  ...momCharacters,       // 30 mamans
  ...colleagueCharacters, // 30 collègues
  ...sisterCharacters,    // 30 sœurs
  ...brotherCharacters,   // 30 frères
  ...fatherCharacters,    // 30 pères
  ...sonFriendCharacters, // 30 amis fils/fille
  ...milfCharacters,      // 30 MILF
  ...curvyCharacters,     // 30 curvy
  ...dilfCharacters,      // 20 DILF
  ...roommateCharacters,  // 30 colocataires
  ...medicalCharacters,   // 30 médical
  ...situationCharacters, // 50 situations
  ...fantasyCharacters,   // 16 fantasy
  ...beautifulGirlsCharacters, // 20 belles filles variées
  ...stepdaughterCharacters,   // 20 belles-filles (stepdaughter)
  ...groupCharacters,     // 40 personnages de groupe (orgies)
  // ==== NOUVEAUX PERSONNAGES v5.4.51 ====
  ...additionalFriendCharacters,    // 20 amis (10H + 10F)
  ...additionalColleagueCharacters, // 20 collègues (10H + 10F)
  ...additionalNeighborCharacters,  // 20 voisins (10H + 10F)
  ...additionalMilfCharacters,      // 10 MILF supplémentaires
  ...additionalDilfCharacters,      // 10 DILF supplémentaires
  ...additionalMedicalCharacters,   // 20 médical (10H + 10F)
  ...additionalRoommateCharacters,  // 20 colocataires (10H + 10F)
  ...additionalSituationCharacters, // 20 situations (10H + 10F)
  ...additionalFantasyCharacters,   // 20 fantasy (10H + 10F)
  ...additionalStepParentCharacters, // 20 beaux-parents (10 beaux-pères + 10 belles-mères)
  ...additionalStepChildCharacters,  // 20 beaux-enfants (10 beaux-fils + 10 belles-filles)
];

export default enhancedCharacters;
