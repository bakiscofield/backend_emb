const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPaymentMethods() {
  console.log('🚀 Ajout des moyens de paiement manquants...\n');

  try {
    // 1. Flooz
    const flooz = await prisma.payment_methods.upsert({
      where: { code: 'FLOOZ' },
      update: {
        icon: '💙',
        description: 'Flooz - Paiement mobile Moov'
      },
      create: {
        name: 'Flooz',
        code: 'FLOOZ',
        icon: '💙',
        description: 'Flooz - Paiement mobile Moov',
        is_active: true
      }
    });
    console.log('✅ Flooz:', flooz.id);

    // 2. Mix by YAS
    const mixYas = await prisma.payment_methods.upsert({
      where: { code: 'MIX_YAS' },
      update: {},
      create: {
        name: 'Mix by YAS',
        code: 'MIX_YAS',
        icon: '🌐',
        description: 'Mix by YAS - Internet et services',
        is_active: true
      }
    });
    console.log('✅ Mix by YAS:', mixYas.id);

    // 3. Orabank
    const orabank = await prisma.payment_methods.upsert({
      where: { code: 'ORABANK' },
      update: {},
      create: {
        name: 'Orabank',
        code: 'ORABANK',
        icon: '🏦',
        description: 'Orabank - Services bancaires',
        is_active: true
      }
    });
    console.log('✅ Orabank:', orabank.id);

    // 4. Coris Money
    const corisMoney = await prisma.payment_methods.upsert({
      where: { code: 'CORIS_MONEY' },
      update: {},
      create: {
        name: 'Coris Money',
        code: 'CORIS_MONEY',
        icon: '💰',
        description: 'Coris Money - Transfert d\'argent',
        is_active: true
      }
    });
    console.log('✅ Coris Money:', corisMoney.id);

    console.log('\n✅ Tous les moyens de paiement ont été ajoutés avec succès!');
  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addPaymentMethods()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
