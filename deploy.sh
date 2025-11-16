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
docker stop emb-backend emb-nginx emb-certbot 2>/dev/null
docker rm emb-backend emb-nginx emb-certbot 2>/dev/null

# Arrêter Nginx système s'il tourne
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Nginx système détecté, arrêt...${NC}"
    sudo systemctl stop nginx
fi

echo ""
echo "🔨 Construction des images backend et frontend..."
$DOCKER_COMPOSE -f $COMPOSE_FILE build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de la construction des images${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Images construites${NC}"

echo ""
echo "🚀 Démarrage du backend, frontend et Nginx..."
$DOCKER_COMPOSE -f $COMPOSE_FILE up -d emb-backend emb-frontend nginx

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors du démarrage${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_FILE logs
    exit 1
fi

echo -e "${GREEN}✓ Conteneurs démarrés${NC}"

# Attendre que les services démarrent
echo "⏳ Attente du démarrage (20 secondes)..."
sleep 20

# Gestion SSL
if [ "$SSL_BACKEND_EXISTS" = true ] && [ "$SSL_FRONTEND_EXISTS" = true ]; then
    # Certificats déjà présents - déploiement rapide
    echo ""
    echo -e "${GREEN}✓ Certificats SSL valides détectés${NC}"
    echo "🔄 Démarrage de Certbot pour renouvellement automatique..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE up -d certbot
else
    # Certificats manquants - configuration initiale requise
    echo ""
    echo -e "${YELLOW}⚠️  CERTIFICATS SSL MANQUANTS${NC}"
    echo ""
    echo "Pour obtenir les certificats SSL automatiquement :"
    echo "1. Assurez-vous que les DNS pointent vers ce serveur :"
    echo "   - $BACKEND_DOMAIN"
    echo "   - $FRONTEND_DOMAIN"
    echo ""
    echo "2. Exécutez ces commandes :"
    echo ""
    echo -e "${BLUE}# Pour le backend :${NC}"
    echo "docker compose -f $COMPOSE_FILE run --rm certbot certonly \\"
    echo "  --webroot --webroot-path=/var/www/certbot \\"
    echo "  --email $EMAIL --agree-tos --no-eff-email \\"
    echo "  -d $BACKEND_DOMAIN"
    echo ""
    echo -e "${BLUE}# Pour le frontend :${NC}"
    echo "docker compose -f $COMPOSE_FILE run --rm certbot certonly \\"
    echo "  --webroot --webroot-path=/var/www/certbot \\"
    echo "  --email $EMAIL --agree-tos --no-eff-email \\"
    echo "  -d $FRONTEND_DOMAIN"
    echo ""
    echo -e "${BLUE}# Puis rechargez Nginx :${NC}"
    echo "docker compose -f $COMPOSE_FILE exec nginx nginx -s reload"
    echo "docker compose -f $COMPOSE_FILE up -d certbot"
    echo ""
    echo -e "${YELLOW}L'application démarrera en HTTP uniquement${NC}"
fi

# Vérifier que tout tourne
echo ""
echo "🔍 Vérification des conteneurs..."
if docker ps | grep -q emb-backend && docker ps | grep -q emb-frontend && docker ps | grep -q emb-nginx; then
    echo -e "${GREEN}✓ Tous les conteneurs fonctionnent${NC}"
else
    echo -e "${RED}❌ Certains conteneurs ne fonctionnent pas${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_FILE ps
    $DOCKER_COMPOSE -f $COMPOSE_FILE logs --tail=50
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║            ✅ Déploiement réussi !                    ║"
echo "║                                                       ║"
if [ "$SSL_BACKEND_EXISTS" = true ] && [ "$SSL_FRONTEND_EXISTS" = true ]; then
echo "║  🌐 Backend disponible sur :                         ║"
echo "║     https://emb_back.alicebot.me                     ║"
echo "║                                                       ║"
echo "║  🌐 Frontend disponible sur :                        ║"
echo "║     https://emb_front.alicebot.me                    ║"
echo "║     (HTTP redirigé vers HTTPS)                       ║"
else
echo "║  🌐 Backend : http://emb_back.alicebot.me            ║"
echo "║  🌐 Frontend : http://emb_front.alicebot.me          ║"
fi
echo "║                                                       ║"
echo "║  📊 Commandes utiles :                               ║"
echo "║     $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f         ║"
echo "║     $DOCKER_COMPOSE -f $COMPOSE_FILE ps              ║"
echo "║     $DOCKER_COMPOSE -f $COMPOSE_FILE restart         ║"
echo "║     $DOCKER_COMPOSE -f $COMPOSE_FILE down            ║"
echo "║                                                       ║"
echo "║  🧪 Tester :                                         ║"
if [ "$SSL_BACKEND_EXISTS" = true ] && [ "$SSL_FRONTEND_EXISTS" = true ]; then
echo "║     curl https://emb_back.alicebot.me                ║"
echo "║     curl https://emb_front.alicebot.me               ║"
else
echo "║     curl http://emb_back.alicebot.me                 ║"
echo "║     curl http://emb_front.alicebot.me                ║"
fi
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
