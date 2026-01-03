import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import CustomCharacterService from '../services/CustomCharacterService';

export default function CreateCharacterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('female');
  const [hairColor, setHairColor] = useState('');
  const [appearance, setAppearance] = useState('');
  const [bust, setBust] = useState('C');
  const [penis, setPenis] = useState('17');
  const [personality, setPersonality] = useState('');
  const [temperament, setTemperament] = useState('amical');
  const [scenario, setScenario] = useState('');
  const [startMessage, setStartMessage] = useState('');

  const bustSizes = ['A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G'];
  const temperaments = ['amical', 'timide', 'flirt', 'direct', 'taquin', 'romantique', 'mystérieux'];

  const handleSave = async () => {
    if (!name || !age || !appearance || !personality || !scenario || !startMessage) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const character = {
        name,
        age: parseInt(age),
        gender,
        hairColor,
        appearance,
        ...(gender === 'female' ? { bust } : { penis: `${penis}cm` }),
        personality,
        temperament,
        tags: [temperament, 'personnalisé'],
        scenario,
        startMessage,
      };

      await CustomCharacterService.saveCustomCharacter(character);
      Alert.alert('Succès', 'Personnage créé !', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le personnage');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Créer un personnage</Text>

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
        placeholder="Ex: blonde, brune, rousse..."
      />

      <Text style={styles.label}>Apparence physique *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={appearance}
        onChangeText={setAppearance}
        placeholder="Décrivez l'apparence détaillée..."
        multiline
        numberOfLines={4}
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
            key={temp}
            style={[styles.tempButton, temperament === temp && styles.tempButtonActive]}
            onPress={() => setTemperament(temp)}
          >
            <Text style={[styles.tempText, temperament === temp && styles.tempTextActive]}>
              {temp}
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

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Créer le personnage</Text>
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
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  tempButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  tempText: {
    fontSize: 14,
    color: '#6b7280',
  },
  tempTextActive: {
    color: '#fff',
    fontWeight: '600',
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
});
