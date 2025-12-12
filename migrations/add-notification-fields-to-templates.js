const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

console.log('🔄 Début de la migration : ajout des champs notification...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur de connexion à la base de données:', err.message);
    process.exit(1);
  }
  console.log('✅ Connecté à la base de données SQLite\n');
});

// Ajouter les colonnes notification_title et notification_body
db.serialize(() => {
  // Vérifier et ajouter notification_title
  db.run(`
    ALTER TABLE email_templates ADD COLUMN notification_title TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Erreur lors de l\'ajout de notification_title:', err.message);
    } else if (!err) {
      console.log('✅ Colonne notification_title ajoutée');
    } else {
      console.log('ℹ️  Colonne notification_title existe déjà');
    }
  });

  // Vérifier et ajouter notification_body
  db.run(`
    ALTER TABLE email_templates ADD COLUMN notification_body TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Erreur lors de l\'ajout de notification_body:', err.message);
    } else if (!err) {
      console.log('✅ Colonne notification_body ajoutée');
    } else {
      console.log('ℹ️  Colonne notification_body existe déjà');
    }

    // Mettre à jour les templates existants avec des notifications
    console.log('\n📝 Mise à jour des templates existants...\n');

    const updates = [
      {
        type: 'transaction_validated',
        notification_title: '✅ Transaction validée !',
        notification_body: 'Votre transaction de {{amount}} FCFA a été validée avec succès. Les fonds seront transférés vers {{to_method}}.'
      },
      {
        type: 'transaction_rejected',
        notification_title: '❌ Transaction rejetée',
        notification_body: 'Votre transaction de {{amount}} FCFA a été rejetée. Raison : {{rejection_reason}}'
      },
      {
        type: 'kyc_validated',
        notification_title: '🎉 KYC validé !',
        notification_body: 'Félicitations ! Votre vérification d\'identité a été validée. Vous avez désormais accès à toutes les fonctionnalités.'
      },
      {
        type: 'kyc_rejected',
        notification_title: '⚠️ Documents KYC refusés',
        notification_body: 'Vos documents d\'identité ont été refusés. Raison : {{rejection_reason}}. Veuillez soumettre de nouveaux documents.'
      }
    ];

    let completed = 0;
    updates.forEach((update) => {
      db.run(`
        UPDATE email_templates
        SET notification_title = ?, notification_body = ?
        WHERE type = ?
      `, [update.notification_title, update.notification_body, update.type], (err) => {
        if (err) {
          console.error(`❌ Erreur lors de la mise à jour de ${update.type}:`, err.message);
        } else {
          console.log(`✅ Template "${update.type}" mis à jour avec les notifications`);
        }

        completed++;
        if (completed === updates.length) {
          console.log('\n✅ Migration terminée avec succès !');
          console.log('\n📋 Résumé :');
          console.log('  - Colonnes notification_title et notification_body ajoutées');
          console.log('  - 4 templates mis à jour avec des notifications');
          console.log('\nVous pouvez maintenant gérer les notifications depuis Paramètres → Templates Emails & Notifications\n');

          db.close((err) => {
            if (err) {
              console.error('❌ Erreur lors de la fermeture de la base de données:', err.message);
            }
          });
        }
      });
    });
  });
});
