#!/usr/bin/env python3
"""
Serveur Combiné Freebox pour Roleplay Chat
- Génération d'images (Pollinations avec fallback)
- Authentification (Email, Discord, Google)
- Synchronisation des données
- Personnages publics
Port: 33437 (seul port ouvert)
"""

from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
import json
import os
import uuid
import time
import hashlib
import secrets
import requests
from datetime import datetime
import urllib.parse
import re

app = Flask(__name__)
CORS(app)

# ==================== CONFIGURATION ====================

DATA_DIR = os.path.expanduser("~/roleplay_data")
USERS_DIR = os.path.join(DATA_DIR, "users")
SESSIONS_DIR = os.path.join(DATA_DIR, "sessions")
CHARACTERS_DIR = os.path.join(DATA_DIR, "public_characters")
SYNC_DIR = os.path.join(DATA_DIR, "sync")
CACHE_DIR = os.path.join(DATA_DIR, "image_cache")

# Admin email
ADMIN_EMAIL = "douvdouv21@gmail.com"

# Créer les dossiers
for d in [DATA_DIR, USERS_DIR, SESSIONS_DIR, CHARACTERS_DIR, SYNC_DIR, CACHE_DIR]:
    os.makedirs(d, exist_ok=True)

# Pollinations models
POLLINATIONS_MODELS = [
    {"name": "flux", "style": "general"},
    {"name": "flux-realism", "style": "realistic"},
    {"name": "flux-anime", "style": "anime"},
    {"name": "flux-3d", "style": "3d"},
    {"name": "turbo", "style": "fast"},
]

last_request_time = 0
MIN_DELAY = 2

print(f"📁 Dossier données: {DATA_DIR}")
print(f"👑 Admin: {ADMIN_EMAIL}")

# ==================== UTILITAIRES ====================

def load_json(filepath, default=None):
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return default if default is not None else {}

def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}:{hashed.hex()}"

def verify_password(password, stored_hash):
    try:
        salt, _ = stored_hash.split(':')
        return hash_password(password, salt) == stored_hash
    except:
        return False

def generate_token():
    return secrets.token_urlsafe(32)

def get_user_by_email(email):
    email_lower = email.lower()
    for filename in os.listdir(USERS_DIR):
        if filename.endswith('.json') and not filename.endswith('_characters.json'):
            user = load_json(os.path.join(USERS_DIR, filename))
            if user.get('email', '').lower() == email_lower:
                return user
    return None

def get_user_by_id(user_id):
    filepath = os.path.join(USERS_DIR, f"{user_id}.json")
    return load_json(filepath) if os.path.exists(filepath) else None

def create_session(user_id):
    token = generate_token()
    session = {
        'token': token,
        'user_id': user_id,
        'created_at': int(time.time() * 1000),
        'expires_at': int((time.time() + 30 * 24 * 3600) * 1000),
    }
    save_json(os.path.join(SESSIONS_DIR, f"{token}.json"), session)
    return token

def verify_session(token):
    filepath = os.path.join(SESSIONS_DIR, f"{token}.json")
    if os.path.exists(filepath):
        session = load_json(filepath)
        if session.get('expires_at', 0) > time.time() * 1000:
            return session.get('user_id')
    return None

def get_current_user(request):
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        user_id = verify_session(token)
        if user_id:
            return get_user_by_id(user_id)
    return None

def is_admin(user):
    return user and user.get('email', '').lower() == ADMIN_EMAIL.lower()

def wait_for_rate_limit():
    global last_request_time
    elapsed = time.time() - last_request_time
    if elapsed < MIN_DELAY:
        time.sleep(MIN_DELAY - elapsed)
    last_request_time = time.time()

# ==================== AUTHENTIFICATION ====================

