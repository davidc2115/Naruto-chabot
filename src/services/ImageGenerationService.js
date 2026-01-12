import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomImageAPIService from './CustomImageAPIService';
import StableDiffusionLocalService from './StableDiffusionLocalService';
import AuthService from './AuthService';

class ImageGenerationService {
  constructor() {
    // URL Freebox par défaut
    this.freeboxURL = 'http://88.174.155.230:33437/generate';
    this.lastRequestTime = 0;
    this.minDelay = 1000;
    this.maxRetries = 3;
    
    // STYLES SÉPARÉS - Anime vs Réaliste
    this.animeStyles = [
      'anime style, anime art, manga illustration, clean lineart, vibrant colors',
      'anime artwork, japanese animation style, cel shading, detailed anime',
      'manga style illustration, anime character design, 2D anime art',
      'high quality anime, beautiful anime art, studio ghibli style',
    ];
    
    this.realisticStyles = [
      'photorealistic portrait photography, professional DSLR photo, 85mm lens',
      'hyper-realistic photograph, studio lighting, high-end fashion photography',
      'ultra-realistic photo, natural lighting, professional portrait',
      'cinematic photography, movie still quality, professional photoshoot',
    ];
    
    // PROMPTS DE QUALITÉ ANATOMIQUE RENFORCÉS
    this.anatomyQualityPrompts = [
      'perfect human anatomy, medically correct body proportions, anatomically accurate',
      'exactly two arms, exactly two legs, proper limb attachment points',
      'proper hand anatomy with exactly five fingers on each hand, correct finger length',
      'natural body proportions, realistic human figure, proper skeletal structure',
      'correct facial features, symmetrical face, natural expression, proper eye placement',
      'professional model pose, natural body position, balanced composition, stable stance',
      'single complete human body, one head, two eyes, one nose, one mouth',
    ];
    
    // PROMPTS ANATOMIQUES ULTRA-STRICTS (intégrés au prompt positif)
    this.anatomyStrictPrompt = 
      'ANATOMICALLY PERFECT HUMAN BODY: ' +
      'exactly ONE person, exactly TWO arms attached to shoulders, exactly TWO legs attached to hips, ' +
      'exactly TWO hands with FIVE fingers each, exactly TWO feet with five toes each, ' +
      'ONE head, ONE face, TWO eyes symmetrically placed, ONE nose centered, ONE mouth, TWO ears, ' +
      'proper human proportions, arms extend from shoulders naturally, ' +
      'legs extend from hips naturally, no floating body parts, ' +
      'anatomically correct female or male body, natural muscle structure, ' +
      'correct breast shape and size if female, natural nipple placement, ' +
      'symmetrical body, balanced pose, stable stance';
    
    // NEGATIVE PROMPT ULTRA-COMPLET (pour SD local)
    this.negativePromptFull = 
      'deformed, distorted, disfigured, mutated, bad anatomy, wrong anatomy, anatomical errors, ' +
      'extra limbs, missing limbs, three arms, four arms, three legs, four legs, extra body parts, ' +
      'floating limbs, disconnected limbs, merged limbs, fused body parts, ' +
      'malformed hands, twisted hands, backwards hands, extra fingers, missing fingers, ' +
      'fused fingers, six fingers, seven fingers, too many fingers, mutated hands, bad hands, ' +
      'clawed hands, webbed fingers, malformed feet, extra toes, ' +
      'extra arms, extra legs, duplicate body parts, clone, conjoined, ' +
      'two heads, two faces, multiple people, crowd, group, ' +
      'malformed breasts, misshapen breasts, uneven breasts, extra nipples, ' +
      'malformed face, asymmetrical face, cross-eyed, misaligned eyes, third eye, ' +
      'double chin overlapping, long neck, twisted neck, broken neck, ' +
      'blurry, low quality, pixelated, watermark, signature, text, logo, ' +
      'bad proportions, giant head, tiny head, long arms, short arms, ' +
      'jpeg artifacts, compression artifacts, noise, grainy, ' +
      'ugly, grotesque, horror, creepy, nightmare, zombie';
    
    // TENUES NSFW ALÉATOIRES
    this.nsfwOutfits = [
      'wearing sexy lingerie, lace underwear',
      'wearing silk robe, partially open',
      'topless, bare chest visible',
      'wearing only towel',
      'completely nude, artistic nudity',
      'wearing see-through clothing',
      'wearing bikini, swimsuit',
      'lingerie visible under clothing',
    ];
    
    // POSTURES NSFW ALÉATOIRES
    this.nsfwPoses = [
      'lying on bed, seductive pose',
      'sitting elegantly, legs crossed',
      'standing gracefully, hand on hip',
      'kneeling, looking up',
      'arching back, sensual pose',
      'leaning against wall, alluring',
      'reclining on couch, relaxed',
      'stretching, body exposed',
    ];
  }

  /**
   * Retourne une tenue basée sur le niveau de relation
   */
  getOutfitByLevel(level) {
    const lvl = Math.min(Math.max(1, level || 1), 5);
    const outfits = {
      1: ['wearing casual clothes, slightly revealing', 'wearing tight dress, form-fitting', 'wearing crop top, midriff visible'],
      2: ['wearing sexy lingerie, lace bra and panties', 'wearing silk lingerie set', 'wearing babydoll nightgown, see-through', 'wearing corset and thong'],
      3: ['wearing only thong, topless, hands covering breasts', 'wearing sheer robe, see-through', 'wearing micro bikini, barely covering'],
      4: ['topless, bare breasts, wearing only panties', 'nude from waist up, wearing only stockings', 'wearing open robe, one breast visible'],
      5: ['completely nude, artistic full body', 'fully naked, lying elegantly', 'nude, confident pose, natural beauty'],
    };
    const levelOutfits = outfits[lvl] || outfits[1];
    return levelOutfits[Math.floor(Math.random() * levelOutfits.length)];
  }

