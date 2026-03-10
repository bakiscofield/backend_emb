const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'emb.db');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Démarrage de la migration - Système d\'approbation des retraits...\n');

db.serialize(() => {
  // 1. Créer la table withdrawal_requests
  console.log('📝 Création de la table withdrawal_requests...');
  db.run(`
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      network TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_by INTEGER,
      processed_at DATETIME,
      rejection_reason TEXT,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
      FOREIGN KEY (processed_by) REFERENCES admins(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Erreur withdrawal_requests:', err.message);
    else console.log('✓ Table withdrawal_requests créée');
  });

  // 2. Créer les index
  console.log('\n📝 Création des index...');
  db.run(`CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_admin ON withdrawal_requests(admin_id)`, (err) => {
    if (!err) console.log('  ✓ Index idx_withdrawal_requests_admin créé');
  });
  db.run(`CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status)`, (err) => {
    if (!err) console.log('  ✓ Index idx_withdrawal_requests_status créé');
  });

  // 3. Ajouter la permission APPROVE_WITHDRAWALS
  console.log('\n📝 Insertion de la permission APPROVE_WITHDRAWALS...');
  db.run(`
    INSERT OR IGNORE INTO permissions (code, name, description, category)
    VALUES ('APPROVE_WITHDRAWALS', 'Approuver les retraits', 'Approuver ou rejeter les demandes de retrait des agents', 'COMMISSIONS')
  `, (err) => {
    if (err) console.error('❌ Erreur permission:', err.message);
    else console.log('✓ Permission APPROVE_WITHDRAWALS insérée');
  });

  // 4. Auto-attribuer APPROVE_WITHDRAWALS aux admins avec role='admin'
  console.log('\n📝 Attribution de APPROVE_WITHDRAWALS aux admins (role=admin)...');
  db.run(`
    INSERT OR IGNORE INTO admin_permissions (admin_id, permission_id)
    SELECT a.id, p.id
    FROM admins a
    CROSS JOIN permissions p
    WHERE a.role = 'admin' AND p.code = 'APPROVE_WITHDRAWALS'
  `, (err) => {
    if (err) {
      console.error('❌ Erreur attribution permission:', err.message);
    } else {
      console.log('✓ Permission APPROVE_WITHDRAWALS attribuée aux admins');
    }
  });

  console.log('\n✅ Migration terminée avec succès!');
  console.log('\n📊 Résumé des modifications:');
  console.log('  - Table withdrawal_requests créée');
  console.log('  - 2 index créés');
  console.log('  - Permission APPROVE_WITHDRAWALS ajoutée');
  console.log('  - Permission auto-attribuée aux admins (role=admin)');
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
}, 3000);
