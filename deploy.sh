#!/bin/bash

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║      🚀 Déploiement EMB Backend sur VPS              ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Détecter la commande Docker Compose
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
echo -e "${GREEN}✓ Docker Compose installé ($DOCKER_COMPOSE)${NC}"

# Vérifier que le fichier .env existe
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Fichier .env non trouvé${NC}"
    if [ -f .env.example ]; then
        echo "Création du fichier .env à partir de .env.example..."
        cp .env.example .env
        echo -e "${YELLOW}⚠️  IMPORTANT: Modifiez le fichier .env avant de continuer !${NC}"
        echo -e "${YELLOW}   Notamment JWT_SECRET et FRONTEND_URL${NC}"
        exit 1
    else
        echo -e "${RED}❌ Aucun fichier .env ou .env.example trouvé${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Fichier .env trouvé${NC}"
echo ""

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
$DOCKER_COMPOSE down 2>/dev/null

# Construire l'image
echo ""
echo "🔨 Construction de l'image Docker..."
$DOCKER_COMPOSE build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de la construction de l'image${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Image construite avec succès${NC}"
echo ""

# Démarrer les conteneurs
echo "🚀 Démarrage des conteneurs..."
$DOCKER_COMPOSE up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors du démarrage des conteneurs${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Conteneurs démarrés${NC}"
echo ""

# Attendre que le serveur démarre
echo "⏳ Attente du démarrage du serveur..."
sleep 5

# Vérifier que le conteneur est en cours d'exécution
if docker ps | grep -q emb-backend; then
    echo -e "${GREEN}✓ Conteneur emb-backend en cours d'exécution${NC}"
else
    echo -e "${RED}❌ Le conteneur emb-backend n'est pas en cours d'exécution${NC}"
    echo "Logs du conteneur :"
    $DOCKER_COMPOSE logs emb-backend
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║            ✅ Déploiement réussi !                    ║"
echo "║                                                       ║"
echo "║  🌐 Backend disponible sur :                         ║"
echo "║     http://localhost:5005                            ║"
echo "║     https://emb_back.alicebot.me (avec nginx)        ║"
echo "║                                                       ║"
echo "║  📊 Commandes utiles :                               ║"
echo "║     $DOCKER_COMPOSE logs -f         # Voir les logs  ║"
echo "║     $DOCKER_COMPOSE ps              # Statut         ║"
echo "║     $DOCKER_COMPOSE restart         # Redémarrer     ║"
echo "║     $DOCKER_COMPOSE down            # Arrêter        ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