@app.route('/auth/register', methods=['POST'])
def register():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email et mot de passe requis'}), 400
        
        if len(password) < 6:
            return jsonify({'success': False, 'error': 'Mot de passe trop court (min 6)'}), 400
        
        if get_user_by_email(email):
            return jsonify({'success': False, 'error': 'Email déjà utilisé'}), 400
        
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            'id': user_id,
            'email': email,
            'password_hash': hash_password(password),
            'created_at': int(time.time() * 1000),
            'auth_provider': 'email',
            'profile_completed': False,
            'profile': None,
            'is_admin': email.lower() == ADMIN_EMAIL.lower()
        }
        
        save_json(os.path.join(USERS_DIR, f"{user_id}.json"), user)
        token = create_session(user_id)
        
        user_response = {k: v for k, v in user.items() if k != 'password_hash'}
        print(f"✅ Inscription: {email}")
        
        return jsonify({'success': True, 'token': token, 'user': user_response})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email et mot de passe requis'}), 400
        
        user = get_user_by_email(email)
        if not user or not verify_password(password, user.get('password_hash', '')):
            return jsonify({'success': False, 'error': 'Email ou mot de passe incorrect'}), 401
        
        # Mettre à jour is_admin
        user['is_admin'] = email.lower() == ADMIN_EMAIL.lower()
        save_json(os.path.join(USERS_DIR, f"{user['id']}.json"), user)
        
        token = create_session(user['id'])
        user_response = {k: v for k, v in user.items() if k != 'password_hash'}
        
        print(f"✅ Connexion: {email}")
        return jsonify({'success': True, 'token': token, 'user': user_response})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/auth/verify', methods=['GET'])
def verify_token():
    user = get_current_user(request)
    if user:
        user_response = {k: v for k, v in user.items() if k != 'password_hash'}
        return jsonify({'success': True, 'valid': True, 'user': user_response})
    return jsonify({'success': True, 'valid': False})

@app.route('/auth/profile', methods=['GET'])
def get_profile():
    user = get_current_user(request)
    if not user:
        return jsonify({'success': False, 'error': 'Non authentifié'}), 401
    user_response = {k: v for k, v in user.items() if k != 'password_hash'}
    return jsonify({'success': True, 'user': user_response})

@app.route('/auth/profile', methods=['PUT'])
def update_profile():
    user = get_current_user(request)
    if not user:
        return jsonify({'success': False, 'error': 'Non authentifié'}), 401
    
    try:
        data = request.json
        profile = data.get('profile', {})
        
        user['profile'] = {
            'username': profile.get('username'),
            'age': profile.get('age'),
            'gender': profile.get('gender'),
            'bust': profile.get('bust'),
            'penis': profile.get('penis'),
            'nsfwMode': profile.get('nsfwMode', False),
            'isAdult': profile.get('age', 0) >= 18,
        }
        user['profile_completed'] = True
        user['updated_at'] = int(time.time() * 1000)
        
        save_json(os.path.join(USERS_DIR, f"{user['id']}.json"), user)
        user_response = {k: v for k, v in user.items() if k != 'password_hash'}
        
        return jsonify({'success': True, 'user': user_response})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/auth/logout', methods=['POST'])
def logout():
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        filepath = os.path.join(SESSIONS_DIR, f"{token}.json")
        if os.path.exists(filepath):
            os.remove(filepath)
    return jsonify({'success': True})

# ==================== PERSONNAGES PUBLICS ====================

@app.route('/api/characters/public', methods=['GET'])
def get_public_characters():
    try:
        characters = []
        for filename in os.listdir(CHARACTERS_DIR):
            if filename.endswith('.json'):
                char = load_json(os.path.join(CHARACTERS_DIR, filename))
                if char:
                    characters.append(char)
        characters.sort(key=lambda x: x.get('createdAt', 0), reverse=True)
        return jsonify({'success': True, 'count': len(characters), 'characters': characters})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/characters/public', methods=['POST'])
def publish_character():
    user = get_current_user(request)
    user_id = user['id'] if user else request.headers.get('X-User-ID', 'anonymous')
    
    try:
        data = request.json
        character = data.get('character', {})
        
        if 'id' not in character:
            character['id'] = f"public_{uuid.uuid4().hex[:12]}"
        
        character['isPublic'] = True
        character['createdBy'] = user_id
        character['createdAt'] = character.get('createdAt', int(time.time() * 1000))
        character['publishedAt'] = int(time.time() * 1000)
        
        save_json(os.path.join(CHARACTERS_DIR, f"{character['id']}.json"), character)
        print(f"✅ Personnage publié: {character.get('name')}")
        
        return jsonify({'success': True, 'character': character})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/characters/public/<char_id>', methods=['DELETE'])
