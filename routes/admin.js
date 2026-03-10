const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const { adminMiddleware, checkPermission, checkAnyPermission } = require('../middleware/auth');
const { sendAdminCredentials, generateRandomPassword } = require('../utils/emailService');

const router = express.Router();

// Connexion admin
router.post('/login', [
  body('username').notEmpty().withMessage('Le nom d\'utilisateur est requis'),
  body('password').notEmpty().withMessage('Le mot de passe est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, password } = req.body;

    // Trouver l'admin
    const admin = await prisma.admins.findUnique({
      where: { username }
    });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Identifiants incorrects' 
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role || 'agent', isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Récupérer les permissions de l'admin
    const adminPermissions = await prisma.admin_permissions.findMany({
      where: { admin_id: admin.id },
      include: { permissions: { select: { code: true } } }
    });
    const permissionCodes = adminPermissions.map(ap => ap.permissions.code);

    res.json({
      success: true,
      message: 'Connexion admin réussie',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role || 'agent',
        permissions: permissionCodes
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la connexion' 
    });
  }
});

// Créer un admin (protégé - nécessite d'être admin)
router.post('/create', adminMiddleware, [
  body('username').trim().notEmpty().withMessage('Le nom d\'utilisateur est requis'),
  body('email').notEmpty().withMessage('L\'email est requis').isEmail().withMessage('Email invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, email, role = 'agent' } = req.body;

    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.admins.findUnique({
      where: { username }
    });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Ce nom d\'utilisateur existe déjà'
      });
    }

    // Vérifier si l'email existe déjà
    const existingEmail = await prisma.admins.findFirst({
      where: { email }
    });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Générer un mot de passe aléatoire sécurisé
    const generatedPassword = generateRandomPassword(12);

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Insérer l'admin
    const newAdmin = await prisma.admins.create({
      data: {
        username,
        password: hashedPassword,
        email,
        role
      }
    });

    // Auto-attribuer les permissions selon le rôle
    try {
      let permissionCodes;
      if (role === 'admin') {
        // Admin: toutes les permissions
        const allPerms = await prisma.permissions.findMany({ select: { id: true } });
        permissionCodes = allPerms.map(p => p.id);
      } else {
        // Agent: permissions de base
        const agentPerms = await prisma.permissions.findMany({
          where: { code: { in: ['VIEW_TRANSACTIONS', 'VALIDATE_TRANSACTIONS', 'VIEW_COMMISSIONS'] } },
          select: { id: true }
        });
        permissionCodes = agentPerms.map(p => p.id);
      }

      if (permissionCodes.length > 0) {
        await prisma.admin_permissions.createMany({
          data: permissionCodes.map(permId => ({
            admin_id: newAdmin.id,
            permission_id: permId
          }))
        });
        console.log(`✅ ${permissionCodes.length} permission(s) auto-attribuées au ${role}`);
      }
    } catch (permError) {
      console.error('⚠️ Erreur lors de l\'attribution des permissions:', permError);
    }

    // Envoyer l'email avec les identifiants
    try {
      await sendAdminCredentials(email, username, generatedPassword);
      console.log(`✅ Identifiants envoyés à ${email}`);
    } catch (emailError) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', emailError);
      // On continue même si l'email échoue, mais on prévient l'utilisateur
    }

    res.status(201).json({
      success: true,
      message: 'Administrateur créé avec succès. Les identifiants ont été envoyés par email.',
      admin: { id: newAdmin.id, username, email, role }
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création'
    });
  }
});

