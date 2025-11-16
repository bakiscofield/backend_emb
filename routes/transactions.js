const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Créer une nouvelle transaction (par un client)
router.post('/create', authMiddleware, [
  body('tmoney_number').isMobilePhone('any').withMessage('Numéro Tmoney invalide'),
  body('flooz_number').isMobilePhone('any').withMessage('Numéro Flooz invalide'),
  body('amount').isFloat({ min: 1 }).withMessage('Montant invalide'),
  body('payment_reference').trim().notEmpty().withMessage('Référence de paiement requise')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { tmoney_number, flooz_number, amount, payment_reference, bookmaker_id, notes } = req.body;

    // Récupérer le pourcentage de commission
    const config = await db.get('SELECT value FROM config WHERE key = ?', ['commission_percentage']);
    const percentage = parseFloat(config.value);

    // Calculer le montant total avec commission
    const commissionAmount = (amount * percentage) / 100;
    const totalAmount = amount + commissionAmount;

    // Vérifier les limites
    const minAmount = await db.get('SELECT value FROM config WHERE key = ?', ['min_amount']);
    const maxAmount = await db.get('SELECT value FROM config WHERE key = ?', ['max_amount']);

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
    const result = await db.run(
      `INSERT INTO transactions 
       (transaction_id, user_id, tmoney_number, flooz_number, amount, percentage, total_amount, 
        payment_reference, bookmaker_id, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        transactionId,
        req.user.id,
        tmoney_number,
        flooz_number,
        amount,
        percentage,
        totalAmount,
        payment_reference,
        bookmaker_id || null,
        notes || null
      ]
    );

    // Ajouter à l'historique
    await db.run(
      'INSERT INTO transaction_history (transaction_id, status, comment) VALUES (?, ?, ?)',
      [result.id, 'pending', 'Transaction créée']
    );

    res.status(201).json({
      success: true,
      message: 'Transaction créée avec succès',
      transaction: {
        id: result.id,
        transaction_id: transactionId,
        amount,
        percentage,
        commission: commissionAmount,
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
    const transactions = await db.all(
      `SELECT t.*, b.name as bookmaker_name 
       FROM transactions t
       LEFT JOIN bookmakers b ON t.bookmaker_id = b.id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      transactions
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
    const transaction = await db.get(
      `SELECT t.*, b.name as bookmaker_name, u.name as user_name, u.phone as user_phone
       FROM transactions t
       LEFT JOIN bookmakers b ON t.bookmaker_id = b.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [req.params.id]
    );

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
    const history = await db.all(
      `SELECT h.*, a.username as changed_by_username
       FROM transaction_history h
       LEFT JOIN admins a ON h.changed_by = a.id
       WHERE h.transaction_id = ?
       ORDER BY h.created_at DESC`,
      [transaction.id]
    );

    res.json({
      success: true,
      transaction,
      history
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

    let query = `
      SELECT t.*, b.name as bookmaker_name, u.name as user_name, u.phone as user_phone
      FROM transactions t
      LEFT JOIN bookmakers b ON t.bookmaker_id = b.id
      LEFT JOIN users u ON t.user_id = u.id
    `;

    const params = [];

    if (status) {
      query += ' WHERE t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const transactions = await db.all(query, params);

    // Compter le total
    let countQuery = 'SELECT COUNT(*) as total FROM transactions';
    if (status) {
      countQuery += ' WHERE status = ?';
    }
    const countResult = await db.get(countQuery, status ? [status] : []);

    res.json({
      success: true,
      transactions,
      total: countResult.total,
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
    const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
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
    await db.run(
      'UPDATE transactions SET status = ?, validated_by = ?, validated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, req.admin.id, req.params.id]
    );

    // Ajouter à l'historique
    await db.run(
      'INSERT INTO transaction_history (transaction_id, status, comment, changed_by) VALUES (?, ?, ?, ?)',
      [req.params.id, status, comment || null, req.admin.id]
    );

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
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_transactions,
        SUM(CASE WHEN status = 'validated' THEN 1 ELSE 0 END) as validated_transactions,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_transactions,
        SUM(CASE WHEN status = 'validated' THEN total_amount ELSE 0 END) as total_amount_validated,
        SUM(CASE WHEN status = 'validated' THEN (total_amount - amount) ELSE 0 END) as total_commission
      FROM transactions
    `);

    const usersCount = await db.get('SELECT COUNT(*) as total FROM users');

    res.json({
      success: true,
      stats: {
        ...stats,
        total_users: usersCount.total
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
