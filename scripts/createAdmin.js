const bcrypt = require('bcryptjs');
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

async function createAdmin() {
  try {
    console.log('\n🔧 === CRÉATION D\'UN NOUVEL ADMINISTRATEUR ===\n');

    // Demander les informations
    const username = await question('👤 Nom d\'utilisateur: ');
    const email = await question('📧 Email: ');
    const password = await question('🔑 Mot de passe: ');
    const confirmPassword = await question('🔑 Confirmer le mot de passe: ');

    // Validation
    if (!username || username.trim() === '') {
      console.log('\n❌ Le nom d\'utilisateur est requis.');
      rl.close();
      process.exit(1);
    }

    if (!email || !email.includes('@')) {
      console.log('\n❌ Email invalide.');
      rl.close();
      process.exit(1);
    }

    if (!password || password.length < 6) {
      console.log('\n❌ Le mot de passe doit contenir au moins 6 caractères.');
      rl.close();
      process.exit(1);
    }

    if (password !== confirmPassword) {
      console.log('\n❌ Les mots de passe ne correspondent pas.');
      rl.close();
      process.exit(1);
    }

    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.admins.findUnique({
      where: { username: username.trim() }
    });

    if (existingAdmin) {
      console.log('\n❌ Un administrateur avec ce nom d\'utilisateur existe déjà.');
      rl.close();
      process.exit(1);
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'admin
    const newAdmin = await prisma.admins.create({
      data: {
        username: username.trim(),
        password: hashedPassword,
        email: email.trim(),
        is_active: true
      }
    });

    console.log('\n✅ Administrateur créé avec succès !\n');
    console.log('   ID:       ', newAdmin.id);
    console.log('   Username: ', username.trim());
    console.log('   Email:    ', email.trim());

    // Attribuer toutes les permissions
    const permissions = await prisma.permissions.findMany();

    if (permissions.length > 0) {
      for (const permission of permissions) {
        await prisma.admin_permissions.create({
          data: {
            admin_id: newAdmin.id,
            permission_id: permission.id
          }
        }).catch(() => {});
      }
      console.log(`\n✅ ${permissions.length} permissions attribuées`);
    }

    console.log('\n🔐 Connectez-vous sur: http://localhost:3000/admin/login\n');

    rl.close();
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

createAdmin();
