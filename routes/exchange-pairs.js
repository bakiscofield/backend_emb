const express = require('express');
const router = express.Router();

const prisma = require('../config/prisma');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

// Middleware pour vérifier si l'utilisateur est admin
const adminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé. Droits administrateur requis.'
    });
  }
  next();
};

// GET - Récupérer toutes les paires d'échanges avec détails (PUBLIC)
router.get('/', async (req, res) => {
  try {
    const { active_only } = req.query;

    const whereClause = {};

    if (active_only === 'true') {
      whereClause.is_active = true;
      whereClause.payment_methods_exchange_pairs_from_method_idTopayment_methods = {
        is_active: true
      };
      whereClause.payment_methods_exchange_pairs_to_method_idTopayment_methods = {
        is_active: true
      };
    }

    const pairs = await prisma.exchange_pairs.findMany({
      where: whereClause,
      include: {
        payment_methods_exchange_pairs_from_method_idTopayment_methods: true,
        payment_methods_exchange_pairs_to_method_idTopayment_methods: true,
        exchange_fields: {
          orderBy: { field_order: 'asc' }
        }
      },
      orderBy: { created_at: 'asc' }
    });

    // Format the response to match the original structure
    const formattedPairs = pairs.map(pair => {
      const fromMethod = pair.payment_methods_exchange_pairs_from_method_idTopayment_methods;
      const toMethod = pair.payment_methods_exchange_pairs_to_method_idTopayment_methods;

      return {
        ...pair,
        from_method_name: fromMethod.name,
        from_method_code: fromMethod.code,
        from_method_icon: fromMethod.icon,
        to_method_name: toMethod.name,
        to_method_code: toMethod.code,
        to_method_icon: toMethod.icon,
        fields: pair.exchange_fields.map(field => ({
          ...field,
          options: field.options ? JSON.parse(field.options) : null
        })),
        payment_methods_exchange_pairs_from_method_idTopayment_methods: undefined,
        payment_methods_exchange_pairs_to_method_idTopayment_methods: undefined,
        exchange_fields: undefined
      };
    });

    res.json({
      success: true,
      data: formattedPairs
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des paires d\'échanges:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET - Récupérer une paire d'échange par ID
router.get('/:id', async (req, res) => {
  try {
    const pair = await prisma.exchange_pairs.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        payment_methods_exchange_pairs_from_method_idTopayment_methods: true,
        payment_methods_exchange_pairs_to_method_idTopayment_methods: true,
        exchange_fields: {
          orderBy: { field_order: 'asc' }
        }
      }
    });

    if (!pair) {
      return res.status(404).json({
        success: false,
        message: 'Paire d\'échange introuvable'
      });
    }

    // Format the response
    const fromMethod = pair.payment_methods_exchange_pairs_from_method_idTopayment_methods;
    const toMethod = pair.payment_methods_exchange_pairs_to_method_idTopayment_methods;

    const formattedPair = {
      ...pair,
      from_method_name: fromMethod.name,
      from_method_code: fromMethod.code,
      from_method_icon: fromMethod.icon,
      to_method_name: toMethod.name,
      to_method_code: toMethod.code,
      to_method_icon: toMethod.icon,
      fields: pair.exchange_fields.map(field => ({
        ...field,
        options: field.options ? JSON.parse(field.options) : null
      })),
      payment_methods_exchange_pairs_from_method_idTopayment_methods: undefined,
      payment_methods_exchange_pairs_to_method_idTopayment_methods: undefined,
      exchange_fields: undefined
    };

    res.json({
      success: true,
      data: formattedPair
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la paire d\'échange:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST - Créer une nouvelle paire d'échange (ADMIN)
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  [
    body('from_method_id').isInt().withMessage('ID du moyen de paiement source invalide'),
    body('to_method_id').isInt().withMessage('ID du moyen de paiement destination invalide'),
    body('fee_percentage').optional().isFloat({ min: 0 }).withMessage('Le pourcentage de frais doit être >= 0'),
    body('tax_amount').optional().isFloat({ min: 0 }).withMessage('Le montant de taxe doit être >= 0'),
    body('min_amount').optional().isFloat({ min: 0 }).withMessage('Le montant minimum doit être >= 0'),
    body('max_amount').optional().isFloat({ min: 0 }).withMessage('Le montant maximum doit être >= 0'),
    body('payment_syntax_type').optional().isIn(['TEXTE', 'LIEN', 'AUTRE']).withMessage('Type de syntaxe invalide'),
    body('payment_syntax_value').optional().isString().withMessage('La valeur de syntaxe doit être une chaîne'),
    body('category').optional({ nullable: true, checkFalsy: true }).isIn(['money_exchange', 'credit', 'subscription', 'purchase', 'bank_service']).withMessage('Catégorie invalide'),
    body('requires_additional_info').optional({ nullable: true }).isBoolean().withMessage('requires_additional_info doit être un booléen'),
    body('automatic_processing').optional({ nullable: true }).isBoolean().withMessage('automatic_processing doit être un booléen'),
    body('instruction_title').optional({ nullable: true, checkFalsy: true }),
    body('instruction_content').optional({ nullable: true, checkFalsy: true }),
    body('instruction_link_url').optional({ nullable: true, checkFalsy: true }).custom((value) => {
      if (value && value.trim() !== '') {
        // Valider seulement si une URL est fournie
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(value)) {
          throw new Error('instruction_link_url doit être une URL valide');
        }
      }
      return true;
    }),
    body('instruction_link_text').optional({ nullable: true, checkFalsy: true }),
    body('from_number_label').optional({ nullable: true, checkFalsy: true }),
    body('from_number_placeholder').optional({ nullable: true, checkFalsy: true }),
    body('to_number_label').optional({ nullable: true, checkFalsy: true }),
    body('to_number_placeholder').optional({ nullable: true, checkFalsy: true }),
    body('show_to_number').optional({ nullable: true }).isBoolean().withMessage('show_to_number doit être un booléen'),
    body('amount_label').optional({ nullable: true, checkFalsy: true }),
    body('amount_placeholder').optional({ nullable: true, checkFalsy: true }),
    body('reference_required').optional({ nullable: true }).isBoolean().withMessage('reference_required doit être un booléen'),
    body('reference_label').optional({ nullable: true, checkFalsy: true }),
    body('reference_placeholder').optional({ nullable: true, checkFalsy: true }),
    body('validated_email_template_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Le template email de validation doit être un entier valide'),
    body('rejected_email_template_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Le template email de rejet doit être un entier valide'),
    body('fields').optional().isArray().withMessage('Les champs doivent être un tableau')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    try {
      const {
        from_method_id,
        to_method_id,
        fee_percentage,
        tax_amount,
        min_amount,
        max_amount,
        payment_syntax_type,
        payment_syntax_value,
        category,
        requires_additional_info,
        automatic_processing,
        instruction_title,
        instruction_content,
        instruction_link_url,
        instruction_link_text,
        from_number_label,
        from_number_placeholder,
        to_number_label,
        to_number_placeholder,
        show_to_number,
        amount_label,
        amount_placeholder,
        reference_required,
        reference_label,
        reference_placeholder,
        validated_email_template_id,
        rejected_email_template_id,
        fields
      } = req.body;

      // Vérifier que les deux méthodes sont différentes
      if (from_method_id === to_method_id) {
        return res.status(400).json({
          success: false,
          message: 'Les moyens de paiement source et destination doivent être différents'
        });
      }

      // Vérifier que les moyens de paiement existent
      const fromMethod = await prisma.payment_methods.findUnique({
        where: { id: from_method_id }
      });
      const toMethod = await prisma.payment_methods.findUnique({
        where: { id: to_method_id }
      });

      if (!fromMethod || !toMethod) {
        return res.status(404).json({
          success: false,
          message: 'Un ou plusieurs moyens de paiement introuvables'
        });
      }

      // Vérifier que la paire n'existe pas déjà
      const existing = await prisma.exchange_pairs.findFirst({
        where: {
          from_method_id,
          to_method_id
        }
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Cette paire d\'échange existe déjà'
        });
      }

      // Créer la paire d'échange avec ses champs
      // Les champs de configuration du formulaire ne sont utilisés que pour les abonnements
      const isSubscription = category === 'subscription';

      const newPair = await prisma.exchange_pairs.create({
        data: {
          from_method_id,
          to_method_id,
          fee_percentage: fee_percentage || 0,
          tax_amount: tax_amount || 0,
          min_amount: min_amount || 500,
          max_amount: max_amount || 500000,
          payment_syntax_type: payment_syntax_type || 'TEXTE',
          payment_syntax_value: payment_syntax_value || '',
          category: category || null,
          requires_additional_info: requires_additional_info || false,
          automatic_processing: automatic_processing || false,
          instruction_title: instruction_title || null,
          instruction_content: instruction_content || null,
          instruction_link_url: instruction_link_url || null,
          instruction_link_text: instruction_link_text || null,
          from_number_label: isSubscription ? (from_number_label || null) : null,
          from_number_placeholder: isSubscription ? (from_number_placeholder || null) : null,
          to_number_label: isSubscription ? (to_number_label || null) : null,
          to_number_placeholder: isSubscription ? (to_number_placeholder || null) : null,
          show_to_number: isSubscription ? (show_to_number !== undefined ? show_to_number : true) : true,
          amount_label: isSubscription ? (amount_label || 'Montant') : 'Montant',
          amount_placeholder: isSubscription ? (amount_placeholder || null) : null,
          reference_required: isSubscription ? (reference_required !== undefined ? reference_required : true) : true,
          reference_label: isSubscription ? (reference_label || 'Référence de paiement') : 'Référence de paiement',
          reference_placeholder: isSubscription ? (reference_placeholder || null) : null,
          validated_email_template_id,
          rejected_email_template_id,
          is_active: true,
          exchange_fields: fields && fields.length > 0 ? {
            create: fields.map((field, index) => ({
              field_name: field.field_name,
              field_type: field.field_type,
              field_label: field.field_label,
              placeholder: field.placeholder || null,
              is_required: field.is_required || false,
              options: field.options ? JSON.stringify(field.options) : null,
              field_order: index
            }))
          } : undefined
        },
        include: {
          payment_methods_exchange_pairs_from_method_idTopayment_methods: true,
          payment_methods_exchange_pairs_to_method_idTopayment_methods: true,
          exchange_fields: {
            orderBy: { field_order: 'asc' }
          }
        }
      });

      // Format the response
      const formattedPair = {
        ...newPair,
        from_method_name: fromMethod.name,
        from_method_code: fromMethod.code,
        from_method_icon: fromMethod.icon,
        to_method_name: toMethod.name,
        to_method_code: toMethod.code,
        to_method_icon: toMethod.icon,
        fields: newPair.exchange_fields.map(f => ({
          ...f,
          options: f.options ? JSON.parse(f.options) : null
        })),
        payment_methods_exchange_pairs_from_method_idTopayment_methods: undefined,
        payment_methods_exchange_pairs_to_method_idTopayment_methods: undefined,
        exchange_fields: undefined
      };

      res.status(201).json({
        success: true,
        message: 'Paire d\'échange créée avec succès',
        data: formattedPair
      });
    } catch (error) {
      console.error('Erreur lors de la création de la paire d\'échange:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// PUT - Mettre à jour une paire d'échange (ADMIN)
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [
    body('fee_percentage').optional().isFloat({ min: 0 }),
    body('tax_amount').optional().isFloat({ min: 0 }),
    body('min_amount').optional().isFloat({ min: 0 }),
    body('max_amount').optional().isFloat({ min: 0 }),
    body('is_active').optional().isBoolean(),
    body('payment_syntax_type').optional().isIn(['TEXTE', 'LIEN', 'AUTRE']).withMessage('Type de syntaxe invalide'),
    body('payment_syntax_value').optional().isString().withMessage('La valeur de syntaxe doit être une chaîne'),
    body('category').optional({ nullable: true, checkFalsy: true }).isIn(['money_exchange', 'credit', 'subscription', 'purchase', 'bank_service']).withMessage('Catégorie invalide'),
    body('requires_additional_info').optional({ nullable: true }).isBoolean().withMessage('requires_additional_info doit être un booléen'),
    body('automatic_processing').optional({ nullable: true }).isBoolean().withMessage('automatic_processing doit être un booléen'),
    body('instruction_title').optional({ nullable: true, checkFalsy: true }),
    body('instruction_content').optional({ nullable: true, checkFalsy: true }),
    body('instruction_link_url').optional({ nullable: true, checkFalsy: true }).custom((value) => {
      if (value && value.trim() !== '') {
        // Valider seulement si une URL est fournie
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(value)) {
          throw new Error('instruction_link_url doit être une URL valide');
        }
      }
      return true;
    }),
    body('instruction_link_text').optional({ nullable: true, checkFalsy: true }),
    body('from_number_label').optional({ nullable: true, checkFalsy: true }),
    body('from_number_placeholder').optional({ nullable: true, checkFalsy: true }),
    body('to_number_label').optional({ nullable: true, checkFalsy: true }),
    body('to_number_placeholder').optional({ nullable: true, checkFalsy: true }),
    body('show_to_number').optional({ nullable: true }).isBoolean(),
    body('amount_label').optional({ nullable: true, checkFalsy: true }),
    body('amount_placeholder').optional({ nullable: true, checkFalsy: true }),
    body('reference_required').optional({ nullable: true }).isBoolean(),
    body('reference_label').optional({ nullable: true, checkFalsy: true }),
    body('reference_placeholder').optional({ nullable: true, checkFalsy: true }),
    body('validated_email_template_id').optional().isInt({ min: 1 }).withMessage('Le template email de validation doit être un ID valide'),
    body('rejected_email_template_id').optional().isInt({ min: 1 }).withMessage('Le template email de rejet doit être un ID valide'),
    body('fields').optional().isArray()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    try {
      const { id } = req.params;
      const {
        fee_percentage,
        tax_amount,
        min_amount,
        max_amount,
        is_active,
        payment_syntax_type,
        payment_syntax_value,
        category,
        requires_additional_info,
        automatic_processing,
        instruction_title,
        instruction_content,
        instruction_link_url,
        instruction_link_text,
        from_number_label,
        from_number_placeholder,
        to_number_label,
        to_number_placeholder,
        show_to_number,
        amount_label,
        amount_placeholder,
        reference_required,
        reference_label,
        reference_placeholder,
        validated_email_template_id,
        rejected_email_template_id,
        fields
      } = req.body;

      // Vérifier si la paire existe
      const existing = await prisma.exchange_pairs.findUnique({
        where: { id: parseInt(id) }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Paire d\'échange introuvable'
        });
      }

      // Construire les données de mise à jour
      const updateData = {};

      if (fee_percentage !== undefined) updateData.fee_percentage = fee_percentage;
      if (tax_amount !== undefined) updateData.tax_amount = tax_amount;
      if (min_amount !== undefined) updateData.min_amount = min_amount;
      if (max_amount !== undefined) updateData.max_amount = max_amount;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (payment_syntax_type !== undefined) updateData.payment_syntax_type = payment_syntax_type;
      if (payment_syntax_value !== undefined) updateData.payment_syntax_value = payment_syntax_value;
      if (category !== undefined) updateData.category = category;
      if (requires_additional_info !== undefined) updateData.requires_additional_info = requires_additional_info;
      if (automatic_processing !== undefined) updateData.automatic_processing = automatic_processing;
      if (instruction_title !== undefined) updateData.instruction_title = instruction_title;
      if (instruction_content !== undefined) updateData.instruction_content = instruction_content;
      if (instruction_link_url !== undefined) updateData.instruction_link_url = instruction_link_url;
      if (instruction_link_text !== undefined) updateData.instruction_link_text = instruction_link_text;
      if (validated_email_template_id !== undefined) updateData.validated_email_template_id = validated_email_template_id;
      if (rejected_email_template_id !== undefined) updateData.rejected_email_template_id = rejected_email_template_id;

      // Les champs de configuration du formulaire ne sont utilisés que pour les abonnements
      const updatedCategory = category !== undefined ? category : existing.category;
      const isSubscription = updatedCategory === 'subscription';

      if (isSubscription) {
        // Mettre à jour les champs de configuration seulement pour les abonnements
        if (from_number_label !== undefined) updateData.from_number_label = from_number_label;
        if (from_number_placeholder !== undefined) updateData.from_number_placeholder = from_number_placeholder;
        if (to_number_label !== undefined) updateData.to_number_label = to_number_label;
        if (to_number_placeholder !== undefined) updateData.to_number_placeholder = to_number_placeholder;
        if (show_to_number !== undefined) updateData.show_to_number = show_to_number;
        if (amount_label !== undefined) updateData.amount_label = amount_label;
        if (amount_placeholder !== undefined) updateData.amount_placeholder = amount_placeholder;
        if (reference_required !== undefined) updateData.reference_required = reference_required;
        if (reference_label !== undefined) updateData.reference_label = reference_label;
        if (reference_placeholder !== undefined) updateData.reference_placeholder = reference_placeholder;
      } else {
        // Réinitialiser les champs de configuration si ce n'est plus un abonnement
        updateData.from_number_label = null;
        updateData.from_number_placeholder = null;
        updateData.to_number_label = null;
        updateData.to_number_placeholder = null;
        updateData.show_to_number = true;
        updateData.amount_label = 'Montant';
        updateData.amount_placeholder = null;
        updateData.reference_required = true;
        updateData.reference_label = 'Référence de paiement';
        updateData.reference_placeholder = null;
      }

      // Mettre à jour les champs si fournis
      if (fields !== undefined) {
        // Supprimer les anciens champs et créer les nouveaux
        await prisma.exchange_fields.deleteMany({
          where: { exchange_pair_id: parseInt(id) }
        });

        if (fields.length > 0) {
          await prisma.exchange_fields.createMany({
            data: fields.map((field, index) => ({
              exchange_pair_id: parseInt(id),
              field_name: field.field_name,
              field_type: field.field_type,
              field_label: field.field_label,
              placeholder: field.placeholder || null,
              is_required: field.is_required || false,
              options: field.options ? JSON.stringify(field.options) : null,
              field_order: index
            }))
          });
        }
      }

      // Mettre à jour la paire
      const updated = await prisma.exchange_pairs.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          payment_methods_exchange_pairs_from_method_idTopayment_methods: true,
          payment_methods_exchange_pairs_to_method_idTopayment_methods: true,
          exchange_fields: {
            orderBy: { field_order: 'asc' }
          }
        }
      });

      // Format the response
      const fromMethod = updated.payment_methods_exchange_pairs_from_method_idTopayment_methods;
      const toMethod = updated.payment_methods_exchange_pairs_to_method_idTopayment_methods;

      const formattedPair = {
        ...updated,
        from_method_name: fromMethod.name,
        from_method_code: fromMethod.code,
        from_method_icon: fromMethod.icon,
        to_method_name: toMethod.name,
        to_method_code: toMethod.code,
        to_method_icon: toMethod.icon,
        fields: updated.exchange_fields.map(f => ({
          ...f,
          options: f.options ? JSON.parse(f.options) : null
        })),
        payment_methods_exchange_pairs_from_method_idTopayment_methods: undefined,
        payment_methods_exchange_pairs_to_method_idTopayment_methods: undefined,
        exchange_fields: undefined
      };

      res.json({
        success: true,
        message: 'Paire d\'échange mise à jour avec succès',
        data: formattedPair
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la paire d\'échange:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

// DELETE - Supprimer une paire d'échange (ADMIN)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si la paire existe
    const existing = await prisma.exchange_pairs.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Paire d\'échange introuvable'
      });
    }

    // Vérifier s'il y a des transactions associées
    const transactionCount = existing._count.transactions;
    if (transactionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer cette paire d'échange. Elle est utilisée par ${transactionCount} transaction${transactionCount > 1 ? 's' : ''}.`,
        transactionCount: transactionCount
      });
    }

    // Supprimer d'abord les champs personnalisés (exchange_fields)
    await prisma.exchange_fields.deleteMany({
      where: { exchange_pair_id: parseInt(id) }
    });

    // Supprimer la paire
    await prisma.exchange_pairs.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Paire d\'échange supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la paire d\'échange:', error);

    // Gérer les erreurs de contrainte de clé étrangère
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer cette paire d\'échange car elle est utilisée par des transactions existantes.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression'
    });
  }
});

module.exports = router;
