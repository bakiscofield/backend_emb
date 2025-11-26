const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'emb.db');
const db = new sqlite3.Database(dbPath);

console.log('=æ Migration: Ajout de la table push_subscriptions');

db.serialize(() => {
  // Créer la table push_subscriptions
  db.run(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      admin_id INTEGER,
      endpoint TEXT UNIQUE NOT NULL,
      subscription_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('L Erreur lors de la création de la table push_subscriptions:', err);
      process.exit(1);
    } else {
      console.log(' Table push_subscriptions créée avec succès');
    }
  });

  // Créer les index
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_push_sub_user_id ON push_subscriptions(user_id)
  `, (err) => {
    if (err) {
      console.error('L Erreur lors de la création de l\'index idx_push_sub_user_id:', err);
    } else {
      console.log(' Index idx_push_sub_user_id créé avec succès');
    }
  });

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_push_sub_admin_id ON push_subscriptions(admin_id)
  `, (err) => {
    if (err) {
      console.error('L Erreur lors de la création de l\'index idx_push_sub_admin_id:', err);
    } else {
      console.log(' Index idx_push_sub_admin_id créé avec succès');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('L Erreur lors de la fermeture de la base de données:', err);
    process.exit(1);
  }
  console.log(' Migration terminée avec succès');
  process.exit(0);
});
