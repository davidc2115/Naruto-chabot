# v5.6.0 — Dialogues immersifs & corrections

## 🎭 Conversations plus naturelles
- **Llama (offline) ET Groq utilisent désormais le même système** : format `*action* / (pensée) / "dialogue"`.
- Réponses **courtes** (2–4 phrases max), modérées, jamais des pavés robotiques.
- **Tempérament / caractère réellement appliqués** (froid, timide, dominant, joueur, doux, mystérieux, jaloux…) via des règles dédiées dans le prompt.
- **Scénario de départ respecté** : la relation initiale (belle-mère, voisine, collègue, etc.) **reste la base** de chaque échange.
- **Évolution graduelle en 5 phases** (Niveau / Affection / Interactions) :
  1. Début — curiosité, gêne, taquineries légères. **Pas de "je t'aime".**
  2. Rapprochement — confidences, contacts furtifs.
  3. Tension — frôlements, baisers volés, désir avoué entre les lignes.
  4. Intimité — étreintes, déclarations sincères.
  5. Passion — fusion totale.
- Les personnages **ne tombent plus amoureux dès le premier message**.

## 🤖 Llama hors-ligne aligné
- Paramètres recalibrés : `n_predict=180`, `repeat_penalty=1.2`, stops étendus pour éviter les réponses qui s'éternisent.
- Nettoyage automatique si le modèle simule un nouveau tour utilisateur.
- Utilise exactement le même prompt que Groq (incluant scénario + phase relationnelle).

## 🖼️ Génération d'images
- Pollinations passe par `FileSystem.downloadAsync` directement (plus de conversion blob→base64 lente).
- Timeout réduit à **45 s** (plus de génération de plusieurs heures).
- Le fichier est désormais **copié dans la galerie** dès la sauvegarde — fini les images manquantes dans la galerie du personnage.
- Détection automatique des chemins locaux (`file://`) pour éviter les re-téléchargements échoués.

## ⌨️ UI Conversation
- `keyboardShouldPersistTaps="handled"` + `keyboardDismissMode="none"` → **le clavier ne se referme plus tout seul**.
- `KeyboardAvoidingView` corrigé sur Android (`behavior=undefined`) pour stabiliser la zone de saisie et le scroll.

— version `5.6.0`, versionCode `132`.
