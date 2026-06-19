// Script pour générer des personnages originaux inspirés des archétypes Candy AI
// Crée 200 personnages uniques avec des descriptions originales

// Archétypes inspirés de Candy AI (sans copier de contenu spécifique)
const characterArchetypes = [
  // Archétypes féminins
  {
    type: 'femme_affaires',
    gender: 'female',
    traits: ['confiante', 'ambitieuse', 'séductrice', 'intelligente'],
    ageRange: [25, 35],
    professions: ['PDG', 'avocate', 'architecte', 'consultante', 'directrice marketing'],
    scenarios: [
      'rencontre lors d\'une conférence professionnelle',
      'collaboration sur un projet important',
      'déjeuner d\'affaires qui tourne en romance',
      'rivale en affaires qui devient complice'
    ]
  },
  {
    type: 'femme_artistique',
    gender: 'female',
    traits: ['créative', 'passionnée', 'bohème', 'mystérieuse'],
    ageRange: [20, 30],
    professions: ['peintre', 'photographe', 'musicienne', 'sculpteur', 'designer'],
    scenarios: [
      'rencontre dans une galerie d\'art',
      'modèle pour un portrait',
      'collaboration artistique',
      'voisine atelier créatif'
    ]
  },
  {
    type: 'femme_sportive',
    gender: 'female',
    traits: ['énergique', 'compétitive', 'déterminée', 'charismatique'],
    ageRange: [22, 32],
    professions: ['entraîneuse', 'athlète professionnelle', 'instructrice fitness', 'physiothérapeute'],
    scenarios: [
      'rencontre à la salle de sport',
      'partenaire d\'entraînement',
      'compétition sportive',
      'coach personnel'
    ]
  },
  {
    type: 'femme_intellectuelle',
    gender: 'female',
    traits: ['intelligente', 'curieuse', 'réservée', 'profonde'],
    ageRange: [24, 34],
    professions: ['professeure', 'chercheuse', 'écrivaine', 'bibliothécaire', 'journaliste'],
    scenarios: [
      'rencontre à l\'université',
      'débat intellectuel',
      'collaboration de recherche',
      'club de lecture'
    ]
  },
  {
    type: 'femme_aventurière',
    gender: 'female',
    traits: ['audacieuse', 'spontanée', 'indépendante', 'charmeuse'],
    ageRange: [21, 31],
    professions: ['voyageuse', 'guide touristique', 'photographe nature', 'blogueuse voyage'],
    scenarios: [
      'rencontre lors d\'un voyage',
      'aventure commune',
      'guide locale',
      'compagnon de voyage'
    ]
  },
  {
    type: 'femme_traditionnelle',
    gender: 'female',
    traits: ['douce', 'attentionnée', 'familiale', 'romantique'],
    ageRange: [26, 36],
    professions: ['institutrice', 'infirmière', 'cuisinière', 'floriste', 'bibliothécaire'],
    scenarios: [
      'voisine de quartier',
      'amie de famille',
      'rencontre communautaire',
      'bénévolat commun'
    ]
  },
  {
    type: 'femme_mystérieuse',
    gender: 'female',
    traits: ['énigmatique', 'séduisante', 'intelligente', 'indépendante'],
    ageRange: [27, 37],
    professions: ['détective privée', 'espionne', 'consultante', 'psychologue'],
    scenarios: [
      'enquête commune',
      'client mystérieux',
      'rencontre nocturne',
      'partenaire d\'investigation'
    ]
  },
  {
    type: 'femme_glamour',
    gender: 'female',
    traits: ['élégante', 'sophistiquée', 'charmante', 'confiante'],
    ageRange: [25, 35],
    professions: ['mannequin', 'actrice', 'influenceuse', 'styliste', 'journaliste mode'],
    scenarios: [
      'événement mondain',
      'séance photo',
      'collaboration mode',
      'rencontre exclusive'
    ]
  },
  {
    type: 'femme_technologique',
    gender: 'female',
    traits: ['brillante', 'innovante', 'curieuse', 'déterminée'],
    ageRange: [23, 33],
    professions: ['ingénieure logiciel', 'fondatrice startup', 'data scientist', 'cybersécurité'],
    scenarios: [
      'hackathon',
      'conférence tech',
      'collaboration startup',
      'mentorat tech'
    ]
  },
  {
    type: 'femme_medicale',
    gender: 'female',
    traits: ['compatissante', 'dévouée', 'intelligente', 'calme'],
    ageRange: [26, 38],
    professions: ['médecin', 'chirurgienne', 'vétérinaire', 'pharmacienne', 'infirmière chef'],
    scenarios: [
      'rencontre à l\'hôpital',
      'patient et médecin',
      'collaboration médicale',
      'urgence commune'
    ]
  },
  // Archétypes masculins
  {
    type: 'homme_affaires',
    gender: 'male',
    traits: ['ambitieux', 'charismatique', 'confiant', 'dominant'],
    ageRange: [28, 40],
    professions: ['PDG', 'investisseur', 'avocat', 'consultant', 'entrepreneur'],
    scenarios: [
      'partenariat d\'affaires',
      'rival en affaires',
      'mentorat',
      'négociation importante'
    ]
  },
  {
    type: 'homme_artiste',
    gender: 'male',
    traits: ['créatif', 'passionné', 'sensible', 'charmeur'],
    ageRange: [22, 32],
    professions: ['musicien', 'peintre', 'photographe', 'sculpteur', 'designer'],
    scenarios: [
      'collaboration artistique',
      'exposition commune',
      'jam session',
      'atelier partagé'
    ]
  },
  {
    type: 'homme_sportif',
    gender: 'male',
    traits: ['athlétique', 'compétitif', 'déterminé', 'protecteur'],
    ageRange: [24, 34],
    professions: ['athlète pro', 'entraîneur', 'instructeur', 'physiothérapeute'],
    scenarios: [
      'partenaire d\'entraînement',
      'compétition',
      'coach personnel',
      'équipe sportive'
    ]
  },
  {
    type: 'homme_intellectuel',
    gender: 'male',
    traits: ['intelligent', 'curieux', 'réservé', 'profond'],
    ageRange: [26, 36],
    professions: ['professeur', 'chercheur', 'écrivain', 'scientifique', 'philosophe'],
    scenarios: [
      'débat académique',
      'collaboration recherche',
      'séminaire',
      'club intellectuel'
    ]
  },
  {
    type: 'homme_aventurier',
    gender: 'male',
    traits: ['audacieux', 'spontané', 'indépendant', 'charmeur'],
    ageRange: [23, 33],
    professions: ['guide montagne', 'photographe nature', 'pilote', 'explorateur'],
    scenarios: [
      'expédition commune',
      'aventure extrême',
      'guide local',
      'sauvetage'
    ]
  },
  {
    type: 'homme_traditionnel',
    gender: 'male',
    traits: ['doux', 'attentionné', 'familial', 'romantique'],
    ageRange: [27, 37],
    professions: ['artisan', 'cuisinier', 'agriculteur', 'vétérinaire', 'instituteur'],
    scenarios: [
      'voisin de campagne',
      'artisan local',
      'rencontre communautaire',
      'fête villageoise'
    ]
  },
  {
    type: 'homme_mystérieux',
    gender: 'male',
    traits: ['énigmatique', 'séducteur', 'intelligent', 'indépendant'],
    ageRange: [28, 38],
    professions: ['détective', 'consultant', 'espion', 'psychologue'],
    scenarios: [
      'enquête commune',
      'client mystérieux',
      'rencontre nocturne',
      'partenaire d\'investigation'
    ]
  },
  {
    type: 'homme_glamour',
    gender: 'male',
    traits: ['élégant', 'sophistiqué', 'charmant', 'confiant'],
    ageRange: [26, 36],
    professions: ['mannequin', 'acteur', 'influenceur', 'styliste', 'journaliste mode'],
    scenarios: [
      'événement mondain',
      'séance photo',
      'collaboration mode',
      'rencontre exclusive'
    ]
  },
  {
    type: 'homme_technologique',
    gender: 'male',
    traits: ['brillant', 'innovant', 'curieux', 'déterminé'],
    ageRange: [24, 34],
    professions: ['ingénieur logiciel', 'fondateur startup', 'data scientist', 'cybersécurité'],
    scenarios: [
      'hackathon',
      'conférence tech',
      'collaboration startup',
      'mentorat tech'
    ]
  },
  {
    type: 'homme_médical',
    gender: 'male',
    traits: ['compatissant', 'dévoué', 'intelligent', 'calme'],
    ageRange: [27, 39],
    professions: ['médecin', 'chirurgien', 'vétérinaire', 'pharmacien', 'infirmier'],
    scenarios: [
      'rencontre à l\'hôpital',
      'patient et médecin',
      'collaboration médicale',
      'urgence commune'
    ]
  }
];

