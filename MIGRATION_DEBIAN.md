# Migration du Serveur d'Images vers Debian

## 📋 Problème actuel

L'application affiche "serveur hors ligne" car le serveur Freebox (88.174.155.230:33437) n'est plus accessible.

## 🎯 Solution

Migrer le serveur de génération d'images sur votre serveur Debian.

---

## 📦 Étape 1: Prérequis sur le serveur Debian

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Python 3 et pip
sudo apt install python3 python3-pip python3-venv -y

# Installer git (si nécessaire)
sudo apt install git -y
```

---

## 📦 Étape 2: Copier le fichier serveur sur Debian

### Option A: Via SCP depuis votre machine locale

```bash
# Copier le fichier serveur
scp freebox_server_v6.py user@votre-serveur-debian:/home/user/

# Remplacez:
# - user par votre utilisateur Debian
# - votre-serveur-debian par l'IP ou hostname de votre serveur
```

### Option B: Directement sur le serveur Debian

```bash
# Se connecter au serveur
ssh user@votre-serveur-debian

# Créer le répertoire
mkdir -p ~/image-server
cd ~/image-server

# Copier le contenu de freebox_server_v6.py (voir fichier complet)
nano freebox_server_v6.py
# Collez le contenu du fichier
# Ctrl+O pour sauvegarder, Ctrl+X pour quitter
```

---

## 📦 Étape 3: Installer les dépendances

```bash
# Créer un environnement virtuel (recommandé)
cd ~/image-server
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install flask requests

# Ou sans environnement virtuel
pip3 install flask requests
```

---

## 📦 Étape 4: Démarrer le serveur

### Option A: Manuel (pour tester)

```bash
cd ~/image-server
python3 freebox_server_v6.py
```

Le serveur démarrera sur le port 33437.

### Option B: En arrière-plan (recommandé)

```bash
cd ~/image-server
nohup python3 freebox_server_v6.py > server.log 2>&1 &
```

### Option C: Avec systemd (production - recommandé)

```bash
# Créer le fichier de service
sudo nano /etc/systemd/system/image-server.service
```

Contenu du fichier:
```ini
[Unit]
Description=Image Generation Server
After=network.target

[Service]
Type=simple
User=votre-user
WorkingDirectory=/home/votre-user/image-server
ExecStart=/usr/bin/python3 /home/votre-user/image-server/freebox_server_v6.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Recharger systemd
sudo systemctl daemon-reload

# Démarrer le service
sudo systemctl start image-server

# Activer au démarrage
sudo systemctl enable image-server

# Vérifier le statut
sudo systemctl status image-server
```

---

## 📦 Étape 5: Configurer le pare-feu

```bash
# Ouvrir le port 33437
sudo ufw allow 33437/tcp

# Ou avec iptables
sudo iptables -A INPUT -p tcp --dport 33437 -j ACCEPT
sudo iptables-save
```

---

## 📦 Étape 6: Tester le serveur

```bash
# Test local
curl http://localhost:33437/health

# Test depuis l'extérieur (remplacez IP par votre IP publique)
curl http://VOTRE-IP-PUBLIQUE:33437/health
```

Résultat attendu:
```json
{
  "status": "ok",
  "version": "6.0",
  "service": "Freebox Image API (Pollinations Multi-Model)",
  "models": ["flux", "flux-realism", "flux-anime", "flux-3d", "turbo"],
  "stats": {...}
}
```

---

## 📦 Étape 7: Mettre à jour l'application

### Option A: Via l'interface de l'application

1. Ouvrir l'application
2. Aller dans les paramètres
3. Chercher "Configuration API Images"
4. Changer l'URL par: `http://VOTRE-IP-PUBLIQUE:33437/generate`
5. Sauvegarder

### Option B: Modifier le code source

Dans `src/services/CustomImageAPIService.js`, modifier la ligne 13:

```javascript
// Avant
this.customApiUrl = 'http://88.174.155.230:33437/generate';

// Après
this.customApiUrl = 'http://VOTRE-IP-PUBLIQUE:33437/generate';
```

Puis recompiler l'APK.

---

## 🔧 Étape 8: Configuration avec domaine (optionnel mais recommandé)

Si vous avez un domaine, configurez un reverse proxy avec Nginx:

```bash
# Installer Nginx
sudo apt install nginx -y

# Créer la configuration
sudo nano /etc/nginx/sites-available/image-server
```

Contenu:
```nginx
server {
    listen 80;
    server_name images.votre-domaine.com;

    location / {
        proxy_pass http://localhost:33437;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/image-server /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

Ensuite, utilisez `https://images.votre-domaine.com/generate` dans l'application.

---

## 📊 Monitoring

### Voir les logs

```bash
# Si lancé avec nohup
tail -f ~/image-server/server.log

# Si avec systemd
sudo journalctl -u image-server -f
```

### Voir les statistiques

```bash
curl http://localhost:33437/stats
```

---

## 🔒 Sécurité (optionnel)

Pour limiter l'accès à votre serveur:

### Option A: Par IP

```bash
# Avec iptables
sudo iptables -A INPUT -p tcp --dport 33437 -s VOTRE-IP-ALLOWED -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 33437 -j DROP
```

### Option B: Avec authentification basique

Modifier `freebox_server_v6.py` pour ajouter une authentification.

---

## 🚨 Dépannage

### Le serveur ne démarre pas

```bash
# Vérifier si le port est déjà utilisé
sudo netstat -tlnp | grep 33437

# Tuer le processus si nécessaire
sudo kill -9 PID

# Vérifier les logs
tail -f ~/image-server/server.log
```

### L'application ne peut pas se connecter

1. Vérifier que le pare-feu autorise le port 33437
2. Vérifier que le serveur écoute sur 0.0.0.0 et pas localhost
3. Tester depuis votre machine locale: `curl http://VOTRE-IP:33437/health`

### Rate limit sur Pollinations

Le serveur gère automatiquement la rotation entre modèles. Attendez quelques minutes si tous les modèles sont en rate limit.

---

## 📝 Résumé rapide

1. Installer Python 3 sur Debian
2. Copier `freebox_server_v6.py` sur le serveur
3. Installer `flask` et `requests`
4. Démarrer le serveur sur le port 33437
5. Ouvrir le port dans le pare-feu
6. Tester avec `curl http://IP:33437/health`
7. Mettre à jour l'URL dans l'application
