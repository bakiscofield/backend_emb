const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'emb.db');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Démarrage de la migration - Système d\'assignation des transactions...\n');

db.serialize(() => {
  // 1. Créer la table points_de_vente
  console.log('📝 Création de la table points_de_vente...');
  db.run(`
    CREATE TABLE IF NOT EXISTS points_de_vente (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      google_maps_url TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Erreur points_de_vente:', err.message);
    else console.log('✓ Table points_de_vente créée');
  });

  // 2. Créer la table de jonction admin_points_de_vente
  console.log('📝 Création de la table admin_points_de_vente...');
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_points_de_vente (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      point_de_vente_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
      FOREIGN KEY (point_de_vente_id) REFERENCES points_de_vente(id) ON DELETE CASCADE,
      UNIQUE(admin_id, point_de_vente_id)
    )
  `, (err) => {
    if (err) console.error('❌ Erreur admin_points_de_vente:', err.message);
    else console.log('✓ Table admin_points_de_vente créée');
  });

  // 3. Créer la table transaction_assignments
  console.log('📝 Création de la table transaction_assignments...');
  db.run(`
    CREATE TABLE IF NOT EXISTS transaction_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      admin_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      responded_at DATETIME,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Erreur transaction_assignments:', err.message);
    else console.log('✓ Table transaction_assignments créée');
  });

  // 4. Ajouter les colonnes à la table transactions
  console.log('\n📝 Ajout des colonnes à la table transactions...');

  const columnsToAdd = [
    ['assigned_to', 'INTEGER REFERENCES admins(id)'],
    ['point_de_vente_id', 'INTEGER REFERENCES points_de_vente(id)'],
    ['client_latitude', 'REAL'],
    ['client_longitude', 'REAL']
  ];

  columnsToAdd.forEach(([name, type]) => {
    db.run(`ALTER TABLE transactions ADD COLUMN ${name} ${type}`, (err) => {
      if (err) {
        if (err.message.includes('duplicate column')) {
          console.log(`  ⚠ Colonne ${name} existe déjà`);
        } else {
          console.error(`  ❌ Erreur ajout colonne ${name}:`, err.message);
        }
      } else {
        console.log(`  ✓ Colonne ${name} ajoutée`);
      }
    });
  });

  // 5. Ajouter les nouvelles permissions
  console.log('\n📝 Insertion des permissions points de vente...');
  const newPermissions = [
    ['VIEW_POINTS_DE_VENTE', 'Voir les points de vente', 'Consulter la liste des points de vente', 'POINTS_DE_VENTE'],
    ['MANAGE_POINTS_DE_VENTE', 'Gérer les points de vente', 'Créer, modifier et supprimer les points de vente et gérer les agents', 'POINTS_DE_VENTE']
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO permissions (code, name, description, category)
    VALUES (?, ?, ?, ?)
  `);

  newPermissions.forEach(([code, name, description, category]) => {
    stmt.run(code, name, description, category);
  });

  stmt.finalize(() => {
    console.log(`✓ ${newPermissions.length} permissions points de vente insérées`);
  });

  // 6. Donner les nouvelles permissions aux admins existants
  console.log('\n📝 Attribution des nouvelles permissions aux admins existants...');
  db.run(`
    INSERT OR IGNORE INTO admin_permissions (admin_id, permission_id)
    SELECT a.id, p.id
    FROM admins a
    CROSS JOIN permissions p
    WHERE p.code IN ('VIEW_POINTS_DE_VENTE', 'MANAGE_POINTS_DE_VENTE')
  `, (err) => {
    if (err) {
      console.error('❌ Erreur attribution permissions:', err.message);
    } else {
      console.log('✓ Permissions attribuées aux admins existants');
    }
  });

  // 7. Ajouter la configuration du timeout
  console.log('\n📝 Ajout de la configuration assignment_timeout_minutes...');
  db.run(`
    INSERT OR IGNORE INTO config (key, value, description)
    VALUES ('assignment_timeout_minutes', '5', 'Délai en minutes avant réassignation automatique d''une transaction')
  `, (err) => {
    if (err) {
      console.error('❌ Erreur config:', err.message);
    } else {
      console.log('✓ Configuration assignment_timeout_minutes ajoutée');
    }
  });

  // 8. Créer les index pour les performances
  console.log('\n📝 Création des index...');
  db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_assignments_transaction ON transaction_assignments(transaction_id)`, (err) => {
    if (!err) console.log('  ✓ Index idx_transaction_assignments_transaction créé');
  });
  db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_assignments_admin ON transaction_assignments(admin_id)`, (err) => {
    if (!err) console.log('  ✓ Index idx_transaction_assignments_admin créé');
  });
  db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_assignments_status ON transaction_assignments(status)`, (err) => {
    if (!err) console.log('  ✓ Index idx_transaction_assignments_status créé');
  });
  db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_assigned_to ON transactions(assigned_to)`, (err) => {
    if (!err) console.log('  ✓ Index idx_transactions_assigned_to créé');
  });
  db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_point_de_vente ON transactions(point_de_vente_id)`, (err) => {
    if (!err) console.log('  ✓ Index idx_transactions_point_de_vente créé');
  });
  db.run(`CREATE INDEX IF NOT EXISTS idx_admin_pdv_admin ON admin_points_de_vente(admin_id)`, (err) => {
    if (!err) console.log('  ✓ Index idx_admin_pdv_admin créé');
  });
  db.run(`CREATE INDEX IF NOT EXISTS idx_admin_pdv_pdv ON admin_points_de_vente(point_de_vente_id)`, (err) => {
    if (!err) console.log('  ✓ Index idx_admin_pdv_pdv créé');
  });

  console.log('\n✅ Migration terminée avec succès!');
  console.log('\n📊 Résumé des modifications:');
  console.log('  - Table points_de_vente créée');
  console.log('  - Table admin_points_de_vente créée');
  console.log('  - Table transaction_assignments créée');
  console.log('  - 4 colonnes ajoutées à transactions (assigned_to, point_de_vente_id, client_latitude, client_longitude)');
  console.log('  - 2 permissions: VIEW_POINTS_DE_VENTE, MANAGE_POINTS_DE_VENTE');
  console.log('  - Config: assignment_timeout_minutes = 5');
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
