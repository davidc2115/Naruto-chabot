import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * MemoryService v2.0 — Mémoire Relationnelle Complète
 *
 * 3 niveaux de mémoire :
 *   1. SOUVENIRS CLÉS   — moments marquants extraits automatiquement
 *   2. ARC RELATIONNEL  — évolution de la relation, ton actuel, événements fondateurs
 *   3. RÉSUMÉ RÉCENT    — condensé des 30 derniers échanges (glissant)
 *
 * → getFullContext() retourne un bloc injecté dans chaque prompt système.
 */

const MAX_MEMORIES = 40;
const MAX_ARC_EVENTS = 20;
const SUMMARY_WINDOW = 30;

const KEYS = {
  memories: (id) => `char_memories_${id}`,
  arc:      (id) => `char_arc_${id}`,
  summary:  (id) => `char_summary_${id}`,
};

const MEMORY_TRIGGERS = [
  /je t[e']? ?aim/i, /je vous aim/i, /tu me manques/i,
  /je n['']? ?oublierai jamais/i, /c[''']est la première fois/i,
  /je n['']? ?ai jamais dit ça/i, /je te fais confiance/i,
  /je ressens quelque chose/i,
  /personne ne sait/i, /je n['']? ?ai jamais avoué/i,
  /mon secret/i, /en vérité/i,
  /\*(?:embrasse|serre dans ses bras|prend la main|effleure|caresse|s[''']approche très près)\*/i,
  /\*(?:pleure|les larmes|les yeux brillants|la voix brisée)\*/i,
  /\*(?:sourit pour la première fois|rit vraiment|le cœur s[''']emballe)\*/i,
  /je resterai/i, /je partirai jamais/i, /à partir de maintenant/i,
  /quelque chose a changé/i, /je veux qu['']on/i,
  /\*(?:enlève|retire|déboutonne|soulève|glisse)\*/i,
  /\*(?:gémit|soupire profondément|frissonne|tremble légèrement)\*/i,
  /je t[e']? ?veux/i, /viens avec moi/i,
  /je ne te pardonnerai jamais/i, /je suis désolé[e]?/i,
  /comment as-tu pu/i, /je t[e']? ?ai menti/i,
];

function detectTone(recentMessages) {
  const text = (recentMessages || []).slice(-6).map(m => m.content || '').join(' ').toLowerCase();
  if (text.match(/aime|baise|nud|désir|corps|touche|sent bon/)) return 'intime et sensuel';
  if (text.match(/embrasse|serre|câlin|tendre|doux/)) return 'tendre et proche';
  if (text.match(/jaloux|colère|cris|dispute|blessé/)) return 'tendu / conflictuel';
  if (text.match(/rit|taquine|drôle|sourire|malicieux/)) return 'complice et joueur';
  if (text.match(/secret|mélancolie|doute|peur|vulnérable/)) return 'vulnérable et sincère';
  return 'neutre';
}

class MemoryService {

  // ══════════════════════════════════════════
  // SOUVENIRS CLÉS
  // ══════════════════════════════════════════

  extractMemoryFromMessage(characterName, aiMessage, userMessage) {
    if (!aiMessage || aiMessage.length < 30) return null;
    if (!MEMORY_TRIGGERS.some(p => p.test(aiMessage))) return null;

    const cleaned = aiMessage.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    const userCtx = userMessage
      ? `(${userMessage.substring(0, 60).trim()}${userMessage.length > 60 ? '…' : ''}) → `
      : '';

    return {
      id: Date.now().toString(36),
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }),
      content: userCtx + cleaned.substring(0, 240),
    };
  }

  async saveMemory(characterId, memory) {
    if (!characterId || !memory) return;
    try {
      const existing = await this.getMemories(characterId);
      const isDup = existing.some(m => m.content.substring(0, 80) === memory.content.substring(0, 80));
      if (isDup) return;
      await AsyncStorage.setItem(KEYS.memories(characterId), JSON.stringify([memory, ...existing].slice(0, MAX_MEMORIES)));
    } catch {}
  }

  async getMemories(characterId) {
    if (!characterId) return [];
    try {
      const raw = await AsyncStorage.getItem(KEYS.memories(characterId));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  // ══════════════════════════════════════════
  // ARC RELATIONNEL
  // ══════════════════════════════════════════

  async updateRelationshipArc(characterId, aiResponse, userMessage, relationship, recentMessages) {
    if (!characterId) return;
    try {
      const arc = await this._getArc(characterId) || { events: [], currentTone: 'neutre', lastUpdated: null };

      if (MEMORY_TRIGGERS.some(p => p.test(aiResponse))) {
        const clean = aiResponse.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
        const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        const level = relationship?.level || 1;
        const userCtx = userMessage ? `"${userMessage.substring(0, 50)}" → ` : '';
        const event = `[Niv.${level} — ${date}] ${userCtx}${clean.substring(0, 180)}`;
        arc.events = [event, ...arc.events].slice(0, MAX_ARC_EVENTS);
      }

      const interactions = relationship?.interactions || 0;
      if (interactions % 5 === 0 || !arc.lastUpdated) {
        arc.currentTone = detectTone(recentMessages || []);
      }
      arc.lastUpdated = new Date().toISOString();
      if (relationship) {
        arc.lastRelation = {
          level: relationship.level, affection: relationship.affection,
          trust: relationship.trust, interactions: relationship.interactions,
        };
      }
      await AsyncStorage.setItem(KEYS.arc(characterId), JSON.stringify(arc));
    } catch {}
  }

  async _getArc(characterId) {
    try {
      const raw = await AsyncStorage.getItem(KEYS.arc(characterId));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  // ══════════════════════════════════════════
  // RÉSUMÉ RÉCENT (fenêtre glissante)
  // ══════════════════════════════════════════

  async updateRecentSummary(characterId, messages) {
    if (!characterId || !messages?.length) return;
    try {
      const recent = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-SUMMARY_WINDOW);
      const condensed = recent.map(m => {
        const who = m.role === 'user' ? 'Toi' : 'Lui/Elle';
        return `${who}: ${(m.content || '').substring(0, 100).replace(/\n/g, ' ')}`;
      }).join('\n');
      await AsyncStorage.setItem(KEYS.summary(characterId), condensed.substring(0, 2000));
    } catch {}
  }

  // ══════════════════════════════════════════
  // CONTEXT COMPLET — injection dans le prompt
  // ══════════════════════════════════════════

  async getFullContext(characterId, relationship) {
    const blocks = [];
    const arc = await this._getArc(characterId);
    const rel = arc?.lastRelation || relationship;

    // 1. État relation
    if (rel) {
      const tone = arc?.currentTone || 'neutre';
      blocks.push(
        `━━━━━━━━━━━━━━━━━━━━━━━━\nÉTAT DE NOTRE RELATION\n━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Niveau ${rel.level || 1} | ${rel.interactions || 0} échanges | Affection ${rel.affection || 0}% | Confiance ${rel.trust || 0}%\n` +
        `Ton actuel : ${tone}`
      );
    }

    // 2. Tournants / événements clés
    if (arc?.events?.length) {
      const lines = arc.events.slice(0, 8).map(e => `• ${e.substring(0, 200)}`).join('\n');
      blocks.push(`━━━━━━━━━━━━━━━━━━━━━━━━\nMOMENTS FONDATEURS\n━━━━━━━━━━━━━━━━━━━━━━━━\n${lines}`);
    }

    // 3. Souvenirs clés
    const memories = await this.getMemories(characterId);
    if (memories.length) {
      const lines = memories.slice(0, 10).map(m => `• [${m.date}] ${m.content.substring(0, 200)}`).join('\n');
      blocks.push(
        `━━━━━━━━━━━━━━━━━━━━━━━━\nSOUVENIRS IMPORTANTS\n(Fais-y référence naturellement si pertinent)\n━━━━━━━━━━━━━━━━━━━━━━━━\n${lines}`
      );
    }

    return blocks.join('\n\n');
  }

  // Compatibilité avec l'ancien code
  async getMemoriesPrompt(characterId) {
    const memories = await this.getMemories(characterId);
    if (!memories.length) return '';
    const lines = memories.slice(0, 12).map(m => `• [${m.date}] ${m.content.substring(0, 180)}`).join('\n');
    return `━━━━━━━━━━━━━━━━━━━━━━━━\nSOUVENIRS\n━━━━━━━━━━━━━━━━━━━━━━━━\n${lines}`;
  }

  async clearCharacterMemories(characterId) {
    await AsyncStorage.multiRemove([
      KEYS.memories(characterId), KEYS.arc(characterId), KEYS.summary(characterId),
    ]).catch(() => {});
  }

  async clearAllMemories() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter(k => k.startsWith('char_memories_') || k.startsWith('char_arc_') || k.startsWith('char_summary_'));
      if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    } catch {}
  }

  async getTotalMemoriesCount() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let total = 0;
      for (const k of keys.filter(k => k.startsWith('char_memories_'))) {
        const raw = await AsyncStorage.getItem(k);
        if (raw) total += JSON.parse(raw).length;
      }
      return total;
    } catch { return 0; }
  }
}

export default new MemoryService();
