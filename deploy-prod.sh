#!/bin/bash

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║    🚀 Déploiement EMB Backend (Production + SSL)     ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Détecter Docker Compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose: $DOCKER_COMPOSE${NC}"

# Vérifier .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Fichier .env non trouvé${NC}"
    if [ -f .env.production.ready ]; then
        echo "Copie de .env.production.ready vers .env..."
        cp .env.production.ready .env
    else
        echo -e "${RED}❌ Aucun fichier .env trouvé${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Fichier .env trouvé${NC}"
echo ""

# Vérifier si SSL existe déjà
if [ -d "certbot/conf/live/emb_back.alicebot.me" ]; then
    echo -e "${GREEN}✓ Certificat SSL déjà présent${NC}"
    SSL_EXISTS=true
else
    echo -e "${YELLOW}⚠️  Aucun certificat SSL trouvé${NC}"
    echo "Vous devez d'abord exécuter: ./init-ssl.sh"
    read -p "Voulez-vous l'exécuter maintenant? (o/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        chmod +x init-ssl.sh
        ./init-ssl.sh
        exit 0
    else
        echo "Déploiement sans SSL..."
        SSL_EXISTS=false
    fi
fi

echo ""
echo "🛑 Arrêt des conteneurs existants..."
$DOCKER_COMPOSE -f docker-compose.prod.yml down

echo ""
echo "🔨 Construction de l'image backend..."
$DOCKER_COMPOSE -f docker-compose.prod.yml build emb-backend

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de la construction${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Image construite${NC}"
echo ""

echo "🚀 Démarrage des conteneurs..."
$DOCKER_COMPOSE -f docker-compose.prod.yml up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors du démarrage${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Conteneurs démarrés${NC}"
echo ""

echo "⏳ Attente du démarrage (10 secondes)..."
sleep 10

# Vérifier les conteneurs
if docker ps | grep -q emb-backend && docker ps | grep -q emb-nginx; then
    echo -e "${GREEN}✓ Tous les conteneurs sont en cours d'exécution${NC}"
else
    echo -e "${RED}❌ Certains conteneurs ne sont pas démarrés${NC}"
    echo "Logs:"
    $DOCKER_COMPOSE -f docker-compose.prod.yml logs --tail=50
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║         ✅ Déploiement réussi !                       ║"
echo "║                                                       ║"
echo "║  🌐 Backend disponible sur :                         ║"
if [ "$SSL_EXISTS" = true ]; then
echo "║     https://emb_back.alicebot.me                     ║"
else
echo "║     http://emb_back.alicebot.me                      ║"
fi
echo "║                                                       ║"
echo "║  📊 Commandes utiles :                               ║"
echo "║     $DOCKER_COMPOSE -f docker-compose.prod.yml logs -f${NC}"
echo "║     $DOCKER_COMPOSE -f docker-compose.prod.yml ps${NC}"
echo "║     $DOCKER_COMPOSE -f docker-compose.prod.yml restart${NC}"
echo "║     $DOCKER_COMPOSE -f docker-compose.prod.yml down${NC}"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
