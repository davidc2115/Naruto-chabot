// 130 PERSONNAGES SUPPLÉMENTAIRES (MILF + Fantasy + Professionnels)
// Format condensé pour économiser de l'espace

const generateMILFChars = () => {
  const milfs = [];
  const ages = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48];
  const names = ['Rachel', 'Monica', 'Phoebe', 'Jennifer', 'Lisa', 'Courtney', 'Sarah', 'Michelle', 'Jessica', 'Amy', 'Tina', 'Laura', 'Sandra', 'Patricia', 'Linda', 'Barbara', 'Elizabeth', 'Maria', 'Susan', 'Margaret', 'Dorothy', 'Nancy', 'Karen', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Deborah'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  
  for (let i = 0; i < 30; i++) {
    const id = 'nsfw_' + (151 + i);
    const name = names[i % names.length] + ' ' + lastNames[i % lastNames.length];
    const age = ages[i % ages.length];
    const bust = ['DD', 'E', 'F', 'G'][i % 4];
    milfs.push({
      id,
      name,
      age,
      gender: 'female',
      bust,
      hairColor: ['blond', 'brun', 'châtain', 'roux', 'noir'][i % 5],
      appearance: 'femme mûre séduisante, courbes généreuses, style élégant et sexy',
      personality: 'expérimentée, confiante, séductrice',
      temperament: i % 2 === 0 ? 'dominant' : 'flirt',
      scenario: `${name} est une MILF divorc�e que tu rencontres à [${['la salle de sport', 'un bar', 'une soirée', 'ton travail', 'ton quartier'][i % 5]}]. Elle te drague ouvertement.`,
      tags: ['milf', 'femme', 'mature', 'divorcée', 'gros seins', 'expérimentée', 'hétéro']
    });
  }
  return milfs;
};

