#!/bin/bash

# Script de rebuild + migration Prisma

echo "Demarrage du rebuild et migration Prisma..."
echo ""

# Installation des dépendances
echo "Installation des dependances..."
npm install

if [ $? -eq 0 ]; then
    echo "Dependances installees"
    echo ""
else
    echo "Erreur lors de l'installation des dependances"
    exit 1
fi

# Génération du client Prisma
echo "Generation du client Prisma..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "Client Prisma genere"
    echo ""
else
    echo "Erreur lors de la generation du client Prisma"
    exit 1
fi

# Push du schéma vers la base de données
echo "Synchronisation du schema avec la base de donnees..."
npx prisma db push

if [ $? -eq 0 ]; then
    echo "Schema synchronise"
    echo ""
    echo "Rebuild et migration termines avec succes!"
else
    echo "Erreur lors de la synchronisation du schema"
    exit 1
fi