// Générateurs de noms originaux
const firstNamesFemale = [
  'Léa', 'Camille', 'Manon', 'Chloé', 'Sarah', 'Julie', 'Marie', 'Sophie',
  'Emma', 'Alice', 'Lucie', 'Zoé', 'Inès', 'Jade', 'Louise', 'Rose',
  'Anaïs', 'Clara', 'Lina', 'Mia', 'Nina', 'Olivia', 'Pauline', 'Valentine',
  'Adèle', 'Célia', 'Diane', 'Élise', 'Flora', 'Gina', 'Hélène', 'Iris',
  'Julia', 'Kira', 'Lola', 'Mila', 'Noémie', 'Océane', 'Pénélope', 'Quinn',
  'Romy', 'Sasha', 'Thaïs', 'Una', 'Violette', 'Wendy', 'Xana', 'Yasmine'
];

const firstNamesMale = [
  'Gabriel', 'Léo', 'Raphaël', 'Louis', 'Arthur', 'Jules', 'Adam', 'Lucas',
  'Hugo', 'Nathan', 'Théo', 'Enzo', 'Paul', 'Mathis', 'Ethan', 'Antoine',
  'Baptiste', 'Côme', 'Dylan', 'Élian', 'Félix', 'Gaspard', 'Hadrien', 'Ilan',
  'Joris', 'Kilian', 'Lysandre', 'Maxime', 'Noah', 'Oscar', 'Pierre', 'Quentin',
  'Romain', 'Simon', 'Tom', 'Ulysse', 'Victor', 'William', 'Xavier', 'Yann',
  'Zacharie', 'Aaron', 'Benoît', 'Charles', 'David', 'Édouard', 'Fabien', 'Gaston'
];

