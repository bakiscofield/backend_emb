const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/emb.db');

async function addUserActiveStatus() {
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
      console.log('\n📝 Migration: Ajout de la colonne is_active à la table users...\n');

      // Vérifier si la colonne existe déjà
      db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
          console.error('❌ Erreur lors de la vérification de la structure:', err);
          db.close();
          reject(err);
          return;
        }

        const hasIsActive = columns.some(col => col.name === 'is_active');

        if (hasIsActive) {
          console.log('⚠️  La colonne is_active existe déjà');
          db.close();
          resolve();
          return;
        }

        // Ajouter la colonne is_active (par défaut 1 = actif)
        db.run(`
          ALTER TABLE users
          ADD COLUMN is_active INTEGER DEFAULT 1
        `, (err) => {
          if (err) {
            console.error('❌ Erreur lors de l\'ajout de la colonne is_active:', err);
            db.close();
            reject(err);
            return;
          }

          console.log('✅ Colonne is_active ajoutée avec succès');

          // Mettre à jour tous les utilisateurs existants à actif
          db.run(`
            UPDATE users
            SET is_active = 1
            WHERE is_active IS NULL
          `, (err) => {
            if (err) {
              console.error('❌ Erreur lors de la mise à jour des utilisateurs:', err);
              db.close();
              reject(err);
              return;
            }

            console.log('✅ Tous les utilisateurs existants sont maintenant actifs');
            console.log('\n✅ Migration terminée avec succès!\n');

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
  addUserActiveStatus()
    .then(() => {
      console.log('✅ Script de migration terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de la migration:', error);
      process.exit(1);
    });
}

module.exports = addUserActiveStatus;
