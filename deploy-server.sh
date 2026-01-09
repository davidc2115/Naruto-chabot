#!/bin/bash
# Script de déploiement du serveur Freebox
# Exécuter depuis un terminal avec accès SSH à la Freebox

FREEBOX_IP="88.174.155.230"
SSH_PORT="33000"
REMOTE_PATH="/root/roleplay_data"

echo "🚀 Déploiement du serveur Freebox v3.0"
echo "======================================="

# 1. Copier le fichier
echo "📤 Upload du serveur..."
scp -P $SSH_PORT freebox_combined_server.py root@$FREEBOX_IP:$REMOTE_PATH/

# 2. Redémarrer le serveur
echo "🔄 Redémarrage du serveur..."
ssh -p $SSH_PORT root@$FREEBOX_IP "pkill -f freebox_combined_server.py; sleep 2; cd $REMOTE_PATH && nohup python3 freebox_combined_server.py > server.log 2>&1 &"

# 3. Attendre et vérifier
echo "⏳ Attente du démarrage..."
sleep 5

echo "✅ Vérification..."
curl -s http://$FREEBOX_IP:33437/health

echo ""
echo "======================================="
echo "✅ Déploiement terminé!"
