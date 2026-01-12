import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  PanResponder,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PICKER_WIDTH = SCREEN_WIDTH - 80;
const PICKER_HEIGHT = 200;

/**
 * Convertit HSL en HEX
 */
const hslToHex = (h, s, l) => {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

/**
 * ColorPicker - Sélecteur de couleur complet
 */
export default function ColorPicker({ 
  visible, 
  onClose, 
  onSelectColor, 
  currentColor = '#ffffff',
  title = 'Choisir une couleur' 
}) {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const [selectedColor, setSelectedColor] = useState(currentColor);

  // Couleurs prédéfinies populaires
  const presetColors = [
    // Rouges
    '#ff0000', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d',
    // Oranges
    '#ff6600', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12',
    // Jaunes
    '#ffff00', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12',
    // Verts
    '#00ff00', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d',
    // Cyans
    '#00ffff', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63',
    // Bleus
    '#0000ff', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a',
    // Violets
    '#8b00ff', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95',
    // Roses
    '#ff00ff', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843',
    // Gris et Neutres
    '#ffffff', '#f8fafc', '#e2e8f0', '#94a3b8', '#64748b', '#475569',
    '#334155', '#1e293b', '#0f172a', '#020617', '#000000', '#1f2937',
  ];

  const updateColor = useCallback((h, s, l) => {
    const hex = hslToHex(h, s, l);
    setSelectedColor(hex);
  }, []);

  // Pan responder pour le spectre de teinte
  const huePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = Math.max(0, Math.min(e.nativeEvent.locationX, PICKER_WIDTH));
      const newHue = Math.round((x / PICKER_WIDTH) * 360);
      setHue(newHue);
      updateColor(newHue, saturation, lightness);
    },
    onPanResponderMove: (e) => {
      const x = Math.max(0, Math.min(e.nativeEvent.locationX, PICKER_WIDTH));
      const newHue = Math.round((x / PICKER_WIDTH) * 360);
      setHue(newHue);
      updateColor(newHue, saturation, lightness);
    },
  });

  // Pan responder pour la saturation/luminosité
  const slPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = Math.max(0, Math.min(e.nativeEvent.locationX, PICKER_WIDTH));
      const y = Math.max(0, Math.min(e.nativeEvent.locationY, PICKER_HEIGHT));
      const newSat = Math.round((x / PICKER_WIDTH) * 100);
      const newLight = Math.round(100 - (y / PICKER_HEIGHT) * 100);
      setSaturation(newSat);
      setLightness(newLight);
      updateColor(hue, newSat, newLight);
    },
    onPanResponderMove: (e) => {
      const x = Math.max(0, Math.min(e.nativeEvent.locationX, PICKER_WIDTH));
      const y = Math.max(0, Math.min(e.nativeEvent.locationY, PICKER_HEIGHT));
      const newSat = Math.round((x / PICKER_WIDTH) * 100);
      const newLight = Math.round(100 - (y / PICKER_HEIGHT) * 100);
      setSaturation(newSat);
      setLightness(newLight);
      updateColor(hue, newSat, newLight);
    },
  });

  const handleSelectPreset = (color) => {
    setSelectedColor(color);
  };

  const handleConfirm = () => {
    onSelectColor(selectedColor);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>

          {/* Aperçu de la couleur sélectionnée */}
          <View style={styles.previewRow}>
            <View style={[styles.colorPreview, { backgroundColor: selectedColor }]} />
            <Text style={styles.colorHex}>{selectedColor.toUpperCase()}</Text>
          </View>

          {/* Spectre de saturation/luminosité */}
          <View style={styles.pickerSection}>
            <Text style={styles.sectionLabel}>Saturation & Luminosité</Text>
            <View 
              style={[styles.slPicker, { backgroundColor: `hsl(${hue}, 100%, 50%)` }]}
              {...slPanResponder.panHandlers}
            >
              <View style={styles.saturationOverlay} />
              <View style={styles.lightnessOverlay} />
              <View 
                style={[
                  styles.slIndicator, 
                  { 
                    left: (saturation / 100) * PICKER_WIDTH - 10,
                    top: ((100 - lightness) / 100) * PICKER_HEIGHT - 10,
                  }
                ]} 
              />
            </View>
          </View>

          {/* Spectre de teinte (arc-en-ciel) */}
          <View style={styles.pickerSection}>
            <Text style={styles.sectionLabel}>Teinte</Text>
            <View style={styles.hueBar} {...huePanResponder.panHandlers}>
              <View 
                style={[
                  styles.hueIndicator, 
                  { left: (hue / 360) * PICKER_WIDTH - 8 }
                ]} 
              />
            </View>
          </View>

          {/* Couleurs prédéfinies */}
          <View style={styles.pickerSection}>
            <Text style={styles.sectionLabel}>Couleurs rapides</Text>
            <View style={styles.presetsGrid}>
              {presetColors.map((color, index) => (
                <TouchableOpacity
                  key={`${color}-${index}`}
                  style={[
                    styles.presetColor,
                    { backgroundColor: color },
                    selectedColor === color && styles.presetSelected,
                  ]}
                  onPress={() => handleSelectPreset(color)}
                />
              ))}
            </View>
          </View>

          {/* Boutons */}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1f2937',
    borderRadius: 20,
    padding: 20,
    width: SCREEN_WIDTH - 40,
    maxHeight: '90%',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 15,
  },
  colorPreview: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#fff',
  },
  colorHex: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  pickerSection: {
    marginBottom: 15,
  },
  sectionLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 8,
  },
  slPicker: {
    width: PICKER_WIDTH,
    height: PICKER_HEIGHT,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  saturationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(to right, #fff, transparent)',
  },
  lightnessOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(to bottom, transparent, #000)',
  },
  slIndicator: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  hueBar: {
    width: PICKER_WIDTH,
    height: 30,
    borderRadius: 8,
    background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
    position: 'relative',
  },
  hueIndicator: {
    position: 'absolute',
    top: -3,
    width: 16,
    height: 36,
    borderRadius: 4,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  presetColor: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetSelected: {
    borderColor: '#fbbf24',
    transform: [{ scale: 1.1 }],
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 15,
  },
  cancelBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
  },
  confirmBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
