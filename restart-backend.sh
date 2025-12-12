#!/bin/bash

# Script de redémarrage complet du backend EMB
# Ce script exécute les migrations et redémarre le serveur

echo "🚀 Début du processus de redémarrage du backend..."
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Arrêter le backend actuel
echo -e "${BLUE}📛 Arrêt du backend...${NC}"
pm2 stop emb-backend 2>/dev/null || echo "Backend pas encore lancé"
echo ""

# 2. Migrations Prisma (si vous utilisez Prisma)
echo -e "${BLUE}🔄 Application des migrations Prisma...${NC}"
if [ -f "prisma/schema.prisma" ]; then
    npx prisma migrate deploy
    echo -e "${GREEN}✅ Migrations Prisma appliquées${NC}"
else
    echo -e "${YELLOW}⚠️  Pas de schema Prisma trouvé${NC}"
fi
echo ""

# 3. Migrations personnalisées
echo -e "${BLUE}🔄 Exécution des migrations personnalisées...${NC}"

# Migration des templates d'email
if [ -f "migrations/add-email-templates.js" ]; then
    echo -e "${YELLOW}📧 Migration des templates d'email...${NC}"
    node migrations/add-email-templates.js
fi

# Migration du système KYC
if [ -f "migrations/add-kyc-system.js" ]; then
    echo -e "${YELLOW}📄 Migration du système KYC...${NC}"
    node migrations/add-kyc-system.js
fi

# Migration du système de chat
if [ -f "migrations/add-chat-system.js" ]; then
    echo -e "${YELLOW}💬 Migration du système de chat...${NC}"
    node migrations/add-chat-system.js
fi

# Migration de la configuration des services
if [ -f "migrations/add-service-configuration.js" ]; then
    echo -e "${YELLOW}⚙️  Migration de la configuration...${NC}"
    node migrations/add-service-configuration.js
fi

# Migration des champs de formulaire
if [ -f "migrations/add-form-config-fields.js" ]; then
    echo -e "${YELLOW}📝 Migration des champs de formulaire...${NC}"
    node migrations/add-form-config-fields.js
fi

# Migration des templates d'email vers exchange pairs
if [ -f "migrations/add-email-templates-to-exchange-pairs.js" ]; then
    echo -e "${YELLOW}🔗 Migration templates vers exchange pairs...${NC}"
    node migrations/add-email-templates-to-exchange-pairs.js
fi

# Migration des champs de notification
if [ -f "migrations/add-notification-fields-to-templates.js" ]; then
    echo -e "${YELLOW}🔔 Migration des champs de notification...${NC}"
    node migrations/add-notification-fields-to-templates.js
fi

# Migration des messages admin
if [ -f "migrations/add-admin-message.js" ]; then
    echo -e "${YELLOW}💼 Migration des messages admin...${NC}"
    node migrations/add-admin-message.js
fi

echo ""
echo -e "${GREEN}✅ Toutes les migrations ont été exécutées${NC}"
echo ""

# 4. Installation des dépendances si nécessaire
echo -e "${BLUE}📦 Vérification des dépendances...${NC}"
if [ -f "package.json" ]; then
    npm install --production
    echo -e "${GREEN}✅ Dépendances installées${NC}"
fi
echo ""

# 5. Redémarrage du backend
echo -e "${BLUE}🚀 Redémarrage du backend...${NC}"
pm2 start server.js --name emb-backend
echo ""

# 6. Sauvegarde de la configuration PM2
echo -e "${BLUE}💾 Sauvegarde de la configuration PM2...${NC}"
pm2 save
echo ""

# 7. Affichage du statut
echo -e "${GREEN}✅ Backend redémarré avec succès !${NC}"
echo ""
pm2 list
echo ""

# 8. Affichage des logs en temps réel
echo -e "${BLUE}📋 Logs du backend (Ctrl+C pour quitter):${NC}"
echo ""
sleep 2
pm2 logs emb-backend --lines 30
