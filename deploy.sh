#!/bin/bash

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║   🚀 Déploiement EMB Complet (Backend + Frontend)    ║"
echo "║      avec Nginx unifié + SSL                         ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKEND_DOMAIN="emb_back.alicebot.me"
FRONTEND_DOMAIN="emb_front.alicebot.me"
EMAIL="admin@alicebot.me"
COMPOSE_FILE="docker-compose.prod.yml"

# Détecter Docker Compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    exit 1
fi

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker installé${NC}"
echo -e "${GREEN}✓ Docker Compose: $DOCKER_COMPOSE${NC}"

# Vérifier/Créer .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Fichier .env non trouvé${NC}"
    if [ -f .env.production.ready ]; then
        echo "Copie de .env.production.ready vers .env..."
        cp .env.production.ready .env
        echo -e "${GREEN}✓ Fichier .env créé${NC}"
    elif [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Modifiez JWT_SECRET dans .env !${NC}"
        exit 1
    else
        echo -e "${RED}❌ Aucun fichier .env trouvé${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Fichier .env configuré${NC}"

# Créer les dossiers nécessaires
mkdir -p nginx/conf.d certbot/conf certbot/www database

# Vérifier si c'est une première installation ou une mise à jour
SSL_BACKEND_EXISTS=false
SSL_FRONTEND_EXISTS=false
FIRST_DEPLOY=false

# Vérifier les certificats existants
if [ -f "certbot/conf/live/$BACKEND_DOMAIN/fullchain.pem" ]; then
    echo -e "${GREEN}✓ Certificat SSL backend déjà présent${NC}"
    SSL_BACKEND_EXISTS=true
fi

if [ -f "certbot/conf/live/$FRONTEND_DOMAIN/fullchain.pem" ]; then
    echo -e "${GREEN}✓ Certificat SSL frontend déjà présent${NC}"
    SSL_FRONTEND_EXISTS=true
fi

# Vérifier l'état SSL et préparer la configuration Nginx
if [ "$SSL_BACKEND_EXISTS" = true ] && [ "$SSL_FRONTEND_EXISTS" = true ]; then
    echo -e "${GREEN}✓ Configuration SSL complète détectée${NC}"
    # Utiliser emb-unified.conf avec HTTPS
    rm -f nginx/conf.d/emb-temp.conf
    if [ -f "nginx/conf.d/emb-unified.conf.disabled" ]; then
        mv nginx/conf.d/emb-unified.conf.disabled nginx/conf.d/emb-unified.conf
    fi
else
    echo -e "${YELLOW}⚠️  Certificats SSL manquants - démarrage en HTTP${NC}"

    # Créer config Nginx HTTP seulement (sans SSL)
    cat > nginx/conf.d/emb-http-only.conf <<'EOF'
# Configuration HTTP uniquement (sans SSL)
server {
    listen 80;
    server_name emb_back.alicebot.me;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://emb-backend:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name emb_front.alicebot.me;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://emb-frontend:3000;
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

    # Désactiver emb-unified.conf (qui requiert SSL)
    if [ -f "nginx/conf.d/emb-unified.conf" ]; then
        mv nginx/conf.d/emb-unified.conf nginx/conf.d/emb-unified.conf.disabled
    fi
fi

echo ""
echo "🛑 Arrêt des anciens conteneurs..."
$DOCKER_COMPOSE -f $COMPOSE_FILE down 2>/dev/null
docker stop emb-backend emb-frontend 2>/dev/null
docker rm emb-backend emb-frontend 2>/dev/null

echo ""
echo "🔨 Construction des images backend et frontend..."
$DOCKER_COMPOSE -f $COMPOSE_FILE build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de la construction des images${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Images construites${NC}"

echo ""
echo "🚀 Démarrage du backend et frontend..."
$DOCKER_COMPOSE -f $COMPOSE_FILE up -d emb-backend emb-frontend

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors du démarrage${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_FILE logs
    exit 1
fi

echo -e "${GREEN}✓ Conteneurs démarrés${NC}"

# Attendre que les services démarrent
echo "⏳ Attente du démarrage (20 secondes)..."
sleep 20

# Démarrer Nginx système si installé
if command -v nginx &> /dev/null && [ -f /etc/nginx/sites-available/emb ]; then
    echo ""
    echo "🔧 Démarrage de Nginx système..."
    sudo systemctl start nginx
    sudo systemctl enable nginx
    echo -e "${GREEN}✓ Nginx système démarré${NC}"
    echo ""
    echo "Pour configurer SSL avec Nginx système, exécutez :"
    echo -e "${BLUE}sudo ./setup-nginx-system.sh${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Nginx système non configuré${NC}"
    echo ""
    echo "Pour utiliser Nginx système avec SSL automatique (certbot --nginx) :"
    echo -e "${BLUE}sudo ./setup-nginx-system.sh${NC}"
fi

# Vérifier que tout tourne
echo ""
echo "🔍 Vérification des conteneurs..."
if docker ps | grep -q emb-backend && docker ps | grep -q emb-frontend; then
    echo -e "${GREEN}✓ Tous les conteneurs fonctionnent${NC}"
else
    echo -e "${RED}❌ Certains conteneurs ne fonctionnent pas${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_FILE ps
    $DOCKER_COMPOSE -f $COMPOSE_FILE logs --tail=50
    exit 1
fi

# Vérifier Nginx système
NGINX_STATUS="❌ Non configuré"
if systemctl is-active --quiet nginx 2>/dev/null; then
    NGINX_STATUS="✅ Actif"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║            ✅ Déploiement réussi !                    ║"
echo "║                                                       ║"
echo "║  📦 Services Docker :                                ║"
echo "║     • Backend : localhost:5005                       ║"
echo "║     • Frontend : localhost:3000                      ║"
echo "║                                                       ║"
echo "║  🌐 Nginx système : $NGINX_STATUS                    ║"
if systemctl is-active --quiet nginx 2>/dev/null; then
echo "║     • https://emb_back.alicebot.me                   ║"
echo "║     • https://emb_front.alicebot.me                  ║"
else
echo "║                                                       ║"
echo "║  Pour activer SSL avec certbot --nginx :            ║"
echo "║     sudo ./setup-nginx-system.sh                     ║"
fi
echo "║                                                       ║"
echo "║  📊 Commandes utiles :                               ║"
echo "║     docker compose -f $COMPOSE_FILE logs -f          ║"
echo "║     docker compose -f $COMPOSE_FILE ps               ║"
echo "║     docker compose -f $COMPOSE_FILE restart          ║"
echo "║     sudo systemctl status nginx                      ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
