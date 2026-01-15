#!/usr/bin/env python3
"""
Serveur Combiné Freebox pour Roleplay Chat v3.0
- Génération d'images (Premium uniquement)
- Authentification (Email uniquement)
- Synchronisation des personnages (pas les messages)
- Personnages publics
- Système Premium avec PayPal
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
CONFIG_DIR = os.path.join(DATA_DIR, "config")

# Admin email
ADMIN_EMAIL = "douvdouv21@gmail.com"

# Créer les dossiers
for d in [DATA_DIR, USERS_DIR, SESSIONS_DIR, CHARACTERS_DIR, SYNC_DIR, CACHE_DIR, CONFIG_DIR]:
    os.makedirs(d, exist_ok=True)

# Fichier de configuration PayPal (admin only)
PAYPAL_CONFIG_FILE = os.path.join(CONFIG_DIR, "paypal_config.json")

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
    if not user:
        return False
    return user.get('email', '').lower() == ADMIN_EMAIL.lower() or user.get('is_admin', False)

def is_premium(user):
    if not user:
        return False
    return user.get('is_premium', False) or is_admin(user)

def wait_for_rate_limit():
    global last_request_time
    elapsed = time.time() - last_request_time
    if elapsed < MIN_DELAY:
        time.sleep(MIN_DELAY - elapsed)
    last_request_time = time.time()

def get_paypal_config():
    """Récupère la configuration PayPal"""
    default_config = {
        'client_id': '',
        'client_secret': '',
        'paypal_email': '',
        'premium_price': 4.99,
        'currency': 'EUR',
        'sandbox_mode': True
    }
    return load_json(PAYPAL_CONFIG_FILE, default_config)

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
            'is_admin': email.lower() == ADMIN_EMAIL.lower(),
            'is_premium': False,
            'premium_since': None
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
        user['is_admin'] = email.lower() == ADMIN_EMAIL.lower() or user.get('is_admin', False)
        save_json(os.path.join(USERS_DIR, f"{user['id']}.json"), user)
        
        token = create_session(user['id'])
        user_response = {k: v for k, v in user.items() if k != 'password_hash'}
        
        print(f"✅ Connexion: {email}")
        return jsonify({'success': True, 'token': token, 'user': user_response})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/auth/discord', methods=['GET', 'POST'])
def discord_auth():
    """Discord OAuth - Non disponible"""
    return jsonify({
        'success': False, 
        'error': 'Connexion Discord non disponible',
        'message': 'Veuillez utiliser la connexion par email/mot de passe.'
    }), 501

@app.route('/auth/google', methods=['GET', 'POST'])
def google_auth():
    """Google OAuth - Non disponible"""
    return jsonify({
        'success': False, 
        'error': 'Connexion Google non disponible',
        'message': 'Veuillez utiliser la connexion par email/mot de passe.'
    }), 501

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
    """Récupère uniquement les personnages explicitement marqués comme publics"""
    try:
        characters = []
        for filename in os.listdir(CHARACTERS_DIR):
            if filename.endswith('.json'):
                char = load_json(os.path.join(CHARACTERS_DIR, filename))
                # Ne retourner QUE les personnages explicitement publics
                if char and char.get('isPublic', False) == True:
                    characters.append(char)
        characters.sort(key=lambda x: x.get('createdAt', 0), reverse=True)
        return jsonify({'success': True, 'count': len(characters), 'characters': characters})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/characters/public', methods=['POST'])
def publish_character():
    """Publie un personnage (le rend visible à tous)"""
    user = get_current_user(request)
    user_id = user['id'] if user else request.headers.get('X-User-ID', 'anonymous')
    
    try:
        data = request.json
        character = data.get('character', {})
        
        # Vérifier que le personnage est bien marqué comme public
        if not character.get('isPublic', False):
            return jsonify({'success': False, 'error': 'Le personnage doit être marqué comme public'}), 400
        
        if 'id' not in character:
            character['id'] = f"public_{uuid.uuid4().hex[:12]}"
        
        character['isPublic'] = True
        character['createdBy'] = user_id
        character['createdAt'] = character.get('createdAt', int(time.time() * 1000))
        character['publishedAt'] = int(time.time() * 1000)
        
        save_json(os.path.join(CHARACTERS_DIR, f"{character['id']}.json"), character)
        print(f"✅ Personnage publié: {character.get('name')} par {user_id}")
        
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

# ==================== SYNCHRONISATION (Personnages uniquement) ====================

@app.route('/api/sync/upload', methods=['POST'])
def sync_upload():
    """Upload les données utilisateur - UNIQUEMENT les personnages, pas les conversations"""
    user = get_current_user(request)
    user_id = user['id'] if user else request.headers.get('X-User-ID', 'anonymous')
    
    try:
        data = request.json
        user_dir = os.path.join(SYNC_DIR, user_id)
        os.makedirs(user_dir, exist_ok=True)
        
        sync_data = {'lastSync': int(time.time() * 1000), 'userId': user_id}
        
        # SEULEMENT personnages et profil, PAS les conversations
        for key in ['profile', 'customCharacters', 'settings', 'levelData']:
            if key in data:
                save_json(os.path.join(user_dir, f'{key}.json'), data[key])
                sync_data[f'{key}Synced'] = True
        
        # Les conversations ne sont PAS synchronisées
        sync_data['conversationsNotSynced'] = True
        
        save_json(os.path.join(user_dir, 'sync_meta.json'), sync_data)
        return jsonify({'success': True, 'syncData': sync_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sync/download', methods=['GET'])
def sync_download():
    """Télécharge les données utilisateur - UNIQUEMENT les personnages, pas les conversations"""
    user = get_current_user(request)
    user_id = user['id'] if user else request.headers.get('X-User-ID', 'anonymous')
    
    try:
        user_dir = os.path.join(SYNC_DIR, user_id)
        if not os.path.exists(user_dir):
            return jsonify({'success': True, 'hasData': False})
        
        data = {'hasData': True}
        # SEULEMENT personnages et profil, PAS les conversations
        for key in ['profile', 'customCharacters', 'settings', 'levelData', 'sync_meta']:
            filepath = os.path.join(user_dir, f'{key}.json')
            if os.path.exists(filepath):
                data[key.replace('_', '')] = load_json(filepath)
        
        return jsonify({'success': True, **data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sync/characters', methods=['POST'])
def sync_characters_only():
    """Synchronise UNIQUEMENT les personnages créés"""
    user = get_current_user(request)
    user_id = user['id'] if user else request.headers.get('X-User-ID', 'anonymous')
    
    try:
        data = request.json
        characters = data.get('characters', [])
        
        user_dir = os.path.join(SYNC_DIR, user_id)
        os.makedirs(user_dir, exist_ok=True)
        
        # Sauvegarder les personnages
        save_json(os.path.join(user_dir, 'customCharacters.json'), characters)
        
        return jsonify({
            'success': True, 
            'synced': len(characters),
            'message': 'Personnages synchronisés'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== GÉNÉRATION D'IMAGES (Premium uniquement) ====================

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
    """Génération d'images - PREMIUM UNIQUEMENT"""
    # Vérifier le statut premium via plusieurs méthodes
    user = get_current_user(request)
    user_id = request.headers.get('X-User-ID', '')
    
    # Vérification via token dans l'URL (pour les appels d'images)
    token_param = request.args.get('token', '')
    if token_param and not user:
        user_id_from_token = verify_session(token_param)
        if user_id_from_token:
            user = get_user_by_id(user_id_from_token)
    
    # Vérification via user_id dans l'URL (fallback)
    url_user_id = request.args.get('user_id', '')
    if url_user_id and not user:
        user = get_user_by_id(url_user_id)
    
    # Si on a un user_id dans le header, vérifier son statut
    if user_id and not user:
        user = get_user_by_id(user_id)
    
    # Log pour debug
    print(f"🖼️ Génération demandée - User: {user.get('email') if user else 'None'}, Premium: {is_premium(user) if user else False}")
    
    # Admin ou premium uniquement
    if not user or not is_premium(user):
        return jsonify({
            'error': 'Fonctionnalité Premium requise',
            'message': 'La génération d\'images est réservée aux membres Premium.',
            'premium_required': True
        }), 403
    
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

