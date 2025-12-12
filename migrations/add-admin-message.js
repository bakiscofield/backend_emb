const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('🚀 Ajout du champ admin_message à la table transactions...');

  try {
    await prisma.$executeRaw`
      ALTER TABLE transactions ADD COLUMN admin_message TEXT;
    `;
    console.log('✅ Colonne "admin_message" ajoutée avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
