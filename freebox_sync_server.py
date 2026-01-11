#!/usr/bin/env python3
"""
Serveur de Synchronisation Freebox pour Roleplay Chat
- Synchronisation des données utilisateur
- Gestion des personnages publics/privés
- API REST pour l'application mobile
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import uuid
import time
from datetime import datetime
import hashlib

app = Flask(__name__)
CORS(app)

# Configuration
DATA_DIR = os.path.expanduser("~/roleplay_sync_data")
CHARACTERS_DIR = os.path.join(DATA_DIR, "public_characters")
USERS_DIR = os.path.join(DATA_DIR, "users")
SYNC_DIR = os.path.join(DATA_DIR, "sync")

# Créer les dossiers nécessaires
for d in [DATA_DIR, CHARACTERS_DIR, USERS_DIR, SYNC_DIR]:
    os.makedirs(d, exist_ok=True)

print(f"📁 Dossier données: {DATA_DIR}")
print(f"📁 Personnages publics: {CHARACTERS_DIR}")

# ==================== UTILITAIRES ====================

def get_user_id(request):
    """Récupère ou génère un ID utilisateur unique"""
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        # Générer un ID basé sur l'IP et un hash
        ip = request.remote_addr
        user_id = hashlib.md5(f"{ip}_{time.time()}".encode()).hexdigest()[:16]
    return user_id

def load_json(filepath, default=None):
    """Charge un fichier JSON"""
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return default if default is not None else {}

def save_json(filepath, data):
    """Sauvegarde un fichier JSON"""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ==================== PERSONNAGES PUBLICS ====================

@app.route('/api/characters/public', methods=['GET'])
def get_public_characters():
    """Récupère tous les personnages publics"""
    try:
        characters = []
        
        # Lire tous les fichiers de personnages publics
        for filename in os.listdir(CHARACTERS_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(CHARACTERS_DIR, filename)
                char_data = load_json(filepath)
                if char_data:
                    characters.append(char_data)
        
        # Trier par date de création (plus récent en premier)
        characters.sort(key=lambda x: x.get('createdAt', 0), reverse=True)
        
        return jsonify({
            'success': True,
            'count': len(characters),
            'characters': characters
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/characters/public', methods=['POST'])
def publish_character():
    """Publie un personnage (le rend public)"""
    try:
        data = request.json
        user_id = get_user_id(request)
        
        if not data or 'character' not in data:
            return jsonify({'success': False, 'error': 'Données manquantes'}), 400
        
        character = data['character']
        
        # Générer un ID unique si absent
        if 'id' not in character:
            character['id'] = f"public_{uuid.uuid4().hex[:12]}"
        
        # Ajouter les métadonnées
        character['isPublic'] = True
        character['createdBy'] = user_id
        character['createdAt'] = int(time.time() * 1000)
        character['publishedAt'] = int(time.time() * 1000)
        character['likes'] = character.get('likes_count', 0)
        character['downloads'] = 0
        
        # Sauvegarder
        filepath = os.path.join(CHARACTERS_DIR, f"{character['id']}.json")
        save_json(filepath, character)
        
        print(f"✅ Personnage publié: {character.get('name')} par {user_id}")
        
        return jsonify({
            'success': True,
            'character': character,
            'message': 'Personnage publié avec succès'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/characters/public/<char_id>', methods=['DELETE'])
def unpublish_character(char_id):
    """Retire un personnage des publics"""
    try:
        user_id = get_user_id(request)
        filepath = os.path.join(CHARACTERS_DIR, f"{char_id}.json")
        
        if os.path.exists(filepath):
            char_data = load_json(filepath)
            # Vérifier que c'est bien le créateur
            if char_data.get('createdBy') == user_id:
                os.remove(filepath)
                return jsonify({'success': True, 'message': 'Personnage retiré'})
            else:
                return jsonify({'success': False, 'error': 'Non autorisé'}), 403
        else:
            return jsonify({'success': False, 'error': 'Personnage non trouvé'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/characters/public/<char_id>/like', methods=['POST'])
def like_character(char_id):
    """Ajoute un like à un personnage"""
    try:
        filepath = os.path.join(CHARACTERS_DIR, f"{char_id}.json")
        
        if os.path.exists(filepath):
            char_data = load_json(filepath)
            char_data['likes'] = char_data.get('likes', 0) + 1
            save_json(filepath, char_data)
            return jsonify({'success': True, 'likes': char_data['likes']})
        else:
            return jsonify({'success': False, 'error': 'Personnage non trouvé'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/characters/public/<char_id>/download', methods=['POST'])
def download_character(char_id):
    """Enregistre un téléchargement de personnage"""
    try:
        filepath = os.path.join(CHARACTERS_DIR, f"{char_id}.json")
        
        if os.path.exists(filepath):
            char_data = load_json(filepath)
            char_data['downloads'] = char_data.get('downloads', 0) + 1
            save_json(filepath, char_data)
            return jsonify({'success': True, 'character': char_data})
        else:
            return jsonify({'success': False, 'error': 'Personnage non trouvé'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== SYNCHRONISATION ====================

@app.route('/api/sync/upload', methods=['POST'])
def sync_upload():
    """Upload des données utilisateur pour synchronisation"""
    try:
        data = request.json
        user_id = get_user_id(request)
        
        if not data:
            return jsonify({'success': False, 'error': 'Données manquantes'}), 400
        
        # Créer le dossier utilisateur
        user_dir = os.path.join(SYNC_DIR, user_id)
        os.makedirs(user_dir, exist_ok=True)
        
        # Sauvegarder chaque type de données
        sync_data = {
            'lastSync': int(time.time() * 1000),
            'userId': user_id
        }
        
        if 'profile' in data:
            save_json(os.path.join(user_dir, 'profile.json'), data['profile'])
            sync_data['profileSynced'] = True
            
        if 'customCharacters' in data:
            save_json(os.path.join(user_dir, 'custom_characters.json'), data['customCharacters'])
            sync_data['charactersSynced'] = len(data['customCharacters'])
            
        if 'conversations' in data:
            save_json(os.path.join(user_dir, 'conversations.json'), data['conversations'])
            sync_data['conversationsSynced'] = len(data['conversations'])
            
        if 'settings' in data:
            save_json(os.path.join(user_dir, 'settings.json'), data['settings'])
            sync_data['settingsSynced'] = True
            
        if 'levelData' in data:
            save_json(os.path.join(user_dir, 'level_data.json'), data['levelData'])
            sync_data['levelSynced'] = True
        
        # Sauvegarder les métadonnées de sync
        save_json(os.path.join(user_dir, 'sync_meta.json'), sync_data)
        
        print(f"✅ Sync upload: {user_id}")
        
        return jsonify({
            'success': True,
            'syncData': sync_data,
            'message': 'Données synchronisées'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sync/download', methods=['GET'])
def sync_download():
    """Télécharge les données synchronisées"""
    try:
        user_id = get_user_id(request)
        user_dir = os.path.join(SYNC_DIR, user_id)
        
        if not os.path.exists(user_dir):
            return jsonify({
                'success': True,
                'hasData': False,
                'message': 'Aucune donnée synchronisée'
            })
        
        # Charger toutes les données
        data = {
            'hasData': True,
            'profile': load_json(os.path.join(user_dir, 'profile.json')),
            'customCharacters': load_json(os.path.join(user_dir, 'custom_characters.json'), []),
            'conversations': load_json(os.path.join(user_dir, 'conversations.json'), []),
            'settings': load_json(os.path.join(user_dir, 'settings.json')),
            'levelData': load_json(os.path.join(user_dir, 'level_data.json')),
            'syncMeta': load_json(os.path.join(user_dir, 'sync_meta.json'))
        }
        
        return jsonify({
            'success': True,
            **data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sync/status', methods=['GET'])
def sync_status():
    """Vérifie le statut de synchronisation"""
    try:
        user_id = get_user_id(request)
        user_dir = os.path.join(SYNC_DIR, user_id)
        
        if os.path.exists(user_dir):
            sync_meta = load_json(os.path.join(user_dir, 'sync_meta.json'))
            return jsonify({
                'success': True,
                'synced': True,
                'lastSync': sync_meta.get('lastSync'),
                'userId': user_id
            })
        else:
            return jsonify({
                'success': True,
                'synced': False,
                'userId': user_id
            })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== STATISTIQUES ====================

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Récupère les statistiques du serveur"""
    try:
        # Compter les personnages publics
        public_count = len([f for f in os.listdir(CHARACTERS_DIR) if f.endswith('.json')])
        
        # Compter les utilisateurs synchronisés
        users_count = len([d for d in os.listdir(SYNC_DIR) if os.path.isdir(os.path.join(SYNC_DIR, d))])
        
        return jsonify({
            'success': True,
            'stats': {
                'publicCharacters': public_count,
                'syncedUsers': users_count,
                'serverTime': datetime.now().isoformat()
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== HEALTH CHECK ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Vérifie que le serveur est en ligne"""
    return jsonify({
        'status': 'ok',
        'service': 'Roleplay Chat Sync Server',
        'version': '1.0.0',
        'time': datetime.now().isoformat()
    })

@app.route('/', methods=['GET'])
def home():
    """Page d'accueil"""
    return jsonify({
        'name': 'Roleplay Chat Sync Server',
        'version': '1.0.0',
        'endpoints': {
            '/api/health': 'Health check',
            '/api/stats': 'Server statistics',
            '/api/characters/public': 'GET/POST public characters',
            '/api/sync/upload': 'Upload user data',
            '/api/sync/download': 'Download user data',
            '/api/sync/status': 'Check sync status'
        }
    })

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 Roleplay Chat Sync Server")
    print("=" * 50)
    print(f"📁 Données: {DATA_DIR}")
    print("🌐 Démarrage sur port 33438...")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=33438, debug=False, threaded=True)
