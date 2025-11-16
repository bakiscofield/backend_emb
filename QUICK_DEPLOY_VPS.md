# 🚀 Déploiement rapide sur VPS

Guide minimaliste pour déployer EMB Backend sur votre VPS.

## 📋 Prérequis VPS

Votre VPS doit avoir :
- Ubuntu 20.04+ ou Debian 11+
- Accès SSH
- Domaine `emb_back.alicebot.me` → IP du VPS

---

## ⚡ Déploiement en 5 minutes

### 1️⃣ Connexion au VPS

```bash
ssh root@votre-ip-vps
# ou
ssh votre-user@votre-ip-vps
```

### 2️⃣ Installation de Docker (si pas installé)

```bash
# Installation rapide Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose
sudo apt install docker-compose-plugin -y

# Vérification
docker --version
docker compose version
```

### 3️⃣ Cloner et déployer

```bash
# Créer le dossier
mkdir -p /var/www/emb && cd /var/www/emb

# Cloner le repo
git clone https://github.com/bakiscofield/backend_emb.git backend
cd backend

# Configurer les variables d'environnement
cp .env.example .env
nano .env
```

**Modifiez dans .env :**
```env
JWT_SECRET=CHANGEZ_CE_SECRET_123456789
FRONTEND_URL=https://votre-frontend.vercel.app
```

```bash
# Rendre le script exécutable
chmod +x deploy.sh

# Déployer !
./deploy.sh
```

✅ Votre backend tourne maintenant sur `http://localhost:5000`

### 4️⃣ Installer Nginx + SSL

```bash
# Installer Nginx
sudo apt install nginx certbot python3-certbot-nginx -y

# Copier la config Nginx (temporaire sans SSL)
sudo tee /etc/nginx/sites-available/emb_backend > /dev/null <<EOF
server {
    listen 80;
    server_name emb_back.alicebot.me;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Activer la configuration
sudo ln -s /etc/nginx/sites-available/emb_backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtenir le certificat SSL
sudo certbot --nginx -d emb_back.alicebot.me
```

✅ Votre backend est maintenant accessible sur `https://emb_back.alicebot.me`

### 5️⃣ Configurer le pare-feu

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## ✅ Test final

```bash
# Tester l'API
curl https://emb_back.alicebot.me

# Devrait retourner :
# {"success":true,"message":"API EMB - Échange Tmoney vers Flooz","version":"1.0.0"}
```

---

## 🔄 Commandes utiles

```bash
# Voir les logs
docker-compose logs -f

# Redémarrer
docker-compose restart

# Mettre à jour le code
git pull origin main
./deploy.sh

# Arrêter
docker-compose down

# Voir l'état
docker-compose ps
```

---

## 🆘 Problèmes courants

**Port 5000 déjà utilisé ?**
```bash
sudo lsof -i :5000
# Tuez le processus ou changez le port dans .env
```

**Docker ne démarre pas ?**
```bash
docker-compose logs
docker-compose down
docker-compose up -d --build
```

**SSL ne fonctionne pas ?**
```bash
# Vérifier que le domaine pointe bien vers le VPS
dig emb_back.alicebot.me

# Vérifier Nginx
sudo nginx -t
sudo systemctl status nginx
```

---

## 📝 URLs finales

- **API :** https://emb_back.alicebot.me
- **Health :** https://emb_back.alicebot.me/
- **Endpoints :** https://emb_back.alicebot.me/api/...

---

**C'est prêt ! 🎉**

Pour plus de détails, consultez `DEPLOYMENT.md`
