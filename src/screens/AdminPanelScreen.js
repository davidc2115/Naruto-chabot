import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, SafeAreaView, Platform, StatusBar, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GroqService from '../services/GroqService';
import MemoryService from '../services/MemoryService';
import ApiServerService from '../services/ApiServerService';

export default function AdminPanelScreen() {
  const [groqKeys, setGroqKeys] = useState([]);
  const [newKey, setNewKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [stableHordeKey, setStableHordeKey] = useState('');
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [memoriesCount, setMemoriesCount] = useState(0);
  const [activeSection, setActiveSection] = useState('groq');
  const [serverUrl, setServerUrl] = useState('');
  const [serverUrlInput, setServerUrlInput] = useState('');
  const [testingServer, setTestingServer] = useState(false);
  const [serverTestResult, setServerTestResult] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const keys = await GroqService.loadApiKeys();
      setGroqKeys(keys || []);
      const model = await AsyncStorage.getItem('groq_model');
      if (model) setSelectedModel(model);
      const hordeKey = await AsyncStorage.getItem('stable_horde_key');
      if (hordeKey) setStableHordeKey(hordeKey);
      const count = await MemoryService.getTotalMemoriesCount();
      const sUrl = await ApiServerService.getServerUrl();
      setServerUrl(sUrl || '');
      setServerUrlInput(sUrl || '');
      setMemoriesCount(count);
    } catch (e) {
      console.error('Erreur chargement paramètres:', e);
    }
  };

  const addGroqKey = async () => {
    const trimmed = newKey.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('gsk_')) {
      Alert.alert('Clé invalide', 'Une clé Groq commence toujours par gsk_');
      return;
    }
    if (groqKeys.includes(trimmed)) {
      Alert.alert('Doublon', 'Cette clé est déjà enregistrée.');
      return;
    }
    const updated = [...groqKeys, trimmed];
    await GroqService.saveApiKeys(updated);
    setGroqKeys(updated);
    setNewKey('');
    Alert.alert('✅ Clé ajoutée', `${updated.length} clé(s) configurée(s)`);
  };

  const removeGroqKey = async (index) => {
    Alert.alert('Supprimer la clé', 'Confirmer la suppression ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          const updated = groqKeys.filter((_, i) => i !== index);
          await GroqService.saveApiKeys(updated);
          setGroqKeys(updated);
        }
      }
    ]);
  };

  const testGroqKey = async () => {
    if (!groqKeys.length) {
      Alert.alert('Aucune clé', 'Ajoutez au moins une clé Groq avant de tester.');
      return;
    }
    setTestingKey(true);
    setTestResult(null);
    try {
      const fakeCharacter = { name: 'Test', gender: 'female', age: '25', personality: 'curieuse', appearance: '' };
      const fakeProfile = { name: 'Utilisateur' };
      const response = await GroqService.generateResponse(
        [{ role: 'user', content: 'Dis juste "OK" en un mot.' }],
        fakeCharacter, fakeProfile, { maxTokens: 10 }
      );
      setTestResult({ ok: true, message: `✅ Clé valide ! Réponse: "${response.substring(0, 50)}"` });
    } catch (e) {
      setTestResult({ ok: false, message: `❌ Erreur: ${e.message}` });
    } finally {
      setTestingKey(false);
    }
  };

  const saveModel = async (modelId) => {
    setSelectedModel(modelId);
    await GroqService.saveModel(modelId);
  };

  const saveStableHordeKey = async () => {
    await AsyncStorage.setItem('stable_horde_key', stableHordeKey.trim());
    Alert.alert('✅ Clé Stable Horde sauvegardée');
  };

  const clearAllMemories = async () => {
    Alert.alert(
      '🧠 Effacer les souvenirs',
      'Tous les souvenirs de tous les personnages seront supprimés. Irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer tout', style: 'destructive', onPress: async () => {
            await MemoryService.clearAllMemories();
            setMemoriesCount(0);
            Alert.alert('✅ Souvenirs effacés');
          }
        }
      ]
    );
  };

  const saveServerUrl = async () => {
    const url = serverUrlInput.trim();
    await ApiServerService.setServerUrl(url || '');
    setServerUrl(url || '');
    setServerTestResult(null);
    Alert.alert(url ? '✅ URL serveur sauvegardée' : '✅ URL effacée', url ? 'L'app utilisera ce serveur pour générer les réponses.' : 'Retour en mode clé Groq locale.');
  };

  const testServerConnection = async () => {
    const url = serverUrlInput.trim();
    if (!url) {
      Alert.alert('URL vide', 'Entrez une URL serveur avant de tester.');
      return;
    }
    setTestingServer(true);
    setServerTestResult(null);
    try {
      await ApiServerService.setServerUrl(url);
      const ok = await ApiServerService.isServerAvailable();
      setServerTestResult({ ok, message: ok ? '✅ Serveur connecté et opérationnel !' : '❌ Serveur inaccessible — vérifiez l'URL' });
    } catch (e) {
      setServerTestResult({ ok: false, message: `❌ Erreur: ${e.message}` });
    } finally {
      setTestingServer(false);
    }
  };

  const SectionBtn = ({ id, label, icon }) => (
    <TouchableOpacity
      style={[styles.sectionBtn, activeSection === id && styles.sectionBtnActive]}
      onPress={() => setActiveSection(id)}
    >
      <Text style={styles.sectionBtnIcon}>{icon}</Text>
      <Text style={[styles.sectionBtnText, activeSection === id && styles.sectionBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚙️ Configuration</Text>
          <Text style={styles.headerSub}>Paramètres de l'application</Text>
        </View>

        <View style={styles.sectionTabs}>
          <SectionBtn id="groq" label="Groq IA" icon="🤖" />
          <SectionBtn id="serveur" label="Serveur" icon="🌐" />
          <SectionBtn id="image" label="Images" icon="🎨" />
          <SectionBtn id="memory" label="Mémoire" icon="🧠" />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

          {activeSection === 'groq' && (
            <View>
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>🔑 Clés API Groq</Text>
                <Text style={styles.infoText}>
                  Groq est gratuit. Créez votre compte sur{'\n'}
                  <Text style={styles.infoLink}>console.groq.com</Text>
                  {'\n'}puis copiez votre clé API (commence par gsk_).
                </Text>
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.keyInput}
                  value={newKey}
                  onChangeText={setNewKey}
                  placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
                  placeholderTextColor="#444"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={false}
                />
                <TouchableOpacity style={styles.addBtn} onPress={addGroqKey}>
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {groqKeys.length === 0 && (
                <View style={styles.emptyKeys}>
                  <Text style={styles.emptyKeysText}>Aucune clé configurée — le chatbot ne fonctionnera pas</Text>
                </View>
              )}

              {groqKeys.map((key, i) => (
                <View key={i} style={styles.keyRow}>
                  <Text style={styles.keyText}>
                    🔑 {key.substring(0, 8)}...{key.slice(-4)}
                  </Text>
                  <TouchableOpacity onPress={() => removeGroqKey(i)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.testBtn, testingKey && { opacity: 0.6 }]}
                onPress={testGroqKey}
                disabled={testingKey}
              >
                <Text style={styles.testBtnText}>{testingKey ? 'Test en cours…' : '⚡ Tester la connexion'}</Text>
              </TouchableOpacity>

              {testResult && (
                <View style={[styles.testResult, { borderColor: testResult.ok ? '#22c55e' : '#ef4444' }]}>
                  <Text style={{ color: testResult.ok ? '#22c55e' : '#ef4444', fontSize: 13 }}>
                    {testResult.message}
                  </Text>
                </View>
              )}

              <Text style={styles.sectionLabel}>🧬 Modèle IA</Text>
              {GroqService.models.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.modelRow, selectedModel === m.id && styles.modelRowActive]}
                  onPress={() => saveModel(m.id)}
                >
                  <View style={[styles.modelRadio, selectedModel === m.id && styles.modelRadioActive]} />
                  <Text style={[styles.modelName, selectedModel === m.id && styles.modelNameActive]}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeSection === 'image' && (
            <View>
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>🎨 Génération d'images</Text>
                <Text style={styles.infoText}>
                  Les images sont générées gratuitement via{'\n'}
                  <Text style={styles.infoLink}>Stable Horde</Text>
                  {'\n'}(stablehorde.net) sans aucune configuration.{'\n\n'}
                  Pour une file d'attente prioritaire, créez un compte et entrez votre clé Stable Horde ci-dessous (optionnel).
                </Text>
              </View>

              <Text style={styles.sectionLabel}>🔑 Clé Stable Horde (optionnel)</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.keyInput}
                  value={stableHordeKey}
                  onChangeText={setStableHordeKey}
                  placeholder="Votre clé Stable Horde (optionnel)"
                  placeholderTextColor="#444"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.addBtn} onPress={saveStableHordeKey}>
                  <Text style={styles.addBtnText}>✓</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>ℹ️ Comment ça marche ?</Text>
                <Text style={styles.infoText}>
                  1. Appuyez sur 🎨 dans une conversation{'\n'}
                  2. L'image est générée selon le contexte de la conversation et votre niveau de relation avec le personnage{'\n'}
                  3. L'image est sauvegardée automatiquement dans la galerie{'\n\n'}
                  Délai moyen : 30 à 120 secondes selon la file d'attente du réseau Stable Horde.
                </Text>
              </View>
            </View>
          )}

          {activeSection === 'serveur' && (
            <View>
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>🌐 Serveur IA intégré</Text>
                <Text style={styles.infoText}>
                  Si un serveur Replit est déployé, l'app l'utilise automatiquement — aucune clé Groq requise.{'

'}
                  Laissez vide pour utiliser uniquement votre clé Groq locale.
                </Text>
              </View>

              <Text style={styles.sectionLabel}>🔗 URL du serveur</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.keyInput}
                  value={serverUrlInput}
                  onChangeText={setServerUrlInput}
                  placeholder="https://mon-serveur.replit.app"
                  placeholderTextColor="#444"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <TouchableOpacity style={styles.addBtn} onPress={saveServerUrl}>
                  <Text style={styles.addBtnText}>✓</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.testBtn, testingServer && { opacity: 0.6 }]}
                onPress={testServerConnection}
                disabled={testingServer}
              >
                <Text style={styles.testBtnText}>{testingServer ? 'Test en cours…' : '⚡ Tester la connexion serveur'}</Text>
              </TouchableOpacity>

              {serverTestResult && (
                <View style={[styles.testResult, { borderColor: serverTestResult.ok ? '#22c55e' : '#ef4444' }]}>
                  <Text style={{ color: serverTestResult.ok ? '#22c55e' : '#ef4444', fontSize: 13 }}>
                    {serverTestResult.message}
                  </Text>
                </View>
              )}

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>ℹ️ Comment ça marche ?</Text>
                <Text style={styles.infoText}>
                  1. Le serveur Replit héberge la clé Groq de manière sécurisée{'
'}
                  2. L'app envoie les messages au serveur{'
'}
                  3. Le serveur génère la réponse et la retourne{'

'}
                  Cela permet à tous les utilisateurs de profiter de l'IA sans configurer de clé.
                </Text>
              </View>
            </View>
          )}

          {activeSection === 'memory' && (
            <View>
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>🧠 Mémoire des personnages</Text>
                <Text style={styles.infoText}>
                  L'IA mémorise automatiquement les moments importants de vos conversations : aveux, révélations, décisions, moments intenses.{'\n\n'}
                  Ces souvenirs sont injectés dans chaque nouvelle conversation pour que le personnage s'en souvienne naturellement.
                </Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{memoriesCount}</Text>
                  <Text style={styles.statLabel}>Souvenirs enregistrés</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.dangerBtn} onPress={clearAllMemories}>
                <Text style={styles.dangerBtnText}>🗑️ Effacer tous les souvenirs</Text>
              </TouchableOpacity>

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>💡 Comment sont créés les souvenirs ?</Text>
                <Text style={styles.infoText}>
                  Après chaque échange, l'IA analyse la réponse du personnage et détecte automatiquement les moments qui méritent d'être mémorisés :{'\n\n'}
                  • Moments émotionnels forts{'\n'}
                  • Révélations ou aveux{'\n'}
                  • Décisions importantes prises ensemble{'\n'}
                  • Moments de tension ou de complicité{'\n\n'}
                  Maximum 30 souvenirs par personnage (les plus anciens sont remplacés).
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a12',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: { flex: 1, backgroundColor: '#0a0a12' },
  header: {
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#C9A227' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  sectionTabs: {
    flexDirection: 'row',
    backgroundColor: '#0d0d1a',
    padding: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  sectionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 10, borderRadius: 10, backgroundColor: '#1a1a2e',
  },
  sectionBtnActive: { backgroundColor: '#C9A227' },
  sectionBtnIcon: { fontSize: 16 },
  sectionBtnText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  sectionBtnTextActive: { color: '#000' },
  content: { flex: 1, padding: 16 },
  infoBox: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#C9A227',
  },
  infoTitle: { color: '#C9A227', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  infoText: { color: '#9ca3af', fontSize: 13, lineHeight: 20 },
  infoLink: { color: '#C9A227', fontWeight: 'bold' },
  sectionLabel: { color: '#D4AF37', fontSize: 14, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  keyInput: {
    flex: 1, backgroundColor: '#111827', color: '#fff', borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: '#1f2937', fontSize: 13,
  },
  addBtn: {
    backgroundColor: '#C9A227', width: 46, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  addBtnText: { color: '#000', fontSize: 22, fontWeight: 'bold' },
  emptyKeys: {
    backgroundColor: '#1f0a0a', borderRadius: 10, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#7f1d1d',
  },
  emptyKeysText: { color: '#fca5a5', fontSize: 13, textAlign: 'center' },
  keyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#111827', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#1f2937',
  },
  keyText: { color: '#D4AF37', fontSize: 14, fontFamily: 'monospace', flex: 1 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: '#ef4444', fontSize: 18, fontWeight: 'bold' },
  testBtn: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    alignItems: 'center', marginVertical: 12, borderWidth: 1, borderColor: '#C9A227',
  },
  testBtnText: { color: '#C9A227', fontSize: 15, fontWeight: '700' },
  testResult: {
    borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, backgroundColor: '#0d0d1a',
  },
  modelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111827', borderRadius: 10, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#1f2937',
  },
  modelRowActive: { borderColor: '#C9A227', backgroundColor: '#1a160a' },
  modelRadio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#4b5563',
  },
  modelRadioActive: { borderColor: '#C9A227', backgroundColor: '#C9A227' },
  modelName: { color: '#9ca3af', fontSize: 14 },
  modelNameActive: { color: '#C9A227', fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#1f2937',
  },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#C9A227' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  dangerBtn: {
    backgroundColor: '#1f0a0a', borderRadius: 12, padding: 14,
    alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#7f1d1d',
  },
  dangerBtnText: { color: '#fca5a5', fontSize: 15, fontWeight: '700' },
});