@app.route('/api/premium/check', methods=['GET'])
def check_premium_status():
    """Vérifie le statut premium de l'utilisateur"""
    user = get_current_user(request)
    if not user:
        user_id = request.headers.get('X-User-ID', '')
        if user_id:
            user = get_user_by_id(user_id)
    
    if not user:
        return jsonify({'success': False, 'is_premium': False})
    
    return jsonify({
        'success': True,
        'is_premium': is_premium(user),
        'is_admin': is_admin(user),
        'premium_since': user.get('premium_since')
    })

# ==================== SYSTÈME PAYPAL ====================

@app.route('/api/premium/price', methods=['GET'])
def get_premium_price():
    """Récupère le prix du premium (public)"""
    config = get_paypal_config()
    return jsonify({
        'success': True,
        'price': config.get('premium_price', 4.99),
        'currency': config.get('currency', 'EUR')
    })

@app.route('/api/premium/paypal-link', methods=['GET'])
def get_paypal_payment_link():
    """Génère un lien de paiement PayPal"""
    user = get_current_user(request)
    if not user:
        return jsonify({'success': False, 'error': 'Non authentifié'}), 401
    
    config = get_paypal_config()
    paypal_email = config.get('paypal_email', '')
    price = config.get('premium_price', 4.99)
    currency = config.get('currency', 'EUR')
    
    if not paypal_email:
        return jsonify({
            'success': False, 
            'error': 'Paiement non configuré',
            'message': 'Contactez l\'administrateur pour activer le premium.'
        }), 503
    
    # Générer un ID de transaction unique
    transaction_id = f"PREMIUM_{user['id']}_{int(time.time())}"
    
    # Créer le lien PayPal.me ou PayPal standard
    # Format: https://www.paypal.com/paypalme/USERNAME/AMOUNT
    paypal_link = f"https://www.paypal.com/paypalme/{paypal_email}/{price}{currency}"
    
    # Alternative: Lien de paiement direct
    # paypal_link = f"https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business={paypal_email}&amount={price}&currency_code={currency}&item_name=Roleplay%20Chat%20Premium&item_number={transaction_id}"
    
    # Sauvegarder la transaction en attente
    pending_file = os.path.join(DATA_DIR, 'pending_payments.json')
    pending = load_json(pending_file, [])
    pending.append({
        'transaction_id': transaction_id,
        'user_id': user['id'],
        'email': user['email'],
        'amount': price,
        'currency': currency,
        'created_at': int(time.time() * 1000),
        'status': 'pending'
    })
    save_json(pending_file, pending)
    
    return jsonify({
        'success': True,
        'paypal_link': paypal_link,
        'transaction_id': transaction_id,
        'amount': price,
        'currency': currency,
        'instructions': f'Après le paiement de {price}€, envoyez un email à l\'admin avec votre ID de transaction: {transaction_id}'
    })

