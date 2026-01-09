#!/usr/bin/env python3
"""
Serveur d'Authentification pour Roleplay Chat
- Connexion Email/Mot de passe
- OAuth Discord et Google
- Gestion des utilisateurs et profils
"""

from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
import json
import os
import uuid
import time
import hashlib
import secrets
from datetime import datetime, timedelta
import requests

app = Flask(__name__)
CORS(app)

# Configuration
DATA_DIR = os.path.expanduser("~/roleplay_auth_data")
USERS_DIR = os.path.join(DATA_DIR, "users")
SESSIONS_DIR = os.path.join(DATA_DIR, "sessions")

# OAuth Configuration (à configurer avec vos propres clés)
DISCORD_CLIENT_ID = os.environ.get('DISCORD_CLIENT_ID', '')
DISCORD_CLIENT_SECRET = os.environ.get('DISCORD_CLIENT_SECRET', '')
DISCORD_REDIRECT_URI = 'http://88.174.155.230:33439/auth/discord/callback'

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI = 'http://88.174.155.230:33439/auth/google/callback'

# Créer les dossiers
for d in [DATA_DIR, USERS_DIR, SESSIONS_DIR]:
    os.makedirs(d, exist_ok=True)

print(f"📁 Dossier auth: {DATA_DIR}")

# ==================== UTILITAIRES ====================

def hash_password(password, salt=None):
    """Hash un mot de passe avec salt"""
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}:{hashed.hex()}"

def verify_password(password, stored_hash):
    """Vérifie un mot de passe"""
    try:
        salt, hash_value = stored_hash.split(':')
        new_hash = hash_password(password, salt)
        return new_hash == stored_hash
    except:
        return False

def generate_token():
    """Génère un token de session"""
    return secrets.token_urlsafe(32)

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

def get_user_by_email(email):
    """Trouve un utilisateur par email"""
    email_lower = email.lower()
    for filename in os.listdir(USERS_DIR):
        if filename.endswith('.json'):
            user = load_json(os.path.join(USERS_DIR, filename))
            if user.get('email', '').lower() == email_lower:
                return user
    return None

def get_user_by_id(user_id):
    """Trouve un utilisateur par ID"""
    filepath = os.path.join(USERS_DIR, f"{user_id}.json")
    return load_json(filepath) if os.path.exists(filepath) else None

def get_user_by_provider(provider, provider_id):
    """Trouve un utilisateur par provider OAuth"""
    for filename in os.listdir(USERS_DIR):
        if filename.endswith('.json'):
            user = load_json(os.path.join(USERS_DIR, filename))
            if user.get(f'{provider}_id') == provider_id:
                return user
    return None

def create_session(user_id):
    """Crée une session pour un utilisateur"""
    token = generate_token()
    session = {
        'token': token,
        'user_id': user_id,
        'created_at': int(time.time() * 1000),
        'expires_at': int((time.time() + 30 * 24 * 3600) * 1000),  # 30 jours
    }
    save_json(os.path.join(SESSIONS_DIR, f"{token}.json"), session)
    return token

def verify_session(token):
    """Vérifie une session"""
    filepath = os.path.join(SESSIONS_DIR, f"{token}.json")
    if os.path.exists(filepath):
        session = load_json(filepath)
        if session.get('expires_at', 0) > time.time() * 1000:
            return session.get('user_id')
    return None

def get_current_user(request):
    """Récupère l'utilisateur courant depuis le token"""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        user_id = verify_session(token)
        if user_id:
            return get_user_by_id(user_id)
    return None

# ==================== INSCRIPTION ====================

