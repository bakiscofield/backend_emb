const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/emb.db');

async function addChatSystem() {
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
      console.log('\n📝 Migration: Création du système de chat...\n');

      // 1. Créer la table chat_conversations
      db.run(`
        CREATE TABLE IF NOT EXISTS chat_conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          admin_id INTEGER,
          status TEXT DEFAULT 'open',
          last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          closed_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (admin_id) REFERENCES admins(id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Erreur lors de la création de chat_conversations:', err);
          db.close();
          reject(err);
          return;
        }

        console.log('✅ Table chat_conversations créée avec succès');

        // 2. Créer la table chat_messages
        db.run(`
          CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender_type TEXT NOT NULL,
            sender_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            console.error('❌ Erreur lors de la création de chat_messages:', err);
            db.close();
            reject(err);
            return;
          }

          console.log('✅ Table chat_messages créée avec succès');

          // 3. Créer des index pour optimiser les requêtes
          db.run(`
            CREATE INDEX IF NOT EXISTS idx_chat_conv_user_id ON chat_conversations(user_id)
          `, (err) => {
            if (err) console.error('❌ Erreur idx_chat_conv_user_id:', err);
            else console.log('✅ Index idx_chat_conv_user_id créé');
          });

          db.run(`
            CREATE INDEX IF NOT EXISTS idx_chat_conv_admin_id ON chat_conversations(admin_id)
          `, (err) => {
            if (err) console.error('❌ Erreur idx_chat_conv_admin_id:', err);
            else console.log('✅ Index idx_chat_conv_admin_id créé');
          });

          db.run(`
            CREATE INDEX IF NOT EXISTS idx_chat_msg_conv_id ON chat_messages(conversation_id)
          `, (err) => {
            if (err) console.error('❌ Erreur idx_chat_msg_conv_id:', err);
            else console.log('✅ Index idx_chat_msg_conv_id créé');
          });

          db.run(`
            CREATE INDEX IF NOT EXISTS idx_chat_msg_is_read ON chat_messages(is_read)
          `, (err) => {
            if (err) console.error('❌ Erreur idx_chat_msg_is_read:', err);
            else console.log('✅ Index idx_chat_msg_is_read créé');

            console.log('\n✅ Migration Chat terminée avec succès!\n');

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
  addChatSystem()
    .then(() => {
      console.log('✅ Script de migration terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de la migration:', error);
      process.exit(1);
    });
}

module.exports = addChatSystem;