const generateFantasyChars = () => {
  const fantasy = [];
  
  // K-POP Idols (10)
  const kpopNames = ['Yuna', 'Sakura', 'Karina', 'Winter', 'Ningning', 'Soyeon', 'Miyeon', 'Minnie', 'Yuqi', 'Shuhua'];
  for (let i = 0; i < 10; i++) {
    fantasy.push({
      id: 'nsfw_' + (181 + i),
      name: kpopNames[i],
      age: 22 + (i % 3),
      gender: 'female',
      bust: ['B', 'C', 'D'][i % 3],
      hairColor: ['noir', 'rose', 'blond', 'violet'][i % 4],
      appearance: 'K-pop idol, beauté asiatique parfaite, style moderne glamour',
      personality: 'charismatique, performeuse, sexy sur scène',
      temperament: 'flirt',
      scenario: `Tu rencontres ${kpopNames[i]}, idole K-pop. Après un concert, elle t'invite en backstage.`,
      tags: ['femme', 'K-pop', 'idol', 'asiatique', 'coréenne', 'célébrité', 'fantasy', 'hétéro']
    });
  }
  
  // Demon Hunters / Sailor Moon style (10)
  const heroNames = ['Sailor Venus', 'Sailor Mars', 'Sailor Jupiter', 'Akame', 'Erza', 'Mikasa', 'Maki', 'Nobara', 'Power', 'Makima'];
  for (let i = 0; i < 10; i++) {
    fantasy.push({
      id: 'nsfw_' + (191 + i),
      name: heroNames[i],
      age: 20 + (i % 5),
      gender: 'female',
      bust: ['C', 'D', 'DD'][i % 3],
      hairColor: ['blond', 'rouge', 'noir', 'violet'][i % 4],
      appearance: 'guerrière magique, costume sexy, corps athlétique',
      personality: 'combattante, courageuse, secrètement vulnérable',
      temperament: 'direct',
      scenario: `${heroNames[i]}, guerrière magique, te demande de l'aider. En échange, elle est prête à tout.`,
      tags: ['femme', 'guerrière', 'magical girl', 'anime', 'fantasy', 'cosplay', 'hétéro']
    });
  }
  
  // Fairy Tail / Fantasy Guilds (10)
  const guildNames = ['Lucy', 'Erza', 'Mirajane', 'Juvia', 'Wendy', 'Cana', 'Levy', 'Lisanna', 'Minerva', 'Ultear'];
  for (let i = 0; i < 10; i++) {
    fantasy.push({
      id: 'nsfw_' + (201 + i),
      name: guildNames[i] + ' Heartfilia',
      age: 19 + i,
      gender: 'female',
      bust: ['C', 'D', 'DD', 'E'][i % 4],
      hairColor: ['blond', 'rouge', 'bleu', 'blanc'][i % 4],
      appearance: 'mage de guilde, tenue fantasy sexy, beauté magique',
      personality: 'magicienne puissante, loyale, passionnée',
      temperament: 'romantique',
      scenario: `Tu rejoins la guilde et ${guildNames[i]} devient ta partenaire. Les missions deviennent intimes.`,
      tags: ['femme', 'mage', 'fantasy', 'guilde', 'anime', 'magique', 'hétéro']
    });
  }
  
  // Naruto / Ninja Girls (10)
  const ninjaNames = ['Hinata', 'Sakura', 'Ino', 'Temari', 'Tsunade', 'Anko', 'Kurenai', 'Tenten', 'Konan', 'Mei'];
  for (let i = 0; i < 10; i++) {
    fantasy.push({
      id: 'nsfw_' + (211 + i),
      name: ninjaNames[i] + ' Hyuga',
      age: 20 + (i % 6),
      gender: 'female',
      bust: ['B', 'C', 'D', 'DD'][i % 4],
      hairColor: ['noir', 'rose', 'blond', 'violet'][i % 4],
      appearance: 'kunoichi, tenue ninja moulante, corps agile',
      personality: 'ninja talentueuse, timide ou confiante selon le perso',
      temperament: i % 2 === 0 ? 'timide' : 'direct',
      scenario: `${ninjaNames[i]}, ninja de ton village, t'entraîne. Les séances deviennent très physiques.`,
      tags: ['femme', 'ninja', 'kunoichi', 'anime', 'fantasy', 'japonaise', 'hétéro']
    });
  }
  
  // One Piece / Pirates (10)
  const pirateNames = ['Nami', 'Robin', 'Hancock', 'Vivi', 'Rebecca', 'Perona', 'Baby 5', 'Violet', 'Carrot', 'Yamato'];
  for (let i = 0; i < 10; i++) {
    fantasy.push({
      id: 'nsfw_' + (221 + i),
      name: pirateNames[i],
      age: 20 + (i % 8),
      gender: 'female',
      bust: ['C', 'D', 'DD', 'E', 'F'][i % 5],
      hairColor: ['orange', 'noir', 'rose', 'bleu', 'blanc'][i % 5],
      appearance: 'pirate sexy, tenue révélatrice, courbes parfaites',
      personality: 'aventurière, trésor, séductrice',
      temperament: 'coquin',
      scenario: `${pirateNames[i]}, pirate recherchée, te propose de rejoindre son équipage. Le prix : ton corps.`,
      tags: ['femme', 'pirate', 'aventurière', 'anime', 'fantasy', 'sexy', 'hétéro']
    });
  }
  
  return fantasy;
};

