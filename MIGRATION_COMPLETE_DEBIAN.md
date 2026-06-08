# Migration Complète vers Debian - Naruto Chatbot

## 📋 Architecture Actuelle

L'application utilise plusieurs serveurs Python sur la Freebox (88.174.155.230):

1. **freebox_combined_server.py** (port 33437) - Serveur combiné principal
   - Authentification Email
   - Génération d'images (Premium)
   - Synchronisation personnages
   - Personnages publics
   - Système Premium/PayPal
   - Administration

2. **freebox_auth_server.py** (port 33439) - Serveur d'authentification dédié
   - Email/Mot de passe
   - OAuth Discord/Google
   - Gestion profils
   - Personnages utilisateur

3. **freebox_sync_server.py** (port 33438) - Serveur de synchronisation
   - Sync données utilisateur
   - Personnages publics/privés

4. **freebox_server_v6.py** (port 33437) - Serveur d'images dédié (alternative)

## 🎯 Plan de Migration

### Option 1: Migration Simplifiée (Recommandée)

Utiliser uniquement **freebox_combined_server.py** qui regroupe toutes les fonctionnalités sur un seul port (33437).

### Option 2: Migration Complète

Déployer les 3 serveurs séparément sur des ports différents.

---

## 📦 Étape 1: Prérequis sur Debian

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Python 3 et pip
sudo apt install python3 python3-pip python3-venv git -y

# Installer les dépendances Python globales
pip3 install flask flask-cors requests

# Créer l'utilisateur de service (optionnel mais recommandé)
sudo adduser --system --group --home /var/lib/roleplay roleplay
```

---

## 📦 Étape 2: Cloner le dépôt sur Debian

### Option A: Cloner directement depuis GitHub (Recommandé)

```bash
# Se connecter au serveur Debian
ssh user@votre-debian

# Installer git si pas installé
sudo apt install git -y

# Cloner le dépôt
cd ~
git clone https://github.com/davidc2115/Naruto-chabot.git roleplay-server

# Aller dans le dossier
cd roleplay-server
```

### Option B: Transférer les fichiers manuellement

### Sur votre machine locale:

```bash
# Créer un dossier pour le déploiement
mkdir deploy-debian
cd deploy-debian

# Copier les fichiers serveurs
cp /path/to/Naruto-chabot/freebox_combined_server.py .
cp /path/to/Naruto-chabot/freebox_auth_server.py .
cp /path/to/Naruto-chabot/freebox_sync_server.py .
cp /path/to/Naruto-chabot/freebox_server_v6.py .

