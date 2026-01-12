import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
 * Convertit HEX en HSL
 */
const hexToHsl = (hex) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

/**
 * ColorPicker Compact et Élégant
 * Avec bouton de validation clair
 */
export default function ColorPicker({ 
  visible, 
  onClose, 
  onSelectColor, 
  currentColor = '#ffffff',
  title = 'Choisir une couleur' 
}) {
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [tempColor, setTempColor] = useState(currentColor);

  // Réinitialiser quand on ouvre le picker
  useEffect(() => {
    if (visible) {
      setSelectedColor(currentColor);
      setTempColor(currentColor);
    }
  }, [visible, currentColor]);

  // Palette de couleurs organisée (plus compacte)
  const colorPalette = [
    // Ligne 1 - Rouges/Oranges
    '#ff0000', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    // Ligne 2 - Verts/Cyans
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
    // Ligne 3 - Bleus/Violets
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
    // Ligne 4 - Neutres
    '#ffffff', '#f1f5f9', '#cbd5e1', '#94a3b8', '#64748b', '#1e293b',
  ];

  // Nuances de la couleur sélectionnée
  const getShades = (baseColor) => {
    try {
      const { h, s } = hexToHsl(baseColor);
      return [
        hslToHex(h, s, 90), // Très clair
        hslToHex(h, s, 70), // Clair
        hslToHex(h, s, 50), // Normal
        hslToHex(h, s, 35), // Foncé
        hslToHex(h, s, 20), // Très foncé
      ];
    } catch {
      return [baseColor];
    }
  };

  const handleSelectBase = (color) => {
    setTempColor(color);
    setSelectedColor(color);
  };

  const handleSelectShade = (shade) => {
    setSelectedColor(shade);
  };

  const handleConfirm = () => {
    onSelectColor(selectedColor);
    onClose();
  };

  const handleCancel = () => {
    setSelectedColor(currentColor);
    setTempColor(currentColor);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* En-tête */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Aperçu de la couleur */}
          <View style={styles.previewSection}>
            <View style={[styles.colorPreview, { backgroundColor: selectedColor }]}>
              <View style={styles.colorPreviewInner} />
            </View>
            <Text style={styles.colorHex}>{selectedColor.toUpperCase()}</Text>
          </View>

          {/* Palette principale */}
          <Text style={styles.sectionLabel}>Couleurs</Text>
          <View style={styles.paletteGrid}>
            {colorPalette.map((color, index) => (
              <TouchableOpacity
                key={`color-${index}`}
                style={[
                  styles.paletteColor,
                  { backgroundColor: color },
                  tempColor === color && styles.paletteColorSelected,
                  color === '#ffffff' && styles.paletteColorWhite,
                ]}
                onPress={() => handleSelectBase(color)}
              />
            ))}
          </View>

          {/* Nuances de la couleur sélectionnée */}
          <Text style={styles.sectionLabel}>Nuances</Text>
          <View style={styles.shadesRow}>
            {getShades(tempColor).map((shade, index) => (
              <TouchableOpacity
                key={`shade-${index}`}
                style={[
                  styles.shadeColor,
                  { backgroundColor: shade },
                  selectedColor === shade && styles.shadeColorSelected,
                ]}
                onPress={() => handleSelectShade(shade)}
              />
            ))}
          </View>

          {/* Boutons d'action */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>✓ Valider</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    width: Math.min(SCREEN_WIDTH - 40, 340),
    maxWidth: 340,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: '#9ca3af',
    fontSize: 18,
  },
  previewSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  colorPreview: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  colorPreviewInner: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  colorHex: {
    color: '#e5e7eb',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '600',
    letterSpacing: 1,
  },
  sectionLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  paletteColor: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paletteColorSelected: {
    borderColor: '#fbbf24',
    transform: [{ scale: 1.1 }],
  },
  paletteColorWhite: {
    borderColor: '#4b5563',
    borderWidth: 1,
  },
  shadesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  shadeColor: {
    width: 48,
    height: 32,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  shadeColorSelected: {
    borderColor: '#fbbf24',
    transform: [{ scale: 1.1 }],
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
