const prisma = require('../config/prisma');

async function grantAllPermissions() {
  try {
    console.log('🔧 Attribution de toutes les permissions à l\'admin principal...\n');

    // Récupérer le premier admin (probablement le compte principal)
    const admin = await prisma.admins.findFirst({
      orderBy: {
        id: 'asc'
      }
    });

    if (!admin) {
      console.error('❌ Aucun administrateur trouvé !');
      console.log('💡 Créez d\'abord un admin via /admin/login\n');
      process.exit(1);
    }

    console.log(`👤 Admin trouvé: ${admin.username} (ID: ${admin.id})`);

    // Récupérer toutes les permissions
    const allPermissions = await prisma.permissions.findMany();

    if (allPermissions.length === 0) {
      console.error('❌ Aucune permission trouvée dans la base de données !');
      console.log('💡 Assurez-vous que les permissions ont été créées\n');
      process.exit(1);
    }

    console.log(`📋 ${allPermissions.length} permissions trouvées\n`);

    // Supprimer les permissions actuelles de l'admin
    await prisma.admin_permissions.deleteMany({
      where: {
        admin_id: admin.id
      }
    });

    console.log('🗑️  Permissions actuelles supprimées');

    // Attribuer toutes les permissions
    const permissionsData = allPermissions.map(perm => ({
      admin_id: admin.id,
      permission_id: perm.id
    }));

    await prisma.admin_permissions.createMany({
      data: permissionsData
    });

    console.log('✅ Toutes les permissions ont été attribuées !\n');

    // Afficher les permissions par catégorie
    const grouped = allPermissions.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }
      acc[perm.category].push(perm.name);
      return acc;
    }, {});

    console.log('📊 Permissions attribuées par catégorie:');
    Object.entries(grouped).forEach(([category, perms]) => {
      console.log(`\n   ${category}:`);
      perms.forEach(perm => {
        console.log(`   • ${perm}`);
      });
    });

    console.log('\n✅ Terminé avec succès !');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

grantAllPermissions();
