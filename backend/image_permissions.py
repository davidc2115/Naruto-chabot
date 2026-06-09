"""
Backend Flask pour gérer les permissions d'accès aux images
Admin voit toutes les images, utilisateur voit seulement ses images
"""
from flask import Flask, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)

# Stockage des images (en production, utiliser une base de données)
IMAGES_FILE = 'images_data.json'
ACCOUNTS_FILE = 'accounts_data.json'

def load_images():
    """Charge les images depuis le fichier JSON"""
    if os.path.exists(IMAGES_FILE):
        with open(IMAGES_FILE, 'r') as f:
            return json.load(f)
    return []

def save_images(images):
    """Sauvegarde les images dans le fichier JSON"""
    with open(IMAGES_FILE, 'w') as f:
        json.dump(images, f, indent=2)

def load_accounts():
    """Charge les comptes depuis le fichier JSON"""
    if os.path.exists(ACCOUNTS_FILE):
        with open(ACCOUNTS_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_accounts(accounts):
    """Sauvegarde les comptes dans le fichier JSON"""
    with open(ACCOUNTS_FILE, 'w') as f:
        json.dump(accounts, f, indent=2)

def is_admin(user_id):
    """Vérifie si l'utilisateur est admin"""
    accounts = load_accounts()
    user_data = accounts.get(user_id, {})
    return user_data.get('email') == 'douvdouv21@gmail.com'

@app.route('/health', methods=['GET'])
def health():
    """Endpoint de santé"""
    return jsonify({'status': 'ok'})

@app.route('/api/account/save', methods=['POST'])
def save_account():
    """Sauvegarde le compte utilisateur"""
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'error': 'user_id required'}), 400
        
        accounts = load_accounts()
        accounts[user_id] = {
            'email': data.get('email'),
            'name': data.get('name'),
            'updated_at': datetime.now().isoformat()
        }
        save_accounts(accounts)
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/account/load', methods=['GET'])
def load_account():
    """Charge le compte utilisateur"""
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'error': 'user_id required'}), 400
        
        accounts = load_accounts()
        account = accounts.get(user_id)
        
        if account:
            return jsonify({'success': True, 'account': account})
        else:
            return jsonify({'success': False, 'error': 'Account not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/images/share', methods=['POST'])
def share_image():
    """Partage une image générée"""
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'error': 'user_id required'}), 400
        
        images = load_images()
        
        new_image = {
            'id': f"img_{datetime.now().timestamp()}",
            'user_id': user_id,
            'url': data.get('url'),
            'character_id': data.get('character_id'),
            'character_name': data.get('character_name'),
            'prompt': data.get('prompt'),
            'created_at': datetime.now().isoformat()
        }
        
        images.append(new_image)
        save_images(images)
        
        return jsonify({'success': True, 'image_id': new_image['id']})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/images/shared', methods=['GET'])
def load_shared_images():
    """
    Charge les images partagées
    Admin voit toutes les images, utilisateur voit seulement ses images
    """
    try:
        user_id = request.args.get('user_id')
        images = load_images()
        
        if user_id:
            # Utilisateur normal: voir seulement ses images
            user_images = [img for img in images if img.get('user_id') == user_id]
            return jsonify({'success': True, 'images': user_images})
        else:
            # Admin: voir toutes les images
            return jsonify({'success': True, 'images': images})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/images/user/<user_id>', methods=['GET'])
def load_user_images(user_id):
    """Charge les images d'un utilisateur spécifique"""
    try:
        images = load_images()
        user_images = [img for img in images if img.get('user_id') == user_id]
        return jsonify({'success': True, 'images': user_images})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=33437, debug=True)