  /**
   * Retourne une pose basée sur le niveau de relation
   */
  getPoseByLevel(level) {
    const lvl = Math.min(Math.max(1, level || 1), 5);
    const poses = {
      1: ['standing casually, friendly smile', 'sitting relaxed, legs crossed', 'leaning, playful expression'],
      2: ['lying on bed, seductive look', 'sitting on bed edge, inviting', 'standing with hand on hip'],
      3: ['arching back, sensual pose', 'kneeling, looking up invitingly', 'lying on side, curves emphasized'],
      4: ['lying back, one leg raised', 'on all fours, looking over shoulder', 'spreading legs slightly'],
      5: ['legs spread, explicit pose', 'bent over, rear view', 'lying with legs open, intimate'],
    };
    const levelPoses = poses[lvl] || poses[1];
    return levelPoses[Math.floor(Math.random() * levelPoses.length)];
  }

  /**
   * Parse l'âge du personnage (gère les formats fantastiques)
   * Ex: "300 ans (apparence 25)" -> 25
   * Ex: "42" -> 42
   * Ex: "Immortelle (apparence 26)" -> 26
   */
  parseCharacterAge(ageValue) {
    const ageStr = String(ageValue || '');
    
    // Chercher d'abord "apparence XX" pour les personnages fantastiques
    const appearanceMatch = ageStr.match(/apparence\s*(\d+)/i);
    if (appearanceMatch) {
      return parseInt(appearanceMatch[1]);
    }
    
    // Sinon prendre le premier nombre trouvé
    const numMatch = ageStr.match(/(\d+)/);
    if (numMatch) {
      const age = parseInt(numMatch[1]);
      // Si l'âge est > 100, c'est probablement un âge fantastique
      // Utiliser une apparence raisonnable basée sur l'âge
      if (age > 100) {
        return Math.min(Math.max(Math.floor(age / 10), 20), 50);
      }
      return age;
    }
    
    return 25; // Âge par défaut
  }

  /**
   * Choisit un style aléatoire (anime ou réaliste)
   * @returns {Object} { style: string, isRealistic: boolean }
   */
  getRandomStyle() {
    // 50% chance anime, 50% chance réaliste
    const isRealistic = Math.random() > 0.5;
    
    if (isRealistic) {
      const style = this.realisticStyles[Math.floor(Math.random() * this.realisticStyles.length)];
      return { style, isRealistic: true };
    } else {
      const style = this.animeStyles[Math.floor(Math.random() * this.animeStyles.length)];
      return { style, isRealistic: false };
    }
  }

  /**
   * Construit les prompts de qualité pour images réalistes
   */
  buildRealisticQualityPrompts() {
    // Sélectionner plusieurs prompts de qualité anatomique
    const selectedPrompts = [];
    const shuffled = [...this.anatomyQualityPrompts].sort(() => Math.random() - 0.5);
    selectedPrompts.push(shuffled[0], shuffled[1]);
    
    return selectedPrompts.join(', ') + ', ' + this.antiDeformationPrompts;
  }

