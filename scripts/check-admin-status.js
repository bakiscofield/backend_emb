const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/emb.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Erreur de connexion:', err);
    process.exit(1);
  }
  console.log('✓ Connecté à la base de données\n');
});

db.serialize(() => {
  // Vérifier la structure de la table admins
  console.log('📋 Structure de la table admins:');
  db.all("PRAGMA table_info(admins)", (err, columns) => {
    if (err) {
      console.error('❌ Erreur:', err);
      return;
    }
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });

    console.log('\n📊 Admins dans la base:');
    db.all("SELECT id, username, email, is_active FROM admins", (err, admins) => {
      if (err) {
        console.error('❌ Erreur:', err);
        db.close();
        return;
      }

      if (admins.length === 0) {
        console.log('  Aucun admin trouvé');
      } else {
        admins.forEach(admin => {
          console.log(`  - ID: ${admin.id}, Username: ${admin.username}, Email: ${admin.email}, Actif: ${admin.is_active === 1 ? 'Oui' : 'Non'}`);
        });
      }

      console.log('\n📊 Permissions dans la base:');
      db.all("SELECT id, code, name FROM permissions", (err, permissions) => {
        if (err) {
          console.error('❌ Erreur:', err);
          db.close();
          return;
        }

        if (permissions.length === 0) {
          console.log('  Aucune permission trouvée');
        } else {
          permissions.forEach(perm => {
            console.log(`  - ${perm.code}: ${perm.name}`);
          });
        }

        console.log('\n📊 Permissions des admins:');
        db.all(`
          SELECT a.username, p.code, p.name
          FROM admin_permissions ap
          INNER JOIN admins a ON ap.admin_id = a.id
          INNER JOIN permissions p ON ap.permission_id = p.id
          ORDER BY a.username, p.code
        `, (err, adminPerms) => {
          if (err) {
            console.error('❌ Erreur:', err);
            db.close();
            return;
          }

          if (adminPerms.length === 0) {
            console.log('  Aucune permission attribuée');
          } else {
            let currentAdmin = '';
            adminPerms.forEach(ap => {
              if (ap.username !== currentAdmin) {
                currentAdmin = ap.username;
                console.log(`\n  ${ap.username}:`);
              }
              console.log(`    - ${ap.code}: ${ap.name}`);
            });
          }

          db.close(() => {
            console.log('\n✓ Terminé\n');
            process.exit(0);
          });
        });
      });
    });
  });
});
