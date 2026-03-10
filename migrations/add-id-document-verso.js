const prisma = require('../config/prisma');

async function migrate() {
  console.log('🚀 Début de la migration: ajout du champ id_document_verso pour les paires money_transfer...');

  try {
    // Récupérer toutes les paires de type money_transfer
    const moneyTransferPairs = await prisma.exchange_pairs.findMany({
      where: { category: 'money_transfer' },
      select: { id: true }
    });

    if (moneyTransferPairs.length === 0) {
      console.log('⚠️ Aucune paire money_transfer trouvée.');
      return;
    }

    for (const pair of moneyTransferPairs) {
      // Vérifier si le champ existe déjà
      const existing = await prisma.exchange_fields.findFirst({
        where: {
          exchange_pair_id: pair.id,
          field_name: 'id_document_verso'
        }
      });

      if (existing) {
        console.log(`✅ Champ id_document_verso existe déjà pour la paire ${pair.id}, ignoré.`);
        continue;
      }

      // Mettre à jour le label du champ id_document existant (recto)
      await prisma.exchange_fields.updateMany({
        where: {
          exchange_pair_id: pair.id,
          field_name: 'id_document'
        },
        data: {
          field_label: 'Pièce d\'identité - Recto (JPG, PNG, PDF - max 5MB)'
        }
      });

      // Récupérer le field_order du champ id_document pour insérer le verso juste après
      const idDocField = await prisma.exchange_fields.findFirst({
        where: {
          exchange_pair_id: pair.id,
          field_name: 'id_document'
        },
        select: { field_order: true }
      });

      const versoOrder = (idDocField?.field_order || 18) + 1;

      // Décaler les champs suivants
      await prisma.$executeRawUnsafe(
        `UPDATE exchange_fields SET field_order = field_order + 1 WHERE exchange_pair_id = ${pair.id} AND field_order >= ${versoOrder}`
      );

      // Créer le champ verso
      await prisma.exchange_fields.create({
        data: {
          exchange_pair_id: pair.id,
          field_name: 'id_document_verso',
          field_type: 'file',
          field_label: 'Pièce d\'identité - Verso (JPG, PNG, PDF - max 5MB)',
          placeholder: '',
          is_required: true,
          field_order: versoOrder
        }
      });

      console.log(`✅ Champ id_document_verso ajouté pour la paire ${pair.id}`);
    }

    console.log('✅ Migration terminée avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
