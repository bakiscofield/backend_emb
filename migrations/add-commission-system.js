const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'emb.db');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Démarrage de la migration - Système de commissions admin...\n');

db.serialize(() => {
  // 1. Ajouter la colonne commission_balance à la table admins
  console.log('📝 Ajout de la colonne commission_balance à admins...');
  db.run(`ALTER TABLE admins ADD COLUMN commission_balance REAL DEFAULT 0`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column')) {
        console.log('  ⚠ Colonne commission_balance existe déjà');
      } else {
        console.error('  ❌ Erreur:', err.message);
      }
    } else {
      console.log('  ✓ Colonne commission_balance ajoutée');
    }
  });

  // 2. Créer la table commission_ledger
  console.log('\n📝 Création de la table commission_ledger...');
  db.run(`
    CREATE TABLE IF NOT EXISTS commission_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      transaction_id INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Erreur commission_ledger:', err.message);
    else console.log('✓ Table commission_ledger créée');
  });

  // 3. Créer les index
  console.log('\n📝 Création des index...');
  db.run(`CREATE INDEX IF NOT EXISTS idx_commission_ledger_admin ON commission_ledger(admin_id)`, (err) => {
    if (!err) console.log('  ✓ Index idx_commission_ledger_admin créé');
  });
  db.run(`CREATE INDEX IF NOT EXISTS idx_commission_ledger_type ON commission_ledger(type)`, (err) => {
    if (!err) console.log('  ✓ Index idx_commission_ledger_type créé');
  });
  db.run(`CREATE INDEX IF NOT EXISTS idx_commission_ledger_created ON commission_ledger(created_at)`, (err) => {
    if (!err) console.log('  ✓ Index idx_commission_ledger_created créé');
  });

  // 4. Ajouter les permissions
  console.log('\n📝 Insertion des permissions commissions...');
  const newPermissions = [
    ['VIEW_COMMISSIONS', 'Voir les commissions', 'Consulter son solde et historique de commissions', 'COMMISSIONS'],
    ['MANAGE_COMMISSIONS', 'Gérer les commissions', 'Voir les commissions de tous les admins', 'COMMISSIONS']
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO permissions (code, name, description, category)
    VALUES (?, ?, ?, ?)
  `);

  newPermissions.forEach(([code, name, description, category]) => {
    stmt.run(code, name, description, category);
  });

  stmt.finalize(() => {
    console.log(`✓ ${newPermissions.length} permissions commissions insérées`);
  });

  // 5. Donner les permissions VIEW_COMMISSIONS à tous les admins existants
  console.log('\n📝 Attribution des permissions commissions aux admins existants...');
  db.run(`
    INSERT OR IGNORE INTO admin_permissions (admin_id, permission_id)
    SELECT a.id, p.id
    FROM admins a
    CROSS JOIN permissions p
    WHERE p.code IN ('VIEW_COMMISSIONS', 'MANAGE_COMMISSIONS')
  `, (err) => {
    if (err) {
      console.error('❌ Erreur attribution permissions:', err.message);
    } else {
      console.log('✓ Permissions commissions attribuées aux admins existants');
    }
  });

  // 6. Backfill : créditer les commissions des transactions déjà validées
  console.log('\n📝 Backfill des commissions pour les transactions validées...');
  db.all(`
    SELECT t.id, t.validated_by, t.amount, t.total_amount, t.transaction_id
    FROM transactions t
    WHERE t.status = 'validated'
    AND t.validated_by IS NOT NULL
    AND t.total_amount > t.amount
    AND NOT EXISTS (
      SELECT 1 FROM commission_ledger cl
      WHERE cl.transaction_id = t.id AND cl.type = 'credit'
    )
  `, [], (err, rows) => {
    if (err) {
      console.error('❌ Erreur lors de la lecture des transactions:', err.message);
      return;
    }

    if (!rows || rows.length === 0) {
      console.log('  ℹ Aucune transaction à backfill');
      return;
    }

    console.log(`  📊 ${rows.length} transactions à backfill...`);

    // Accumuler les commissions par admin
    const adminCommissions = {};
    rows.forEach(row => {
      const commission = row.total_amount - row.amount;
      if (commission > 0) {
        if (!adminCommissions[row.validated_by]) {
          adminCommissions[row.validated_by] = { total: 0, transactions: [] };
        }
        adminCommissions[row.validated_by].total += commission;
        adminCommissions[row.validated_by].transactions.push({
          id: row.id,
          commission,
          transaction_id: row.transaction_id
        });
      }
    });

    // Pour chaque admin, mettre à jour le solde et créer les entrées ledger
    const adminIds = Object.keys(adminCommissions);
    let processed = 0;

    adminIds.forEach(adminId => {
      const data = adminCommissions[adminId];

      // Mettre à jour le solde de l'admin
      db.run(`UPDATE admins SET commission_balance = ? WHERE id = ?`, [data.total, parseInt(adminId)], (err) => {
        if (err) {
          console.error(`  ❌ Erreur mise à jour solde admin ${adminId}:`, err.message);
        }
      });

      // Créer les entrées ledger
      let runningBalance = 0;
      const ledgerStmt = db.prepare(`
        INSERT INTO commission_ledger (admin_id, type, amount, balance_after, transaction_id, description)
        VALUES (?, 'credit', ?, ?, ?, ?)
      `);

      data.transactions.forEach(tx => {
        runningBalance += tx.commission;
        ledgerStmt.run(
          parseInt(adminId),
          tx.commission,
          runningBalance,
          tx.id,
          `Backfill - Commission transaction ${tx.transaction_id}`
        );
      });

      ledgerStmt.finalize();
      processed++;

      if (processed === adminIds.length) {
        console.log(`  ✓ Backfill terminé pour ${adminIds.length} admin(s)`);
      }
    });
  });

  console.log('\n✅ Migration terminée avec succès!');
  console.log('\n📊 Résumé des modifications:');
  console.log('  - Colonne commission_balance ajoutée à admins');
  console.log('  - Table commission_ledger créée');
  console.log('  - 3 index créés');
  console.log('  - 2 permissions: VIEW_COMMISSIONS, MANAGE_COMMISSIONS');
  console.log('  - Backfill des commissions historiques');
});

// Fermer la connexion après un délai
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('❌ Erreur lors de la fermeture:', err.message);
    } else {
      console.log('\n✓ Connexion à la base de données fermée');
    }
  });
}, 5000);
