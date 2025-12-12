const prisma = require('../config/prisma');

async function migrate() {
  console.log('🚀 Début de la migration: ajout des champs de configuration du formulaire...');

  try {
    // Vérifier si les colonnes existent déjà
    const checkColumn = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM pragma_table_info('exchange_pairs')
      WHERE name = 'from_number_label'
    `;

    if (checkColumn[0].count > 0) {
      console.log('✅ Les colonnes existent déjà, migration ignorée.');
      return;
    }

    // Ajouter les nouvelles colonnes
    await prisma.$executeRaw`ALTER TABLE exchange_pairs ADD COLUMN from_number_label TEXT DEFAULT NULL`;
    console.log('✅ Colonne from_number_label ajoutée');

    await prisma.$executeRaw`ALTER TABLE exchange_pairs ADD COLUMN from_number_placeholder TEXT DEFAULT NULL`;
    console.log('✅ Colonne from_number_placeholder ajoutée');

    await prisma.$executeRaw`ALTER TABLE exchange_pairs ADD COLUMN to_number_label TEXT DEFAULT NULL`;
    console.log('✅ Colonne to_number_label ajoutée');

    await prisma.$executeRaw`ALTER TABLE exchange_pairs ADD COLUMN to_number_placeholder TEXT DEFAULT NULL`;
    console.log('✅ Colonne to_number_placeholder ajoutée');

    await prisma.$executeRaw`ALTER TABLE exchange_pairs ADD COLUMN show_to_number INTEGER DEFAULT 1`;
    console.log('✅ Colonne show_to_number ajoutée');

    await prisma.$executeRaw`ALTER TABLE exchange_pairs ADD COLUMN amount_label TEXT DEFAULT 'Montant'`;
    console.log('✅ Colonne amount_label ajoutée');

    await prisma.$executeRaw`ALTER TABLE exchange_pairs ADD COLUMN amount_placeholder TEXT DEFAULT NULL`;
    console.log('✅ Colonne amount_placeholder ajoutée');

    await prisma.$executeRaw`ALTER TABLE exchange_pairs ADD COLUMN reference_required INTEGER DEFAULT 1`;
    console.log('✅ Colonne reference_required ajoutée');

    await prisma.$executeRaw`ALTER TABLE exchange_pairs ADD COLUMN reference_label TEXT DEFAULT 'Référence de paiement'`;
    console.log('✅ Colonne reference_label ajoutée');

    await prisma.$executeRaw`ALTER TABLE exchange_pairs ADD COLUMN reference_placeholder TEXT DEFAULT NULL`;
    console.log('✅ Colonne reference_placeholder ajoutée');

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
