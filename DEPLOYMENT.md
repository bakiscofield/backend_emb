# 🚀 Guide de déploiement sur VPS avec Docker

Guide complet pour déployer le backend EMB sur votre VPS avec Docker.

## 📋 Prérequis

- VPS avec Ubuntu/Debian (recommandé)
- Accès SSH root ou sudo
- Domaine configuré : `emb_back.alicebot.me` pointant vers votre VPS
- Docker et Docker Compose installés

---

## 🔧 Étape 1 : Préparer le VPS

### 1.1 Installer Docker

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Ajouter votre utilisateur au groupe docker
sudo usermod -aG docker $USER

# Démarrer Docker
sudo systemctl enable docker
sudo systemctl start docker

# Vérifier l'installation
docker --version
```

### 1.2 Installer Docker Compose

```bash
# Installer Docker Compose
sudo apt install docker-compose-plugin -y

# Vérifier l'installation
docker compose version
```

### 1.3 Installer Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 1.4 Installer Certbot (SSL gratuit)

```bash
sudo apt install certbot python3-certbot-nginx -y
```

---

## 📦 Étape 2 : Déployer le backend

### 2.1 Cloner le repository

```bash
# Créer le dossier de l'application
mkdir -p /var/www/emb
cd /var/www/emb

# Cloner le repo
git clone https://github.com/bakiscofield/backend_emb.git backend
cd backend
```

### 2.2 Configurer les variables d'environnement

```bash
# Copier le fichier d'exemple
cp .env.production .env

# Éditer le fichier .env
nano .env
```

**Modifiez les valeurs suivantes :**
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=VOTRE_SECRET_SUPER_SECURISE_ICI
FRONTEND_URL=https://votre-frontend.vercel.app
```

**⚠️ IMPORTANT : Changez le JWT_SECRET !**

### 2.3 Rendre le script de déploiement exécutable

```bash
chmod +x deploy.sh
```

### 2.4 Lancer le déploiement

```bash
./deploy.sh
```

Le script va :
- ✅ Construire l'image Docker
- ✅ Créer et démarrer le conteneur
- ✅ Vérifier que tout fonctionne

### 2.5 Vérifier que ça fonctionne

```bash
# Tester l'API localement
curl http://localhost:5000

# Voir les logs
docker-compose logs -f
```

Vous devriez voir :
```json
{
  "success": true,
  "message": "API EMB - Échange Tmoney vers Flooz",
  "version": "1.0.0"
}
```

---

## 🌐 Étape 3 : Configurer Nginx et SSL

### 3.1 Configurer Nginx

```bash
# Copier la configuration Nginx
sudo cp nginx.conf /etc/nginx/sites-available/emb_backend

# Créer un lien symbolique
sudo ln -s /etc/nginx/sites-available/emb_backend /etc/nginx/sites-enabled/

# Tester la configuration (sans SSL pour l'instant)
# Éditer temporairement le fichier pour commenter les lignes SSL
sudo nano /etc/nginx/sites-available/emb_backend
```

**Configuration Nginx temporaire (HTTP seulement) :**
```nginx
server {
    listen 80;
    server_name emb_back.alicebot.me;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### 3.2 Obtenir le certificat SSL

```bash
# Obtenir le certificat Let's Encrypt
sudo certbot --nginx -d emb_back.alicebot.me
```

Certbot va :
1. Vérifier que le domaine pointe vers votre serveur
2. Obtenir le certificat SSL
3. Configurer automatiquement Nginx pour HTTPS

**Ou utilisez la configuration nginx.conf complète fournie :**

```bash
# Remplacer par la config complète avec SSL
sudo cp nginx.conf /etc/nginx/sites-available/emb_backend

# Tester et recharger
sudo nginx -t
sudo systemctl reload nginx
```

### 3.3 Tester HTTPS

```bash
# Tester l'API via HTTPS
curl https://emb_back.alicebot.me
```

---

## ✅ Étape 4 : Configuration finale

### 4.1 Configurer le renouvellement automatique SSL

```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Le renouvellement automatique est déjà configuré via cron
```

### 4.2 Configurer les logs

```bash
# Voir les logs Nginx
sudo tail -f /var/log/nginx/emb_backend_access.log
sudo tail -f /var/log/nginx/emb_backend_error.log

# Voir les logs Docker
docker-compose logs -f
```

### 4.3 Configurer le pare-feu

```bash
# Autoriser les ports nécessaires
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
sudo ufw status
```

---

## 🔄 Commandes utiles

### Gestion du conteneur

```bash
# Voir les conteneurs en cours
docker-compose ps

# Redémarrer le backend
docker-compose restart

# Arrêter le backend
docker-compose down

# Démarrer le backend
docker-compose up -d

# Voir les logs en temps réel
docker-compose logs -f

# Reconstruire et redémarrer
docker-compose up -d --build
```

### Mise à jour du code

```bash
# Aller dans le dossier
cd /var/www/emb/backend

# Récupérer les dernières modifications
git pull origin main

# Redéployer
./deploy.sh
```

### Sauvegarder la base de données

```bash
# Créer une sauvegarde
cp database/emb.db database/emb.db.backup-$(date +%Y%m%d-%H%M%S)

# Ou utiliser un script de sauvegarde automatique (cron)
```

---

## 🔐 Sécurité

### Points importants :

1. ✅ **JWT_SECRET** : Utilisez un secret fort et unique
2. ✅ **Pare-feu** : Activez UFW et limitez les ports
3. ✅ **SSL** : Let's Encrypt configuré et auto-renouvelé
4. ✅ **Updates** : Mettez à jour régulièrement le système
5. ✅ **Backups** : Sauvegardez régulièrement la base de données

### Commandes de sécurité :

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Vérifier les connexions
sudo netstat -tulpn | grep LISTEN

# Voir les tentatives de connexion SSH
sudo tail -f /var/log/auth.log
```

---

## 📊 Monitoring

### Vérifier l'état du système

```bash
# Utilisation CPU/RAM
htop

# Espace disque
df -h

# Logs système
journalctl -u docker -f
```

---

## 🆘 Dépannage

### Le conteneur ne démarre pas

```bash
# Voir les logs
docker-compose logs

# Reconstruire complètement
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Erreur de connexion à la base de données

```bash
# Vérifier que le dossier database existe
ls -la database/

# Recréer le dossier si nécessaire
mkdir -p database
docker-compose restart
```

### SSL ne fonctionne pas

```bash
# Vérifier la configuration Nginx
sudo nginx -t

# Vérifier les certificats
sudo certbot certificates

# Renouveler manuellement
sudo certbot renew --force-renewal
```

---

## 🎯 URLs finales

Après déploiement complet :

- **API Backend :** https://emb_back.alicebot.me
- **Health Check :** https://emb_back.alicebot.me/health
- **API Docs :** https://emb_back.alicebot.me/

---

## 📝 Notes

- La base de données SQLite est persistée dans `./database`
- Les logs Docker sont dans `/var/lib/docker/containers/`
- Les logs Nginx sont dans `/var/log/nginx/`
- Le certificat SSL se renouvelle automatiquement tous les 90 jours

---

**Déploiement réalisé avec ❤️ pour EMB**
