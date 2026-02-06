const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initDatabase() {
  try {
    console.log('Initialisation de la base de donnees...\n');

    // Vérifier si un admin existe déjà
    const existingAdmin = await prisma.admins.findUnique({
      where: { username: 'admin' }
    });

    if (!existingAdmin) {
      const defaultPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await prisma.admins.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          email: 'admin@emb.com',
          is_active: true
        }
      });

      console.log('Administrateur par defaut cree !');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   CHANGEZ CE MOT DE PASSE EN PRODUCTION !\n');
    } else {
      console.log('Un administrateur existe deja.\n');
    }

    // Initialiser les permissions par défaut
    console.log('Initialisation des permissions...\n');

    const defaultPermissions = [
      // Gestion des échanges
      ['MANAGE_EXCHANGE_PAIRS', 'Gérer les paires d\'échange', 'Créer, modifier, supprimer les paires d\'échange et leurs syntaxes', 'EXCHANGES'],
      ['MANAGE_PAYMENT_METHODS', 'Gérer les moyens de paiement', 'Créer, modifier, supprimer les moyens de paiement', 'EXCHANGES'],

      // Gestion des transactions
      ['VIEW_TRANSACTIONS', 'Voir les transactions', 'Consulter toutes les transactions', 'TRANSACTIONS'],
      ['VALIDATE_TRANSACTIONS', 'Valider les transactions', 'Approuver ou rejeter les transactions', 'TRANSACTIONS'],
      ['VIEW_TRANSACTION_STATS', 'Voir les statistiques', 'Accéder aux statistiques des transactions', 'TRANSACTIONS'],

      // Gestion des utilisateurs
      ['view_users', 'Voir les utilisateurs', 'Consulter la liste des utilisateurs et leurs informations', 'USERS'],
      ['manage_users', 'Gérer les utilisateurs', 'Activer/désactiver des utilisateurs et gérer leurs abonnements', 'USERS'],
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

    // Insérer les permissions (upsert pour éviter les doublons)
    for (const [code, name, description, category] of defaultPermissions) {
      await prisma.permissions.upsert({
        where: { code },
        update: { name, description, category },
        create: { code, name, description, category }
      });
    }

    console.log(`${defaultPermissions.length} permissions initialisees\n`);

    // Attribuer toutes les permissions à l'admin par défaut
    const admin = await prisma.admins.findUnique({
      where: { username: 'admin' }
    });

    if (admin) {
      const permissions = await prisma.permissions.findMany();
      for (const permission of permissions) {
        await prisma.admin_permissions.upsert({
          where: {
            admin_id_permission_id: {
              admin_id: admin.id,
              permission_id: permission.id
            }
          },
          update: {},
          create: {
            admin_id: admin.id,
            permission_id: permission.id
          }
        });
      }
      console.log('Toutes les permissions attribuees a l\'admin par defaut\n');
    }

    // Afficher les configurations
    const configs = await prisma.config.findMany();
    console.log('Configurations actuelles:');
    configs.forEach(config => {
      console.log(`   ${config.key}: ${config.value}`);
    });

    console.log('\nBase de donnees initialisee avec succes !');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

initDatabase();
