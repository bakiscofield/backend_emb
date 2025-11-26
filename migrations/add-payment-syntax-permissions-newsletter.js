const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'emb.db');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Démarrage de la migration...\n');

db.serialize(() => {
  // 1. Ajouter les colonnes de syntaxe de paiement à exchange_pairs
  console.log('📝 Ajout des colonnes payment_syntax_type et payment_syntax_value...');
  db.run(`
    ALTER TABLE exchange_pairs
    ADD COLUMN payment_syntax_type TEXT DEFAULT 'TEXTE'
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Erreur lors de l\'ajout de payment_syntax_type:', err.message);
    } else {
      console.log('✓ Colonne payment_syntax_type ajoutée');
    }
  });

  db.run(`
    ALTER TABLE exchange_pairs
    ADD COLUMN payment_syntax_value TEXT DEFAULT ''
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Erreur lors de l\'ajout de payment_syntax_value:', err.message);
    } else {
      console.log('✓ Colonne payment_syntax_value ajoutée');
    }
  });

  // 2. Ajouter la colonne is_active à la table admins
  console.log('\n📝 Ajout de la colonne is_active pour les admins...');
  db.run(`
    ALTER TABLE admins
    ADD COLUMN is_active BOOLEAN DEFAULT 1
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Erreur lors de l\'ajout de is_active:', err.message);
    } else {
      console.log('✓ Colonne is_active ajoutée aux admins');
    }
  });

  // 3. Créer la table des permissions
  console.log('\n📝 Création de la table permissions...');
  db.run(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erreur lors de la création de permissions:', err.message);
    } else {
      console.log('✓ Table permissions créée');
    }
  });

  // 4. Créer la table de jonction admin_permissions
  console.log('📝 Création de la table admin_permissions...');
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
      UNIQUE(admin_id, permission_id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erreur lors de la création de admin_permissions:', err.message);
    } else {
      console.log('✓ Table admin_permissions créée');
    }
  });

  // 5. Insérer les permissions par défaut
  console.log('\n📝 Insertion des permissions par défaut...');
  const defaultPermissions = [
    // Gestion des échanges
    ['MANAGE_EXCHANGE_PAIRS', 'Gérer les paires d\'échange', 'Créer, modifier, supprimer les paires d\'échange et leurs syntaxes', 'EXCHANGES'],
    ['MANAGE_PAYMENT_METHODS', 'Gérer les moyens de paiement', 'Créer, modifier, supprimer les moyens de paiement', 'EXCHANGES'],

    // Gestion des transactions
    ['VIEW_TRANSACTIONS', 'Voir les transactions', 'Consulter toutes les transactions', 'TRANSACTIONS'],
    ['VALIDATE_TRANSACTIONS', 'Valider les transactions', 'Approuver ou rejeter les transactions', 'TRANSACTIONS'],
    ['VIEW_TRANSACTION_STATS', 'Voir les statistiques', 'Accéder aux statistiques des transactions', 'TRANSACTIONS'],

    // Gestion des utilisateurs
    ['MANAGE_USERS', 'Gérer les utilisateurs', 'Voir et gérer les comptes utilisateurs', 'USERS'],
    ['MANAGE_ADMINS', 'Gérer les administrateurs', 'Créer, modifier, désactiver les comptes admin', 'USERS'],
    ['MANAGE_PERMISSIONS', 'Gérer les permissions', 'Attribuer et retirer des permissions aux admins', 'USERS'],

    // Gestion de la configuration
    ['MANAGE_CONFIG', 'Gérer la configuration', 'Modifier les paramètres système (commissions, limites)', 'SETTINGS'],
    ['MANAGE_BOOKMAKERS', 'Gérer les bookmakers', 'Créer, modifier, supprimer les bookmakers', 'SETTINGS'],

    // Gestion des newsletters
    ['VIEW_NEWSLETTERS', 'Voir les newsletters', 'Consulter les newsletters et leur historique', 'NEWSLETTERS'],
    ['CREATE_NEWSLETTERS', 'Créer des newsletters', 'Créer et envoyer des newsletters', 'NEWSLETTERS'],
    ['MANAGE_NEWSLETTER_SUBSCRIBERS', 'Gérer les abonnés', 'Voir et gérer les abonnés aux newsletters', 'NEWSLETTERS']
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO permissions (code, name, description, category)
    VALUES (?, ?, ?, ?)
  `);

  defaultPermissions.forEach(([code, name, description, category]) => {
    stmt.run(code, name, description, category);
  });

  stmt.finalize(() => {
    console.log('✓ Permissions par défaut insérées');
  });

  // 6. Donner toutes les permissions aux admins existants
  console.log('\n📝 Attribution de toutes les permissions aux admins existants...');
  db.run(`
    INSERT OR IGNORE INTO admin_permissions (admin_id, permission_id)
    SELECT a.id, p.id
    FROM admins a
    CROSS JOIN permissions p
  `, (err) => {
    if (err) {
      console.error('❌ Erreur lors de l\'attribution des permissions:', err.message);
    } else {
      console.log('✓ Permissions attribuées aux admins existants');
    }
  });

  // 7. Créer la table newsletters
  console.log('\n📝 Création de la table newsletters...');
  db.run(`
    CREATE TABLE IF NOT EXISTS newsletters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      content_html TEXT,
      status TEXT DEFAULT 'draft',
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME,
      FOREIGN KEY (created_by) REFERENCES admins(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erreur lors de la création de newsletters:', err.message);
    } else {
      console.log('✓ Table newsletters créée');
    }
  });

  // 8. Ajouter la colonne newsletter_subscribed aux users
  console.log('\n📝 Ajout de la colonne newsletter_subscribed...');
  db.run(`
    ALTER TABLE users
    ADD COLUMN newsletter_subscribed BOOLEAN DEFAULT 1
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Erreur lors de l\'ajout de newsletter_subscribed:', err.message);
    } else {
      console.log('✓ Colonne newsletter_subscribed ajoutée');
    }
  });

  // 9. Créer la table newsletter_history
  console.log('📝 Création de la table newsletter_history...');
  db.run(`
    CREATE TABLE IF NOT EXISTS newsletter_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      newsletter_id INTEGER NOT NULL,
      recipient_type TEXT NOT NULL,
      recipient_count INTEGER NOT NULL,
      sent_by INTEGER NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (newsletter_id) REFERENCES newsletters(id) ON DELETE CASCADE,
      FOREIGN KEY (sent_by) REFERENCES admins(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erreur lors de la création de newsletter_history:', err.message);
    } else {
      console.log('✓ Table newsletter_history créée');
    }
  });

  // 10. Créer la table newsletter_recipients (pour tracking détaillé)
  console.log('📝 Création de la table newsletter_recipients...');
  db.run(`
    CREATE TABLE IF NOT EXISTS newsletter_recipients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      newsletter_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      opened_at DATETIME,
      FOREIGN KEY (newsletter_id) REFERENCES newsletters(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(newsletter_id, user_id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erreur lors de la création de newsletter_recipients:', err.message);
    } else {
      console.log('✓ Table newsletter_recipients créée');
    }
  });

  console.log('\n✅ Migration terminée avec succès!');
  console.log('\n📊 Résumé des modifications:');
  console.log('  - Colonnes ajoutées à exchange_pairs: payment_syntax_type, payment_syntax_value');
  console.log('  - Colonne ajoutée à admins: is_active');
  console.log('  - Colonne ajoutée à users: newsletter_subscribed');
  console.log('  - Tables créées: permissions, admin_permissions');
  console.log('  - Tables créées: newsletters, newsletter_history, newsletter_recipients');
  console.log(`  - ${defaultPermissions.length} permissions système créées`);
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
}, 2000);
