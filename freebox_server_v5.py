#!/usr/bin/env python3
"""
Serveur API d'Images pour Freebox - Version 5.0
SANS POLLINATIONS - Utilise Hugging Face Inference API

Modèles disponibles:
- stabilityai/stable-diffusion-xl-base-1.0 (SDXL)
- runwayml/stable-diffusion-v1-5 (SD 1.5)
- stabilityai/stable-diffusion-2-1 (SD 2.1)

Installation:
pip install flask requests pillow

Démarrage:
python freebox_server_v5.py
"""

import os
import io
import time
import random
import hashlib
import logging
from datetime import datetime
from flask import Flask, request, send_file, jsonify
import requests

app = Flask(__name__)

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
CACHE_DIR = "/tmp/image_cache"
os.makedirs(CACHE_DIR, exist_ok=True)

# Délai minimum entre requêtes (secondes)
MIN_DELAY = 2
last_request_time = 0

# Statistiques
stats = {
    "total_requests": 0,
    "cache_hits": 0,
    "huggingface_calls": 0,
    "errors": 0,
    "start_time": datetime.now().isoformat()
}

# Modèles Hugging Face (gratuits avec rate limits)
HF_MODELS = {
    "sdxl": "stabilityai/stable-diffusion-xl-base-1.0",
    "sd15": "runwayml/stable-diffusion-v1-5",
    "sd21": "stabilityai/stable-diffusion-2-1",
    "anime": "Linaqruf/animagine-xl-3.0",
    "realistic": "SG161222/Realistic_Vision_V5.1_noVAE",
}

# Token Hugging Face (optionnel mais recommandé pour éviter rate limits)
# Créez un compte gratuit sur huggingface.co et générez un token
HF_TOKEN = os.environ.get("HF_TOKEN", "")

def get_cache_path(prompt, width, height, seed):
    """Génère un chemin de cache basé sur le hash du prompt"""
    key = f"{prompt}_{width}_{height}_{seed}"
    hash_key = hashlib.md5(key.encode()).hexdigest()[:16]
    return os.path.join(CACHE_DIR, f"{hash_key}.png")

def detect_style(prompt):
    """Détecte le style de l'image pour choisir le meilleur modèle"""
    prompt_lower = prompt.lower()
    
    # Anime / Manga
    if any(word in prompt_lower for word in ['anime', 'manga', 'waifu', 'chibi', 'kawaii', 'otaku', 'cel shading']):
        return "anime"
    
    # Réaliste / Photo
    if any(word in prompt_lower for word in ['photorealistic', 'photograph', 'realistic', 'photo', 'dslr', '4k', 'cinematic']):
        return "realistic"
    
    # Par défaut: SDXL (meilleure qualité générale)
    return "sdxl"

def wait_for_rate_limit():
    """Attend le délai minimum entre les requêtes"""
    global last_request_time
    now = time.time()
    elapsed = now - last_request_time
    if elapsed < MIN_DELAY:
        wait_time = MIN_DELAY - elapsed
        logger.info(f"⏳ Attente de {wait_time:.1f}s pour rate limit...")
        time.sleep(wait_time)
    last_request_time = time.time()

def simplify_prompt(prompt, max_length=500):
    """Simplifie un prompt trop long"""
    if len(prompt) <= max_length:
        return prompt
    
    # Garder les premiers 400 caractères + les derniers 100
    simplified = prompt[:400] + "... " + prompt[-96:]
    logger.info(f"📝 Prompt simplifié: {len(prompt)} -> {len(simplified)} chars")
    return simplified

