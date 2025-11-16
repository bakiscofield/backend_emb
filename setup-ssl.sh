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

# Fonction pour vérifier si un certificat est valide (expire dans plus de 30 jours)
check_cert_validity() {
    local domain=$1
    local cert_file="certbot/conf/live/$domain/fullchain.pem"

    if [ ! -f "$cert_file" ]; then
        return 1  # Certificat n'existe pas
    fi

    # Vérifier la date d'expiration
    local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" 2>/dev/null | cut -d= -f2)

    if [ -z "$expiry_date" ]; then
        return 1  # Impossible de lire le certificat
    fi

    local expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$expiry_date" +%s 2>/dev/null)
    local now_epoch=$(date +%s)
    local days_left=$(( ($expiry_epoch - $now_epoch) / 86400 ))

    if [ $days_left -gt 30 ]; then
        echo "$days_left"
        return 0  # Certificat valide
    else
        return 1  # Certificat expire bientôt
    fi
}

echo "📋 Vérification des prérequis..."
echo ""

# Vérifier que Nginx tourne
if ! docker ps | grep -q emb-nginx; then
    echo -e "${RED}❌ Nginx n'est pas démarré${NC}"
    echo "Lancez d'abord: ./deploy.sh"
    exit 1
fi

echo -e "${GREEN}✓ Nginx en cours d'exécution${NC}"

# Vérifier les certificats
echo ""
echo "🔍 Vérification des certificats SSL..."

NEED_BACKEND_CERT=false
NEED_FRONTEND_CERT=false

# Vérifier certificat backend
if days_left=$(check_cert_validity "$BACKEND_DOMAIN"); then
    echo -e "${GREEN}✓ Certificat backend valide (expire dans $days_left jours)${NC}"
else
    echo -e "${YELLOW}⚠️  Certificat backend absent ou expire bientôt${NC}"
    NEED_BACKEND_CERT=true
fi

# Vérifier certificat frontend
if days_left=$(check_cert_validity "$FRONTEND_DOMAIN"); then
    echo -e "${GREEN}✓ Certificat frontend valide (expire dans $days_left jours)${NC}"
else
    echo -e "${YELLOW}⚠️  Certificat frontend absent ou expire bientôt${NC}"
    NEED_FRONTEND_CERT=true
fi

# Si tous les certificats sont valides, skip Certbot
if [ "$NEED_BACKEND_CERT" = false ] && [ "$NEED_FRONTEND_CERT" = false ]; then
    echo ""
    echo -e "${GREEN}✓ Tous les certificats sont valides${NC}"
    echo "Passage directement à l'activation HTTPS..."
else
    # Obtenir ou renouveler les certificats nécessaires
    echo ""
    echo -e "${BLUE}Obtention/renouvellement des certificats...${NC}"

    if [ "$NEED_BACKEND_CERT" = true ]; then
        echo ""
        echo "🔒 Certificat pour $BACKEND_DOMAIN..."
        $DOCKER_COMPOSE -f $COMPOSE_FILE run --rm certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email $EMAIL \
            --agree-tos \
            --no-eff-email \
            --force-renewal \
            -d $BACKEND_DOMAIN

        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Échec pour $BACKEND_DOMAIN${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ Certificat backend obtenu${NC}"
    fi

    if [ "$NEED_FRONTEND_CERT" = true ]; then
        echo ""
        echo "🔒 Certificat pour $FRONTEND_DOMAIN..."
        $DOCKER_COMPOSE -f $COMPOSE_FILE run --rm certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email $EMAIL \
            --agree-tos \
            --no-eff-email \
            --force-renewal \
            -d $FRONTEND_DOMAIN

        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Échec pour $FRONTEND_DOMAIN${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ Certificat frontend obtenu${NC}"
    fi
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