  /**
   * Construit une description ultra-détaillée des caractéristiques physiques
   * Prend en compte TOUS les champs du personnage
   */
  buildDetailedPhysicalDescription(character, isRealistic = false) {
    let description = '';
    
    // === UTILISER physicalDescription EN PRIORITÉ si disponible ===
    if (character.physicalDescription) {
      description += character.physicalDescription.replace(/\n/g, ', ').trim();
      description += ', ';
    }
    
    // === GENRE ET BASE ===
    if (character.gender === 'female') {
      if (isRealistic) {
        description += 'beautiful real woman, female human, realistic lady, real person';
      } else {
        description += 'beautiful anime woman, female character, anime lady';
      }
    } else if (character.gender === 'male') {
      if (isRealistic) {
        description += 'handsome real man, male human, realistic gentleman, real person';
      } else {
        description += 'handsome anime man, male character, anime gentleman';
      }
    } else {
      description += 'beautiful person, androgynous, non-binary appearance';
    }
    
    // === ÂGE PRÉCIS (gère les formats comme "300 ans (apparence 25)") ===
    let age = 25;
    const ageStr = String(character.age || '');
    // Chercher d'abord "apparence XX" pour les personnages fantastiques
    const appearanceMatch = ageStr.match(/apparence\s*(\d+)/i);
    if (appearanceMatch) {
      age = parseInt(appearanceMatch[1]);
    } else {
      // Sinon prendre le premier nombre trouvé
      const numMatch = ageStr.match(/(\d+)/);
      if (numMatch) {
        age = parseInt(numMatch[1]);
        // Si l'âge est > 100, c'est probablement un âge fantastique, utiliser une apparence raisonnable
        if (age > 100) {
          age = Math.min(Math.max(Math.floor(age / 10), 20), 50);
        }
      }
    }
    description += `, ${age} years old`;
    if (age >= 35 && age < 45) {
      description += ', mature adult, experienced, confident';
    } else if (age >= 45 && age < 55) {
      description += ', mature, distinguished, elegant';
    } else if (age >= 55) {
      description += ', mature, seasoned, sophisticated';
    } else if (age >= 25 && age < 35) {
      description += ', young adult, prime of life';
    } else if (age >= 18 && age < 25) {
      description += ', youthful adult, young adult';
    }
    
    // === CHEVEUX DÉTAILLÉS (utilise hairColor en priorité) ===
    const hairColor = character.hairColor || this.extractFromAppearance(character, 'hair') || 'brown';
    description += `, ${hairColor} hair`;
    
    // Combiner appearance, physicalDescription et autres champs
    const appearance = (
      (character.appearance || '') + ' ' + 
      (character.physicalDescription || '') + ' ' +
      (character.bodyType || '')
    ).toLowerCase();
    if (appearance.includes('long') || appearance.includes('longs')) {
      description += ', very long flowing hair reaching lower back';
    } else if (appearance.includes('mi-long') || appearance.includes('shoulder')) {
      description += ', shoulder-length medium hair';
    } else if (appearance.includes('court') || appearance.includes('short')) {
      description += ', short cropped hair';
    } else {
      description += ', medium length hair';
    }
    
    if (appearance.includes('bouclé') || appearance.includes('curly') || appearance.includes('ondulé')) {
      description += ', curly wavy hair with natural curls';
    } else if (appearance.includes('raides') || appearance.includes('straight') || appearance.includes('lisse')) {
      description += ', straight sleek silky hair';
    }
    
    // === MORPHOLOGIE ===
    if (appearance.includes('grande') || appearance.includes('tall')) {
      description += ', tall stature';
    } else if (appearance.includes('petite') || appearance.includes('small')) {
      description += ', petite short stature';
    } else {
      description += ', average height';
    }
    
    if (appearance.includes('musclé') || appearance.includes('muscular') || appearance.includes('athlétique') || appearance.includes('athletic')) {
      description += ', athletic toned fit body with defined muscles';
    } else if (appearance.includes('mince') || appearance.includes('slim') || appearance.includes('élancé') || appearance.includes('slender')) {
      description += ', slim slender lean body';
    } else if (appearance.includes('voluptu') || appearance.includes('curvy') || appearance.includes('généreuses')) {
      description += ', voluptuous curvy full-figured body';
    } else if (appearance.includes('ronde') || appearance.includes('round')) {
      description += ', curvy soft rounded body';
    } else {
      description += ', balanced normal physique';
    }
    
    // === COULEUR DE PEAU ===
    if (appearance.includes('pâle') || appearance.includes('pale') || appearance.includes('porcelaine')) {
      description += ', pale fair porcelain skin';
    } else if (appearance.includes('bronzé') || appearance.includes('tanned') || appearance.includes('doré')) {
      description += ', tanned golden sun-kissed skin';
    } else if (appearance.includes('ébène') || appearance.includes('noire') || appearance.includes('dark') || appearance.includes('noir')) {
      description += ', beautiful dark ebony skin';
    } else if (appearance.includes('caramel') || appearance.includes('métisse') || appearance.includes('mixed')) {
      description += ', warm caramel mixed skin tone';
    } else if (appearance.includes('asiat') || appearance.includes('asian')) {
      description += ', asian light skin tone';
    } else if (appearance.includes('latin') || appearance.includes('olive') || appearance.includes('mediterran')) {
      description += ', mediterranean olive warm skin';
    } else {
      description += ', natural healthy skin';
    }
    
    // === YEUX (utilise eyeColor en priorité, sinon extraction) ===
    const eyeColor = character.eyeColor || this.extractFromAppearance(character, 'eyes');
    if (eyeColor) {
      description += `, ${eyeColor} eyes`;
    } else if (appearance.includes('yeux bleu') || appearance.includes('blue eyes')) {
      description += ', bright blue eyes';
    } else if (appearance.includes('yeux vert') || appearance.includes('green eyes')) {
      description += ', emerald green eyes';
    } else if (appearance.includes('yeux marron') || appearance.includes('yeux brun') || appearance.includes('brown eyes')) {
      description += ', warm brown eyes';
    } else if (appearance.includes('yeux noi') || appearance.includes('black eyes') || appearance.includes('dark eyes')) {
      description += ', deep dark eyes';
    } else if (appearance.includes('yeux gris') || appearance.includes('grey eyes')) {
      description += ', steel gray eyes';
    } else if (appearance.includes('noisette') || appearance.includes('hazel')) {
      description += ', hazel eyes';
    } else if (appearance.includes('améthyste') || appearance.includes('violet') || appearance.includes('purple')) {
      description += ', mystical purple amethyst eyes';
    } else if (appearance.includes('doré') || appearance.includes('gold') || appearance.includes('or')) {
      description += ', striking golden eyes';
    } else if (appearance.includes('rouge') || appearance.includes('red')) {
      description += ', intense crimson red eyes';
    } else {
      description += ', expressive captivating eyes';
    }
    
    // === TAILLE (utilise height en priorité) ===
    if (character.height) {
      const heightCm = parseInt(character.height);
      if (heightCm >= 180) {
        description += ', tall stature, impressive height';
      } else if (heightCm >= 170) {
        description += ', above average height';
      } else if (heightCm <= 160) {
        description += ', petite short stature';
      } else {
        description += ', average height';
      }
    }
    
    // === BODY TYPE (utilise bodyType en priorité, sinon extraction) ===
    const bodyType = character.bodyType || this.extractFromAppearance(character, 'body');
    if (bodyType) {
      const bodyTypeLower = bodyType.toLowerCase();
      if (bodyTypeLower.includes('athléti') || bodyTypeLower.includes('muscl') || bodyTypeLower.includes('athletic')) {
        description += ', athletic toned muscular body';
      } else if (bodyTypeLower.includes('voluptu') || bodyTypeLower.includes('curv') || bodyTypeLower.includes('généreus')) {
        description += ', voluptuous curvy full-figured body';
      } else if (bodyTypeLower.includes('élancé') || bodyTypeLower.includes('mince') || bodyTypeLower.includes('slim')) {
        description += ', slim slender elegant body';
      } else if (bodyTypeLower.includes('graci') || bodyTypeLower.includes('fine')) {
        description += ', graceful slender refined body';
      } else if (bodyTypeLower.includes('puissant') || bodyTypeLower.includes('massif')) {
        description += ', powerful massive muscular build';
      } else if (bodyTypeLower.includes('ronde') || bodyTypeLower.includes('chubby') || bodyTypeLower.includes('plump')) {
        description += ', curvy plump soft body';
      } else if (bodyTypeLower.includes('matern') || bodyTypeLower.includes('maternel')) {
        description += ', maternal soft curvy body';
      } else {
        description += `, ${bodyType} body`;
      }
    }
    
    // === TRAITS ADDITIONNELS ===
    if (appearance.includes('taches de rousseur') || appearance.includes('freckles')) {
      description += ', cute freckles on face';
    }
    
    if (appearance.includes('lunettes') || appearance.includes('glasses')) {
      description += ', wearing stylish glasses';
    }
    
    // Pour réaliste: ajouter des détails de peau réaliste
    if (isRealistic) {
      description += ', realistic skin texture, natural skin pores, lifelike appearance';
    }
    
    return description;
  }

