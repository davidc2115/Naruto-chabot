import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * MemoryService v1.0 - Mémoire persistante par personnage
 *
 * Enregistre automatiquement les moments clés des conversations
 * et les injecte dans le prompt système pour que l'IA s'en souvienne.
 */

const MAX_MEMORIES_PER_CHARACTER = 30;
const MEMORY_KEY_PREFIX = 'char_memories_';

// Patterns déclencheurs de souvenirs (dans les réponses de l'IA)
const MEMORY_TRIGGERS = [
  // Aveux et déclarations
  /je t[e']? ?aim/i,
  /je vous aim/i,
  /je ressens quelque chose/i,
  /tu me manques/i,
  /je n['']? ?oublierai jamais/i,
  /c[''']est la première fois/i,
  /je n['']? ?ai jamais dit ça/i,
  /je te fais confiance/i,
  // Révélations personnelles
  /personne ne sait/i,
  /je n['']? ?ai jamais avoué/i,
  /mon secret/i,
  /je cache/i,
  /en vérité/i,
  // Moments de tension / intimité
  /\*(?:embrasse|serre dans ses bras|prend la main|effleure|caresse|s[''']approche très près)\*/i,
  /\*(?:pleure|les larmes|les yeux brillants|la voix brisée)\*/i,
  /\*(?:sourit pour la première fois|rit vraiment)\*/i,
  // Décisions importantes
  /je resterai/i,
  /je partirai jamais/i,
  /je veux qu['']on/i,
  /à partir de maintenant/i,
  /quelque chose a changé/i,
];

class MemoryService {
  /**
   * Analyse un message IA et retourne un souvenir condensé s'il est mémorable.
   */
  extractMemoryFromMessage(characterName, aiMessage, userMessage) {
    if (!aiMessage || aiMessage.length < 30) return null;

    const isMemorable = MEMORY_TRIGGERS.some(pattern => pattern.test(aiMessage));
    if (!isMemorable) return null;

    // Condenser le souvenir : garder les 200 premiers caractères pertinents
    const cleaned = aiMessage
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Résumé du contexte utilisateur
    const userContext = userMessage
      ? `(${userMessage.substring(0, 60).trim()}${userMessage.length > 60 ? '…' : ''})`
      : '';

    return {
      id: Date.now().toString(36),
      timestamp: new Date().toISOString(),
      userContext,
      content: cleaned.substring(0, 220),
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }),
    };
  }

  /**
   * Sauvegarde un souvenir pour un personnage donné.
   */
  async saveMemory(characterId, memory) {
    if (!characterId || !memory) return;
    try {
      const key = MEMORY_KEY_PREFIX + characterId;
      const existing = await this.getMemories(characterId);
      const updated = [memory, ...existing].slice(0, MAX_MEMORIES_PER_CHARACTER);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('MemoryService.saveMemory error:', e);
    }
  }

  /**
   * Récupère tous les souvenirs d'un personnage.
   */
  async getMemories(characterId) {
    if (!characterId) return [];
    try {
      const raw = await AsyncStorage.getItem(MEMORY_KEY_PREFIX + characterId);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Retourne un bloc texte formaté pour injection dans le prompt système.
   */
  async getMemoriesPrompt(characterId) {
    const memories = await this.getMemories(characterId);
    if (!memories.length) return '';

    const lines = memories
      .slice(0, 12)
      .map(m => `• [${m.date}] ${m.content.substring(0, 180)}`)
      .join('\n');

    return `━━━━━━━━━━━━━━━━━━━━━━━━
SOUVENIRS DE TES CONVERSATIONS PRÉCÉDENTES
(Tu te souviens de ces moments — fais-y référence naturellement si c'est pertinent)
━━━━━━━━━━━━━━━━━━━━━━━━
${lines}`;
  }

  /**
   * Supprime tous les souvenirs d'un personnage spécifique.
   */
  async clearCharacterMemories(characterId) {
    await AsyncStorage.removeItem(MEMORY_KEY_PREFIX + characterId);
  }

  /**
   * Supprime tous les souvenirs de tous les personnages.
   */
  async clearAllMemories() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const memoryKeys = keys.filter(k => k.startsWith(MEMORY_KEY_PREFIX));
      if (memoryKeys.length) await AsyncStorage.multiRemove(memoryKeys);
    } catch (e) {
      console.error('MemoryService.clearAllMemories error:', e);
    }
  }

  /**
   * Compte le total de souvenirs enregistrés (pour les stats).
   */
  async getTotalMemoriesCount() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const memoryKeys = keys.filter(k => k.startsWith(MEMORY_KEY_PREFIX));
      let total = 0;
      for (const key of memoryKeys) {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const arr = JSON.parse(raw);
          total += arr.length;
        }
      }
      return total;
    } catch (e) {
      return 0;
    }
  }
}

export default new MemoryService();
