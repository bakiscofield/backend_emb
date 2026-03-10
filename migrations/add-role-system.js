const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, '..', 'database', 'emb.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Migration: Ajout du système de rôles...\n');

db.serialize(() => {
  // 1. Ajouter la colonne role à la table admins
  console.log('📝 Ajout de la colonne role à admins...');
  db.run(`ALTER TABLE admins ADD COLUMN role TEXT DEFAULT 'agent'`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column')) {
        console.log('  ⚠ Colonne role existe déjà');
      } else {
        console.error('  ❌ Erreur:', err.message);
      }
    } else {
      console.log('  ✓ Colonne role ajoutée');
    }
  });

  // 2. Mettre le premier admin (username='admin') en role='admin'
  console.log('📝 Mise à jour du rôle admin principal...');
  db.run(`UPDATE admins SET role = 'admin' WHERE username = 'admin'`, function(err) {
    if (err) {
      console.error('  ❌ Erreur:', err.message);
    } else {
      console.log(`  ✓ Admin principal mis en role='admin' (${this.changes} ligne(s))`);
    }
  });

  // 3. Tous les autres restent en 'agent'
  console.log('📝 Mise à jour des autres admins en agent...');
  db.run(`UPDATE admins SET role = 'agent' WHERE role IS NULL AND username != 'admin'`, function(err) {
    if (err) {
      console.error('  ❌ Erreur:', err.message);
    } else {
      console.log(`  ✓ Autres admins mis en role='agent' (${this.changes} ligne(s))`);
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('❌ Erreur fermeture DB:', err.message);
    process.exit(1);
  }

  console.log('\n🔄 Regénération du client Prisma...');
  try {
    execSync('npx prisma generate', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
    console.log('\n✅ Migration terminée avec succès !');
  } catch (e) {
    console.error('❌ Erreur prisma generate:', e.message);
    process.exit(1);
  }
});
