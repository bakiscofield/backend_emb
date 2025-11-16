const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function initDatabase() {
  try {
    console.log('🔧 Initialisation de la base de données...\n');

    // Attendre que la base de données soit prête
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Vérifier si un admin existe déjà
    const existingAdmin = await db.get('SELECT * FROM admins WHERE username = ?', ['admin']);

    if (!existingAdmin) {
      // Créer un admin par défaut
      const defaultPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await db.run(
        'INSERT INTO admins (username, password, email) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'admin@emb.com']
      );

      console.log('✅ Administrateur par défaut créé avec succès !');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   ⚠️  CHANGEZ CE MOT DE PASSE EN PRODUCTION !\n');
    } else {
      console.log('ℹ️  Un administrateur existe déjà.\n');
    }

    // Afficher les configurations
    const configs = await db.all('SELECT * FROM config');
    console.log('📋 Configurations actuelles:');
    configs.forEach(config => {
      console.log(`   • ${config.key}: ${config.value}`);
    });

    console.log('\n✅ Base de données initialisée avec succès !');
    
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

initDatabase();
