const db = require('../config/database');

async function migrate() {
  try {
    console.log('🔄 Début de la migration...');

    // Vérifier si les colonnes existent déjà
    const tableInfo = await db.all("PRAGMA table_info(transactions)");
    const columns = tableInfo.map(col => col.name);

    // Ajouter exchange_pair_id si elle n'existe pas
    if (!columns.includes('exchange_pair_id')) {
      await db.run(`
        ALTER TABLE transactions
        ADD COLUMN exchange_pair_id INTEGER REFERENCES exchange_pairs(id)
      `);
      console.log('✓ Colonne exchange_pair_id ajoutée');
    } else {
      console.log('→ Colonne exchange_pair_id déjà existante');
    }

    // Ajouter dynamic_fields si elle n'existe pas
    if (!columns.includes('dynamic_fields')) {
      await db.run(`
        ALTER TABLE transactions
        ADD COLUMN dynamic_fields TEXT
      `);
      console.log('✓ Colonne dynamic_fields ajoutée');
    } else {
      console.log('→ Colonne dynamic_fields déjà existante');
    }

    // Ajouter tax_amount si elle n'existe pas
    if (!columns.includes('tax_amount')) {
      await db.run(`
        ALTER TABLE transactions
        ADD COLUMN tax_amount REAL DEFAULT 0
      `);
      console.log('✓ Colonne tax_amount ajoutée');
    } else {
      console.log('→ Colonne tax_amount déjà existante');
    }

    // Rendre tmoney_number et flooz_number optionnels (ne peut pas modifier directement avec SQLite)
    // On doit juste accepter NULL lors de l'insertion

    console.log('✅ Migration terminée avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

migrate();