def unpublish_character(char_id):
    user = get_current_user(request)
    user_id = user['id'] if user else request.headers.get('X-User-ID')
    
    try:
        filepath = os.path.join(CHARACTERS_DIR, f"{char_id}.json")
        if os.path.exists(filepath):
            char = load_json(filepath)
            if char.get('createdBy') == user_id or (user and is_admin(user)):
                os.remove(filepath)
                return jsonify({'success': True})
            return jsonify({'success': False, 'error': 'Non autorisé'}), 403
        return jsonify({'success': False, 'error': 'Non trouvé'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== SYNCHRONISATION ====================

@app.route('/api/sync/upload', methods=['POST'])
def sync_upload():
    user = get_current_user(request)
    user_id = user['id'] if user else request.headers.get('X-User-ID', 'anonymous')
    
    try:
        data = request.json
        user_dir = os.path.join(SYNC_DIR, user_id)
        os.makedirs(user_dir, exist_ok=True)
        
        sync_data = {'lastSync': int(time.time() * 1000), 'userId': user_id}
        
        for key in ['profile', 'customCharacters', 'conversations', 'settings', 'levelData']:
            if key in data:
                save_json(os.path.join(user_dir, f'{key}.json'), data[key])
                sync_data[f'{key}Synced'] = True
        
        save_json(os.path.join(user_dir, 'sync_meta.json'), sync_data)
        return jsonify({'success': True, 'syncData': sync_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sync/download', methods=['GET'])
def sync_download():
    user = get_current_user(request)
    user_id = user['id'] if user else request.headers.get('X-User-ID', 'anonymous')
    
    try:
        user_dir = os.path.join(SYNC_DIR, user_id)
        if not os.path.exists(user_dir):
            return jsonify({'success': True, 'hasData': False})
        
        data = {'hasData': True}
        for key in ['profile', 'customCharacters', 'conversations', 'settings', 'levelData', 'sync_meta']:
            filepath = os.path.join(user_dir, f'{key}.json')
            if os.path.exists(filepath):
                data[key.replace('_', '')] = load_json(filepath)
        
        return jsonify({'success': True, **data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== GÉNÉRATION D'IMAGES ====================

def detect_style(prompt):
    prompt_lower = prompt.lower()
    if any(w in prompt_lower for w in ['anime', 'manga', 'kawaii', 'chibi']):
        return 'anime'
    if any(w in prompt_lower for w in ['realistic', 'photo', 'real', 'portrait']):
        return 'realistic'
    if any(w in prompt_lower for w in ['3d', 'render', 'cgi']):
        return '3d'
    return 'general'

@app.route('/generate', methods=['GET'])
def generate_image():
    prompt = request.args.get('prompt', '')
    width = request.args.get('width', 512, type=int)
    height = request.args.get('height', 512, type=int)
    seed = request.args.get('seed', int(time.time()))
    
    if not prompt:
        return jsonify({'error': 'Prompt requis'}), 400
    
    style = detect_style(prompt)
    
    # Choisir le modèle selon le style
    model_order = ['flux']
    if style == 'anime':
        model_order = ['flux-anime', 'flux', 'turbo']
    elif style == 'realistic':
        model_order = ['flux-realism', 'flux', 'turbo']
    elif style == '3d':
        model_order = ['flux-3d', 'flux', 'turbo']
    else:
        model_order = ['flux', 'flux-realism', 'turbo']
    
    for model in model_order:
        try:
            wait_for_rate_limit()
            
            encoded_prompt = urllib.parse.quote(prompt)
            url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&seed={seed}&model={model}&nologo=true"
            
            response = requests.get(url, timeout=90, stream=True)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    return response.content, 200, {'Content-Type': content_type}
            
            if response.status_code == 429:
                print(f"⚠️ Rate limit sur {model}, essai suivant...")
                time.sleep(3)
                continue
                
        except Exception as e:
            print(f"❌ Erreur {model}: {e}")
            continue
    
    return jsonify({'error': 'Tous les modèles ont échoué'}), 503

# ==================== HEALTH & INFO ====================

@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'Roleplay Chat Combined Server',
        'version': '2.0.0',
        'time': datetime.now().isoformat()
    })

@app.route('/api/stats', methods=['GET'])
def stats():
    public_count = len([f for f in os.listdir(CHARACTERS_DIR) if f.endswith('.json')])
    users_count = len([f for f in os.listdir(USERS_DIR) if f.endswith('.json') and not '_characters' in f])
    
    return jsonify({
        'success': True,
        'stats': {
            'publicCharacters': public_count,
            'registeredUsers': users_count,
            'serverTime': datetime.now().isoformat()
        }
    })

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'name': 'Roleplay Chat Combined Server',
        'version': '2.0.0',
        'services': ['auth', 'images', 'sync', 'characters']
    })

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 Roleplay Chat Combined Server v2.0")
    print("=" * 50)
    print(f"📁 Données: {DATA_DIR}")
    print(f"👑 Admin: {ADMIN_EMAIL}")
    print("🌐 Port: 33437")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=33437, debug=False, threaded=True)