# ==================== ADMINISTRATION ====================

def is_request_admin(request):
    """Vérifie si la requête vient d'un admin"""
    # Vérifier via l'utilisateur connecté
    user = get_current_user(request)
    if user and is_admin(user):
        print(f"✅ Admin vérifié via session: {user.get('email')}")
        return True
    
    # Fallback: vérifier le header X-Admin-Email
    admin_email = request.headers.get('X-Admin-Email', '')
    if admin_email:
        # Vérifier si c'est l'admin principal
        if admin_email.lower() == ADMIN_EMAIL.lower():
            print(f"✅ Admin principal vérifié: {admin_email}")
            return True
        
        # Vérifier si c'est un admin dans la base de données
        admin_user = get_user_by_email(admin_email)
        if admin_user and admin_user.get('is_admin', False):
            print(f"✅ Admin secondaire vérifié: {admin_email}")
            return True
        
        print(f"❌ Email non admin: {admin_email}")
        return False
    
    print(f"❌ Pas d'authentification admin trouvée")
    return False

@app.route('/admin/users', methods=['GET'])
def admin_get_users():
    """Liste tous les utilisateurs (admin uniquement)"""
    admin_check = is_request_admin(request)
    print(f"🔐 Admin check result: {admin_check}")
    
    if not admin_check:
        return jsonify({'success': False, 'error': 'Accès refusé - Vous devez être admin'}), 403
    
    try:
        users = []
        for filename in os.listdir(USERS_DIR):
            if filename.endswith('.json') and not filename.endswith('_characters.json'):
                filepath = os.path.join(USERS_DIR, filename)
                user = load_json(filepath)
                if user:
                    # S'assurer que l'ID existe (pour les anciens utilisateurs)
                    if not user.get('id'):
                        # Extraire l'ID du nom de fichier
                        user['id'] = filename.replace('.json', '')
                        # Sauvegarder pour corriger le fichier
                        save_json(filepath, user)
                        print(f"🔧 ID corrigé pour {user.get('email')}: {user['id']}")
                    
                    # Exclure le mot de passe
                    user_safe = {k: v for k, v in user.items() if k != 'password_hash'}
                    
                    # Ajouter des infos du profil avec valeurs par défaut robustes
                    profile = user.get('profile') or {}
                    if not isinstance(profile, dict):
                        profile = {}
                    
                    user_safe['username'] = profile.get('username') or user.get('email', '').split('@')[0]
                    user_safe['age'] = profile.get('age') or 0
                    user_safe['gender'] = profile.get('gender') or ''
                    user_safe['bust'] = profile.get('bust') or ''
                    user_safe['penis'] = profile.get('penis') or ''
                    user_safe['nsfw_enabled'] = profile.get('nsfwMode', False) or False
                    user_safe['is_premium'] = user.get('is_premium', False) or False
                    user_safe['is_admin'] = user.get('is_admin', False) or False
                    
                    # Ajouter le profil complet pour l'admin
                    user_safe['full_profile'] = profile
                    user_safe['profile'] = profile  # Double accès pour compatibilité
                    
                    users.append(user_safe)
        
        # Trier par date de création (plus récent en premier)
        users.sort(key=lambda x: x.get('created_at', 0), reverse=True)
        
        print(f"👑 Admin: Liste de {len(users)} utilisateurs retournée")
        return jsonify({'success': True, 'count': len(users), 'users': users})
    except Exception as e:
        print(f"❌ Admin: Erreur liste utilisateurs: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/users/<user_id>/profile', methods=['GET'])
def admin_get_user_profile(user_id):
    """Récupère le profil complet d'un utilisateur (admin uniquement)"""
    if not is_request_admin(request):
        return jsonify({'success': False, 'error': 'Accès refusé'}), 403
    
    try:
        filepath = os.path.join(USERS_DIR, f"{user_id}.json")
        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': 'Utilisateur non trouvé'}), 404
        
        user = load_json(filepath)
        user_safe = {k: v for k, v in user.items() if k != 'password_hash'}
        
        print(f"👑 Admin: Profil consulté pour {user.get('email')}")
        return jsonify({'success': True, 'user': user_safe})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def find_user_file(user_id):
    """Trouve le fichier utilisateur par ID ou email"""
    # Essai 1: fichier direct avec l'ID
    filepath = os.path.join(USERS_DIR, f"{user_id}.json")
    if os.path.exists(filepath):
        return filepath
    
    # Essai 2: parcourir tous les fichiers pour trouver par ID ou email
    for filename in os.listdir(USERS_DIR):
        if filename.endswith('.json') and not filename.endswith('_characters.json'):
            fp = os.path.join(USERS_DIR, filename)
            user = load_json(fp)
            if user:
                # Chercher par ID
                if user.get('id') == user_id:
                    return fp
                # Chercher par email
                if user.get('email', '').lower() == user_id.lower():
                    return fp
    
    return None

@app.route('/admin/users/<user_id>/role', methods=['PUT'])
def admin_update_user_role(user_id):
    """Modifier le rôle admin d'un utilisateur"""
    print(f"📝 Demande modification rôle admin pour user_id={user_id}")
    print(f"🔐 X-Admin-Email: {request.headers.get('X-Admin-Email', 'NON DÉFINI')}")
    
    if not is_request_admin(request):
        print(f"❌ Accès refusé pour modification rôle")
        return jsonify({'success': False, 'error': 'Accès refusé - Vous devez être admin'}), 403
    
    try:
        filepath = find_user_file(user_id)
        
        if not filepath:
            print(f"❌ Utilisateur non trouvé: {user_id}")
            # Lister les fichiers disponibles pour debug
            files = [f for f in os.listdir(USERS_DIR) if f.endswith('.json')]
            print(f"📁 Fichiers disponibles: {files}")
            return jsonify({'success': False, 'error': f'Utilisateur non trouvé: {user_id}'}), 404
        
        print(f"📁 Fichier trouvé: {filepath}")
        
        user = load_json(filepath)
        data = request.json
        print(f"📨 Données reçues: {data}")
        
        if not data:
            return jsonify({'success': False, 'error': 'Aucune donnée reçue'}), 400
        
        # Ne pas permettre de retirer les droits admin à soi-même
        current_admin = request.headers.get('X-Admin-Email', '').lower()
        if user.get('email', '').lower() == current_admin and data.get('is_admin') == False:
            return jsonify({'success': False, 'error': 'Impossible de retirer vos propres droits admin'}), 400
        
        user['is_admin'] = data.get('is_admin', False)
        user['updated_at'] = int(time.time() * 1000)
        
        save_json(filepath, user)
        print(f"✅ Admin: Rôle modifié pour {user.get('email')} -> admin={user['is_admin']}")
        
        return jsonify({'success': True, 'user': {k: v for k, v in user.items() if k != 'password_hash'}})
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/users/<user_id>/premium', methods=['PUT'])
def admin_update_user_premium(user_id):
    """Modifier le statut premium d'un utilisateur"""
    print(f"⭐ Demande modification premium pour user_id={user_id}")
    print(f"🔐 X-Admin-Email: {request.headers.get('X-Admin-Email', 'NON DÉFINI')}")
    
    if not is_request_admin(request):
        print(f"❌ Accès refusé pour modification premium")
        return jsonify({'success': False, 'error': 'Accès refusé - Vous devez être admin'}), 403
    
    try:
        filepath = find_user_file(user_id)
        
        if not filepath:
            print(f"❌ Utilisateur non trouvé: {user_id}")
            return jsonify({'success': False, 'error': f'Utilisateur non trouvé: {user_id}'}), 404
        
        print(f"📁 Fichier trouvé: {filepath}")
        
        user = load_json(filepath)
        data = request.json
        print(f"📨 Données reçues: {data}")
        
        if not data:
            return jsonify({'success': False, 'error': 'Aucune donnée reçue'}), 400
        
        user['is_premium'] = data.get('is_premium', False)
        user['premium_since'] = int(time.time() * 1000) if user['is_premium'] else None
        user['updated_at'] = int(time.time() * 1000)
        
        save_json(filepath, user)
        print(f"✅ Admin: Premium modifié pour {user.get('email')} -> premium={user['is_premium']}")
        
        return jsonify({'success': True, 'user': {k: v for k, v in user.items() if k != 'password_hash'}})
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/users/<user_id>', methods=['DELETE'])
def admin_delete_user(user_id):
    """Supprimer un utilisateur"""
    print(f"🗑️ Demande suppression pour user_id={user_id}")
    
    if not is_request_admin(request):
        return jsonify({'success': False, 'error': 'Accès refusé'}), 403
    
    try:
        filepath = find_user_file(user_id)
        
        if not filepath:
            return jsonify({'success': False, 'error': f'Utilisateur non trouvé: {user_id}'}), 404
        
        user = load_json(filepath)
        actual_user_id = user.get('id', user_id)
        
        # Ne pas permettre de supprimer l'admin principal
        if user.get('email', '').lower() == ADMIN_EMAIL.lower():
            return jsonify({'success': False, 'error': 'Impossible de supprimer l\'admin principal'}), 400
        
        # Supprimer le fichier utilisateur
        os.remove(filepath)
        
        # Supprimer les sessions de l'utilisateur
        for session_file in os.listdir(SESSIONS_DIR):
            if session_file.endswith('.json'):
                session = load_json(os.path.join(SESSIONS_DIR, session_file))
                if session.get('user_id') == actual_user_id:
                    os.remove(os.path.join(SESSIONS_DIR, session_file))
        
        # Supprimer le dossier de sync de l'utilisateur
        user_sync_dir = os.path.join(SYNC_DIR, actual_user_id)
        if os.path.exists(user_sync_dir):
            import shutil
            shutil.rmtree(user_sync_dir)
        
        print(f"✅ Admin: Utilisateur supprimé {user.get('email')}")
        return jsonify({'success': True})
    except Exception as e:
        print(f"❌ Erreur suppression: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== CONFIGURATION PAYPAL (Admin uniquement) ====================

@app.route('/admin/paypal/config', methods=['GET'])
def admin_get_paypal_config():
    """Récupère la configuration PayPal (admin uniquement)"""
    if not is_request_admin(request):
        return jsonify({'success': False, 'error': 'Accès refusé'}), 403
    
    config = get_paypal_config()
    return jsonify({'success': True, 'config': config})

@app.route('/admin/paypal/config', methods=['PUT'])
def admin_update_paypal_config():
    """Met à jour la configuration PayPal (admin uniquement)"""
    if not is_request_admin(request):
        return jsonify({'success': False, 'error': 'Accès refusé'}), 403
    
    try:
        data = request.json
        config = get_paypal_config()
        
        # Mettre à jour les champs
        if 'paypal_email' in data:
            config['paypal_email'] = data['paypal_email']
        if 'premium_price' in data:
            config['premium_price'] = float(data['premium_price'])
        if 'currency' in data:
            config['currency'] = data['currency']
        if 'client_id' in data:
            config['client_id'] = data['client_id']
        if 'client_secret' in data:
            config['client_secret'] = data['client_secret']
        if 'sandbox_mode' in data:
            config['sandbox_mode'] = data['sandbox_mode']
        
        save_json(PAYPAL_CONFIG_FILE, config)
        print(f"👑 Admin: Configuration PayPal mise à jour")
        
        return jsonify({'success': True, 'config': config})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/payments/pending', methods=['GET'])
def admin_get_pending_payments():
    """Liste les paiements en attente (admin uniquement)"""
    if not is_request_admin(request):
        return jsonify({'success': False, 'error': 'Accès refusé'}), 403
    
    pending_file = os.path.join(DATA_DIR, 'pending_payments.json')
    pending = load_json(pending_file, [])
    
    return jsonify({'success': True, 'payments': pending})

@app.route('/admin/payments/<transaction_id>/confirm', methods=['POST'])
def admin_confirm_payment(transaction_id):
    """Confirme un paiement et active le premium (admin uniquement)"""
    if not is_request_admin(request):
        return jsonify({'success': False, 'error': 'Accès refusé'}), 403
    
    try:
        pending_file = os.path.join(DATA_DIR, 'pending_payments.json')
        pending = load_json(pending_file, [])
        
        # Trouver la transaction
        payment = None
        for p in pending:
            if p['transaction_id'] == transaction_id:
                payment = p
                break
        
        if not payment:
            return jsonify({'success': False, 'error': 'Transaction non trouvée'}), 404
        
        # Activer le premium pour l'utilisateur
        user_id = payment['user_id']
        filepath = os.path.join(USERS_DIR, f"{user_id}.json")
        
        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': 'Utilisateur non trouvé'}), 404
        
        user = load_json(filepath)
        user['is_premium'] = True
        user['premium_since'] = int(time.time() * 1000)
        user['premium_transaction'] = transaction_id
        save_json(filepath, user)
        
        # Marquer le paiement comme confirmé
        payment['status'] = 'confirmed'
        payment['confirmed_at'] = int(time.time() * 1000)
        save_json(pending_file, pending)
        
        print(f"👑 Admin: Paiement confirmé {transaction_id} pour {user.get('email')}")
        
        return jsonify({
            'success': True,
            'message': f'Premium activé pour {user.get("email")}'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== CLÉS API PARTAGÉES ====================

SHARED_KEYS_FILE = os.path.join(CONFIG_DIR, "shared_api_keys.json")

def load_shared_keys():
    """Charge les clés API partagées"""
    if os.path.exists(SHARED_KEYS_FILE):
        return load_json(SHARED_KEYS_FILE, {})
    return {}

def save_shared_keys(keys):
    """Sauvegarde les clés API partagées"""
    save_json(SHARED_KEYS_FILE, keys)

@app.route('/api/shared-keys', methods=['GET'])
def get_shared_keys():
    """Récupère les clés API partagées (pour tous les utilisateurs)"""
    try:
        shared = load_shared_keys()
        
        # Retourner les clés sans les masquer (l'app en a besoin)
        return jsonify({
            'success': True,
            'keys': {
                'groq': shared.get('groq', []),
                'groq_model': shared.get('groq_model', 'llama-3.1-70b-versatile'),
            },
            'hasKeys': len(shared.get('groq', [])) > 0
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/shared-keys', methods=['POST'])
def set_shared_keys():
    """Définit les clés API partagées (admin uniquement)"""
    print(f"🔑 Tentative de partage des clés...")
    print(f"🔐 Headers: X-Admin-Email = {request.headers.get('X-Admin-Email', 'NON DÉFINI')}")
    
    admin_check = is_request_admin(request)
    print(f"🔐 Admin check: {admin_check}")
    
    if not admin_check:
        print(f"❌ Accès refusé pour partage des clés")
        return jsonify({'success': False, 'error': 'Accès refusé - Admin uniquement'}), 403
    
    try:
        data = request.json
        print(f"📨 Données reçues: {data}")
        
        if not data:
            return jsonify({'success': False, 'error': 'Aucune donnée reçue'}), 400
        
        shared = load_shared_keys()
        
        # Mettre à jour les clés Groq
        if 'groq' in data:
            groq_keys = data['groq']
            if isinstance(groq_keys, list):
                shared['groq'] = groq_keys
                print(f"✅ {len(groq_keys)} clé(s) Groq enregistrée(s)")
            else:
                print(f"⚠️ Format invalide pour groq: {type(groq_keys)}")
        
        # Mettre à jour le modèle Groq
        if 'groq_model' in data:
            shared['groq_model'] = data['groq_model']
            print(f"✅ Modèle Groq: {data['groq_model']}")
        
        shared['updated_at'] = int(time.time() * 1000)
        shared['updated_by'] = request.headers.get('X-Admin-Email', 'admin')
        
        save_shared_keys(shared)
        print(f"✅ Clés sauvegardées dans {SHARED_KEYS_FILE}")
        
        return jsonify({
            'success': True,
            'message': 'Clés partagées mises à jour',
            'keysCount': len(shared.get('groq', []))
        })
    except Exception as e:
        print(f"❌ Erreur partage clés: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/shared-keys/status', methods=['GET'])
def shared_keys_status():
    """Vérifie le statut des clés partagées"""
    try:
        shared = load_shared_keys()
        groq_keys = shared.get('groq', [])
        
        return jsonify({
            'success': True,
            'status': {
                'hasGroqKeys': len(groq_keys) > 0,
                'groqKeysCount': len(groq_keys),
                'groqModel': shared.get('groq_model', 'llama-3.1-70b-versatile'),
                'lastUpdated': shared.get('updated_at'),
                'updatedBy': shared.get('updated_by', 'N/A')
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== DIAGNOSTIC ADMIN ====================

@app.route('/admin/diagnostic', methods=['GET'])
def admin_diagnostic():
    """Diagnostic complet du système admin"""
    if not is_request_admin(request):
        return jsonify({'success': False, 'error': 'Accès refusé'}), 403
    
    try:
        users_info = []
        users_without_id = 0
        users_fixed = 0
        
        for filename in os.listdir(USERS_DIR):
            if filename.endswith('.json') and not filename.endswith('_characters.json'):
                filepath = os.path.join(USERS_DIR, filename)
                user = load_json(filepath)
                
                if user:
                    user_id = user.get('id')
                    
                    # Corriger les utilisateurs sans ID
                    if not user_id:
                        users_without_id += 1
                        user_id = filename.replace('.json', '')
                        user['id'] = user_id
                        save_json(filepath, user)
                        users_fixed += 1
                        print(f"🔧 Corrigé: {user.get('email')} -> ID: {user_id}")
                    
                    users_info.append({
                        'email': user.get('email'),
                        'id': user.get('id'),
                        'filename': filename,
                        'has_id': bool(user.get('id')),
                        'is_admin': user.get('is_admin', False),
                        'is_premium': user.get('is_premium', False),
                    })
        
        return jsonify({
            'success': True,
            'diagnostic': {
                'total_users': len(users_info),
                'users_without_id_before': users_without_id,
                'users_fixed': users_fixed,
                'admin_email': ADMIN_EMAIL,
                'data_dir': DATA_DIR,
                'users_dir': USERS_DIR,
            },
            'users': users_info
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/fix-users', methods=['POST'])
def admin_fix_users():
    """Corrige tous les utilisateurs sans ID"""
    if not is_request_admin(request):
        return jsonify({'success': False, 'error': 'Accès refusé'}), 403
    
    try:
        fixed = 0
        for filename in os.listdir(USERS_DIR):
            if filename.endswith('.json') and not filename.endswith('_characters.json'):
                filepath = os.path.join(USERS_DIR, filename)
                user = load_json(filepath)
                
                if user and not user.get('id'):
                    user['id'] = filename.replace('.json', '')
                    save_json(filepath, user)
                    fixed += 1
                    print(f"🔧 Corrigé: {user.get('email')} -> ID: {user['id']}")
        
        return jsonify({
            'success': True,
            'message': f'{fixed} utilisateur(s) corrigé(s)',
            'fixed': fixed
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== HEALTH & INFO ====================

@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'Roleplay Chat Combined Server',
        'version': '4.3.10',
        'time': datetime.now().isoformat(),
        'admin_email': ADMIN_EMAIL
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
        'version': '4.3.10',
        'services': ['auth', 'images', 'sync', 'characters', 'premium', 'paypal', 'admin', 'shared-keys'],
        'admin_email': ADMIN_EMAIL
    })

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 Roleplay Chat Combined Server v3.0")
    print("=" * 50)
    print(f"📁 Données: {DATA_DIR}")
    print(f"👑 Admin: {ADMIN_EMAIL}")
    print("💎 Premium: Images uniquement pour premium")
    print("💳 PayPal: Intégré")
    print("🌐 Port: 33437")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=33437, debug=False, threaded=True)
