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
  PermissionsAndroid,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GalleryService from '../services/GalleryService';

const DOWNLOAD_DIR_KEY = '@gallery_download_dir';

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

  // v5.5.1 - Télécharger l'image automatiquement (sans choisir le dossier à chaque fois)
  const handleDownloadImage = async () => {
    if (!selectedImage || downloading) return;

    try {
      setDownloading(true);
      console.log('📥 Début sauvegarde image...');

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const safeName = character.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      const fileName = `${safeName}_${timestamp}.jpg`;

      // Préparer les données de l'image en base64
      let base64Data = null;
      
      if (selectedImage.startsWith('data:image')) {
        base64Data = selectedImage.split(',')[1];
      } else if (selectedImage.startsWith('http')) {
        const tempFile = `${FileSystem.cacheDirectory}temp_${timestamp}.jpg`;
        const downloadResult = await FileSystem.downloadAsync(selectedImage, tempFile);
        
        if (downloadResult.status !== 200) {
          throw new Error('Échec du téléchargement');
        }
        
        base64Data = await FileSystem.readAsStringAsync(tempFile, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        await FileSystem.deleteAsync(tempFile, { idempotent: true });
      } else if (selectedImage.startsWith('file://')) {
        base64Data = await FileSystem.readAsStringAsync(selectedImage, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      if (!base64Data) {
        throw new Error('Impossible de lire l\'image');
      }

      if (Platform.OS === 'android') {
        // Essayer de récupérer le dossier sauvegardé
        let savedDirUri = await AsyncStorage.getItem(DOWNLOAD_DIR_KEY);
        
        // Si pas de dossier sauvegardé, demander une fois
        if (!savedDirUri) {
          Alert.alert(
            '📁 Choisir le dossier de sauvegarde',
            'Sélectionnez le dossier où sauvegarder vos images (ex: Downloads ou DCIM).\n\nCe choix sera mémorisé pour les prochaines fois.',
            [
              {
                text: 'Choisir',
                onPress: async () => {
                  try {
                    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                    
                    if (permissions.granted) {
                      // Sauvegarder le dossier pour les prochaines fois
                      await AsyncStorage.setItem(DOWNLOAD_DIR_KEY, permissions.directoryUri);
                      
                      // Sauvegarder l'image
                      await saveImageToDirectory(permissions.directoryUri, fileName, base64Data);
                    } else {
                      Alert.alert('⚠️ Permission refusée', 'Impossible de sauvegarder sans accès au stockage.');
                    }
                  } catch (e) {
                    console.error('Erreur permission:', e);
                  }
                }
              }
            ]
          );
          return;
        }
        
        // Utiliser le dossier sauvegardé
        try {
          await saveImageToDirectory(savedDirUri, fileName, base64Data);
        } catch (safError) {
          console.error('❌ Erreur avec dossier sauvegardé:', safError);
          // Le dossier sauvegardé n'est plus valide, demander à nouveau
          await AsyncStorage.removeItem(DOWNLOAD_DIR_KEY);
          
          Alert.alert(
            '⚠️ Dossier inaccessible',
            'Le dossier de sauvegarde n\'est plus accessible. Veuillez en choisir un nouveau.',
            [
              {
                text: 'Choisir',
                onPress: async () => {
                  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                  if (permissions.granted) {
                    await AsyncStorage.setItem(DOWNLOAD_DIR_KEY, permissions.directoryUri);
                    await saveImageToDirectory(permissions.directoryUri, fileName, base64Data);
                  }
                }
              }
            ]
          );
        }
      } else {
        // iOS
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        Alert.alert('✅ Image sauvegardée', `"${fileName}" enregistrée.`);
      }

    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      Alert.alert(
        '❌ Erreur',
        `Impossible de sauvegarder l'image.\n\n${error.message || 'Erreur inconnue'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setDownloading(false);
    }
  };

  // Fonction helper pour sauvegarder dans un dossier SAF
  const saveImageToDirectory = async (directoryUri, fileName, base64Data) => {
    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      directoryUri,
      fileName,
      'image/jpeg'
    );
    
    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    Alert.alert(
      '✅ Image sauvegardée',
      `"${fileName}" enregistrée !\n\n📱 Visible dans votre galerie.`,
      [{ text: 'OK' }]
    );
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
