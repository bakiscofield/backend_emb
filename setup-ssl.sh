#!/bin/bash

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║   🔒 Configuration SSL pour EMB (Backend + Frontend) ║"
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

echo "📋 Vérification des prérequis..."
echo ""

# Vérifier que Nginx tourne
if ! docker ps | grep -q emb-nginx; then
    echo -e "${RED}❌ Nginx n'est pas démarré${NC}"
    echo "Lancez d'abord: ./deploy.sh"
    exit 1
fi

echo -e "${GREEN}✓ Nginx en cours d'exécution${NC}"

# Vérifier les DNS
echo ""
echo "🔍 Vérification DNS..."
BACKEND_IP=$(dig +short $BACKEND_DOMAIN | tail -n1)
FRONTEND_IP=$(dig +short $FRONTEND_DOMAIN | tail -n1)
SERVER_IP=$(curl -s ifconfig.me)

echo "   $BACKEND_DOMAIN → $BACKEND_IP"
echo "   $FRONTEND_DOMAIN → $FRONTEND_IP"
echo "   Serveur → $SERVER_IP"

if [ "$BACKEND_IP" != "$SERVER_IP" ] || [ "$FRONTEND_IP" != "$SERVER_IP" ]; then
    echo -e "${YELLOW}⚠️  ATTENTION: Les DNS ne pointent pas vers ce serveur${NC}"
    echo "   Certbot risque d'échouer."
    read -p "Continuer quand même ? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Vérifier si les certificats existent déjà
BACKEND_CERT_EXISTS=false
FRONTEND_CERT_EXISTS=false

if [ -f "certbot/conf/live/$BACKEND_DOMAIN/fullchain.pem" ]; then
    BACKEND_CERT_EXISTS=true
fi

if [ -f "certbot/conf/live/$FRONTEND_DOMAIN/fullchain.pem" ]; then
    FRONTEND_CERT_EXISTS=true
fi

# Obtenir certificat backend
echo ""
if [ "$BACKEND_CERT_EXISTS" = true ]; then
    echo -e "${GREEN}✓ Certificat backend déjà présent pour $BACKEND_DOMAIN${NC}"
else
    echo "🔒 Obtention du certificat pour $BACKEND_DOMAIN..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        -d $BACKEND_DOMAIN

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Échec pour $BACKEND_DOMAIN${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Certificat backend obtenu${NC}"
fi

# Obtenir certificat frontend
echo ""
if [ "$FRONTEND_CERT_EXISTS" = true ]; then
    echo -e "${GREEN}✓ Certificat frontend déjà présent pour $FRONTEND_DOMAIN${NC}"
else
    echo "🔒 Obtention du certificat pour $FRONTEND_DOMAIN..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        -d $FRONTEND_DOMAIN

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Échec pour $FRONTEND_DOMAIN${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Certificat frontend obtenu${NC}"
fi

# Activer la configuration SSL
echo ""
echo "🔧 Activation de la configuration SSL..."

# Supprimer config HTTP
rm -f nginx/conf.d/emb-http-only.conf

# Restaurer config HTTPS
if [ -f "nginx/conf.d/emb-unified.conf.disabled" ]; then
    mv nginx/conf.d/emb-unified.conf.disabled nginx/conf.d/emb-unified.conf
fi

# Recharger Nginx
echo "🔄 Rechargement de Nginx..."
$DOCKER_COMPOSE -f $COMPOSE_FILE exec nginx nginx -s reload

# Démarrer Certbot
$DOCKER_COMPOSE -f $COMPOSE_FILE up -d certbot

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║            ✅ SSL configuré avec succès !             ║"
echo "║                                                       ║"
echo "║  🌐 Backend : https://emb_back.alicebot.me           ║"
echo "║  🌐 Frontend : https://emb_front.alicebot.me         ║"
echo "║                                                       ║"
echo "║  Les certificats se renouvellent automatiquement     ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