# Copier le script de déploiement si existant
cp /path/to/Naruto-chabot/deploy-server.sh .
```

### Transférer sur Debian:

```bash
# Transférer les fichiers
scp deploy-debian/*.py user@votre-debian:/home/user/roleplay-server/
scp deploy-debian/*.sh user@votre-debian:/home/user/roleplay-server/
```

---

## 📦 Étape 3: Configuration sur Debian

### Option 1: Migration Simplifiée (Recommandée)

```bash
# Se connecter au serveur
ssh user@votre-debian

# Créer le répertoire
mkdir -p ~/roleplay-server
cd ~/roleplay-server

# Copier freebox_combined_server.py (via nano ou scp)
nano freebox_combined_server.py
# Collez le contenu du fichier

# Modifier l'admin email si nécessaire
nano freebox_combined_server.py
# Chercher ADMIN_EMAIL et remplacez par votre email
```

Modifier l'admin email dans le fichier (ligne 39):
```python
ADMIN_EMAIL = "votre-email@gmail.com"
```

### Option 2: Migration Complète (3 serveurs)

```bash
# Créer les répertoires
mkdir -p ~/roleplay-server/{auth,sync,images}
cd ~/roleplay-server

# Copier les fichiers dans leurs dossiers respectifs
cp freebox_auth_server.py auth/
cp freebox_sync_server.py sync/
cp freebox_server_v6.py images/
```

---

## 📦 Étape 4: Installation des dépendances

```bash
cd ~/roleplay-server

# Créer un environnement virtuel (recommandé)
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install flask flask-cors requests

# Ou sans environnement virtuel
pip3 install flask flask-cors requests --user
```

---

## 📦 Étape 5: Configuration du pare-feu

```bash
# Ouvrir les ports nécessaires
sudo ufw allow 33437/tcp  # Serveur combiné ou images
sudo ufw allow 33438/tcp  # Sync (si option 2)
sudo ufw allow 33439/tcp  # Auth (si option 2)

# Activer le pare-feu si pas déjà fait
sudo ufw enable

# Vérifier
sudo ufw status
```

---

## 📦 Étape 6: Démarrage des services

### Option 1: Serveur Combiné (Recommandé)

```bash
cd ~/roleplay-server

# Test manuel
python3 freebox_combined_server.py

# Si ça fonctionne, arrêter avec Ctrl+C et démarrer en arrière-plan
nohup python3 freebox_combined_server.py > server.log 2>&1 &

# Vérifier les logs
tail -f server.log

# Vérifier que le serveur écoute
curl http://localhost:33437/health
```

### Option 2: 3 Serveurs Séparés

```bash
cd ~/roleplay-server

# Démarrer le serveur d'auth
cd auth
nohup python3 freebox_auth_server.py > ../auth.log 2>&1 &

# Démarrer le serveur de sync
cd ../sync
nohup python3 freebox_sync_server.py > ../sync.log 2>&1 &

# Démarrer le serveur d'images
cd ../images
nohup python3 freebox_server_v6.py > ../images.log 2>&1 &

# Vérifier les logs
tail -f ~/roleplay-server/*.log

# Tester chaque service
curl http://localhost:33439/health  # Auth
curl http://localhost:33438/api/health  # Sync
curl http://localhost:33437/health  # Images
```

---

## 📦 Étape 7: Configuration avec systemd (Production)

### Pour le serveur combiné:

```bash
sudo nano /etc/systemd/system/roleplay-server.service
```

Contenu:
```ini
[Unit]
Description=Roleplay Chat Combined Server
After=network.target

[Service]
Type=simple
User=votre-user
WorkingDirectory=/home/votre-user/roleplay-server
ExecStart=/usr/bin/python3 /home/votre-user/roleplay-server/freebox_combined_server.py
Restart=always
RestartSec=10
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

```bash
# Recharger systemd
sudo systemctl daemon-reload

# Démarrer le service
sudo systemctl start roleplay-server

# Activer au démarrage
sudo systemctl enable roleplay-server

# Vérifier le statut
sudo systemctl status roleplay-server

# Voir les logs
sudo journalctl -u roleplay-server -f
```

### Pour 3 serveurs séparés:

Créer 3 services: `roleplay-auth.service`, `roleplay-sync.service`, `roleplay-images.service`

---

## 📦 Étape 8: Configuration Nginx (Optionnel mais recommandé)

```bash
# Installer Nginx
sudo apt install nginx -y

# Créer la configuration
sudo nano /etc/nginx/sites-available/roleplay-chat
```

Contenu:
```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    # Serveur combiné
    location / {
        proxy_pass http://localhost:33437;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Si 3 serveurs séparés:
    # location /auth/ {
    #     proxy_pass http://localhost:33439/;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    # }
    #
    # location /sync/ {
    #     proxy_pass http://localhost:33438/;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    # }
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/roleplay-chat /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

---

## 📦 Étape 9: Configuration SSL avec Let's Encrypt (Recommandé)

```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtenir le certificat
sudo certbot --nginx -d votre-domaine.com

# Certbot configurera automatiquement Nginx pour HTTPS
```

---

## 📦 Étape 10: Mise à jour de l'application

### Modifier les URLs dans le code source

Dans `src/services/CustomImageAPIService.js`:

```javascript
// Avant
this.customApiUrl = 'http://88.174.155.230:33437/generate';

// Après (avec IP)
this.customApiUrl = 'http://VOTRE-IP-PUBLIQUE:33437/generate';

// Ou avec domaine (recommandé)
this.customApiUrl = 'https://votre-domaine.com/generate';
```

### Recompiler l'APK

```bash
# Dans le projet Naruto-chabot
npm install
eas build --platform android --profile preview
```

---

## 📦 Étape 11: Migration des données existantes (Optionnel)

Si vous avez des données sur la Freebox à migrer:

```bash
# Sur la Freebox
ssh -p 33000 root@88.174.155.230

# Archiver les données
cd ~/roleplay_data
tar -czf roleplay_data_backup.tar.gz .

# Transférer vers Debian
scp -P 33000 ~/roleplay_data/roleplay_data_backup.tar.gz user@votre-debian:/tmp/

# Sur Debian
cd ~
tar -xzf /tmp/roleplay_data_backup.tar.gz
mv roleplay_data ~/roleplay-server/
```

---

## 🔧 Vérification

### Tester le serveur

```bash
# Health check
curl http://VOTRE-IP:33437/health

# Test génération d'image (si premium configuré)
curl "http://VOTRE-IP:33437/generate?prompt=test&width=512&height=512"

# Test auth
curl -X POST http://VOTRE-IP:33437/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

### Monitoring

```bash
# Voir les logs
tail -f ~/roleplay-server/server.log

# Ou avec systemd
sudo journalctl -u roleplay-server -f

# Vérifier l'utilisation des ressources
htop
```

---

## 🚨 Dépannage

### Le serveur ne démarre pas

```bash
# Vérifier si le port est utilisé
sudo netstat -tlnp | grep 33437

# Tuer le processus si nécessaire
sudo kill -9 PID

# Vérifier les logs pour les erreurs
tail -f ~/roleplay-server/server.log
```

### Erreur de permissions

```bash
# Corriger les permissions
chmod +x ~/roleplay-server/*.py
chown -R votre-user:votre-user ~/roleplay-server
```

### L'application ne peut pas se connecter

1. Vérifier que le pare-feu autorise le port
2. Vérifier que le serveur écoute sur 0.0.0.0
3. Tester depuis votre machine locale: `curl http://VOTRE-IP:33437/health`

---

## 📝 Résumé Rapide

**Option 1 (Simplifiée - Recommandée):**
1. Installer Python 3 sur Debian
2. Copier `freebox_combined_server.py`
3. Installer `flask flask-cors requests`
4. Modifier `ADMIN_EMAIL`
5. Démarrer: `nohup python3 freebox_combined_server.py > server.log 2>&1 &`
6. Ouvrir port 33437
7. Tester: `curl http://IP:33437/health`
8. Mettre à jour l'URL dans l'application
9. Recompiler l'APK

**Option 2 (Complète):**
1. Même chose mais avec 3 serveurs sur ports 33437, 33438, 33439
2. Configurer systemd pour chaque service
3. Configurer Nginx comme reverse proxy

---

## 🔐 Sécurité

1. **Utiliser HTTPS** avec Let's Encrypt
2. **Limiter l'accès par IP** si possible
3. **Utiliser un firewall** (UFW)
4. **Mettre à jour régulièrement** le système
5. **Surveiller les logs** pour activités suspectes