  /**
   * Extrait une information spécifique de l'apparence
   */
  extractFromAppearance(character, type) {
    const text = ((character.appearance || '') + ' ' + (character.physicalDescription || '') + ' ' + (character.imagePrompt || '')).toLowerCase();
    
    if (type === 'hair') {
      const hairColors = [
        { key: 'platine', value: 'platinum blonde' },
        { key: 'platinum', value: 'platinum blonde' },
        { key: 'blond doré', value: 'golden blonde' },
        { key: 'golden blonde', value: 'golden blonde' },
        { key: 'blond cendré', value: 'ash blonde' },
        { key: 'ash blonde', value: 'ash blonde' },
        { key: 'blond miel', value: 'honey blonde' },
        { key: 'honey blonde', value: 'honey blonde' },
        { key: 'blonde', value: 'blonde' },
        { key: 'blond', value: 'blonde' },
        { key: 'roux flamboyant', value: 'fiery red' },
        { key: 'fiery red', value: 'fiery red' },
        { key: 'roux cuivré', value: 'copper red' },
        { key: 'copper red', value: 'copper red' },
        { key: 'rousse', value: 'red' },
        { key: 'roux', value: 'red' },
        { key: 'auburn', value: 'auburn' },
        { key: 'brun chocolat', value: 'chocolate brown' },
        { key: 'chocolate brown', value: 'chocolate brown' },
        { key: 'brune', value: 'brunette' },
        { key: 'brun', value: 'brown' },
        { key: 'châtain', value: 'chestnut brown' },
        { key: 'noir de jais', value: 'jet black' },
        { key: 'jet black', value: 'jet black' },
        { key: 'noire', value: 'black' },
        { key: 'noir', value: 'black' },
        { key: 'gris argenté', value: 'silver gray' },
        { key: 'silver gray', value: 'silver gray' },
        { key: 'argenté', value: 'silver' },
        { key: 'silver', value: 'silver' },
        { key: 'gris', value: 'gray' },
        { key: 'grey', value: 'gray' },
        { key: 'blanc', value: 'white' },
        { key: 'white', value: 'white' },
        { key: 'violet', value: 'purple' },
        { key: 'purple', value: 'purple' },
        { key: 'rose', value: 'pink' },
        { key: 'pink', value: 'pink' },
        { key: 'bleu', value: 'blue' },
        { key: 'blue', value: 'blue' },
        { key: 'vert', value: 'green' },
        { key: 'green', value: 'green' },
        { key: 'rouge vif', value: 'bright red' },
        { key: 'bright red', value: 'bright red' },
      ];
      for (const color of hairColors) {
        if (text.includes(color.key)) return color.value;
      }
    }
    
    if (type === 'eyes') {
      const eyeColors = [
        { key: 'bleu clair', value: 'light blue' },
        { key: 'bleu glacier', value: 'icy blue' },
        { key: 'bleu électrique', value: 'electric blue' },
        { key: 'blue eyes', value: 'blue' },
        { key: 'bleus', value: 'blue' },
        { key: 'bleu', value: 'blue' },
        { key: 'vert émeraude', value: 'emerald green' },
        { key: 'vert clair', value: 'light green' },
        { key: 'green eyes', value: 'green' },
        { key: 'verts', value: 'green' },
        { key: 'vert', value: 'green' },
        { key: 'noisette', value: 'hazel' },
        { key: 'hazel', value: 'hazel' },
        { key: 'ambre', value: 'amber' },
        { key: 'amber', value: 'amber' },
        { key: 'marron foncé', value: 'dark brown' },
        { key: 'marron chaleureux', value: 'warm brown' },
        { key: 'brown eyes', value: 'brown' },
        { key: 'marron', value: 'brown' },
        { key: 'gris acier', value: 'steel gray' },
        { key: 'gray eyes', value: 'gray' },
        { key: 'gris', value: 'gray' },
        { key: 'noirs profonds', value: 'deep black' },
        { key: 'black eyes', value: 'black' },
        { key: 'noirs', value: 'black' },
        { key: 'améthyste', value: 'purple amethyst' },
        { key: 'violet', value: 'purple' },
        { key: 'doré', value: 'golden' },
        { key: 'golden', value: 'golden' },
        { key: 'rouge', value: 'red' },
        { key: 'red eyes', value: 'red' },
      ];
      for (const color of eyeColors) {
        if (text.includes(color.key)) return color.value;
      }
    }
    
    if (type === 'bust') {
      // Extraire la taille de bonnet du texte
      const bustPatterns = [
        { pattern: /bonnet\s*h/i, value: 'H' },
        { pattern: /bonnet\s*g/i, value: 'G' },
        { pattern: /bonnet\s*f/i, value: 'F' },
        { pattern: /bonnet\s*e/i, value: 'E' },
        { pattern: /bonnet\s*dd/i, value: 'DD' },
        { pattern: /bonnet\s*d/i, value: 'D' },
        { pattern: /bonnet\s*c/i, value: 'C' },
        { pattern: /bonnet\s*b/i, value: 'B' },
        { pattern: /bonnet\s*a/i, value: 'A' },
        { pattern: /h\s*cup/i, value: 'H' },
        { pattern: /g\s*cup/i, value: 'G' },
        { pattern: /f\s*cup/i, value: 'F' },
        { pattern: /e\s*cup/i, value: 'E' },
        { pattern: /dd\s*cup/i, value: 'DD' },
        { pattern: /d\s*cup/i, value: 'D' },
        { pattern: /c\s*cup/i, value: 'C' },
        { pattern: /b\s*cup/i, value: 'B' },
        { pattern: /a\s*cup/i, value: 'A' },
        { pattern: /énorme.*poitrine|huge.*breast|massive.*breast/i, value: 'H' },
        { pattern: /très grosse.*poitrine|very large.*breast/i, value: 'G' },
        { pattern: /grosse.*poitrine|large.*breast/i, value: 'F' },
        { pattern: /généreuse.*poitrine|generous.*breast/i, value: 'E' },
        { pattern: /poitrine.*généreuse/i, value: 'E' },
        { pattern: /moyenne.*poitrine|medium.*breast/i, value: 'C' },
        { pattern: /poitrine.*moyenne/i, value: 'C' },
        { pattern: /petite.*poitrine|small.*breast/i, value: 'B' },
        { pattern: /poitrine.*petite/i, value: 'B' },
      ];
      for (const p of bustPatterns) {
        if (p.pattern.test(text)) return p.value;
      }
    }
    
    if (type === 'body') {
      const bodyTypes = [
        { key: 'très ronde', value: 'very curvy chubby' },
        { key: 'very curvy', value: 'very curvy' },
        { key: 'ronde', value: 'curvy plump' },
        { key: 'chubby', value: 'chubby curvy' },
        { key: 'voluptueuse', value: 'voluptuous curvy' },
        { key: 'voluptuous', value: 'voluptuous' },
        { key: 'pulpeuse', value: 'voluptuous full-figured' },
        { key: 'généreuse', value: 'generous curvy' },
        { key: 'curvy', value: 'curvy' },
        { key: 'athlétique', value: 'athletic toned' },
        { key: 'athletic', value: 'athletic' },
        { key: 'musclée', value: 'muscular toned' },
        { key: 'muscular', value: 'muscular' },
        { key: 'tonique', value: 'toned fit' },
        { key: 'toned', value: 'toned' },
        { key: 'sportive', value: 'athletic sporty' },
        { key: 'mince', value: 'slim slender' },
        { key: 'slim', value: 'slim' },
        { key: 'élancée', value: 'slender elegant' },
        { key: 'slender', value: 'slender' },
        { key: 'fine', value: 'slim petite' },
        { key: 'petite', value: 'petite small' },
        { key: 'maternelle', value: 'maternal soft' },
        { key: 'maternal', value: 'maternal' },
      ];
      for (const bt of bodyTypes) {
        if (text.includes(bt.key)) return bt.value;
      }
    }
    
    return null;
  }

