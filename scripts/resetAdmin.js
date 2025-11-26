const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function resetAdmin() {
  try {
    console.log('🔧 Réinitialisation de l\'admin...\n');

    // Attendre que la base de données soit prête
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Supprimer l'ancien admin
    await db.run('DELETE FROM admins WHERE username = ?', ['admin']);
    console.log('✓ Ancien admin supprimé');

    // Créer un nouvel admin
    const defaultPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await db.run(
      'INSERT INTO admins (username, password, email) VALUES (?, ?, ?)',
      ['admin', hashedPassword, 'admin@emb.com']
    );

    console.log('✅ Nouvel administrateur créé avec succès !');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   ⚠️  CHANGEZ CE MOT DE PASSE EN PRODUCTION !\n');

    // Vérifier
    const admin = await db.get('SELECT id, username, email FROM admins WHERE username = ?', ['admin']);
    console.log('Vérification:', admin);

    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

resetAdmin();
