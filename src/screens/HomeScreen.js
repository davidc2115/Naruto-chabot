import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
} from 'react-native';
import characters from '../data/characters';

export default function HomeScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('tous');
  const [filteredCharacters, setFilteredCharacters] = useState(characters);

  useEffect(() => {
    filterCharacters();
  }, [searchQuery, selectedFilter]);

  const filterCharacters = () => {
    let filtered = characters;

    // Filter by gender
    if (selectedFilter !== 'tous') {
      filtered = filtered.filter(char => char.gender === selectedFilter);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(char =>
        char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        char.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        char.personality.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCharacters(filtered);
  };

  const renderCharacter = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CharacterDetail', { character: item })}
    >
      <View style={styles.cardContent}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {item.name.split(' ').map(n => n[0]).join('')}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.age}>{item.age} ans • {
            item.gender === 'male' ? 'Homme' :
            item.gender === 'female' ? 'Femme' : 
            'Non-binaire'
          }</Text>
          <Text style={styles.description} numberOfLines={2}>
            {item.scenario}
          </Text>
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Personnages</Text>
        <Text style={styles.subtitle}>{filteredCharacters.length} personnages disponibles</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un personnage..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'tous' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('tous')}
        >
          <Text style={[styles.filterText, selectedFilter === 'tous' && styles.filterTextActive]}>
            Tous
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'female' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('female')}
        >
          <Text style={[styles.filterText, selectedFilter === 'female' && styles.filterTextActive]}>
            Femmes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'male' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('male')}
        >
          <Text style={[styles.filterText, selectedFilter === 'male' && styles.filterTextActive]}>
            Hommes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'non-binary' && styles.filterButtonActive]}
          onPress={() => setSelectedFilter('non-binary')}
        >
          <Text style={[styles.filterText, selectedFilter === 'non-binary' && styles.filterTextActive]}>
            NB
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCharacters}
        renderItem={renderCharacter}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#6366f1',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 15,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  age: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 10,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '500',
  },
});
