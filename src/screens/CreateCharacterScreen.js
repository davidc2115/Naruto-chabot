import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import CustomCharacterService from '../services/CustomCharacterService';
import ImageGenerationService from '../services/ImageGenerationService';
import GalleryService from '../services/GalleryService';
import UserProfileService from '../services/UserProfileService';
import AuthService from '../services/AuthService';

export default function CreateCharacterScreen({ navigation, route }) {
  const { characterToEdit } = route.params || {};
  const isEditing = !!characterToEdit;

  // === INFORMATIONS DE BASE ===
  const [name, setName] = useState(characterToEdit?.name || '');
  const [age, setAge] = useState(characterToEdit?.age?.toString() || '');
  const [gender, setGender] = useState(characterToEdit?.gender || 'female');
  
  // === APPARENCE PHYSIQUE DÉTAILLÉE ===
  const [hairColor, setHairColor] = useState(characterToEdit?.hairColor || '');
  const [hairLength, setHairLength] = useState(characterToEdit?.hairLength || 'longs');
  const [eyeColor, setEyeColor] = useState(characterToEdit?.eyeColor || 'marron');
  const [height, setHeight] = useState(characterToEdit?.height?.replace(' cm', '') || '165');
  const [bodyType, setBodyType] = useState(characterToEdit?.bodyType || 'moyenne');
  const [skinTone, setSkinTone] = useState(characterToEdit?.skinTone || 'claire');
  const [bust, setBust] = useState(characterToEdit?.bust || 'C');
  const [penis, setPenis] = useState(characterToEdit?.penis?.replace('cm', '') || '17');
  const [appearance, setAppearance] = useState(characterToEdit?.appearance || '');
  
  // === PERSONNALITÉ ===
  const [personality, setPersonality] = useState(characterToEdit?.personality || '');
  const [temperament, setTemperament] = useState(characterToEdit?.temperament || 'amical');
  
  // === SCÉNARIO ===
  const [scenario, setScenario] = useState(characterToEdit?.scenario || '');
  const [startMessage, setStartMessage] = useState(characterToEdit?.startMessage || '');
  
  // === IMAGE ===
  const [imageUrl, setImageUrl] = useState(characterToEdit?.imageUrl || '');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [importedImage, setImportedImage] = useState(false);
  
  // === OPTIONS ===
  const [isPublic, setIsPublic] = useState(characterToEdit?.isPublic || false);
  const [serverOnline, setServerOnline] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  
  // === IMPORT DEPUIS SOURCES EXTERNES ===
  const [importUrl, setImportUrl] = useState('');
  const [importSource, setImportSource] = useState('chub'); // chub, characterhub, janitorai
  const [importing, setImporting] = useState(false);

  // === IMPORTER PERSONNAGE DEPUIS SOURCE EXTERNE ===
  const importCharacterFromSource = async () => {
    if (!importUrl) {
      Alert.alert('Erreur', 'Veuillez entrer une URL de personnage');
      return;
    }

    setImporting(true);
    try {
      let characterData = null;

      // Chub AI
      if (importSource === 'chub') {
        // Extraire l'ID du personnage depuis l'URL Chub
        const chubMatch = importUrl.match(/chub\.ai\/characters\/([a-f0-9-]+)/);
        if (!chubMatch) {
          throw new Error('URL Chub invalide');
        }
        const characterId = chubMatch[1];
        
        const response = await axios.get(`https://api.chub.ai/api/characters/${characterId}`);
        characterData = response.data;
      }
      // CharacterHub
      else if (importSource === 'characterhub') {
        const hubMatch = importUrl.match(/characterhub\.org\/character\/([a-f0-9-]+)/);
        if (!hubMatch) {
          throw new Error('URL CharacterHub invalide');
        }
        const characterId = hubMatch[1];
        
        const response = await axios.get(`https://api.characterhub.org/api/characters/${characterId}`);
        characterData = response.data;
      }
      // JanitorAI
      else if (importSource === 'janitorai') {
        const janitorMatch = importUrl.match(/janitorai\.com\/characters\/([a-f0-9-]+)/);
        if (!janitorMatch) {
          throw new Error('URL JanitorAI invalide');
        }
        const characterId = janitorMatch[1];
        
        const response = await axios.get(`https://api.janitorai.com/characters/${characterId}`);
        characterData = response.data;
      }

      if (!characterData) {
        throw new Error('Impossible de récupérer les données du personnage');
      }

      // Mapper les données du personnage vers notre format
      setName(characterData.name || characterData.character?.name || '');
      setAge(characterData.age || characterData.character?.age?.toString() || '');
      setGender(characterData.gender || characterData.character?.gender || 'female');
      setPersonality(characterData.personality || characterData.character?.personality || '');
      setAppearance(characterData.appearance || characterData.character?.description || '');
      setScenario(characterData.scenario || characterData.character?.scenario || '');
      setStartMessage(characterData.startMessage || characterData.character?.greeting || '');
      
      // Mapper les caractéristiques physiques si disponibles
      if (characterData.character || characterData.appearance) {
        const char = characterData.character || characterData;
        setHairColor(char.hairColor || char.hair || '');
        setEyeColor(char.eyeColor || char.eyes || '');
        setHeight(char.height?.replace('cm', '') || char.height?.replace(' cm', '') || '165');
        setBodyType(char.bodyType || char.body || 'moyenne');
        setSkinTone(char.skinTone || char.skin || 'claire');
        
        if (char.gender === 'female' && char.bust) {
          setBust(char.bust);
        } else if (char.gender === 'male' && char.penis) {
          setPenis(char.penis?.replace('cm', '') || '17');
        }
      }

      Alert.alert('Succès', 'Personnage importé avec succès !');
      setImportUrl('');
    } catch (error) {
      console.error('Erreur import:', error);
      Alert.alert('Erreur', 'Impossible d\'importer le personnage: ' + (error.message || 'erreur inconnue'));
    } finally {
      setImporting(false);
    }
  };
  
  // === LISTES DE CHOIX ===
  const hairLengths = ['très courts', 'courts', 'mi-longs', 'longs', 'très longs'];
  const eyeColors = ['marron', 'noisette', 'vert', 'bleu', 'gris', 'noir', 'ambre', 'violet'];
  const bodyTypes = ['mince', 'élancée', 'moyenne', 'athlétique', 'voluptueuse', 'généreuse', 'ronde', 'pulpeuse'];
  const skinTones = ['très claire', 'claire', 'mate', 'bronzée', 'caramel', 'ébène'];

  // Vérifier le statut premium au montage
  React.useEffect(() => {
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = async () => {
    try {
      // Vérifier si admin (toujours premium)
      const user = AuthService.getCurrentUser();
      const isAdmin = user?.is_admin || user?.email?.toLowerCase() === 'douvdouv21@gmail.com';
      
      if (isAdmin) {
        console.log('👑 Admin détecté - Premium automatique');
        setIsPremium(true);
        return;
      }
      
      const local = AuthService.isPremium();
      setIsPremium(local);
      const server = await AuthService.checkPremiumStatus();
      setIsPremium(server);
    } catch (error) {
      // Fallback: vérifier si admin
      const user = AuthService.getCurrentUser();
      const isAdmin = user?.is_admin || user?.email?.toLowerCase() === 'douvdouv21@gmail.com';
      setIsPremium(isAdmin || AuthService.isPremium());
    }
  };

  // Vérifier le statut du serveur pour la publication
  const checkServerStatus = async () => {
    try {
      setServerOnline(null); // En cours de vérification
      
      // Timeout de 5 secondes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('http://88.174.155.230:33437/api/ping', {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      setServerOnline(response.ok);
    } catch (error) {
      console.log('⚠️ Serveur hors ligne:', error.message);
      setServerOnline(false);
    }
  };

  const bustSizes = ['A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G'];
  const temperaments = [
    { id: 'amical', label: '😊 Amical', desc: 'Chaleureux et accessible' },
    { id: 'timide', label: '🙈 Timide', desc: 'Réservé et discret' },
    { id: 'flirt', label: '😏 Séducteur', desc: 'Charmeur et taquin' },
    { id: 'direct', label: '💪 Direct', desc: 'Franc et confiant' },
    { id: 'taquin', label: '😜 Taquin', desc: 'Espiègle et joueur' },
    { id: 'romantique', label: '💕 Romantique', desc: 'Tendre et rêveur' },
    { id: 'mystérieux', label: '🔮 Mystérieux', desc: 'Énigmatique' },
    { id: 'passionné', label: '🔥 Passionné', desc: 'Intense et fougueux' },
    { id: 'dominant', label: '👑 Dominant', desc: 'Assuré et leader' },
    { id: 'soumis', label: '🎀 Doux', desc: 'Docile et attentionné' },
  ];

  // === IMPORTER UNE IMAGE DEPUIS LA GALERIE ===
  // v5.3.45 - Sans redimensionnement obligatoire + auto-génération description
  const pickImage = async () => {
    try {
      // Demander la permission d'accès à la galerie
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permResult.status !== 'granted') {
        Alert.alert(
          'Permission requise', 
          'L\'accès à votre galerie photos est nécessaire pour importer une image.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Lancer le sélecteur d'images - SANS RECADRAGE FORCÉ
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,  // v5.3.45 - Pas de recadrage obligatoire
        quality: 0.9,          // Qualité élevée
      });

      console.log('📷 Résultat picker:', result.canceled ? 'annulé' : 'image sélectionnée');
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedUri = result.assets[0].uri;
        setImageUrl(selectedUri);
        setImportedImage(true);
        console.log('✅ Image importée:', selectedUri.substring(0, 50) + '...');
        
        // v5.3.51 - Analyser l'image avec l'IA pour détecter les caractéristiques
        Alert.alert(
          '🔍 Analyser l\'image?',
          'Voulez-vous que l\'IA analyse automatiquement les caractéristiques physiques de cette image?',
          [
            { 
              text: 'Non, manuel', 
              style: 'cancel',
              onPress: () => autoGenerateDescription()
            },
            { 
              text: 'Oui, analyser',
              onPress: () => analyzeImageWithAI(selectedUri)
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Erreur import image:', error);
      Alert.alert(
        'Erreur', 
        'Impossible d\'importer l\'image: ' + (error.message || 'erreur inconnue')
      );
    }
  };
  
  // === PRENDRE UNE PHOTO AVEC LA CAMÉRA ===
  // v5.3.45 - Sans redimensionnement obligatoire + auto-génération description
  const takePhoto = async () => {
    try {
      // Demander la permission d'accès à la caméra
      const permResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permResult.status !== 'granted') {
        Alert.alert(
          'Permission requise', 
          'L\'accès à votre caméra est nécessaire pour prendre une photo.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Lancer la caméra - SANS RECADRAGE FORCÉ
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,  // v5.3.45 - Pas de recadrage obligatoire
        quality: 0.9,          // Qualité élevée
      });

      console.log('📸 Photo:', result.canceled ? 'annulée' : 'prise');
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        setImageUrl(photoUri);
        setImportedImage(true);
        console.log('✅ Photo prise:', photoUri.substring(0, 50) + '...');
        
        // v5.3.51 - Analyser la photo avec l'IA pour détecter les caractéristiques
        Alert.alert(
          '🔍 Analyser la photo?',
          'Voulez-vous que l\'IA analyse automatiquement les caractéristiques physiques de cette photo?',
          [
            { 
              text: 'Non, manuel', 
              style: 'cancel',
              onPress: () => autoGenerateDescription()
            },
            { 
              text: 'Oui, analyser',
              onPress: () => analyzeImageWithAI(photoUri)
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Erreur prise photo:', error);
      Alert.alert(
        'Erreur', 
        'Impossible de prendre la photo: ' + (error.message || 'erreur inconnue')
      );
    }
  };
  
  // === ÉTAT POUR L'ANALYSE IA ===
  const [analyzingImage, setAnalyzingImage] = useState(false);

  // === ANALYSE D'IMAGE PAR IA ===
  // v5.3.51 - Utilise l'IA pour analyser l'image et détecter les caractéristiques physiques
  const analyzeImageWithAI = async (imageUri) => {
    try {
      setAnalyzingImage(true);
      console.log('🔍 Analyse IA de l\'image...');
      
      // Convertir l'image en base64
      let base64Image = '';
      try {
        const imageData = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        base64Image = imageData;
        console.log('📸 Image convertie en base64:', base64Image.length, 'caractères');
      } catch (e) {
        console.error('❌ Erreur conversion base64:', e);
        throw new Error('Impossible de lire l\'image');
      }
      
      // Prompt pour l'analyse détaillée
      const analysisPrompt = `Analyse cette image d'une personne et décris PRÉCISÉMENT ses caractéristiques physiques visibles.
      
Réponds UNIQUEMENT avec un JSON valide dans ce format exact (sans texte avant ou après):
{
  "gender": "female" ou "male",
  "ageEstimate": nombre estimé (18-80),
  "hairColor": "couleur en français (noir, brun, châtain, blond, roux, blanc, gris, etc.)",
  "hairLength": "très courts, courts, mi-longs, longs, ou très longs",
  "hairStyle": "description du style (lisses, ondulés, bouclés, frisés, etc.)",
  "eyeColor": "couleur en français (marron, noisette, vert, bleu, gris, noir, ambre)",
  "skinTone": "très claire, claire, mate, bronzée, caramel, ou ébène",
  "bodyType": "mince, élancée, moyenne, athlétique, voluptueuse, généreuse, ronde, ou pulpeuse",
  "bustSize": "A, B, C, D, DD, E, F, G ou H (si femme visible)",
  "heightEstimate": "petite (150-160), moyenne (160-170), grande (170-180), très grande (180+)",
  "faceShape": "ovale, rond, carré, en cœur, allongé",
  "distinctiveFeatures": "liste des traits distinctifs (taches de rousseur, grain de beauté, fossettes, etc.)",
  "expression": "expression du visage",
  "clothing": "description des vêtements visibles",
  "fullDescription": "description physique complète et détaillée en français (3-4 phrases)"
}

IMPORTANT: Réponds UNIQUEMENT avec le JSON, sans aucun texte explicatif.`;

      // Appeler l'API Pollinations Vision
      const response = await axios.post(
        'https://text.pollinations.ai/',
        {
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: analysisPrompt },
                { 
                  type: 'image_url', 
                  image_url: { url: `data:image/jpeg;base64,${base64Image}` }
                }
              ]
            }
          ],
          model: 'openai',
          jsonMode: true,
        },
        { 
          timeout: 60000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      let analysisText = response.data;
      if (typeof analysisText !== 'string') {
        analysisText = JSON.stringify(analysisText);
      }
      
      console.log('📝 Réponse IA brute:', analysisText.substring(0, 500));
      
      // Extraire le JSON de la réponse
      let analysis = null;
      try {
        // Chercher un bloc JSON dans la réponse
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          analysis = JSON.parse(analysisText);
        }
      } catch (e) {
        console.error('❌ Erreur parsing JSON:', e);
        throw new Error('L\'IA n\'a pas pu analyser l\'image correctement');
      }
      
      console.log('✅ Analyse IA réussie:', analysis);
      
      // Appliquer les résultats aux champs du formulaire
      if (analysis) {
        // Genre
        if (analysis.gender) {
          setGender(analysis.gender === 'male' ? 'male' : 'female');
        }
        
        // Âge
        if (analysis.ageEstimate) {
          setAge(String(Math.max(18, Math.min(80, analysis.ageEstimate))));
        }
        
        // Cheveux
        if (analysis.hairColor) {
          // Normaliser la couleur des cheveux
          const hairColorMap = {
            'noir': 'noirs', 'noire': 'noirs', 'noirs': 'noirs',
            'brun': 'bruns', 'brune': 'bruns', 'bruns': 'bruns',
            'châtain': 'châtains', 'chatain': 'châtains',
            'blond': 'blonds', 'blonde': 'blonds', 'blonds': 'blonds',
            'roux': 'roux', 'rousse': 'roux',
            'blanc': 'blancs', 'blanche': 'blancs', 'gris': 'gris', 'argenté': 'gris',
          };
          const normalizedHair = hairColorMap[analysis.hairColor.toLowerCase()] || analysis.hairColor;
          setHairColor(normalizedHair);
        }
        
        if (analysis.hairLength) {
          setHairLength(analysis.hairLength);
        }
        
        // Yeux
        if (analysis.eyeColor) {
          setEyeColor(analysis.eyeColor.toLowerCase());
        }
        
        // Peau
        if (analysis.skinTone) {
          setSkinTone(analysis.skinTone.toLowerCase());
        }
        
        // Morphologie
        if (analysis.bodyType) {
          setBodyType(analysis.bodyType.toLowerCase());
        }
        
        // Poitrine (femmes)
        if (analysis.gender === 'female' && analysis.bustSize) {
          setBust(analysis.bustSize.toUpperCase());
        }
        
        // Taille estimée
        if (analysis.heightEstimate) {
          const heightMap = {
            'petite': '155', 'moyenne': '165', 'grande': '175', 'très grande': '180'
          };
          const heightKey = analysis.heightEstimate.split(' ')[0].toLowerCase();
          setHeight(heightMap[heightKey] || '165');
        }
        
        // Description complète
        if (analysis.fullDescription) {
          setAppearance(analysis.fullDescription);
        } else {
          // Générer une description à partir des données
          generateDetailedDescription(analysis);
        }
        
        Alert.alert(
          '✅ Analyse terminée',
          'Les caractéristiques physiques ont été détectées et appliquées aux champs du formulaire.\n\nVérifiez et ajustez si nécessaire.',
          [{ text: 'OK' }]
        );
      }
      
      return analysis;
      
    } catch (error) {
      console.error('❌ Erreur analyse IA:', error);
      Alert.alert(
        '⚠️ Analyse impossible',
        'L\'analyse automatique a échoué. Veuillez remplir les champs manuellement.\n\nErreur: ' + (error.message || 'Erreur inconnue'),
        [{ text: 'OK' }]
      );
      // Générer une description par défaut
      autoGenerateDescription();
      return null;
    } finally {
      setAnalyzingImage(false);
    }
  };
  
  // === GÉNÉRATION DE DESCRIPTION DÉTAILLÉE ===
  const generateDetailedDescription = (analysis) => {
    const genderLabel = analysis.gender === 'female' ? 'Femme' : 'Homme';
    const genderAdj = analysis.gender === 'female' ? 'e' : '';
    
    let desc = `${genderLabel} de ${analysis.ageEstimate || 25} ans`;
    
    // Taille
    if (analysis.heightEstimate) {
      desc += `, de taille ${analysis.heightEstimate.split('(')[0].trim()}`;
    }
    
    // Silhouette
    if (analysis.bodyType) {
      desc += `, silhouette ${analysis.bodyType}`;
    }
    
    // Poitrine
    if (analysis.gender === 'female' && analysis.bustSize) {
      const bustDescMap = {
        'A': 'petite', 'B': 'menue', 'C': 'moyenne', 'D': 'généreuse',
        'DD': 'opulente', 'E': 'opulente', 'F': 'très généreuse', 'G': 'imposante', 'H': 'très imposante'
      };
      desc += `, poitrine ${bustDescMap[analysis.bustSize] || 'harmonieuse'} (bonnet ${analysis.bustSize})`;
    }
    
    desc += '. ';
    
    // Cheveux
    if (analysis.hairColor || analysis.hairLength) {
      desc += `Cheveux ${analysis.hairLength || 'mi-longs'} ${analysis.hairColor || ''}`;
      if (analysis.hairStyle) {
        desc += ` ${analysis.hairStyle}`;
      }
    }
    
    // Yeux
    if (analysis.eyeColor) {
      desc += `, yeux ${analysis.eyeColor}`;
    }
    
    // Peau
    if (analysis.skinTone) {
      desc += `, teint ${analysis.skinTone}`;
    }
    
    // Traits distinctifs
    if (analysis.distinctiveFeatures && analysis.distinctiveFeatures.length > 0) {
      const features = Array.isArray(analysis.distinctiveFeatures) 
        ? analysis.distinctiveFeatures.join(', ')
        : analysis.distinctiveFeatures;
      if (features && features !== 'aucun' && features !== 'none') {
        desc += `. Traits distinctifs: ${features}`;
      }
    }
    
    // Forme du visage
    if (analysis.faceShape) {
      desc += `. Visage ${analysis.faceShape}`;
    }
    
    desc = desc.trim();
    if (!desc.endsWith('.')) desc += '.';
    
    setAppearance(desc);
    console.log('📝 Description détaillée générée:', desc);
  };

  // === AUTO-GÉNÉRATION DE LA DESCRIPTION PHYSIQUE (fallback) ===
  const autoGenerateDescription = () => {
    const genderLabel = gender === 'female' ? 'Femme' : 'Homme';
    const genderAdj = gender === 'female' ? 'e' : '';
    
    let desc = `${genderLabel} de ${age || '25'} ans`;
    desc += `, mesurant ${height || '165'}cm`;
    desc += `, silhouette ${bodyType || 'moyenne'}`;
    
    if (gender === 'female') {
      const bustDesc = bust === 'A' ? 'petite' : bust === 'B' ? 'menue' : bust === 'C' ? 'moyenne' : 
                       bust === 'D' ? 'généreuse' : bust === 'DD' || bust === 'E' ? 'opulente' : 
                       bust === 'F' || bust === 'G' || bust === 'H' ? 'très généreuse' : 'harmonieuse';
      desc += `, poitrine ${bustDesc} (bonnet ${bust || 'C'})`;
    } else if (gender === 'male') {
      desc += `, ${penis || '17'}cm`;
    }
    
    desc += '. ';
    desc += `Cheveux ${hairLength || 'longs'} ${hairColor || 'bruns'}`;
    desc += `, yeux ${eyeColor || 'marron'} expressifs`;
    desc += `, teint de peau ${skinTone || 'claire'}`;
    desc = desc.trim() + '.';
    
    setAppearance(desc);
    console.log('📝 Description auto-générée:', desc);
    return desc;
  };

  // === GÉNÉRER DESCRIPTION PHYSIQUE AUTO ===
  const generatePhysicalDescription = () => {
    const genderLabel = gender === 'female' ? 'Femme' : 'Homme';
    const genderAdj = gender === 'female' ? 'e' : '';
    const bustOrPenis = gender === 'female' ? `, poitrine bonnet ${bust}` : `, ${penis}cm`;
    
    const desc = `${genderLabel} de ${age} ans, ${height}cm, silhouette ${bodyType}${bustOrPenis}. ` +
      `Cheveux ${hairLength} ${hairColor || 'naturels'}, yeux ${eyeColor}, peau ${skinTone}. ` +
      `${appearance || ''}`.trim();
    
    return desc;
  };

  // === GÉNÉRER PROMPT IMAGE ===
  const generateImagePrompt = () => {
    const genderEn = gender === 'female' ? 'woman' : 'man';
    const bodyEn = {
      'mince': 'slim', 'élancée': 'slender', 'moyenne': 'average',
      'athlétique': 'athletic', 'voluptueuse': 'voluptuous curvy',
      'généreuse': 'generous full-figured', 'ronde': 'plump chubby',
      'pulpeuse': 'curvaceous thick'
    }[bodyType] || 'average';
    
    const hairEn = hairLength === 'très courts' ? 'very short' :
      hairLength === 'courts' ? 'short' : hairLength === 'mi-longs' ? 'medium length' :
      hairLength === 'longs' ? 'long' : 'very long';
    
    let prompt = `beautiful ${age}yo ${genderEn}, ${bodyEn} body, ${hairEn} ${hairColor || 'natural'} hair, ${eyeColor} eyes`;
    
    if (gender === 'female' && bust) {
      prompt += `, ${bust} cup breasts`;
    }
    
    return prompt;
  };

  const generateCharacterImage = async () => {
    // Vérifier le statut premium
    if (!isPremium) {
      Alert.alert(
        '💎 Fonctionnalité Premium',
        'La génération d\'images est réservée aux membres Premium.\n\nVous pouvez créer votre personnage sans image, ou devenir Premium pour cette fonctionnalité.',
        [
          { text: 'Créer sans image', style: 'cancel' },
          { 
            text: 'Devenir Premium', 
            onPress: () => navigation.navigate('Premium')
          }
        ]
      );
      return;
    }

    if (!appearance && !hairColor) {
      Alert.alert('Info', 'Remplissez au moins l\'apparence et l\'âge pour générer une image');
      return;
    }

    if (!age || parseInt(age) < 18) {
      Alert.alert('Erreur', 'L\'âge doit être supérieur ou égal à 18 ans');
      return;
    }

    setGeneratingImage(true);
    try {
      // Créer un objet character temporaire pour utiliser le service
      const tempCharacter = {
        name: name || 'Personnage',
        age: parseInt(age),
        gender,
        hairColor,
        appearance,
        bust: gender === 'female' ? bust : undefined,
        penis: gender === 'male' ? `${penis}cm` : undefined,
      };
      
      // Charger le profil utilisateur pour le mode NSFW
      const profile = await UserProfileService.getProfile();
      
      // Utiliser le service qui a les descriptions explicites + mode NSFW
      const url = await ImageGenerationService.generateCharacterImage(tempCharacter, profile);
      setImageUrl(url);
      Alert.alert('Succès', 'Image générée ! Vous pouvez maintenant sauvegarder le personnage.');
    } catch (error) {
      if (error.message?.includes('Premium') || error.message?.includes('403')) {
        Alert.alert(
          '💎 Premium Requis',
          'Vous devez être membre Premium pour générer des images.'
        );
      } else {
        Alert.alert('Erreur', error.message || 'Impossible de générer l\'image');
      }
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSave = async () => {
    if (!name || !age || !personality || !scenario || !startMessage) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      // Générer la description physique automatiquement si vide
      const finalAppearance = appearance || generatePhysicalDescription();
      const finalImagePrompt = generateImagePrompt();
      
      const character = {
        name,
        age: parseInt(age),
        gender,
        // === APPARENCE DÉTAILLÉE ===
        hairColor,
        hairLength,
        eyeColor,
        height: `${height} cm`,
        bodyType,
        skinTone,
        appearance: finalAppearance,
        physicalDescription: generatePhysicalDescription(),
        imagePrompt: finalImagePrompt,
        ...(gender === 'female' ? { bust } : { penis: `${penis}cm` }),
        // === PERSONNALITÉ ===
        personality,
        temperament,
        temperamentDetails: {
          emotionnel: `Personnage ${temperament}, ${personality.substring(0, 100)}...`,
          seduction: gender === 'female' ? 'Séduction féminine' : 'Séduction masculine',
          intimite: 'Adapté selon la relation',
          communication: `Style ${temperament}`,
          reactions: 'Réactions naturelles',
        },
        // === TAGS ===
        tags: [
          temperament, 
          'personnalisé', 
          gender === 'female' ? 'femme' : 'homme',
          bodyType,
        ].filter(Boolean),
        // === SCÉNARIO ===
        scenario,
        description: scenario,
        startMessage,
        // === MÉTADONNÉES ===
        imageUrl: imageUrl || undefined,
        isCustom: true,
        isPublic: isPublic,
      };

      let savedCharacter;
      if (isEditing) {
        savedCharacter = await CustomCharacterService.updateCustomCharacter(characterToEdit.id, character);
        
        if (imageUrl && imageUrl !== characterToEdit.imageUrl) {
          await GalleryService.saveImageToGallery(characterToEdit.id, imageUrl);
        }
        
        Alert.alert('✅ Succès', 'Personnage modifié !', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        savedCharacter = await CustomCharacterService.saveCustomCharacter(character, isPublic);
        
        if (imageUrl && savedCharacter.id) {
          await GalleryService.saveImageToGallery(savedCharacter.id, imageUrl);
        }
        
        Alert.alert('✅ Succès', 'Personnage créé !', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('❌ Erreur', 'Impossible de sauvegarder le personnage');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        {isEditing ? 'Modifier le personnage' : 'Créer un personnage'}
      </Text>

      {/* Section Import depuis sources externes */}
      <View style={styles.importSection}>
        <Text style={styles.sectionTitle}>🌐 Importer depuis une source externe</Text>
        <View style={styles.importSourceRow}>
          <TouchableOpacity
            style={[styles.sourceButton, importSource === 'chub' && styles.sourceButtonActive]}
            onPress={() => setImportSource('chub')}
          >
            <Text style={[styles.sourceButtonText, importSource === 'chub' && styles.sourceButtonTextActive]}>Chub AI</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sourceButton, importSource === 'characterhub' && styles.sourceButtonActive]}
            onPress={() => setImportSource('characterhub')}
          >
            <Text style={[styles.sourceButtonText, importSource === 'characterhub' && styles.sourceButtonTextActive]}>CharacterHub</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sourceButton, importSource === 'janitorai' && styles.sourceButtonActive]}
            onPress={() => setImportSource('janitorai')}
          >
            <Text style={[styles.sourceButtonText, importSource === 'janitorai' && styles.sourceButtonTextActive]}>JanitorAI</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.importUrlInput}
          placeholder={`URL du personnage ${importSource === 'chub' ? 'Chub AI' : importSource === 'characterhub' ? 'CharacterHub' : 'JanitorAI'}`}
          value={importUrl}
          onChangeText={setImportUrl}
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity
          style={styles.importButton}
          onPress={importCharacterFromSource}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.importButtonText}>📥 Importer le personnage</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Section Image */}
      <View style={styles.imageSection}>
        <Text style={styles.sectionTitle}>📸 Photo du personnage</Text>
        {imageUrl ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: imageUrl }} style={styles.previewImage} />
            {/* Overlay d'analyse IA */}
            {analyzingImage && (
              <View style={styles.analyzingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.analyzingText}>🔍 Analyse IA en cours...</Text>
                <Text style={styles.analyzingSubtext}>Détection des caractéristiques</Text>
              </View>
            )}
            <View style={styles.imageButtonsRow}>
              <TouchableOpacity
                style={styles.imageActionButton}
                onPress={pickImage}
                disabled={analyzingImage}
              >
                <Text style={styles.imageActionButtonText}>🖼️ Galerie</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imageActionButton}
                onPress={takePhoto}
                disabled={analyzingImage}
              >
                <Text style={styles.imageActionButtonText}>📷 Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.imageActionButton, styles.analyzeButton]}
                onPress={() => analyzeImageWithAI(imageUrl)}
                disabled={analyzingImage}
              >
                <Text style={styles.imageActionButtonText}>
                  {analyzingImage ? '...' : '🔍 Analyser'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.imageActionButton, styles.regenerateButton]}
                onPress={generateCharacterImage}
                disabled={generatingImage || !isPremium || analyzingImage}
              >
                <Text style={styles.imageActionButtonText}>
                  {generatingImage ? '...' : '🎨 IA'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.imageActionButton, styles.deleteImageButton]}
                onPress={() => { setImageUrl(''); setImportedImage(false); }}
                disabled={analyzingImage}
              >
                <Text style={styles.imageActionButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.imageOptionsContainer}>
            {/* Ligne 1: Options d'import */}
            <View style={styles.importOptionsRow}>
              {/* Option 1: Galerie */}
              <TouchableOpacity
                style={styles.importImageButton}
                onPress={pickImage}
              >
                <Text style={styles.importImageIcon}>🖼️</Text>
                <Text style={styles.importImageText}>Galerie</Text>
                <Text style={styles.importImageHint}>Choisir une image</Text>
              </TouchableOpacity>
              
              {/* Option 2: Caméra */}
              <TouchableOpacity
                style={styles.cameraImageButton}
                onPress={takePhoto}
              >
                <Text style={styles.importImageIcon}>📷</Text>
                <Text style={styles.cameraImageText}>Caméra</Text>
                <Text style={styles.importImageHint}>Prendre une photo</Text>
              </TouchableOpacity>
            </View>
            
            {/* Ligne 2: Génération IA */}
            <TouchableOpacity
              style={[styles.generateImageButton, !isPremium && styles.generateImageButtonLocked]}
              onPress={generateCharacterImage}
              disabled={generatingImage || !isPremium}
            >
              {generatingImage ? (
                <ActivityIndicator size="large" color="#6366f1" />
              ) : (
                <>
                  <Text style={styles.generateImageIcon}>{isPremium ? '🎨' : '🔒'}</Text>
                  <Text style={styles.generateImageText}>
                    {isPremium ? 'Générer avec IA' : 'Générer (Premium)'}
                  </Text>
                  <Text style={styles.generateImageHint}>
                    {isPremium 
                      ? 'Basé sur la description physique'
                      : '💎 Fonctionnalité Premium'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.label}>Nom *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ex: Emma Laurent"
      />

      <Text style={styles.label}>Âge *</Text>
      <TextInput
        style={styles.input}
        value={age}
        onChangeText={setAge}
        placeholder="Ex: 25"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Genre</Text>
      <View style={styles.genderContainer}>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'female' && styles.genderButtonActive]}
          onPress={() => setGender('female')}
        >
          <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
            Femme
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'male' && styles.genderButtonActive]}
          onPress={() => setGender('male')}
        >
          <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
            Homme
          </Text>
        </TouchableOpacity>
      </View>

      {gender === 'female' ? (
        <>
          <Text style={styles.label}>Taille de poitrine</Text>
          <View style={styles.sizeContainer}>
            {bustSizes.map(size => (
              <TouchableOpacity
                key={size}
                style={[styles.sizeButton, bust === size && styles.sizeButtonActive]}
                onPress={() => setBust(size)}
              >
                <Text style={[styles.sizeText, bust === size && styles.sizeTextActive]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.label}>Taille (cm)</Text>
          <TextInput
            style={styles.input}
            value={penis}
            onChangeText={setPenis}
            placeholder="Ex: 17"
            keyboardType="numeric"
          />
        </>
      )}

      <Text style={styles.label}>Couleur de cheveux</Text>
      <TextInput
        style={styles.input}
        value={hairColor}
        onChangeText={setHairColor}
        placeholder="Ex: blonde, brune, rousse, noir, roux..."
      />

      <Text style={styles.label}>Longueur des cheveux</Text>
      <View style={styles.choiceContainer}>
        {hairLengths.map(length => (
          <TouchableOpacity
            key={length}
            style={[styles.choiceButton, hairLength === length && styles.choiceButtonActive]}
            onPress={() => setHairLength(length)}
          >
            <Text style={[styles.choiceText, hairLength === length && styles.choiceTextActive]}>
              {length}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Couleur des yeux</Text>
      <View style={styles.choiceContainer}>
        {eyeColors.map(color => (
          <TouchableOpacity
            key={color}
            style={[styles.choiceButton, eyeColor === color && styles.choiceButtonActive]}
            onPress={() => setEyeColor(color)}
          >
            <Text style={[styles.choiceText, eyeColor === color && styles.choiceTextActive]}>
              {color}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Taille (cm)</Text>
      <TextInput
        style={styles.input}
        value={height}
        onChangeText={setHeight}
        placeholder="Ex: 165"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Morphologie</Text>
      <View style={styles.choiceContainer}>
        {bodyTypes.map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.choiceButton, bodyType === type && styles.choiceButtonActive]}
            onPress={() => setBodyType(type)}
          >
            <Text style={[styles.choiceText, bodyType === type && styles.choiceTextActive]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Couleur de peau</Text>
      <View style={styles.choiceContainer}>
        {skinTones.map(tone => (
          <TouchableOpacity
            key={tone}
            style={[styles.choiceButton, skinTone === tone && styles.choiceButtonActive]}
            onPress={() => setSkinTone(tone)}
          >
            <Text style={[styles.choiceText, skinTone === tone && styles.choiceTextActive]}>
              {tone}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.labelRow}>
        <View>
          <Text style={styles.label}>Apparence détaillée</Text>
          <Text style={styles.labelHint}>Basée sur les champs ci-dessus</Text>
        </View>
        <TouchableOpacity 
          style={styles.generateDescButton}
          onPress={autoGenerateDescription}
        >
          <Text style={styles.generateDescButtonText}>🔄 Générer</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={appearance}
        onChangeText={setAppearance}
        placeholder="Description supplémentaire (visage, style, particularités...)"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Personnalité *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={personality}
        onChangeText={setPersonality}
        placeholder="Traits de personnalité..."
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Tempérament</Text>
      <View style={styles.tempContainer}>
        {temperaments.map(temp => (
          <TouchableOpacity
            key={temp.id}
            style={[styles.tempButton, temperament === temp.id && styles.tempButtonActive]}
            onPress={() => setTemperament(temp.id)}
          >
            <Text style={[styles.tempText, temperament === temp.id && styles.tempTextActive]}>
              {temp.label}
            </Text>
            <Text style={[styles.tempDesc, temperament === temp.id && styles.tempDescActive]}>
              {temp.desc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Scénario de rencontre *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={scenario}
        onChangeText={setScenario}
        placeholder="Comment vous rencontrez ce personnage..."
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>Message de départ *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={startMessage}
        onChangeText={setStartMessage}
        placeholder="Premier message du personnage (utilisez *actions* et 'dialogues')..."
        multiline
        numberOfLines={4}
      />

      {/* Section Public/Privé */}
      <View style={styles.publicSection}>
        <View style={styles.publicHeader}>
          <View style={styles.publicInfo}>
            <Text style={styles.publicTitle}>🌐 Partager publiquement</Text>
            <Text style={styles.publicDescription}>
              Rendre ce personnage visible par tous les utilisateurs
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={(value) => {
              setIsPublic(value);
              if (value) checkServerStatus();
            }}
            trackColor={{ false: '#d1d5db', true: '#6366f1' }}
            thumbColor={isPublic ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        {isPublic && (
          <View style={styles.publicStatus}>
            {serverOnline === null ? (
              <Text style={styles.statusChecking}>⏳ Vérification du serveur...</Text>
            ) : serverOnline ? (
              <Text style={styles.statusOnline}>✅ Serveur en ligne - Prêt à publier</Text>
            ) : (
              <Text style={styles.statusOffline}>⚠️ Serveur hors ligne - Sera publié plus tard</Text>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>
          {isEditing ? '💾 Sauvegarder' : isPublic ? '🌐 Créer et Partager' : '✨ Créer'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#6366f1',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  genderText: {
    fontSize: 16,
    color: '#6b7280',
  },
  genderTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  sizeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  sizeButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  sizeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  sizeTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  tempContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tempButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    minWidth: '45%',
    marginBottom: 4,
  },
  tempButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  tempText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  tempTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  tempDesc: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  tempDescActive: {
    color: '#e0e7ff',
  },
  // === Choix multiples ===
  choiceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 5,
  },
  choiceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  choiceButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  choiceText: {
    fontSize: 13,
    color: '#6b7280',
  },
  choiceTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  labelHint: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 15,
    marginBottom: 8,
  },
  generateDescButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  generateDescButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // === Options d'image ===
  imageOptionsContainer: {
    gap: 12,
  },
  importOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  importImageButton: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  cameraImageButton: {
    flex: 1,
    padding: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  importImageIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  importImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
  },
  cameraImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  importImageHint: {
    fontSize: 11,
    color: '#6b7280',
  },
  imageButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  imageActionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    alignItems: 'center',
  },
  imageActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4338ca',
  },
  deleteImageButton: {
    backgroundColor: '#fee2e2',
    flex: 0.4,
  },
  analyzeButton: {
    backgroundColor: '#fef3c7',
    flex: 0.8,
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 10,
  },
  analyzingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
  },
  analyzingSubtext: {
    color: '#e0e7ff',
    fontSize: 13,
    marginTop: 5,
  },
  saveButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  importSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  importSourceRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  sourceButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 5,
    alignItems: 'center',
  },
  sourceButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  sourceButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  sourceButtonTextActive: {
    color: '#fff',
  },
  importUrlInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
    color: '#374151',
  },
  importButton: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  imageSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 15,
  },
  generateImageButton: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  generateImageButtonLocked: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  generateImageIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  generateImageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 5,
  },
  generateImageHint: {
    fontSize: 12,
    color: '#6b7280',
  },
  imagePreview: {
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 15,
  },
  regenerateButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  regenerateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Styles pour public/privé
  publicSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  publicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  publicInfo: {
    flex: 1,
    marginRight: 15,
  },
  publicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4338ca',
    marginBottom: 4,
  },
  publicDescription: {
    fontSize: 13,
    color: '#6366f1',
  },
  publicStatus: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#c7d2fe',
  },
  statusChecking: {
    fontSize: 13,
    color: '#6b7280',
  },
  statusOnline: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
  statusOffline: {
    fontSize: 13,
    color: '#d97706',
    fontWeight: '500',
  },
});
