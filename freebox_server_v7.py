#!/usr/bin/env python3
"""
Serveur API Unifié pour Freebox - Version 7.0
IMAGES: Pollinations avec rotation de modèles
PERSONNAGES: CRUD temps réel avec synchronisation instantanée
TEXTE: Proxy vers Pollinations/HuggingFace

Installation:
pip install flask requests

Démarrage:
python freebox_server_v7.py

ou avec nohup:
nohup python3 freebox_server_v7.py > /tmp/server.log 2>&1 &
"""

import os
import io
import time
import json
import random
import hashlib
import logging
import threading
from datetime import datetime
from flask import Flask, request, send_file, jsonify
import requests

app = Flask(__name__)

# Configuration du logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== CONFIGURATION ====================

# Répertoires
CACHE_DIR = "/tmp/image_cache"
DATA_DIR = "/tmp/server_data"
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# Fichiers de données
CHARACTERS_FILE = os.path.join(DATA_DIR, "public_characters.json")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
DELETED_IDS_FILE = os.path.join(DATA_DIR, "deleted_ids.json")

# Rate limiting
MIN_DELAY = 2
last_request_time = 0
request_lock = threading.Lock()

# Statistiques
stats = {
    "total_requests": 0,
    "image_generations": 0,
    "character_operations": 0,
    "cache_hits": 0,
    "rate_limits": 0,
    "errors": 0,
    "start_time": datetime.now().isoformat()
}

# Version du cache - incrémentée à chaque modification
cache_version = int(time.time())

# Modèles Pollinations
POLLINATIONS_MODELS = [
    {"name": "flux", "description": "Modèle par défaut"},
    {"name": "flux-realism", "description": "Photos réalistes"},
    {"name": "flux-anime", "description": "Anime/manga"},
    {"name": "turbo", "description": "Génération rapide"},
]

# ==================== UTILITAIRES ====================

def load_json_file(filepath, default=None):
    """Charge un fichier JSON de manière sécurisée"""
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Erreur lecture {filepath}: {e}")
    return default if default is not None else {}