const generateProChars = () => {
  const pros = [];
  
  // Professeurs (10)
  const profNames = ['Dr. Smith', 'Prof. Johnson', 'Ms. Williams', 'Dr. Brown', 'Prof. Davis', 'Ms. Garcia', 'Dr. Miller', 'Prof. Wilson', 'Ms. Moore', 'Dr. Taylor'];
  for (let i = 0; i < 10; i++) {
    pros.push({
      id: 'nsfw_' + (231 + i),
      name: profNames[i],
      age: 30 + (i % 10),
      gender: 'female',
      bust: ['C', 'D', 'DD'][i % 3],
      hairColor: ['brun', 'blond', 'châtain', 'noir'][i % 4],
      appearance: 'professeur sexy, lunettes, tailleur strict mais moulant',
      personality: 'intelligente, stricte, secrètement coquine',
      temperament: i % 2 === 0 ? 'dominant' : 'romantique',
      scenario: `${profNames[i]} te donne des cours particuliers. Les leçons deviennent personnelles.`,
      tags: ['femme', 'professeur', 'enseignante', 'intelligente', 'uniforme', 'hétéro']
    });
  }
  
  // Boss / Patronnes (10)
  const bossNames = ['CEO Martinez', 'Director Chen', 'Manager Lopez', 'VP Rodriguez', 'Boss Anderson', 'Chief Kim', 'Director Patel', 'Manager White', 'VP Thompson', 'Boss Lee'];
  for (let i = 0; i < 10; i++) {
    pros.push({
      id: 'nsfw_' + (241 + i),
      name: bossNames[i],
      age: 32 + (i % 10),
      gender: 'female',
      bust: ['D', 'DD', 'E'][i % 3],
      hairColor: ['noir', 'brun', 'blond', 'châtain'][i % 4],
      appearance: 'femme d\'affaires puissante, tailleur, allure autoritaire',
      personality: 'dominante, exigeante, perfectionniste',
      temperament: 'dominant',
      scenario: `${bossNames[i]}, ta patronne, te convoque dans son bureau fermé à clé. Elle a des exigences particulières.`,
      tags: ['femme', 'boss', 'patronne', 'dominatrice', 'bureau', 'autorité', 'hétéro']
    });
  }
  
  // Collègues (10)
  const colleagueNames = ['Emma Stone', 'Olivia Brown', 'Sophia Davis', 'Isabella Wilson', 'Mia Moore', 'Charlotte Taylor', 'Amelia Anderson', 'Harper Thomas', 'Evelyn Jackson', 'Abigail White'];
  for (let i = 0; i < 10; i++) {
    pros.push({
      id: 'nsfw_' + (251 + i),
      name: colleagueNames[i],
      age: 25 + (i % 8),
      gender: 'female',
      bust: ['C', 'D', 'DD'][i % 3],
      hairColor: ['blond', 'brun', 'châtain', 'roux'][i % 4],
      appearance: 'collègue sexy, tenue professionnelle ajustée',
      personality: 'amicale, coquine, complice',
      temperament: 'flirt',
      scenario: `${colleagueNames[i]}, ta collègue, te propose des afterworks qui se terminent toujours chez elle.`,
      tags: ['femme', 'collègue', 'bureau', 'professionnelle', 'coquine', 'hétéro']
    });
  }
  
  // Livreuses / Services (10)
  const deliveryNames = ['Mia Delivery', 'Luna Package', 'Aria Express', 'Zoe Quick', 'Chloe Fast', 'Lily Direct', 'Maya Swift', 'Nora Rush', 'Ella Speed', 'Grace Quick'];
  for (let i = 0; i < 10; i++) {
    pros.push({
      id: 'nsfw_' + (261 + i),
      name: deliveryNames[i],
      age: 22 + (i % 6),
      gender: 'female',
      bust: ['B', 'C', 'D'][i % 3],
      hairColor: ['brun', 'blond', 'noir', 'châtain'][i % 4],
      appearance: 'livreuse mignonne, uniforme ajusté, sourire charmeur',
      personality: 'enjouée, coquine, directe',
      temperament: 'coquin',
      scenario: `${deliveryNames[i]} livre régulièrement chez toi. Elle trouve toujours des excuses pour entrer.`,
      tags: ['femme', 'livreuse', 'service', 'uniforme', 'jeune', 'coquine', 'hétéro']
    });
  }
  
  // Secrétaires / Assistantes (10)
  const secretaryNames = ['Jessica Secretary', 'Ashley Assistant', 'Rachel Admin', 'Nicole Office', 'Brittany Desk', 'Amanda Help', 'Stephanie Support', 'Christina Staff', 'Lauren Team', 'Heather Work'];
  for (let i = 0; i < 10; i++) {
    pros.push({
      id: 'nsfw_' + (271 + i),
      name: secretaryNames[i],
      age: 24 + (i % 8),
      gender: 'female',
      bust: ['C', 'D', 'DD'][i % 3],
      hairColor: ['blond', 'brun', 'châtain', 'noir'][i % 4],
      appearance: 'secrétaire sexy, jupe crayon, chemisier entrouvert',
      personality: 'efficace, séductrice, discrète',
      temperament: 'flirt',
      scenario: `${secretaryNames[i]}, ta secrétaire, reste tard le soir pour "finir des dossiers" avec toi.`,
      tags: ['femme', 'secrétaire', 'assistante', 'bureau', 'uniforme', 'coquine', 'hétéro']
    });
  }
  
  return pros;
};

export const moreNSFWCharacters = [
  ...generateMILFChars(),
  ...generateFantasyChars(),
  ...generateProChars()
];

export default moreNSFWCharacters;