@app.route('/auth/register', methods=['POST'])
def register():
    """Inscription par email/mot de passe"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email et mot de passe requis'}), 400
        
        if len(password) < 6:
            return jsonify({'success': False, 'error': 'Mot de passe trop court (min 6 caractères)'}), 400
        
        # Vérifier si l'email existe déjà
        if get_user_by_email(email):
            return jsonify({'success': False, 'error': 'Cet email est déjà utilisé'}), 400
        
        # Créer l'utilisateur
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            'id': user_id,
            'email': email,
            'password_hash': hash_password(password),
            'created_at': int(time.time() * 1000),
            'auth_provider': 'email',
            'profile_completed': False,
            'profile': None
        }
        
        save_json(os.path.join(USERS_DIR, f"{user_id}.json"), user)
        
        # Créer une session
        token = create_session(user_id)
        
        # Ne pas renvoyer le hash du mot de passe
        user_response = {k: v for k, v in user.items() if k != 'password_hash'}
        
        print(f"✅ Nouvel utilisateur inscrit: {email}")
        
        return jsonify({
            'success': True,
            'token': token,
            'user': user_response
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== CONNEXION ====================

@app.route('/auth/login', methods=['POST'])
def login():
    """Connexion par email/mot de passe"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email et mot de passe requis'}), 400
        
        user = get_user_by_email(email)
        if not user:
            return jsonify({'success': False, 'error': 'Email ou mot de passe incorrect'}), 401
        
        if not verify_password(password, user.get('password_hash', '')):
            return jsonify({'success': False, 'error': 'Email ou mot de passe incorrect'}), 401
        
        # Créer une session
        token = create_session(user['id'])
        
        # Ne pas renvoyer le hash du mot de passe
        user_response = {k: v for k, v in user.items() if k != 'password_hash'}
        
        print(f"✅ Connexion: {email}")
        
        return jsonify({
            'success': True,
            'token': token,
            'user': user_response
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== OAUTH DISCORD ====================

@app.route('/auth/discord')
def discord_login():
    """Initie la connexion Discord"""
    if not DISCORD_CLIENT_ID:
        return jsonify({'success': False, 'error': 'Discord OAuth non configuré'}), 500
    
    state = secrets.token_urlsafe(16)
    url = f"https://discord.com/api/oauth2/authorize?client_id={DISCORD_CLIENT_ID}&redirect_uri={DISCORD_REDIRECT_URI}&response_type=code&scope=identify%20email&state={state}"
    return jsonify({'success': True, 'url': url})

@app.route('/auth/discord/callback')
def discord_callback():
    """Callback Discord OAuth"""
    try:
        code = request.args.get('code')
        if not code:
            return jsonify({'success': False, 'error': 'Code manquant'}), 400
        
        # Échanger le code contre un token
        token_response = requests.post('https://discord.com/api/oauth2/token', data={
            'client_id': DISCORD_CLIENT_ID,
            'client_secret': DISCORD_CLIENT_SECRET,
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': DISCORD_REDIRECT_URI
        })
        
        if token_response.status_code != 200:
            return jsonify({'success': False, 'error': 'Erreur Discord'}), 400
        
        tokens = token_response.json()
        access_token = tokens.get('access_token')
        
        # Récupérer les infos utilisateur
        user_response = requests.get('https://discord.com/api/users/@me', headers={
            'Authorization': f'Bearer {access_token}'
        })
        
        if user_response.status_code != 200:
            return jsonify({'success': False, 'error': 'Erreur récupération profil'}), 400
        
        discord_user = user_response.json()
        discord_id = discord_user.get('id')
        discord_email = discord_user.get('email')
        discord_username = discord_user.get('username')
        
        # Chercher ou créer l'utilisateur
        user = get_user_by_provider('discord', discord_id)
        
        if not user and discord_email:
            user = get_user_by_email(discord_email)
            if user:
                # Lier le compte Discord au compte existant
                user['discord_id'] = discord_id
                user['discord_username'] = discord_username
                save_json(os.path.join(USERS_DIR, f"{user['id']}.json"), user)
        
        if not user:
            # Créer un nouvel utilisateur
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user = {
                'id': user_id,
                'email': discord_email,
                'discord_id': discord_id,
                'discord_username': discord_username,
                'created_at': int(time.time() * 1000),
                'auth_provider': 'discord',
                'profile_completed': False,
                'profile': None
            }
            save_json(os.path.join(USERS_DIR, f"{user_id}.json"), user)
        
        token = create_session(user['id'])
        
        # Rediriger vers l'app avec le token
        return redirect(f"roleplaychat://auth?token={token}")
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== OAUTH GOOGLE ====================

@app.route('/auth/google')
def google_login():
    """Initie la connexion Google"""
    if not GOOGLE_CLIENT_ID:
        return jsonify({'success': False, 'error': 'Google OAuth non configuré'}), 500
    
    state = secrets.token_urlsafe(16)
    url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={GOOGLE_CLIENT_ID}&redirect_uri={GOOGLE_REDIRECT_URI}&response_type=code&scope=email%20profile&state={state}"
    return jsonify({'success': True, 'url': url})

@app.route('/auth/google/callback')
def google_callback():
    """Callback Google OAuth"""
    try:
        code = request.args.get('code')
        if not code:
            return jsonify({'success': False, 'error': 'Code manquant'}), 400
        
        # Échanger le code contre un token
        token_response = requests.post('https://oauth2.googleapis.com/token', data={
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': GOOGLE_REDIRECT_URI
        })
        
        if token_response.status_code != 200:
            return jsonify({'success': False, 'error': 'Erreur Google'}), 400
        
        tokens = token_response.json()
        access_token = tokens.get('access_token')
        
        # Récupérer les infos utilisateur
        user_response = requests.get('https://www.googleapis.com/oauth2/v2/userinfo', headers={
            'Authorization': f'Bearer {access_token}'
        })
        
        if user_response.status_code != 200:
            return jsonify({'success': False, 'error': 'Erreur récupération profil'}), 400
        
        google_user = user_response.json()
        google_id = google_user.get('id')
        google_email = google_user.get('email')
        google_name = google_user.get('name')
        
        # Chercher ou créer l'utilisateur
        user = get_user_by_provider('google', google_id)
        
        if not user and google_email:
            user = get_user_by_email(google_email)
            if user:
                user['google_id'] = google_id
                user['google_name'] = google_name
                save_json(os.path.join(USERS_DIR, f"{user['id']}.json"), user)
        
        if not user:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user = {
                'id': user_id,
                'email': google_email,
                'google_id': google_id,
                'google_name': google_name,
                'created_at': int(time.time() * 1000),
                'auth_provider': 'google',
                'profile_completed': False,
                'profile': None
            }
            save_json(os.path.join(USERS_DIR, f"{user_id}.json"), user)
        
        token = create_session(user['id'])
        
        return redirect(f"roleplaychat://auth?token={token}")
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== PROFIL ====================

@app.route('/auth/profile', methods=['GET'])
def get_profile():
    """Récupère le profil de l'utilisateur connecté"""
    user = get_current_user(request)
    if not user:
        return jsonify({'success': False, 'error': 'Non authentifié'}), 401
    
    user_response = {k: v for k, v in user.items() if k != 'password_hash'}
    return jsonify({'success': True, 'user': user_response})

@app.route('/auth/profile', methods=['PUT'])
def update_profile():
    """Met à jour le profil utilisateur"""
    user = get_current_user(request)
    if not user:
        return jsonify({'success': False, 'error': 'Non authentifié'}), 401
    
    try:
        data = request.json
        profile = data.get('profile', {})
        
        # Mettre à jour le profil
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

# ==================== DÉCONNEXION ====================

@app.route('/auth/logout', methods=['POST'])
def logout():
    """Déconnexion"""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        filepath = os.path.join(SESSIONS_DIR, f"{token}.json")
        if os.path.exists(filepath):
            os.remove(filepath)
    return jsonify({'success': True})

# ==================== VÉRIFICATION TOKEN ====================

@app.route('/auth/verify', methods=['GET'])
def verify_token():
    """Vérifie si le token est valide"""
    user = get_current_user(request)
    if user:
        user_response = {k: v for k, v in user.items() if k != 'password_hash'}
        return jsonify({'success': True, 'valid': True, 'user': user_response})
    return jsonify({'success': True, 'valid': False})

# ==================== PERSONNAGES UTILISATEUR ====================

@app.route('/auth/characters', methods=['GET'])
def get_user_characters():
    """Récupère les personnages créés par l'utilisateur"""
    user = get_current_user(request)
    if not user:
        return jsonify({'success': False, 'error': 'Non authentifié'}), 401
    
    characters_file = os.path.join(USERS_DIR, f"{user['id']}_characters.json")
    characters = load_json(characters_file, [])
    
    return jsonify({'success': True, 'characters': characters})

@app.route('/auth/characters', methods=['POST'])
def save_user_character():
    """Sauvegarde un personnage pour l'utilisateur"""
    user = get_current_user(request)
    if not user:
        return jsonify({'success': False, 'error': 'Non authentifié'}), 401
    
    try:
        character = request.json.get('character')
        if not character:
            return jsonify({'success': False, 'error': 'Personnage manquant'}), 400
        
        characters_file = os.path.join(USERS_DIR, f"{user['id']}_characters.json")
        characters = load_json(characters_file, [])
        
        # Générer un ID si absent
        if 'id' not in character:
            character['id'] = f"char_{uuid.uuid4().hex[:12]}"
        
        character['user_id'] = user['id']
        character['created_at'] = int(time.time() * 1000)
        
        # Vérifier si c'est une mise à jour
        existing_idx = next((i for i, c in enumerate(characters) if c['id'] == character['id']), None)
        if existing_idx is not None:
            character['updated_at'] = int(time.time() * 1000)
            characters[existing_idx] = character
        else:
            characters.append(character)
        
        save_json(characters_file, characters)
        
        return jsonify({'success': True, 'character': character})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/auth/characters/<char_id>', methods=['DELETE'])
def delete_user_character(char_id):
    """Supprime un personnage"""
    user = get_current_user(request)
    if not user:
        return jsonify({'success': False, 'error': 'Non authentifié'}), 401
    
    try:
        characters_file = os.path.join(USERS_DIR, f"{user['id']}_characters.json")
        characters = load_json(characters_file, [])
        
        characters = [c for c in characters if c['id'] != char_id]
        save_json(characters_file, characters)
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== HEALTH CHECK ====================

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'Roleplay Chat Auth Server',
        'version': '1.0.0',
        'time': datetime.now().isoformat()
    })

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'name': 'Roleplay Chat Auth Server',
        'version': '1.0.0',
        'endpoints': {
            '/auth/register': 'POST - Inscription email/mot de passe',
            '/auth/login': 'POST - Connexion email/mot de passe',
            '/auth/discord': 'GET - OAuth Discord',
            '/auth/google': 'GET - OAuth Google',
            '/auth/profile': 'GET/PUT - Profil utilisateur',
            '/auth/logout': 'POST - Déconnexion',
            '/auth/verify': 'GET - Vérifier token',
            '/auth/characters': 'GET/POST - Personnages utilisateur',
        }
    })

if __name__ == '__main__':
    print("=" * 50)
    print("🔐 Roleplay Chat Auth Server")
    print("=" * 50)
    print(f"📁 Données: {DATA_DIR}")
    print("🌐 Démarrage sur port 33439...")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=33439, debug=False, threaded=True)
