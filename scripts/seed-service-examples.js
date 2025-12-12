const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script pour créer des exemples de configuration de services
 *
 * Catégories disponibles:
 * - money_exchange: Échange d'argent (TMoney ↔ Flooz)
 * - credit: Achat de crédit (TMoney → Crédit Togocel/Moov)
 * - subscription: Abonnements (Canalbox, Fibre YAS)
 * - purchase: Achats (Cash Power, TDE)
 * - bank_service: Services bancaires (Ecobank, Coris Money, Orabank)
 */

async function seed() {
  console.log('🌱 Début du seeding des exemples de services...\n');

  try {
    // 1. Récupérer les méthodes de paiement existantes
    const tmoney = await prisma.payment_methods.findFirst({ where: { code: 'TMONEY' } });
    const flooz = await prisma.payment_methods.findFirst({ where: { code: 'FLOOZ' } });

    if (!tmoney || !flooz) {
      console.log('❌ Les méthodes de paiement TMoney et Flooz doivent exister');
      return;
    }

    // 2. Créer des exemples de méthodes de paiement pour les services
    console.log('📝 Création des méthodes de paiement pour les services...');

    const togocel = await prisma.payment_methods.upsert({
      where: { code: 'TOGOCEL' },
      update: {},
      create: {
        name: 'Crédit Togocel',
        code: 'TOGOCEL',
        icon: '📱',
        description: 'Crédit de communication Togocel',
        is_active: true
      }
    });

    const moov = await prisma.payment_methods.upsert({
      where: { code: 'MOOV' },
      update: {},
      create: {
        name: 'Crédit Moov',
        code: 'MOOV',
        icon: '📱',
        description: 'Crédit de communication Moov',
        is_active: true
      }
    });

    const canalbox = await prisma.payment_methods.upsert({
      where: { code: 'CANALBOX' },
      update: {},
      create: {
        name: 'Canalbox',
        code: 'CANALBOX',
        icon: '📺',
        description: 'Abonnement Canalbox',
        is_active: true
      }
    });

    const fibreYas = await prisma.payment_methods.upsert({
      where: { code: 'FIBRE_YAS' },
      update: {},
      create: {
        name: 'Fibre YAS',
        code: 'FIBRE_YAS',
        icon: '🌐',
        description: 'Abonnement Internet Fibre YAS',
        is_active: true
      }
    });

    const cashPower = await prisma.payment_methods.upsert({
      where: { code: 'CASH_POWER' },
      update: {},
      create: {
        name: 'Cash Power',
        code: 'CASH_POWER',
        icon: '⚡',
        description: 'Achat de crédit électrique',
        is_active: true
      }
    });

    const tde = await prisma.payment_methods.upsert({
      where: { code: 'TDE' },
      update: {},
      create: {
        name: 'TDE',
        code: 'TDE',
        icon: '💧',
        description: 'Paiement facture TDE',
        is_active: true
      }
    });

    const ecobank = await prisma.payment_methods.upsert({
      where: { code: 'ECOBANK' },
      update: {},
      create: {
        name: 'Ecobank',
        code: 'ECOBANK',
        icon: '🏦',
        description: 'Retrait Ecobank via code jeton',
        is_active: true
      }
    });

    console.log('✅ Méthodes de paiement créées\n');

    // 3. EXEMPLE 1: TMoney → Crédit Togocel (AUTOMATIQUE)
    console.log('📝 Création: TMoney → Crédit Togocel (automatique)...');
    await prisma.exchange_pairs.upsert({
      where: {
        from_method_id_to_method_id: {
          from_method_id: tmoney.id,
          to_method_id: togocel.id
        }
      },
      update: {},
      create: {
        from_method_id: tmoney.id,
        to_method_id: togocel.id,
        category: 'credit',
        fee_percentage: 2,
        tax_amount: 0,
        min_amount: 500,
        max_amount: 50000,
        payment_syntax_type: 'TEXTE',
        payment_syntax_value: '*155*5*montant*90000000#',
        requires_additional_info: false,
        automatic_processing: true, // ✅ Livraison automatique
        instruction_title: null,
        instruction_content: null,
        is_active: true
      }
    });
    console.log('✅ TMoney → Crédit Togocel créé\n');

    // 4. EXEMPLE 2: Flooz → Crédit Moov (AUTOMATIQUE)
    console.log('📝 Création: Flooz → Crédit Moov (automatique)...');
    await prisma.exchange_pairs.upsert({
      where: {
        from_method_id_to_method_id: {
          from_method_id: flooz.id,
          to_method_id: moov.id
        }
      },
      update: {},
      create: {
        from_method_id: flooz.id,
        to_method_id: moov.id,
        category: 'credit',
        fee_percentage: 2,
        tax_amount: 0,
        min_amount: 500,
        max_amount: 50000,
        payment_syntax_type: 'TEXTE',
        payment_syntax_value: '*155*montant*90000000#',
        requires_additional_info: false,
        automatic_processing: true, // ✅ Livraison automatique
        is_active: true
      }
    });
    console.log('✅ Flooz → Crédit Moov créé\n');

    // 5. EXEMPLE 3: TMoney → Canalbox (MANUEL avec infos additionnelles)
    console.log('📝 Création: TMoney → Canalbox (manuel)...');
    const canalboxPair = await prisma.exchange_pairs.upsert({
      where: {
        from_method_id_to_method_id: {
          from_method_id: tmoney.id,
          to_method_id: canalbox.id
        }
      },
      update: {},
      create: {
        from_method_id: tmoney.id,
        to_method_id: canalbox.id,
        category: 'subscription',
        fee_percentage: 0,
        tax_amount: 500,
        min_amount: 5000,
        max_amount: 50000,
        payment_syntax_type: 'TEXTE',
        payment_syntax_value: '*155*6*montant*CODE_MARCHAND#',
        requires_additional_info: true, // ⚠️ Client doit fournir nom, prénom, référence
        automatic_processing: false, // ❌ Validation manuelle requise
        instruction_title: 'Comment souscrire à Canalbox?',
        instruction_content: 'Après paiement, veuillez fournir vos nom et prénoms ainsi que votre numéro de décodeur.',
        instruction_link_url: 'https://www.canalplus-afrique.com',
        instruction_link_text: 'Voir les offres Canalbox',
        is_active: true
      }
    });

    // Ajouter des champs dynamiques pour Canalbox
    await prisma.exchange_fields.createMany({
      data: [
        {
          exchange_pair_id: canalboxPair.id,
          field_name: 'subscriber_name',
          field_type: 'text',
          field_label: 'Nom et prénoms',
          placeholder: 'Ex: KOFFI Jean',
          is_required: true,
          field_order: 0
        },
        {
          exchange_pair_id: canalboxPair.id,
          field_name: 'decoder_number',
          field_type: 'text',
          field_label: 'Numéro de décodeur',
          placeholder: 'Ex: 123456789',
          is_required: true,
          field_order: 1
        }
      ],
      skipDuplicates: true
    });
    console.log('✅ TMoney → Canalbox créé avec champs additionnels\n');

    // 6. EXEMPLE 4: TMoney → Ecobank (Service bancaire avec instructions)
    console.log('📝 Création: TMoney → Ecobank (service bancaire)...');
    const ecobankPair = await prisma.exchange_pairs.upsert({
      where: {
        from_method_id_to_method_id: {
          from_method_id: tmoney.id,
          to_method_id: ecobank.id
        }
      },
      update: {},
      create: {
        from_method_id: tmoney.id,
        to_method_id: ecobank.id,
        category: 'bank_service',
        fee_percentage: 0,
        tax_amount: 0,
        min_amount: 1000,
        max_amount: 500000,
        payment_syntax_type: 'TEXTE',
        payment_syntax_value: 'Générer un code de retrait depuis l\'app Ecobank Mobile',
        requires_additional_info: true, // ⚠️ Client doit fournir le code jeton
        automatic_processing: false, // ❌ Validation manuelle requise
        instruction_title: 'Comment générer un code de retrait Ecobank?',
        instruction_content: `1. Ouvrez l'application Ecobank Mobile
2. Allez dans "Retrait sans carte"
3. Sélectionnez "Code agent Xpress"
4. Entrez le montant et validez
5. Copiez le code généré et soumettez-le ici avec vos informations`,
        instruction_link_url: 'https://ecobank.com/tg/personal-banking/mobile-app',
        instruction_link_text: 'Télécharger Ecobank Mobile',
        is_active: true
      }
    });

    // Ajouter des champs pour Ecobank
    await prisma.exchange_fields.createMany({
      data: [
        {
          exchange_pair_id: ecobankPair.id,
          field_name: 'withdrawal_code',
          field_type: 'text',
          field_label: 'Code de retrait',
          placeholder: 'Ex: 123456',
          is_required: true,
          field_order: 0
        },
        {
          exchange_pair_id: ecobankPair.id,
          field_name: 'full_name',
          field_type: 'text',
          field_label: 'Nom et prénoms',
          placeholder: 'Ex: KOFFI Jean',
          is_required: true,
          field_order: 1
        }
      ],
      skipDuplicates: true
    });
    console.log('✅ TMoney → Ecobank créé avec instructions\n');

    // 7. EXEMPLE 5: TMoney → Cash Power (Achat manuel)
    console.log('📝 Création: TMoney → Cash Power (achat)...');
    const cashPowerPair = await prisma.exchange_pairs.upsert({
      where: {
        from_method_id_to_method_id: {
          from_method_id: tmoney.id,
          to_method_id: cashPower.id
        }
      },
      update: {},
      create: {
        from_method_id: tmoney.id,
        to_method_id: cashPower.id,
        category: 'purchase',
        fee_percentage: 0,
        tax_amount: 100,
        min_amount: 500,
        max_amount: 100000,
        payment_syntax_type: 'TEXTE',
        payment_syntax_value: '*155*7*montant*CODE_MARCHAND#',
        requires_additional_info: true, // ⚠️ Client doit fournir numéro de compteur
        automatic_processing: false, // ❌ Validation manuelle requise
        instruction_title: 'Achat de crédit Cash Power',
        instruction_content: 'Veuillez fournir votre numéro de compteur après paiement.',
        is_active: true
      }
    });

    await prisma.exchange_fields.createMany({
      data: [
        {
          exchange_pair_id: cashPowerPair.id,
          field_name: 'meter_number',
          field_type: 'text',
          field_label: 'Numéro de compteur',
          placeholder: 'Ex: 12345678901234',
          is_required: true,
          field_order: 0
        }
      ],
      skipDuplicates: true
    });
    console.log('✅ TMoney → Cash Power créé\n');

    console.log('✅ Seeding terminé avec succès!\n');
    console.log('📊 Résumé des catégories créées:');
    console.log('   - credit: 2 échanges (automatique)');
    console.log('   - subscription: 1 échange (manuel)');
    console.log('   - bank_service: 1 échange (manuel)');
    console.log('   - purchase: 1 échange (manuel)');
    console.log('\n💡 Tous les services avec automatic_processing=false nécessitent une validation manuelle par un admin.');

  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
