#!/bin/bash

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║   🚀 Déploiement Manuel EMB Backend                  ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Configuration .env
echo "📋 Étape 1: Configuration .env..."
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env existe déjà, sauvegarde en .env.backup${NC}"
    cp .env .env.backup
fi

cp .env.production.ready .env
echo -e "${GREEN}✓ .env configuré${NC}"

# 2. Créer le dossier database
echo ""
echo "📋 Étape 2: Création du dossier database..."
mkdir -p database
echo -e "${GREEN}✓ Dossier database créé${NC}"

# 3. Installer les dépendances
echo ""
echo "📋 Étape 3: Installation des dépendances..."
npm install --production
echo -e "${GREEN}✓ Dépendances installées${NC}"

# 4. Installer PM2 globalement
echo ""
echo "📋 Étape 4: Installation de PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 installé${NC}"
else
    echo -e "${GREEN}✓ PM2 déjà installé${NC}"
fi

# 5. Arrêter l'ancien processus
echo ""
echo "📋 Étape 5: Arrêt des anciens processus..."
pm2 delete emb-backend 2>/dev/null || true
echo -e "${GREEN}✓ Anciens processus arrêtés${NC}"

# 6. Démarrer avec PM2
echo ""
echo "📋 Étape 6: Démarrage du backend avec PM2..."
pm2 start server.js --name emb-backend

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors du démarrage${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backend démarré${NC}"

# 7. Sauvegarder la config PM2
echo ""
echo "📋 Étape 7: Sauvegarde de la configuration PM2..."
pm2 save
echo -e "${GREEN}✓ Configuration sauvegardée${NC}"

# 8. Configuration Nginx
echo ""
echo "📋 Étape 8: Configuration Nginx..."

sudo tee /etc/nginx/sites-available/emb > /dev/null << 'EOF'
# Backend EMB
server {
    listen 80;
    server_name emb_back.alicebot.me;

    location / {
        proxy_pass http://127.0.0.1:5005;
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

# Frontend EMB
server {
    listen 80;
    server_name emb_front.alicebot.me;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Activer le site
sudo ln -sf /etc/nginx/sites-available/emb /etc/nginx/sites-enabled/

# Tester la config
sudo nginx -t

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur de configuration Nginx${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Configuration Nginx OK${NC}"

# Recharger Nginx
echo ""
echo "📋 Étape 9: Rechargement de Nginx..."
sudo systemctl reload nginx
echo -e "${GREEN}✓ Nginx rechargé${NC}"

# 9. Vérifier le statut
echo ""
echo "📋 Étape 10: Vérification..."
sleep 2
pm2 status

echo ""
echo "Test backend local..."
curl -s http://127.0.0.1:5005 > /dev/null && echo -e "${GREEN}✓ Backend répond sur localhost:5005${NC}" || echo -e "${RED}❌ Backend ne répond pas${NC}"

echo ""
echo "Test via domaine..."
curl -s http://emb_back.alicebot.me > /dev/null && echo -e "${GREEN}✓ Backend accessible via emb_back.alicebot.me${NC}" || echo -e "${YELLOW}⚠️  Backend non accessible via le domaine (vérifier DNS)${NC}"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║            ✅ Déploiement terminé !                   ║"
echo "║                                                       ║"
echo "║  📦 Backend : http://emb_back.alicebot.me            ║"
echo "║  📍 Port local : 5005                                ║"
echo "║                                                       ║"
echo "║  📊 Commandes PM2 :                                  ║"
echo "║     pm2 status                                       ║"
echo "║     pm2 logs emb-backend                             ║"
echo "║     pm2 restart emb-backend                          ║"
echo "║     pm2 stop emb-backend                             ║"
echo "║                                                       ║"
echo "║  🔒 Pour ajouter SSL :                               ║"
echo "║     sudo certbot --nginx -d emb_back.alicebot.me     ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
