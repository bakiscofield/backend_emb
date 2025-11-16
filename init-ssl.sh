#!/bin/bash

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║       🔒 Initialisation SSL pour EMB Backend         ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

DOMAIN="emb_back.alicebot.me"
EMAIL="admin@alicebot.me"  # Changez avec votre email

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Créer les dossiers nécessaires
mkdir -p certbot/conf certbot/www

# Vérifier que Docker Compose est disponible
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "   Domaine: $DOMAIN"
echo "   Email: $EMAIL"
echo ""

# Créer une configuration Nginx temporaire (sans SSL)
echo "🔧 Création de la configuration Nginx temporaire..."
cat > nginx/conf.d/emb.conf.tmp <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://emb-backend:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Sauvegarder la config SSL finale
cp nginx/conf.d/emb.conf nginx/conf.d/emb.conf.ssl
# Utiliser la config temp
cp nginx/conf.d/emb.conf.tmp nginx/conf.d/emb.conf

echo "🚀 Démarrage des conteneurs..."
$DOCKER_COMPOSE -f docker-compose.prod.yml up -d emb-backend nginx

echo "⏳ Attente du démarrage de Nginx (10 secondes)..."
sleep 10

echo "🔒 Obtention du certificat SSL..."
$DOCKER_COMPOSE -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Certificat SSL obtenu avec succès !${NC}"

    # Restaurer la config SSL complète
    cp nginx/conf.d/emb.conf.ssl nginx/conf.d/emb.conf

    # Redémarrer Nginx avec la config SSL
    echo "🔄 Rechargement de Nginx avec SSL..."
    $DOCKER_COMPOSE -f docker-compose.prod.yml exec nginx nginx -s reload

    # Démarrer Certbot en mode renouvellement automatique
    $DOCKER_COMPOSE -f docker-compose.prod.yml up -d certbot

    echo ""
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║                                                       ║"
    echo "║          ✅ SSL configuré avec succès !               ║"
    echo "║                                                       ║"
    echo "║  🌐 Votre API est maintenant accessible sur :        ║"
    echo "║     https://$DOMAIN                    ║"
    echo "║                                                       ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo ""
else
    echo "❌ Erreur lors de l'obtention du certificat SSL"
    echo "Vérifiez que:"
    echo "  1. Le domaine $DOMAIN pointe bien vers ce serveur"
    echo "  2. Les ports 80 et 443 sont ouverts"
    echo "  3. Aucun autre service n'utilise les ports 80/443"
    exit 1
fi
