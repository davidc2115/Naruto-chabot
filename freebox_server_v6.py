#!/usr/bin/env python3
"""
Serveur API d'Images pour Freebox - Version 6.0
POLLINATIONS avec rotation de modèles en cas de rate limit

Modèles Pollinations disponibles (fallback automatique):
1. flux (défaut)
2. flux-realism (réaliste)
3. flux-anime (anime)
4. flux-3d (3D)
5. turbo (rapide)

Installation:
pip install flask requests

Démarrage:
python freebox_server_v6.py

ou avec nohup:
nohup python3 freebox_server_v6.py > /tmp/image_server.log 2>&1 &
"""

import os
import io
import time
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

# Configuration
CACHE_DIR = "/tmp/image_cache"
os.makedirs(CACHE_DIR, exist_ok=True)

# Délai minimum entre requêtes (secondes)
MIN_DELAY = 2
last_request_time = 0
request_lock = threading.Lock()

# Statistiques
stats = {
    "total_requests": 0,
    "cache_hits": 0,
    "successful_generations": 0,
    "rate_limits": 0,
    "errors": 0,
    "model_usage": {},
    "start_time": datetime.now().isoformat()
}

# Modèles Pollinations avec priorité
POLLINATIONS_MODELS = [
    {"name": "flux", "description": "Modèle par défaut, bonne qualité"},
    {"name": "flux-realism", "description": "Optimisé pour photos réalistes"},
    {"name": "flux-anime", "description": "Optimisé pour anime/manga"},
    {"name": "flux-3d", "description": "Style 3D"},
    {"name": "turbo", "description": "Génération rapide"},
]

def get_cache_path(prompt, width, height, seed):
    """Génère un chemin de cache basé sur le hash du prompt"""
    key = f"{prompt}_{width}_{height}_{seed}"
    hash_key = hashlib.md5(key.encode()).hexdigest()[:16]
    return os.path.join(CACHE_DIR, f"{hash_key}.png")

def detect_best_model(prompt):
    """Détecte le meilleur modèle selon le prompt"""
    prompt_lower = prompt.lower()
    
    # Anime / Manga
    if any(word in prompt_lower for word in ['anime', 'manga', 'waifu', 'chibi', 'kawaii', 'cel shading', '2d']):
        return "flux-anime"
    
    # Réaliste / Photo
    if any(word in prompt_lower for word in ['photorealistic', 'photograph', 'realistic', 'photo', 'dslr', '4k', 'cinematic', 'portrait photography']):
        return "flux-realism"
    
    # 3D
    if any(word in prompt_lower for word in ['3d render', '3d art', 'cgi', 'blender', 'octane']):
        return "flux-3d"
    
    # Par défaut
    return "flux"

def wait_for_rate_limit():
    """Attend le délai minimum entre les requêtes"""
    global last_request_time
    with request_lock:
        now = time.time()
        elapsed = now - last_request_time
        if elapsed < MIN_DELAY:
            wait_time = MIN_DELAY - elapsed
            logger.info(f"⏳ Attente {wait_time:.1f}s...")
            time.sleep(wait_time)
        last_request_time = time.time()

def simplify_prompt(prompt, max_length=800):
    """Simplifie un prompt trop long"""
    if len(prompt) <= max_length:
        return prompt
    simplified = prompt[:700] + "... " + prompt[-96:]
    logger.info(f"📝 Prompt simplifié: {len(prompt)} -> {len(simplified)} chars")
    return simplified

def generate_with_pollinations(prompt, width=768, height=768, seed=None, preferred_model=None):
    """
    Génère une image avec Pollinations
    Essaie plusieurs modèles en cas de rate limit
    """
    
    # Ordre des modèles à essayer
    if preferred_model:
        models_to_try = [preferred_model] + [m["name"] for m in POLLINATIONS_MODELS if m["name"] != preferred_model]
    else:
        detected = detect_best_model(prompt)
        models_to_try = [detected] + [m["name"] for m in POLLINATIONS_MODELS if m["name"] != detected]
    
    clean_prompt = simplify_prompt(prompt)
    encoded_prompt = requests.utils.quote(clean_prompt)
    
    if not seed:
        seed = random.randint(1, 999999999)
    
    for model in models_to_try:
        logger.info(f"🎨 Essai avec modèle: {model}")
        
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&model={model}&nologo=true&enhance=true&seed={seed}&private=true"
        
        try:
            wait_for_rate_limit()
            
            response = requests.get(url, timeout=90, stream=True)
            
            if response.status_code == 200:
                # Vérifier que c'est une image
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    logger.info(f"✅ Image générée avec {model}!")
                    stats["successful_generations"] += 1
                    stats["model_usage"][model] = stats["model_usage"].get(model, 0) + 1
                    return response.content, model
                else:
                    logger.warning(f"⚠️ Réponse non-image de {model}: {content_type}")
                    continue
            
            elif response.status_code == 429:
                logger.warning(f"⚠️ Rate limit sur {model}, essai suivant...")
                stats["rate_limits"] += 1
                time.sleep(3)  # Attente supplémentaire avant le prochain modèle
                continue
            
            elif response.status_code == 500 or response.status_code == 502 or response.status_code == 503:
                logger.warning(f"⚠️ Erreur serveur {response.status_code} sur {model}, essai suivant...")
                continue
            
            else:
                logger.error(f"❌ Erreur {response.status_code} sur {model}")
                continue
                
        except requests.exceptions.Timeout:
            logger.warning(f"⚠️ Timeout sur {model}, essai suivant...")
            continue
        except Exception as e:
            logger.error(f"❌ Exception sur {model}: {str(e)}")
            continue
    
    # Tous les modèles ont échoué
    logger.error("❌ Tous les modèles ont échoué!")
    stats["errors"] += 1
    return None, None

