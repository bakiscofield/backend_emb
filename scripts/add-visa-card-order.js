const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script pour créer la paire d'échange pour la commande de carte Visa prépayée
 */

async function addVisaCardOrder() {
  console.log('🌱 Ajout de la commande de carte Visa prépayée...\n');

  try {
    // 1. Créer le moyen de paiement "Carte Visa Prépayée" s'il n'existe pas
    const visaCard = await prisma.payment_methods.upsert({
      where: { code: 'VISA_PREPAID' },
      update: {},
      create: {
        name: 'Carte Visa Prépayée',
        code: 'VISA_PREPAID',
        icon: '💳',
        description: 'Commande de carte Visa prépayée rechargeable',
        is_active: true
      }
    });

    console.log('✅ Moyen de paiement "Carte Visa Prépayée" créé\n');

    // 2. Récupérer TMoney (moyen de paiement FROM)
    const tmoney = await prisma.payment_methods.findFirst({
      where: { code: 'TMONEY' }
    });

    if (!tmoney) {
      console.log('❌ TMoney n\'existe pas. Veuillez d\'abord créer ce moyen de paiement.');
      return;
    }

    // 3. Créer la paire d'échange : TMoney → Carte Visa Prépayée
    console.log('📝 Création de la paire d\'échange TMoney → Carte Visa Prépayée...');

    const cardOrderPair = await prisma.exchange_pairs.upsert({
      where: {
        from_method_id_to_method_id: {
          from_method_id: tmoney.id,
          to_method_id: visaCard.id
        }
      },
      update: {},
      create: {
        from_method_id: tmoney.id,
        to_method_id: visaCard.id,
        category: 'card_order', // Nouvelle catégorie
        fee_percentage: 0, // Pas de frais (prix fixe)
        tax_amount: 0,
        min_amount: 15000, // Coût fixe de la carte : 15,000 FCFA
        max_amount: 15000, // Coût fixe de la carte : 15,000 FCFA
        payment_syntax_type: 'TEXTE',
        payment_syntax_value: 'Paiement pour commande de carte Visa prépayée',
        requires_additional_info: true, // ⚠️ Nécessite des infos additionnelles
        automatic_processing: false, // ❌ Traitement manuel requis
        instruction_title: 'Comment commander votre carte Visa prépayée?',
        instruction_content: `1. Remplissez le formulaire de commande avec vos informations personnelles
2. Uploadez une copie de votre pièce d'identité (CNI ou Passeport)
3. Choisissez votre mode de livraison (retrait en agence ou livraison à domicile)
4. Effectuez le paiement du montant de chargement initial
5. Un agent vous contactera sous 24-48h pour confirmer votre commande`,
        is_active: true
      }
    });

    console.log('✅ Paire d\'échange créée\n');

    // 4. Créer les champs dynamiques pour le formulaire de commande
    console.log('📝 Ajout des champs du formulaire de commande...\n');

    const fields = [
      // Informations personnelles
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'full_name',
        field_type: 'text',
        field_label: 'Nom et prénom',
        placeholder: 'Ex: KOFFI Jean',
        is_required: true,
        field_order: 0
      },
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'phone',
        field_type: 'tel',
        field_label: 'Numéro de téléphone',
        placeholder: 'Ex: 90123456',
        is_required: true,
        field_order: 1
      },
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'email',
        field_type: 'email',
        field_label: 'Adresse e-mail',
        placeholder: 'Ex: votreemail@example.com',
        is_required: false,
        field_order: 2
      },
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'city',
        field_type: 'text',
        field_label: 'Ville / Quartier',
        placeholder: 'Ex: Lomé / Nyékonakpoè',
        is_required: true,
        field_order: 3
      },
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'country',
        field_type: 'select',
        field_label: 'Pays',
        placeholder: '',
        options: JSON.stringify(['Togo', 'Bénin', 'Burkina Faso', 'Côte d\'Ivoire', 'Niger', 'Sénégal', 'Mali']),
        is_required: true,
        field_order: 4
      },

      // Détails de la carte
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'card_type',
        field_type: 'select',
        field_label: 'Type de carte',
        placeholder: '',
        options: JSON.stringify(['Visa Prépayée (physique)']),
        is_required: true,
        field_order: 5
      },
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'currency',
        field_type: 'select',
        field_label: 'Devise',
        placeholder: '',
        options: JSON.stringify(['FCFA', 'USD', 'EUR']),
        is_required: true,
        field_order: 6
      },

      // Mode de paiement
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'payment_method',
        field_type: 'select',
        field_label: 'Moyen de paiement',
        placeholder: '',
        options: JSON.stringify(['TMoney', 'Flooz', 'Service bancaire', 'Autre']),
        is_required: true,
        field_order: 7
      },
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'payment_account',
        field_type: 'text',
        field_label: 'Numéro du compte de paiement',
        placeholder: 'Ex: 90123456',
        is_required: true,
        field_order: 8
      },

      // Livraison
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'delivery_mode',
        field_type: 'select',
        field_label: 'Mode de livraison',
        placeholder: '',
        options: JSON.stringify(['Retrait en agence', 'Livraison à domicile']),
        is_required: true,
        field_order: 9
      },
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'delivery_fees',
        field_type: 'select',
        field_label: 'Frais de livraison',
        placeholder: '',
        options: JSON.stringify(['Gratuit (Retrait en agence)', '2,000 FCFA (Livraison à domicile)']),
        is_required: true,
        field_order: 10
      },
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'delivery_address',
        field_type: 'textarea',
        field_label: 'Adresse de livraison (requis pour livraison à domicile)',
        placeholder: 'Indiquez une adresse précise ou utilisez Google Maps',
        is_required: false,
        field_order: 11
      },

      // Justificatif d'identité
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'id_type',
        field_type: 'select',
        field_label: 'Type de pièce d\'identité',
        placeholder: '',
        options: JSON.stringify(['Carte d\'identité', 'Passeport']),
        is_required: true,
        field_order: 12
      },
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'id_document',
        field_type: 'file',
        field_label: 'Pièce d\'identité (JPG, PNG, PDF - max 5MB)',
        placeholder: '',
        is_required: true,
        field_order: 13
      },

      // Conditions
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'confirm_info',
        field_type: 'checkbox',
        field_label: 'Je confirme que les informations fournies sont exactes',
        placeholder: '',
        is_required: true,
        field_order: 14
      },
      {
        exchange_pair_id: cardOrderPair.id,
        field_name: 'accept_terms',
        field_type: 'checkbox',
        field_label: 'J\'accepte les conditions générales d\'utilisation d\'Emile Transfer +',
        placeholder: '',
        is_required: true,
        field_order: 15
      }
    ];

    // Insérer tous les champs
    for (const field of fields) {
      await prisma.exchange_fields.create({
        data: field
      });
      console.log(`  ✅ Champ ajouté: ${field.field_label}`);
    }

    console.log('\n✅ Tous les champs ont été ajoutés avec succès!\n');
    console.log('📊 Résumé:');
    console.log(`   - Catégorie: card_order (Commande de carte)`);
    console.log(`   - Paire d'échange: TMoney → Carte Visa Prépayée`);
    console.log(`   - Coût fixe: 15,000 FCFA`);
    console.log(`   - Frais de livraison: Gratuit (retrait) / 2,000 FCFA (domicile)`);
    console.log(`   - Nombre de champs: ${fields.length}`);
    console.log(`   - Traitement: Manuel (nécessite validation admin)`);
    console.log('\n💡 La commande de carte Visa est maintenant disponible dans l\'application!\n');

  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addVisaCardOrder()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
