#!/bin/bash

# Script de migration Prisma
# Ce script génère le client Prisma et synchronise le schéma avec la base de données

echo "🚀 Démarrage de la migration Prisma..."
echo ""

# Génération du client Prisma
echo "📦 Génération du client Prisma..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Client Prisma généré avec succès"
    echo ""
else
    echo "❌ Erreur lors de la génération du client Prisma"
    exit 1
fi

# Push du schéma vers la base de données
echo "🔄 Synchronisation du schéma avec la base de données..."
npx prisma db push

if [ $? -eq 0 ]; then
    echo "✅ Schéma synchronisé avec succès"
    echo ""
    echo "🎉 Migration terminée avec succès!"
else
    echo "❌ Erreur lors de la synchronisation du schéma"
    exit 1
fi
