const prisma = require('./config/prisma');

async function checkPushSubscriptions() {
  console.log('🔍 Vérification des souscriptions push...\n');

  try {
    // Compter les souscriptions par type
    const userSubscriptions = await prisma.push_subscriptions.count({
      where: { user_id: { not: null } }
    });

    const adminSubscriptions = await prisma.push_subscriptions.count({
      where: { admin_id: { not: null } }
    });

    const totalSubscriptions = await prisma.push_subscriptions.count();

    console.log('📊 Statistiques:');
    console.log(`   Total: ${totalSubscriptions}`);
    console.log(`   Utilisateurs: ${userSubscriptions}`);
    console.log(`   Admins: ${adminSubscriptions}\n`);

    // Lister les souscriptions avec détails
    const subscriptions = await prisma.push_subscriptions.findMany({
      include: {
        users: {
          select: { id: true, name: true, email: true }
        },
        admins: {
          select: { id: true, username: true }
        }
      }
    });

    if (subscriptions.length === 0) {
      console.log('❌ Aucune souscription trouvée.');
      console.log('\n💡 Pour activer les notifications push:');
      console.log('   1. Ouvrez l\'application en tant qu\'utilisateur');
      console.log('   2. Allez dans Paramètres > Notifications');
      console.log('   3. Activez les notifications push');
      console.log('   4. Autorisez les notifications dans votre navigateur\n');
    } else {
      console.log('✅ Souscriptions trouvées:\n');
      subscriptions.forEach((sub, index) => {
        const owner = sub.users
          ? `👤 ${sub.users.name} (${sub.users.email})`
          : sub.admins
          ? `👨‍💼 Admin: ${sub.admins.username}`
          : '❓ Inconnu';

        console.log(`${index + 1}. ${owner}`);
        console.log(`   ID: ${sub.id}`);
        console.log(`   Endpoint: ${sub.endpoint.substring(0, 50)}...`);
        console.log(`   Créé le: ${sub.created_at}\n`);
      });
    }

    // Vérifier les clés VAPID
    console.log('🔑 Configuration VAPID:');
    console.log(`   Public Key: ${process.env.VAPID_PUBLIC_KEY ? '✅ Configurée' : '❌ Manquante'}`);
    console.log(`   Private Key: ${process.env.VAPID_PRIVATE_KEY ? '✅ Configurée' : '❌ Manquante'}`);
    console.log(`   Email: ${process.env.VAPID_EMAIL || '❌ Manquant'}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPushSubscriptions();
