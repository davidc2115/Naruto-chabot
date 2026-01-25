import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Image,
  Alert,
  Modal,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Platform,
  Animated,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import GalleryService from '../services/GalleryService';

const { width, height } = Dimensions.get('window');

export default function GalleryScreen({ route, navigation }) {
  const { character } = route.params;
  const [gallery, setGallery] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showUI, setShowUI] = useState(true);
  const [downloading, setDownloading] = useState(false);
  
  // Refs
  const scrollViewRef = useRef(null);
  const uiOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadGallery();
  }, [character]);

  // Animation de l'UI
  useEffect(() => {
    Animated.timing(uiOpacity, {
      toValue: showUI ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showUI]);

  const loadGallery = async () => {
    const images = await GalleryService.getGallery(character.id);
    setGallery(images);
  };

  // Ouvrir le modal à l'image sélectionnée
  const openFullScreen = (imageUrl, index) => {
    setSelectedImage(imageUrl);
    setSelectedIndex(index);
    setShowUI(true);
    setModalVisible(true);
    
    // Scroll vers l'image après ouverture du modal
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: index * width, animated: false });
      }
    }, 100);
  };

  // Gestion du scroll pour mettre à jour l'index
  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffset / width);
    
    if (newIndex !== selectedIndex && newIndex >= 0 && newIndex < gallery.length) {
      setSelectedIndex(newIndex);
      setSelectedImage(gallery[newIndex]);
    }
  };

  const handleDeleteImage = async (imageUrl) => {
    Alert.alert(
      'Supprimer',
      'Voulez-vous supprimer cette image ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await GalleryService.deleteImage(character.id, imageUrl);
            
            // Recharger la galerie
            const newGallery = await GalleryService.getGallery(character.id);
            setGallery(newGallery);
            
            // Fermer le modal si plus d'images
            if (newGallery.length === 0) {
              setModalVisible(false);
            } else {
              // Ajuster l'index si nécessaire
              const newIndex = Math.min(selectedIndex, newGallery.length - 1);
              setSelectedIndex(newIndex);
              setSelectedImage(newGallery[newIndex]);
            }
            Alert.alert('Succès', 'Image supprimée');
          },
        },
      ]
    );
  };

  const handleSetAsBackground = async () => {
    if (selectedImage) {
      await GalleryService.setConversationBackground(character.id, selectedImage);
      Alert.alert('Succès', 'Image définie comme fond de conversation');
    }
  };

  // v5.4.99 - Télécharger l'image dans le cache de l'app
  const handleDownloadImage = async () => {
    if (!selectedImage || downloading) return;

    try {
      setDownloading(true);
      console.log('📥 Début sauvegarde image...');
      console.log('📷 Type image:', selectedImage.substring(0, 50));

      // Utiliser le cache directory (plus permissif)
      const saveDir = `${FileSystem.cacheDirectory}saved_images/`;
      
      // Créer le dossier si nécessaire
      try {
        const dirInfo = await FileSystem.getInfoAsync(saveDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(saveDir, { intermediates: true });
          console.log('📁 Dossier créé:', saveDir);
        }
      } catch (dirError) {
        console.log('⚠️ Erreur création dossier, utilisation du cache direct');
      }

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const safeName = character.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      const fileName = `${safeName}_${timestamp}.jpg`;
      
      // Essayer d'abord le sous-dossier, sinon le cache direct
      let fileUri = `${saveDir}${fileName}`;
      let saved = false;

      // Méthode 1: Si c'est une URL base64
      if (selectedImage.startsWith('data:image')) {
        console.log('📝 Sauvegarde depuis base64...');
        try {
          const base64Data = selectedImage.split(',')[1];
          if (!base64Data) {
            throw new Error('Données base64 invalides');
          }
          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          saved = true;
          console.log('✅ Fichier base64 écrit:', fileUri);
        } catch (b64Error) {
          console.error('❌ Erreur base64:', b64Error);
          // Essayer dans le cache direct
          fileUri = `${FileSystem.cacheDirectory}${fileName}`;
          const base64Data = selectedImage.split(',')[1];
          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          saved = true;
        }
      } 
      // Méthode 2: Télécharger depuis URL
      else if (selectedImage.startsWith('http')) {
        console.log('🌐 Téléchargement depuis URL...');
        try {
          const downloadResult = await FileSystem.downloadAsync(selectedImage, fileUri);
          console.log('📡 Résultat download:', downloadResult.status);
          if (downloadResult.status === 200) {
            saved = true;
          } else {
            throw new Error(`Status: ${downloadResult.status}`);
          }
        } catch (dlError) {
          console.error('❌ Erreur téléchargement:', dlError);
          // Essayer dans le cache direct
          fileUri = `${FileSystem.cacheDirectory}${fileName}`;
          const downloadResult = await FileSystem.downloadAsync(selectedImage, fileUri);
          if (downloadResult.status === 200) {
            saved = true;
          }
        }
      }
      // Méthode 3: C'est déjà un fichier local
      else if (selectedImage.startsWith('file://')) {
        console.log('📂 Copie depuis fichier local...');
        try {
          await FileSystem.copyAsync({
            from: selectedImage,
            to: fileUri,
          });
          saved = true;
        } catch (copyError) {
          console.error('❌ Erreur copie:', copyError);
        }
      }

      if (!saved) {
        throw new Error('Aucune méthode de sauvegarde n\'a fonctionné');
      }

      // Vérifier que le fichier existe
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      console.log('📊 Info fichier:', fileInfo);
      
      if (fileInfo.exists && fileInfo.size > 0) {
        const sizeKB = Math.round(fileInfo.size / 1024);
        Alert.alert(
          '✅ Image sauvegardée',
          `L'image a été enregistrée !\n\n📁 ${fileName}\n📦 ${sizeKB} KB`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Fichier vide ou non créé');
      }

    } catch (error) {
      console.error('❌ Erreur sauvegarde complète:', error);
      Alert.alert(
        '❌ Erreur',
        `Impossible de sauvegarder l'image.\n\nDétail: ${error.message || 'Erreur inconnue'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setDownloading(false);
    }
  };

  // Toggle UI visibility on tap
  const toggleUI = () => {
    setShowUI(!showUI);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header personnalisé */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>🖼️ {character.name}</Text>
            <Text style={styles.subtitle}>{gallery.length} image(s)</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {gallery.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎨</Text>
            <Text style={styles.emptyTitle}>Aucune image</Text>
            <Text style={styles.emptyText}>
              Générez des images dans les conversations pour les voir ici
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.galleryGrid}>
            {gallery.map((imageUrl, index) => (
              <TouchableOpacity
                key={index}
                style={styles.imageCard}
                onPress={() => openFullScreen(imageUrl, index)}
              >
                <Image source={{ uri: imageUrl }} style={styles.thumbnail} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Modal plein écran avec swipe */}
        <Modal
          visible={modalVisible}
          transparent={false}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
          statusBarTranslucent={true}
        >
          <StatusBar hidden={true} />
          <View style={styles.fullScreenContainer}>
            {/* ScrollView horizontal pour swipe */}
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              scrollEventThrottle={16}
              decelerationRate="fast"
              style={styles.scrollView}
            >
              {gallery.map((imageUrl, index) => (
                <TouchableWithoutFeedback key={index} onPress={toggleUI}>
                  <View style={styles.fullScreenSlide}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.fullScreenImage}
                      resizeMode="contain"
                    />
                  </View>
                </TouchableWithoutFeedback>
              ))}
            </ScrollView>

            {/* Overlay UI (masquable au tap) */}
            <Animated.View
              style={[styles.overlayUI, { opacity: uiOpacity }]}
              pointerEvents={showUI ? 'auto' : 'none'}
            >
              {/* Boutons en haut */}
              <View style={styles.overlayButtonsTop}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.imageCounter}>
                  {selectedIndex + 1} / {gallery.length}
                </Text>
              </View>

              {/* Boutons d'action en bas */}
              <View style={styles.overlayButtonsBottom}>
                <TouchableOpacity
                  style={styles.overlayActionButton}
                  onPress={handleDownloadImage}
                  disabled={downloading}
                >
                  <Text style={styles.overlayActionIcon}>
                    {downloading ? '⏳' : '💾'}
                  </Text>
                  <Text style={styles.overlayActionText}>
                    {downloading ? 'Chargement...' : 'Sauvegarder'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.overlayActionButton}
                  onPress={handleSetAsBackground}
                >
                  <Text style={styles.overlayActionIcon}>📱</Text>
                  <Text style={styles.overlayActionText}>Fond conv.</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.overlayActionButton, styles.overlayDeleteButton]}
                  onPress={() => handleDeleteImage(selectedImage)}
                >
                  <Text style={styles.overlayActionIcon}>🗑️</Text>
                  <Text style={styles.overlayActionText}>Supprimer</Text>
                </TouchableOpacity>
              </View>

              {/* Indicateur de swipe (disparait après premier swipe) */}
              {gallery.length > 1 && (
                <View style={styles.swipeIndicator}>
                  <Text style={styles.swipeIndicatorText}>
                    ← Glissez pour voir les autres images →
                  </Text>
                </View>
              )}
            </Animated.View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// Calcul des dimensions pour ratio 9:16
const thumbnailWidth = (width - 30) / 2;
const thumbnailHeight = thumbnailWidth * (16 / 9);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 10,
    backgroundColor: '#6366f1',
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
  },
  headerSpacer: {
    width: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#e0e7ff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  galleryGrid: {
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageCard: {
    width: thumbnailWidth,
    height: thumbnailHeight,
    margin: 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2d2d44',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // ===== MODAL PLEIN ÉCRAN =====
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  fullScreenSlide: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width,
    height: height,
  },

  // Overlay UI (masquable)
  overlayUI: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    pointerEvents: 'box-none',
  },

  // Boutons en haut
  overlayButtonsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  imageCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },

  // Boutons d'action en bas
  overlayButtonsBottom: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },
  overlayActionButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
    justifyContent: 'center',
  },
  overlayDeleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  overlayActionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  overlayActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Indicateur de swipe
  swipeIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 90,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  swipeIndicatorText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