def save_json_file(filepath, data):
    """Sauvegarde un fichier JSON de manière sécurisée"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"Erreur écriture {filepath}: {e}")
        return False

def get_deleted_ids():
    """Récupère la liste des IDs supprimés"""
    return set(load_json_file(DELETED_IDS_FILE, []))

def add_deleted_id(char_id):
    """Ajoute un ID à la liste des supprimés"""
    deleted = get_deleted_ids()
    deleted.add(char_id)
    # Garder aussi les variantes de l'ID
    if char_id.startswith('custom_'):
        deleted.add(char_id[7:])  # Sans préfixe
    else:
        deleted.add(f'custom_{char_id}')  # Avec préfixe
    save_json_file(DELETED_IDS_FILE, list(deleted))

def increment_cache_version():
    """Incrémente la version du cache pour forcer les refresh"""
    global cache_version
    cache_version = int(time.time())
    logger.info(f"🔄 Cache version: {cache_version}")

# ==================== IMAGES ====================

def get_cache_path(prompt, width, height, seed):
    """Génère un chemin de cache basé sur le hash du prompt"""
    key = f"{prompt}_{width}_{height}_{seed}"
    hash_key = hashlib.md5(key.encode()).hexdigest()[:16]
    return os.path.join(CACHE_DIR, f"{hash_key}.png")

def detect_best_model(prompt):
    """Détecte le meilleur modèle selon le prompt"""
    prompt_lower = prompt.lower()
    if any(word in prompt_lower for word in ['anime', 'manga', 'waifu']):
        return "flux-anime"
    if any(word in prompt_lower for word in ['photorealistic', 'realistic', 'photo']):
        return "flux-realism"
    return "flux"

def wait_for_rate_limit():
    """Attend le délai minimum entre les requêtes"""
    global last_request_time
    with request_lock:
        now = time.time()
        elapsed = now - last_request_time
        if elapsed < MIN_DELAY:
            time.sleep(MIN_DELAY - elapsed)
        last_request_time = time.time()

def generate_image_pollinations(prompt, width=768, height=768, seed=None, model=None):
    """Génère une image avec Pollinations"""
    if not model:
        model = detect_best_model(prompt)
    
    models_to_try = [model] + [m["name"] for m in POLLINATIONS_MODELS if m["name"] != model]
    clean_prompt = prompt[:800]
    encoded_prompt = requests.utils.quote(clean_prompt)
    
    if not seed:
        seed = random.randint(1, 999999999)
    
    for model_name in models_to_try:
        logger.info(f"🎨 Essai avec modèle: {model_name}")
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&model={model_name}&nologo=true&enhance=true&seed={seed}&private=true"
        
        try:
            wait_for_rate_limit()
            response = requests.get(url, timeout=90, stream=True)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    logger.info(f"✅ Image générée avec {model_name}")
                    stats["image_generations"] += 1
                    return response.content, model_name
            elif response.status_code == 429:
                logger.warning(f"⚠️ Rate limit sur {model_name}")
                stats["rate_limits"] += 1
                time.sleep(3)
                continue
        except Exception as e:
            logger.error(f"❌ Erreur {model_name}: {e}")
            continue
    
    stats["errors"] += 1
    return None, None

# ==================== PERSONNAGES PUBLICS ====================

@app.route('/api/characters/public', methods=['GET'])
def get_public_characters():
    """Récupère tous les personnages publics"""
    stats["character_operations"] += 1
    
    characters = load_json_file(CHARACTERS_FILE, [])
    deleted_ids = get_deleted_ids()
    
    # Filtrer les personnages supprimés
    filtered = []
    for char in characters:
        char_id = char.get('id', '')
        # Vérifier si cet ID ou ses variantes sont supprimés
        is_deleted = (
            char_id in deleted_ids or
            char_id.replace('custom_', '') in deleted_ids or
            f'custom_{char_id}' in deleted_ids
        )
        if not is_deleted:
            filtered.append(char)
    
    logger.info(f"📦 {len(filtered)} personnages publics (version: {cache_version})")
    
    return jsonify({
        "success": True,
        "characters": filtered,
        "count": len(filtered),
        "cacheVersion": cache_version,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/characters/public', methods=['POST'])
def publish_character():
    """Publie ou met à jour un personnage"""
    stats["character_operations"] += 1
    
    data = request.json or {}
    character = data.get('character', {})
    
    if not character or not character.get('name'):
        return jsonify({"success": False, "error": "Données personnage invalides"}), 400
    
    characters = load_json_file(CHARACTERS_FILE, [])
    deleted_ids = get_deleted_ids()
    
    # Vérifier si le personnage est dans la liste des supprimés
    char_id = character.get('id', '')
    if char_id in deleted_ids:
        logger.warning(f"⚠️ Tentative de publier un personnage supprimé: {char_id}")
        return jsonify({"success": False, "error": "Personnage supprimé"}), 400
    
    # Chercher si le personnage existe déjà
    existing_index = None
    for i, c in enumerate(characters):
        if c.get('id') == char_id:
            existing_index = i
            break
    
    # Ajouter les métadonnées
    character['isPublic'] = True
    character['publishedAt'] = character.get('publishedAt', datetime.now().isoformat())
    character['updatedAt'] = datetime.now().isoformat()
    character['serverId'] = character.get('serverId', char_id)
    
    if existing_index is not None:
        # Mise à jour
        characters[existing_index] = character
        logger.info(f"🔄 Personnage mis à jour: {character['name']}")
    else:
        # Nouveau
        characters.append(character)
        logger.info(f"✅ Nouveau personnage publié: {character['name']}")
    
    save_json_file(CHARACTERS_FILE, characters)
    increment_cache_version()
    
    return jsonify({
        "success": True,
        "character": character,
        "cacheVersion": cache_version
    })

@app.route('/api/characters/public/<character_id>', methods=['DELETE'])
def delete_character(character_id):
    """Supprime un personnage public"""
    stats["character_operations"] += 1
    
    logger.info(f"🗑️ Demande suppression: {character_id}")
    
    characters = load_json_file(CHARACTERS_FILE, [])
    
    # Trouver et supprimer le personnage
    initial_count = len(characters)
    characters = [c for c in characters if c.get('id') != character_id and c.get('serverId') != character_id]
    
    # Aussi chercher avec/sans préfixe custom_
    if character_id.startswith('custom_'):
        base_id = character_id[7:]
        characters = [c for c in characters if c.get('id') != base_id and c.get('serverId') != base_id]
    else:
        prefixed_id = f'custom_{character_id}'
        characters = [c for c in characters if c.get('id') != prefixed_id and c.get('serverId') != prefixed_id]
    
    removed = initial_count - len(characters)
    
    # Ajouter à la liste des IDs supprimés
    add_deleted_id(character_id)
    
    save_json_file(CHARACTERS_FILE, characters)
    increment_cache_version()
    
    logger.info(f"✅ {removed} personnage(s) supprimé(s), ID ajouté à la liste noire")
    
    return jsonify({
        "success": True,
        "removed": removed,
        "cacheVersion": cache_version
    })

@app.route('/api/characters/delete', methods=['POST'])
def delete_character_post():
    """Supprime un personnage via POST (alternative au DELETE)"""
    stats["character_operations"] += 1
    
    data = request.json or {}
    character_id = data.get('characterId')
    all_ids = data.get('allIds', [])
    character_name = data.get('characterName')
    force_delete = data.get('forceDelete', False)
    
    if not character_id and not all_ids:
        return jsonify({"success": False, "error": "ID requis"}), 400
    
    logger.info(f"🗑️ POST suppression: {character_id}, IDs: {all_ids}, Nom: {character_name}")
    
    characters = load_json_file(CHARACTERS_FILE, [])
    initial_count = len(characters)
    
    # Collecter tous les IDs à supprimer
    ids_to_delete = set()
    if character_id:
        ids_to_delete.add(character_id)
        if character_id.startswith('custom_'):
            ids_to_delete.add(character_id[7:])
        else:
            ids_to_delete.add(f'custom_{character_id}')
    
    for cid in all_ids:
        ids_to_delete.add(cid)
        if cid.startswith('custom_'):
            ids_to_delete.add(cid[7:])
        else:
            ids_to_delete.add(f'custom_{cid}')
    
    # Filtrer les personnages
    characters = [c for c in characters if 
                  c.get('id') not in ids_to_delete and 
                  c.get('serverId') not in ids_to_delete]
    
    # Si on a un nom, aussi supprimer par nom
    if character_name and force_delete:
        characters = [c for c in characters if c.get('name', '').lower() != character_name.lower()]
    
    removed = initial_count - len(characters)
    
    # Ajouter tous les IDs à la liste noire
    for cid in ids_to_delete:
        add_deleted_id(cid)
    
    save_json_file(CHARACTERS_FILE, characters)
    increment_cache_version()
    
    logger.info(f"✅ POST: {removed} personnage(s) supprimé(s)")
    
    return jsonify({
        "success": True,
        "removed": removed,
        "deletedIds": list(ids_to_delete),
        "cacheVersion": cache_version
    })

@app.route('/api/characters/purge', methods=['POST'])
def purge_characters():
    """Purge plusieurs personnages d'un coup"""
    stats["character_operations"] += 1
    
    data = request.json or {}
    character_ids = data.get('characterIds', [])
    
    if not character_ids:
        return jsonify({"success": False, "error": "Aucun ID fourni"}), 400
    
    logger.info(f"🧹 Purge demandée pour {len(character_ids)} IDs")
    
    characters = load_json_file(CHARACTERS_FILE, [])
    initial_count = len(characters)
    
    # Collecter tous les IDs et leurs variantes
    all_ids_to_delete = set()
    for cid in character_ids:
        all_ids_to_delete.add(cid)
        if cid.startswith('custom_'):
            all_ids_to_delete.add(cid[7:])
        else:
            all_ids_to_delete.add(f'custom_{cid}')
    
    # Filtrer
    characters = [c for c in characters if 
                  c.get('id') not in all_ids_to_delete and 
                  c.get('serverId') not in all_ids_to_delete]
    
    removed = initial_count - len(characters)
    
    # Ajouter à la liste noire
    for cid in all_ids_to_delete:
        add_deleted_id(cid)
    
    save_json_file(CHARACTERS_FILE, characters)
    increment_cache_version()
    
    logger.info(f"✅ Purge: {removed} personnages supprimés")
    
    return jsonify({
        "success": True,
        "removed": removed,
        "cacheVersion": cache_version
    })