// Obtenir le profil de l'admin connecté
router.get('/profile', adminMiddleware, async (req, res) => {
  try {
    const admin = await prisma.admins.findUnique({
      where: { id: req.admin.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        created_at: true,
        commission_balance: true
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur non trouvé'
      });
    }

    res.json({
      success: true,
      admin
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Récupérer les permissions de l'admin connecté
router.get('/my-permissions', adminMiddleware, async (req, res) => {
  try {
    const adminPermissions = await prisma.admin_permissions.findMany({
      where: { admin_id: req.admin.id },
      include: { permissions: { select: { code: true } } }
    });
    const permissionCodes = adminPermissions.map(ap => ap.permissions.code);

    res.json({
      success: true,
      permissions: permissionCodes
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// === COMMISSION ENDPOINTS (avant /:id pour éviter le conflit de route) ===

// Obtenir le solde et résumé de commission de l'admin connecté
router.get('/commission/balance', adminMiddleware, async (req, res) => {
  try {
    const admin = await prisma.admins.findUnique({
      where: { id: req.admin.id },
      select: { commission_balance: true }
    });

    const balance = admin?.commission_balance || 0;

    // Résumé : total crédité, total retiré, nombre de transactions
    const [creditAgg, debitAgg, txCount] = await Promise.all([
      prisma.commission_ledger.aggregate({
        where: { admin_id: req.admin.id, type: 'credit' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.commission_ledger.aggregate({
        where: { admin_id: req.admin.id, type: 'debit' },
        _sum: { amount: true },
        _count: true
      }),
      prisma.commission_ledger.count({
        where: { admin_id: req.admin.id }
      })
    ]);

    res.json({
      success: true,
      balance,
      summary: {
        total_credited: creditAgg._sum.amount || 0,
        total_withdrawn: debitAgg._sum.amount || 0,
        credit_count: creditAgg._count,
        debit_count: debitAgg._count,
        total_entries: txCount
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du solde commission:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Historique du ledger de l'admin connecté
router.get('/commission/history', adminMiddleware, async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;

    const whereClause = { admin_id: req.admin.id };
    if (type && (type === 'credit' || type === 'debit')) {
      whereClause.type = type;
    }

    const [entries, total] = await Promise.all([
      prisma.commission_ledger.findMany({
        where: whereClause,
        include: {
          transactions: {
            select: { transaction_id: true, amount: true, total_amount: true }
          }
        },
        orderBy: { created_at: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.commission_ledger.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      entries,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique commission:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Retrait de commission (admin=immédiat, agent=demande en attente)
router.post('/commission/withdraw', adminMiddleware, async (req, res) => {
  try {
    const { amount, network, phone_number } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Montant invalide'
      });
    }

    if (!network || !['flooz', 'tmoney'].includes(network)) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez sélectionner un réseau (Flooz ou TMoney)'
      });
    }

    if (!phone_number || phone_number.trim().length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez entrer un numéro de retrait valide'
      });
    }

    const role = req.admin.role || 'agent';

    // Agent: créer une demande en attente
    if (role !== 'admin') {
      const admin = await prisma.admins.findUnique({
        where: { id: req.admin.id },
        select: { commission_balance: true }
      });
      const currentBalance = admin?.commission_balance || 0;
      if (amount > currentBalance) {
        return res.status(400).json({ success: false, message: 'Solde insuffisant' });
      }

      const request = await prisma.withdrawal_requests.create({
        data: {
          admin_id: req.admin.id,
          amount,
          network,
          phone_number: phone_number.trim(),
          status: 'pending'
        }
      });

      return res.json({
        success: true,
        pending: true,
        message: 'Demande de retrait envoyée, en attente d\'approbation',
        request
      });
    }

    // Admin: retrait immédiat
    const result = await prisma.$transaction(async (tx) => {
      const admin = await tx.admins.findUnique({
        where: { id: req.admin.id },
        select: { commission_balance: true }
      });

      const currentBalance = admin?.commission_balance || 0;

      if (amount > currentBalance) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      const newBalance = currentBalance - amount;

      await tx.admins.update({
        where: { id: req.admin.id },
        data: { commission_balance: newBalance }
      });

      const ledgerEntry = await tx.commission_ledger.create({
        data: {
          admin_id: req.admin.id,
          type: 'debit',
          amount,
          balance_after: newBalance,
          description: `Retrait de ${amount} FCFA via ${network.toUpperCase()} (${phone_number.trim()})`
        }
      });

      return { newBalance, ledgerEntry };
    });

    res.json({
      success: true,
      message: `Retrait de ${amount} FCFA effectué avec succès`,
      balance: result.newBalance,
      entry: result.ledgerEntry
    });
  } catch (error) {
    if (error.message === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({
        success: false,
        message: 'Solde insuffisant'
      });
    }
    console.error('Erreur lors du retrait de commission:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Mes demandes de retrait (agent voit ses propres demandes)
router.get('/commission/withdrawal-requests', adminMiddleware, async (req, res) => {
  try {
    const requests = await prisma.withdrawal_requests.findMany({
      where: { admin_id: req.admin.id },
      orderBy: { requested_at: 'desc' }
    });

    res.json({ success: true, requests });
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Toutes les demandes en attente (admin avec permission APPROVE_WITHDRAWALS)
router.get('/commission/all-withdrawal-requests', checkPermission('APPROVE_WITHDRAWALS'), async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const whereClause = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const requests = await prisma.withdrawal_requests.findMany({
      where: whereClause,
      include: {
        admins: { select: { id: true, username: true, email: true, commission_balance: true } }
      },
      orderBy: { requested_at: 'desc' }
    });

    res.json({ success: true, requests });
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Approuver une demande de retrait
router.patch('/commission/withdrawal-requests/:id/approve', checkPermission('APPROVE_WITHDRAWALS'), async (req, res) => {
  try {
    const { id } = req.params;

    const request = await prisma.withdrawal_requests.findUnique({
      where: { id: parseInt(id) }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cette demande a déjà été traitée' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const admin = await tx.admins.findUnique({
        where: { id: request.admin_id },
        select: { commission_balance: true }
      });

      const currentBalance = admin?.commission_balance || 0;
      if (request.amount > currentBalance) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      const newBalance = currentBalance - request.amount;

      await tx.admins.update({
        where: { id: request.admin_id },
        data: { commission_balance: newBalance }
      });

      const ledgerEntry = await tx.commission_ledger.create({
        data: {
          admin_id: request.admin_id,
          type: 'debit',
          amount: request.amount,
          balance_after: newBalance,
          description: `Retrait approuvé de ${request.amount} FCFA via ${request.network.toUpperCase()} (${request.phone_number})`
        }
      });

      const updated = await tx.withdrawal_requests.update({
        where: { id: parseInt(id) },
        data: {
          status: 'approved',
          processed_by: req.admin.id,
          processed_at: new Date()
        }
      });

      return { updated, newBalance, ledgerEntry };
    });

    res.json({
      success: true,
      message: `Retrait de ${request.amount} FCFA approuvé`,
      request: result.updated
    });
  } catch (error) {
    if (error.message === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({ success: false, message: 'Solde insuffisant pour cet agent' });
    }
    console.error('Erreur lors de l\'approbation:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Rejeter une demande de retrait
router.patch('/commission/withdrawal-requests/:id/reject', checkPermission('APPROVE_WITHDRAWALS'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await prisma.withdrawal_requests.findUnique({
      where: { id: parseInt(id) }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Demande introuvable' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cette demande a déjà été traitée' });
    }

    const updated = await prisma.withdrawal_requests.update({
      where: { id: parseInt(id) },
      data: {
        status: 'rejected',
        processed_by: req.admin.id,
        processed_at: new Date(),
        rejection_reason: reason || null
      }
    });

    res.json({
      success: true,
      message: 'Demande de retrait rejetée',
      request: updated
    });
  } catch (error) {
    console.error('Erreur lors du rejet:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Tous les soldes des admins (super-admin)
router.get('/commission/all', checkPermission('MANAGE_COMMISSIONS'), async (req, res) => {
  try {
    const admins = await prisma.admins.findMany({
      where: { is_active: true, role: { not: 'admin' } },
      select: {
        id: true,
        username: true,
        email: true,
        commission_balance: true
      },
      orderBy: { commission_balance: 'desc' }
    });

    res.json({
      success: true,
      admins: admins.map(a => ({
        ...a,
        commission_balance: a.commission_balance || 0
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des soldes commissions:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Historique d'un admin spécifique (super-admin)
router.get('/commission/history/:adminId', checkPermission('MANAGE_COMMISSIONS'), async (req, res) => {
  try {
    const { adminId } = req.params;
    const { type, limit = 50, offset = 0 } = req.query;

    const whereClause = { admin_id: parseInt(adminId) };
    if (type && (type === 'credit' || type === 'debit')) {
      whereClause.type = type;
    }

    const [entries, total] = await Promise.all([
      prisma.commission_ledger.findMany({
        where: whereClause,
        include: {
          transactions: {
            select: { transaction_id: true, amount: true, total_amount: true }
          }
        },
        orderBy: { created_at: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.commission_ledger.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      entries,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique commission admin:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Lister tous les administrateurs avec leurs permissions
router.get('/list', checkPermission('MANAGE_ADMINS'), async (req, res) => {
  try {
    const admins = await prisma.admins.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
        admin_permissions: {
          include: {
            permissions: {
              select: {
                id: true,
                code: true,
                name: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transformer les données pour correspondre au format attendu
    const adminsWithPermissions = admins.map(admin => ({
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role || 'agent',
      is_active: admin.is_active,
      created_at: admin.created_at,
      permissions: admin.admin_permissions.map(ap => ap.permissions),
      permission_count: admin.admin_permissions.length
    }));

    res.json({
      success: true,
      admins: adminsWithPermissions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des admins:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Récupérer un admin spécifique avec ses permissions
router.get('/:id', checkPermission('MANAGE_ADMINS'), async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await prisma.admins.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        username: true,
        email: true,
        is_active: true,
        created_at: true,
        admin_permissions: {
          include: {
            permissions: {
              select: {
                id: true,
                code: true,
                name: true,
                category: true,
                description: true
              }
            }
          },
          orderBy: [
            { permissions: { category: 'asc' } },
            { permissions: { name: 'asc' } }
          ]
        }
      }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur introuvable'
      });
    }

    res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        is_active: admin.is_active,
        created_at: admin.created_at,
        permissions: admin.admin_permissions.map(ap => ap.permissions)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Activer/désactiver un admin
router.patch('/:id/toggle-status', checkPermission('MANAGE_ADMINS'), async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'admin existe
    const admin = await prisma.admins.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, username: true, is_active: true }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur introuvable'
      });
    }

    // Ne pas permettre de se désactiver soi-même
    if (parseInt(id) === req.admin.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas désactiver votre propre compte'
      });
    }

    const newStatus = admin.is_active ? false : true;

    const updatedAdmin = await prisma.admins.update({
      where: { id: parseInt(id) },
      data: { is_active: newStatus }
    });

    res.json({
      success: true,
      message: `Compte ${newStatus ? 'activé' : 'désactivé'} avec succès`,
      admin: {
        id: updatedAdmin.id,
        username: updatedAdmin.username,
        is_active: updatedAdmin.is_active
      }
    });
  } catch (error) {
    console.error('Erreur lors de la modification du statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Mettre à jour les informations d'un admin
router.put('/:id', checkPermission('MANAGE_ADMINS'), [
  body('email').optional().isEmail().withMessage('Email invalide'),
  body('password').optional().isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { email, password } = req.body;

    // Vérifier que l'admin existe
    const admin = await prisma.admins.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, username: true }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur introuvable'
      });
    }

    const updateData = {};

    if (email !== undefined) {
      updateData.email = email;
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune modification fournie'
      });
    }

    await prisma.admins.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Admin mis à jour avec succès',
      admin: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Supprimer un admin
router.delete('/:id', checkPermission('MANAGE_ADMINS'), async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'admin existe
    const admin = await prisma.admins.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, username: true }
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur introuvable'
      });
    }

    // Ne pas permettre de se supprimer soi-même
    if (parseInt(id) === req.admin.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    // Supprimer l'admin (les permissions seront supprimées en cascade)
    await prisma.admins.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: `Admin ${admin.username} supprimé avec succès`
    });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;
