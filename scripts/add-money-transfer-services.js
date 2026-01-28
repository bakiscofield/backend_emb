const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script pour créer les services de transfert d'argent
 * Western Union, RIA, MoneyGram avec préenregistrement
 */

async function addMoneyTransferServices() {
  console.log('🌱 Ajout des services de transfert d\'argent...\n');

  try {
    // 1. Créer les moyens de paiement pour chaque service
    console.log('📝 Création des moyens de paiement...\n');

    const westernUnion = await prisma.payment_methods.upsert({
      where: { code: 'WESTERN_UNION' },
      update: {},
      create: {
        name: 'Western Union',
        code: 'WESTERN_UNION',
        icon: '💸',
        description: 'Transfert d\'argent international Western Union',
        is_active: true
      }
    });
    console.log('  ✅ Western Union créé');

    const ria = await prisma.payment_methods.upsert({
      where: { code: 'RIA' },
      update: {},
      create: {
        name: 'RIA Money Transfer',
        code: 'RIA',
        icon: '💵',
        description: 'Transfert d\'argent international RIA',
        is_active: true
      }
    });
    console.log('  ✅ RIA créé');

    const moneyGram = await prisma.payment_methods.upsert({
      where: { code: 'MONEYGRAM' },
      update: {},
      create: {
        name: 'MoneyGram',
        code: 'MONEYGRAM',
        icon: '💰',
        description: 'Transfert d\'argent international MoneyGram',
        is_active: true
      }
    });
    console.log('  ✅ MoneyGram créé\n');

    // 2. Récupérer TMoney comme moyen de paiement FROM
    const tmoney = await prisma.payment_methods.findFirst({
      where: { code: 'TMONEY' }
    });

    if (!tmoney) {
      console.log('❌ TMoney n\'existe pas. Veuillez d\'abord créer ce moyen de paiement.');
      return;
    }

    // 3. Créer les paires d'échange pour chaque service
    const services = [
      { service: westernUnion, name: 'Western Union' },
      { service: ria, name: 'RIA' },
      { service: moneyGram, name: 'MoneyGram' }
    ];

    for (const { service, name } of services) {
      console.log(`📝 Création de la paire d'échange: TMoney → ${name}...\n`);

      const transferPair = await prisma.exchange_pairs.upsert({
        where: {
          from_method_id_to_method_id: {
            from_method_id: tmoney.id,
            to_method_id: service.id
          }
        },
        update: {},
        create: {
          from_method_id: tmoney.id,
          to_method_id: service.id,
          category: 'money_transfer', // Nouvelle catégorie
          fee_percentage: 3, // Frais de 3%
          tax_amount: 0,
          min_amount: 1000, // Montant minimum
          max_amount: 5000000, // Montant maximum
          payment_syntax_type: 'TEXTE',
          payment_syntax_value: `Préenregistrement ${name}`,
          requires_additional_info: true,
          automatic_processing: false, // Traitement manuel
          instruction_title: `Comment effectuer un transfert ${name}?`,
          instruction_content: `1. Remplissez le formulaire de préenregistrement
2. Choisissez votre type d'opération (Envoi ou Retrait)
3. Uploadez une copie de votre pièce d'identité
4. Sélectionnez le point de vente le plus proche
5. Présentez-vous au point de vente avec votre pièce d'identité pour finaliser l'opération

⚠️ Ce préenregistrement ne constitue pas encore l'opération finale.`,
          is_active: true
        }
      });

      console.log(`  ✅ Paire d'échange créée: ${name}\n`);

      // 4. Créer les champs du formulaire
      console.log(`  📝 Ajout des champs pour ${name}...\n`);

      const fields = [
        // 1. Type d'opération
        {
          exchange_pair_id: transferPair.id,
          field_name: 'operation_type',
          field_type: 'select',
          field_label: 'Type d\'opération',
          placeholder: '',
          options: JSON.stringify(['Envoi d\'argent', 'Retrait d\'argent']),
          is_required: true,
          field_order: 0
        },

        // 2. Service (pré-rempli mais visible)
        {
          exchange_pair_id: transferPair.id,
          field_name: 'transfer_service',
          field_type: 'text',
          field_label: 'Service de transfert',
          placeholder: name,
          is_required: false,
          field_order: 1
        },

        // 3. Informations du client
        {
          exchange_pair_id: transferPair.id,
          field_name: 'client_name',
          field_type: 'text',
          field_label: 'Nom et prénom',
          placeholder: 'Ex: KOFFI Jean',
          is_required: true,
          field_order: 2
        },
        {
          exchange_pair_id: transferPair.id,
          field_name: 'client_phone',
          field_type: 'tel',
          field_label: 'Numéro de téléphone',
          placeholder: 'Ex: 90123456',
          is_required: true,
          field_order: 3
        },
        {
          exchange_pair_id: transferPair.id,
          field_name: 'client_email',
          field_type: 'email',
          field_label: 'Adresse e-mail',
          placeholder: 'Ex: votreemail@example.com',
          is_required: false,
          field_order: 4
        },
        {
          exchange_pair_id: transferPair.id,
          field_name: 'client_location',
          field_type: 'text',
          field_label: 'Pays / Ville',
          placeholder: 'Ex: Togo / Lomé',
          is_required: true,
          field_order: 5
        },

        // 4. Détails de l'opération - ENVOI
        {
          exchange_pair_id: transferPair.id,
          field_name: 'send_amount',
          field_type: 'number',
          field_label: 'Montant à envoyer (pour envoi)',
          placeholder: 'Ex: 50000',
          is_required: false,
          field_order: 6
        },
        {
          exchange_pair_id: transferPair.id,
          field_name: 'send_currency',
          field_type: 'select',
          field_label: 'Devise (pour envoi)',
          placeholder: '',
          options: JSON.stringify(['FCFA', 'USD', 'EUR', 'GBP']),
          is_required: false,
          field_order: 7
        },
        {
          exchange_pair_id: transferPair.id,
          field_name: 'destination_country',
          field_type: 'text',
          field_label: 'Pays de destination (pour envoi)',
          placeholder: 'Ex: France',
          is_required: false,
          field_order: 8
        },
        {
          exchange_pair_id: transferPair.id,
          field_name: 'beneficiary_name',
          field_type: 'text',
          field_label: 'Nom et prénom du bénéficiaire (pour envoi)',
          placeholder: 'Ex: DUPONT Marie',
          is_required: false,
          field_order: 9
        },
        {
          exchange_pair_id: transferPair.id,
          field_name: 'beneficiary_phone',
          field_type: 'tel',
          field_label: 'Numéro de téléphone du bénéficiaire (pour envoi)',
          placeholder: 'Ex: +33612345678',
          is_required: false,
          field_order: 10
        },

        // 4. Détails de l'opération - RETRAIT
        {
          exchange_pair_id: transferPair.id,
          field_name: 'mtcn_reference',
          field_type: 'text',
          field_label: 'Numéro de transaction MTCN / Référence (pour retrait)',
          placeholder: 'Ex: 123-456-7890',
          is_required: false,
          field_order: 11
        },
        {
          exchange_pair_id: transferPair.id,
          field_name: 'withdrawal_amount',
          field_type: 'number',
          field_label: 'Montant à retirer (pour retrait)',
          placeholder: 'Ex: 50000',
          is_required: false,
          field_order: 12
        },
        {
          exchange_pair_id: transferPair.id,
          field_name: 'withdrawal_currency',
          field_type: 'select',
          field_label: 'Devise (pour retrait)',
          placeholder: '',
          options: JSON.stringify(['FCFA', 'USD', 'EUR', 'GBP']),
          is_required: false,
          field_order: 13
        },
        {
          exchange_pair_id: transferPair.id,
          field_name: 'origin_country',
          field_type: 'text',
          field_label: 'Pays d\'origine (pour retrait)',
          placeholder: 'Ex: France',
          is_required: false,
          field_order: 14
        },

        // 5. Mode de paiement
        {
          exchange_pair_id: transferPair.id,
          field_name: 'payment_method',
          field_type: 'select',
          field_label: 'Moyen de paiement',
          placeholder: '',
          options: JSON.stringify(['Espèces (au point de vente)', 'Paiement virtuel (Mobile Money / Service bancaire)']),
          is_required: true,
          field_order: 15
        },

        // 6. Pièce d'identité
        {
          exchange_pair_id: transferPair.id,
          field_name: 'id_type',
          field_type: 'select',
          field_label: 'Type de pièce d\'identité',
          placeholder: '',
          options: JSON.stringify(['Carte d\'identité', 'Passeport']),
          is_required: true,
          field_order: 16
        },
        {
          exchange_pair_id: transferPair.id,
          field_name: 'id_number',
          field_type: 'text',
          field_label: 'Numéro de la pièce',
          placeholder: 'Ex: TG123456789',
          is_required: true,
          field_order: 17
        },
        {
          exchange_pair_id: transferPair.id,
          field_name: 'id_document',
          field_type: 'file',
          field_label: 'Pièce d\'identité (JPG, PNG, PDF - max 5MB)',
          placeholder: '',
          is_required: true,
          field_order: 18
        },

        // 7. Point de vente
        {
          exchange_pair_id: transferPair.id,
          field_name: 'pickup_point',
          field_type: 'select',
          field_label: 'Point de vente le plus proche',
          placeholder: '',
          options: JSON.stringify([
            'Point Emile Transfer – AGOE-legbassito (☎ 79321168)',
            'Point Emile Transfer – AGOE-kossigan 2 (☎ 79321168)'
          ]),
          is_required: true,
          field_order: 19
        },

        // 8. Confirmation
        {
          exchange_pair_id: transferPair.id,
          field_name: 'confirm_accuracy',
          field_type: 'checkbox',
          field_label: 'Je confirme l\'exactitude des informations fournies',
          placeholder: '',
          is_required: true,
          field_order: 20
        },
        {
          exchange_pair_id: transferPair.id,
          field_name: 'confirm_preregistration',
          field_type: 'checkbox',
          field_label: 'Je comprends que ce préenregistrement ne constitue pas encore l\'opération finale et que je dois me rendre au point de vente avec une pièce d\'identité valide',
          placeholder: '',
          is_required: true,
          field_order: 21
        }
      ];

      // Vérifier si des champs existent déjà pour cette paire
      const existingFields = await prisma.exchange_fields.findMany({
        where: { exchange_pair_id: transferPair.id }
      });

      if (existingFields.length > 0) {
        console.log(`  ⚠️  ${existingFields.length} champs existent déjà pour ${name}, suppression et recréation...\n`);
        // Supprimer les champs existants pour éviter les doublons
        await prisma.exchange_fields.deleteMany({
          where: { exchange_pair_id: transferPair.id }
        });
      }

      // Insérer les champs
      for (const field of fields) {
        await prisma.exchange_fields.create({
          data: field
        });
      }

      console.log(`  ✅ ${fields.length} champs ajoutés pour ${name}\n`);
    }

    console.log('\n✅ Tous les services de transfert ont été créés avec succès!\n');
    console.log('📊 Résumé:');
    console.log('   - Catégorie: money_transfer (Transfert d\'argent)');
    console.log('   - Services: Western Union, RIA, MoneyGram');
    console.log('   - Nombre de champs par service: 22');
    console.log('   - Frais: 3%');
    console.log('   - Traitement: Manuel (préenregistrement)');
    console.log('\n💡 Les services de transfert d\'argent sont maintenant disponibles!\n');

  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addMoneyTransferServices()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
