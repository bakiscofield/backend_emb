const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'database');
const dbPath = path.join(dbDir, 'emb.db');

// Créer le dossier database s'il n'existe pas
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✓ Dossier database créé');
}

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Erreur de connexion à la base de données:', err);
      } else {
        console.log('✓ Connecté à la base de données SQLite');
        this.initTables();
      }
    });
  }

  initTables() {
    this.db.serialize(() => {
      // Table des utilisateurs (clients)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Table des administrateurs
      this.db.run(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Table des configurations (pourcentages, bookmakers, etc.)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Table des bookmakers
      this.db.run(`
        CREATE TABLE IF NOT EXISTS bookmakers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Table des transactions
      this.db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id TEXT UNIQUE NOT NULL,
          user_id INTEGER NOT NULL,
          tmoney_number TEXT NOT NULL,
          flooz_number TEXT NOT NULL,
          amount REAL NOT NULL,
          percentage REAL NOT NULL,
          total_amount REAL NOT NULL,
          payment_reference TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          bookmaker_id INTEGER,
          notes TEXT,
          validated_by INTEGER,
          validated_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (bookmaker_id) REFERENCES bookmakers(id),
          FOREIGN KEY (validated_by) REFERENCES admins(id)
        )
      `);

      // Table de l'historique
      this.db.run(`
        CREATE TABLE IF NOT EXISTS transaction_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id INTEGER NOT NULL,
          status TEXT NOT NULL,
          comment TEXT,
          changed_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (transaction_id) REFERENCES transactions(id),
          FOREIGN KEY (changed_by) REFERENCES admins(id)
        )
      `);

      // Insérer des configurations par défaut
      this.db.run(`
        INSERT OR IGNORE INTO config (key, value, description) 
        VALUES 
          ('commission_percentage', '2.5', 'Pourcentage de commission sur les transactions'),
          ('min_amount', '500', 'Montant minimum de transaction'),
          ('max_amount', '500000', 'Montant maximum de transaction')
      `);

      // Insérer des bookmakers par défaut
      this.db.run(`
        INSERT OR IGNORE INTO bookmakers (name, code, is_active) 
        VALUES 
          ('1xBet', '1XBET', 1),
          ('22Bet', '22BET', 1),
          ('Melbet', 'MELBET', 1),
          ('Betwinner', 'BETWINNER', 1)
      `);

      console.log('✓ Tables initialisées avec succès');
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = new Database();
