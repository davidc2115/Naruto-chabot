// Template pour les descriptions physiques détaillées des personnages
// Conçu pour une génération d'images unique mais cohérente avec l'apparence du personnage

/**
 * Template de description physique complète
 * Inclut tous les attributs nécessaires pour une génération d'images précise et variée
 */
const physicalDescriptionTemplate = {
  // === IDENTITÉ DE BASE ===
  id: 'character_id',
  name: 'Character Name',
  age: 25,
  gender: 'female', // 'female' ou 'male'
  
  // === DESCRIPTION PHYSIQUE DÉTAILLÉE ===
  // Taille (en cm)
  height: '170 cm',
  // Poids (en kg) - important pour la morphologie
  weight: '65 kg',
  // Mensurations (tour de poitrine, tour de taille, tour de hanches en cm)
  measurements: '95-65-100 cm',
  
  // === CHEVEUX ===
  hairColor: 'brun chocolat',
  hairLength: 'longs jusqu'aux épaules',
  hairTexture: 'ondulés naturels',
  hairStyle: 'décoiffé avec mèches rebelles',
  hairVolume: 'volume moyen',
  hairHighlights: 'reflets cuivrés au soleil',
  
  // === YEUX ===
  eyeColor: 'noisette avec reflets verts',
  eyeShape: 'amandes légèrement bridés',
  eyeSize: 'grands yeux expressifs',
  eyelashes: 'cils longs et fournis',
  eyebrows: 'sourcils épais et naturels',
  
  // === VISAGE ===
  faceShape: 'ovale élégant',
  skinTone: 'matte olive',
  skinTexture: 'peau lisse avec légères taches de rousseur',
  complexion: 'teint lumineux naturel',
  cheekbones: 'pommettes hautes définies',
  jawline: 'mâchoire délicate mais définie',
  chin: 'menton doux et arrondi',
  nose: 'nez fin et droit',
  lips: 'lèvres pulpeuses naturellement rosées',
  lipsShape: 'forme de cœur bien définie',
  freckles: 'légères taches de rousseur sur les joues',
  
  // === CORPS ===
  bodyType: 'sablier voluptueux',
  bodyComposition: 'corps souple et féminin',
  shoulderWidth: 'épaules moyennes',
  torsoLength: 'torse proportionné',
  waistSize: 'taille fine et cintrée',
  waistDefinition: 'taille bien définie',
  
  // === POITRINE (FEMME) ===
  bustSize: 'D cup',
  bustShape: 'poitrine pleine et naturelle',
  bustFirmness: 'ferme et souple',
  bustSpacing: 'espacement naturel',
  nippleSize: 'aréoles moyennes',
  nippleColor: 'rosé clair',
  
  // === FESSIER (FEMME) ===
  buttSize: 'gros fessier rebondi',
  buttShape: 'forme de cœur rebondie',
  buttFirmness: 'ferme et pulpeux',
  buttProjection: 'projection arrière marquée',
  
  // === HANCHES (FEMME) ===
  hipWidth: 'hanches larges et féminines',
  hipShape: 'hanches arrondies',
  thighSize: 'cuisses épaisses et douces',
  thighShape: 'cuisses en forme de poire',
  legLength: 'jambes longues et élancées',
  legShape: 'jambes avec légère courbe',
  
  // === BRAS (FEMME) ===
  armSize: 'bras fins et délicats',
  armTone: 'bras légèrement toniques',
  handSize: 'mains petites et délicates',
  fingerLength: 'doigts longs et fins',
  
  // === MUSCULATURE ===
  muscleDefinition: 'définition musculaire légère',
  muscleTone: 'tonus naturel sans excès',
  flexibility: 'corps souple et flexible',
  
  // === STYLE ET APPARENCE ===
  overallAppearance: 'femme voluptueuse avec des courbes naturelles et généreuses',
  bodyLanguage: 'démarche gracieuse et confiante',
  posture: 'posture droite et élégante',
  grooming: 'soin personnel impeccable',
  
  // === VARIATIONS POUR GÉNÉRATION D'IMAGES ===
  // Ces variations permettent de générer des images uniques tout en gardant
  // la cohérence avec l'apparence du personnage
  
  // Variations de pose
  poseVariations: [
    'debout avec confiance',
    'assis élégamment',
    'couché de manière séduisante',
    'penché en avant',
    'de profil',
    'de dos',
    'vue de trois quarts'
  ],
  
  // Variations d'expression
  expressionVariations: [
    'sourire doux',
    'regard intense',
    'expression mystérieuse',
    'sourire en coin',
    'regard baissé',
    'expression sérieuse'
  ],
  
  // Variations d'éclairage
  lightingVariations: [
    'lumière douce naturelle',
    'lumière dorée au coucher du soleil',
    'lumière de studio douce',
    'lumière dramatique latérale',
    'lumière tamisée romantique'
  ],
  
  // Variations d'arrière-plan
  backgroundVariations: [
    'intérieur moderne',
    'extérieur naturel',
    'studio minimaliste',
    'environnement urbain',
    'cadre romantique'
  ],
  
  // === PROMPT DE GÉNÉRATION D'IMAGE ===
  // Ce prompt est utilisé pour générer des images cohérentes avec l'apparence
  imageGenerationPrompt: function(variation = null) {
    const basePrompt = `${this.age} years old ${this.gender}, ${this.height}, ${this.weight}, ${this.measurements}, ${this.hairColor} ${this.hairLength} ${this.hairTexture} hair, ${this.eyeColor} ${this.eyeShape} eyes, ${this.skinTone} skin, ${this.faceShape} face, ${this.bodyType} body, ${this.bustSize} bust, ${this.buttSize} butt, ${this.hipWidth} hips, ${this.thighSize} thighs, ${this.overallAppearance}`;
    
    if (variation) {
      return `${basePrompt}, ${variation}, highly detailed, photorealistic, 8k, masterpiece`;
    }
    
    return `${basePrompt}, highly detailed, photorealistic, 8k, masterpiece`;
  },
  
  // === DESCRIPTION PHYSIQUE COMPLÈTE ===
  // Description textuelle complète pour le système de rôleplay
  fullPhysicalDescription: function() {
    return `${this.age} ans, ${this.height}, ${this.weight}, ${this.measurements}. ${this.hairColor} cheveux ${this.hairLength} ${this.hairTexture} ${this.hairStyle}. ${this.eyeColor} yeux ${this.eyeShape} ${this.eyeSize}. ${this.skinTone} peau ${this.skinTexture}. ${this.faceShape} visage avec ${this.cheekbones} et ${this.jawline}. ${this.bodyType} corps avec ${this.bustSize} poitrine ${this.bustShape}, ${this.waistSize} taille, ${this.hipWidth} hanches, ${this.buttSize} fessier ${this.buttShape}, ${this.thighSize} cuisses. ${this.overallAppearance}.`;
  }
};

export default physicalDescriptionTemplate;
