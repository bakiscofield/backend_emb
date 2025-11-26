const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/emb.db');

async function addKYCSystem() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Erreur de connexion à la base de données:', err);
        reject(err);
        return;
      }
      console.log('✓ Connecté à la base de données');
    });

    db.serialize(() => {
      console.log('\n📝 Migration: Création du système KYC...\n');

      // 1. Ajouter les colonnes KYC à la table users
      db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
          console.error('❌ Erreur lors de la vérification de la structure:', err);
          db.close();
          reject(err);
          return;
        }

        const hasKYCVerified = columns.some(col => col.name === 'kyc_verified');

        if (!hasKYCVerified) {
          db.run(`
            ALTER TABLE users
            ADD COLUMN kyc_verified INTEGER DEFAULT 0
          `, (err) => {
            if (err) {
              console.error('❌ Erreur lors de l\'ajout de kyc_verified:', err);
            } else {
              console.log('✅ Colonne kyc_verified ajoutée');
            }
          });

          db.run(`
            ALTER TABLE users
            ADD COLUMN kyc_status TEXT DEFAULT 'pending'
          `, (err) => {
            if (err) {
              console.error('❌ Erreur lors de l\'ajout de kyc_status:', err);
            } else {
              console.log('✅ Colonne kyc_status ajoutée');
            }
          });
        }

        // 2. Créer la table kyc_documents
        db.run(`
          CREATE TABLE IF NOT EXISTS kyc_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            document_type TEXT NOT NULL,
            document_front TEXT NOT NULL,
            document_back TEXT,
            status TEXT DEFAULT 'pending',
            verified_by INTEGER,
            verified_at DATETIME,
            rejection_reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (verified_by) REFERENCES admins(id)
          )
        `, (err) => {
          if (err) {
            console.error('❌ Erreur lors de la création de kyc_documents:', err);
            db.close();
            reject(err);
            return;
          }

          console.log('✅ Table kyc_documents créée avec succès');

          // 3. Créer des index pour optimiser les requêtes
          db.run(`
            CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_documents(user_id)
          `, (err) => {
            if (err) {
              console.error('❌ Erreur lors de la création de l\'index idx_kyc_user_id:', err);
            } else {
              console.log('✅ Index idx_kyc_user_id créé');
            }
          });

          db.run(`
            CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_documents(status)
          `, (err) => {
            if (err) {
              console.error('❌ Erreur lors de la création de l\'index idx_kyc_status:', err);
            } else {
              console.log('✅ Index idx_kyc_status créé');
            }

            console.log('\n✅ Migration KYC terminée avec succès!\n');

            db.close((err) => {
              if (err) {
                console.error('❌ Erreur lors de la fermeture de la base de données:', err);
                reject(err);
              } else {
                console.log('✓ Base de données fermée\n');
                resolve();
              }
            });
          });
        });
      });
    });
  });
}

// Exécuter si appelé directement
if (require.main === module) {
  addKYCSystem()
    .then(() => {
      console.log('✅ Script de migration terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de la migration:', error);
      process.exit(1);
    });
}

module.exports = addKYCSystem;
