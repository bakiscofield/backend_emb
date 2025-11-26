const fs = require('fs');
const path = require('path');

// Fichiers à migrer (tous sauf auth.js qui est déjà fait)
const filesToMigrate = [
  'routes/admin.js',
  'routes/chat.js',
  'routes/kyc.js',
  'routes/transactions.js',
  'routes/users.js',
  'routes/settings.js',
  'routes/payment-methods.js',
  'routes/exchange-pairs.js',
  'routes/notifications.js',
  'routes/permissions.js',
  'routes/newsletters.js'
];

console.log('🚀 Début de la migration vers Prisma...\n');

filesToMigrate.forEach(file => {
  const filePath = path.join(__dirname, file);

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Étape 1: Remplacer les imports
    content = content.replace(
      /const db = require\('\.\.\/config\/database'\);/g,
      "const prisma = require('../config/prisma');"
    );

    // Étape 2: Supprimer les imports sqlite3 et DB_PATH si présents
    content = content.replace(
      /const sqlite3 = require\('sqlite3'\)\.verbose\(\);[\r\n]*/g,
      ''
    );

    content = content.replace(
      /const DB_PATH = path\.join\(__dirname, '\.\.\/database\/emb\.db'\);[\r\n]*/g,
      ''
    );

    // Étape 3: Supprimer les créations de nouvelles instances db
    content = content.replace(
      /const db = new sqlite3\.Database\(DB_PATH\);[\r\n]*/g,
      ''
    );

    content = content.replace(
      /new sqlite3\.Database\(DB_PATH\)/g,
      'prisma'
    );

    // Étape 4: Ajouter un commentaire TODO pour les conversions manuelles
    if (!content.includes('// TODO: Convertir les requêtes db vers Prisma')) {
      const lines = content.split('\n');
      const routerIndex = lines.findIndex(line => line.includes('const router'));
      if (routerIndex !== -1) {
        lines.splice(routerIndex + 1, 0, '\n// TODO: Convertir les requêtes db vers Prisma (db.get → prisma.findFirst, db.run → prisma.create/update/delete, db.all → prisma.findMany)');
        content = lines.join('\n');
      }
    }

    // Sauvegarder le fichier
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file} - Imports mis à jour`);

  } catch (error) {
    console.error(`❌ Erreur lors de la migration de ${file}:`, error.message);
  }
});

console.log('\n✨ Migration des imports terminée!');
console.log('\n📝 Prochaine étape: Convertir les requêtes SQL vers Prisma dans chaque fichier');
console.log('   - db.get() → prisma.modelName.findFirst() ou findUnique()');
console.log('   - db.all() → prisma.modelName.findMany()');
console.log('   - db.run(INSERT) → prisma.modelName.create()');
console.log('   - db.run(UPDATE) → prisma.modelName.update()');
console.log('   - db.run(DELETE) → prisma.modelName.delete() ou deleteMany()');
