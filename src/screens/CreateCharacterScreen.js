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
  const { characterToEdit, isBuiltIn } = route.params || {};
  const isEditing = !!characterToEdit;
  const isEditingBuiltIn = isBuiltIn && isEditing; // v5.4.20 - Modification d'un personnage intégré

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
  
  // v5.4.20 - Tags personnalisables
  const [tags, setTags] = useState(characterToEdit?.tags?.join(', ') || '');
  
  // === LISTES DE CHOIX ===
  const hairLengths = ['très courts', 'courts', 'mi-longs', 'longs', 'très longs'];
  const eyeColors = ['marron', 'noisette', 'vert', 'bleu', 'gris', 'noir', 'ambre', 'violet'];
  const bodyTypes = ['mince', 'élancée', 'moyenne', 'athlétique', 'voluptueuse', 'généreuse', 'ronde', 'pulpeuse'];
  const skinTones = ['très claire', 'claire', 'mate', 'bronzée', 'caramel', 'ébène'];

  // Vérifier le statut premium au montage
  React.useEffect(() => {
    checkPremiumStatus();
  }, []);

  // v5.4.21 - Extraire les données des personnages intégrés lors de l'édition
  React.useEffect(() => {
    if (characterToEdit && isBuiltIn) {
      console.log('📝 Extraction des données du personnage intégré:', characterToEdit.name);
      
      // Extraire les infos de physicalDescription ou appearance
      const physDesc = (characterToEdit.physicalDescription || characterToEdit.appearance || '').toLowerCase();
      
      // Nom, âge, genre - devraient exister
      if (characterToEdit.name) setName(characterToEdit.name);
      if (characterToEdit.age) setAge(String(characterToEdit.age));
      if (characterToEdit.gender) setGender(characterToEdit.gender);
      
      // Apparence - utiliser la description complète
      if (characterToEdit.appearance) setAppearance(characterToEdit.appearance);
      else if (characterToEdit.physicalDescription) setAppearance(characterToEdit.physicalDescription);
      
      // Personnalité
      if (characterToEdit.personality) setPersonality(characterToEdit.personality);
      
      // Tempérament
      if (characterToEdit.temperament) setTemperament(characterToEdit.temperament);
      
      // Scénario
      if (characterToEdit.scenario) setScenario(characterToEdit.scenario);
      else if (characterToEdit.description) setScenario(characterToEdit.description);
      
      // Message de départ
      if (characterToEdit.startMessage) setStartMessage(characterToEdit.startMessage);
      else if (characterToEdit.greeting) setStartMessage(characterToEdit.greeting);
      
      // Cheveux - extraire de physicalDescription si non défini
      if (characterToEdit.hairColor) {
        setHairColor(characterToEdit.hairColor);
      } else {
        // Détecter la couleur de cheveux
        if (physDesc.includes('noir')) setHairColor('noirs');
        else if (physDesc.includes('brun') || physDesc.includes('châtain')) setHairColor('bruns');
        else if (physDesc.includes('blond')) setHairColor('blonds');
        else if (physDesc.includes('roux') || physDesc.includes('rousse')) setHairColor('roux');
        else if (physDesc.includes('blanc') || physDesc.includes('argenté') || physDesc.includes('gris')) setHairColor('gris');
      }
      
      // Longueur de cheveux
      if (characterToEdit.hairLength) {
        setHairLength(characterToEdit.hairLength);
      } else {
        if (physDesc.includes('très courts')) setHairLength('très courts');
        else if (physDesc.includes('courts')) setHairLength('courts');
        else if (physDesc.includes('mi-longs')) setHairLength('mi-longs');
        else if (physDesc.includes('très longs')) setHairLength('très longs');
        else if (physDesc.includes('longs')) setHairLength('longs');
      }
      
      // Yeux
      if (characterToEdit.eyeColor) {
        setEyeColor(characterToEdit.eyeColor);
      } else {
        if (physDesc.includes('yeux marron')) setEyeColor('marron');
        else if (physDesc.includes('yeux bleu')) setEyeColor('bleu');
        else if (physDesc.includes('yeux vert')) setEyeColor('vert');
        else if (physDesc.includes('yeux gris')) setEyeColor('gris');
        else if (physDesc.includes('yeux noisette')) setEyeColor('noisette');
        else if (physDesc.includes('yeux noir')) setEyeColor('noir');
      }
      
      // Taille
      if (characterToEdit.height) {
        const heightNum = characterToEdit.height.replace(/\D/g, '');
        if (heightNum) setHeight(heightNum);
      } else {
        const heightMatch = physDesc.match(/(\d{3})\s*cm/);
        if (heightMatch) setHeight(heightMatch[1]);
      }
      
      // Morphologie
      if (characterToEdit.bodyType) {
        setBodyType(characterToEdit.bodyType);
      } else {
        if (physDesc.includes('mince') || physDesc.includes('svelte')) setBodyType('mince');
        else if (physDesc.includes('athlétique') || physDesc.includes('sportif')) setBodyType('athlétique');
        else if (physDesc.includes('voluptu')) setBodyType('voluptueuse');
        else if (physDesc.includes('généreus')) setBodyType('généreuse');
        else if (physDesc.includes('rond')) setBodyType('ronde');
        else if (physDesc.includes('pulpeu')) setBodyType('pulpeuse');
        else if (physDesc.includes('élanc')) setBodyType('élancée');
      }
      
      // Peau
      if (characterToEdit.skinTone) {
        setSkinTone(characterToEdit.skinTone);
      } else {
        if (physDesc.includes('ébène') || physDesc.includes('noire')) setSkinTone('ébène');
        else if (physDesc.includes('caramel')) setSkinTone('caramel');
        else if (physDesc.includes('bronzé')) setSkinTone('bronzée');
        else if (physDesc.includes('mate')) setSkinTone('mate');
        else if (physDesc.includes('très claire') || physDesc.includes('porcelaine')) setSkinTone('très claire');
        else if (physDesc.includes('claire') || physDesc.includes('pâle')) setSkinTone('claire');
      }
      
      // Poitrine (femmes)
      if (characterToEdit.gender === 'female' && characterToEdit.bust) {
        setBust(characterToEdit.bust);
      } else if (characterToEdit.gender === 'female') {
        const bustMatch = physDesc.match(/bonnet\s*([A-H])/i);
        if (bustMatch) setBust(bustMatch[1].toUpperCase());
      }
      
      // Pénis (hommes)
      if (characterToEdit.gender === 'male' && characterToEdit.penis) {
        const penisNum = characterToEdit.penis.replace(/\D/g, '');
        if (penisNum) setPenis(penisNum);
      }
      
      // Tags
      if (characterToEdit.tags && Array.isArray(characterToEdit.tags)) {
        setTags(characterToEdit.tags.join(', '));
      }
      
      // Image
      if (characterToEdit.imageUrl) {
        setImageUrl(characterToEdit.imageUrl);
      }
      
      console.log('✅ Données du personnage intégré extraites');
    }
  }, [characterToEdit, isBuiltIn]);

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

  // === v5.4.37 - ANALYSE D'IMAGE AVEC POLLINATIONS VISION (GRATUIT) ===
  const analyzeImageWithAI = async (imageUri) => {
    try {
      setAnalyzingImage(true);
      console.log('🔍 v5.4.37 - Analyse avec Pollinations Vision...');
      
      let analysis = null;
      
      // === MÉTHODE 1: Pollinations Vision API (GPT-4o gratuit) ===
      try {
        console.log('📸 Conversion image en base64...');
        
        // Convertir l'image en base64
        let base64Image = null;
        
        if (imageUri.startsWith('data:')) {
          // Déjà en base64
          base64Image = imageUri;
        } else if (imageUri.startsWith('file://') || imageUri.startsWith('/')) {
          // Fichier local - lire et convertir
          const base64Data = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          base64Image = `data:image/jpeg;base64,${base64Data}`;
        } else if (imageUri.startsWith('http')) {
          // URL externe - utiliser directement
          base64Image = imageUri;
        }
        
        if (!base64Image) {
          throw new Error('Impossible de traiter l\'image');
        }
        
        // Limiter la taille (max 1MB en base64)
        if (base64Image.length > 1500000) {
          console.log('⚠️ Image trop grande, réduction...');
          base64Image = base64Image.substring(0, 1500000);
        }
        
        console.log('🌐 Appel Pollinations Vision API...');
        
        const visionPrompt = `Analyse cette image et décris UNIQUEMENT ce que tu VOIS. Réponds en JSON:
{
  "gender": "female" ou "male",
  "ageEstimate": nombre entre 18 et 60,
  "hairColor": "noir", "brun", "châtain", "blond", "roux", "blanc", "rose", "bleu" ou autre,
  "hairLength": "courts", "mi-longs", "longs" ou "très longs",
  "eyeColor": "marron", "noisette", "vert", "bleu", "gris" ou "noir",
  "skinTone": "très claire", "claire", "mate", "bronzée", "caramel" ou "ébène",
  "bodyType": "mince", "élancée", "moyenne", "athlétique", "voluptueuse", "généreuse" ou "ronde",
  "bustSize": "A", "B", "C", "D", "DD", "E" ou "F" (pour les femmes),
  "fullDescription": "Description en 2-3 phrases"
}
IMPORTANT: Décris UNIQUEMENT ce que tu vois dans l'image! JSON seulement:`;

        const response = await axios.post(
          'https://text.pollinations.ai/',
          {
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: visionPrompt },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: base64Image,
                      detail: 'high'
                    } 
                  }
                ]
              }
            ],
            model: 'openai',  // GPT-4o avec vision
            temperature: 0.3,
          },
          { 
            timeout: 60000,
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        let responseText = response.data;
        if (typeof responseText !== 'string') {
          responseText = JSON.stringify(responseText);
        }
        console.log('📝 Réponse Vision:', responseText.substring(0, 500));
        
        // Parser la réponse JSON
        const parsed = parseAnalysisResponse(responseText);
        if (parsed && isValidAnalysis(parsed)) {
          analysis = parsed;
          analysis._method = 'Pollinations Vision';
          console.log('✅ Analyse Vision réussie!');
        }
      } catch (visionError) {
        console.log('⚠️ Pollinations Vision échoué:', visionError.message);
      }
      
      // === MÉTHODE 2: Fallback avec génération aléatoire variée ===
      if (!analysis) {
        console.log('🔄 Fallback: génération locale variée...');
        analysis = generateRandomProfile();
        analysis._method = 'Local';
      }
      
      // Appliquer l'analyse au formulaire
      console.log('✅ Profil appliqué:', JSON.stringify(analysis, null, 2));
      applyAnalysisToForm(analysis);
      
      // Message selon la méthode utilisée
      if (analysis._method === 'Pollinations Vision') {
        Alert.alert(
          '✅ Image analysée!',
          'L\'IA a détecté les caractéristiques de votre image.\n\n' +
          'Vérifiez que les informations sont correctes et ajustez si nécessaire.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '📝 Profil généré',
          'L\'analyse d\'image n\'a pas fonctionné.\nUn profil aléatoire a été créé.\n\n' +
          '⚠️ Modifiez les caractéristiques pour correspondre à votre image.',
          [{ text: 'Compris' }]
        );
      }
      
      return analysis;
      
    } catch (error) {
      console.error('❌ Erreur analyse:', error);
      const localProfile = generateRandomProfile();
      applyAnalysisToForm(localProfile);
      Alert.alert(
        '⚠️ Erreur',
        'Impossible d\'analyser l\'image.\nUn profil par défaut a été créé.',
        [{ text: 'OK' }]
      );
      return localProfile;
    } finally {
      setAnalyzingImage(false);
    }
  };
  
  // v5.4.33 - Extraire les caractéristiques d'une description en anglais
  const extractFeaturesFromCaption = (caption) => {
    if (!caption) return null;
    
    const result = {
      gender: 'female',
      ageEstimate: 25,
      hairColor: 'brun',
      hairLength: 'longs',
      eyeColor: 'marron',
      skinTone: 'claire',
      bodyType: 'moyenne',
      bustSize: 'C',
      fullDescription: caption,
    };
    
    // Détecter le genre
    if (caption.includes('man') || caption.includes('boy') || caption.includes('male') || caption.includes('guy')) {
      result.gender = 'male';
    } else if (caption.includes('woman') || caption.includes('girl') || caption.includes('female') || caption.includes('lady')) {
      result.gender = 'female';
    }
    
    // Détecter la couleur des cheveux
    if (caption.includes('blonde') || caption.includes('blond')) result.hairColor = 'blond';
    else if (caption.includes('brunette') || caption.includes('brown hair')) result.hairColor = 'brun';
    else if (caption.includes('black hair') || caption.includes('dark hair')) result.hairColor = 'noir';
    else if (caption.includes('red hair') || caption.includes('ginger') || caption.includes('redhead')) result.hairColor = 'roux';
    else if (caption.includes('white hair') || caption.includes('gray hair') || caption.includes('grey hair')) result.hairColor = 'blanc';
    else if (caption.includes('pink hair')) result.hairColor = 'rose';
    else if (caption.includes('blue hair')) result.hairColor = 'bleu';
    
    // Détecter la longueur des cheveux
    if (caption.includes('long hair')) result.hairLength = 'longs';
    else if (caption.includes('short hair')) result.hairLength = 'courts';
    else if (caption.includes('medium hair') || caption.includes('shoulder')) result.hairLength = 'mi-longs';
    
    // Détecter le teint
    if (caption.includes('dark skin') || caption.includes('black skin')) result.skinTone = 'ébène';
    else if (caption.includes('tan') || caption.includes('tanned')) result.skinTone = 'bronzée';
    else if (caption.includes('pale') || caption.includes('fair')) result.skinTone = 'très claire';
    
    // Détecter l'âge approximatif
    const ageMatch = caption.match(/(\d{2})\s*(?:year|ans|old)/);
    if (ageMatch) {
      result.ageEstimate = parseInt(ageMatch[1]);
    } else if (caption.includes('young')) {
      result.ageEstimate = 22;
    } else if (caption.includes('middle') || caption.includes('mature')) {
      result.ageEstimate = 40;
    } else if (caption.includes('old') || caption.includes('elder')) {
      result.ageEstimate = 55;
    }
    
    // Morphologie
    if (caption.includes('slim') || caption.includes('thin') || caption.includes('slender')) result.bodyType = 'mince';
    else if (caption.includes('curvy') || caption.includes('voluptuous')) result.bodyType = 'voluptueuse';
    else if (caption.includes('athletic') || caption.includes('fit') || caption.includes('muscular')) result.bodyType = 'athlétique';
    else if (caption.includes('plus') || caption.includes('large') || caption.includes('chubby')) result.bodyType = 'ronde';
    
    // Poitrine
    if (caption.includes('large breast') || caption.includes('big breast') || caption.includes('busty')) result.bustSize = 'DD';
    else if (caption.includes('small breast') || caption.includes('flat')) result.bustSize = 'A';
    
    return result;
  };
  
  // v5.4.33 - Parser une réponse simple (format: gender,hair,length,age,skin,body)
  const parseSimpleResponse = (text) => {
    if (!text) return null;
    
    const lower = text.toLowerCase();
    
    const result = {
      gender: 'female',
      ageEstimate: 25,
      hairColor: 'brun',
      hairLength: 'longs',
      eyeColor: 'marron',
      skinTone: 'claire',
      bodyType: 'moyenne',
      bustSize: 'C',
      fullDescription: text,
    };
    
    // Genre
    if (lower.includes('male') && !lower.includes('female')) result.gender = 'male';
    else if (lower.includes('female') || lower.includes('woman') || lower.includes('girl')) result.gender = 'female';
    
    // Cheveux couleur
    if (lower.includes('blonde') || lower.includes('blond')) result.hairColor = 'blond';
    else if (lower.includes('brown') || lower.includes('brunette')) result.hairColor = 'brun';
    else if (lower.includes('black')) result.hairColor = 'noir';
    else if (lower.includes('red') || lower.includes('ginger')) result.hairColor = 'roux';
    else if (lower.includes('white') || lower.includes('gray') || lower.includes('grey')) result.hairColor = 'blanc';
    else if (lower.includes('pink')) result.hairColor = 'rose';
    else if (lower.includes('blue')) result.hairColor = 'bleu';
    
    // Cheveux longueur
    if (lower.includes('short')) result.hairLength = 'courts';
    else if (lower.includes('medium')) result.hairLength = 'mi-longs';
    else if (lower.includes('long')) result.hairLength = 'longs';
    
    // Âge
    const ageMatch = lower.match(/(\d{2})/);
    if (ageMatch) {
      const age = parseInt(ageMatch[1]);
      if (age >= 18 && age <= 80) result.ageEstimate = age;
    }
    
    // Teint
    if (lower.includes('dark') || lower.includes('ebony')) result.skinTone = 'ébène';
    else if (lower.includes('tan') || lower.includes('olive')) result.skinTone = 'bronzée';
    else if (lower.includes('pale') || lower.includes('fair') || lower.includes('light')) result.skinTone = 'très claire';
    
    // Morphologie
    if (lower.includes('slim') || lower.includes('thin')) result.bodyType = 'mince';
    else if (lower.includes('curvy') || lower.includes('voluptuous')) result.bodyType = 'voluptueuse';
    else if (lower.includes('athletic') || lower.includes('fit')) result.bodyType = 'athlétique';
    else if (lower.includes('average')) result.bodyType = 'moyenne';
    
    return result;
  };
  
  // v5.4.26 - Génération de profil aléatoire LOCAL (sans réseau)
  const generateRandomProfile = () => {
    const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
    
    const genders = ['female', 'female', 'female', 'female', 'male']; // 80% femme
    const hairColors = ['noir', 'brun', 'châtain', 'blond', 'roux', 'blanc', 'rose', 'bleu'];
    const hairLengths = ['courts', 'mi-longs', 'longs', 'très longs'];
    const eyeColors = ['marron', 'noisette', 'vert', 'bleu', 'gris', 'noir'];
    const skinTones = ['très claire', 'claire', 'mate', 'bronzée', 'caramel', 'ébène'];
    const bodyTypes = ['mince', 'élancée', 'moyenne', 'athlétique', 'voluptueuse', 'généreuse', 'ronde', 'pulpeuse'];
    const bustSizes = ['A', 'B', 'B', 'C', 'C', 'C', 'D', 'D', 'DD', 'E', 'F'];
    
    const selectedGender = random(genders);
    const selectedHairColor = random(hairColors);
    const selectedHairLength = random(hairLengths);
    const selectedEyeColor = random(eyeColors);
    const selectedSkinTone = random(skinTones);
    const selectedBodyType = random(bodyTypes);
    const selectedBust = random(bustSizes);
    const selectedAge = 18 + Math.floor(Math.random() * 32); // 18-50
    
    const genderLabel = selectedGender === 'female' ? 'Femme' : 'Homme';
    const genderAdj = selectedGender === 'female' ? 'e' : '';
    
    let description = `${genderLabel} de ${selectedAge} ans`;
    description += `, aux cheveux ${selectedHairColor}s ${selectedHairLength}`;
    description += ` et aux yeux ${selectedEyeColor}s.`;
    description += ` Silhouette ${selectedBodyType}, peau ${selectedSkinTone}.`;
    
    if (selectedGender === 'female') {
      description += ` Poitrine bonnet ${selectedBust}.`;
    }
    
    return {
      gender: selectedGender,
      ageEstimate: selectedAge,
      hairColor: selectedHairColor,
      hairLength: selectedHairLength,
      eyeColor: selectedEyeColor,
      skinTone: selectedSkinTone,
      bodyType: selectedBodyType,
      bustSize: selectedBust,
      fullDescription: description,
    };
  };
  
  // === v5.4.25 - HELPER: Parser la réponse d'analyse ===
  const parseAnalysisResponse = (text) => {
    if (!text) return null;
    
    try {
      // Nettoyer le texte
      let cleanText = text.trim();
      
      // Supprimer les blocs de code markdown
      cleanText = cleanText.replace(/```json\s*/gi, '');
      cleanText = cleanText.replace(/```\s*/gi, '');
      
      // Chercher un objet JSON
      const jsonMatch = cleanText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Essayer de parser directement
      return JSON.parse(cleanText);
    } catch (e) {
      console.log('⚠️ Parsing échoué:', e.message);
      
      // Essayer d'extraire les valeurs manuellement avec regex
      try {
        const extracted = {};
        
        // Genre
        const genderMatch = text.match(/["']?gender["']?\s*[:=]\s*["']?(female|male|homme|femme)["']?/i);
        if (genderMatch) extracted.gender = genderMatch[1].toLowerCase().includes('male') || genderMatch[1].toLowerCase().includes('homme') ? 'male' : 'female';
        
        // Âge
        const ageMatch = text.match(/["']?ageEstimate["']?\s*[:=]\s*["']?(\d+)["']?/i);
        if (ageMatch) extracted.ageEstimate = parseInt(ageMatch[1]);
        
        // Cheveux
        const hairColorMatch = text.match(/["']?hairColor["']?\s*[:=]\s*["']?([^"',}]+)["']?/i);
        if (hairColorMatch) extracted.hairColor = hairColorMatch[1].trim();
        
        const hairLengthMatch = text.match(/["']?hairLength["']?\s*[:=]\s*["']?([^"',}]+)["']?/i);
        if (hairLengthMatch) extracted.hairLength = hairLengthMatch[1].trim();
        
        // Yeux
        const eyeColorMatch = text.match(/["']?eyeColor["']?\s*[:=]\s*["']?([^"',}]+)["']?/i);
        if (eyeColorMatch) extracted.eyeColor = eyeColorMatch[1].trim();
        
        // Peau
        const skinToneMatch = text.match(/["']?skinTone["']?\s*[:=]\s*["']?([^"',}]+)["']?/i);
        if (skinToneMatch) extracted.skinTone = skinToneMatch[1].trim();
        
        // Corps
        const bodyTypeMatch = text.match(/["']?bodyType["']?\s*[:=]\s*["']?([^"',}]+)["']?/i);
        if (bodyTypeMatch) extracted.bodyType = bodyTypeMatch[1].trim();
        
        // Poitrine
        const bustMatch = text.match(/["']?bustSize["']?\s*[:=]\s*["']?([A-H]{1,2})["']?/i);
        if (bustMatch) extracted.bustSize = bustMatch[1].toUpperCase();
        
        // Description
        const descMatch = text.match(/["']?fullDescription["']?\s*[:=]\s*["']([^"]+)["']/i);
        if (descMatch) extracted.fullDescription = descMatch[1];
        
        if (Object.keys(extracted).length >= 3) {
          console.log('✅ Extraction manuelle réussie:', extracted);
          return extracted;
        }
      } catch (e2) {
        console.log('⚠️ Extraction manuelle échouée:', e2.message);
      }
      
      return null;
    }
  };
  
  // === v5.4.25 - HELPER: Valider l'analyse ===
  const isValidAnalysis = (analysis) => {
    if (!analysis) return false;
    
    // Vérifier qu'on a au moins 3 champs valides
    let validFields = 0;
    
    if (analysis.gender && (analysis.gender === 'male' || analysis.gender === 'female')) validFields++;
    if (analysis.ageEstimate && analysis.ageEstimate >= 18 && analysis.ageEstimate <= 99) validFields++;
    if (analysis.hairColor && analysis.hairColor.length > 1) validFields++;
    if (analysis.eyeColor && analysis.eyeColor.length > 1) validFields++;
    if (analysis.bodyType && analysis.bodyType.length > 1) validFields++;
    if (analysis.fullDescription && analysis.fullDescription.length > 10) validFields++;
    
    console.log(`📊 Validation: ${validFields}/6 champs valides`);
    return validFields >= 3;
  };
  
  // === v5.4.25 - HELPER: Appliquer l'analyse au formulaire ===
  const applyAnalysisToForm = (analysis) => {
    if (!analysis) return;
    
    // Genre
    if (analysis.gender) {
      const genderLower = String(analysis.gender).toLowerCase().trim();
      const isMale = genderLower === 'male' || genderLower === 'homme' || genderLower === 'man';
      setGender(isMale ? 'male' : 'female');
      console.log(`👤 Genre: ${isMale ? 'male' : 'female'}`);
    }
    
    // Âge
    if (analysis.ageEstimate) {
      const ageNum = parseInt(analysis.ageEstimate);
      if (!isNaN(ageNum) && ageNum >= 18 && ageNum <= 99) {
        setAge(String(ageNum));
        console.log(`🎂 Âge: ${ageNum}`);
      }
    }
    
    // Cheveux - couleur
    if (analysis.hairColor) {
      const hairColorMap = {
        'noir': 'noirs', 'noire': 'noirs', 'noirs': 'noirs', 'black': 'noirs',
        'brun': 'bruns', 'brune': 'bruns', 'bruns': 'bruns', 'brown': 'bruns',
        'châtain': 'châtains', 'chatain': 'châtains', 'chestnut': 'châtains',
        'blond': 'blonds', 'blonde': 'blonds', 'blonds': 'blonds',
        'roux': 'roux', 'rousse': 'roux', 'red': 'roux', 'ginger': 'roux',
        'blanc': 'blancs', 'blanche': 'blancs', 'white': 'blancs',
        'gris': 'gris', 'argenté': 'gris', 'gray': 'gris', 'grey': 'gris', 'silver': 'gris',
        'rose': 'roses', 'pink': 'roses',
        'bleu': 'bleus', 'blue': 'bleus',
        'vert': 'verts', 'green': 'verts',
        'violet': 'violets', 'purple': 'violets',
      };
      const colorKey = analysis.hairColor.toLowerCase().trim();
      const normalizedHair = hairColorMap[colorKey] || analysis.hairColor;
      setHairColor(normalizedHair);
      console.log(`💇 Cheveux couleur: ${normalizedHair}`);
    }
    
    // Cheveux - longueur
    if (analysis.hairLength) {
      const lengthMap = {
        'very short': 'très courts', 'very-short': 'très courts',
        'short': 'courts', 'court': 'courts',
        'medium': 'mi-longs', 'mi-long': 'mi-longs', 'shoulder': 'mi-longs',
        'long': 'longs', 'longs': 'longs',
        'very long': 'très longs', 'very-long': 'très longs',
      };
      const lengthKey = analysis.hairLength.toLowerCase().trim();
      const normalizedLength = lengthMap[lengthKey] || analysis.hairLength;
      setHairLength(normalizedLength);
      console.log(`💇 Cheveux longueur: ${normalizedLength}`);
    }
    
    // Yeux
    if (analysis.eyeColor) {
      const eyeMap = {
        'brown': 'marron', 'marron': 'marron',
        'hazel': 'noisette', 'noisette': 'noisette',
        'green': 'vert', 'vert': 'vert',
        'blue': 'bleu', 'bleu': 'bleu',
        'gray': 'gris', 'grey': 'gris', 'gris': 'gris',
        'black': 'noir', 'noir': 'noir',
        'amber': 'ambre', 'ambre': 'ambre',
      };
      const eyeKey = analysis.eyeColor.toLowerCase().trim();
      const normalizedEye = eyeMap[eyeKey] || analysis.eyeColor.toLowerCase();
      setEyeColor(normalizedEye);
      console.log(`👁️ Yeux: ${normalizedEye}`);
    }
    
    // Peau
    if (analysis.skinTone) {
      const skinMap = {
        'very fair': 'très claire', 'very pale': 'très claire', 'très claire': 'très claire',
        'fair': 'claire', 'light': 'claire', 'pale': 'claire', 'claire': 'claire',
        'olive': 'mate', 'mate': 'mate', 'medium': 'mate',
        'tan': 'bronzée', 'tanned': 'bronzée', 'bronzée': 'bronzée',
        'caramel': 'caramel', 'brown': 'caramel',
        'dark': 'ébène', 'ebony': 'ébène', 'ébène': 'ébène', 'black': 'ébène',
      };
      const skinKey = analysis.skinTone.toLowerCase().trim();
      const normalizedSkin = skinMap[skinKey] || analysis.skinTone.toLowerCase();
      setSkinTone(normalizedSkin);
      console.log(`🎨 Peau: ${normalizedSkin}`);
    }
    
    // Morphologie
    if (analysis.bodyType) {
      const bodyMap = {
        'slim': 'mince', 'thin': 'mince', 'mince': 'mince', 'skinny': 'mince',
        'slender': 'élancée', 'élancée': 'élancée', 'tall and thin': 'élancée',
        'average': 'moyenne', 'moyenne': 'moyenne', 'normal': 'moyenne',
        'athletic': 'athlétique', 'fit': 'athlétique', 'athlétique': 'athlétique', 'toned': 'athlétique',
        'curvy': 'voluptueuse', 'voluptuous': 'voluptueuse', 'voluptueuse': 'voluptueuse',
        'full-figured': 'généreuse', 'généreuse': 'généreuse', 'plus-size': 'généreuse',
        'chubby': 'ronde', 'round': 'ronde', 'ronde': 'ronde',
        'thick': 'pulpeuse', 'pulpeuse': 'pulpeuse',
      };
      const bodyKey = analysis.bodyType.toLowerCase().trim();
      const normalizedBody = bodyMap[bodyKey] || analysis.bodyType.toLowerCase();
      setBodyType(normalizedBody);
      console.log(`🏋️ Morphologie: ${normalizedBody}`);
    }
    
    // Poitrine (femmes uniquement)
    const isFemale = !analysis.gender || analysis.gender.toLowerCase() !== 'male';
    if (isFemale && analysis.bustSize) {
      const bustUpper = analysis.bustSize.toUpperCase().trim();
      if (['A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G', 'H'].includes(bustUpper)) {
        setBust(bustUpper);
        console.log(`👙 Poitrine: ${bustUpper}`);
      }
    }
    
    // Taille estimée
    if (analysis.heightEstimate) {
      const heightStr = String(analysis.heightEstimate).toLowerCase();
      let heightVal = '165';
      
      if (heightStr.includes('150') || heightStr.includes('petite') || heightStr.includes('small') || heightStr.includes('short')) {
        heightVal = '155';
      } else if (heightStr.includes('160') || heightStr.includes('moyenne') || heightStr.includes('medium') || heightStr.includes('average')) {
        heightVal = '165';
      } else if (heightStr.includes('170') || heightStr.includes('grande') || heightStr.includes('tall')) {
        heightVal = '175';
      } else if (heightStr.includes('180') || heightStr.includes('très grande') || heightStr.includes('very tall')) {
        heightVal = '180';
      }
      
      setHeight(heightVal);
      console.log(`📏 Taille: ${heightVal} cm`);
    }
    
    // Description complète
    if (analysis.fullDescription && analysis.fullDescription.length > 10) {
      setAppearance(analysis.fullDescription);
      console.log(`📝 Description: ${analysis.fullDescription.substring(0, 50)}...`);
    } else {
      // Générer une description à partir des données
      generateDetailedDescription(analysis);
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
    // v5.4.20 - Validation plus souple pour modifications de personnages intégrés
    if (!isEditingBuiltIn && (!name || !age || !personality || !scenario || !startMessage)) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      // Générer la description physique automatiquement si vide
      const finalAppearance = appearance || generatePhysicalDescription();
      const finalImagePrompt = generateImagePrompt();
      
      // v5.4.20 - Parser les tags depuis le champ texte
      const parsedTags = tags
        ? tags.split(',').map(t => t.trim()).filter(t => t)
        : [temperament, 'personnalisé', gender === 'female' ? 'femme' : 'homme', bodyType].filter(Boolean);
      
      const characterData = {
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
        // === TAGS v5.4.20 ===
        tags: parsedTags,
        // === SCÉNARIO ===
        scenario,
        description: scenario,
        startMessage,
        // === MÉTADONNÉES ===
        imageUrl: imageUrl || undefined,
        isCustom: !isEditingBuiltIn, // Si c'est un built-in, ne pas marquer comme custom
        isPublic: isPublic,
      };

      // v5.4.20 - GESTION DIFFÉRENCIÉE SELON LE TYPE DE PERSONNAGE
      if (isEditingBuiltIn) {
        // === MODIFICATION D'UN PERSONNAGE INTÉGRÉ ===
        // Sauvegarder les modifications localement
        await CustomCharacterService.saveCharacterModifications(characterToEdit.id, characterData);
        
        if (imageUrl && imageUrl !== characterToEdit.imageUrl) {
          await GalleryService.saveImageToGallery(characterToEdit.id, imageUrl);
        }
        
        Alert.alert('✅ Succès', `Les modifications de ${name} ont été sauvegardées localement.\n\nElles seront appliquées à ce personnage.`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else if (isEditing) {
        // === MODIFICATION D'UN PERSONNAGE CUSTOM ===
        await CustomCharacterService.updateCustomCharacter(characterToEdit.id, characterData);
        
        if (imageUrl && imageUrl !== characterToEdit.imageUrl) {
          await GalleryService.saveImageToGallery(characterToEdit.id, imageUrl);
        }
        
        Alert.alert('✅ Succès', 'Personnage modifié !', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // === CRÉATION D'UN NOUVEAU PERSONNAGE CUSTOM ===
        const savedCharacter = await CustomCharacterService.saveCustomCharacter(characterData, isPublic);
        
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

      {/* v5.4.20 - Section Tags */}
      <Text style={styles.label}>🏷️ Tags (séparés par des virgules)</Text>
      <TextInput
        style={styles.input}
        value={tags}
        onChangeText={setTags}
        placeholder="romantique, aventurier, mystérieux, milf, etc..."
      />
      <Text style={styles.hint}>
        Exemples: romantique, aventurier, milf, dominant, timide, fantasy...
      </Text>

      {/* Note pour les personnages intégrés */}
      {isEditingBuiltIn && (
        <View style={styles.builtInNote}>
          <Text style={styles.builtInNoteTitle}>ℹ️ Modification d'un personnage intégré</Text>
          <Text style={styles.builtInNoteText}>
            Les modifications seront sauvegardées localement et appliquées à ce personnage.
            Le personnage original ne sera pas modifié.
          </Text>
        </View>
      )}

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
  // v5.4.20 - Styles pour Tags et Built-in note
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    fontStyle: 'italic',
  },
  builtInNote: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  builtInNoteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 6,
  },
  builtInNoteText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 18,
  },
});