  /**
   * Décrit l'anatomie de manière précise
   */
  buildAnatomyDescription(character, isRealistic = false) {
    let anatomy = '';
    
    // === FEMMES - POITRINE (utilise bust OU bustSize OU extraction du texte) ===
    let bustSize = character.bust || character.bustSize || this.extractFromAppearance(character, 'bust');
    if (character.gender === 'female' && bustSize) {
      const bustDetails = {
        'A': { size: 'small A cup breasts', details: 'petite chest, small perky bust, flat chested' },
        'B': { size: 'small B cup breasts', details: 'modest bust, small perky breasts, cute small chest' },
        'C': { size: 'medium C cup breasts', details: 'balanced bust, natural medium breasts, nice cleavage' },
        'D': { size: 'large D cup breasts', details: 'voluptuous bust, full generous breasts, impressive cleavage' },
        'DD': { size: 'very large DD cup breasts', details: 'very generous bust, full heavy breasts, deep cleavage' },
        'E': { size: 'extremely large E cup breasts', details: 'impressive huge bust, massive full breasts, enormous cleavage' },
        'F': { size: 'huge F cup breasts', details: 'huge voluptuous bust, enormous full breasts, gigantic cleavage' },
        'G': { size: 'gigantic G cup breasts', details: 'gigantic massive bust, colossal breasts, impossibly large' },
        'H': { size: 'enormous H cup breasts', details: 'enormous massive bust, incredibly huge breasts' }
      };
      
      // Normaliser la taille (peut être "Moyenne", "Généreuse", etc.)
      let normalizedBust = bustSize;
      if (bustSize.toLowerCase().includes('petit') || bustSize.toLowerCase().includes('small')) {
        normalizedBust = 'B';
      } else if (bustSize.toLowerCase().includes('moyen') || bustSize.toLowerCase().includes('medium')) {
        normalizedBust = 'C';
      } else if (bustSize.toLowerCase().includes('génér') || bustSize.toLowerCase().includes('large') || bustSize.toLowerCase().includes('voluptu')) {
        normalizedBust = 'D';
      } else if (bustSize.toLowerCase().includes('très') || bustSize.toLowerCase().includes('very') || bustSize.toLowerCase().includes('énorme')) {
        normalizedBust = 'E';
      }
      
      const bustInfo = bustDetails[normalizedBust] || bustDetails[bustSize] || bustDetails['C'];
      anatomy += `, ${bustInfo.size}, ${bustInfo.details}`;
      
      // Ajouter des détails sur les hanches/taille
      if (['D', 'DD', 'E', 'F', 'G', 'H'].includes(normalizedBust)) {
        anatomy += ', wide hips, hourglass figure, curvy body';
      }
    }
    
    // === HOMMES - PHYSIQUE (basé sur maleSize ou penis en cm) ===
    const maleSize = character.maleSize || character.penis;
    if (character.gender === 'male' && maleSize) {
      const penisSize = parseInt(maleSize) || 15;
      
      if (penisSize >= 25) {
        anatomy += ', exceptionally muscular build, bodybuilder physique, massive muscles';
        anatomy += ', very broad shoulders, huge pecs, rock-hard six-pack abs, V-shaped torso';
      } else if (penisSize >= 22) {
        anatomy += ', extremely muscular build, very broad shoulders, defined pecs, rock-hard abs';
      } else if (penisSize >= 20) {
        anatomy += ', very muscular athletic build, broad shoulders, six-pack abs, defined muscles';
      } else if (penisSize >= 18) {
        anatomy += ', muscular athletic build, defined chest, toned abs, fit body';
      } else if (penisSize >= 15) {
        anatomy += ', athletic build, toned physique, lean muscles';
      } else {
        anatomy += ', slim build, lean physique, slender body';
      }
    }
    
    // Pour réaliste: insister sur l'anatomie correcte
    if (isRealistic) {
      anatomy += ', correct human anatomy, proper body proportions, natural limb positions';
      anatomy += ', realistic hands with five fingers each, proper arm length';
    }
    
    return anatomy;
  }

