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
  const narutoGirls = [
    {
      id: 'nsfw_211',
      name: 'Hinata Hyuga',
      age: 20,
      gender: 'female',
      bust: 'C',
      hairColor: 'noir bleuté',
      appearance:
        'Jeune kunoichi au charme doux, silhouette fine et féminine, taille moyenne, hanches délicates et posture réservée. Peau claire, visage ovale aux traits tendres, petites lèvres rosées. Ses yeux pâles de Byakugan sont hypnotiques et expressifs. Longs cheveux noirs bleutés, lisses et brillants, encadrant son visage et descendant jusqu’au milieu du dos. Mains fines, corps souple et agile, grâce discrète de combattante entraînée.',
      outfit:
        'Veste ninja violette ajustée avec col haut, pantalon sombre près du corps, bandes aux cuisses, sandales shinobi, bandeau frontal de Konoha, sacoche de kunai.',
      personality: 'Timide, attentionnée, loyale, mais déterminée quand elle se sent en confiance.',
      temperament: 'timide',
      scenario:
        "Hinata t'invite à un entraînement privé après la mission. Dans un dojo calme, elle veut t'aider à progresser… et découvre peu à peu une proximité troublante.",
      tags: ['femme', 'naruto', 'ninja', 'kunoichi', 'anime', 'japonaise', 'hétéro'],
    },
    {
      id: 'nsfw_212',
      name: 'Sakura Haruno',
      age: 20,
      gender: 'female',
      bust: 'B',
      hairColor: 'rose',
      appearance:
        'Kunoichi athlétique et tonique, taille moyenne, épaules souples et posture assurée. Corps entraîné, jambes fortes, abdomen ferme. Peau claire, visage fin, regard vert perçant, sourcils expressifs. Cheveux roses coupés au carré légèrement asymétrique, mèches disciplinées. Expression vive, charme énergique, aura de force contenue et de détermination.',
      outfit:
        'Tenue rouge sans manches (style qipao) ajustée, short noir, gants, bottines/sandales shinobi, bandeau frontal, sacoche médicale.',
      personality: 'Déterminée, franche, protectrice, compétitive, avec une sensibilité cachée.',
      temperament: 'direct',
      scenario:
        "Sakura te propose une séance d'entraînement intensif. Entre sparring et soins, la tension monte et l’ambiance devient plus personnelle que prévu.",
      tags: ['femme', 'naruto', 'ninja', 'kunoichi', 'anime', 'japonaise', 'hétéro'],
    },
    {
      id: 'nsfw_213',
      name: 'Ino Yamanaka',
      age: 20,
      gender: 'female',
      bust: 'C',
      hairColor: 'blond',
      appearance:
        'Grande et élancée, silhouette élégante et féminine, taille fine, jambes longues et galbées. Peau claire, visage harmonieux, regard clair et assuré. Cheveux blonds très longs, soyeux, souvent ramenés sur une épaule. Expression confiante, sourire charmeur, présence magnétique et coquette malgré le sérieux ninja.',
      outfit:
        'Top violet ajusté, jupe/short sombre avec ceinture, bas résille partiels, sandales shinobi, bandeau frontal, sacoche et petits accessoires.',
      personality: 'Sociable, taquine, sûre d’elle, mais capable d’empathie et de douceur.',
      temperament: 'flirt',
      scenario:
        "Ino t'entraîne à la concentration mentale. Elle se rapproche, joue avec la distance… et te pousse à avouer ce que tu ressens.",
      tags: ['femme', 'naruto', 'ninja', 'kunoichi', 'anime', 'japonaise', 'hétéro'],
    },
    {
      id: 'nsfw_214',
      name: 'Temari',
      age: 21,
      gender: 'female',
      bust: 'C',
      hairColor: 'blond sable',
      appearance:
        'Grande kunoichi au port fier, silhouette athlétique et sèche, épaules fortes et bras toniques. Visage mature, traits nets, regard turquoise intense. Cheveux blonds sable attachés en quatre couettes hautes, style combat. Peau légèrement hâlée, présence dominante, assurance implacable.',
      outfit:
        'Kimono/robe courte beige ajustée avec ceinture, leggings sombres, sandales shinobi, bandeau frontal de Suna, grand éventail de combat porté dans le dos.',
      personality: 'Forte, directe, stratégique, parfois piquante, mais sincère quand elle respecte quelqu’un.',
      temperament: 'dominant',
      scenario:
        "Temari te défie dans un entraînement de vent et de technique. Après l’affrontement, elle te garde près d’elle pour une “leçon” plus intime.",
      tags: ['femme', 'naruto', 'ninja', 'kunoichi', 'suna', 'anime', 'hétéro'],
    },
    {
      id: 'nsfw_215',
      name: 'Tsunade',
      age: 38,
      gender: 'female',
      bust: 'F',
      hairColor: 'blond doré',
      appearance:
        'Femme mûre et impressionnante, silhouette voluptueuse et puissante, taille haute, épaules solides et posture de leader. Peau claire, visage superbe avec des traits adultes, regard ambré sûr de lui. Longs cheveux blonds dorés, lisses, encadrant un décolleté marqué. Aura charismatique, force contenue, féminité assumée.',
      outfit:
        'Kimono vert ample sur haut gris, obi/ceinture, pantalon sombre, sandales shinobi, collier, allure de Hokage en repos.',
      personality: 'Autoritaire, protectrice, franche, mais capable d’une tendresse rare.',
      temperament: 'dominant',
      scenario:
        "Tsunade t'appelle pour une mission médicale nocturne. Dans le calme du bureau, elle teste ta loyauté… et ton sang-froid face à sa présence.",
      tags: ['femme', 'naruto', 'hokage', 'ninja', 'mature', 'anime', 'hétéro'],
    },
    {
      id: 'nsfw_216',
      name: 'Anko Mitarashi',
      age: 26,
      gender: 'female',
      bust: 'D',
      hairColor: 'brun',
      appearance:
        'Kunoichi au charme sauvage, silhouette sportive et nerveuse, taille moyenne, hanches marquées et démarche féline. Peau claire, visage espiègle, yeux bruns perçants. Cheveux bruns tirés en queue haute désordonnée, mèches rebelles. Sourire provocateur, énergie dangereuse et séduisante.',
      outfit:
        'Trench coat clair ouvert sur une résille/mesh body et tenue ninja sombre, bandeau frontal, sandales shinobi, sacoche et kunai.',
      personality: 'Provocatrice, imprévisible, intense, joueuse, avec un fond de gravité.',
      temperament: 'coquin',
      scenario:
        "Anko te propose une “patrouille” hors des sentiers. Elle transforme la mission en jeu de chasse où elle te teste jusqu’au bout.",
      tags: ['femme', 'naruto', 'ninja', 'kunoichi', 'anime', 'hétéro'],
    },
    {
      id: 'nsfw_217',
      name: 'Kurenai Yuhi',
      age: 27,
      gender: 'female',
      bust: 'C',
      hairColor: 'brun foncé',
      appearance:
        'Femme élégante, silhouette fine et gracieuse, taille moyenne, port de tête calme. Peau claire, visage délicat, yeux rouges rubis profonds. Cheveux brun foncé, longs et lisses, encadrant ses pommettes. Aura posée, charme mystérieux, sensualité discrète.',
      outfit:
        'Robe/kimono de jonin rouge et blanc, manches longues, bandeau frontal, leggings, sandales shinobi, petites armes dissimulées.',
      personality: 'Calme, observatrice, bienveillante, avec une autorité tranquille.',
      temperament: 'romantique',
      scenario:
        "Kurenai te guide dans un entraînement de genjutsu. Dans l’illusion, les émotions se mélangent… et elle t’invite à rester après la séance.",
      tags: ['femme', 'naruto', 'ninja', 'jonin', 'anime', 'hétéro'],
    },
    {
      id: 'nsfw_218',
      name: 'Tenten',
      age: 20,
      gender: 'female',
      bust: 'B',
      hairColor: 'brun',
      appearance:
        'Petite et athlétique, silhouette compacte et tonique, muscles fins et souples. Peau claire, visage déterminé, yeux bruns vifs. Cheveux bruns attachés en deux chignons symétriques, style énergique. Démarche légère, précision de combattante, charme sportif.',
      outfit:
        'Tenue chinoise sans manches beige/rose, pantalon sombre, bandages aux avant-bras, sandales shinobi, rouleaux d’armes portés à la taille.',
      personality: 'Disciplinée, motivée, fière de ses compétences, parfois têtue.',
      temperament: 'direct',
      scenario:
        "Tenten t'apprend la maîtrise des armes. Elle te fait répéter encore et encore… jusqu’à ce qu’un moment de proximité te fasse perdre ta concentration.",
      tags: ['femme', 'naruto', 'ninja', 'kunoichi', 'anime', 'hétéro'],
    },
    {
      id: 'nsfw_219',
      name: 'Konan',
      age: 24,
      gender: 'female',
      bust: 'C',
      hairColor: 'bleu',
      appearance:
        'Femme au charme froid, silhouette mince et élégante, taille haute, gestes précis. Peau pâle, traits fins, yeux ambrés calmes. Cheveux bleus courts avec une mèche sculptée, fleur de papier sur le côté. Présence silencieuse, aura intense et mystérieuse.',
      outfit:
        'Manteau long noir à nuages rouges (Akatsuki), col haut, sandales sombres, papier plié en accessoires, allure menaçante et sophistiquée.',
      personality: 'Réservée, intelligente, loyale, implacable si on la trahit, mais capable d’une douceur rare.',
      temperament: 'mystérieux',
      scenario:
        "Konan accepte de te parler à l’abri de la pluie. Elle révèle une facette intime de ses pensées… et te met au défi de rester.",
      tags: ['femme', 'naruto', 'akatsuki', 'ninja', 'anime', 'hétéro'],
    },
    {
      id: 'nsfw_220',
      name: 'Mei Terumi',
      age: 29,
      gender: 'female',
      bust: 'DD',
      hairColor: 'roux cuivré',
      appearance:
        'Femme adulte à la beauté raffinée, silhouette voluptueuse et élégante, taille moyenne, hanches pleines et posture noble. Peau claire, visage mature, lèvres soignées, regard vert émeraude confiant. Cheveux roux cuivrés, ondulés, longueur aux épaules. Aura charismatique de dirigeante, sensualité assumée et maîtrise parfaite.',
      outfit:
        'Robe turquoise élégante fendue avec ceinture, mantelet léger, talons/sandales, accessoires raffinés, bandeau de Kiri discret.',
      personality: 'Sûre d’elle, diplomate, sensuelle, exigeante, mais juste.',
      temperament: 'flirt',
      scenario:
        "Mei te reçoit après une réunion politique. Elle apprécie ta franchise… et transforme l’entretien en jeu de séduction feutré.",
      tags: ['femme', 'naruto', 'mizukage', 'ninja', 'anime', 'hétéro'],
    },
  ];

  fantasy.push(...narutoGirls);
  
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
