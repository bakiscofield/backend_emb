const db = require('../config/database');

async function migrateTransactions() {
  try {
    console.log('🔧 Migration de la table transactions...\n');

    // Attendre que la base de données soit prête
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Vérifier si les colonnes existent déjà
    const tableInfo = await db.all('PRAGMA table_info(transactions)');
    const columns = tableInfo.map(col => col.name);

    if (!columns.includes('from_number')) {
      console.log('Ajout de la colonne from_number...');
      await db.run('ALTER TABLE transactions ADD COLUMN from_number TEXT');
      console.log('✓ Colonne from_number ajoutée');
    } else {
      console.log('✓ Colonne from_number existe déjà');
    }

    if (!columns.includes('to_number')) {
      console.log('Ajout de la colonne to_number...');
      await db.run('ALTER TABLE transactions ADD COLUMN to_number TEXT');
      console.log('✓ Colonne to_number ajoutée');
    } else {
      console.log('✓ Colonne to_number existe déjà');
    }

    if (!columns.includes('exchange_pair_id')) {
      console.log('Ajout de la colonne exchange_pair_id...');
      await db.run('ALTER TABLE transactions ADD COLUMN exchange_pair_id INTEGER');
      console.log('✓ Colonne exchange_pair_id ajoutée');
    } else {
      console.log('✓ Colonne exchange_pair_id existe déjà');
    }

    if (!columns.includes('dynamic_fields')) {
      console.log('Ajout de la colonne dynamic_fields...');
      await db.run('ALTER TABLE transactions ADD COLUMN dynamic_fields TEXT');
      console.log('✓ Colonne dynamic_fields ajoutée');
    } else {
      console.log('✓ Colonne dynamic_fields existe déjà');
    }

    if (!columns.includes('tax_amount')) {
      console.log('Ajout de la colonne tax_amount...');
      await db.run('ALTER TABLE transactions ADD COLUMN tax_amount REAL DEFAULT 0');
      console.log('✓ Colonne tax_amount ajoutée');
    } else {
      console.log('✓ Colonne tax_amount existe déjà');
    }

    console.log('\n✅ Migration terminée avec succès!\n');

    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

migrateTransactions();
