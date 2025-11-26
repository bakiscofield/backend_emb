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

    // Initialiser les permissions par défaut
    console.log('🔐 Initialisation des permissions...\n');

    const defaultPermissions = [
      // Gestion des échanges
      ['MANAGE_EXCHANGE_PAIRS', 'Gérer les paires d\'échange', 'Créer, modifier, supprimer les paires d\'échange et leurs syntaxes', 'EXCHANGES'],
      ['MANAGE_PAYMENT_METHODS', 'Gérer les moyens de paiement', 'Créer, modifier, supprimer les moyens de paiement', 'EXCHANGES'],

      // Gestion des transactions
      ['VIEW_TRANSACTIONS', 'Voir les transactions', 'Consulter toutes les transactions', 'TRANSACTIONS'],
      ['VALIDATE_TRANSACTIONS', 'Valider les transactions', 'Approuver ou rejeter les transactions', 'TRANSACTIONS'],
      ['VIEW_TRANSACTION_STATS', 'Voir les statistiques', 'Accéder aux statistiques des transactions', 'TRANSACTIONS'],

      // Gestion des utilisateurs
      ['MANAGE_USERS', 'Gérer les utilisateurs', 'Voir et gérer les comptes utilisateurs', 'USERS'],
      ['MANAGE_ADMINS', 'Gérer les administrateurs', 'Créer, modifier, désactiver les comptes admin', 'USERS'],
      ['MANAGE_PERMISSIONS', 'Gérer les permissions', 'Attribuer et retirer des permissions aux admins', 'USERS'],

      // Gestion de la configuration
      ['MANAGE_CONFIG', 'Gérer la configuration', 'Modifier les paramètres système (commissions, limites)', 'SETTINGS'],
      ['MANAGE_BOOKMAKERS', 'Gérer les bookmakers', 'Créer, modifier, supprimer les bookmakers', 'SETTINGS'],

      // Gestion des newsletters
      ['VIEW_NEWSLETTERS', 'Voir les newsletters', 'Consulter les newsletters et leur historique', 'NEWSLETTERS'],
      ['CREATE_NEWSLETTERS', 'Créer des newsletters', 'Créer et envoyer des newsletters', 'NEWSLETTERS'],
      ['MANAGE_NEWSLETTER_SUBSCRIBERS', 'Gérer les abonnés', 'Voir et gérer les abonnés aux newsletters', 'NEWSLETTERS']
    ];

    // Insérer les permissions
    for (const [code, name, description, category] of defaultPermissions) {
      await db.run(
        'INSERT OR IGNORE INTO permissions (code, name, description, category) VALUES (?, ?, ?, ?)',
        [code, name, description, category]
      );
    }

    console.log(`✅ ${defaultPermissions.length} permissions initialisées\n`);

    // Attribuer toutes les permissions à l'admin par défaut
    const admin = await db.get('SELECT id FROM admins WHERE username = ?', ['admin']);
    if (admin) {
      const permissions = await db.all('SELECT id FROM permissions');
      for (const permission of permissions) {
        await db.run(
          'INSERT OR IGNORE INTO admin_permissions (admin_id, permission_id) VALUES (?, ?)',
          [admin.id, permission.id]
        );
      }
      console.log('✅ Toutes les permissions attribuées à l\'admin par défaut\n');
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
