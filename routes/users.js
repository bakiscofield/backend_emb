const express = require('express');
const router = express.Router();

const prisma = require('../config/prisma');
const { adminMiddleware, authMiddleware, checkPermission } = require('../middleware/auth');

// Récupérer tous les utilisateurs avec statistiques
router.get('/', adminMiddleware, checkPermission('view_users'), async (req, res) => {
  try {
    const { search, newsletter_subscribed, limit = 50, offset = 0 } = req.query;

    // Build the where clause
    const whereClause = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } }
      ];
    }

    if (newsletter_subscribed !== undefined) {
      whereClause.newsletter_subscribed = newsletter_subscribed === 'true';
    }

    // Fetch users with their transactions
    const users = await prisma.users.findMany({
      where: whereClause,
      include: {
        transactions: {
          select: {
            id: true,
            total_amount: true,
            status: true,
            created_at: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    // Calculate transaction statistics for each user
    const usersWithStats = users.map(user => {
      const validatedTransactions = user.transactions.filter(t => t.status === 'validated');
      const totalAmountSpent = validatedTransactions.reduce((sum, t) => sum + t.total_amount, 0);
      const lastTransaction = user.transactions.length > 0
        ? user.transactions.reduce((latest, t) =>
            new Date(t.created_at) > new Date(latest.created_at) ? t : latest
          )
        : null;

      // Remove transactions from output and add computed fields
      const { transactions, ...userData } = user;
      return {
        ...userData,
        transaction_count: transactions.length,
        total_amount_spent: totalAmountSpent,
        last_transaction_date: lastTransaction ? lastTransaction.created_at : null
      };
    });

    // Statistiques globales
    const totalUsers = await prisma.users.count();
    const subscribedUsers = await prisma.users.count({
      where: { newsletter_subscribed: true }
    });
    const activeUsers = await prisma.users.count({
      where: { is_active: 1 }
    });
    const inactiveUsers = await prisma.users.count({
      where: { is_active: 0 }
    });

    const stats = {
      total_users: totalUsers,
      subscribed_users: subscribedUsers,
      active_users: activeUsers,
      inactive_users: inactiveUsers
    };

    res.json({
      users: usersWithStats,
      stats,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer les détails d'un utilisateur
router.get('/:id', adminMiddleware, checkPermission('view_users'), async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer l'historique des transactions d'un utilisateur
router.get('/:id/transactions', adminMiddleware, checkPermission('view_users'), async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const transactions = await prisma.transactions.findMany({
      where: { user_id: parseInt(req.params.id) },
      include: {
        exchange_pairs: {
          include: {
            payment_methods_exchange_pairs_from_method_idTopayment_methods: {
              select: { name: true }
            },
            payment_methods_exchange_pairs_to_method_idTopayment_methods: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    // Format transactions with exchange_type
    const formattedTransactions = transactions.map(t => {
      let exchange_type = 'Tmoney ↔ Flooz';
      if (t.exchange_pairs) {
        const fromMethod = t.exchange_pairs.payment_methods_exchange_pairs_from_method_idTopayment_methods.name;
        const toMethod = t.exchange_pairs.payment_methods_exchange_pairs_to_method_idTopayment_methods.name;
        exchange_type = `${fromMethod} → ${toMethod}`;
      }

      const { exchange_pairs, ...transactionData } = t;
      return {
        ...transactionData,
        exchange_type
      };
    });

    const totalCount = await prisma.transactions.count({
      where: { user_id: parseInt(req.params.id) }
    });

    res.json({
      transactions: formattedTransactions,
      total: totalCount,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Erreur récupération transactions:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Activer/Désactiver un utilisateur
router.put('/:id/toggle-active', adminMiddleware, checkPermission('manage_users'), async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const newStatus = user.is_active ? 0 : 1;

    await prisma.users.update({
      where: { id: parseInt(req.params.id) },
      data: { is_active: newStatus }
    });

    res.json({
      message: `Utilisateur ${newStatus ? 'activé' : 'désactivé'} avec succès`,
      is_active: newStatus
    });
  } catch (error) {
    console.error('Erreur toggle active:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour l'abonnement newsletter
router.put('/:id/newsletter', adminMiddleware, checkPermission('manage_users'), async (req, res) => {
  try {
    const { subscribed } = req.body;

    await prisma.users.update({
      where: { id: parseInt(req.params.id) },
      data: { newsletter_subscribed: subscribed }
    });

    res.json({
      message: 'Abonnement newsletter mis à jour',
      newsletter_subscribed: subscribed
    });
  } catch (error) {
    console.error('Erreur mise à jour newsletter:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Statistiques utilisateurs
router.get('/stats/overview', adminMiddleware, checkPermission('view_users'), async (req, res) => {
  try {
    // Statistiques générales
    const totalUsers = await prisma.users.count();
    const subscribedUsers = await prisma.users.count({
      where: { newsletter_subscribed: true }
    });
    const activeUsers = await prisma.users.count({
      where: { is_active: 1 }
    });
    const inactiveUsers = await prisma.users.count({
      where: { is_active: 0 }
    });

    // Calculate 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsers30d = await prisma.users.count({
      where: {
        created_at: {
          gte: thirtyDaysAgo
        }
      }
    });

    const generalStats = {
      total_users: totalUsers,
      subscribed_users: subscribedUsers,
      active_users: activeUsers,
      inactive_users: inactiveUsers,
      new_users_30d: newUsers30d
    };

    // Utilisateurs avec transactions
    const usersWithTransactions = await prisma.transactions.findMany({
      select: { user_id: true },
      distinct: ['user_id']
    });

    const totalTransactions = await prisma.transactions.count();

    const validatedTransactions = await prisma.transactions.findMany({
      where: { status: 'validated' },
      select: { total_amount: true }
    });

    const totalRevenue = validatedTransactions.reduce((sum, t) => sum + t.total_amount, 0);

    const transactionStats = {
      users_with_transactions: usersWithTransactions.length,
      total_transactions: totalTransactions,
      total_revenue: totalRevenue
    };

    // Top 10 utilisateurs
    const usersWithTransactionData = await prisma.users.findMany({
      include: {
        transactions: {
          select: {
            id: true,
            status: true,
            total_amount: true
          }
        }
      }
    });

    const topUsers = usersWithTransactionData
      .map(user => {
        const validatedTransactions = user.transactions.filter(t => t.status === 'validated');
        const totalSpent = validatedTransactions.reduce((sum, t) => sum + t.total_amount, 0);

        return {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          transaction_count: user.transactions.length,
          total_spent: totalSpent
        };
      })
      .filter(user => user.transaction_count > 0)
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 10);

    res.json({
      general: generalStats,
      transactions: transactionStats,
      topUsers
    });
  } catch (error) {
    console.error('Erreur stats utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mettre à jour le profil utilisateur (route utilisateur)
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { id, isAdmin } = req.user;

    // Les admins ne peuvent pas utiliser cette route
    if (isAdmin) {
      return res.status(403).json({ message: 'Cette route est réservée aux utilisateurs' });
    }

    const { name, email } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Le nom est requis' });
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (email) {
      const existingUser = await prisma.users.findFirst({
        where: {
          email,
          id: { not: id }
        }
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
    }

    // Mettre à jour le profil
    const updatedUser = await prisma.users.update({
      where: { id },
      data: {
        name: name.trim(),
        email: email ? email.trim() : null
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        kyc_verified: true,
        kyc_status: true,
        created_at: true
      }
    });

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
