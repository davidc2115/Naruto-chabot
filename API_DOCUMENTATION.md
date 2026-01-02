# API Documentation

## Services Overview

L'application utilise trois services principaux :

### 1. GroqService
Gère la génération de texte via l'API Groq.

### 2. ImageGenerationService
Gère la génération d'images via Pollinations.ai.

### 3. StorageService
Gère le stockage local des conversations et relations.

---

## GroqService

### Méthodes

#### `loadApiKeys()`
Charge les clés API depuis AsyncStorage.

```javascript
await GroqService.loadApiKeys();
```

#### `saveApiKeys(keys: string[])`
Sauvegarde les clés API.

```javascript
await GroqService.saveApiKeys(['key1', 'key2', 'key3']);
```

#### `rotateKey()`
Change la clé API courante (rotation automatique).

```javascript
GroqService.rotateKey();
```

#### `getCurrentKey()`
Retourne la clé API actuellement utilisée.

```javascript
const key = GroqService.getCurrentKey();
```

#### `generateResponse(messages, character, retries = 3)`
Génère une réponse IA.

**Paramètres :**
- `messages`: Array d'objets `{ role: 'user' | 'assistant', content: string }`
- `character`: Objet personnage complet
- `retries`: Nombre de tentatives (défaut: 3)

**Retourne :** String (réponse générée)

**Throws :** Error si échec après toutes les tentatives

```javascript
const response = await GroqService.generateResponse(
  [{ role: 'user', content: 'Bonjour' }],
  character
);
```

#### `buildSystemPrompt(character)`
Construit le prompt système pour le personnage.

**Interne** - Utilisé par `generateResponse()`

---

## ImageGenerationService

### Méthodes

#### `generateImage(prompt, style = null)`
Génère une image à partir d'un prompt.

**Paramètres :**
- `prompt`: String - Description de l'image
- `style`: String (optionnel) - Style spécifique

