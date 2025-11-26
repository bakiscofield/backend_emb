const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'emb.db');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Démarrage de la migration pour vérification email et reset password...\n');

db.serialize(() => {
  // 1. Créer la table pour les codes de vérification email
  console.log('📝 Création de la table email_verification_codes...');
  db.run(`
    CREATE TABLE IF NOT EXISTS email_verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      phone TEXT,
      name TEXT,
      password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      verified BOOLEAN DEFAULT 0,
      attempts INTEGER DEFAULT 0
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erreur lors de la création de email_verification_codes:', err.message);
    } else {
      console.log('✓ Table email_verification_codes créée');
    }
  });

  // 2. Créer la table pour les demandes de réinitialisation de mot de passe
  console.log('\n📝 Création de la table password_reset_tokens...');
  db.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      used BOOLEAN DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erreur lors de la création de password_reset_tokens:', err.message);
    } else {
      console.log('✓ Table password_reset_tokens créée');
    }
  });

  // 3. Rendre l'email unique dans la table users
  console.log('\n📝 Création d\'un index unique sur email...');
  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)
  `, (err) => {
    if (err) {
      console.error('❌ Erreur lors de la création de l\'index:', err.message);
    } else {
      console.log('✓ Index unique sur email créé');
    }
  });

  console.log('\n✅ Migration terminée avec succès!');
  console.log('\n📊 Résumé des modifications:');
  console.log('  - Table créée: email_verification_codes');
  console.log('  - Table créée: password_reset_tokens');
  console.log('  - Index unique créé sur users.email');
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
