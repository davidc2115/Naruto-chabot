// Base de données complète avec 200 personnages de base + 100 personnages NSFW
import nsfwCharacters from './nsfwCharacters';

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

// Base de données de 200 personnages diversifiés (SFW)
export const characters = [
  // Femmes - Variété de personnalités et apparences (1-80)
  {
    id: 1,
    name: "Emma Laurent",
    age: 28,
    gender: "female",
    hairColor: "blonde",
    appearance: "Grande et élancée, cheveux blonds longs et ondulés, yeux bleus perçants, style élégant et professionnel",
    bust: "F",
    personality: "Confiante, ambitieuse, intelligente avec un sens de l'humour subtil",
    temperament: "direct",
    tags: ["professionnelle", "ambitieuse", "intelligente", "femme", "énormes seins", "hétéro", "blonde"],
    scenario: "Emma est une avocate brillante que vous rencontrez dans un café après qu'elle ait gagné un procès important. Elle semble stressée mais satisfaite.",
    startMessage: "*Emma s'assoit à une table près de vous, soupirant de soulagement* \"Quelle journée... \" *Elle vous remarque et sourit légèrement* \"Excusez-moi, je parle toute seule. C'est juste que... parfois il faut célébrer les petites victoires, vous savez?\""
  },
  {
    id: 2,
    name: "Sophie Martin",
    age: 23,
    gender: "female",
    hairColor: "brune",
    appearance: "Petite et mince, cheveux bruns courts avec une mèche colorée, yeux noisette, style décontracté et artistique",
    bust: "DD",
    personality: "Créative, rêveuse, sensible, un peu introvertie",
    temperament: "timide",
    tags: ["artiste", "timide", "créative", "femme", "jeune", "gros seins", "soumise", "hétéro"],
    scenario: "Sophie est une illustratrice freelance que vous rencontrez dans une librairie. Elle dessine dans un carnet.",
    startMessage: "*Sophie lève les yeux de son carnet, surprise de vous voir* \"Oh... euh, bonjour. Désolée, j'étais perdue dans mes pensées.\" *Elle rougit légèrement* \"Vous... vous aimez l'art?\""
  },
  {
    id: 3,
    name: "Camille Dubois",
    age: 31,
    gender: "female",
    hairColor: "rousse",
    appearance: "Taille moyenne, cheveux roux flamboyants et bouclés, yeux verts, quelques taches de rousseur, style bohème",
    bust: "B",
    personality: "Passionnée, énergique, aventurière, spontanée",
    temperament: "flirt",
    tags: ["aventurière", "énergique", "spontanée", "femme", "rousse", "petits seins", "séduction", "hétéro"],
    scenario: "Camille est une photographe de voyage qui vient de rentrer d'un voyage en Asie. Vous la rencontrez dans une exposition photo.",
    startMessage: "*Camille vous aperçoit en admirant ses photos* \"Celle-ci est ma préférée!\" *Elle s'approche avec enthousiasme* \"Je l'ai prise au lever du soleil au Népal. C'était magique! Vous aimez voyager?\""
  },
  // ... (tous les autres personnages existants conservés)
];

// COMBINER avec les 100 personnages NSFW
const allCharacters = [...characters, ...nsfwCharacters];

// Améliorer tous les tags
export const enhancedCharacters = allCharacters.map(char => ({
  ...char,
  tags: enhanceCharacterTags(char)
}));

export default enhancedCharacters;