@app.route('/api/characters/invalidate-cache', methods=['POST'])
def invalidate_cache():
    """Force l'invalidation du cache"""
    increment_cache_version()
    logger.info(f"🔄 Cache invalidé manuellement")
    return jsonify({
        "success": True,
        "cacheVersion": cache_version
    })

@app.route('/api/characters/public/<character_id>/like', methods=['POST'])
def like_character(character_id):
    """Like un personnage"""
    stats["character_operations"] += 1
    
    characters = load_json_file(CHARACTERS_FILE, [])
    
    for char in characters:
        if char.get('id') == character_id or char.get('serverId') == character_id:
            char['likes'] = char.get('likes', 0) + 1
            save_json_file(CHARACTERS_FILE, characters)
            logger.info(f"👍 Like: {char['name']} ({char['likes']})")
            return jsonify({
                "success": True,
                "likes": char['likes']
            })
    
    return jsonify({"success": False, "error": "Personnage non trouvé"}), 404

# ==================== SYNCHRONISATION UTILISATEURS ====================

@app.route('/api/user-characters/sync', methods=['POST'])
def sync_user_characters():
    """Synchronise les personnages d'un utilisateur"""
    stats["character_operations"] += 1
    
    data = request.json or {}
    user_id = data.get('userId')
    characters = data.get('characters', [])
    
    if not user_id:
        return jsonify({"success": False, "error": "userId requis"}), 400
    
    # Sauvegarder les données utilisateur
    users = load_json_file(USERS_FILE, {})
    users[user_id] = {
        "characters": characters,
        "lastSync": datetime.now().isoformat(),
        "email": data.get('email')
    }
    save_json_file(USERS_FILE, users)
    
    logger.info(f"✅ Sync user {user_id}: {len(characters)} personnages")
    
    return jsonify({
        "success": True,
        "syncedCount": len(characters),
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/user-characters/<user_id>', methods=['GET'])
def get_user_characters(user_id):
    """Récupère les personnages d'un utilisateur"""
    stats["character_operations"] += 1
    
    users = load_json_file(USERS_FILE, {})
    user_data = users.get(user_id)
    
    if not user_data:
        return jsonify({
            "success": True,
            "characters": [],
            "hasData": False
        })
    
    return jsonify({
        "success": True,
        "characters": user_data.get('characters', []),
        "lastSync": user_data.get('lastSync'),
        "hasData": True
    })

# ==================== IMAGES ====================

@app.route('/generate', methods=['GET', 'POST'])
def generate_image():
    """Endpoint principal de génération d'images"""
    stats["total_requests"] += 1
    
    if request.method == 'POST':
        data = request.json or {}
        prompt = data.get('prompt', '')
        width = int(data.get('width', 768))
        height = int(data.get('height', 768))
        seed = data.get('seed')
        model = data.get('model')
    else:
        prompt = request.args.get('prompt', '')
        width = int(request.args.get('width', 768))
        height = int(request.args.get('height', 768))
        seed = request.args.get('seed')
        model = request.args.get('model')
    
    if not prompt:
        return jsonify({"error": "prompt requis"}), 400
    
    width = min(max(width, 256), 1024)
    height = min(max(height, 256), 1024)
    
    if not seed:
        seed = random.randint(1, 999999999)
    else:
        seed = int(seed)
    
    logger.info(f"📥 Image: {len(prompt)} chars, {width}x{height}, seed={seed}")
    
    # Vérifier cache
    cache_path = get_cache_path(prompt, width, height, seed)
    if os.path.exists(cache_path):
        logger.info("💾 Cache hit!")
        stats["cache_hits"] += 1
        return send_file(cache_path, mimetype='image/png')
    
    # Générer
    image_data, used_model = generate_image_pollinations(prompt, width, height, seed, model)
    
    if image_data:
        try:
            with open(cache_path, 'wb') as f:
                f.write(image_data)
        except Exception as e:
            logger.error(f"Erreur cache: {e}")
        
        return send_file(io.BytesIO(image_data), mimetype='image/png')
    
    return jsonify({"error": "Génération échouée"}), 503

# ==================== HEALTH & STATS ====================

@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health():
    """Endpoint de santé"""
    return jsonify({
        "status": "ok",
        "version": "7.0",
        "service": "Freebox Unified API (Images + Characters)",
        "cacheVersion": cache_version,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/stats', methods=['GET'])
@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Statistiques du serveur"""
    characters = load_json_file(CHARACTERS_FILE, [])
    users = load_json_file(USERS_FILE, {})
    deleted = get_deleted_ids()
    
    return jsonify({
        "success": True,
        "stats": {
            **stats,
            "publicCharacters": len(characters),
            "registeredUsers": len(users),
            "deletedIds": len(deleted),
            "cacheVersion": cache_version,
            "uptime": str(datetime.now() - datetime.fromisoformat(stats["start_time"]))
        }
    })

@app.route('/models', methods=['GET'])
def list_models():
    """Liste les modèles d'image disponibles"""
    return jsonify({
        "models": POLLINATIONS_MODELS
    })

# ==================== MAIN ====================

if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("🚀 Démarrage Freebox Unified API v7.0")
    logger.info("=" * 60)
    logger.info("")
    logger.info("Services disponibles:")
    logger.info("  📷 Images: /generate")
    logger.info("  👥 Personnages: /api/characters/public")
    logger.info("  🔄 Sync: /api/user-characters")
    logger.info("  ❤️ Health: /health")
    logger.info("")
    logger.info(f"📂 Data: {DATA_DIR}")
    logger.info(f"💾 Cache: {CACHE_DIR}")
    logger.info("")
    
    # Initialiser les fichiers si nécessaires
    if not os.path.exists(CHARACTERS_FILE):
        save_json_file(CHARACTERS_FILE, [])
    if not os.path.exists(USERS_FILE):
        save_json_file(USERS_FILE, {})
    if not os.path.exists(DELETED_IDS_FILE):
        save_json_file(DELETED_IDS_FILE, [])
    
    app.run(host='0.0.0.0', port=33437, debug=False, threaded=True)
