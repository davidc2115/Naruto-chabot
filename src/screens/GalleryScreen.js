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
  FlatList,
  Animated,
  PermissionsAndroid,
  Share,
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
  
  // Animation pour masquer/afficher l'UI
  const uiOpacity = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef(null);

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
            await loadGallery();
            
            // Fermer le modal si plus d'images
            if (gallery.length <= 1) {
              setModalVisible(false);
            } else {
              // Ajuster l'index si nécessaire
              if (selectedIndex >= gallery.length - 1) {
                const newIndex = Math.max(0, selectedIndex - 1);
                setSelectedIndex(newIndex);
                setSelectedImage(gallery[newIndex]);
              }
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

  // v5.4.97 - Télécharger/Partager l'image
  const handleDownloadImage = async () => {
    if (!selectedImage || downloading) return;

    try {
      setDownloading(true);

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const fileName = `${character.name.replace(/\s+/g, '_')}_${timestamp}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Télécharger/sauvegarder l'image localement
      if (selectedImage.startsWith('data:image')) {
        // Si c'est une URL base64, l'écrire directement
        const base64Data = selectedImage.split(',')[1];
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        // Sinon télécharger depuis l'URL
        await FileSystem.downloadAsync(selectedImage, fileUri);
      }

      // Proposer de partager l'image (permet de sauvegarder dans la galerie)
      if (Platform.OS === 'android') {
        // Sur Android, proposer de partager ou de copier le chemin
        Alert.alert(
          '✅ Image prête',
          'L\'image a été téléchargée. Voulez-vous la partager pour la sauvegarder dans votre galerie ?',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Partager',
              onPress: async () => {
                try {
                  await Share.share({
                    url: fileUri,
                    title: `Image de ${character.name}`,
                  });
                } catch (e) {
                  // Fallback: juste confirmer la sauvegarde locale
                  Alert.alert('✅ Sauvegardé', `Image sauvegardée dans:\n${fileUri}`);
                }
              }
            }
          ]
        );
      } else {
        // Sur iOS, utiliser Share directement
        await Share.share({
          url: fileUri,
          title: `Image de ${character.name}`,
        });
      }

    } catch (error) {
      console.error('Erreur téléchargement:', error);
      Alert.alert(
        '❌ Erreur',
        'Impossible de télécharger l\'image.',
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

  // Rendu d'une image en plein écran (pour FlatList)
  const renderFullScreenImage = ({ item, index }) => (
    <TouchableWithoutFeedback onPress={toggleUI}>
      <View style={styles.fullScreenSlide}>
        <Image
          source={{ uri: item }}
          style={styles.fullScreenImage}
          resizeMode="contain"
        />
      </View>
    </TouchableWithoutFeedback>
  );

  // Changement d'image via swipe
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      setSelectedIndex(newIndex);
      setSelectedImage(gallery[newIndex]);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

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
                onPress={() => {
                  setSelectedImage(imageUrl);
                  setSelectedIndex(index);
                  setShowUI(true);
                  setModalVisible(true);
                }}
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
            {/* FlatList horizontal pour swipe */}
            <FlatList
              ref={flatListRef}
              data={gallery}
              renderItem={renderFullScreenImage}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={selectedIndex}
              getItemLayout={(data, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
            />

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
                    {downloading ? 'Téléchargement...' : 'Télécharger'}
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

              {/* Indicateur de swipe */}
              <View style={styles.swipeIndicator}>
                <Text style={styles.swipeIndicatorText}>
                  ← Swipez pour naviguer →
                </Text>
              </View>
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