  /**
   * MODE NSFW - Version explicite
   */
  buildNSFWPrompt(character, isRealistic = false) {
    let nsfw = '';
    
    // Niveau d'explicité aléatoire (soft, medium, hard)
    const explicitLevel = Math.random();
    
    if (character.gender === 'female') {
      nsfw += ', seductive sexy pose, sensual expression, bedroom eyes, sultry gaze';
      
      // Poitrine (utilise bust OU bustSize)
      const bustSize = character.bust || character.bustSize;
      if (bustSize) {
        const bustDescriptions = {
          'A': 'small perky breasts visible',
          'B': 'petite breasts showing',
          'C': 'medium breasts, nice cleavage',
          'D': 'large breasts, deep cleavage, generous bust',
          'DD': 'very large breasts, impressive cleavage',
          'E': 'huge breasts prominently displayed, massive cleavage',
          'F': 'enormous breasts, gigantic bust emphasized',
          'G': 'massive breasts, colossal bust',
          'H': 'enormous massive breasts, gigantic bust'
        };
        
        // Normaliser si nécessaire
        let normalizedBust = bustSize;
        if (bustSize.toLowerCase().includes('petit') || bustSize.toLowerCase().includes('small')) {
          normalizedBust = 'B';
        } else if (bustSize.toLowerCase().includes('moyen') || bustSize.toLowerCase().includes('medium')) {
          normalizedBust = 'C';
        } else if (bustSize.toLowerCase().includes('génér') || bustSize.toLowerCase().includes('large') || bustSize.toLowerCase().includes('voluptu')) {
          normalizedBust = 'D';
        } else if (bustSize.toLowerCase().includes('très') || bustSize.toLowerCase().includes('very') || bustSize.toLowerCase().includes('énorme')) {
          normalizedBust = 'E';
        }
        
        nsfw += `, ${bustDescriptions[normalizedBust] || bustDescriptions[bustSize] || 'beautiful breasts'}`;
      }
      
      // Tenue selon niveau
      if (explicitLevel > 0.7) {
        nsfw += ', topless, bare breasts exposed, nude upper body';
        nsfw += ', nipples visible, exposed chest';
      } else if (explicitLevel > 0.4) {
        nsfw += ', wearing only panties, topless with arm covering';
        nsfw += ', sheer see-through lingerie, nipples showing through';
      } else {
        nsfw += ', sexy lingerie, lace bra barely covering';
        nsfw += ', revealing outfit, cleavage emphasized';
      }
      
      nsfw += ', lying on bed seductively, soft romantic lighting';
      nsfw += ', smooth flawless skin, sensual body curves';
      
    } else if (character.gender === 'male') {
      nsfw += ', sexy masculine pose, confident seductive expression';
      nsfw += ', shirtless, bare muscular chest fully exposed';
      nsfw += ', defined six-pack abs, muscular physique highlighted';
      nsfw += ', V-line visible, low waist pants';
      
      // Physique selon "penis" qui représente la musculature
      if (character.penis) {
        const size = parseInt(character.penis) || 15;
        if (size >= 20) {
          nsfw += ', extremely muscular body, bodybuilder physique';
          nsfw += ', massive muscles, powerful build, impressive physique';
        } else if (size >= 17) {
          nsfw += ', very muscular athletic body, ripped physique';
        }
      }
      
      if (explicitLevel > 0.6) {
        nsfw += ', wearing only underwear, bulge visible';
      }
    }
    
    if (isRealistic) {
      nsfw += ', professional boudoir photography, high-end erotic photoshoot';
      nsfw += ', intimate sensual photo, artistic nude, elegant erotica';
      nsfw += ', perfect studio lighting, professional quality';
    } else {
      nsfw += ', beautiful ecchi anime art, detailed hentai style illustration';
      nsfw += ', high quality nsfw anime, sensual anime artwork';
    }
    
    nsfw += ', NSFW content, adult only, explicit, erotic, sexy';
    
    return nsfw;
  }

  /**
   * MODE SFW
   */
  buildSFWPrompt(character, isRealistic = false) {
    let sfw = ', fully clothed, appropriate attire, decent outfit';
    
    const appearance = (character.appearance || '').toLowerCase();
    
    if (appearance.includes('élégant') || appearance.includes('elegant')) {
      sfw += ', elegant sophisticated outfit, classy clothing';
    } else if (appearance.includes('professionnel') || appearance.includes('professional')) {
      sfw += ', professional business attire, formal clothing';
    } else if (appearance.includes('sport') || appearance.includes('athletic')) {
      sfw += ', athletic sportswear, fitness outfit';
    } else {
      sfw += ', casual modern clothing, stylish outfit';
    }
    
    sfw += ', natural confident pose, friendly expression';
    
    if (isRealistic) {
      sfw += ', professional portrait photography, natural lighting, clean background';
    }
    
    return sfw;
  }