const lastNames = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand',
  'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David',
  'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'Andre', 'Lefevre',
  'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'Francois', 'Martinez', 'Legrand', 'Carlier',
  'Dubois', 'Muller', 'Brunet', 'Blanchard', 'Guerin', 'Clement', 'Gillet', 'Roussel'
];

// Générateur de descriptions physiques
const hairColors = ['brun', 'blond', 'châtain', 'roux', 'noir', 'cendré', 'auburn'];
const eyeColors = ['bleu', 'vert', 'marron', 'noisette', 'gris', 'ambre', 'violet'];
const bodyTypes = ['athlétique', 'mince', 'moyen', 'costaud', 'élégant', 'tonique'];
const heights = ['165 cm', '170 cm', '175 cm', '180 cm', '185 cm', '190 cm'];

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCharacter(id, archetype) {
  const gender = archetype.gender;
  const firstName = gender === 'female' ? getRandomItem(firstNamesFemale) : getRandomItem(firstNamesMale);
  const lastName = getRandomItem(lastNames);
  const age = getRandomInRange(...archetype.ageRange);
  const profession = getRandomItem(archetype.professions);
  const scenario = getRandomItem(archetype.scenarios);
  
  const hairColor = getRandomItem(hairColors);
  const eyeColor = getRandomItem(eyeColors);
  const bodyType = getRandomItem(bodyTypes);
  const height = getRandomInRange(165, 190) + ' cm';
  
  const traits = archetype.traits;
  const temperament = traits[0];
  
  // Générer une description physique originale
  const appearance = generateAppearance(gender, hairColor, eyeColor, bodyType, age, profession);
  
  // Générer un scénario original
  const fullScenario = generateScenario(firstName, lastName, profession, scenario, traits);
  
  // Générer un message de départ
  const startMessage = generateStartMessage(firstName, profession, scenario, traits);
  
  return {
    id: id,
    name: `${firstName} ${lastName}`,
    age: age,
    gender: gender,
    hairColor: hairColor,
    eyeColor: eyeColor,
    height: height,
    bodyType: bodyType,
    appearance: appearance,
    physicalDescription: `${gender === 'female' ? 'Femme' : 'Homme'} ${age} ans, ${height}, cheveux ${hairColor}, yeux ${eyeColor}, corps ${bodyType}, ${profession}`,
    outfit: generateOutfit(gender, profession),
    personality: traits.join(', '),
    temperament: temperament,
    temperamentDetails: generateTemperamentDetails(temperament, traits),
    scenario: fullScenario,
    startMessage: startMessage,
    interests: generateInterests(profession, traits),
    backstory: generateBackstory(firstName, profession, traits),
    tags: [profession.toLowerCase(), temperament, ...traits.slice(0, 3)],
    imagePrompt: generateImagePrompt(gender, hairColor, eyeColor, bodyType, age, profession)
  };
}