@app.route('/health', methods=['GET'])
def health():
    """Endpoint de santé"""
    return jsonify({
        "status": "ok",
        "version": "6.0",
        "service": "Freebox Image API (Pollinations Multi-Model)",
        "models": [m["name"] for m in POLLINATIONS_MODELS],
        "stats": stats
    })

@app.route('/generate', methods=['GET', 'POST'])
def generate():
    """Endpoint principal de génération d'images"""
    stats["total_requests"] += 1
    
    # Récupérer les paramètres
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
        return jsonify({"error": "Le paramètre 'prompt' est requis"}), 400
    
    # Limiter les dimensions
    width = min(max(width, 256), 1024)
    height = min(max(height, 256), 1024)
    
    # Générer un seed si non fourni
    if not seed:
        seed = random.randint(1, 999999999)
    else:
        seed = int(seed)
    
    logger.info(f"📥 Requête: {len(prompt)} chars, {width}x{height}, seed={seed}")
    
    # Vérifier le cache
    cache_path = get_cache_path(prompt, width, height, seed)
    if os.path.exists(cache_path):
        logger.info(f"💾 Cache hit!")
        stats["cache_hits"] += 1
        return send_file(cache_path, mimetype='image/png')
    
    # Générer l'image
    image_data, used_model = generate_with_pollinations(
        prompt, width, height, seed, 
        preferred_model=model if model in [m["name"] for m in POLLINATIONS_MODELS] else None
    )
    
    if image_data:
        # Sauvegarder dans le cache
        try:
            with open(cache_path, 'wb') as f:
                f.write(image_data)
            logger.info(f"💾 Image mise en cache")
        except Exception as e:
            logger.error(f"Erreur cache: {e}")
        
        return send_file(
            io.BytesIO(image_data),
            mimetype='image/png',
            as_attachment=False
        )
    
    # Échec total
    return jsonify({
        "error": "Génération échouée",
        "message": "Tous les modèles ont atteint leur rate limit. Réessayez dans quelques minutes.",
        "tried_models": [m["name"] for m in POLLINATIONS_MODELS]
    }), 503

@app.route('/models', methods=['GET'])
def list_models():
    """Liste les modèles disponibles"""
    return jsonify({
        "models": POLLINATIONS_MODELS,
        "usage_stats": stats["model_usage"]
    })

@app.route('/stats', methods=['GET'])
def get_stats():
    """Retourne les statistiques"""
    return jsonify(stats)

@app.route('/clear-cache', methods=['POST'])
def clear_cache():
    """Vide le cache"""
    import shutil
    try:
        shutil.rmtree(CACHE_DIR)
        os.makedirs(CACHE_DIR, exist_ok=True)
        return jsonify({"message": "Cache vidé"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("🚀 Démarrage Freebox Image API v6.0")
    logger.info("📡 Pollinations avec rotation de modèles")
    logger.info("=" * 60)
    logger.info("")
    logger.info("Modèles disponibles (fallback automatique):")
    for i, m in enumerate(POLLINATIONS_MODELS, 1):
        logger.info(f"  {i}. {m['name']}: {m['description']}")
    logger.info("")
    logger.info("En cas de rate limit sur un modèle, le suivant est essayé automatiquement.")
    logger.info("")
    logger.info(f"📂 Cache: {CACHE_DIR}")
    logger.info(f"⏱️ Délai minimum: {MIN_DELAY}s entre requêtes")
    logger.info("")
    
    app.run(host='0.0.0.0', port=33437, debug=False, threaded=True)
