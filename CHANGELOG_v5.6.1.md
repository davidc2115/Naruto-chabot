# Changelog v5.6.1 — Respect du choix utilisateur (Local / Groq / Mix)

## 🐛 Bugs corrigés

### Génération de texte
Le réglage `Paramètres → Système de texte` ('local', 'groq', 'mix') était
sauvegardé mais **jamais lu** par `ConversationScreen.js`. Conséquence : peu
importe le choix, l'app utilisait toujours Groq en priorité et Llama uniquement
en fallback si Groq échouait.

✅ `ConversationScreen.js` lit désormais `text_generation_system` depuis
`AsyncStorage` à chaque génération :
- `local` → utilise UNIQUEMENT Llama hors-ligne (auto-charge Phi-3.5 ou
  Llama 3.2 si téléchargé)
- `groq` → utilise UNIQUEMENT Groq (cloud)
- `mix` (défaut) → Groq d'abord, fallback Llama, puis serveur Replit

### Génération d'image
Même problème : `image_generation_system` ('local', 'horde', 'pollinations',
'mix') était sauvegardé mais ignoré. De plus, le code appelait `LocalImageService`
(un placeholder TFLite qui ne génère rien) avant de fallback vers le serveur,
sans jamais utiliser `StableDiffusionLocalService` (le vrai module natif ONNX).

✅ `ConversationScreen.js` lit désormais `image_generation_system` :
- `local` → utilise UNIQUEMENT `StableDiffusionLocalService` (ONNX natif).
  Init du pipeline auto si nécessaire.
- `horde` → force Stable Horde
- `pollinations` → force Pollinations
- `mix` (défaut) → SD local si modèles téléchargés, sinon Pollinations →
  Stable Horde

✅ `ImageGenerationService.generateSceneImage()` accepte un nouveau paramètre
`forcedBackend` pour permettre le forçage du backend depuis l'UI.

✅ Conversion base64 → fichier URI pour les images SD locales (la galerie
attend un URI).

## 📝 Fichiers modifiés
- `src/screens/ConversationScreen.js` (logique texte + image)
- `src/services/ImageGenerationService.js` (paramètre forcedBackend)
- `package.json` / `app.json` : version 5.6.1 / versionCode 133