function generateAppearance(gender, hairColor, eyeColor, bodyType, age, profession) {
  const adjectives = gender === 'female' 
    ? ['élégante', 'charmante', 'gracieuse', 'séduisante', 'magnifique', 'rayonnante']
    : ['élégant', 'charismatique', 'imposant', 'attirant', 'magnifique', 'rayonnant'];
  
  const adj = getRandomItem(adjectives);
  
  return `${gender === 'female' ? 'Jeune femme' : 'Jeune homme'} de ${age} ans au physique ${adj}. Visage harmonieux avec des traits fins, yeux ${eyeColor} perçants, cheveux ${hairColor} soyeux. Corps ${bodyType} et tonique, posture confiante. ${gender === 'female' ? 'Sourire énigmatique et captivant' : 'Regard intense et déterminé'}. Style vestimentaire soigné reflétant sa profession de ${profession}.`;
}

function generateScenario(firstName, lastName, profession, scenario, traits) {
  const trait = getRandomItem(traits);
  return `${firstName} ${lastName} est ${profession} ${trait}. ${scenario.charAt(0).toUpperCase() + scenario.slice(1)}. Cette rencontre marquera le début d'une relation unique.`;
}

function generateStartMessage(firstName, profession, scenario, traits) {
  const greetings = [
    `Bonjour, je suis ${firstName}, ${profession}.`,
    `Enchanté de vous rencontrer, moi c'est ${firstName}.`,
    `Salut ! Je m'appelle ${firstName}.`
  ];
  
  const contexts = [
    `Je travaille comme ${profession}.`,
    `Vous avez l'air intéressant(e).`,
    `C'est un plaisir de faire votre connaissance.`
  ];
  
  return `${getRandomItem(greetings)} ${getRandomItem(contexts)} ${scenario.charAt(0).toLowerCase() + scenario.slice(1)}`;
}

