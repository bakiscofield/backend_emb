const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function deleteAdmin() {
  try {
    // Lister tous les admins
    const admins = await prisma.admins.findMany({
      select: { id: true, username: true, email: true, is_active: true }
    });

    if (admins.length === 0) {
      console.log('\nAucun administrateur trouve.');
      rl.close();
      await prisma.$disconnect();
      process.exit(0);
    }

    console.log('\n=== LISTE DES ADMINISTRATEURS ===\n');
    admins.forEach(admin => {
      const status = admin.is_active ? 'actif' : 'inactif';
      console.log(`  [${admin.id}] ${admin.username} - ${admin.email || 'pas d\'email'} (${status})`);
    });

    const idInput = await question('\nID de l\'admin a supprimer: ');
    const adminId = parseInt(idInput);

    if (isNaN(adminId)) {
      console.log('\nID invalide.');
      rl.close();
      process.exit(1);
    }

    const admin = admins.find(a => a.id === adminId);
    if (!admin) {
      console.log('\nAdmin non trouve avec cet ID.');
      rl.close();
      process.exit(1);
    }

    const confirm = await question(`\nSupprimer "${admin.username}" (ID: ${admin.id}) ? (oui/non): `);

    if (confirm.toLowerCase() !== 'oui') {
      console.log('\nSuppression annulee.');
      rl.close();
      await prisma.$disconnect();
      process.exit(0);
    }

    // Supprimer les permissions de l'admin
    await prisma.admin_permissions.deleteMany({
      where: { admin_id: adminId }
    });

    // Supprimer l'admin
    await prisma.admins.delete({
      where: { id: adminId }
    });

    console.log(`\nAdmin "${admin.username}" supprime avec succes.`);

    rl.close();
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\nErreur:', error.message);
    rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

deleteAdmin();