  /**
   * Génère l'image du personnage (profil)
   */
  async generateCharacterImage(character, userProfile = null) {
    // Parser l'âge correctement (gère "300 ans (apparence 25)")
    const charAge = this.parseCharacterAge(character.age);
    if (charAge < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    const nsfwMode = userProfile?.nsfwMode && userProfile?.isAdult;

    // Choisir le style (anime ou réaliste)
    const { style, isRealistic } = this.getRandomStyle();
    
    let prompt = style;
    
    // === UTILISER imagePrompt si disponible (ex: personnages fantasy) ===
    if (character.imagePrompt) {
      prompt += ', ' + character.imagePrompt;
    }
    
    // Description physique adaptée au style
    prompt += ', ' + this.buildDetailedPhysicalDescription(character, isRealistic);
    
    // Apparence du personnage
    if (character.appearance) {
      prompt += `, ${character.appearance.replace(/\n/g, ' ').trim()}`;
    }
    
    // Anatomie (poitrine, physique masculin)
    prompt += this.buildAnatomyDescription(character, isRealistic);
    
    // Tenue
    if (character.outfit) {
      prompt += `, wearing: ${character.outfit.replace(/\n/g, ' ').trim()}`;
    }
    
    // Mode NSFW ou SFW
    if (nsfwMode) {
      prompt += this.buildNSFWPrompt(character, isRealistic);
    } else {
      prompt += this.buildSFWPrompt(character, isRealistic);
    }
    
    // ANATOMIE STRICTE (pour éviter les défauts)
    prompt += ', ' + this.anatomyStrictPrompt;
    
    // QUALITÉ SPÉCIFIQUE AU STYLE
    if (isRealistic) {
      prompt += ', ' + this.buildRealisticQualityPrompts();
      prompt += ', ultra-high quality photo, 8K resolution, sharp focus, professional photography';
      prompt += ', realistic skin texture, lifelike details, photographic quality';
      prompt += ', single person only, one subject, solo portrait';
    } else {
      prompt += ', masterpiece anime art, best quality illustration, highly detailed anime';
      prompt += ', clean lines, vibrant colors, professional anime artwork';
      prompt += ', single character, solo, one person';
    }
    
    prompt += ', adult 18+, mature content';

    console.log(`🖼️ Génération image profil (${isRealistic ? 'RÉALISTE' : 'ANIME'})...`);
    return await this.generateImage(prompt);
  }

  /**
   * Génère l'image de scène (conversation)
   * @param {Object} character - Le personnage
   * @param {Object} userProfile - Le profil utilisateur
   * @param {Array} recentMessages - Messages récents
   * @param {number} relationLevel - Niveau de relation (1-5+)
   */
  async generateSceneImage(character, userProfile = null, recentMessages = [], relationLevel = 1) {
    // Parser l'âge correctement (gère "300 ans (apparence 25)")
    const charAge = this.parseCharacterAge(character.age);
    if (charAge < 18) {
      throw new Error('Génération d\'images désactivée pour les personnages mineurs');
    }

    // Application 18+ uniquement - toujours NSFW
    const level = Math.max(1, relationLevel || 1);
    console.log(`🔞 Génération image niveau ${level}`);

    // Choisir le style
    const { style, isRealistic } = this.getRandomStyle();
    
    let prompt = style;
    
    // === UTILISER imagePrompt si disponible ===
    if (character.imagePrompt) {
      prompt += ', ' + character.imagePrompt;
    }
    
    // Description physique
    prompt += ', ' + this.buildDetailedPhysicalDescription(character, isRealistic);
    
    // Apparence
    if (character.appearance) {
      prompt += `, ${character.appearance.replace(/\n/g, ' ').trim()}`;
    }
    
    // Anatomie (poitrine, physique masculin)
    prompt += this.buildAnatomyDescription(character, isRealistic);
    
    // TENUE BASÉE SUR LE NIVEAU DE RELATION
    const detectedOutfit = this.detectOutfit(recentMessages);
    if (detectedOutfit) {
      prompt += `, wearing ${detectedOutfit}`;
    } else {
      // Tenue basée sur le niveau
      const levelOutfit = this.getOutfitByLevel(level);
      prompt += `, ${levelOutfit}`;
      console.log(`👗 Tenue niveau ${level}: ${levelOutfit}`);
    }
    
    // POSE BASÉE SUR LE NIVEAU DE RELATION
    const levelPose = this.getPoseByLevel(level);
    prompt += `, ${levelPose}`;
    console.log(`🎭 Pose niveau ${level}: ${levelPose}`);
    
    // Mode NSFW ou SFW
    if (nsfwMode) {
      prompt += this.buildNSFWPrompt(character, isRealistic);
    } else {
      prompt += this.buildSFWPrompt(character, isRealistic);
    }
    
    // ANATOMIE STRICTE (pour éviter les défauts)
    prompt += ', ' + this.anatomyStrictPrompt;
    
    // QUALITÉ AVEC ANTI-DÉFORMATION
    if (isRealistic) {
      prompt += ', ' + this.buildRealisticQualityPrompts();
      prompt += ', ultra-detailed photo, 8K, professional quality, sharp focus';
      prompt += ', single person, solo portrait';
    } else {
      prompt += ', masterpiece, best quality, highly detailed anime';
      prompt += ', single character, solo';
    }
    
    prompt += ', adult 18+, mature content';

    console.log(`🖼️ Génération image conversation (${isRealistic ? 'RÉALISTE' : 'ANIME'})...`);
    return await this.generateImage(prompt);
  }

  /**
   * Détecte une tenue mentionnée dans les messages
   */
  detectOutfit(messages) {
    const outfitKeywords = [
      'robe', 'dress', 'jupe', 'skirt', 'pantalon', 'pants', 'jean', 'jeans',
      'chemise', 'shirt', 'blouse', 't-shirt', 'pull', 'sweater', 'veste', 'jacket',
      'lingerie', 'underwear', 'soutien-gorge', 'bra', 'culotte', 'panties',
      'bikini', 'swimsuit', 'nuisette', 'nightgown', 'pyjama', 'débardeur',
      'costume', 'uniforme', 'uniform', 'tenue', 'outfit'
    ];

    const recentText = messages.slice(-3).map(m => m.content).join(' ').toLowerCase();

    for (const keyword of outfitKeywords) {
      const regex = new RegExp(`([\\w\\s]{0,20}${keyword}[\\w\\s]{0,20})`, 'i');
      const match = recentText.match(regex);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Attend le délai minimum entre les requêtes
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minDelay) {
      const waitTime = this.minDelay - timeSinceLastRequest;
      console.log(`⏳ Attente de ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Génère une image avec retry et fallback intelligent
   */
  async generateImage(prompt, retryCount = 0) {
    await CustomImageAPIService.loadConfig();
    
    const strategy = CustomImageAPIService.getStrategy();
    console.log(`🎨 Stratégie: ${strategy} (tentative ${retryCount + 1}/${this.maxRetries + 2})`);
    
    let imageUrl;
    
    // Première tentative: stratégie configurée
    if (strategy === 'local') {
      imageUrl = await this.generateWithLocal(prompt);
    } else {
      imageUrl = await this.generateWithFreebox(prompt);
    }
    
    // Vérifier si l'image est valide
    const isValid = await this.validateImageUrl(imageUrl);
    
    if (isValid) {
      console.log('✅ Image générée avec succès');
      return imageUrl;
    }
    
    // Si échec et encore des retries disponibles
    if (retryCount < this.maxRetries - 1) {
      console.log(`⚠️ Image invalide, retry ${retryCount + 2}...`);
      // Délai progressif: 2s, 4s, 6s...
      await new Promise(r => setTimeout(r, 2000 + retryCount * 2000));
      return await this.generateImage(prompt, retryCount + 1);
    }
    
    // Dernière tentative: fallback API avec délai long
    console.log('🔄 Utilisation fallback API avec délai anti-rate-limit...');
    return await this.generateWithFallbackAPI(prompt, retryCount);
  }

  /**
   * Valide qu'une URL d'image est correcte
   */
  async validateImageUrl(imageUrl) {
    if (!imageUrl) return false;
    
    // Vérifier les patterns d'erreur connus (sauf pollinations.ai qui est valide)
    const errorPatterns = [
      'error',
      'failed',
      'invalid',
      'blocked',
      'nsfw_blocked',
      'rate_limit',
      'rate-limit',
      'too_many_requests',
      '429',
      '503',
      '502'
    ];
    
    const lowerUrl = imageUrl.toLowerCase();
    
    // Ne pas rejeter pollinations.ai car c'est une source valide
    const isPollinations = lowerUrl.includes('pollinations.ai');
    
    for (const pattern of errorPatterns) {
      if (lowerUrl.includes(pattern)) {
        console.log(`⚠️ URL contient pattern d'erreur: ${pattern}`);
        return false;
      }
    }
    
    // Vérifier que c'est une URL valide
    try {
      new URL(imageUrl);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Génère une image avec l'API Freebox
   */
  async generateWithFreebox(prompt) {
    console.log('🏠 Génération avec API Freebox...');
    
    await this.waitForRateLimit();
    
    let freeboxUrl = CustomImageAPIService.getApiUrl();
    if (!freeboxUrl) {
      freeboxUrl = this.freeboxURL;
    }
    
    const seed = Date.now() + Math.floor(Math.random() * 10000);
    // Limiter le prompt pour éviter les erreurs
    const shortPrompt = prompt.substring(0, 800);
    const encodedPrompt = encodeURIComponent(shortPrompt);
    
    const token = await AsyncStorage.getItem('auth_token');
    const user = AuthService.getCurrentUser();
    const userId = user?.id || '';
    
    const separator = freeboxUrl.includes('?') ? '&' : '?';
    let imageUrl = `${freeboxUrl}${separator}prompt=${encodedPrompt}&width=768&height=768&seed=${seed}`;
    
    if (token) {
      imageUrl += `&token=${encodeURIComponent(token)}`;
    }
    if (userId) {
      imageUrl += `&user_id=${encodeURIComponent(userId)}`;
    }
    
    console.log(`🔗 URL Freebox générée (${shortPrompt.length} chars)`);
    return imageUrl;
  }

  /**
   * APIs de fallback alternatives (gratuits)
   */
  async generateWithFallbackAPI(prompt, apiIndex = 0) {
    const seed = Date.now() + Math.floor(Math.random() * 99999);
    const shortPrompt = prompt.substring(0, 500);
    const encoded = encodeURIComponent(shortPrompt);
    
    // Rotation entre différentes APIs
    const apis = [
      // Prodia (gratuit, rapide)
      () => `https://api.prodia.com/generate?prompt=${encoded}&seed=${seed}`,
      // GetImg.ai placeholder
      () => `https://getimg.ai/api/v1/generate?prompt=${encoded}`,
      // Lexica (recherche d'images similaires)
      () => `https://lexica.art/api/v1/search?q=${encoded}`,
    ];
    
    // Pour l'instant, générer une URL Pollinations avec délai anti-rate-limit
    await new Promise(r => setTimeout(r, 3000)); // Attendre 3s
    
    const antiCache = Date.now();
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&seed=${seed}&nologo=true&nofeed=true&model=flux&t=${antiCache}`;
    
    console.log(`🌐 Fallback API (attente anti-rate-limit)`);
    return url;
  }

  /**
   * Génère une image avec Stable Diffusion Local
   */
  async generateWithLocal(prompt) {
    console.log('📱 Tentative génération locale SD...');
    
    try {
      const availability = await StableDiffusionLocalService.checkAvailability();
      
      if (!availability.available || !availability.modelDownloaded || !availability.canRunSD) {
        console.log('⚠️ SD Local non disponible - Utilisation de Freebox');
        return await this.generateWithFreebox(prompt);
      }

      const fullPrompt = `${prompt}, ${this.anatomyStrictPrompt}, masterpiece, best quality, ultra detailed`;

      console.log('🎨 Génération avec SD-Turbo local...');
      
      const result = await StableDiffusionLocalService.generateImage(fullPrompt, {
        negativePrompt: this.negativePromptFull,
        steps: 4, // Plus d'étapes pour meilleure qualité
        guidanceScale: 7.5, // Plus de guidance pour respecter le prompt
      });

      if (result && result.imagePath) {
        console.log('✅ Image générée localement');
        return result.imagePath;
      }
      
      console.log('⚠️ Pas de résultat SD Local, fallback Freebox');
      return await this.generateWithFreebox(prompt);
      
    } catch (error) {
      console.error('❌ Erreur génération locale:', error.message);
      return await this.generateWithFreebox(prompt);
    }
  }
}

export default new ImageGenerationService();