function generateOutfit(gender, profession) {
  const outfits = {
    female: {
      'PDG': 'Tailleur pantalon gris, chemise blanche, talons hauts',
      'avocate': 'Robe noire élégante, veste cintrée, escarpins',
      'architecte': 'Chemise bleue, pantalon chino, lunettes',
      'consultante': 'Blazer marine, blouse soyeuse, pantalon ajusté',
      'directrice marketing': 'Robe midi colorée, veste structurée, accessoires modernes',
      'peintre': 'T-shirt artistique, pantalon large, tablier',
      'photographe': 'Veste en jean, chemise blanche, appareil photo',
      'musicienne': 'Robe bohème, bijoux ethniques, instrument',
      'sculpteur': 'Combinaison de travail, gants, outils',
      'designer': 'Tenue créative colorée, accessoires originaux',
      'entraîneuse': 'Tenue sportive élégante, baskets',
      'athlète professionnelle': 'Tenue de compétition, chaussures techniques',
      'instructrice fitness': 'Leggings, crop top, baskets',
      'physiothérapeute': 'Blouse médicale, pantalon confortable',
      'professeure': 'Robe professionnelle, lunettes',
      'chercheuse': 'Blouse de laboratoire, pantalon',
      'écrivaine': 'Robe confortable, stylo, carnet',
      'bibliothécaire': 'Cardigan, jupe, lunettes',
      'journaliste': 'Veste structurée, pantalon, dictaphone',
      'voyageuse': 'Tenue pratique, sac à dos, accessoires voyage',
      'guide touristique': 'Uniforme guide, badge, carte',
      'photographe nature': 'Tenue camouflage, équipement photo',
      'blogueuse voyage': 'Tenue décontractée chic, smartphone',
      'institutrice': 'Robe douce, accessoires éducatifs',
      'infirmière': 'Uniforme médical, chaussures confortables',
      'cuisinière': 'Tablier, toque, uniforme cuisine',
      'floriste': 'Tablier fleuri, ciseaux, rubans',
      'détective privée': 'Veste en cuir, jeans, lunettes',
      'espionne': 'Tenue élégante discrète, gadgets',
      'consultante': 'Tailleur professionnel, sac',
      'psychologue': 'Tenue confortable professionnelle',
      'mannequin': 'Tenue haute couture, accessoires',
      'actrice': 'Robe de soirée, maquillage',
      'influenceuse': 'Tenue tendance, téléphone',
      'styliste': 'Tenue mode originale, accessoires',
      'journaliste mode': 'Tenue chic, carnet',
      'ingénieure logiciel': 'T-shirt tech, jeans, laptop',
      'fondatrice startup': 'Tenue business casual, smartphone',
      'data scientist': 'Tenue décontractée, écran',
      'cybersécurité': 'Tenue pratique, équipement tech',
      'médecin': 'Blouse médicale, stéthoscope',
      'chirurgienne': 'Tenue opératoire',
      'vétérinaire': 'Blouse vétérinaire, animaux',
      'pharmacienne': 'Blanche, blouse médicale',
      'infirmière chef': 'Uniforme médical, badge'
    },
    male: {
      'PDG': 'Costume sur mesure, cravate, montre de luxe',
      'investisseur': 'Costume gris, chemise blanche, cravate',
      'avocat': 'Costu noir, chemise blanche, cravate',
      'consultant': 'Costu marine, chemise bleue',
      'entrepreneur': 'Tenue business casual, smartphone',
      'musicien': 'Tenue scène, instrument',
      'peintre': 'T-shirt, pantalon large, tablier',
      'photographe': 'Veste en jean, chemise, appareil',
      'sculpteur': 'Combinaison, gants, outils',
      'designer': 'Tenue créative, accessoires',
      'athlète pro': 'Tenue de compétition, chaussures',
      'entraîneur': 'Tenue sportive, sifflet',
      'instructeur': 'Tenue fitness, équipement',
      'physiothérapeute': 'Tenue médicale, équipement',
      'professeur': 'Costume décontracté, lunettes',
      'chercheur': 'Blouse laboratoire, pantalon',
      'écrivain': 'Tenue confortable, stylo',
      'scientifique': 'Blanche, blouse, équipement',
      'philosophe': 'Tenue classique, livres',
      'guide montagne': 'Tenue technique, équipement',
      'photographe nature': 'Tenue camouflage, appareil',
      'pilote': 'Uniforme pilote, casque',
      'explorateur': 'Tenue aventure, équipement',
      'artisan': 'Tablier, outils',
      'cuisinier': 'Tablier, toque, uniforme',
      'agriculteur': 'Tenue travail, bottes',
      'vétérinaire': 'Blanche, blouse, équipement',
      'instituteur': 'Tenue décontractée, accessoires',
      'détective': 'Veste en cuir, jeans, lunettes',
      'consultant': 'Costu professionnel, sac',
      'espion': 'Tenue discrète, gadgets',
      'psychologue': 'Tenue confortable professionnelle',
      'mannequin': 'Tenue haute couture',
      'acteur': 'Costume de scène, maquillage',
      'influenceur': 'Tenue tendance, téléphone',
      'styliste': 'Tenue mode originale',
      'journaliste mode': 'Tenue chic, carnet',
      'ingénieur logiciel': 'T-shirt tech, jeans, laptop',
      'fondateur startup': 'Tenue business casual',
      'data scientist': 'Tenue décontractée, écran',
      'cybersécurité': 'Tenue pratique, équipement',
      'médecin': 'Blanche, blouse, stéthoscope',
      'chirurgien': 'Tenue opératoire',
      'vétérinaire': 'Blanche, blouse, équipement',
      'pharmacien': 'Blanche, blouse médicale',
      'infirmier': 'Uniforme médical'
    }
  };
  
  return outfits[gender][profession] || `${gender === 'female' ? 'Robe' : 'Costume'} professionnel`;
}

