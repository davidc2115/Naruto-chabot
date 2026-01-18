import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import GalleryService from '../services/GalleryService';

const { width, height } = Dimensions.get('window');

export default function GalleryScreen({ route, navigation }) {
  const { character } = route.params;
  const [gallery, setGallery] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    loadGallery();
    navigation.setOptions({ title: `Galerie - ${character.name}` });
  }, [character]);

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
            setModalVisible(false);
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
      setModalVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🖼️ Galerie</Text>
        <Text style={styles.subtitle}>{gallery.length} image(s)</Text>
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
                setModalVisible(true);
              }}
            >
              <Image source={{ uri: imageUrl }} style={styles.thumbnail} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Modal plein écran avec boutons par-dessus */}
      <Modal
        visible={modalVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar hidden={true} />
        <View style={styles.fullScreenContainer}>
          {/* Image plein écran */}
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
          
          {/* Boutons par-dessus l'image */}
          <View style={styles.overlayButtonsTop}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.imageCounter}>{selectedIndex + 1} / {gallery.length}</Text>
          </View>
          
          {/* Boutons d'action en bas */}
          <View style={styles.overlayButtonsBottom}>
            <TouchableOpacity
              style={styles.overlayActionButton}
              onPress={handleSetAsBackground}
            >
              <Text style={styles.overlayActionIcon}>📱</Text>
              <Text style={styles.overlayActionText}>Fond de conv</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.overlayActionButton, styles.overlayDeleteButton]}
              onPress={() => handleDeleteImage(selectedImage)}
            >
              <Text style={styles.overlayActionIcon}>🗑️</Text>
              <Text style={styles.overlayActionText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
          
          {/* Navigation gauche/droite */}
          {selectedIndex > 0 && (
            <TouchableOpacity
              style={styles.navButtonLeft}
              onPress={() => {
                const newIndex = selectedIndex - 1;
                setSelectedIndex(newIndex);
                setSelectedImage(gallery[newIndex]);
              }}
            >
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
          )}
          
          {selectedIndex < gallery.length - 1 && (
            <TouchableOpacity
              style={styles.navButtonRight}
              onPress={() => {
                const newIndex = selectedIndex + 1;
                setSelectedIndex(newIndex);
                setSelectedImage(gallery[newIndex]);
              }}
            >
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
}

// Calcul des dimensions pour ratio 9:16
const thumbnailWidth = (width - 30) / 2;
const thumbnailHeight = thumbnailWidth * (16 / 9);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    padding: 20,
    backgroundColor: '#6366f1',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
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
  // v5.3.55 - Thumbnails en ratio 9:16
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width,
    height: height,
    resizeMode: 'contain',
  },
  
  // Boutons en haut (fermer + compteur)
  overlayButtonsTop: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overlayActionButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 140,
    justifyContent: 'center',
  },
  overlayDeleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  overlayActionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  overlayActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Navigation gauche/droite
  navButtonLeft: {
    position: 'absolute',
    left: 10,
    top: '50%',
    marginTop: -30,
    width: 50,
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonRight: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -30,
    width: 50,
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '300',
  },
});
