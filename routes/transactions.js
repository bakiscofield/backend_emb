const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/prisma');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { createNotification } = require('./notifications');
const { sendTransactionCreated, sendTransactionValidated, sendTransactionRejected } = require('../utils/emailService');

const router = express.Router();

// Créer une nouvelle transaction (par un client)
router.post('/create', authMiddleware, [
  body('amount').isFloat({ min: 1 }).withMessage('Montant invalide'),
  body('payment_reference').trim().notEmpty().withMessage('Référence de paiement requise'),
  body('exchange_pair_id').optional().isInt().withMessage('ID de paire d\'échange invalide'),
  body('from_number').optional().trim(),
  body('to_number').optional().trim(),
  body('tmoney_number').optional().isMobilePhone('any').withMessage('Numéro Tmoney invalide'),
  body('flooz_number').optional().isMobilePhone('any').withMessage('Numéro Flooz invalide'),
  body('dynamic_fields').optional().isObject().withMessage('Champs dynamiques invalides')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      amount,
      payment_reference,
      bookmaker_id,
      notes,
      exchange_pair_id,
      from_number,
      to_number,
      tmoney_number,
      flooz_number,
      dynamic_fields
    } = req.body;

    let percentage = 0;
    let taxAmount = 0;

    // Déterminer les numéros source et destination
    let sourceNumber, destNumber;

    // Si exchange_pair_id est fourni, utiliser le nouveau système
    if (exchange_pair_id) {
      const pair = await prisma.exchange_pairs.findFirst({
        where: {
          id: exchange_pair_id,
          is_active: true
        }
      });

      if (!pair) {
        return res.status(404).json({
          success: false,
          message: 'Paire d\'échange introuvable ou inactive'
        });
      }

      if (!from_number || !to_number) {
        return res.status(400).json({
          success: false,
          message: 'Numéros source et destination requis'
        });
      }

      sourceNumber = from_number;
      destNumber = to_number;
      percentage = parseFloat(pair.fee_percentage);
      taxAmount = parseFloat(pair.tax_amount);
    } else {
      // Ancien système : utiliser la commission globale
      if (!tmoney_number || !flooz_number) {
        return res.status(400).json({
          success: false,
          message: 'Numéros Tmoney et Flooz requis pour ce type de transaction'
        });
      }

      sourceNumber = tmoney_number;
      destNumber = flooz_number;
      const config = await prisma.config.findUnique({
        where: { key: 'commission_percentage' }
      });
      percentage = parseFloat(config.value);
    }

    // Calculer le montant total avec commission et taxe
    const commissionAmount = (amount * percentage) / 100;
    const totalAmount = amount + commissionAmount + taxAmount;

    // Vérifier les limites
    const minAmount = await prisma.config.findUnique({
      where: { key: 'min_amount' }
    });
    const maxAmount = await prisma.config.findUnique({
      where: { key: 'max_amount' }
    });

    if (amount < parseFloat(minAmount.value)) {
      return res.status(400).json({
        success: false,
        message: `Le montant minimum est de ${minAmount.value} FCFA`
      });
    }

    if (amount > parseFloat(maxAmount.value)) {
      return res.status(400).json({
        success: false,
        message: `Le montant maximum est de ${maxAmount.value} FCFA`
      });
    }

    // Générer un ID unique pour la transaction
    const transactionId = `EMB-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Insérer la transaction
    const result = await prisma.transactions.create({
      data: {
        transaction_id: transactionId,
        user_id: req.user.id,
        tmoney_number: sourceNumber,
        flooz_number: destNumber,
        from_number: sourceNumber,
        to_number: destNumber,
        amount,
        percentage,
        total_amount: totalAmount,
        payment_reference,
        bookmaker_id: bookmaker_id || null,
        notes: notes || null,
        exchange_pair_id: exchange_pair_id || null,
        dynamic_fields: dynamic_fields ? JSON.stringify(dynamic_fields) : null,
        tax_amount: taxAmount,
        status: 'pending'
      }
    });

    // Ajouter à l'historique
    await prisma.transaction_history.create({
      data: {
        transaction_id: result.id,
        status: 'pending',
        comment: 'Transaction créée'
      }
    });

    // Créer une notification pour l'admin
    await createNotification({
      admin_id: null, // null = pour tous les admins
      type: 'new_transaction',
      title: 'Nouvelle demande d\'échange',
      message: `${req.user.name || 'Un client'} a créé une demande d'échange de ${amount} FCFA`,
      transaction_id: result.id
    });

    // Envoyer un email de confirmation à l'utilisateur si l'email est disponible
    if (req.user.email) {
      try {
        await sendTransactionCreated(req.user.email, {
          transaction_id: transactionId,
          userName: req.user.name || 'Client',
          amount,
          commission: commissionAmount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          from_number: sourceNumber,
          to_number: destNumber
        });
      } catch (emailError) {
        // Ne pas faire échouer la transaction si l'email échoue
        console.error('Erreur lors de l\'envoi de l\'email de confirmation:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Transaction créée avec succès',
      transaction: {
        id: result.id,
        transaction_id: transactionId,
        amount,
        percentage,
        commission: commissionAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création de la transaction:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la création de la transaction' 
    });
  }
});