function generateTemperamentDetails(temperament, traits) {
  return {
    emotionnel: `${traits[0]} et ${traits[1]}, cache ses émotions derrière un masque de calme.`,
    seduction: `Approche ${traits[2]} et naturelle, utilise son charme avec élégance.`,
    intimite: `${traits[0]} dans l'intimité, attentionné et passionné.`,
    communication: `Voix ${traits[1]}, parle avec assurance et intelligence.`,
    reactions: `Face au stress: reste ${traits[0]}. Face au désir: devient ${traits[3]}.`
  };
}

function generateInterests(profession, traits) {
  const baseInterests = ['lecture', 'musique', 'voyages', 'cinéma', 'nature'];
  const professionInterests = {
    'PDG': ['business', 'investissement', 'golf', 'art', 'philanthropie'],
    'avocate': ['droit', 'justice', 'politique', 'littérature', 'débat'],
    'architecte': ['architecture', 'design', 'art', 'urbanisme', 'photographie'],
    'consultante': ['stratégie', 'psychologie', 'business', 'voyages'],
    'directrice marketing': ['marketing', 'réseaux sociaux', 'tendance', 'créativité'],
    'peintre': ['art', 'peinture', 'musées', 'créativité', 'couleurs'],
    'photographe': ['photographie', 'art visuel', 'voyages', 'technologie'],
    'musicienne': ['musique', 'concerts', 'composition', 'instruments'],
    'sculpteur': ['sculpture', 'art', 'matériaux', 'créativité'],
    'designer': ['design', 'créativité', 'art', 'tendance'],
    'entraîneuse': ['sport', 'fitness', 'nutrition', 'compétition'],
    'athlète professionnelle': ['sport', 'compétition', 'fitness', 'nutrition'],
    'instructrice fitness': ['fitness', 'nutrition', 'santé', 'bien-être'],
    'physiothérapeute': ['santé', 'médecine', 'anatomie', 'sport'],
    'professeure': ['éducation', 'recherche', 'littérature', 'culture'],
    'chercheuse': ['recherche', 'science', 'innovation', 'découverte'],
    'écrivaine': ['littérature', 'écriture', 'lecture', 'créativité'],
    'bibliothécaire': ['livres', 'littérature', 'culture', 'organisation'],
    'journaliste': ['journalisme', 'actualité', 'investigation', 'écriture'],
    'voyageuse': ['voyages', 'culture', 'photographie', 'aventure'],
    'guide touristique': ['voyages', 'culture', 'histoire', 'géographie'],
    'photographe nature': ['photographie', 'nature', 'voyages', 'animaux'],
    'blogueuse voyage': ['voyages', 'écriture', 'photographie', 'réseaux sociaux'],
    'institutrice': ['éducation', 'enfants', 'pédagogie', 'créativité'],
    'infirmière': ['santé', 'médecine', 'soins', 'bien-être'],
    'cuisinière': ['cuisine', 'gastronomie', 'recettes', 'nutrition'],
    'floriste': ['fleurs', 'botanique', 'décoration', 'nature'],
    'détective privée': ['enquête', 'mystère', 'psychologie', 'observation'],
    'espionne': ['espionnage', 'langues', 'culture', 'stratégie'],
    'consultante': ['conseil', 'stratégie', 'business', 'psychologie'],
    'psychologue': ['psychologie', 'comportement', 'thérapie', 'bien-être'],
    'mannequin': ['mode', 'photographie', 'voyages', 'fitness'],
    'actrice': ['cinéma', 'théâtre', 'art', 'culture'],
    'influenceuse': ['réseaux sociaux', 'mode', 'tendance', 'créativité'],
    'styliste': ['mode', 'design', 'créativité', 'tendance'],
    'journaliste mode': ['mode', 'journalisme', 'photographie', 'tendance'],
    'ingénieure logiciel': ['programmation', 'technologie', 'innovation', 'IA'],
    'fondatrice startup': ['entrepreneuriat', 'business', 'innovation', 'technologie'],
    'data scientist': ['data', 'IA', 'statistiques', 'programmation'],
    'cybersécurité': ['sécurité', 'technologie', 'hacking', 'réseaux'],
    'médecin': ['médecine', 'santé', 'science', 'bien-être'],
    'chirurgienne': ['chirurgie', 'médecine', 'anatomie', 'précision'],
    'vétérinaire': ['animaux', 'médecine vétérinaire', 'nature', 'biologie'],
    'pharmacienne': ['pharmacie', 'médecine', 'santé', 'chimie'],
    'infirmière chef': ['santé', 'management', 'médecine', 'leadership']
  };
  
  return [...baseInterests.slice(0, 2), ...(professionInterests[profession] || baseInterests.slice(0, 3))];
}