def generate_with_huggingface(prompt, width=768, height=768, seed=None, model_key="sdxl"):
    """Génère une image avec Hugging Face Inference API"""
    
    model_id = HF_MODELS.get(model_key, HF_MODELS["sdxl"])
    api_url = f"https://api-inference.huggingface.co/models/{model_id}"
    
    headers = {
        "Content-Type": "application/json"
    }
    if HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"
    
    # Simplifier le prompt si trop long
    clean_prompt = simplify_prompt(prompt)
    
    payload = {
        "inputs": clean_prompt,
        "parameters": {
            "width": min(width, 1024),  # HF limite souvent à 1024
            "height": min(height, 1024),
            "num_inference_steps": 25,
            "guidance_scale": 7.5,
        }
    }
    
    if seed:
        payload["parameters"]["seed"] = seed
    
    logger.info(f"🎨 Génération avec {model_id}...")
    logger.info(f"📝 Prompt: {clean_prompt[:100]}...")
    
    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=120)
        
        if response.status_code == 200:
            logger.info("✅ Image générée avec succès!")
            stats["huggingface_calls"] += 1
            return response.content
        
        elif response.status_code == 503:
            # Modèle en chargement
            logger.warning("⏳ Modèle en cours de chargement sur HF...")
            time.sleep(20)  # Attendre que le modèle charge
            # Réessayer une fois
            response = requests.post(api_url, headers=headers, json=payload, timeout=120)
            if response.status_code == 200:
                stats["huggingface_calls"] += 1
                return response.content
        
        elif response.status_code == 429:
            # Rate limit
            logger.warning("⚠️ Rate limit HuggingFace atteint")
            stats["errors"] += 1
            return None
        
        else:
            logger.error(f"❌ Erreur HF: {response.status_code} - {response.text[:200]}")
            stats["errors"] += 1
            return None
            
    except Exception as e:
        logger.error(f"❌ Exception HF: {str(e)}")
        stats["errors"] += 1
        return None

@app.route('/health', methods=['GET'])
def health():
    """Endpoint de santé"""
    return jsonify({
        "status": "ok",
        "version": "5.0",
        "service": "Freebox Image API (HuggingFace)",
        "models": list(HF_MODELS.keys()),
        "stats": stats,
        "hf_token_configured": bool(HF_TOKEN)
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
        model = data.get('model', 'auto')
    else:
        prompt = request.args.get('prompt', '')
        width = int(request.args.get('width', 768))
        height = int(request.args.get('height', 768))
        seed = request.args.get('seed')
        model = request.args.get('model', 'auto')
    
    if not prompt:
        return jsonify({"error": "Le paramètre 'prompt' est requis"}), 400
    
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
    
    # Attendre le rate limit
    wait_for_rate_limit()
    
    # Détecter le style et choisir le modèle
    if model == 'auto':
        model_key = detect_style(prompt)
    else:
        model_key = model if model in HF_MODELS else "sdxl"
    
    logger.info(f"🎯 Modèle sélectionné: {model_key}")
    
    # Générer l'image
    image_data = generate_with_huggingface(prompt, width, height, seed, model_key)
    
    if image_data:
        # Sauvegarder dans le cache
        try:
            with open(cache_path, 'wb') as f:
                f.write(image_data)
            logger.info(f"💾 Image mise en cache: {cache_path}")
        except Exception as e:
            logger.error(f"Erreur cache: {e}")
        
        return send_file(
            io.BytesIO(image_data),
            mimetype='image/png',
            as_attachment=False
        )
    
    # Échec - retourner une image placeholder
    logger.error("❌ Échec génération, retour placeholder")
    return jsonify({
        "error": "Génération échouée",
        "message": "Le service HuggingFace est temporairement indisponible. Réessayez dans quelques minutes."
    }), 503

@app.route('/models', methods=['GET'])
def list_models():
    """Liste les modèles disponibles"""
    return jsonify({
        "models": [
            {"key": k, "name": v, "description": get_model_description(k)} 
            for k, v in HF_MODELS.items()
        ]
    })

def get_model_description(key):
    descriptions = {
        "sdxl": "SDXL - Meilleure qualité générale",
        "sd15": "SD 1.5 - Rapide et léger",
        "sd21": "SD 2.1 - Bon équilibre",
        "anime": "Animagine - Optimisé anime/manga",
        "realistic": "Realistic Vision - Photos réalistes"
    }
    return descriptions.get(key, "")

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
    logger.info("=" * 50)
    logger.info("🚀 Démarrage Freebox Image API v5.0")
    logger.info("📡 HuggingFace Inference API (SANS Pollinations)")
    logger.info(f"🔑 Token HF: {'Configuré' if HF_TOKEN else 'Non configuré (recommandé)'}")
    logger.info("=" * 50)
    logger.info("")
    logger.info("Pour configurer un token HuggingFace (recommandé):")
    logger.info("  export HF_TOKEN='votre_token_hf'")
    logger.info("")
    logger.info("Modèles disponibles:")
    for k, v in HF_MODELS.items():
        logger.info(f"  - {k}: {v}")
    logger.info("")
    
    app.run(host='0.0.0.0', port=33437, debug=False)
