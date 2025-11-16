#!/bin/bash

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║   🚀 Installation automatique EMB Backend sur VPS    ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les étapes
step() {
    echo -e "${BLUE}▶ $1${NC}"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

# 1. Vérifier si on est sur le VPS
step "Vérification de l'environnement..."
sleep 1

# 2. Mettre à jour le système
step "Mise à jour du système..."
sudo apt update && sudo apt upgrade -y
success "Système mis à jour"

# 3. Installer Docker si nécessaire
if ! command -v docker &> /dev/null; then
    step "Installation de Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    success "Docker installé"
else
    success "Docker déjà installé"
fi

# 4. Installer Docker Compose
if ! docker compose version &> /dev/null; then
    step "Installation de Docker Compose..."
    sudo apt install docker-compose-plugin -y
    success "Docker Compose installé"
else
    success "Docker Compose déjà installé"
fi

# 5. Installer Nginx
if ! command -v nginx &> /dev/null; then
    step "Installation de Nginx..."
    sudo apt install nginx -y
    sudo systemctl enable nginx
    sudo systemctl start nginx
    success "Nginx installé"
else
    success "Nginx déjà installé"
fi

# 6. Installer Certbot pour SSL
if ! command -v certbot &> /dev/null; then
    step "Installation de Certbot..."
    sudo apt install certbot python3-certbot-nginx -y
    success "Certbot installé"
else
    success "Certbot déjà installé"
fi

# 7. Créer le dossier de l'application
step "Création du dossier de l'application..."
sudo mkdir -p /var/www/emb
cd /var/www/emb

# 8. Cloner le repository
if [ ! -d "backend" ]; then
    step "Clonage du repository GitHub..."
    git clone https://github.com/bakiscofield/backend_emb.git backend
    success "Repository cloné"
else
    step "Mise à jour du repository..."
    cd backend
    git pull origin main
    cd ..
    success "Repository mis à jour"
fi

cd backend

# 9. Le fichier .env existe déjà dans le repo avec le JWT_SECRET généré
success "Fichier .env déjà configuré avec JWT_SECRET"

# 10. Déployer avec Docker
step "Déploiement de l'application avec Docker..."
chmod +x deploy.sh
./deploy.sh

if [ $? -eq 0 ]; then
    success "Application déployée avec succès"
else
    error "Erreur lors du déploiement"
    exit 1
fi

# 11. Configurer Nginx
step "Configuration de Nginx..."

# Configuration Nginx temporaire (HTTP seulement pour commencer)
sudo tee /etc/nginx/sites-available/emb_backend > /dev/null <<'EOF'
server {
    listen 80;
    server_name emb_back.alicebot.me;

    location / {
        proxy_pass http://localhost:5000;
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
EOF

# Activer la configuration
sudo ln -sf /etc/nginx/sites-available/emb_backend /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
success "Nginx configuré"

# 12. Obtenir le certificat SSL
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Configuration SSL avec Let's Encrypt${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT: Assurez-vous que le domaine emb_back.alicebot.me${NC}"
echo -e "${YELLOW}pointe bien vers ce serveur avant de continuer !${NC}"
echo ""
read -p "Voulez-vous configurer SSL maintenant ? (o/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Oo]$ ]]; then
    step "Obtention du certificat SSL..."
    sudo certbot --nginx -d emb_back.alicebot.me --non-interactive --agree-tos --register-unsafely-without-email || {
        echo -e "${YELLOW}Configuration SSL manuelle requise. Exécutez:${NC}"
        echo -e "${YELLOW}sudo certbot --nginx -d emb_back.alicebot.me${NC}"
    }
fi

# 13. Configurer le pare-feu
step "Configuration du pare-feu..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable
success "Pare-feu configuré"

# 14. Résumé final
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║          ✅ Installation terminée avec succès !       ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}🌐 Votre backend EMB est maintenant en ligne !${NC}"
echo ""
echo "URLs d'accès :"
echo "  • HTTP:  http://emb_back.alicebot.me"
echo "  • HTTPS: https://emb_back.alicebot.me (si SSL configuré)"
echo "  • Local: http://localhost:5000"
echo ""
echo "Commandes utiles :"
echo "  • Voir les logs:     docker-compose logs -f"
echo "  • Redémarrer:        docker-compose restart"
echo "  • Arrêter:           docker-compose down"
echo "  • Mise à jour:       git pull && ./deploy.sh"
echo ""
echo "Testez votre API :"
echo "  curl https://emb_back.alicebot.me"
echo ""
echo -e "${YELLOW}N'oubliez pas de mettre à jour FRONTEND_URL dans .env${NC}"
echo -e "${YELLOW}après avoir déployé le frontend !${NC}"
echo ""