function generateBackstory(firstName, profession, traits) {
  return `${firstName} a toujours été ${traits[0]}. Dès son plus jeune âge, elle a montré un intérêt pour ${profession.toLowerCase()}. Après des études passionnantes, elle a construit une carrière réussie tout en restant fidèle à ses valeurs ${traits[1]} et ${traits[2]}.`;
}

function generateImagePrompt(gender, hairColor, eyeColor, bodyType, age, profession) {
  const genderTerm = gender === 'female' ? 'beautiful woman' : 'handsome man';
  const hairTerms = {
    'brun': 'dark brown hair',
    'blond': 'blonde hair',
    'châtain': 'chestnut hair',
    'roux': 'red hair',
    'noir': 'black hair',
    'cendré': 'gray hair',
    'auburn': 'auburn hair'
  };
  
  return `${genderTerm} ${age} years old, ${hairTerms[hairColor] || 'hair'}, ${eyeColor} eyes, ${bodyType} body, ${profession}, professional portrait, anime realistic style, high quality, 8k, masterpiece, detailed face, expressive eyes, soft lighting, clean background`;
}

// Fonction principale pour générer 200 personnages
function generateCharacters(count = 200) {
  const characters = [];
  let id = 1000; // Commencer à 1000 pour éviter les conflits avec les personnages existants
  
  for (let i = 0; i < count; i++) {
    // Sélectionner un archétype aléatoire
    const archetype = getRandomItem(characterArchetypes);
    
    // Générer un personnage
    const character = generateCharacter(id++, archetype);
    characters.push(character);
    
    // Afficher la progression
    if ((i + 1) % 20 === 0) {
      console.log(`✅ ${i + 1}/${count} personnages générés`);
    }
  }
  
  console.log(`✅ Total: ${characters.length} personnages générés`);
  return characters;
}

// Exécuter la génération
if (require.main === module) {
  console.log('🎨 Génération de 200 personnages inspirés des archétypes Candy AI...');
  const characters = generateCharacters(200);
  
  // Sauvegarder dans un fichier
  const fs = require('fs');
  fs.writeFileSync(
    'candyAIInspiredCharacters.json',
    JSON.stringify(characters, null, 2)
  );
  console.log('💾 Personnages sauvegardés dans candyAIInspiredCharacters.json');
}

module.exports = { generateCharacters, generateCharacter };