// Obtenir toutes les transactions d'un utilisateur
router.get('/my-transactions', authMiddleware, async (req, res) => {
  try {
    const transactions = await prisma.transactions.findMany({
      where: {
        user_id: req.user.id
      },
      include: {
        bookmakers: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Format response to match the old structure
    const formattedTransactions = transactions.map(t => ({
      ...t,
      bookmaker_name: t.bookmakers?.name || null
    }));

    res.json({
      success: true,
      transactions: formattedTransactions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Obtenir les détails d'une transaction
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const transaction = await prisma.transactions.findUnique({
      where: {
        id: parseInt(req.params.id)
      },
      include: {
        bookmakers: {
          select: {
            name: true
          }
        },
        users: {
          select: {
            name: true,
            phone: true
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée'
      });
    }

    // Vérifier que l'utilisateur est propriétaire de la transaction
    if (transaction.user_id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Récupérer l'historique
    const history = await prisma.transaction_history.findMany({
      where: {
        transaction_id: transaction.id
      },
      include: {
        admins: {
          select: {
            username: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Format response to match the old structure
    const formattedTransaction = {
      ...transaction,
      bookmaker_name: transaction.bookmakers?.name || null,
      user_name: transaction.users?.name || null,
      user_phone: transaction.users?.phone || null
    };

    const formattedHistory = history.map(h => ({
      ...h,
      changed_by_username: h.admins?.username || null
    }));

    res.json({
      success: true,
      transaction: formattedTransaction,
      history: formattedHistory
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Obtenir toutes les transactions (admin uniquement)
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const whereClause = status ? { status } : {};

    const transactions = await prisma.transactions.findMany({
      where: whereClause,
      include: {
        bookmakers: {
          select: {
            name: true
          }
        },
        users: {
          select: {
            name: true,
            phone: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    // Compter le total
    const countResult = await prisma.transactions.count({
      where: whereClause
    });

    // Format response to match the old structure
    const formattedTransactions = transactions.map(t => ({
      ...t,
      bookmaker_name: t.bookmakers?.name || null,
      user_name: t.users?.name || null,
      user_phone: t.users?.phone || null
    }));

    res.json({
      success: true,
      transactions: formattedTransactions,
      total: countResult,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Valider une transaction (admin uniquement)
router.put('/:id/validate', adminMiddleware, [
  body('status').isIn(['validated', 'rejected']).withMessage('Statut invalide'),
  body('comment').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { status, comment } = req.body;

    // Vérifier que la transaction existe
    const transaction = await prisma.transactions.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée'
      });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cette transaction a déjà été traitée'
      });
    }

    // Mettre à jour la transaction
    await prisma.transactions.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status,
        validated_by: req.admin.id,
        validated_at: new Date()
      }
    });

    // Ajouter à l'historique
    await prisma.transaction_history.create({
      data: {
        transaction_id: parseInt(req.params.id),
        status,
        comment: comment || null,
        changed_by: req.admin.id
      }
    });

    // Créer une notification pour le client
    const notificationTitle = status === 'validated' ? 'Échange validé' : 'Échange rejeté';
    const notificationMessage = status === 'validated'
      ? `Votre demande d'échange de ${transaction.amount} FCFA a été validée avec succès!`
      : `Votre demande d'échange de ${transaction.amount} FCFA a été rejetée. ${comment ? 'Raison: ' + comment : ''}`;

    await createNotification({
      user_id: transaction.user_id,
      type: status === 'validated' ? 'transaction_validated' : 'transaction_rejected',
      title: notificationTitle,
      message: notificationMessage,
      transaction_id: req.params.id
    });

    // Récupérer les informations de l'utilisateur pour l'email
    const user = await prisma.users.findUnique({
      where: { id: transaction.user_id },
      select: { email: true, name: true }
    });

    // Envoyer un email de notification à l'utilisateur si l'email est disponible
    if (user && user.email) {
      try {
        const emailData = {
          transaction_id: transaction.transaction_id,
          userName: user.name || 'Client',
          amount: transaction.amount,
          commission: transaction.total_amount - transaction.amount,
          from_number: transaction.from_number || transaction.tmoney_number,
          to_number: transaction.to_number || transaction.flooz_number,
          comment: comment || null
        };

        if (status === 'validated') {
          await sendTransactionValidated(user.email, emailData);
        } else {
          await sendTransactionRejected(user.email, emailData);
        }
      } catch (emailError) {
        // Ne pas faire échouer la validation si l'email échoue
        console.error('Erreur lors de l\'envoi de l\'email de notification:', emailError);
      }
    }

    res.json({
      success: true,
      message: `Transaction ${status === 'validated' ? 'validée' : 'rejetée'} avec succès`
    });
  } catch (error) {
    console.error('Erreur lors de la validation de la transaction:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Obtenir les statistiques (admin uniquement)
router.get('/stats/overview', adminMiddleware, async (req, res) => {
  try {
    // Compter les transactions par statut
    const [
      totalTransactions,
      pendingTransactions,
      validatedTransactions,
      rejectedTransactions
    ] = await Promise.all([
      prisma.transactions.count(),
      prisma.transactions.count({ where: { status: 'pending' } }),
      prisma.transactions.count({ where: { status: 'validated' } }),
      prisma.transactions.count({ where: { status: 'rejected' } })
    ]);

    // Calculer les montants pour les transactions validées
    const validatedStats = await prisma.transactions.aggregate({
      where: { status: 'validated' },
      _sum: {
        total_amount: true,
        amount: true
      }
    });

    const totalAmountValidated = validatedStats._sum.total_amount || 0;
    const totalAmount = validatedStats._sum.amount || 0;
    const totalCommission = totalAmountValidated - totalAmount;

    // Compter les utilisateurs
    const usersCount = await prisma.users.count();

    res.json({
      success: true,
      stats: {
        total_transactions: totalTransactions,
        pending_transactions: pendingTransactions,
        validated_transactions: validatedTransactions,
        rejected_transactions: rejectedTransactions,
        total_amount_validated: totalAmountValidated,
        total_commission: totalCommission,
        total_users: usersCount
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;
