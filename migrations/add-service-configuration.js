const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('🚀 Début de la migration: Ajout des champs de configuration de service...');

  try {
    // Ajouter les nouveaux champs à la table exchange_pairs
    await prisma.$executeRaw`
      ALTER TABLE exchange_pairs ADD COLUMN category TEXT;
    `;
    console.log('✅ Colonne "category" ajoutée');

    await prisma.$executeRaw`
      ALTER TABLE exchange_pairs ADD COLUMN requires_additional_info INTEGER DEFAULT 0;
    `;
    console.log('✅ Colonne "requires_additional_info" ajoutée');

    await prisma.$executeRaw`
      ALTER TABLE exchange_pairs ADD COLUMN automatic_processing INTEGER DEFAULT 0;
    `;
    console.log('✅ Colonne "automatic_processing" ajoutée');

    await prisma.$executeRaw`
      ALTER TABLE exchange_pairs ADD COLUMN instruction_title TEXT;
    `;
    console.log('✅ Colonne "instruction_title" ajoutée');

    await prisma.$executeRaw`
      ALTER TABLE exchange_pairs ADD COLUMN instruction_content TEXT;
    `;
    console.log('✅ Colonne "instruction_content" ajoutée');

    await prisma.$executeRaw`
      ALTER TABLE exchange_pairs ADD COLUMN instruction_link_url TEXT;
    `;
    console.log('✅ Colonne "instruction_link_url" ajoutée');

    await prisma.$executeRaw`
      ALTER TABLE exchange_pairs ADD COLUMN instruction_link_text TEXT;
    `;
    console.log('✅ Colonne "instruction_link_text" ajoutée');

    console.log('✅ Migration terminée avec succès!');
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
