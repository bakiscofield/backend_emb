#!/bin/bash

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║   🔧 Configuration Nginx Système pour EMB            ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Ce script doit être exécuté en tant que root${NC}"
    echo "Utilisez: sudo ./setup-nginx-system.sh"
    exit 1
fi

echo "📋 Étape 1: Installation de Nginx et Certbot..."
echo ""

# Installer Nginx et Certbot
apt update
apt install -y nginx certbot python3-certbot-nginx

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de l'installation${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Nginx et Certbot installés${NC}"

# Créer le dossier pour ACME challenge
mkdir -p /var/www/certbot

echo ""
echo "📋 Étape 2: Configuration de Nginx..."
echo ""

# Copier la configuration
cp nginx-system.conf /etc/nginx/sites-available/emb

# Créer le lien symbolique
ln -sf /etc/nginx/sites-available/emb /etc/nginx/sites-enabled/

# Supprimer la config par défaut si elle existe
rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
nginx -t

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur de configuration Nginx${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Configuration Nginx OK${NC}"

echo ""
echo "📋 Étape 3: Obtention des certificats SSL..."
echo ""

# Créer le dossier webroot
mkdir -p /var/www/certbot

# Redémarrer Nginx
systemctl restart nginx

# Obtenir certificat backend avec webroot (évite bug --nginx)
echo "🔒 Certificat pour emb_back.alicebot.me..."
certbot certonly --webroot -w /var/www/certbot \
    -d emb_back.alicebot.me \
    --email admin@alicebot.me \
    --agree-tos \
    --non-interactive

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Certificat backend obtenu${NC}"
else
    echo -e "${YELLOW}⚠️  Échec pour emb_back.alicebot.me${NC}"
fi

# Obtenir certificat frontend
echo ""
echo "🔒 Certificat pour emb_front.alicebot.me..."
certbot certonly --webroot -w /var/www/certbot \
    -d emb_front.alicebot.me \
    --email admin@alicebot.me \
    --agree-tos \
    --non-interactive

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Certificat frontend obtenu${NC}"
else
    echo -e "${YELLOW}⚠️  Échec pour emb_front.alicebot.me${NC}"
fi

echo ""
echo "📋 Étape 4: Configuration du renouvellement automatique..."
echo ""

# Ajouter un cron job pour le renouvellement
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -

echo -e "${GREEN}✓ Renouvellement automatique configuré (tous les jours à 3h)${NC}"

# Redémarrer Nginx
systemctl restart nginx
systemctl enable nginx

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║            ✅ Configuration terminée !                ║"
echo "║                                                       ║"
echo "║  🌐 Backend : https://emb_back.alicebot.me           ║"
echo "║  🌐 Frontend : https://emb_front.alicebot.me         ║"
echo "║                                                       ║"
echo "║  📊 Commandes utiles :                               ║"
echo "║     sudo systemctl status nginx                      ║"
echo "║     sudo systemctl restart nginx                     ║"
echo "║     sudo certbot renew                               ║"
echo "║     sudo nginx -t                                    ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
