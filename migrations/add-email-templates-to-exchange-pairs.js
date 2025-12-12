const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'emb.db');

console.log('🔄 Début de la migration : ajout des champs email templates aux paires d\'échange...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur de connexion à la base de données:', err.message);
    process.exit(1);
  }
  console.log('✅ Connecté à la base de données SQLite\n');
});

// Ajouter les colonnes pour les templates d'email
db.serialize(() => {
  // Ajouter validated_email_template_id
  db.run(`
    ALTER TABLE exchange_pairs
    ADD COLUMN validated_email_template_id INTEGER
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Erreur lors de l\'ajout de validated_email_template_id:', err.message);
    } else {
      console.log('✅ Colonne validated_email_template_id ajoutée');
    }
  });

  // Ajouter rejected_email_template_id
  db.run(`
    ALTER TABLE exchange_pairs
    ADD COLUMN rejected_email_template_id INTEGER
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Erreur lors de l\'ajout de rejected_email_template_id:', err.message);
    } else {
      console.log('✅ Colonne rejected_email_template_id ajoutée');
    }
  });

  // Mettre à jour les paires existantes avec les templates par défaut
  setTimeout(() => {
    db.run(`
      UPDATE exchange_pairs
      SET validated_email_template_id = (SELECT id FROM email_templates WHERE type = 'transaction_validated' LIMIT 1),
          rejected_email_template_id = (SELECT id FROM email_templates WHERE type = 'transaction_rejected' LIMIT 1)
      WHERE validated_email_template_id IS NULL OR rejected_email_template_id IS NULL
    `, (err) => {
      if (err) {
        console.error('❌ Erreur lors de la mise à jour des paires existantes:', err.message);
      } else {
        console.log('✅ Paires existantes mises à jour avec les templates par défaut');
      }

      db.all('SELECT id, validated_email_template_id, rejected_email_template_id FROM exchange_pairs LIMIT 5', (err, rows) => {
        if (err) {
          console.error('❌ Erreur:', err.message);
        } else {
          console.log('\n📋 Aperçu des paires d\'échange :');
          rows.forEach(row => {
            console.log(`  - Paire ${row.id}: Template validé=${row.validated_email_template_id}, Template rejeté=${row.rejected_email_template_id}`);
          });
        }

        db.close((err) => {
          if (err) {
            console.error('❌ Erreur lors de la fermeture de la base de données:', err.message);
          } else {
            console.log('\n✅ Base de données fermée. Migration terminée avec succès !');
          }
        });
      });
    });
  }, 500);
});
