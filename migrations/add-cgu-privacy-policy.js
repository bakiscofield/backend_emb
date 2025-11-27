const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuration
const DB_PATH = path.join(__dirname, '..', 'database', 'emb.db');

function runMigration() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Erreur de connexion à la base de données:', err);
        reject(err);
        return;
      }
      console.log('✅ Connecté à la base de données');
    });

    db.serialize(() => {
      console.log('\n📝 Ajout des champs CGU et Politique de confidentialité...\n');

      // Ajouter les colonnes pour CGU et Politique de confidentialité
      const alterTableQueries = [
        {
          sql: `ALTER TABLE users ADD COLUMN cgu_accepted INTEGER DEFAULT 0`,
          description: 'Ajout de la colonne cgu_accepted'
        },
        {
          sql: `ALTER TABLE users ADD COLUMN cgu_accepted_at TEXT`,
          description: 'Ajout de la colonne cgu_accepted_at'
        },
        {
          sql: `ALTER TABLE users ADD COLUMN privacy_policy_accepted INTEGER DEFAULT 0`,
          description: 'Ajout de la colonne privacy_policy_accepted'
        },
        {
          sql: `ALTER TABLE users ADD COLUMN privacy_policy_accepted_at TEXT`,
          description: 'Ajout de la colonne privacy_policy_accepted_at'
        },
        {
          sql: `ALTER TABLE users ADD COLUMN terms_version TEXT DEFAULT '1.0'`,
          description: 'Ajout de la colonne terms_version'
        }
      ];

      let completed = 0;
      const errors = [];

      alterTableQueries.forEach((query) => {
        db.run(query.sql, (err) => {
          if (err) {
            if (err.message.includes('duplicate column name')) {
              console.log(`⚠️  ${query.description} - La colonne existe déjà`);
            } else {
              console.error(`❌ Erreur lors de ${query.description}:`, err.message);
              errors.push(err);
            }
          } else {
            console.log(`✅ ${query.description}`);
          }

          completed++;
          if (completed === alterTableQueries.length) {
            if (errors.length > 0) {
              db.close();
              reject(errors[0]);
            } else {
              console.log('\n✅ Migration terminée avec succès!\n');
              db.close((err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            }
          }
        });
      });
    });
  });
}

// Exécuter la migration si le fichier est appelé directement
if (require.main === module) {
  console.log('🔄 Démarrage de la migration CGU/Politique de confidentialité...\n');
  runMigration()
    .then(() => {
      console.log('✅ Migration réussie!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de la migration:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
