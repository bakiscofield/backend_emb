const express = require('express');
const router = express.Router();

const prisma = require('../config/prisma');
const { authMiddleware } = require('../middleware/auth');

// GET - Récupérer les notifications de l'utilisateur connecté
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { isAdmin, id } = req.user;

    let notifications;

    if (isAdmin) {
      // Récupérer les notifications pour l'admin avec les infos utilisateur
      notifications = await prisma.notifications.findMany({
        where: {
          OR: [
            { admin_id: id },
            { admin_id: null }
          ]
        },
        include: {
          users: {
            select: {
              name: true,
              phone: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        take: 50
      });

      // Format with user_name and user_phone
      notifications = notifications.map(n => ({
        ...n,
        user_name: n.users?.name || null,
        user_phone: n.users?.phone || null,
        users: undefined
      }));
    } else {
      // Récupérer les notifications pour le client
      notifications = await prisma.notifications.findMany({
        where: { user_id: id },
        orderBy: { created_at: 'desc' },
        take: 50
      });
    }

    // Compter les notifications non lues
    const unreadCount = await prisma.notifications.count({
      where: isAdmin
        ? {
            OR: [
              { admin_id: id },
              { admin_id: null }
            ],
            is_read: false
          }
        : {
            user_id: id,
            is_read: false
          }
    });

    res.json({
      success: true,
      data: {
        notifications,
        unread_count: unreadCount
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET - Récupérer uniquement les notifications non lues
router.get('/unread', authMiddleware, async (req, res) => {
  try {
    const { isAdmin, id } = req.user;

    const notifications = await prisma.notifications.findMany({
      where: isAdmin
        ? {
            OR: [
              { admin_id: id },
              { admin_id: null }
            ],
            is_read: false
          }
        : {
            user_id: id,
            is_read: false
          },
      orderBy: { created_at: 'desc' },
      take: 10 // Limiter à 10 notifications non lues
    });

    res.json(notifications);
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications non lues:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET - Récupérer le nombre de notifications non lues
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const { isAdmin, id } = req.user;

    const count = await prisma.notifications.count({
      where: isAdmin
        ? {
            OR: [
              { admin_id: id },
              { admin_id: null }
            ],
            is_read: false
          }
        : {
            user_id: id,
            is_read: false
          }
    });

    res.json({
      success: true,
      data: {
        count
      }
    });
  } catch (error) {
    console.error('Erreur lors du comptage des notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Fonction réutilisable pour marquer comme lu
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAdmin, id: userId } = req.user;

    // Vérifier que la notification appartient bien à l'utilisateur
    const notification = await prisma.notifications.findUnique({
      where: { id: parseInt(id) }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification introuvable'
      });
    }

    // Vérifier les permissions
    if (isAdmin && notification.admin_id !== userId && notification.admin_id !== null) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    if (!isAdmin && notification.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    await prisma.notifications.update({
      where: { id: parseInt(id) },
      data: { is_read: true }
    });

    res.json({
      success: true,
      message: 'Notification marquée comme lue'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

// PATCH/POST - Marquer une notification comme lue
router.patch('/:id/read', authMiddleware, markNotificationAsRead);
router.post('/:id/read', authMiddleware, markNotificationAsRead);

// PATCH - Marquer toutes les notifications comme lues
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    const { isAdmin, id } = req.user;

    await prisma.notifications.updateMany({
      where: isAdmin
        ? {
            OR: [
              { admin_id: id },
              { admin_id: null }
            ],
            is_read: false
          }
        : {
            user_id: id,
            is_read: false
          },
      data: { is_read: true }
    });

    res.json({
      success: true,
      message: 'Toutes les notifications ont été marquées comme lues'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// DELETE - Supprimer une notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { isAdmin, id: userId } = req.user;

    // Vérifier que la notification appartient bien à l'utilisateur
    const notification = await prisma.notifications.findUnique({
      where: { id: parseInt(id) }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification introuvable'
      });
    }

    // Vérifier les permissions
    if (isAdmin && notification.admin_id !== userId && notification.admin_id !== null) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    if (!isAdmin && notification.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    await prisma.notifications.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Notification supprimée'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la notification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Fonction utilitaire pour créer une notification (à utiliser dans d'autres routes)
async function createNotification({ user_id, admin_id, type, title, message, transaction_id }) {
  try {
    // Créer la notification dans la base de données
    const notification = await prisma.notifications.create({
      data: {
        user_id: user_id || null,
        admin_id: admin_id || null,
        type,
        title,
        message,
        transaction_id: transaction_id ? parseInt(transaction_id) : null,
        is_read: false
      }
    });

    // Envoyer une notification push
    const { sendPushNotification } = require('./push');
    const url = transaction_id ? `/transactions/${transaction_id}` : '/dashboard';

    await sendPushNotification({
      userId: user_id,
      adminId: admin_id,
      title,
      body: message,
      url,
      notificationId: notification.id
    });
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
  }
}

module.exports = router;
module.exports.createNotification = createNotification;