**Retourne :** String (URL de l'image)

```javascript
const imageUrl = await ImageGenerationService.generateImage(
  'beautiful woman, blonde hair, blue eyes',
  'photorealistic portrait'
);
```

#### `getRandomStyle()`
Retourne un style aléatoire parmi les disponibles.

```javascript
const style = ImageGenerationService.getRandomStyle();
```

**Styles disponibles :**
- 'photorealistic portrait'
- 'anime style portrait'
- 'digital art portrait'
- 'realistic photo'
- 'cartoon style'
- '3D render'

#### `generateCharacterImage(character)`
Génère une image pour un personnage.

**Paramètres :**
- `character`: Objet personnage

**Retourne :** String (URL de l'image)

```javascript
const imageUrl = await ImageGenerationService.generateCharacterImage(character);
```

---

## StorageService

### Méthodes de conversation

#### `saveConversation(characterId, messages, relationship)`
Sauvegarde une conversation.

```javascript
await StorageService.saveConversation(
  characterId,
  messages,
  relationship
);
```

#### `loadConversation(characterId)`
Charge une conversation.

**Retourne :** Object | null

```javascript
const conversation = await StorageService.loadConversation(characterId);
// { characterId, messages, relationship, lastUpdated }
```

#### `getAllConversations()`
Charge toutes les conversations.

**Retourne :** Array

```javascript
const conversations = await StorageService.getAllConversations();
```

#### `deleteConversation(characterId)`
Supprime une conversation.

```javascript
await StorageService.deleteConversation(characterId);
```

### Méthodes de relation

#### `saveRelationship(characterId, relationship)`
Sauvegarde une relation.

```javascript
await StorageService.saveRelationship(characterId, {
  experience: 150,
  level: 2,
  affection: 65,
  trust: 55,
  interactions: 15
});
```

#### `loadRelationship(characterId)`
Charge une relation.

**Retourne :** Object

```javascript
const relationship = await StorageService.loadRelationship(characterId);
```

#### `getDefaultRelationship()`
Retourne une relation par défaut.

```javascript
const defaultRel = StorageService.getDefaultRelationship();
// { experience: 0, level: 1, affection: 50, trust: 50, interactions: 0 }
```

#### `calculateRelationshipChange(message, character)`
Calcule les changements de relation.

**Retourne :** Object

```javascript
const changes = StorageService.calculateRelationshipChange(
  "Merci beaucoup!",
  character
);
// { expGain: 5, affectionChange: 2, trustChange: 1 }
```

---

## Objets de données

### Character

```javascript
{
  id: number,
  name: string,
  age: number,
  gender: 'male' | 'female' | 'non-binary',
  hairColor: string,
  appearance: string,
  personality: string,
  temperament: 'romantique' | 'timide' | 'direct' | 'flirt' | 'taquin' | 'coquin' | 'mystérieux' | 'dominant',
  tags: string[],
  scenario: string,
  startMessage: string
}
```

### Message

```javascript
{
  role: 'user' | 'assistant' | 'system',
  content: string,
  timestamp: string, // ISO date
  image?: string // URL (optionnel)
}
```

### Relationship

```javascript
{
  experience: number,
  level: number,
  affection: number, // 0-100
  trust: number, // 0-100
  interactions: number
}
```

### Conversation

```javascript
{
  characterId: number,
  messages: Message[],
  relationship: Relationship,
  lastUpdated: string // ISO date
}
```

---

## Constantes

### Modèles Groq disponibles

```javascript
'mixtral-8x7b-32768' // Défaut
'llama-3.1-70b-versatile'
'llama-3.1-8b-instant'
```

### Configuration API

```javascript
// Groq
baseURL: 'https://api.groq.com/openai/v1/chat/completions'
timeout: 30000 // 30 secondes

// Pollinations.ai
baseURL: 'https://image.pollinations.ai/prompt/'
```

---

## Gestion d'erreurs

### GroqService

```javascript
try {
  const response = await GroqService.generateResponse(messages, character);
} catch (error) {
  if (error.message.includes('clé API')) {
    // Pas de clé configurée
  } else if (error.message.includes('tentatives')) {
    // Échec après plusieurs tentatives
  }
}
```

### ImageGenerationService

```javascript
try {
  const imageUrl = await ImageGenerationService.generateImage(prompt);
} catch (error) {
  // Généralement erreur réseau
}
```

### StorageService

Les erreurs sont loggées mais n'interrompent pas le flux.

---

## Exemples d'utilisation

### Conversation complète

```javascript
// Charger une conversation existante
const conversation = await StorageService.loadConversation(character.id);
let messages = conversation?.messages || [];
let relationship = await StorageService.loadRelationship(character.id);

// Ajouter un message utilisateur
const userMessage = {
  role: 'user',
  content: '*Je souris* "Bonjour!"',
  timestamp: new Date().toISOString()
};
messages.push(userMessage);

// Générer la réponse
const response = await GroqService.generateResponse(messages, character);

// Ajouter la réponse
const assistantMessage = {
  role: 'assistant',
  content: response,
  timestamp: new Date().toISOString()
};
messages.push(assistantMessage);

// Mettre à jour la relation
const changes = StorageService.calculateRelationshipChange(
  userMessage.content,
  character
);
relationship.experience += changes.expGain;
relationship.level = Math.floor(relationship.experience / 100) + 1;
relationship.affection = Math.min(100, relationship.affection + changes.affectionChange);
relationship.trust = Math.min(100, relationship.trust + changes.trustChange);
relationship.interactions++;

// Sauvegarder
await StorageService.saveConversation(character.id, messages, relationship);
```

### Génération d'image dans une conversation

```javascript
// Créer le prompt basé sur le contexte
const recentMessages = messages.slice(-3).map(m => m.content).join(' ');
const prompt = `${character.appearance}, ${recentMessages}`;

// Générer l'image
const imageUrl = await ImageGenerationService.generateImage(prompt);

// Ajouter à la conversation
const imageMessage = {
  role: 'system',
  content: '[Image générée]',
  image: imageUrl,
  timestamp: new Date().toISOString()
};
messages.push(imageMessage);

await StorageService.saveConversation(character.id, messages, relationship);
```

---

## Performance et optimisation

### Rotation de clés

Le système de rotation automatique :
1. Essaie avec la clé courante
2. Si échec, passe à la clé suivante
3. Réessaie avec la nouvelle clé
4. Continue jusqu'à succès ou épuisement des clés

### Cache et stockage

- Conversations : AsyncStorage local
- Pas de limite de taille (limitée par l'appareil)
- Chargement asynchrone pour performance

### Gestion réseau

- Timeout de 30s pour Groq
- Retry automatique (3 tentatives par défaut)
- Images : pas de timeout (streaming)
