#!/bin/bash
set -e

echo "=== Mise à jour Backend EMB ==="

cd "$(dirname "$0")"

echo ">> Git pull..."
git pull origin main

echo ">> Installation des dépendances..."
npm install

echo ">> Application des migrations..."
for migration in migrations/*.js; do
  if [ -f "$migration" ]; then
    echo "   -> $(basename $migration)"
    node "$migration" || echo "   ⚠ Migration $(basename $migration) déjà appliquée ou erreur ignorée"
  fi
done

echo ">> Synchronisation Prisma avec la base de données..."
npx prisma db pull
npx prisma generate

echo ">> Redémarrage PM2 (emb-backend)..."
pm2 restart emb-backend

echo "=== Backend mis à jour avec succès ==="
