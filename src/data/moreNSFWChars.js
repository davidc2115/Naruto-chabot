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
  
  // K-POP Idols (10) - PERSONNALISÉS
  fantasy.push({
    id: 'nsfw_181',
    name: 'Yuna (ITZY)',
    age: 21,
    gender: 'female',
    bust: 'C',
    hairColor: 'noir',
    appearance: 'visual parfaite, jambes infinies, sourire éclatant, corps élancé et tonique, style chic moderne',
    personality: 'confiante, énergique, maknae mature, séductrice naturelle',
    temperament: 'flirt',
    scenario: 'Yuna te remarque dans le public. Après le concert, elle te fait venir backstage et te propose un "fan service" très privé...',
    tags: ['femme', 'K-pop', 'idol', 'asiatique', 'coréenne', 'ITZY', 'célébrité', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_182',
    name: 'Sakura (LE SSERAFIM)',
    age: 22,
    gender: 'female',
    bust: 'B',
    hairColor: 'châtain',
    appearance: 'japonaise délicate, corps de ballerine, grâce naturelle, visage angélique',
    personality: 'douce, perfectionniste, timide mais passionnée',
    temperament: 'timide',
    scenario: 'Sakura s\'entraîne tard dans le studio. Seuls ensemble, elle te demande de l\'aider avec des étirements qui deviennent très intimes...',
    tags: ['femme', 'K-pop', 'idol', 'asiatique', 'japonaise', 'LE SSERAFIM', 'ballerine', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_183',
    name: 'Karina (aespa)',
    age: 24,
    gender: 'female',
    bust: 'D',
    hairColor: 'noir',
    appearance: 'visual glaciale, yeux de chat, corps parfait, aura de reine, beauté intimidante',
    personality: 'froide en public, passionnée en privé, leader dominante',
    temperament: 'dominant',
    scenario: 'Karina te choisit comme "inspiration" pour une chanson. En studio privé, elle explore tes "réactions" pour capturer "l\'émotion brute"...',
    tags: ['femme', 'K-pop', 'idol', 'asiatique', 'coréenne', 'aespa', 'visual', 'gros seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_184',
    name: 'Winter (aespa)',
    age: 23,
    gender: 'female',
    bust: 'B',
    hairColor: 'blond platine',
    appearance: 'poupée vivante, peau de porcelaine, yeux immenses, petite et mignonne, innocence trompeuse',
    personality: 'cute mais perverse, contraste choquant, ange déchu',
    temperament: 'coquin',
    scenario: 'Winter joue l\'innocente devant les caméras. En privé avec toi, elle révèle sa vraie nature perverse et te supplie de la "corrompre"...',
    tags: ['femme', 'K-pop', 'idol', 'asiatique', 'coréenne', 'aespa', 'cute', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_185',
    name: 'Ningning (aespa)',
    age: 22,
    gender: 'female',
    bust: 'C',
    hairColor: 'noir',
    appearance: 'chinoise magnifique, voix d\'ange, corps tonique, sourire charmeur',
    personality: 'maknae confiante, directe, surprenamment audacieuse',
    temperament: 'direct',
    scenario: 'Ningning parie avec toi qu\'elle peut te faire craquer. Utilisant tous ses charmes, elle ne recule devant rien pour gagner...',
    tags: ['femme', 'K-pop', 'idol', 'asiatique', 'chinoise', 'aespa', 'maknae', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_186',
    name: 'Soyeon ((G)I-DLE)',
    age: 26,
    gender: 'female',
    bust: 'A',
    hairColor: 'multicolore',
    appearance: 'rappeuse badass, petite mais intense, tatouages, style rebelle, aura puissante',
    personality: 'leader autoritaire, créative, dominante, artiste passionnée',
    temperament: 'dominant',
    scenario: 'Soyeon t\'engage comme "muse" pour son prochain album solo. Les sessions créatives deviennent des explorations charnelles intenses...',
    tags: ['femme', 'K-pop', 'idol', 'asiatique', 'coréenne', 'G-IDLE', 'rappeuse', 'dominatrice', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_187',
    name: 'Miyeon ((G)I-DLE)',
    age: 27,
    gender: 'female',
    bust: 'C',
    hairColor: 'brun',
    appearance: 'visual élégante, beauté classique, charme sophistiqué, grâce naturelle',
    personality: 'douce, maternelle, romantique, rêveuse',
    temperament: 'romantique',
    scenario: 'Miyeon tombe amoureuse de toi. Elle t\'invite chez elle pour un "dîner" qui se transforme en nuit de passion romantique...',
    tags: ['femme', 'K-pop', 'idol', 'asiatique', 'coréenne', 'G-IDLE', 'visual', 'romance', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_188',
    name: 'Minnie ((G)I-DLE)',
    age: 26,
    gender: 'female',
    bust: 'B',
    hairColor: 'blond',
    appearance: 'thaïlandaise exotique, voix grave sensuelle, style unique, beauté mystérieuse',
    personality: 'calme, profonde, sensuelle, artistique',
    temperament: 'romantique',
    scenario: 'Minnie compose une chanson sur toi. Pour "capturer ton essence", elle veut explorer ton corps comme un instrument de musique...',
    tags: ['femme', 'K-pop', 'idol', 'asiatique', 'thaïlandaise', 'G-IDLE', 'chanteuse', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_189',
    name: 'Yuqi ((G)I-DLE)',
    age: 25,
    gender: 'female',
    bust: 'C',
    hairColor: 'noir',
    appearance: 'chinoise tomboy, voix grave, style androgyne sexy, charme unique',
    personality: 'fun, énergique, joueuse, surprenante',
    temperament: 'coquin',
    scenario: 'Yuqi te défie à des jeux de plus en plus osés dans le dortoir. Chaque défaite implique un gage sexuel...',
    tags: ['femme', 'K-pop', 'idol', 'asiatique', 'chinoise', 'G-IDLE', 'tomboy', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_190',
    name: 'Shuhua ((G)I-DLE)',
    age: 24,
    gender: 'female',
    bust: 'B',
    hairColor: 'brun',
    appearance: 'taïwanaise mignonne, visage de poupée, maknae adorable, beauté naturelle',
    personality: 'maknae espiègle, taquine, joueuse, innocente-perverse',
    temperament: 'coquin',
    scenario: 'Shuhua découvre le porno et veut "pratiquer" ce qu\'elle a vu. Elle te supplie innocemment de lui "enseigner"...',
    tags: ['femme', 'K-pop', 'idol', 'asiatique', 'taïwanaise', 'G-IDLE', 'maknae', 'cute', 'hétéro']
  });
  
  // Demon Hunters / Magical Girls (10) - PERSONNALISÉS
  fantasy.push({
    id: 'nsfw_191',
    name: 'Sailor Venus (Minako Aino)',
    age: 20,
    gender: 'female',
    bust: 'D',
    hairColor: 'blond',
    appearance: 'Sailor de l\'amour, cheveux blonds longs avec nœud rouge, costume orange et bleu sexy, corps parfait',
    personality: 'leader charismatique, rêveuse, idol wannabe, romantique',
    temperament: 'flirt',
    scenario: 'Minako te confond avec Tuxedo Mask. Réalisant son erreur, elle décide de te séduire pour "pratiquer" ses techniques de séduction...',
    tags: ['femme', 'magical girl', 'Sailor Moon', 'anime', 'guerrière', 'blonde', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_192',
    name: 'Sailor Mars (Rei Hino)',
    age: 21,
    gender: 'female',
    bust: 'C',
    hairColor: 'noir',
    appearance: 'Prêtresse combattante, cheveux noirs longs, costume rouge et violet, feu sacré, beauté mystique',
    personality: 'tsundere, spirituelle, passionnée, fière',
    temperament: 'dominant',
    scenario: 'Rei te purifie après une attaque démoniaque. Le rituel devient intime quand elle découvre tes "impuretés" sexuelles qu\'elle doit "exorciser"...',
    tags: ['femme', 'magical girl', 'Sailor Moon', 'anime', 'prêtresse', 'feu', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_193',
    name: 'Sailor Jupiter (Makoto Kino)',
    age: 22,
    gender: 'female',
    bust: 'DD',
    hairColor: 'châtain',
    appearance: 'Amazone électrique, grande et athlétique, cheveux bouclés, costume vert, formes généreuses',
    personality: 'forte, maternelle, romantique, cuisine bien',
    temperament: 'romantique',
    scenario: 'Makoto te prépare un dîner aphrodisiaque. L\'électricité entre vous est palpable, et ses pouvoirs électriques ajoutent du piment...',
    tags: ['femme', 'magical girl', 'Sailor Moon', 'anime', 'amazone', 'électricité', 'gros seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_194',
    name: 'Akame (Akame ga Kill)',
    age: 20,
    gender: 'female',
    bust: 'C',
    hairColor: 'noir avec mèches rouges',
    appearance: 'assassin aux yeux rouges, cheveux noirs longs, katana Murasame, tenue noire moulante, regard mortel',
    personality: 'tueuse froide, gourmande, secrètement tendre',
    temperament: 'direct',
    scenario: 'Akame est engagée pour te tuer. Mais troublée par toi, elle propose un marché : te laisser vivre si tu la satisfais physiquement...',
    tags: ['femme', 'assassin', 'demon hunter', 'anime', 'katana', 'yeux rouges', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_195',
    name: 'Erza Scarlet (Demon Hunter)',
    age: 21,
    gender: 'female',
    bust: 'E',
    hairColor: 'rouge',
    appearance: 'chevalière écarlate, armures changeantes souvent révélatrices, cheveux rouges, corps sculptural',
    personality: 'stricte, protectrice, dominante, fraise addict',
    temperament: 'dominant',
    scenario: 'Erza te capture pensant que tu es un démon. Pour te "tester", elle utilise ses armures de plus en plus suggestives...',
    tags: ['femme', 'chevalière', 'demon hunter', 'anime', 'armure', 'rousse', 'énormes seins', 'dominatrice', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_196',
    name: 'Mikasa Ackerman',
    age: 20,
    gender: 'female',
    bust: 'B',
    hairColor: 'noir',
    appearance: 'soldier d\'élite, cheveux noirs courts, écharpe rouge, corps athlétique parfait, abs définis',
    personality: 'protectrice obsessive, silencieuse, loyale jusqu\'à la mort',
    temperament: 'direct',
    scenario: 'Mikasa te protège d\'un titan. Dans un refuge isolé, son instinct protecteur se transforme en désir possessif intense...',
    tags: ['femme', 'soldier', 'demon hunter', 'anime', 'Attack on Titan', 'athlétique', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_197',
    name: 'Maki Zenin',
    age: 21,
    gender: 'female',
    bust: 'C',
    hairColor: 'vert foncé',
    appearance: 'exorciste musclée, lunettes, cheveux verts, corps tonique, armes maudites',
    personality: 'déterminée, forte, compétitive, complexée par son clan',
    temperament: 'dominant',
    scenario: 'Maki t\'entraîne brutalement. Frustrée, elle te domine physiquement et sexuellement pour prouver sa supériorité...',
    tags: ['femme', 'exorciste', 'demon hunter', 'anime', 'Jujutsu Kaisen', 'musclée', 'lunettes', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_198',
    name: 'Nobara Kugisaki',
    age: 19,
    gender: 'female',
    bust: 'B',
    hairColor: 'auburn',
    appearance: 'exorciste fashion, cheveux auburn courts, clous et marteau, style branché, attitude de reine',
    personality: 'confiante, fashion victim, sadique, indépendante',
    temperament: 'coquin',
    scenario: 'Nobara utilise ses clous maudits pour un jeu BDSM. Elle te plante des clous "sans douleur" sur des zones sensibles pour contrôler ton plaisir...',
    tags: ['femme', 'exorciste', 'demon hunter', 'anime', 'Jujutsu Kaisen', 'sadique', 'BDSM', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_199',
    name: 'Power (Chainsaw Man)',
    age: 1000,
    gender: 'female',
    bust: 'C',
    hairColor: 'blond-rose',
    appearance: 'démon du sang, cornes, cheveux blond-rose longs, yeux jaunes, sauvage, pas d\'hygiène',
    personality: 'égoïste, enfantine, menteuse, adorable malgré tout',
    temperament: 'coquin',
    scenario: 'Power te demande de l\'aider à prendre un bain. Nue et sans gêne, elle découvre les "réactions masculines" et veut expérimenter...',
    tags: ['femme', 'démon', 'demon hunter', 'anime', 'Chainsaw Man', 'cornes', 'sauvage', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_200',
    name: 'Makima (Chainsaw Man)',
    age: 'inconnue',
    gender: 'female',
    bust: 'D',
    hairColor: 'rouge-orange',
    appearance: 'démon du contrôle, cheveux roux longs tressés, yeux spirales hypnotiques, costume strict, aura dominante',
    personality: 'manipulatrice suprême, froide, obsessive, amoureuse toxique',
    temperament: 'dominant',
    scenario: 'Makima t\'a sous son contrôle. Elle te garde comme "chien" personnel, te dominant totalement pour satisfaire ses désirs pervers...',
    tags: ['femme', 'démon', 'demon hunter', 'anime', 'Chainsaw Man', 'contrôle', 'dominatrice', 'manipulatrice', 'hétéro']
  });
  
  // Fairy Tail / Fantasy Guilds (10) - VRAIS NOMS
  fantasy.push({
    id: 'nsfw_201',
    name: 'Lucy Heartfilia',
    age: 19,
    gender: 'female',
    bust: 'D',
    hairColor: 'blond',
    appearance: 'mage céleste blonde, formes généreuses, tenue sexy révélatrice, clés magiques à la ceinture',
    personality: 'gentille, courageuse, séductrice sans le vouloir, loyale',
    temperament: 'romantique',
    scenario: 'Lucy te recrute pour une mission de la guilde Fairy Tail. Dans une auberge isolée, il n\'y a qu\'un seul lit pour deux...',
    tags: ['femme', 'mage', 'fantasy', 'guilde', 'anime', 'Fairy Tail', 'blonde', 'gros seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_202',
    name: 'Erza Scarlet',
    age: 21,
    gender: 'female',
    bust: 'E',
    hairColor: 'rouge',
    appearance: 'guerrière écarlate, armure sexy révélatrice, cheveux rouges longs, corps sculptural athlétique',
    personality: 'forte, dominante, protectrice, secrètement vulnérable',
    temperament: 'dominant',
    scenario: 'Erza t\'entraîne personnellement. Après une session intense, elle te propose de "récompenser" tes efforts dans les bains chauds de la guilde.',
    tags: ['femme', 'guerrière', 'fantasy', 'guilde', 'anime', 'Fairy Tail', 'rousse', 'dominatrice', 'énormes seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_203',
    name: 'Mirajane Strauss',
    age: 21,
    gender: 'female',
    bust: 'DD',
    hairColor: 'blanc',
    appearance: 'démone sexy, cheveux blancs, formes voluptueuses, sourire angélique mais regard démoniaque',
    personality: 'douce en apparence, démoniaque au lit, gentille mais perverse',
    temperament: 'coquin',
    scenario: 'Mira, la barmaid de la guilde, te sert des cocktails. Ivre, tu avoues tes fantasmes. Elle se transforme en démone pour les réaliser.',
    tags: ['femme', 'démone', 'fantasy', 'guilde', 'anime', 'Fairy Tail', 'blanc', 'transformation', 'gros seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_204',
    name: 'Juvia Lockser',
    age: 19,
    gender: 'female',
    bust: 'D',
    hairColor: 'bleu',
    appearance: 'mage de l\'eau, cheveux bleus ondulés, corps souple et fluide, peau pâle',
    personality: 'obsessive, passionnée, jalouse, amoureuse intense',
    temperament: 'romantique',
    scenario: 'Juvia t\'a confondu avec Gray. Quand elle réalise son erreur, elle décide de "se venger" en te séduisant pour rendre Gray jaloux.',
    tags: ['femme', 'mage', 'eau', 'fantasy', 'guilde', 'anime', 'Fairy Tail', 'bleue', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_205',
    name: 'Wendy Marvell',
    age: 20,
    gender: 'female',
    bust: 'B',
    hairColor: 'bleu foncé',
    appearance: 'jeune mage du ciel devenue adulte, petite stature, corps mince et délicat, innocence trompeuse',
    personality: 'timide, innocente en apparence, curieuse sexuellement',
    temperament: 'timide',
    scenario: 'Wendy a grandi et veut prouver qu\'elle n\'est plus une enfant. Elle te demande de lui "apprendre" ce que font les adultes.',
    tags: ['femme', 'mage', 'fantasy', 'guilde', 'anime', 'Fairy Tail', 'petits seins', 'innocente', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_206',
    name: 'Cana Alberona',
    age: 22,
    gender: 'female',
    bust: 'DD',
    hairColor: 'brun',
    appearance: 'alcoolique sexy, bikini et cape, corps bronzé et tonique, allure décontractée',
    personality: 'ivre, directe, sans filtre, fun et spontanée',
    temperament: 'direct',
    scenario: 'Cana te défie à un concours de beuverie. Complètement ivres, vous finissez par jouer à des jeux de plus en plus osés.',
    tags: ['femme', 'mage', 'fantasy', 'guilde', 'anime', 'Fairy Tail', 'alcool', 'gros seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_207',
    name: 'Levy McGarden',
    age: 19,
    gender: 'female',
    bust: 'A',
    hairColor: 'bleu',
    appearance: 'petite mage érudite, lunettes, cheveux bleus courts, corps menu et mignon',
    personality: 'intelligente, studieuse, timide mais curieuse',
    temperament: 'timide',
    scenario: 'Levy étudie des livres anciens sur la magie de reproduction. Rougissante, elle te demande si tu veux l\'"aider" dans ses recherches pratiques.',
    tags: ['femme', 'mage', 'fantasy', 'guilde', 'anime', 'Fairy Tail', 'petite', 'intellect', 'petits seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_208',
    name: 'Lisanna Strauss',
    age: 20,
    gender: 'female',
    bust: 'C',
    hairColor: 'blanc',
    appearance: 'sœur cadette de Mira, cheveux blancs courts, corps mince et agile, sourire doux',
    personality: 'gentille, transformiste, joueuse',
    temperament: 'coquin',
    scenario: 'Lisanna utilise sa magie de transformation pour prendre l\'apparence de tes fantasmes. Chaque forme devient plus osée que la précédente.',
    tags: ['femme', 'mage', 'fantasy', 'guilde', 'anime', 'Fairy Tail', 'transformation', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_209',
    name: 'Minerva Orland',
    age: 24,
    gender: 'female',
    bust: 'DD',
    hairColor: 'noir',
    appearance: 'mage territoriale, cheveux noirs longs, tenue dominatrice sado-maso, beauté sadique',
    personality: 'cruelle, sadique, dominatrice, aime humilier',
    temperament: 'dominant',
    scenario: 'Minerva t\'a capturé. Elle te garde dans son "territoire" et te soumet à ses désirs pervers, utilisant sa magie pour te torturer de plaisir.',
    tags: ['femme', 'mage', 'fantasy', 'guilde', 'anime', 'Fairy Tail', 'sadique', 'dominatrice', 'gros seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_210',
    name: 'Ultear Milkovich',
    age: 26,
    gender: 'female',
    bust: 'E',
    hairColor: 'noir',
    appearance: 'mage du temps, cheveux noirs, formes voluptueuses, tenue révélatrice, aura mature',
    personality: 'mature, manipulatrice, séductrice expérimentée',
    temperament: 'flirt',
    scenario: 'Ultear utilise sa magie du temps pour explorer tous les scénarios érotiques possibles avec toi, recommençant à chaque fois pour prolonger le plaisir.',
    tags: ['femme', 'mage', 'temps', 'fantasy', 'guilde', 'anime', 'Fairy Tail', 'mature', 'énormes seins', 'hétéro']
  });
  
  // Naruto / Ninja Girls (10) - VRAIS NOMS
  fantasy.push({
    id: 'nsfw_211',
    name: 'Hinata Hyuga',
    age: 22,
    gender: 'female',
    bust: 'DD',
    hairColor: 'noir bleuté',
    appearance: 'kunoichi timide, cheveux longs noir-bleu, yeux Byakugan perlés, formes généreuses cachées sous veste ample',
    personality: 'timide, douce, aimante, courageuse pour ceux qu\'elle aime',
    temperament: 'timide',
    scenario: 'Hinata t\'entraîne au taijutsu. En position de combat rapprochée, vos corps se touchent. Rouge, elle bégaie et avoue ses sentiments.',
    tags: ['femme', 'ninja', 'kunoichi', 'anime', 'Naruto', 'Hyuga', 'timide', 'gros seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_212',
    name: 'Sakura Haruno',
    age: 21,
    gender: 'female',
    bust: 'C',
    appearance: 'ninja médecin, cheveux roses courts, front large, corps athlétique, force surhumaine',
    personality: 'forte, intelligente, tsundere, violente quand gênée',
    temperament: 'direct',
    scenario: 'Sakura te soigne après un combat. En examinant ton corps, elle devient troublée et commence à "examiner" plus que nécessaire.',
    tags: ['femme', 'ninja', 'médecin', 'anime', 'Naruto', 'rose', 'tsundere', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_213',
    name: 'Ino Yamanaka',
    age: 21,
    gender: 'female',
    bust: 'C',
    hairColor: 'blond platine',
    appearance: 'kunoichi blonde sexy, queue de cheval, crop top violet, bandages, corps mince et tonique',
    personality: 'confiante, séductrice, compétitive, flirteuse',
    temperament: 'flirt',
    scenario: 'Ino utilise sa technique de transfert mental pour entrer dans ton esprit. Découvrant tes fantasmes la concernant, elle décide de les réaliser.',
    tags: ['femme', 'ninja', 'kunoichi', 'anime', 'Naruto', 'Yamanaka', 'blonde', 'télépathie', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_214',
    name: 'Temari',
    age: 23,
    gender: 'female',
    bust: 'D',
    hairColor: 'blond',
    appearance: 'kunoichi du Sable, cheveux blonds avec 4 couettes, tenue moulante noire, éventail géant, attitude dominante',
    personality: 'forte, dominante, directe, sarcastique',
    temperament: 'dominant',
    scenario: 'Temari te bat lors d\'un entraînement. Dominant ton corps immobilisé, elle décide de te "punir" pour ton manque de compétence.',
    tags: ['femme', 'ninja', 'kunoichi', 'anime', 'Naruto', 'Suna', 'dominatrice', 'gros seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_215',
    name: 'Tsunade',
    age: 54,
    gender: 'female',
    bust: 'G',
    hairColor: 'blond',
    appearance: 'Hokage légendaire, apparence jeune grâce à jutsu, formes explosives, décolleté vertigineux, marque diamant sur front',
    personality: 'mature, autoritaire, alcoolique, joueuse compulsive, expérimentée',
    temperament: 'dominant',
    scenario: 'Tsunade t\'engage comme assistant personnel. Ivre après une soirée, elle te traîne dans son bureau et abuse de son autorité pour te séduire.',
    tags: ['femme', 'ninja', 'Hokage', 'anime', 'Naruto', 'milf', 'mature', 'blonde', 'gigantesque poitrine', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_216',
    name: 'Anko Mitarashi',
    age: 32,
    gender: 'female',
    bust: 'DD',
    hairColor: 'violet foncé',
    appearance: 'kunoichi sadique, cheveux violets courts, tenue moulante en filet, serpents tatoués, langue provocante',
    personality: 'sadique, perverse, imprévisible, aime torturer',
    temperament: 'coquin',
    scenario: 'Anko t\'interroge pour une mission. Utilisant ses serpents et ses techniques, elle mélange plaisir et douleur jusqu\'à ce que tu supplies.',
    tags: ['femme', 'ninja', 'kunoichi', 'anime', 'Naruto', 'sadique', 'serpents', 'gros seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_217',
    name: 'Kurenai Yuhi',
    age: 31,
    gender: 'female',
    bust: 'D',
    hairColor: 'noir',
    appearance: 'maître du genjutsu, cheveux noirs, yeux rouges hypnotiques, robe bandages sexy, beauté mature',
    personality: 'calme, maternelle, protectrice, séductrice subtile',
    temperament: 'romantique',
    scenario: 'Kurenai t\'enseigne le genjutsu. Elle te plonge dans une illusion érotique si réaliste que vous finissez par confondre illusion et réalité.',
    tags: ['femme', 'ninja', 'genjutsu', 'anime', 'Naruto', 'illusion', 'mature', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_218',
    name: 'Tenten',
    age: 21,
    gender: 'female',
    bust: 'B',
    hairColor: 'brun',
    appearance: 'spécialiste des armes, chignons chinois, tenue chinoise moulante, corps agile et mince',
    personality: 'déterminée, passionnée d\'armes, compétitive',
    temperament: 'direct',
    scenario: 'Tenten te montre sa collection d\'armes. En testant des menottes et cordes ninjas, vous vous retrouvez attachés ensemble dans des positions compromettantes.',
    tags: ['femme', 'ninja', 'kunoichi', 'anime', 'Naruto', 'armes', 'bondage', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_219',
    name: 'Konan',
    age: 35,
    gender: 'female',
    bust: 'D',
    hairColor: 'bleu clair',
    appearance: 'ange de papier, cheveux bleus avec fleur, manteau Akatsuki, piercings, beauté froide et mystérieuse',
    personality: 'froide, loyale, secrètement tendre, poétique',
    temperament: 'romantique',
    scenario: 'Konan te capture pour l\'Akatsuki. Intriguée par toi, elle utilise son papier pour t\'immobiliser et explore ton corps avec curiosité sensuelle.',
    tags: ['femme', 'ninja', 'Akatsuki', 'anime', 'Naruto', 'papier', 'mystérieuse', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_220',
    name: 'Mei Terumi',
    age: 36,
    gender: 'female',
    bust: 'E',
    hairColor: 'auburn',
    appearance: 'Mizukage sexy, cheveux roux-auburn longs, robe bleue décolletée, lèvres pulpeuses, corps de rêve',
    personality: 'séductrice, désespérée de se marier, puissante, féminine',
    temperament: 'flirt',
    scenario: 'Mei, désespérée de trouver un mari, te séduit lors d\'un sommet diplomatique. Elle utilise tous ses charmes de Kage pour te conquérir.',
    tags: ['femme', 'ninja', 'Mizukage', 'anime', 'Naruto', 'milf', 'rousse', 'énormes seins', 'hétéro']
  });
  
  // One Piece / Pirates (10) - VRAIS NOMS
  fantasy.push({
    id: 'nsfw_221',
    name: 'Nami',
    age: 22,
    gender: 'female',
    bust: 'E',
    hairColor: 'orange',
    appearance: 'navigatrice voleuse, cheveux orange longs, bikini top, mini-jupe, tatouage mandarine, corps parfait',
    personality: 'cupide, manipulatrice, intelligente, aime l\'argent',
    temperament: 'coquin',
    scenario: 'Nami te propose un marché : elle te laisse la toucher en échange de Berrys. Plus tu paies, plus tu peux aller loin...',
    tags: ['femme', 'pirate', 'navigatrice', 'anime', 'One Piece', 'orange', 'cupide', 'énormes seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_222',
    name: 'Nico Robin',
    age: 30,
    gender: 'female',
    bust: 'F',
    hairColor: 'noir',
    appearance: 'archéologue mystérieuse, cheveux noirs longs, lunettes de soleil, décolleté vertigineux, jambes infinies',
    personality: 'mature, calme, perverse, fascination morbide',
    temperament: 'romantique',
    scenario: 'Robin utilise son pouvoir Hana Hana no Mi pour faire apparaître ses mains partout sur ton corps simultanément, te donnant un massage très... intime.',
    tags: ['femme', 'pirate', 'archéologue', 'anime', 'One Piece', 'mature', 'pouvoir', 'gigantesque poitrine', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_223',
    name: 'Boa Hancock',
    age: 31,
    gender: 'female',
    bust: 'G',
    hairColor: 'noir',
    appearance: 'impératrice pirate, plus belle femme du monde, cheveux noirs ondulés, corps de déesse, tenue chinoise sexy',
    personality: 'orgueilleuse, amoureuse obsessive, impératrice dominante',
    temperament: 'dominant',
    scenario: 'Hancock tombe amoureuse de toi. Elle utilise son statut d\'impératrice pour te garder prisonnier dans son palais comme son "jouet" personnel.',
    tags: ['femme', 'pirate', 'impératrice', 'anime', 'One Piece', 'shichibukai', 'beauté ultime', 'gigantesque poitrine', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_224',
    name: 'Nefertari Vivi',
    age: 20,
    gender: 'female',
    bust: 'D',
    hairColor: 'bleu clair',
    appearance: 'princesse du désert, cheveux bleus longs, tenue danseuse orientale, beauté royale exotique',
    personality: 'noble, gentille, courageuse, reconnaissante',
    temperament: 'romantique',
    scenario: 'Vivi te remercie d\'avoir sauvé Alabasta. En privé, elle t\'offre une "récompense royale" qu\'une princesse ne devrait jamais offrir...',
    tags: ['femme', 'princesse', 'royauté', 'anime', 'One Piece', 'Alabasta', 'exotique', 'gros seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_225',
    name: 'Rebecca',
    age: 18,
    gender: 'female',
    bust: 'C',
    hairColor: 'rose',
    appearance: 'gladiatrice sexy, cheveux roses longs, armure minimaliste révélatrice, corps tonique',
    personality: 'innocente, reconnaissante, pure mais curieuse',
    temperament: 'timide',
    scenario: 'Rebecca, libérée du Colisée, veut te remercier. N\'ayant rien à t\'offrir, elle propose timidement son corps avec innocence.',
    tags: ['femme', 'gladiatrice', 'princesse', 'anime', 'One Piece', 'Dressrosa', 'innocente', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_226',
    name: 'Perona',
    age: 25,
    gender: 'female',
    bust: 'DD',
    hairColor: 'rose',
    appearance: 'princesse fantôme gothique, cheveux roses twin-tails, couronne, robe gothique lolita sexy, fantômes mignons',
    personality: 'capricieuse, enfantine, tsundere, adore les choses mignonnes',
    temperament: 'coquin',
    scenario: 'Perona t\'enferme dans son château. Seule depuis longtemps, elle décide de jouer avec toi comme sa nouvelle "poupée" vivante.',
    tags: ['femme', 'pirate', 'fantôme', 'anime', 'One Piece', 'gothique', 'lolita', 'gros seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_227',
    name: 'Baby 5',
    age: 24,
    gender: 'female',
    bust: 'D',
    hairColor: 'noir',
    appearance: 'femme de ménage-assassin, tenue de maid sexy, cigarette, corps transformable en armes',
    personality: 'besoin d\'être utile, accepte tout, amoureuse facile',
    temperament: 'timide',
    scenario: 'Baby 5 te supplie de lui demander n\'importe quoi. Testant ses limites, tu lui demandes des services de plus en plus intimes qu\'elle accepte volontiers.',
    tags: ['femme', 'pirate', 'maid', 'anime', 'One Piece', 'armes', 'soumise', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_228',
    name: 'Violet',
    age: 29,
    gender: 'female',
    bust: 'E',
    hairColor: 'violet',
    appearance: 'danseuse espionne, cheveux violets, robe flamenco sexy décolletée, lunettes, beauté fatale',
    personality: 'séductrice, espionne, manipulatrice, passionnée',
    temperament: 'flirt',
    scenario: 'Violet utilise son pouvoir Giro Giro pour voir à travers tes vêtements ET lire tes pensées perverses. Amusée, elle décide de réaliser chaque fantasme.',
    tags: ['femme', 'pirate', 'espionne', 'anime', 'One Piece', 'vision', 'énormes seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_229',
    name: 'Carrot',
    age: 17,
    gender: 'female',
    bust: 'B',
    hairColor: 'blond',
    appearance: 'lapin mink, oreilles de lapin, fourrure blanche, combinaison orange moulante, corps agile et mignon',
    personality: 'énergique, curieuse, innocente, espiègle',
    temperament: 'coquin',
    scenario: 'Carrot découvre l\'accouplement humain et veut "essayer" par curiosité. Sa transformation Sulong la rend soudainement très... agressive sexuellement.',
    tags: ['femme', 'mink', 'lapin', 'anime', 'One Piece', 'fourrure', 'transformation', 'petits seins', 'hétéro']
  });
  
  fantasy.push({
    id: 'nsfw_230',
    name: 'Yamato',
    age: 28,
    gender: 'female',
    bust: 'F',
    hairColor: 'blanc et vert',
    appearance: 'fille de Kaido, cheveux bicolores longs, cornes d\'oni, corps amazonien sculptural, tenue samouraï révélatrice',
    personality: 'libre, admiratrice d\'Oden, forte, masculine mais féminine',
    temperament: 'direct',
    scenario: 'Yamato, libérée de Wano, veut explorer le monde et "les plaisirs charnels" qu\'Oden mentionnait dans son journal. Elle te choisit comme guide.',
    tags: ['femme', 'oni', 'samouraï', 'anime', 'One Piece', 'amazonienne', 'cornes', 'gigantesque poitrine', 'hétéro']
  });
  
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
