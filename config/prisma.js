const { PrismaClient } = require('@prisma/client');

// Pour Prisma 7+ avec SQLite local, utiliser directement le PrismaClient
// L'URL de la base de données est configurée dans le fichier .env et prisma.config.ts

// Créer une instance unique du client Prisma (singleton)
const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Gérer la fermeture propre de la connexion
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
