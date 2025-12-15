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
      console.log('\n📝 Ajout de la configuration de limite mensuelle...\n');

      // Vérifier si la configuration existe déjà
      db.get(
        `SELECT * FROM config WHERE key = 'monthly_limit_without_kyc'`,
        (err, row) => {
          if (err) {
            console.error('❌ Erreur lors de la vérification:', err);
            db.close();
            reject(err);
            return;
          }

          if (row) {
            console.log('⚠️  La configuration monthly_limit_without_kyc existe déjà');
            console.log(`   Valeur actuelle: ${row.value} FCFA`);
            db.close();
            resolve();
            return;
          }

          // Insérer la nouvelle configuration avec une limite par défaut de 500 000 FCFA
          const insertQuery = `
            INSERT INTO config (key, value, description, updated_at)
            VALUES (?, ?, ?, datetime('now'))
          `;

          db.run(
            insertQuery,
            [
              'monthly_limit_without_kyc',
              '500000',
              'Limite mensuelle de transaction pour les utilisateurs sans KYC validé (en FCFA)'
            ],
            (err) => {
              if (err) {
                console.error('❌ Erreur lors de l\'ajout de la configuration:', err);
                db.close();
                reject(err);
                return;
              }

              console.log('✅ Configuration monthly_limit_without_kyc ajoutée');
              console.log('   Valeur par défaut: 500 000 FCFA/mois');
              console.log('\n✅ Migration terminée avec succès!\n');

              db.close((err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            }
          );
        }
      );
    });
  });
}

// Exécuter la migration si le fichier est appelé directement
if (require.main === module) {
  console.log('🔄 Démarrage de la migration de limite mensuelle...\n');
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
