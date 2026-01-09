# Déploiement du Serveur Freebox v3.0

## Prérequis
- Accès SSH à la Freebox (port 22)
- Python 3 installé sur la Freebox

## Instructions de déploiement

### 1. Copier le fichier serveur sur la Freebox

```bash
scp freebox_combined_server.py root@88.174.155.230:/root/roleplay_data/
```

### 2. Se connecter à la Freebox

```bash
ssh root@88.174.155.230
```

### 3. Arrêter l'ancien serveur

```bash
pkill -f freebox_combined_server.py
```

### 4. Démarrer le nouveau serveur

```bash
cd /root/roleplay_data
nohup python3 freebox_combined_server.py > server.log 2>&1 &
```

### 5. Vérifier que le serveur fonctionne

```bash
curl http://localhost:33437/health
```

Résultat attendu:
```json
{"status":"ok","service":"Roleplay Chat Combined Server","version":"3.0.0",...}
```

## Nouvelles fonctionnalités du serveur v3.0

### Génération d'images (Premium uniquement)
- `/generate` - Vérifie maintenant le statut premium avant de générer

### API Premium
- `GET /api/premium/check` - Vérifie le statut premium
- `GET /api/premium/price` - Récupère le prix du premium
- `GET /api/premium/paypal-link` - Génère un lien de paiement

### API PayPal (Admin)
- `GET /admin/paypal/config` - Récupère la config PayPal
- `PUT /admin/paypal/config` - Met à jour la config PayPal
- `GET /admin/payments/pending` - Liste les paiements en attente
- `POST /admin/payments/:id/confirm` - Confirme un paiement

### Synchronisation
- Les conversations NE sont PLUS synchronisées
- Seuls les personnages créés sont synchronisés

## Configuration PayPal

Après déploiement, configurer PayPal via l'interface admin:
1. Aller dans l'onglet Admin > Config
2. Entrer l'email PayPal ou username PayPal.me
3. Définir le prix Premium

## En cas de problème

Voir les logs:
```bash
tail -f /root/roleplay_data/server.log
```

Redémarrer:
```bash
pkill -f freebox_combined_server.py
cd /root/roleplay_data && nohup python3 freebox_combined_server.py > server.log 2>&1 &
```
